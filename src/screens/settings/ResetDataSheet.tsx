import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────
type ResetMode =
  | 'erase_history'
  | 'erase_categories'
  | 'erase_wallet_credit'
  | 'clear_budget'
  | 'full_wipe'

interface Props {
  open: boolean
  onClose: () => void
}

// ─── Supabase service-role config ─────────────────────────────────────────────
const SB_URL  = import.meta.env.VITE_SUPABASE_URL as string
const SB_SKEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string

// ─── Core helpers ───────────────────────────────────────────────────────────
function authHeaders() {
  if (!SB_URL || !SB_SKEY)
    throw new Error('Service key not configured. Add VITE_SUPABASE_SERVICE_KEY to .env.local and Vercel.')
  return {
    apikey:         SB_SKEY,
    Authorization:  `Bearer ${SB_SKEY}`,
    'Content-Type': 'application/json',
    Prefer:         'return=minimal',
  }
}

async function sbDelete(table: string, filter: string): Promise<void> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method:  'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`[${table}] HTTP ${res.status}: ${await res.text()}`)
}

async function sbPatch(table: string, filter: string, body: Record<string, null>): Promise<void> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`[${table} PATCH] HTTP ${res.status}: ${await res.text()}`)
}

// ─── Filters ───────────────────────────────────────────────────────────────────
// Standard UUID-keyed tables — deletes every row
const ALL_UUID = 'id=neq.00000000-0000-0000-0000-000000000000'
// user_preferences uses user_name (text) as primary key — NO id column
const ALL_UPREFS = 'user_name=in.(Isaac,Jenifa)'

// ─── 1. Erase History ─────────────────────────────────────────────────────────
async function eraseHistory(): Promise<void> {
  await sbDelete('transactions', ALL_UUID)
}

// ─── 2. Erase Categories ──────────────────────────────────────────────────────
async function eraseCategories(): Promise<void> {
  await sbDelete('subcategories', ALL_UUID)  // FK child first
  await sbDelete('categories',    ALL_UUID)  // FK parent second
  await sbDelete('budgets',       ALL_UUID)  // budgets reference category labels
}

// ─── 3. Erase Wallet & Credit Card ───────────────────────────────────────────
async function eraseWalletCredit(): Promise<void> {
  // Null FK refs before deleting parent wallets
  await sbPatch('user_preferences', ALL_UPREFS,   { default_wallet_id: null })
  await sbPatch('transactions',     'wallet_id=neq.00000000-0000-0000-0000-000000000000', { wallet_id: null })
  await sbDelete('wallets', ALL_UUID)
}

// ─── 4. Clear Budget ──────────────────────────────────────────────────────────
async function clearBudget(): Promise<void> {
  await sbDelete('budgets', ALL_UUID)
}

// ─── 5. Full Wipeout ──────────────────────────────────────────────────────────
// FK-safe sequential deletion. user_preferences uses user_name PK — must use ALL_UPREFS
async function fullWipeOut(): Promise<void> {
  const errors: string[] = []
  const safe = async (fn: () => Promise<void>) => {
    try { await fn() } catch (e) { errors.push(e instanceof Error ? e.message : String(e)) }
  }

  // Step 1: Null FK references that would block parent row deletion
  await safe(() => sbPatch('user_preferences', ALL_UPREFS, { default_wallet_id: null }))
  await safe(() => sbPatch('transactions', 'wallet_id=neq.00000000-0000-0000-0000-000000000000', { wallet_id: null }))

  // Step 2: Delete every table in FK-safe order
  //   UUID-keyed tables use ALL_UUID
  //   user_preferences uses ALL_UPREFS (user_name PK, no id column)
  await safe(() => sbDelete('transactions',      ALL_UUID))
  await safe(() => sbDelete('subcategories',     ALL_UUID))  // before categories
  await safe(() => sbDelete('categories',        ALL_UUID))
  await safe(() => sbDelete('budgets',           ALL_UUID))
  await safe(() => sbDelete('user_preferences',  ALL_UPREFS)) // ← fixed: user_name filter
  await safe(() => sbDelete('wallets',           ALL_UUID))
  await safe(() => sbDelete('loans',             ALL_UUID))
  await safe(() => sbDelete('recurring_payments',ALL_UUID))
  await safe(() => sbDelete('lent',              ALL_UUID))
  await safe(() => sbDelete('borrowed',          ALL_UUID))
  await safe(() => sbDelete('assets',            ALL_UUID))

  if (errors.length > 0)
    throw new Error(`Some tables failed to wipe:\n${errors.join('\n')}`)
}

