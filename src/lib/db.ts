import { supabase } from './supabase'
import type { AppUser } from './types'

// ════════════════════════════════════════════════════════════════════════════
// TRANSACTION MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface Transaction {
  id: string
  amount: number
  description: string
  category: string
  created_by: AppUser
  created_at: string
  transaction_date: string
  type: 'income' | 'expense'
  wallet_id?: string | null
}

export interface NewTransaction {
  amount: number
  description: string
  category: string
  created_by: AppUser
  type: 'income' | 'expense'
  wallet_id?: string | null
  transaction_date?: string
}

// Normalise any date string or Date object to YYYY-MM-DD.
// Supabase transactions.transaction_date is a DATE column — it rejects ISO timestamps.
function toDateOnly(value?: string | Date): string {
  if (!value) return new Date().toISOString().substring(0, 10)
  if (typeof value === 'string') return value.substring(0, 10)
  return value.toISOString().substring(0, 10)
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Transaction[]
}

export async function insertTransaction(tx: NewTransaction): Promise<Transaction> {
  const payload: Record<string, unknown> = {
    amount: tx.amount,
    description: tx.description,
    category: tx.category,
    created_by: tx.created_by,
    type: tx.type,
    transaction_date: toDateOnly(tx.transaction_date),
  }
  if (tx.wallet_id) payload.wallet_id = tx.wallet_id

  // Use .select().single() so we get the inserted row back.
  // This also confirms the INSERT actually landed — if RLS blocks it,
  // Supabase returns an error here instead of silently swallowing it.
  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Transaction
}

