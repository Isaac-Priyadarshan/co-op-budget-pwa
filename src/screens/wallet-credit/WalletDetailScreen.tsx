import { useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { useTransactions } from '../../hooks/useTransactions'
import { WalletSheet } from '../../components/shared/WalletSheet'
import { formatINR } from '../../utils/format'
import type { WalletEntry, NewWallet, Transaction } from '../../lib/db'

// ─── Ordinal helper ────────────────────────────────────────────────────────────
function ordinal(day?: number | null) {
  if (!day || day < 1 || day > 31) return '—'
  const s = day % 100
  const l = day % 10
  const suffix = s >= 11 && s <= 13 ? 'th' : l === 1 ? 'st' : l === 2 ? 'nd' : l === 3 ? 'rd' : 'th'
  return `${day}${suffix}`
}

// ─── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      flex: '1 1 calc(50% - 6px)',
      minWidth: 0,
      padding: '14px 14px 12px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontSize: 15, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

// ─── Transaction Row ───────────────────────────────────────────────────────────
// Handles all 3 types: income, expense, transfer
function TxRow({ tx }: { tx: Transaction }) {
  const d = new Date(tx.created_at)
  const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const isTransfer = tx.type === 'transfer'
  const isExpense  = tx.type === 'expense'

  // Determine visual direction of transfer from the description prefix
  const isTransferOut = isTransfer && tx.description.startsWith('Transfer →')

  // Color scheme per type
  const dotColor   = isTransfer ? '#818CF8' : isExpense ? '#F87171' : '#34D399'
  const dotGlow    = isTransfer ? 'rgba(129,140,248,0.5)' : isExpense ? 'rgba(248,113,113,0.5)' : 'rgba(52,211,153,0.5)'
  const rowBg      = isTransfer ? 'rgba(99,102,241,0.05)' : isExpense ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)'
  const rowBorder  = isTransfer ? 'rgba(99,102,241,0.14)' : isExpense ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)'
  const amountColor = isTransfer
    ? (isTransferOut ? '#F87171' : '#34D399')
    : isExpense ? '#F87171' : '#34D399'
  const amountPrefix = isTransfer
    ? (isTransferOut ? '−' : '+')
    : isExpense ? '−' : '+'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
        borderRadius: 16,
        background: rowBg,
        border: `1px solid ${rowBorder}`,
      }}
    >
      {/* Indicator dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: dotColor,
        boxShadow: `0 0 6px ${dotGlow}`,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {/* Transfer badge */}
          {isTransfer && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#818CF8',
              background: 'rgba(99,102,241,0.16)',
              border: '1px solid rgba(99,102,241,0.28)',
              borderRadius: 99, padding: '1px 6px',
              flexShrink: 0,
            }}>
              {isTransferOut ? 'OUT' : 'IN'}
            </span>
          )}
          <p style={{
            fontSize: 13, fontWeight: 600, color: '#f5f7ff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {tx.description || tx.category}
          </p>
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
          {isTransfer ? 'Transfer' : tx.category}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 800,
          color: amountColor,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {amountPrefix}{formatINR(tx.amount)}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{dateStr}</p>
      </div>
    </motion.div>
  )
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export function WalletDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { wallets, update, remove } = useWallets()
  const { transactions, loading: txLoading } = useTransactions()
  const [editOpen, setEditOpen] = useState(false)

  const fromScreen = new URLSearchParams(location.search).get('from') ?? 'home'

  const handleBack = () => {
    navigate(`/?screen=${fromScreen}`, { replace: true })
  }

  const wallet = wallets.find(w => w.id === id) as WalletEntry | undefined

  // All transactions for this wallet (income + expense + transfer)
  const walletTxs = useMemo(
    () => transactions
      .filter(t => t.wallet_id === id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [transactions, id]
  )

  const now = new Date()
  const monthTxs = useMemo(
    () => walletTxs.filter(t => {
      const d = new Date(t.created_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }),
    [walletTxs]
  )

  // Stats exclude transfer rows from income/expense totals
  const monthSpent    = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthReceived = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthCount    = monthTxs.length

  const isCredit     = wallet?.type === 'credit'
  const available    = isCredit ? Math.max(0, (wallet?.credit_limit ?? 0) - (wallet?.balance ?? 0)) : 0
  const accentColor  = isCredit ? '#F87171' : '#34D399'
  const accentGlow   = isCredit ? 'rgba(248,113,113,0.28)' : 'rgba(52,211,153,0.28)'
  const accentBorder = isCredit ? 'rgba(248,113,113,0.22)' : 'rgba(52,211,153,0.22)'
  const accentBg     = isCredit ? 'rgba(248,113,113,0.07)' : 'rgba(52,211,153,0.07)'

  const handleUpdate = async (wid: string, w: NewWallet) => { await update(wid, w); setEditOpen(false) }
  const handleDelete = async (wid: string) => { await remove(wid); handleBack() }

  if (!wallet) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 12px' }}>
          <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </motion.button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f5f7ff' }}>Loading…</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 20px' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 62, borderRadius: 18, background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: '#000000', overflow: 'hidden',
    }}>

      {/* ── Sticky top area ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(to bottom, #000000 85%, transparent 100%)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        padding: '20px 20px 0',
        paddingTop: 'max(20px, env(safe-area-inset-top))',
      }}>

        {/* Back + Title + Edit row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </motion.button>

          <span style={{ fontSize: 16, fontWeight: 700, color: '#f5f7ff', flex: 1, textAlign: 'center', padding: '0 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {wallet.label}
          </span>

          <motion.button whileTap={{ scale: 0.88 }} onClick={() => setEditOpen(true)}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))',
              border: '1px solid rgba(251,191,36,0.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </motion.button>
        </div>

        {/* ── Hero Summary Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{
            borderRadius: 22, marginBottom: 16,
            background: accentBg,
            border: `1px solid ${accentBorder}`,
            boxShadow: `0 0 0 1px ${accentBorder}, 0 8px 40px rgba(0,0,0,0.6)`,
            padding: '22px 20px 20px',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 130, height: 130, borderRadius: '50%',
            background: accentGlow, filter: 'blur(40px)', pointerEvents: 'none',
          }} />

          <div style={{ marginBottom: 10 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: accentColor, background: `${accentColor}18`,
              border: `1px solid ${accentColor}30`, borderRadius: 99, padding: '3px 10px',
            }}>
              {isCredit ? 'Credit Card' : 'Wallet'}
            </span>
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>
            {isCredit ? 'Outstanding Balance' : 'Current Balance'}
          </p>
          <p style={{
            fontSize: 34, fontWeight: 900, color: accentColor,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 16,
            textShadow: `0 0 24px ${accentGlow}`,
          }}>
            {formatINR(wallet.balance)}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {isCredit ? (
              <>
                <StatPill label="Credit Limit"     value={formatINR(wallet.credit_limit ?? 0)} accent="#A5B4FC" />
                <StatPill label="Available"        value={formatINR(available)}                accent="#34D399" />
                <StatPill label="Spent This Month" value={formatINR(monthSpent)}              accent="#F87171" />
                <StatPill label="Txns This Month"  value={String(monthCount)}                 accent="rgba(255,255,255,0.65)" />
                <StatPill label="Billing Date"     value={ordinal(wallet.billing_date)}       accent="#FBBF24" />
                <StatPill label="Due Date"         value={ordinal(wallet.due_date)}           accent="#FB923C" />
              </>
            ) : (
              <>
                <StatPill label="Spent This Month"    value={formatINR(monthSpent)}    accent="#F87171" />
                <StatPill label="Received This Month" value={formatINR(monthReceived)} accent="#34D399" />
                <StatPill label="Txns This Month"     value={String(monthCount)}       accent="rgba(255,255,255,0.65)" />
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Scrollable transaction list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px calc(env(safe-area-inset-bottom) + 32px)' }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.32)', marginBottom: 12,
        }}>
          All Transactions
        </p>

        {txLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 62, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        )}

        {!txLoading && walletTxs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center', padding: '40px 20px',
              borderRadius: 18, background: 'rgba(255,255,255,0.03)',
              border: `1px dashed ${accentBorder}`,
            }}
          >
            <p style={{ fontSize: 28, marginBottom: 12 }}>{isCredit ? '💳' : '👛'}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>No transactions yet</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Transactions using this {isCredit ? 'card' : 'wallet'} will appear here</p>
          </motion.div>
        )}

        {!txLoading && walletTxs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence initial={false}>
              {walletTxs.map(tx => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Edit Sheet ── */}
      <WalletSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={async () => {}}
        mode="edit"
        editItem={wallet}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  )
}
