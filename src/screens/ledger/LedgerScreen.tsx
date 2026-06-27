import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { useWallets } from '../../hooks/useWallets'
import { formatINR } from '../../utils/format'

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function toDateStr(d: Date): string { return d.toISOString().slice(0, 10) }
function monthStart(y: number, m: number): string { return `${y}-${String(m + 1).padStart(2, '0')}-01` }
function monthEnd(y: number, m: number): string { return toDateStr(new Date(y, m + 1, 0)) }
function formatTxDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

type TxList = ReturnType<typeof useTransactions>['transactions']
function groupByDate(txs: TxList) {
  const groups: Record<string, TxList> = {}
  for (const tx of txs) {
    const key = new Date(tx.created_at).toDateString()
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
        const y = H * 0.52 + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
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
        const y = H * 0.64 + Math.sin((x / W) * Math.PI * 3.2 + t * 0.9 + 1.2) * H * 0.09
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
        const y = H * 0.52 + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
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
  const isCash   = type === 'cash'
  const icon     = isCash ? '💵' : '💳'
  const color    = isCash ? '#34D399' : '#C084FC'
  const bg       = isCash ? 'rgba(52,211,153,0.10)' : 'rgba(192,132,252,0.10)'
  const border   = isCash ? 'rgba(52,211,153,0.22)' : 'rgba(192,132,252,0.22)'

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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function LedgerScreen() {
  const today   = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [startDate, setStartDate] = useState(monthStart(today.getFullYear(), today.getMonth()))
  const [endDate,   setEndDate]   = useState(toDateStr(today))

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [userFilter, setUserFilter] = useState<'all' | 'Isaac' | 'Jenifa'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId,  setConfirmId]  = useState<string | null>(null)

  const { transactions, loading, error, removeTransaction } = useTransactions()
  const { expenseCategories, incomeCategories } = useCategories()
  const { wallets } = useWallets()

  // wallet id → { label, type } lookup
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
    return { icon: '💳', accent: '#A78BFA', bg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.18)' }
  }

  const rangeTxs = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00')
    const end   = new Date(endDate   + 'T23:59:59')
    return transactions.filter(tx => {
      const d = new Date(tx.created_at)
      return d >= start && d <= end
    })
  }, [transactions, startDate, endDate])

  const filtered = useMemo(() => rangeTxs
    .filter(tx => typeFilter === 'all' || tx.type === typeFilter)
    .filter(tx => userFilter === 'all' || (tx.created_by ?? '').toLowerCase() === userFilter.toLowerCase()),
  [rangeTxs, typeFilter, userFilter])

  const rangeIncome  = useMemo(() => rangeTxs.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0), [rangeTxs])
  const rangeExpense = useMemo(() => rangeTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [rangeTxs])
  const rangeBalance = rangeIncome - rangeExpense

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try { await removeTransaction(id) }
    catch (e) { console.error(e) }
    finally { setDeletingId(null); setConfirmId(null) }
  }

  const dateInputStyle: React.CSSProperties = {
    flex: 1, height: 34, borderRadius: 10,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(251,191,36,0.22)',
    color: '#F5F5F5', fontSize: 11, fontWeight: 600,
    padding: '0 8px', cursor: 'pointer', outline: 'none',
    WebkitAppearance: 'none', colorScheme: 'dark', minWidth: 0,
  }

  return (
    <div style={{ padding: '20px 20px 32px' }}>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
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
              <p style={{ fontSize: 22, fontWeight: 900, color: rangeBalance >= 0 ? '#34D399' : '#F87171', fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: rangeBalance >= 0 ? '0 0 18px rgba(52,211,153,0.45)' : '0 0 18px rgba(248,113,113,0.45)' }}>
                {rangeBalance < 0 ? '-' : ''}{formatINR(Math.abs(rangeBalance))}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.60)', marginBottom: 6 }}>Income</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatINR(rangeIncome)}</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {(['all', 'income', 'expense'] as const).map(f => (
              <motion.button key={f} whileTap={{ scale: 0.93 }} onClick={() => setTypeFilter(f)}
                style={{
                  height: 30, padding: '0 12px', borderRadius: 100,
                  border: typeFilter === f ? '1px solid rgba(251,191,36,0.55)' : '1px solid rgba(255,255,255,0.09)',
                  background: typeFilter === f ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                  color: typeFilter === f ? '#FBBF24' : 'rgba(255,255,255,0.40)',
                  fontSize: 11, fontWeight: typeFilter === f ? 700 : 400,
                  cursor: 'pointer', textTransform: 'capitalize', whiteSpace: 'nowrap',
                }}
              >{f}</motion.button>
            ))}
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
            {(['all', 'Isaac', 'Jenifa'] as const).map(u => (
              <motion.button key={u} whileTap={{ scale: 0.93 }} onClick={() => setUserFilter(u)}
                style={{
                  height: 30, padding: '0 12px', borderRadius: 100,
                  border: userFilter === u ? '1px solid rgba(94,234,212,0.50)' : '1px solid rgba(255,255,255,0.09)',
                  background: userFilter === u ? 'rgba(94,234,212,0.12)' : 'rgba(255,255,255,0.04)',
                  color: userFilter === u ? '#5EEAD4' : 'rgba(255,255,255,0.40)',
                  fontSize: 11, fontWeight: userFilter === u ? 700 : 400,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >{u === 'all' ? 'Both' : u}</motion.button>
            ))}
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 170 }}>
              <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, flexShrink: 0 }}>→</span>
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.26)', marginBottom: 14, fontWeight: 500 }}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Transaction list */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 70, borderRadius: 18, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#FCA5A5', fontSize: 13 }}>{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', padding: '52px 24px', borderRadius: 24, background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.10)' }}
          >
            <p style={{ fontSize: 40, marginBottom: 14 }}>📒</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(245,245,245,0.55)', marginBottom: 6 }}>No transactions</p>
            <p style={{ fontSize: 12, color: 'rgba(245,245,245,0.28)' }}>{startDate} → {endDate}</p>
            <p style={{ fontSize: 12, color: 'rgba(245,245,245,0.22)', marginTop: 4 }}>Tap a category on Home to add one</p>
          </motion.div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <AnimatePresence initial={false}>
              {grouped.map(([dateKey, txs]) => (
                <motion.div key={dateKey}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {formatTxDate(txs[0].created_at)}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(251,191,36,0.10)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {(() => { const net = txs.reduce((s,t) => t.type==='income'?s+t.amount:s-t.amount,0); return (net>=0?'+':'')+formatINR(net) })()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <AnimatePresence initial={false}>
                      {txs.map(tx => {
                        const meta         = getCatMeta(tx.category ?? '')
                        const isConfirming = confirmId  === tx.id
                        const isDeleting   = deletingId === tx.id
                        const userInitial  = (tx.created_by ?? 'U')[0].toUpperCase()
                        const userColor    = (tx.created_by ?? '').toLowerCase() === 'jenifa' ? '#F9A8D4' : '#5EEAD4'
                        const userBg       = (tx.created_by ?? '').toLowerCase() === 'jenifa' ? 'rgba(249,168,212,0.12)' : 'rgba(94,234,212,0.12)'
                        const hasNote      = tx.description && tx.description.toLowerCase().trim() !== (tx.category ?? '').toLowerCase().trim()
                        const walletMeta   = tx.wallet_id ? walletLookup[tx.wallet_id] : null

                        return (
                          <motion.div key={tx.id} layout
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -48, scale: 0.94 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              borderRadius: 18,
                              background: isConfirming ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${isConfirming ? 'rgba(248,113,113,0.30)' : 'rgba(255,255,255,0.07)'}`,
                              overflow: 'hidden', transition: 'background 0.2s, border 0.2s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                              {/* Category icon */}
                              <div style={{
                                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                                background: meta.bg, border: `1px solid ${meta.accent}30`,
                                boxShadow: `0 2px 8px ${meta.glow}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                              }}>{meta.icon}</div>

                              {/* Middle: category + note + wallet pill */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: meta.accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: hasNote ? 2 : walletMeta ? 4 : 0 }}>
                                  {tx.category}
                                </p>
                                {hasNote && (
                                  <p style={{ fontSize: 11, color: 'rgba(245,245,245,0.42)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: walletMeta ? 4 : 0 }}>
                                    {tx.description}
                                  </p>
                                )}
                                {walletMeta && (
                                  <WalletPill label={walletMeta.label} type={walletMeta.type} />
                                )}
                              </div>

                              {/* Right: amount + user avatar + delete */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                                <p style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: tx.type === 'income' ? '#34D399' : '#F87171' }}>
                                  {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: userBg, border: `1px solid ${userColor}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 700, color: userColor,
                                  }}>{userInitial}</div>
                                  <motion.button whileTap={{ scale: 0.82 }}
                                    onClick={() => setConfirmId(prev => prev === tx.id ? null : tx.id)}
                                    style={{
                                      width: 22, height: 22, borderRadius: '50%',
                                      background: isConfirming ? 'rgba(248,113,113,0.20)' : 'rgba(255,255,255,0.06)',
                                      border: isConfirming ? '1px solid rgba(248,113,113,0.40)' : '1px solid rgba(255,255,255,0.10)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', fontSize: 11,
                                    }}
                                  >🗑️</motion.button>
                                </div>
                              </div>
                            </div>

                            {/* Confirm delete panel */}
                            <AnimatePresence initial={false}>
                              {isConfirming && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.20, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden' }}
                                >
                                  <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px' }}>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmId(null)}
                                      style={{ flex: 1, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                    >Cancel</motion.button>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => void handleDelete(tx.id)} disabled={isDeleting}
                                      style={{ flex: 2, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,rgba(239,68,68,0.80),rgba(220,38,38,0.90))', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                                    >{isDeleting ? 'Deleting…' : 'Yes, Delete'}</motion.button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  )
}
