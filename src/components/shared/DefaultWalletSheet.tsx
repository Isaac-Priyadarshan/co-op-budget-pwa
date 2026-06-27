import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WalletEntry } from '../../lib/db'
import type { DefaultWalletState, UserName } from '../../hooks/useDefaultWallets'

// ── Avatar initial badge ────────────────────────────────────────────────────
function Avatar({ name, color }: { name: UserName; color: string }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
      background: `${color}22`, border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 16, fontWeight: 800, color }}>
        {name[0]}
      </span>
    </div>
  )
}

// ── Custom wallet selector ───────────────────────────────────────────────────
function WalletPicker({
  userId,
  value,
  onChange,
  cashWallets,
  accentColor,
}: {
  userId: UserName
  value: string | null
  onChange: (id: string | null) => void
  cashWallets: WalletEntry[]
  accentColor: string
}) {
  const [open, setOpen] = useState(false)
  const selected = cashWallets.find(w => w.id === value)

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {/* Trigger */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 14,
          background: `${accentColor}0e`,
          border: `1px solid ${accentColor}2a`,
          cursor: 'pointer',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: selected ? '#f5f7ff' : 'rgba(255,255,255,0.35)' }}>
          {selected ? selected.label : 'None (not set)'}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            key={`picker-${userId}`}
            initial={{ opacity: 0, y: -6, scaleY: 0.92 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.94 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              zIndex: 100,
              borderRadius: 14,
              background: '#0e0e10',
              border: `1px solid ${accentColor}28`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}18`,
              overflow: 'hidden',
              transformOrigin: 'top center',
            }}
          >
            {/* None option */}
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '11px 14px',
                fontSize: 13, fontWeight: 600,
                color: value === null ? accentColor : 'rgba(255,255,255,0.4)',
                background: value === null ? `${accentColor}12` : 'transparent',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              None (not set)
            </button>

            {/* Wallet options */}
            {cashWallets.map(w => (
              <button
                key={w.id}
                onClick={() => { onChange(w.id); setOpen(false) }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '11px 14px',
                  fontSize: 13, fontWeight: 600,
                  color: value === w.id ? accentColor : '#f5f7ff',
                  background: value === w.id ? `${accentColor}14` : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>{w.label}</span>
                {value === w.id && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}

            {cashWallets.length === 0 && (
              <p style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                No cash wallets added yet
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── User row ─────────────────────────────────────────────────────────────────
function UserRow({
  user,
  accentColor,
  value,
  onChange,
  cashWallets,
}: {
  user: UserName
  accentColor: string
  value: string | null
  onChange: (id: string | null) => void
  cashWallets: WalletEntry[]
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      borderRadius: 18,
      background: `${accentColor}09`,
      border: `1px solid ${accentColor}1e`,
    }}>
      <Avatar name={user} color={accentColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: `${accentColor}99`, marginBottom: 6 }}>
          {user}
        </p>
        <WalletPicker
          userId={user}
          value={value}
          onChange={onChange}
          cashWallets={cashWallets}
          accentColor={accentColor}
        />
      </div>
    </div>
  )
}

// ── Main sheet ────────────────────────────────────────────────────────────────
export function DefaultWalletSheet({
  open,
  onClose,
  defaults,
  cashWallets,
  saving,
  error,
  onSave,
}: {
  open: boolean
  onClose: () => void
  defaults: DefaultWalletState
  cashWallets: WalletEntry[]
  saving: boolean
  error: string | null
  onSave: (next: DefaultWalletState) => Promise<void>
}) {
  const [local, setLocal] = useState<DefaultWalletState>({ Isaac: null, Jenifa: null })

  // Sync local state whenever sheet opens
  useEffect(() => {
    if (open) setLocal({ ...defaults })
  }, [open, defaults])

  const handleSave = async () => {
    await onSave(local)
  }

  const set = (user: UserName) => (id: string | null) =>
    setLocal(prev => ({ ...prev, [user]: id }))

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="default-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="default-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 201,
              borderRadius: '24px 24px 0 0',
              background: '#090a0c',
              border: '1px solid rgba(99,102,241,0.2)',
              borderBottom: 'none',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.01em' }}>Set Default Wallet</h2>
              </div>
              <motion.button
                whileTap={{ scale: 0.82 }}
                onClick={onClose}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            </div>

            {/* Subtitle */}
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '0 20px 16px', lineHeight: 1.5 }}>
              The default wallet is auto-selected when that user adds a new transaction.
            </p>

            {/* User rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px 20px' }}>
              <UserRow
                user="Isaac"
                accentColor="#818CF8"
                value={local.Isaac}
                onChange={set('Isaac')}
                cashWallets={cashWallets}
              />
              <UserRow
                user="Jenifa"
                accentColor="#F472B6"
                value={local.Jenifa}
                onChange={set('Jenifa')}
                cashWallets={cashWallets}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ margin: '0 16px 12px', padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 12 }}>
                {error}
              </div>
            )}

            {/* Save button */}
            <div style={{ padding: '0 16px 16px' }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%', height: 50, borderRadius: 16,
                  background: saving
                    ? 'rgba(251,191,36,0.12)'
                    : 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(217,119,6,0.16))',
                  border: '1px solid rgba(251,191,36,0.36)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                {saving ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span style={{ fontSize: 14, fontWeight: 800, color: '#FBBF24', letterSpacing: '0.03em' }}>
                  {saving ? 'Saving…' : 'Save Defaults'}
                </span>
              </motion.button>
            </div>

            {/* Spinner keyframe */}
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
