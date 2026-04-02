'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { Photo, SubCollection, SubCollectionPhoto } from '@/lib/types'
import { CollectionToolbar } from '@/components/collections/CollectionToolbar'
import { NewSubCollectionModal } from '@/components/collections/NewSubCollectionModal'
import {
  BestOfModal,
  type BestOfConfig,
  type BestOfMeta,
  type PhotoScore,
} from '@/components/photos/BestOfModal'
import { PhotoGrid } from './PhotoGrid'
import { SinglePhotoView } from './SinglePhotoView'

export type TierFilter = 'all' | 'A' | 'B' | 'C'  // 'A' matches both A and A+
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
    if (tier !== 'all') {
      // Selecting 'A' shows both 'A' and 'A+' photos
      if (tier === 'A' && p.ai_tier !== 'A' && p.ai_tier !== 'A+') return false
      if (tier !== 'A' && p.ai_tier !== tier) return false
    }
    if (analyzed === 'analyzed' && !p.ai_analyzed_at) return false
    if (analyzed === 'unanalyzed' && p.ai_analyzed_at) return false
    return true
  })

  const TIER_ORDER: Record<string, number> = { 'A+': 0, A: 1, B: 2, C: 3 }

  result = [...result].sort((a, b) => {
    switch (sort) {
      case 'ai_rating': {
        const tierA = TIER_ORDER[a.ai_tier ?? ''] ?? 99
        const tierB = TIER_ORDER[b.ai_tier ?? ''] ?? 99
        if (tierA !== tierB) return tierA - tierB
        return (b.ai_overall_rating ?? -1) - (a.ai_overall_rating ?? -1)
      }
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
  subCollections: initialSubCollections,
  subCollectionPhotos: initialSubCollectionPhotos,
  collectionId,
  collectionName,
}: CollectionViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Local state (optimistic updates)
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [subCollections, setSubCollections] = useState<SubCollection[]>(initialSubCollections)
  const [subCollectionPhotos, setSubCollectionPhotos] = useState<SubCollectionPhoto[]>(
    initialSubCollectionPhotos
  )

  // Analysis queue state
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())
  const [analyzeAllRunning, setAnalyzeAllRunning] = useState(false)

  useEffect(() => setPhotos(initialPhotos), [initialPhotos])
  useEffect(() => setSubCollections(initialSubCollections), [initialSubCollections])
  useEffect(
    () => setSubCollectionPhotos(initialSubCollectionPhotos),
    [initialSubCollectionPhotos]
  )

  // Filter / sort state
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [analyzedFilter, setAnalyzedFilter] = useState<AnalyzedFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('upload_date')
  const [activeSubId, setActiveSubId] = useState<string | null>(null)

  // Multi-select state
  const [multiSelect, setMultiSelect] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modal state
  const [newSubModalOpen, setNewSubModalOpen] = useState(false)
  const [bestOfModalOpen, setBestOfModalOpen] = useState(false)
  const [bestOfMeta, setBestOfMeta] = useState<BestOfMeta | null>(null)

  // Bulk action notice (lifted from toolbar so post-create flow can set it)
  const [bulkNotice, setBulkNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  // Ids waiting to be added once a new sub-collection is created
  const [pendingBulkAddIds, setPendingBulkAddIds] = useState<string[]>([])

  // Single photo view: URL-driven
  const photoParam = searchParams.get('photo')

  // Derived: active sub-collection object
  const activeSubCollection = subCollections.find((s) => s.id === activeSubId) ?? null

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

  // Derived: score map for Best Of tab
  const scoreMap = useMemo(() => {
    if (!activeSubCollection?.is_best_of) return null
    const map = new Map<string, { score: number; score_breakdown: PhotoScore['score_breakdown'] }>()
    for (const scp of subCollectionPhotos) {
      if (scp.sub_collection_id === activeSubId && scp.score != null) {
        map.set(scp.photo_id, {
          score: scp.score,
          score_breakdown: scp.score_breakdown as PhotoScore['score_breakdown'],
        })
      }
    }
    return map
  }, [activeSubCollection, activeSubId, subCollectionPhotos])

  // Best Of existing config (for reconfigure / refresh)
  const bestOfSub = subCollections.find((s) => s.is_best_of) ?? null
  const bestOfConfig = bestOfSub?.best_of_config as BestOfConfig | null | undefined

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

  const analyzePhoto = useCallback(
    async (photoId: string) => {
      setAnalyzingIds((prev) => new Set(prev).add(photoId))
      try {
        const res = await fetch(`/api/photos/${photoId}`, { method: 'POST' })
        if (res.ok) {
          const updated = await res.json()
          handlePhotoUpdate(updated)
        } else {
          console.error(`[Analysis] Failed for ${photoId}: ${res.status}`)
        }
      } catch (err) {
        console.error(`[Analysis] Error for ${photoId}:`, err)
      } finally {
        setAnalyzingIds((prev) => {
          const next = new Set(prev)
          next.delete(photoId)
          return next
        })
      }
    },
    [handlePhotoUpdate]
  )

  const handleAnalyzeAll = useCallback(async () => {
    if (analyzeAllRunning) return
    const unanalyzed = photos.filter((p) => !p.ai_analyzed_at && !analyzingIds.has(p.id))
    if (unanalyzed.length === 0) return

    setAnalyzeAllRunning(true)
    for (const photo of unanalyzed) {
      await analyzePhoto(photo.id)
    }
    setAnalyzeAllRunning(false)
  }, [photos, analyzingIds, analyzeAllRunning, analyzePhoto])

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
          if (prev.some((sp) => sp.sub_collection_id === subId && sp.photo_id === photoId))
            return prev
          return [
            ...prev,
            {
              sub_collection_id: subId,
              photo_id: photoId,
              added_at: new Date().toISOString(),
              score: null,
              score_breakdown: null,
            },
          ]
        } else {
          return prev.filter(
            (sp) => !(sp.sub_collection_id === subId && sp.photo_id === photoId)
          )
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
            return prev.filter(
              (sp) => !(sp.sub_collection_id === subId && sp.photo_id === photoId)
            )
          } else {
            return [
              ...prev,
              {
                sub_collection_id: subId,
                photo_id: photoId,
                added_at: new Date().toISOString(),
                score: null,
                score_breakdown: null,
              },
            ]
          }
        })
      }
    },
    []
  )

  const handleBulkAddToSubCollection = useCallback(
    async (subId: string, photoIds: string[]): Promise<{ added: number; error?: string }> => {
      // Optimistic update
      setSubCollectionPhotos((prev) => {
        const newRows = photoIds
          .filter((pid) => !prev.some((sp) => sp.sub_collection_id === subId && sp.photo_id === pid))
          .map((pid) => ({
            sub_collection_id: subId,
            photo_id: pid,
            added_at: new Date().toISOString(),
            score: null,
            score_breakdown: null,
          }))
        return [...prev, ...newRows]
      })

      const res = await fetch(`/api/sub-collections/${subId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: photoIds }),
      })

      if (!res.ok) {
        // Revert optimistic update
        setSubCollectionPhotos((prev) =>
          prev.filter(
            (sp) => !(sp.sub_collection_id === subId && photoIds.includes(sp.photo_id))
          )
        )
        const data = await res.json().catch(() => ({}))
        return { added: 0, error: data.error ?? 'Failed to add photos' }
      }

      const data = await res.json()
      return { added: data.added ?? photoIds.length }
    },
    []
  )

  const handleBulkRemoveFromSubCollection = useCallback(
    async (subId: string, photoIds: string[]) => {
      // Optimistic update
      setSubCollectionPhotos((prev) =>
        prev.filter(
          (sp) => !(sp.sub_collection_id === subId && photoIds.includes(sp.photo_id))
        )
      )

      const res = await fetch(`/api/sub-collections/${subId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_ids: photoIds }),
      })

      if (!res.ok) {
        // Revert
        setSubCollectionPhotos((prev) => {
          const reinserted = photoIds.map((pid) => ({
            sub_collection_id: subId,
            photo_id: pid,
            added_at: new Date().toISOString(),
            score: null,
            score_breakdown: null,
          }))
          return [...prev, ...reinserted]
        })
      }
    },
    []
  )

  const handleNewSubCollection = useCallback(async (sub: SubCollection) => {
    setSubCollections((prev) => [...prev, sub])
    // If opened from bulk-add context, add the pending photos now
    if (pendingBulkAddIds.length > 0) {
      const ids = pendingBulkAddIds
      setPendingBulkAddIds([])
      const result = await handleBulkAddToSubCollection(sub.id, ids)
      if (result.error) {
        setBulkNotice({ message: result.error, type: 'error' })
      } else {
        const n = result.added
        setBulkNotice({
          message: `${n} photo${n !== 1 ? 's' : ''} added to "${sub.name}"`,
          type: 'success',
        })
        setSelectedIds(new Set())
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBulkAddIds])

  const handleNewSubCollectionBulk = useCallback((ids: string[]) => {
    setPendingBulkAddIds(ids)
    setNewSubModalOpen(true)
  }, [])

  const handleBulkAddResult = useCallback(
    (result: { added: number; error?: string }, subName: string) => {
      if (result.error) {
        setBulkNotice({ message: result.error, type: 'error' })
      } else {
        const n = result.added
        setBulkNotice({
          message: `${n} photo${n !== 1 ? 's' : ''} added to "${subName}"`,
          type: 'success',
        })
      }
    },
    []
  )

  const handleBestOfGenerated = useCallback(
    (sub: SubCollection, photoScores: PhotoScore[], meta?: BestOfMeta) => {
      // Add or update the Best Of sub-collection
      setSubCollections((prev) => {
        const exists = prev.some((s) => s.id === sub.id)
        if (exists) return prev.map((s) => (s.id === sub.id ? sub : s))
        return [...prev, sub]
      })

      // Remove old entries for this sub-collection, insert new ones with scores
      setSubCollectionPhotos((prev) => {
        const withoutOld = prev.filter((sp) => sp.sub_collection_id !== sub.id)
        const newEntries: SubCollectionPhoto[] = photoScores.map((ps) => ({
          sub_collection_id: sub.id,
          photo_id: ps.id,
          added_at: new Date().toISOString(),
          score: ps.score,
          score_breakdown: ps.score_breakdown as unknown as import('@/lib/supabase/types').Json,
        }))
        return [...withoutOld, ...newEntries]
      })

      if (meta) setBestOfMeta(meta)

      // Switch to the Best Of tab (clear sub-collection filters so all members show)
      setTierFilter('all')
      setAnalyzedFilter('all')
      setActiveSubId(sub.id)
    },
    []
  )

  const handleRefreshBestOf = useCallback(async () => {
    if (!bestOfConfig || !bestOfSub) return
    const res = await fetch(`/api/collections/${collectionId}/best-of`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bestOfConfig),
    })
    if (!res.ok) return
    const { sub_collection, photos: photoScores, meta } = await res.json()
    handleBestOfGenerated(sub_collection, photoScores, meta)
  }, [bestOfConfig, bestOfSub, collectionId, handleBestOfGenerated])

  // Switch tab and clear any filters that could hide sub-collection members
  const handleTabSwitch = useCallback((id: string | null) => {
    setActiveSubId(id)
    setTierFilter('all')
    setAnalyzedFilter('all')
    // Clear best-of meta banner when leaving the best-of tab
    if (id !== bestOfSub?.id) setBestOfMeta(null)
  }, [bestOfSub?.id])

  const unanalyzedCount = photos.filter((p) => !p.ai_analyzed_at).length

  return (
    <div className="space-y-4">
      <NewSubCollectionModal
        open={newSubModalOpen}
        onOpenChange={setNewSubModalOpen}
        collectionId={collectionId}
        onCreated={handleNewSubCollection}
      />

      <BestOfModal
        open={bestOfModalOpen}
        onOpenChange={setBestOfModalOpen}
        collectionId={collectionId}
        photos={photos}
        existingConfig={bestOfConfig}
        onGenerated={handleBestOfGenerated}
      />

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
        onActiveSubId={handleTabSwitch}
        multiSelect={multiSelect}
        onMultiSelectToggle={() => {
          setMultiSelect((v) => !v)
          clearSelection()
        }}
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkAddToSubCollection={handleBulkAddToSubCollection}
        onBulkRemoveFromSubCollection={handleBulkRemoveFromSubCollection}
        activeSubCollection={activeSubCollection}
        onAnalyzeAll={handleAnalyzeAll}
        analyzeAllRunning={analyzeAllRunning}
        analyzedCount={photos.length - unanalyzedCount}
        totalCount={photos.length}
        onNewSubCollection={() => setNewSubModalOpen(true)}
        onNewSubCollectionBulk={handleNewSubCollectionBulk}
        onGenerateBestOf={() => setBestOfModalOpen(true)}
        bulkNotice={bulkNotice}
        onBulkNoticeDismiss={() => setBulkNotice(null)}
        onBulkAddResult={handleBulkAddResult}
        onRefreshBestOf={bestOfSub ? handleRefreshBestOf : undefined}
        onBulkAnalyze={(ids) => {
          ids.forEach((id) => {
            const photo = photos.find((p) => p.id === id)
            if (photo && !photo.ai_analyzed_at && !analyzingIds.has(id)) {
              analyzePhoto(id)
            }
          })
        }}
        bulkAnalyzingIds={analyzingIds}
      />

      {/* Best Of generation result banner */}
      {bestOfMeta && activeSubCollection?.is_best_of && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm dark:bg-amber-950/30 dark:border-amber-800">
          <span className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">✨</span>
          <div className="flex-1 text-amber-800 dark:text-amber-300">
            <strong>{bestOfMeta.selected_count} photos selected</strong> from{' '}
            {bestOfMeta.total_in_collection} total
            {bestOfMeta.excluded_count > 0 && (
              <>
                {' '}({bestOfMeta.excluded_count} excluded by filters —{' '}
                <button
                  type="button"
                  onClick={() => setBestOfModalOpen(true)}
                  className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                >
                  adjust in Reconfigure
                </button>
                )
              </>
            )}
            {bestOfMeta.selected_count < bestOfMeta.target_count &&
              bestOfMeta.selected_count === bestOfMeta.total_eligible && (
                <span className="text-amber-700 dark:text-amber-400">
                  {' '}· Only {bestOfMeta.total_eligible} photos passed the filters (fewer than the {bestOfMeta.target_count} requested).
                </span>
              )}
          </div>
          <button
            type="button"
            onClick={() => setBestOfMeta(null)}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 shrink-0 text-xs"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

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
      ) : displayedPhotos.length === 0 && activeSubId ? (
        // Smart empty state for sub-collection tabs
        (() => {
          const allMemberIds = new Set(
            subCollectionPhotos
              .filter((sp) => sp.sub_collection_id === activeSubId)
              .map((sp) => sp.photo_id)
          )
          const totalMembers = allMemberIds.size
          const isFiltered = tierFilter !== 'all' || analyzedFilter !== 'all'
          return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {totalMembers === 0 ? (
                <>
                  <p className="text-muted-foreground text-sm font-medium">
                    No photos in this sub-collection yet.
                  </p>
                  <p className="text-muted-foreground/70 text-xs mt-1">
                    Select photos in the grid and use &ldquo;Add to…&rdquo; to add them here.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm font-medium">
                    {totalMembers} photo{totalMembers !== 1 ? 's' : ''} hidden by active filters.
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={() => { setTierFilter('all'); setAnalyzedFilter('all') }}
                      className="mt-2 text-xs text-primary underline underline-offset-2"
                    >
                      Clear filters
                    </button>
                  )}
                </>
              )}
            </div>
          )
        })()
      ) : (
        <PhotoGrid
          photos={displayedPhotos}
          multiSelect={multiSelect}
          selectedIds={selectedIds}
          analyzingIds={analyzingIds}
          scoreMap={scoreMap}
          onPhotoClick={openPhoto}
          onPhotoSelect={toggleSelect}
        />
      )}
    </div>
  )
}
