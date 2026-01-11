import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getPool } from "./dbConfig";
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
import { requestMetadataMiddleware } from "./middleware/responseMetadata";
import { RateLimitPresets } from "./middleware/rateLimiter";
import { etagMiddleware } from "./middleware/etag";

// Load environment variables first
dotenv.config();

export function createApp() {
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

  // Add request metadata middleware (adds requestId, timestamp, executionTime)
  app.use(requestMetadataMiddleware);

  // Add ETag middleware for HTTP caching (GET requests only)
  app.use(etagMiddleware);

  // Login endpoint with database authentication
  app.post("/api/auth/login", async (req: any, res: any) => {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      // Check database for user
      const result = await getPool().query("SELECT id, email, passwordhash FROM users WHERE email = $1", [email]);
      
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
        { id: user.id, email: user.email, role: userRole },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.json({ 
        success: true,
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
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
      console.log("Health check: About to test database connection");
      // Test database connection
      const dbResult = await getPool().query('SELECT 1 as db_check');
      const dbHealthy = dbResult.rows[0]?.db_check === 1;
      console.log("Health check: Database result:", dbResult.rows[0]);
      
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
      console.error("Health check error:", error);
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
    res.send(`openapi: '3.0.0'
info:
  title: GoldSphere API
  version: '1.0.0'
servers:
  - url: 'http://localhost:8080'
components:
  schemas: {}
paths: {}`);
  });

  // Rate limiting middleware with headers
  // Apply generous rate limit globally (300 req/15min)
  app.use(RateLimitPresets.readOnly);

  // Mount all route modules
  app.use("/api/portfolios", portfolioRoutes);
  app.use("/api/positions", positionRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/references", referencesRoutes);
  app.use("/api/enums", enumsDemoRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/custodians", custodiansRoutes);
  app.use("/api/custody", custodyServiceRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/transactions", transactionRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", registrationRoutes);

  // Webhook handling - commented out due to missing method
  // const webhookController = new WebhookController();
  // app.post("/api/webhooks/:type", webhookController.handleWebhook);

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

// Create a singleton instance for normal usage
const app = createApp();
export default app;
