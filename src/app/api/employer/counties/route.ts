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

    const counties = await prisma.county.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(counties);
  } catch (error) {
    console.error("Error fetching counties:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
