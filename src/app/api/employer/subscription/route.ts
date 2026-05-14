import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initiateSTKPush, isValidMpesaPhone } from "@/lib/mpesa";

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

    const subscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: profile.companyId,
        status: { in: ["ACTIVE", "TRIAL", "CANCELLED", "PENDING_PAYMENT"] },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    return NextResponse.json({
      subscription: {
        ...subscription,
        plan: {
          ...subscription.plan,
          features: JSON.parse(subscription.plan.features || "[]"),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const { planId, billingCycle, phoneNumber } = body;

    if (!planId || !billingCycle) {
      return NextResponse.json({ error: "planId and billingCycle are required" }, { status: 400 });
    }

    if (!["MONTHLY", "YEARLY"].includes(billingCycle)) {
      return NextResponse.json({ error: "billingCycle must be MONTHLY or YEARLY" }, { status: 400 });
    }

    // Verify the plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    // Determine amount
    const amount = billingCycle === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;
    const periodStart = new Date();
    const periodEnd = new Date(
      periodStart.getTime() + (billingCycle === "MONTHLY" ? 30 : 365) * 24 * 60 * 60 * 1000
    );

    // ─── Free plan: no payment needed ───
    if (amount === 0) {
      // Check for existing active subscription
      const existingSubscription = await prisma.companySubscription.findFirst({
        where: {
          companyId: profile.companyId,
          status: { in: ["ACTIVE", "TRIAL"] },
        },
      });

      if (existingSubscription) {
        return NextResponse.json(
          { error: "Company already has an active subscription. Use the change endpoint to switch plans." },
          { status: 409 }
        );
      }

      const subscription = await prisma.companySubscription.create({
        data: {
          companyId: profile.companyId,
          planId: plan.id,
          status: "ACTIVE",
          billingCycle,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      return NextResponse.json(
        {
          subscription: {
            ...subscription,
            plan: {
              ...subscription.plan,
              features: JSON.parse(subscription.plan.features || "[]"),
            },
          },
          message: "Successfully subscribed to the Free plan!",
        },
        { status: 201 }
      );
    }

    // ─── Paid plan: need M-Pesa payment ───

    // Validate phone number
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required for paid plans" }, { status: 400 });
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

    // Check for existing active/trial subscription
    const existingSubscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: profile.companyId,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: "Company already has an active subscription. Use the change endpoint to switch plans." },
        { status: 409 }
      );
    }

    // Create subscription + payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const sub = await tx.companySubscription.create({
        data: {
          companyId: profile.companyId,
          planId: plan.id,
          status: "PENDING_PAYMENT",
          billingCycle,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      const payment = await tx.payment.create({
        data: {
          subscriptionId: sub.id,
          companyId: profile.companyId,
          userId: session.user.id,
          amount,
          currency: plan.currency,
          status: "PENDING",
          paymentMethod: "MPESA",
          itemType: "SUBSCRIPTION",
          itemId: plan.id,
          description: `${plan.name} plan - ${billingCycle.toLowerCase()} subscription`,
        },
      });

      return { subscription: sub, payment };
    });

    // Initiate STK push outside the transaction (since M-Pesa is an external call)
    const stkResult = await initiateSTKPush({
      phoneNumber,
      amount: result.payment.amount,
      description: `${plan.name} ${billingCycle.toLowerCase()}`,
      reference: result.payment.id,
    });

    if (!stkResult.success || !stkResult.CheckoutRequestID) {
      // Payment/subscription exist but STK push failed
      return NextResponse.json(
        {
          error:
            stkResult.errorMessage ||
            "Failed to initiate M-Pesa payment. Please try again.",
          paymentId: result.payment.id,
        },
        { status: 500 }
      );
    }

    // Update payment with CheckoutRequestID
    await prisma.payment.update({
      where: { id: result.payment.id },
      data: {
        paymentRef: stkResult.CheckoutRequestID,
        metadata: JSON.stringify({
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID,
          phoneNumber: phoneNumber.replace(/\D/g, ""),
        }),
      },
    });

    return NextResponse.json(
      {
        subscription: {
          ...result.subscription,
          plan: {
            ...result.subscription.plan,
            features: JSON.parse(result.subscription.plan.features || "[]"),
          },
        },
        paymentId: result.payment.id,
        checkoutRequestId: stkResult.CheckoutRequestID,
        message: "STK push sent to your phone. Enter your PIN to complete payment.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
