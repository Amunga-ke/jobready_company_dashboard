import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { addCredits } from "@/lib/credits";

/**
 * GET /api/employer/payments/[id]/status
 *
 * Returns the current payment status. Also includes a safety net:
 * if the payment is COMPLETED but the linked subscription was not activated,
 * or if credits were not added, this endpoint will activate them.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: paymentId } = await params;

    // Fetch the payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: { plan: { select: { name: true, slug: true } } },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify ownership
    if (payment.companyId !== profile.companyId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // ─── Safety net: activate subscription or add credits if payment completed ───
    let activationNotice: string | null = null;

    if (payment.status === "COMPLETED") {
      // Check subscription activation
      if (
        payment.itemType === "SUBSCRIPTION" &&
        payment.subscriptionId &&
        payment.subscription
      ) {
        if (
          payment.subscription.status === "TRIAL" ||
          payment.subscription.status === "PENDING_PAYMENT"
        ) {
          await prisma.companySubscription.update({
            where: { id: payment.subscriptionId },
            data: { status: "ACTIVE" },
          });
          activationNotice = "Subscription activated successfully.";
        }
      }

      // Check credits were added
      if (payment.itemType === "CREDITS" && payment.itemId) {
        const creditAmount = parseInt(payment.itemId, 10);
        if (!isNaN(creditAmount) && creditAmount > 0) {
          // Check if a transaction already exists for this payment
          const existingTx = await prisma.jobCreditTransaction.findFirst({
            where: { paymentId: payment.id },
          });

          if (!existingTx) {
            await addCredits(
              profile.companyId,
              creditAmount,
              "PURCHASE",
              `Purchased ${creditAmount} credits`,
              payment.id
            );
            activationNotice = `${creditAmount} credits added to your account.`;
          }
        }
      }
    }

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      description: payment.description,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      paymentMethod: payment.paymentMethod,
      itemType: payment.itemType,
      planName: payment.subscription?.plan?.name || null,
      activationNotice,
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
