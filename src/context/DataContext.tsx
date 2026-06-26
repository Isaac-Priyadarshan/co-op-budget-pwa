import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { fetchTransactions, insertTransaction, deleteTransaction, type Transaction, type NewTransaction } from '../lib/db'
import type { Category, Subcategory } from '../types/category'

const DEFAULT_EXPENSE: Omit<Category, 'id' | 'created_at'>[] = [
  { type: 'expense', label: 'Food', icon: '🛒', accent: '#F87171', glow: 'rgba(239,68,68,0.20)', bg: 'rgba(239,68,68,0.12)' },
  { type: 'expense', label: 'Transport', icon: '🚗', accent: '#FB923C', glow: 'rgba(251,146,60,0.20)', bg: 'rgba(251,146,60,0.12)' },
  { type: 'expense', label: 'Rent', icon: '🏠', accent: '#FCA5A5', glow: 'rgba(248,113,113,0.18)', bg: 'rgba(248,113,113,0.10)' },
]
const DEFAULT_INCOME: Omit<Category, 'id' | 'created_at'>[] = [
  { type: 'income', label: 'Salary', icon: '💼', accent: '#FBBF24', glow: 'rgba(251,191,36,0.22)', bg: 'rgba(251,191,36,0.12)' },
  { type: 'income', label: 'Investment', icon: '📈', accent: '#34D399', glow: 'rgba(52,211,153,0.20)', bg: 'rgba(52,211,153,0.12)' },
  { type: 'income', label: 'Gift', icon: '🎁', accent: '#A78BFA', glow: 'rgba(167,139,250,0.20)', bg: 'rgba(167,139,250,0.12)' },
]

interface DataContextValue {
  expenseCategories: Category[]
  incomeCategories: Category[]
  subcategories: Record<string, Subcategory[]>
  categoriesLoading: boolean
  categoriesError: string | null
  addCategory: (type: 'expense' | 'income', label: string, icon: string, accent: string, glow: string, bg: string) => Promise<{ error: string | null }>
  deleteCategory: (id: string, type: 'expense' | 'income') => Promise<{ error: string | null }>
  addSubcategory: (categoryId: string, label: string) => Promise<{ error: string | null }>
  deleteSubcategory: (subcategoryId: string, categoryId: string) => Promise<{ error: string | null }>
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
  const seededRef = useRef(false)

  const applyCategories = useCallback((cats: Category[]) => {
    setExpenseCategories(cats.filter(c => c.type === 'expense'))
    setIncomeCategories(cats.filter(c => c.type === 'income'))
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true)
      setCategoriesError(null)
      const { data: cats, error: catErr } = await supabase.from('categories').select('*').order('created_at', { ascending: true })
      if (catErr) throw catErr

      if ((!cats || cats.length === 0) && !seededRef.current) {
        seededRef.current = true
        const { data: seeded, error: seedErr } = await supabase.from('categories').insert([...DEFAULT_EXPENSE, ...DEFAULT_INCOME]).select()
        if (seedErr) throw seedErr
        applyCategories((seeded ?? []) as Category[])
        setSubcategories({})
        return
      }

      applyCategories((cats ?? []) as Category[])
      const ids = (cats ?? []).map(c => c.id)
      if (ids.length === 0) {
        setSubcategories({})
        return
      }

      const { data: subs, error: subErr } = await supabase.from('subcategories').select('*').in('category_id', ids).order('created_at', { ascending: true })
      if (subErr) throw subErr
      const mapped: Record<string, Subcategory[]> = {}
      ;((subs ?? []) as Subcategory[]).forEach(sub => {
        if (!mapped[sub.category_id]) mapped[sub.category_id] = []
        mapped[sub.category_id].push(sub)
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

  useEffect(() => { refreshAll() }, [refreshAll])

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
    const { error } = await supabase.from('categories').insert([{ type, label, icon, accent, glow, bg }])
    return { error: error ? error.message : null }
  }, [])

  const deleteCategory = useCallback(async (id: string) => {
    await supabase.from('subcategories').delete().eq('category_id', id)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    return { error: error ? error.message : null }
  }, [])

  const addSubcategory = useCallback(async (categoryId: string, label: string) => {
    const { error } = await supabase.from('subcategories').insert([{ category_id: categoryId, label }])
    return { error: error ? error.message : null }
  }, [])

  const deleteSubcategory = useCallback(async (subcategoryId: string) => {
    const { error } = await supabase.from('subcategories').delete().eq('id', subcategoryId)
    return { error: error ? error.message : null }
  }, [])

  const addTransaction = useCallback(async (tx: NewTransaction) => {
    await insertTransaction(tx)
  }, [])

  const removeTransaction = useCallback(async (id: string) => {
    await deleteTransaction(id)
  }, [])

  const value = useMemo<DataContextValue>(() => ({
    expenseCategories,
    incomeCategories,
    subcategories,
    categoriesLoading,
    categoriesError,
    addCategory,
    deleteCategory,
    addSubcategory,
    deleteSubcategory,
    transactions,
    transactionsLoading,
    transactionsError,
    addTransaction,
    removeTransaction,
    refreshAll,
  }), [expenseCategories, incomeCategories, subcategories, categoriesLoading, categoriesError, addCategory, deleteCategory, addSubcategory, deleteSubcategory, transactions, transactionsLoading, transactionsError, addTransaction, removeTransaction, refreshAll])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useDataContext() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useDataContext must be used within DataProvider')
  return context
}
