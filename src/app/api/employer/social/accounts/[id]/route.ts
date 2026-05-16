import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/token-encryption";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const account = await prisma.socialAccount.findFirst({
      where: {
        id,
        companyId: profile.companyId,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Social account not found" }, { status: 404 });
    }

    const body = await request.json();
    const { isActive, autoPost, autoPostJobTypes, platformUsername } = body;

    const updateData: Record<string, unknown> = {};

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }
    if (autoPost !== undefined) {
      updateData.autoPost = Boolean(autoPost);
    }
    if (autoPostJobTypes !== undefined) {
      const typesStr = typeof autoPostJobTypes === "string"
        ? autoPostJobTypes
        : JSON.stringify(autoPostJobTypes);
      updateData.autoPostJobTypes = typesStr;
    }
    if (platformUsername !== undefined && typeof platformUsername === "string") {
      updateData.platformUsername = platformUsername;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.socialAccount.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      platform: updated.platform,
      platformUsername: updated.platformUsername,
      isActive: updated.isActive,
      autoPost: updated.autoPost,
      autoPostJobTypes: updated.autoPostJobTypes,
      connectedAt: updated.createdAt,
    });
  } catch (error) {
    console.error("Error updating social account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

    const account = await prisma.socialAccount.findFirst({
      where: {
        id,
        companyId: profile.companyId,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Social account not found" }, { status: 404 });
    }

    // Optionally decrypt tokens before deleting (for logging/audit)
    try {
      if (account.accessToken) {
        await decryptToken(account.accessToken);
      }
    } catch {
      // Decryption failed, token may be corrupted - still proceed with delete
    }

    // Delete the account and associated posts (cascade)
    await prisma.socialAccount.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Social account disconnected successfully" });
  } catch (error) {
    console.error("Error deleting social account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
