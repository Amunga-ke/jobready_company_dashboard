import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Map MIME types to file extensions
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

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
    const dataUrlRegex = /^data:(image\/(png|jpeg|jpg|gif|webp|svg\+xml));base64,/;
    const match = logo.match(dataUrlRegex);
    if (!match) {
      return NextResponse.json({ error: "logo must be a valid base64 data URL for an image" }, { status: 400 });
    }

    const mimeType = match[1]; // e.g., "image/png"
    const extension = MIME_TO_EXT[mimeType] || "png";

    // Validate max 2MB
    const base64Data = logo.split(",")[1];
    const byteLength = Math.ceil(base64Data.length * 0.75);
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (byteLength > maxSize) {
      return NextResponse.json({ error: "Logo must be less than 2MB" }, { status: 400 });
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename
    const filename = `${profile.companyId}-${crypto.randomBytes(8).toString("hex")}.${extension}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
    await mkdir(uploadDir, { recursive: true });

    // Write file to disk
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Store the URL path in the database (not base64)
    const logoUrl = `/uploads/logos/${filename}`;

    const company = await prisma.company.update({
      where: { id: profile.companyId },
      data: { logo: logoUrl },
    });

    return NextResponse.json({ logo: company.logo });
  } catch (error) {
    console.error("Error updating company logo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
