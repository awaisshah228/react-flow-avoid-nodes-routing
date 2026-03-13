/**
 * Server-side routing engine.
 * Loads libavoid-js WASM in Node.js and exposes a simple routeAll() function.
 */

// ---- Types (mirrored from avoid-nodes-edge/routing-core for independence) ----

export type AvoidRoute = { path: string; labelX: number; labelY: number };

export type AvoidRouterOptions = {
  shapeBufferDistance?: number;
  idealNudgingDistance?: number;
  handleNudgingDistance?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
  autoBestSideConnection?: boolean;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AvoidLib = any;

// ---- WASM loading for Node.js ----

let avoidLib: AvoidLib | null = null;

export async function loadAvoidWasm(): Promise<void> {
  if (avoidLib) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("libavoid-js");
  const AvoidLib = mod.AvoidLib ?? mod.default;
  if (!AvoidLib?.load) throw new Error("Failed to load libavoid-js");
  await AvoidLib.load();
  avoidLib = AvoidLib.getInstance();
}

export function getAvoidLib(): AvoidLib {
  if (!avoidLib) throw new Error("Call loadAvoidWasm() before routing");
  return avoidLib;
}

// ---- Geometry helpers ----

function getNodeBounds(node: FlowNode) {
  const x = node.position?.x ?? 0;
  const y = node.position?.y ?? 0;
  const w = Number((node.measured?.width ?? node.width ?? (node.style as { width?: number })?.width) ?? 150);
  const h = Number((node.measured?.height ?? node.height ?? (node.style as { height?: number })?.height) ?? 50);
  return { x, y, w, h };
}

function getNodeBoundsAbsolute(node: FlowNode, nodeById: Map<string, FlowNode>) {
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

function getHandlePosition(node: FlowNode, kind: "source" | "target"): HandlePosition {
  const raw = kind === "source"
    ? (node.sourcePosition as string | undefined) ?? (node as { data?: { sourcePosition?: string } }).data?.sourcePosition
    : (node.targetPosition as string | undefined) ?? (node as { data?: { targetPosition?: string } }).data?.targetPosition;
  const s = String(raw ?? "").toLowerCase();
  if (s === "left" || s === "right" || s === "top" || s === "bottom") return s;
  return kind === "source" ? "right" : "left";
}

function getHandlePoint(bounds: { x: number; y: number; w: number; h: number }, position: HandlePosition) {
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

function snapToGrid(x: number, y: number, gridSize: number) {
  if (gridSize <= 0) return { x, y };
  return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
}

function getBestSides(srcBounds: { x: number; y: number; w: number; h: number }, tgtBounds: { x: number; y: number; w: number; h: number }) {
  const dx = (tgtBounds.x + tgtBounds.w / 2) - (srcBounds.x + srcBounds.w / 2);
  const dy = (tgtBounds.y + tgtBounds.h / 2) - (srcBounds.y + srcBounds.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { sourcePos: "right" as const, targetPos: "left" as const } : { sourcePos: "left" as const, targetPos: "right" as const };
  }
  return dy >= 0 ? { sourcePos: "bottom" as const, targetPos: "top" as const } : { sourcePos: "top" as const, targetPos: "bottom" as const };
}

// ---- SVG path builder ----

function polylineToPath(
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
    for (let i = 1; i < size; i++) { const p = pt(i); d += ` L ${p.x} ${p.y}`; }
    return d;
  }
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);
  const unit = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const d = dist(a, b);
    if (d < 1e-6) return { x: 0, y: 0 };
    return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
  };
  let d = `M ${pt(0).x} ${pt(0).y}`;
  for (let i = 1; i < size - 1; i++) {
    const prev = pt(i - 1), curr = pt(i), next = pt(i + 1);
    const dirIn = unit(curr, prev), dirOut = unit(curr, next);
    const lenIn = dist(curr, prev), lenOut = dist(curr, next);
    const rr = Math.min(r, lenIn / 2, lenOut / 2);
    const endPrev = { x: curr.x + dirIn.x * rr, y: curr.y + dirIn.y * rr };
    const startNext = { x: curr.x + dirOut.x * rr, y: curr.y + dirOut.y * rr };
    d += ` L ${endPrev.x} ${endPrev.y} Q ${curr.x} ${curr.y} ${startNext.x} ${startNext.y}`;
  }
  const last = pt(size - 1);
  d += ` L ${last.x} ${last.y}`;
  return d;
}

// ---- Handle spacing adjustment ----

