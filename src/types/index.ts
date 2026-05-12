import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string | null;
      email: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
  }
}

export interface ApplicationStatus {
  value: string;
  label: string;
  color: string;
  bgColor: string;
}

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  { value: "PENDING", label: "Pending", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  { value: "SCREENING", label: "Screening", color: "text-blue-700", bgColor: "bg-blue-100" },
  { value: "INTERVIEW", label: "Interview", color: "text-violet-700", bgColor: "bg-violet-100" },
  { value: "SHORTLISTED", label: "Shortlisted", color: "text-cyan-700", bgColor: "bg-cyan-100" },
  { value: "OFFERED", label: "Offered", color: "text-green-700", bgColor: "bg-green-100" },
  { value: "REJECTED", label: "Rejected", color: "text-red-700", bgColor: "bg-red-100" },
];

export interface ListingStatus {
  value: string;
  label: string;
  color: string;
  bgColor: string;
}

export const LISTING_STATUSES: ListingStatus[] = [
  { value: "ACTIVE", label: "Active", color: "text-green-700", bgColor: "bg-green-100" },
  { value: "DRAFT", label: "Draft", color: "text-gray-700", bgColor: "bg-gray-100" },
  { value: "EXPIRED", label: "Expired", color: "text-orange-700", bgColor: "bg-orange-100" },
  { value: "CLOSED", label: "Closed", color: "text-red-700", bgColor: "bg-red-100" },
  { value: "PAUSED", label: "Paused", color: "text-yellow-700", bgColor: "bg-yellow-100" },
];

export const ORGANIZATION_TYPES = [
  "Startup",
  "SME",
  "Corporation",
  "Non-Profit",
  "Government",
  "Agency",
  "Freelance",
  "Educational Institution",
  "Healthcare Organization",
] as const;

export const ORGANIZATION_INDUSTRIES = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail & E-commerce",
  "Agriculture",
  "Real Estate",
  "Media & Entertainment",
  "Telecommunications",
  "Energy & Utilities",
  "Tourism & Hospitality",
] as const;

export const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "TEMPORARY", label: "Temporary" },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "ENTRY_LEVEL", label: "Entry Level" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MID_LEVEL", label: "Mid Level" },
  { value: "SENIOR", label: "Senior" },
  { value: "MANAGER", label: "Manager" },
  { value: "DIRECTOR", label: "Director" },
  { value: "EXECUTIVE", label: "Executive" },
] as const;

export const WORK_MODES = [
  { value: "ONSITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

export const SALARY_PERIODS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "HOURLY", label: "Hourly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "PER_PROJECT", label: "Per Project" },
  { value: "COMMISSION", label: "Commission" },
] as const;
