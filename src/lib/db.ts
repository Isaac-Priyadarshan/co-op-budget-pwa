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
  category_id?: string | null
  subcategory_id?: string | null
  created_by: AppUser
  created_at: string
  transaction_date: string
  type: 'income' | 'expense' | 'transfer'
  wallet_id?: string | null
  transfer_pair_id?: string | null
  // transfer_direction is stored on each leg so deletion never relies on
  // arrow characters in the user-supplied description string.
  // 'out' = money leaving this wallet, 'in' = money arriving in this wallet.
  transfer_direction?: 'in' | 'out' | null
}

export interface NewTransaction {
  amount: number
  description: string
  category: string
  category_id?: string | null
  subcategory_id?: string | null
  created_by: AppUser
  type: 'income' | 'expense' | 'transfer'
  wallet_id?: string | null
  transaction_date?: string
}

function toDateOnly(value?: string | Date): string {
  if (!value) return new Date().toISOString().substring(0, 10)
  if (typeof value === 'string') return value.substring(0, 10)
  return value.toISOString().substring(0, 10)
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ── Atomic wallet balance helper ─────────────────────────────────────────────
// Uses the Supabase RPC `adjust_wallet_balance` which executes
// UPDATE wallets SET balance = balance + delta WHERE id = ?  in a single
// atomic statement — no read-then-write race condition.
async function atomicAdjustBalance(walletId: string, delta: number): Promise<void> {
  const { error } = await supabase.rpc('adjust_wallet_balance', {
    p_wallet_id: walletId,
    p_delta: delta,
  })
  if (error) throw new Error(error.message)
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
  if (tx.wallet_id)       payload.wallet_id       = tx.wallet_id
  if (tx.category_id)     payload.category_id     = tx.category_id
  if (tx.subcategory_id)  payload.subcategory_id  = tx.subcategory_id

  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Transaction
}

// insertTransferPair: atomically adjusts both wallet balances.
// transfer_direction column ('out' / 'in') is stored on each leg
// so deletion never parses arrow characters from the user's note string.
export async function insertTransferPair(
  fromId: string,
  fromLabel: string,
  toId: string,
  toLabel: string,
  amount: number,
  note: string,
  createdBy: AppUser,
): Promise<void> {
  const today  = toDateOnly()
  const pairId = uuidv4()
  const shared = {
    amount,
    category: 'Transfer',
    created_by: createdBy,
    type: 'transfer' as const,
    transaction_date: today,
    transfer_pair_id: pairId,
  }
  const outRow = {
    ...shared,
    wallet_id: fromId,
    transfer_direction: 'out' as const,
    description: note
      ? `Transfer to ${toLabel}  ·  ${note}`
      : `Transfer to ${toLabel}`,
  }
  const inRow = {
    ...shared,
    wallet_id: toId,
    transfer_direction: 'in' as const,
    description: note
      ? `Transfer from ${fromLabel}  ·  ${note}`
      : `Transfer from ${fromLabel}`,
  }

  const { error } = await supabase.from('transactions').insert([outRow, inRow])
  if (error) throw new Error(error.message)

  // Adjust both wallet balances after the rows are committed.
  await Promise.all([
    atomicAdjustBalance(fromId, -amount),
    atomicAdjustBalance(toId,    amount),
  ])
}

// deleteTransaction — fully hardened:
// Uses transfer_direction column (not arrow chars) to tell legs apart.
// All balance adjustments go through atomicAdjustBalance (RPC).
export async function deleteTransaction(id: string): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, type, amount, wallet_id, transfer_pair_id, transfer_direction')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!row) return

  const typedRow = row as {
    id: string
    type: 'income' | 'expense' | 'transfer'
    amount: number
    wallet_id: string | null
    transfer_pair_id: string | null
    transfer_direction: 'in' | 'out' | null
  }

  const pairId = typedRow.transfer_pair_id ?? null

  if (typedRow.type === 'transfer' && pairId) {
    const { data: legs, error: legsErr } = await supabase
      .from('transactions')
      .select('id, wallet_id, amount, transfer_direction')
      .eq('transfer_pair_id', pairId)
    if (legsErr) throw new Error(legsErr.message)

    const rows = (legs ?? []) as {
      id: string
      wallet_id: string | null
      amount: number
      transfer_direction: 'in' | 'out' | null
    }[]

    const outLeg = rows.find(r => r.transfer_direction === 'out')
    const inLeg  = rows.find(r => r.transfer_direction === 'in')

    const balanceOps: Promise<void>[] = []
    if (outLeg?.wallet_id) balanceOps.push(atomicAdjustBalance(outLeg.wallet_id,  outLeg.amount))
    if (inLeg?.wallet_id)  balanceOps.push(atomicAdjustBalance(inLeg.wallet_id,  -inLeg.amount))
    await Promise.all(balanceOps)

    const { error: pairDeleteErr } = await supabase
      .from('transactions')
      .delete()
      .eq('transfer_pair_id', pairId)
    if (pairDeleteErr) throw new Error(pairDeleteErr.message)
    return
  }

  // Income / expense: reverse the wallet impact before deleting
  if (typedRow.wallet_id) {
    const delta = typedRow.type === 'expense' ? typedRow.amount : -typedRow.amount
    await atomicAdjustBalance(typedRow.wallet_id, delta)
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// WALLET MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface WalletEntry {
  id: string; label: string; type: 'cash' | 'credit' | string
  balance: number; sort_order: number; updated_at: string
  credit_limit?: number | null; billing_date?: number | null; due_date?: number | null
}

export interface NewWallet {
  id?: string; label: string; type: 'cash' | 'credit' | string
  balance: number; sort_order?: number
  credit_limit?: number | null; billing_date?: number | null; due_date?: number | null
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

// Public wrapper — delegates to atomic RPC. Kept for callers in DataContext.
export async function adjustWalletBalance(walletId: string, delta: number): Promise<void> {
  return atomicAdjustBalance(walletId, delta)
}
// LEFTOVER-02 REMOVED: updateWalletBalance was a dead duplicate of adjustWalletBalance.
// It was never imported anywhere. Removed to keep the public API surface clean.

export async function deleteWallet(id: string): Promise<void> {
  const { error } = await supabase.from('wallets').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateWalletSortOrders(
  items: { id: string; sort_order: number }[],
): Promise<void> {
  const results = await Promise.all(
    items.map(item =>
      supabase.from('wallets').update({ sort_order: item.sort_order }).eq('id', item.id),
    ),
  )
  for (const { error } of results) {
    if (error) throw new Error(error.message)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ASSETS MODULE  (extended with live market columns)
// ════════════════════════════════════════════════════════════════════════════

export interface AssetEntry {
  id: string; label: string; category: string; value: number
  owner: 'Isaac' | 'Jenifa' | 'Both'
  notes: string | null; created_at: string
  ticker: string | null; quantity: number | null
  buy_price: number | null; current_price: number | null; last_synced: string | null
  sort_order?: number | null
}

export interface NewAsset {
  label: string; category: string; value: number
  owner: 'Isaac' | 'Jenifa' | 'Both'
  notes?: string | null
  ticker?: string | null; quantity?: number | null
  buy_price?: number | null; current_price?: number | null
}

export interface AssetPatch {
  label?:         string
  notes?:         string | null
  sort_order?:    number
  current_price?: number | null
  last_synced?:   string | null
}

// ORDER BY sort_order first so drag-reorder persists across fetches.
// Falls back to created_at DESC for rows where sort_order is not yet set.
export async function fetchAssets(): Promise<AssetEntry[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AssetEntry[]
}

export async function insertAsset(entry: NewAsset): Promise<AssetEntry> {
  const payload: Record<string, unknown> = {
    label: entry.label,
    category: entry.category,
    value: entry.value,
    owner: entry.owner,
    notes: entry.notes ?? null,
  }
  if (entry.ticker        != null) payload.ticker        = entry.ticker
  if (entry.quantity      != null) payload.quantity      = entry.quantity
  if (entry.buy_price     != null) payload.buy_price     = entry.buy_price
  if (entry.current_price != null) payload.current_price = entry.current_price
  const { data, error } = await supabase
    .from('assets')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as AssetEntry
}

export async function updateAsset(id: string, patch: AssetPatch): Promise<AssetEntry> {
  const { data, error } = await supabase
    .from('assets')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as AssetEntry
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// LOANS MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface LoanEntry {
  id: string; label: string; principal: number; outstanding: number
  emi_amount: number | null; interest_rate: number | null; lender: string
  closed: boolean; created_at: string; start_date: string | null; end_date: string | null
}

export interface NewLoan {
  label: string; principal: number; outstanding: number
  emi_amount?: number | null; interest_rate?: number | null; lender: string
  start_date?: string | null; end_date?: string | null
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
      principal: entry.principal,
      outstanding: entry.outstanding,
      emi_amount: entry.emi_amount ?? null,
      interest_rate: entry.interest_rate ?? null,
      lender: entry.lender,
      owner: 'Both',
      closed: false,
      start_date: entry.start_date ?? null,
      end_date: entry.end_date ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LoanEntry
}

export async function closeLoan(id: string): Promise<void> {
  const { error } = await supabase
    .from('loans')
    .update({ closed: true, outstanding: 0 })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// RECURRING PAYMENTS MODULE
// ════════════════════════════════════════════════════════════════════════════

// BUG-03 FIX: Added 'quarterly' to both RecurringEntry and NewRecurring
// The Supabase schema supports this enum value but TypeScript was missing it,
// causing type errors when quarterly records were fetched from the database.
export interface RecurringEntry {
  id: string; label: string; amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  next_due: string | null; owner: 'Isaac' | 'Jenifa' | 'Both'
  active: boolean; notes: string | null; created_at: string
}

export interface NewRecurring {
  label: string; amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  next_due?: string | null; owner: 'Isaac' | 'Jenifa' | 'Both'
  notes?: string | null
}

export async function fetchRecurring(): Promise<RecurringEntry[]> {
  const { data, error } = await supabase
    .from('recurring_payments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as RecurringEntry[]
}

export async function insertRecurring(entry: NewRecurring): Promise<RecurringEntry> {
  const { data, error } = await supabase
    .from('recurring_payments')
    .insert({
      label: entry.label,
      amount: entry.amount,
      frequency: entry.frequency,
      next_due: entry.next_due ?? null,
      owner: entry.owner,
      active: true,
      notes: entry.notes ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as RecurringEntry
}

export async function toggleRecurring(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('recurring_payments')
    .update({ active })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_payments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
