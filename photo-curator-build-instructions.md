# PhotoCurator — Claude Code Build Instructions

Here's a battle-tested sequence for getting Claude Code to build this well. The key principle is **don't hand it everything at once** — Claude Code works best in focused phases where each one builds on a stable foundation.

---

## Session 1 — Project scaffold + database

Start a new Claude Code session in an empty directory and say:

> "Create a new Next.js 14 app with TypeScript, Tailwind CSS, and shadcn/ui. Then read the spec in `photo-curator-spec.md` and implement Phase 1: the Supabase database schema, all migrations, and the local development setup. Install all dependencies listed in the spec. At the end, `supabase start` and `npm run dev` should both run without errors, and the schema should be fully applied to the local database."

Drop `photo-curator-spec.md` into the project directory before starting so Claude Code can reference it throughout.

---

## Session 2 — Auth + collections

> "Read `photo-curator-spec.md`. Implement auth (Supabase email/password + Google OAuth) and the full collections feature: list page, create collection modal, and the collection view shell (grid layout with toolbar, no photos yet). Use shadcn components throughout. The `/collections` route should be protected — unauthenticated users redirect to login."

---

## Session 3 — Photo upload + duplicate handling

> "Read `photo-curator-spec.md`. Implement the photo upload flow: the drag-and-drop upload zone, multipart upload to Supabase Storage, thumbnail generation with sharp, and the duplicate detection check. When duplicates are found, show the `DuplicateResolutionModal` as specced with Skip / Replace / Keep both options and the 'Apply to all' shortcut. After upload, photos should appear in the collection grid."

---

## Session 4 — Photo grid + single photo view

> "Read `photo-curator-spec.md`. Implement the full photo grid view with: responsive CSS grid, lazy-loaded thumbnails, filter toolbar (tier, user rating, analyzed status), sort options, and multi-select mode with the bulk action bar. Then implement the single photo view with URL state (`?photo=[id]`), prev/next keyboard navigation, and the analysis/user-input/sub-collections side panel. No AI analysis yet — show placeholder state for unanalyzed photos."

---

## Session 5 — AI analysis

> "Read `photo-curator-spec.md`. Implement AI photo analysis: the `POST /api/photos/[id]/analyze` route that resizes the image with sharp, sends it to the Claude API with the exact prompt from the spec, parses the JSON response, and stores all fields. Implement the 'Analyze All' queue (sequential, not parallel). Show the analyzing spinner per photo card and the full analysis panel in single photo view once complete."

---

## Session 6 — Sub-collections + Best Of

> "Read `photo-curator-spec.md`. Implement sub-collections: creation with color picker, the tab UI in the collection view, adding/removing photos (single and bulk), and the sub-collection management panel in the single photo view. Then implement the Best Of feature: the `POST /api/collections/[id]/best-of` route with the composite scoring formula, the `BestOfModal` config UI with the weight slider, and the composite score badge on photo cards when the Best Of tab is active."

---

## Session 7 — Photo deletion + sharing

> "Read `photo-curator-spec.md`. Implement two features. First, photo removal: the danger zone card in single photo view, bulk removal from the multi-select action bar, right-click context menu on photo cards, and the full cascade (DB record, storage files, thumbnail, sub-collection memberships, cover photo reset). Second, sub-collection sharing: the `SharePanel` component, the four share API routes, and the public `/s/[token]` route with its read-only gallery and lightbox — showing only title and caption, no ratings or critiques."

---

## Session 8 — Keyboard shortcuts + polish

> "Read `photo-curator-spec.md`. Implement all keyboard shortcuts from the spec. Then do a polish pass: loading skeletons, empty states for collections with no photos and sub-collections with no members, error handling on upload failures and API errors, and mobile swipe navigation in single photo view."

---

## Tips for each session

**Always start by referencing the spec.** "Read `photo-curator-spec.md`" at the top of every prompt keeps Claude Code anchored to the exact field names, API signatures, and UI descriptions you defined.

**Test before moving on.** At the end of each session, manually verify the feature works before starting the next one. Claude Code can introduce subtle bugs that compound across sessions.

**When something goes wrong mid-session**, be specific: *"The duplicate resolution modal is appearing before filenames are checked — the check should happen client-side after drop but before any upload starts. Fix this and re-read the spec's Duplicate Handling section."*

**For the AI analysis session**, have your `ANTHROPIC_API_KEY` ready in `.env.local` and upload 2–3 test photos first so you can verify the full round-trip immediately.

**If Claude Code goes off-spec**, redirect it explicitly: *"That doesn't match the spec. Re-read the [section name] section and implement it as written."* It responds well to being pointed back to the source of truth.
