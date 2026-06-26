import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AppUser } from '../../lib/types'
import type { NewWallet } from '../../lib/db'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (w: NewWallet) => Promise<void>
}

export function WalletSheet({ open, onClose, onSave }: Props) {
  const [owner, setOwner] = useState<AppUser>('Isaac')
  const [type, setType] = useState<'cash' | 'credit'>('cash')
  const [label, setLabel] = useState('')
  const [balance, setBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setLabel(''); setBalance(''); setErr(''); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!label.trim()) { setErr('Enter a label (e.g. Paytm, HDFC Credit)'); return }
    if (!balance || isNaN(Number(balance))) { setErr('Enter a valid balance'); return }
    try {
      setSaving(true); setErr('')
      await onSave({ owner, type, label: label.trim(), balance: parseFloat(Number(balance).toFixed(2)) })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }} />
          <motion.div key="sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'linear-gradient(180deg,#0e1024 0%,#090c1c 100%)', border: '1px solid rgba(99,102,241,0.25)', borderBottom: 'none', borderRadius: '28px 28px 0 0', padding: '0 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)', maxHeight: '88dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f5f7ff', marginBottom: 20, letterSpacing: '-0.02em' }}>Add Wallet / Card</h2>

            {/* Owner toggle */}
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Owner</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['Isaac', 'Jenifa'] as AppUser[]).map(u => (
                <button key={u} onClick={() => setOwner(u)}
                  style={{ padding: '11px', borderRadius: 14, border: owner === u ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.08)', background: owner === u ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)', color: owner === u ? '#c4b5fd' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s ease' }}
                >{u}</button>
              ))}
            </div>

            {/* Type toggle */}
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Type</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['cash', 'credit'] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  style={{ padding: '11px', borderRadius: 14, border: type === t ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)', background: type === t ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', color: type === t ? '#a5b4fc' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.14s ease' }}
                >{t === 'cash' ? '💵 Cash' : '💳 Credit'}</button>
              ))}
            </div>

            {[{ label: 'Label', value: label, set: setLabel, placeholder: type === 'cash' ? 'e.g. Paytm, Wallet' : 'e.g. HDFC Credit, SBI Card' },
              { label: type === 'credit' ? 'Outstanding Balance (₹)' : 'Balance (₹)', value: balance, set: setBalance, placeholder: '0.00' },
            ].map(f => (
              <label key={f.label} style={{ display: 'block', marginBottom: 14 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{f.label}</p>
                <input type={f.label.includes('₹') ? 'number' : 'text'} inputMode={f.label.includes('₹') ? 'decimal' : 'text'} placeholder={f.placeholder} value={f.value}
                  onChange={e => f.set(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: f.label.includes('₹') ? 22 : 15, fontWeight: f.label.includes('₹') ? 700 : 400, outline: 'none' }}
                />
              </label>
            ))}

            {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}

            <button onClick={handleSubmit} disabled={saving}
              style={{ width: '100%', padding: '16px', background: saving ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)', transition: 'all 0.16s ease' }}
            >
              {saving ? 'Saving…' : 'Save Wallet'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
