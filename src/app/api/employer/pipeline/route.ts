import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const PIPELINE_STATUSES = ["PENDING", "SCREENING", "INTERVIEW", "SHORTLISTED", "OFFERED", "REJECTED"];

interface PipelineApplication {
  id: string;
  applicantName: string | null;
  applicantEmail: string;
  applicantUserId: string;
  applicantAvatarUrl: string | null;
  listingId: string;
  listingTitle: string;
  coverLetter: string | null;
  score: number | null;
  notes: string | null;
  appliedAt: Date;
  status: string;
}

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
    const listingId = searchParams.get("listingId");

    const whereBase: Record<string, unknown> = {
      listing: { companyId: profile.companyId },
    };
    if (listingId) {
      whereBase.listingId = listingId;
    }

    // Fetch all applications grouped by status
    const pipeline: Record<string, PipelineApplication[]> = {};

    for (const status of PIPELINE_STATUSES) {
      const applications = await prisma.application.findMany({
        where: { ...whereBase, status },
        orderBy: { appliedAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          listing: {
            select: { id: true, title: true },
          },
        },
      });

      pipeline[status] = applications.map((app: typeof applications[number]) => ({
        id: app.id,
        applicantName: app.user.name,
        applicantEmail: app.user.email,
        applicantUserId: app.user.id,
        applicantAvatarUrl: app.user.avatarUrl,
        listingId: app.listing.id,
        listingTitle: app.listing.title,
        coverLetter: app.coverLetter
          ? app.coverLetter.length > 80
            ? app.coverLetter.substring(0, 80) + "..."
            : app.coverLetter
          : null,
        score: app.score,
        notes: app.notes,
        appliedAt: app.appliedAt,
        status: app.status,
      }));
    }

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
