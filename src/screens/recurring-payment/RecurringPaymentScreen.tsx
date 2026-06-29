import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecurring } from '../../hooks/useRecurring'
import type { RecurringEntry, NewRecurring } from '../../lib/db'
import { RecurringSheet } from '../../components/shared/RecurringSheet'
import { ConfirmSheet } from '../../components/shared/ConfirmSheet'
import { formatINR } from '../../utils/format'

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
}

const FREQ_COLOR: Record<string, { bg: string; text: string }> = {
  daily:   { bg: 'rgba(96,165,250,0.15)',  text: '#93c5fd' },
  weekly:  { bg: 'rgba(167,139,250,0.15)', text: '#c4b5fd' },
  monthly: { bg: 'rgba(251,191,36,0.15)',  text: '#fcd34d' },
  yearly:  { bg: 'rgba(52,211,153,0.15)',  text: '#6ee7b7' },
}

function formatNextDue(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

type Filter = 'active' | 'paused' | 'all'

export function RecurringPaymentScreen() {
  const { items, loading, error, add, toggle, remove, totalMonthly, refresh } = useRecurring()
  const [filter, setFilter]         = useState<Filter>('active')
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [working, setWorking]       = useState<string | null>(null)
  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [confirmLabel, setConfirmLabel] = useState('')

  const activeList   = useMemo(() => items.filter((r: RecurringEntry) =>  r.active), [items])
  const inactiveList = useMemo(() => items.filter((r: RecurringEntry) => !r.active), [items])

  const filtered = useMemo<RecurringEntry[]>(() => {
    if (filter === 'active') return activeList
    if (filter === 'paused') return inactiveList
    return items
  }, [filter, activeList, inactiveList, items])

  const handleSave = async (entry: NewRecurring) => {
    await add(entry)
    setSheetOpen(false)
  }

  const handleToggle = async (id: string, current: boolean) => {
    setWorking(id)
    try   { await toggle(id, !current) }
    catch (e) { console.error(e) }
    finally   { setWorking(null) }
  }

  const handleDelete = async (id: string) => {
    setWorking(id)
    try   { await remove(id) }
    catch (e) { console.error(e) }
    finally   { setWorking(null) }
  }

  const openConfirm = (item: RecurringEntry) => {
    setConfirmLabel(item.label)
    setConfirmId(item.id)
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 32px', gap: 18 }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >

        {/* ── Summary Card ── */}
        <div style={{
          borderRadius: 24,
          padding: '22px 24px',
          background: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(52,211,153,0.07) 100%)',
          border: '1px solid rgba(251,191,36,0.22)',
          boxShadow: '0 4px 32px rgba(251,191,36,0.10), 0 1px 0 rgba(255,255,255,0.04) inset',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
        }}>
          {/* Monthly Commitment */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.7)', margin: 0 }}>Monthly Commitment</p>
            <motion.p
              key={totalMonthly}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              style={{ fontSize: 22, fontWeight: 800, color: '#fcd34d', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 20px rgba(251,191,36,0.5)' }}
            >{formatINR(Math.round(totalMonthly))}</motion.p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {activeList.length} active payment{activeList.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 20px', alignSelf: 'stretch', flexShrink: 0 }} />

          {/* Active / Paused */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(110,231,183,0.7)', margin: 0 }}>Active / Paused</p>
            <motion.p
              key={`${activeList.length}-${inactiveList.length}`}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
              style={{ fontSize: 22, fontWeight: 800, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 20px rgba(52,211,153,0.4)' }}
            >{activeList.length} / {inactiveList.length}</motion.p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>payments</p>
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setSheetOpen(true)}
            style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(251,191,36,0.45)' }}
            aria-label="Add recurring payment"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>

          <div style={{ display: 'flex', gap: 8 }}>
            {(['active', 'paused', 'all'] as Filter[]).map(f => (
              <motion.button
                key={f}
                whileTap={{ scale: 0.93 }}
                onClick={() => setFilter(f)}
                style={{ padding: '8px 16px', borderRadius: 100, border: filter === f ? '1px solid rgba(251,191,36,0.55)' : '1px solid rgba(255,255,255,0.09)', background: filter === f ? 'rgba(251,191,36,0.16)' : 'rgba(255,255,255,0.04)', color: filter === f ? '#fcd34d' : 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: filter === f ? 700 : 400, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.14s ease' }}
              >{f}</motion.button>
            ))}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 110, borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>{String(error)}</div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ textAlign: 'center', padding: '52px 20px', borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p style={{ fontSize: 40, marginBottom: 14 }}>🔄</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              {filter === 'active' ? 'No active recurring payments' : filter === 'paused' ? 'No paused payments' : 'No recurring payments yet'}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Tap + above to add a recurring payment</p>
          </motion.div>
        )}

        {/* ── List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence initial={false}>
            {filtered.map((item: RecurringEntry) => {
              const fc = FREQ_COLOR[item.frequency] ?? { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.5)' }
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, scale: 0.95 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  style={{ borderRadius: 22, padding: '18px 18px 14px', background: item.active ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.02)', border: item.active ? '1px solid rgba(251,191,36,0.18)' : '1px solid rgba(255,255,255,0.07)', boxShadow: item.active ? '0 2px 16px rgba(251,191,36,0.06)' : 'none' }}
                >
                  {/* Row 1 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: item.active ? '#f5f7ff' : 'rgba(255,255,255,0.38)' }}>{item.label}</p>
                        {!item.active && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>PAUSED</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 100, fontWeight: 600, background: fc.bg, color: fc.text }}>
                          {FREQ_LABEL[item.frequency] ?? item.frequency}
                        </span>
                        {item.next_due && (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Due {formatNextDue(item.next_due)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 14 }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: '0 0 2px' }}>Amount</p>
                      <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: item.active ? '#6ee7b7' : 'rgba(255,255,255,0.25)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(item.amount)}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.notes}</p>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggle(item.id, item.active)}
                      disabled={working === item.id}
                      style={{ flex: 1, padding: '10px', borderRadius: 13, background: item.active ? 'rgba(251,191,36,0.10)' : 'rgba(110,231,183,0.10)', border: item.active ? '1px solid rgba(251,191,36,0.28)' : '1px solid rgba(110,231,183,0.28)', color: item.active ? '#fcd34d' : '#6ee7b7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {working === item.id ? '…' : item.active ? '⏸ Pause' : '▶ Resume'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openConfirm(item)}
                      disabled={working === item.id}
                      style={{ padding: '10px 16px', borderRadius: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(252,165,165,0.6)', fontSize: 13, cursor: 'pointer' }}
                    >Delete</motion.button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

      </motion.div>

      {/* Sheet */}
      <RecurringSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />

      {/* Confirm delete */}
      <ConfirmSheet
        open={confirmId !== null}
        title="Delete Payment?"
        message={confirmLabel ? `"${confirmLabel}" will be permanently removed.` : 'This payment will be permanently removed.'}
        confirmLabel="Delete"
        onConfirm={() => { const id = confirmId!; setConfirmId(null); setConfirmLabel(''); handleDelete(id) }}
        onCancel={() => { setConfirmId(null); setConfirmLabel('') }}
      />
    </div>
  )
}

export default RecurringPaymentScreen
