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

    const subscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: profile.companyId,
        status: { in: ["ACTIVE", "TRIAL", "CANCELLED"] },
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
    const { planId, billingCycle } = body;

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

    // Check for existing active subscription
    const existingSubscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: profile.companyId,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: "Company already has an active subscription. Cancel it first." },
        { status: 409 }
      );
    }

    // Determine amount
    const amount = billingCycle === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;
    const periodStart = new Date();
    const periodEnd = new Date(
      periodStart.getTime() + (billingCycle === "MONTHLY" ? 30 : 365) * 24 * 60 * 60 * 1000
    );

    // Create subscription and payment in a transaction
    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.companySubscription.create({
        data: {
          companyId: profile.companyId,
          planId: plan.id,
          status: amount === 0 ? "ACTIVE" : "TRIAL",
          billingCycle,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      if (amount > 0) {
        await tx.payment.create({
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
      }

      return sub;
    });

    return NextResponse.json({
      subscription: {
        ...subscription,
        plan: {
          ...subscription.plan,
          features: JSON.parse(subscription.plan.features || "[]"),
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
