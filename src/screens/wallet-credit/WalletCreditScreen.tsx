import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { WalletSheet } from '../../components/shared/WalletSheet'
import { formatINR } from '../../utils/format'

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

function usagePercent(outstanding: number, limit: number | null | undefined): number {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.round((outstanding / limit) * 100))
}

export function WalletCreditScreen() {
  const { wallets, loading, error, save, remove, totalCash, totalCredit } = useWallets()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [working, setWorking] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setWorking(id)
    try { await remove(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }

  const cashWallets  = wallets.filter(w => w.type === 'cash')
  const creditCards  = wallets.filter(w => w.type === 'credit')

  return (
    <div style={{ position: 'relative', minHeight: '100%', paddingBottom: 100 }}>

      {/* ── Scrollable content ── */}
      <div style={{ padding: '24px 20px 16px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >

          {/* ── Ledger-style Summary Banner ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              borderRadius: 24,
              padding: '22px 20px',
              background: 'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.12))',
              border: '1px solid rgba(99,102,241,0.28)',
              marginBottom: 28,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background glow blob */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 160, height: 160,
              borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)',
              pointerEvents: 'none',
            }} />

            <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.65)', marginBottom: 4 }}>Wallet & Credit</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
              {cashWallets.length} wallet{cashWallets.length !== 1 ? 's' : ''} · {creditCards.length} credit card{creditCards.length !== 1 ? 's' : ''}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Total Cash */}
              <div style={{
                borderRadius: 18, padding: '14px 16px',
                background: 'rgba(52,211,153,0.1)',
                border: '1px solid rgba(52,211,153,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 15 }}>👛</span>
                  <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.7)' }}>Total Cash</p>
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalCash)}</p>
              </div>

              {/* Total Credit Owed */}
              <div style={{
                borderRadius: 18, padding: '14px 16px',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 15 }}>💳</span>
                  <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(252,165,165,0.7)' }}>Credit Owed</p>
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalCredit)}</p>
              </div>
            </div>
          </motion.div>

          {/* ── Loading skeletons ── */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 88, borderRadius: 20, background: 'rgba(255,255,255,0.05)' }} />
              ))}
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && wallets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '52px 20px', borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 38, marginBottom: 12 }}>👛</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No wallets or cards yet</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Tap + below to add a wallet or credit card</p>
            </div>
          )}

          {/* ── Cash Wallets Section ── */}
          {!loading && cashWallets.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(110,231,183,0.7)',
                marginBottom: 12,
              }}>Wallets</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AnimatePresence initial={false}>
                  {cashWallets.map(w => (
                    <motion.div
                      key={w.id} layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '16px 18px', borderRadius: 20,
                        background: 'rgba(52,211,153,0.07)',
                        border: '1px solid rgba(52,211,153,0.2)',
                      }}
                    >
                      <span style={{ fontSize: 24, flexShrink: 0 }}>👛</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#f5f7ff', marginBottom: 3 }}>{w.label}</p>
                        <p style={{ fontSize: 11, color: 'rgba(110,231,183,0.55)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Wallet</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 17, fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums', marginBottom: 5 }}>
                          {formatINR(w.balance)}
                        </p>
                        <button
                          onClick={() => handleDelete(w.id)}
                          disabled={working === w.id}
                          style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                        >{working === w.id ? '…' : 'delete'}</button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ── Credit Cards Section ── */}
          {!loading && creditCards.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'rgba(252,165,165,0.7)',
                marginBottom: 12,
              }}>Credit Cards</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AnimatePresence initial={false}>
                  {creditCards.map(w => {
                    const pct = usagePercent(w.balance, w.credit_limit)
                    const barColor = pct >= 90 ? '#f87171' : pct >= 70 ? '#fcd34d' : '#a5b4fc'
                    return (
                      <motion.div
                        key={w.id} layout
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          borderRadius: 22, padding: '18px',
                          background: 'rgba(248,113,113,0.07)',
                          border: '1px solid rgba(248,113,113,0.22)',
                        }}
                      >
                        {/* Card header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 22 }}>💳</span>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#f5f7ff' }}>{w.label}</p>
                          </div>
                          <button
                            onClick={() => handleDelete(w.id)}
                            disabled={working === w.id}
                            style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
                          >{working === w.id ? '…' : 'delete'}</button>
                        </div>

                        {/* 3-column data grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                          <div>
                            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Total Limit</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}>
                              {w.credit_limit != null ? formatINR(w.credit_limit) : '—'}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Outstanding</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>
                              {formatINR(w.balance)}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Available</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>
                              {w.credit_limit != null ? formatINR(w.credit_limit - w.balance) : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Usage bar */}
                        {w.credit_limit != null && w.credit_limit > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>Usage</p>
                              <p style={{ fontSize: 10, fontWeight: 700, color: barColor }}>{pct}%</p>
                            </div>
                            <div style={{ height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                style={{ height: '100%', borderRadius: 100, background: barColor }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Billing & Due dates */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div style={{
                            borderRadius: 12, padding: '10px 12px',
                            background: 'rgba(165,180,252,0.07)',
                            border: '1px solid rgba(165,180,252,0.15)',
                          }}>
                            <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.55)', marginBottom: 3 }}>Billing Date</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>
                              {w.billing_date != null ? ordinalSuffix(w.billing_date) : '—'}
                            </p>
                          </div>
                          <div style={{
                            borderRadius: 12, padding: '10px 12px',
                            background: 'rgba(252,211,77,0.07)',
                            border: '1px solid rgba(252,211,77,0.15)',
                          }}>
                            <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(252,211,77,0.55)', marginBottom: 3 }}>Due Date</p>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d' }}>
                              {w.due_date != null ? ordinalSuffix(w.due_date) : '—'}
                            </p>
                          </div>
                        </div>

                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

        </motion.div>
      </div>

      {/* ── FAB: fixed above bottom nav ── */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.04 }}
        onClick={() => setSheetOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom) + 76px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          padding: '14px 36px',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          border: 'none',
          borderRadius: 100,
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 6px 28px rgba(99,102,241,0.5)',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        + Add Wallet / Card
      </motion.button>

      {/* ── Sheet ── */}
      <WalletSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={save} />
    </div>
  )
}
