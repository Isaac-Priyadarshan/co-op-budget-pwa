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

/**
 * useTransactions — optionally scoped to a specific month.
 *
 * When { month, year } are provided the hook returns only transactions whose
 * transaction_date falls within that month.  Totals (totalIncome /
 * totalExpenses / balance) are computed from that filtered set.
 *
 * Without arguments the hook returns the full list — used by LedgerScreen.
 */
export function useTransactions(filter?: { month: number; year: number }) {
  const {
    transactions,
    transactionsLoading,
    transactionsError,
    addTransaction,
    removeTransaction,
    refreshAll,
  } = useDataContext()

  // Client-side month filter applied on top of the already-loaded data.
  // DataContext keeps all transactions in memory; this memoised slice avoids
  // redundant re-renders and keeps month filtering O(n) with no extra fetches.
  const monthTxs = useMemo(() => {
    if (!filter) return transactions
    const { month, year } = filter
    // Build ISO prefix strings for the boundaries of the selected month.
    // e.g. month=7, year=2026  →  start='2026-07-01', end='2026-07-31'
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    // Last day: month+1 day 0 = last day of `month`
    const lastDay = new Date(year, month, 0).getDate()
    const end   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return transactions.filter(t => {
      const d = t.transaction_date?.substring(0, 10) ?? ''
      return d >= start && d <= end
    })
  }, [transactions, filter])

  const totalIncome = useMemo(
    () => monthTxs
      .filter(t => t.type === 'income' && !isExcluded(t))
      .reduce((s, t) => s + t.amount, 0),
    [monthTxs],
  )

  const totalExpenses = useMemo(
    () => monthTxs
      .filter(t => t.type === 'expense' && !isExcluded(t))
      .reduce((s, t) => s + t.amount, 0),
    [monthTxs],
  )

  const balance = totalIncome - totalExpenses

  return {
    transactions: monthTxs, // filtered when filter is supplied; full list otherwise
    allTransactions: transactions, // always the complete list — Ledger uses this
    loading: transactionsLoading,
    error: transactionsError,
    addTransaction,
    removeTransaction,
    totalIncome,
    totalExpenses,
    balance,
    refresh: refreshAll,
    isExcluded,
  }
}
