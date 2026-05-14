import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
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

    // Find active subscription
    const subscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: profile.companyId,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription to cancel" }, { status: 404 });
    }

    // Don't allow cancelling free plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: subscription.planId },
    });

    if (plan?.slug === "free") {
      return NextResponse.json({ error: "Cannot cancel the free plan" }, { status: 400 });
    }

    // Cancel subscription but keep access until period end
    const updated = await prisma.companySubscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
      include: { plan: true },
    });

    return NextResponse.json({
      subscription: {
        ...updated,
        plan: {
          ...updated.plan,
          features: JSON.parse(updated.plan.features || "[]"),
        },
      },
      message: "Subscription cancelled. You retain access until your current billing period ends.",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
