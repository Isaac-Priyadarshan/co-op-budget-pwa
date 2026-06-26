import { useMemo } from 'react'
import { useDataContext } from '../context/DataContext'

export function useTransactions() {
  const {
    transactions,
    transactionsLoading,
    transactionsError,
    addTransaction,
    removeTransaction,
    refreshAll,
  } = useDataContext()

  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [transactions])
  const totalExpenses = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [transactions])
  const balance = totalIncome - totalExpenses

  return {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    addTransaction,
    removeTransaction,
    totalIncome,
    totalExpenses,
    balance,
    refresh: refreshAll,
  }
}
