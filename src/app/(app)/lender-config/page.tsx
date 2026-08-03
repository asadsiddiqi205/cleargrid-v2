import Link from "next/link"
import { AtSign, ChevronRight, Building2 } from "lucide-react"
import { PageShell } from "@/components/shared/page-shell"

const SECTIONS = [
  {
    href: "/lender-config/sender-profiles",
    icon: AtSign,
    title: "Sender profiles",
    description:
      "Governed from-name / from-email / reply-to per lender. Owns the ESP / delivery route the composer sends through.",
    disabled: false as const,
  },
  {
    href: "/lender-config",
    icon: Building2,
    title: "Lender directory",
    description: "Roster of lenders, brand kits, and default compliance postures.",
    disabled: true as const,
  },
]

export default function LenderConfigPage() {
  return (
    <PageShell
      title="Lender Configurations"
      description="Admin-only settings that govern how outbound campaigns are sent — sender identity, routing, and lender defaults."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          const inner = (
            <div className="group flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-4 transition-colors hover:border-emerald-500/40 hover:bg-muted/20">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[14px] font-semibold text-foreground">{s.title}</h3>
                  {s.disabled && (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                      Soon
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
              {!s.disabled && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              )}
            </div>
          )
          if (s.disabled) return <div key={s.title}>{inner}</div>
          return (
            <Link key={s.href} href={s.href}>
              {inner}
            </Link>
          )
        })}
      </div>
    </PageShell>
  )
}
