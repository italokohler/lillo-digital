import { readFile } from "node:fs/promises";
import { getStore } from "@netlify/blobs";

const CATALOG_KEY = "catalog";
let seedCatalogCache = null;
let catalogStore = null;
let memoryCatalog = null;

async function readSeedCatalog() {
  if (!seedCatalogCache) {
    const text = await readFile(new URL("../../data/catalog.seed.json", import.meta.url), "utf8");
    seedCatalogCache = JSON.parse(text);
  }

  return seedCatalogCache;
}

function getCatalogStore() {
  if (catalogStore) {
    return catalogStore;
  }

  try {
    catalogStore = getStore("catalog");
    return catalogStore;
  } catch (error) {
    return null;
  }
}

export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function validateCatalogPayload(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return false;
  }

  const hasPages = Array.isArray(parsed.pages);
  const hasCategories = Array.isArray(parsed.categories);

  if (!hasPages && !hasCategories) {
    return false;
  }

  if ("pages" in parsed && !hasPages) {
    return false;
  }

  if ("categories" in parsed && !hasCategories) {
    return false;
  }

  return true;
}

export async function loadCatalog() {
  const store = getCatalogStore();

  if (store) {
    try {
      const catalog = await store.get(CATALOG_KEY, {
        type: "json",
        consistency: "strong",
      });

      if (catalog) {
        return catalog;
      }
    } catch (error) {
      // Fall back to the bundled seed when Blobs is unavailable or misconfigured.
    }
  }

  if (memoryCatalog) {
    return memoryCatalog;
  }

  return readSeedCatalog();
}

export async function saveCatalog(catalog) {
  const store = getCatalogStore();

  if (store) {
    try {
      await store.setJSON(CATALOG_KEY, catalog);
    } catch (error) {
      memoryCatalog = catalog;
      return catalog;
    }
  } else {
    memoryCatalog = catalog;
  }

  return catalog;
}
