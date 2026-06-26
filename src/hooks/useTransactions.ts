import { useState, useEffect, useCallback } from 'react'
import { fetchTransactions, insertTransaction, deleteTransaction } from '../lib/db'
import type { Transaction, NewTransaction } from '../lib/db'

interface UseTransactionsReturn {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  addTransaction: (tx: NewTransaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  totalIncome: number
  totalExpenses: number
  balance: number
  refresh: () => Promise<void>
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchTransactions()
      setTransactions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addTransaction = useCallback(async (tx: NewTransaction) => {
    const inserted = await insertTransaction(tx)
    setTransactions(prev => [inserted, ...prev])
  }, [])

  const removeTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpenses

  return { transactions, loading, error, addTransaction, removeTransaction, totalIncome, totalExpenses, balance, refresh: load }
}
