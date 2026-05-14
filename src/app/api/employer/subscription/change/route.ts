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
    const { planId, billingCycle, phoneNumber } = body;

    if (!planId || !billingCycle) {
      return NextResponse.json({ error: "planId and billingCycle are required" }, { status: 400 });
    }

    if (!["MONTHLY", "YEARLY"].includes(billingCycle)) {
      return NextResponse.json({ error: "billingCycle must be MONTHLY or YEARLY" }, { status: 400 });
    }

    // Validate the new plan exists and is active
    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!newPlan || !newPlan.isActive) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    // Get company's current subscription
    const currentSubscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: profile.companyId,
        status: { in: ["ACTIVE", "TRIAL", "CANCELLED", "PENDING_PAYMENT"] },
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    if (!currentSubscription) {
      return NextResponse.json(
        { error: "No current subscription found. Please subscribe to a plan first." },
        { status: 400 }
      );
    }

    // Check if same plan
    if (currentSubscription.planId === planId) {
      return NextResponse.json(
        { error: "You are already on this plan." },
        { status: 400 }
      );
    }

    const currentPlanPrice =
      currentSubscription.billingCycle === "YEARLY"
        ? currentSubscription.plan.priceYearly
        : currentSubscription.plan.priceMonthly;

    const newPlanPrice =
      billingCycle === "YEARLY" ? newPlan.priceYearly : newPlan.priceMonthly;

    const isDowngrade = newPlanPrice < currentPlanPrice;
    const isUpgrade = newPlanPrice > currentPlanPrice;
    const isFreeTarget = newPlan.slug === "free";

    // ─── Free plan target: no payment needed ───
    if (isFreeTarget) {
      const result = await prisma.$transaction(async (tx) => {
        await tx.companySubscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });

        const newSub = await tx.companySubscription.create({
          data: {
            companyId: profile.companyId,
            planId: newPlan.id,
            status: "ACTIVE",
            billingCycle: "MONTHLY",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
          include: { plan: true },
        });

        return newSub;
      });

      return NextResponse.json({
        subscription: {
          ...result,
          plan: {
            ...result.plan,
            features: JSON.parse(result.plan.features || "[]"),
          },
        },
        message: "Switched to the Free plan.",
      });
    }

    // ─── Paid plan target: need phone number + M-Pesa ───
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

    const result = await prisma.$transaction(async (tx) => {
      let newSubscription: Awaited<
        ReturnType<
          typeof tx.companySubscription.create
        >
      > & { plan: NonNullable<Awaited<ReturnType<typeof tx.companySubscription.create>>["plan"]> };

      if (isDowngrade) {
        // Downgrade: mark current as CANCELLED, new starts at period end
        await tx.companySubscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });

        newSubscription = await tx.companySubscription.create({
          data: {
            companyId: profile.companyId,
            planId: newPlan.id,
            status: "PENDING_PAYMENT",
            billingCycle,
            currentPeriodStart: new Date(currentSubscription.currentPeriodEnd),
            currentPeriodEnd: new Date(
              currentSubscription.currentPeriodEnd.getTime() +
                (billingCycle === "MONTHLY" ? 30 : 365) * 24 * 60 * 60 * 1000
            ),
          },
          include: { plan: true },
        });

        // Create PENDING payment for the downgrade
        const payment = await tx.payment.create({
          data: {
            subscriptionId: newSubscription.id,
            companyId: profile.companyId,
            userId: session.user.id,
            amount: newPlanPrice,
            currency: newPlan.currency,
            status: "PENDING",
            paymentMethod: "MPESA",
            itemType: "SUBSCRIPTION",
            itemId: newPlan.id,
            description: `${newPlan.name} plan - ${billingCycle.toLowerCase()} subscription (downgrade, starts ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()})`,
          },
        });

        return { subscription: newSubscription, payment };
      } else {
        // Upgrade: immediately cancel old, create new starting now
        await tx.companySubscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });

        const periodStart = new Date();
        const periodEnd = new Date(
          periodStart.getTime() +
            (billingCycle === "MONTHLY" ? 30 : 365) * 24 * 60 * 60 * 1000
        );

        newSubscription = await tx.companySubscription.create({
          data: {
            companyId: profile.companyId,
            planId: newPlan.id,
            status: "PENDING_PAYMENT",
            billingCycle,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
          include: { plan: true },
        });

        const payment = await tx.payment.create({
          data: {
            subscriptionId: newSubscription.id,
            companyId: profile.companyId,
            userId: session.user.id,
            amount: newPlanPrice,
            currency: newPlan.currency,
            status: "PENDING",
            paymentMethod: "MPESA",
            itemType: "SUBSCRIPTION",
            itemId: newPlan.id,
            description: `${newPlan.name} plan - ${billingCycle.toLowerCase()} subscription (upgrade)`,
          },
        });

        return { subscription: newSubscription, payment };
      }
    });

    // Initiate STK push
    const stkResult = await initiateSTKPush({
      phoneNumber,
      amount: result.payment.amount,
      description: `${newPlan.name} ${billingCycle.toLowerCase()}`,
      reference: result.payment.id,
    });

    if (!stkResult.success || !stkResult.CheckoutRequestID) {
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

    return NextResponse.json({
      subscription: {
        ...result.subscription,
        plan: {
          ...result.subscription.plan,
          features: JSON.parse(result.subscription.plan.features || "[]"),
        },
      },
      paymentId: result.payment.id,
      checkoutRequestId: stkResult.CheckoutRequestID,
      message: isDowngrade
        ? "STK push sent! Payment will be charged when your new plan starts."
        : "STK push sent to your phone. Enter your PIN to activate your new plan.",
    });
  } catch (error) {
    console.error("Error changing subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
