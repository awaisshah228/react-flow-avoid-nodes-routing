/**
 * Socket.IO server example.
 *
 * Shows how to use avoid-nodes-edge-server with Socket.IO transport.
 * Each connected client gets its own routing handler with isolated WASM.
 *
 * Events:
 *   client → server:  "route" (RoutingRequest)
 *   server → client:  "routed" (RoutingResponse)
 */

import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  createRoutingHandler,
  type RoutingRequest,
} from "avoid-nodes-edge-server";

const PORT = 3003;

function main() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    const handler = createRoutingHandler();

    socket.on("route", async (msg: RoutingRequest) => {
      const response = await handler.handleMessage(msg);
      socket.emit("routed", response);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      handler.destroy();
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`Socket.IO server listening on http://localhost:${PORT}`);
  });
}

main();
