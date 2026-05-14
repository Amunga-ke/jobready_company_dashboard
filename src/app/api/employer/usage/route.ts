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

    const [
      activeListings,
      draftListings,
      featuredListings,
      teamMembers,
    ] = await Promise.all([
      prisma.listing.count({
        where: { companyId, status: "ACTIVE" },
      }),
      prisma.listing.count({
        where: { companyId, status: "DRAFT" },
      }),
      prisma.listing.count({
        where: { companyId, status: "ACTIVE", featured: true },
      }),
      prisma.teamMember.count({
        where: { companyId, isActive: true },
      }),
    ]);

    return NextResponse.json({
      activeListings,
      draftListings,
      featuredListings,
      teamMembers,
      cvSearchesUsed: 0, // placeholder for Phase 3
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
