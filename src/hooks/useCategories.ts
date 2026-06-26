import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, Subcategory } from '../types/category'

const DEFAULT_EXPENSE: Omit<Category, 'id' | 'created_at'>[] = [
  { type: 'expense', label: 'Food',      icon: '🛒', accent: '#F87171', glow: 'rgba(239,68,68,0.20)',    bg: 'rgba(239,68,68,0.12)' },
  { type: 'expense', label: 'Transport', icon: '🚗', accent: '#FB923C', glow: 'rgba(251,146,60,0.20)',   bg: 'rgba(251,146,60,0.12)' },
  { type: 'expense', label: 'Rent',      icon: '🏠', accent: '#FCA5A5', glow: 'rgba(248,113,113,0.18)', bg: 'rgba(248,113,113,0.10)' },
]

const DEFAULT_INCOME: Omit<Category, 'id' | 'created_at'>[] = [
  { type: 'income', label: 'Salary',     icon: '💼', accent: '#FBBF24', glow: 'rgba(251,191,36,0.22)',  bg: 'rgba(251,191,36,0.12)' },
  { type: 'income', label: 'Investment', icon: '📈', accent: '#34D399', glow: 'rgba(52,211,153,0.20)',  bg: 'rgba(52,211,153,0.12)' },
  { type: 'income', label: 'Gift',       icon: '🎁', accent: '#A78BFA', glow: 'rgba(167,139,250,0.20)', bg: 'rgba(167,139,250,0.12)' },
]

export function useCategories() {
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories]   = useState<Category[]>([])
  const [subcategories, setSubcategories]         = useState<Record<string, Subcategory[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // ─── Fetch all categories + subcategories ───────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true })

      if (catErr) throw catErr

      // Seed defaults if tables are empty
      if (!cats || cats.length === 0) {
        const seeds = [...DEFAULT_EXPENSE, ...DEFAULT_INCOME]
        const { data: seeded, error: seedErr } = await supabase
          .from('categories')
          .insert(seeds)
          .select()
        if (seedErr) throw seedErr
        const expense = (seeded ?? []).filter((c: Category) => c.type === 'expense')
        const income  = (seeded ?? []).filter((c: Category) => c.type === 'income')
        setExpenseCategories(expense)
        setIncomeCategories(income)
        setSubcategories({})
        setLoading(false)
        return
      }

      setExpenseCategories(cats.filter((c: Category) => c.type === 'expense'))
      setIncomeCategories(cats.filter((c: Category) => c.type === 'income'))

      // Fetch subcategories for all categories
      const catIds = cats.map((c: Category) => c.id)
      const { data: subs, error: subErr } = await supabase
        .from('subcategories')
        .select('*')
        .in('category_id', catIds)
        .order('created_at', { ascending: true })

      if (subErr) throw subErr

      const subMap: Record<string, Subcategory[]> = {}
      ;(subs ?? []).forEach((s: Subcategory) => {
        if (!subMap[s.category_id]) subMap[s.category_id] = []
        subMap[s.category_id].push(s)
      })
      setSubcategories(subMap)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Add category ───────────────────────────────────────────────────────────
  const addCategory = useCallback(async (
    type: 'expense' | 'income',
    label: string,
    icon: string,
    accent: string,
    glow: string,
    bg: string,
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ type, label, icon, accent, glow, bg }])
      .select()
      .single()
    if (error) return { error: error.message }
    const newCat: Category = data
    if (type === 'expense') setExpenseCategories(prev => [...prev, newCat])
    else setIncomeCategories(prev => [...prev, newCat])
    return { error: null }
  }, [])

  // ─── Delete category ────────────────────────────────────────────────────────
  const deleteCategory = useCallback(async (
    id: string,
    type: 'expense' | 'income',
  ): Promise<{ error: string | null }> => {
    // Delete subcategories first
    await supabase.from('subcategories').delete().eq('category_id', id)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) return { error: error.message }
    if (type === 'expense') setExpenseCategories(prev => prev.filter(c => c.id !== id))
    else setIncomeCategories(prev => prev.filter(c => c.id !== id))
    setSubcategories(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    return { error: null }
  }, [])

  // ─── Add subcategory ────────────────────────────────────────────────────────
  const addSubcategory = useCallback(async (
    categoryId: string,
    label: string,
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase
      .from('subcategories')
      .insert([{ category_id: categoryId, label }])
      .select()
      .single()
    if (error) return { error: error.message }
    const newSub: Subcategory = data
    setSubcategories(prev => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] ?? []), newSub],
    }))
    return { error: null }
  }, [])

  // ─── Delete subcategory ─────────────────────────────────────────────────────
  const deleteSubcategory = useCallback(async (
    subcategoryId: string,
    categoryId: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', subcategoryId)
    if (error) return { error: error.message }
    setSubcategories(prev => ({
      ...prev,
      [categoryId]: (prev[categoryId] ?? []).filter(s => s.id !== subcategoryId),
    }))
    return { error: null }
  }, [])

  return {
    expenseCategories,
    incomeCategories,
    subcategories,
    loading,
    error,
    addCategory,
    deleteCategory,
    addSubcategory,
    deleteSubcategory,
    refresh: fetchAll,
  }
}
