# avoid-nodes-edge-svelte

**[GitHub](https://github.com/awaisshah228/react-flow-avoid-nodes-routing/tree/turbo-package)** · **[Svelte Demo](https://svelte-demo-beta.vercel.app/)**

[![npm](https://img.shields.io/npm/v/avoid-nodes-edge-svelte)](https://www.npmjs.com/package/avoid-nodes-edge-svelte) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/avoid-nodes-edge-svelte)](https://bundlephobia.com/package/avoid-nodes-edge-svelte) [![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/awaisshah228)

If this package saves you time, consider supporting its development:

**USDC (Solana):** `59FhVxK3uxABiJ9VzXtCoyCxqq4nhoZDBtUV3gEkiexo`

<img src="https://raw.githubusercontent.com/awaisshah228/react-flow-avoid-nodes-routing/turbo-package/assets/solana-donate-qr.png" width="200" alt="Solana USDC QR Code" />

---

Orthogonal edge routing for [Svelte Flow](https://svelteflow.dev/) — edges automatically route around nodes using [libavoid-js](https://github.com/nicknisi/libavoid-js) (WASM). All WASM and routing computation runs exclusively in a **Web Worker**, keeping the main thread free and your UI smooth.

## Features

- Orthogonal (right-angle) edge routing that avoids overlapping nodes
- **Group-aware routing** — edges pass through ancestor groups but route around unrelated groups
- **Auto best side detection** — automatically picks the optimal handle side (left/right/top/bottom) based on relative node positions
- WASM routing engine runs entirely in a Web Worker — zero main-thread jank
- Incremental updates: dragging a node only re-routes affected edges
- Configurable spacing, rounding, and grid snapping
- Fallback rendering (straight path) while the worker loads
- Works with Svelte Flow ([@xyflow/svelte](https://www.npmjs.com/package/@xyflow/svelte))

## Install

```bash
npm install avoid-nodes-edge-svelte
```

```bash
yarn add avoid-nodes-edge-svelte
```

```bash
pnpm add avoid-nodes-edge-svelte
```

### Peer Dependencies

| Package | Version |
|---|---|
| `svelte` | >= 4.0.0 |
| `@xyflow/svelte` | >= 0.1.0 |
| `libavoid-js` | 0.4.5 |

## Quick Start

### 1. Serve the WASM binary

The routing engine uses a WebAssembly binary from `libavoid-js`. Copy it to your `public/` directory so it's served at `/libavoid.wasm`:

```bash
cp node_modules/libavoid-js/dist/libavoid.wasm public/libavoid.wasm
```

Or automate it with a postinstall script in your `package.json`:

```json
{
  "scripts": {
    "postinstall": "node scripts/copy-libavoid-wasm.cjs"
  }
}
```

Create `scripts/copy-libavoid-wasm.cjs`:

```js
#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const candidates = [
  path.join(__dirname, "..", "node_modules", "libavoid-js", "dist", "libavoid.wasm"),
  path.join(__dirname, "..", "..", "..", "node_modules", "libavoid-js", "dist", "libavoid.wasm"),
];

const src = candidates.find((p) => fs.existsSync(p));
const dest = path.join(__dirname, "..", "public", "libavoid.wasm");

if (!src) {
  console.warn("[copy-libavoid-wasm] libavoid.wasm not found — run npm install first");
  process.exit(0);
}

const publicDir = path.dirname(dest);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log("[copy-libavoid-wasm] Copied libavoid.wasm to public/");
```

### 2. Configure your bundler

#### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  worker: {
    format: 'es',
    rollupOptions: {
      output: { entryFileNames: '[name].js' },
    },
  },
  optimizeDeps: {
    exclude: ['avoid-nodes-edge-svelte'],
  },
});
```

### 3. Add to your Svelte Flow app

```svelte
<script lang="ts">
  import { writable } from "svelte/store";
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type EdgeTypes,
  } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";

  import AvoidNodesEdge from "avoid-nodes-edge-svelte/edge";
  import { createAvoidNodesRouter, resolveCollisions } from "avoid-nodes-edge-svelte";

  // Register the custom edge type
  const edgeTypes: EdgeTypes = {
    avoidNodes: AvoidNodesEdge as any,
  };

  const initialNodes: Node[] = [
    { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" }, style: "width: 150px; height: 50px;" },
    { id: "2", position: { x: 300, y: 0 }, data: { label: "Node 2" }, style: "width: 150px; height: 50px;" },
    { id: "3", position: { x: 150, y: 150 }, data: { label: "Blocker" }, style: "width: 150px; height: 50px;" },
  ];

  const initialEdges: Edge[] = [
    { id: "e1-2", source: "1", target: "2", type: "avoidNodes" },
  ];

  const nodes = writable<Node[]>(initialNodes);
  const edges = writable<Edge[]>(initialEdges);

  // Create the worker-based router
  const router = createAvoidNodesRouter();

  // Reactively route when nodes/edges change
  $: router.reset($nodes, $edges);

  function handleNodeDrag() {
    router.updateNodes($nodes);
  }

  function handleNodeDragStop() {
    const resolved = resolveCollisions($nodes, { margin: 20, maxIterations: 50 });
    nodes.set(resolved);
    router.reset(resolved, $edges);
  }

  import { onDestroy } from "svelte";
  onDestroy(() => {
    router.destroy();
  });
</script>

<div style="width: 100vw; height: 100vh;">
  <SvelteFlow
    {nodes}
    {edges}
    {edgeTypes}
    fitView
    on:nodedrag={handleNodeDrag}
    on:nodedragstop={handleNodeDragStop}
  >
    <Background />
    <Controls />
    <MiniMap />
  </SvelteFlow>
</div>
```

> **Important:** Edges must have `type: "avoidNodes"` to be processed by the router.

## API Reference

### `createAvoidNodesRouter(options?)`

Creates a router instance that manages a Web Worker for edge routing.

```ts
import { createAvoidNodesRouter } from 'avoid-nodes-edge-svelte';

const router = createAvoidNodesRouter({
  onCollisionsResolved: (resolvedNodes) => {
    nodes.set(resolvedNodes);
  },
});
```

#### Router Methods

| Method | Type | Description |
|---|---|---|
| `reset(nodes, edges, options?)` | `(FlowNode[], FlowEdge[], AvoidRouterOptions?) => void` | Send full graph for re-routing |
| `updateNodes(nodes)` | `(FlowNode[]) => void` | Send changed nodes for incremental routing (drag) |
| `resolveCollisions(nodes, options?)` | `(FlowNode[], ResolveCollisionsOptions?) => void` | Resolve node collisions in the worker |
| `destroy()` | `() => void` | Clean up the worker. Call in `onDestroy`. |
| `loaded` | `boolean` (readonly) | Whether the WASM worker has finished loading |

#### Router Options (passed to `reset`)

Default values are applied automatically — you only need to pass options you want to override.

| Option | Type | Default | Description |
|---|---|---|---|
| `shapeBufferDistance` | `number` | `12` | Buffer distance (px) between edges and node boundaries |
| `idealNudgingDistance` | `number` | `10` | Distance (px) between parallel edge segments |
| `edgeRounding` | `number` | `8` | Corner radius (px) for rounded orthogonal bends |
| `diagramGridSize` | `number` | `0` | Snap edge waypoints to a grid of this size (0 = no grid) |
| `shouldSplitEdgesNearHandle` | `boolean` | `true` | When `true`, edges spread out along the node border near handles |
| `autoBestSideConnection` | `boolean` | `true` | Automatically detect the best handle side based on relative node positions |

---

### `AvoidNodesEdge`

Custom Svelte Flow edge component that renders the routed path.

```svelte
<script>
  import AvoidNodesEdge from 'avoid-nodes-edge-svelte/edge';

  const edgeTypes = { avoidNodes: AvoidNodesEdge };
</script>
```

Falls back to a straight line while the worker is loading WASM. Once loaded, renders the computed orthogonal route.

#### Edge Data Properties

Customize individual edges via the `data` property:

```ts
const edges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'avoidNodes',
    data: {
      label: 'connects to',
      strokeColor: '#3b82f6',
      strokeWidth: 2,
      strokeDasharray: '5,5',
    },
  },
];
```

| Data Property | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `""` | Text label displayed at the edge midpoint |
| `strokeColor` | `string` | `"#94a3b8"` | Edge stroke color |
| `strokeWidth` | `number` | `1.5` | Edge stroke width (px) |
| `strokeDasharray` | `string` | `undefined` | SVG dash pattern (e.g. `"5,5"`) |

---

### Svelte Stores

The package exposes Svelte writable stores for reactive access to routing state:

```ts
import { avoidRoutesLoaded, avoidRoutes, getRouteForEdge, getRoutes } from 'avoid-nodes-edge-svelte';

// Reactive: subscribe in a component
$: loaded = $avoidRoutesLoaded;  // boolean — whether WASM has loaded
$: routes = $avoidRoutes;         // Record<string, AvoidRoute> — all computed routes

// Get route for a specific edge (returns a derived store)
const route = getRouteForEdge('edge-1');
$: edgePath = $route;  // { path: "M ...", labelX: 250, labelY: 200 } | null

// Imperatively read current routes (outside reactive context)
const currentRoutes = getRoutes();
```

---

### `resolveCollisions(nodes, options?)`

Pushes overlapping nodes apart iteratively.

```ts
import { resolveCollisions } from 'avoid-nodes-edge-svelte';

const resolved = resolveCollisions($nodes, { margin: 20, maxIterations: 50 });
nodes.set(resolved);
```

| Option | Type | Default | Description |
|---|---|---|---|
| `margin` | `number` | `20` | Minimum gap (px) between nodes |
| `maxIterations` | `number` | `50` | Maximum resolution iterations |
| `overlapThreshold` | `number` | `0.5` | Minimum overlap (px) to trigger resolution |

---

### Constants

```ts
import {
  DEBOUNCE_ROUTING_MS,        // 0 — debounce before routing (ms)
  EDGE_BORDER_RADIUS,         // 0 — default corner radius (px)
  SHOULD_START_EDGE_AT_HANDLE_BORDER,  // true
  DEV_LOG_WEB_WORKER_MESSAGES,         // false
} from 'avoid-nodes-edge-svelte';
```

---

### Types

All types are exported for TypeScript users:

```ts
import type {
  AvoidRoute,
  AvoidRouterOptions,
  HandlePosition,
  FlowNode,
  FlowEdge,
  AvoidRouterWorkerCommand,
  AvoidRouterWorkerResponse,
  CreateAvoidNodesRouterOptions,
  AvoidNodesRouter,
  ResolveCollisionsOptions,
} from 'avoid-nodes-edge-svelte';
```

## Architecture

```
Main Thread                              Worker Thread
───────────                              ─────────────
                                         avoid-router.worker.js
createAvoidNodesRouter() ─────────────► loads libavoid WASM
  posts commands:                        runs routeAllCore()
  • reset (full graph)                   computes orthogonal paths
  • updateNodes (incremental)            ◄──────────────────────
  • resolveCollisions                    posts { routed, routes }

avoidRoutes (Svelte store) ◄───────────
  stores routes map

AvoidNodesEdge.svelte
  reads route from store
  renders SVG path
```

## Troubleshooting

### Worker fails to load (MIME type error)

If you see `Failed to load module script: The server responded with a non-JavaScript MIME type`, make sure:

1. Your Vite config includes `worker: { format: 'es' }`
2. Your Vite config includes `optimizeDeps: { exclude: ['avoid-nodes-edge-svelte'] }`
3. Clear the Vite cache: `rm -rf node_modules/.vite`

### WASM not found

If the worker loads but WASM fails, ensure `libavoid.wasm` is served at `/libavoid.wasm` from your `public/` directory.

### Edges render as straight lines

This is the expected fallback while the worker loads WASM. Once loaded, edges will snap to routed paths. If they stay straight, check the browser console for worker errors.

### Edges don't route around a node

Make sure the node has `type` set to something other than `"group"`. Group nodes are treated as containers, not obstacles.

## Related

- [avoid-nodes-edge](https://www.npmjs.com/package/avoid-nodes-edge) — React Flow version of this package

## Sponsor

If this package saves you time, consider supporting its development:

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/awaisshah228)

**USDC (Solana):** `59FhVxK3uxABiJ9VzXtCoyCxqq4nhoZDBtUV3gEkiexo`

<img src="https://raw.githubusercontent.com/awaisshah228/react-flow-avoid-nodes-routing/turbo-package/assets/solana-donate-qr.png" width="200" alt="Solana USDC QR Code" />

## License

See [LICENSE](./LICENSE)
