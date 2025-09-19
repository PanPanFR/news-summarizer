# AI News Summarizer

Summarize news articles from a URL using Readability extraction + Gemini.

## Features
- Paste URL → auto-extract the article → summarize to clean plain text.
- Modern, responsive UI with Tailwind, spinner, and a top progress bar while processing.
- Supported media list shown in an animated modal.
- Domain whitelist so only trusted news sites are allowed.

## Tech Stack
- Next.js (App Router)
- Tailwind CSS v4
- Gemini 1.5 Flash (Google Generative Language API)
- Mozilla Readability + JSDOM

## Setup
1) Install dependencies
```bash
npm install
```

2) Environment variables
Create `.env.local` in the project root:
```bash
GOOGLE_API_KEY=YOUR_API_KEY
```

3) Run the dev server
```bash
npm run dev
```
The app runs at `http://localhost:3000`.

## Configuration & Limits
- Domain whitelist is in `src/app/api/extract/route.ts` (array `whitelist`).
- Some sites (e.g., `cnnindonesia.com`) are blocked to avoid anti‑bot issues; the API responds with a friendly message.
- Output is plain text with structure: TL;DR, Key Points (numbered), 5W1H, Quote, Potential Bias, and Source.

## Build & Deploy
```bash
npm run build
npm start
```

Deploying to Vercel is recommended. Add `GOOGLE_API_KEY` in your project environment variables.

### Custom Domain
The application is accessible via the custom domain: [https://news.panpanfr.my.id/](https://news.panpanfr.my.id/)

## NPM Scripts
- `dev`  — run dev server
- `build` — production build
- `start` — start production server
- `lint` — run linter (optional)

## Usage Ethics
Use for personal summarization/study only. Respect copyright and each site’s robots/policy.
