import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import { formatINR } from '../../utils/format'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatTxDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

// Returns YYYY-MM-DD string for a Date
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

type TxList = ReturnType<typeof useTransactions>['transactions']

function groupByDate(txs: TxList) {
  const groups: Record<string, TxList> = {}
  for (const tx of txs) {
    const key = new Date(tx.created_at).toDateString()
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
}

// Default range: first day of current month → today
function defaultStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function defaultEnd(): string {
  return toDateStr(new Date())
}

export function LedgerScreen() {
  const [startDate, setStartDate] = useState(defaultStart())
  const [endDate, setEndDate]     = useState(defaultEnd())
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [userFilter, setUserFilter] = useState<'all' | 'Isaac' | 'Jenifa'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId]   = useState<string | null>(null)

  const { transactions, loading, error, removeTransaction } = useTransactions()
  const { expenseCategories, incomeCategories } = useCategories()

  const catLookup = useMemo(() => {
    const map: Record<string, { icon: string; accent: string; bg: string; glow: string }> = {}
    for (const c of [...expenseCategories, ...incomeCategories]) {
      map[c.label.toLowerCase()] = { icon: c.icon, accent: c.accent, bg: c.bg, glow: c.glow }
    }
    return map
  }, [expenseCategories, incomeCategories])

  const getCatMeta = (category: string) => {
    const key = (category ?? '').toLowerCase()
    if (catLookup[key]) return catLookup[key]
    const partial = Object.keys(catLookup).find(k => key.includes(k) || k.includes(key))
    if (partial) return catLookup[partial]
    return { icon: '💳', accent: '#A78BFA', bg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.18)' }
  }

  // Date-range scoped transactions (inclusive on both ends)
  const rangeTxs = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00')
    const end   = new Date(endDate   + 'T23:59:59')
    return transactions.filter(tx => {
      const d = new Date(tx.created_at)
      return d >= start && d <= end
    })
  }, [transactions, startDate, endDate])

  // Apply type + user filters on top of date range
  const filtered = useMemo(() => rangeTxs
    .filter(tx => typeFilter === 'all' || tx.type === typeFilter)
    .filter(tx => userFilter === 'all' || (tx.created_by ?? '').toLowerCase() === userFilter.toLowerCase()),
  [rangeTxs, typeFilter, userFilter])

  // Range-scoped totals (always from full rangeTxs, not filtered)
  const rangeIncome  = useMemo(() => rangeTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [rangeTxs])
  const rangeExpense = useMemo(() => rangeTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [rangeTxs])
  const rangeBalance = rangeIncome - rangeExpense

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try { await removeTransaction(id) }
    catch (e) { console.error(e) }
    finally { setDeletingId(null); setConfirmId(null) }
  }

  // Shared style for native date inputs
  const dateInputStyle: React.CSSProperties = {
    flex: 1,
    height: 38,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(251,191,36,0.22)',
    color: '#F5F5F5',
    fontSize: 12,
    fontWeight: 600,
    padding: '0 10px',
    cursor: 'pointer',
    outline: 'none',
    WebkitAppearance: 'none',
    colorScheme: 'dark',
  }

  return (
    <div style={{ minHeight: '100%', padding: '20px 20px 32px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>

        {/* ── Header: just title ── */}
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Ledger</h1>
        </div>

        {/* ── Filter row: type pills + user pills + date range ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>

          {/* Row 1: type pills | divider | user pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            {(['all', 'income', 'expense'] as const).map(f => (
              <motion.button key={f} whileTap={{ scale: 0.93 }} onClick={() => setTypeFilter(f)}
                style={{
                  padding: '6px 13px', borderRadius: 100,
                  border: typeFilter === f ? '1px solid rgba(251,191,36,0.50)' : '1px solid rgba(255,255,255,0.09)',
                  background: typeFilter === f ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                  color: typeFilter === f ? '#FBBF24' : 'rgba(255,255,255,0.42)',
                  fontSize: 12, fontWeight: typeFilter === f ? 700 : 400,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >{f}</motion.button>
            ))}

            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />

            {(['all', 'Isaac', 'Jenifa'] as const).map(u => (
              <motion.button key={u} whileTap={{ scale: 0.93 }} onClick={() => setUserFilter(u)}
                style={{
                  padding: '6px 13px', borderRadius: 100,
                  border: userFilter === u ? '1px solid rgba(94,234,212,0.50)' : '1px solid rgba(255,255,255,0.09)',
                  background: userFilter === u ? 'rgba(94,234,212,0.12)' : 'rgba(255,255,255,0.04)',
                  color: userFilter === u ? '#5EEAD4' : 'rgba(255,255,255,0.42)',
                  fontSize: 12, fontWeight: userFilter === u ? 700 : 400,
                  cursor: 'pointer',
                }}
              >{u === 'all' ? 'Both' : u}</motion.button>
            ))}
          </div>

          {/* Row 2: date range pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
              style={dateInputStyle}
            />
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>→</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              style={dateInputStyle}
            />
          </div>
        </div>

        {/* ── Single Summary Card ── */}
        <div style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg,rgba(251,191,36,0.07),rgba(217,119,6,0.05))',
          border: '1px solid rgba(251,191,36,0.18)',
          padding: '16px 18px',
          marginBottom: 18,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 12,
        }}>
          {/* Left: Spent */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.65)', marginBottom: 4 }}>Spent</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#F87171', fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(rangeExpense)}
            </p>
          </div>

          {/* Center: Balance */}
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)', padding: '0 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Balance</p>
            <p style={{
              fontSize: 18, fontWeight: 900,
              color: rangeBalance >= 0 ? '#34D399' : '#F87171',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {rangeBalance < 0 ? '-' : ''}{formatINR(Math.abs(rangeBalance))}
            </p>
          </div>

          {/* Right: Income */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.65)', marginBottom: 4 }}>Income</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#34D399', fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(rangeIncome)}
            </p>
          </div>
        </div>

        {/* ── Count badge ── */}
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 14, fontWeight: 500 }}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* ── Loading skeletons ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ height: 70, borderRadius: 18, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#FCA5A5', fontSize: 13 }}>{error}</div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', padding: '52px 24px', borderRadius: 24, background: 'rgba(251,191,36,0.03)', border: '1px solid rgba(251,191,36,0.10)' }}
          >
            <p style={{ fontSize: 40, marginBottom: 14 }}>📒</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(245,245,245,0.55)', marginBottom: 6 }}>No transactions</p>
            <p style={{ fontSize: 12, color: 'rgba(245,245,245,0.28)' }}>{startDate} → {endDate}</p>
            <p style={{ fontSize: 12, color: 'rgba(245,245,245,0.22)', marginTop: 4 }}>Tap a category on Home to add one</p>
          </motion.div>
        )}

        {/* ── Grouped transaction list ── */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <AnimatePresence initial={false}>
              {grouped.map(([dateKey, txs]) => (
                <motion.div key={dateKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* Date group header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {formatTxDate(txs[0].created_at)}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(251,191,36,0.10)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.28)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const net = txs.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
                        return (net >= 0 ? '+' : '') + formatINR(net)
                      })()}
                    </span>
                  </div>

                  {/* Transaction rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <AnimatePresence initial={false}>
                      {txs.map(tx => {
                        const meta        = getCatMeta(tx.category ?? '')
                        const isConfirming = confirmId  === tx.id
                        const isDeleting   = deletingId === tx.id
                        const userInitial  = (tx.created_by ?? 'U')[0].toUpperCase()
                        const userColor    = (tx.created_by ?? '').toLowerCase() === 'jenifa' ? '#F9A8D4' : '#5EEAD4'
                        const userBg       = (tx.created_by ?? '').toLowerCase() === 'jenifa' ? 'rgba(249,168,212,0.12)' : 'rgba(94,234,212,0.12)'
                        const hasNote      = tx.description && tx.description.toLowerCase().trim() !== (tx.category ?? '').toLowerCase().trim()

                        return (
                          <motion.div key={tx.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -48, scale: 0.94 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              borderRadius: 18,
                              background: isConfirming ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${isConfirming ? 'rgba(248,113,113,0.30)' : 'rgba(255,255,255,0.07)'}`,
                              overflow: 'hidden',
                              transition: 'background 0.2s, border 0.2s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>

                              {/* Category icon */}
                              <div style={{
                                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                                background: meta.bg,
                                border: `1px solid ${meta.accent}30`,
                                boxShadow: `0 2px 8px ${meta.glow}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 20,
                              }}>
                                {meta.icon}
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: meta.accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: hasNote ? 3 : 0 }}>
                                  {tx.category}
                                </p>
                                {hasNote && (
                                  <p style={{ fontSize: 11, color: 'rgba(245,245,245,0.42)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {tx.description}
                                  </p>
                                )}
                              </div>

                              {/* Right side */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                                <p style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: tx.type === 'income' ? '#34D399' : '#F87171' }}>
                                  {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: userBg, border: `1px solid ${userColor}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 700, color: userColor,
                                  }}>{userInitial}</div>
                                  <motion.button whileTap={{ scale: 0.82 }}
                                    onClick={() => setConfirmId(prev => prev === tx.id ? null : tx.id)}
                                    style={{
                                      width: 22, height: 22, borderRadius: '50%',
                                      background: isConfirming ? 'rgba(248,113,113,0.20)' : 'rgba(255,255,255,0.06)',
                                      border: isConfirming ? '1px solid rgba(248,113,113,0.40)' : '1px solid rgba(255,255,255,0.10)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      cursor: 'pointer', fontSize: 11,
                                    }}
                                  >🗑️</motion.button>
                                </div>
                              </div>
                            </div>

                            {/* Confirm delete */}
                            <AnimatePresence initial={false}>
                              {isConfirming && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.20, ease: [0.16, 1, 0.3, 1] }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div style={{ display: 'flex', gap: 8, padding: '0 14px 12px' }}>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmId(null)}
                                      style={{ flex: 1, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                    >Cancel</motion.button>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => void handleDelete(tx.id)} disabled={isDeleting}
                                      style={{ flex: 2, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,rgba(239,68,68,0.80),rgba(220,38,38,0.90))', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                                    >{isDeleting ? 'Deleting…' : 'Yes, Delete'}</motion.button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  )
}
