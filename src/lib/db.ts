import { supabase } from './supabase'
import type { AppUser } from './types'

export interface Transaction {
  id: string
  amount: number
  description: string
  category: string
  created_by: AppUser
  type: 'income' | 'expense'
  created_at: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'created_at'>

// ── Transactions ──────────────────────────────────────────────
export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Transaction[]
}

export async function insertTransaction(tx: NewTransaction): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(tx)
    .select()
    .single()
  if (error) throw error
  return data as Transaction
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}
