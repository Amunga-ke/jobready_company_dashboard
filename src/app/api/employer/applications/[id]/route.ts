import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ALLOWED_STATUSES = ["PENDING", "SCREENING", "INTERVIEW", "SHORTLISTED", "OFFERED", "REJECTED"];

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

    const application = await prisma.application.findFirst({
      where: {
        id,
        listing: { companyId: profile.companyId },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
        listing: {
          include: {
            category: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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

    const application = await prisma.application.findFirst({
      where: { id },
      include: { listing: { select: { companyId: true } } },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.listing.companyId !== profile.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
        listing: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
