# Avoid Nodes Edge Routing — React Flow + libavoid-js

> **This routing logic is published as an npm package: [`avoid-nodes-edge`](https://www.npmjs.com/package/avoid-nodes-edge)**
>
> Install it in your own project:
> ```bash
> npm install avoid-nodes-edge libavoid-js
> ```
> Full package documentation: [`avoid-nodes-edge on npm`](https://www.npmjs.com/package/avoid-nodes-edge)
> Package source & monorepo setup: [`turbo-package` branch](https://github.com/awaisshah228/react-flow-avoid-nodes-routing/tree/turbo-package)
> **[Live Demo](https://avoid-nodes-pro-example.vercel.app)**

Orthogonal edge routing that avoids overlapping nodes, powered by **libavoid-js** (WASM) with **Web Worker** support for smooth, non-blocking UI.

Built with [React Flow v12](https://reactflow.dev/) and [libavoid-js](https://github.com/nicktf/libavoid-js) (Emscripten port of [Adaptagrams libavoid](https://github.com/mjwybrow/adaptagrams)).

## Features

- **Orthogonal edge routing** — edges route around nodes with clean 90-degree turns
- **Web Worker routing** — heavy WASM computation runs off the main thread
- **Incremental updates** — dragging a node only re-routes affected edges, not the full graph
- **Debounced batching** — rapid drag events are batched into a single routing pass
- **Edge-to-node spacing** — configurable gap between edges and node boundaries
- **Edge-to-edge spacing** — parallel edges are nudged apart to avoid overlap
- **Corner rounding** — optional rounded corners on orthogonal paths
- **Grid snapping** — optional snap-to-grid for edge waypoints
- **Fallback rendering** — smooth-step or straight lines while the worker loads WASM

---

## Architecture

```
 ┌────────────────────────────┐
 │        React Flow          │
 │       (main thread)        │
 │                            │
 │  App.tsx                   │
 │   └─ useAvoidNodesRouter   │
 │      FromWorker()          │  ← orchestrates worker communication
 │         │                  │
 │         │ postMessage()    │
 └─────────┼──────────────────┘
           │
           ▼
 ┌────────────────────────────┐
 │      Web Worker            │
 │  avoid-router.worker.ts    │
 │                            │
 │  1. Loads WASM (AvoidLib)  │
 │  2. Maintains node/edge    │
 │     model in memory        │
 │  3. On command → debounce  │
 │     → routeAll() → post    │
 │     back "routed" results  │
 └─────────┬──────────────────┘
           │
           │ postMessage({ command: "routed", routes })
           ▼
 ┌────────────────────────────┐
 │   worker-listener.ts       │
 │   → Zustand Store          │  ← routes stored as { [edgeId]: { path, labelX, labelY } }
 └─────────┬──────────────────┘
           │
           ▼
 ┌────────────────────────────┐
 │   AvoidNodesEdge           │
 │   → useAvoidNodesPath()    │  ← reads route from store, renders SVG path
 └────────────────────────────┘
```

### Data Flow (step by step)

1. **App mounts** → `useAvoidWorker()` spawns a Web Worker that loads WASM exclusively on the worker thread.

2. **Worker ready** → Worker posts `{ command: "loaded", success: true }`. The listener sets `store.loaded = true`. The hook sends a `reset` command with all nodes + edges + options.

3. **Worker receives `reset`** → Stores the full node/edge model internally. Schedules a debounced `routeAll()` call.

4. **`routeAll()` runs** → Creates a libavoid `Router`, registers each node as a `ShapeRef` with connection pins (top/bottom/left/right/center), creates `ConnRef` for each edge, calls `processTransaction()`, reads back the routed polyline for each connector, converts to SVG path strings. Cleans up with `router.delete()`.

5. **Worker posts results** → `{ command: "routed", routes: { [edgeId]: { path, labelX, labelY } } }`.

6. **Listener syncs to Zustand** → `worker-listener.ts` calls `setRoutes(routes)` on the store.

7. **Edge components re-render** → Each `AvoidNodesEdge` calls `useAvoidNodesPath(id)` which reads its route from the store and returns the SVG path. If no route is available yet (WASM loading), it falls back to a smooth-step or straight path.

8. **User drags a node** → `onNodesChange` fires → `updateRoutingOnNodesChange` batches changed node IDs (debounced 10ms) → sends `updateNodes` command with only the changed nodes → worker updates its internal model → re-runs `routeAll()` → posts new routes.

9. **Node added/removed** → triggers a full `reset` (graph structure changed).

---

## Folder Structure

```
avoid-nodes-pro-example/
├── public/
│   └── libavoid.wasm           # WASM binary (copied by postinstall)
├── scripts/
│   └── copy-libavoid-wasm.cjs  # Copies WASM from node_modules to public/
├── src/
│   ├── App.tsx                 # Main React component — wires everything together
│   ├── main.tsx                # Vite entry point
│   ├── initialElements.ts     # Demo nodes and edges
│   ├── index.css               # Styles
│   │
│   ├── avoid/                  # ---- Core routing module ----
│   │   ├── index.ts            # Barrel exports
│   │   ├── router.ts           # AvoidRouter class — wraps libavoid-js WASM API
│   │   ├── constants.ts        # Debounce timing, logging flag, edge defaults
│   │   ├── store.ts            # Zustand stores (routes + router actions)
│   │   ├── worker-messages.ts  # TypeScript types for worker commands/responses
│   │   ├── worker-listener.ts  # Syncs worker messages → Zustand store
│   │   ├── useAvoidWorker.ts   # Hook: creates/manages the Web Worker
│   │   ├── useAvoidNodesRouterFromWorker.ts  # Hook: orchestrates worker routing
│   │   └── useAvoidNodesPath.ts              # Hook: per-edge path from store
│   │
│   ├── edges/
│   │   └── AvoidNodesEdge.tsx  # Custom edge component using BaseEdge
│   │
│   └── workers/
│       ├── avoid-router.worker.ts  # Web Worker: WASM routing off main thread
│       └── worker-polyfill.ts      # Polyfill: window → self for Emscripten
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## WASM Loading & Worker Routing Flow

All heavy routing computation happens in the **Web Worker** — never on the main thread. Here's the full flow:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APP STARTUP                                 │
│                                                                     │
│  1. App.tsx mounts                                                  │
│     └─ useAvoidNodesRouterFromWorker(nodes, edges, options)         │
│        │                                                            │
│        └─ useAvoidWorker({ create: true })                          │
│           │                                                         │
│           ▼                                                         │
│  2. Web Worker is spawned                                           │
│     └─ avoid-router.worker.ts loads                                 │
│        ├─ imports worker-polyfill.ts (polyfills window → self)      │
│        └─ calls AvoidRouter.load()                                  │
│           ├─ dynamically imports "libavoid-js"                      │
│           ├─ calls AvoidLib.load("/libavoid.wasm")                  │
│           │   └─ fetches + compiles WASM binary inside worker       │
│           ├─ stores lib instance in AvoidRouter.lib                 │
│           └─ posts { command: "loaded", success: true }             │
│                                                                     │
│  3. worker-listener.ts receives "loaded"                            │
│     ├─ sets useAvoidRoutesStore.loaded = true                       │
│     └─ sets workerLoaded = true in useAvoidWorker                   │
│                                                                     │
│  4. useAvoidNodesRouterFromWorker detects workerLoaded = true       │
│     └─ sends { command: "reset", nodes, edges, options }            │
│        to worker via postMessage()                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      ROUTING (always in worker)                     │
│                                                                     │
│  5. Worker receives "reset"                                         │
│     ├─ stores nodes/edges/options in internal model                 │
│     └─ calls debouncedRoute() →                                     │
│        └─ doRoute() →                                               │
│           └─ AvoidRouter.getInstance().routeAll(nodes, edges, opts) │
│              ├─ creates libavoid Router (orthogonal)                │
│              ├─ registers each node as ShapeRef obstacle            │
│              ├─ creates ConnRef for each edge                       │
│              ├─ calls router.processTransaction() ← HEAVY WASM WORK│
│              ├─ extracts polylines → SVG path strings               │
│              └─ cleans up WASM objects (free memory)                │
│                                                                     │
│  6. Worker posts { command: "routed", routes }                      │
│     └─ routes = { [edgeId]: { path, labelX, labelY } }             │
│                                                                     │
│  7. worker-listener.ts receives "routed"                            │
│     └─ calls setRoutes(routes) on Zustand store                     │
│                                                                     │
│  8. Edge components re-render                                       │
│     └─ AvoidNodesEdge → useAvoidNodesPath(id) → reads SVG path     │
│        from store → renders with BaseEdge                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    USER INTERACTIONS                                 │
│                                                                     │
│  DRAG NODE:                                                         │
│    Main thread: onNodesChange → updateRoutingOnNodesChange()        │
│    ├─ batches changed node IDs (debounced 10ms)                     │
│    └─ sends { command: "updateNodes", nodes: [changed] } to worker  │
│       └─ worker updates internal model → debouncedRoute() → posts   │
│          new routes back                                            │
│                                                                     │
│  ADD/REMOVE NODE OR EDGE:                                           │
│    Main thread: detects structural change                           │
│    └─ sends { command: "reset", nodes, edges, options } (full reset)│
│       └─ worker rebuilds entire model → routes → posts back         │
│                                                                     │
│  CHANGE OPTIONS (spacing, rounding):                                │
│    useEffect detects option change                                  │
│    └─ sends { command: "reset" } with new options                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Why WASM never loads on the main thread

- WASM is loaded **exclusively inside the Web Worker** — never on the main thread
- `useAvoidNodesRouterFromWorker` is the hook used in `App.tsx` — it sends all routing commands to the worker via `postMessage()`
- The worker loads the WASM module and runs `routeAll()` inside the worker thread
- While WASM loads, edges gracefully fall back to smooth-step or straight paths via `useAvoidNodesPath()`

---

## Key Files Explained

### `src/avoid/router.ts` — Core Routing Engine

The `AvoidRouter` class wraps the libavoid-js WASM library. Key responsibilities:

- **WASM loading** with retry logic (up to 5 attempts, 2s apart)
- **`routeAll(nodes, edges, options)`** — the main entry point:
  1. Creates a libavoid `Router` with orthogonal routing flags
  2. Sets routing parameters (shape buffer distance, ideal nudging distance)
  3. Registers each node as a `ShapeRef` (rectangle obstacle) with 5 connection pins (center, top, bottom, left, right)
  4. Creates a `ConnRef` for each edge, connecting source/target pins
  5. Calls `router.processTransaction()` to compute routes
  6. Reads back polylines and converts to SVG path strings (with optional corner rounding and grid snapping)
  7. Cleans up WASM objects with `router.delete()`

**libavoid-js v0.5.0-beta.5 API notes:**
- Enums are Emscripten objects with `.value` property (e.g., `Avoid.RouterFlag.OrthogonalRouting.value`)
- ConnDir flags are raw numbers: Up=1, Down=2, Left=4, Right=8, All=15
- PolyLine points accessed via `.at(i)` (not `.get_ps(i)`)
- Cleanup via `router.delete()` (not individual deleteConnector/deleteShape)

### `src/workers/avoid-router.worker.ts` — Web Worker

Runs libavoid routing on a separate thread. Maintains its own copy of the node/edge model. Supports commands:

| Command | When Sent | What Happens |
| --- | --- | --- |
| `reset` | Initial load, undo/redo, options change | Full model rebuild + reroute |
| `updateNodes` | Node dragged/resized | Updates specific nodes, reroutes |
| `change` | Single cell changed | Updates one node/edge in model |
| `add` | Node/edge added | Adds to internal model |
| `remove` | Node/edge removed | Removes from internal model |
| `route` | One-shot routing request | Routes immediately, no model change |
| `close` | Cleanup | Cancels debounce, closes worker |

### `src/avoid/store.ts` — Zustand State

Two stores:
- **`useAvoidRoutesStore`** — `{ loaded, routes, setLoaded, setRoutes }` — holds the routed paths for all edges
- **`useAvoidRouterActionsStore`** — `{ resetRouting, updateRoutesForNodeId }` — imperative actions exposed to other components

### `src/edges/AvoidNodesEdge.tsx` — Edge Component

A custom React Flow edge that:
1. Calls `useAvoidNodesPath()` to get the SVG path from the store
2. Renders with `BaseEdge` — dashed stroke when falling back, solid when routed

---

## Debounce Strategy

Two debounce layers prevent excessive routing during rapid interactions:

1. **Main thread** (`DEBOUNCE_ROUTING_MS = 10ms` in `constants.ts`) — batches `onNodesChange` position/dimension events into a single `updateNodes` or `reset` command
2. **Worker** (`DEBOUNCE_MS` in `avoid-router.worker.ts`) — batches multiple incoming commands before running `routeAll()`

After routing completes, the worker checks if new changes arrived during computation. If so, it skips posting stale results and waits for the next routing pass.

---

## Installation

```bash
npm install
npm run dev
```

The `postinstall` script automatically copies `libavoid.wasm` to `public/`.

## Usage

```tsx
import { AvoidNodesEdge } from "./edges/AvoidNodesEdge";
import { useAvoidNodesRouterFromWorker } from "./avoid";

const edgeTypes = { avoidNodes: AvoidNodesEdge };

function Flow() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  // WASM loads exclusively on the worker thread — never on the main thread
  const { updateRoutingOnNodesChange } = useAvoidNodesRouterFromWorker(
    nodes,
    edges,
    {
      edgeToNodeSpacing: 12,  // gap between edges and node boundaries
      edgeToEdgeSpacing: 10,  // gap between parallel edges
      edgeRounding: 5,        // optional corner radius (px)
      diagramGridSize: 0,     // optional grid snap (0 = off)
    }
  );

  const onNodesChange = (changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    updateRoutingOnNodesChange(changes);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: "avoidNodes" }}
    />
  );
}
```

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `edgeToNodeSpacing` | `8` | Minimum gap (px) between edge paths and node boundaries |
| `edgeToEdgeSpacing` | `10` | Minimum gap (px) between parallel edge paths |
| `edgeRounding` | `0` | Corner radius (px) for orthogonal turns. `0` = sharp corners |
| `diagramGridSize` | `0` | Snap edge waypoints to grid. `0` = no snapping |

## Dependencies

- `@xyflow/react ^12.7.0` — React Flow v12
- `libavoid-js ^0.5.0-beta.5` — Libavoid WASM port (orthogonal routing engine)
- `zustand ^5.0.10` — State management for routed paths
