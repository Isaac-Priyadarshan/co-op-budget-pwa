import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCategories } from '../../hooks/useCategories'
import { useUser } from '../../context/UserContext'
import { supabase } from '../../lib/supabase'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function DatePickerInline({
  value, onChange,
}: {
  value: Date
  onChange: (d: Date) => void
}) {
  const [y, setY] = useState(value.getFullYear())
  const [m, setM] = useState(value.getMonth())
  const [d, setD] = useState(value.getDate())

  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const confirm = (dy: number, dm: number, dd: number) => {
    const safeD = Math.min(dd, new Date(dy, dm + 1, 0).getDate())
    onChange(new Date(dy, dm, safeD))
    setD(safeD)
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        margin: '8px 0 4px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {/* Month row */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {MONTH_NAMES.map((mn, i) => (
            <motion.button key={mn} whileTap={{ scale: 0.88 }}
              onClick={() => { setM(i); confirm(y, i, d) }}
              style={{
                flexShrink: 0,
                height: 32, minWidth: 44,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: m === i ? 'rgba(251,191,36,0.22)' : 'rgba(255,255,255,0.05)',
                color: m === i ? '#FBBF24' : 'rgba(255,255,255,0.55)',
              }}
            >{mn}</motion.button>
          ))}
        </div>
        {/* Day row */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
          {days.map(dd2 => (
            <motion.button key={dd2} whileTap={{ scale: 0.85 }}
              onClick={() => { setD(dd2); confirm(y, m, dd2) }}
              style={{
                flexShrink: 0,
                width: 34, height: 34,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: d === dd2 ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : 'rgba(255,255,255,0.05)',
                color: d === dd2 ? '#000' : 'rgba(255,255,255,0.55)',
                boxShadow: d === dd2 ? '0 2px 8px rgba(251,191,36,0.4)' : 'none',
              }}
            >{dd2}</motion.button>
          ))}
        </div>
        {/* Year row */}
        <div style={{ display: 'flex', gap: 6 }}>
          {years.map(yr => (
            <motion.button key={yr} whileTap={{ scale: 0.88 }}
              onClick={() => { setY(yr); confirm(yr, m, d) }}
              style={{
                flexShrink: 0,
                height: 30, padding: '0 10px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: y === yr ? 'rgba(251,191,36,0.22)' : 'rgba(255,255,255,0.05)',
                color: y === yr ? '#FBBF24' : 'rgba(255,255,255,0.55)',
              }}
            >{yr}</motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

const KEY_ROWS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['.','0','⌫'],
]

export function EntryScreen() {
  const { type, categoryId } = useParams<{ type: string; categoryId: string }>()
  const navigate = useNavigate()
  const { expenseCategories, incomeCategories, subcategories } = useCategories()
  const { user } = useUser()

  const allCats = type === 'income' ? incomeCategories : expenseCategories
  const category = allCats.find(c => c.id === categoryId)
  const catSubs = category ? (subcategories[category.id] ?? []) : []

  const [amount, setAmount] = useState('0')
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [dateOpen, setDateOpen] = useState(false)
  const [txDate, setTxDate] = useState(new Date())
  const [walletOpen, setWalletOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)

  const accent = category?.accent ?? '#FBBF24'
  const glow = category?.glow ?? 'rgba(251,191,36,0.22)'
  const bg = category?.bg ?? 'rgba(251,191,36,0.08)'

  const handleKey = useCallback((k: string) => {
    if (k === '⌫') {
      setAmount(prev => {
        if (prev.length <= 1) return '0'
        const next = prev.slice(0, -1)
        return next === '' ? '0' : next
      })
      return
    }
    if (k === '.') {
      setAmount(prev => prev.includes('.') ? prev : prev + '.')
      return
    }
    setAmount(prev => {
      if (prev === '0') return k
      if (prev.includes('.')) {
        const [, dec] = prev.split('.')
        if (dec && dec.length >= 2) return prev
      }
      return prev + k
    })
  }, [])

  const handleConfirm = async () => {
    const num = parseFloat(amount)
    if (!num || num <= 0) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    if (!category || !user) return
    setSaving(true)
    const { error } = await supabase.from('transactions').insert({
      amount: num,
      type: type as 'expense' | 'income',
      category: category.label,
      subcategory: selectedSub ?? null,
      description: note.trim() || null,
      created_at: txDate.toISOString(),
      created_by: user.name,
    })
    setSaving(false)
    if (error) return
    setSuccess(true)
    setTimeout(() => navigate(-1), 680)
  }

  const isToday =
    txDate.toDateString() === new Date().toDateString()

  const dateLabel = isToday
    ? 'Today'
    : `${txDate.getDate()} ${MONTH_NAMES[txDate.getMonth()]} ${txDate.getFullYear()}`

  if (!category) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
        Category not found
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0804',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 80,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 12px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: bg, border: `1px solid ${accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: `0 2px 12px ${glow}`,
          }}>
            {category.icon}
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: accent, letterSpacing: '-0.01em' }}>
            {category.label}
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 15,
          }}
        >✕</motion.button>
      </div>

      {/* ── AMOUNT DISPLAY ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
      }}>
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.42 }}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 700, color: accent, opacity: 0.7 }}>₹</span>
          <span style={{
            fontSize: 'clamp(52px, 14vw, 80px)',
            fontWeight: 900,
            color: '#F5F5F5',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            textShadow: `0 0 40px ${glow}`,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {amount}
          </span>
        </motion.div>
      </div>

      {/* ── PLACEHOLDER BAR ── */}
      <div style={{
        height: 6,
        marginInline: 20,
        borderRadius: 99,
        background: `linear-gradient(90deg, ${accent}33, ${accent}11)`,
        border: `1px solid ${accent}22`,
        flexShrink: 0,
        marginBottom: 14,
      }} />

      {/* ── SUBCATEGORY PILLS ── */}
      {catSubs.length > 0 && (
        <div style={{
          paddingInline: 20,
          marginBottom: 12,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 7,
          }}>
            {catSubs.map(sub => {
              const active = selectedSub === sub.label
              return (
                <motion.button
                  key={sub.id}
                  whileTap={{ scale: 0.90 }}
                  onClick={() => setSelectedSub(active ? null : sub.label)}
                  style={{
                    height: 30, padding: '0 12px',
                    borderRadius: 99,
                    border: `1px solid ${active ? accent : 'rgba(255,255,255,0.12)'}`,
                    background: active ? `${accent}22` : 'rgba(255,255,255,0.05)',
                    color: active ? accent : 'rgba(255,255,255,0.60)',
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: active ? `0 2px 8px ${glow}` : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {sub.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ACTION ROW ── */}
      <div style={{
        paddingInline: 20,
        marginBottom: 4,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Note icon */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => { setNoteOpen(v => !v); setDateOpen(false); setWalletOpen(false) }}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: noteOpen ? `${accent}22` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${noteOpen ? accent : 'rgba(255,255,255,0.10)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 17,
            }}
            title="Add note"
          >📝</motion.button>

          {/* Wallet icon */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => { setWalletOpen(v => !v); setNoteOpen(false); setDateOpen(false) }}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: walletOpen ? `${accent}22` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${walletOpen ? accent : 'rgba(255,255,255,0.10)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 17,
            }}
            title="Wallet / Card"
          >💳</motion.button>

          {/* Date icon */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => { setDateOpen(v => !v); setNoteOpen(false); setWalletOpen(false) }}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: dateOpen ? `${accent}22` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${dateOpen ? accent : 'rgba(255,255,255,0.10)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 17,
            }}
            title="Select date"
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: dateOpen ? accent : 'rgba(255,255,255,0.55)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
              📅
              {!isToday && <span style={{ fontSize: 10, color: accent }}>{txDate.getDate()}/{txDate.getMonth()+1}</span>}
            </span>
          </motion.button>

          {/* Confirm button */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => void handleConfirm()}
            disabled={saving || success}
            style={{
              flex: 1, height: 40, borderRadius: 12,
              background: success
                ? 'linear-gradient(135deg,#34D399,#10B981)'
                : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              border: 'none',
              color: '#000',
              fontSize: 14, fontWeight: 800,
              cursor: 'pointer',
              boxShadow: `0 3px 16px ${glow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {success ? '✓ Saved!' : saving ? '…' : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Confirm
              </>
            )}
          </motion.button>
        </div>

        {/* Note inline input */}
        <AnimatePresence>
          {noteOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
              <input
                autoFocus
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note…"
                maxLength={120}
                style={{
                  width: '100%', height: 38, borderRadius: 12,
                  padding: '0 14px',
                  fontSize: 13, fontWeight: 500,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${accent}40`,
                  color: '#F5F5F5',
                  outline: 'none',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wallet placeholder */}
        <AnimatePresence>
          {walletOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                💡 Wallet &amp; Card selection — coming soon
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date picker */}
        <AnimatePresence>
          {dateOpen && (
            <DatePickerInline value={txDate} onChange={d => { setTxDate(d); setDateOpen(false) }} />
          )}
        </AnimatePresence>
      </div>

      {/* ── KEYPAD ── */}
      <div style={{
        paddingInline: 20,
        paddingBottom: 12,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {row.map(k => (
                <motion.button
                  key={k}
                  whileTap={{ scale: 0.88, backgroundColor: `${accent}33` }}
                  onClick={() => handleKey(k)}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    background: k === '⌫' ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.06)',
                    border: k === '⌫' ? '1px solid rgba(239,68,68,0.20)' : '1px solid rgba(255,255,255,0.09)',
                    color: k === '⌫' ? '#F87171' : '#F5F5F5',
                    fontSize: k === '⌫' ? 20 : 22,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s ease',
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
  )
}
