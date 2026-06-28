import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NewAsset } from '../../lib/db'

interface MFResult { schemeCode: string; schemeName: string; fundHouse: string }

interface Props {
  open: boolean
  onClose: () => void
  onSave: (asset: NewAsset) => Promise<void>
}

const accent = '#a78bfa', accentGlow = 'rgba(167,139,250,0.40)', accentBg = 'rgba(167,139,250,0.07)'
const accentBorder = 'rgba(167,139,250,0.22)', accentSel = 'rgba(167,139,250,0.18)', accentSelBorder = 'rgba(167,139,250,0.55)'

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

  const reset = () => { setQuery(''); setResults([]); setSelected(null); setUnits(''); setBuyNav(''); setNotes(''); setErr(''); setSaving(false); setSearching(false) }
  useEffect(() => { if (!open) reset() }, [open])

  const handleQueryChange = (val: string) => {
    setQuery(val); setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try { const r = await fetch(`/api/search-mf?q=${encodeURIComponent(val.trim())}`); const j = await r.json() as { results?: MFResult[] }; setResults(j.results ?? []) }
      catch { setResults([]) } finally { setSearching(false) }
    }, 400)
  }

  const handleSelect = (m: MFResult) => { setSelected(m); setQuery(m.schemeName); setResults([]) }

  const handleSubmit = async () => {
    if (!selected)                      { setErr('Search and select a fund'); return }
    if (!units || Number(units) <= 0)   { setErr('Enter number of units');   return }
    if (!buyNav || Number(buyNav) <= 0) { setErr('Enter buy NAV (\u20b9)');       return }
    const u = parseFloat(units), nav = parseFloat(buyNav), value = parseFloat((u * nav).toFixed(2))
    try {
      setSaving(true); setErr('')
      await onSave({ label: selected.schemeName, category: 'Mutual Fund', value, owner: 'Both', notes: notes.trim() || null, ticker: selected.schemeCode, quantity: u, buy_price: nav })
      reset(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  