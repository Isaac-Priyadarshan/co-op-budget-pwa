// src/types/database.ts
// ─────────────────────────────────────────────────────────────────────────────
// Canonical TypeScript interfaces for every Supabase table.
// Column names, types, nullability, and check-constraint enums are derived
// directly from the live schema (hfwjilaymwjmbusqylkl, public schema).
// Update this file whenever a migration adds or removes columns.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared primitives ─────────────────────────────────────────────────────────
export type AppOwner = 'Isaac' | 'Jenifa' | 'Both'
export type AppUser  = 'Isaac' | 'Jenifa'

// ── 1. categories ─────────────────────────────────────────────────────────────
export interface Category {
  id:         string           // uuid, PK
  type:       'expense' | 'income'
  label:      string
  icon:       string           // default '📦'
  accent:     string           // default '#FBBF24'
  glow:       string           // default 'rgba(251,191,36,0.22)'
  bg:         string           // default 'rgba(251,191,36,0.12)'
  created_at: string | null    // timestamptz
  sort_order: number | null    // int4
}

export interface CategoryInsert {
  type:        'expense' | 'income'
  label:       string
  icon?:       string
  accent?:     string
  glow?:       string
  bg?:         string
  sort_order?: number | null
}

export interface CategoryUpdate {
  label?:      string
  icon?:       string
  accent?:     string
  glow?:       string
  bg?:         string
  sort_order?: number | null
}

// ── 2. subcategories ──────────────────────────────────────────────────────────
export interface Subcategory {
  id:          string        // uuid, PK
  category_id: string        // uuid, FK → categories.id
  label:       string
  created_at:  string | null // timestamptz
  sort_order:  number | null // int4
}

export interface SubcategoryInsert {
  category_id: string
  label:       string
  sort_order?: number | null
}

export interface SubcategoryUpdate {
  label?:      string
  sort_order?: number | null
}

// ── 3. transactions ───────────────────────────────────────────────────────────
export type TransactionType      = 'income' | 'expense' | 'transfer'
export type TransferDirection    = 'in' | 'out'

export interface Transaction {
  id:                 string                 // uuid, PK
  amount:             number                 // numeric ≥ 0
  description:        string
  /** Subcategory label (or parent label when no subs). Used for display + budget matching. */
  category:           string
  created_by:         AppUser
  type:               TransactionType
  created_at:         string                 // timestamptz
  transaction_date:   string                 // date (YYYY-MM-DD)
  wallet_id:          string | null          // uuid FK → wallets.id
  transfer_pair_id:   string | null          // uuid — links two transfer legs
  category_id:        string | null          // uuid FK → categories.id
  subcategory_id:     string | null          // uuid FK → subcategories.id
  updated_at:         string | null          // timestamptz, auto-updated by trigger
  transfer_direction: TransferDirection | null
}

export interface TransactionInsert {
  amount:             number
  description:        string
  category:           string
  created_by:         AppUser
  type:               TransactionType
  transaction_date?:  string
  wallet_id?:         string | null
  transfer_pair_id?:  string | null
  category_id?:       string | null
  subcategory_id?:    string | null
  transfer_direction?: TransferDirection | null
}

// ── 4. wallets ────────────────────────────────────────────────────────────────
export type WalletType = 'cash' | 'credit'

export interface Wallet {
  id:           string          // uuid, PK
  owner:        string | null   // text (no enum constraint)
  type:         WalletType
  label:        string
  balance:      number          // numeric, default 0
  updated_at:   string          // timestamptz
  credit_limit: number | null   // numeric
  billing_date: number | null   // int4  (day-of-month 1–31)
  due_date:     number | null   // int4  (day-of-month 1–31)
  sort_order:   number | null   // int4, default 0
}

export interface WalletInsert {
  label:        string
  type:         WalletType
  balance?:     number
  owner?:       string | null
  credit_limit?: number | null
  billing_date?: number | null
  due_date?:     number | null
  sort_order?:   number | null
}

