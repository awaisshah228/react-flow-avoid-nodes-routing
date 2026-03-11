/**
 * Auto-layout algorithms: ELK, Dagre, and D3 Hierarchy.
 * Each positions nodes automatically; libavoid then routes edges.
 */

import type { Node, Edge } from "@xyflow/react";
import { getIncomers } from "@xyflow/react";
import Elk, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import dagre from "@dagrejs/dagre";
import { stratify, tree, type HierarchyPointNode } from "d3-hierarchy";

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;

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
  const groupIds = new Set(nodes.filter((n) => n.type === "group").map((n) => n.id));

  // Build parent → children map (ALL nodes, including nested groups)
  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

  // Classify edges by their deepest common parent group
  const edgesByParent = new Map<string, Edge[]>();
  for (const edge of edges) {
    const srcNode = nodeById.get(edge.source);
    const tgtNode = nodeById.get(edge.target);
    const srcParent = srcNode?.parentId ?? "__root__";
    const tgtParent = tgtNode?.parentId ?? "__root__";
    // If both in same parent, edge is internal to that parent
    const key = srcParent === tgtParent ? srcParent : "__root__";
    if (!edgesByParent.has(key)) edgesByParent.set(key, []);
    edgesByParent.get(key)!.push(edge);
  }

  const elkDir = getElkDirection(direction);

  // Recursively build ELK node tree
  function buildElkNode(nodeId: string): ElkNode {
    const node = nodeById.get(nodeId)!;
    const children = childrenByParent.get(nodeId) ?? [];
    const internalEdges = edgesByParent.get(nodeId) ?? [];

    if (children.length === 0 || !groupIds.has(nodeId)) {
      // Leaf node
      const { width, height } = getNodeDims(node);
      return { id: node.id, width, height };
    }

    // Group node — recurse into children
    return {
      id: node.id,
      layoutOptions: {
        "elk.padding": `[top=${GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
      },
      children: children.map((child) => buildElkNode(child.id)),
      edges: internalEdges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };
  }

  // Build top-level ELK children
  const rootChildren = childrenByParent.get("__root__") ?? [];
  const elkChildren = rootChildren.map((node) => buildElkNode(node.id));

  // All edges go on root with INCLUDE_CHILDREN — ELK resolves hierarchy
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
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    },
    children: elkChildren,
    edges: allElkEdges,
  };

  const root = await elk.layout(graph);

  // Recursively collect positions and sizes from ELK result
  const positions = new Map<string, { x: number; y: number }>();
  const groupSizes = new Map<string, { width: number; height: number }>();

  function collectPositions(elkNodes: ElkNode[]) {
    for (const elkNode of elkNodes) {
      positions.set(elkNode.id, { x: elkNode.x!, y: elkNode.y! });
      if (groupIds.has(elkNode.id)) {
        groupSizes.set(elkNode.id, { width: elkNode.width!, height: elkNode.height! });
      }
      if (elkNode.children) {
        collectPositions(elkNode.children);
      }
    }
  }
  collectPositions(root.children ?? []);

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
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  // Build parent → children map (ALL nodes including nested groups)
  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

  // Results: positions relative to parent, and computed group sizes
  const resultPositions = new Map<string, { x: number; y: number }>();
  const computedSizes = new Map<string, { width: number; height: number }>();

  /**
   * Recursively layout children within a parent (bottom-up).
   * Returns the computed size of this parent's content area.
   */
  function layoutGroup(parentId: string): { width: number; height: number } {
    const children = childrenByParent.get(parentId) ?? [];
    if (children.length === 0) {
      const node = nodeById.get(parentId);
      return node ? getNodeDims(node) : { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
    }

    // First, recursively layout any nested groups so we know their sizes
    for (const child of children) {
      if (child.type === "group") {
        const size = layoutGroup(child.id);
        computedSizes.set(child.id, size);
      }
    }

    // Find edges where both endpoints are direct children of this parent
    const childIds = new Set(children.map((c) => c.id));
    const internalEdges = edges.filter(
      (e) => childIds.has(e.source) && childIds.has(e.target)
    );

    // Layout children with dagre
    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: spacing, ranksep: spacing });

    for (const child of children) {
      const size = child.type === "group"
        ? (computedSizes.get(child.id) ?? getNodeDims(child))
        : getNodeDims(child);
      g.setNode(child.id, { width: size.width, height: size.height });
    }

    // Also add edges that cross from a child to a descendant of another child
    // mapped to the direct child level
    const nodeToDirectChild = new Map<string, string>();
    for (const child of children) {
      nodeToDirectChild.set(child.id, child.id);
      // Map all descendants of this child to this child
      const mapDescendants = (id: string) => {
        const desc = childrenByParent.get(id) ?? [];
        for (const d of desc) {
          nodeToDirectChild.set(d.id, child.id);
          mapDescendants(d.id);
        }
      };
      mapDescendants(child.id);
    }

    const addedEdges = new Set<string>();
    for (const edge of edges) {
      const src = nodeToDirectChild.get(edge.source);
      const tgt = nodeToDirectChild.get(edge.target);
      if (!src || !tgt || src === tgt) continue;
      if (!childIds.has(src) || !childIds.has(tgt)) continue;
      const key = `${src}->${tgt}`;
      if (addedEdges.has(key)) continue;
      addedEdges.add(key);
      g.setEdge(src, tgt);
    }

    for (const edge of internalEdges) {
      const key = `${edge.source}->${edge.target}`;
      if (!addedEdges.has(key)) {
        addedEdges.add(key);
        g.setEdge(edge.source, edge.target);
      }
    }

    dagre.layout(g);

    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const child of children) {
      const { x, y, width, height } = g.node(child.id);
      const left = x - width / 2;
      const top = y - height / 2;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + width);
      maxY = Math.max(maxY, top + height);
    }

    // Store positions relative to parent (with padding offset)
    for (const child of children) {
      const { x, y, width, height } = g.node(child.id);
      resultPositions.set(child.id, {
        x: x - width / 2 - minX + GROUP_PADDING,
        y: y - height / 2 - minY + GROUP_PADDING,
      });
    }

    return {
      width: maxX - minX + GROUP_PADDING * 2,
      height: maxY - minY + GROUP_PADDING * 2,
    };
  }

  // Start from root
  layoutGroup("__root__");

  return nodes.map((node) => {
    const pos = resultPositions.get(node.id);
    if (!pos) return node;
    if (node.type === "group") {
      const size = computedSizes.get(node.id);
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
