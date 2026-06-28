import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────────────────
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

// ─── Supabase service-role config ───────────────────────────────────────────────────────
const SB_URL  = import.meta.env.VITE_SUPABASE_URL as string
const SB_SKEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string

// ─── Core helpers ──────────────────────────────────────────────────────────────────
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

// ─── Filters ───────────────────────────────────────────────────────────────────────────
const ALL_UUID   = 'id=neq.00000000-0000-0000-0000-000000000000'
// user_preferences has user_name (text) as PK — no id column exists
const ALL_UPREFS = 'user_name=in.(Isaac,Jenifa)'
// transactions: null out wallet_id for rows that actually have one
const HAS_WALLET = 'wallet_id=not.is.null'
// lent: null out source_wallet_id FK before wallets are deleted
const LENT_HAS_WALLET = 'source_wallet_id=not.is.null'

// ─── 1. Erase History ──────────────────────────────────────────────────────────────────
async function eraseHistory(): Promise<void> {
  await sbDelete('transactions', ALL_UUID)
}

// ─── 2. Erase Categories ─────────────────────────────────────────────────────────────────
async function eraseCategories(): Promise<void> {
  await sbDelete('subcategories', ALL_UUID)  // FK child first
  await sbDelete('categories',    ALL_UUID)  // FK parent second
  await sbDelete('budgets',       ALL_UUID)  // budgets reference category labels
}

// ─── 3. Erase Wallet & Credit Card ─────────────────────────────────────────────────────
async function eraseWalletCredit(): Promise<void> {
  // Null all FK references pointing at wallets before deleting wallets
  await sbPatch('user_preferences', ALL_UPREFS,    { default_wallet_id: null })
  await sbPatch('transactions',     HAS_WALLET,    { wallet_id: null })
  await sbPatch('lent',             LENT_HAS_WALLET, { source_wallet_id: null })
  // Now safe to delete wallets
  await sbDelete('wallets', ALL_UUID)
}

// ─── 4. Clear Budget ────────────────────────────────────────────────────────────────────
async function clearBudget(): Promise<void> {
  await sbDelete('budgets', ALL_UUID)
}

// ─── 5. Full Wipeout ───────────────────────────────────────────────────────────────────
// DELETION ORDER (FK-safe):
//   Phase A — null all FK columns that point at wallets
//   Phase B — delete FK child tables first, wallets last among inter-linked tables
//   Phase C — delete remaining standalone tables
//   Phase D — delete user_preferences last (text PK, no id)
async function fullWipeOut(): Promise<void> {
  const errors: string[] = []
  const safe = async (fn: () => Promise<void>) => {
    try { await fn() } catch (e) { errors.push(e instanceof Error ? e.message : String(e)) }
  }

  // ── Phase A: Null every FK that references wallets ─────────────────────────
  await safe(() => sbPatch('user_preferences', ALL_UPREFS,      { default_wallet_id: null }))
  await safe(() => sbPatch('transactions',     HAS_WALLET,      { wallet_id: null }))
  await safe(() => sbPatch('lent',             LENT_HAS_WALLET, { source_wallet_id: null }))

  // ── Phase B: Delete FK children before their parents ───────────────────────
  // lent & borrowed must go BEFORE wallets (source_wallet_id FK)
  await safe(() => sbDelete('lent',               ALL_UUID))
  await safe(() => sbDelete('borrowed',           ALL_UUID))
  // transactions must go before wallets (wallet_id FK already nulled, but safer)
  await safe(() => sbDelete('transactions',       ALL_UUID))
  // subcategories before categories
  await safe(() => sbDelete('subcategories',      ALL_UUID))
  await safe(() => sbDelete('categories',         ALL_UUID))
  await safe(() => sbDelete('budgets',            ALL_UUID))
  // wallets — now safe, all FKs pointing at it are gone/nulled
  await safe(() => sbDelete('wallets',            ALL_UUID))

  // ── Phase C: Standalone tables (no cross-references) ───────────────────────
  await safe(() => sbDelete('loans',              ALL_UUID))
  await safe(() => sbDelete('recurring_payments', ALL_UUID))
  await safe(() => sbDelete('assets',             ALL_UUID))

  // ── Phase D: user_preferences last (text PK) ───────────────────────────────
  await safe(() => sbDelete('user_preferences',   ALL_UPREFS))

  if (errors.length > 0)
    throw new Error(`Some tables failed to wipe:\n${errors.join('\n')}`)
}

