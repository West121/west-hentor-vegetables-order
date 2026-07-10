const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="HanYang Fresh">
  <title>HanYang Fresh</title>
  <rect width="64" height="64" rx="16" fill="#0f2a1d"/>
  <path d="M18 40c16 0 27-8 31-26C32 17 21 24 18 40Z" fill="#2f9955"/>
  <path d="M20 43c9-12 18-18 28-24" fill="none" stroke="#f6fff5" stroke-width="5" stroke-linecap="round"/>
  <circle cx="20" cy="18" r="5" fill="#dff5dc"/>
</svg>`;

export async function GET() {
  return new Response(faviconSvg, {
    headers: {
      "cache-control": "public, max-age=86400",
      "content-type": "image/svg+xml; charset=utf-8",
    },
  });
}
