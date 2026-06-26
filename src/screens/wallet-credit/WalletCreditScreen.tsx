import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { WalletSheet } from '../../components/shared/WalletSheet'
import { formatINR } from '../../utils/format'
import type { AppUser } from '../../lib/types'

const USER_COLORS: Record<AppUser, { accent: string; bg: string; border: string }> = {
  Isaac: { accent: '#a5b4fc', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.28)' },
  Jenifa: { accent: '#f9a8d4', bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.25)' },
}

export function WalletCreditScreen() {
  const { wallets, loading, error, save, remove, totalCash, totalCredit } = useWallets()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [working, setWorking] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setWorking(id); try { await remove(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }

  const byUser = (owner: AppUser) => wallets.filter(w => w.owner === owner)

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 4 }}>Balances</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Wallet & Credit</h1>
          </div>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setSheetOpen(true)}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
          >+ Add</motion.button>
        </div>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Cash', value: totalCash, color: '#6ee7b7', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.22)', icon: '💵' },
            { label: 'Credit Owed', value: totalCredit, color: '#fca5a5', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.22)', icon: '💳' },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 20, padding: '16px', background: s.bg, border: `1px solid ${s.border}` }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
              </div>
              <p style={{ fontSize: 20, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{formatINR(s.value)}</p>
            </div>
          ))}
        </div>

        {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2].map(i => <div key={i} style={{ height: 120, borderRadius: 20, background: 'rgba(255,255,255,0.05)' }} />)}</div>}
        {error && <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>{error}</div>}

        {!loading && wallets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>👛</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No wallets yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Add your cash wallets and credit cards</p>
          </div>
        )}

        {/* Per-user sections */}
        {(['Isaac', 'Jenifa'] as AppUser[]).map(user => {
          const userWallets = byUser(user)
          if (userWallets.length === 0) return null
          const c = USER_COLORS[user]
          const userCash = userWallets.filter(w => w.type === 'cash').reduce((s, w) => s + w.balance, 0)
          const userCredit = userWallets.filter(w => w.type === 'credit').reduce((s, w) => s + w.balance, 0)
          return (
            <div key={user} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: c.accent, letterSpacing: '0.04em' }}>{user}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
                  Cash {formatINR(userCash)} · Credit {formatINR(userCredit)}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AnimatePresence initial={false}>
                  {userWallets.map(w => (
                    <motion.div key={w.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 18, background: c.bg, border: `1px solid ${c.border}` }}
                    >
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{w.type === 'cash' ? '💵' : '💳'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#f5f7ff', marginBottom: 3 }}>{w.label}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize' }}>{w.type}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: w.type === 'cash' ? '#6ee7b7' : '#fca5a5', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{formatINR(w.balance)}</p>
                        <button onClick={() => handleDelete(w.id)} disabled={working === w.id}
                          style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                        >{working === w.id ? '…' : 'delete'}</button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </motion.div>

      <WalletSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={save} />
    </div>
  )
}
