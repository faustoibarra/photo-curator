'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Photo, SubCollection } from '@/lib/types'

export interface BestOfConfig {
  target_count: number
  ai_weight: number
  user_weight: number
  exclude_tier_c: boolean
  min_ai_rating: number
  min_user_rating: number | null
  require_analyzed: boolean
  prefer_diversity: boolean
  name: string
}

export interface BestOfMeta {
  total_in_collection: number
  total_eligible: number
  selected_count: number
  excluded_count: number
  target_count: number
}

export interface PhotoScore {
  id: string
  score: number
  score_breakdown: {
    ai_contribution: number
    user_contribution: number
    ai_weight: number
    user_weight: number
  }
}

const DEFAULT_CONFIG: BestOfConfig = {
  target_count: 20,
  ai_weight: 0.6,
  user_weight: 0.4,
  exclude_tier_c: true,
  min_ai_rating: 7.0,
  min_user_rating: null,
  require_analyzed: true,
  prefer_diversity: false,
  name: 'Best Of',
}

const TARGET_COUNT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]
const MIN_AI_RATING_OPTIONS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId: string
  photos: Photo[]
  existingConfig?: BestOfConfig | null
  onGenerated: (sub: SubCollection, photoScores: PhotoScore[], meta: BestOfMeta) => void
}

export function BestOfModal({
  open,
  onOpenChange,
  collectionId,
  photos,
  existingConfig,
  onGenerated,
}: Props) {
  const [config, setConfig] = useState<BestOfConfig>(existingConfig ?? DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ratedCount = photos.filter((p) => p.user_rating != null).length
  const hasUserRatings = ratedCount > 0

  function handleWeightChange(aiPct: number) {
    const aiWeight = aiPct / 100
    const userWeight = parseFloat((1 - aiWeight).toFixed(2))
    setConfig((c) => ({ ...c, ai_weight: aiWeight, user_weight: userWeight }))
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/collections/${collectionId}/best-of`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Generation failed')
        return
      }
      onGenerated(data.sub_collection, data.photos, data.meta)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            Generate Best Of Collection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Sub-collection name</label>
            <input
              value={config.name}
              onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          {/* Target count */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">How many photos?</label>
            <select
              value={config.target_count}
              onChange={(e) => setConfig((c) => ({ ...c, target_count: Number(e.target.value) }))}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none"
            >
              {TARGET_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* Weight slider */}
          {!hasUserRatings ? (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
              You haven&apos;t rated any photos yet. Best Of will be based entirely on AI ratings.
            </p>
          ) : (
            <div className="space-y-2 p-3 rounded-lg border border-input bg-muted/20">
              <p className="text-sm font-medium">Rating weights</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">AI Rating</span>
                  <span className="font-semibold tabular-nums">
                    {Math.round(config.ai_weight * 100)}%
                  </span>
                </div>
                {/* Visual weight bars */}
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  <div
                    className="bg-primary rounded-l-full transition-all duration-150"
                    style={{ width: `${config.ai_weight * 100}%` }}
                  />
                  <div
                    className="bg-amber-400 rounded-r-full transition-all duration-150"
                    style={{ width: `${config.user_weight * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Your Ratings</span>
                  <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                    {Math.round(config.user_weight * 100)}%
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(config.ai_weight * 100)}
                onChange={(e) => handleWeightChange(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                {ratedCount} of {photos.length} photos have your ratings.
                {ratedCount < photos.length && ' Unrated photos will use AI only.'}
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Filters</p>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.exclude_tier_c}
                  onChange={(e) => setConfig((c) => ({ ...c, exclude_tier_c: e.target.checked }))}
                  className="rounded border-input accent-primary size-4"
                />
                <span className="text-sm">Exclude Tier C photos</span>
              </label>

              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="rounded border-input accent-primary size-4 opacity-50 shrink-0"
                />
                <span className="text-sm shrink-0">Minimum AI rating</span>
                <select
                  value={config.min_ai_rating}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, min_ai_rating: Number(e.target.value) }))
                  }
                  className="h-7 rounded border border-input bg-transparent px-2 text-xs outline-none ml-auto"
                >
                  {MIN_AI_RATING_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v.toFixed(1)}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.require_analyzed}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, require_analyzed: e.target.checked }))
                  }
                  className="rounded border-input accent-primary size-4"
                />
                <span className="text-sm">Only use analyzed photos</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.prefer_diversity}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, prefer_diversity: e.target.checked }))
                  }
                  className="rounded border-input accent-primary size-4"
                />
                <span className="text-sm">Prefer variety (avoid near-duplicates)</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !config.name.trim()}
            className="px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Generate
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
