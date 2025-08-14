import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), // Ensure password is a string
  database: process.env.DB_NAME,
  // Add connection pool configuration for stability
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // Maximum wait time for connection from pool
  // CI environment optimizations
  ...(process.env.NODE_ENV === 'test' && {
    max: 5, // Fewer connections in test environment
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })
});

export default pool;