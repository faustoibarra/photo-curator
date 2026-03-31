# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Next.js dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint

npx supabase start   # Start local Supabase (requires Docker)
npx supabase stop    # Stop local Supabase
npx supabase db reset  # Reset DB and re-run migrations
```

No test suite is configured.

## Architecture

PhotoCurator is a **Next.js 14 app** where photographers upload and organize photos with AI-powered critiques via the Anthropic SDK. Backend is Supabase (Postgres + Auth + Storage).

### Layer overview

| Layer | Location | Notes |
|-------|----------|-------|
| Pages / layouts | `app/` | Server Components by default; fetch data and check auth server-side |
| Server Actions | `app/actions/` | Form mutations (auth, collection creation) using `useFormState` |
| API Routes | `app/api/` | REST endpoints for programmatic access |
| Client components | `components/` | Interactive UI — modals, forms, nav |
| UI primitives | `components/ui/` | shadcn components |
| Supabase clients | `lib/supabase/` | Separate `server.ts` (SSR) and `client.ts` (browser) |
| Types | `lib/types.ts` | Custom types; `lib/supabase/types.ts` is auto-generated from schema |

### Auth flow

- Email/password and Google OAuth via Supabase Auth
- Middleware (`middleware.ts`) validates session cookies and redirects unauthenticated users away from `/collections/*`
- Always use `supabase.auth.getUser()` (validates JWT server-side), never `getSession()` in server code
- OAuth callback at `/auth/callback` exchanges the code for a session, then redirects to `/collections`

### Data model (key tables)

- **`collections`** — user's photo albums (type: `trip | event | project`)
- **`photos`** — photo metadata + AI analysis results (`ai_tier` A/B/C, ratings 1–10, critique, tags, crop suggestions)
- **`sub_collections`** — curated subsets within a collection; support sharing via `share_token`
- **`sub_collection_photos`** — junction table with per-photo scores

Row-Level Security enforces per-user data isolation everywhere. Sub-collections can also be accessed by anyone holding a valid `share_token`.

### Mutation patterns

**Server Actions** (preferred for form submissions):
```ts
// returns { error?: string } | null
const error = await createCollection(formData)
revalidatePath('/collections')  // invalidate cached page data
```

**API Routes** (JSON in/out, for programmatic or client-fetch use):
```ts
// GET/POST /api/collections
// GET/PATCH /api/collections/[id]
```

### State management

- Server Components fetch and pass data as props
- Client components use `useState` / `useTransition` / `useRouter().refresh()` for local state
- Zustand is installed but not yet used — reserved for future features

### Supabase local dev

Local instance ports: API `54321`, DB `54322`, Studio `54323`.
Email confirmations are disabled locally. Google OAuth requires credentials in `.env.local` with redirect URI `http://127.0.0.1:54321/auth/v1/callback`.

Regenerate DB types after schema changes:
```bash
npx supabase gen types typescript --local > lib/supabase/types.ts
```

### Environment variables

See `.env.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL`.
