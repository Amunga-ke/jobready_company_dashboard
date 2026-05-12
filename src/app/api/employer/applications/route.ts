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
    const status = searchParams.get("status");
    const listingId = searchParams.get("listingId");
    const scoreFilter = searchParams.get("scoreFilter"); // "RATED" or "UNRATED"
    const sortBy = searchParams.get("sortBy") || "appliedAt";
    const sortDir = searchParams.get("sortDir") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      listing: { companyId: profile.companyId },
    };

    if (status) {
      where.status = status;
    }
    if (listingId) {
      where.listingId = listingId;
    }
    if (scoreFilter === "RATED") {
      where.score = { not: null };
    } else if (scoreFilter === "UNRATED") {
      where.score = null;
    }

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortDir;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
          },
          listing: {
            select: { id: true, title: true, slug: true },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return NextResponse.json({
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
