<script lang="ts">
  /**
   * AvoidNodesEdge — Svelte Flow edge component for orthogonal routing via libavoid-js WASM.
   * Reads routed paths from the avoidRoutes store; falls back to a straight line.
   */
  import { BaseEdge, getSmoothStepPath } from "@xyflow/svelte";
  import { avoidRoutesLoaded, avoidRoutes } from "./store";

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

  $: label = (data?.label as string) ?? "";
  $: strokeColor = (data?.strokeColor as string) ?? "#94a3b8";
  $: strokeWidth = (data?.strokeWidth as number) ?? 1.5;
  $: strokeDasharray = (data?.strokeDasharray as string | undefined) ?? (!loaded || !route ? "6,3" : undefined);

  type Pt = { x: number; y: number };
  const BEND_SIZE = 5;
  function ptDist(a: Pt, b: Pt): number { return Math.hypot(b.x - a.x, b.y - a.y); }

  function buildLinearPath(pts: Pt[]): string {
    if (pts.length < 2) return "";
    let p = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) p += ` L ${pts[i].x} ${pts[i].y}`;
    return p;
  }

  function buildStepPath(pts: Pt[]): string {
    if (pts.length < 2) return "";
    let p = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const bend = Math.min(ptDist(a, b) / 2, ptDist(b, c) / 2, BEND_SIZE);
      if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) {
        p += ` L ${b.x} ${b.y}`;
      } else if (a.y === b.y) {
        const xD = a.x < c.x ? -1 : 1, yD = a.y < c.y ? -1 : 1;
        p += ` L ${b.x + bend * xD} ${b.y} Q ${b.x} ${b.y} ${b.x} ${b.y + bend * -yD}`;
      } else {
        const xD = a.x < c.x ? -1 : 1, yD = a.y < c.y ? -1 : 1;
        p += ` L ${b.x} ${b.y + bend * yD} Q ${b.x} ${b.y} ${b.x + bend * -xD} ${b.y}`;
      }
    }
    p += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return p;
  }

  function buildCatmullRomPath(pts: Pt[]): string {
    if (pts.length < 2) return "";
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    let p = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const b1x = (-p0.x + 6 * p1.x + p2.x) / 6, b1y = (-p0.y + 6 * p1.y + p2.y) / 6;
      const b2x = (p1.x + 6 * p2.x - p3.x) / 6, b2y = (p1.y + 6 * p2.y - p3.y) / 6;
      p += ` C ${b1x} ${b1y}, ${b2x} ${b2y}, ${p2.x} ${p2.y}`;
    }
    return p;
  }

  function buildBezierCatmullRomPath(pts: Pt[], baseTension = 0.2): string {
    if (pts.length < 2) return "";
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    const deduped: Pt[] = [];
    for (const q of pts) { const l = deduped[deduped.length - 1]; if (!l || Math.abs(l.x - q.x) > 1 || Math.abs(l.y - q.y) > 1) deduped.push(q); }
    let clean: Pt[];
    if (deduped.length <= 2) { clean = deduped; } else {
      clean = [deduped[0]];
      for (let i = 1; i < deduped.length - 1; i++) {
        const pr = deduped[i - 1], cu = deduped[i], nx = deduped[i + 1];
        if (!(Math.abs(pr.x - cu.x) < 1 && Math.abs(cu.x - nx.x) < 1) || !(Math.abs(pr.y - cu.y) < 1 && Math.abs(cu.y - nx.y) < 1)) clean.push(cu);
      }
      clean.push(deduped[deduped.length - 1]);
    }
    if (clean.length < 2) return clean.length === 1 ? `M ${clean[0].x} ${clean[0].y}` : "";
    if (clean.length === 2) return `M ${clean[0].x} ${clean[0].y} L ${clean[1].x} ${clean[1].y}`;
    let p = `M ${clean[0].x} ${clean[0].y}`;
    for (let i = 0; i < clean.length - 1; i++) {
      const p0 = clean[Math.max(0, i - 1)], p1 = clean[i], p2 = clean[i + 1], p3 = clean[Math.min(clean.length - 1, i + 2)];
      const segLen = ptDist(p1, p2);
      const t = segLen < 40 ? baseTension * 0.3 : segLen < 80 ? baseTension * 0.6 : baseTension;
      let c1x = p1.x + (p2.x - p0.x) * t, c1y = p1.y + (p2.y - p0.y) * t;
      let c2x = p2.x - (p3.x - p1.x) * t, c2y = p2.y - (p3.y - p1.y) * t;
      const mr = segLen * 0.4;
      const d1 = ptDist(p1, { x: c1x, y: c1y }); if (d1 > mr && d1 > 0) { const s = mr / d1; c1x = p1.x + (c1x - p1.x) * s; c1y = p1.y + (c1y - p1.y) * s; }
      const d2 = ptDist(p2, { x: c2x, y: c2y }); if (d2 > mr && d2 > 0) { const s = mr / d2; c2x = p2.x + (c2x - p2.x) * s; c2y = p2.y + (c2y - p2.y) * s; }
      p += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return p;
  }

  function buildPolylinePath(pts: Pt[]): string {
    if (pts.length < 2) return "";
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    let p = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const dAB = ptDist(a, b);
      const dBC = ptDist(b, c);
      const bend = Math.min(dAB / 2, dBC / 2, BEND_SIZE);
      if (bend < 0.5) { p += ` L ${b.x} ${b.y}`; continue; }
      const t1 = bend / dAB;
      const qx1 = b.x + (a.x - b.x) * t1, qy1 = b.y + (a.y - b.y) * t1;
      const t2 = bend / dBC;
      const qx2 = b.x + (c.x - b.x) * t2, qy2 = b.y + (c.y - b.y) * t2;
      p += ` L ${qx1} ${qy1} Q ${b.x} ${b.y} ${qx2} ${qy2}`;
    }
    p += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return p;
  }

  function buildPath(pts: Pt[], type: string): string {
    switch (type) {
      case "linear": return buildLinearPath(pts);
      case "catmull-rom": return buildCatmullRomPath(pts);
      case "bezier-catmull-rom": case "bezier": return buildBezierCatmullRomPath(pts);
      case "polyline": return buildPolylinePath(pts);
      default: return buildStepPath(pts);
    }
  }

  $: connType = (route?.connectorType as string) ?? (data?.connectorType as string) ?? "orthogonal";
  $: routePoints = loaded && route?.points;
  $: edgePath = loaded && route
    ? (routePoints && routePoints.length >= 2 ? buildPath(routePoints, connType) : route.path)
    : fallback[0];

  $: labelX = loaded && route ? route.labelX : fallback[1];
  $: labelY = loaded && route ? route.labelY : fallback[2];

  $: edgeStyle = `stroke: ${strokeColor}; stroke-width: ${strokeWidth};${strokeDasharray ? ` stroke-dasharray: ${strokeDasharray};` : ""}${style ? ` ${style}` : ""}`;
</script>

<BaseEdge
  {id}
  path={edgePath}
  {markerEnd}
  {markerStart}
  style={edgeStyle}
/>

{#if label}
  <div
    class="nodrag nopan"
    style="
      position: absolute;
      transform: translate(-50%, -50%) translate({labelX}px, {labelY}px);
      pointer-events: all;
      z-index: 10;
      background: white;
      padding: 2px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #e2e8f0;
      color: #475569;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    "
  >
    {label}
  </div>
{/if}
