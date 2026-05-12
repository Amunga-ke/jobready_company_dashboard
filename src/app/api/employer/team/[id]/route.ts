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

    // Only ADMIN can update team members
    if (!["OWNER", "ADMIN"].includes(profile.role)) {
      return NextResponse.json({ error: "Only admins can update team members" }, { status: 403 });
    }

    const { id } = await params;

    const member = await prisma.teamMember.findFirst({
      where: { id, companyId: profile.companyId },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const body = await request.json();
    const { role, isActive } = body;

    if (role === undefined && isActive === undefined) {
      return NextResponse.json({ error: "role or isActive field is required" }, { status: 400 });
    }

    // Cannot deactivate last admin
    if (isActive === false && ["OWNER", "ADMIN"].includes(member.role)) {
      const adminCount = await prisma.teamMember.count({
        where: {
          companyId: profile.companyId,
          role: { in: ["OWNER", "ADMIN"] },
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate the last admin" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.teamMember.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating team member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const member = await prisma.teamMember.findFirst({
      where: { id, companyId: profile.companyId },
    });

    if (!member) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    // Cannot remove self
    if (member.userId === session.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself from the team" }, { status: 400 });
    }

    // Cannot remove last admin
    if (["OWNER", "ADMIN"].includes(member.role)) {
      const adminCount = await prisma.teamMember.count({
        where: {
          companyId: profile.companyId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin" },
          { status: 400 }
        );
      }
    }

    await prisma.teamMember.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
