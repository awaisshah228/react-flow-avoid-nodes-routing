/**
 * Pure routing functions shared between AvoidRouter (main thread) and the Web Worker.
 * No WASM loading, no singleton, no side-effects — just computation.
 */

// ---- Types ----

export type AvoidRoute = { path: string; labelX: number; labelY: number; points?: { x: number; y: number }[]; connectorType?: ConnectorType };

export type ConnectorType = "orthogonal" | "bezier" | "polyline" | "step" | "linear" | "catmull-rom" | "bezier-catmull-rom";

export type AvoidRouterOptions = {
  shapeBufferDistance?: number;
  idealNudgingDistance?: number;
  handleNudgingDistance?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
  autoBestSideConnection?: boolean;
  debounceMs?: number;
  /** Edge path style: "orthogonal" (default), "bezier" (smooth curved), or "polyline" (sharp corners). */
  connectorType?: ConnectorType;
};

export type HandlePosition = "left" | "right" | "top" | "bottom";

export type FlowNode = {
  id: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
  style?: { width?: number; height?: number };
  type?: string;
  parentId?: string;
  sourcePosition?: string;
  targetPosition?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  [key: string]: unknown;
};

// ---- libavoid-js 0.5.0 typed interfaces ----

export type AvoidRouter = {
  setRoutingParameter: (p: number, v: number) => void;
  setRoutingOption: (o: number, v: boolean) => void;
  processTransaction: () => void;
  deleteConnector: (c: unknown) => void;
  deleteShape: (s: unknown) => void;
  moveShape_delta: (shape: unknown, xDiff: number, yDiff: number) => void;
  moveShape_poly: (shape: unknown, newPolygon: unknown) => void;
  delete: () => void;
};

export type AvoidConnRef = {
  setRoutingType: (t: number) => void;
  setSourceEndpoint: (connEnd: unknown) => void;
  setDestEndpoint: (connEnd: unknown) => void;
  displayRoute: () => { size: () => number; at: (i: number) => { x: number; y: number } };
};

export type AvoidLibInstance = {
  Router: new (flags: number) => AvoidRouter;
  Point: new (x: number, y: number) => { x: number; y: number };
  Rectangle: new (a: unknown, b: unknown) => unknown;
  ShapeRef: new (router: AvoidRouter, poly: unknown) => unknown;
  ShapeConnectionPin: new (
    shapeRef: unknown,
    classId: number,
    xProportion: number,
    yProportion: number,
    proportional: boolean,
    insideOffset: number,
    directions: number
  ) => { setExclusive: (exclusive: boolean) => void; delete: () => void };
  ConnEnd: new (shapeRefOrPoint: unknown, pinClassId?: number) => unknown;
  ConnRef: new (router: AvoidRouter, src?: unknown, dst?: unknown) => AvoidConnRef;
  // 0.5.0+ enum-based access
  RouterFlag?: { OrthogonalRouting: number; PolyLineRouting: number };
  ConnType?: { ConnType_Orthogonal: number; ConnType_PolyLine: number; ConnType_None: number };
  RoutingParameter?: { shapeBufferDistance: number; idealNudgingDistance: number };
  RoutingOption?: { nudgeOrthogonalSegmentsConnectedToShapes: number; nudgeSharedPathsWithCommonEndPoint: number; performUnifyingNudgingPreprocessingStep: number };
  // Legacy direct access (0.4.x)
  OrthogonalRouting?: number;
  PolyLineRouting?: number;
  ConnType_Orthogonal?: number;
  ConnType_PolyLine?: number;
  ConnDirUp?: number;
  ConnDirDown?: number;
  ConnDirLeft?: number;
  ConnDirRight?: number;
  ConnDirAll?: number;
  shapeBufferDistance?: number;
  idealNudgingDistance?: number;
  nudgeOrthogonalSegmentsConnectedToShapes?: number;
  nudgeSharedPathsWithCommonEndPoint?: number;
  performUnifyingNudgingPreprocessingStep?: number;
  // Catch-all for any other properties
  [key: string]: unknown;
};

