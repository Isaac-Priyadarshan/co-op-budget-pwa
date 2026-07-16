import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useTransactions, isExcluded } from '../../hooks/useTransactions'
import { useCategories } from '../../hooks/useCategories'
import type { Category, Subcategory } from '../../types/category'
import { formatINR } from '../../utils/format'

const ACCENT_SWATCHES = [
  { accent: '#F87171', glow: 'rgba(248,113,113,0.22)', bg: 'rgba(239,68,68,0.12)' },
  { accent: '#FB923C', glow: 'rgba(251,146,60,0.22)',  bg: 'rgba(251,146,60,0.12)' },
  { accent: '#FBBF24', glow: 'rgba(251,191,36,0.22)',  bg: 'rgba(251,191,36,0.12)' },
  { accent: '#34D399', glow: 'rgba(52,211,153,0.22)',  bg: 'rgba(52,211,153,0.12)' },
  { accent: '#60A5FA', glow: 'rgba(96,165,250,0.22)',  bg: 'rgba(96,165,250,0.12)' },
  { accent: '#A78BFA', glow: 'rgba(167,139,250,0.22)', bg: 'rgba(167,139,250,0.12)' },
  { accent: '#F9A8D4', glow: 'rgba(249,168,212,0.22)', bg: 'rgba(249,168,212,0.12)' },
  { accent: '#5EEAD4', glow: 'rgba(94,234,212,0.22)',  bg: 'rgba(94,234,212,0.12)' },
]

const EXPENSE_ICONS = ['🛒','🍔','🚗','🏠','💊','👗','✈️','🎬','💡','🚿','📱','🎓','🐾','🍕','⛽','🏋️','💈','🧴','🎮','🍷','☕','🛏','🔧','📦','🎁','💳','🏥','🧹','🚌','🍱']
const INCOME_ICONS  = ['💼','📈','💰','🏦','🎯','🏆','💻','🤝','📝','🎨','🏗️','🚀','💎','🌱','🎤','📸','🛍️','🧑‍🏫','📊','🏡','💡','🎪','🧾','🔑','🛠️','🎵','📚','🌐','🤑','🏅']

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface ManagerProps {
  type: 'expense' | 'income'
  categories: Category[]
  subcategories: Record<string, Subcategory[]>
  onClose: () => void
  onAddCategory: (label: string, icon: string, accent: string, glow: string, bg: string) => Promise<{ error: string | null }>
  onDeleteCategory: (id: string) => Promise<{ error: string | null }>
  onUpdateCategory: (id: string, label: string, icon: string, accent: string, glow: string, bg: string) => Promise<{ error: string | null }>
  onAddSubcategory: (categoryId: string, label: string) => Promise<{ error: string | null }>
  onDeleteSubcategory: (subcategoryId: string, categoryId: string) => Promise<{ error: string | null }>
  onUpdateSubcategory: (subcategoryId: string, label: string) => Promise<{ error: string | null }>
  onReorderCategories: (orderedIds: string[]) => Promise<{ error: string | null }>
  onReorderSubcategories: (categoryId: string, orderedIds: string[]) => Promise<{ error: string | null }>
}

function DragHandle() {
  return (
    <div
      style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FBBF24', fontSize: 15, cursor: 'grab', flexShrink: 0,
      }}
      aria-hidden="true" title="Drag to reorder"
    >≡</div>
  )
}

