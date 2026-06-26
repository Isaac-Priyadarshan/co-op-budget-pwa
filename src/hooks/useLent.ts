import { useState, useEffect, useCallback } from 'react'
import { fetchLent, insertLent, settleLent, deleteLent } from '../lib/db'
import type { LentEntry, NewLent } from '../lib/db'

export function useLent() {
  const [entries, setEntries] = useState<LentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      setEntries(await fetchLent())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (entry: NewLent) => {
    const inserted = await insertLent(entry)
    setEntries(prev => [inserted, ...prev])
  }, [])

  const settle = useCallback(async (id: string) => {
    await settleLent(id)
    setEntries(prev => prev.map(e => e.id === id ? { ...e, settled: true } : e))
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteLent(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const totalOwedToUs = entries.filter(e => !e.settled).reduce((s, e) => s + e.amount, 0)

  return { entries, loading, error, add, settle, remove, totalOwedToUs, refresh: load }
}
