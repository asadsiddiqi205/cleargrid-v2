import { MarkerType, type Node, type Edge } from "@xyflow/react";
import {
  Zap,
  Users,
  User,
  Clock,
  Upload,
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  MessageSquare,
  Layers,
  GitBranch,
  MousePointer,
  Activity,
  Filter,
  Wifi,
  Send,
  Timer,
  Calendar,
  AlarmClock,
  RefreshCw,
  Pause,
  Split,
  Square,
  Variable,
  Edit,
  UserCog,
  Tag,
  ShieldOff,
  BookOpen,
  Webhook,
  ArrowRightLeft,
  Brain,
  FlaskConical,
  Power,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Journey block taxonomy (Khalil's 9-category system)               */
/* ------------------------------------------------------------------ */

export type BlockCategoryId =
  | "entry"
  | "channels"
  | "conditions"
  | "flow"
  | "data"
  | "integrations"
  | "ai"
  | "exit";

export interface BlockCategory {
  id: BlockCategoryId;
  label: string;
  icon: LucideIcon;
  /** Tailwind text colour, e.g. text-emerald-400 */
  color: string;
  /** Tailwind background tint, e.g. bg-emerald-500/10 */
  bgColor: string;
  /** Tailwind border colour, e.g. border-emerald-500/30 */
  borderColor: string;
  /** Hex / oklch colour for the node top-border accent */
  accent: string;
}

export interface BlockType {
  /** Unique block id (was Khalil's `type`) */
  type: string;
  /** Display label */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Short description for the palette tooltip */
  description: string;
  /** Which category it belongs to */
  category: BlockCategoryId;
  /** Maximum number of output ports (1 = single, >1 = branching) */
  maxOutputs?: number;
  /** Default React Flow `node.type` to render */
  nodeKind: "trigger" | "action" | "condition" | "wait" | "split" | "end" | "generic";
  /** Default node data */
  defaultData: Record<string, unknown>;
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: "entry",
    label: "Entry / Trigger",
    icon: Zap,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    accent: "#10b981",
  },
  {
    id: "channels",
    label: "Channels / Actions",
    icon: Mail,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    accent: "#22d3ee",
  },
  {
    id: "conditions",
    label: "Conditions",
    icon: GitBranch,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    accent: "#a78bfa",
  },
  {
    id: "flow",
    label: "Flow Controls",
    icon: Timer,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    accent: "#fbbf24",
  },
  {
    id: "data",
    label: "Data / State",
    icon: Variable,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    accent: "#fb923c",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Webhook,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    accent: "#818cf8",
  },
  {
    id: "ai",
    label: "AI & Optimization",
    icon: Brain,
    color: "text-fuchsia-400",
    bgColor: "bg-fuchsia-500/10",
    borderColor: "border-fuchsia-500/30",
    accent: "#e879f9",
  },
  {
    id: "exit",
    label: "Exit / Governance",
    icon: Power,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    accent: "#f87171",
  },
];

export const BLOCK_TYPES: BlockType[] = [
  // ───── Entry / Trigger (7) — matches command.cleargrid.ai ─────
  { type: "event_trigger", label: "Event Trigger", icon: Zap, description: "Start when a system event occurs (e.g. deal enters bucket)", category: "entry", nodeKind: "trigger", defaultData: { label: "Event Trigger", triggerType: "event" } },
  { type: "segment_trigger", label: "Segment Membership", icon: Users, description: "Enrol borrowers when they enter or exit a segment", category: "entry", nodeKind: "trigger", defaultData: { label: "Segment Membership", triggerType: "segment_entry" } },
  { type: "profile_change_trigger", label: "Profile Attribute Change", icon: User, description: "Fires when a borrower attribute changes to a value", category: "entry", nodeKind: "trigger", defaultData: { label: "Profile Attribute Change", triggerType: "attribute_change" } },
  { type: "specific_users_trigger", label: "Specific Users", icon: Upload, description: "Manually enrol a defined list of borrowers", category: "entry", nodeKind: "trigger", defaultData: { label: "Specific Users", triggerType: "specific_users" } },
  { type: "inbound_message_trigger", label: "Inbound Message", icon: MessageCircle, description: "Fires when a borrower sends an email / SMS / WhatsApp", category: "entry", nodeKind: "trigger", defaultData: { label: "Inbound Message", triggerType: "inbound_message" } },
  { type: "incoming_call_trigger", label: "Incoming Call", icon: Phone, description: "Fires when an inbound call is received on a lender line", category: "entry", nodeKind: "trigger", defaultData: { label: "Incoming Call", triggerType: "incoming_call" } },
  { type: "journey_handoff_entry", label: "Journey Handoff Entry", icon: ArrowRightLeft, description: "Accept borrowers handed off from another journey", category: "entry", nodeKind: "trigger", defaultData: { label: "Journey Handoff Entry", triggerType: "journey_handoff_entry", acceptFrom: "all" } },

  // ───── Channels / Actions (5) — matches command.cleargrid.ai ─────
  { type: "send_email", label: "Send Email", icon: Mail, description: "Send an email via the lender's Infobip Connection", category: "channels", nodeKind: "action", defaultData: { label: "Send Email", actionType: "email" } },
  { type: "send_sms", label: "Send SMS", icon: MessageSquare, description: "Send an SMS via Unifonic using the lender's Connection", category: "channels", nodeKind: "action", defaultData: { label: "Send SMS", actionType: "sms" } },
  { type: "whatsapp_ott", label: "WhatsApp / OTT", icon: MessageCircle, description: "Send a WhatsApp Business template or OTT message", category: "channels", nodeKind: "action", defaultData: { label: "WhatsApp / OTT", actionType: "whatsapp" } },
  { type: "trigger_ai_call", label: "Trigger AI Call", icon: Phone, description: "Initiate an outbound ClearVoice call (pick a project)", category: "channels", nodeKind: "action", defaultData: { label: "Trigger AI Call", actionType: "call" } },
  { type: "send_slack", label: "Send Slack", icon: Send, description: "Post a team notification to a Slack channel", category: "channels", nodeKind: "action", defaultData: { label: "Send Slack", actionType: "slack" } },
  { type: "trigger_human_campaign", label: "Trigger Human Campaign", icon: Users, description: "Enroll borrower into a human-agent calling campaign", category: "channels", nodeKind: "action", defaultData: { label: "Trigger Human Campaign", actionType: "human_campaign", continueMode: "immediate" } },

  // ───── Conditions (8) — matches command.cleargrid.ai ─────
  { type: "decision_split", label: "Decision Split", icon: GitBranch, description: "Evaluate a structured rule (audience-style yes/no)", category: "conditions", maxOutputs: 2, nodeKind: "condition", defaultData: { label: "Decision Split", conditionType: "check_attribute" } },
  { type: "conditional_switch", label: "Conditional Switch", icon: GitBranch, description: "Multiple inline conditions — borrower takes the first matching branch", category: "conditions", maxOutputs: 5, nodeKind: "generic", defaultData: { label: "Conditional Switch", branchKind: "conditional_switch", branches: 3 } },
  { type: "audience_split", label: "Audience Split", icon: Users, description: "Route by membership in one or more segments", category: "conditions", maxOutputs: 5, nodeKind: "generic", defaultData: { label: "Audience Split", branchKind: "audience_split", branches: 5 } },
  { type: "action_path", label: "Action Path Split", icon: MousePointer, description: "Route borrowers based on how they engaged with a prior send", category: "conditions", maxOutputs: 4, nodeKind: "generic", defaultData: { label: "Action Path Split", branchKind: "action_path", branches: 4 } },
  { type: "has_done_event", label: "Has Done Event", icon: Activity, description: "Snapshot check: did an event occur within N days", category: "conditions", maxOutputs: 2, nodeKind: "condition", defaultData: { label: "Has Done Event", conditionType: "has_done_event" } },
  { type: "profile_check", label: "Profile Attribute Check", icon: Filter, description: "Branch on a borrower/deal attribute — one of / equals / range", category: "conditions", maxOutputs: 3, nodeKind: "generic", defaultData: { label: "Profile Attribute Check", branchKind: "profile_check", branches: 3 } },
  { type: "reachability_check", label: "Reachability Check", icon: Wifi, description: "Check whether the borrower is reachable on a channel", category: "conditions", maxOutputs: 2, nodeKind: "condition", defaultData: { label: "Reachability Check", conditionType: "is_reachable_on" } },
  { type: "best_channel", label: "Best Channel", icon: Send, description: "AI-selected optimal channel based on borrower engagement", category: "conditions", maxOutputs: 4, nodeKind: "generic", defaultData: { label: "Best Channel", branchKind: "best_channel", branches: 4 } },

  // ───── Flow Controls (8) — matches command.cleargrid.ai ─────
  { type: "delay", label: "Delay / Wait", icon: Timer, description: "Pause for a fixed duration (hours / days)", category: "flow", nodeKind: "wait", defaultData: { label: "Delay / Wait", duration: 24, unit: "hours" } },
  { type: "wait_until_date", label: "Wait Until Date", icon: Calendar, description: "Hold a borrower until a fixed date or a date attribute", category: "flow", nodeKind: "wait", defaultData: { label: "Wait Until Date", waitMode: "date" } },
  { type: "wait_time_slots", label: "Wait for Time Slots", icon: Clock, description: "Hold until the current time enters a contact window", category: "flow", nodeKind: "wait", defaultData: { label: "Wait for Time Slots", waitMode: "time_slots" } },
  { type: "wait_for_event", label: "Wait for Event", icon: AlarmClock, description: "Pause until an event occurs (with a timeout branch)", category: "flow", maxOutputs: 2, nodeKind: "generic", defaultData: { label: "Wait for Event", branchKind: "wait_for_event", branches: 2 } },
  { type: "wait_profile_change", label: "Wait for Profile Change", icon: RefreshCw, description: "Pause until a borrower attribute changes to a value", category: "flow", nodeKind: "wait", defaultData: { label: "Wait for Profile Change", waitMode: "profile_change" } },
  { type: "pause_hold", label: "Pause / Hold", icon: Pause, description: "Indefinite hold; released manually via the API or ops action", category: "flow", nodeKind: "wait", defaultData: { label: "Pause / Hold", waitMode: "pause" } },
  { type: "traffic_split", label: "Traffic Split", icon: Split, description: "Route borrowers across N branches by percentage", category: "flow", maxOutputs: 5, nodeKind: "generic", defaultData: { label: "Traffic Split", branchKind: "traffic_split", branches: 2, splits: [50, 50] } },
  { type: "end_journey", label: "Exit Journey", icon: Square, description: "Terminate the journey for the borrower with an outcome tag", category: "flow", nodeKind: "end", defaultData: { label: "Exit Journey", outcome: "Completed" } },

  // ───── Data / State (5) — matches command.cleargrid.ai ─────
  { type: "context_variable", label: "Context Variable", icon: Variable, description: "Read a value from borrower/deal/context into the journey", category: "data", nodeKind: "generic", defaultData: { label: "Context Variable" } },
  { type: "update_variable", label: "Set / Update Variable", icon: Edit, description: "Set or modify a journey-scoped variable", category: "data", nodeKind: "generic", defaultData: { label: "Set / Update Variable" } },
  { type: "update_profile", label: "Update Profile", icon: UserCog, description: "Write a value back to a borrower or deal profile", category: "data", nodeKind: "generic", defaultData: { label: "Update Profile" } },
  { type: "dnc_gate", label: "DNC Gate", icon: ShieldOff, description: "Is this borrower DNC'd on every scoped channel?", category: "data", maxOutputs: 2, nodeKind: "condition", defaultData: { label: "DNC Gate", conditionType: "dnc_gate" } },
  { type: "add_to_dnc", label: "Add to DNC", icon: ShieldOff, description: "Mark the deal's primary phone or email as DNC", category: "data", nodeKind: "generic", defaultData: { label: "Add to DNC" } },

  // ───── Integrations (2) — matches command.cleargrid.ai ─────
  { type: "flow_handoff", label: "Journey Handoff", icon: ArrowRightLeft, description: "Exit and re-enrol the borrower into another journey", category: "integrations", nodeKind: "generic", defaultData: { label: "Journey Handoff" } },
  { type: "audience_sync", label: "Audience Sync", icon: RefreshCw, description: "Add or remove the deal from a static audience", category: "integrations", nodeKind: "generic", defaultData: { label: "Audience Sync" } },

  // ───── AI & Optimization (1) — matches command.cleargrid.ai ─────
  { type: "experiment", label: "Experiment / A-B Test", icon: FlaskConical, description: "Stable per-borrower A/B routing — same person always sees same variant", category: "ai", maxOutputs: 4, nodeKind: "split", defaultData: { label: "Experiment", variantCount: 4, splitA: 25, splitB: 25, splitC: 25, splitD: 25 } },

  // ───── Exit / Governance (1) — matches command.cleargrid.ai ─────
  { type: "global_exit", label: "Global Exit Trigger Manager", icon: Power, description: "Define rules that immediately exit any borrower from this journey", category: "exit", nodeKind: "end", defaultData: { label: "Global Exit", outcome: "Exited" } },
];

export function getBlockType(type: string): BlockType | undefined {
  return BLOCK_TYPES.find((b) => b.type === type);
}

export function getBlockCategory(id: BlockCategoryId): BlockCategory | undefined {
  return BLOCK_CATEGORIES.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/*  Journey list data (table on /journeys)                            */
/* ------------------------------------------------------------------ */

export type JourneyStatus = "running" | "scheduled" | "draft" | "completed" | "paused";

/* ------------------------------------------------------------------ */
/*  Journey-level Exit Triggers                                        */
/*  Global early-exit rules evaluated for every borrower in the journey */
/*  (distinct from canvas Exit Journey nodes which are path-specific)  */
/* ------------------------------------------------------------------ */

export type ExitTriggerOutcome = "converted" | "exited" | "timed_out" | "errored";

export type ExitTriggerConditionGroup = {
  joinOperator: "AND" | "OR";
  conditions: Array<{
    id: string;
    fieldId: string;
    operator: string;
    value: string;
    value2?: string;
  }>;
};

export type ExitTrigger = {
  id: string;
  type: "event" | "segment" | "attribute";
  outcome: ExitTriggerOutcome;
  config:
    | { event_id: string; event_filters?: ExitTriggerConditionGroup; borrower_filters?: ExitTriggerConditionGroup }
    | { direction: "enters" | "exits"; segment_id: string }
    | { attribute_id: string; condition?: { operator: string; value: string } };
};

export const EXIT_TRIGGER_EVENT_CATALOG = [
  { id: "pay_in_full_success", label: "pay_in_full_success" },
  { id: "partial_payment_received", label: "partial_payment_received" },
  { id: "ptp_created", label: "ptp_created" },
  { id: "ptp_broken", label: "ptp_broken" },
  { id: "dispute_filed", label: "dispute_filed" },
  { id: "hardship_declared", label: "hardship_declared" },
  { id: "callback_requested", label: "callback_requested" },
  { id: "settlement_accepted", label: "settlement_accepted" },
  { id: "account_closed", label: "account_closed" },
];

export const EXIT_TRIGGER_ATTRIBUTE_CATALOG = [
  // Borrower
  { id: "consent_status", label: "consent_status", group: "Borrower", type: "enum", options: ["Granted", "Pending", "Blocked", "Revoked"] },
  { id: "risk_segment", label: "risk_segment", group: "Borrower", type: "enum", options: ["Low", "Medium", "High", "Very High"] },
  { id: "language", label: "language", group: "Borrower", type: "enum", options: ["English", "Arabic", "Hindi", "Urdu"] },
  // Financial
  { id: "outstanding_balance", label: "outstanding_balance", group: "Financial", type: "number" },
  { id: "days_past_due", label: "days_past_due", group: "Financial", type: "number" },
  { id: "deal_stage", label: "deal_stage", group: "Financial", type: "enum", options: ["Current", "Early", "Collections", "Legal", "Settled", "Write-Off"] },
  // Reachability
  { id: "do_not_contact", label: "do_not_contact", group: "Reachability", type: "boolean" },
  { id: "phone_valid", label: "phone_valid", group: "Reachability", type: "boolean" },
  { id: "email_valid", label: "email_valid", group: "Reachability", type: "boolean" },
  // Communications
  { id: "last_message_status", label: "last_message_status", group: "Communications", type: "enum", options: ["Delivered", "Failed", "Bounced", "Opened", "Clicked"] },
  { id: "channel_preference", label: "channel_preference", group: "Communications", type: "enum", options: ["Email", "SMS", "WhatsApp", "Call"] },
];

export const EXIT_TRIGGER_OUTCOME_META: Record<ExitTriggerOutcome, { label: string; color: string }> = {
  converted: { label: "Converted", color: "var(--chart-2)" },
  exited: { label: "Exited", color: "var(--muted-foreground)" },
  timed_out: { label: "Timed Out", color: "var(--chart-3)" },
  errored: { label: "Errored", color: "var(--destructive)" },
};

export const DEFAULT_EXIT_TRIGGERS: ExitTrigger[] = [
  {
    id: "et-1",
    type: "attribute",
    outcome: "exited",
    config: { attribute_id: "consent_status", condition: { operator: "equals", value: "Blocked" } },
  },
  {
    id: "et-2",
    type: "event",
    outcome: "converted",
    config: { event_id: "pay_in_full_success" },
  },
  {
    id: "et-3",
    type: "segment",
    outcome: "exited",
    config: { direction: "enters", segment_id: "seg-003" },
  },
];

export interface JourneyListItem {
  id: string;
  name: string;
  trigger: string;
  status: JourneyStatus;
  lastRun: string | null;
  enrolled: number;
  createdBy: string;
  createdDate: string;
  lenderId: string;
}

export const journeysList: JourneyListItem[] = [
  {
    id: "high-dpd",
    name: "High DPD Collection Flow",
    trigger: "Segment Entry",
    status: "running",
    lastRun: "Apr 3, 2026",
    enrolled: 1248,
    createdBy: "Rabab Abbas",
    createdDate: "2026-02-15",
    lenderId: "lnd-mashreq",
  },
  {
    id: "broken-promise",
    name: "Broken Promise Follow-up",
    trigger: "Attribute Change",
    status: "scheduled",
    lastRun: null,
    enrolled: 0,
    createdBy: "Asad Siddiqi",
    createdDate: "2026-03-20",
    lenderId: "lnd-tamara",
  },
  {
    id: "new-overdue",
    name: "New Overdue Reminder",
    trigger: "Occurrence of Event",
    status: "draft",
    lastRun: null,
    enrolled: 0,
    createdBy: "Rabab Abbas",
    createdDate: "2026-04-01",
    lenderId: "general",
  },
  {
    id: "q1-recovery",
    name: "Q1 Recovery Campaign",
    trigger: "Segment Entry",
    status: "completed",
    lastRun: "Mar 31, 2026",
    enrolled: 3421,
    createdBy: "Khalil Ahmed",
    createdDate: "2026-01-10",
    lenderId: "lnd-cashnow",
  },
  {
    id: "escalation",
    name: "Escalation Auto-Route",
    trigger: "Segment Entry",
    status: "paused",
    lastRun: "Mar 28, 2026",
    enrolled: 156,
    createdBy: "Asad Siddiqi",
    createdDate: "2026-03-05",
    lenderId: "lnd-mashreq",
  },
  {
    id: "early-delinquency",
    name: "Early Delinquency Nudge",
    trigger: "Attribute Change",
    status: "running",
    lastRun: "Apr 3, 2026",
    enrolled: 892,
    createdBy: "Khalil Ahmed",
    createdDate: "2026-02-28",
    lenderId: "lnd-tamara",
  },
  {
    id: "settlement-offer",
    name: "Settlement Offer Outreach",
    trigger: "Segment Entry",
    status: "running",
    lastRun: "Apr 3, 2026",
    enrolled: 2340,
    createdBy: "Rabab Abbas",
    createdDate: "2026-03-15",
    lenderId: "lnd-enbd",
  },
  {
    id: "welcome-new",
    name: "Welcome New Account",
    trigger: "Segment Entry",
    status: "draft",
    lastRun: null,
    enrolled: 0,
    createdBy: "Asad Siddiqi",
    createdDate: "2026-04-05",
    lenderId: "general",
  },
];

/* ------------------------------------------------------------------ */
/*  KPI summaries                                                     */
/* ------------------------------------------------------------------ */

export const journeyKpis = [
  { label: "Total Enrolled", value: "8,057" },
  { label: "Active Journeys", value: "3" },
  { label: "Scheduled", value: "1" },
  { label: "Paused", value: "1" },
];

/* ------------------------------------------------------------------ */
/*  Pre-built React Flow data for each journey                        */
/* ------------------------------------------------------------------ */

export interface JourneyFlowData {
  nodes: Node[];
  edges: Edge[];
}

/* ======================== High DPD ======================== */

const highDpdNodes: Node[] = [
  // Trigger
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 350, y: 0 },
    data: {
      label: "Segment Entry",
      description: "High DPD UAE Borrowers",
      triggerType: "segment_entry",
      segment: "High DPD UAE Borrowers",
      schedule: "continuously",
    },
  },
  // Condition: Check DPD > 60
  {
    id: "condition-1",
    type: "condition",
    position: { x: 350, y: 140 },
    data: {
      label: "Check Attribute",
      description: "DPD > 60",
      conditionType: "check_attribute",
      field: "dpd",
      operator: "greater_than",
      value: "60",
    },
  },
  // YES branch
  // Wait 24h
  {
    id: "wait-1",
    type: "wait",
    position: { x: 100, y: 290 },
    data: {
      label: "Wait",
      description: "Wait 24 hours",
      duration: 24,
      unit: "hours",
      skipWeekends: false,
      respectContactHours: true,
    },
  },
  // Send Email "Urgent"
  {
    id: "action-email-1",
    type: "action",
    position: { x: 100, y: 430 },
    data: {
      label: "Send Email",
      description: "Urgent Collection Notice",
      actionType: "email",
      template: "Overdue Notice",
    },
  },
  // Condition: Opened?
  {
    id: "condition-2",
    type: "condition",
    position: { x: 100, y: 570 },
    data: {
      label: "Has Done Event",
      description: "Email Opened?",
      conditionType: "has_done_event",
      event: "Email Opened",
      timeWindow: 24,
      timeWindowUnit: "hours",
    },
  },
  // Opened Yes -> Send WA
  {
    id: "action-wa-1",
    type: "action",
    position: { x: -100, y: 720 },
    data: {
      label: "Send WhatsApp",
      description: "PTP Follow-up WA",
      actionType: "whatsapp",
      template: "PTP Follow-up WA",
    },
  },
  // Opened No -> Start AI Call
  {
    id: "action-call-1",
    type: "action",
    position: { x: 300, y: 720 },
    data: {
      label: "Start AI Call",
      description: "Standard Collection",
      actionType: "call",
      template: "Standard Collection",
      voice: "Male",
      language: "English",
      maxAttempts: 3,
    },
  },
  // End nodes for Yes branch
  {
    id: "end-1",
    type: "end",
    position: { x: -100, y: 860 },
    data: { label: "End Journey", outcome: "Converted", recordOutcome: true },
  },
  {
    id: "end-2",
    type: "end",
    position: { x: 300, y: 860 },
    data: { label: "End Journey", outcome: "Exhausted", recordOutcome: true },
  },

  // NO branch
  // Send SMS "Payment Reminder"
  {
    id: "action-sms-1",
    type: "action",
    position: { x: 600, y: 290 },
    data: {
      label: "Send SMS",
      description: "Payment Reminder",
      actionType: "sms",
      template: "Payment Due SMS",
    },
  },
  // Wait 48h
  {
    id: "wait-2",
    type: "wait",
    position: { x: 600, y: 430 },
    data: {
      label: "Wait",
      description: "Wait 48 hours",
      duration: 48,
      unit: "hours",
      skipWeekends: false,
      respectContactHours: true,
    },
  },
  // Send WhatsApp "Friendly Reminder"
  {
    id: "action-wa-2",
    type: "action",
    position: { x: 600, y: 570 },
    data: {
      label: "Send WhatsApp",
      description: "Payment Reminder WA",
      actionType: "whatsapp",
      template: "Payment Reminder WA",
    },
  },
  // End for No branch
  {
    id: "end-3",
    type: "end",
    position: { x: 600, y: 720 },
    data: { label: "End Journey", outcome: "Completed", recordOutcome: true },
  },
];

