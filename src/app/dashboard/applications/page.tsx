"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPLICATION_STATUSES } from "@/types";

interface Application {
  id: string;
  applicantName: string;
  applicantUserId: string;
  listingTitle: string;
  listingId: string;
  status: string;
  score: number | null;
  appliedAt: string;
}

interface EmployerListing {
  id: string;
  title: string;
}

interface ApplicationsResponse {
  applications: Application[];
  total: number;
  page: number;
  totalPages: number;
}

function getScoreBadge(score: number | null) {
  if (score === null || score === undefined) {
    return <span className="text-gray-400">—</span>;
  }
  let color = "text-red-700 bg-red-100";
  if (score >= 8) color = "text-green-700 bg-green-100";
  else if (score >= 6) color = "text-emerald-700 bg-emerald-100";
  else if (score >= 4) color = "text-amber-700 bg-amber-100";
  else if (score >= 2) color = "text-orange-700 bg-orange-100";
  return (
    <Badge variant="outline" className={`${color} border-0 font-semibold`}>
      {score}/10
    </Badge>
  );
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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [listings, setListings] = useState<EmployerListing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [listingFilter, setListingFilter] = useState("ALL");
  const [scoreFilter, setScoreFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"score" | "appliedAt">("appliedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (listingFilter !== "ALL") params.set("listingId", listingFilter);
      if (scoreFilter !== "ALL") params.set("scoreFilter", scoreFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      const res = await fetch(`/api/employer/applications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ApplicationsResponse = await res.json();
      setApplications(data.applications);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, listingFilter, scoreFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await fetch("/api/employer/listings?limit=100&status=ACTIVE");
        if (!res.ok) return;
        const data = await res.json();
        setListings(data.listings || []);
      } catch {
        // ignore
      }
    }
    fetchListings();
  }, []);

  const toggleSort = (field: "score" | "appliedAt") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const allSelected = applications.length > 0 && applications.every((a) => selectedIds.has(a.id));
  const someSelected = applications.some((a) => selectedIds.has(a.id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch("/api/employer/applications/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${selectedIds.size} application(s) updated`);
      setSelectedIds(new Set());
      fetchApplications();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Reset page on filter change
  const handleStatusFilterChange = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleListingFilterChange = (v: string) => { setListingFilter(v); setPage(1); };
  const handleScoreFilterChange = (v: string) => { setScoreFilter(v); setPage(1); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and manage job applications. ({total} total)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {APPLICATION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={listingFilter} onValueChange={handleListingFilterChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Listings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Listings</SelectItem>
            {listings.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={scoreFilter} onValueChange={handleScoreFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Scores</SelectItem>
            <SelectItem value="RATED">Rated</SelectItem>
            <SelectItem value="UNRATED">Unrated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allSelected}
                        ref={(el: HTMLButtonElement | null) => {
                          if (el) (el as unknown as { indeterminate: boolean }).indeterminate = someSelected;
                        }}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Listing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("score")}
                    >
                      <div className="flex items-center gap-1">
                        Score
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("appliedAt")}
                    >
                      <div className="flex items-center gap-1">
                        Applied Date
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow
                      key={app.id}
                      className={selectedIds.has(app.id) ? "bg-violet-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(app.id)}
                          onCheckedChange={() => toggleOne(app.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/applicants/${app.applicantUserId}`}
                          className="text-sm font-medium text-violet-600 hover:underline"
                        >
                          {app.applicantName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                        {app.listingTitle}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>{getScoreBadge(app.score)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(app.appliedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/applications/${app.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
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

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-gray-400">...</span>
                    )}
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className={p === page ? "bg-violet-600 text-white hover:bg-violet-700" : ""}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {APPLICATION_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => handleBulkStatusChange(s.value)}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-300 hover:text-white"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="mr-1 h-4 w-4" />
            Deselect All
          </Button>
        </div>
      )}
    </div>
  );
}
