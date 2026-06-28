import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewLoan } from '../../lib/db'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (loan: NewLoan) => Promise<void>
}

export function LoanSheet({ open, onClose, onSave }: Props) {
  const [label, setLabel] = useState('')
  const [lender, setLender] = useState('')
  const [principal, setPrincipal] = useState('')
  const [outstanding, setOutstanding] = useState('')
  const [emi, setEmi] = useState('')
  const [rate, setRate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => {
    setLabel(''); setLender(''); setPrincipal(''); setOutstanding('')
    setEmi(''); setRate(''); setStartDate(''); setEndDate('')
    setErr(''); setSaving(false)
  }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!label.trim())                              { setErr('Enter a loan label'); return }
    if (!lender.trim())                             { setErr('Enter the lender name'); return }
    if (!principal || Number(principal) <= 0)       { setErr('Enter principal amount'); return }
    if (!outstanding || Number(outstanding) < 0)   { setErr('Enter outstanding balance'); return }
    if (!emi || Number(emi) <= 0)                   { setErr('Enter monthly EMI'); return }
    if (startDate && endDate && endDate < startDate) { setErr('End date must be after start date'); return }
    try {
      setSaving(true); setErr('')
      await onSave({
        label:         label.trim(),
        lender:        lender.trim(),
        principal:     parseFloat(Number(principal).toFixed(2)),
        outstanding:   parseFloat(Number(outstanding).toFixed(2)),
        emi_amount:    parseFloat(Number(emi).toFixed(2)),
        interest_rate: rate ? parseFloat(Number(rate).toFixed(2)) : 0,
        start_date:    startDate || null,
        end_date:      endDate   || null,
      })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── input style helper ──────────────────────────────────────────────
  const inputStyle = (isNum = false): React.CSSProperties => ({
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    color: '#f5f7ff',
    fontSize: isNum ? 20 : 15,
    fontWeight: isNum ? 700 : 400,
    outline: 'none',
    colorScheme: 'dark',
  })

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
    marginBottom: 8, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              zIndex: 40,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg, #0e1024 0%, #090c1c 100%)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
              maxHeight: '92dvh',
              overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <h2 style={{
              fontSize: 20, fontWeight: 700, color: '#f5f7ff',
              marginBottom: 22, letterSpacing: '-0.02em',
            }}>Add Loan / EMI</h2>

            {/* ── Loan Label ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelStyle}>Loan Label</span>
              <input
                type="text" placeholder="e.g. Home Loan, Car Loan"
                value={label} onChange={e => setLabel(e.target.value)}
                style={inputStyle()}
              />
            </label>

            {/* ── Lender ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelStyle}>Lender</span>
              <input
                type="text" placeholder="e.g. SBI, HDFC, Friend"
                value={lender} onChange={e => setLender(e.target.value)}
                style={inputStyle()}
              />
            </label>

            {/* ── Principal Amount ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelStyle}>Principal Amount (₹)</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={principal} onChange={e => setPrincipal(e.target.value)}
                style={inputStyle(true)}
              />
            </label>

            {/* ── Outstanding Balance ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelStyle}>Outstanding Balance (₹)</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={outstanding} onChange={e => setOutstanding(e.target.value)}
                style={inputStyle(true)}
              />
            </label>

            {/* ── Interest Rate + Monthly EMI side by side ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <label style={{ display: 'block' }}>
                <span style={labelStyle}>Interest Rate (% p.a.)</span>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={rate} onChange={e => setRate(e.target.value)}
                  style={inputStyle(true)}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={labelStyle}>Monthly EMI (₹)</span>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={emi} onChange={e => setEmi(e.target.value)}
                  style={inputStyle(true)}
                />
              </label>
            </div>

            {/* ── Start Date + End Date side by side ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
              <label style={{ display: 'block' }}>
                <span style={labelStyle}>First EMI Date</span>
                <input
                  type="date"
                  value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={inputStyle()}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={labelStyle}>Last EMI Date</span>
                <input
                  type="date"
                  value={endDate} onChange={e => setEndDate(e.target.value)}
                  style={inputStyle()}
                />
              </label>
            </div>

            {/* Duration hint — shown when both dates are filled */}
            {startDate && endDate && endDate >= startDate && (() => {
              const s = new Date(startDate)
              const e = new Date(endDate)
              const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
              const years  = Math.floor(months / 12)
              const rem    = months % 12
              const dur    = years > 0
                ? `${years} yr${years > 1 ? 's' : ''}${rem > 0 ? ` ${rem} mo` : ''}`
                : `${months} month${months !== 1 ? 's' : ''}`
              return (
                <div style={{
                  marginTop: -14, marginBottom: 18,
                  padding: '9px 14px', borderRadius: 12,
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.18)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>📅</span>
                  <p style={{ fontSize: 13, color: '#fcd34d', margin: 0 }}>
                    Loan tenure: <strong>{dur}</strong> ({months} EMIs)
                  </p>
                </div>
              )
            })()}

            {/* Error */}
            {err && (
              <p style={{
                fontSize: 13, color: '#fca5a5', marginBottom: 16,
                padding: '10px 14px',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 10,
              }}>{err}</p>
            )}

            {/* Save button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: '100%', padding: '16px',
                background: saving
                  ? 'rgba(251,191,36,0.2)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none', borderRadius: 16,
                color: '#0a0a0a', fontSize: 16, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 20px rgba(251,191,36,0.35)',
                transition: 'all 0.16s ease',
              }}
            >{saving ? 'Saving…' : 'Save Loan'}</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
