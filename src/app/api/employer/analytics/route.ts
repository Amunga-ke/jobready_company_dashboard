import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface ListingView {
  viewCount: number;
}

interface DailyTrendRow {
  date: string;
  count: number;
}

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

    // Fetch overview stats
    const [listingsData, totalApplications, recentApplications, topListings] = await Promise.all([
      prisma.listing.findMany({
        where: { companyId },
        select: { viewCount: true },
      }),
      prisma.application.count({
        where: { listing: { companyId } },
      }),
      prisma.application.findMany({
        where: { listing: { companyId } },
        orderBy: { appliedAt: "desc" },
        take: 15,
        include: {
          user: { select: { id: true, name: true } },
          listing: { select: { id: true, title: true } },
        },
      }),
      prisma.listing.findMany({
        where: { companyId },
        orderBy: { viewCount: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: true,
          status: true,
          _count: { select: { applications: true } },
        },
      }),
    ]);

    const activeListings = await prisma.listing.count({
      where: { companyId, status: { in: ["ACTIVE", "PUBLISHED"] } },
    });

    const totalListingViews = (listingsData as ListingView[]).reduce(
      (sum: number, l: ListingView) => sum + l.viewCount,
      0
    );
    const avgApplicationsPerListing = listingsData.length > 0
      ? Math.round((totalApplications / listingsData.length) * 100) / 100
      : 0;

    // Application funnel - group by status
    const applicationFunnel = await prisma.application.groupBy({
      by: ["status"],
      where: { listing: { companyId } },
      _count: { status: true },
    });

    const funnelMap: Record<string, number> = {};
    for (const item of applicationFunnel) {
      funnelMap[item.status] = item._count.status;
    }

    // Daily trends - last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyTrendsRaw = await prisma.$queryRaw<DailyTrendRow[]>`
      SELECT DATE(applied_at) as date, CAST(COUNT(*) AS SIGNED) as count
      FROM applications
      WHERE listing_id IN (SELECT id FROM listings WHERE company_id = ${companyId})
        AND applied_at >= ${thirtyDaysAgo}
      GROUP BY DATE(applied_at)
      ORDER BY date ASC
    `;

    return NextResponse.json({
      overview: {
        totalListingViews,
        totalApplications,
        activeListings,
        avgApplicationsPerListing,
      },
      applicationFunnel: funnelMap,
      topListings,
      recentApplications,
      dailyTrends: (dailyTrendsRaw as DailyTrendRow[]).map((d: DailyTrendRow) => ({
        date: d.date,
        count: d.count,
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
