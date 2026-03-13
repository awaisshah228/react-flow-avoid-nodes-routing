# avoid-nodes-router

**[GitHub](https://github.com/awaisshah228/react-flow-avoid-nodes-routing/tree/turbo-package)** | **[How It Works](https://github.com/awaisshah228/react-flow-avoid-nodes-routing/blob/turbo-package/HOW_IT_WORKS.md)**

[![npm](https://img.shields.io/npm/v/avoid-nodes-router)](https://www.npmjs.com/package/avoid-nodes-router) [![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/awaisshah228)

If this package saves you time, consider supporting its development:

**USDC (Solana):** `59FhVxK3uxABiJ9VzXtCoyCxqq4nhoZDBtUV3gEkiexo`

<img src="https://raw.githubusercontent.com/awaisshah228/react-flow-avoid-nodes-routing/turbo-package/assets/solana-donate-qr.png" width="200" alt="Solana USDC QR Code" />

---

Transport-agnostic, server-side orthogonal edge routing engine powered by [libavoid-js](https://github.com/nicknisi/libavoid-js) (WASM). Route edges around nodes on the server — plug into any protocol: REST, WebSocket, SSE, Socket.IO, or IPC.

> **Using React Flow?** Check out [avoid-nodes-edge](https://www.npmjs.com/package/avoid-nodes-edge) for client-side routing with a built-in Web Worker.
>
> **Using Svelte Flow?** Check out [avoid-nodes-edge-svelte](https://www.npmjs.com/package/avoid-nodes-edge-svelte).

## Features

- Orthogonal (right-angle) edge routing that avoids overlapping nodes
- Runs in Node.js via WASM — no browser required
- Each handler spawns its own Worker thread with isolated WASM memory
- Transport-agnostic: wire `handleMessage()` to any protocol
- Auto best side detection for optimal handle positions
- Configurable spacing, rounding, and grid snapping
- `PersistentServerRouter` for incremental updates without rebuilding
- Clean teardown: `destroy()` terminates the worker and frees all WASM memory

## Install

```bash
npm install avoid-nodes-router
```

```bash
yarn add avoid-nodes-router
```

```bash
pnpm add avoid-nodes-router
```

### Peer Dependencies

| Package | Version |
|---|---|
| `libavoid-js` | 0.4.5 |

## Quick Start

### Express Example

A full Express API that loads WASM once at startup, computes ELK layout for node positions, expands group nodes, and routes edges server-side — returning everything ready to render:

```ts
import express from 'express';
import { loadAvoidWasm, routeAll } from 'avoid-nodes-router';
import type { FlowNode, FlowEdge } from 'avoid-nodes-router';

async function main() {
  // Load WASM once at startup
  await loadAvoidWasm();

  const app = express();
  app.use(express.json());

  app.get('/api/diagram', async (req, res) => {
    const nodes: FlowNode[] = [
      { id: '1', position: { x: 0, y: 0 }, width: 150, height: 50 },
      { id: '2', position: { x: 300, y: 0 }, width: 150, height: 50 },
      { id: '3', position: { x: 150, y: 150 }, width: 150, height: 50 },
    ];

    const edges: FlowEdge[] = [
      { id: 'e1-2', source: '1', target: '2', type: 'avoidNodes' },
      { id: 'e1-3', source: '1', target: '3', type: 'avoidNodes' },
    ];

    // Compute edge routing paths that avoid nodes
    const routes = routeAll(nodes, edges, {
      shapeBufferDistance: 12,
      idealNudgingDistance: 10,
      edgeRounding: 8,
      autoBestSideConnection: true,
      shouldSplitEdgesNearHandle: true,
    });

    // Return nodes, edges, and pre-computed routes
    res.json({ nodes, edges, routes });
  });

  app.listen(3001, () => {
    console.log('Server listening on http://localhost:3001');
  });
}

main().catch(console.error);
```

See the [express-api-example](https://github.com/awaisshah228/react-flow-avoid-nodes-routing/tree/turbo-package/examples-server-side/express-api-example) for a complete implementation with ELK layout, group node expansion, and multiple diagram tabs.

### Using the Routing Engine Directly

For simpler use cases, call `routeAll()` directly without the handler/worker:

```ts
import { loadAvoidWasm, routeAll } from 'avoid-nodes-router';

// Load WASM once at startup
await loadAvoidWasm();

// Route edges
const routes = routeAll(nodes, edges, {
  shapeBufferDistance: 12,
  edgeRounding: 8,
  autoBestSideConnection: true,
});
```

### Using the Persistent Router

For incremental updates (e.g., dragging nodes), use `PersistentServerRouter` to avoid rebuilding the WASM router on every change:

```ts
import { loadAvoidWasm, PersistentServerRouter } from 'avoid-nodes-router';

await loadAvoidWasm();

const router = new PersistentServerRouter();

// Initial setup
const routes = router.reset(nodes, edges, options);

// Incremental update — only moves changed shapes
const updated = router.updateNodes([
  { id: '1', position: { x: 50, y: 50 }, width: 150, height: 50 },
]);

// Clean up
router.destroy();
```

## API Reference

### `createRoutingHandler()`

Creates a routing handler with its own Worker thread and isolated WASM instance.

```ts
import { createRoutingHandler } from 'avoid-nodes-router';

const handler = createRoutingHandler();
```

#### `handler.handleMessage(msg)`

Process a routing request and return a response. Async because routing runs in a worker thread.

#### `handler.destroy()`

Terminate the worker and free all WASM memory. Call on client disconnect.

### Request Types

| Command | Description |
|---|---|
| `reset` | Send full graph (nodes, edges, options) for re-routing |
| `updateNodes` | Send changed nodes for incremental routing |
| `addNode` | Add a single node |
| `removeNode` | Remove a node by ID |
| `addEdge` | Add a single edge |
| `removeEdge` | Remove an edge by ID |
| `route` | One-shot route (doesn't update internal state) |

### Response Types

| Command | Description |
|---|---|
| `routed` | Success — contains `routes: Record<string, AvoidRoute>` |
| `error` | Failure — contains `message: string` |

### `routeAll(nodes, edges, options?)`

Stateless one-shot routing function. Creates and destroys a WASM router per call.

### `loadAvoidWasm()`

Load the libavoid-js WASM binary. Must be called before `routeAll()` or `PersistentServerRouter`.

### `getAvoidLib()`

Returns the loaded WASM library instance. Throws if `loadAvoidWasm()` hasn't been called.

### `PersistentServerRouter`

Keeps a WASM Router alive across requests for incremental updates.

| Method | Description |
|---|---|
| `reset(nodes, edges, options?)` | Full rebuild with new graph data |
| `updateNodes(nodes)` | Move existing shapes without rebuilding |
| `getState()` | Returns current nodes, edges, and options |
| `destroy()` | Free all WASM memory |

### Router Options

| Option | Type | Default | Description |
|---|---|---|---|
| `shapeBufferDistance` | `number` | `8` | Buffer distance (px) between edges and node boundaries |
| `idealNudgingDistance` | `number` | `10` | Distance (px) between parallel edge segments |
| `handleNudgingDistance` | `number` | same as `idealNudgingDistance` | Distance (px) for handle-end nudging |
| `edgeRounding` | `number` | `0` | Corner radius (px) for rounded orthogonal bends |
| `diagramGridSize` | `number` | `0` | Snap edge waypoints to a grid (0 = no grid) |
| `shouldSplitEdgesNearHandle` | `boolean` | `false` | When `true`, edges spread out along the node border |
| `autoBestSideConnection` | `boolean` | `false` | Auto-detect optimal handle side based on node positions |

### Types

```ts
import type {
  FlowNode,
  FlowEdge,
  AvoidRoute,
  AvoidRouterOptions,
  RoutingHandler,
  RoutingRequest,
  RoutingResponse,
} from 'avoid-nodes-router';
```

## Architecture

```
Client (any transport)          Server (Node.js)
──────────────────────          ────────────────
                                createRoutingHandler()
WebSocket / HTTP / SSE ──────►    spawns Worker thread
  sends RoutingRequest            loads libavoid WASM
                                  runs routing
  receives RoutingResponse ◄──    posts results back

  on disconnect ──────────────►  handler.destroy()
                                  terminates worker
                                  frees WASM memory
```

Each handler gets its own Worker thread and WASM instance, so multiple clients route independently without interference.

## Sponsor

If this package saves you time, consider supporting its development:

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/awaisshah228)

**USDC (Solana):** `59FhVxK3uxABiJ9VzXtCoyCxqq4nhoZDBtUV3gEkiexo`

<img src="https://raw.githubusercontent.com/awaisshah228/react-flow-avoid-nodes-routing/turbo-package/assets/solana-donate-qr.png" width="200" alt="Solana USDC QR Code" />

## License

SEE LICENSE IN LICENSE
