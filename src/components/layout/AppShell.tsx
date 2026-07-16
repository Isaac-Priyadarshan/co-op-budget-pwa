import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { BottomNav } from './BottomNav'
import { UserSelectScreen } from '../../screens/user-select/UserSelectScreen'
import BudgetScreen from '../../screens/budget/BudgetScreen'
import { HomeScreen } from '../../screens/home/HomeScreen'
import { LedgerScreen } from '../../screens/ledger/LedgerScreen'
import { BorrowedScreen } from '../../screens/borrowed/BorrowedScreen'
import { WalletCreditScreen } from '../../screens/wallet-credit/WalletCreditScreen'
import LentScreen from '../../screens/lent/LentScreen'
import { LoansScreen } from '../../screens/loans/LoansScreen'
import { AccountOverviewScreen } from '../../screens/account-overview/AccountOverviewScreen'
import AssetScreen from '../../screens/asset/AssetScreen'
import { RecurringPaymentScreen } from '../../screens/recurring-payment/RecurringPaymentScreen'
import { OverviewScreen } from '../../screens/overview/OverviewScreen'
import { SettingsScreen } from '../../screens/settings/SettingsScreen'
import type { ScreenId } from '../../lib/constants'

const SCREEN_MAP: Record<ScreenId, React.ComponentType> = {
  budget: BudgetScreen,
  home: HomeScreen,
  ledger: LedgerScreen,
  borrowed: BorrowedScreen,
  'wallet-credit': WalletCreditScreen,
  lent: LentScreen,
  loans: LoansScreen,
  'account-overview': AccountOverviewScreen,
  asset: AssetScreen,
  'recurring-payment': RecurringPaymentScreen,
  overview: OverviewScreen,
  settings: SettingsScreen,
}

const VALID_SCREENS = Object.keys(SCREEN_MAP) as ScreenId[]
const SELF_SCROLL_SCREENS: ScreenId[] = ['asset', 'home']

/* ─────────────────────────────────────────────────────────────────────────
 * measureSafeAreaTop
 * ─────────────────────────────────────────────────────────────────────────
 * Returns the resolved pixel value of env(safe-area-inset-top) by creating
 * a temporary position:fixed probe element and reading its rendered height.
 *
 * WHY height and not padding:
 *   iOS WebKit resolves `height: env(...)` synchronously at
 *   getBoundingClientRect() time. `padding-top: env(...)` is deferred to
 *   the next layout pass, making it unreliable for first-frame measurement.
 *
 * WHY this is needed in AppShell (not just index.html):
 *   The index.html script's deferred rAF may fire AFTER React's first paint
 *   in some iOS PWA cold-start scenarios. This useEffect runs post-mount,
 *   guaranteeing --sat is correct before the scroll area's `top` is used.
 */
function measureSafeAreaTop(): number {
  try {
    const probe = document.createElement('div')
    probe.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:1px',
      'height:env(safe-area-inset-top,0px)',
      'pointer-events:none',
      'visibility:hidden',
      'z-index:-1',
    ].join(';')
    document.documentElement.appendChild(probe)
    const h = probe.getBoundingClientRect().height || 0
    document.documentElement.removeChild(probe)
    return h
  } catch {
    return 0
  }
}

