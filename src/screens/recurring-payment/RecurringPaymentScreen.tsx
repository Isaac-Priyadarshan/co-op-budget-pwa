import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRecurring } from '../../hooks/useRecurring'
import { RecurringSheet } from '../../components/shared/RecurringSheet'
import { formatINR } from '../../utils/format'

const FREQ_LABEL: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }
const FREQ_COLOR: Record<string, string> = { daily: '#fcd34d', weekly: '#86efac', monthly: '#a5b4fc', quarterly: '#f9a8d4', yearly: '#6ee7b7' }

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dateStr); due.setHours(0,0,0,0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

export function RecurringPaymentScreen() {
  const { items, loading, error, add, toggle, remove, totalMonthly } = useRecurring()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState<'active' | 'paused' | 'all'>('active')
  const [working, setWorking] = useState<string | null>(null)

  const filtered = items.filter(r => filter === 'all' ? true : filter === 'active' ? r.active : !r.active)

  const handleToggle = async (id: string, active: boolean) => {
    setWorking(id); try { await toggle(id, !active) } catch (e) { console.error(e) } finally { setWorking(null) }
  }
  const handleDelete = async (id: string) => {
    setWorking(id); try { await remove(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 4 }}>Bills & Subscriptions</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Recurring</h1>
          </div>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setSheetOpen(true)}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#818cf8,#6366f1)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
          >+ Add</motion.button>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ borderRadius: 24, padding: '20px', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)', marginBottom: 20 }}
        >
          <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)', marginBottom: 6 }}>Monthly Commitment</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#a5b4fc', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalMonthly)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{items.filter(r => r.active).length} active · {items.filter(r => !r.active).length} paused</p>
        </motion.div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['active', 'paused', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '7px 16px', borderRadius: 100, border: filter === f ? '1px solid rgba(165,180,252,0.5)' : '1px solid rgba(255,255,255,0.08)', background: filter === f ? 'rgba(165,180,252,0.15)' : 'rgba(255,255,255,0.04)', color: filter === f ? '#a5b4fc' : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: filter === f ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.14s ease' }}
            >{f}</button>
          ))}
        </div>

        {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2,3].map(i => <div key={i} style={{ height: 90, borderRadius: 18, background: 'rgba(255,255,255,0.05)' }} />)}</div>}
        {error && <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>{error}</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🔄</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No recurring payments yet</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Add Netflix, rent, Jio, insurance and more</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence initial={false}>
            {filtered.map(item => {
              const days = daysUntil(item.next_due)
              const urgent = days <= 3 && item.active
              const overdue = days < 0 && item.active
              return (
                <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ borderRadius: 20, padding: '16px', background: overdue ? 'rgba(248,113,113,0.08)' : urgent ? 'rgba(251,191,36,0.08)' : item.active ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)', border: overdue ? '1px solid rgba(248,113,113,0.25)' : urgent ? '1px solid rgba(251,191,36,0.25)' : item.active ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.06)', opacity: item.active ? 1 : 0.55 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: item.active ? '#f5f7ff' : 'rgba(255,255,255,0.4)' }}>{item.label}</p>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: `${FREQ_COLOR[item.frequency]}22`, color: FREQ_COLOR[item.frequency], fontWeight: 600, border: `1px solid ${FREQ_COLOR[item.frequency]}44` }}>{FREQ_LABEL[item.frequency]}</span>
                        {!item.active && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>PAUSED</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        {item.category} · {item.owner} ·{' '}
                        <span style={{ color: overdue ? '#fca5a5' : urgent ? '#fcd34d' : 'rgba(255,255,255,0.35)' }}>
                          {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today!' : `Due in ${days}d`}
                        </span>
                      </p>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: item.active ? '#a5b4fc' : 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 12 }}>{formatINR(item.amount)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleToggle(item.id, item.active)} disabled={working === item.id}
                      style={{ flex: 1, padding: '9px', borderRadius: 12, background: item.active ? 'rgba(251,191,36,0.1)' : 'rgba(110,231,183,0.1)', border: item.active ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(110,231,183,0.25)', color: item.active ? '#fcd34d' : '#6ee7b7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >{working === item.id ? '…' : item.active ? '⏸ Pause' : '▶ Resume'}</button>
                    <button onClick={() => handleDelete(item.id)} disabled={working === item.id}
                      style={{ padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}
                    >Delete</button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </motion.div>
      <RecurringSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={add} />
    </div>
  )
}
