"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import {
  ChevronDown,
  ChevronRight,
  Mail,
  MessageSquare,
  MessageCircle,
  Plus,
  Search,
  ArrowLeft,
  Save,
  MoreVertical,
  Copy,
  Archive,
  Trash2,
  FileText,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  templates as ALL_TEMPLATES,
  type Template,
  type TemplatePurpose,
  type TemplateChannel,
  PURPOSE_LABELS,
  CHANNEL_LABELS,
  PURPOSE_ORDER,
  CHANNEL_ORDER,
  AVAILABLE_VARIABLES,
  getLenderIdsWithTemplates,
} from "@/data/templates";
import { lenders, ALL_LENDERS } from "@/data/lenders";
import { useLender } from "@/contexts/lender-context";

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────── */

const CHANNEL_ICONS: Record<TemplateChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
};

const CHANNEL_TINTS: Record<TemplateChannel, string> = {
  email: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  sms: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  whatsapp: "text-green-400 bg-green-500/10 border-green-500/20",
};

const STATUS_TINTS: Record<Template["status"], string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  draft: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  archived: "text-red-400 bg-red-500/10 border-red-500/20",
};

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function getLenderName(lenderId: string): string {
  if (lenderId === "general") return "General";
  const l = lenders.find((l) => l.id === lenderId);
  return l?.shortName ?? l?.name ?? lenderId;
}

