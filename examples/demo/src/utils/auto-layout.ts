/**
 * Auto-layout algorithms: ELK, Dagre, and D3 Hierarchy.
 * Each positions nodes automatically; libavoid then routes edges.
 */

import type { Node, Edge } from "@xyflow/react";
import { getIncomers } from "@xyflow/react";
import Elk, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import dagre from "@dagrejs/dagre";
import { stratify, tree, type HierarchyPointNode } from "d3-hierarchy";

export type LayoutDirection = "TB" | "LR" | "BT" | "RL";
export type LayoutAlgorithmName = "elk" | "dagre" | "d3-hierarchy";

export interface AutoLayoutOptions {
  direction?: LayoutDirection;
  algorithm?: LayoutAlgorithmName;
  spacing?: number;
}

function getNodeDims(node: Node): { width: number; height: number } {
  const style = node.style as { width?: number; height?: number } | undefined;
  return {
    width: node.measured?.width ?? style?.width ?? 150,
    height: node.measured?.height ?? style?.height ?? 50,
  };
}

// ---------------------------------------------------------------------------
// ELK
// ---------------------------------------------------------------------------
const elk = new Elk();

function getElkDirection(d: LayoutDirection) {
  switch (d) {
    case "TB": return "DOWN";
    case "LR": return "RIGHT";
    case "BT": return "UP";
    case "RL": return "LEFT";
  }
}

async function elkLayout(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number): Promise<Node[]> {
  const graph = {
    id: "elk-root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": getElkDirection(direction),
      "elk.spacing.nodeNode": `${spacing}`,
      "elk.layered.spacing.nodeNodeBetweenLayers": `${spacing}`,
    },
    children: nodes.map((node) => {
      const { width, height } = getNodeDims(node);
      return { id: node.id, width, height };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const root = await elk.layout(graph);
  const layoutNodes = new Map<string, ElkNode>();
  for (const node of root.children ?? []) {
    layoutNodes.set(node.id, node);
  }

  return nodes.map((node) => {
    const elkNode = layoutNodes.get(node.id);
    if (!elkNode) return node;
    return { ...node, position: { x: elkNode.x!, y: elkNode.y! } };
  });
}

// ---------------------------------------------------------------------------
// Dagre
// ---------------------------------------------------------------------------
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

async function dagreLayout(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number): Promise<Node[]> {
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: spacing,
    ranksep: spacing,
  });

  const existingNodeIds = new Set(nodes.map((n) => n.id));
  dagreGraph.nodes().forEach((nodeId) => {
    if (!existingNodeIds.has(nodeId)) dagreGraph.removeNode(nodeId);
  });

  for (const node of nodes) {
    const { width, height } = getNodeDims(node);
    dagreGraph.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id);
    const { width, height } = getNodeDims(node);
    return { ...node, position: { x: x - width / 2, y: y - height / 2 } };
  });
}

// ---------------------------------------------------------------------------
// D3 Hierarchy
// ---------------------------------------------------------------------------
type NodeWithPosition = Node & { x: number; y: number };

const d3Tree = tree<NodeWithPosition>().separation(() => 1);

const d3RootNode: NodeWithPosition = {
  id: "d3-hierarchy-root",
  x: 0,
  y: 0,
  position: { x: 0, y: 0 },
  data: {},
};

function getD3Position(x: number, y: number, direction: LayoutDirection) {
  switch (direction) {
    case "TB": return { x, y };
    case "LR": return { x: y, y: x };
    case "BT": return { x: -x, y: -y };
    case "RL": return { x: -y, y: x };
  }
}

async function d3HierarchyLayout(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number): Promise<Node[]> {
  const isHorizontal = direction === "LR" || direction === "RL";

  const initialNodes: NodeWithPosition[] = [];
  let maxW = 0;
  let maxH = 0;

  for (const node of nodes) {
    initialNodes.push({ ...node, ...node.position });
    const { width, height } = getNodeDims(node);
    maxW = Math.max(maxW, width);
    maxH = Math.max(maxH, height);
  }

  const nodeSize: [number, number] = isHorizontal
    ? [maxH + spacing, maxW + spacing]
    : [maxW + spacing, maxH + spacing];
  d3Tree.nodeSize(nodeSize);

  const getParentId = (node: NodeWithPosition) => {
    if (node.id === d3RootNode.id) return undefined;
    const incomers = getIncomers(node, nodes, edges);
    return incomers[0]?.id || d3RootNode.id;
  };

  const hierarchy = stratify<NodeWithPosition>()
    .id((d) => d.id)
    .parentId(getParentId)([d3RootNode, ...initialNodes]);

  const root = d3Tree(hierarchy);
  const layoutMap = new Map<string, HierarchyPointNode<NodeWithPosition>>();
  for (const node of root) {
    layoutMap.set(node.id!, node);
  }

  return nodes.map((node) => {
    const laid = layoutMap.get(node.id);
    if (!laid) return node;
    const pos = getD3Position(laid.x, laid.y, direction);
    const { width, height } = getNodeDims(node);
    return { ...node, position: { x: pos.x - width / 2, y: pos.y - height / 2 } };
  });
}

