import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { analyzePhoto, CollectionType } from '@/lib/anthropic/analyze'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/tiff']
const VALID_COLLECTION_TYPES: CollectionType[] = ['nature trip', 'city trip', 'sports', 'social event']

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const collectionTypeParam = formData.get('collection_type') as string | null
  const collectionType: CollectionType =
    collectionTypeParam && VALID_COLLECTION_TYPES.includes(collectionTypeParam as CollectionType)
      ? (collectionTypeParam as CollectionType)
      : 'nature trip'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!VALID_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const resizedBuffer = await sharp(buffer)
    .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()

  const imageBase64 = resizedBuffer.toString('base64')

  try {
    const result = await analyzePhoto(imageBase64, collectionType)
    return NextResponse.json(result)
  } catch (err) {
    const error = err as Error
    const isBilling =
      error.message?.includes('credit') || error.message?.includes('billing')
    return NextResponse.json({ error: error.message, billing: isBilling }, { status: 500 })
  }
}
