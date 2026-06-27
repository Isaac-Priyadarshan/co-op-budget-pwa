import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { adjustWalletBalance, insertTransaction } from '../lib/db'
import type { AppUser } from '../lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────
export type LentStatus = 'pending' | 'partial' | 'settled'

export interface LentEntry {
  id: string
  person: string
  description: string
  lent_by: AppUser
  amount: number
  paid_amount: number
  status: LentStatus
  due_date: string | null
  source_wallet_id: string | null
  created_at: string
  sort_order?: number
}

export interface NewLent {
  person: string
  description?: string
  lent_by: AppUser
  amount: number
  due_date?: string | null
  source_wallet_id?: string | null
}

export interface EditLentPayload {
  person: string
  description: string
  due_date: string | null
}

// ─── Helper: today as YYYY-MM-DD ──────────────────────────────────────────────
function todayISO(): string {
  return new Date().toISOString().substring(0, 10)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLent() {
  const [entries, setEntries] = useState<LentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const { data, error: err } = await supabase
        .from('lent')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw new Error(err.message)
      setEntries((data ?? []) as LentEntry[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Add new lent entry + DEDUCT from wallet + auto ledger transaction ─────
  // Logic: when you LEND money, it goes OUT of your wallet (expense)
  const addLent = useCallback(async (entry: NewLent) => {
    setSaving(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('lent')
        .insert({
          person:           entry.person,
          description:      entry.description ?? '',
          lent_by:          entry.lent_by,
          amount:           entry.amount,
          paid_amount:      0,
          status:           'pending',
          due_date:         entry.due_date ?? null,
          source_wallet_id: entry.source_wallet_id ?? null,
        })
        .select()
        .single()
      if (err) throw new Error(err.message)

      // DEDUCT from wallet — money left your wallet
      if (entry.source_wallet_id) {
        await adjustWalletBalance(entry.source_wallet_id, -entry.amount)
      }

      await insertTransaction({
        type:             'expense',
        category:         'Lent',
        description:      `Lent to ${entry.person}`,
        amount:           entry.amount,
        created_by:       entry.lent_by,
        wallet_id:        entry.source_wallet_id ?? null,
        transaction_date: todayISO(),
      })

      setEntries(prev => [data as LentEntry, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [])

  // ── Edit existing entry — person, description, due_date only ─────────────
  const editLent = useCallback(async (id: string, payload: EditLentPayload) => {
    setSaving(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('lent')
        .update({
          person:      payload.person,
          description: payload.description,
          due_date:    payload.due_date,
        })
        .eq('id', id)
        .select()
        .single()
      if (err) throw new Error(err.message)
      setEntries(prev => prev.map(e => e.id === id ? data as LentEntry : e))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

  // ── Reorder entries locally — optimistic, no schema change needed ─────────
  const reorderEntries = useCallback((newOrder: LentEntry[]) => {
    setEntries(newOrder)
  }, [])

  // ── Lend more — DEDUCT more from wallet (re-opens settled entries) ────────
  // Logic: lending MORE money = more goes OUT of your wallet
  const addMoreAmount = useCallback(async (
    id: string,
    extraAmount: number,
    walletId: string,
  ) => {
    setSaving(true); setError(null)
    try {
      const entry = entries.find(e => e.id === id)
      if (!entry) throw new Error('Entry not found')

      const newTotal  = parseFloat((entry.amount + extraAmount).toFixed(2))
      const newStatus: LentStatus = entry.status === 'settled' ? 'pending' : entry.status

      const { data, error: err } = await supabase
        .from('lent')
        .update({ amount: newTotal, status: newStatus })
        .eq('id', id)
        .select()
        .single()
      if (err) throw new Error(err.message)

      // DEDUCT from wallet — more money went out
      await adjustWalletBalance(walletId, -extraAmount)

      await insertTransaction({
        type:             'expense',
        category:         'Lent',
        description:      `Lent more to ${entry.person}`,
        amount:           extraAmount,
        created_by:       entry.lent_by,
        wallet_id:        walletId,
        transaction_date: todayISO(),
      })

      setEntries(prev => prev.map(e => e.id === id ? data as LentEntry : e))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [entries])

  // ── Partial recovery — ADD to wallet (money comes back) ───────────────────
  // Logic: when someone returns part of the money, wallet INCREASES
  const makePayment = useCallback(async (
    id: string,
    payAmount: number,
    walletId: string,
  ) => {
    setSaving(true); setError(null)
    try {
      const entry = entries.find(e => e.id === id)
      if (!entry) throw new Error('Entry not found')
      const newPaid   = parseFloat((entry.paid_amount + payAmount).toFixed(2))
      const remaining = parseFloat((entry.amount - newPaid).toFixed(2))
      const newStatus: LentStatus = remaining <= 0 ? 'settled' : 'partial'

      const { data, error: err } = await supabase
        .from('lent')
        .update({ paid_amount: newPaid, status: newStatus })
        .eq('id', id)
        .select()
        .single()
      if (err) throw new Error(err.message)

      // ADD to wallet — money came back
      await adjustWalletBalance(walletId, payAmount)

      await insertTransaction({
        type:             'income',
        category:         'Recovery',
        description:      `Received from ${entry.person} — partial`,
        amount:           payAmount,
        created_by:       entry.lent_by,
        wallet_id:        walletId,
        transaction_date: todayISO(),
      })

      setEntries(prev => prev.map(e => e.id === id ? data as LentEntry : e))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [entries])

  // ── Mark fully settled — ADD remaining to wallet ──────────────────────────
  // Logic: all money returned = full remaining amount added back to wallet
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
        .from('lent')
        .update({ paid_amount: entry.amount, status: 'settled' })
        .eq('id', id)
        .select()
        .single()
      if (err) throw new Error(err.message)

      if (remaining > 0) {
        // ADD remaining to wallet — rest of money came back
        await adjustWalletBalance(walletId, remaining)

        await insertTransaction({
          type:             'income',
          category:         'Recovery',
          description:      `Received from ${entry.person} — settled`,
          amount:           remaining,
          created_by:       entry.lent_by,
          wallet_id:        walletId,
          transaction_date: todayISO(),
        })
      }

      setEntries(prev => prev.map(e => e.id === id ? data as LentEntry : e))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [entries])

  // ── Delete entry ──────────────────────────────────────────────────────────
  const removeEntry = useCallback(async (id: string) => {
    setSaving(true); setError(null)
    try {
      const { error: err } = await supabase.from('lent').delete().eq('id', id)
      if (err) throw new Error(err.message)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }, [])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalToRecover = entries
    .filter(e => e.status !== 'settled')
    .reduce((s, e) => s + (e.amount - e.paid_amount), 0)

  const activeLenders = new Set(
    entries.filter(e => e.status !== 'settled').map(e => e.person)
  ).size

  const nearestDues = entries
    .filter(e => e.status !== 'settled' && e.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3)

  const nearestDue = nearestDues[0] ?? null

  return {
    entries, loading, error, saving,
    addLent, editLent, reorderEntries,
    addMoreAmount, makePayment, markSettled, removeEntry,
    totalToRecover, activeLenders, nearestDues, nearestDue,
    refresh: load,
  }
}