/**
 * Unwrap a value that may be an emscripten enum wrapper ({ value: N }) or a plain number.
 */
function toNum(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  if (v == null) return fallback;
  if (typeof v === "object" && "value" in v && typeof (v as { value: unknown }).value === "number") {
    return (v as { value: number }).value;
  }
  return fallback;
}

/**
 * Resolve a constant: prefer enum-based access (0.5.0+), then legacy direct access (0.4.x), then fallback.
 * Returns the RAW value (may be an enum object) — pass directly to libavoid methods that expect enum types.
 */
function raw(enumObj: Record<string, unknown> | undefined, key: string, legacyValue: unknown, fallback: number): unknown {
  return enumObj?.[key] ?? legacyValue ?? fallback;
}

/**
 * Helper to resolve libavoid constants across versions.
 *
 * Returns both raw values (for passing to methods that expect enum types like
 * setRoutingParameter/setRoutingOption/setRoutingType) and numeric values
 * (for Router constructor flags and ShapeConnectionPin directions).
 *
 * Fallback values from libavoid C++ source:
 *   RouterFlag:      PolyLineRouting=1, OrthogonalRouting=2
 *   ConnType:        None=0, PolyLine=1, Orthogonal=2
 *   RoutingParam:    shapeBufferDistance=6, idealNudgingDistance=7
 *   RoutingOption:   nudgeOrthSegConnToShapes=0, performUnifyingNudge=4, nudgeSharedPaths=6
 *   ConnDirFlag:     Up=1, Down=2, Left=4, Right=8, All=15
 */
export function c(Avoid: AvoidLibInstance) {
  const rf = Avoid.RouterFlag as Record<string, unknown> | undefined;
  const ct = Avoid.ConnType as Record<string, unknown> | undefined;
  const rp = Avoid.RoutingParameter as Record<string, unknown> | undefined;
  const ro = Avoid.RoutingOption as Record<string, unknown> | undefined;

  // Raw enum values — pass to setRoutingParameter/setRoutingOption/setRoutingType
  const rawShapeBuffer = raw(rp, "shapeBufferDistance", Avoid.shapeBufferDistance, 6);
  const rawIdealNudging = raw(rp, "idealNudgingDistance", Avoid.idealNudgingDistance, 7);
  const rawNudgeOrth = raw(ro, "nudgeOrthogonalSegmentsConnectedToShapes", Avoid.nudgeOrthogonalSegmentsConnectedToShapes, 0);
  const rawNudgeShared = raw(ro, "nudgeSharedPathsWithCommonEndPoint", Avoid.nudgeSharedPathsWithCommonEndPoint, 6);
  const rawPerformUnify = raw(ro, "performUnifyingNudgingPreprocessingStep", Avoid.performUnifyingNudgingPreprocessingStep, 4);
  const rawConnTypeOrth = raw(ct, "ConnType_Orthogonal", Avoid.ConnType_Orthogonal, 2);
  const rawConnTypePoly = raw(ct, "ConnType_PolyLine", Avoid.ConnType_PolyLine, 1);

  return {
    // Numeric values — for Router constructor (takes unsigned int) and pin directions
    OrthogonalRouting: toNum(rf?.OrthogonalRouting ?? Avoid.OrthogonalRouting, 2),
    PolyLineRouting: toNum(rf?.PolyLineRouting ?? Avoid.PolyLineRouting, 1),
    ConnDirUp: toNum(Avoid.ConnDirUp, 1),
    ConnDirDown: toNum(Avoid.ConnDirDown, 2),
    ConnDirLeft: toNum(Avoid.ConnDirLeft, 4),
    ConnDirRight: toNum(Avoid.ConnDirRight, 8),
    ConnDirAll: toNum(Avoid.ConnDirAll, 15),

    // Raw enum values — pass directly to setRoutingParameter/setRoutingOption/setRoutingType
    // These may be enum objects in 0.5.0+ or plain numbers in 0.4.x
    shapeBufferDistance: rawShapeBuffer as number,
    idealNudgingDistance: rawIdealNudging as number,
    nudgeOrthogonalSegmentsConnectedToShapes: rawNudgeOrth as number,
    nudgeSharedPathsWithCommonEndPoint: rawNudgeShared as number,
    performUnifyingNudgingPreprocessingStep: rawPerformUnify as number,
    ConnType_Orthogonal: rawConnTypeOrth as number,
    ConnType_PolyLine: rawConnTypePoly as number,
  };
}

