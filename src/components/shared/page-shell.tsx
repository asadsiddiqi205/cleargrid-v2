import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface PageShellProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
  children: React.ReactNode;
}

export function PageShell({ title, description, action, children }: PageShellProps) {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {action && (
          action.href ? (
            <Link
              href={action.href}
              className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Link>
          ) : (
            <Button onClick={action.onClick} className="gap-1.5">
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )
        )}
      </div>
      {children}
    </div>
  );
}
