"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Phone } from "lucide-react";

export function PageHeader() {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />

      <form className="relative flex-1 max-w-md" role="search">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search here..."
          className="pl-9 h-8 bg-transparent border-border text-sm"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon-sm">
          <Phone className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">EN</span>
      </div>
    </header>
  );
}
