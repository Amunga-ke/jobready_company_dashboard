import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { addCredits } from "@/lib/credits";

export const CREDIT_PACKAGES = [
  { credits: 5, price: 499 },
  { credits: 15, price: 1299 },
  { credits: 30, price: 2499 },
  { credits: 100, price: 7499 },
];

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
    const { packageId } = body;

    if (!packageId || typeof packageId !== "number" || packageId < 0 || packageId >= CREDIT_PACKAGES.length) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    const pkg = CREDIT_PACKAGES[packageId];

    // Create payment in PENDING status
    const payment = await prisma.payment.create({
      data: {
        companyId: profile.companyId,
        userId: session.user.id,
        amount: pkg.price,
        currency: "KES",
        status: "PENDING",
        paymentMethod: "MPESA",
        itemType: "CREDITS",
        itemId: String(pkg.credits),
        description: `${pkg.credits} job credits package`,
        metadata: JSON.stringify({ credits: pkg.credits, packageId }),
      },
    });

    // For now, auto-complete the payment (in production this would wait for MPESA callback)
    const completedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        paidAt: new Date(),
        paymentRef: `JR-${Date.now()}`,
      },
    });

    // Add credits to the company
    await addCredits(
      profile.companyId,
      pkg.credits,
      "PURCHASE",
      `Purchased ${pkg.credits} credits`,
      completedPayment.id
    );

    return NextResponse.json({
      payment: completedPayment,
      message: `Successfully purchased ${pkg.credits} credits!`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error purchasing credits:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
