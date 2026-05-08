import { jsonResponse, loadCatalogWithSource, saveCatalog, validateCatalogPayload } from "../_shared/catalog.js";

export async function onRequest(context) {
  if (context.request.method === "GET") {
    const { catalog, source } = await loadCatalogWithSource(context);
    return jsonResponse(catalog, 200, {
      "X-Catalog-Source": source,
    });
  }

  if (context.request.method === "PUT" || context.request.method === "POST") {
    let parsed;

    try {
      parsed = await context.request.json();
    } catch (error) {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    if (!validateCatalogPayload(parsed)) {
      return jsonResponse({ error: "Invalid catalog payload." }, 400);
    }

    const result = await saveCatalog(context, parsed);
    return jsonResponse({
      ok: true,
      updatedAt: new Date().toISOString(),
    }, 200, {
      "X-Catalog-Source": result.source || "memory",
    });
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: {
      Allow: "GET, PUT, POST",
    },
  });
}
