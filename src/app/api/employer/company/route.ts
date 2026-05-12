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

    const company = await prisma.company.findUnique({
      where: { id: profile.companyId },
      include: {
        _count: {
          select: {
            listings: true,
            teamMembers: true,
            employerProfiles: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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
    const { name, orgType, industry, description, website, location, county } = body;

    const company = await prisma.company.update({
      where: { id: profile.companyId },
      data: {
        ...(name !== undefined && { name }),
        ...(orgType !== undefined && { orgType }),
        ...(industry !== undefined && { industry }),
        ...(description !== undefined && { description }),
        ...(website !== undefined && { website }),
        ...(location !== undefined && { location }),
        ...(county !== undefined && { county }),
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
