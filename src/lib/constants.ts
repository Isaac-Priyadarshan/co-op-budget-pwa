export const USERS = {
  ISAAC: 'Isaac',
  JENIFA: 'Jenifa',
} as const

export type AppUser = typeof USERS[keyof typeof USERS]

// Navigation pages — 3 screens per page, swiped horizontally
export const NAV_PAGES = [
  {
    label: 'Core',
    screens: [
      { id: 'budget',           label: 'Budget',    icon: '💰' },
      { id: 'home',             label: 'Home',      icon: '🏠' },
      { id: 'ledger',           label: 'Ledger',    icon: '📖' },
    ],
  },
  {
    label: 'Money',
    screens: [
      { id: 'borrowed',         label: 'Borrowed',  icon: '⬇️' },
      { id: 'wallet-credit',    label: 'Wallet',    icon: '💳' },
      { id: 'lent',             label: 'Lent',      icon: '⬆️' },
    ],
  },
  {
    label: 'Accounts',
    screens: [
      { id: 'loans',            label: 'Loans',     icon: '🏦' },
      { id: 'account-overview', label: 'Accounts',  icon: '📊' },
      { id: 'recurring-payment', label: 'Recurring', icon: '🔄' },
    ],
  },
  {
    label: 'Big Picture',
    screens: [
      { id: 'asset',            label: 'Assets',    icon: '💼' },
      { id: 'overview',         label: 'Overview',  icon: '📈' },
      { id: 'settings',         label: 'Settings',  icon: '⚙️' },
    ],
  },
] as const

// Keep NAV_GROUPS as a thin alias so any file that still imports it compiles.
export const NAV_GROUPS = NAV_PAGES

export type ScreenId =
  | 'budget'
  | 'home'
  | 'ledger'
  | 'borrowed'
  | 'wallet-credit'
  | 'lent'
  | 'loans'
  | 'account-overview'
  | 'asset'
  | 'recurring-payment'
  | 'overview'
  | 'settings'
