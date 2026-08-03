"use client"

import * as React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { getSnapshotFor, getSnapshotsForMessage } from "@/data/message-snapshots"
import { renderPrintableHtml } from "@/lib/export-message"

/**
 * Print-friendly PDF route.
 *
 * Opened by the export menu in a new tab as
 *   /email-generator/{messageId}/export/print?borrower={borrowerId}
 *
 * Renders the snapshot inline in a white document and auto-triggers the
 * browser print dialog. The user picks "Save as PDF" from the destination
 * dropdown and gets a real .pdf — no client-side PDF library needed.
 */
export default function PrintPage() {
  return (
    <React.Suspense fallback={null}>
      <PrintInner />
    </React.Suspense>
  )
}

function PrintInner() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const borrowerId = search?.get("borrower") ?? ""
  const [html, setHtml] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!params.id) return
    const snap = borrowerId
      ? getSnapshotFor(params.id, borrowerId)
      : getSnapshotsForMessage(params.id, { limit: 1 })[0]
    if (!snap) {
      setError("Snapshot not found for this borrower + message pair.")
      return
    }
    setHtml(renderPrintableHtml(snap))
  }, [params.id, borrowerId])

  React.useEffect(() => {
    if (!html) return
    // Give the browser a moment to lay out the content, then invoke print.
    const t = window.setTimeout(() => {
      try {
        window.print()
      } catch {
        // No-op if the print dialog is blocked; the user can still Cmd+P.
      }
    }, 350)
    return () => window.clearTimeout(t)
  }, [html])

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, sans-serif" }}>
        <p style={{ color: "#0F172A" }}>Export unavailable: {error}</p>
      </div>
    )
  }
  if (!html) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, sans-serif" }}>
        <p style={{ color: "#0F172A" }}>Preparing record…</p>
      </div>
    )
  }

  return (
    <>
      {/* Reset the app's dark theme for this printable route. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body { background: #FFFFFF !important; color: #0F172A !important; margin: 0; padding: 0; }
            * { color-scheme: light !important; }
            .print-toolbar {
              position: fixed; top: 12px; right: 12px; z-index: 999;
              display: flex; gap: 6px;
              background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 6px 8px;
              box-shadow: 0 4px 12px rgba(15,23,42,0.06);
            }
            .print-toolbar button {
              padding: 4px 10px; border-radius: 4px; border: 1px solid #E5E7EB; background: #FFFFFF;
              font-family: Inter, sans-serif; font-size: 11px; color: #0F172A; cursor: pointer;
            }
            .print-toolbar button:hover { background: #F8FAFC; }
            .print-toolbar button.primary { background: #10B981; color: #FFFFFF; border-color: transparent; }
            .print-toolbar button.primary:hover { background: #0EA97A; }
            @media print { .print-toolbar { display: none !important; } }
          `,
        }}
      />
      <div className="print-toolbar">
        <button onClick={() => window.print()} className="primary">
          Save as PDF (Cmd/Ctrl + P)
        </button>
        <button onClick={() => window.close()}>Close</button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  )
}
