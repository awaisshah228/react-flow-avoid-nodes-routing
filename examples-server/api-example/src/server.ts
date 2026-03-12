/**
 * Express.js REST API server example — full server-side handling.
 *
 * The server:
 *   1. Stores all diagram data (8 tabs)
 *   2. Computes ELK layout (node positions) for tabs that need it
 *   3. Expands group nodes to fit their children (mimics React Flow expandParent)
 *   4. Computes edge routing paths (avoid-nodes)
 *   5. Returns everything ready to render
 *
 * GET /api/diagram?tab=basic  →  { nodes, edges, routes }
 *
 * The client just renders — no routing logic on the frontend.
 */

import express from "express";
import cors from "cors";
import ELK from "elkjs";
import { loadAvoidWasm, routeAll } from "avoid-nodes-edge-server";
import type { FlowNode, FlowEdge } from "avoid-nodes-edge-server";
import { diagrams, type TabName } from "./diagrams";

const PORT = 3004;
const PADDING = 20; // padding around children inside a group

// ---- ELK layout ----

const elk = new ELK();

async function layoutWithELK(nodes: FlowNode[], edges: FlowEdge[]): Promise<FlowNode[]> {
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

function getWidth(n: FlowNode): number {
  return (n.width as number) ?? (n.style?.width as number) ?? 150;
}

function getHeight(n: FlowNode): number {
  return (n.height as number) ?? (n.style?.height as number) ?? 40;
}

/**
 * Mimics React Flow's `expandParent` behavior on the server.
 * Computes group sizes based on their children's positions + sizes,
 * and recursively handles nested groups (groups within groups).
 * Processes deepest groups first so parent groups see correct child sizes.
 */
function expandGroups(nodes: FlowNode[]): FlowNode[] {
  // Deep clone nodes so we can mutate freely
  const result = nodes.map((n) => ({
    ...n,
    style: n.style ? { ...n.style } : undefined,
  }));
  const nodeMap = new Map<string, FlowNode>();
  for (const n of result) nodeMap.set(n.id, n);

  // Build parent → children map
  const childrenOf = new Map<string, string[]>();
  for (const n of result) {
    if (n.parentId) {
      const list = childrenOf.get(n.parentId) || [];
      list.push(n.id);
      childrenOf.set(n.parentId, list);
    }
  }

  // Find all group nodes and compute nesting depth
  const groupIds = result.filter((n) => n.type === "group").map((n) => n.id);

  function nestingDepth(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node?.parentId) return 0;
    return 1 + nestingDepth(node.parentId, visited);
  }

  // Sort: deepest groups first
  const sortedGroups = [...groupIds].sort((a, b) => nestingDepth(b) - nestingDepth(a));

  // Expand each group to fit its children
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

    // Update both width/height and style.width/height
    group.width = newWidth;
    group.height = newHeight;
    if (group.style) {
      group.style.width = newWidth;
      group.style.height = newHeight;
    } else {
      group.style = { width: newWidth, height: newHeight };
    }
  }

  // After expanding, resolve overlaps between sibling nodes/groups
  // at each level (same parentId). Push nodes right/down to avoid overlap.
  resolveOverlaps(result);

  return result;
}

const OVERLAP_GAP = 30; // gap between resolved siblings

/**
 * After group expansion, nodes at the same parent level may overlap.
 * Only pushes apart nodes that actually overlap in BOTH x and y dimensions.
 * Children use relative coords, so only the node itself needs to move.
 */
function resolveOverlaps(nodes: FlowNode[]) {
  // Group siblings by parentId
  const siblingGroups = new Map<string, FlowNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? "__root__";
    const list = siblingGroups.get(key) || [];
    list.push(n);
    siblingGroups.set(key, list);
  }

  for (const [, siblings] of siblingGroups) {
    if (siblings.length < 2) continue;

    // Multiple passes to resolve cascading overlaps
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          const a = siblings[i];
          const b = siblings[j];
          const aw = getWidth(a);
          const ah = getHeight(a);
          const bw = getWidth(b);

          // Check if they overlap in both dimensions
          const xOverlap = a.position.x < b.position.x + bw && b.position.x < a.position.x + aw;
          const yOverlap = a.position.y < b.position.y + getHeight(b) && b.position.y < a.position.y + ah;

          if (xOverlap && yOverlap) {
            // Push the rightmost one further right
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

// ---- Convert diagram data to FlowNode/FlowEdge ----

function toFlowNodes(nodes: Array<Record<string, unknown>>): FlowNode[] {
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

function toFlowEdges(edges: Array<Record<string, unknown>>): FlowEdge[] {
  return edges.map((e) => ({
    id: e.id as string,
    source: e.source as string,
    target: e.target as string,
    type: e.type as string,
    markerEnd: e.markerEnd as FlowEdge["markerEnd"],
    data: e.data as Record<string, unknown> | undefined,
  }));
}

// ---- Main ----

async function main() {
  console.log("Loading libavoid WASM...");
  await loadAvoidWasm();
  console.log("WASM loaded.");

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/tabs", (_req, res) => {
    res.json({ tabs: Object.keys(diagrams) });
  });

  app.get("/api/diagram", async (req, res) => {
    try {
      const tab = (req.query.tab as string) || "basic";
      const diagram = diagrams[tab as TabName];

      if (!diagram) {
        res.status(400).json({ error: `Unknown tab: ${tab}. Available: ${Object.keys(diagrams).join(", ")}` });
        return;
      }

      let flowNodes = toFlowNodes(diagram.nodes as unknown as Array<Record<string, unknown>>);
      const flowEdges = toFlowEdges(diagram.edges as unknown as Array<Record<string, unknown>>);

      // 1. ELK layout for tabs that need it
      if (diagram.needsLayout) {
        flowNodes = await layoutWithELK(flowNodes, flowEdges);
      }

      // 2. Expand group nodes to fit their children (mimics React Flow expandParent)
      flowNodes = expandGroups(flowNodes);

      // 3. Edge routing — compute SVG paths that avoid nodes
      //    Options match the demo defaults
      const routes = routeAll(flowNodes, flowEdges, {
        shapeBufferDistance: 12,
        idealNudgingDistance: 10,
        edgeRounding: 8,
        autoBestSideConnection: true,
        shouldSplitEdgesNearHandle: true,
      });

      // 4. Return everything ready to render
      res.json({
        tab,
        nodes: flowNodes,
        edges: diagram.edges, // original edges with marker/style data
        routes,
      });
    } catch (err) {
      console.error("Error processing diagram:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.listen(PORT, () => {
    console.log(`Express API server listening on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
