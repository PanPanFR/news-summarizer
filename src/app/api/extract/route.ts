// app/api/extract/route.ts
import { NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export const runtime = "nodejs"; // wajib, karena jsdom ga jalan di edge runtime

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validasi domain berita (whitelist) & blokir domain bermasalah
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const whitelist = [
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
      const blocked = ["cnnindonesia.com"];
      const isAllowed = whitelist.some(d => host === d || host.endsWith(`.${d}`));
      if (!isAllowed) {
        return NextResponse.json({ error: "Hanya URL berita dari media tepercaya yang didukung." }, { status: 400 });
      }
      if (blocked.some(d => host === d || host.endsWith(`.${d}`))) {
        return NextResponse.json({ error: "Situs ini tidak didukung untuk ekstraksi otomatis." }, { status: 400 });
      }
    } catch {}

    // Ambil HTML dari URL berita (coba pakai User-Agent umum untuk sebagian situs)
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const html = await res.text();

    // Parse HTML pake jsdom
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json({ error: "Gagal extract artikel" }, { status: 500 });
    }

    return NextResponse.json({
      title: article.title,
      content: article.textContent,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Extract error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
