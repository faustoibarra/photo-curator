import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { filenames } = body as { filenames: string[] }

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return NextResponse.json({ duplicates: [] })
  }

  // Verify user owns this collection
  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!collection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Find existing photos with matching filenames in this collection
  const { data: existing } = await supabase
    .from('photos')
    .select('id, filename, storage_url, uploaded_at, ai_overall_rating')
    .eq('collection_id', params.id)
    .in('filename', filenames)

  if (!existing || existing.length === 0) {
    return NextResponse.json({ duplicates: [] })
  }

  // Build thumbnail URLs from storage_url by deriving the thumb path
  const duplicates = existing.map((photo) => {
    // Thumbnail URL: replace /photos/{uid}/{cid}/{pid}_{name} with /photos/{uid}/{cid}/thumbs/{pid}_thumb.jpg
    const thumbUrl = photo.storage_url.replace(
      /\/([^/_]+)_[^/]+$/,
      '/thumbs/$1_thumb.jpg'
    )
    return {
      filename: photo.filename,
      existing_photo_id: photo.id,
      thumbnail_url: thumbUrl,
      uploaded_at: photo.uploaded_at,
      ai_overall_rating: photo.ai_overall_rating,
    }
  })

  return NextResponse.json({ duplicates })
}
