import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchTransactions,
  insertTransaction,
  deleteTransaction,
  type Transaction,
  type NewTransaction,
} from '../lib/db'
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
  addCategory: (
    type: 'expense' | 'income',
    label: string,
    icon: string,
    accent: string,
    glow: string,
    bg: string,
  ) => Promise<{ error: string | null }>
  deleteCategory: (id: string, type: 'expense' | 'income') => Promise<{ error: string | null }>
  updateCategory: (
    id: string,
    label: string,
    icon: string,
    accent: string,
    glow: string,
    bg: string,
  ) => Promise<{ error: string | null }>
  addSubcategory: (categoryId: string, label: string) => Promise<{ error: string | null }>
  deleteSubcategory: (subcategoryId: string, categoryId: string) => Promise<{ error: string | null }>
  updateSubcategory: (subcategoryId: string, label: string) => Promise<{ error: string | null }>
  reorderCategories: (
    type: 'expense' | 'income',
    orderedIds: string[],
  ) => Promise<{ error: string | null }>
  reorderSubcategories: (
    categoryId: string,
    orderedIds: string[],
  ) => Promise<{ error: string | null }>
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

  // deletingIds — guards against any resurrection of rows mid-delete.
  // Populated BEFORE the DELETE await; cleared on success or error.
  // loadTransactions always strips these IDs, so even if a stale fetch
  // fires after the delete, the row will not reappear in state.
  const deletingIds = useRef<Set<string>>(new Set())

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
      // Always filter out any IDs that are mid-delete.
      // This closes the resurrection race: if a Supabase fetch resolves
      // after the optimistic strip (e.g. PWA resume / visibilitychange),
      // the deleted row is stripped before it can re-enter React state.
      setTransactions(data.filter(t => !deletingIds.current.has(t.id)))
    } catch (e) {
      setTransactionsError(e instanceof Error ? e.message : 'Failed to load transactions')
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCategories(), loadTransactions()])
  }, [loadCategories, loadTransactions])

  // ── Initial load ──────────────────────────────────────────────────────────────────
  useEffect(() => { void refreshAll() }, [refreshAll])

  // ── PWA visibilitychange reload guard ───────────────────────────────────────────
  // When the user switches back from another app (PWA background → foreground),
  // the Realtime WS channel may have missed events. We re-fetch all transactions
  // on tab/app focus so data is always fresh.
  // deletingIds is still populated here so any in-progress deletes remain guarded.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadTransactions()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [loadTransactions])

  // ── Supabase Realtime channels ─────────────────────────────────────────────────
  useEffect(() => {
    const categoriesChannel = supabase
      .channel('realtime-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        void loadCategories()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategories' }, () => {
        void loadCategories()
      })
      .subscribe()

    const transactionsChannel = supabase
      .channel('realtime-transactions')
      // INSERT — skip if the row is mid-delete (can happen in race)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        payload => {
          const newRow = payload.new as Transaction
          if (!newRow?.id) return
          if (deletingIds.current.has(newRow.id)) return
          setTransactions(prev => {
            if (prev.some(t => t.id === newRow.id)) return prev
            const next = [newRow, ...prev]
            return next.sort((a, b) => {
              const dateDiff = b.transaction_date.localeCompare(a.transaction_date)
              if (dateDiff !== 0) return dateDiff
              return b.created_at.localeCompare(a.created_at)
            })
          })
        },
      )
      // UPDATE — skip if mid-delete
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions' },
        payload => {
          const updated = payload.new as Transaction
          if (!updated?.id) return
          if (deletingIds.current.has(updated.id)) return
          setTransactions(prev => prev.map(t => (t.id === updated.id ? updated : t)))
        },
      )
      // DELETE — strip by id, clear guard
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'transactions' },
        payload => {
          const deletedId = (payload.old as { id?: string })?.id
          if (deletedId) {
            setTransactions(prev => prev.filter(t => t.id !== deletedId))
            deletingIds.current.delete(deletedId)
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(categoriesChannel)
      void supabase.removeChannel(transactionsChannel)
    }
  }, [loadCategories])

  // ── Category write ops ───────────────────────────────────────────────────────────
  const addCategory = useCallback(
    async (
      type: 'expense' | 'income',
      label: string,
      icon: string,
      accent: string,
      glow: string,
      bg: string,
    ) => {
      const existing = type === 'expense' ? expenseCategories : incomeCategories
      const nextSortOrder = existing.length
      const { error } = await supabase
        .from('categories')
        .insert([{ type, label, icon, accent, glow, bg, sort_order: nextSortOrder }])
      return { error: error ? error.message : null }
    },
    [expenseCategories, incomeCategories],
  )

  const deleteCategory = useCallback(async (id: string) => {
    await supabase.from('subcategories').delete().eq('category_id', id)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    return { error: error ? error.message : null }
  }, [])

  const updateCategory = useCallback(
    async (id: string, label: string, icon: string, accent: string, glow: string, bg: string) => {
      const { error } = await supabase
        .from('categories')
        .update({ label, icon, accent, glow, bg })
        .eq('id', id)
      return { error: error ? error.message : null }
    },
    [],
  )

  const addSubcategory = useCallback(
    async (categoryId: string, label: string) => {
      const existing = subcategories[categoryId] ?? []
      const nextSortOrder = existing.length
      const { error } = await supabase
        .from('subcategories')
        .insert([{ category_id: categoryId, label, sort_order: nextSortOrder }])
      return { error: error ? error.message : null }
    },
    [subcategories],
  )

  const deleteSubcategory = useCallback(async (subcategoryId: string) => {
    const { error } = await supabase.from('subcategories').delete().eq('id', subcategoryId)
    return { error: error ? error.message : null }
  }, [])

  const updateSubcategory = useCallback(async (subcategoryId: string, label: string) => {
    const { error } = await supabase.from('subcategories').update({ label }).eq('id', subcategoryId)
    return { error: error ? error.message : null }
  }, [])

  const reorderCategories = useCallback(
    async (type: 'expense' | 'income', orderedIds: string[]) => {
      const relevant = (type === 'expense' ? expenseCategories : incomeCategories).filter(c =>
        orderedIds.includes(c.id),
      )
      const lookup = new Map(relevant.map(c => [c.id, c]))
      const ordered = orderedIds.map(id => lookup.get(id)).filter(Boolean) as Category[]

      const updater = type === 'expense' ? setExpenseCategories : setIncomeCategories
      updater(ordered.map((c, i) => ({ ...c, sort_order: i })))

      const results = await Promise.all(
        ordered.map((c, i) =>
          supabase.from('categories').update({ sort_order: i }).eq('id', c.id),
        ),
      )
      const failed = results.find(r => r.error)
      if (failed?.error) {
        await loadCategories()
        return { error: failed.error.message }
      }
      return { error: null }
    },
    [expenseCategories, incomeCategories, loadCategories],
  )

  const reorderSubcategories = useCallback(
    async (categoryId: string, orderedIds: string[]) => {
      const existing = subcategories[categoryId] ?? []
      const lookup = new Map(existing.map(s => [s.id, s]))
      const ordered = orderedIds.map(id => lookup.get(id)).filter(Boolean) as Subcategory[]

      setSubcategories(prev => ({
        ...prev,
        [categoryId]: ordered.map((s, i) => ({ ...s, sort_order: i })),
      }))

      const results = await Promise.all(
        ordered.map((s, i) =>
          supabase.from('subcategories').update({ sort_order: i }).eq('id', s.id),
        ),
      )
      const failed = results.find(r => r.error)
      if (failed?.error) {
        await loadCategories()
        return { error: failed.error.message }
      }
      return { error: null }
    },
    [subcategories, loadCategories],
  )

  // ── Transaction write ops ──────────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx: NewTransaction) => {
    await insertTransaction(tx)
  }, [])

  // removeTransaction — hardened permanent delete with rollback on failure
  //
  // Flow:
  //   1. Register id in deletingIds BEFORE any await (resurrection guard)
  //   2. Optimistic strip from local state + capture snapshot for rollback
  //   3. Await DB delete (db.ts already does post-delete verification)
  //   4a. On SUCCESS — clear guard, belt-and-suspenders strip, done
  //   4b. On SUCCESS — secondary DB check: if row still exists, delete again
  //   5.  On ERROR — clear guard, restore snapshot back into sorted state
  //       and re-throw so LedgerScreen can show the user an error
  const removeTransaction = useCallback(async (id: string) => {
    // Step 1 — guard must be set BEFORE any await
    deletingIds.current.add(id)

    // Step 2 — optimistic strip, capture snapshot for rollback
    let snapshot: Transaction | undefined
    setTransactions(prev => {
      snapshot = prev.find(t => t.id === id)
      return prev.filter(t => t.id !== id)
    })

    try {
      // Step 3 — DB delete (db.ts verifies the row is truly gone)
      await deleteTransaction(id)

      // Step 4a — clear guard immediately (don’t wait for Realtime)
      deletingIds.current.delete(id)

      // Step 4a — belt-and-suspenders: strip again in case a concurrent
      // loadTransactions resolved between steps and sneaked the row back
      setTransactions(prev => prev.filter(t => t.id !== id))

      // Step 4b — secondary DB check (safety net for extreme races)
      const { data: ghost } = await supabase
        .from('transactions')
        .select('id')
        .eq('id', id)
        .maybeSingle()

      if (ghost) {
        await supabase.from('transactions').delete().eq('id', id)
        setTransactions(prev => prev.filter(t => t.id !== id))
      }
    } catch (e) {
      // Step 5 — DB delete failed: clear guard and restore snapshot
      deletingIds.current.delete(id)
      if (snapshot) {
        setTransactions(prev => {
          const restored = [snapshot!, ...prev.filter(t => t.id !== snapshot!.id)]
          return restored.sort((a, b) => {
            const dateDiff = b.transaction_date.localeCompare(a.transaction_date)
            if (dateDiff !== 0) return dateDiff
            return b.created_at.localeCompare(a.created_at)
          })
        })
      }
      // Re-throw so LedgerScreen can display an error to the user
      throw e
    }
  }, [])

  // ── Context value ──────────────────────────────────────────────────────────────
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
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useDataContext must be used within DataProvider')
  return ctx
}
