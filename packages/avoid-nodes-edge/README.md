# avoid-nodes-edge

**[React Demo](https://avoid-nodes-pro-example.vercel.app)** · **[Svelte Demo](https://svelte-demo-beta.vercel.app/)** | **[How It Works](https://github.com/awaisshah228/react-flow-avoid-nodes-routing/blob/turbo-package/HOW_IT_WORKS.md)** | **[GitHub](https://github.com/awaisshah228/react-flow-avoid-nodes-routing/tree/turbo-package)**

[![npm](https://img.shields.io/npm/v/avoid-nodes-edge)](https://www.npmjs.com/package/avoid-nodes-edge) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/avoid-nodes-edge)](https://bundlephobia.com/package/avoid-nodes-edge)

Orthogonal edge routing for [React Flow](https://reactflow.dev/) — edges automatically route around nodes using [libavoid-js](https://github.com/nicknisi/libavoid-js) (WASM). All WASM and routing computation runs exclusively in a **Web Worker**, keeping the main thread free and your UI smooth.

## Features

- Orthogonal (right-angle) edge routing that avoids overlapping nodes
- **Group-aware routing** — edges pass through ancestor groups but route around unrelated groups
- **Auto best side detection** — automatically picks the optimal handle side (left/right/top/bottom) based on relative node positions
- WASM routing engine runs entirely in a Web Worker — zero main-thread jank
- Incremental updates: dragging a node only re-routes affected edges
- Parallel edge support with automatic offset
- Configurable spacing, rounding, and grid snapping
- ER relationship labels (one-to-one, one-to-many, etc.)
- Fallback rendering (smooth-step/straight paths) while the worker loads
- Works with React Flow v12+

## Install

```bash
npm install avoid-nodes-edge
```

```bash
yarn add avoid-nodes-edge
```

```bash
pnpm add avoid-nodes-edge
```

### Peer Dependencies

| Package | Version |
|---|---|
| `react` | >= 18.0.0 |
| `react-dom` | >= 18.0.0 |
| `@xyflow/react` | >= 12.0.0 |
| `zustand` | >= 4.0.0 |

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

// Search both local and hoisted (monorepo) node_modules
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

This script handles both flat and hoisted `node_modules` layouts (npm workspaces, monorepos).

### 2. Configure your bundler

#### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
    rollupOptions: {
      output: { entryFileNames: '[name].js' },
    },
  },
  optimizeDeps: {
    exclude: ['avoid-nodes-edge'],
  },
});
```

#### Next.js / Webpack

Web Workers with ES modules require additional webpack configuration. Ensure your bundler supports the `new URL(..., import.meta.url)` pattern for worker resolution.

### 3. Add to your React Flow app

```tsx
import { useState, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AvoidNodesEdge } from 'avoid-nodes-edge/edge';
import { useAvoidNodesRouterFromWorker } from 'avoid-nodes-edge';

// Register the custom edge type
const edgeTypes = { avoidNodes: AvoidNodesEdge };

const initialNodes: Node[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 300, y: 0 }, data: { label: 'Node 2' } },
  { id: '3', position: { x: 150, y: 150 }, data: { label: 'Node 3' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'avoidNodes' },
];

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Set up the worker-based router
  const { updateRoutingOnNodesChange, resetRouting } =
    useAvoidNodesRouterFromWorker(nodes, edges, {
      edgeToNodeSpacing: 12,
      edgeToEdgeSpacing: 10,
      edgeRounding: 8,
    });

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      updateRoutingOnNodesChange(changes);
    },
    [updateRoutingOnNodesChange]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      const needsReset = changes.some((c) => c.type === 'add' || c.type === 'remove');
      if (needsReset) requestAnimationFrame(() => resetRouting());
    },
    [resetRouting]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'avoidNodes' }, eds));
      requestAnimationFrame(() => resetRouting());
    },
    [resetRouting]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'avoidNodes' }}
      fitView
    />
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
```

> **Important:** Edges must have `type: "avoidNodes"` to be processed by the router.

## API Reference

### `useAvoidNodesRouterFromWorker(nodes, edges, options?)`

The main hook. Manages the Web Worker lifecycle and routes edges around nodes.

```ts
import { useAvoidNodesRouterFromWorker } from 'avoid-nodes-edge';

