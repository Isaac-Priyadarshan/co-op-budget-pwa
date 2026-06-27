import { supabase } from './supabase'
import type { AppUser } from './types'

// ── Transaction types ──────────────────────────────────────────────────────────
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
  // When provided, this ISO string is used as created_at so user-chosen dates are respected
  transaction_date?: string
}

// ── Fetch all transactions ordered newest first ────────────────────────────────
export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Transaction[]
}

// ── Insert a new transaction ───────────────────────────────────────────────────
// If tx.transaction_date is provided it is used as created_at so that the
// user-selected date is persisted to Supabase instead of defaulting to now().
export async function insertTransaction(tx: NewTransaction): Promise<void> {
  const payload: Record<string, unknown> = {
    amount:      tx.amount,
    description: tx.description,
    category:    tx.category,
    created_by:  tx.created_by,
    type:        tx.type,
  }
  if (tx.wallet_id) payload.wallet_id = tx.wallet_id
  if (tx.transaction_date) payload.created_at = tx.transaction_date

  const { error } = await supabase.from('transactions').insert([payload])
  if (error) throw new Error(error.message)
}

// ── Delete a transaction by id ────────────────────────────────────────────────
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
