import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Ensuring every company has a Free plan subscription...");

  // Find the Free plan
  const freePlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: "free" },
  });

  if (!freePlan) {
    console.error("❌ Free plan not found. Run seed-plans.ts first.");
    process.exit(1);
  }

  // Find all companies
  const companies = await prisma.company.findMany({
    select: { id: true },
  });

  console.log(`  Found ${companies.length} companies.`);

  let created = 0;
  let skipped = 0;

  for (const company of companies) {
    // Check if company already has a subscription
    const existing = await prisma.companySubscription.findUnique({
      where: {
        companyId_planId: {
          companyId: company.id,
          planId: freePlan.id,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create subscription
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    await prisma.companySubscription.create({
      data: {
        companyId: company.id,
        planId: freePlan.id,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    created++;
  }

  console.log(`  ✓ Created ${created} new subscriptions.`);
  console.log(`  ⊘ Skipped ${skipped} existing subscriptions.`);
  console.log("\n✅ Subscription seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error seeding subscriptions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