const { updateRoutingOnNodesChange, resetRouting, refreshRouting, updateRoutingForNodeIds } =
  useAvoidNodesRouterFromWorker(nodes, edges, options);
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `edgeToNodeSpacing` | `number` | `8` | Buffer distance (px) between edges and node boundaries |
| `edgeToEdgeSpacing` | `number` | `10` | Distance (px) between parallel edge segments |
| `edgeRounding` | `number` | `0` | Corner radius (px) for rounded orthogonal bends |
| `diagramGridSize` | `number` | `0` | Snap edge waypoints to a grid of this size (0 = no grid) |
| `shouldSplitEdgesNearHandle` | `boolean` | `false` | When `false`, edges share a common exit point near the handle and diverge after a small gap. When `true`, edges spread out along the node border. |
| `autoBestSideConnection` | `boolean` | `false` | When `true`, automatically detects the best handle side (left/right/top/bottom) for each edge based on relative node positions. Overrides default right→left behavior. |

#### Return Value

| Property | Type | Description |
|---|---|---|
| `updateRoutingOnNodesChange` | `(changes: NodeChange[]) => void` | Call from `onNodesChange`. Handles incremental updates on drag/resize and full resets on add/remove. |
| `resetRouting` | `() => void` | Force a full re-route of all edges |
| `refreshRouting` | `() => void` | Re-route using current node/edge state |
| `updateRoutingForNodeIds` | `(nodeIds: string[]) => void` | Incrementally re-route edges for specific nodes |

---

### `AvoidNodesEdge`

Custom React Flow edge component that renders the routed path.

```tsx
import { AvoidNodesEdge } from 'avoid-nodes-edge/edge';

const edgeTypes = { avoidNodes: AvoidNodesEdge };
```

Falls back to a smooth-step or straight path while the worker is loading WASM. Once loaded, renders the computed orthogonal route.

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
      flowDirection: 'mono',      // 'mono' | 'bi' | 'none'
      erRelation: 'one-to-many',  // ER relationship label
      connectorType: 'default',   // 'default' | 'straight' | 'smoothstep' | 'step'
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
| `flowDirection` | `"mono" \| "bi" \| "none"` | `"mono"` | Arrow direction: one-way, bidirectional, or none |
| `markerEnd` | `string` | `undefined` | Custom SVG marker at the end |
| `markerStart` | `string` | `undefined` | Custom SVG marker at the start |
| `erRelation` | `string` | `null` | ER relationship: `"one-to-one"`, `"one-to-many"`, `"many-to-one"`, `"many-to-many"` |
| `connectorType` | `string` | `"default"` | Path shape for parallel offsets |

---

### `useAvoidNodesPath(params)`

Low-level hook that reads the routed path for a single edge from the store. Used internally by `AvoidNodesEdge` — useful if you're building a custom edge component.

```ts
import { useAvoidNodesPath } from 'avoid-nodes-edge';

const [path, labelX, labelY, wasRouted] = useAvoidNodesPath({
  id: 'edge-1',
  sourceX: 100,
  sourceY: 50,
  targetX: 400,
  targetY: 200,
  sourcePosition: 'right',
  targetPosition: 'left',
});
```

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Edge ID to look up in the routes store |
| `sourceX/Y` | `number` | Source handle coordinates |
| `targetX/Y` | `number` | Target handle coordinates |
| `sourcePosition` | `"left" \| "right" \| "top" \| "bottom"` | Source handle side |
| `targetPosition` | `"left" \| "right" \| "top" \| "bottom"` | Target handle side |
| `borderRadius` | `number` | Fallback smooth-step border radius |
| `offset` | `number` | Fallback smooth-step offset |

Returns `[path, labelX, labelY, wasRouted]` — `wasRouted` is `false` while the worker is loading.

---

### `useAvoidRoutesStore`

Zustand store holding the computed routes from the worker.

```ts
import { useAvoidRoutesStore } from 'avoid-nodes-edge';

// Read routes
const routes = useAvoidRoutesStore((s) => s.routes);
const loaded = useAvoidRoutesStore((s) => s.loaded);

// Check a specific edge
const edgeRoute = useAvoidRoutesStore((s) => s.routes['edge-1']);
// => { path: "M 100 50 L 100 200 L 400 200", labelX: 250, labelY: 200 }
```