const highDpdEdges: Edge[] = [
  // Trigger -> Condition 1
  {
    id: "e-trigger-cond1",
    source: "trigger-1",
    target: "condition-1",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  // Condition 1 YES -> Wait 24h
  {
    id: "e-cond1-yes",
    source: "condition-1",
    sourceHandle: "yes",
    target: "wait-1",
    type: "smoothstep",
    animated: true,
    label: "Yes",
    style: { stroke: "#22c55e" },
  },
  // Condition 1 NO -> Send SMS
  {
    id: "e-cond1-no",
    source: "condition-1",
    sourceHandle: "no",
    target: "action-sms-1",
    type: "smoothstep",
    animated: true,
    label: "No",
    style: { stroke: "#ef4444" },
  },
  // Wait 24h -> Send Email
  {
    id: "e-wait1-email",
    source: "wait-1",
    target: "action-email-1",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  // Send Email -> Condition 2
  {
    id: "e-email-cond2",
    source: "action-email-1",
    target: "condition-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  // Condition 2 YES -> Send WA 1
  {
    id: "e-cond2-yes",
    source: "condition-2",
    sourceHandle: "yes",
    target: "action-wa-1",
    type: "smoothstep",
    animated: true,
    label: "Yes",
    style: { stroke: "#22c55e" },
  },
  // Condition 2 NO -> Start Call
  {
    id: "e-cond2-no",
    source: "condition-2",
    sourceHandle: "no",
    target: "action-call-1",
    type: "smoothstep",
    animated: true,
    label: "No",
    style: { stroke: "#ef4444" },
  },
  // Send WA 1 -> End 1
  {
    id: "e-wa1-end1",
    source: "action-wa-1",
    target: "end-1",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  // Start Call -> End 2
  {
    id: "e-call-end2",
    source: "action-call-1",
    target: "end-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  // Send SMS -> Wait 48h
  {
    id: "e-sms-wait2",
    source: "action-sms-1",
    target: "wait-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  // Wait 48h -> Send WA 2
  {
    id: "e-wait2-wa2",
    source: "wait-2",
    target: "action-wa-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  // Send WA 2 -> End 3
  {
    id: "e-wa2-end3",
    source: "action-wa-2",
    target: "end-3",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
];

/* ======================== Broken Promise Follow-up ======================== */

const brokenPromiseNodes: Node[] = [
  {
    id: "bp-trigger",
    type: "trigger",
    position: { x: 300, y: 0 },
    data: {
      label: "Attribute Change",
      description: "PTP Status -> Broken",
      triggerType: "attribute_change",
      field: "Payment Status",
      condition: "changes to",
      conditionValue: "Broken",
      schedule: "continuously",
    },
  },
  {
    id: "bp-wait-1",
    type: "wait",
    position: { x: 300, y: 140 },
    data: {
      label: "Wait",
      description: "Wait 4 hours",
      duration: 4,
      unit: "hours",
      skipWeekends: false,
      respectContactHours: true,
    },
  },
  {
    id: "bp-sms",
    type: "action",
    position: { x: 300, y: 280 },
    data: {
      label: "Send SMS",
      description: "PTP Reminder",
      actionType: "sms",
      template: "PTP Reminder",
    },
  },
  {
    id: "bp-wait-2",
    type: "wait",
    position: { x: 300, y: 420 },
    data: {
      label: "Wait",
      description: "Wait 24 hours",
      duration: 24,
      unit: "hours",
      skipWeekends: false,
      respectContactHours: true,
    },
  },
  {
    id: "bp-condition",
    type: "condition",
    position: { x: 300, y: 560 },
    data: {
      label: "Has Done Event",
      description: "Payment Made?",
      conditionType: "has_done_event",
      event: "Payment Made",
      timeWindow: 24,
      timeWindowUnit: "hours",
    },
  },
  // YES -> End (Converted)
  {
    id: "bp-end-yes",
    type: "end",
    position: { x: 100, y: 720 },
    data: { label: "End Journey", outcome: "Converted", recordOutcome: true },
  },
  // NO -> Send Email
  {
    id: "bp-email",
    type: "action",
    position: { x: 500, y: 720 },
    data: {
      label: "Send Email",
      description: "Broken Promise Notice",
      actionType: "email",
      template: "Final Warning",
    },
  },
  {
    id: "bp-wait-3",
    type: "wait",
    position: { x: 500, y: 860 },
    data: {
      label: "Wait",
      description: "Wait 48 hours",
      duration: 48,
      unit: "hours",
      skipWeekends: false,
      respectContactHours: true,
    },
  },
  {
    id: "bp-call",
    type: "action",
    position: { x: 500, y: 1000 },
    data: {
      label: "Start AI Call",
      description: "PTP Follow-up",
      actionType: "call",
      template: "PTP Follow-up",
      voice: "Male",
      language: "English",
      maxAttempts: 3,
    },
  },
  {
    id: "bp-end-no",
    type: "end",
    position: { x: 500, y: 1140 },
    data: { label: "End Journey", outcome: "Exhausted", recordOutcome: true },
  },
];

const brokenPromiseEdges: Edge[] = [
  {
    id: "bp-e1",
    source: "bp-trigger",
    target: "bp-wait-1",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "bp-e2",
    source: "bp-wait-1",
    target: "bp-sms",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "bp-e3",
    source: "bp-sms",
    target: "bp-wait-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "bp-e4",
    source: "bp-wait-2",
    target: "bp-condition",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "bp-e5-yes",
    source: "bp-condition",
    sourceHandle: "yes",
    target: "bp-end-yes",
    type: "smoothstep",
    animated: true,
    label: "Yes",
    style: { stroke: "#22c55e" },
  },
  {
    id: "bp-e5-no",
    source: "bp-condition",
    sourceHandle: "no",
    target: "bp-email",
    type: "smoothstep",
    animated: true,
    label: "No",
    style: { stroke: "#ef4444" },
  },
  {
    id: "bp-e6",
    source: "bp-email",
    target: "bp-wait-3",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "bp-e7",
    source: "bp-wait-3",
    target: "bp-call",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "bp-e8",
    source: "bp-call",
    target: "bp-end-no",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
];

/* ======================== Early Delinquency Nudge ======================== */

const earlyNudgeNodes: Node[] = [
  {
    id: "en-trigger",
    type: "trigger",
    position: { x: 350, y: 0 },
    data: {
      label: "Segment Entry",
      description: "Low Risk Active Accounts",
      triggerType: "segment_entry",
      segment: "Low Risk Active Accounts",
      schedule: "daily",
      scheduleTime: "09:00",
    },
  },
  {
    id: "en-condition-1",
    type: "condition",
    position: { x: 350, y: 140 },
    data: {
      label: "Is Reachable On",
      description: "WhatsApp?",
      conditionType: "is_reachable_on",
      channels: ["whatsapp"],
    },
  },
  // YES -> Send WhatsApp
  {
    id: "en-wa",
    type: "action",
    position: { x: 100, y: 290 },
    data: {
      label: "Send WhatsApp",
      description: "Payment Reminder WA",
      actionType: "whatsapp",
      template: "Payment Reminder WA",
    },
  },
  {
    id: "en-wait-1",
    type: "wait",
    position: { x: 100, y: 430 },
    data: {
      label: "Wait",
      description: "Wait 48 hours",
      duration: 48,
      unit: "hours",
      skipWeekends: true,
      respectContactHours: true,
    },
  },
  {
    id: "en-condition-2",
    type: "condition",
    position: { x: 100, y: 570 },
    data: {
      label: "Has Done Event",
      description: "Payment Made?",
      conditionType: "has_done_event",
      event: "Payment Made",
      timeWindow: 48,
      timeWindowUnit: "hours",
    },
  },
  {
    id: "en-end-converted",
    type: "end",
    position: { x: -100, y: 720 },
    data: { label: "End Journey", outcome: "Converted", recordOutcome: true },
  },
  {
    id: "en-call",
    type: "action",
    position: { x: 300, y: 720 },
    data: {
      label: "Start AI Call",
      description: "Standard Collection",
      actionType: "call",
      template: "Standard Collection",
      voice: "Female",
      language: "English",
      maxAttempts: 2,
    },
  },
  {
    id: "en-end-unresponsive",
    type: "end",
    position: { x: 300, y: 860 },
    data: { label: "End Journey", outcome: "Unresponsive", recordOutcome: true },
  },
  // NO branch -> Send SMS
  {
    id: "en-sms",
    type: "action",
    position: { x: 600, y: 290 },
    data: {
      label: "Send SMS",
      description: "Payment Due SMS",
      actionType: "sms",
      template: "Payment Due SMS",
    },
  },
  {
    id: "en-wait-2",
    type: "wait",
    position: { x: 600, y: 430 },
    data: {
      label: "Wait",
      description: "Wait 72 hours",
      duration: 72,
      unit: "hours",
      skipWeekends: false,
      respectContactHours: true,
    },
  },
  {
    id: "en-email",
    type: "action",
    position: { x: 600, y: 570 },
    data: {
      label: "Send Email",
      description: "Overdue Notice",
      actionType: "email",
      template: "Overdue Notice",
    },
  },
  {
    id: "en-end-exhausted",
    type: "end",
    position: { x: 600, y: 720 },
    data: { label: "End Journey", outcome: "Exhausted", recordOutcome: true },
  },
];

const earlyNudgeEdges: Edge[] = [
  {
    id: "en-e1",
    source: "en-trigger",
    target: "en-condition-1",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "en-e2-yes",
    source: "en-condition-1",
    sourceHandle: "yes",
    target: "en-wa",
    type: "smoothstep",
    animated: true,
    label: "Yes",
    style: { stroke: "#22c55e" },
  },
  {
    id: "en-e2-no",
    source: "en-condition-1",
    sourceHandle: "no",
    target: "en-sms",
    type: "smoothstep",
    animated: true,
    label: "No",
    style: { stroke: "#ef4444" },
  },
  {
    id: "en-e3",
    source: "en-wa",
    target: "en-wait-1",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "en-e4",
    source: "en-wait-1",
    target: "en-condition-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "en-e5-yes",
    source: "en-condition-2",
    sourceHandle: "yes",
    target: "en-end-converted",
    type: "smoothstep",
    animated: true,
    label: "Yes",
    style: { stroke: "#22c55e" },
  },
  {
    id: "en-e5-no",
    source: "en-condition-2",
    sourceHandle: "no",
    target: "en-call",
    type: "smoothstep",
    animated: true,
    label: "No",
    style: { stroke: "#ef4444" },
  },
  {
    id: "en-e6",
    source: "en-call",
    target: "en-end-unresponsive",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  // NO branch
  {
    id: "en-e7",
    source: "en-sms",
    target: "en-wait-2",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "en-e8",
    source: "en-wait-2",
    target: "en-email",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
  {
    id: "en-e9",
    source: "en-email",
    target: "en-end-exhausted",
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--chart-2)" },
  },
];

/* ================================================================== */

export const journeyFlows: Record<string, JourneyFlowData> = {
  "high-dpd": { nodes: highDpdNodes, edges: highDpdEdges },
  "broken-promise": { nodes: brokenPromiseNodes, edges: brokenPromiseEdges },
  "early-delinquency": { nodes: earlyNudgeNodes, edges: earlyNudgeEdges },
  new: { nodes: [], edges: [] },
};

/* Helper to find journey list item */
export function getJourneyById(id: string): JourneyListItem | undefined {
  return journeysList.find((j) => j.id === id);
}

/* Helper to get flow data */
export function getJourneyFlow(id: string): JourneyFlowData {
  return journeyFlows[id] ?? { nodes: [], edges: [] };
}

/* ------------------------------------------------------------------ */
/*  Mock live borrower counts per node (shown when journey is active) */
/* ------------------------------------------------------------------ */

export const liveNodeCounts: Record<string, Record<string, number>> = {
  "high-dpd": {
    "trigger-1": 1248,
    "condition-1": 1201,
    "wait-1": 843,
    "action-email-1": 843,
    "condition-2": 780,
    "action-wa-1": 514,
    "action-call-1": 266,
    "action-sms-1": 358,
    "wait-2": 321,
    "action-wa-2": 298,
    "end-1": 421,
    "end-2": 189,
    "end-3": 245,
  },
  "broken-promise": {},
  "early-delinquency": {},
};

/* ------------------------------------------------------------------ */
/*  Journey Templates                                                  */
/* ------------------------------------------------------------------ */

export type TemplateCategory =
  | "collections"
  | "early_delinquency"
  | "settlement"
  | "hardship"
  | "re-engagement";

export type Channel = "email" | "sms" | "whatsapp" | "call";

export interface JourneyTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  channels: Channel[];
  estimatedSteps: number;
  estimatedDuration: string;
  tags: string[];
  nodes: Node[];
  edges: Edge[];
}

/* helper to make simple smoothstep edges */
function tplEdge(id: string, source: string, target: string, sourceHandle?: string): Edge {
  return {
    id,
    source,
    target,
    ...(sourceHandle ? { sourceHandle } : {}),
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--primary)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
  };
}

export const journeyTemplates: JourneyTemplate[] = [
  /* 1 ─ Early Delinquency (1-30 DPD) */
  {
    id: "tpl-early-delinquency",
    name: "Early Delinquency (1-30 DPD)",
    description: "A short 3-step nudge for newly overdue accounts: email → wait → SMS.",
    category: "early_delinquency",
    channels: ["email", "sms"],
    estimatedSteps: 3,
    estimatedDuration: "3 days",
    tags: ["1-30 DPD", "simple"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 200, y: 0 }, data: { label: "Segment Entry", description: "1-30 DPD accounts", triggerType: "segment_entry", segment: "1-30 DPD", schedule: "continuously" } },
      { id: "a1", type: "action", position: { x: 200, y: 180 }, data: { label: "Send Email", actionType: "email", template: "Payment reminder" } },
      { id: "w1", type: "wait", position: { x: 200, y: 360 }, data: { label: "Wait 3 Days", duration: 3, unit: "days" } },
      { id: "a2", type: "action", position: { x: 200, y: 540 }, data: { label: "Send SMS", actionType: "sms", template: "Overdue reminder" } },
    ],
    edges: [tplEdge("e1", "t1", "a1"), tplEdge("e2", "a1", "w1"), tplEdge("e3", "w1", "a2")],
  },
  /* 2 ─ Multi-channel Reminder */
  {
    id: "tpl-multichannel",
    name: "Multi-channel Reminder",
    description: "Email first, then check opens — route to WhatsApp or SMS based on engagement.",
    category: "collections",
    channels: ["email", "whatsapp", "sms"],
    estimatedSteps: 5,
    estimatedDuration: "5 days",
    tags: ["multi-channel", "branching"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 200, y: 0 }, data: { label: "Segment Entry", description: "Overdue accounts", triggerType: "segment_entry", segment: "Overdue", schedule: "continuously" } },
      { id: "a1", type: "action", position: { x: 200, y: 180 }, data: { label: "Send Email", actionType: "email", template: "Payment reminder" } },
      { id: "w1", type: "wait", position: { x: 200, y: 360 }, data: { label: "Wait 2 Days", duration: 2, unit: "days" } },
      { id: "c1", type: "condition", position: { x: 200, y: 540 }, data: { label: "Opened Email?", conditionType: "has_done_event", event: "email_open" } },
      { id: "a2", type: "action", position: { x: 20, y: 720 }, data: { label: "Send WhatsApp", actionType: "whatsapp", template: "Friendly follow-up" } },
      { id: "a3", type: "action", position: { x: 380, y: 720 }, data: { label: "Send SMS", actionType: "sms", template: "Short reminder" } },
      { id: "e1", type: "end", position: { x: 200, y: 900 }, data: { label: "End", outcome: "Completed" } },
    ],
    edges: [tplEdge("e1", "t1", "a1"), tplEdge("e2", "a1", "w1"), tplEdge("e3", "w1", "c1"), tplEdge("e4", "c1", "a2", "yes"), tplEdge("e5", "c1", "a3", "no"), tplEdge("e6", "a2", "e1"), tplEdge("e7", "a3", "e1")],
  },
  /* 3 ─ Settlement Offer */
  {
    id: "tpl-settlement",
    name: "Settlement Offer",
    description: "Send a settlement email, wait for CTA click, then follow up non-responders via SMS.",
    category: "settlement",
    channels: ["email", "sms"],
    estimatedSteps: 4,
    estimatedDuration: "5 days",
    tags: ["settlement", "CTA tracking"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 200, y: 0 }, data: { label: "Segment Entry", description: "Settlement-eligible", triggerType: "segment_entry", segment: "Settlement eligible", schedule: "continuously" } },
      { id: "a1", type: "action", position: { x: 200, y: 180 }, data: { label: "Email Settlement Offer", actionType: "email", template: "Settlement offer" } },
      { id: "w1", type: "wait", position: { x: 200, y: 360 }, data: { label: "Wait 5 Days", duration: 5, unit: "days" } },
      { id: "c1", type: "condition", position: { x: 200, y: 540 }, data: { label: "Clicked CTA?", conditionType: "has_done_event", event: "email_click" } },
      { id: "e1", type: "end", position: { x: 20, y: 720 }, data: { label: "Converted", outcome: "Converted" } },
      { id: "a2", type: "action", position: { x: 380, y: 720 }, data: { label: "SMS Follow-up", actionType: "sms", template: "Settlement follow-up" } },
    ],
    edges: [tplEdge("e1", "t1", "a1"), tplEdge("e2", "a1", "w1"), tplEdge("e3", "w1", "c1"), tplEdge("e4", "c1", "e1", "yes"), tplEdge("e5", "c1", "a2", "no")],
  },
  /* 4 ─ Hardship Outreach */
  {
    id: "tpl-hardship",
    name: "Hardship Outreach",
    description: "Empathetic email followed by a gentle SMS check-in after one week.",
    category: "hardship",
    channels: ["email", "sms"],
    estimatedSteps: 3,
    estimatedDuration: "7 days",
    tags: ["hardship", "empathetic"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 200, y: 0 }, data: { label: "Segment Entry", description: "Hardship-flagged", triggerType: "segment_entry", segment: "Hardship", schedule: "continuously" } },
      { id: "a1", type: "action", position: { x: 200, y: 180 }, data: { label: "Email (Empathetic)", actionType: "email", template: "Hardship support" } },
      { id: "w1", type: "wait", position: { x: 200, y: 360 }, data: { label: "Wait 7 Days", duration: 7, unit: "days" } },
      { id: "a2", type: "action", position: { x: 200, y: 540 }, data: { label: "Send SMS", actionType: "sms", template: "Check-in" } },
    ],
    edges: [tplEdge("e1", "t1", "a1"), tplEdge("e2", "a1", "w1"), tplEdge("e3", "w1", "a2")],
  },
  /* 5 ─ High-Risk Escalation */
  {
    id: "tpl-high-risk",
    name: "High-Risk Escalation",
    description: "Start with SMS, check for reply — flag for agent if yes, email + wait if no.",
    category: "collections",
    channels: ["sms", "email"],
    estimatedSteps: 6,
    estimatedDuration: "4 days",
    tags: ["escalation", "agent handoff"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 200, y: 0 }, data: { label: "Segment Entry", description: "High-risk accounts", triggerType: "segment_entry", segment: "High risk", schedule: "continuously" } },
      { id: "a1", type: "action", position: { x: 200, y: 180 }, data: { label: "Send SMS", actionType: "sms", template: "Urgent reminder" } },
      { id: "w1", type: "wait", position: { x: 200, y: 360 }, data: { label: "Wait 1 Day", duration: 1, unit: "days" } },
      { id: "c1", type: "condition", position: { x: 200, y: 540 }, data: { label: "Replied?", conditionType: "has_done_event", event: "sms_reply" } },
      { id: "a2", type: "action", position: { x: 20, y: 720 }, data: { label: "Flag for Agent", actionType: "attribute", description: "Tag for manual review" } },
      { id: "a3", type: "action", position: { x: 380, y: 720 }, data: { label: "Send Email", actionType: "email", template: "Escalation notice" } },
      { id: "w2", type: "wait", position: { x: 380, y: 900 }, data: { label: "Wait 3 Days", duration: 3, unit: "days" } },
      { id: "e1", type: "end", position: { x: 200, y: 1080 }, data: { label: "End", outcome: "Completed" } },
    ],
    edges: [tplEdge("e1", "t1", "a1"), tplEdge("e2", "a1", "w1"), tplEdge("e3", "w1", "c1"), tplEdge("e4", "c1", "a2", "yes"), tplEdge("e5", "c1", "a3", "no"), tplEdge("e6", "a2", "e1"), tplEdge("e7", "a3", "w2"), tplEdge("e8", "w2", "e1")],
  },
  /* 6 ─ Payment Reminder Sequence */
  {
    id: "tpl-payment-reminder",
    name: "Payment Reminder Sequence",
    description: "Email → SMS → AI Call over 5 days, escalating across channels.",
    category: "early_delinquency",
    channels: ["email", "sms", "call"],
    estimatedSteps: 5,
    estimatedDuration: "5 days",
    tags: ["multi-channel", "AI call"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 200, y: 0 }, data: { label: "Segment Entry", description: "Payment overdue", triggerType: "segment_entry", segment: "Overdue", schedule: "continuously" } },
      { id: "a1", type: "action", position: { x: 200, y: 180 }, data: { label: "Send Email", actionType: "email", template: "Friendly reminder" } },
      { id: "w1", type: "wait", position: { x: 200, y: 360 }, data: { label: "Wait 3 Days", duration: 3, unit: "days" } },
      { id: "a2", type: "action", position: { x: 200, y: 540 }, data: { label: "Send SMS", actionType: "sms", template: "Payment reminder" } },
      { id: "w2", type: "wait", position: { x: 200, y: 720 }, data: { label: "Wait 2 Days", duration: 2, unit: "days" } },
      { id: "a3", type: "action", position: { x: 200, y: 900 }, data: { label: "AI Call", actionType: "call", template: "Payment collection" } },
    ],
    edges: [tplEdge("e1", "t1", "a1"), tplEdge("e2", "a1", "w1"), tplEdge("e3", "w1", "a2"), tplEdge("e4", "a2", "w2"), tplEdge("e5", "w2", "a3")],
  },
  /* 7 ─ Re-engagement (90+ DPD) */
  {
    id: "tpl-reengagement",
    name: "Re-engagement (90+ DPD)",
    description: "Long-dormant accounts: settlement email, then SMS letter follow-up over 3 weeks.",
    category: "re-engagement",
    channels: ["email", "sms"],
    estimatedSteps: 4,
    estimatedDuration: "21 days",
    tags: ["90+ DPD", "re-engage"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 200, y: 0 }, data: { label: "Segment Entry", description: "90+ DPD dormant", triggerType: "segment_entry", segment: "90+ DPD", schedule: "continuously" } },
      { id: "a1", type: "action", position: { x: 200, y: 180 }, data: { label: "Settlement Email", actionType: "email", template: "Settlement offer" } },
      { id: "w1", type: "wait", position: { x: 200, y: 360 }, data: { label: "Wait 7 Days", duration: 7, unit: "days" } },
      { id: "a2", type: "action", position: { x: 200, y: 540 }, data: { label: "SMS Follow-up", actionType: "sms", template: "Re-engagement" } },
      { id: "w2", type: "wait", position: { x: 200, y: 720 }, data: { label: "Wait 14 Days", duration: 14, unit: "days" } },
      { id: "e1", type: "end", position: { x: 200, y: 900 }, data: { label: "End", outcome: "Exhausted" } },
    ],
    edges: [tplEdge("e1", "t1", "a1"), tplEdge("e2", "a1", "w1"), tplEdge("e3", "w1", "a2"), tplEdge("e4", "a2", "w2"), tplEdge("e5", "w2", "e1")],
  },
  /* 8 ─ Promise to Pay Follow-up */
  {
    id: "tpl-ptp",
    name: "Promise to Pay Follow-up",
    description: "Confirm PTP via WhatsApp, wait until the promised date, then send a payment reminder SMS.",
    category: "collections",
    channels: ["whatsapp", "sms"],
    estimatedSteps: 3,
    estimatedDuration: "Varies",
    tags: ["PTP", "follow-up"],
    nodes: [
      { id: "t1", type: "trigger", position: { x: 200, y: 0 }, data: { label: "PTP Created", description: "Promise-to-pay event", triggerType: "event", event: "ptp_created" } },
      { id: "a1", type: "action", position: { x: 200, y: 180 }, data: { label: "WhatsApp Confirm", actionType: "whatsapp", template: "PTP confirmation" } },
      { id: "w1", type: "wait", position: { x: 200, y: 360 }, data: { label: "Wait Until PTP Date", duration: 5, unit: "days" } },
      { id: "a2", type: "action", position: { x: 200, y: 540 }, data: { label: "Payment Reminder SMS", actionType: "sms", template: "PTP payment day" } },
    ],
    edges: [tplEdge("e1", "t1", "a1"), tplEdge("e2", "a1", "w1"), tplEdge("e3", "w1", "a2")],
  },
];

/* Register template flows so the canvas can load them */
for (const tpl of journeyTemplates) {
  journeyFlows[tpl.id] = { nodes: tpl.nodes, edges: tpl.edges };
}
