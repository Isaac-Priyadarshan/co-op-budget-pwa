// src/components/assets/BankAssetView.tsx
// Self-contained Bank asset module.
// Exports: BankAssetCard, BankLogSheet, BankEditSheet

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatINR } from '../../utils/format'
import { parseBankNotes, compoundWithTopUps } from '../../utils/bankCalc'
import type { BankDeposit } from '../../utils/bankCalc'
import {
  fmtStartDate,
  splitBankLabel,
  buildNotesStr,
  isTopUp,
} from '../../utils/assetHelpers'
import type { AssetItem } from '../../utils/assetHelpers'
import type { AssetPatch } from '../../lib/db'
import {
  ArrowRight,
  sheetShell,
  sheetFooter,
  DragHandle,
} from './AssetUI'

const ACCOUNT_TYPES = ['Savings', 'Current', 'FD', 'RD', 'NRE', 'NRO'] as const
type AccountType = (typeof ACCOUNT_TYPES)[number]

// ─── Icon button helper ────────────────────────────────────────
function iconBtn(
  color: string,
  bg: string,
  border: string
): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: bg,
    border: `1px solid ${border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    color,
  }
}

// ─── BankAssetCard ─────────────────────────────────────────────
export function BankAssetCard({
  asset,
  allBankItems,
  reorderMode,
  dragHandleProps,
  onDelete,
  onTopUp,
  onLog,
  onEdit,
  working,
}: {
  asset: AssetItem
  allBankItems: AssetItem[]
  reorderMode: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  onDelete: (id: string, label: string) => void
  onTopUp: (asset: AssetItem) => void
  onLog: (asset: AssetItem) => void
  onEdit: (asset: AssetItem) => void
  working: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const { rate, startDate, userNote } = parseBankNotes(asset.notes)
  const { bankName, accountType } = splitBankLabel(asset.label)

  const siblingDeposits = useMemo((): BankDeposit[] => {
    if (!rate) return []
    return allBankItems
      .filter((a) => a.label === asset.label)
      .map((a) => {
        const p = parseBankNotes(a.notes)
        return p.startDate
          ? { amount: a.value, startDate: p.startDate, rate: rate }
          : null
      })
      .filter((d): d is BankDeposit => d !== null)
  }, [allBankItems, asset.label, rate])

  const appreciated = useMemo(
    () =>
      siblingDeposits.length > 0
        ? compoundWithTopUps(siblingDeposits)
        : null,
    [siblingDeposits]
  )

  if (isTopUp(asset.notes)) return null

  const totalPrincipal = allBankItems
    .filter((a) => a.label === asset.label)
    .reduce((s, a) => s + a.value, 0)

  const sep = (
    <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
  )

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        background: 'rgba(96,165,250,0.08)',
        border: '1px solid rgba(96,165,250,0.16)',
        cursor: reorderMode ? 'grab' : 'pointer',
      }}
      onClick={() => {
        if (!reorderMode) setExpanded((e) => !e)
      }}
    >
      {/* ── Main card row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 10px' }}>
        {/* Left: drag handle or emoji */}
        {reorderMode ? (
          <div
            {...dragHandleProps}
            style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)', flexShrink: 0, cursor: 'grab', padding: '2px 4px', touchAction: 'none' }}
          >
            ☰
          </div>
        ) : (
          <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>🏦</span>
        )}

        {/* Center: bank name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 5px', display: 'flex', alignItems: 'baseline', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <span style={{ color: '#f5f7ff', flexShrink: 0, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{bankName}</span>
            {accountType ? (
              <>
                {sep}
                <span style={{ fontWeight: 500, fontSize: 12, color: 'rgba(147,197,253,0.75)', flexShrink: 0 }}>
                  {accountType}
                </span>
              </>
            ) : null}
            {userNote ? (
              <>
                {sep}
                <span style={{ fontWeight: 400, fontSize: 11, fontStyle: 'italic', color: 'rgba(148,163,184,0.55)', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userNote}
                </span>
              </>
            ) : null}
          </p>
          {rate ? (
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 700,
                color: '#93c5fd',
                padding: '2px 8px',
                borderRadius: 99,
                background: 'rgba(96,165,250,0.15)',
                border: '1px solid rgba(96,165,250,0.35)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {rate.toFixed(2)}% p.a.
            </span>
          ) : null}
        </div>

        {/* Right: value — fixed max-width so it never squeezes center */}
        <div style={{ flexShrink: 0, maxWidth: '44%', textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', flexWrap: 'nowrap', overflow: 'hidden' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#93c5fd', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatINR(totalPrincipal)}
            </span>
            {appreciated !== null && (
              <>
                <ArrowRight />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#34d399', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {formatINR(appreciated)}
                </span>
              </>
            )}
          </div>
          {startDate && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 3, fontVariantNumeric: 'tabular-nums', textAlign: 'right', margin: '3px 0 0' }}>
              {fmtStartDate(startDate)}
            </p>
          )}
        </div>
      </div>

      {/* ── Expanded options row ── */}
      <AnimatePresence>
        {expanded && !reorderMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '10px 14px 12px',
                borderTop: '1px solid rgba(96,165,250,0.12)',
              }}
            >
              {/* Log */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onLog(asset)}
                style={iconBtn('#93c5fd', 'rgba(96,165,250,0.1)', 'rgba(96,165,250,0.25)')}
                title="View log"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
              </motion.button>
              {/* Edit */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onEdit(asset)}
                style={iconBtn('#c4b5fd', 'rgba(167,139,250,0.1)', 'rgba(167,139,250,0.25)')}
                title="Edit"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </motion.button>
              {/* Top up */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onTopUp(asset)}
                style={iconBtn('#6ee7b7', 'rgba(52,211,153,0.1)', 'rgba(52,211,153,0.25)')}
                title="Top up"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </motion.button>
              {/* Delete */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => onDelete(asset.id, asset.label)}
                disabled={working === asset.id}
                style={iconBtn('#f87171', 'rgba(248,113,113,0.1)', 'rgba(248,113,113,0.25)')}
                title="Delete"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── BankLogSheet ──────────────────────────────────────────────
export function BankLogSheet({
  open,
  asset,
  allBankItems,
  onClose,
}: {
  open: boolean
  asset: AssetItem | null
  allBankItems: AssetItem[]
  onClose: () => void
}) {
  if (!asset) return null
  const { bankName, accountType } = splitBankLabel(asset.label)
  const { rate } = parseBankNotes(asset.notes)

  const siblings = allBankItems
    .filter((a) => a.label === asset.label)
    .map((a) => {
      const p = parseBankNotes(a.notes)
      return {
        id: a.id,
        value: a.value,
        startDate: p.startDate,
        created_at: a.created_at,
        isTopUp: isTopUp(a.notes),
      }
    })
    .sort((a, b) =>
      (a.startDate ?? a.created_at).localeCompare(b.startDate ?? b.created_at)
    )

  const totalPrincipal = siblings.reduce((s, a) => s + a.value, 0)
  const appreciated = rate
    ? compoundWithTopUps(
        siblings
          .filter((s) => s.startDate)
          .map((s) => ({ amount: s.value, startDate: s.startDate!, rate }))
      )
    : null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="blog-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <motion.div
            key="blog-sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={sheetShell}
          >
            <DragHandle />
            <div className="flex items-center gap-3 px-5 pb-[18px] flex-shrink-0">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px]"
                style={{
                  background: 'rgba(96,165,250,0.15)',
                  border: '1px solid rgba(96,165,250,0.3)',
                }}
              >
                📋
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-blue-300 m-0 mb-0.5">
                  Transaction Log
                </p>
                <h2 className="text-[18px] font-extrabold text-[#f5f7ff] m-0 tracking-tight">
                  {bankName}
                  {accountType ? ` – ${accountType}` : ''}
                </h2>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto px-5 pb-5"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="flex flex-col gap-2.5">
                {siblings.map((entry, i) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 14,
                      background: entry.isTopUp
                        ? 'rgba(96,165,250,0.06)'
                        : 'rgba(52,211,153,0.06)',
                      border: `1px solid ${
                        entry.isTopUp
                          ? 'rgba(96,165,250,0.14)'
                          : 'rgba(52,211,153,0.14)'
                      }`,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: entry.isTopUp ? '#60a5fa' : '#34d399',
                        boxShadow: `0 0 8px ${
                          entry.isTopUp ? '#60a5fa' : '#34d399'
                        }`,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          margin: '0 0 2px',
                          color: entry.isTopUp ? '#93c5fd' : '#6ee7b7',
                        }}
                      >
                        {i === 0 ? '🟢 Created' : '🔵 Top-up'}
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {entry.startDate
                          ? fmtStartDate(entry.startDate)
                          : fmtStartDate(
                              entry.created_at.substring(0, 10)
                            )}
                      </p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#f5f7ff', fontVariantNumeric: 'tabular-nums', margin: 0, flexShrink: 0 }}>
                      {formatINR(entry.value)}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 px-4 py-3.5 rounded-[14px]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="flex justify-between mb-2">
                  <span className="text-[12px] text-white/45">
                    Total Principal
                  </span>
                  <span className="text-[13px] font-extrabold text-blue-300 tabular-nums">
                    {formatINR(totalPrincipal)}
                  </span>
                </div>
                {appreciated !== null && (
                  <div className="flex justify-between">
                    <span className="text-[12px] text-white/45">
                      Appreciated Today
                    </span>
                    <span className="text-[13px] font-extrabold text-emerald-400 tabular-nums">
                      {formatINR(appreciated)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── BankEditSheet ─────────────────────────────────────────────
export function BankEditSheet({
  open,
  asset,
  allBankItems,
  onClose,
  onSave,
}: {
  open: boolean
  asset: AssetItem | null
  allBankItems: AssetItem[]
  onClose: () => void
  onSave: (
    ids: string[],
    newLabel: string,
    newNotes: (oldNotes: string | null) => string
  ) => Promise<void>
}) {
  const { bankName: initName, accountType: initType } = splitBankLabel(
    asset?.label ?? ''
  )
  const { userNote: initNote } = parseBankNotes(asset?.notes ?? null)
  const [bankName, setBankName] = useState(initName)
  const [accountType, setAccountType] = useState<AccountType | ''>(
    initType as AccountType | ''
  )
  const [note, setNote] = useState(initNote)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const prevOpen = useRef(false)

  if (open && !prevOpen.current) {
    const { bankName: n, accountType: t } = splitBankLabel(asset?.label ?? '')
    const { userNote: u } = parseBankNotes(asset?.notes ?? null)
    if (bankName !== n) setBankName(n)
    if (accountType !== t) setAccountType(t as AccountType | '')
    if (note !== u) setNote(u)
    setErr('')
  }
  prevOpen.current = open

  if (!asset) return null

  const siblings = allBankItems.filter((a) => a.label === asset.label)

  const handleSave = async () => {
    if (!bankName.trim()) { setErr('Enter bank name'); return }
    if (!accountType) { setErr('Select account type'); return }
    try {
      setSaving(true)
      setErr('')
      const newLabel = `${bankName.trim()} \u2013 ${accountType}`
      await onSave(
        siblings.map((a) => a.id),
        newLabel,
        (oldNotes) => {
          const p = parseBankNotes(oldNotes)
          return buildNotesStr(
            p.rate,
            p.startDate,
            oldNotes?.includes('top-up') ? (oldNotes ?? '') : note
          )
        }
      )
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(96,165,250,0.06)',
    border: '1px solid rgba(96,165,250,0.2)',
    borderRadius: 14,
    color: '#f5f7ff',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bedit-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <motion.div
            key="bedit-sh"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={sheetShell}
          >
            <DragHandle />
            <div className="flex items-center gap-3 px-5 pb-5 flex-shrink-0">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px]"
                style={{
                  background: 'rgba(96,165,250,0.15)',
                  border: '1px solid rgba(96,165,250,0.3)',
                }}
              >
                ✏️
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-blue-300 m-0 mb-0.5">
                  Edit Bank Asset
                </p>
                <h2 className="text-[18px] font-extrabold text-[#f5f7ff] m-0 tracking-tight">
                  {asset.label}
                </h2>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto px-5 pb-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <label className="block mb-[18px]">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2">
                  Bank Name
                </p>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  style={inp}
                  placeholder="e.g. HDFC Bank"
                />
              </label>

              <div className="mb-[18px]">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2.5">
                  Account Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_TYPES.map((t) => (
                    <motion.button
                      key={t}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setAccountType(t)}
                      style={{
                        padding: '9px 18px',
                        borderRadius: 100,
                        fontSize: 13,
                        fontWeight: accountType === t ? 700 : 400,
                        background:
                          accountType === t
                            ? 'rgba(96,165,250,0.22)'
                            : 'rgba(255,255,255,0.04)',
                        border:
                          accountType === t
                            ? '1px solid rgba(96,165,250,0.55)'
                            : '1px solid rgba(255,255,255,0.09)',
                        color:
                          accountType === t
                            ? '#93c5fd'
                            : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </motion.button>
                  ))}
                </div>
              </div>

              <label className="block mb-5">
                <p className="text-[11px] tracking-widest uppercase text-white/40 mb-2">
                  Note{' '}
                  <span className="opacity-50 normal-case tracking-normal">
                    (optional)
                  </span>
                </p>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={inp}
                  placeholder="Branch, account ending, any detail"
                />
              </label>

              {err && (
                <p
                  className="text-[13px] text-red-300 px-3.5 py-2.5 rounded-[10px] mb-2"
                  style={{
                    background: 'rgba(248,113,113,0.1)',
                    border: '1px solid rgba(248,113,113,0.2)',
                  }}
                >
                  {err}
                </p>
              )}
            </div>

            <div style={sheetFooter}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl text-white text-base font-extrabold border-none"
                style={{
                  background: saving
                    ? 'rgba(96,165,250,0.2)'
                    : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving
                    ? 'none'
                    : '0 4px 20px rgba(96,165,250,0.35)',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
