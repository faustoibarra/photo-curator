'use client'

import Image from 'next/image'
import { Loader2, Check, Star } from 'lucide-react'
import type { Photo } from '@/lib/types'
import type { PhotoScore } from './BestOfModal'
import { cn } from '@/lib/utils'

interface PhotoCardProps {
  photo: Photo
  multiSelect?: boolean
  selected?: boolean
  isAnalyzing?: boolean
  compositeScore?: number | null
  scoreBreakdown?: PhotoScore['score_breakdown'] | null
  onClick?: () => void
  onCheckboxChange?: () => void
}

const TIER_CLASSES: Record<string, string> = {
  'A+': 'bg-emerald-500 text-white',
  A: 'bg-teal-500 text-white',
  B: 'bg-slate-500 text-white',
  C: 'bg-gray-400 text-white',
}

export function thumbUrl(photo: Photo): string {
  return photo.storage_url.replace(/\/([^/_]+)_[^/]+$/, '/thumbs/$1_thumb.jpg')
}

function buildScoreTooltip(
  photo: Photo,
  score: number,
  breakdown: PhotoScore['score_breakdown'] | null
): string {
  if (!breakdown) return `Composite: ${score.toFixed(1)}`
  if (breakdown.user_weight === 0) {
    return `AI only: ${photo.ai_overall_rating?.toFixed(1) ?? '?'}\n(no user rating)`
  }
  const userNormalized = (photo.user_rating ?? 0) * 2
  return `AI: ${photo.ai_overall_rating?.toFixed(1) ?? '?'} (×${breakdown.ai_weight.toFixed(1)}) + You: ${userNormalized.toFixed(1)} (×${breakdown.user_weight.toFixed(1)}) = ${score.toFixed(1)}`
}

export function PhotoCard({
  photo,
  multiSelect = false,
  selected = false,
  isAnalyzing = false,
  compositeScore = null,
  scoreBreakdown = null,
  onClick,
  onCheckboxChange,
}: PhotoCardProps) {
  const tier = photo.ai_tier
  const isBestOf = compositeScore != null

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative w-full aspect-square overflow-hidden rounded-lg bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all',
          selected && 'ring-2 ring-primary ring-offset-2'
        )}
      >
        {/* Thumbnail — lazy-loaded by default via next/image */}
        <Image
          src={thumbUrl(photo)}
          alt={photo.filename}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
          unoptimized
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

        {/* Hover: filename + dimensions */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-2">
          <p className="text-white text-[11px] font-medium truncate leading-tight">
            {photo.filename}
          </p>
          {photo.width != null && photo.height != null && (
            <p className="text-white/70 text-[10px] leading-tight mt-0.5">
              {photo.width} × {photo.height}
            </p>
          )}
        </div>

        {/* Top-left: tier badge */}
        {tier && (
          <span
            className={cn(
              'absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded',
              TIER_CLASSES[tier] ?? 'bg-muted text-muted-foreground'
            )}
          >
            {tier}
          </span>
        )}

        {/* Top-right: composite score (Best Of) or AI rating */}
        {isBestOf ? (
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-500/90 text-white px-1.5 py-0.5 rounded"
            title={buildScoreTooltip(photo, compositeScore!, scoreBreakdown)}
          >
            <Star className="size-2.5 fill-white" />
            {compositeScore!.toFixed(1)}
          </span>
        ) : (
          photo.ai_overall_rating != null && (
            <span className="absolute top-2 right-2 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
              {Number(photo.ai_overall_rating).toFixed(1)}
            </span>
          )
        )}

        {/* Bottom: analyzing indicator */}
        {isAnalyzing && (
          <div className="absolute bottom-0 inset-x-0 group-hover:bottom-[36px] transition-all duration-200 bg-black/50 flex items-center justify-center gap-1 py-1">
            <Loader2 className="size-3 animate-spin text-white" />
            <span className="text-[10px] text-white">Analyzing…</span>
          </div>
        )}
      </button>

      {/* Multi-select checkbox */}
      {multiSelect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCheckboxChange?.()
          }}
          className={cn(
            'absolute top-2 left-2 size-5 rounded border-2 flex items-center justify-center transition-all z-10',
            selected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-black/40 border-white/80 text-transparent hover:border-white'
          )}
        >
          {selected && <Check className="size-3" />}
        </button>
      )}
    </div>
  )
}
