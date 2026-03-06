/**
 * React Flow integration for libavoid-js: route edges so they avoid nodes.
 * Use AvoidRouter.load() once, then AvoidRouter.getInstance().routeAll(nodes, edges).
 */

import type { Node, Edge } from "@xyflow/react";

/** Result for one edge: SVG path and label position. */
export type AvoidRoute = { path: string; labelX: number; labelY: number };

/** Options for routing (buffer, nudging, rounding, grid snap). */
export type AvoidRouterOptions = {
  shapeBufferDistance?: number;
  idealNudgingDistance?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
};

/** Handle position on node boundary. */
export type HandlePosition = "left" | "right" | "top" | "bottom";

const LIBAVOID_WASM_URL = "/libavoid.wasm";
const WASM_RETRY_DELAY_MS = 2000;
const WASM_MAX_RETRIES = 5;

/** Emscripten enum value — has a .value property with the raw number. */
type EnumVal = { value: number };

/**
 * libavoid-js v0.5.0-beta.5 API:
 * - Enums are Emscripten enum objects with a `.value` property (not plain numbers).
 * - ConnDir flags are raw numbers: Up=1, Down=2, Left=4, Right=8, All=15.
 * - PolyLine uses `.at(i)` not `.get_ps(i)`.
 * - Cleanup uses `router.delete()`.
 */
type AvoidLibInstance = {
  Router: new (flags: number) => {
    setRoutingParameter: (p: number, v: number) => void;
    setRoutingOption: (o: number, v: boolean) => void;
    processTransaction: () => void;
    deleteConnector: (c: unknown) => void;
    deleteShape: (s: unknown) => void;
    delete: () => void;
  };
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
    displayRoute: () => { size: () => number; at: (i: number) => { x: number; y: number } };
  };
  RouterFlag: { OrthogonalRouting: EnumVal; PolyLineRouting: EnumVal };
  ConnType: { ConnType_Orthogonal: EnumVal; ConnType_PolyLine: EnumVal; ConnType_None: EnumVal };
  RoutingParameter: { shapeBufferDistance: EnumVal; idealNudgingDistance: EnumVal; [k: string]: EnumVal };
  RoutingOption: {
    nudgeOrthogonalSegmentsConnectedToShapes: EnumVal;
    nudgeSharedPathsWithCommonEndPoint: EnumVal;
    performUnifyingNudgingPreprocessingStep: EnumVal;
    [k: string]: EnumVal;
  };
};

/**
 * AvoidRouter: routes diagram edges around nodes using libavoid-js (WASM).
 */
export class AvoidRouter {
  private static lib: AvoidLibInstance | null = null;
  private static instance: AvoidRouter | null = null;

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

  static getInstance(): AvoidRouter {
    if (AvoidRouter.instance == null) AvoidRouter.instance = new AvoidRouter();
    if (AvoidRouter.lib == null) throw new Error("AvoidRouter.load() must be called first.");
    return AvoidRouter.instance;
  }

