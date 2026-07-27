const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer();

  // 1. Socket.io BEFORE Next.js to intercept /api/socketio requests first
  const allowedOrigin = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "*";
  const io = new Server(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: dev ? "*" : allowedOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware Socket.io : vérifie le JWT NextAuth avant toute connexion
  io.use(async (socket, next) => {
    try {
      // Le cookie de session est transmis automatiquement par le navigateur
      const req = socket.request;
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      });

      if (!token || !token.id) {
        return next(new Error("Non authentifié"));
      }

      // Attacher l'identité vérifiée au socket
      socket.data.userId = token.id;
      socket.data.userName = token.name || token.email || "Anonyme";

      next();
    } catch (err) {
      next(new Error("Erreur d'authentification"));
    }
  });

  const cardRooms = new Map();

  io.on("connection", (socket) => {
    const { userId, userName } = socket.data;

    socket.on("join-card", ({ cardId }) => {
      if (!cardId || typeof cardId !== "string") return;

      socket.join(`card:${cardId}`);
      if (!cardRooms.has(cardId)) cardRooms.set(cardId, new Map());
      cardRooms.get(cardId).set(socket.id, { id: userId, name: userName });

      const members = Array.from(cardRooms.get(cardId).values());
      io.to(`card:${cardId}`).emit("members-updated", members);
    });

    socket.on("check-cell", ({ cardId, cellId, checked }) => {
      if (!cardId || !cellId || typeof checked !== "boolean") return;
      // Le nom vient du serveur, pas du client
      socket.to(`card:${cardId}`).emit("cell-updated", { cellId, checked, userName });
    });

    socket.on("bingo", ({ cardId, pattern }) => {
      if (!cardId) return;
      io.to(`card:${cardId}`).emit("bingo-achieved", { userName, pattern });
    });

    socket.on("disconnect", () => {
      for (const [cardId, members] of cardRooms.entries()) {
        if (members.has(socket.id)) {
          members.delete(socket.id);
          io.to(`card:${cardId}`).emit("members-updated", Array.from(members.values()));
        }
      }
    });
  });

  global.io = io;

  // 2. Next.js handler AFTER Socket.io
  httpServer.on("request", async (req, res) => {
    if (req.url && req.url.startsWith("/api/socketio")) return;
    try {
      await handle(req, res);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(
        `> Ready on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`
      );
    });
});
