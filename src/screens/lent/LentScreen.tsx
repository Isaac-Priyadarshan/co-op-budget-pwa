import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useLent } from '../../hooks/useLent'
import type { LentEntry, LentStatus } from '../../hooks/useLent'
import { useWallets } from '../../hooks/useWallets'
import { useUser } from '../../context/UserContext'
import { formatINR } from '../../utils/format'
import { supabase } from '../../lib/supabase'
import type { WalletEntry } from '../../lib/db'

// ─── Animated wave canvas ─────────────────────────────────────────────────────
function SummaryWaveCanvas() {
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
        const y = H * 0.52
          + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
          + Math.sin((x / W) * Math.PI * 1.1 + t * 0.35) * H * 0.07
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      const g1 = ctx.createLinearGradient(0, 0, 0, H)
      g1.addColorStop(0, 'rgba(52,211,153,0.22)')
      g1.addColorStop(1, 'rgba(52,211,153,0.04)')
      ctx.fillStyle = g1; ctx.fill()
      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.64
          + Math.sin((x / W) * Math.PI * 3.2 + t * 0.9 + 1.2) * H * 0.09
          + Math.sin((x / W) * Math.PI * 1.8 + t * 0.5 + 0.6) * H * 0.05
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
      const g2 = ctx.createLinearGradient(0, 0, 0, H)
      g2.addColorStop(0, 'rgba(20,184,166,0.16)')
      g2.addColorStop(1, 'rgba(20,184,166,0.03)')
      ctx.fillStyle = g2; ctx.fill()
      t += 0.012
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas ref={canvasRef} width={600} height={130}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '100%', borderRadius: 22, pointerEvents: 'none' }}
    />
  )
}

// ─── Days helper ──────────────────────────────────────────────────────────────
function daysAway(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function dueDateLabel(dateStr: string): { text: string; color: string } {
  const d = daysAway(dateStr)
  if (d < 0)   return { text: `${Math.abs(d)}d overdue`, color: '#F87171' }
  if (d === 0) return { text: 'Due today',               color: '#FBBF24' }
  if (d <= 3)  return { text: `In ${d}d`,                color: '#FB923C' }
  return       { text: `In ${d}d`,                       color: '#34D399' }
}

// ─── Transaction Log types ────────────────────────────────────────────────────
interface TxLogRow {
  id: string
  transaction_date: string
  amount: number
  type: string
  description: string
  category: string
}

function logEventMeta(row: TxLogRow): { label: string; dot: string; amountColor: string; sign: string } {
  const desc = row.description.toLowerCase()
  if (row.category === 'Lent') {
    if (desc.includes('more')) {
      return { label: 'Lent more', dot: '#34D399', amountColor: '#34D399', sign: '-' }
    }
    return { label: 'Lent out', dot: '#34D399', amountColor: '#34D399', sign: '-' }
  }
  if (row.category === 'Recovery') {
    if (desc.includes('settled')) {
      return { label: 'Fully Recovered', dot: '#14B8A6', amountColor: '#14B8A6', sign: '+' }
    }
    return { label: 'Partial Recovery', dot: '#FBBF24', amountColor: '#FBBF24', sign: '+' }
  }
  return { label: row.description, dot: 'rgba(255,255,255,0.3)', amountColor: '#f5f7ff', sign: '' }
}

function formatLogDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Lent Transaction Log Sheet ───────────────────────────────────────────────
function LentTransactionLogSheet({ open, entry, onClose }: {
  open: boolean
  entry: LentEntry | null
  onClose: () => void
}) {
  const [rows,    setRows]    = useState<TxLogRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    if (!open || !entry) return
    setRows([]); setErr(null); setLoading(true)

    supabase
      .from('transactions')
      .select('id, transaction_date, amount, type, description, category')
      .in('category', ['Lent', 'Recovery'])
      .ilike('description', `%${entry.person}%`)
      .order('transaction_date', { ascending: true })
      .order('created_at',       { ascending: true })
      .then(({ data, error: e }) => {
        setLoading(false)
        if (e) { setErr(e.message); return }
        setRows((data ?? []) as TxLogRow[])
      })
  }, [open, entry])

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 400 }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 401,
              background: '#111113',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '78vh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 0', flexShrink: 0 }} />
            <div style={{ padding: '16px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(52,211,153,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800, color: '#34D399',
                }}>
                  {entry.person.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#f5f7ff', lineHeight: 1 }}>
                    {entry.person}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                    Transaction History
                  </p>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Total Lent</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(entry.amount)}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px calc(env(safe-area-inset-bottom) + 24px)' }}>
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ height: 54, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
              )}
              {err && (
                <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center', padding: '20px 0' }}>{err}</p>
              )}
              {!loading && !err && rows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <p style={{ fontSize: 28, marginBottom: 10 }}>📭</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>No transactions found</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>
                    Transactions appear here once you lend or recover
                  </p>
                </div>
              )}
              {!loading && !err && rows.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 11, top: 12, bottom: 12, width: 1,
                    background: 'rgba(255,255,255,0.07)',
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {rows.map((row, idx) => {
                      const meta = logEventMeta(row)
                      const isLast = idx === rows.length - 1
                      return (
                        <motion.div
                          key={row.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.04 }}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            paddingBottom: isLast ? 0 : 16,
                          }}
                        >
                          <div style={{
                            width: 23, height: 23, borderRadius: '50%', flexShrink: 0,
                            background: `${meta.dot}20`,
                            border: `2px solid ${meta.dot}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 2, position: 'relative', zIndex: 1,
                          }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot }} />
                          </div>
                          <div style={{
                            flex: 1, minWidth: 0,
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${meta.dot}18`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: meta.amountColor, flex: 1, minWidth: 0 }}>
                                {meta.label}
                              </p>
                              <p style={{ fontSize: 13, fontWeight: 800, color: meta.amountColor, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                                {meta.sign}{formatINR(row.amount)}
                              </p>
                            </div>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                              {formatLogDate(row.transaction_date)}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LentStatus }) {
  const cfg = {
    pending: { label: 'Pending',  bg: 'rgba(251,191,36,0.12)',  color: '#FBBF24' },
    partial: { label: 'Partial',  bg: 'rgba(251,146,60,0.12)',  color: '#FB923C' },
    settled: { label: 'Settled',  bg: 'rgba(52,211,153,0.12)',  color: '#34D399' },
  }[status]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      padding: '3px 8px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700,
        border: active ? '1.5px solid #34D399' : '1.5px solid rgba(255,255,255,0.1)',
        background: active ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)',
        color: active ? '#34D399' : 'rgba(255,255,255,0.45)',
        cursor: 'pointer', transition: 'all 0.18s',
        flexShrink: 0,
      }}
    >
      {label}
    </motion.button>
  )
}

