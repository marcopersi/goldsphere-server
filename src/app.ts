import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import portfolioRoutes from "./routes/portfolio";
import positionRoutes from "./routes/position";
import productRoutes from "./routes/products";
import referencesRoutes from "./routes/references";
import usersRoutes from "./routes/users";
import custodiansRoutes from "./routes/custodians";
import custodyServiceRoutes from "./routes/custodyService";
import ordersRoutes from "./routes/orders";
import transactionRoutes from "./routes/transactions";
import adminRoutes from "./routes/admin";
import authMiddleware from "./authMiddleware";

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Temporary login endpoint for testing
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email === "admin@goldsphere.vault" && password === "admin123") {
    const token = jwt.sign(
      { id: "admin-id", email, role: "admin" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );
    res.json({ token, user: { id: "admin-id", email, role: "admin" } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Public routes
app.use("/api", productRoutes);
app.use("/api", referencesRoutes);

// Protected routes
app.use("/api", authMiddleware, portfolioRoutes);
app.use("/api", authMiddleware, positionRoutes);
app.use("/api", authMiddleware, usersRoutes);
app.use("/api", authMiddleware, custodiansRoutes);
app.use("/api", authMiddleware, custodyServiceRoutes);
app.use("/api", authMiddleware, ordersRoutes);
app.use("/api", authMiddleware, transactionRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);

export default app;
