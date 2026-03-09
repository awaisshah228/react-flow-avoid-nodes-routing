/**
 * React Flow integration for libavoid-js: route edges so they avoid nodes (excluding group nodes).
 * Use AvoidRouter.load() once, then AvoidRouter.getInstance().routeAll(nodes, edges).
 */

// Import React Flow types for nodes and edges used throughout the router
import type { Node, Edge } from "@xyflow/react";

// Represents the routed result for a single edge — the SVG path string and the x/y position for a label
export type AvoidRoute = { path: string; labelX: number; labelY: number };

// Configuration options that control how edges are routed around nodes
export type AvoidRouterOptions = {
  shapeBufferDistance?: number;       // Extra padding around each node that edges must avoid
  idealNudgingDistance?: number;      // How far apart parallel edge segments should be nudged
  edgeRounding?: number;             // Corner radius for rounded orthogonal bends
  diagramGridSize?: number;          // Snap edge waypoints to a grid of this size
  shouldSplitEdgesNearHandle?: boolean; // Fixed-point handles (edges share exit point, then diverge)
  autoBestSideConnection?: boolean;    // Auto-detect best handle side based on relative node positions
};

// Which side of a node a handle (connection point) is on
export type HandlePosition = "left" | "right" | "top" | "bottom";

// Default URL to load the libavoid WebAssembly binary from
const LIBAVOID_WASM_URL = "/libavoid.wasm";
// How long to wait between retries if WASM loading fails (in milliseconds)
const WASM_RETRY_DELAY_MS = 2000;
// Maximum number of times to retry loading the WASM module
const WASM_MAX_RETRIES = 5;

// Type definition for the libavoid-js WASM library instance.
// Maps all the constructors (Router, Point, Rectangle, etc.) and constants
// (direction flags, routing options) that we use from the C++ libavoid library.
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

/**
 * AvoidRouter: routes diagram edges around nodes using libavoid-js (WASM).
 * Use static load() once, then getInstance().routeAll(nodes, edges).
 */
export class AvoidRouter {
  // Singleton references — the WASM library and the single router instance
  private static lib: AvoidLibInstance | null = null;
  private static instance: AvoidRouter | null = null;

