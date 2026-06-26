import { motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import type { AppUser } from '../../lib/types'

export function SettingsScreen() {
  const { activeUser, setActiveUser } = useUser()

  const users: AppUser[] = ['Isaac', 'Jenifa']

  const rows = [
    { label: 'App Version', value: '1.0.0' },
    { label: 'Database', value: 'Supabase (Live)' },
    { label: 'Hosting', value: 'Vercel' },
    { label: 'Built with', value: 'React + TypeScript' },
  ]

  return (
    <div style={{ padding: '24px 20px 48px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 4 }}>Preferences</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Settings</h1>
        </div>

        {/* Active User */}
        <div style={{ borderRadius: 20, padding: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 14 }}>Active User</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {users.map(u => (
              <motion.button key={u} whileTap={{ scale: 0.96 }} onClick={() => setActiveUser(u)}
                style={{ padding: '16px', borderRadius: 16, border: activeUser === u ? '1px solid rgba(165,180,252,0.5)' : '1px solid rgba(255,255,255,0.08)', background: activeUser === u ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.18s ease' }}
              >
                <p style={{ fontSize: 28, marginBottom: 8 }}>{u === 'Isaac' ? '👨🏽' : '👩🏽'}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: activeUser === u ? '#a5b4fc' : 'rgba(255,255,255,0.5)' }}>{u}</p>
                {activeUser === u && (
                  <p style={{ fontSize: 11, color: 'rgba(165,180,252,0.6)', marginTop: 4 }}>● Active</p>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* App info */}
        <div style={{ borderRadius: 20, padding: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>About</p>
          {rows.map((row, i) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{row.label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{row.value}</p>
            </div>
          ))}
        </div>

        {/* App name card */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ borderRadius: 20, padding: '22px', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.28)', textAlign: 'center' }}
        >
          <p style={{ fontSize: 28, marginBottom: 8 }}>💑</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>Isaac & Jenifa</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Private Co-Op Budget App</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>Built with ❤️ — All data synced live</p>
        </motion.div>

      </motion.div>
    </div>
  )
}
