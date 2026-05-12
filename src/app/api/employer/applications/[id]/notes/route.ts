import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    const { notes } = body;

    if (notes === undefined) {
      return NextResponse.json({ error: "notes field is required" }, { status: 400 });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { notes },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating application notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
