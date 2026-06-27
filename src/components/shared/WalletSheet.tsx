import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewWallet } from '../../lib/db'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (w: NewWallet) => Promise<void>
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export function WalletSheet({ open, onClose, onSave }: Props) {
  const [type, setType]               = useState<'cash' | 'credit'>('cash')
  const [label, setLabel]             = useState('')
  const [balance, setBalance]         = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [billingDate, setBillingDate] = useState('')
  const [dueDate, setDueDate]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState('')

  const reset = () => {
    setLabel(''); setBalance(''); setCreditLimit('')
    setBillingDate(''); setDueDate(''); setErr(''); setSaving(false)
  }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!label.trim()) {
      setErr(type === 'cash' ? 'Enter a wallet name (e.g. Paytm, GPay)' : 'Enter a card name (e.g. HDFC Credit)')
      return
    }
    if (!balance || isNaN(Number(balance))) {
      setErr(type === 'cash' ? 'Enter a valid balance' : 'Enter the outstanding balance')
      return
    }
    if (type === 'credit') {
      if (!creditLimit || isNaN(Number(creditLimit))) { setErr('Enter the total credit limit'); return }
      const bd = parseInt(billingDate, 10)
      const dd = parseInt(dueDate, 10)
      if (!billingDate || isNaN(bd) || bd < 1 || bd > 31) { setErr('Enter a valid billing date (1–31)'); return }
      if (!dueDate || isNaN(dd) || dd < 1 || dd > 31)     { setErr('Enter a valid due date (1–31)'); return }
    }
    try {
      setSaving(true); setErr('')
      const payload: NewWallet = {
        type,
        label:        label.trim(),
        balance:      parseFloat(Number(balance).toFixed(2)),
        credit_limit: type === 'credit' ? parseFloat(Number(creditLimit).toFixed(2)) : null,
        billing_date: type === 'credit' ? parseInt(billingDate, 10) : null,
        due_date:     type === 'credit' ? parseInt(dueDate, 10) : null,
      }
      await onSave(payload)
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none',
  }
  const numInputStyle: React.CSSProperties = { ...inputStyle, fontSize: 22, fontWeight: 700 }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'block',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
          />
          <motion.div
            key="sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#0e1024 0%,#090c1c 100%)',
              border: '1px solid rgba(99,102,241,0.25)', borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
              maxHeight: '92dvh', overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f5f7ff', marginBottom: 20, letterSpacing: '-0.02em' }}>
              {type === 'cash' ? 'Add Wallet' : 'Add Credit Card'}
            </h2>

            {/* Type toggle */}
            <p style={labelStyle}>Type</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {(['cash', 'credit'] as const).map(t => (
                <button key={t} onClick={() => { setType(t); setErr('') }}
                  style={{
                    padding: '12px',
                    borderRadius: 14,
                    border: type === t ? '1px solid rgba(99,102,241,0.55)' : '1px solid rgba(255,255,255,0.08)',
                    background: type === t ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
                    color: type === t ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.14s ease',
                  }}
                >{t === 'cash' ? '👛 Wallet' : '💳 Credit Card'}</button>
              ))}
            </div>

            {/* Wallet name */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={labelStyle}>{type === 'cash' ? 'Wallet Name' : 'Card Name'}</span>
              <input
                type="text"
                placeholder={type === 'cash' ? 'e.g. Paytm, GPay, Cash' : 'e.g. HDFC Credit, SBI Card'}
                value={label}
                onChange={e => setLabel(e.target.value)}
                style={inputStyle}
              />
            </label>

            {/* Cash: balance only */}
            {type === 'cash' && (
              <label style={{ display: 'block', marginBottom: 14 }}>
                <span style={labelStyle}>Balance (₹)</span>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={balance} onChange={e => setBalance(e.target.value)}
                  style={numInputStyle}
                />
              </label>
            )}

            {/* Credit card: 4 extra fields */}
            {type === 'credit' && (
              <>
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={labelStyle}>Total Credit Limit (₹)</span>
                  <input
                    type="number" inputMode="decimal" placeholder="e.g. 100000"
                    value={creditLimit} onChange={e => setCreditLimit(e.target.value)}
                    style={numInputStyle}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={labelStyle}>Outstanding Balance (₹)</span>
                  <input
                    type="number" inputMode="decimal" placeholder="Amount currently owed"
                    value={balance} onChange={e => setBalance(e.target.value)}
                    style={numInputStyle}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <label style={{ display: 'block' }}>
                    <span style={labelStyle}>Billing Date</span>
                    <input
                      type="number" inputMode="numeric" placeholder="e.g. 15"
                      min={1} max={31}
                      value={billingDate} onChange={e => setBillingDate(e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                    />
                    {billingDate && !isNaN(parseInt(billingDate)) && parseInt(billingDate) >= 1 && parseInt(billingDate) <= 31 && (
                      <p style={{ fontSize: 11, color: 'rgba(165,180,252,0.6)', marginTop: 5, textAlign: 'center' }}>
                        {ordinalSuffix(parseInt(billingDate))} of every month
                      </p>
                    )}
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={labelStyle}>Due Date</span>
                    <input
                      type="number" inputMode="numeric" placeholder="e.g. 22"
                      min={1} max={31}
                      value={dueDate} onChange={e => setDueDate(e.target.value)}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                    />
                    {dueDate && !isNaN(parseInt(dueDate)) && parseInt(dueDate) >= 1 && parseInt(dueDate) <= 31 && (
                      <p style={{ fontSize: 11, color: 'rgba(165,180,252,0.6)', marginTop: 5, textAlign: 'center' }}>
                        {ordinalSuffix(parseInt(dueDate))} of every month
                      </p>
                    )}
                  </label>
                </div>
              </>
            )}

            {/* Error */}
            {err && (
              <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>
                {err}
              </p>
            )}

            {/* Save button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: '100%', padding: '16px',
                background: saving ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', borderRadius: 16,
                color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.16s ease',
              }}
            >
              {saving ? 'Saving…' : type === 'cash' ? 'Save Wallet' : 'Save Card'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
