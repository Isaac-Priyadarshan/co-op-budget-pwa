// src/screens/asset/AssetScreen.tsx
// Parent coordinator — manages state and renders layout only.
// All card/sheet logic lives in dedicated view components.

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssets } from '../../hooks/useAssets'
import { ASSET_GROUPS, type AssetGroupId } from '../../components/shared/AssetGroupPicker'
import { BankAssetSheet }          from '../../components/assets/BankAssetSheet'
import { RealEstateAssetSheet }    from '../../components/assets/RealEstateAssetSheet'
import { StockAssetSheet }         from '../../components/assets/StockAssetSheet'
import { MutualFundAssetSheet }    from '../../components/assets/MutualFundAssetSheet'
import { CryptoAssetSheet }        from '../../components/assets/CryptoAssetSheet'
import { PreciousMetalAssetSheet } from '../../components/assets/PreciousMetalAssetSheet'
import { BankTopUpSheet }          from '../../components/assets/BankTopUpSheet'
import { ConfirmSheet }            from '../../components/shared/ConfirmSheet'
import { parseBankNotes }          from '../../utils/bankCalc'
import { isTopUp }                 from '../../utils/assetHelpers'
import type { AssetItem }          from '../../utils/assetHelpers'
import type { AssetPatch, NewAsset } from '../../lib/db'

import { SummaryCard, GroupCard, GroupSummaryCard } from '../../components/assets/AssetUI'
import { BankAssetCard, BankLogSheet, BankEditSheet } from '../../components/assets/BankAssetView'
import { StockAssetCard, StockTopUpSheet, StockLogSheet } from '../../components/assets/StockAssetView'
import { GenericAssetCard } from '../../components/assets/GenericAssetView'

