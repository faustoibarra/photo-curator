'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import type { Photo } from '@/lib/types'
import { resolvePhotoUrl } from '@/lib/bw-profiles'

interface ShareLightboxProps {
  photos: Photo[]
  initialIndex: number
  allowDownloads: boolean
  forceBw?: boolean
  onClose: () => void
}

export default function ShareLightbox({
  photos,
  initialIndex,
  allowDownloads,
  forceBw = false,
  onClose,
}: ShareLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [visible, setVisible] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null)

  const photo = photos[index]
  const resolved = resolvePhotoUrl(photo, forceBw)

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex((i) => Math.min(photos.length - 1, i + 1)), [photos.length])

  // Fade-in on mount and photo change
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [index])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next, onClose])

  // Lock body scroll (including iOS Safari)
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = originalOverflow }
  }, [])

  // Focus the close button on open (focus trap anchor)
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return // ignore small movements
    if (dx < 0) next()
    else prev()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 bg-zinc-950/97 flex flex-col items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
      <button
        ref={closeButtonRef}
        aria-label="Close photo viewer"
        className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10 p-3"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev */}
      {index > 0 && (
        <button
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); prev() }}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Next */}
      {index < photos.length - 1 && (
        <button
          aria-label="Next photo"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); next() }}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Photo + caption */}
      <div
        className="flex flex-col items-center max-h-screen w-full px-16 py-10 gap-4"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        {photo.ai_title && (
          <p className="text-white/80 text-xs tracking-[0.25em] uppercase font-sans">
            {photo.ai_title}
          </p>
        )}

        <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
          <Image
            src={resolved.url}
            alt={photo.ai_title ?? photo.filename}
            width={photo.width ?? 1200}
            height={photo.height ?? 800}
            className="max-h-[70vh] w-auto max-w-full object-contain"
            style={resolved.cssFilter ? { filter: resolved.cssFilter } : undefined}
            priority
          />
        </div>

        {photo.ai_caption && (
          <p className="text-white/50 text-sm max-w-xl text-center leading-relaxed font-sans">
            {photo.ai_caption}
          </p>
        )}
      </div>

      {/* Download */}
      {allowDownloads && (
        <a
          href={forceBw && photo.bw_processed_url ? photo.bw_processed_url : photo.storage_url}
          download={photo.filename}
          aria-label="Download this photo"
          className="absolute bottom-6 right-6 text-white/40 hover:text-white transition-colors p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-5 h-5" />
        </a>
      )}

      {/* Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-widest font-sans">
        {index + 1} / {photos.length}
      </div>
    </div>
  )
}
