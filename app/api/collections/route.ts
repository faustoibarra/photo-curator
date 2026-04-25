import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('collections')
    .select('*, photos!photos_collection_id_fkey(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const collectionIds = (data ?? []).map((c) => c.id)
  const { data: tierRows } = collectionIds.length
    ? await supabase
        .from('photos')
        .select('collection_id, ai_tier')
        .in('collection_id', collectionIds)
        .not('ai_tier', 'is', null)
    : { data: [] }

  // Group tier counts by collection_id
  const tierMap: Record<string, { a: number; b: number; c: number }> = {}
  for (const row of tierRows ?? []) {
    const cid = row.collection_id as string
    if (!tierMap[cid]) tierMap[cid] = { a: 0, b: 0, c: 0 }
    const tier = (row.ai_tier as string).toLowerCase() as 'a' | 'b' | 'c'
    if (tier in tierMap[cid]) tierMap[cid][tier]++
  }

  const response = (data ?? []).map((c) => {
    const photos = c.photos as { count: number }[]
    const photoCount: number = photos?.[0]?.count ?? 0
    const tc = tierMap[c.id]
    const tierCounts = tc && (tc.a + tc.b + tc.c) > 0 ? tc : null
    const { photos: _photos, ...rest } = c // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, photoCount, tierCounts }
  })

  console.log('GET /api/collections sample:', JSON.stringify(response[0] ?? null, null, 2))

  return NextResponse.json(response)
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, type = 'nature trip' } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!['nature trip', 'city trip', 'sports', 'social event'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({ name: name.trim(), description, type, user_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