// deleteTransaction — hardened against silent RLS failures.
//
// Problem: supabase.delete().eq() returns { error: null } even when RLS
// blocks the delete — the row is simply not removed. The caller sees
// "success" but the row survives, causing it to reappear on next load.
//
// Fix: after the delete call, immediately SELECT the row. If it still
// exists, the delete was silently blocked — throw an explicit error so
// DataContext rolls back the optimistic UI removal and the user sees
// a real failure message instead of a phantom disappearance.
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Post-delete verification: confirm the row is truly gone.
  const { data: ghost, error: checkError } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (checkError) throw new Error(checkError.message)

  if (ghost) {
    // Row still exists — delete was silently blocked (RLS or network race).
    // Retry once with explicit error on second failure.
    const { error: retryError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (retryError) throw new Error(retryError.message)

    // Final check after retry
    const { data: stillGhost } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (stillGhost) {
      throw new Error(
        'Delete was blocked by database policy. This transaction could not be permanently removed.'
      )
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// WALLET MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface WalletEntry {
  id: string
  label: string
  type: 'cash' | 'credit' | string
  balance: number
  sort_order: number
  updated_at: string
  credit_limit?: number | null
  billing_date?: number | null
  due_date?: number | null
}

export interface NewWallet {
  id?: string
  label: string
  type: 'cash' | 'credit' | string
  balance: number
  sort_order?: number
  credit_limit?: number | null
  billing_date?: number | null
  due_date?: number | null
}

export async function fetchWallets(): Promise<WalletEntry[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as WalletEntry[]
}

export async function upsertWallet(entry: NewWallet): Promise<WalletEntry> {
  const payload: Record<string, unknown> = {
    label: entry.label,
    type: entry.type,
    balance: entry.balance,
    credit_limit: entry.type === 'credit' ? (entry.credit_limit ?? null) : null,
    billing_date: entry.type === 'credit' ? (entry.billing_date ?? null) : null,
    due_date:     entry.type === 'credit' ? (entry.due_date     ?? null) : null,
  }
  if (typeof entry.sort_order === 'number') payload.sort_order = entry.sort_order

  if (entry.id) {
    const { data, error } = await supabase
      .from('wallets')
      .update(payload)
      .eq('id', entry.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as WalletEntry
  }

  const { data, error } = await supabase
    .from('wallets')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as WalletEntry
}

export async function updateWalletBalance(id: string, balance: number): Promise<void> {
  const { error } = await supabase
    .from('wallets')
    .update({ balance: parseFloat(balance.toFixed(2)) })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// adjustWalletBalance — atomically applies a signed delta to a wallet's balance.
//
// income  transaction → delta = +amount  (balance goes up)
// expense transaction → delta = -amount  (balance goes down)
//
// We fetch the current balance first, then write balance + delta.
// This is safe for a 2-person private app where concurrent writes are rare.
// The balance is clamped to 2 decimal places to avoid floating-point drift.
export async function adjustWalletBalance(walletId: string, delta: number): Promise<void> {
  // 1. Fetch current balance
  const { data, error: fetchErr } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', walletId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const current = (data as { balance: number }).balance ?? 0
  const next    = parseFloat((current + delta).toFixed(2))

  // 2. Write new balance
  const { error: updateErr } = await supabase
    .from('wallets')
    .update({ balance: next })
    .eq('id', walletId)
  if (updateErr) throw new Error(updateErr.message)
}

export async function updateWalletSortOrders(
  updates: { id: string; sort_order: number }[]
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('wallets').update({ sort_order }).eq('id', id)
    )
  )
}

export async function deleteWallet(id: string): Promise<void> {
  const { error } = await supabase.from('wallets').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// LOAN MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface LoanEntry {
  id: string
  label: string
  lender: string
  owner: AppUser
  principal: number
  outstanding: number
  emi_amount: number
  interest_rate: number
  closed: boolean
  created_at: string
}

export interface NewLoan {
  label: string
  lender: string
  owner: AppUser
  principal: number
  outstanding: number
  emi_amount: number
  interest_rate?: number
  closed?: boolean
}

export async function fetchLoans(): Promise<LoanEntry[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as LoanEntry[]
}

export async function insertLoan(entry: NewLoan): Promise<LoanEntry> {
  const { data, error } = await supabase
    .from('loans')
    .insert({
      label: entry.label,
      lender: entry.lender,
      owner: entry.owner,
      principal: entry.principal,
      outstanding: entry.outstanding,
      emi_amount: entry.emi_amount,
      interest_rate: entry.interest_rate ?? 0,
      closed: entry.closed ?? false,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LoanEntry
}

export async function closeLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').update({ closed: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// RECURRING MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface RecurringEntry {
  id: string
  label: string
  category: string
  owner: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | string
  next_due: string
  active: boolean
  created_at: string
}

export interface NewRecurring {
  label: string
  category: string
  owner: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | string
  next_due: string
  active?: boolean
  notes?: string
}

export async function fetchRecurring(): Promise<RecurringEntry[]> {
  const { data, error } = await supabase
    .from('recurring')
    .select('*')
    .order('next_due', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as RecurringEntry[]
}

export async function insertRecurring(entry: NewRecurring): Promise<RecurringEntry> {
  const { data, error } = await supabase
    .from('recurring')
    .insert({
      label: entry.label,
      category: entry.category,
      owner: entry.owner,
      amount: entry.amount,
      frequency: entry.frequency,
      next_due: entry.next_due,
      active: entry.active ?? true,
      notes: entry.notes ?? '',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as RecurringEntry
}

export async function toggleRecurring(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('recurring').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// LENT MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface LentEntry {
  id: string
  person: string
  description: string
  lent_by: AppUser
  amount: number
  settled: boolean
  created_at: string
}

export interface NewLent {
  person: string
  description?: string
  lent_by: AppUser
  amount: number
  settled?: boolean
}

export async function fetchLent(): Promise<LentEntry[]> {
  const { data, error } = await supabase
    .from('lent')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as LentEntry[]
}

export async function insertLent(entry: NewLent): Promise<LentEntry> {
  const { data, error } = await supabase
    .from('lent')
    .insert({
      person: entry.person,
      description: entry.description ?? '',
      lent_by: entry.lent_by,
      amount: entry.amount,
      settled: entry.settled ?? false,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LentEntry
}

export async function settleLent(id: string): Promise<void> {
  const { error } = await supabase.from('lent').update({ settled: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteLent(id: string): Promise<void> {
  const { error } = await supabase.from('lent').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// BORROWED MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface BorrowedEntry {
  id: string
  person: string
  description: string
  borrowed_by: AppUser
  amount: number
  settled: boolean
  created_at: string
}

export interface NewBorrowed {
  person: string
  description?: string
  borrowed_by: AppUser
  amount: number
  settled?: boolean
}

export async function fetchBorrowed(): Promise<BorrowedEntry[]> {
  const { data, error } = await supabase
    .from('borrowed')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as BorrowedEntry[]
}

export async function insertBorrowed(entry: NewBorrowed): Promise<BorrowedEntry> {
  const { data, error } = await supabase
    .from('borrowed')
    .insert({
      person: entry.person,
      description: entry.description ?? '',
      borrowed_by: entry.borrowed_by,
      amount: entry.amount,
      settled: entry.settled ?? false,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as BorrowedEntry
}

export async function settleBorrowed(id: string): Promise<void> {
  const { error } = await supabase.from('borrowed').update({ settled: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteBorrowed(id: string): Promise<void> {
  const { error } = await supabase.from('borrowed').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// ASSET MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface AssetEntry {
  id: string
  label: string
  category: string
  value: number
  owner: string
  notes: string
  created_at: string
}

export interface NewAsset {
  label: string
  category: string
  value: number
  owner: string
  notes?: string
}

export async function fetchAssets(): Promise<AssetEntry[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('value', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AssetEntry[]
}

export async function insertAsset(entry: NewAsset): Promise<AssetEntry> {
  const { data, error } = await supabase
    .from('assets')
    .insert({
      label: entry.label,
      category: entry.category,
      value: entry.value,
      owner: entry.owner,
      notes: entry.notes ?? '',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as AssetEntry
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