export interface WalletUpdate {
  label?:        string
  type?:         WalletType
  balance?:      number
  owner?:        string | null
  credit_limit?: number | null
  billing_date?: number | null
  due_date?:     number | null
  sort_order?:   number | null
}

// ── 5. budgets ────────────────────────────────────────────────────────────────
export interface Budget {
  id:              string        // uuid, PK
  /** Subcategory label (e.g. "Oil", "Gym"). */
  category:        string
  /** Parent category label (e.g. "Food and Drinks"). */
  parent_category: string
  amount:          number        // numeric, default 0
  /** YYYY-MM format — e.g. "2026-07" */
  month:           string
  created_at:      string | null // timestamptz
  subcategory_id:  string | null // uuid FK → subcategories.id
  category_id:     string        // uuid FK → categories.id (required, never null)
}

export interface BudgetInsert {
  category:        string
  parent_category: string
  amount:          number
  month:           string
  subcategory_id?: string | null
  category_id:     string
}

export interface BudgetUpdate {
  amount?: number
}

// ── 6. loans ─────────────────────────────────────────────────────────────────
export interface Loan {
  id:            string          // uuid, PK
  label:         string
  principal:     number          // numeric ≥ 0
  outstanding:   number          // numeric ≥ 0
  emi_amount:    number | null   // numeric ≥ 0
  interest_rate: number          // numeric, default 0
  owner:         AppOwner | null // default 'Both'
  lender:        string
  closed:        boolean         // default false
  created_at:    string          // timestamptz
  start_date:    string | null   // date
  end_date:      string | null   // date
  /** Display order for drag-to-reorder. Default 9999 = append to end. */
  sort_order:    number | null
}

export interface LoanInsert {
  label:          string
  principal:      number
  outstanding:    number
  lender:         string
  emi_amount?:    number | null
  interest_rate?: number
  owner?:         AppOwner | null
  start_date?:    string | null
  end_date?:      string | null
  sort_order?:    number | null
}

export interface LoanUpdate {
  label?:         string
  outstanding?:   number
  emi_amount?:    number | null
  interest_rate?: number
  closed?:        boolean
  end_date?:      string | null
  sort_order?:    number | null
}

// ── 7. recurring_payments ─────────────────────────────────────────────────────
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface RecurringPayment {
  id:          string                   // uuid, PK
  label:       string
  amount:      number                   // numeric > 0
  /** Text category name (legacy) — prefer category_id when available. */
  category:    string                   // default 'Other'
  frequency:   RecurringFrequency       // default 'monthly'
  next_due:    string                   // date
  owner:       AppOwner
  active:      boolean                  // default true
  notes:       string                   // default ''
  created_at:  string                   // timestamptz
  /** Optional FK → categories.id. NULL = legacy text-only category. */
  category_id: string | null
  /** Display order for drag-to-reorder. Default 9999. */
  sort_order:  number | null
}

export interface RecurringPaymentInsert {
  label:        string
  amount:       number
  owner:        AppOwner
  frequency?:   RecurringFrequency
  category?:    string
  category_id?: string | null
  next_due?:    string | null
  notes?:       string
  sort_order?:  number | null
}

export interface RecurringPaymentUpdate {
  label?:       string
  amount?:      number
  frequency?:   RecurringFrequency
  category?:    string
  category_id?: string | null
  next_due?:    string | null
  owner?:       AppOwner
  active?:      boolean
  notes?:       string
  sort_order?:  number | null
}

