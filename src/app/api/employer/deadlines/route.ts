import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface ListingWithDeadline {
  id: string;
  title: string;
  slug: string;
  deadline: Date | null;
  _count: { applications: number };
  daysRemaining: number | null;
  deadlineStatus: string;
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

    const listings = await prisma.listing.findMany({
      where: {
        companyId: profile.companyId,
        status: { in: ["ACTIVE", "PUBLISHED"] },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        deadline: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const listingsWithDeadlineInfo: ListingWithDeadline[] = listings.map((listing: typeof listings[number]) => {
      let daysRemaining: number | null = null;
      let deadlineStatus: string = "no_deadline";

      if (listing.deadline) {
        const diffMs = listing.deadline.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          deadlineStatus = "overdue";
        } else if (daysRemaining <= 7) {
          deadlineStatus = "approaching";
        } else {
          deadlineStatus = "on_track";
        }
      }

      return {
        ...listing,
        daysRemaining,
        deadlineStatus,
      };
    });

    // Sort: overdue first, then approaching, then on_track, then no_deadline
    const statusOrder: Record<string, number> = {
      overdue: 0,
      approaching: 1,
      on_track: 2,
      no_deadline: 3,
    };

    listingsWithDeadlineInfo.sort((a: ListingWithDeadline, b: ListingWithDeadline) => {
      const orderDiff = statusOrder[a.deadlineStatus] - statusOrder[b.deadlineStatus];
      if (orderDiff !== 0) return orderDiff;
      return (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity);
    });

    // Summary counts
    const summary = {
      total: listingsWithDeadlineInfo.filter((l) => l.deadlineStatus !== "").length,
      overdue: listingsWithDeadlineInfo.filter((l: ListingWithDeadline) => l.deadlineStatus === "overdue").length,
      approaching: listingsWithDeadlineInfo.filter((l: ListingWithDeadline) => l.deadlineStatus === "approaching").length,
      onTrack: listingsWithDeadlineInfo.filter((l: ListingWithDeadline) => l.deadlineStatus === "on_track").length,
      noDeadline: listingsWithDeadlineInfo.filter((l: ListingWithDeadline) => l.deadlineStatus === "no_deadline").length,
    };

    return NextResponse.json({
      listings: listingsWithDeadlineInfo,
      summary,
    });
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
