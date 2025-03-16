import { Manager } from "socket.io-client";

interface User {
    userId: string;
    username: string;
    socketId: string;
}

class SocketService {
    private socket: ReturnType<typeof Manager.prototype.socket> | null = null;
    private noteId: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    connectWithStoredToken() {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            console.error("No stored token found for socket connection");
            return false;
        }
        console.log("Connecting socket with stored token");
        this.connect(token);
        return true;
    }

    connect(token: string, callback?: () => void) {
        if (!token) {
            console.error("Cannot connect: No token provided");
            return;
        }

        if (this.socket?.connected) {
            if (callback) callback();
            return;
        }

        // Disconnect existing socket if any
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        const socketUrl =
            import.meta.env.VITE_API_URL || "http://localhost:5000";

        console.log("Connecting to socket with token");

        // Extract raw token without Bearer prefix
        const rawToken = token.startsWith("Bearer ")
            ? token.substring(7)
            : token;

        // Pass raw token as a query parameter
        const manager = new Manager(socketUrl, {
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            timeout: 10000,
            transports: ["websocket", "polling"],
            query: {
                token: rawToken,
            },
        });

        this.socket = manager.socket("/");

        this.socket.on("connect", () => {
            console.log("Connected to socket server");
            this.reconnectAttempts = 0;

            // Rejoin note if we were in one
            if (this.noteId) {
                this.rejoinNote();
            }

            if (callback) callback();
        });

        this.socket.on("connect_error", (error: Error) => {
            console.error("Socket connection error:", error);
            this.reconnectAttempts++;

            // Check if it's an authentication error
            if (error.message.includes("Authentication error")) {
                console.error("Socket authentication failed:", error.message);

                // If token is invalid, try to get a new one
                if (error.message.includes("Invalid token")) {
                    console.log("Trying to refresh token...");
                    // This will trigger the API interceptor to refresh the token
                    // on the next API call
                    localStorage.removeItem("accessToken");
                }
            }

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error("Max reconnection attempts reached");
                this.socket?.disconnect();
            }
        });

        this.socket.on("disconnect", (reason: string) => {
            console.log("Disconnected from socket server:", reason);

            // If the disconnection wasn't intentional, try to reconnect
            if (reason === "io server disconnect") {
                // the disconnection was initiated by the server, reconnect manually
                this.socket?.connect();
            }
        });
    }

    private rejoinNote() {
        if (this.noteId && this.socket?.connected) {
            this.socket.emit("join-note", {
                noteId: this.noteId,
                username: localStorage.getItem("username") || "Anonymous",
                socketId: this.socket.id,
                clientId: Date.now().toString(),
            });
        }
    }

    disconnect() {
        if (this.socket) {
            if (this.noteId) {
                this.leaveNote(this.noteId);
            }
            this.socket.disconnect();
            this.socket = null;
            this.noteId = null;
        }
    }

    joinNote(noteId: string, username: string) {
        if (!this.socket?.connected) {
            console.error("Socket not connected");
            // Try to reconnect and join note after connection
            this.noteId = noteId;
            const token = localStorage.getItem("accessToken");
            if (token) {
                console.log(
                    "Attempting to reconnect socket before joining note",
                );
                // Clean up existing connections
                this.disconnect();

                // Connect with callback to join note after connection
                this.connect(token, () => {
                    console.log("Socket reconnected, joining note:", noteId);
                    if (this.socket?.connected) {
                        this.socket.emit("join-note", {
                            noteId,
                            username,
                            socketId: this.socket.id,
                            clientId: Date.now().toString(), // Add unique client ID for this browser session
                        });
                    }
                });
            }
            return;
        }
        this.noteId = noteId;
        this.socket.emit("join-note", {
            noteId,
            username,
            socketId: this.socket.id,
            clientId: Date.now().toString(), // Add unique client ID for this browser session
        });
    }

    leaveNote(noteId: string) {
        if (!this.socket?.connected) return;
        this.socket.emit("leave-note", { noteId });
        this.noteId = null;
    }

    updateNote(noteId: string, content: string, title: string) {
        if (!this.socket?.connected) return;
        this.socket.emit("update-note", { noteId, content, title });
    }

    updateCursor(noteId: string, position: { x: number; y: number }) {
        if (!this.socket?.connected) return;
        this.socket.emit("cursor-move", { noteId, position });
    }

    onUserJoined(
        callback: (data: { user: User; activeUsers: User[] }) => void,
    ) {
        if (!this.socket?.connected) return;
        this.socket.on("user-joined", callback);
    }

    onUserLeft(
        callback: (data: { userId: string; activeUsers: User[] }) => void,
    ) {
        if (!this.socket?.connected) return;
        this.socket.on("user-left", callback);
    }

    onActiveUsers(callback: (data: { activeUsers: User[] }) => void) {
        if (!this.socket?.connected) return;
        this.socket.on("active-users", callback);
    }

    onNoteUpdated(
        callback: (data: {
            content: string;
            title: string;
            userId: string;
        }) => void,
    ) {
        if (!this.socket?.connected) return;
        this.socket.on("note-updated", callback);
    }

    onCursorMoved(
        callback: (data: {
            userId: string;
            position: { x: number; y: number };
        }) => void,
    ) {
        if (!this.socket?.connected) return;
        this.socket.on("cursor-moved", callback);
    }

    removeAllListeners() {
        if (!this.socket) return;
        this.socket.removeAllListeners();
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const socketService = new SocketService();
