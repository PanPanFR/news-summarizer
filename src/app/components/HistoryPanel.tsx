"use client";

import { useState, useEffect } from "react";

type HistoryItem = {
  id: string;
  url: string;
  title: string;
  summary: string;
  timestamp: number;
};

export default function HistoryPanel({ 
  isOpen, 
  onClose,
  onSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("newsSummaryHistory");
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && history.length > 0) {
      localStorage.setItem("newsSummaryHistory", JSON.stringify(history));
    }
  }, [history]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 180);
  };

  const handleSelect = (item: HistoryItem) => {
    onSelect(item);
    handleClose();
  };

  const clearHistory = () => {
    if (confirm("Yakin ingin menghapus riwayat?")) {
      setHistory([]);
      localStorage.removeItem("newsSummaryHistory");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="history-heading">
      <div 
        className={`absolute inset-0 bg-black/40 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} 
        onClick={handleClose}
        aria-hidden="true"
      />
      <div 
        className={`relative bg-white rounded-xl shadow-lg border border-slate-200 w-[92%] max-w-2xl p-5 ${closing ? 'animate-scale-out' : 'animate-scale-in'}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="history-heading" className="text-lg font-semibold text-slate-900">Riwayat Ringkasan</h2>
          <button 
            onClick={handleClose} 
            className="text-slate-500 hover:text-slate-700 active:text-slate-900 transition-colors duration-150"
            aria-label="Tutup dialog riwayat"
          >
            ✕
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-slate-500 text-center py-8" role="status">Belum ada riwayat</p>
        ) : (
          <>
            <div className="max-h-[60vh] overflow-y-auto space-y-3 mb-4" aria-label="Daftar riwayat ringkasan">
              {[...history].reverse().map((item) => (
                <div 
                  key={item.id}
                  className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => handleSelect(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelect(item);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Pilih ringkasan untuk ${item.title}`}
                >
                  <h3 className="font-medium line-clamp-2 text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-3">{item.summary}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-500 truncate">{new URL(item.url).hostname}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.timestamp).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={clearHistory}
                className="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100 transition-all duration-150 font-medium shadow-sm hover:shadow-md"
                aria-label="Hapus semua riwayat"
              >
                Hapus Riwayat
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
