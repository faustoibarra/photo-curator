import sharp from 'sharp'
import { revalidatePath } from 'next/cache'
import { inngest } from './client'
import { createServiceClient } from '@/lib/supabase/service'
import { analyzePhoto, CollectionType } from '@/lib/anthropic/analyze'

export const analyzePhotoJob = inngest.createFunction(
  {
    id: 'analyze-photo',
    triggers: [{ event: 'photo/analyze.requested' }],
    concurrency: { limit: 5 }, // stay within Anthropic rate limits
    retries: 3,
  },
  async ({ event, step }) => {
    const { photoId, collectionId, userId } = event.data

    const { photo, collectionType } = await step.run('fetch-metadata', async () => {
      const supabase = createServiceClient()
      const [photoRes, collectionRes] = await Promise.all([
        supabase.from('photos').select('*').eq('id', photoId).eq('user_id', userId).single(),
        supabase.from('collections').select('type').eq('id', collectionId).single(),
      ])
      if (photoRes.error || !photoRes.data) throw new Error(`Photo not found: ${photoId}`)
      return {
        photo: photoRes.data,
        collectionType: collectionRes.data?.type as CollectionType | undefined,
      }
    })

    // Download, resize, and call Claude in one step so the base64 payload
    // never gets serialized into Inngest's step state (free tier: 512KB limit).
    const analysis = await step.run('download-resize-analyze', async () => {
      const supabase = createServiceClient()
      const { data: blob, error } = await supabase.storage.from('photos').download(photo.storage_path)
      if (error || !blob) throw new Error(`Download failed: ${error?.message ?? 'unknown'}`)

      const buffer = Buffer.from(await blob.arrayBuffer())
      const resized = await sharp(buffer)
        .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()

      return analyzePhoto(resized.toString('base64'), collectionType)
    })

    await step.run('save-results', async () => {
      const supabase = createServiceClient()
      const { error } = await supabase
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
        .eq('user_id', userId)
      if (error) throw new Error(`DB update failed: ${error.message}`)
      try { revalidatePath(`/collections/${collectionId}`) } catch { /* no-op outside request context */ }
    })

    return { photoId, success: true }
  }
)
