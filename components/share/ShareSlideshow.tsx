'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { Photo } from '@/lib/types'
import { resolvePhotoUrl } from '@/lib/bw-profiles'

interface ShareSlideshowProps {
  photos: Photo[]
  collectionName: string
  photographerName: string | null
  forceBw?: boolean
  onComplete: () => void
}

const SLIDE_DURATION = 4000
const TRANSITION_DURATION = 600

export default function ShareSlideshow({
  photos,
  collectionName,
  photographerName,
  forceBw = false,
  onComplete,
}: ShareSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  // prevIndex holds the outgoing photo during a crossfade
  const [prevIndex, setPrevIndex] = useState<number | null>(null)

  const advance = useCallback(() => {
    if (currentIndex === photos.length - 1) {
      onComplete()
      return
    }
    const nextIndex = currentIndex + 1
    // Capture outgoing photo, then immediately show incoming
    setPrevIndex(currentIndex)
    setCurrentIndex(nextIndex)
    // After the fade-out completes, remove the outgoing photo
    setTimeout(() => setPrevIndex(null), TRANSITION_DURATION)
  }, [currentIndex, photos.length, onComplete])

  useEffect(() => {
    const timer = setTimeout(advance, SLIDE_DURATION)
    return () => clearTimeout(timer)
  }, [advance])

  const currentPhoto = photos[currentIndex]
  const currentResolved = resolvePhotoUrl(currentPhoto, forceBw)

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Current photo — always fully visible underneath */}
      <div className="absolute inset-0">
        <Image
          src={currentResolved.url}
          alt={currentPhoto.ai_title ?? currentPhoto.filename}
          fill
          className="object-cover"
          priority
          style={currentResolved.cssFilter ? { filter: currentResolved.cssFilter } : undefined}
        />
      </div>

      {/* Outgoing photo — fades out on top */}
      {prevIndex !== null && (
        <div
          className="absolute inset-0"
          style={{
            opacity: 0,
            transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
            animation: `fadeOut ${TRANSITION_DURATION}ms ease-in-out forwards`,
          }}
        >
          {(() => {
            const prevResolved = resolvePhotoUrl(photos[prevIndex], forceBw)
            return (
              <Image
                src={prevResolved.url}
                alt={photos[prevIndex].ai_title ?? photos[prevIndex].filename}
                fill
                className="object-cover"
                style={prevResolved.cssFilter ? { filter: prevResolved.cssFilter } : undefined}
              />
            )
          })()}
        </div>
      )}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Collection name — centered, visible on first slide */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-1000"
        style={{ opacity: currentIndex === 0 ? 1 : 0 }}
      >
        <h1 className="text-4xl md:text-6xl font-light tracking-widest text-white text-center px-8 drop-shadow-2xl">
          {collectionName}
        </h1>
      </div>

      {/* Photographer attribution */}
      {photographerName && (
        <div className="absolute bottom-6 right-6 text-white/60 text-sm tracking-wide">
          {photographerName}
        </div>
      )}

      {/* Skip button — visible after first slide */}
      {currentIndex > 0 && (
        <button
          onClick={onComplete}
          className="absolute top-6 right-6 text-white/70 hover:text-white text-sm tracking-wide transition-colors px-3 py-1.5 border border-white/30 hover:border-white/60 rounded"
        >
          Skip
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {photos.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i === currentIndex ? 'white' : 'rgba(255,255,255,0.35)' }}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
