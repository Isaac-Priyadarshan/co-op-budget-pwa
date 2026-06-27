import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────
type ResetMode = 'erase_history' | 'start_fresh' | 'clear_one_year' | 'full_wipe'

interface Props {
  open: boolean
  onClose: () => void
}

// ─── Supabase service-role config ─────────────────────────────────────────────
// We use the service-role key via direct REST fetch so RLS is bypassed.
// VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY must be set in .env.local
// and in Vercel environment variables.
const SB_URL  = import.meta.env.VITE_SUPABASE_URL as string
const SB_SKEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string

// ─── Confirmed tables in this project ────────────────────────────────────────
// Discovered by inspecting the live Supabase OpenAPI schema.
const ALL_DATA_TABLES = [
  'transactions',
  'wallets',
  'loans',
  'recurring_payments',
  'lent',
  'borrowed',
  'assets',
] as const

// ─── Core delete helper — uses service-role key, bypasses RLS ─────────────────
async function sbDelete(
  table: string,
  filter: string,          // e.g. "id=neq.00000000-..." or "created_at=gte.2026-01-01"
  filter2?: string         // optional second filter for range queries
): Promise<void> {
  if (!SB_URL || !SB_SKEY) {
    throw new Error(
      'Service key not configured. Add VITE_SUPABASE_SERVICE_KEY to your .env.local and Vercel env vars.'
    )
  }

  let url = `${SB_URL}/rest/v1/${table}?${filter}`
  if (filter2) url += `&${filter2}`

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'apikey':        SB_SKEY,
      'Authorization': `Bearer ${SB_SKEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[${table}] HTTP ${res.status}: ${body}`)
  }
}

// ─── Delete operations ────────────────────────────────────────────────────────

// Erase History — delete all rows from transactions
async function eraseHistory(): Promise<void> {
  await sbDelete('transactions', 'id=neq.00000000-0000-0000-0000-000000000000')
}

