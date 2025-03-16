import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyToken, extractToken } from "./utils/jwt";

interface User {
    userId: string;
    username: string;
}

interface NoteUser extends User {
    socketId: string;
    clientId: string;
}

// Track active users in each note
const noteUsers = new Map<string, NoteUser[]>();

export const initializeSocket = (httpServer: HttpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
            allowedHeaders: ["Authorization", "Content-Type"],
        },
        transports: ["websocket", "polling"],
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Log all connection attempts
    io.engine.on("connection", (socket) => {
        console.log("Transport connection attempt:", socket.id);
    });

    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            console.log("Socket auth attempt:", socket.id);

            // Try to get token from auth object or query parameters
            let tokenWithPrefix = socket.handshake.auth.token;

            // If no token in auth, check query params
            if (!tokenWithPrefix && socket.handshake.query.token) {
                tokenWithPrefix = socket.handshake.query.token as string;
                console.log("Found token in query parameters");
            }

            // If no token in auth or query, check headers for Authorization
            if (!tokenWithPrefix && socket.handshake.headers.authorization) {
                tokenWithPrefix = socket.handshake.headers.authorization;
                console.log("Found token in headers");
            }

            if (!tokenWithPrefix) {
                console.error("No token provided in socket handshake");
                return next(
                    new Error("Authentication error: No token provided"),
                );
            }

            // Extract token without prefix
            const token = extractToken(tokenWithPrefix);

            try {
                const decoded = await verifyToken(token);
                if (!decoded) {
                    return next(
                        new Error("Authentication error: Invalid token"),
                    );
                }
                socket.data.user = decoded;
                console.log("Socket authenticated successfully:", socket.id);
                next();
            } catch (tokenError) {
                console.error("Token verification failed:", tokenError);
                next(
                    new Error(
                        "Authentication error: Token verification failed",
                    ),
                );
            }
        } catch (error) {
            console.error("Socket authentication error:", error);
            next(
                new Error("Authentication error: " + (error as Error).message),
            );
        }
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // Handle joining a note
        socket.on("join-note", ({ noteId, username, clientId }) => {
            console.log(
                `User ${username} (${socket.id}) joining note ${noteId} with clientId ${clientId}`,
            );
            socket.join(noteId);

            const user: NoteUser = {
                userId: socket.data.user.userId,
                username,
                socketId: socket.id,
                clientId: clientId || Date.now().toString(), // Use provided clientId or generate one
            };

            // Add user to note's active users
            if (!noteUsers.has(noteId)) {
                noteUsers.set(noteId, []);
            }
            const users = noteUsers.get(noteId)!;

            // Only remove connections with the same socket ID
            // This allows multiple browser sessions from the same user account
            const filteredUsers = users.filter((u) => u.socketId !== socket.id);
            filteredUsers.push(user);
            noteUsers.set(noteId, filteredUsers);

            console.log(
                `Active users in note ${noteId}:`,
                noteUsers.get(noteId)?.length,
            );

            // Broadcast to everyone in the room (including sender)
            io.to(noteId).emit("active-users", {
                activeUsers: noteUsers.get(noteId),
            });

            // Broadcast to others in the note
            socket.to(noteId).emit("user-joined", {
                user,
                activeUsers: noteUsers.get(noteId),
            });

            // Send current active users to the joining user
            socket.emit("active-users", {
                activeUsers: noteUsers.get(noteId),
            });
        });

        // Handle leaving a note
        socket.on("leave-note", ({ noteId }) => {
            handleUserLeaveNote(socket, noteId);
        });

        // Handle note content updates
        socket.on("update-note", ({ noteId, content, title }) => {
            socket.to(noteId).emit("note-updated", {
                content,
                title,
                userId: socket.data.user.id,
            });
        });

        // Handle cursor position updates
        socket.on("cursor-move", ({ noteId, position }) => {
            socket.to(noteId).emit("cursor-moved", {
                userId: socket.data.user.id,
                position,
            });
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
            // Remove user from all notes they were in
            noteUsers.forEach((users, noteId) => {
                if (users.some((user) => user.socketId === socket.id)) {
                    handleUserLeaveNote(socket, noteId);
                }
            });
        });
    });

    const handleUserLeaveNote = (socket: any, noteId: string) => {
        console.log(`User ${socket.id} leaving note ${noteId}`);
        socket.leave(noteId);

        // Remove user from note's active users
        const users = noteUsers.get(noteId);
        if (users) {
            // Only remove this specific socket connection
            const userToRemove = users.find(
                (user) => user.socketId === socket.id,
            );
            const updatedUsers = users.filter(
                (user) => user.socketId !== socket.id,
            );

            if (updatedUsers.length === 0) {
                noteUsers.delete(noteId);
            } else {
                noteUsers.set(noteId, updatedUsers);
                // Notify others that user has left
                socket.to(noteId).emit("user-left", {
                    userId: userToRemove?.userId || socket.data.user?.userId,
                    socketId: socket.id,
                    activeUsers: updatedUsers,
                });
            }

            console.log(
                `Active users in note ${noteId} after leave:`,
                updatedUsers.length,
            );
        }
    };

    return io;
};
