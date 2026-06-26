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
      {/* Month row */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {MONTH_NAMES.map((mn, i) => (
          <motion.button
            key={mn}
            whileTap={{ scale: 0.88 }}
            onClick={() => { setM(i); confirm(y, i, d) }}
            style={{
              flexShrink: 0,
              height: 32, minWidth: 44,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              background: m === i ? `${accent}33` : 'rgba(255,255,255,0.05)',
              color: m === i ? accent : 'rgba(255,255,255,0.50)',
            }}
          >{mn}</motion.button>
        ))}
      </div>
      {/* Day row */}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
        {days.map(dd2 => (
          <motion.button
            key={dd2}
            whileTap={{ scale: 0.85 }}
            onClick={() => { setD(dd2); confirm(y, m, dd2) }}
            style={{
              flexShrink: 0,
              width: 34, height: 34,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12, fontWeight: 700,
              background: d === dd2 ? `linear-gradient(135deg,${accent},${accent}bb)` : 'rgba(255,255,255,0.05)',
              color: d === dd2 ? '#000' : 'rgba(255,255,255,0.55)',
              boxShadow: d === dd2 ? `0 2px 8px ${accent}55` : 'none',
            }}
          >{dd2}</motion.button>
        ))}
      </div>
      {/* Year row */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {years.map(yr => (
          <motion.button
            key={yr}
            whileTap={{ scale: 0.88 }}
            onClick={() => { setY(yr); confirm(yr, m, d) }}
            style={{
              height: 28, minWidth: 52,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
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
  wallets,
  loading,
  selectedId,
  onSelect,
  accent,
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
        borderRadius: 18,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent}33`,
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
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
                padding: '9px 12px',
                borderRadius: 12,
                border: `1px solid ${selectedId === w.id ? accent : 'rgba(255,255,255,0.08)'}`,
                background: selectedId === w.id ? `${accent}18` : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16 }}>{walletIcon(w.type)}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: selectedId === w.id ? accent : '#F5F5F5' }}>
                  {w.label}
                </div>
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

  // ── Derive category ──────────────────────────────────────────────────────
  const allCategories = [...expenseCategories, ...incomeCategories]
  const category = allCategories.find(c => c.id === categoryId)
  const subs = category ? (subcategories[category.id] ?? []) : []

  const accent = category?.accent ?? '#FBBF24'
  const glow   = category?.glow   ?? 'rgba(251,191,36,0.22)'

  // ── Entry state ──────────────────────────────────────────────────────────
  const [raw, setRaw]           = useState('0')
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [note, setNote]         = useState('')
  const [txDate, setTxDate]     = useState(new Date())
  const [walletId, setWalletId] = useState<string | null>(null)
  const [walletLabel, setWalletLabel] = useState('')

  // ── Panel open state (only one at a time) ────────────────────────────────
  const [activePanel, setActivePanel] = useState<'note' | 'wallet' | 'calendar' | null>(null)
  const togglePanel = (p: 'note' | 'wallet' | 'calendar') =>
    setActivePanel(prev => (prev === p ? null : p))

  // ── Save state ───────────────────────────────────────────────────────────
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [errMsg, setErrMsg]   = useState<string | null>(null)

  const noteRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (activePanel === 'note') {
      setTimeout(() => noteRef.current?.focus(), 80)
    }
  }, [activePanel])

  // ── Keypad logic ─────────────────────────────────────────────────────────
  const handleKey = useCallback((k: string) => {
    setRaw(prev => {
      if (k === '⌫') {
        const next = prev.slice(0, -1)
        return next === '' ? '0' : next
      }
      if (k === '.') {
        if (prev.includes('.')) return prev
        return prev + '.'
      }
      if (prev === '0') return k
      if (prev.includes('.')) {
        const [, dec] = prev.split('.')
        if (dec.length >= 2) return prev
      }
      if (prev.replace('.', '').length >= 9) return prev
      return prev + k
    })
  }, [])

  const amountValue = parseFloat(raw) || 0

  // ── Readiness gate ───────────────────────────────────────────────────────
  const hasAmount  = amountValue > 0
  const hasWallet  = walletId !== null
  const hasSub     = selectedSub !== null
  const subRequired = subs.length > 0
  const canConfirm = hasAmount && hasWallet && (!subRequired || hasSub)

  // ── Progressive glow level (0–3) — each param adds one level ────────────
  const readinessLevel = (hasAmount ? 1 : 0) + (hasWallet ? 1 : 0) + (!subRequired || hasSub ? 1 : 0)
  // Maps 0→nearly invisible, 1→faint, 2→medium, 3→full bright
  const confirmOpacity = [0.18, 0.42, 0.70, 1][readinessLevel]
  const confirmGlowStrength = [0, 0.15, 0.35, 1][readinessLevel]
  const confirmBg = readinessLevel === 3
    ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
    : readinessLevel === 2
      ? `linear-gradient(135deg, ${accent}88, ${accent}55)`
      : readinessLevel === 1
        ? `${accent}22`
        : 'rgba(255,255,255,0.05)'
  const confirmBorder = readinessLevel === 3
    ? 'none'
    : `1px solid ${accent}${readinessLevel === 2 ? '44' : readinessLevel === 1 ? '28' : '12'}`
  const confirmTextColor = readinessLevel === 3
    ? '#000'
    : readinessLevel === 2
      ? accent
      : readinessLevel === 1
        ? `${accent}99`
        : 'rgba(255,255,255,0.20)'
  const confirmShadow = readinessLevel >= 1
    ? `0 3px ${8 + readinessLevel * 10}px ${glow.replace(')', `, ${confirmGlowStrength})`).replace('rgba(', 'rgba(')}`
    : 'none'

  // ── Format display ────────────────────────────────────────────────────────
  const formattedDisplay = (() => {
    const [int, dec] = raw.split('.')
    const intFormatted = parseInt(int || '0', 10).toLocaleString('en-IN')
    if (dec !== undefined) return `₹${intFormatted}.${dec}`
    return `₹${intFormatted}`
  })()

  // ── Date display ──────────────────────────────────────────────────────────
  const today = new Date()
  const isToday =
    txDate.getDate() === today.getDate() &&
    txDate.getMonth() === today.getMonth() &&
    txDate.getFullYear() === today.getFullYear()
  const dateLabel = isToday
    ? 'Today'
    : `${txDate.getDate()} ${MONTH_NAMES[txDate.getMonth()]} ${txDate.getFullYear()}`

  // ── Confirm ───────────────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: -80,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 320,
          height: 280,
          background: `radial-gradient(ellipse at center, ${accent}28 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── HEADER ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingTop: 'env(safe-area-inset-top, 16px)',
          paddingInline: 20,
          paddingBottom: 12,
          flexShrink: 0,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate(-1)}
          style={{
            width: 40, height: 40,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            color: '#fff', fontSize: 18,
          }}
          aria-label="Go back"
        >
          ←
        </motion.button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          {category && (
            <div
              style={{
                width: 36, height: 36,
                borderRadius: 11,
                background: category.bg,
                border: `1px solid ${accent}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}
            >
              {category.icon}
            </div>
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

        <div
          style={{
            padding: '5px 10px',
            borderRadius: 10,
            background: `${accent}18`,
            border: `1px solid ${accent}33`,
            fontSize: 11, fontWeight: 700, color: accent,
          }}
        >
          {dateLabel}
        </div>
      </div>

      {/* ── AMOUNT DISPLAY ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingInline: 20,
          paddingBottom: 8,
          minHeight: 0,
        }}
      >
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
          }}
        >
          {formattedDisplay}
        </motion.div>

        {/* ── REQUIREMENT INDICATOR DOTS (dots only, no labels) ── */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
          {/* Dot 1: Amount */}
          <motion.div
            animate={{
              backgroundColor: hasAmount ? accent : 'rgba(255,255,255,0.18)',
              boxShadow: hasAmount ? `0 0 8px ${accent}, 0 0 16px ${accent}66` : 'none',
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ width: 8, height: 8, borderRadius: '50%' }}
          />
          {/* Dot 2: Wallet */}
          <motion.div
            animate={{
              backgroundColor: hasWallet ? accent : 'rgba(255,255,255,0.18)',
              boxShadow: hasWallet ? `0 0 8px ${accent}, 0 0 16px ${accent}66` : 'none',
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ width: 8, height: 8, borderRadius: '50%' }}
          />
          {/* Dot 3: Subcategory — only shown if subs exist */}
          {subRequired && (
            <motion.div
              animate={{
                backgroundColor: hasSub ? accent : 'rgba(255,255,255,0.18)',
                boxShadow: hasSub ? `0 0 8px ${accent}, 0 0 16px ${accent}66` : 'none',
              }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ width: 8, height: 8, borderRadius: '50%' }}
            />
          )}
        </div>

        {/* Wallet chip */}
        <AnimatePresence>
          {walletLabel && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              style={{
                marginTop: 10,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                background: `${accent}18`,
                border: `1px solid ${accent}33`,
              }}
            >
              <span style={{ fontSize: 13 }}>💳</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{walletLabel}</span>
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
                marginTop: 10,
                fontSize: 12, fontWeight: 600,
                color: '#F87171',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10,
                padding: '5px 14px',
              }}
            >
              {errMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM SECTION ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 12px)',
        }}
      >
        {/* ── PANELS ── */}
        <div style={{ paddingInline: 16, paddingBottom: 6 }}>
          <AnimatePresence mode="wait">
            {activePanel === 'note' && (
              <motion.div
                key="note-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <textarea
                  ref={noteRef}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note for this transaction…"
                  maxLength={200}
                  rows={2}
                  style={{
                    width: '100%',
                    borderRadius: 16,
                    padding: '12px 14px',
                    fontSize: 13, fontWeight: 500,
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${accent}44`,
                    color: '#F5F5F5',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.5,
                    caretColor: accent,
                  }}
                />
              </motion.div>
            )}
            {activePanel === 'wallet' && (
              <WalletPanel
                key="wallet-panel"
                wallets={wallets}
                loading={walletsLoading}
                selectedId={walletId}
                onSelect={(id, label) => {
                  setWalletId(id)
                  setWalletLabel(label)
                  setActivePanel(null)
                }}
                accent={accent}
              />
            )}
            {activePanel === 'calendar' && (
              <DatePickerPanel
                key="cal-panel"
                value={txDate}
                onChange={d => {
                  setTxDate(d)
                  setActivePanel(null)
                }}
                accent={accent}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── SUBCATEGORY PILLS ── */}
        {subs.length > 0 && (
          <div
            style={{
              paddingInline: 16,
              paddingBottom: 8,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {subs.map(sub => {
              const isSelected = selectedSub === sub.id
              return (
                <motion.button
                  key={sub.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelectedSub(isSelected ? null : sub.id)}
                  style={{
                    height: 30,
                    paddingInline: 12,
                    borderRadius: 20,
                    border: `1px solid ${isSelected ? accent : 'rgba(255,255,255,0.12)'}`,
                    background: isSelected ? `${accent}22` : 'rgba(255,255,255,0.05)',
                    color: isSelected ? accent : 'rgba(255,255,255,0.60)',
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sub.label}
                </motion.button>
              )
            })}
          </div>
        )}

        {/* ── TOOLBAR ── */}
        <div
          style={{
            paddingInline: 16,
            paddingBottom: 10,
            display: 'flex',
            gap: 8,
          }}
        >
          {/* Note button */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={() => togglePanel('note')}
            style={{
              flex: 1, height: 44,
              borderRadius: 14,
              background: activePanel === 'note' ? `${accent}22` : 'rgba(255,255,255,0.07)',
              border: `1px solid ${activePanel === 'note' ? accent : 'rgba(255,255,255,0.12)'}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>📝</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: activePanel === 'note' ? accent : 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
              {note ? '✓ Note' : 'NOTE'}
            </span>
          </motion.button>

          {/* Wallet button */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={() => togglePanel('wallet')}
            style={{
              flex: 1, height: 44,
              borderRadius: 14,
              background: activePanel === 'wallet' ? `${accent}22` : 'rgba(255,255,255,0.07)',
              border: `1px solid ${activePanel === 'wallet' ? accent : 'rgba(255,255,255,0.12)'}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>💳</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: activePanel === 'wallet' ? accent : 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
              {walletLabel ? walletLabel.slice(0, 8).toUpperCase() : 'WALLET'}
            </span>
          </motion.button>

          {/* Calendar button */}
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={() => togglePanel('calendar')}
            style={{
              flex: 1, height: 44,
              borderRadius: 14,
              background: activePanel === 'calendar' ? `${accent}22` : 'rgba(255,255,255,0.07)',
              border: `1px solid ${activePanel === 'calendar' ? accent : 'rgba(255,255,255,0.12)'}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>📅</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: activePanel === 'calendar' ? accent : 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
              {isToday ? 'TODAY' : `${txDate.getDate()}/${txDate.getMonth() + 1}`}
            </span>
          </motion.button>

          {/* ── CONFIRM BUTTON — progressive glow, no lock icon ── */}
          <motion.button
            whileTap={canConfirm && !saving && !success ? { scale: 0.94 } : {}}
            onClick={() => void handleConfirm()}
            disabled={saving || success}
            style={{
              flex: 2, height: 44,
              borderRadius: 14,
              background: success
                ? 'linear-gradient(135deg,#34D399,#10B981)'
                : saving
                  ? `${accent}88`
                  : confirmBg,
              border: success || saving ? 'none' : confirmBorder,
              color: success
                ? '#000'
                : saving
                  ? '#000'
                  : confirmTextColor,
              fontSize: 13, fontWeight: 900,
              cursor: (saving || success) ? 'not-allowed' : canConfirm ? 'pointer' : 'default',
              boxShadow: success
                ? '0 3px 20px rgba(52,211,153,0.45)'
                : saving
                  ? `0 3px 16px ${glow}`
                  : confirmShadow,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: confirmOpacity,
              transition: 'background 0.3s ease, box-shadow 0.3s ease, color 0.3s ease, opacity 0.3s ease, border 0.3s ease',
            }}
          >
            {success ? (
              <motion.span
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved!
              </motion.span>
            ) : saving ? (
              <span>Saving…</span>
            ) : (
              <>
                {readinessLevel === 3 && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                CONFIRM
              </>
            )}
          </motion.button>
        </div>

        {/* ── KEYPAD ── */}
        <div style={{ paddingInline: 16, paddingBottom: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {KEY_ROWS.map((row, ri) => (
              <div
                key={ri}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
              >
                {row.map(k => (
                  <motion.button
                    key={k}
                    whileTap={{ scale: 0.87, backgroundColor: k === '⌫' ? 'rgba(239,68,68,0.20)' : `${accent}22` }}
                    onClick={() => handleKey(k)}
                    style={{
                      height: 56,
                      borderRadius: 16,
                      background: k === '⌫'
                        ? 'rgba(239,68,68,0.08)'
                        : 'rgba(255,255,255,0.06)',
                      border: k === '⌫'
                        ? '1px solid rgba(239,68,68,0.18)'
                        : '1px solid rgba(255,255,255,0.09)',
                      color: k === '⌫' ? '#F87171' : '#F5F5F5',
                      fontSize: 22,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.12s ease',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}
                  >
                    {k}
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
