import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useLent } from '../../hooks/useLent'
import { useWallets } from '../../hooks/useWallets'
import { useUser } from '../../context/UserContext'
import { formatINR } from '../../utils/format'
import { supabase } from '../../lib/supabase'
import type { LentEntry, LentStatus, EditLentPayload } from '../../hooks/useLent'
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

// ─── Action Sheet (detail/actions for a lent entry) ───────────────────────────
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
            {/* Header */}
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
            {/* Actions */}
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
                      background: 'rgba(251,191,36,0.1)',
                      border: '1.5px solid rgba(251,191,36,0.25)', color: '#FBBF24', cursor: 'pointer',
                    }}
                  >➕ Lend More</motion.button>
                </>
              )}
              <motion.button whileTap={{ scale: 0.97 }} onClick={onLogSheet}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                }}
              >📋 Transaction Log</motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onEdit}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                }}
              >✏️ Edit Details</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Add Lent Sheet ───────────────────────────────────────────────────────────
function AddLentSheet({ open, wallets, onClose, onSave }: {
  open: boolean
  wallets: WalletEntry[]
  onClose: () => void
  onSave: (person: string, description: string, amount: number, dueDate: string, walletId: string) => void
}) {
  const [person,      setPerson]      = useState('')
  const [description, setDescription] = useState('')
  const [amount,      setAmount]      = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [walletId,    setWalletId]    = useState('')

  useEffect(() => {
    if (!open) { setPerson(''); setDescription(''); setAmount(''); setDueDate(''); setWalletId('') }
    else if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id)
  }, [open, wallets])

  const cashWallets = wallets.filter(w => w.type === 'cash')

  const canSave = person.trim().length > 0 && parseFloat(amount) > 0 && walletId

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
              padding: '0 20px calc(env(safe-area-inset-bottom) + 32px)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: '#f5f7ff', marginBottom: 20 }}>Lend Money</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Person */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Person</p>
                <input
                  value={person} onChange={e => setPerson(e.target.value)}
                  placeholder="Who did you lend to?"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f5f7ff', outline: 'none',
                  }}
                />
              </div>
              {/* Description */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note (optional)</p>
                <input
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What for?"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f5f7ff', outline: 'none',
                  }}
                />
              </div>
              {/* Amount */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (₹)</p>
                <input
                  type="number" inputMode="decimal"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f5f7ff', outline: 'none',
                  }}
                />
              </div>
              {/* Due date */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due Date (optional)</p>
                <input
                  type="date"
                  value={dueDate} onChange={e => setDueDate(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f5f7ff', outline: 'none', colorScheme: 'dark',
                  }}
                />
              </div>
              {/* Wallet */}
              {cashWallets.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>From Wallet</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {cashWallets.map(w => (
                      <motion.button
                        key={w.id}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setWalletId(w.id)}
                        style={{
                          padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                          border: walletId === w.id ? '1.5px solid #34D399' : '1.5px solid rgba(255,255,255,0.1)',
                          background: walletId === w.id ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                          color: walletId === w.id ? '#34D399' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                        }}
                      >
                        {w.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (!canSave) return
                onSave(person.trim(), description.trim(), parseFloat(amount), dueDate, walletId)
              }}
              style={{
                marginTop: 24, width: '100%', padding: '15px', borderRadius: 14,
                fontSize: 16, fontWeight: 800,
                background: canSave
                  ? 'linear-gradient(135deg, #34D399, #14B8A6)'
                  : 'rgba(255,255,255,0.06)',
                color: canSave ? '#0a0a0a' : 'rgba(255,255,255,0.25)',
                border: 'none', cursor: canSave ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Lend Money
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────
function EditLentSheet({ open, entry, onClose, onSave }: {
  open: boolean
  entry: LentEntry | null
  onClose: () => void
  onSave: (payload: EditLentPayload) => void
}) {
  const [person,      setPerson]      = useState('')
  const [description, setDescription] = useState('')
  const [dueDate,     setDueDate]     = useState('')

  useEffect(() => {
    if (entry) {
      setPerson(entry.person)
      setDescription(entry.description ?? '')
      setDueDate(entry.due_date ?? '')
    }
  }, [entry, open])

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 350 }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 351,
              background: '#111113',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '0 20px calc(env(safe-area-inset-bottom) + 32px)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: '#f5f7ff', marginBottom: 20 }}>Edit Entry</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Person</p>
                <input value={person} onChange={e => setPerson(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f7ff', outline: 'none' }}
                />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note</p>
                <input value={description} onChange={e => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f7ff', outline: 'none' }}
                />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due Date</p>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f7ff', outline: 'none', colorScheme: 'dark' }}
                />
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => onSave({ person: person.trim(), description: description.trim(), due_date: dueDate || null })}
              style={{ marginTop: 24, width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #34D399, #14B8A6)', color: '#0a0a0a', border: 'none', cursor: 'pointer' }}
            >Save Changes</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Add More Sheet ───────────────────────────────────────────────────────────
function AddMoreSheet({ open, entry, wallets, onClose, onSave }: {
  open: boolean
  entry: LentEntry | null
  wallets: WalletEntry[]
  onClose: () => void
  onSave: (amount: number, walletId: string) => void
}) {
  const [amount,   setAmount]   = useState('')
  const [walletId, setWalletId] = useState('')

  useEffect(() => {
    if (!open) { setAmount(''); setWalletId('') }
    else if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id)
  }, [open, wallets])

  const cashWallets = wallets.filter(w => w.type === 'cash')
  const canSave = parseFloat(amount) > 0 && walletId

  if (!entry) return null
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 350 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 351, background: '#111113', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)', padding: '0 20px calc(env(safe-area-inset-bottom) + 32px)' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: '#FBBF24', marginBottom: 6 }}>Lend More</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Adding to {entry.person} · Current: {formatINR(entry.amount)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (₹)</p>
                <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f7ff', outline: 'none' }} />
              </div>
              {cashWallets.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>From Wallet</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {cashWallets.map(w => (
                      <motion.button key={w.id} whileTap={{ scale: 0.93 }} onClick={() => setWalletId(w.id)}
                        style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: walletId === w.id ? '1.5px solid #FBBF24' : '1.5px solid rgba(255,255,255,0.1)', background: walletId === w.id ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)', color: walletId === w.id ? '#FBBF24' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                      >{w.label}</motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (!canSave) return; onSave(parseFloat(amount), walletId) }}
              style={{ marginTop: 24, width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: canSave ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : 'rgba(255,255,255,0.06)', color: canSave ? '#0a0a0a' : 'rgba(255,255,255,0.25)', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed' }}
            >Lend More</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Recovery Sheet ───────────────────────────────────────────────────────────
function RecoverySheet({ open, entry, wallets, onClose, onSave }: {
  open: boolean
  entry: LentEntry | null
  wallets: WalletEntry[]
  onClose: () => void
  onSave: (amount: number, walletId: string) => void
}) {
  const [amount,   setAmount]   = useState('')
  const [walletId, setWalletId] = useState('')

  useEffect(() => {
    if (!open) { setAmount(''); setWalletId('') }
    else if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id)
  }, [open, wallets])

  const cashWallets = wallets.filter(w => w.type === 'cash')
  const remaining   = entry ? parseFloat((entry.amount - entry.paid_amount).toFixed(2)) : 0
  const canSave     = parseFloat(amount) > 0 && parseFloat(amount) <= remaining && walletId

  if (!entry) return null
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 350 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 351, background: '#111113', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)', padding: '0 20px calc(env(safe-area-inset-bottom) + 32px)' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: '#34D399', marginBottom: 6 }}>Record Payment</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>From {entry.person} · Outstanding: {formatINR(remaining)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount Received (₹)</p>
                <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 15, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f7ff', outline: 'none' }} />
              </div>
              {cashWallets.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Into Wallet</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {cashWallets.map(w => (
                      <motion.button key={w.id} whileTap={{ scale: 0.93 }} onClick={() => setWalletId(w.id)}
                        style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: walletId === w.id ? '1.5px solid #34D399' : '1.5px solid rgba(255,255,255,0.1)', background: walletId === w.id ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)', color: walletId === w.id ? '#34D399' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                      >{w.label}</motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (!canSave) return; onSave(parseFloat(amount), walletId) }}
              style={{ marginTop: 24, width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: canSave ? 'linear-gradient(135deg, #34D399, #14B8A6)' : 'rgba(255,255,255,0.06)', color: canSave ? '#0a0a0a' : 'rgba(255,255,255,0.25)', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed' }}
            >Confirm Payment</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Settle Confirm Sheet ─────────────────────────────────────────────────────
function SettleSheet({ open, entry, wallets, onClose, onConfirm }: {
  open: boolean
  entry: LentEntry | null
  wallets: WalletEntry[]
  onClose: () => void
  onConfirm: (walletId: string) => void
}) {
  const [walletId, setWalletId] = useState('')

  useEffect(() => {
    if (!open) setWalletId('')
    else if (wallets.length > 0 && !walletId) setWalletId(wallets[0].id)
  }, [open, wallets])

  const cashWallets = wallets.filter(w => w.type === 'cash')
  const remaining   = entry ? parseFloat((entry.amount - entry.paid_amount).toFixed(2)) : 0

  if (!entry) return null
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 350 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 351, background: '#111113', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)', padding: '0 20px calc(env(safe-area-inset-bottom) + 32px)' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: '#14B8A6', marginBottom: 6 }}>Mark as Settled</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
              {remaining > 0
                ? `${entry.person} will return ${formatINR(remaining)} — select wallet to receive`
                : `${entry.person} has fully paid. Mark as settled.`}
            </p>
            {remaining > 0 && cashWallets.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Receive Into Wallet</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {cashWallets.map(w => (
                    <motion.button key={w.id} whileTap={{ scale: 0.93 }} onClick={() => setWalletId(w.id)}
                      style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: walletId === w.id ? '1.5px solid #14B8A6' : '1.5px solid rgba(255,255,255,0.1)', background: walletId === w.id ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.04)', color: walletId === w.id ? '#14B8A6' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                    >{w.label}</motion.button>
                  ))}
                </div>
              </div>
            )}
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onConfirm(walletId)}
              style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: '#0a0a0a', border: 'none', cursor: 'pointer' }}
            >Confirm Settlement</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Delete Confirm Sheet ─────────────────────────────────────────────────────
function DeleteSheet({ open, entry, onClose, onConfirm }: {
  open: boolean
  entry: LentEntry | null
  onClose: () => void
  onConfirm: () => void
}) {
  if (!entry) return null
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 350 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 351, background: '#111113', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)', padding: '0 20px calc(env(safe-area-inset-bottom) + 32px)' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 20px' }} />
            <p style={{ fontSize: 18, fontWeight: 800, color: '#F87171', marginBottom: 8 }}>Delete Entry?</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 24, lineHeight: 1.6 }}>
              This will remove <strong style={{ color: '#f5f7ff' }}>{entry.person}</strong> from your lent list. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
                style={{ flex: 1, padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
              >Cancel</motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onConfirm}
                style={{ flex: 1, padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: 'rgba(248,113,113,0.15)', border: '1.5px solid rgba(248,113,113,0.3)', color: '#F87171', cursor: 'pointer' }}
              >Delete</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════════════════
export default function LentScreen() {
  const { activeUser } = useUser()
  const { entries, loading, saving, totalToRecover, addLent, editLent, reorderEntries, addMoreAmount, makePayment, markSettled, removeEntry } = useLent()
  const { wallets } = useWallets()

  const [filter,        setFilter]        = useState<'all' | 'pending' | 'partial' | 'settled'>('all')
  const [showAdd,       setShowAdd]       = useState(false)
  const [showAction,    setShowAction]    = useState(false)
  const [showEdit,      setShowEdit]      = useState(false)
  const [showAddMore,   setShowAddMore]   = useState(false)
  const [showPayment,   setShowPayment]   = useState(false)
  const [showSettle,    setShowSettle]    = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)
  const [showLog,       setShowLog]       = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<LentEntry | null>(null)

  const filtered = filter === 'all'
    ? entries
    : entries.filter(e => e.status === filter)

  const pendingCount = entries.filter(e => e.status === 'pending').length
  const partialCount = entries.filter(e => e.status === 'partial').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#09090b', color: '#f5f7ff', overflowY: 'auto' }}>

      {/* ── Summary Card ── */}
      <div style={{ margin: '16px 16px 0', borderRadius: 22, overflow: 'hidden', position: 'relative', minHeight: 110, background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(20,184,166,0.1))', border: '1px solid rgba(52,211,153,0.2)' }}>
        <SummaryWaveCanvas />
        <div style={{ position: 'relative', zIndex: 1, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Total Owed to You</p>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#34D399', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {formatINR(totalToRecover)}
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            {pendingCount > 0 && <p style={{ fontSize: 11, color: '#FBBF24' }}>{pendingCount} pending</p>}
            {partialCount > 0 && <p style={{ fontSize: 11, color: '#FB923C' }}>{partialCount} partial</p>}
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 16px 8px', overflowX: 'auto' }}>
        {(['all', 'pending', 'partial', 'settled'] as const).map(f => (
          <FilterPill key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>

      {/* ── Entry List ── */}
      <div style={{ flex: 1, padding: '8px 16px calc(env(safe-area-inset-bottom) + 96px)' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 110, borderRadius: 18, background: 'rgba(255,255,255,0.04)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🤝</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>No lent entries</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)', marginTop: 6 }}>Tap + to record money you lent</p>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={filtered}
            onReorder={newOrder => {
              const ids = new Set(newOrder.map(e => e.id))
              const rest = entries.filter(e => !ids.has(e.id))
              reorderEntries([...newOrder, ...rest])
            }}
            style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}
          >
            <AnimatePresence>
              {filtered.map(entry => {
                const dc = useDragControls()
                return (
                  <Reorder.Item key={entry.id} value={entry} dragControls={dc} dragListener={false} style={{ listStyle: 'none' }}>
                    <LentCard
                      entry={entry}
                      onTap={() => { setSelectedEntry(entry); setShowAction(true) }}
                      onDelete={() => { setSelectedEntry(entry); setShowDelete(true) }}
                      showDrag={filter === 'all'}
                      dragControls={dc}
                    />
                  </Reorder.Item>
                )
              })}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* ── FAB ── */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom) + 84px)', right: 20,
          width: 54, height: 54, borderRadius: '50%',
          background: 'linear-gradient(135deg, #34D399, #14B8A6)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(52,211,153,0.4)',
          zIndex: 50,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.8">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </motion.button>

      {saving && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 99, padding: '8px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#34D399' }}>Saving…</p>
        </div>
      )}

      {/* ── Sheets ── */}
      <AddLentSheet
        open={showAdd}
        wallets={wallets}
        onClose={() => setShowAdd(false)}
        onSave={(person, description, amount, dueDate, walletId) => {
          if (!activeUser) return
          addLent({ person, description, lent_by: activeUser, amount, due_date: dueDate, source_wallet_id: walletId })
          setShowAdd(false)
        }}
      />

      <LentActionSheet
        open={showAction}
        entry={selectedEntry}
        wallets={wallets}
        onClose={() => setShowAction(false)}
        onEdit={() => { setShowAction(false); setShowEdit(true) }}
        onAddMore={() => { setShowAction(false); setShowAddMore(true) }}
        onPayment={() => { setShowAction(false); setShowPayment(true) }}
        onSettle={() => { setShowAction(false); setShowSettle(true) }}
        onLogSheet={() => { setShowAction(false); setShowLog(true) }}
      />

      <EditLentSheet
        open={showEdit}
        entry={selectedEntry}
        onClose={() => setShowEdit(false)}
        onSave={async payload => {
          if (!selectedEntry) return
          await editLent(selectedEntry.id, payload)
          setShowEdit(false)
        }}
      />

      <AddMoreSheet
        open={showAddMore}
        entry={selectedEntry}
        wallets={wallets}
        onClose={() => setShowAddMore(false)}
        onSave={(amount, walletId) => {
          if (!selectedEntry) return
          addMoreAmount(selectedEntry.id, amount, walletId)
          setShowAddMore(false)
        }}
      />

      <RecoverySheet
        open={showPayment}
        entry={selectedEntry}
        wallets={wallets}
        onClose={() => setShowPayment(false)}
        onSave={(amount, walletId) => {
          if (!selectedEntry) return
          makePayment(selectedEntry.id, amount, walletId)
          setShowPayment(false)
        }}
      />

      <SettleSheet
        open={showSettle}
        entry={selectedEntry}
        wallets={wallets}
        onClose={() => setShowSettle(false)}
        onConfirm={walletId => {
          if (!selectedEntry) return
          markSettled(selectedEntry.id, walletId)
          setShowSettle(false)
        }}
      />

      <DeleteSheet
        open={showDelete}
        entry={selectedEntry}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          if (!selectedEntry) return
          removeEntry(selectedEntry.id)
          setShowDelete(false)
          setSelectedEntry(null)
        }}
      />

      <LentTransactionLogSheet
        open={showLog}
        entry={selectedEntry}
        onClose={() => setShowLog(false)}
      />
    </div>
  )
}
