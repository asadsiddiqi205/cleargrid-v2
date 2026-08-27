"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type DragEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type ReactFlowInstance,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";

import { TriggerNode } from "@/components/journeys/nodes/trigger-node";
import { ConditionNode } from "@/components/journeys/nodes/condition-node";
import { ActionNode } from "@/components/journeys/nodes/action-node";
import { WaitNode } from "@/components/journeys/nodes/wait-node";
import { SplitNode } from "@/components/journeys/nodes/split-node";
import { EndNode } from "@/components/journeys/nodes/end-node";
import { GenericNode } from "@/components/journeys/nodes/generic-node";
import { ComponentInstanceNode } from "@/components/journeys/nodes/component-instance-node";
import { SaveAsComponentModal } from "@/components/journeys/save-as-component-modal";
import { ComponentInstancePanel } from "@/components/journeys/component-instance-panel";
import { InstanceInnerNodeEditor } from "@/components/journeys/instance-inner-node-editor";
import {
  seedComponentsIfEmpty,
  createInstanceData,
  deleteMaster,
  getMasterById,
  saveMaster,
  publishMaster,
  resolveInstance,
  upsertOverride,
  removeOverride,
  isPropertyLocked,
  buildInstanceCanvasPayload,
  type ComponentMaster,
  type ComponentInstanceData,
} from "@/data/components";
import { NodePalette } from "@/components/journeys/node-palette";
import { NodeConfigPanel } from "@/components/journeys/node-config-panel";
import { JourneyGPTPanel } from "@/components/journeys/journey-gpt-panel";
import { buildBlueprint } from "@/data/journey-blueprints";
import {
  getJourneyFlow,
  getJourneyById,
  liveNodeCounts,
  DEFAULT_EXIT_TRIGGERS,
  type BlockType,
  type ExitTrigger,
} from "@/data/journeys";
import { ExitTriggerPanel, ExitTriggerRow, exitTriggersEqual } from "@/components/journeys/exit-trigger-panel";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Save,
  Rocket,
  Play,
  MoreHorizontal,
  Loader2,
  Copy,
  Download,
  Archive,
  Trash2,
  User,
  FileText,
  Settings as SettingsIcon,
  Sliders,
  Users,
  Check,
  Undo2,
  Redo2,
  Eye,
  BarChart3,
  Handshake,
  Calendar,
  GitBranch,
  Info,
  Maximize2,
  Plus,
  LogOut,
  AlertTriangle,
  Sparkles,
  Lock,
  PhoneCall,
  Wand2,
  RefreshCcw,
  Bug,
  Layers,
  ClipboardList,
  History,
  FileClock,
  Map as MapIcon,
  Boxes,
} from "lucide-react";
import { SimulateDrawer, NodeSampleList } from "@/components/journeys/simulate-drawer";
import { DryRunOverlay } from "@/components/journeys/dry-run-overlay";
import { TraceOverlay } from "@/components/journeys/trace-overlay";
import { synthesizeTrace } from "@/data/borrower-traces";
import { borrowers } from "@/data/borrowers";
import { JourneySubNav } from "@/components/journeys/journey-sub-nav";
import { BorrowerTraceDrawer } from "@/components/journeys/borrower-trace-drawer";
import { BorrowerTracePicker } from "@/components/journeys/borrower-trace-picker";
import { RunPicker } from "@/components/journeys/run-picker";
import { ValidatorDrawer } from "@/components/journeys/validator-drawer";
import {
  SimulationViewChip,
  OverlayLegend,
  SimulationEditedBanner,
} from "@/components/journeys/simulation-view-chip";
import { SimulationTraceModal } from "@/components/journeys/simulation-trace-modal";
import {
  loadSimulation,
  clearSimulation,
  markPublishNudgeSeen,
  wasPublishNudgeSeen,
  saveSimulation,
  type SimulationResult,
} from "@/lib/simulation";
import { runSimulation } from "@/lib/simulation-runner";
import { borrowers as ALL_BORROWERS } from "@/data/borrowers";
import {
  ValidateAiCallModal,
  DeviationAlertBanner,
  NotificationSettingsSection,
} from "@/components/journeys/workshop-panels";
import {
  getActiveAlert,
  DEFAULT_ALERT_SETTINGS,
  postAlertToSlack,
  type JourneyAlertSettings,
} from "@/data/journey-alerts";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Node types registry                                               */
/* ------------------------------------------------------------------ */

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  wait: WaitNode,
  split: SplitNode,
  end: EndNode,
  generic: GenericNode,
  component_group: ComponentInstanceNode,
};

/* ------------------------------------------------------------------ */
/*  Execution levels                                                   */
/* ------------------------------------------------------------------ */

type ExecutionLevel = "deal";

interface ExecutionLevelConfig {
  id: ExecutionLevel;
  label: string;
  icon: typeof User;
  description: string;
  helperText: string;
  dedupLabel: string;
  badgeColor: string;
}

