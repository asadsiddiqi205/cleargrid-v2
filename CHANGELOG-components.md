# Journey Builder — Template Blocks (Components)

Deployed: cleargrid-v1-jbfull.vercel.app
Date: 2026-07-28

Components are reusable subgraphs on the journey canvas — masters, instances,
overrides, all live. Modeled after Figma components: auto-propagate on
master change, every property overridable by default (with per-field locks),
overrides always win against master changes.

**Violet-500 is reserved exclusively for component surfaces** — palette
section, instance card border, master editor chrome, override indicators,
"Publish" button. Authors see violet, they know they're touching shared
state.

## Architecture — expanded-inline rendering

Components render as their **full subgraph** on the canvas, wrapped in a
violet-dashed frame with a header showing the component name/version and
an Open master button. The frame is a real ReactFlow parent node
(`type: "component_group"`), and the master's inner nodes are placed as
its `parentId`-linked children — each rendered with its normal node
renderer (TriggerNode/ActionNode/WaitNode/etc.), positioned relative to
the parent, and marked with `data._componentInstance = { componentInstanceId, masterNodeId, componentId }`.

The initial rebuild used a single compressed "instance card" node with a
right-side panel to expose the subgraph. That model works interaction-
wise but doesn't read as a component visually — authors can't see what's
inside without opening a panel. The expanded-inline model shows the real
nodes directly, which was the design intent.

Child nodes are:
- non-draggable and non-deletable directly (the group is the movable unit)
- clicked to open `NodeConfigPanel` via `InstanceInnerNodeEditor`, which
  writes edits back as overrides on the parent group's `data.overrides`
- kept in sync with the master + overrides by a canvas effect that walks
  every group's children after each nodes-state change and re-applies
  `resolveInstance(master, overrides)`

Deleting a `component_group` cascades to its children via the ReactFlow
`onNodesDelete` handler.

Detach strips `parentId` + `extent` + the marker from every child and
shifts their positions from group-relative → canvas-relative, then drops
the group node.

Save-as-component takes the selected nodes, extracts them into a new
master, places a fresh `component_group` at the selection's centroid,
and rebuilds the children with parent references + a marker payload.
External edges (incoming / outgoing across the selection boundary) are
rewired to point at the group node.

## Part 1 — Data model + storage

`src/data/components.ts` (new · ~440 lines)

- `ComponentMaster` — id, name, description, category, version, nodes,
  edges, `lockedProperties[]`, `inputPort`, `outputPorts[]`, publish history.
- `ComponentInstanceData` — the node.data shape for a `component_instance`
  node on a journey canvas. Carries `componentId`, `componentVersion`
  (snapshot), `overrides[]`, `expanded`, denormalized name/category/ports.
- localStorage-backed store keyed under `cleargrid:components:masters` plus
  a `cg:components:changed` custom-event broadcast so panels update live
  after publish.
- `resolveInstance(master, overrides)` applies overrides onto master node
  data; locked properties always keep the master value and silently drop
  overrides on them.
- `upsertOverride` / `removeOverride` / `getOverride` / `isPropertyLocked`
  helpers.
- Publish flow: `publishMaster(id)` bumps `version`, appends to
  `publishHistory[]` (capped at 20), broadcasts the change.
- `indexInstancesAcross(journeys)` scans a set of journeys and groups
  instance usage by `componentId` — used by the master editor sidebar
  ("used in N journeys") and the palette delete-guard.

## Part 4.1 — Compressed instance rendering

`src/components/journeys/nodes/component-instance-node.tsx` (new)

Registered as `component_instance` in `journey-canvas.tsx`'s `nodeTypes`
registry. Renders:

- 2px violet border (bumps to violet-400 when selected)
- Violet accent strip along the top
- Small Boxes icon in a violet chip · component name · `vN` badge
- `Component · <Category>` tag in uppercase violet-300
- Description line
- Override count pill when overrides exist
- Output ports either as a bottom handle (single output) or a labeled
  right-side stub list (multiple outputs)
- **Master-drift pulse dot** — violet-400 with a ping animation when
  `master.version > data.componentVersion`. Tooltip: "Master updated to
  vN. Your overrides are preserved."

## Part 3 — Palette

`src/components/journeys/node-palette.tsx` — extended

- New "Components" section injected between Flow Controls and Data / State
  in the palette (position 5 per spec).
- Violet Boxes icon + live count badge sourced from `listMasters()`.
- Palette subscribes to `cg:components:changed` so a publish anywhere
  triggers immediate rerender.
- Category filter chips (multi-select) below the section header.
- Search filters both blocks and components by name / description /
  category.
- Each component card: violet border, small Boxes icon, name + version
  badge, muted description, uppercase category tag. Draggable to canvas +
  clickable to insert.
- Hover reveals per-card actions: **Edit master** (pencil icon → route to
  `/components/[id]/edit`) and **Delete component** (trash icon).
- Empty state: violet-tinted panel with the exact copy from the spec.

