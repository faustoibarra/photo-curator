'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { signInWithEmail, signUpWithEmail } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoginFormProps {
  defaultTab?: 'signin' | 'signup'
  redirectTo?: string
  authError?: string
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </Button>
  )
}

export function LoginForm({
  defaultTab = 'signin',
  redirectTo,
  authError,
}: LoginFormProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [signInState, signInAction] = useFormState(signInWithEmail, { error: '' })
  const [signUpState, signUpAction] = useFormState(signUpWithEmail, {
    error: '',
    success: false,
  })

  const oauthError =
    authError === 'auth_error'
      ? 'Authentication failed. Please try again.'
      : authError === 'missing_code'
        ? 'Invalid auth callback. Please try again.'
        : null

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const supabase = createClient()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (redirectTo) callbackUrl.searchParams.set('next', redirectTo)

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    })
    // Browser redirects — loading state stays true
  }

  return (
    <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-6 space-y-5">
      {/* Tab toggle */}
      <div className="flex rounded-lg bg-muted p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('signin')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'signin'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setTab('signup')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'signup'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Create account
        </button>
      </div>

      {/* OAuth error from URL */}
      {oauthError && <p className="text-sm text-destructive">{oauthError}</p>}

      {/* Sign-in form */}
      {tab === 'signin' && (
        <form action={signInAction} className="space-y-3">
          {signInState.error && (
            <p className="text-sm text-destructive">{signInState.error}</p>
          )}
          <div className="space-y-2">
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton>Sign in</SubmitButton>
        </form>
      )}

      {/* Sign-up form */}
      {tab === 'signup' && (
        <form action={signUpAction} className="space-y-3">
          {signUpState.error && (
            <p className="text-sm text-destructive">{signUpState.error}</p>
          )}
          {signUpState.success ? (
            <div className="rounded-lg bg-secondary p-4 text-sm text-center">
              <p className="font-medium">Check your email</p>
              <p className="text-muted-foreground mt-1">
                We sent you a confirmation link. Click it to activate your
                account.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                <Input
                  name="password"
                  type="password"
                  placeholder="Password (min. 6 characters)"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <SubmitButton>Create account</SubmitButton>
            </>
          )}
        </form>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </Button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
