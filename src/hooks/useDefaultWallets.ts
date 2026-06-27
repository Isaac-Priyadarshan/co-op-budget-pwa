import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { WalletEntry } from '../lib/db'

export type UserName = 'Isaac' | 'Jenifa'

export interface DefaultWalletState {
  Isaac: string | null
  Jenifa: string | null
}

export function useDefaultWallets(wallets: WalletEntry[]) {
  const [defaults, setDefaults] = useState<DefaultWalletState>({ Isaac: null, Jenifa: null })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const cashWallets = wallets.filter(w => w.type === 'cash')

  // ── Load both users' preferences on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('user_preferences')
      .select('user_name, default_wallet_id')
      .in('user_name', ['Isaac', 'Jenifa'])
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setLoading(false); return }
        const next: DefaultWalletState = { Isaac: null, Jenifa: null }
        ;(data ?? []).forEach((row: { user_name: string; default_wallet_id: string | null }) => {
          if (row.user_name === 'Isaac' || row.user_name === 'Jenifa') {
            next[row.user_name] = row.default_wallet_id
          }
        })
        setDefaults(next)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // ── Save both users at once (upsert) ────────────────────────────────────────
  const save = useCallback(async (next: DefaultWalletState): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const rows = (
      ['Isaac', 'Jenifa'] as UserName[]
    ).map(name => ({
      user_name: name,
      default_wallet_id: next[name] || null,
      updated_at: new Date().toISOString(),
    }))
    const { error: err } = await supabase
      .from('user_preferences')
      .upsert(rows, { onConflict: 'user_name' })
    setSaving(false)
    if (err) { setError(err.message); return false }
    setDefaults(next)
    return true
  }, [])

  // ── Helper: get wallet label for a given id ─────────────────────────────────
  const labelFor = useCallback((id: string | null): string => {
    if (!id) return 'None'
    return cashWallets.find(w => w.id === id)?.label ?? 'Unknown'
  }, [cashWallets])

  return { defaults, cashWallets, loading, saving, error, save, labelFor }
}
