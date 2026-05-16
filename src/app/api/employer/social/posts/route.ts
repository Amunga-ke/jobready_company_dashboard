import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const skip = (page - 1) * limit;

    // Build the where clause - posts from accounts belonging to this company
    const accountIds = await prisma.socialAccount.findMany({
      where: { companyId: profile.companyId },
      select: { id: true },
    });

    const accountIdList = accountIds.map((a) => a.id);

    const where: Record<string, unknown> = {
      accountId: { in: accountIdList },
    };

    if (platform) {
      where.platform = platform;
    }
    if (status) {
      where.status = status;
    }

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          listing: {
            select: { id: true, title: true },
          },
          account: {
            select: { id: true, platform: true, platformUsername: true },
          },
        },
      }),
      prisma.socialPost.count({ where }),
    ]);

    return NextResponse.json({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching social posts:", error);
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
    const { accountId, listingId, caption } = body;

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    if (!caption || typeof caption !== "string" || caption.trim().length === 0) {
      return NextResponse.json({ error: "caption is required and must be non-empty" }, { status: 400 });
    }

    // Verify the account belongs to this company
    const account = await prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        companyId: profile.companyId,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Social account not found" }, { status: 404 });
    }

    if (!account.isActive) {
      return NextResponse.json({ error: "This social account is not active" }, { status: 400 });
    }

    // Verify the listing belongs to this company if listingId is provided
    if (listingId) {
      const listing = await prisma.listing.findFirst({
        where: {
          id: listingId,
          companyId: profile.companyId,
        },
      });
      if (!listing) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
    }

    const post = await prisma.socialPost.create({
      data: {
        accountId,
        listingId: listingId || null,
        platform: account.platform,
        caption: caption.trim(),
        status: "PENDING",
        postType: "JOB_POSTER",
      },
      include: {
        listing: {
          select: { id: true, title: true },
        },
        account: {
          select: { id: true, platform: true, platformUsername: true },
        },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating social post:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
