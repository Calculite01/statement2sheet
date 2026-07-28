# 📄➡️📊 Statement2Sheet

**Turn bank statement PDFs into clean, ready-to-use spreadsheets — in seconds, with zero manual re-entry.**

Built for a small accounting firm that was manually retyping client bank statements into CSV every month. Now it's a single upload.

🔗 **Live:** [statement2sheet.vercel.app](https://statement2sheet.vercel.app/)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_API-4285F4?style=for-the-badge&logo=googlegemini&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## 💡 The problem

Bank statements come as PDFs — laid out for humans to read, not for spreadsheets to consume. For an accounting firm handling dozens of clients' statements every month, that means someone manually retyping every transaction row into a spreadsheet before any bookkeeping software can touch it.

At the firm this was built for: **~70% of clients send statements as PDFs**, and manual conversion was taking **~30 minutes per statement**, at a volume of 50–100 statements a month.

## 📈 Real-world impact

Based on figures from the firm (100 statements/month, 30 min manual conversion each):

| Metric | Value |
|---|---|
| ⏱️ Time saved | **~50 hours/month** (~11.5 hrs/week, ~2.3 hrs/day) |
| 📥 Statements handled | Up to 100/month |
| 🔁 Manual re-entry eliminated | 100% of PDF-based statements |
| 🙋 Client friction removed | No more asking clients to resend statements specifically as CSV |

*(Figures reflect this firm's reported usage — 100 is the upper end of a 50–100/month range, used deliberately as the conservative-but-real estimate.)*

## 🧠 The core idea: no fixed schema

Every bank issues statements with a different layout — `Date / Description / Withdrawal / Deposit / Balance` on one, `Posting Date / Merchant / Amount` on another, four columns on a basic checking account, a dozen on a business one.

Most converters force everything into one predefined schema, silently dropping or mangling whatever doesn't fit. Statement2Sheet doesn't — it reads whichever columns and headers a statement actually has and reproduces that exact structure in the output. A four-column statement produces a four-column spreadsheet with the original headers intact; a twelve-column one produces twelve. Nothing renamed, nothing normalized, nothing forced.

## ⚙️ How it works

1. **Drop in a PDF** — processed entirely in memory, never written to disk.
2. **Sent to Gemini** (Google's multimodal model) with instructions to extract every transaction table as raw JSON, preserving the statement's own columns and structure.
3. **Parsed defensively, not strictly.** Rather than demanding one exact JSON shape back, the server locates wherever the row data is in the response and reads each row's keys as-is — so it holds up across wildly different bank layouts without a schema update per bank.
4. **Columns are derived from the data itself** — the union of whatever keys appear across the rows, in the order first seen.
5. **The spreadsheet is generated client-side**, in the browser — the server's job stops at returning JSON.
6. **Auto-reset** after a successful download, so the app's immediately ready for the next statement.

## 🛡️ Built for reliability, not just the happy path

- **Multi-model fallback** — if the primary Gemini model is at capacity or has been deprecated, the request automatically retries against a chain of alternates before failing, rather than surfacing a single point of failure to the user.
- **Honest, specific error states** — high demand, a server misconfiguration, and a genuinely unreadable/corrupted/password-protected PDF are distinguished and surfaced as their own clear messages, instead of one generic "something went wrong."
- **Stateless by design** — no database, no stored files, no accounts. Each conversion is a self-contained round trip, which also means there's nothing to secure or leak between requests.

## 🚫 What it deliberately doesn't do

- No forced categorization of amounts — numbers come out exactly as printed, since assuming which columns are numeric would reintroduce the fixed-schema problem this avoids.
- No history or persistence — nothing is stored server-side after the response is sent.
- No single "correct" output shape — two different banks' statements legitimately produce two different spreadsheet layouts, matching their source documents.

## 🧰 Tech stack

- **Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS
- **AI:** Google Gemini (`@google/genai`), multi-model fallback chain
- **Spreadsheet generation:** `xlsx` / `papaparse`, client-side
- **Hosting:** Vercel (serverless functions, in-memory processing, no persistent storage)