// ---- Shared pin constants ----

export const PIN_CENTER = 1;
export const PIN_TOP = 2;
export const PIN_BOTTOM = 3;
export const PIN_LEFT = 4;
export const PIN_RIGHT = 5;
export const ALL_PIN_IDS = [PIN_CENTER, PIN_TOP, PIN_BOTTOM, PIN_LEFT, PIN_RIGHT] as const;

export const pinIdForPosition: Record<HandlePosition, number> = {
  top: PIN_TOP,
  bottom: PIN_BOTTOM,
  left: PIN_LEFT,
  right: PIN_RIGHT,
};

/** Returns pin proportions map — depends on Avoid runtime constants so must be called with instance. */
export function getPinProportions(Avoid: AvoidLibInstance): Record<number, { x: number; y: number; dir: number }> {
  const k = c(Avoid);
  return {
    [PIN_CENTER]: { x: 0.5, y: 0.5, dir: k.ConnDirAll },
    [PIN_TOP]: { x: 0.5, y: 0, dir: k.ConnDirUp },
    [PIN_BOTTOM]: { x: 0.5, y: 1, dir: k.ConnDirDown },
    [PIN_LEFT]: { x: 0, y: 0.5, dir: k.ConnDirLeft },
    [PIN_RIGHT]: { x: 1, y: 0.5, dir: k.ConnDirRight },
  };
}

// ---- WASM Loading ----

export const LIBAVOID_WASM_URL = "/libavoid.wasm";
export const WASM_RETRY_DELAY_MS = 2000;
export const WASM_MAX_RETRIES = 5;

export async function loadWasm(
  wasmUrl: string = LIBAVOID_WASM_URL
): Promise<AvoidLibInstance | null> {
  const origin = (globalThis as unknown as { location?: { origin?: string } }).location?.origin;
  const absoluteUrl = origin && wasmUrl.startsWith("/") ? `${origin}${wasmUrl}` : wasmUrl;
  try {
    const mod = (await import("libavoid-js")) as unknown as {
      default?: { load?: (filePath?: string) => Promise<void>; getInstance?: () => AvoidLibInstance };
      AvoidLib?: { load?: (filePath?: string) => Promise<void>; getInstance?: () => AvoidLibInstance };
    };
    const AvoidLib = mod.AvoidLib ?? mod.default;
    if (!AvoidLib?.load) return null;
    await AvoidLib.load(absoluteUrl);
    return AvoidLib.getInstance?.() ?? null;
  } catch {
    return null;
  }
}

export async function loadWasmWithRetry(
  wasmUrl: string = LIBAVOID_WASM_URL
): Promise<AvoidLibInstance | null> {
  for (let attempt = 1; attempt <= WASM_MAX_RETRIES; attempt++) {
    const lib = await loadWasm(wasmUrl);
    if (lib != null) return lib;
    if (attempt < WASM_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, WASM_RETRY_DELAY_MS));
    }
  }
  return null;
}

// ---- Geometry helpers ----

export function getNodeBounds(node: FlowNode): { x: number; y: number; w: number; h: number } {
  const x = node.position?.x ?? 0;
  const y = node.position?.y ?? 0;
  const w = Number((node.measured?.width ?? node.width ?? (node.style as { width?: number })?.width) ?? 150);
  const h = Number((node.measured?.height ?? node.height ?? (node.style as { height?: number })?.height) ?? 50);
  return { x, y, w, h };
}

export function getNodeBoundsAbsolute(
  node: FlowNode,
  nodeById: Map<string, FlowNode>
): { x: number; y: number; w: number; h: number } {
  const b = getNodeBounds(node);
  let current: FlowNode | undefined = node;
  while (current?.parentId) {
    const parent = nodeById.get(current.parentId);
    if (!parent) break;
    b.x += parent.position?.x ?? 0;
    b.y += parent.position?.y ?? 0;
    current = parent;
  }
  return b;
}

