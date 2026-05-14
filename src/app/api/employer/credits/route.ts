import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getCompanyCredits } from "@/lib/credits";

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

    const balance = await getCompanyCredits(profile.companyId);

    const transactions = await prisma.jobCreditTransaction.findMany({
      where: {
        credit: { companyId: profile.companyId },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      ...balance,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
