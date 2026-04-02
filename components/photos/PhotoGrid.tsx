'use client'

import type { Photo } from '@/lib/types'
import type { PhotoScore } from './BestOfModal'
import { PhotoCard } from './PhotoCard'

interface PhotoGridProps {
  photos: Photo[]
  multiSelect: boolean
  selectedIds: Set<string>
  analyzingIds?: Set<string>
  scoreMap?: Map<string, { score: number; score_breakdown: PhotoScore['score_breakdown'] }> | null
  onPhotoClick: (id: string) => void
  onPhotoSelect: (id: string) => void
}

export function PhotoGrid({
  photos,
  multiSelect,
  selectedIds,
  analyzingIds,
  scoreMap,
  onPhotoClick,
  onPhotoSelect,
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-12">
        No photos match the current filters.
      </p>
    )
  }

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
    >
      {photos.map((photo) => {
        const scoreData = scoreMap?.get(photo.id) ?? null
        return (
          <PhotoCard
            key={photo.id}
            photo={photo}
            multiSelect={multiSelect}
            selected={selectedIds.has(photo.id)}
            isAnalyzing={analyzingIds?.has(photo.id) ?? false}
            compositeScore={scoreData?.score ?? null}
            scoreBreakdown={scoreData?.score_breakdown ?? null}
            onClick={() => {
              if (multiSelect) {
                onPhotoSelect(photo.id)
              } else {
                onPhotoClick(photo.id)
              }
            }}
            onCheckboxChange={() => onPhotoSelect(photo.id)}
          />
        )
      })}
    </div>
  )
}
