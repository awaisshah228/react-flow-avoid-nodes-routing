/**
 * Server-side routing utilities.
 * Handles ELK layout, group expansion, overlap resolution, and edge routing.
 */

import ELK from "elkjs";
import { loadAvoidWasm, routeAll } from "avoid-nodes-router";
import type { FlowNode, FlowEdge } from "avoid-nodes-router";

const PADDING = 20;
const OVERLAP_GAP = 30;

// ---- WASM init (singleton) ----

let wasmLoaded = false;

export async function ensureWasm() {
  if (!wasmLoaded) {
    await loadAvoidWasm();
    wasmLoaded = true;
  }
}

// ---- ELK layout ----

const elk = new ELK();

export async function layoutWithELK(nodes: FlowNode[], edges: FlowEdge[]): Promise<FlowNode[]> {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
    },
    children: nodes
      .filter((n) => !n.parentId && n.type !== "group")
      .map((n) => ({
        id: n.id,
        width: getWidth(n),
        height: getHeight(n),
      })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(graph);

  return nodes.map((node) => {
    const elkNode = layout.children?.find((c) => c.id === node.id);
    if (elkNode) {
      return { ...node, position: { x: elkNode.x ?? node.position.x, y: elkNode.y ?? node.position.y } };
    }
    return node;
  });
}

// ---- Helpers ----

export function getWidth(n: FlowNode): number {
  return (n.width as number) ?? (n.style?.width as number) ?? 150;
}

export function getHeight(n: FlowNode): number {
  return (n.height as number) ?? (n.style?.height as number) ?? 40;
}

// ---- Group expansion ----

export function expandGroups(nodes: FlowNode[]): FlowNode[] {
  const result = nodes.map((n) => ({
    ...n,
    style: n.style ? { ...n.style } : undefined,
  }));
  const nodeMap = new Map<string, FlowNode>();
  for (const n of result) nodeMap.set(n.id, n);

  const childrenOf = new Map<string, string[]>();
  for (const n of result) {
    if (n.parentId) {
      const list = childrenOf.get(n.parentId) || [];
      list.push(n.id);
      childrenOf.set(n.parentId, list);
    }
  }

  const groupIds = result.filter((n) => n.type === "group").map((n) => n.id);

  function nestingDepth(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node?.parentId) return 0;
    return 1 + nestingDepth(node.parentId, visited);
  }

  const sortedGroups = [...groupIds].sort((a, b) => nestingDepth(b) - nestingDepth(a));

  for (const groupId of sortedGroups) {
    const group = nodeMap.get(groupId)!;
    const children = childrenOf.get(groupId);
    if (!children || children.length === 0) continue;

    let maxRight = 0;
    let maxBottom = 0;

    for (const childId of children) {
      const child = nodeMap.get(childId)!;
      const cw = child.width ?? (child.style?.width as number) ?? 150;
      const ch = child.height ?? (child.style?.height as number) ?? 40;
      maxRight = Math.max(maxRight, child.position.x + cw);
      maxBottom = Math.max(maxBottom, child.position.y + ch);
    }

    const newWidth = maxRight + PADDING;
    const newHeight = maxBottom + PADDING;

    group.width = newWidth;
    group.height = newHeight;
    if (group.style) {
      group.style.width = newWidth;
      group.style.height = newHeight;
    } else {
      group.style = { width: newWidth, height: newHeight };
    }

    // Horizontally center children within the group
    let minX = Infinity;
    let childMaxRight = 0;
    for (const childId of children) {
      const child = nodeMap.get(childId)!;
      const cw = child.width ?? (child.style?.width as number) ?? 150;
      minX = Math.min(minX, child.position.x);
      childMaxRight = Math.max(childMaxRight, child.position.x + cw);
    }
    const childrenWidth = childMaxRight - minX;
    const offsetX = (newWidth - childrenWidth) / 2 - minX;
    if (Math.abs(offsetX) > 1) {
      for (const childId of children) {
        const child = nodeMap.get(childId)!;
        child.position = { x: child.position.x + offsetX, y: child.position.y };
      }
    }
  }

  resolveOverlaps(result);
  return result;
}

function resolveOverlaps(nodes: FlowNode[]) {
  const siblingGroups = new Map<string, FlowNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? "__root__";
    const list = siblingGroups.get(key) || [];
    list.push(n);
    siblingGroups.set(key, list);
  }

  for (const [, siblings] of siblingGroups) {
    if (siblings.length < 2) continue;

    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          const a = siblings[i];
          const b = siblings[j];
          const aw = getWidth(a);
          const ah = getHeight(a);
          const bw = getWidth(b);

          const xOverlap = a.position.x < b.position.x + bw && b.position.x < a.position.x + aw;
          const yOverlap = a.position.y < b.position.y + getHeight(b) && b.position.y < a.position.y + ah;

          if (xOverlap && yOverlap) {
            const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];
            const leftRight = left.position.x + getWidth(left) + OVERLAP_GAP;
            if (right.position.x < leftRight) {
              right.position = { x: leftRight, y: right.position.y };
            }
          }
        }
      }
    }
  }
}

// ---- Type converters ----

export function toFlowNodes(nodes: Array<Record<string, unknown>>): FlowNode[] {
  return nodes.map((n) => ({
    id: n.id as string,
    position: n.position as { x: number; y: number },
    width: (n.width as number) ?? (n.style as Record<string, unknown>)?.width ?? 150,
    height: (n.height as number) ?? (n.style as Record<string, unknown>)?.height ?? 40,
    data: n.data as Record<string, unknown>,
    type: n.type as string | undefined,
    parentId: n.parentId as string | undefined,
    style: n.style as Record<string, unknown> | undefined,
    expandParent: n.expandParent as boolean | undefined,
  }));
}

export function toFlowEdges(edges: Array<Record<string, unknown>>): FlowEdge[] {
  return edges.map((e) => ({
    id: e.id as string,
    source: e.source as string,
    target: e.target as string,
    type: e.type as string,
    markerEnd: e.markerEnd as FlowEdge["markerEnd"],
    data: e.data as Record<string, unknown> | undefined,
  }));
}

// ---- Main processing ----

export { routeAll };
