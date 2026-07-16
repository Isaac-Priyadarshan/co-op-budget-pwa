// src/context/MonthContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the selected month/year across the entire app.
// HomeScreen's prev/next arrows write here; any screen that needs the current
// month (Budget, Ledger filters) reads from here.
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

interface MonthContextValue {
  month: number  // 1-indexed  (1 = January)
  year:  number
  setMonth: (month: number, year: number) => void
  prevMonth: () => void
  nextMonth: () => void
}

const MonthContext = createContext<MonthContextValue | undefined>(undefined)

export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const [month, setM] = useState(now.getMonth() + 1) // getMonth() is 0-indexed
  const [year,  setY] = useState(now.getFullYear())

  const setMonth = useCallback((m: number, y: number) => {
    setM(m)
    setY(y)
  }, [])

  const prevMonth = useCallback(() => {
    setM(prev => {
      if (prev === 1) { setY(y => y - 1); return 12 }
      return prev - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setM(prev => {
      if (prev === 12) { setY(y => y + 1); return 1 }
      return prev + 1
    })
  }, [])

  return (
    <MonthContext.Provider value={{ month, year, setMonth, prevMonth, nextMonth }}>
      {children}
    </MonthContext.Provider>
  )
}

export function useMonthContext() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonthContext must be used within MonthProvider')
  return ctx
}
