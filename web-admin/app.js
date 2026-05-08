const root = document.getElementById('catalog-root');
const statusEl = document.getElementById('status');
const updatedEl = document.getElementById('updated');
const reloadBtn = document.getElementById('reload-btn');
const addPageBtn = document.getElementById('add-page-btn');
const addVideoBtn = document.getElementById('add-video-btn');
const pageTemplate = document.getElementById('page-template');
const productRowTemplate = document.getElementById('product-row-template');

let catalog = null;
let saveTimer = null;
let saveInFlight = false;
let saveQueued = false;
const videoMetadataTimers = new Map();
const videoMetadataRequests = new Map();
const videoMetadataCache = new Map();

function createId(prefix = 'page') {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value, fallback = 0) {
  const normalized = String(value ?? '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function createProduct() {
  return {
    name: 'Novo item',
    price: 0,
    unit: 'kg',
    isPromo: false,
    promoLabel: null,
    imageLabel: null,
    note: null,
  };
}

function normalizeProduct(product = {}) {
  return {
    name: toText(product.name, 'Novo item'),
    price: toNumber(product.price, 0),
    unit: toText(product.unit, 'kg'),
    isPromo: Boolean(product.isPromo),
    promoLabel: product.promoLabel ?? null,
    imageLabel: product.imageLabel ?? null,
    note: product.note ?? null,
  };
}

function createPage(type = 'products') {
  const isVideo = type === 'video';
  return {
    id: createId(type),
    type: isVideo ? 'video' : 'products',
    name: isVideo ? 'Vídeo do YouTube' : 'Nova página',
    accentColor: isVideo ? '#7FB3D5' : '#D64040',
    banner: isVideo ? 'VÍDEO DO YOUTUBE' : 'PÁGINA FIXA',
    description: '',
    products: isVideo ? [] : [createProduct()],
    videoUrl: '',
    titleSource: isVideo ? 'auto' : 'manual',
  };
}

function normalizePage(page = {}, fallbackType = 'products') {
  const type = page.type === 'video' ? 'video' : fallbackType === 'video' ? 'video' : 'products';
  const isVideo = type === 'video';
  const titleSource = isVideo
    ? (toText(page.titleSource, '') === 'manual' ? 'manual' : 'auto')
    : 'manual';

  return {
    id: toText(page.id, createId(type)),
    type,
    name: toText(page.name, isVideo ? 'Vídeo do YouTube' : 'Nova página'),
    accentColor: toText(page.accentColor, isVideo ? '#7FB3D5' : '#D64040'),
    banner: toText(page.banner, isVideo ? 'VÍDEO DO YOUTUBE' : 'PÁGINA FIXA'),
    description: toText(page.description, ''),
    products: Array.isArray(page.products) ? page.products.map(normalizeProduct) : [],
    videoUrl: toText(page.videoUrl, ''),
    titleSource,
  };
}

function categoryToPage(category = {}) {
  return normalizePage({
    id: category.id,
    type: 'products',
    name: category.name,
    accentColor: category.accentColor,
    banner: category.banner,
    description: category.description,
    products: category.products,
  });
}

function pageToCategory(page = {}) {
  return {
    id: page.id || createId('category'),
    name: toText(page.name, 'Página'),
    accentColor: toText(page.accentColor, '#D64040'),
    banner: toText(page.banner, ''),
    description: toText(page.description, ''),
    products: Array.isArray(page.products) ? page.products.map(normalizeProduct) : [],
  };
}

function normalizeCatalog(raw = {}) {
  const pages = Array.isArray(raw.pages) && raw.pages.length
    ? raw.pages.map(normalizePage)
    : (Array.isArray(raw.categories) ? raw.categories.map(categoryToPage) : []);

  const legacyCategories = Array.isArray(raw.categories) && raw.categories.length
    ? raw.categories.map((category) => ({
        id: toText(category.id, createId('category')),
        name: toText(category.name, 'Categoria'),
        accentColor: toText(category.accentColor, '#D64040'),
        banner: toText(category.banner, ''),
        description: toText(category.description, ''),
        products: Array.isArray(category.products) ? category.products.map(normalizeProduct) : [],
      }))
    : pages.filter((page) => page.type === 'products').map(pageToCategory);

  return {
    storeName: toText(raw.storeName, 'ACOUGUE LILLO'),
    subtitle: toText(raw.subtitle, 'Painel digital de carnes e ofertas'),
    logoText: toText(raw.logoText, 'L'),
    theme: raw.theme === 'light' ? 'light' : 'dark',
    slideIntervalSeconds: toNumber(raw.slideIntervalSeconds, 12),
    tickerIntervalSeconds: toNumber(raw.tickerIntervalSeconds, 6),
    qrPayload: toText(raw.qrPayload, ''),
    remoteCatalogUrl: toText(raw.remoteCatalogUrl, ''),
    ambientMusicEnabled: Boolean(raw.ambientMusicEnabled),
    pages,
    categories: legacyCategories,
  };
}

function setStatus(text, tone = 'neutral') {
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

function setUpdated(text) {
  updatedEl.textContent = text;
}

function updateVideoNote(card, url) {
  const note = card.querySelector('.video-note');
  const videoId = extractYouTubeVideoId(url);
  const page = card.dataset.pageId ? getPageById(card.dataset.pageId) : null;
  const autoSource = page?.titleSource !== 'manual';

  if (!String(url || '').trim()) {
    note.textContent = autoSource
      ? 'Cole uma URL do YouTube para puxar nome e subtítulo automaticamente.'
      : 'Cole uma URL do YouTube para ativar esse slide.';
    return;
  }

  if (videoId) {
    note.textContent = autoSource
      ? 'Modo automático ligado. O nome e a linha de baixo vêm do vídeo.'
      : `Vídeo detectado: ${videoId}. Os textos podem ser editados manualmente.`;
  } else {
    note.textContent = 'Essa URL não parece ser um link válido do YouTube.';
  }
}

function getPageById(pageId) {
  if (!catalog || !pageId) {
    return null;
  }

  return catalog.pages.find((page) => page.id === pageId) || null;
}

function getPageCardById(pageId) {
  return Array.from(root.querySelectorAll('.page-card')).find((card) => card.dataset.pageId === pageId) || null;
}

function applyVideoMetadata(page, metadata = {}) {
  const nextName = toText(metadata.title, page.name);
  const nextBanner = toText(metadata.authorName, page.banner || 'YOUTUBE');
  let changed = false;

  if (page.name !== nextName) {
    page.name = nextName;
    changed = true;
  }

  if (page.banner !== nextBanner) {
    page.banner = nextBanner;
    changed = true;
  }

  return changed;
}

function queueVideoMetadataSync(pageId, force = false) {
  const page = getPageById(pageId);
  if (!page || page.type !== 'video' || page.titleSource === 'manual') {
    clearTimeout(videoMetadataTimers.get(pageId));
    videoMetadataTimers.delete(pageId);
    return;
  }

  const videoId = extractYouTubeVideoId(page.videoUrl);
  if (!videoId) {
    clearTimeout(videoMetadataTimers.get(pageId));
    videoMetadataTimers.delete(pageId);
    videoMetadataCache.delete(pageId);
    const card = getPageCardById(pageId);
    if (card) {
      updateVideoNote(card, page.videoUrl);
    }
    return;
  }

  const cached = videoMetadataCache.get(pageId);
  if (!force && cached && cached.videoId === videoId) {
    const card = getPageCardById(pageId);
    if (card) {
      updateVideoNote(card, page.videoUrl);
    }
    return;
  }

  clearTimeout(videoMetadataTimers.get(pageId));
  videoMetadataTimers.delete(pageId);

  videoMetadataTimers.set(pageId, setTimeout(() => {
    videoMetadataTimers.delete(pageId);
    syncVideoMetadata(pageId, videoId);
  }, force ? 0 : 350));
}

async function syncVideoMetadata(pageId, expectedVideoId) {
  const page = getPageById(pageId);
  if (!page || page.type !== 'video' || page.titleSource === 'manual') {
    return;
  }

  const currentVideoId = extractYouTubeVideoId(page.videoUrl);
  if (!currentVideoId || (expectedVideoId && currentVideoId !== expectedVideoId)) {
    return;
  }

  const requestId = (videoMetadataRequests.get(pageId) || 0) + 1;
  videoMetadataRequests.set(pageId, requestId);

  const card = getPageCardById(pageId);
  if (card) {
    updateVideoNote(card, page.videoUrl);
  }

  try {
    const response = await fetch(`/api/youtube-info?url=${encodeURIComponent(page.videoUrl)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Falha ao ler metadados (${response.status})`);
    }

    const metadata = await response.json();
    if (videoMetadataRequests.get(pageId) !== requestId) {
      return;
    }

    const currentPage = getPageById(pageId);
    if (!currentPage || currentPage.type !== 'video' || currentPage.titleSource === 'manual') {
      return;
    }

    const normalizedMetadata = {
      videoId: toText(metadata.videoId, currentVideoId),
      title: toText(metadata.title, ''),
      authorName: toText(metadata.authorName, ''),
    };

    videoMetadataCache.set(pageId, normalizedMetadata);
    const changed = applyVideoMetadata(currentPage, normalizedMetadata);
    const currentCard = getPageCardById(pageId);
    if (currentCard) {
      updateVideoNote(currentCard, currentPage.videoUrl);
    }

    if (changed) {
      renderCatalog();
      queueSave();
    }
  } catch (error) {
    if (videoMetadataRequests.get(pageId) !== requestId) {
      return;
    }

    videoMetadataCache.delete(pageId);
    const currentCard = getPageCardById(pageId);
    if (currentCard) {
      const note = currentCard.querySelector('.video-note');
      note.textContent = 'Nao foi possivel puxar o nome desse video agora. A pagina continua valendo.';
    }
  }
}

function extractYouTubeVideoId(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    return null;
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    if (host === 'youtu.be') {
      const shortId = url.pathname.split('/').filter(Boolean)[0];
      return shortId ? shortId.slice(0, 11) : null;
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        return videoId.slice(0, 11);
      }

      const segments = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(segments[0]) && segments[1]) {
        return segments[1].slice(0, 11);
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

async function fetchCatalogData() {
  const sources = ['/api/catalog', '/data/catalog.seed.json'];
  let lastError = null;

  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) {
        lastError = new Error(`Falha ao carregar catálogo (${response.status})`);
        continue;
      }

      return {
        raw: await response.json(),
        source,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Falha ao carregar catálogo.');
}

async function loadCatalog() {
  setStatus('Carregando...', 'neutral');

  const { raw, source } = await fetchCatalogData();
  catalog = normalizeCatalog(raw);
  renderCatalog();
  if (source === '/api/catalog') {
    setStatus('Pronto', 'success');
    setUpdated(`Atualizado agora: ${new Date().toLocaleTimeString('pt-BR')}`);
  } else {
    setStatus('Modo local', 'warning');
    setUpdated('Catálogo seed local carregado. Conecte a API para salvar na nuvem.');
  }
}

function buildSavePayload() {
  const pages = catalog.pages.map((page) => normalizePage(page));

  return {
    storeName: toText(catalog.storeName, 'ACOUGUE LILLO'),
    subtitle: toText(catalog.subtitle, 'Painel digital de carnes e ofertas'),
    logoText: toText(catalog.logoText, 'L'),
    theme: catalog.theme === 'light' ? 'light' : 'dark',
    slideIntervalSeconds: toNumber(catalog.slideIntervalSeconds, 12),
    tickerIntervalSeconds: toNumber(catalog.tickerIntervalSeconds, 6),
    qrPayload: toText(catalog.qrPayload, ''),
    remoteCatalogUrl: toText(catalog.remoteCatalogUrl, ''),
    ambientMusicEnabled: Boolean(catalog.ambientMusicEnabled),
    pages,
    categories: pages.filter((page) => page.type === 'products').map(pageToCategory),
  };
}

function renderCatalog() {
  root.innerHTML = '';

  if (!catalog.pages.length) {
    const emptyState = document.createElement('section');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <h2>Nenhuma página ainda</h2>
      <p>Use os botões acima para criar uma página fixa ou um vídeo do YouTube.</p>
    `;
    root.appendChild(emptyState);
    return;
  }

  catalog.pages.forEach((page, pageIndex) => {
    const card = pageTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.type = page.type;
    card.dataset.pageId = page.id;
    card.style.setProperty('--accent-color', page.accentColor || '#d64040');

    const isVideo = page.type === 'video';
    const pageData = catalog.pages[pageIndex];

    const pageIndexEl = card.querySelector('.page-index');
    pageIndexEl.textContent = `${pageIndex + 1} de ${catalog.pages.length}`;

    const typeBadge = card.querySelector('.page-type-badge');
    typeBadge.textContent = isVideo ? 'Vídeo YouTube' : 'Página fixa';
    typeBadge.classList.toggle('is-video', isVideo);

    const pageNameInput = card.querySelector('.page-name-input');
    pageNameInput.value = page.name;
    pageNameInput.addEventListener('input', () => {
      pageData.name = pageNameInput.value;
      if (pageData.type === 'video' && pageData.titleSource !== 'manual') {
        pageData.titleSource = 'manual';
        clearTimeout(videoMetadataTimers.get(pageData.id));
        videoMetadataTimers.delete(pageData.id);
      }
      if (pageData.type === 'video') {
        updateVideoNote(card, pageData.videoUrl);
      }
      setStatus('Alterações pendentes...', 'warning');
      queueSave();
    });

    const pageBannerInput = card.querySelector('.page-banner-input');
    pageBannerInput.value = page.banner;
    pageBannerInput.addEventListener('input', () => {
      pageData.banner = pageBannerInput.value;
      if (pageData.type === 'video' && pageData.titleSource !== 'manual') {
        pageData.titleSource = 'manual';
        clearTimeout(videoMetadataTimers.get(pageData.id));
        videoMetadataTimers.delete(pageData.id);
      }
      setStatus('Alterações pendentes...', 'warning');
      queueSave();
      if (pageData.type === 'video') {
        updateVideoNote(card, pageData.videoUrl);
      }
    });

    const pageDescriptionInput = card.querySelector('.page-description-input');
    pageDescriptionInput.value = page.description;
    pageDescriptionInput.addEventListener('input', () => {
      pageData.description = pageDescriptionInput.value;
      setStatus('Alterações pendentes...', 'warning');
      queueSave();
    });

    const pageColorInput = card.querySelector('.page-color-input');
    pageColorInput.value = page.accentColor || '#d64040';
    pageColorInput.addEventListener('input', () => {
      pageData.accentColor = pageColorInput.value;
      card.style.setProperty('--accent-color', pageColorInput.value);
      setStatus('Alterações pendentes...', 'warning');
      queueSave();
    });

    const moveUpBtn = card.querySelector('.move-up-btn');
    const moveDownBtn = card.querySelector('.move-down-btn');
    const removePageBtn = card.querySelector('.remove-page-btn');
    moveUpBtn.disabled = pageIndex === 0;
    moveDownBtn.disabled = pageIndex === catalog.pages.length - 1;

    moveUpBtn.addEventListener('click', () => movePage(pageIndex, -1));
    moveDownBtn.addEventListener('click', () => movePage(pageIndex, 1));
    removePageBtn.addEventListener('click', () => removePage(pageIndex));

    const productsSection = card.querySelector('.products-section');
    const videoSection = card.querySelector('.video-section');
    productsSection.hidden = isVideo;
    videoSection.hidden = !isVideo;

    const addProductBtn = card.querySelector('.add-product-btn');
    const rows = card.querySelector('.rows');

    if (!isVideo) {
      addProductBtn.addEventListener('click', () => {
        catalog.pages[pageIndex].products.push(createProduct());
        setStatus('Alterações pendentes...', 'warning');
        renderCatalog();
        queueSave();
      });

      if (page.products.length === 0) {
        const emptyRow = document.createElement('div');
        emptyRow.className = 'empty-inline';
        emptyRow.textContent = 'Nenhum produto nesta página.';
        rows.appendChild(emptyRow);
      } else {
        page.products.forEach((product, productIndex) => {
          const row = productRowTemplate.content.firstElementChild.cloneNode(true);
          row.classList.toggle('is-promo', Boolean(product.isPromo));

          const nameInput = row.querySelector('.product-name-input');
          nameInput.value = product.name;
          nameInput.addEventListener('input', () => {
            catalog.pages[pageIndex].products[productIndex].name = nameInput.value;
            setStatus('Alterações pendentes...', 'warning');
            queueSave();
          });

          row.querySelector('.product-unit').textContent = product.unit;

          const priceInput = row.querySelector('.price-input');
          priceInput.value = Number(product.price || 0).toFixed(2);
          priceInput.addEventListener('input', () => {
            catalog.pages[pageIndex].products[productIndex].price = toNumber(priceInput.value, 0);
            setStatus('Alterações pendentes...', 'warning');
            queueSave();
          });

          const promoInput = row.querySelector('.promo-input');
          promoInput.checked = Boolean(product.isPromo);
          promoInput.addEventListener('change', () => {
            catalog.pages[pageIndex].products[productIndex].isPromo = promoInput.checked;
            row.classList.toggle('is-promo', promoInput.checked);
            setStatus('Alterações pendentes...', 'warning');
            queueSave();
          });

          const removeProductBtn = row.querySelector('.remove-product-btn');
          removeProductBtn.addEventListener('click', () => {
            catalog.pages[pageIndex].products.splice(productIndex, 1);
            setStatus('Alterações pendentes...', 'warning');
            renderCatalog();
            queueSave();
          });

          rows.appendChild(row);
        });
      }
    } else {
      addProductBtn.disabled = true;
      rows.innerHTML = '';
      updateVideoNote(card, page.videoUrl);
      queueVideoMetadataSync(pageData.id);

      const videoUrlInput = card.querySelector('.video-url-input');
      videoUrlInput.value = page.videoUrl;
      videoUrlInput.addEventListener('input', () => {
        catalog.pages[pageIndex].videoUrl = videoUrlInput.value;
        updateVideoNote(card, videoUrlInput.value);
        queueVideoMetadataSync(pageData.id);
        setStatus('Alterações pendentes...', 'warning');
        queueSave();
      });
    }

    root.appendChild(card);
  });
}

function movePage(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= catalog.pages.length) {
    return;
  }

  const [page] = catalog.pages.splice(index, 1);
  catalog.pages.splice(nextIndex, 0, page);
  setStatus('Alterações pendentes...', 'warning');
  renderCatalog();
  queueSave();
}

function removePage(index) {
  const page = catalog.pages[index];
  const label = page?.name || 'esta página';

  if (!window.confirm(`Remover ${label}?`)) {
    return;
  }

  catalog.pages.splice(index, 1);
  setStatus('Alterações pendentes...', 'warning');
  renderCatalog();
  queueSave();
}

function addPage(type) {
  catalog.pages.push(createPage(type));
  setStatus('Nova página criada...', 'warning');
  renderCatalog();
  queueSave();
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveCatalog();
  }, 250);
}

async function saveCatalog() {
  if (!catalog) {
    return;
  }

  if (saveInFlight) {
    saveQueued = true;
    return;
  }

  saveInFlight = true;
  setStatus('Salvando...', 'neutral');

  try {
    const response = await fetch('/api/catalog', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildSavePayload(), null, 2),
    });

    if (!response.ok) {
      throw new Error(`Falha ao salvar (${response.status})`);
    }

    const result = await response.json();
    setStatus('Salvo', 'success');
    setUpdated(`Último envio: ${new Date(result.updatedAt).toLocaleTimeString('pt-BR')}`);
  } catch (error) {
    console.error(error);
    setStatus('Falha ao salvar', 'error');
  } finally {
    saveInFlight = false;
    if (saveQueued) {
      saveQueued = false;
      saveCatalog();
    }
  }
}

addPageBtn.addEventListener('click', () => addPage('products'));
addVideoBtn.addEventListener('click', () => addPage('video'));

reloadBtn.addEventListener('click', async () => {
  try {
    await loadCatalog();
  } catch (error) {
    console.error(error);
    setStatus('Falha ao recarregar', 'error');
  }
});

loadCatalog().catch((error) => {
  console.error(error);
  setStatus('Falha ao conectar', 'error');
  setUpdated('Verifique o servidor Node.');
});
