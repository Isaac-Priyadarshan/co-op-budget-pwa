import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { formatINR } from '../../utils/format'

interface CategoryCard {
  id: string
  label: string
  icon: string
  bg: string
  accent: string
  glow: string
}

const EXPENSE_CATEGORIES: CategoryCard[] = [
  { id: 'food',      label: 'Food',      icon: '🛒', bg: 'rgba(239,68,68,0.12)',   accent: '#F87171', glow: 'rgba(239,68,68,0.20)' },
  { id: 'transport', label: 'Transport', icon: '🚗', bg: 'rgba(251,146,60,0.12)',  accent: '#FB923C', glow: 'rgba(251,146,60,0.20)' },
  { id: 'rent',      label: 'Rent',      icon: '🏠', bg: 'rgba(248,113,113,0.10)', accent: '#FCA5A5', glow: 'rgba(248,113,113,0.18)' },
]

const INCOME_CATEGORIES: CategoryCard[] = [
  { id: 'salary',     label: 'Salary',     icon: '💼', bg: 'rgba(251,191,36,0.12)',  accent: '#FBBF24', glow: 'rgba(251,191,36,0.22)' },
  { id: 'investment', label: 'Investment', icon: '📈', bg: 'rgba(52,211,153,0.12)',  accent: '#34D399', glow: 'rgba(52,211,153,0.20)' },
  { id: 'gift',       label: 'Gift',       icon: '🎁', bg: 'rgba(167,139,250,0.12)', accent: '#A78BFA', glow: 'rgba(167,139,250,0.20)' },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

interface MonthNavProps {
  year: number; month: number; selectedDate: Date | null
  onPrev: () => void; onNext: () => void; onSelectDate: (d: Date) => void
}

function MonthNavigator({ year, month, selectedDate, onPrev, onNext, onSelectDate }: MonthNavProps) {
  const [calOpen, setCalOpen] = useState(false)
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const blanks = Array(firstDay).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const isSelected = (d: number) =>
    selectedDate && selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month && selectedDate.getDate() === d

  const isToday = (d: number) => {
    const t = new Date()
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* ← Prev — gold glass arrow button */}
        <motion.button
          whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }}
          onClick={onPrev}
          style={{
            width: 40, height: 40, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(217,119,6,0.10))',
            border: '1px solid rgba(251,191,36,0.30)',
            boxShadow: '0 2px 14px rgba(251,191,36,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>

        {/* Floating month+year — no box, no border, just text */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setCalOpen(v => !v)}
          style={{
            background: 'none', border: 'none',
            cursor: 'pointer', padding: '4px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}
        >
          <span style={{
            fontSize: 18, fontWeight: 700, color: '#F5F5F5',
            letterSpacing: '-0.01em', lineHeight: 1.1,
          }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <motion.svg
            animate={{ rotate: calOpen ? 180 : 0 }}
            transition={{ duration: 0.22 }}
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="rgba(251,191,36,0.7)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </motion.button>

        {/* → Next — gold glass arrow button */}
        <motion.button
          whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }}
          onClick={onNext}
          style={{
            width: 40, height: 40, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(217,119,6,0.10))',
            border: '1px solid rgba(251,191,36,0.30)',
            boxShadow: '0 2px 14px rgba(251,191,36,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.button>
      </div>

      {/* Inline calendar */}
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
              background: 'rgba(18,14,4,0.92)',
              border: '1px solid rgba(251,191,36,0.20)',
              padding: '16px 14px',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(251,191,36,0.08)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 10 }}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'rgba(251,191,36,0.45)', fontWeight: 700, letterSpacing: '0.06em' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {blanks.map((_, i) => <div key={`b${i}`} />)}
                {days.map(d => (
                  <motion.button
                    key={d} whileTap={{ scale: 0.82 }}
                    onClick={() => { onSelectDate(new Date(year, month, d)); setCalOpen(false) }}
                    style={{
                      aspectRatio: '1', borderRadius: '50%', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: isSelected(d) ? 700 : 400,
                      background: isSelected(d)
                        ? 'linear-gradient(135deg, #F59E0B, #FBBF24)'
                        : isToday(d) ? 'rgba(251,191,36,0.18)' : 'transparent',
                      color: isSelected(d) ? '#000' : isToday(d) ? '#FBBF24' : 'rgba(255,255,255,0.65)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                      boxShadow: isSelected(d) ? '0 2px 8px rgba(251,191,36,0.45)' : 'none',
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
          key={cat.id} whileTap={{ scale: 0.93 }}
          style={{
            borderRadius: 18, padding: '14px 8px',
            background: cat.bg,
            border: `1px solid ${cat.accent}28`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer',
            boxShadow: `0 4px 16px ${cat.glow}`,
          }}
        >
          <span style={{ fontSize: 24 }}>{cat.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: cat.accent, letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'center' }}>{cat.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F5F5F5', fontVariantNumeric: 'tabular-nums' }}>{formatINR(amounts[cat.id] ?? 0)}</span>
        </motion.div>
      ))}
    </div>
  )
}

interface SectionProps {
  title: string; total: number; color: string; glowColor: string
  categories: CategoryCard[]; amounts: Record<string, number>
}

function CollapsibleSection({ title, total, color, glowColor, categories, amounts }: SectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 14 : 0 }}>
        {/* Spacer */}
        <div style={{ width: 28 }} />
        {/* Centered title + total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,245,245,0.65)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>{title}</span>
          <span style={{
            fontSize: 17, fontWeight: 800, color,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 12px ${glowColor}`,
          }}>{formatINR(total)}</span>
        </div>
        {/* Collapse btn */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={() => setOpen(v => !v)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <motion.svg
            animate={{ rotate: open ? 0 : 180 }}
            transition={{ duration: 0.22 }}
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.45)" strokeWidth="2.5"
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
  const monthIncome   = useMemo(() => monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTxs])

  const handlePrev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1); setSelectedDate(null) }
  const handleNext = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1); setSelectedDate(null) }

  return (
    <div style={{ minHeight: '100%', padding: '20px 20px 32px' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
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
                background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.30)',
                borderRadius: 100, padding: '4px 12px 4px 8px', marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 11, color: '#FBBF24', fontWeight: 600 }}>
                📅 {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(251,191,36,0.5)', padding: 0, lineHeight: 1 }}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 60, borderRadius: 16, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)' }} />
            ))}
          </div>
        ) : (
          <>
            <CollapsibleSection
              title="Expenses" total={monthExpenses}
              color="#F87171" glowColor="rgba(248,113,113,0.6)"
              categories={EXPENSE_CATEGORIES} amounts={expenseAmounts}
            />
            <CollapsibleSection
              title="Income" total={monthIncome}
              color="#34D399" glowColor="rgba(52,211,153,0.6)"
              categories={INCOME_CATEGORIES} amounts={incomeAmounts}
            />
          </>
        )}
      </motion.div>
    </div>
  )
}
