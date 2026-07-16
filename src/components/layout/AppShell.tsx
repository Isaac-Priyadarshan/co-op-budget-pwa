import { useState, useEffect } from 'react'
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

export function AppShell() {
  const { activeUser } = useUser()
  const location = useLocation()
  const navigate = useNavigate()

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
        top: var(--sat)  →  the scroll area itself starts BELOW the status
        bar / notch / Dynamic Island. This is the correct approach because
        the outer shell is position:fixed with inset:0 (which ignores any
        padding-top on #root). By setting `top` — not paddingTop — on this
        element, we physically push the scroll viewport down by exactly the
        safe-area-inset-top value from frame 0.

        --sat is pre-painted by the synchronous <script> in index.html
        using height-based probing (not padding-based), which is the only
        method iOS WebKit resolves synchronously before the first paint.

        DO NOT change top:var(--sat) back to paddingTop:var(--sat) here.
        paddingTop shifts content but keeps the scroll origin at y=0,
        meaning fast-scroll momentum can still expose content behind the
        status bar. top:var(--sat) moves the entire scrollable region down,
        which is physically impossible to scroll past.
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
