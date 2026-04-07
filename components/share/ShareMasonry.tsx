'use client'

import Image from 'next/image'
import { Download, Camera } from 'lucide-react'
import type { Photo, SubCollection } from '@/lib/types'
import { resolvePhotoUrl } from '@/lib/bw-profiles'

interface ShareMasonryProps {
  subCollection: SubCollection
  photos: Photo[]
  photographerName: string | null
  forceBw?: boolean
  onPhotoClick: (index: number) => void
}

export default function ShareMasonry({
  subCollection,
  photos,
  photographerName,
  forceBw = false,
  onPhotoClick,
}: ShareMasonryProps) {
  const allowDownloads = subCollection.share_allow_downloads ?? false

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="px-8 pt-20 pb-12 flex flex-col items-center text-center">
        {photographerName && (
          <p className="text-white/60 text-xs tracking-[0.3em] uppercase mb-5 font-sans">
            by {photographerName}
          </p>
        )}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-widest mb-3">
          {subCollection.name}
        </h1>
        {photos.length > 0 && (
          <p className="text-white/30 text-xs tracking-[0.25em] uppercase mt-2 mb-3 font-sans">
            {photos.length} {photos.length === 1 ? 'photograph' : 'photographs'}
          </p>
        )}
        {subCollection.description && (
          <p className="text-white/50 text-sm max-w-xl mt-2 mb-3 leading-relaxed">
            {subCollection.description}
          </p>
        )}
        {allowDownloads && (
          <a
            href={`/api/share/${subCollection.share_token}/download`}
            download
            className="mt-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white border border-white/20 hover:border-white/50 px-5 py-2.5 transition-colors font-sans tracking-wide"
          >
            <Download className="w-4 h-4" />
            Download all
          </a>
        )}
      </div>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Camera className="w-10 h-10 text-white/20" />
          <p className="text-white/40 text-sm tracking-wide font-sans">No photos have been added yet.</p>
          <p className="text-white/25 text-xs tracking-wide font-sans">Check back soon.</p>
        </div>
      )}

      {/* Masonry grid — full-bleed, no outer padding */}
      {photos.length > 0 && (
        <div style={{ columns: '3 260px', gap: '4px', padding: '0 4px 4px' }}>
          {photos.map((photo, index) => {
            const resolved = resolvePhotoUrl(photo, forceBw)
            return (
              <div
                key={photo.id}
                className="break-inside-avoid mb-1 relative group cursor-pointer overflow-hidden"
                style={{
                  animationName: 'fadeInUp',
                  animationDuration: '0.5s',
                  animationFillMode: 'both',
                  animationDelay: `${Math.min(index * 60, 800)}ms`,
                }}
                onClick={() => onPhotoClick(index)}
              >
                <Image
                  src={resolved.url}
                  alt={photo.ai_title ?? photo.filename}
                  width={photo.width ?? 800}
                  height={photo.height ?? 600}
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
                  style={resolved.cssFilter ? { filter: resolved.cssFilter } : undefined}
                  placeholder={photo.width && photo.height ? 'empty' : 'empty'}
                />
                {/* Title overlay — hover on desktop, always visible on touch/mobile */}
                {photo.ai_title && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 [@media(hover:none)]:opacity-100">
                    <span className="text-white text-xs font-light tracking-wide leading-snug font-sans line-clamp-2">
                      {photo.ai_title}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer attribution */}
      <div className="py-12 flex items-center justify-center">
        <p className="text-white/20 text-xs tracking-[0.3em] uppercase font-sans">
          curated with photocurator
        </p>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
