"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  GripVertical,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APPLICATION_STATUSES } from "@/types";

interface PipelineApplication {
  id: string;
  applicantName: string;
  applicantUserId: string;
  listingTitle: string;
  listingId: string;
  status: string;
  score: number | null;
  coverLetter: string;
  appliedAt: string;
}

interface EmployerListing {
  id: string;
  title: string;
}

interface PipelineData {
  applications: PipelineApplication[];
  listings: EmployerListing[];
}

const COLUMN_CONFIGS = [
  { status: "PENDING", label: "Pending", bg: "bg-amber-100", dot: "bg-amber-500", headerBg: "bg-amber-50" },
  { status: "SCREENING", label: "Screening", bg: "bg-blue-100", dot: "bg-blue-500", headerBg: "bg-blue-50" },
  { status: "INTERVIEW", label: "Interview", bg: "bg-purple-100", dot: "bg-purple-500", headerBg: "bg-purple-50" },
  { status: "SHORTLISTED", label: "Shortlisted", bg: "bg-green-100", dot: "bg-green-500", headerBg: "bg-green-50" },
  { status: "OFFERED", label: "Offered", bg: "bg-emerald-100", dot: "bg-emerald-500", headerBg: "bg-emerald-50" },
  { status: "REJECTED", label: "Rejected", bg: "bg-gray-100", dot: "bg-gray-400", headerBg: "bg-gray-50" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getScoreBadge(score: number | null) {
  if (score === null || score === undefined) return null;
  let color = "text-red-700 bg-red-100";
  if (score >= 8) color = "text-green-700 bg-green-100";
  else if (score >= 6) color = "text-emerald-700 bg-emerald-100";
  else if (score >= 4) color = "text-amber-700 bg-amber-100";
  return (
    <Badge variant="outline" className={`${color} border-0 text-[10px] font-semibold`}>
      {score}/10
    </Badge>
  );
}

export default function PipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState("ALL");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<PipelineApplication | null>(null);
  const dragItemRef = useRef<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (listingFilter !== "ALL") params.set("listingId", listingFilter);
      const res = await fetch(`/api/employer/pipeline?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      // API returns { PENDING: [...], SCREENING: [...], INTERVIEW: [...], ... }
      // Transform to flat applications array + extract unique listings
      const allApps: PipelineApplication[] = [];
      const listingMap = new Map<string, EmployerListing>();
      for (const [status, apps] of Object.entries(json)) {
        if (Array.isArray(apps)) {
          for (const app of apps) {
            allApps.push({
              id: app.id,
              applicantName: app.applicantName || app.applicantEmail || "Unknown",
              applicantUserId: app.applicantUserId,
              listingTitle: app.listingTitle || "",
              listingId: app.listingId,
              status: app.status || status,
              score: app.score,
              coverLetter: app.coverLetter,
              appliedAt: app.appliedAt,
            });
            if (app.listingId && !listingMap.has(app.listingId)) {
              listingMap.set(app.listingId, { id: app.listingId, title: app.listingTitle });
            }
          }
        }
      }
      setData({ applications: allApps, listings: Array.from(listingMap.values()) });
    } catch {
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [listingFilter]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleDragStart = (e: React.DragEvent, appId: string) => {
    dragItemRef.current = appId;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(status);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const appId = dragItemRef.current;
    if (!appId) return;

    try {
      const res = await fetch(`/api/employer/pipeline/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Status updated");
      fetchPipeline();
    } catch {
      toast.error("Failed to update status");
    }
    dragItemRef.current = null;
  };

  const handleDialogStatusChange = async (appId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/employer/pipeline/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Status updated");
      setSelectedApp(null);
      fetchPipeline();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const getApplicationsForStatus = (status: string) => {
    if (!data) return [];
    return data.applications.filter((app) => app.status === status);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            Drag and drop to update application status.
          </p>
        </div>
        {data?.listings && data.listings.length > 0 && (
          <Select value={listingFilter} onValueChange={setListingFilter}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="All Listings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Listings</SelectItem>
              {data.listings.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {COLUMN_CONFIGS.map((col) => (
            <div key={col.status} className="space-y-3">
              <Skeleton className="h-8 w-full rounded-lg" />
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
          {COLUMN_CONFIGS.map((col) => {
            const apps = getApplicationsForStatus(col.status);
            const isDragOver = dragOverCol === col.status;
            return (
              <div
                key={col.status}
                className={`min-w-[280px] w-[280px] shrink-0 snap-start rounded-xl p-3 transition-all ${
                  col.bg
                } ${isDragOver ? "ring-2 ring-violet-500 ring-offset-2" : ""}`}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between mb-3 px-2 py-1.5 rounded-lg ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-white/80 text-gray-600">
                    {apps.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[100px]">
                  {apps.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                      <p className="text-xs">No applications</p>
                    </div>
                  ) : (
                    apps.map((app) => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => setSelectedApp(app)}
                        className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <Link
                                href={`/dashboard/applicants/${app.applicantUserId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm font-medium text-violet-600 hover:underline truncate"
                              >
                                {app.applicantName}
                              </Link>
                              {getScoreBadge(app.score)}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {app.listingTitle}
                            </p>
                            {app.coverLetter && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {app.coverLetter.slice(0, 80)}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1.5">
                              {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-violet-100 text-violet-700 text-sm font-bold">
                  {selectedApp ? getInitials(selectedApp.applicantName) : ""}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-semibold">
                  {selectedApp?.applicantName}
                </p>
                <p className="text-sm text-gray-500 font-normal">
                  {selectedApp?.listingTitle}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Status</p>
                  <p className="font-medium">{selectedApp.status}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Score</p>
                  <p className="font-medium">{selectedApp.score ?? "N/A"}/10</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Applied</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(selectedApp.appliedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {selectedApp.coverLetter && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Cover Letter</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                    {selectedApp.coverLetter}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Change Status</p>
                <Select
                  value={selectedApp.status}
                  onValueChange={(v) => handleDialogStatusChange(selectedApp.id, v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/applications/${selectedApp.id}`}>
                    View Details
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/applicants/${selectedApp.applicantUserId}`}>
                    View Profile
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
