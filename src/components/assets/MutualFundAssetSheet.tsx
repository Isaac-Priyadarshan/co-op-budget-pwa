import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

interface MFResult { schemeCode: string; schemeName: string; fundHouse: string }

const NAV_BAR_HEIGHT = 96

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
}

const accent          = '#a78bfa'
const accentGlow      = 'rgba(167,139,250,0.40)'
const accentBg        = 'rgba(167,139,250,0.07)'
const accentBorder    = 'rgba(167,139,250,0.22)'
const accentSel       = 'rgba(167,139,250,0.18)'
const accentSelBorder = 'rgba(167,139,250,0.55)'

export function MutualFundAssetSheet({ open, onClose, onSave }: Props) {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<MFResult[]>([])
  const [selected,  setSelected]  = useState<MFResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [units,     setUnits]     = useState('')
  const [buyNav,    setBuyNav]    = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = () => {
    setQuery(''); setResults([]); setSelected(null)
    setUnits(''); setBuyNav(''); setNotes('')
    setErr(''); setSaving(false); setSearching(false)
  }

  useEffect(() => { if (!open) reset() }, [open])

  const handleQueryChange = (val: string) => {
    setQuery(val); setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/search-mf?q=${encodeURIComponent(val.trim())}`)
        const j = await r.json() as { results?: MFResult[] }
        setResults(j.results ?? [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
  }

  const handleSelect = (m: MFResult) => { setSelected(m); setQuery(m.schemeName); setResults([]) }

  const handleSubmit = async () => {
    if (!selected)                        { setErr('Search and select a fund');  return }
    if (!units || Number(units) <= 0)     { setErr('Enter number of units');    return }
    if (!buyNav || Number(buyNav) <= 0)   { setErr('Enter buy NAV (₹)');        return }
    const u     = parseFloat(units)
    const nav   = parseFloat(buyNav)
    const value = parseFloat((u * nav).toFixed(2))
    try {
      setSaving(true); setErr('')
      await onSave({
        label:     selected.schemeName,
        category:  'Mutual Fund',
        value,
        owner:     'Both',
        notes:     notes.trim() || null,
        ticker:    selected.schemeCode,
        quantity:  u,
        buy_price: nav,
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
          <motion.div key="mf-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />

          <motion.div key="mf-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: NAV_BAR_HEIGHT,
              left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#0a0614 0%,#060310 100%)',
              border: `1px solid ${accentBorder}`,
              borderBottom: `1px solid rgba(167,139,250,0.10)`,
              borderRadius: '28px 28px 20px 20px',
              display: 'flex', flexDirection: 'column',
              maxHeight: `calc(92dvh - ${NAV_BAR_HEIGHT}px)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '0 20px', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: accentSel, border: `1px solid ${accentSelBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>💰</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: accent, margin: '0 0 2px' }}>Mutual Fund</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>Add MF Holding</h2>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 8px' }}>

              <div style={{ marginBottom: 16, position: 'relative' }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Search Fund</p>
                <input type="text" placeholder="e.g. Mirae Asset, Axis Bluechip…"
                  value={query} onChange={e => handleQueryChange(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: accentBg, border: `1px solid ${selected ? accentSelBorder : accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
                />
                {searching && <p style={{ fontSize: 12, color: accent, marginTop: 6 }}>Searching…</p>}
                {results.length > 0 && !selected && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#0a0614', border: `1px solid ${accentBorder}`, borderRadius: 14, overflow: 'hidden', zIndex: 60, maxHeight: 280, overflowY: 'auto' }}>
                    {results.slice(0, 8).map(m => (
                      <motion.button key={m.schemeCode} whileTap={{ scale: 0.98 }} onClick={() => handleSelect(m)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <span style={{ fontSize: 13, color: '#f5f7ff', fontWeight: 600, textAlign: 'left', lineHeight: 1.3 }}>{m.schemeName}</span>
                        <span style={{ fontSize: 11, color: accent, marginTop: 3 }}>{m.fundHouse}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {selected && (
                <div style={{ marginBottom: 18, padding: '12px 16px', background: accentSel, border: `1px solid ${accentSelBorder}`, borderRadius: 14 }}>
                  <p style={{ fontSize: 13, color: '#f5f7ff', fontWeight: 600, margin: '0 0 3px', lineHeight: 1.3 }}>{selected.schemeName}</p>
                  <p style={{ fontSize: 12, color: accent, margin: 0 }}>{selected.fundHouse}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <label>
                  <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Units</p>
                  <input type="number" inputMode="decimal" placeholder="0.000"
                    value={units} onChange={e => setUnits(e.target.value)}
                    style={{ width: '100%', padding: '13px 14px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: accent, fontSize: 20, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                  />
                </label>
                <label>
                  <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Buy NAV (₹)</p>
                  <input type="number" inputMode="decimal" placeholder="0.00"
                    value={buyNav} onChange={e => setBuyNav(e.target.value)}
                    style={{ width: '100%', padding: '13px 14px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 20, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                  />
                </label>
              </div>

              {units && buyNav && Number(units) > 0 && Number(buyNav) > 0 && (
                <div style={{ marginBottom: 18, padding: '12px 16px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14 }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Total invested value</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                    ₹{(Number(units) * Number(buyNav)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Notes (optional)</p>
                <input type="text" placeholder="Folio number, SIP date…"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
                />
              </label>

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 8, lineHeight: 1.5 }}>📡 NAV syncs daily at midnight via MFAPI — updates current value &amp; P&amp;L.</p>

              {err && (
                <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 8, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
              )}
            </div>

            <div style={{ flexShrink: 0, padding: '12px 20px 16px', borderTop: `1px solid ${accentBorder}`, background: 'linear-gradient(180deg,#0a0614 0%,#060310 100%)' }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={saving}
                style={{ width: '100%', padding: '16px', background: saving ? accentBg : `linear-gradient(135deg,#a78bfa,#7c3aed)`, border: 'none', borderRadius: 16, color: saving ? accent : '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : `0 4px 20px ${accentGlow}`, transition: 'all 0.16s ease' }}
              >{saving ? 'Saving…' : 'Save MF Holding'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
