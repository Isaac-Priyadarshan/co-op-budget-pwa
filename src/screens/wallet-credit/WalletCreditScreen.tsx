import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { useDefaultWallets } from '../../hooks/useDefaultWallets'
import { WalletSheet } from '../../components/shared/WalletSheet'
import { TransferSheet } from '../../components/shared/TransferSheet'
import { DefaultWalletSheet } from '../../components/shared/DefaultWalletSheet'
import { formatINR } from '../../utils/format'
import type { WalletEntry, NewWallet } from '../../lib/db'

// ─── Wave background SVG ───────────────────────────────────────────────────────
function WalletWaveCanvas() {
  return (
    <svg viewBox="0 0 600 140" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="ww1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(248,113,113,0.22)" />
          <stop offset="100%" stopColor="rgba(248,113,113,0.04)" />
        </linearGradient>
        <linearGradient id="ww2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(52,211,153,0.16)" />
          <stop offset="100%" stopColor="rgba(52,211,153,0.03)" />
        </linearGradient>
      </defs>
      <path d="M0,88 C80,68 150,112 230,92 C320,68 410,42 600,84 L600,140 L0,140 Z" fill="url(#ww1)" />
      <path d="M0,104 C100,74 180,134 300,108 C410,84 500,58 600,98 L600,140 L0,140 Z" fill="url(#ww2)" />
      <path d="M0,88 C80,68 150,112 230,92 C320,68 410,42 600,84" fill="none" stroke="rgba(248,113,113,0.32)" strokeWidth="1.4" />
    </svg>
  )
}

// ─── Drag handle icon ─────────────────────────────────────────────────────────
function DragHandleIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      {[0, 4, 8].map(y =>
        [1, 5].map(x => (
          <circle key={`${x}-${y}`} cx={x} cy={y + 2} r="1.2" fill={color} />
        ))
      )}
    </svg>
  )
}

