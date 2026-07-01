// src/components/assets/RealEstateAssetView.tsx
// Self-contained Real Estate asset module.
// Exports: RealEstateAssetCard, RealEstateEditSheet

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatINR } from '../../utils/format'
import type { AssetItem } from '../../utils/assetHelpers'
import { sheetShell, sheetFooter, DragHandle } from './AssetUI'

const PROPERTY_TYPES = [
  'Apartment', 'Villa', 'Independent House', 'Plot / Land',
  'Farm Land', 'Commercial Space', 'Office', 'Shop', 'Warehouse', 'Other',
] as const
type PropertyType = (typeof PROPERTY_TYPES)[number]

const accent       = '#fb923c'
const accentBg     = 'rgba(251,146,60,0.08)'
const accentBorder = 'rgba(251,146,60,0.22)'
const accentSel    = 'rgba(251,146,60,0.22)'
const accentSelBdr = 'rgba(251,146,60,0.55)'

function splitRELabel(label: string): { name: string; type: string } {
  const idx = label.lastIndexOf(' \u2013 ')
  if (idx === -1) return { name: label, type: '' }
  return { name: label.slice(0, idx).trim(), type: label.slice(idx + 3).trim() }
}

// ─── RealEstateAssetCard ───────────────────────────────────────
export function RealEstateAssetCard({
  asset,
  reorderMode,
  dragHandleProps,
  onDelete,
  onEdit,
  working,
}: {
  asset: AssetItem
  reorderMode: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onDelete: (id: string, label: string) => void
  onEdit: (asset: AssetItem) => void
  working: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const { name, type } = splitRELabel(asset.label)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[18px] overflow-hidden"
      style={{
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        cursor: reorderMode ? 'grab' : 'pointer',
      }}
      onClick={() => { if (!reorderMode) setExpanded((e) => !e) }}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        {reorderMode ? (
          <div
            {...dragHandleProps}
            className="text-[18px] text-white/35 flex-shrink-0 cursor-grab px-1 py-0.5 touch-none"
          >☰</div>
        ) : (
          <span className="text-[22px] flex-shrink-0">🏠</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#f5f7ff] m-0 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {name}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {type && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                style={{
                  background: accentSel,
                  border: `1px solid ${accentSelBdr}`,
                  color: accent,
                }}
              >
                {type}
              </span>
            )}
            {asset.notes && (
              <span className="text-[11px] text-white/35 whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">
                {asset.notes}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[13px] font-extrabold tabular-nums m-0" style={{ color: accent }}>
            {formatINR(asset.value)}
          </p>
          <p className="text-[10px] text-white/30 m-0 mt-0.5">Market value</p>
        </div>
      </div>

      <AnimatePresence>
        {expanded && !reorderMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 px-3.5 pb-3 justify-end">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onEdit(asset)}
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{
                  background: 'rgba(167,139,250,0.1)',
                  border: '1px solid rgba(167,139,250,0.25)',
                  color: '#c4b5fd',
                }}
                title="Edit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onDelete(asset.id, asset.label)}
                disabled={working === asset.id}
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.25)',
                  color: '#f87171',
                }}
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── RealEstateEditSheet ───────────────────────────────────────
export function RealEstateEditSheet({
  open,
  asset,
  onClose,
  onSave,
}: {
  open: boolean
  asset: AssetItem | null
  onClose: () => void
  onSave: (id: string, patch: { label: string; value: number; notes: string | null }) => Promise<void>
}) {
  const { name: initName, type: initType } = splitRELabel(asset?.label ?? '')
  const [name,         setName]         = useState(initName)
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(initType as PropertyType | '')
  const [value,        setValue]        = useState(asset?.value?.toString() ?? '')
  const [notes,        setNotes]        = useState(asset?.notes ?? '')
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState('')
  const prevOpen = useRef(false)

  if (open && !prevOpen.current) {
    const { name: n, type: t } = splitRELabel(asset?.label ?? '')
    setName(n)
    setPropertyType(t as PropertyType | '')
    setValue(asset?.value?.toString() ?? '')
    setNotes(asset?.notes ?? '')
    setErr('')
  }
  prevOpen.current = open

  if (!asset) return null

  const handleSave = async () => {
    if (!name.trim())                      { setErr('Enter a name');            return }
    if (!propertyType)                     { setErr('Select a property type');  return }
    if (!value || Number(value) <= 0)      { setErr('Enter a valid value');     return }
    try {
      setSaving(true); setErr('')
      await onSave(asset.id, {
        label: `${name.trim()} \u2013 ${propertyType}`,
        value: parseFloat(Number(value).toFixed(2)),
        notes: notes.trim() || null,
      })
      onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: accentBg, border: `1px solid ${accentBorder}`,
    borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="re-edit-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          />
          <motion.div key="re-edit-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...sheetShell, border: `1px solid ${accentBorder}` }}
          >
            <DragHandle />
            <div className="flex items-center gap-3 px-5 pb-5 flex-shrink-0">
              <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px]"
                style={{ background: accentBg, border: `1px solid ${accentSelBdr}` }}>✏️</div>
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase m-0 mb-0.5" style={{ color: accent }}>Edit Real Estate</p>
                <h2 className="text-[18px] font-extrabold text-[#f5f7ff] m-0 tracking-tight">{asset.label}</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
              <label className="block mb-[18px]">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2">Asset Name</p>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="e.g. 3BHK Whitefield" />
              </label>

              <div className="mb-[18px]">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2.5">Property Type</p>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map(pt => (
                    <motion.button key={pt} whileTap={{ scale: 0.92 }} onClick={() => setPropertyType(pt)}
                      style={{
                        padding: '9px 16px', borderRadius: 100, fontSize: 13,
                        fontWeight: propertyType === pt ? 700 : 400,
                        background: propertyType === pt ? accentSel : 'rgba(255,255,255,0.04)',
                        border: propertyType === pt ? `1px solid ${accentSelBdr}` : '1px solid rgba(255,255,255,0.09)',
                        color: propertyType === pt ? accent : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer',
                      }}
                    >{pt}</motion.button>
                  ))}
                </div>
              </div>

              <label className="block mb-[18px]">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2">Market Value (₹)</p>
                <input type="number" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)}
                  style={{ ...inp, color: accent, fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }} placeholder="0.00" />
              </label>

              <label className="block mb-5">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2">Notes <span className="opacity-50 normal-case tracking-normal">(optional)</span></p>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={inp} placeholder="Location, survey no., joint ownership…" />
              </label>

              {err && (
                <p className="text-[13px] text-red-300 px-3.5 py-2.5 rounded-[10px] mb-2"
                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
              )}
            </div>

            <div style={sheetFooter}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                className="w-full py-4 rounded-2xl text-white text-base font-extrabold border-none"
                style={{
                  background: saving ? accentBg : `linear-gradient(135deg, ${accent}, #ea580c)`,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : '0 4px 20px rgba(251,146,60,0.35)',
                }}
              >{saving ? 'Saving…' : 'Save Changes'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
