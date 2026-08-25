"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Search } from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"
import { Input } from "@/components/ui/input"
import { borrowers } from "@/data/borrowers"
import { formatAED } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const RISK_TONE: Record<"Low" | "Medium" | "High", string> = {
  Low: "text-primary",
  Medium: "text-warning-300",
  High: "text-error-300",
}

export default function BorrowersPage() {
  const [q, setQ] = React.useState("")
  const list = React.useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return borrowers
    return borrowers.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query) ||
        b.phone.includes(query) ||
        b.emiratesId.includes(query) ||
        b.product.toLowerCase().includes(query),
    )
  }, [q])

  return (
    <PageShell
      title="All Borrowers"
      description="View and manage all borrowers across lenders. Click any borrower to open their profile and trace their journey history."
    >
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, ID, phone, product…"
            className="h-9 pl-8 text-[12px]"
          />
        </div>
        <div className="rounded-lg border border-border bg-card/40">
          <ul className="divide-y divide-border">
            {list.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/borrowers/${b.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[11px] font-semibold text-foreground">
                    {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-foreground">
                      {b.name}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {b.emiratesId} · {b.phone} · {b.product}
                    </div>
                  </div>
                  <div className="hidden text-right text-[11px] tabular-nums sm:block">
                    <div className="font-medium text-foreground">{formatAED(b.outstanding)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {b.dpdBucket} DPD ·{" "}
                      <span className={cn("font-medium", RISK_TONE[b.riskScore])}>
                        {b.riskScore} risk
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
            {list.length === 0 && (
              <li className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                No borrowers match.
              </li>
            )}
          </ul>
        </div>
      </div>
    </PageShell>
  )
}
