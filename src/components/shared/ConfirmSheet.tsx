import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSheet({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="confirm-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.78)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 900,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="confirm-sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 901,
              background: 'linear-gradient(180deg, #111318 0%, #0b0d14 100%)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderBottom: 'none',
              padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
            }}
          >
            {/* Drag pill */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 20px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Icon */}
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'rgba(239,68,68,0.14)',
              border: '1px solid rgba(239,68,68,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, margin: '0 auto 18px',
            }}>🗑️</div>

            {/* Title */}
            <p style={{
              fontSize: 18, fontWeight: 800, color: '#f5f7ff',
              textAlign: 'center', margin: '0 0 10px',
              letterSpacing: '-0.02em',
            }}>{title}</p>

            {/* Message */}
            <p style={{
              fontSize: 14, color: 'rgba(255,255,255,0.45)',
              textAlign: 'center', margin: '0 0 28px',
              lineHeight: 1.5,
            }}>{message}</p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onCancel}
                style={{
                  flex: 1, padding: '14px',
                  borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >{cancelLabel}</motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onConfirm}
                style={{
                  flex: 1, padding: '14px',
                  borderRadius: 16, border: '1px solid rgba(239,68,68,0.4)',
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.85), rgba(220,38,38,0.85))',
                  color: '#fff',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                }}
              >{confirmLabel}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
