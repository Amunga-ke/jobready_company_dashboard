export interface FeaturedDurationOption {
  days: number;
  price: number;
  label: string;
  popular: boolean;
}

export const FEATURED_DURATION_OPTIONS: FeaturedDurationOption[] = [
  { days: 7, price: 999, label: "7 Days", popular: false },
  { days: 14, price: 1799, label: "14 Days", popular: false },
  { days: 30, price: 2999, label: "30 Days", popular: true },
];

export const VALID_DURATION_DAYS = [7, 14, 30];

/**
 * Get the price for a featured boost duration.
 * Returns null if the duration is not valid.
 */
export function getFeaturedPrice(durationDays: number): number | null {
  const option = FEATURED_DURATION_OPTIONS.find((o) => o.days === durationDays);
  return option ? option.price : null;
}

/**
 * Format a price in KES.
 */
export function formatFeaturedPrice(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
