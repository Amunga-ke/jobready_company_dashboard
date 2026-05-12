"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import {
  Plus,
  Clock,
  AlertTriangle,
  CalendarClock,
  FileText,
  CheckCircle,
  AlertCircle,
  MinusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
import { LISTING_STATUSES } from "@/types";

interface DeadlineItem {
  id: string;
  listingId: string;
  listingTitle: string;
  deadline: string | null;
  status: string;
  applicationCount: number;
}

interface DeadlinesResponse {
  onTrack: number;
  approaching: number;
  overdue: number;
  noDeadline: number;
  items: DeadlineItem[];
}

function getDaysInfo(deadline: string | null) {
  if (!deadline) return { days: null, label: "No deadline", color: "text-gray-500", bg: "bg-gray-100" };
  const today = new Date();
  const dl = new Date(deadline);
  const days = differenceInDays(dl, today);
  if (days < 0) return { days, label: `${Math.abs(days)}d overdue`, color: "text-red-700", bg: "bg-red-100" };
  if (days === 0) return { days, label: "Due today", color: "text-amber-700", bg: "bg-amber-100" };
  if (days <= 7) return { days, label: `${days}d left`, color: "text-amber-700", bg: "bg-amber-100" };
  return { days, label: `${days}d left`, color: "text-green-700", bg: "bg-green-100" };
}

function getStatusBadge(status: string) {
  const s = LISTING_STATUSES.find((st) => st.value === status);
  if (!s) return <Badge variant="outline">{status}</Badge>;
  return (
    <Badge variant="outline" className={`${s.bgColor} ${s.color} border-0`}>
      {s.label}
    </Badge>
  );
}

export default function DeadlinesPage() {
  const [data, setData] = useState<DeadlinesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeadlines() {
      try {
        const res = await fetch("/api/employer/deadlines");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        toast.error("Failed to load deadlines");
      } finally {
        setLoading(false);
      }
    }
    fetchDeadlines();
  }, []);

  const summaryCards = [
    {
      label: "On Track",
      value: data?.onTrack ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      iconBg: "bg-green-100",
    },
    {
      label: "Approaching (<7d)",
      value: data?.approaching ?? 0,
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
    },
    {
      label: "Overdue",
      value: data?.overdue ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      iconBg: "bg-red-100",
    },
    {
      label: "No Deadline",
      value: data?.noDeadline ?? 0,
      icon: MinusCircle,
      color: "text-gray-500",
      bg: "bg-gray-50",
      iconBg: "bg-gray-100",
    },
  ];

  const hasAlert = (data?.overdue ?? 0) > 0 || (data?.approaching ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deadline Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor application deadlines for your listings.
          </p>
        </div>
        <Link href="/dashboard/listings/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className={card.bg}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-12 mt-1" />
                  ) : (
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                      {card.value}
                    </p>
                  )}
                </div>
                <div className={`rounded-xl p-3 ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert Banner */}
      {!loading && hasAlert && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Attention needed
            </p>
            <p className="text-sm text-amber-700">
              {data!.overdue > 0 &&
                `${data!.overdue} listing${data!.overdue > 1 ? "s" : ""} overdue. `}
              {data!.approaching > 0 &&
                `${data!.approaching} listing${data!.approaching > 1 ? "s" : ""} approaching deadline.`}
            </p>
          </div>
        </div>
      )}

      {/* Deadline Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : data?.items.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Days Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => {
                    const daysInfo = getDaysInfo(item.deadline);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <span className="text-sm font-medium text-gray-900">
                            {item.listingTitle}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {item.deadline
                            ? format(new Date(item.deadline), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${daysInfo.bg} ${daysInfo.color} border-0`}
                          >
                            {daysInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {item.applicationCount}
                        </TableCell>
                        <TableCell>
                          <Link href={`/dashboard/listings/${item.listingId}/edit`}>
                            <Button variant="ghost" size="sm" className="text-violet-600">
                              Edit
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <CalendarClock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">No deadline data available</p>
              <Link href="/dashboard/listings/new">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Post New Job
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
