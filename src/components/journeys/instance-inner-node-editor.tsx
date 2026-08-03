"use client"

/**
 * InstanceInnerNodeEditor — wraps `NodeConfigPanel` for a node that lives
 * inside a component instance (i.e. its data carries `_componentInstance`).
 *
 * Reads the effective node data by finding the child node on the canvas,
 * turns each user edit into an override on the parent `component_group`
 * node's `data.overrides`, and lets the group's re-render propagate the
 * updated value back down to the child (see canvas useEffect that resyncs
 * child data after override changes).
 */

import * as React from "react"
import type { Edge, Node } from "@xyflow/react"
import { NodeConfigPanel } from "@/components/journeys/node-config-panel"
import {
  getByPath,
  getMasterById,
  upsertOverride,
  removeOverride,
  type ComponentInstanceData,
  type ComponentOverride,
} from "@/data/components"

interface Props {
  focus: { instanceNodeId: string; masterNodeId: string }
  nodes: Node[]
  edges: Edge[]
  onClose: () => void
  onOverridesChange: (next: ComponentOverride[]) => void
}

export function InstanceInnerNodeEditor({
  focus,
  nodes,
  edges,
  onClose,
  onOverridesChange,
}: Props) {
  const groupNode = nodes.find((n) => n.id === focus.instanceNodeId)
  const groupData = groupNode?.data as unknown as ComponentInstanceData | undefined
  const master = groupData ? getMasterById(groupData.componentId) : undefined
  const masterNode = master?.nodes.find((n) => n.id === focus.masterNodeId)

  // The live child node is what the user sees on the canvas — its data is
  // master + current overrides already applied.
  const childNode = nodes.find(
    (n) =>
      (n.data as { _componentInstance?: { componentInstanceId: string; masterNodeId: string } })
        ?._componentInstance?.componentInstanceId === focus.instanceNodeId &&
      (n.data as { _componentInstance?: { masterNodeId: string } })._componentInstance
        ?.masterNodeId === focus.masterNodeId,
  )

  if (!groupNode || !groupData || !master || !masterNode || !childNode) return null

  const overriddenPaths = groupData.overrides
    .filter((o) => o.nodeId === focus.masterNodeId)
    .map((o) => o.propertyPath)

  const handleUpdate = (_id: string, newData: Record<string, unknown>) => {
    const baseline = masterNode.data as Record<string, unknown>
    let overrides = groupData.overrides
    const paths = collectDottedPaths(newData, baseline)
    for (const p of paths) {
      const nextVal = getByPath(newData, p)
      const baseVal = getByPath(baseline, p)
      const differs = !deepEqual(nextVal, baseVal)
      if (differs) {
        overrides = upsertOverride(overrides, {
          nodeId: focus.masterNodeId,
          propertyPath: p,
          value: nextVal,
        })
      } else {
        overrides = removeOverride(overrides, focus.masterNodeId, p)
      }
    }
    onOverridesChange(overrides)
  }

  return (
    <NodeConfigPanel
      node={childNode}
      onClose={onClose}
      onUpdate={handleUpdate}
      nodes={[childNode]}
      edges={edges}
      instanceContext={{
        componentName: groupData.name,
        componentId: groupData.componentId,
        lockedProperties: master.lockedProperties.filter((lp) => lp.nodeId === focus.masterNodeId),
        overriddenPaths,
        onResetOverride: (path) => {
          onOverridesChange(removeOverride(groupData.overrides, focus.masterNodeId, path))
        },
      }}
    />
  )
}

function collectDottedPaths(next: unknown, base: unknown, prefix = ""): string[] {
  const out = new Set<string>()
  const walk = (v: unknown, path: string) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const k of Object.keys(v as Record<string, unknown>)) {
        walk((v as Record<string, unknown>)[k], path ? `${path}.${k}` : k)
      }
    } else if (path) {
      out.add(path)
    }
  }
  walk(next, prefix)
  walk(base, prefix)
  return Array.from(out)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a && b && typeof a === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}
