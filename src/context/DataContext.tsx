import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { fetchTransactions, insertTransaction, deleteTransaction, type Transaction, type NewTransaction } from '../lib/db'
import type { Category, Subcategory } from '../types/category'

const sortCategories = (items: Category[]) =>
  [...items].sort(
    (a, b) =>
      (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
      (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  )

const sortSubcategories = (items: Subcategory[]) =>
  [...items].sort(
    (a, b) =>
      (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
      (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  )

interface DataContextValue {
  expenseCategories: Category[]
  incomeCategories: Category[]
  subcategories: Record<string, Subcategory[]>
  categoriesLoading: boolean
  categoriesError: string | null
  addCategory: (type: 'expense' | 'income', label: string, icon: string, accent: string, glow: string, bg: string) => Promise<{ error: string | null }>
  deleteCategory: (id: string, type: 'expense' | 'income') => Promise<{ error: string | null }>
  updateCategory: (id: string, label: string, icon: string, accent: string, glow: string, bg: string) => Promise<{ error: string | null }>
  addSubcategory: (categoryId: string, label: string) => Promise<{ error: string | null }>
  deleteSubcategory: (subcategoryId: string, categoryId: string) => Promise<{ error: string | null }>
  updateSubcategory: (subcategoryId: string, label: string) => Promise<{ error: string | null }>
  reorderCategories: (type: 'expense' | 'income', orderedIds: string[]) => Promise<{ error: string | null }>
  reorderSubcategories: (categoryId: string, orderedIds: string[]) => Promise<{ error: string | null }>
  transactions: Transaction[]
  transactionsLoading: boolean
  transactionsError: string | null
  addTransaction: (tx: NewTransaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  refreshAll: () => Promise<void>
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Record<string, Subcategory[]>>({})
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)

  const applyCategories = useCallback((cats: Category[]) => {
    const sorted = sortCategories(cats)
    setExpenseCategories(sorted.filter(c => c.type === 'expense'))
    setIncomeCategories(sorted.filter(c => c.type === 'income'))
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true)
      setCategoriesError(null)

      const { data: cats, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
      if (catErr) throw catErr

      // If table is empty — respect that. Do NOT auto-seed.
      applyCategories((cats ?? []) as Category[])

      const ids = (cats ?? []).map(c => c.id)
      if (ids.length === 0) {
        setSubcategories({})
        return
      }

      const { data: subs, error: subErr } = await supabase
        .from('subcategories')
        .select('*')
        .in('category_id', ids)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
      if (subErr) throw subErr

      const mapped: Record<string, Subcategory[]> = {}
      ;((subs ?? []) as Subcategory[]).forEach(sub => {
        if (!mapped[sub.category_id]) mapped[sub.category_id] = []
        mapped[sub.category_id].push(sub)
      })
      Object.keys(mapped).forEach(categoryId => {
        mapped[categoryId] = sortSubcategories(mapped[categoryId])
      })
      setSubcategories(mapped)
    } catch (e) {
      setCategoriesError(e instanceof Error ? e.message : 'Failed to load categories')
    } finally {
      setCategoriesLoading(false)
    }
  }, [applyCategories])

  const loadTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true)
      setTransactionsError(null)
      const data = await fetchTransactions()
      setTransactions(data)
    } catch (e) {
      setTransactionsError(e instanceof Error ? e.message : 'Failed to load transactions')
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCategories(), loadTransactions()])
  }, [loadCategories, loadTransactions])

  useEffect(() => { void refreshAll() }, [refreshAll])

  useEffect(() => {
    const categoriesChannel = supabase
      .channel('realtime-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => { void loadCategories() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategories' }, () => { void loadCategories() })
      .subscribe()

    const transactionsChannel = supabase
      .channel('realtime-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, async () => {
        const data = await fetchTransactions()
        setTransactions(data)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(categoriesChannel)
      void supabase.removeChannel(transactionsChannel)
    }
  }, [loadCategories])

  const addCategory = useCallback(async (type: 'expense' | 'income', label: string, icon: string, accent: string, glow: string, bg: string) => {
    const existing = type === 'expense' ? expenseCategories : incomeCategories
    const nextSortOrder = existing.length
    const { error } = await supabase.from('categories').insert([{ type, label, icon, accent, glow, bg, sort_order: nextSortOrder }])
    return { error: error ? error.message : null }
  }, [expenseCategories, incomeCategories])

  const deleteCategory = useCallback(async (id: string) => {
    await supabase.from('subcategories').delete().eq('category_id', id)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    return { error: error ? error.message : null }
  }, [])

  const updateCategory = useCallback(async (id: string, label: string, icon: string, accent: string, glow: string, bg: string) => {
    const { error } = await supabase.from('categories').update({ label, icon, accent, glow, bg }).eq('id', id)
    return { error: error ? error.message : null }
  }, [])

  const addSubcategory = useCallback(async (categoryId: string, label: string) => {
    const existing = subcategories[categoryId] ?? []
    const nextSortOrder = existing.length
    const { error } = await supabase.from('subcategories').insert([{ category_id: categoryId, label, sort_order: nextSortOrder }])
    return { error: error ? error.message : null }
  }, [subcategories])

  const deleteSubcategory = useCallback(async (subcategoryId: string) => {
    const { error } = await supabase.from('subcategories').delete().eq('id', subcategoryId)
    return { error: error ? error.message : null }
  }, [])

  const updateSubcategory = useCallback(async (subcategoryId: string, label: string) => {
    const { error } = await supabase.from('subcategories').update({ label }).eq('id', subcategoryId)
    return { error: error ? error.message : null }
  }, [])

  const reorderCategories = useCallback(async (type: 'expense' | 'income', orderedIds: string[]) => {
    const relevant = (type === 'expense' ? expenseCategories : incomeCategories).filter(category =>
      orderedIds.includes(category.id),
    )
    const lookup = new Map(relevant.map(category => [category.id, category]))
    const ordered = orderedIds.map(id => lookup.get(id)).filter(Boolean) as Category[]

    const updater = type === 'expense' ? setExpenseCategories : setIncomeCategories
    updater(ordered.map((category, index) => ({ ...category, sort_order: index })))

    const updates = ordered.map((category, index) =>
      supabase.from('categories').update({ sort_order: index }).eq('id', category.id),
    )
    const results = await Promise.all(updates)
    const failed = results.find(result => result.error)

    if (failed?.error) {
      await loadCategories()
      return { error: failed.error.message }
    }

    return { error: null }
  }, [expenseCategories, incomeCategories, loadCategories])

  const reorderSubcategories = useCallback(async (categoryId: string, orderedIds: string[]) => {
    const existing = subcategories[categoryId] ?? []
    const lookup = new Map(existing.map(subcategory => [subcategory.id, subcategory]))
    const ordered = orderedIds.map(id => lookup.get(id)).filter(Boolean) as Subcategory[]

    setSubcategories(prev => ({
      ...prev,
      [categoryId]: ordered.map((subcategory, index) => ({ ...subcategory, sort_order: index })),
    }))

    const updates = ordered.map((subcategory, index) =>
      supabase.from('subcategories').update({ sort_order: index }).eq('id', subcategory.id),
    )
    const results = await Promise.all(updates)
    const failed = results.find(result => result.error)

    if (failed?.error) {
      await loadCategories()
      return { error: failed.error.message }
    }

    return { error: null }
  }, [subcategories, loadCategories])

  const addTransaction = useCallback(async (tx: NewTransaction) => {
    await insertTransaction(tx)
  }, [])

  const removeTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id)
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      expenseCategories,
      incomeCategories,
      subcategories,
      categoriesLoading,
      categoriesError,
      addCategory,
      deleteCategory,
      updateCategory,
      addSubcategory,
      deleteSubcategory,
      updateSubcategory,
      reorderCategories,
      reorderSubcategories,
      transactions,
      transactionsLoading,
      transactionsError,
      addTransaction,
      removeTransaction,
      refreshAll,
    }),
    [
      expenseCategories,
      incomeCategories,
      subcategories,
      categoriesLoading,
      categoriesError,
      addCategory,
      deleteCategory,
      updateCategory,
      addSubcategory,
      deleteSubcategory,
      updateSubcategory,
      reorderCategories,
      reorderSubcategories,
      transactions,
      transactionsLoading,
      transactionsError,
      addTransaction,
      removeTransaction,
      refreshAll,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useDataContext() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useDataContext must be used within DataProvider')
  return context
}
