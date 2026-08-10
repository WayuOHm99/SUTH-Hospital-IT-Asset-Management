const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const contractsRoutes = require("./routes/contracts");
const dashboardRoutes = require("./routes/dashboard");
const devicesRoutes = require("./routes/devices");
const expenseRoutes = require("./routes/expense");
const importRoutes = require("./routes/imports");
const masterDataRoutes = require("./routes/master-data");
const printTransactionsRoutes = require("./routes/print-transactions");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Hospital IT Asset Management API 🚀",
    version: "1.0.0",
  });
});

// Authentication must be mounted before broad /api routers.
app.use("/api/auth", authRoutes);
app.use("/api", masterDataRoutes);
app.use("/api", importRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/contracts", contractsRoutes);
app.use("/api/print-transactions", printTransactionsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/expense", expenseRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.url} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: err.message || "Internal Server Error",
  });
});

module.exports = app;
