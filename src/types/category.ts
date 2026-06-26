export interface Category {
  id: string
  type: 'expense' | 'income'
  label: string
  icon: string
  accent: string
  glow: string
  bg: string
  sort_order?: number
  created_at?: string
}

export interface Subcategory {
  id: string
  category_id: string
  label: string
  sort_order?: number
  created_at?: string
}
