"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  FileText,
  User,
  MapPin,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  Lock,
  ArrowRight,
  ExternalLink,
  Briefcase,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { EXPERIENCE_LEVELS } from "@/types";

// ─── Types ───

interface CVSearchUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  county: string | null;
  bio: string | null;
  cvUrl: string | null;
  avatarUrl: string | null;
  createdAt: string;
  applicationCount: number;
  hasAppliedToCompany: boolean;
}

interface County {
  id: string;
  slug: string;
  name: string;
}

interface PlanLimits {
  maxCvSearches: number;
  planSlug: string;
  planName: string;
}

// ─── Helpers ───

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function truncate(str: string, maxLen: number) {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + "...";
}

// ─── Component ───

export default function CVSearchPage() {
  // Search state
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("ALL");
  const [hasCv, setHasCv] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState("ALL");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  // Data
  const [users, setUsers] = useState<CVSearchUser[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Plan
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Profile dialog
  const [selectedUser, setSelectedUser] = useState<CVSearchUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    phone: string | null;
    county: string | null;
    bio: string | null;
    cvUrl: string | null;
    avatarUrl: string | null;
    applications: {
      id: string;
      listingTitle: string;
      listingId: string;
      status: string;
      score: number | null;
      appliedAt: string;
    }[];
  } | null>(null);

  // Filter visibility on mobile
  const [showFilters, setShowFilters] = useState(false);

  // ─── Fetch counties ───
  useEffect(() => {
    async function fetchCounties() {
      try {
        const res = await fetch("/api/employer/counties");
        if (res.ok) {
          const data = await res.json();
          setCounties(data);
        }
      } catch {
        // ignore
      }
    }
    fetchCounties();
  }, []);

  // ─── Search ───
  const fetchUsers = useCallback(async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (county !== "ALL") params.set("county", county);
      if (hasCv) params.set("hasCv", "true");
      if (experienceLevel !== "ALL") params.set("experienceLevel", experienceLevel);
      params.set("sort", sort);
      params.set("page", page.toString());
      params.set("limit", "12");

      const res = await fetch(`/api/employer/cv-search?${params}`);
      const json = await res.json();

      if (res.status === 403) {
        setBlocked(true);
        setPlanLimits(json.planLimits);
        setUsers([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }

      if (!res.ok) throw new Error("Search failed");

      setUsers(json.users || []);
      setTotal(json.pagination?.total || 0);
      setTotalPages(json.pagination?.totalPages || 1);
      setPlanLimits(json.planLimits || null);
      setBlocked(false);
    } catch {
      toast.error("Failed to search CVs");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [query, county, hasCv, experienceLevel, sort, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page on filter change
  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleCountyChange = (v: string) => { setCounty(v); setPage(1); };
  const handleExperienceChange = (v: string) => { setExperienceLevel(v); setPage(1); };
  const handleSortChange = (v: string) => { setSort(v); setPage(1); };
  const handleHasCvToggle = (checked: boolean) => { setHasCv(checked); setPage(1); };

  // ─── Profile dialog ───
  const handleViewProfile = async (user: CVSearchUser) => {
    setSelectedUser(user);
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileData(null);

    try {
      // If user has applied to this company, fetch full profile
      if (user.hasAppliedToCompany) {
        const res = await fetch(`/api/employer/applicants/${user.id}`);
        if (res.ok) {
          const json = await res.json();
          setProfileData(json);
        } else {
          // Fallback: show basic data from search
          setProfileData(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setProfileLoading(false);
    }
  };

  // ─── Blocked state (Free plan) ───
  if (blocked) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Search</h1>
          <p className="text-sm text-gray-500 mt-1">
            Find and discover talented jobseekers
          </p>
        </div>
        <Card>
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-amber-100 p-4">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Upgrade to Access CV Search
                </h2>
                <p className="text-sm text-gray-500 mt-2 max-w-md">
                  CV Search is available on Starter, Pro, and Enterprise plans.
                  Upgrade to find and connect with top talent.
                </p>
              </div>
              <Link href="/dashboard/billing/plans">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  View Plans
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main UI ───
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Search</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total > 0
              ? `${total} jobseeker${total !== 1 ? "s" : ""} found`
              : "Find and discover talented jobseekers"}
          </p>
        </div>

        {/* Mobile filter toggle */}
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {showFilters && <X className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      {/* Plan limit warning */}
      {planLimits && planLimits.maxCvSearches > 0 && planLimits.maxCvSearches !== -1 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Your <strong>{planLimits.planName}</strong> plan includes{" "}
            <strong>{planLimits.maxCvSearches} CV searches</strong> per month.
            {planLimits.maxCvSearches <= 5 && (
              <span> You&apos;re nearing your limit.</span>
            )}
          </p>
        </div>
      )}

      {/* Search bar */}
      <form onSubmit={handleQuerySubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, bio, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          type="submit"
          className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
          disabled={searching}
        >
          {searching ? "Searching..." : "Search"}
        </Button>
      </form>

      {/* Filters */}
      <div
        className={`grid gap-4 ${
          showFilters
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            : "hidden lg:grid lg:grid-cols-4"
        }`}
      >
        {/* County */}
        <div>
          <Label className="text-xs font-medium text-gray-500 mb-1.5 block">County</Label>
          <Select value={county} onValueChange={handleCountyChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Counties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Counties</SelectItem>
              {counties.map((c) => (
                <SelectItem key={c.slug} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Experience Level */}
        <div>
          <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Experience Level</Label>
          <Select value={experienceLevel} onValueChange={handleExperienceChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div>
          <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Sort By</Label>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Has CV toggle */}
        <div className="flex items-end gap-3 pb-0.5">
          <div className="flex items-center gap-2">
            <Switch id="hasCv" checked={hasCv} onCheckedChange={handleHasCvToggle} />
            <Label htmlFor="hasCv" className="text-sm text-gray-700 cursor-pointer">
              Has CV uploaded
            </Label>
          </div>
        </div>
      </div>

      {/* Active filters */}
      {(county !== "ALL" || experienceLevel !== "ALL" || hasCv) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Active filters:</span>
          {county !== "ALL" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {county}
              <button onClick={() => { setCounty("ALL"); setPage(1); }} className="ml-1 hover:text-red-600">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {experienceLevel !== "ALL" && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Briefcase className="h-3 w-3" />
              {EXPERIENCE_LEVELS.find((l) => l.value === experienceLevel)?.label || experienceLevel}
              <button onClick={() => { setExperienceLevel("ALL"); setPage(1); }} className="ml-1 hover:text-red-600">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {hasCv && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Has CV
              <button onClick={() => { setHasCv(false); setPage(1); }} className="ml-1 hover:text-red-600">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex flex-col items-center space-y-4">
              <div className="rounded-full bg-gray-100 p-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">No jobseekers found</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Try adjusting your search criteria or filters to discover more candidates.
                </p>
              </div>
              {(query || county !== "ALL" || hasCv || experienceLevel !== "ALL") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setCounty("ALL");
                    setHasCv(false);
                    setExperienceLevel("ALL");
                    setSort("recent");
                    setPage(1);
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Card
              key={user.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-violet-200"
              onClick={() => handleViewProfile(user)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-sm font-medium">
                      {getInitials(user.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {user.name || "Unnamed"}
                      </h3>
                      {user.cvUrl && (
                        <div className="shrink-0" title="Has CV uploaded">
                          <FileText className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                      )}
                    </div>
                    {user.county && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{user.county}</span>
                      </div>
                    )}
                    {user.bio && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {truncate(user.bio, 100)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-medium"
                      >
                        {user.applicationCount} application{user.applicationCount !== 1 ? "s" : ""}
                      </Badge>
                      {user.hasAppliedToCompany && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-0">
                          Applied to you
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                      className={
                        p === page ? "bg-violet-600 text-white hover:bg-violet-700" : ""
                      }
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

      {/* ─── Profile Dialog ─── */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {profileLoading ? (
            <div className="space-y-4 p-2">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-52" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">User Profile</DialogTitle>
                <DialogDescription className="sr-only">
                  Profile details for {selectedUser.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 shrink-0">
                    <AvatarImage src={profileData?.avatarUrl || selectedUser.avatarUrl || undefined} />
                    <AvatarFallback className="bg-violet-100 text-violet-700 text-lg font-bold">
                      {getInitials(profileData?.name || selectedUser.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">
                      {profileData?.name || selectedUser.name}
                    </h2>
                    {profileData?.county || selectedUser.county ? (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {profileData?.county || selectedUser.county}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 mt-1">
                      {selectedUser.cvUrl && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0">
                          <FileText className="h-3 w-3 mr-1" />
                          CV Available
                        </Badge>
                      )}
                      {selectedUser.hasAppliedToCompany && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-0">
                          Applied to your listings
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact */}
                <div className="space-y-2.5">
                  <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="truncate">{profileData?.email || selectedUser.email}</span>
                    </div>
                    {(profileData?.phone || selectedUser.phone) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4 shrink-0 text-gray-400" />
                        <span>{profileData?.phone || selectedUser.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {(profileData?.bio || selectedUser.bio) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1.5">About</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {profileData?.bio || selectedUser.bio}
                      </p>
                    </div>
                  </>
                )}

                {/* CV Download */}
                {(profileData?.cvUrl || selectedUser.cvUrl) && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-violet-100 p-2.5">
                          <FileText className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Resume / CV</p>
                          <p className="text-xs text-gray-500">Download the candidate&apos;s CV</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={profileData?.cvUrl || selectedUser.cvUrl!} download target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1.5 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </>
                )}

                {/* Applications to this company */}
                {selectedUser.hasAppliedToCompany && profileData && profileData.applications.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        Applications to Your Listings ({profileData.applications.length})
                      </h3>
                      <div className="space-y-2">
                        {profileData.applications.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {app.listingTitle}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Applied{" "}
                                {new Date(app.appliedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <Link href={`/dashboard/applications/${app.id}`}>
                                <Button variant="ghost" size="sm" className="text-violet-600">
                                  View <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <Separator />
                <div className="flex justify-end gap-2">
                  {selectedUser.hasAppliedToCompany && (
                    <Link href={`/dashboard/applicants/${selectedUser.id}`}>
                      <Button variant="outline" size="sm">
                        View Full Profile
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProfileOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