function adjustHandleSpacing(
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
  for (const [, ids] of bySource) { if (ids.length >= 2) rescale(ids, edgePoints, "source", ratio); }
  for (const [, ids] of byTarget) { if (ids.length >= 2) rescale(ids, edgePoints, "target", ratio); }
}

function rescale(edgeIds: string[], edgePoints: Map<string, { x: number; y: number }[]>, end: "source" | "target", ratio: number) {
  const positions: { edgeId: string; pt: { x: number; y: number } }[] = [];
  for (const edgeId of edgeIds) {
    const pts = edgePoints.get(edgeId);
    if (!pts || pts.length < 2) continue;
    positions.push({ edgeId, pt: pts[end === "source" ? 0 : pts.length - 1] });
  }
  if (positions.length < 2) return;
  const firstPts = edgePoints.get(positions[0].edgeId)!;
  const segStart = end === "source" ? 0 : firstPts.length - 2;
  const p0 = firstPts[segStart], p1 = firstPts[segStart + 1];
  const axis = Math.abs(p1.x - p0.x) > Math.abs(p1.y - p0.y) ? "y" as const : "x" as const;
  const values = positions.map((p) => p.pt[axis]);
  const center = values.reduce((a, b) => a + b, 0) / values.length;
  for (const edgeId of edgeIds) {
    const pts = edgePoints.get(edgeId);
    if (!pts || pts.length < 2) continue;
    const indices = end === "source" ? [0, 1] : [pts.length - 1, pts.length - 2];
    for (const idx of indices) {
      pts[idx][axis] = center + (pts[idx][axis] - center) * ratio;
    }
  }
}

// ---- Main routing function ----