  routeAll(nodes: Node[], edges: Edge[], options?: AvoidRouterOptions): Record<string, AvoidRoute> {
    const Avoid = AvoidRouter.lib;
    if (!Avoid) return {};

    const shapeBuffer = options?.shapeBufferDistance ?? 8;
    const idealNudging = options?.idealNudgingDistance ?? 10;
    const cornerRadius = options?.edgeRounding ?? 0;
    const gridSize = options?.diagramGridSize ?? 0;

    const obstacleNodes = nodes.filter((n) => n.type !== "group");
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const nodeBounds = new Map(obstacleNodes.map((n) => [n.id, this.getNodeBoundsAbsolute(n, nodeById)]));

    const router = new Avoid.Router(Avoid.RouterFlag.OrthogonalRouting.value);
    router.setRoutingParameter(Avoid.RoutingParameter.shapeBufferDistance.value, shapeBuffer);
    router.setRoutingParameter(Avoid.RoutingParameter.idealNudgingDistance.value, idealNudging);
    router.setRoutingOption(Avoid.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes.value, true);
    router.setRoutingOption(Avoid.RoutingOption.nudgeSharedPathsWithCommonEndPoint.value, true);
    router.setRoutingOption(Avoid.RoutingOption.performUnifyingNudgingPreprocessingStep.value, true);

    const PIN_CENTER = 1;
    const PIN_TOP = 2;
    const PIN_BOTTOM = 3;
    const PIN_LEFT = 4;
    const PIN_RIGHT = 5;

    const pinIdForPosition: Record<HandlePosition, number> = {
      top: PIN_TOP,
      bottom: PIN_BOTTOM,
      left: PIN_LEFT,
      right: PIN_RIGHT,
    };

    // ConnDir flags from Adaptagrams: Up=1, Down=2, Left=4, Right=8, All=15
    const CONN_DIR_UP = 1;
    const CONN_DIR_DOWN = 2;
    const CONN_DIR_LEFT = 4;
    const CONN_DIR_RIGHT = 8;
    const CONN_DIR_ALL = 15;

    const pinProportions: Record<number, { x: number; y: number; dir: number }> = {
      [PIN_CENTER]: { x: 0.5, y: 0.5, dir: CONN_DIR_ALL },
      [PIN_TOP]: { x: 0.5, y: 0, dir: CONN_DIR_UP },
      [PIN_BOTTOM]: { x: 0.5, y: 1, dir: CONN_DIR_DOWN },
      [PIN_LEFT]: { x: 0, y: 0.5, dir: CONN_DIR_LEFT },
      [PIN_RIGHT]: { x: 1, y: 0.5, dir: CONN_DIR_RIGHT },
    };

    // Pad each shape rectangle so libavoid routes edges with clearance from the
    // visual node border. Without this, edges connected to a node can hug its
    // boundary because libavoid doesn't treat the connected shape as an obstacle
    // for that specific edge.
    const shapePadding = shapeBuffer;

    const shapeRefMap = new Map<string, unknown>();
    const shapeRefs: { ref: unknown }[] = [];
    for (const node of obstacleNodes) {
      const b = nodeBounds.get(node.id)!;
      const topLeft = new Avoid.Point(b.x - shapePadding, b.y - shapePadding);
      const bottomRight = new Avoid.Point(b.x + b.w + shapePadding, b.y + b.h + shapePadding);
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

      // If nodes have explicit handle positions, use those; otherwise auto-detect
      // best side based on relative positions so edges don't clip through their own node.
      const explicitSrcPos = this.getExplicitHandlePosition(src, "source");
      const explicitTgtPos = this.getExplicitHandlePosition(tgt, "target");

      let sourcePos: HandlePosition;
      let targetPos: HandlePosition;

      if (explicitSrcPos && explicitTgtPos) {
        sourcePos = explicitSrcPos;
        targetPos = explicitTgtPos;
      } else {
        const srcBounds = nodeBounds.get(src.id)!;
        const tgtBounds = nodeBounds.get(tgt.id)!;
        const auto = this.autoDetectSides(srcBounds, tgtBounds);
        sourcePos = explicitSrcPos ?? auto.source;
        targetPos = explicitTgtPos ?? auto.target;
      }

      let srcEnd: unknown;
      let tgtEnd: unknown;

      if (srcShapeRef) {
        const pinId = pinIdForPosition[sourcePos] ?? PIN_CENTER;
        srcEnd = new Avoid.ConnEnd(srcShapeRef, pinId);
      } else {
        const sb = this.getNodeBoundsAbsolute(src, nodeById);
        const sourcePt = this.getHandlePoint(sb, sourcePos);
        srcEnd = new Avoid.ConnEnd(new Avoid.Point(sourcePt.x, sourcePt.y));
      }

      if (tgtShapeRef) {
        const pinId = pinIdForPosition[targetPos] ?? PIN_CENTER;
        tgtEnd = new Avoid.ConnEnd(tgtShapeRef, pinId);
      } else {
        const tb = this.getNodeBoundsAbsolute(tgt, nodeById);
        const targetPt = this.getHandlePoint(tb, targetPos);
        tgtEnd = new Avoid.ConnEnd(new Avoid.Point(targetPt.x, targetPt.y));
      }

      const connRef = new Avoid.ConnRef(router, srcEnd, tgtEnd);
      connRef.setRoutingType(Avoid.ConnType.ConnType_Orthogonal.value);
      connRefs.push({ edgeId: edge.id, connRef });
    }

    try {
      router.processTransaction();
    } catch {
      this.cleanup(router);
      return {};
    }

    const result: Record<string, AvoidRoute> = {};
    for (const { edgeId, connRef } of connRefs) {
      try {
        const route = (connRef as { displayRoute(): { size(): number; at(i: number): { x: number; y: number } } }).displayRoute();
        const size = route.size();
        if (size < 2) continue;
        const path = this.polylineToPath(size, (i) => {
          const p = route.at(i);
          return { x: p.x, y: p.y };
        }, { gridSize: gridSize || undefined, cornerRadius });
        const mid = Math.floor(size / 2);
        const midP = route.at(mid);
        const labelP = gridSize > 0 ? this.snapToGrid(midP.x, midP.y, gridSize) : { x: midP.x, y: midP.y };
        result[edgeId] = { path, labelX: labelP.x, labelY: labelP.y };
      } catch {
        // skip
      }
    }

    this.cleanup(router);
    return result;
  }

