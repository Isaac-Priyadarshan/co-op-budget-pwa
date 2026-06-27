import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WalletEntry, NewWallet } from '../../lib/db'

// Bottom nav is ~112px tall. All fixed sheets must clear it.
const NAV_CLEARANCE = 'calc(env(safe-area-inset-bottom) + 120px)'

// ─── Ordinal helper ────────────────────────────────────────────────────────────
function ordinal(n: number): string {
  const last2 = n % 100
  const last1 = n % 10
  if (last2 >= 11 && last2 <= 13) return `${n}th`
  if (last1 === 1) return `${n}st`
  if (last1 === 2) return `${n}nd`
  if (last1 === 3) return `${n}rd`
  return `${n}th`
}

// ─── Day-of-Month Drum Picker ──────────────────────────────────────────────────
interface DayPickerProps {
  value: number | null
  onChange: (day: number) => void
  onClose: () => void
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

function DayPickerSheet({ value, onChange, onClose }: DayPickerProps) {
  const ITEM_H = 52
  const VISIBLE = 5
  const listRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(value ?? 1)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = (selected - 1) * ITEM_H
  }, [])

  const handleScroll = () => {
    if (!listRef.current) return
    const idx = Math.round(listRef.current.scrollTop / ITEM_H)
    setSelected(DAYS[Math.min(Math.max(idx, 0), 30)])
  }

  return (
    <>
      <motion.div key="day-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 60 }}
      />
      <motion.div key="day-sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
          background: '#0e0f1a',
          border: '1px solid rgba(99,102,241,0.22)', borderBottom: 'none',
          borderRadius: '28px 28px 0 0',
          padding: `0 20px ${NAV_CLEARANCE}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#f5f7ff', marginBottom: 16, textAlign: 'center' }}>Select Day of Month</p>

        <div style={{ position: 'relative', height: ITEM_H * VISIBLE, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: ITEM_H, transform: 'translateY(-50%)', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.32)', borderRadius: 14, pointerEvents: 'none', zIndex: 2 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to bottom, #0e0f1a, transparent)', pointerEvents: 'none', zIndex: 3 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.8, background: 'linear-gradient(to top, #0e0f1a, transparent)', pointerEvents: 'none', zIndex: 3 }} />
          <div ref={listRef} onScroll={handleScroll}
            style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}
          >
            {DAYS.map((d) => (
              <div key={d}
                onClick={() => { setSelected(d); if (listRef.current) listRef.current.scrollTop = (d - 1) * ITEM_H }}
                style={{ height: ITEM_H, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: d === selected ? 26 : 18, fontWeight: d === selected ? 800 : 400, color: d === selected ? '#a5b4fc' : 'rgba(255,255,255,0.28)', transition: 'all 0.14s ease', cursor: 'pointer', userSelect: 'none' }}
              >
                {ordinal(d)}
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 16 }}>
          Every month on the <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{ordinal(selected)}</span>
        </p>
        <button onClick={() => { onChange(selected); onClose() }}
          style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}
        >
          Confirm — {ordinal(selected)}
        </button>
      </motion.div>
    </>
  )
}

// ─── Shared input styles ───────────────────────────────────────────────────────
const inp: React.CSSProperties = { width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }
const amt: React.CSSProperties = { ...inp, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }

// ─── Wallet Add Sheet ──────────────────────────────────────────────────────────
interface WalletAddProps { open: boolean; onClose: () => void; onSave: (w: NewWallet) => Promise<void> }

function WalletAddSheet({ open, onClose, onSave }: WalletAddProps) {
  const [name, setName] = useState('')
  // Default to '0' so user can save a zero-balance wallet without typing
  const [balance, setBalance] = useState('0')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setName(''); setBalance('0'); setErr(''); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!name.trim()) { setErr('Enter a wallet name'); return }
    // FIX: use trim check instead of falsy — allows '0' to pass
    if (balance.trim() === '' || isNaN(Number(balance))) { setErr('Enter a valid balance'); return }
    try {
      setSaving(true); setErr('')
      await onSave({ type: 'cash', label: name.trim(), balance: parseFloat(Number(balance).toFixed(2)), credit_limit: null, billing_date: null, due_date: null })
      reset(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="wb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
          />
          <motion.div key="ws" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'linear-gradient(180deg,#0d0f1c,#08091a)', border: '1px solid rgba(52,211,153,0.22)', borderBottom: 'none', borderRadius: '28px 28px 0 0', padding: `0 20px ${NAV_CLEARANCE}`, maxHeight: '88dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}><div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em' }}>New Wallet</h2>
              <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
            </div>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 8 }}>Wallet Name</p>
              <input type="text" inputMode="text" placeholder="e.g. Pocket Cash, Savings" value={name} onChange={e => setName(e.target.value)} style={inp} />
            </label>
            <label style={{ display: 'block', marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 8 }}>Balance (₹)</p>
              <input type="number" inputMode="decimal" placeholder="0" value={balance} onChange={e => setBalance(e.target.value)} style={{ ...amt, fontSize: 26 }} />
            </label>
            {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}
            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '16px', background: saving ? 'rgba(52,211,153,0.25)' : 'linear-gradient(135deg,#34d399,#059669)', border: 'none', borderRadius: 16, color: '#000', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(52,211,153,0.3)' }}
            >{saving ? 'Saving…' : 'Save Wallet'}</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Wallet Edit Sheet ─────────────────────────────────────────────────────────
interface WalletEditProps { open: boolean; item: WalletEntry; onClose: () => void; onUpdate: (id: string, w: NewWallet) => Promise<void>; onDelete: (id: string) => Promise<void> }

function WalletEditSheet({ open, item, onClose, onUpdate, onDelete }: WalletEditProps) {
  const [name, setName] = useState(item.label)
  const [balance, setBalance] = useState(String(item.balance))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { setName(item.label); setBalance(String(item.balance)); setErr('') }, [item.id])

  const handleClose = () => { setErr(''); onClose() }

  const handleUpdate = async () => {
    if (!name.trim()) { setErr('Enter a wallet name'); return }
    // FIX: use trim check instead of falsy — allows '0' to pass
    if (balance.trim() === '' || isNaN(Number(balance))) { setErr('Enter a valid balance'); return }
    try {
      setSaving(true); setErr('')
      await onUpdate(item.id, { type: 'cash', label: name.trim(), balance: parseFloat(Number(balance).toFixed(2)), credit_limit: null, billing_date: null, due_date: null })
      onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to update') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${item.label}"?`)) return
    try { setDeleting(true); await onDelete(item.id); onClose() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed to delete') }
    finally { setDeleting(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="web" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
          />
          <motion.div key="wes" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'linear-gradient(180deg,#0d0f1c,#08091a)', border: '1px solid rgba(52,211,153,0.28)', borderBottom: 'none', borderRadius: '28px 28px 0 0', padding: `0 20px ${NAV_CLEARANCE}`, maxHeight: '88dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}><div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Edit Wallet</h2>
              <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
            </div>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 8 }}>Wallet Name</p>
              <input type="text" inputMode="text" value={name} onChange={e => setName(e.target.value)} style={inp} />
            </label>
            <label style={{ display: 'block', marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)', marginBottom: 8 }}>Balance (₹)</p>
              <input type="number" inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)} style={{ ...amt, fontSize: 26 }} />
            </label>
            {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}
            <button onClick={handleUpdate} disabled={saving}
              style={{ width: '100%', padding: '16px', background: saving ? 'rgba(52,211,153,0.25)' : 'linear-gradient(135deg,#34d399,#059669)', border: 'none', borderRadius: 16, color: '#000', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 12, boxShadow: saving ? 'none' : '0 4px 20px rgba(52,211,153,0.3)' }}
            >{saving ? 'Updating…' : 'Update Wallet'}</button>
            <button onClick={handleDelete} disabled={deleting}
              style={{ width: '100%', padding: '14px', background: 'none', border: '1px solid rgba(248,113,113,0.28)', borderRadius: 16, color: deleting ? 'rgba(248,113,113,0.4)' : '#fca5a5', fontSize: 15, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}
            >{deleting ? 'Deleting…' : 'Delete Wallet'}</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Credit Card Add Sheet ─────────────────────────────────────────────────────
interface CreditAddProps { open: boolean; onClose: () => void; onSave: (w: NewWallet) => Promise<void> }

function CreditCardAddSheet({ open, onClose, onSave }: CreditAddProps) {
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')
  // Default to '0' — a brand new card with no existing dues
  const [outstanding, setOutstanding] = useState('0')
  const [billDate, setBillDate] = useState<number | null>(null)
  const [dueDate, setDueDate] = useState<number | null>(null)
  const [dayPicker, setDayPicker] = useState<'bill' | 'due' | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setName(''); setLimit(''); setOutstanding('0'); setBillDate(null); setDueDate(null); setErr(''); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!name.trim()) { setErr('Enter a card name'); return }
    // Limit must be > 0 — a card with ₹0 limit is not valid
    if (limit.trim() === '' || isNaN(Number(limit)) || Number(limit) <= 0) { setErr('Enter a valid credit limit (must be greater than ₹0)'); return }
    // FIX: outstanding CAN be 0 — new card with no dues
    if (outstanding.trim() === '' || isNaN(Number(outstanding))) { setErr('Enter a valid outstanding balance (0 is allowed)'); return }
    if (!billDate) { setErr('Select a billing date'); return }
    if (!dueDate) { setErr('Select a due date'); return }
    try {
      setSaving(true); setErr('')
      await onSave({ type: 'credit', label: name.trim(), balance: parseFloat(Number(outstanding).toFixed(2)), credit_limit: parseFloat(Number(limit).toFixed(2)), billing_date: billDate, due_date: dueDate })
      reset(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const DateBtn = ({ label, val, field }: { label: string; val: number | null; field: 'bill' | 'due' }) => (
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>{label}</p>
      <motion.button whileTap={{ scale: 0.96 }} onClick={() => setDayPicker(field)}
        style={{ width: '100%', padding: '13px 16px', background: val ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.05)', border: val ? '1px solid rgba(99,102,241,0.38)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
      >
        {val ? <><span style={{ fontSize: 20, fontWeight: 800, color: '#a5b4fc', display: 'block', lineHeight: 1.1 }}>{ordinal(val)}</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, display: 'block' }}>every month</span></> : <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)' }}>Tap to set</span>}
      </motion.button>
    </div>
  )

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div key="cb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
            />
            <motion.div key="cs" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'linear-gradient(180deg,#130a10,#08060f)', border: '1px solid rgba(248,113,113,0.22)', borderBottom: 'none', borderRadius: '28px 28px 0 0', padding: `0 20px ${NAV_CLEARANCE}`, maxHeight: '88dvh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}><div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em' }}>New Credit Card</h2>
                <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
              </div>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Card Name</p>
                <input type="text" inputMode="text" placeholder="e.g. HDFC Credit, SBI Card" value={name} onChange={e => setName(e.target.value)} style={inp} />
              </label>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Total Limit (₹)</p>
                <input type="number" inputMode="decimal" placeholder="e.g. 100000" value={limit} onChange={e => setLimit(e.target.value)} style={amt} />
              </label>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Outstanding Balance (₹)</p>
                <input type="number" inputMode="decimal" placeholder="0" value={outstanding} onChange={e => setOutstanding(e.target.value)} style={amt} />
              </label>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <DateBtn label="Bill Date" val={billDate} field="bill" />
                <DateBtn label="Due Date" val={dueDate} field="due" />
              </div>
              {(billDate || dueDate) && (
                <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8 }}>
                    {billDate && <><>📅 Bill generated every month on the </><span style={{ color: '#a5b4fc', fontWeight: 700 }}>{ordinal(billDate)}</span><br /></>}
                    {dueDate && <><>⏰ Payment due every month on the </><span style={{ color: '#fca5a5', fontWeight: 700 }}>{ordinal(dueDate)}</span></>}
                  </p>
                </div>
              )}
              {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}
              <button onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '16px', background: saving ? 'rgba(248,113,113,0.25)' : 'linear-gradient(135deg,#f87171,#ef4444)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(248,113,113,0.3)' }}
              >{saving ? 'Saving…' : 'Save Credit Card'}</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {dayPicker !== null && (
          <DayPickerSheet value={dayPicker === 'bill' ? billDate : dueDate} onChange={d => dayPicker === 'bill' ? setBillDate(d) : setDueDate(d)} onClose={() => setDayPicker(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Credit Card Edit Sheet ────────────────────────────────────────────────────
interface CreditEditProps { open: boolean; item: WalletEntry; onClose: () => void; onUpdate: (id: string, w: NewWallet) => Promise<void>; onDelete: (id: string) => Promise<void> }

function CreditCardEditSheet({ open, item, onClose, onUpdate, onDelete }: CreditEditProps) {
  const [name, setName] = useState(item.label)
  const [limit, setLimit] = useState(String(item.credit_limit ?? 0))
  const [outstanding, setOutstanding] = useState(String(item.balance))
  const [billDate, setBillDate] = useState<number | null>(item.billing_date ?? null)
  const [dueDate, setDueDate] = useState<number | null>(item.due_date ?? null)
  const [dayPicker, setDayPicker] = useState<'bill' | 'due' | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setName(item.label)
    setLimit(String(item.credit_limit ?? 0))
    setOutstanding(String(item.balance))
    setBillDate(item.billing_date ?? null)
    setDueDate(item.due_date ?? null)
    setErr('')
  }, [item.id])

  const handleClose = () => { setErr(''); onClose() }

  const handleUpdate = async () => {
    if (!name.trim()) { setErr('Enter a card name'); return }
    // Limit must be > 0
    if (limit.trim() === '' || isNaN(Number(limit)) || Number(limit) <= 0) { setErr('Enter a valid credit limit (must be greater than ₹0)'); return }
    // FIX: outstanding CAN be 0 — card fully paid off
    if (outstanding.trim() === '' || isNaN(Number(outstanding))) { setErr('Enter valid outstanding balance (0 is allowed)'); return }
    if (!billDate) { setErr('Select a billing date'); return }
    if (!dueDate) { setErr('Select a due date'); return }
    try {
      setSaving(true); setErr('')
      await onUpdate(item.id, { type: 'credit', label: name.trim(), balance: parseFloat(Number(outstanding).toFixed(2)), credit_limit: parseFloat(Number(limit).toFixed(2)), billing_date: billDate, due_date: dueDate })
      onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to update') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${item.label}"?`)) return
    try { setDeleting(true); await onDelete(item.id); onClose() }
    catch (e) { setErr(e instanceof Error ? e.message : 'Failed to delete') }
    finally { setDeleting(false) }
  }

  const DateBtn = ({ label, val, field }: { label: string; val: number | null; field: 'bill' | 'due' }) => (
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>{label}</p>
      <motion.button whileTap={{ scale: 0.96 }} onClick={() => setDayPicker(field)}
        style={{ width: '100%', padding: '13px 16px', background: val ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.05)', border: val ? '1px solid rgba(99,102,241,0.38)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 14, cursor: 'pointer', textAlign: 'left' }}
      >
        {val ? <><span style={{ fontSize: 20, fontWeight: 800, color: '#a5b4fc', display: 'block', lineHeight: 1.1 }}>{ordinal(val)}</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, display: 'block' }}>every month</span></> : <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)' }}>Tap to set</span>}
      </motion.button>
    </div>
  )

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div key="ceb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
            />
            <motion.div key="ces" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'linear-gradient(180deg,#130a10,#08060f)', border: '1px solid rgba(248,113,113,0.28)', borderBottom: 'none', borderRadius: '28px 28px 0 0', padding: `0 20px ${NAV_CLEARANCE}`, maxHeight: '88dvh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}><div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Edit Credit Card</h2>
                <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
              </div>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Card Name</p>
                <input type="text" inputMode="text" value={name} onChange={e => setName(e.target.value)} style={inp} />
              </label>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Total Limit (₹)</p>
                <input type="number" inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value)} style={amt} />
              </label>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.7)', marginBottom: 8 }}>Outstanding Balance (₹)</p>
                <input type="number" inputMode="decimal" value={outstanding} onChange={e => setOutstanding(e.target.value)} style={amt} />
              </label>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <DateBtn label="Bill Date" val={billDate} field="bill" />
                <DateBtn label="Due Date" val={dueDate} field="due" />
              </div>
              {(billDate || dueDate) && (
                <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8 }}>
                    {billDate && <><>📅 Bill generated every month on the </><span style={{ color: '#a5b4fc', fontWeight: 700 }}>{ordinal(billDate)}</span><br /></>}
                    {dueDate && <><>⏰ Payment due every month on the </><span style={{ color: '#fca5a5', fontWeight: 700 }}>{ordinal(dueDate)}</span></>}
                  </p>
                </div>
              )}
              {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}
              <button onClick={handleUpdate} disabled={saving}
                style={{ width: '100%', padding: '16px', background: saving ? 'rgba(248,113,113,0.25)' : 'linear-gradient(135deg,#f87171,#ef4444)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 12, boxShadow: saving ? 'none' : '0 4px 20px rgba(248,113,113,0.3)' }}
              >{saving ? 'Updating…' : 'Update Card'}</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ width: '100%', padding: '14px', background: 'none', border: '1px solid rgba(248,113,113,0.28)', borderRadius: 16, color: deleting ? 'rgba(248,113,113,0.4)' : '#fca5a5', fontSize: 15, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}
              >{deleting ? 'Deleting…' : 'Delete Card'}</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {dayPicker !== null && (
          <DayPickerSheet value={dayPicker === 'bill' ? billDate : dueDate} onChange={d => dayPicker === 'bill' ? setBillDate(d) : setDueDate(d)} onClose={() => setDayPicker(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Public WalletSheet Wrapper ────────────────────────────────────────────────
export interface WalletSheetProps {
  open: boolean
  onClose: () => void
  onSave: (w: NewWallet) => Promise<void>
  defaultType?: 'cash' | 'credit'
  mode?: 'add' | 'edit'
  editItem?: WalletEntry | null
  onUpdate?: (id: string, w: NewWallet) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function WalletSheet({ open, onClose, onSave, defaultType = 'cash', mode = 'add', editItem, onUpdate, onDelete }: WalletSheetProps) {
  if (mode === 'edit' && editItem && onUpdate && onDelete) {
    return editItem.type === 'credit'
      ? <CreditCardEditSheet open={open} item={editItem} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />
      : <WalletEditSheet open={open} item={editItem} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />
  }
  return defaultType === 'credit'
    ? <CreditCardAddSheet open={open} onClose={onClose} onSave={onSave} />
    : <WalletAddSheet open={open} onClose={onClose} onSave={onSave} />
}
