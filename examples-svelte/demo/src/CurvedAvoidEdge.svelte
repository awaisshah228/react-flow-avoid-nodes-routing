<script lang="ts">
  /**
   * CurvedAvoidEdge — hybrid edge that uses avoid-nodes routing (waypoints
   * that dodge around nodes) but renders a smooth cubic bezier spline.
   *
   * Uses route.points (raw waypoints) directly from the store, matching
   * how AvoidNodesEdge works, instead of re-parsing the SVG path string.
   */
  import { BaseEdge, getSmoothStepPath } from "@xyflow/svelte";
  import { avoidRoutesLoaded, avoidRoutes } from "avoid-nodes-edge-svelte";

  export let id: string;
  export let sourceX: number;
  export let sourceY: number;
  export let sourcePosition: string | undefined = undefined;
  export let targetX: number;
  export let targetY: number;
  export let targetPosition: string | undefined = undefined;
  export let markerEnd: string | undefined = undefined;
  export let markerStart: string | undefined = undefined;
  export let style: string | undefined = undefined;
  export let data: Record<string, unknown> | undefined = undefined;

  $: route = $avoidRoutes[id];
  $: loaded = $avoidRoutesLoaded;

  $: fallback = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: (sourcePosition as any) ?? "bottom",
    targetX,
    targetY,
    targetPosition: (targetPosition as any) ?? "top",
  });

  type Pt = { x: number; y: number };

  function ptDist(a: Pt, b: Pt): number { return Math.hypot(b.x - a.x, b.y - a.y); }

  // ── Deduplicate & remove collinear intermediate points from raw waypoints ──
  function cleanWaypoints(raw: Pt[]): Pt[] {
    // Deduplicate consecutive near-identical points
    const deduped: Pt[] = [];
    for (const p of raw) {
      const last = deduped[deduped.length - 1];
      if (!last || Math.abs(last.x - p.x) > 1 || Math.abs(last.y - p.y) > 1) {
        deduped.push(p);
      }
    }

    // Remove collinear points
    if (deduped.length <= 2) return deduped;
    const filtered: Pt[] = [deduped[0]];
    for (let i = 1; i < deduped.length - 1; i++) {
      const prev = deduped[i - 1];
      const curr = deduped[i];
      const next = deduped[i + 1];
      const sameX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
      const sameY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
      if (!sameX || !sameY) {
        filtered.push(curr);
      }
    }
    filtered.push(deduped[deduped.length - 1]);
    return filtered;
  }

  // ── Convert waypoints to smooth cubic bezier path ──
  function waypointsToCurvedPath(points: Pt[], baseTension = 0.2): string {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const segLen = ptDist(p1, p2);
      const tension = segLen < 40 ? baseTension * 0.3
                    : segLen < 80 ? baseTension * 0.6
                    : baseTension;

      let cp1x = p1.x + (p2.x - p0.x) * tension;
      let cp1y = p1.y + (p2.y - p0.y) * tension;
      let cp2x = p2.x - (p3.x - p1.x) * tension;
      let cp2y = p2.y - (p3.y - p1.y) * tension;

      const maxReach = segLen * 0.4;
      const cp1Dist = ptDist(p1, { x: cp1x, y: cp1y });
      if (cp1Dist > maxReach && cp1Dist > 0) {
        const scale = maxReach / cp1Dist;
        cp1x = p1.x + (cp1x - p1.x) * scale;
        cp1y = p1.y + (cp1y - p1.y) * scale;
      }
      const cp2Dist = ptDist(p2, { x: cp2x, y: cp2y });
      if (cp2Dist > maxReach && cp2Dist > 0) {
        const scale = maxReach / cp2Dist;
        cp2x = p2.x + (cp2x - p2.x) * scale;
        cp2y = p2.y + (cp2y - p2.y) * scale;
      }

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return d;
  }

  $: strokeColor = (data?.strokeColor as string) ?? "#94a3b8";
  $: strokeWidth = (data?.strokeWidth as number) ?? 1.5;
  $: strokeDasharray = !loaded || !route ? "6,3" : undefined;

  $: isRouted = loaded && !!route;
  $: routePoints = isRouted ? route.points : undefined;

  $: edgePath = (() => {
    if (!isRouted || !routePoints || routePoints.length < 2) return fallback[0];
    const waypoints = cleanWaypoints(routePoints);
    if (waypoints.length < 2) return route.path;
    // Snap first/last waypoints to actual SvelteFlow handle positions
    // to eliminate gaps from router vs rendered dimension mismatches
    waypoints[0] = { x: sourceX, y: sourceY };
    waypoints[waypoints.length - 1] = { x: targetX, y: targetY };
    if (waypoints.length < 3) {
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }
    return waypointsToCurvedPath(waypoints, 0.2);
  })();

  $: edgeStyle = `stroke: ${strokeColor}; stroke-width: ${strokeWidth};${strokeDasharray ? ` stroke-dasharray: ${strokeDasharray};` : ""}${style ? ` ${style}` : ""}`;
</script>

<BaseEdge
  {id}
  path={edgePath}
  {markerEnd}
  {markerStart}
  style={edgeStyle}
/>