// ─── Single reorderable wallet row ───────────────────────────────────────────
function WalletRow({
  item,
  accentColor,
  onTap,
}: {
  item: WalletEntry
  accentColor: string
  onTap: () => void
}) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      style={{ listStyle: 'none' }}
      whileDrag={{
        scale: 1.03,
        boxShadow: `0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px ${accentColor}55`,
        zIndex: 50,
      }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '15px 16px 15px 12px',
          borderRadius: 18,
          background: `${accentColor}14`,
          border: `1px solid ${accentColor}2e`,
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Drag handle */}
        <div
          onPointerDown={e => { e.stopPropagation(); controls.start(e) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${accentColor}12`,
            border: `1px solid ${accentColor}22`,
            cursor: 'grab',
            flexShrink: 0,
            touchAction: 'none',
          }}
          aria-label="Drag to reorder"
        >
          <DragHandleIcon color={accentColor} />
        </div>

        {/* Tappable content */}
        <div
          onClick={onTap}
          style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 8, minWidth: 0 }}
        >
          <p style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 700,
            color: '#f5f7ff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}>
            {item.label}
          </p>
          <p style={{
            fontSize: 16,
            fontWeight: 800,
            color: accentColor,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}>
            {formatINR(item.balance)}
          </p>
        </div>
      </div>
    </Reorder.Item>
  )
}

type SheetMode = { type: 'add-cash' } | { type: 'add-credit' } | { type: 'edit'; item: WalletEntry } | null

export function WalletCreditScreen() {
  const navigate = useNavigate()
  const {
    wallets, loading, error,
    save, update, remove, reorder,
    totalCash, totalCredit, totalCreditLimit,
  } = useWallets()

  const {
    defaults, cashWallets, saving: defaultSaving,
    error: defaultError, save: saveDefaults,
  } = useDefaultWallets(wallets)

  const [sheet, setSheet]               = useState<SheetMode>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [defaultOpen, setDefaultOpen]   = useState(false)

  const walletEntries = wallets.filter(w => w.type === 'cash')
  const creditEntries = wallets.filter(w => w.type === 'credit')

  const handleSave   = async (w: NewWallet) => { await save(w) }
  const handleUpdate = async (id: string, w: NewWallet) => { await update(id, w) }
  const handleDelete = async (id: string) => { await remove(id) }

  const handleSaveDefaults = async (next: { Isaac: string | null; Jenifa: string | null }) => {
    const ok = await saveDefaults(next)
    if (ok) setDefaultOpen(false)
  }

  // ── Wallets section header ──
  const WalletsSectionHeader = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {/* + Add wallet */}
      <motion.button
        whileTap={{ scale: 0.82 }}
        onClick={() => setSheet({ type: 'add-cash' })}
        aria-label="Add Wallet"
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
          border: '1px solid rgba(251,191,36,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </motion.button>

      {/* Section label */}
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.8)' }}>Wallets</p>

      {/* Transfer button */}
      <motion.button
        whileTap={{ scale: 0.82 }}
        onClick={() => setTransferOpen(true)}
        aria-label="Transfer funds"
        style={{
          height: 24, paddingInline: 10, borderRadius: 99,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
          border: '1px solid rgba(99,102,241,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#818CF8' }}>Transfer</span>
      </motion.button>

      {/* Default button — NEW */}
      <motion.button
        whileTap={{ scale: 0.82 }}
        onClick={() => setDefaultOpen(true)}
        aria-label="Set default wallet"
        style={{
          height: 24, paddingInline: 10, borderRadius: 99,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
          border: '1px solid rgba(251,191,36,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#FBBF24' }}>Default</span>
      </motion.button>
    </div>
  )

  // ── Credit cards section header ──
  const CreditSectionHeader = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <motion.button
        whileTap={{ scale: 0.82 }}
        onClick={() => setSheet({ type: 'add-credit' })}
        aria-label="Add Credit Card"
        style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
          border: '1px solid rgba(251,191,36,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </motion.button>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.8)' }}>Credit Cards</p>
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

          {error && (
            <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14, marginBottom: 16, marginTop: 8 }}>
              {error}
            </div>
          )}

          {/* ── Wallets Section ── */}
          {!loading && (
            <section style={{ marginBottom: 24, paddingTop: 8 }}>
              <WalletsSectionHeader />
              {walletEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px 16px', borderRadius: 16, background: 'rgba(52,211,153,0.04)', border: '1px dashed rgba(52,211,153,0.18)' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No wallets yet — tap + to add one</p>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={walletEntries}
                  onReorder={(newOrder: WalletEntry[]) => reorder(newOrder)}
                  style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <AnimatePresence initial={false}>
                    {walletEntries.map(wallet => (
                      <WalletRow
                        key={wallet.id}
                        item={wallet}
                        accentColor="#34D399"
                        onTap={() => navigate(`/wallet/${wallet.id}?from=wallet-credit`)}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              )}
            </section>
          )}

          {/* ── Credit Cards Section ── */}
          {!loading && (
            <section>
              <CreditSectionHeader />
              {creditEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px 16px', borderRadius: 16, background: 'rgba(248,113,113,0.04)', border: '1px dashed rgba(248,113,113,0.18)' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No credit cards yet — tap + to add one</p>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={creditEntries}
                  onReorder={(newOrder: WalletEntry[]) => reorder(newOrder)}
                  style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <AnimatePresence initial={false}>
                    {creditEntries.map(card => (
                      <WalletRow
                        key={card.id}
                        item={card}
                        accentColor="#F87171"
                        onTap={() => navigate(`/wallet/${card.id}?from=wallet-credit`)}
                      />
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              )}
            </section>
          )}
        </motion.div>
      </div>

      {/* ── Wallet Sheet ── */}
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

      {/* ── Transfer Sheet ── */}
      <TransferSheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
      />

      {/* ── Default Wallet Sheet ── */}
      <DefaultWalletSheet
        open={defaultOpen}
        onClose={() => setDefaultOpen(false)}
        defaults={defaults}
        cashWallets={cashWallets}
        saving={defaultSaving}
        error={defaultError}
        onSave={handleSaveDefaults}
      />
    </div>
  )
}
