'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCollection } from '@/app/actions/collections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface NewCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COLLECTION_TYPES = [
  { value: 'nature trip', label: 'Nature Trip' },
  { value: 'city trip', label: 'City Trip' },
  { value: 'sports', label: 'Sports' },
  { value: 'social event', label: 'Social Event' },
] as const

export function NewCollectionModal({
  open,
  onOpenChange,
}: NewCollectionModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Reset error when modal opens/closes
  useEffect(() => {
    if (!open) setError(null)
  }, [open])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createCollection(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        onOpenChange(false)
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Patagonia 2024"
              required
              autoFocus
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="A short description of this collection…"
              rows={2}
              disabled={isPending}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="type" className="text-sm font-medium">
              Type
            </label>
            {/* Native select for reliable FormData integration */}
            <select
              id="type"
              name="type"
              defaultValue="nature trip"
              disabled={isPending}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-0 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {COLLECTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create collection'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
