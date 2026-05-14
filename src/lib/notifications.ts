import prisma from "@/lib/prisma";

export const NOTIFICATION_TYPES = {
  APPLICATION_RECEIVED: "APPLICATION_RECEIVED",
  STATUS_CHANGED: "STATUS_CHANGED",
  SUBSCRIPTION_EXPIRING: "SUBSCRIPTION_EXPIRING",
  SUBSCRIPTION_ACTIVATED: "SUBSCRIPTION_ACTIVATED",
  CREDIT_PURCHASED: "CREDIT_PURCHASED",
  LISTING_EXPIRING: "LISTING_EXPIRING",
  FEATURED_BOOST_ACTIVE: "FEATURED_BOOST_ACTIVE",
  NEW_MESSAGE: "NEW_MESSAGE",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { userId, type, title, body, link, metadata } = params;

  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

/**
 * Notify all employers of a company (admin + team members).
 */
export async function notifyCompany(params: {
  companyId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { companyId, type, title, body, link, metadata } = params;

  // Get all users linked to this company (admin profile + team members)
  const [employerProfile, teamMembers] = await Promise.all([
    prisma.employerProfile.findUnique({
      where: { companyId },
      select: { userId: true },
    }),
    prisma.teamMember.findMany({
      where: { companyId, isActive: true },
      select: { userId: true },
    }),
  ]);

  const userIds = new Set<string>();
  if (employerProfile) userIds.add(employerProfile.userId);
  for (const tm of teamMembers) userIds.add(tm.userId);

  const notifications = Array.from(userIds).map((userId) => ({
    userId,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  }));

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}

/**
 * Check for listings whose deadlines are approaching (within 3 days)
 * and create LISTING_EXPIRING notifications for the company.
 *
 * Designed to be called by a scheduler / cron job.
 */
export async function checkExpiringListings(daysThreshold: number = 3): Promise<number> {
  const now = new Date();
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  // Find active listings whose deadline is within the threshold
  // and haven't been notified yet (or were notified > 24h ago)
  const expiringListings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      deadline: {
        gte: now,
        lte: threshold,
      },
    },
    include: {
      company: {
        include: {
          employerProfiles: {
            select: { userId: true },
          },
          teamMembers: {
            where: { isActive: true },
            select: { userId: true },
          },
        },
      },
    },
  });

  let count = 0;

  for (const listing of expiringListings) {
    const company = listing.company;
    const userIds = new Set<string>();
    for (const ep of company.employerProfiles) userIds.add(ep.userId);
    for (const tm of company.teamMembers) userIds.add(tm.userId);

    // Check if we already sent this notification in the last 24h
    const recentNotification = await prisma.notification.findFirst({
      where: {
        type: NOTIFICATION_TYPES.LISTING_EXPIRING,
        userId: { in: Array.from(userIds).slice(0, 1) }, // just check one user
        metadata: { contains: listing.id },
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentNotification) continue;

    const deadlineStr = listing.deadline
      ? listing.deadline.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "soon";

    const notifications = Array.from(userIds).map((userId) => ({
      userId,
      type: NOTIFICATION_TYPES.LISTING_EXPIRING,
      title: `Listing deadline approaching`,
      body: `"${listing.title}" closes on ${deadlineStr}. Consider extending or reviewing applications.`,
      link: `/dashboard/listings/${listing.id}/edit`,
      metadata: JSON.stringify({ listingId: listing.id }),
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
      count += notifications.length;
    }
  }

  return count;
}
