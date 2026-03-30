import { useState } from 'react'
import { type StoredCategory, colorPalette } from '../categories'
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  reorderCategories,
} from '../storage'

interface SettingsViewProps {
  onBack: () => void
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [cats, setCats] = useState<StoredCategory[]>(() => getCategories())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState(colorPalette[0])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)

  const active = cats
    .filter((c) => !c.deleted)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const deleted = cats.filter((c) => c.deleted)

  function refresh() {
    setCats(getCategories())
  }

  function handleMoveUp(id: string) {
    const idx = active.findIndex((c) => c.id === id)
    if (idx <= 0) return
    const ids = active.map((c) => c.id)
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    reorderCategories(ids)
    refresh()
  }

  function handleMoveDown(id: string) {
    const idx = active.findIndex((c) => c.id === id)
    if (idx < 0 || idx >= active.length - 1) return
    const ids = active.map((c) => c.id)
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    reorderCategories(ids)
    refresh()
  }

  function handleDelete(id: string) {
    deleteCategory(id)
    setConfirmDeleteId(null)
    setEditingId(null)
    refresh()
  }

  function handleRestore(id: string) {
    restoreCategory(id)
    refresh()
  }

  function handleAdd() {
    if (!newLabel.trim()) return
    addCategory({
      label: newLabel.trim(),
      description: newDesc.trim(),
      color: newColor,
    })
    setNewLabel('')
    setNewDesc('')
    setNewColor(colorPalette[0])
    setAddingNew(false)
    refresh()
  }

  return (
    <div>
      <div className="flex items-center py-3">
        <button
          onClick={onBack}
          className="h-10 w-10 flex items-center justify-center text-lg text-zinc-400 hover:text-zinc-100"
          aria-label="Back"
        >
          &larr;
        </button>
        <div className="flex-1 text-center">
          <div className="text-sm font-medium text-zinc-100">Settings</div>
          <div className="text-xs text-zinc-500">{active.length} categories</div>
        </div>
        <div className="w-10" />
      </div>

      <div className="space-y-1">
        {active.map((cat, idx) => (
          <div key={cat.id} className="bg-zinc-900 rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0 mt-0.5 self-start"
                style={{ backgroundColor: cat.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 truncate">{cat.label}</div>
                {cat.description && (
                  <div className="text-xs text-zinc-500 truncate">{cat.description}</div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleMoveUp(cat.id)}
                  disabled={idx === 0}
                  className="h-7 w-7 flex items-center justify-center text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-25 disabled:cursor-default"
                  aria-label="Move up"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => handleMoveDown(cat.id)}
                  disabled={idx === active.length - 1}
                  className="h-7 w-7 flex items-center justify-center text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-25 disabled:cursor-default"
                  aria-label="Move down"
                >
                  &#9660;
                </button>
                <button
                  onClick={() => setEditingId(editingId === cat.id ? null : cat.id)}
                  className={`h-7 w-7 flex items-center justify-center text-xs ${editingId === cat.id ? 'text-blue-400' : 'text-zinc-400 hover:text-zinc-100'}`}
                  aria-label="Edit"
                >
                  &#9998;
                </button>
                <button
                  onClick={() => setConfirmDeleteId(cat.id)}
                  className="h-7 w-7 flex items-center justify-center text-xs text-zinc-400 hover:text-red-400"
                  aria-label="Delete"
                >
                  &times;
                </button>
              </div>
            </div>

            {confirmDeleteId === cat.id && (
              <div className="mt-2 flex items-center gap-2 ml-5">
                <span className="text-xs text-zinc-400">Delete this category?</span>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            )}

            {editingId === cat.id && (
              <EditForm
                cat={cat}
                onSave={(updates) => {
                  updateCategory(cat.id, updates)
                  setEditingId(null)
                  refresh()
                }}
                onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        ))}
      </div>

      {addingNew ? (
        <div className="mt-3 bg-zinc-900 rounded px-3 py-3">
          <div className="text-xs font-medium text-zinc-400 mb-2">New category</div>
          <input
            type="text"
            placeholder="Label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full h-9 px-2 rounded bg-zinc-800 text-sm text-zinc-100 border border-zinc-700 focus:border-zinc-500 focus:outline-none mb-2"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-zinc-800 text-sm text-zinc-100 border border-zinc-700 focus:border-zinc-500 focus:outline-none mb-2 resize-none"
            rows={2}
          />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {colorPalette.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${newColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="h-9 px-4 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-default"
            >
              Add
            </button>
            <button
              onClick={() => {
                setAddingNew(false)
                setNewLabel('')
                setNewDesc('')
                setNewColor(colorPalette[0])
              }}
              className="h-9 px-4 rounded text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="mt-3 w-full h-10 rounded text-sm text-zinc-400 border border-dashed border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
        >
          + Add category
        </button>
      )}

      {deleted.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            <span>{showDeleted ? '\u25BC' : '\u25B6'}</span>
            Deleted categories ({deleted.length})
          </button>
          {showDeleted && (
            <div className="mt-2 space-y-1">
              {deleted.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded opacity-60"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm text-zinc-400 flex-1 min-w-0 truncate">
                    {cat.label}
                  </span>
                  <button
                    onClick={() => handleRestore(cat.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pb-8" />
    </div>
  )
}

function EditForm({
  cat,
  onSave,
  onCancel,
}: {
  cat: StoredCategory
  onSave: (updates: { label?: string; description?: string; color?: string }) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(cat.label)
  const [desc, setDesc] = useState(cat.description)
  const [color, setColor] = useState(cat.color)

  return (
    <div className="mt-2 ml-5">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="w-full h-9 px-2 rounded bg-zinc-800 text-sm text-zinc-100 border border-zinc-700 focus:border-zinc-500 focus:outline-none mb-2"
        autoFocus
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="w-full px-2 py-1.5 rounded bg-zinc-800 text-sm text-zinc-100 border border-zinc-700 focus:border-zinc-500 focus:outline-none mb-2 resize-none"
        rows={2}
      />
      <div className="flex flex-wrap gap-1.5 mb-3">
        {colorPalette.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ label: label.trim(), description: desc.trim(), color })}
          disabled={!label.trim()}
          className="h-8 px-3 rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-default"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="h-8 px-3 rounded text-xs text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
