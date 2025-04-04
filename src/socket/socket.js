let activeUsers = new Set();
let userQueue = [];
let activeChats = new Map();
let queueProcessor = null;

export const initializeSocket = (io) => {
  // Start queue processor if not running
  if (!queueProcessor) {
    queueProcessor = setInterval(() => processQueue(io), 1000);
  }

  io.on("connection", (socket) => {
    console.log(`🔵 User connected: ${socket.id}`);
    activeUsers.add(socket.id);
    io.emit("activeUsers", activeUsers.size);

    // Global Chat Handler
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
      if (userQueue.some(entry => entry.socketId === socket.id)) {
        return socket.emit("search-error", "You are already searching for a partner");
      }

      console.log(`🔎 ${socket.id} started searching`);
      const userEntry = {
        socketId: socket.id,
        userData: {
          ...userData,
          timestamp: Date.now()
        },
        socket: socket
      };

      userQueue.push(userEntry);
      socket.emit("search-started");
      processQueue(io);
    });

    socket.on("leave-queue", () => {
      userQueue = userQueue.filter(user => user.socketId !== socket.id);
      socket.emit("left-queue");
    });

    socket.on("leave-chat", () => {
      handleDisconnectionCleanup(socket, io, true);
      socket.emit("chat-left");
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      activeUsers.delete(socket.id);
      userQueue = userQueue.filter(user => user.socketId !== socket.id);
      io.emit("activeUsers", activeUsers.size);
      handleDisconnectionCleanup(socket, io, false);

      if (activeUsers.size === 0 && queueProcessor) {
        clearInterval(queueProcessor);
        queueProcessor = null;
      }
    });
  });
};

const processQueue = (io) => {
  try {
    // Create a copy of the queue to work with
    const processingQueue = [...userQueue];
    const shuffledQueue = processingQueue
      .sort((a, b) => a.userData.timestamp - b.userData.timestamp)
      .sort(() => Math.random() - 0.5); 

    while (shuffledQueue.length >= 2) {
      const user1 = shuffledQueue.shift();
      const user2Index = shuffledQueue.findIndex(
        user => user.socketId !== user1.socketId
      );

      if (user2Index === -1) break;

      const user2 = shuffledQueue.splice(user2Index, 1)[0];

      // Remove from main queue
      userQueue = userQueue.filter(
        u => u.socketId !== user1.socketId && u.socketId !== user2.socketId
      );

      // Create chat room
      const roomId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      user1.socket.join(roomId);
      user2.socket.join(roomId);

      activeChats.set(roomId, {
        users: [user1.socketId, user2.socketId],
        createdAt: Date.now()
      });

      // Store room reference
      user1.socket.currentRoom = roomId;
      user2.socket.currentRoom = roomId;

      // Notify users
      io.to(user1.socketId).emit("match-found", {
        id: user2.socketId,
        name: user2.userData.name,
        profilePic: user2.userData.profilePic,
        roomId: roomId
      });

      io.to(user2.socketId).emit("match-found", {
        id: user1.socketId,
        name: user1.userData.name,
        profilePic: user1.userData.profilePic,
        roomId: roomId
      });

      console.log(`💬 Created room ${roomId} for ${user1.socketId} and ${user2.socketId}`);
    }
  } catch (error) {
    console.error("Queue processing error:", error);
  }
};

const handleDisconnectionCleanup = (socket, io, isManualLeave) => {
  const roomId = socket.currentRoom;

  if (roomId && activeChats.has(roomId)) {
    const chat = activeChats.get(roomId);
    const partnerId = chat.users.find(id => id !== socket.id);

    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
      // Clean up partner
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.leave(roomId);
        delete partnerSocket.currentRoom;

        if (isManualLeave) {
          partnerSocket.emit("chat-ended");
        }
      }
    }

    // Clean up current user
    socket.leave(roomId);
    delete socket.currentRoom;
    activeChats.delete(roomId);
  }
};