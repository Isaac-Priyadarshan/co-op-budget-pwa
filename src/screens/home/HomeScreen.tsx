import { motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'

export function HomeScreen() {
  const { activeUser } = useUser()

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <p
            style={{
              fontSize: '12px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(165,180,252,0.7)',
              marginBottom: '6px',
            }}
          >
            Good to see you
          </p>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#f5f7ff',
              letterSpacing: '-0.02em',
            }}
          >
            {activeUser} 👋
          </h1>
        </div>

        {/* Balance card */}
        <div
          style={{
            borderRadius: '24px',
            padding: '24px',
            background:
              'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.18) 100%)',
            border: '1px solid rgba(139,92,246,0.3)',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(196,181,253,0.7)',
              marginBottom: '8px',
            }}
          >
            Total Balance
          </p>
          <p
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#f5f7ff',
              letterSpacing: '-0.03em',
            }}
          >
            ₹0.00
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
            No transactions yet
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Income', value: '₹0', color: 'rgba(52,211,153,0.2)', border: 'rgba(52,211,153,0.3)', text: '#6ee7b7' },
            { label: 'Expenses', value: '₹0', color: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.25)', text: '#fca5a5' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                borderRadius: '18px',
                padding: '18px 16px',
                background: stat.color,
                border: `1px solid ${stat.border}`,
              }}
            >
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {stat.label}
              </p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: stat.text }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div
          style={{
            borderRadius: '20px',
            padding: '32px 20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📊</p>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>No recent activity</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Start by adding your first transaction in the Ledger</p>
        </div>
      </motion.div>
    </div>
  )
}