## Part 2 — Save as component

`src/components/journeys/save-as-component-modal.tsx` (new)

- ReactFlow's `onSelectionChange` fires into a debounced `selectedNodeIds`
  state (guarded against reference-only changes to prevent max-update
  loops).
- When `selectedNodeIds.length >= 2`, a **floating action bar** renders as
  a bottom-center Panel: `N selected · Save as component · Duplicate ·
  Delete`. Save-as-component is a violet-500 pill.
- The Create Component modal validates:
  - No trigger nodes (any of `trigger`/`event_trigger`/…/`journey_handoff_entry`)
  - No exit nodes (any of `end`/`end_journey`)
  - No nested component instances (v1 nesting cap)
  - Exactly one entry point (single node with no upstream edge from the
    selection)
  - At least one exit (edge leaving to outside, or a default "Exit" port)
- Auto-detects output ports from outgoing edges leaving the selection with
  editable labels.
- Mini preview panel on the right shows Input port · listed inner nodes ·
  Output ports.
- On Save:
  - `ComponentMaster` is persisted
  - Selected nodes are removed from the journey
  - Their internal edges are dropped (they now live in the master)
  - External edges are rewired to point at a new `component_instance`
    node placed at the selection's centroid

## Part 5 — Master editor

`src/app/(app)/components/[id]/edit/page.tsx` (new)

- Route `/components/[id]/edit` with a distinct **violet-accented header**
  (subtle horizontal gradient from violet-500/0.08).
- Header shows: Back button · Boxes icon · inline-editable name · category
  dropdown · **version chip with instance-count** ("v3 · 47 instances
  across 12 journeys" — count derived by scanning the seeded journey
  library on demand).
- Right sidebar (`MasterSidebar`) when no node selected:
  - Editable description
  - Ports summary (input + labeled outputs)
  - **Locked properties** list (from `master.lockedProperties`)
  - Cross-journey usage list with links
  - Auto-propagate reminder box
- When a node is selected, `NodeConfigPanel` takes the sidebar's place
  with a `masterContext` prop that surfaces the violet "master editor"
  hint at the top.
- **Save draft** persists edits without bumping version.
- **Publish** button (violet pill) increments `master.version`,
  appends to `publishHistory[]`, and broadcasts `cg:components:changed` —
  every open journey canvas + palette repaints. Toast confirms count
  affected.
- Version history dropdown reads the last 20 entries · read-only per v1.
- Delete button (red trash) — blocks with a toast when instances exist
  in the current seeded journey library; otherwise confirms and removes.

## Part 6 — Seed component library

Five starter components ship on first-run via `seedComponentsIfEmpty()`
called from the canvas mount:

1. **Callback Handling** — Wait until callback time → Compliance guard →
   Trigger AI call. Three locked properties on the guard
   (`checks.dnd`/`checks.contactWindow`/`checks.dnc`) with lender-config
   reasons.
2. **Redial with Escalation** — Trigger AI Call (retryEnabled, gentle
   preset) → Action Path Split. No locks — a tuning scaffold.
3. **Consent Pre-flight** — DNC gate → Consent check. Two locked properties
   on the DNC gate (`list` + `matchMode`) with regulatory reasons.
4. **Preferred Channel Routing** — Best Channel node with four channel
   outputs. No locks.
5. **Post-PTP Follow-up** — Wait for PTP date → SMS reminder → Wait 1d →
   Has Done Event check → Escalate to human. No locks.

Every seed uses realistic default configs on each inner node.

## Parts 4.2 + 4.3 — Instance panel + inline edit

`src/components/journeys/component-instance-panel.tsx` (new)

Selecting an instance on the canvas opens a 380px right-side panel with
three tabs:

- **Subgraph** — describes the master, lists every inner node (violet dot ·
  label · type · override count · lock count), each clickable to edit.
  Footer link opens the master.
- **Overrides** — flat list grouped by inner node showing
  `propertyPath · value · Reset` rows. Header **Reset all** button.
  Empty state copy per spec.
- **Advanced** — Detach action + master version snapshot info.

`src/components/journeys/instance-inner-node-editor.tsx` (new)

Clicking an inner-node from the Subgraph tab enters this mode. It:

- Resolves the effective node data via `resolveInstance(master, overrides)`
- Mounts `NodeConfigPanel` with the resolved node
- Passes `instanceContext` so the panel renders the amber banner at the
  top ("You're editing an instance of …") with an **Open master** link
- On every `onUpdate`, diffs the new data vs the master baseline and
  writes an `overrides[]` entry for each differing dotted-path. When a
  property is edited back to the master value, its override is auto-
  removed.

## Part 5.3 — Property locking

Locked properties live on the master and are enforced by
`resolveInstance` — overrides on locked paths are silently ignored (they
also don't get written by the inner-node editor because the panel is
running with `instanceContext.lockedProperties`, which UI code can read to
render fields read-only). The master editor sidebar surfaces
`lockedProperties[]` with human-readable reasons for the seeded
components.

