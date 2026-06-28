import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

interface CryptoResult { id: string; symbol: string; name: string; thumb: string }

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
}

const accent         = '#fb923c'
const accentGlow     = 'rgba(251,146,60,0.40)'
const accentBg       = 'rgba(251,146,60,0.07)'
const accentBorder   = 'rgba(251,146,60,0.22)'
const accentSel      = 'rgba(251,146,60,0.18)'
const accentSelBorder = 'rgba(251,146,60,0.55)'

export function CryptoAssetSheet({ open, onClose, onSave }: Props) {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<CryptoResult[]>([])
  const [selected,  setSelected]  = useState<CryptoResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [qty,       setQty]       = useState('')
  const [buyPrice,  setBuyPrice]  = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = () => {
    setQuery(''); setResults([]); setSelected(null)
    setQty(''); setBuyPrice(''); setNotes('')
    setErr(''); setSaving(false); setSearching(false)
  }

  useEffect(() => { if (!open) reset() }, [open])

  const handleQueryChange = (val: string) => {
    setQuery(val); setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/search-crypto?q=${encodeURIComponent(val.trim())}`)
        const j = await r.json() as { results?: CryptoResult[] }
        setResults(j.results ?? [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
  }

  const handleSelect = (c: CryptoResult) => { setSelected(c); setQuery(c.name); setResults([]) }

  const handleSubmit = async () => {
    if (!selected)                          { setErr('Search and select a coin');    return }
    if (!qty || Number(qty) <= 0)           { setErr('Enter quantity of coins');     return }
    if (!buyPrice || Number(buyPrice) <= 0) { setErr('Enter buy price per coin (\u20b9)'); return }
    const coins = parseFloat(qty)
    const price = parseFloat(buyPrice)
    const value = parseFloat((coins * price).toFixed(2))
    try {
      setSaving(true); setErr('')
      await onSave({
        label:     `${selected.name} (${selected.symbol.toUpperCase()})`,
        category:  'Crypto',
        value,
        owner:     'Both',
        notes:     notes.trim() || null,
        ticker:    selected.id,
        quantity:  coins,
        buy_price: price,
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
          <motion.div key="cr-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />

          {/* Sheet \u2014 flex column */}
          <motion.div key="cr-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#0f0700 0%,#080400 100%)',
              border: `1px solid ${accentBorder}`, borderBottom: 'none',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '0 20px', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: accentSel, border: `1px solid ${accentSelBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>\ud83e\ude99</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: accent, margin: '0 0 2px' }}>Crypto</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>Add Crypto Holding</h2>
              </div>
            </div>

            {/* \u2500\u2500 Scrollable body \u2500\u2500 */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 8px' }}>

              {/* Search */}
              <div style={{ marginBottom: 16, position: 'relative' }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Search Coin</p>
                <input type="text" placeholder="e.g. Bitcoin, Ethereum, Solana\u2026"
                  value={query} onChange={e => handleQueryChange(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: accentBg, border: `1px solid ${selected ? accentSelBorder : accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
                />
                {searching && <p style={{ fontSize: 12, color: accent, marginTop: 6 }}>Searching\u2026</p>}
                {results.length > 0 && !selected && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#0f0700', border: `1px solid ${accentBorder}`, borderRadius: 14, overflow: 'hidden', zIndex: 60, maxHeight: 280, overflowY: 'auto' }}>
                    {results.map(c => (
                      <motion.button key={c.id} whileTap={{ scale: 0.98 }} onClick={() => handleSelect(c)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {c.thumb && <img src={c.thumb} alt={c.name} width={24} height={24} style={{ borderRadius: 6 }} />}
                        <span style={{ fontSize: 14, color: '#f5f7ff', fontWeight: 600, textAlign: 'left', flex: 1 }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{c.symbol.toUpperCase()}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '8px 14px', background: accentSel, border: `1px solid ${accentSelBorder}`, borderRadius: 100 }}>
                  {selected.thumb && <img src={selected.thumb} alt={selected.name} width={20} height={20} style={{ borderRadius: 4 }} />}
                  <span style={{ fontSize: 13, color: accent, fontWeight: 700 }}>{selected.symbol.toUpperCase()}</span>
                  <span style={{ fontSize: 13, color: '#f5f7ff', flex: 1 }}>{selected.name}</span>
                  <button onClick={() => { setSelected(null); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>\u00d7</button>
                </div>
              )}

              {/* Qty + Buy Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <label>
                  <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Quantity</p>
                  <input type="number" inputMode="decimal" placeholder="0.000"
                    value={qty} onChange={e => setQty(e.target.value)}
                    style={{ width: '100%', padding: '13px 14px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: accent, fontSize: 20, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                  />
                </label>
                <label>
                  <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Buy Price (\u20b9)</p>
                  <input type="number" inputMode="decimal" placeholder="0.00"
                    value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
                    style={{ width: '100%', padding: '13px 14px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 20, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                  />
                </label>
              </div>

              {qty && buyPrice && Number(qty) > 0 && Number(buyPrice) > 0 && (
                <div style={{ marginBottom: 18, padding: '12px 16px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14 }}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Total invested value</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                    \u20b9{(Number(qty) * Number(buyPrice)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Notes (optional)</p>
                <input type="text" placeholder="Exchange, wallet address\u2026"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
                />
              </label>

              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 8, lineHeight: 1.5 }}>\ud83d\udce1 Live price syncs daily at midnight via CoinGecko \u2014 updates value &amp; P&amp;L.</p>

              {err && (
                <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 8, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
              )}
            </div>

            {/* \u2500\u2500 Sticky footer \u2500\u2500 */}
            <div style={{ flexShrink: 0, padding: '12px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', borderTop: `1px solid ${accentBorder}`, background: 'linear-gradient(180deg,#0f0700 0%,#080400 100%)' }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={saving}
                style={{ width: '100%', padding: '16px', background: saving ? accentBg : `linear-gradient(135deg,#f97316,#c2410c)`, border: 'none', borderRadius: 16, color: saving ? accent : '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : `0 4px 20px ${accentGlow}`, transition: 'all 0.16s ease' }}
              >{saving ? 'Saving\u2026' : 'Save Crypto Holding'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
