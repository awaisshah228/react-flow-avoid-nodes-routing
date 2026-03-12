<script lang="ts">
  /**
   * CurvedAvoidEdge — hybrid edge that uses avoid-nodes routing (waypoints
   * that dodge around nodes) but renders a smooth cubic bezier spline.
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

  // ── Parse orthogonal waypoints from SVG path ──
  function parseWaypoints(path: string): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const cmdRegex = /([MLQC])\s*([\d.e+-]+[\s,]+[\d.e+-]+(?:[\s,]+[\d.e+-]+[\s,]+[\d.e+-]+)*)/gi;
    let match;

    while ((match = cmdRegex.exec(path))) {
      const cmd = match[1].toUpperCase();
      const nums = match[2].match(/[\d.e+-]+/g)?.map(Number) ?? [];

      if (cmd === "M" || cmd === "L") {
        if (nums.length >= 2) points.push({ x: nums[0], y: nums[1] });
      } else if (cmd === "Q") {
        if (nums.length >= 4) points.push({ x: nums[2], y: nums[3] });
      } else if (cmd === "C") {
        if (nums.length >= 6) points.push({ x: nums[4], y: nums[5] });
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

    // Remove collinear points
    if (deduped.length <= 2) return deduped;
    const filtered: { x: number; y: number }[] = [deduped[0]];
    for (let i = 1; i < deduped.length - 1; i++) {
      const prev = deduped[i - 1];
      const curr = deduped[i];
      const next = deduped[i + 1];
      const sameX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
      const sameY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
      if (!sameX && !sameY) {
        filtered.push(curr);
      } else if (!sameX || !sameY) {
        filtered.push(curr);
      }
    }
    filtered.push(deduped[deduped.length - 1]);
    return filtered;
  }

  // ── Convert waypoints to smooth cubic bezier path ──
  function waypointsToCurvedPath(points: { x: number; y: number }[], baseTension = 0.2): string {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(b.x - a.x, b.y - a.y);

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const segLen = dist(p1, p2);
      const tension = segLen < 40 ? baseTension * 0.3
                    : segLen < 80 ? baseTension * 0.6
                    : baseTension;

      let cp1x = p1.x + (p2.x - p0.x) * tension;
      let cp1y = p1.y + (p2.y - p0.y) * tension;
      let cp2x = p2.x - (p3.x - p1.x) * tension;
      let cp2y = p2.y - (p3.y - p1.y) * tension;

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

  $: strokeColor = (data?.strokeColor as string) ?? "#94a3b8";
  $: strokeWidth = (data?.strokeWidth as number) ?? 1.5;
  $: strokeDasharray = !loaded || !route ? "6,3" : undefined;

  $: basePath = loaded && route ? route.path : fallback[0];
  $: isRouted = loaded && !!route;

  $: edgePath = (() => {
    if (!isRouted) return basePath;
    const waypoints = parseWaypoints(basePath);
    if (waypoints.length < 3) return basePath;
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