// ─── Mode config ─────────────────────────────────────────────────────────────────────────────
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
    key: 'erase_history', icon: '🧹', label: 'Erase History',
    subtitle: 'Removes all transaction records',
    danger: false,
    rowBg: 'rgba(99,102,241,0.07)',        rowBorder: 'rgba(99,102,241,0.20)',
    iconBg: 'rgba(99,102,241,0.18)',       iconBorder: 'rgba(99,102,241,0.32)',
    labelColor: '#c7d2fe',
    activeBg: 'rgba(99,102,241,0.12)',     activeBorder: 'rgba(99,102,241,0.50)',
  },
  {
    key: 'erase_categories', icon: '🗂️', label: 'Erase Categories',
    subtitle: 'Clears all categories, subcategories & budgets',
    danger: false,
    rowBg: 'rgba(20,184,166,0.07)',        rowBorder: 'rgba(20,184,166,0.20)',
    iconBg: 'rgba(20,184,166,0.18)',       iconBorder: 'rgba(20,184,166,0.32)',
    labelColor: '#99f6e4',
    activeBg: 'rgba(20,184,166,0.12)',     activeBorder: 'rgba(20,184,166,0.50)',
  },
  {
    key: 'erase_wallet_credit', icon: '👛', label: 'Erase Wallets & Cards',
    subtitle: 'Permanently deletes all wallets and credit cards',
    danger: false,
    rowBg: 'rgba(251,191,36,0.07)',        rowBorder: 'rgba(251,191,36,0.20)',
    iconBg: 'rgba(251,191,36,0.18)',       iconBorder: 'rgba(251,191,36,0.32)',
    labelColor: '#fde68a',
    activeBg: 'rgba(251,191,36,0.12)',     activeBorder: 'rgba(251,191,36,0.50)',
  },
  {
    key: 'clear_budget', icon: '💰', label: 'Clear Budget',
    subtitle: 'Resets all monthly budget allocations',
    danger: false,
    rowBg: 'rgba(34,197,94,0.07)',         rowBorder: 'rgba(34,197,94,0.20)',
    iconBg: 'rgba(34,197,94,0.18)',        iconBorder: 'rgba(34,197,94,0.32)',
    labelColor: '#bbf7d0',
    activeBg: 'rgba(34,197,94,0.12)',      activeBorder: 'rgba(34,197,94,0.50)',
  },
  {
    key: 'full_wipe', icon: '💥', label: 'Full Wipeout',
    subtitle: 'Destroys every record, category, wallet, budget, loan, asset — everything',
    danger: true,
    rowBg: 'rgba(244,63,94,0.10)',         rowBorder: 'rgba(244,63,94,0.35)',
    iconBg: 'rgba(244,63,94,0.22)',        iconBorder: 'rgba(244,63,94,0.45)',
    labelColor: '#fda4af',
    activeBg: 'rgba(244,63,94,0.14)',      activeBorder: 'rgba(244,63,94,0.60)',
  },
]

const CONFIRM_LABELS: Record<ResetMode, string> = {
  erase_history:       'Type DELETE to confirm',
  erase_categories:    'Type DELETE to confirm',
  erase_wallet_credit: 'Type DELETE to confirm',
  clear_budget:        'Type DELETE to confirm',
  full_wipe:           'Type WIPEOUT to confirm',
}

const CONFIRM_KEYWORDS: Record<ResetMode, string> = {
  erase_history:       'DELETE',
  erase_categories:    'DELETE',
  erase_wallet_credit: 'DELETE',
  clear_budget:        'DELETE',
  full_wipe:           'WIPEOUT',
}

// ─── Animation variants ────────────────────────────────────────────────────────────────────
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
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 320, damping: 28 },
  }),
}

