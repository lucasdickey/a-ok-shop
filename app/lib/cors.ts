/**
 * CORS utility for ACP endpoints
 * Validates origins based on environment configuration
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://a-ok.shop",
  "https://www.a-ok.shop",
];

/**
 * Get allowed origins from environment or defaults
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ACP_ALLOWED_ORIGINS;

  if (envOrigins) {
    // Parse comma-separated list from environment variable
    return envOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Check if origin matches localhost pattern (any port)
 */
function isLocalhostOrigin(origin: string): boolean {
  // Match http://localhost:* or http://127.0.0.1:*
  return (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("https://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("https://127.0.0.1:") ||
    origin === "http://localhost" ||
    origin === "https://localhost"
  );
}

/**
 * Validate if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  // In development, allow all localhost origins (any port)
  if (process.env.NODE_ENV === "development" && isLocalhostOrigin(origin)) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return false;
}

/**
 * Get CORS headers for a response
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigin = isOriginAllowed(requestOrigin)
    ? requestOrigin
    : getAllowedOrigins()[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type, Idempotency-Key",
  };
}
