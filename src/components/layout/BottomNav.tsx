import { useState, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NAV_GROUPS, type ScreenId } from '../../lib/constants'

interface BottomNavProps {
  activeScreen: ScreenId
  onNavigate: (screen: ScreenId) => void
}

const ICONS: Record<string, string> = {
  wallet:            '\ud83d\udcb0',
  home:              '\ud83c\udfe0',
  'book-open':       '\ud83d\udcd6',
  'arrow-down-left': '\u2b07\ufe0f',
  'credit-card':     '\ud83d\udcb3',
  'arrow-up-right':  '\u2b06\ufe0f',
  landmark:          '\ud83c\udfe6',
  'pie-chart':       '\ud83d\udcca',
  briefcase:         '\ud83d\udcbc',
  repeat:            '\ud83d\udd04',
  'bar-chart-2':     '\ud83d\udcc8',
  settings:          '\u2699\ufe0f',
}

const GROUP_DEFAULTS: ScreenId[] = [
  'home',
  'wallet-credit',
  'account-overview',
  'asset',
]

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  const [activeGroup, setActiveGroup] = useState(0)
  const navRef = useRef<HTMLDivElement>(null)

  // Measure real nav height and publish it as a CSS variable so all sheets
  // can use var(--nav-h) for their `bottom` offset — no magic numbers needed.
  useLayoutEffect(() => {
    const el = navRef.current
    if (!el) return
    const update = () => {
      const h = el.getBoundingClientRect().height
      document.documentElement.style.setProperty('--nav-h', `${Math.ceil(h)}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const currentGroup = NAV_GROUPS[activeGroup]

  return (
    <div
      ref={navRef}
      style={{
        flexShrink: 0,
        // ── FIX 2: Use padding-bottom for safe-area, but back the entire
        //    zone with a solid-enough background so the home indicator pill
        //    area never bleeds the raw #000000 body background through.
        //
        //    We do this with a box-shadow trick: spread a solid shadow
        //    DOWNWARD past the bottom edge of this element — it fills the
        //    safe-area zone behind the home pill even when env() = 34px.
        //    The blur(28px) backdrop-filter then blurs everything behind it.
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(8,6,0,0.97)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(251,191,36,0.12)',
        // Extend the background visually past the bottom edge
        // so there's no raw-black bleed below the home indicator.
        boxShadow: '0 60px 0 0 rgba(8,6,0,0.97)',
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
