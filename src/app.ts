import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "./dbConfig";
import portfolioRoutes from "./routes/portfolio";
import positionRoutes from "./routes/position";
import productRoutes from "./routes/products";
import referencesRoutes from "./routes/references";
import enumsDemoRoutes from "./routes/enumsDemo";
import usersRoutes from "./routes/users";
import custodiansRoutes from "./routes/custodians";
import custodyServiceRoutes from "./routes/custodyService";
import ordersRoutes from "./routes/orders";
import transactionRoutes from "./routes/transactions";
import paymentsRoutes from "./routes/payments";
import adminRoutes from "./routes/admin";
import registrationRoutes from "./routes/registration";
import authMiddleware from "./authMiddleware";
import { rawBodyMiddleware } from "./middleware/webhookMiddleware";
import { WebhookController } from "./controllers/WebhookController";

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

// Use raw body middleware for webhook endpoints before JSON parsing
app.use(rawBodyMiddleware);
app.use(express.json({ limit: "5mb" }));

// Login endpoint with database authentication
app.post("/api/auth/login", async (req: any, res: any) => {
  const { email, password } = req.body;
  
  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Check database for user
    const result = await pool.query("SELECT id, username, email, passwordhash FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.passwordhash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token with role
    const userRole = user.email.includes('admin') ? 'admin' : 'user';
    const token = jwt.sign(
      { id: user.id, email: user.email, userName: user.username, role: userRole },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.json({ 
      success: true,
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        userName: user.username,
        role: userRole
      } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Auth validation endpoint
app.get("/api/auth/validate", authMiddleware, (req: any, res: any) => {
  res.json({ 
    success: true,
    user: req.user 
  });
});

// Health endpoint with database connectivity check
app.get("/health", async (req: any, res: any) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT 1 as db_check');
    const dbHealthy = dbResult.rows[0]?.db_check === 1;
    
    res.json({
      status: dbHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: {
        status: dbHealthy ? "connected" : "disconnected",
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
        // Note: Never expose password in health checks
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: {
        status: "error",
        error: error instanceof Error ? error.message : 'Unknown database error',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
      }
    });
  }
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
app.use("/api/enums", enumsDemoRoutes);
app.use("/api/auth", registrationRoutes);

// Webhook routes (no auth required)
app.use("/api/payments/webhook", (req, res) => {
  const webhookController = new WebhookController();
  webhookController.stripeWebhook(req, res);
});

// Protected routes
app.use("/api", authMiddleware, portfolioRoutes);
app.use("/api", authMiddleware, positionRoutes);
app.use("/api", authMiddleware, usersRoutes);
app.use("/api", authMiddleware, custodiansRoutes);
app.use("/api", authMiddleware, custodyServiceRoutes);
app.use("/api", authMiddleware, ordersRoutes);
app.use("/api", authMiddleware, transactionRoutes);
app.use("/api/payments", authMiddleware, paymentsRoutes);
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
