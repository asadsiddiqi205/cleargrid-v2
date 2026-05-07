"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Mic } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { navGroups } from "./nav-config";
import { ThemeToggle } from "./theme-toggle";
import { ClearGridLogo, ClearGridIcon } from "./cleargrid-logo";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link href="/borrowers/deals" className="flex items-center gap-2">
          <ClearGridIcon className="h-8 w-8 shrink-0 text-sidebar-foreground" />
          <ClearGridLogo className="h-6 w-auto text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navGroups.map((group) => {
              if (group.collapsible && group.items) {
                return (
                  <CollapsibleNavGroup
                    key={group.label}
                    group={group}
                    pathname={pathname}
                  />
                );
              }

              const isActive = group.href
                ? pathname === group.href || pathname.startsWith(group.href + "/")
                : false;

              return (
                <SidebarMenuItem key={group.label}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={group.label}
                    render={<Link href={group.href || "#"} />}
                  >
                    <group.icon className="h-4 w-4" />
                    <span>{group.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* ClearVoice promo card */}
        <div className="mx-3 mt-auto mb-4 rounded-lg border border-sidebar-border bg-sidebar p-3 group-data-[collapsible=icon]:hidden">
          <p className="text-sm font-semibold text-foreground">Explore Clear Voice</p>
          <p className="text-xs text-muted-foreground mt-1">Visit our AI Powered voice platform</p>
          <a
            href="https://clearvoice.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 rounded-md border border-sidebar-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mic className="h-3 w-3" />
            ClearVoice
          </a>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">RA</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground">rabab.abbas1</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs text-muted-foreground">rabab.abbas1@cleargrid.co</span>
          </div>
          <div className="ml-auto group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function CollapsibleNavGroup({
  group,
  pathname,
}: {
  group: (typeof navGroups)[number];
  pathname: string;
}) {
  const hasActiveChild = group.items?.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <Collapsible defaultOpen={group.defaultOpen || hasActiveChild}>
      <SidebarMenuItem>
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group/collapsible">
          <group.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">{group.label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[panel-open]/collapsible:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.items?.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <SidebarMenuSubItem key={item.href}>
                  <SidebarMenuSubButton
                    isActive={isActive}
                    render={<Link href={item.href} />}
                  >
                    <span>{item.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
