require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");
const walletRoutes = require("./routes/wallet");
const adminRoutes = require("./routes/admin");
const catalogRoutes = require("./routes/catalog");
const adminCatalogRoutes = require("./routes/admin-catalog");

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "../uploads");

function getAllowedOrigins() {
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const fromEnv = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const extra = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set([...defaults, ...fromEnv, ...extra])];
}

const allowedOrigins = getAllowedOrigins();

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".vercel.app") || hostname.endsWith(".vercel.dev")) return true;
  } catch {
    return false;
  }

  return false;
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "pixel-digital-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/catalog", adminCatalogRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

app.listen(port, () => {
  console.log(`PIXEL DIGITAL API running at http://127.0.0.1:${port}`);
});

module.exports = app;
