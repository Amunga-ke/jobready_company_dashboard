import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, industry, orgType } = body;

    // Validate required fields
    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Name, email, password, and company name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength (min 8 chars)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check if company name is taken
    const companySlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const existingCompany = await prisma.company.findUnique({
      where: { slug: companySlug },
    });

    // If slug exists, append random suffix
    const finalSlug = existingCompany
      ? `${companySlug}-${crypto.randomBytes(2).toString("hex")}`
      : companySlug;

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user, company, and employer profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          passwordHash,
          role: "EMPLOYER",
          isActive: true,
        },
      });

      // 2. Create the company
      const company = await tx.company.create({
        data: {
          slug: finalSlug,
          name: companyName.trim(),
          orgType: orgType || "PRIVATE",
          industry: industry || null,
          country: "Kenya",
        },
      });

      // 3. Create the employer profile (links user to company)
      const profile = await tx.employerProfile.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: "ADMIN",
          isVerified: false,
        },
      });

      return { user, company, profile };
    });

    return NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        company: {
          id: result.company.id,
          name: result.company.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error during registration:", error);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
