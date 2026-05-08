function extractYouTubeVideoId(input) {
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

async function requestJson(urlString) {
  const response = await fetch(urlString, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error("Failed to parse YouTube metadata response.");
  }
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

export { extractYouTubeVideoId };
