import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { BottomNav } from './BottomNav'
import { UserSelectScreen } from '../../screens/user-select/UserSelectScreen'
import { BudgetScreen } from '../../screens/budget/BudgetScreen'
import { HomeScreen } from '../../screens/home/HomeScreen'
import { LedgerScreen } from '../../screens/ledger/LedgerScreen'
import { BorrowedScreen } from '../../screens/borrowed/BorrowedScreen'
import { WalletCreditScreen } from '../../screens/wallet-credit/WalletCreditScreen'
import LentScreen from '../../screens/lent/LentScreen'
import { LoansScreen } from '../../screens/loans/LoansScreen'
import { AccountOverviewScreen } from '../../screens/account-overview/AccountOverviewScreen'
import { AssetScreen } from '../../screens/asset/AssetScreen'
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

export function AppShell() {
  const { activeUser } = useUser()
  const location = useLocation()
  const navigate = useNavigate()

  // Read ?screen= param on mount to restore the correct tab after back-navigation
  const initialScreen = (): ScreenId => {
    const params = new URLSearchParams(location.search)
    const s = params.get('screen') as ScreenId | null
    if (s && VALID_SCREENS.includes(s)) return s
    return 'home'
  }

  const [activeScreen, setActiveScreen] = useState<ScreenId>(initialScreen)

  // If URL changes (e.g. user presses back from a detail route with ?screen=),
  // sync the active screen from the query param and then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('screen') as ScreenId | null
    if (s && VALID_SCREENS.includes(s)) {
      setActiveScreen(s)
      // Clean the ?screen= param from the URL without adding a history entry
      navigate('/', { replace: true })
    }
  }, [location.search])

  const ActiveComponent = SCREEN_MAP[activeScreen]

  if (!activeUser) {
    return <UserSelectScreen />
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#000000',
        overflow: 'hidden',
      }}
    >
      {/* Global gold top-glow */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140vw',
          height: '55vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.13) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Subtle bottom-corner gold warmth */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          right: '-10%',
          width: '60vw',
          height: '60vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        className="scroll-area"
        style={{
          flex: 1,
          height: 0,
          paddingTop: 'env(safe-area-inset-top)',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          position: 'relative',
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
            style={{ height: 'auto' }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <BottomNav
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
      />
    </div>
  )
}
