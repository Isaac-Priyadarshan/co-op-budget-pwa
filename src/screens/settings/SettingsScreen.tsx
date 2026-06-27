import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import type { AppUser } from '../../lib/types'
import { ResetDataSheet } from './ResetDataSheet'

// ─── Pastel card data ────────────────────────────────────────────────────────
const OPTIONS = [
  {
    key: 'theme',
    icon: '🎨',
    label: 'Theme',
    subtitle: 'Dark · System default',
    bubbleBg: 'rgba(139,92,246,0.18)',
    bubbleBorder: 'rgba(139,92,246,0.32)',
    cardBg: 'rgba(139,92,246,0.06)',
    cardBorder: 'rgba(139,92,246,0.14)',
  },
  {
    key: 'reminders',
    icon: '🔔',
    label: 'Reminders',
    subtitle: 'Daily nudges & alerts',
    bubbleBg: 'rgba(251,191,36,0.18)',
    bubbleBorder: 'rgba(251,191,36,0.32)',
    cardBg: 'rgba(251,191,36,0.05)',
    cardBorder: 'rgba(251,191,36,0.13)',
  },
  {
    key: 'export',
    icon: '📤',
    label: 'Export Data',
    subtitle: 'Download your records',
    bubbleBg: 'rgba(20,184,166,0.18)',
    bubbleBorder: 'rgba(20,184,166,0.32)',
    cardBg: 'rgba(20,184,166,0.05)',
    cardBorder: 'rgba(20,184,166,0.13)',
  },
  {
    key: 'reset',
    icon: '🗑️',
    label: 'Reset Data',
    subtitle: 'Clear transactions or wipe everything',
    bubbleBg: 'rgba(244,63,94,0.18)',
    bubbleBorder: 'rgba(244,63,94,0.32)',
    cardBg: 'rgba(244,63,94,0.06)',
    cardBorder: 'rgba(244,63,94,0.16)',
  },
] as const

const USERS: { id: AppUser; emoji: string; accent: string; accentBorder: string; activeBg: string }[] = [
  {
    id: 'Isaac',
    emoji: '👨🏽',
    accent: '#a5b4fc',
    accentBorder: 'rgba(165,180,252,0.45)',
    activeBg: 'linear-gradient(135deg,rgba(99,102,241,0.28),rgba(139,92,246,0.18))',
  },
  {
    id: 'Jenifa',
    emoji: '👩🏽',
    accent: '#f9a8d4',
    accentBorder: 'rgba(249,168,212,0.45)',
    activeBg: 'linear-gradient(135deg,rgba(236,72,153,0.22),rgba(244,114,182,0.14))',
  },
]

// ─── Variants ─────────────────────────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1] as const

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } },
}

export function SettingsScreen() {
  const { activeUser, setActiveUser } = useUser()
  const [resetSheetOpen, setResetSheetOpen] = useState(false)

  function handleOptionClick(key: string) {
    if (key === 'reset') setResetSheetOpen(true)
    // Other options (theme, reminders, export) are future work
  }

  return (
    <>
      <div style={{ padding: '28px 18px 64px', minHeight: '100%' }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >

          {/* ── Compact user switcher ─────────────────────────────────────── */}
          <motion.div variants={itemVariants} style={{ marginBottom: 28 }}>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)',
              marginBottom: 10,
            }}>
              Active User
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {USERS.map(u => {
                const isActive = activeUser === u.id
                return (
                  <motion.button
                    key={u.id}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setActiveUser(u.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      borderRadius: 16,
                      border: isActive ? `1px solid ${u.accentBorder}` : '1px solid rgba(255,255,255,0.07)',
                      background: isActive ? u.activeBg : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{u.emoji}</span>

                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isActive ? u.accent : 'rgba(255,255,255,0.35)',
                        margin: 0,
                        lineHeight: 1.2,
                      }}>
                        {u.id}
                      </p>
                      <AnimatePresence mode="wait">
                        {isActive ? (
                          <motion.p
                            key="active"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            style={{
                              fontSize: 10,
                              color: u.accent,
                              opacity: 0.7,
                              margin: 0,
                              marginTop: 2,
                              letterSpacing: '0.04em',
                            }}
                          >
                            ● Active
                          </motion.p>
                        ) : (
                          <motion.p
                            key="tap"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            style={{
                              fontSize: 10,
                              color: 'rgba(255,255,255,0.2)',
                              margin: 0,
                              marginTop: 2,
                            }}
                          >
                            Tap to switch
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {isActive && (
                      <motion.div
                        layoutId="user-active-ring"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 16,
                          pointerEvents: 'none',
                          boxShadow: `inset 0 0 0 1px ${u.accentBorder}`,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          {/* ── Section label ──────────────────────────────────────────────── */}
          <motion.p
            variants={itemVariants}
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)',
              marginBottom: 10,
            }}
          >
            Options
          </motion.p>

          {/* ── Pastel option cards ────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {OPTIONS.map((opt) => (
              <motion.button
                key={opt.key}
                variants={itemVariants}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleOptionClick(opt.key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '15px 16px',
                  borderRadius: 18,
                  border: `1px solid ${opt.cardBorder}`,
                  background: opt.cardBg,
                  cursor: 'pointer',
                  textAlign: 'left',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: opt.bubbleBg,
                  border: `1px solid ${opt.bubbleBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}>
                  {opt.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: opt.key === 'reset' ? 'rgba(251,113,133,0.9)' : 'rgba(255,255,255,0.88)',
                    margin: 0,
                    lineHeight: 1.25,
                  }}>
                    {opt.label}
                  </p>
                  <p style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.32)',
                    margin: 0,
                    marginTop: 3,
                    lineHeight: 1.3,
                  }}>
                    {opt.subtitle}
                  </p>
                </div>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ flexShrink: 0, opacity: 0.3 }}
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>
            ))}
          </div>

          {/* ── Quiet footer ───────────────────────────────────────────────── */}
          <motion.p
            variants={itemVariants}
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'rgba(255,255,255,0.12)',
              marginTop: 36,
              letterSpacing: '0.04em',
            }}
          >
            Isaac & Jenifa · Co-Op Budget · v1.0.0
          </motion.p>

        </motion.div>
      </div>

      {/* ── Reset Data Sheet (rendered outside scroll container, portal-like) ── */}
      <ResetDataSheet
        open={resetSheetOpen}
        onClose={() => setResetSheetOpen(false)}
      />
    </>
  )
}