The `NodeConfigPanel` was extended with two new optional props:

- `masterContext` — surfaces the violet "master editor" hint banner. In a
  future pass the panel will render per-field lock toggles from this
  context; for v1 the master editor's sidebar handles locking coarsely.
- `instanceContext` — surfaces the amber "editing an instance" banner and
  carries `overriddenPaths` + `onResetOverride` for the per-field indicator
  UI. Fields that appear in `lockedProperties` are treated as read-only.

## Part 4.4 — Structural constraints on instances

The architecture naturally enforces this: inner nodes never enter the
journey's `nodes` array (they live only on the master). Everything an
author can do to an instance is either a property override (per Part 4.3)
or a route to the master editor. Add / delete / rewire operations on
inner nodes don't exist in the UI surface.

The Detach action turns an instance into flat regular nodes (with a
confirmation modal matching the spec verbatim) — that's the escape hatch
per Part 7.3.

## Parts 4.5 + 7.4 — Master-change propagation

- Compressed instance card renders a **violet pulse dot** in the top-right
  when `master.version > data.componentVersion`. Tooltip is spec verbatim.
- On canvas first-load a one-shot `useEffect` scans for drifted instances
  and:
  1. Auto-bumps their `componentVersion` snapshot + refreshes denormalized
     name/category/ports
  2. Emits a preserve-overrides toast per drifted component:
     `"<Name>" master updated · Updated to vN across K instances · your M
     overrides preserved.`
- The Overrides tab shows the current instance state; when the master
  changes a property that the instance overrides, the override still
  wins (per the locked design decision).

## Files touched

New:
- `src/data/components.ts` — data model, store, resolveInstance, seed
  library, cross-journey usage index.
- `src/components/journeys/nodes/component-instance-node.tsx` — compressed
  instance renderer.
- `src/components/journeys/save-as-component-modal.tsx` — Save-as-component
  flow + subgraph preview.
- `src/components/journeys/component-instance-panel.tsx` — right-side
  instance panel (Subgraph / Overrides / Advanced tabs).
- `src/components/journeys/instance-inner-node-editor.tsx` — inner-node
  edit → override write path.
- `src/app/(app)/components/[id]/edit/page.tsx` — master editor route.
- `screenshots/components/*.png` — verification captures.

Modified:
- `src/components/journeys/journey-canvas.tsx` — registered
  `component_instance` node type, wired palette handlers, selection
  action bar, save-as-component modal render, right-panel selection
  logic (Journey GPT / Instance panel / Inner-node editor / Node config),
  detach flow, master-drift on-load handling.
- `src/components/journeys/node-palette.tsx` — Components section between
  Flow Controls and Data / State, category filter chips, live subscribe
  to `cg:components:changed`.
- `src/components/journeys/node-config-panel.tsx` — new `masterContext`
  and `instanceContext` optional props, amber instance-banner + violet
  master-editor hint at the top of the panel.

## Verified via Playwright at 1440×900

- **01-palette-components-open.png** — palette Components section open,
  5 seed components listed with violet cards, category filter chips
  visible, version badges attached.
- **03-master-editor.png** — master editor at `/components/cmp-callback-
  handling/edit`, violet-tinted header with editable name / category /
  version chip, subgraph rendered on the canvas, right sidebar with
  ports summary + 3 locked properties (dnd / contactWindow / dnc, each
  with human-readable regulatory / lender-config reasons).
- **05-instance-full-view.png** — Callback Handling inserted on a fresh
  journey. The violet-dashed frame wraps the full subgraph: header bar
  "Callback Handling v1 · COMPONENT · POST-CALL" with an Open master
  button, followed by three real nodes rendered inline — a yellow
  "Wait until callback time" flow-control showing 1d, a "Compliance
  guard" block, and a "Trigger AI call" channel node with the callback
  handling badge — connected with normal edges (Wait → guard → Passed
  → call). Output ports labeled "Call complete" and "Blocked by
  compliance" sit at the bottom edge of the frame.

## What's NOT built (per Part 8)

- No nesting (v1 nesting cap = 0)
- No parameters (overrides are the parameterization mechanism)
- No draft/publish separation (master editor is live-editing)
- No rollback (version history is read-only)
- No cross-workspace sharing
- No component analytics
- No version pinning on instances (instances always follow latest master
  with the preserve-overrides toast on load)
- No full expand-inline visual (see Architecture flag above — the
  interaction is fully spec'd via the instance panel + inner-node editor)

## Open questions flagged (Part 9)

- **Audit log surfacing** — where do component master edits appear? The
  prototype doesn't wire component publishes into the per-journey audit
  log; product decision needed.
- **Cross-workspace component IDs** — prototype uses raw string IDs; a
  real backend needs namespacing when multi-workspace ships.
- **In-flight journey behavior on master change** — existing enrolled
  borrowers presumably continue with the old config, new enrolments get
  the new. Confirm with engineering.
