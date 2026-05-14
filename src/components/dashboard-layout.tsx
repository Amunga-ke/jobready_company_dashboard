"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Briefcase,
  LayoutDashboard,
  BarChart3,
  FileText,
  Users,
  MessageSquare,
  Kanban,
  Clock,
  Building2,
  UserCog,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
  LogOut,
  X,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/notification-bell";

interface DashboardLayoutProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
  };
  company: {
    id: string;
    name: string;
    logo?: string | null;
    slug: string;
    verified: boolean;
  };
  teamCount: number;
  unreadMessageCount?: number;
  children: React.ReactNode;
}

const navSections = [
  {
    label: null,
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
      { href: "/dashboard/listings", icon: FileText, label: "My Listings" },
      { href: "/dashboard/applicants", icon: Users, label: "Applicants" },
      { href: "/dashboard/cv-search", icon: Search, label: "CV Search" },
      { href: "/dashboard/messages", icon: MessageSquare, label: "Messages" },
      { href: "/dashboard/pipeline", icon: Kanban, label: "Pipeline" },
      { href: "/dashboard/deadlines", icon: Clock, label: "Deadlines" },
    ],
  },
  {
    label: "Company",
    items: [
      { href: "/dashboard/company", icon: Building2, label: "Company Profile" },
      { href: "/dashboard/team", icon: UserCog, label: "Team" },
      { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", icon: Settings, label: "Settings" },
    ],
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DashboardLayout({
  user,
  company,
  teamCount,
  unreadMessageCount = 0,
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white">
          <Briefcase className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight">
              JobReady
            </span>
            <span className="text-[10px] text-violet-300">
              Employer Portal
            </span>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {navSections.map((section) => (
            <div key={section.label || "main"}>
              {section.label && !collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                  {section.label}
                </p>
              )}
              {section.label && collapsed && (
                <Separator className="mb-3 bg-sidebar-border" />
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const showBadge = item.href === "/dashboard/messages" && unreadMessageCount > 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        active
                          ? "bg-sidebar-accent text-white"
                          : "text-violet-200 hover:bg-sidebar-accent/50 hover:text-white",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <div className="relative">
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-violet-300" : "text-violet-400 group-hover:text-violet-300"
                          )}
                        />
                        {showBadge && (
                          <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
                            {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                          </span>
                        )}
                        {active && (
                          <div className="absolute -left-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-violet-400" />
                        )}
                      </div>
                      {!collapsed && (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {showBadge && (
                            <span className="h-5 min-w-[20px] rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1 shrink-0">
                              {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* Post New Job */}
      <div className="p-3">
        <Link href="/dashboard/listings/new" onClick={() => setMobileOpen(false)}>
          <Button
            className={cn(
              "w-full bg-violet-600 hover:bg-violet-500 text-white",
              collapsed ? "px-0" : ""
            )}
            size={collapsed ? "icon" : "default"}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-1">Post New Job</span>}
          </Button>
        </Link>
      </div>

      {/* User profile */}
      <Separator className="bg-sidebar-border" />
      <div className="p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2",
            collapsed ? "justify-center" : ""
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="bg-violet-600 text-xs text-white">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-violet-300">
                {user.email}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 rounded-md p-1.5 text-violet-400 hover:bg-sidebar-accent hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-200 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute right-2 top-3 z-10">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-violet-300 hover:bg-sidebar-accent hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden bg-sidebar transition-all duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {sidebarContent}
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-violet-300 hover:text-white shadow-sm"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-200",
          collapsed ? "lg:pl-[68px]" : "lg:pl-64"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-white/80 px-4 backdrop-blur-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900">{company.name}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-violet-100 text-xs text-violet-700">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