  private getNodeBounds(node: Node): { x: number; y: number; w: number; h: number } {
    const x = node.position?.x ?? 0;
    const y = node.position?.y ?? 0;
    const w = Number((node.measured?.width ?? node.width ?? (node.style as { width?: number })?.width) ?? 150);
    const h = Number((node.measured?.height ?? node.height ?? (node.style as { height?: number })?.height) ?? 50);
    return { x, y, w, h };
  }

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

  /**
   * Returns the explicitly set handle position on a node, or undefined if none is set.
   */
  private getExplicitHandlePosition(node: Node, kind: "source" | "target"): HandlePosition | undefined {
    const raw =
      kind === "source"
        ? (node.sourcePosition as string | undefined) ?? (node as { data?: { sourcePosition?: string } }).data?.sourcePosition
        : (node.targetPosition as string | undefined) ?? (node as { data?: { targetPosition?: string } }).data?.targetPosition;
    const s = String(raw ?? "").toLowerCase();
    if (s === "left" || s === "right" || s === "top" || s === "bottom") return s;
    return undefined;
  }

  /**
   * Auto-detect the best side for source and target based on relative node positions.
   * Picks the side that faces the other node so edges don't clip through their own node.
   */
  private autoDetectSides(
    srcBounds: { x: number; y: number; w: number; h: number },
    tgtBounds: { x: number; y: number; w: number; h: number }
  ): { source: HandlePosition; target: HandlePosition } {
    const srcCx = srcBounds.x + srcBounds.w / 2;
    const srcCy = srcBounds.y + srcBounds.h / 2;
    const tgtCx = tgtBounds.x + tgtBounds.w / 2;
    const tgtCy = tgtBounds.y + tgtBounds.h / 2;

    const dx = tgtCx - srcCx;
    const dy = tgtCy - srcCy;

    let source: HandlePosition;
    let target: HandlePosition;

    // Pick side based on which axis has greater separation
    if (Math.abs(dx) >= Math.abs(dy)) {
      // Horizontal separation dominates
      source = dx >= 0 ? "right" : "left";
      target = dx >= 0 ? "left" : "right";
    } else {
      // Vertical separation dominates
      source = dy >= 0 ? "bottom" : "top";
      target = dy >= 0 ? "top" : "bottom";
    }

    return { source, target };
  }

  private getHandlePoint(
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

  private snapToGrid(x: number, y: number, gridSize: number): { x: number; y: number } {
    if (gridSize <= 0) return { x, y };
    return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
  }

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

  private cleanup(router: { delete: () => void }): void {
    try {
      router.delete();
    } catch {
      // ignore
    }
  }
}

export async function loadAvoidRouter(): Promise<boolean> {
  return AvoidRouter.load();
}

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
