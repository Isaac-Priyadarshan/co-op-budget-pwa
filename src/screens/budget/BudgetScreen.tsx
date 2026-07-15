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

// ─── Animated Wave Canvas ─────────────────────────────────────────────────────
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

// ─── Thin Progress Bar ────────────────────────────────────────────────────────
function BudgetBar({ spent, planned, accent }: { spent: number; planned: number; accent: string }) {
  const pct      = planned > 0 ? Math.min(100, (spent / planned) * 100) : 0
  const barColor = planned > 0 && spent > planned ? '#F87171' : accent
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.18)', overflow: 'hidden', marginTop: 5 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', borderRadius: 99, background: barColor }}
      />
    </div>
  )
}

// ─── Unbudgeted Spent Bar ─────────────────────────────────────────────────────
function UnbudgetedBar({ accent }: { accent: string }) {
  return (
    <div style={{ height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.18)', overflow: 'hidden', marginTop: 5 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '60%' }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{
          height: '100%',
          borderRadius: 99,
          background: `${accent}55`,
          backgroundImage: `repeating-linear-gradient(90deg, ${accent}66 0px, ${accent}33 6px, ${accent}66 12px)`,
        }}
      />
    </div>
  )
}

// ─── Edit Budget Sheet ────────────────────────────────────────────────────────
function BudgetSheet({
  open, initialLabel, initialBudget, accent, onClose, onSave,
}: {
  open: boolean
  initialLabel?: string
  initialBudget?: number
  accent?: string
  onClose: () => void
  onSave: (amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState(initialBudget ? String(initialBudget) : '')
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')
  const col = accent ?? '#FBBF24'

  useEffect(() => {
    if (open) {
      setAmount(initialBudget ? String(initialBudget) : '')
      setErr('')
    }
  }, [open, initialBudget])

  const handleSave = async () => {
    if (!initialLabel?.trim())        { setErr('No category selected');   return }
    if (!amount || Number(amount) < 0){ setErr('Enter a valid amount');   return }
    setSaving(true); setErr('')
    try   { await onSave(Number(amount)) }
    catch { setErr('Failed to save. Try again.') }
    finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none', WebkitAppearance: 'none',
  }

  const readOnlyStyle: React.CSSProperties = {
    ...inputStyle,
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${col}28`,
    color: 'rgba(255,255,255,0.45)',
    cursor: 'default',
    userSelect: 'none',
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
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 24 }}>Edit Budget</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>
                  Subcategory
                </label>
                <div style={readOnlyStyle}>
                  {initialLabel ?? '—'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>Budget Amount (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${col}dd, ${col}99)`, color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1 }}
              >{saving ? 'Saving…' : 'Save Changes'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Pastel Category Card ─────────────────────────────────────────────────────
function CategoryCard({
  cat, subs, parentBudget, parentSpent, spentBySub, getBudget,
  delay, onEditSub,
}: {
  cat: { id: string; label: string; icon: string; accent: string; bg: string; glow: string }
  subs: Subcategory[]
  parentBudget: number
  parentSpent: number
  spentBySub: Record<string, number>
  getBudget: (label: string) => number
  delay: number
  // Now receives subcategoryId and parentLabel in addition to label, budget, accent
  onEditSub: (subId: string, label: string, parentLabel: string, budget: number, accent: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const accent = cat.accent ?? '#FBBF24'

  const pastelBg   = cat.bg   ?? `${accent}18`
  const pastelGlow = cat.glow ?? `${accent}22`
  const isOver     = parentBudget > 0 && parentSpent > parentBudget
  const pct        = parentBudget > 0 ? Math.min(100, (parentSpent / parentBudget) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      style={{ borderRadius: 20, overflow: 'hidden' }}
    >
      {/* ── Pastel card header ── */}
      <motion.div
        whileTap={{ scale: 0.985 }}
        onClick={() => setExpanded(e => !e)}
        style={{
          background: pastelBg,
          border: `1.5px solid ${accent}33`,
          boxShadow: expanded ? `0 0 0 1.5px ${accent}28, 0 8px 32px ${pastelGlow}` : `0 2px 12px ${pastelGlow}`,
          borderRadius: expanded ? '20px 20px 0 0' : 20,
          padding: '14px 16px',
          cursor: 'pointer',
          transition: 'border-radius 0.28s ease, box-shadow 0.28s ease',
        }}
      >
        {/* Top row: icon + label + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: parentBudget > 0 ? 8 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Icon pill */}
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: `${accent}22`,
              border: `1px solid ${accent}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              {cat.icon}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#f5f7ff', lineHeight: 1.2 }}>{cat.label}</p>
              {subs.length > 0 && (
                <p style={{ fontSize: 11, color: `${accent}99`, marginTop: 1, fontWeight: 600 }}>
                  {subs.length} subcategor{subs.length === 1 ? 'y' : 'ies'}
                </p>
              )}
            </div>
          </div>

          {/* Right: spent / totalBudget + chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              {parentBudget > 0 ? (
                <p style={{
                  fontSize: 14, fontWeight: 900,
                  color: isOver ? '#F87171' : accent,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}>
                  {formatINR(parentSpent)}
                  <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                    {' / '}{formatINR(parentBudget)}
                  </span>
                </p>
              ) : (
                <p style={{
                  fontSize: 14, fontWeight: 900,
                  color: accent,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.2,
                }}>
                  {formatINR(parentSpent)}
                </p>
              )}
            </div>
            {/* Chevron */}
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 8, background: `${accent}18`, flexShrink: 0 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Progress bar */}
        {parentBudget > 0 && (
          <div style={{ height: 5, borderRadius: 99, background: `${accent}18`, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', borderRadius: 99, background: isOver ? '#F87171' : accent }}
            />
          </div>
        )}
      </motion.div>

      {/* ── Accordion subcategory list ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="subs"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: `${accent}0d`,
              border: `1.5px solid ${accent}22`,
              borderTop: 'none',
              borderRadius: '0 0 20px 20px',
              overflow: 'hidden',
            }}>
              {subs.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No subcategories yet</p>
                </div>
              ) : (
                subs.map((sub, si) => {
                  const subBudget   = getBudget(sub.label) ?? 0
                  const subSpent    = spentBySub[sub.label.toLowerCase()] ?? 0
                  const hasSpend    = subSpent > 0
                  const hasBudget   = subBudget > 0
                  const subOver     = hasBudget && subSpent > subBudget
                  const leftover    = hasBudget ? subBudget - subSpent : 0
                  const dotOpacity  = hasSpend || hasBudget ? 1 : 0.25
                  const dotColor    = subOver ? '#F87171' : (hasSpend || hasBudget ? accent : `${accent}44`)

                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: si * 0.04, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      // Pass subcategory UUID and parent category label to onEditSub
                      onClick={() => onEditSub(sub.id, sub.label, cat.label, subBudget, accent)}
                      whileTap={{ scale: 0.98, backgroundColor: `${accent}18` }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: si < subs.length - 1 ? `1px solid ${accent}18` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {/* Sub row top */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: dotColor,
                            opacity: dotOpacity,
                            flexShrink: 0,
                          }} />
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{sub.label}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ textAlign: 'right' }}>
                            {(hasSpend || hasBudget) && (
                              <p style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: subOver ? '#F87171' : hasSpend ? '#f5f7ff' : 'rgba(255,255,255,0.3)',
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                {formatINR(subSpent)}
                                {hasBudget && (
                                  <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>
                                    {' / '}{formatINR(subBudget)}
                                  </span>
                                )}
                              </p>
                            )}
                            {hasBudget ? (
                              <p style={{
                                fontSize: 10,
                                color: subOver ? 'rgba(248,113,113,0.7)' : `${accent}99`,
                                fontVariantNumeric: 'tabular-nums',
                                textAlign: 'right',
                              }}>
                                {subOver
                                  ? `+${formatINR(Math.abs(leftover))} over`
                                  : leftover > 0
                                    ? `${formatINR(leftover)} left`
                                    : 'Fully used'}
                              </p>
                            ) : hasSpend ? (
                              <p style={{
                                fontSize: 10,
                                color: `${accent}66`,
                                textAlign: 'right',
                              }}>
                                No budget set
                              </p>
                            ) : null}
                          </div>
                          <div style={{ width: 26, height: 26, borderRadius: 8, background: `${accent}18`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      {hasBudget ? (
                        <BudgetBar spent={subSpent} planned={subBudget} accent={accent} />
                      ) : hasSpend ? (
                        <UnbudgetedBar accent={accent} />
                      ) : null}
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main BudgetScreen ────────────────────────────────────────────────────────
export default function BudgetScreen() {
  const now  = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year,  setYear]  = useState(now.getFullYear())

  const mKey   = monthKey(year, month)
  const mStart = monthStart(year, month)
  const mEnd   = monthEnd(year, month)

  const { transactions, loading: txLoading }              = useTransactions()
  const { expenseCategories, subcategories }              = useCategories()
  const { totalPlanned, getBudget, upsertBudget, loading: budgetLoading } = useBudgets(mKey)

  // ── Month-scoped expense transactions ────────────────────────────────────────
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

  // ── Spent per parent category ─────────────────────────────────────────────
  const spentByParent = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of monthTxs) {
      const cat = (tx.category ?? '').toLowerCase()
      const parent = expenseCategories.find(c =>
        c.label.toLowerCase() === cat ||
        (subcategories[c.id] ?? []).some((s: Subcategory) => s.label.toLowerCase() === cat)
      )
      if (parent) map[parent.label] = (map[parent.label] ?? 0) + tx.amount
    }
    return map
  }, [monthTxs, expenseCategories, subcategories])

  // ── Spent per subcategory ──────────────────────────────────────────────────
  const spentBySub = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of monthTxs) {
      const key = (tx.category ?? '').toLowerCase()
      map[key] = (map[key] ?? 0) + tx.amount
    }
    return map
  }, [monthTxs])

  // ── Most overspent & most available ───────────────────────────────────────
  const { mostOverspent, mostAvailable } = useMemo(() => {
    let topOver:  { name: string; amount: number } | null = null
    let topAvail: { name: string; amount: number } | null = null
    for (const cat of expenseCategories) {
      const subs = (subcategories[cat.id] ?? []) as Subcategory[]
      for (const sub of subs) {
        const budget = getBudget(sub.label)
        if (budget == null || budget <= 0) continue
        const spent = spentBySub[sub.label.toLowerCase()] ?? 0
        const over  = spent - budget
        const avail = budget - spent
        if (over  > 0 && (!topOver  || over  > topOver.amount))  topOver  = { name: sub.label, amount: over  }
        if (avail > 0 && (!topAvail || avail > topAvail.amount)) topAvail = { name: sub.label, amount: avail }
      }
    }
    return { mostOverspent: topOver, mostAvailable: topAvail }
  }, [expenseCategories, subcategories, getBudget, spentBySub])

  // ── Edit sheet state ───────────────────────────────────────────────────────
  const [sheetOpen,        setSheetOpen]        = useState(false)
  const [sheetSubId,       setSheetSubId]        = useState('')
  const [sheetLabel,       setSheetLabel]        = useState('')
  const [sheetParentLabel, setSheetParentLabel]  = useState('')
  const [sheetBudget,      setSheetBudget]       = useState<number | undefined>()
  const [sheetAccent,      setSheetAccent]       = useState('#FBBF24')

  // Receives subcategory UUID + both labels so upsertBudget gets everything it needs
  const openEditSub = (
    subId: string,
    label: string,
    parentLabel: string,
    budget: number,
    accent: string
  ) => {
    setSheetSubId(subId)
    setSheetLabel(label)
    setSheetParentLabel(parentLabel)
    setSheetBudget(budget)
    setSheetAccent(accent)
    setSheetOpen(true)
  }

  // onSave now only receives amount — all other data is already in state
  const handleSave = async (amount: number) => {
    await upsertBudget(sheetSubId, sheetLabel, sheetParentLabel, amount)
    setSheetOpen(false)
  }

  const loading = txLoading || budgetLoading
  const pct     = totalPlanned > 0 ? Math.min(100, (totalSpent / totalPlanned) * 100) : 0
  const isOver  = totalSpent > totalPlanned && totalPlanned > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Sticky header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '20px 20px 0',
        background: 'linear-gradient(to bottom, #000 80%, transparent)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
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

            {/* Totals */}
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

            {/* Global progress */}
            {totalPlanned > 0 && (
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 10 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', borderRadius: 99, background: isOver ? '#F87171' : 'linear-gradient(90deg,#FBBF24,#F59E0B)' }}
                />
              </div>
            )}

            {/* Insight chips */}
            {(mostOverspent || mostAvailable) && (
              <div style={{ display: 'flex', gap: 8 }}>
                {mostOverspent && (
                  <div style={{ flex: 1, background: 'rgba(248,113,113,0.08)', borderRadius: 10, padding: '6px 10px', border: '1px solid rgba(248,113,113,0.15)' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 2 }}>Most Over</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#F87171' }}>{mostOverspent.name}</p>
                    <p style={{ fontSize: 10, color: 'rgba(248,113,113,0.6)' }}>+{formatINR(mostOverspent.amount)}</p>
                  </div>
                )}
                {mostAvailable && (
                  <div style={{ flex: 1, background: 'rgba(52,211,153,0.08)', borderRadius: 10, padding: '6px 10px', border: '1px solid rgba(52,211,153,0.15)' }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 2 }}>Most Left</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#34D399' }}>{mostAvailable.name}</p>
                    <p style={{ fontSize: 10, color: 'rgba(52,211,153,0.6)' }}>{formatINR(mostAvailable.amount)} left</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(env(safe-area-inset-bottom) + 100px)' }}>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.08)', borderTopColor: '#FBBF24' }}
            />
          </div>
        ) : expenseCategories.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📂</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>No expense categories found</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>Add categories in Settings first</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {expenseCategories.map((cat, ci) => {
              const subs        = (subcategories[cat.id] ?? []) as Subcategory[]
              const parentSpent = spentByParent[cat.label] ?? 0
              const parentBudget = subs.reduce((sum, sub) => sum + (getBudget(sub.label) ?? 0), 0)

              return (
                <CategoryCard
                  key={cat.id}
                  cat={{
                    id:     cat.id,
                    label:  cat.label,
                    icon:   cat.icon   ?? '💰',
                    accent: cat.accent ?? '#FBBF24',
                    bg:     cat.bg     ?? 'rgba(251,191,36,0.12)',
                    glow:   cat.glow   ?? 'rgba(251,191,36,0.22)',
                  }}
                  subs={subs}
                  parentBudget={parentBudget}
                  parentSpent={parentSpent}
                  spentBySub={spentBySub}
                  getBudget={getBudget}
                  delay={ci * 0.05}
                  onEditSub={openEditSub}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ── Edit Budget Sheet ── */}
      <BudgetSheet
        open={sheetOpen}
        initialLabel={sheetLabel}
        initialBudget={sheetBudget}
        accent={sheetAccent}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
