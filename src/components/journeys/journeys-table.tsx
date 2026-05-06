"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Search,
  Play,
  Trash2,
  Copy,
} from "lucide-react";
import { journeysList, type JourneyStatus, type JourneyListItem } from "@/data/journeys";

/* ------------------------------------------------------------------ */
/*  Status display helpers                                             */
/* ------------------------------------------------------------------ */

const journeyStatusConfig: Record<JourneyStatus, { className: string; label: string }> = {
  running: {
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    label: "Running",
  },
  scheduled: {
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    label: "Scheduled",
  },
  draft: {
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    label: "Draft",
  },
  completed: {
    className: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    label: "Completed",
  },
  paused: {
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    label: "Paused",
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function JourneysTable() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<JourneyListItem[]>(journeysList);

  const filtered = items.filter((j) =>
    j.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleRun(j: JourneyListItem) {
    toast.success(`Journey "${j.name}" started`);
  }

  function handleDuplicate(j: JourneyListItem) {
    const copy: JourneyListItem = {
      ...j,
      id: `${j.id}-copy-${Date.now()}`,
      name: `${j.name} (Copy)`,
      status: "draft",
      lastRun: null,
      enrolled: 0,
    };
    setItems((prev) => [copy, ...prev]);
    toast.success(`Journey duplicated`);
  }

  function handleDelete(j: JourneyListItem) {
    setItems((prev) => prev.filter((x) => x.id !== j.id));
    toast.success(`Journey "${j.name}" deleted`);
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search journeys..."
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead className="text-right">Enrolled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((journey) => (
              <TableRow key={journey.id}>
                <TableCell>
                  <Link
                    href={`/journeys/${journey.id}`}
                    className="text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors"
                  >
                    {journey.name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {journey.trigger}
                </TableCell>
                <TableCell>
                  <Badge className={journeyStatusConfig[journey.status].className}>
                    {journeyStatusConfig[journey.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {journey.lastRun ?? "\u2014"}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {journey.enrolled.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Run"
                      onClick={() => handleRun(journey)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Duplicate"
                      onClick={() => handleDuplicate(journey)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Delete"
                      onClick={() => handleDelete(journey)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <p className="text-sm font-medium text-foreground">
                      No journeys match
                    </p>
                    <p className="text-xs">
                      Try a different search term or clear the filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
