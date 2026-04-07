'use client'

import { useState } from 'react'
import type { Photo, SubCollection } from '@/lib/types'
import ShareSlideshow from './ShareSlideshow'
import ShareMasonry from './ShareMasonry'
import ShareLightbox from './ShareLightbox'

interface ShareGalleryProps {
  subCollection: SubCollection
  photos: Photo[]
  featuredPhotos: Photo[]
  photographerName: string | null
}

export default function ShareGallery({
  subCollection,
  photos,
  featuredPhotos,
  photographerName,
}: ShareGalleryProps) {
  const [phase, setPhase] = useState<'slideshow' | 'grid'>(
    featuredPhotos.length > 0 ? 'slideshow' : 'grid'
  )
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {phase === 'slideshow' && featuredPhotos.length > 0 && (
        <ShareSlideshow
          photos={featuredPhotos}
          collectionName={subCollection.name}
          photographerName={photographerName}
          forceBw={subCollection.is_bw ?? false}
          onComplete={() => setPhase('grid')}
        />
      )}

      {phase === 'grid' && (
        <ShareMasonry
          subCollection={subCollection}
          photos={photos}
          photographerName={photographerName}
          forceBw={subCollection.is_bw ?? false}
          onPhotoClick={(index) => setLightboxIndex(index)}
        />
      )}

      {lightboxIndex !== null && (
        <ShareLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          allowDownloads={subCollection.share_allow_downloads ?? false}
          forceBw={subCollection.is_bw ?? false}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
