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
    }}>
      {gain ? '\u25b2' : '\u25bc'} {Math.abs(pct).toFixed(1)}%
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
  const isBank = group.id === 'Bank'

  // For bank: separate root entries from top-ups
  const rootItems   = isBank ? items.filter(a => !isTopUp(a.notes)) : items
  const totalInvested = rootItems.reduce((s, a) => s + a.value, 0)
    + (isBank ? items.filter(a => isTopUp(a.notes)).reduce((s, a) => s + a.value, 0) : 0)

  // Bank net worth = compound appreciated value across all deposits (root + top-ups)
  const bankNetWorth = useMemo(() => {
    if (!isBank) return null
    const deposits: BankDeposit[] = []
    // Group by root label
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

  const liveItems     = items.filter(a => a.current_price != null && a.quantity != null)
  const liveValue     = liveItems.reduce((s, a) => s + (a.current_price! * a.quantity!), 0)
  const hasLive       = liveItems.length > 0
  const investedLive  = liveItems.reduce((s, a) => s + a.value, 0)
  const pnlAbs        = liveValue - investedLive
  const pnlPct        = investedLive > 0 ? (pnlAbs / investedLive) * 100 : 0
  const pnlGain       = pnlAbs >= 0

  const displayNetWorth = isBank ? (bankNetWorth ?? totalInvested) : (hasLive ? liveValue : totalInvested)
  const assetCount = isBank ? rootItems.length : items.length

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

      {/* Two-column: Total Invested | Net Worth */}
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
        {!isBank && hasLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(0,0,0,0.18)', border: `1px solid ${group.border}` }}>
            <span style={{ fontSize: 9, color: group.text, opacity: 0.6, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums' }}>{formatINR(liveValue)}</span>
          </div>
        )}
        {!isBank && hasLive && Math.abs(pnlAbs) >= 0.01 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: pnlGain ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)', border: `1px solid ${pnlGain ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}` }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: pnlGain ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>{pnlGain ? '\u25b2' : '\u25bc'} {formatINR(Math.abs(pnlAbs))}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: pnlGain ? '#34d399' : '#f87171', opacity: 0.8 }}>{Math.abs(pnlPct).toFixed(1)}%</span>
          </div>
        )}
        {isBank && bankNetWorth !== null && bankNetWorth > totalInvested && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.4)' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>▲ {formatINR(bankNetWorth - totalInvested)}</span>
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

// ─── Log Sheet ────────────────────────────────────────────────────────────────
function BankLogSheet({ open, asset, allBankItems, onClose }: {
  open: boolean
  asset: AssetItem | null
  allBankItems: AssetItem[]
  onClose: () => void
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
    .sort((a, b) => {
      const da = a.startDate ?? a.created_at
      const db = b.startDate ?? b.created_at
      return da.localeCompare(db)
    })

  const totalPrincipal = siblings.reduce((s, a) => s + a.value, 0)
  const appreciated = rate
    ? compoundWithTopUps(siblings.filter(s => s.startDate).map(s => ({ amount: s.value, startDate: s.startDate!, rate })))
    : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="log-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />
          <motion.div key="log-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={sheetShell}
          >
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
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 14,
                    background: entry.isTopUp ? 'rgba(96,165,250,0.06)' : 'rgba(52,211,153,0.06)',
                    border: `1px solid ${entry.isTopUp ? 'rgba(96,165,250,0.14)' : 'rgba(52,211,153,0.14)'}`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: entry.isTopUp ? '#60a5fa' : '#34d399', boxShadow: `0 0 8px ${entry.isTopUp ? '#60a5fa' : '#34d399'}` }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: entry.isTopUp ? '#93c5fd' : '#6ee7b7', margin: '0 0 2px' }}>
                        {i === 0 ? '\ud83d\udfe2 Created' : '\ud83d\udd35 Top-up'}
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {entry.startDate ? fmtStartDate(entry.startDate) : fmtStartDate(entry.created_at.substring(0, 10))}
                      </p>
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
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>≈ {formatINR(appreciated)}</span>
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