export function getHandlePosition(node: FlowNode, kind: "source" | "target"): HandlePosition {
  const raw =
    kind === "source"
      ? (node.sourcePosition as string | undefined) ?? (node as { data?: { sourcePosition?: string } }).data?.sourcePosition
      : (node.targetPosition as string | undefined) ?? (node as { data?: { targetPosition?: string } }).data?.targetPosition;
  const s = String(raw ?? "").toLowerCase();
  if (s === "left" || s === "right" || s === "top" || s === "bottom") return s;
  return kind === "source" ? "right" : "left";
}

export function getHandlePoint(
  bounds: { x: number; y: number; w: number; h: number },
  position: HandlePosition
): { x: number; y: number } {
  const { x, y, w, h } = bounds;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (position) {
    case "left": return { x, y: cy };
    case "right": return { x: x + w, y: cy };
    case "top": return { x: cx, y };
    case "bottom": return { x: cx, y: y + h };
    default: return { x: x + w, y: cy };
  }
}

export function snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
  if (gridSize <= 0) return { x, y };
  return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
}

export function getBestSides(
  srcBounds: { x: number; y: number; w: number; h: number },
  tgtBounds: { x: number; y: number; w: number; h: number }
): { sourcePos: HandlePosition; targetPos: HandlePosition } {
  const srcCx = srcBounds.x + srcBounds.w / 2;
  const srcCy = srcBounds.y + srcBounds.h / 2;
  const tgtCx = tgtBounds.x + tgtBounds.w / 2;
  const tgtCy = tgtBounds.y + tgtBounds.h / 2;
  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourcePos: "right", targetPos: "left" }
      : { sourcePos: "left", targetPos: "right" };
  } else {
    return dy >= 0
      ? { sourcePos: "bottom", targetPos: "top" }
      : { sourcePos: "top", targetPos: "bottom" };
  }
}

// ---- SVG Path ----

export function polylineToPath(
  size: number,
  getPoint: (i: number) => { x: number; y: number },
  options: { gridSize?: number; cornerRadius?: number } = {}
): string {
  if (size < 2) return "";
  const gridSize = options.gridSize ?? 0;
  const r = Math.max(0, options.cornerRadius ?? 0);
  const pt = (i: number) => {
    const p = getPoint(i);
    return gridSize > 0 ? snapToGrid(p.x, p.y, gridSize) : p;
  };
  if (r <= 0) {
    let d = `M ${pt(0).x} ${pt(0).y}`;
    for (let i = 1; i < size; i++) {
      const p = pt(i);
      d += ` L ${p.x} ${p.y}`;
    }
    return d;
  }
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);
  const unit = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const d = dist(a, b);
    if (d < 1e-6) return { x: 0, y: 0 };
    return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
  };
  let d = `M ${pt(0).x} ${pt(0).y}`;
  for (let i = 1; i < size - 1; i++) {
    const prev = pt(i - 1);
    const curr = pt(i);
    const next = pt(i + 1);
    const dirIn = unit(curr, prev);
    const dirOut = unit(curr, next);
    const lenIn = dist(curr, prev);
    const lenOut = dist(curr, next);
    const rIn = Math.min(r, lenIn / 2, lenOut / 2);
    const rOut = Math.min(r, lenIn / 2, lenOut / 2);
    const endPrev = { x: curr.x + dirIn.x * rIn, y: curr.y + dirIn.y * rIn };
    const startNext = { x: curr.x + dirOut.x * rOut, y: curr.y + dirOut.y * rOut };
    d += ` L ${endPrev.x} ${endPrev.y} Q ${curr.x} ${curr.y} ${startNext.x} ${startNext.y}`;
  }
  const last = pt(size - 1);
  d += ` L ${last.x} ${last.y}`;
  return d;
}

// ---- Bezier path from waypoints ----

