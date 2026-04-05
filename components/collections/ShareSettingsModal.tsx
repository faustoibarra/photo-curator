'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Link, Download, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Photo, SubCollection } from '@/lib/types'

interface ShareSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subCollection: SubCollection
  photos: Photo[]
  appUrl: string
  onUpdated: (updated: SubCollection) => void
}

export function ShareSettingsModal({
  open,
  onOpenChange,
  subCollection,
  photos,
  appUrl,
  onUpdated,
}: ShareSettingsModalProps) {
  const [shareEnabled, setShareEnabled] = useState(subCollection.share_enabled ?? false)
  const [allowDownloads, setAllowDownloads] = useState(subCollection.share_allow_downloads ?? false)
  const photoIds = new Set(photos.map((p) => p.id))
  const [featuredIds, setFeaturedIds] = useState<string[]>(
    (subCollection.featured_photo_ids ?? []).filter((id) => photoIds.has(id))
  )
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Sync if subCollection changes externally, filtering out stale IDs
  useEffect(() => {
    const currentPhotoIds = new Set(photos.map((p) => p.id))
    setShareEnabled(subCollection.share_enabled ?? false)
    setAllowDownloads(subCollection.share_allow_downloads ?? false)
    setFeaturedIds((subCollection.featured_photo_ids ?? []).filter((id) => currentPhotoIds.has(id)))
  }, [subCollection, photos])

  const shareUrl = subCollection.share_token
    ? `${appUrl}/share/${subCollection.share_token}`
    : null

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/sub-collections/${subCollection.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        share_enabled: shareEnabled,
        share_allow_downloads: allowDownloads,
        featured_photo_ids: featuredIds,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      onUpdated(updated)
      onOpenChange(false)
    }
  }

  function toggleFeatured(id: string) {
    setFeaturedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) return prev // max 5
      return [...prev, id]
    })
  }

  function moveFeatured(from: number, to: number) {
    setFeaturedIds((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{subCollection.name}&rdquo;</DialogTitle>
          <DialogDescription>
            Configure a public gallery link for this sub-collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Enable sharing toggle */}
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium">Enable sharing</p>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view this gallery
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={shareEnabled}
              onClick={() => setShareEnabled((v) => !v)}
              className={`relative inline-flex shrink-0 h-6 w-11 items-center rounded-full transition-colors ${
                shareEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  shareEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>

          {/* Allow downloads toggle */}
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Download className="size-3.5 text-muted-foreground" />
                Allow downloads
              </p>
              <p className="text-xs text-muted-foreground">
                Viewers can download individual photos and the full gallery as a ZIP
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={allowDownloads}
              onClick={() => setAllowDownloads((v) => !v)}
              className={`relative inline-flex shrink-0 h-6 w-11 items-center rounded-full transition-colors ${
                allowDownloads ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                  allowDownloads ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>

          {/* Featured photos picker */}
          <div>
            <p className="text-sm font-medium mb-1">Slideshow photos</p>
            <p className="text-xs text-muted-foreground mb-3">
              Pick up to 5 photos to feature in the opening slideshow. Click to select, use arrows to reorder.
            </p>

            {/* Selected order */}
            {featuredIds.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {featuredIds.map((id, i) => {
                  const photo = photos.find((p) => p.id === id)
                  if (!photo) return null
                  return (
                    <div key={id} className="relative group">
                      <div className="w-16 h-16 rounded overflow-hidden border-2 border-primary">
                        <Image
                          src={photo.storage_url}
                          alt={photo.ai_title ?? photo.filename}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="absolute top-0.5 left-0.5 text-[10px] font-bold text-white bg-black/60 rounded px-1">
                        {i + 1}
                      </span>
                      {/* Move left/right buttons */}
                      <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveFeatured(i, i - 1) }}
                            className="text-white bg-black/60 rounded text-[10px] px-1"
                          >
                            ←
                          </button>
                        )}
                        {i < featuredIds.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveFeatured(i, i + 1) }}
                            className="text-white bg-black/60 rounded text-[10px] px-1"
                          >
                            →
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleFeatured(id) }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Photo grid picker */}
            <div className="grid grid-cols-5 gap-1.5 max-h-52 overflow-y-auto rounded border border-input p-1.5">
              {photos.map((photo) => {
                const selected = featuredIds.includes(photo.id)
                const position = featuredIds.indexOf(photo.id)
                const disabled = !selected && featuredIds.length >= 5
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => !disabled && toggleFeatured(photo.id)}
                    disabled={disabled}
                    className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                      selected
                        ? 'border-primary'
                        : disabled
                        ? 'border-transparent opacity-40 cursor-not-allowed'
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                  >
                    <Image
                      src={photo.storage_url}
                      alt={photo.ai_title ?? photo.filename}
                      fill
                      className="object-cover"
                    />
                    {selected && (
                      <span className="absolute top-0.5 left-0.5 text-[9px] font-bold text-white bg-primary rounded px-0.5">
                        {position + 1}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Share link */}
          {shareEnabled && (
            <div>
              <p className="text-sm font-medium mb-1.5">Share link</p>
              {shareUrl ? (
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs border border-input rounded px-2.5 py-2 bg-muted text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded border border-input bg-background hover:bg-muted transition-colors"
                  >
                    {copied ? <Check className="size-3.5 text-green-600" /> : <Link className="size-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Save to generate your share link.</p>
              )}
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
