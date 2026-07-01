// src/types/category.ts
// Shared category / subcategory type definitions.

export interface Category {
  id: string
  label: string
  icon: string
  accent: string
  glow: string
  bg: string
  type: 'expense' | 'income'
  sort_order?: number | null
}

export interface Subcategory {
  id: string
  category_id: string
  label: string
  sort_order?: number | null
}
