type RateLimitInfo = {
  count: number;
  resetTime: number;
};

class RateLimiter {
  private limits: Map<string, RateLimitInfo>;
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.limits = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isRateLimited(ip: string): boolean {
    const now = Date.now();
    const limitInfo = this.limits.get(ip);

    if (!limitInfo || limitInfo.resetTime <= now) {
      this.limits.set(ip, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return false;
    }

    if (limitInfo.count >= this.maxRequests) {
      return true;
    }

    this.limits.set(ip, {
      count: limitInfo.count + 1,
      resetTime: limitInfo.resetTime
    });
    return false;
  }

  getResetTime(ip: string): number {
    const limitInfo = this.limits.get(ip);
    return limitInfo ? limitInfo.resetTime : Date.now();
  }
}

export const extractRateLimiter = new RateLimiter(5, 60000);
export const summarizeRateLimiter = new RateLimiter(3, 60000);

export function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return '127.0.0.1';
}
