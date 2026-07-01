// src/components/assets/AssetUI.tsx
// Shared UI primitives used across all asset views.
// Includes: ArrowUp, ArrowDown, ArrowRight, PnlBadge,
//           SummaryCard, GroupCard, GroupSummaryCard,
//           and shared sheet style constants.

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatINR } from '../../utils/format'
import { parseBankNotes, compoundWithTopUps } from '../../utils/bankCalc'
import type { BankDeposit } from '../../utils/bankCalc'
import { isTopUp } from '../../utils/assetHelpers'
import type { AssetItem } from '../../utils/assetHelpers'
import { ASSET_GROUPS } from '../shared/AssetGroupPicker'

// ─── Shared bottom-sheet style constants ──────────────────────
export const sheetShell: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 50,
  background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
  border: '1px solid rgba(96,165,250,0.22)',
  borderBottom: 'none',
  borderRadius: '28px 28px 0 0',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '92dvh',
}

export const sheetFooter: React.CSSProperties = {
  flexShrink: 0,
  padding: '12px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
  borderTop: '1px solid rgba(96,165,250,0.18)',
  background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
}

export const DragHandle = () => (
  <div className="flex justify-center py-3.5 pb-2.5 flex-shrink-0">
    <div className="w-10 h-1 rounded-full bg-white/15" />
  </div>
)

// ─── Arrow SVG primitives ──────────────────────────────────────
export function ArrowUp({ color, size = 9 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill={color}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <polygon points="5,1 9,9 1,9" />
    </svg>
  )
}

export function ArrowDown({ color, size = 9 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill={color}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <polygon points="5,9 9,1 1,1" />
    </svg>
  )
}

export function ArrowRight({
  size = 10,
  color = 'rgba(255,255,255,0.25)',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <line x1="1" y1="5" x2="9" y2="5" />
      <polyline points="6,2 9,5 6,8" />
    </svg>
  )
}

