<script lang="ts">
  import { writable } from "svelte/store";
  import { onMount, onDestroy } from "svelte";
  import {
    SvelteFlow,
    SmoothStepEdge,
    StraightEdge,
    BezierEdge,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type EdgeTypes,
  } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";

  import AvoidNodesEdge from "avoid-nodes-edge-svelte/edge";
  import { createAvoidNodesRouter } from "avoid-nodes-edge-svelte";
  import { resolveCollisions } from "../utils/resolve-collisions";
  import { dagNodes, dagEdges } from "../initialElementsDAG";
  import { runAutoLayoutWithGroups, type LayoutDirection, type LayoutAlgorithmName } from "../utils/auto-layout";
  import SettingsPanel from "../SettingsPanel.svelte";
  import FitViewOnLayout from "../FitViewOnLayout.svelte";
  import CurvedAvoidEdge from "../CurvedAvoidEdge.svelte";

  type EdgeStyle = "avoidNodes" | "curvedAvoid" | "default" | "smoothstep" | "straight";

  const edgeTypeMap: Record<EdgeStyle, EdgeTypes> = {
    avoidNodes: { avoidNodes: AvoidNodesEdge as any },
    curvedAvoid: { curvedAvoid: CurvedAvoidEdge as any },
    default: { default: BezierEdge as any },
    smoothstep: { smoothstep: SmoothStepEdge as any },
    straight: { straight: StraightEdge as any },
  };

  const edgeStyleLabels: { value: EdgeStyle; label: string }[] = [
    { value: "avoidNodes", label: "Avoid Nodes" },
    { value: "curvedAvoid", label: "Curved Avoid" },
    { value: "default", label: "Bezier" },
    { value: "smoothstep", label: "Smooth Step" },
    { value: "straight", label: "Straight" },
  ];

  let edgeStyle: EdgeStyle = "avoidNodes";
  let prevRounding = 8;

  $: edgeTypes = edgeTypeMap[edgeStyle] ?? {};

  function applyEdgeType(edgeList: Edge[], style: EdgeStyle): Edge[] {
    const type = style === "default" ? undefined : style;
    return edgeList.map((e) => ({ ...e, type }));
  }

  const nodes = writable<Node[]>(dagNodes);
  const baseEdges = writable<Edge[]>(dagEdges);

  const styledEdges = writable<Edge[]>(applyEdgeType(dagEdges, edgeStyle));
  $: styledEdges.set(applyEdgeType($baseEdges, edgeStyle) as Edge[]);
  $: routerEdges = edgeStyle === "curvedAvoid"
    ? applyEdgeType($baseEdges, "avoidNodes")
    : $styledEdges;

  let settings = {
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    diagramGridSize: 0,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    resolveCollisions: true,
    connectorType: "orthogonal" as "orthogonal" | "bezier" | "polyline",
    layoutDirection: "TB" as LayoutDirection,
    layoutAlgorithm: "dagre" as LayoutAlgorithmName,
    layoutSpacing: 60,
  };

  const router = createAvoidNodesRouter({
    onCollisionsResolved: (resolved) => nodes.set(resolved as Node[]),
  });

  $: routerOptions = {
    shapeBufferDistance: settings.edgeToNodeSpacing,
    idealNudgingDistance: settings.edgeToEdgeSpacing,
    edgeRounding: settings.edgeRounding,
    diagramGridSize: settings.diagramGridSize,
    shouldSplitEdgesNearHandle: settings.shouldSplitEdgesNearHandle,
    autoBestSideConnection: settings.autoBestSideConnection,
    connectorType: settings.connectorType,
  };

  $: router.reset($nodes, routerEdges, routerOptions);

  let didLayout = false;
  let fitViewTrigger = 0;

  async function applyLayout(currentNodes: Node[]) {
    const laid = await runAutoLayoutWithGroups(currentNodes, $baseEdges, {
      direction: settings.layoutDirection,
      algorithm: settings.layoutAlgorithm,
      spacing: settings.layoutSpacing,
    });
    nodes.set(laid);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        router.reset(laid, routerEdges, routerOptions);
        fitViewTrigger++;
      });
    });
  }

  onMount(() => {
    setTimeout(() => {
      didLayout = true;
      applyLayout($nodes);
    }, 100);
  });

  let prevLayoutKey = `${settings.layoutDirection}-${settings.layoutAlgorithm}-${settings.layoutSpacing}`;
  $: {
    const key = `${settings.layoutDirection}-${settings.layoutAlgorithm}-${settings.layoutSpacing}`;
    if (didLayout && key !== prevLayoutKey) {
      prevLayoutKey = key;
      applyLayout($nodes);
    }
  }

  function handleNodeDrag() {
    router.updateNodes($nodes);
  }

  function handleNodeDragStop() {
    if (settings.resolveCollisions) {
      const resolved = resolveCollisions($nodes, { margin: 20, maxIterations: 50 });
      nodes.set(resolved);
    }
    router.reset($nodes, routerEdges, routerOptions);
  }

  function onSettingChange(e: CustomEvent<{ key: string; value: number | boolean }>) {
    settings = { ...settings, [e.detail.key]: e.detail.value };
  }

  function onLayoutChange(e: CustomEvent<{ key: string; value: string | number }>) {
    settings = { ...settings, [e.detail.key]: e.detail.value };
  }

  function onReLayout() {
    applyLayout($nodes);
  }

  function setEdgeStyle(value: EdgeStyle) {
    if (value === "curvedAvoid" && edgeStyle !== "curvedAvoid") {
      prevRounding = settings.edgeRounding;
      settings = {
        ...settings,
        edgeRounding: 0,
        edgeToEdgeSpacing: 16,
        edgeToNodeSpacing: 20,
        connectorType: "polyline",
        layoutAlgorithm: "elk" as LayoutAlgorithmName,
        layoutDirection: "LR" as LayoutDirection,
      };
    } else if (value !== "curvedAvoid" && edgeStyle === "curvedAvoid") {
      settings = {
        ...settings,
        edgeRounding: prevRounding,
        edgeToEdgeSpacing: 10,
        edgeToNodeSpacing: 12,
        connectorType: "orthogonal",
      };
    }
    edgeStyle = value;
    styledEdges.set(applyEdgeType($baseEdges, value));
    if (value === "avoidNodes" || value === "curvedAvoid") {
      requestAnimationFrame(() => router.reset($nodes, routerEdges, routerOptions));
    }
  }

  onDestroy(() => router.destroy());