| Property | Type | Description |
|---|---|---|
| `routes` | `Record<string, AvoidRoute>` | Map of edge ID to `{ path, labelX, labelY }` |
| `loaded` | `boolean` | Whether the WASM worker has finished loading |
| `setRoutes` | `(routes) => void` | Update routes (called by worker listener) |
| `setLoaded` | `(loaded) => void` | Update loaded state |

---

### `useAvoidRouterActionsStore`

Zustand store holding imperative routing actions. Useful for triggering re-routes from outside the component that owns the router.

```ts
import { useAvoidRouterActionsStore } from 'avoid-nodes-edge';

const { resetRouting, updateRoutesForNodeId } =
  useAvoidRouterActionsStore((s) => s.actions);

// Force full re-route
resetRouting();

// Re-route edges for a specific node
updateRoutesForNodeId('node-1');
```

---

### `useAvoidWorker(options?)`

Low-level hook that creates and manages the Web Worker. Used internally by `useAvoidNodesRouterFromWorker` — useful if you need direct control over the worker.

```ts
import { useAvoidWorker } from 'avoid-nodes-edge';

const { workerLoaded, post, close } = useAvoidWorker({
  create: true,
  onLoaded: (success) => console.log('WASM loaded:', success),
  onRouted: (routes) => console.log('Routes computed:', routes),
});

// Send a command to the worker
post({ command: 'reset', nodes, edges, options });
```

---

### Constants

Configurable constants exported from the package:

```ts
import {
  DEBOUNCE_ROUTING_MS,        // 0 — debounce before routing (ms)
  EDGE_BORDER_RADIUS,         // 0 — default corner radius (px)
  SHOULD_START_EDGE_AT_HANDLE_BORDER,  // true
  DEV_LOG_WEB_WORKER_MESSAGES,         // false
} from 'avoid-nodes-edge';
```

---

### Types

All types are exported for TypeScript users:

```ts
import type {
  // Router
  AvoidRoute,
  AvoidRouterOptions,
  HandlePosition,

  // Hooks
  UseAvoidNodesRouterOptions,
  UseAvoidNodesRouterResult,
  UseAvoidWorkerOptions,
  UseAvoidWorkerResult,
  UseAvoidNodesPathParams,
  Position,

  // Stores
  AvoidRoutesState,
  AvoidRouterActions,

  // Worker messages
  AvoidRouterWorkerCommand,
  AvoidRouterWorkerResponse,
} from 'avoid-nodes-edge';
```

## Using with Auto-Layout (ELK, Dagre, D3 Hierarchy)

