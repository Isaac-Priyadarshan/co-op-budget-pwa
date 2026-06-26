import { motion } from 'framer-motion'

export function LedgerScreen() {
  return (
    <div style={{ padding: '24px 20px 32px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em', marginBottom: '8px' }}>Ledger</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>All transactions in one place</p>
        <div style={{ marginTop: '32px', borderRadius: '20px', padding: '32px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📖</p>
          <p style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>Coming soon</p>
        </div>
      </motion.div>
    </div>
  )
}
