import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { collection_id, name, description, color } = await req.json()
  if (!collection_id || !name) {
    return Response.json({ error: 'collection_id and name required' }, { status: 400 })
  }

  // Verify user owns the parent collection
  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collection_id)
    .eq('user_id', user.id)
    .single()

  if (!collection) return Response.json({ error: 'Collection not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('sub_collections')
    .insert({ collection_id, user_id: user.id, name, description, color })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
