import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPlanBySlug } from "@/lib/subscription-plans";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.employerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile?.companyId) {
      return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
    }

    const companyId = profile.companyId;

    // ─── Subscription check ───
    const subscription = await prisma.companySubscription.findFirst({
      where: {
        companyId,
        status: { in: ["ACTIVE", "TRIAL", "CANCELLED"] },
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    let planSlug = "free";
    let maxCvSearches = 0;

    if (subscription) {
      planSlug = subscription.plan.slug;
      maxCvSearches = subscription.plan.maxCvSearches;
    }

    // Free plan: block access entirely
    if (maxCvSearches === 0) {
      return NextResponse.json(
        {
          error: "CV Search requires a paid plan",
          planLimits: { maxCvSearches: 0, planSlug },
          users: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        },
        { status: 403 }
      );
    }

    // For paid plans, return limit info (soft enforcement, hard enforcement via admin)
    const planConfig = getPlanBySlug(planSlug);

    // ─── Query params ───
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const county = searchParams.get("county")?.trim() || "";
    const hasCv = searchParams.get("hasCv") === "true";
    const experienceLevel = searchParams.get("experienceLevel")?.trim() || "";
    const sort = searchParams.get("sort") || "recent";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const skip = (page - 1) * limit;

    // ─── Build where clause ───
    const where: Record<string, unknown> = {
      role: "SEEKER",
      isActive: true,
    };

    // Only show seekers who have at least one submitted application, unless there's a search query
    if (!q && !experienceLevel) {
      where.applications = {
        some: {
          status: { not: "DRAFT" },
        },
      };
    }

    // Search query — search across name, bio, email
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    // County filter
    if (county) {
      where.county = county;
    }

    // Has CV filter
    if (hasCv) {
      where.cvUrl = { not: null };
    }

    // Experience level: derive from applications to listings with matching experienceLevel
    if (experienceLevel) {
      const levelMap: Record<string, string> = {
        ENTRY_LEVEL: "Entry-level",
        JUNIOR: "Junior",
        MID_LEVEL: "Mid-level",
        SENIOR: "Senior",
        MANAGER: "Manager",
        DIRECTOR: "Director",
        EXECUTIVE: "Executive",
      };
      const listingExpLevel = levelMap[experienceLevel] || experienceLevel;
      where.applications = {
        some: {
          listing: { experienceLevel: listingExpLevel },
          status: { not: "DRAFT" },
        },
      };
    }

    // ─── Order ───
    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "name") {
      orderBy = { name: "asc" };
    }

    // ─── Fetch ───
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          county: true,
          bio: true,
          cvUrl: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: {
              applications: {
                where: { status: { not: "DRAFT" } },
              },
            },
          },
          applications: {
            where: { listing: { companyId } },
            select: { id: true },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Check if each user has applied to this company's listings
    const enrichedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      county: user.county,
      bio: user.bio,
      cvUrl: user.cvUrl,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      applicationCount: user._count.applications,
      hasAppliedToCompany: user.applications.length > 0,
    }));

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      planLimits: {
        maxCvSearches,
        planSlug,
        planName: planConfig?.name || planSlug,
      },
    });
  } catch (error) {
    console.error("Error in CV search:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