// ─── Edit Sheet ───────────────────────────────────────────────────────────────
function BankEditSheet({ open, asset, allBankItems, onClose, onSave }: {
  open: boolean
  asset: AssetItem | null
  allBankItems: AssetItem[]
  onClose: () => void
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
    if (!bankName.trim())  { setErr('Enter bank name'); return }
    if (!accountType)      { setErr('Select account type'); return }
    try {
      setSaving(true); setErr('')
      const newLabel = `${bankName.trim()} \u2013 ${accountType}`
      const ids = siblings.map(a => a.id)
      await onSave(ids, newLabel, (oldNotes) => {
        const p = parseBankNotes(oldNotes)
        return buildNotesStr(p.rate, p.startDate, oldNotes?.includes('top-up') ? (oldNotes ?? '') : note)
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const editInputStyle = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)',
    borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="edit-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />
          <motion.div key="edit-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={sheetShell}
          >
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
                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} style={editInputStyle} placeholder="e.g. HDFC Bank" />
              </label>
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Account Type</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ACCOUNT_TYPES.map(t => (
                    <motion.button key={t} whileTap={{ scale: 0.92 }} onClick={() => setAccountType(t)}
                      style={{
                        padding: '9px 18px', borderRadius: 100, fontSize: 13,
                        fontWeight:  accountType === t ? 700 : 400,
                        background:  accountType === t ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.04)',
                        border:      accountType === t ? '1px solid rgba(96,165,250,0.55)' : '1px solid rgba(255,255,255,0.09)',
                        color:       accountType === t ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer',
                      }}
                    >{t}</motion.button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'block', marginBottom: 20 }}>
                <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Note <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} style={editInputStyle} placeholder="Branch, account ending, any detail" />
              </label>
              {err && <p style={{ fontSize: 13, color: '#fca5a5', padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)', marginBottom: 8 }}>{err}</p>}
            </div>
            <div style={sheetFooter}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                style={{
                  width: '100%', padding: '16px',
                  background: saving ? 'rgba(96,165,250,0.2)' : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                  border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : '0 4px 20px rgba(96,165,250,0.35)',
                }}
              >{saving ? 'Saving\u2026' : 'Save Changes'}</motion.button>
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
  asset: AssetItem
  allBankItems: AssetItem[]
  reorderMode: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onDelete: (id: string, label: string) => void
  onTopUp: (asset: AssetItem) => void
  onLog: (asset: AssetItem) => void
  onEdit: (asset: AssetItem) => void
  working: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  const { rate, startDate, userNote } = parseBankNotes(asset.notes)
  const { bankName, accountType } = splitBankLabel(asset.label)

  const siblingDeposits = useMemo((): BankDeposit[] => {
    if (!rate) return []
    return allBankItems
      .filter(a => a.label === asset.label)
      .map(a => {
        const p = parseBankNotes(a.notes)
        return p.startDate ? { amount: a.value, startDate: p.startDate, rate: rate } : null
      })
      .filter((d): d is BankDeposit => d !== null)
  }, [allBankItems, asset.label, rate])

  const appreciated = useMemo(() =>
    siblingDeposits.length > 0 ? compoundWithTopUps(siblingDeposits) : null
  , [siblingDeposits])

  if (isTopUp(asset.notes)) return null

  const totalPrincipal = allBankItems
    .filter(a => a.label === asset.label)
    .reduce((s, a) => s + a.value, 0)

  const sep = <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>

  const iconBtn = (color: string, bg: string, border: string) => ({
    width: 34, height: 34, borderRadius: 10,
    background: bg, border: `1px solid ${border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, color,
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ borderRadius: 18, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.16)', overflow: 'hidden', cursor: reorderMode ? 'grab' : 'pointer' }}
      onClick={() => { if (!reorderMode) setExpanded(e => !e) }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px 10px' }}>
        {reorderMode ? (
          <div {...dragHandleProps} style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)', flexShrink: 0, cursor: 'grab', padding: '2px 4px', touchAction: 'none' }}>☰</div>
        ) : (
          <span style={{ fontSize: 22, flexShrink: 0 }}>🏦</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'baseline' }}>
            <span style={{ color: '#f5f7ff' }}>{bankName}</span>
            {accountType ? <>{sep}<span style={{ fontWeight: 500, fontSize: 13, color: 'rgba(147,197,253,0.75)' }}>{accountType}</span></> : null}
            {userNote    ? <>{sep}<span style={{ fontWeight: 400, fontSize: 12, fontStyle: 'italic', color: 'rgba(148,163,184,0.55)' }}>{userNote}</span></> : null}
          </p>
          {rate ? (
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#93c5fd', background: 'rgba(96,165,250,0.15)', padding: '2px 9px', borderRadius: 99, border: '1px solid rgba(96,165,250,0.35)', fontVariantNumeric: 'tabular-nums' }}>{rate.toFixed(2)}% p.a.</span>
          ) : null}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalPrincipal)}</span>
            {appreciated !== null && (
              <>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>→</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>≈ {formatINR(appreciated)}</span>
              </>
            )}
          </div>
          {startDate && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: '3px 0 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtStartDate(startDate)}</p>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && !reorderMode && (
          <motion.div key="actions" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: 'hidden' }}>
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
                {working === asset.id
                  ? <span style={{ fontSize: 11, color: '#f87171' }}>…</span>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                }
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Generic asset card ───────────────────────────────────────────────────────
function GenericAssetCard({ asset, group, onDelete, working }: {
  asset: AssetItem
  group: typeof ASSET_GROUPS[number]
  onDelete: (id: string, label: string) => void
  working: string | null
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, background: group.color, border: `1px solid ${group.border.replace('0.35', '0.18')}` }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{group.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.label}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: 0 }}>{formatShortDate(asset.created_at)}{asset.notes ? ` \u00b7 ${asset.notes}` : ''}</p>
          <PnlBadge asset={asset} />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: group.text, fontVariantNumeric: 'tabular-nums', margin: '0 0 2px' }}>{formatINR(asset.value)}</p>
        {asset.current_price && asset.last_synced && (
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '0 0 3px', fontVariantNumeric: 'tabular-nums' }}>Live: {formatINR(asset.current_price * (asset.quantity ?? 1))}</p>
        )}
        <button onClick={() => onDelete(asset.id, asset.label)} disabled={working === asset.id}
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
        >{working === asset.id ? '\u2026' : 'delete'}</button>
      </div>
    </motion.div>
  )
}

// ─── Per-group detail view ────────────────────────────────────────────────────
function GroupDetailView({
  group, items, loading, reorderMode, onToggleReorder,
  onBack, onAddPress, onDelete, onTopUp, onLog, onEdit, working,
  reorderedIds, onReorder,
}: {
  group: typeof ASSET_GROUPS[number]
  items: AssetItem[]
  loading: boolean
  reorderMode: boolean
  onToggleReorder: () => void
  onBack: () => void
  onAddPress: () => void
  onDelete: (id: string, label: string) => void
  onTopUp: (asset: AssetItem) => void
  onLog: (asset: AssetItem) => void
  onEdit: (asset: AssetItem) => void
  working: string | null
  reorderedIds: string[]
  onReorder: (fromIdx: number, toIdx: number) => void
}) {
  const isBank = group.id === 'Bank'
  const rootItems = isBank ? items.filter(a => !isTopUp(a.notes)) : items

  const displayItems = isBank && reorderedIds.length > 0
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
    <motion.div key={'detail-' + group.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Top nav */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 8 }}>
        <motion.button whileTap={{ scale: 0.88 }} onClick={onBack}
          style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{group.emoji}</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#f5f7ff', margin: 0, letterSpacing: '-0.01em' }}>{group.label}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isBank && (
            <motion.button whileTap={{ scale: 0.88 }} onClick={onToggleReorder}
              style={{ width: 36, height: 36, borderRadius: 12, background: reorderMode ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.07)', border: reorderMode ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Reorder"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={reorderMode ? '#fcd34d' : 'rgba(255,255,255,0.75)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                <polyline points="17 2 21 6 17 10" /><polyline points="17 14 21 18 17 22" />
              </svg>
            </motion.button>
          )}
          {!reorderMode && (
            <motion.button whileTap={{ scale: 0.88 }} onClick={onAddPress}
              style={{ width: 36, height: 36, borderRadius: 12, background: group.color, border: `1px solid ${group.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 2px 12px ${group.color}` }}
              aria-label={`Add ${group.label}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={group.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </motion.button>
          )}
          {reorderMode && (
            <motion.button whileTap={{ scale: 0.88 }} onClick={onToggleReorder}
              style={{ height: 36, padding: '0 14px', borderRadius: 12, background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.4)', color: '#fcd34d', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >Done</motion.button>
          )}
        </div>
      </div>

      {reorderMode && (
        <div style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: 'rgba(251,191,36,0.8)', textAlign: 'center' }}>
          Drag ☰ to reorder · Tap Done when finished
        </div>
      )}

      <GroupSummaryCard group={group} items={items} />

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 66, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      )}

      {!loading && displayItems.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '52px 20px', borderRadius: 22, background: group.color.replace('0.18', '0.06'), border: `1px dashed ${group.border.replace('0.35', '0.25')}` }}
        >
          <p style={{ fontSize: 38, marginBottom: 14 }}>{group.emoji}</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No {group.label} assets yet</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Tap + above to add your first {group.label} asset</p>
        </motion.div>
      )}

      {!loading && displayItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence initial={false}>
            {isBank
              ? displayItems.map((asset, idx) => (
                  <div key={asset.id}
                    draggable={reorderMode}
                    onDragStart={() => { dragIdx.current = idx }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragIdx.current !== null && dragIdx.current !== idx) { onReorder(dragIdx.current, idx); dragIdx.current = null } }}
                    style={{ touchAction: reorderMode ? 'none' : undefined }}
                  >
                    <BankAssetCard asset={asset} allBankItems={items} reorderMode={reorderMode} onDelete={onDelete} onTopUp={onTopUp} onLog={onLog} onEdit={onEdit} working={working} />
                  </div>
                ))
              : displayItems.map(asset => (
                  <GenericAssetCard key={asset.id} asset={asset} group={group} onDelete={onDelete} working={working} />
                ))
            }
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
const BANK_ORDER_KEY = 'bank_asset_order'

