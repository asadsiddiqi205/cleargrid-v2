export type Channel = "sms" | "email" | "whatsapp" | "voice";
export type DpdBucket = "1-30" | "31-60" | "61-90" | "91-180" | "180+";
export type Status = "active" | "paused" | "draft" | "completed" | "archived" | "running" | "scheduled";

export interface KpiMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "flat";
  icon?: string;
}
