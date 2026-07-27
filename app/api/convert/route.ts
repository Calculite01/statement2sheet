import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  ConvertErrorBody,
  ConvertSuccessBody,
  ExtractionResult,
} from "@/lib/types";

// Vercel serverless config — fits within the default payload/timeout limits.
export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB, comfortably under Vercel body limits

// Ordered fallback chain: try the primary model first, then progressively
// lighter/alternate models if the primary is at capacity (or unavailable).
// "gemini-flash-latest" is a Google-maintained alias that always points at
// their current recommended Flash model, so it's a good first try even as
// the underlying model version changes over time.
const MODEL_CHAIN = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];

const EXTRACTION_PROMPT = `Analyze this bank statement PDF. Extract all transactions into a structured JSON array. For each transaction, include all columns with the exact same layout structures, header values, and raw transaction records. Return ONLY raw JSON data. Do not wrap it in markdown code fences or add conversational prose.`;

function errorResponse(body: ConvertErrorBody, status: number) {
  return NextResponse.json<ConvertErrorBody>(body, { status });
}

function isCapacityError(err: unknown): boolean {
  const message = (err as { message?: string; status?: number })?.message ?? "";
  const status = (err as { status?: number })?.status;
  return (
    status === 429 ||
    /429|resource_exhausted|overloaded|capacity|rate limit/i.test(message)
  );
}

function isAuthError(err: unknown): boolean {
  const message = (err as { message?: string; status?: number })?.message ?? "";
  const status = (err as { status?: number })?.status;
  return status === 401 || status === 403 || /api key|permission|unauthenticated/i.test(message);
}

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(cleaned);
}

// The only thing this needs to figure out is "where is the list of rows" --
// it has no opinion about field names, column names, or how many columns
// there are. Whatever keys the model used for each row are kept exactly as
// returned.
function coerceExtraction(value: unknown): ExtractionResult | null {
  let rows: unknown[] | null = null;

  if (Array.isArray(value)) {
    rows = value;
  } else if (value && typeof value === "object") {
    // Look for the first array anywhere among the top-level values --
    // covers { transactions: [...] }, { rows: [...] }, { data: [...] }, etc.
    // without hardcoding which key name the model chose to use.
    const arrayField = Object.values(value as Record<string, unknown>).find((v) =>
      Array.isArray(v)
    );
    rows = Array.isArray(arrayField) ? arrayField : null;
  }

  if (!rows) return null;

  // Each row's keys are kept as-is. A row that isn't an object (e.g. the
  // model returned a bare value) becomes a single-column row rather than
  // being dropped.
  const normalizedRows: Record<string, string>[] = rows.map((row) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const normalized: Record<string, string> = {};
      for (const [key, val] of Object.entries(row as Record<string, unknown>)) {
        normalized[key] = val === null || val === undefined ? "" : String(val);
      }
      return normalized;
    }
    return { Value: row === null || row === undefined ? "" : String(row) };
  });

  const columns = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row))));

  return {
    columns,
    transactions: normalizedRows,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse(
      {
        code: "SERVER_CONFIG",
        message: "Server configuration issue. Please try again later.",
      },
      500
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return errorResponse({ code: "NO_FILE", message: "No file was received." }, 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return errorResponse({ code: "NO_FILE", message: "No file was received." }, 400);
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return errorResponse(
      { code: "NOT_A_PDF", message: "Only PDF files are supported." },
      400
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return errorResponse(
      { code: "FILE_TOO_LARGE", message: "That statement is larger than the 15MB limit." },
      413
    );
  }

  // Read fully into memory — no writes to local disk, per the stateless requirement.
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const ai = new GoogleGenAI({ apiKey });

  let lastError: unknown = null;
  let sawCapacityError = false;

  for (const model of MODEL_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: base64 } },
              { text: EXTRACTION_PROMPT },
            ],
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      });

      const text = response.text ?? "";
      if (!text.trim()) {
        throw new Error("Empty model response");
      }

      let rawJson: unknown;
      try {
        rawJson = extractJson(text);
      } catch (parseErr) {
        console.error(`[${model}] JSON.parse failed. Raw response:`, text.slice(0, 2000));
        throw parseErr;
      }

      const parsed = coerceExtraction(rawJson);
      if (!parsed) {
        console.error(`[${model}] Unrecognized response shape. Raw response:`, text.slice(0, 2000));
        throw new Error("Model response did not match the expected shape");
      }

      if (parsed.transactions.length === 0) {
        return errorResponse(
          {
            code: "UNREADABLE",
            message:
              "We couldn't find any transactions in this statement. It may be corrupted, password-protected, or not a bank statement.",
          },
          422
        );
      }

      return NextResponse.json<ConvertSuccessBody>({
        result: parsed,
        modelUsed: model,
      });
    } catch (err) {
      lastError = err;
      if (isAuthError(err)) {
        return errorResponse(
          {
            code: "SERVER_CONFIG",
            message: "Server configuration issue. Please try again later.",
          },
          500
        );
      }
      if (isCapacityError(err)) {
        sawCapacityError = true;
      }
      // Try the next model for anything else too — a 404 "model not found"
      // (e.g. a deprecated model id) or a malformed-JSON response from one
      // model doesn't mean every model in the chain will fail the same way.
      // Only an auth error (handled above) applies to the whole key, so
      // that's the sole case that returns early.
      continue;
    }
  }

  if (sawCapacityError) {
    return errorResponse(
      {
        code: "CAPACITY",
        message: "The service is currently experiencing high demand. Please wait 10 seconds and try again.",
      },
      429
    );
  }

  console.error("Statement extraction failed:", lastError);
  return errorResponse(
    {
      code: "UNREADABLE",
      message:
        "We couldn't parse this statement. It may be corrupted, password-protected, or in an unsupported format.",
    },
    422
  );
}
