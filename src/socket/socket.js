let activeUsers = new Set();
let searchingUsers = new Map();
let activeChats = new Map();

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
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      if (rooms.length > 0) {
        io.to(rooms[0]).emit("receiveMessage", message);
      } else {
        io.emit("receiveMessage", message);
      }
    });

    // Random Chat Implementation
    socket.on("find-partner", (userData) => {
      if (searchingUsers.has(socket.id)) return;

      console.log(`🔎 ${socket.id} started searching`);
      searchingUsers.set(socket.id, {
        ...userData,
        socketId: socket.id,
        timestamp: Date.now()
      });

      findAndMatchPartner(socket);
    });

    const findAndMatchPartner = (currentSocket) => {
      const currentUser = searchingUsers.get(currentSocket.id);
      if (!currentUser) return;

      const partnerEntry = Array.from(searchingUsers.entries())
        .find(([id, user]) => id !== currentSocket.id && !activeChats.has(id));

      if (partnerEntry) {
        const [partnerId, partnerData] = partnerEntry;
        const roomId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Join both sockets to room
        currentSocket.join(roomId);
        io.to(partnerId).socketsJoin(roomId);

        // Store chat session
        activeChats.set(roomId, {
          users: [currentSocket.id, partnerId],
          createdAt: Date.now()
        });

        // Notify both users
        io.to(currentSocket.id).emit("match-found", {
          id: partnerData.socketId,
          name: partnerData.name,
          profilePic: partnerData.profilePic
        });

        io.to(partnerId).emit("match-found", {
          id: currentUser.socketId,
          name: currentUser.name,
          profilePic: currentUser.profilePic
        });
        searchingUsers.delete(currentSocket.id);
        searchingUsers.delete(partnerId);

        console.log(`💬 Created room ${roomId} for ${currentSocket.id} and ${partnerId}`);
      } else {
        console.log(`⏳ No partners found for ${currentSocket.id}`);
        setTimeout(() => findAndMatchPartner(currentSocket), 2000);
      }
    };

    // Disconnection Handlers
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
          socket.leave(roomId);
        }
      });
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      activeUsers.delete(socket.id);
      searchingUsers.delete(socket.id);
      io.emit("activeUsers", activeUsers.size);

      // Handle active chat cleanup
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