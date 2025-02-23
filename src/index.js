import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import authRouter from "./routes/authRouter.js";
import "./db/dbConnection.js";
import { initializeSocket } from "./socket/socket.js"; // Import WebSocket logic

dotenv.config();
const app = express();
const server = createServer(app); // Create an HTTP server

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/auth", authRouter);

// Initialize WebSocket
initializeSocket(io);

server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
