import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import type { AppUser } from '../../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'borrowed' | 'lent'
  onAdd: (data: { person: string; amount: number; description: string; actor: AppUser }) => Promise<void>
}

export function PersonEntrySheet({ open, onClose, mode, onAdd }: Props) {
  const { activeUser } = useUser()
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => { setPerson(''); setAmount(''); setDescription(''); setErr(''); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!person.trim()) { setErr('Enter a person name'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setErr('Enter a valid amount'); return }
    if (!description.trim()) { setErr('Enter a description'); return }
    if (!activeUser) { setErr('No active user'); return }
    try {
      setSaving(true); setErr('')
      await onAdd({ person: person.trim(), amount: parseFloat(Number(amount).toFixed(2)), description: description.trim(), actor: activeUser })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const isBorrowed = mode === 'borrowed'
  const accent = isBorrowed ? { color: '#fca5a5', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', glow: 'rgba(248,113,113,0.35)' }
    : { color: '#6ee7b7', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)', glow: 'rgba(52,211,153,0.3)' }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 40 }}
          />
          <motion.div key="sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#0e1024 0%,#090c1c 100%)',
              border: `1px solid ${accent.border}`, borderBottom: 'none',
              borderRadius: '28px 28px 0 0', padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
              maxHeight: '88dvh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f5f7ff', marginBottom: 6, letterSpacing: '-0.02em' }}>
              {isBorrowed ? '↓ Record Borrowed' : '↑ Record Lent'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
              {isBorrowed ? 'Money you borrowed from someone' : 'Money you lent to someone'}
            </p>

            {[{ label: isBorrowed ? 'Borrowed from' : 'Lent to', value: person, set: setPerson, placeholder: 'Person name', type: 'text' },
              { label: 'Amount (₹)', value: amount, set: setAmount, placeholder: '0.00', type: 'number' },
              { label: 'Description', value: description, set: setDescription, placeholder: 'What was this for?', type: 'text' },
            ].map(field => (
              <label key={field.label} style={{ display: 'block', marginBottom: 14 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{field.label}</p>
                <input
                  type={field.type} inputMode={field.type === 'number' ? 'decimal' : 'text'}
                  placeholder={field.placeholder} value={field.value}
                  onChange={e => field.set(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: field.type === 'number' ? 22 : 15, fontWeight: field.type === 'number' ? 700 : 400, outline: 'none' }}
                />
              </label>
            ))}

            {err && <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>}

            <button onClick={handleSubmit} disabled={saving}
              style={{ width: '100%', padding: '16px', background: saving ? 'rgba(99,102,241,0.3)' : `linear-gradient(135deg,${accent.color},${isBorrowed ? '#f87171' : '#34d399'})`, border: 'none', borderRadius: 16, color: saving ? 'rgba(255,255,255,0.5)' : '#0a0a0a', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : `0 4px 20px ${accent.glow}`, transition: 'all 0.16s ease' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
