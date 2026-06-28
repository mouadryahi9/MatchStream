import { logger } from "./logger.js";

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const BLOCKED_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.1[6-9]\./,
  /^172\.2[0-9]\./,
  /^172\.3[0-1]\./,
  /^192\.168\./,
  /^0\./,
  /^::1$/,
  /^localhost$/i,
  /^0\.0\.0\.0$/,
];

function isPrivateIP(hostname) {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(hostname));
}

const INJECTION_REGEX = /[;&|`$!(){}\[\]<>'"\\]/;

export function validateStreamUrl(url) {
  if (!url || typeof url !== "string") {
    throw new Error("URL is required");
  }

  // Decode first to check encoded injection
  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    throw new Error("Invalid URL encoding");
  }

  if (INJECTION_REGEX.test(decoded)) {
    logger.warn("urlValidator", "Injection attempt blocked", { url });
    throw new Error("URL contains invalid characters");
  }

  let parsed;
  try {
    parsed = new URL(decoded);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  if (isPrivateIP(parsed.hostname)) {
    throw new Error("Internal IP addresses are not allowed");
  }

  // Validate port range
  if (parsed.port) {
    const port = parseInt(parsed.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error("Invalid port number");
    }
  }

  // Limit URL length
  if (decoded.length > 2048) {
    throw new Error("URL too long");
  }

  return decoded;
}
