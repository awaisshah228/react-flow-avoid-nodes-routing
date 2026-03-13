/**
 * Pure routing functions shared between AvoidRouter (main thread) and the Web Worker.
 * No WASM loading, no singleton, no side-effects — just computation.
 */

// ---- Types ----

export type AvoidRoute = { path: string; labelX: number; labelY: number };

export type AvoidRouterOptions = {
  shapeBufferDistance?: number;
  idealNudgingDistance?: number;
  handleNudgingDistance?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
  autoBestSideConnection?: boolean;
  debounceMs?: number;
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

export type AvoidLibInstance = {
  Router: new (flags: number) => unknown;
  Point: new (x: number, y: number) => { x: number; y: number };
  Rectangle: new (a: unknown, b: unknown) => unknown;
  ShapeRef: new (router: unknown, poly: unknown) => unknown;
  ShapeConnectionPin: new (
    shapeRef: unknown,
    classId: number,
    xProportion: number,
    yProportion: number,
    proportional: boolean,
    insideOffset: number,
    directions: number
  ) => { setExclusive: (exclusive: boolean) => void };
  ConnEnd: new (shapeRefOrPoint: unknown, pinClassId?: number) => unknown;
  ConnRef: new (router: unknown, src?: unknown, dst?: unknown) => {
    setRoutingType: (t: number) => void;
    displayRoute: () => { size: () => number; get_ps: (i: number) => { x: number; y: number } };
  };
  OrthogonalRouting: number;
  ConnType_Orthogonal: number;
  ConnDirUp: number;
  ConnDirDown: number;
  ConnDirLeft: number;
  ConnDirRight: number;
  ConnDirAll: number;
  shapeBufferDistance: number;
  idealNudgingDistance: number;
  nudgeOrthogonalSegmentsConnectedToShapes: number;
  nudgeSharedPathsWithCommonEndPoint: number;
  performUnifyingNudgingPreprocessingStep: number;
};

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

// ---- Main routing function ----

export function routeAllCore(
  Avoid: AvoidLibInstance,
  nodes: FlowNode[],
  edges: FlowEdge[],
  options?: AvoidRouterOptions
): Record<string, AvoidRoute> {
  const shapeBuffer = options?.shapeBufferDistance ?? 8;
  const idealNudging = options?.idealNudgingDistance ?? 10;
  const handleNudging = options?.handleNudgingDistance ?? idealNudging;
  const cornerRadius = options?.edgeRounding ?? 0;
  const gridSize = options?.diagramGridSize ?? 0;
  const splitNearHandle = options?.shouldSplitEdgesNearHandle ?? false;
  const autoBestSide = options?.autoBestSideConnection ?? false;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const obstacleNodes = nodes.filter((n) => n.type !== "group");

  const PIN_CENTER = 1, PIN_TOP = 2, PIN_BOTTOM = 3, PIN_LEFT = 4, PIN_RIGHT = 5;
  const pinIdForPosition: Record<HandlePosition, number> = { top: PIN_TOP, bottom: PIN_BOTTOM, left: PIN_LEFT, right: PIN_RIGHT };
  const pinProportions: Record<number, { x: number; y: number; dir: number }> = {
    [PIN_CENTER]: { x: 0.5, y: 0.5, dir: Avoid.ConnDirAll },
    [PIN_TOP]: { x: 0.5, y: 0, dir: Avoid.ConnDirUp },
    [PIN_BOTTOM]: { x: 0.5, y: 1, dir: Avoid.ConnDirDown },
    [PIN_LEFT]: { x: 0, y: 0.5, dir: Avoid.ConnDirLeft },
    [PIN_RIGHT]: { x: 1, y: 0.5, dir: Avoid.ConnDirRight },
  };

  const result: Record<string, AvoidRoute> = {};
  const nodeBounds = new Map(obstacleNodes.map((n) => [n.id, getNodeBoundsAbsolute(n, nodeById)]));

  const router = new Avoid.Router(Avoid.OrthogonalRouting) as {
    setRoutingParameter: (p: number, v: number) => void;
    setRoutingOption: (o: number, v: boolean) => void;
    processTransaction: () => void;
    deleteConnector: (c: unknown) => void;
    deleteShape: (s: unknown) => void;
  };
  router.setRoutingParameter(Avoid.shapeBufferDistance, shapeBuffer);
  router.setRoutingParameter(Avoid.idealNudgingDistance, idealNudging);
  router.setRoutingOption(Avoid.nudgeOrthogonalSegmentsConnectedToShapes, true);
  router.setRoutingOption(Avoid.nudgeSharedPathsWithCommonEndPoint, true);
  router.setRoutingOption(Avoid.performUnifyingNudgingPreprocessingStep, true);

  const shapeRefMap = new Map<string, unknown>();
  const shapeRefs: { ref: unknown }[] = [];
  for (const node of obstacleNodes) {
    const b = nodeBounds.get(node.id)!;
    const topLeft = new Avoid.Point(b.x, b.y);
    const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
    const rect = new Avoid.Rectangle(topLeft, bottomRight);
    const shapeRef = new Avoid.ShapeRef(router, rect);
    // Free transient WASM geometry objects to prevent heap leaks
    try { (topLeft as { delete?: () => void }).delete?.(); } catch { /* ok */ }
    try { (bottomRight as { delete?: () => void }).delete?.(); } catch { /* ok */ }
    try { (rect as { delete?: () => void }).delete?.(); } catch { /* ok */ }
    shapeRefs.push({ ref: shapeRef });
    shapeRefMap.set(node.id, shapeRef);
    for (const pinId of [PIN_CENTER, PIN_TOP, PIN_BOTTOM, PIN_LEFT, PIN_RIGHT]) {
      const p = pinProportions[pinId];
      const pin = new Avoid.ShapeConnectionPin(shapeRef, pinId, p.x, p.y, true, 0, p.dir);
      pin.setExclusive(false);
    }
  }

  const connRefs: { edgeId: string; connRef: unknown }[] = [];
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
        const pt = new Avoid.Point(sourcePt.x, sourcePt.y);
        srcEnd = new Avoid.ConnEnd(pt);
        try { (pt as { delete?: () => void }).delete?.(); } catch { /* ok */ }
      }
      if (tgtShapeRef) {
        tgtEnd = new Avoid.ConnEnd(tgtShapeRef, pinIdForPosition[targetPos] ?? PIN_CENTER);
      } else {
        const tb = getNodeBoundsAbsolute(tgt, nodeById);
        const targetPt = getHandlePoint(tb, targetPos);
        const pt = new Avoid.Point(targetPt.x, targetPt.y);
        tgtEnd = new Avoid.ConnEnd(pt);
        try { (pt as { delete?: () => void }).delete?.(); } catch { /* ok */ }
      }
    } else {
      const sb = getNodeBoundsAbsolute(src, nodeById);
      const sourcePt = getHandlePoint(sb, sourcePos);
      const srcPt = new Avoid.Point(sourcePt.x, sourcePt.y);
      srcEnd = new Avoid.ConnEnd(srcPt);
      try { (srcPt as { delete?: () => void }).delete?.(); } catch { /* ok */ }
      const tb = getNodeBoundsAbsolute(tgt, nodeById);
      const targetPt = getHandlePoint(tb, targetPos);
      const tgtPt = new Avoid.Point(targetPt.x, targetPt.y);
      tgtEnd = new Avoid.ConnEnd(tgtPt);
      try { (tgtPt as { delete?: () => void }).delete?.(); } catch { /* ok */ }
    }
    const connRef = new Avoid.ConnRef(router, srcEnd, tgtEnd);
    connRef.setRoutingType(Avoid.ConnType_Orthogonal);
    connRefs.push({ edgeId: edge.id, connRef });
  }

  try {
    router.processTransaction();
  } catch {
    cleanup(router, connRefs, shapeRefs);
    return result;
  }

  const edgePoints = new Map<string, { x: number; y: number }[]>();
  for (const { edgeId, connRef } of connRefs) {
    try {
      const route = (connRef as { displayRoute(): { size(): number; get_ps(i: number): { x: number; y: number } } }).displayRoute();
      const size = route.size();
      if (size < 2) continue;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < size; i++) {
        const p = route.get_ps(i);
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

  for (const [edgeId, points] of edgePoints) {
    const path = polylineToPath(points.length, (i) => points[i], { gridSize: gridSize || undefined, cornerRadius });
    const mid = Math.floor(points.length / 2);
    const midP = points[mid];
    const labelP = gridSize > 0 ? snapToGrid(midP.x, midP.y, gridSize) : midP;
    result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y };
  }

  cleanup(router, connRefs, shapeRefs);

  return result;
}

