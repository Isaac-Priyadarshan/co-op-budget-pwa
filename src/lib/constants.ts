export const USERS = {
  ISAAC: 'Isaac',
  JENIFA: 'Jenifa',
} as const

export type AppUser = typeof USERS[keyof typeof USERS]

export const NAV_GROUPS = [
  {
    label: 'Finance',
    screens: [
      { id: 'budget',  label: 'Budget',  icon: 'wallet' },
      { id: 'home',    label: 'Home',    icon: 'home' },
      { id: 'ledger',  label: 'Ledger',  icon: 'book-open' },
    ],
  },
  {
    label: 'Tracking',
    screens: [
      { id: 'borrowed',      label: 'Borrowed', icon: 'arrow-down-left' },
      { id: 'wallet-credit', label: 'Wallet',   icon: 'credit-card' },
      { id: 'lent',          label: 'Lent',     icon: 'arrow-up-right' },
    ],
  },
  {
    label: 'Assets',
    screens: [
      { id: 'loans',             label: 'Loans',     icon: 'landmark' },
      { id: 'account-overview',  label: 'Accounts',  icon: 'pie-chart' },
      { id: 'recurring-payment', label: 'Recurring', icon: 'repeat' },
    ],
  },
  {
    label: 'More',
    screens: [
      { id: 'asset',    label: 'Assets',   icon: 'briefcase' },
      { id: 'overview', label: 'Overview', icon: 'bar-chart-2' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ],
  },
] as const

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
