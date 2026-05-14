import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initiateSTKPush, isValidMpesaPhone } from "@/lib/mpesa";

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
    const { packageId, phoneNumber } = body;

    // Validate package ID
    if (!packageId || typeof packageId !== "number" || packageId < 0 || packageId >= CREDIT_PACKAGES.length) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    // Validate phone number
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (!isValidMpesaPhone(phoneNumber)) {
      return NextResponse.json(
        {
          error:
            "Invalid phone number. Must be in format 2547XXXXXXXX or 2541XXXXXXXX (12 digits).",
        },
        { status: 400 }
      );
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

    // Initiate STK push
    const stkResult = await initiateSTKPush({
      phoneNumber,
      amount: pkg.price,
      description: `${pkg.credits} Credits`,
      reference: payment.id,
    });

    if (!stkResult.success || !stkResult.CheckoutRequestID) {
      // Payment record exists but STK push failed — leave it as PENDING
      return NextResponse.json(
        {
          error:
            stkResult.errorMessage ||
            "Failed to initiate M-Pesa payment. Please try again.",
          paymentId: payment.id,
        },
        { status: 500 }
      );
    }

    // Update payment with CheckoutRequestID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentRef: stkResult.CheckoutRequestID,
        metadata: JSON.stringify({
          credits: pkg.credits,
          packageId,
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID,
          phoneNumber: phoneNumber.replace(/\D/g, ""),
        }),
      },
    });

    return NextResponse.json(
      {
        paymentId: payment.id,
        checkoutRequestId: stkResult.CheckoutRequestID,
        amount: pkg.price,
        message: "STK push sent! Check your phone and enter PIN.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error purchasing credits:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
