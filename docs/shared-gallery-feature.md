# Shared Gallery Feature — Design Spec

## Overview

A public-facing gallery page that lets photographers share curated sub-collections with friends and family via a unique link. The experience is cinematic and immersive: an auto-advancing slideshow intro followed by a browsable masonry grid with a lightbox viewer.

---

## Understanding Summary

- **What:** Public `/share/[token]` page for sub-collections
- **Why:** Let photographers share curated photo sets with friends and family in a beautiful, impressive way
- **Who:** Casual viewers — friends and family, no account required
- **Experience flow:** Auto-advancing full-screen slideshow (photographer-picked photos) → masonry grid → lightbox on click
- **Tone:** Cinematic, wow-factor, immersive
- **Non-goals:** Comments, reactions, user accounts, social features, heavy branding

---

## Assumptions

1. Share URL is `/share/[token]` — public Next.js route, no auth required
2. Photographer selects 3–5 "featured" photos when configuring sharing — stored in a new `featured_photo_ids` column
3. Slideshow is full-screen, auto-advances every 4 seconds with crossfade, collection name + subtle attribution overlaid
4. A "Skip" button appears top-right after the first slide; scrolling also exits the slideshow
5. Lightbox shows `ai_title` and `ai_caption` per photo
6. Photographer's display name shown subtly (bottom-right corner of slideshow)
7. Per-photo download and "Download All" are both controlled by the existing `share_allow_downloads` flag
8. Mobile-responsive — masonry collapses to 2 columns on tablet, 1 on mobile

---

## Schema Change

Add one column to `sub_collections`:

```sql
featured_photo_ids  uuid[]  -- ordered list of photographer-picked slideshow photos (3–5)
```

No other schema changes required. `share_token`, `share_enabled`, and `share_allow_downloads` already exist.

---

## Route & File Structure

```
app/
  share/
    [token]/
      page.tsx              ← server component: fetches data, renders ShareGallery
  api/
    share/
      [token]/
        download/
          route.ts          ← GET: streams ZIP of all photos (gated by share_allow_downloads)

components/
  ShareGallery.tsx          ← client component: owns phase state ('slideshow' | 'grid')
  ShareSlideshow.tsx        ← full-screen auto-advancing slideshow
  ShareMasonry.tsx          ← CSS columns masonry grid with staggered entrance
  ShareLightbox.tsx         ← full-screen overlay with keyboard navigation
```

---

## Data Access

All fetching happens server-side in `page.tsx` using the service role key (never exposed to the browser):

```
1. SELECT sub_collection WHERE share_token = [token] AND share_enabled = true
   → 404 if not found or sharing disabled
2. SELECT photos JOIN sub_collection_photos WHERE sub_collection_id = [id]
3. SELECT display_name FROM profiles WHERE id = sub_collection.user_id
```

---

## Component Designs

### ShareGallery

- Owns a single `phase` state: `'slideshow' | 'grid'`
- Renders `<ShareSlideshow>` when phase is `'slideshow'`; calls `setPhase('grid')` on complete or skip
- Renders `<ShareMasonry>` when phase is `'grid'`
- Passes `shareAllowDownloads` prop down to both masonry and lightbox

---

### ShareSlideshow

**Behavior:**
- Displays `featured_photo_ids` photos in order, full-screen (`object-fit: cover`)
- Auto-advances every 4 seconds
- Crossfade transition (~600ms) between slides using two absolutely-positioned `<Image>` tags
- Collection name fades in centered on first slide (large, light text, subtle dark gradient behind)
- Photographer attribution bottom-right, small, on all slides
- "Skip" button top-right, appears after first slide
- On last slide completion, calls `onComplete()` → phase transitions to `'grid'`

**CSS approach:**
```css
.slide { position: absolute; inset: 0; transition: opacity 600ms ease-in-out; }
.slide.active { opacity: 1; }
.slide.inactive { opacity: 0; }
```

---

### ShareMasonry

**Layout:**
```css
.masonry { columns: 3; gap: 12px; }
@media (max-width: 768px) { .masonry { columns: 2; } }
@media (max-width: 480px) { .masonry { columns: 1; } }
```

**Header row:** Collection name (large) + photographer attribution (small, muted) + optional description + "Download All" button (if `share_allow_downloads = true`)

**Photo cards:**
- Staggered fade-in entrance animation on mount (`animation-delay` per index, CSS)
- `ai_title` overlay appears on hover (fade in)
- Click opens `<ShareLightbox>`

---

### ShareLightbox

**Layout:** Full-screen overlay, photo centered with viewport padding

**Content:**
- `ai_title` above the photo
- `ai_caption` below the photo
- Left/right arrow buttons for navigation
- `Escape` key and outside-click to close
- `ArrowLeft` / `ArrowRight` keyboard navigation
- Download icon (bottom-right) if `share_allow_downloads = true` — links directly to `storage_url`

---

### Download All — `/api/share/[token]/download`

**Guards:**
1. Fetch sub-collection by token — 404 if not found
2. Check `share_enabled = true` — 403 if false
3. Check `share_allow_downloads = true` — 403 if false

**Response:** Streams a ZIP file named `[collection-name].zip` containing all photos fetched from Supabase Storage by `storage_path`. Use `archiver` or `jszip`.

---

## Photographer-Side UI

In the existing share settings panel for a sub-collection, add:

- **Featured photos picker:** A multi-select of photos in the sub-collection, limited to 3–5, with drag-to-reorder. Saved to `featured_photo_ids`.
- The existing `share_allow_downloads` toggle controls both per-photo and "Download All" behavior.

---

## Decision Log

| Decision | Alternatives Considered | Reason |
|---|---|---|
| CSS crossfade for slideshow | Framer Motion, react-spring | No extra bundle weight on a public page |
| CSS columns for masonry | react-masonry-css, Masonry.js | Zero dependencies, sufficient for this use case |
| Service role fetch server-side | Public RLS policy | Keeps service key off the client |
| `featured_photo_ids uuid[]` on sub_collections | New junction table | Simple, ordered, no over-engineering for 3–5 photos |
| Single `phase` state ('slideshow' → 'grid') | Complex state machine | Only two phases needed |
| Gallery download gated by `share_allow_downloads` | Separate toggle | Reuses existing flag, no schema change, consistent with per-photo behavior |
| Auto-advancing slideshow (4s) with skip button | Manual-only, loop forever | Cinematic feel without trapping the viewer |
