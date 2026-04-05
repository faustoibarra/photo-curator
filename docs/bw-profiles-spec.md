# B&W Profile System — Design Spec

## Summary

Add non-destructive black and white profile support to PhotoCurator. Photographers can audition named B&W looks on individual photos, save a profile choice, and create sub-collections that present entirely in B&W. Shared galleries respect the photographer's B&W intent. Original files are never modified.

---

## Understanding

**What:** A B&W profile system with live CSS preview, Sharp-based pre-generation, per-photo profile storage, and sub-collection B&W mode.

**Why:** Photographers want to curate B&W edits during the selection process — auditioning looks, building B&W sub-collections — without destructive edits to originals.

**Who:** The photographer (owner) during curation; viewers of shared galleries.

**Non-goals:**
- User-defined custom profiles
- Per-sub-collection profile override per photo
- Viewer toggle in shared galleries

---

## Data Model Changes

### `photos` table — 2 new columns

| Column | Type | Default | Notes |
|---|---|---|---|
| `bw_profile` | `text` | `null` | Profile key, e.g. `"classic"`, `"acros"` |
| `bw_processed_url` | `text` | `null` | Supabase Storage URL of Sharp-generated file |

### `sub_collections` table — 1 new column

| Column | Type | Default | Notes |
|---|---|---|---|
| `is_bw` | `boolean` | `false` | Forces all photos to render in B&W when viewing this sub-collection |

### Migration

```sql
ALTER TABLE photos
  ADD COLUMN bw_profile text,
  ADD COLUMN bw_processed_url text;

ALTER TABLE sub_collections
  ADD COLUMN is_bw boolean NOT NULL DEFAULT false;
```

After migrating, regenerate types:

```bash
npx supabase gen types typescript --local > lib/supabase/types.ts
```

---

## Profile Definitions

**File:** `lib/bw-profiles.ts`

Each profile has:
- `label` — display name for UI
- `cssFilter` — applied instantly to `<Image>` for live preview
- `sharp` — R/G/B luminance weights for Sharp channel mixer (must sum to 1.0)

```ts
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

export function resolvePhotoUrl(
  photo: Pick<Photo, 'storage_url' | 'bw_processed_url' | 'bw_profile'>,
  forceBw: boolean
): { url: string; cssFilter?: string } {
  if (!forceBw) return { url: photo.storage_url }
  if (photo.bw_processed_url) return { url: photo.bw_processed_url }
  const profile = BW_PROFILES[photo.bw_profile ?? DEFAULT_BW_PROFILE]
  return { url: photo.storage_url, cssFilter: profile.cssFilter }
}
```

**Adding a new profile** = one new entry in `BW_PROFILES`. No migration required.

---

## UI — Single Photo View

**Location:** New section in `SinglePhotoView` side panel, between "Your Notes" and "Sub-collections."

**Interaction:**
1. User presses `b` or clicks the B&W toggle → image immediately renders in B&W using current profile (default: `classic`)
2. Profile chips appear (Classic, Acros, High Contrast, Matte, Selenium)
3. Clicking a chip switches the CSS filter instantly — no server call
4. Saving (auto-save on chip select, debounced) calls `PATCH /api/photos/[id]` with `{ bw_profile: "acros" }`
5. Toggling off without saving discards the unsaved audition

**Keyboard shortcut:** `b` — toggles B&W on/off. Consistent with existing shortcuts (`f` flag, `a` analyze, arrows navigate).

**Image rendering:**
```tsx
<Image
  style={{ filter: bwEnabled ? BW_PROFILES[activeProfile].cssFilter : undefined }}
  ...
/>
```

**Local state:**
- `bwEnabled: boolean` — initialized from `photo.bw_profile != null`
- `activeProfile: string` — initialized from `photo.bw_profile ?? DEFAULT_BW_PROFILE`

**When viewing inside a B&W sub-collection:**
- `bwEnabled` is pre-set to `true` and the toggle is locked on
- User can still audition and save different profiles

**Grid view (`PhotoCard`):** When `photo.bw_processed_url` is set, use it as the image `src` instead of `storage_url`. No CSS needed — the stored file is already B&W.

When `sortBy === 'bw_score'`, show the `ai_bw_rating` value beneath the photo thumbnail in the grid (e.g., `B&W 7.4`). Hidden for all other sort modes and for unanalyzed photos.

---

## Sorting by B&W Score

**New sort option:** `bw_score` added to `SortOption` in `CollectionView.tsx`.

**Sort order:** tier first (A+ → A → B → C → untiered), then `ai_bw_rating` descending within each tier. Photos with no `ai_bw_rating` sort to the bottom. This mirrors the existing `ai_rating` sort which already uses `TIER_ORDER`.

**Toolbar label:** `'B&W score'` added to `SORT_LABELS` in `CollectionToolbar.tsx`.

**`filterAndSort` change** — new case in the existing `switch(sort)`:
```ts
case 'bw_score': {
  const tierA = TIER_ORDER[a.ai_tier ?? ''] ?? 99
  const tierB = TIER_ORDER[b.ai_tier ?? ''] ?? 99
  if (tierA !== tierB) return tierA - tierB
  return (b.ai_bw_rating ?? -1) - (a.ai_bw_rating ?? -1)
}
```

**`PhotoCard` label:** When `sortBy === 'bw_score'` and `photo.ai_bw_rating != null`, render a small label below the thumbnail:
```
B&W 7.4
```
Styled the same as the existing composite score label (already present in Best Of sub-collections). Hidden when sort is anything else or when the photo is unanalyzed.

**`PhotoGrid`** passes `showBwScore: boolean` down to `PhotoCard` — derived from `sortBy === 'bw_score'` in `CollectionView`.

