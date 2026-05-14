import prisma from "../src/lib/prisma";
import { SUBSCRIPTION_PLANS } from "../src/lib/subscription-plans";

async function main() {
  console.log("🌱 Seeding subscription plans...");

  for (const plan of SUBSCRIPTION_PLANS) {
    try {
      const result = await prisma.subscriptionPlan.upsert({
        where: { slug: plan.slug },
        update: {
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          maxListings: plan.limits.maxListings,
          maxFeatured: plan.limits.maxFeatured,
          maxCvSearches: plan.limits.maxCvSearches,
          maxTeamMembers: plan.limits.maxTeamMembers,
          maxMessagesPerDay: plan.limits.maxMessagesPerDay,
          features: JSON.stringify(plan.features),
          sortOrder: plan.sortOrder,
          isActive: true,
        },
        create: {
          name: plan.name,
          slug: plan.slug,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          maxListings: plan.limits.maxListings,
          maxFeatured: plan.limits.maxFeatured,
          maxCvSearches: plan.limits.maxCvSearches,
          maxTeamMembers: plan.limits.maxTeamMembers,
          maxMessagesPerDay: plan.limits.maxMessagesPerDay,
          features: JSON.stringify(plan.features),
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      });

      console.log(`  ✅ Upserted plan: ${result.name} (${result.slug})`);
    } catch (error) {
      console.error(`  ❌ Failed to upsert plan ${plan.slug}:`, error);
      throw error;
    }
  }

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
