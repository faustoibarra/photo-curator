'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { SubCollection } from '@/lib/types'

interface DownloadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subCollection: SubCollection
  photoCount: number
}

export function DownloadModal({
  open,
  onOpenChange,
  subCollection,
  photoCount,
}: DownloadModalProps) {
  const [naming, setNaming] = useState<'original' | 'prefix_sequence'>('original')
  const [prefix, setPrefix] = useState('')
  const [includeTitle, setIncludeTitle] = useState(true)
  const [includeCaption, setIncludeCaption] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectivePrefix = prefix.trim() || 'photo_'
  const exampleExt = '.jpg'
  const padLen = Math.max(3, String(photoCount).length)
  const preview = `${effectivePrefix}${'1'.padStart(padLen, '0')}${exampleExt}, ${effectivePrefix}${'2'.padStart(padLen, '0')}${exampleExt}…`

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sub-collections/${subCollection.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naming,
          prefix: naming === 'prefix_sequence' ? effectivePrefix : undefined,
          include_title: includeTitle,
          include_caption: includeCaption,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Download failed')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${subCollection.name}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onOpenChange(false)
    } catch {
      setError('Download failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Download &ldquo;{subCollection.name}&rdquo;
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({photoCount} photo{photoCount !== 1 ? 's' : ''})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* B&W notice */}
          {subCollection.is_bw && (
            <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
              ⚫ Photos will be downloaded in black &amp; white.
            </p>
          )}

          {/* File naming */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">File naming</legend>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="naming"
                value="original"
                checked={naming === 'original'}
                onChange={() => setNaming('original')}
                className="accent-primary"
              />
              <span className="text-sm">Original filename</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="naming"
                value="prefix_sequence"
                checked={naming === 'prefix_sequence'}
                onChange={() => setNaming('prefix_sequence')}
                className="accent-primary"
              />
              <span className="text-sm">Custom prefix + sequence</span>
            </label>

            {naming === 'prefix_sequence' && (
              <div className="ml-6 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label htmlFor="prefix" className="text-sm shrink-0">
                    Prefix
                  </label>
                  <Input
                    id="prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="photo_"
                    className="h-7 text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Preview: {preview}</p>
              </div>
            )}
          </fieldset>

          {/* Metadata */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Metadata</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id="include-title"
                checked={includeTitle}
                onCheckedChange={(v) => setIncludeTitle(!!v)}
              />
              <span className="text-sm">Add title to JPEG metadata</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id="include-caption"
                checked={includeCaption}
                onCheckedChange={(v) => setIncludeCaption(!!v)}
              />
              <span className="text-sm">Add caption to JPEG metadata</span>
            </label>
            {(includeTitle || includeCaption) && (
              <p className="text-xs text-muted-foreground pl-0.5">
                Written as IPTC + XMP fields compatible with SmugMug import.
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <Download className="size-4 mr-2" />
                Download ZIP
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
