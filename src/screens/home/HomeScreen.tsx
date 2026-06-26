import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { formatINR } from '../../utils/format'

export interface CategoryCard {
  id: string
  label: string
  icon: string
  bg: string
  accent: string
  glow: string
}

const DEFAULT_EXPENSE_CATEGORIES: CategoryCard[] = [
  { id: 'food',      label: 'Food',      icon: '🛒', bg: 'rgba(239,68,68,0.12)',   accent: '#F87171', glow: 'rgba(239,68,68,0.20)' },
  { id: 'transport', label: 'Transport', icon: '🚗', bg: 'rgba(251,146,60,0.12)',  accent: '#FB923C', glow: 'rgba(251,146,60,0.20)' },
  { id: 'rent',      label: 'Rent',      icon: '🏠', bg: 'rgba(248,113,113,0.10)', accent: '#FCA5A5', glow: 'rgba(248,113,113,0.18)' },
]

const DEFAULT_INCOME_CATEGORIES: CategoryCard[] = [
  { id: 'salary',     label: 'Salary',     icon: '💼', bg: 'rgba(251,191,36,0.12)',  accent: '#FBBF24', glow: 'rgba(251,191,36,0.22)' },
  { id: 'investment', label: 'Investment', icon: '📈', bg: 'rgba(52,211,153,0.12)',  accent: '#34D399', glow: 'rgba(52,211,153,0.20)' },
  { id: 'gift',       label: 'Gift',       icon: '🎁', bg: 'rgba(167,139,250,0.12)', accent: '#A78BFA', glow: 'rgba(167,139,250,0.20)' },
]

const ACCENT_SWATCHES = [
  { accent: '#F87171', glow: 'rgba(248,113,113,0.22)', bg: 'rgba(239,68,68,0.12)' },
  { accent: '#FB923C', glow: 'rgba(251,146,60,0.22)',  bg: 'rgba(251,146,60,0.12)' },
  { accent: '#FBBF24', glow: 'rgba(251,191,36,0.22)',  bg: 'rgba(251,191,36,0.12)' },
  { accent: '#34D399', glow: 'rgba(52,211,153,0.22)',  bg: 'rgba(52,211,153,0.12)' },
  { accent: '#60A5FA', glow: 'rgba(96,165,250,0.22)',  bg: 'rgba(96,165,250,0.12)' },
  { accent: '#A78BFA', glow: 'rgba(167,139,250,0.22)', bg: 'rgba(167,139,250,0.12)' },
  { accent: '#F9A8D4', glow: 'rgba(249,168,212,0.22)', bg: 'rgba(249,168,212,0.12)' },
  { accent: '#5EEAD4', glow: 'rgba(94,234,212,0.22)',  bg: 'rgba(94,234,212,0.12)' },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay() }

// ─── Category Manager Sheet ───────────────────────────────────────────────────
interface CategoryManagerProps {
  type: 'expense' | 'income'
  categories: CategoryCard[]
  onClose: () => void
  onSave: (cats: CategoryCard[]) => void
}

