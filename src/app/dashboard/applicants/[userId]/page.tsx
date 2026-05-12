"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  Mail,
  Phone,
  MapPin,
  FileText,
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
import { APPLICATION_STATUSES } from "@/types";

interface ApplicantData {
  userId: string;
  name: string;
  email: string;
  phone: string;
  county: string;
  bio: string;
  cvUrl: string | null;
  applications: {
    id: string;
    listingTitle: string;
    listingId: string;
    status: string;
    score: number | null;
    appliedAt: string;
  }[];
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

function getScoreBadge(score: number | null) {
  if (score === null || score === undefined) {
    return <span className="text-gray-400">—</span>;
  }
  let color = "text-red-700 bg-red-100";
  if (score >= 8) color = "text-green-700 bg-green-100";
  else if (score >= 6) color = "text-emerald-700 bg-emerald-100";
  else if (score >= 4) color = "text-amber-700 bg-amber-100";
  return (
    <Badge variant="outline" className={`${color} border-0 font-semibold`}>
      {score}/10
    </Badge>
  );
}

export default function ApplicantProfilePage() {
  const [data, setData] = useState<ApplicantData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const userId = pathParts[pathParts.length - 1];

    async function fetchApplicant() {
      try {
        const res = await fetch(`/api/employer/applicants/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        toast.error("Failed to load applicant profile");
      } finally {
        setLoading(false);
      }
    }
    fetchApplicant();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/applications">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Button>
        </Link>
        <p className="text-gray-500">Applicant not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/applications">
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Applications
        </Button>
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-violet-100 text-violet-700 text-2xl font-bold">
                {getInitials(data.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 justify-center sm:justify-start">
                {data.email && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 justify-center sm:justify-start">
                    <Mail className="h-4 w-4" />
                    {data.email}
                  </div>
                )}
                {data.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 justify-center sm:justify-start">
                    <Phone className="h-4 w-4" />
                    {data.phone}
                  </div>
                )}
                {data.county && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 justify-center sm:justify-start">
                    <MapPin className="h-4 w-4" />
                    {data.county}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      {data.bio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {data.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* CV */}
      {data.cvUrl && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 p-3">
                  <FileText className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Resume / CV</p>
                  <p className="text-xs text-gray-500">Download the applicant&apos;s CV</p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <a href={data.cvUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Applications ({data.applications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.applications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No applications from this candidate
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/listings/${app.listingId}/edit`}
                          className="text-sm font-medium text-violet-600 hover:underline"
                        >
                          {app.listingTitle}
                        </Link>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>{getScoreBadge(app.score)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(app.appliedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/applications/${app.id}`}>
                          <Button variant="ghost" size="sm" className="text-violet-600">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
