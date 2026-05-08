import { jsonResponse } from "./_shared/catalog.mjs";
import { fetchYouTubeInfo } from "./_shared/youtube.mjs";

export default async function handler(req) {
  if (req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET",
      },
    });
  }

  const requestUrl = new URL(req.url);
  const rawUrl = requestUrl.searchParams.get("url") || "";

  try {
    const metadata = await fetchYouTubeInfo(rawUrl);
    return jsonResponse({
      ok: true,
      ...metadata,
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error?.message || "Unable to read YouTube metadata.",
    }, 400);
  }
}
