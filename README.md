# Statement2Sheet

Drop in a bank statement PDF, get back a downloadable Excel (.xlsx) or CSV file of every transaction.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS (hand-rolled components in a ledger/receipt visual style — no shadcn CLI dependency, so there's nothing to install beyond `npm install`)
- `@google/genai` calling Gemini (`gemini-flash-latest`, with automatic fallback through `gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-3.5-flash-lite` if a model is at capacity or has been deprecated)
- `xlsx` and `papaparse` for generating the spreadsheet **in the browser** — the server only ever returns JSON

## Local development

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and set GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000.

## How it works

1. The client uploads the PDF as `multipart/form-data` to `POST /api/convert`.
2. The API route reads the file into an in-memory buffer (never written to disk), base64-encodes it, and sends it to Gemini as inline PDF data along with a prompt that asks for strict JSON back (date, description, debit, credit, balance).
3. If the primary model returns a capacity/429-style error, the route automatically retries with the next model in the fallback chain before giving up.
4. The route returns structured JSON only — no API key or provider details ever reach the browser.
5. The client turns that JSON into an `.xlsx` (via `xlsx`) or `.csv` (via `papaparse`) file entirely client-side and triggers a download, then resets the upload state.

## Deploying to Vercel

1. Push this project to a Git repo and import it in Vercel.
2. In **Project → Settings → Environment Variables**, add `GEMINI_API_KEY` (do **not** commit `.env.local`).
3. Deploy. The API route sets `export const maxDuration = 60` so it fits Vercel's default serverless function timeout, and keeps request/response bodies well under the default payload limit (uploads are capped at 15MB client- and server-side).

## Notes / things to double check before shipping

- Google retires Gemini model IDs faster than most APIs — `gemini-2.5-flash` and `gemini-1.5-flash` were both already gone for new API keys as of this writing (they now 404 with "no longer available to new users"). The fallback chain here uses `gemini-flash-latest` (an alias Google keeps pointed at their current recommended Flash model) plus a few explicit pinned IDs as backups. Check https://ai.google.dev/gemini-api/docs/models before deploying, and don't be surprised if the pinned IDs need updating again in a few months.
- Gemini's JSON output is asked for with `responseMimeType: "application/json"`, but the route still defensively strips markdown fences and validates shape before trusting it.
- There's no persistence layer by design (stateless, per the brief) — nothing is stored server-side, so there's no history/audit trail across conversions. Add one deliberately if you need it.
