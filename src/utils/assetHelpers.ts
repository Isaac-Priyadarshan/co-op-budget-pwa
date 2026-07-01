// src/utils/assetHelpers.ts
// Shared pure helpers and types for the Asset module.
// No JSX, no React imports — safe to import from anywhere.

export type AssetItem = {
  id: string
  label: string
  category: string
  value: number
  notes: string | null
  created_at: string
  current_price: number | null
  quantity: number | null
  buy_price: number | null
  last_synced: string | null
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a human-readable
 * Indian locale string, e.g. "01 Jun 2026".
 */
export function fmtStartDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Splits a bank label like "HDFC Bank – Savings" into
 * { bankName: "HDFC Bank", accountType: "Savings" }.
 */
export function splitBankLabel(label: string): {
  bankName: string
  accountType: string
} {
  const idx = label.lastIndexOf(' \u2013 ')
  if (idx === -1) return { bankName: label, accountType: '' }
  return {
    bankName: label.slice(0, idx).trim(),
    accountType: label.slice(idx + 3).trim(),
  }
}

/**
 * Builds the notes string stored in Supabase for a bank asset.
 * Format: "7.50% · From 2024-01-01 · user note"
 */
export function buildNotesStr(
  rate: number | null,
  startDate: string | null,
  userNote: string
): string {
  const metaParts: string[] = []
  if (rate != null) metaParts.push(`${rate.toFixed(2)}%`)
  if (startDate) metaParts.push(`From ${startDate}`)
  return userNote.trim()
    ? [...metaParts, userNote.trim()].join(' \u00b7 ')
    : metaParts.join(' \u00b7 ')
}

/**
 * Returns true if this asset entry is a top-up record
 * (not the original/root asset entry).
 */
export function isTopUp(notes: string | null): boolean {
  return notes?.includes('top-up') ?? false
}

/**
 * Parses the qty and price embedded in stock top-up notes.
 * Notes format: "top-up · qty:10 · price:1500"
 */
export function parseStockTopUpNotes(notes: string | null): {
  qty: number | null
  price: number | null
} {
  if (!notes) return { qty: null, price: null }
  const qtyMatch = notes.match(/qty:(\d+(?:\.\d+)?)/)
  const priceMatch = notes.match(/price:(\d+(?:\.\d+)?)/)
  return {
    qty: qtyMatch ? parseFloat(qtyMatch[1]) : null,
    price: priceMatch ? parseFloat(priceMatch[1]) : null,
  }
}