export function AssetScreen() {
  const { assets, loading, error, add, remove, update, totalValue } = useAssets()

  const [selectedGroup, setSelectedGroup] = useState<AssetGroupId | null>(null)
  const [sheetGroup,    setSheetGroup]    = useState<AssetGroupId | undefined>(undefined)
  const [working,       setWorking]       = useState<string | null>(null)
  const [reorderMode,   setReorderMode]   = useState(false)

  const [topUpAsset, setTopUpAsset] = useState<AssetItem | null>(null)
  const [logAsset,   setLogAsset]   = useState<AssetItem | null>(null)
  const [editAsset,  setEditAsset]  = useState<AssetItem | null>(null)

  const [confirmId,    setConfirmId]    = useState<string | null>(null)
  const [confirmLabel, setConfirmLabel] = useState('')

  const [bankOrder, setBankOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(BANK_ORDER_KEY) ?? '[]') } catch { return [] }
  })

  const saveOrder = useCallback((ids: string[]) => {
    setBankOrder(ids)
    localStorage.setItem(BANK_ORDER_KEY, JSON.stringify(ids))
  }, [])

  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    setBankOrder(prev => {
      const bankItems = assets.filter(a => a.category === 'Bank' && !isTopUp(a.notes))
      const orderedIds = prev.length > 0
        ? [...bankItems].sort((a, b) => { const ai = prev.indexOf(a.id); const bi = prev.indexOf(b.id); return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) }).map(a => a.id)
        : bankItems.map(a => a.id)
      const next = [...orderedIds]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      localStorage.setItem(BANK_ORDER_KEY, JSON.stringify(next))
      return next
    })
  }, [assets])

  const topUpRate = useMemo(() => {
    if (!topUpAsset) return 0
    const { rate } = parseBankNotes(topUpAsset.notes)
    return rate ?? 0
  }, [topUpAsset])

  const requestDelete = useCallback((id: string, label: string) => {
    setConfirmLabel(label); setConfirmId(id)
  }, [])

  const handleDelete = async (id: string) => {
    setWorking(id)
    try   { await remove(id) }
    catch (e) { console.error(e) }
    finally   { setWorking(null) }
  }

  const handleEditSave = async (ids: string[], newLabel: string, notesUpdater: (oldNotes: string | null) => string) => {
    await Promise.all(
      ids.map(id => {
        const asset = assets.find(a => a.id === id)
        if (!asset) return Promise.resolve()
        return update(id, { label: newLabel, notes: notesUpdater(asset.notes) })
      })
    )
  }

  // Exclude top-ups from group stats counts and totals (top-up value already included via root card)
  const groupStats = useMemo(() =>
    Object.fromEntries(
      ASSET_GROUPS.map(g => {
        const allItems = assets.filter(a => a.category === g.id)
        const countItems = g.id === 'Bank' ? allItems.filter(a => !isTopUp(a.notes)) : allItems
        return [g.id, {
          total: allItems.reduce((s, a) => s + a.value, 0),
          count: countItems.length,
        }]
      })
    )
  , [assets])

  const groupItems = useMemo(() =>
    selectedGroup ? assets.filter(a => a.category === selectedGroup) : []
  , [assets, selectedGroup])

  const activeGroupMeta = ASSET_GROUPS.find(g => g.id === selectedGroup)

  // Exclude top-ups from global asset count
  const displayAssetCount = useMemo(() =>
    assets.filter(a => !(a.category === 'Bank' && isTopUp(a.notes))).length
  , [assets])

  void saveOrder

  return (
    <div style={{ padding: '20px 20px 0', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 'calc(var(--nav-h, 100px) + 24px)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {error && (
          <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>{error}</div>
        )}

        <AnimatePresence mode="wait">
          {selectedGroup === null ? (
            <motion.div key="grid" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              <SummaryCard totalValue={totalValue} assetCount={displayAssetCount} loading={loading} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {ASSET_GROUPS.map((g, i) => (
                  <motion.div key={g.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                    <GroupCard group={g} total={groupStats[g.id]?.total ?? 0} count={groupStats[g.id]?.count ?? 0} loading={loading} onPress={() => setSelectedGroup(g.id)} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            activeGroupMeta && (
              <GroupDetailView
                key={'detail-' + selectedGroup}
                group={activeGroupMeta}
                items={groupItems}
                loading={loading}
                reorderMode={reorderMode}
                onToggleReorder={() => setReorderMode(r => !r)}
                onBack={() => { setSelectedGroup(null); setReorderMode(false) }}
                onAddPress={() => setSheetGroup(selectedGroup)}
                onDelete={requestDelete}
                onTopUp={(asset) => setTopUpAsset(asset)}
                onLog={(asset) => setLogAsset(asset)}
                onEdit={(asset) => setEditAsset(asset)}
                working={working}
                reorderedIds={bankOrder}
                onReorder={handleReorder}
              />
            )
          )}
        </AnimatePresence>
      </motion.div>

      <BankAssetSheet open={sheetGroup === 'Bank'} onClose={() => setSheetGroup(undefined)} onSave={async (a) => { await add(a); setSheetGroup(undefined) }} />
      <RealEstateAssetSheet open={sheetGroup === 'Real Estate'} onClose={() => setSheetGroup(undefined)} onSave={async (a) => { await add(a); setSheetGroup(undefined) }} />
      <StockAssetSheet open={sheetGroup === 'Stock'} onClose={() => setSheetGroup(undefined)} onSave={async (a) => { await add(a); setSheetGroup(undefined) }} />
      <MutualFundAssetSheet open={sheetGroup === 'Mutual Fund'} onClose={() => setSheetGroup(undefined)} onSave={async (a) => { await add(a); setSheetGroup(undefined) }} />
      <CryptoAssetSheet open={sheetGroup === 'Crypto'} onClose={() => setSheetGroup(undefined)} onSave={async (a) => { await add(a); setSheetGroup(undefined) }} />
      <PreciousMetalAssetSheet open={sheetGroup === 'Precious Metal'} onClose={() => setSheetGroup(undefined)} onSave={async (a) => { await add(a); setSheetGroup(undefined) }} />

      <BankTopUpSheet open={topUpAsset !== null} onClose={() => setTopUpAsset(null)} bankLabel={topUpAsset?.label ?? ''} rate={topUpRate} onSave={async (a) => { await add(a); setTopUpAsset(null) }} />

      <BankLogSheet open={logAsset !== null} asset={logAsset} allBankItems={groupItems} onClose={() => setLogAsset(null)} />

      <BankEditSheet open={editAsset !== null} asset={editAsset} allBankItems={groupItems} onClose={() => setEditAsset(null)} onSave={handleEditSave} />

      <ConfirmSheet
        open={confirmId !== null}
        title="Delete Asset?"
        message={confirmLabel ? `"${confirmLabel}" will be permanently removed.` : 'This asset will be permanently removed.'}
        confirmLabel="Delete"
        onConfirm={() => { const id = confirmId!; setConfirmId(null); setConfirmLabel(''); handleDelete(id) }}
        onCancel={() => { setConfirmId(null); setConfirmLabel('') }}
      />
    </div>
  )
}

export default AssetScreen
