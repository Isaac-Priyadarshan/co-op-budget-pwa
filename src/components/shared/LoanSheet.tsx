import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AppUser } from '../../lib/types'
import type { NewLoan } from '../../lib/db'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (loan: NewLoan) => Promise<void>
}

export function LoanSheet({ open, onClose, onSave }: Props) {
  const [owner, setOwner] = useState<AppUser>('Isaac')
  const [label, setLabel] = useState('')
  const [lender, setLender] = useState('')
  const [principal, setPrincipal] = useState('')
  const [outstanding, setOutstanding] = useState('')
  const [emi, setEmi] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setLabel(''); setLender(''); setPrincipal(''); setOutstanding(''); setEmi(''); setRate(''); setErr(''); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!label.trim()) { setErr('Enter a loan label'); return }
    if (!lender.trim()) { setErr('Enter the lender name'); return }
    if (!principal || Number(principal) <= 0) { setErr('Enter principal amount'); return }
    if (!outstanding || Number(outstanding) < 0) { setErr('Enter outstanding amount'); return }
    if (!emi || Number(emi) <= 0) { setErr('Enter EMI amount'); return }
    try {
      setSaving(true); setErr('')
      await onSave({
        label: label.trim(), lender: lender.trim(), owner,
        principal: parseFloat(Number(principal).toFixed(2)),
        outstanding: parseFloat(Number(outstanding).toFixed(2)),
        emi_amount: parseFloat(Number(emi).toFixed(2)),
        interest_rate: rate ? parseFloat(Number(rate).toFixed(2)) : 0,
      })
      reset(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const fields = [
    { label: 'Loan Label', value: label, set: setLabel, placeholder: 'e.g. Home Loan, Car Loan', num: false },
    { label: 'Lender', value: lender, set: setLender, placeholder: 'e.g. SBI, HDFC, Friend', num: false },
    { label: 'Principal Amount (₹)', value: principal, set: setPrincipal, placeholder: '0.00', num: true },
    { label: 'Outstanding Balance (₹)', value: outstanding, set: setOutstanding, placeholder: '0.00', num: true },
    { label: 'Monthly EMI (₹)', value: emi, set: setEmi, placeholder: '0.00', num: true },
    { label: 'Interest Rate (% p.a.) — optional', value: rate, set: setRate, placeholder: '0.00', num: true },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }} />
          <motion.div key="sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'linear-gradient(180deg,#0e1024 0%,#090c1c 100%)', border: '1px solid rgba(251,191,36,0.25)', borderBottom: 'none', borderRadius: '28px 28px 0 0', padding: '0 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)', maxHeight: '92dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f5f7ff', marginBottom: 20, letterSpacing: '-0.02em' }}>Add Loan / EMI</h2>

            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Owner</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['Isaac', 'Jenifa'] as AppUser[]).map(u => (
                <button key={u} onClick={() => setOwner(u)}
                  style={{ padding: '11px', borderRadius: 14, border: owner === u ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.08)', background: owner === u ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)', color: owner === u ? '#fcd34d' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s ease' }}
                >{u}</button>
              ))}
            </div>

            {fields.map(f => (
              <label key={f.label} style={{ display: 'block', marginBottom: 14 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{f.label}</p>
                <input type={f.num ? 'number' : 'text'} inputMode={f.num ? 'decimal' : 'text'} placeholder={f.placeholder} value={f.value}
                  onChange={e => f.set(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: f.num ? 20 : 15, fontWeight: f.num ? 700 : 400, outline: 'none' }} />
              </label>
            ))}

            {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}

            <button onClick={handleSubmit} disabled={saving}
              style={{ width: '100%', padding: '16px', background: saving ? 'rgba(251,191,36,0.2)' : 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 16, color: '#0a0a0a', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(251,191,36,0.35)', transition: 'all 0.16s ease' }}
            >{saving ? 'Saving…' : 'Save Loan'}</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
