// app/supported/page.tsx
export default function Supported() {
  const media = [
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

  return (
    <main className="min-h-dvh bg-slate-100">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-3">Media yang Didukung</h1>
        <p className="text-sm text-gray-600 mb-4">Daftar domain sumber berita yang bisa diekstrak otomatis.</p>
        <ul className="grid sm:grid-cols-2 gap-2">
          {media.map((m) => (
            <li key={m} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">{m}</li>
          ))}
        </ul>

        <a href="/" className="inline-block mt-6 text-blue-600 hover:underline text-sm">← Kembali ke Beranda</a>
      </div>
    </main>
  );
}


