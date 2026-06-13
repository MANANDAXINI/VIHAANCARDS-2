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
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(
  cors({
    origin: [frontendUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
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
