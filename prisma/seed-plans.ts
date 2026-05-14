import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLANS = [
  {
    name: "Free",
    slug: "free",
    description: "Get started with basic job posting tools.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "KES",
    maxListings: 3,
    maxFeatured: 0,
    maxCvSearches: 0,
    maxTeamMembers: 1,
    maxMessagesPerDay: 10,
    isActive: true,
    sortOrder: 0,
    features: JSON.stringify([
      "Basic job posting",
      "Application tracking",
      "Company profile",
    ]),
  },
  {
    name: "Starter",
    slug: "starter",
    description: "Perfect for growing teams that need more reach.",
    priceMonthly: 2999,
    priceYearly: 29990,
    currency: "KES",
    maxListings: 15,
    maxFeatured: 2,
    maxCvSearches: 20,
    maxTeamMembers: 3,
    maxMessagesPerDay: -1,
    isActive: true,
    sortOrder: 1,
    features: JSON.stringify([
      "All Free features",
      "Featured listings",
      "CV search",
      "Priority support",
    ]),
  },
  {
    name: "Pro",
    slug: "pro",
    description: "For companies serious about hiring at scale.",
    priceMonthly: 7999,
    priceYearly: 79990,
    currency: "KES",
    maxListings: 50,
    maxFeatured: 5,
    maxCvSearches: 100,
    maxTeamMembers: 10,
    maxMessagesPerDay: -1,
    isActive: true,
    sortOrder: 2,
    features: JSON.stringify([
      "All Starter features",
      "Advanced analytics",
      "Custom branding",
      "Bulk actions",
    ]),
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    description: "Unlimited everything for large organizations.",
    priceMonthly: 24999,
    priceYearly: 249990,
    currency: "KES",
    maxListings: -1,
    maxFeatured: 15,
    maxCvSearches: -1,
    maxTeamMembers: -1,
    maxMessagesPerDay: -1,
    isActive: true,
    sortOrder: 3,
    features: JSON.stringify([
      "All Pro features",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ]),
  },
];

async function main() {
  console.log("🌱 Seeding subscription plans...");

  for (const planData of PLANS) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { slug: planData.slug },
      update: planData,
      create: planData,
    });
    console.log(`  ✓ ${plan.name} plan (${plan.slug})`);
  }

  console.log("\n✅ Subscription plans seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding plans:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
