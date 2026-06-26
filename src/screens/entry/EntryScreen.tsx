import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCategories } from '../../hooks/useCategories'
import { useWallets } from '../../hooks/useWallets'
import { useTransactions } from '../../hooks/useTransactions'
import { useUser } from '../../context/UserContext'

// ─── Key layout ──────────────────────────────────────────────────────────────
const KEY_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
]

// ─── Inline Date Picker ───────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function DatePickerPanel({
  value,
  onChange,
  accent,
}: {
  value: Date
  onChange: (d: Date) => void
  accent: string
}) {
  const [y, setY] = useState(value.getFullYear())
  const [m, setM] = useState(value.getMonth())
  const [d, setD] = useState(value.getDate())

  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const confirm = useCallback((dy: number, dm: number, dd: number) => {
    const safe = Math.min(dd, new Date(dy, dm + 1, 0).getDate())
    setD(safe)
    onChange(new Date(dy, dm, safe))
  }, [onChange])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 18,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent}33`,
        padding: '14px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {MONTH_NAMES.map((mn, i) => (
          <motion.button
            key={mn}
            whileTap={{ scale: 0.88 }}
            onClick={() => { setM(i); confirm(y, i, d) }}
            style={{
              flexShrink: 0, height: 32, minWidth: 44, borderRadius: 10,
              border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: m === i ? `${accent}33` : 'rgba(255,255,255,0.05)',
              color: m === i ? accent : 'rgba(255,255,255,0.50)',
            }}
          >{mn}</motion.button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
        {days.map(dd2 => (
          <motion.button
            key={dd2}
            whileTap={{ scale: 0.85 }}
            onClick={() => { setD(dd2); confirm(y, m, dd2) }}
            style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: 10,
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: d === dd2 ? `linear-gradient(135deg,${accent},${accent}bb)` : 'rgba(255,255,255,0.05)',
              color: d === dd2 ? '#000' : 'rgba(255,255,255,0.55)',
              boxShadow: d === dd2 ? `0 2px 8px ${accent}55` : 'none',
            }}
          >{dd2}</motion.button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {years.map(yr => (
          <motion.button
            key={yr}
            whileTap={{ scale: 0.88 }}
            onClick={() => { setY(yr); confirm(yr, m, d) }}
            style={{
              height: 28, minWidth: 52, borderRadius: 8,
              border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: y === yr ? `${accent}33` : 'rgba(255,255,255,0.05)',
              color: y === yr ? accent : 'rgba(255,255,255,0.45)',
            }}
          >{yr}</motion.button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Wallet Panel ─────────────────────────────────────────────────────────────
function WalletPanel({
  wallets, loading, selectedId, onSelect, accent,
}: {
  wallets: { id: string; label: string; type: 'cash' | 'credit'; balance: number; owner: string }[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string, label: string) => void
  accent: string
}) {
  const walletIcon = (type: 'cash' | 'credit') => type === 'credit' ? '💳' : '👛'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 18, background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent}33`, padding: '14px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', marginBottom: 2 }}>
        SELECT WALLET / CARD
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '8px 0' }}>Loading…</div>
      ) : wallets.length === 0 ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '8px 0', lineHeight: 1.5 }}>
          No wallets yet. Add them in the<br />
          <span style={{ color: accent, fontWeight: 700 }}>Wallet &amp; Credit</span> screen.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {wallets.map(w => (
            <motion.button
              key={w.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(w.id, w.label)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 12,
                border: `1px solid ${selectedId === w.id ? accent : 'rgba(255,255,255,0.08)'}`,
                background: selectedId === w.id ? `${accent}18` : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16 }}>{walletIcon(w.type)}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: selectedId === w.id ? accent : '#F5F5F5' }}>{w.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 1 }}>
                  {w.type === 'credit' ? 'Credit Card' : 'Cash / UPI'} · {w.owner}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
                ₹{w.balance.toLocaleString('en-IN')}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Main EntryScreen ─────────────────────────────────────────────────────────
