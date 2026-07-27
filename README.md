# Statement2Sheet

Bank statements come as PDFs — laid out for humans to read, not for spreadsheets to consume. If you need the transactions in Excel or a CSV (for bookkeeping, reconciliation, importing into accounting software, or just analysis), the usual options are manually retyping rows, wrestling with a generic PDF-table-extractor that mangles half the columns, or paying for a service built around one bank's specific layout.

Statement2Sheet does one thing: you drop in a statement PDF, and you get back a spreadsheet of every transaction on it — as a `.xlsx` or `.csv` — in seconds, with no sign-up and nothing stored afterward.

## Website Link

https://statement2sheet.vercel.app/

## The core idea: no fixed schema

Every bank statement lays out its transaction table differently. One might use `Date / Description / Withdrawal / Deposit / Balance`. Another uses `Posting Date / Merchant / Amount`. A business account might have a dozen columns; a basic checking statement might have four.

Most statement converters handle this by forcing everything into one predefined schema (a generic "date, description, debit, credit, balance" shape) — which quietly drops or mangles anything that doesn't fit. Statement2Sheet doesn't do that. It reads whatever columns the statement actually has, under whatever headers it actually uses, and reproduces that same table structure in the output. A four-column statement gets a four-column spreadsheet with the original headers; a twelve-column one gets twelve. Nothing is renamed, normalized, or forced into someone else's idea of what a bank statement should look like.

## How it works

1. **You drop in a PDF.** It never leaves memory to touch a disk — no temp files, no storage, nothing written anywhere.
2. **The PDF is sent to Gemini** (Google's multimodal model) with instructions to read every transaction table and return it as raw JSON, preserving the statement's own columns and row structure.
3. **The response is parsed defensively, not strictly.** Rather than requiring the model's output to match one exact JSON shape, the server just locates wherever the list of transaction rows is in the response and reads each row's keys as-is. This means the tool works across wildly different statement layouts without needing a schema update for each one — and it means an unusual or malformed model response fails gracefully with a clear error instead of silently producing wrong data.
4. **The columns of the final spreadsheet are derived from the data itself** — the union of whatever keys showed up across the extracted rows, in the order they were first seen. Whatever the statement's own layout was, that's what comes out.
5. **The spreadsheet is built in your browser**, not on the server — the server's job ends at handing back JSON. Your browser turns that JSON into the actual `.xlsx` or `.csv` file and downloads it.
6. **The upload resets automatically** once a conversion succeeds, so the app is immediately ready for the next statement.

## What it deliberately doesn't do

- **No accounts, no history, no stored files.** Each conversion is a one-off, in-memory-only round trip. There's nothing to leak and nothing to clean up.
- **No forced categorization or reformatting of amounts.** Numbers come out exactly as printed (currency symbols and formatting included) rather than being reinterpreted, since assuming which columns are "amounts" would reintroduce the fixed-schema problem this project is trying to avoid.
- **No guarantee of a single output shape across different statements.** Converting two different banks' statements will legitimately produce two spreadsheets with different columns — that's the point, not a bug.

## Handling the rough edges

PDF-to-structured-data extraction isn't perfectly reliable — statements get corrupted, password-protected, or oddly scanned, and the underlying AI model occasionally times out. Statement2Sheet is built to fail informatively rather than silently: a busy model automatically retries against alternates before giving up, and failures surface as a specific, honest message (high demand, a configuration problem, or a statement that genuinely couldn't be read) instead of a blank result or a wrong one.