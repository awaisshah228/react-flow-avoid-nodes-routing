/**
 * Node collision resolution — pushes overlapping nodes apart iteratively.
 * Based on the algorithm from React Flow's node-collisions example.
 * @see https://reactflow.dev/examples/layout/node-collisions
 */

import type { Node } from "@xyflow/react";

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

function getNodeSize(node: Node): { width: number; height: number } {
  const style = node.style as { width?: number; height?: number } | undefined;
  const w = node.width ?? style?.width ?? node.measured?.width ?? DEFAULT_NODE_WIDTH;
  const h = node.height ?? style?.height ?? node.measured?.height ?? DEFAULT_NODE_HEIGHT;
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

/**
 * Pushes overlapping nodes apart along the axis with smallest overlap.
 * Returns new node array with updated positions (only moved nodes are cloned).
 */
export function resolveCollisions(
  nodes: Node[],
  options: ResolveCollisionsOptions = {}
): Node[] {
  if (nodes.length < 2) return nodes;

  const maxIter = options.maxIterations ?? MAX_ITERATIONS;
  const threshold = options.overlapThreshold ?? OVERLAP_THRESHOLD;
  const margin = options.margin ?? COLLISION_MARGIN;

  const boxes = buildBoxes(nodes, margin);

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

  return boxes.map((box) =>
    box.moved
      ? { ...box.node, position: { x: box.x + margin, y: box.y + margin } }
      : box.node
  );
}

/**
 * Returns true if any two nodes overlap (considering margin).
 */
export function hasOverlap(
  nodes: Node[],
  options: ResolveCollisionsOptions = {}
): boolean {
  if (nodes.length < 2) return false;
  const margin = options.margin ?? COLLISION_MARGIN;
  const threshold = options.overlapThreshold ?? OVERLAP_THRESHOLD;
  const boxes = buildBoxes(nodes, margin);

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i];
      const B = boxes[j];
      const px = (A.width + B.width) * 0.5 - Math.abs(A.x + A.width * 0.5 - B.x - B.width * 0.5);
      const py = (A.height + B.height) * 0.5 - Math.abs(A.y + A.height * 0.5 - B.y - B.height * 0.5);
      if (px > threshold && py > threshold) return true;
    }
  }
  return false;
}
