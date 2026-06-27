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

export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Transaction[]
}

export async function insertTransaction(tx: NewTransaction): Promise<void> {
  const payload: Record<string, unknown> = {
    amount: tx.amount,
    description: tx.description,
    category: tx.category,
    created_by: tx.created_by,
    type: tx.type,
  }
  if (tx.wallet_id) payload.wallet_id = tx.wallet_id
  if (tx.transaction_date) payload.created_at = tx.transaction_date
  const { error } = await supabase.from('transactions').insert([payload])
  if (error) throw new Error(error.message)
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// WALLET MODULE
// Wallets are shared between Isaac & Jenifa — no owner field needed.
// DB migration required before deploying:
//   ALTER TABLE wallets ALTER COLUMN owner DROP NOT NULL;
//   ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_owner_check;
//   ALTER TABLE wallets ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
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

// Batch-update sort_order for a list of wallets after drag-to-reorder.
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
