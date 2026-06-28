import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssets } from '../../hooks/useAssets'
import { ASSET_GROUPS, type AssetGroupId } from '../../components/shared/AssetGroupPicker'
import { BankAssetSheet }          from '../../components/assets/BankAssetSheet'
import { RealEstateAssetSheet }    from '../../components/assets/RealEstateAssetSheet'
import { StockAssetSheet }         from '../../components/assets/StockAssetSheet'
import { MutualFundAssetSheet }    from '../../components/assets/MutualFundAssetSheet'
import { CryptoAssetSheet }        from '../../components/assets/CryptoAssetSheet'
import { PreciousMetalAssetSheet } from '../../components/assets/PreciousMetalAssetSheet'
import { formatINR, formatShortDate } from '../../utils/format'

// ─── P&L badge (inline on asset cards) ───────────────────────────────────────
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
      {gain ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ─── Global summary card (top of screen) ──────────────────────────────────
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
          >{loading ? '—' : formatINR(totalValue)}</motion.p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.6)', margin: 0 }}>Net Worth</p>
          <motion.p key={totalValue + '-nw'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}
            style={{ fontSize: 24, fontWeight: 900, color: '#34d399', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 24px rgba(52,211,153,0.55)', letterSpacing: '-0.02em' }}
          >{loading ? '—' : formatINR(totalValue)}</motion.p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.6)', margin: 0, textAlign: 'right' }}>Assets</p>
          <motion.p key={assetCount} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}
            style={{ fontSize: 24, fontWeight: 900, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 20px rgba(110,231,183,0.4)' }}
          >{loading ? '—' : assetCount}</motion.p>
        </div>
      </div>
    </div>
  )
}

// ─── Per-group summary card (top of detail view) ───────────────────────────
type AssetItem = {
  id: string; label: string; category: string; value: number; notes: string | null
  created_at: string; current_price: number | null; quantity: number | null
  buy_price: number | null; last_synced: string | null
}

