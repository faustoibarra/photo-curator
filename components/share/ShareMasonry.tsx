'use client'

import Image from 'next/image'
import { Download } from 'lucide-react'
import type { Photo, SubCollection } from '@/lib/types'

interface ShareMasonryProps {
  subCollection: SubCollection
  photos: Photo[]
  photographerName: string | null
  onPhotoClick: (index: number) => void
}

export default function ShareMasonry({
  subCollection,
  photos,
  photographerName,
  onPhotoClick,
}: ShareMasonryProps) {
  const allowDownloads = subCollection.share_allow_downloads ?? false

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-8 pt-16 pb-10 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl font-light tracking-widest mb-3">
          {subCollection.name}
        </h1>
        {subCollection.description && (
          <p className="text-white/50 text-base max-w-xl mb-3">{subCollection.description}</p>
        )}
        {photographerName && (
          <p className="text-white/40 text-sm tracking-wide">{photographerName}</p>
        )}
        {allowDownloads && (
          <a
            href={`/api/share/${subCollection.share_token}/download`}
            download
            className="mt-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white border border-white/20 hover:border-white/50 px-4 py-2 rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            Download all photos
          </a>
        )}
      </div>

      {/* Masonry grid */}
      <div className="px-4 pb-16" style={{ columns: '3 280px', gap: '8px' }}>
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="break-inside-avoid mb-2 relative group cursor-pointer overflow-hidden rounded"
            style={{
              animationName: 'fadeInUp',
              animationDuration: '0.5s',
              animationFillMode: 'both',
              animationDelay: `${Math.min(index * 60, 800)}ms`,
            }}
            onClick={() => onPhotoClick(index)}
          >
            <Image
              src={photo.storage_url}
              alt={photo.ai_title ?? photo.filename}
              width={photo.width ?? 800}
              height={photo.height ?? 600}
              className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
            />
            {/* Title overlay on hover */}
            {photo.ai_title && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <span className="text-white text-sm font-light tracking-wide leading-snug">
                  {photo.ai_title}
                </span>
              </div>
            )}
          </div>
        ))}
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
