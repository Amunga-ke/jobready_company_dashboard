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

    const companyId = profile.companyId;

    const [activeListings, totalApplications, profileViews, newApplicationsToday] =
      await Promise.all([
        prisma.listing.count({
          where: { companyId, status: { in: ["ACTIVE", "PUBLISHED"] } },
        }),
        prisma.application.count({
          where: { listing: { companyId } },
        }),
        prisma.listing.aggregate({
          where: { companyId },
          _sum: { viewCount: true },
        }),
        prisma.application.count({
          where: {
            listing: { companyId },
            appliedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

    return NextResponse.json({
      activeListings,
      totalApplications,
      profileViews: profileViews._sum.viewCount ?? 0,
      newApplicationsToday,
      newToday: newApplicationsToday,
    });
  } catch (error) {
    console.error("Error fetching employer stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
