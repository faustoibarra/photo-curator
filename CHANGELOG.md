# Changelog

All notable changes to PhotoCurator are documented here.

## [0.1.1.0] - 2026-05-12

### Added
- **Three Judges analysis framework** — AI photo analysis now evaluates images through three distinct lenses: Gallery Curator (wall-print quality), Stranger Scrolling (stopping power for people who don't know you), and Social Editor (IG/FB organic engagement). Each lens gets its own 1–10 score, visible in the photo detail panel.
- **Judge sub-scores in photo view** — Gallery, Stranger, and Social scores now appear as a score grid in the analysis panel with tooltip descriptions of each judge's criteria.

### Changed
- **Overall rating is now the equal-weighted average of the three judge scores**, computed server-side from validated values — Claude can no longer return an inconsistent overall score.
- **Tier definitions tightened to universal appeal**: A+ requires strong scores across all three judges; B is explicitly "nice memory" territory (low on stranger and social); C is reject regardless of sentimental value.
- **Critiques now reference all three judges** — the prompt instructs Claude to describe how each judge would respond, giving photographers actionable insight into why a photo is gallery-worthy, scroll-stopping, or social-friendly.

### Fixed
- Judge scores written by the direct analysis route (`POST /api/photos/[id]`) — they were previously saved only via the Inngest job path, leaving the columns null for all browser-triggered analyses.
- Score fields validated and clamped to [1, 10] after Claude responds; NaN values (from missing or invalid JSON fields) now throw before reaching the database.
- Score rendering in the UI now guards against NaN values, showing `—` instead of `NaN` for any corrupted score.

## [0.1.0.0] - 2026-04-21

### Added
- **Sub-collection bulk download** — download an entire curated set as a ZIP file directly from the toolbar. Supports original filenames or custom prefix + sequence naming, optional IPTC/XMP metadata injection (title and caption), and automatic B&W conversion for B&W sub-collections.
- **iOS backend support** — API is now ready to serve a native iOS client. CORS headers added to all `/api/*` routes with OPTIONS preflight handling. Bearer JWT tokens accepted in `Authorization` header as an alternative to browser cookies, enabling authentication from mobile apps.
- **Standalone photo analysis endpoint** — `POST /api/analyze` accepts an image upload and returns a full AI critique without requiring the photo to be in a collection. Designed for analyzing camera roll photos from iOS.

### Fixed
- B&W keyboard shortcut (`b`) now persists the toggle to the server, matching the behavior of the B&W button click.
- JPEG detection for metadata injection now uses magic bytes (checks for `FF D8` header) rather than file extension, correctly handling files with mismatched names.
- Download ZIP filenames sanitized against path traversal; user-supplied prefix capped at 64 characters.
- Photo fetches during ZIP generation are now parallelized (5 concurrent) with a 30-second per-fetch timeout, preventing hangs on slow storage responses.
