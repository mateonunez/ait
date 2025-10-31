/**
 * Generate a stable user ID based on browser fingerprint
 * This uses various browser characteristics to create a consistent ID
 * while respecting user privacy
 */
export function generateUserId(): string {
  // Check if we already have a stored userId
  const storedUserId = localStorage.getItem("ait_user_id");
  if (storedUserId) {
    return storedUserId;
  }

  // Generate a fingerprint from browser characteristics
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency || 0,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    // Add canvas fingerprinting
    getCanvasFingerprint(),
  ].join("|");

  // Create a hash from the fingerprint
  const userId = simpleHash(fingerprint);

  // Store for future use
  localStorage.setItem("ait_user_id", userId);

  return userId;
}

/**
 * Simple canvas fingerprinting for additional uniqueness
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";

    canvas.width = 200;
    canvas.height = 50;

    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("AIt fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("AIt fingerprint", 4, 17);

    return canvas.toDataURL().slice(-50); // Last 50 chars for size
  } catch {
    return "no-canvas";
  }
}

/**
 * Simple hash function for generating consistent IDs
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to base36 and prefix with 'user_'
  return `user_${Math.abs(hash).toString(36)}`;
}

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${random}`;
}

/**
 * Get current session ID or create a new one
 */
export function getSessionId(): string {
  const sessionKey = "ait_session_id";
  const expiryKey = "ait_session_expiry";

  // Check if we have a valid session
  const storedSessionId = sessionStorage.getItem(sessionKey);
  const storedExpiry = sessionStorage.getItem(expiryKey);

  if (storedSessionId && storedExpiry) {
    const expiry = Number.parseInt(storedExpiry, 10);
    if (Date.now() < expiry) {
      return storedSessionId;
    }
  }

  // Create new session (expires in 24 hours)
  const newSessionId = generateSessionId();
  const expiry = Date.now() + 24 * 60 * 60 * 1000;

  sessionStorage.setItem(sessionKey, newSessionId);
  sessionStorage.setItem(expiryKey, expiry.toString());

  return newSessionId;
}

/**
 * Clear the current session
 */
export function clearSession(): void {
  sessionStorage.removeItem("ait_session_id");
  sessionStorage.removeItem("ait_session_expiry");
}

/**
 * Reset user ID (for testing or user request)
 */
export function resetUserId(): void {
  localStorage.removeItem("ait_user_id");
}
