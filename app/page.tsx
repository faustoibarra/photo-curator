import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Camera } from 'lucide-react'

export default async function Home() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/collections')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Camera className="size-8 text-primary" />
            <span className="text-2xl font-semibold tracking-tight">
              PhotoCurator
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Curate your best work
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload photos, get AI-powered critiques, and build curated
            collections — all in one place.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-9 gap-1.5 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90"
          >
            Get started
          </Link>
          <Link
            href="/login?tab=signin"
            className="inline-flex items-center justify-center h-9 gap-1.5 px-2.5 rounded-lg border border-border bg-background text-foreground text-sm font-medium transition-colors hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
