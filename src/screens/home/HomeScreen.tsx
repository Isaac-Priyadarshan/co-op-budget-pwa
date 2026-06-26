import { motion } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { formatINR, formatShortDate } from '../../utils/format'

export function HomeScreen() {
  const { transactions, loading, totalIncome, totalExpenses, balance } = useTransactions()

  const recent = transactions.slice(0, 5)

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            borderRadius: 24, padding: '24px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.28) 0%, rgba(139,92,246,0.2) 100%)',
            border: '1px solid rgba(139,92,246,0.32)',
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(99,102,241,0.18)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Glow orb */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(139,92,246,0.18)', filter: 'blur(32px)' }} />
          <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,181,253,0.7)', marginBottom: 8, position: 'relative' }}>Total Balance</p>
          {loading ? (
            <div style={{ height: 44, width: 160, borderRadius: 8, background: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <p style={{ fontSize: 38, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
              {formatINR(balance)}
            </p>
          )}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, position: 'relative' }}>
            {transactions.length === 0 ? 'No transactions yet' : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} recorded`}
          </p>
        </motion.div>

        {/* Income / Expenses */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Income', value: totalIncome, color: '#6ee7b7', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', icon: '↑' },
            { label: 'Expenses', value: totalExpenses, color: '#fca5a5', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.22)', icon: '↓' },
          ].map(stat => (
            <div key={stat.label} style={{ borderRadius: 20, padding: '18px 16px', background: stat.bg, border: `1px solid ${stat.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 16, color: stat.color }}>{stat.icon}</span>
                <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{stat.label}</p>
              </div>
              {loading ? (
                <div style={{ height: 28, width: 80, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
              ) : (
                <p style={{ fontSize: 20, fontWeight: 700, color: stat.color, fontVariantNumeric: 'tabular-nums' }}>{formatINR(stat.value)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Recent Activity</p>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />)}
            </div>
          )}
          {!loading && recent.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 28, marginBottom: 10 }}>📊</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>No activity yet — go to Ledger to add your first transaction</p>
            </div>
          )}
          {!loading && recent.map(tx => (
            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: tx.type === 'income' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {tx.type === 'income' ? '↑' : '↓'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f5f7ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.description}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{tx.category} · {formatShortDate(tx.created_at)}</p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: tx.type === 'income' ? '#6ee7b7' : '#fca5a5', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
