import { useState, useEffect, useCallback } from 'react'
import { fetchAssets, insertAsset, deleteAsset, updateAsset } from '../lib/db'
import type { AssetEntry, NewAsset, AssetPatch } from '../lib/db'

export function useAssets() {
  const [assets, setAssets] = useState<AssetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setLoading(true); setError(null); setAssets(await fetchAssets()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (entry: NewAsset) => {
    const inserted = await insertAsset(entry)
    setAssets(prev => [inserted, ...prev].sort((a, b) => b.value - a.value))
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteAsset(id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  const update = useCallback(async (id: string, patch: AssetPatch) => {
    const updated = await updateAsset(id, patch)
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
    return updated
  }, [])

  const totalValue = assets.reduce((s, a) => s + a.value, 0)

  return { assets, loading, error, add, remove, update, totalValue, refresh: load }
}
