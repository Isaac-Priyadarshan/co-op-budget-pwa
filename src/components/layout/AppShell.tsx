import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { BottomNav } from './BottomNav'
import { UserSelectScreen } from '../../screens/user-select/UserSelectScreen'
import { BudgetScreen } from '../../screens/budget/BudgetScreen'
import { HomeScreen } from '../../screens/home/HomeScreen'
import { LedgerScreen } from '../../screens/ledger/LedgerScreen'
import { BorrowedScreen } from '../../screens/borrowed/BorrowedScreen'
import { WalletCreditScreen } from '../../screens/wallet-credit/WalletCreditScreen'
import { LentScreen } from '../../screens/lent/LentScreen'
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

export function AppShell() {
  const { activeUser } = useUser()
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home')

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
        background:
          'radial-gradient(circle at top, rgba(82,146,255,0.15) 0%, transparent 35%), radial-gradient(circle at bottom right, rgba(127,86,217,0.13) 0%, transparent 30%), linear-gradient(180deg,#04050b 0%,#070b17 52%,#050816 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Screen area */}
      <div
        className="scroll-area"
        style={{
          flex: 1,
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ minHeight: '100%' }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <BottomNav activeScreen={activeScreen} onNavigate={setActiveScreen} />
    </div>
  )
}
