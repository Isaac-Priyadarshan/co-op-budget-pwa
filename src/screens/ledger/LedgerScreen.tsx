import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useWallets } from '../../hooks/useWallets'
import { formatINR } from '../../utils/format'

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

function toDateStr(d: Date): string { return d.toISOString().slice(0, 10) }
function monthStart(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-01`
}
function monthEnd(y: number, m: number): string {
  return toDateStr(new Date(y, m + 1, 0))
}
function formatTxDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

type TxList = ReturnType<typeof useTransactions>['transactions']

// ── dedupeTransfers ──────────────────────────────────────────────────────────
// For each transfer pair, keep only the OUT leg (description contains '→').
// If for some reason neither leg has '→', keep the first one encountered.
// Non-transfer rows pass through unchanged.
function dedupeTransfers(txs: TxList): TxList {
  const seen = new Set<string>()
  const out: TxList = []

  for (const tx of txs) {
    if (tx.type !== 'transfer') {
      out.push(tx)
      continue
    }
    const pairId = tx.transfer_pair_id
    if (!pairId) {
      // Legacy transfer row with no pair_id — show as-is
      out.push(tx)
      continue
    }
    if (seen.has(pairId)) continue          // paired leg already added
    // Only emit the OUT leg (→); skip the IN leg (←)
    if (tx.description?.includes('→') || !out.find(r => r.transfer_pair_id === pairId)) {
      seen.add(pairId)
      out.push(tx)
    }
  }
  return out
}

function groupByDate(txs: TxList) {
  const groups: Record<string, TxList> = {}
  for (const tx of txs) {
    const source = tx.transaction_date ?? tx.created_at
    const key = new Date(source).toDateString()
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
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
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.52
          + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
          + Math.sin((x / W) * Math.PI * 1.1 + t * 0.35) * H * 0.07
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      const g1 = ctx.createLinearGradient(0, 0, 0, H)
      g1.addColorStop(0, 'rgba(251,191,36,0.18)')
      g1.addColorStop(1, 'rgba(251,191,36,0.04)')
      ctx.fillStyle = g1
      ctx.fill()

      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.64
          + Math.sin((x / W) * Math.PI * 3.2 + t * 0.9 + 1.2) * H * 0.09
          + Math.sin((x / W) * Math.PI * 1.8 + t * 0.5 + 0.6) * H * 0.05
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      const g2 = ctx.createLinearGradient(0, 0, 0, H)
      g2.addColorStop(0, 'rgba(217,119,6,0.14)')
      g2.addColorStop(1, 'rgba(217,119,6,0.03)')
      ctx.fillStyle = g2
      ctx.fill()

      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.52
          + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
          + Math.sin((x / W) * Math.PI * 1.1 + t * 0.35) * H * 0.07
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(251,191,36,0.28)'
      ctx.lineWidth = 1.2
      ctx.stroke()

      t += 0.012
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={100}
      style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        width: '100%', height: '100%',
        borderRadius: 22,
        pointerEvents: 'none',
      }}
    />
  )
}

// ─── Wallet Pill ──────────────────────────────────────────────────────────────
function WalletPill({ label, type }: { label: string; type: string }) {
  const isCash = type === 'cash'
  const icon   = isCash ? '💵' : '💳'
  const color  = isCash ? '#34D399' : '#C084FC'
  const bg     = isCash ? 'rgba(52,211,153,0.10)' : 'rgba(192,132,252,0.10)'
  const border = isCash ? 'rgba(52,211,153,0.22)' : 'rgba(192,132,252,0.22)'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 18, padding: '0 7px', borderRadius: 100,
      background: bg, border: `1px solid ${border}`,
      fontSize: 10, fontWeight: 600, color,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ fontSize: 9 }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

// ─── Delete Error Toast ───────────────────────────────────────────────────────
function DeleteErrorToast({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      onClick={onDismiss}
      style={{
        position: 'fixed', bottom: 90, left: 20, right: 20, zIndex: 999,
        background: 'rgba(239,68,68,0.18)',
        border: '1px solid rgba(239,68,68,0.45)',
        borderRadius: 16, padding: '12px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#FCA5A5', lineHeight: 1.3, marginBottom: 2 }}>
          Delete failed
        </p>
        <p style={{ fontSize: 11, color: 'rgba(252,165,165,0.75)', lineHeight: 1.4 }}>
          {message || 'Transaction could not be removed. Please try again.'}
        </p>
      </div>
    </motion.div>
  )
}

// ─── Compact filter pill ──────────────────────────────────────────────────────
function FilterPill({
  label,
  active,
  activeColor,
  activeBorder,
  activeBg,
  onClick,
}: {
  label: string
  active: boolean
  activeColor: string
  activeBorder: string
  activeBg: string
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      style={{
        height: 28, padding: '0 10px', borderRadius: 100, flexShrink: 0,
        border: active ? `1px solid ${activeBorder}` : '1px solid rgba(255,255,255,0.09)',
        background: active ? activeBg : 'rgba(255,255,255,0.04)',
        color: active ? activeColor : 'rgba(255,255,255,0.38)',
        fontSize: 11, fontWeight: active ? 700 : 400,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </motion.button>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function LedgerScreen() {
  const today   = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [startDate, setStartDate] = useState(monthStart(today.getFullYear(), today.getMonth()))
  const [endDate,   setEndDate]   = useState(toDateStr(today))

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [userFilter, setUserFilter] = useState<'all' | 'Isaac' | 'Jenifa'>('all')
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { transactions, loading, error, removeTransaction } = useTransactions()
  const { expenseCategories, incomeCategories } = useCategories()
  const { wallets } = useWallets()

  const walletLookup = useMemo(() => {
    const map: Record<string, { label: string; type: string }> = {}
    for (const w of wallets) map[w.id] = { label: w.label, type: w.type }
    return map
  }, [wallets])

  const handlePrev = () => {
    const [ny, nm] = month === 0 ? [year - 1, 11] : [year, month - 1]
    setYear(ny); setMonth(nm)
    setStartDate(monthStart(ny, nm))
    setEndDate(monthEnd(ny, nm))
  }
  const handleNext = () => {
    const [ny, nm] = month === 11 ? [year + 1, 0] : [year, month + 1]
    setYear(ny); setMonth(nm)
    setStartDate(monthStart(ny, nm))
    setEndDate(monthEnd(ny, nm))
  }

  const catLookup = useMemo(() => {
    const map: Record<string, { icon: string; accent: string; bg: string; glow: string }> = {}
    for (const c of [...expenseCategories, ...incomeCategories]) {
      map[c.label.toLowerCase()] = { icon: c.icon, accent: c.accent, bg: c.bg, glow: c.glow }
    }
    return map
  }, [expenseCategories, incomeCategories])

  const getCatMeta = (category: string) => {
    const key = (category ?? '').toLowerCase()
    if (catLookup[key]) return catLookup[key]
    const partial = Object.keys(catLookup).find(k => key.includes(k) || k.includes(key))
    if (partial) return catLookup[partial]
    // Transfer rows get a distinct amber icon style
    return { icon: '🔁', accent: '#FBBF24', bg: 'rgba(251,191,36,0.10)', glow: 'rgba(251,191,36,0.18)' }
  }

  const rangeTxs = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00')
    const end   = new Date(endDate   + 'T23:59:59')
    return transactions.filter(tx => {
      const source = tx.transaction_date ?? tx.created_at
      const d = new Date(source)
      return d >= start && d <= end
    })
  }, [transactions, startDate, endDate])

  // Apply type + user filters, then dedupe transfer pairs so only one row per
  // transfer shows in the ledger (the OUT leg: description contains '→').
  // When typeFilter === 'all', transfers are included. When typeFilter is
  // 'income' or 'expense', transfers are hidden (they are neither).
  const filtered = useMemo(() => {
    const byType = typeFilter === 'all'
      ? rangeTxs
      : rangeTxs.filter(tx => tx.type === typeFilter)
    const byUser = byType.filter(
      tx => userFilter === 'all' || (tx.created_by ?? '').toLowerCase() === userFilter.toLowerCase()
    )
    return dedupeTransfers(byUser)
  }, [rangeTxs, typeFilter, userFilter])

  const rangeIncome  = useMemo(() => rangeTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [rangeTxs])
  const rangeExpense = useMemo(() => rangeTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [rangeTxs])
  const rangeBalance = rangeIncome - rangeExpense

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
    try {
      await removeTransaction(id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction could not be removed. Please try again.'
      setDeleteError(msg)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  const dateInputStyle: React.CSSProperties = {
    width: 108, height: 28, borderRadius: 10, flexShrink: 0,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(251,191,36,0.22)',
    color: '#F5F5F5', fontSize: 11, fontWeight: 600,
    padding: '0 6px', cursor: 'pointer', outline: 'none',
    WebkitAppearance: 'none', colorScheme: 'dark',
  }

  return (
    <div style={{ padding: '20px 20px 32px' }}>
      <AnimatePresence>
        {deleteError && (
          <DeleteErrorToast
            message={deleteError}
            onDismiss={() => setDeleteError(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <motion.button whileTap={{ scale: 0.85 }} onClick={handlePrev}
            style={{
              width: 40, height: 40, borderRadius: 14,
              background: 'linear-gradient(135deg,rgba(251,191,36,0.14),rgba(217,119,6,0.10))',
              border: '1px solid rgba(251,191,36,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </motion.button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              {MONTH_NAMES[month]} {year}
            </p>
          </div>

          <motion.button whileTap={{ scale: 0.85 }} onClick={handleNext}
            style={{
              width: 40, height: 40, borderRadius: 14,
              background: 'linear-gradient(135deg,rgba(251,191,36,0.14),rgba(217,119,6,0.10))',
              border: '1px solid rgba(251,191,36,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.button>
        </div>

        {/* Summary card */}
        <div style={{
          position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: 18,
          background: 'linear-gradient(160deg,#0d0b06 0%,#0a0800 60%,#0e0c02 100%)',
          border: '1px solid rgba(251,191,36,0.28)',
          boxShadow: '0 0 0 1px rgba(251,191,36,0.06), 0 8px 40px rgba(0,0,0,0.7), 0 2px 0 rgba(251,191,36,0.12) inset',
          minHeight: 100,
        }}>
          <WaveCanvas />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(251,191,36,0.55),transparent)' }} />
          <div style={{
            position: 'relative', zIndex: 2,
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center', padding: '20px 20px 22px',
          }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.60)', marginBottom: 6 }}>Spent</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#F87171', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatINR(rangeExpense)}</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0 18px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.55)', marginBottom: 6 }}>Balance</p>
              <p style={{
                fontSize: 22, fontWeight: 900,
                color: rangeBalance >= 0 ? '#34D399' : '#F87171',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                textShadow: rangeBalance >= 0 ? '0 0 18px rgba(52,211,153,0.45)' : '0 0 18px rgba(248,113,113,0.45)',
              }}>
                {rangeBalance < 0 ? '-' : ''}{formatINR(Math.abs(rangeBalance))}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.60)', marginBottom: 6 }}>Income</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatINR(rangeIncome)}</p>
            </div>
          </div>
        </div>

        {/* Single-line filter bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          flexWrap: 'nowrap', overflowX: 'auto',
          marginBottom: 16,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}>
          {(['all', 'income', 'expense'] as const).map(f => (
            <FilterPill
              key={f}
              label={f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              active={typeFilter === f}
              activeColor="#FBBF24"
              activeBorder="rgba(251,191,36,0.55)"
              activeBg="rgba(251,191,36,0.15)"
              onClick={() => setTypeFilter(f)}
            />
          ))}
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />
          {(['all', 'Isaac', 'Jenifa'] as const).map(u => (
            <FilterPill
              key={u}
              label={u === 'all' ? 'Both' : u}
              active={userFilter === u}
              activeColor="#5EEAD4"
              activeBorder="rgba(94,234,212,0.50)"
              activeBg="rgba(94,234,212,0.12)"
              onClick={() => setUserFilter(u)}
            />
          ))}
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.13)', flexShrink: 0 }} />
          <input
            type="date" value={startDate} max={endDate}
            onChange={e => setStartDate(e.target.value)}
            style={dateInputStyle}
          />
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, flexShrink: 0 }}>→</span>
          <input
            type="date" value={endDate} min={startDate}
            onChange={e => setEndDate(e.target.value)}
            style={dateInputStyle}
          />
        </div>

        {/* Transaction list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.30)', fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#F87171', fontSize: 13 }}>{error}</div>
        ) : grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0 32px' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📊</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>No transactions</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.20)', marginTop: 4 }}>for this period</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {grouped.map(([dateStr, txs]) => (
              <div key={dateStr}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {formatTxDate(txs[0].transaction_date ?? txs[0].created_at)}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                    {txs.length} {txs.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {txs.map(tx => {
                      const isTransfer = tx.type === 'transfer'
                      const meta    = getCatMeta(tx.category)
                      // Transfers never show a wallet pill in the ledger
                      const wallet  = (!isTransfer && tx.wallet_id) ? walletLookup[tx.wallet_id] : null
                      const isConf  = confirmId  === tx.id
                      const isDel   = deletingId === tx.id

                      // Transfer amount shown in amber (neutral — neither income nor expense)
                      const amountColor = isTransfer ? '#FBBF24'
                        : tx.type === 'income' ? '#34D399' : '#F87171'
                      const amountPrefix = isTransfer ? '' : tx.type === 'income' ? '+' : '-'

                      // Confirm message varies for transfers
                      const confirmMsg = isTransfer
                        ? 'Delete both legs of this transfer?'
                        : 'Remove this transaction?'

                      return (
                        <motion.div
                          key={tx.id}
                          layout
                          initial={{ opacity: 0, y: 10, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -60, scale: 0.92 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            borderRadius: 16, overflow: 'hidden',
                            background: isConf
                              ? 'rgba(239,68,68,0.10)'
                              : isTransfer
                                ? 'rgba(251,191,36,0.04)'
                                : 'rgba(255,255,255,0.035)',
                            border: isConf
                              ? '1px solid rgba(239,68,68,0.35)'
                              : isTransfer
                                ? '1px solid rgba(251,191,36,0.14)'
                                : '1px solid rgba(255,255,255,0.07)',
                            transition: 'background 0.2s, border-color 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 12 }}>
                            {/* Icon */}
                            <div style={{
                              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                              background: meta.bg, border: `1px solid ${meta.glow}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 17, boxShadow: `0 0 12px ${meta.glow}`,
                            }}>
                              {isTransfer ? '🔁' : meta.icon}
                            </div>

                            {/* Details */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#F5F5F5', lineHeight: 1.2 }}>
                                  {tx.description || tx.category}
                                </span>
                                {wallet && <WalletPill label={wallet.label} type={wallet.type} />}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {!isTransfer && (
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                                    {tx.category}
                                  </span>
                                )}
                                <span style={{ fontSize: 10, color: tx.created_by === 'Isaac' ? 'rgba(96,165,250,0.70)' : 'rgba(232,121,249,0.70)' }}>
                                  {tx.created_by}
                                </span>
                              </div>
                            </div>

                            {/* Right column: amount + delete */}
                            <div style={{
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'flex-end', justifyContent: 'space-between',
                              flexShrink: 0, gap: 6,
                            }}>
                              <p style={{
                                fontSize: 15, fontWeight: 800,
                                color: amountColor,
                                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                              }}>
                                {amountPrefix}{formatINR(tx.amount)}
                              </p>

                              {!isConf && (
                                <motion.button
                                  whileTap={{ scale: 0.82 }}
                                  onClick={() => setConfirmId(tx.id)}
                                  style={{
                                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                                    background: 'rgba(239,68,68,0.10)',
                                    border: '1px solid rgba(239,68,68,0.22)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.75)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4h6v2" />
                                  </svg>
                                </motion.button>
                              )}
                            </div>
                          </div>

                          {/* Confirm delete bar */}
                          <AnimatePresence>
                            {isConf && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22 }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '10px 14px 12px', gap: 10,
                                  borderTop: '1px solid rgba(239,68,68,0.18)',
                                }}>
                                  <p style={{ fontSize: 11, color: 'rgba(252,165,165,0.80)', fontWeight: 500 }}>
                                    {confirmMsg}
                                  </p>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <motion.button
                                      whileTap={{ scale: 0.88 }}
                                      onClick={() => setConfirmId(null)}
                                      style={{
                                        height: 28, padding: '0 12px', borderRadius: 8,
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                    >Cancel</motion.button>
                                    <motion.button
                                      whileTap={{ scale: 0.88 }}
                                      disabled={isDel}
                                      onClick={() => handleDelete(tx.id)}
                                      style={{
                                        height: 28, padding: '0 12px', borderRadius: 8,
                                        background: isDel ? 'rgba(239,68,68,0.20)' : 'rgba(239,68,68,0.28)',
                                        border: '1px solid rgba(239,68,68,0.45)',
                                        color: isDel ? 'rgba(252,165,165,0.50)' : '#FCA5A5',
                                        fontSize: 11, fontWeight: 700,
                                        cursor: isDel ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 5,
                                      }}
                                    >
                                      {isDel ? (
                                        <>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                          </svg>
                                          Removing…
                                        </>
                                      ) : 'Delete'}
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
