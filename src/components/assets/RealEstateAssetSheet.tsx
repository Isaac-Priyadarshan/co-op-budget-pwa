import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

const PROPERTY_TYPES = [
  'Apartment',
  'Villa',
  'Independent House',
  'Plot / Land',
  'Farm Land',
  'Commercial Space',
  'Office',
  'Shop',
  'Warehouse',
  'Other',
] as const
type PropertyType = typeof PROPERTY_TYPES[number]

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
}

export function RealEstateAssetSheet({ open, onClose, onSave }: Props) {
  const [assetName,    setAssetName]    = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType | ''>('')
  const [value,        setValue]        = useState('')
  const [notes,        setNotes]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState('')

  const reset = () => {
    setAssetName(''); setPropertyType(''); setValue(''); setNotes('')
    setErr(''); setSaving(false)
  }

  useEffect(() => { if (!open) reset() }, [open])

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!assetName.trim())             { setErr('Enter the asset name');       return }
    if (!propertyType)                 { setErr('Select a property type');     return }
    if (!value || Number(value) <= 0)  { setErr('Enter a valid value');        return }
    try {
      setSaving(true); setErr('')
      const label = `${assetName.trim()} – ${propertyType}`
      await onSave({
        label,
        category: 'Real Estate',
        value:    parseFloat(Number(value).toFixed(2)),
        owner:    'Both',
        notes:    notes.trim(),
      })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Real Estate accent: warm orange #fb923c
  const accent      = '#fb923c'
  const accentGlow  = 'rgba(251,146,60,0.40)'
  const accentBg    = 'rgba(251,146,60,0.08)'
  const accentBorder = 'rgba(251,146,60,0.22)'
  const accentSel   = 'rgba(251,146,60,0.22)'
  const accentSelBorder = 'rgba(251,146,60,0.55)'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="re-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              zIndex: 40,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="re-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg, #0f0a05 0%, #080604 100%)',
              border: `1px solid ${accentBorder}`, borderBottom: 'none',
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

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                background: accentSel, border: `1px solid ${accentSelBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>🏠</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: accent, margin: '0 0 2px' }}>Real Estate</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>Add Property</h2>
              </div>
            </div>

            {/* Asset Name */}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Asset Name</p>
              <input
                type="text"
                placeholder="e.g. OMR Plot, Anna Nagar Flat, Farm Land"
                value={assetName}
                onChange={e => setAssetName(e.target.value)}
                style={{
                  width: '100%', padding: '13px 16px',
                  background: accentBg, border: `1px solid ${accentBorder}`,
                  borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none',
                }}
              />
            </label>

            {/* Property Type */}
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Property Type</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PROPERTY_TYPES.map(t => (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setPropertyType(t)}
                    style={{
                      padding: '9px 16px', borderRadius: 100, fontSize: 13,
                      fontWeight: propertyType === t ? 700 : 400,
                      background:  propertyType === t ? accentSel   : 'rgba(255,255,255,0.04)',
                      border:      propertyType === t ? `1px solid ${accentSelBorder}` : '1px solid rgba(255,255,255,0.09)',
                      color:       propertyType === t ? accent      : 'rgba(255,255,255,0.45)',
                      cursor: 'pointer', transition: 'all 0.14s ease',
                    }}
                  >{t}</motion.button>
                ))}
              </div>
            </div>

            {/* Estimated Value */}
            <label style={{ display: 'block', marginBottom: 18 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Estimated Value (₹)</p>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={value} onChange={e => setValue(e.target.value)}
                style={{
                  width: '100%', padding: '13px 16px',
                  background: accentBg, border: `1px solid ${accentBorder}`,
                  borderRadius: 14, color: accent, fontSize: 28, fontWeight: 800,
                  outline: 'none', fontVariantNumeric: 'tabular-nums',
                }}
              />
            </label>

            {/* Notes */}
            <label style={{ display: 'block', marginBottom: 24 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Notes (optional)</p>
              <input
                type="text" placeholder="Location, sq.ft, registration detail…"
                value={notes} onChange={e => setNotes(e.target.value)}
                style={{
                  width: '100%', padding: '13px 16px',
                  background: accentBg, border: `1px solid ${accentBorder}`,
                  borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none',
                }}
              />
            </label>

            {/* Error */}
            {err && (
              <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
            )}

            {/* Save */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: '100%', padding: '16px',
                background: saving ? accentBg : `linear-gradient(135deg, #fb923c, #ea580c)`,
                border: 'none', borderRadius: 16,
                color: saving ? accent : '#fff',
                fontSize: 16, fontWeight: 800,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : `0 4px 20px ${accentGlow}`,
                transition: 'all 0.16s ease',
              }}
            >{saving ? 'Saving…' : 'Save Real Estate Asset'}</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
