import { NextResponse } from "next/server";
import { summarizeRateLimiter, getClientIP } from "@/app/utils/rateLimit";
import { summarizeCache, generateSummarizeCacheKey } from "@/app/utils/cache";

export const runtime = "nodejs";

type Body = {
  text?: string;
  url?: string;
  lang?: "id" | "en";
};

const model = "gemini-1.5-flash";

function buildPrompt({ text, url, lang = "id" }: Body) {
  return `
Anda adalah asisten peringkas berita profesional. Tugas Anda adalah membuat ringkasan yang akurat, informatif, dan mudah dipahami dari artikel berita yang diberikan. Ringkaslah artikel berikut dalam bahasa ${lang === "id" ? "Indonesia" : "Inggris"}.

PETUNJUK OUTPUT:
- Output WAJIB berupa TEKS POLOS (plain text) tanpa format markdown, tanpa tanda bintang, tanpa bullet, tanpa heading markdown (#), tanpa link bertanda [].
- Gunakan struktur yang jelas dan konsisten untuk setiap ringkasan.

STRUKTUR RINGKASAN:
1. TL;DR: Satu hingga dua kalimat yang menangkap inti berita secara ringkas dan informatif. Fokus pada fakta utama.

2. Poin-poin Utama: 
   - Tulis 3-5 poin utama dari artikel sebagai kalimat terpisah per baris
   - Diawali dengan angka 1., 2., 3., dst
   - Setiap poin harus menyampaikan informasi penting dari artikel

3. 5W1H (Jika relevan):
   - What: Apa yang terjadi?
   - Who: Siapa yang terlibat?
   - When: Kapan kejadian terjadi?
   - Where: Di mana kejadian terjadi?
   - Why: Mengapa hal ini terjadi?
   - How: Bagaimana kejadian ini terjadi?
   (Catatan: Jika beberapa elemen 5W1H tidak relevan atau tidak disebutkan dalam artikel, lewati saja bagian tersebut)

4. Kutipan Penting (Jika ada):
   - Sertakan satu atau dua kutipan langsung yang paling penting atau representatif dari artikel
   - Tulis sebagai kalimat biasa diapit tanda kutip ganda

5. Konteks/Perspektif:
   - Satu hingga dua kalimat yang memberikan konteks tambahan atau menjelaskan sudut pandang dari berita tersebut
   - Bisa mencakup latar belakang isu, implikasi, atau relevansi dengan isu yang lebih luas

6. Sumber: ${url ?? "-"}

PENTING:
- Jaga akurasi dan hanya sampaikan informasi yang ada dalam artikel
- Jangan menambahkan fakta, opini, atau informasi yang tidak ada dalam artikel
- Jika informasi untuk suatu bagian tidak tersedia, lewati bagian tersebut
- Jika ragu tentang suatu informasi, nyatakan keraguan secara eksplisit
- Gunakan bahasa yang jelas, objektif, dan mudah dipahami

=== ARTIKEL MULAI ===
${text}
=== ARTIKEL SELESAI ===
`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Body;

    if (!body?.text) return NextResponse.json({ error: "text wajib diisi" }, { status: 400 });

    const cacheKey = generateSummarizeCacheKey(body.text, body.lang || "id");
    const cachedResult = summarizeCache.get(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    const ip = getClientIP(req);
    if (summarizeRateLimiter.isRateLimited(ip)) {
      const resetTime = summarizeRateLimiter.getResetTime(ip);
      const secondsLeft = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Rate limit exceeded. Coba lagi dalam ${secondsLeft} detik.` }, 
        { status: 429 }
      );
    }

    const prompt = buildPrompt(body);

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          },
          safetySettings: [
          ],
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json({ error: `Gemini error: ${errText}` }, { status: 502 });
    }

    const data: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    } = await resp.json();
    const textOut =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      (data?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text || "")
        .join("\n"));

    if (!textOut) {
      return NextResponse.json({ error: "Tidak ada output dari model." }, { status: 502 });
    }

    const result = { summary: textOut };
    summarizeCache.set(cacheKey, result);
    
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
