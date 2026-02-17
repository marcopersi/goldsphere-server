import { getRequiredEnvVar } from "../config/environment";

export function getApiBaseUrl(): string {
  const configuredBaseUrl = getRequiredEnvVar("APP_BASE_URL");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredBaseUrl);
  } catch {
    throw new Error(`Invalid APP_BASE_URL: ${configuredBaseUrl}`);
  }

  const configuredPort = process.env.PORT;
  if (configuredPort) {
    parsedUrl.port = configuredPort;
  }

  const normalizedBaseUrl = parsedUrl.toString();
  return normalizedBaseUrl.endsWith("/")
    ? normalizedBaseUrl.slice(0, -1)
    : normalizedBaseUrl;
}
