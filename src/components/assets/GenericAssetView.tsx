// src/components/assets/GenericAssetView.tsx
// Generic asset card used for non-Bank, non-Stock asset groups
// (Real Estate, Mutual Fund, Crypto, Precious Metal, etc.).

import { motion } from 'framer-motion'
import { formatINR } from '../../utils/format'
import { PnlBadge } from './AssetUI'
import type { AssetItem } from '../../utils/assetHelpers'

interface GenericAssetCardProps {
  asset: AssetItem
  reorderMode: boolean
  onDelete: (id: string, label: string) => void
  working: string | null
  emoji: string
}

export function GenericAssetCard({
  asset,
  reorderMode,
  onDelete,
  working,
  emoji,
}: GenericAssetCardProps) {
  const isWorking = working === asset.id

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 18,
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: isWorking ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {emoji}
      </div>

      {/* Label + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#f5f7ff',
            margin: '0 0 4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {asset.label}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#34d399',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatINR(asset.value)}
          </span>
          <PnlBadge asset={asset} />
        </div>
        {asset.notes ? (
          <p
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              margin: '3px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {asset.notes}
          </p>
        ) : null}
      </div>

      {/* Delete button (hidden in reorder mode) */}
      {!reorderMode && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onDelete(asset.id, asset.label)}
          disabled={isWorking}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            fontSize: 14,
          }}
        >
          🗑️
        </motion.button>
      )}

      {/* Drag handle (shown in reorder mode) */}
      {reorderMode && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(96,165,250,0.10)',
            border: '1px solid rgba(96,165,250,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            flexShrink: 0,
            color: '#60a5fa',
            fontSize: 15,
          }}
        >
          ≡
        </div>
      )}
    </motion.div>
  )
}
