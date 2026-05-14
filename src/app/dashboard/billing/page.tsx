"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CreditCard,
  Coins,
  FileText,
  Star,
  Users,
  ArrowRight,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubscriptionData {
  id: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  plan: {
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
  };
}

interface CreditsData {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  transactions: {
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  }[];
}

interface UsageData {
  activeListings: number;
  featuredListings: number;
  teamMembers: number;
}

function formatKES(amount: number): string {
  if (amount === 0) return "Free";
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function getDisplayLimit(value: number): string {
  return value === -1 ? "∞" : String(value);
}

function getStatusConfig(status: string) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Active",
        icon: CheckCircle2,
        color: "text-green-700",
        bg: "bg-green-100",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        icon: XCircle,
        color: "text-orange-700",
        bg: "bg-orange-100",
      };
    case "TRIAL":
      return {
        label: "Trial",
        icon: Clock,
        color: "text-blue-700",
        bg: "bg-blue-100",
      };
    case "EXPIRED":
      return {
        label: "Expired",
        icon: AlertCircle,
        color: "text-red-700",
        bg: "bg-red-100",
      };
    default:
      return {
        label: status,
        icon: AlertCircle,
        color: "text-gray-700",
        bg: "bg-gray-100",
      };
  }
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [subRes, creditsRes, usageRes] = await Promise.all([
          fetch("/api/employer/subscription"),
          fetch("/api/employer/credits"),
          fetch("/api/employer/usage"),
        ]);

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData.subscription);
        }
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          setCredits(creditsData);
        }
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsage({
            activeListings: usageData.activeListings || 0,
            featuredListings: usageData.featuredListings || 0,
            teamMembers: usageData.teamMembers || 0,
          });
        }
      } catch {
        toast.error("Failed to load billing data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/employer/subscription/cancel", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to cancel");
      }
      const data = await res.json();
      setSubscription(data.subscription);
      setCancelOpen(false);
      toast.success(data.message || "Subscription cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const plan = subscription?.plan;
  const statusConfig = subscription ? getStatusConfig(subscription.status) : null;
  const maxListings = plan?.maxListings ?? 3;
  const maxFeatured = plan?.maxFeatured ?? 0;
  const maxTeam = plan?.maxTeamMembers ?? 1;
  const isUnlimitedListings = maxListings === -1;
  const isUnlimitedFeatured = maxFeatured === -1;
  const isUnlimitedTeam = maxTeam === -1;

  const listingsPercent = isUnlimitedListings ? 0 : Math.min(((usage?.activeListings ?? 0) / maxListings) * 100, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your subscription plan, credits, and billing information.
        </p>
      </div>

      {/* Current Subscription & Credits Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Subscription Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-violet-600" />
                Current Plan
              </CardTitle>
              {subscription && statusConfig && (
                <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                  <statusConfig.icon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            ) : subscription && plan ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-violet-600">
                    {formatKES(
                      subscription.billingCycle === "YEARLY"
                        ? plan.priceYearly
                        : plan.priceMonthly
                    )}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="text-sm text-gray-500">
                      /{subscription.billingCycle === "YEARLY" ? "year" : "month"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Period Start</p>
                    <p className="font-medium">
                      {format(new Date(subscription.currentPeriodStart), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Period End</p>
                    <p className="font-medium">
                      {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                {subscription.status === "CANCELLED" && subscription.cancelledAt && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      Access continues until{" "}
                      {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link href="/dashboard/billing/plans">
                    <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                      <Zap className="mr-2 h-4 w-4" />
                      View Plans
                    </Button>
                  </Link>
                  {subscription.status === "ACTIVE" && plan.slug !== "free" && (
                    <Button variant="outline" onClick={() => setCancelOpen(true)}>
                      Cancel Plan
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No subscription found</p>
                <Link href="/dashboard/billing/plans">
                  <Button className="mt-3 bg-violet-600 hover:bg-violet-700 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credits Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              Job Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-24" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
                <Skeleton className="h-8 w-40" />
              </div>
            ) : credits ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {credits.balance}
                  </span>
                  <span className="text-gray-500">credits available</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600">Purchased</p>
                    <p className="text-lg font-bold text-green-700">{credits.totalPurchased}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-red-600">Used</p>
                    <p className="text-lg font-bold text-red-700">{credits.totalUsed}</p>
                  </div>
                </div>
                {credits.transactions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recent Activity
                    </p>
                    {credits.transactions.slice(0, 3).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              tx.amount > 0 ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-gray-700 truncate max-w-[200px]">
                            {tx.description}
                          </span>
                        </div>
                        <span
                          className={`font-medium shrink-0 ${
                            tx.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/dashboard/billing/credits">
                  <Button variant="outline" className="w-full">
                    <Coins className="mr-2 h-4 w-4" />
                    Buy Credits
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <Coins className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">Unable to load credits</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-600" />
            Usage Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : plan ? (
            <div className="space-y-5">
              {/* Active Listings */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Active Listings</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {usage?.activeListings ?? 0} / {getDisplayLimit(maxListings)}
                  </span>
                </div>
                {!isUnlimitedListings && (
                  <div className="space-y-1">
                    <Progress
                      value={listingsPercent}
                      className="h-2"
                    />
                    {listingsPercent >= 90 && (
                      <p className="text-xs text-orange-600">
                        {listingsPercent >= 100
                          ? "Listing limit reached! Upgrade for more."
                          : "Approaching listing limit."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Featured Listings */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Featured Listings / Month</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {usage?.featuredListings ?? 0} / {getDisplayLimit(maxFeatured)}
                  </span>
                </div>
                {!isUnlimitedFeatured && maxFeatured > 0 && (
                  <Progress value={Math.min(((usage?.featuredListings ?? 0) / maxFeatured) * 100, 100)} className="h-2" />
                )}
                {maxFeatured === 0 && (
                  <p className="text-xs text-gray-400">
                    Not available on Free plan. Upgrade to feature your listings.
                  </p>
                )}
              </div>

              {/* Team Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">Team Members</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {usage?.teamMembers ?? 0} / {getDisplayLimit(maxTeam)}
                  </span>
                </div>
                {!isUnlimitedTeam && (
                  <Progress
                    value={Math.min(((usage?.teamMembers ?? 0) / maxTeam) * 100, 100)}
                    className="h-2"
                  />
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Subscribe to a plan to see your usage.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/billing/plans">
          <Card className="hover:border-violet-300 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl p-3 bg-violet-100">
                <Zap className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Upgrade Plan</p>
                <p className="text-xs text-gray-500">Get more features &amp; limits</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/billing/credits">
          <Card className="hover:border-amber-300 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl p-3 bg-amber-100">
                <Coins className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Buy Credits</p>
                <p className="text-xs text-gray-500">Purchase job posting credits</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/billing/history">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl p-3 bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Billing History</p>
                <p className="text-xs text-gray-500">View past invoices</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your {plan?.name || ""} plan? You will
              retain access to all features until your current billing period ends
              on{" "}
              {subscription
                ? format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy")
                : ""}.
              After that, your account will revert to the Free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
