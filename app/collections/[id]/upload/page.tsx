import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UploadZone } from '@/components/photos/UploadZone'
import { ArrowLeft } from 'lucide-react'

interface UploadPageProps {
  params: { id: string }
}

export default async function UploadPage({ params }: UploadPageProps) {
  const supabase = createClient()

  const { data: collection, error } = await supabase
    .from('collections')
    .select('id, name')
    .eq('id', params.id)
    .single()

  if (error || !collection) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <Link
          href={`/collections/${collection.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {collection.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Photos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drop your photos below. Duplicates will be flagged before upload begins.
        </p>
      </div>

      <UploadZone collectionId={collection.id} />
    </div>
  )
}
