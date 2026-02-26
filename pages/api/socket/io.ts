import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseServerIO = NextApiResponse & {
    socket: {
        server: NetServer & {
            io: SocketIOServer;
        };
    };
};

export const config = {
    api: {
        bodyParser: false,
    },
};

export default function SocketHandler(req: unknown, res: NextApiResponseServerIO) {
    if (!res.socket.server.io) {
        console.log("Starting real-time Socket.io server...");
        const io = new SocketIOServer(res.socket.server as unknown as NetServer, {
            path: "/api/socket/io",
            addTrailingSlash: false,
        });

        io.on("connection", (socket) => {
            console.log("Client connected", socket.id);

            // Join a project room for real-time board updates
            socket.on("join-project", (projectId: string) => {
                socket.join(`project:${projectId}`);
                console.log(`Socket ${socket.id} joined project ${projectId}`);
            });

            // Broadcast issue movement to everyone else in the project room
            socket.on("issue-moved", (data: { projectId: string; issueId: string; newStatus: string }) => {
                socket.to(`project:${data.projectId}`).emit("issue-moved", data);
            });

            socket.on("disconnect", () => {
                console.log("Client disconnected", socket.id);
            });
        });

        res.socket.server.io = io;
    }

    res.end();
}
