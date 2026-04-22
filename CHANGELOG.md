# Changelog

All notable changes to PhotoCurator are documented here.

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
