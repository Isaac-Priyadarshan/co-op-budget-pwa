import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// BudgetRow
//
// Mirrors the `budgets` table exactly.
//
// Column intent:
//   category        — subcategory label   (kept for display / legacy reads)
//   parent_category — parent label        (kept for display / legacy reads)
//   subcategory_id  — subcategory UUID    FK → subcategories.id  (primary key for lookups)
//   category_id     — parent category UUID FK → categories.id   (primary key for parent lookups)
//
// ALL lookups should now use UUIDs so they survive subcategory renames.
// ─────────────────────────────────────────────────────────────────────────────
export interface BudgetRow {
  id:              string
  category:        string        // subcategory label  (display only — do NOT use for lookups)
  parent_category: string        // parent label       (display only — do NOT use for lookups)
  subcategory_id:  string | null // subcategory UUID   (use for all lookups)
  category_id:     string        // parent UUID        (use for all parent lookups)
  amount:          number
  month:           string        // 'YYYY-MM'
}

export function useBudgets(month: string) {
  const [budgets, setBudgets] = useState<BudgetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

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

  // ─────────────────────────────────────────────────────────────────────────
  // upsertBudget
  //
  // Saves or updates a single subcategory budget for this month.
  //
  // Parameters:
  //   subcategoryId  — UUID from subcategories table (conflict-resolution key)
  //   categoryId     — UUID from categories table    (parent; stored in category_id)
  //   category       — subcategory label             (stored in `category` for display)
  //   parentCategory — parent label                  (stored in `parent_category` for display)
  //   amount         — budget amount in ₹
  //
  // The UNIQUE (subcategory_id, month) constraint ensures one budget row
  // per subcategory per month.
  // ─────────────────────────────────────────────────────────────────────────
  const upsertBudget = useCallback(async (
    subcategoryId:  string,
    categoryId:     string,
    category:       string,
    parentCategory: string,
    amount:         number,
  ) => {
    const { data, error: err } = await supabase
      .from('budgets')
      .upsert(
        {
          subcategory_id:  subcategoryId,
          category_id:     categoryId,
          category,
          parent_category: parentCategory,
          amount,
          month,
        },
        { onConflict: 'subcategory_id,month' },
      )
      .select()
      .single()
    if (err) { console.error('upsertBudget error:', err); return }
    setBudgets(prev => {
      const idx = prev.findIndex(
        b => b.subcategory_id === subcategoryId && b.month === month,
      )
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = data as BudgetRow
        return next
      }
      return [...prev, data as BudgetRow]
    })
  }, [month])

  // ─────────────────────────────────────────────────────────────────────────
  // UUID-based lookups — ALWAYS USE THESE (rename-proof)
  // ─────────────────────────────────────────────────────────────────────────

  /** Budget amount for a subcategory looked up by its UUID. Rename-proof. */
  const getBudgetBySubId = useCallback(
    (subcategoryId: string): number =>
      budgets.find(b => b.subcategory_id === subcategoryId)?.amount ?? 0,
    [budgets],
  )

  /** Sum of all subcategory budgets under a parent, looked up by parent UUID. Rename-proof. */
  const getParentTotalById = useCallback(
    (categoryId: string): number =>
      budgets
        .filter(b => b.category_id === categoryId)
        .reduce((s, b) => s + b.amount, 0),
    [budgets],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Label-based lookups — DEPRECATED
  // Kept only as a fallback for legacy data that may not have subcategory_id.
  // Do NOT use these in new code.
  // ─────────────────────────────────────────────────────────────────────────

  /** @deprecated Use getBudgetBySubId(sub.id) instead. Breaks on rename. */
  const getBudget = useCallback(
    (category: string): number =>
      budgets.find(b => b.category === category)?.amount ?? 0,
    [budgets],
  )

  /** @deprecated Use getParentTotalById(cat.id) instead. Breaks on rename. */
  const getParentTotal = useCallback(
    (parentCategory: string): number =>
      budgets
        .filter(b => b.parent_category === parentCategory)
        .reduce((s, b) => s + b.amount, 0),
    [budgets],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Aggregate
  // ─────────────────────────────────────────────────────────────────────────

  /** Grand total planned across all categories for this month. */
  const totalPlanned = budgets.reduce((s, b) => s + b.amount, 0)

  return {
    budgets,
    loading,
    error,
    upsertBudget,
    // UUID-based (primary — always use these)
    getBudgetBySubId,
    getParentTotalById,
    // Label-based (deprecated — fallback only)
    getBudget,
    getParentTotal,
    totalPlanned,
    refresh: fetchBudgets,
  }
}
