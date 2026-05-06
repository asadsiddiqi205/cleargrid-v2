"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  journeyTemplates,
  type JourneyTemplate,
  type TemplateCategory,
  type Channel,
} from "@/data/journeys";
import type { Node, Edge } from "@xyflow/react";

const JourneyCanvas = dynamic(
  () => import("@/components/journeys/journey-canvas"),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: { id: TemplateCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "collections", label: "Collections" },
  { id: "early_delinquency", label: "Early Delinquency" },
  { id: "settlement", label: "Settlement" },
  { id: "hardship", label: "Hardship" },
  { id: "re-engagement", label: "Re-engagement" },
];

const CHANNEL_ICONS: Record<Channel, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  call: Phone,
};

/* ------------------------------------------------------------------ */
/*  Mini SVG flow preview                                              */
/* ------------------------------------------------------------------ */

function FlowMiniPreview({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  if (nodes.length === 0) return null;

  const nodeW = 280;
  const nodeH = 60;
  const minX = Math.min(...nodes.map((n) => n.position.x));
  const minY = Math.min(...nodes.map((n) => n.position.y));
  const maxX = Math.max(...nodes.map((n) => n.position.x + nodeW));
  const maxY = Math.max(...nodes.map((n) => n.position.y + nodeH));
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const W = 140;
  const H = 72;
  const pad = 6;
  const scale = Math.min((W - pad * 2) / rangeX, (H - pad * 2) / rangeY);
  const offX = (W - rangeX * scale) / 2;
  const offY = (H - rangeY * scale) / 2;

  const sx = (x: number) => (x - minX) * scale + offX;
  const sy = (y: number) => (y - minY) * scale + offY;
  const nw = nodeW * scale;
  const nh = nodeH * scale;

  const nodeColor = (type?: string) => {
    if (type === "trigger") return "var(--chart-2)";
    if (type === "condition") return "var(--primary)";
    if (type === "end") return "var(--destructive)";
    return "var(--muted-foreground)";
  };

  return (
    <svg width={W} height={H} className="overflow-visible">
      {edges.map((e) => {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        if (!src || !tgt) return null;
        return (
          <line
            key={e.id}
            x1={sx(src.position.x) + nw / 2}
            y1={sy(src.position.y) + nh}
            x2={sx(tgt.position.x) + nw / 2}
            y2={sy(tgt.position.y)}
            stroke="var(--border)"
            strokeWidth={1.5}
          />
        );
      })}
      {nodes.map((n) => (
        <rect
          key={n.id}
          x={sx(n.position.x)}
          y={sy(n.position.y)}
          width={nw}
          height={nh}
          rx={3}
          fill={nodeColor(n.type)}
          fillOpacity={n.type === "trigger" ? 0.7 : 0.35}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewJourneyPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");
  const [canvasId, setCanvasId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return journeyTemplates;
    return journeyTemplates.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  /* ── Canvas mode ─────────────────────────────────── */
  if (canvasId) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
        <JourneyCanvas journeyId={canvasId} />
      </div>
    );
  }

  /* ── Template picker ─────────────────────────────── */
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">New Journey</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a template to get started or build from scratch.
          </p>
        </div>
        <button
          onClick={() => setCanvasId("new")}
          className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Start from scratch
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-border pb-px">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors",
              activeCategory === cat.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
            {activeCategory === cat.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            onSelect={() => setCanvasId(tpl.id)}
          />
        ))}

        {/* Blank journey card — always last */}
        <button
          onClick={() => setCanvasId("new")}
          className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-primary">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-foreground">Blank journey</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Start with an empty canvas
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Template card                                                      */
/* ------------------------------------------------------------------ */

function TemplateCard({
  template,
  onSelect,
}: {
  template: JourneyTemplate;
  onSelect: () => void;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      {/* Mini flow preview */}
      <div className="flex h-20 items-center justify-center border-b border-border/40 bg-muted/20">
        <FlowMiniPreview nodes={template.nodes} edges={template.edges} />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-medium text-foreground">{template.name}</h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {template.description}
        </p>

        {/* Channels */}
        <div className="flex items-center gap-2">
          {template.channels.map((ch) => {
            const Icon = CHANNEL_ICONS[ch];
            return (
              <span
                key={ch}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground"
                title={ch}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            );
          })}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {template.estimatedSteps} steps · ~{template.estimatedDuration}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Hover overlay button */}
      <div className="absolute inset-x-0 bottom-0 flex translate-y-full justify-center bg-gradient-to-t from-card via-card/95 to-transparent pb-4 pt-8 transition-transform group-hover:translate-y-0">
        <Button size="sm" onClick={onSelect}>
          Use template
        </Button>
      </div>
    </div>
  );
}
