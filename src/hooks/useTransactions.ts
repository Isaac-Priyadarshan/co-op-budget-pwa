import { useMemo } from 'react'
import { useDataContext } from '../context/DataContext'

// Categories written by Lent, Borrowed, Transfer flows.
// These are money-movement entries, NOT real income or expenses,
// so they must be excluded from all budget and home screen calculations.
export const EXCLUDED_CATEGORIES = ['Lent', 'Recovery', 'Borrowed', 'Repayment', 'Transfer']

export function isExcluded(tx: { category?: string; type?: string }): boolean {
  if (tx.type === 'transfer') return true
  const cat = tx.category ?? ''
  return EXCLUDED_CATEGORIES.some(ec => cat.toLowerCase() === ec.toLowerCase())
}

export function useTransactions() {
  const {
    transactions,
    transactionsLoading,
    transactionsError,
    addTransaction,
    removeTransaction,
    refreshAll,
  } = useDataContext()

  // All transactions (unfiltered) — used by LedgerScreen which needs full history
  // Budget/Home screens use the filtered helpers below via their own monthTxs logic

  const totalIncome = useMemo(
    () => transactions
      .filter(t => t.type === 'income' && !isExcluded(t))
      .reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  const totalExpenses = useMemo(
    () => transactions
      .filter(t => t.type === 'expense' && !isExcluded(t))
      .reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  const balance = totalIncome - totalExpenses

  return {
    transactions,          // full list — Ledger still sees everything
    loading: transactionsLoading,
    error: transactionsError,
    addTransaction,
    removeTransaction,
    totalIncome,
    totalExpenses,
    balance,
    refresh: refreshAll,
    isExcluded,            // exported so screens can reuse the same guard
  }
}
