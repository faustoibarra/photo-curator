# PhotoCurator

AI-powered photo curation for photographers. Upload shoots, get Claude critiques, build curated sets, and share them.

## Features

- **AI critique** — Claude analyzes each photo for technical quality, composition, light, and impact. Assigns a tier (A+/A/B/C) and detailed written critique.
- **Collections** — organize shoots by type (nature trip, city trip, sports, social event). Context-aware AI prompting per collection type.
- **Sub-collections** — build curated sets within a collection. Generate a "Best Of" automatically using weighted AI + user ratings.
- **Sharing** — share sub-collections via a public link with optional download access.
- **Bulk download** — download an entire sub-collection as a ZIP with optional IPTC/XMP metadata (title + caption) and B&W conversion.
- **iOS API** — all endpoints accept Bearer JWT tokens, enabling a native iOS client. `POST /api/analyze` analyzes camera roll photos without requiring a collection.

## Stack

- Next.js 14 (App Router)
- Supabase (Postgres + Auth + Storage)
- Anthropic Claude (vision analysis)
- Sharp (image processing)

## Getting Started

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, NEXT_PUBLIC_APP_URL

npx supabase start   # requires Docker
npx supabase db reset
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
npm run dev       # dev server
npm run build     # production build
npm run lint      # ESLint
npx supabase db reset  # reset DB and re-run migrations
```

See `CLAUDE.md` for full architecture notes.
