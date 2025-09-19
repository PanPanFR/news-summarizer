import { NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { extractRateLimiter, getClientIP } from "@/app/utils/rateLimit";
import { extractCache, generateExtractCacheKey } from "@/app/utils/cache";

export const runtime = "nodejs";

const WHITELIST = [
  "kompas.com",
  "detik.com",
  "tempo.co",
  "antaranews.com",
  "bbc.com",
  "cnbcindonesia.com",
  "republika.co.id",
  "katadata.co.id",
  "theguardian.com",
  "nytimes.com",
];

const BLOCKED = ["cnnindonesia.com"];

function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isDomainAllowed(domain: string): boolean {
  return WHITELIST.some(d => domain === d || domain.endsWith(`.${d}`));
}

function isDomainBlocked(domain: string): boolean {
  return BLOCKED.some(d => domain === d || domain.endsWith(`.${d}`));
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const cacheKey = generateExtractCacheKey(url);
    const cachedResult = extractCache.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    const ip = getClientIP(req);
    if (extractRateLimiter.isRateLimited(ip)) {
      const resetTime = extractRateLimiter.getResetTime(ip);
      const secondsLeft = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Rate limit exceeded. Coba lagi dalam ${secondsLeft} detik.` }, 
        { status: 429 }
      );
    }

    const domain = extractDomain(url);
    if (!domain) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    if (isDomainBlocked(domain)) {
      return NextResponse.json({ error: "Situs ini tidak didukung untuk ekstraksi otomatis." }, { status: 400 });
    }

    if (!isDomainAllowed(domain)) {
      return NextResponse.json({ error: "Hanya URL berita dari media tepercaya yang didukung." }, { status: 400 });
    }

    let res: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({ error: "Request timeout saat mengambil konten" }, { status: 408 });
      }
      const message = fetchError instanceof Error ? fetchError.message : "Unknown error";
      return NextResponse.json({ error: `Gagal mengambil konten: ${message}` }, { status: 500 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status}: Gagal mengambil konten dari situs` }, { status: res.status });
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      return NextResponse.json({ error: "URL tidak mengarah ke halaman HTML" }, { status: 400 });
    }

    const html = await res.text();

    let dom: JSDOM | null = null;
    try {
      dom = new JSDOM(html, { url });
    } catch (domError: unknown) {
      const message = domError instanceof Error ? domError.message : "Unknown error";
      return NextResponse.json({ error: `Gagal memproses HTML: ${message}` }, { status: 500 });
    }

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json({ error: "Gagal mengekstrak artikel. Konten mungkin tidak sesuai format berita." }, { status: 500 });
    }

    if (!article.textContent || article.textContent.trim().length < 100) {
      return NextResponse.json({ error: "Artikel terlalu pendek untuk diringkas" }, { status: 400 });
    }

    const result = {
      title: article.title || "Untitled",
      content: article.textContent,
      excerpt: article.excerpt || null,
      byline: article.byline || null,
      dir: article.dir || null,
    };

    extractCache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Extract error:", message);
    return NextResponse.json({ error: `Terjadi kesalahan: ${message}` }, { status: 500 });
  }
}
