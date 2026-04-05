import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const {
    photoId,
    filename,
    storagePath,
    thumbPath,
    publicUrl,
    width,
    height,
    fileSize,
    resolution = 'new',
    existingPhotoId,
  } = await request.json()

  const service = createServiceClient()

  if (resolution === 'replace' && existingPhotoId) {
    // Fetch existing record to clean up old original if the path changed
    const { data: existing } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('id', existingPhotoId)
      .single()

    if (existing && existing.storage_path !== storagePath) {
      await service.storage.from('photos').remove([existing.storage_path])
    }

    const { data: photo, error: updateError } = await supabase
      .from('photos')
      .update({
        filename,
        storage_path: storagePath,
        storage_url: publicUrl,
        file_size: fileSize,
        width: width ?? null,
        height: height ?? null,
        ai_analyzed_at: null,
        ai_overall_rating: null,
        ai_technical_rating: null,
        ai_composition_rating: null,
        ai_light_rating: null,
        ai_impact_rating: null,
        ai_print_rating: null,
        ai_bw_rating: null,
        ai_tier: null,
        ai_title: null,
        ai_caption: null,
        ai_critique: null,
        ai_crop_suggestion: null,
        ai_bw_rationale: null,
        ai_tags: null,
      })
      .eq('id', existingPhotoId)
      .select()
      .single()

    if (updateError) return NextResponse.json({ error: 'DB update failed' }, { status: 500 })

    revalidatePath(`/collections/${params.id}`)
    return NextResponse.json({ photo })
  }

  const { data: photo, error: insertError } = await supabase
    .from('photos')
    .insert({
      id: photoId,
      collection_id: params.id,
      user_id: user.id,
      filename,
      storage_path: storagePath,
      storage_url: publicUrl,
      file_size: fileSize,
      width: width ?? null,
      height: height ?? null,
    })
    .select()
    .single()

  if (insertError) {
    await service.storage.from('photos').remove([storagePath, thumbPath])
    return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
  }

  revalidatePath(`/collections/${params.id}`)
  return NextResponse.json({ photo })
}
