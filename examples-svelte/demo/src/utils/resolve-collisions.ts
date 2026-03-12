/**
 * Node collision resolution — pushes overlapping nodes apart iteratively.
 * Based on the algorithm from React Flow's node-collisions example.
 * @see https://reactflow.dev/examples/layout/node-collisions
 *
 * Supports arbitrarily nested subflows: resolves innermost siblings first
 * (bottom-up), so parent group sizes are always based on already-resolved
 * child positions.
 */

import type { Node } from "@xyflow/svelte";

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;
const COLLISION_MARGIN = 20;
const MAX_ITERATIONS = 50;
const OVERLAP_THRESHOLD = 0.5;

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  moved: boolean;
  node: Node;
};

// ── Size helpers ─────────────────────────────────────────────────

function parseCssDimension(style: string | undefined, prop: string): number | undefined {
  if (!style) return undefined;
  const match = style.match(new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`));
  return match ? parseFloat(match[1]) : undefined;
}

function getNodeSizeSimple(node: Node): { width: number; height: number } {
  const styleStr = typeof node.style === "string" ? node.style : undefined;
  const w = node.measured?.width ?? node.width ?? parseCssDimension(styleStr, "width") ?? DEFAULT_NODE_WIDTH;
  const h = node.measured?.height ?? node.height ?? parseCssDimension(styleStr, "height") ?? DEFAULT_NODE_HEIGHT;
  return { width: Number(w) || DEFAULT_NODE_WIDTH, height: Number(h) || DEFAULT_NODE_HEIGHT };
}

/**
 * Compute the actual size of a group node from its children, recursively.
 * Works for any nesting depth (subflow inside subflow inside subflow…).
 */
function computeGroupSize(
  nodeId: string,
  childrenByParent: Map<string, Node[]>,
  nodeById: Map<string, Node>
): { width: number; height: number } {
  const children = childrenByParent.get(nodeId);
  if (!children || children.length === 0) {
    const node = nodeById.get(nodeId);
    return node ? getNodeSizeSimple(node) : { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  }

  let maxRight = 0;
  let maxBottom = 0;

  for (const child of children) {
    const childSize = child.type === "group"
      ? computeGroupSize(child.id, childrenByParent, nodeById)
      : getNodeSizeSimple(child);
    const right = child.position.x + childSize.width;
    const bottom = child.position.y + childSize.height;
    if (right > maxRight) maxRight = right;
    if (bottom > maxBottom) maxBottom = bottom;
  }

  // Padding around children inside the group
  const padding = 20;
  return {
    width: maxRight + padding,
    height: maxBottom + padding,
  };
}

function getNodeSize(
  node: Node,
  childrenByParent: Map<string, Node[]>,
  nodeById: Map<string, Node>
): { width: number; height: number } {
  // Prefer measured dimensions (set by Svelte Flow after render)
  if (node.measured?.width && node.measured?.height) {
    return { width: node.measured.width, height: node.measured.height };
  }

  if (node.type === "group") {
    return computeGroupSize(node.id, childrenByParent, nodeById);
  }

  return getNodeSizeSimple(node);
}

function buildBoxes(
  nodes: Node[],
  margin: number,
  childrenByParent: Map<string, Node[]>,
  nodeById: Map<string, Node>
): Box[] {
  return nodes.map((node) => {
    const { width, height } = getNodeSize(node, childrenByParent, nodeById);
    return {
      x: node.position.x - margin,
      y: node.position.y - margin,
      width: width + margin * 2,
      height: height + margin * 2,
      node,
      moved: false,
    };
  });
}

// ── Core resolution ──────────────────────────────────────────────

export interface ResolveCollisionsOptions {
  maxIterations?: number;
  overlapThreshold?: number;
  margin?: number;
}

function resolveBoxes(
  boxes: Box[],
  maxIter: number,
  threshold: number,
): void {
  for (let iter = 0; iter <= maxIter; iter++) {
    let moved = false;

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i];
        const B = boxes[j];

        const cax = A.x + A.width * 0.5;
        const cay = A.y + A.height * 0.5;
        const cbx = B.x + B.width * 0.5;
        const cby = B.y + B.height * 0.5;

        const dx = cax - cbx;
        const dy = cay - cby;

        const px = (A.width + B.width) * 0.5 - Math.abs(dx);
        const py = (A.height + B.height) * 0.5 - Math.abs(dy);

        if (px > threshold && py > threshold) {
          A.moved = B.moved = moved = true;
          if (px < py) {
            const half = (px / 2) * (dx > 0 ? 1 : -1);
            A.x += half;
            B.x -= half;
          } else {
            const half = (py / 2) * (dy > 0 ? 1 : -1);
            A.y += half;
            B.y -= half;
          }
        }
      }
    }

    if (!moved) break;
  }
}

/**
 * Returns the nesting depth of a node (0 for root, 1 for child of root, etc).
 */
function getDepth(nodeId: string | undefined, nodeById: Map<string, Node>): number {
  let depth = 0;
  let current = nodeId ? nodeById.get(nodeId) : undefined;
  while (current?.parentId) {
    depth++;
    current = nodeById.get(current.parentId);
  }
  return depth;
}

/**
 * Pushes overlapping nodes apart along the axis with smallest overlap.
 *
 * Strategy:
 * 1. Group ALL nodes (including groups) by parentId
 * 2. Sort groups by depth (deepest first = bottom-up)
 * 3. Resolve innermost siblings first, update their positions, then
 *    resolve outer siblings — so parent group sizes are always computed
 *    from already-resolved child positions.
 *
 * Supports arbitrarily deep nesting (subflow in subflow in subflow…).
 */
export function resolveCollisions(
  nodes: Node[],
  options: ResolveCollisionsOptions = {}
): Node[] {
  if (nodes.length < 2) return nodes;

  const maxIter = options.maxIterations ?? MAX_ITERATIONS;
  const threshold = options.overlapThreshold ?? OVERLAP_THRESHOLD;
  const margin = options.margin ?? COLLISION_MARGIN;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Build parent → children map
  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

  // Sort parent groups by depth (deepest first) so inner siblings
  // are resolved before outer ones
  const parentKeys = [...childrenByParent.keys()];
  parentKeys.sort((a, b) => {
    const depthA = a === "__root__" ? -1 : getDepth(a, nodeById);
    const depthB = b === "__root__" ? -1 : getDepth(b, nodeById);
    return depthB - depthA; // deepest first
  });

  const movedNodes = new Map<string, { x: number; y: number }>();

  for (const parentKey of parentKeys) {
    const siblings = childrenByParent.get(parentKey)!;
    if (siblings.length < 2) continue;

    const boxes = buildBoxes(siblings, margin, childrenByParent, nodeById);
    resolveBoxes(boxes, maxIter, threshold);

    for (const box of boxes) {
      if (box.moved) {
        const newPos = { x: box.x + margin, y: box.y + margin };
        movedNodes.set(box.node.id, newPos);
        // Update the node's position in-place so that parent group size
        // computations in subsequent (shallower) iterations see the
        // resolved positions
        box.node.position = newPos;
      }
    }
  }

  if (movedNodes.size === 0) return nodes;

  return nodes.map((node) => {
    const pos = movedNodes.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}

/**
 * Returns true if any two sibling nodes overlap (considering margin).
 */
export function hasOverlap(
  nodes: Node[],
  options: ResolveCollisionsOptions = {}
): boolean {
  if (nodes.length < 2) return false;
  const margin = options.margin ?? COLLISION_MARGIN;
  const threshold = options.overlapThreshold ?? OVERLAP_THRESHOLD;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "__root__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(node);
  }

  for (const [, siblings] of childrenByParent) {
    if (siblings.length < 2) continue;
    const boxes = buildBoxes(siblings, margin, childrenByParent, nodeById);

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i];
        const B = boxes[j];
        const px = (A.width + B.width) * 0.5 - Math.abs(A.x + A.width * 0.5 - B.x - B.width * 0.5);
        const py = (A.height + B.height) * 0.5 - Math.abs(A.y + A.height * 0.5 - B.y - B.height * 0.5);
        if (px > threshold && py > threshold) return true;
      }
    }
  }
  return false;
}
