import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { companyId: profile.companyId };
    if (status) {
      where.status = status;
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
          subcategory: true,
          tags: { include: { tag: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return NextResponse.json({
      data: listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      title,
      description,
      categoryId,
      subcategoryId,
      town,
      county,
      employmentType,
      experienceLevel,
      workMode,
      salaryMin,
      salaryMax,
      salaryPeriod,
      deadline,
      featured,
      status,
      tagIds,
    } = body;

    if (!title || !description || !categoryId) {
      return NextResponse.json(
        { error: "Title, description, and categoryId are required" },
        { status: 400 }
      );
    }

    const randomHex = crypto.randomBytes(3).toString("hex");
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + randomHex;

    const listing = await prisma.listing.create({
      data: {
        companyId: profile.companyId,
        title,
        slug,
        description,
        categoryId,
        subcategoryId,
        town: town || "",
        county: county || "",
        employmentType: employmentType || "Full-time",
        experienceLevel: experienceLevel || "Mid-level",
        workMode: workMode || "ONSITE",
        salaryMin: salaryMin ? Number(salaryMin) : null,
        salaryMax: salaryMax ? Number(salaryMax) : null,
        salaryPeriod,
        deadline: deadline ? new Date(deadline) : null,
        featured: featured || false,
        status: status || "DRAFT",
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId: string) => ({ tagId })),
            }
          : undefined,
      },
      include: {
        category: true,
        subcategory: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("Error creating listing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
