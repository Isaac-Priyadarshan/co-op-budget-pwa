// src/components/assets/CryptoAssetView.tsx
// Self-contained Crypto asset module.
// Exports: CryptoAssetCard

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatINR } from '../../utils/format'
import type { AssetItem } from '../../utils/assetHelpers'
import { ArrowUp, ArrowDown } from './AssetUI'

const accent       = '#fb923c'
const accentBg     = 'rgba(251,146,60,0.07)'
const accentBorder = 'rgba(251,146,60,0.22)'
const accentSel    = 'rgba(251,146,60,0.18)'

/** Extracts the ticker symbol from label "Bitcoin (BTC)" → "BTC" */
function parseCryptoLabel(label: string): { name: string; symbol: string } {
  const m = label.match(/^(.+?)\s*\(([^)]+)\)$/)
  if (!m) return { name: label, symbol: '' }
  return { name: m[1].trim(), symbol: m[2].trim() }
}

/** CoinGecko thumbnail URL derived from the stored ticker (coin id) */
function coinThumbUrl(ticker: string | null): string | null {
  if (!ticker) return null
  // We store the CoinGecko id in the ticker field (e.g. "bitcoin", "ethereum")
  return `https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png`
  // Note: the real URL needs the numeric image id from CoinGecko API —
  // fall back to null for coins we don\'t have cached thumbs for.
}

// ─── CryptoAssetCard ───────────────────────────────────────────
export function CryptoAssetCard({
  asset,
  reorderMode,
  dragHandleProps,
  onDelete,
  working,
}: {
  asset: AssetItem
  reorderMode: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onDelete: (id: string, label: string) => void
  working: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const { name, symbol } = parseCryptoLabel(asset.label)

  const hasLive    = asset.current_price != null && asset.quantity != null
  const currentVal = hasLive ? asset.current_price! * asset.quantity! : null
  const invested   = asset.value
  const pnlAbs     = currentVal !== null ? currentVal - invested : null
  const pnlPct     = pnlAbs !== null && invested > 0 ? (pnlAbs / invested) * 100 : null
  const pnlGain    = pnlAbs !== null ? pnlAbs >= 0 : true

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
          <span className="text-[22px] flex-shrink-0">🪙</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <p className="text-sm font-bold text-[#f5f7ff] m-0 whitespace-nowrap overflow-hidden text-ellipsis">
              {name}
            </p>
            {symbol && (
              <span
                className="text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded-[6px] flex-shrink-0"
                style={{ background: accentSel, border: `1px solid ${accentBorder}`, color: accent }}
              >
                {symbol}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {asset.quantity != null && (
              <span className="text-[11px] text-white/35 tabular-nums">{asset.quantity} coins</span>
            )}
            {asset.buy_price != null && (
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: accent }}>
                @ {formatINR(asset.buy_price)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className="text-[13px] font-extrabold tabular-nums m-0"
            style={{ color: currentVal !== null ? (pnlGain ? '#34d399' : '#f87171') : accent }}
          >
            {formatINR(currentVal ?? invested)}
          </p>
          {pnlAbs !== null && pnlPct !== null && Math.abs(pnlAbs) >= 0.01 && (
            <div className="flex items-center gap-0.5 justify-end mt-0.5">
              {pnlGain ? <ArrowUp color="#34d399" /> : <ArrowDown color="#f87171" />}
              <span
                className="text-[10px] font-bold tabular-nums"
                style={{ color: pnlGain ? '#34d399' : '#f87171' }}
              >
                {formatINR(Math.abs(pnlAbs))} ({Math.abs(pnlPct).toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Optional note */}
      {asset.notes && (
        <div className="px-3.5 pb-1.5 -mt-0.5">
          <span className="text-[10px] text-white/30 italic">{asset.notes}</span>
        </div>
      )}

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
            {/* Detail row */}
            <div className="grid grid-cols-3 gap-2 px-3.5 pb-2 pt-1">
              <div className="text-center px-2 py-2 rounded-[10px]"
                style={{ background: accentSel, border: `1px solid ${accentBorder}` }}>
                <p className="text-[9px] uppercase tracking-widest text-white/35 m-0 mb-0.5">Invested</p>
                <p className="text-[12px] font-extrabold tabular-nums m-0" style={{ color: accent }}>{formatINR(invested)}</p>
              </div>
              <div className="text-center px-2 py-2 rounded-[10px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[9px] uppercase tracking-widest text-white/35 m-0 mb-0.5">Qty</p>
                <p className="text-[12px] font-extrabold tabular-nums m-0 text-[#f5f7ff]">{asset.quantity ?? '—'}</p>
              </div>
              <div className="text-center px-2 py-2 rounded-[10px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[9px] uppercase tracking-widest text-white/35 m-0 mb-0.5">Live Price</p>
                <p className="text-[12px] font-extrabold tabular-nums m-0 text-[#f5f7ff]">
                  {asset.current_price != null ? formatINR(asset.current_price) : '—'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 px-3.5 pb-3 justify-end">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onDelete(asset.id, asset.label)}
                disabled={working === asset.id}
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
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
