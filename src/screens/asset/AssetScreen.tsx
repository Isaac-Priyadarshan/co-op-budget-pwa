import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssets } from '../../hooks/useAssets'
import { AssetSheet } from '../../components/shared/AssetSheet'
import { formatINR, formatShortDate } from '../../utils/format'

const CATEGORY_EMOJI: Record<string, string> = {
  'Gold & Jewellery': '🥇', 'Property': '🏠', 'Vehicle': '🚗',
  'Investments': '📈', 'Savings': '🏦', 'Electronics': '💻',
  'Business': '🏢', 'Other': '📦',
}

export function AssetScreen() {
  const { assets, loading, error, add, remove, totalValue } = useAssets()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [working, setWorking] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setWorking(id); try { await remove(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }

  const byCategory = assets.reduce<Record<string, typeof assets>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.7)', marginBottom: 4 }}>What you own</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Assets</h1>
          </div>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setSheetOpen(true)}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#34d399,#059669)', border: 'none', borderRadius: 14, color: '#0a0a0a', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(52,211,153,0.4)' }}
          >+ Add</motion.button>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ borderRadius: 24, padding: '22px', background: 'linear-gradient(135deg,rgba(52,211,153,0.2),rgba(16,185,129,0.12))', border: '1px solid rgba(52,211,153,0.3)', marginBottom: 24, position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', filter: 'blur(28px)' }} />
          <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.7)', marginBottom: 8, position: 'relative' }}>Total Asset Value</p>
          {loading ? <div style={{ height: 40, width: 160, borderRadius: 8, background: 'rgba(255,255,255,0.1)' }} /> : (
            <p style={{ fontSize: 36, fontWeight: 700, color: '#6ee7b7', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', position: 'relative' }}>{formatINR(totalValue)}</p>
          )}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, position: 'relative' }}>{assets.length} asset{assets.length !== 1 ? 's' : ''} recorded</p>
        </motion.div>

        {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 18, background: 'rgba(255,255,255,0.05)' }} />)}</div>}
        {error && <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>{error}</div>}

        {!loading && assets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>💎</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No assets yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Add gold, property, vehicles, investments and more</p>
          </div>
        )}

        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {CATEGORY_EMOJI[cat] ?? '📦'} {cat}
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>
                {formatINR(items.reduce((s, a) => s + a.value, 0))}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatePresence initial={false}>
                {items.map(asset => (
                  <motion.div key={asset.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)' }}
                  >
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{CATEGORY_EMOJI[asset.category] ?? '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#f5f7ff', marginBottom: 3 }}>{asset.label}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{asset.owner} · {formatShortDate(asset.created_at)}{asset.notes ? ` · ${asset.notes}` : ''}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{formatINR(asset.value)}</p>
                      <button onClick={() => handleDelete(asset.id)} disabled={working === asset.id}
                        style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                      >{working === asset.id ? '…' : 'delete'}</button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </motion.div>
      <AssetSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={add} />
    </div>
  )
}
