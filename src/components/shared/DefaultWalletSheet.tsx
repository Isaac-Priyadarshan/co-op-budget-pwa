import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WalletEntry } from '../../lib/db'
import type { DefaultWalletState, UserName } from '../../hooks/useDefaultWallets'

// ── Inline chip selector ───────────────────────────────────────────────────────────────────────────────────
// No dropdown. No position:absolute. No overflow fighting.
// Wallet options render as tappable chips that wrap naturally.
// Selected chip highlights with the user accent colour.
function ChipSelector({
  value,
  onChange,
  cashWallets,
  accentColor,
}: {
  value: string | null
  onChange: (id: string | null) => void
  cashWallets: WalletEntry[]
  accentColor: string
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {/* None chip */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => onChange(null)}
        style={{
          padding: '5px 12px',
          borderRadius: 999,
          border: `1px solid ${ value === null ? accentColor : 'rgba(255,255,255,0.12)'}`,
          background: value === null ? `${accentColor}22` : 'rgba(255,255,255,0.05)',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          color: value === null ? accentColor : 'rgba(255,255,255,0.38)',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        {value === null && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        None
      </motion.button>

      {/* Wallet chips */}
      {cashWallets.map(w => (
        <motion.button
          key={w.id}
          whileTap={{ scale: 0.88 }}
          onClick={() => onChange(w.id)}
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            border: `1px solid ${value === w.id ? accentColor : 'rgba(255,255,255,0.12)'}`,
            background: value === w.id ? `${accentColor}22` : 'rgba(255,255,255,0.05)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            color: value === w.id ? accentColor : 'rgba(255,255,255,0.55)',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: value === w.id ? `0 0 8px ${accentColor}44` : 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {value === w.id && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {w.label}
        </motion.button>
      ))}

      {cashWallets.length === 0 && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
          No cash wallets yet
        </p>
      )}
    </div>
  )
}

// ── User block ─────────────────────────────────────────────────────────────────────────────────────
function UserBlock({
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
      padding: '12px 14px',
      borderRadius: 16,
      background: `${accentColor}08`,
      border: `1px solid ${accentColor}1e`,
    }}>
      {/* Row: avatar + name + current selection label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: `${accentColor}20`, border: `1.5px solid ${accentColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: accentColor }}>{user[0]}</span>
        </div>
        {/* Name */}
        <p style={{
          fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: accentColor, flex: 1,
        }}>{user}</p>
        {/* Current value badge */}
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: value ? accentColor : 'rgba(255,255,255,0.25)',
          background: value ? `${accentColor}14` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${value ? accentColor + '30' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 999, padding: '2px 8px',
          letterSpacing: '0.01em', whiteSpace: 'nowrap',
        }}>
          {value
            ? cashWallets.find(w => w.id === value)?.label ?? 'Set'
            : 'Not set'}
        </span>
      </div>

      {/* Chip selector */}
      <ChipSelector
        value={value}
        onChange={onChange}
        cashWallets={cashWallets}
        accentColor={accentColor}
      />
    </div>
  )
}

// ── Main sheet ────────────────────────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (open) setLocal({ ...defaults })
  }, [open, defaults])

  const handleSave = async () => { await onSave(local) }

  const set = (user: UserName) => (id: string | null) =>
    setLocal(prev => ({ ...prev, [user]: id }))

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="dw-backdrop"
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

          {/* Sheet — height is purely auto, no overflow tricks needed */}
          <motion.div
            key="dw-sheet"
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
              // Sheet is entirely static — height = sum of its children, capped at 88dvh
              maxHeight: '88dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden', // safe now — no absolute children
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 18px 10px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.01em', margin: 0 }}>
                  Set Default Wallet
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Compact hint */}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' }}>
                  auto-selected on entry
                </span>
                <motion.button
                  whileTap={{ scale: 0.82 }}
                  onClick={onClose}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', flexShrink: 0, marginBottom: 2 }} />

            {/* Scrollable user blocks — the ONLY scrollable area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <UserBlock
                user="Isaac"
                accentColor="#818CF8"
                value={local.Isaac}
                onChange={set('Isaac')}
                cashWallets={cashWallets}
              />
              <UserBlock
                user="Jenifa"
                accentColor="#F472B6"
                value={local.Jenifa}
                onChange={set('Jenifa')}
                cashWallets={cashWallets}
              />

              {/* Error inline */}
              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 12,
                }}>
                  {error}
                </div>
              )}
            </div>

            {/* Save button — always pinned, never scrolled away */}
            <div style={{
              flexShrink: 0,
              padding: '10px 14px',
              paddingBottom: 'max(env(safe-area-inset-bottom), 14px)',
              background: '#090a0c',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%', height: 48, borderRadius: 14,
                  background: saving
                    ? 'rgba(251,191,36,0.10)'
                    : 'linear-gradient(135deg, rgba(251,191,36,0.20), rgba(217,119,6,0.14))',
                  border: '1px solid rgba(251,191,36,0.34)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.65 : 1,
                  transition: 'opacity 0.15s ease',
                }}
              >
                {saving ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block', fontSize: 16, lineHeight: 1 }}
                  >⟳</motion.span>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FBBF24', letterSpacing: '0.03em' }}>
                  {saving ? 'Saving…' : 'Save Defaults'}
                </span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
