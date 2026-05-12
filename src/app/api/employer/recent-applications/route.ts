import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
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

    const applications = await prisma.application.findMany({
      where: {
        listing: {
          companyId: profile.companyId,
          status: { not: "DRAFT" },
        },
      },
      orderBy: { appliedAt: "desc" },
      take: 10,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        listing: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching recent applications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
