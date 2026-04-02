import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: { id: string }
}

interface BestOfConfig {
  target_count: number
  ai_weight: number
  user_weight: number
  exclude_tier_c: boolean
  min_ai_rating: number
  min_user_rating: number | null
  require_analyzed: boolean
  prefer_diversity: boolean
  name: string
}

type ScoredPhoto = {
  id: string
  score: number
  score_breakdown: {
    ai_contribution: number
    user_contribution: number
    ai_weight: number
    user_weight: number
  }
  ai_print_rating: number | null
  ai_tags: string[] | null
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify collection ownership
  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!collection) return Response.json({ error: 'Collection not found' }, { status: 404 })

  const body = await req.json()
  const config: BestOfConfig = {
    target_count: body.target_count ?? 20,
    ai_weight: body.ai_weight ?? 0.6,
    user_weight: body.user_weight ?? 0.4,
    exclude_tier_c: body.exclude_tier_c ?? true,
    min_ai_rating: body.min_ai_rating ?? 7.0,
    min_user_rating: body.min_user_rating ?? null,
    require_analyzed: body.require_analyzed ?? true,
    prefer_diversity: body.prefer_diversity ?? false,
    name: body.name ?? 'Best Of',
  }

  // Fetch photos
  let query = supabase
    .from('photos')
    .select('id, ai_overall_rating, ai_tier, ai_print_rating, ai_tags, user_rating, ai_analyzed_at')
    .eq('collection_id', params.id)

  if (config.require_analyzed) {
    query = query.not('ai_analyzed_at', 'is', null)
  }

  const { data: photos, error: photosError } = await query
  if (photosError) return Response.json({ error: photosError.message }, { status: 500 })
  if (!photos || photos.length === 0) {
    return Response.json({ error: 'No eligible photos found in this collection.' }, { status: 400 })
  }

  // Apply hard gates and compute composite scores
  const scored: ScoredPhoto[] = []

  for (const photo of photos) {
    if (config.exclude_tier_c && photo.ai_tier === 'C') continue
    if (photo.ai_overall_rating == null) continue
    if (photo.ai_overall_rating < config.min_ai_rating) continue
    if (
      config.min_user_rating != null &&
      (photo.user_rating == null || photo.user_rating < config.min_user_rating)
    )
      continue

    let score: number
    let ai_contribution: number
    let user_contribution: number
    let effective_ai_weight: number
    let effective_user_weight: number

    if (photo.user_rating != null) {
      const user_score = photo.user_rating * 2 // normalize 1–5 → 2–10
      ai_contribution = config.ai_weight * photo.ai_overall_rating
      user_contribution = config.user_weight * user_score
      score = ai_contribution + user_contribution
      effective_ai_weight = config.ai_weight
      effective_user_weight = config.user_weight
    } else {
      // No user rating — use AI only
      ai_contribution = photo.ai_overall_rating
      user_contribution = 0
      score = photo.ai_overall_rating
      effective_ai_weight = 1.0
      effective_user_weight = 0.0
    }

    scored.push({
      id: photo.id,
      score: parseFloat(score.toFixed(2)),
      score_breakdown: {
        ai_contribution: parseFloat(ai_contribution.toFixed(2)),
        user_contribution: parseFloat(user_contribution.toFixed(2)),
        ai_weight: effective_ai_weight,
        user_weight: effective_user_weight,
      },
      ai_print_rating: photo.ai_print_rating,
      ai_tags: photo.ai_tags,
    })
  }

  if (scored.length === 0) {
    return Response.json(
      {
        error:
          'No photos match the filter criteria. Try lowering the minimum AI rating or target count.',
      },
      { status: 400 }
    )
  }

  // Sort descending by composite score
  scored.sort((a, b) => b.score - a.score)

  // Select top N, with optional diversity dedup
  let selected: ScoredPhoto[]
  if (config.prefer_diversity) {
    selected = []
    for (const photo of scored) {
      if (selected.length >= config.target_count) break
      const isDuplicate = selected.some((s) => {
        if (Math.abs(s.score - photo.score) > 0.3) return false
        if (!s.ai_tags || !photo.ai_tags || s.ai_tags.length === 0 || photo.ai_tags.length === 0)
          return false
        const overlap = s.ai_tags.filter((t) => photo.ai_tags!.includes(t))
        return overlap.length >= 2
      })
      if (!isDuplicate) {
        selected.push(photo)
      } else {
        // Replace the similar entry if this one has a higher print rating
        const similarIdx = selected.findIndex((s) => {
          if (Math.abs(s.score - photo.score) > 0.3) return false
          if (!s.ai_tags || !photo.ai_tags) return false
          return s.ai_tags.filter((t) => photo.ai_tags!.includes(t)).length >= 2
        })
        if (
          similarIdx >= 0 &&
          (photo.ai_print_rating ?? 0) > (selected[similarIdx].ai_print_rating ?? 0)
        ) {
          selected[similarIdx] = photo
        }
      }
    }
  } else {
    selected = scored.slice(0, config.target_count)
  }

  // Find or create the Best Of sub-collection
  const { data: existing } = await supabase
    .from('sub_collections')
    .select('id')
    .eq('collection_id', params.id)
    .eq('user_id', user.id)
    .eq('is_best_of', true)
    .single()

  let subCollection
  const now = new Date().toISOString()

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('sub_collections')
      .update({
        name: config.name,
        best_of_generated_at: now,
        best_of_config: config as unknown as import('@/lib/supabase/types').Json,
        color: '#f59e0b',
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (updateError) return Response.json({ error: updateError.message }, { status: 500 })
    subCollection = updated

    // Remove previous photo memberships
    await supabase
      .from('sub_collection_photos')
      .delete()
      .eq('sub_collection_id', existing.id)
  } else {
    const { data: created, error: createError } = await supabase
      .from('sub_collections')
      .insert({
        collection_id: params.id,
        user_id: user.id,
        name: config.name,
        is_best_of: true,
        best_of_generated_at: now,
        best_of_config: config as unknown as import('@/lib/supabase/types').Json,
        color: '#f59e0b',
      })
      .select()
      .single()
    if (createError) return Response.json({ error: createError.message }, { status: 500 })
    subCollection = created
  }

  // Insert new photo memberships with scores
  const photoRows = selected.map((p) => ({
    sub_collection_id: subCollection.id,
    photo_id: p.id,
    score: p.score,
    score_breakdown: p.score_breakdown as unknown as import('@/lib/supabase/types').Json,
  }))

  const { error: insertError } = await supabase
    .from('sub_collection_photos')
    .insert(photoRows)

  if (insertError) return Response.json({ error: insertError.message }, { status: 500 })

  const totalFetched = photos.length
  const totalEligible = scored.length
  const selectedCount = selected.length
  const excludedCount = totalFetched - totalEligible

  return Response.json({
    sub_collection: subCollection,
    photos: selected.map((p) => ({
      id: p.id,
      score: p.score,
      score_breakdown: p.score_breakdown,
    })),
    meta: {
      total_in_collection: totalFetched,
      total_eligible: totalEligible,
      selected_count: selectedCount,
      excluded_count: excludedCount,
      target_count: config.target_count,
    },
  })
}