</script>

<SvelteFlow
  {nodes}
  edges={styledEdges}
  {edgeTypes}
  fitView
  on:nodedrag={handleNodeDrag}
  on:nodedragstop={handleNodeDragStop}
>
  <FitViewOnLayout trigger={fitViewTrigger} />
  <Background />
  <Controls />
  <MiniMap />

  <!-- Edge style picker -->
  <div class="edge-picker">
    {#each edgeStyleLabels as { value, label }}
      <button
        class="edge-btn"
        class:active={edgeStyle === value}
        on:click={() => setEdgeStyle(value)}
      >
        {label}
      </button>
    {/each}
  </div>

  <SettingsPanel
    {...settings}
    showLayout={true}
    on:change={onSettingChange}
    on:layoutChange={onLayoutChange}
    on:reLayout={onReLayout}
  />
</SvelteFlow>

<style>
  .edge-picker {
    position: absolute;
    bottom: 24px;
    left: 12px;
    right: 12px;
    display: flex;
    justify-content: center;
    gap: 4px;
    z-index: 10;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 6px 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    overflow-x: auto;
  }

  .edge-btn {
    padding: 5px 12px;
    border-radius: 5px;
    border: 1px solid #ccc;
    background: #fff;
    color: #333;
    cursor: pointer;
    font-size: 12px;
    font-weight: 400;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .edge-btn.active {
    background: #333;
    color: #fff;
    font-weight: 600;
  }
</style>
