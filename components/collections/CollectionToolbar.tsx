'use client'

import { useState } from 'react'
import {
  Sparkles,
  SlidersHorizontal,
  CheckSquare,
  Trash2,
  FolderPlus,
  FolderMinus,
  X,
  Plus,
  Loader2,
  RefreshCw,
  Settings2,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubCollection } from '@/lib/types'
import type { TierFilter, AnalyzedFilter, SortOption } from '@/components/photos/CollectionView'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface CollectionToolbarProps {
  collectionId: string
  collectionName: string
  subCollections: SubCollection[]
  tierFilter: TierFilter
  onTierFilter: (v: TierFilter) => void
  analyzedFilter: AnalyzedFilter
  onAnalyzedFilter: (v: AnalyzedFilter) => void
  sortBy: SortOption
  onSortBy: (v: SortOption) => void
  activeSubId: string | null
  onActiveSubId: (id: string | null) => void
  multiSelect: boolean
  onMultiSelectToggle: () => void
  selectedIds: Set<string>
  onClearSelection: () => void
  onBulkDelete: (ids: string[]) => Promise<boolean>
  onBulkAddToSubCollection: (subId: string, photoIds: string[]) => Promise<{ added: number; error?: string }>
  onBulkRemoveFromSubCollection?: (subId: string, photoIds: string[]) => Promise<void>
  activeSubCollection: SubCollection | null
  onAnalyzeAll?: () => void
  analyzeAllRunning?: boolean
  analyzedCount?: number
  totalCount?: number
  onNewSubCollection: () => void
  onNewSubCollectionBulk: (selectedIds: string[]) => void
  onGenerateBestOf: () => void
  onRefreshBestOf?: () => void
  onShareSubCollection?: (sub: SubCollection) => void
  onBulkAnalyze: (ids: string[]) => void
  bulkAnalyzingIds?: Set<string>
  bulkNotice: { message: string; type: 'success' | 'error' } | null
  onBulkNoticeDismiss: () => void
  onBulkAddResult: (result: { added: number; error?: string }, subName: string) => void
}

const SORT_LABELS: Record<SortOption, string> = {
  upload_date: 'Upload date',
  ai_rating: 'AI rating',
  user_rating: 'Your rating',
  filename: 'Filename',
}

const ANALYZED_LABELS: Record<AnalyzedFilter, string> = {
  all: 'All photos',
  analyzed: 'Analyzed',
  unanalyzed: 'Not analyzed',
}

function SubTabLabel({ sub }: { sub: SubCollection }) {
  return (
    <span className="flex items-center gap-1.5">
      {sub.is_best_of && <Sparkles className="size-3 text-amber-500 shrink-0" />}
      {sub.color && (
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: sub.color }}
        />
      )}
      {sub.name}
    </span>
  )
}

