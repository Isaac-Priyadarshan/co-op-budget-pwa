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
  created_by: AppUser
  created_at: string
  transaction_date: string
  type: 'income' | 'expense' | 'transfer'
  wallet_id?: string | null
  transfer_pair_id?: string | null
}

export interface NewTransaction {
  amount: number
  description: string
  category: string
  category_id?: string | null
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
  if (tx.category_id) payload.category_id = tx.category_id

  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Transaction
}

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
    description: note
      ? `Transfer \u2192 ${toLabel}  \u00b7  ${note}`
      : `Transfer \u2192 ${toLabel}`,
  }
  const inRow = {
    ...shared,
    wallet_id: toId,
    description: note
      ? `Transfer \u2190 ${fromLabel}  \u00b7  ${note}`
      : `Transfer \u2190 ${fromLabel}`,
  }

  const { error } = await supabase
    .from('transactions')
    .insert([outRow, inRow])
  if (error) throw new Error(error.message)
}

export async function deleteTransaction(id: string): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, type, amount, wallet_id, transfer_pair_id, description')
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
    description: string
  }

  const pairId = typedRow.transfer_pair_id ?? null

  if (typedRow.type === 'transfer' && pairId) {
    const { data: legs, error: legsErr } = await supabase
      .from('transactions')
      .select('id, wallet_id, amount, description')
      .eq('transfer_pair_id', pairId)

    if (legsErr) throw new Error(legsErr.message)

    const rows = (legs ?? []) as {
      id: string
      wallet_id: string | null
      amount: number
      description: string
    }[]

    const outLeg = rows.find(r => r.description?.includes('\u2192'))
    const inLeg  = rows.find(r => r.description?.includes('\u2190'))

    const balanceOps: Promise<void>[] = []
    if (outLeg?.wallet_id) {
      balanceOps.push(adjustWalletBalance(outLeg.wallet_id, outLeg.amount))
    }
    if (inLeg?.wallet_id) {
      balanceOps.push(adjustWalletBalance(inLeg.wallet_id, -inLeg.amount))
    }
    await Promise.all(balanceOps)

    const { error: pairDeleteErr } = await supabase
      .from('transactions')
      .delete()
      .eq('transfer_pair_id', pairId)
    if (pairDeleteErr) throw new Error(pairDeleteErr.message)

    const { data: ghost } = await supabase
      .from('transactions')
      .select('id')
      .eq('transfer_pair_id', pairId)
    if (ghost && ghost.length > 0) {
      throw new Error('Transfer delete was partially blocked. Please try again.')
    }
    return
  }

  if (typedRow.wallet_id) {
    const delta = typedRow.type === 'expense' ? typedRow.amount : -typedRow.amount
    await adjustWalletBalance(typedRow.wallet_id, delta)
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)

  const { data: ghost, error: checkError } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (checkError) throw new Error(checkError.message)

  if (ghost) {
    const { error: retryError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (retryError) throw new Error(retryError.message)

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

export async function adjustWalletBalance(
  walletId: string,
  delta: number,
): Promise<void> {
  const { data: wallet, error: fetchErr } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', walletId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  const current = (wallet as { balance: number }).balance
  const { error } = await supabase
    .from('wallets')
    .update({ balance: parseFloat((current + delta).toFixed(2)) })
    .eq('id', walletId)
  if (error) throw new Error(error.message)
}

// Alias used by TransferSheet
export async function updateWalletBalance(
  walletId: string,
  delta: number,
): Promise<void> {
  return adjustWalletBalance(walletId, delta)
}

export async function deleteWallet(id: string): Promise<void> {
  const { error } = await supabase
    .from('wallets')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateWalletSortOrders(
  items: { id: string; sort_order: number }[],
): Promise<void> {
  const updates = items.map(item =>
    supabase
      .from('wallets')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
  )
  const results = await Promise.all(updates)
  for (const { error } of results) {
    if (error) throw new Error(error.message)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ASSETS MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface AssetEntry {
  id: string
  label: string
  category: string
  value: number
  owner: 'Isaac' | 'Jenifa' | 'Both'
  notes: string | null
  created_at: string
}

export interface NewAsset {
  label: string
  category: string
  value: number
  owner: 'Isaac' | 'Jenifa' | 'Both'
  notes?: string | null
}

export async function fetchAssets(): Promise<AssetEntry[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AssetEntry[]
}

export async function insertAsset(entry: NewAsset): Promise<AssetEntry> {
  const { data, error } = await supabase
    .from('assets')
    .insert({
      label:    entry.label,
      category: entry.category,
      value:    entry.value,
      owner:    entry.owner,
      notes:    entry.notes ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as AssetEntry
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// LOANS MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface LoanEntry {
  id: string
  label: string
  principal: number
  outstanding: number
  emi_amount: number | null
  interest_rate: number | null
  owner: 'Isaac' | 'Jenifa' | 'Both'
  lender: string
  closed: boolean
  created_at: string
}

export interface NewLoan {
  label: string
  principal: number
  outstanding: number
  emi_amount?: number | null
  interest_rate?: number | null
  owner: 'Isaac' | 'Jenifa' | 'Both'
  lender: string
}

export async function fetchLoans(): Promise<LoanEntry[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as LoanEntry[]\
}

export async function insertLoan(entry: NewLoan): Promise<LoanEntry> {
  const { data, error } = await supabase
    .from('loans')
    .insert({
      label:         entry.label,
      principal:     entry.principal,
      outstanding:   entry.outstanding,
      emi_amount:    entry.emi_amount    ?? null,
      interest_rate: entry.interest_rate ?? null,
      owner:         entry.owner,
      lender:        entry.lender,
      closed:        false,
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
  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ════════════════════════════════════════════════════════════════════════════
// RECURRING PAYMENTS MODULE
// ════════════════════════════════════════════════════════════════════════════

export interface RecurringEntry {
  id: string
  label: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_due: string | null
  owner: 'Isaac' | 'Jenifa' | 'Both'
  active: boolean
  notes: string | null
  created_at: string
}

export interface NewRecurring {
  label: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_due?: string | null
  owner: 'Isaac' | 'Jenifa' | 'Both'
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
      label:     entry.label,
      amount:    entry.amount,
      frequency: entry.frequency,
      next_due:  entry.next_due ?? null,
      owner:     entry.owner,
      active:    true,
      notes:     entry.notes ?? null,
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
  const { error } = await supabase
    .from('recurring_payments')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
