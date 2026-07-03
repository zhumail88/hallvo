import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Pakistani Rupees with South Asian comma grouping.
 * e.g. 150000 → "PKR 1,50,000"
 */
export function formatPKR(val: number): string {
  return `PKR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val)}`
}
