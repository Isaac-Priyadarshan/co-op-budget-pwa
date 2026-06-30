import { useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssets } from '../../hooks/useAssets'
import { ASSET_GROUPS, type AssetGroupId } from '../../components/shared/AssetGroupPicker'
import { BankAssetSheet }          from '../../components/assets/BankAssetSheet'
import { RealEstateAssetSheet }    from '../../components/assets/RealEstateAssetSheet'
import { StockAssetSheet }         from '../../components/assets/StockAssetSheet'
import { MutualFundAssetSheet }    from '../../components/assets/MutualFundAssetSheet'
import { CryptoAssetSheet }        from '../../components/assets/CryptoAssetSheet'
import { PreciousMetalAssetSheet } from '../../components/assets/PreciousMetalAssetSheet'
import { BankTopUpSheet }          from '../../components/assets/BankTopUpSheet'
import { ConfirmSheet }            from '../../components/shared/ConfirmSheet'
import { formatINR, formatShortDate } from '../../utils/format'
import { parseBankNotes, compoundWithTopUps } from '../../utils/bankCalc'
import type { BankDeposit } from '../../utils/bankCalc'
import type { AssetEntry, AssetPatch, NewAsset } from '../../lib/db'

const ACCOUNT_TYPES = ['Savings', 'Current', 'FD', 'RD', 'NRE', 'NRO'] as const
type AccountType = typeof ACCOUNT_TYPES[number]

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtStartDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function splitBankLabel(label: string): { bankName: string; accountType: string } {
  const idx = label.lastIndexOf(' \u2013 ')
  if (idx === -1) return { bankName: label, accountType: '' }
  return { bankName: label.slice(0, idx).trim(), accountType: label.slice(idx + 3).trim() }
}

function buildNotesStr(rate: number | null, startDate: string | null, userNote: string): string {
  const metaParts: string[] = []
  if (rate != null) metaParts.push(`${rate.toFixed(2)}%`)
  if (startDate)    metaParts.push(`From ${startDate}`)
  return userNote.trim() ? [...metaParts, userNote.trim()].join(' \u00b7 ') : metaParts.join(' \u00b7 ')
}

function isTopUp(notes: string | null): boolean {
  return notes?.includes('top-up') ?? false
}

// Parse stock top-up notes: "top-up · qty:10 · price:150.50"
function parseStockTopUpNotes(notes: string | null): { qty: number | null; price: number | null } {
  if (!notes) return { qty: null, price: null }
  const qtyMatch   = notes.match(/qty:(\d+(?:\.\d+)?)/)
  const priceMatch = notes.match(/price:(\d+(?:\.\d+)?)/)
  return {
    qty:   qtyMatch   ? parseFloat(qtyMatch[1])   : null,
    price: priceMatch ? parseFloat(priceMatch[1]) : null,
  }
}

// ─── SVG Arrow icons (replaces unicode ▲▼ which render as text on Android) ───
function ArrowUp({ color, size = 9 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill={color} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <polygon points="5,1 9,9 1,9" />
    </svg>
  )
}

function ArrowDown({ color, size = 9 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill={color} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <polygon points="5,9 9,1 1,1" />
    </svg>
  )
}

// ─── SVG right-arrow (replaces \u2192 which renders as text on Android) ───────
function ArrowRight({ size = 10, color = 'rgba(255,255,255,0.25)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <line x1="1" y1="5" x2="9" y2="5" />
      <polyline points="6,2 9,5 6,8" />
    </svg>
  )
}

