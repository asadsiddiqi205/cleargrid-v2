"use client";

import { Building2, ChevronsUpDown, Globe, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLender } from "@/contexts/lender-context";
import { lenders, ALL_LENDERS, type Lender } from "@/data/lenders";
import { cn } from "@/lib/utils";

function formatBorrowerCount(count: number): string {
  if (count === 0) return "Onboarding";
  if (count >= 1000) {
    const k = count / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K borrowers`;
  }
  return `${count} borrowers`;
}

function LenderSwatch({
  color,
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 rounded-[3px]", className)}
      style={{ backgroundColor: color ?? "var(--muted-foreground)" }}
    />
  );
}

export function LenderSelector() {
  const { selectedLenderId, selectedLender, setSelectedLender } = useLender();

  const activeLenders = lenders.filter((l) => l.status === "active");
  const onboardingLenders = lenders.filter((l) => l.status === "onboarding");

  const handleSelect = (id: string, name: string) => {
    setSelectedLender(id);
    toast.success(`Switched to ${name}`);
  };

  const isAll = selectedLenderId === ALL_LENDERS;

  const renderLenderItem = (lender: Lender) => {
    const isSelected = lender.id === selectedLenderId;
    return (
      <DropdownMenuItem
        key={lender.id}
        onClick={() => handleSelect(lender.id, lender.name)}
        className="gap-2 py-1.5"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
          <Building2 className="size-3.5 text-muted-foreground" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 text-sm">
            <LenderSwatch color={lender.primaryColor} />
            <span className="truncate font-medium">{lender.shortName}</span>
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {formatBorrowerCount(lender.borrowerCount)} {" \u00B7 "}
            {lender.country}
          </span>
        </span>
        {isSelected && (
          <Check className="ml-auto size-4 shrink-0 text-foreground" />
        )}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 max-w-[220px] justify-start gap-2 px-2.5"
          />
        }
      >
        {isAll ? (
          <>
            <Globe className="size-3.5 text-muted-foreground" />
            <span className="truncate text-sm font-medium">All Lenders</span>
          </>
        ) : (
          <>
            <LenderSwatch color={selectedLender?.primaryColor} />
            <span className="truncate text-sm font-medium">
              {selectedLender?.shortName}
            </span>
          </>
        )}
        <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px] p-1">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Switch lender
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleSelect(ALL_LENDERS, "All Lenders")}
            className="gap-2 py-1.5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
              <Globe className="size-3.5 text-muted-foreground" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">All Lenders</span>
              <span className="truncate text-xs text-muted-foreground">
                View data across every lender
              </span>
            </span>
            {isAll && (
              <Check className="ml-auto size-4 shrink-0 text-foreground" />
            )}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {activeLenders.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 pt-1 pb-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Active
              </DropdownMenuLabel>
              {activeLenders.map(renderLenderItem)}
            </DropdownMenuGroup>
          </>
        )}

        {onboardingLenders.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 pt-1 pb-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Onboarding
              </DropdownMenuLabel>
              {onboardingLenders.map(renderLenderItem)}
            </DropdownMenuGroup>
          </>
        )}

      </DropdownMenuContent>
    </DropdownMenu>
  );
}