// ── 8. assets ─────────────────────────────────────────────────────────────────
export interface Asset {
  id:            string          // uuid, PK
  label:         string
  category:      string
  value:         number          // numeric ≥ 0
  owner:         AppOwner
  notes:         string | null
  created_at:    string          // timestamptz
  /**
   * API symbol:
   *   Stocks   → "RELIANCE.NS" (Yahoo Finance)
   *   Crypto   → "BTC-USD"     (Yahoo Finance)
   *   MF       → HDFC AMFI scheme code
   *   Metal    → "GOLD" | "SILVER" | "PLATINUM"
   */
  ticker:        string | null
  /** Number of units / shares / grams held. */
  quantity:      number | null   // numeric ≥ 0
  /** Average purchase price per unit in INR. */
  buy_price:     number | null   // numeric ≥ 0
  /** Latest fetched price per unit in INR (updated by cron or on-demand). */
  current_price: number | null   // numeric ≥ 0
  /** Timestamp of last successful price sync. */
  last_synced:   string | null   // timestamptz
  /** Default 9999 = append to end. */
  sort_order:    number | null
}

export interface AssetInsert {
  label:          string
  category:       string
  value:          number
  owner:          AppOwner
  notes?:         string | null
  ticker?:        string | null
  quantity?:      number | null
  buy_price?:     number | null
  current_price?: number | null
  sort_order?:    number | null
}

export interface AssetUpdate {
  label?:         string
  category?:      string
  value?:         number
  notes?:         string | null
  ticker?:        string | null
  quantity?:      number | null
  buy_price?:     number | null
  current_price?: number | null
  last_synced?:   string | null
  sort_order?:    number | null
}

// ── 9. lent ───────────────────────────────────────────────────────────────────
export type LentStatus = 'pending' | 'partial' | 'settled'

export interface Lent {
  id:               string          // uuid, PK
  person:           string          // who was lent money to
  amount:           number          // numeric ≥ 0
  description:      string
  lent_by:          AppUser         // 'Isaac' | 'Jenifa'
  settled:          boolean         // default false
  created_at:       string          // timestamptz
  paid_amount:      number          // numeric ≥ 0, default 0
  status:           LentStatus      // default 'pending'
  due_date:         string | null   // date
  source_wallet_id: string | null   // uuid FK → wallets.id
  sort_order:       number | null   // int4
}

export interface LentInsert {
  person:            string
  amount:            number
  description:       string
  lent_by:           AppUser
  due_date?:         string | null
  source_wallet_id?: string | null
  sort_order?:       number | null
}

export interface LentUpdate {
  paid_amount?:      number
  status?:           LentStatus
  settled?:          boolean
  description?:      string
  due_date?:         string | null
  sort_order?:       number | null
}

// ── 10. borrowed ──────────────────────────────────────────────────────────────
export type BorrowedStatus = 'pending' | 'partial' | 'settled'

export interface Borrowed {
  id:               string           // uuid, PK
  person:           string           // who money was borrowed from
  amount:           number           // numeric ≥ 0
  description:      string
  borrowed_by:      AppUser          // 'Isaac' | 'Jenifa'
  settled:          boolean          // default false
  created_at:       string           // timestamptz
  paid_amount:      number           // numeric ≥ 0, default 0
  status:           BorrowedStatus   // default 'pending'
  due_date:         string | null    // date
  source_wallet_id: string | null    // uuid FK → wallets.id
  sort_order:       number           // int4, default 0
}

export interface BorrowedInsert {
  person:            string
  amount:            number
  description:       string
  borrowed_by:       AppUser
  due_date?:         string | null
  source_wallet_id?: string | null
  sort_order?:       number
}

export interface BorrowedUpdate {
  paid_amount?:      number
  status?:           BorrowedStatus
  settled?:          boolean
  description?:      string
  due_date?:         string | null
  sort_order?:       number
}

// ── 11. user_preferences ──────────────────────────────────────────────────────
export interface UserPreference {
  user_name:         AppUser        // PK — 'Isaac' | 'Jenifa'
  default_wallet_id: string | null  // uuid FK → wallets.id
  updated_at:        string | null  // timestamptz
}

export interface UserPreferenceUpsert {
  user_name:          AppUser
  default_wallet_id?: string | null
}
