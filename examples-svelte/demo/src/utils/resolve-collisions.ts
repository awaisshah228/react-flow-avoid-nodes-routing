/**
 * Node collision resolution — pushes overlapping nodes apart iteratively.
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

function parseCssDimension(style: string | undefined, prop: string): number | undefined {
  if (!style) return undefined;
  const match = style.match(new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`));
  return match ? parseFloat(match[1]) : undefined;
}

function getNodeSize(node: Node): { width: number; height: number } {
  const styleStr = typeof node.style === "string" ? node.style : undefined;
  const w = node.width ?? parseCssDimension(styleStr, "width") ?? node.measured?.width ?? DEFAULT_NODE_WIDTH;
  const h = node.height ?? parseCssDimension(styleStr, "height") ?? node.measured?.height ?? DEFAULT_NODE_HEIGHT;
  return { width: Number(w) || DEFAULT_NODE_WIDTH, height: Number(h) || DEFAULT_NODE_HEIGHT };
}

function buildBoxes(nodes: Node[], margin: number): Box[] {
  return nodes.map((node) => {
    const { width, height } = getNodeSize(node);
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

export interface ResolveCollisionsOptions {
  maxIterations?: number;
  overlapThreshold?: number;
  margin?: number;
}

function isAncestor(ancestorId: string, nodeId: string, nodeById: Map<string, Node>): boolean {
  let current = nodeById.get(nodeId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = nodeById.get(current.parentId);
  }
  return false;
}

function areRelated(a: Node, b: Node, nodeById: Map<string, Node>): boolean {
  return isAncestor(a.id, b.id, nodeById) || isAncestor(b.id, a.id, nodeById);
}

export function resolveCollisions(
  nodes: Node[],
  options: ResolveCollisionsOptions = {}
): Node[] {
  if (nodes.length < 2) return nodes;

  const maxIter = options.maxIterations ?? MAX_ITERATIONS;
  const threshold = options.overlapThreshold ?? OVERLAP_THRESHOLD;
  const margin = options.margin ?? COLLISION_MARGIN;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const siblingGroups = new Map<string, Node[]>();
  for (const node of nodes) {
    if (node.type === "group") continue;
    const key = node.parentId ?? "__root__";
    if (!siblingGroups.has(key)) siblingGroups.set(key, []);
    siblingGroups.get(key)!.push(node);
  }

  const rootNodes = nodes.filter((n) => !n.parentId);
  const movedNodes = new Map<string, { x: number; y: number }>();

  for (const [, siblings] of siblingGroups) {
    if (siblings.length < 2) continue;
    const boxes = buildBoxes(siblings, margin);

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

    for (const box of boxes) {
      if (box.moved) {
        movedNodes.set(box.node.id, { x: box.x + margin, y: box.y + margin });
      }
    }
  }

  if (rootNodes.length >= 2) {
    const boxes = buildBoxes(rootNodes, margin);

    for (let iter = 0; iter <= maxIter; iter++) {
      let moved = false;

      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i];
          const B = boxes[j];

          if (areRelated(A.node, B.node, nodeById)) continue;

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

    for (const box of boxes) {
      if (box.moved) {
        movedNodes.set(box.node.id, { x: box.x + margin, y: box.y + margin });
      }
    }
  }

  if (movedNodes.size === 0) return nodes;

  return nodes.map((node) => {
    const pos = movedNodes.get(node.id);
    return pos ? { ...node, position: pos } : node;
  });
}
