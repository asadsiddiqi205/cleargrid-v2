import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "flat";
  icon?: LucideIcon;
  iconColor?: string;
  subtitle?: string;
}

export function KpiCard({ label, value, change, trend, icon: Icon, iconColor, subtitle }: KpiCardProps) {
  return (
    <Card className="border-border bg-card transition-colors hover:border-border/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && (
            <Icon className="h-5 w-5" style={{ color: iconColor || "var(--muted-foreground)" }} />
          )}
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">{subtitle}</p>
        )}
        {change && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-400" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-red-400" />}
            {trend === "flat" && <Minus className="h-3 w-3 text-muted-foreground" />}
            <span className={trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"}>
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