// ─── Drag handle ──────────────────────────────────────────────────────────────
function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <div
      onPointerDown={e => controls.start(e)}
      style={{
        width: 28, height: 28, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'grab', flexShrink: 0,
        color: 'rgba(255,255,255,0.2)',
        touchAction: 'none',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/>
        <circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/>
        <circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/>
      </svg>
    </div>
  )
}

// ─── Lent Card ────────────────────────────────────────────────────────────────
function LentCard({
  entry, onTap, onDelete, showDrag, dragControls,
}: {
  entry: LentEntry
  onTap: () => void
  onDelete: () => void
  showDrag: boolean
  dragControls: ReturnType<typeof useDragControls>
}) {
  const remaining = parseFloat((entry.amount - entry.paid_amount).toFixed(2))
  const pct = entry.amount > 0 ? Math.min(100, Math.round((entry.paid_amount / entry.amount) * 100)) : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      onClick={onTap}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showDrag && <DragHandle controls={dragControls} />}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(52,211,153,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color: '#34D399',
        }}>
          {entry.person.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#f5f7ff', marginBottom: 2 }}>
            {entry.person}
          </p>
          {entry.description ? (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.description}
            </p>
          ) : null}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(remaining)}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            of {formatINR(entry.amount)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #34D399, #14B8A6)' }}
        />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={entry.status} />
          {entry.due_date && (() => {
            const dl = dueDateLabel(entry.due_date)
            return (
              <span style={{ fontSize: 10, fontWeight: 600, color: dl.color }}>
                {dl.text}
              </span>
            )
          })()}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Action Sheet ─────────────────────────────────────────────────────────────
function LentActionSheet({ open, entry, wallets, onClose, onEdit, onAddMore, onPayment, onSettle, onLogSheet }: {
  open: boolean
  entry: LentEntry | null
  wallets: WalletEntry[]
  onClose: () => void
  onEdit: () => void
  onAddMore: () => void
  onPayment: () => void
  onSettle: () => void
  onLogSheet: () => void
}) {
  if (!entry) return null
  const remaining = parseFloat((entry.amount - entry.paid_amount).toFixed(2))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
              background: '#111113',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '0 0 calc(env(safe-area-inset-bottom) + 24px)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 12px' }} />
            <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(52,211,153,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: '#34D399',
                }}>
                  {entry.person.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff' }}>{entry.person}</p>
                  <StatusBadge status={entry.status} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Outstanding</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(remaining)}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {entry.status !== 'settled' && (
                <>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={onPayment}
                    style={{
                      width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                      background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(20,184,166,0.2))',
                      border: '1.5px solid rgba(52,211,153,0.35)', color: '#34D399', cursor: 'pointer',
                    }}
                  >💰 Record Payment</motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={onSettle}
                    style={{
                      width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                      background: 'rgba(20,184,166,0.12)',
                      border: '1.5px solid rgba(20,184,166,0.3)', color: '#14B8A6', cursor: 'pointer',
                    }}
                  >✅ Mark as Settled</motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={onAddMore}
                    style={{
                      width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                      background: 'rgba(52,211,153,0.08)',
                      border: '1.5px solid rgba(52,211,153,0.2)', color: 'rgba(52,211,153,0.7)', cursor: 'pointer',
                    }}
                  >➕ Lend More</motion.button>
                </>
              )}
              <motion.button whileTap={{ scale: 0.97 }} onClick={onLogSheet}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                }}
              >📋 Transaction History</motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onEdit}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
                }}
              >✏️ Edit Details</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LentScreen() {
  const {
    entries,
    loading,
    error,
    addLent,
    makePayment,
    markSettled,
    addMoreAmount,
    editLent,
    removeEntry,
    totalOwedToUs,
    reorderEntries,
  } = useLent()
  const { wallets } = useWallets()
  const { activeUser } = useUser()

  const [filter, setFilter] = useState<'all' | 'pending' | 'partial' | 'settled'>('all')
  const [actionEntry, setActionEntry] = useState<LentEntry | null>(null)
  const [actionOpen,  setActionOpen]  = useState(false)
  const [logEntry,    setLogEntry]    = useState<LentEntry | null>(null)
  const [logOpen,     setLogOpen]     = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [items, setItems] = useState<LentEntry[]>(entries)

  useEffect(() => { setItems(entries) }, [entries])

  const settledCount = entries.filter((e: LentEntry) => e.status === 'settled').length
  const filtered = filter === 'all' ? entries : entries.filter((e: LentEntry) => e.status === filter)

  // Suppress unused var warning — activeUser used for future per-user filtering
  void activeUser

  const handleTap = (entry: LentEntry) => {
    setActionEntry(entry); setActionOpen(true)
  }
  const handleDelete = async (id: string) => {
    try { await removeEntry(id) } catch (e) { console.error(e) }
  }
  const handlePayment = async () => {
    setActionOpen(false)
  }
  const handleSettle = async () => {
    if (!actionEntry || !wallets[0]) return
    try { await markSettled(actionEntry.id, wallets[0].id); setActionOpen(false) } catch (e) { console.error(e) }
  }
  const handleAddMore = async () => {
    setActionOpen(false)
  }
  const handleEdit = () => { setActionOpen(false) }
  const handleLogSheet = () => {
    setLogEntry(actionEntry); setLogOpen(true); setActionOpen(false)
  }

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 4 }}>Money Out</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Lent</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button whileTap={{ scale: 0.93 }} onClick={() => setReorderMode(r => !r)}
              style={{ padding: '10px 14px', background: reorderMode ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)', border: reorderMode ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: reorderMode ? '#34D399' : 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >⇅</motion.button>
          </div>
        </div>

        {/* Summary card */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.4 }}
          style={{ borderRadius: 24, padding: '20px', background: 'linear-gradient(135deg,rgba(52,211,153,0.18),rgba(20,184,166,0.12))', border: '1px solid rgba(52,211,153,0.25)', marginBottom: 20, position: 'relative', overflow: 'hidden', minHeight: 100 }}
        >
          <SummaryWaveCanvas />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 6 }}>Total Outstanding</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: '#34D399', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalOwedToUs)}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
              {entries.length} entries · {settledCount} settled
            </p>
          </div>
        </motion.div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {(['all', 'pending', 'partial', 'settled'] as const).map(f => (
            <FilterPill key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />
          ))}
        </div>

        {/* Content */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 100, borderRadius: 18, background: 'rgba(255,255,255,0.05)' }} />)}
          </div>
        )}
        {error && <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>{error}</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🤝</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No lent entries yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Track money you've lent to others</p>
          </div>
        )}

        {!loading && !reorderMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence initial={false}>
              {filtered.map((entry: LentEntry) => {
                const dc = useDragControls()
                return (
                  <LentCard key={entry.id} entry={entry} onTap={() => handleTap(entry)}
                    onDelete={() => handleDelete(entry.id)}
                    showDrag={false} dragControls={dc}
                  />
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && reorderMode && (
          <Reorder.Group axis="y" values={items} onReorder={(newOrder) => { setItems(newOrder); reorderEntries(newOrder) }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0 }}
          >
            {items.map((entry: LentEntry) => {
              const dc = useDragControls()
              return (
                <Reorder.Item key={entry.id} value={entry} dragControls={dc} dragListener={false}
                  style={{ borderRadius: 18 }}
                >
                  <LentCard entry={entry} onTap={() => handleTap(entry)}
                    onDelete={() => handleDelete(entry.id)}
                    showDrag={true} dragControls={dc}
                  />
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        )}
      </motion.div>

      <LentActionSheet
        open={actionOpen} entry={actionEntry} wallets={wallets}
        onClose={() => setActionOpen(false)}
        onEdit={handleEdit}
        onAddMore={handleAddMore}
        onPayment={handlePayment}
        onSettle={handleSettle}
        onLogSheet={handleLogSheet}
      />
      <LentTransactionLogSheet open={logOpen} entry={logEntry} onClose={() => setLogOpen(false)} />
    </div>
  )
}