// ─── Mode config ──────────────────────────────────────────────────────────────
const SAFE_MODES: ResetMode[] = ['erase_history','erase_categories','erase_wallet_credit','clear_budget']

const MODES: {
  key:          ResetMode
  icon:         string
  label:        string
  subtitle:     string
  danger:       boolean
  rowBg:        string
  rowBorder:    string
  iconBg:       string
  iconBorder:   string
  labelColor:   string
  activeBg:     string
  activeBorder: string
}[] = [
  {
    key:          'erase_history',
    icon:         '🧹',
    label:        'Erase History',
    subtitle:     'Removes all transaction records app-wide',
    danger:       false,
    rowBg:        'rgba(99,102,241,0.07)',
    rowBorder:    'rgba(99,102,241,0.22)',
    iconBg:       'rgba(99,102,241,0.20)',
    iconBorder:   'rgba(99,102,241,0.35)',
    labelColor:   '#c7d2fe',
    activeBg:     'rgba(99,102,241,0.12)',
    activeBorder: 'rgba(99,102,241,0.50)',
  },
  {
    key:          'erase_categories',
    icon:         '🗂️',
    label:        'Erase Categories',
    subtitle:     'Clears all expense & income categories and their subcategories',
    danger:       false,
    rowBg:        'rgba(20,184,166,0.07)',
    rowBorder:    'rgba(20,184,166,0.22)',
    iconBg:       'rgba(20,184,166,0.20)',
    iconBorder:   'rgba(20,184,166,0.35)',
    labelColor:   '#99f6e4',
    activeBg:     'rgba(20,184,166,0.12)',
    activeBorder: 'rgba(20,184,166,0.50)',
  },
  {
    key:          'erase_wallet_credit',
    icon:         '👛',
    label:        'Erase Wallet & Credit Card',
    subtitle:     'Permanently deletes all wallets and credit cards',
    danger:       false,
    rowBg:        'rgba(251,191,36,0.07)',
    rowBorder:    'rgba(251,191,36,0.22)',
    iconBg:       'rgba(251,191,36,0.20)',
    iconBorder:   'rgba(251,191,36,0.35)',
    labelColor:   '#fde68a',
    activeBg:     'rgba(251,191,36,0.12)',
    activeBorder: 'rgba(251,191,36,0.50)',
  },
  {
    key:          'clear_budget',
    icon:         '💰',
    label:        'Clear Budget',
    subtitle:     'Resets all monthly budget allocations across every category',
    danger:       false,
    rowBg:        'rgba(34,197,94,0.07)',
    rowBorder:    'rgba(34,197,94,0.22)',
    iconBg:       'rgba(34,197,94,0.20)',
    iconBorder:   'rgba(34,197,94,0.35)',
    labelColor:   '#bbf7d0',
    activeBg:     'rgba(34,197,94,0.12)',
    activeBorder: 'rgba(34,197,94,0.50)',
  },
  {
    key:          'full_wipe',
    icon:         '💥',
    label:        'Full Wipeout',
    subtitle:     'Destroys every record, category, wallet, budget, loan, asset — everything',
    danger:       true,
    rowBg:        'rgba(244,63,94,0.10)',
    rowBorder:    'rgba(244,63,94,0.35)',
    iconBg:       'rgba(244,63,94,0.22)',
    iconBorder:   'rgba(244,63,94,0.45)',
    labelColor:   '#fda4af',
    activeBg:     'rgba(244,63,94,0.14)',
    activeBorder: 'rgba(244,63,94,0.60)',
  },
]

const CONFIRM_LABELS: Record<ResetMode, string> = {
  erase_history:       'Type DELETE to erase all transactions',
  erase_categories:    'Type DELETE to erase all categories',
  erase_wallet_credit: 'Type DELETE to erase all wallets & cards',
  clear_budget:        'Type DELETE to clear all budgets',
  full_wipe:           'Type WIPEOUT to destroy everything',
}

const CONFIRM_KEYWORDS: Record<ResetMode, string> = {
  erase_history:       'DELETE',
  erase_categories:    'DELETE',
  erase_wallet_credit: 'DELETE',
  clear_budget:        'DELETE',
  full_wipe:           'WIPEOUT',
}

