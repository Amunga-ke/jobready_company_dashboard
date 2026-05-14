"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  User,
  CreditCard,
  Star,
  AlertTriangle,
  MessageSquare,
  Clock,
  Briefcase,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  metadata: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  APPLICATION_RECEIVED: User,
  STATUS_CHANGED: Briefcase,
  SUBSCRIPTION_EXPIRING: AlertTriangle,
  SUBSCRIPTION_ACTIVATED: CreditCard,
  CREDIT_PURCHASED: CreditCard,
  LISTING_EXPIRING: Clock,
  FEATURED_BOOST_ACTIVE: Star,
  NEW_MESSAGE: MessageSquare,
};

const TYPE_COLORS: Record<string, string> = {
  APPLICATION_RECEIVED: "bg-blue-100 text-blue-600",
  STATUS_CHANGED: "bg-violet-100 text-violet-600",
  SUBSCRIPTION_EXPIRING: "bg-amber-100 text-amber-600",
  SUBSCRIPTION_ACTIVATED: "bg-emerald-100 text-emerald-600",
  CREDIT_PURCHASED: "bg-emerald-100 text-emerald-600",
  LISTING_EXPIRING: "bg-orange-100 text-orange-600",
  FEATURED_BOOST_ACTIVE: "bg-yellow-100 text-yellow-600",
  NEW_MESSAGE: "bg-sky-100 text-sky-600",
};

const TYPE_LABELS: Record<string, string> = {
  APPLICATION_RECEIVED: "Application",
  STATUS_CHANGED: "Status Update",
  SUBSCRIPTION_EXPIRING: "Subscription",
  SUBSCRIPTION_ACTIVATED: "Subscription",
  CREDIT_PURCHASED: "Credits",
  LISTING_EXPIRING: "Deadline",
  FEATURED_BOOST_ACTIVE: "Boost",
  NEW_MESSAGE: "Message",
};

function groupByDate(notifications: Notification[]) {
  const groups: { label: string; notifications: Notification[] }[] = [];

  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (isToday(d)) {
      today.push(n);
    } else if (isYesterday(d)) {
      yesterday.push(n);
    } else {
      earlier.push(n);
    }
  }

  if (today.length > 0) groups.push({ label: "Today", notifications: today });
  if (yesterday.length > 0) groups.push({ label: "Yesterday", notifications: yesterday });
  if (earlier.length > 0) groups.push({ label: "Earlier", notifications: earlier });

  return groups;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/employer/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (isLoadMore) {
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }
        setUnreadCount(data.unreadCount ?? 0);
        setNextCursor(data.nextCursor ?? null);
      }
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string, link?: string | null) => {
    try {
      const res = await fetch("/api/employer/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        if (link) {
          router.push(link);
        }
      }
    } catch {
      // silently fail
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/employer/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("All notifications marked as read");
      }
    } catch {
      toast.error("Failed to mark notifications as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const groups = groupByDate(notifications);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated on your hiring activity and account changes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="gap-2"
            >
              {markingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all as read
            </Button>
          )}
          {unreadCount > 0 && (
            <Badge variant="secondary" className="h-6 px-2.5">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="rounded-lg border bg-white">
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-white py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No notifications</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            You&apos;re all caught up! We&apos;ll notify you about new applications, subscription
            changes, and other important updates.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {group.label}
              </h2>
              <div className="rounded-lg border bg-white divide-y">
                {group.notifications.map((notification) => {
                  const IconComponent = TYPE_ICONS[notification.type] || Bell;
                  const colorClass = TYPE_COLORS[notification.type] || "bg-gray-100 text-gray-600";
                  const typeLabel = TYPE_LABELS[notification.type] || notification.type;
                  const createdDate = new Date(notification.createdAt);

                  return (
                    <button
                      key={notification.id}
                      onClick={() =>
                        handleMarkAsRead(notification.id, notification.link)
                      }
                      className={cn(
                        "flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-gray-50/80",
                        !notification.isRead && "bg-violet-50/50"
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          colorClass
                        )}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p
                                className={cn(
                                  "text-sm",
                                  !notification.isRead
                                    ? "font-semibold text-gray-900"
                                    : "font-medium text-gray-700"
                                )}
                              >
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                              )}
                            </div>
                            {notification.body && (
                              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                {notification.body}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs text-gray-400">
                              {isToday(createdDate) || isYesterday(createdDate)
                                ? formatDistanceToNow(createdDate, { addSuffix: true })
                                : format(createdDate, "MMM d")}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal text-gray-500 border-gray-200">
                              {typeLabel}
                            </Badge>
                          </div>
                        </div>
                        {/* Actions */}
                        {!notification.isRead && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-medium">
                              <Check className="h-3 w-3" />
                              Click to mark as read
                              {notification.link && " & view"}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {nextCursor && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNotifications(nextCursor!)}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Load more notifications"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
