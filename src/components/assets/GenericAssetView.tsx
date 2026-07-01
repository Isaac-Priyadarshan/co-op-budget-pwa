// src/components/assets/GenericAssetView.tsx
// Handles Real Estate, Mutual Fund, Crypto, and Precious Metal.
// All four categories share identical card structure.
// Exports: GenericAssetCard

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatINR } from '../../utils/format'
import type { AssetItem } from '../../utils/assetHelpers'
import { PnlBadge } from './AssetUI'

export function GenericAssetCard({
  asset,
  reorderMode,
  dragHandleProps,
  onDelete,
  working,
  emoji,
}: {
  asset: AssetItem
  reorderMode: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onDelete: (id: string, label: string) => void
  working: string | null
  emoji: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[18px] overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        cursor: reorderMode ? 'grab' : 'pointer',
      }}
      onClick={() => {
        if (!reorderMode) setExpanded((e) => !e)
      }}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        {reorderMode ? (
          <div
            {...dragHandleProps}
            className="text-[18px] text-white/35 flex-shrink-0 cursor-grab px-1 py-0.5 touch-none"
          >
            ☰
          </div>
        ) : (
          <span className="text-[22px] flex-shrink-0">{emoji}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#f5f7ff] m-0 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {asset.label}
          </p>
          {asset.notes && (
            <p className="text-[11px] text-white/35 m-0 whitespace-nowrap overflow-hidden text-ellipsis">
              {asset.notes}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-extrabold text-[#f5f7ff] tabular-nums m-0">
            {formatINR(asset.value)}
          </p>
          <PnlBadge asset={asset} />
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
                onClick={() => onDelete(asset.id, asset.label)}
                disabled={working === asset.id}
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.25)',
                  color: '#f87171',
                }}
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
