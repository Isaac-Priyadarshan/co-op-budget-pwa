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
      g1.addColorStop(0, 'rgba(52,211,153,0.20)')
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
      g2.addColorStop(0, 'rgba(16,185,129,0.14)')
      g2.addColorStop(1, 'rgba(16,185,129,0.03)')
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
    if (desc.includes('more')) return { label: 'Lent more', dot: '#34D399', amountColor: '#34D399', sign: '-' }
    return { label: 'Lent', dot: '#34D399', amountColor: '#34D399', sign: '-' }
  }
  if (row.category === 'Recovery') {
    if (desc.includes('settled')) return { label: 'Settled', dot: '#FBBF24', amountColor: '#FBBF24', sign: '+' }
    return { label: 'Partial Recovery', dot: '#A3E635', amountColor: '#A3E635', sign: '+' }
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
              background: '#111113', borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '78vh', display: 'flex', flexDirection: 'column',
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
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#f5f7ff', lineHeight: 1 }}>{entry.person}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Transaction History</p>
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
                  {[1,2,3].map(i => <div key={i} style={{ height: 54, borderRadius: 14, background: 'rgba(255,255,255,0.04)' }} />)}
                </div>
              )}
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center', padding: '20px 0' }}>{err}</p>}
              {!loading && !err && rows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '36px 0' }}>
                  <p style={{ fontSize: 28, marginBottom: 10 }}>📭</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>No transactions found</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>Transactions appear here once you lend or recover</p>
                </div>
              )}
              {!loading && !err && rows.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 11, top: 12, bottom: 12, width: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {rows.map((row, idx) => {
                      const meta = logEventMeta(row)
                      const isLast = idx === rows.length - 1
                      return (
                        <motion.div key={row.id}
                          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.04 }}
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: isLast ? 0 : 16 }}
                        >
                          <div style={{
                            width: 23, height: 23, borderRadius: '50%', flexShrink: 0,
                            background: `${meta.dot}20`, border: `2px solid ${meta.dot}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 2, position: 'relative', zIndex: 1,
                          }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot }} />
                          </div>
                          <div style={{
                            flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 14,
                            background: 'rgba(255,255,255,0.04)', border: `1px solid ${meta.dot}18`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f7ff', marginBottom: 3 }}>{meta.label}</p>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {formatLogDate(row.transaction_date)}
                                </p>
                              </div>
                              <p style={{ fontSize: 14, fontWeight: 800, color: meta.amountColor, fontVariantNumeric: 'tabular-nums', flexShrink: 0, letterSpacing: '-0.01em' }}>
                                {meta.sign}{formatINR(row.amount)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                  <div style={{
                    marginTop: 20, padding: '12px 14px', borderRadius: 14,
                    background: entry.status === 'settled' ? 'rgba(52,211,153,0.07)' : 'rgba(52,211,153,0.07)',
                    border: entry.status === 'settled' ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>
                        {entry.status === 'settled' ? 'Fully Recovered' : 'Still Owed to You'}
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 900, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
                        {formatINR(parseFloat((entry.amount - entry.paid_amount).toFixed(2)))}
                      </p>
                    </div>
                    <div style={{
                      padding: '5px 12px', borderRadius: 99,
                      background: entry.status === 'settled' ? 'rgba(52,211,153,0.15)' : entry.status === 'partial' ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.15)',
                      border: entry.status === 'settled' ? '1px solid rgba(52,211,153,0.3)' : entry.status === 'partial' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(52,211,153,0.3)',
                    }}>
                      <p style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: entry.status === 'settled' ? '#34D399' : entry.status === 'partial' ? '#FBBF24' : '#34D399',
                      }}>
                        {entry.status}
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
                    border: w.type === 'credit' ? '1px solid rgba(248,113,113,0.22)' : '1px solid rgba(52,211,153,0.22)',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#f5f7ff' }}>{w.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: w.type === 'credit' ? '#F87171' : '#34D399', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(w.balance)}
                  </span>
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
function AddLentSheet({ open, wallets, onClose, onSave }: {
  open: boolean; wallets: WalletEntry[]; onClose: () => void
  onSave: (person: string, amount: number, walletId: string, dueDate: string, note: string) => Promise<void>
}) {
  const [person,           setPerson]           = useState('')
  const [amount,           setAmount]           = useState('')
  const [dueDate,          setDueDate]          = useState('')
  const [note,             setNote]             = useState('')
  const [selectedWallet,   setSelectedWallet]   = useState<WalletEntry | null>(null)
  const [walletPickerOpen, setWalletPickerOpen] = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [err,              setErr]              = useState('')

  const reset = () => { setPerson(''); setAmount(''); setDueDate(''); setNote(''); setSelectedWallet(null); setErr('') }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!person.trim())                     { setErr('Enter a name'); return }
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a valid amount'); return }
    if (!selectedWallet)                    { setErr('Select the wallet you are lending from'); return }
    setSaving(true); setErr('')
    try {
      await onSave(person.trim(), parseFloat(amount), selectedWallet.id, dueDate, note.trim())
      handleClose()
    } catch {
      setErr('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none', WebkitAppearance: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 100 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 28px)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 20px' }} />

            {/* Sheet header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(52,211,153,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', lineHeight: 1 }}>Add Lent Entry</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Money you are lending out</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Lent To */}
              <div>
                <label style={labelStyle}>Lent To</label>
                <input
                  value={person}
                  onChange={e => setPerson(e.target.value)}
                  placeholder="e.g. Ravi, Sister, Friend"
                  style={inputStyle}
                />
              </div>

              {/* Amount */}
              <div>
                <label style={labelStyle}>Amount (₹)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  style={{ ...inputStyle, fontSize: 22, fontWeight: 700 }}
                />
              </div>

              {/* Wallet picker */}
              <div>
                <label style={labelStyle}>Sent From (Wallet)</label>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setWalletPickerOpen(true)}
                  style={{
                    ...inputStyle,
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    color: selectedWallet ? '#f5f7ff' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <span>{selectedWallet ? selectedWallet.label : 'Select wallet…'}</span>
                  {selectedWallet && (
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(selectedWallet.balance)}
                    </span>
                  )}
                </motion.button>
              </div>

              {/* Due date */}
              <div>
                <label style={labelStyle}>Expected Return Date (optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Any memo…"
                  style={inputStyle}
                />
              </div>

              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.9), rgba(16,185,129,0.9))',
                  color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : '+ Add Lent Entry'}
              </motion.button>
            </div>
          </motion.div>

          <WalletPicker
            open={walletPickerOpen}
            wallets={wallets}
            title="Sent From Which Wallet?"
            onSelect={w => { setSelectedWallet(w); setWalletPickerOpen(false) }}
            onClose={() => setWalletPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────
function EditLentSheet({ open, entry, saving, onClose, onSave }: {
  open: boolean; entry: LentEntry | null; saving: boolean
  onClose: () => void
  onSave: (id: string, payload: EditLentPayload) => Promise<void>
}) {
  const [person,  setPerson]  = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note,    setNote]    = useState('')
  const [err,     setErr]     = useState('')

  useEffect(() => {
    if (entry) {
      setPerson(entry.person)
      setDueDate(entry.due_date ?? '')
      setNote(entry.description ?? '')
      setErr('')
    }
  }, [entry])

  const handleClose = () => { setErr(''); onClose() }

  const handleSave = async () => {
    if (!person.trim()) { setErr('Name cannot be empty'); return }
    setErr('')
    try {
      await onSave(entry!.id, { person: person.trim(), description: note.trim(), due_date: dueDate || null })
      handleClose()
    } catch { setErr('Failed to update. Try again.') }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none', WebkitAppearance: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 28px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', lineHeight: 1 }}>Edit Entry</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Amount & recoveries are locked</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Lent To</label>
                <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Person name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Expected Return Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
                {dueDate && (
                  <button onClick={() => setDueDate('')} style={{ marginTop: 6, fontSize: 11, color: '#F87171', background: 'none', border: 'none', cursor: 'pointer' }}>× Clear date</button>
                )}
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Any memo…" style={inputStyle} />
              </div>
              <div style={{ padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Total Lent</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>{entry ? formatINR(entry.amount) : ''}</span>
              </div>
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(79,70,229,0.9))', color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1 }}
              >{saving ? 'Saving…' : 'Save Changes'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Lend More Sheet ──────────────────────────────────────────────────────────
function LendMoreSheet({ open, entry, wallets, saving, onClose, onSave }: {
  open: boolean; entry: LentEntry | null; wallets: WalletEntry[]; saving: boolean
  onClose: () => void
  onSave: (id: string, amount: number, walletId: string) => Promise<void>
}) {
  const [amount,         setAmount]        = useState('')
  const [selectedWallet, setSelectedWallet] = useState<WalletEntry | null>(null)
  const [pickerOpen,     setPickerOpen]    = useState(false)
  const [err,            setErr]           = useState('')

  const reset = () => { setAmount(''); setSelectedWallet(null); setErr('') }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a valid amount'); return }
    if (!selectedWallet)                    { setErr('Select a wallet'); return }
    setErr('')
    try { await onSave(entry!.id, parseFloat(amount), selectedWallet.id); handleClose() }
    catch { setErr('Failed. Try again.') }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none', WebkitAppearance: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 28px)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '88vh', overflowY: 'auto',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 20px' }} />
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 4 }}>Lend More</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
              To <span style={{ color: '#34D399', fontWeight: 700 }}>{entry.person}</span>
              {entry.status === 'settled' && <span style={{ marginLeft: 8, fontSize: 11, color: '#FBBF24', fontWeight: 700 }}>· Will reopen as Pending</span>}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Extra Amount (₹)</label>
                <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sent From (Wallet)</label>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPickerOpen(true)}
                  style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: selectedWallet ? '#f5f7ff' : 'rgba(255,255,255,0.3)' }}
                >
                  <span>{selectedWallet ? selectedWallet.label : 'Select wallet…'}</span>
                  {selectedWallet && <span style={{ fontSize: 13, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>{formatINR(selectedWallet.balance)}</span>}
                </motion.button>
              </div>
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(52,211,153,0.9), rgba(16,185,129,0.9))', color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1 }}
              >{saving ? 'Saving…' : 'Lend More'}</motion.button>
            </div>
          </motion.div>
          <WalletPicker open={pickerOpen} wallets={wallets} title="Sent From Which Wallet?"
            onSelect={w => { setSelectedWallet(w); setPickerOpen(false) }}
            onClose={() => setPickerOpen(false)} />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Recovery / Settle Sheet ──────────────────────────────────────────────────
type PaymentMode = 'partial' | 'settle'

function RecoverySheet({ open, mode, entry, wallets, saving, onClose, onPartial, onSettle }: {
  open: boolean; mode: PaymentMode; entry: LentEntry | null
  wallets: WalletEntry[]; saving: boolean; onClose: () => void
  onPartial: (id: string, amount: number, walletId: string) => Promise<void>
  onSettle:  (id: string, walletId: string) => Promise<void>
}) {
  const [amount,         setAmount]        = useState('')
  const [selectedWallet, setSelectedWallet] = useState<WalletEntry | null>(null)
  const [pickerOpen,     setPickerOpen]    = useState(false)
  const [err,            setErr]           = useState('')

  const remaining = entry ? parseFloat((entry.amount - entry.paid_amount).toFixed(2)) : 0

  const reset = () => { setAmount(''); setSelectedWallet(null); setErr('') }
  const handleClose = () => { reset(); onClose() }

  const handleConfirm = async () => {
    if (!selectedWallet) { setErr('Select the wallet to receive into'); return }
    if (mode === 'partial') {
      const a = parseFloat(amount)
      if (!a || a <= 0)  { setErr('Enter a valid amount'); return }
      if (a > remaining) { setErr(`Max receivable: ${formatINR(remaining)}`); return }
      setErr('')
      try { await onPartial(entry!.id, a, selectedWallet.id); handleClose() }
      catch { setErr('Failed. Try again.') }
    } else {
      setErr('')
      try { await onSettle(entry!.id, selectedWallet.id); handleClose() }
      catch { setErr('Failed. Try again.') }
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none', WebkitAppearance: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 }} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
              background: '#111113', borderRadius: '24px 24px 0 0',
              padding: '24px 20px calc(env(safe-area-inset-bottom) + 28px)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '88vh', overflowY: 'auto',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)', margin: '0 auto 20px' }} />
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 4 }}>
              {mode === 'partial' ? 'Record Recovery' : 'Mark as Settled'}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
              {entry.person} — Outstanding: <span style={{ color: '#34D399', fontWeight: 700 }}>{formatINR(remaining)}</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'partial' && (
                <div>
                  <label style={labelStyle}>Amount Received (₹)</label>
                  <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
              )}
              {mode === 'settle' && (
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <p style={{ fontSize: 13, color: '#34D399', fontWeight: 600 }}>
                    Full remaining <strong>{formatINR(remaining)}</strong> will be added to the selected wallet.
                  </p>
                </div>
              )}
              <div>
                <label style={labelStyle}>Received Into (Wallet)</label>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPickerOpen(true)}
                  style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: selectedWallet ? '#f5f7ff' : 'rgba(255,255,255,0.3)' }}
                >
                  <span>{selectedWallet ? selectedWallet.label : 'Select wallet…'}</span>
                  {selectedWallet && <span style={{ fontSize: 13, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>{formatINR(selectedWallet.balance)}</span>}
                </motion.button>
              </div>
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirm} disabled={saving}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.9), rgba(16,185,129,0.9))',
                  color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1,
                }}
              >{saving ? 'Saving…' : mode === 'settle' ? '✓ Confirm Settled' : 'Record Recovery'}</motion.button>
            </div>
          </motion.div>
          <WalletPicker open={pickerOpen} wallets={wallets} title="Received Into Which Wallet?"
            onSelect={w => { setSelectedWallet(w); setPickerOpen(false) }}
            onClose={() => setPickerOpen(false)} />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: LentStatus }) {
  const map: Record<LentStatus, { label: string; bg: string; color: string; border: string }> = {
    pending: { label: 'PENDING', bg: 'rgba(52,211,153,0.12)',  color: '#34D399', border: 'rgba(52,211,153,0.28)' },
    partial: { label: 'PARTIAL', bg: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: 'rgba(251,191,36,0.28)' },
    settled: { label: 'SETTLED', bg: 'rgba(148,163,184,0.12)',color: '#94A3B8', border: 'rgba(148,163,184,0.28)' },
  }
  const s = map[status]
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 99, padding: '2px 8px',
    }}>{s.label}</span>
  )
}

// ─── Drag handle ──────────────────────────────────────────────────────────────
function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <div
      onPointerDown={e => { e.preventDefault(); controls.start(e) }}
      style={{
        width: 28, height: 28, flexShrink: 0, borderRadius: 8,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'grab', touchAction: 'none',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="4" y1="7"  x2="20" y2="7"  />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
      </svg>
    </div>
  )
}

// ─── Lent Card ────────────────────────────────────────────────────────────────
function LentCard({
  entry, expanded, reorderMode, onToggle, onEdit, onLog, onLendMore, onPartial, onSettle,
}: {
  entry: LentEntry
  expanded: boolean
  reorderMode: boolean
  onToggle: () => void
  onEdit: () => void
  onLog: () => void
  onLendMore: () => void
  onPartial: () => void
  onSettle: () => void
}) {
  const dragControls  = useDragControls()
  const remaining     = parseFloat((entry.amount - entry.paid_amount).toFixed(2))
  const paidPct       = entry.amount > 0 ? Math.min(100, (entry.paid_amount / entry.amount) * 100) : 0
  const isSettled     = entry.status === 'settled'
  const due           = entry.due_date ? dueDateLabel(entry.due_date) : null
  const actionsDisabled = isSettled && remaining <= 0

  const disabledBtnStyle: React.CSSProperties = {
    flex: 1, padding: '10px 0', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12, fontWeight: 700, cursor: 'not-allowed', opacity: 0.5,
  }

  const cardContent = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 18,
        background: isSettled ? 'rgba(148,163,184,0.04)' : 'rgba(52,211,153,0.05)',
        border: isSettled ? '1px solid rgba(148,163,184,0.14)' : '1px solid rgba(52,211,153,0.18)',
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div onClick={reorderMode ? undefined : onToggle}
        style={{ padding: '14px 14px 10px', cursor: reorderMode ? 'default' : 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AnimatePresence initial={false}>
            {reorderMode && (
              <motion.div key="handle" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}>
                <DragHandle controls={dragControls} />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {entry.person}
              </p>
              <StatusBadge status={entry.status} />
            </div>
            {entry.description ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {entry.description}
              </p>
            ) : null}
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: isSettled ? '#94A3B8' : '#34D399', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {formatINR(entry.amount)}
            </p>
            {!isSettled && entry.paid_amount > 0 && (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                {formatINR(remaining)} left
              </p>
            )}
          </div>

          {!reorderMode && (
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0, marginLeft: 2 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${paidPct}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', borderRadius: 99, background: isSettled ? '#94A3B8' : '#34D399' }}
            />
          </div>
          {due && !isSettled && (
            <span style={{ fontSize: 10, fontWeight: 700, color: due.color, flexShrink: 0 }}>{due.text}</span>
          )}
        </div>
      </div>

      {/* Expanded actions */}
      <AnimatePresence initial={false}>
        {expanded && !reorderMode && (
          <motion.div
            key="actions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 12px 14px', display: 'flex', gap: 7, alignItems: 'stretch' }}>

              {/* Edit */}
              <motion.button whileTap={{ scale: 0.9 }} onClick={e => { e.stopPropagation(); onEdit() }}
                aria-label="Edit" title="Edit"
                style={{ width: 36, flexShrink: 0, borderRadius: 11, border: '1px solid rgba(99,102,241,0.32)', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </motion.button>

              {/* Log */}
              <motion.button whileTap={{ scale: 0.9 }} onClick={e => { e.stopPropagation(); onLog() }}
                aria-label="Transaction log" title="Transaction Log"
                style={{ width: 36, flexShrink: 0, borderRadius: 11, border: '1px solid rgba(56,189,248,0.32)', background: 'rgba(56,189,248,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="9" y1="7"  x2="15" y2="7"  />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="17" x2="13" y2="17" />
                </svg>
              </motion.button>

              {/* Lend more */}
              <motion.button whileTap={{ scale: 0.93 }} onClick={e => { e.stopPropagation(); onLendMore() }}
                aria-label="Lend more" title="Lend more"
                style={{ width: 36, flexShrink: 0, borderRadius: 11, border: '1px solid rgba(52,211,153,0.38)', background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </motion.button>

              {/* Partial recovery */}
              {actionsDisabled ? (
                <button disabled style={disabledBtnStyle}>Recovery</button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={e => { e.stopPropagation(); onPartial() }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: '1px solid rgba(251,191,36,0.32)', background: 'rgba(251,191,36,0.1)', color: '#FBBF24', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >Recovery</motion.button>
              )}

              {/* Mark settled */}
              {actionsDisabled ? (
                <button disabled style={disabledBtnStyle}>Settled</button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={e => { e.stopPropagation(); onSettle() }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: '1px solid rgba(52,211,153,0.32)', background: 'rgba(52,211,153,0.1)', color: '#34D399', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >Settled</motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  if (reorderMode) {
    return (
      <Reorder.Item
        key={entry.id}
        value={entry}
        dragControls={dragControls}
        dragListener={false}
        style={{ listStyle: 'none' }}
      >
        {cardContent}
      </Reorder.Item>
    )
  }

  return cardContent
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
type FilterMode = 'all' | 'pending' | 'settled'

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick}
      style={{
        height: 29, paddingInline: 13, borderRadius: 99, cursor: 'pointer',
        background: active ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.07)',
        color: active ? '#34D399' : 'rgba(255,255,255,0.45)',
        fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
        border: active ? '1px solid rgba(52,211,153,0.38)' : '1px solid rgba(255,255,255,0.1)',
        transition: 'all 0.18s ease',
      }}
    >{label}</motion.button>
  )
}

const STATUS_PRIORITY: Record<LentStatus, number> = {
  pending: 0,
  partial: 1,
  settled: 2,
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LentScreen() {
  const { activeUser } = useUser()
  const {
    entries, loading, error, saving,
    addLent, editLent, reorderEntries,
    addMoreAmount, makePayment, markSettled,
    totalToRecover, activeLenders, nearestDues,
  } = useLent()
  const { wallets } = useWallets()

  const [addOpen,       setAddOpen]       = useState(false)
  const [filter,        setFilter]        = useState<FilterMode>('all')
  const [expandedId,    setExpandedId]    = useState<string | null>(null)
  const [reorderMode,   setReorderMode]   = useState(false)
  const [editEntry,     setEditEntry]     = useState<LentEntry | null>(null)
  const [recoveryEntry, setRecoveryEntry] = useState<LentEntry | null>(null)
  const [recoveryMode,  setRecoveryMode]  = useState<'partial' | 'settle'>('partial')
  const [lendMoreEntry, setLendMoreEntry] = useState<LentEntry | null>(null)
  const [logEntry,      setLogEntry]      = useState<LentEntry | null>(null)

  const handleAdd = async (person: string, amount: number, walletId: string, dueDate: string, note: string) => {
    await addLent({
      person,
      description: note,
      lent_by: activeUser!,
      amount,
      due_date: dueDate || null,
      source_wallet_id: walletId,
    })
  }

  const filtered = (() => {
    const base = entries.filter(e => {
      if (filter === 'pending') return e.status !== 'settled'
      if (filter === 'settled') return e.status === 'settled'
      return true
    })
    if (filter === 'all') {
      return [...base].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])
    }
    return base
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Sticky top ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '20px 20px 0',
        background: 'linear-gradient(to bottom, #000000 80%, transparent 100%)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>

        {/* ── Summary Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: 14,
            background: 'linear-gradient(160deg,#00100a 0%,#040706 58%,#060a08 100%)',
            border: '1px solid rgba(52,211,153,0.24)',
            boxShadow: '0 0 0 1px rgba(52,211,153,0.05), 0 8px 40px rgba(0,0,0,0.7), 0 2px 0 rgba(52,211,153,0.08) inset',
            minHeight: 130,
          }}
        >
          <SummaryWaveCanvas />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(52,211,153,0.55),transparent)' }} />

          <div style={{ position: 'relative', zIndex: 2, padding: '18px 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.65)', marginBottom: 5 }}>Total Owed to You</p>
                <p style={{
                  fontSize: 28, fontWeight: 900, color: '#34D399',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  textShadow: '0 0 18px rgba(52,211,153,0.45)',
                }}>
                  {formatINR(totalToRecover)}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 99,
                  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.22)',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>{activeLenders}</span>
                  <span style={{ fontSize: 10, color: 'rgba(52,211,153,0.6)', fontWeight: 600 }}>
                    {activeLenders === 1 ? 'person' : 'people'}
                  </span>
                </div>
              </div>
            </div>

            {nearestDues.length > 0 && (
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Expected Returns</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflowX: 'auto' }}>
                  {nearestDues.map(e => {
                    const lbl = dueDateLabel(e.due_date!)
                    return (
                      <div key={e.id} style={{
                        display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                        padding: '4px 10px', borderRadius: 99,
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${lbl.color}33`,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#f5f7ff', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.person}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: lbl.color, flexShrink: 0 }}>{lbl.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Toolbar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>

          {/* Add button */}
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAddOpen(true)}
            aria-label="Add lent entry"
            style={{
              width: 29, height: 29, borderRadius: 99, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(16,185,129,0.16))',
              border: '1px solid rgba(52,211,153,0.38)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>

          {!reorderMode && (
            <>
              <FilterPill label="All"     active={filter === 'all'}     onClick={() => setFilter('all')} />
              <FilterPill label="Pending" active={filter === 'pending'} onClick={() => setFilter('pending')} />
              <FilterPill label="Settled" active={filter === 'settled'} onClick={() => setFilter('settled')} />
            </>
          )}

          <motion.button whileTap={{ scale: 0.92 }}
            onClick={() => { setReorderMode(r => !r); setExpandedId(null) }}
            style={{
              marginLeft: 'auto', height: 29, paddingInline: 12, borderRadius: 99, cursor: 'pointer',
              background: reorderMode ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.07)',
              color: reorderMode ? '#34D399' : 'rgba(255,255,255,0.45)',
              fontSize: 12, fontWeight: 700,
              border: reorderMode ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.18s ease', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {reorderMode ? (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Done</>
            ) : (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>Reorder</>
            )}
          </motion.button>
        </div>

        <AnimatePresence>
          {reorderMode && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', paddingBottom: 8, overflow: 'hidden' }}
            >
              Hold ☰ and drag to reorder · Tap Done when finished
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Scrollable list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px calc(env(safe-area-inset-bottom) + 96px)' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 18, background: 'rgba(255,255,255,0.04)' }} />)}
          </div>
        )}

        {error && (
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(52,211,153,0.2)' }}
          >
            <p style={{ fontSize: 28, marginBottom: 12 }}>💸</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>No lent entries</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Tap + to record money you lent to someone</p>
          </motion.div>
        )}

        {reorderMode ? (
          <Reorder.Group
            axis="y"
            values={filtered}
            onReorder={reorderEntries}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0 }}
          >
            {filtered.map(entry => (
              <LentCard key={entry.id} entry={entry} expanded={false} reorderMode={true}
                onToggle={() => {}}
                onEdit={() => setEditEntry(entry)}
                onLog={() => setLogEntry(entry)}
                onLendMore={() => setLendMoreEntry(entry)}
                onPartial={() => { setRecoveryEntry(entry); setRecoveryMode('partial') }}
                onSettle={()  => { setRecoveryEntry(entry); setRecoveryMode('settle')  }}
              />
            ))}
          </Reorder.Group>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence initial={false}>
              {filtered.map(entry => (
                <LentCard key={entry.id} entry={entry}
                  expanded={expandedId === entry.id}
                  reorderMode={false}
                  onToggle={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
                  onEdit={() => setEditEntry(entry)}
                  onLog={() => setLogEntry(entry)}
                  onLendMore={() => setLendMoreEntry(entry)}
                  onPartial={() => { setRecoveryEntry(entry); setRecoveryMode('partial') }}
                  onSettle={()  => { setRecoveryEntry(entry); setRecoveryMode('settle')  }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Sheets ── */}
      <AddLentSheet open={addOpen} wallets={wallets} onClose={() => setAddOpen(false)} onSave={handleAdd} />

      <EditLentSheet
        open={editEntry !== null}
        entry={editEntry}
        saving={saving}
        onClose={() => setEditEntry(null)}
        onSave={editLent}
      />

      <LendMoreSheet
        open={lendMoreEntry !== null}
        entry={lendMoreEntry}
        wallets={wallets}
        saving={saving}
        onClose={() => setLendMoreEntry(null)}
        onSave={addMoreAmount}
      />

      <RecoverySheet
        open={recoveryEntry !== null}
        mode={recoveryMode}
        entry={recoveryEntry}
        wallets={wallets}
        saving={saving}
        onClose={() => setRecoveryEntry(null)}
        onPartial={makePayment}
        onSettle={markSettled}
      />

      <LentTransactionLogSheet
        open={logEntry !== null}
        entry={logEntry}
        onClose={() => setLogEntry(null)}
      />
    </div>
  )
}
