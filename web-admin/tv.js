const root = document.getElementById("tv-root");

const state = {
  catalog: null,
  catalogSignature: "",
  catalogSource: "api",
  slides: [],
  slideIndex: 0,
  slideTimer: null,
  pollTimer: null,
  renderToken: 0,
  currentBoard: null,
  currentPlayer: null,
  currentSlideId: null,
};

const POLL_INTERVAL_MS = 3000;
const FALLBACK_ADVANCE_MS = 12000;
const BOARD_SWAP_MS = 840;
const YOUTUBE_ORIGIN = window.location.origin;

function toText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value, 0));
}

function createId(prefix = "page") {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createBoardElement(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  const board = template.content.firstElementChild;

  if (!(board instanceof HTMLElement)) {
    throw new Error("Nao foi possivel montar o slide.");
  }

  return board;
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resetBoardInlineStyles(board) {
  if (!board) {
    return;
  }

  board.style.opacity = "";
  board.style.transform = "";
  board.style.filter = "";
}

function normalizeProduct(product = {}) {
  return {
    name: toText(product.name, "Novo item"),
    price: toNumber(product.price, 0),
    unit: toText(product.unit, "kg"),
    isPromo: Boolean(product.isPromo),
  };
}

function normalizePage(page = {}, fallbackType = "products") {
  const type = page.type === "video" ? "video" : fallbackType === "video" ? "video" : "products";
  const isVideo = type === "video";

  return {
    id: toText(page.id, createId(type)),
    type,
    name: toText(page.name, isVideo ? "Video do YouTube" : "Nova pagina"),
    accentColor: toText(page.accentColor, isVideo ? "#7fb3d5" : "#d64040"),
    banner: toText(page.banner, isVideo ? "VIDEO DO YOUTUBE" : "PAGINA FIXA"),
    description: toText(page.description, ""),
    products: Array.isArray(page.products) ? page.products.map(normalizeProduct) : [],
    videoUrl: toText(page.videoUrl, ""),
  };
}

function categoryToPage(category = {}) {
  return normalizePage({
    id: category.id,
    type: "products",
    name: category.name,
    accentColor: category.accentColor,
    banner: category.banner,
    description: category.description,
    products: category.products,
  });
}

function normalizeCatalog(raw = {}) {
  const pages = Array.isArray(raw.pages) && raw.pages.length
    ? raw.pages.map(normalizePage)
    : Array.isArray(raw.categories)
      ? raw.categories.map(categoryToPage)
      : [];

  return {
    storeName: toText(raw.storeName, "ACOUGUE LILLO"),
    subtitle: toText(raw.subtitle, "Painel digital de carnes e ofertas"),
    logoText: toText(raw.logoText, "L"),
    theme: raw.theme === "light" ? "light" : "dark",
    slideIntervalSeconds: toNumber(raw.slideIntervalSeconds, 12),
    tickerIntervalSeconds: toNumber(raw.tickerIntervalSeconds, 6),
    qrPayload: toText(raw.qrPayload, ""),
    remoteCatalogUrl: toText(raw.remoteCatalogUrl, ""),
    ambientMusicEnabled: Boolean(raw.ambientMusicEnabled),
    pages,
  };
}

function displayPages(catalog) {
  return Array.isArray(catalog.pages) ? catalog.pages : [];
}

async function fetchCatalogData() {
  const sources = ["/api/catalog", "/data/catalog.seed.json"];
  let lastError = null;

  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) {
        lastError = new Error(`Falha ao carregar catalogo (${response.status})`);
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

  throw lastError || new Error("Falha ao carregar catalogo.");
}

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

function getSlideText(index, count) {
  if (count > 1) {
    return `${String(index).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
  }

  return "SLIDE UNICO";
}

function stopSlideTimer() {
  if (state.slideTimer) {
    clearTimeout(state.slideTimer);
    state.slideTimer = null;
  }
}

function clearPlayer() {
  if (state.currentPlayer && typeof state.currentPlayer.destroy === "function") {
    try {
      state.currentPlayer.destroy();
    } catch (error) {
      // Ignore cleanup errors from stale players.
    }
  }

  state.currentPlayer = null;
}

function scheduleAdvance(delayMs) {
  stopSlideTimer();

  state.slideTimer = setTimeout(() => {
    advanceSlide();
  }, delayMs);
}

function advanceSlide() {
  if (!state.slides.length) {
    return;
  }

  state.slideIndex = (state.slideIndex + 1) % state.slides.length;
  renderSlide();
}

function getActiveBoard() {
  if (state.currentBoard && state.currentBoard.isConnected) {
    return state.currentBoard;
  }

  return root.querySelector(".board");
}

function destroyPlayer(player) {
  if (player && typeof player.destroy === "function") {
    try {
      player.destroy();
    } catch (error) {
      // Ignore cleanup errors from stale players.
    }
  }
}

function clearPlayer() {
  destroyPlayer(state.currentPlayer);
  state.currentPlayer = null;
}

function updateOverlay(title, subtitle, buttonLabel, board = getActiveBoard()) {
  const overlay = board?.querySelector("[data-video-overlay]");
  if (!overlay) {
    return;
  }

  overlay.querySelector("[data-video-title]").textContent = title;
  overlay.querySelector("[data-video-subtitle]").textContent = subtitle;
  const button = overlay.querySelector("[data-video-button]");
  if (buttonLabel) {
    button.textContent = buttonLabel;
    button.hidden = false;
  } else {
    button.hidden = true;
  }
  overlay.hidden = false;
}

function hideOverlay(board = getActiveBoard()) {
  const overlay = board?.querySelector("[data-video-overlay]");
  if (overlay) {
    overlay.hidden = true;
  }
}

function createHeader(slide, slideText) {
  const isVideo = slide.type === "video";
  const primaryText = isVideo ? slide.banner || state.catalog.subtitle : slide.name;
  const secondaryText = isVideo ? slide.name : slide.banner || state.catalog.subtitle;
  const primaryClass = isVideo ? "board-title is-video-channel" : "board-title";
  const secondaryClass = isVideo ? "board-subtitle is-video-title" : "board-subtitle";
  const slideAccent = slide.accentColor || "#d64040";

  return `
    <header class="board-header" style="--slide-accent:${escapeHtml(slideAccent)}">
      <img class="board-logo" src="/logo.png" alt="Casa de Carnes Lillo">
      <div class="board-copy">
        <h1 class="${primaryClass}">${escapeHtml(primaryText.toUpperCase())}</h1>
        <div class="board-rule"></div>
        <p class="${secondaryClass}">${escapeHtml(secondaryText.toUpperCase())}</p>
      </div>
      <div class="board-meta">
        <div class="slide-chip" style="border-color:${escapeHtml(slide.accentColor || "#d64040")}; background:${escapeHtml(slide.accentColor || "#d64040")}22">
          ${escapeHtml(slideText)}
        </div>
        <div class="board-tag">PAINEL DIGITAL</div>
      </div>
    </header>
  `;
}

function splitProducts(products, columns) {
  if (columns === 1) {
    return [products];
  }

  const half = Math.ceil(products.length / 2);
  return [products.slice(0, half), products.slice(half)];
}

function createProductRow(product) {
  return `
    <article class="product-row ${product.isPromo ? "is-promo" : ""}">
      <div class="product-copy">
        <div class="product-heading ${product.isPromo ? "is-promo" : ""}">
          ${product.isPromo ? '<span class="promo-chip promo-chip--lead">OFERTA</span>' : ""}
          <h2 class="product-name">${escapeHtml(product.name.toUpperCase())}</h2>
        </div>
      </div>
      <div class="price-ticket">
        <span class="price-currency">R$</span>
        <span class="price-value">${escapeHtml(formatPrice(product.price))}</span>
        <span class="price-unit">${escapeHtml(product.unit)}</span>
      </div>
    </article>
  `;
}

function createProductsSlide(slide) {
  const slideText = getSlideText(state.slideIndex + 1, state.slides.length);
  const products = Array.isArray(slide.products) ? slide.products : [];
  const columns = products.length > 7 && window.innerWidth >= 1200 ? 2 : 1;
  const groups = splitProducts(products, columns);
  const mainContent = products.length === 0
    ? `
      <div class="empty-slide">
        <div>
          <h2>Nenhum produto nesta pagina</h2>
          <p>Adicione itens no painel administrativo para preencher este slide.</p>
        </div>
      </div>
    `
    : `
      <div class="product-columns columns-${columns}">
        ${groups.map((group) => `
          <div class="product-column">
            ${group.map(createProductRow).join("")}
          </div>
        `).join("")}
      </div>
    `;

  return `
    <section class="board">
      <div class="board-backdrop"></div>
      <div class="board-watermark">
        <img src="/logo.png" alt="" aria-hidden="true">
      </div>
      ${createHeader(slide, slideText)}
      <div class="board-divider"></div>
      <section class="board-main">
        ${mainContent}
      </section>
    </section>
  `;
}

function createVideoSlide(slide, playerId) {
  const slideText = getSlideText(state.slideIndex + 1, state.slides.length);

  return `
    <section class="board">
      <div class="board-backdrop"></div>
      <div class="board-watermark">
        <img src="/logo.png" alt="" aria-hidden="true">
      </div>
      ${createHeader(slide, slideText)}
      <div class="board-divider"></div>
      <section class="board-main">
        <div class="video-stage">
          <div class="video-frame">
            <div id="${escapeHtml(playerId)}"></div>
            <div class="video-overlay" data-video-overlay hidden>
              <div>
                <h2 data-video-title>Video do YouTube</h2>
                <p data-video-subtitle>Carregando...</p>
                <button type="button" data-video-button>Continuar</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  `;
}

function renderEmptyState(message, leavingPlayer = state.currentPlayer) {
  const markup = `
    <section class="board">
      <div class="board-backdrop"></div>
      <div class="board-watermark">
        <img src="/logo.png" alt="" aria-hidden="true">
      </div>
      <header class="board-header" style="--slide-accent:#d64040">
        <img class="board-logo" src="/logo.png" alt="Casa de Carnes Lillo">
        <div class="board-copy">
          <h1 class="board-title">AGUARDANDO CATALOGO</h1>
          <div class="board-rule"></div>
          <p class="board-subtitle">Painel digital de carnes e ofertas</p>
        </div>
        <div class="board-meta">
          <div class="slide-chip">-- / --</div>
          <div class="board-tag">PAINEL DIGITAL</div>
        </div>
      </header>
      <div class="board-divider"></div>
      <section class="board-main">
        <div class="empty-slide">
          <div>
            <h2>${escapeHtml(message || "Carregando dados do catálogo...")}</h2>
            <p>O site continua tentando buscar a versão mais recente.</p>
          </div>
        </div>
      </section>
    </section>
  `;
  swapBoard(createBoardElement(markup), leavingPlayer);
}

function destroyVideoPlayer() {
  clearPlayer();
}

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (window.__lilloYouTubePromise) {
    return window.__lilloYouTubePromise;
  }

  window.__lilloYouTubePromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") {
        previousReady();
      }
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      reject(new Error("Nao foi possivel carregar a API do YouTube."));
    };
    document.head.appendChild(script);
  });

  return window.__lilloYouTubePromise;
}

function swapBoard(nextBoard, leavingPlayer = state.currentPlayer) {
  const previousBoard = getActiveBoard();
  const canAnimate = typeof nextBoard.animate === "function" && !prefersReducedMotion();

  if (!canAnimate) {
    nextBoard.classList.add("is-entering");
    root.appendChild(nextBoard);
    nextBoard.setAttribute("aria-hidden", "false");
    state.currentBoard = nextBoard;
    state.currentPlayer = null;

    if (previousBoard && previousBoard !== nextBoard) {
      previousBoard.setAttribute("aria-hidden", "true");
      previousBoard.classList.add("is-leaving");
    }

    window.requestAnimationFrame(() => {
      if (nextBoard.isConnected) {
        nextBoard.classList.add("is-active");
      }
    });

    window.setTimeout(() => {
      if (previousBoard && previousBoard !== nextBoard && previousBoard.isConnected) {
        previousBoard.remove();
      }
      destroyPlayer(leavingPlayer);
      resetBoardInlineStyles(nextBoard);
    }, BOARD_SWAP_MS);
    return;
  }

  nextBoard.style.opacity = "0";
  nextBoard.style.transform = "translateX(18%) scale(0.975)";
  nextBoard.style.filter = "blur(6px)";
  root.appendChild(nextBoard);
  nextBoard.setAttribute("aria-hidden", "false");
  state.currentBoard = nextBoard;
  state.currentPlayer = null;

  const enterAnimation = nextBoard.animate([
    { opacity: 0, transform: "translateX(18%) scale(0.975)", filter: "blur(6px)" },
    { opacity: 1, transform: "translateX(0) scale(1)", filter: "blur(0)" },
  ], {
    duration: 940,
    easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    fill: "forwards",
  });

  enterAnimation.finished.then(() => {
    resetBoardInlineStyles(nextBoard);
  }, () => {
    resetBoardInlineStyles(nextBoard);
  });

  if (previousBoard && previousBoard !== nextBoard) {
    previousBoard.setAttribute("aria-hidden", "true");
    const exitAnimation = typeof previousBoard.animate === "function"
      ? previousBoard.animate([
        { opacity: 1, transform: "translateX(0) scale(1)", filter: "blur(0)" },
        { opacity: 0, transform: "translateX(-18%) scale(0.97)", filter: "blur(5px)" },
      ], {
        duration: 660,
        easing: "ease",
        fill: "forwards",
      })
      : null;

    const cleanupPrevious = () => {
      if (previousBoard.isConnected) {
        previousBoard.remove();
      }
      destroyPlayer(leavingPlayer);
    };

    if (exitAnimation) {
      exitAnimation.finished.then(cleanupPrevious, cleanupPrevious);
    } else {
      window.setTimeout(cleanupPrevious, BOARD_SWAP_MS);
    }
    return;
  }

  destroyPlayer(leavingPlayer);
}

async function mountVideoPlayer(slide, renderToken, board, playerId) {
  const videoId = extractYouTubeVideoId(slide.videoUrl);
  if (!videoId) {
    updateOverlay("Video nao configurado", "Cole uma URL do YouTube no painel para este slide.", null, board);
    scheduleAdvance(FALLBACK_ADVANCE_MS);
    return;
  }

  try {
    await loadYouTubeApi();
  } catch (error) {
    if (renderToken !== state.renderToken) {
      return;
    }

    updateOverlay("Erro ao carregar o player", error?.message || "Nao foi possivel iniciar o video.", null, board);
    scheduleAdvance(2200);
    return;
  }

  if (renderToken !== state.renderToken) {
    return;
  }

  const container = board?.querySelector(`#${playerId}`);
  if (!container) {
    return;
  }

  try {
    state.currentPlayer = new window.YT.Player(playerId, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        fs: 0,
        iv_load_policy: 3,
        disablekb: 1,
        enablejsapi: 1,
        origin: YOUTUBE_ORIGIN,
        widget_referrer: YOUTUBE_ORIGIN,
      },
      events: {
        onReady: (event) => {
          if (renderToken !== state.renderToken) {
            return;
          }

          try {
            event.target.unMute();
            event.target.setVolume(100);
            event.target.playVideo();
          } catch (error) {
            updateOverlay("Nao foi possivel iniciar o som", "O navegador bloqueou o autoplay com audio.", null, board);
            scheduleAdvance(2200);
          }
        },
        onStateChange: (event) => {
          if (renderToken !== state.renderToken) {
            return;
          }

          if (event.data === window.YT.PlayerState.ENDED) {
            hideOverlay(board);
            advanceSlide();
          }
        },
        onError: () => {
          if (renderToken !== state.renderToken) {
            return;
          }

          updateOverlay("Video bloqueado pelo YouTube", "Esse video nao pode tocar embutido. O site vai seguir para o proximo slide.", null, board);
          scheduleAdvance(2200);
        },
        onAutoplayBlocked: () => {
          if (renderToken !== state.renderToken) {
            return;
          }

          updateOverlay("Autoplay bloqueado", "O navegador bloqueou a reproducao automatica. O site vai seguir adiante.", null, board);
          scheduleAdvance(2200);
        },
      },
    });
  } catch (error) {
    updateOverlay("Falha ao carregar video", error?.message || "Nao foi possivel abrir o player.", null, board);
    scheduleAdvance(2200);
  }
}

function renderSlide() {
  stopSlideTimer();
  const leavingPlayer = state.currentPlayer;
  state.currentPlayer = null;

  if (!state.slides.length) {
    renderEmptyState("Nenhuma pagina cadastrada", leavingPlayer);
    return;
  }

  state.slideIndex = Math.max(0, Math.min(state.slideIndex, state.slides.length - 1));
  const slide = state.slides[state.slideIndex];
  state.currentSlideId = slide.id;
  state.renderToken += 1;
  const renderToken = state.renderToken;
  const playerId = createId("youtube-player");
  const boardMarkup = slide.type === "video" ? createVideoSlide(slide, playerId) : createProductsSlide(slide);
  const nextBoard = createBoardElement(boardMarkup);

  swapBoard(nextBoard, leavingPlayer);

  if (slide.type === "video") {
    const videoId = extractYouTubeVideoId(slide.videoUrl);
    if (!videoId) {
      updateOverlay("Video do YouTube nao configurado", "Cole uma URL do YouTube para este slide tocar ate o fim.", null, nextBoard);
      scheduleAdvance(FALLBACK_ADVANCE_MS);
      return;
    }

    hideOverlay(nextBoard);
    mountVideoPlayer(slide, renderToken, nextBoard, playerId);
    return;
  }

  scheduleAdvance(Math.max(10, state.catalog?.slideIntervalSeconds || 12) * 1000);
}

async function loadCatalog() {
  const { raw, source } = await fetchCatalogData();
  const signature = JSON.stringify(raw);
  if (signature === state.catalogSignature && state.catalog) {
    return false;
  }

  state.catalogSignature = signature;
  state.catalogSource = source;
  state.catalog = normalizeCatalog(raw);
  state.slides = displayPages(state.catalog);

  if (state.slides.length === 0) {
    renderEmptyState("Nenhuma pagina ainda");
    return true;
  }

  if (state.currentSlideId) {
    const matchedIndex = state.slides.findIndex((slide) => slide.id === state.currentSlideId);
    if (matchedIndex >= 0) {
      state.slideIndex = matchedIndex;
    } else {
      state.slideIndex = Math.min(state.slideIndex, state.slides.length - 1);
    }
  } else {
    state.slideIndex = 0;
  }

  renderSlide();
  return true;
}

function startPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
  }

  state.pollTimer = setInterval(() => {
    loadCatalog().catch((error) => {
      console.error(error);
    });
  }, POLL_INTERVAL_MS);
}

function bindKeyboardShortcuts() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      advanceSlide();
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      if (!state.slides.length) {
        return;
      }

      state.slideIndex = state.slideIndex === 0 ? state.slides.length - 1 : state.slideIndex - 1;
      renderSlide();
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (state.currentPlayer && state.currentPlayer.pauseVideo) {
        const playerState = state.currentPlayer.getPlayerState ? state.currentPlayer.getPlayerState() : null;
        if (playerState === window.YT?.PlayerState?.PAUSED) {
          state.currentPlayer.playVideo();
        } else {
          state.currentPlayer.pauseVideo();
        }
      }
    }
  });
}

loadCatalog().catch((error) => {
  console.error(error);
  renderEmptyState("Falha ao conectar com o catalogo");
});
startPolling();
bindKeyboardShortcuts();
