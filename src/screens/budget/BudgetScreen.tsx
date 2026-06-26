import { motion } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { formatINR } from '../../utils/format'

const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Rent', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Education', 'EMI', 'Other']

export function BudgetScreen() {
  const { transactions, loading } = useTransactions()

  const now = new Date()
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const monthlyTx = transactions.filter(tx => {
    const d = new Date(tx.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const monthlyIncome = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthlyExpenses = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthlySavings = monthlyIncome - monthlyExpenses
  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0

  const categoryBreakdown = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    amount: monthlyTx.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0),
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)

  const topSpend = categoryBreakdown[0]

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 4 }}>{monthName}</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Budget</h1>
        </div>

        {/* Month summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Earned', value: monthlyIncome, color: '#6ee7b7', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
            { label: 'Spent', value: monthlyExpenses, color: '#fca5a5', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.22)' },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 20, padding: '18px 16px', background: s.bg, border: `1px solid ${s.border}` }}>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{s.label} this month</p>
              {loading ? <div style={{ height: 28, width: 90, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} /> : (
                <p style={{ fontSize: 20, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{formatINR(s.value)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Savings card */}
        <div style={{ borderRadius: 20, padding: '20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.14))', border: '1px solid rgba(139,92,246,0.28)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,181,253,0.6)', marginBottom: 6 }}>Monthly Savings</p>
              {loading ? <div style={{ height: 32, width: 120, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} /> : (
                <p style={{ fontSize: 28, fontWeight: 700, color: monthlySavings >= 0 ? '#a5b4fc' : '#fca5a5', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {monthlySavings >= 0 ? '+' : ''}{formatINR(monthlySavings)}
                </p>
              )}
            </div>
            {monthlyIncome > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Savings rate</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: savingsRate >= 20 ? '#6ee7b7' : savingsRate >= 0 ? '#fcd34d' : '#fca5a5' }}>{savingsRate}%</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {monthlyIncome > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((monthlyExpenses / monthlyIncome) * 100, 100)}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: '100%',
                    background: monthlyExpenses / monthlyIncome > 0.8
                      ? 'linear-gradient(90deg, #f87171, #ef4444)'
                      : monthlyExpenses / monthlyIncome > 0.5
                      ? 'linear-gradient(90deg, #fcd34d, #f59e0b)'
                      : 'linear-gradient(90deg, #6ee7b7, #34d399)',
                    borderRadius: 100,
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                Spent {Math.min(Math.round((monthlyExpenses / monthlyIncome) * 100), 100)}% of income
              </p>
            </div>
          )}
        </div>

        {/* Top insight */}
        {topSpend && (
          <div style={{ borderRadius: 18, padding: '16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.8)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>💡 Top Spend</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f5f7ff' }}>
              {topSpend.name} — <span style={{ color: '#fcd34d', fontVariantNumeric: 'tabular-nums' }}>{formatINR(topSpend.amount)}</span>
            </p>
          </div>
        )}

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categoryBreakdown.map(cat => (
                <div key={cat.name} style={{ borderRadius: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#f5f7ff' }}>{cat.name}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>{formatINR(cat.amount)}</p>
                  </div>
                  <div style={{ height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${monthlyExpenses > 0 ? Math.round((cat.amount / monthlyExpenses) * 100) : 0}%` }}
                      transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #6366f1)', borderRadius: 100 }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    {monthlyExpenses > 0 ? Math.round((cat.amount / monthlyExpenses) * 100) : 0}% of expenses
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && monthlyTx.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>💰</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No data for {monthName}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Add transactions in the Ledger to see your budget breakdown</p>
          </div>
        )}

      </motion.div>
    </div>
  )
}
