'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Flag,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Photo, SubCollection, SubCollectionPhoto } from '@/lib/types'
import CropPreviewPanel from '@/components/photos/CropPreviewPanel'
import type { CropCoords } from '@/components/photos/CropPreviewPanel'
import { BW_PROFILES, DEFAULT_BW_PROFILE } from '@/lib/bw-profiles'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SinglePhotoViewProps {
  photo: Photo
  photos: Photo[]
  currentIndex: number
  subCollections: SubCollection[]
  subCollectionPhotos: SubCollectionPhoto[]
  forceBw?: boolean
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  onPhotoUpdate: (photo: Photo) => void
  onDelete: (photoId: string) => Promise<boolean>
  onSubCollectionToggle: (subId: string, photoId: string, add: boolean) => Promise<void>
}

const TIER_CLASSES: Record<string, string> = {
  'A+': 'bg-emerald-500 text-white',
  A: 'bg-teal-500 text-white',
  B: 'bg-slate-500 text-white',
  C: 'bg-gray-400 text-white',
}

const TIER_LABELS: Record<string, string> = {
  'A+': 'Exceptional — wall-print worthy',
  A: 'Wall-print worthy',
  B: 'Gallery quality',
  C: 'Documentary',
}

function RatingBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/70 rounded-full"
          style={{ width: value != null ? `${(value / 10) * 100}%` : '0%' }}
        />
      </div>
      <span className="text-xs font-medium w-6 text-right">
        {value != null ? value.toFixed(1) : '—'}
      </span>
    </div>
  )
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered ?? value ?? 0) >= star
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? null : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'size-5 transition-colors',
                filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
              )}
            />
          </button>
        )
      })}
      {value != null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  )
}

