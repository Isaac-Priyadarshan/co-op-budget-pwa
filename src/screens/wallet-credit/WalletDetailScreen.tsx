import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { useTransactions } from '../../hooks/useTransactions'
import { WalletSheet } from '../../components/shared/WalletSheet'
import { formatINR } from '../../utils/format'
import type { WalletEntry, NewWallet, Transaction } from '../../lib/db'

// ─── Ordinal helper ────────────────────────────────────────────────────────────
function ordinal(day?: number | null) {
  if (!day || day < 1 || day > 31) return '—'
  const s = day % 100
  const l = day % 10
  const suffix = s >= 11 && s <= 13 ? 'th' : l === 1 ? 'st' : l === 2 ? 'nd' : l === 3 ? 'rd' : 'th'
  return `${day}${suffix}`
}

// ─── Animated Wave Canvas ──────────────────────────────────────────────────────
// Colour tokens are passed in so the wave matches wallet (green) vs credit (red)
function WaveCanvas({ primary, secondary }: { primary: string; secondary: string }) {
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

      // Wave 1 — primary colour, dominant
      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.52
          + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
          + Math.sin((x / W) * Math.PI * 1.1 + t * 0.35) * H * 0.07
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      const g1 = ctx.createLinearGradient(0, 0, 0, H)
      g1.addColorStop(0, primary.replace(')', ',0.18)').replace('rgb', 'rgba'))
      g1.addColorStop(1, primary.replace(')', ',0.04)').replace('rgb', 'rgba'))
      ctx.fillStyle = g1
      ctx.fill()

      // Wave 2 — secondary colour, quieter
      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.64
          + Math.sin((x / W) * Math.PI * 3.2 + t * 0.9 + 1.2) * H * 0.09
          + Math.sin((x / W) * Math.PI * 1.8 + t * 0.5 + 0.6) * H * 0.05
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      const g2 = ctx.createLinearGradient(0, 0, 0, H)
      g2.addColorStop(0, secondary.replace(')', ',0.14)').replace('rgb', 'rgba'))
      g2.addColorStop(1, secondary.replace(')', ',0.03)').replace('rgb', 'rgba'))
      ctx.fillStyle = g2
      ctx.fill()

      // Wave 1 stroke line
      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.52
          + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
          + Math.sin((x / W) * Math.PI * 1.1 + t * 0.35) * H * 0.07
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = primary.replace(')', ',0.28)').replace('rgb', 'rgba')
      ctx.lineWidth = 1.2
      ctx.stroke()

      t += 0.012
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [primary, secondary])

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

// ─── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      flex: '1 1 calc(50% - 6px)',
      minWidth: 0,
      padding: '14px 14px 12px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 15, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

// ─── Smart Compact Toggle ─────────────────────────────────────────────────────
function ViewToggle({ mode, onChange }: { mode: 'day' | 'month'; onChange: (m: 'day' | 'month') => void }) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 99,
      padding: 3,
    }}>
      {/* Animated sliding pill */}
      <motion.div
        layoutId="toggle-pill"
        layout
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        style={{
          position: 'absolute',
          top: 3,
          left: mode === 'day' ? 3 : 'calc(50% + 0px)',
          width: 'calc(50% - 3px)',
          height: 'calc(100% - 6px)',
          borderRadius: 99,
          background: 'rgba(255,255,255,0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {(['day', 'month'] as const).map(m => (
        <motion.button
          key={m}
          onClick={() => onChange(m)}
          whileTap={{ scale: 0.92 }}
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            padding: '5px 12px',
            borderRadius: 99,
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            background: 'transparent',
            color: mode === m ? '#f5f7ff' : 'rgba(255,255,255,0.35)',
            transition: 'color 0.18s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {m === 'day' ? 'Day' : 'Month'}
        </motion.button>
      ))}
    </div>
  )
}

