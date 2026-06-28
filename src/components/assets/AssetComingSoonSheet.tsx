import { motion, AnimatePresence } from 'framer-motion'
import type { AssetGroupId } from '../shared/AssetGroupPicker'
import { ASSET_GROUPS } from '../shared/AssetGroupPicker'

interface Props {
  open: boolean
  onClose: () => void
  groupId: AssetGroupId | undefined
}

export function AssetComingSoonSheet({ open, onClose, groupId }: Props) {
  const group = ASSET_GROUPS.find(g => g.id === groupId)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cs-bd"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              zIndex: 40,
            }}
          />

          <motion.div
            key="cs-sh"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
              background: 'linear-gradient(180deg, #0d0d0d 0%, #080808 100%)',
              border: `1px solid ${group?.border ?? 'rgba(255,255,255,0.12)'}`,
              borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: '0 24px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 36px)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Icon + label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '28px 0 36px' }}>
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: 80, height: 80, borderRadius: 28, marginBottom: 20,
                  background: group?.color ?? 'rgba(255,255,255,0.08)',
                  border: `1px solid ${group?.border ?? 'rgba(255,255,255,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 38,
                  boxShadow: `0 8px 32px ${group?.color ?? 'rgba(255,255,255,0.05)'}`,
                }}
              >
                {group?.emoji ?? '📦'}
              </motion.div>

              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: group?.text ?? 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                {group?.label ?? 'Asset'}
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f7ff', letterSpacing: '-0.02em', marginBottom: 12 }}>Coming Soon</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', maxWidth: 260, lineHeight: 1.6 }}>
                The {group?.label} entry form is being built. Check back in the next update.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              style={{
                width: '100%', padding: '15px',
                background: group?.color ?? 'rgba(255,255,255,0.08)',
                border: `1px solid ${group?.border ?? 'rgba(255,255,255,0.15)'}`,
                borderRadius: 16,
                color: group?.text ?? '#f5f7ff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
              }}
            >Got it</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
