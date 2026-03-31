'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export type DuplicateResolution = 'skip' | 'replace' | 'keep_both'

export interface DuplicateConflict {
  filename: string
  existing_photo_id: string
  thumbnail_url: string | null
  uploaded_at: string | null
  ai_overall_rating: number | null
}

interface DuplicateResolutionModalProps {
  open: boolean
  conflicts: DuplicateConflict[]
  onResolve: (resolutions: Record<string, DuplicateResolution>) => void
  onCancel: () => void
}

function formatDate(iso: string | null): string {
  if (!iso) return 'unknown date'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return 'unknown date'
  }
}

const RESOLUTION_LABELS: Record<DuplicateResolution, string> = {
  skip: 'Skip',
  replace: 'Replace',
  keep_both: 'Keep both',
}

export function DuplicateResolutionModal({
  open,
  conflicts,
  onResolve,
  onCancel,
}: DuplicateResolutionModalProps) {
  const [resolutions, setResolutions] = useState<Record<string, DuplicateResolution>>(
    () =>
      Object.fromEntries(conflicts.map((c) => [c.filename, 'replace' as DuplicateResolution]))
  )
  const [applyAllValue, setApplyAllValue] = useState<DuplicateResolution>('skip')

  const set = (filename: string, value: DuplicateResolution) =>
    setResolutions((prev) => ({ ...prev, [filename]: value }))

  const applyToAll = () =>
    setResolutions(Object.fromEntries(conflicts.map((c) => [c.filename, applyAllValue])))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Duplicate Photos Found</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1">
          {conflicts.length} of your photos already exist in this collection.
          Choose what to do with each:
        </p>

        <div className="space-y-3">
          {conflicts.map((conflict) => (
            <div
              key={conflict.filename}
              className="flex gap-3 rounded-lg border p-3 items-start"
            >
              {/* Thumbnail */}
              <div className="shrink-0 w-14 h-14 rounded bg-muted overflow-hidden relative">
                {conflict.thumbnail_url ? (
                  <Image
                    src={conflict.thumbnail_url}
                    alt={conflict.filename}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    ?
                  </div>
                )}
              </div>

              {/* Info + options */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conflict.filename}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Existing: {formatDate(conflict.uploaded_at)}
                  {conflict.ai_overall_rating != null
                    ? ` · AI rating ${conflict.ai_overall_rating}`
                    : ' · no rating yet'}
                </p>

                {/* Radio buttons */}
                <div className="flex gap-4 mt-2">
                  {(['skip', 'replace', 'keep_both'] as DuplicateResolution[]).map(
                    (option) => (
                      <label
                        key={option}
                        className="flex items-center gap-1.5 cursor-pointer text-sm"
                      >
                        <input
                          type="radio"
                          name={`res-${conflict.filename}`}
                          value={option}
                          checked={resolutions[conflict.filename] === option}
                          onChange={() => set(conflict.filename, option)}
                          className="accent-primary"
                        />
                        {RESOLUTION_LABELS[option]}
                      </label>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Apply to all */}
        <div className="flex items-center gap-2 pt-1 border-t">
          <span className="text-sm text-muted-foreground">Apply to all duplicates:</span>
          <select
            value={applyAllValue}
            onChange={(e) => setApplyAllValue(e.target.value as DuplicateResolution)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="skip">Skip</option>
            <option value="replace">Replace</option>
            <option value="keep_both">Keep both</option>
          </select>
          <Button variant="outline" size="sm" onClick={applyToAll}>
            Apply to all
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel upload
          </Button>
          <Button onClick={() => onResolve(resolutions)}>
            Continue upload →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
