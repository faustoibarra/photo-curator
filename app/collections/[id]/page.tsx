import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CollectionView } from '@/components/photos/CollectionView'
import { CollectionDropZone } from '@/components/photos/CollectionDropZone'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Upload, Camera } from 'lucide-react'

interface CollectionPageProps {
  params: { id: string }
}

const TYPE_LABELS: Record<string, string> = {
  trip: 'Trip',
  event: 'Event',
  project: 'Project',
}

const btnClass =
  'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90'

export default async function CollectionPage({ params }: CollectionPageProps) {
  const supabase = createClient()

  const { data: collection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !collection) {
    notFound()
  }

  const [{ data: photos }, { data: subCollections }] = await Promise.all([
    supabase
      .from('photos')
      .select('*')
      .eq('collection_id', params.id)
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('sub_collections')
      .select('*')
      .eq('collection_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  const photoList = photos ?? []
  const subCollectionList = subCollections ?? []

  // Fetch sub_collection_photos for all sub-collections in this collection
  let subCollectionPhotos: import('@/lib/types').SubCollectionPhoto[] = []
  if (subCollectionList.length > 0) {
    const { data: scp } = await supabase
      .from('sub_collection_photos')
      .select('*')
      .in(
        'sub_collection_id',
        subCollectionList.map((s) => s.id)
      )
    subCollectionPhotos = scp ?? []
  }

  return (
    <CollectionDropZone collectionId={collection.id}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <div>
          <Link
            href="/collections"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Collections
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {collection.name}
              </h1>
              <Badge variant="secondary">
                {collection.type
                  ? (TYPE_LABELS[collection.type] ?? collection.type)
                  : 'Trip'}
              </Badge>
              {photoList.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {photoList.length} photo{photoList.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {collection.description && (
              <p className="text-muted-foreground text-sm">{collection.description}</p>
            )}
          </div>

          <Link href={`/collections/${collection.id}/upload`} className={btnClass + ' shrink-0'}>
            <Upload className="size-4" />
            Upload photos
          </Link>
        </div>

        {/* Toolbar + Grid or empty state */}
        {photoList.length > 0 ? (
          <CollectionView
            initialPhotos={photoList}
            subCollections={subCollectionList}
            subCollectionPhotos={subCollectionPhotos}
            collectionId={collection.id}
            collectionName={collection.name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-muted p-8 mb-5">
              <Camera className="size-12 text-muted-foreground/40" />
            </div>
            <h2 className="text-lg font-semibold">No photos yet</h2>
            <p className="text-muted-foreground mt-1.5 mb-6 max-w-sm text-sm">
              Upload your first photos to start building this collection. After upload, AI will
              analyze each photo and provide ratings and critiques.
            </p>
            <Link href={`/collections/${collection.id}/upload`} className={btnClass}>
              <Upload className="size-4" />
              Upload photos
            </Link>
          </div>
        )}
      </div>
    </CollectionDropZone>
  )
}
