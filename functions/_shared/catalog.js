const CATALOG_STORE_ID = "catalog";
let seedCatalogCache = null;
let memoryCatalog = null;

function getCatalogDatabase(env = {}) {
  return env.CATALOG_DB || env.DB || null;
}

async function readSeedCatalog(context) {
  if (!seedCatalogCache) {
    const seedUrl = new URL("/data/catalog.seed.json", context.request.url);
    const fetchSeed = context.env?.ASSETS?.fetch
      ? (request) => context.env.ASSETS.fetch(request)
      : (request) => fetch(request, { cache: "no-store" });

    const response = await fetchSeed(new Request(seedUrl.toString(), { method: "GET" }));
    if (!response.ok) {
      throw new Error(`Failed to load seed catalog (${response.status}).`);
    }

    seedCatalogCache = await response.json();
  }

  return seedCatalogCache;
}

async function ensureCatalogTable(env) {
  const db = getCatalogDatabase(env);
  if (!db) {
    return false;
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_store (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return true;
}

export function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
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

export async function loadCatalogWithSource(context) {
  const db = getCatalogDatabase(context.env);

  if (db) {
    try {
      await ensureCatalogTable(context.env);
      const row = await db
        .prepare("SELECT payload FROM catalog_store WHERE id = ?")
        .bind(CATALOG_STORE_ID)
        .first();

      if (row?.payload) {
        return {
          catalog: JSON.parse(row.payload),
          source: "d1",
        };
      }
    } catch (error) {
      // Fall back to the bundled seed when the database is unavailable.
    }
  }

  if (memoryCatalog) {
    return {
      catalog: memoryCatalog,
      source: "memory",
    };
  }

  return {
    catalog: await readSeedCatalog(context),
    source: "seed",
  };
}

export async function loadCatalog(context) {
  const { catalog } = await loadCatalogWithSource(context);
  return catalog;
}

export async function saveCatalog(context, catalog) {
  const db = getCatalogDatabase(context.env);
  const serializedCatalog = JSON.stringify(catalog, null, 2);

  if (db) {
    try {
      await ensureCatalogTable(context.env);
      await db
        .prepare(`
          INSERT INTO catalog_store (id, payload, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            payload = excluded.payload,
            updated_at = excluded.updated_at
        `)
        .bind(CATALOG_STORE_ID, serializedCatalog, new Date().toISOString())
        .run();

      return {
        catalog,
        source: "d1",
      };
    } catch (error) {
      memoryCatalog = catalog;
      return {
        catalog,
        source: "memory",
      };
    }
  }

  memoryCatalog = catalog;
  return {
    catalog,
    source: "memory",
  };
}