export default function AssetScreen() {
  const { assets, loading, add, remove, update } = useAssets()

  // ── Main screen state ────────────────────────────────────────
  const [activeGroup,     setActiveGroup]     = useState<AssetGroupId | null>(null)
  const [addSheet,        setAddSheet]        = useState(false)
  const [reorderMode,     setReorderMode]     = useState(false)
  const [working,         setWorking]         = useState<string | null>(null)
  const [confirmDel,      setConfirmDel]      = useState<{ id: string; label: string } | null>(null)

  // ── Bank sheet state ─────────────────────────────────────────
  const [topUpAsset,  setTopUpAsset]  = useState<AssetItem | null>(null)
  const [logAsset,    setLogAsset]    = useState<AssetItem | null>(null)
  const [editAsset,   setEditAsset]   = useState<AssetItem | null>(null)

  // ── Stock sheet state ────────────────────────────────────────
  const [stockTopUpAsset, setStockTopUpAsset] = useState<AssetItem | null>(null)
  const [stockLogAsset,   setStockLogAsset]   = useState<AssetItem | null>(null)

  // ── Derived data ─────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, AssetItem[]> = {}
    for (const g of ASSET_GROUPS) map[g.id] = []
    for (const a of assets) {
      if (map[a.category]) map[a.category].push(a as AssetItem)
    }
    return map
  }, [assets])

  const totalValue = useMemo(
    () => assets.filter((a) => !isTopUp(a.notes)).reduce((s, a) => s + a.value, 0),
    [assets]
  )

  // ── Handlers ─────────────────────────────────────────────────
  const handleDelete = useCallback((id: string, label: string) => {
    setConfirmDel({ id, label })
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!confirmDel) return
    try {
      setWorking(confirmDel.id)
      await remove(confirmDel.id)
    } finally {
      setWorking(null)
      setConfirmDel(null)
    }
  }, [confirmDel, remove])

  const handleBankSaveEdit = useCallback(
    async (
      ids: string[],
      newLabel: string,
      newNotes: (old: string | null) => string
    ) => {
      for (const id of ids) {
        const asset = assets.find((a) => a.id === id)
        if (!asset) continue
        await update(id, { label: newLabel, notes: newNotes(asset.notes) } as AssetPatch)
      }
    },
    [assets, update]
  )

  const nonTopUpCount = (cat: string) =>
    (grouped[cat] ?? []).filter((a) => !isTopUp(a.notes)).length

  // ── Derived convenience values ────────────────────────────────
  const activeGroupObj = ASSET_GROUPS.find((g) => g.id === activeGroup)
  const activeItems    = activeGroup ? (grouped[activeGroup] ?? []) : []
  const topUpBankLabel = topUpAsset?.label ?? ''
  const topUpBankRate  = topUpAsset ? (parseBankNotes(topUpAsset.notes).rate ?? 0) : 0

  // ════════════════════════════════════════════════════════════
  // DETAIL VIEW — when a group is selected
  // ════════════════════════════════════════════════════════════
  if (activeGroup && activeGroupObj) {
    const isBank  = activeGroup === 'Bank'
    const isStock = activeGroup === 'Stock'
    const emoji   = activeGroupObj.emoji

    return (
      <div
        className="min-h-dvh pb-[100px]"
        style={{ background: '#070c16' }}
      >
        <div className="px-5 pt-14">
          {/* ── Header ─────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setActiveGroup(null); setReorderMode(false) }}
              aria-label="Back"
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#f5f7ff',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </motion.button>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#f5f7ff',
                margin: 0,
                letterSpacing: '-0.02em',
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeGroupObj.emoji} {activeGroupObj.label}
            </h1>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setReorderMode((r) => !r)}
              style={{
                padding: '7px 14px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
                border: '1px solid',
                borderColor: reorderMode
                  ? 'rgba(96,165,250,0.40)'
                  : 'rgba(255,255,255,0.10)',
                background: reorderMode
                  ? 'rgba(96,165,250,0.14)'
                  : 'rgba(255,255,255,0.05)',
                color: reorderMode ? '#93c5fd' : 'rgba(255,255,255,0.40)',
              }}
            >
              {reorderMode ? 'Done' : 'Reorder'}
            </motion.button>
          </div>

          {/* ── Group Summary ──────────────────────────────────── */}
          {activeItems.filter((a) => !isTopUp(a.notes)).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <GroupSummaryCard group={activeGroupObj} items={activeItems} />
            </div>
          )}

          {/* ── Asset Cards ────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <AnimatePresence>
              {isBank
                ? activeItems.map((asset) => (
                    <BankAssetCard
                      key={asset.id}
                      asset={asset}
                      allBankItems={activeItems}
                      reorderMode={reorderMode}
                      onDelete={handleDelete}
                      onTopUp={(a) => setTopUpAsset(a)}
                      onLog={(a) => setLogAsset(a)}
                      onEdit={(a) => setEditAsset(a)}
                      working={working}
                    />
                  ))
                : isStock
                ? activeItems.map((asset) => (
                    <StockAssetCard
                      key={asset.id}
                      asset={asset}
                      allStockItems={activeItems}
                      reorderMode={reorderMode}
                      onDelete={handleDelete}
                      onTopUp={(a) => setStockTopUpAsset(a)}
                      onLog={(a) => setStockLogAsset(a)}
                      working={working}
                    />
                  ))
                : activeItems.map((asset) => (
                    <GenericAssetCard
                      key={asset.id}
                      asset={asset}
                      reorderMode={reorderMode}
                      onDelete={handleDelete}
                      working={working}
                      emoji={emoji}
                    />
                  ))}
            </AnimatePresence>
          </div>

          {/* ── Add Button ─────────────────────────────────────── */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setAddSheet(true)}
            style={{
              width: '100%',
              padding: '15px 20px',
              borderRadius: 18,
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: `linear-gradient(135deg, ${activeGroupObj.border.replace('0.35', '0.90').replace('0.30', '0.85')}, ${activeGroupObj.border.replace('0.35', '0.55').replace('0.30', '0.50')})`,
              boxShadow: `0 4px 20px ${activeGroupObj.color}`,
              letterSpacing: '-0.01em',
            }}
          >
            + Add {activeGroupObj.label} Asset
          </motion.button>
        </div>

        {/* ── Bank Sheets ───────────────────────────────────── */}
        {isBank && (
          <>
            <BankAssetSheet
              open={addSheet}
              onClose={() => setAddSheet(false)}
              onSave={async (data) => { await add(data as NewAsset); setAddSheet(false) }}
            />
            <BankTopUpSheet
              open={!!topUpAsset}
              bankLabel={topUpBankLabel}
              rate={topUpBankRate}
              onClose={() => setTopUpAsset(null)}
              onSave={async (data) => { await add(data as NewAsset); setTopUpAsset(null) }}
            />
            <BankLogSheet
              open={!!logAsset}
              asset={logAsset}
              allBankItems={activeItems}
              onClose={() => setLogAsset(null)}
            />
            <BankEditSheet
              open={!!editAsset}
              asset={editAsset}
              allBankItems={activeItems}
              onClose={() => setEditAsset(null)}
              onSave={handleBankSaveEdit}
            />
          </>
        )}

        {/* ── Stock Sheets ──────────────────────────────────── */}
        {isStock && (
          <>
            <StockAssetSheet
              open={addSheet}
              onClose={() => setAddSheet(false)}
              onSave={async (data) => { await add(data as NewAsset); setAddSheet(false) }}
            />
            <StockTopUpSheet
              open={!!stockTopUpAsset}
              stockLabel={stockTopUpAsset?.label ?? ''}
              onClose={() => setStockTopUpAsset(null)}
              onSave={async (data) => { await add(data as NewAsset); setStockTopUpAsset(null) }}
            />
            <StockLogSheet
              open={!!stockLogAsset}
              asset={stockLogAsset}
              allStockItems={activeItems}
              onClose={() => setStockLogAsset(null)}
            />
          </>
        )}

        {/* ── Generic Add Sheets ────────────────────────────── */}
        {!isBank && !isStock && activeGroup === 'Real Estate' && (
          <RealEstateAssetSheet
            open={addSheet}
            onClose={() => setAddSheet(false)}
            onSave={async (data) => { await add(data as NewAsset); setAddSheet(false) }}
          />
        )}
        {!isBank && !isStock && activeGroup === 'Mutual Fund' && (
          <MutualFundAssetSheet
            open={addSheet}
            onClose={() => setAddSheet(false)}
            onSave={async (data) => { await add(data as NewAsset); setAddSheet(false) }}
          />
        )}
        {!isBank && !isStock && activeGroup === 'Crypto' && (
          <CryptoAssetSheet
            open={addSheet}
            onClose={() => setAddSheet(false)}
            onSave={async (data) => { await add(data as NewAsset); setAddSheet(false) }}
          />
        )}
        {!isBank && !isStock && activeGroup === 'Precious Metal' && (
          <PreciousMetalAssetSheet
            open={addSheet}
            onClose={() => setAddSheet(false)}
            onSave={async (data) => { await add(data as NewAsset); setAddSheet(false) }}
          />
        )}

        {/* ── Confirm Delete ────────────────────────────────── */}
        <ConfirmSheet
          open={!!confirmDel}
          title="Delete Asset"
          message={`Delete "${confirmDel?.label}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // HOME VIEW — group grid
  // ════════════════════════════════════════════════════════════
  return (
    <div
      className="min-h-dvh pb-[100px]"
      style={{ background: '#070c16' }}
    >
      <div className="px-5 pt-14">
        {/* Page header */}
        <div style={{ marginBottom: 22 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#f5f7ff',
              margin: '0 0 4px',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            Assets
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)', margin: 0 }}>
            Track and manage your wealth
          </p>
        </div>

        {/* Summary card */}
        <div style={{ marginBottom: 22 }}>
          <SummaryCard
            totalValue={totalValue}
            assetCount={assets.filter((a) => !isTopUp(a.notes)).length}
            loading={loading}
          />
        </div>

        {/* Group grid — 2 columns, equal-height rows */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            alignItems: 'stretch',
          }}
        >
          {ASSET_GROUPS.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              total={
                grouped[group.id]
                  ?.filter((a) => !isTopUp(a.notes))
                  .reduce((s, a) => s + a.value, 0) ?? 0
              }
              count={nonTopUpCount(group.id)}
              loading={loading}
              onPress={() => setActiveGroup(group.id as AssetGroupId)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
