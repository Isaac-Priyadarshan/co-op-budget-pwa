import { motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import type { AppUser } from '../../lib/types'

const USERS: { name: AppUser; emoji: string; color: string; glow: string }[] = [
  {
    name: 'Isaac',
    emoji: '👨🏽‍💻',
    color: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(59,130,246,0.2))',
    glow: 'rgba(99,102,241,0.5)',
  },
  {
    name: 'Jenifa',
    emoji: '👩🏽‍💼',
    color: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(168,85,247,0.2))',
    glow: 'rgba(236,72,153,0.5)',
  },
]

export function UserSelectScreen() {
  const { setActiveUser } = useUser()

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at top, rgba(82,146,255,0.15) 0%, transparent 35%), radial-gradient(circle at bottom right, rgba(127,86,217,0.13) 0%, transparent 30%), linear-gradient(180deg,#04050b 0%,#070b17 52%,#050816 100%)',
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}
      >
        {/* Logo mark */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.3))',
              border: '1px solid rgba(139,92,246,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '32px',
              boxShadow: '0 0 32px rgba(99,102,241,0.25)',
            }}
          >
            💎
          </div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: '#f5f7ff',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}
          >
            Co-Op Budget
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
            Who is managing today?
          </p>
        </div>

        {/* User cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {USERS.map((user, i) => (
            <motion.button
              key={user.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveUser(user.name)}
              style={{
                width: '100%',
                padding: '18px 20px',
                background: user.color,
                border: `1px solid ${user.glow.replace('0.5', '0.3')}`,
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: `0 4px 24px ${user.glow.replace('0.5', '0.15')}`,
                transition: 'box-shadow 0.2s ease',
              }}
            >
              <span style={{ fontSize: '36px' }}>{user.emoji}</span>
              <div style={{ textAlign: 'left' }}>
                <p
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#f5f7ff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {user.name}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  Tap to continue
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
