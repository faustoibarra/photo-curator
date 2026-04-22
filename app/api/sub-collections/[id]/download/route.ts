import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { BW_PROFILES, DEFAULT_BW_PROFILE } from '@/lib/bw-profiles'
import { injectJpegMetadata } from '@/lib/download/metadata'

interface PhotoRow {
  id: string
  filename: string
  storage_url: string
  bw_profile: string | null
  ai_title: string | null
  ai_caption: string | null
  sort_order: number | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sub } = await supabase
    .from('sub_collections')
    .select('id, name, is_bw, user_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const naming: 'original' | 'prefix_sequence' =
    body.naming === 'prefix_sequence' ? 'prefix_sequence' : 'original'
  const prefix: string =
    typeof body.prefix === 'string' ? body.prefix : 'photo_'
  const includeTitle: boolean = body.include_title === true
  const includeCaption: boolean = body.include_caption === true

  const { data: rows } = await supabase
    .from('sub_collection_photos')
    .select(
      'photos(id, filename, storage_url, bw_profile, ai_title, ai_caption, sort_order)'
    )
    .eq('sub_collection_id', sub.id)

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No photos found' }, { status: 404 })
  }

  const photos = (rows.map((r) => r.photos) as (PhotoRow | null)[])
    .filter((p): p is PhotoRow => p !== null)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const padLen = Math.max(3, String(photos.length).length)
  // Track original (pre-dedup) names to correctly count duplicates
  const seenOriginal = new Map<string, number>()
  const zip = new JSZip()

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]

    // --- Compute filename ---
    let filename: string
    if (naming === 'prefix_sequence') {
      const seq = String(i + 1).padStart(padLen, '0')
      const dotIdx = photo.filename.lastIndexOf('.')
      const ext = dotIdx > -1 ? photo.filename.slice(dotIdx) : '.jpg'
      filename = `${prefix}${seq}${ext}`
    } else {
      filename = photo.filename.replace(/.*[/\\]/, '') // strip any path prefix
    }

    // Deduplicate: track by the original computed name
    const count = seenOriginal.get(filename) ?? 0
    seenOriginal.set(filename, count + 1)
    if (count > 0) {
      const dotIdx = filename.lastIndexOf('.')
      filename =
        dotIdx > -1
          ? `${filename.slice(0, dotIdx)}_${count}${filename.slice(dotIdx)}`
          : `${filename}_${count}`
    }

    // --- Fetch photo ---
    const fetchRes = await fetch(photo.storage_url, { cache: 'no-store' })
    if (!fetchRes.ok) continue

    let buffer: Buffer = Buffer.from(await fetchRes.arrayBuffer() as ArrayBuffer)

    // Detect JPEG by magic bytes (FF D8), not filename extension
    const isJpeg = buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8

    // --- B&W conversion ---
    if (sub.is_bw) {
      const profileKey = photo.bw_profile ?? DEFAULT_BW_PROFILE
      const profile = BW_PROFILES[profileKey] ?? BW_PROFILES[DEFAULT_BW_PROFILE]
      const { r, g, b } = profile.sharp
      buffer = await sharp(buffer)
        .recomb([[r, g, b], [r, g, b], [r, g, b]])
        .jpeg({ quality: 95 })
        .toBuffer()
      // Output is JPEG after sharp conversion
      if (includeTitle || includeCaption) {
        buffer = injectJpegMetadata(
          buffer,
          includeTitle ? photo.ai_title : null,
          includeCaption ? photo.ai_caption : null
        )
      }
    } else if (isJpeg && (includeTitle || includeCaption)) {
      buffer = injectJpegMetadata(
        buffer,
        includeTitle ? photo.ai_title : null,
        includeCaption ? photo.ai_caption : null
      )
    }

    zip.file(filename, buffer)
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const safeName = sub.name.replace(/[^a-z0-9_\-]/gi, '_')

  return new NextResponse(zipBuffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      'Content-Length': String(zipBuffer.byteLength),
    },
  })
}