  // Loads the libavoid WASM module with retry logic.
  // Retries up to WASM_MAX_RETRIES times with a delay between attempts.
  // Returns true if the library loaded successfully, false otherwise.
  static async load(wasmUrl: string = LIBAVOID_WASM_URL): Promise<boolean> {
    if (AvoidRouter.lib != null) return true;
    if (typeof globalThis === "undefined") return false;
    for (let attempt = 1; attempt <= WASM_MAX_RETRIES; attempt++) {
      const ok = await AvoidRouter.loadOnce(wasmUrl);
      if (ok) return true;
      if (attempt < WASM_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, WASM_RETRY_DELAY_MS));
      }
    }
    return false;
  }

  // Single attempt to load the WASM module.
  // Resolves the WASM URL to an absolute path, dynamically imports libavoid-js,
  // calls its load() to initialize the WASM, then stores the library instance.
  private static async loadOnce(wasmUrl: string): Promise<boolean> {
    const origin = (globalThis as unknown as { location?: { origin?: string } }).location?.origin;
    const absoluteWasmUrl = origin && wasmUrl.startsWith("/") ? `${origin}${wasmUrl}` : wasmUrl;

    try {
      const mod = (await import("libavoid-js")) as unknown as {
        default?: { load?: (filePath?: string) => Promise<void>; getInstance?: () => AvoidLibInstance };
        AvoidLib?: { load?: (filePath?: string) => Promise<void>; getInstance?: () => AvoidLibInstance };
      };
      const AvoidLib = mod.AvoidLib ?? mod.default;
      if (!AvoidLib?.load) return false;
      await AvoidLib.load(absoluteWasmUrl);
      const lib = AvoidLib.getInstance?.();
      if (lib == null) return false;
      AvoidRouter.lib = lib;
      return true;
    } catch {
      return false;
    }
  }

  // Returns the singleton AvoidRouter instance.
  // Throws if the WASM library hasn't been loaded yet via load().
  static getInstance(): AvoidRouter {
    if (AvoidRouter.instance == null) AvoidRouter.instance = new AvoidRouter();
    if (AvoidRouter.lib == null) throw new Error("AvoidRouter.load() must be called first.");
    return AvoidRouter.instance;
  }

  // Main routing method — takes all nodes and edges, computes obstacle-avoiding
  // orthogonal paths for every edge, and returns a map of edgeId -> AvoidRoute.
  //
  // Steps:
  // 1. Filter out group nodes (only real nodes are obstacles)
  // 2. Create a libavoid Router and configure its parameters
  // 3. Register each node as a rectangular obstacle shape with connection pins
  // 4. Create a connector (ConnRef) for each edge between source/target pins
  // 5. Run the routing algorithm (processTransaction)
  // 6. Extract the routed polyline for each edge and convert to SVG path
  // 7. Clean up all libavoid objects to free WASM memory
  private getBestSides(
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

  routeAll(nodes: Node[], edges: Edge[], options?: AvoidRouterOptions): Record<string, AvoidRoute> {
    const Avoid = AvoidRouter.lib;
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

    const nodeBounds = new Map(obstacleNodes.map((n) => [n.id, this.getNodeBoundsAbsolute(n, nodeById)]));

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
      let sourcePos = this.getHandlePosition(src, "source");
      let targetPos = this.getHandlePosition(tgt, "target");
      if (autoBestSide) {
        const sb = this.getNodeBoundsAbsolute(src, nodeById);
        const tb = this.getNodeBoundsAbsolute(tgt, nodeById);
        const best = this.getBestSides(sb, tb);
        sourcePos = best.sourcePos;
        targetPos = best.targetPos;
      }
      let srcEnd: unknown;
      let tgtEnd: unknown;
      if (splitNearHandle) {
        if (srcShapeRef) {
          srcEnd = new Avoid.ConnEnd(srcShapeRef, pinIdForPosition[sourcePos] ?? PIN_CENTER);
        } else {
          const sb = this.getNodeBoundsAbsolute(src, nodeById);
          const sourcePt = this.getHandlePoint(sb, sourcePos);
          srcEnd = new Avoid.ConnEnd(new Avoid.Point(sourcePt.x, sourcePt.y));
        }
        if (tgtShapeRef) {
          tgtEnd = new Avoid.ConnEnd(tgtShapeRef, pinIdForPosition[targetPos] ?? PIN_CENTER);
        } else {
          const tb = this.getNodeBoundsAbsolute(tgt, nodeById);
          const targetPt = this.getHandlePoint(tb, targetPos);
          tgtEnd = new Avoid.ConnEnd(new Avoid.Point(targetPt.x, targetPt.y));
        }
      } else {
        const sb = this.getNodeBoundsAbsolute(src, nodeById);
        const sourcePt = this.getHandlePoint(sb, sourcePos);
        srcEnd = new Avoid.ConnEnd(new Avoid.Point(sourcePt.x, sourcePt.y));
        const tb = this.getNodeBoundsAbsolute(tgt, nodeById);
        const targetPt = this.getHandlePoint(tb, targetPos);
        tgtEnd = new Avoid.ConnEnd(new Avoid.Point(targetPt.x, targetPt.y));
      }
      const connRef = new Avoid.ConnRef(router, srcEnd, tgtEnd);
      connRef.setRoutingType(Avoid.ConnType_Orthogonal);
      connRefs.push({ edgeId: edge.id, connRef });
    }

    try {
      router.processTransaction();
    } catch {
      this.cleanup(router, connRefs, shapeRefs);
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
        const path = this.polylineToPath(points.length, (i) => points[i], { gridSize: gridSize || undefined, cornerRadius });
        const mid = Math.floor(points.length / 2);
        const midP = points[mid];
        const labelP = gridSize > 0 ? this.snapToGrid(midP.x, midP.y, gridSize) : midP;
        result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y };
      } catch {
        // skip
      }
    }

    this.cleanup(router, connRefs, shapeRefs);

    return result;
  }

  // Gets the local position and dimensions of a node.
  // Tries measured size first, then explicit width/height, then style, with fallback defaults.
  private getNodeBounds(node: Node): { x: number; y: number; w: number; h: number } {
    const x = node.position?.x ?? 0;
    const y = node.position?.y ?? 0;
    const w = Number((node.measured?.width ?? node.width ?? (node.style as { width?: number })?.width) ?? 150);
    const h = Number((node.measured?.height ?? node.height ?? (node.style as { height?: number })?.height) ?? 50);
    return { x, y, w, h };
  }

  // Computes the absolute (world-space) bounds of a node by walking up
  // the parent chain and accumulating parent positions. This is needed
  // because child nodes have positions relative to their parent.
  private getNodeBoundsAbsolute(
    node: Node,
    nodeById: Map<string, Node>
  ): { x: number; y: number; w: number; h: number } {
    const b = this.getNodeBounds(node);
    let current: Node | undefined = node;
    while (current?.parentId) {
      const parent = nodeById.get(current.parentId);
      if (!parent) break;
      b.x += parent.position?.x ?? 0;
      b.y += parent.position?.y ?? 0;
      current = parent;
    }
    return b;
  }

  // Determines which side of a node a handle is on (left/right/top/bottom).
  // Checks both the node's direct properties and its data object.
  // Defaults to "right" for source handles and "left" for target handles.
  private getHandlePosition(node: Node, kind: "source" | "target"): HandlePosition {
    const raw =
      kind === "source"
        ? (node.sourcePosition as string | undefined) ?? (node as { data?: { sourcePosition?: string } }).data?.sourcePosition
        : (node.targetPosition as string | undefined) ?? (node as { data?: { targetPosition?: string } }).data?.targetPosition;
    const s = String(raw ?? "").toLowerCase();
    if (s === "left" || s === "right" || s === "top" || s === "bottom") return s;
    return kind === "source" ? "right" : "left";
  }

  // Converts a handle position (left/right/top/bottom) into an actual x/y coordinate
  // on the node's boundary. The point is at the center of the respective edge.
  private getHandlePoint(
    bounds: { x: number; y: number; w: number; h: number },
    position: HandlePosition
  ): { x: number; y: number } {
    const { x, y, w, h } = bounds;
    const cx = x + w / 2;
    const cy = y + h / 2;
    switch (position) {
      case "left":
        return { x, y: cy };
      case "right":
        return { x: x + w, y: cy };
      case "top":
        return { x: cx, y };
      case "bottom":
        return { x: cx, y: y + h };
      default:
        return { x: x + w, y: cy };
    }
  }

  // Snaps x/y coordinates to the nearest grid point (rounds to nearest multiple of gridSize)
  private snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
    if (gridSize <= 0) return { x, y };
    return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
  }

  // Converts a polyline (series of waypoints) into an SVG path string.
  // If cornerRadius > 0, adds quadratic bezier curves (Q commands) at each bend
  // to create smooth rounded corners instead of sharp right angles.
  // If cornerRadius is 0, produces a simple M/L path with straight segments.
  private polylineToPath(
    size: number,
    getPoint: (i: number) => { x: number; y: number },
    options: { gridSize?: number; cornerRadius?: number } = {}
  ): string {
    if (size < 2) return "";
    const gridSize = options.gridSize ?? 0;
    const r = Math.max(0, options.cornerRadius ?? 0);
    const pt = (i: number) => {
      const p = getPoint(i);
      return gridSize > 0 ? this.snapToGrid(p.x, p.y, gridSize) : p;
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

  // Frees all libavoid objects (connectors and shapes) from the router.
  // This is important to prevent WASM memory leaks since libavoid
  // allocates memory in the WASM heap that isn't garbage collected by JS.
  private cleanup(
    router: { deleteConnector: (c: unknown) => void; deleteShape: (s: unknown) => void },
    connRefs: { connRef: unknown }[],
    shapeRefs: { ref: unknown }[]
  ): void {
    try {
      for (const { connRef } of connRefs) router.deleteConnector(connRef);
      for (const { ref } of shapeRefs) router.deleteShape(ref);
    } catch {
      // ignore
    }
  }
}

// Convenience function to load the WASM module — wraps AvoidRouter.load()
export async function loadAvoidRouter(): Promise<boolean> {
  return AvoidRouter.load();
}

// Convenience function to route all edges — wraps AvoidRouter.getInstance().routeAll().
// Returns an empty object if routing fails for any reason.
export function routeAll(
  nodes: Node[],
  edges: Edge[],
  options?: AvoidRouterOptions
): Record<string, AvoidRoute> {
  try {
    return AvoidRouter.getInstance().routeAll(nodes, edges, options);
  } catch {
    return {};
  }
}