/**
 * Convert orthogonal waypoints to a smooth cubic Bezier spline using
 * Catmull-Rom → Bezier conversion with adaptive tension.
 *
 * Steps:
 * 1. Deduplicate and remove collinear intermediate points (keep corners only).
 * 2. For each segment, compute control points from neighboring points.
 * 3. Clamp control-point reach to prevent overshooting / edge crossings.
 */
export function polylineToBezierPath(
  size: number,
  getPoint: (i: number) => { x: number; y: number },
  options: { gridSize?: number; baseTension?: number } = {}
): string {
  if (size < 2) return "";
  const gridSize = options.gridSize ?? 0;
  const baseTension = options.baseTension ?? 0.2;

  const pt = (i: number) => {
    const p = getPoint(i);
    return gridSize > 0 ? snapToGrid(p.x, p.y, gridSize) : p;
  };

  // Collect raw points
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < size; i++) raw.push(pt(i));

  // Deduplicate near-identical consecutive points
  const deduped: { x: number; y: number }[] = [];
  for (const p of raw) {
    const last = deduped[deduped.length - 1];
    if (!last || Math.abs(last.x - p.x) > 1 || Math.abs(last.y - p.y) > 1) {
      deduped.push(p);
    }
  }

  // Remove collinear intermediate points (straight segments)
  let points: { x: number; y: number }[];
  if (deduped.length <= 2) {
    points = deduped;
  } else {
    points = [deduped[0]];
    for (let i = 1; i < deduped.length - 1; i++) {
      const prev = deduped[i - 1];
      const curr = deduped[i];
      const next = deduped[i + 1];
      const sameX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
      const sameY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
      if (!sameX || !sameY) points.push(curr);
    }
    points.push(deduped[deduped.length - 1]);
  }

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

    // Adaptive tension: shorter segments get less curvature
    const segLen = dist(p1, p2);
    const tension =
      segLen < 40 ? baseTension * 0.3 :
      segLen < 80 ? baseTension * 0.6 :
      baseTension;

    // Catmull-Rom to cubic bezier control points
    let cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;
    let cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;

    // Clamp: don't let control points extend past 40% of segment length
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

// ---- Handle spacing adjustment ----

export function adjustHandleSpacing(
  edges: FlowEdge[],
  edgePoints: Map<string, { x: number; y: number }[]>,
  handleNudging: number,
  idealNudging: number
): void {
  const ratio = handleNudging / idealNudging;

  const bySource = new Map<string, string[]>();
  const byTarget = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edgePoints.has(edge.id)) continue;
    if (!bySource.has(edge.source)) bySource.set(edge.source, []);
    bySource.get(edge.source)!.push(edge.id);
    if (!byTarget.has(edge.target)) byTarget.set(edge.target, []);
    byTarget.get(edge.target)!.push(edge.id);
  }

  for (const [, edgeIds] of bySource) {
    if (edgeIds.length < 2) continue;
    rescaleNearHandle(edgeIds, edgePoints, "source", ratio);
  }

  for (const [, edgeIds] of byTarget) {
    if (edgeIds.length < 2) continue;
    rescaleNearHandle(edgeIds, edgePoints, "target", ratio);
  }
}

function rescaleNearHandle(
  edgeIds: string[],
  edgePoints: Map<string, { x: number; y: number }[]>,
  end: "source" | "target",
  ratio: number
): void {
  const positions: { edgeId: string; pt: { x: number; y: number } }[] = [];
  for (const edgeId of edgeIds) {
    const pts = edgePoints.get(edgeId);
    if (!pts || pts.length < 2) continue;
    const idx = end === "source" ? 0 : pts.length - 1;
    positions.push({ edgeId, pt: pts[idx] });
  }
  if (positions.length < 2) return;

  const firstPts = edgePoints.get(positions[0].edgeId)!;
  const segStart = end === "source" ? 0 : firstPts.length - 2;
  const p0 = firstPts[segStart];
  const p1 = firstPts[segStart + 1];
  const isHorizontal = Math.abs(p1.x - p0.x) > Math.abs(p1.y - p0.y);
  const axis = isHorizontal ? "y" : "x";

  const values = positions.map((p) => p.pt[axis]);
  const center = values.reduce((a, b) => a + b, 0) / values.length;

  for (const edgeId of edgeIds) {
    const pts = edgePoints.get(edgeId);
    if (!pts || pts.length < 2) continue;
    const indices = end === "source" ? [0, 1] : [pts.length - 1, pts.length - 2];
    for (const idx of indices) {
      const oldVal = pts[idx][axis];
      pts[idx][axis] = center + (oldVal - center) * ratio;
    }
  }
}

