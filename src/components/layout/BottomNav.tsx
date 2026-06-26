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

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  const [activeGroup, setActiveGroup] = useState(0)

  const currentGroup = NAV_GROUPS[activeGroup]

  return (
    <div
      style={{
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(5,8,22,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* 3 screen tabs for active group */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0',
          padding: '8px 16px 2px',
        }}
      >
        <AnimatePresence mode="wait">
          {currentGroup.screens.map((screen) => {
            const isActive = activeScreen === screen.id
            return (
              <motion.button
                key={screen.id}
                onClick={() => onNavigate(screen.id as ScreenId)}
                whileTap={{ scale: 0.92 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '14px',
                  transition: 'all 0.18s ease',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))',
                      borderRadius: '14px',
                      border: '1px solid rgba(139,92,246,0.3)',
                    }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span style={{ fontSize: '20px', zIndex: 1 }}>{ICONS[screen.icon]}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                    zIndex: 1,
                    letterSpacing: '0.02em',
                  }}
                >
                  {screen.label}
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 4 group selectors */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          padding: '4px 16px 8px',
          gap: '8px',
        }}
      >
        {NAV_GROUPS.map((group, idx) => {
          const isActive = activeGroup === idx
          return (
            <button
              key={group.label}
              onClick={() => {
                setActiveGroup(idx)
                onNavigate(group.screens[0].id as ScreenId)
              }}
              style={{
                padding: '5px 4px',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(99,102,241,0.3), rgba(139,92,246,0.22))'
                  : 'rgba(255,255,255,0.04)',
                border: isActive
                  ? '1px solid rgba(139,92,246,0.4)'
                  : '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                fontSize: '10px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 0.18s ease',
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
