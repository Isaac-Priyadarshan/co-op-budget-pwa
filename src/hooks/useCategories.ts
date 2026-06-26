import { useMemo } from 'react'
import { useDataContext } from '../context/DataContext'

export function useCategories() {
  const {
    expenseCategories,
    incomeCategories,
    subcategories,
    categoriesLoading,
    categoriesError,
    addCategory,
    deleteCategory,
    addSubcategory,
    deleteSubcategory,
    refreshAll,
  } = useDataContext()

  return useMemo(() => ({
    expenseCategories,
    incomeCategories,
    subcategories,
    loading: categoriesLoading,
    error: categoriesError,
    addCategory,
    deleteCategory,
    addSubcategory,
    deleteSubcategory,
    refresh: refreshAll,
  }), [expenseCategories, incomeCategories, subcategories, categoriesLoading, categoriesError, addCategory, deleteCategory, addSubcategory, deleteSubcategory, refreshAll])
}
