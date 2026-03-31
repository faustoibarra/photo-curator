'use client'

import type { Photo } from '@/lib/types'
import { PhotoCard } from './PhotoCard'

interface PhotoGridProps {
  photos: Photo[]
  multiSelect: boolean
  selectedIds: Set<string>
  onPhotoClick: (id: string) => void
  onPhotoSelect: (id: string) => void
}

export function PhotoGrid({
  photos,
  multiSelect,
  selectedIds,
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
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          multiSelect={multiSelect}
          selected={selectedIds.has(photo.id)}
          onClick={() => {
            if (multiSelect) {
              onPhotoSelect(photo.id)
            } else {
              onPhotoClick(photo.id)
            }
          }}
          onCheckboxChange={() => onPhotoSelect(photo.id)}
        />
      ))}
    </div>
  )
}
