import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { photo_ids } = await req.json() as { photo_ids: string[] }

  // Verify user owns this sub-collection
  const { data: sub } = await supabase
    .from('sub_collections')
    .select('id, collection_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!sub) return Response.json({ error: 'Not found' }, { status: 404 })

  const rows = photo_ids.map((pid) => ({
    sub_collection_id: params.id,
    photo_id: pid,
  }))

  // Use upsert with ignoreDuplicates: true — generates ON CONFLICT DO NOTHING.
  // This skips photos already in the sub-collection without needing an UPDATE RLS policy.
  // Plain upsert (ON CONFLICT DO UPDATE) silently fails when there is no UPDATE RLS policy.
  const { data: inserted, error } = await supabase
    .from('sub_collection_photos')
    .upsert(rows, { ignoreDuplicates: true, onConflict: 'sub_collection_id,photo_id' })
    .select('photo_id')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true, added: inserted?.length ?? rows.length })
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { photo_ids } = await req.json() as { photo_ids: string[] }

  // Verify user owns this sub-collection
  const { data: sub } = await supabase
    .from('sub_collections')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!sub) return Response.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('sub_collection_photos')
    .delete()
    .eq('sub_collection_id', params.id)
    .in('photo_id', photo_ids)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
