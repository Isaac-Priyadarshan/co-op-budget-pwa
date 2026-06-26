import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewRecurring } from '../../lib/db'

const CATEGORIES = ['Streaming', 'Utilities', 'Insurance', 'Rent', 'Subscriptions', 'EMI', 'Phone', 'Internet', 'Other']
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const
const OWNERS = ['Isaac', 'Jenifa', 'Both']

interface Props { open: boolean; onClose: () => void; onSave: (r: NewRecurring) => Promise<void> }

export function RecurringSheet({ open, onClose, onSave }: Props) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [frequency, setFrequency] = useState<typeof FREQUENCIES[number]>('monthly')
  const [nextDue, setNextDue] = useState('')
  const [owner, setOwner] = useState('Both')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setLabel(''); setAmount(''); setCategory(''); setFrequency('monthly'); setNextDue(''); setOwner('Both'); setNotes(''); setErr('') }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!label.trim()) { setErr('Enter a label'); return }
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount'); return }
    if (!category) { setErr('Select a category'); return }
    if (!nextDue) { setErr('Select next due date'); return }
    try {
      setSaving(true); setErr('')
      await onSave({ label: label.trim(), amount: parseFloat(Number(amount).toFixed(2)), category, frequency, next_due: nextDue, owner, notes: notes.trim() })
      reset(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }} />
          <motion.div key="sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'linear-gradient(180deg,#0e1024 0%,#090c1c 100%)', border: '1px solid rgba(165,180,252,0.22)', borderBottom: 'none', borderRadius: '28px 28px 0 0', padding: '0 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)', maxHeight: '92dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f5f7ff', marginBottom: 20, letterSpacing: '-0.02em' }}>Add Recurring Payment</h2>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Label</p>
              <input type="text" placeholder="e.g. Netflix, Rent, Jio Recharge" value={label} onChange={e => setLabel(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }} />
            </label>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Amount (₹)</p>
              <input type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 22, fontWeight: 700, outline: 'none' }} />
            </label>

            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Category</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding: '7px 14px', borderRadius: 100, border: category === cat ? '1px solid rgba(165,180,252,0.5)' : '1px solid rgba(255,255,255,0.1)', background: category === cat ? 'rgba(165,180,252,0.15)' : 'rgba(255,255,255,0.04)', color: category === cat ? '#a5b4fc' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: category === cat ? 600 : 400, cursor: 'pointer', transition: 'all 0.14s ease' }}
                >{cat}</button>
              ))}
            </div>

            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Frequency</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {FREQUENCIES.map(f => (
                <button key={f} onClick={() => setFrequency(f)}
                  style={{ padding: '7px 16px', borderRadius: 100, border: frequency === f ? '1px solid rgba(165,180,252,0.5)' : '1px solid rgba(255,255,255,0.08)', background: frequency === f ? 'rgba(165,180,252,0.15)' : 'rgba(255,255,255,0.04)', color: frequency === f ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: frequency === f ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.14s ease' }}
                >{f}</button>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Next Due Date</p>
              <input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none', colorScheme: 'dark' }} />
            </label>

            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Paid by</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {OWNERS.map(o => (
                <button key={o} onClick={() => setOwner(o)}
                  style={{ padding: '10px', borderRadius: 14, border: owner === o ? '1px solid rgba(165,180,252,0.5)' : '1px solid rgba(255,255,255,0.08)', background: owner === o ? 'rgba(165,180,252,0.15)' : 'rgba(255,255,255,0.04)', color: owner === o ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s ease' }}
                >{o}</button>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: 20 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Notes (optional)</p>
              <input type="text" placeholder="Any notes" value={notes} onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }} />
            </label>

            {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}

            <button onClick={handleSubmit} disabled={saving}
              style={{ width: '100%', padding: '16px', background: saving ? 'rgba(165,180,252,0.2)' : 'linear-gradient(135deg,#818cf8,#6366f1)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)', transition: 'all 0.16s ease' }}
            >{saving ? 'Saving…' : 'Save Payment'}</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
