"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AppWindow, FileSignature, Phone, FileText } from "lucide-react"
import { TemplatesView } from "@/components/templates/templates-view"
import { LandingPageBuilder } from "@/components/templates/landing-page-builder"
import { LetterBuilder } from "@/components/templates/letter-builder"
import { RobocallBuilder } from "@/components/templates/robocall-builder"

type Tab = "messages" | "landing-page" | "letter" | "robocall"

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: "messages", label: "Messages", icon: FileText },
  { value: "landing-page", label: "Landing Pages", icon: AppWindow },
  { value: "letter", label: "Letters", icon: FileSignature },
  { value: "robocall", label: "Robocalls", icon: Phone },
]

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  "messages": "Reusable email and SMS copy you can send in one click",
  "landing-page": "Web pages borrowers land on after clicking your email CTA",
  "letter": "Physical mail templates for formal or legal communications",
  "robocall": "Automated voice call scripts with key-press branching",
}

function isValidTab(v: string | null): v is Tab {
  return v === "messages" || v === "landing-page" || v === "letter" || v === "robocall"
}

export function TemplatesTabs() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = isValidTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as Tab)
    : "messages"
  const [activeTab, setActiveTab] = React.useState<Tab>(initialTab)

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    // Keep URL in sync so back/forward works
    const params = new URLSearchParams(searchParams.toString())
    if (tab === "messages") {
      params.delete("tab")
    } else {
      params.set("tab", tab)
    }
    const qs = params.toString()
    router.replace(`/templates${qs ? `?${qs}` : ""}`, { scroll: false })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleTabChange(value)}
            className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:rounded-t-full after:transition-opacity ${
              activeTab === value
                ? "text-foreground after:bg-foreground after:opacity-100"
                : "text-muted-foreground hover:text-foreground after:opacity-0"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="shrink-0 border-b border-border px-4 py-2 text-sm text-muted-foreground">
        {TAB_DESCRIPTIONS[activeTab]}
      </p>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === "messages" && <TemplatesView />}
        {activeTab === "landing-page" && <LandingPageBuilder />}
        {activeTab === "letter" && <LetterBuilder />}
        {activeTab === "robocall" && <RobocallBuilder />}
      </div>
    </div>
  )
}
