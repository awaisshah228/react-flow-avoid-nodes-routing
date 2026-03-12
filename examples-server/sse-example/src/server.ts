/**
 * SSE server example.
 *
 * Shows how to use avoid-nodes-edge-server with SSE transport.
 * - POST /api/route  — client sends routing requests
 * - GET  /sse        — client connects to receive route updates via SSE
 *
 * Each SSE connection gets its own routing handler with isolated WASM.
 */

import http from "node:http";
import {
  createRoutingHandler,
  type RoutingRequest,
  type RoutingHandler,
} from "avoid-nodes-edge-server";

const PORT = 3002;

// Map session IDs to their handlers and SSE response streams
const sessions = new Map<string, { handler: RoutingHandler; res: http.ServerResponse }>();

function cors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Session-Id");
}

function main() {
  const server = http.createServer((req, res) => {
    cors(res);

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // SSE endpoint
    if (req.method === "GET" && req.url?.startsWith("/sse")) {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const sessionId = url.searchParams.get("sessionId") ?? crypto.randomUUID();

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      // Send session ID as first event
      res.write(`data: ${JSON.stringify({ command: "connected", sessionId })}\n\n`);

      const handler = createRoutingHandler();
      sessions.set(sessionId, { handler, res });

      req.on("close", () => {
        const session = sessions.get(sessionId);
        if (session) {
          session.handler.destroy();
          sessions.delete(sessionId);
        }
        console.log(`SSE session ${sessionId} disconnected`);
      });

      console.log(`SSE session ${sessionId} connected`);
      return;
    }

    // Route command endpoint
    if (req.method === "POST" && req.url === "/api/route") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", async () => {
        try {
          const { sessionId, ...msg } = JSON.parse(body) as RoutingRequest & { sessionId: string };
          const session = sessions.get(sessionId);
          if (!session) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Session not found" }));
            return;
          }

          const response = await session.handler.handleMessage(msg as RoutingRequest);

          // Push result via SSE
          session.res.write(`data: ${JSON.stringify(response)}\n\n`);

          // Also respond to the POST
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(PORT, () => {
    console.log(`SSE server listening on http://localhost:${PORT}`);
  });
}

main();
