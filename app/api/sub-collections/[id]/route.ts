import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: existing } = await supabase
    .from('sub_collections')
    .select('id, user_id, share_token')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowed = [
    'name', 'description', 'color',
    'share_enabled', 'share_allow_downloads', 'featured_photo_ids',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Auto-generate share_token when enabling sharing for the first time
  if (body.share_enabled === true && !existing.share_token) {
    updates.share_token = randomBytes(16).toString('hex')
    updates.share_created_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('sub_collections')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
