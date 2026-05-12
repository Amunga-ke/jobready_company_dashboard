import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    const { logo } = body;

    if (!logo || typeof logo !== "string") {
      return NextResponse.json({ error: "logo field is required (base64 data URL)" }, { status: 400 });
    }

    // Validate it's a data URL
    const dataUrlRegex = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
    if (!dataUrlRegex.test(logo)) {
      return NextResponse.json({ error: "logo must be a valid base64 data URL for an image" }, { status: 400 });
    }

    // Validate max 2MB (base64 is ~4/3 of original, so 2MB original ≈ 2.67MB base64)
    const base64Data = logo.split(",")[1];
    const byteLength = Math.ceil(base64Data.length * 0.75);
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (byteLength > maxSize) {
      return NextResponse.json({ error: "Logo must be less than 2MB" }, { status: 400 });
    }

    const company = await prisma.company.update({
      where: { id: profile.companyId },
      data: { logo },
    });

    return NextResponse.json({ logo: company.logo });
  } catch (error) {
    console.error("Error updating company logo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
