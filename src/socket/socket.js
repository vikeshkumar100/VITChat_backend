let activeUsers = new Set();
let searchingUsers = new Map(); // Map<socketId, userData>
let activeChats = new Map(); // Map<roomId, { users: [socketId1, socketId2] }>

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);
    activeUsers.add(socket.id);
    io.emit("activeUsers", activeUsers.size);

    // Global Chat Handlers
    socket.on("requestActiveUsers", () => {
      socket.emit("activeUsers", activeUsers.size);
    });

    socket.on("sendMessage", (message) => {
      // Check if message is for global or random chat
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      if (rooms.length > 0) {
        // Random chat message
        io.to(rooms[0]).emit("receiveMessage", message);
      } else {
        // Global chat message
        io.emit("receiveMessage", message);
      }
    });

    // Random Chat Handlers
    socket.on("find-partner", (userData) => {
      searchingUsers.set(socket.id, {
        ...userData,
        socketId: socket.id
      });

      // Try to find a match
      const potentialPartners = Array.from(searchingUsers.entries())
        .filter(([id, _]) => id !== socket.id);

      if (potentialPartners.length > 0) {
        const [partnerId, partnerData] = potentialPartners[0];
        const roomId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Join both to room
        socket.join(roomId);
        io.to(partnerId).join(roomId);

        // Create chat session
        activeChats.set(roomId, {
          users: [socket.id, partnerId]
        });

        // Notify both users
        io.to(socket.id).emit("match-found", partnerData);
        io.to(partnerId).emit("match-found", searchingUsers.get(socket.id));

        // Remove from searching
        searchingUsers.delete(socket.id);
        searchingUsers.delete(partnerId);
      }
    });

    socket.on("leave-chat", () => {
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      rooms.forEach(roomId => {
        if (activeChats.has(roomId)) {
          const chat = activeChats.get(roomId);
          const partnerId = chat.users.find(id => id !== socket.id);
          if (partnerId) {
            io.to(partnerId).emit("partner-disconnected");
          }
          activeChats.delete(roomId);
        }
        socket.leave(roomId);
      });
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      activeUsers.delete(socket.id);
      io.emit("activeUsers", activeUsers.size);

      // Handle random chat cleanup
      searchingUsers.delete(socket.id);
      
      // Notify partner if in active chat
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      rooms.forEach(roomId => {
        if (activeChats.has(roomId)) {
          const chat = activeChats.get(roomId);
          const partnerId = chat.users.find(id => id !== socket.id);
          if (partnerId) {
            io.to(partnerId).emit("partner-disconnected");
          }
          activeChats.delete(roomId);
        }
      });
    });
  });
};