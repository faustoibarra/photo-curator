import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { filename, contentType, resolution = 'new', existingPhotoId } = await request.json()

  if (!filename || !contentType) {
    return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 })
  }
  if (!ACCEPTED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  let photoId: string
  let finalFilename: string = filename

  if (resolution === 'replace' && existingPhotoId) {
    photoId = existingPhotoId
  } else {
    photoId = randomUUID()
    if (resolution === 'keep_both') {
      const dot = filename.lastIndexOf('.')
      finalFilename =
        dot !== -1
          ? `${filename.slice(0, dot)}_2${filename.slice(dot)}`
          : `${filename}_2`
    }
  }

  const storagePath = `${user.id}/${params.id}/${photoId}_${finalFilename}`
  const thumbPath = `${user.id}/${params.id}/thumbs/${photoId}_thumb.jpg`
  const service = createServiceClient()
  const isReplace = resolution === 'replace'

  const [origResult, thumbResult] = await Promise.all([
    service.storage.from('photos').createSignedUploadUrl(storagePath, { upsert: isReplace }),
    service.storage.from('photos').createSignedUploadUrl(thumbPath, { upsert: isReplace }),
  ])

  if (origResult.error || thumbResult.error) {
    return NextResponse.json({ error: 'Failed to create upload URLs' }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = service.storage.from('photos').getPublicUrl(storagePath)

  return NextResponse.json({
    photoId,
    filename: finalFilename,
    storagePath,
    thumbPath,
    publicUrl,
    originalUploadUrl: origResult.data.signedUrl,
    thumbUploadUrl: thumbResult.data.signedUrl,
  })
}