// ─── Component ────────────────────────────────────────────────────────────────────────────────
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

  const safeModes   = MODES.filter(m => SAFE_MODES.includes(m.key))
  const dangerModes = MODES.filter(m => m.danger)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop overlay ───────────────────────────────────────────────── */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            variants={overlayVariants}
            initial="hidden" animate="visible" exit="exit"
            onClick={handleClose}
          />

          {/* ── Sheet ────────────────────────────────────────────────────────────────── */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              background:    'rgba(10,10,16,0.99)',
              border:        '1px solid rgba(255,255,255,0.09)',
              borderBottom:  'none',
              borderRadius:  '26px 26px 0 0',
              maxHeight:     '92dvh',
              paddingBottom: 'env(safe-area-inset-bottom, 24px)',
              boxShadow:     '0 -8px 48px rgba(0,0,0,0.55)',
            }}
            variants={sheetVariants}
            initial="hidden" animate="visible" exit="exit"
          >

            {/* Drag handle */}
            <div style={{
              display: 'flex', justifyContent: 'center',
              paddingTop: 14, paddingBottom: 6, flexShrink: 0,
            }}>
              <div style={{
                width: 40, height: 4, borderRadius: 99,
                background: 'rgba(255,255,255,0.14)',
              }} />
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

              <AnimatePresence mode="wait">

                {/* ═════════════ STEP: SELECT ═════════════════════════════════════ */}
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.22 } }}
                    exit={{    opacity: 0, y: -6,  transition: { duration: 0.15 } }}
                    style={{ padding: '10px 18px 36px' }}
                  >
                    {/* Header */}
                    <div style={{ marginBottom: 22 }}>
                      <h2 style={{
                        fontSize: 21, fontWeight: 700,
                        color: '#f1f5f9', margin: 0, lineHeight: 1.2,
                      }}>
                        Reset Data
                      </h2>
                      <p style={{
                        fontSize: 13, color: 'rgba(148,163,184,0.65)',
                        margin: '6px 0 0', lineHeight: 1.5,
                      }}>
                        All actions are permanent and irreversible.
                      </p>
                    </div>

                    {/* Section label: Selective Erase */}
                    <p style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(148,163,184,0.38)',
                      margin: '0 0 10px 2px',
                    }}>
                      Selective Erase
                    </p>

                    {/* Safe option rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
                      {safeModes.map((m, i) => (
                        <motion.button
                          key={m.key}
                          custom={i}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelect(m.key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 13,
                            padding: '12px 14px',
                            borderRadius: 16,
                            background: m.rowBg,
                            border: `1px solid ${m.rowBorder}`,
                            cursor: 'pointer', textAlign: 'left', width: '100%',
                          }}
                        >
                          {/* Icon bubble */}
                          <div style={{
                            width: 42, height: 42, borderRadius: 13,
                            flexShrink: 0,
                            background: m.iconBg,
                            border: `1px solid ${m.iconBorder}`,
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 20,
                          }}>
                            {m.icon}
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: 14, fontWeight: 600,
                              color: m.labelColor, margin: 0, lineHeight: 1.25,
                            }}>
                              {m.label}
                            </p>
                            <p style={{
                              fontSize: 11.5,
                              color: 'rgba(148,163,184,0.55)',
                              margin: '3px 0 0', lineHeight: 1.35,
                            }}>
                              {m.subtitle}
                            </p>
                          </div>

                          {/* Chevron */}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="rgba(148,163,184,0.30)" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0 }}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </motion.button>
                      ))}
                    </div>

                    {/* Danger zone divider */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 14,
                    }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(244,63,94,0.18)' }} />
                      <p style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(244,63,94,0.50)',
                        margin: 0, whiteSpace: 'nowrap',
                      }}>
                        ⚠️ Danger Zone
                      </p>
                      <div style={{ flex: 1, height: 1, background: 'rgba(244,63,94,0.18)' }} />
                    </div>

                    {/* Full Wipeout row */}
                    {dangerModes.map((m, i) => (
                      <motion.button
                        key={m.key}
                        custom={safeModes.length + i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelect(m.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 13,
                          padding: '14px 14px',
                          borderRadius: 18,
                          background: m.rowBg,
                          border: `1.5px solid ${m.rowBorder}`,
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          boxShadow: '0 0 28px rgba(244,63,94,0.09)',
                        }}
                      >
                        <div style={{
                          width: 46, height: 46, borderRadius: 15, flexShrink: 0,
                          background: m.iconBg, border: `1.5px solid ${m.iconBorder}`,
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 23,
                        }}>
                          {m.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 15, fontWeight: 700,
                            color: m.labelColor, margin: 0, lineHeight: 1.2,
                          }}>
                            {m.label}
                          </p>
                          <p style={{
                            fontSize: 11.5,
                            color: 'rgba(253,164,175,0.50)',
                            margin: '4px 0 0', lineHeight: 1.35,
                          }}>
                            {m.subtitle}
                          </p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(253,164,175,0.40)" strokeWidth="2.5"
                          strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0 }}>
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </motion.button>
                    ))}

                  </motion.div>
                )}

                {/* ═════════════ STEP: CONFIRM ════════════════════════════════════ */}
                {step === 'confirm' && mode && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } }}
                    exit={{    opacity: 0, x: -20, transition: { duration: 0.15 } }}
                    style={{ padding: '10px 18px 36px' }}
                  >
                    {/* Back button */}
                    <button
                      onClick={() => { setStep('select'); setConfirmTx('') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 13, color: 'rgba(148,163,184,0.60)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        marginBottom: 20, padding: 0,
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.4"
                        strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                      Back to options
                    </button>

                    {/* Mode pill */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      borderRadius: 99, padding: '7px 16px 7px 10px',
                      background: mode.activeBg, border: `1px solid ${mode.activeBorder}`,
                      marginBottom: 18,
                    }}>
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{mode.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: mode.labelColor }}>
                        {mode.label}
                      </span>
                    </div>

                    {/* Warning box */}
                    <div style={{
                      borderRadius: 16, padding: '14px 16px', marginBottom: 22,
                      background: isFullWipe
                        ? 'rgba(244,63,94,0.09)'
                        : 'rgba(251,191,36,0.07)',
                      border: `1px solid ${
                        isFullWipe
                          ? 'rgba(244,63,94,0.28)'
                          : 'rgba(251,191,36,0.22)'
                      }`,
                    }}>
                      <p style={{
                        fontSize: 13, fontWeight: 700,
                        color: isFullWipe ? '#fb7185' : '#fbbf24',
                        margin: '0 0 6px',
                      }}>
                        {isFullWipe ? '⚠️ This destroys everything' : '⚠️ This is irreversible'}
                      </p>
                      <p style={{
                        fontSize: 12.5, color: 'rgba(148,163,184,0.70)',
                        margin: 0, lineHeight: 1.6,
                      }}>
                        {isFullWipe
                          ? 'All transactions, categories, wallets, credit cards, budgets, loans, recurring payments, lent/borrowed records, and assets will be permanently deleted. There is no undo.'
                          : `${mode.subtitle}. Once deleted, this data cannot be recovered.`
                        }
                      </p>
                    </div>

                    {/* Confirm label */}
                    <p style={{
                      fontSize: 12, fontWeight: 600,
                      color: 'rgba(148,163,184,0.80)',
                      margin: '0 0 8px 2px',
                    }}>
                      {CONFIRM_LABELS[selected!]}
                    </p>

                    {/* Keyword input */}
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
                        width: '100%',
                        borderRadius: 13,
                        padding: '14px 16px',
                        fontSize: 16,
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: '#f1f5f9',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1.5px solid ${isReady
                          ? (isFullWipe ? 'rgba(244,63,94,0.65)' : 'rgba(99,102,241,0.65)')
                          : 'rgba(255,255,255,0.10)'
                        }`,
                        outline: 'none',
                        boxSizing: 'border-box',
                        marginBottom: 16,
                        transition: 'border-color 0.18s ease',
                      }}
                    />

                    {/* Execute button */}
                    <motion.button
                      onClick={handleExecute}
                      disabled={!isReady}
                      whileTap={isReady ? { scale: 0.97 } : {}}
                      style={{
                        width: '100%',
                        borderRadius: 16,
                        padding: '15px 20px',
                        fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
                        color: isReady ? '#fff' : 'rgba(148,163,184,0.28)',
                        background: isReady
                          ? (isFullWipe
                              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                              : 'linear-gradient(135deg,#6366f1,#8b5cf6)')
                          : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${
                          isReady ? 'transparent' : 'rgba(255,255,255,0.07)'
                        }`,
                        cursor: isReady ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        boxShadow: isReady && isFullWipe
                          ? '0 4px 24px rgba(239,68,68,0.38)'
                          : 'none',
                      }}
                    >
                      {isFullWipe ? '💥 Destroy Everything' : `🗑️ Confirm ${mode.label}`}
                    </motion.button>
                  </motion.div>
                )}

                {/* ═════════════ STEP: RUNNING ═══════════════════════════════════ */}
                {step === 'running' && (
                  <motion.div
                    key="running"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '72px 24px', gap: 18,
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.85, ease: 'linear' }}
                      style={{
                        width: 46, height: 46, borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.07)',
                        borderTopColor: isFullWipe ? '#f87171' : '#818cf8',
                      }}
                    />
                    <p style={{
                      fontSize: 14, fontWeight: 600,
                      color: 'rgba(148,163,184,0.85)', margin: 0,
                    }}>
                      {isFullWipe ? 'Wiping everything…' : 'Erasing data…'}
                    </p>
                    <p style={{
                      fontSize: 12, color: 'rgba(148,163,184,0.38)', margin: 0,
                    }}>
                      Do not close the app
                    </p>
                  </motion.div>
                )}

                {/* ═════════════ STEP: DONE ═══════════════════════════════════════ */}
                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 22 } }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '60px 24px 44px', gap: 10,
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 340, damping: 18, delay: 0.08 } }}
                      style={{ fontSize: 54, lineHeight: 1 }}
                    >
                      ✅
                    </motion.div>
                    <p style={{ fontSize: 19, fontWeight: 700, color: '#f1f5f9', margin: '8px 0 0' }}>
                      Done.
                    </p>
                    <p style={{
                      fontSize: 13, color: 'rgba(148,163,184,0.55)',
                      margin: '2px 0 0', textAlign: 'center',
                    }}>
                      {mode?.label} completed successfully.
                    </p>
                    <motion.button
                      onClick={handleClose}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        marginTop: 22, padding: '13px 44px',
                        borderRadius: 14, fontSize: 14, fontWeight: 600,
                        background: 'rgba(99,102,241,0.16)',
                        border: '1px solid rgba(99,102,241,0.32)',
                        color: '#a5b4fc', cursor: 'pointer',
                      }}
                    >
                      Close
                    </motion.button>
                  </motion.div>
                )}

                {/* ═════════════ STEP: ERROR ══════════════════════════════════════ */}
                {step === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center',
                      padding: '52px 24px 40px', gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 44 }}>⚠️</div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#fb7185', margin: 0 }}>
                      Something went wrong
                    </p>
                    <p style={{
                      fontSize: 11.5,
                      fontFamily: 'ui-monospace, monospace',
                      color: 'rgba(253,164,175,0.72)',
                      textAlign: 'center', lineHeight: 1.65,
                      background: 'rgba(244,63,94,0.08)',
                      border: '1px solid rgba(244,63,94,0.20)',
                      borderRadius: 12, padding: '12px 16px',
                      margin: '4px 0 0',
                      maxWidth: 320, wordBreak: 'break-word',
                    }}>
                      {errMsg || 'Unknown error. Check your service key and network.'}
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <motion.button
                        onClick={() => { setStep('confirm'); setConfirmTx('') }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          padding: '11px 22px', borderRadius: 12,
                          fontSize: 13, fontWeight: 600,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          color: '#f1f5f9', cursor: 'pointer',
                        }}
                      >
                        Retry
                      </motion.button>
                      <motion.button
                        onClick={handleClose}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          padding: '11px 22px', borderRadius: 12,
                          fontSize: 13, fontWeight: 600,
                          background: 'rgba(244,63,94,0.13)',
                          border: '1px solid rgba(244,63,94,0.26)',
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
