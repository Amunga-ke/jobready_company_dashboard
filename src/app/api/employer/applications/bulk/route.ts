import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request) {
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

    const body = await request.json();
    const { applicationIds, status } = body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: "applicationIds array is required" }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const applications = await prisma.application.findMany({
      where: { id: { in: applicationIds } },
      include: { listing: { select: { companyId: true } } },
    });

    const unauthorizedIds = applications
      .filter((a: { listing: { companyId: string } }) => a.listing.companyId !== profile.companyId)
      .map((a: { id: string }) => a.id);

    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        { error: "Some applications do not belong to your company" },
        { status: 403 }
      );
    }

    const result = await prisma.application.updateMany({
      where: { id: { in: applicationIds } },
      data: { status },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Error doing bulk status update:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
