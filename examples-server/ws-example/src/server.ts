/**
 * WebSocket server example.
 *
 * Shows how to use avoid-nodes-edge-server with WebSocket transport.
 * Each connected client gets its own routing handler with isolated WASM.
 */

import { WebSocketServer } from "ws";
import {
  createRoutingHandler,
  type RoutingRequest,
} from "avoid-nodes-edge-server";

const PORT = 3001;

function main() {
  const wss = new WebSocketServer({ port: PORT });

  wss.on("connection", (ws) => {
    console.log("Client connected");
    const handler = createRoutingHandler();

    ws.on("message", async (data) => {
      try {
        const msg: RoutingRequest = JSON.parse(data.toString());
        const response = await handler.handleMessage(msg);
        ws.send(JSON.stringify(response));
      } catch (err) {
        ws.send(JSON.stringify({ command: "error", message: String(err) }));
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      handler.destroy();
    });
  });

  console.log(`WebSocket server listening on ws://localhost:${PORT}`);
}

main();
