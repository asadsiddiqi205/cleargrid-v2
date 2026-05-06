"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type DragEvent,
} from "react";
import { useSearchParams } from "next/navigation";
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
import { NodePalette } from "@/components/journeys/node-palette";
import { NodeConfigPanel } from "@/components/journeys/node-config-panel";
import {
  getJourneyFlow,
  getJourneyById,
  liveNodeCounts,
  type BlockType,
} from "@/data/journeys";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  CreditCard,
  FileText,
  ChevronDown,
  Settings as SettingsIcon,
  Check,
  Undo2,
  Redo2,
  Eye,
  GitBranch,
  Info,
  Maximize2,
} from "lucide-react";
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
};

/* ------------------------------------------------------------------ */
/*  Execution levels                                                   */
/* ------------------------------------------------------------------ */

type ExecutionLevel = "borrower" | "account" | "sub_account";

interface ExecutionLevelConfig {
  id: ExecutionLevel;
  label: string;
  icon: typeof User;
  description: string;
  helperText: string;
  dedupLabel: string;
  badgeColor: string;
}

const EXECUTION_LEVELS: ExecutionLevelConfig[] = [
  {
    id: "borrower",
    label: "Borrower",
    icon: User,
    description: "Customer-wide",
    helperText:
      "One active instance per borrower. Use for portfolio-level decisions like total exposure, risk segment, communication fatigue.",
    dedupLabel: "One active instance per borrower",
    badgeColor: "text-emerald-400",
  },
  {
    id: "account",
    label: "Account",
    icon: CreditCard,
    description: "Per product / obligation",
    helperText:
      "One active instance per account. Use for per-product decisions like credit card, loan, or BNPL flows.",
    dedupLabel: "One active instance per account",
    badgeColor: "text-cyan-400",
  },
  {
    id: "sub_account",
    label: "Sub-account",
    icon: FileText,
    description: "Per installment / due item",
    helperText:
      "One active instance per sub-account. Use for installment-level decisions, statement cycles, or due tranches.",
    dedupLabel: "One active instance per sub-account",
    badgeColor: "text-orange-400",
  },
];

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
  const [status, setStatus] = useState<"draft" | "published">("draft");

  // Execution level
  const [executionLevel, setExecutionLevel] = useState<ExecutionLevel>("borrower");
  const currentLevel = useMemo(
    () => EXECUTION_LEVELS.find((l) => l.id === executionLevel)!,
    [executionLevel]
  );

  // Pre-launch validation dialog
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [journeySettings, setJourneySettings] = useState({
    segment: "",
    entryRule: "once",
    reEntry: false,
    exitTrigger: "",
    conversionEvent: "",
    conversionWindow: "7",
    controlGroupPct: "0",
    frequencyCap: "3",
    dnd: true,
    queueing: "immediate",
    parallelChildren: false,
    preventDuplicateInstances: true,
  });

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
  const [statsPulse, setStatsPulse] = useState(false);

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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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
    [setNodes, edges, pushHistory, executionLevel]
  );

  /* ---------- click-to-add from palette ---------- */
  const onPaletteAdd = useCallback(
    (block: BlockType) => {
      // Position next to last node, or center
      const baseX = 320;
      const baseY = 160 + nodes.length * 140;
      const newNode: Node = {
        id: `node-${++nodeIdCounter}`,
        type: block.nodeKind,
        position: { x: baseX, y: baseY },
        data: { ...block.defaultData, blockType: block.type, executionLevel },
      };
      setNodes((nds) => {
        const next = [...nds, newNode];
        pushHistory(next, edges);
        return next;
      });
      setSelectedNode(newNode);
      toast.success(`Added "${block.label}"`);
    },
    [nodes.length, setNodes, edges, pushHistory, executionLevel]
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

  /* ---------- pulse stats when node count changes ---------- */
  useEffect(() => {
    setStatsPulse(true);
    const id = window.setTimeout(() => setStatsPulse(false), 520);
    return () => window.clearTimeout(id);
  }, [nodes.length]);

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
    const errors: string[] = [];

    // Must have exactly one Trigger node
    const triggerNodes = nodes.filter(
      (n) => n.type === "trigger" || String((n.data as Record<string, unknown>).blockType ?? "").endsWith("_trigger")
    );
    if (triggerNodes.length === 0) {
      errors.push("Journey has no entry trigger — add a Trigger block to define where borrowers enter.");
    } else if (triggerNodes.length > 1) {
      errors.push(`Journey has ${triggerNodes.length} Trigger nodes — only one entry point is allowed.`);
    }

    // Build edge maps
    const outgoing = new Map<string, number>();
    const incoming = new Map<string, number>();
    nodes.forEach((n) => { outgoing.set(n.id, 0); incoming.set(n.id, 0); });
    edges.forEach((e) => {
      outgoing.set(e.source, (outgoing.get(e.source) ?? 0) + 1);
      incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
    });

    nodes.forEach((n) => {
      const isEnd = n.type === "end";
      const isTrigger = n.type === "trigger" ||
        String((n.data as Record<string, unknown>).blockType ?? "").endsWith("_trigger");
      const label = String((n.data as Record<string, unknown>).label ?? n.type ?? n.id);

      if (!isEnd && (outgoing.get(n.id) ?? 0) === 0) {
        errors.push(`"${label}" has no outgoing connection — connect it to the next step or an End block.`);
      }
      if (!isTrigger && (incoming.get(n.id) ?? 0) === 0) {
        errors.push(`"${label}" has no incoming connection — nothing leads into this block.`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      setValidationDialogOpen(true);
      return;
    }

    // Existing validate (shake animation + warnings)
    if (!validateJourney()) return;

    setStatus("published");
    toast.success("Journey is live", {
      description: `Running at ${currentLevel.label} level. ${currentLevel.dedupLabel}.`,
    });
  }, [nodes, edges, validateJourney, currentLevel]);

  /* ---------- hydrate from composer (?fromComposer=true) ---------- */
  const searchParams = useSearchParams();
  const fromComposerRef = useRef(false);
  useEffect(() => {
    if (fromComposerRef.current) return;
    if (searchParams.get("fromComposer") !== "true") return;
    fromComposerRef.current = true;

    const channelParam = searchParams.get("channel");
    const channel: "email" | "sms" | "whatsapp" =
      channelParam === "sms" || channelParam === "whatsapp"
        ? channelParam
        : "email";

    const actionLabelMap: Record<string, string> = {
      email: "Send Email",
      sms: "Send SMS",
      whatsapp: "Send WhatsApp",
    };

    const triggerId = `node-${++nodeIdCounter}`;
    const actionId = `node-${++nodeIdCounter}`;

    const triggerNode: Node = {
      id: triggerId,
      type: "trigger",
      position: { x: 120, y: 160 },
      data: {
        label: "Segment Entry",
        description: "Composer audience",
        triggerType: "segment_entry",
      },
    };
    const actionNode: Node = {
      id: actionId,
      type: "action",
      position: { x: 440, y: 160 },
      data: {
        label: actionLabelMap[channel],
        description: "Composed message",
        actionType: channel,
        template: "Composer Draft",
      },
    };

    setNodes((nds) => [...nds, triggerNode, actionNode]);
    setEdges((eds) => [
      ...eds,
      {
        id: `e-${triggerId}-${actionId}`,
        source: triggerId,
        target: actionId,
        type: "smoothstep",
        animated: true,
        style: { stroke: "var(--chart-2)", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--chart-2)" },
      },
    ]);

    toast.success("Composer message loaded — add follow-up steps below", {
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

  /* ---------- mock stats from node count ---------- */
  const stats = useMemo(() => {
    const base = nodes.length * 47;
    return {
      entered: base * 8,
      active: Math.round(base * 5.2),
      converted: Math.round(base * 1.8),
      exited: Math.round(base * 0.6),
    };
  }, [nodes.length]);

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
    <div className="flex h-full flex-col">
      {/* ====== Top bar ====== */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/journeys"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to journeys"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Link href="/journeys" className="hover:text-foreground transition-colors">Journeys</Link>
            <span>/</span>
          </div>

          {/* Editable name */}
          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setIsEditingName(false);
              }}
              autoFocus
              className="w-48 border-b border-primary bg-transparent text-sm font-semibold text-foreground outline-none"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              {nameValue}
            </button>
          )}

          {/* Status badge */}
          {status === "draft" ? (
            <Badge variant="secondary" className="text-[10px]">
              Draft
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/20 text-[10px] text-emerald-400">
              Published
            </Badge>
          )}

          <div className="h-5 w-px bg-border" />

          {/* Execution Level selector */}
          <Popover>
            <PopoverTrigger>
              <span className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-muted">
                <currentLevel.icon className={cn("h-3.5 w-3.5", currentLevel.badgeColor)} />
                <span className="font-medium">{currentLevel.label}</span>
                <span className="hidden text-muted-foreground sm:inline">
                  · {currentLevel.description}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </span>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-[360px] p-0">
              <div className="border-b border-border bg-muted/30 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Execution Level</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Set once per journey. Determines what entity each instance runs against.
                </p>
              </div>
              <div className="space-y-2 p-3">
                {EXECUTION_LEVELS.map((level) => {
                  const Icon = level.icon;
                  const active = executionLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => {
                        setExecutionLevel(level.id);
                        toast.success(`Execution level: ${level.label}`);
                      }}
                      className={cn(
                        "w-full rounded-lg border-2 p-3 text-left transition-all",
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-border hover:bg-accent/20"
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", level.badgeColor)} />
                        <span className="text-xs font-semibold text-foreground">
                          {level.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          — {level.description}
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-muted-foreground">
                        {level.helperText}
                      </p>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Cmd+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          <div className="h-5 w-px bg-border" />

          {/* Three-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info("Journey duplicated")}>
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Journey exported")}>
                <Download className="h-3.5 w-3.5" />
                Export
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings((s) => !s)}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Settings</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Draft saved")}
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>

          <Button variant="outline" size="sm" onClick={validateJourney}>
            <Check className="h-3.5 w-3.5" />
            <span>Validate</span>
          </Button>

          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handlePublish}
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>Publish</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={simulate}
            disabled={isSimulating}
            className="gap-1"
          >
            {isSimulating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>{isSimulating ? "Running..." : "Test run"}</span>
          </Button>
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
                label={`${currentLevel.label} segment`}
                helper="Filter the population allowed to enter this journey."
              >
                <select
                  value={journeySettings.segment}
                  onChange={(e) =>
                    setJourneySettings({ ...journeySettings, segment: e.target.value })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="">Select segment...</option>
                  <option value="all">All {currentLevel.label}s</option>
                  <option value="high_risk">High Risk</option>
                  <option value="overdue_30">Overdue 30+ Days</option>
                  <option value="new">New {currentLevel.label}s</option>
                </select>
              </SettingField>
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
              <SettingField
                label="Exit trigger"
                helper="Condition that pulls users out of the journey immediately."
              >
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. payment_received"
                  value={journeySettings.exitTrigger}
                  onChange={(e) =>
                    setJourneySettings({
                      ...journeySettings,
                      exitTrigger: e.target.value,
                    })
                  }
                />
              </SettingField>
              <SettingToggle
                label="Allow re-entry"
                helper="Permit the same user to re-enter after completion."
                checked={journeySettings.reEntry}
                onChange={(val) => setJourneySettings({ ...journeySettings, reEntry: val })}
              />
            </SettingsSection>

            {/* Conversion */}
            <SettingsSection title="Conversion" helper="Track success and isolate a control group.">
              <SettingField
                label="Conversion event"
                helper="Success event attributed to this journey."
              >
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. payment_received"
                  value={journeySettings.conversionEvent}
                  onChange={(e) =>
                    setJourneySettings({
                      ...journeySettings,
                      conversionEvent: e.target.value,
                    })
                  }
                />
              </SettingField>
              <SettingField
                label="Conversion window"
                helper="Maximum delay after entry to still count as converted."
              >
                <select
                  value={journeySettings.conversionWindow}
                  onChange={(e) =>
                    setJourneySettings({
                      ...journeySettings,
                      conversionWindow: e.target.value,
                    })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </SettingField>
              <SettingField
                label="Control group %"
                helper="Holdout sample that receives no messages. Used to measure lift."
              >
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={0}
                  max={100}
                  value={journeySettings.controlGroupPct}
                  onChange={(e) =>
                    setJourneySettings({
                      ...journeySettings,
                      controlGroupPct: e.target.value,
                    })
                  }
                />
              </SettingField>
            </SettingsSection>

            {/* Frequency & DND */}
            <SettingsSection title="Frequency & quiet hours" helper="Respect user-level limits.">
              <SettingField
                label="Frequency cap"
                helper="Max number of messages per user per period."
              >
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. 3 per week"
                  value={journeySettings.frequencyCap}
                  onChange={(e) =>
                    setJourneySettings({
                      ...journeySettings,
                      frequencyCap: e.target.value,
                    })
                  }
                />
              </SettingField>
              <SettingToggle
                label="Respect DND / quiet hours"
                helper="Never deliver messages during configured quiet hours."
                checked={journeySettings.dnd}
                onChange={(val) => setJourneySettings({ ...journeySettings, dnd: val })}
              />
            </SettingsSection>

            {/* Queueing & concurrency */}
            <SettingsSection title="Queueing & concurrency" helper="How multiple instances interact.">
              <SettingField
                label="Queueing mode"
                helper="Immediate = send as soon as ready. Batch = group sends into queues."
              >
                <select
                  value={journeySettings.queueing}
                  onChange={(e) =>
                    setJourneySettings({
                      ...journeySettings,
                      queueing: e.target.value,
                    })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="immediate">Send immediately</option>
                  <option value="batch">Batch in queue</option>
                </select>
              </SettingField>
              <SettingToggle
                label="Allow parallel children"
                helper="Let child journeys run in parallel with this one."
                checked={journeySettings.parallelChildren}
                onChange={(val) =>
                  setJourneySettings({ ...journeySettings, parallelChildren: val })
                }
              />
              <SettingToggle
                label={currentLevel.dedupLabel}
                helper="Prevent duplicate instances at the current execution level."
                checked={journeySettings.preventDuplicateInstances}
                onChange={(val) =>
                  setJourneySettings({ ...journeySettings, preventDuplicateInstances: val })
                }
              />
            </SettingsSection>
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

      {/* ====== Pre-launch validation dialog ====== */}
      <AlertDialog open={validationDialogOpen} onOpenChange={(open) => { if (!open) setValidationDialogOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Journey can't be published yet</AlertDialogTitle>
            <AlertDialogDescription>
              Fix the following issues before going live:
            </AlertDialogDescription>
            <ul className="mt-2 space-y-1.5">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 shrink-0 text-destructive">✕</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setValidationDialogOpen(false)}>
              Fix issues
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ====== Canvas area ====== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node Palette */}
        <NodePalette onAdd={onPaletteAdd} />

        {/* Center: React Flow */}
        <div
          ref={wrapperRef}
          className={cn(
            "relative flex-1",
            validateState === "validating" && "journey-validating",
            validateState === "valid" && "journey-valid",
            validateState === "invalid" && "journey-shake"
          )}
        >
          {/* Floating stats bar */}
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
            <div
              className={cn(
                "flex items-center gap-4 rounded-xl border border-border/70 bg-card/80 px-4 py-2 shadow-lg backdrop-blur-md transition-transform",
                statsPulse && "journey-stat-pulse"
              )}
            >
              <div className="flex items-center gap-2">
                <currentLevel.icon className={cn("h-3.5 w-3.5", currentLevel.badgeColor)} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {currentLevel.label} Journey
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <Stat label="Entered" value={stats.entered} />
              <Stat label="Active" value={stats.active} />
              <Stat label="Converted" value={stats.converted} highlight="emerald" />
              <Stat label="Exited" value={stats.exited} highlight="red" />
              <div className="h-4 w-px bg-border" />
              <div className="text-center">
                <div className="text-sm font-bold tabular-nums text-foreground">
                  {nodes.length}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Nodes
                </div>
              </div>
            </div>
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
                <span className="font-medium text-emerald-400">Entry trigger</span>.
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
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
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
            <Panel position="bottom-left" className="mb-[52px] ml-[2px]">
              <button
                onClick={() => rfInstance.current?.fitView({ padding: 0.2, duration: 300 })}
                className="flex h-7 w-7 items-center justify-center rounded border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Fit to screen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
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
          </ReactFlow>
        </div>

        {/* Right: Config panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={onNodeDataUpdate}
          />
        )}
      </div>

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
      ` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat sub-component                                                 */
/* ------------------------------------------------------------------ */

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

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: "emerald" | "red";
}) {
  const colorClass =
    highlight === "emerald"
      ? "text-emerald-400"
      : highlight === "red"
        ? "text-red-400"
        : "text-foreground";
  return (
    <div className="text-center leading-tight">
      <div className={cn("text-sm font-bold tabular-nums", colorClass)}>
        {value.toLocaleString()}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
