import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoans } from '../../hooks/useLoans'
import { LoanSheet } from '../../components/shared/LoanSheet'
import { formatINR, formatShortDate } from '../../utils/format'

export function LoansScreen() {
  const { loans, loading, error, add, close, remove, totalOutstanding, totalEMI } = useLoans()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active')
  const [working, setWorking] = useState<string | null>(null)

  const filtered = loans.filter(l =>
    filter === 'all' ? true : filter === 'active' ? !l.closed : l.closed
  )

  const handleClose = async (id: string) => {
    setWorking(id); try { await close(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }
  const handleDelete = async (id: string) => {
    setWorking(id); try { await remove(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }

  return (
    <div style={{ padding: '24px 20px 32px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(253,211,77,0.7)', marginBottom: 4 }}>EMIs & Debt</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Loans</h1>
          </div>
          <motion.button whileTap={{ scale: 0.93 }} onClick={() => setSheetOpen(true)}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 14, color: '#0a0a0a', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(251,191,36,0.4)' }}
          >+ Add</motion.button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Outstanding', value: totalOutstanding, color: '#fca5a5', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.22)' },
            { label: 'Monthly EMIs', value: totalEMI, color: '#fcd34d', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.22)' },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 20, padding: '18px 16px', background: s.bg, border: `1px solid ${s.border}` }}>
              <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{s.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{formatINR(s.value)}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['active', 'closed', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '7px 16px', borderRadius: 100, border: filter === f ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.08)', background: filter === f ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)', color: filter === f ? '#fcd34d' : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: filter === f ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.14s ease' }}
            >{f}</button>
          ))}
        </div>

        {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2].map(i => <div key={i} style={{ height: 110, borderRadius: 18, background: 'rgba(255,255,255,0.05)' }} />)}</div>}
        {error && <div style={{ padding: 16, borderRadius: 16, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 14 }}>{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🏦</p>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{filter === 'active' ? 'No active loans!' : 'Nothing here'}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Tap + Add to track a loan or EMI</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence initial={false}>
            {filtered.map(loan => {
              const paidPct = loan.principal > 0 ? Math.min(Math.round(((loan.principal - loan.outstanding) / loan.principal) * 100), 100) : 0
              return (
                <motion.div key={loan.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, scale: 0.95 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ borderRadius: 20, padding: '18px', background: loan.closed ? 'rgba(255,255,255,0.02)' : 'rgba(251,191,36,0.07)', border: loan.closed ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(251,191,36,0.2)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: loan.closed ? 'rgba(255,255,255,0.4)' : '#f5f7ff', textDecoration: loan.closed ? 'line-through' : 'none' }}>{loan.label}</p>
                        {loan.closed && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'rgba(110,231,183,0.15)', color: '#6ee7b7', fontWeight: 600 }}>CLOSED</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        {loan.lender} · {loan.owner} · {formatShortDate(loan.created_at)}
                        {(loan.interest_rate ?? 0) > 0 ? ` · ${loan.interest_rate}% p.a.` : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Outstanding</p>
                      <p style={{ fontSize: 17, fontWeight: 700, color: loan.closed ? 'rgba(255,255,255,0.3)' : '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>{formatINR(loan.outstanding)}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                    <span>Principal: <span style={{ color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(loan.principal)}</span></span>
                    <span>EMI: <span style={{ color: '#fcd34d', fontVariantNumeric: 'tabular-nums' }}>{formatINR(loan.emi_amount ?? 0)}/mo</span></span>
                  </div>

                  {!loan.closed && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${paidPct}%` }} transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          style={{ height: '100%', background: 'linear-gradient(90deg,#6ee7b7,#34d399)', borderRadius: 100 }} />
                      </div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{paidPct}% repaid</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    {!loan.closed && (
                      <button onClick={() => handleClose(loan.id)} disabled={working === loan.id}
                        style={{ flex: 1, padding: '9px', borderRadius: 12, background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.25)', color: '#6ee7b7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >{working === loan.id ? '…' : '✓ Mark Closed'}</button>
                    )}
                    <button onClick={() => handleDelete(loan.id)} disabled={working === loan.id}
                      style={{ padding: '9px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer' }}
                    >Delete</button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </motion.div>
      <LoanSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={add} />
    </div>
  )
}
