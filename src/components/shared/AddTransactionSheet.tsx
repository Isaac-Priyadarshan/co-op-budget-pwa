import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import type { NewTransaction } from '../../lib/db'

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other Income'],
  expense: ['Food', 'Transport', 'Rent', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Education', 'EMI', 'Other'],
}

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (tx: NewTransaction) => Promise<void>
}

export function AddTransactionSheet({ open, onClose, onAdd }: Props) {
  const { activeUser } = useUser()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => {
    setAmount('')
    setDescription('')
    setCategory('')
    setErr('')
    setSaving(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setErr('Enter a valid amount'); return }
    if (!description.trim()) { setErr('Enter a description'); return }
    if (!category) { setErr('Select a category'); return }
    if (!activeUser) { setErr('No active user'); return }
    try {
      setSaving(true)
      setErr('')
      await onAdd({
        amount: parseFloat(Number(amount).toFixed(2)),
        description: description.trim(),
        category,
        type,
        created_by: activeUser,
      })
      reset()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
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
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 40,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 50,
              background: 'linear-gradient(180deg, #0e1024 0%, #090c1c 100%)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderBottom: 'none',
              borderRadius: '28px 28px 0 0',
              padding: '0 20px',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
              maxHeight: '92dvh',
              overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 8px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f5f7ff', marginBottom: 20, letterSpacing: '-0.02em' }}>Add Transaction</h2>

            {/* Type toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {(['expense', 'income'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setType(t); setCategory('') }}
                  style={{
                    padding: '12px',
                    borderRadius: 14,
                    border: type === t
                      ? t === 'income' ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(248,113,113,0.5)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: type === t
                      ? t === 'income' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.12)'
                      : 'rgba(255,255,255,0.04)',
                    color: type === t
                      ? t === 'income' ? '#6ee7b7' : '#fca5a5'
                      : 'rgba(255,255,255,0.4)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    letterSpacing: '0.02em',
                    transition: 'all 0.16s ease',
                  }}
                >
                  {t === 'income' ? '↑ Income' : '↓ Expense'}
                </button>
              ))}
            </div>

            {/* Amount */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Amount (₹)</p>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, color: '#f5f7ff',
                  fontSize: 24, fontWeight: 700,
                  outline: 'none', letterSpacing: '-0.02em',
                }}
              />
            </label>

            {/* Description */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Description</p>
              <input
                type="text"
                placeholder="What was this for?"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{
                  width: '100%', padding: '13px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, color: '#f5f7ff',
                  fontSize: 15, outline: 'none',
                }}
              />
            </label>

            {/* Category */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Category</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES[type].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 100,
                      border: category === cat ? '1px solid rgba(139,92,246,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      background: category === cat ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
                      color: category === cat ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                      fontSize: 13, fontWeight: category === cat ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.14s ease',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {err && (
              <p style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', borderRadius: 10, border: '1px solid rgba(248,113,113,0.2)' }}>{err}</p>
            )}

            {/* Save */}
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                width: '100%', padding: '16px',
                background: saving ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: 16,
                color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em',
                boxShadow: saving ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.16s ease',
              }}
            >
              {saving ? 'Saving…' : 'Save Transaction'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
