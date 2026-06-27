import { useState } from 'react'
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

// ─── Ordinal helper ────────────────────────────────────────────────────────────
function formatDayOfMonth(day?: number | null) {
  if (!day || day < 1 || day > 31) return '—'
  const s = day % 100
  const l = day % 10
  const suffix = s >= 11 && s <= 13 ? 'th' : l === 1 ? 'st' : l === 2 ? 'nd' : l === 3 ? 'rd' : 'th'
  return `${day}${suffix}`
}

// ─── Jiggle animation ─────────────────────────────────────────────────────────
const JIGGLE = {
  animate: {
    rotate: [-1.4, 1.4, -1.4, 1.4, -1.4],
    transition: { duration: 0.45, repeat: Infinity, ease: 'easeInOut' as const },
  },
  idle: { rotate: 0, transition: { duration: 0.2 } },
}

type SheetMode = { type: 'add-cash' } | { type: 'add-credit' } | { type: 'edit'; item: WalletEntry } | null

export function WalletCreditScreen() {
  const { wallets, loading, error, save, update, remove, totalCash, totalCredit, totalCreditLimit } = useWallets()

  // null = closed, 'add-cash'/'add-credit'/'edit'
  const [sheet, setSheet] = useState<SheetMode>(null)

  // Edit mode per section — drives the jiggle
  const [walletEditMode, setWalletEditMode] = useState(false)
  const [creditEditMode, setCreditEditMode] = useState(false)

  const walletEntries = wallets.filter(w => w.type === 'cash')
  const creditEntries = wallets.filter(w => w.type === 'credit')

  const handleSave = async (w: NewWallet) => { await save(w) }
  const handleUpdate = async (id: string, w: NewWallet) => { await update(id, w) }
  const handleDelete = async (id: string) => { await remove(id) }

  // ─── Section header ──────────────────────────────────────────────────────────
  const SectionHeader = ({
    label, count, accent, editMode, onToggleEdit, onAdd,
  }: {
    label: string; count: number; accent: string
    editMode: boolean; onToggleEdit: () => void; onAdd: () => void
  }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent }}>{label}</p>
        {count > 0 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{count} item{count !== 1 ? 's' : ''}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Edit / Done toggle — only show when there are items */}
        {count > 0 && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onToggleEdit}
            style={{
              padding: '5px 12px',
              borderRadius: 10,
              border: editMode ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.12)',
              background: editMode ? `${accent}22` : 'rgba(255,255,255,0.05)',
              color: editMode ? accent : 'rgba(255,255,255,0.5)',
              fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.14s ease',
            }}
          >
            {editMode ? 'Done' : '✏️ Edit'}
          </motion.button>
        )}
        {/* Add button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onAdd}
          aria-label={`Add ${label}`}
          style={{
            width: 30, height: 30, borderRadius: 10,
            border: `1px solid ${accent}44`,
            background: `${accent}18`,
            color: accent, fontSize: 20, fontWeight: 400, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >+</motion.button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '20px 20px calc(env(safe-area-inset-bottom) + 96px)' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        {/* ── Summary Card ── */}
        <div style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', marginBottom: 24, background: 'linear-gradient(160deg,#110709 0%,#060b11 58%,#07110c 100%)', border: '1px solid rgba(99,102,241,0.24)', boxShadow: '0 0 0 1px rgba(99,102,241,0.05), 0 8px 40px rgba(0,0,0,0.7), 0 2px 0 rgba(255,255,255,0.04) inset', minHeight: 112 }}>
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

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.05)' }} />)}
          </div>
        )}

        {error && <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>{error}</div>}

        {/* ── Wallets Section ── */}
        {!loading && (
          <section style={{ marginBottom: 24 }}>
            <SectionHeader
              label="Wallets" count={walletEntries.length}
              accent="rgba(52,211,153,0.8)"
              editMode={walletEditMode}
              onToggleEdit={() => setWalletEditMode(p => !p)}
              onAdd={() => { setWalletEditMode(false); setSheet({ type: 'add-cash' }) }}
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
                      animate={walletEditMode ? JIGGLE.animate : JIGGLE.idle}
                      onClick={() => { if (walletEditMode) { setSheet({ type: 'edit', item: wallet }) } }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                        borderRadius: 18,
                        background: walletEditMode ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.08)',
                        border: walletEditMode ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(52,211,153,0.18)',
                        cursor: walletEditMode ? 'pointer' : 'default',
                        transition: 'background 0.18s ease, border-color 0.18s ease',
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👛</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wallet.label}</p>
                        <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>Wallet</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{formatINR(wallet.balance)}</p>
                        {walletEditMode && <p style={{ fontSize: 11, color: 'rgba(52,211,153,0.6)', fontWeight: 600 }}>tap to edit</p>}
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
              label="Credit Cards" count={creditEntries.length}
              accent="rgba(248,113,113,0.8)"
              editMode={creditEditMode}
              onToggleEdit={() => setCreditEditMode(p => !p)}
              onAdd={() => { setCreditEditMode(false); setSheet({ type: 'add-credit' }) }}
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
                      animate={creditEditMode ? JIGGLE.animate : JIGGLE.idle}
                      onClick={() => { if (creditEditMode) { setSheet({ type: 'edit', item: card }) } }}
                      style={{
                        borderRadius: 20, padding: '16px',
                        background: creditEditMode ? 'rgba(248,113,113,0.12)' : 'rgba(248,113,113,0.08)',
                        border: creditEditMode ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(248,113,113,0.18)',
                        cursor: creditEditMode ? 'pointer' : 'default',
                        transition: 'background 0.18s ease, border-color 0.18s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 16, flexShrink: 0, background: 'rgba(248,113,113,0.14)', border: '1px solid rgba(248,113,113,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💳</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#f5f7ff', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.label}</p>
                              <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.34)' }}>Credit Card</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ fontSize: 16, fontWeight: 800, color: '#F87171', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{formatINR(card.balance)}</p>
                              {creditEditMode && <p style={{ fontSize: 11, color: 'rgba(248,113,113,0.6)', fontWeight: 600 }}>tap to edit</p>}
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
        onClose={() => { setSheet(null); setWalletEditMode(false); setCreditEditMode(false) }}
        onSave={handleSave}
        mode="edit"
        editItem={sheet?.type === 'edit' ? sheet.item : null}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}
