import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Allow up to 5 min for parallel batch analysis

interface RouteContext {
  params: { id: string }
}

async function analyzePhotoInternal(
  photoId: string,
  auth: { cookie: string; authorization: string }
): Promise<{ photoId: string; success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const url = `${baseUrl}/api/photos/${photoId}`

  console.log(`[Queue] → Triggering analysis for photo ${photoId}`)

  // Forward whichever auth scheme the caller used: cookie (web) or Bearer (iOS).
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth.cookie) headers['Cookie'] = auth.cookie
  if (auth.authorization) headers['Authorization'] = auth.authorization

  try {
    const res = await fetch(url, { method: 'POST', headers })

    if (!res.ok) {
      const text = await res.text()
      let errorMsg = text
      try {
        const json = JSON.parse(text)
        errorMsg = json.error || text
      } catch {
        // keep text as is
      }
      console.error(`[Queue] ✗ Failed for ${photoId}: ${res.status} - ${errorMsg}`)
      return { photoId, success: false, error: errorMsg }
    }

    console.log(`[Queue] ✓ Completed for ${photoId}`)
    return { photoId, success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[Queue] ✗ Request failed for ${photoId}: ${message}`)
    return { photoId, success: false, error: message }
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const supabase = createClient()
  const collectionId = params.id

  console.log(`[Queue] Starting analyze-all for collection ${collectionId}`)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    console.error(`[Queue] Unauthorized`)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Capture caller auth so background sub-requests carry the same identity.
  // Web sends a session cookie; iOS sends a Bearer JWT in Authorization.
  const auth = {
    cookie: req.headers.get('cookie') || '',
    authorization: req.headers.get('authorization') || '',
  }
  console.log(`[Queue] Auth: cookie=${!!auth.cookie} bearer=${!!auth.authorization}`)

  // Get all unanalyzed photos in collection
  console.log(`[Queue] Fetching unanalyzed photos for collection ${collectionId}`)
  const { data: photos, error: fetchError } = await supabase
    .from('photos')
    .select('id, filename')
    .eq('collection_id', collectionId)
    .eq('user_id', user.id)
    .is('ai_analyzed_at', null)
    .order('uploaded_at', { ascending: false })

  if (fetchError) {
    console.error(`[Queue] Failed to fetch photos: ${fetchError.message}`)
    return Response.json({ error: fetchError.message }, { status: 500 })
  }

  if (!photos || photos.length === 0) {
    console.log(`[Queue] No unanalyzed photos found`)
    return Response.json({ message: 'No unanalyzed photos', count: 0 })
  }

  console.log(`[Queue] Found ${photos.length} unanalyzed photos, starting parallel analysis`)

  const results = await Promise.allSettled(
    photos.map(photo => analyzePhotoInternal(photo.id, auth))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results.length - succeeded

  console.log(`[Queue] ✅ Batch complete: ${succeeded} succeeded, ${failed} failed`)

  return Response.json({
    message: 'Analysis complete',
    count: photos.length,
    succeeded,
    failed,
  })
}
