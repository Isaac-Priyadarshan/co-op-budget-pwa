import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewWallet } from '../../lib/db'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (w: NewWallet) => Promise<void>
  defaultType?: 'cash' | 'credit'
}

const DEFAULT_OWNER = 'Isaac' as const

export function WalletSheet({ open, onClose, onSave, defaultType = 'cash' }: Props) {
  const [type, setType] = useState<'cash' | 'credit'>(defaultType)
  const [label, setLabel] = useState('')
  const [balance, setBalance] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [billingDate, setBillingDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // When sheet opens or defaultType changes, sync the type selection
  useEffect(() => {
    if (open) setType(defaultType)
  }, [open, defaultType])

  const reset = () => {
    setType(defaultType)
    setLabel('')
    setBalance('')
    setCreditLimit('')
    setBillingDate('')
    setDueDate('')
    setErr('')
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!label.trim()) {
      setErr(type === 'cash' ? 'Enter a wallet name' : 'Enter a credit card name')
      return
    }

    if (!balance || isNaN(Number(balance))) {
      setErr(type === 'cash' ? 'Enter a valid wallet balance' : 'Enter a valid outstanding balance')
      return
    }

    if (type === 'credit') {
      if (!creditLimit || isNaN(Number(creditLimit))) {
        setErr('Enter a valid total limit')
        return
      }
      const billing = Number(billingDate)
      const due = Number(dueDate)
      if (!billingDate || !Number.isInteger(billing) || billing < 1 || billing > 31) {
        setErr('Billing date must be a day between 1 and 31')
        return
      }
      if (!dueDate || !Number.isInteger(due) || due < 1 || due > 31) {
        setErr('Due date must be a day between 1 and 31')
        return
      }
    }

    try {
      setSaving(true)
      setErr('')
      await onSave({
        owner: DEFAULT_OWNER,
        type,
        label: label.trim(),
        balance: parseFloat(Number(balance).toFixed(2)),
        credit_limit: type === 'credit' ? parseFloat(Number(creditLimit).toFixed(2)) : null,
        billing_date: type === 'credit' ? Number(billingDate) : null,
        due_date: type === 'credit' ? Number(dueDate) : null,
      })
      reset()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const textInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    color: '#f5f7ff',
    fontSize: 15,
    outline: 'none',
  }

  const amountInputStyle: React.CSSProperties = {
    ...textInputStyle,
    fontSize: 22,
    fontWeight: 700,
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
          />

          <motion.div
            key="sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              background: 'linear-gradient(180deg,#0e1024 0%,#090c1c 100%)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
              maxHeight: '88dvh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f5f7ff', marginBottom: 20, letterSpacing: '-0.02em' }}>
              {defaultType === 'credit' ? 'Add Credit Card' : 'Add Wallet'}
            </h2>

            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              Type
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['cash', 'credit'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '11px',
                    borderRadius: 14,
                    border: type === t ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    background: type === t ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    color: type === t ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.14s ease',
                  }}
                >
                  {t === 'cash' ? '👛 Wallet' : '💳 Credit Card'}
                </button>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                {type === 'cash' ? 'Wallet Name' : 'Card Name'}
              </p>
              <input
                type="text"
                inputMode="text"
                placeholder={type === 'cash' ? 'e.g. Pocket Wallet, Home Wallet' : 'e.g. HDFC Credit, SBI Card'}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={textInputStyle}
              />
            </label>

            {type === 'cash' ? (
              <label style={{ display: 'block', marginBottom: 14 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Balance (₹)
                </p>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  style={amountInputStyle}
                />
              </label>
            ) : (
              <>
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                    Total Limit (₹)
                  </p>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    style={amountInputStyle}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                    Outstanding Balance (₹)
                  </p>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    style={amountInputStyle}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <label style={{ display: 'block' }}>
                    <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                      Billing Date
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={31}
                      placeholder="15"
                      value={billingDate}
                      onChange={(e) => setBillingDate(e.target.value)}
                      style={textInputStyle}
                    />
                  </label>

                  <label style={{ display: 'block' }}>
                    <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                      Due Date
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={31}
                      placeholder="22"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={textInputStyle}
                    />
                  </label>
                </div>
              </>
            )}

            {err && (
              <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>
                {err}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: '100%',
                padding: '16px',
                background: saving ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none',
                borderRadius: 16,
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.16s ease',
              }}
            >
              {saving ? 'Saving…' : type === 'cash' ? 'Save Wallet' : 'Save Credit Card'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
