/**
 * Web Worker: loads AvoidRouter (WASM) and handles routing commands.
 * WASM loads exclusively in this worker — never on the main thread.
 */

// Polyfill: some WASM libraries reference `window` which doesn't exist in workers
if (typeof window === "undefined" && typeof self !== "undefined") {
  (self as unknown as Record<string, unknown>).window = self;
}

// ---- Types (inlined to keep worker self-contained) ----

type AvoidRoute = { path: string; labelX: number; labelY: number };

type AvoidRouterOptions = {
  shapeBufferDistance?: number;
  idealNudgingDistance?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
  autoBestSideConnection?: boolean;
};

type FlowNode = {
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

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  [key: string]: unknown;
};

type HandlePosition = "left" | "right" | "top" | "bottom";

type AvoidRouterWorkerCommand =
  | { command: "reset"; nodes?: FlowNode[]; edges?: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "change"; cell: FlowNode | FlowEdge }
  | { command: "remove"; id: string }
  | { command: "add"; cell: FlowNode | FlowEdge }
  | { command: "updateNodes"; nodes?: FlowNode[] }
  | { command: "route"; nodes?: FlowNode[]; edges?: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "close" };

// ---- WASM Library Types ----

type AvoidLibInstance = {
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

const LIBAVOID_WASM_URL = "/libavoid.wasm";
const WASM_RETRY_DELAY_MS = 2000;
const WASM_MAX_RETRIES = 5;

let avoidLib: AvoidLibInstance | null = null;

async function loadWasm(): Promise<boolean> {
  if (avoidLib != null) return true;
  for (let attempt = 1; attempt <= WASM_MAX_RETRIES; attempt++) {
    const origin = (globalThis as unknown as { location?: { origin?: string } }).location?.origin;
    const absoluteUrl = origin && LIBAVOID_WASM_URL.startsWith("/") ? `${origin}${LIBAVOID_WASM_URL}` : LIBAVOID_WASM_URL;
    try {
      const mod = (await import("libavoid-js")) as unknown as {
        default?: { load?: (filePath?: string) => Promise<void>; getInstance?: () => AvoidLibInstance };
        AvoidLib?: { load?: (filePath?: string) => Promise<void>; getInstance?: () => AvoidLibInstance };
      };
      const AvoidLib = mod.AvoidLib ?? mod.default;
      if (!AvoidLib?.load) return false;
      await AvoidLib.load(absoluteUrl);
      const lib = AvoidLib.getInstance?.();
      if (lib == null) return false;
      avoidLib = lib;
      return true;
    } catch {
      if (attempt < WASM_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, WASM_RETRY_DELAY_MS));
      }
    }
  }
  return false;
}

// ---- Routing Logic ----

function getNodeBounds(node: FlowNode): { x: number; y: number; w: number; h: number } {
  const x = node.position?.x ?? 0;
  const y = node.position?.y ?? 0;
  const w = Number((node.measured?.width ?? node.width ?? (node.style as { width?: number })?.width) ?? 150);
  const h = Number((node.measured?.height ?? node.height ?? (node.style as { height?: number })?.height) ?? 50);
  return { x, y, w, h };
}

function getNodeBoundsAbsolute(node: FlowNode, nodeById: Map<string, FlowNode>): { x: number; y: number; w: number; h: number } {
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
  const raw =
    kind === "source"
      ? (node.sourcePosition as string | undefined) ?? (node as { data?: { sourcePosition?: string } }).data?.sourcePosition
      : (node.targetPosition as string | undefined) ?? (node as { data?: { targetPosition?: string } }).data?.targetPosition;
  const s = String(raw ?? "").toLowerCase();
  if (s === "left" || s === "right" || s === "top" || s === "bottom") return s;
  return kind === "source" ? "right" : "left";
}

function getHandlePoint(bounds: { x: number; y: number; w: number; h: number }, position: HandlePosition): { x: number; y: number } {
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

function snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
  if (gridSize <= 0) return { x, y };
  return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
}

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


function getBestSides(
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
    // Horizontal dominant
    return dx >= 0
      ? { sourcePos: "right", targetPos: "left" }
      : { sourcePos: "left", targetPos: "right" };
  } else {
    // Vertical dominant
    return dy >= 0
      ? { sourcePos: "bottom", targetPos: "top" }
      : { sourcePos: "top", targetPos: "bottom" };
  }
}