// ─── Transaction Row ───────────────────────────────────────────────────────────
function TxRow({ tx }: { tx: Transaction }) {
  const d = new Date(tx.created_at)
  const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const isTransfer    = tx.type === 'transfer'
  const isExpense     = tx.type === 'expense'
  const isTransferOut = isTransfer && tx.description.startsWith('Transfer →')

  const dotColor    = isTransfer ? '#818CF8' : isExpense ? '#F87171' : '#34D399'
  const dotGlow     = isTransfer ? 'rgba(129,140,248,0.5)' : isExpense ? 'rgba(248,113,113,0.5)' : 'rgba(52,211,153,0.5)'
  const rowBg       = isTransfer ? 'rgba(99,102,241,0.05)' : isExpense ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)'
  const rowBorder   = isTransfer ? 'rgba(99,102,241,0.14)' : isExpense ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)'
  const amountColor  = isTransfer ? (isTransferOut ? '#F87171' : '#34D399') : isExpense ? '#F87171' : '#34D399'
  const amountPrefix = isTransfer ? (isTransferOut ? '−' : '+') : isExpense ? '−' : '+'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
        borderRadius: 16, background: rowBg, border: `1px solid ${rowBorder}`,
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: dotColor, boxShadow: `0 0 6px ${dotGlow}`,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {isTransfer && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#818CF8', background: 'rgba(99,102,241,0.16)',
              border: '1px solid rgba(99,102,241,0.28)', borderRadius: 99, padding: '1px 6px', flexShrink: 0,
            }}>
              {isTransferOut ? 'OUT' : 'IN'}
            </span>
          )}
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f5f7ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.description || tx.category}
          </p>
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
          {isTransfer ? 'Transfer' : tx.category}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: amountColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {amountPrefix}{formatINR(tx.amount)}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{dateStr}</p>
      </div>
    </motion.div>
  )
}

// ─── Day Group ──────────────────────────────────────────────────────────────────
function DayGroup({ label, txs }: { label: string; txs: Transaction[] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.32)', marginBottom: 10, paddingLeft: 4,
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence initial={false}>
          {txs.map(tx => <TxRow key={tx.id} tx={tx} />)}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Month Accordion ───────────────────────────────────────────────────────────────
function MonthGroup({
  label, txs, isOpen, onToggle, accentColor,
}: {
  label: string; txs: Transaction[]; isOpen: boolean; onToggle: () => void; accentColor: string
}) {
  const total = txs.reduce((sum, t) => {
    if (t.type === 'expense') return sum - t.amount
    if (t.type === 'income')  return sum + t.amount
    return sum
  }, 0)
  const totalColor = total >= 0 ? '#34D399' : '#F87171'

  return (
    <div style={{
      borderRadius: 18, background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)', marginBottom: 10, overflow: 'hidden',
    }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '14px 18px',
          background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff' }}>{label}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.38)', background: 'rgba(255,255,255,0.07)',
            borderRadius: 99, padding: '2px 8px',
          }}>
            {txs.length} txn{txs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: totalColor, fontVariantNumeric: 'tabular-nums' }}>
          {total >= 0 ? '+' : ''}{formatINR(Math.abs(total))}
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="month-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 14px 14px' }}>
              <AnimatePresence initial={false}>
                {txs.map(tx => <TxRow key={tx.id} tx={tx} />)}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Grouping helpers ──────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function groupByDay(txs: Transaction[]): { label: string; key: string; txs: Transaction[] }[] {
  const map = new Map<string, { label: string; txs: Transaction[] }>()
  for (const tx of txs) {
    const d   = new Date(tx.created_at)
    const key = d.toISOString().substring(0, 10)
    const lbl = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, { label: lbl, txs: [] })
    map.get(key)!.txs.push(tx)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, val]) => ({ key, label: val.label, txs: val.txs }))
}

