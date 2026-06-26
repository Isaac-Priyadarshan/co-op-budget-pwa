import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NAV_GROUPS, type ScreenId } from '../../lib/constants'

interface BottomNavProps {
  activeScreen: ScreenId
  onNavigate: (screen: ScreenId) => void
}

const ICONS: Record<string, string> = {
  wallet: '💰',
  home: '🏠',
  'book-open': '📖',
  'arrow-down-left': '⬇️',
  'credit-card': '💳',
  'arrow-up-right': '⬆️',
  landmark: '🏦',
  'pie-chart': '📊',
  briefcase: '💼',
  repeat: '🔄',
  'bar-chart-2': '📈',
  settings: '⚙️',
}

// Default screen to land on when each group tab is tapped
const GROUP_DEFAULTS: ScreenId[] = [
  'home',             // Finance
  'wallet-credit',    // Tracking
  'account-overview', // Asset
  'overview',         // More
]

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  const [activeGroup, setActiveGroup] = useState(0)

  const currentGroup = NAV_GROUPS[activeGroup]

  return (
    <div
      style={{
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(8,6,0,0.94)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(251,191,36,0.12)',
      }}
    >
      {/* 3 screen tabs for the active group */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 16px 2px' }}>
        <AnimatePresence mode="wait">
          {currentGroup.screens.map((screen) => {
            const isActive = activeScreen === screen.id
            return (
              <motion.button
                key={screen.id}
                onClick={() => onNavigate(screen.id as ScreenId)}
                whileTap={{ scale: 0.90 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '8px 4px', background: 'none', border: 'none',
                  cursor: 'pointer', borderRadius: 14, position: 'relative',
                  transition: 'all 0.18s ease',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
                      borderRadius: 14,
                      border: '1px solid rgba(251,191,36,0.30)',
                      boxShadow: '0 0 12px rgba(251,191,36,0.12)',
                    }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span style={{ fontSize: 20, zIndex: 1 }}>{ICONS[screen.icon]}</span>
                <span style={{
                  fontSize: 10, fontWeight: isActive ? 700 : 400, zIndex: 1,
                  color: isActive ? '#FBBF24' : 'rgba(255,255,255,0.38)',
                  letterSpacing: '0.02em',
                }}>
                  {screen.label}
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 4 group selector pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '4px 16px 8px', gap: 8 }}>
        {NAV_GROUPS.map((group, idx) => {
          const isActive = activeGroup === idx
          return (
            <button
              key={group.label}
              onClick={() => { setActiveGroup(idx); onNavigate(GROUP_DEFAULTS[idx]) }}
              style={{
                padding: '5px 4px',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(251,191,36,0.22), rgba(217,119,6,0.15))'
                  : 'rgba(255,255,255,0.04)',
                border: isActive
                  ? '1px solid rgba(251,191,36,0.38)'
                  : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                color: isActive ? '#FBBF24' : 'rgba(255,255,255,0.35)',
                fontSize: 10, fontWeight: isActive ? 700 : 400,
                cursor: 'pointer', letterSpacing: '0.02em',
                transition: 'all 0.18s ease',
                boxShadow: isActive ? '0 0 8px rgba(251,191,36,0.15)' : 'none',
              }}
            >
              {group.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
