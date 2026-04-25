import { NextRequest } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { analyzePhoto, CollectionType } from '@/lib/anthropic/analyze'
import { BW_PROFILES, DEFAULT_BW_PROFILE } from '@/lib/bw-profiles'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: photo } = await supabase
    .from('photos')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!photo) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(photo)
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const serviceClient = createServiceClient()
  const startTime = Date.now()
  const photoId = params.id

  console.log(`[Analysis] 🔄 Starting analysis for photo ${photoId}`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error(`[Analysis] ✗ Unauthorized for photo ${photoId}`)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: photo } = await supabase
    .from('photos')
    .select('*')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single()

  if (!photo) {
    console.error(`[Analysis] ✗ Photo not found: ${photoId}`)
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: collection } = await supabase
    .from('collections')
    .select('type')
    .eq('id', photo.collection_id)
    .single()

  const collectionType = collection?.type as CollectionType | undefined

  try {
    console.log(`[Analysis] 📥 Downloading photo ${photoId}`)
    const { data: blob, error: downloadError } = await serviceClient.storage
      .from('photos')
      .download(photo.storage_path)

    if (downloadError || !blob) {
      throw new Error(`Failed to download: ${downloadError?.message || 'unknown'}`)
    }

    const imageBuffer = Buffer.from(await blob.arrayBuffer())
    console.log(`[Analysis] 📥 Downloaded ${imageBuffer.byteLength} bytes`)

    console.log(`[Analysis] 📐 Resizing photo ${photoId}`)
    const resized = await sharp(imageBuffer)
      .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    const base64 = resized.toString('base64')

    console.log(`[Analysis] 🤖 Calling Claude API for photo ${photoId} (${base64.length} chars)`)
    const apiStart = Date.now()
    const analysis = await analyzePhoto(base64, collectionType)
    console.log(`[Analysis] ✓ Claude API done in ${Date.now() - apiStart}ms`)

    console.log(`[Analysis] 💾 Storing results for photo ${photoId}`)
    const { data: updated, error: updateError } = await supabase
      .from('photos')
      .update({
        ai_title: analysis.title,
        ai_caption: analysis.caption,
        ai_overall_rating: analysis.overall_rating,
        ai_technical_rating: analysis.technical_rating,
        ai_composition_rating: analysis.composition_rating,
        ai_light_rating: analysis.light_rating,
        ai_impact_rating: analysis.impact_rating,
        ai_print_rating: analysis.print_rating,
        ai_bw_rating: analysis.bw_rating,
        ai_tier: analysis.tier,
        ai_critique: analysis.critique,
        ai_crop_suggestion: analysis.crop_suggestion,
        ai_bw_rationale: analysis.bw_rationale,
        ai_tags: analysis.tags,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq('id', photoId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`)

    console.log(`[Analysis] ✅ Photo ${photoId} done in ${Date.now() - startTime}ms`)
    if (updated?.collection_id) revalidatePath(`/collections/${updated.collection_id}`)
    return Response.json(updated)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Analysis] ✗ Photo ${photoId} failed after ${Date.now() - startTime}ms: ${message}`)
    const isBilling = /credit balance|billing|quota|payment/i.test(message)
    return Response.json({ error: message, billing: isBilling }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.user_rating !== undefined) updates.user_rating = body.user_rating
  if (body.user_notes !== undefined) updates.user_notes = body.user_notes
  if (body.user_flagged !== undefined) updates.user_flagged = body.user_flagged
  if (body.bw_profile !== undefined) {
    updates.bw_profile = body.bw_profile
    if (body.bw_profile === null) {
      updates.bw_processed_url = null
    }
  }

  const { data, error } = await supabase
    .from('photos')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Pre-generate B&W file when a profile is saved
  if (body.bw_profile && data) {
    try {
      const serviceClient = createServiceClient()
      const profileKey = body.bw_profile as string
      const profile = BW_PROFILES[profileKey] ?? BW_PROFILES[DEFAULT_BW_PROFILE]

      const { data: blob, error: dlErr } = await serviceClient.storage
        .from('photos')
        .download(data.storage_path)

      if (!dlErr && blob) {
        const buffer = Buffer.from(await blob.arrayBuffer())
        const { r, g, b } = profile.sharp
        const processed = await sharp(buffer)
          .recomb([
            [r, g, b],
            [r, g, b],
            [r, g, b],
          ])
          .jpeg({ quality: 88 })
          .toBuffer()

        const bwPath = `bw/${params.id}/${profileKey}.jpg`
        await serviceClient.storage.from('photos').upload(bwPath, processed, {
          contentType: 'image/jpeg',
          upsert: true,
        })

        const { data: urlData } = serviceClient.storage.from('photos').getPublicUrl(bwPath)
        const bwUrl = urlData.publicUrl

        const { data: updated } = await supabase
          .from('photos')
          .update({ bw_processed_url: bwUrl })
          .eq('id', params.id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (data?.collection_id) revalidatePath(`/collections/${data.collection_id}`)
        return Response.json(updated ?? data)
      }
    } catch (err) {
      console.error('[BW] Pre-generation failed:', err)
      // Return the already-saved row without bw_processed_url — not fatal
    }
  }

  // revalidate collection page so server data stays fresh on next load
  if (data?.collection_id) {
    revalidatePath(`/collections/${data.collection_id}`)
  }

  return Response.json(data)
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const serviceClient = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: photo } = await supabase
    .from('photos')
    .select('storage_path, collection_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!photo) return Response.json({ error: 'Not found' }, { status: 404 })

  // Check if this photo is the collection cover before deleting
  const { data: collection } = await supabase
    .from('collections')
    .select('cover_photo_id')
    .eq('id', photo.collection_id)
    .single()
  const wasCover = collection?.cover_photo_id === params.id

  // Delete storage files (original + thumbnail)
  const thumbPath = photo.storage_path.replace(/\/([^/_]+)_[^/]+$/, '/thumbs/$1_thumb.jpg')
  await serviceClient.storage.from('photos').remove([photo.storage_path, thumbPath])

  // Delete DB record — ON DELETE CASCADE removes sub_collection_photos rows;
  // ON DELETE SET NULL on collections.cover_photo_id nulls the cover reference.
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // If this was the cover photo, promote the most-recently-uploaded remaining photo
  if (wasCover) {
    const { data: next } = await supabase
      .from('photos')
      .select('id')
      .eq('collection_id', photo.collection_id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single()

    await supabase
      .from('collections')
      .update({ cover_photo_id: next?.id ?? null })
      .eq('id', photo.collection_id)
  }

  revalidatePath(`/collections/${photo.collection_id}`)
  return Response.json({ success: true })
}
