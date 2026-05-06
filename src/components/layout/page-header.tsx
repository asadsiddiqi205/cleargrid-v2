"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { LenderSelector } from "@/components/layout/lender-selector";
import { borrowers } from "@/data/borrowers";

export function PageHeader() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;

    // Look for a matching borrower by name, phone, or Emirates ID
    const lower = q.toLowerCase();
    const match = borrowers.find(
      (b) =>
        b.name.toLowerCase().includes(lower) ||
        b.phone.toLowerCase().includes(lower) ||
        b.emiratesId.toLowerCase().includes(lower),
    );

    if (match) {
      router.push(`/borrowers/${match.id}`);
      setSearch("");
      return;
    }

    toast.info(`No borrower matches "${q}"`, {
      description: "Try a name, phone number, or Emirates ID.",
    });
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <LenderSelector />
      <Separator orientation="vertical" className="h-5" />
      <form
        onSubmit={handleSubmit}
        className="relative flex-1 max-w-sm"
        role="search"
      >
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Find a borrower by name, phone, or Emirates ID..."
          className="pl-9 h-8 bg-transparent border-border text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
      <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        <span>EN</span>
      </div>
    </header>
  );
}
