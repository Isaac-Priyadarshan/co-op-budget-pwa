import { useState, useEffect, useCallback } from 'react'
import { fetchLoans, insertLoan, closeLoan, deleteLoan } from '../lib/db'
import type { LoanEntry, NewLoan } from '../lib/db'

export function useLoans() {
  const [loans, setLoans] = useState<LoanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setLoading(true); setError(null); setLoans(await fetchLoans()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (entry: NewLoan) => {
    const inserted = await insertLoan(entry)
    setLoans(prev => [inserted, ...prev])
  }, [])

  const close = useCallback(async (id: string) => {
    await closeLoan(id)
    setLoans(prev => prev.map(l => l.id === id ? { ...l, closed: true } : l))
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteLoan(id)
    setLoans(prev => prev.filter(l => l.id !== id))
  }, [])

  const totalOutstanding = loans.filter(l => !l.closed).reduce((s, l) => s + l.outstanding, 0)
  const totalEMI = loans.filter(l => !l.closed).reduce((s, l) => s + (l.emi_amount ?? 0), 0)

  return { loans, loading, error, add, close, remove, totalOutstanding, totalEMI, refresh: load }
}
