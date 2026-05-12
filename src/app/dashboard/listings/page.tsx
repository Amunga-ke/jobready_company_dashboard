"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Pause,
  Play,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { LISTING_STATUSES } from "@/types";

interface Listing {
  id: string;
  title: string;
  category: string;
  status: string;
  applicationCount: number;
  views: number;
  createdAt: string;
}

interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_TABS = ["ALL", "ACTIVE", "DRAFT", "PAUSED", "CLOSED"];

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "10");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/employer/listings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: ListingsResponse = await res.json();
      setListings(data.listings);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/employer/listings/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Listing deleted");
      setDeleteId(null);
      fetchListings();
    } catch {
      toast.error("Failed to delete listing");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/employer/listings/${id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate");
      const data = await res.json();
      toast.success("Listing duplicated");
      router.push(`/dashboard/listings/${data.id}/edit`);
    } catch {
      toast.error("Failed to duplicate listing");
    }
  };

  const handleTogglePause = async (listing: Listing) => {
    const newStatus = listing.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    try {
      const res = await fetch(`/api/employer/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Listing ${newStatus === "PAUSED" ? "paused" : "resumed"}`);
      fetchListings();
    } catch {
      toast.error("Failed to update listing status");
    }
  };

  const getStatusBadge = (status: string) => {
    const s = LISTING_STATUSES.find((st) => st.value === status);
    if (!s) return <Badge variant="outline">{status}</Badge>;
    return (
      <Badge variant="outline" className={`${s.bgColor} ${s.color} border-0`}>
        {s.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your job postings. ({total} total)
          </p>
        </div>
        <Link href="/dashboard/listings/new">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatusFilter(tab); setPage(1); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusFilter === tab
                ? "bg-white text-violet-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">No listings found</p>
              <Link href="/dashboard/listings/new">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Post New Job
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Title</TableHead>
                    <TableHead className="min-w-[120px]">Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="min-w-[100px]">Created</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/listings/${listing.id}/edit`}
                          className="text-sm font-medium text-violet-600 hover:underline"
                        >
                          {listing.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {listing.category}
                      </TableCell>
                      <TableCell>{getStatusBadge(listing.status)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {listing.applicationCount}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {listing.views}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(listing.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/listings/${listing.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(listing.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            {(listing.status === "ACTIVE" || listing.status === "PAUSED") && (
                              <DropdownMenuItem onClick={() => handleTogglePause(listing)}>
                                {listing.status === "PAUSED" ? (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Resume
                                  </>
                                ) : (
                                  <>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pause
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(listing.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be
              undone and all associated applications will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
