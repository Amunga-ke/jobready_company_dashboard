"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Save,
  Loader2,
  Upload,
  X,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORGANIZATION_TYPES, ORGANIZATION_INDUSTRIES } from "@/types";

interface CompanyData {
  name: string;
  orgType: string;
  industry: string;
  description: string;
  website: string;
  location: string;
  county: string;
  logo: string | null;
}

interface County {
  id: string;
  name: string;
}

export default function CompanyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [counties, setCounties] = useState<County[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [county, setCounty] = useState("");
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [companyRes, countyRes] = await Promise.all([
          fetch("/api/employer/company"),
          fetch("/api/employer/counties"),
        ]);
        if (!companyRes.ok) throw new Error("Failed to fetch company");
        if (!countyRes.ok) throw new Error("Failed to fetch counties");
        const company: CompanyData = await companyRes.json();
        const countiesData: County[] = await countyRes.json();
        setCounties(countiesData);

        setName(company.name || "");
        setOrgType(company.orgType || "");
        setIndustry(company.industry || "");
        setDescription(company.description || "");
        setWebsite(company.website || "");
        setLocation(company.location || "");
        setCounty(company.county || "");
        setLogo(company.logo || null);
      } catch {
        toast.error("Failed to load company profile");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/employer/company/logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logo: base64 }),
        });
        if (!res.ok) throw new Error("Failed to upload logo");
        const data = await res.json();
        setLogo(data.logo);
        toast.success("Logo uploaded");
      } catch {
        toast.error("Failed to upload logo");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/employer/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          orgType,
          industry,
          description,
          website,
          location,
          county,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Company profile updated");
    } catch {
      toast.error("Failed to save company profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your company information and branding.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Company Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {logo ? (
                <div className="relative">
                  <img
                    src={logo}
                    alt="Company logo"
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-0.5 hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                  <Building2 className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {logo ? "Change Logo" : "Upload Logo"}
                </Button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your company name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Type</Label>
              <Select value={orgType} onValueChange={setOrgType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell candidates about your company..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourcompany.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Nairobi CBD"
            />
          </div>

          <div className="space-y-2">
            <Label>County</Label>
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger>
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                {counties.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
