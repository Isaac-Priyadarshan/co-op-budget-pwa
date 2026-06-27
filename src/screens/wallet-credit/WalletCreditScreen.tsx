import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { WalletSheet } from '../../components/shared/WalletSheet'
import { formatINR } from '../../utils/format'
import type { WalletEntry, NewWallet } from '../../lib/db'

// ─── Wave background SVG ───────────────────────────────────────────────────────
function WalletWaveCanvas() {
  return (
    <svg viewBox="0 0 600 140" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="ww1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(248,113,113,0.22)" /><stop offset="100%" stopColor="rgba(248,113,113,0.04)" /></linearGradient>
        <linearGradient id="ww2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(52,211,153,0.16)" /><stop offset="100%" stopColor="rgba(52,211,153,0.03)" /></linearGradient>
      </defs>
      <path d="M0,88 C80,68 150,112 230,92 C320,68 410,42 600,84 L600,140 L0,140 Z" fill="url(#ww1)" />
      <path d="M0,104 C100,74 180,134 300,108 C410,84 500,58 600,98 L600,140 L0,140 Z" fill="url(#ww2)" />
      <path d="M0,88 C80,68 150,112 230,92 C320,68 410,42 600,84" fill="none" stroke="rgba(248,113,113,0.32)" strokeWidth="1.4" />
    </svg>
  )
}

type SheetMode = { type: 'add-cash' } | { type: 'add-credit' } | { type: 'edit'; item: WalletEntry } | null

export function WalletCreditScreen() {
  const navigate = useNavigate()
  const { wallets, loading, error, save, update, remove, totalCash, totalCredit, totalCreditLimit } = useWallets()

  const [sheet, setSheet] = useState<SheetMode>(null)

  const walletEntries = wallets.filter(w => w.type === 'cash')
  const creditEntries = wallets.filter(w => w.type === 'credit')

  const handleSave   = async (w: NewWallet) => { await save(w) }
  const handleUpdate = async (id: string, w: NewWallet) => { await update(id, w) }
  const handleDelete = async (id: string) => { await remove(id) }

  const SectionHeader = ({ label, accent, onAdd }: { label: string; accent: string; onAdd: () => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <motion.button
        whileTap={{ scale: 0.82 }}
        onClick={onAdd}
        aria-label={`Add ${label}`}
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
          border: '1px solid rgba(251,191,36,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </motion.button>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent }}>{label}</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Sticky Summary Card ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '20px 20px 0',
        background: 'linear-gradient(to bottom, #000000 80%, transparent 100%)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{
          position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: 16,
          background: 'linear-gradient(160deg,#110709 0%,#060b11 58%,#07110c 100%)',
          border: '1px solid rgba(99,102,241,0.24)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.05), 0 8px 40px rgba(0,0,0,0.7), 0 2px 0 rgba(255,255,255,0.04) inset',
          minHeight: 112,
        }}>
          <WalletWaveCanvas />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(248,113,113,0.45),transparent)' }} />
          <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '22px 20px 24px' }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.65)', marginBottom: 6 }}>Credit Owed</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#F87171', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatINR(totalCredit)}</p>
            </div>
            <div style={{ textAlign: 'center', padding: '0 18px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.65)', marginBottom: 6 }}>Total Cash</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#34D399', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 18px rgba(52,211,153,0.25)' }}>{formatINR(totalCash)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.65)', marginBottom: 6 }}>Total Limit</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#A5B4FC', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatINR(totalCreditLimit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px calc(env(safe-area-inset-bottom) + 96px)' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 62, borderRadius: 20, background: 'rgba(255,255,255,0.05)' }} />)}
            </div>
          )}

          {error && <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14, marginBottom: 16, marginTop: 8 }}>{error}</div>}

          {/* ── Wallets Section ── */}
          {!loading && (
            <section style={{ marginBottom: 24, paddingTop: 8 }}>
              <SectionHeader
                label="Wallets"
                accent="rgba(52,211,153,0.8)"
                onAdd={() => setSheet({ type: 'add-cash' })}
              />
              {walletEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px 16px', borderRadius: 16, background: 'rgba(52,211,153,0.04)', border: '1px dashed rgba(52,211,153,0.18)' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No wallets yet — tap + to add one</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <AnimatePresence initial={false}>
                    {walletEntries.map(wallet => (
                      <motion.div
                        key={wallet.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => navigate(`/wallet/${wallet.id}?from=wallet-credit`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                          borderRadius: 18,
                          background: 'rgba(52,211,153,0.08)',
                          border: '1px solid rgba(52,211,153,0.18)',
                          cursor: 'pointer',
                        }}
                      >
                        <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#f5f7ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                          {wallet.label}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
                            {formatINR(wallet.balance)}
                          </p>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}

          {/* ── Credit Cards Section ── */}
          {!loading && (
            <section>
              <SectionHeader
                label="Credit Cards"
                accent="rgba(248,113,113,0.8)"
                onAdd={() => setSheet({ type: 'add-credit' })}
              />
              {creditEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px 16px', borderRadius: 16, background: 'rgba(248,113,113,0.04)', border: '1px dashed rgba(248,113,113,0.18)' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No credit cards yet — tap + to add one</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <AnimatePresence initial={false}>
                    {creditEntries.map(card => (
                      <motion.div
                        key={card.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => navigate(`/wallet/${card.id}?from=wallet-credit`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                          borderRadius: 18,
                          background: 'rgba(248,113,113,0.08)',
                          border: '1px solid rgba(248,113,113,0.18)',
                          cursor: 'pointer',
                        }}
                      >
                        <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#f5f7ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                          {card.label}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#F87171', fontVariantNumeric: 'tabular-nums' }}>
                            {formatINR(card.balance)}
                          </p>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          )}
        </motion.div>
      </div>

      {/* ── Sheets ── */}
      <WalletSheet
        open={sheet?.type === 'add-cash'}
        onClose={() => setSheet(null)}
        onSave={handleSave}
        defaultType="cash"
        mode="add"
      />
      <WalletSheet
        open={sheet?.type === 'add-credit'}
        onClose={() => setSheet(null)}
        onSave={handleSave}
        defaultType="credit"
        mode="add"
      />
      <WalletSheet
        open={sheet?.type === 'edit'}
        onClose={() => setSheet(null)}
        onSave={handleSave}
        mode="edit"
        editItem={sheet?.type === 'edit' ? sheet.item : undefined}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}
