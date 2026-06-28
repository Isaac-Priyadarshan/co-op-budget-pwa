import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

const ACCOUNT_TYPES = ['Savings', 'Current', 'FD', 'RD', 'NRE', 'NRO'] as const
type AccountType = typeof ACCOUNT_TYPES[number]

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
}

export function BankAssetSheet({ open, onClose, onSave }: Props) {
  const [bankName,    setBankName]    = useState('')
  const [accountType, setAccountType] = useState<AccountType | ''>('')
  const [value,       setValue]       = useState('')
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState('')

  const reset = () => {
    setBankName(''); setAccountType(''); setValue(''); setNotes('')
    setErr(''); setSaving(false)
  }

  useEffect(() => { if (!open) reset() }, [open])

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!bankName.trim())              { setErr('Enter the bank name');    return }
    if (!accountType)                  { setErr('Select an account type'); return }
    if (!value || Number(value) <= 0)  { setErr('Enter a valid value');    return }
    try {
      setSaving(true); setErr('')
      const label = `${bankName.trim()} \u2013 ${accountType}`
      await onSave({
        label,
        category: 'Bank',
        value:    parseFloat(Number(value).toFixed(2)),
        owner:    'Both',
        notes:    notes.trim(),
      })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bank-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />

          {/* Sheet \u2014 flex column: header pinned \u2022 body scrolls \u2022 footer pinned */}
          <motion.div key="bank-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
              border: '1px solid rgba(96,165,250,0.22)', borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              display: 'flex', flexDirection: 'column',
              maxHeight: '92dvh',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26, padding: '0 20px', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0, background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>\u{1F3E6}</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#93c5fd', margin: '0 0 2px' }}>Bank</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>Add Bank Asset</h2>
              </div>
            </div>

            {/* \u2500\u2500 Scrollable body \u2500\u2500 */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 8px' }}>

              {/* Bank Name */}
              <label style={{ display: 'block', marginBottom: 16 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Bank Name</p>
                <input type="text" placeholder="e.g. State Bank of India, HDFC Bank"
                  value={bankName} onChange={e => setBankName(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
                />
              </label>

              {/* Account Type */}
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Account Type</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ACCOUNT_TYPES.map(t => (
                    <motion.button key={t} whileTap={{ scale: 0.92 }} onClick={() => setAccountType(t)}
                      style={{
                        padding: '9px 18px', borderRadius: 100, fontSize: 13,
                        fontWeight: accountType === t ? 700 : 400,
                        background:  accountType === t ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.04)',
                        border:      accountType === t ? '1px solid rgba(96,165,250,0.55)' : '1px solid rgba(255,255,255,0.09)',
                        color:       accountType === t ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer', transition: 'all 0.14s ease',
                      }}
                    >{t}</motion.button>
                  ))}
                </div>
              </div>

              {/* Estimated Value */}
              <label style={{ display: 'block', marginBottom: 18 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Estimated Value (\u20b9)</p>
                <input type="number" inputMode="decimal" placeholder="0.00"
                  value={value} onChange={e => setValue(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 14, color: '#93c5fd', fontSize: 28, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                />
              </label>

              {/* Notes */}
              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Notes (optional)</p>
                <input type="text" placeholder="Branch, account ending, any detail"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
                />
              </label>

              {err && (
                <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 8, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
              )}
            </div>

            {/* \u2500\u2500 Sticky footer \u2014 Save always visible \u2500\u2500 */}
            <div style={{ flexShrink: 0, padding: '12px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', borderTop: '1px solid rgba(96,165,250,0.18)', background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={saving}
                style={{ width: '100%', padding: '16px', background: saving ? 'rgba(96,165,250,0.2)' : 'linear-gradient(135deg, #60a5fa, #3b82f6)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(96,165,250,0.35)', transition: 'all 0.16s ease' }}
              >{saving ? 'Saving\u2026' : 'Save Bank Asset'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
