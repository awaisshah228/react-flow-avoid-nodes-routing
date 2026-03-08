# How the Routing Algorithm Works

This document explains how `avoid-nodes-edge` calculates edge paths that avoid overlapping nodes, with concrete input/output examples.

---

## Overview

The routing uses **libavoid** (a C++ library compiled to WebAssembly) which implements a **visibility graph + shortest path** algorithm for orthogonal (right-angle) edge routing. All computation runs inside a **Web Worker** so the UI never freezes.

---

## Step-by-Step Walkthrough

### Input: Nodes and Edges

Imagine a simple diagram with 3 nodes and 2 edges:

```
Nodes:
  A: { id: "a", position: { x: 0,   y: 0   }, width: 150, height: 50 }
  B: { id: "b", position: { x: 400, y: 0   }, width: 150, height: 50 }
  C: { id: "c", position: { x: 200, y: 0   }, width: 100, height: 50 }

Edges:
  e1: { source: "a", target: "b" }   (A -> B, but C is in the way)
```

Visually:

```
 +---------+     +-------+     +---------+
 |    A    |     |   C   |     |    B    |
 |  (0,0)  |     |(200,0)|     | (400,0) |
 +---------+     +-------+     +---------+

 Edge e1 needs to go from A to B, but C blocks the direct path.
```

---

### Step 1: Register Obstacle Rectangles

Each node becomes a rectangle obstacle in the WASM engine. The router now knows where "walls" are:

```
Obstacle A: Rectangle( (0, 0), (150, 50) )
Obstacle B: Rectangle( (400, 0), (550, 50) )
Obstacle C: Rectangle( (200, 0), (300, 50) )    <-- blocker
```

Each obstacle gets **5 connection pins** (where edges can attach):

```
         PIN_TOP (center-top)
            |
 PIN_LEFT --+-- PIN_RIGHT
            |
        PIN_BOTTOM

 + PIN_CENTER (middle of the node)
```

### Step 2: Register Connectors

Edge `e1` becomes a connector:
- Source: Node A's **right pin** (x: 150, y: 25)
- Target: Node B's **left pin** (x: 400, y: 25)

```
 +---------+                   +-------+                   +---------+
 |    A    |----> source pin   |   C   |                   |    B    | <---- target pin
 +---------+   (150, 25)       +-------+                   +---------+  (400, 25)
```

### Step 3: Build Visibility Graph

The WASM engine builds a **visibility graph** — it figures out which points can "see" each other without crossing any obstacle. Key points include:

- Obstacle corners (with buffer padding)
- Connection pins
- Intermediate waypoints

```
With shapeBufferDistance = 8px, the engine adds padding around obstacles:

          (192, -8)-----------(308, -8)
          |                            |
 (150,25) *     C padded zone          * (400,25)
          |                            |
          (192, 58)-----------(308, 58)

The engine finds that going ABOVE or BELOW node C is possible.
```

### Step 4: Find Shortest Orthogonal Path

The engine runs a **Dijkstra-like shortest path search** on the visibility graph, constrained to orthogonal (horizontal/vertical) segments only.

It finds the shortest route from (150, 25) to (400, 25) that doesn't cross any obstacle:

**Route going ABOVE node C:**
```
(150, 25) -> (150, -8) -> (350, -8) -> (350, 25) -> (400, 25)
```

**Route going BELOW node C:**
```
(150, 25) -> (150, 58) -> (350, 58) -> (350, 25) -> (400, 25)
```

The algorithm picks the **shortest** one. Both are the same length here, so it picks one (typically above).

### Step 5: Nudge Parallel Edges

If multiple edges share the same corridor, the engine **nudges** them apart by `idealNudgingDistance` (default 10px):

```
Without nudging:          With nudging (10px apart):

 ----====----              ----========----
 ----====----              ------======------
 (edges overlap)           (edges separated)
```

### Step 6: Convert Polyline to SVG Path

The waypoints are converted to an SVG path string:

**Without rounding (edgeRounding = 0):**
```
Input waypoints:  (150,25) -> (150,-8) -> (350,-8) -> (350,25) -> (400,25)

Output SVG path:  "M 150 25 L 150 -8 L 350 -8 L 350 25 L 400 25"

 Result:
        (150,-8)____________(350,-8)
           |                    |
 (A)-------+                    +-------(B)
        (150,25)             (350,25)
```

**With rounding (edgeRounding = 5):**

At each corner, the sharp 90-degree turn is replaced with a quadratic bezier curve:

```
Input waypoints:  (150,25) -> (150,-8) -> (350,-8) -> (350,25) -> (400,25)

Output SVG path:  "M 150 25 L 150 -3 Q 150 -8 155 -8 L 345 -8 Q 350 -8 350 -3 L 350 25 L 400 25"

 Result:
        (150,-8)____________(350,-8)
           /                    \        <- rounded corners
 (A)------'                      '------(B)
```

