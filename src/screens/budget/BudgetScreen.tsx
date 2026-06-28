import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions, isExcluded } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useBudgets } from '../../hooks/useBudgets'
import { formatINR } from '../../utils/format'
import type { Subcategory } from '../../types/category'

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}`
}
function monthStart(y: number, m: number): string {
  return `${monthKey(y, m)}-01`
}
function monthEnd(y: number, m: number): string {
  return new Date(y, m + 1, 0).toISOString().slice(0, 10)
}

// ─── Animated Wave Canvas ────────────────────────────────────────────────────
function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let t = 0
    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.52 + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
                           + Math.sin((x / W) * Math.PI * 1.1 + t * 0.35) * H * 0.07
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      const g1 = ctx.createLinearGradient(0, 0, 0, H)
      g1.addColorStop(0, 'rgba(251,191,36,0.18)')
      g1.addColorStop(1, 'rgba(251,191,36,0.04)')
      ctx.fillStyle = g1; ctx.fill()

      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.64 + Math.sin((x / W) * Math.PI * 3.2 + t * 0.9 + 1.2) * H * 0.09
                           + Math.sin((x / W) * Math.PI * 1.8 + t * 0.5 + 0.6) * H * 0.05
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      const g2 = ctx.createLinearGradient(0, 0, 0, H)
      g2.addColorStop(0, 'rgba(217,119,6,0.14)')
      g2.addColorStop(1, 'rgba(217,119,6,0.03)')
      ctx.fillStyle = g2; ctx.fill()

      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.52 + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
                           + Math.sin((x / W) * Math.PI * 1.1 + t * 0.35) * H * 0.07
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(251,191,36,0.28)'; ctx.lineWidth = 1.2; ctx.stroke()

      t += 0.012
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas ref={canvasRef} width={600} height={100}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '100%', borderRadius: 22, pointerEvents: 'none' }}
    />
  )
}

// ─── Budget Progress Bar ─────────────────────────────────────────────────────
function BudgetBar({ spent, planned, accent }: { spent: number; planned: number; accent: string }) {
  const pct     = planned > 0 ? Math.min(100, (spent / planned) * 100) : 0
  const over    = planned > 0 && spent > planned
  const barColor = over ? '#F87171' : accent
  return (
    <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 6 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', borderRadius: 99, background: barColor }}
      />
    </div>
  )
}

// ─── Add / Edit Budget Sheet ─────────────────────────────────────────────────
function BudgetSheet({
  open, mode, initialLabel, initialBudget, onClose, onSave,
}: {
  open: boolean
  mode: 'add' | 'edit'
  initialLabel?: string
  initialBudget?: number
  onClose: () => void
  onSave: (label: string, amount: number) => Promise<void>
}) {
  const [label,   setLabel]   = useState(initialLabel  ?? '')
  const [amount,  setAmount]  = useState(initialBudget ? String(initialBudget) : '')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    if (open) {
      setLabel(initialLabel  ?? '')
      setAmount(initialBudget ? String(initialBudget) : '')
      setErr('')
    }
  }, [open, initialLabel, initialBudget])

  const handleSave = async () => {
    if (!label.trim())               { setErr('Enter a category name'); return }
    if (!amount || Number(amount) < 0){ setErr('Enter a valid amount'); return }
    setSaving(true); setErr('')
    try   { await onSave(label.trim(), Number(amount)) }
    catch { setErr('Failed to save. Try again.') }
    finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none', WebkitAppearance: 'none',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 28px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 20px' }} />
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 24 }}>
              {mode === 'add' ? 'Add Budget' : 'Edit Budget'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>Category / Subcategory</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Food, Rent…" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>Budget Amount (₹)</label>
                <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(251,191,36,0.9), rgba(217,119,6,0.9))', color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1 }}
              >{saving ? 'Saving…' : mode === 'add' ? 'Add Budget' : 'Save Changes'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main BudgetScreen ───────────────────────────────────────────────────────
export default function BudgetScreen() {
  const now   = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year,  setYear]  = useState(now.getFullYear())

  const mKey   = monthKey(year, month)
  const mStart = monthStart(year, month)
  const mEnd   = monthEnd(year, month)

  const { transactions, loading: txLoading } = useTransactions()
  const { expenseCategories, subcategories }  = useCategories()
  const { totalPlanned, getBudget, getParentTotal, upsertBudget, loading: budgetLoading } = useBudgets(mKey)

  // ── Month-scoped expense transactions (uses transaction_date, not created_at) ─
  // isExcluded() strips out Lent, Borrowed, Transfer, Recovery, Repayment rows
  // so they never inflate budget spending figures.
  const monthTxs = useMemo(() => {
    const start = new Date(mStart + 'T00:00:00')
    const end   = new Date(mEnd   + 'T23:59:59')
    return transactions.filter(tx => {
      const dateStr = (tx.transaction_date ?? tx.created_at ?? '').substring(0, 10)
      const d = new Date(dateStr + 'T00:00:00')
      return tx.type === 'expense' && !isExcluded(tx) && d >= start && d <= end
    })
  }, [transactions, mStart, mEnd])

  const totalSpent = useMemo(() => monthTxs.reduce((s, t) => s + t.amount, 0), [monthTxs])
  const totalLeft  = totalPlanned - totalSpent

  // ── Spent per parent category ────────────────────────────────────────────────
  const spentByParent = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of monthTxs) {
      const cat = (tx.category ?? '').toLowerCase()
      const parent = expenseCategories.find(c =>
        c.label.toLowerCase() === cat ||
        (subcategories[c.id] ?? []).some((s: Subcategory) => s.label.toLowerCase() === cat)
      )
      if (parent) {
        map[parent.label] = (map[parent.label] ?? 0) + tx.amount
      }
    }
    return map
  }, [monthTxs, expenseCategories, subcategories])

  // ── Spent per subcategory ────────────────────────────────────────────────────
  const spentBySub = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of monthTxs) {
      const key = (tx.category ?? '').toLowerCase()
      map[key] = (map[key] ?? 0) + tx.amount
    }
    return map
  }, [monthTxs])

  // ── Most overspent & most available subcategory ──────────────────────────────
  const { mostOverspent, mostAvailable } = useMemo(() => {
    let topOver: { name: string; amount: number } | null = null
    let topAvail: { name: string; amount: number } | null = null

    for (const cat of expenseCategories) {
      const subs = (subcategories[cat.id] ?? []) as Subcategory[]
      for (const sub of subs) {
        const budget = getBudget(sub.label)
        if (budget == null || budget <= 0) continue
        const spent = spentBySub[sub.label.toLowerCase()] ?? 0
        const over  = spent - budget
        const avail = budget - spent
        if (over > 0 && (!topOver  || over  > topOver.amount))  topOver  = { name: sub.label, amount: over  }
        if (avail > 0 && (!topAvail || avail > topAvail.amount)) topAvail = { name: sub.label, amount: avail }
      }
    }
    return { mostOverspent: topOver, mostAvailable: topAvail }
  }, [expenseCategories, subcategories, getBudget, spentBySub])

  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [sheetMode,    setSheetMode]    = useState<'add' | 'edit'>('add')
  const [sheetLabel,   setSheetLabel]   = useState('')
  const [sheetBudget,  setSheetBudget]  = useState<number | undefined>()

  const openAdd  = () => { setSheetMode('add');  setSheetLabel('');    setSheetBudget(undefined); setSheetOpen(true) }
  const openEdit = (label: string, budget: number) => { setSheetMode('edit'); setSheetLabel(label); setSheetBudget(budget); setSheetOpen(true) }

  // FIX: upsertBudget signature is (category, parentCategory, amount)
  // When called from BudgetSheet (which only knows label + amount),
  // we pass label as both category and parentCategory fallback.
  const handleSave = async (label: string, amount: number) => {
    await upsertBudget(label, label, amount)
    setSheetOpen(false)
  }

  const loading = txLoading || budgetLoading

  const pct = totalPlanned > 0 ? Math.min(100, (totalSpent / totalPlanned) * 100) : 0
  const isOver = totalSpent > totalPlanned && totalPlanned > 0

  // suppress unused warning — totalLeft used in render below
  void totalLeft
  // suppress unused warning — spentByParent used in render below
  void spentByParent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '20px 20px 0',
        background: 'linear-gradient(to bottom, #000 80%, transparent)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>

        {/* Month nav + Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: 16,
            background: 'linear-gradient(160deg,#0a0800 0%,#040607 58%,#060806 100%)',
            border: '1px solid rgba(251,191,36,0.22)',
            boxShadow: '0 0 0 1px rgba(251,191,36,0.04), 0 8px 40px rgba(0,0,0,0.7)',
            minHeight: 120,
          }}
        >
          <WaveCanvas />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(251,191,36,0.5),transparent)' }} />

          <div style={{ position: 'relative', zIndex: 2, padding: '16px 18px 18px' }}>

            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }}
                style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </motion.button>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.01em' }}>{MONTH_NAMES[month]}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{year}</p>
              </div>
              <motion.button whileTap={{ scale: 0.88 }}
                onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}
                style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </motion.button>
            </div>

            {/* Totals row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.6)', marginBottom: 4 }}>Spent</p>
                <p style={{ fontSize: 26, fontWeight: 900, color: isOver ? '#F87171' : '#FBBF24', fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: isOver ? '0 0 18px rgba(248,113,113,0.4)' : '0 0 18px rgba(251,191,36,0.4)' }}>
                  {formatINR(totalSpent)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Budget</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                  {totalPlanned > 0 ? formatINR(totalPlanned) : '—'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {totalPlanned > 0 && (
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 10 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', borderRadius: 99, background: isOver ? '#F87171' : 'linear-gradient(90deg, #FBBF24, #F59E0B)' }}
                />
              </div>
            )}

            {/* Insight row */}
            {(mostOverspent || mostAvailable) && (
              <div style={{ display: 'flex', gap: 8 }}>
                {mostOverspent && (
                  <div style={{ flex: 1, padding: '7px 10px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 2 }}>Most Over</p>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#F87171', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mostOverspent.name}</p>
                    <p style={{ fontSize: 10, color: 'rgba(248,113,113,0.6)', fontVariantNumeric: 'tabular-nums' }}>+{formatINR(mostOverspent.amount)}</p>
                  </div>
                )}
                {mostAvailable && (
                  <div style={{ flex: 1, padding: '7px 10px', borderRadius: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.16)' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.65)', marginBottom: 2 }}>Most Available</p>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#34D399', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mostAvailable.name}</p>
                    <p style={{ fontSize: 10, color: 'rgba(52,211,153,0.55)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(mostAvailable.amount)} left</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 }}>
          <motion.button whileTap={{ scale: 0.94 }} onClick={openAdd}
            style={{
              height: 30, paddingInline: 14, borderRadius: 99, cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
              border: '1px solid rgba(251,191,36,0.3)',
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#FBBF24', fontSize: 12, fontWeight: 700,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Budget
          </motion.button>
        </div>
      </div>

      {/* ── Scrollable list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px calc(env(safe-area-inset-bottom) + 96px)' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 18, background: 'rgba(255,255,255,0.04)' }} />)}
          </div>
        )}

        {!loading && expenseCategories.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60, color: 'rgba(255,255,255,0.3)' }}>
            <p style={{ fontSize: 14 }}>No expense categories found.</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Add categories in Settings first.</p>
          </div>
        )}

        {!loading && expenseCategories.map((cat, ci) => {
          const subs = (subcategories[cat.id] ?? []) as Subcategory[]
          const parentPlanned = getParentTotal(cat.label)
          const parentSpent   = spentByParent[cat.label] ?? 0
          const ACCENT = '#FBBF24'
          const ACCENT_DIM = 'rgba(251,191,36,0.5)'

          return (
            <motion.div key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.04, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: 14, borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
            >
              {/* Parent header */}
              <div style={{ padding: '12px 16px 10px', borderBottom: subs.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#f5f7ff' }}>{cat.label}</p>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(parentSpent)}
                      {parentPlanned > 0 && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}> / {formatINR(parentPlanned)}</span>}
                    </p>
                  </div>
                </div>
                {parentPlanned > 0 && <BudgetBar spent={parentSpent} planned={parentPlanned} accent={ACCENT} />}
              </div>

              {/* Subcategory rows */}
              {subs.map(sub => {
                const subBudget = getBudget(sub.label)
                const subSpent  = spentBySub[sub.label.toLowerCase()] ?? 0
                const subOver   = subBudget > 0 && subSpent > subBudget
                return (
                  <motion.div key={sub.id} whileTap={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    onClick={() => openEdit(sub.label, subBudget)}
                    style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.label}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {subBudget > 0 && (
                            <p style={{ fontSize: 11, fontWeight: 700, color: subOver ? '#F87171' : ACCENT_DIM, fontVariantNumeric: 'tabular-nums' }}>
                              {formatINR(subSpent)} / {formatINR(subBudget)}
                            </p>
                          )}
                          {subBudget === 0 && subSpent > 0 && (
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(subSpent)}</p>
                          )}
                          {subBudget === 0 && (
                            <span style={{ fontSize: 10, color: 'rgba(251,191,36,0.45)', fontWeight: 600 }}>Set</span>
                          )}
                        </div>
                      </div>
                      {subBudget > 0 && <BudgetBar spent={subSpent} planned={subBudget} accent={ACCENT} />}
                    </div>
                  </motion.div>
                )
              })}

              {subs.length === 0 && (
                <div style={{ padding: '10px 16px' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No subcategories yet.</p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* ── Budget Sheet ── */}
      <BudgetSheet
        open={sheetOpen}
        mode={sheetMode}
        initialLabel={sheetLabel}
        initialBudget={sheetBudget}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
