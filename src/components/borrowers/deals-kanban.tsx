"use client";

import * as React from "react";
import {
  Search,
  SlidersHorizontal,
  UserPlus,
  Phone,
  Download,
  Plus,
  ChevronDown,
  LayoutGrid,
  Table,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  deals,
  dealStages,
  getDealsByStage,
  getStageStats,
  type Deal,
  type DealStage,
} from "@/data/deals";

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="space-y-0.5 min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{deal.name}</p>
          <p className="text-xs text-muted-foreground truncate">{deal.phone}</p>
          <p className="text-xs text-muted-foreground truncate">{deal.email}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">{deal.referenceId}</p>
        </div>
        <Checkbox className="mt-0.5" />
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-lg font-semibold text-foreground">
          {formatAmount(deal.amount)}
        </span>
        <span className="text-xs text-muted-foreground">{deal.currency}</span>
      </div>
      <Badge variant="secondary" className="text-xs">
        {deal.stage}
      </Badge>
    </div>
  );
}

function StageColumn({ stage }: { stage: DealStage }) {
  const stageDeals = getDealsByStage(stage);
  const stats = getStageStats(stage);

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      {/* Column header */}
      <div className="rounded-t-lg border border-border bg-card p-3 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{stage}</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Total Count: {stats.count}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Total Amount: {formatAmount(stats.totalAmount)}.00</span>
          <div className="flex items-center gap-1">
            <Checkbox className="h-3 w-3" />
            <span>0 selected</span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 p-2 border-x border-b border-border rounded-b-lg bg-muted/30 overflow-y-auto max-h-[calc(100vh-360px)]">
        {stageDeals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

export function DealsKanban() {
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");

  return (
    <div className="flex-1 flex flex-col p-6 space-y-4">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Collection Ops Borrower Lifecycle</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage borrower lifecycle through collection stages
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Email, Phone or ID"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Advanced Filters
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <UserPlus className="h-3.5 w-3.5" />
          Assign Selected
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Phone className="h-3.5 w-3.5" />
          Call
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export Deals
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Create View
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          All Deals
          <ChevronDown className="h-3 w-3" />
        </Button>

        <div className="ml-auto flex items-center gap-1 rounded-md border border-border">
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-r-none"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs rounded-l-none"
            onClick={() => setViewMode("table")}
          >
            <Table className="h-3.5 w-3.5" />
            Table
          </Button>
        </div>
      </div>

      {/* Bulk actions row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch />
          <span className="text-xs text-muted-foreground">Bulk Skiprace</span>
        </div>
      </div>

      {/* Select all + total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox />
          <span className="text-sm text-muted-foreground">Select All (0 selected)</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Total Deals: <span className="font-medium text-foreground">{deals.length}</span>
        </span>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {dealStages.map((stage) => (
          <StageColumn key={stage} stage={stage} />
        ))}
      </div>
    </div>
  );
}
