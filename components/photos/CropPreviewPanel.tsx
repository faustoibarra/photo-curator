'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Unlock, RotateCcw, Download } from 'lucide-react'
import type { ReactCropperElement } from 'react-cropper'
import type { Photo } from '@/lib/types'
import 'cropperjs/dist/cropper.css'

// react-cropper is browser-only; SSR would fail without this
const Cropper = dynamic(() => import('react-cropper').then(m => m.default), { ssr: false })

export interface CropCoords {
  x: number
  y: number
  width: number
  height: number
}

// The Photo type from generated Supabase types won't include new columns until
// `npx supabase gen types typescript --local > lib/supabase/types.ts` is run after migration.
// We extend it here with the new fields.
type PhotoWithCrop = Photo & {
  ai_crop_coords?: CropCoords | null
  user_crop_coords?: CropCoords | null
  original_width?: number | null
  original_height?: number | null
  // ai_crop_suggestion already exists on Photo but may not be in older generated types
  ai_crop_suggestion?: string | null
}

interface Props {
  photo: PhotoWithCrop
  onCropAccepted?: (coords: CropCoords) => void
}

export default function CropPreviewPanel({ photo, onCropAccepted }: Props) {
  const router = useRouter()
  const cropperRef = useRef<ReactCropperElement>(null)

  const aiCoords = photo.ai_crop_coords ?? null
  const userCoords = photo.user_crop_coords ?? null
  const activeCoords = userCoords ?? aiCoords

  const [adjustMode, setAdjustMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // No structured coords — show prose fallback
  if (!aiCoords) {
    return (
      <div className="space-y-2">
        {photo.ai_crop_suggestion ? (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {photo.ai_crop_suggestion}
            </p>
            <p className="text-xs text-zinc-500 italic">
              Re-analyze this photo to enable the visual crop preview.
            </p>
          </>
        ) : (
          <p className="text-xs text-zinc-500">No crop suggestion available.</p>
        )}
      </div>
    )
  }

  function getCropperCoords(): CropCoords | null {
    const cropper = cropperRef.current?.cropper
    if (!cropper) return null
    const imageData = cropper.getImageData()
    const cropData = cropper.getCropBoxData()
    return {
      x: cropData.left / imageData.naturalWidth,
      y: cropData.top / imageData.naturalHeight,
      width: cropData.width / imageData.naturalWidth,
      height: cropData.height / imageData.naturalHeight,
    }
  }

  async function handleSave() {
    const coords = getCropperCoords()
    if (!coords) return
    setSaving(true)
    try {
      await fetch(`/api/photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_crop_coords: coords }),
      })
      onCropAccepted?.(coords)
      router.refresh()
      setAdjustMode(false)
    } finally {
      setSaving(false)
    }
  }

  function handleResetToAi() {
    const cropper = cropperRef.current?.cropper
    if (!cropper || !aiCoords) return
    const imageData = cropper.getImageData()
    cropper.setCropBoxData({
      left: aiCoords.x * imageData.naturalWidth,
      top: aiCoords.y * imageData.naturalHeight,
      width: aiCoords.width * imageData.naturalWidth,
      height: aiCoords.height * imageData.naturalHeight,
    })
  }

  const cropData = getCropperCoords()

  return (
    <div className="space-y-3">
      {/* Cropper */}
      <div className="relative">
        <Cropper
          ref={cropperRef}
          src={photo.storage_url}
          style={{ height: 320, width: '100%' }}
          // viewMode=2: restricts crop box to canvas; user cannot scroll outside image
          viewMode={2}
          // In preview mode: dragMode='none' so the user can't reposition the box
          // In adjust mode: dragMode='crop' allows resizing handles
          dragMode={adjustMode ? 'crop' : 'none'}
          guides={true}         // rule-of-thirds grid
          center={false}
          responsive={true}
          autoCropArea={1}
          checkOrientation={false}
          ready={() => {
            const cropper = cropperRef.current?.cropper
            if (!cropper || !activeCoords) return
            const imageData = cropper.getImageData()
            cropper.setCropBoxData({
              left: activeCoords.x * imageData.naturalWidth,
              top: activeCoords.y * imageData.naturalHeight,
              width: activeCoords.width * imageData.naturalWidth,
              height: activeCoords.height * imageData.naturalHeight,
            })
          }}
        />
      </div>

      {/* Coordinate readout in adjust mode */}
      {adjustMode && cropData && (
        <p className="text-xs text-zinc-400 font-mono">
          x {(cropData.x * 100).toFixed(1)}% &nbsp;
          y {(cropData.y * 100).toFixed(1)}% &nbsp;
          w {(cropData.width * 100).toFixed(1)}% &nbsp;
          h {(cropData.height * 100).toFixed(1)}%
        </p>
      )}

      {/* Prose suggestion */}
      {photo.ai_crop_suggestion && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {photo.ai_crop_suggestion}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!adjustMode ? (
          <button
            type="button"
            onClick={() => setAdjustMode(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            <Unlock className="h-3 w-3" />
            Unlock to adjust
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-white hover:bg-zinc-100 text-zinc-900 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save this crop'}
            </button>
            <button
              type="button"
              onClick={handleResetToAi}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to AI crop
            </button>
          </>
        )}

        {/* PS Script download — only available when original dimensions are stored */}
        {photo.original_width && photo.original_height && (
          <a
            href={`/api/photos/${photo.id}/ps-script`}
            download
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            <Download className="h-3 w-3" />
            Download Photoshop Script
          </a>
        )}
      </div>

      {userCoords && (
        <p className="text-xs text-zinc-500">
          Using your saved crop.{' '}
          <button
            type="button"
            className="underline hover:text-zinc-300"
            onClick={async () => {
              await fetch(`/api/photos/${photo.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_crop_coords: null }),
              })
              router.refresh()
            }}
          >
            Revert to AI crop
          </button>
        </p>
      )}
    </div>
  )
}
