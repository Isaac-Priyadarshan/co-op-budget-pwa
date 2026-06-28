// ─── Bank asset note parser + compound-with-topups calculator ────────────────

export interface BankDeposit {
  amount: number      // principal deposited at this point
  startDate: string   // YYYY-MM-DD
  rate: number        // annual interest rate, e.g. 12 for 12%
}

/**
 * Parse a bank asset notes string into { rate, startDate, userNote }.
 * Notes format (set by BankAssetSheet):
 *   "12.00% · From 2024-06-01 · Branch: Koramangala"
 *   "6.50% · From 2024-01-15"
 */
export function parseBankNotes(notes: string | null): {
  rate: number | null
  startDate: string | null
  userNote: string
} {
  if (!notes) return { rate: null, startDate: null, userNote: '' }

  const parts = notes.split(' · ')

  const rateMatch = parts[0]?.match(/^([\d.]+)%/)
  const rate = rateMatch ? parseFloat(rateMatch[1]) : null

  const dateMatch = parts[1]?.match(/From (\d{4}-\d{2}-\d{2})/)
  const startDate = dateMatch ? dateMatch[1] : null

  const userNote = parts.slice(2).join(' · ').trim()

  return { rate, startDate, userNote }
}

/**
 * Compute the current appreciated value of a set of bank deposits
 * using monthly compound interest with top-up merging.
 *
 * Algorithm:
 *  1. Sort deposits by startDate ascending
 *  2. Walk month-by-month from the earliest startDate to today
 *  3. At the start of each month, inject any deposit whose startDate falls in that month
 *  4. At the end of each month, apply one month's interest: principal *= (1 + rate/12/100)
 *  5. Return the final accumulated value
 *
 * All deposits are assumed to have the same annual rate (the rate of the first/root deposit).
 */
export function compoundWithTopUps(
  deposits: BankDeposit[],
  today: Date = new Date(),
): number {
  if (deposits.length === 0) return 0

  // Sort by startDate
  const sorted = [...deposits].sort((a, b) => a.startDate.localeCompare(b.startDate))

  // Use the rate from the earliest deposit (root deposit)
  const annualRate = sorted[0].rate
  const monthlyRate = annualRate / 12 / 100

  // Start walking from year/month of first deposit
  const firstDate = new Date(sorted[0].startDate)
  let curYear  = firstDate.getFullYear()
  let curMonth = firstDate.getMonth() // 0-indexed

  const todayYear  = today.getFullYear()
  const todayMonth = today.getMonth()

  let principal = 0
  let depositIdx = 0

  while (curYear < todayYear || (curYear === todayYear && curMonth <= todayMonth)) {
    // Inject all deposits whose startDate falls in this month
    while (depositIdx < sorted.length) {
      const d = new Date(sorted[depositIdx].startDate)
      if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
        principal += sorted[depositIdx].amount
        depositIdx++
      } else {
        break
      }
    }

    // Apply one month's compound interest (only for completed months)
    const isCurrentMonth = curYear === todayYear && curMonth === todayMonth
    if (!isCurrentMonth) {
      principal = principal * (1 + monthlyRate)
    }

    // Advance to next month
    curMonth++
    if (curMonth > 11) { curMonth = 0; curYear++ }
  }

  return Math.round(principal * 100) / 100
}