---

## API — Pre-generation

**Route:** `PATCH /api/photos/[id]` (extend existing)

**When `bw_profile` is included in the request body:**

1. Save `bw_profile` to the DB
2. Fetch original file from `storage_url`
3. Process with Sharp:
   ```ts
   const { r, g, b } = BW_PROFILES[profile].sharp
   await sharp(buffer)
     .grayscale()
     .toColorspace('b-w')
     // channel mixer via recomb or linear
     .toBuffer()
   ```
4. Upload to Supabase Storage at `bw/{photo_id}/{profile}.jpg`
5. Save URL to `bw_processed_url` on the photo row
6. Return updated photo (including `bw_processed_url`)

**When `bw_profile` is set to `null`:**
- Set `bw_processed_url` to `null` in the DB
- Do not delete the storage file

**Runtime:** Standard Node.js (not Edge). Sharp processing of a large JPEG takes 2–5s, within Next.js's 30s default limit.

**Storage path convention:** `bw/{photo_id}/{profile}.jpg`
- Old files from previous profile choices are left in place (cheap storage, simple logic)

---

## Sub-collection B&W Mode

**Creation/editing:** `NewSubCollectionModal` gets a "B&W collection" toggle that sets `is_bw`. Togglable after creation via sub-collection settings.

**Viewing a B&W sub-collection:**
- `CollectionView` reads `is_bw` from the active sub-collection
- Passes `forceBw: true` down to `PhotoCard` and `SinglePhotoView`
- Each component calls `resolvePhotoUrl(photo, forceBw)` to get the correct `src` and optional `cssFilter`

**Fallback chain for photos with no saved profile:**
```
bw_processed_url exists? → use it as src
otherwise → apply cssFilter for DEFAULT_BW_PROFILE ('classic') to storage_url
```

Pre-generation for fallback photos happens lazily — only when the user saves a profile choice. CSS covers the gap in the meantime.

---

## Shared Gallery

**Route:** `app/share/[token]/page.tsx` (Server Component)

When `sub_collection.is_bw` is `true`, the server calls `resolvePhotoUrl(photo, true)` for each photo before passing data to child components. Child components (`ShareGallery`, `ShareMasonry`, `ShareLightbox`, `ShareSlideshow`) receive the correct `src` and optional `cssFilter` — no client-side B&W logic needed.

**Viewers always see B&W** when the sub-collection is flagged — no toggle exposed.

**Downloads:** When `share_allow_downloads` is `true` and `is_bw` is `true`, the download link uses `bw_processed_url` instead of `storage_url`. Falls back to original if `bw_processed_url` is null.

---

## Decision Log

| Decision | Alternatives considered | Reason |
|---|---|---|
| CSS filter for preview, Sharp for storage | Canvas pixel manipulation; Sharp-only | CSS is instant for auditioning; Sharp gives quality output for sharing/downloads |
| B&W profile on `photos`, not `sub_collection_photos` | Per-sub-collection override per photo | Simpler; photographer has one canonical B&W intent per photo |
| `is_bw` boolean on `sub_collections` | Sub-collection-level profile override | Keeps per-photo choice as the authority; sub-collection just forces B&W on |
| Fixed profile list in code | User-defined custom profiles | YAGNI; extensible without schema changes |
| Pre-generate on profile save | On-the-fly with caching; no server processing | Fast shared gallery loads; downloads work without re-processing |
| `resolvePhotoUrl` helper shared across app and share route | Inline logic per component | Single source of truth for fallback chain |
| `b` keyboard shortcut to toggle B&W | — | Consistent with existing pattern (f, a, arrows) |
| B&W score label only visible when sorting by B&W score | Always show it | Avoids grid clutter; label is only meaningful as a sorting aid |
| Shared gallery always shows B&W when `is_bw` | Viewer toggle | Photographer's intent is preserved |
| Lazy pre-generation for fallback photos | Bulk pre-generate on `is_bw` toggle | Avoids bulk processing; CSS covers the gap |

---

## Implementation Checklist

- [ ] Migration: add `bw_profile`, `bw_processed_url` to `photos`; add `is_bw` to `sub_collections`
- [ ] Regenerate Supabase types
- [ ] Create `lib/bw-profiles.ts` with profiles and `resolvePhotoUrl`
- [ ] Add `sharp` dependency
- [ ] Extend `PATCH /api/photos/[id]` to handle `bw_profile` and trigger Sharp pre-generation
- [ ] Update `SinglePhotoView`: B&W toggle, profile chips, `b` keyboard shortcut, lock toggle in B&W sub-collections
- [ ] Update `PhotoCard`: use `bw_processed_url` when available; apply `cssFilter` fallback in B&W sub-collections
- [ ] Update `NewSubCollectionModal` + settings: add `is_bw` toggle
- [ ] Update `CollectionView`: pass `forceBw` from active sub-collection down to photo components; pass `showBwScore` (derived from `sortBy === 'bw_score'`) to `PhotoGrid`
- [ ] Add `bw_score` to `SortOption` type and `filterAndSort` in `CollectionView.tsx`
- [ ] Add `'B&W score'` entry to `SORT_LABELS` in `CollectionToolbar.tsx`
- [ ] Update `PhotoGrid`: accept and forward `showBwScore` to `PhotoCard`
- [ ] Update `PhotoCard`: render `ai_bw_rating` label when `showBwScore` is true and rating is non-null
- [ ] Update `app/share/[token]/page.tsx`: call `resolvePhotoUrl` server-side, pass resolved URLs to share components
- [ ] Update share components: accept and apply optional `cssFilter`
- [ ] Update download links in share view to use `bw_processed_url` when appropriate
