const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const roomName = (cardId) => `card:${cardId}`;

app.prepare().then(() => {
  // Créé après prepare() : Next a chargé .env dans process.env
  const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
    log: ["warn", "error"],
  });

  /** Membre de l'équipe de la grille, ou admin (même règle que GET /api/cards/:id). */
  async function canAccessCard(userId, cardId) {
    const [membership, user] = await Promise.all([
      prisma.teamMember.findFirst({
        where: { userId, team: { cards: { some: { id: cardId } } } },
        select: { id: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
    ]);
    return membership !== null || user?.isAdmin === true;
  }

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
    // Garde la connexion vivante derrière un reverse-proxy
    pingInterval: 25000,
    pingTimeout: 20000,
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

  /** cardId → Map<socketId, { id, name }> des joueurs présents. */
  const cardRooms = new Map();

  function broadcastMembers(cardId) {
    const members = cardRooms.get(cardId);
    io.to(roomName(cardId)).emit("members-updated", members ? Array.from(members.values()) : []);
  }

  function leaveCard(socket, cardId) {
    const members = cardRooms.get(cardId);
    if (!members?.delete(socket.id)) return;
    if (members.size === 0) cardRooms.delete(cardId);
    socket.leave(roomName(cardId));
    broadcastMembers(cardId);
  }

  io.on("connection", (socket) => {
    const { userId, userName } = socket.data;

    socket.on("join-card", async ({ cardId } = {}) => {
      if (!cardId || typeof cardId !== "string") return;

      try {
        if (!(await canAccessCard(userId, cardId))) return;
      } catch (err) {
        console.error("[socket] join-card", err);
        return;
      }

      socket.join(roomName(cardId));
      if (!cardRooms.has(cardId)) cardRooms.set(cardId, new Map());
      cardRooms.get(cardId).set(socket.id, { id: userId, name: userName });
      broadcastMembers(cardId);
    });

    socket.on("leave-card", ({ cardId } = {}) => {
      if (typeof cardId === "string") leaveCard(socket, cardId);
    });

    // Les cases cochées sont diffusées par POST /api/cards/:id/check, après écriture en BDD.

    socket.on("bingo", ({ cardId } = {}) => {
      if (typeof cardId !== "string" || !socket.rooms.has(roomName(cardId))) return;
      // Aux autres joueurs seulement — le local a déjà fêté au clic
      socket.to(roomName(cardId)).emit("bingo-achieved", { userName });
    });

    socket.on("disconnect", () => {
      for (const cardId of Array.from(cardRooms.keys())) {
        leaveCard(socket, cardId);
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