function GroupSummaryCard({
  group, items, onBack,
}: {
  group: typeof ASSET_GROUPS[number]
  items: AssetItem[]
  onBack: () => void
}) {
  const totalInvested = items.reduce((s, a) => s + a.value, 0)

  // Live value: only items that have current_price + quantity
  const liveItems   = items.filter(a => a.current_price != null && a.quantity != null)
  const liveValue   = liveItems.reduce((s, a) => s + (a.current_price! * a.quantity!), 0)
  const hasLive     = liveItems.length > 0

  const pnlAbs = liveValue - liveItems.reduce((s, a) => s + a.value, 0)
  const pnlPct = liveItems.length > 0
    ? (liveItems.reduce((s, a) => s + a.value, 0) > 0
      ? (pnlAbs / liveItems.reduce((s, a) => s + a.value, 0)) * 100
      : 0)
    : 0
  const pnlGain = pnlAbs >= 0

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
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Glow blob top-right */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: group.border, filter: 'blur(40px)',
        pointerEvents: 'none', opacity: 0.6,
      }} />

      {/* Top row: back btn + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative', zIndex: 1 }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'rgba(0,0,0,0.18)', border: `1px solid ${group.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={group.text} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 18 }}>{group.emoji}</span>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: group.text, margin: 0, opacity: 0.85 }}>
            {group.label}
          </p>
        </div>
      </div>

      {/* Big invested value */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: group.text, opacity: 0.6, margin: '0 0 4px' }}>
          Total Invested
        </p>
        <motion.p
          key={totalInvested}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: 32, fontWeight: 900, color: '#f5f7ff',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em',
            margin: 0, textShadow: `0 0 28px ${group.border}`,
          }}
        >
          {formatINR(totalInvested)}
        </motion.p>
      </div>

      {/* Pills row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>

        {/* Asset count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 99,
          background: 'rgba(0,0,0,0.18)', border: `1px solid ${group.border}`,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={group.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 800, color: group.text, fontVariantNumeric: 'tabular-nums' }}>
            {items.length}
          </span>
          <span style={{ fontSize: 10, color: group.text, opacity: 0.65, fontWeight: 600 }}>
            {items.length === 1 ? 'asset' : 'assets'}
          </span>
        </div>

        {/* Live value pill — only when available */}
        {hasLive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 99,
            background: 'rgba(0,0,0,0.18)', border: `1px solid ${group.border}`,
          }}>
            <span style={{ fontSize: 9, color: group.text, opacity: 0.6, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(liveValue)}
            </span>
          </div>
        )}

        {/* P&L pill — only when live data exists and diff is non-zero */}
        {hasLive && Math.abs(pnlAbs) >= 0.01 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 99,
            background: pnlGain ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)',
            border: `1px solid ${pnlGain ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'}`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: pnlGain ? '#34d399' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
              {pnlGain ? '▲' : '▼'} {formatINR(Math.abs(pnlAbs))}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: pnlGain ? '#34d399' : '#f87171', opacity: 0.8 }}>
              {Math.abs(pnlPct).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── 6 Pastel Group Cards (2-col grid) ───────────────────────────────────────
function GroupCard({
  group, total, count, loading, onPress,
}: {
  group: typeof ASSET_GROUPS[number]
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
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 10, padding: '18px 16px',
        background: group.color,
        border: `1px solid ${group.border}`,
        borderRadius: 22,
        cursor: 'pointer',
        width: '100%',
        boxShadow: `0 4px 20px ${group.color}`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 70, height: 70, borderRadius: '50%',
        background: group.border, filter: 'blur(22px)',
        pointerEvents: 'none',
      }} />

      <span style={{ fontSize: 30, lineHeight: 1 }}>{group.emoji}</span>

      <div style={{ width: '100%' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: group.text, margin: '0 0 5px', letterSpacing: '-0.01em' }}>
          {group.label}
        </p>
        {loading ? (
          <div style={{ height: 14, width: 60, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
        ) : (
          <p style={{ fontSize: 15, fontWeight: 900, color: '#f5f7ff', margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {count === 0
              ? <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>No entries yet</span>
              : formatINR(total)
            }
          </p>
        )}
      </div>

      {count > 0 && (
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
          color: group.text, opacity: 0.7,
          background: group.border.replace('0.35', '0.18'),
          padding: '2px 8px', borderRadius: 99,
          border: `1px solid ${group.border}`,
        }}>
          {count} {count === 1 ? 'asset' : 'assets'}
        </div>
      )}
    </motion.button>
  )
}

// ─── Per-group detail view ────────────────────────────────────────────────────
function GroupDetailView({
  group, items, loading, onBack, onAddPress, onDelete, working,
}: {
  group: typeof ASSET_GROUPS[number]
  items: AssetItem[]
  loading: boolean
  onBack: () => void
  onAddPress: () => void
  onDelete: (id: string) => void
  working: string | null
}) {
  return (
    <motion.div
      key={'detail-' + group.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* ── Per-group summary card (replaces old minimal header) ── */}
      <GroupSummaryCard group={group} items={items} onBack={onBack} />

      {/* ── Full-width Add button ── */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onAddPress}
        style={{
          width: '100%', padding: '14px 20px',
          background: group.color,
          border: `1px solid ${group.border}`,
          borderRadius: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 4px 18px ${group.color}`,
        }}
      >
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: group.border.replace('0.35', '0.3'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={group.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: group.text }}>Add {group.label}</span>
      </motion.button>

      {/* ── Loading skeletons ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center', padding: '52px 20px',
            borderRadius: 22,
            background: group.color.replace('0.18', '0.06'),
            border: `1px dashed ${group.border.replace('0.35', '0.25')}`,
          }}
        >
          <p style={{ fontSize: 38, marginBottom: 14 }}>{group.emoji}</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            No {group.label} assets yet
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>
            Tap Add {group.label} above to record one
          </p>
        </motion.div>
      )}

      {/* ── Asset list ── */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence initial={false}>
            {items.map(asset => (
              <motion.div
                key={asset.id} layout
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 18,
                  background: group.color,
                  border: `1px solid ${group.border.replace('0.35', '0.18')}`,
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{group.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {asset.label}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: 0 }}>
                      {formatShortDate(asset.created_at)}{asset.notes ? ` · ${asset.notes}` : ''}
                    </p>
                    <PnlBadge asset={asset} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: group.text, fontVariantNumeric: 'tabular-nums', margin: '0 0 2px' }}>
                    {formatINR(asset.value)}
                  </p>
                  {asset.current_price && asset.last_synced && (
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '0 0 3px', fontVariantNumeric: 'tabular-nums' }}>
                      Live: {formatINR(asset.current_price * (asset.quantity ?? 1))}
                    </p>
                  )}
                  <button
                    onClick={() => onDelete(asset.id)}
                    disabled={working === asset.id}
                    style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                  >
                    {working === asset.id ? '…' : 'delete'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function AssetScreen() {
  const { assets, loading, error, add, remove, totalValue } = useAssets()

  const [selectedGroup, setSelectedGroup] = useState<AssetGroupId | null>(null)
  const [sheetGroup,    setSheetGroup]    = useState<AssetGroupId | undefined>(undefined)
  const [working,       setWorking]       = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setWorking(id)
    try   { await remove(id) }
    catch (e) { console.error(e) }
    finally   { setWorking(null) }
  }

  const groupStats = useMemo(() =>
    Object.fromEntries(
      ASSET_GROUPS.map(g => {
        const items = assets.filter(a => a.category === g.id)
        return [g.id, { total: items.reduce((s, a) => s + a.value, 0), count: items.length }]
      })
    )
  , [assets])

  const groupItems = useMemo(() =>
    selectedGroup ? assets.filter(a => a.category === selectedGroup) : []
  , [assets, selectedGroup])

  const activeGroupMeta = ASSET_GROUPS.find(g => g.id === selectedGroup)

  return (
    <div style={{
      padding: '20px 20px 0', minHeight: '100%',
      display: 'flex', flexDirection: 'column', gap: 18,
      paddingBottom: 'calc(var(--nav-h, 100px) + 24px)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {/* ── Global summary card (always visible) ── */}
        <SummaryCard totalValue={totalValue} assetCount={assets.length} loading={loading} />

        {error && (
          <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* ── View toggle: grid ↔ detail ── */}
        <AnimatePresence mode="wait">
          {selectedGroup === null ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {ASSET_GROUPS.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <GroupCard
                      group={g}
                      total={groupStats[g.id]?.total ?? 0}
                      count={groupStats[g.id]?.count ?? 0}
                      loading={loading}
                      onPress={() => setSelectedGroup(g.id)}
                    />
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
                onBack={() => setSelectedGroup(null)}
                onAddPress={() => setSheetGroup(selectedGroup)}
                onDelete={handleDelete}
                working={working}
              />
            )
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Asset sheets ── */}
      <BankAssetSheet
        open={sheetGroup === 'Bank'}
        onClose={() => setSheetGroup(undefined)}
        onSave={async (a) => { await add(a); setSheetGroup(undefined) }}
      />
      <RealEstateAssetSheet
        open={sheetGroup === 'Real Estate'}
        onClose={() => setSheetGroup(undefined)}
        onSave={async (a) => { await add(a); setSheetGroup(undefined) }}
      />
      <StockAssetSheet
        open={sheetGroup === 'Stock'}
        onClose={() => setSheetGroup(undefined)}
        onSave={async (a) => { await add(a); setSheetGroup(undefined) }}
      />
      <MutualFundAssetSheet
        open={sheetGroup === 'Mutual Fund'}
        onClose={() => setSheetGroup(undefined)}
        onSave={async (a) => { await add(a); setSheetGroup(undefined) }}
      />
      <CryptoAssetSheet
        open={sheetGroup === 'Crypto'}
        onClose={() => setSheetGroup(undefined)}
        onSave={async (a) => { await add(a); setSheetGroup(undefined) }}
      />
      <PreciousMetalAssetSheet
        open={sheetGroup === 'Precious Metal'}
        onClose={() => setSheetGroup(undefined)}
        onSave={async (a) => { await add(a); setSheetGroup(undefined) }}
      />
    </div>
  )
}

export default AssetScreen
