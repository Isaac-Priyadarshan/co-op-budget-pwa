import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBorrowed } from '../../hooks/useBorrowed'
import { useWallets } from '../../hooks/useWallets'
import { useUser } from '../../context/UserContext'
import { formatINR } from '../../utils/format'
import type { BorrowedEntry, BorrowedStatus } from '../../hooks/useBorrowed'
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
      g1.addColorStop(0, 'rgba(251,146,60,0.20)')
      g1.addColorStop(1, 'rgba(251,146,60,0.04)')
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
      g2.addColorStop(0, 'rgba(234,179,8,0.14)')
      g2.addColorStop(1, 'rgba(234,179,8,0.03)')
      ctx.fillStyle = g2; ctx.fill()
      ctx.beginPath()
      for (let x = 0; x <= W; x += 2) {
        const y = H * 0.52
          + Math.sin((x / W) * Math.PI * 2.4 + t * 0.6) * H * 0.14
          + Math.sin((x / W) * Math.PI * 1.1 + t * 0.35) * H * 0.07
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(251,146,60,0.30)'; ctx.lineWidth = 1.2; ctx.stroke()
      t += 0.012
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas ref={canvasRef} width={600} height={112}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: '100%', borderRadius: 22, pointerEvents: 'none' }}
    />
  )
}

// ─── Days away helper ─────────────────────────────────────────────────────────
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
  return       { text: `In ${d} days`,                   color: '#34D399' }
}

