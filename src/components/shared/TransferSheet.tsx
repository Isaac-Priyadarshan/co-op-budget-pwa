import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallets } from '../../hooks/useWallets'
import { useUser } from '../../context/UserContext'
import { updateWalletBalance, insertTransferPair } from '../../lib/db'
import { formatINR } from '../../utils/format'
import type { WalletEntry } from '../../lib/db'

const NAV_CLEARANCE = 'calc(env(safe-area-inset-bottom) + 120px)'

const inp: React.CSSProperties = {
  width: '100%', padding: '13px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 14, color: '#f5f7ff', fontSize: 15, outline: 'none',
}

interface SelectProps {
  label: string
  accent: string
  options: WalletEntry[]
  value: string
  onChange: (id: string) => void
  placeholder: string
}

function AccountSelect({ label, accent, options, value, onChange, placeholder }: SelectProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, marginBottom: 8 }}>{label}</p>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            ...inp,
            appearance: 'none',
            WebkitAppearance: 'none',
            paddingRight: 40,
            cursor: 'pointer',
            background: value ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
            border: value ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.1)',
            color: value ? '#f5f7ff' : 'rgba(255,255,255,0.3)',
          }}
        >
          <option value="" style={{ background: '#0d0f1c', color: 'rgba(255,255,255,0.4)' }}>{placeholder}</option>
          {options.map(opt => (
            <option key={opt.id} value={opt.id} style={{ background: '#0d0f1c', color: '#f5f7ff' }}>
              {opt.label}  ({formatINR(opt.balance)})
            </option>
          ))}
        </select>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

export interface TransferSheetProps {
  open: boolean
  onClose: () => void
}

