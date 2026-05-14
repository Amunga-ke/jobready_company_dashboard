export interface PlanLimits {
  maxListings: number;
  maxFeatured: number;
  maxCvSearches: number;
  maxTeamMembers: number;
  maxMessagesPerDay: number;
}

export interface SubscriptionPlanConfig {
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  limits: PlanLimits;
  features: string[];
  sortOrder: number;
  highlight?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    slug: "free",
    name: "Free",
    description: "Get started with basic job posting tools.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "KES",
    sortOrder: 0,
    limits: {
      maxListings: 3,
      maxFeatured: 0,
      maxCvSearches: 0,
      maxTeamMembers: 1,
      maxMessagesPerDay: 10,
    },
    features: [
      "Basic job posting",
      "Application tracking",
      "Company profile",
    ],
  },
  {
    slug: "starter",
    name: "Starter",
    description: "Perfect for growing teams that need more reach.",
    priceMonthly: 2999,
    priceYearly: 29990,
    currency: "KES",
    sortOrder: 1,
    limits: {
      maxListings: 15,
      maxFeatured: 2,
      maxCvSearches: 20,
      maxTeamMembers: 3,
      maxMessagesPerDay: -1, // unlimited
    },
    features: [
      "All Free features",
      "Featured listings",
      "CV search",
      "Priority support",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    description: "For companies serious about hiring at scale.",
    priceMonthly: 7999,
    priceYearly: 79990,
    currency: "KES",
    sortOrder: 2,
    highlight: true,
    limits: {
      maxListings: 50,
      maxFeatured: 5,
      maxCvSearches: 100,
      maxTeamMembers: 10,
      maxMessagesPerDay: -1,
    },
    features: [
      "All Starter features",
      "Advanced analytics",
      "Custom branding",
      "Bulk actions",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description: "Unlimited everything for large organizations.",
    priceMonthly: 24999,
    priceYearly: 249990,
    currency: "KES",
    sortOrder: 3,
    limits: {
      maxListings: -1, // unlimited
      maxFeatured: 15,
      maxCvSearches: -1,
      maxTeamMembers: -1,
      maxMessagesPerDay: -1,
    },
    features: [
      "All Pro features",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export function getPlanBySlug(slug: string): SubscriptionPlanConfig | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.slug === slug);
}

export function getPlanLimits(slug: string): PlanLimits | undefined {
  return getPlanBySlug(slug)?.limits;
}

export function formatKES(amount: number): string {
  if (amount === 0) return "Free";
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function getDisplayLimit(value: number): string {
  return value === -1 ? "Unlimited" : String(value);
}
