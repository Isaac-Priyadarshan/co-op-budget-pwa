import { motion } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { useBorrowed } from '../../hooks/useBorrowed'
import { useLent } from '../../hooks/useLent'
import { useWallets } from '../../hooks/useWallets'
import { useLoans } from '../../hooks/useLoans'
import { useAssets } from '../../hooks/useAssets'
import { formatINR } from '../../utils/format'

interface StatRowProps { label: string; value: number; color: string; sub?: string }
function StatRow({ label, value, color, sub }: StatRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{sub}</p>}
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{formatINR(value)}</p>
    </div>
  )
}

export function AccountOverviewScreen() {
  const { balance: txBalance, totalIncome, totalExpenses, loading: l1 } = useTransactions()
  const { totalOwed: borrowed, loading: l2 } = useBorrowed()
  const { totalOwedToUs: lent, loading: l3 } = useLent()
  const { totalCash, totalCredit, loading: l4 } = useWallets()
  const { totalOutstanding: loanDebt, totalEMI, loading: l5 } = useLoans()
  const { totalValue: assetValue, loading: l6 } = useAssets()

  const loading = l1 || l2 || l3 || l4 || l5 || l6

  const totalLiabilities = borrowed + totalCredit + loanDebt
  const netWorth = assetValue + totalCash + lent + txBalance - totalLiabilities

  const sections = [
    {
      title: 'Assets & Inflows',
      accent: '#6ee7b7',
      bg: 'rgba(52,211,153,0.08)',
      border: 'rgba(52,211,153,0.2)',
      rows: [
        { label: 'Asset Portfolio', value: assetValue, color: '#6ee7b7', sub: 'Gold, property, vehicles, investments' },
        { label: 'Cash & Wallets', value: totalCash, color: '#6ee7b7', sub: 'All cash balances' },
        { label: 'Money Lent Out', value: lent, color: '#a5f3c3', sub: 'Pending recoveries' },
        { label: 'Transaction Balance', value: txBalance, color: txBalance >= 0 ? '#a5b4fc' : '#fca5a5', sub: `Income ${formatINR(totalIncome)} − Expenses ${formatINR(totalExpenses)}` },
      ],
    },
    {
      title: 'Liabilities & Outflows',
      accent: '#fca5a5',
      bg: 'rgba(248,113,113,0.07)',
      border: 'rgba(248,113,113,0.2)',
      rows: [
        { label: 'Loan Outstanding', value: loanDebt, color: '#fca5a5', sub: `EMI burden ${formatINR(totalEMI)}/mo` },
        { label: 'Credit Card Dues', value: totalCredit, color: '#fca5a5', sub: 'All credit outstanding' },
        { label: 'Money Borrowed', value: borrowed, color: '#fca5a5', sub: 'Unsettled borrowed amounts' },
      ],
    },
  ]

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 4 }}>Financial Position</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Account Overview</h1>
        </div>

        {/* Net Worth hero card */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ borderRadius: 24, padding: '24px', background: 'linear-gradient(135deg,rgba(99,102,241,0.28),rgba(139,92,246,0.2))', border: '1px solid rgba(139,92,246,0.32)', marginBottom: 20, position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(139,92,246,0.18)', filter: 'blur(32px)' }} />
          <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,181,253,0.7)', marginBottom: 8, position: 'relative' }}>Net Worth</p>
          {loading ? (
            <div style={{ height: 44, width: 180, borderRadius: 8, background: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <p style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', position: 'relative', color: netWorth >= 0 ? '#a5b4fc' : '#fca5a5' }}>
              {formatINR(netWorth)}
            </p>
          )}
          <div style={{ display: 'flex', gap: 20, marginTop: 14, position: 'relative' }}>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Assets</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>{formatINR(assetValue + totalCash + lent)}</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.12)', alignSelf: 'stretch' }} />
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Liabilities</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalLiabilities)}</p>
            </div>
          </div>
        </motion.div>

        {sections.map(section => (
          <div key={section.title} style={{ borderRadius: 20, padding: '16px 18px', background: section.bg, border: `1px solid ${section.border}`, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: section.accent, marginBottom: 4 }}>{section.title}</p>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                {section.rows.map((_, i) => <div key={i} style={{ height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />)}
              </div>
            ) : (
              section.rows.map(row => <StatRow key={row.label} {...row} />)
            )}
          </div>
        ))}

      </motion.div>
    </div>
  )
}
