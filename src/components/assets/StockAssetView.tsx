// src/components/assets/StockAssetView.tsx
// Self-contained Stock asset module.
// Exports: StockAssetCard, StockTopUpSheet, StockLogSheet

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatINR } from '../../utils/format'
import {
  fmtStartDate,
  isTopUp,
  parseStockTopUpNotes,
} from '../../utils/assetHelpers'
import type { AssetItem } from '../../utils/assetHelpers'
import { ArrowUp, ArrowDown, sheetShell, sheetFooter, DragHandle } from './AssetUI'

// ─── Icon button helper ────────────────────────────────────────
function iconBtn(
  color: string,
  bg: string,
  border: string
): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: bg,
    border: `1px solid ${border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    color,
  }
}

// ─── StockAssetCard ────────────────────────────────────────────
export function StockAssetCard({
  asset,
  allStockItems,
  reorderMode,
  dragHandleProps,
  onDelete,
  onTopUp,
  onLog,
  working,
}: {
  asset: AssetItem
  allStockItems: AssetItem[]
  reorderMode: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onDelete: (id: string, label: string) => void
  onTopUp: (asset: AssetItem) => void
  onLog: (asset: AssetItem) => void
  working: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  if (isTopUp(asset.notes)) return null

  const siblings = allStockItems.filter((a) => a.label === asset.label)
  const totalQty = siblings.reduce((s, a) => {
    if (!isTopUp(a.notes)) return s + (a.quantity ?? 0)
    const p = parseStockTopUpNotes(a.notes)
    return s + (p.qty ?? 0)
  }, 0)
  const totalInvested = siblings.reduce((s, a) => s + a.value, 0)
  const currentVal =
    asset.current_price != null ? asset.current_price * totalQty : null
  const pnlAbs = currentVal !== null ? currentVal - totalInvested : null
  const pnlPct =
    pnlAbs !== null && totalInvested > 0
      ? (pnlAbs / totalInvested) * 100
      : null
  const pnlGain = pnlAbs !== null ? pnlAbs >= 0 : true

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[18px] overflow-hidden"
      style={{
        background: 'rgba(251,191,36,0.07)',
        border: '1px solid rgba(251,191,36,0.16)',
        cursor: reorderMode ? 'grab' : 'pointer',
      }}
      onClick={() => {
        if (!reorderMode) setExpanded((e) => !e)
      }}
    >
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
        {reorderMode ? (
          <div
            {...dragHandleProps}
            className="text-[18px] text-white/35 flex-shrink-0 cursor-grab px-1 py-0.5 touch-none"
          >
            ☰
          </div>
        ) : (
          <span className="text-[22px] flex-shrink-0">📈</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#f5f7ff] m-0 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {asset.label}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/35 tabular-nums">
              {totalQty} shares
            </span>
            {asset.current_price != null && (
              <span className="text-[11px] font-semibold text-amber-300 tabular-nums">
                @ {formatINR(asset.current_price)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[13px] font-extrabold text-amber-300 tabular-nums">
              {currentVal !== null
                ? formatINR(currentVal)
                : formatINR(totalInvested)}
            </span>
          </div>
          {pnlAbs !== null &&
            pnlPct !== null &&
            Math.abs(pnlAbs) >= 0.01 && (
              <div className="flex items-center gap-0.5 justify-end mt-0.5">
                {pnlGain ? (
                  <ArrowUp color="#34d399" />
                ) : (
                  <ArrowDown color="#f87171" />
                )}
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ color: pnlGain ? '#34d399' : '#f87171' }}
                >
                  {formatINR(Math.abs(pnlAbs))} ({Math.abs(pnlPct).toFixed(1)}
                  %)
                </span>
              </div>
            )}
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
                onClick={() => onLog(asset)}
                style={iconBtn(
                  '#fcd34d',
                  'rgba(251,191,36,0.1)',
                  'rgba(251,191,36,0.25)'
                )}
                title="View log"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onTopUp(asset)}
                style={iconBtn(
                  '#6ee7b7',
                  'rgba(52,211,153,0.1)',
                  'rgba(52,211,153,0.25)'
                )}
                title="Add more stocks"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onDelete(asset.id, asset.label)}
                disabled={working === asset.id}
                style={iconBtn(
                  '#f87171',
                  'rgba(248,113,113,0.1)',
                  'rgba(248,113,113,0.25)'
                )}
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── StockTopUpSheet ───────────────────────────────────────────
export function StockTopUpSheet({
  open,
  stockLabel,
  onClose,
  onSave,
}: {
  open: boolean
  stockLabel: string
  onClose: () => void
  onSave: (data: {
    label: string
    category: string
    value: number
    notes: string
  }) => Promise<void>
}) {
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const prevOpen = useRef(false)

  if (open && !prevOpen.current) {
    setQty('')
    setPrice('')
    setErr('')
  }
  prevOpen.current = open

  const total = useMemo(() => {
    const q = parseFloat(qty)
    const p = parseFloat(price)
    return !isNaN(q) && !isNaN(p) && q > 0 && p > 0 ? q * p : null
  }, [qty, price])

  const handleSave = async () => {
    const q = parseFloat(qty)
    const p = parseFloat(price)
    if (isNaN(q) || q <= 0) { setErr('Enter a valid quantity'); return }
    if (isNaN(p) || p <= 0) { setErr('Enter a valid price'); return }
    try {
      setSaving(true)
      setErr('')
      await onSave({
        label: stockLabel,
        category: 'Stock',
        value: q * p,
        notes: `top-up \u00b7 qty:${q} \u00b7 price:${p}`,
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(251,191,36,0.06)',
    border: '1px solid rgba(251,191,36,0.2)',
    borderRadius: 14,
    color: '#f5f7ff',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="stu-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <motion.div
            key="stu-sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              ...sheetShell,
              border: '1px solid rgba(251,191,36,0.28)',
            }}
          >
            <DragHandle />
            <div className="flex items-center gap-3 px-5 pb-5 flex-shrink-0">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px]"
                style={{
                  background: 'rgba(251,191,36,0.15)',
                  border: '1px solid rgba(251,191,36,0.3)',
                }}
              >
                📈
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-amber-300 m-0 mb-0.5">
                  Add Stocks
                </p>
                <h2 className="text-[18px] font-extrabold text-[#f5f7ff] m-0 tracking-tight">
                  {stockLabel}
                </h2>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto px-5 pb-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <label className="block mb-[18px]">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2">
                  Quantity
                </p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={inp}
                  placeholder="e.g. 10"
                />
              </label>
              <label className="block mb-5">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2">
                  Price per Stock (&#8377;)
                </p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={inp}
                  placeholder="e.g. 1500"
                />
              </label>
              {total !== null && (
                <div
                  className="px-4 py-3.5 rounded-[14px] mb-3"
                  style={{
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.2)',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-white/45">
                      Total Value
                    </span>
                    <span className="text-[18px] font-black text-amber-300 tabular-nums">
                      {formatINR(total)}
                    </span>
                  </div>
                </div>
              )}
              {err && (
                <p
                  className="text-[13px] text-red-300 px-3.5 py-2.5 rounded-[10px] mb-2"
                  style={{
                    background: 'rgba(248,113,113,0.1)',
                    border: '1px solid rgba(248,113,113,0.2)',
                  }}
                >
                  {err}
                </p>
              )}
            </div>

            <div style={sheetFooter}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl text-[#1a1000] text-base font-extrabold border-none"
                style={{
                  background: saving
                    ? 'rgba(251,191,36,0.2)'
                    : 'linear-gradient(135deg, #fcd34d, #f59e0b)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving
                    ? 'none'
                    : '0 4px 20px rgba(251,191,36,0.35)',
                }}
              >
                {saving ? 'Adding…' : 'Add Stocks'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── StockLogSheet ─────────────────────────────────────────────
export function StockLogSheet({
  open,
  asset,
  allStockItems,
  onClose,
}: {
  open: boolean
  asset: AssetItem | null
  allStockItems: AssetItem[]
  onClose: () => void
}) {
  if (!asset) return null

  const siblings = allStockItems
    .filter((a) => a.label === asset.label)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  const totalInvested = siblings.reduce((s, a) => s + a.value, 0)
  const totalQty = siblings.reduce((s, a) => {
    if (!isTopUp(a.notes)) return s + (a.quantity ?? 0)
    const p = parseStockTopUpNotes(a.notes)
    return s + (p.qty ?? 0)
  }, 0)
  const currentVal =
    asset.current_price != null ? asset.current_price * totalQty : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="slog-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <motion.div
            key="slog-sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              ...sheetShell,
              border: '1px solid rgba(251,191,36,0.28)',
            }}
          >
            <DragHandle />
            <div className="flex items-center gap-3 px-5 pb-[18px] flex-shrink-0">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px]"
                style={{
                  background: 'rgba(251,191,36,0.15)',
                  border: '1px solid rgba(251,191,36,0.3)',
                }}
              >
                📋
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-amber-300 m-0 mb-0.5">
                  Transaction Log
                </p>
                <h2 className="text-[18px] font-extrabold text-[#f5f7ff] m-0 tracking-tight">
                  {asset.label}
                </h2>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto px-5 pb-5"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex flex-col gap-2.5">
                {siblings.map((entry, i) => {
                  const isTU = isTopUp(entry.notes)
                  const p = isTU ? parseStockTopUpNotes(entry.notes) : null
                  const qty = isTU ? (p?.qty ?? null) : (entry.quantity ?? null)
                  const entryPrice = isTU
                    ? (p?.price ?? null)
                    : (entry.buy_price ?? null)
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-[14px]"
                      style={{
                        background: isTU
                          ? 'rgba(251,191,36,0.06)'
                          : 'rgba(52,211,153,0.06)',
                        border: `1px solid ${
                          isTU
                            ? 'rgba(251,191,36,0.16)'
                            : 'rgba(52,211,153,0.14)'
                        }`,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background: isTU ? '#fcd34d' : '#34d399',
                          boxShadow: `0 0 8px ${isTU ? '#fcd34d' : '#34d399'}`,
                        }}
                      />
                      <div className="flex-1">
                        <p
                          className="text-[12px] font-semibold m-0 mb-0.5"
                          style={{ color: isTU ? '#fcd34d' : '#6ee7b7' }}
                        >
                          {i === 0 ? '🟢 Created' : '🔵 Top-up'}
                        </p>
                        <p className="text-[10px] text-white/35 m-0 tabular-nums">
                          {fmtStartDate(entry.created_at.substring(0, 10))}
                          {qty !== null && entryPrice !== null
                            ? ` · ${qty} shares @ ${formatINR(entryPrice)}`
                            : ''}
                        </p>
                      </div>
                      <p className="text-[14px] font-extrabold text-[#f5f7ff] tabular-nums m-0">
                        {formatINR(entry.value)}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div
                className="mt-4 px-4 py-3.5 rounded-[14px]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex justify-between mb-2">
                  <span className="text-[12px] text-white/45">
                    Total Invested
                  </span>
                  <span className="text-[13px] font-extrabold text-amber-300 tabular-nums">
                    {formatINR(totalInvested)}
                  </span>
                </div>
                <div
                  className={`flex justify-between ${
                    currentVal !== null ? 'mb-2' : ''
                  }`}
                >
                  <span className="text-[12px] text-white/45">
                    Total Quantity
                  </span>
                  <span className="text-[13px] font-extrabold text-[#f5f7ff] tabular-nums">
                    {totalQty} shares
                  </span>
                </div>
                {currentVal !== null && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-white/45">
                      Current Value
                    </span>
                    <span
                      className="text-[13px] font-extrabold tabular-nums"
                      style={{
                        color:
                          currentVal >= totalInvested ? '#34d399' : '#f87171',
                      }}
                    >
                      {formatINR(currentVal)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
