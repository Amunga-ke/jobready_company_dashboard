"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Share2,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  TestTube2,
  Eye,
  EyeOff,
  RefreshCw,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// ─── Types ───

interface SocialAccountData {
  id: string;
  platform: string;
  platformUsername: string | null;
  isActive: boolean;
  autoPost: boolean;
  autoPostJobTypes: string | null;
  connectedAt: string;
  accessTokenMasked: string | null;
}

interface SocialPostData {
  id: string;
  accountId: string;
  listingId: string | null;
  platform: string;
  caption: string;
  status: string;
  postType: string;
  errorMessage: string | null;
  postedAt: string | null;
  createdAt: string;
  listing: { id: string; title: string } | null;
  account: { id: string; platform: string; platformUsername: string | null };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PLATFORMS = [
  { value: "LINKEDIN", label: "LinkedIn", icon: Linkedin, color: "bg-[#0077B5]", textColor: "text-[#0077B5]" },
  { value: "TWITTER", label: "Twitter / X", icon: Twitter, color: "bg-black", textColor: "text-black" },
  { value: "FACEBOOK", label: "Facebook", icon: Facebook, color: "bg-[#1877F2]", textColor: "text-[#1877F2]" },
  { value: "INSTAGRAM", label: "Instagram", icon: Instagram, color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]", textColor: "text-[#DD2A7B]" },
];

const JOB_TYPES = ["JOB", "GOVERNMENT", "CASUAL", "OPPORTUNITY"];

const POST_STATUSES: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: "Pending", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  POSTED: { label: "Posted", color: "text-green-700", bgColor: "bg-green-100" },
  FAILED: { label: "Failed", color: "text-red-700", bgColor: "bg-red-100" },
};

function getPlatformInfo(platform: string) {
  return PLATFORMS.find((p) => p.value === platform) || PLATFORMS[0];
}

function getPlatformIcon(platform: string) {
  const info = getPlatformInfo(platform);
  const Icon = info.icon;
  return <Icon className="h-4 w-4" />;
}

// ─── Component ───

export default function SocialPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<SocialAccountData[]>([]);
  const [posts, setPosts] = useState<SocialPostData[]>([]);
  const [postsPagination, setPostsPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Filters
  const [postPlatformFilter, setPostPlatformFilter] = useState<string>("ALL");
  const [postStatusFilter, setPostStatusFilter] = useState<string>("ALL");

  // Dialog states
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [accountToDisconnect, setAccountToDisconnect] = useState<SocialAccountData | null>(null);

  // Connect form
  const [connectPlatform, setConnectPlatform] = useState<string>("");
  const [connectUsername, setConnectUsername] = useState("");
  const [connectAccessToken, setConnectAccessToken] = useState("");
  const [connectRefreshToken, setConnectRefreshToken] = useState("");
  const [connectAutoPost, setConnectAutoPost] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Auto-post settings per account
  const [autoPostSettings, setAutoPostSettings] = useState<Record<string, { autoPost: boolean; jobTypes: string[] }>>({});
  const [savingAutoPost, setSavingAutoPost] = useState<string | null>(null);

  // Test connection
  const [testingAccount, setTestingAccount] = useState<string | null>(null);

  // Load data
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/employer/social/accounts");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAccounts(data);
    } catch {
      toast.error("Failed to load social accounts");
    }
  }, []);

  const fetchPosts = useCallback(async (page = 1, platform?: string, status?: string) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (platform && platform !== "ALL") params.set("platform", platform);
      if (status && status !== "ALL") params.set("status", status);

      const res = await fetch(`/api/employer/social/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPosts(data.data);
      setPostsPagination(data.pagination);
    } catch {
      toast.error("Failed to load social posts");
    }
  }, []);

  useEffect(() => {
    async function init() {
      await fetchAccounts();
      await fetchPosts();
      setLoading(false);
    }
    init();
  }, [fetchAccounts, fetchPosts]);

  // Initialize autoPostSettings from accounts
  useEffect(() => {
    const settings: Record<string, { autoPost: boolean; jobTypes: string[] }> = {};
    accounts.forEach((acc) => {
      let jobTypes: string[] = [];
      if (acc.autoPostJobTypes) {
        try {
          jobTypes = JSON.parse(acc.autoPostJobTypes);
        } catch {
          jobTypes = [];
        }
      }
      settings[acc.id] = { autoPost: acc.autoPost, jobTypes };
    });
    setAutoPostSettings(settings);
  }, [accounts]);

  // Handlers
  const handleConnect = async () => {
    if (!connectPlatform) {
      toast.error("Please select a platform");
      return;
    }
    if (!connectUsername.trim()) {
      toast.error("Please enter a platform username");
      return;
    }
    if (!connectAccessToken.trim()) {
      toast.error("Please enter an access token");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/api/employer/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: connectPlatform,
          platformUsername: connectUsername.trim(),
          accessToken: connectAccessToken.trim(),
          refreshToken: connectRefreshToken.trim() || undefined,
          autoPost: connectAutoPost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");

      toast.success(`${getPlatformInfo(connectPlatform).label} account connected successfully`);
      setConnectDialogOpen(false);
      resetConnectForm();
      await fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect account");
    } finally {
      setConnecting(false);
    }
  };

  const resetConnectForm = () => {
    setConnectPlatform("");
    setConnectUsername("");
    setConnectAccessToken("");
    setConnectRefreshToken("");
    setConnectAutoPost(false);
    setShowAccessToken(false);
    setShowRefreshToken(false);
  };

  const handleDisconnect = async () => {
    if (!accountToDisconnect) return;

    try {
      const res = await fetch(`/api/employer/social/accounts/${accountToDisconnect.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");

      toast.success(`${getPlatformInfo(accountToDisconnect.platform).label} account disconnected`);
      setDisconnectDialogOpen(false);
      setAccountToDisconnect(null);
      await fetchAccounts();
      await fetchPosts(postsPagination.page, postPlatformFilter, postStatusFilter);
    } catch {
      toast.error("Failed to disconnect account");
    }
  };

  const handleTestConnection = async (accountId: string) => {
    setTestingAccount(accountId);
    try {
      const res = await fetch(`/api/employer/social/accounts/${accountId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Connection is valid");
      } else {
        toast.error(data.error || "Connection test failed");
      }
    } catch {
      toast.error("Failed to test connection");
    } finally {
      setTestingAccount(null);
    }
  };

  const handleAutoPostToggle = async (accountId: string, enabled: boolean) => {
    setSavingAutoPost(accountId);
    try {
      const settings = autoPostSettings[accountId];
      const res = await fetch(`/api/employer/social/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoPost: enabled,
          autoPostJobTypes: enabled ? JSON.stringify(settings?.jobTypes || []) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Auto-post settings updated");
      await fetchAccounts();
    } catch {
      toast.error("Failed to update auto-post settings");
    } finally {
      setSavingAutoPost(null);
    }
  };

  const handleJobTypeToggle = async (accountId: string, jobType: string) => {
    const settings = autoPostSettings[accountId];
    if (!settings) return;

    const currentTypes = [...settings.jobTypes];
    const idx = currentTypes.indexOf(jobType);
    if (idx >= 0) {
      currentTypes.splice(idx, 1);
    } else {
      currentTypes.push(jobType);
    }

    setAutoPostSettings((prev) => ({
      ...prev,
      [accountId]: { ...settings, jobTypes: currentTypes },
    }));

    // Save to server
    setSavingAutoPost(accountId);
    try {
      const res = await fetch(`/api/employer/social/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoPostJobTypes: JSON.stringify(currentTypes),
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await fetchAccounts();
    } catch {
      toast.error("Failed to update job type filter");
    } finally {
      setSavingAutoPost(null);
    }
  };

  const handleFilterChange = () => {
    fetchPosts(1, postPlatformFilter, postStatusFilter);
  };

  const handlePageChange = (newPage: number) => {
    fetchPosts(newPage, postPlatformFilter, postStatusFilter);
  };

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your social accounts and manage posting to promote your listings.
        </p>
      </div>

      {/* ─── Connected Accounts Section ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => setConnectDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Connect Account
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORMS.map((platform) => {
            const connectedAccount = accounts.find((a) => a.platform === platform.value);
            const isConnected = !!connectedAccount;
            const Icon = platform.icon;

            return (
              <Card
                key={platform.value}
                className={`relative overflow-hidden transition-shadow hover:shadow-md ${
                  isConnected ? "border-green-200" : ""
                }`}
              >
                {/* Platform color accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${platform.color}`} />

                <CardContent className="p-4 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isConnected ? "bg-green-50" : "bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isConnected ? platform.textColor : "text-gray-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{platform.label}</p>
                        {isConnected && connectedAccount.platformUsername && (
                          <p className="text-xs text-gray-500">@{connectedAccount.platformUsername}</p>
                        )}
                      </div>
                    </div>
                    {isConnected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-300" />
                    )}
                  </div>

                  {isConnected && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Connected</span>
                        <span className="text-gray-400">
                          {new Date(connectedAccount.connectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs flex-1"
                          onClick={() => handleTestConnection(connectedAccount.id)}
                          disabled={testingAccount === connectedAccount.id}
                        >
                          {testingAccount === connectedAccount.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <TestTube2 className="mr-1 h-3 w-3" />
                          )}
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex-1"
                          onClick={() => {
                            setAccountToDisconnect(connectedAccount);
                            setDisconnectDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isConnected && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-2">Not connected</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          setConnectPlatform(platform.value);
                          setConnectDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Connect
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── Auto-Post Settings Section ─── */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="h-5 w-5 text-violet-600" />
              Auto-Post Settings
            </CardTitle>
            <CardDescription>
              Automatically post new listings to connected social accounts. Choose which listing types to share.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.map((account) => {
              const settings = autoPostSettings[account.id];
              const platformInfo = getPlatformInfo(account.platform);
              const Icon = platformInfo.icon;
              const isSaving = savingAutoPost === account.id;

              return (
                <div key={account.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
                        <Icon className={`h-4 w-4 ${platformInfo.textColor}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {platformInfo.label}
                          {account.platformUsername && (
                            <span className="text-gray-400 font-normal ml-1">
                              (@{account.platformUsername})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                    ) : (
                      <Switch
                        checked={settings?.autoPost || false}
                        onCheckedChange={(enabled) => handleAutoPostToggle(account.id, enabled)}
                      />
                    )}
                  </div>
                  {settings?.autoPost && (
                    <div className="mt-3 ml-11 flex flex-wrap gap-3">
                      {JOB_TYPES.map((jt) => (
                        <label
                          key={jt}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={settings.jobTypes.includes(jt)}
                            onCheckedChange={() => handleJobTypeToggle(account.id, jt)}
                            disabled={isSaving}
                          />
                          <span className="text-xs text-gray-600">{jt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {account !== accounts[accounts.length - 1] && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Recent Posts Section ─── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-violet-600" />
                Recent Posts
              </CardTitle>
              <CardDescription className="mt-1">
                {postsPagination.total} post{postsPagination.total !== 1 ? "s" : ""} total
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={postPlatformFilter} onValueChange={(v) => { setPostPlatformFilter(v); }}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Platforms</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={postStatusFilter} onValueChange={(v) => { setPostStatusFilter(v); }}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="POSTED">Posted</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleFilterChange}
              >
                Apply
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <Share2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No social posts yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Connect accounts and post your listings to social media.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium">Platform</TableHead>
                      <TableHead className="text-xs font-medium">Listing</TableHead>
                      <TableHead className="text-xs font-medium">Caption</TableHead>
                      <TableHead className="text-xs font-medium">Status</TableHead>
                      <TableHead className="text-xs font-medium">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => {
                      const statusInfo = POST_STATUSES[post.status] || POST_STATUSES.PENDING;
                      const platformInfo = getPlatformInfo(post.platform);
                      const PlatformIcon = platformInfo.icon;

                      return (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <PlatformIcon className={`h-4 w-4 ${platformInfo.textColor}`} />
                              <span className="text-xs font-medium">{platformInfo.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-700">
                              {post.listing?.title || (
                                <span className="text-gray-400 italic">No listing</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-gray-600 max-w-[200px] truncate">
                              {post.caption}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-gray-400">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {postsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-500">
                    Page {postsPagination.page} of {postsPagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={postsPagination.page <= 1}
                      onClick={() => handlePageChange(postsPagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={postsPagination.page >= postsPagination.totalPages}
                      onClick={() => handlePageChange(postsPagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Connect Account Dialog ─── */}
      <Dialog open={connectDialogOpen} onOpenChange={(open) => { setConnectDialogOpen(open); if (!open) resetConnectForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-violet-600" />
              Connect Social Account
            </DialogTitle>
            <DialogDescription>
              Add a social media account to start posting your listings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Platform */}
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={connectPlatform} onValueChange={setConnectPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <p.icon className="h-4 w-4" />
                        <span>{p.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="platform-username">Platform Username</Label>
              <Input
                id="platform-username"
                value={connectUsername}
                onChange={(e) => setConnectUsername(e.target.value)}
                placeholder="e.g., @yourcompany"
              />
            </div>

            {/* Access Token */}
            <div className="space-y-2">
              <Label htmlFor="access-token">Access Token</Label>
              <div className="relative">
                <Textarea
                  id="access-token"
                  value={connectAccessToken}
                  onChange={(e) => setConnectAccessToken(e.target.value)}
                  placeholder="Paste your OAuth access token here"
                  className="pr-10 font-mono text-xs"
                  rows={3}
                  type={showAccessToken ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Refresh Token */}
            <div className="space-y-2">
              <Label htmlFor="refresh-token">
                Refresh Token <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <Textarea
                  id="refresh-token"
                  value={connectRefreshToken}
                  onChange={(e) => setConnectRefreshToken(e.target.value)}
                  placeholder="Paste your refresh token here"
                  className="pr-10 font-mono text-xs"
                  rows={2}
                  type={showRefreshToken ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowRefreshToken(!showRefreshToken)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  {showRefreshToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Auto-Post Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Auto-Post</p>
                <p className="text-xs text-gray-500">Automatically share new listings</p>
              </div>
              <Switch
                checked={connectAutoPost}
                onCheckedChange={setConnectAutoPost}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setConnectDialogOpen(false); resetConnectForm(); }}
            >
              Cancel
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={connecting || !connectPlatform || !connectUsername || !connectAccessToken}
              onClick={handleConnect}
            >
              {connecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Disconnect Confirmation Dialog ─── */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Social Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect your{" "}
              {accountToDisconnect ? getPlatformInfo(accountToDisconnect.platform).label : ""} account
              {accountToDisconnect?.platformUsername
                ? ` (@${accountToDisconnect.platformUsername})`
                : ""}
              ? This will remove the stored tokens and delete all associated posts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