// ─── PnlBadge ─────────────────────────────────────────────────
export function PnlBadge({
  asset,
}: {
  asset: {
    value: number
    current_price: number | null
    quantity: number | null
    buy_price: number | null
  }
}) {
  if (!asset.current_price || !asset.quantity || !asset.buy_price) return null
  const currentVal = asset.current_price * asset.quantity
  const investedVal = asset.buy_price * asset.quantity
  const diff = currentVal - investedVal
  const pct = investedVal > 0 ? (diff / investedVal) * 100 : 0
  if (Math.abs(diff) < 0.01) return null
  const gain = diff > 0
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 100,
        background: gain ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
        color: gain ? '#34d399' : '#f87171',
        border: `1px solid ${gain ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
        whiteSpace: 'nowrap' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
      }}
    >
      {gain ? <ArrowUp color="#34d399" /> : <ArrowDown color="#f87171" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ─── SummaryCard ──────────────────────────────────────────────
// Layout: hero total value on top, then a divider, then two
// equal-width stat cells (Invested | Assets) separated by a
// 1 px vertical rule.  The divider is rendered as a real grid
// column so it never bleeds into adjacent cells.
export function SummaryCard({
  totalValue,
  assetCount,
  loading,
}: {
  totalValue: number
  assetCount: number
  loading: boolean
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: '20px 22px',
        background:
          'linear-gradient(135deg, rgba(52,211,153,0.10) 0%, rgba(16,185,129,0.07) 100%)',
        border: '1px solid rgba(52,211,153,0.22)',
        boxShadow:
          '0 4px 32px rgba(52,211,153,0.10), 0 1px 0 rgba(255,255,255,0.04) inset',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Label */}
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(110,231,183,0.55)',
          margin: '0 0 6px',
        }}
      >
        Total Portfolio
      </p>

      {/* Hero value */}
      <motion.p
        key={totalValue}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#34d399',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
          margin: '0 0 14px',
          textShadow: '0 0 28px rgba(52,211,153,0.50)',
          lineHeight: 1,
        }}
      >
        {loading ? '—' : formatINR(totalValue)}
      </motion.p>

      {/* Horizontal divider */}
      <div
        style={{
          height: 1,
          background: 'rgba(52,211,153,0.14)',
          marginBottom: 12,
        }}
      />

      {/* Two-stat row: use flexbox so the vertical rule stays centred
          and never bleeds.  Each stat takes equal space via flex:1. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* Left stat: Portfolio Value */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'rgba(110,231,183,0.50)',
              margin: 0,
            }}
          >
            Portfolio Value
          </p>
          <motion.p
            key={totalValue + '-pv'}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04 }}
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#6ee7b7',
              fontVariantNumeric: 'tabular-nums',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {loading ? '—' : formatINR(totalValue)}
          </motion.p>
        </div>

        {/* Vertical rule — self-contained, no margin bleed */}
        <div
          style={{
            width: 1,
            height: 28,
            background: 'rgba(52,211,153,0.18)',
            flexShrink: 0,
            margin: '0 16px',
          }}
        />

        {/* Right stat: Asset count */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'rgba(110,231,183,0.50)',
              margin: 0,
            }}
          >
            Assets
          </p>
          <motion.p
            key={assetCount}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#6ee7b7',
              fontVariantNumeric: 'tabular-nums',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {loading ? '—' : assetCount}
          </motion.p>
        </div>
      </div>
    </div>
  )
}

// ─── GroupCard ────────────────────────────────────────────────
// Fixed: count pill moved to bottom-right so it no longer
// overlaps the large emoji at the top.
export function GroupCard({
  group,
  total,
  count,
  loading,
  onPress,
}: {
  group: (typeof ASSET_GROUPS)[number]
  total: number
  count: number
  loading: boolean
  onPress: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onPress}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 0,
        padding: '16px 16px 14px',
        background: group.color,
        border: `1px solid ${group.border}`,
        borderRadius: 22,
        cursor: 'pointer',
        width: '100%',
        minHeight: 118,
        boxShadow: `0 4px 20px ${group.color}`,
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      {/* Ambient glow blob */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 70,
          height: 70,
          borderRadius: '50%',
          background: group.border,
          filter: 'blur(22px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top: emoji only — no badge here anymore */}
      <span style={{ fontSize: 28, lineHeight: 1, position: 'relative', zIndex: 1 }}>
        {group.emoji}
      </span>

      {/* Bottom: label + value row with count pill inline */}
      <div style={{ width: '100%', position: 'relative', zIndex: 1, marginTop: 10 }}>
        {/* Label row: label + count pill side by side */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            marginBottom: 3,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: group.text,
              margin: 0,
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {group.label}
          </p>

          {/* Count pill — aligned next to label, never overlaps emoji */}
          {count > 0 && (
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: group.text,
                background: group.border
                  .replace('0.35', '0.15')
                  .replace('0.30', '0.12'),
                padding: '2px 7px',
                borderRadius: 99,
                border: `1px solid ${group.border}`,
                flexShrink: 0,
                lineHeight: 1.6,
              }}
            >
              {count}
            </div>
          )}
        </div>

        {/* Value row */}
        {loading ? (
          <div
            style={{
              height: 14,
              width: 56,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.08)',
            }}
          />
        ) : count === 0 ? (
          <p
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.28)',
              margin: 0,
              fontWeight: 500,
            }}
          >
            No entries yet
          </p>
        ) : (
          <p
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#f5f7ff',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formatINR(total)}
          </p>
        )}
      </div>
    </motion.button>
  )
}

// ─── GroupSummaryCard ─────────────────────────────────────────
// Fixed: replaced `1fr 1px 1fr` grid (where margin on the
// divider div bled into sibling cells) with a plain flexbox
// layout so the vertical rule is fully self-contained.
export function GroupSummaryCard({
  group,
  items,
}: {
  group: (typeof ASSET_GROUPS)[number]
  items: AssetItem[]
}) {
  const isBank = group.id === 'Bank'
  const isStock = group.id === 'Stock'

  const rootItems =
    isBank || isStock ? items.filter((a) => !isTopUp(a.notes)) : items

  const totalInvested =
    rootItems.reduce((s, a) => s + a.value, 0) +
    (isBank || isStock
      ? items.filter((a) => isTopUp(a.notes)).reduce((s, a) => s + a.value, 0)
      : 0)

  const bankNetWorth = useMemo(() => {
    if (!isBank) return null
    const deposits: BankDeposit[] = []
    const rootLabels = [...new Set(rootItems.map((a) => a.label))]
    for (const label of rootLabels) {
      const siblings = items.filter((a) => a.label === label)
      const root = siblings.find((a) => !isTopUp(a.notes))
      if (!root) continue
      const { rate } = parseBankNotes(root.notes)
      if (!rate) {
        deposits.push({
          amount: root.value,
          startDate: new Date().toISOString().substring(0, 10),
          rate: 0,
        })
        continue
      }
      for (const s of siblings) {
        const p = parseBankNotes(s.notes)
        if (p.startDate) deposits.push({ amount: s.value, startDate: p.startDate, rate })
      }
    }
    return deposits.length > 0 ? compoundWithTopUps(deposits) : totalInvested
  }, [isBank, items, rootItems, totalInvested])

  const liveItems = items.filter(
    (a) => a.current_price != null && a.quantity != null
  )
  const liveValue = liveItems.reduce(
    (s, a) => s + a.current_price! * a.quantity!,
    0
  )
  const hasLive = liveItems.length > 0
  const investedLive = liveItems.reduce((s, a) => s + a.value, 0)
  const pnlAbs = liveValue - investedLive
  const pnlPct = investedLive > 0 ? (pnlAbs / investedLive) * 100 : 0
  const pnlGain = pnlAbs >= 0

  const displayNetWorth = isBank
    ? (bankNetWorth ?? totalInvested)
    : hasLive
    ? liveValue
    : totalInvested
  const assetCount = isBank || isStock ? rootItems.length : items.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 24,
        padding: '20px 20px 18px',
        background: group.color,
        border: `1px solid ${group.border}`,
        boxShadow: `0 4px 28px ${group.color}, 0 1px 0 rgba(255,255,255,0.04) inset`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: group.border,
          filter: 'blur(40px)',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      />

      {/* Two-stat row — flexbox, vertical rule self-contained */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        {/* Left: Total Invested */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: group.text,
              opacity: 0.6,
              margin: '0 0 4px',
            }}
          >
            Total Invested
          </p>
          <motion.p
            key={totalInvested}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: '#f5f7ff',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formatINR(totalInvested)}
          </motion.p>
        </div>

        {/* Vertical rule — self-contained */}
        <div
          style={{
            width: 1,
            height: 36,
            background: group.border
              .replace('0.35', '0.25')
              .replace('0.30', '0.22'),
            flexShrink: 0,
            margin: '0 18px',
          }}
        />

        {/* Right: Net Worth */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: group.text,
              opacity: 0.6,
              margin: '0 0 4px',
            }}
          >
            Net Worth
          </p>
          <motion.p
            key={displayNetWorth}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: group.text,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formatINR(displayNetWorth)}
          </motion.p>
        </div>
      </div>

      {/* Badge row */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Asset count badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 11px',
            borderRadius: 99,
            background: 'rgba(0,0,0,0.18)',
            border: `1px solid ${group.border}`,
            flexShrink: 0,
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke={group.text}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: group.text,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {assetCount}
          </span>
          <span
            style={{
              fontSize: 10,
              color: group.text,
              opacity: 0.65,
              fontWeight: 600,
            }}
          >
            {assetCount === 1 ? 'asset' : 'assets'}
          </span>
        </div>

        {/* PnL badge — non-bank live assets */}
        {!isBank && hasLive && Math.abs(pnlAbs) >= 0.01 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 11px',
              borderRadius: 99,
              background: pnlGain
                ? 'rgba(52,211,153,0.18)'
                : 'rgba(248,113,113,0.18)',
              border: `1px solid ${
                pnlGain ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'
              }`,
              flexShrink: 0,
            }}
          >
            {pnlGain ? (
              <ArrowUp color="#34d399" />
            ) : (
              <ArrowDown color="#f87171" />
            )}
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: pnlGain ? '#34d399' : '#f87171',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatINR(Math.abs(pnlAbs))}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pnlGain ? '#34d399' : '#f87171',
                opacity: 0.8,
              }}
            >
              {Math.abs(pnlPct).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Interest badge — bank only */}
        {isBank &&
          bankNetWorth !== null &&
          bankNetWorth > totalInvested && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 11px',
                borderRadius: 99,
                background: 'rgba(52,211,153,0.18)',
                border: '1px solid rgba(52,211,153,0.4)',
                flexShrink: 0,
              }}
            >
              <ArrowUp color="#34d399" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: '#34d399',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatINR(bankNetWorth - totalInvested)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#34d399',
                  opacity: 0.8,
                }}
              >
                interest
              </span>
            </div>
          )}
      </div>
    </motion.div>
  )
}
