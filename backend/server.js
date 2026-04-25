const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const cors = require("cors");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

app.use(cors({
  origin: "https://waste-managmen-lpu.vercel.app", // ✅ no trailing slash
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

const PORT = process.env.PORT || 5000;
let isDatabaseReady = false;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

const requireDatabase = (req, res, next) => {
  if (!isDatabaseReady) {
    return res.status(503).json({
      msg: "Database is not configured yet. Add MONGO_URI in backend/.env to enable auth and request APIs."
    });
  }
  next();
};

const http = require("http");
const { Server } = require("socket.io");
const fs = require('fs');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5000", "https://waste-managmen-lpu.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make io accessible in routes
app.set("io", io);

io.on("connection", (socket) => {
  console.log("New client connected: " + socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected: " + socket.id);
  });
});

// Ensure uploads folder exists and serve it statically
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Import Routes
const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");
const userRoutes = require("./routes/userRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const workerRoutes = require("./routes/workerRoutes");

// API Routes
app.use("/auth", requireDatabase, authRoutes);
app.use("/api/requests", requireDatabase, requestRoutes);
app.use("/api/users", requireDatabase, userRoutes);
app.use("/api/rewards", requireDatabase, rewardRoutes);
app.use("/api/admin", requireDatabase, adminRoutes);
app.use("/api/worker", requireDatabase, workerRoutes);

// Frontend Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/login/:role", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

app.get("/register/:role", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

const startServer = async () => {
  isDatabaseReady = await connectDB();

  server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);

    if (!isDatabaseReady) {
      console.log("Running in frontend-only mode until MongoDB is configured.");
    }
  });
};

startServer();
