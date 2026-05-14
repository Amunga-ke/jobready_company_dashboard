"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Coins,
  Loader2,
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

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentRef: string | null;
  itemType: string;
  itemId: string | null;
  description: string;
  paidAt: string | null;
  createdAt: string;
  planName: string | null;
}

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "PENDING":
      return {
        label: "Pending",
        color: "text-yellow-700",
        bg: "bg-yellow-100",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        color: "text-green-700",
        bg: "bg-green-100",
      };
    case "FAILED":
      return {
        label: "Failed",
        color: "text-red-700",
        bg: "bg-red-100",
      };
    case "REFUNDED":
      return {
        label: "Refunded",
        color: "text-blue-700",
        bg: "bg-blue-100",
      };
    default:
      return {
        label: status,
        color: "text-gray-700",
        bg: "bg-gray-100",
      };
  }
}

function getItemIcon(itemType: string) {
  switch (itemType) {
    case "SUBSCRIPTION":
      return <CreditCard className="h-4 w-4 text-violet-500" />;
    case "CREDITS":
      return <Coins className="h-4 w-4 text-amber-500" />;
    default:
      return <Receipt className="h-4 w-4 text-gray-500" />;
  }
}

export default function BillingHistoryPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/payments?page=${pageNum}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      const data = await res.json();
      setPayments(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load billing history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(page);
  }, [page]);

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
          <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          View all your past payments and invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-violet-600" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : payments.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const statusConfig = getStatusConfig(payment.status);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                            {format(
                              new Date(payment.paidAt || payment.createdAt),
                              "MMM d, yyyy"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getItemIcon(payment.itemType)}
                              <span className="text-sm text-gray-700">
                                {payment.description}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-gray-900 whitespace-nowrap">
                            {formatKES(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs whitespace-nowrap`}
                            >
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                            {payment.paymentMethod}
                          </TableCell>
                          <TableCell className="text-sm text-gray-400 font-mono text-xs whitespace-nowrap">
                            {payment.paymentRef || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No payment history yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Payments will appear here after you subscribe or purchase credits.
              </p>
              <Link href="/dashboard/billing/plans">
                <Button className="mt-4 bg-violet-600 hover:bg-violet-700 text-white">
                  View Plans
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
