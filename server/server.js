require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const { connectDatabase } = require("./config/database");
const managerRoutes = require("./routes/managerRoutes");
const customerRoutes = require("./routes/customerRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const errorHandler = require("./middleware/errorHandler");
const { initializeSocket } = require("./utils/socket");

const PORT = process.env.PORT || 4000;

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms", {
      skip: (req) => req.path === "/health",
    }),
  );
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/managers", managerRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

app.use((req, res, next) => {
  const error = new Error("Route not found");
  error.status = 404;
  next(error);
});

app.use(errorHandler);

const server = http.createServer(app);

initializeSocket(server, {
  origin: process.env.CLIENT_ORIGIN ?? "*",
});

connectDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.info(`[server] Listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("[server] Failed to initialize application:", error);
    process.exit(1);
  });

module.exports = app;


