"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Eye,
  Users,
  FileText,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPLICATION_STATUSES, LISTING_STATUSES } from "@/types";

interface AnalyticsOverview {
  totalViews: number;
  totalApplications: number;
  activeListings: number;
  avgAppsPerListing: number;
}

interface FunnelItem {
  status: string;
  count: number;
}

interface TrendItem {
  date: string;
  count: number;
}

interface TopListing {
  id: string;
  title: string;
  views: number;
  applications: number;
  status: string;
}

interface RecentActivity {
  id: string;
  applicantName: string;
  listingTitle: string;
  appliedAt: string;
  status: string;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  funnel: FunnelItem[];
  trends30Day: TrendItem[];
  topListings: TopListing[];
  recentActivity: RecentActivity[];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const FUNNEL_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  PENDING: { bar: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
  SCREENING: { bar: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50" },
  INTERVIEW: { bar: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
  SHORTLISTED: { bar: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
  OFFERED: { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  REJECTED: { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/employer/analytics");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        // API returns: { overview, applicationFunnel, topListings, recentApplications, dailyTrends }
        // Map to frontend field names: { overview, funnel, trends30Day, topListings, recentActivity }
        const funnelArray = json.applicationFunnel
          ? Object.entries(json.applicationFunnel).map(([status, count]) => ({ status, count }))
          : json.funnel || [];
        setData({
          overview: json.overview || {},
          funnel: funnelArray,
          trends30Day: json.dailyTrends || json.trends30Day || [],
          topListings: (json.topListings || []).map((l: any) => ({
            id: l.id,
            title: l.title,
            views: l.viewCount ?? l.views ?? 0,
            applications: l._count?.applications ?? l.applications ?? 0,
            status: l.status,
          })),
          recentActivity: json.recentApplications || json.recentActivity || [],
        });
      } catch {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const overviewCards = [
    {
      label: "Total Views",
      value: data?.overview.totalViews ?? 0,
      icon: Eye,
      color: "text-blue-600",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
    },
    {
      label: "Total Applications",
      value: data?.overview.totalApplications ?? 0,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      iconBg: "bg-violet-100",
    },
    {
      label: "Active Listings",
      value: data?.overview.activeListings ?? 0,
      icon: FileText,
      color: "text-green-600",
      bg: "bg-green-50",
      iconBg: "bg-green-100",
    },
    {
      label: "Avg Apps/Listing",
      value: data?.overview.avgAppsPerListing ?? 0,
      icon: BarChart3,
      color: "text-amber-600",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
    },
  ];

  const maxFunnel = data?.funnel?.length
    ? Math.max(...data.funnel.map((f) => f.count), 1)
    : 1;

  const maxTrend = data?.trends30Day?.length
    ? Math.max(...data.trends30Day.map((t) => t.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your hiring performance and trends.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((stat) => (
          <Card key={stat.label} className={stat.bg}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                      {stat.value.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className={`rounded-xl p-3 ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Application Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-full rounded" />
                  </div>
                ))}
              </div>
            ) : data?.funnel?.length ? (
              <div className="space-y-3">
                {data.funnel.map((item) => {
                  const colors = FUNNEL_COLORS[item.status] || { bar: "bg-gray-400", text: "text-gray-700", bg: "bg-gray-50" };
                  const pct = Math.round((item.count / maxFunnel) * 100);
                  const statusLabel = APPLICATION_STATUSES.find((s) => s.value === item.status)?.label || item.status;
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${colors.text}`}>{statusLabel}</span>
                        <span className="text-xs text-gray-500">{item.count}</span>
                      </div>
                      <div className={`h-8 rounded-md ${colors.bg} overflow-hidden`}>
                        <div
                          className={`h-full rounded-md ${colors.bar} transition-all duration-500`}
                          style={{ width: `${pct}%`, minWidth: item.count > 0 ? "2rem" : "0" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* 30-Day Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">30-Day Application Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-end gap-1 h-48">
                {[...Array(30)].map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${Math.random() * 100}%` }} />
                ))}
              </div>
            ) : data?.trends30Day?.length ? (
              <div className="flex items-end gap-[2px] h-48">
                {data.trends30Day.map((trend, idx) => {
                  const pct = (trend.count / maxTrend) * 100;
                  return (
                    <div
                      key={idx}
                      className="group relative flex-1 flex flex-col items-center justify-end h-full"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {format(new Date(trend.date), "MMM d")}: {trend.count}
                      </div>
                      <div
                        className="w-full bg-violet-500 rounded-t hover:bg-violet-400 transition-colors cursor-pointer min-h-[2px]"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No trend data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Listings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top 5 Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data?.topListings?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Apps</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topListings.map((listing) => {
                    const ls = LISTING_STATUSES.find((s) => s.value === listing.status);
                    return (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/listings/${listing.id}/edit`}
                            className="text-sm font-medium text-violet-600 hover:underline"
                          >
                            {listing.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-sm">{listing.views}</TableCell>
                        <TableCell className="text-right text-sm">{listing.applications}</TableCell>
                        <TableCell className="text-right">
                          {ls && (
                            <Badge variant="outline" className={`${ls.bgColor} ${ls.color} border-0`}>
                              {ls.label}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No listings data</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : data?.recentActivity?.length ? (
              <div className="max-h-80 overflow-y-auto space-y-1">
                {data.recentActivity.slice(0, 15).map((activity) => {
                  const status = APPLICATION_STATUSES.find((s) => s.value === activity.status);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px] font-medium">
                          {getInitials(activity.applicantName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.applicantName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {activity.listingTitle}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400 mb-0.5">
                          {format(new Date(activity.appliedAt), "MMM d")}
                        </p>
                        {status && (
                          <Badge variant="outline" className={`${status.bgColor} ${status.color} border-0 text-[10px]`}>
                            {status.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
