type CacheEntry<T = unknown> = {
  data: T;
  expiry: number;
};

class SimpleCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiry });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  clean(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const extractCache = new SimpleCache<{ 
  title: string; 
  content: string; 
  excerpt: string | null; 
  byline: string | null; 
  dir: string | null; 
}>(10 * 60 * 1000);

export const summarizeCache = new SimpleCache<{ summary: string }>(15 * 60 * 1000);

export function generateExtractCacheKey(url: string): string {
  return `extract:${url}`;
}

export function generateSummarizeCacheKey(text: string, lang: string): string {
  const textHash = btoa(encodeURIComponent(text)).substring(0, 32);
  return `summarize:${textHash}:${lang}`;
}
