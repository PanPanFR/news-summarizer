// app/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showSupported, setShowSupported] = useState(false);
  const [closingSupported, setClosingSupported] = useState(false);
  // Hapus semua logika toggle tema
  useEffect(() => {
    // pastikan class gelap tidak tertinggal
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
  }, []);

  async function handleExtract() {
    setErr(null); setOut(null); setLoading(true);
    try {
      const r = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal extract");
      setText(j.content);
    } catch (e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  async function handleSummarize() {
    setErr(null); setOut(null); setLoading(true);
    try {
      let workingText = text;

      if (!workingText) {
        if (!url) {
          throw new Error("Masukkan URL atau tempel teks artikel.");
        }
        // Otomatis ekstrak jika teks kosong namun URL tersedia
        const extRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const extJson = await extRes.json();
        if (!extRes.ok) throw new Error(extJson.error || "Gagal extract");
        workingText = extJson.content || "";
        setText(workingText);
        if (!workingText) throw new Error("Artikel kosong setelah ekstraksi.");
      }

      const r = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: workingText, url, lang: "id" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal summarize");
      // Bersihkan kemungkinan simbol markdown yang masih lolos
      const cleaned = String(j.summary)
        .replaceAll("**", "")
        .replaceAll(/^\s*[-*]\s+/gm, "• ")
        .trim();
      setOut(cleaned);
    } catch (e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-dvh bg-slate-100">
      <div className="max-w-3xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">AI News Summarizer</h1>
          <p className="text-sm text-gray-600 mt-1">Masukkan URL, tekan Ringkas — kami ekstrak & ringkas otomatis. <button onClick={() => { setClosingSupported(false); setShowSupported(true); }} className="text-blue-600 hover:underline">Lihat media yang didukung</button>.</p>
        </header>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium">URL Berita</label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                value={url}
                onChange={e=>setUrl(e.target.value)}
                placeholder="https://www.kompas.com/..."
                className="w-full sm:flex-1 border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSummarize}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-sm"
                disabled={!url || loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                    Memproses...
                  </span>
                ) : "Ringkas Sekarang"}
              </button>
            </div>
          </div>
        </section>

        {err && (
          <div className="mt-4 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            {err.includes("tidak didukung") || err.includes("Hanya URL berita") ? (
              <>
                {err} Silakan gunakan sumber berita lain yang didukung.
              </>
            ) : (
              <>Error: {err}</>
            )}
          </div>
        )}

        {out && (
          <section className="mt-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold mb-3">Ringkasan</h2>
            <article className="prose prose-sm max-w-none whitespace-pre-wrap">
              {out}
            </article>
          </section>
        )}

        <p className="mt-6 text-xs text-gray-500">
          Catatan: Hormati hak cipta & kebijakan situs. Gunakan untuk ringkasan & studi pribadi.
        </p>
      </div>

      {showSupported && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className={`absolute inset-0 bg-black/40 ${closingSupported ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => { setClosingSupported(true); setTimeout(() => setShowSupported(false), 180); }} />
          <div role="dialog" aria-modal="true" className={`relative bg-white rounded-xl shadow-lg border border-slate-200 w-[92%] max-w-lg p-5 ${closingSupported ? 'animate-scale-out' : 'animate-scale-in'}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Media yang Didukung</h2>
              <button onClick={() => { setClosingSupported(true); setTimeout(() => setShowSupported(false), 180); }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Daftar domain sumber berita yang bisa diekstrak otomatis.</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
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
              ].map((m) => (
                <li key={m} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{m}</li>
              ))}
            </ul>
            <div className="mt-4 text-right">
              <button onClick={() => { setClosingSupported(true); setTimeout(() => setShowSupported(false), 180); }} className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar saat loading */}
      {loading && (
        <div className="progress-track"><div className="progress-thumb" /></div>
      )}
    </main>
  );
}
