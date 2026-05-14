"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Coins,
  Plus,
  Loader2,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  Gift,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MpesaPaymentDialog from "@/components/mpesa-payment-dialog";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

interface CreditsData {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  transactions: Transaction[];
}

const CREDIT_PACKAGES = [
  { id: 0, credits: 5, price: 499, popular: false, label: "Starter" },
  { id: 1, credits: 15, price: 1299, popular: false, label: "Basic" },
  { id: 2, credits: 30, price: 2499, popular: true, label: "Pro Pack" },
  { id: 3, credits: 100, price: 7499, popular: false, label: "Enterprise" },
];

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function getTypeConfig(type: string) {
  switch (type) {
    case "PURCHASE":
      return {
        label: "Purchase",
        icon: Plus,
        color: "text-green-600",
        bg: "bg-green-100",
        ArrowIcon: ArrowDown,
      };
    case "USAGE":
      return {
        label: "Used",
        icon: ArrowDown,
        color: "text-red-600",
        bg: "bg-red-100",
        ArrowIcon: ArrowUp,
      };
    case "REFUND":
      return {
        label: "Refund",
        icon: CheckCircle2,
        color: "text-blue-600",
        bg: "bg-blue-100",
        ArrowIcon: ArrowDown,
      };
    case "BONUS":
      return {
        label: "Bonus",
        icon: Gift,
        color: "text-amber-600",
        bg: "bg-amber-100",
        ArrowIcon: ArrowDown,
      };
    case "ADMIN_ADJUST":
      return {
        label: "Adjustment",
        icon: Settings,
        color: "text-gray-600",
        bg: "bg-gray-100",
        ArrowIcon: null,
      };
    default:
      return {
        label: type,
        icon: Coins,
        color: "text-gray-600",
        bg: "bg-gray-100",
        ArrowIcon: null,
      };
  }
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/employer/credits");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCredits(data);
    } catch {
      toast.error("Failed to load credits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const handlePurchase = (packageId: number) => {
    setSelectedPackage(packageId);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchCredits();
  };

  const pkg = selectedPackage !== null ? CREDIT_PACKAGES[selectedPackage] : null;

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
          <h1 className="text-2xl font-bold text-gray-900">Job Credits</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Purchase credits to post additional jobs beyond your plan limit.
        </p>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-violet-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-3 bg-violet-100">
                <Coins className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-violet-600 font-medium">Available Credits</p>
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-violet-700">
                    {credits?.balance ?? 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-3 bg-green-100">
                <Plus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Total Purchased</p>
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-green-700">
                    {credits?.totalPurchased ?? 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-3 bg-red-100">
                <ArrowDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium">Total Used</p>
                {loading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-red-700">
                    {credits?.totalUsed ?? 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Purchase Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_PACKAGES.map((cp) => (
              <Card
                key={cp.id}
                className={`relative cursor-pointer transition-all hover:shadow-md ${
                  cp.popular ? "border-2 border-amber-400" : "hover:border-violet-300"
                }`}
              >
                {cp.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white border-0 text-xs">
                      Best Value
                    </Badge>
                  </div>
                )}
                <CardContent className="p-5 text-center">
                  <div className="mb-3">
                    <Coins
                      className={`h-8 w-8 mx-auto ${
                        cp.popular ? "text-amber-500" : "text-violet-500"
                      }`}
                    />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {cp.credits}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">{cp.label}</p>
                  <div className="mb-4">
                    <span className="text-xl font-bold text-gray-900">
                      {formatKES(cp.price)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {(cp.price / cp.credits).toFixed(0)} KES per credit
                    </p>
                  </div>
                  <Button
                    className={`w-full ${
                      cp.popular
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "bg-violet-600 hover:bg-violet-700 text-white"
                    }`}
                    onClick={() => handlePurchase(cp.id)}
                  >
                    Purchase
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : credits?.transactions.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.transactions.map((tx) => {
                    const typeConfig = getTypeConfig(tx.type);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(tx.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${typeConfig.bg} ${typeConfig.color} border-0 text-xs`}
                          >
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 max-w-[250px] truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-medium ${
                            tx.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount}
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-600">
                          {tx.balanceAfter}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Coins className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Purchase credits to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* M-Pesa Payment Dialog */}
      <MpesaPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        itemType="CREDITS"
        itemName={pkg ? `${pkg.credits} Job Credits` : ""}
        amount={pkg?.price ?? 0}
        apiEndpoint="/api/employer/credits/purchase"
        body={selectedPackage !== null ? { packageId: selectedPackage } : {}}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
