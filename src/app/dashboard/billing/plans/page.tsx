"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Zap,
  Loader2,
  Sparkles,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MpesaPaymentDialog from "@/components/mpesa-payment-dialog";

interface PlanData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxListings: number;
  maxFeatured: number;
  maxCvSearches: number;
  maxTeamMembers: number;
  maxMessagesPerDay: number;
  features: string[];
  sortOrder: number;
}

interface CurrentSubscription {
  plan: { id: string; slug: string; name: string };
  billingCycle: string;
  status: string;
}

function formatKES(amount: number): string {
  if (amount === 0) return "Free";
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function getDisplayLimit(value: number): string {
  return value === -1 ? "Unlimited" : String(value);
}

function getPlanIcon(slug: string) {
  switch (slug) {
    case "free":
      return Zap;
    case "starter":
      return Sparkles;
    case "pro":
      return Zap;
    case "enterprise":
      return Crown;
    default:
      return Zap;
  }
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const [paymentEndpoint, setPaymentEndpoint] = useState("");
  const [paymentBody, setPaymentBody] = useState<Record<string, unknown>>({});

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch("/api/employer/subscription/plans"),
        fetch("/api/employer/subscription"),
      ]);

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setCurrentSub(data.subscription);
      }
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePlanClick = (plan: PlanData) => {
    const price = billingCycle === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;

    // Free plan: subscribe immediately
    if (price === 0) {
      handleFreeSubscribe(plan.id);
      return;
    }

    // Paid plan: open M-Pesa dialog
    const hasActiveSub = currentSub && ["ACTIVE", "TRIAL"].includes(currentSub.status);

    setSelectedPlan(plan);

    if (hasActiveSub) {
      // Use change endpoint
      setPaymentEndpoint("/api/employer/subscription/change");
      setPaymentBody({ planId: plan.id, billingCycle });
    } else {
      // Use subscribe endpoint
      setPaymentEndpoint("/api/employer/subscription");
      setPaymentBody({ planId: plan.id, billingCycle });
    }

    setPaymentDialogOpen(true);
  };

  const handleFreeSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const hasActiveSub = currentSub && ["ACTIVE", "TRIAL"].includes(currentSub.status);

      const endpoint = hasActiveSub
        ? "/api/employer/subscription/change"
        : "/api/employer/subscription";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to subscribe");
      }
      const data = await res.json();
      // Refresh subscription data
      const subRes = await fetch("/api/employer/subscription");
      if (subRes.ok) {
        const subData = await subRes.json();
        setCurrentSub(subData.subscription);
      }
      toast.success(data.message || "Successfully subscribed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setSubscribing(null);
    }
  };

  const handlePaymentSuccess = () => {
    // Refresh subscription data
    fetch("/api/employer/subscription")
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) setCurrentSub(data.subscription);
      })
      .catch(() => {});
  };

  const currentPlanSlug = currentSub?.plan?.slug;
  const yearlySavings = plans.map((p) => {
    if (p.priceYearly === 0) return 0;
    return p.priceMonthly * 12 - p.priceYearly;
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/dashboard/billing"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Choose the plan that fits your hiring needs.
        </p>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={`text-sm font-medium ${
            billingCycle === "MONTHLY" ? "text-gray-900" : "text-gray-400"
          }`}
        >
          Monthly
        </span>
        <button
          onClick={() =>
            setBillingCycle((prev) => (prev === "MONTHLY" ? "YEARLY" : "MONTHLY"))
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            billingCycle === "YEARLY" ? "bg-violet-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              billingCycle === "YEARLY" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium ${
            billingCycle === "YEARLY" ? "text-gray-900" : "text-gray-400"
          }`}
        >
          Yearly
        </span>
        {billingCycle === "YEARLY" && (
          <Badge className="bg-green-100 text-green-700 border-0 text-xs">
            Save up to 17%
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-20 mb-2" />
              <Skeleton className="h-8 w-32 mb-4" />
              <div className="space-y-2 mb-6">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan, index) => {
            const isCurrent = plan.slug === currentPlanSlug;
            const price =
              billingCycle === "MONTHLY" ? plan.priceMonthly : plan.priceYearly;
            const savings = yearlySavings[index];
            const IconComponent = getPlanIcon(plan.slug);
            const isHighlighted = plan.slug === "pro";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  isHighlighted
                    ? "border-2 border-violet-500 shadow-lg shadow-violet-100"
                    : ""
                } ${isCurrent ? "ring-2 ring-violet-400" : ""}`}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 text-white border-0">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-lg p-2 ${
                        isHighlighted
                          ? "bg-violet-100"
                          : isCurrent
                          ? "bg-violet-50"
                          : "bg-gray-100"
                      }`}
                    >
                      <IconComponent
                        className={`h-5 w-5 ${
                          isHighlighted ? "text-violet-600" : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatKES(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-sm text-gray-500">
                          /{billingCycle === "YEARLY" ? "year" : "mo"}
                        </span>
                      )}
                    </div>
                    {billingCycle === "YEARLY" && savings > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        Save KES {savings.toLocaleString("en-KE")} per year
                      </p>
                    )}
                  </div>

                  {/* Limits Preview */}
                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    <p>
                      <span className="font-medium">Listings:</span>{" "}
                      {getDisplayLimit(plan.maxListings)}
                    </p>
                    <p>
                      <span className="font-medium">Featured:</span>{" "}
                      {getDisplayLimit(plan.maxFeatured)}/mo
                    </p>
                    <p>
                      <span className="font-medium">Team:</span>{" "}
                      {getDisplayLimit(plan.maxTeamMembers)}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {isCurrent ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        isHighlighted
                          ? "bg-violet-600 hover:bg-violet-700 text-white"
                          : "bg-gray-900 hover:bg-gray-800 text-white"
                      }`}
                      onClick={() => handlePlanClick(plan)}
                      disabled={subscribing === plan.id}
                    >
                      {subscribing === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : price === 0 ? (
                        "Get Started Free"
                      ) : (
                        "Subscribe"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Features Comparison Table */}
      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-gray-600">
                      Feature
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.id}
                        className={`text-center py-3 px-3 font-medium ${
                          plan.slug === currentPlanSlug ? "text-violet-600" : "text-gray-600"
                        }`}
                      >
                        <div>{plan.name}</div>
                        {plan.slug === currentPlanSlug && (
                          <span className="text-[10px] text-violet-400">Current</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Active Listings",
                      key: "maxListings",
                    },
                    {
                      label: "Featured / Month",
                      key: "maxFeatured",
                    },
                    {
                      label: "CV Searches / Month",
                      key: "maxCvSearches",
                    },
                    {
                      label: "Team Members",
                      key: "maxTeamMembers",
                    },
                    {
                      label: "Messages / Day",
                      key: "maxMessagesPerDay",
                    },
                  ].map((row) => (
                    <tr key={row.key} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-gray-700">{row.label}</td>
                      {plans.map((plan) => {
                        const val = plan[row.key as keyof PlanData] as number;
                        const isHighlight = plan.slug === "pro";
                        return (
                          <td
                            key={plan.id}
                            className={`text-center py-3 px-3 ${
                              isHighlight ? "font-semibold text-violet-600" : "text-gray-600"
                            }`}
                          >
                            {getDisplayLimit(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* M-Pesa Payment Dialog */}
      <MpesaPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        itemType="SUBSCRIPTION"
        itemName={
          selectedPlan
            ? `${selectedPlan.name} Plan - ${billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}`
            : ""
        }
        amount={
          selectedPlan
            ? billingCycle === "MONTHLY"
              ? selectedPlan.priceMonthly
              : selectedPlan.priceYearly
            : 0
        }
        apiEndpoint={paymentEndpoint}
        body={paymentBody}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