interface Selection {
  type: "all" | "lender" | "purpose";
  lenderId?: string;
  purpose?: TemplatePurpose;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Lender / Purpose tree (left panel)
 * ──────────────────────────────────────────────────────────────────────── */

function LenderTree({
  templates,
  selection,
  onSelect,
  expandedLenders,
  onToggleLender,
}: {
  templates: Template[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  expandedLenders: Set<string>;
  onToggleLender: (lenderId: string) => void;
}) {
  // Group templates by lender, then by purpose
  const lenderIdsInOrder = React.useMemo(() => getLenderIdsWithTemplates(), []);

  const grouped = React.useMemo(() => {
    const m = new Map<string, Map<TemplatePurpose, number>>();
    for (const t of templates) {
      if (!m.has(t.lenderId)) m.set(t.lenderId, new Map());
      const inner = m.get(t.lenderId)!;
      inner.set(t.purpose, (inner.get(t.purpose) ?? 0) + 1);
    }
    return m;
  }, [templates]);

  const totalCount = templates.length;

  return (
    <div className="flex h-full w-full flex-col">
      {/* All templates */}
      <button
        type="button"
        onClick={() => onSelect({ type: "all" })}
        className={cn(
          "group flex w-full items-center justify-between border-l-2 px-4 py-2.5 text-left text-sm transition-colors",
          selection.type === "all"
            ? "border-l-primary bg-primary/10 text-foreground"
            : "border-l-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        )}
      >
        <span className="flex items-center gap-2 font-medium">
          <FileText className="size-4" />
          All templates
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{totalCount}</span>
      </button>

      <div className="mt-2 flex-1 overflow-y-auto">
        {lenderIdsInOrder.map((lenderId) => {
          const purposeMap = grouped.get(lenderId);
          if (!purposeMap || purposeMap.size === 0) return null;

          const lenderTotal = Array.from(purposeMap.values()).reduce(
            (sum, n) => sum + n,
            0,
          );

          const isExpanded = expandedLenders.has(lenderId);
          const lenderName = getLenderName(lenderId);
          const lenderSelected =
            selection.type === "lender" && selection.lenderId === lenderId;

          return (
            <div key={lenderId} className="mb-1">
              {/* Lender header */}
              <div
                className={cn(
                  "group flex items-center border-l-2",
                  lenderSelected
                    ? "border-l-primary bg-primary/10"
                    : "border-l-transparent",
                )}
              >
                <button
                  type="button"
                  onClick={() => onToggleLender(lenderId)}
                  className="flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSelect({ type: "lender", lenderId })}
                  className="flex flex-1 items-center justify-between py-2 pr-4 text-left"
                >
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-wider",
                      lenderSelected ? "text-primary" : "text-muted-foreground/80",
                    )}
                  >
                    {lenderName}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">
                    {lenderTotal}
                  </span>
                </button>
              </div>

              {/* Purpose folders */}
              {isExpanded && (
                <div>
                  {PURPOSE_ORDER.filter((p) => purposeMap.has(p)).map((purpose) => {
                    const count = purposeMap.get(purpose) ?? 0;
                    const isSelected =
                      selection.type === "purpose" &&
                      selection.lenderId === lenderId &&
                      selection.purpose === purpose;

                    return (
                      <button
                        key={`${lenderId}-${purpose}`}
                        type="button"
                        onClick={() =>
                          onSelect({ type: "purpose", lenderId, purpose })
                        }
                        className={cn(
                          "flex w-full items-center justify-between border-l-2 py-1.5 pr-4 pl-10 text-left text-sm transition-colors",
                          isSelected
                            ? "border-l-primary bg-primary/10 text-foreground"
                            : "border-l-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{PURPOSE_LABELS[purpose]}</span>
                        <span className="ml-2 shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Template card (right panel)
 * ──────────────────────────────────────────────────────────────────────── */

function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  template: Template;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const ChannelIcon = CHANNEL_ICONS[template.channel];

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border",
              CHANNEL_TINTS[template.channel],
            )}
          >
            <ChannelIcon className="size-4" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Template actions" />
              }
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="size-3.5" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete}>
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Channel label + name */}
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {CHANNEL_LABELS[template.channel]}
          </p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
            {template.name}
          </h3>
        </div>

        {/* Body preview */}
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {template.subject ? (
            <span className="font-medium text-foreground/90">
              {template.subject} —{" "}
            </span>
          ) : null}
          {template.body}
        </p>

        {/* Variables count */}
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px]", STATUS_TINTS[template.status])}>
            {template.status}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {template.variables.length} variables
          </span>
        </div>

        {/* Stats */}
        <div className="text-[11px] text-muted-foreground">
          {template.sentCount > 0 ? (
            <span>
              <span className="font-medium text-foreground/80">
                {formatNumber(template.sentCount)}
              </span>{" "}
              sent
              {template.channel === "email" && template.openRate > 0 && (
                <>
                  <span className="px-1 text-border">·</span>
                  <span className="font-medium text-foreground/80">
                    {template.openRate}%
                  </span>{" "}
                  open
                </>
              )}
              <span className="px-1 text-border">·</span>
              <span className="font-medium text-foreground/80">
                {template.conversionRate}%
              </span>{" "}
              conv
            </span>
          ) : (
            <span className="italic">Not used yet</span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button onClick={onEdit} size="sm" className="flex-1">
            Edit
          </Button>
          <Link
            href={`/email-generator?template=${template.id}`}
            className="inline-flex h-7 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Wand2 className="size-3.5" />
            Use
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Inline editor (replaces the right panel content when editing)
 * ──────────────────────────────────────────────────────────────────────── */

interface EditableTemplate {
  id: string;
  name: string;
  channel: TemplateChannel;
  subject: string;
  body: string;
}

function fromTemplate(t: Template): EditableTemplate {
  return {
    id: t.id,
    name: t.name,
    channel: t.channel,
    subject: t.subject ?? "",
    body: t.body,
  };
}

function renderPreview(text: string): string {
  return text
    .replaceAll("{{borrower_name}}", "Ahmed Al-Mansoori")
    .replaceAll("{{amount_due}}", "1,250.00")
    .replaceAll("{{due_date}}", "12 Apr 2026")
    .replaceAll("{{lender_name}}", "ClearGrid")
    .replaceAll("{{payment_link}}", "https://pay.cleargrid.ae/abc123")
    .replaceAll("{{agent_name}}", "Sara Khalil")
    .replaceAll("{{contact_phone}}", "+971 4 123 4567")
    .replaceAll("{{account_number}}", "ACC-998877")
    .replaceAll("{{reference_id}}", "REF-99X4VW")
    .replaceAll("{{settlement_amount}}", "850.00")
    .replaceAll("{{discount_percent}}", "30")
    .replaceAll("{{expiry_date}}", "30 Apr 2026")
    .replaceAll("{{dpd}}", "47");
}

function InlineEditor({
  template,
  onBack,
  onSave,
}: {
  template: Template;
  onBack: () => void;
  onSave: () => void;
}) {
  const [draft, setDraft] = React.useState<EditableTemplate>(() => fromTemplate(template));
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);
  const subjectRef = React.useRef<HTMLInputElement | null>(null);
  const [activeField, setActiveField] = React.useState<"subject" | "body">("body");

  React.useEffect(() => {
    setDraft(fromTemplate(template));
    setActiveField("body");
  }, [template]);

  const ChannelIcon = CHANNEL_ICONS[draft.channel];

  function insertVariable(token: string) {
    if (activeField === "subject" && draft.channel === "email") {
      const el = subjectRef.current;
      if (!el) {
        setDraft((d) => ({ ...d, subject: d.subject + token }));
        return;
      }
      const start = el.selectionStart ?? draft.subject.length;
      const end = el.selectionEnd ?? draft.subject.length;
      const next = draft.subject.slice(0, start) + token + draft.subject.slice(end);
      setDraft((d) => ({ ...d, subject: next }));
      // restore cursor on next tick
      requestAnimationFrame(() => {
        el.focus();
        const caret = start + token.length;
        el.setSelectionRange(caret, caret);
      });
      return;
    }

    const el = bodyRef.current;
    if (!el) {
      setDraft((d) => ({ ...d, body: d.body + token }));
      return;
    }
    const start = el.selectionStart ?? draft.body.length;
    const end = el.selectionEnd ?? draft.body.length;
    const next = draft.body.slice(0, start) + token + draft.body.slice(end);
    setDraft((d) => ({ ...d, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  }

  function handleSave() {
    toast.success("Template saved");
    onSave();
  }

  const smsCharCount = draft.body.length;
  const smsOverLimit = smsCharCount > 160;

  return (
    <div className="flex h-full flex-col">
      {/* Editor header */}
      <div className="flex items-center justify-between border-b border-border bg-background/50 px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-md border",
                CHANNEL_TINTS[draft.channel],
              )}
            >
              <ChannelIcon className="size-3.5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {getLenderName(template.lenderId)} ·{" "}
                {PURPOSE_LABELS[template.purpose]} · {CHANNEL_LABELS[draft.channel]}
              </p>
              <h2 className="text-sm font-semibold">{draft.name}</h2>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="size-3.5" />
            Save changes
          </Button>
        </div>
      </div>

      {/* Editor body */}
      <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_360px]">
        {/* Left: form */}
        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label htmlFor="tmpl-name">Template name</Label>
            <Input
              id="tmpl-name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>

          {/* Email-specific fields */}
          {draft.channel === "email" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tmpl-subject">Subject line</Label>
                <Input
                  id="tmpl-subject"
                  ref={subjectRef}
                  value={draft.subject}
                  onFocus={() => setActiveField("subject")}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, subject: e.target.value }))
                  }
                  className="font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmpl-body">Body</Label>
                <Textarea
                  id="tmpl-body"
                  ref={bodyRef}
                  value={draft.body}
                  onFocus={() => setActiveField("body")}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, body: e.target.value }))
                  }
                  className="min-h-[360px] font-mono text-[13px] leading-relaxed"
                />
              </div>
            </>
          )}

          {/* SMS-specific */}
          {draft.channel === "sms" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tmpl-body">Message</Label>
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    smsOverLimit ? "text-amber-400" : "text-muted-foreground",
                  )}
                >
                  {smsCharCount}/160
                </span>
              </div>
              <Textarea
                id="tmpl-body"
                ref={bodyRef}
                value={draft.body}
                onFocus={() => setActiveField("body")}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                className="min-h-[160px] font-mono text-[13px] leading-relaxed"
              />
              {smsOverLimit && (
                <p className="text-[11px] text-amber-400">
                  This message exceeds 160 characters and will be split across multiple SMS.
                </p>
              )}
            </div>
          )}

