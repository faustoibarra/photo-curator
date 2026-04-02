import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'
import { randomUUID } from 'crypto'

// Accepted MIME types
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/heic',
  'image/webp',
])

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

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  // 'new' | 'replace' | 'keep_both'
  const resolution = (formData.get('resolution') as string) ?? 'new'
  const existingPhotoId = formData.get('existing_photo_id') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // Get image metadata and generate thumbnail with sharp
  let width: number | undefined
  let height: number | undefined
  let thumbBuffer: Buffer

  try {
    const image = sharp(fileBuffer)
    const metadata = await image.metadata()
    width = metadata.width
    height = metadata.height

    thumbBuffer = await image
      .resize(400, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'Failed to process image' }, { status: 422 })
  }

  const service = createServiceClient()

  // Determine the filename to use
  let filename = file.name
  let photoId: string

  if (resolution === 'replace' && existingPhotoId) {
    photoId = existingPhotoId

    // Fetch existing record to get old storage paths for cleanup
    const { data: existing } = await supabase
      .from('photos')
      .select('storage_path, filename')
      .eq('id', photoId)
      .single()

    if (existing) {
      // Delete old original + thumbnail from storage
      const oldThumbPath = `${user.id}/${params.id}/thumbs/${photoId}_thumb.jpg`
      await service.storage.from('photos').remove([existing.storage_path, oldThumbPath])
    }
  } else {
    photoId = randomUUID()
    if (resolution === 'keep_both') {
      // De-duplicate filename: FI207222.jpg → FI207222_2.jpg
      const dotIndex = filename.lastIndexOf('.')
      if (dotIndex !== -1) {
        filename = `${filename.slice(0, dotIndex)}_2${filename.slice(dotIndex)}`
      } else {
        filename = `${filename}_2`
      }
    }
  }

  const storagePath = `${user.id}/${params.id}/${photoId}_${filename}`
  const thumbPath = `${user.id}/${params.id}/thumbs/${photoId}_thumb.jpg`

  // Upload original to Supabase Storage
  const { error: uploadError } = await service.storage
    .from('photos')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: resolution === 'replace',
    })

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    )
  }

  // Upload thumbnail
  await service.storage.from('photos').upload(thumbPath, thumbBuffer, {
    contentType: 'image/jpeg',
    upsert: resolution === 'replace',
  })

  // Get public URLs
  const { data: { publicUrl } } = service.storage.from('photos').getPublicUrl(storagePath)

  if (resolution === 'replace' && existingPhotoId) {
    // Update existing record; preserve user_rating, user_notes, user_flagged
    const { data: photo, error: updateError } = await supabase
      .from('photos')
      .update({
        filename,
        storage_path: storagePath,
        storage_url: publicUrl,
        file_size: file.size,
        width: width ?? null,
        height: height ?? null,
        // Clear AI fields — will be re-analyzed
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

    if (updateError) {
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
    }

    revalidatePath(`/collections/${params.id}`)
    return NextResponse.json({ photo })
  }

  // Insert new photo record
  const { data: photo, error: insertError } = await supabase
    .from('photos')
    .insert({
      id: photoId,
      collection_id: params.id,
      user_id: user.id,
      filename,
      storage_path: storagePath,
      storage_url: publicUrl,
      file_size: file.size,
      width: width ?? null,
      height: height ?? null,
    })
    .select()
    .single()

  if (insertError) {
    // Clean up uploaded files on DB failure
    await service.storage.from('photos').remove([storagePath, thumbPath])
    return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })
  }

  revalidatePath(`/collections/${params.id}`)
  return NextResponse.json({ photo })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photo_ids } = await req.json() as { photo_ids: string[] }
  if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
    return NextResponse.json({ error: 'photo_ids required' }, { status: 400 })
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_path')
    .eq('collection_id', params.id)
    .eq('user_id', user.id)
    .in('id', photo_ids)

  if (photos && photos.length > 0) {
    const storagePaths = photos.flatMap((p) => {
      const thumbPath = p.storage_path.replace(/\/([^/_]+)_[^/]+$/, '/thumbs/$1_thumb.jpg')
      return [p.storage_path, thumbPath]
    })
    await serviceClient.storage.from('photos').remove(storagePaths)
  }

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('collection_id', params.id)
    .eq('user_id', user.id)
    .in('id', photo_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/collections/${params.id}`)
  return NextResponse.json({ success: true })
}
