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
  type: 'income' | 'expense' | 'transfer'
  wallet_id?: string | null
  // Links the OUT row and IN row of a transfer together.
  // Both rows share the same transfer_pair_id UUID.
  // NULL for every non-transfer transaction.
  transfer_pair_id?: string | null
}

export interface NewTransaction {
  amount: number
  description: string
  category: string
  created_by: AppUser
  type: 'income' | 'expense' | 'transfer'
  wallet_id?: string | null
  transaction_date?: string
}

// Normalise any date string or Date object to YYYY-MM-DD.
// Supabase transactions.transaction_date is a DATE column — never send a full ISO timestamp.
function toDateOnly(value?: string | Date): string {
  if (!value) return new Date().toISOString().substring(0, 10)
  if (typeof value === 'string') return value.substring(0, 10)
  return value.toISOString().substring(0, 10)
}

// Simple UUID v4 generator — no external dependency needed.
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

  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Transaction
}

// ── insertTransferPair ───────────────────────────────────────────────────────
// Writes TWO transaction rows — one OUT (source wallet) and one IN (destination).
// Both rows share the same transfer_pair_id so:
//   • Ledger can show only the OUT leg (one line per transfer)
//   • Deleting either leg auto-cascades to delete the paired leg
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
  const pairId = uuidv4()          // shared link between the two rows

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
      ? `Transfer → ${toLabel}  ·  ${note}`
      : `Transfer → ${toLabel}`,
  }
  const inRow = {
    ...shared,
    wallet_id: toId,
    description: note
      ? `Transfer ← ${fromLabel}  ·  ${note}`
      : `Transfer ← ${fromLabel}`,
  }

  const { error } = await supabase
    .from('transactions')
    .insert([outRow, inRow])
  if (error) throw new Error(error.message)
}

// ── deleteTransaction ────────────────────────────────────────────────────────
// Deletes a transaction row AND reverses its effect on wallet balance(s).
//
// Balance reversal rules:
//   • expense  → add amount BACK to wallet   (+delta)
//   • income   → subtract amount FROM wallet (-delta)
//   • transfer → add amount BACK to source wallet (OUT leg)
//               subtract amount FROM destination wallet (IN leg)
//
// For transfers, both legs are deleted atomically via transfer_pair_id.
export async function deleteTransaction(id: string): Promise<void> {
  // ── Step 1: read the target row ──────────────────────────────────────────
  const { data: row, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, type, amount, wallet_id, transfer_pair_id, description')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) throw new Error(fetchErr.message)
  if (!row) return // already gone — nothing to do

  const typedRow = row as {
    id: string
    type: 'income' | 'expense' | 'transfer'
    amount: number
    wallet_id: string | null
    transfer_pair_id: string | null
    description: string
  }

  const pairId = typedRow.transfer_pair_id ?? null

  // ── TRANSFER: fetch both legs, reverse both wallets, delete by pair ──────
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

    // OUT leg: description contains '→' — source wallet gets money back (+)
    // IN  leg: description contains '←' — destination wallet loses money  (-)
    const outLeg = rows.find(r => r.description?.includes('→'))
    const inLeg  = rows.find(r => r.description?.includes('←'))

    const balanceOps: Promise<void>[] = []

    if (outLeg?.wallet_id) {
      // Source wallet: add back the transferred amount
      balanceOps.push(adjustWalletBalance(outLeg.wallet_id, outLeg.amount))
    }
    if (inLeg?.wallet_id) {
      // Destination wallet: subtract the received amount
      balanceOps.push(adjustWalletBalance(inLeg.wallet_id, -inLeg.amount))
    }

    // Run balance adjustments first, then delete both rows
    await Promise.all(balanceOps)

    const { error: pairDeleteErr } = await supabase
      .from('transactions')
      .delete()
      .eq('transfer_pair_id', pairId)

    if (pairDeleteErr) throw new Error(pairDeleteErr.message)

    // Ghost check
    const { data: ghost } = await supabase
      .from('transactions')
      .select('id')
      .eq('transfer_pair_id', pairId)

    if (ghost && ghost.length > 0) {
      throw new Error('Transfer delete was partially blocked. Please try again.')
    }

    return
  }

  // ── INCOME / EXPENSE: reverse wallet balance, then delete ────────────────
  if (typedRow.wallet_id) {
    // expense removed → money comes back  → positive delta
    // income  removed → money goes away   → negative delta
    const delta = typedRow.type === 'expense' ? typedRow.amount : -typedRow.amount
    await adjustWalletBalance(typedRow.wallet_id, delta)
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Ghost check with one retry
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
      .eq('id')
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

export async function adjustWalletBalance(walletId: string, delta: number): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', walletId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const current = (data as { balance: number }).balance ?? 0
  const next    = parseFloat((current + delta).toFixed(2))

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