`avoid-nodes-edge` pairs perfectly with auto-layout libraries — use a layout algorithm to **position nodes**, then libavoid to **route edges** with obstacle avoidance. The [basic example](https://avoid-nodes-pro-example.vercel.app) includes an "Auto Layout" tab demonstrating all three.

```tsx
import { runAutoLayout } from './utils/auto-layout'; // ELK, Dagre, or D3 Hierarchy
import { useAvoidNodesRouterFromWorker } from 'avoid-nodes-edge';

function AutoLayoutFlow() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const { resetRouting, updateRoutingOnNodesChange } =
    useAvoidNodesRouterFromWorker(nodes, edges, {
      edgeRounding: 8,
      autoBestSideConnection: true,
    });

  // 1. Run layout algorithm to position nodes
  const applyLayout = async () => {
    const laid = await runAutoLayout(nodes, edges, {
      algorithm: 'elk',       // or 'dagre' or 'd3-hierarchy'
      direction: 'LR',        // TB, LR, RL, BT
      spacing: 60,
    });
    setNodes(laid);
    requestAnimationFrame(() => resetRouting()); // 2. Re-route edges
  };

  // Nodes are still draggable — edges re-route on drag
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={(changes) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
        updateRoutingOnNodesChange(changes);
      }}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'avoidNodes' }}
    />
  );
}
```

**Supported layout algorithms:**

| Algorithm | Library | Best For |
|---|---|---|
| `elk` | [elkjs](https://www.npmjs.com/package/elkjs) | Layered/hierarchical diagrams |
| `dagre` | [@dagrejs/dagre](https://www.npmjs.com/package/@dagrejs/dagre) | DAG layouts with rank ordering |
| `d3-hierarchy` | [d3-hierarchy](https://www.npmjs.com/package/d3-hierarchy) | Tree structures |

The key insight: layout algorithms position nodes but draw simple edges (straight lines or splines). By pairing them with libavoid, you get **auto-positioned nodes** with **orthogonal edges that avoid obstacles** — the best of both worlds.

---

## Architecture

```
Main Thread                              Worker Thread
───────────                              ─────────────
                                         avoid-router.worker.js
useAvoidNodesRouterFromWorker ─────────► loads libavoid WASM
  posts commands:                        runs routeAll()
  • reset (full graph)                   computes orthogonal paths
  • updateNodes (incremental)            ◄──────────────────────
  • route (one-shot)                     posts { routed, routes }

useAvoidRoutesStore ◄──────────────────
  stores routes map

AvoidNodesEdge
  reads route from store
  renders SVG path
```

### Group-Aware Batch Routing

When your diagram has group nodes (React Flow `type: "group"` with child nodes using `parentId`), the router uses a **batch routing** strategy:

1. **Ancestor detection** — For each edge, the router walks up the `parentId` chain of both source and target nodes to find all ancestor groups (`getAncestorGroups()`).

2. **Passthrough grouping** — Edges are batched by their combined set of ancestor groups. For example, an edge from a child of Group A to a child of Group B gets the passthrough set `{A, B}`.

3. **Per-batch obstacle sets** — Each batch gets its own libavoid router instance. The obstacles include all non-group nodes plus any group nodes that the batch does NOT need to pass through. Groups in the passthrough set are excluded from obstacles, allowing edges to cross through them.

4. **Separate routing** — Each batch is routed independently with its own obstacle configuration, ensuring edges going into a group can penetrate it while other edges route around it.

```
Edge: child-of-A → child-of-B
  Passthrough groups: {A, B}
  Obstacles: all non-group nodes + groups NOT in {A, B}
  Result: edge passes through groups A and B, avoids everything else

Edge: external-node → external-node
  Passthrough groups: {} (none)
  Obstacles: all non-group nodes + ALL group nodes
  Result: edge routes around all groups
```

### Auto Best Side Detection

When `autoBestSideConnection` is enabled, the router compares the center points of source and target nodes and picks the optimal handle positions:

- **Horizontal dominant** (`|dx| >= |dy|`): source exits `right`, target enters `left` (or reversed if target is to the left)
- **Vertical dominant** (`|dy| > |dx|`): source exits `bottom`, target enters `top` (or reversed if target is above)

This produces cleaner routing for diagrams where nodes are positioned in any direction, not just left-to-right.

### Why WASM never loads on the main thread

The `libavoid-js` WASM binary (~200KB) and the routing algorithm are computationally expensive. Loading and running them on the main thread would cause frame drops during initial load and every re-route. By running everything in a Web Worker:

- **Initial load**: WASM downloads and compiles in the background
- **Routing**: Heavy graph computation doesn't block React renders
- **Dragging**: Incremental updates keep the UI at 60fps
- **Fallback**: Edges render immediately as straight/smooth-step paths, then snap to routed paths once the worker responds

### Worker Message Protocol

| Command | Direction | Description |
|---|---|---|
| `reset` | Main -> Worker | Send full graph for re-routing |
| `updateNodes` | Main -> Worker | Send changed nodes for incremental routing |
| `change` | Main -> Worker | Update a single node or edge |
| `add` | Main -> Worker | Add a node or edge |
| `remove` | Main -> Worker | Remove a node or edge by ID |
| `route` | Main -> Worker | One-shot route (doesn't update internal state) |
| `close` | Main -> Worker | Shut down the worker |
| `loaded` | Worker -> Main | WASM load result (`{ success: boolean }`) |
| `routed` | Worker -> Main | Computed routes (`{ routes: Record<string, AvoidRoute> }`) |

## Troubleshooting

### Worker fails to load (MIME type error)

If you see `Failed to load module script: The server responded with a non-JavaScript MIME type`, make sure:

1. Your Vite config includes `worker: { format: 'es' }`
2. Your Vite config includes `optimizeDeps: { exclude: ['avoid-nodes-edge'] }`
3. Clear the Vite cache: `rm -rf node_modules/.vite`

### WASM not found

If the worker loads but WASM fails, ensure `libavoid.wasm` is served at `/libavoid.wasm` from your `public/` directory.

### Edges render as straight lines

This is the expected fallback while the worker loads WASM. Once loaded, edges will snap to routed paths. If they stay straight, check the browser console for worker errors.

### Edges don't route around a node

Make sure the node has `type` set to something other than `"group"`. Group nodes are treated as containers, not obstacles.

## License

MIT