// ─── P&L badge ────────────────────────────────────────────────────────────────
function PnlBadge({ asset }: {
  asset: { value: number; current_price: number | null; quantity: number | null; buy_price: number | null }
}) {
  if (!asset.current_price || !asset.quantity || !asset.buy_price) return null
  const currentVal  = asset.current_price * asset.quantity
  const investedVal = asset.buy_price     * asset.quantity
  const diff = currentVal - investedVal
  const pct  = investedVal > 0 ? (diff / investedVal) * 100 : 0
  if (Math.abs(diff) < 0.01) return null
  const gain = diff > 0
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
      background: gain ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
      color:      gain ? '#34d399'               : '#f87171',
      border:     `1px solid ${gain ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
      whiteSpace: 'nowrap' as const,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {gain ? <ArrowUp color="#34d399" /> : <ArrowDown color="#f87171" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ─── Global summary card ──────────────────────────────────────────────────────
function SummaryCard({ totalValue, assetCount, loading }: {
  totalValue: number; assetCount: number; loading: boolean
}) {
  return (
    <div style={{
      borderRadius: 24, padding: '22px 24px',
      background: 'linear-gradient(135deg, rgba(52,211,153,0.10) 0%, rgba(16,185,129,0.07) 100%)',
      border: '1px solid rgba(52,211,153,0.22)',
      boxShadow: '0 4px 32px rgba(52,211,153,0.10), 0 1px 0 rgba(255,255,255,0.04) inset',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.6)', margin: 0 }}>Asset Value</p>
          <motion.p key={totalValue} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ fontSize: 16, fontWeight: 800, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums', margin: 0 }}
          >{loading ? '\u2014' : formatINR(totalValue)}</motion.p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.6)', margin: 0 }}>Net Worth</p>
          <motion.p key={totalValue + '-nw'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}
            style={{ fontSize: 24, fontWeight: 900, color: '#34d399', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 24px rgba(52,211,153,0.55)', letterSpacing: '-0.02em' }}
          >{loading ? '\u2014' : formatINR(totalValue)}</motion.p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.6)', margin: 0, textAlign: 'right' }}>Assets</p>
          <motion.p key={assetCount} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}
            style={{ fontSize: 24, fontWeight: 900, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 20px rgba(110,231,183,0.4)' }}
          >{loading ? '\u2014' : assetCount}</motion.p>
        </div>
      </div>
    </div>
  )
}

// ─── Per-group summary card ───────────────────────────────────────────────────
type AssetItem = {
  id: string; label: string; category: string; value: number; notes: string | null
  created_at: string; current_price: number | null; quantity: number | null
  buy_price: number | null; last_synced: string | null
}

function GroupSummaryCard({ group, items }: {
  group: typeof ASSET_GROUPS[number]
  items: AssetItem[]
}) {
  const isBank  = group.id === 'Bank'
  const isStock = group.id === 'Stock'

  const rootItems = (isBank || isStock) ? items.filter(a => !isTopUp(a.notes)) : items
  const totalInvested = rootItems.reduce((s, a) => s + a.value, 0)
    + ((isBank || isStock) ? items.filter(a => isTopUp(a.notes)).reduce((s, a) => s + a.value, 0) : 0)

  const bankNetWorth = useMemo(() => {
    if (!isBank) return null
    const deposits: BankDeposit[] = []
    const rootLabels = [...new Set(rootItems.map(a => a.label))]
    for (const label of rootLabels) {
      const siblings = items.filter(a => a.label === label)
      const root = siblings.find(a => !isTopUp(a.notes))
      if (!root) continue
      const { rate } = parseBankNotes(root.notes)
      if (!rate) { deposits.push({ amount: root.value, startDate: new Date().toISOString().substring(0,10), rate: 0 }); continue }
      for (const s of siblings) {
        const p = parseBankNotes(s.notes)
        if (p.startDate) deposits.push({ amount: s.value, startDate: p.startDate, rate })
      }
    }
    return deposits.length > 0 ? compoundWithTopUps(deposits) : totalInvested
  }, [isBank, items, rootItems, totalInvested])

  const liveItems    = items.filter(a => a.current_price != null && a.quantity != null)
  const liveValue    = liveItems.reduce((s, a) => s + (a.current_price! * a.quantity!), 0)
  const hasLive      = liveItems.length > 0
  const investedLive = liveItems.reduce((s, a) => s + a.value, 0)
  const pnlAbs       = liveValue - investedLive
  const pnlPct       = investedLive > 0 ? (pnlAbs / investedLive) * 100 : 0
  const pnlGain      = pnlAbs >= 0

  const displayNetWorth = isBank ? (bankNetWorth ?? totalInvested) : (hasLive ? liveValue : totalInvested)
  const assetCount = (isBank || isStock) ? rootItems.length : items.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 24, padding: '20px 20px 18px',
        background: group.color, border: `1px solid ${group.border}`,
        boxShadow: `0 4px 28px ${group.color}, 0 1px 0 rgba(255,255,255,0.04) inset`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: group.border, filter: 'blur(40px)', pointerEvents: 'none', opacity: 0.6 }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: group.text, opacity: 0.6, margin: '0 0 4px' }}>Total Invested</p>
          <motion.p key={totalInvested} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 22, fontWeight: 900, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', margin: 0 }}
          >{formatINR(totalInvested)}</motion.p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: group.text, opacity: 0.6, margin: '0 0 4px' }}>Net Worth</p>
          <motion.p key={displayNetWorth} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 22, fontWeight: 900, color: group.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', margin: 0, textShadow: `0 0 20px ${group.border}` }}
          >{formatINR(displayNetWorth)}</motion.p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(0,0,0,0.18)', border: `1px solid ${group.border}` }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={group.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 800, color: group.text, fontVariantNumeric: 'tabular-nums' }}>{assetCount}</span>
          <span style={{ fontSize: 10, color: group.text, opacity: 0.65, fontWeight: 600 }}>{assetCount === 1 ? 'asset' : 'assets'}</span>
        </div>
        {!isBank && hasLive && Math.abs(pnlAbs) >= 0.01 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: pnlGain ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)', border: `1px solid ${pnlGain ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}` }}>
            {pnlGain ? <ArrowUp color="#34d399" /> : <ArrowDown color="#f87171" />}
            <span style={{ fontSize: 12, fontWeight: 900, color: pnlGain ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>{formatINR(Math.abs(pnlAbs))}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: pnlGain ? '#34d399' : '#f87171', opacity: 0.8 }}>{Math.abs(pnlPct).toFixed(1)}%</span>
          </div>
        )}
        {isBank && bankNetWorth !== null && bankNetWorth > totalInvested && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.4)' }}>
            <ArrowUp color="#34d399" />
            <span style={{ fontSize: 12, fontWeight: 900, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>{formatINR(bankNetWorth - totalInvested)}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', opacity: 0.8 }}>interest</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Group Card (grid) ────────────────────────────────────────────────────────
function GroupCard({ group, total, count, loading, onPress }: {
  group: typeof ASSET_GROUPS[number]; total: number; count: number; loading: boolean; onPress: () => void
}) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onPress}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 10, padding: '18px 16px',
        background: group.color, border: `1px solid ${group.border}`,
        borderRadius: 22, cursor: 'pointer', width: '100%',
        boxShadow: `0 4px 20px ${group.color}`, position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: group.border, filter: 'blur(22px)', pointerEvents: 'none' }} />
      <span style={{ fontSize: 30, lineHeight: 1 }}>{group.emoji}</span>
      <div style={{ width: '100%' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: group.text, margin: '0 0 5px', letterSpacing: '-0.01em' }}>{group.label}</p>
        {loading
          ? <div style={{ height: 14, width: 60, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
          : <p style={{ fontSize: 15, fontWeight: 900, color: '#f5f7ff', margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {count === 0 ? <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>No entries yet</span> : formatINR(total)}
            </p>
        }
      </div>
      {count > 0 && (
        <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: group.text, opacity: 0.7, background: group.border.replace('0.35', '0.18'), padding: '2px 8px', borderRadius: 99, border: `1px solid ${group.border}` }}>
          {count} {count === 1 ? 'asset' : 'assets'}
        </div>
      )}
    </motion.button>
  )
}

// ─── shared sheet shell styles ────────────────────────────────────────────────
const sheetShell = {
  position: 'fixed' as const,
  bottom: 0, left: 0, right: 0, zIndex: 50,
  background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
  border: '1px solid rgba(96,165,250,0.22)',
  borderBottom: 'none',
  borderRadius: '28px 28px 0 0',
  display: 'flex', flexDirection: 'column' as const,
  maxHeight: '92dvh',
}
const sheetFooter = {
  flexShrink: 0,
  padding: '12px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
  borderTop: '1px solid rgba(96,165,250,0.18)',
  background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
}
const dragHandle = (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px', flexShrink: 0 }}>
    <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
  </div>
)

// ─── Bank Log Sheet ───────────────────────────────────────────────────────────
function BankLogSheet({ open, asset, allBankItems, onClose }: {
  open: boolean; asset: AssetItem | null; allBankItems: AssetItem[]; onClose: () => void
}) {
  if (!asset) return null
  const { bankName, accountType } = splitBankLabel(asset.label)
  const { rate } = parseBankNotes(asset.notes)

  const siblings = allBankItems
    .filter(a => a.label === asset.label)
    .map(a => {
      const p = parseBankNotes(a.notes)
      return { id: a.id, value: a.value, startDate: p.startDate, created_at: a.created_at, isTopUp: isTopUp(a.notes) }
    })
    .sort((a, b) => (a.startDate ?? a.created_at).localeCompare(b.startDate ?? b.created_at))

  const totalPrincipal = siblings.reduce((s, a) => s + a.value, 0)
  const appreciated = rate
    ? compoundWithTopUps(siblings.filter(s => s.startDate).map(s => ({ amount: s.value, startDate: s.startDate!, rate })))
    : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="blog-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />
          <motion.div key="blog-sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} style={sheetShell}>
            {dragHandle}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 18px', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#93c5fd', margin: '0 0 2px' }}>Transaction Log</p>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f5f7ff', margin: 0, letterSpacing: '-0.02em' }}>{bankName}{accountType ? ` \u2013 ${accountType}` : ''}</h2>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {siblings.map((entry, i) => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: entry.isTopUp ? 'rgba(96,165,250,0.06)' : 'rgba(52,211,153,0.06)', border: `1px solid ${entry.isTopUp ? 'rgba(96,165,250,0.14)' : 'rgba(52,211,153,0.14)'}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: entry.isTopUp ? '#60a5fa' : '#34d399', boxShadow: `0 0 8px ${entry.isTopUp ? '#60a5fa' : '#34d399'}` }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: entry.isTopUp ? '#93c5fd' : '#6ee7b7', margin: '0 0 2px' }}>{i === 0 ? '\ud83d\udfe2 Created' : '\ud83d\udd35 Top-up'}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{entry.startDate ? fmtStartDate(entry.startDate) : fmtStartDate(entry.created_at.substring(0, 10))}</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums', margin: 0 }}>{formatINR(entry.value)}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Total Principal</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalPrincipal)}</span>
                </div>
                {appreciat