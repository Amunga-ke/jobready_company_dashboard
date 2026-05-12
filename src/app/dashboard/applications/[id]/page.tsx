"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  Star,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES } from "@/types";

interface ApplicationData {
  id: string;
  applicantName: string;
  applicantUserId: string;
  applicantEmail: string;
  applicantPhone: string;
  coverLetter: string;
  cvUrl: string | null;
  status: string;
  score: number | null;
  notes: string;
  appliedAt: string;
  listingTitle: string;
  listingId: string;
}

const STATUS_PIPELINE = [
  "PENDING",
  "SCREENING",
  "INTERVIEW",
  "SHORTLISTED",
  "OFFERED",
  "REJECTED",
];

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

export default function ApplicationDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    // Extract application ID from URL
    const pathParts = window.location.pathname.split("/");
    const appId = pathParts[pathParts.length - 1];

    async function fetchApplication() {
      try {
        const res = await fetch(`/api/employer/applications/${appId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
        setNotes(json.notes || "");
      } catch {
        toast.error("Failed to load application");
        router.push("/dashboard/applications");
      } finally {
        setLoading(false);
      }
    }
    fetchApplication();
  }, [router]);

  const handleStatusChange = async (newStatus: string) => {
    if (!data) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/employer/applications/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      setData({ ...data, status: newStatus });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleScoreChange = async (score: number) => {
    if (!data) return;
    try {
      const res = await fetch(`/api/employer/applications/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      if (!res.ok) throw new Error("Failed");
      setData({ ...data, score });
    } catch {
      toast.error("Failed to update score");
    }
  };

  const handleSaveNotes = async () => {
    if (!data) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/employer/applications/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const currentStatusIndex = data
    ? STATUS_PIPELINE.indexOf(data.status)
    : -1;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                <Skeleton className="h-6 w-40 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          </div>
          <div className="space-y-6">
            <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/applications">
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Applicant Card */}
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="h-20 w-20 mx-auto mb-3">
                <AvatarFallback className="bg-violet-100 text-violet-700 text-xl font-bold">
                  {getInitials(data.applicantName)}
                </AvatarFallback>
              </Avatar>
              <Link
                href={`/dashboard/applicants/${data.applicantUserId}`}
                className="text-lg font-semibold text-violet-600 hover:underline"
              >
                {data.applicantName}
              </Link>
              <p className="text-sm text-gray-500 mt-1">{data.applicantEmail}</p>
              {data.applicantPhone && (
                <p className="text-sm text-gray-500 mt-0.5">{data.applicantPhone}</p>
              )}
            </CardContent>
          </Card>

          {/* Cover Letter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              {data.coverLetter ? (
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {data.coverLetter}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">No cover letter provided</p>
              )}
            </CardContent>
          </Card>

          {/* CV */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Resume / CV</CardTitle>
            </CardHeader>
            <CardContent>
              {data.cvUrl ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href={data.cvUrl} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download CV
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-gray-400 italic">No CV uploaded</p>
              )}
            </CardContent>
          </Card>

          {/* Star Rating */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Rating: {data.score ?? "Not rated"}/10
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const filled = n <= (data.score || 0);
                  const hovered = n <= hoveredRating;
                  return (
                    <button
                      key={n}
                      onMouseEnter={() => setHoveredRating(n)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => handleScoreChange(n === data.score ? 0 : n)}
                      className="transition-colors"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          filled || hovered
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Pipeline */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Status Pipeline</CardTitle>
                <div className="flex items-center gap-2">
                  {savingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Select value={data.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[160px]">
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {STATUS_PIPELINE.map((status, idx) => {
                  const isActive = idx === currentStatusIndex;
                  const isPast = idx < currentStatusIndex;
                  const statusMeta = APPLICATION_STATUSES.find((s) => s.value === status);
                  return (
                    <div
                      key={status}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? `${statusMeta?.bgColor || "bg-gray-100"} ${statusMeta?.color || "text-gray-700"} ring-2 ring-violet-400`
                          : isPast
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isActive
                            ? "bg-violet-500"
                            : isPast
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      {statusMeta?.label || status}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this candidate..."
                rows={5}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={savingNotes}
                  onClick={handleSaveNotes}
                >
                  {savingNotes ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Application Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Application Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Applied Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(data.appliedAt), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Listing</p>
                  <Link
                    href={`/dashboard/listings/${data.listingId}/edit`}
                    className="text-sm font-medium text-violet-600 hover:underline"
                  >
                    {data.listingTitle}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Status</p>
                  {getStatusBadge(data.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Score</p>
                  <p className="text-sm font-medium text-gray-900">
                    {data.score ? `${data.score}/10` : "Not rated"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