function CategoryManagerSheet({ type, categories, onClose, onSave }: CategoryManagerProps) {
  const [cats, setCats] = useState<CategoryCard[]>(categories)
  const [newIcon, setNewIcon]   = useState('✨')
  const [newLabel, setNewLabel] = useState('')
  const [selectedSwatch, setSelectedSwatch] = useState(0)
  const [error, setError] = useState('')

  const handleDelete = (id: string) => {
    if (cats.length <= 1) { setError('Need at least 1 category.'); return }
    setCats(prev => prev.filter(c => c.id !== id))
    setError('')
  }

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) { setError('Enter a category name.'); return }
    if (cats.find(c => c.label.toLowerCase() === label.toLowerCase())) {
      setError('Category already exists.'); return
    }
    const swatch = ACCENT_SWATCHES[selectedSwatch]
    const newCat: CategoryCard = {
      id: label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      label, icon: newIcon,
      accent: swatch.accent, glow: swatch.glow, bg: swatch.bg,
    }
    setCats(prev => [...prev, newCat])
    setNewIcon('✨')
    setNewLabel('')
    setError('')
  }

  const handleSave = () => { onSave(cats); onClose() }

  const title = type === 'expense' ? 'Expense Categories' : 'Income Categories'

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
          background: '#0e0c06',
          border: '1px solid rgba(251,191,36,0.18)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,191,36,0.08)',
          maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(251,191,36,0.25)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5' }}>Manage {title}</span>
          <motion.button
            whileTap={{ scale: 0.88 }} onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)', fontSize: 14,
            }}
          >✕</motion.button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 20px' }}>

          {/* Existing categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {cats.map(cat => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: cat.bg,
                  border: `1px solid ${cat.accent}25`,
                  borderRadius: 16,
                  boxShadow: `0 2px 10px ${cat.glow}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{cat.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: cat.accent }}>{cat.label}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.82 }}
                  onClick={() => handleDelete(cat.id)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 14,
                  }}
                >🗑️</motion.button>
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(251,191,36,0.10)', marginBottom: 20 }} />

          {/* Add new category */}
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Add New Category</p>

          {/* Icon + Name row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              value={newIcon}
              onChange={e => setNewIcon(e.target.value)}
              maxLength={2}
              style={{
                width: 52, height: 48, borderRadius: 14, textAlign: 'center',
                fontSize: 22, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F5',
                outline: 'none', flexShrink: 0,
              }}
            />
            <input
              value={newLabel}
              onChange={e => { setNewLabel(e.target.value); setError('') }}
              placeholder="Category name…"
              style={{
                flex: 1, height: 48, borderRadius: 14, padding: '0 14px',
                fontSize: 14, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F5',
                outline: 'none',
              }}
            />
          </div>

          {/* Colour swatches */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {ACCENT_SWATCHES.map((sw, i) => (
              <motion.button
                key={i} whileTap={{ scale: 0.82 }}
                onClick={() => setSelectedSwatch(i)}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: sw.accent,
                  border: selectedSwatch === i ? '2.5px solid #fff' : '2.5px solid transparent',
                  boxShadow: selectedSwatch === i ? `0 0 10px ${sw.glow}` : 'none',
                  cursor: 'pointer', flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontSize: 12, color: '#F87171', marginBottom: 12 }}
              >{error}</motion.p>
            )}
          </AnimatePresence>

          {/* Add button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAdd}
            style={{
              width: '100%', height: 48, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(217,119,6,0.16))',
              border: '1px solid rgba(251,191,36,0.35)',
              color: '#FBBF24', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.03em',
              boxShadow: '0 2px 12px rgba(251,191,36,0.14)',
              marginBottom: 12,
            }}
          >+ Add Category</motion.button>

          {/* Save button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            style={{
              width: '100%', height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
              border: 'none', color: '#000', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', letterSpacing: '0.02em',
              boxShadow: '0 4px 20px rgba(251,191,36,0.35)',
            }}
          >Save Changes</motion.button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Month Navigator ──────────────────────────────────────────────────────────
interface MonthNavProps {
  year: number; month: number; selectedDate: Date | null
  onPrev: () => void; onNext: () => void; onSelectDate: (d: Date) => void
}

function MonthNavigator({ year, month, selectedDate, onPrev, onNext, onSelectDate }: MonthNavProps) {
  const [calOpen, setCalOpen] = useState(false)
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay    = getFirstDayOfMonth(year, month)
  const blanks = Array(firstDay).fill(null)
  const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1)

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
        {/* Prev */}
        <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }} onClick={onPrev}
          style={{
            width: 40, height: 40, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(217,119,6,0.10))',
            border: '1px solid rgba(251,191,36,0.30)',
            boxShadow: '0 2px 14px rgba(251,191,36,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </motion.button>

        {/* Floating month label */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCalOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <motion.svg animate={{ rotate: calOpen ? 180 : 0 }} transition={{ duration: 0.22 }}
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="rgba(251,191,36,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          ><polyline points="6 9 12 15 18 9" /></motion.svg>
        </motion.button>

        {/* Next */}
        <motion.button whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.08 }} onClick={onNext}
          style={{
            width: 40, height: 40, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(217,119,6,0.10))',
            border: '1px solid rgba(251,191,36,0.30)',
            boxShadow: '0 2px 14px rgba(251,191,36,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </motion.button>
      </div>

      {/* Calendar dropdown */}
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
              borderRadius: 20, background: 'rgba(18,14,4,0.92)',
              border: '1px solid rgba(251,191,36,0.20)', padding: '16px 14px',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 10 }}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'rgba(251,191,36,0.45)', fontWeight: 700, letterSpacing: '0.06em' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {blanks.map((_, i) => <div key={`b${i}`} />)}
                {days.map(d => (
                  <motion.button key={d} whileTap={{ scale: 0.82 }}
                    onClick={() => { onSelectDate(new Date(year, month, d)); setCalOpen(false) }}
                    style={{
                      aspectRatio: '1', borderRadius: '50%', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: isSelected(d) ? 700 : 400,
                      background: isSelected(d) ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : isToday(d) ? 'rgba(251,191,36,0.18)' : 'transparent',
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

// ─── Category Grid ────────────────────────────────────────────────────────────
function CategoryGrid({ categories, amounts }: { categories: CategoryCard[]; amounts: Record<string, number> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 4 }}>
      {categories.map(cat => (
        <motion.div key={cat.id} whileTap={{ scale: 0.93 }}
          style={{
            borderRadius: 18, padding: '14px 8px',
            background: cat.bg, border: `1px solid ${cat.accent}28`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer', boxShadow: `0 4px 16px ${cat.glow}`,
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

// ─── Collapsible Section ──────────────────────────────────────────────────────
interface SectionProps {
  title: string; total: number; color: string; glowColor: string
  categories: CategoryCard[]; amounts: Record<string, number>
  type: 'expense' | 'income'
  onManage: () => void
}

function CollapsibleSection({ title, total, color, glowColor, categories, amounts, onManage }: SectionProps) {
  const [open, setOpen] = useState(true)

  return (
    <div style={{ marginBottom: 22 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 14 : 0 }}>

        {/* + Manage button (left side) */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={onManage}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
            border: '1px solid rgba(251,191,36,0.32)',
            boxShadow: '0 2px 8px rgba(251,191,36,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>

        {/* Centered title + total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,245,245,0.65)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>{title}</span>
          <span style={{ fontSize: 17, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 12px ${glowColor}` }}>
            {formatINR(total)}
          </span>
        </div>

        {/* Collapse button (right side) */}
        <motion.button
          whileTap={{ scale: 0.82 }}
          onClick={() => setOpen(v => !v)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <motion.svg
            animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.22 }}
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          ><polyline points="18 15 12 9 6 15" /></motion.svg>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="content"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
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

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export function HomeScreen() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const [expenseCategories, setExpenseCategories] = useState<CategoryCard[]>(DEFAULT_EXPENSE_CATEGORIES)
  const [incomeCategories,  setIncomeCategories]  = useState<CategoryCard[]>(DEFAULT_INCOME_CATEGORIES)
  const [managerOpen, setManagerOpen] = useState<'expense' | 'income' | null>(null)

  const { transactions, loading } = useTransactions()

  const monthTxs = useMemo(() => transactions.filter(tx => {
    const d = new Date(tx.created_at)
    return d.getFullYear() === year && d.getMonth() === month
  }), [transactions, year, month])

  const calcAmounts = (cats: CategoryCard[], type: 'expense' | 'income') =>
    cats.reduce((map, cat) => {
      const total = monthTxs
        .filter(t => t.type === type && (t.category ?? '').toLowerCase().includes(cat.id.split('-')[0]))
        .reduce((s, t) => s + t.amount, 0)
      return { ...map, [cat.id]: total }
    }, {} as Record<string, number>)

  const expenseAmounts = useMemo(() => calcAmounts(expenseCategories, 'expense'), [monthTxs, expenseCategories])
  const incomeAmounts  = useMemo(() => calcAmounts(incomeCategories,  'income'),  [monthTxs, incomeCategories])

  const monthExpenses = useMemo(() => monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTxs])
  const monthIncome   = useMemo(() => monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTxs])

  const handlePrev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1); setSelectedDate(null) }
  const handleNext = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1); setSelectedDate(null) }

  return (
    <div style={{ minHeight: '100%', padding: '20px 20px 32px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>

        <MonthNavigator year={year} month={month} selectedDate={selectedDate} onPrev={handlePrev} onNext={handleNext} onSelectDate={setSelectedDate} />

        {/* Selected date pill */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
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
            {[1,2,3,4].map(i => <div key={i} style={{ height: 60, borderRadius: 16, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)' }} />)}
          </div>
        ) : (
          <>
            <CollapsibleSection
              title="Expenses" total={monthExpenses} color="#F87171" glowColor="rgba(248,113,113,0.6)"
              categories={expenseCategories} amounts={expenseAmounts}
              type="expense" onManage={() => setManagerOpen('expense')}
            />
            <CollapsibleSection
              title="Income" total={monthIncome} color="#34D399" glowColor="rgba(52,211,153,0.6)"
              categories={incomeCategories} amounts={incomeAmounts}
              type="income" onManage={() => setManagerOpen('income')}
            />
          </>
        )}
      </motion.div>

      {/* Category Manager Sheet */}
      <AnimatePresence>
        {managerOpen && (
          <CategoryManagerSheet
            key={managerOpen}
            type={managerOpen}
            categories={managerOpen === 'expense' ? expenseCategories : incomeCategories}
            onClose={() => setManagerOpen(null)}
            onSave={cats => {
              if (managerOpen === 'expense') setExpenseCategories(cats)
              else setIncomeCategories(cats)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
