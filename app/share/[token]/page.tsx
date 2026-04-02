import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import ShareGallery from '@/components/share/ShareGallery'
import type { Photo, SubCollection } from '@/lib/types'

interface SharePageProps {
  params: { token: string }
}

export default async function SharePage({ params }: SharePageProps) {
  noStore()
  const supabase = createServiceClient()

  // Fetch sub-collection by share token
  const { data: subCollection } = await supabase
    .from('sub_collections')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()

  if (!subCollection) {
    notFound()
  }

  // Fetch photos in this sub-collection
  const { data: photos } = await supabase
    .from('sub_collection_photos')
    .select('photo_id, photos(*)')
    .eq('sub_collection_id', subCollection.id)

  // Fetch photographer display name from auth
  const { data: { user: photographer } } = await supabase.auth.admin.getUserById(
    subCollection.user_id
  )

  const allPhotos: Photo[] = (photos ?? [])
    .map((row: { photo_id: string; photos: Photo | null }) => row.photos)
    .filter((p): p is Photo => p !== null)

  const featuredIds: string[] = subCollection.featured_photo_ids ?? []
  const featuredPhotos: Photo[] = featuredIds
    .map((id) => allPhotos.find((p) => p.id === id))
    .filter((p): p is Photo => p !== undefined)

  return (
    <ShareGallery
      subCollection={subCollection as SubCollection}
      photos={allPhotos}
      featuredPhotos={featuredPhotos}
      photographerName={
        photographer?.user_metadata?.full_name ??
        photographer?.user_metadata?.name ??
        photographer?.email?.split('@')[0] ??
        null
      }
    />
  )
}
