import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initiateSTKPush, isValidMpesaPhone } from "@/lib/mpesa";
import {
  getFeaturedPrice,
  VALID_DURATION_DAYS,
} from "@/lib/featured-pricing";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

/**
 * GET /api/employer/featured
 *
 * Fetch all featured boosts for the authenticated employer's company.
 * Includes listing title and status, ordered by createdAt desc.
 */
export async function GET(request: Request) {
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

    const boosts = await prisma.featuredBoost.findMany({
      where: { companyId: profile.companyId },
      include: {
        listing: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ boosts });
  } catch (error) {
    console.error("Error fetching featured boosts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/employer/featured
 *
 * Create a new featured boost for a listing.
 * Accepts: { listingId, durationDays, phoneNumber }
 * Initiates M-Pesa STK push payment.
 */
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
    const { listingId, durationDays, phoneNumber } = body;

    // Validate required fields
    if (!listingId || !durationDays || !phoneNumber) {
      return NextResponse.json(
        { error: "listingId, durationDays, and phoneNumber are required" },
        { status: 400 }
      );
    }

    // Validate duration
    if (!VALID_DURATION_DAYS.includes(durationDays)) {
      return NextResponse.json(
        { error: `Invalid duration. Must be one of: ${VALID_DURATION_DAYS.join(", ")} days` },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!isValidMpesaPhone(phoneNumber)) {
      return NextResponse.json(
        {
          error:
            "Invalid phone number. Must be in format 2547XXXXXXXX or 2541XXXXXXXX (12 digits).",
        },
        { status: 400 }
      );
    }

    // Validate listing exists and belongs to this company
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, companyId: profile.companyId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Validate listing is ACTIVE
    if (listing.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only active listings can be boosted" },
        { status: 400 }
      );
    }

    // Check no active boost already exists for this listing
    const existingBoost = await prisma.featuredBoost.findFirst({
      where: {
        listingId,
        status: "ACTIVE",
      },
    });

    if (existingBoost) {
      return NextResponse.json(
        { error: "This listing already has an active featured boost" },
        { status: 400 }
      );
    }

    // Check subscription plan's maxFeatured limit
    const activeSubscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: profile.companyId,
        status: "ACTIVE",
      },
      include: { plan: true },
    });

    const planSlug = activeSubscription?.plan?.slug || "free";
    const planConfig = SUBSCRIPTION_PLANS.find((p) => p.slug === planSlug);
    const maxFeatured = planConfig?.limits.maxFeatured ?? 0;

    if (maxFeatured === 0) {
      return NextResponse.json(
        {
          error:
            "Your current plan does not support featured listings. Please upgrade your plan to use this feature.",
        },
        { status: 403 }
      );
    }

    // Count active boosts in this billing period
    const periodStart = activeSubscription?.currentPeriodStart || new Date(0);
    const activeBoostCount = await prisma.featuredBoost.count({
      where: {
        companyId: profile.companyId,
        status: "ACTIVE",
        createdAt: { gte: periodStart },
      },
    });

    if (activeBoostCount >= maxFeatured) {
      return NextResponse.json(
        {
          error: `You have reached the featured listing limit (${maxFeatured}) for your current billing period. Please upgrade your plan for more featured listings.`,
        },
        { status: 403 }
      );
    }

    // Get price
    const price = getFeaturedPrice(durationDays);
    if (!price) {
      return NextResponse.json({ error: "Invalid duration for pricing" }, { status: 400 });
    }

    // Create FeaturedBoost record with status PENDING
    const boost = await prisma.featuredBoost.create({
      data: {
        companyId: profile.companyId,
        listingId,
        status: "PENDING",
        durationDays,
      },
    });

    // Create Payment record
    const payment = await prisma.payment.create({
      data: {
        boostId: boost.id,
        companyId: profile.companyId,
        userId: session.user.id,
        amount: price,
        currency: "KES",
        status: "PENDING",
        paymentMethod: "MPESA",
        itemType: "FEATURED_BOOST",
        itemId: boost.id,
        description: `Featured boost for "${listing.title}" — ${durationDays} days`,
        metadata: JSON.stringify({
          boostId: boost.id,
          listingId,
          listingTitle: listing.title,
          durationDays,
        }),
      },
    });

    // Initiate STK push
    const stkResult = await initiateSTKPush({
      phoneNumber,
      amount: price,
      description: `Featured ${durationDays}d`,
      reference: payment.id,
    });

    if (!stkResult.success || !stkResult.CheckoutRequestID) {
      // Boost and payment records exist but STK push failed — leave as PENDING
      return NextResponse.json(
        {
          error:
            stkResult.errorMessage ||
            "Failed to initiate M-Pesa payment. Please try again.",
          boostId: boost.id,
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
          boostId: boost.id,
          listingId,
          listingTitle: listing.title,
          durationDays,
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID,
          phoneNumber: phoneNumber.replace(/\D/g, ""),
        }),
      },
    });

    return NextResponse.json(
      {
        boostId: boost.id,
        paymentId: payment.id,
        checkoutRequestId: stkResult.CheckoutRequestID,
        amount: price,
        message: "STK push sent! Check your phone and enter PIN.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating featured boost:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
