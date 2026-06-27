import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { adjustWalletBalance } from '../lib/db'
import type { AppUser } from '../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────
export type BorrowedStatus = 'pending' | 'partial' | 'settled'

export interface BorrowedEntry {
  id: string
  person: string
  description: string
  borrowed_by: AppUser
  amount: number
  paid_amount: number
  status: BorrowedStatus
  due_date: string | null
  source_wallet_id: string | null
  created_at: string
}

export interface NewBorrowed {
  person: string
  description?: string
  borrowed_by: AppUser
  amount: number
  due_date?: string | null
  source_wallet_id?: string | null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBorrowed() {
  const [entries, setEntries]   = useState<BorrowedEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)
  const [saving,  setSaving]    = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const { data, error: err } = await supabase
        .from('borrowed')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw new Error(err.message)
      setEntries((data ?? []) as BorrowedEntry[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Add new borrowed entry + credit source wallet ──
  const addBorrowed = useCallback(async (entry: NewBorrowed) => {
    setSaving(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('borrowed')
        .insert({
          person:           entry.person,
          description:      entry.description ?? '',
          borrowed_by:      entry.borrowed_by,
          amount:           entry.amount,
          paid_amount:      0,
          status:           'pending',
          due_date:         entry.due_date ?? null,
          source_wallet_id: entry.source_wallet_id ?? null,
        })
        .select()
        .single()
      if (err) throw new Error(err.message)
      // Credit the wallet — money received
      if (entry.source_wallet_id) {
        await adjustWalletBalance(entry.source_wallet_id, entry.amount)
      }
      setEntries(prev => [data as BorrowedEntry, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [])

  // ── Partial payment — debit wallet, update paid_amount ──
  const makePayment = useCallback(async (
    id: string,
    payAmount: number,
    walletId: string,
  ) => {
    setSaving(true); setError(null)
    try {
      const entry = entries.find(e => e.id === id)
      if (!entry) throw new Error('Entry not found')
      const newPaid = parseFloat((entry.paid_amount + payAmount).toFixed(2))
      const remaining = parseFloat((entry.amount - newPaid).toFixed(2))
      const newStatus: BorrowedStatus = remaining <= 0 ? 'settled' : 'partial'

      const { data, error: err } = await supabase
        .from('borrowed')
        .update({ paid_amount: newPaid, status: newStatus })
        .eq('id', id)
        .select()
        .single()
      if (err) throw new Error(err.message)
      // Debit the wallet — money sent back
      await adjustWalletBalance(walletId, -payAmount)
      setEntries(prev => prev.map(e => e.id === id ? data as BorrowedEntry : e))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [entries])

  // ── Mark fully settled — debit remaining from wallet ──
  const markSettled = useCallback(async (
    id: string,
    walletId: string,
  ) => {
    setSaving(true); setError(null)
    try {
      const entry = entries.find(e => e.id === id)
      if (!entry) throw new Error('Entry not found')
      const remaining = parseFloat((entry.amount - entry.paid_amount).toFixed(2))

      const { data, error: err } = await supabase
        .from('borrowed')
        .update({ paid_amount: entry.amount, status: 'settled' })
        .eq('id', id)
        .select()
        .single()
      if (err) throw new Error(err.message)
      if (remaining > 0) {
        await adjustWalletBalance(walletId, -remaining)
      }
      setEntries(prev => prev.map(e => e.id === id ? data as BorrowedEntry : e))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [entries])

  // ── Delete entry (no wallet reversal — manual decision) ──
  const removeEntry = useCallback(async (id: string) => {
    setSaving(true); setError(null)
    try {
      const { error: err } = await supabase.from('borrowed').delete().eq('id', id)
      if (err) throw new Error(err.message)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }, [])

  const totalOwed = entries
    .filter(e => e.status !== 'settled')
    .reduce((s, e) => s + (e.amount - e.paid_amount), 0)

  const nearestDue = entries
    .filter(e => e.status !== 'settled' && e.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0] ?? null

  return {
    entries, loading, error, saving,
    addBorrowed, makePayment, markSettled, removeEntry,
    totalOwed, nearestDue,
    refresh: load,
  }
}
