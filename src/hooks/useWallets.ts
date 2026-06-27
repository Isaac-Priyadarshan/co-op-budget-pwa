import { useState, useEffect, useCallback } from 'react'
import { fetchWallets, upsertWallet, deleteWallet } from '../lib/db'
import type { WalletEntry, NewWallet } from '../lib/db'

export function useWallets() {
  const [wallets, setWallets] = useState<WalletEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      setWallets(await fetchWallets())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (entry: NewWallet) => {
    const saved = await upsertWallet(entry)
    setWallets(prev => {
      const idx = prev.findIndex(w => w.id === saved.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [...prev, saved]
    })
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteWallet(id)
    setWallets(prev => prev.filter(w => w.id !== id))
  }, [])

  const totalCash         = wallets.filter(w => w.type === 'cash').reduce((s, w) => s + w.balance, 0)
  const totalCredit       = wallets.filter(w => w.type === 'credit').reduce((s, w) => s + w.balance, 0)
  const totalCreditLimit  = wallets.filter(w => w.type === 'credit').reduce((s, w) => s + (w.credit_limit ?? 0), 0)

  return { wallets, loading, error, save, remove, totalCash, totalCredit, totalCreditLimit, refresh: load }
}
