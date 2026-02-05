import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { getPool } from "./dbConfig";
import { updateSwaggerSpec, swaggerSpec } from "./config/swagger";
// tsoa generated routes and swagger
import { RegisterRoutes } from "./generated/routes";
import * as tsoaSwaggerSpec from "./generated/swagger.json";
// Legacy routes (will be migrated to tsoa controllers)
// portfolioRoutes now handled by tsoa PortfolioController
// positionRoutes now handled by tsoa PositionsController
// import positionRoutes from "./routes/position";
// productRoutes now handled by tsoa ProductController
// referencesRoutes now handled by tsoa ReferenceData/Countries/Currencies controllers
// enumsDemoRoutes removed (not needed in production)
// usersRoutes now handled by tsoa UserController
// custodiansRoutes now handled by tsoa CustodiansController
// custodyServiceRoutes now handled by tsoa CustodyServiceController
// ordersRoutes now handled by tsoa OrdersController
// import ordersRoutes from "./routes/orders";
// producersRoutes now handled by tsoa ProducersController
// transactionRoutes now handled by tsoa TransactionsController
// import transactionRoutes from "./routes/transactions";
// paymentsRoutes now handled by tsoa PaymentsController
// adminRoutes now handled by tsoa AdminController
// registrationRoutes now handled by tsoa RegistrationController
// marketDataRoutes now handled by tsoa MarketDataController
// lbmaRoutes now handled by tsoa LbmaController
// Auth routes now handled by tsoa AuthController
// Authentication now handled by tsoa via @Security decorators and src/middleware/auth.ts
import { rawBodyMiddleware } from "./middleware/webhookMiddleware";
import { WebhookController } from "./controllers/WebhookController";

// Load environment variables first
dotenv.config();

const app = express();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        upgradeInsecureRequests: null, // Disable for local development
      },
    },
    hsts: false, // Disable HSTS for local development
  })
);
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

// Swagger UI - serve assets locally to avoid CDN/TLS issues
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'GoldSphere API Documentation',
  swaggerOptions: {
    persistAuthorization: true
  }
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

// tsoa generated routes (auto-generated controllers)
// Auth and Reference controllers are now handled by tsoa
RegisterRoutes(app);

// Legacy routes (will be migrated to tsoa controllers)
// productRoutes now handled by tsoa ProductController
// producersRoutes now handled by tsoa ProducersController
// marketDataRoutes now handled by tsoa MarketDataController
// lbmaRoutes now handled by tsoa LbmaController
// Legacy reference routes migrated to tsoa
// enumsDemoRoutes removed (not needed in production)
// registrationRoutes now handled by tsoa RegistrationController

// Swagger UI for tsoa-generated spec (accessible at /api-docs)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(tsoaSwaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'GoldSphere API Documentation (tsoa)',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

// Webhook routes (no auth required)
app.use("/api/payments/webhook", (req, res) => {
  const webhookController = new WebhookController();
  webhookController.stripeWebhook(req, res);
});

// Protected routes
// portfolioRoutes now handled by tsoa PortfolioController
// positionRoutes now handled by tsoa PositionsController
// usersRoutes now handled by tsoa UserController
// custodiansRoutes now handled by tsoa CustodiansController
// custodyServiceRoutes now handled by tsoa CustodyServiceController
// ordersRoutes now handled by tsoa OrdersController
// transactionRoutes now handled by tsoa TransactionsController
// paymentsRoutes now handled by tsoa PaymentsController
// adminRoutes now handled by tsoa AdminController

// 404 handler - must be AFTER all routes
app.use("*", (req: any, res: any) => {
  res.status(404).json({
    error: "Route not found",
    details: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: ["/health", "/info", "/api/products", "/api/auth/login"]
  });
});

// Error handler middleware - must be LAST
app.use((err: any, req: any, res: any, next: any) => {
  // tsoa validation errors
  if (err.status === 400 && err.fields) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.fields
    });
  }
  
  // Generic error handler
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  
  res.status(status).json({
    success: false,
    error: message
  });
});

export default app;
