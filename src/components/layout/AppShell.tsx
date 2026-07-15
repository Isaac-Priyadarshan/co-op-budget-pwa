import { useState, useEffect, useRef } from 'react'
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
const SELF_SCROLL_SCREENS: ScreenId[] = ['asset']

/**
 * Read the real safe-area-inset-bottom in JS.
 * CSS env() can return 0px on the very first synchronous paint of an iOS PWA
 * because the viewport geometry hasn’t been finalised yet.
 * Reading it via getComputedStyle on a live element gives the true value
 * once the browser has committed the layout — and we can use it to set
 * a hard pixel paddingBottom on the bottom bar so there’s zero reliance
 * on CSS env() timing.
 */
function readSafeAreaBottom(): number {
  try {
    const el = document.createElement('div')
    el.style.cssText =
      'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden'
    document.body.appendChild(el)
    const h = el.getBoundingClientRect().height
    document.body.removeChild(el)
    return h
  } catch {
    return 0
  }
}

export function AppShell() {
  const { activeUser } = useUser()
  const location = useLocation()
  const navigate = useNavigate()
  // JS-read safe-area value — immune to CSS env() first-paint timing bug
  const [safeBottom, setSafeBottom] = useState(0)
  const safeBottomRead = useRef(false)

  useEffect(() => {
    if (safeBottomRead.current) return
    safeBottomRead.current = true
    // Read immediately, then re-read after a short tick in case iOS
    // hasn’t committed the viewport geometry yet on the very first mount.
    const v1 = readSafeAreaBottom()
    setSafeBottom(v1)
    const t = setTimeout(() => {
      const v2 = readSafeAreaBottom()
      if (v2 !== v1) setSafeBottom(v2)
    }, 80)
    return () => clearTimeout(t)
  }, [])

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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // Nav background colour — fills every pixel behind the nav from frame 0.
        // Previously #000000 which showed as a black flash whenever the nav
        // hadn’t yet painted its own background.
        background: 'rgb(14, 12, 6)',
        overflow: 'hidden',
      }}
    >
      {/* Global gold top-glow */}
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

      {/* Scroll area */}
      <div
        className="scroll-area"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: 'env(safe-area-inset-top)',
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
       * ─── NAV WRAPPER: DEFINITIVE BOTTOM FIX ───────────────────────────────
       * Previous design: width: calc(100%-24px), centered with left:50%
       * transform. This left 12px gaps on each side where the shell
       * background (was #000) showed through as a black bar.
       *
       * New design:
       *   • Full width (left:0, right:0) — no side gaps
       *   • Shell background is now rgb(14,12,6) — matches nav glass
       *     exactly, so even the side gaps are the correct colour
       *   • Nav inner content is still centred with maxWidth:480
       *     via the BottomNav’s own wrapper
       *   • paddingBottom uses JS-read safeBottom value (integer px)
       *     so it never depends on CSS env() first-paint timing
       *   • CSS env() is kept as the fallback in BottomNav itself
       * ────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          pointerEvents: 'auto',
          // Solid floor: this background paints behind the nav’s
          // rounded top corners and fills the home indicator zone
          // from the very first frame, before any JS runs.
          background: 'rgb(14, 12, 6)',
          // JS-read safe-area guarantees the home indicator zone
          // is always covered even on cold boot.
          paddingBottom: safeBottom > 0 ? safeBottom : undefined,
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
