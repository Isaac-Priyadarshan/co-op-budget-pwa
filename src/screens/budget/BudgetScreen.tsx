import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
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

// ─── Inline numpad for budget entry ──────────────────────────────────────────
interface NumpadProps {
  initial: number
  accent: string
  label: string
  onConfirm: (val: number) => void
  onCancel: () => void
}
function BudgetNumpad({ initial, accent, label, onConfirm, onCancel }: NumpadProps) {
  const [val, setVal] = useState(initial > 0 ? String(initial) : '')

  const tap = (k: string) => {
    if (k === 'DEL') { setVal(p => p.slice(0, -1)); return }
    if (k === '.' && val.includes('.')) return
    if (val === '0' && k !== '.') { setVal(k); return }
    if (val.length >= 9) return
    setVal(p => p + k)
  }

  const keys = ['7','8','9','4','5','6','1','2','3','.','0','DEL']

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'rgba(10,8,0,0.97)',
        border: `1px solid ${accent}40`,
        borderRadius: 20,
        padding: '14px 14px 10px',
        marginTop: 8,
        boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${accent}18`,
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `${accent}99`, marginBottom: 8, textAlign: 'center' }}>
        Set budget for {label}
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px',
        marginBottom: 10, textAlign: 'right',
        border: `1px solid ${accent}28`,
      }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: val ? accent : 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>
          {val ? `₹${Number(val).toLocaleString('en-IN')}` : '₹0'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {keys.map(k => (
          <motion.button key={k} whileTap={{ scale: 0.88 }} onClick={() => tap(k)}
            style={{
              height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: k === 'DEL' ? 16 : 17, fontWeight: 600,
              background: k === 'DEL' ? 'rgba(248,113,113,0.14)' : 'rgba(255,255,255,0.06)',
              color: k === 'DEL' ? '#F87171' : '#F5F5F5',
            }}
          >{k === 'DEL' ? '⌫' : k}</motion.button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onCancel}
          style={{ flex: 1, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >Cancel</motion.button>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => onConfirm(parseFloat(val) || 0)}
          style={{ flex: 2, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${accent}CC, ${accent}99)`, border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
        >Set Budget</motion.button>
      </div>
    </motion.div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function BudgetBar({ spent, planned, accent }: { spent: number; planned: number; accent: string }) {
  const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0
  const over = planned > 0 && spent > planned
  const barColor = over ? '#F87171' : pct > 75 ? '#FBBF24' : accent
  return (
    <div style={{ height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 6 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', borderRadius: 100, background: barColor }}
      />
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function BudgetScreen() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [editingKey,  setEditingKey]  = useState<string | null>(null)

  const mKey   = monthKey(year, month)
  const mStart = monthStart(year, month)
  const mEnd   = monthEnd(year, month)

  const { transactions, loading: txLoading } = useTransactions()
  const { expenseCategories, subcategories }  = useCategories()
  const { totalPlanned, getBudget, getParentTotal, upsertBudget, loading: budgetLoading } = useBudgets(mKey)

  // ── Month-scoped expense transactions ───────────────────────────────────────
  const monthTxs = useMemo(() => {
    const start = new Date(mStart + 'T00:00:00')
    const end   = new Date(mEnd   + 'T23:59:59')
    return transactions.filter(tx => {
      const d = new Date(tx.created_at)
      return tx.type === 'expense' && d >= start && d <= end
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

  // ── Month nav ────────────────────────────────────────────────────────────────
  const handlePrev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setEditingKey(null)
  }
  const handleNext = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setEditingKey(null)
  }

  const handleConfirm = async (subLabel: string, parentLabel: string, amount: number) => {
    await upsertBudget(subLabel, parentLabel, amount)
    setEditingKey(null)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 20px 32px' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >

        {/* ── MONTH NAVIGATOR ─────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <motion.button whileTap={{ scale: 0.85 }} onClick={handlePrev}
            style={{
              width: 40, height: 40, borderRadius: 14,
              background: 'linear-gradient(135deg,rgba(251,191,36,0.14),rgba(217,119,6,0.10))',
              border: '1px solid rgba(251,191,36,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </motion.button>

          <p style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.01em' }}>
            {MONTH_NAMES[month]} {year}
          </p>

          <motion.button whileTap={{ scale: 0.85 }} onClick={handleNext}
            style={{
              width: 40, height: 40, borderRadius: 14,
              background: 'linear-gradient(135deg,rgba(251,191,36,0.14),rgba(217,119,6,0.10))',
              border: '1px solid rgba(251,191,36,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </motion.button>
        </div>

        {/* ── SUMMARY CARD ─────────────────────────────────────────── */}
        <div style={{
          position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: 20,
          background: 'linear-gradient(160deg,#0d0b06 0%,#0a0800 60%,#0e0c02 100%)',
          border: '1px solid rgba(251,191,36,0.28)',
          boxShadow: '0 0 0 1px rgba(251,191,36,0.06), 0 8px 40px rgba(0,0,0,0.7), 0 2px 0 rgba(251,191,36,0.12) inset',
          minHeight: 100,
        }}>
          <WaveCanvas />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(251,191,36,0.55),transparent)',
          }} />
          <div style={{
            position: 'relative', zIndex: 2,
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '20px 20px 22px',
          }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.60)', marginBottom: 6 }}>Planned</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#FBBF24', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {(txLoading || budgetLoading) ? '—' : formatINR(totalPlanned)}
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '0 18px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.55)', marginBottom: 6 }}>Left</p>
              <p style={{
                fontSize: 22, fontWeight: 900,
                color: totalLeft >= 0 ? '#34D399' : '#F87171',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                textShadow: totalLeft >= 0 ? '0 0 18px rgba(52,211,153,0.45)' : '0 0 18px rgba(248,113,113,0.45)',
              }}>
                {(txLoading || budgetLoading) ? '—' : `${totalLeft < 0 ? '-' : ''}${formatINR(Math.abs(totalLeft))}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.60)', marginBottom: 6 }}>Spent</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#F87171', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {txLoading ? '—' : formatINR(totalSpent)}
              </p>
            </div>
          </div>
        </div>

        {/* ── CATEGORY LIST ────────────────────────────────────────── */}
        {expenseCategories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '52px 24px', borderRadius: 24, background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.10)' }}>
            <p style={{ fontSize: 40, marginBottom: 14 }}>🗂️</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(245,245,245,0.55)', marginBottom: 6 }}>No categories yet</p>
            <p style={{ fontSize: 12, color: 'rgba(245,245,245,0.28)' }}>Add expense categories on the Home screen first</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {expenseCategories.map(cat => {
            const subs          = subcategories[cat.id] ?? []
            const isExpanded    = expandedCat === cat.label
            const parentPlanned = getParentTotal(cat.label)
            const parentSpent   = spentByParent[cat.label] ?? 0
            const parentPct     = parentPlanned > 0 ? Math.min((parentSpent / parentPlanned) * 100, 100) : 0
            const parentOver    = parentPlanned > 0 && parentSpent > parentPlanned
            const barColor      = parentOver ? '#F87171' : parentPct > 75 ? '#FBBF24' : cat.accent

            return (
              <motion.div key={cat.label} layout transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  borderRadius: 20,
                  background: isExpanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isExpanded ? cat.accent + '30' : 'rgba(255,255,255,0.07)'}`,
                  overflow: 'hidden',
                  transition: 'background 0.2s, border 0.2s',
                }}
              >
                {/* ── Parent category row — expand/collapse only, no budget edit ── */}
                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setExpandedCat(prev => prev === cat.label ? null : cat.label)
                    setEditingKey(null)
                  }}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: cat.bg, border: `1px solid ${cat.accent}30`,
                    boxShadow: `0 2px 8px ${cat.glow}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>{cat.icon}</div>

                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: cat.accent, marginBottom: 4 }}>{cat.label}</p>
                    {/* Progress bar always shown — empty when parentPlanned = 0 */}
                    <div style={{ height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${parentPct}%` }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: '100%', borderRadius: 100, background: barColor }}
                      />
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                      {parentPlanned > 0
                        ? `${formatINR(parentSpent)} / ${formatINR(parentPlanned)}`
                        : 'Sum of subcategory budgets'
                      }
                    </p>
                  </div>

                  {/* Right side: accumulated total (read-only) + chevron */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 800,
                      color: parentPlanned > 0 ? cat.accent : 'rgba(255,255,255,0.22)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {parentPlanned > 0 ? formatINR(parentPlanned) : formatINR(0)}
                    </p>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </motion.button>

                {/* ── Subcategory list ── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>

                        {subs.length === 0 && (
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '8px 4px' }}>
                            No subcategories. Add them on the Home screen.
                          </p>
                        )}

                        {(subs as Subcategory[]).map((sub) => {
                          const subBudget = getBudget(sub.label)
                          const subSpent  = spentBySub[sub.label.toLowerCase()] ?? 0
                          const isEditing = editingKey === `${sub.label}|${cat.label}`

                          return (
                            <motion.div key={sub.label} layout
                              style={{
                                borderRadius: 14,
                                background: isEditing ? `${cat.accent}0A` : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isEditing ? cat.accent + '30' : 'rgba(255,255,255,0.06)'}`,
                                overflow: 'hidden',
                              }}
                            >
                              <motion.button whileTap={{ scale: 0.97 }}
                                onClick={() => setEditingKey(prev =>
                                  prev === `${sub.label}|${cat.label}` ? null : `${sub.label}|${cat.label}`
                                )}
                                style={{
                                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                                  padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                                }}
                              >
                                <div style={{
                                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                  background: cat.bg, border: `1px solid ${cat.accent}28`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                                  color: cat.accent, fontWeight: 700,
                                }}>
                                  {sub.label.charAt(0).toUpperCase()}
                                </div>

                                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: cat.accent, marginBottom: 3 }}>{sub.label}</p>
                                  {/* Always show bar and amount — ₹0/₹0 when unset */}
                                  <BudgetBar spent={subSpent} planned={subBudget} accent={cat.accent} />
                                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                                    {formatINR(subSpent)} / {formatINR(subBudget)}
                                  </p>
                                  {subBudget === 0 && (
                                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.20)', marginTop: 1, letterSpacing: '0.04em' }}>
                                      Tap to set budget
                                    </p>
                                  )}
                                </div>

                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <p style={{ fontSize: 12, fontWeight: 800, color: subBudget > 0 ? cat.accent : 'rgba(255,255,255,0.20)', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatINR(subBudget)}
                                  </p>
                                  <div style={{
                                    width: 22, height: 22, borderRadius: 8,
                                    background: isEditing ? `${cat.accent}25` : 'rgba(255,255,255,0.06)',
                                    border: `1px solid ${isEditing ? cat.accent + '45' : 'rgba(255,255,255,0.10)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                                      stroke={isEditing ? cat.accent : 'rgba(255,255,255,0.40)'}
                                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    >
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </div>
                                </div>
                              </motion.button>

                              <AnimatePresence initial={false}>
                                {isEditing && (
                                  <div style={{ padding: '0 12px 12px' }}>
                                    <BudgetNumpad
                                      initial={subBudget}
                                      accent={cat.accent}
                                      label={sub.label}
                                      onConfirm={(val) => void handleConfirm(sub.label, cat.label, val)}
                                      onCancel={() => setEditingKey(null)}
                                    />
                                  </div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

      </motion.div>
    </div>
  )
}
