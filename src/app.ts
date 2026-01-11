import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import swaggerUi from "swagger-ui-express";
import { getPool } from "./dbConfig";
import { updateSwaggerSpec, swaggerSpec } from "./config/swagger";
import portfolioRoutes from "./routes/portfolio";
import positionRoutes from "./routes/position";
import productRoutes from "./routes/products";
import referencesRoutes from "./routes/references";
import enumsDemoRoutes from "./routes/enumsDemo";
import usersRoutes from "./routes/users";
import custodiansRoutes from "./routes/custodians";
import custodyServiceRoutes from "./routes/custodyService";
import ordersRoutes from "./routes/orders";
import producersRoutes from "./routes/producers"; // Fixed: Using local schemas
import transactionRoutes from "./routes/transactions";
import paymentsRoutes from "./routes/payments";
import adminRoutes from "./routes/admin";
import registrationRoutes from "./routes/registration";
import marketDataRoutes from "./routes/marketData";
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
    const result = await getPool().query("SELECT id, email, passwordhash FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.passwordhash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last_login timestamp
    await getPool().query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);

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
    // Test database connection
    const dbResult = await getPool().query('SELECT 1 as db_check');
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

// Swagger UI
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'GoldSphere API Documentation'
}));

app.get("/api-spec.yaml", (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/x-yaml');
  const spec = updateSwaggerSpec(req);
  const yamlContent = `openapi: ${spec.openapi}
info:
  title: ${spec.info.title}
  version: ${spec.info.version}
  description: ${spec.info.description}
servers:${spec.servers.map((server: any) => `
  - url: ${server.url}
    description: ${server.description}`).join('')}
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
paths:
  /auth/login:
    post:
      tags: [Auth]
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
      responses:
        '200':
          description: Successful login
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  token:
                    type: string
                  user:
                    type: object
  /products:
    get:
      tags: [Products]
      summary: Get all products
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: search
          in: query
          schema:
            type: string
      responses:
        '200':
          description: List of products
          content:
            application/json:
              schema:
                type: object
                properties:
                  products:
                    type: array
                    items:
                      type: object
                  pagination:
                    type: object
    post:
      tags: [Products]
      summary: Create a new product
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, type, metal, weight, price]
              properties:
                name:
                  type: string
                type:
                  type: string
                metal:
                  type: string
                weight:
                  type: number
                price:
                  type: number
      responses:
        '201':
          description: Product created successfully
  /users:
    get:
      tags: [Users]
      summary: Get all users (Admin only)
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: string
                    email:
                      type: string
                    username:
                      type: string`;
  res.send(yamlContent);
});

app.get("/api-spec.json", (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  const spec = updateSwaggerSpec(req);
  res.json(spec);
});

// Public routes
app.use("/api/products", productRoutes);
app.use("/api/producers", producersRoutes); // Fixed: Using local schemas
app.use("/api/market-data", marketDataRoutes);
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
