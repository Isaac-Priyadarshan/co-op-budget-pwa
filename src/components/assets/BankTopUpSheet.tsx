import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

const inputStyle = {
  width: '100%', padding: '13px 16px',
  background: 'rgba(96,165,250,0.06)',
  border: '1px solid rgba(96,165,250,0.2)',
  borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none',
  boxSizing: 'border-box' as const,
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
  /** Pre-filled from the root bank asset */
  bankLabel: string   // e.g. "SBI – FD"
  rate: number        // annual interest rate from root
}

export function BankTopUpSheet({ open, onClose, onSave, bankLabel, rate }: Props) {
  const [amount,  setAmount]  = useState('')
  const [date,    setDate]    = useState('')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const reset = () => { setAmount(''); setDate(''); setNotes(''); setErr(''); setSaving(false) }

  useEffect(() => { if (!open) reset() }, [open])

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid top-up amount'); return }
    if (!date)                          { setErr('Select the top-up date');       return }

    try {
      setSaving(true); setErr('')

      // Pack rate + topup-date + optional note into notes field
      const metaParts = [`${rate.toFixed(2)}%`, `From ${date}`, 'top-up']
      const notesStr  = notes.trim()
        ? [...metaParts, notes.trim()].join(' · ')
        : metaParts.join(' · ')

      await onSave({
        label:    bankLabel,   // same label as root so grouping works
        category: 'Bank',
        value:    parseFloat(Number(amount).toFixed(2)),
        owner:    'Both',
        notes:    notesStr,
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
          <motion.div key="topup-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              zIndex: 40,
            }}
          />

          <motion.div key="topup-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: 'var(--nav-h, 100px)',
              left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
              border: '1px solid rgba(96,165,250,0.22)',
              borderBottom: '1px solid rgba(96,165,250,0.10)',
              borderRadius: '28px 28px 20px 20px',
              display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(92dvh - var(--nav-h, 100px))',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26, padding: '0 20px', flexShrink: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>🏦</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#93c5fd', margin: '0 0 2px' }}>Top-Up</p>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>
                  {bankLabel}
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(147,197,253,0.6)', margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {rate.toFixed(2)}% p.a. · Interest auto-applied
                </p>
              </div>
            </div>

            {/* Fields */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 8px' }}>

              {/* Amount */}
              <label style={{ display: 'block', marginBottom: 18 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Top-Up Amount (₹)
                </p>
                <input
                  type="number" inputMode="decimal" placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ ...inputStyle, color: '#93c5fd', fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
                />
              </label>

              {/* Date */}
              <label style={{ display: 'block', marginBottom: 18 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Top-Up Date
                </p>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </label>

              {/* Notes optional */}
              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Notes <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </p>
                <input
                  type="text" placeholder="Any detail about this deposit"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={inputStyle}
                />
              </label>

              {err && (
                <p style={{
                  fontSize: 13, color: '#fca5a5', marginBottom: 8,
                  padding: '10px 14px', background: 'rgba(248,113,113,0.1)',
                  borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)',
                }}>{err}</p>
              )}
            </div>

            {/* Save button */}
            <div style={{
              flexShrink: 0, padding: '12px 20px 16px',
              borderTop: '1px solid rgba(96,165,250,0.18)',
              background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
            }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={saving}
                style={{
                  width: '100%', padding: '16px',
                  background: saving ? 'rgba(96,165,250,0.2)' : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                  border: 'none', borderRadius: 16,
                  color: '#fff', fontSize: 16, fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : '0 4px 20px rgba(96,165,250,0.35)',
                  transition: 'all 0.16s ease',
                }}
              >{saving ? 'Saving…' : 'Add Top-Up'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
