let activeUsers = new Set(); 

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);

    activeUsers.add(socket.id);
    io.emit("activeUsers", activeUsers.size); 
    socket.on("requestActiveUsers", () => {
      socket.emit("activeUsers", activeUsers.size);
    });

    socket.on("sendMessage", (message) => {
      io.emit("receiveMessage", message);
    });

    socket.on("disconnect", () => {
      console.log(`❌User disconnected: ${socket.id}`);
      activeUsers.delete(socket.id);
      io.emit("activeUsers", activeUsers.size);
    });
  });
};