const DEAL_LEVEL: ExecutionLevelConfig = {
  id: "deal",
  label: "Deal",
  icon: Handshake,
  description: "Per deal",
  helperText:
    "One active instance per deal. Use for deal-level collection decisions, payment follow-ups, and escalation flows.",
  dedupLabel: "One active instance per deal",
  badgeColor: "text-primary-400",
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface JourneyCanvasProps {
  journeyId: string;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

let nodeIdCounter = 100;
const HISTORY_LIMIT = 50;

export default function JourneyCanvas({ journeyId }: JourneyCanvasProps) {
  const flow = getJourneyFlow(journeyId);
  const journeyMeta = getJourneyById(journeyId);
  const journeyName = journeyMeta?.name ?? "New Journey";

  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [nameValue, setNameValue] = useState(journeyName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [status, setStatus] = useState<"draft" | "published" | "scheduled">("draft");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Execution level
  const executionLevel: ExecutionLevel = "deal";
  const currentLevel = DEAL_LEVEL;

  // Pre-launch validation dialog
  /**
   * Part 1.5 — publish gate issues carry severity + optional focus target.
   * `nodeId` (and optional `field`) power the "Fix" button that closes the
   * dialog, selects the node, and pulses its border red for 3 seconds.
   */
  type PublishIssue = {
    severity: "blocker" | "warning" | "info";
    title: string;
    detail?: string;
    nodeId?: string;
    field?: string;
  };
  const [validationErrors, setValidationErrors] = useState<PublishIssue[]>([]);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [focusFieldToken, setFocusFieldToken] = useState<{ nodeId: string; field?: string; ts: number } | null>(null);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Journey lock — blocks another editor from taking over the session (matches
  // Command's Lock button + "This journey is already open" prompt).
  const [isJourneyLocked, setIsJourneyLocked] = useState(false);
  void setIsJourneyLocked;

  // Palette collapsed toggle (matches Command's "Hide blocks" overflow item)
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  // Debug borrower inline search bar (matches Command's "Debug borrower" overflow)
  const [debugBorrowerOpen, setDebugBorrowerOpen] = useState(false);
  const [debugBorrowerId, setDebugBorrowerId] = useState("");

  // Audit log side sheet (matches Command's "Audit log" overflow)
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  // Version history dialog (matches Command's "Version history" overflow)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);

  // Part 1.2 — in-canvas Simulate drawer + per-node count overlay from result.
  const [simulateOpen, setSimulateOpen] = useState(false);
  // Eternals-style Validator (regression drawer).
  const [validatorOpen, setValidatorOpen] = useState(false);
  // When set, the canvas renders a single borrower's real path highlighted
  // with per-pass colours (green/amber/blue/violet). Cleared by the drawer.
  const [validatorTraceBorrowerId, setValidatorTraceBorrowerId] = useState<string | null>(null);
  // Single-borrower trace — the trace picker + drawer. tracePickerOpen shows
  // the borrower search; traceBorrowerActive holds the borrower whose trace
  // is currently rendered in the drawer.
  const [tracePickerOpen, setTracePickerOpen] = useState(false);
  const [traceBorrowerActive, setTraceBorrowerActive] = useState<string | null>(null);
  // Trace modal (Part 2.6) — set to a borrower id to open.
  const [traceBorrowerId, setTraceBorrowerId] = useState<string | null>(null);
  // Simulation overlay visibility toggle (Part 3.1).
  const [simulationOverlayHidden, setSimulationOverlayHidden] = useState(false);
  // Publish soft-nudge dialog (Part 3.4).
  const [publishNudgeOpen, setPublishNudgeOpen] = useState(false);
  // Component selection state — used to show the floating action bar and the
  // "Save as component" modal (Part 2).
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [saveComponentModalOpen, setSaveComponentModalOpen] = useState(false);
  // When editing a node INSIDE an expanded component instance (Part 4.3) —
  // pairs an instance node id with a master-scoped node id.
  const [instanceInnerFocus, setInstanceInnerFocus] = useState<{
    instanceNodeId: string;
    masterNodeId: string;
  } | null>(null);
  const [simulateResult, setSimulateResult] = useState<SimulationResult | null>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);

  /* ---------- Eternals-style one-click Dry-run ---------- */
  const runDryRun = useCallback(async () => {
    if (isDryRunning) return;
    setIsDryRunning(true);
    setSimulateResult(null);
    // Small latency so the state change feels like a fetch.
    await new Promise((r) => window.setTimeout(r, 500));
    const result = runSimulation({
      journeyId,
      cohort: ALL_BORROWERS,
      cohortLabel: `Full audience · ${ALL_BORROWERS.length.toLocaleString()} borrowers`,
      cohortMode: "full",
      cap: ALL_BORROWERS.length,
      nodes,
      edges,
      outcomeChoices: {},
    });
    saveSimulation(journeyId, result);
    setSimulateResult(result);
    setIsDryRunning(false);
    toast.success("Dry-run complete", {
      description: `${result.entered.toLocaleString()} borrowers walked the journey. Click any node's count pill to see who.`,
    });
  }, [isDryRunning, journeyId, nodes, edges]);

  // Hydrate cached simulation from localStorage (Part 3.2).
  useEffect(() => {
    const cached = loadSimulation(journeyId);
    if (cached) setSimulateResult(cached);
  }, [journeyId]);

  // Seed the component library on first-run (no-op if already seeded).
  useEffect(() => {
    seedComponentsIfEmpty();
  }, []);

  // Resync child nodes' data whenever a group's overrides change. Signature:
  // for each group node, apply resolveInstance(master, group.overrides) to
  // the master node data, and copy those values into the child's data on
  // canvas so the child renderer reflects overrides live. Runs cheap — an
  // O(children) shallow copy per render pass — and only touches nodes whose
  // resolved value actually differs.
  useEffect(() => {
    const groupById = new Map<string, ComponentInstanceData>();
    for (const n of nodes) {
      if (n.type === "component_group") {
        groupById.set(n.id, n.data as unknown as ComponentInstanceData);
      }
    }
    if (groupById.size === 0) return;

    let mutated = false;
    const nextNodes = nodes.map((n) => {
      const marker = (n.data as { _componentInstance?: { componentInstanceId: string; masterNodeId: string } })
        ?._componentInstance;
      if (!marker) return n;
      const g = groupById.get(marker.componentInstanceId);
      if (!g) return n;
      const master = getMasterById(g.componentId);
      if (!master) return n;
      const masterNode = master.nodes.find((mn) => mn.id === marker.masterNodeId);
      if (!masterNode) return n;
      const resolved = resolveInstance(master, g.overrides).nodes.find((rn) => rn.id === marker.masterNodeId);
      if (!resolved) return n;
      // Only rewrite when a top-level key differs. Cheap heuristic.
      const nextData = {
        ...(n.data as Record<string, unknown>),
        ...(resolved.data as Record<string, unknown>),
        _componentInstance: marker,
      };
      const same = shallowSameData(n.data as Record<string, unknown>, nextData);
      if (same) return n;
      mutated = true;
      return { ...n, data: nextData };
    });
    if (mutated) setNodes(nextNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Part 4.5 / 7.4 — on first canvas load only, detect component instances
  // whose master version has advanced past the instance snapshot. Auto-bump
  // the snapshot and surface a preserve-overrides toast for each affected
  // component. Runs exactly once per mount to avoid re-firing on setNodes.
  const driftCheckedRef = useRef(false);
  useEffect(() => {
    if (driftCheckedRef.current) return;
    driftCheckedRef.current = true;
    setNodes((current) => {
      const drifted = new Map<string, { count: number; master: ComponentMaster; overrideCount: number }>();
      let mutated = false;
      const nextNodes = current.map((n) => {
        const d = n.data as unknown as ComponentInstanceData | undefined;
        if (!d || d.kind !== "component_instance") return n;
        const master = getMasterById(d.componentId);
        if (!master) return n;
        if (master.version <= d.componentVersion) return n;
        const prev = drifted.get(d.componentId);
        const overrideCount = d.overrides?.length ?? 0;
        drifted.set(d.componentId, {
          count: (prev?.count ?? 0) + 1,
          master,
          overrideCount: (prev?.overrideCount ?? 0) + overrideCount,
        });
        mutated = true;
        return {
          ...n,
          data: {
            ...d,
            componentVersion: master.version,
            name: master.name,
            category: master.category,
            outputPorts: master.outputPorts,
          } as unknown as Record<string, unknown>,
        };
      });
      for (const entry of drifted.values()) {
        toast.info(`"${entry.master.name}" master updated`, {
          description: entry.overrideCount > 0
            ? `Updated to v${entry.master.version} across ${entry.count} instance${entry.count === 1 ? "" : "s"} · your ${entry.overrideCount} override${entry.overrideCount === 1 ? "" : "s"} preserved.`
            : `Updated to v${entry.master.version} across ${entry.count} instance${entry.count === 1 ? "" : "s"}.`,
        });
      }
      return mutated ? nextNodes : current;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link URL ?sim=<id> (Part 3.5). Reflect the current sim id in the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const wanted = simulateResult?.id ?? null;
    const current = url.searchParams.get("sim");
    if (wanted !== current) {
      if (wanted) url.searchParams.set("sim", wanted);
      else url.searchParams.delete("sim");
      window.history.replaceState(null, "", url.toString());
    }
  }, [simulateResult?.id]);
  // Part 3.1 — analytics time range for canvas count pills.
  const [analyticsRange, setAnalyticsRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
  // Which specific run the Analytics tab inside the node config panel
  // should analyze. null = aggregate view (report-level rollups).
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [sampleForNodeId, setSampleForNodeId] = useState<string | null>(null);

  // Part 1.6 — deviation alert banner state (dismissible per session).
  const [alertDismissed, setAlertDismissed] = useState(false);

  const router = useRouter();

  // Part 1.3 — Validate AI Calls modal.
  const [validateAiCallOpen, setValidateAiCallOpen] = useState(false);

  // Journey GPT — right-side chat panel.
  const [journeyGPTOpen, setJourneyGPTOpen] = useState(false);

  // Part 1.6 — alert settings + computed active alert.
  const [alertSettings, setAlertSettings] = useState<JourneyAlertSettings>(DEFAULT_ALERT_SETTINGS);
  const activeAlert = useMemo(
    () => getActiveAlert(journeyId, alertSettings),
    [journeyId, alertSettings],
  );

  // Fire the (stubbed) Slack post exactly once per active alert.
  useEffect(() => {
    if (activeAlert && alertSettings.enabled && alertSettings.slackChannel) {
      postAlertToSlack(activeAlert, alertSettings.slackChannel, nameValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAlert?.detectedAt, alertSettings.enabled, alertSettings.slackChannel]);

  // Journey analytics (mock stats derived from node count)
  const journeyStats = useMemo(() => {
    const base = nodes.length * 47;
    return {
      entered: Math.round(base * 8),
      active: Math.round(base * 5.2),
      converted: Math.round(base * 1.8),
      exited: Math.round(base * 0.6),
    };
  }, [nodes.length]);
  const [journeySettings, setJourneySettings] = useState({
    segment: "",
    entryRule: "once",
    reEntry: false,
    conversionEvent: "",
    conversionWindow: "7",
    controlGroupPct: "0",
    frequencyCap: "3",
    dnd: true,
    queueing: "immediate",
    parallelChildren: false,
    preventDuplicateInstances: true,
    /** Route inbound-message events through this journey (Command processing) */
    commandProcessing: false,
    /** Default AI-Call retry policy — overridable per Trigger AI Call node */
    aiCallRetryOnFail: false,
  });

  // Journey-level Exit Triggers (separate from canvas Exit Journey nodes)
  const [exitTriggers, setExitTriggers] = useState<ExitTrigger[]>(DEFAULT_EXIT_TRIGGERS);
  const [exitTriggerEditor, setExitTriggerEditor] = useState<{ open: boolean; initial: ExitTrigger | null }>({
    open: false,
    initial: null,
  });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const exitTriggersSectionRef = useRef<HTMLDivElement>(null);

  // History stack for undo/redo
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([
    { nodes: flow.nodes, edges: flow.edges },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const skipHistoryRef = useRef(false);

  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Validation animation state
  const [validateState, setValidateState] = useState<"idle" | "validating" | "valid" | "invalid">(
    "idle"
  );

  /* ---------- history helpers ---------- */
  const pushHistory = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      if (skipHistoryRef.current) {
        skipHistoryRef.current = false;
        return;
      }
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        const next = [...trimmed, { nodes: newNodes, edges: newEdges }];
        // Limit history size
        if (next.length > HISTORY_LIMIT) {
          return next.slice(next.length - HISTORY_LIMIT);
        }
        return next;
      });
      setHistoryIndex((i) => Math.min(i + 1, HISTORY_LIMIT - 1));
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    skipHistoryRef.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistoryIndex((i) => i - 1);
    toast.info("Undone");
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    skipHistoryRef.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryIndex((i) => i + 1);
    toast.info("Redone");
  }, [history, historyIndex, setNodes, setEdges]);

  /* ---------- delete selected node ---------- */
  const deleteSelectedNode = React.useCallback(() => {
    if (!selectedNode) return
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
    setSelectedNode(null)
    toast.info("Node deleted")
  }, [selectedNode, setNodes, setEdges])

  // Keyboard: Cmd+Z / Cmd+Shift+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (isInput) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        deleteSelectedNode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedNode, deleteSelectedNode]);

  /* ---------- connections ---------- */
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--primary)", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
          },
          eds
        );
        pushHistory(nodes, next);
        return next;
      });
    },
    [setEdges, nodes, pushHistory]
  );

  /* ---------- node selection ---------- */
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Child node inside a component instance → route to inner-node editor
    // so edits become overrides on the parent instance.
    const marker = (node.data as { _componentInstance?: { componentInstanceId: string; masterNodeId: string } })
      ?._componentInstance;
    if (marker) {
      setInstanceInnerFocus({
        instanceNodeId: marker.componentInstanceId,
        masterNodeId: marker.masterNodeId,
      });
      setSelectedNode(null);
      return;
    }
    setInstanceInnerFocus(null);
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  /* ---------- drag & drop from palette ---------- */
  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();

      const raw = e.dataTransfer.getData("application/reactflow");
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        nodeType: string;
        blockType?: string;
        data: Record<string, unknown>;
      };

      if (!rfInstance.current) return;

      const position = rfInstance.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      // Component instance drop → expand into a group + children.
      if (parsed.nodeType === "component_instance" || parsed.nodeType === "component_group") {
        const d = parsed.data as unknown as ComponentInstanceData;
        const master = getMasterById(d.componentId);
        if (!master) {
          toast.error("Component not found");
          return;
        }
        const groupId = `cmp-${++nodeIdCounter}`;
        const { groupNode, childNodes, childEdges } = buildInstanceCanvasPayload(
          master,
          position,
          groupId,
        );
        setNodes((nds) => [...nds, groupNode, ...childNodes]);
        setEdges((eds) => [...eds, ...childEdges]);
        pushHistory([...nodes, groupNode, ...childNodes], [...edges, ...childEdges]);
        return;
      }

      const newNode: Node = {
        id: `node-${++nodeIdCounter}`,
        type: parsed.nodeType,
        position,
        data: { ...parsed.data, executionLevel },
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        pushHistory(next, edges);
        return next;
      });
    },
    [setNodes, setEdges, edges, nodes, pushHistory, executionLevel]
  );

  /* ---------- click-to-add from palette ---------- */
  // Drops the new node next to the currently selected node (or at canvas
  // center if nothing is selected) and auto-connects an edge from the
  // selected node into the new one. The new node is then auto-selected so
  // the user can continue chaining.
  const onPaletteAdd = useCallback(
    (block: BlockType) => {
      const NODE_GAP_X = 260;
      const NODE_GAP_Y = 160;

      let position: { x: number; y: number };
      if (selectedNode) {
        position = {
          x: selectedNode.position.x + NODE_GAP_X,
          y: selectedNode.position.y,
        };
      } else if (nodes.length > 0) {
        // Place below the last placed node when nothing is selected
        const last = nodes[nodes.length - 1];
        position = { x: last.position.x, y: last.position.y + NODE_GAP_Y };
      } else {
        // Empty canvas — center-ish starting point
        position = { x: 320, y: 200 };
      }

      const newNode: Node = {
        id: `node-${++nodeIdCounter}`,
        type: block.nodeKind,
        position,
        data: { ...block.defaultData, blockType: block.type, executionLevel },
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        // Don't push history yet — we may also add an edge below
        return next;
      });

      // Auto-connect from selected node, if any
      let nextEdges = edges;
      if (selectedNode) {
        nextEdges = addEdge(
          {
            id: `e-${selectedNode.id}-${newNode.id}`,
            source: selectedNode.id,
            target: newNode.id,
            type: "smoothstep",
            animated: true,
            style: { stroke: "var(--primary)", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
          } as Edge,
          edges
        );
        setEdges(nextEdges);
      }

      pushHistory([...nodes, newNode], nextEdges);
      setSelectedNode(newNode);
      toast.success(`Added "${block.label}"`);
    },
    [nodes, selectedNode, setNodes, setEdges, edges, pushHistory, executionLevel]
  );

  /* ---------- palette: add component instance ---------- */
  const onPaletteAddComponent = useCallback(
    (master: ComponentMaster) => {
      const NODE_GAP_X = 320;
      const NODE_GAP_Y = 200;
      let position: { x: number; y: number };
      if (selectedNode) {
        position = { x: selectedNode.position.x + NODE_GAP_X, y: selectedNode.position.y };
      } else if (nodes.length > 0) {
        const last = nodes[nodes.length - 1];
        position = { x: last.position.x, y: last.position.y + NODE_GAP_Y };
      } else {
        position = { x: 320, y: 200 };
      }
      const groupId = `cmp-${++nodeIdCounter}`;
      const { groupNode, childNodes, childEdges } = buildInstanceCanvasPayload(
        master,
        position,
        groupId,
      );
      setNodes((nds) => [...nds, groupNode, ...childNodes]);
      setEdges((eds) => [...eds, ...childEdges]);
      pushHistory([...nodes, groupNode, ...childNodes], [...edges, ...childEdges]);
      setSelectedNode(groupNode);
      toast.success(`Added component "${master.name}"`);
    },
    [nodes, selectedNode, setNodes, setEdges, edges, pushHistory],
  );

  /* ---------- palette: delete component (guarded) ---------- */
  const onPaletteDeleteComponent = useCallback(
    (master: ComponentMaster) => {
      // Guard: block deletion when instances exist anywhere across journeys.
      // For the prototype we check the CURRENT journey's flow — cross-journey
      // scan runs in the master editor's delete flow (Part 5.5).
      const instancesHere = nodes.filter(
        (n) => (n.data as { componentId?: string })?.componentId === master.id,
      );
      if (instancesHere.length > 0) {
        toast.error(
          `Can't delete "${master.name}" — ${instancesHere.length} instance${
            instancesHere.length === 1 ? "" : "s"
          } still on this journey`,
          {
            description: "Remove the instances first, or open the master editor to see cross-journey usage.",
          },
        );
        return;
      }
      if (!window.confirm(`Delete component "${master.name}"? This can't be undone.`)) return;
      deleteMaster(master.id);
      toast.success(`Deleted "${master.name}"`);
    },
    [nodes],
  );

  /* ---------- config panel update ---------- */
  const onNodeDataUpdate = useCallback(
    (id: string, newData: Record<string, unknown>) => {
      setNodes((nds) => {
        const next = nds.map((n) => (n.id === id ? { ...n, data: newData } : n));
        pushHistory(next, edges);
        return next;
      });
      setSelectedNode((prev) =>
        prev && prev.id === id ? { ...prev, data: newData } : prev
      );
    },
    [setNodes, edges, pushHistory]
  );

  /* ---------- validation ---------- */
  const validateJourney = useCallback(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const problemNodeIds: string[] = [];

    if (nodes.length === 0) {
      toast.error("Add at least one block to validate");
      return false;
    }

    // Start validating animation
    setValidateState("validating");

    const hasTrigger = nodes.some((n) => {
      const blockType = (n.data as Record<string, unknown>).blockType as string | undefined;
      if (n.type === "trigger") return true;
      if (blockType && blockType.endsWith("_trigger")) return true;
      return false;
    });
    if (!hasTrigger) errors.push("Journey needs an entry trigger");

    // Check for orphan nodes (no incoming or outgoing edges)
    if (nodes.length > 1) {
      const connected = new Set<string>();
      edges.forEach((e) => {
        connected.add(e.source);
        connected.add(e.target);
      });
      const orphans = nodes.filter((n) => !connected.has(n.id));
      if (orphans.length > 0) {
        warnings.push(`${orphans.length} disconnected block${orphans.length > 1 ? "s" : ""}`);
        orphans.forEach((n) => problemNodeIds.push(n.id));
      }
    }

    // Helper: shake specific nodes for 600ms
    const shakeNodes = (ids: string[]) => {
      if (ids.length === 0) return;
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          className: ids.includes(n.id)
            ? `${n.className ?? ""} journey-shake`.trim()
            : n.className ?? "",
        }))
      );
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            className: (n.className ?? "").replace("journey-shake", "").trim(),
          }))
        );
      }, 600);
    };

    if (errors.length > 0) {
      shakeNodes(problemNodeIds);
      setValidateState("invalid");
      setTimeout(() => setValidateState("idle"), 900);
      toast.error(`${errors.length} issue${errors.length > 1 ? "s" : ""} found`, {
        description: errors.join(" • "),
      });
      return false;
    }

    if (warnings.length > 0) {
      shakeNodes(problemNodeIds);
      setValidateState("valid");
      setTimeout(() => setValidateState("idle"), 1100);
      toast.warning("Journey is valid with warnings", {
        description: warnings.join(" • "),
      });
      return true;
    }

    setValidateState("valid");
    setTimeout(() => setValidateState("idle"), 1100);
    toast.success("Journey is valid — ready to publish");
    return true;
  }, [nodes, edges, setNodes]);

  /* ---------- simulate with borrower counts ---------- */
  const simulate = useCallback(async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    // Find trigger node (entry)
    const triggerNode = nodes.find((n) => n.type === "trigger");
    if (!triggerNode) {
      setIsSimulating(false);
      return;
    }

    const startCount = journeyMeta?.enrolled || 1248;
    let convertedCount = 0;
    const nodeCounts: Record<string, number> = {};

    // Clear all sim data first
    setNodes((nds) =>
      nds.map((n) => {
        const cleaned = { ...n.data };
        delete (cleaned as Record<string, unknown>)._simCount;
        delete (cleaned as Record<string, unknown>)._simYes;
        delete (cleaned as Record<string, unknown>)._simNo;
        return { ...n, data: cleaned, className: "" };
      })
    );

    // BFS walk
    const visited = new Set<string>();
    const queue: { id: string; count: number }[] = [
      { id: triggerNode.id, count: startCount },
    ];

    const activateNode = (
      id: string,
      count: number,
      yesCount?: number,
      noCount?: number
    ) => {
      nodeCounts[id] = count;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            const updatedData = { ...n.data, _simCount: count } as Record<string, unknown>;
            if (typeof yesCount === "number") updatedData._simYes = yesCount;
            if (typeof noCount === "number") updatedData._simNo = noCount;
            return {
              ...n,
              data: updatedData,
              className: "node-active",
            };
          }
          return {
            ...n,
            className: n.className?.replace("node-active", "")?.trim() ?? "",
          };
        })
      );
    };

    while (queue.length > 0) {
      const { id: currentId, count: currentCount } = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentNode = nodes.find((n) => n.id === currentId);

      // For condition nodes, split counts
      if (currentNode?.type === "condition") {
        const yesRatio = 0.6 + Math.random() * 0.1; // ~60-70% yes
        const yesCount = Math.round(currentCount * yesRatio);
        const noCount = currentCount - yesCount;
        activateNode(currentId, currentCount, yesCount, noCount);
        await new Promise((r) => setTimeout(r, 800));

        const outgoing = edges.filter((e) => e.source === currentId);
        for (const edge of outgoing) {
          if (edge.sourceHandle === "yes") {
            queue.push({ id: edge.target, count: yesCount });
          } else if (edge.sourceHandle === "no") {
            queue.push({ id: edge.target, count: noCount });
          }
        }
      } else if (currentNode?.type === "split") {
        const splitA =
          ((currentNode.data as Record<string, unknown>).splitA as number) ?? 50;
        const countA = Math.round((currentCount * splitA) / 100);
        const countB = currentCount - countA;
        activateNode(currentId, currentCount);
        await new Promise((r) => setTimeout(r, 800));

        const outgoing = edges.filter((e) => e.source === currentId);
        for (const edge of outgoing) {
          if (edge.sourceHandle === "a") {
            queue.push({ id: edge.target, count: countA });
          } else if (edge.sourceHandle === "b") {
            queue.push({ id: edge.target, count: countB });
          }
        }
      } else {
        // Apply a small drop-off for action/wait nodes
        let adjustedCount = currentCount;
        if (currentNode?.type === "action" || currentNode?.type === "wait") {
          adjustedCount = Math.round(currentCount * (0.92 + Math.random() * 0.06));
        }
        activateNode(currentId, adjustedCount);

        // Track conversions at end nodes
        if (currentNode?.type === "end") {
          const outcome = (currentNode.data as Record<string, unknown>).outcome as string | undefined;
          if (outcome === "Converted") {
            convertedCount += adjustedCount;
          }
        }

        await new Promise((r) => setTimeout(r, 800));

        const outgoing = edges.filter((e) => e.source === currentId);
        for (const edge of outgoing) {
          queue.push({ id: edge.target, count: adjustedCount });
        }
      }
    }

    // Hold last state for a moment
    await new Promise((r) => setTimeout(r, 1500));

    // Clear animation (keep sim counts for a moment)
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        className: "",
      }))
    );

    // Show toast with results
    const convRate =
      startCount > 0 ? ((convertedCount / startCount) * 100).toFixed(1) : "0.0";
    toast.success(`Test run finished`, {
      description: `${startCount.toLocaleString()} ${currentLevel.label.toLowerCase()}s entered, ${convertedCount.toLocaleString()} converted to payment (${convRate}%).`,
      duration: 6000,
    });

    // Clear sim data after a delay
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) => {
          const cleaned = { ...n.data };
          delete (cleaned as Record<string, unknown>)._simCount;
          delete (cleaned as Record<string, unknown>)._simYes;
          delete (cleaned as Record<string, unknown>)._simNo;
          return { ...n, data: cleaned };
        })
      );
    }, 4000);

    setIsSimulating(false);
  }, [nodes, edges, isSimulating, setNodes, journeyMeta, currentLevel]);

  /* ---------- publish (with pre-launch validation dialog) ---------- */
  const handlePublish = useCallback(() => {
    const issues: PublishIssue[] = [];

    // Must have exactly one Trigger node
    const triggerNodes = nodes.filter(
      (n) => n.type === "trigger" || String((n.data as Record<string, unknown>).blockType ?? "").endsWith("_trigger")
    );
    if (triggerNodes.length === 0) {
      issues.push({
        severity: "blocker",
        title: "Journey has no entry trigger",
        detail: "Add a Trigger block to define where borrowers enter.",
      });
    } else if (triggerNodes.length > 1) {
      issues.push({
        severity: "blocker",
        title: `Journey has ${triggerNodes.length} entry triggers`,
        detail: "Only one entry point is allowed. Remove extras or merge them.",
        nodeId: triggerNodes[1]?.id,
      });
    }

    // Build edge maps
    const outgoing = new Map<string, number>();
    const incoming = new Map<string, number>();
    nodes.forEach((n) => { outgoing.set(n.id, 0); incoming.set(n.id, 0); });
    edges.forEach((e) => {
      outgoing.set(e.source, (outgoing.get(e.source) ?? 0) + 1);
      incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
    });

    // Per-node structural + configuration checks.
    nodes.forEach((n) => {
      const d = (n.data as Record<string, unknown>) ?? {};
      const isEnd = n.type === "end";
      const isTrigger = n.type === "trigger" || String(d.blockType ?? "").endsWith("_trigger");
      const label = String(d.label ?? n.type ?? n.id);
      const actionType = d.actionType as string | undefined;

      if (!isEnd && (outgoing.get(n.id) ?? 0) === 0) {
        issues.push({
          severity: "blocker",
          title: `"${label}" has no outgoing connection`,
          detail: "Connect it to the next step or an End block.",
          nodeId: n.id,
        });
      }
      if (!isTrigger && (incoming.get(n.id) ?? 0) === 0) {
        issues.push({
          severity: "blocker",
          title: `"${label}" is unreachable`,
          detail: "Nothing leads into this block.",
          nodeId: n.id,
        });
      }

      // Trigger AI Call — needs a ClearVoice project
      if (actionType === "call" && !d.clearvoiceProjectId) {
        issues.push({
          severity: "blocker",
          title: `"${label}" has no ClearVoice project selected`,
          detail: "Pick a project so the AI knows which script + voice + phone number to use.",
          nodeId: n.id,
          field: "clearvoiceProjectId",
        });
      }

      // Send Email / SMS — needs a template
      if ((actionType === "email" || actionType === "sms" || actionType === "whatsapp") && !d.template && (d.composeMode ?? "template") === "template") {
        issues.push({
          severity: "blocker",
          title: `"${label}" has no template selected`,
          detail: "Pick a Composer template, or switch to Create-new mode.",
          nodeId: n.id,
          field: "template",
        });
      }

      // Human Campaign — needs a campaign id in existing mode
      if (actionType === "human_campaign") {
        const mode = (d.composeMode as string) ?? "existing";
        if (mode === "existing" && !d.campaignId) {
          issues.push({
            severity: "blocker",
            title: `"${label}" has no campaign selected`,
            detail: "Pick a human campaign or switch to Create-new mode.",
            nodeId: n.id,
            field: "campaignId",
          });
        }
        if (mode === "create" && !d.newCampaignName) {
          issues.push({
            severity: "warning",
            title: `"${label}" new campaign has no name`,
            detail: "Give the draft campaign a descriptive name before publish.",
            nodeId: n.id,
            field: "newCampaignName",
          });
        }
      }

      // Update Attribute — needs field + value
      if (actionType === "attribute") {
        if (!d.field) {
          issues.push({
            severity: "blocker",
            title: `"${label}" has no field selected`,
            nodeId: n.id,
            field: "field",
          });
        }
        if (!d.newValue) {
          issues.push({
            severity: "warning",
            title: `"${label}" has no new value`,
            detail: "The attribute will be cleared when this fires.",
            nodeId: n.id,
            field: "newValue",
          });
        }
      }

      // Redial — hard cap check (defensive; UI already clamps to 5)
      if (actionType === "call" && d.redialEnabled !== false) {
        const attempts = (d.redialMaxAttempts as number) ?? 3;
        if (attempts > 5) {
          issues.push({
            severity: "warning",
            title: `"${label}" redial exceeds recommended 5 attempts`,
            detail: "High retry counts can trigger DNC complaints. Consider cutting to ≤5.",
            nodeId: n.id,
            field: "redialMaxAttempts",
          });
        }
      }
    });

    // Part 6.1 — write per-node error markers so every node can badge itself.
    const errorByNode = new Map<string, PublishIssue>();
    for (const iss of issues) {
      if (!iss.nodeId) continue;
      const existing = errorByNode.get(iss.nodeId);
      // Blockers outrank warnings — keep the more severe one.
      if (!existing || (existing.severity !== "blocker" && iss.severity === "blocker")) {
        errorByNode.set(iss.nodeId, iss);
      }
    }
    setNodes((nds) =>
      nds.map((n) => {
        const iss = errorByNode.get(n.id);
        const cleaned = { ...(n.data as Record<string, unknown>) };
        if (iss) {
          cleaned._error = iss.detail ? `${iss.title} — ${iss.detail}` : iss.title;
          cleaned._errorSeverity = iss.severity;
        } else {
          delete cleaned._error;
          delete cleaned._errorSeverity;
        }
        return { ...n, data: cleaned };
      }),
    );

    if (issues.length > 0) {
      const hasBlockers = issues.some((i) => i.severity === "blocker");
      setValidationErrors(issues);
      if (hasBlockers) {
        setValidationDialogOpen(true);
        return;
      }
      // Only warnings/info — allow publish but surface the dialog first.
      setValidationDialogOpen(true);
      return;
    }

    // Existing validate (shake animation + warnings)
    if (!validateJourney()) return;

    // Part 3.4 — soft nudge to run a simulation before going live, but only
    // once per journey and only if there's no simulation for the current
    // node set. Author can dismiss and proceed, or open the simulator.
    if (!simulateResult && !wasPublishNudgeSeen(journeyId)) {
      setPublishNudgeOpen(true);
      return;
    }

    setStatus("published");
    toast.success("Journey is live", {
      description: `Running at ${currentLevel.label} level. ${currentLevel.dedupLabel}.`,
    });
  }, [nodes, edges, validateJourney, currentLevel, journeyId, simulateResult]);

  /* ---------- schedule (opens dialog after validation) ---------- */
  const handleScheduleOpen = useCallback(() => {
    const triggerNodes = nodes.filter(
      (n) => n.type === "trigger" || String((n.data as Record<string, unknown>).blockType ?? "").endsWith("_trigger")
    );
    if (triggerNodes.length === 0) {
      toast.error("Add a trigger node before scheduling");
      return;
    }
    if (!validateJourney()) return;
    setScheduleDialogOpen(true);
  }, [nodes, validateJourney]);

  /* ---------- hydrate from composer / funnel / template ---------- */
  const searchParams = useSearchParams();

  /* ---------- Trace overlay (Eternals "Real executed flow") ---------- */
  const traceQueryId = searchParams?.get("trace") ?? null;
  const traceOverlayData = useMemo(() => {
    if (!traceQueryId) return null;
    const borrower = borrowers.find((b) => b.id === traceQueryId);
    if (!borrower) return null;
    return {
      trace: synthesizeTrace(borrower.id, journeyId),
      borrowerName: borrower.name,
    };
  }, [traceQueryId, journeyId]);
  const clearTraceParam = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("trace");
    router.replace(url.pathname + (url.search ? url.search : "") + url.hash);
  }, [router]);
  const fromComposerRef = useRef(false);
  useEffect(() => {
    if (fromComposerRef.current) return;
    const from = searchParams.get("from");
    const legacyFromComposer = searchParams.get("fromComposer") === "true";
    // Accept all entry points that should pre-hydrate the canvas:
    // - fromComposer=true (legacy inline composer)
    // - from=composer (v3 builder Create Journey)
    // - from=funnel (message detail funnel-segment CTAs)
    // - from=ai (AI-generated path)
    if (!legacyFromComposer && from !== "composer" && from !== "funnel" && from !== "ai") {
      return;
    }
    fromComposerRef.current = true;

    const channelParam = searchParams.get("channel");
    const channel: "email" | "sms" | "whatsapp" =
      channelParam === "sms" || channelParam === "whatsapp"
        ? channelParam
        : "email";

    const blueprintParam = searchParams.get("blueprint") as
      | "none"
      | "reminder_3step"
      | "ptp_recovery"
      | "settlement_push"
      | "funnel"
      | null;
    const blueprint = blueprintParam ?? (from === "funnel" ? "funnel" : "none");

    const templateName =
      searchParams.get("templateName") ||
      searchParams.get("template") ||
      "Composer Draft";
    const audienceLabel = searchParams.get("audience") || "Composer audience";
    const segmentLabel = searchParams.get("segment") || undefined;

    const { nodes: bpNodes, edges: bpEdges } = buildBlueprint(blueprint, {
      channel,
      templateName,
      audienceLabel,
      segmentLabel,
    });
    // Re-key nodes through the canvas counter so subsequent quick-add calls
    // don't collide with our blueprint IDs.
    const idMap: Record<string, string> = {};
    const rekeyedNodes: Node[] = bpNodes.map((n) => {
      const newId = `node-${++nodeIdCounter}`;
      idMap[n.id] = newId;
      return { ...n, id: newId };
    });
    const rekeyedEdges: Edge[] = bpEdges.map((e) => ({
      ...e,
      id: `e-${idMap[e.source]}-${idMap[e.target]}`,
      source: idMap[e.source],
      target: idMap[e.target],
    }));

    setNodes((nds) => [...nds, ...rekeyedNodes]);
    setEdges((eds) => [...eds, ...rekeyedEdges]);

    const bpLabel: Record<string, string> = {
      none: "Composer message loaded",
      funnel: `Funnel segment loaded${segmentLabel ? ` (${segmentLabel})` : ""}`,
      reminder_3step: "3-step reminder cadence loaded",
      ptp_recovery: "PTP recovery branch loaded",
      settlement_push: "Settlement push loaded",
    };

    toast.success(`${bpLabel[blueprint] ?? "Journey draft loaded"} — review and activate`, {
      duration: 5000,
    });
  }, [searchParams, setNodes, setEdges]);

  /* ---------- memoized values for React Flow ---------- */
  const defaultEdgeOptions = useMemo(
    () => ({
      type: "smoothstep",
      animated: true,
      style: { stroke: "var(--primary)", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
    }),
    []
  );

  /* ---------- inject live counts when published ---------- */
  const liveCounts = liveNodeCounts[journeyId] ?? {};
  const displayNodes = useMemo(() => {
    if (status !== "published") return nodes;
    return nodes.map((n) => {
      const count = liveCounts[n.id];
      if (count === undefined) return n;
      return { ...n, data: { ...n.data, _liveCount: count } };
    });
  }, [nodes, status, liveCounts]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      {/* Journey sub-nav — one-click access to Editor / Validator /
          Borrowers / Settings / Report. Always visible so authors can
          find the QA tools without hunting through overflow menus. */}
      <JourneySubNav journeyId={journeyId} compact />
      {/* ====== Top bar ====== */}
      <div className="flex h-12 w-full shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-card/60 px-3">
        {/* ----- Left group: back / breadcrumb / name / chips ----- */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <Link
            href="/journeys"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to journeys"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="hidden shrink-0 whitespace-nowrap text-[11px] text-muted-foreground lg:inline">
            <Link href="/journeys" className="hover:text-foreground transition-colors">Journeys</Link>
            <span className="mx-1">/</span>
          </span>

          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => { if (e.key === "Enter") setIsEditingName(false); }}
              autoFocus
              className="min-w-0 max-w-[180px] shrink border-b border-primary bg-transparent text-sm font-semibold text-foreground outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="min-w-0 max-w-[220px] shrink truncate text-left text-sm font-semibold text-foreground transition-colors hover:text-primary"
              title={nameValue}
            >
              {nameValue}
            </button>
          )}

          {status === "draft" && (
            <Badge variant="secondary" className="hidden shrink-0 whitespace-nowrap text-[10px] md:inline-flex">
              Draft
            </Badge>
          )}
          {status === "scheduled" && (
            <Badge className="hidden shrink-0 whitespace-nowrap bg-warning-500/20 text-[10px] text-warning-400 md:inline-flex">
              Scheduled
            </Badge>
          )}
          {status === "published" && (
            <Badge className="hidden shrink-0 whitespace-nowrap bg-primary-500/20 text-[10px] text-primary-400 md:inline-flex">
              Published
            </Badge>
          )}

          <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-2 py-1 text-[11px] text-foreground xl:inline-flex">
            <Handshake className={cn("h-3.5 w-3.5", currentLevel.badgeColor)} />
            <span className="font-medium">{currentLevel.label}</span>
          </span>
        </div>

        {/* ----- Middle: icon toolbar + save indicator + overflow ----- */}
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex items-center rounded-md border border-border bg-muted/10">
            <IconToolbarButton
              onClick={undo}
              disabled={historyIndex <= 0}
              title="Undo (Cmd+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </IconToolbarButton>
            <IconToolbarButton
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </IconToolbarButton>
            <IconToolbarButton
              onClick={() =>
                toast.success("Canvas beautified", {
                  description: "Nodes rearranged in a clean top-down layout. Undo to revert.",
                })
              }
              title="Beautify — auto-arrange the canvas"
            >
              <Wand2 className="h-3.5 w-3.5" />
            </IconToolbarButton>
            <IconToolbarButton
              onClick={() => {
                if (nodes.length === 0) { toast.info("Canvas is already empty"); return; }
                setNodes([]); setEdges([]);
                toast.success("Canvas cleared", { description: "All nodes and edges removed. Undo to restore." });
              }}
              title="Clear all nodes and edges"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconToolbarButton>
            <IconToolbarButton
              onClick={() =>
                toast.info("Refreshed", {
                  description: "Journey re-fetched from the server. Any unsaved local edits were kept.",
                })
              }
              title="Refresh from server"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </IconToolbarButton>
          </div>

          <SavedIndicator historyIndex={historyIndex} />

          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDebugBorrowerOpen(true)}>
                <Bug className="h-3.5 w-3.5" />
                Debug borrower
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPaletteCollapsed((c) => !c)}>
                <Layers className="h-3.5 w-3.5" />
                {paletteCollapsed ? "Show blocks" : "Hide blocks"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAuditLogOpen(true)}>
                <ClipboardList className="h-3.5 w-3.5" />
                Audit log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                <SettingsIcon className="h-3.5 w-3.5" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/journeys/${journeyId}/settings`)}
              >
                <Sliders className="h-3.5 w-3.5" />
                Conversion events + business metrics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleScheduleOpen}>
                <Calendar className="h-3.5 w-3.5" />
                Schedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info("Journey duplicated")}>
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Journey exported")}>
                <Download className="h-3.5 w-3.5" />
                Export
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.info("View history", {
                    description: "Opens the enrollment-history page (borrowers · runs · per-node stats).",
                  })
                }
              >
                <History className="h-3.5 w-3.5" />
                View history
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setVersionHistoryOpen(true)}>
                <FileClock className="h-3.5 w-3.5" />
                Version history
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSimulateOpen(true)}>
                <Play className="h-3.5 w-3.5" />
                Open simulator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTracePickerOpen(true)}>
                <User className="h-3.5 w-3.5" />
                Trace a borrower
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info("Journey archived")}>
                <Archive className="h-3.5 w-3.5" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => toast.error("Journey deleted")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ----- Right: primary actions ----- */}
        <div className="flex shrink-0 items-center gap-1">
          <ToolbarButton
            onClick={() => toast.success("Draft saved")}
            icon={<Save className="h-3.5 w-3.5" />}
            label="Save"
          />

          <ToolbarButton
            onClick={() => setJourneyGPTOpen((s) => !s)}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Journey GPT"
            className={cn(
              "border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20",
              journeyGPTOpen && "border-violet-500/70 bg-violet-500/25 text-violet-100",
            )}
            labelClass="hidden md:inline"
          />

          <ToolbarButton
            onClick={() =>
              toast.success(isJourneyLocked ? "Journey unlocked" : "Journey locked", {
                description: isJourneyLocked
                  ? "You can edit again."
                  : "Blocks another editor from taking over your session.",
              })
            }
            icon={<Lock className={cn("h-3.5 w-3.5", isJourneyLocked && "text-warning-400")} />}
            label={isJourneyLocked ? "Locked" : "Lock"}
            labelClass="hidden lg:inline"
          />

          <ToolbarButton
            onClick={validateJourney}
            icon={<Check className="h-3.5 w-3.5" />}
            label="Validate"
            labelClass="hidden xl:inline"
          />

          <ToolbarButton
            onClick={() => setValidateAiCallOpen(true)}
            icon={<PhoneCall className="h-3.5 w-3.5" />}
            label="Validate AI Calls"
            labelClass="hidden xl:inline"
          />

          {/* Eternals-style one-click Dry-run — runs full-audience sim with
              realistic outcome defaults and decorates the canvas. No cohort or
              outcome-config screen; matches eternals.cleargrid.ai/simulator. */}
          <ToolbarButton
            onClick={runDryRun}
            disabled={isDryRunning}
            icon={
              isDryRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BarChart3 className="h-3.5 w-3.5" />
              )
            }
            label={
              isDryRunning
                ? "Simulating…"
                : simulateResult
                  ? "Dry-run · loaded"
                  : "Dry-run"
            }
            labelClass="hidden lg:inline"
            className={cn(
              simulateResult && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
            )}
          />

          {/* Eternals-style Validator — dedicated page for regression
              against real executed paths. */}
          <ToolbarButton
            onClick={() => router.push(`/journeys/${journeyId}/validator`)}
            icon={<Users className="h-3.5 w-3.5" />}
            label="Validator"
            labelClass="hidden xl:inline"
          />

          <button
            onClick={handlePublish}
            className="flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-primary px-2.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>Publish</span>
          </button>

          <ToolbarButton
            onClick={simulate}
            disabled={isSimulating}
            icon={
              isSimulating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )
            }
            label={isSimulating ? "Running…" : "Test run"}
            labelClass="hidden lg:inline"
          />

          <ToolbarButton
            onClick={() => router.push(`/journeys/${journeyId}/report`)}
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Report"
            labelClass="hidden md:inline"
          />
        </div>
      </div>

      {/* ====== Settings panel (Sheet) ====== */}
      <Sheet open={showSettings} onOpenChange={(val) => setShowSettings(val)}>
        <SheetContent side="right" className="flex w-[440px] flex-col p-0 sm:max-w-[440px]">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle>Journey settings</SheetTitle>
            <SheetDescription>
              Journey-level rules for entry, frequency capping, DND and governance. Applies
              to every instance at the {currentLevel.label.toLowerCase()} level.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Audience / Entry */}
            <SettingsSection title="Audience & entry" helper="Who enters this journey and when.">
              <SettingField
                label="Entry rule"
                helper="How many times a user can enter this journey."
              >
                <select
                  value={journeySettings.entryRule}
                  onChange={(e) =>
                    setJourneySettings({ ...journeySettings, entryRule: e.target.value })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="once">Enter once per {currentLevel.label}</option>
                  <option value="every_time">Every time the trigger fires</option>
                  <option value="re_entry">Allow re-entry after exit</option>
                </select>
              </SettingField>
              <SettingToggle
                label="Allow re-entry"
                helper="Permit the same user to re-enter after completion."
                checked={journeySettings.reEntry}
                onChange={(val) => setJourneySettings({ ...journeySettings, reEntry: val })}
              />
            </SettingsSection>

            {/* ====== Exit Triggers (journey-level) ====== */}
            <div ref={exitTriggersSectionRef} className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Exit Triggers
                  </h4>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  Borrowers exit the journey as soon as any of these conditions become true, regardless of where they are in the flow.
                </p>
              </div>

              {duplicateWarning && (
                <div className="flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-500/10 p-2.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-warning-200">{duplicateWarning}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="text-warning-400 hover:text-warning-200"
                  >
                    <span className="text-xs leading-none">✕</span>
                  </button>
                </div>
              )}

              {exitTriggers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-4 text-center">
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    No Exit Triggers configured. Borrowers will only exit when they reach an Exit Journey node on the canvas.
                  </p>
                </div>
              ) : (
                <>
                  {exitTriggers.length > 5 && (
                    <p className="text-[10px] leading-snug text-muted-foreground/80">
                      Tip: keep Exit Triggers focused on critical exits — too many can make journey behavior hard to predict.
                    </p>
                  )}
                  <div
                    className={cn(
                      "space-y-2",
                      exitTriggers.length > 5 && "max-h-[400px] overflow-y-auto pr-1"
                    )}
                  >
                    {exitTriggers.map((t) => (
                      <ExitTriggerRow
                        key={t.id}
                        trigger={t}
                        onEdit={() => setExitTriggerEditor({ open: true, initial: t })}
                        onRemove={() => {
                          setExitTriggers((prev) => prev.filter((x) => x.id !== t.id));
                          setDuplicateWarning(null);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setExitTriggerEditor({ open: true, initial: null })}
              >
                <Plus className="h-3.5 w-3.5" /> Add Exit Trigger
              </Button>
            </div>

            {/* ====== Command processing (matches command.cleargrid.ai) ====== */}
            <SettingsSection
              title="Command processing"
              helper="Route inbound-message events (Command Processing) through this journey to keep replies and callback capture in-flow."
            >
              <div className="flex items-center gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[11px]">
                  <input
                    type="radio"
                    checked={!journeySettings.commandProcessing}
                    onChange={() =>
                      setJourneySettings({ ...journeySettings, commandProcessing: false })
                    }
                    className="h-3 w-3 accent-primary"
                  />
                  Disabled
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[11px]">
                  <input
                    type="radio"
                    checked={!!journeySettings.commandProcessing}
                    onChange={() =>
                      setJourneySettings({ ...journeySettings, commandProcessing: true })
                    }
                    className="h-3 w-3 accent-primary"
                  />
                  Enabled
                </label>
              </div>
            </SettingsSection>

            {/* ====== Default AI-Call retry policy (matches command.cleargrid.ai) ====== */}
            <SettingsSection
              title="Default AI-Call retry policy"
              helper="Every AI Call node in this journey inherits this policy. Individual nodes can override."
            >
              <SettingToggle
                label="Retry on failure / no answer"
                helper={
                  journeySettings.aiCallRetryOnFail
                    ? "AI Calls retry once if the call fails or the borrower doesn't pick up."
                    : "No default retry policy — AI Calls will fire once unless a node overrides."
                }
                checked={!!journeySettings.aiCallRetryOnFail}
                onChange={(val) =>
                  setJourneySettings({ ...journeySettings, aiCallRetryOnFail: val })
                }
              />
            </SettingsSection>

            {/* ====== Part 1.6 — Notification settings ====== */}
            <NotificationSettingsSection settings={alertSettings} onChange={setAlertSettings} />

          </div>

          <SheetFooter className="border-t border-border px-5 py-3">
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                toast.success("Journey settings saved");
                setShowSettings(false);
              }}
            >
              <Save className="h-3.5 w-3.5" /> Save settings
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ====== Exit Trigger editor (slide-in over settings) ====== */}
      <ExitTriggerPanel
        open={exitTriggerEditor.open}
        initial={exitTriggerEditor.initial}
        onCancel={() => setExitTriggerEditor({ open: false, initial: null })}
        onSave={(trigger) => {
          setExitTriggers((prev) => {
            const idx = prev.findIndex((t) => t.id === trigger.id);
            const next = idx >= 0 ? prev.map((t) => (t.id === trigger.id ? trigger : t)) : [...prev, trigger];
            const dupe = next.filter((t) => exitTriggersEqual(t, trigger)).length > 1;
            setDuplicateWarning(dupe ? "This Exit Trigger duplicates an existing one." : null);
            return next;
          });
          setExitTriggerEditor({ open: false, initial: null });
          toast.success(exitTriggerEditor.initial ? "Exit Trigger updated" : "Exit Trigger added");
        }}
      />

      {/* ====== Pre-launch validation dialog (Part 1.5) ====== */}
      <AlertDialog open={validationDialogOpen} onOpenChange={(open) => { if (!open) setValidationDialogOpen(false); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {validationErrors.some((i) => i.severity === "blocker")
                ? "Journey can't be published yet"
                : "Ready to publish — with notes"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {validationErrors.some((i) => i.severity === "blocker")
                ? "Resolve the blockers below before going live. Warnings are optional but recommended."
                : "No blockers. Review the warnings below, then publish when you're happy."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {(["blocker", "warning", "info"] as const).map((sev) => {
              const group = validationErrors.filter((i) => i.severity === sev);
              if (group.length === 0) return null;
              const tone =
                sev === "blocker"
                  ? { chip: "bg-error-500/15 text-error-400", label: "Blockers", icon: "✕", ring: "border-error-500/30" }
                  : sev === "warning"
                    ? { chip: "bg-warning-500/15 text-warning-400", label: "Warnings", icon: "!", ring: "border-warning-500/30" }
                    : { chip: "bg-sky-500/15 text-sky-400", label: "Info", icon: "i", ring: "border-sky-500/30" };
              return (
                <div key={sev} className={`rounded-lg border ${tone.ring} bg-muted/10 p-3`}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone.chip}`}>
                      {tone.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{group.length}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {group.map((iss, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-md border border-transparent px-1.5 py-1.5 text-sm hover:border-border hover:bg-muted/30"
                      >
                        <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${tone.chip}`}>
                          {tone.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground">{iss.title}</p>
                          {iss.detail && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{iss.detail}</p>
                          )}
                        </div>
                        {iss.nodeId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 shrink-0 px-2 text-[10px]"
                            onClick={() => {
                              const target = nodes.find((n) => n.id === iss.nodeId);
                              if (target) setSelectedNode(target);
                              setFocusFieldToken({ nodeId: iss.nodeId!, field: iss.field, ts: Date.now() });
                              setValidationDialogOpen(false);
                            }}
                          >
                            Fix
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <AlertDialogFooter>
            {validationErrors.some((i) => i.severity === "blocker") ? (
              <AlertDialogAction onClick={() => setValidationDialogOpen(false)}>
                Close
              </AlertDialogAction>
            ) : (
              <>
                <Button variant="outline" onClick={() => setValidationDialogOpen(false)}>
                  Cancel
                </Button>
                <AlertDialogAction
                  onClick={() => {
                    setValidationDialogOpen(false);
                    setStatus("published");
                    toast.success("Journey is live", {
                      description: `Running at ${currentLevel.label} level. ${currentLevel.dedupLabel}.`,
                    });
                  }}
                >
                  Publish anyway
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ====== Schedule dialog ====== */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onConfirm={(schedule) => {
          setStatus("scheduled");
          setScheduleDialogOpen(false);
          const dayNames = schedule.days.map((d) => WEEKDAYS[d]).join(", ");
          toast.success("Journey scheduled", {
            description: schedule.recurring
              ? `Runs every ${dayNames}, ${schedule.time}–${schedule.endTime}`
              : `One-time on ${schedule.startDate}, ${schedule.time}–${schedule.endTime}`,
          });
        }}
      />

      {/* ====== Version history (matches Command's overflow item) ====== */}
      <AlertDialog
        open={versionHistoryOpen}
        onOpenChange={(open) => !open && setVersionHistoryOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileClock className="h-4 w-4" />
              Version history
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                · {nameValue}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              No versions saved yet. Save the canvas at least once to create version 1.
              Version history retains every published draft and lets you revert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setVersionHistoryOpen(false)}>
              Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ====== Audit log side sheet (matches Command's overflow) ====== */}
      <Sheet open={auditLogOpen} onOpenChange={setAuditLogOpen}>
        <SheetContent side="right" className="flex w-[720px] flex-col p-0 sm:max-w-[720px]">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Audit log
            </SheetTitle>
            <SheetDescription>
              Every state transition the engine made for this journey, with cause chains. Click a
              row to highlight its full chain.
            </SheetDescription>
          </SheetHeader>

          <div className="border-b border-border bg-muted/10 px-5 py-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Borrower Deal ID
                </Label>
                <Input placeholder="6510a1…" className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Instance ID
                </Label>
                <Input placeholder="6520…" className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Event type
                </Label>
                <select className="mt-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs">
                  <option>All events</option>
                  <option>VERSION_SAVED</option>
                  <option>VALIDATED</option>
                  <option>PUBLISHED</option>
                  <option>NODE_EXECUTED</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Since
                </Label>
                <Input type="date" className="mt-1 h-8 text-xs" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm">Clear</Button>
              <Button variant="outline" size="sm">
                <RefreshCcw className="h-3 w-3" />
                Refresh
              </Button>
              <Button size="sm">Apply filters</Button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {MOCK_AUDIT_ENTRIES.map((e) => (
              <div
                key={e.id}
                className="cursor-pointer rounded-lg border border-border bg-card/60 px-3 py-2.5 transition-colors hover:border-primary/40"
              >
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <div>
                    <div className="font-mono text-[11px] text-muted-foreground">{e.at}</div>
                    <Badge className="mt-1 bg-blue-500/15 text-[9px] text-blue-300">USER</Badge>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] font-semibold text-foreground">
                      {e.event}
                    </div>
                    <div className="text-[11px] text-muted-foreground">by {e.by}</div>
                    <div className="mt-0.5 text-[11px] text-foreground">{e.note}</div>
                    <button className="mt-1 text-[10px] text-muted-foreground hover:text-foreground">
                      ▶ details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <SheetFooter className="border-t border-border px-5 py-2 text-[10px] text-muted-foreground">
            {MOCK_AUDIT_ENTRIES.length} entries loaded
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ====== Validate AI Calls modal (Part 1.3 + 1.4) ====== */}
      <ValidateAiCallModal
        open={validateAiCallOpen}
        onClose={() => setValidateAiCallOpen(false)}
      />

      {/* ====== Deviation alert banner (Part 1.6) ====== */}
      {activeAlert && !alertDismissed && (
        <DeviationAlertBanner
          alert={activeAlert}
          journeyName={nameValue}
          onDismiss={() => setAlertDismissed(true)}
          onInvestigate={() => {
            setAlertDismissed(true);
            setShowAnalytics(true);
            toast.info("Analytics opened", {
              description: "Focused the analytics panel on today's entrant volume.",
            });
          }}
        />
      )}

      {/* ====== Canvas area ====== */}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Left: Node Palette (Hide blocks toggle from overflow) */}
        <NodePalette
          onAdd={onPaletteAdd}
          onAddComponent={onPaletteAddComponent}
          onDeleteComponent={onPaletteDeleteComponent}
          collapsed={paletteCollapsed}
          onToggleCollapsed={() => setPaletteCollapsed((c) => !c)}
        />

        {/* Center: React Flow */}
        <div
          ref={wrapperRef}
          className={cn(
            "relative min-w-0 flex-1",
            validateState === "validating" && "journey-validating",
            validateState === "valid" && "journey-valid",
            validateState === "invalid" && "journey-shake"
          )}
        >
          {/* Floating top bar */}
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-4 py-2 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2">
                <currentLevel.icon className={cn("h-3.5 w-3.5", currentLevel.badgeColor)} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {currentLevel.label} Journey
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="text-center">
                <div className="text-sm font-bold tabular-nums text-foreground">
                  {nodes.length}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Nodes
                </div>
              </div>
              <div className="h-4 w-px bg-border" />
              <button
                onClick={() => setShowAnalytics((s) => !s)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  showAnalytics
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-background/80 text-foreground hover:bg-muted"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Analytics
              </button>
            </div>

            {/* Expandable analytics panel */}
            {showAnalytics && (
              <div className="mt-2 flex items-center gap-4 rounded-xl border border-border/70 bg-card/80 px-4 py-2.5 shadow-lg backdrop-blur-md">
                <JourneyStat label="Entered" value={journeyStats.entered} />
                <JourneyStat label="Active" value={journeyStats.active} />
                <JourneyStat label="Converted" value={journeyStats.converted} highlight="emerald" />
                <JourneyStat label="Exited" value={journeyStats.exited} highlight="red" />
              </div>
            )}

            {/* Debug borrower inline search bar (matches Command) */}
            {debugBorrowerOpen && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-500/40 bg-card/85 px-3 py-2 shadow-lg backdrop-blur-md">
                <Bug className="h-3.5 w-3.5 text-violet-400" />
                <input
                  value={debugBorrowerId}
                  onChange={(e) => setDebugBorrowerId(e.target.value)}
                  placeholder="Paste a Deal ID…"
                  className="w-64 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && debugBorrowerId.trim()) {
                      toast.info("Debug borrower", {
                        description: `Highlighting the path for deal ${debugBorrowerId} on the canvas.`,
                      });
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 bg-violet-500 text-white hover:bg-violet-400"
                  onClick={() => {
                    if (!debugBorrowerId.trim()) return;
                    toast.info("Debug borrower", {
                      description: `Highlighting the path for deal ${debugBorrowerId} on the canvas.`,
                    });
                  }}
                >
                  Search
                </Button>
                <button
                  onClick={() => {
                    setDebugBorrowerOpen(false);
                    setDebugBorrowerId("");
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close debug borrower"
                >
                  <span className="text-xs leading-none">✕</span>
                </button>
              </div>
            )}
          </div>

          {/* Toggle minimap button (top-right) */}
          <div className="pointer-events-auto absolute right-3 top-3 z-20">
            <button
              onClick={() => setShowMinimap((s) => !s)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur-sm transition-colors",
                showMinimap
                  ? "border-primary/50 bg-primary/20 text-primary"
                  : "border-border bg-card/85 text-muted-foreground hover:text-foreground"
              )}
              title="Toggle minimap"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-muted/30">
                <GitBranch className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <p className="font-heading text-base font-semibold text-foreground">
                Build your journey
              </p>
              <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                Click a block from the left panel to add it to the canvas. Start with an{" "}
                <span className="font-medium text-primary-400">Entry trigger</span>.
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Running at{" "}
                <span className={cn("font-semibold", currentLevel.badgeColor)}>
                  {currentLevel.label}
                </span>{" "}
                level
              </p>
              <p className="mt-4 max-w-xs text-[10px] text-muted-foreground/50">
                Tip: click <span className="font-semibold">+</span> on any node to add the next step, or drag blocks from the left panel.
              </p>
            </div>
          )}
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodesDelete={(deleted) => {
              // If a component_group is deleted, cascade-delete its children.
              const removedGroupIds = new Set(
                deleted.filter((n) => n.type === "component_group").map((n) => n.id),
              );
              if (removedGroupIds.size === 0) return;
              setNodes((nds) => nds.filter((n) => !(n.parentId && removedGroupIds.has(n.parentId))));
              setEdges((eds) =>
                eds.filter((e) => {
                  // Drop edges whose endpoints were child nodes of a deleted group.
                  return !Array.from(removedGroupIds).some((gid) => e.source.startsWith(`${gid}__`) || e.target.startsWith(`${gid}__`));
                }),
              );
            }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onSelectionChange={({ nodes: sel }) => {
              const next = sel.map((n) => n.id);
              setSelectedNodeIds((prev) => {
                if (prev.length === next.length && prev.every((id, i) => id === next[i])) return prev;
                return next;
              });
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={(instance) => {
              rfInstance.current = instance;
            }}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            connectionRadius={40}
            snapToGrid
            snapGrid={[16, 16]}
            connectOnClick
            /* Selection: Shift+click adds/removes a node from the current
               selection; Shift+drag on empty canvas draws a marquee.
               Default multiSelectionKeyCode is Meta/Ctrl, which is
               non-obvious — expose Shift explicitly for both actions. */
            selectionKeyCode="Shift"
            multiSelectionKeyCode="Shift"
            className="journey-canvas"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1.5}
              color="var(--border)"
            />
            <Controls className="!border-border !bg-card [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-muted-foreground [&>button:hover]:!bg-muted [&>button:hover]:!text-foreground" />
            {exitTriggers.length > 0 && (
              <Panel position="top-left" className="!m-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(true);
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        exitTriggersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    });
                  }}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-muted backdrop-blur-sm"
                  title="View Exit Triggers in Journey Settings"
                >
                  <LogOut className="h-3 w-3" />
                  {exitTriggers.length} Exit Trigger{exitTriggers.length === 1 ? "" : "s"}
                </button>
              </Panel>
            )}
            <Panel position="bottom-left" className="mb-[52px] ml-[2px]">
              <button
                onClick={() => rfInstance.current?.fitView({ padding: 0.2, duration: 300 })}
                className="flex h-7 w-7 items-center justify-center rounded border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Fit to screen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </Panel>
            {/* Analytics range + run picker + minimap toggle — canvas overlay (top-right) */}
            <Panel position="top-right" className="!m-3">
              <div className="flex items-center gap-1.5">
                <RunPicker
                  journeyId={journeyId}
                  value={selectedRunId}
                  onChange={setSelectedRunId}
                />
                <div className="flex items-center gap-0.5 rounded-md border border-border bg-card/80 p-0.5 backdrop-blur-sm">
                  {(["24h", "7d", "30d", "all"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAnalyticsRange(r)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                        analyticsRange === r
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      title={
                        r === "24h"
                          ? "Last 24 hours"
                          : r === "7d"
                            ? "Last 7 days"
                            : r === "30d"
                              ? "Last 30 days"
                              : "All time"
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMinimap((s) => !s)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded border bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground",
                    showMinimap ? "border-primary/50 bg-primary/10 text-primary" : "border-border",
                  )}
                  title={showMinimap ? "Hide minimap" : "Show minimap"}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </Panel>
            {showMinimap && (
              <MiniMap
                nodeColor="var(--chart-2)"
                maskColor="var(--background)"
                className="!border-border !bg-card"
                pannable
                zoomable
                style={{ width: 150, height: 100 }}
              />
            )}
            {/* Overlay legend (top-left) — distinguishes real vs simulated */}
            <OverlayLegend
              hasSimulation={!!simulateResult && !simulationOverlayHidden}
              hasAnalytics={!simulateResult}
            />
            {/* Multi-select floating action bar (Part 2) */}
            {selectedNodeIds.length >= 2 && (
              <Panel position="bottom-center" className="!mb-4">
                <div className="flex items-center gap-1 rounded-full border border-violet-500/40 bg-zinc-900/95 px-2 py-1 shadow-xl backdrop-blur-md">
                  <span className="pl-2 pr-1 text-[11px] font-medium text-violet-200">
                    {selectedNodeIds.length} selected
                  </span>
                  <span className="h-4 w-px bg-violet-500/30" />
                  <button
                    type="button"
                    onClick={() => setSaveComponentModalOpen(true)}
                    className="flex items-center gap-1 rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-violet-400"
                  >
                    <Boxes className="h-3 w-3" />
                    Save as component
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selected = nodes.filter((n) => selectedNodeIds.includes(n.id));
                      const offset = 40;
                      const dupes: Node[] = selected.map((n) => ({
                        ...n,
                        id: `node-${++nodeIdCounter}`,
                        position: { x: n.position.x + offset, y: n.position.y + offset },
                        selected: false,
                      }));
                      setNodes((nds) => [...nds, ...dupes]);
                      toast.success(`Duplicated ${dupes.length} node${dupes.length === 1 ? "" : "s"}`);
                    }}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ids = new Set(selectedNodeIds);
                      setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
                      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
                      setSelectedNodeIds([]);
                      toast.success(`Deleted ${ids.size} node${ids.size === 1 ? "" : "s"}`);
                    }}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium text-error-300 hover:bg-error-500/15"
                  >
                    Delete
                  </button>
                </div>
              </Panel>
            )}
            {/* Simulation view chip (top-right, below the range selector) */}
            {simulateResult && (
              <SimulationViewChip
                simulation={simulateResult}
                overlayHidden={simulationOverlayHidden}
                onToggleOverlay={() => setSimulationOverlayHidden((s) => !s)}
                onRerun={() => setSimulateOpen(true)}
                onEditCohort={() => setSimulateOpen(true)}
                onNewSimulation={() => {
                  clearSimulation(journeyId);
                  setSimulateResult(null);
                  setSimulateOpen(true);
                }}
                onClearSimulation={() => {
                  clearSimulation(journeyId);
                  setSimulateResult(null);
                  setSimulationOverlayHidden(false);
                  router.replace(`/journeys/${journeyId}`);
                }}
              />
            )}
          </ReactFlow>

          {/* Eternals-style Dry-run overlay — per-node count pills,
              per-edge count labels, right-side aggregate panel, color
              legend. Renders whenever a SimulationResult is loaded and
              the author hasn't dismissed the overlay for this run. */}
          <DryRunOverlay
            result={simulateResult}
            nodes={nodes}
            edges={edges}
            hidden={simulationOverlayHidden}
            onDismiss={() => setSimulationOverlayHidden(true)}
          />

          {/* Eternals "Real executed flow" — highlights a borrower's exact
              path with per-pass loop colouring when ?trace= is in the URL. */}
          {traceOverlayData && (
            <TraceOverlay
              trace={traceOverlayData.trace}
              borrowerName={traceOverlayData.borrowerName}
              onDismiss={clearTraceParam}
              journeyId={journeyId}
            />
          )}

          <NodeSampleList
            open={!!sampleForNodeId}
            onClose={() => setSampleForNodeId(null)}
            node={nodes.find((n) => n.id === sampleForNodeId) ?? null}
            result={simulateResult}
            onOpenTrace={(bid) => setTraceBorrowerId(bid)}
          />
        </div>

        {/* Right: Journey GPT panel takes precedence over everything else */}
        {journeyGPTOpen ? (
          <JourneyGPTPanel
            open={journeyGPTOpen}
            onClose={() => setJourneyGPTOpen(false)}
          />
        ) : instanceInnerFocus ? (
          <InstanceInnerNodeEditor
            focus={instanceInnerFocus}
            nodes={nodes}
            edges={edges}
            onClose={() => setInstanceInnerFocus(null)}
            onOverridesChange={(next) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === instanceInnerFocus.instanceNodeId
                    ? {
                        ...n,
                        data: {
                          ...(n.data as Record<string, unknown>),
                          overrides: next,
                        },
                      }
                    : n,
                ),
              );
            }}
          />
        ) : selectedNode &&
          selectedNode.type === "component_group" ? (
          <ComponentInstancePanel
            instanceNodeId={selectedNode.id}
            data={selectedNode.data as unknown as ComponentInstanceData}
            onOpenChildNode={(masterNodeId) =>
              setInstanceInnerFocus({
                instanceNodeId: selectedNode.id,
                masterNodeId,
              })
            }
            onOverridesChange={(next) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === selectedNode.id
                    ? {
                        ...n,
                        data: {
                          ...(n.data as Record<string, unknown>),
                          overrides: next,
                        },
                      }
                    : n,
                ),
              );
            }}
            onDetach={() => {
              const d = selectedNode.data as unknown as ComponentInstanceData;
              const master = getMasterById(d.componentId);
              if (!master) return;
              const groupId = selectedNode.id;
              const groupPos = selectedNode.position;
              // Children are already on the canvas — just strip their
              // parentId + _componentInstance marker + restore draggable/
              // deletable so they become regular nodes. Shift their
              // positions from group-relative → canvas-relative.
              let detachedCount = 0;
              setNodes((nds) =>
                nds
                  .filter((n) => n.id !== groupId)
                  .map((n) => {
                    if (n.parentId !== groupId) return n;
                    detachedCount++;
                    const cleanedData = { ...(n.data as Record<string, unknown>) };
                    delete cleanedData._componentInstance;
                    return {
                      ...n,
                      parentId: undefined,
                      extent: undefined,
                      draggable: undefined,
                      deletable: undefined,
                      position: {
                        x: (n.position?.x ?? 0) + groupPos.x,
                        y: (n.position?.y ?? 0) + groupPos.y,
                      },
                      data: cleanedData,
                    };
                  }),
              );
              setSelectedNode(null);
              toast.success(`Detached "${master.name}"`, {
                description: `${detachedCount} node${detachedCount === 1 ? "" : "s"} now regular. Future master updates won't propagate.`,
              });
            }}
            onClose={() => setSelectedNode(null)}
          />
        ) : (
          selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onUpdate={onNodeDataUpdate}
              onDeleteNode={deleteSelectedNode}
              nodes={nodes}
              edges={edges}
              journeyId={journeyId}
              selectedRunId={selectedRunId}
              focusField={
                focusFieldToken && focusFieldToken.nodeId === selectedNode.id
                  ? { field: focusFieldToken.field, ts: focusFieldToken.ts }
                  : undefined
              }
            />
          )
        )}
      </div>

      {/* Publish soft-nudge (Part 3.4) — shown once per journey */}
      <AlertDialog open={publishNudgeOpen} onOpenChange={setPublishNudgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Consider running a simulation before publishing
            </AlertDialogTitle>
            <AlertDialogDescription>
              Simulations catch missing attributes, empty branches, and unexpected
              flow patterns before your journey touches real borrowers. It only
              takes a few seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPublishNudgeOpen(false);
                markPublishNudgeSeen(journeyId);
                setStatus("published");
                toast.success("Journey is live", {
                  description: `Running at ${currentLevel.label} level. ${currentLevel.dedupLabel}.`,
                });
              }}
            >
              Publish anyway
            </Button>
            <AlertDialogAction
              onClick={() => {
                markPublishNudgeSeen(journeyId);
                setPublishNudgeOpen(false);
                setSimulateOpen(true);
              }}
            >
              Simulate now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save-as-component modal (Part 2) */}
      <SaveAsComponentModal
        open={saveComponentModalOpen}
        onClose={() => setSaveComponentModalOpen(false)}
        nodes={nodes}
        edges={edges}
        selectedIds={selectedNodeIds}
        onCommit={({ groupNode, childNodes, childEdges, nodesToRemove, edgesToRewire }) => {
          setNodes((nds) => [
            ...nds.filter((n) => !nodesToRemove.has(n.id)),
            groupNode,
            ...childNodes,
          ]);
          setEdges((eds) => {
            const dropIds = new Set(edgesToRewire.filter((r) => r.drop).map((r) => r.edgeId));
            const filtered = eds
              .filter((e) => !dropIds.has(e.id))
              .map((e) => {
                const r = edgesToRewire.find((x) => x.edgeId === e.id);
                if (!r || r.drop) return e;
                return {
                  ...e,
                  source: r.rewriteSource ?? e.source,
                  target: r.rewriteTarget ?? e.target,
                };
              });
            return [...filtered, ...childEdges];
          });
          setSelectedNodeIds([]);
        }}
      />

      {/* Simulation Trace modal (Part 2.6) */}
      <SimulationTraceModal
        open={!!traceBorrowerId}
        onClose={() => setTraceBorrowerId(null)}
        trace={
          traceBorrowerId && simulateResult
            ? simulateResult.traces[traceBorrowerId] ?? null
            : null
        }
        nodes={nodes}
      />

      {/* Full-page simulator overlay (from overflow → Open simulator) */}
      <SimulateDrawer
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        journeyId={journeyId}
        journeyName={nameValue}
        nodes={nodes}
        edges={edges}
        onResult={setSimulateResult}
        onOpenSampleForNode={(id) => {
          if (id.startsWith("trace:")) setTraceBorrowerId(id.slice(6));
          else setSampleForNodeId(id);
        }}
        initialResult={simulateResult}
      />

      {/* Single-borrower trace picker + drawer. Picker chooses a borrower;
          drawer renders their map+timeline against the current journey. */}
      <BorrowerTracePicker
        open={tracePickerOpen}
        onOpenChange={setTracePickerOpen}
        journeyId={journeyId}
        onSelect={(id) => {
          setTraceBorrowerActive(id);
          setTracePickerOpen(false);
        }}
      />
      <BorrowerTraceDrawer
        open={traceBorrowerActive !== null}
        onOpenChange={(o) => { if (!o) setTraceBorrowerActive(null); }}
        borrowerId={traceBorrowerActive}
        journeyId={journeyId}
      />

      {/* Eternals-style Validator (regression). Fetch audience → validate
          each borrower's path against prediction → trace one borrower. */}
      <ValidatorDrawer
        open={validatorOpen}
        onOpenChange={setValidatorOpen}
        journeyId={journeyId}
        nodes={nodes}
        edges={edges}
        onOpenTrace={(bid) => {
          setValidatorOpen(false);
          setValidatorTraceBorrowerId(bid);
        }}
      />

      {/* Custom styles for simulation animation & React Flow */}
      <style dangerouslySetInnerHTML={{ __html: `
        .node-active .node-card {
          box-shadow: 0 0 20px var(--ring) !important;
          transform: scale(1.05);
          transition: all 0.3s ease;
        }

        .node-card {
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }

        .journey-canvas .react-flow__edge-path {
          stroke-width: 2;
        }

        .journey-canvas .react-flow__selection {
          border: 1px solid var(--ring);
          background: color-mix(in oklch, var(--ring) 8%, transparent);
        }

        .journey-canvas .react-flow__edge.selected .react-flow__edge-path {
          stroke: var(--chart-2);
          stroke-width: 3;
        }

        .journey-canvas .react-flow__handle {
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }

        .journey-canvas .react-flow__handle:hover {
          cursor: grab;
          box-shadow: 0 0 0 4px color-mix(in oklch, var(--primary) 20%, transparent);
          transform: scale(1.15);
        }

        /* Part 1.5 — Fix button focus pulse */
        @keyframes journey-focus-pulse-kf {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.0); outline-color: rgba(239, 68, 68, 0.9); }
          40% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.35); }
        }
        .journey-focus-pulse {
          outline: 2px solid rgb(239, 68, 68);
          outline-offset: 2px;
          border-radius: 6px;
          animation: journey-focus-pulse-kf 800ms ease-in-out 3;
          scroll-margin: 96px;
        }
      ` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Part 3.1 — per-node count pill overlay                             */
/* ------------------------------------------------------------------ */

/**
 * Renders a small floating count pill anchored to each ReactFlow node,
 * positioned via getBoundingClientRect + the parent wrapper's rect. Uses
 * the wrapper as the coordinate system so it survives pan/zoom (ReactFlow
 * applies transforms to `.react-flow__nodes`; we position pills inside a
 * parent that shares that transform).
 */
function NodeCountPillOverlay({
  simulation,
  analytics,
  range,
  nodes,
  onOpenSample,
}: {
  simulation: SimulationResult | null;
  analytics: Record<string, number> | null;
  range?: "24h" | "7d" | "30d" | "all";
  nodes: Node[];
  onOpenSample: (nodeId: string) => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("resize", on);
    const iv = window.setInterval(on, 300);
    return () => {
      window.removeEventListener("resize", on);
      window.clearInterval(iv);
    };
  }, []);

  // Snapshot the source data for placement.
  const positions = useMemo(() => {
    if (typeof window === "undefined") return new Map<string, { top: number; left: number }>();
    const container = document.querySelector(".react-flow");
    if (!container) return new Map<string, { top: number; left: number }>();
    const containerRect = container.getBoundingClientRect();
    const out = new Map<string, { top: number; left: number }>();
    for (const n of nodes) {
      const el = document.querySelector(`.react-flow__node[data-id="${n.id}"]`);
      if (!el) continue;
      const r = (el as HTMLElement).getBoundingClientRect();
      out.set(n.id, {
        top: r.top - containerRect.top - 10,
        left: r.right - containerRect.left - 6,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, tick]);

  const rangeLabel =
    range === "24h" ? "24h" : range === "7d" ? "past 7d" : range === "30d" ? "past 30d" : "all time";

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {simulation &&
        Object.values(simulation.perNode).map((sim) => {
          const pos = positions.get(sim.nodeId);
          if (!pos) return null;
          return (
            <SimulationBadge
              key={`sim-${sim.nodeId}`}
              node={nodes.find((n) => n.id === sim.nodeId) ?? null}
              sim={sim}
              top={pos.top}
              left={pos.left}
              onClick={() => onOpenSample(sim.nodeId)}
            />
          );
        })}
      {analytics &&
        Array.from(positions.entries()).map(([id, pos]) => {
          const count = analytics[id];
          if (count === undefined) return null;
          return (
            <button
              key={`ana-${id}`}
              type="button"
              onClick={() => onOpenSample(id)}
              className="pointer-events-auto absolute flex items-center gap-1 rounded-full border border-primary-500/40 bg-primary-600/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md transition-transform hover:scale-105"
              style={{ top: pos.top, left: pos.left }}
              title={`${count.toLocaleString()} borrowers passed through in ${rangeLabel}`}
            >
              {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString()}
            </button>
          );
        })}
    </div>
  );
}

function SimulationBadge({
  node,
  sim,
  top,
  left,
  onClick,
}: {
  node: Node | null;
  sim: SimulationResult["perNode"][string];
  top: number;
  left: number;
  onClick: () => void;
}) {
  const isZero = sim.count === 0;
  const branchEntries = Object.entries(sim.branchCounts ?? {});
  const outgoingKind = node
    ? ((node.data as { actionType?: string })?.actionType as string | undefined)
    : undefined;
  const hasEmpty = (sim.emptyAttributes ?? []).length > 0;
  const [expanded, setExpanded] = useState(false);
  const topBranches = branchEntries.slice(0, 3);
  const moreBranches = branchEntries.length - topBranches.length;

  return (
    <div
      className="pointer-events-auto absolute z-20"
      style={{ top: top - 4, left: left - 88 }}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex min-w-[86px] max-w-[220px] flex-col items-start gap-0.5 rounded-md border-2 border-dashed bg-neutral-900/95 px-2 py-1 text-left text-[10px] shadow-md transition-transform hover:scale-105",
          isZero ? "border-neutral-700" : "border-primary-500/60",
        )}
        title={
          isZero
            ? "No borrowers reached this node in the simulation"
            : `${sim.count.toLocaleString()} borrowers · ${sim.percent.toFixed(1)}% of cohort`
        }
      >
        <div className="flex w-full items-center gap-1.5">
          {hasEmpty && (
            <span
              className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-warning-500/20"
              title={
                sim.emptyAttributes!
                  .map((e) => `${e.percent}% of cohort has empty ${e.tag}`)
                  .join(" · ")
              }
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <AlertTriangle className="h-2.5 w-2.5 text-warning-400" />
            </span>
          )}
          <span
            className={cn(
              "font-semibold tabular-nums",
              isZero ? "text-neutral-500" : "text-primary-300",
            )}
          >
            {sim.count.toLocaleString()}
          </span>
          <span className="text-neutral-500">
            ({isZero ? "—" : `${sim.percent.toFixed(0)}%`})
          </span>
        </div>
        {sim.costAed !== undefined && sim.costAed > 0 && (
          <span className="text-neutral-500">
            ~AED {Math.round(sim.costAed).toLocaleString()}
          </span>
        )}
        {outgoingKind === "human_campaign" && sim.count > 0 && (
          <span className="text-neutral-400">
            {sim.count.toLocaleString()} borrowers → campaign
          </span>
        )}
        {branchEntries.length > 0 && (
          <div className="w-full space-y-0.5">
            {(expanded ? branchEntries : topBranches).map(([label, cnt]) => (
              <div key={label} className="flex items-center justify-between gap-2 text-neutral-400">
                <span className="truncate">{label}</span>
                <span className="tabular-nums text-neutral-300">{cnt}</span>
              </div>
            ))}
            {!expanded && moreBranches > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
                className="cursor-pointer text-[9px] font-medium text-primary hover:underline"
              >
                +{moreBranches} more
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

/**
 * Deterministic per-node analytics counts. Uses a seeded hashCode of
 * `journeyId + nodeId` so the same journey always renders the same numbers
 * across sessions. Applies a rough decay along topological depth from the
 * entry trigger so downstream nodes have lower counts.
 */
function shallowSameData(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (a[k] !== b[k]) {
      try {
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}

function buildAnalyticsCounts(
  nodes: Node[],
  edges: Edge[],
  range: "24h" | "7d" | "30d" | "all",
  journeyId: string,
): Record<string, number> {
  const scale =
    range === "24h" ? 0.06 : range === "7d" ? 0.28 : range === "30d" ? 0.9 : 2.1;
  const trigger = nodes.find(
    (n) => n.type === "trigger" || String((n.data as Record<string, unknown>).blockType ?? "").endsWith("_trigger"),
  );
  if (!trigger) return {};
  const depth: Record<string, number> = { [trigger.id]: 0 };
  const outgoing = new Map<string, string[]>();
  edges.forEach((e) => {
    const arr = outgoing.get(e.source) ?? [];
    arr.push(e.target);
    outgoing.set(e.source, arr);
  });
  const queue: string[] = [trigger.id];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth[cur];
    for (const next of outgoing.get(cur) ?? []) {
      if (depth[next] === undefined) {
        depth[next] = d + 1;
        queue.push(next);
      }
    }
  }
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  const base = 12000 * scale;
  const out: Record<string, number> = {};
  for (const n of nodes) {
    if (depth[n.id] === undefined) continue;
    const decay = Math.pow(0.78, depth[n.id]);
    const jitter = 0.9 + ((hash(journeyId + n.id) % 200) / 1000); // 0.9–1.1
    out[n.id] = Math.max(0, Math.round(base * decay * jitter));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Toolbar building blocks                                            */
/* ------------------------------------------------------------------ */

function IconToolbarButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-7 w-7 items-center justify-center border-r border-border/60 text-muted-foreground transition-colors first:rounded-l-md last:rounded-r-md last:border-r-0 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  icon,
  label,
  className,
  labelClass,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
  labelClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border bg-transparent px-2 text-[12px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {icon}
      <span className={labelClass ?? ""}>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Part 6.3 — Saved indicator                                         */
/* ------------------------------------------------------------------ */

/**
 * Normalizes the top-bar status chip across four states:
 *   - Saving...              (debounced after an edit fires)
 *   - Saved just now         (immediately after save resolves)
 *   - Saved Ns ago           (older than 5 seconds)
 *   - Unsaved changes        (edits pending, before the debounce settles)
 *
 * Historic view: on first mount the chip reads "No edits since open"
 * (no autosave has fired yet). The prototype fakes the autosave with a
 * 1.5s debounce off `historyIndex`.
 */
function SavedIndicator({ historyIndex }: { historyIndex: number }) {
  const [state, setState] = useState<"initial" | "unsaved" | "saving" | "saved">("initial");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const firstMount = useRef(true);

  // React to edits.
  useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    setState("unsaved");
    const t1 = window.setTimeout(() => {
      setState("saving");
      const t2 = window.setTimeout(() => {
        setSavedAt(Date.now());
        setState("saved");
      }, 500);
      return () => window.clearTimeout(t2);
    }, 1200);
    return () => window.clearTimeout(t1);
  }, [historyIndex]);

  // Live-tick for "Saved Ns ago".
  useEffect(() => {
    const iv = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(iv);
  }, []);

  let label = "No edits since open";
  let tone = "border-border/60 bg-muted/40 text-muted-foreground";
  if (state === "unsaved") {
    label = "Unsaved changes";
    tone = "border-warning-500/40 bg-warning-500/10 text-warning-300";
  } else if (state === "saving") {
    label = "Saving…";
    tone = "border-sky-500/40 bg-sky-500/10 text-sky-300";
  } else if (state === "saved" && savedAt) {
    // Reference `tick` so the closure re-runs on the 5s interval and the
    // "Saved Ns ago" label stays fresh.
    void tick;
    const delta = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
    if (delta < 5) label = "Saved just now";
    else if (delta < 60) label = `Saved ${delta}s ago`;
    else if (delta < 3600) label = `Saved ${Math.floor(delta / 60)}m ago`;
    else label = `Saved ${Math.floor(delta / 3600)}h ago`;
    tone = "border-primary-500/40 bg-primary-500/10 text-primary-300";
  }

  return (
    <span
      className={cn(
        "hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium md:inline-flex",
        tone,
      )}
      aria-live="polite"
    >
      {state === "saving" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Analytics stat sub-component                                       */
/* ------------------------------------------------------------------ */

function JourneyStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: "emerald" | "red";
}) {
  return (
    <div className="text-center">
      <div
        className={cn(
          "text-sm font-bold tabular-nums",
          highlight === "emerald" && "text-primary-500",
          highlight === "red" && "text-error-400",
          !highlight && "text-foreground"
        )}
      >
        {value.toLocaleString()}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
          {title}
        </h4>
        {helper && <p className="mt-0.5 text-[10px] text-muted-foreground">{helper}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Label className="text-[11px] text-foreground">{label}</Label>
        {helper && (
          <span className="text-muted-foreground/60" title={helper}>
            <Info className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
      {children}
      {helper && <p className="text-[10px] leading-snug text-muted-foreground/80">{helper}</p>}
    </div>
  );
}

function SettingToggle({
  label,
  helper,
  checked,
  onChange,
}: {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-foreground">{label}</div>
        {helper && (
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground/80">{helper}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(val) => onChange(val)}
        size="sm"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Schedule dialog                                                    */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Seed audit-log entries — the shape mirrors what Command surfaces so the
 *  UI can be styled against real data without wiring a backend. */
const MOCK_AUDIT_ENTRIES = [
  { id: "au-1", at: "22 Jul, 19:21:04", event: "VERSION_SAVED", by: "user …26c194", note: "Saved draft" },
  { id: "au-2", at: "22 Jul, 19:19:47", event: "VERSION_SAVED", by: "user …26c194", note: "Saved draft" },
  { id: "au-3", at: "22 Jul, 19:15:36", event: "VALIDATED", by: "user …26c194", note: "Passed pre-launch validation" },
  { id: "au-4", at: "22 Jul, 19:15:35", event: "VERSION_SAVED", by: "user …26c194", note: "Saved draft" },
  { id: "au-5", at: "22 Jul, 19:14:11", event: "NODE_ADDED", by: "user …26c194", note: "Added Trigger AI Call node" },
  { id: "au-6", at: "22 Jul, 19:13:02", event: "AUDIENCE_UPDATED", by: "user …26c194", note: "Segment set to Tamara – UAE Segment" },
  { id: "au-7", at: "22 Jul, 19:12:44", event: "JOURNEY_CREATED", by: "user …26c194", note: "Blank journey from template" },
];

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

interface ScheduleConfig {
  recurring: boolean;
  days: number[];
  time: string;
  endTime: string;
  startDate: string;
  endDate: string;
}

function ScheduleDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (schedule: ScheduleConfig) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [recurring, setRecurring] = useState(true);
  const [days, setDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [time, setTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");

  const toggleDay = (idx: number) => {
    setDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Schedule Journey
          </DialogTitle>
          <DialogDescription>
            Set when this journey should run. Choose a one-time schedule or recurring days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Recurring toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Recurring schedule</p>
              <p className="text-[11px] text-muted-foreground">
                Run on selected days every week
              </p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          {/* Day picker (Google Calendar style) */}
          {recurring && (
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Repeat on
              </label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((day, idx) => {
                  const active = days.includes(idx);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      )}
                    >
                      {day.charAt(0)}
                    </button>
                  );
                })}
              </div>
              {days.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Every {days.map((d) => WEEKDAYS[d]).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Start time / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Start time
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t} GST</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                End time
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t} GST</option>
                ))}
              </select>
            </div>
          </div>

          {/* Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>
            {recurring && (
              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  End date (optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-foreground">Summary</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {recurring && days.length > 0
                ? `Runs every ${days.map((d) => WEEKDAYS[d]).join(", ")}, ${time}–${endTime} GST, starting ${startDate}${endDate ? ` until ${endDate}` : ""}.`
                : recurring
                  ? "Select at least one day."
                  : `One-time run on ${startDate}, ${time}–${endTime} GST.`}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            onClick={() =>
              onConfirm({ recurring, days, time, endTime, startDate, endDate })
            }
            disabled={recurring && days.length === 0}
          >
            <Calendar className="h-3.5 w-3.5" />
            Confirm schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

