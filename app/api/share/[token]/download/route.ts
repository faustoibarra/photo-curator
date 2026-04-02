import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient()

  // Validate token and permissions
  const { data: subCollection } = await supabase
    .from('sub_collections')
    .select('id, name, share_enabled, share_allow_downloads')
    .eq('share_token', params.token)
    .single()

  if (!subCollection || !subCollection.share_enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!subCollection.share_allow_downloads) {
    return NextResponse.json({ error: 'Downloads not allowed' }, { status: 403 })
  }

  // Fetch photos
  const { data: rows } = await supabase
    .from('sub_collection_photos')
    .select('photos(filename, storage_url)')
    .eq('sub_collection_id', subCollection.id)

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No photos found' }, { status: 404 })
  }

  // Build ZIP
  const zip = new JSZip()
  const seenNames = new Map<string, number>()

  await Promise.all(
    rows.map(async (row) => {
      const photo = row.photos as { filename: string; storage_url: string } | null
      if (!photo) return

      const res = await fetch(photo.storage_url, { cache: 'no-store' })
      if (!res.ok) return
      const buffer = await res.arrayBuffer()

      // Deduplicate filenames
      let name = photo.filename
      const count = seenNames.get(name) ?? 0
      if (count > 0) {
        const ext = name.lastIndexOf('.')
        name = ext > -1
          ? `${name.slice(0, ext)}_${count}${name.slice(ext)}`
          : `${name}_${count}`
      }
      seenNames.set(photo.filename, count + 1)

      zip.file(name, buffer)
    })
  )

  const zipArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const safeName = subCollection.name.replace(/[^a-z0-9_\-]/gi, '_')

  return new NextResponse(zipArrayBuffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      'Content-Length': String(zipArrayBuffer.byteLength),
    },
  })
}
