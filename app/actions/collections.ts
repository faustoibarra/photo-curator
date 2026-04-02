'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CreateCollectionResult = { error: string } | null

export async function createCollection(
  formData: FormData
): Promise<CreateCollectionResult> {
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const type = (formData.get('type') as string) || 'nature trip'

  if (!name) return { error: 'Collection name is required.' }
  if (!['nature trip', 'city trip', 'sports', 'social event'].includes(type))
    return { error: 'Invalid collection type.' }

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('collections').insert({
    name,
    description,
    type: type as 'nature trip' | 'city trip' | 'sports' | 'social event',
    user_id: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/collections')
  return null
}
