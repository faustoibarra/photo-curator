# PhotoCurator Design System

## Philosophy

Editorial photography aesthetic. The work is the hero — the UI earns its pixels by getting out of the way. Dark surfaces, precise typography, minimal chrome.

Reference: high-end photography portfolio sites, 500px, Dwell magazine.

## Color

| Token | Value | Use |
|-------|-------|-----|
| Surface primary | `bg-zinc-950` (#09090b) | Page backgrounds, overlays |
| Text primary | `text-white` | Headlines, primary content |
| Text secondary | `text-white/60` | Photographer names, labels |
| Text muted | `text-white/40` | Secondary metadata |
| Text subtle | `text-white/30` | Counts, metadata |
| Text ghost | `text-white/20` | Attribution, watermarks |
| Border | `border-white/20` | UI elements, dividers |
| Border hover | `border-white/50` | Interactive states |

Do not use pure black (`#000000`). Use `bg-zinc-950` (#09090b) — warmer, easier on OLED.

No colored accents on the share/gallery surface. The photos provide the color.

## Typography

| Role | Font | Class |
|------|------|-------|
| Display / Headings | Fraunces (optical variable serif) | `font-display font-light tracking-widest` |
| Body / UI | Plus Jakarta Sans | `font-sans` |
| Labels / Tags | Plus Jakarta Sans | `font-sans text-xs tracking-[0.25em] uppercase` |
| Captions | Plus Jakarta Sans | `font-sans text-sm text-white/50 leading-relaxed` |

Fraunces is the brand voice: editorial, precise, elegant. Plus Jakarta Sans handles everything functional.

Font sizing is responsive: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl` for main display text.

## Images

- **No border-radius on photos.** Photos are art, not cards. Square edges.
- Hover: `group-hover:scale-[1.03]` — subtle, not dramatic
- Transitions: `duration-500` on scale, `duration-300` on overlays

## Layout — Share Gallery

### Header
```
by PHOTOGRAPHER NAME      ← text-white/60, tracking-[0.3em], uppercase, font-sans
Collection Name           ← Fraunces, font-light, tracking-widest, 4xl→6xl responsive  
N PHOTOGRAPHS             ← text-white/30, tracking-[0.25em], uppercase, font-sans
Description               ← text-white/50, max-w-xl, leading-relaxed
[Download all ↓]          ← border border-white/20, no border-radius
```

### Grid
- CSS columns masonry: `columns: '3 260px'`
- Gap: `4px` uniform
- Full-bleed: `padding: '0 4px 4px'` (4px from edge only)
- No outer horizontal padding

### Photo title overlay
- Bottom gradient: `bg-gradient-to-t from-black/55 via-black/10 to-transparent`
- Desktop (pointer devices): `opacity-0 group-hover:opacity-100 transition-opacity duration-300`
- Mobile (touch devices): `[@media(hover:none)]:opacity-100` — always visible
- Title text: `text-xs font-light tracking-wide line-clamp-2`
- Pattern: `@media (hover: none)` detects touch input, not screen size

### Footer
```
curated with photocurator  ← text-white/20, tracking-[0.3em], uppercase, py-12
```

## Motion

| Element | Animation | Duration |
|---------|-----------|----------|
| Grid items | `fadeInUp` stagger (0–800ms delay) | 500ms |
| Slideshow crossfade | opacity 0→1 | 600ms |
| Hover overlay | opacity | 300ms |
| Lightbox photo change | opacity fade | 200ms |
| Image hover scale | transform | 500ms |

## Accessibility

- Lightbox: `role="dialog" aria-modal="true"` with focus on close button
- Nav buttons: `aria-label` on all controls
- Touch targets: `min-w-[44px] min-h-[44px]` minimum
- Keyboard: arrows + escape in lightbox, slideshow
- Body scroll lock when lightbox is open

## Open Graph

Share pages generate dynamic OG metadata:
- `og:title`: `{collectionName} — by {photographerName}`
- `og:description`: collection description or fallback
- `og:image`: first featured photo URL, else first photo URL
- `twitter:card`: `summary_large_image`
