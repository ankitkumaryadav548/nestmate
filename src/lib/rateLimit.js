/**
 * In-memory sliding rate limiter.
 * 
 * NOTE: This is an in-memory implementation suitable for single-instance Node.js servers
 * and development. In a multi-tenant, serverless (Vercel/AWS Lambda), or multi-region
 * production deployment, an external shared distributed store such as Redis (e.g., Upstash Redis)
 * is REQUIRED to share rate limit counts across serverless function instances.
 */

const tracker = new Map();

// Periodic cleanup every 10 minutes to prevent memory leaks from inactive IPs
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of tracker.entries()) {
      if (now > data.resetTime) {
        tracker.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

/**
 * Checks whether an IP has exceeded the allowed request limit within the sliding window.
 * 
 * @param {string} ip - Client IP address or identifier
 * @param {number} [limit=10] - Maximum allowed attempts
 * @param {number} [windowMs=15 * 60 * 1000] - Time window in milliseconds (default: 15 min)
 * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
 */
export function rateLimit(ip, limit = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const safeIp = ip || "anonymous";

  let record = tracker.get(safeIp);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    tracker.set(safeIp, record);
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;

  if (record.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  return {
    allowed: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Helper to extract client IP address from Next.js Request.
 * 
 * @param {Request} request 
 * @returns {string}
 */
export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
