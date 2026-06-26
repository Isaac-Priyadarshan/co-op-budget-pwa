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
    reorderCategories,
    reorderSubcategories,
  } = useDataContext()

  return {
    expenseCategories,
    incomeCategories,
    subcategories,
    loading: categoriesLoading,
    error: categoriesError,
    addCategory,
    deleteCategory,
    addSubcategory,
    deleteSubcategory,
    reorderCategories,
    reorderSubcategories,
  }
}
