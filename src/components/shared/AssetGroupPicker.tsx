import { motion, AnimatePresence } from 'framer-motion'

export const ASSET_GROUPS = [
  { id: 'Bank',           label: 'Bank',           emoji: '🏦', color: 'rgba(96,165,250,0.18)',  border: 'rgba(96,165,250,0.35)',  text: '#93c5fd' },
  { id: 'Stock',          label: 'Stock',          emoji: '📈', color: 'rgba(52,211,153,0.18)',  border: 'rgba(52,211,153,0.35)',  text: '#6ee7b7' },
  { id: 'Mutual Fund',    label: 'Mutual Fund',    emoji: '💰', color: 'rgba(251,191,36,0.18)',  border: 'rgba(251,191,36,0.35)',  text: '#fcd34d' },
  { id: 'Crypto',         label: 'Crypto',         emoji: '🪙', color: 'rgba(167,139,250,0.18)', border: 'rgba(167,139,250,0.35)', text: '#c4b5fd' },
  { id: 'Real Estate',    label: 'Real Estate',    emoji: '🏠', color: 'rgba(251,146,60,0.18)',  border: 'rgba(251,146,60,0.35)',  text: '#fdba74' },
  { id: 'Precious Metal', label: 'Precious Metal', emoji: '🥇', color: 'rgba(250,204,21,0.18)',  border: 'rgba(250,204,21,0.35)',  text: '#fde047' },
] as const

export type AssetGroupId = typeof ASSET_GROUPS[number]['id']

// Exact height of BottomNav (two rows: screen tabs ~52px + group pills ~40px + borders)
// Using CSS calc so it adapts if safe-area changes, but never obscures nav.
const NAV_BAR_HEIGHT = 96

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (group: AssetGroupId) => void
}

export function AssetGroupPicker({ open, onClose, onSelect }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — covers everything including behind the nav bar */}
          <motion.div
            key="agp-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              zIndex: 40,
            }}
          />

          {/* Sheet — sits ABOVE the bottom nav bar */}
          <motion.div
            key="agp-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              // Float above the nav bar so nothing is hidden underneath it
              bottom: NAV_BAR_HEIGHT,
              left: 0,
              right: 0,
              zIndex: 50,
              background: 'linear-gradient(180deg,#0d0d0d 0%,#080808 100%)',
              border: '1px solid rgba(110,231,183,0.18)',
              borderBottom: '1px solid rgba(110,231,183,0.10)',
              borderRadius: '28px 28px 20px 20px',
              // Flex column so header stays pinned and grid scrolls if needed
              display: 'flex',
              flexDirection: 'column',
              // Max height = viewport minus nav bar minus a comfortable top gap
              maxHeight: `calc(88dvh - ${NAV_BAR_HEIGHT}px)`,
              padding: '0 20px',
              paddingBottom: 20,
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.6)', marginBottom: 6, flexShrink: 0 }}>Add Asset</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', marginBottom: 18, flexShrink: 0 }}>Choose a group</h2>

            {/* Scrollable 2-column grid — all 6 tiles always reachable */}
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 4 }}>
                {ASSET_GROUPS.map((g, i) => (
                  <motion.button
                    key={g.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.045, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => { onClose(); onSelect(g.id) }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      gap: 8, padding: '18px 16px',
                      background: g.color, border: `1px solid ${g.border}`,
                      borderRadius: 20, cursor: 'pointer',
                      boxShadow: `0 4px 20px ${g.color}`,
                    }}
                  >
                    <span style={{ fontSize: 30 }}>{g.emoji}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: g.text, letterSpacing: '-0.01em' }}>{g.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
