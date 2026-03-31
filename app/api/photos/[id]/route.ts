import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

interface RouteContext {
  params: { id: string }
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

  const { data, error } = await supabase
    .from('photos')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

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

  // derive thumb path
  const thumbPath = photo.storage_path.replace(/\/([^/_]+)_[^/]+$/, '/thumbs/$1_thumb.jpg')
  await serviceClient.storage.from('photos').remove([photo.storage_path, thumbPath])

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  revalidatePath(`/collections/${photo.collection_id}`)
  return Response.json({ success: true })
}
