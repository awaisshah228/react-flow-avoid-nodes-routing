import { NextRequest, NextResponse } from "next/server";
import { diagrams, type TabName } from "@/diagrams";
import {
  ensureWasm,
  layoutWithELK,
  expandGroups,
  toFlowNodes,
  toFlowEdges,
  routeAll,
} from "@/lib/routing";

export async function GET(request: NextRequest) {
  try {
    await ensureWasm();

    const tab = request.nextUrl.searchParams.get("tab") || "basic";
    const diagram = diagrams[tab as TabName];

    if (!diagram) {
      return NextResponse.json(
        { error: `Unknown tab: ${tab}. Available: ${Object.keys(diagrams).join(", ")}` },
        { status: 400 }
      );
    }

    let flowNodes = toFlowNodes(diagram.nodes as unknown as Array<Record<string, unknown>>);
    const flowEdges = toFlowEdges(diagram.edges as unknown as Array<Record<string, unknown>>);

    // 1. ELK layout for tabs that need it
    if (diagram.needsLayout) {
      flowNodes = await layoutWithELK(flowNodes, flowEdges);
    }

    // 2. Expand group nodes to fit their children
    flowNodes = expandGroups(flowNodes);

    // 3. Edge routing — compute SVG paths that avoid nodes
    const routes = routeAll(flowNodes, flowEdges, {
      shapeBufferDistance: 12,
      idealNudgingDistance: 10,
      edgeRounding: 8,
      autoBestSideConnection: true,
      shouldSplitEdgesNearHandle: true,
    });

    return NextResponse.json({
      tab,
      nodes: flowNodes,
      edges: diagram.edges,
      routes,
    });
  } catch (err) {
    console.error("Error processing diagram:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
