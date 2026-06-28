import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

type Metal = 'Gold' | 'Silver' | 'Platinum'
type MetalForm = 'Coin' | 'Bar' | 'Jewellery' | 'Biscuit' | 'ETF'

const METALS: { id: Metal; emoji: string; accent: string; glow: string; bg: string; border: string; selBorder: string; gradient: string }[] = [
  { id: 'Gold',     emoji: '🥇', accent: '#fbbf24', glow: 'rgba(251,191,36,0.40)',  bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.22)', selBorder: 'rgba(251,191,36,0.6)',  gradient: 'linear-gradient(135deg,#fbbf24,#d97706)' },
  { id: 'Silver',   emoji: '🥈', accent: '#94a3b8', glow: 'rgba(148,163,184,0.40)', bg: 'rgba(148,163,184,0.07)', border: 'rgba(148,163,184,0.22)', selBorder: 'rgba(148,163,184,0.6)', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)' },
  { id: 'Platinum', emoji: '💎', accent: '#7dd3fc', glow: 'rgba(125,211,252,0.40)', bg: 'rgba(125,211,252,0.07)', border: 'rgba(125,211,252,0.22)', selBorder: 'rgba(125,211,252,0.6)', gradient: 'linear-gradient(135deg,#7dd3fc,#0284c7)' },
]

const FORMS: MetalForm[] = ['Coin', 'Bar', 'Biscuit', 'Jewellery', 'ETF']

const METAL_TICKER: Record<Metal, string> = {
  Gold:     'gold_gram_inr',
  Silver:   'silver_gram_inr',
  Platinum: 'platinum_gram_inr',
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
}

export function PreciousMetalAssetSheet({ open, onClose, onSave }: Props) {
  const [step,    setStep]    = useState<'pick' | 'form'>('pick')
  const [metal,   setMetal]   = useState<Metal | null>(null)
  const [form,    setForm]    = useState<MetalForm | ''>('')
  const [grams,   setGrams]   = useState('')
  const [buyRate, setBuyRate] = useState('')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const meta = METALS.find(m => m.id === metal) ?? METALS[0]

  const reset = () => {
    setStep('pick'); setMetal(null); setForm('')
    setGrams(''); setBuyRate(''); setNotes('')
    setErr(''); setSaving(false)
  }

  useEffect(() => { if (!open) reset() }, [open])

  const handleMetalSelect = (m: Metal) => { setMetal(m); setStep('form') }

  const handleSubmit = async () => {
    if (!metal)                           { setErr('Select a metal');              return }
    if (!form)                            { setErr('Select a form');               return }
    if (!grams || Number(grams) <= 0)     { setErr('Enter weight in grams');       return }
    if (!buyRate || Number(buyRate) <= 0) { setErr('Enter buy rate per gram (₹)'); return }
    const g = parseFloat(grams)
    const r = parseFloat(buyRate)
    const value = parseFloat((g * r).toFixed(2))
    try {
      setSaving(true); setErr('')
      await onSave({
        label:     `${metal} ${form} – ${g}g`,
        category:  'Precious Metal',
        value,
        owner:     'Both',
        notes:     notes.trim() || null,
        ticker:    METAL_TICKER[metal],
        quantity:  g,
        buy_price: r,
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
          <motion.div key="pm-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />

          <motion.div key="pm-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: 'var(--nav-h, 100px)',
              left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#0a0900 0%,#060500 100%)',
              border: `1px solid ${meta.border}`,
              borderBottom: 'none',
              borderRadius: '28px 28px 20px 20px',
              display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(92dvh - var(--nav-h, 100px))',
              transition: 'border-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '0 20px', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: meta.bg, border: `1px solid ${meta.selBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, transition: 'all 0.3s ease' }}>
                {metal ? meta.emoji : '🏅'}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: metal ? meta.accent : 'rgba(255,255,255,0.4)', margin: '0 0 2px', transition: 'color 0.3s ease' }}>Precious Metal</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>
                  {step === 'pick' ? 'Select Metal' : `Add ${metal}`}
                </h2>
              </div>
              {step === 'form' && (
                <button onClick={() => setStep('pick')}
                  style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}
                >← Back</button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px' }}>

              {step === 'pick' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
                  {METALS.map(m => (
                    <motion.button key={m.id} whileTap={{ scale: 0.97 }}
                      onClick={() => handleMetalSelect(m.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 20, background: m.bg, border: `1px solid ${m.border}`, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 32 }}>{m.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 17, fontWeight: 800, color: m.accent, margin: '0 0 3px' }}>{m.id}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Track grams · syncs live price daily</p>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={m.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </motion.button>
                  ))}
                </div>
              )}

              {step === 'form' && metal && (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Form</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {FORMS.map(f => (
                        <motion.button key={f} whileTap={{ scale: 0.92 }} onClick={() => setForm(f)}
                          style={{ padding: '9px 16px', borderRadius: 100, fontSize: 13, fontWeight: form === f ? 700 : 400, background: form === f ? meta.bg : 'rgba(255,255,255,0.04)', border: form === f ? `1px solid ${meta.selBorder}` : '1px solid rgba(255,255,255,0.09)', color: form === f ? meta.accent : 'rgba(255,255,255,0.45)', cursor: 'pointer', transition: 'all 0.14s ease' }}
                        >{f}</motion.button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                    <label>
                      <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Weight (grams)</p>
                      <input type="number" inputMode="decimal" placeholder="0.000"
                        value={grams} onChange={e => setGrams(e.target.value)}
                        style={{ width: '100%', padding: '13px 14px', background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 14, color: meta.accent, fontSize: 20, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </label>
                    <label>
                      <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Buy Rate (₹/g)</p>
                      <input type="number" inputMode="decimal" placeholder="0.00"
                        value={buyRate} onChange={e => setBuyRate(e.target.value)}
                        style={{ width: '100%', padding: '13px 14px', background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 14, color: '#f5f7ff', fontSize: 20, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </label>
                  </div>

                  {grams && buyRate && Number(grams) > 0 && Number(buyRate) > 0 && (
                    <div style={{ marginBottom: 18, padding: '12px 16px', background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 14 }}>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Total invested value</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: meta.accent, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                        ₹{(Number(grams) * Number(buyRate)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  <label style={{ display: 'block', marginBottom: 20 }}>
                    <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Notes (optional)</p>
                    <input type="text" placeholder="Jeweller, hallmark, locker location…"
                      value={notes} onChange={e => setNotes(e.target.value)}
                      style={{ width: '100%', padding: '13px 16px', background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
                    />
                  </label>

                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 8, lineHeight: 1.5 }}>📡 Daily midnight sync pulls live {metal.toLowerCase()} price in INR and updates your value + P&amp;L.</p>

                  {err && (
                    <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 8, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
                  )}
                </>
              )}
            </div>

            {step === 'form' && metal && (
              <div style={{ flexShrink: 0, padding: '12px 20px 16px', borderTop: `1px solid ${meta.border}`, background: 'linear-gradient(180deg,#0a0900 0%,#060500 100%)' }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={saving}
                  style={{ width: '100%', padding: '16px', background: saving ? meta.bg : meta.gradient, border: 'none', borderRadius: 16, color: saving ? meta.accent : '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : `0 4px 20px ${meta.glow}`, transition: 'all 0.16s ease' }}
                >{saving ? 'Saving…' : `Save ${metal} Asset`}</motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
