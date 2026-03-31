import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'
import { Camera } from 'lucide-react'

interface LoginPageProps {
  searchParams: { tab?: string; redirectTo?: string; error?: string }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(searchParams.redirectTo ?? '/collections')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Camera className="size-6 text-primary" />
            <span className="text-xl font-semibold tracking-tight">
              PhotoCurator
            </span>
          </Link>
        </div>

        <LoginForm
          defaultTab={searchParams.tab === 'signup' ? 'signup' : 'signin'}
          redirectTo={searchParams.redirectTo}
          authError={searchParams.error}
        />
      </div>
    </div>
  )
}
