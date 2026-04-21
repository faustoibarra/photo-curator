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

  const body = await req.json()
  const naming: 'original' | 'prefix_sequence' = body.naming ?? 'original'
  const prefix: string = body.prefix ?? 'photo_'
  const includeTitle: boolean = body.include_title ?? false
  const includeCaption: boolean = body.include_caption ?? false

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

  const zip = new JSZip()
  const padLen = Math.max(3, String(photos.length).length)
  const seenNames = new Map<string, number>()

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]

    const fetchRes = await fetch(photo.storage_url, { cache: 'no-store' })
    if (!fetchRes.ok) continue

    let buffer: Buffer = Buffer.from(await fetchRes.arrayBuffer() as ArrayBuffer)
    const isJpeg = /\.(jpe?g)$/i.test(photo.filename)

    if (sub.is_bw) {
      const profileKey = photo.bw_profile ?? DEFAULT_BW_PROFILE
      const profile = BW_PROFILES[profileKey] ?? BW_PROFILES[DEFAULT_BW_PROFILE]
      const { r, g, b } = profile.sharp
      buffer = await sharp(buffer)
        .recomb([[r, g, b], [r, g, b], [r, g, b]])
        .jpeg({ quality: 95 })
        .toBuffer()
      // Output is now JPEG
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

    let filename: string
    if (naming === 'prefix_sequence') {
      const seq = String(i + 1).padStart(padLen, '0')
      const dotIdx = photo.filename.lastIndexOf('.')
      const ext = dotIdx > -1 ? photo.filename.slice(dotIdx) : '.jpg'
      filename = `${prefix}${seq}${ext}`
    } else {
      filename = photo.filename
    }

    // Deduplicate filenames
    const count = seenNames.get(filename) ?? 0
    if (count > 0) {
      const dotIdx = filename.lastIndexOf('.')
      filename =
        dotIdx > -1
          ? `${filename.slice(0, dotIdx)}_${count}${filename.slice(dotIdx)}`
          : `${filename}_${count}`
    }
    seenNames.set(filename, count + 1)

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
