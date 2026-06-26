import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { formatINR } from '../../utils/format'

interface CategoryCard {
  id: string
  label: string
  icon: string
  pastel: string
  accent: string
}

const EXPENSE_CATEGORIES: CategoryCard[] = [
  { id: 'food',      label: 'Food',      icon: '🛒', pastel: 'rgba(134,239,172,0.10)', accent: '#86efac' },
  { id: 'transport', label: 'Transport', icon: '🚗', pastel: 'rgba(147,197,253,0.10)', accent: '#93c5fd' },
  { id: 'rent',      label: 'Rent',      icon: '🏠', pastel: 'rgba(196,181,253,0.10)', accent: '#c4b5fd' },
]

const INCOME_CATEGORIES: CategoryCard[] = [
  { id: 'salary',     label: 'Salary',     icon: '💼', pastel: 'rgba(253,211,77,0.10)',  accent: '#fdd34d' },
  { id: 'investment', label: 'Investment', icon: '📈', pastel: 'rgba(94,234,212,0.10)',  accent: '#5eead4' },
  { id: 'gift',       label: 'Gift',       icon: '🎁', pastel: 'rgba(249,168,212,0.10)', accent: '#f9a8d4' },
]

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
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Prev arrow — stylish glassmorphism */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.06 }}
          onClick={onPrev}
          style={{
            width: 40, height: 40,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 2px 12px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>

        {/* Month + Year tap target */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setCalOpen(v => !v)}
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 18,
            padding: '8px 20px',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            boxShadow: '0 2px 12px rgba(99,102,241,0.12)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.01em' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <motion.svg
            animate={{ rotate: calOpen ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="rgba(165,180,252,0.7)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </motion.button>

        {/* Next arrow — stylish glassmorphism */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.06 }}
          onClick={onNext}
          style={{
            width: 40, height: 40,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 2px 12px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.button>
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
              borderRadius: 20,
              background: 'rgba(15,18,40,0.85)',
              border: '1px solid rgba(139,92,246,0.25)',
              padding: '16px 14px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 10 }}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'rgba(165,180,252,0.45)', fontWeight: 700, letterSpacing: '0.06em' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {blanks.map((_, i) => <div key={`b${i}`} />)}
                {days.map(d => (
                  <motion.button
                    key={d}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => { onSelectDate(new Date(year, month, d)); setCalOpen(false) }}
                    style={{
                      aspectRatio: '1', borderRadius: '50%', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: isSelected(d) ? 700 : 400,
                      background: isSelected(d) ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : isToday(d) ? 'rgba(99,102,241,0.2)' : 'transparent',
                      color: isSelected(d) ? '#fff' : isToday(d) ? '#a5b4fc' : 'rgba(255,255,255,0.65)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                      boxShadow: isSelected(d) ? '0 2px 8px rgba(99,102,241,0.5)' : 'none',
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

function CategoryGrid({ categories, amounts }: { categories: CategoryCard[]; amounts: Record<string, number> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 4 }}>
      {categories.map(cat => (
        <motion.div
          key={cat.id}
          whileTap={{ scale: 0.94 }}
          style={{
            borderRadius: 16, padding: '14px 10px',
            background: cat.pastel,
            border: `1px solid ${cat.accent}30`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer',
            boxShadow: `0 2px 12px ${cat.accent}10`,
          }}
        >
          <span style={{ fontSize: 22 }}>{cat.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: cat.accent, letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center' }}>{cat.label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>{formatINR(amounts[cat.id] ?? 0)}</span>
        </motion.div>
      ))}
    </div>
  )
}

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
      {/* Header row — centered label + value, collapse btn right */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: open ? 14 : 0,
      }}>
        {/* Spacer to balance the collapse button */}
        <div style={{ width: 28 }} />

        {/* Centered title + total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{formatINR(total)}</span>
        </div>

        {/* Collapse button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setOpen(v => !v)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <motion.svg
            animate={{ rotate: open ? 0 : 180 }}
            transition={{ duration: 0.22 }}
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </motion.svg>
        </motion.button>
      </div>

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

export function HomeScreen() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const { transactions, loading } = useTransactions()

  const monthTxs = useMemo(() => transactions.filter(tx => {
    const d = new Date(tx.created_at)
    return d.getFullYear() === year && d.getMonth() === month
  }), [transactions, year, month])

  const expenseAmounts = useMemo(() => {
    const map: Record<string, number> = {}
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      const key = (t.category ?? '').toLowerCase()
      const matched = EXPENSE_CATEGORIES.find(c => key.includes(c.id)) ?? null
      if (matched) map[matched.id] = (map[matched.id] ?? 0) + t.amount
    })
    return map
  }, [monthTxs])

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
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  return (
    <div style={{ minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Premium atmospheric background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '90vw', height: '90vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '30%', right: '-20%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div style={{ padding: '20px 20px 32px', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <MonthNavigator
            year={year} month={month} selectedDate={selectedDate}
            onPrev={handlePrev} onNext={handleNext} onSelectDate={setSelectedDate}
          />

          {/* Selected date pill */}
          <AnimatePresence>
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: 100, padding: '4px 12px 4px 8px', marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>
                  📅 {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(165,180,252,0.6)', padding: 0, lineHeight: 1 }}>✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />)}
            </div>
          ) : (
            <>
              <CollapsibleSection title="Expenses" total={monthExpenses} color="#fca5a5" categories={EXPENSE_CATEGORIES} amounts={expenseAmounts} />
              <CollapsibleSection title="Income" total={monthIncome} color="#6ee7b7" categories={INCOME_CATEGORIES} amounts={incomeAmounts} />
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
