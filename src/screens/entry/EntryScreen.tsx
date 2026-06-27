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
      // Build a date at noon local time so timezone shifts do not roll it to the previous day
      const chosenDate = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate(), 12, 0, 0)
      await addTransaction({
        amount: amountValue,
        description: descParts.join(' · ') || category.label,
        category: category.label,
        created_by: activeUser,
        type: (type as 'income' | 'expense') ?? 'expense',
        wallet_id: walletId ?? undefined,
        // FIX Bug 2: pass the user-selected date so Supabase uses it instead of now()
        transaction_date: chosenDate.toISOString(),
      })
      setSaving(false); setSuccess(true)
      setTimeout(() => navigate(-1), 1500)
    } catch (e) {
      setSaving(false)
      setErrMsg(e instanceof Error ? e.message : 'Failed to save. Try again.')
    }
  }, [canConfirm, category, activeUser, selectedSub, note, subs, addTransaction, amountValue, type, navigate, txDate, walletId])

  // ─── TRAY CONTENT (rendered inside the unified toolbar card) ───
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
            fontSize: 14, fontWeight: 500, color: '#F5F5F5', caretColor: accent,
          }}
        />
        {note && (
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setNote('')}
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
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${accent}25` }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 8,
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
                <motion.b