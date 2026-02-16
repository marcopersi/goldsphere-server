import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { getPool } from "./dbConfig";
import { updateSwaggerSpec, swaggerSpec } from "./config/swagger";
import { RegisterRoutes } from "./generated/routes";
import * as tsoaSwaggerSpec from "./generated/swagger.json";
import { rawBodyMiddleware } from "./middleware/webhookMiddleware";
import { WebhookController } from "./controllers/WebhookController";
import { RateLimitPresets, createRateLimiter, createUserRateLimiter } from "./middleware/rateLimiter";

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

// Endpoint-specific rate limiting
const registerRateLimiter = process.env.NODE_ENV === 'test'
  ? createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10000 })
  : RateLimitPresets.auth;

const profilePatchRateLimiter = createUserRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'test' ? 10000 : 30,
});

app.use('/api/auth/register', registerRateLimiter);
app.use('/api/users/:id/profile', profilePatchRateLimiter);

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
  const spec = updateSwaggerSpec(req);
  res.json(spec);
});

// Swagger UI - serve assets locally to avoid CDN/TLS issues
app.use(
  '/docs',
  swaggerUi.serveFiles(undefined, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GoldSphere API Documentation',
    swaggerOptions: {
      url: '/api-spec.json',
      persistAuthorization: true,
    },
  }),
  swaggerUi.setup(undefined, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GoldSphere API Documentation',
    swaggerOptions: {
      url: '/api-spec.json',
      persistAuthorization: true,
    },
  })
);

app.get("/api-spec.json", (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  const spec = updateSwaggerSpec(req);
  res.json(spec);
});

RegisterRoutes(app);

app.get('/api-docs/swagger.json', (_req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(tsoaSwaggerSpec);
});

// Swagger UI for tsoa-generated spec (accessible at /api-docs)
app.use(
  '/api-docs',
  swaggerUi.serveFiles(undefined, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GoldSphere API Documentation (tsoa)',
    swaggerOptions: {
      url: '/api-docs/swagger.json',
      persistAuthorization: true,
    },
  }),
  swaggerUi.setup(undefined, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GoldSphere API Documentation (tsoa)',
    swaggerOptions: {
      url: '/api-docs/swagger.json',
      persistAuthorization: true,
    },
  })
);

// Webhook routes (no auth required)
app.use("/api/payments/webhook", (req, res) => {
  const webhookController = new WebhookController();
  webhookController.stripeWebhook(req, res);
});

// 404 handler - must be AFTER all routes
app.use("*", (req: any, res: any) => {
  res.status(404).json({
    error: "Route not found",
    details: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: ["/health", "/info", "/api/products", "/api/auth/login"]
  });
});

// Error handler middleware - must be LAST
app.use((err: any, req: any, res: any, _next: any) => {
  // tsoa validation errors
  if (err.status === 400 && err.fields) {
    const fields = Object.entries(err.fields).map(([path, value]) => {
      const fieldError = value as { message?: string };
      return {
        path,
        message: fieldError.message || 'Invalid value',
      };
    });

    return res.status(400).json({
      success: false,
      error: "Validation failed",
      code: 'VALIDATION_ERROR',
      details: {
        fields,
      },
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
