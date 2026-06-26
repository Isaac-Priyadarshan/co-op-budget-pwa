export type AppUser = 'Isaac' | 'Jenifa'

export interface Transaction {
  id: string
  amount: number
  description: string
  category: string
  created_by: AppUser
  created_at: string
  type: 'income' | 'expense'
}

export interface BorrowedLent {
  id: string
  amount: number
  person: string
  description: string
  is_settled: boolean
  created_by: AppUser
  created_at: string
  type: 'borrowed' | 'lent'
}

export interface Loan {
  id: string
  name: string
  principal: number
  remaining: number
  emi: number
  due_date: string
  created_by: AppUser
}

export interface Asset {
  id: string
  name: string
  value: number
  category: string
  created_by: AppUser
}

export interface RecurringPayment {
  id: string
  name: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_due: string
  created_by: AppUser
}
