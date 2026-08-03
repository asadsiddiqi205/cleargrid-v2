"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Part 6.1 — Shared error badge shown on any node that failed publish validation.
 *
 * Reads a message from `data._error` (populated by handlePublish in journey-canvas.tsx).
 * Renders a small red pill top-right with an alert icon; hovering the pill reveals
 * the full message. Callers pass a `severity` so the same component can also render
 * warnings in amber.
 */
export function NodeErrorBadge({
  message,
  severity = "blocker",
  side = "right",
}: {
  message?: string;
  severity?: "blocker" | "warning";
  side?: "left" | "right";
}) {
  const [hover, setHover] = useState(false);
  if (!message) return null;
  const tone =
    severity === "blocker"
      ? "bg-error-500 text-white border-error-400"
      : "bg-warning-500 text-black border-warning-400";
  return (
    <div
      className={`absolute z-30 ${side === "right" ? "-right-2" : "-left-2"} -top-2`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold shadow-md ${tone}`}
      >
        <AlertTriangle className="h-2.5 w-2.5" />
        <span>{severity === "blocker" ? "Error" : "Warning"}</span>
      </div>
      {hover && (
        <div className="pointer-events-none absolute top-full mt-1 w-56 rounded-md border border-border bg-popover p-2 text-[10px] leading-relaxed text-foreground shadow-xl">
          {message}
        </div>
      )}
    </div>
  );
}