function CategoryManagerSheet({
  type, categories, subcategories,
  onClose, onAddCategory, onDeleteCategory, onUpdateCategory,
  onAddSubcategory, onDeleteSubcategory, onUpdateSubcategory,
  onReorderCategories, onReorderSubcategories,
}: ManagerProps) {
  const [newIcon, setNewIcon] = useState(type === 'expense' ? '🛒' : '💼')
  const [newLabel, setNewLabel] = useState('')
  const [selectedSwatch, setSelectedSwatch] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [subInputs, setSubInputs] = useState<Record<string, string>>({})
  const [orderedCategories, setOrderedCategories] = useState(categories)
  const [orderedSubs, setOrderedSubs] = useState<Record<string, Subcategory[]>>(subcategories)

  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatLabel, setEditCatLabel] = useState('')
  const [editCatIcon, setEditCatIcon] = useState('')
  const [editCatSwatch, setEditCatSwatch] = useState(0)
  const [editIconPickerOpen, setEditIconPickerOpen] = useState(false)

  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editSubLabel, setEditSubLabel] = useState('')

  const iconOptions = type === 'expense' ? EXPENSE_ICONS : INCOME_ICONS

  const openEditCategory = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation()
    if (editingCatId === cat.id) { setEditingCatId(null); setEditIconPickerOpen(false); return }
    const swatchIdx = ACCENT_SWATCHES.findIndex(s => s.accent === cat.accent)
    setEditingCatId(cat.id)
    setEditCatLabel(cat.label)
    setEditCatIcon(cat.icon)
    setEditCatSwatch(swatchIdx >= 0 ? swatchIdx : 0)
    setEditIconPickerOpen(false)
    setError('')
  }

  const handleSaveCategory = async (catId: string) => {
    const label = editCatLabel.trim()
    if (!label) { setError('Enter a category name.'); return }
    setSaving(true)
    const sw = ACCENT_SWATCHES[editCatSwatch]
    const { error: err } = await onUpdateCategory(catId, label, editCatIcon, sw.accent, sw.glow, sw.bg)
    setSaving(false)
    if (err) { setError(err); return }
    setEditingCatId(null)
    setEditIconPickerOpen(false)
    setError('')
  }

  const openEditSubcategory = (sub: Subcategory, e: React.MouseEvent) => {
    e.stopPropagation()
    if (editingSubId === sub.id) { setEditingSubId(null); return }
    setEditingSubId(sub.id)
    setEditSubLabel(sub.label)
    setError('')
  }

  const handleSaveSubcategory = async (subId: string) => {
    const label = editSubLabel.trim()
    if (!label) { setError('Enter a subcategory name.'); return }
    setSaving(true)
    const { error: err } = await onUpdateSubcategory(subId, label)
    setSaving(false)
    if (err) { setError(err); return }
    setEditingSubId(null)
    setError('')
  }

  const handleAddCategory = async () => {
    const label = newLabel.trim()
    if (!label) { setError('Enter a category name.'); return }
    if (categories.find(c => c.label.toLowerCase() === label.toLowerCase())) { setError('Category already exists.'); return }
    setSaving(true)
    const sw = ACCENT_SWATCHES[selectedSwatch]
    const { error: err } = await onAddCategory(label, newIcon, sw.accent, sw.glow, sw.bg)
    setSaving(false)
    if (err) { setError(err); return }
    setNewLabel('')
    setNewIcon(type === 'expense' ? '🛒' : '💼')
    setPickerOpen(false)
    setError('')
  }

  const handleDeleteCategory = async (id: string) => {
    setSaving(true)
    const { error: err } = await onDeleteCategory(id)
    setSaving(false)
    if (err) { setError(err); return }
    if (expandedCat === id) setExpandedCat(null)
    if (editingCatId === id) setEditingCatId(null)
    setError('')
  }

  const handleCategoryReorder = async (nextCategories: Category[]) => {
    setOrderedCategories(nextCategories)
    const { error: err } = await onReorderCategories(nextCategories.map(c => c.id))
    if (err) setError(err)
  }

  const handleAddSubcategory = async (categoryId: string) => {
    const label = (subInputs[categoryId] ?? '').trim()
    if (!label) { setError('Enter a subcategory name.'); return }
    const existing = (orderedSubs[categoryId] ?? []).filter(s => s.label.toLowerCase() === label.toLowerCase())
    if (existing.length > 0) { setError('Subcategory already exists.'); return }
    setSaving(true)
    const { error: err } = await onAddSubcategory(categoryId, label)
    setSaving(false)
    if (err) { setError(err); return }
    setSubInputs(prev => ({ ...prev, [categoryId]: '' }))
    setError('')
  }

  const handleSubcategoryReorder = async (categoryId: string, nextSubs: Subcategory[]) => {
    setOrderedSubs(prev => ({ ...prev, [categoryId]: nextSubs }))
    const { error: err } = await onReorderSubcategories(categoryId, nextSubs.map(s => s.id))
    if (err) setError(err)
  }

  const handleDeleteSubcategory = async (subId: string, categoryId: string) => {
    if (editingSubId === subId) setEditingSubId(null)
    setSaving(true)
    const { error: err } = await onDeleteSubcategory(subId, categoryId)
    setSaving(false)
    if (err) { setError(err); return }
    setError('')
  }

  const syncCategories = orderedCategories
    .map(local => categories.find(c => c.id === local.id) ?? local)
    .filter(cat => categories.some(c => c.id === cat.id))

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
          background: '#0e0c06',
          border: '1px solid rgba(251,191,36,0.18)', borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
          maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(251,191,36,0.25)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5' }}>
            Manage {type === 'expense' ? 'Expense' : 'Income'} Categories
          </span>
          <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}
          >✕</motion.button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 20px' }}>
          <Reorder.Group axis="y" values={syncCategories} onReorder={handleCategoryReorder} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {syncCategories.map(cat => {
              const isExpanded = expandedCat === cat.id
              const isEditingCat = editingCatId === cat.id
              const catSubs = (orderedSubs[cat.id] ?? subcategories[cat.id] ?? [])
                .map(local => (subcategories[cat.id] ?? []).find(s => s.id === local.id) ?? local)
              return (
                <Reorder.Item key={cat.id} value={cat} style={{ listStyle: 'none' }}>
                  <div>
                    <motion.div
                      layout
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: isEditingCat ? 'rgba(251,191,36,0.07)' : cat.bg, border: `1px solid ${isEditingCat ? 'rgba(251,191,36,0.38)' : cat.accent + '25'}`, borderRadius: isEditingCat ? '16px 16px 0 0' : 16, boxShadow: `0 2px 10px ${cat.glow}`, cursor: 'pointer', transition: 'border-radius 0.2s' }}
                      onClick={() => setExpandedCat(prev => prev === cat.id ? null : cat.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{cat.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: cat.accent }}>{cat.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DragHandle />
                        <motion.button whileTap={{ scale: 0.82 }} onClick={e => openEditCategory(cat, e)}
                          style={{ width: 32, height: 32, borderRadius: '50%', background: isEditingCat ? 'rgba(251,191,36,0.22)' : 'rgba(251,191,36,0.10)', border: isEditingCat ? '1px solid rgba(251,191,36,0.55)' : '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                          title="Edit category"
                        >✏️</motion.button>
                        <motion.button whileTap={{ scale: 0.82 }}
                          onClick={e => { e.stopPropagation(); void handleDeleteCategory(cat.id) }}
                          style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
                          disabled={saving}
                        >🗑️</motion.button>
                        <motion.svg animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></motion.svg>
                      </div>
                    </motion.div>

                    <AnimatePresence initial={false}>
                      {isEditingCat && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '14px 14px 16px', background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.22)', borderTop: 'none', borderRadius: '0 0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setEditIconPickerOpen(v => !v)}
                                style={{ width: 48, height: 44, borderRadius: 12, fontSize: 20, background: 'rgba(255,255,255,0.06)', border: editIconPickerOpen ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', flexShrink: 0 }}
                              >{editCatIcon}</motion.button>
                              <input value={editCatLabel} onChange={e => { setEditCatLabel(e.target.value); setError('') }}
                                placeholder="Category name…"
                                style={{ flex: 1, height: 44, borderRadius: 12, padding: '0 12px', fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#F5F5F5', outline: 'none' }}
                              />
                            </div>
                            <AnimatePresence>
                              {editIconPickerOpen && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, padding: 10, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    {iconOptions.map(icon => (
                                      <motion.button key={icon} whileTap={{ scale: 0.85 }}
                                        onClick={() => { setEditCatIcon(icon); setEditIconPickerOpen(false) }}
                                        style={{ width: '100%', aspectRatio: '1', borderRadius: 10, fontSize: 20, cursor: 'pointer', background: editCatIcon === icon ? 'rgba(251,191,36,0.16)' : 'rgba(255,255,255,0.03)', border: editCatIcon === icon ? '1px solid rgba(251,191,36,0.36)' : '1px solid rgba(255,255,255,0.06)' }}
                                      >{icon}</motion.button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {ACCENT_SWATCHES.map((sw, i) => (
                                <motion.button key={i} whileTap={{ scale: 0.82 }} onClick={() => setEditCatSwatch(i)}
                                  style={{ width: 26, height: 26, borderRadius: '50%', background: sw.accent, border: editCatSwatch === i ? '2.5px solid #fff' : '2.5px solid transparent', boxShadow: editCatSwatch === i ? `0 0 10px ${sw.glow}` : 'none', cursor: 'pointer', flexShrink: 0 }}
                                />
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <motion.button whileTap={{ scale: 0.95 }}
                                onClick={() => { setEditingCatId(null); setEditIconPickerOpen(false) }}
                                style={{ flex: 1, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                              >Cancel</motion.button>
                              <motion.button whileTap={{ scale: 0.95 }}
                                onClick={() => void handleSaveCategory(cat.id)}
                                disabled={saving}
                                style={{ flex: 2, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                              >{saving ? 'Saving…' : 'Save Changes'}</motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: 8, marginLeft: 8, padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <Reorder.Group axis="y" values={catSubs} onReorder={nextSubs => void handleSubcategoryReorder(cat.id, nextSubs)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {catSubs.length > 0 ? catSubs.map(sub => {
                                const isEditingSub = editingSubId === sub.id
                                return (
                                  <Reorder.Item key={sub.id} value={sub} style={{ listStyle: 'none' }}>
                                    <div style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px' }}>
                                        <span style={{ fontSize: 13, color: 'rgba(245,245,245,0.82)', flex: 1 }}>{sub.label}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <DragHandle />
                                          <motion.button whileTap={{ scale: 0.82 }} onClick={e => openEditSubcategory(sub, e)}
                                            style={{ width: 28, height: 28, borderRadius: '50%', background: isEditingSub ? 'rgba(251,191,36,0.20)' : 'rgba(251,191,36,0.08)', border: isEditingSub ? '1px solid rgba(251,191,36,0.50)' : '1px solid rgba(251,191,36,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
                                            title="Edit subcategory"
                                          >✏️</motion.button>
                                          <motion.button whileTap={{ scale: 0.82 }}
                                            onClick={() => void handleDeleteSubcategory(sub.id, cat.id)}
                                            disabled={saving}
                                            style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }}
                                          >🗑️</motion.button>
                                        </div>
                                      </div>
                                      <AnimatePresence initial={false}>
                                        {isEditingSub && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                            style={{ overflow: 'hidden' }}
                                          >
                                            <div style={{ padding: '8px 10px 10px', borderTop: '1px solid rgba(251,191,36,0.15)', display: 'flex', gap: 8 }}>
                                              <input value={editSubLabel} onChange={e => { setEditSubLabel(e.target.value); setError('') }}
                                                placeholder="Subcategory name…" autoFocus
                                                style={{ flex: 1, height: 38, borderRadius: 10, padding: '0 10px', fontSize: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(251,191,36,0.28)', color: '#F5F5F5', outline: 'none' }}
                                              />
                                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingSubId(null)}
                                                style={{ height: 38, padding: '0 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                              >✕</motion.button>
                                              <motion.button whileTap={{ scale: 0.95 }}
                                                onClick={() => void handleSaveSubcategory(sub.id)}
                                                disabled={saving}
                                                style={{ height: 38, padding: '0 12px', borderRadius: 10, background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', border: 'none', color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                                              >{saving ? '…' : 'Save'}</motion.button>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </Reorder.Item>
                                )
                              }) : (
                                <span style={{ fontSize: 12, color: 'rgba(245,245,245,0.45)' }}>No subcategories yet</span>
                              )}
                            </Reorder.Group>

                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                value={subInputs[cat.id] ?? ''}
                                onChange={e => { setSubInputs(prev => ({ ...prev, [cat.id]: e.target.value })); setError('') }}
                                placeholder="New subcategory…"
                                style={{ flex: 1, height: 42, borderRadius: 12, padding: '0 12px', fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F5', outline: 'none' }}
                              />
                              <motion.button whileTap={{ scale: 0.95 }}
                                onClick={() => void handleAddSubcategory(cat.id)}
                                disabled={saving}
                                style={{ height: 42, padding: '0 14px', borderRadius: 12, background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', border: 'none', color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                              >{saving ? '…' : 'Add'}</motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>

          <div style={{ height: 1, background: 'rgba(251,191,36,0.10)', marginBottom: 20 }} />

          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(251,191,36,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Add New Category</p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPickerOpen(v => !v)}
              style={{ width: 52, height: 48, borderRadius: 14, fontSize: 22, background: 'rgba(255,255,255,0.06)', border: pickerOpen ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', flexShrink: 0 }}
            >{newIcon}</motion.button>
            <input value={newLabel} onChange={e => { setNewLabel(e.target.value); setError('') }}
              placeholder="Category name…"
              style={{ flex: 1, height: 48, borderRadius: 14, padding: '0 14px', fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F5', outline: 'none' }}
            />
          </div>

          <AnimatePresence>
            {pickerOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, padding: 10, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {iconOptions.map(icon => (
                    <motion.button key={icon} whileTap={{ scale: 0.85 }}
                      onClick={() => { setNewIcon(icon); setPickerOpen(false) }}
                      style={{ width: '100%', aspectRatio: '1', borderRadius: 12, fontSize: 22, cursor: 'pointer', background: newIcon === icon ? 'rgba(251,191,36,0.16)' : 'rgba(255,255,255,0.03)', border: newIcon === icon ? '1px solid rgba(251,191,36,0.36)' : '1px solid rgba(255,255,255,0.06)' }}
                    >{icon}</motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {ACCENT_SWATCHES.map((sw, i) => (
              <motion.button key={i} whileTap={{ scale: 0.82 }} onClick={() => setSelectedSwatch(i)}
                style={{ width: 30, height: 30, borderRadius: '50%', background: sw.accent, border: selectedSwatch === i ? '2.5px solid #fff' : '2.5px solid transparent', boxShadow: selectedSwatch === i ? `0 0 10px ${sw.glow}` : 'none', cursor: 'pointer', flexShrink: 0 }}
              />
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ fontSize: 12, color: '#F87171', marginBottom: 12 }}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button whileTap={{ scale: 0.95 }} onClick={() => void handleAddCategory()} disabled={saving}
            style={{ width: '100%', height: 48, borderRadius: 16, background: 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(217,119,6,0.16))', border: '1px solid rgba(251,191,36,0.35)', color: '#FBBF24', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 12px rgba(251,191,36,0.14)', marginBottom: 12 }}
          >{saving ? 'Saving…' : '+ Add Category'}</motion.button>

          <motion.button whileTap={{ scale: 0.95 }} onClick={onClose}
            style={{ width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', border: 'none', color: '#000', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(251,191,36,0.35)' }}
          >Done</motion.button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Month Navigator ──────────────────────────────────────────────────────────
// - No tap-to-change: label is a plain display div, not a button
// - No picker sheet: MonthYearPickerSheet is removed entirely
// - "Back to Today" badge still appears when not on current month

interface MonthNavProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

function MonthNavigator({ year, month, onPrev, onNext }: MonthNavProps) {
  const today = new Date()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      {/* ← Prev */}
      <motion.button
        whileTap={{ scale: 0.82 }}
        onClick={onPrev}
        aria-label="Previous month"
        style={{
          width: 40, height: 40, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(217,119,6,0.10))',
          border: '1px solid rgba(251,191,36,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </motion.button>

      {/* Month / Year — plain display, no click */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '4px 0',
          minWidth: 0,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={`${year}-${month}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#F5F5F5',
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {MONTH_NAMES[month]} {year}
          </motion.span>
        </AnimatePresence>

        {/* "Back to Today" badge — only when not on current month */}
        <AnimatePresence>
          {!isCurrentMonth && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.16 }}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'rgba(251,191,36,0.85)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'rgba(251,191,36,0.10)',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: 99,
                padding: '2px 8px',
                lineHeight: 1.6,
              }}
            >
              ← back to today
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* → Next */}
      <motion.button
        whileTap={{ scale: 0.82 }}
        onClick={onNext}
        aria-label="Next month"
        style={{
          width: 40, height: 40, borderRadius: 14,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(217,119,6,0.10))',
          border: '1px solid rgba(251,191,36,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </motion.button>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

function CategoryGrid({
  categories, amounts, type,
}: {
  categories: Category[]
  amounts: Record<string, number>
  type: 'expense' | 'income'
}) {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 4 }}>
      {categories.map(cat => (
        <motion.div
          key={cat.id}
          whileTap={{ scale: 0.93 }}
          onClick={() => navigate(`/entry/${type}/${cat.id}`)}
          style={{
            borderRadius: 18,
            padding: '14px 8px 12px',
            background: cat.bg,
            border: `1px solid ${cat.accent}28`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 0,
            cursor: 'pointer',
            boxShadow: `0 4px 16px ${cat.glow}`,
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1, display: 'block', marginBottom: 8 }}>
            {cat.icon}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: cat.accent,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.35,
            minHeight: '2.7em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            padding: '0 2px',
          }}>
            {cat.label}
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#F5F5F5',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 6,
            display: 'block',
          }}>
            {formatINR(amounts[cat.id] ?? 0)}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

interface SectionProps {
  title: string; total: number; color: string; glowColor: string
  categories: Category[]; amounts: Record<string, number>; onManage: () => void
  type: 'expense' | 'income'
}

function CollapsibleSection({ title, total, color, glowColor, categories, amounts, onManage, type }: SectionProps) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 14 : 0 }}>
        <motion.button whileTap={{ scale: 0.82 }} onClick={onManage}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(217,119,6,0.12))', border: '1px solid rgba(251,191,36,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,245,245,0.65)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>{title}</span>
          <span style={{ fontSize: 17, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 12px ${glowColor}` }}>{formatINR(total)}</span>
        </div>

        <motion.button whileTap={{ scale: 0.82 }} onClick={() => setOpen(v => !v)}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <motion.svg animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.22 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></motion.svg>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <CategoryGrid categories={categories} amounts={amounts} type={type} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function HomeScreen() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [managerOpen, setManagerOpen] = useState<'expense' | 'income' | null>(null)

  const {
    expenseCategories, incomeCategories, subcategories, loading: catsLoading,
    addCategory, deleteCategory, updateCategory, addSubcategory, deleteSubcategory, updateSubcategory, reorderCategories, reorderSubcategories,
  } = useCategories()

  const { transactions, loading: txLoading } = useTransactions()

  const monthTxs = useMemo(() => transactions.filter(tx => {
    if (isExcluded(tx)) return false
    const raw = tx.transaction_date as string | null | undefined
    if (!raw) {
      const d = new Date(tx.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    }
    const [y, m] = raw.split('-').map(Number)
    return y === year && m - 1 === month
  }), [transactions, year, month])

  const calcAmounts = useCallback(
    (cats: Category[], type: 'expense' | 'income') =>
      cats.reduce((map, cat) => {
        const total = monthTxs
          .filter(t => {
            if (t.type !== type) return false
            if (t.category_id) return t.category_id === cat.id
            return (t.category ?? '').toLowerCase() === cat.label.toLowerCase()
          })
          .reduce((s, t) => s + t.amount, 0)
        return { ...map, [cat.id]: total }
      }, {} as Record<string, number>),
    [monthTxs]
  )

  const expenseAmounts = useMemo(() => calcAmounts(expenseCategories, 'expense'), [calcAmounts, expenseCategories])
  const incomeAmounts  = useMemo(() => calcAmounts(incomeCategories,  'income'),  [calcAmounts, incomeCategories])

  const monthExpenses = useMemo(() => monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTxs])
  const monthIncome   = useMemo(() => monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTxs])

  const handlePrev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const handleNext = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const loading = catsLoading || txLoading

  return (
    // ── Outer shell: full height, flex column, no padding (header handles its own)
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── STICKY MONTH/YEAR HEADER ─────────────────────────────────────────
          position:sticky + top:0 keeps this bar pinned at the top of the
          AppShell scroll-area. z-index:10 ensures it floats above content
          cards while scrolling. The blurred background gives a premium
          glass-card feel matching the app theme.                           */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '16px 20px 14px',
          background: 'rgba(4,5,11,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(251,191,36,0.08)',
        }}
      >
        <MonthNavigator
          year={year}
          month={month}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>

      {/* ── SCROLLABLE CONTENT BODY ──────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '20px 20px 32px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 60, borderRadius: 16, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.08)' }} />)}
            </div>
          ) : (
            <>
              <CollapsibleSection title="Expenses" total={monthExpenses} color="#F87171" glowColor="rgba(248,113,113,0.6)" categories={expenseCategories} amounts={expenseAmounts} onManage={() => setManagerOpen('expense')} type="expense" />
              <CollapsibleSection title="Income" total={monthIncome} color="#34D399" glowColor="rgba(52,211,153,0.6)" categories={incomeCategories} amounts={incomeAmounts} onManage={() => setManagerOpen('income')} type="income" />
            </>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {managerOpen && (
          <CategoryManagerSheet
            key={managerOpen}
            type={managerOpen}
            categories={managerOpen === 'expense' ? expenseCategories : incomeCategories}
            subcategories={subcategories}
            onClose={() => setManagerOpen(null)}
            onAddCategory={(label, icon, accent, glow, bg) => addCategory(managerOpen, label, icon, accent, glow, bg)}
            onDeleteCategory={id => deleteCategory(id)}
            onUpdateCategory={(id, label, icon, accent, glow, bg) => updateCategory(id, label, icon, accent, glow, bg)}
            onAddSubcategory={addSubcategory}
            onDeleteSubcategory={deleteSubcategory}
            onUpdateSubcategory={(subId, label) => updateSubcategory(subId, label)}
            onReorderCategories={orderedIds => reorderCategories(managerOpen, orderedIds)}
            onReorderSubcategories={reorderSubcategories}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
