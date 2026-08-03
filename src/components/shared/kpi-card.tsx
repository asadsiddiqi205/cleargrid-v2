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
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {Icon && (
            <Icon className="h-4 w-4" style={{ color: iconColor || "var(--muted-foreground)" }} />
          )}
        </div>
        <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">{value}</p>
        {subtitle && (
          <p className="mt-0.5 text-[10px] text-muted-foreground/80">{subtitle}</p>
        )}
        {change && (
          <div className="mt-1 flex items-center gap-1 text-[11px]">
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
