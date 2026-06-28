import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'
import { ASSET_GROUPS, type AssetGroupId } from './AssetGroupPicker'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
  initialCategory?: AssetGroupId
}

export function AssetSheet({ open, onClose, onSave, initialCategory }: Props) {
  const [label,   setLabel]   = useState('')
  const [value,   setValue]   = useState('')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  // When sheet opens with a pre-selected group, keep it; otherwise blank
  const [category, setCategory] = useState<AssetGroupId | ''>(initialCategory ?? '')

  useEffect(() => {
    if (open) setCategory(initialCategory ?? '')
  }, [open, initialCategory])

  const reset = () => {
    setLabel(''); setValue(''); setNotes(''); setErr(''); setSaving(false)
    setCategory(initialCategory ?? '')
  }
  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!label.trim())               { setErr('Enter an asset name');    return }
    if (!category)                   { setErr('Select a category');       return }
    if (!value || Number(value) <= 0){ setErr('Enter a valid value');     return }
    try {
      setSaving(true); setErr('')
      await onSave({
        label:    label.trim(),
        category,
        value:    parseFloat(Number(value).toFixed(2)),
        owner:    'Both',          // silent default
        notes:    notes.trim(),
      })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const activeGroup = ASSET_GROUPS.find(g => g.id === category)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="as-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />

          <motion.div
            key="as-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#0d0d0d 0%,#080808 100%)',
              border: '1px solid rgba(110,231,183,0.2)', borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
              maxHeight: '92dvh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header — shows selected group colour */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              {activeGroup && (
                <div style={{ width: 44, height: 44, borderRadius: 14, background: activeGroup.color, border: `1px solid ${activeGroup.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {activeGroup.emoji}
                </div>
              )}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: activeGroup ? activeGroup.text : 'rgba(110,231,183,0.6)', marginBottom: 2 }}>
                  {activeGroup ? activeGroup.label : 'Asset'}
                </p>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>Add Asset</h2>
              </div>
            </div>

            {/* Category chips — in case user wants to switch */}
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Group</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {ASSET_GROUPS.map(g => (
                <motion.button
                  key={g.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setCategory(g.id)}
                  style={{
                    padding: '7px 14px', borderRadius: 100, fontSize: 13, fontWeight: category === g.id ? 700 : 400, cursor: 'pointer',
                    background:   category === g.id ? g.color   : 'rgba(255,255,255,0.04)',
                    border:       category === g.id ? `1px solid ${g.border}` : '1px solid rgba(255,255,255,0.09)',
                    color:        category === g.id ? g.text    : 'rgba(255,255,255,0.45)',
                    transition: 'all 0.14s ease',
                  }}
                >{g.emoji} {g.label}</motion.button>
              ))}
            </div>

            {/* Asset Name */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Asset Name</p>
              <input
                type="text" placeholder="e.g. SBI Savings Account, Bitcoin, Gold Ring"
                value={label} onChange={e => setLabel(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
              />
            </label>

            {/* Value */}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Estimated Value (₹)</p>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={value} onChange={e => setValue(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 26, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
              />
            </label>

            {/* Notes */}
            <label style={{ display: 'block', marginBottom: 22 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Notes (optional)</p>
              <input
                type="text" placeholder="Any additional notes"
                value={notes} onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
              />
            </label>

            {err && (
              <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: '100%', padding: '16px',
                background: saving
                  ? 'rgba(52,211,153,0.2)'
                  : activeGroup
                    ? `linear-gradient(135deg, ${activeGroup.color.replace('0.18', '0.9')}, ${activeGroup.color.replace('0.18', '0.7')})`
                    : 'linear-gradient(135deg,#34d399,#059669)',
                border: 'none', borderRadius: 16,
                color: '#0a0a0a', fontSize: 16, fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 20px rgba(52,211,153,0.3)',
                transition: 'all 0.16s ease',
              }}
            >{saving ? 'Saving…' : 'Save Asset'}</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