function groupByMonth(txs: Transaction[]): { label: string; key: string; txs: Transaction[] }[] {
  const map = new Map<string, { label: string; txs: Transaction[] }>()
  for (const tx of txs) {
    const d   = new Date(tx.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const lbl = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    if (!map.has(key)) map.set(key, { label: lbl, txs: [] })
    map.get(key)!.txs.push(tx)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, val]) => ({ key, label: val.label, txs: val.txs }))
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export function WalletDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const location  = useLocation()
  const { wallets, update, remove } = useWallets()
  const { transactions, loading: txLoading } = useTransactions()
  const [editOpen,   setEditOpen]   = useState(false)
  const [viewMode,   setViewMode]   = useState<'day' | 'month'>('day')
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set())

  const fromScreen = new URLSearchParams(location.search).get('from') ?? 'home'
  const handleBack = () => navigate(`/?screen=${fromScreen}`, { replace: true })

  const wallet = wallets.find(w => w.id === id) as WalletEntry | undefined

  const walletTxs = useMemo(
    () => transactions
      .filter(t => t.wallet_id === id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [transactions, id]
  )

  const now = new Date()
  const monthTxs = useMemo(
    () => walletTxs.filter(t => {
      const d = new Date(t.created_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }),
    [walletTxs, now]
  )

  const monthSpent    = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthReceived = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthCount    = monthTxs.length

  const isCredit     = wallet?.type === 'credit'
  const available    = isCredit ? Math.max(0, (wallet?.credit_limit ?? 0) - (wallet?.balance ?? 0)) : 0
  const accentColor  = isCredit ? '#F87171' : '#34D399'
  const accentGlow   = isCredit ? 'rgba(248,113,113,0.28)' : 'rgba(52,211,153,0.28)'
  const accentBorder = isCredit ? 'rgba(248,113,113,0.22)' : 'rgba(52,211,153,0.22)'

  // Wave colours — red pair for credit, green pair for wallet
  const wavePRIMARY   = isCredit ? 'rgb(248,113,113)' : 'rgb(52,211,153)'
  const waveSECONDARY = isCredit ? 'rgb(239,68,68)'   : 'rgb(16,185,129)'

  // 3-column summary values
  // Wallet:  Spent · Balance · Received
  // Credit:  Outstanding · Available · Limit
  const leftLabel  = isCredit ? 'Outstanding' : 'Spent'
  const leftValue  = isCredit ? formatINR(wallet?.balance ?? 0) : formatINR(monthSpent)
  const leftColor  = '#F87171'

  const midLabel   = isCredit ? 'Available' : 'Balance'
  const midValue   = isCredit ? formatINR(available) : formatINR(wallet?.balance ?? 0)
  const midColor   = isCredit
    ? (available > 0 ? '#34D399' : '#F87171')
    : ((wallet?.balance ?? 0) >= 0 ? '#34D399' : '#F87171')
  const midGlow    = isCredit
    ? (available > 0 ? 'rgba(52,211,153,0.45)' : 'rgba(248,113,113,0.45)')
    : ((wallet?.balance ?? 0) >= 0 ? 'rgba(52,211,153,0.45)' : 'rgba(248,113,113,0.45)')

  const rightLabel = isCredit ? 'Credit Limit' : 'Received'
  const rightValue = isCredit ? formatINR(wallet?.credit_limit ?? 0) : formatINR(monthReceived)
  const rightColor = isCredit ? '#A5B4FC' : '#34D399'

  const dayGroups   = useMemo(() => groupByDay(walletTxs),   [walletTxs])
  const monthGroups = useMemo(() => groupByMonth(walletTxs), [walletTxs])

  const handleModeChange = (m: 'day' | 'month') => {
    setViewMode(m)
    if (m === 'month' && monthGroups.length > 0) {
      setOpenMonths(new Set([monthGroups[0].key]))
    }
  }

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleUpdate = async (wid: string, w: NewWallet) => { await update(wid, w); setEditOpen(false) }
  const handleDelete = async (wid: string) => { await remove(wid); handleBack() }

  if (!wallet) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 12px' }}>
          <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </motion.button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f5f7ff' }}>Loading…</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 20px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 62, borderRadius: 18, background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#000000', overflow: 'hidden',
    }}>

      {/* ── Sticky top area ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(to bottom, #000000 85%, transparent 100%)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        padding: '20px 20px 0',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
      }}>

        {/* ── Header row: Back · Title · Toggle · Edit ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 10, marginBottom: 16,
        }}>
          {/* Back */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </motion.button>

          {/* Title */}
          <span style={{
            fontSize: 15, fontWeight: 700, color: '#f5f7ff',
            flex: 1, minWidth: 0,
            textAlign: 'center',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {wallet.label}
          </span>

          {/* Compact Day / Month toggle */}
          <ViewToggle mode={viewMode} onChange={handleModeChange} />

          {/* Edit */}
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setEditOpen(true)}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
              border: '1px solid rgba(251,191,36,0.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </motion.button>
        </div>

        {/* ── Hero Summary Card — Ledger style ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: 16,
            background: 'linear-gradient(160deg,#06080a 0%,#040607 60%,#060a08 100%)',
            border: `1px solid ${accentBorder}`,
            boxShadow: `0 0 0 1px ${accentBorder.replace('0.22','0.06')}, 0 8px 40px rgba(0,0,0,0.7), 0 2px 0 ${accentBorder.replace('0.22','0.12')} inset`,
            minHeight: 100,
          }}
        >
          {/* Animated wave background */}
          <WaveCanvas primary={wavePRIMARY} secondary={waveSECONDARY} />

          {/* Top glint line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: `linear-gradient(90deg,transparent,${accentColor}88,transparent)`,
          }} />

          {/* 3-column content grid */}
          <div style={{
            position: 'relative', zIndex: 2,
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center', padding: '20px 20px 22px',
          }}>
            {/* Left — Spent / Outstanding */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${leftColor}99`, marginBottom: 6 }}>
                {leftLabel}
              </p>
              <p style={{ fontSize: 17, fontWeight: 800, color: leftColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {leftValue}
              </p>
            </div>

            {/* Centre — Balance / Available (big glowing number) */}
            <div style={{ textAlign: 'center', padding: '0 18px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${midColor}88`, marginBottom: 6 }}>
                {midLabel}
              </p>
              <p style={{
                fontSize: 22, fontWeight: 900,
                color: midColor,
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                textShadow: `0 0 18px ${midGlow}`,
              }}>
                {midValue}
              </p>
            </div>

            {/* Right — Received / Credit Limit */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${rightColor}99`, marginBottom: 6 }}>
                {rightLabel}
              </p>
              <p style={{ fontSize: 17, fontWeight: 800, color: rightColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {rightValue}
              </p>
            </div>
          </div>

          {/* Stat pills — credit-specific extras (billing / due dates) */}
          {isCredit && (
            <div style={{
              position: 'relative', zIndex: 2,
              display: 'flex', flexWrap: 'wrap', gap: 8,
              padding: '0 20px 20px',
            }}>
              <StatPill label="Spent This Month" value={formatINR(monthSpent)}         accent="#F87171" />
              <StatPill label="Txns This Month"  value={String(monthCount)}            accent="rgba(255,255,255,0.65)" />
              <StatPill label="Billing Date"     value={ordinal(wallet.billing_date)}  accent="#FBBF24" />
              <StatPill label="Due Date"         value={ordinal(wallet.due_date)}      accent="#FB923C" />
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Scrollable transaction list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px calc(env(safe-area-inset-bottom) + 32px)' }}>

        {/* Loading skeletons */}
        {txLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 62, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!txLoading && walletTxs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center', padding: '40px 20px',
              borderRadius: 18, background: 'rgba(255,255,255,0.03)',
              border: `1px dashed ${accentBorder}`,
            }}
          >
            <p style={{ fontSize: 28, marginBottom: 12 }}>{isCredit ? '💳' : '👛'}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>No transactions yet</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Transactions using this {isCredit ? 'card' : 'wallet'} will appear here</p>
          </motion.div>
        )}

        {/* DAY MODE */}
        {!txLoading && walletTxs.length > 0 && viewMode === 'day' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="day-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {dayGroups.map(group => (
                <DayGroup key={group.key} label={group.label} txs={group.txs} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* MONTH MODE */}
        {!txLoading && walletTxs.length > 0 && viewMode === 'month' && (
          <AnimatePresence mode="wait">
            <motion.div
              key="month-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {monthGroups.map(group => (
                <MonthGroup
                  key={group.key}
                  label={group.label}
                  txs={group.txs}
                  isOpen={openMonths.has(group.key)}
                  onToggle={() => toggleMonth(group.key)}
                  accentColor={accentColor}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Edit Sheet */}
      <WalletSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={async () => {}}
        mode="edit"
        editItem={wallet}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}
