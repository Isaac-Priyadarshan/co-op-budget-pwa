import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { WalletSheet } from '../../components/shared/WalletSheet'
import { formatINR } from '../../utils/format'

function WalletWaveCanvas() {
  return (
    <svg
      viewBox="0 0 600 140"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="wallet-wave-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(248,113,113,0.22)" />
          <stop offset="100%" stopColor="rgba(248,113,113,0.04)" />
        </linearGradient>
        <linearGradient id="wallet-wave-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(52,211,153,0.16)" />
          <stop offset="100%" stopColor="rgba(52,211,153,0.03)" />
        </linearGradient>
      </defs>
      <path d="M0,88 C80,68 150,112 230,92 C320,68 410,42 600,84 L600,140 L0,140 Z" fill="url(#wallet-wave-1)" />
      <path d="M0,104 C100,74 180,134 300,108 C410,84 500,58 600,98 L600,140 L0,140 Z" fill="url(#wallet-wave-2)" />
      <path d="M0,88 C80,68 150,112 230,92 C320,68 410,42 600,84" fill="none" stroke="rgba(248,113,113,0.32)" strokeWidth="1.4" />
    </svg>
  )
}

function formatDayOfMonth(day?: number | null) {
  if (!day || day < 1 || day > 31) return '—'
  const lastDigit = day % 10
  const lastTwo = day % 100
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : lastDigit === 1 ? 'st' : lastDigit === 2 ? 'nd' : lastDigit === 3 ? 'rd' : 'th'
  return `${day}${suffix}`
}

// null = closed, 'cash' = wallet sheet open, 'credit' = credit sheet open
type SheetType = 'cash' | 'credit' | null

export function WalletCreditScreen() {
  const { wallets, loading, error, save, remove, totalCash, totalCredit, totalCreditLimit } = useWallets()
  const [sheetType, setSheetType] = useState<SheetType>(null)
  const [working, setWorking] = useState<string | null>(null)

  const walletEntries = wallets.filter((w) => w.type === 'cash')
  const creditEntries = wallets.filter((w) => w.type === 'credit')

  const handleDelete = async (id: string) => {
    setWorking(id)
    try { await remove(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }

  // Shared section header style
  const sectionHeader = (label: string, count: number, accentColor: string, onAdd: () => void) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accentColor }}>
          {label}
        </p>
        {count > 0 && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>
            {count} item{count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onAdd}
        aria-label={`Add ${label}`}
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          border: `1px solid ${accentColor}44`,
          background: `${accentColor}18`,
          color: accentColor,
          fontSize: 20,
          fontWeight: 400,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        +
      </motion.button>
    </div>
  )

  return (
    <div style={{ padding: '20px 20px calc(env(safe-area-inset-bottom) + 96px)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── Summary Card ── */}
        <div
          style={{
            position: 'relative',
            borderRadius: 22,
            overflow: 'hidden',
            marginBottom: 24,
            background: 'linear-gradient(160deg,#110709 0%,#060b11 58%,#07110c 100%)',
            border: '1px solid rgba(99,102,241,0.24)',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.05), 0 8px 40px rgba(0,0,0,0.7), 0 2px 0 rgba(255,255,255,0.04) inset',
            minHeight: 112,
          }}
        >
          <WalletWaveCanvas />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(248,113,113,0.45),transparent)' }} />
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              padding: '22px 20px 24px',
            }}
          >
            {/* LEFT — Credit Owed */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.65)', marginBottom: 6 }}>
                Credit Owed
              </p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#F87171', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {formatINR(totalCredit)}
              </p>
            </div>

            {/* CENTER — Total Cash */}
            <div style={{ textAlign: 'center', padding: '0 18px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.65)', marginBottom: 6 }}>
                Total Cash
              </p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#34D399', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 18px rgba(52,211,153,0.25)' }}>
                {formatINR(totalCash)}
              </p>
            </div>

            {/* RIGHT — Total Limit */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.65)', marginBottom: 6 }}>
                Total Limit
              </p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#A5B4FC', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {formatINR(totalCreditLimit)}
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ── Wallets Section — always visible ── */}
        {!loading && (
          <section style={{ marginBottom: 24 }}>
            {sectionHeader('Wallets', walletEntries.length, 'rgba(52,211,153,0.8)', () => setSheetType('cash'))}

            {walletEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '22px 16px', borderRadius: 16, background: 'rgba(52,211,153,0.04)', border: '1px dashed rgba(52,211,153,0.18)' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No wallets yet — tap + to add one</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AnimatePresence initial={false}>
                  {walletEntries.map((wallet) => (
                    <motion.div
                      key={wallet.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '16px',
                        borderRadius: 18,
                        background: 'rgba(52,211,153,0.08)',
                        border: '1px solid rgba(52,211,153,0.18)',
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        👛
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {wallet.label}
                        </p>
                        <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>
                          Wallet
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
                          {formatINR(wallet.balance)}
                        </p>
                        <button
                          onClick={() => handleDelete(wallet.id)}
                          disabled={working === wallet.id}
                          style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                        >
                          {working === wallet.id ? '…' : 'delete'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        )}

        {/* ── Credit Cards Section — always visible ── */}
        {!loading && (
          <section>
            {sectionHeader('Credit Cards', creditEntries.length, 'rgba(248,113,113,0.8)', () => setSheetType('credit'))}

            {creditEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '22px 16px', borderRadius: 16, background: 'rgba(248,113,113,0.04)', border: '1px dashed rgba(248,113,113,0.18)' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No credit cards yet — tap + to add one</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AnimatePresence initial={false}>
                  {creditEntries.map((card) => (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        borderRadius: 20,
                        padding: '16px',
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.18)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 16, flexShrink: 0, background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                          💳
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {card.label}
                              </p>
                              <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>
                                Credit Card
                              </p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ fontSize: 16, fontWeight: 800, color: '#F87171', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
                                {formatINR(card.balance)}
                              </p>
                              <button
                                onClick={() => handleDelete(card.id)}
                                disabled={working === card.id}
                                style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                              >
                                {working === card.id ? '…' : 'delete'}
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ padding: '12px 12px 10px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 6 }}>Total Limit</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#A5B4FC', fontVariantNumeric: 'tabular-nums' }}>{formatINR(card.credit_limit ?? 0)}</p>
                            </div>
                            <div style={{ padding: '12px 12px 10px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 6 }}>Outstanding</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#FCA5A5', fontVariantNumeric: 'tabular-nums' }}>{formatINR(card.balance)}</p>
                            </div>
                            <div style={{ padding: '12px 12px 10px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 6 }}>Billing Date</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums' }}>{formatDayOfMonth(card.billing_date)}</p>
                            </div>
                            <div style={{ padding: '12px 12px 10px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 6 }}>Due Date</p>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums' }}>{formatDayOfMonth(card.due_date)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        )}
      </motion.div>

      <WalletSheet
        open={sheetType !== null}
        onClose={() => setSheetType(null)}
        onSave={save}
        defaultType={sheetType ?? 'cash'}
      />
    </div>
  )
}
