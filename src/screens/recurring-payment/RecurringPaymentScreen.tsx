import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecurring } from '../../hooks/useRecurring'
import type { RecurringEntry } from '../../lib/db'
import { RecurringSheet } from '../../components/shared/RecurringSheet'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  '\u20b9' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
}

const FREQ_COLOR: Record<string, string> = {
  daily:   'bg-blue-500/20 text-blue-300',
  weekly:  'bg-purple-500/20 text-purple-300',
  monthly: 'bg-amber-500/20 text-amber-300',
  yearly:  'bg-emerald-500/20 text-emerald-300',
}

function formatNextDue(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Filter = 'active' | 'past' | 'all'

// ─── component ────────────────────────────────────────────────────────────────
export function RecurringPaymentScreen() {
  const { items, loading, toggle, remove, totalMonthly, refresh } = useRecurring()

  const [filter, setFilter]         = useState<Filter>('active')
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── derived stats
  const activeList   = useMemo(() => items.filter((r: RecurringEntry) =>  r.active), [items])
  const inactiveList = useMemo(() => items.filter((r: RecurringEntry) => !r.active), [items])

  const displayed = useMemo<RecurringEntry[]>(() => {
    if (filter === 'active') return activeList
    if (filter === 'past')   return inactiveList
    return items
  }, [filter, activeList, inactiveList, items])

  // ── actions
  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id)
    try   { await toggle(id, !current) }
    catch (e) { console.error(e) }
    finally   { setTogglingId(null) }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try   { await remove(id) }
    catch (e) { console.error(e) }
    finally   { setDeletingId(null) }
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-none px-4 pt-5 pb-6 space-y-4">

        {/* SUMMARY CARD */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(16,16,16,0.9) 100%)',
            border: '1px solid rgba(251,191,36,0.18)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Monthly Commitment</p>
          {loading ? (
            <div className="h-9 w-40 rounded-lg bg-white/10 animate-pulse mb-3" />
          ) : (
            <p className="text-3xl font-bold text-amber-400 mb-3 tabular-nums">
              {fmt(Math.round(totalMonthly))}
            </p>
          )}
          <div className="h-px bg-white/10 mb-3" />
          <div className="flex items-center">
            <div className="flex-1 text-center">
              <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
                {loading ? '\u2014' : activeList.length}
              </p>
              <p className="text-xs text-white/40 mt-0.5">Active</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex-1 text-center">
              <p className="text-2xl font-semibold text-white/50 tabular-nums">
                {loading ? '\u2014' : inactiveList.length}
              </p>
              <p className="text-xs text-white/40 mt-0.5">Paused</p>
            </div>
          </div>
        </motion.div>

        {/* ACTION BAR */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => setSheetOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              boxShadow: '0 0 16px rgba(251,191,36,0.35)',
            }}
            aria-label="Add recurring payment"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {(['active', 'past', 'all'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-all active:scale-95"
                style={
                  filter === f
                    ? { background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }
                }
              >
                {f === 'past' ? 'Paused' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* LIST */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <span className="text-4xl mb-3">\ud83d\udd04</span>
            <p className="text-white/40 text-sm">
              {filter === 'active' ? 'No active recurring payments'
               : filter === 'past'   ? 'No paused payments'
               : 'No recurring payments yet'}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-3 text-amber-400/70 text-xs underline underline-offset-2"
              >
                View all
              </button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {displayed.map((item: RecurringEntry, idx: number) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-2xl p-4"
                  style={{
                    background: item.active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
                    border:     item.active ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-base truncate ${item.active ? 'text-white' : 'text-white/40'}`}>
                        {item.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FREQ_COLOR[item.frequency] ?? 'bg-white/10 text-white/40'}`}>
                          {FREQ_LABEL[item.frequency] ?? item.frequency}
                        </span>
                        {item.next_due && (
                          <span className="text-xs text-white/35">Due {formatNextDue(item.next_due)}</span>
                        )}
                        {!item.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.08] text-white/30 border border-white/10">
                            Paused
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className={`text-lg font-bold tabular-nums ${item.active ? 'text-emerald-400' : 'text-white/30'}`}>
                        {fmt(item.amount)}
                      </p>
                      <div className="flex items-center gap-2">
                        {/* Pause / Resume */}
                        <button
                          onClick={() => handleToggle(item.id, item.active)}
                          disabled={togglingId === item.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{
                            background: item.active ? 'rgba(251,191,36,0.15)' : 'rgba(110,231,183,0.15)',
                            border:     item.active ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(110,231,183,0.3)',
                          }}
                          aria-label={item.active ? 'Pause' : 'Resume'}
                        >
                          {togglingId === item.id ? (
                            <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
                          ) : item.active ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(251,191,36,0.9)">
                              <rect x="6" y="4" width="4" height="16" rx="1"/>
                              <rect x="14" y="4" width="4" height="16" rx="1"/>
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(110,231,183,0.9)">
                              <polygon points="5,3 19,12 5,21"/>
                            </svg>
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
                          aria-label="Delete"
                        >
                          {deletingId === item.id ? (
                            <div className="w-3 h-3 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.8)" strokeWidth="2" strokeLinecap="round">
                              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="mt-2 text-xs text-white/30 truncate">{item.notes}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ADD SHEET — prop is onSave (not onSaved) */}
      <RecurringSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={async () => { setSheetOpen(false); await refresh() }}
      />
    </div>
  )
}

export default RecurringPaymentScreen
