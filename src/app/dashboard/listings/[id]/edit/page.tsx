"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Save,
  Send,
  Plus,
  X,
  Loader2,
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
import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  WORK_MODES,
  SALARY_PERIODS,
} from "@/types";

interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface County {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface ListingData {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string | null;
  town: string;
  county: string;
  employmentType: string;
  experienceLevel: string;
  workMode: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string;
  deadline: string | null;
  tagIds: string[];
}

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [town, setTown] = useState("");
  const [county, setCounty] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [listingRes, catRes, countyRes, tagRes] = await Promise.all([
          fetch(`/api/employer/listings/${listingId}`),
          fetch("/api/employer/categories"),
          fetch("/api/employer/counties"),
          fetch("/api/employer/tags"),
        ]);
        if (!listingRes.ok || !catRes.ok || !countyRes.ok || !tagRes.ok) throw new Error("Failed");

        const listing: ListingData = await listingRes.json();
        setCategories(await catRes.json());
        setCounties(await countyRes.json());
        const tagsData = await tagRes.json();
        setTags(tagsData);

        // Populate form
        setTitle(listing.title);
        setDescription(listing.description);
        setCategoryId(listing.categoryId);
        setSubcategoryId(listing.subcategoryId || "");
        setTown(listing.town);
        setCounty(listing.county);
        setEmploymentType(listing.employmentType);
        setExperienceLevel(listing.experienceLevel);
        setWorkMode(listing.workMode);
        setSalaryMin(listing.salaryMin?.toString() || "");
        setSalaryMax(listing.salaryMax?.toString() || "");
        setSalaryPeriod(listing.salaryPeriod);
        setDeadline(listing.deadline ? listing.deadline.split("T")[0] : "");
        setSelectedTags(listing.tagIds || []);
      } catch {
        toast.error("Failed to load listing");
        router.push("/dashboard/listings");
      } finally {
        setInitialLoading(false);
      }
    }
    fetchData();
  }, [listingId, router]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories || [];
  const filteredTags = tags.filter(
    (t) =>
      !selectedTags.includes(t.id) &&
      t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (status: "ACTIVE" | "DRAFT") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employer/listings/${listingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          categoryId,
          subcategoryId: subcategoryId || null,
          town,
          county,
          employmentType,
          experienceLevel,
          workMode,
          salaryMin: salaryMin ? Number(salaryMin) : null,
          salaryMax: salaryMax ? Number(salaryMax) : null,
          salaryPeriod,
          deadline: deadline || null,
          tagIds: selectedTags,
          status,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to update listing");
      }
      toast.success(
        status === "ACTIVE" ? "Listing published!" : "Draft saved!"
      );
      router.push("/dashboard/listings");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update your job listing details.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => handleSubmit("DRAFT")}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save as Draft
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white"
            disabled={submitting}
            onClick={() => handleSubmit("ACTIVE")}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Senior Frontend Developer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, responsibilities, and requirements..."
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select
                  value={subcategoryId}
                  onValueChange={setSubcategoryId}
                  disabled={!subcategories.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subcategories.length ? "Select" : "Choose category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Location & Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="town">Town / City</Label>
              <Input
                id="town"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder="e.g., Nairobi"
              />
            </div>
            <div className="space-y-2">
              <Label>County *</Label>
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
            <div className="space-y-2">
              <Label>Employment Type *</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Experience Level *</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Work Mode *</Label>
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Compensation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Compensation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Minimum Salary</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Maximum Salary</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Salary Period</Label>
              <Select value={salaryPeriod} onValueChange={setSalaryPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Application Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  return tag ? (
                    <Badge
                      key={tagId}
                      variant="secondary"
                      className="bg-violet-100 text-violet-700 pr-1"
                    >
                      {tag.name}
                      <button
                        onClick={() => toggleTag(tagId)}
                        className="ml-1 rounded-full p-0.5 hover:bg-violet-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            <div className="relative">
              <Input
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
              />
              {tagSearch && filteredTags.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-white shadow-lg">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-violet-50 text-left"
                      onClick={() => { toggleTag(tag.id); setTagSearch(""); }}
                    >
                      <Plus className="h-3 w-3 text-violet-500" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