The rounding works by:
1. Stopping the line `r` pixels before the corner
2. Drawing a quadratic bezier (`Q`) through the corner point
3. Continuing `r` pixels after the corner

### Step 7: Return Results

The final output for each edge:

```json
{
  "e1": {
    "path": "M 150 25 L 150 -3 Q 150 -8 155 -8 L 345 -8 Q 350 -8 350 -3 L 350 25 L 400 25",
    "labelX": 250,
    "labelY": -8
  }
}
```

- `path` — the SVG path string rendered by `<BaseEdge>`
- `labelX`, `labelY` — midpoint of the route, used to position edge labels

---

## Full Input/Output Example

### Input

```typescript
const nodes = [
  { id: "1", position: { x: 0,   y: 0   }, width: 150, height: 50 },
  { id: "2", position: { x: 400, y: 0   }, width: 150, height: 50 },
  { id: "3", position: { x: 200, y: 100 }, width: 150, height: 50 },
  { id: "4", position: { x: 400, y: 200 }, width: 150, height: 50 },
];

const edges = [
  { id: "e1", source: "1", target: "2", type: "avoidNodes" },
  { id: "e2", source: "1", target: "4", type: "avoidNodes" },
];

const options = {
  shapeBufferDistance: 8,    // 8px gap between edges and nodes
  idealNudgingDistance: 10,  // 10px between parallel edges
  edgeRounding: 5,           // 5px corner radius
  diagramGridSize: 0,        // no grid snapping
};
```

Visual layout:

```
 +---------+                    +---------+
 |    1    |                    |    2    |
 +---------+                    +---------+
                 +---------+
                 |    3    |
                 +---------+
                                +---------+
                                |    4    |
                                +---------+
```

### Output

```json
{
  "e1": {
    "path": "M 150 25 L 395 25 Q 400 25 400 25",
    "labelX": 275,
    "labelY": 25
  },
  "e2": {
    "path": "M 150 25 L 160 25 L 160 208 L 168 208 ... L 400 225",
    "labelX": 280,
    "labelY": 208
  }
}
```

Edge `e1` goes straight right (nothing blocking).
Edge `e2` routes down and around node 3 to reach node 4.

---

## Configuration Effects

### `shapeBufferDistance` — Edge-to-node gap

```
shapeBufferDistance = 4:           shapeBufferDistance = 20:

    +------+                          +------+
    | Node |                          | Node |
    +------+                          +------+
  --+      +--   (tight)        -----+        +-----   (wide gap)
```

### `idealNudgingDistance` — Edge-to-edge gap

```
idealNudgingDistance = 4:          idealNudgingDistance = 20:

  ══════════                      ══════════
  ══════════   (close together)
                                  ══════════   (spread apart)
```

### `edgeRounding` — Corner radius

```
edgeRounding = 0:        edgeRounding = 10:       edgeRounding = 20:

    |                       |                        |
    +-----               /-----                  /-------
    (sharp)             (slight curve)          (wide curve)
```

### `diagramGridSize` — Grid snapping

```
diagramGridSize = 0:             diagramGridSize = 20:

  Waypoint at (153, 47)           Waypoint snapped to (160, 40)
  (exact position)                (nearest grid intersection)
```

### `autoBestSideConnection` — Auto handle side selection

```
autoBestSideConnection = false:          autoBestSideConnection = true:

  Uses handle positions from                Picks sides based on node positions:
  node/edge data (e.g. right→left)          A right of B? → source=LEFT, target=RIGHT
                                            A below B? → source=TOP, target=BOTTOM
```

### `shouldSplitEdgesNearHandle` — Split edges near connection points

When enabled, edges that share a corridor are split into separate segments near their handles, making it clearer which edge connects to which node.

---

## Why WASM + Web Worker?

The `processTransaction()` call (step 4) is the expensive part. For a graph with N nodes:

| Nodes | Approximate time |
|-------|-----------------|
| 10    | ~2ms            |
| 50    | ~10ms           |
| 100   | ~30ms           |
| 500   | ~200ms          |

Running this in a **Web Worker** means:
- The main thread stays responsive (no dropped frames)
- Users can keep dragging nodes while routing computes
- When routing finishes, results are sent back via `postMessage()` and the Zustand store updates, causing edges to re-render

Running as **WASM** (compiled C++) means:
- 10-50x faster than equivalent JavaScript
- The libavoid algorithm is battle-tested (used in Inkscape, Dunnart, and other diagram editors)

---

## Group-Aware Batch Routing

When your diagram contains **group nodes** (parent containers with child nodes), edges that cross group boundaries need special handling. A single libavoid router treats every obstacle as a solid wall — so a group's bounding box would block edges between its children and the outside world.

### The Problem

