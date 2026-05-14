import prisma from "./prisma";

export interface CreditBalance {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
}

/**
 * Get the credit balance for a company. Creates a JobCredit record
 * with zero balance if none exists yet.
 */
export async function getCompanyCredits(companyId: string): Promise<CreditBalance> {
  const credit = await prisma.jobCredit.upsert({
    where: { companyId },
    update: {},
    create: {
      companyId,
      balance: 0,
      totalPurchased: 0,
      totalUsed: 0,
    },
  });
  return {
    balance: credit.balance,
    totalPurchased: credit.totalPurchased,
    totalUsed: credit.totalUsed,
  };
}

/**
 * Deduct credits from a company's balance and create a USAGE transaction.
 * Uses an interactive transaction to prevent race conditions (double-spend).
 * Throws if insufficient balance.
 */
export async function deductCredit(
  companyId: string,
  amount: number,
  description: string,
  listingId?: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Amount to deduct must be positive");
  }

  await prisma.$transaction(async (tx) => {
    const credit = await tx.jobCredit.findUniqueOrThrow({
      where: { companyId },
    });

    if (credit.balance < amount) {
      throw new Error("Insufficient credits");
    }

    const newBalance = credit.balance - amount;

    await tx.jobCredit.update({
      where: { companyId },
      data: {
        balance: newBalance,
        totalUsed: { increment: amount },
      },
    });

    await tx.jobCreditTransaction.create({
      data: {
        creditId: credit.id,
        type: "USAGE",
        amount: -amount,
        balanceAfter: newBalance,
        description,
        listingId,
      },
    });
  });
}

/**
 * Add credits to a company's balance and create a transaction record.
 * Uses an interactive transaction for atomicity.
 */
export async function addCredits(
  companyId: string,
  amount: number,
  type: "PURCHASE" | "REFUND" | "BONUS" | "ADMIN_ADJUST",
  description: string,
  paymentId?: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Amount to add must be positive");
  }

  await prisma.$transaction(async (tx) => {
    const credit = await tx.jobCredit.upsert({
      where: { companyId },
      update: {},
      create: {
        companyId,
        balance: 0,
        totalPurchased: 0,
        totalUsed: 0,
      },
    });

    const newBalance = credit.balance + amount;

    await tx.jobCredit.update({
      where: { companyId },
      data: {
        balance: newBalance,
        ...(type === "PURCHASE" ? { totalPurchased: { increment: amount } } : {}),
      },
    });

    await tx.jobCreditTransaction.create({
      data: {
        creditId: credit.id,
        type,
        amount,
        balanceAfter: newBalance,
        description,
        paymentId,
      },
    });
  });
}

/**
 * Check if a company has at least `required` credits available.
 * Returns true if balance is sufficient, false otherwise.
 */
export async function ensureCreditBalance(
  companyId: string,
  required: number
): Promise<boolean> {
  const credit = await prisma.jobCredit.findUnique({
    where: { companyId },
    select: { balance: true },
  });
  return (credit?.balance ?? 0) >= required;
}
