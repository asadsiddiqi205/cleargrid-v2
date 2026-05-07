import {
  Users, Handshake, CreditCard,
  Inbox, Mail, MessageSquare,
  BarChart3,
  Bot,
  Phone,
  Megaphone, Sparkles,
  Layers,
  GitBranch, Route,
  FolderOpen,
  Building2,
  Wand2, FileText, Target,
  ChevronDown,
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
  icon: LucideIcon;
  href?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items?: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Borrowers",
    icon: Users,
    collapsible: true,
    defaultOpen: true,
    items: [
      { title: "All", href: "/borrowers", icon: Users },
      { title: "Deals", href: "/borrowers/deals", icon: Handshake },
      { title: "Accounts", href: "/borrowers/accounts", icon: CreditCard },
    ],
  },
  {
    label: "Inbound Support",
    icon: Inbox,
    collapsible: true,
    defaultOpen: false,
    items: [
      { title: "Inbox", href: "/inbox", icon: Inbox },
      { title: "Email Tickets", href: "/email-tickets", icon: Mail },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    href: "/reports",
  },
  {
    label: "AI Agents",
    icon: Bot,
    href: "/ai-agents",
  },
  {
    label: "Call History",
    icon: Phone,
    href: "/call-history",
  },
  {
    label: "Campaigns",
    icon: Megaphone,
    href: "/campaigns",
  },
  {
    label: "AI Campaigns",
    icon: Sparkles,
    href: "/ai-campaigns",
  },
  {
    label: "Segments",
    icon: Layers,
    href: "/segments",
  },
  {
    label: "Compose",
    icon: Wand2,
    collapsible: true,
    defaultOpen: false,
    items: [
      { title: "Compose", href: "/email-generator", icon: Wand2 },
      { title: "Templates", href: "/templates", icon: FileText },
      { title: "Playbooks", href: "/strategies", icon: Target },
    ],
  },
  {
    label: "Journeys",
    icon: Route,
    href: "/journeys",
  },
  {
    label: "Workflows",
    icon: GitBranch,
    href: "/workflows",
  },
  {
    label: "Files",
    icon: FolderOpen,
    href: "/files",
  },
  {
    label: "Lender Configurations",
    icon: Building2,
    href: "/lender-config",
  },
];

export { ChevronDown };
