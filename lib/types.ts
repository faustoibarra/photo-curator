import type { Database } from './supabase/types'

export type Collection = Database['public']['Tables']['collections']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type SubCollection = Database['public']['Tables']['sub_collections']['Row']
export type SubCollectionPhoto =
  Database['public']['Tables']['sub_collection_photos']['Row']

// Shape returned by: .select('*, photos(count)')
export type CollectionWithPhotoCount = Collection & {
  photos: { count: number }[] | null
}
