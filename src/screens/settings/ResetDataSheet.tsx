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

// ─── Core delete helper — service-role key, bypasses RLS ─────────────────────
async function sbDelete(table: string, filter: string): Promise<void> {
  if (!SB_URL || !SB_SKEY) {
    throw new Error(
      'Service key not configured. Add VITE_SUPABASE_SERVICE_KEY to your .env.local and Vercel env vars.'
    )
  }
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      apikey:          SB_SKEY,
      Authorization:   `Bearer ${SB_SKEY}`,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal',
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[${table}] HTTP ${res.status}: ${body}`)
  }
}

// Patch helper — used to null-out FK references before deleting parent rows
async function sbPatch(
  table: string,
  filter: string,
  body: Record<string, null>
): Promise<void> {
  if (!SB_URL || !SB_SKEY) {
    throw new Error('Service key not configured.')
  }
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      apikey:          SB_SKEY,
      Authorization:   `Bearer ${SB_SKEY}`,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const body2 = await res.text()
    throw new Error(`[${table} PATCH] HTTP ${res.status}: ${body2}`)
  }
}

// ─── Reusable "wipe all rows" shorthand ──────────────────────────────────────
const ALL = 'id=neq.00000000-0000-0000-0000-000000000000'

// ─── 1. Erase History ─────────────────────────────────────────────────────────
// Removes every transaction record app-wide
async function eraseHistory(): Promise<void> {
  await sbDelete('transactions', ALL)
}

// ─── 2. Erase Categories ──────────────────────────────────────────────────────
// Deletes subcategories first (FK child), then categories (FK parent)
// Also clears budgets since they reference category labels
async function eraseCategories(): Promise<void> {
  await sbDelete('subcategories', ALL)
  await sbDelete('categories',    ALL)
  await sbDelete('budgets',       ALL)
}

// ─── 3. Erase Wallet & Credit Card ───────────────────────────────────────────
// Null-out FK references in user_preferences and transactions before deleting wallets
async function eraseWalletCredit(): Promise<void> {
  // First: clear the FK reference in user_preferences (default_wallet_id → wallets.id)
  await sbPatch(
    'user_preferences',
    'user_name=neq.__none__',
    { default_wallet_id: null }
  )
  // Second: clear wallet_id on transactions so FK doesn't block wallet delete
  await sbPatch(
    'transactions',
    'wallet_id=neq.00000000-0000-0000-0000-000000000000',
    { wallet_id: null }
  )
  // Now safe to delete all wallets
  await sbDelete('wallets', ALL)
}

// ─── 4. Clear Budget ──────────────────────────────────────────────────────────
// Removes all monthly budget allocations
async function clearBudget(): Promise<void> {
  await sbDelete('budgets', ALL)
}

// ─── 5. Full Wipeout ──────────────────────────────────────────────────────────
// FK-safe sequential deletion of ALL 11 tables
// Order: children before parents, nullify FKs where needed
async function fullWipeOut(): Promise<void> {
  const errors: string[] = []

  const step = async (fn: () => Promise<void>) => {
    try { await fn() } catch (e) { errors.push(e instanceof Error ? e.message : String(e)) }
  }

  // 1. Null-out FK references first so cascading deletes don't block
  await step(() =>
    sbPatch('user_preferences', 'user_name=neq.__none__', { default_wallet_id: null })
  )
  await step(() =>
    sbPatch('transactions', 'wallet_id=neq.00000000-0000-0000-0000-000000000000', { wallet_id: null })
  )

  // 2. Delete all data tables in FK-safe order
  const tables = [
    'transactions',      // references wallets (nullified above)
    'subcategories',     // references categories
    'categories',
    'budgets',
    'user_preferences',  // references wallets (nullified above)
    'wallets',
    'loans',
    'recurring_payments',
    'lent',
    'borrowed',
    'assets',
  ]

  for (const table of tables) {
    await step(() => sbDelete(table, ALL))
  }

  if (errors.length > 0) {
    throw new Error(`Some tables failed to wipe:\n${errors.join('\n')}`)
  }
}

// ─── Mode config ──────────────────────────────────────────────────────────────
const MODES: {
  key:           ResetMode
  icon:          string
  label:         string
  subtitle:      string
  danger:        boolean
  bubbleBg:      string
  bubbleBorder:  string
  activeBg:      string
  activeBorder:  string
}[] = [
  {
    key:          'erase_history',
    icon:         '🧹',
    label:        'Erase History',
    subtitle:     'Removes all transaction records app-wide',
    danger:       false,
    bubbleBg:     'rgba(99,102,241,0.18)',
    bubbleBorder: 'rgba(99,102,241,0.35)',
    activeBg:     'rgba(99,102,241,0.10)',
    activeBorder: 'rgba(99,102,241,0.45)',
  },
  {
    key:          'erase_categories',
    icon:         '🗂️',
    label:        'Erase Categories',
    subtitle:     'Clears all expense & income categories and their subcategories',
    danger:       false,
    bubbleBg:     'rgba(20,184,166,0.18)',
    bubbleBorder: 'rgba(20,184,166,0.35)',
    activeBg:     'rgba(20,184,166,0.10)',
    activeBorder: 'rgba(20,184,166,0.45)',
  },
  {
    key:          'erase_wallet_credit',
    icon:         '👛',
    label:        'Erase Wallet & Credit Card',
    subtitle:     'Permanently deletes all wallets and credit cards',
    danger:       false,
    bubbleBg:     'rgba(251,191,36,0.18)',
    bubbleBorder: 'rgba(251,191,36,0.35)',
    activeBg:     'rgba(251,191,36,0.10)',
    activeBorder: 'rgba(251,191,36,0.45)',
  },
  {
    key:          'clear_budget',
    icon:         '💰',
    label:        'Clear Budget',
    subtitle:     'Resets all monthly budget allocations across every category',
    danger:       false,
    bubbleBg:     'rgba(34,197,94,0.18)',
    bubbleBorder: 'rgba(34,197,94,0.35)',
    activeBg:     'rgba(34,197,94,0.10)',
    activeBorder: 'rgba(34,197,94,0.45)',
  },
  {
    key:          'full_wipe',
    icon:         '💥',
    label:        'Full Wipeout',
    subtitle:     'Permanently destroys every record, category, wallet, budget, loan, asset — everything',
    danger:       true,
    bubbleBg:     'rgba(244,63,94,0.20)',
    bubbleBorder: 'rgba(244,63,94,0.40)',
    activeBg:     'rgba(244,63,94,0.12)',
    activeBorder: 'rgba(244,63,94,0.55)',
  },
]

// ─── Animation variants ───────────────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1] as const

const sheetVariants: Variants = {
  hidden:  { y: '100%', opacity: 0.6 },
  visible: { y: 0,      opacity: 1,   transition: { type: 'spring', stiffness: 260, damping: 30 } },
  exit:    { y: '100%', opacity: 0,   transition: { duration: 0.22, ease: EASE } },
}

const overlayVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit:    { opacity: 0, transition: { duration: 0.2  } },
}

const rowVariants: Variants = {
  hidden:  { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 300, damping: 28 },
  }),
}

// ─── Confirm step labels ──────────────────────────────────────────────────────
const CONFIRM_LABELS: Record<ResetMode, string> = {
  erase_history:      'Type DELETE to erase all transactions',
  erase_categories:   'Type DELETE to erase all categories',
  erase_wallet_credit:'Type DELETE to erase all wallets & cards',
  clear_budget:       'Type DELETE to clear all budgets',
  full_wipe:          'Type WIPEOUT to destroy everything',
}

const CONFIRM_KEYWORDS: Record<ResetMode, string> = {
  erase_history:       'DELETE',
  erase_categories:    'DELETE',
  erase_wallet_credit: 'DELETE',
  clear_budget:        'DELETE',
  full_wipe:           'WIPEOUT',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ResetDataSheet({ open, onClose }: Props) {
  const [selected,  setSelected]  = useState<ResetMode | null>(null)
  const [step,      setStep]      = useState<'select' | 'confirm' | 'running' | 'done' | 'error'>('select')
  const [confirmTx, setConfirmTx] = useState('')
  const [errMsg,    setErrMsg]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // ─── Reset internal state whenever sheet closes ───────────────────────────
  function handleClose() {
    setSelected(null)
    setStep('select')
    setConfirmTx('')
    setErrMsg('')
    onClose()
  }

  // ─── Select a mode ────────────────────────────────────────────────────────
  function handleSelect(key: ResetMode) {
    setSelected(key)
    setStep('confirm')
    setConfirmTx('')
    setTimeout(() => inputRef.current?.focus(), 120)
  }

  // ─── Execute the chosen operation ────────────────────────────────────────
  async function handleExecute() {
    if (!selected) return
    const keyword = CONFIRM_KEYWORDS[selected]
    if (confirmTx.trim().toUpperCase() !== keyword) return

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

  // ─── Derived helpers ──────────────────────────────────────────────────────
  const mode        = MODES.find(m => m.key === selected)
  const keyword     = selected ? CONFIRM_KEYWORDS[selected] : 'DELETE'
  const isReady     = confirmTx.trim().toUpperCase() === keyword
  const isFullWipe  = selected === 'full_wipe'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{ background: 'rgba(10,10,14,0.97)', border: '1px solid rgba(255,255,255,0.07)' }}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* ── STEP: SELECT ─────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {step === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
                  exit={{    opacity: 0, y: -8, transition: { duration: 0.15 } }}
                  className="px-5 pb-8"
                >
                  <h2
                    className="text-lg font-semibold mb-1 mt-2"
                    style={{ color: '#f1f5f9' }}
                  >
                    Reset Data
                  </h2>
                  <p className="text-sm mb-5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                    Choose what to permanently erase. This cannot be undone.
                  </p>

                  <div className="flex flex-col gap-3">
                    {MODES.map((m, i) => (
                      <motion.button
                        key={m.key}
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => handleSelect(m.key)}
                        className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
                        style={{
                          background:   m.bubbleBg,
                          border:       `1px solid ${m.bubbleBorder}`,
                        }}
                      >
                        <span className="text-2xl leading-none">{m.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-semibold leading-tight"
                            style={{ color: m.danger ? '#fb7185' : '#f1f5f9' }}
                          >
                            {m.label}
                          </p>
                          <p
                            className="text-xs mt-0.5 leading-snug"
                            style={{ color: 'rgba(148,163,184,0.75)' }}
                          >
                            {m.subtitle}
                          </p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(148,163,184,0.5)" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── STEP: CONFIRM ──────────────────────────────────────── */}
              {step === 'confirm' && mode && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0,  transition: { type: 'spring', stiffness: 300, damping: 28 } }}
                  exit={{    opacity: 0, x: -24, transition: { duration: 0.15 } }}
                  className="px-5 pb-8"
                >
                  {/* Back button */}
                  <button
                    onClick={() => { setStep('select'); setConfirmTx('') }}
                    className="flex items-center gap-1.5 mt-2 mb-4 text-xs"
                    style={{ color: 'rgba(148,163,184,0.7)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                    Back
                  </button>

                  {/* Mode pill */}
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
                    style={{ background: mode.activeBg, border: `1px solid ${mode.activeBorder}` }}
                  >
                    <span className="text-base leading-none">{mode.icon}</span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: mode.danger ? '#fb7185' : '#f1f5f9' }}
                    >
                      {mode.label}
                    </span>
                  </div>

                  {/* Warning box */}
                  <div
                    className="rounded-2xl p-4 mb-5"
                    style={{
                      background: isFullWipe
                        ? 'rgba(244,63,94,0.10)'
                        : 'rgba(251,191,36,0.08)',
                      border: `1px solid ${isFullWipe ? 'rgba(244,63,94,0.3)' : 'rgba(251,191,36,0.25)'}`,
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{ color: isFullWipe ? '#fb7185' : '#fbbf24' }}
                    >
                      {isFullWipe ? '⚠️ This destroys everything' : '⚠️ This is irreversible'}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.8)' }}>
                      {isFullWipe
                        ? 'All transactions, categories, subcategories, wallets, credit cards, budgets, loans, recurring payments, lent and borrowed records, and assets will be permanently deleted. There is no undo.'
                        : `${mode.subtitle}. Once deleted, this data cannot be recovered.`
                      }
                    </p>
                  </div>

                  {/* Confirm input */}
                  <label
                    className="block text-xs mb-2 font-medium"
                    style={{ color: 'rgba(148,163,184,0.9)' }}
                  >
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
                    className="w-full rounded-xl px-4 py-3 text-sm font-mono mb-4 outline-none transition-all"
                    style={{
                      background:  'rgba(255,255,255,0.06)',
                      border:      `1px solid ${isReady
                        ? (isFullWipe ? 'rgba(244,63,94,0.6)' : 'rgba(99,102,241,0.6)')
                        : 'rgba(255,255,255,0.12)'}`,
                      color:       '#f1f5f9',
                      letterSpacing: '0.08em',
                    }}
                  />

                  {/* Execute button */}
                  <motion.button
                    onClick={handleExecute}
                    disabled={!isReady}
                    whileTap={isReady ? { scale: 0.97 } : {}}
                    className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all"
                    style={{
                      background: isReady
                        ? (isFullWipe
                            ? 'linear-gradient(135deg, rgba(244,63,94,0.9), rgba(220,38,38,0.9))'
                            : 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.9))')
                        : 'rgba(255,255,255,0.06)',
                      color:  isReady ? '#fff' : 'rgba(148,163,184,0.4)',
                      border: `1px solid ${isReady ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                      cursor: isReady ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {isFullWipe ? '💥 Destroy Everything' : `🗑️ Confirm ${mode.label}`}
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP: RUNNING ──────────────────────────────────────── */}
              {step === 'running' && (
                <motion.div
                  key="running"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{    opacity: 0 }}
                  className="flex flex-col items-center justify-center px-5 py-16 gap-4"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-10 h-10 rounded-full"
                    style={{ border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8' }}
                  />
                  <p className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.9)' }}>
                    Erasing data…
                  </p>
                </motion.div>
              )}

              {/* ── STEP: DONE ─────────────────────────────────────────── */}
              {step === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 24 } }}
                  exit={{    opacity: 0 }}
                  className="flex flex-col items-center justify-center px-5 py-16 gap-3"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, transition: { type: 'spring', stiffness: 320, damping: 20, delay: 0.1 } }}
                    className="text-5xl"
                  >
                    ✅
                  </motion.div>
                  <p className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
                    Done. Data erased.
                  </p>
                  <p className="text-xs text-center" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    {mode?.label} completed successfully.
                  </p>
                  <motion.button
                    onClick={handleClose}
                    whileTap={{ scale: 0.97 }}
                    className="mt-4 px-8 py-3 rounded-2xl text-sm font-semibold"
                    style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }}
                  >
                    Close
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP: ERROR ────────────────────────────────────────── */}
              {step === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{    opacity: 0 }}
                  className="flex flex-col items-center justify-center px-5 py-12 gap-3"
                >
                  <div className="text-4xl">⚠️</div>
                  <p className="text-base font-semibold" style={{ color: '#fb7185' }}>
                    Something went wrong
                  </p>
                  <p
                    className="text-xs text-center font-mono px-4 py-3 rounded-xl w-full max-w-xs"
                    style={{ background: 'rgba(244,63,94,0.10)', color: 'rgba(251,182,182,0.8)', border: '1px solid rgba(244,63,94,0.25)' }}
                  >
                    {errMsg || 'Unknown error. Check your service key and network.'}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <motion.button
                      onClick={() => { setStep('confirm'); setConfirmTx('') }}
                      whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9' }}
                    >
                      Retry
                    </motion.button>
                    <motion.button
                      onClick={handleClose}
                      whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }}
                    >
                      Close
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
