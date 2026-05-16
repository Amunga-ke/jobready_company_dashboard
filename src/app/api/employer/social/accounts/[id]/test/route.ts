import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/token-encryption";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
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

    if (!account.accessToken) {
      return NextResponse.json({
        success: false,
        error: "No access token stored for this account",
      });
    }

    // Attempt to decrypt the token as a basic validation
    try {
      const decrypted = await decryptToken(account.accessToken);

      if (!decrypted || decrypted.length < 10) {
        return NextResponse.json({
          success: false,
          error: "Access token appears to be invalid or too short",
        });
      }

      // Check if token might be expired (basic check - actual validation depends on platform)
      if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
        return NextResponse.json({
          success: false,
          error: "Token appears to have expired. Please reconnect the account.",
        });
      }

      return NextResponse.json({
        success: true,
        message: `Connection to ${account.platform} (${account.platformUsername}) is valid`,
        platform: account.platform,
        platformUsername: account.platformUsername,
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: "Failed to decrypt stored token. The token may be corrupted. Please reconnect.",
      });
    }
  } catch (error) {
    console.error("Error testing social account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
