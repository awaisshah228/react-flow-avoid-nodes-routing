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