function routeAll(nodes: FlowNode[], edges: FlowEdge[], options?: AvoidRouterOptions): Record<string, AvoidRoute> {
  const Avoid = avoidLib;
  if (!Avoid) return {};

  const shapeBuffer = options?.shapeBufferDistance ?? 8;
  const idealNudging = options?.idealNudgingDistance ?? 10;
  const cornerRadius = options?.edgeRounding ?? 0;
  const gridSize = options?.diagramGridSize ?? 0;
  const splitNearHandle = options?.shouldSplitEdgesNearHandle ?? false;
  const autoBestSide = options?.autoBestSideConnection ?? false;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  // Only non-group nodes are obstacles — groups are transparent containers
  // so all edges route in a single pass with correct edge-to-edge spacing.
  const obstacleNodes = nodes.filter((n) => n.type !== "group");

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

  const PIN_CENTER = 1, PIN_TOP = 2, PIN_BOTTOM = 3, PIN_LEFT = 4, PIN_RIGHT = 5;
  const pinIdForPosition: Record<HandlePosition, number> = { top: PIN_TOP, bottom: PIN_BOTTOM, left: PIN_LEFT, right: PIN_RIGHT };
  const pinProportions: Record<number, { x: number; y: number; dir: number }> = {
    [PIN_CENTER]: { x: 0.5, y: 0.5, dir: Avoid.ConnDirAll },
    [PIN_TOP]: { x: 0.5, y: 0, dir: Avoid.ConnDirUp },
    [PIN_BOTTOM]: { x: 0.5, y: 1, dir: Avoid.ConnDirDown },
    [PIN_LEFT]: { x: 0, y: 0.5, dir: Avoid.ConnDirLeft },
    [PIN_RIGHT]: { x: 1, y: 0.5, dir: Avoid.ConnDirRight },
  };

  const shapeRefMap = new Map<string, unknown>();
  const shapeRefs: { ref: unknown }[] = [];
  for (const node of obstacleNodes) {
    const b = nodeBounds.get(node.id)!;
    const topLeft = new Avoid.Point(b.x, b.y);
    const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
    const rect = new Avoid.Rectangle(topLeft, bottomRight);
    const shapeRef = new Avoid.ShapeRef(router, rect);
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
    connRef.setRoutingType(Avoid.ConnType_Orthogonal);
    connRefs.push({ edgeId: edge.id, connRef });
  }

  try {
    router.processTransaction();
  } catch {
    for (const { connRef } of connRefs) try { router.deleteConnector(connRef); } catch { /* */ }
    for (const { ref } of shapeRefs) try { router.deleteShape(ref); } catch { /* */ }
    return result;
  }

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
      const path = polylineToPath(points.length, (i) => points[i], { gridSize: gridSize || undefined, cornerRadius });
      const mid = Math.floor(points.length / 2);
      const midP = points[mid];
      const labelP = gridSize > 0 ? snapToGrid(midP.x, midP.y, gridSize) : midP;
      result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y };
    } catch {
      // skip
    }
  }

  for (const { connRef } of connRefs) try { router.deleteConnector(connRef); } catch { /* */ }
  for (const { ref } of shapeRefs) try { router.deleteShape(ref); } catch { /* */ }

  return result;
}

// ---- Load WASM ----
const routerLoaded = loadWasm();
routerLoaded.then((success) => {
  postMessage({ command: "loaded", success } as const);
}).catch(() => {
  postMessage({ command: "loaded", success: false } as const);
});

// ---- Internal model ----
let currentNodes: FlowNode[] = [];
let currentEdges: FlowEdge[] = [];
let currentOptions: AvoidRouterOptions = {};

function isNode(cell: FlowNode | FlowEdge): cell is FlowNode {
  return "position" in cell && ("width" in cell || "measured" in cell || !("source" in cell));
}

function doRoute(): Record<string, AvoidRoute> {
  const avoidEdges = currentEdges.filter((e) => e.type === "avoidNodes");
  if (avoidEdges.length === 0) return {};
  try {
    return routeAll(currentNodes, avoidEdges, currentOptions);
  } catch {
    return {};
  }
}

// ---- Debounce ----
const DEBOUNCE_MS = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function isPending() { return debounceTimer != null; }
function cancelDebounce() {
  if (debounceTimer != null) { clearTimeout(debounceTimer); debounceTimer = null; }
}

function debouncedRoute() {
  cancelDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const routes = doRoute();
    setTimeout(() => {
      if (!isPending()) {
        postMessage({ command: "routed", routes } as const);
      }
    }, 0);
  }, DEBOUNCE_MS);
}

// ---- Message handler ----
onmessage = async (e: MessageEvent<AvoidRouterWorkerCommand>) => {
  await routerLoaded;

  const msg = e.data;
  if (!msg || typeof msg !== "object" || !("command" in msg)) return;

  switch (msg.command) {
    case "reset":
      currentNodes = msg.nodes ?? [];
      currentEdges = msg.edges ?? [];
      if (msg.options) currentOptions = msg.options;
      debouncedRoute();
      break;

    case "change": {
      const cell = msg.cell;
      if (isNode(cell)) {
        const i = currentNodes.findIndex((n) => n.id === cell.id);
        if (i >= 0) currentNodes[i] = { ...currentNodes[i], ...cell };
        else currentNodes.push(cell);
      } else {
        const i = currentEdges.findIndex((ed) => ed.id === cell.id);
        if (i >= 0) currentEdges[i] = { ...currentEdges[i], ...cell };
        else currentEdges.push(cell);
      }
      debouncedRoute();
      break;
    }

    case "remove": {
      const id = msg.id;
      currentNodes = currentNodes.filter((n) => n.id !== id);
      currentEdges = currentEdges.filter((ed) => ed.id !== id);
      debouncedRoute();
      break;
    }

    case "add": {
      const cell = msg.cell;
      if (isNode(cell)) {
        if (!currentNodes.some((n) => n.id === cell.id)) currentNodes.push(cell);
      } else {
        if (!currentEdges.some((ed) => ed.id === cell.id)) currentEdges.push(cell);
      }
      debouncedRoute();
      break;
    }

    case "updateNodes": {
      const updatedNodes = msg.nodes ?? [];
      for (const updated of updatedNodes) {
        const i = currentNodes.findIndex((n) => n.id === updated.id);
        if (i >= 0) currentNodes[i] = { ...currentNodes[i], ...updated };
        else currentNodes.push(updated);
      }
      debouncedRoute();
      break;
    }

    case "route": {
      const routeNodes = msg.nodes ?? [];
      const routeEdges = (msg.edges ?? []).filter((ed: FlowEdge) => ed.type === "avoidNodes");
      const routeOptions = msg.options ?? currentOptions;
      if (routeEdges.length === 0) {
        postMessage({ command: "routed", routes: {} } as const);
        break;
      }
      try {
        const routes = routeAll(routeNodes, routeEdges, routeOptions);
        postMessage({ command: "routed", routes } as const);
      } catch {
        postMessage({ command: "routed", routes: {} } as const);
      }
      break;
    }

    case "close":
      cancelDebounce();
      self.close();
      break;

    default:
      break;
  }
};
