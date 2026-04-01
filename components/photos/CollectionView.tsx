'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Photo, SubCollection, SubCollectionPhoto } from '@/lib/types'
import { CollectionToolbar } from '@/components/collections/CollectionToolbar'
import { PhotoGrid } from './PhotoGrid'
import { SinglePhotoView } from './SinglePhotoView'

export type TierFilter = 'all' | 'A' | 'B' | 'C'
export type AnalyzedFilter = 'all' | 'analyzed' | 'unanalyzed'
export type SortOption = 'upload_date' | 'ai_rating' | 'user_rating' | 'filename'

interface CollectionViewProps {
  initialPhotos: Photo[]
  subCollections: SubCollection[]
  subCollectionPhotos: SubCollectionPhoto[]
  collectionId: string
  collectionName: string
}

function filterAndSort(
  photos: Photo[],
  tier: TierFilter,
  analyzed: AnalyzedFilter,
  sort: SortOption
): Photo[] {
  let result = photos.filter((p) => {
    if (tier !== 'all' && p.ai_tier !== tier) return false
    if (analyzed === 'analyzed' && !p.ai_analyzed_at) return false
    if (analyzed === 'unanalyzed' && p.ai_analyzed_at) return false
    return true
  })

  result = [...result].sort((a, b) => {
    switch (sort) {
      case 'ai_rating':
        return (b.ai_overall_rating ?? -1) - (a.ai_overall_rating ?? -1)
      case 'user_rating':
        return (b.user_rating ?? -1) - (a.user_rating ?? -1)
      case 'filename':
        return a.filename.localeCompare(b.filename)
      case 'upload_date':
      default:
        return new Date(b.uploaded_at ?? 0).getTime() - new Date(a.uploaded_at ?? 0).getTime()
    }
  })

  return result
}

export function CollectionView({
  initialPhotos,
  subCollections,
  subCollectionPhotos: initialSubCollectionPhotos,
  collectionId,
  collectionName,
}: CollectionViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Local photo state (optimistic updates)
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [subCollectionPhotos, setSubCollectionPhotos] = useState<SubCollectionPhoto[]>(initialSubCollectionPhotos)
  useEffect(() => setPhotos(initialPhotos), [initialPhotos])
  useEffect(() => setSubCollectionPhotos(initialSubCollectionPhotos), [initialSubCollectionPhotos])

  // Filter / sort state
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [analyzedFilter, setAnalyzedFilter] = useState<AnalyzedFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('upload_date')
  const [activeSubId, setActiveSubId] = useState<string | null>(null)

  // Multi-select state
  const [multiSelect, setMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Single photo view: URL-driven
  const photoParam = searchParams.get('photo')

  // Derived: filtered + sorted photos for the active tab
  const displayedPhotos = useMemo(() => {
    let base = photos
    if (activeSubId) {
      const memberIds = new Set(
        subCollectionPhotos
          .filter((sp) => sp.sub_collection_id === activeSubId)
          .map((sp) => sp.photo_id)
      )
      base = photos.filter((p) => memberIds.has(p.id))
    }
    return filterAndSort(base, tierFilter, analyzedFilter, sortBy)
  }, [photos, subCollectionPhotos, activeSubId, tierFilter, analyzedFilter, sortBy])

  const currentIndex = displayedPhotos.findIndex((p) => p.id === photoParam)
  const selectedPhoto = currentIndex >= 0 ? displayedPhotos[currentIndex] : null

  const openPhoto = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('photo', id)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const closePhoto = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('photo')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  const goNext = useCallback(() => {
    if (currentIndex < displayedPhotos.length - 1) {
      openPhoto(displayedPhotos[currentIndex + 1].id)
    }
  }, [currentIndex, displayedPhotos, openPhoto])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      openPhoto(displayedPhotos[currentIndex - 1].id)
    }
  }, [currentIndex, displayedPhotos, openPhoto])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handlePhotoUpdate = useCallback((updated: Photo) => {
    setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }, [])

  const handlePhotoDelete = useCallback(
    async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
      if (!res.ok) return false
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      router.refresh()
      return true
    },
    [router]
  )

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      const res = await fetch(`/api/collections/${collectionId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: ids }),
      })
      if (!res.ok) return false
      setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)))
      setSelectedIds(new Set())
      router.refresh()
      return true
    },
    [collectionId, router]
  )

  const handleSubCollectionToggle = useCallback(
    async (subId: string, photoId: string, add: boolean) => {
      // Optimistic update
      setSubCollectionPhotos((prev) => {
        if (add) {
          if (prev.some((sp) => sp.sub_collection_id === subId && sp.photo_id === photoId)) return prev
          return [...prev, { sub_collection_id: subId, photo_id: photoId, added_at: new Date().toISOString(), score: null, score_breakdown: null }]
        } else {
          return prev.filter((sp) => !(sp.sub_collection_id === subId && sp.photo_id === photoId))
        }
      })

      const method = add ? 'POST' : 'DELETE'
      const res = await fetch(`/api/sub-collections/${subId}/photos`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: [photoId] }),
      })

      if (!res.ok) {
        // Revert on failure
        setSubCollectionPhotos((prev) => {
          if (add) {
            return prev.filter((sp) => !(sp.sub_collection_id === subId && sp.photo_id === photoId))
          } else {
            return [...prev, { sub_collection_id: subId, photo_id: photoId, added_at: new Date().toISOString(), score: null, score_breakdown: null }]
          }
        })
      }
    },
    []
  )

  return (
    <div className="space-y-4">
      <CollectionToolbar
        collectionId={collectionId}
        collectionName={collectionName}
        subCollections={subCollections}
        tierFilter={tierFilter}
        onTierFilter={setTierFilter}
        analyzedFilter={analyzedFilter}
        onAnalyzedFilter={setAnalyzedFilter}
        sortBy={sortBy}
        onSortBy={setSortBy}
        activeSubId={activeSubId}
        onActiveSubId={setActiveSubId}
        multiSelect={multiSelect}
        onMultiSelectToggle={() => {
          setMultiSelect((v) => !v)
          clearSelection()
        }}
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        activeSubCollection={subCollections.find((s) => s.id === activeSubId) ?? null}
      />

      {photoParam && selectedPhoto ? (
        <SinglePhotoView
          key={selectedPhoto.id}
          photo={selectedPhoto}
          photos={displayedPhotos}
          currentIndex={currentIndex}
          subCollections={subCollections}
          subCollectionPhotos={subCollectionPhotos}
          onClose={closePhoto}
          onNext={goNext}
          onPrev={goPrev}
          onPhotoUpdate={handlePhotoUpdate}
          onDelete={handlePhotoDelete}
          onSubCollectionToggle={handleSubCollectionToggle}
        />
      ) : (
        <PhotoGrid
          photos={displayedPhotos}
          multiSelect={multiSelect}
          selectedIds={selectedIds}
          onPhotoClick={openPhoto}
          onPhotoSelect={toggleSelect}
        />
      )}
    </div>
  )
}