export function CollectionToolbar({
  subCollections,
  tierFilter,
  onTierFilter,
  analyzedFilter,
  onAnalyzedFilter,
  sortBy,
  onSortBy,
  activeSubId,
  onActiveSubId,
  multiSelect,
  onMultiSelectToggle,
  selectedIds,
  onClearSelection,
  onBulkDelete,
  onBulkAddToSubCollection,
  onBulkRemoveFromSubCollection,
  onAnalyzeAll,
  analyzeAllRunning = false,
  analyzedCount = 0,
  totalCount = 0,
  onNewSubCollection,
  onNewSubCollectionBulk,
  onGenerateBestOf,
  onRefreshBestOf,
  onShareSubCollection,
  onBulkAnalyze,
  bulkAnalyzingIds,
  bulkNotice,
  onBulkNoticeDismiss,
  onBulkAddResult,
  activeSubCollection,
}: CollectionToolbarProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [bulkAddLoading, setBulkAddLoading] = useState(false)
  const [bulkRemoveLoading, setBulkRemoveLoading] = useState(false)

  const selectedCount = selectedIds.size
  const progress = totalCount > 0 ? Math.round((analyzedCount / totalCount) * 100) : 0
  const hasBestOf = subCollections.some((s) => s.is_best_of)
  const activeBestOf = activeSubCollection?.is_best_of ? activeSubCollection : null

  async function handleBulkDelete() {
    setDeleting(true)
    await onBulkDelete(Array.from(selectedIds))
    setDeleting(false)
    setConfirmDelete(false)
  }

  async function handleBulkAdd(subId: string, subName: string) {
    setBulkAddLoading(true)
    const result = await onBulkAddToSubCollection(subId, Array.from(selectedIds))
    setBulkAddLoading(false)
    onBulkAddResult(result, subName)
    if (!result.error) onClearSelection()
  }

  async function handleBulkRemove() {
    if (!activeSubId || !onBulkRemoveFromSubCollection) return
    setBulkRemoveLoading(true)
    await onBulkRemoveFromSubCollection(activeSubId, Array.from(selectedIds))
    setBulkRemoveLoading(false)
    onClearSelection()
  }

  return (
    <div className="space-y-2">
      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {selectedCount} photo{selectedCount !== 1 ? 's' : ''}?
            </DialogTitle>
            <DialogDescription>
              {selectedCount} photo{selectedCount !== 1 ? 's' : ''} will be permanently removed from
              this collection and any sub-collections. This cannot be undone.
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
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tier filter */}
        <div className="flex items-center rounded-lg border border-input overflow-hidden text-sm">
          {([
            { value: 'all', label: 'All tiers' },
            { value: 'A',   label: 'Tier A+ / A' },
            { value: 'B',   label: 'Tier B' },
            { value: 'C',   label: 'Tier C' },
          ] as { value: TierFilter; label: string }[]).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onTierFilter(value)}
              className={cn(
                'px-2.5 py-1.5 transition-colors',
                tierFilter === value
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Analyzed filter */}
        <div className="flex items-center rounded-lg border border-input overflow-hidden text-sm">
          {(['all', 'analyzed', 'unanalyzed'] as AnalyzedFilter[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onAnalyzedFilter(v)}
              className={cn(
                'px-2.5 py-1.5 transition-colors',
                analyzedFilter === v
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {ANALYZED_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <SlidersHorizontal className="size-3.5" />
          <select
            value={sortBy}
            onChange={(e) => onSortBy(e.target.value as SortOption)}
            className="border-0 bg-transparent text-sm text-foreground outline-none cursor-pointer py-1.5"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        {/* Multi-select toggle */}
        <button
          type="button"
          onClick={onMultiSelectToggle}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm font-medium transition-colors border',
            multiSelect
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted text-muted-foreground border-input'
          )}
        >
          <CheckSquare className="size-3.5" />
          Select
        </button>

        {/* Best Of button */}
        {hasBestOf && onRefreshBestOf && !activeBestOf ? null : !hasBestOf ? (
          <button
            type="button"
            onClick={onGenerateBestOf}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-sm font-medium transition-colors text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 dark:text-amber-400"
          >
            <Sparkles className="size-3.5" />
            Best Of
          </button>
        ) : null}

        {/* Analyze All Button / Progress Display */}
        {!analyzeAllRunning ? (
          <button
            type="button"
            onClick={onAnalyzeAll}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-input bg-background hover:bg-muted text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="size-3.5" />
            Analyze all
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 h-8 px-2.5 rounded-lg border border-input bg-background">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              {analyzedCount}/{totalCount}
            </span>
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground min-w-[24px]">{progress}%</span>
          </div>
        )}
      </div>

      {/* Bulk action bar — visible in multi-select mode */}
      {multiSelect && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-input text-sm">
          {bulkNotice ? (
            <span
              className={cn(
                'text-sm font-medium',
                bulkNotice.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-destructive'
              )}
            >
              {bulkNotice.type === 'success' ? '✓ ' : '✕ '}{bulkNotice.message}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {selectedCount > 0 ? `${selectedCount} selected` : 'Click photos to select'}
            </span>
          )}

          {!bulkNotice && selectedCount > 0 && (
            <>
              <div className="h-4 w-px bg-border mx-1" />

              {/* Add to sub-collection — always visible */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={bulkAddLoading}
                  className="inline-flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {bulkAddLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FolderPlus className="size-3.5" />
                  )}
                  Add to…
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {subCollections.map((sub) => (
                    <DropdownMenuItem
                      key={sub.id}
                      onClick={() => handleBulkAdd(sub.id, sub.name)}
                      className="flex items-center gap-2"
                    >
                      {sub.color && (
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                      )}
                      {sub.is_best_of && <Sparkles className="size-3 text-amber-500 shrink-0" />}
                      {sub.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={() => onNewSubCollectionBulk(Array.from(selectedIds))}
                    className="text-muted-foreground"
                  >
                    <Plus className="size-3.5 mr-1" />
                    New sub-collection…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Remove from sub-collection (only when viewing a sub-collection tab) */}
              {activeSubId && onBulkRemoveFromSubCollection && (
                <button
                  type="button"
                  onClick={handleBulkRemove}
                  disabled={bulkRemoveLoading}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {bulkRemoveLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FolderMinus className="size-3.5" />
                  )}
                  Remove from {activeSubCollection?.name ?? 'sub-collection'}
                </button>
              )}

              <div className="h-4 w-px bg-border mx-1" />

              {/* Analyze selected */}
              {(() => {
                const selectedArr = Array.from(selectedIds)
                const analyzingCount = selectedArr.filter((id) => bulkAnalyzingIds?.has(id)).length
                const isRunning = analyzingCount > 0
                return (
                  <button
                    type="button"
                    onClick={() => onBulkAnalyze(selectedArr)}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {isRunning ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    {isRunning ? `Analyzing ${analyzingCount}…` : 'Analyze'}
                  </button>
                )
              })()}

              {/* Delete selected */}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors ml-auto"
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => { onBulkNoticeDismiss(); onMultiSelectToggle() }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-auto"
            title="Exit multi-select"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Sub-collection tabs */}
      <div className="flex items-end gap-0.5 border-b overflow-x-auto">
        <button
          type="button"
          onClick={() => onActiveSubId(null)}
          className={cn(
            'px-3 py-2 text-sm font-medium whitespace-nowrap -mb-px border-b-2 transition-colors shrink-0',
            activeSubId === null
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          All photos
        </button>

        {subCollections.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => onActiveSubId(sub.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium whitespace-nowrap -mb-px border-b-2 transition-colors shrink-0',
              activeSubId === sub.id
                ? sub.is_best_of
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <SubTabLabel sub={sub} />
          </button>
        ))}

        {/* Active sub-collection actions: Share + Best Of controls */}
        {activeSubCollection && (
          <div className="flex items-center gap-1 ml-1 mb-0.5 shrink-0">
            {onShareSubCollection && (
              <button
                type="button"
                onClick={() => onShareSubCollection(activeSubCollection)}
                title="Share this sub-collection"
                className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-input"
              >
                <Share2 className="size-3" />
                Share
              </button>
            )}
            {activeBestOf && onRefreshBestOf && (
              <button
                type="button"
                onClick={onRefreshBestOf}
                title="Refresh with same config"
                className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-input"
              >
                <RefreshCw className="size-3" />
                Refresh
              </button>
            )}
            {activeBestOf && (
              <button
                type="button"
                onClick={onGenerateBestOf}
                title="Change configuration"
                className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-input"
              >
                <Settings2 className="size-3" />
                Reconfigure
              </button>
            )}
          </div>
        )}

        {/* Add new sub-collection */}
        <button
          type="button"
          onClick={onNewSubCollection}
          title="New sub-collection"
          className="ml-auto mb-0.5 shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-input"
        >
          <Plus className="size-3.5" />
          New
        </button>

        {/* Best Of button (only if none exists yet) — also in tabs area for discoverability */}
        {!hasBestOf && (
          <button
            type="button"
            onClick={onGenerateBestOf}
            title="Generate Best Of collection"
            className="mb-0.5 shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200 dark:text-amber-400 dark:hover:bg-amber-950/30"
          >
            <Sparkles className="size-3" />
            Best Of
          </button>
        )}
      </div>
    </div>
  )
}
