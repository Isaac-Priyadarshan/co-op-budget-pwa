import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewWallet } from '../../lib/db'

// ─── Day-of-Month Drum Picker ────────────────────────────────────────────────

interface DayPickerProps {
  value: number | null
  onChange: (day: number) => void
  onClose: () => void
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

function ordinal(n: number): string {
  const last2 = n % 100
  const last1 = n % 10
  if (last2 >= 11 && last2 <= 13) return `${n}th`
  if (last1 === 1) return `${n}st`
  if (last1 === 2) return `${n}nd`
  if (last1 === 3) return `${n}rd`
  return `${n}th`
}

function DayPickerSheet({ value, onChange, onClose }: DayPickerProps) {
  const ITEM_H = 52
  const VISIBLE = 5
  const listRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(value ?? 1)

  // Scroll to selected on open
  useEffect(() => {
    if (listRef.current) {
      const idx = selected - 1
      listRef.current.scrollTop = idx * ITEM_H
    }
  }, [])

  const handleScroll = () => {
    if (!listRef.current) return
    const idx = Math.round(listRef.current.scrollTop / ITEM_H)
    setSelected(DAYS[Math.min(Math.max(idx, 0), 30)])
  }

  const handleConfirm = () => {
    onChange(selected)
    onClose()
  }

  return (
    <>
      {/* backdrop */}
      <motion.div
        key="day-bd"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 60 }}
      />
      {/* sheet */}
      <motion.div
        key="day-sh"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 70,
          background: '#0e0f1a',
          border: '1px solid rgba(99,102,241,0.22)',
          borderBottom: 'none',
          borderRadius: '28px 28px 0 0',
          padding: '0 20px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
        }}
      >
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <p style={{ fontSize: 16, fontWeight: 700, color: '#f5f7ff', marginBottom: 16, textAlign: 'center', letterSpacing: '-0.01em' }}>
          Select Day of Month
        </p>

        {/* drum */}
        <div style={{ position: 'relative', height: ITEM_H * VISIBLE, overflow: 'hidden', marginBottom: 16 }}>
          {/* selection band */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0, right: 0,
            height: ITEM_H,
            transform: 'translateY(-50%)',
            background: 'rgba(99,102,241,0.14)',
            border: '1px solid rgba(99,102,241,0.32)',
            borderRadius: 14,
            pointerEvents: 'none',
            zIndex: 2,
          }} />
          {/* fade top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to bottom, #0e0f1a 0%, transparent 100%)', pointerEvents: 'none', zIndex: 3 }} />
          {/* fade bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to top, #0e0f1a 0%, transparent 100%)', pointerEvents: 'none', zIndex: 3 }} />
          {/* scroll list */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{
              height: '100%',
              overflowY: 'scroll',
              scrollSnapType: 'y mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              paddingTop: ITEM_H * 2,
              paddingBottom: ITEM_H * 2,
            }}
          >
            {DAYS.map((d) => (
              <div
                key={d}
                onClick={() => {
                  setSelected(d)
                  if (listRef.current) listRef.current.scrollTop = (d - 1) * ITEM_H
                }}
                style={{
                  height: ITEM_H,
                  scrollSnapAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: d === selected ? 26 : 18,
                  fontWeight: d === selected ? 800 : 400,
                  color: d === selected ? '#a5b4fc' : 'rgba(255,255,255,0.28)',
                  transition: 'all 0.14s ease',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {ordinal(d)}
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 16 }}>
          Every month on the <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{ordinal(selected)}</span>
        </p>

        <button
          onClick={handleConfirm}
          style={{
            width: '100%', padding: '15px',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none', borderRadius: 16,
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
          }}
        >
          Confirm — {ordinal(selected)}
        </button>
      </motion.div>
    </>
  )
}

// ─── Wallet Add Sheet (cash only) ────────────────────────────────────────────

interface WalletAddProps {
  open: boolean
  onClose: () => void
  onSave: (w: NewWallet) => Promise<void>
}

function WalletAddSheet({ open, onClose, onSave }: WalletAddProps) {
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setName(''); setBalance(''); setErr(''); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!name.trim()) { setErr('Enter a wallet name'); return }
    if (!balance || isNaN(Number(balance))) { setErr('Enter a valid balance'); return }
    try {
      setSaving(true); setErr('')
      await onSave({ owner: 'Isaac', type: 'cash', label: name.trim(), balance: parseFloat(Number(balance).toFixed(2)), credit_limit: null, billing_date: null, due_date: null })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }
  const amt: React.CSSProperties = { ...inp, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="wb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
          />
          <motion.div key="ws"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#0d0f1c 0%,#08091a 100%)',
              border: '1px solid rgba(52,211,153,0.22)', borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
              maxHeight: '80dvh', overflowY: 'auto',
            }}
          >
            {/* handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* title row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em' }}>New Wallet</h2>
              <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
            </div>

            {/* name */}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 8 }}>Wallet Name</p>
              <input type="text" inputMode="text" placeholder="e.g. Pocket Cash, Savings" value={name} onChange={e => setName(e.target.value)} style={inp} />
            </label>

            {/* balance */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 8 }}>Balance (₹)</p>
              <input type="number" inputMode="decimal" placeholder="0" value={balance} onChange={e => setBalance(e.target.value)} style={amt} />
            </label>

            {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}

            <button
              onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '16px', background: saving ? 'rgba(52,211,153,0.25)' : 'linear-gradient(135deg,#34d399,#059669)', border: 'none', borderRadius: 16, color: '#000', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(52,211,153,0.3)' }}
            >
              {saving ? 'Saving…' : 'Save Wallet'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Credit Card Add Sheet ────────────────────────────────────────────────────

interface CreditAddProps {
  open: boolean
  onClose: () => void
  onSave: (w: NewWallet) => Promise<void>
}

function CreditCardAddSheet({ open, onClose, onSave }: CreditAddProps) {
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')
  const [outstanding, setOutstanding] = useState('')
  const [billDate, setBillDate] = useState<number | null>(null)
  const [dueDate, setDueDate] = useState<number | null>(null)
  const [dayPicker, setDayPicker] = useState<'bill' | 'due' | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setName(''); setLimit(''); setOutstanding(''); setBillDate(null); setDueDate(null); setErr(''); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!name.trim()) { setErr('Enter a card name'); return }
    if (!limit || isNaN(Number(limit))) { setErr('Enter a valid total limit'); return }
    if (!outstanding || isNaN(Number(outstanding))) { setErr('Enter a valid outstanding balance'); return }
    if (!billDate) { setErr('Select a billing date'); return }
    if (!dueDate) { setErr('Select a due date'); return }
    try {
      setSaving(true); setErr('')
      await onSave({ owner: 'Isaac', type: 'credit', label: name.trim(), balance: parseFloat(Number(outstanding).toFixed(2)), credit_limit: parseFloat(Number(limit).toFixed(2)), billing_date: billDate, due_date: dueDate })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }
  const amt: React.CSSProperties = { ...inp, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }

  const DateBtn = ({ label, val, field }: { label: string; val: number | null; field: 'bill' | 'due' }) => (
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>{label}</p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setDayPicker(field)}
        style={{
          width: '100%', padding: '13px 16px',
          background: val ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.05)',
          border: val ? '1px solid rgba(99,102,241,0.38)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, cursor: 'pointer', textAlign: 'left',
        }}
      >
        {val
          ? <><span style={{ fontSize: 20, fontWeight: 800, color: '#a5b4fc', display: 'block', lineHeight: 1.1 }}>{ordinal(val)}</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, display: 'block' }}>every month</span></>
          : <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)' }}>Tap to set</span>
        }
      </motion.button>
    </div>
  )

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div key="cb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleClose}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
            />
            <motion.div key="cs"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                background: 'linear-gradient(180deg,#130a10 0%,#08060f 100%)',
                border: '1px solid rgba(248,113,113,0.22)', borderBottom: 'none',
                borderRadius: '28px 28px 0 0',
                padding: '0 20px',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
                maxHeight: '88dvh', overflowY: 'auto',
              }}
            >
              {/* handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
              </div>

              {/* title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em' }}>New Credit Card</h2>
                <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
              </div>

              {/* card name */}
              <label style={{ display: 'block', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Card Name</p>
                <input type="text" inputMode="text" placeholder="e.g. HDFC Credit, SBI Card" value={name} onChange={e => setName(e.target.value)} style={inp} />
              </label>

              {/* total limit */}
              <label style={{ display: 'block', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Total Limit (₹)</p>
                <input type="number" inputMode="decimal" placeholder="0" value={limit} onChange={e => setLimit(e.target.value)} style={amt} />
              </label>

              {/* outstanding */}
              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Outstanding Balance (₹)</p>
                <input type="number" inputMode="decimal" placeholder="0" value={outstanding} onChange={e => setOutstanding(e.target.value)} style={amt} />
              </label>

              {/* bill + due date row */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
                <DateBtn label="Bill Date" val={billDate} field="bill" />
                <DateBtn label="Due Date" val={dueDate} field="due" />
              </div>

              {(billDate || dueDate) && (
                <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                    {billDate && <>📅 Bill generated every month on the <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{ordinal(billDate)}</span><br /></>}
                    {dueDate && <>⏰ Payment due every month on the <span style={{ color: '#fca5a5', fontWeight: 700 }}>{ordinal(dueDate)}</span></>}
                  </p>
                </div>
              )}

              {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}

              <button
                onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '16px', background: saving ? 'rgba(248,113,113,0.25)' : 'linear-gradient(135deg,#f87171,#ef4444)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(248,113,113,0.3)' }}
              >
                {saving ? 'Saving…' : 'Save Credit Card'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Day picker — renders above the credit sheet (zIndex 60/70) */}
      <AnimatePresence>
        {dayPicker !== null && (
          <DayPickerSheet
            value={dayPicker === 'bill' ? billDate : dueDate}
            onChange={(d) => dayPicker === 'bill' ? setBillDate(d) : setDueDate(d)}
            onClose={() => setDayPicker(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Public WalletSheet Wrapper ───────────────────────────────────────────────

export interface WalletSheetProps {
  open: boolean
  onClose: () => void
  onSave: (w: NewWallet) => Promise<void>
  defaultType?: 'cash' | 'credit'
}

export function WalletSheet({ open, onClose, onSave, defaultType = 'cash' }: WalletSheetProps) {
  return defaultType === 'credit'
    ? <CreditCardAddSheet open={open} onClose={onClose} onSave={onSave} />
    : <WalletAddSheet open={open} onClose={onClose} onSave={onSave} />
}
