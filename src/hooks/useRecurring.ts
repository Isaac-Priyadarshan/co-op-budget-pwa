import { useState, useEffect, useCallback } from 'react'
import { fetchRecurring, insertRecurring, toggleRecurring, deleteRecurring } from '../lib/db'
import type { RecurringEntry, NewRecurring } from '../lib/db'

export function useRecurring() {
  const [items, setItems] = useState<RecurringEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setLoading(true); setError(null); setItems(await fetchRecurring()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (entry: NewRecurring) => {
    const inserted = await insertRecurring(entry)
    setItems(prev => [...prev, inserted].sort((a, b) => {
      const da = a.next_due ?? ''
      const db = b.next_due ?? ''
      return da.localeCompare(db)
    }))
  }, [])

  const toggle = useCallback(async (id: string, active: boolean) => {
    await toggleRecurring(id, active)
    setItems(prev => prev.map(r => r.id === id ? { ...r, active } : r))
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteRecurring(id)
    setItems(prev => prev.filter(r => r.id !== id))
  }, [])

  const totalMonthly = items
    .filter(r => r.active)
    .reduce((s, r) => {
      const multiplier: Record<string, number> = { daily: 30, weekly: 4.33, monthly: 1, quarterly: 1/3, yearly: 1/12 }
      return s + r.amount * (multiplier[r.frequency] ?? 1)
    }, 0)

  return { items, loading, error, add, toggle, remove, totalMonthly, refresh: load }
}
