import { motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'

export function SettingsScreen() {
  const { activeUser, clearUser } = useUser()

  return (
    <div style={{ padding: '24px 20px 32px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em', marginBottom: '8px' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px' }}>App preferences and account</p>

        <div style={{ borderRadius: '20px', padding: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Active User</p>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#f5f7ff' }}>{activeUser}</p>
        </div>

        <button
          onClick={clearUser}
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: '16px',
            color: '#fca5a5',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          Switch User
        </button>
      </motion.div>
    </div>
  )
}
