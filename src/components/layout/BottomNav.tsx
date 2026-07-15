import { useState, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NAV_PAGES, type ScreenId } from '../../lib/constants'

interface BottomNavProps {
  activeScreen: ScreenId
  onNavigate: (screen: ScreenId) => void
}

// Find which page index contains the given screen
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

  // Sync page when activeScreen changes externally (e.g. deep-link)
  const correctPage = getPageForScreen(activeScreen)
  if (correctPage !== pageIndex) {
    setPageIndex(correctPage)
  }

  // Publish real nav height as CSS variable --nav-h
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
    onNavigate(NAV_PAGES[idx].screens[0].id as ScreenId)
  }

  // Touch / pointer swipe handlers
  function handlePointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX
  }
  function handlePointerUp(e: React.PointerEvent) {
    if (dragStartX.current === null) return
    const delta = e.clientX - dragStartX.current
    dragStartX.current = null
    if (Math.abs(delta) < 40) return // not a swipe
    if (delta < 0) goToPage(pageIndex + 1) // swipe left → next
    else goToPage(pageIndex - 1)           // swipe right → prev
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
      {/* 4 screen buttons — animate in/out on page change */}
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
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              padding: '10px 8px 4px',
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
                    gap: 3,
                    padding: '8px 2px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 14,
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
                        borderRadius: 14,
                        border: '1px solid rgba(251,191,36,0.30)',
                        boxShadow: '0 0 12px rgba(251,191,36,0.12)',
                      }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <span style={{ fontSize: 19, zIndex: 1, lineHeight: 1 }}>{screen.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 400,
                      zIndex: 1,
                      color: isActive ? '#FBBF24' : 'rgba(255,255,255,0.38)',
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 56,
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

      {/* Page dots — tap to jump to page */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          paddingBottom: 8,
          paddingTop: 2,
        }}
      >
        {NAV_PAGES.map((page, idx) => (
          <button
            key={page.label}
            onClick={() => goToPage(idx)}
            style={{
              width: pageIndex === idx ? 22 : 6,
              height: 6,
              borderRadius: 999,
              background: pageIndex === idx
                ? 'linear-gradient(90deg, #FBBF24, #D97706)'
                : 'rgba(255,255,255,0.18)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: pageIndex === idx ? '0 0 8px rgba(251,191,36,0.35)' : 'none',
            }}
            aria-label={`Go to ${page.label} navigation`}
          />
        ))}
      </div>
    </div>
  )
}
