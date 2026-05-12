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

    let settings = await prisma.employerSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      settings = await prisma.employerSettings.create({
        data: {
          userId: session.user.id,
          preferences: "{}",
        },
      });
    }

    return NextResponse.json({
      ...settings,
      preferences: JSON.parse(settings.preferences),
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (preferences === undefined) {
      return NextResponse.json({ error: "preferences field is required" }, { status: 400 });
    }

    const preferencesStr = typeof preferences === "string" ? preferences : JSON.stringify(preferences);

    const settings = await prisma.employerSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        preferences: preferencesStr,
      },
      update: {
        preferences: preferencesStr,
      },
    });

    return NextResponse.json({
      ...settings,
      preferences: JSON.parse(settings.preferences),
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (preferences === undefined) {
      return NextResponse.json({ error: "preferences field is required" }, { status: 400 });
    }

    // Fetch existing settings and merge
    let existing = await prisma.employerSettings.findUnique({
      where: { userId: session.user.id },
    });

    let currentPrefs: Record<string, unknown> = {};
    if (existing) {
      currentPrefs = JSON.parse(existing.preferences);
    }

    // Deep merge
    const mergedPrefs = { ...currentPrefs, ...preferences };

    const settings = await prisma.employerSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        preferences: JSON.stringify(mergedPrefs),
      },
      update: {
        preferences: JSON.stringify(mergedPrefs),
      },
    });

    return NextResponse.json({
      ...settings,
      preferences: mergedPrefs,
    });
  } catch (error) {
    console.error("Error patching settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