          {/* WhatsApp-specific */}
          {draft.channel === "whatsapp" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="border-green-500/20 bg-green-500/10 text-green-400">
                  Approved template
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  Edits will require WhatsApp re-approval before sending.
                </span>
              </div>
              <Label htmlFor="tmpl-body">Body</Label>
              <Textarea
                id="tmpl-body"
                ref={bodyRef}
                value={draft.body}
                onFocus={() => setActiveField("body")}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                className="min-h-[280px] font-mono text-[13px] leading-relaxed"
              />
            </div>
          )}

          {/* Live preview */}
          <div className="space-y-2 pt-2">
            <Label>Preview (sample data)</Label>
            <Card className="bg-muted/30">
              <CardContent className="space-y-3 p-4">
                {draft.channel === "email" && draft.subject && (
                  <p className="text-sm font-semibold">
                    {renderPreview(draft.subject)}
                  </p>
                )}
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">
                  {renderPreview(draft.body)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: variables panel */}
        <div className="flex flex-col gap-3 overflow-y-auto border-t border-border p-6 lg:border-l lg:border-t-0">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Variables
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Click a variable to insert it at the cursor
              {draft.channel === "email" ? ` in the ${activeField}` : ""}.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {AVAILABLE_VARIABLES.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => insertVariable(v.token)}
                className="group flex flex-col items-start gap-0.5 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="font-mono text-[12px] text-primary">{v.token}</span>
                <span className="text-[10px] text-muted-foreground">
                  {v.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Create Template dialog (multi-step)
 * ──────────────────────────────────────────────────────────────────────── */

function CreateTemplateDialog({
  open,
  onOpenChange,
  defaultLenderId,
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  defaultLenderId: string;
}) {
  const [step, setStep] = React.useState(1);
  const [lenderId, setLenderId] = React.useState<string>(defaultLenderId);
  const [purpose, setPurpose] = React.useState<TemplatePurpose | "">("");
  const [channel, setChannel] = React.useState<TemplateChannel | "">("");
  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [activeField, setActiveField] = React.useState<"subject" | "body">("body");
  const newBodyRef = React.useRef<HTMLTextAreaElement | null>(null);
  const newSubjectRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setLenderId(defaultLenderId);
      setPurpose("");
      setChannel("");
      setName("");
      setSubject("");
      setBody("");
      setActiveField("body");
    }
  }, [open, defaultLenderId]);

  function insertNewVariable(token: string) {
    if (channel === "email" && activeField === "subject") {
      const el = newSubjectRef.current;
      if (!el) {
        setSubject((s) => s + token);
        return;
      }
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + token + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        const caret = start + token.length;
        el.setSelectionRange(caret, caret);
      });
      return;
    }
    const el = newBodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  }

  const newSmsCharCount = body.length;
  const newSmsOverLimit = newSmsCharCount > 160;

  const lenderOptions = React.useMemo(() => {
    return [
      { id: "general", name: "General (reusable)" },
      ...lenders.map((l) => ({ id: l.id, name: l.name })),
    ];
  }, []);

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Please give your template a name");
      return;
    }
    toast.success(`Template "${name}" created`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => onOpenChange(v)}>
      <DialogContent className={cn("sm:max-w-lg", step === 4 && "sm:max-w-3xl")}>
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>
            Step {step} of 4 — {step === 1 && "pick a lender"}
            {step === 2 && "pick a purpose"}
            {step === 3 && "pick a channel"}
            {step === 4 && "write the content"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-2">
            <Label>Lender</Label>
            <Select
              value={lenderId}
              onValueChange={(v: string | null) => setLenderId(v ?? "general")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select lender" />
              </SelectTrigger>
              <SelectContent>
                {lenderOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Label>Purpose</Label>
            <div className="grid grid-cols-1 gap-2">
              {PURPOSE_ORDER.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    purpose === p
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:bg-muted/40",
                  )}
                >
                  {PURPOSE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <Label>Channel</Label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_ORDER.map((c) => {
                const Icon = CHANNEL_ICONS[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      channel === c
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-muted/40",
                    )}
                  >
                    <Icon className="size-4" />
                    {CHANNEL_LABELS[c]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
            {/* Left: editor */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-name">Template name</Label>
                <Input
                  id="new-name"
                  value={name}
                  placeholder="e.g. Payment Reminder — Soft"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {channel === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="new-subject">Subject line</Label>
                  <Input
                    id="new-subject"
                    ref={newSubjectRef}
                    value={subject}
                    onFocus={() => setActiveField("subject")}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Reminder: your payment of {{amount_due}} is due"
                    className="font-medium"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-body">{channel === "email" ? "Body" : "Message"}</Label>
                  {channel === "sms" && (
                    <span
                      className={cn(
                        "text-[11px] font-medium tabular-nums",
                        newSmsOverLimit ? "text-amber-400" : "text-muted-foreground",
                      )}
                    >
                      {newSmsCharCount}/160
                    </span>
                  )}
                </div>
                <Textarea
                  id="new-body"
                  ref={newBodyRef}
                  value={body}
                  onFocus={() => setActiveField("body")}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your template content here. Click a variable on the right to insert it at the cursor."
                  className={cn(
                    "font-mono text-[13px] leading-relaxed",
                    channel === "email" ? "min-h-[200px]" : "min-h-[140px]",
                  )}
                />
                {channel === "sms" && newSmsOverLimit && (
                  <p className="text-[11px] text-amber-400">
                    This message exceeds 160 characters and will be split across multiple SMS.
                  </p>
                )}
              </div>

              {/* Live preview */}
              {(subject || body) && (
                <div className="space-y-1.5">
                  <Label>Preview (sample data)</Label>
                  <Card className="bg-muted/30">
                    <CardContent className="space-y-2 p-3">
                      {channel === "email" && subject && (
                        <p className="text-sm font-semibold">{renderPreview(subject)}</p>
                      )}
                      <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-foreground/90">
                        {renderPreview(body)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Right: variable picker */}
            <div className="space-y-2 lg:border-l lg:border-border lg:pl-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Variables
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Click to insert at cursor
                {channel === "email" ? ` in ${activeField}` : ""}.
              </p>
              <div className="flex max-h-[400px] flex-col gap-1.5 overflow-y-auto pr-1">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertNewVariable(v.token)}
                    className="group flex flex-col items-start gap-0.5 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="font-mono text-[11px] text-primary">{v.token}</span>
                    <span className="text-[10px] text-muted-foreground">{v.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              onClick={() => {
                if (step === 1 && !lenderId) {
                  toast.error("Please pick a lender");
                  return;
                }
                if (step === 2 && !purpose) {
                  toast.error("Please pick a purpose");
                  return;
                }
                if (step === 3 && !channel) {
                  toast.error("Please pick a channel");
                  return;
                }
                setStep((s) => s + 1);
              }}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate}>
              <Plus className="size-3.5" />
              Create template
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Right panel — grid of templates (or grouped)
 * ──────────────────────────────────────────────────────────────────────── */

function TemplateGrid({
  templates,
  onEdit,
  groupByPurpose,
}: {
  templates: Template[];
  onEdit: (t: Template) => void;
  groupByPurpose: boolean;
}) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
        <FileText className="mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-semibold text-foreground">No templates found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No templates match the current filters.
        </p>
      </div>
    );
  }

  const handleDuplicate = (t: Template) => toast.success(`Duplicated "${t.name}"`);
  const handleArchive = (t: Template) => toast.success(`Archived "${t.name}"`);
  const handleDelete = (t: Template) => toast.success(`Deleted "${t.name}"`);

  if (!groupByPurpose) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onEdit={() => onEdit(t)}
            onDuplicate={() => handleDuplicate(t)}
            onArchive={() => handleArchive(t)}
            onDelete={() => handleDelete(t)}
          />
        ))}
      </div>
    );
  }

  // Group templates by purpose
  const groups = new Map<TemplatePurpose, Template[]>();
  for (const t of templates) {
    if (!groups.has(t.purpose)) groups.set(t.purpose, []);
    groups.get(t.purpose)!.push(t);
  }

  const ordered = PURPOSE_ORDER.filter((p) => groups.has(p));

  return (
    <div className="space-y-8">
      {ordered.map((purpose) => {
        const list = groups.get(purpose) ?? [];
        // Sort by channel order
        const sorted = [...list].sort(
          (a, b) =>
            CHANNEL_ORDER.indexOf(a.channel) - CHANNEL_ORDER.indexOf(b.channel),
        );
        return (
          <section key={purpose} className="space-y-3">
            <div className="flex items-baseline justify-between border-b border-border/40 pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
                {PURPOSE_LABELS[purpose]}
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {sorted.length} {sorted.length === 1 ? "channel" : "channels"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {sorted.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => onEdit(t)}
                  onDuplicate={() => handleDuplicate(t)}
                  onArchive={() => handleArchive(t)}
                  onDelete={() => handleDelete(t)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Main view
 * ──────────────────────────────────────────────────────────────────────── */

export function TemplatesView() {
  const { selectedLenderId, setSelectedLender } = useLender();

  // Selection in the left tree
  const [selection, setSelection] = React.useState<Selection>({ type: "all" });

  // Expanded lenders in the tree
  const [expandedLenders, setExpandedLenders] = React.useState<Set<string>>(() => {
    const s = new Set<string>();
    s.add("general");
    if (selectedLenderId !== ALL_LENDERS) s.add(selectedLenderId);
    return s;
  });

  // Sub-header filters
  const [purposeFilter, setPurposeFilter] = React.useState<string>("all");
  const [channelFilter, setChannelFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState<string>("");

  // Inline editor
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = React.useState(false);

  // Sync to global lender — when global changes from outside, expand & select.
  // We compare against the current selection to avoid overriding a more specific
  // purpose selection just because we just bumped the global lender.
  React.useEffect(() => {
    if (selectedLenderId === ALL_LENDERS) return;
    setExpandedLenders((prev) => {
      if (prev.has(selectedLenderId)) return prev;
      const next = new Set(prev);
      next.add(selectedLenderId);
      return next;
    });
    setSelection((prev) => {
      // If we're already showing a section of this lender, don't clobber it
      if (prev.lenderId === selectedLenderId) return prev;
      return { type: "lender", lenderId: selectedLenderId };
    });
  }, [selectedLenderId]);

  function handleSelect(s: Selection) {
    setSelection(s);
    // Reset filters when changing tree selection
    setPurposeFilter("all");
    // Sync the global lender for non-general selections, but only when actually different
    if (
      (s.type === "lender" || s.type === "purpose") &&
      s.lenderId &&
      s.lenderId !== "general" &&
      s.lenderId !== selectedLenderId
    ) {
      setSelectedLender(s.lenderId);
    }
    setEditingTemplate(null);
  }

  function toggleLender(lenderId: string) {
    setExpandedLenders((prev) => {
      const next = new Set(prev);
      if (next.has(lenderId)) next.delete(lenderId);
      else next.add(lenderId);
      return next;
    });
  }

  // Filter templates based on selection + sub-header filters
  const filteredTemplates = React.useMemo(() => {
    let result = ALL_TEMPLATES;

    // Tree selection
    if (selection.type === "lender" && selection.lenderId) {
      result = result.filter((t) => t.lenderId === selection.lenderId);
    } else if (selection.type === "purpose" && selection.lenderId && selection.purpose) {
      result = result.filter(
        (t) => t.lenderId === selection.lenderId && t.purpose === selection.purpose,
      );
    }

    // Sub-header lender filter (only applies on "all" view)
    if (
      selection.type === "all" &&
      selectedLenderId !== ALL_LENDERS
    ) {
      result = result.filter(
        (t) => t.lenderId === selectedLenderId || t.lenderId === "general",
      );
    }

    if (purposeFilter !== "all") {
      result = result.filter((t) => t.purpose === purposeFilter);
    }
    if (channelFilter !== "all") {
      result = result.filter((t) => t.channel === channelFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q) ||
          (t.subject?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [selection, selectedLenderId, purposeFilter, channelFilter, statusFilter, search]);

  // Determine grid grouping mode
  const groupByPurpose = selection.type === "lender" && !!selection.lenderId;

  // Breadcrumb
  const breadcrumb = React.useMemo(() => {
    if (editingTemplate) {
      return `${getLenderName(editingTemplate.lenderId)} › ${PURPOSE_LABELS[editingTemplate.purpose]} › ${CHANNEL_LABELS[editingTemplate.channel]}`;
    }
    if (selection.type === "all") return "All templates";
    if (selection.type === "lender" && selection.lenderId) {
      return getLenderName(selection.lenderId);
    }
    if (selection.type === "purpose" && selection.lenderId && selection.purpose) {
      return `${getLenderName(selection.lenderId)} › ${PURPOSE_LABELS[selection.purpose]}`;
    }
    return "Templates";
  }, [selection, editingTemplate]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Page header */}
      <div className="space-y-4 border-b border-border px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pre-written messages organized by lender and purpose. Each purpose has
              variants for Email, SMS, and WhatsApp.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            New template
          </Button>
        </div>

        {/* Sub-header / filter bar */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="h-9 w-56 pl-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Lender</label>
            <Select
              value={selectedLenderId}
              onValueChange={(v: string | null) => setSelectedLender(v ?? ALL_LENDERS)}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_LENDERS}>All lenders</SelectItem>
                {lenders.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Purpose</label>
            <Select
              value={purposeFilter}
              onValueChange={(v: string | null) => setPurposeFilter(v ?? "all")}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All purposes</SelectItem>
                {PURPOSE_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PURPOSE_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Channel</label>
            <Select
              value={channelFilter}
              onValueChange={(v: string | null) => setChannelFilter(v ?? "all")}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {CHANNEL_ORDER.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(v: string | null) => setStatusFilter(v ?? "all")}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(purposeFilter !== "all" ||
            channelFilter !== "all" ||
            statusFilter !== "all" ||
            search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setPurposeFilter("all");
                setChannelFilter("all");
                setStatusFilter("all");
                setSearch("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Lender / purpose tree */}
        <aside className="hidden w-[280px] shrink-0 border-r border-border bg-background/30 md:flex md:flex-col">
          <LenderTree
            templates={ALL_TEMPLATES}
            selection={selection}
            onSelect={handleSelect}
            expandedLenders={expandedLenders}
            onToggleLender={toggleLender}
          />
        </aside>

        {/* RIGHT — Grid or inline editor */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {editingTemplate ? (
            <InlineEditor
              template={editingTemplate}
              onBack={() => setEditingTemplate(null)}
              onSave={() => setEditingTemplate(null)}
            />
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              {/* Breadcrumb header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{breadcrumb}</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredTemplates.length}{" "}
                    {filteredTemplates.length === 1 ? "template" : "templates"}
                  </p>
                </div>
                {filteredTemplates.length > 0 && (
                  <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
                    <Sparkles className="size-3" />
                    Click any card to edit inline
                  </span>
                )}
              </div>

              <TemplateGrid
                templates={filteredTemplates}
                onEdit={(t) => setEditingTemplate(t)}
                groupByPurpose={groupByPurpose}
              />
            </div>
          )}
        </main>
      </div>

      {/* Create dialog */}
      <CreateTemplateDialog
        open={showCreate}
        onOpenChange={(v) => setShowCreate(v)}
        defaultLenderId={
          selection.type !== "all" && selection.lenderId
            ? selection.lenderId
            : selectedLenderId !== ALL_LENDERS
              ? selectedLenderId
              : "general"
        }
      />
    </div>
  );
}
