'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Camera, LogOut, Loader2 } from 'lucide-react'

interface NavbarProps {
  userEmail?: string | null
}

export function Navbar({ userEmail }: NavbarProps) {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(() => signOut())
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/collections"
          className="flex items-center gap-2 font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          <Camera className="size-5 text-primary" />
          <span>PhotoCurator</span>
        </Link>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-48">
              {userEmail}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            disabled={isPending}
            title="Sign out"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
