export type BwProfile = {
  label: string
  cssFilter: string
  sharp: { r: number; g: number; b: number }
}

export const BW_PROFILES: Record<string, BwProfile> = {
  classic: {
    label: 'Classic',
    cssFilter: 'grayscale(1)',
    sharp: { r: 0.299, g: 0.587, b: 0.114 },
  },
  acros: {
    label: 'Acros',
    cssFilter: 'grayscale(1) contrast(1.15) brightness(0.92)',
    sharp: { r: 0.25, g: 0.60, b: 0.15 },
  },
  high_contrast: {
    label: 'High Contrast',
    cssFilter: 'grayscale(1) contrast(1.4) brightness(0.88)',
    sharp: { r: 0.35, g: 0.55, b: 0.10 },
  },
  matte: {
    label: 'Matte',
    cssFilter: 'grayscale(1) contrast(0.85) brightness(1.08)',
    sharp: { r: 0.299, g: 0.587, b: 0.114 },
  },
  selenium: {
    label: 'Selenium',
    cssFilter: 'grayscale(1) sepia(0.2) contrast(1.1)',
    sharp: { r: 0.27, g: 0.58, b: 0.15 },
  },
}

export const DEFAULT_BW_PROFILE = 'classic'

export type ResolvedPhotoUrl = { url: string; cssFilter?: string }

export function resolvePhotoUrl(
  photo: { storage_url: string; bw_processed_url?: string | null; bw_profile?: string | null },
  forceBw: boolean
): ResolvedPhotoUrl {
  if (!forceBw) return { url: photo.storage_url }
  if (photo.bw_processed_url) return { url: photo.bw_processed_url }
  const profile = BW_PROFILES[photo.bw_profile ?? DEFAULT_BW_PROFILE] ?? BW_PROFILES[DEFAULT_BW_PROFILE]
  return { url: photo.storage_url, cssFilter: profile.cssFilter }
}
