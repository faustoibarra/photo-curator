'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import type { Photo } from '@/lib/types'

interface ShareLightboxProps {
  photos: Photo[]
  initialIndex: number
  allowDownloads: boolean
  onClose: () => void
}

export default function ShareLightbox({
  photos,
  initialIndex,
  allowDownloads,
  onClose,
}: ShareLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const photo = photos[index]

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex((i) => Math.min(photos.length - 1, i + 1)), [photos.length])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prev, next, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Prev */}
      {index > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10 p-2"
          onClick={(e) => { e.stopPropagation(); prev() }}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Next */}
      {index < photos.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10 p-2"
          onClick={(e) => { e.stopPropagation(); next() }}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Photo + caption */}
      <div
        className="flex flex-col items-center max-h-screen w-full px-16 py-10 gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.ai_title && (
          <p className="text-white/80 text-sm tracking-widest uppercase">
            {photo.ai_title}
          </p>
        )}

        <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
          <Image
            src={photo.storage_url}
            alt={photo.ai_title ?? photo.filename}
            width={photo.width ?? 1200}
            height={photo.height ?? 800}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded"
          />
        </div>

        {photo.ai_caption && (
          <p className="text-white/50 text-sm max-w-xl text-center leading-relaxed">
            {photo.ai_caption}
          </p>
        )}
      </div>

      {/* Download */}
      {allowDownloads && (
        <a
          href={photo.storage_url}
          download={photo.filename}
          className="absolute bottom-6 right-6 text-white/40 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-5 h-5" />
        </a>
      )}

      {/* Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-widest">
        {index + 1} / {photos.length}
      </div>
    </div>
  )
}
