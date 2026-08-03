"use client"

import * as React from "react"
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Eye,
  Send,
  Beaker,
  CheckCircle2,
  Clock,
  Save,
  ChevronDown,
  Sparkles,
  History,
  Library,
  Languages,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  TEMPLATE_STATUS_LABEL,
  TEMPLATE_STATUS_COLOR,
  type TemplateStatus,
} from "@/data/template-versions"
import { cn } from "@/lib/utils"

interface BuilderToolbarProps {
  templateName: string
  onRename: (name: string) => void
  status: TemplateStatus
  device: "desktop" | "mobile"
  onDeviceChange: (d: "desktop" | "mobile") => void
  language: "en" | "ar" | "bilingual"
  onLanguageChange: (l: "en" | "ar" | "bilingual") => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  unsavedChanges: boolean
  lastSavedAt?: string
  onPreview: () => void
  onSaveAsTemplate: () => void
  onSubmitForReview: () => void
  onApprove: () => void
  onOpenComposerGpt: () => void
  onOpenAbTest: () => void
  onOpenVersionHistory: () => void
  /** Surface 6 — create a journey from this composer state. */
  onCreateJourney: () => void
}

export function BuilderToolbar(props: BuilderToolbarProps) {
  const {
    templateName,
    onRename,
    status,
    device,
    onDeviceChange,
    language,
    onLanguageChange,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    unsavedChanges,
    lastSavedAt,
    onPreview,
    onSaveAsTemplate,
    onSubmitForReview,
    onApprove,
    onOpenComposerGpt,
    onOpenAbTest,
    onOpenVersionHistory,
    onCreateJourney,
  } = props

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-zinc-950/80 px-4 backdrop-blur">
      {/* Left: back + name + status */}
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Templates
        </Link>
        <div className="h-5 w-px bg-zinc-800" />
        <div className="flex min-w-0 items-center gap-2">
          <Input
            value={templateName}
            onChange={(e) => onRename(e.target.value)}
            className="h-7 max-w-xs truncate border-transparent bg-transparent text-sm font-semibold hover:border-zinc-800 focus:border-zinc-700"
          />
          <Badge className={cn("h-5 shrink-0 px-1.5 text-[9px] font-semibold uppercase tracking-wider", TEMPLATE_STATUS_COLOR[status])}>
            {TEMPLATE_STATUS_LABEL[status]}
          </Badge>
          {unsavedChanges ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
              <Clock className="h-2.5 w-2.5" />
              Unsaved
            </span>
          ) : lastSavedAt ? (
            <span className="text-[10px] text-muted-foreground">Saved · autosave on</span>
          ) : null}
        </div>
      </div>

      {/* Middle: undo/redo + device + language */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
          <ToolBtn label="Undo" disabled={!canUndo} onClick={onUndo}>
            <Undo2 className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn label="Redo" disabled={!canRedo} onClick={onRedo}>
            <Redo2 className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>

        <div className="flex items-center gap-0.5 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
          <ToolBtn label="Desktop" active={device === "desktop"} onClick={() => onDeviceChange("desktop")}>
            <Monitor className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn label="Mobile" active={device === "mobile"} onClick={() => onDeviceChange("mobile")}>
            <Smartphone className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>

        <div className="flex items-center gap-0.5 rounded-md bg-zinc-900 p-0.5 ring-1 ring-zinc-800">
          <ToolBtn label="English" active={language === "en"} onClick={() => onLanguageChange("en")}>
            <span className="text-[10px] font-semibold">EN</span>
          </ToolBtn>
          <ToolBtn label="Arabic (RTL)" active={language === "ar"} onClick={() => onLanguageChange("ar")}>
            <span className="text-[10px] font-semibold">AR</span>
          </ToolBtn>
          <ToolBtn label="Bilingual" active={language === "bilingual"} onClick={() => onLanguageChange("bilingual")}>
            <Languages className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>
      </div>

      {/* Right: AI + actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onOpenComposerGpt}>
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          Composer GPT
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onOpenAbTest}>
          <Beaker className="h-3.5 w-3.5" />
          A/B test
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onOpenVersionHistory}>
          <History className="h-3.5 w-3.5" />
          History
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={onSaveAsTemplate}>
          <Save className="h-3.5 w-3.5" />
          Save as template
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5" />
          Preview & test
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={onCreateJourney}>
          <Send className="h-3.5 w-3.5" />
          Create journey
        </Button>
        {status === "draft" ? (
          <Button size="sm" className="h-7 text-[11px]" onClick={onSubmitForReview}>
            <Library className="h-3.5 w-3.5" />
            Submit for review
          </Button>
        ) : status === "in_review" ? (
          <Button size="sm" className="h-7 bg-emerald-500 text-[11px] text-white hover:bg-emerald-400" onClick={onApprove}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve & publish
          </Button>
        ) : (
          <Button size="sm" className="h-7 text-[11px]" onClick={onSaveAsTemplate}>
            Publish update
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

function ToolBtn({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded px-1.5 py-1 transition-colors",
        active
          ? "bg-zinc-800 text-foreground"
          : "text-muted-foreground hover:bg-zinc-800/50 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {children}
    </button>
  )
}
