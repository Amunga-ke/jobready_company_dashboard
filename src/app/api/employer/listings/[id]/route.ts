import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const listing = await prisma.listing.findFirst({
      where: { id, companyId: profile.companyId },
      include: {
        category: true,
        subcategory: true,
        company: true,
        tags: { include: { tag: true } },
        _count: { select: { applications: true } },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const existing = await prisma.listing.findFirst({
      where: { id, companyId: profile.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
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

    // Handle tag updates: delete existing, create new
    if (tagIds !== undefined) {
      await prisma.listingTag.deleteMany({ where: { listingId: id } });
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(categoryId !== undefined && { categoryId }),
        ...(subcategoryId !== undefined && { subcategoryId }),
        ...(town !== undefined && { town }),
        ...(county !== undefined && { county }),
        ...(employmentType !== undefined && { employmentType }),
        ...(experienceLevel !== undefined && { experienceLevel }),
        ...(workMode !== undefined && { workMode }),
        ...(salaryMin !== undefined && { salaryMin: salaryMin !== null ? Number(salaryMin) : null }),
        ...(salaryMax !== undefined && { salaryMax: salaryMax !== null ? Number(salaryMax) : null }),
        ...(salaryPeriod !== undefined && { salaryPeriod }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(featured !== undefined && { featured }),
        ...(status !== undefined && { status }),
        ...(tagIds !== undefined && {
          tags: tagIds.length > 0
            ? {
                create: tagIds.map((tagId: string) => ({ tagId })),
              }
            : undefined,
        }),
      },
      include: {
        category: true,
        subcategory: true,
        tags: { include: { tag: true } },
        _count: { select: { applications: true } },
      },
    });

    return NextResponse.json(listing);
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const existing = await prisma.listing.findFirst({
      where: { id, companyId: profile.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    await prisma.listing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting listing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
