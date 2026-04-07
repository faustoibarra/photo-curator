import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import ShareGallery from '@/components/share/ShareGallery'
import type { Photo, SubCollection } from '@/lib/types'

interface SharePageProps {
  params: { token: string }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const supabase = createServiceClient()

  const { data: subCollection } = await supabase
    .from('sub_collections')
    .select('*')
    .eq('share_token', params.token)
    .eq('share_enabled', true)
    .single()

  if (!subCollection) return { title: 'PhotoCurator' }

  const { data: photographerData } = await supabase.auth.admin.getUserById(subCollection.user_id)
  const photographer = photographerData?.user
  const photographerName =
    photographer?.user_metadata?.full_name ??
    photographer?.user_metadata?.name ??
    'Fausto Ibarra'

  const title = photographerName
    ? `${subCollection.name} — by ${photographerName}`
    : subCollection.name

  // Pick OG image: first featured photo id, else first photo in sub-collection
  const featuredIds: string[] = subCollection.featured_photo_ids ?? []
  const ogPhotoId = featuredIds[0] ?? null

  let ogImageUrl: string | undefined
  if (ogPhotoId) {
    const { data: featuredPhoto } = await supabase
      .from('photos')
      .select('storage_url')
      .eq('id', ogPhotoId)
      .single()
    ogImageUrl = featuredPhoto?.storage_url ?? undefined
  }

  if (!ogImageUrl) {
    const { data: firstRow } = await supabase
      .from('sub_collection_photos')
      .select('photos(storage_url)')
      .eq('sub_collection_id', subCollection.id)
      .limit(1)
      .single()
    const row = firstRow as { photos: { storage_url: string | null } | null } | null
    ogImageUrl = row?.photos?.storage_url ?? undefined
  }

  const description = subCollection.description ??
    `A curated photo collection${photographerName ? ` by ${photographerName}` : ''}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 800 }] } : {}),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  }
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
      photographerName="Fausto Ibarra"
    />
  )
}