// Start Fresh — delete transactions in a specific calendar month
// Uses created_at (confirmed populated column) for date filtering
async function startFresh(year: number, month: number): Promise<void> {
  const pad      = (n: number) => String(n).padStart(2, '0')
  const from     = `${year}-${pad(month)}-01T00:00:00.000Z`
  const lastDay  = new Date(year, month, 0).getDate()
  const to       = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59.999Z`
  await sbDelete(
    'transactions',
    `created_at=gte.${encodeURIComponent(from)}`,
    `created_at=lte.${encodeURIComponent(to)}`
  )
}

// Clear One Year — delete all transactions in a full calendar year
async function clearOneYear(year: number): Promise<void> {
  const from = `${year}-01-01T00:00:00.000Z`
  const to   = `${year}-12-31T23:59:59.999Z`
  await sbDelete(
    'transactions',
    `created_at=gte.${encodeURIComponent(from)}`,
    `created_at=lte.${encodeURIComponent(to)}`
  )
}

// Full Wipe Out — delete all rows from every data table sequentially
// Sequential (not parallel) so we get a clear error if one table fails
async function fullWipeOut(): Promise<void> {
  const errors: string[] = []
  for (const table of ALL_DATA_TABLES) {
    try {
      await sbDelete(table, 'id=neq.00000000-0000-0000-0000-000000000000')
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }
  if (errors.length > 0) {
    throw new Error(`Some tables failed to wipe:\n${errors.join('\n')}`)
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1] as const
const CURRENT_YEAR = new Date().getFullYear()
const YEARS: number[] = Array.from({ length: CURRENT_YEAR - 2021 }, (_, i) => 2022 + i)
const MONTHS = [
  'January','February','March','April',
  'May','June','July','August',
  'September','October','November','December',
]

const MODES: {
  key: ResetMode
  icon: string
  label: string
  subtitle: string
  danger: boolean
  bubbleBg: string
  bubbleBorder: string
  activeBg: string
  activeBorder: string
}[] = [
  {
    key: 'erase_history',
    icon: '🧹',
    label: 'Erase History',
    subtitle: 'Removes all transaction records app-wide',
    danger: false,
    bubbleBg: 'rgba(99,102,241,0.18)',
    bubbleBorder: 'rgba(99,102,241,0.35)',
    activeBg: 'rgba(99,102,241,0.10)',
    activeBorder: 'rgba(99,102,241,0.45)',
  },
  {
    key: 'start_fresh',
    icon: '🌱',
    label: 'Start Fresh',
    subtitle: 'Remove all transactions in a chosen month',
    danger: false,
    bubbleBg: 'rgba(20,184,166,0.18)',
    bubbleBorder: 'rgba(20,184,166,0.35)',
    activeBg: 'rgba(20,184,166,0.10)',
    activeBorder: 'rgba(20,184,166,0.45)',
  },
  {
    key: 'clear_one_year',
    icon: '📅',
    label: 'Clear One Year',
    subtitle: 'Delete all transactions in a chosen year',
    danger: false,
    bubbleBg: 'rgba(251,191,36,0.18)',
    bubbleBorder: 'rgba(251,191,36,0.35)',
    activeBg: 'rgba(251,191,36,0.10)',
    activeBorder: 'rgba(251,191,36,0.45)',
  },
  {
    key: 'full_wipe',
    icon: '💥',
    label: 'Full Wipe Out',
    subtitle: 'Permanently destroys every record, wallet, loan, asset — everything',
    danger: true,
    bubbleBg: 'rgba(244,63,94,0.20)',
    bubbleBorder: 'rgba(244,63,94,0.40)',
    activeBg: 'rgba(244,63,94,0.12)',
    activeBorder: 'rgba(244,63,94,0.55)',
  },
]

// ─── Animation variants ───────────────────────────────────────────────────────
const sheetVariants: Variants = {
  hidden:  { y: '100%', opacity: 0.6 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.42, ease: EASE } },
  exit:    { y: '100%', opacity: 0, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } },
}
const backdropVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit:    { opacity: 0, transition: { duration: 0.22 } },
}
const contextVariants: Variants = {
  hidden:  { opacity: 0, y: 10, height: 0 },
  visible: { opacity: 1, y: 0, height: 'auto', transition: { duration: 0.3, ease: EASE } },
  exit:    { opacity: 0, y: -6, height: 0, transition: { duration: 0.2 } },
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ResetDataSheet({ open, onClose }: Props) {
  const [selected,  setSelected]  = useState<ResetMode | null>(null)
  const [sfMonth,   setSfMonth]   = useState<number>(new Date().getMonth() + 1)
  const [sfYear,    setSfYear]    = useState<number>(CURRENT_YEAR)
  const [cyYear,    setCyYear]    = useState<number>(CURRENT_YEAR)
  const [wipeInput, setWipeInput] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)
  const wipeRef = useRef<HTMLInputElement>(null)

  function handleClose() {
    if (loading) return
    setSelected(null)
    setSfMonth(new Date().getMonth() + 1)
    setSfYear(CURRENT_YEAR)
    setCyYear(CURRENT_YEAR)
    setWipeInput('')
    setLoading(false)
    setSuccess(false)
    setErrorMsg(null)
    onClose()
  }

  function isConfirmEnabled(): boolean {
    if (!selected) return false
    if (selected === 'start_fresh')    return sfMonth >= 1 && sfMonth <= 12
    if (selected === 'clear_one_year') return cyYear >= 2022 && cyYear <= CURRENT_YEAR
    if (selected === 'full_wipe')      return wipeInput.trim().toUpperCase() === 'WIPE'
    return true
  }

  async function handleConfirm() {
    if (!selected || loading) return
    setLoading(true)
    setErrorMsg(null)
    try {
      if (selected === 'erase_history')  await eraseHistory()
      if (selected === 'start_fresh')    await startFresh(sfYear, sfMonth)
      if (selected === 'clear_one_year') await clearOneYear(cyYear)
      if (selected === 'full_wipe')      await fullWipeOut()
      setSuccess(true)
      setTimeout(() => handleClose(), 1600)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function confirmLabel(): string {
    if (loading) return 'Working…'
    if (success) return '✓ Done — Data Wiped'
    if (selected === 'full_wipe')       return 'Wipe Everything'
    if (selected === 'erase_history')   return 'Erase All History'
    if (selected === 'start_fresh')     return `Clear ${MONTHS[sfMonth - 1]} ${sfYear}`
    if (selected === 'clear_one_year')  return `Clear ${cyYear}`
    return 'Confirm'
  }

  const isFullWipe     = selected === 'full_wipe'
  const confirmEnabled = isConfirmEnabled() && !loading && !success

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="reset-backdrop"
            variants={backdropVariants}
            initial="hidden" animate="visible" exit="exit"
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.72)',
              zIndex: 100,
              WebkitBackdropFilter: 'blur(6px)',
              backdropFilter: 'blur(6px)',
            }}
          />

          {/* ── Sheet ── */}
          <motion.div
            key="reset-sheet"
            variants={sheetVariants}
            initial="hidden" animate="visible" exit="exit"
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              zIndex: 101,
              background: 'linear-gradient(180deg, #1a1820 0%, #131118 100%)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              maxHeight: '88vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:4 }}>
              <div style={{ width:36, height:4, borderRadius:99, background:'rgba(255,255,255,0.15)' }} />
            </div>

            <div style={{ padding:'8px 20px 32px' }}>

              {/* ── Header ── */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                  <p style={{ fontSize:18, fontWeight:700, color:'#f5f5f7', margin:0 }}>Reset Data</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', margin:'3px 0 0' }}>
                    Select an option and confirm to delete
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={handleClose}
                  style={{
                    width:32, height:32, borderRadius:99,
                    background:'rgba(255,255,255,0.07)',
                    border:'1px solid rgba(255,255,255,0.10)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </motion.button>
              </div>

              {/* ── Mode tiles ── */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {MODES.map(mode => {
                  const isActive = selected === mode.key
                  return (
                    <motion.button
                      key={mode.key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelected(isActive ? null : mode.key)
                        setErrorMsg(null)
                        setWipeInput('')
                        setSuccess(false)
                      }}
                      style={{
                        width:'100%', display:'flex', alignItems:'center', gap:13,
                        padding:'13px 14px', borderRadius:16,
                        border: isActive ? `1px solid ${mode.activeBorder}` : '1px solid rgba(255,255,255,0.07)',
                        background: isActive ? mode.activeBg : 'rgba(255,255,255,0.03)',
                        cursor:'pointer', textAlign:'left', transition:'all 0.18s ease',
                      }}
                    >
                      <div style={{
                        width:40, height:40, borderRadius:12,
                        background:mode.bubbleBg, border:`1px solid ${mode.bubbleBorder}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:18, flexShrink:0,
                      }}>
                        {mode.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{
                          fontSize:14, fontWeight:600, margin:0, lineHeight:1.25,
                          color: mode.danger
                            ? (isActive ? 'rgba(252,100,120,0.95)' : 'rgba(252,100,120,0.65)')
                            : (isActive ? '#f5f5f7' : 'rgba(255,255,255,0.6)'),
                        }}>
                          {mode.label}
                        </p>
                        <p style={{ fontSize:11, color:'rgba(255,255,255,0.28)', margin:'3px 0 0', lineHeight:1.35 }}>
                          {mode.subtitle}
                        </p>
                      </div>
                      <div style={{
                        width:18, height:18, borderRadius:99, flexShrink:0,
                        border: isActive
                          ? (mode.danger ? '5px solid rgba(252,100,120,0.9)' : '5px solid rgba(99,200,180,0.9)')
                          : '1.5px solid rgba(255,255,255,0.18)',
                        transition:'all 0.18s ease',
                      }} />
                    </motion.button>
                  )
                })}
              </div>

              {/* ── Context UI ── */}
              <AnimatePresence mode="wait">

                {/* Start Fresh pickers */}
                {selected === 'start_fresh' && (
                  <motion.div
                    key="ctx-start-fresh"
                    variants={contextVariants}
                    initial="hidden" animate="visible" exit="exit"
                    style={{ overflow:'hidden', marginBottom:12 }}
                  >
                    <div style={{
                      background:'rgba(20,184,166,0.07)',
                      border:'1px solid rgba(20,184,166,0.20)',
                      borderRadius:14, padding:'14px 16px',
                    }}>
                      <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(20,184,166,0.7)', margin:'0 0 10px' }}>
                        Select Month &amp; Year
                      </p>
                      <div style={{ display:'flex', gap:8 }}>
                        <select
                          value={sfMonth}
                          onChange={e => setSfMonth(Number(e.target.value))}
                          style={{
                            flex:2, background:'rgba(255,255,255,0.06)',
                            border:'1px solid rgba(255,255,255,0.12)', borderRadius:10,
                            color:'#f5f5f7', fontSize:14, fontWeight:500,
                            padding:'10px 12px', outline:'none', cursor:'pointer',
                            appearance:'none', WebkitAppearance:'none',
                          }}
                        >
                          {MONTHS.map((m,i) => (
                            <option key={m} value={i+1} style={{ background:'#1a1820', color:'#f5f5f7' }}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={sfYear}
                          onChange={e => setSfYear(Number(e.target.value))}
                          style={{
                            flex:1, background:'rgba(255,255,255,0.06)',
                            border:'1px solid rgba(255,255,255,0.12)', borderRadius:10,
                            color:'#f5f5f7', fontSize:14, fontWeight:500,
                            padding:'10px 12px', outline:'none', cursor:'pointer',
                            appearance:'none', WebkitAppearance:'none',
                          }}
                        >
                          {YEARS.map(y => (
                            <option key={y} value={y} style={{ background:'#1a1820', color:'#f5f5f7' }}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:'8px 0 0' }}>
                        All transactions created in {MONTHS[sfMonth-1]} {sfYear} will be permanently deleted.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Clear One Year picker */}
                {selected === 'clear_one_year' && (
                  <motion.div
                    key="ctx-clear-year"
                    variants={contextVariants}
                    initial="hidden" animate="visible" exit="exit"
                    style={{ overflow:'hidden', marginBottom:12 }}
                  >
                    <div style={{
                      background:'rgba(251,191,36,0.07)',
                      border:'1px solid rgba(251,191,36,0.20)',
                      borderRadius:14, padding:'14px 16px',
                    }}>
                      <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(251,191,36,0.7)', margin:'0 0 10px' }}>
                        Select Year
                      </p>
                      <select
                        value={cyYear}
                        onChange={e => setCyYear(Number(e.target.value))}
                        style={{
                          width:'100%', background:'rgba(255,255,255,0.06)',
                          border:'1px solid rgba(255,255,255,0.12)', borderRadius:10,
                          color:'#f5f5f7', fontSize:15, fontWeight:500,
                          padding:'11px 14px', outline:'none', cursor:'pointer',
                          appearance:'none', WebkitAppearance:'none',
                        }}
                      >
                        {YEARS.map(y => (
                          <option key={y} value={y} style={{ background:'#1a1820', color:'#f5f5f7' }}>{y}</option>
                        ))}
                      </select>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:'8px 0 0' }}>
                        All transactions from Jan 1 to Dec 31, {cyYear} will be deleted.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Full Wipe confirmation input */}
                {selected === 'full_wipe' && (
                  <motion.div
                    key="ctx-full-wipe"
                    variants={contextVariants}
                    initial="hidden" animate="visible" exit="exit"
                    style={{ overflow:'hidden', marginBottom:12 }}
                  >
                    <div style={{
                      background:'rgba(244,63,94,0.07)',
                      border:'1px solid rgba(244,63,94,0.25)',
                      borderRadius:14, padding:'14px 16px',
                    }}>
                      <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(252,100,120,0.75)', margin:'0 0 6px' }}>
                        ⚠️ Danger Zone
                      </p>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', margin:'0 0 12px', lineHeight:1.5 }}>
                        This will permanently delete every transaction, wallet, loan, recurring payment, asset, lent and borrowed record. This cannot be undone.
                      </p>
                      <p style={{ fontSize:12, color:'rgba(252,100,120,0.7)', margin:'0 0 8px', fontWeight:600 }}>
                        Type <span style={{ letterSpacing:'0.12em', color:'rgba(252,100,120,1)' }}>WIPE</span> to confirm
                      </p>
                      <input
                        ref={wipeRef}
                        type="text"
                        value={wipeInput}
                        onChange={e => setWipeInput(e.target.value)}
                        placeholder="Type WIPE here…"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        style={{
                          width:'100%',
                          background:'rgba(255,255,255,0.05)',
                          border: wipeInput.toUpperCase() === 'WIPE'
                            ? '1px solid rgba(252,100,120,0.7)'
                            : '1px solid rgba(255,255,255,0.10)',
                          borderRadius:10, color:'#f5f5f7',
                          fontSize:15, fontWeight:600, letterSpacing:'0.08em',
                          padding:'11px 14px', outline:'none',
                          boxSizing:'border-box', transition:'border-color 0.18s ease',
                        }}
                      />
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* ── Error message ── */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    key="err"
                    initial={{ opacity:0, y:6 }}
                    animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0 }}
                    style={{
                      fontSize:12,
                      color:'rgba(252,100,120,0.9)',
                      background:'rgba(244,63,94,0.10)',
                      border:'1px solid rgba(244,63,94,0.22)',
                      borderRadius:10, padding:'10px 14px',
                      margin:'0 0 12px', lineHeight:1.5,
                      whiteSpace:'pre-wrap', wordBreak:'break-word',
                    }}
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Confirm button ── */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    key="confirm-btn-wrap"
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0, transition:{ duration:0.25, ease:EASE } }}
                    exit={{ opacity:0, y:6 }}
                  >
                    <motion.button
                      whileTap={confirmEnabled ? { scale:0.96 } : {}}
                      onClick={handleConfirm}
                      disabled={!confirmEnabled}
                      style={{
                        width:'100%', padding:'15px', borderRadius:16, border:'none',
                        fontSize:15, fontWeight:700, letterSpacing:'0.02em',
                        cursor: confirmEnabled ? 'pointer' : 'not-allowed',
                        transition:'all 0.18s ease',
                        background: success
                          ? 'linear-gradient(135deg,rgba(20,184,120,0.85),rgba(20,184,100,0.65))'
                          : isFullWipe
                            ? (confirmEnabled
                                ? 'linear-gradient(135deg,rgba(220,38,60,0.85),rgba(180,20,50,0.7))'
                                : 'rgba(255,255,255,0.05)')
                            : (confirmEnabled
                                ? 'linear-gradient(135deg,rgba(99,102,241,0.85),rgba(139,92,246,0.70))'
                                : 'rgba(255,255,255,0.05)'),
                        color: confirmEnabled ? '#ffffff' : 'rgba(255,255,255,0.22)',
                        boxShadow: confirmEnabled && !success
                          ? (isFullWipe
                              ? '0 4px 20px rgba(220,38,60,0.35)'
                              : '0 4px 20px rgba(99,102,241,0.30)')
                          : 'none',
                      }}
                    >
                      {loading ? (
                        <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none"
                            style={{ animation:'spin 0.8s linear infinite' }}
                          >
                            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                          </svg>
                          Working…
                        </span>
                      ) : confirmLabel()}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  )
}
