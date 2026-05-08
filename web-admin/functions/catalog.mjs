import { jsonResponse, loadCatalog, saveCatalog, validateCatalogPayload } from "./_shared/catalog.mjs";

export default async function handler(req) {
  if (req.method === "GET") {
    return jsonResponse(await loadCatalog());
  }

  if (req.method === "PUT" || req.method === "POST") {
    let parsed;

    try {
      parsed = await req.json();
    } catch (error) {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    if (!validateCatalogPayload(parsed)) {
      return jsonResponse({ error: "Invalid catalog payload." }, 400);
    }

    await saveCatalog(parsed);
    return jsonResponse({
      ok: true,
      updatedAt: new Date().toISOString(),
    });
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: {
      Allow: "GET, PUT, POST",
    },
  });
}
