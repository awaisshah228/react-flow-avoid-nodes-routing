/**
 * PersistentRouter — keeps a libavoid Router alive across calls so that
 * incremental updates (node drag) use moveShape_delta instead of full rebuild.
 *
 * - initialize(): full setup — create router, all shapes + pins, all connectors
 * - moveNodes():  incremental — moveShape_delta for moved nodes, processTransaction
 * - destroy():    tear down all refs and the router
 */

import {
  type AvoidLibInstance,
  type AvoidRouter,
  type AvoidConnRef,
  type AvoidRoute,
  type AvoidRouterOptions,
  type FlowNode,
  type FlowEdge,
  type HandlePosition,
  c,
  createAvoidRouter,
  getPinProportions,
  ALL_PIN_IDS,
  PIN_CENTER,
  pinIdForPosition,
  getNodeBoundsAbsolute,
  getHandlePosition,
  getHandlePoint,
  getBestSides,
  readRoutesFromConnRefs,
} from "./routing-core";

export class PersistentRouter {
  private Avoid: AvoidLibInstance;
  private router: AvoidRouter | null = null;
  private shapeRefMap = new Map<string, unknown>();
  private connRefList: { edgeId: string; connRef: AvoidConnRef }[] = [];
  private lastBounds = new Map<string, { x: number; y: number; w: number; h: number }>();
  private currentOptions: AvoidRouterOptions = {};
  private currentEdges: FlowEdge[] = [];
  private nodeById = new Map<string, FlowNode>();

  constructor(Avoid: AvoidLibInstance) {
    this.Avoid = Avoid;
  }

  isInitialized(): boolean {
    return this.router != null;
  }

  /**
   * Full setup: create router, add all shapes/pins/connectors, process, read routes.
   */
  initialize(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: AvoidRouterOptions = {}
  ): Record<string, AvoidRoute> {
    this.destroy();

    const Avoid = this.Avoid;
    this.currentOptions = options;
    this.currentEdges = edges;
    this.nodeById = new Map(nodes.map((n) => [n.id, n]));

    const splitNearHandle = options.shouldSplitEdgesNearHandle ?? false;
    const autoBestSide = options.autoBestSideConnection ?? false;
    const obstacleNodes = nodes.filter((n) => n.type !== "group");
    const pinProportions = getPinProportions(Avoid);

    this.router = createAvoidRouter(Avoid, options);
    const router = this.router;

    // Create shapes + pins
    for (const node of obstacleNodes) {
      const b = getNodeBoundsAbsolute(node, this.nodeById);
      this.lastBounds.set(node.id, { ...b });
      const topLeft = new Avoid.Point(b.x, b.y);
      const bottomRight = new Avoid.Point(b.x + b.w, b.y + b.h);
      const rect = new Avoid.Rectangle(topLeft, bottomRight);
      const shapeRef = new Avoid.ShapeRef(router, rect);
      this.shapeRefMap.set(node.id, shapeRef);
      for (const pinId of ALL_PIN_IDS) {
        const p = pinProportions[pinId];
        const pin = new Avoid.ShapeConnectionPin(shapeRef, pinId, p.x, p.y, true, 0, p.dir);
        pin.setExclusive(false);
      }
    }

    // Create connectors
    this.connRefList = [];
    for (const edge of edges) {
      const connRef = this.createConnector(edge, splitNearHandle, autoBestSide);
      if (connRef) this.connRefList.push({ edgeId: edge.id, connRef });
    }

    try {
      router.processTransaction();
    } catch {
      this.destroy();
      return {};
    }

    return readRoutesFromConnRefs(this.connRefList, this.currentEdges, this.currentOptions);
  }

  /**
   * Incremental update: move changed shapes via moveShape_delta, re-process, read routes.
   * Falls back to full re-initialize if a shape is missing or dimensions changed.
   */
  moveNodes(
    changedNodes: FlowNode[],
    allNodes: FlowNode[]
  ): Record<string, AvoidRoute> {
    if (!this.router) return {};
    const Avoid = this.Avoid;
    const router = this.router;

    // Update nodeById with latest positions
    for (const n of allNodes) this.nodeById.set(n.id, n);

    let needsFullReset = false;
    const movedNodeIds = new Set<string>();

    for (const node of changedNodes) {
      const shapeRef = this.shapeRefMap.get(node.id);
      if (!shapeRef) continue; // group node or unknown — skip

      const oldB = this.lastBounds.get(node.id);
      const newB = getNodeBoundsAbsolute(node, this.nodeById);

      if (!oldB) {
        needsFullReset = true;
        break;
      }

      // If dimensions changed, must use moveShape_poly with new rectangle
      if (Math.abs(newB.w - oldB.w) > 0.5 || Math.abs(newB.h - oldB.h) > 0.5) {
        const topLeft = new Avoid.Point(newB.x, newB.y);
        const bottomRight = new Avoid.Point(newB.x + newB.w, newB.y + newB.h);
        const newRect = new Avoid.Rectangle(topLeft, bottomRight);
        router.moveShape_poly(shapeRef, newRect);
      } else {
        // Position-only change: use efficient delta move
        const dx = newB.x - oldB.x;
        const dy = newB.y - oldB.y;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          router.moveShape_delta(shapeRef, dx, dy);
        }
      }

      this.lastBounds.set(node.id, { ...newB });
      movedNodeIds.add(node.id);
    }

