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

    const [members, currentUser] = await Promise.all([
      prisma.teamMember.findMany({
        where: { companyId: profile.companyId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.employerProfile.findUnique({
        where: { userId: session.user.id },
        select: { role: true },
      }),
    ]);

    return NextResponse.json({
      members,
      currentUserId: session.user.id,
      currentRole: currentUser?.role || "OWNER",
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const { email, role } = body;

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    // Validate role: only OWNER/ADMIN can assign roles other than MEMBER
    const resolvedRole = role || "MEMBER";
    if (
      resolvedRole !== "MEMBER" &&
      !["OWNER", "ADMIN"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "Only owners and admins can assign roles other than MEMBER" },
        { status: 403 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "User with this email not found" }, { status: 404 });
    }

    // Check if already a team member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        companyId_userId: {
          companyId: profile.companyId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "User is already a team member" }, { status: 409 });
    }

    // If user is SEEKER, promote to EMPLOYER
    if (user.role === "SEEKER") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "EMPLOYER" },
      });
    }

    const member = await prisma.teamMember.create({
      data: {
        companyId: profile.companyId,
        userId: user.id,
        role: resolvedRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Error inviting team member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
