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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 400 }}
          />

          {/* Sheet */}
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
            {/* Drag pill */}
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '16px auto 0', flexShrink: 0 }} />

            {/* Header */}
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

            {/* Body — scrollable */}
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
                  {/* Vertical timeline line */}
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
                          {/* Timeline dot */}
                          <div style={{
                            width: 23, height: 23, borderRadius: '50%', flexShrink: 0,
                            background: `${meta.dot}20`,
                            border: `2px solid ${meta.dot}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 2, position: 'relative', zIndex: 1,
                          }}>
                            <div style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: meta.dot,
                            }} />
                          </div>

                          {/* Content */}
                          <div style={{
                            flex: 1, minWidth: 0,
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${meta.dot}18`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <p style={{
                                  fontSize: 13, fontWeight: 700, color: '#f5f7ff',
                                  marginBottom: 3,
                                }}>
                                  {meta.label}
                                </p>
                                <p style={{
                                  fontSize: 11, color: 'rgba(255,255,255,0.35)',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {formatLogDate(row.transaction_date)}
                                </p>
                              </div>
                              <p style={{
                                fontSize: 14, fontWeight: 800,
                                color: meta.amountColor,
                                fontVariantNumeric: 'tabular-nums',
                                flexShrink: 0,
                                letterSpacing: '-0.01em',
                              }}>
                                {meta.sign}{formatINR(row.amount)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Running balance summary at bottom */}
                  <div style={{
                    marginTop: 20,
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: entry.status === 'settled'
                      ? 'rgba(52,211,153,0.07)'
                      : 'rgba(20,184,166,0.07)',
                    border: entry.status === 'settled'
                      ? '1px solid rgba(52,211,153,0.2)'
                      : '1px solid rgba(20,184,166,0.2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>
                        {entry.status === 'settled' ? 'Fully Recovered' : 'Still to Recover'}
                      </p>
                      <p style={{
                        fontSize: 16, fontWeight: 900,
                        color: entry.status === 'settled' ? '#34D399' : '#14B8A6',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {formatINR(parseFloat((entry.amount - entry.paid_amount).toFixed(2)))}
                      </p>
                    </div>
                    <div style={{
                      padding: '5px 12px', borderRadius: 99,
                      background: entry.status === 'settled'
                        ? 'rgba(52,211,153,0.15)'
                        : entry.status === 'partial'
                        ? 'rgba(251,191,36,0.15)'
                        : 'rgba(20,184,166,0.15)',
                      border: entry.status === 'settled'
                        ? '1px solid rgba(52,211,153,0.3)'
                        : entry.status === 'partial'
                        ? '1px solid rgba(251,191,36,0.3)'
                        : '1px solid rgba(20,184,166,0.3)',
                    }}>
                      <p style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: entry.status === 'settled' ? '#34D399'
                          : entry.status === 'partial' ? '#FBBF24'
                          : '#14B8A6',
                      }}>
                        {entry.status === 'settled' ? 'Recovered' : entry.status}
                      </p>
                    </div>
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

// ─── Wallet picker ────────────────────────────────────────────────────────────
function WalletPicker({ open, wallets, title, onSelect, onClose }: {
  open: boolean; wallets: WalletEntry[]; title: string
  onSelect: (w: WalletEntry) => void; onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 600 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 601,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 20px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', marginBottom: 16 }}>{title}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wallets.map(w => (
                <motion.button key={w.id} whileTap={{ scale: 0.97 }} onClick={() => onSelect(w)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                    background: w.type === 'credit' ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)',
                    border: w.type === 'credit' ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(52,211,153,0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: w.type === 'credit' ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      {w.type === 'credit' ? '💳' : '👛'}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f7ff', marginBottom: 2 }}>{w.label}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                        {w.type === 'credit' ? 'Credit' : 'Cash'}
                      </p>
                    </div>
                  </div>
                  <p style={{
                    fontSize: 13, fontWeight: 800,
                    color: w.type === 'credit' ? '#F87171' : '#34D399',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatINR(w.balance)}
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Add Lent Sheet ───────────────────────────────────────────────────────────
function AddLentSheet({ open, wallets, defaultWalletId, onAdd, onClose, saving }: {
  open: boolean
  wallets: WalletEntry[]
  defaultWalletId: string | null
  onAdd: (person: string, description: string, amount: number, dueDate: string | null, walletId: string | null) => void
  onClose: () => void
  saving: boolean
}) {
  const [person,   setPerson]   = useState('')
  const [desc,     setDesc]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [dueDate,  setDueDate]  = useState('')
  const [walletId, setWalletId] = useState<string | null>(defaultWalletId)
  const [pickerOpen, setPickerOpen] = useState(false)

  const selectedWallet = wallets.find(w => w.id === walletId) ?? null

  useEffect(() => {
    if (open) {
      setPerson(''); setDesc(''); setAmount(''); setDueDate('')
      setWalletId(defaultWalletId)
    }
  }, [open, defaultWalletId])

  const handleSubmit = () => {
    if (!person.trim() || !amount.trim()) return
    const num = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(num) || num <= 0) return
    onAdd(person.trim(), desc.trim(), num, dueDate || null, walletId)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
    color: '#f5f7ff', fontSize: 15, padding: '13px 16px',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 500 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '92vh', overflowY: 'auto',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 24px' }} />
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 20 }}>Record a Lent</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Person</p>
                <input style={inputStyle} placeholder="Who did you lend to?" value={person} onChange={e => setPerson(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Amount (₹)</p>
                <input style={inputStyle} placeholder="0.00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Description (optional)</p>
                <input style={inputStyle} placeholder="What's this for?" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Expected Return Date (optional)</p>
                <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>

              {/* Wallet selector — DEDUCT from this wallet */}
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Deduct From (Wallet)</p>
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setPickerOpen(true)}
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    textAlign: 'left',
                  }}
                >
                  {selectedWallet ? (
                    <span style={{ fontSize: 14, color: '#f5f7ff', fontWeight: 600 }}>
                      {selectedWallet.label} — <span style={{ color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>{formatINR(selectedWallet.balance)}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Select wallet (optional)</span>
                  )}
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>▾</span>
                </motion.button>
                {selectedWallet && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 5, paddingLeft: 4 }}>
                    ₹{parseFloat(amount || '0').toLocaleString('en-IN')} will be deducted from this wallet
                  </p>
                )}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={saving || !person.trim() || !amount.trim()}
              style={{
                width: '100%', marginTop: 24, padding: '15px',
                borderRadius: 16, border: 'none', cursor: 'pointer',
                background: saving || !person.trim() || !amount.trim()
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg,#34D399,#059669)',
                color: saving || !person.trim() || !amount.trim() ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                fontSize: 15, fontWeight: 800,
                boxShadow: saving || !person.trim() || !amount.trim() ? 'none' : '0 4px 20px rgba(52,211,153,0.35)',
              }}
            >
              {saving ? 'Saving…' : 'Record Lent'}
            </motion.button>
          </motion.div>

          <WalletPicker
            open={pickerOpen}
            wallets={wallets}
            title="Deduct From Which Wallet?"
            onSelect={w => { setWalletId(w.id); setPickerOpen(false) }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Edit Lent Sheet ──────────────────────────────────────────────────────────
function EditLentSheet({ open, entry, onSave, onClose, saving }: {
  open: boolean
  entry: LentEntry | null
  onSave: (id: string, payload: EditLentPayload) => void
  onClose: () => void
  saving: boolean
}) {
  const [person,  setPerson]  = useState('')
  const [desc,    setDesc]    = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    if (entry) {
      setPerson(entry.person)
      setDesc(entry.description)
      setDueDate(entry.due_date ?? '')
    }
  }, [entry])

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
    color: '#f5f7ff', fontSize: 15, padding: '13px 16px',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 500 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 24px' }} />
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 20 }}>Edit Lent Entry</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Person</p>
                <input style={inputStyle} value={person} onChange={e => setPerson(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Description</p>
                <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Expected Return Date</p>
                <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onSave(entry.id, { person: person.trim(), description: desc.trim(), due_date: dueDate || null })}
              disabled={saving || !person.trim()}
              style={{
                width: '100%', marginTop: 24, padding: '15px', borderRadius: 16,
                border: '1px solid rgba(52,211,153,0.3)', cursor: 'pointer',
                background: 'rgba(52,211,153,0.12)',
                color: '#34D399', fontSize: 15, fontWeight: 800,
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Add More Sheet ───────────────────────────────────────────────────────────
function AddMoreSheet({ open, entry, wallets, defaultWalletId, onAdd, onClose, saving }: {
  open: boolean
  entry: LentEntry | null
  wallets: WalletEntry[]
  defaultWalletId: string | null
  onAdd: (amount: number, walletId: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [amount,   setAmount]   = useState('')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const selectedWallet = wallets.find(w => w.id === walletId) ?? null

  useEffect(() => {
    if (open) { setAmount(''); setWalletId(entry?.source_wallet_id ?? defaultWalletId) }
  }, [open, entry, defaultWalletId])

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
    color: '#f5f7ff', fontSize: 15, padding: '13px 16px',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 500 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 24px' }} />
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 4 }}>Lend More</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>to {entry.person}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Additional Amount (₹)</p>
                <input style={inputStyle} placeholder="0.00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Deduct From (Wallet)</p>
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setPickerOpen(true)}
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  {selectedWallet ? (
                    <span style={{ fontSize: 14, color: '#f5f7ff', fontWeight: 600 }}>
                      {selectedWallet.label} — <span style={{ color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>{formatINR(selectedWallet.balance)}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Select wallet</span>
                  )}
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>▾</span>
                </motion.button>
                {selectedWallet && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 5, paddingLeft: 4 }}>
                    ₹{parseFloat(amount || '0').toLocaleString('en-IN')} will be deducted from this wallet
                  </p>
                )}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { if (walletId) onAdd(parseFloat(amount), walletId) }}
              disabled={saving || !amount.trim() || !walletId}
              style={{
                width: '100%', marginTop: 24, padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: saving || !amount || !walletId ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#34D399,#059669)',
                color: saving || !amount || !walletId ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                fontSize: 15, fontWeight: 800,
              }}
            >
              {saving ? 'Saving…' : 'Lend More'}
            </motion.button>
          </motion.div>

          <WalletPicker
            open={pickerOpen} wallets={wallets} title="Deduct From Which Wallet?"
            onSelect={w => { setWalletId(w.id); setPickerOpen(false) }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Recovery Sheet (partial) ─────────────────────────────────────────────────
function RecoverySheet({ open, entry, wallets, defaultWalletId, onPay, onClose, saving }: {
  open: boolean
  entry: LentEntry | null
  wallets: WalletEntry[]
  defaultWalletId: string | null
  onPay: (amount: number, walletId: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [amount,   setAmount]   = useState('')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const selectedWallet = wallets.find(w => w.id === walletId) ?? null
  const remaining = entry ? parseFloat((entry.amount - entry.paid_amount).toFixed(2)) : 0

  useEffect(() => {
    if (open) { setAmount(''); setWalletId(entry?.source_wallet_id ?? defaultWalletId) }
  }, [open, entry, defaultWalletId])

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
    color: '#f5f7ff', fontSize: 15, padding: '13px 16px',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 500 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 24px' }} />
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 4 }}>Record Recovery</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>from {entry.person}</p>
            <p style={{ fontSize: 12, color: '#34D399', marginBottom: 20, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              Still to recover: {formatINR(remaining)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Amount Received (₹)</p>
                <input style={inputStyle} placeholder="0.00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Credit Into (Wallet)</p>
                <motion.button whileTap={{ scale: 0.98 }} onClick={() => setPickerOpen(true)}
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  {selectedWallet ? (
                    <span style={{ fontSize: 14, color: '#f5f7ff', fontWeight: 600 }}>
                      {selectedWallet.label} — <span style={{ color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>{formatINR(selectedWallet.balance)}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Select wallet</span>
                  )}
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>▾</span>
                </motion.button>
                {selectedWallet && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 5, paddingLeft: 4 }}>
                    ₹{parseFloat(amount || '0').toLocaleString('en-IN')} will be added to this wallet
                  </p>
                )}
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { if (walletId) onPay(parseFloat(amount), walletId) }}
              disabled={saving || !amount.trim() || !walletId}
              style={{
                width: '100%', marginTop: 24, padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: saving || !amount || !walletId ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#34D399,#059669)',
                color: saving || !amount || !walletId ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                fontSize: 15, fontWeight: 800,
              }}
            >
              {saving ? 'Saving…' : 'Record Recovery'}
            </motion.button>
          </motion.div>

          <WalletPicker
            open={pickerOpen} wallets={wallets} title="Credit Into Which Wallet?"
            onSelect={w => { setWalletId(w.id); setPickerOpen(false) }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Settled Sheet (full recovery) ───────────────────────────────────────────
function SettledSheet({ open, entry, wallets, defaultWalletId, onSettle, onClose, saving }: {
  open: boolean
  entry: LentEntry | null
  wallets: WalletEntry[]
  defaultWalletId: string | null
  onSettle: (walletId: string) => void
  onClose: () => void
  saving: boolean
}) {
  const [walletId, setWalletId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const selectedWallet = wallets.find(w => w.id === walletId) ?? null
  const remaining = entry ? parseFloat((entry.amount - entry.paid_amount).toFixed(2)) : 0

  useEffect(() => {
    if (open) setWalletId(entry?.source_wallet_id ?? defaultWalletId)
  }, [open, entry, defaultWalletId])

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 500 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 24px' }} />

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🎉</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 4 }}>Mark as Fully Recovered</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{entry.person} returned everything?</p>
              {remaining > 0 && (
                <p style={{ fontSize: 13, color: '#34D399', marginTop: 6, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {formatINR(remaining)} will be added to your wallet
                </p>
              )}
            </div>

            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 7, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Credit Into (Wallet)</p>
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => setPickerOpen(true)}
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                {selectedWallet ? (
                  <span style={{ fontSize: 14, color: '#f5f7ff', fontWeight: 600 }}>
                    {selectedWallet.label} — <span style={{ color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>{formatINR(selectedWallet.balance)}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Select wallet</span>
                )}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>▾</span>
              </motion.button>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { if (walletId) onSettle(walletId) }}
              disabled={saving || !walletId}
              style={{
                width: '100%', marginTop: 20, padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: saving || !walletId ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#34D399,#059669)',
                color: saving || !walletId ? 'rgba(255,255,255,0.3)' : '#0a0a0a',
                fontSize: 15, fontWeight: 800,
                boxShadow: saving || !walletId ? 'none' : '0 4px 20px rgba(52,211,153,0.35)',
              }}
            >
              {saving ? 'Saving…' : 'Confirm Full Recovery'}
            </motion.button>
          </motion.div>

          <WalletPicker
            open={pickerOpen} wallets={wallets} title="Credit Into Which Wallet?"
            onSelect={w => { setWalletId(w.id); setPickerOpen(false) }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Delete Confirm Sheet ─────────────────────────────────────────────────────
function DeleteConfirmSheet({ open, entry, onDelete, onClose, saving }: {
  open: boolean
  entry: LentEntry | null
  onDelete: () => void
  onClose: () => void
  saving: boolean
}) {
  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 500 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 501,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 24px' }} />
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🗑️</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 4 }}>Delete this entry?</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                Lent to {entry.person} — {formatINR(entry.amount)}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(248,113,113,0.7)', marginTop: 8 }}>
                This only removes the lent record. Wallet & transactions are unaffected.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onClose}
                style={{
                  flex: 1, padding: '14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >Cancel</motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={onDelete} disabled={saving}
                style={{
                  flex: 1, padding: '14px', borderRadius: 14, border: '1px solid rgba(248,113,113,0.3)',
                  background: 'rgba(248,113,113,0.12)', color: '#F87171', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >{saving ? 'Deleting…' : 'Delete'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Lent Card ────────────────────────────────────────────────────────────────
function LentCard({ entry, onEdit, onAddMore, onPartial, onSettle, onDelete, onViewLog }: {
  entry: LentEntry
  onEdit: () => void
  onAddMore: () => void
  onPartial: () => void
  onSettle: () => void
  onDelete: () => void
  onViewLog: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const dragControls = useDragControls()

  const remaining    = parseFloat((entry.amount - entry.paid_amount).toFixed(2))
  const progressPct  = entry.amount > 0 ? Math.min((entry.paid_amount / entry.amount) * 100, 100) : 0
  const isSettled    = entry.status === 'settled'
  const accent       = isSettled ? 'rgba(255,255,255,0.25)' : '#34D399'
  const accentFaded  = isSettled ? 'rgba(255,255,255,0.06)' : 'rgba(52,211,153,0.08)'
  const accentBorder = isSettled ? 'rgba(255,255,255,0.07)' : 'rgba(52,211,153,0.22)'

  return (
    <Reorder.Item value={entry} dragListener={false} dragControls={dragControls} as="div">
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -40, scale: 0.95 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          borderRadius: 22,
          background: accentFaded,
          border: `1px solid ${accentBorder}`,
          marginBottom: 10,
          overflow: 'hidden',
        }}
      >
        {/* Main row */}
        <div
          onClick={() => setExpanded(p => !p)}
          style={{ padding: '16px 16px 14px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* Drag handle */}
            <div
              onPointerDown={e => dragControls.start(e)}
              onClick={e => e.stopPropagation()}
              style={{
                cursor: 'grab', padding: '2px 4px', flexShrink: 0, marginTop: 2,
                color: 'rgba(255,255,255,0.18)', fontSize: 14, userSelect: 'none',
              }}
            >☰</div>

            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: isSettled ? 'rgba(255,255,255,0.06)' : 'rgba(52,211,153,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800,
              color: isSettled ? 'rgba(255,255,255,0.3)' : '#34D399',
            }}>
              {entry.person.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
                <p style={{
                  fontSize: 15, fontWeight: 700,
                  color: isSettled ? 'rgba(255,255,255,0.35)' : '#f5f7ff',
                  textDecoration: isSettled ? 'line-through' : 'none',
                }}>
                  {entry.person}
                </p>
                {/* Status badge */}
                <span style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: isSettled ? 'rgba(52,211,153,0.12)'
                    : entry.status === 'partial' ? 'rgba(251,191,36,0.12)'
                    : 'rgba(20,184,166,0.12)',
                  color: isSettled ? '#34D399'
                    : entry.status === 'partial' ? '#FBBF24'
                    : '#14B8A6',
                  border: isSettled ? '1px solid rgba(52,211,153,0.25)'
                    : entry.status === 'partial' ? '1px solid rgba(251,191,36,0.25)'
                    : '1px solid rgba(20,184,166,0.25)',
                }}>
                  {isSettled ? 'Recovered' : entry.status === 'partial' ? 'Partial' : 'Pending'}
                </span>
                {/* Due date badge */}
                {entry.due_date && !isSettled && (() => {
                  const dl = dueDateLabel(entry.due_date)
                  return (
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: `${dl.color}15`, color: dl.color,
                      border: `1px solid ${dl.color}35`,
                    }}>
                      {dl.text}
                    </span>
                  )
                })()}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
                {entry.description || 'No description'} · {entry.lent_by}
              </p>
            </div>

            {/* Amount */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{
                fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em',
                color: isSettled ? 'rgba(255,255,255,0.25)' : accent,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatINR(entry.amount)}
              </p>
              {!isSettled && entry.paid_amount > 0 && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(remaining)} left
                </p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!isSettled && entry.amount > 0 && (
            <div style={{ marginTop: 10, paddingLeft: 46 }}>
              <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', borderRadius: 99, background: '#34D399' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Expanded actions */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '0 14px 14px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: 12,
                display: 'flex', flexWrap: 'wrap', gap: 8,
              }}>
                {/* Log button */}
                <motion.button whileTap={{ scale: 0.96 }} onClick={onViewLog}
                  style={{
                    padding: '8px 13px', borderRadius: 11, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span style={{ fontSize: 13 }}>📋</span> Log
                </motion.button>

                {/* Edit */}
                <motion.button whileTap={{ scale: 0.96 }} onClick={onEdit}
                  style={{
                    padding: '8px 13px', borderRadius: 11, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
                  }}
                >✏️ Edit</motion.button>

                {!isSettled && (
                  <>
                    {/* Lend More */}
                    <motion.button whileTap={{ scale: 0.96 }} onClick={onAddMore}
                      style={{
                        padding: '8px 13px', borderRadius: 11, cursor: 'pointer',
                        background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                        color: '#34D399', fontSize: 12, fontWeight: 600,
                      }}
                    >+ Lend More</motion.button>

                    {/* Partial Recovery */}
                    <motion.button whileTap={{ scale: 0.96 }} onClick={onPartial}
                      style={{
                        padding: '8px 13px', borderRadius: 11, cursor: 'pointer',
                        background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                        color: '#FBBF24', fontSize: 12, fontWeight: 600,
                      }}
                    >💵 Partial</motion.button>

                    {/* Mark Recovered */}
                    <motion.button whileTap={{ scale: 0.96 }} onClick={onSettle}
                      style={{
                        padding: '8px 13px', borderRadius: 11, cursor: 'pointer',
                        background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)',
                        color: '#14B8A6', fontSize: 12, fontWeight: 700,
                      }}
                    >✓ Recovered</motion.button>
                  </>
                )}

                {/* Delete */}
                <motion.button whileTap={{ scale: 0.96 }} onClick={onDelete}
                  style={{
                    padding: '8px 13px', borderRadius: 11, cursor: 'pointer',
                    background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)',
                    color: '#F87171', fontSize: 12, fontWeight: 600,
                  }}
                >🗑️</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Reorder.Item>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function LentScreen() {
  const { activeUser } = useUser()
  const {
    entries, loading, error, saving,
    addLent, editLent, reorderEntries,
    addMoreAmount, makePayment, markSettled, removeEntry,
    totalToRecover, activeLenders, nearestDues,
  } = useLent()
  const { wallets } = useWallets()

  const defaultWalletId = wallets[0]?.id ?? null

  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('pending')

  // Sheet states
  const [addOpen,      setAddOpen]      = useState(false)
  const [editEntry,    setEditEntry]    = useState<LentEntry | null>(null)
  const [addMoreEntry, setAddMoreEntry] = useState<LentEntry | null>(null)
  const [partialEntry, setPartialEntry] = useState<LentEntry | null>(null)
  const [settleEntry,  setSettleEntry]  = useState<LentEntry | null>(null)
  const [deleteEntry,  setDeleteEntry]  = useState<LentEntry | null>(null)
  const [logEntry,     setLogEntry]     = useState<LentEntry | null>(null)

  const filtered = entries.filter(e =>
    filter === 'all'     ? true :
    filter === 'pending' ? e.status !== 'settled' :
    e.status === 'settled'
  )

  const pendingCount = entries.filter(e => e.status !== 'settled').length
  const settledCount = entries.filter(e => e.status === 'settled').length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px calc(env(safe-area-inset-bottom) + 100px)' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.6)', marginBottom: 4, fontWeight: 600 }}>
                {activeUser} · Others owe you
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f5f7ff', letterSpacing: '-0.02em', lineHeight: 1 }}>Lent</h1>
            </div>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setAddOpen(true)}
              style={{
                padding: '10px 18px', borderRadius: 14, cursor: 'pointer',
                background: 'linear-gradient(135deg,#34D399,#059669)',
                border: 'none', color: '#0a0a0a', fontSize: 14, fontWeight: 800,
                boxShadow: '0 4px 16px rgba(52,211,153,0.4)',
              }}
            >+ Add</motion.button>
          </div>

          {/* Summary card */}
          <div style={{
            position: 'relative', borderRadius: 22,
            background: 'rgba(52,211,153,0.07)',
            border: '1px solid rgba(52,211,153,0.2)',
            padding: '20px 20px 24px',
            marginBottom: 16, overflow: 'hidden',
          }}>
            <SummaryWaveCanvas />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.55)', marginBottom: 6, fontWeight: 600 }}>
                Total to Recover
              </p>
              <p style={{ fontSize: 34, fontWeight: 900, color: '#34D399', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {formatINR(totalToRecover)}
              </p>
              <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>People</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#f5f7ff' }}>
                    {activeLenders} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                      {activeLenders === 1 ? 'person' : 'people'}
                    </span>
                  </p>
                </div>
                {nearestDues.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Next Expected</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: (() => { const dl = dueDateLabel(nearestDues[0].due_date!); return dl.color })() }}>
                      {nearestDues[0].person} · {(() => { const dl = dueDateLabel(nearestDues[0].due_date!); return dl.text })()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['pending', 'settled', 'all'] as const).map(f => (
              <motion.button
                key={f} whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                style={{
                  padding: '7px 16px', borderRadius: 100, cursor: 'pointer',
                  border: filter === f ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(255,255,255,0.08)',
                  background: filter === f ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                  color: filter === f ? '#34D399' : 'rgba(255,255,255,0.4)',
                  fontSize: 13, fontWeight: filter === f ? 700 : 400,
                  transition: 'all 0.14s ease',
                }}
              >
                {f === 'pending' ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` :
                 f === 'settled' ? `Recovered${settledCount > 0 ? ` (${settledCount})` : ''}` : 'All'}
              </motion.button>
            ))}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 82, borderRadius: 22, background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.03) 50%,transparent 100%)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '52px 20px', borderRadius: 22, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p style={{ fontSize: 38, marginBottom: 12 }}>💚</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                {filter === 'pending' ? 'No pending lents' : filter === 'settled' ? 'Nothing recovered yet' : 'No lent entries'}
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
                Tap + to record money you lent out
              </p>
            </motion.div>
          )}

          {/* List */}
          {!loading && !error && filtered.length > 0 && (
            <Reorder.Group
              axis="y"
              values={filtered}
              onReorder={newOrder => {
                const otherEntries = entries.filter(e => !filtered.find(f => f.id === e.id))
                reorderEntries([...newOrder, ...otherEntries])
              }}
              as="div"
              style={{ listStyle: 'none', padding: 0, margin: 0 }}
            >
              <AnimatePresence initial={false}>
                {filtered.map(entry => (
                  <LentCard
                    key={entry.id}
                    entry={entry}
                    onEdit={()     => setEditEntry(entry)}
                    onAddMore={()  => setAddMoreEntry(entry)}
                    onPartial={()  => setPartialEntry(entry)}
                    onSettle={()   => setSettleEntry(entry)}
                    onDelete={()   => setDeleteEntry(entry)}
                    onViewLog={()  => setLogEntry(entry)}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}

        </motion.div>
      </div>

      {/* ── All Sheets ── */}
      <AddLentSheet
        open={addOpen}
        wallets={wallets}
        defaultWalletId={defaultWalletId}
        saving={saving}
        onAdd={(person, description, amount, dueDate, walletId) => {
          addLent({ person, description, lent_by: activeUser, amount, due_date: dueDate, source_wallet_id: walletId })
            .then(() => setAddOpen(false))
        }}
        onClose={() => setAddOpen(false)}
      />

      <EditLentSheet
        open={!!editEntry}
        entry={editEntry}
        saving={saving}
        onSave={(id, payload) => {
          editLent(id, payload).then(() => setEditEntry(null))
        }}
        onClose={() => setEditEntry(null)}
      />

      <AddMoreSheet
        open={!!addMoreEntry}
        entry={addMoreEntry}
        wallets={wallets}
        defaultWalletId={defaultWalletId}
        saving={saving}
        onAdd={(amount, walletId) => {
          if (addMoreEntry) addMoreAmount(addMoreEntry.id, amount, walletId).then(() => setAddMoreEntry(null))
        }}
        onClose={() => setAddMoreEntry(null)}
      />

      <RecoverySheet
        open={!!partialEntry}
        entry={partialEntry}
        wallets={wallets}
        defaultWalletId={defaultWalletId}
        saving={saving}
        onPay={(amount, walletId) => {
          if (partialEntry) makePayment(partialEntry.id, amount, walletId).then(() => setPartialEntry(null))
        }}
        onClose={() => setPartialEntry(null)}
      />

      <SettledSheet
        open={!!settleEntry}
        entry={settleEntry}
        wallets={wallets}
        defaultWalletId={defaultWalletId}
        saving={saving}
        onSettle={walletId => {
          if (settleEntry) markSettled(settleEntry.id, walletId).then(() => setSettleEntry(null))
        }}
        onClose={() => setSettleEntry(null)}
      />

      <DeleteConfirmSheet
        open={!!deleteEntry}
        entry={deleteEntry}
        saving={saving}
        onDelete={() => {
          if (deleteEntry) removeEntry(deleteEntry.id).then(() => setDeleteEntry(null))
        }}
        onClose={() => setDeleteEntry(null)}
      />

      <LentTransactionLogSheet
        open={!!logEntry}
        entry={logEntry}
        onClose={() => setLogEntry(null)}
      />
    </div>
  )
}
