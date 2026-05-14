import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initiateSTKPush, isValidMpesaPhone } from "@/lib/mpesa";

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
    const { paymentId, phoneNumber } = body;

    if (!paymentId || !phoneNumber) {
      return NextResponse.json(
        { error: "paymentId and phoneNumber are required" },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!isValidMpesaPhone(phoneNumber)) {
      return NextResponse.json(
        {
          error:
            "Invalid phone number. Must be in format 2547XXXXXXXX or 2541XXXXXXXX (12 digits).",
        },
        { status: 400 }
      );
    }

    // Fetch the payment and verify it belongs to this company
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.companyId !== profile.companyId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: `Payment is already ${payment.status.toLowerCase()}. Cannot initiate M-Pesa for a non-pending payment.` },
        { status: 400 }
      );
    }

    // Initiate STK push
    const stkResult = await initiateSTKPush({
      phoneNumber,
      amount: payment.amount,
      description: payment.description.slice(0, 12),
      reference: payment.id,
    });

    if (!stkResult.success || !stkResult.CheckoutRequestID) {
      return NextResponse.json(
        {
          error: stkResult.errorMessage || "Failed to initiate M-Pesa payment. Please try again.",
        },
        { status: 500 }
      );
    }

    // Update the payment with the CheckoutRequestID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentRef: stkResult.CheckoutRequestID,
        paymentMethod: "MPESA",
        metadata: JSON.stringify({
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID,
          phoneNumber: phoneNumber.replace(/\D/g, ""),
        }),
      },
    });

    return NextResponse.json({
      paymentId: payment.id,
      checkoutRequestId: stkResult.CheckoutRequestID,
      message: "STK push sent to your phone. Enter your PIN to complete the payment.",
    });
  } catch (error) {
    console.error("Error initiating M-Pesa payment:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
