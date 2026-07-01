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

// ─── ASSET_GROUPS (inlined — no external dependency) ──────────
export const ASSET_GROUPS = [
  {
    id: 'Bank',
    label: 'Bank Accounts',
    emoji: '🏦',
    categories: ['Bank Account'],
    color: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.35)',
    text: '#7dd3fc',
  },
  {
    id: 'Stock',
    label: 'Stocks',
    emoji: '📈',
    categories: ['Stock'],
    color: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.35)',
    text: '#86efac',
  },
  {
    id: 'Crypto',
    label: 'Crypto',
    emoji: '🪙',
    categories: ['Crypto'],
    color: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.35)',
    text: '#fdba74',
  },
  {
    id: 'MutualFund',
    label: 'Mutual Funds',
    emoji: '💰',
    categories: ['Mutual Fund'],
    color: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.35)',
    text: '#c4b5fd',
  },
  {
    id: 'PreciousMetal',
    label: 'Precious Metals',
    emoji: '🥇',
    categories: ['Precious Metal'],
    color: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.35)',
    text: '#fde68a',
  },
  {
    id: 'RealEstate',
    label: 'Real Estate',
    emoji: '🏠',
    categories: ['Real Estate'],
    color: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.30)',
    text: '#fdba74',
  },
  {
    id: 'Other',
    label: 'Other',
    emoji: '📦',
    categories: ['Other'],
    color: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.30)',
    text: '#cbd5e1',
  },
] as const

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
      }}
    >
      {gain ? <ArrowUp color="#34d399" /> : <ArrowDown color="#f87171" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ─── SummaryCard ──────────────────────────────────────────────
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
        padding: '22px 24px',
        background:
          'linear-gradient(135deg, rgba(52,211,153,0.10) 0%, rgba(16,185,129,0.07) 100%)',
        border: '1px solid rgba(52,211,153,0.22)',
        boxShadow:
          '0 4px 32px rgba(52,211,153,0.10), 0 1px 0 rgba(255,255,255,0.04) inset',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}
      >
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-300/60 m-0">
            Asset Value
          </p>
          <motion.p
            key={totalValue}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-base font-extrabold text-emerald-300 tabular-nums m-0"
          >
            {loading ? '—' : formatINR(totalValue)}
          </motion.p>
        </div>
        <div className="flex flex-col items-center gap-1 px-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-300/60 m-0">
            Net Worth
          </p>
          <motion.p
            key={totalValue + '-nw'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04 }}
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#34d399',
              fontVariantNumeric: 'tabular-nums',
              margin: 0,
              textShadow: '0 0 24px rgba(52,211,153,0.55)',
              letterSpacing: '-0.02em',
            }}
          >
            {loading ? '—' : formatINR(totalValue)}
          </motion.p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-300/60 m-0 text-right">
            Assets
          </p>
          <motion.p
            key={assetCount}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#6ee7b7',
              fontVariantNumeric: 'tabular-nums',
              margin: 0,
              textShadow: '0 0 20px rgba(110,231,183,0.4)',
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
        gap: 10,
        padding: '18px 16px',
        background: group.color,
        border: `1px solid ${group.border}`,
        borderRadius: 22,
        cursor: 'pointer',
        width: '100%',
        boxShadow: `0 4px 20px ${group.color}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
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
      <span className="text-[30px] leading-none">{group.emoji}</span>
      <div className="w-full">
        <p
          style={{ fontSize: 13, fontWeight: 700, color: group.text, margin: '0 0 5px', letterSpacing: '-0.01em' }}
        >
          {group.label}
        </p>
        {loading ? (
          <div className="h-3.5 w-14 rounded bg-white/[0.08]" />
        ) : (
          <p
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: '#f5f7ff',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {count === 0 ? (
              <span className="text-[11px] font-normal text-white/30">No entries yet</span>
            ) : (
              formatINR(total)
            )}
          </p>
        )}
      </div>
      {count > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: group.text,
            opacity: 0.7,
            background: group.border.replace('0.35', '0.18'),
            padding: '2px 8px',
            borderRadius: 99,
            border: `1px solid ${group.border}`,
          }}
        >
          {count} {count === 1 ? 'asset' : 'assets'}
        </div>
      )}
    </motion.button>
  )
}

// ─── GroupSummaryCard ─────────────────────────────────────────
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
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div>
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
              fontSize: 22,
              fontWeight: 900,
              color: '#f5f7ff',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {formatINR(totalInvested)}
          </motion.p>
        </div>
        <div style={{ textAlign: 'right' }}>
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
              fontSize: 22,
              fontWeight: 900,
              color: group.text,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              margin: 0,
              textShadow: `0 0 20px ${group.border}`,
            }}
          >
            {formatINR(displayNetWorth)}
          </motion.p>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            borderRadius: 99,
            background: 'rgba(0,0,0,0.18)',
            border: `1px solid ${group.border}`,
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

        {!isBank && hasLive && Math.abs(pnlAbs) >= 0.01 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 99,
              background: pnlGain
                ? 'rgba(52,211,153,0.18)'
                : 'rgba(248,113,113,0.18)',
              border: `1px solid ${
                pnlGain ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'
              }`,
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

        {isBank &&
          bankNetWorth !== null &&
          bankNetWorth > totalInvested && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 99,
                background: 'rgba(52,211,153,0.18)',
                border: '1px solid rgba(52,211,153,0.4)',
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
