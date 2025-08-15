import { Request, Response } from "express";
import dotenv from "dotenv";
import app from "./app";
import pool from "./dbConfig";

dotenv.config();

const PORT = process.env.PORT || 8080;

// Database connectivity check
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    console.log("🔍 Checking database connection...");
    const client = await pool.connect();
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

  app.listen(PORT, () => {
    console.log(`🚀 GoldSphere Server running on port ${PORT}`);
    if (dbConnected) {
      console.log("🗄️  Database: Connected and ready");
    } else {
      console.log("🗄️  Database: ❌ NOT CONNECTED");
    }
  });
}

// Start the server
startServer().catch((error) => {
  console.error("💥 Failed to start server:", error);
  process.exit(1);
});