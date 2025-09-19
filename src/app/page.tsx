"use client";
import { useEffect, useState } from "react";
import HistoryPanel from "./components/HistoryPanel";

type HistoryItem = {
  id: string;
  url: string;
  title: string;
  summary: string;
  timestamp: number;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showSupported, setShowSupported] = useState(false);
  const [closingSupported, setClosingSupported] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  async function handleSummarize() {
    setErr(null); setOut(null); setLoading(true);
    try {
      let workingText = text;
      let extJson: { title?: string; content?: string; error?: string } | null = null;

      if (!workingText) {
        if (!url) {
          throw new Error("Masukkan URL atau tempel teks artikel.");
        }
        const extRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        extJson = await extRes.json();
        if (!extRes.ok) throw new Error(extJson?.error || "Gagal extract");
        workingText = extJson?.content || "";
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
      const cleaned = String(j.summary)
        .replaceAll("**", "")
        .replaceAll(/^\s*[-*]\s+/gm, "• ")
        .trim();
      setOut(cleaned);
      
      const title = extJson?.title || "Artikel Tanpa Judul";
      saveToHistory(url, title, cleaned);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setErr(message);
    } finally { setLoading(false); }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }

  function exportAsText(text: string, title: string) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ringkasan.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportAsJson(summary: string, url: string, title: string) {
    const data = {
      title,
      url,
      summary,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ringkasan.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
  }

  function saveToHistory(url: string, title: string, summary: string) {
    if (typeof window !== "undefined") {
      const historyItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        url,
        title,
        summary,
        timestamp: Date.now()
      };

      const saved = localStorage.getItem("newsSummaryHistory");
      let history: HistoryItem[] = [];
      if (saved) {
        try {
          history = JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }

      history.unshift(historyItem);

      if (history.length > 50) {
        history = history.slice(0, 50);
      }

      localStorage.setItem("newsSummaryHistory", JSON.stringify(history));
    }
  }

  function handleHistorySelect(item: HistoryItem) {
    setUrl(item.url);
    setOut(item.summary);
    setErr(null);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showExportMenu) {
        const exportButton = document.querySelector('.relative > button[aria-label="Ekspor ringkasan"]');
        const exportMenu = document.querySelector('.relative > div');
        
        if (exportButton && !exportButton.contains(event.target as Node) && 
            exportMenu && !exportMenu.contains(event.target as Node)) {
          setShowExportMenu(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  return (
    <main className="min-h-dvh bg-slate-100" aria-label="Halaman utama aplikasi peringkas berita AI">
      <div className="max-w-3xl mx-auto p-6">
        <header className="mb-6">
          <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI News Summarizer</h1>
              <p className="text-sm text-slate-600 mt-1">Masukkan URL, tekan Ringkas — kami ekstrak & ringkas otomatis.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowHistory(true)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 active:bg-slate-100 transition-all duration-150 text-slate-700 font-medium shadow-sm hover:shadow-md min-w-[100px] text-center"
                aria-label="Lihat riwayat ringkasan"
              >
                Riwayat
              </button>
            </div>
          </div>
          <button 
            onClick={() => { setClosingSupported(false); setShowSupported(true); }} 
            className="text-blue-600 hover:underline text-sm mt-2 inline-block font-medium"
            aria-label="Lihat daftar media yang didukung"
          >
            Lihat media yang didukung
          </button>
        </header>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5" aria-labelledby="form-heading">
          <div className="space-y-2">
            <label id="form-heading" className="block text-sm font-medium text-slate-900">URL Berita</label>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                value={url}
                onChange={e=>setUrl(e.target.value)}
                placeholder="https://www.kompas.com/..."
                className="w-full sm:flex-1 border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Masukkan URL berita"
              />
              <button
                onClick={handleSummarize}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 shadow-md hover:shadow-lg font-medium"
                disabled={!url || loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                    Memproses...
                  </span>
                ) : "Ringkas Sekarang"}
              </button>
            </div>
          </div>
        </section>

        {err && (
          <div className="mt-4 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm" role="alert" aria-live="polite">
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
          <section className="mt-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5" aria-labelledby="summary-heading">
            <div className="flex justify-between items-center mb-3 flex-col sm:flex-row gap-2">
              <h2 id="summary-heading" className="text-lg font-semibold text-slate-900">Ringkasan</h2>
              <div className="flex gap-3">
                <button 
                  onClick={() => copyToClipboard(out)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 active:bg-slate-100 transition-all duration-150 text-slate-700 font-medium shadow-sm hover:shadow-md min-w-[100px] text-center"
                  aria-label="Salin ringkasan ke clipboard"
                >
                  Salin
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 active:bg-slate-100 transition-all duration-150 text-slate-700 font-medium shadow-sm hover:shadow-md flex items-center gap-1 min-w-[100px] justify-center"
                    aria-label="Ekspor ringkasan"
                    aria-expanded={showExportMenu}
                  >
                    Ekspor
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden animate-fade-in">
                      <button 
                        onClick={() => {
                          const title = document.title || "Artikel Tanpa Judul";
                          exportAsText(out, title);
                          setShowExportMenu(false);
                        }}
                        className="block w-full text-left px-4 py-3 text-sm hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors duration-150"
                      >
                        <div className="font-medium">Teks (.txt)</div>
                        <div className="text-xs text-slate-500 mt-1">Format teks biasa</div>
                      </button>
                      <button 
                        onClick={() => {
                          const title = document.title || "Artikel Tanpa Judul";
                          exportAsJson(out, url, title);
                          setShowExportMenu(false);
                        }}
                        className="block w-full text-left px-4 py-3 text-sm hover:bg-slate-100 active:bg-slate-200 text-slate-700 transition-colors duration-150"
                      >
                        <div className="font-medium">JSON (.json)</div>
                        <div className="text-xs text-slate-500 mt-1">Format data terstruktur</div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <article className="prose prose-sm max-w-none whitespace-pre-wrap" aria-label="Isi ringkasan berita">
              {out}
            </article>
          </section>
        )}

        {showSupported && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="supported-media-heading">
          <div className={`absolute inset-0 bg-black/40 ${closingSupported ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => { setClosingSupported(true); setTimeout(() => setShowSupported(false), 180); }} aria-hidden="true" />
          <div className={`relative bg-white rounded-xl shadow-lg border border-slate-200 w-[92%] max-w-lg p-5 ${closingSupported ? 'animate-scale-out' : 'animate-scale-in'}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 id="supported-media-heading" className="text-lg font-semibold text-slate-900">Media yang Didukung</h2>
              <button 
                onClick={() => { setClosingSupported(true); setTimeout(() => setShowSupported(false), 180); }} 
                className="text-slate-500 hover:text-slate-700 active:text-slate-900 transition-colors duration-150"
                aria-label="Tutup dialog"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-3">Daftar domain sumber berita yang bisa diekstrak otomatis.</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm" aria-label="Daftar media yang didukung">
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
                <li key={m} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700">{m}</li>
              ))}
            </ul>
            <div className="mt-4 text-right">
              <button 
                onClick={() => { setClosingSupported(true); setTimeout(() => setShowSupported(false), 180); }} 
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 shadow-md hover:shadow-lg font-medium"
                aria-label="Tutup dialog media yang didukung"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="progress-track" role="status" aria-label="Memproses permintaan"><div className="progress-thumb" /></div>
      )}

      <HistoryPanel 
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleHistorySelect}
      />
    </div>
  </main>
  );
}
