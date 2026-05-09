import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: { id: string }
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const collectionId = params.id

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: photos, error: fetchError } = await supabase
    .from('photos')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('user_id', user.id)
    .is('ai_analyzed_at', null)
    .order('uploaded_at', { ascending: false })

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 })
  }

  if (!photos || photos.length === 0) {
    return Response.json({ message: 'No unanalyzed photos', count: 0 })
  }

  await inngest.send(
    photos.map(photo => ({
      name: 'photo/analyze.requested' as const,
      data: {
        photoId: photo.id,
        collectionId,
        userId: user.id,
      },
    }))
  )

  return Response.json({
    message: 'Analysis queued',
    count: photos.length,
  })
}
