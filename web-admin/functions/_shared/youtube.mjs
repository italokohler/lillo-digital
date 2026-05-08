import https from "node:https";

function requestJson(urlString, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(urlString, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LilloAdmin/1.0",
      },
    }, (response) => {
      const statusCode = response.statusCode || 0;
      const location = response.headers.location;

      if (statusCode >= 300 && statusCode < 400 && location) {
        response.resume();

        if (redirectCount >= 4) {
          reject(new Error("Too many redirects while reading YouTube metadata."));
          return;
        }

        const nextUrl = new URL(Array.isArray(location) ? location[0] : location, urlString).toString();
        resolve(requestJson(nextUrl, redirectCount + 1));
        return;
      }

      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`Request failed with status ${statusCode}.`));
        return;
      }

      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error("Failed to parse YouTube metadata response."));
        }
      });
    });

    request.setTimeout(6000, () => {
      request.destroy(new Error("YouTube metadata request timed out."));
    });
    request.on("error", reject);
  });
}

export function extractYouTubeVideoId(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return null;
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      const shortId = url.pathname.split("/").filter(Boolean)[0];
      return shortId ? shortId.slice(0, 11) : null;
    }

    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const videoId = url.searchParams.get("v");
      if (videoId) {
        return videoId.slice(0, 11);
      }

      const segments = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(segments[0]) && segments[1]) {
        return segments[1].slice(0, 11);
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

export async function fetchYouTubeInfo(rawUrl) {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL.");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  const metadata = await requestJson(oEmbedUrl);

  return {
    videoId,
    title: metadata.title || "",
    authorName: metadata.author_name || "",
    providerName: metadata.provider_name || "",
    thumbnailUrl: metadata.thumbnail_url || "",
  };
}
