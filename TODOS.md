# TODOS

## Download

**Title:** Stream ZIP generation instead of buffering in memory
**Priority:** P2
**Description:** The bulk download route (`app/api/sub-collections/[id]/download/route.ts`) buffers all photos and the entire ZIP in memory before sending. For large collections (50+ photos) this can consume significant RAM. Switch to a streaming ZIP library (`archiver` or similar) that writes chunks directly to the response stream.
**Noticed:** v0.1.0.0 ship review

---

## iOS / API

**Title:** Rate limiting on `POST /api/analyze`
**Priority:** P2
**Description:** The standalone analysis endpoint has no rate limiting. Each call invokes the Anthropic API (cost + latency). A user or automated client could abuse it. Add per-user rate limiting (e.g., 20 requests/hour) using Upstash Rate Limit or similar.
**Noticed:** v0.1.0.0 ship review

---

## Completed

_(none yet)_
