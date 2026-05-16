import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  // Only allow in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  const key = crypto.randomBytes(32).toString("hex");

  return NextResponse.json({
    key,
    message: "Set this value as TOKEN_ENCRYPTION_KEY in your .env file. Keep it secret!",
    length: key.length,
    bytes: 32,
  });
}
