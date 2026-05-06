import {
  Layers,
  Wand2, FileText, Target,
  GitBranch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  external?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "CONTACTS",
    items: [
      { title: "Audiences", href: "/segments", icon: Layers },
    ],
  },
  {
    label: "MESSAGES",
    items: [
      { title: "Compose", href: "/email-generator", icon: Wand2 },
      { title: "Templates", href: "/templates", icon: FileText },
      { title: "Writing Styles", href: "/strategies", icon: Target },
    ],
  },
  {
    label: "AUTOMATION",
    items: [
      { title: "Journeys", href: "/journeys", icon: GitBranch },
    ],
  },
];

export const bottomNavItems: NavItem[] = [];
