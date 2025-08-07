import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
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

// Load environment variables first
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin in development
    if (origin.includes('localhost')) return callback(null, true);
    
    // In production, you'd have a whitelist
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: "5mb" }));

// Temporary login endpoint for testing
app.post("/api/auth/login", (req: any, res: any) => {
  const { email, password } = req.body;
  
  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  
  if (email === "admin@goldsphere.vault" && password === "admin123") {
    const token = jwt.sign(
      { id: "admin-id", email, role: "admin" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );
    res.json({ 
      success: true,
      token, 
      user: { id: "admin-id", email, role: "admin" } 
    });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Auth validation endpoint
app.get("/api/auth/validate", authMiddleware, (req: any, res: any) => {
  res.json({ 
    success: true,
    user: req.user 
  });
});

// Health endpoint
app.get("/health", (req: any, res: any) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development"
  });
});

// Info endpoint
app.get("/info", (req: any, res: any) => {
  res.json({
    name: "GoldSphere API",
    version: "1.0.0",
    description: "Precious metals trading platform API",
    documentation: "/docs",
    endpoints: ["/health", "/info", "/api/products", "/api/auth/login"],
    environment: process.env.NODE_ENV || "development"
  });
});

// API spec endpoints (basic implementation)
app.get("/api-spec", (req: any, res: any) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "GoldSphere API",
      version: "1.0.0"
    },
    servers: [{ url: "http://localhost:8080" }],
    components: { schemas: {} },
    paths: {}
  });
});

app.get("/docs", (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/html');
  res.send('<html><head><title>API Docs</title></head><body><div id="swagger-ui"></div></body></html>');
});

app.get("/api-spec.yaml", (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/x-yaml');
  res.send('openapi: 3.0.0\ninfo:\n  title: GoldSphere API\n  version: 1.0.0\npaths: {}');
});

// Public routes
app.use("/api/products", productRoutes);
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

// 404 handler - must be AFTER all routes
app.use("*", (req: any, res: any) => {
  res.status(404).json({
    error: "Route not found",
    details: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: ["/health", "/info", "/api/products", "/api/auth/login"]
  });
});

export default app;
