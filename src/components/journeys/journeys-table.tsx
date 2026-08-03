"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { lenders } from "@/data/lenders";

/* ------------------------------------------------------------------ */
/*  Status display helpers                                             */
/* ------------------------------------------------------------------ */

const journeyStatusConfig: Record<JourneyStatus, { className: string; label: string }> = {
  running: {
    className: "bg-primary-500/10 text-primary-400 border-primary-500/20",
    label: "Running",
  },
  scheduled: {
    className: "bg-warning-500/10 text-warning-400 border-warning-500/20",
    label: "Scheduled",
  },
  draft: {
    className: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
    label: "Draft",
  },
  completed: {
    className: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    label: "Completed",
  },
  paused: {
    className: "bg-error-500/10 text-error-400 border-error-500/20",
    label: "Paused",
  },
};

const ALL = "all";

function getLenderName(id: string): string {
  if (id === "general") return "General";
  return lenders.find((l) => l.id === id)?.shortName ?? id;
}

/* Unique creators from the data */
const CREATORS = Array.from(new Set(journeysList.map((j) => j.createdBy))).sort();

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function JourneysTable() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<JourneyListItem[]>(journeysList);

  // Filters
  const [createdByFilter, setCreatedByFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [lenderFilter, setLenderFilter] = useState(ALL);
  const [createdDateFrom, setCreatedDateFrom] = useState("");
  const [lastRunFrom, setLastRunFrom] = useState("");

  const filtered = useMemo(() => {
    return items.filter((j) => {
      if (search && !j.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (createdByFilter !== ALL && j.createdBy !== createdByFilter) return false;
      if (statusFilter !== ALL && j.status !== statusFilter) return false;
      if (lenderFilter !== ALL && j.lenderId !== lenderFilter) return false;
      if (createdDateFrom && j.createdDate < createdDateFrom) return false;
      if (lastRunFrom && (!j.lastRun || new Date(j.lastRun).toISOString().slice(0, 10) < lastRunFrom)) return false;
      return true;
    });
  }, [items, search, createdByFilter, statusFilter, lenderFilter, createdDateFrom, lastRunFrom]);

  const hasFilters = createdByFilter !== ALL || statusFilter !== ALL || lenderFilter !== ALL || createdDateFrom || lastRunFrom;

  function clearFilters() {
    setCreatedByFilter(ALL);
    setStatusFilter(ALL);
    setLenderFilter(ALL);
    setCreatedDateFrom("");
    setLastRunFrom("");
    setSearch("");
  }

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search journeys..."
              className="h-9 w-[200px] pl-8 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Created by</Label>
          <Select value={createdByFilter} onValueChange={(v) => setCreatedByFilter(v ?? ALL)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All users</SelectItem>
              {CREATORS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? ALL)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Lender</Label>
          <Select value={lenderFilter} onValueChange={(v) => setLenderFilter(v ?? ALL)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All lenders</SelectItem>
              <SelectItem value="general">General</SelectItem>
              {lenders.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.shortName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Created date</Label>
          <input
            type="date"
            value={createdDateFrom}
            onChange={(e) => setCreatedDateFrom(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Last run date</Label>
          <input
            type="date"
            value={lastRunFrom}
            onChange={(e) => setLastRunFrom(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Created</TableHead>
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
                <TableCell className="text-xs text-muted-foreground">
                  {getLenderName(journey.lenderId)}
                </TableCell>
                <TableCell>
                  <Badge className={journeyStatusConfig[journey.status].className}>
                    {journeyStatusConfig[journey.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {journey.createdBy}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(journey.createdDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
                <TableCell colSpan={9} className="py-10 text-center">
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
