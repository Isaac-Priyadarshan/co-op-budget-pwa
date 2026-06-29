import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoans } from '../../hooks/useLoans'
import { LoanSheet } from '../../components/shared/LoanSheet'
import { ConfirmSheet } from '../../components/shared/ConfirmSheet'
import { formatINR } from '../../utils/format'

function formatShortDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

export function LoansScreen() {
  const { loans, loading, error, add, close, remove, totalOutstanding, totalEMI } = useLoans()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active')
  const [working, setWorking] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [confirmLabel, setConfirmLabel] = useState('')

  const filtered = loans.filter(l =>
    filter === 'all' ? true : filter === 'active' ? !l.closed : l.closed
  )

  const handleClose = async (id: string) => {
    setWorking(id)
    try { await close(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }
  const handleDelete = async (id: string) => {
    setWorking(id)
    try { await remove(id) } catch (e) { console.error(e) } finally { setWorking(null) }
  }

  const openConfirm = (id: string, label: string) => {
    setConfirmLabel(label)
    setConfirmId(id)
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
          background: 'linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(239,68,68,0.08) 100%)',
          border: '1px solid rgba(251,191,36,0.22)',
          boxShadow: '0 4px 32px rgba(251,191,36,0.10), 0 1px 0 rgba(255,255,255,0.04) inset',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
        }}>
          {/* Total Outstanding */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.7)', margin: 0 }}>Total Outstanding</p>
            <motion.p
              key={totalOutstanding}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              style={{ fontSize: 22, fontWeight: 800, color: '#fcd34d', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 20px rgba(251,191,36,0.5)' }}
            >{formatINR(totalOutstanding)}</motion.p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {loans.filter(l => !l.closed).length} active loan{loans.filter(l => !l.closed).length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 20px', alignSelf: 'stretch', flexShrink: 0 }} />

          {/* Monthly EMI */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(239,68,68,0.7)', margin: 0 }}>Monthly EMI</p>
            <motion.p
              key={totalEMI}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
              style={{ fontSize: 22, fontWeight: 800, color: '#fca5a5', fontVariantNumeric: 'tabular-nums', margin: 0, textShadow: '0 0 20px rgba(239,68,68,0.4)' }}
            >{formatINR(totalEMI)}</motion.p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>per month</p>
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setSheetOpen(true)}
            style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(251,191,36,0.45)' }}
            aria-label="Add loan"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>

          <div style={{ display: 'flex', gap: 8 }}>
            {(['active', 'closed', 'all'] as const).map(f => (
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
              <div key={i} style={{ height: 130, borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
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
            <p style={{ fontSize: 40, marginBottom: 14 }}>🏦</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              {filter === 'active' ? 'No active loans' : filter === 'closed' ? 'No closed loans' : 'No loans yet'}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>Tap + above to add a loan</p>
          </motion.div>
        )}

        {/* ── Loan List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence initial={false}>
            {filtered.map(loan => (
              <motion.div
                key={loan.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40, scale: 0.95 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                style={{ borderRadius: 22, padding: '18px 18px 14px', background: loan.closed ? 'rgba(255,255,255,0.02)' : 'rgba(251,191,36,0.05)', border: loan.closed ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(251,191,36,0.18)', boxShadow: loan.closed ? 'none' : '0 2px 16px rgba(251,191,36,0.06)' }}
              >
                {/* Row 1 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: loan.closed ? 'rgba(255,255,255,0.38)' : '#f5f7ff' }}>{loan.label}</p>
                      {loan.closed && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'rgba(52,211,153,0.15)', color: '#6ee7b7', fontWeight: 700 }}>CLOSED</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {loan.lender && (
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{loan.lender}</span>
                      )}
                      {loan.interest_rate != null && loan.interest_rate > 0 && (
                        <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 100, fontWeight: 600, background: 'rgba(251,191,36,0.12)', color: '#fcd34d' }}>{loan.interest_rate}% p.a.</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 14 }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: '0 0 2px' }}>Outstanding</p>
                    <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: loan.closed ? 'rgba(255,255,255,0.25)' : '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>{formatINR(loan.outstanding)}</p>
                  </div>
                </div>

                {/* Row 2 — EMI + Dates */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  {loan.emi_amount != null && loan.emi_amount > 0 && (
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>EMI / mo</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{formatINR(loan.emi_amount)}</p>
                    </div>
                  )}
                  {loan.start_date && (
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Started</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{formatShortDate(loan.start_date)}</p>
                    </div>
                  )}
                  {loan.end_date && (
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Ends</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', margin: 0 }}>{formatShortDate(loan.end_date)}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {!loan.closed && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleClose(loan.id)}
                      disabled={working === loan.id}
                      style={{ flex: 1, padding: '10px', borderRadius: 13, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.28)', color: '#6ee7b7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {working === loan.id ? '…' : '✓ Mark Closed'}
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openConfirm(loan.id, loan.label)}
                    disabled={working === loan.id}
                    style={{ padding: '10px 16px', borderRadius: 13, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(252,165,165,0.6)', fontSize: 13, cursor: 'pointer' }}
                  >Delete</motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </motion.div>

      {/* Add Loan Sheet */}
      <LoanSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={async (loan) => { await add(loan); setSheetOpen(false) }}
      />

      {/* Confirm delete */}
      <ConfirmSheet
        open={confirmId !== null}
        title="Delete Loan?"
        message={confirmLabel ? `"${confirmLabel}" will be permanently removed.` : 'This loan will be permanently removed.'}
        confirmLabel="Delete"
        onConfirm={() => { const id = confirmId!; setConfirmId(null); setConfirmLabel(''); handleDelete(id) }}
        onCancel={() => { setConfirmId(null); setConfirmLabel('') }}
      />
    </div>
  )
}
