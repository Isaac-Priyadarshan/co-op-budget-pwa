import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { AddTransactionSheet } from '../../components/shared/AddTransactionSheet'
import { formatINR, formatShortDate } from '../../utils/format'

const CATEGORY_EMOJI: Record<string, string> = {
  Salary: '💼', Freelance: '🖥️', Business: '🏪', Investment: '📈', Gift: '🎁', 'Other Income': '💰',
  Food: '🍔', Transport: '🚗', Rent: '🏠', Utilities: '⚡', Shopping: '🛍️',
  Health: '🏥', Entertainment: '🎬', Education: '📚', EMI: '🏦', Other: '📌',
}

export function LedgerScreen() {
  const { transactions, loading, error, addTransaction, removeTransaction, totalIncome, totalExpenses, balance } = useTransactions()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try { await removeTransaction(id) }
    catch (e) { console.error(e) }
    finally { setDeleting(null) }
  }

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 4 }}>All Transactions</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Ledger</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setSheetOpen(true)}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: 14,
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
            }}
          >
            + Add
          </motion.button>
        </div>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Balance', value: balance, color: balance >= 0 ? '#a5b4fc' : '#fca5a5', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)' },
            { label: 'Income', value: totalIncome, color: '#6ee7b7', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
            { label: 'Spent', value: totalExpenses, color: '#fca5a5', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 16, padding: '14px 12px', background: s.bg, border: `1px solid ${s.border}` }}>
              <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{s.label}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {formatINR(Math.abs(s.value))}
              </p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['all', 'income', 'expense'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: 100,
                border: filter === f ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                background: filter === f ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                color: filter === f ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                fontSize: 13, fontWeight: filter === f ? 600 : 400,
                cursor: 'pointer', textTransform: 'capitalize',
                transition: 'all 0.14s ease',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 72, borderRadius: 18, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '16px', borderRadius: 16, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p style={{ fontSize: 36, marginBottom: 12 }}>📒</p>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No transactions yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Tap + Add to record your first one</p>
          </motion.div>
        )}

        {/* Transaction list */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence initial={false}>
              {filtered.map((tx) => (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: tx.type === 'income' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.12)',
                    border: tx.type === 'income' ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(248,113,113,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {CATEGORY_EMOJI[tx.category] ?? '💳'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#f5f7ff', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tx.description}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      {tx.category} · {tx.created_by} · {formatShortDate(tx.created_at)}
                    </p>
                  </div>

                  {/* Amount + delete */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{
                      fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      color: tx.type === 'income' ? '#6ee7b7' : '#fca5a5',
                      marginBottom: 4,
                    }}>
                      {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                    </p>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={deleting === tx.id}
                      style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.25)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      {deleting === tx.id ? '…' : 'delete'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={addTransaction} />
    </div>
  )
}
