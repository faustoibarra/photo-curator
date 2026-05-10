# Inngest Setup

Inngest handles background photo analysis jobs. Each photo is an independent
queued job with 3 retries and a global concurrency limit of 5 to stay within
Anthropic rate limits.

## Production setup (Vercel)

### 1. Create an Inngest account

Go to https://app.inngest.com, sign up, and create an app named `photo-curator`.

### 2. Get your keys

From the Inngest dashboard → Settings → Event keys and Signing keys:

- `INNGEST_EVENT_KEY` — used by the app to send events
- `INNGEST_SIGNING_KEY` — used to verify webhook requests from Inngest

### 3. Add env vars to Vercel

```bash
vercel env add INNGEST_EVENT_KEY production
vercel env add INNGEST_SIGNING_KEY production
```

Or add them in the Vercel dashboard under Project → Settings → Environment Variables.

### 4. Deploy and sync

After deploying, go to Inngest dashboard → Apps → Sync new app and enter:

```
https://your-app.vercel.app/api/inngest
```

Inngest will discover the `analyze-photo` function automatically. You should see
it listed under Functions.

## Local development

Run the Inngest Dev Server alongside the Next.js dev server:

```bash
# Terminal 1
npm run dev

# Terminal 2
npx inngest-cli@latest dev
```

The dev server proxies to `http://localhost:3000/api/inngest` and runs at
`http://localhost:8288`. No env vars needed locally — the dev server handles
auth automatically.

The dashboard at `localhost:8288` shows every triggered job, step output,
retry history, and timing.

## How it works

`POST /api/collections/[id]/analyze-all` sends one `photo/analyze.requested`
event per unanalyzed photo and returns immediately. Inngest fans the jobs out,
running at most 5 at a time.

Each `analyze-photo` job has three steps:

1. **fetch-metadata** — loads photo row and collection type from Supabase
2. **download-resize-analyze** — downloads from storage, resizes with sharp,
   calls Claude API (base64 stays in memory, never serialized to Inngest state)
3. **save-results** — writes AI fields to the photos table

Each step is a checkpoint. If a step fails, Inngest retries from that step —
not from the beginning of the job.

## Free tier limits

Inngest free tier: 50,000 function runs/month. Each photo analysis = 1 run.
For typical usage this is more than enough.
