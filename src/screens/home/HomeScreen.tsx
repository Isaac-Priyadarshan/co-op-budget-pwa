import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { formatINR } from '../../utils/format'

// ── Types ────────────────────────────────────────────────────────────────────
interface CategoryCard {
  id: string
  label: string
  icon: string
  pastel: string
  accent: string
}

// ── Static category definitions ──────────────────────────────────────────────
const EXPENSE_CATEGORIES: CategoryCard[] = [
  { id: 'food',      label: 'Food',      icon: '🛒', pastel: 'rgba(134,239,172,0.12)', accent: '#86efac' },
  { id: 'transport', label: 'Transport', icon: '🚗', pastel: 'rgba(147,197,253,0.12)', accent: '#93c5fd' },
  { id: 'rent',      label: 'Rent',      icon: '🏠', pastel: 'rgba(196,181,253,0.12)', accent: '#c4b5fd' },
]

const INCOME_CATEGORIES: CategoryCard[] = [
  { id: 'salary',     label: 'Salary',     icon: '💼', pastel: 'rgba(253,211,77,0.12)',  accent: '#fdd34d' },
  { id: 'investment', label: 'Investment', icon: '📈', pastel: 'rgba(94,234,212,0.12)',  accent: '#5eead4' },
  { id: 'gift',       label: 'Gift',       icon: '🎁', pastel: 'rgba(249,168,212,0.12)', accent: '#f9a8d4' },
]

// ── Month Navigator ───────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

interface MonthNavProps {
  year: number
  month: number
  selectedDate: Date | null
  onPrev: () => void
  onNext: () => void
  onSelectDate: (date: Date) => void
}

function MonthNavigator({ year, month, selectedDate, onPrev, onNext, onSelectDate }: MonthNavProps) {
  const [calOpen, setCalOpen] = useState(false)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const blanks = Array(firstDay).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const isSelected = (d: number) =>
    selectedDate &&
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month &&
    selectedDate.getDate() === d

  const isToday = (d: number) => {
    const t = new Date()
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Navigator row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onPrev}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
          }}
        >‹</motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setCalOpen(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.01em' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <motion.span
            animate={{ rotate: calOpen ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            style={{ fontSize: 10, color: 'rgba(165,180,252,0.6)', lineHeight: 1 }}
          >▾</motion.span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onNext}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
          }}
        >›</motion.button>
      </div>

      {/* Inline calendar dropdown */}
      <AnimatePresence>
        {calOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderRadius: 18,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '14px 12px',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}>
              {/* Day-of-week headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em' }}>{d}</div>
                ))}
              </div>
              {/* Date grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {blanks.map((_, i) => <div key={`b${i}`} />)}
                {days.map(d => (
                  <motion.button
                    key={d}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => {
                      onSelectDate(new Date(year, month, d))
                      setCalOpen(false)
                    }}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: isSelected(d) ? 700 : 400,
                      background: isSelected(d)
                        ? 'rgba(99,102,241,0.8)'
                        : isToday(d)
                        ? 'rgba(255,255,255,0.1)'
                        : 'transparent',
                      color: isSelected(d)
                        ? '#fff'
                        : isToday(d)
                        ? '#a5b4fc'
                        : 'rgba(255,255,255,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%',
                    }}
                  >{d}</motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Category Card Grid ────────────────────────────────────────────────────────
function CategoryGrid({ categories, amounts }: { categories: CategoryCard[]; amounts: Record<string, number> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 4 }}>
      {categories.map(cat => (
        <motion.div
          key={cat.id}
          whileTap={{ scale: 0.95 }}
          style={{
            borderRadius: 16,
            padding: '12px 10px',
            background: cat.pastel,
            border: `1px solid ${cat.accent}28`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22 }}>{cat.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: cat.accent, letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>{cat.label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
            {formatINR(amounts[cat.id] ?? 0)}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// ── Collapsible Section ───────────────────────────────────────────────────────
interface SectionProps {
  title: string
  total: number
  color: string
  categories: CategoryCard[]
  amounts: Record<string, number>
}

function CollapsibleSection({ title, total, color, categories, amounts }: SectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: open ? 12 : 0,
        paddingBottom: 10,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{formatINR(total)}</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setOpen(v => !v)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <motion.span
            animate={{ rotate: open ? 0 : 180 }}
            transition={{ duration: 0.22 }}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1, display: 'block' }}
          >˄</motion.span>
        </motion.button>
      </div>

      {/* Collapsible category grid */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <CategoryGrid categories={categories} amounts={amounts} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main HomeScreen ───────────────────────────────────────────────────────────
export function HomeScreen() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const { transactions, loading } = useTransactions()

  // Filter transactions to selected month
  const monthTxs = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [transactions, year, month])

  // Aggregate category amounts (expense)
  const expenseAmounts = useMemo(() => {
    const map: Record<string, number> = {}
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const key = (t.category ?? '').toLowerCase()
      const matched = EXPENSE_CATEGORIES.find(c => key.includes(c.id)) ?? null
      if (matched) map[matched.id] = (map[matched.id] ?? 0) + t.amount
    })
    return map
  }, [monthTxs])

  // Aggregate category amounts (income)
  const incomeAmounts = useMemo(() => {
    const map: Record<string, number> = {}
    monthTxs.filter(t => t.type === 'income').forEach(t => {
      const key = (t.category ?? '').toLowerCase()
      const matched = INCOME_CATEGORIES.find(c => key.includes(c.id)) ?? null
      if (matched) map[matched.id] = (map[matched.id] ?? 0) + t.amount
    })
    return map
  }, [monthTxs])

  const monthExpenses = useMemo(() => monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTxs])
  const monthIncome = useMemo(() => monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTxs])

  const handlePrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  return (
    <div style={{ padding: '20px 20px 32px', minHeight: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Month Navigator */}
        <MonthNavigator
          year={year}
          month={month}
          selectedDate={selectedDate}
          onPrev={handlePrev}
          onNext={handleNext}
          onSelectDate={setSelectedDate}
        />

        {/* Selected date pill */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.35)',
                borderRadius: 100, padding: '4px 12px 4px 8px',
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>
                📅 {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(165,180,252,0.6)', padding: 0, lineHeight: 1 }}
              >✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : (
          <>
            {/* Expenses Section */}
            <CollapsibleSection
              title="Expenses"
              total={monthExpenses}
              color="#fca5a5"
              categories={EXPENSE_CATEGORIES}
              amounts={expenseAmounts}
            />

            {/* Income Section */}
            <CollapsibleSection
              title="Income"
              total={monthIncome}
              color="#6ee7b7"
              categories={INCOME_CATEGORIES}
              amounts={incomeAmounts}
            />
          </>
        )}
      </motion.div>
    </div>
  )
}
