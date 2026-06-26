import { supabase } from './supabase'
import type { AppUser } from './types'

// ── Transactions ──────────────────────────────────────────────
export interface Transaction {
  id: string; amount: number; description: string; category: string
  created_by: AppUser; type: 'income' | 'expense'; created_at: string
}
export type NewTransaction = Omit<Transaction, 'id' | 'created_at'>
export async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false })
  if (error) throw error; return data as Transaction[]
}
export async function insertTransaction(tx: NewTransaction): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').insert(tx).select().single()
  if (error) throw error; return data as Transaction
}
export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// ── Borrowed ──────────────────────────────────────────────────
export interface BorrowedEntry {
  id: string; person: string; amount: number; description: string
  borrowed_by: AppUser; settled: boolean; created_at: string
}
export type NewBorrowed = Omit<BorrowedEntry, 'id' | 'created_at' | 'settled'>
export async function fetchBorrowed(): Promise<BorrowedEntry[]> {
  const { data, error } = await supabase.from('borrowed').select('*').order('created_at', { ascending: false })
  if (error) throw error; return data as BorrowedEntry[]
}
export async function insertBorrowed(entry: NewBorrowed): Promise<BorrowedEntry> {
  const { data, error } = await supabase.from('borrowed').insert({ ...entry, settled: false }).select().single()
  if (error) throw error; return data as BorrowedEntry
}
export async function settleBorrowed(id: string): Promise<void> {
  const { error } = await supabase.from('borrowed').update({ settled: true }).eq('id', id)
  if (error) throw error
}
export async function deleteBorrowed(id: string): Promise<void> {
  const { error } = await supabase.from('borrowed').delete().eq('id', id)
  if (error) throw error
}

// ── Lent ──────────────────────────────────────────────────────
export interface LentEntry {
  id: string; person: string; amount: number; description: string
  lent_by: AppUser; settled: boolean; created_at: string
}
export type NewLent = Omit<LentEntry, 'id' | 'created_at' | 'settled'>
export async function fetchLent(): Promise<LentEntry[]> {
  const { data, error } = await supabase.from('lent').select('*').order('created_at', { ascending: false })
  if (error) throw error; return data as LentEntry[]
}
export async function insertLent(entry: NewLent): Promise<LentEntry> {
  const { data, error } = await supabase.from('lent').insert({ ...entry, settled: false }).select().single()
  if (error) throw error; return data as LentEntry
}
export async function settleLent(id: string): Promise<void> {
  const { error } = await supabase.from('lent').update({ settled: true }).eq('id', id)
  if (error) throw error
}
export async function deleteLent(id: string): Promise<void> {
  const { error } = await supabase.from('lent').delete().eq('id', id)
  if (error) throw error
}

// ── Wallets ───────────────────────────────────────────────────
export interface WalletEntry {
  id: string; owner: AppUser; type: 'cash' | 'credit'
  label: string; balance: number; updated_at: string
}
export type NewWallet = Omit<WalletEntry, 'id' | 'updated_at'>
export async function fetchWallets(): Promise<WalletEntry[]> {
  const { data, error } = await supabase.from('wallets').select('*').order('owner').order('type')
  if (error) throw error; return data as WalletEntry[]
}
export async function upsertWallet(entry: NewWallet): Promise<WalletEntry> {
  const { data, error } = await supabase
    .from('wallets').upsert({ ...entry, updated_at: new Date().toISOString() }, { onConflict: 'owner,label' })
    .select().single()
  if (error) throw error; return data as WalletEntry
}
export async function deleteWallet(id: string): Promise<void> {
  const { error } = await supabase.from('wallets').delete().eq('id', id)
  if (error) throw error
}

// ── Loans ─────────────────────────────────────────────────────
export interface LoanEntry {
  id: string; label: string; principal: number; outstanding: number
  emi_amount: number; interest_rate: number; owner: AppUser
  lender: string; closed: boolean; created_at: string
}
export type NewLoan = Omit<LoanEntry, 'id' | 'created_at' | 'closed'>
export async function fetchLoans(): Promise<LoanEntry[]> {
  const { data, error } = await supabase.from('loans').select('*').order('created_at', { ascending: false })
  if (error) throw error; return data as LoanEntry[]
}
export async function insertLoan(entry: NewLoan): Promise<LoanEntry> {
  const { data, error } = await supabase.from('loans').insert({ ...entry, closed: false }).select().single()
  if (error) throw error; return data as LoanEntry
}
export async function closeLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').update({ closed: true }).eq('id', id)
  if (error) throw error
}
export async function deleteLoan(id: string): Promise<void> {
  const { error } = await supabase.from('loans').delete().eq('id', id)
  if (error) throw error
}

// ── Assets ────────────────────────────────────────────────────
export interface AssetEntry {
  id: string; label: string; category: string
  value: number; owner: string; notes: string; created_at: string
}
export type NewAsset = Omit<AssetEntry, 'id' | 'created_at'>
export async function fetchAssets(): Promise<AssetEntry[]> {
  const { data, error } = await supabase.from('assets').select('*').order('value', { ascending: false })
  if (error) throw error; return data as AssetEntry[]
}
export async function insertAsset(entry: NewAsset): Promise<AssetEntry> {
  const { data, error } = await supabase.from('assets').insert(entry).select().single()
  if (error) throw error; return data as AssetEntry
}
export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}