export function SinglePhotoView({
  photo,
  photos,
  currentIndex,
  subCollections,
  subCollectionPhotos,
  forceBw = false,
  onClose,
  onNext,
  onPrev,
  onPhotoUpdate,
  onDelete,
  onSubCollectionToggle,
}: SinglePhotoViewProps) {
  const [dangerOpen, setDangerOpen] = useState(false)
  const [critiqueOpen, setCritiqueOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [bwOpen, setBwOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [bwEnabled, setBwEnabled] = useState(forceBw || photo.bw_profile != null)
  const [activeProfile, setActiveProfile] = useState(photo.bw_profile ?? DEFAULT_BW_PROFILE)
  const [savingBw, setSavingBw] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingRating, setSavingRating] = useState(false)
  const [savingFlag, setSavingFlag] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState(photo.user_notes ?? '')
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < photos.length - 1
  const isAnalyzed = !!photo.ai_analyzed_at || photo.ai_overall_rating != null

  // Sync notes field and clear transient state when photo ID changes
  useEffect(() => {
    setNotesValue(photo.user_notes ?? '')
    setAnalyzeError(null)
  }, [photo.id, photo.user_notes])

  // Sync B&W state when photo changes
  useEffect(() => {
    setBwEnabled(forceBw || photo.bw_profile != null)
    setActiveProfile(photo.bw_profile ?? DEFAULT_BW_PROFILE)
  }, [photo.id, photo.bw_profile, forceBw])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case 'ArrowLeft':
          if (hasPrev) onPrev()
          break
        case 'ArrowRight':
          if (hasNext) onNext()
          break
        case 'Escape':
          onClose()
          break
        case '1': case '2': case '3': case '4': case '5':
          handleRatingChange(Number(e.key))
          break
        case 'f':
          handleFlagToggle()
          break
        case 'a':
          handleAnalyze()
          break
        case 'b':
          if (!forceBw) setBwEnabled((v) => !v)
          break
        case 'Delete':
        case 'Backspace':
          setConfirmDelete(true)
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrev, hasNext, onPrev, onNext, onClose, photo])

  const handleRatingChange = useCallback(
    async (rating: number | null) => {
      setSavingRating(true)
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_rating: rating }),
      })
      if (res.ok) {
        const updated = await res.json()
        onPhotoUpdate(updated)
      }
      setSavingRating(false)
    },
    [photo.id, onPhotoUpdate]
  )

  const handleFlagToggle = useCallback(async () => {
    setSavingFlag(true)
    const res = await fetch(`/api/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_flagged: !photo.user_flagged }),
    })
    if (res.ok) {
      const updated = await res.json()
      onPhotoUpdate(updated)
    }
    setSavingFlag(false)
  }, [photo.id, photo.user_flagged, onPhotoUpdate])

  const handleNotesBlur = useCallback(async () => {
    if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current)
    if (notesValue === (photo.user_notes ?? '')) return
    const res = await fetch(`/api/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_notes: notesValue }),
    })
    if (res.ok) {
      const updated = await res.json()
      onPhotoUpdate(updated)
    }
  }, [photo.id, photo.user_notes, notesValue, onPhotoUpdate])

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzed || analyzing) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: 'POST',
      })
      if (res.ok) {
        const updated = await res.json()
        onPhotoUpdate(updated)
      } else {
        const data = await res.json().catch(() => ({}))
        if (data.billing) {
          setAnalyzeError('Add credits at console.anthropic.com to continue analyzing.')
        } else {
          setAnalyzeError('Analysis failed. Please try again.')
        }
      }
    } finally {
      setAnalyzing(false)
    }
  }, [photo.id, isAnalyzed, analyzing, onPhotoUpdate])

  const handleBwSave = useCallback(
    async (profileKey: string | null) => {
      setSavingBw(true)
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bw_profile: profileKey }),
      })
      if (res.ok) {
        const updated = await res.json()
        onPhotoUpdate(updated)
      }
      setSavingBw(false)
    },
    [photo.id, onPhotoUpdate]
  )

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    const ok = await onDelete(photo.id)
    if (ok) {
      setConfirmDelete(false)
      if (hasNext) onNext()
      else if (hasPrev) onPrev()
      else onClose()
    }
    setDeleting(false)
  }

  return (
    <>
      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove photo?</DialogTitle>
            <DialogDescription>
              <strong>{photo.filename}</strong> will be permanently removed from this collection and
              any sub-collections. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="px-3 py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main layout */}
      <div className="flex h-[calc(100vh-160px)] min-h-[500px] rounded-xl border overflow-hidden bg-background">
        {/* Photo area */}
        <div className="flex-1 min-w-0 relative bg-zinc-950 flex items-center justify-center group">
          {/* Full image */}
          <div className="relative w-full h-full">
            <Image
              key={photo.id}
              src={photo.storage_url}
              alt={photo.filename}
              fill
              className="object-contain"
              sizes="(max-width: 1280px) 70vw, 900px"
              unoptimized
              priority
              style={bwEnabled ? { filter: BW_PROFILES[activeProfile]?.cssFilter ?? BW_PROFILES[DEFAULT_BW_PROFILE].cssFilter } : undefined}
            />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 z-10 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Back to grid (Esc)"
          >
            <X className="size-4" />
          </button>

          {/* Counter */}
          <div className="absolute top-3 right-3 z-10 text-xs text-white/70 bg-black/40 px-2 py-1 rounded">
            {currentIndex + 1} / {photos.length}
          </div>

          {/* Prev button */}
          {hasPrev && (
            <button
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
              title="Previous (←)"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}

          {/* Next button */}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
              title="Next (→)"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>

        {/* Side panel */}
        <div className="w-80 xl:w-96 shrink-0 border-l overflow-y-auto flex flex-col divide-y">
          {/* AI Analysis */}
          <section className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">AI Analysis</h3>
              <div className="flex items-center gap-2">
                {!isAnalyzed && !analyzing && (
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    title="Analyze (a)"
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-input bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="size-3" />
                    Analyze
                  </button>
                )}
                {isAnalyzed && photo.ai_tier && (
                  <span
                    className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded',
                      TIER_CLASSES[photo.ai_tier]
                    )}
                    title={TIER_LABELS[photo.ai_tier]}
                  >
                    Tier {photo.ai_tier}
                  </span>
                )}
              </div>
            </div>

            {!isAnalyzed ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                {analyzing ? (
                  <>
                    <Loader2 className="size-6 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Analyzing…</p>
                  </>
                ) : analyzeError ? (
                  <>
                    <AlertCircle className="size-5 text-destructive" />
                    <p className="text-xs text-destructive leading-relaxed">{analyzeError}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Not yet analyzed</p>
                    <p className="text-xs text-muted-foreground/70">
                      Click &ldquo;Analyze&rdquo; or press <kbd className="font-mono">a</kbd> to start analysis.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Title + caption */}
                {photo.ai_title && (
                  <div>
                    <p className="font-semibold text-sm font-display">{photo.ai_title}</p>
                    {photo.ai_caption && (
                      <p className="text-xs text-muted-foreground mt-0.5">{photo.ai_caption}</p>
                    )}
                  </div>
                )}

                {/* Overall rating */}
                {photo.ai_overall_rating != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold font-display tabular-nums">
                      {Number(photo.ai_overall_rating).toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 10 overall</span>
                  </div>
                )}

                {/* Rating breakdown */}
                <div className="space-y-1.5">
                  <RatingBar label="Technical" value={photo.ai_technical_rating} />
                  <RatingBar label="Composition" value={photo.ai_composition_rating} />
                  <RatingBar label="Light" value={photo.ai_light_rating} />
                  <RatingBar label="Impact" value={photo.ai_impact_rating} />
                  <RatingBar label="Print" value={photo.ai_print_rating} />
                  <RatingBar label="B&W" value={photo.ai_bw_rating} />
                </div>

                {/* Critique (expandable) */}
                {photo.ai_critique && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setCritiqueOpen((v) => !v)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      Critique
                      {critiqueOpen ? (
                        <ChevronUp className="size-3 ml-auto" />
                      ) : (
                        <ChevronDown className="size-3 ml-auto" />
                      )}
                    </button>
                    {critiqueOpen && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {photo.ai_critique}
                      </p>
                    )}
                  </div>
                )}

                {/* Crop preview — shows visual crop when ai_crop_coords present, prose fallback otherwise */}
                {(photo.ai_crop_suggestion || (photo as Photo & { ai_crop_coords?: CropCoords | null }).ai_crop_coords) && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setCropOpen((v) => !v)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      Crop / edit
                      {cropOpen ? (
                        <ChevronUp className="size-3 ml-auto" />
                      ) : (
                        <ChevronDown className="size-3 ml-auto" />
                      )}
                    </button>
                    {cropOpen && (
                      <div className="mt-2">
                        <CropPreviewPanel photo={photo as Photo & { ai_crop_coords?: CropCoords | null; user_crop_coords?: CropCoords | null; original_width?: number | null; original_height?: number | null }} />
                      </div>
                    )}
                  </div>
                )}

                {/* B&W rationale */}
                {photo.ai_bw_rationale && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setBwOpen((v) => !v)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      B&W suitability
                      {bwOpen ? (
                        <ChevronUp className="size-3 ml-auto" />
                      ) : (
                        <ChevronDown className="size-3 ml-auto" />
                      )}
                    </button>
                    {bwOpen && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {photo.ai_bw_rationale}
                      </p>
                    )}
                  </div>
                )}

                {/* Tags */}
                {photo.ai_tags && photo.ai_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {photo.ai_tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* User Input */}
          <section className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Your Notes</h3>

            {/* Star rating */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Rating</label>
              <div className="flex items-center gap-2">
                <StarRating
                  value={photo.user_rating}
                  onChange={handleRatingChange}
                />
                {savingRating && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes…"
                rows={3}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background resize-none outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Flag */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Flagged</label>
              <button
                type="button"
                onClick={handleFlagToggle}
                disabled={savingFlag}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                  photo.user_flagged
                    ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-50'
                    : 'bg-background border-input text-muted-foreground hover:bg-muted'
                )}
              >
                <Flag
                  className={cn(
                    'size-3',
                    photo.user_flagged && 'fill-amber-500 text-amber-500'
                  )}
                />
                {photo.user_flagged ? 'Flagged' : 'Flag'}
                {savingFlag && <Loader2 className="size-3 animate-spin ml-0.5" />}
              </button>
            </div>
          </section>

          {/* B&W */}
          <section className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Black & White</h3>
              <div className="flex items-center gap-2">
                {savingBw && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                <button
                  type="button"
                  title={forceBw ? 'B&W locked by sub-collection' : 'Toggle B&W (b)'}
                  disabled={forceBw}
                  onClick={() => {
                    const next = !bwEnabled
                    setBwEnabled(next)
                    if (!next) handleBwSave(null)
                  }}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    bwEnabled ? 'bg-primary' : 'bg-input',
                    forceBw ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                      bwEnabled ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>

            {bwEnabled && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(BW_PROFILES).map(([key, profile]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveProfile(key)
                        handleBwSave(key)
                      }}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        activeProfile === key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {profile.label}
                    </button>
                  ))}
                </div>
                {photo.bw_profile && (
                  <p className="text-[10px] text-muted-foreground">
                    Saved: {BW_PROFILES[photo.bw_profile]?.label ?? photo.bw_profile}
                    {photo.bw_profile !== activeProfile && ' · unsaved changes'}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Sub-collections */}
          {subCollections.length > 0 && (
            <section className="p-4 space-y-2">
              <h3 className="text-sm font-semibold">Sub-collections</h3>
              <div className="space-y-1">
                {subCollections.map((sub) => {
                  const isMember = subCollectionPhotos.some(
                    (sp) => sp.sub_collection_id === sub.id && sp.photo_id === photo.id
                  )
                  return (
                    <label
                      key={sub.id}
                      className="flex items-center gap-2.5 cursor-pointer py-1 group/sub"
                    >
                      <input
                        type="checkbox"
                        checked={isMember}
                        onChange={() => onSubCollectionToggle(sub.id, photo.id, !isMember)}
                        className="rounded border-input size-4 accent-primary cursor-pointer"
                      />
                      {sub.color && (
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                      )}
                      {sub.is_best_of && (
                        <Sparkles className="size-3 text-amber-500 shrink-0" />
                      )}
                      <span className="text-sm group-hover/sub:text-foreground transition-colors">
                        {sub.name}
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>
          )}

          {/* Danger zone */}
          <section className="p-4 mt-auto">
            <button
              type="button"
              onClick={() => setDangerOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full"
            >
              <AlertCircle className="size-3" />
              Danger zone
              {dangerOpen ? (
                <ChevronUp className="size-3 ml-auto" />
              ) : (
                <ChevronDown className="size-3 ml-auto" />
              )}
            </button>
            {dangerOpen && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/5 transition-colors"
                >
                  Remove from collection
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