// ---- Read routes from connRefs ----

export function readRoutesFromConnRefs(
  connRefs: { edgeId: string; connRef: AvoidConnRef }[],
  edges: FlowEdge[],
  options: AvoidRouterOptions
): Record<string, AvoidRoute> {
  const handleNudging = options.handleNudgingDistance ?? options.idealNudgingDistance ?? 10;
  const idealNudging = options.idealNudgingDistance ?? 10;
  const cornerRadius = options.edgeRounding ?? 0;
  const gridSize = options.diagramGridSize ?? 0;
  const connType = options.connectorType ?? "orthogonal";

  const edgePoints = new Map<string, { x: number; y: number }[]>();
  for (const { edgeId, connRef } of connRefs) {
    try {
      const route = connRef.displayRoute();
      const size = route.size();
      if (size < 2) continue;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < size; i++) {
        const p = route.at(i);
        points.push({ x: p.x, y: p.y });
      }
      edgePoints.set(edgeId, points);
    } catch {
      // skip
    }
  }

  if (handleNudging !== idealNudging && edgePoints.size > 0) {
    adjustHandleSpacing(edges, edgePoints, handleNudging, idealNudging);
  }

  const result: Record<string, AvoidRoute> = {};
  for (const [edgeId, points] of edgePoints) {
    const path = connType === "bezier"
      ? polylineToBezierPath(points.length, (i) => points[i], { gridSize: gridSize || undefined })
      : polylineToPath(points.length, (i) => points[i], { gridSize: gridSize || undefined, cornerRadius });
    const mid = Math.floor(points.length / 2);
    const midP = points[mid];
    const labelP = gridSize > 0 ? snapToGrid(midP.x, midP.y, gridSize) : midP;
    result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y, points, connectorType: connType };
  }
  return result;
}

// ---- Router setup helper ----

export function createAvoidRouter(Avoid: AvoidLibInstance, options?: AvoidRouterOptions): AvoidRouter {
  const k = c(Avoid);
  const shapeBuffer = options?.shapeBufferDistance ?? 8;
  const idealNudging = options?.idealNudgingDistance ?? 10;
  const connType = options?.connectorType ?? "orthogonal";
  // Use both routing flags when polyline so libavoid can produce diagonal segments
  const routerFlags = connType === "polyline"
    ? (k.OrthogonalRouting | k.PolyLineRouting)
    : k.OrthogonalRouting;
  const router = new Avoid.Router(routerFlags);
  router.setRoutingParameter(k.shapeBufferDistance, shapeBuffer);
  router.setRoutingParameter(k.idealNudgingDistance, idealNudging);
  router.setRoutingOption(k.nudgeOrthogonalSegmentsConnectedToShapes, true);
  router.setRoutingOption(k.nudgeSharedPathsWithCommonEndPoint, true);
  router.setRoutingOption(k.performUnifyingNudgingPreprocessingStep, true);
  return router;
}

// ---- Main routing function (stateless, one-shot) ----