```
 +========================+
 |  Group G               |
 |  +-----+    +-----+   |
 |  |  A  |    |  B  |   |        +-----+
 |  +-----+    +-----+   |        |  C  |
 +========================+        +-----+

 Edge: A -> C
```

If we register Group G as an obstacle, the edge from A to C cannot exit the group — libavoid sees the group border as a wall.

### The Solution: Batch by Passthrough Groups

The router groups edges into **batches** based on which groups they need to pass through:

1. **Collect ancestor groups** — For each edge, walk up the `parentId` chain of both source and target nodes to find all ancestor groups.
2. **Compute passthrough set** — The set of groups that are ancestors of one endpoint but not the other. These are the groups the edge must cross.
3. **Group edges by passthrough set** — Edges with the same passthrough set are routed together in one batch.
4. **Route each batch separately** — For each batch, create a fresh libavoid router that registers all nodes as obstacles **except** the passthrough groups. This lets edges freely cross those group boundaries.

```
Batch 1 (passthrough = {G}):
  - Edge A -> C: Group G is NOT an obstacle, so the edge can exit freely.
  - All other nodes (A, B, C) are obstacles as normal.

Batch 2 (passthrough = {}):
  - Edge A -> B: Both inside G, no groups to cross.
  - Group G IS an obstacle for unrelated edges.
```

### Code Flow

```
getAncestorGroups(nodeId)     → walks parentId chain, returns Set<string> of group IDs
getPassthroughGroups(edge)    → symmetricDifference(srcAncestors, tgtAncestors)
groupEdgesByPassthrough()     → Map<passthroughKey, Edge[]>

For each batch:
  router = new Router()
  register all nodes EXCEPT passthrough groups as obstacles
  register edges as connectors
  router.processTransaction()  → routes all edges in batch
```

This approach means:
- Edges between siblings inside a group route normally (group is an obstacle for outside edges)
- Edges crossing group boundaries route freely through those groups
- Multiple nesting levels work — deeply nested nodes correctly identify all ancestor groups

---

## Auto Best Side Detection

When `autoBestSideConnection` is enabled, the router automatically picks the optimal handle side (top/bottom/left/right) for each edge based on the relative positions of source and target nodes.

### Algorithm

```typescript
function getBestSides(srcBounds, tgtBounds) {
  // Compare center points of source and target
  dx = tgtCenter.x - srcCenter.x
  dy = tgtCenter.y - srcCenter.y

  if (|dx| >= |dy|) {
    // Horizontal dominant → use left/right sides
    dx >= 0 ? source=RIGHT, target=LEFT
           : source=LEFT,  target=RIGHT
  } else {
    // Vertical dominant → use top/bottom sides
    dy >= 0 ? source=BOTTOM, target=TOP
           : source=TOP,    target=BOTTOM
  }
}
```

### Visual Example

```
 Target is to the RIGHT (dx > dy):
 +-----+                    +-----+
 |  A  |---> RIGHT    LEFT --->  B  |
 +-----+                    +-----+
   source=RIGHT, target=LEFT

 Target is BELOW (dy > dx):
 +-----+
 |  A  |
 +--+--+
    | BOTTOM
    v
    | TOP
 +--+--+
 |  B  |
 +-----+
   source=BOTTOM, target=TOP
```

This ensures edges take the most natural path between nodes regardless of how handles are defined in the React Flow node data. Without this feature, edges use the handle positions specified in the node/edge data (defaulting to right→left).

---

## Collision Resolution (Group-Aware)

The `resolveCollisions()` utility pushes overlapping nodes apart iteratively. It is **group-aware** — it never pushes a parent group away from its children, which would destroy subflow layouts.

### How It Works

1. **Group by parent** — Non-group nodes are grouped by their `parentId`. Nodes with the same parent are "siblings."
2. **Resolve within sibling groups** — For each group of siblings, run the overlap-pushing algorithm. This only moves nodes that share the same container.
3. **Resolve root-level nodes** — Separately resolve root-level nodes (including groups) against each other, but **skip ancestor-descendant pairs** using the `areRelated()` check.

### Why This Matters

```
 WITHOUT group-awareness:
 +========================+        +-----+
 |  Group G               |        |  C  |
 |  +-----+               |        +-----+
 |  |  A  | ← drag here   |
 |  +-----+               |
 +========================+
              ↓
 Group G gets pushed LEFT, A stays → layout destroyed

 WITH group-awareness:
 Only sibling nodes within G get pushed apart.
 Group G itself is never pushed away from its children.
```

### The `areRelated()` Check

```typescript
function isAncestor(ancestorId, nodeId, nodeById) {
  // Walk up nodeId's parentId chain
  // Return true if ancestorId is found
}

function areRelated(a, b, nodeById) {
  return isAncestor(a.id, b.id) || isAncestor(b.id, a.id)
}
```

This prevents collision resolution from ever acting between a node and any of its ancestors, preserving the nested structure of subflows.
