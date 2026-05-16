import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/token-encryption";

const VALID_PLATFORMS = ["LINKEDIN", "TWITTER", "FACEBOOK", "INSTAGRAM"];

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

    const accounts = await prisma.socialAccount.findMany({
      where: { companyId: profile.companyId },
      orderBy: { createdAt: "desc" },
    });

    const masked = accounts.map((account) => ({
      id: account.id,
      platform: account.platform,
      platformUsername: account.platformUsername,
      isActive: account.isActive,
      autoPost: account.autoPost,
      autoPostJobTypes: account.autoPostJobTypes,
      connectedAt: account.createdAt,
      // Mask access token: show only last 4 chars
      accessTokenMasked: account.accessToken
        ? "••••••••" + account.accessToken.slice(-4)
        : null,
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error("Error fetching social accounts:", error);
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
    const { platform, platformUsername, accessToken, refreshToken, autoPost } = body;

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!platformUsername || typeof platformUsername !== "string") {
      return NextResponse.json({ error: "platformUsername is required" }, { status: 400 });
    }

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
    }

    // Check for existing account on this platform for this company
    const existing = await prisma.socialAccount.findUnique({
      where: {
        userId_companyId_platform: {
          userId: session.user.id,
          companyId: profile.companyId,
          platform,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A ${platform} account is already connected. Please disconnect it first.` },
        { status: 409 }
      );
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? await encryptToken(refreshToken) : null;

    const account = await prisma.socialAccount.create({
      data: {
        userId: session.user.id,
        companyId: profile.companyId,
        platform,
        platformUsername,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        autoPost: autoPost || false,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        id: account.id,
        platform: account.platform,
        platformUsername: account.platformUsername,
        isActive: account.isActive,
        autoPost: account.autoPost,
        connectedAt: account.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating social account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
