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
