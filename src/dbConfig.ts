import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

type PoolConfig = {
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
};

const DEFAULT_POOL_CONFIG: Record<string, PoolConfig> = {
  test: {
    max: 5,
    min: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  },
  development: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  },
  production: {
    max: Number.parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: Number.parseInt(process.env.DB_POOL_MIN || '5', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },
};

const getPoolConfig = (): PoolConfig => {
  const env = process.env.NODE_ENV || 'development';
  return DEFAULT_POOL_CONFIG[env] ?? DEFAULT_POOL_CONFIG.development;
};

let pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  ...getPoolConfig(),
});

export const setPool = (newPool: Pool) => {
  pool = newPool;
};

export const getPool = () => pool;

export default pool;