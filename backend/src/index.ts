import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeSocket } from "./socket";
import authRoutes from "./routes/auth";
import notesRoutes from "./routes/notes";
import { errorHandler } from "./middleware/errorHandler";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
    }),
);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/auth", authRoutes);
app.use("/notes", notesRoutes);

// 404 handler for undefined routes
app.all("*", (req, res, next) => {
    res.status(404).json({
        status: "error",
        message: `Cannot find ${req.originalUrl} on this server!`,
    });
});

// Global error handler middleware
app.use(errorHandler);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/notes-app")
    .then(() => {
        console.log("Connected to MongoDB");
        // Start server
        const PORT = process.env.PORT || 5000;
        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
        process.exit(1); // Exit process with failure
    });

// Unhandled promise rejection handler
process.on("unhandledRejection", (err: Error) => {
    console.error("UNHANDLED REJECTION! 💥 Shutting down...");
    console.error(err.name, err.message);
    // Close server gracefully
    httpServer.close(() => {
        process.exit(1);
    });
});

// Socket.io connection
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});
