// This file documents the targeted changes needed in AssetScreen.tsx.
// The actual fixes are applied inline below.
//
// FIX A — line ~1088 handleSaveReorder:
//   Change: (_old: AssetEntry, idx: number) => ({ sort_order: idx })
//   Reason: AssetPatch now includes sort_order?: number  ✔️ already valid after db.ts fix
//
// FIX B — AddSheet onSave (lines ~1097-1115):
//   The sheet Props.onSave is (asset: NewAsset) => Promise<void>.
//   So onSave must accept NewAsset, not Omit<AssetItem,...>.
//   Change the prop type and pass owner from the existing entry.
//
// FIX C — StockTopUpSheet onSave (line ~1196):
//   owner: null  →  owner: 'Both'
export {}
