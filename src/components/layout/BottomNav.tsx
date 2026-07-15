import { useRef, useLayoutEffect, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NAV_PAGES, type ScreenId } from '../../lib/constants'

interface BottomNavProps {
  activeScreen: ScreenId
  onNavigate: (screen: ScreenId) => void
}

// Default screen to land on when swiping to each page
const PAGE_DEFAULTS: ScreenId[] = ['home', 'wallet-credit', 'account-overview', 'overview']

function getPageForScreen(screen: ScreenId): number {
  for (let i = 0; i < NAV_PAGES.length; i++) {
    if (NAV_PAGES[i].screens.some((s) => s.id === screen)) return i
  }
  return 0
}

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  const [pageIndex, setPageIndex] = useState(() => getPageForScreen(activeScreen))
  const [swipeDir, setSwipeDir] = useState<1 | -1>(1)
  const navRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef<number | null>(null)

  // Sync page when activeScreen changes externally
  useEffect(() => {
    const correct = getPageForScreen(activeScreen)
    if (correct !== pageIndex) {
      setSwipeDir(correct > pageIndex ? 1 : -1)
      setPageIndex(correct)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen])

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

  function goToPage(idx: number) {
    if (idx < 0 || idx >= NAV_PAGES.length) return
    setSwipeDir(idx > pageIndex ? 1 : -1)
    setPageIndex(idx)
    onNavigate(PAGE_DEFAULTS[idx])
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX
  }
  function handlePointerUp(e: React.PointerEvent) {
    if (dragStartX.current === null) return
    const delta = e.clientX - dragStartX.current
    dragStartX.current = null
    if (Math.abs(delta) < 40) return
    if (delta < 0) goToPage(pageIndex + 1)
    else goToPage(pageIndex - 1)
  }

  const currentPage = NAV_PAGES[pageIndex]

  const variants = {
    enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
  }

  return (
    <div
      ref={navRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(8,6,0,0.97)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(251,191,36,0.12)',
        boxShadow: '0 60px 0 0 rgba(8,6,0,0.97)',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <div style={{ overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait" custom={swipeDir}>
          <motion.div
            key={pageIndex}
            custom={swipeDir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '10px 12px 10px',
              gap: 0,
            }}
          >
            {currentPage.screens.map((screen) => {
              const isActive = activeScreen === screen.id
              return (
                <motion.button
                  key={screen.id}
                  onClick={() => onNavigate(screen.id as ScreenId)}
                  whileTap={{ scale: 0.88 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 16,
                    position: 'relative',
                    width: '100%',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
                        borderRadius: 16,
                        border: '1px solid rgba(251,191,36,0.30)',
                        boxShadow: '0 0 14px rgba(251,191,36,0.14)',
                      }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <span style={{ fontSize: 22, zIndex: 1, lineHeight: 1 }}>{screen.icon}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 400,
                      zIndex: 1,
                      color: isActive ? '#FBBF24' : 'rgba(255,255,255,0.42)',
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {screen.label}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
