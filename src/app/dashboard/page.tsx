"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Users,
  Eye,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { APPLICATION_STATUSES } from "@/types";

interface Stats {
  activeListings: number;
  totalApplications: number;
  profileViews: number;
  newToday: number;
}

interface RecentApplication {
  id: string;
  applicantName: string;
  listingTitle: string;
  appliedAt: string;
  status: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusBadge(status: string) {
  const s = APPLICATION_STATUSES.find((st) => st.value === status);
  if (!s) return <Badge variant="outline">{status}</Badge>;
  return (
    <Badge variant="outline" className={`${s.bgColor} ${s.color} border-0`}>
      {s.label}
    </Badge>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentApps, setRecentApps] = useState<RecentApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, appsRes] = await Promise.all([
          fetch("/api/employer/stats"),
          fetch("/api/employer/recent-applications"),
        ]);
        if (!statsRes.ok || !appsRes.ok) throw new Error("Failed to fetch");
        const statsData = await statsRes.json();
        const appsData = await appsRes.json();
        setStats(statsData);
        setRecentApps(appsData);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    {
      label: "Active Listings",
      value: stats?.activeListings ?? 0,
      icon: FileText,
      color: "text-green-600",
      bg: "bg-green-50",
      iconBg: "bg-green-100",
    },
    {
      label: "Total Applications",
      value: stats?.totalApplications ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
    },
    {
      label: "Profile Views",
      value: stats?.profileViews ?? 0,
      icon: Eye,
      color: "text-violet-600",
      bg: "bg-violet-50",
      iconBg: "bg-violet-100",
    },
    {
      label: "New Today",
      value: stats?.newToday ?? 0,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back! Here&apos;s an overview of your hiring activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className={stat.bg}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>
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

      {/* Recent Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">
            Recent Applications
          </CardTitle>
          <Link href="/dashboard/applications">
            <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700">
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Users className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm">No applications yet</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="divide-y">
                {recentApps.map((app) => (
                  <Link
                    key={app.id}
                    href={`/dashboard/applications/${app.id}`}
                    className="flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-medium">
                        {getInitials(app.applicantName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {app.applicantName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {app.listingTitle}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 mb-1">
                        {format(new Date(app.appliedAt), "MMM d, yyyy")}
                      </p>
                      {getStatusBadge(app.status)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
