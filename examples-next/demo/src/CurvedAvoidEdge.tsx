/**
 * CurvedAvoidEdge: hybrid edge that uses avoid-nodes routing (waypoints that
 * dodge around nodes) but renders a smooth cubic bezier spline instead of
 * orthogonal segments.
 */
import { memo, useMemo } from "react";
import {
  BaseEdge as RFBaseEdge,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { useAvoidNodesPath } from "avoid-nodes-edge";

interface CurvedAvoidEdgeData extends Record<string, unknown> {
  strokeColor?: string;
  strokeWidth?: number;
  label?: string;
}

/**
 * Parse the orthogonal waypoints from an avoid-nodes SVG path.
 *
 * Path format (with corner radius):
 *   M x y  L x y  Q cx cy ex ey  L x y  Q cx cy ex ey  L x y
 *
 * We want: M endpoint, L endpoints, Q endpoints (skip Q control points).
 * For paths without corner radius: M x y L x y L x y ...
 */
function parseWaypoints(path: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  // Match each command with all its coordinate pairs
  const cmdRegex = /([MLQC])\s*([\d.e+-]+[\s,]+[\d.e+-]+(?:[\s,]+[\d.e+-]+[\s,]+[\d.e+-]+)*)/gi;
  let match;

  while ((match = cmdRegex.exec(path))) {
    const cmd = match[1].toUpperCase();
    const nums = match[2].match(/[\d.e+-]+/g)?.map(Number) ?? [];

    if (cmd === "M" || cmd === "L") {
      // M/L: just one coordinate pair — the endpoint
      if (nums.length >= 2) {
        points.push({ x: nums[0], y: nums[1] });
      }
    } else if (cmd === "Q") {
      // Q cx cy ex ey — skip control point (0,1), take endpoint (2,3)
      if (nums.length >= 4) {
        points.push({ x: nums[2], y: nums[3] });
      }
    } else if (cmd === "C") {
      // C c1x c1y c2x c2y ex ey — skip control points, take endpoint (4,5)
      if (nums.length >= 6) {
        points.push({ x: nums[4], y: nums[5] });
      }
    }
  }

  // Deduplicate consecutive near-identical points
  const deduped: { x: number; y: number }[] = [];
  for (const p of points) {
    const last = deduped[deduped.length - 1];
    if (!last || Math.abs(last.x - p.x) > 1 || Math.abs(last.y - p.y) > 1) {
      deduped.push(p);
    }
  }

  // Remove collinear points (same X or same Y as both neighbors — they're
  // just intermediate points on a straight orthogonal segment)
  if (deduped.length <= 2) return deduped;
  const filtered: { x: number; y: number }[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = deduped[i - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];
    const sameX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
    const sameY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
    if (!sameX && !sameY) {
      // This is a real corner point — keep it
      filtered.push(curr);
    } else if (!sameX || !sameY) {
      // It's a turn — keep it
      filtered.push(curr);
    }
    // else: collinear intermediate point, skip
  }
  filtered.push(deduped[deduped.length - 1]);
  return filtered;
}

/**
 * Convert waypoints to a smooth cubic bezier path using Catmull-Rom → Bezier.
 * Uses adaptive tension: shorter segments get less curvature to prevent
 * overshooting and edge crossings at shared handles.
 */
function waypointsToCurvedPath(
  points: { x: number; y: number }[],
  baseTension: number = 0.2
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Adaptive tension: scale down for short segments to prevent overshooting
    const segLen = dist(p1, p2);
    const tension = segLen < 40 ? baseTension * 0.3
                  : segLen < 80 ? baseTension * 0.6
                  : baseTension;

    // Catmull-Rom to cubic bezier control points
    let cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;
    let cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;

    // Clamp control points: don't let them extend past 40% of the segment
    // This prevents curves from looping back and crossing other edges
    const maxReach = segLen * 0.4;
    const cp1Dist = dist(p1, { x: cp1x, y: cp1y });
    if (cp1Dist > maxReach && cp1Dist > 0) {
      const scale = maxReach / cp1Dist;
      cp1x = p1.x + (cp1x - p1.x) * scale;
      cp1y = p1.y + (cp1y - p1.y) * scale;
    }
    const cp2Dist = dist(p2, { x: cp2x, y: cp2y });
    if (cp2Dist > maxReach && cp2Dist > 0) {
      const scale = maxReach / cp2Dist;
      cp2x = p2.x + (cp2x - p2.x) * scale;
      cp2y = p2.y + (cp2y - p2.y) * scale;
    }

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

function CurvedAvoidEdgeComponent(props: EdgeProps<Edge<CurvedAvoidEdgeData>>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    sourcePosition,
    targetPosition,
    markerEnd,
    markerStart,
  } = props;

  const edgeData = data as CurvedAvoidEdgeData | undefined;
  const [basePath, , , isRouted] = useAvoidNodesPath({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: sourcePosition as "left" | "right" | "top" | "bottom" | undefined,
    targetPosition: targetPosition as "left" | "right" | "top" | "bottom" | undefined,
  });

  const curvedPath = useMemo(() => {
    if (!isRouted) return basePath;
    const waypoints = parseWaypoints(basePath);
    if (waypoints.length < 3) return basePath;
    return waypointsToCurvedPath(waypoints, 0.2);
  }, [basePath, isRouted]);

  const strokeColor = edgeData?.strokeColor ?? "#94a3b8";
  const strokeWidth = edgeData?.strokeWidth ?? 1.5;

  const style = useMemo(
    () => ({ strokeWidth, stroke: strokeColor }),
    [strokeWidth, strokeColor]
  );

  return (
    <RFBaseEdge
      id={id}
      path={curvedPath}
      markerEnd={markerEnd as string}
      markerStart={markerStart as string}
      style={style}
    />
  );
}

export const CurvedAvoidEdge = memo(CurvedAvoidEdgeComponent);
