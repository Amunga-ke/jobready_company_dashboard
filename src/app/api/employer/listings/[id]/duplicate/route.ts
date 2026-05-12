import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(
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

    const original = await prisma.listing.findFirst({
      where: { id, companyId: profile.companyId },
      include: {
        tags: { include: { tag: true } },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const randomHex = crypto.randomBytes(3).toString("hex");
    const newTitle = original.title + " (Copy)";
    const newSlug = original.slug + "-copy-" + randomHex;

    const newDeadline = original.deadline
      ? new Date(original.deadline.getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;

    const tagCreates = original.tags.map((lt: { tagId: string }) => ({ tagId: lt.tagId }));

    const duplicated = await prisma.listing.create({
      data: {
        companyId: original.companyId,
        title: newTitle,
        slug: newSlug,
        description: original.description,
        listingType: original.listingType,
        governmentLevel: original.governmentLevel,
        opportunityType: original.opportunityType,
        categoryId: original.categoryId,
        subcategoryId: original.subcategoryId,
        town: original.town,
        county: original.county,
        employmentType: original.employmentType,
        experienceLevel: original.experienceLevel,
        workMode: original.workMode,
        salaryMin: original.salaryMin,
        salaryMax: original.salaryMax,
        salaryPeriod: original.salaryPeriod,
        predictedSalary: original.predictedSalary,
        viewCount: 0,
        applyCount: 0,
        deadline: newDeadline,
        featured: false,
        status: "DRAFT",
        applicationUrl: original.applicationUrl,
        applyEmail: original.applyEmail,
        source: original.source,
        tags: {
          create: tagCreates,
        },
      },
      include: {
        category: true,
        subcategory: true,
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    console.error("Error duplicating listing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
