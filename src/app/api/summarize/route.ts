// app/api/summarize/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  text?: string;
  url?: string;
  lang?: "id" | "en";
};

const model = "gemini-1.5-flash"; // cepat & hemat

function buildPrompt({ text, url, lang = "id" }: Body) {
  return `
Anda adalah asisten peringkas berita. Ringkaslah artikel berikut dalam bahasa ${lang === "id" ? "Indonesia" : "Inggris"}.
Output WAJIB berupa TEKS POLOS (plain text) tanpa format markdown, tanpa tanda bintang, tanpa bullet, tanpa heading markdown (#), tanpa link bertanda [].
Strukturkan ringkasan secara jelas dengan urutan paragraf berikut:
1. TL;DR: satu sampai dua kalimat inti.
2. Poin kunci: tulis sebagai kalimat terpisah per baris, diawali angka 1., 2., 3.
3. 5W1H: gunakan format "What:", "Who:", "When:", "Where:", "Why:", "How:" masing-masing satu baris.
4. Kutipan penting: jika ada, tulis sebagai kalimat biasa diapit tanda kutip ganda.
5. Potensi bias/angle: satu hingga dua kalimat.
6. Sumber: tulis URL sumber secara polos: ${url ?? "-"}.
Jaga akurasi, jangan menambah fakta baru. Jika ragu, nyatakan keraguan secara eksplisit.

=== ARTIKEL MULAI ===
${text}
=== ARTIKEL SELESAI ===
`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Body;
    if (!body?.text) return NextResponse.json({ error: "text wajib diisi" }, { status: 400 });

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
            // biarkan default aman
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

    return NextResponse.json({ summary: textOut });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