export function routeAll(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options?: AvoidRouterOptions
): Record<string, AvoidRoute> {
  const Avoid = getAvoidLib();
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

  const router = new Avoid.Router(Avoid.OrthogonalRouting);
  router.setRoutingParameter(Avoid.shapeBufferDistance, shapeBuffer);
  router.setRoutingParameter(Avoid.idealNudgingDistance, idealNudging);
  router.setRoutingOption(Avoid.nudgeOrthogonalSegmentsConnectedToShapes, true);
  router.setRoutingOption(Avoid.nudgeSharedPathsWithCommonEndPoint, true);
  router.setRoutingOption(Avoid.performUnifyingNudgingPreprocessingStep, true);

  const shapeRefMap = new Map<string, unknown>();
  const shapeRefs: unknown[] = [];
  for (const node of obstacleNodes) {
    const b = nodeBounds.get(node.id)!;
    const topLeft = new Avoid.Point(b.x, b.y);
    const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
    const rect = new Avoid.Rectangle(topLeft, bottomRight);
    const shapeRef = new Avoid.ShapeRef(router, rect);
    // Free transient WASM geometry objects to prevent heap leaks
    try { topLeft.delete?.(); } catch { /* ok */ }
    try { bottomRight.delete?.(); } catch { /* ok */ }
    try { rect.delete?.(); } catch { /* ok */ }
    shapeRefs.push(shapeRef);
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
    let srcEnd: unknown, tgtEnd: unknown;
    if (splitNearHandle) {
      srcEnd = srcShapeRef
        ? new Avoid.ConnEnd(srcShapeRef, pinIdForPosition[sourcePos] ?? PIN_CENTER)
        : (() => { const sb = getNodeBoundsAbsolute(src, nodeById); const pt = getHandlePoint(sb, sourcePos); const p = new Avoid.Point(pt.x, pt.y); const end = new Avoid.ConnEnd(p); try { p.delete?.(); } catch { /* ok */ } return end; })();
      tgtEnd = tgtShapeRef
        ? new Avoid.ConnEnd(tgtShapeRef, pinIdForPosition[targetPos] ?? PIN_CENTER)
        : (() => { const tb = getNodeBoundsAbsolute(tgt, nodeById); const pt = getHandlePoint(tb, targetPos); const p = new Avoid.Point(pt.x, pt.y); const end = new Avoid.ConnEnd(p); try { p.delete?.(); } catch { /* ok */ } return end; })();
    } else {
      const sb = getNodeBoundsAbsolute(src, nodeById);
      const sourcePt = getHandlePoint(sb, sourcePos);
      const srcPt = new Avoid.Point(sourcePt.x, sourcePt.y);
      srcEnd = new Avoid.ConnEnd(srcPt);
      try { srcPt.delete?.(); } catch { /* ok */ }
      const tb = getNodeBoundsAbsolute(tgt, nodeById);
      const targetPt = getHandlePoint(tb, targetPos);
      const tgtPt = new Avoid.Point(targetPt.x, targetPt.y);
      tgtEnd = new Avoid.ConnEnd(tgtPt);
      try { tgtPt.delete?.(); } catch { /* ok */ }
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
      for (let i = 0; i < size; i++) { const p = route.get_ps(i); points.push({ x: p.x, y: p.y }); }
      edgePoints.set(edgeId, points);
    } catch { /* skip */ }
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

function cleanup(router: unknown, connRefs: { connRef: unknown }[], shapeRefs: unknown[]) {
  try {
    const r = router as { deleteConnector: (c: unknown) => void; deleteShape: (s: unknown) => void; delete: () => void };
    for (const { connRef } of connRefs) r.deleteConnector(connRef);
    for (const ref of shapeRefs) r.deleteShape(ref);
    r.delete();
  } catch { /* ignore */ }
}

// ---- Persistent Server Router ----

/**
 * Keeps a WASM Router alive across requests so that updateNodes
 * only moves existing shapes instead of rebuilding from scratch.
 * This avoids WASM memory fragmentation from rapid create/destroy cycles.
 */
export class PersistentServerRouter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private router: any = null;
  private shapeRefMap = new Map<string, unknown>();
  private shapeRefs: unknown[] = [];
  private connRefs: { edgeId: string; connRef: unknown }[] = [];
  private currentNodes: FlowNode[] = [];
  private currentEdges: FlowEdge[] = [];
  private currentOptions: AvoidRouterOptions = {};
  private nodeById = new Map<string, FlowNode>();

  getState(): { nodes: FlowNode[]; edges: FlowEdge[]; options: AvoidRouterOptions } {
    return { nodes: this.currentNodes, edges: this.currentEdges, options: this.currentOptions };
  }

  private upsertNode(updated: FlowNode) {
    const existing = this.nodeById.get(updated.id);
    if (existing) {
      const merged = { ...existing, ...updated };
      const i = this.currentNodes.indexOf(existing);
      if (i >= 0) this.currentNodes[i] = merged;
      this.nodeById.set(updated.id, merged);
    } else {
      this.currentNodes.push(updated);
      this.nodeById.set(updated.id, updated);
    }
  }

  destroy() {
    if (this.router) {
      cleanup(this.router, this.connRefs, this.shapeRefs);
      this.router = null;
      this.shapeRefMap.clear();
      this.shapeRefs = [];
      this.connRefs = [];
    }
  }

  reset(nodes: FlowNode[], edges: FlowEdge[], options?: AvoidRouterOptions): Record<string, AvoidRoute> {
    this.destroy();
    this.currentNodes = nodes;
    this.currentEdges = edges;
    if (options) this.currentOptions = options;
    this.nodeById = new Map(nodes.map((n) => [n.id, n]));
    return this.buildRouter();
  }

  updateNodes(updatedNodes: FlowNode[]): Record<string, AvoidRoute> {
    if (!this.router) {
      for (const updated of updatedNodes) {
        this.upsertNode(updated);
      }
      this.nodeById = new Map(this.currentNodes.map((n) => [n.id, n]));
      return this.buildRouter();
    }

    const Avoid = getAvoidLib();
    for (const updated of updatedNodes) {
      this.upsertNode(updated);

      const shapeRef = this.shapeRefMap.get(updated.id);
      if (shapeRef && updated.position) {
        const b = getNodeBoundsAbsolute(this.nodeById.get(updated.id)!, this.nodeById);
        const topLeft = new Avoid.Point(b.x, b.y);
        const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
        const newPoly = new Avoid.Rectangle(topLeft, bottomRight);
        this.router.moveShape(shapeRef, newPoly);
        // Free transient WASM geometry objects
        try { topLeft.delete?.(); } catch { /* ok */ }
        try { bottomRight.delete?.(); } catch { /* ok */ }
        try { newPoly.delete?.(); } catch { /* ok */ }
      }
    }

    try {
      this.router.processTransaction();
    } catch {
      // If processTransaction fails, do a full rebuild
      return this.reset(this.currentNodes, this.currentEdges, this.currentOptions);
    }

    return this.readRoutes();
  }

  private buildRouter(): Record<string, AvoidRoute> {
    const Avoid = getAvoidLib();
    const opts = this.currentOptions;
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

    const obstacleNodes = this.currentNodes.filter((n) => n.type !== "group");
    const nodeBounds = new Map(obstacleNodes.map((n) => [n.id, getNodeBoundsAbsolute(n, this.nodeById)]));

    this.router = new Avoid.Router(Avoid.OrthogonalRouting);
    this.router.setRoutingParameter(Avoid.shapeBufferDistance, shapeBuffer);
    this.router.setRoutingParameter(Avoid.idealNudgingDistance, idealNudging);
    this.router.setRoutingOption(Avoid.nudgeOrthogonalSegmentsConnectedToShapes, true);
    this.router.setRoutingOption(Avoid.nudgeSharedPathsWithCommonEndPoint, true);
    this.router.setRoutingOption(Avoid.performUnifyingNudgingPreprocessingStep, true);

    this.shapeRefMap.clear();
    this.shapeRefs = [];
    for (const node of obstacleNodes) {
      const b = nodeBounds.get(node.id)!;
      const topLeft = new Avoid.Point(b.x, b.y);
      const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
      const rect = new Avoid.Rectangle(topLeft, bottomRight);
      const shapeRef = new Avoid.ShapeRef(this.router, rect);
      try { topLeft.delete?.(); } catch { /* ok */ }
      try { bottomRight.delete?.(); } catch { /* ok */ }
      try { rect.delete?.(); } catch { /* ok */ }
      this.shapeRefs.push(shapeRef);
      this.shapeRefMap.set(node.id, shapeRef);
      for (const pinId of [PIN_CENTER, PIN_TOP, PIN_BOTTOM, PIN_LEFT, PIN_RIGHT]) {
        const p = pinProportions[pinId];
        const pin = new Avoid.ShapeConnectionPin(shapeRef, pinId, p.x, p.y, true, 0, p.dir);
        pin.setExclusive(false);
      }
    }

    this.connRefs = [];
    const avoidEdges = this.currentEdges.filter((e) => e.type === "avoidNodes");
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
      let srcEnd: unknown, tgtEnd: unknown;
      if (splitNearHandle) {
        srcEnd = srcShapeRef
          ? new Avoid.ConnEnd(srcShapeRef, pinIdForPosition[sourcePos] ?? PIN_CENTER)
          : (() => { const sb = getNodeBoundsAbsolute(src, this.nodeById); const pt = getHandlePoint(sb, sourcePos); const p = new Avoid.Point(pt.x, pt.y); const end = new Avoid.ConnEnd(p); try { p.delete?.(); } catch { /* ok */ } return end; })();
        tgtEnd = tgtShapeRef
          ? new Avoid.ConnEnd(tgtShapeRef, pinIdForPosition[targetPos] ?? PIN_CENTER)
          : (() => { const tb = getNodeBoundsAbsolute(tgt, this.nodeById); const pt = getHandlePoint(tb, targetPos); const p = new Avoid.Point(pt.x, pt.y); const end = new Avoid.ConnEnd(p); try { p.delete?.(); } catch { /* ok */ } return end; })();
      } else {
        const sb = getNodeBoundsAbsolute(src, this.nodeById);
        const sourcePt = getHandlePoint(sb, sourcePos);
        const srcPt = new Avoid.Point(sourcePt.x, sourcePt.y);
        srcEnd = new Avoid.ConnEnd(srcPt);
        try { srcPt.delete?.(); } catch { /* ok */ }
        const tb = getNodeBoundsAbsolute(tgt, this.nodeById);
        const targetPt = getHandlePoint(tb, targetPos);
        const tgtPt = new Avoid.Point(targetPt.x, targetPt.y);
        tgtEnd = new Avoid.ConnEnd(tgtPt);
        try { tgtPt.delete?.(); } catch { /* ok */ }
      }
      const connRef = new Avoid.ConnRef(this.router, srcEnd, tgtEnd);
      connRef.setRoutingType(Avoid.ConnType_Orthogonal);
      this.connRefs.push({ edgeId: edge.id, connRef });
    }

    try {
      this.router.processTransaction();
    } catch {
      this.destroy();
      return {};
    }

    return this.readRoutes();
  }

  private readRoutes(): Record<string, AvoidRoute> {
    const opts = this.currentOptions;
    const idealNudging = opts.idealNudgingDistance ?? 10;
    const handleNudging = opts.handleNudgingDistance ?? idealNudging;
    const cornerRadius = opts.edgeRounding ?? 0;
    const gridSize = opts.diagramGridSize ?? 0;
    const avoidEdges = this.currentEdges.filter((e) => e.type === "avoidNodes");

    const result: Record<string, AvoidRoute> = {};
    const edgePoints = new Map<string, { x: number; y: number }[]>();

    for (const { edgeId, connRef } of this.connRefs) {
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
