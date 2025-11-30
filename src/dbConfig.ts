import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

let pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ...(process.env.NODE_ENV === 'test' && {
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })
});

export const setPool = (newPool: Pool) => {
  pool = newPool;
};

export const getPool = () => pool;

export default pool;