export function routeAllCore(
  Avoid: AvoidLibInstance,
  nodes: FlowNode[],
  edges: FlowEdge[],
  options?: AvoidRouterOptions
): Record<string, AvoidRoute> {
  const splitNearHandle = options?.shouldSplitEdgesNearHandle ?? false;
  const autoBestSide = options?.autoBestSideConnection ?? false;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const obstacleNodes = nodes.filter((n) => n.type !== "group");
  const pinProportions = getPinProportions(Avoid);

  const result: Record<string, AvoidRoute> = {};
  const nodeBounds = new Map(obstacleNodes.map((n) => [n.id, getNodeBoundsAbsolute(n, nodeById)]));

  const router = createAvoidRouter(Avoid, options);

  const shapeRefMap = new Map<string, unknown>();
  const shapeRefs: unknown[] = [];
  for (const node of obstacleNodes) {
    const b = nodeBounds.get(node.id)!;
    const topLeft = new Avoid.Point(b.x, b.y);
    const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
    const rect = new Avoid.Rectangle(topLeft, bottomRight);
    const shapeRef = new Avoid.ShapeRef(router, rect);
    shapeRefs.push(shapeRef);
    shapeRefMap.set(node.id, shapeRef);
    for (const pinId of ALL_PIN_IDS) {
      const p = pinProportions[pinId];
      const pin = new Avoid.ShapeConnectionPin(shapeRef, pinId, p.x, p.y, true, 0, p.dir);
      pin.setExclusive(false);
    }
  }

  const connRefs: { edgeId: string; connRef: AvoidConnRef }[] = [];
  for (const edge of edges) {
    const src = nodeById.get(edge.source);
    const tgt = nodeById.get(edge.target);
    if (!src || !tgt) continue;
    const srcShapeRef = shapeRefMap.get(edge.source);
    const tgtShapeRef = shapeRefMap.get(edge.target);
    let sourcePos = getHandlePosition(src, "source");
    let targetPos = getHandlePosition(tgt, "target");
    if (autoBestSide) {
      const sb = getNodeBoundsAbsolute(src, nodeById);
      const tb = getNodeBoundsAbsolute(tgt, nodeById);
      const best = getBestSides(sb, tb);
      sourcePos = best.sourcePos;
      targetPos = best.targetPos;
    }
    let srcEnd: unknown;
    let tgtEnd: unknown;
    if (splitNearHandle) {
      if (srcShapeRef) {
        srcEnd = new Avoid.ConnEnd(srcShapeRef, pinIdForPosition[sourcePos] ?? PIN_CENTER);
      } else {
        const sb = getNodeBoundsAbsolute(src, nodeById);
        const sourcePt = getHandlePoint(sb, sourcePos);
        srcEnd = new Avoid.ConnEnd(new Avoid.Point(sourcePt.x, sourcePt.y));
      }
      if (tgtShapeRef) {
        tgtEnd = new Avoid.ConnEnd(tgtShapeRef, pinIdForPosition[targetPos] ?? PIN_CENTER);
      } else {
        const tb = getNodeBoundsAbsolute(tgt, nodeById);
        const targetPt = getHandlePoint(tb, targetPos);
        tgtEnd = new Avoid.ConnEnd(new Avoid.Point(targetPt.x, targetPt.y));
      }
    } else {
      const sb = getNodeBoundsAbsolute(src, nodeById);
      const sourcePt = getHandlePoint(sb, sourcePos);
      srcEnd = new Avoid.ConnEnd(new Avoid.Point(sourcePt.x, sourcePt.y));
      const tb = getNodeBoundsAbsolute(tgt, nodeById);
      const targetPt = getHandlePoint(tb, targetPos);
      tgtEnd = new Avoid.ConnEnd(new Avoid.Point(targetPt.x, targetPt.y));
    }
    const connRef = new Avoid.ConnRef(router, srcEnd, tgtEnd);
    const connTypeOption = options?.connectorType ?? "orthogonal";
    const constants = c(Avoid);
    connRef.setRoutingType(connTypeOption === "polyline" ? constants.ConnType_PolyLine : constants.ConnType_Orthogonal);
    connRefs.push({ edgeId: edge.id, connRef });
  }

  try {
    router.processTransaction();
  } catch {
    cleanup(router, connRefs, shapeRefs);
    return result;
  }

  const routes = readRoutesFromConnRefs(connRefs, edges, options ?? {});
  Object.assign(result, routes);

  cleanup(router, connRefs, shapeRefs);

  return result;
}

function cleanup(
  router: AvoidRouter,
  connRefs: { connRef: AvoidConnRef }[],
  shapeRefs: unknown[]
): void {
  try {
    for (const { connRef } of connRefs) router.deleteConnector(connRef);
    for (const ref of shapeRefs) router.deleteShape(ref);
    router.delete();
  } catch {
    // ignore
  }
}