export function EntryScreen() {
  const navigate = useNavigate()
  const { type, categoryId } = useParams<{ type: string; categoryId: string }>()
  const { activeUser } = useUser()
  const { expenseCategories, incomeCategories, subcategories } = useCategories()
  const { wallets, loading: walletsLoading } = useWallets()
  const { addTransaction } = useTransactions()

  const allCategories = [...expenseCategories, ...incomeCategories]
  const category = allCategories.find(c => c.id === categoryId)
  const subs = category ? (subcategories[category.id] ?? []) : []
  const accent = category?.accent ?? '#FBBF24'
  const glow   = category?.glow   ?? 'rgba(251,191,36,0.22)'

  const [raw, setRaw]                   = useState('0')
  const [selectedSub, setSelectedSub]   = useState<string | null>(null)
  const [note, setNote]                 = useState('')
  const [txDate, setTxDate]             = useState(new Date())
  const [walletId, setWalletId]         = useState<string | null>(null)
  const [walletLabel, setWalletLabel]   = useState('')
  const [activePanel, setActivePanel]   = useState<'note' | 'wallet' | 'calendar' | null>(null)
  const [saving, setSaving]             = useState(false)
  const [success, setSuccess]           = useState(false)
  const [errMsg, setErrMsg]             = useState<string | null>(null)

  const togglePanel = (p: 'note' | 'wallet' | 'calendar') =>
    setActivePanel(prev => (prev === p ? null : p))

  const noteRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (activePanel === 'note') setTimeout(() => noteRef.current?.focus(), 80)
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

  const amountValue  = parseFloat(raw) || 0
  const hasAmount    = amountValue > 0
  const hasWallet    = walletId !== null
  const hasSub       = selectedSub !== null
  const subRequired  = subs.length > 0
  const canConfirm   = hasAmount && hasWallet && (!subRequired || hasSub)

  // Progressive confirm button glow (0–3 readiness levels)
  const readinessLevel      = (hasAmount ? 1 : 0) + (hasWallet ? 1 : 0) + (!subRequired || hasSub ? 1 : 0)
  const confirmOpacity      = [0.18, 0.42, 0.70, 1][readinessLevel]
  const confirmGlowStrength = [0, 0.15, 0.35, 1][readinessLevel]
  const confirmBg = readinessLevel === 3
    ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
    : readinessLevel === 2 ? `linear-gradient(135deg, ${accent}88, ${accent}55)`
    : readinessLevel === 1 ? `${accent}22`
    : 'rgba(255,255,255,0.05)'
  const confirmBorder = readinessLevel === 3
    ? 'none'
    : `1px solid ${accent}${readinessLevel === 2 ? '44' : readinessLevel === 1 ? '28' : '12'}`
  const confirmTextColor = readinessLevel === 3 ? '#000'
    : readinessLevel === 2 ? accent
    : readinessLevel === 1 ? `${accent}99`
    : 'rgba(255,255,255,0.20)'
  const confirmShadow = readinessLevel >= 1
    ? `0 3px ${8 + readinessLevel * 10}px ${glow.replace(')', `, ${confirmGlowStrength})`).replace('rgba(', 'rgba(')}`
    : 'none'

  const formattedDisplay = (() => {
    const [int, dec] = raw.split('.')
    const intFormatted = parseInt(int || '0', 10).toLocaleString('en-IN')
    return dec !== undefined ? `₹${intFormatted}.${dec}` : `₹${intFormatted}`
  })()

  const today = new Date()
  const isToday = txDate.getDate() === today.getDate() &&
    txDate.getMonth() === today.getMonth() &&
    txDate.getFullYear() === today.getFullYear()
  const dateLabel = isToday
    ? 'Today'
    : `${txDate.getDate()} ${MONTH_NAMES[txDate.getMonth()]} ${txDate.getFullYear()}`

  // The selected subcategory label (for inline chip display below amount)
  const selectedSubLabel = subs.find(s => s.id === selectedSub)?.label ?? ''

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return
    if (!category || !activeUser) { setErrMsg('Session error. Go back and try again.'); return }
    setSaving(true)
    setErrMsg(null)
    const subLabel = subs.find(s => s.id === selectedSub)?.label ?? ''
    const descParts = [subLabel, note].filter(Boolean)
    try {
      await addTransaction({
        amount: amountValue,
        description: descParts.join(' · ') || category.label,
        category: category.label,
        created_by: activeUser,
        type: (type as 'income' | 'expense') ?? 'expense',
      })
      setSaving(false)
      setSuccess(true)
      setTimeout(() => navigate(-1), 1500)
    } catch (e) {
      setSaving(false)
      setErrMsg(e instanceof Error ? e.message : 'Failed to save. Try again.')
    }
  }, [canConfirm, category, activeUser, selectedSub, note, subs, addTransaction, amountValue, type, navigate])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 280,
        background: `radial-gradient(ellipse at center, ${accent}28 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── HEADER ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 'env(safe-area-inset-top, 16px)',
        paddingInline: 20, paddingBottom: 12, flexShrink: 0,
      }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate(-1)}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, color: '#fff', fontSize: 18,
          }}
          aria-label="Go back"
        >←</motion.button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          {category && (
            <div style={{
              width: 36, height: 36, borderRadius: 11, background: category.bg,
              border: `1px solid ${accent}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>{category.icon}</div>
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
              {category?.label ?? 'New Entry'}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {type === 'income' ? 'Income' : 'Expense'} · {activeUser}
            </div>
          </div>
        </div>

        <div style={{
          padding: '5px 10px', borderRadius: 10,
          background: `${accent}18`, border: `1px solid ${accent}33`,
          fontSize: 11, fontWeight: 700, color: accent,
        }}>{dateLabel}</div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          AMOUNT ZONE  (flex:1 — absorbs all leftover height)
          • Big amount display
          • Inline status chips (wallet + selected sub) below amount
          • Error message
          • ▼ EXPAND PANELS open here — slides into this space, never compresses bottom
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingInline: 16, paddingBottom: 8,
        minHeight: 0, overflow: 'hidden',
      }}>

        {/* Big amount */}
        <motion.div
          key={raw}
          initial={{ scale: 0.96, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: raw.length > 8 ? 42 : raw.length > 6 ? 52 : 64,
            fontWeight: 900,
            color: amountValue > 0 ? accent : 'rgba(255,255,255,0.20)',
            letterSpacing: '-0.03em',
            textShadow: amountValue > 0 ? `0 0 40px ${glow}, 0 0 80px ${glow}` : 'none',
            lineHeight: 1,
            transition: 'font-size 0.15s ease, color 0.2s ease',
            flexShrink: 0,
          }}
        >{formattedDisplay}</motion.div>

        {/*
          ── INLINE STATUS ROW: wallet chip + selected sub chip in one line ──
          Appears below the amount as soon as either is set.
        */}
        <AnimatePresence>
          {(walletLabel || selectedSubLabel) && (
            <motion.div
              key="status-row"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              style={{
                marginTop: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center',
                gap: 6, flexWrap: 'nowrap',
              }}
            >
              {walletLabel && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', borderRadius: 20,
                  background: `${accent}18`, border: `1px solid ${accent}33`,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12 }}>💳</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{walletLabel}</span>
                </div>
              )}
              {selectedSubLabel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px', borderRadius: 20,
                    background: `${accent}22`, border: `1px solid ${accent}55`,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{selectedSubLabel}</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {errMsg && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                marginTop: 10, flexShrink: 0,
                fontSize: 12, fontWeight: 600,
                color: '#F87171', background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '5px 14px',
              }}
            >{errMsg}</motion.div>
          )}
        </AnimatePresence>

        {/*
          ── EXPAND PANELS — float here in the amount zone ──
          They open UPWARD into this flex space.
          The bottom section (toolbar → subcats → numpad → confirm) NEVER moves.
        */}
        <AnimatePresence mode="wait">
          {activePanel !== null && (
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                width: '100%', marginTop: 16, flexShrink: 0,
              }}
            >
              {activePanel === 'note' && (
                <textarea
                  ref={noteRef}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note for this transaction…"
                  maxLength={200}
                  rows={2}
                  style={{
                    width: '100%', borderRadius: 16, padding: '12px 14px',
                    fontSize: 13, fontWeight: 500,
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${accent}44`,
                    color: '#F5F5F5', outline: 'none', resize: 'none',
                    lineHeight: 1.5, caretColor: accent,
                  }}
                />
              )}
              {activePanel === 'wallet' && (
                <WalletPanel
                  wallets={wallets} loading={walletsLoading}
                  selectedId={walletId}
                  onSelect={(id, label) => {
                    setWalletId(id); setWalletLabel(label); setActivePanel(null)
                  }}
                  accent={accent}
                />
              )}
              {activePanel === 'calendar' && (
                <DatePickerPanel
                  value={txDate}
                  onChange={d => { setTxDate(d); setActivePanel(null) }}
                  accent={accent}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM SECTION — FIXED HEIGHT, NEVER MOVES
          Order (top → bottom):
            1. ACTION TOOLBAR  (Note · Wallet · Calendar)
            2. SUBCATEGORY CHIPS  (below toolbar, right above numpad)
            3. NUMPAD
            4. CONFIRM BUTTON
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', zIndex: 1, flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }}>

        {/* ── 1. ACTION TOOLBAR (Note · Wallet · Calendar) ── */}
        <div style={{ display: 'flex', gap: 8, paddingInline: 16, paddingBottom: 8 }}>
          {([
            { id: 'note'     as const, icon: '✏️', label: note ? 'Note ✓' : 'Note' },
            { id: 'wallet'   as const, icon: '💳', label: walletLabel || 'Wallet' },
            { id: 'calendar' as const, icon: '📅', label: dateLabel },
          ] as const).map(btn => {
            const isActive = activePanel === btn.id
            const isDone = (btn.id === 'note' && !!note) || (btn.id === 'wallet' && !!walletId)
            return (
              <motion.button
                key={btn.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => togglePanel(btn.id)}
                style={{
                  flex: 1, height: 38, borderRadius: 12,
                  border: `1px solid ${isActive ? accent : isDone ? `${accent}55` : 'rgba(255,255,255,0.10)'}`,
                  background: isActive ? `${accent}22` : isDone ? `${accent}10` : 'rgba(255,255,255,0.04)',
                  color: isActive ? accent : isDone ? `${accent}cc` : 'rgba(255,255,255,0.50)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  letterSpacing: '0.02em', transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap', overflow: 'hidden', paddingInline: 6,
                }}
              >
                <span style={{ fontSize: 13 }}>{btn.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 70 }}>{btn.label}</span>
              </motion.button>
            )
          })}
        </div>

        {/* ── 2. SUBCATEGORY CHIPS — below toolbar, right above numpad ── */}
        {subs.length > 0 && (
          <div style={{
            paddingInline: 16, paddingBottom: 8,
            display: 'flex', flexWrap: 'wrap', gap: 6,
          }}>
            {subs.map(sub => {
              const isSelected = selectedSub === sub.id
              return (
                <motion.button
                  key={sub.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelectedSub(isSelected ? null : sub.id)}
                  style={{
                    height: 30, paddingInline: 12, borderRadius: 20,
                    border: `1px solid ${isSelected ? accent : 'rgba(255,255,255,0.12)'}`,
                    background: isSelected ? `${accent}22` : 'rgba(255,255,255,0.05)',
                    color: isSelected ? accent : 'rgba(255,255,255,0.60)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                  }}
                >{sub.label}</motion.button>
              )
            })}
          </div>
        )}

        {/* ── 3. NUMPAD ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8, paddingInline: 16, paddingBottom: 8,
        }}>
          {KEY_ROWS.flat().map(k => (
            <motion.button
              key={k}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleKey(k)}
              style={{
                height: 58, borderRadius: 16, border: 'none',
                background: k === '⌫' ? `${accent}18` : k === '.' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.07)',
                color: k === '⌫' ? accent : '#FFFFFF',
                fontSize: k === '⌫' ? 20 : 22,
                fontWeight: k === '⌫' ? 700 : 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.12s ease',
              }}
            >{k}</motion.button>
          ))}
        </div>

        {/* ── 4. CONFIRM BUTTON — always pinned at the bottom ── */}
        <div style={{ paddingInline: 16, paddingBottom: 8 }}>
          <AnimatePresence>
            {success ? (
              <motion.div
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  height: 56, borderRadius: 18,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, color: '#fff', gap: 8,
                  boxShadow: '0 4px 24px rgba(34,197,94,0.4)',
                }}
              >✓ Saved</motion.div>
            ) : (
              <motion.button
                key="confirm"
                whileTap={canConfirm ? { scale: 0.97 } : {}}
                onClick={handleConfirm}
                disabled={saving}
                style={{
                  width: '100%', height: 56, borderRadius: 18,
                  border: confirmBorder, background: confirmBg,
                  color: confirmTextColor, fontSize: 16, fontWeight: 800,
                  cursor: canConfirm ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: confirmShadow, transition: 'all 0.25s ease',
                  opacity: confirmOpacity, letterSpacing: '0.02em',
                }}
              >
                {saving ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${accent}44`, borderTopColor: accent }}
                  />
                ) : (
                  <>
                    <span>{canConfirm ? '✓' : '○'}</span>
                    <span>
                      {!hasAmount ? 'Enter amount'
                        : !hasWallet ? 'Select wallet'
                        : subRequired && !hasSub ? 'Select subcategory'
                        : `Save ₹${amountValue.toLocaleString('en-IN')}`}
                    </span>
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  )
}
