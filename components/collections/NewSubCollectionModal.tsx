'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import type { SubCollection } from '@/lib/types'

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
]

const SUGGESTED_NAMES = ['Wall Art', 'Social Media', 'SmugMug Gallery', 'Portfolio', 'Rejects']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId: string
  onCreated: (sub: SubCollection) => void
}

export function NewSubCollectionModal({ open, onOpenChange, collectionId, onCreated }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[5])
  const [isBw, setIsBw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setColor(PRESET_COLORS[5])
    setIsBw(false)
    setError(null)
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sub-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_id: collectionId, name: name.trim(), color, is_bw: isBw }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create sub-collection')
        return
      }
      const sub = await res.json()
      onCreated(sub)
      handleOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New sub-collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Suggested names */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick names</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_NAMES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setName(n)}
                  className="text-xs px-2.5 py-1 rounded-full border border-input bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wall Art"
              required
              autoFocus
              disabled={loading}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="size-7 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            {/* Preview */}
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {name || 'Preview'}
              </span>
            </div>
          </div>

          {/* B&W collection toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Black & White collection</p>
              <p className="text-xs text-muted-foreground">Display all photos in B&W</p>
            </div>
            <button
              type="button"
              onClick={() => setIsBw((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isBw ? 'bg-primary' : 'bg-input'}`}
            >
              <span
                className={`pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${isBw ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Create
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
