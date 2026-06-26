import { useState, useEffect, useCallback } from 'react'
import { fetchBorrowed, insertBorrowed, settleBorrowed, deleteBorrowed } from '../lib/db'
import type { BorrowedEntry, NewBorrowed } from '../lib/db'

export function useBorrowed() {
  const [entries, setEntries] = useState<BorrowedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      setEntries(await fetchBorrowed())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (entry: NewBorrowed) => {
    const inserted = await insertBorrowed(entry)
    setEntries(prev => [inserted, ...prev])
  }, [])

  const settle = useCallback(async (id: string) => {
    await settleBorrowed(id)
    setEntries(prev => prev.map(e => e.id === id ? { ...e, settled: true } : e))
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteBorrowed(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const totalOwed = entries.filter(e => !e.settled).reduce((s, e) => s + e.amount, 0)

  return { entries, loading, error, add, settle, remove, totalOwed, refresh: load }
}
