'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CollectionCard } from './CollectionCard'
import { NewCollectionModal } from './NewCollectionModal'
import { FolderOpen, Plus } from 'lucide-react'
import type { CollectionWithPhotoCount } from '@/lib/types'

interface CollectionGridProps {
  collections: CollectionWithPhotoCount[]
}

export function CollectionGrid({ collections }: CollectionGridProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {collections.length === 0
              ? 'No collections yet'
              : `${collections.length} collection${collections.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          New collection
        </Button>
      </div>

      {/* Grid or empty state */}
      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <FolderOpen className="size-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No collections yet</h2>
          <p className="text-muted-foreground mt-1 mb-6 max-w-sm">
            Create your first collection to start organizing and curating your
            photos.
          </p>
          <Button onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Create collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}

      <NewCollectionModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
