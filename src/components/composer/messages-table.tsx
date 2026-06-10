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
  Copy,
  Trash2,
  Mail,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import {
  messagesList,
  type MessageStatus,
  type MessageChannel,
  type MessageListItem,
} from "@/data/messages";
import { lenders } from "@/data/lenders";
import { MessageStatusPills } from "@/components/composer/message-funnel";

const STATUS_CONFIG: Record<MessageStatus, { className: string; label: string }> = {
  draft: {
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    label: "Draft",
  },
  scheduled: {
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    label: "Scheduled",
  },
  sent: {
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    label: "Sent",
  },
  failed: {
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    label: "Failed",
  },
};

const CHANNEL_ICONS: Record<MessageChannel, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
};

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

const ALL = "all";

function getLenderName(id: string): string {
  if (id === "general") return "General";
  return lenders.find((l) => l.id === id)?.shortName ?? id;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CREATORS = Array.from(new Set(messagesList.map((m) => m.createdBy))).sort();

export function MessagesTable() {
  const [items, setItems] = useState<MessageListItem[]>(messagesList);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [lenderFilter, setLenderFilter] = useState(ALL);
  const [createdByFilter, setCreatedByFilter] = useState(ALL);
  const [createdDateFrom, setCreatedDateFrom] = useState("");
  const [sentDateFrom, setSentDateFrom] = useState("");

  const filtered = useMemo(() => {
    return items.filter((m) => {
      if (search && !m.subject.toLowerCase().includes(search.toLowerCase())) return false;
      if (channelFilter !== ALL && m.channel !== channelFilter) return false;
      if (statusFilter !== ALL && m.status !== statusFilter) return false;
      if (lenderFilter !== ALL && m.lenderId !== lenderFilter) return false;
      if (createdByFilter !== ALL && m.createdBy !== createdByFilter) return false;
      if (createdDateFrom && m.createdAt.slice(0, 10) < createdDateFrom) return false;
      if (sentDateFrom && (!m.sentAt || m.sentAt.slice(0, 10) < sentDateFrom)) return false;
      return true;
    });
  }, [
    items,
    search,
    channelFilter,
    statusFilter,
    lenderFilter,
    createdByFilter,
    createdDateFrom,
    sentDateFrom,
  ]);

  const hasFilters =
    channelFilter !== ALL ||
    statusFilter !== ALL ||
    lenderFilter !== ALL ||
    createdByFilter !== ALL ||
    createdDateFrom ||
    sentDateFrom ||
    search;

  function clearFilters() {
    setChannelFilter(ALL);
    setStatusFilter(ALL);
    setLenderFilter(ALL);
    setCreatedByFilter(ALL);
    setCreatedDateFrom("");
    setSentDateFrom("");
    setSearch("");
  }

  function handleDuplicate(m: MessageListItem) {
    const copy: MessageListItem = {
      ...m,
      id: `${m.id}-copy-${Date.now()}`,
      subject: `${m.subject} (Copy)`,
      status: "draft",
      sentAt: null,
      createdAt: new Date().toISOString(),
      openRate: null,
      clickRate: null,
      replyRate: null,
    };
    setItems((prev) => [copy, ...prev]);
    toast.success("Message duplicated");
  }

  function handleDelete(m: MessageListItem) {
    setItems((prev) => prev.filter((x) => x.id !== m.id));
    toast.success(`"${m.subject}" deleted`);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject..."
              className="h-9 w-[220px] pl-8 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Channel</Label>
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v ?? ALL)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? ALL)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Lender</Label>
          <Select value={lenderFilter} onValueChange={(v) => setLenderFilter(v ?? ALL)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All lenders</SelectItem>
              <SelectItem value="general">General</SelectItem>
              {lenders.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Created by
          </Label>
          <Select value={createdByFilter} onValueChange={(v) => setCreatedByFilter(v ?? ALL)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All users</SelectItem>
              {CREATORS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Created date
          </Label>
          <input
            type="date"
            value={createdDateFrom}
            onChange={(e) => setCreatedDateFrom(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Sent date
          </Label>
          <input
            type="date"
            value={sentDateFrom}
            onChange={(e) => setSentDateFrom(e.target.value)}
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
              <TableHead>Subject</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-right">Recipients</TableHead>
              <TableHead>Funnel</TableHead>
              <TableHead className="text-right">Goal</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => {
              const ChIcon = CHANNEL_ICONS[m.channel];
              return (
                <TableRow key={m.id}>
                  <TableCell className="max-w-[280px]">
                    <Link
                      href={`/email-generator/${m.id}`}
                      className="line-clamp-1 text-sm font-medium text-primary hover:underline underline-offset-4"
                    >
                      {m.subject}
                    </Link>
                    {m.playbookName && (
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        Playbook: {m.playbookName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      <ChIcon className="h-3 w-3" />
                      {CHANNEL_LABELS[m.channel]}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <span className="line-clamp-1 text-xs text-muted-foreground">{m.audience}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getLenderName(m.lenderId)}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_CONFIG[m.status].className}>{STATUS_CONFIG[m.status].label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.createdBy}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(m.sentAt)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {m.recipients.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <MessageStatusPills funnel={m.funnel} channel={m.channel} />
                  </TableCell>
                  <TableCell className="text-right">
                    {m.funnel ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs font-medium tabular-nums text-foreground">
                          {m.funnel.goal.count.toLocaleString()} {m.funnel.goal.label.toLowerCase()}
                        </span>
                        {m.funnel.goal.valueLabel && (
                          <span className="text-[10px] text-muted-foreground">
                            {m.funnel.goal.valueLabel}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Duplicate"
                        onClick={() => handleDuplicate(m)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Delete"
                        onClick={() => handleDelete(m)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <p className="text-sm font-medium text-foreground">No messages match</p>
                    <p className="text-xs">Try a different search or clear the filters.</p>
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