// ─── Wallet picker sheet ──────────────────────────────────────────────────────
function WalletPicker({
  open, wallets, title, onSelect, onClose,
}: {
  open: boolean
  wallets: WalletEntry[]
  title: string
  onSelect: (w: WalletEntry) => void
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
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
                    padding: '14px 16px', borderRadius: 16,
                    background: w.type === 'credit' ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)',
                    border: w.type === 'credit' ? '1px solid rgba(248,113,113,0.22)' : '1px solid rgba(52,211,153,0.22)',
                    cursor: 'pointer',
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

// ─── Add Borrowed Sheet ───────────────────────────────────────────────────────
function AddBorrowedSheet({
  open, wallets, onClose, onSave,
}: {
  open: boolean
  wallets: WalletEntry[]
  onClose: () => void
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

  const reset = () => {
    setPerson(''); setAmount(''); setDueDate(''); setNote('')
    setSelectedWallet(null); setErr('')
  }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!person.trim())                     { setErr('Enter a name'); return }
    if (!amount || parseFloat(amount) <= 0) { setErr('Enter a valid amount'); return }
    if (!selectedWallet)                    { setErr('Select a source account'); return }
    setSaving(true); setErr('')
    try {
      await onSave(person.trim(), parseFloat(amount), selectedWallet.id, dueDate, note.trim())
      handleClose()
    } catch { setErr('Failed to save. Try again.') }
    finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none',
    WebkitAppearance: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
    marginBottom: 6, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 100 }}
          />
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
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 24 }}>Add Borrowed Entry</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Borrowed From</label>
                <input value={person} onChange={e => setPerson(e.target.value)}
                  placeholder="e.g. Mani, SBI, Friend" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Amount (₹)</label>
                <input type="number" inputMode="decimal" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Received Into (Wallet)</label>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setWalletPickerOpen(true)}
                  style={{
                    ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    color: selectedWallet ? '#f5f7ff' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <span>{selectedWallet ? selectedWallet.label : 'Select account…'}</span>
                  {selectedWallet && (
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
                      {formatINR(selectedWallet.balance)}
                    </span>
                  )}
                </motion.button>
              </div>
              <div>
                <label style={labelStyle}>Due Date (optional)</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={labelStyle}>Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Any memo…" style={inputStyle} />
              </div>
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(251,146,60,0.9), rgba(234,88,12,0.9))',
                  color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Add Entry'}
              </motion.button>
            </div>
          </motion.div>

          <WalletPicker
            open={walletPickerOpen} wallets={wallets} title="Received Into Which Wallet?"
            onSelect={w => { setSelectedWallet(w); setWalletPickerOpen(false) }}
            onClose={() => setWalletPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Add More Amount Sheet ────────────────────────────────────────────────────
function AddMoreSheet({
  open, entry, wallets, saving, onClose, onSave,
}: {
  open: boolean
  entry: BorrowedEntry | null
  wallets: WalletEntry[]
  saving: boolean
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
    if (!selectedWallet)                    { setErr('Select a wallet to receive into'); return }
    setErr('')
    try {
      await onSave(entry!.id, parseFloat(amount), selectedWallet.id)
      handleClose()
    } catch { setErr('Failed. Try again.') }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none',
    WebkitAppearance: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
    marginBottom: 6, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 }}
          />
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
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 4 }}>Borrow More</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
              From <span style={{ color: '#FB923C', fontWeight: 700 }}>{entry.person}</span>
              {entry.status === 'settled' && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#FBBF24', fontWeight: 700 }}>· Will reopen as Pending</span>
              )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Extra Amount (₹)</label>
                <input type="number" inputMode="decimal" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Received Into (Wallet)</label>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPickerOpen(true)}
                  style={{
                    ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
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
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(251,146,60,0.9), rgba(234,88,12,0.9))',
                  color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Add Amount'}
              </motion.button>
            </div>
          </motion.div>

          <WalletPicker
            open={pickerOpen} wallets={wallets} title="Received Into Which Wallet?"
            onSelect={w => { setSelectedWallet(w); setPickerOpen(false) }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Payment / Settle Sheet ───────────────────────────────────────────────────
type PaymentMode = 'partial' | 'settle'

function PaymentSheet({
  open, mode, entry, wallets, saving, onClose, onPartial, onSettle,
}: {
  open: boolean
  mode: PaymentMode
  entry: BorrowedEntry | null
  wallets: WalletEntry[]
  saving: boolean
  onClose: () => void
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
    if (!selectedWallet) { setErr('Select the account to pay from'); return }
    if (mode === 'partial') {
      const a = parseFloat(amount)
      if (!a || a <= 0)  { setErr('Enter a valid amount'); return }
      if (a > remaining) { setErr(`Max payable: ${formatINR(remaining)}`); return }
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
    color: '#f5f7ff', fontSize: 15, fontWeight: 500, outline: 'none',
    WebkitAppearance: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
    marginBottom: 6, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && entry && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200 }}
          />
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
            <p style={{ fontSize: 17, fontWeight: 800, color: '#f5f7ff', marginBottom: 4 }}>
              {mode === 'partial' ? 'Partial Payment' : 'Mark as Settled'}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
              {entry.person} — Remaining: <span style={{ color: '#F87171', fontWeight: 700 }}>{formatINR(remaining)}</span>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'partial' && (
                <div>
                  <label style={labelStyle}>Payment Amount (₹)</label>
                  <input type="number" inputMode="decimal" value={amount}
                    onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} />
                </div>
              )}
              {mode === 'settle' && (
                <div style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                }}>
                  <p style={{ fontSize: 13, color: '#34D399', fontWeight: 600 }}>
                    Full remaining amount <strong>{formatINR(remaining)}</strong> will be deducted from the selected wallet.
                  </p>
                </div>
              )}
              <div>
                <label style={labelStyle}>Pay From (Wallet)</label>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPickerOpen(true)}
                  style={{
                    ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
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
              {err && <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>{err}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirm} disabled={saving}
                style={{
                  width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: mode === 'settle'
                    ? 'linear-gradient(135deg, rgba(52,211,153,0.9), rgba(16,185,129,0.9))'
                    : 'linear-gradient(135deg, rgba(251,146,60,0.9), rgba(234,88,12,0.9))',
                  color: '#fff', fontSize: 15, fontWeight: 800, opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : mode === 'settle' ? '✓ Confirm Settled' : 'Record Payment'}
              </motion.button>
            </div>
          </motion.div>

          <WalletPicker
            open={pickerOpen} wallets={wallets} title="Pay From Which Wallet?"
            onSelect={w => { setSelectedWallet(w); setPickerOpen(false) }}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: BorrowedStatus }) {
  const map: Record<BorrowedStatus, { label: string; bg: string; color: string; border: string }> = {
    pending: { label: 'PENDING', bg: 'rgba(251,146,60,0.12)',  color: '#FB923C', border: 'rgba(251,146,60,0.28)' },
    partial: { label: 'PARTIAL', bg: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: 'rgba(251,191,36,0.28)' },
    settled: { label: 'SETTLED', bg: 'rgba(52,211,153,0.12)', color: '#34D399', border: 'rgba(52,211,153,0.28)' },
  }
  const s = map[status]
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 99, padding: '2px 8px',
    }}>
      {s.label}
    </span>
  )
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function BorrowedCard({
  entry, expanded, onToggle, onAddMore, onPartial, onSettle,
}: {
  entry: BorrowedEntry
  expanded: boolean
  onToggle: () => void
  onAddMore: () => void
  onPartial: () => void
  onSettle: () => void
}) {
  const remaining  = parseFloat((entry.amount - entry.paid_amount).toFixed(2))
  const paidPct    = entry.amount > 0 ? Math.min(100, (entry.paid_amount / entry.amount) * 100) : 0
  const isSettled  = entry.status === 'settled'
  const due        = entry.due_date ? dueDateLabel(entry.due_date) : null
  // Partial payment and settle are disabled only when remaining is 0 (i.e. fully settled with no new debt)
  const actionsDisabled = isSettled && remaining <= 0

  const disabledBtnStyle: React.CSSProperties = {
    flex: 1, padding: '11px 0', borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.2)',
    fontSize: 13, fontWeight: 700, cursor: 'not-allowed', opacity: 0.5,
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 18,
        background: isSettled ? 'rgba(52,211,153,0.04)' : 'rgba(251,146,60,0.05)',
        border: isSettled ? '1px solid rgba(52,211,153,0.14)' : '1px solid rgba(251,146,60,0.18)',
        overflow: 'hidden',
      }}
    >
      {/* ── Card header row (always visible, tappable to expand) ── */}
      <div onClick={onToggle} style={{ padding: '15px 16px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: isSettled ? 'rgba(52,211,153,0.15)' : 'rgba(251,146,60,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: isSettled ? '#34D399' : '#FB923C',
          }}>
            {entry.person.charAt(0).toUpperCase()}
          </div>

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
            <p style={{ fontSize: 15, fontWeight: 800, color: isSettled ? '#34D399' : '#FB923C', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {formatINR(entry.amount)}
            </p>
            {!isSettled && entry.paid_amount > 0 && (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                {formatINR(remaining)} left
              </p>
            )}
          </div>

          <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0, marginLeft: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </motion.div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${paidPct}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', borderRadius: 99, background: isSettled ? '#34D399' : '#FB923C' }}
            />
          </div>
          {due && !isSettled && (
            <span style={{ fontSize: 10, fontWeight: 700, color: due.color, flexShrink: 0 }}>{due.text}</span>
          )}
        </div>
      </div>

      {/* ── Expanded actions — shown for ALL cards (settled and active) ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="actions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8, alignItems: 'stretch' }}>

              {/* ── [ + ] Add More button — always enabled ── */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={e => { e.stopPropagation(); onAddMore() }}
                style={{
                  width: 40, flexShrink: 0, borderRadius: 14,
                  border: '1px solid rgba(251,146,60,0.38)',
                  background: 'rgba(251,146,60,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </motion.button>

              {/* ── Partial Payment ── disabled if no remaining amount ── */}
              {actionsDisabled ? (
                <button disabled style={disabledBtnStyle}>Partial Payment</button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={e => { e.stopPropagation(); onPartial() }}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 14,
                    border: '1px solid rgba(251,191,36,0.32)',
                    background: 'rgba(251,191,36,0.1)', color: '#FBBF24',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Partial Payment
                </motion.button>
              )}

              {/* ── Mark Settled ── disabled if already settled and no remaining ── */}
              {actionsDisabled ? (
                <button disabled style={disabledBtnStyle}>Mark Settled</button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }}
                  onClick={e => { e.stopPropagation(); onSettle() }}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 14,
                    border: '1px solid rgba(52,211,153,0.32)',
                    background: 'rgba(52,211,153,0.1)', color: '#34D399',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Mark Settled
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
type FilterMode = 'all' | 'pending' | 'settled'

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick}
      style={{
        height: 30, paddingInline: 14, borderRadius: 99, cursor: 'pointer',
        background: active ? 'rgba(251,146,60,0.22)' : 'rgba(255,255,255,0.07)',
        color: active ? '#FB923C' : 'rgba(255,255,255,0.45)',
        fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
        border: active ? '1px solid rgba(251,146,60,0.38)' : '1px solid rgba(255,255,255,0.1)',
        transition: 'all 0.18s ease',
      }}
    >
      {label}
    </motion.button>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function BorrowedScreen() {
  const { activeUser } = useUser()
  const {
    entries, loading, error, saving,
    addBorrowed, addMoreAmount, makePayment, markSettled,
    totalOwed, nearestDue,
  } = useBorrowed()
  const { wallets } = useWallets()

  const [addOpen,       setAddOpen]       = useState(false)
  const [filter,        setFilter]        = useState<FilterMode>('all')
  const [expandedId,    setExpandedId]    = useState<string | null>(null)
  const [paymentEntry,  setPaymentEntry]  = useState<BorrowedEntry | null>(null)
  const [paymentMode,   setPaymentMode]   = useState<'partial' | 'settle'>('partial')
  const [addMoreEntry,  setAddMoreEntry]  = useState<BorrowedEntry | null>(null)

  const handleAdd = async (person: string, amount: number, walletId: string, dueDate: string, note: string) => {
    await addBorrowed({
      person,
      description: note,
      borrowed_by: activeUser!,
      amount,
      due_date: dueDate || null,
      source_wallet_id: walletId,
    })
  }

  const filtered = entries.filter(e => {
    if (filter === 'pending') return e.status !== 'settled'
    if (filter === 'settled') return e.status === 'settled'
    return true
  })

  const dueLabel = nearestDue?.due_date ? dueDateLabel(nearestDue.due_date) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Sticky top ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '20px 20px 0',
        background: 'linear-gradient(to bottom, #000000 80%, transparent 100%)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: 14,
            background: 'linear-gradient(160deg,#0d0800 0%,#040607 58%,#060a08 100%)',
            border: '1px solid rgba(251,146,60,0.24)',
            boxShadow: '0 0 0 1px rgba(251,146,60,0.05), 0 8px 40px rgba(0,0,0,0.7), 0 2px 0 rgba(251,146,60,0.08) inset',
            minHeight: 112,
          }}
        >
          <SummaryWaveCanvas />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(251,146,60,0.55),transparent)' }} />

          <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '22px 20px 24px', gap: 12 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(251,146,60,0.65)', marginBottom: 6 }}>Total Owed</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#FB923C', fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: '0 0 18px rgba(251,146,60,0.45)' }}>
                {formatINR(totalOwed)}
              </p>
            </div>
            {nearestDue && dueLabel && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>Next Due</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f5f7ff', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
                  {nearestDue.person}
                </p>
                <p style={{ fontSize: 12, fontWeight: 800, color: dueLabel.color, fontVariantNumeric: 'tabular-nums' }}>
                  {dueLabel.text}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Filter + icon-only Add button bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>

          {/* ── Icon-only + button (no text) ── */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setAddOpen(true)}
            aria-label="Add borrowed entry"
            style={{
              width: 32, height: 32, borderRadius: 99, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(251,146,60,0.22), rgba(234,88,12,0.16))',
              border: '1px solid rgba(251,146,60,0.38)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>

          <FilterPill label="All"     active={filter === 'all'}     onClick={() => setFilter('all')} />
          <FilterPill label="Pending" active={filter === 'pending'} onClick={() => setFilter('pending')} />
          <FilterPill label="Settled" active={filter === 'settled'} onClick={() => setFilter('settled')} />
        </div>
      </div>

      {/* ── Scrollable list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px calc(env(safe-area-inset-bottom) + 96px)' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 78, borderRadius: 18, background: 'rgba(255,255,255,0.04)' }} />)}
          </div>
        )}

        {error && (
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '40px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(251,146,60,0.2)' }}
          >
            <p style={{ fontSize: 28, marginBottom: 12 }}>🤝</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>No borrowed entries</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Tap + to record money you borrowed</p>
          </motion.div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence initial={false}>
            {filtered.map(entry => (
              <BorrowedCard
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
                onAddMore={() => setAddMoreEntry(entry)}
                onPartial={() => { setPaymentEntry(entry); setPaymentMode('partial') }}
                onSettle={()  => { setPaymentEntry(entry); setPaymentMode('settle')  }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Add new entry sheet ── */}
      <AddBorrowedSheet
        open={addOpen}
        wallets={wallets}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
      />

      {/* ── Add more amount sheet ── */}
      <AddMoreSheet
        open={addMoreEntry !== null}
        entry={addMoreEntry}
        wallets={wallets}
        saving={saving}
        onClose={() => setAddMoreEntry(null)}
        onSave={addMoreAmount}
      />

      {/* ── Payment / Settle sheet ── */}
      <PaymentSheet
        open={paymentEntry !== null}
        mode={paymentMode}
        entry={paymentEntry}
        wallets={wallets}
        saving={saving}
        onClose={() => setPaymentEntry(null)}
        onPartial={makePayment}
        onSettle={markSettled}
      />
    </div>
  )
}
