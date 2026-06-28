import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

interface StockResult { symbol: string; name: string; exchange: string }

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
}

const accent      = '#22d3ee'   // cyan — Stock
const accentGlow  = 'rgba(34,211,238,0.35)'
const accentBg    = 'rgba(34,211,238,0.07)'
const accentBorder = 'rgba(34,211,238,0.22)'
const accentSel   = 'rgba(34,211,238,0.18)'
const accentSelBorder = 'rgba(34,211,238,0.55)'

export function StockAssetSheet({ open, onClose, onSave }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<StockResult[]>([])
  const [selected, setSelected] = useState<StockResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [qty,      setQty]      = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = () => {
    setQuery(''); setResults([]); setSelected(null)
    setQty(''); setBuyPrice(''); setNotes('')
    setErr(''); setSaving(false); setSearching(false)
  }

  useEffect(() => { if (!open) reset() }, [open])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/search-stock?q=${encodeURIComponent(val.trim())}`)
        const j = await r.json() as { results?: StockResult[] }
        setResults(j.results ?? [])
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 400)
  }

  const handleSelect = (s: StockResult) => {
    setSelected(s)
    setQuery(s.name)
    setResults([])
  }

  const handleSubmit = async () => {
    if (!selected)                              { setErr('Search and select a stock'); return }
    if (!qty || Number(qty) <= 0)               { setErr('Enter number of shares');   return }
    if (!buyPrice || Number(buyPrice) <= 0)     { setErr('Enter buy price per share'); return }
    const shares   = parseFloat(qty)
    const price    = parseFloat(buyPrice)
    const value    = parseFloat((shares * price).toFixed(2))
    try {
      setSaving(true); setErr('')
      await onSave({
        label:     `${selected.name} (${selected.symbol})`,
        category:  'Stock',
        value,
        owner:     'Both',
        notes:     notes.trim() || null,
        ticker:    selected.symbol,
        quantity:  shares,
        buy_price: price,
      })
      reset(); onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="st-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />
          <motion.div key="st-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#00080f 0%,#000608 100%)',
              border: `1px solid ${accentBorder}`, borderBottom: 'none',
              borderRadius: '28px 28px 0 0', padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
              maxHeight: '92dvh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: accentSel, border: `1px solid ${accentSelBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📈</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: accent, margin: '0 0 2px' }}>Stock</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>Add Stock Holding</h2>
              </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Search Stock (NSE / BSE)</p>
              <input
                type="text" placeholder="e.g. Reliance, HDFC Bank, Infosys…"
                value={query} onChange={e => handleQueryChange(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: accentBg, border: `1px solid ${selected ? accentSelBorder : accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
              />
              {searching && (
                <p style={{ fontSize: 12, color: accent, marginTop: 6 }}>Searching…</p>
              )}
              {/* Dropdown */}
              {results.length > 0 && !selected && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#0a0f14', border: `1px solid ${accentBorder}`, borderRadius: 14, overflow: 'hidden', zIndex: 60 }}>
                  {results.map(s => (
                    <motion.button key={s.symbol} whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(s)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span style={{ fontSize: 14, color: '#f5f7ff', fontWeight: 600, textAlign: 'left' }}>{s.name}</span>
                      <span style={{ fontSize: 11, color: accent, fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>{s.symbol} · {s.exchange}</span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected pill */}
            {selected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, padding: '8px 14px', background: accentSel, border: `1px solid ${accentSelBorder}`, borderRadius: 100 }}>
                <span style={{ fontSize: 13, color: accent, fontWeight: 700 }}>{selected.symbol}</span>
                <span style={{ fontSize: 13, color: '#f5f7ff' }}>{selected.name}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>{selected.exchange}</span>
                <button onClick={() => { setSelected(null); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: '0 0 0 4px' }}>×</button>
              </div>
            )}

            {/* Qty + Buy Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <label style={{ display: 'block' }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Shares</p>
                <input type="number" inputMode="decimal" placeholder="0"
                  value={qty} onChange={e => setQty(e.target.value)}
                  style={{ width: '100%', padding: '13px 14px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: accent, fontSize: 20, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                />
              </label>
              <label style={{ display: 'block' }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Buy Price (₹)</p>
                <input type="number" inputMode="decimal" placeholder="0.00"
                  value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
                  style={{ width: '100%', padding: '13px 14px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 20, fontWeight: 800, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                />
              </label>
            </div>

            {/* Computed value preview */}
            {qty && buyPrice && Number(qty) > 0 && Number(buyPrice) > 0 && (
              <div style={{ marginBottom: 18, padding: '12px 16px', background: 'rgba(34,211,238,0.05)', border: `1px solid ${accentBorder}`, borderRadius: 14 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Total invested value</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                  ₹{(Number(qty) * Number(buyPrice)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {/* Notes */}
            <label style={{ display: 'block', marginBottom: 24 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Notes (optional)</p>
              <input type="text" placeholder="Broker, demat account, notes…"
                value={notes} onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none' }}
              />
            </label>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 18, lineHeight: 1.5 }}>
              📡 Live price sync runs daily at midnight IST. Current market value and P&amp;L will auto-update.
            </p>

            {err && (
              <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
            )}

            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={saving}
              style={{ width: '100%', padding: '16px', background: saving ? accentBg : `linear-gradient(135deg,#22d3ee,#0891b2)`, border: 'none', borderRadius: 16, color: saving ? accent : '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : `0 4px 20px ${accentGlow}`, transition: 'all 0.16s ease' }}
            >{saving ? 'Saving…' : 'Save Stock Holding'}</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
