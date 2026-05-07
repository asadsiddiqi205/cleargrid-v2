"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Eye, Zap, Lock, Save } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { FilterBuilder } from "@/components/segments/filter-builder"
import { SegmentPreview } from "@/components/segments/segment-preview"
import { useLender } from "@/contexts/lender-context"

export default function CreateSegmentPage() {
  const router = useRouter()
  const { selectedLender } = useLender()
  const [segmentType, setSegmentType] = React.useState<"static" | "dynamic">(
    "dynamic"
  )
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [filterCount, setFilterCount] = React.useState(0)

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Please add a name before saving this segment.")
      return
    }
    if (filterCount === 0) {
      toast.error("Add at least one filter so the segment has conditions.")
      return
    }
    toast.success(`Segment "${name}" saved`, {
      description:
        "You can now use it when sending a message or building a journey.",
    })
    router.push("/segments")
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* ---------- Page header ---------- */}
      <div className="flex items-start justify-between gap-4 p-6 pb-4 shrink-0">
        <div className="flex items-start gap-3">
          <Link
            href="/segments"
            className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-muted transition-colors mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Link href="/segments" className="hover:text-foreground">
                Segments
              </Link>
              <span>/</span>
              <span className="text-foreground">New segment</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Build a new segment
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Add filters to pick which borrowers belong in this group. For
              example: &ldquo;Borrowers in the UAE who are more than 60 days
              past due.&rdquo;
              {selectedLender && (
                <>
                  {" "}
                  Counts on the right are scoped to{" "}
                  <span className="font-medium text-foreground">
                    {selectedLender.shortName}
                  </span>
                  .
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Two-column body (scrolls), with footer action bar underneath ---------- */}
      <div className="flex-1 flex gap-6 px-6 pb-4 min-h-0">
        {/* LEFT — scrollable form (~65%) */}
        <div className="w-[65%] overflow-y-auto pr-1 space-y-5">
          {/* 1. Segment Details (name + description) */}
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Step 1
              </p>
              <CardTitle>Segment details</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                A short label and description so teammates know what this
                segment is for.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Segment name <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g. UAE 60+ Days Past Due"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Description (optional)
                </label>
                <Textarea
                  placeholder="What is this segment for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Segment Type */}
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Step 2
              </p>
              <CardTitle>How should this segment update?</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Decide whether the list of borrowers stays fixed, or refreshes
                itself every day.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {/* Static option */}
                <button
                  type="button"
                  onClick={() => setSegmentType("static")}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-all cursor-pointer",
                    segmentType === "static"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Lock
                      className={cn(
                        "size-4",
                        segmentType === "static"
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        segmentType === "static"
                          ? "text-primary"
                          : "text-foreground"
                      )}
                    >
                      Fixed list
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Locked in today. The same borrowers stay in this group
                    forever.
                  </p>
                </button>

                {/* Dynamic option */}
                <button
                  type="button"
                  onClick={() => setSegmentType("dynamic")}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-all cursor-pointer",
                    segmentType === "dynamic"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Zap
                      className={cn(
                        "size-4",
                        segmentType === "dynamic"
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        segmentType === "dynamic"
                          ? "text-primary"
                          : "text-foreground"
                      )}
                    >
                      Auto-updating (recommended)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Refreshes every day. Borrowers join or leave as their data
                    changes.
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 3. Filter Builder */}
          <Card>
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Step 3
              </p>
              <CardTitle>Who should be in this segment?</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Add filter conditions below. You can reuse a saved calculated
                field, or create a new one with the calculator.
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <FilterBuilder onChange={setFilterCount} />
            </CardContent>
          </Card>

          {/* 4. Preview trigger — subtle nudge to look at right panel */}
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <p className="text-sm text-muted-foreground">
                See how many borrowers match your filters.
              </p>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  if (filterCount === 0) {
                    toast.error("Add at least one filter to see a preview.")
                    return
                  }
                  toast.success("Live preview updated", {
                    description: "Counts on the right reflect your current filters.",
                  })
                }}
              >
                <Eye className="size-3.5" />
                Preview
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — sticky preview (~35%) */}
        <div className="w-[35%] overflow-y-auto">
          <SegmentPreview
            filterCount={filterCount}
            segmentType={segmentType}
          />
        </div>
      </div>

      {/* ---------- Sticky action bar (lives at the bottom of the page column) ---------- */}
      <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
                filterCount > 0
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              {filterCount > 0
                ? `${filterCount} filter${filterCount === 1 ? "" : "s"} applied`
                : "No filters yet"}
            </span>
            {!name.trim() && (
              <span className="text-[11px] text-muted-foreground/80">
                Add a name above to save.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/segments")}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || filterCount === 0}
              className="gap-1.5"
            >
              <Save className="size-3.5" />
              Save segment
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
