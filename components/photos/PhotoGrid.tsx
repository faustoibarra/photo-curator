'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Photo } from '@/lib/types'
import type { PhotoScore } from './BestOfModal'
import { PhotoCard } from './PhotoCard'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PhotoGridProps {
  photos: Photo[]
  multiSelect: boolean
  selectedIds: Set<string>
  analyzingIds?: Set<string>
  scoreMap?: Map<string, { score: number; score_breakdown: PhotoScore['score_breakdown'] }> | null
  onPhotoClick: (id: string) => void
  onPhotoSelect: (id: string) => void
  onPhotoDelete?: (id: string) => Promise<boolean>
}

interface ContextMenu {
  photoId: string
  x: number
  y: number
}

export function PhotoGrid({
  photos,
  multiSelect,
  selectedIds,
  analyzingIds,
  scoreMap,
  onPhotoClick,
  onPhotoSelect,
  onPhotoDelete,
}: PhotoGridProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!contextMenu) return
    function close(e: MouseEvent) {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return
      setContextMenu(null)
    }
    function closeScroll() { setContextMenu(null) }
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', closeScroll, true)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', closeScroll, true)
    }
  }, [contextMenu])

  function handleContextMenu(e: React.MouseEvent, photoId: string) {
    if (!onPhotoDelete) return
    e.preventDefault()
    setContextMenu({ photoId, x: e.clientX, y: e.clientY })
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !onPhotoDelete) return
    setDeleting(true)
    await onPhotoDelete(deleteTarget)
    setDeleting(false)
    setDeleteTarget(null)
  }

  const deleteTargetPhoto = photos.find((p) => p.id === deleteTarget)

  if (photos.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-12">
        No photos match the current filters.
      </p>
    )
  }

  return (
    <>
      {/* Confirm delete dialog (context menu path) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove photo?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTargetPhoto?.filename}</strong> will be permanently removed from this
              collection and any sub-collections. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
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

      {/* Floating context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
          className="min-w-[160px] rounded-lg border bg-popover shadow-md py-1 text-sm"
        >
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-left"
            onClick={() => {
              const id = contextMenu.photoId
              setContextMenu(null)
              setDeleteTarget(id)
            }}
          >
            <Trash2 className="size-3.5 shrink-0" />
            Remove from collection
          </button>
        </div>
      )}

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
              onContextMenu={onPhotoDelete ? handleContextMenu : undefined}
            />
          )
        })}
      </div>
    </>
  )
}
