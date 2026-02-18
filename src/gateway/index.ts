// ============================================================
// CLAW BOT — Gateway WebSocket Hub
// Centrum sterowania: odbiera zdarzenia, routuje do agenta
// ============================================================

import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { logger } from "../logger/index.js";
import { config } from "../config/index.js";
import { sessionManager } from "./sessions.js";
import type { GatewayEvent } from "../types/index.js";

interface GatewayClient {
  ws: WebSocket;
  id: string;
  connectedAt: Date;
}

export class Gateway {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, GatewayClient> = new Map();
  private eventHandlers: Map<string, ((event: GatewayEvent) => Promise<void>)[]> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  async start(): Promise<void> {
    const server = createServer();
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws, req) => {
      // Tylko połączenia z localhost
      const remoteAddr = req.socket.remoteAddress ?? "";
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remoteAddr)) {
        logger.warn("Rejected non-local WebSocket connection", { remoteAddr });
        ws.close(1008, "Only localhost connections allowed");
        return;
      }

      const clientId = `gw-${Date.now()}`;
      this.clients.set(clientId, { ws, id: clientId, connectedAt: new Date() });

      logger.debug("Gateway client connected", { clientId });

      ws.on("message", async (data) => {
        try {
          const event: GatewayEvent = JSON.parse(data.toString());
          await this.dispatch(event);
        } catch (err) {
          logger.error("Gateway message parse error", { error: String(err) });
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        logger.debug("Gateway client disconnected", { clientId });
      });

      ws.on("error", (err) => {
        logger.error("Gateway WebSocket error", { clientId, error: err.message });
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(config.gateway.port, config.gateway.host, () => {
        logger.info(`Gateway listening on ws://${config.gateway.host}:${config.gateway.port}`);
        resolve();
      });
    });

    // Cleanup co godzinę
    this.cleanupInterval = setInterval(() => {
      sessionManager.cleanup();
    }, 60 * 60 * 1000);
  }

  async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
    }

    logger.info("Gateway stopped");
  }

  // Broadcast zdarzenia do wszystkich klientów
  broadcast(event: GatewayEvent): void {
    const data = JSON.stringify(event);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  // Zarejestruj handler dla typu zdarzenia
  on(eventType: string, handler: (event: GatewayEvent) => Promise<void>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // Wyślij zdarzenie do handlera
  async dispatch(event: GatewayEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        logger.error("Gateway event handler error", {
          eventType: event.type,
          error: String(err),
        });
      }
    }
  }

  // Statystyki
  stats(): object {
    return {
      clients: this.clients.size,
      sessions: sessionManager.stats(),
    };
  }
}

export const gateway = new Gateway();
export default gateway;
