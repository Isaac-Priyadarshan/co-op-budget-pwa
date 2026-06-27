import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface BudgetRow {
  id: string
  category: string
  parent_category: string
  amount: number
  month: string
}

export function useBudgets(month: string) {
  const [budgets, setBudgets] = useState<BudgetRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('budgets')
      .select('*')
      .eq('month', month)
    if (err) { setError(err.message); setLoading(false); return }
    setBudgets(data ?? [])
    setLoading(false)
  }, [month])

  useEffect(() => { void fetchBudgets() }, [fetchBudgets])

  // Upsert a single subcategory budget for this month
  const upsertBudget = useCallback(async (
    category: string,
    parentCategory: string,
    amount: number
  ) => {
    const { data, error: err } = await supabase
      .from('budgets')
      .upsert(
        { category, parent_category: parentCategory, amount, month },
        { onConflict: 'category,month' }
      )
      .select()
      .single()
    if (err) { console.error(err); return }
    setBudgets(prev => {
      const existing = prev.findIndex(b => b.category === category && b.month === month)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = data as BudgetRow
        return next
      }
      return [...prev, data as BudgetRow]
    })
  }, [month])

  // Get budget amount for a single subcategory
  const getBudget = useCallback((category: string): number => {
    return budgets.find(b => b.category === category)?.amount ?? 0
  }, [budgets])

  // Get total planned for a parent category (sum of all its subcategory budgets)
  const getParentTotal = useCallback((parentCategory: string): number => {
    return budgets
      .filter(b => b.parent_category === parentCategory)
      .reduce((s, b) => s + b.amount, 0)
  }, [budgets])

  // Grand total planned across all categories
  const totalPlanned = budgets.reduce((s, b) => s + b.amount, 0)

  return { budgets, loading, error, upsertBudget, getBudget, getParentTotal, totalPlanned, refresh: fetchBudgets }
}
