const { PrismaClient } = require('/home/z/my-project/jobready_company_dashboard/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const plans = [
    { name: 'Free', slug: 'free', description: 'Get started with basic job posting', priceMonthly: 0, priceYearly: 0, maxListings: 3, maxFeatured: 0, maxCvSearches: 0, maxTeamMembers: 1, maxMessagesPerDay: 10, isActive: true, sortOrder: 0, features: JSON.stringify(['Basic job posting', 'Application tracking', 'Company profile']) },
    { name: 'Starter', slug: 'starter', description: 'Grow your hiring reach', priceMonthly: 2999, priceYearly: 29990, maxListings: 15, maxFeatured: 2, maxCvSearches: 20, maxTeamMembers: 3, maxMessagesPerDay: -1, isActive: true, sortOrder: 1, features: JSON.stringify(['All Free features', 'Featured listings', 'CV search access', 'Priority support', 'Bulk status updates']) },
    { name: 'Pro', slug: 'pro', description: 'Scale your recruitment', priceMonthly: 7999, priceYearly: 79990, maxListings: 50, maxFeatured: 5, maxCvSearches: 100, maxTeamMembers: 10, maxMessagesPerDay: -1, isActive: true, sortOrder: 2, features: JSON.stringify(['All Starter features', 'Advanced analytics', 'Custom employer branding', 'Bulk actions', 'Deadline management']) },
    { name: 'Enterprise', slug: 'enterprise', description: 'Full recruitment suite', priceMonthly: 24999, priceYearly: 249990, maxListings: -1, maxFeatured: 15, maxCvSearches: -1, maxTeamMembers: -1, maxMessagesPerDay: -1, isActive: true, sortOrder: 3, features: JSON.stringify(['All Pro features', 'API access', 'Dedicated account manager', 'Custom integrations', 'Unlimited everything']) }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({ where: { slug: plan.slug }, update: plan, create: plan });
    console.log('Upserted plan:', plan.slug);
  }

  // Ensure all existing companies have a Free plan subscription
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: 'free' } });
  if (freePlan) {
    const companies = await prisma.company.findMany({ select: { id: true } });
    for (const company of companies) {
      const existing = await prisma.companySubscription.findUnique({
        where: { companyId_planId: { companyId: company.id, planId: freePlan.id } }
      });
      if (!existing) {
        const now = new Date();
        const yearLater = new Date(now);
        yearLater.setFullYear(yearLater.getFullYear() + 1);
        await prisma.companySubscription.create({
          data: {
            companyId: company.id,
            planId: freePlan.id,
            status: 'ACTIVE',
            billingCycle: 'MONTHLY',
            currentPeriodStart: now,
            currentPeriodEnd: yearLater,
          }
        });
        console.log('Created Free subscription for company:', company.id);
      }
    }
    // Also create JobCredit records for companies that don't have one
    for (const company of companies) {
      const existingCredit = await prisma.jobCredit.findUnique({ where: { companyId: company.id } });
      if (!existingCredit) {
        await prisma.jobCredit.create({
          data: { companyId: company.id, balance: 0, totalPurchased: 0, totalUsed: 0 }
        });
        console.log('Created JobCredit for company:', company.id);
      }
    }
  }

  await prisma.$disconnect();
  console.log('Done seeding plans and subscriptions');
}

seed().catch(e => { console.error(e); process.exit(1); });