function cleanup(
  router: { deleteConnector: (c: unknown) => void; deleteShape: (s: unknown) => void; delete?: () => void },
  connRefs: { connRef: unknown }[],
  shapeRefs: { ref: unknown }[]
): void {
  try {
    for (const { connRef } of connRefs) router.deleteConnector(connRef);
    for (const { ref } of shapeRefs) router.deleteShape(ref);
    router.delete?.();
  } catch {
    // ignore
  }
}

// ---- Persistent Router (keeps WASM Router alive to prevent heap growth) ----

/**
 * Keeps a single WASM Router alive across routing calls.
 * WASM linear memory can only grow, never shrink. Rapid create/destroy cycles
 * (new Router per routeAll) cause unbounded heap growth from fragmentation.
 * This class reuses the Router and uses moveShape() for position-only updates.
 */
export class PersistentRouter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private router: any = null;
  private Avoid: AvoidLibInstance | null = null;
  private shapeRefMap = new Map<string, unknown>();
  private shapeRefList: { ref: unknown }[] = [];
  private connRefList: { edgeId: string; connRef: unknown }[] = [];
  private prevNodes: FlowNode[] = [];
  private prevEdges: FlowEdge[] = [];
  private prevOptions: AvoidRouterOptions = {};
  private nodeById = new Map<string, FlowNode>();

  /**
   * Full rebuild: create all shapes and connectors from scratch.
   * Reuses the same Router object if one exists.
   */
  reset(
    Avoid: AvoidLibInstance,
    nodes: FlowNode[],
    edges: FlowEdge[],
    options?: AvoidRouterOptions
  ): Record<string, AvoidRoute> {
    this.Avoid = Avoid;
    this.prevNodes = nodes;
    this.prevEdges = edges;
    if (options) this.prevOptions = options;
    this.nodeById = new Map(nodes.map((n) => [n.id, n]));
    return this.buildRouter();
  }

  /**
   * Incremental update: move existing shapes via moveShape() instead of rebuilding.
   * Falls back to full rebuild if router doesn't exist.
   */
  updateNodes(updatedNodes: FlowNode[]): Record<string, AvoidRoute> {
    const Avoid = this.Avoid;
    if (!Avoid || !this.router) {
      for (const updated of updatedNodes) this.upsertNode(updated);
      this.nodeById = new Map(this.prevNodes.map((n) => [n.id, n]));
      return this.buildRouter();
    }

    for (const updated of updatedNodes) {
      this.upsertNode(updated);
      const shapeRef = this.shapeRefMap.get(updated.id);
      if (shapeRef && updated.position) {
        const b = getNodeBoundsAbsolute(this.nodeById.get(updated.id)!, this.nodeById);
        const topLeft = new Avoid.Point(b.x, b.y);
        const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
        const newPoly = new Avoid.Rectangle(topLeft, bottomRight);
        (this.router as { moveShape: (s: unknown, p: unknown) => void }).moveShape(shapeRef, newPoly);
        try { (topLeft as { delete?: () => void }).delete?.(); } catch { /* ok */ }
        try { (bottomRight as { delete?: () => void }).delete?.(); } catch { /* ok */ }
        try { (newPoly as { delete?: () => void }).delete?.(); } catch { /* ok */ }
      }
    }

    try {
      (this.router as { processTransaction: () => void }).processTransaction();
    } catch {
      return this.reset(Avoid, this.prevNodes, this.prevEdges, this.prevOptions);
    }

    return this.readRoutes();
  }

  destroy(): void {
    if (this.router) {
      cleanup(
        this.router as { deleteConnector: (c: unknown) => void; deleteShape: (s: unknown) => void; delete?: () => void },
        this.connRefList,
        this.shapeRefList
      );
      this.router = null;
    }
    this.shapeRefMap.clear();
    this.shapeRefList = [];
    this.connRefList = [];
  }

  private upsertNode(updated: FlowNode) {
    const existing = this.nodeById.get(updated.id);
    if (existing) {
      const merged = { ...existing, ...updated };
      const i = this.prevNodes.indexOf(existing);
      if (i >= 0) this.prevNodes[i] = merged;
      this.nodeById.set(updated.id, merged);
    } else {
      this.prevNodes.push(updated);
      this.nodeById.set(updated.id, updated);
    }
  }

  private buildRouter(): Record<string, AvoidRoute> {
    const Avoid = this.Avoid;
    if (!Avoid) return {};

    const opts = this.prevOptions;
    const shapeBuffer = opts.shapeBufferDistance ?? 8;
    const idealNudging = opts.idealNudgingDistance ?? 10;
    const splitNearHandle = opts.shouldSplitEdgesNearHandle ?? false;
    const autoBestSide = opts.autoBestSideConnection ?? false;

    const PIN_CENTER = 1, PIN_TOP = 2, PIN_BOTTOM = 3, PIN_LEFT = 4, PIN_RIGHT = 5;
    const pinIdForPosition: Record<HandlePosition, number> = { top: PIN_TOP, bottom: PIN_BOTTOM, left: PIN_LEFT, right: PIN_RIGHT };
    const pinProportions: Record<number, { x: number; y: number; dir: number }> = {
      [PIN_CENTER]: { x: 0.5, y: 0.5, dir: Avoid.ConnDirAll },
      [PIN_TOP]: { x: 0.5, y: 0, dir: Avoid.ConnDirUp },
      [PIN_BOTTOM]: { x: 0.5, y: 1, dir: Avoid.ConnDirDown },
      [PIN_LEFT]: { x: 0, y: 0.5, dir: Avoid.ConnDirLeft },
      [PIN_RIGHT]: { x: 1, y: 0.5, dir: Avoid.ConnDirRight },
    };

    const obstacleNodes = this.prevNodes.filter((n) => n.type !== "group");
    const nodeBounds = new Map(obstacleNodes.map((n) => [n.id, getNodeBoundsAbsolute(n, this.nodeById)]));

    // Clean old shapes/connectors from existing router
    if (this.router) {
      try {
        for (const { connRef } of this.connRefList) {
          (this.router as { deleteConnector: (c: unknown) => void }).deleteConnector(connRef);
        }
        for (const { ref } of this.shapeRefList) {
          (this.router as { deleteShape: (s: unknown) => void }).deleteShape(ref);
        }
      } catch { /* ok */ }
    } else {
      this.router = new Avoid.Router(Avoid.OrthogonalRouting);
      const r = this.router as {
        setRoutingParameter: (p: number, v: number) => void;
        setRoutingOption: (o: number, v: boolean) => void;
      };
      r.setRoutingParameter(Avoid.shapeBufferDistance, shapeBuffer);
      r.setRoutingParameter(Avoid.idealNudgingDistance, idealNudging);
      r.setRoutingOption(Avoid.nudgeOrthogonalSegmentsConnectedToShapes, true);
      r.setRoutingOption(Avoid.nudgeSharedPathsWithCommonEndPoint, true);
      r.setRoutingOption(Avoid.performUnifyingNudgingPreprocessingStep, true);
    }

    this.shapeRefMap.clear();
    this.shapeRefList = [];
    for (const node of obstacleNodes) {
      const b = nodeBounds.get(node.id)!;
      const topLeft = new Avoid.Point(b.x, b.y);
      const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
      const rect = new Avoid.Rectangle(topLeft, bottomRight);
      const shapeRef = new Avoid.ShapeRef(this.router, rect);
      try { (topLeft as { delete?: () => void }).delete?.(); } catch { /* ok */ }
      try { (bottomRight as { delete?: () => void }).delete?.(); } catch { /* ok */ }
      try { (rect as { delete?: () => void }).delete?.(); } catch { /* ok */ }
      this.shapeRefList.push({ ref: shapeRef });
      this.shapeRefMap.set(node.id, shapeRef);
      for (const pinId of [PIN_CENTER, PIN_TOP, PIN_BOTTOM, PIN_LEFT, PIN_RIGHT]) {
        const p = pinProportions[pinId];
        const pin = new Avoid.ShapeConnectionPin(shapeRef, pinId, p.x, p.y, true, 0, p.dir);
        pin.setExclusive(false);
      }
    }

    this.connRefList = [];
    const avoidEdges = this.prevEdges.filter((e) => e.type === "avoidNodes");
    for (const edge of avoidEdges) {
      const src = this.nodeById.get(edge.source);
      const tgt = this.nodeById.get(edge.target);
      if (!src || !tgt) continue;
      const srcShapeRef = this.shapeRefMap.get(edge.source);
      const tgtShapeRef = this.shapeRefMap.get(edge.target);
      let sourcePos = getHandlePosition(src, "source");
      let targetPos = getHandlePosition(tgt, "target");
      if (autoBestSide) {
        const sb = getNodeBoundsAbsolute(src, this.nodeById);
        const tb = getNodeBoundsAbsolute(tgt, this.nodeById);
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
          const sb = getNodeBoundsAbsolute(src, this.nodeById);
          const sourcePt = getHandlePoint(sb, sourcePos);
          const pt = new Avoid.Point(sourcePt.x, sourcePt.y);
          srcEnd = new Avoid.ConnEnd(pt);
          try { (pt as { delete?: () => void }).delete?.(); } catch { /* ok */ }
        }
        if (tgtShapeRef) {
          tgtEnd = new Avoid.ConnEnd(tgtShapeRef, pinIdForPosition[targetPos] ?? PIN_CENTER);
        } else {
          const tb = getNodeBoundsAbsolute(tgt, this.nodeById);
          const targetPt = getHandlePoint(tb, targetPos);
          const pt = new Avoid.Point(targetPt.x, targetPt.y);
          tgtEnd = new Avoid.ConnEnd(pt);
          try { (pt as { delete?: () => void }).delete?.(); } catch { /* ok */ }
        }
      } else {
        const sb = getNodeBoundsAbsolute(src, this.nodeById);
        const sourcePt = getHandlePoint(sb, sourcePos);
        const srcPt = new Avoid.Point(sourcePt.x, sourcePt.y);
        srcEnd = new Avoid.ConnEnd(srcPt);
        try { (srcPt as { delete?: () => void }).delete?.(); } catch { /* ok */ }
        const tb = getNodeBoundsAbsolute(tgt, this.nodeById);
        const targetPt = getHandlePoint(tb, targetPos);
        const tgtPt = new Avoid.Point(targetPt.x, targetPt.y);
        tgtEnd = new Avoid.ConnEnd(tgtPt);
        try { (tgtPt as { delete?: () => void }).delete?.(); } catch { /* ok */ }
      }
      const connRef = new Avoid.ConnRef(this.router, srcEnd, tgtEnd);
      connRef.setRoutingType(Avoid.ConnType_Orthogonal);
      this.connRefList.push({ edgeId: edge.id, connRef });
    }

    try {
      (this.router as { processTransaction: () => void }).processTransaction();
    } catch {
      this.destroy();
      return {};
    }

    return this.readRoutes();
  }

  private readRoutes(): Record<string, AvoidRoute> {
    const opts = this.prevOptions;
    const idealNudging = opts.idealNudgingDistance ?? 10;
    const handleNudging = opts.handleNudgingDistance ?? idealNudging;
    const cornerRadius = opts.edgeRounding ?? 0;
    const gridSize = opts.diagramGridSize ?? 0;
    const avoidEdges = this.prevEdges.filter((e) => e.type === "avoidNodes");

    const result: Record<string, AvoidRoute> = {};
    const edgePoints = new Map<string, { x: number; y: number }[]>();

    for (const { edgeId, connRef } of this.connRefList) {
      try {
        const route = (connRef as { displayRoute(): { size(): number; get_ps(i: number): { x: number; y: number } } }).displayRoute();
        const size = route.size();
        if (size < 2) continue;
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < size; i++) { const p = route.get_ps(i); points.push({ x: p.x, y: p.y }); }
        edgePoints.set(edgeId, points);
      } catch { /* skip */ }
    }

    if (handleNudging !== idealNudging && edgePoints.size > 0) {
      adjustHandleSpacing(avoidEdges, edgePoints, handleNudging, idealNudging);
    }

    for (const [edgeId, points] of edgePoints) {
      const path = polylineToPath(points.length, (i) => points[i], { gridSize: gridSize || undefined, cornerRadius });
      const mid = Math.floor(points.length / 2);
      const midP = points[mid];
      const labelP = gridSize > 0 ? snapToGrid(midP.x, midP.y, gridSize) : midP;
      result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y };
    }

    return result;
  }
}
