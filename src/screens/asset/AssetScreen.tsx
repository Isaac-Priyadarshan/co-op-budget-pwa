import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssets } from '../../hooks/useAssets'
import { AssetGroupPicker, ASSET_GROUPS, type AssetGroupId } from '../../components/shared/AssetGroupPicker'
import { BankAssetSheet }         from '../../components/assets/BankAssetSheet'
import { RealEstateAssetSheet }   from '../../components/assets/RealEstateAssetSheet'
import { StockAssetSheet }        from '../../components/assets/StockAssetSheet'
import { MutualFundAssetSheet }   from '../../components/assets/MutualFundAssetSheet'
import { CryptoAssetSheet }       from '../../components/assets/CryptoAssetSheet'
import { PreciousMetalAssetSheet } from '../../components/assets/PreciousMetalAssetSheet'
import { formatINR, formatShortDate } from '../../utils/format'

const FULL_SHEET_GROUPS: AssetGroupId[] = ['Bank', 'Real Estate', 'Stock', 'Mutual Fund', 'Crypto', 'Precious Metal']

function PnlBadge({ asset }: { asset: { value: number; current_price: number | null; quantity: number | null; buy_price: number | null } }) {
  if (!asset.current_price || !asset.quantity || !asset.buy_price) return null
  const currentVal = asset.current_price * asset.quantity
  const investedVal = asset.buy_price * asset.quantity
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

export function AssetScreen() {
  const { assets, loading, error, add, remove, totalValue } = useAssets()

  const [pickerOpen,  setPickerOpen]  = useState(false)
  const [activeGroup, setActiveGroup] = useState<AssetGroupId | undefined>(undefined)
  const [working,     setWorking]     = useState<string | null>(null)

  const bankSheetOpen    = activeGroup === 'Bank'
  const realEstateOpen   = activeGroup === 'Real Estate'
  const stockOpen        = activeGroup === 'Stock'
  const mutualFundOpen   = activeGroup === 'Mutual Fund'
  const cryptoOpen       = activeGroup === 'Crypto'
  const preciousMetalOpen = activeGroup === 'Precious Metal'

  const handleGroupSelect = (group: AssetGroupId) => setActiveGroup(group)
  const closeAll = () => setActiveGroup(undefined)

  const handleDelete = async (id: string) => {
    setWorking(id)
    try   { await remove(id) }
    catch (e) { console.error(e) }
    finally   { setWorking(null) }
  }

  const groupedAssets = useMemo(() =>
    ASSET_GROUPS
      .map(g => ({ group: g, items: assets.filter(a => a.category === g.id) }))
      .filter(g => g.items.length > 0)
  , [assets])

  const ungrouped = useMemo(() => {
    const known = new Set(ASSET_GROUPS.map(g => g.id))
    return assets.filter(a => !known.has(a.category as AssetGroupId))
  }, [assets])

  return (
    // paddingBottom uses the same CSS var the sheets use, so the last card
    // never sits behind the nav bar when scrolled all the way down.
    <div style={{ padding: '20px 20px 0', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 'calc(var(--nav-h, 100px) + 24px)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        {/* ── Summary Card ── */}
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
              <motion.p key={assets.length} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}
                style={{ fontSize: 24, fontWeight: 900, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 20px rgba(110,231,183,0.4)' }}
              >{loading ? '\u2014' : assets.length}</motion.p>
            </div>
          </div>
        </div>

        {/* ── Add Button ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setPickerOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px 11px 12px', borderRadius: 100, background: 'linear-gradient(135deg,#34d399,#059669)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(52,211,153,0.40)', color: '#0a0a0a', fontSize: 14, fontWeight: 700 }}
            aria-label="Add asset"
          >
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
            Add Asset
          </motion.button>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />)}
          </div>
        )}

        {error && (
          <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>{error}</div>
        )}

        {!loading && !error && assets.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', padding: '52px 20px', borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p style={{ fontSize: 40, marginBottom: 14 }}>💎</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No assets yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Tap Add Asset above to get started</p>
          </motion.div>
        )}

        {!loading && !error && groupedAssets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <AnimatePresence initial={false}>
              {groupedAssets.map(({ group, items }) => (
                <motion.div key={group.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{group.emoji}</span>
                      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: group.text, margin: 0 }}>{group.label}</p>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: group.text, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                      {formatINR(items.reduce((s, a) => s + a.value, 0))}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(asset => (
                      <motion.div key={asset.id} layout
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30, scale: 0.95 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, background: group.color, border: `1px solid ${group.border.replace('0.35', '0.18')}` }}
                      >
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{group.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.label}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: 0 }}>
                              {formatShortDate(asset.created_at)}{asset.notes ? ` \u00b7 ${asset.notes}` : ''}
                            </p>
                            <PnlBadge asset={asset} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 800, color: group.text, fontVariantNumeric: 'tabular-nums', margin: '0 0 2px' }}>{formatINR(asset.value)}</p>
                          {asset.current_price && asset.last_synced && (
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: '0 0 3px', fontVariantNumeric: 'tabular-nums' }}>
                              Live: {formatINR(asset.current_price * (asset.quantity ?? 1))}
                            </p>
                          )}
                          <button onClick={() => handleDelete(asset.id)} disabled={working === asset.id}
                            style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                          >{working === asset.id ? '\u2026' : 'delete'}</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {ungrouped.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>📦 Other</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ungrouped.map(asset => (
                    <div key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ fontSize: 22 }}>📦</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', margin: '0 0 3px' }}>{asset.label}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: 0 }}>{asset.category} \u00b7 {formatShortDate(asset.created_at)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums', margin: '0 0 4px' }}>{formatINR(asset.value)}</p>
                        <button onClick={() => handleDelete(asset.id)} disabled={working === asset.id}
                          style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >{working === asset.id ? '\u2026' : 'delete'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Sheets ── */}
      <AssetGroupPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        onSelect={(group) => { setPickerOpen(false); handleGroupSelect(group) }}
      />
      <BankAssetSheet          open={bankSheetOpen}     onClose={closeAll} onSave={add} />
      <RealEstateAssetSheet    open={realEstateOpen}    onClose={closeAll} onSave={add} />
      <StockAssetSheet         open={stockOpen}         onClose={closeAll} onSave={add} />
      <MutualFundAssetSheet    open={mutualFundOpen}    onClose={closeAll} onSave={add} />
      <CryptoAssetSheet        open={cryptoOpen}        onClose={closeAll} onSave={add} />
      <PreciousMetalAssetSheet open={preciousMetalOpen} onClose={closeAll} onSave={add} />
    </div>
  )
}

export default AssetScreen
