import { useRef, useLayoutEffect, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NAV_PAGES, type ScreenId } from '../../lib/constants'

interface BottomNavProps {
  activeScreen: ScreenId
  onNavigate: (screen: ScreenId) => void
}

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
    enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -56, opacity: 0 }),
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div
        ref={navRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{
          borderRadius: '24px 24px 0 0',
          background: 'rgba(14, 12, 6, 0.88)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(251,191,36,0.18)',
          borderBottom: 'none',
          boxShadow: [
            '0 -4px 24px rgba(0,0,0,0.5)',
            '0 -1px 0 rgba(251,191,36,0.10)',
            '0 0 0 0.5px rgba(255,255,255,0.04) inset',
          ].join(', '),
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'pan-y',
          /*
           * paddingBottom: var(--sab)
           *
           * --sab is written onto <html> by the pre-paint <script> in index.html
           * BEFORE React hydrates, so this value is correct on frame 0.
           *
           * This pads the nav glass background down behind the iPhone home
           * indicator, ensuring no black strip is ever visible between the
           * nav bar and the bottom edge of the screen — even on the very
           * first render, app launch, or PWA restore.
           *
           * DO NOT replace this with env(safe-area-inset-bottom) directly.
           * iOS applies inline env() one frame late, which was the original
           * cause of the intermittent black flash.
           */
          paddingBottom: 'var(--sab)',
        }}
      >
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
              padding: '10px 8px 10px',
              gap: 0,
            }}
          >
            {currentPage.screens.map((screen) => {
              const isActive = activeScreen === screen.id
              return (
                <motion.button
                  key={screen.id}
                  onClick={() => onNavigate(screen.id as ScreenId)}
                  whileTap={{ scale: 0.86 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 18,
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
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(217,119,6,0.14))',
                        borderRadius: 18,
                        border: '1px solid rgba(251,191,36,0.32)',
                        boxShadow: '0 0 16px rgba(251,191,36,0.16)',
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