// ---------------------------------------------------------------------------
// ELK with Groups (compound nodes)
// ---------------------------------------------------------------------------
const GROUP_PADDING = 40;

async function elkLayoutWithGroups(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number): Promise<Node[]> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const groupNodes = nodes.filter((n) => n.type === "group");
  const groupIds = new Set(groupNodes.map((n) => n.id));
  const childrenByGroup = new Map<string, Node[]>();
  const topLevelNodes: Node[] = [];

  for (const node of nodes) {
    if (node.type === "group") continue;
    if (node.parentId && groupIds.has(node.parentId)) {
      if (!childrenByGroup.has(node.parentId)) childrenByGroup.set(node.parentId, []);
      childrenByGroup.get(node.parentId)!.push(node);
    } else {
      topLevelNodes.push(node);
    }
  }

  // Classify edges: internal (both endpoints in same group) vs root-level
  const internalEdgesByGroup = new Map<string, typeof edges>();
  const rootEdges: typeof edges = [];

  for (const edge of edges) {
    const srcNode = nodeById.get(edge.source);
    const tgtNode = nodeById.get(edge.target);
    const srcGroup = srcNode?.parentId && groupIds.has(srcNode.parentId) ? srcNode.parentId : undefined;
    const tgtGroup = tgtNode?.parentId && groupIds.has(tgtNode.parentId) ? tgtNode.parentId : undefined;

    if (srcGroup && tgtGroup && srcGroup === tgtGroup) {
      // Both endpoints in same group → internal edge
      if (!internalEdgesByGroup.has(srcGroup)) internalEdgesByGroup.set(srcGroup, []);
      internalEdgesByGroup.get(srcGroup)!.push(edge);
    } else {
      // Cross-group or top-level → root edge
      rootEdges.push(edge);
    }
  }

  const elkDir = getElkDirection(direction);

  // Build ELK graph: groups are compound nodes containing children + internal edges
  const elkChildren: ElkNode[] = [];

  for (const group of groupNodes) {
    const children = childrenByGroup.get(group.id) ?? [];
    const groupInternalEdges = internalEdgesByGroup.get(group.id) ?? [];

    elkChildren.push({
      id: group.id,
      layoutOptions: {
        "elk.padding": `[top=${GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
      },
      children: children.map((child) => {
        const { width, height } = getNodeDims(child);
        return { id: child.id, width, height };
      }),
      edges: groupInternalEdges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    });
  }

  for (const node of topLevelNodes) {
    const { width, height } = getNodeDims(node);
    elkChildren.push({ id: node.id, width, height });
  }

  // All edges (internal + cross-group) go on root when using INCLUDE_CHILDREN.
  // ELK resolves which level each edge belongs to automatically.
  const allElkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph = {
    id: "elk-root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDir,
      "elk.spacing.nodeNode": `${spacing}`,
      "elk.layered.spacing.nodeNodeBetweenLayers": `${spacing}`,
      // CRITICAL: tells ELK to consider the full hierarchy as one graph,
      // so cross-group edges influence group positioning and prevent overlaps
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    },
    children: elkChildren,
    edges: allElkEdges,
  };

  const root = await elk.layout(graph);

  // Collect laid-out positions
  const positions = new Map<string, { x: number; y: number }>();
  const groupSizes = new Map<string, { width: number; height: number }>();

  for (const elkNode of root.children ?? []) {
    positions.set(elkNode.id, { x: elkNode.x!, y: elkNode.y! });
    if (groupIds.has(elkNode.id)) {
      groupSizes.set(elkNode.id, { width: elkNode.width!, height: elkNode.height! });
      // Children inside groups have positions relative to the group
      for (const child of elkNode.children ?? []) {
        positions.set(child.id, { x: child.x!, y: child.y! });
      }
    }
  }

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (!pos) return node;
    if (node.type === "group") {
      const size = groupSizes.get(node.id);
      return {
        ...node,
        position: pos,
        style: {
          ...((node.style ?? {}) as Record<string, unknown>),
          ...(size ? { width: size.width, height: size.height } : {}),
        },
      };
    }
    return { ...node, position: pos };
  });
}

// ---------------------------------------------------------------------------
// Dagre with Groups
// ---------------------------------------------------------------------------
async function dagreLayoutWithGroups(nodes: Node[], edges: Edge[], direction: LayoutDirection, spacing: number): Promise<Node[]> {
  const groupNodes = nodes.filter((n) => n.type === "group");
  const groupIds = new Set(groupNodes.map((n) => n.id));
  const childrenByGroup = new Map<string, Node[]>();
  const topLevelNodes: Node[] = [];

  for (const node of nodes) {
    if (node.type === "group") continue;
    if (node.parentId && groupIds.has(node.parentId)) {
      if (!childrenByGroup.has(node.parentId)) childrenByGroup.set(node.parentId, []);
      childrenByGroup.get(node.parentId)!.push(node);
    } else {
      topLevelNodes.push(node);
    }
  }

  // Step 1: Layout children within each group using dagre
  const childPositions = new Map<string, { x: number; y: number }>();
  const computedGroupSizes = new Map<string, { width: number; height: number }>();

  for (const group of groupNodes) {
    const children = childrenByGroup.get(group.id) ?? [];
    if (children.length === 0) {
      computedGroupSizes.set(group.id, getNodeDims(group));
      continue;
    }

    const internalEdges = edges.filter(
      (e) => children.some((c) => c.id === e.source) && children.some((c) => c.id === e.target)
    );

    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: spacing, ranksep: spacing });

    for (const child of children) {
      const { width, height } = getNodeDims(child);
      g.setNode(child.id, { width, height });
    }
    for (const edge of internalEdges) {
      g.setEdge(edge.source, edge.target);
    }
    dagre.layout(g);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const child of children) {
      const { x, y } = g.node(child.id);
      const { width, height } = getNodeDims(child);
      const left = x - width / 2;
      const top = y - height / 2;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + width);
      maxY = Math.max(maxY, top + height);
    }

    // Offset children to be relative to group with padding
    for (const child of children) {
      const { x, y } = g.node(child.id);
      const { width, height } = getNodeDims(child);
      childPositions.set(child.id, {
        x: x - width / 2 - minX + GROUP_PADDING,
        y: y - height / 2 - minY + GROUP_PADDING,
      });
    }

    computedGroupSizes.set(group.id, {
      width: maxX - minX + GROUP_PADDING * 2,
      height: maxY - minY + GROUP_PADDING * 2,
    });
  }

  // Step 2: Layout groups and top-level nodes
  const topG = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  topG.setGraph({ rankdir: direction, nodesep: spacing, ranksep: spacing });

  for (const group of groupNodes) {
    const size = computedGroupSizes.get(group.id) ?? getNodeDims(group);
    topG.setNode(group.id, size);
  }
  for (const node of topLevelNodes) {
    const { width, height } = getNodeDims(node);
    topG.setNode(node.id, { width, height });
  }

  // Add edges between top-level entities (map child edges to their groups)
  const topLevelIds = new Set([...groupIds, ...topLevelNodes.map((n) => n.id)]);
  const nodeToTopLevel = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === "group") {
      nodeToTopLevel.set(node.id, node.id);
    } else if (node.parentId && groupIds.has(node.parentId)) {
      nodeToTopLevel.set(node.id, node.parentId);
    } else {
      nodeToTopLevel.set(node.id, node.id);
    }
  }

  const addedEdges = new Set<string>();
  for (const edge of edges) {
    const src = nodeToTopLevel.get(edge.source) ?? edge.source;
    const tgt = nodeToTopLevel.get(edge.target) ?? edge.target;
    if (src === tgt) continue;
    if (!topLevelIds.has(src) || !topLevelIds.has(tgt)) continue;
    const key = `${src}->${tgt}`;
    if (addedEdges.has(key)) continue;
    addedEdges.add(key);
    topG.setEdge(src, tgt);
  }

  dagre.layout(topG);

  const topPositions = new Map<string, { x: number; y: number }>();
  for (const id of [...groupIds, ...topLevelNodes.map((n) => n.id)]) {
    const laid = topG.node(id);
    if (laid) {
      topPositions.set(id, { x: laid.x - laid.width / 2, y: laid.y - laid.height / 2 });
    }
  }

  return nodes.map((node) => {
    if (node.type === "group") {
      const pos = topPositions.get(node.id);
      const size = computedGroupSizes.get(node.id);
      if (!pos) return node;
      return {
        ...node,
        position: pos,
        style: {
          ...((node.style ?? {}) as Record<string, unknown>),
          ...(size ? { width: size.width, height: size.height } : {}),
        },
      };
    }
    if (node.parentId && groupIds.has(node.parentId)) {
      const pos = childPositions.get(node.id);
      if (!pos) return node;
      return { ...node, position: pos };
    }
    const pos = topPositions.get(node.id);
    if (!pos) return node;
    return { ...node, position: pos };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function runAutoLayout(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions = {}
): Promise<Node[]> {
  const { direction = "LR", algorithm = "elk", spacing = 60 } = options;

  switch (algorithm) {
    case "elk":
      return elkLayout(nodes, edges, direction, spacing);
    case "dagre":
      return dagreLayout(nodes, edges, direction, spacing);
    case "d3-hierarchy":
      return d3HierarchyLayout(nodes, edges, direction, spacing);
    default:
      return nodes;
  }
}

export async function runAutoLayoutWithGroups(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions = {}
): Promise<Node[]> {
  const { direction = "LR", algorithm = "elk", spacing = 60 } = options;

  switch (algorithm) {
    case "elk":
      return elkLayoutWithGroups(nodes, edges, direction, spacing);
    case "dagre":
      return dagreLayoutWithGroups(nodes, edges, direction, spacing);
    case "d3-hierarchy":
      // D3 hierarchy doesn't support groups well, fall back to dagre with groups
      return dagreLayoutWithGroups(nodes, edges, direction, spacing);
    default:
      return nodes;
  }
}