export function AppShell() {
  const { activeUser } = useUser()
  const location = useLocation()
  const navigate = useNavigate()

  /*
   * satReady — toggled to true once we have confirmed --sat is set to the
   * real value. Used to gate the first render so the scroll area never
   * flashes at top:0 even for one frame.
   */
  const [satReady, setSatReady] = useState<boolean>(() => {
    // If index.html's synchronous probe already wrote a non-zero value,
    // we can trust it immediately and skip the useEffect re-probe flash.
    const existing = getComputedStyle(document.documentElement)
      .getPropertyValue('--sat')
      .trim()
    return existing !== '' && existing !== '0px'
  })

  /*
   * SAFE-AREA MOUNT GUARD
   * ─────────────────────────────────────────────────────────────────────
   * Runs once after React mounts. At this point the DOM is fully painted
   * and iOS WebKit has finalised viewport geometry — so the probe will
   * always return the correct value.
   *
   * Steps:
   *  1. Measure env(safe-area-inset-top) via height probe.
   *  2. Read the current --sat value that index.html wrote.
   *  3. If they differ (index.html sync probe got 0, real value is e.g. 59px)
   *     → patch --sat and trigger a re-render via setSatReady(true).
   *  4. If they match → just confirm satReady so the shell renders normally.
   */
  const patchSat = useCallback(() => {
    const measured = measureSafeAreaTop()
    const existing = parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--sat')
        .trim() || '0'
    )
    if (measured !== existing) {
      document.documentElement.style.setProperty('--sat', measured + 'px')
    }
    setSatReady(true)
  }, [])

  useEffect(() => {
    /*
     * Two-rAF approach:
     *   - First rAF: after layout (geometry finalised, env() resolves correctly)
     *   - Second rAF: after paint (belt-and-suspenders for slower iOS devices)
     * The actual patch only writes to the DOM if the value changed,
     * so there is no redundant style recalculation on Android / desktop.
     */
    let raf1: number
    let raf2: number
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(patchSat)
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [patchSat])

  const initialScreen = (): ScreenId => {
    const params = new URLSearchParams(location.search)
    const s = params.get('screen') as ScreenId | null
    if (s && VALID_SCREENS.includes(s)) return s
    return 'home'
  }

  const [activeScreen, setActiveScreen] = useState<ScreenId>(initialScreen)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('screen') as ScreenId | null
    if (s && VALID_SCREENS.includes(s)) {
      setActiveScreen(s)
      navigate('/', { replace: true })
    }
  }, [location.search])

  const ActiveComponent = SCREEN_MAP[activeScreen]
  const isSelfScroll = SELF_SCROLL_SCREENS.includes(activeScreen)

  if (!activeUser) {
    return <UserSelectScreen />
  }

  /*
   * While we are waiting for the post-mount SAT confirmation, render the
   * shell with opacity:0. This prevents a ~1-frame flash where the scroll
   * area sits at top:0 before --sat is patched. The invisible shell still
   * mounts, so the useEffect fires immediately — the delay is imperceptible.
   */
  if (!satReady) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgb(14, 12, 6)',
          opacity: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgb(14, 12, 6)',
        overflow: 'hidden',
      }}
    >
      {/* Global gold top-glow — starts below the status bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '140vw',
        height: '55vw',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(251,191,36,0.13) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Bottom-corner gold warmth */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        right: '-10%',
        width: '60vw',
        height: '60vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/*
        SCROLL AREA
        ─────────────────────────────────────────────────────────────────────
        top: var(--sat)  →  the scroll area starts BELOW the status bar /
        notch / Dynamic Island. We use top (not paddingTop) because:
          • top physically moves the scroll viewport origin down — content
            is impossible to scroll behind the status bar.
          • paddingTop shifts content but keeps scroll origin at y=0,
            meaning fast momentum scrolls can still expose content behind
            the status bar.

        --sat is guaranteed correct at this point because:
          1. index.html sync probe wrote the initial value.
          2. index.html rAF deferred probe patched it after first layout.
          3. AppShell useEffect double-rAF patched it after React mount.
          4. satReady gate ensures this JSX never renders until step 3 done.
      */}
      <div
        className="scroll-area"
        style={{
          position: 'absolute',
          top: 'var(--sat)',
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: isSelfScroll ? 'hidden' : 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          zIndex: 1,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{
              minHeight: '100%',
              paddingBottom: 100,
              overflow: isSelfScroll ? 'hidden' : 'visible',
            }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/*
        NAV WRAPPER — flush at absolute bottom of screen.
        The nav glass sits at bottom:0; the iPhone home indicator
        overlaps it naturally — this is the intended behaviour.
      */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          pointerEvents: 'auto',
          background: 'rgb(14, 12, 6)',
        }}
      >
        <BottomNav
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
        />
      </div>
    </div>
  )
}
