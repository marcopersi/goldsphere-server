import { Request, Response } from "express";
import dotenv from "dotenv";
import app from "./app";
import { getPool } from "./dbConfig";
import { MarketDataServiceFactory } from "./services/market-data/MarketDataServiceFactory";
import type { MarketDataScheduler } from "./services/market-data/marketDataScheduler";

dotenv.config();

let marketDataScheduler: MarketDataScheduler | null = null;

if (!process.env.PORT) {
  console.error("❌ FATAL: Missing required environment variable PORT. Please set it in your .env file or environment.");
  process.exit(1);
}

const PORT = Number(process.env.PORT);
const ENABLE_MARKET_DATA_SCHEDULER = process.env.ENABLE_MARKET_DATA_SCHEDULER === 'true';

// Database connectivity check
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    console.log("🔍 Checking database connection...");
    const client = await getPool().connect();
    await client.query('SELECT 1');
    client.release();
    console.log("✅ Database connection successful!");
    return true;
  } catch (error) {
    console.log("❌ DATABASE CONNECTION FAILED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚨 CRITICAL ERROR: Cannot connect to PostgreSQL database");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 Please check the following:");
    console.log("   • Is the database server running?");
    console.log("   • Are the database credentials correct?");
    console.log("   • Is the database host reachable?");
    console.log("   • Check your .env file configuration");
    console.log("");
    console.log("🔧 Database configuration:");
    console.log(`   Host: ${process.env.DB_HOST || 'undefined'}`);
    console.log(`   Port: ${process.env.DB_PORT || 'undefined'}`);
    console.log(`   User: ${process.env.DB_USER || 'undefined'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'undefined'}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Error details:", (error as Error).message);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return false;
  }
}

// Basic error handling
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server with database check
async function startServer() {
  const dbConnected = await checkDatabaseConnection();
  
  if (!dbConnected) {
    console.log("⚠️  Starting server without database connection...");
    console.log("⚠️  Some endpoints may not function properly!");
    console.log("");
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 GoldSphere Server running on port ${PORT}`);
    if (dbConnected) {
      console.log("🗄️  Database: Connected and ready");
    } else {
      console.log("🗄️  Database: ❌ NOT CONNECTED");
    }
    
    // Initialize and start market data scheduler if enabled
    if (ENABLE_MARKET_DATA_SCHEDULER && dbConnected) {
      try {
        const marketDataService = MarketDataServiceFactory.create(getPool());
        marketDataScheduler = MarketDataServiceFactory.createScheduler(marketDataService);
        marketDataScheduler.initialize();
        marketDataScheduler.start();
        console.log("📊 Market Data Scheduler: Started");
      } catch (error) {
        console.error("⚠️  Market Data Scheduler failed to start:", error);
      }
    } else if (!ENABLE_MARKET_DATA_SCHEDULER) {
      console.log("📊 Market Data Scheduler: Disabled (set ENABLE_MARKET_DATA_SCHEDULER=true to enable)");
    }
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server gracefully');
  if (marketDataScheduler) {
    marketDataScheduler.stop();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing server gracefully');
  if (marketDataScheduler) {
    marketDataScheduler.stop();
  }
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error("💥 Failed to start server:", error);
  process.exit(1);
});