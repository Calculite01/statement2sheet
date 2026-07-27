"use client";

import { useState } from "react";
import { Dropzone } from "@/components/dropzone";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";
import { downloadAsCsv, downloadAsXlsx } from "@/lib/export";
import type { ConvertErrorBody, ConvertSuccessBody } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "converting" | "done";
type Format = "xlsx" | "csv";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [format, setFormat] = useState<Format>("xlsx");
  const { push } = useToast();

  const isConverting = status === "converting";

  function reset() {
    setFile(null);
    setStatus("idle");
  }

  async function handleConvert() {
    if (!file) return;
    setStatus("converting");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ConvertErrorBody | null;
        const message =
          body?.message ??
          "Something went wrong converting this statement. Please try again.";
        push({ title: "Conversion failed", description: message, variant: "error" });
        setStatus("idle");
        return;
      }

      const body = (await res.json()) as ConvertSuccessBody;

      if (format === "xlsx") {
        downloadAsXlsx(body.result, file.name);
      } else {
        downloadAsCsv(body.result, file.name);
      }

      push({
        title: "Converted",
        description: `${body.result.transactions.length} transactions tallied and downloaded.`,
        variant: "success",
      });

      setStatus("done");
      reset();
    } catch {
      push({
        title: "Connection issue",
        description: "Couldn't reach the server. Check your connection and try again.",
        variant: "error",
      });
      setStatus("idle");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
      <header className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-paper-line bg-white px-3 py-1 font-mono text-xs text-slate">
          <span className="h-1.5 w-1.5 rounded-full bg-ledger-green" />
          statement → spreadsheet
        </div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Statement2Sheet
        </h1>
        <p className="mt-2 text-sm text-slate">
          Drop in a bank statement PDF. Get every transaction back as a spreadsheet.
        </p>
      </header>

      <section className="perforated relative rounded-lg border border-paper-line bg-white/60 p-6 shadow-sm backdrop-blur-sm">
        {isConverting && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
          >
            <div className="animate-scan absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-ledger-green/10 to-transparent" />
          </div>
        )}

        <Dropzone
          file={file}
          onFileSelected={(f) => setFile(f)}
          onFileRemoved={reset}
          disabled={isConverting}
        />

        <div className="mt-5 flex items-center justify-between">
          <div
            className="inline-flex rounded-md border border-paper-line bg-paper p-0.5 font-mono text-xs"
            role="radiogroup"
            aria-label="File format"
          >
            {(["xlsx", "csv"] as Format[]).map((f) => (
              <button
                key={f}
                role="radio"
                aria-checked={format === f}
                onClick={() => setFormat(f)}
                disabled={isConverting}
                className={cn(
                  "focus-ring rounded px-3 py-1.5 font-medium uppercase transition-colors disabled:opacity-50",
                  format === f ? "bg-ink text-paper" : "text-slate hover:text-ink"
                )}
              >
                .{f}
              </button>
            ))}
          </div>

          <Button
            onClick={handleConvert}
            disabled={!file || isConverting}
            aria-busy={isConverting}
          >
            {isConverting ? (
              <>
                <span className="tabular">Tallying…</span>
              </>
            ) : (
              "Convert statement"
            )}
          </Button>
        </div>
      </section>

      <p className="mt-6 text-center font-mono text-xs text-slate">
        PDF to Excel/CSV Converter
      </p>
    </main>
  );
}
