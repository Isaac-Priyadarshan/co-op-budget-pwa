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
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Search Stock (NSE / BSE)</p>
                <input
                  type="text"
                  placeholder="e.g. Reliance, HDFC Bank, Infosys…"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
   