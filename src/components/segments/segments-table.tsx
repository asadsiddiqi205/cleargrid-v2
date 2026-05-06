"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Eye, Pencil, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Segment, segments } from "@/data/segments"
import { formatNumber, formatDate } from "@/lib/formatters"

const columns: ColumnDef<Segment>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.description}</p>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Updates",
    cell: ({ row }) => (
      <Badge
        className={
          row.original.type === "Dynamic"
            ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
        }
      >
        {row.original.type === "Dynamic" ? "Auto" : "Fixed"}
      </Badge>
    ),
  },
  {
    accessorKey: "filters",
    header: "Filters",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.filters} filters</span>
    ),
  },
  {
    accessorKey: "borrowers",
    header: "How many borrowers",
    cell: ({ row }) => formatNumber(row.original.borrowers),
  },
  {
    accessorKey: "lastEvaluated",
    header: "Last refreshed",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.lastEvaluated)}</span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          title="View"
          onClick={() => toast.info(`Opening "${row.original.name}"`)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          title="Edit"
          onClick={() => toast.info(`Editing "${row.original.name}"`)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          title="Duplicate"
          onClick={() => toast.success(`Segment "${row.original.name}" duplicated`)}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          title="Delete"
          onClick={() => toast.success(`Segment "${row.original.name}" deleted`)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  },
]

export function SegmentsTable() {
  return (
    <DataTable
      columns={columns}
      data={segments}
      searchPlaceholder="Search segments..."
    />
  )
}