// ─── Animation variants ───────────────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1] as const

const sheetVariants: Variants = {
  hidden:  { y: '100%', opacity: 0.6 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 30 } },
  exit:    { y: '100%', opacity: 0, transition: { duration: 0.22, ease: EASE } },
}

const overlayVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
}

const rowVariants: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.055, type: 'spring', stiffness: 320, damping: 28 },
  }),
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ResetDataSheet({ open, onClose }: Props) {
  const [selected,  setSelected]  = useState<ResetMode | null>(null)
  const [step,      setStep]      = useState<'select' | 'confirm' | 'running' | 'done' | 'error'>('select')
  const [confirmTx, setConfirmTx] = useState('')
  const [errMsg,    setErrMsg]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClose() {
    setSelected(null)
    setStep('select')
    setConfirmTx('')
    setErrMsg('')
    onClose()
  }

  function handleSelect(key: ResetMode) {
    setSelected(key)
    setStep('confirm')
    setConfirmTx('')
    setTimeout(() => inputRef.current?.focus(), 140)
  }

  async function handleExecute() {
    if (!selected) return
    if (confirmTx.trim().toUpperCase() !== CONFIRM_KEYWORDS[selected]) return
    setStep('running')
    setErrMsg('')
    try {
      switch (selected) {
        case 'erase_history':       await eraseHistory();      break
        case 'erase_categories':    await eraseCategories();   break
        case 'erase_wallet_credit': await eraseWalletCredit(); break
        case 'clear_budget':        await clearBudget();       break
        case 'full_wipe':           await fullWipeOut();       break
      }
      setStep('done')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e))
      setStep('error')
    }
  }

  const mode       = MODES.find(m => m.key === selected)
  const keyword    = selected ? CONFIRM_KEYWORDS[selected] : 'DELETE'
  const isReady    = confirmTx.trim().toUpperCase() === keyword
  const isFullWipe = selected === 'full_wipe'

  // safe modes = first 4; full_wipe = last
  const safeModes   = MODES.filter(m => SAFE_MODES.includes(m.key))
  const dangerModes = MODES.filter(m => m.danger)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Overlay ──────────────────────────────────────────────────────── */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            variants={overlayVariants}
            initial="hidden" animate="visible" exit="exit"
            onClick={handleClose}
          />

          {/* ── Sheet ─────────────────────────────────────────────────────────── */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              background:           'rgba(9,9,13,0.98)',
              border:               '1px solid rgba(255,255,255,0.08)',
              borderRadius:         '24px 24px 0 0',
              maxHeight:            '92dvh',
              paddingBottom:        'env(safe-area-inset-bottom, 20px)',
            }}
            variants={sheetVariants}
            initial="hidden" animate="visible" exit="exit"
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.16)' }} />
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1 }}>

              <AnimatePresence mode="wait">

                {/* ═════════════ STEP: SELECT ═══════════════════════════════ */}
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.22 } }}
                    exit={{    opacity: 0, y: -6,  transition: { duration: 0.15 } }}
                    style={{ padding: '16px 20px 32px' }}
                  >
                    {/* Header */}
                    <div style={{ marginBottom: 20 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0, lineHeight: 1.2 }}>
                        Reset Data
                      </h2>
                      <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.75)', margin: '5px 0 0', lineHeight: 1.45 }}>
                        Permanently erase selected data. All actions are irreversible.
                      </p>
                    </div>

                    {/* ── Safe options ─────────────────────────────────── */}
                    <p style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
                      textTransform: 'uppercase', color: 'rgba(148,163,184,0.45)',
                      marginBottom: 10,
                    }}>
                      Selective Erase
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                      {safeModes.map((m, i) => (
                        <motion.button
                          key={m.key}
                          custom={i}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          onClick={() => handleSelect(m.key)}
                          style={{
                            display:      'flex',
                            alignItems:   'center',
                            gap:          14,
                            padding:      '13px 14px',
                            borderRadius: 16,
                            background:   m.rowBg,
                            border:       `1px solid ${m.rowBorder}`,
                            cursor:       'pointer',
                            textAlign:    'left',
                            width:        '100%',
                          }}
                        >
                          {/* Icon bubble */}
                          <div style={{
                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                            background: m.iconBg, border: `1px solid ${m.iconBorder}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 19,
                          }}>
                            {m.icon}
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: m.labelColor, margin: 0, lineHeight: 1.25 }}>
                              {m.label}
                            </p>
                            <p style={{ fontSize: 11.5, color: 'rgba(148,163,184,0.6)', margin: '3px 0 0', lineHeight: 1.35 }}>
                              {m.subtitle}
                            </p>
                          </div>

                          {/* Chevron */}
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="rgba(148,163,184,0.35)" strokeWidth="2.2"
                            strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </motion.button>
                      ))}
                    </div>

                    {/* ── Danger zone divider ────────────────────────── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(244,63,94,0.20)' }} />
                      <p style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
                        textTransform: 'uppercase', color: 'rgba(244,63,94,0.55)',
                        margin: 0,
                      }}>
                        ⚠️ Danger Zone
                      </p>
                      <div style={{ flex: 1, height: 1, background: 'rgba(244,63,94,0.20)' }} />
                    </div>

                    {/* ── Full Wipeout row ──────────────────────────── */}
                    {dangerModes.map((m, i) => (
                      <motion.button
                        key={m.key}
                        custom={safeModes.length + i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => handleSelect(m.key)}
                        style={{
                          display:      'flex',
                          alignItems:   'center',
                          gap:          14,
                          padding:      '14px 14px',
                          borderRadius: 18,
                          background:   m.rowBg,
                          border:       `1.5px solid ${m.rowBorder}`,
                          cursor:       'pointer',
                          textAlign:    'left',
                          width:        '100%',
                          boxShadow:    '0 0 24px rgba(244,63,94,0.08)',
                        }}
                      >
                        <div style={{
                          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                          background: m.iconBg, border: `1.5px solid ${m.iconBorder}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 22,
                        }}>
                          {m.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: m.labelColor, margin: 0, lineHeight: 1.2 }}>
                            {m.label}
                          </p>
                          <p style={{ fontSize: 11.5, color: 'rgba(253,164,175,0.55)', margin: '4px 0 0', lineHeight: 1.35 }}>
                            {m.subtitle}
                          </p>
                        </div>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(253,164,175,0.45)" strokeWidth="2.2"
                          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* ═════════════ STEP: CONFIRM ════════════════════════════ */}
                {step === 'confirm' && mode && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0,  transition: { type: 'spring', stiffness: 300, damping: 28 } }}
                    exit={{    opacity: 0, x: -20, transition: { duration: 0.15 } }}
                    style={{ padding: '12px 20px 32px' }}
                  >
                    {/* Back */}
                    <button
                      onClick={() => { setStep('select'); setConfirmTx('') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 13, color: 'rgba(148,163,184,0.65)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        marginBottom: 18, padding: 0,
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                      Back to options
                    </button>

                    {/* Mode pill */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      borderRadius: 99, padding: '6px 14px 6px 8px',
                      background: mode.activeBg, border: `1px solid ${mode.activeBorder}`,
                      marginBottom: 16,
                    }}>
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{mode.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: mode.labelColor }}>{mode.label}</span>
                    </div>

                    {/* Warning box */}
                    <div style={{
                      borderRadius: 16, padding: '14px 16px', marginBottom: 20,
                      background: isFullWipe ? 'rgba(244,63,94,0.09)' : 'rgba(251,191,36,0.07)',
                      border: `1px solid ${isFullWipe ? 'rgba(244,63,94,0.28)' : 'rgba(251,191,36,0.22)'}`,
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: isFullWipe ? '#fb7185' : '#fbbf24', margin: '0 0 6px' }}>
                        {isFullWipe ? '⚠️ This destroys everything' : '⚠️ This is irreversible'}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.75)', margin: 0, lineHeight: 1.55 }}>
                        {isFullWipe
                          ? 'All transactions, categories, wallets, credit cards, budgets, loans, recurring payments, lent/borrowed records, and assets will be permanently deleted. There is no undo.'
                          : `${mode.subtitle}. Once deleted, this data cannot be recovered.`}
                      </p>
                    </div>

                    {/* Confirm input */}
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(148,163,184,0.85)', marginBottom: 8 }}>
                      {CONFIRM_LABELS[selected!]}
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={confirmTx}
                      onChange={e => setConfirmTx(e.target.value)}
                      placeholder={keyword}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      onKeyDown={e => { if (e.key === 'Enter' && isReady) handleExecute() }}
                      style={{
                        width:         '100%',
                        borderRadius:  12,
                        padding:       '13px 16px',
                        fontSize:      15,
                        fontFamily:    'ui-monospace, monospace',
                        fontWeight:    700,
                        letterSpacing: '0.10em',
                        color:         '#f1f5f9',
                        background:    'rgba(255,255,255,0.05)',
                        border:        `1.5px solid ${isReady
                          ? (isFullWipe ? 'rgba(244,63,94,0.65)' : 'rgba(99,102,241,0.65)')
                          : 'rgba(255,255,255,0.10)'}`,
                        outline:       'none',
                        boxSizing:     'border-box',
                        marginBottom:  16,
                        transition:    'border-color 0.18s ease',
                      }}
                    />

                    {/* Execute button */}
                    <motion.button
                      onClick={handleExecute}
                      disabled={!isReady}
                      whileTap={isReady ? { scale: 0.97 } : {}}
                      style={{
                        width:        '100%',
                        borderRadius: 16,
                        padding:      '15px 20px',
                        fontSize:     15,
                        fontWeight:   700,
                        letterSpacing:'0.02em',
                        color:        isReady ? '#fff' : 'rgba(148,163,184,0.3)',
                        background:   isReady
                          ? (isFullWipe
                              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                              : 'linear-gradient(135deg, #6366f1, #8b5cf6)')
                          : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${isReady ? 'transparent' : 'rgba(255,255,255,0.07)'}`,
                        cursor:       isReady ? 'pointer' : 'not-allowed',
                        transition:   'all 0.2s ease',
                        boxShadow:    isReady && isFullWipe ? '0 4px 20px rgba(239,68,68,0.35)' : 'none',
                      }}
                    >
                      {isFullWipe ? '💥 Destroy Everything' : `🗑️ Confirm ${mode.label}`}
                    </motion.button>
                  </motion.div>
                )}

                {/* ═════════════ STEP: RUNNING ════════════════════════════ */}
                {step === 'running' && (
                  <motion.div
                    key="running"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', padding: '64px 20px', gap: 16,
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.08)',
                        borderTopColor: isFullWipe ? '#f87171' : '#818cf8',
                      }}
                    />
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(148,163,184,0.85)', margin: 0 }}>
                      {isFullWipe ? 'Wiping everything…' : 'Erasing data…'}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', margin: 0 }}>
                      Do not close the app
                    </p>
                  </motion.div>
                )}

                {/* ═════════════ STEP: DONE ══════════════════════════════ */}
                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.90 }}
                    animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 22 } }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', padding: '56px 24px 40px', gap: 10,
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 340, damping: 18, delay: 0.08 } }}
                      style={{ fontSize: 52, lineHeight: 1 }}
                    >
                      ✅
                    </motion.div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '8px 0 0' }}>
                      Done.
                    </p>
                    <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', margin: '2px 0 0', textAlign: 'center' }}>
                      {mode?.label} completed successfully.
                    </p>
                    <motion.button
                      onClick={handleClose}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        marginTop: 20, padding: '13px 40px', borderRadius: 14,
                        fontSize: 14, fontWeight: 600,
                        background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)',
                        color: '#a5b4fc', cursor: 'pointer',
                      }}
                    >
                      Close
                    </motion.button>
                  </motion.div>
                )}

                {/* ═════════════ STEP: ERROR ══════════════════════════════ */}
                {step === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '48px 24px 36px', gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 42 }}>⚠️</div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#fb7185', margin: 0 }}>Something went wrong</p>
                    <p style={{
                      fontSize: 11.5, fontFamily: 'ui-monospace, monospace',
                      color: 'rgba(253,164,175,0.75)', textAlign: 'center', lineHeight: 1.6,
                      background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.22)',
                      borderRadius: 12, padding: '12px 16px', margin: '4px 0 0',
                      maxWidth: 320, wordBreak: 'break-word',
                    }}>
                      {errMsg || 'Unknown error. Check your service key and network.'}
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <motion.button
                        onClick={() => { setStep('confirm'); setConfirmTx('') }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)',
                          color: '#f1f5f9', cursor: 'pointer',
                        }}
                      >
                        Retry
                      </motion.button>
                      <motion.button
                        onClick={handleClose}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          padding: '11px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                          background: 'rgba(244,63,94,0.14)', border: '1px solid rgba(244,63,94,0.28)',
                          color: '#fb7185', cursor: 'pointer',
                        }}
                      >
                        Close
                      </motion.button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>{/* end scrollable body */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
