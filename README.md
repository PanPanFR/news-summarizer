# AI News Summarizer

Ringkas artikel berita secara otomatis dari URL menggunakan ekstraksi Readability + Gemini.

## Fitur
- Input URL → otomatis ekstrak artikel → ringkas ke teks polos yang terstruktur.
- UI modern dengan Tailwind, responsif, indikator proses (spinner + progress bar).
- Daftar media yang didukung via popup modal.
- Pembatasan domain: hanya beberapa media tepercaya (whitelist) yang diizinkan.

## Stack
- Next.js (App Router)
- Tailwind CSS v4
- Gemini 1.5 Flash (Google Generative Language API)
- Readability (Mozilla) + JSDOM

## Persiapan
1) Install dependencies
```bash
npm install
```

2) Siapkan environment variable API Gemini
- Buat file `.env.local` di folder proyek:
```bash
GOOGLE_API_KEY=YOUR_API_KEY
```

3) Jalankan development server
```bash
npm run dev
```
Aplikasi jalan di `http://localhost:3000`.

## Konfigurasi & Batasan
- Whitelist domain ada di `src/app/api/extract/route.ts` (array `whitelist`).
- Beberapa situs (mis. `cnnindonesia.com`) diblokir demi menghindari proteksi anti-bot; endpoint akan memberi pesan ramah.
- Output diset sebagai teks polos terstruktur: TL;DR, Poin kunci (numerik), 5W1H, Kutipan penting, Potensi bias, Sumber.

## Build & Deploy
```bash
npm run build
npm start
```

Deploy ke Vercel disarankan. Pastikan menambahkan `GOOGLE_API_KEY` di Environment Variables proyek.

## Skrip NPM
- `dev`  — jalankan dev server
- `build` — build produksi
- `start` — server produksi
- `lint` — jalan linter (opsional)

## Etika Penggunaan
Gunakan hanya untuk ringkasan/studi pribadi. Hormati hak cipta & robots/policy situs sumber.
