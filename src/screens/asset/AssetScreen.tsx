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
                {appreciated !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Appreciated Today</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>\u2248 {formatINR(appreciated)}</span>
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

// ─── Bank Edit Sheet ──────────────────────────────────────────────────────────
function BankEditSheet({ open, asset, allBankItems, onClose, onSave }: {
  open: boolean; asset: AssetItem | null; allBankItems: AssetItem[]; onClose: () => void
  onSave: (ids: string[], newLabel: string, newNotes: (oldNotes: string | null) => string) => Promise<void>
}) {
  const { bankName: initName, accountType: initType } = splitBankLabel(asset?.label ?? '')
  const { userNote: initNote } = parseBankNotes(asset?.notes ?? null)
  const [bankName,    setBankName]    = useState(initName)
  const [accountType, setAccountType] = useState<AccountType | ''>(initType as AccountType | '')
  const [note,        setNote]        = useState(initNote)
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState('')
  const prevOpen = useRef(false)
  if (open && !prevOpen.current) {
    const { bankName: n, accountType: t } = splitBankLabel(asset?.label ?? '')
    const { userNote: u } = parseBankNotes(asset?.notes ?? null)
    if (bankName !== n)    setBankName(n)
    if (accountType !== t) setAccountType(t as AccountType | '')
    if (note !== u)        setNote(u)
    setErr('')
  }
  prevOpen.current = open
  if (!asset) return null
  const siblings = allBankItems.filter(a => a.label === asset.label)
  const handleSave = async () => {
    if (!bankName.trim()) { setErr('Enter bank name'); return }
    if (!accountType)     { setErr('Select account type'); return }
    try {
      setSaving(true); setErr('')
      const newLabel = `${bankName.trim()} \u2013 ${accountType}`
      await onSave(siblings.map(a => a.id), newLabel, (oldNotes) => {
        const p = parseBankNotes(oldNotes)
        return buildNotesStr(p.rate, p.startDate, oldNotes?.includes('top-up') ? (oldNotes ?? '') : note)
      })
      onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }
  const inp = { width: '100%', padding: '13px 16px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const }
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bedit-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />
          <motion.div key="bedit-sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }} style={sheetShell}>
            {dragHandle}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 20px', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✏️</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#93c5fd', margin: '0 0 2px' }}>Edit Bank Asset</p>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f5f7ff', margin: 0, letterSpacing: '-0.02em' }}>{asset.label}</h2>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 8px' }}>
              <label style={{ display: 'block', marginBottom: 18 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Bank Name</p>
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} style={inp} placeholder="e.g. HDFC Bank" />
              </label>
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Account Type</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ACCOUNT_TYPES.map(t => (
                    <motion.button key={t} whileTap={{ scale: 0.92 }} onClick={() => setAccountType(t)}
                      style={{ padding: '9px 18px', borderRadius: 100, fontSize: 13, fontWeight: accountType === t ? 700 : 400, background: accountType === t ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.04)', border: accountType === t ? '1px solid rgba(96,165,250,0.55)' : '1px solid rgba(255,255,255,0.09)', color: accountType === t ? '#93c5fd' : 'rgba(255,255,255,0.45)', cursor: 'pointer' }}
                    >{t}</motion.button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Note <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} style={inp} placeholder="Branch, account ending, any detail" />
              </label>
              {err && <p style={{ fontSize: 13, color: '#fca5a5', padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)', marginBottom: 8 }}>{err}</p>}
            </div>
            <div style={sheetFooter}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '16px', background: saving ? 'rgba(96,165,250,0.2)' : 'linear-gradient(135deg, #60a5fa, #3b82f6)', border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(96,165,250,0.35)' }}
              >{saving ? 'Saving\u2026' : 'Save Changes'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Stock Top-Up Sheet ───────────────────────────────────────────────────────
function StockTopUpSheet({ open, stockLabel, onClose, onSave }: {
  open: boolean; stockLabel: string; onClose: () => void
  onSave: (data: { label: string; category: string; value: number; notes: string }) => Promise<void>
}) {
  const [qty,     setQty]     = useState('')
  const [price,   setPrice]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const prevOpen = useRef(false)
  if (open && !prevOpen.current) { setQty(''); setPrice(''); setErr('') }
  prevOpen.current = open

  const total = useMemo(() => {
    const q = parseFloat(qty); const p = parseFloat(price)
    return (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) ? q * p : null
  }, [qty, price])

  const handleSave = async () => {
    const q = parseFloat(qty); const p = parseFloat(price)
    if (isNaN(q) || q <= 0)  { setErr('Enter a valid quantity'); return }
    if (isNaN(p) || p <= 0)  { setErr('Enter a valid price'); return }
    try {
      setSaving(true); setErr('')
      await onSave({
        label: stockLabel,
        category: 'Stock',
        value: q * p,
        notes: `top-up \u00b7 qty:${q} \u00b7 price:${p}`,
      })
      onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const inp = { width: '100%', padding: '13px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 14, color: '#f5f7ff', fontSize: 16, outline: 'none', boxSizing: 'border-box' as const, fontVariantNumeric: 'tabular-nums' as const }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="stu-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />
          <motion.div key="stu-sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...sheetShell, border: '1px solid rgba(251,191,36,0.28)' }}
          >
            {dragHandle}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 20px', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📈</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fcd34d', margin: '0 0 2px' }}>Add Stocks</p>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f5f7ff', margin: 0, letterSpacing: '-0.02em' }}>{stockLabel}</h2>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 8px' }}>
              <label style={{ display: 'block', marginBottom: 18 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Quantity</p>
                <input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} style={inp} placeholder="e.g. 10" />
              </label>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Price per Stock (&#8377;)</p>
                <input type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} style={inp} placeholder="e.g. 1500" />
              </label>
              {total !== null && (
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Total Value</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#fcd34d', fontVariantNumeric: 'tabular-nums' }}>{formatINR(total)}</span>
                  </div>
                </div>
              )}
              {err && <p style={{ fontSize: 13, color: '#fca5a5', padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)', marginBottom: 8 }}>{err}</p>}
            </div>
            <div style={sheetFooter}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{ width: '100%', padding: '16px', background: saving ? 'rgba(251,191,36,0.2)' : 'linear-gradient(135deg, #fcd34d, #f59e0b)', border: 'none', borderRadius: 16, color: '#1a1000', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(251,191,36,0.35)' }}
              >{saving ? 'Adding\u2026' : 'Add Stocks'}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Stock Log Sheet ──────────────────────────────────────────────────────────
function StockLogSheet({ open, asset, allStockItems, onClose }: {
  open: boolean; asset: AssetItem | null; allStockItems: AssetItem[]; onClose: () => void
}) {
  if (!asset) return null

  const siblings = allStockItems
    .filter(a => a.label === asset.label)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  const totalInvested  = siblings.reduce((s, a) => s + a.value, 0)
  const totalQty       = siblings.reduce((s, a) => {
    if (!isTopUp(a.notes)) {
      return s + (a.quantity ?? 0)
    }
    const p = parseStockTopUpNotes(a.notes)
    return s + (p.qty ?? 0)
  }, 0)
  const currentVal = asset.current_price != null ? asset.current_price * totalQty : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="slog-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />
          <motion.div key="slog-sh" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ ...sheetShell, border: '1px solid rgba(251,191,36,0.28)' }}
          >
            {dragHandle}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 18px', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📋</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fcd34d', margin: '0 0 2px' }}>Transaction Log</p>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f5f7ff', margin: 0, letterSpacing: '-0.02em' }}>{asset.label}</h2>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {siblings.map((entry, i) => {
                  const isTU = isTopUp(entry.notes)
                  const p    = isTU ? parseStockTopUpNotes(entry.notes) : null
                  const qty  = isTU ? (p?.qty ?? null) : (entry.quantity ?? null)
                  const price = isTU ? (p?.price ?? null) : (entry.buy_price ?? null)
                  return (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: isTU ? 'rgba(251,191,36,0.06)' : 'rgba(52,211,153,0.06)', border: `1px solid ${isTU ? 'rgba(251,191,36,0.16)' : 'rgba(52,211,153,0.14)'}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isTU ? '#fcd34d' : '#34d399', boxShadow: `0 0 8px ${isTU ? '#fcd34d' : '#34d399'}` }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: isTU ? '#fcd34d' : '#6ee7b7', margin: '0 0 2px' }}>
                          {i === 0 ? '\ud83d\udfe2 Created' : '\ud83d\udd35 Top-up'}
                        </p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtStartDate(entry.created_at.substring(0, 10))}
                          {qty !== null && price !== null ? ` \u00b7 ${qty} shares @ ${formatINR(price)}` : ''}
                        </p>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums', margin: 0 }}>{formatINR(entry.value)}</p>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Total Invested</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fcd34d', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalInvested)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: currentVal !== null ? 8 : 0 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Total Quantity</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums' }}>{totalQty} shares</span>
                </div>
                {currentVal !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Current Value</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: currentVal >= totalInvested ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>{formatINR(currentVal)}</span>
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

// ─── Bank asset card ──────────────────────────────────────────────────────────
function BankAssetCard({
  asset, allBankItems, reorderMode, dragHandleProps,
  onDelete, onTopUp, onLog, onEdit, working,
}: {
  asset: AssetItem; allBankItems: AssetItem[]; reorderMode: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onDelete: (id: string, label: string) => void; onTopUp: (asset: AssetItem) => void
  onLog: (asset: AssetItem) => void; onEdit: (asset: AssetItem) => void; working: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const { rate, startDate, userNote } = parseBankNotes(asset.notes)
  const { bankName, accountType } = splitBankLabel(asset.label)

  const siblingDeposits = useMemo((): BankDeposit[] => {
    if (!rate) return []
    return allBankItems
      .filter(a => a.label === asset.label)
      .map(a => { const p = parseBankNotes(a.notes); return p.startDate ? { amount: a.value, startDate: p.startDate, rate: rate } : null })
      .filter((d): d is BankDeposit => d !== null)
  }, [allBankItems, asset.label, rate])

  const appreciated = useMemo(() => siblingDeposits.length > 0 ? compoundWithTopUps(siblingDeposits) : null, [siblingDeposits])

  if (isTopUp(asset.notes)) return null

  const totalPrincipal = allBankItems.filter(a => a.label === asset.label).reduce((s, a) => s + a.value, 0)
  const sep = <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
  const iconBtn = (color: string, bg: string, border: string) => ({ width: 34, height: 34, borderRadius: 10, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color })

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ borderRadius: 18, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.16)', overflow: 'hidden', cursor: reorderMode ? 'grab' : 'pointer' }}
      onClick={() => { if (!reorderMode) setExpanded(e => !e) }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px 10px' }}>
        {reorderMode
          ? <div {...dragHandleProps} style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)', flexShrink: 0, cursor: 'grab', padding: '2px 4px', touchAction: 'none' }}>☰</div>
          : <span style={{ fontSize: 22, flexShrink: 0 }}>🏦</span>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'baseline' }}>
            <span style={{ color: '#f5f7ff' }}>{bankName}</span>
            {accountType ? <>{sep}<span style={{ fontWeight: 500, fontSize: 13, color: 'rgba(147,197,253,0.75)' }}>{accountType}</span></> : null}
            {userNote    ? <>{sep}<span style={{ fontWeight: 400, fontSize: 12, fontStyle: 'italic', color: 'rgba(148,163,184,0.55)' }}>{userNote}</span></> : null}
          </p>
          {rate ? <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#93c5fd', background: 'rgba(96,165,250,0.15)', padding: '2px 9px', borderRadius: 99, border: '1px solid rgba(96,165,250,0.35)', fontVariantNumeric: 'tabular-nums' }}>{rate.toFixed(2)}% p.a.</span> : null}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalPrincipal)}</span>
            {appreciated !== null && (
              <>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>\u2192</span>
                <ArrowUp color="#34d399" size={8} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>\u2248 {formatINR(appreciated)}</span>
              </>
            )}
          </div>
          {startDate && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: '3px 0 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtStartDate(startDate)}</p>}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && !reorderMode && (
          <motion.div key="bactions" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden' }}>
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '8px 14px 10px', borderTop: '1px solid rgba(96,165,250,0.10)', background: 'rgba(96,165,250,0.04)' }}>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setExpanded(false); onTopUp(asset) }} style={iconBtn('#93c5fd', 'rgba(96,165,250,0.14)', 'rgba(96,165,250,0.3)')} title="Add Deposit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setExpanded(false); onLog(asset) }} style={iconBtn('#a5b4fc', 'rgba(99,102,241,0.14)', 'rgba(99,102,241,0.3)')} title="Transaction Log">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setExpanded(false); onEdit(asset) }} style={iconBtn('#fcd34d', 'rgba(251,191,36,0.12)', 'rgba(251,191,36,0.28)')} title="Edit">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setExpanded(false); onDelete(asset.id, asset.label) }} disabled={working === asset.id} style={iconBtn('#f87171', 'rgba(248,113,113,0.12)', 'rgba(248,113,113,0.28)')} title="Delete">
                {working === asset.id ? <span style={{ fontSize: 11, color: '#f87171' }}>…</span> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Stock asset card ─────────────────────────────────────────────────────────
function StockAssetCard({
  asset, allStockItems, reorderMode, dragHandleProps,
  onDelete, onTopUp, onLog, working,
}: {
  asset: AssetItem; allStockItems: AssetItem[]; reorderMode: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onDelete: (id: string, label: string) => void
  onTopUp: (asset: AssetItem) => void
  onLog: (asset: AssetItem) => void
  working: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  if (isTopUp(asset.notes)) return null

  const siblings = allStockItems.filter(a => a.label === asset.label)
  const totalInvested = siblings.reduce((s, a) => s + a.value, 0)

  const totalQty = siblings.reduce((s, a) => {
    if (!isTopUp(a.notes)) return s + (a.quantity ?? 0)
    const p = parseStockTopUpNotes(a.notes)
    return s + (p.qty ?? 0)
  }, 0)

  const currentVal = asset.current_price != null && totalQty > 0 ? asset.current_price * totalQty : null
  const isGain     = currentVal != null && currentVal >= totalInvested

  const sep = <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>

  const iconBtn = (color: string, bg: string, border: string) => ({
    width: 34, height: 34, borderRadius: 10, background: bg,
    border: `1px solid ${border}`, display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color,
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ borderRadius: 18, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.16)', overflow: 'hidden', cursor: reorderMode ? 'grab' : 'pointer' }}
      onClick={() => { if (!reorderMode) setExpanded(e => !e) }}
    >
      {/* ── Main row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px 10px' }}>
        {/* Left: drag handle or emoji */}
        {reorderMode
          ? <div {...dragHandleProps} style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)', flexShrink: 0, cursor: 'grab', padding: '2px 4px', touchAction: 'none' }}>☰</div>
          : <span style={{ fontSize: 22, flexShrink: 0 }}>📈</span>
        }

        {/* Centre: stock name + inline qty/note, live price pill below */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'baseline' }}>
            <span style={{ color: '#f5f7ff' }}>{asset.label}</span>
            {totalQty > 0 ? <>{sep}<span style={{ fontWeight: 500, fontSize: 13, color: 'rgba(252,211,77,0.7)' }}>{totalQty} shares</span></> : null}
          </p>
          {/* Live price pill */}
          {asset.current_price != null
            ? <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#fcd34d', background: 'rgba(251,191,36,0.15)', padding: '2px 9px', borderRadius: 99, border: '1px solid rgba(251,191,36,0.35)', fontVariantNumeric: 'tabular-nums' }}>
                {'\u20b9'}{asset.current_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            : <PnlBadge asset={{ ...asset, quantity: totalQty, value: totalInvested }} />
          }
        </div>

        {/* Right: invested → current value */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(252,211,77,0.7)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalInvested)}</span>
            {currentVal !== null && (
              <>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>&#8594;</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: isGain ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums', textShadow: isGain ? '0 0 10px rgba(52,211,153,0.45)' : '0 0 10px rgba(248,113,113,0.35)' }}>
                  {formatINR(currentVal)}
                </span>
              </>
            )}
          </div>
          {/* P&L badge */}
          {currentVal !== null && (
            <div style={{ marginTop: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <PnlBadge asset={{ ...asset, quantity: totalQty, value: totalInvested }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Expanded action row ── */}
      <AnimatePresence initial={false}>
        {expanded && !reorderMode && (
          <motion.div
            key="sactions"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '8px 14px 10px', borderTop: '1px solid rgba(251,191,36,0.10)', background: 'rgba(251,191,36,0.04)' }}>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setExpanded(false); onTopUp(asset) }} style={iconBtn('#fcd34d', 'rgba(251,191,36,0.14)', 'rgba(251,191,36,0.3)')} title="Add Stocks">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setExpanded(false); onLog(asset) }} style={iconBtn('#a5b4fc', 'rgba(99,102,241,0.14)', 'rgba(99,102,241,0.3)')} title="Transaction Log">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setExpanded(false); onDelete(asset.id, asset.label) }} disabled={working === asset.id} style={iconBtn('#f87171', 'rgba(248,113,113,0.12)', 'rgba(248,113,113,0.28)')} title="Delete">
                {working === asset.id ? <span style={{ fontSize: 11, color: '#f87171' }}>…</span> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Generic asset card (non-Bank, non-Stock) ─────────────────────────────────
function GenericAssetCard({ asset, group, onDelete, working }: {
  asset: AssetItem; group: typeof ASSET_GROUPS[number]
  onDelete: (id: string, label: string) => void; working: string | null
}) {
  const hasLiveData    = asset.current_price != null && asset.quantity != null && asset.buy_price != null
  const investedAmt    = hasLiveData ? asset.buy_price! * asset.quantity! : null
  const appreciatedAmt = hasLiveData ? asset.current_price! * asset.quantity! : null
  const isGain         = appreciatedAmt != null && investedAmt != null && appreciatedAmt >= investedAmt

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ borderRadius: 18, background: group.color, border: `1px solid ${group.border.replace('0.35', '0.18')}`, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px 10px' }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{group.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.label}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {asset.notes && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: 0 }}>{asset.notes}</p>}
            <PnlBadge asset={asset} />
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
          {hasLiveData ? (
            <>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(investedAmt!)}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: isGain ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums', textShadow: isGain ? '0 0 12px rgba(52,211,153,0.5)' : '0 0 12px rgba(248,113,113,0.4)' }}>{formatINR(appreciatedAmt!)}</span>
            </>
          ) : (
            <p style={{ fontSize: 15, fontWeight: 800, color: group.text, fontVariantNumeric: 'tabular-nums', margin: 0 }}>{formatINR(asset.value)}</p>
          )}
          <button onClick={() => onDelete(asset.id, asset.label)} disabled={working === asset.id}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 1 }}
          >{working === asset.id ? '\u2026' : 'delete'}</button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Per-group detail view ────────────────────────────────────────────────────
function GroupDetailView({
  group, items, loading, reorderMode, onToggleReorder,
  onBack, onAddPress, onDelete, onTopUp, onStockTopUp, onLog, onStockLog, onEdit, working,
  reorderedIds, onReorder,
}: {
  group: typeof ASSET_GROUPS[number]; items: AssetItem[]; loading: boolean
  reorderMode: boolean; onToggleReorder: () => void; onBack: () => void; onAddPress: () => void
  onDelete: (id: string, label: string) => void
  onTopUp: (asset: AssetItem) => void
  onStockTopUp: (asset: AssetItem) => void
  onLog: (asset: AssetItem) => void
  onStockLog: (asset: AssetItem) => void
  onEdit: (asset: AssetItem) => void
  working: string | null; reorderedIds: string[]; onReorder: (fromIdx: number, toIdx: number) => void
}) {
  const isBank  = group.id === 'Bank'
  const isStock = group.id === 'Stock'
  const supportsReorder = isBank || isStock

  const rootItems = (isBank || isStock) ? items.filter(a => !isTopUp(a.notes)) : items

  const displayItems = supportsReorder && reorderedIds.length > 0
    ? [...rootItems].sort((a, b) => {
        const ai = reorderedIds.indexOf(a.id)
        const bi = reorderedIds.indexOf(b.id)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : rootItems

  const dragIdx = useRef<number | null>(null)

  return (
    <motion.div
      key={'detail-' + group.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Top nav */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 8 }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={onBack}
          style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{group.emoji}</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#f5f7ff', margin: 0, letterSpacing: '-0.01em' }}>{group.label}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {supportsReorder && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onToggleReorder}
              title="Reorder"
              style={{
                width: 36, height: 36, borderRadius: 12,
                background: reorderMode ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.07)',
                border: reorderMode ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={reorderMode ? '#fcd34d' : 'rgba(255,255,255,0.75)'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onAddPress}
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: `linear-gradient(135deg, ${group.border}, ${group.color})`,
              border: `1px solid ${group.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={group.text} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Summary card */}
      <GroupSummaryCard group={group} items={items} />

      {/* Asset list */}
      <AnimatePresence mode="popLayout">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 68, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </motion.div>
        ) : displayItems.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '40px 20px' }}
          >
            <p style={{ fontSize: 36, marginBottom: 12 }}>{group.emoji}</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: 0 }}>No {group.label} assets yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>Tap + to add your first entry</p>
          </motion.div>
        ) : (
          <motion.div key="list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayItems.map((item, idx) => {
              const dragProps: React.HTMLAttributes<HTMLDivElement> = reorderMode ? {
                draggable: true,
                onDragStart: () => { dragIdx.current = idx },
                onDragOver: (e) => { e.preventDefault() },
                onDrop: () => {
                  if (dragIdx.current !== null && dragIdx.current !== idx) {
                    onReorder(dragIdx.current, idx)
                    dragIdx.current = null
                  }
                },
              } : {}

              if (isBank) {
                return (
                  <BankAssetCard
                    key={item.id}
                    asset={item}
                    allBankItems={items}
                    reorderMode={reorderMode}
                    dragHandleProps={dragProps}
                    onDelete={onDelete}
                    onTopUp={onTopUp}
                    onLog={onLog}
                    onEdit={onEdit}
                    working={working}
                  />
                )
              }
              if (isStock) {
                return (
                  <StockAssetCard
                    key={item.id}
                    asset={item}
                    allStockItems={items}
                    reorderMode={reorderMode}
                    dragHandleProps={dragProps}
                    onDelete={onDelete}
                    onTopUp={onStockTopUp}
                    onLog={onStockLog}
                    working={working}
                  />
                )
              }
              return (
                <GenericAssetCard
                  key={item.id}
                  asset={item}
                  group={group}
                  onDelete={onDelete}
                  working={working}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main AssetScreen ─────────────────────────────────────────────────────────
export function AssetScreen() {
  const { assets, loading, add: addAsset, remove: deleteAsset, update: updateAsset } = useAssets()

  const updateMultipleAssets = useCallback(
    async (ids: string[], patchFn: (entry: AssetEntry, idx: number) => AssetPatch) => {
      await Promise.all(ids.map((id, idx) => {
        const entry = assets.find(a => a.id === id)
        if (!entry) return Promise.resolve()
        return updateAsset(id, patchFn(entry, idx))
      }))
    },
    [assets, updateAsset],
  )

  const [activeGroup, setActiveGroup] = useState<AssetGroupId | null>(null)
  const [addSheet,    setAddSheet]    = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [reorderedIds, setReorderedIds] = useState<string[]>([])

  // Bank sub-sheets
  const [bankLogAsset,  setBankLogAsset]  = useState<AssetItem | null>(null)
  const [bankEditAsset, setBankEditAsset] = useState<AssetItem | null>(null)
  const [bankTopUpAsset, setBankTopUpAsset] = useState<AssetItem | null>(null)

  // Stock sub-sheets
  const [stockTopUpAsset, setStockTopUpAsset] = useState<AssetItem | null>(null)
  const [stockLogAsset,   setStockLogAsset]   = useState<AssetItem | null>(null)

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null)
  const [working, setWorking] = useState<string | null>(null)

  const group = activeGroup ? ASSET_GROUPS.find(g => g.id === activeGroup) ?? null : null

  const groupedAssets = useMemo(() => {
    const map: Record<string, AssetItem[]> = {}
    for (const g of ASSET_GROUPS) map[g.id] = []
    for (const a of assets) {
      const cat = a.category as AssetGroupId
      if (map[cat]) map[cat].push(a as AssetItem)
    }
    return map
  }, [assets])

  const totalValue = useMemo(() => {
    return assets
      .filter(a => !isTopUp(a.notes))
      .reduce((s, a) => {
        if (a.current_price != null && a.quantity != null) return s + a.current_price * a.quantity
        return s + a.value
      }, 0)
  }, [assets])

  const rootAssetCount = useMemo(() => assets.filter(a => !isTopUp(a.notes)).length, [assets])

  const handleDelete = useCallback(async (id: string, _label: string) => {
    setWorking(id)
    try {
      await deleteAsset(id)
    } finally {
      setWorking(null)
      setConfirmDelete(null)
    }
  }, [deleteAsset])

  const handleBankSaveEdit = useCallback(async (
    ids: string[],
    newLabel: string,
    newNotesFn: (oldNotes: string | null) => string,
  ) => {
    await updateMultipleAssets(ids, (old: AssetEntry) => ({ label: newLabel, notes: newNotesFn(old.notes ?? null) }))
  }, [updateMultipleAssets])

  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    if (!group) return
    const items = (groupedAssets[group.id] ?? []).filter(a => !isTopUp(a.notes))
    const base = reorderedIds.length > 0
      ? [...items].sort((a, b) => {
          const ai = reorderedIds.indexOf(a.id); const bi = reorderedIds.indexOf(b.id)
          if (ai === -1 && bi === -1) return 0
          if (ai === -1) return 1; if (bi === -1) return -1
          return ai - bi
        })
      : items
    const next = [...base]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setReorderedIds(next.map(a => a.id))
  }, [group, groupedAssets, reorderedIds])

  const handleSaveReorder = useCallback(async () => {
    if (reorderedIds.length === 0) { setReorderMode(false); return }
    await updateMultipleAssets(reorderedIds, (_old: AssetEntry, idx: number) => ({ sort_order: idx }))
    setReorderMode(false)
  }, [reorderedIds, updateMultipleAssets])

  const currentGroupItems = group ? (groupedAssets[group.id] ?? []) : []

  const AddSheet = useMemo(() => {
    if (!group) return null
    const props = {
      open: addSheet,
      onClose: () => setAddSheet(false),
      onSave: async (asset: NewAsset) => {
        await addAsset({ ...asset, notes: asset.notes ?? null, category: group.id })
        setAddSheet(false)
      },
    }
    switch (group.id as AssetGroupId) {
      case 'Bank':          return <BankAssetSheet          {...props} />
      case 'Real Estate':   return <RealEstateAssetSheet    {...props} />
      case 'Stock':         return <StockAssetSheet         {...props} />
      case 'Mutual Fund':   return <MutualFundAssetSheet    {...props} />
      case 'Crypto':        return <CryptoAssetSheet        {...props} />
      case 'Precious Metal': return <PreciousMetalAssetSheet {...props} />
      default:              return null
    }
  }, [group, addSheet, addAsset])

  const bankTopUpLabel = bankTopUpAsset?.label ?? ''
  const bankTopUpRate  = parseBankNotes(bankTopUpAsset?.notes ?? null).rate ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
      <AnimatePresence mode="wait">
        {activeGroup === null ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* SummaryCard only visible on the grid (home) view */}
            <SummaryCard totalValue={totalValue} assetCount={rootAssetCount} loading={loading} />

            {/* Group grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 2px' }}>
              {ASSET_GROUPS.map(g => {
                const items = groupedAssets[g.id] ?? []
                const rootCount = (g.id === 'Bank' || g.id === 'Stock') ? items.filter(a => !isTopUp(a.notes)).length : items.length
                const total = items.filter(a => !isTopUp(a.notes)).reduce((s, a) => {
                  if (a.current_price != null && a.quantity != null) return s + a.current_price * a.quantity
                  return s + a.value
                }, 0)
                return (
                  <GroupCard
                    key={g.id}
                    group={g}
                    total={total}
                    count={rootCount}
                    loading={loading}
                    onPress={() => { setActiveGroup(g.id as AssetGroupId); setReorderMode(false); setReorderedIds([]) }}
                  />
                )
              })}
            </div>
          </motion.div>
        ) : group ? (
          <GroupDetailView
            key={'detail-' + group.id}
            group={group}
            items={currentGroupItems}
            loading={loading}
            reorderMode={reorderMode}
            onToggleReorder={() => {
              if (reorderMode) { handleSaveReorder() } else { setReorderMode(true) }
            }}
            onBack={() => { setActiveGroup(null); setReorderMode(false); setReorderedIds([]) }}
            onAddPress={() => setAddSheet(true)}
            onDelete={(id, label) => setConfirmDelete({ id, label })}
            onTopUp={(asset) => setBankTopUpAsset(asset)}
            onStockTopUp={(asset) => setStockTopUpAsset(asset)}
            onLog={(asset) => setBankLogAsset(asset)}
            onStockLog={(asset) => setStockLogAsset(asset)}
            onEdit={(asset) => setBankEditAsset(asset)}
            working={working}
            reorderedIds={reorderedIds}
            onReorder={handleReorder}
          />
        ) : null}
      </AnimatePresence>

      {/* Add sheet */}
      {AddSheet}

      <BankTopUpSheet
        open={bankTopUpAsset !== null}
        bankLabel={bankTopUpLabel}
        rate={bankTopUpRate}
        onClose={() => setBankTopUpAsset(null)}
        onSave={async (data) => { await addAsset(data); setBankTopUpAsset(null) }}
      />

      <StockTopUpSheet
        open={stockTopUpAsset !== null}
        stockLabel={stockTopUpAsset?.label ?? ''}
        onClose={() => setStockTopUpAsset(null)}
        onSave={async (data) => {
          await addAsset({
            label: data.label,
            category: data.category,
            value: data.value,
            notes: data.notes,
            owner: 'Both',
            current_price: null,
            quantity: null,
            buy_price: null,
          })
          setStockTopUpAsset(null)
        }}
      />

      <BankLogSheet
        open={bankLogAsset !== null}
        asset={bankLogAsset}
        allBankItems={groupedAssets['Bank'] ?? []}
        onClose={() => setBankLogAsset(null)}
      />

      <StockLogSheet
        open={stockLogAsset !== null}
        asset={stockLogAsset}
        allStockItems={groupedAssets['Stock'] ?? []}
        onClose={() => setStockLogAsset(null)}
      />

      <BankEditSheet
        open={bankEditAsset !== null}
        asset={bankEditAsset}
        allBankItems={groupedAssets['Bank'] ?? []}
        onClose={() => setBankEditAsset(null)}
        onSave={handleBankSaveEdit}
      />

      <ConfirmSheet
        open={confirmDelete !== null}
        title="Delete Asset"
        message={`Remove "${confirmDelete?.label ?? ''}" permanently?`}
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id, confirmDelete.label)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
