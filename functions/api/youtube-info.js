import { jsonResponse } from "../_shared/catalog.js";
import { fetchYouTubeInfo } from "../_shared/youtube.js";

export async function onRequest(context) {
  if (context.request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET",
      },
    });
  }

  const requestUrl = new URL(context.request.url);
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
