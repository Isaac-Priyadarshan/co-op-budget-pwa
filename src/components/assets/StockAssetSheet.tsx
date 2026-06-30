import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

interface StockResult { symbol: string; name: string; exchange: string }

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
}

const accent          = '#22d3ee'
const accentGlow      = 'rgba(34,211,238,0.35)'
const accentBg        = 'rgba(34,211,238,0.07)'
const accentBorder    = 'rgba(34,211,238,0.22)'
const accentSel       = 'rgba(34,211,238,0.18)'
const accentSelBorder = 'rgba(34,211,238,0.55)'

const inputStyle = {
  width: '100%', padding: '13px 16px',
  background: accentBg,
  border: `1px solid ${accentBorder}`,
  borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none',
  boxSizing: 'border-box' as const,
}

export function StockAssetSheet({ open, onClose, onSave }: Props) {
  const [query,        setQuery]        = useState('')
  const [results,      setResults]      = useState<StockResult[]>([])
  const [selected,     setSelected]     = useState<StockResult | null>(null)
  const [searching,    setSearching]    = useState(false)
  const [qty,          setQty]          = useState('')
  const [buyPrice,     setBuyPrice]     = useState('')
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [notes,        setNotes]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = () => {
    setQuery(''); setResults([]); setSelected(null)
    setQty(''); setBuyPrice(''); setCurrentPrice(null)
    setNotes(''); setErr(''); setSaving(false); setSearching(false)
  }
  useEffect(() => { if (!open) reset() }, [open])

  // Fetch live price whenever a stock is selected
  useEffect(() => {
    if (!selected) { setCurrentPrice(null); return }
    let cancelled = false
    setPriceLoading(true)
    fetch(`/api/stock-price?symbol=${encodeURIComponent(selected.symbol)}`)
      .then(r => r.json())
      .then((j: { price?: number }) => { if (!cancelled) setCurrentPrice(j.price ?? null) })
      .catch(() => { if (!cancelled) setCurrentPrice(null) })
      .finally(() => { if (!cancelled) setPriceLoading(false) })
    return () => { cancelled = true }
  }, [selected])

  const handleQueryChange = (val: string) => {
    setQuery(val); setSelected(null); setCurrentPrice(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/search-stock?q=${encodeURIComponent(val.trim())}`)
        const j = await r.json() as { results?: StockResult[] }
        setResults(j.results ?? [])
      } catch { setResults([]) } finally { setSearching(false) }
    }, 400)
  }

  const handleSelect = (s: StockResult) => { setSelected(s); setQuery(s.name); setResults([]) }

  const handleSubmit = async () => {
    if (!selected)                          { setErr('Search and select a stock');   return }
    if (!qty || Number(qty) <= 0)           { setErr('Enter number of shares');      return }
    if (!buyPrice || Number(buyPrice) <= 0) { setErr('Enter buy price per share');   return }
    const shares = parseFloat(qty), price = parseFloat(buyPrice)
    const value = parseFloat((shares * price).toFixed(2))
    try {
      setSaving(true); setErr('')
      await onSave({
        label:         `${selected.name} (${selected.symbol})`,
        category:      'Stock',
        value,
        owner:         'Both',
        notes:         notes.trim() || null,
        ticker:        selected.symbol,
        quantity:      shares,
        buy_price:     price,
        current_price: currentPrice ?? undefined,
      })
      reset(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div key="st-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              zIndex: 40,
            }}
          />

          {/* Sheet — flush to bottom */}
          <motion.div key="st-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#00080f 0%,#000608 100%)',
              border: `1px solid ${accentBorder}`,
              borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              display: 'flex', flexDirection: 'column',
              maxHeight: '92dvh',
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
                background: accentSel, border: `1px solid ${accentSelBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>📈</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: accent, margin: '0 0 2px' }}>Stock</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', margin: 0 }}>Add Stock Holding</h2>
              </div>
            </div>

            {/* Scrollable fields */}
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 8px' }}>

              {/* Search */}
              <div style={{ marginBottom: 16, position: 'relative' }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Search Stock (NSE / BSE)
                </p>
                <input
                  type="text"
                  placeholder="e.g. Reliance, HDFC Bank, Infosys…"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  style={inputStyle}
                />
                {/* Dropdown results */}
                {results.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                    background: '#001018',
                    border: `1px solid ${accentBorder}`,
                    borderRadius: 14, marginTop: 4,
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    {results.map(s => (
                      <button key={s.symbol} onClick={() => handleSelect(s)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 14px', background: 'transparent',
                          border: 'none', borderBottom: `1px solid rgba(255,255,255,0.06)`,
                          color: '#f5f7ff', cursor: 'pointer', fontSize: 14,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: accent }}>{s.symbol}</span>
                        <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.6)' }}>{s.name}</span>
                        <span style={{ float: 'right', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{s.exchange}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searching && (
                  <p style={{ fontSize: 12, color: accent, marginTop: 6 }}>Searching…</p>
                )}
              </div>

              {/* Live price badge */}
              {selected && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px',
                  background: accentBg, border: `1px solid ${accentBorder}`,
                  borderRadius: 12, fontSize: 13, color: '#f5f7ff',
                }}>
                  {priceLoading
                    ? <span style={{ color: accent }}>Fetching live price…</span>
                    : currentPrice != null
                      ? <span>Live price: <strong style={{ color: accent }}>₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                      : <span style={{ color: 'rgba(255,255,255,0.4)' }}>Live price unavailable</span>
                  }
                </div>
              )}

              {/* Shares */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Number of Shares
                </p>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Buy price */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Buy Price per Share (₹)
                </p>
                <input
                  type="number"
                  placeholder="e.g. 2450.00"
                  value={buyPrice}
                  onChange={e => setBuyPrice(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Total value preview */}
              {qty && buyPrice && Number(qty) > 0 && Number(buyPrice) > 0 && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px',
                  background: 'rgba(34,211,238,0.05)', border: `1px solid ${accentBorder}`,
                  borderRadius: 12, fontSize: 13,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total value: </span>
                  <strong style={{ color: accent }}>
                    ₹{(parseFloat(qty) * parseFloat(buyPrice)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                  Notes (optional)
                </p>
                <input
                  type="text"
                  placeholder="e.g. Long-term hold"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Error */}
              {err && (
                <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12, textAlign: 'center' }}>{err}</p>
              )}
            </div>

            {/* Footer actions */}
            <div style={{ padding: '12px 20px 32px', display: 'flex', gap: 12, flexShrink: 0 }}>
              <button onClick={onClose}
                style={{
                  flex: 1, padding: '15px 0', borderRadius: 16, fontSize: 15, fontWeight: 700,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving}
                style={{
                  flex: 2, padding: '15px 0', borderRadius: 16, fontSize: 15, fontWeight: 800,
                  background: saving ? 'rgba(34,211,238,0.3)' : `linear-gradient(135deg, ${accent}, #0ea5e9)`,
                  border: 'none', color: '#000', cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : `0 4px 24px ${accentGlow}`,
                  letterSpacing: '-0.01em',
                }}
              >
                {saving ? 'Saving…' : 'Add Stock'}
              </button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
