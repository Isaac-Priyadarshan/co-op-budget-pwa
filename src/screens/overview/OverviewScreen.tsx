import { motion } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { useBorrowed } from '../../hooks/useBorrowed'
import { useLent } from '../../hooks/useLent'
import { useWallets } from '../../hooks/useWallets'
import { useLoans } from '../../hooks/useLoans'
import { useAssets } from '../../hooks/useAssets'
import { useRecurring } from '../../hooks/useRecurring'
import { formatINR } from '../../utils/format'

interface MiniCardProps { label: string; value: string; accent: string; sub?: string }
function MiniCard({ label, value, accent, sub }: MiniCardProps) {
  return (
    <div style={{ borderRadius: 18, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 17, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums', marginBottom: sub ? 3 : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
    </div>
  )
}

export function OverviewScreen() {
  const { balance, totalIncome, totalExpenses, transactions, loading: l1 } = useTransactions()
  const { totalOwed: borrowed, loading: l2 } = useBorrowed()
  const { totalOwedToUs: lent, loading: l3 } = useLent()
  const { totalCash, totalCredit, loading: l4 } = useWallets()
  const { totalOutstanding: loanDebt, totalEMI, loading: l5 } = useLoans()
  const { totalValue: assetValue, loading: l6 } = useAssets()
  const { totalMonthly, items: recurring, loading: l7 } = useRecurring()

  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7
  const netWorth = assetValue + totalCash + lent + balance - (borrowed + totalCredit + loanDebt)

  // Spending by category from transactions
  const categoryMap: Record<string, number> = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount
  })
  const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCat = topCategories[0]?.[1] ?? 1

  // Upcoming dues in next 7 days
  const upcoming = recurring.filter(r => {
    if (!r.active) return false
    const days = Math.ceil((new Date(r.next_due).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 7
  })

  const summaryCards = [
    { label: 'Net Worth', value: formatINR(netWorth), accent: netWorth >= 0 ? '#a5b4fc' : '#fca5a5' },
    { label: 'Total Assets', value: formatINR(assetValue + totalCash), accent: '#6ee7b7' },
    { label: 'Total Debt', value: formatINR(borrowed + totalCredit + loanDebt), accent: '#fca5a5' },
    { label: 'Cash Balance', value: formatINR(totalCash), accent: '#6ee7b7' },
    { label: 'Money Lent', value: formatINR(lent), accent: '#a5f3c3', sub: 'To recover' },
    { label: 'Money Borrowed', value: formatINR(borrowed), accent: '#fca5a5', sub: 'To repay' },
    { label: 'Loan Outstanding', value: formatINR(loanDebt), accent: '#fca5a5', sub: `EMI ${formatINR(totalEMI)}/mo` },
    { label: 'Monthly Recurring', value: formatINR(totalMonthly), accent: '#a5b4fc', sub: `${recurring.filter(r=>r.active).length} active` },
    { label: 'Credit Dues', value: formatINR(totalCredit), accent: '#fca5a5' },
    { label: 'Tx Balance', value: formatINR(balance), accent: balance >= 0 ? '#6ee7b7' : '#fca5a5', sub: `↑${formatINR(totalIncome)} ↓${formatINR(totalExpenses)}` },
  ]

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 4 }}>Everything at a glance</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Overview</h1>
        </div>

        {/* Summary grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {loading ? Array.from({length: 10}).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 18, background: 'rgba(255,255,255,0.05)' }} />) :
            summaryCards.map(c => <MiniCard key={c.label} {...c} />)
          }
        </div>

        {/* Top spending categories */}
        {!loading && topCategories.length > 0 && (
          <div style={{ borderRadius: 20, padding: '18px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fca5a5', marginBottom: 14 }}>Top Expense Categories</p>
            {topCategories.map(([cat, amt]) => (
              <div key={cat} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{cat}</p>
                  <p style={{ fontSize: 13, color: '#fca5a5', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatINR(amt)}</p>
                </div>
                <div style={{ height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(amt / maxCat) * 100}%` }} transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    style={{ height: '100%', background: 'linear-gradient(90deg,#fca5a5,#f87171)', borderRadius: 100 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming dues */}
        {!loading && upcoming.length > 0 && (
          <div style={{ borderRadius: 20, padding: '18px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fcd34d', marginBottom: 14 }}>⚡ Due in Next 7 Days</p>
            {upcoming.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#f5f7ff' }}>{r.label}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.next_due}</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d', fontVariantNumeric: 'tabular-nums' }}>{formatINR(r.amount)}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && topCategories.length === 0 && upcoming.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📊</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Add transactions and recurring payments to see insights here</p>
          </div>
        )}

      </motion.div>
    </div>
  )
}
