import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
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

    const { userId } = await params;

    // Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        bio: true,
        cvUrl: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all applications to THIS employer's company listings only
    const applications = await prisma.application.findMany({
      where: {
        userId,
        listing: { companyId: profile.companyId },
      },
      orderBy: { appliedAt: "desc" },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...user,
      applications,
    });
  } catch (error) {
    console.error("Error fetching applicant profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
