"use client";

import React, { useEffect, useState } from "react";
import {
  Save,
  Loader2,
  Bell,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface NotificationPreferences {
  new_application: boolean;
  application_status_change: boolean;
  listing_expiry: boolean;
  weekly_report: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    new_application: true,
    application_status_change: true,
    listing_expiry: true,
    weekly_report: false,
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/employer/settings");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (data.notifications) {
          setPrefs(data.notifications);
        }
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/employer/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: prefs }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/employer/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to change password");
      }
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-10" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account preferences.
        </p>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-violet-600" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">New Applications</p>
              <p className="text-xs text-gray-500">Get notified when someone applies to your listings</p>
            </div>
            <Switch
              checked={prefs.new_application}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, new_application: v }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Application Status Changes</p>
              <p className="text-xs text-gray-500">Notifications when application statuses are updated</p>
            </div>
            <Switch
              checked={prefs.application_status_change}
              onCheckedChange={(v) =>
                setPrefs((p) => ({ ...p, application_status_change: v }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Listing Expiry</p>
              <p className="text-xs text-gray-500">Get alerted before your listings expire</p>
            </div>
            <Switch
              checked={prefs.listing_expiry}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, listing_expiry: v }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Weekly Report</p>
              <p className="text-xs text-gray-500">Receive a weekly summary of your hiring activity</p>
            </div>
            <Switch
              checked={prefs.weekly_report}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, weekly_report: v }))}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={savingPrefs}
              onClick={handleSavePrefs}
            >
              {savingPrefs ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-violet-600" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={changingPassword}
              onClick={handleChangePassword}
            >
              {changingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
