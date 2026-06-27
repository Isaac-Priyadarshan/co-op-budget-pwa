import { useState, useEffect, useCallback } from 'react'
import {
  fetchWallets,
  upsertWallet,
  deleteWallet,
  updateWalletSortOrders,
} from '../lib/db'
import type { WalletEntry, NewWallet } from '../lib/db'

export function useWallets() {
  const [wallets, setWallets] = useState<WalletEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      setWallets(await fetchWallets())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Create new entry — assign sort_order = current max + 1
  const save = useCallback(async (entry: NewWallet) => {
    const currentMax = wallets.reduce((m, w) => Math.max(m, w.sort_order ?? 0), 0)
    const saved = await upsertWallet({ ...entry, sort_order: currentMax + 1 })
    setWallets(prev => {
      const idx = prev.findIndex(w => w.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [...prev, saved]
    })
  }, [wallets])

  // Update existing entry by id
  const update = useCallback(async (id: string, entry: NewWallet) => {
    const existing = wallets.find(w => w.id === id)
    const saved = await upsertWallet({ ...entry, id, sort_order: existing?.sort_order ?? 0 })
    setWallets(prev => prev.map(w => w.id === id ? saved : w))
  }, [wallets])

  // Delete entry
  const remove = useCallback(async (id: string) => {
    await deleteWallet(id)
    setWallets(prev => prev.filter(w => w.id !== id))
  }, [])

  // Persistent reorder — optimistic local update + DB batch save
  const reorder = useCallback(async (newOrder: WalletEntry[]) => {
    // Optimistic update: reflect new order in UI immediately
    setWallets(prev => {
      // Keep non-reordered items (opposite type) in place, splice in new order
      const type = newOrder[0]?.type
      const others = prev.filter(w => w.type !== type)
      return [...others, ...newOrder]
    })
    // Persist: assign sort_order 0,1,2… within the reordered group
    const updates = newOrder.map((w, i) => ({ id: w.id, sort_order: i }))
    try {
      await updateWalletSortOrders(updates)
    } catch {
      // On failure silently reload from DB to restore consistency
      load()
    }
  }, [load])

  const totalCash        = wallets.filter(w => w.type === 'cash').reduce((s, w) => s + w.balance, 0)
  const totalCredit      = wallets.filter(w => w.type === 'credit').reduce((s, w) => s + w.balance, 0)
  const totalCreditLimit = wallets.filter(w => w.type === 'credit').reduce((s, w) => s + (w.credit_limit ?? 0), 0)

  return {
    wallets,
    loading,
    error,
    save,
    update,
    remove,
    reorder,
    totalCash,
    totalCredit,
    totalCreditLimit,
    refresh: load,
  }
}
