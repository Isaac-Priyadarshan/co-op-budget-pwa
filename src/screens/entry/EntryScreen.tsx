import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCategories } from '../../hooks/useCategories'
import { useWallets } from '../../hooks/useWallets'
import { useTransactions } from '../../hooks/useTransactions'
import { useUser } from '../../context/UserContext'
import { supabase } from '../../lib/supabase'

const KEY_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
]
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Format a Date to YYYY-MM-DD without timezone drift.
// Supabase transactions.transaction_date is a DATE column — never send a full ISO timestamp.
function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function EntryScreen() {
  const navigate = useNavigate()
  const { type, categoryId } = useParams<{ type: string; categoryId: string }>()
  const { activeUser } = useUser()
  const { expenseCategories, incomeCategories, subcategories } = useCategories()
  const { wallets, loading: walletsLoading } = useWallets()
  const { addTransaction } = useTransactions()

  const allCategories = [...expenseCategories, ...incomeCategories]
  const category     = allCategories.find(c => c.id === categoryId)
  const subs         = category ? (subcategories[category.id] ?? []) : []
  const accent       = category?.accent ?? '#FBBF24'
  const glow         = category?.glow   ?? 'rgba(251,191,36,0.22)'

  const [raw, setRaw]                 = useState('0')
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [note, setNote]               = useState('')
  const [txDate, setTxDate]           = useState(new Date())
  const [walletId, setWalletId]       = useState<string | null>(null)
  const [walletLabel, setWalletLabel] = useState('')
  const [activePanel, setActivePanel] = useState<'note' | 'wallet' | 'calendar' | null>(null)
  const [pickerY, setPickerY]         = useState(new Date().getFullYear())
  const [pickerM, setPickerM]         = useState(new Date().getMonth())
  const [pickerD, setPickerD]         = useState(new Date().getDate())
  const [saving, setSaving]           = useState(false)
  const [success, setSuccess]         = useState(false)
  const [errMsg, setErrMsg]           = useState<string | null>(null)

  const noteInputRef = useRef<HTMLInputElement>(null)

  // ── Auto-select active user's default wallet on mount ──────────────────────────
  // Reads user_preferences for the active user, finds default_wallet_id,
  // then matches it against the loaded wallets list to set label + id.
  // Runs once after wallets finish loading and activeUser is known.
  useEffect(() => {
    if (!activeUser || walletsLoading || wallets.length === 0) return
    // Only set if no wallet has been manually chosen yet
    if (walletId !== null) return

    let cancelled = false
    supabase
      .from('user_preferences')
      .select('default_wallet_id')
      .eq('user_name', activeUser)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const defaultId = data?.default_wallet_id as string | null | undefined
        if (!defaultId) return
        const match = wallets.find(w => w.id === defaultId)
        if (match) {
          setWalletId(match.id)
          setWalletLabel(match.label)
        }
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser, walletsLoading, wallets])

  const togglePanel = (p: 'note' | 'wallet' | 'calendar') =>
    setActivePanel(prev => (prev === p ? null : p))

  useEffect(() => {
    if (activePanel === 'note') setTimeout(() => noteInputRef.current?.focus(), 60)
  }, [activePanel])

  const handleKey = useCallback((k: string) => {
    setRaw(prev => {
      if (k === '⌫') { const n = prev.slice(0, -1); return n === '' ? '0' : n }
      if (k === '.') { if (prev.includes('.')) return prev; return prev + '.' }
      if (prev === '0') return k
      if (prev.includes('.')) { const [, dec] = prev.split('.'); if (dec.length >= 2) return prev }
      if (prev.replace('.', '').length >= 9) return prev
      return prev + k
    })
  }, [])

  const amountValue = parseFloat(raw) || 0
  const hasAmount   = amountValue > 0
  const hasWallet   = walletId !== null
  const hasSub      = selectedSub !== null
  const subRequired = subs.length > 0
  const canConfirm  = hasAmount && hasWallet && (!subRequired || hasSub)

  const readinessLevel      = (hasAmount ? 1 : 0) + (hasWallet ? 1 : 0) + (!subRequired || hasSub ? 1 : 0)
  const confirmOpacity      = [0.18, 0.42, 0.70, 1][readinessLevel]
  const confirmGlowStrength = [0, 0.15, 0.35, 1][readinessLevel]
  const confirmBg = readinessLevel === 3
    ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
    : readinessLevel === 2
    ? `linear-gradient(135deg, ${accent}88, ${accent}55)`
    : readinessLevel === 1 ? `${accent}22` : 'rgba(255,255,255,0.05)'
  const confirmBorder = readinessLevel === 3
    ? 'none'
    : `1px solid ${accent}${readinessLevel === 2 ? '44' : readinessLevel === 1 ? '28' : '12'}`
  const confirmTextColor = readinessLevel === 3 ? '#000'
    : readinessLevel === 2 ? accent
    : readinessLevel === 1 ? `${accent}99` : 'rgba(255,255,255,0.20)'
  const confirmShadow = readinessLevel >= 1
    ? `0 3px ${8 + readinessLevel * 10}px ${glow.replace(')', `, ${confirmGlowStrength})`).replace('rgba(', 'rgba(')}`
    : 'none'

  const rupee = '\u20B9'
  const formattedDisplay = (() => {
    const [int, dec] = raw.split('.')
    const intFormatted = parseInt(int || '0', 10).toLocaleString('en-IN')
    return dec !== undefined ? `${rupee}${intFormatted}.${dec}` : `${rupee}${intFormatted}`
  })()

  const today   = new Date()
  const isToday = txDate.getDate() === today.getDate() &&
    txDate.getMonth() === today.getMonth() &&
    txDate.getFullYear() === today.getFullYear()
  const dateLabel = isToday
    ? 'Today'
    : `${txDate.getDate()} ${MONTH_NAMES[txDate.getMonth()]} ${txDate.getFullYear()}`

  const daysInMonth = new Date(pickerY, pickerM + 1, 0).getDate()
  const pickerDays  = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const pickerYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const applyDate = useCallback((dy: number, dm: number, dd: number) => {
    const safe = Math.min(dd, new Date(dy, dm + 1, 0).getDate())
    setPickerY(dy); setPickerM(dm); setPickerD(safe)
    setTxDate(new Date(dy, dm, safe))
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return
    if (!category || !activeUser) { setErrMsg('Session error. Go back and try again.'); return }
    setSaving(true); setErrMsg(null)
    const subLabel  = subs.find(s => s.id === selectedSub)?.label ?? ''
    const descParts = [subLabel, note].filter(Boolean)
    try {
      await addTransaction({
        amount:           amountValue,
        description:      descParts.join(' · ') || category.label,
        category:         category.label,
        created_by:       activeUser,
        type:             (type as 'income' | 'expense') ?? 'expense',
        wallet_id:        walletId ?? undefined,
        // Send clean YYYY-MM-DD — DATE column in Supabase rejects ISO timestamps
        transaction_date: toDateString(txDate),
      })
      setSaving(false); setSuccess(true)
      setTimeout(() => navigate(-1), 1500)
    } catch (e) {
      setSaving(false)
      setErrMsg(e instanceof Error ? e.message : 'Failed to save. Try again.')
    }
  }, [canConfirm, category, activeUser, selectedSub, note, subs, addTransaction, amountValue, type, navigate, txDate, walletId])

  // ── derived values for summary line
  const selectedSubLabel = subs.find(s => s.id === selectedSub)?.label ?? null
  const showSummary      = selectedSubLabel !== null || walletLabel !== ''

  // ── TRAY CONTENT ───────────────────────────────────────────────────────────────────────────────
  const renderTrayContent = () => {
    if (activePanel === 'note') return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: `1px solid ${accent}25`,
      }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>✏️</span>
        <input
          ref={noteInputRef}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note…"
          maxLength={120}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 14, color: '#F5F5F5', fontWeight: 500,
          }}
        />
        {note && (
          <button onClick={() => setNote('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}
          >✕</button>
        )}
      </div>
    )

    if (activePanel === 'wallet') return (
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${accent}25` }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: `${accent}88`, marginBottom: 8 }}>Select wallet</p>
        {walletsLoading ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
        ) : wallets.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No wallets found. Add one in Wallet &amp; Credit.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {wallets.map(w => (
              <motion.button key={w.id} whileTap={{ scale: 0.92 }}
                onClick={() => { setWalletId(w.id); setWalletLabel(w.label); setActivePanel(null) }}
                style={{
                  padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: walletId === w.id ? accent : 'rgba(255,255,255,0.08)',
                  color: walletId === w.id ? '#000' : '#F5F5F5',
                }}
              >{w.label}</motion.button>
            ))}
          </div>
        )}
      </div>
    )

    if (activePanel === 'calendar') return (
      <div style={{ padding: '10px 14px 14px', borderBottom: `1px solid ${accent}25` }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
          {pickerYears.map(y => (
            <motion.button key={y} whileTap={{ scale: 0.92 }}
              onClick={() => applyDate(y, pickerM, pickerD)}
              style={{
                flexShrink: 0, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: pickerY === y ? accent : 'rgba(255,255,255,0.07)',
                color: pickerY === y ? '#000' : 'rgba(255,255,255,0.55)',
              }}
            >{y}</motion.button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, overflowX: 'auto' }}>
          {MONTH_NAMES.map((mn, idx) => (
            <motion.button key={mn} whileTap={{ scale: 0.92 }}
              onClick={() => applyDate(pickerY, idx, pickerD)}
              style={{
                flexShrink: 0, padding: '4px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: pickerM === idx ? accent : 'rgba(255,255,255,0.07)',
                color: pickerM === idx ? '#000' : 'rgba(255,255,255,0.55)',
              }}
            >{mn}</motion.button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {pickerDays.map(d => (
            <motion.button key={d} whileTap={{ scale: 0.88 }}
              onClick={() => applyDate(pickerY, pickerM, d)}
              style={{
                height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: pickerD === d ? accent : 'rgba(255,255,255,0.05)',
                color: pickerD === d ? '#000' : 'rgba(255,255,255,0.60)',
              }}
            >{d}</motion.button>
          ))}
        </div>
      </div>
    )

    return null
  }

  // ── NOT FOUND ─────────────────────────────────────────────────────────────────────────────────
  if (!category) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12 }}>
        <p style={{ fontSize: 40 }}>🤔</p>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)' }}>Category not found</p>
        <button onClick={() => navigate(-1)}
          style={{ marginTop: 8, padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#F5F5F5', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >Go back</button>
      </div>
    )
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Accent glow bg */}
      <div style={{
        position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: '160vw', height: '60vw', borderRadius: '50%',
        background: `radial-gradient(ellipse, ${glow.replace('0.22', '0.18')} 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── HEADER — back button + category icon & name, left-aligned together ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center',
        paddingLeft: 16, paddingRight: 16,
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        paddingBottom: 4,
        flex: '0 0 auto',
        gap: 10,
      }}>
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate(-1)}
          style={{
            width: 38, height: 38, borderRadius: 13,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: category.bg, border: `1px solid ${accent}35`,
            boxShadow: `0 2px 10px ${glow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          }}>{category.icon}</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: accent }}>{category.label}</p>
        </div>
      </div>

      {/* ── AMOUNT DISPLAY — grows to fill remaining space ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        flex: '1 1 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '8px 24px',
        minHeight: 0,
      }}>
        {/* Amount number */}
        <motion.p
          key={formattedDisplay}
          initial={{ opacity: 0.6, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.14 }}
          style={{
            fontSize: amountValue === 0 ? 46 : Math.max(30, 50 - Math.max(0, raw.length - 4) * 3),
            fontWeight: 900,
            color: amountValue === 0 ? 'rgba(255,255,255,0.18)' : accent,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            textShadow: amountValue > 0 ? `0 0 32px ${glow.replace('0.22','0.55')}` : 'none',
            transition: 'color 0.2s, text-shadow 0.2s',
          }}
        >
          {formattedDisplay}
        </motion.p>

        {/* ── SUMMARY LINE — subcategory + wallet, shown below amount when either is chosen ── */}
        <AnimatePresence>
          {showSummary && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'flex', flexDirection: 'row', alignItems: 'center',
                gap: 6,
                marginTop: 10,
              }}
            >
              {selectedSubLabel && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: accent,
                  background: `${accent}18`,
                  border: `1px solid ${accent}30`,
                  borderRadius: 999,
                  padding: '3px 10px',
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                }}>
                  {selectedSubLabel}
                </span>
              )}
              {walletLabel && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: 'rgba(255,255,255,0.55)',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                }}>
                  {walletLabel}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── SUBCATEGORY CHIPS — left-aligned, pinned directly above toolbar card ── */}
      {subs.length > 0 && (
        <div style={{
          position: 'relative', zIndex: 2,
          flex: '0 0 auto',
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'flex-start',
          gap: 6,
          paddingLeft: 16, paddingRight: 16,
          paddingBottom: 10,
        }}>
          {subs.map(s => (
            <motion.button key={s.id} whileTap={{ scale: 0.90 }}
              onClick={() => setSelectedSub(prev => prev === s.id ? null : s.id)}
              style={{
                padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                background: selectedSub === s.id ? accent : `${accent}15`,
                color: selectedSub === s.id ? '#000' : accent,
                boxShadow: selectedSub === s.id ? `0 0 10px ${glow}` : 'none',
                transition: 'all 0.15s',
              }}
            >{s.label}</motion.button>
          ))}
        </div>
      )}

      {/* ── TOOLBAR CARD ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        flex: '0 0 auto',
        margin: '0 16px',
      }}>
        <div style={{
          background: 'rgba(18,16,10,0.92)',
          border: `1px solid ${accent}20`,
          borderRadius: 20,
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
          boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${accent}0A`,
        }}>
          <AnimatePresence initial={false}>
            {activePanel && (
              <motion.div
                key={activePanel}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                {renderTrayContent()}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '7px 12px',
            gap: 5,
          }}>
            <ToolbarBtn
              active={activePanel === 'note'}
              accent={accent}
              onClick={() => togglePanel('note')}
              label={note || 'Note'}
              icon="✏️"
              filled={!!note}
            />
            <ToolbarBtn
              active={activePanel === 'wallet'}
              accent={accent}
              onClick={() => togglePanel('wallet')}
              label={walletLabel || 'Wallet'}
              icon="👛"
              filled={!!walletId}
            />
            <ToolbarBtn
              active={activePanel === 'calendar'}
              accent={accent}
              onClick={() => togglePanel('calendar')}
              label={dateLabel}
              icon="📅"
              filled={!isToday}
            />
          </div>
        </div>
      </div>

      {/* ── NUMPAD + CONFIRM — unified bottom block ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        flex: '0 0 auto',
        display: 'flex', flexDirection: 'column', gap: 0,
        padding: '8px 16px 0',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateRows: 'repeat(4, 52px)',
          gap: 5,
          marginBottom: 8,
        }}>
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
              {row.map(k => (
                <motion.button
                  key={k}
                  whileTap={{ scale: 0.88, backgroundColor: `${accent}22` }}
                  onClick={() => handleKey(k)}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    background: k === '⌫' ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.055)',
                    border: `1px solid ${
                      k === '⌫' ? 'rgba(248,113,113,0.18)'
                      : k === '.' ? `${accent}22`
                      : 'rgba(255,255,255,0.07)'
                    }`,
                    cursor: 'pointer',
                    fontSize: k === '⌫' ? 17 : 20,
                    fontWeight: k === '⌫' ? 600 : 700,
                    color: k === '⌫' ? '#F87171'
                      : k === '.' ? accent
                      : '#F5F5F5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >{k}</motion.button>
              ))}
            </div>
          ))}
        </div>

        <motion.button
          whileTap={canConfirm ? { scale: 0.97 } : {}}
          onClick={handleConfirm}
          disabled={!canConfirm || saving}
          style={{
            width: '100%', height: 54,
            borderRadius: 18,
            background: confirmBg,
            border: confirmBorder,
            cursor: canConfirm ? 'pointer' : 'default',
            fontSize: 15, fontWeight: 800,
            color: confirmTextColor,
            opacity: confirmOpacity,
            boxShadow: confirmShadow,
            transition: 'all 0.25s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-block', fontSize: 16 }}
              >⟳</motion.span>
              Saving…
            </>
          ) : success ? (
            <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} style={{ fontSize: 18 }}>✅</motion.span>
          ) : 'Confirm'}
        </motion.button>

        {errMsg && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 11, color: '#F87171', textAlign: 'center', marginTop: 6 }}
          >{errMsg}</motion.p>
        )}
      </div>

    </div>
  )
}

// ── Toolbar button component ──────────────────────────────────────────────────────────────────────────────
interface ToolbarBtnProps {
  active: boolean
  accent: string
  onClick: () => void
  label: string
  icon: string
  filled: boolean
}
function ToolbarBtn({ active, accent, onClick, label, icon, filled }: ToolbarBtnProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.90 }}
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '6px 8px',
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        background: active
          ? `${accent}22`
          : filled ? `${accent}11` : 'rgba(255,255,255,0.04)',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: active ? accent : filled ? `${accent}CC` : 'rgba(255,255,255,0.35)',
        maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</span>
    </motion.button>
  )
}
