/**
 * Runtime environment validation
 *
 * Centralized startup validation to fail fast with explicit errors
 * for required configuration.
 */

const REQUIRED_ENV_VARS = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'APP_BASE_URL',
  'EMAIL_FROM',
] as const;

export type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

function validateUrlIfPresent(value: string | undefined, variableName: string): void {
  if (!value) {
    return;
  }

  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
    throw new Error(`Invalid URL in ${variableName}: ${value}`);
  }
}

export function validateRuntimeEnvironment(): void {
  const missingVariables = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === '';
  });

  if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  }

  const parsedPort = Number.parseInt(process.env.PORT as string, 10);
  if (Number.isNaN(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
  }

  const parsedDbPort = Number.parseInt(process.env.DB_PORT as string, 10);
  if (Number.isNaN(parsedDbPort) || parsedDbPort <= 0 || parsedDbPort > 65535) {
    throw new Error(`Invalid DB_PORT value: ${process.env.DB_PORT}`);
  }

  validateUrlIfPresent(process.env.APP_BASE_URL, 'APP_BASE_URL');
}

export function getRequiredEnvVar(variableName: RequiredEnvVar): string {
  const value = process.env[variableName];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${variableName}`);
  }

  return value;
}
