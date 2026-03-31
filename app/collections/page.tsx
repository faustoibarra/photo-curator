import { createClient } from '@/lib/supabase/server'
import { CollectionGrid } from '@/components/collections/CollectionGrid'
import type { CollectionWithPhotoCount } from '@/lib/types'

export default async function CollectionsPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('collections')
    .select('*, photos!photos_collection_id_fkey(count)')
    .order('created_at', { ascending: false })

  const collections = (data ?? []) as unknown as CollectionWithPhotoCount[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <CollectionGrid collections={collections} />
    </div>
  )
}
