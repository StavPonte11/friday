/**
 * Socket.IO server — Pages Router API handler.
 *
 * Handles real-time presence updates and board issue-moved events.
 * Extends the Next.js HTTP server with a Socket.IO instance (singleton pattern).
 */

import type { NextApiRequest } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export const config = {
  api: { bodyParser: false },
};

// ---------------------------------------------------------------------------
// In-memory presence map  userId → entry
// ---------------------------------------------------------------------------
interface PresenceEntry {
  userId: string;
  name: string;
  image: string | null;
  status: "online" | "idle" | "offline";
  currentView: string | null;
  lastSeenAt: Date;
}

const presenceMap = new Map<string, PresenceEntry>();

function broadcastPresence(io: SocketIOServer, room: string): void {
  const viewers = [...presenceMap.values()].filter(
    (p) => p.currentView === room && p.status !== "offline"
  );
  io.to(room).emit("presence-list", viewers);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default function SocketHandler(
  _req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  console.log("[Socket.IO] Initializing server...");

  const io = new SocketIOServer(res.socket.server as unknown as NetServer, {
    path: "/api/socket/io",
    addTrailingSlash: false,
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId as string | undefined;
    console.log("[Socket.IO] Client connected", socket.id, "userId:", userId);

    // -----------------------------------------------------------------------
    // join-room: enter a presence room (projectId, issueId, etc.)
    // -----------------------------------------------------------------------
    socket.on(
      "join-room",
      async (data: { room: string; name: string; image?: string }) => {
        const { room, name, image } = data;
        await socket.join(room);

        if (userId) {
          presenceMap.set(userId, {
            userId,
            name,
            image: image ?? null,
            status: "online",
            currentView: room,
            lastSeenAt: new Date(),
          });

          void prisma.userPresence
            .upsert({
              where: { userId },
              update: { status: "online", currentView: room, lastSeenAt: new Date() },
              create: { userId, status: "online", currentView: room },
            })
            .catch(() => null);

          broadcastPresence(io, room);
        }
      }
    );

    // Backwards-compat: old board page emits "join-project" with plain projectId
    socket.on("join-project", (projectId: string) => {
      void socket.join(projectId);
    });

    // -----------------------------------------------------------------------
    // heartbeat — keeps user "online"; sent every 30s from client
    // -----------------------------------------------------------------------
    socket.on("heartbeat", (data: { room: string }) => {
      if (userId && presenceMap.has(userId)) {
        const entry = presenceMap.get(userId)!;
        entry.status = "online";
        entry.lastSeenAt = new Date();
        presenceMap.set(userId, entry);
        broadcastPresence(io, data.room);
      }
    });

    // -----------------------------------------------------------------------
    // issue-moved: broadcast to others in the project room
    // -----------------------------------------------------------------------
    socket.on(
      "issue-moved",
      (data: { projectId: string; issueId: string; newStatus: string }) => {
        socket.to(data.projectId).emit("issue-moved", data);
      }
    );

    // -----------------------------------------------------------------------
    // disconnect — mark offline
    // -----------------------------------------------------------------------
    socket.on("disconnect", () => {
      console.log("[Socket.IO] Client disconnected", socket.id);
      if (!userId) return;

      const entry = presenceMap.get(userId);
      if (entry) {
        const room = entry.currentView ?? "";
        presenceMap.delete(userId);

        void prisma.userPresence
          .upsert({
            where: { userId },
            update: { status: "offline", lastSeenAt: new Date() },
            create: { userId, status: "offline" },
          })
          .catch(() => null);

        if (room) broadcastPresence(io, room);
      }
    });
  });

  // Mark users idle after 60s of no heartbeat
  setInterval(() => {
    const idleThreshold = 60_000;
    const now = Date.now();
    for (const [uid, entry] of presenceMap.entries()) {
      if (
        entry.status === "online" &&
        now - entry.lastSeenAt.getTime() > idleThreshold
      ) {
        entry.status = "idle";
        presenceMap.set(uid, entry);
        if (entry.currentView) broadcastPresence(io, entry.currentView);
      }
    }
  }, 30_000);

  res.end();
}