    if (needsFullReset) {
      return this.initialize(allNodes, this.currentEdges, this.currentOptions);
    }

    // Update free-point connector endpoints for moved nodes (when not using pin-based endpoints)
    const splitNearHandle = this.currentOptions.shouldSplitEdgesNearHandle ?? false;
    const autoBestSide = this.currentOptions.autoBestSideConnection ?? false;
    if (!splitNearHandle || autoBestSide) {
      for (const { edgeId, connRef } of this.connRefList) {
        const edge = this.currentEdges.find((e) => e.id === edgeId);
        if (!edge) continue;
        const srcMoved = movedNodeIds.has(edge.source);
        const tgtMoved = movedNodeIds.has(edge.target);
        if (!srcMoved && !tgtMoved) continue;

        const src = this.nodeById.get(edge.source);
        const tgt = this.nodeById.get(edge.target);
        if (!src || !tgt) continue;

        let sourcePos = getHandlePosition(src, "source");
        let targetPos = getHandlePosition(tgt, "target");
        if (autoBestSide) {
          const sb = getNodeBoundsAbsolute(src, this.nodeById);
          const tb = getNodeBoundsAbsolute(tgt, this.nodeById);
          const best = getBestSides(sb, tb);
          sourcePos = best.sourcePos;
          targetPos = best.targetPos;
        }

        if (!splitNearHandle) {
          if (srcMoved) {
            const sb = getNodeBoundsAbsolute(src, this.nodeById);
            const pt = getHandlePoint(sb, sourcePos);
            connRef.setSourceEndpoint(new Avoid.ConnEnd(new Avoid.Point(pt.x, pt.y)));
          }
          if (tgtMoved) {
            const tb = getNodeBoundsAbsolute(tgt, this.nodeById);
            const pt = getHandlePoint(tb, targetPos);
            connRef.setDestEndpoint(new Avoid.ConnEnd(new Avoid.Point(pt.x, pt.y)));
          }
        } else if (autoBestSide) {
          // Pin-based but best-side might have changed — update endpoints
          const srcShapeRef = this.shapeRefMap.get(edge.source);
          const tgtShapeRef = this.shapeRefMap.get(edge.target);
          if (srcMoved && srcShapeRef) {
            connRef.setSourceEndpoint(new Avoid.ConnEnd(srcShapeRef, pinIdForPosition[sourcePos] ?? PIN_CENTER));
          }
          if (tgtMoved && tgtShapeRef) {
            connRef.setDestEndpoint(new Avoid.ConnEnd(tgtShapeRef, pinIdForPosition[targetPos] ?? PIN_CENTER));
          }
        }
      }
    }

    try {
      router.processTransaction();
    } catch {
      // Fallback to full reset on error
      return this.initialize(allNodes, this.currentEdges, this.currentOptions);
    }

    return readRoutesFromConnRefs(this.connRefList, this.currentEdges, this.currentOptions);
  }

  /**
   * Clean up all libavoid objects and free WASM memory.
   */
  destroy(): void {
    if (!this.router) return;
    try {
      for (const { connRef } of this.connRefList) this.router.deleteConnector(connRef);
      for (const ref of this.shapeRefMap.values()) this.router.deleteShape(ref);
      this.router.delete();
    } catch {
      // ignore cleanup errors
    }
    this.router = null;
    this.shapeRefMap.clear();
    this.connRefList = [];
    this.lastBounds.clear();
    this.nodeById.clear();
  }

  // ---- Private helpers ----

  private createConnector(
    edge: FlowEdge,
    splitNearHandle: boolean,
    autoBestSide: boolean
  ): AvoidConnRef | null {
    const Avoid = this.Avoid;
    const router = this.router!;
    const src = this.nodeById.get(edge.source);
    const tgt = this.nodeById.get(edge.target);
    if (!src || !tgt) return null;

    const srcShapeRef = this.shapeRefMap.get(edge.source);
    const tgtShapeRef = this.shapeRefMap.get(edge.target);

    let sourcePos: HandlePosition = getHandlePosition(src, "source");
    let targetPos: HandlePosition = getHandlePosition(tgt, "target");
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
      srcEnd = srcShapeRef
        ? new Avoid.ConnEnd(srcShapeRef, pinIdForPosition[sourcePos] ?? PIN_CENTER)
        : new Avoid.ConnEnd(new Avoid.Point(...this.handlePt(src, sourcePos)));
      tgtEnd = tgtShapeRef
        ? new Avoid.ConnEnd(tgtShapeRef, pinIdForPosition[targetPos] ?? PIN_CENTER)
        : new Avoid.ConnEnd(new Avoid.Point(...this.handlePt(tgt, targetPos)));
    } else {
      srcEnd = new Avoid.ConnEnd(new Avoid.Point(...this.handlePt(src, sourcePos)));
      tgtEnd = new Avoid.ConnEnd(new Avoid.Point(...this.handlePt(tgt, targetPos)));
    }

    const connRef = new Avoid.ConnRef(router, srcEnd, tgtEnd);
    connRef.setRoutingType(c(Avoid).ConnType_Orthogonal);
    return connRef;
  }

  private handlePt(node: FlowNode, pos: HandlePosition): [number, number] {
    const b = getNodeBoundsAbsolute(node, this.nodeById);
    const pt = getHandlePoint(b, pos);
    return [pt.x, pt.y];
  }
}
