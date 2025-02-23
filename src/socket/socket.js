import User from "../models/userModel.js";

let activeUsers = new Set(); 

export const initializeSocket = (io) => {
  io.on("connection", async (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);

    activeUsers.add(socket.id); 
    io.emit("activeUsers", activeUsers.size); 

    // Fetch total registered users from MongoDB
    try {
      const totalUsers = await User.countDocuments();
      io.emit("registeredUsers", totalUsers); 
    } catch (error) {
      console.error("Error fetching registered users:", error);
    }

    socket.on("sendMessage", (message) => {
      io.emit("receiveMessage", message);
    });

    socket.on("disconnect", () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
      activeUsers.delete(socket.id);
      io.emit("activeUsers", activeUsers.size);
    });
  });
};