export function TransferSheet({ open, onClose }: TransferSheetProps) {
  const { wallets, refresh } = useWallets()
  const { activeUser }       = useUser()

  const walletOptions = wallets.filter(w => w.type === 'cash')
  const destOptions   = wallets  // wallets + credit cards

  const [fromId,  setFromId]  = useState('')
  const [toId,    setToId]    = useState('')
  const [amount,  setAmount]  = useState('')
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setFromId(''); setToId(''); setAmount(''); setNote('')
      setErr(''); setSaving(false); setSuccess(false)
    }
  }, [open])

  const fromWallet = wallets.find(w => w.id === fromId)
  const toWallet   = wallets.find(w => w.id === toId)

  const handleTransfer = async () => {
    setErr('')
    if (!fromId)                         { setErr('Select a source wallet'); return }
    if (!toId)                           { setErr('Select a destination account'); return }
    if (fromId === toId)                 { setErr('Source and destination must be different'); return }
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setErr('Enter a valid amount greater than 0'); return }
    if (fromWallet && amt > fromWallet.balance) { setErr(`Insufficient balance in "${fromWallet.label}"`); return }

    try {
      setSaving(true)

      const newFromBalance = parseFloat(((fromWallet?.balance ?? 0) - amt).toFixed(2))
      const newToBalance   = parseFloat(((toWallet?.balance   ?? 0) + amt).toFixed(2))

      // 1. Update balances
      await Promise.all([
        updateWalletBalance(fromId, newFromBalance),
        updateWalletBalance(toId,   newToBalance),
      ])

      // 2. Write transfer log rows — one for each wallet so they appear
      //    in each wallet's own transaction log.
      //    type: 'transfer' keeps them out of the main Ledger screen.
      await insertTransferPair(
        fromId,
        fromWallet?.label ?? 'Unknown',
        toId,
        toWallet?.label ?? 'Unknown',
        amt,
        note.trim(),
        activeUser,
      )

      await refresh()
      setSuccess(true)
      setTimeout(() => { onClose() }, 1400)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Transfer failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ts-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!saving) onClose() }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 40 }}
          />

          {/* Sheet */}
          <motion.div
            key="ts-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg,#0c0e1f,#060814)',
              border: '1px solid rgba(99,102,241,0.28)', borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: `0 20px ${NAV_CLEARANCE}`,
              maxHeight: '90dvh', overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em' }}>Transfer Funds</h2>
              </div>
              <button
                onClick={onClose}
                style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >✕</button>
            </div>

            {/* Success state */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ textAlign: 'center', padding: '32px 16px', marginBottom: 8 }}
                >
                  <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#34D399', marginBottom: 4 }}>Transfer Complete</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                    {formatINR(parseFloat(amount))} moved from {fromWallet?.label} → {toWallet?.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', marginTop: 8 }}>
                    ⇄ Transfer log saved to both wallets
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!success && (
              <>
                {/* FROM */}
                <AccountSelect
                  label="From (Source Wallet)"
                  accent="rgba(52,211,153,0.8)"
                  options={walletOptions}
                  value={fromId}
                  onChange={id => { setFromId(id); setErr('') }}
                  placeholder="Select source wallet…"
                />

                {fromWallet && (
                  <div style={{ marginTop: -12, marginBottom: 16, padding: '8px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)' }}>
                    <p style={{ fontSize: 12, color: 'rgba(52,211,153,0.7)' }}>Available: <span style={{ fontWeight: 800, color: '#34D399' }}>{formatINR(fromWallet.balance)}</span></p>
                  </div>
                )}

                {/* Arrow divider */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.16)', border: '1px solid rgba(99,102,241,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 12px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                </div>

                {/* TO */}
                <AccountSelect
                  label="To (Destination Account)"
                  accent="rgba(248,113,113,0.8)"
                  options={destOptions.filter(w => w.id !== fromId)}
                  value={toId}
                  onChange={id => { setToId(id); setErr('') }}
                  placeholder="Select destination…"
                />

                {toWallet && (
                  <div style={{ marginTop: -12, marginBottom: 20, padding: '8px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)' }}>
                    <p style={{ fontSize: 12, color: 'rgba(248,113,113,0.7)' }}>Current balance: <span style={{ fontWeight: 800, color: '#F87171' }}>{formatINR(toWallet.balance)}</span></p>
                  </div>
                )}

                {/* AMOUNT */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.8)', marginBottom: 8 }}>Amount (₹)</p>
                  <input
                    type="number" inputMode="decimal" placeholder="0"
                    value={amount} onChange={e => { setAmount(e.target.value); setErr('') }}
                    style={{ ...inp, fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', color: '#A5B4FC' }}
                  />
                </div>

                {/* NOTE */}
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Note (optional)</p>
                  <input
                    type="text" inputMode="text" placeholder="e.g. Rent split, Groceries…"
                    value={note} onChange={e => setNote(e.target.value)}
                    style={inp}
                  />
                </div>

                {/* Error */}
                {err && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10 }}>
                    <p style={{ fontSize: 13, color: '#fca5a5' }}>{err}</p>
                  </div>
                )}

                {/* Preview pill */}
                {fromWallet && toWallet && parseFloat(amount) > 0 && (
                  <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 14, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)' }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
                      <span style={{ color: '#34D399', fontWeight: 700 }}>{fromWallet.label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}> → </span>
                      <span style={{ color: '#F87171', fontWeight: 700 }}>{toWallet.label}</span>
                      <br />
                      <span style={{ color: '#A5B4FC', fontWeight: 800 }}>{formatINR(parseFloat(amount))}</span>
                      {note && <span style={{ color: 'rgba(255,255,255,0.3)' }}>  ·  {note}</span>}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(99,102,241,0.6)', marginTop: 6 }}>⇄ Transfer log will be saved to both wallets</p>
                  </div>
                )}

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleTransfer}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '16px',
                    background: saving ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    border: 'none', borderRadius: 16,
                    color: '#fff', fontSize: 16, fontWeight: 800,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 4px 24px rgba(99,102,241,0.38)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {saving ? (
                    <span>Transferring…</span>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      <span>Transfer</span>
                    </>
                  )}
                </motion.button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
