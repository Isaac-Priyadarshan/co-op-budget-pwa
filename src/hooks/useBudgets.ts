import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// BudgetRow
//
// Mirrors the `budgets` table exactly.
//
// Column intent (as documented in the DB via COMMENT ON COLUMN):
//   category        — subcategory label   e.g. "Oil", "Gym"
//   parent_category — parent label        e.g. "Food and Drinks", "Self-care"
//   subcategory_id  — subcategory UUID    FK → subcategories.id
//                     Part of UNIQUE (subcategory_id, month) constraint.
//   category_id     — parent category UUID  FK → categories.id  NOT NULL
//                     Always written by upsertBudget().
//                     Backfilled 2026-07-15 for all pre-existing rows.
// ─────────────────────────────────────────────────────────────────────────────
export interface BudgetRow {
  id:              string
  category:        string        // subcategory label  (display + text-based spend matching)
  parent_category: string        // parent label       (group totals by text)
  subcategory_id:  string | null // subcategory UUID   (upsert conflict key)
  category_id:     string        // parent UUID        (UUID-based lookups — NOT NULL)
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
  //   category       — subcategory label             (stored in `category`)
  //   parentCategory — parent label                  (stored in `parent_category`)
  //   amount         — budget amount in ₹
  //
  // The UNIQUE (subcategory_id, month) constraint ensures one budget row
  // per subcategory per month. The upsert resolves on that constraint.
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
          category_id:     categoryId,     // ← now always written
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
  // Text-based helpers  (used by BudgetScreen — no callers need to change)
  // ─────────────────────────────────────────────────────────────────────────

  /** Budget amount for a subcategory looked up by its label. */
  const getBudget = useCallback(
    (category: string): number =>
      budgets.find(b => b.category === category)?.amount ?? 0,
    [budgets],
  )

  /** Sum of all subcategory budgets under a parent, looked up by parent label. */
  const getParentTotal = useCallback(
    (parentCategory: string): number =>
      budgets
        .filter(b => b.parent_category === parentCategory)
        .reduce((s, b) => s + b.amount, 0),
    [budgets],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // UUID-based helpers  (for future screens that have the UUID at hand)
  // ─────────────────────────────────────────────────────────────────────────

  /** Budget amount for a subcategory looked up by its subcategory UUID. */
  const getBudgetBySubId = useCallback(
    (subcategoryId: string): number =>
      budgets.find(b => b.subcategory_id === subcategoryId)?.amount ?? 0,
    [budgets],
  )

  /** Sum of all subcategory budgets under a parent, looked up by parent UUID. */
  const getParentTotalById = useCallback(
    (categoryId: string): number =>
      budgets
        .filter(b => b.category_id === categoryId)
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
    // text-based lookups (BudgetScreen uses these — no breaking change)
    getBudget,
    getParentTotal,
    // UUID-based lookups (for future screens)
    getBudgetBySubId,
    getParentTotalById,
    totalPlanned,
    refresh: fetchBudgets,
  }
}
