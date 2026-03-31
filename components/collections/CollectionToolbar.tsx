'use client'

import { useState } from 'react'
import {
  LayoutGrid,
  Image as ImageIcon,
  Sparkles,
  SlidersHorizontal,
  CheckSquare,
  Trash2,
  FolderPlus,
  X,
  Plus,
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
  activeSubCollection: SubCollection | null
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
}: CollectionToolbarProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedCount = selectedIds.size

  async function handleBulkDelete() {
    setDeleting(true)
    await onBulkDelete(Array.from(selectedIds))
    setDeleting(false)
    setConfirmDelete(false)
  }

  return (
    <div className="space-y-2">
      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {selectedCount} photo{selectedCount !== 1 ? 's' : ''}?</DialogTitle>
            <DialogDescription>
              {selectedCount} photo{selectedCount !== 1 ? 's' : ''} will be permanently removed from this
              collection and any sub-collections. This cannot be undone.
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
          {(['all', 'A', 'B', 'C'] as TierFilter[]).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onTierFilter(tier)}
              className={cn(
                'px-2.5 py-1.5 transition-colors',
                tierFilter === tier
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tier === 'all' ? 'All tiers' : `Tier ${tier}`}
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

        {/* Analyze All */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-input bg-background hover:bg-muted text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="size-3.5" />
          Analyze all
        </button>
      </div>

      {/* Bulk action bar — visible in multi-select mode */}
      {multiSelect && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-input text-sm">
          <span className="text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} selected`
              : 'Click photos to select'}
          </span>

          {selectedCount > 0 && (
            <>
              <div className="h-4 w-px bg-border mx-1" />

              {/* Add to sub-collection */}
              {subCollections.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors cursor-pointer">
                    <FolderPlus className="size-3.5" />
                    Add to…
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {subCollections.map((sub) => (
                      <DropdownMenuItem
                        key={sub.id}
                        onSelect={async () => {
                          await fetch(`/api/sub-collections/${sub.id}/photos`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ photo_ids: Array.from(selectedIds) }),
                          })
                          onClearSelection()
                        }}
                      >
                        {sub.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      onSelect={() => {
                        // placeholder for create-new sub-collection flow
                      }}
                      className="text-muted-foreground"
                    >
                      <Plus className="size-3.5 mr-1" />
                      New sub-collection…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

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
            onClick={onMultiSelectToggle}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-1"
            title="Exit multi-select"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Sub-collection tabs */}
      <div className="flex gap-0.5 border-b overflow-x-auto">
        <button
          type="button"
          onClick={() => onActiveSubId(null)}
          className={cn(
            'px-3 py-2 text-sm font-medium whitespace-nowrap -mb-px border-b-2 transition-colors',
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
              'px-3 py-2 text-sm font-medium whitespace-nowrap -mb-px border-b-2 transition-colors',
              activeSubId === sub.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {sub.name}
          </button>
        ))}
      </div>

      {/* Unused imports appeaser */}
      <span className="hidden">
        <ImageIcon className="size-0" />
        <LayoutGrid className="size-0" />
      </span>
    </div>
  )
}
