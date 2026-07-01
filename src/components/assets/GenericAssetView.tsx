// src/components/assets/GenericAssetView.tsx
// Generic asset card for non-Bank, non-Stock groups
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

  // Only show notes that look like human-readable descriptions,
  // not raw metadata strings (contain '|' separators used by
  // bankCalc / stockCalc).
  const displayNotes =
    asset.notes && !asset.notes.includes('|') ? asset.notes : null

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
      {/* Emoji icon */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {emoji}
      </div>

      {/* Label + value + badge — flex:1 + minWidth:0 prevents overflow */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#f5f7ff',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {asset.label}
        </p>

        {/* Value + PnL badge on the same line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#34d399',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {formatINR(asset.value)}
          </span>
          <PnlBadge asset={asset} />
        </div>

        {/* Notes — only shown when human-readable */}
        {displayNotes && (
          <p
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.32)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayNotes}
          </p>
        )}
      </div>

      {/* Action button — delete or reorder handle */}
      {!reorderMode ? (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onDelete(asset.id, asset.label)}
          disabled={isWorking}
          aria-label={`Delete ${asset.label}`}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isWorking ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f87171"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </motion.button>
      ) : (
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(96,165,250,0.09)',
            border: '1px solid rgba(96,165,250,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            flexShrink: 0,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="4" y1="8" x2="20" y2="8" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="16" x2="20" y2="16" />
          </svg>
        </div>
      )}
    </motion.div>
  )
}
