'use client'

import Link from 'next/link'
import { Camera, Image as ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CollectionWithPhotoCount } from '@/lib/types'

interface CollectionCardProps {
  collection: CollectionWithPhotoCount
}

const TYPE_LABELS: Record<string, string> = {
  trip: 'Trip',
  event: 'Event',
  project: 'Project',
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const photoCount = collection.photos?.[0]?.count ?? 0

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group block rounded-xl ring-1 ring-foreground/10 bg-card overflow-hidden hover:ring-2 hover:ring-primary transition-all"
    >
      {/* Cover image placeholder */}
      <div className="aspect-[4/3] bg-muted flex items-center justify-center relative overflow-hidden">
        <Camera className="size-10 text-muted-foreground/40" />
        {/* Cover photo will be rendered here in a future phase */}
      </div>

      {/* Card body */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {collection.name}
          </h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {collection.type ? (TYPE_LABELS[collection.type] ?? collection.type) : 'Trip'}
          </Badge>
        </div>

        {collection.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {collection.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
          <ImageIcon className="size-3" />
          <span>
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
          </span>
          <span className="mx-1">·</span>
          <span>{collection.created_at ? formatDate(collection.created_at) : ''}</span>
        </div>
      </div>
    </Link>
  )
}
