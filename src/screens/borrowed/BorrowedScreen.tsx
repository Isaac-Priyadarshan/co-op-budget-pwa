import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBorrowed } from '../../hooks/useBorrowed'
import { PersonEntrySheet } from '../../components/shared/PersonEntrySheet'
import { formatINR, formatShortDate } from '../../utils/format'

export function BorrowedScreen() {
  const { entries, loading, error, add, settle, remove, totalOwed } = useBorrowed()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('pending')
  const [working, setWorking] = useState<string | null>(null)

  const filtered = entries.filter(e =>
    filter === 'all' ? true : filter === 'pending' ? !e.settled : e.settled
  )

  const handleSettle = async (id: string) => {
    setWorking(id)
    try { await settle(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }
  const handleDelete = async (id: string) => {
    setWorking(id)
    try { await remove(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(252,165,165,0.7)', marginBottom: 4 }}>You owe</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Borrowed</h1>
          </div>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setSheetOpen(true)}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#f87171,#ef4444)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(248,113,113,0.4)' }}
          >+ Add</motion.button>
        </div>

        {/* Total owed card */}
        <div style={{ borderRadius: 20, padding: '18px 20px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', marginBottom: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(252,165,165,0.6)', marginBottom: 6 }}>Total you owe (unsettled)</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#fca5a5', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatINR(totalOwed)}</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['pending', 'settled', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '7px 16px', borderRadius: 100, border: filter === f ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.08)', background: filter === f ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.04)', color: filter === f ? '#fca5a5' : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: filter === f ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.14s ease' }}
            >{f}</button>
          ))}
        </div>

        {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2,3].map(i => <div key={i} style={{ height: 80, borderRadius: 18, background: 'rgba(255,255,255,0.05)' }} />)}</div>}
        {error && <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', fontSize: 14 }}>{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🤝</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{filter === 'pending' ? 'Nothing owed!' : 'Nothing here yet'}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Tap + Add to record something you borrowed</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence initial={false}>
            {filtered.map(entry => (
              <motion.div key={entry.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ borderRadius: 18, padding: '16px', background: entry.settled ? 'rgba(255,255,255,0.02)' : 'rgba(248,113,113,0.07)', border: entry.settled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(248,113,113,0.2)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: entry.settled ? 'rgba(255,255,255,0.4)' : '#f5f7ff', textDecoration: entry.settled ? 'line-through' : 'none' }}>{entry.person}</p>
                      {entry.settled && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', fontWeight: 600, letterSpacing: '0.08em' }}>SETTLED</span>}
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{entry.description} · {entry.borrowed_by} · {formatShortDate(entry.created_at)}</p>
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: entry.settled ? 'rgba(255,255,255,0.3)' : '#fca5a5', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 12 }}>{formatINR(entry.amount)}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!entry.settled && (
                    <button onClick={() => handleSettle(entry.id)} disabled={working === entry.id}
                      style={{ flex: 1, padding: '9px', borderRadius: 12, background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.25)', color: '#6ee7b7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >{working === entry.id ? '…' : '✓ Mark Settled'}</button>
                  )}
                  <button onClick={() => handleDelete(entry.id)} disabled={working === entry.id}
                    style={{ padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}
                  >Delete</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      <PersonEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} mode="borrowed"
        onAdd={({ person, amount, description, actor }) => add({ person, amount, description, borrowed_by: actor })} />
    </div>
  )
}
