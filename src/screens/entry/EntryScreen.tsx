import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCategories } from '../../hooks/useCategories'
import { useWallets } from '../../hooks/useWallets'
import { useTransactions } from '../../hooks/useTransactions'
import { useUser } from '../../context/UserContext'

const KEY_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
]
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/*
  FINAL LOCKED LAYOUT ─ bottom section renders top→bottom:

    [AMOUNT ZONE — flex:1]   big number + status chips + error
    ─────────────── BOTTOM (never moves) ───────────────
    1. SUBCATEGORY CHIPS      (always visible)
    2. PANEL TRAY             (note/wallet/calendar — expands above toolbar)
       └─ tray inner div has paddingBottom:12px + marginBottom:-12px
          so its background physically slides BEHIND the toolbar row,
          hiding any seam or cut-corner gap. Toolbar sits on top via zIndex.
    3. TOOLBAR                (Note · Wallet · Calendar)
    4. NUMPAD
    5. CONFIRM
*/

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

  const formattedDisplay = (() => {
    const [int, dec] = raw.split('.')
    const intFormatted = parseInt(int || '0', 10).toLocaleString('en-IN')
    return dec !== undefined ? `₹${intFormatted}.${dec}` : `₹${intFormatted}`
  })()

  const today   = new Date()
  const isToday = txDate.getDate() === today.getDate() &&
    txDate.getMonth() === today.getMonth() &&
    txDate.getFullYear() === today.getFullYear()
  const dateLabel = isToday
    ? 'Today'
    : `${txDate.getDate()} ${MONTH_NAMES[txDate.getMonth()]} ${txDate.getFullYear()}`

  const selectedSubLabel = subs.find(s => s.id === selectedSub)?.label ?? ''

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
        amount: amountValue,
        description: descParts.join(' · ') || category.label,
        category: category.label,
        created_by: activeUser,
        type: (type as 'income' | 'expense') ?? 'expense',
      })
      setSaving(false); setSuccess(true)
      setTimeout(() => navigate(-1), 1500)
    } catch (e) {
      setSaving(false)
      setErrMsg(e instanceof Error ? e.message : 'Failed to save. Try again.')
    }
  }, [canConfirm, category, activeUser, selectedSub, note, subs, addTransaction, amountValue, type, navigate])

  // ──────────────────────── PANEL TRAY CONTENT ────────────────────────
  const renderTray = () => {
    if (activePanel === 'note') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingInline: 4 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>✏️</span>
        <input
          ref={noteInputRef}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note…"
          maxLength={120}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 14, fontWeight: 500, color: '#F5F5F5', caretColor: accent,
          }}
        />
        {note && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setNote('')}
            style={{
              background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: '50%',
              width: 22, height: 22, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: 'rgba(255,255,255,0.55)',
            }}
          >×</motion.button>
        )}
      </div>
    )

    if (activePanel === 'wallet') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
        }}>Select Wallet / Card</div>
        {walletsLoading ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>Loading…</div>
        ) : wallets.length === 0 ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            No wallets yet — add them in{' '}
            <span style={{ color: accent, fontWeight: 700 }}>Wallet &amp; Credit</span>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {wallets.map(w => {
              const sel = walletId === w.id
              return (
                <motion.button
                  key={w.id}
                  whileTap={{ scale: 0.91 }}
                  onClick={() => { setWalletId(w.id); setWalletLabel(w.label); setActivePanel(null) }}
                  style={{
                    height: 34, paddingInline: 13, borderRadius: 20,
                    border: `1px solid ${sel ? accent : 'rgba(255,255,255,0.14)'}`,
                    background: sel
                      ? `linear-gradient(135deg, ${accent}33, ${accent}18)`
                      : 'rgba(255,255,255,0.06)',
                    color: sel ? accent : 'rgba(255,255,255,0.65)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                    boxShadow: sel ? `0 0 10px ${accent}28` : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{w.type === 'credit' ? '💳' : '👛'}</span>
                  {w.label}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    )

    if (activePanel === 'calendar') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {pickerYears.map(yr => (
            <motion.button key={yr} whileTap={{ scale: 0.88 }}
              onClick={() => applyDate(yr, pickerM, pickerD)}
              style={{
                height: 26, minWidth: 50, borderRadius: 8,
                border: `1px solid ${pickerY === yr ? accent : 'rgba(255,255,255,0.10)'}`,
                background: pickerY === yr ? `${accent}28` : 'rgba(255,255,255,0.05)',
                color: pickerY === yr ? accent : 'rgba(255,255,255,0.42)',
                fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.02em',
              }}
            >{yr}</motion.button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {MONTH_NAMES.map((mn, i) => (
            <motion.button key={mn} whileTap={{ scale: 0.88 }}
              onClick={() => applyDate(pickerY, i, pickerD)}
              style={{
                flexShrink: 0, height: 28, minWidth: 38, borderRadius: 9,
                border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: pickerM === i ? `${accent}38` : 'rgba(255,255,255,0.06)',
                color: pickerM === i ? accent : 'rgba(255,255,255,0.45)',
                boxShadow: pickerM === i ? `0 0 8px ${accent}33` : 'none',
              }}
            >{mn}</motion.button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {pickerDays.map(dd => (
            <motion.button key={dd} whileTap={{ scale: 0.85 }}
              onClick={() => applyDate(pickerY, pickerM, dd)}
              style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 9,
                border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: pickerD === dd
                  ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                  : 'rgba(255,255,255,0.06)',
                color: pickerD === dd ? '#000' : 'rgba(255,255,255,0.50)',
                boxShadow: pickerD === dd ? `0 2px 8px ${accent}44` : 'none',
              }}
            >{dd}</motion.button>
          ))}
        </div>
      </div>
    )

    return null
  }

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
        position: 'relative', zIndex: 1, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 'env(safe-area-inset-top, 16px)',
        paddingInline: 20, paddingBottom: 12,
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

      {/* ──────────────────── AMOUNT ZONE (flex:1) ──────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingInline: 16, overflow: 'hidden',
      }}>
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
            lineHeight: 1, flexShrink: 0,
            transition: 'font-size 0.15s ease, color 0.2s ease',
          }}
        >{formattedDisplay}</motion.div>

        <AnimatePresence>
          {(walletLabel || selectedSubLabel) && (
            <motion.div
              key="status-row"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              style={{ marginTop: 12, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {walletLabel && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', borderRadius: 20,
                  background: `${accent}18`, border: `1px solid ${accent}33`, flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12 }}>💳</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{walletLabel}</span>
                </div>
              )}
              {selectedSubLabel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px', borderRadius: 20,
                    background: `${accent}22`, border: `1px solid ${accent}55`, flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{selectedSubLabel}</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errMsg && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                marginTop: 10, flexShrink: 0,
                fontSize: 12, fontWeight: 600, color: '#F87171',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, padding: '5px 14px',
              }}
            >{errMsg}</motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ───────────────── BOTTOM ───────────────── */}
      <div style={{
        position: 'relative', zIndex: 1, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      }}>

        {/* ── 1. SUBCATEGORY CHIPS ── */}
        {subs.length > 0 && (
          <div style={{
            paddingInline: 16, paddingTop: 4, paddingBottom: 6,
            display: 'flex', flexWrap: 'wrap', gap: 6,
          }}>
            {subs.map(sub => {
              const sel = selectedSub === sub.id
              return (
                <motion.button
                  key={sub.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelectedSub(sel ? null : sub.id)}
                  style={{
                    height: 28, paddingInline: 12, borderRadius: 20,
                    border: `1px solid ${sel ? accent : 'rgba(255,255,255,0.13)'}`,
                    background: sel
                      ? `linear-gradient(135deg, ${accent}33, ${accent}18)`
                      : 'rgba(255,255,255,0.05)',
                    color: sel ? accent : 'rgba(255,255,255,0.58)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                    boxShadow: sel ? `0 0 8px ${accent}28` : 'none',
                  }}
                >{sub.label}</motion.button>
              )
            })}
          </div>
        )}

        {/*
          ── 2. PANEL TRAY ──
          KEY TECHNIQUE:
            The inner div uses  paddingBottom: 12  +  marginBottom: -12
            This means the tray's background colour extends 12px BELOW its
            visible content area, physically sliding behind the toolbar row.
            The toolbar row sits on top via  position:relative / zIndex:2.
            Result: the tray and toolbar share a seamless, curved-corner
            junction with zero visible gap or cut edge.
        */}
        <AnimatePresence>
          {activePanel !== null && (
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, scaleY: 0.7, originY: 1 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.7 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{
                transformOrigin: 'bottom',
                // overflow visible so the -12px bleed can show
                overflow: 'visible',
                position: 'relative', zIndex: 1,
              }}
            >
              <div style={{
                marginInline: 16,
                // Bleed: extends 12px below its content, underneath the toolbar
                paddingBottom: 12,
                marginBottom: -12,
                padding: '10px 14px 12px',
                borderRadius: '14px 14px 0 0',
                border: `1px solid ${accent}40`,
                borderBottom: 'none',
                background: `linear-gradient(180deg, ${accent}12 0%, ${accent}06 100%)`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}>
                {renderTray()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/*
          ── 3. TOOLBAR ──
          position:relative + zIndex:2 ensures toolbar renders ON TOP of
          the tray's -12px bleed, so only the background bleeds through,
          not the tray content.
        */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', gap: 7,
          paddingInline: 16, paddingBottom: 6,
        }}>
          {([
            { id: 'note'     as const, icon: '✏️', label: note ? `“${note.slice(0, 13)}${note.length > 13 ? '…' : ''}”` : 'Note' },
            { id: 'wallet'   as const, icon: '💳', label: walletLabel || 'Wallet' },
            { id: 'calendar' as const, icon: '📅', label: dateLabel },
          ] as const).map(btn => {
            const isActive = activePanel === btn.id
            const isDone   = (btn.id === 'note' && !!note) || (btn.id === 'wallet' && !!walletId)
            return (
              <motion.button
                key={btn.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => togglePanel(btn.id)}
                style={{
                  flex: 1, height: 36, cursor: 'pointer',
                  borderRadius: isActive ? '0 0 11px 11px' : 11,
                  border: `1px solid ${
                    isActive ? accent
                    : isDone  ? `${accent}55`
                    : 'rgba(255,255,255,0.10)'
                  }`,
                  // Remove top border when tray is overlapping from above
                  borderTop: isActive ? 'none' : undefined,
                  background: isActive
                    ? `linear-gradient(180deg, ${accent}22 0%, ${accent}12 100%)`
                    : isDone ? `${accent}10` : 'rgba(255,255,255,0.04)',
                  color: isActive ? accent : isDone ? `${accent}cc` : 'rgba(255,255,255,0.45)',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap', overflow: 'hidden', paddingInline: 6,
                  transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{btn.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 70 }}>
                  {btn.label}
                </span>
              </motion.button>
            )
          })}
        </div>

        {/* ── 4. NUMPAD ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 7, paddingInline: 16, paddingBottom: 8,
        }}>
          {KEY_ROWS.flat().map(k => (
            <motion.button
              key={k}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleKey(k)}
              style={{
                height: 56, borderRadius: 15, border: 'none',
                background: k === '⌫'
                  ? `${accent}18`
                  : k === '.' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.07)',
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

        {/* ── 5. CONFIRM BUTTON ── */}
        <div style={{ paddingInline: 16, paddingBottom: 8 }}>
          <AnimatePresence>
            {success ? (
              <motion.div
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  height: 54, borderRadius: 17,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, fontWeight: 800, color: '#fff', gap: 8,
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
                  width: '100%', height: 54, borderRadius: 17,
                  border: confirmBorder, background: confirmBg,
                  color: confirmTextColor, fontSize: 15, fontWeight: 800,
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
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${accent}44`, borderTopColor: accent,
                    }}
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

      </div>{/* end BOTTOM */}
    </div>
  )
}
