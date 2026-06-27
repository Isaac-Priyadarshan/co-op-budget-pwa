import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { formatINR } from '../../utils/format'

interface TransferSheetProps {
  open: boolean
  onClose: () => void
}

export function TransferSheet({ open, onClose }: TransferSheetProps) {
  const { wallets, update } = useWallets()

  const cashWallets  = wallets.filter(w => w.type === 'cash')
  const allAccounts  = wallets // both cash + credit as destination

  const [fromId, setFromId]   = useState('')
  const [toId, setToId]       = useState('')
  const [amount, setAmount]   = useState('')
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setFromId(cashWallets[0]?.id ?? '')
      setToId('')
      setAmount('')
      setNote('')
      setError(null)
      setSuccess(false)
    }
  }, [open])

  const fromWallet = wallets.find(w => w.id === fromId)
  const toWallet   = wallets.find(w => w.id === toId)

  const handleTransfer = async () => {
    setError(null)
    const amt = parseFloat(amount)
    if (!fromId)               return setError('Select a source wallet.')
    if (!toId)                 return setError('Select a destination account.')
    if (fromId === toId)       return setError('Source and destination cannot be the same.')
    if (isNaN(amt) || amt <= 0) return setError('Enter a valid amount greater than 0.')
    if (fromWallet && amt > fromWallet.balance) return setError(`Insufficient balance in ${fromWallet.label}.`)

    setLoading(true)
    try {
      // Deduct from source
      await update(fromId, {
        label:        fromWallet!.label,
        type:         fromWallet!.type,
        balance:      fromWallet!.balance - amt,
        credit_limit: fromWallet!.credit_limit,
        billing_date: fromWallet!.billing_date,
        due_date:     fromWallet!.due_date,
      })
      // Add to destination
      await update(toId, {
        label:        toWallet!.label,
        type:         toWallet!.type,
        balance:      toWallet!.balance + amt,
        credit_limit: toWallet!.credit_limit,
        billing_date: toWallet!.billing_date,
        due_date:     toWallet!.due_date,
      })
      setSuccess(true)
      setTimeout(() => onClose(), 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transfer failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Select pill row ────────────────────────────────────────────────────────
const SelectRow = ({
    label, value, onChange, options, placeholder, accent,
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    options: typeof wallets
    placeholder: string
    accent: string
  }) => (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>
        {label}
      </p>
      <div style={{
        position: 'relative',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${value ? accent + '44' : 'rgba(255,255,255,0.10)'}`,
        overflow: 'hidden',
      }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 40px 14px 16px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: value ? '#f5f7ff' : 'rgba(255,255,255,0.32)',
            fontSize: 14,
            fontWeight: 600,
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="" disabled style={{ background: '#1a1a1a', color: 'rgba(255,255,255,0.4)' }}>{placeholder}</option>
          {options.map(w => (
            <option key={w.id} value={w.id} style={{ background: '#1a1a1a', color: '#f5f7ff' }}>
              {w.label}  ({formatINR(w.balance)})
            </option>
          ))}
        </select>
        {/* Chevron */}
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>
      {/* Balance hint */}
      {value && (
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 5, paddingLeft: 4 }}>
          Balance: {formatINR(wallets.find(w => w.id === value)?.balance ?? 0)}
        </p>
      )}
    </div>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="transfer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="transfer-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.9 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
              background: 'linear-gradient(170deg, #0d0d10 0%, #0a0a0d 100%)',
              borderTop: '1px solid rgba(99,102,241,0.22)',
              borderRadius: '24px 24px 0 0',
              padding: '0 0 calc(env(safe-area-inset-bottom) + 24px)',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.7)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.14)' }} />
            </div>

            <div style={{ padding: '12px 22px 8px' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.14))',
                    border: '1px solid rgba(99,102,241,0.32)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#f5f7ff' }}>Transfer Funds</p>
                </div>
                <motion.button whileTap={{ scale: 0.85 }} onClick={onClose}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </motion.button>
              </div>

              {/* Success state */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      textAlign: 'center', padding: '32px 16px',
                      borderRadius: 18,
                      background: 'rgba(52,211,153,0.08)',
                      border: '1px solid rgba(52,211,153,0.22)',
                      marginBottom: 16,
                    }}
                  >
                    <p style={{ fontSize: 32, marginBottom: 10 }}>✅</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#34D399', marginBottom: 4 }}>Transfer Complete</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                      {formatINR(parseFloat(amount))} moved from {fromWallet?.label} to {toWallet?.label}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!success && (
                <>
                  {/* FROM */}
                  <SelectRow
                    label="From (Source Wallet)"
                    value={fromId}
                    onChange={setFromId}
                    options={cashWallets}
                    placeholder="Select source wallet"
                    accent="#34D399"
                  />

                  {/* Arrow divider */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(99,102,241,0.12)',
                      border: '1px solid rgba(99,102,241,0.22)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
                    </div>
                  </div>

                  {/* TO */}
                  <SelectRow
                    label="To (Destination Account)"
                    value={toId}
                    onChange={setToId}
                    options={allAccounts}
                    placeholder="Select destination account"
                    accent="#F87171"
                  />

                  {/* Amount */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>Amount</p>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${amount ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.10)'}`,
                      padding: '0 16px',
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#FBBF24' }}>₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        style={{
                          flex: 1, background: 'transparent', border: 'none', outline: 'none',
                          color: '#f5f7ff', fontSize: 16, fontWeight: 700, padding: '14px 0',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                    </div>
                  </div>

                  {/* Note */}
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>Note (optional)</p>
                    <input
                      type="text"
                      placeholder="e.g. Moving funds to card"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '14px 16px', borderRadius: 14,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        outline: 'none', color: '#f5f7ff', fontSize: 14,
                      }}
                    />
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                          padding: '12px 16px', borderRadius: 12, marginBottom: 16,
                          background: 'rgba(248,113,113,0.1)',
                          border: '1px solid rgba(248,113,113,0.25)',
                          color: '#FCA5A5', fontSize: 13, fontWeight: 500,
                        }}
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Transfer button */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleTransfer}
                    disabled={loading}
                    style={{
                      width: '100%', padding: '16px',
                      borderRadius: 16, border: 'none',
                      background: loading
                        ? 'rgba(99,102,241,0.2)'
                        : 'linear-gradient(135deg, rgba(99,102,241,0.85), rgba(139,92,246,0.75))',
                      color: loading ? 'rgba(255,255,255,0.4)' : '#ffffff',
                      fontSize: 15, fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                    }}
                  >
                    {loading ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.9s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        Processing…
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="17 1 21 5 17 9" />
                          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          <polyline points="7 23 3 19 7 15" />
                          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                        Transfer
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
