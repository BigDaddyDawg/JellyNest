(() => {
  const PAGE_SIZE = 48;
  const WISHLIST_KEY = "jellynest_wishlist_v1";
  const OWNED_KEY = "jellynest_owned_v1";
  const NEWS_URL = "https://www.jellycat.com/jelly-journal/";
  const LIVE_NEWS_URL = "https://r.jina.ai/http://www.jellycat.com/jelly-journal/";
  const FAV_PICKS = {
    Bashful: ["Bashful Bunny", "Bashful Blush Bunny", "Bashful Cream Bunny"],
    Amuseables: ["Amuseables Avocado", "Amuseables Toast", "Amuseables Coffee"],
    Bartholomew: ["Bartholomew Bear", "Bartholomew Bear Bag", "Bartholomew"],
  };
  const HEART_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.2s-6.7-4.2-9.1-8.1C1.2 9.4 2.1 6.4 5 5.4c1.8-.6 3.7.1 4.8 1.5C11 5.5 12.9 4.8 14.7 5.4c2.9 1 3.8 4 2.1 6.7-2.4 3.9-9.1 8.1-9.1 8.1z"/></svg>`;
  const CHECK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 13l4.5 4.5L19 7"/></svg>`;

  const els = {
    grid: document.getElementById("cardGrid"),
    sentinel: document.getElementById("sentinel"),
    empty: document.getElementById("emptyState"),
    countLabel: document.getElementById("countLabel"),
    search: document.getElementById("search"),
    themeFilter: document.getElementById("themeFilter"),
    catalogueFilter: document.getElementById("catalogueFilter"),
    yearFilter: document.getElementById("yearFilter"),
    statusFilter: document.getElementById("statusFilter"),
    clearFilters: document.getElementById("clearFilters"),
    activePills: document.getElementById("activePills"),
    modal: document.getElementById("cardModal"),
    modalClose: document.getElementById("modalClose"),
    modalImg: document.getElementById("modalImg"),
    modalStory: document.getElementById("modalStory"),
    modalName: document.getElementById("modalName"),
    modalVersion: document.getElementById("modalVersion"),
    modalTheme: document.getElementById("modalTheme"),
    modalCatalogue: document.getElementById("modalCatalogue"),
    modalYear: document.getElementById("modalYear"),
    modalStatus: document.getElementById("modalStatus"),
    modalWish: document.getElementById("modalWish"),
    modalOwn: document.getElementById("modalOwn"),
    panelCollection: document.getElementById("panelCollection"),
    panelOwned: document.getElementById("panelOwned"),
    panelWishlist: document.getElementById("panelWishlist"),
    panelComing: document.getElementById("panelComing"),
    tabCollection: document.getElementById("tabCollection"),
    tabOwned: document.getElementById("tabOwned"),
    tabWishlist: document.getElementById("tabWishlist"),
    tabComing: document.getElementById("tabComing"),
    ownedGrid: document.getElementById("ownedGrid"),
    ownedEmpty: document.getElementById("ownedEmpty"),
    ownedSearch: document.getElementById("ownedSearch"),
    ownedCountLabel: document.getElementById("ownedCountLabel"),
    ownedTabCount: document.getElementById("ownedTabCount"),
    wishGrid: document.getElementById("wishGrid"),
    wishEmpty: document.getElementById("wishEmpty"),
    wishSearch: document.getElementById("wishSearch"),
    wishCountLabel: document.getElementById("wishCountLabel"),
    wishTabCount: document.getElementById("wishTabCount"),
    comingStatus: document.getElementById("comingStatus"),
    comingRefresh: document.getElementById("comingRefresh"),
    upcomingSets: document.getElementById("upcomingSets"),
    newsList: document.getElementById("newsList"),
    revealsGrid: document.getElementById("revealsGrid"),
    revealsNote: document.getElementById("revealsNote"),
    leaksList: document.getElementById("leaksList"),
    leaksNote: document.getElementById("leaksNote"),
  };

  /** @type {{cards: any[], themes?: string[], catalogues?: string[], years?: string[], statuses?: string[], count?: number}} */
  let catalog = { cards: [], themes: [], catalogues: [], years: [], statuses: [] };
  let filtered = [];
  let shown = 0;
  let searchTimer = null;
  let wishSearchTimer = null;
  let ownedSearchTimer = null;
  let comingLoaded = false;
  let comingBusy = false;
  /** @type {any} */
  let comingData = null;
  /** @type {any[]} */
  let comingDisplayCards = [];
  /** @type {Set<string>} */
  let wishlist = new Set();
  /** @type {Set<string>} */
  let owned = new Set();
  /** @type {string | null} */
  let modalCardId = null;
  let activeTab = "collection";
  /** @type {ReturnType<typeof window.FamilyListSync.create> | null} */
  let wishSync = null;
  /** @type {ReturnType<typeof window.FamilyListSync.create> | null} */
  let ownedSync = null;

  initFloaties();
  loadLists();
  registerServiceWorker();
  boot();

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js?v=5")
        .then((reg) => {
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          reg.update().catch(() => {});
        })
        .catch(() => {});

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "JELLYNEST_SW_UPDATED" && !refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  async function boot() {
    try {
      const res = await fetch("./data/cards.json");
      if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`);
      catalog = await res.json();
      await initFamilyVault();
      fillFilters();
      paintFavorites();
      bindUI();
      applyFilters();
      updateListChrome();
      maybeOpenTabFromHash();
    } catch (err) {
      els.countLabel.textContent = "The nest wouldn’t settle. Try refreshing.";
      console.error(err);
    }
  }

  async function initFamilyVault() {
    if (!window.FamilyListSync?.create) return;
    wishSync = window.FamilyListSync.create({
      app: "jellynest",
      listType: "wishlist",
      storageKey: WISHLIST_KEY,
      onRemoteChange: (ids) => {
        wishlist = new Set(ids.map(String));
        updateListChrome();
        if (activeTab === "wishlist") renderWishlist();
        if (modalCardId) syncModalButtons();
      },
    });
    ownedSync = window.FamilyListSync.create({
      app: "jellynest",
      listType: "owned",
      storageKey: OWNED_KEY,
      onRemoteChange: (ids) => {
        owned = new Set(ids.map(String));
        updateListChrome();
        if (activeTab === "owned") renderOwned();
        if (modalCardId) syncModalButtons();
      },
    });
    wishlist = await wishSync.hydrate(wishlist);
    owned = await ownedSync.hydrate(owned);
    wishSync.subscribe();
    ownedSync.subscribe();
  }

  function loadList(key) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "[]");
      return new Set((Array.isArray(raw) ? raw : []).map(String));
    } catch {
      return new Set();
    }
  }

  function loadLists() {
    wishlist = loadList(WISHLIST_KEY);
    owned = loadList(OWNED_KEY);
  }

  function saveList(key, set) {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch (err) {
      console.warn(`Could not save ${key}`, err);
    }
  }

  function isWished(id) {
    return wishlist.has(String(id));
  }

  function isOwned(id) {
    return owned.has(String(id));
  }

  function toggleWish(id) {
    const key = String(id);
    if (wishlist.has(key)) wishlist.delete(key);
    else wishlist.add(key);
    saveList(WISHLIST_KEY, wishlist);
    if (wishSync) wishSync.setItem(key, wishlist.has(key));
    syncWishButtons(key);
    updateListChrome();
    if (activeTab === "wishlist") renderWishlist();
    if (modalCardId === key) syncModalButtons();
    return wishlist.has(key);
  }

  function toggleOwn(id) {
    const key = String(id);
    if (owned.has(key)) {
      owned.delete(key);
    } else {
      owned.add(key);
      // Got it — drop from the wish list if it was waiting there
      if (wishlist.has(key)) {
        wishlist.delete(key);
        saveList(WISHLIST_KEY, wishlist);
        if (wishSync) wishSync.setItem(key, false);
        syncWishButtons(key);
      }
    }
    saveList(OWNED_KEY, owned);
    if (ownedSync) ownedSync.setItem(key, owned.has(key));
    syncOwnButtons(key);
    updateListChrome();
    if (activeTab === "owned") renderOwned();
    if (activeTab === "wishlist") renderWishlist();
    if (modalCardId === key) syncModalButtons();
    return owned.has(key);
  }

  function fillSelect(select, values) {
    if (!select) return;
    for (const value of values) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    }
  }

  function fillFilters() {
    fillSelect(els.themeFilter, catalog.themes || []);
    fillSelect(els.catalogueFilter, catalog.catalogues || []);
    fillSelect(els.yearFilter, catalog.years || []);
    fillSelect(els.statusFilter, catalog.statuses || ["Coming Soon", "Live", "Retired"]);
  }

  function themeMatches(card, needle) {
    if (!needle) return true;
    const hay = `${card.theme || ""} ${card.subBrand || ""} ${card.fullName || ""}`;
    return hay.toLowerCase().includes(needle.toLowerCase());
  }

  function paintFavorites() {
    const map = {
      Bashful: "favArtBashful",
      Amuseables: "favArtAmuse",
      Bartholomew: "favArtBart",
    };
    for (const [needle, id] of Object.entries(map)) {
      const art = document.getElementById(id);
      if (!art) continue;
      const names = FAV_PICKS[needle] || [];
      const liveFirst = (c) => c.status === "Live";
      const card =
        catalog.cards.find(
          (c) =>
            themeMatches(c, needle) &&
            liveFirst(c) &&
            names.some((n) => (c.fullName || c.name || "").includes(n))
        ) ||
        catalog.cards.find((c) => themeMatches(c, needle) && liveFirst(c)) ||
        catalog.cards.find((c) => themeMatches(c, needle));
      if (card) art.style.backgroundImage = `url("${card.full || card.thumb}")`;
    }
  }

  function bindUI() {
    els.search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 160);
    });
    els.themeFilter?.addEventListener("change", applyFilters);
    els.catalogueFilter?.addEventListener("change", applyFilters);
    els.yearFilter?.addEventListener("change", applyFilters);
    els.statusFilter?.addEventListener("change", applyFilters);
    els.clearFilters.addEventListener("click", () => {
      els.search.value = "";
      if (els.themeFilter) els.themeFilter.value = "";
      if (els.catalogueFilter) els.catalogueFilter.value = "";
      if (els.yearFilter) els.yearFilter.value = "";
      if (els.statusFilter) els.statusFilter.value = "";
      applyFilters();
    });

    document.querySelectorAll(".fav-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        showTab("collection");
        const themeNeedle = btn.getAttribute("data-theme") || "";
        if (els.themeFilter) els.themeFilter.value = "";
        if (els.catalogueFilter) els.catalogueFilter.value = "";
        if (els.yearFilter) els.yearFilter.value = "";
        if (els.statusFilter) els.statusFilter.value = "Live";
        els.search.value = themeNeedle;
        applyFilters();
        document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    els.grid.addEventListener("click", onGridClick);
    els.ownedGrid?.addEventListener("click", onGridClick);
    els.wishGrid?.addEventListener("click", onGridClick);
    els.revealsGrid?.addEventListener("click", onGridClick);
    els.leaksList?.addEventListener("click", onGridClick);

    els.modalClose.addEventListener("click", () => els.modal.close());
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) els.modal.close();
    });
    els.modalWish?.addEventListener("click", () => {
      if (modalCardId) toggleWish(modalCardId);
    });
    els.modalOwn?.addEventListener("click", () => {
      if (modalCardId) toggleOwn(modalCardId);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modal.open) els.modal.close();
    });

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) renderMore();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(els.sentinel);

    els.tabCollection?.addEventListener("click", () => showTab("collection"));
    els.tabOwned?.addEventListener("click", () => showTab("owned"));
    els.tabWishlist?.addEventListener("click", () => showTab("wishlist"));
    els.tabComing?.addEventListener("click", () => showTab("coming"));
    els.wishSearch?.addEventListener("input", () => {
      clearTimeout(wishSearchTimer);
      wishSearchTimer = setTimeout(renderWishlist, 160);
    });
    els.ownedSearch?.addEventListener("input", () => {
      clearTimeout(ownedSearchTimer);
      ownedSearchTimer = setTimeout(renderOwned, 160);
    });
    els.comingRefresh?.addEventListener("click", () => loadComingSoon(true));
    window.addEventListener("hashchange", maybeOpenTabFromHash);
  }

  function onGridClick(e) {
    const ownBtn = e.target.closest(".own-btn");
    if (ownBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = ownBtn.dataset.ownId;
      if (id) toggleOwn(id);
      return;
    }
    const wishBtn = e.target.closest(".wish-btn");
    if (wishBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = wishBtn.dataset.wishId;
      if (id) toggleWish(id);
      return;
    }
    const btn = e.target.closest("[data-id]");
    if (!btn || btn.classList.contains("wish-btn") || btn.classList.contains("own-btn")) return;
    const id = btn.dataset.id;
    const card =
      catalog.cards.find((c) => String(c.id) === id) ||
      comingDisplayCards.find((c) => String(c.id) === id) ||
      (comingData?.reveals || []).find((c) => String(c.id) === id) ||
      allLeakCards().find((c) => String(c.id) === id);
    if (card) openModal(card);
  }

  function maybeOpenTabFromHash() {
    const hash = (location.hash || "").toLowerCase();
    if (hash.includes("wishlist")) showTab("wishlist");
    else if (hash.includes("owned")) showTab("owned");
    else if (hash.includes("coming")) showTab("coming");
    else if (hash.includes("collection")) showTab("collection");
  }

  function showTab(name) {
    activeTab = name;
    const collection = name === "collection";
    const ownedTab = name === "owned";
    const wishlistTab = name === "wishlist";
    const coming = name === "coming";

    els.panelCollection.hidden = !collection;
    if (els.panelOwned) els.panelOwned.hidden = !ownedTab;
    if (els.panelWishlist) els.panelWishlist.hidden = !wishlistTab;
    els.panelComing.hidden = !coming;

    els.tabCollection.classList.toggle("is-active", collection);
    els.tabOwned?.classList.toggle("is-active", ownedTab);
    els.tabWishlist?.classList.toggle("is-active", wishlistTab);
    els.tabComing.classList.toggle("is-active", coming);

    if (coming) {
      history.replaceState(null, "", "#coming-soon");
      if (!comingLoaded) loadComingSoon(false);
    } else if (ownedTab) {
      history.replaceState(null, "", "#owned");
      renderOwned();
    } else if (wishlistTab) {
      history.replaceState(null, "", "#wishlist");
      renderWishlist();
    } else {
      history.replaceState(null, "", "#collection");
    }
  }

  function syncWishButtons(id) {
    const key = String(id);
    const on = isWished(key);
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
    document.querySelectorAll(`.wish-btn[data-wish-id="${safe}"]`).forEach((btn) => {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Remove from wishlist" : "Add to wishlist");
    });
  }

  function syncOwnButtons(id) {
    const key = String(id);
    const on = isOwned(key);
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key.replace(/"/g, '\\"');
    document.querySelectorAll(`.own-btn[data-own-id="${safe}"]`).forEach((btn) => {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Remove from owned" : "Mark as owned");
    });
  }

  function syncModalButtons() {
    if (!modalCardId) return;
    if (els.modalWish) {
      const on = isWished(modalCardId);
      els.modalWish.classList.toggle("is-on", on);
      els.modalWish.setAttribute("aria-pressed", on ? "true" : "false");
      els.modalWish.textContent = on ? "Remove from wishlist" : "Add to wishlist";
    }
    if (els.modalOwn) {
      const on = isOwned(modalCardId);
      els.modalOwn.classList.toggle("is-on", on);
      els.modalOwn.setAttribute("aria-pressed", on ? "true" : "false");
      els.modalOwn.textContent = on ? "Remove from owned" : "Mark as owned";
    }
  }

  function updateListChrome() {
    const wishN = wishlist.size;
    if (els.wishTabCount) {
      els.wishTabCount.hidden = wishN === 0;
      els.wishTabCount.textContent = String(wishN);
    }
    if (els.wishCountLabel) {
      els.wishCountLabel.textContent =
        wishN === 0
          ? "Shared family wishlist — same list on every phone."
          : `${wishN.toLocaleString()} friend${wishN === 1 ? "" : "s"} waiting for a squeeze.`;
    }

    const ownN = owned.size;
    if (els.ownedTabCount) {
      els.ownedTabCount.hidden = ownN === 0;
      els.ownedTabCount.textContent = String(ownN);
    }
    if (els.ownedCountLabel) {
      els.ownedCountLabel.textContent =
        ownN === 0
          ? "Shared family nest — anyone can tick these off."
          : `${ownN.toLocaleString()} friend${ownN === 1 ? "" : "s"} already nestled at home.`;
    }
  }

  function makeCardTile(card, i = 0) {
    const wrap = document.createElement("div");
    wrap.className = "card-wrap";
    wrap.style.animationDelay = `${Math.min(i, 12) * 28}ms`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.dataset.id = String(card.id);
    const badge = card.status || card.rarity || "";
    btn.setAttribute("aria-label", `${card.fullName}, ${badge}`);
    const statusClass =
      badge === "Coming Soon" || badge === "Leak"
        ? " is-soon"
        : badge === "Retired"
          ? " is-retired"
          : badge === "Live"
            ? " is-live"
            : "";
    const img = card.thumb || card.full;
    if (img) {
      btn.innerHTML = `
        <img src="${escapeAttr(img)}" alt="" loading="lazy" decoding="async" width="400" height="500" />
        <span class="card-badge${statusClass}">${escapeHtml(badge)}</span>
      `;
    } else {
      const isExclusive = card.catalogue === "Store Exclusive" || card.availability === "Store Exclusive";
      btn.classList.add(isExclusive ? "is-exclusive" : "is-leak");
      btn.innerHTML = `
        <span class="leak-art" aria-hidden="true">
          <span class="leak-art-mark">${isExclusive ? "✦" : "✧"}</span>
        </span>
        <span class="leak-name">${escapeHtml(card.name || card.fullName || (isExclusive ? "Exclusive" : "Leak"))}</span>
        <span class="card-badge${statusClass}">${escapeHtml(isExclusive ? "Exclusive" : badge || "Leak")}</span>
      `;
    }
    wrap.appendChild(btn);

    if (isListable(card.id)) {
      const own = document.createElement("button");
      own.type = "button";
      own.className = `own-btn${isOwned(card.id) ? " is-on" : ""}`;
      own.dataset.ownId = String(card.id);
      own.setAttribute("aria-pressed", isOwned(card.id) ? "true" : "false");
      own.setAttribute("aria-label", isOwned(card.id) ? "Remove from owned" : "Mark as owned");
      own.innerHTML = CHECK_SVG;
      wrap.appendChild(own);

      const wish = document.createElement("button");
      wish.type = "button";
      wish.className = `wish-btn${isWished(card.id) ? " is-on" : ""}`;
      wish.dataset.wishId = String(card.id);
      wish.setAttribute("aria-pressed", isWished(card.id) ? "true" : "false");
      wish.setAttribute("aria-label", isWished(card.id) ? "Remove from wishlist" : "Add to wishlist");
      wish.innerHTML = HEART_SVG;
      wrap.appendChild(wish);
    }

    return wrap;
  }

  function isListable(id) {
    return !String(id).startsWith("preview-");
  }

  function allLeakCards() {
    const groups = comingData?.leaks || [];
    const out = [];
    for (const group of groups) {
      for (const item of group.items || []) out.push(item);
    }
    return out;
  }

  function findCard(id) {
    const key = String(id);
    return (
      catalog.cards.find((c) => String(c.id) === key) ||
      comingDisplayCards.find((c) => String(c.id) === key) ||
      (comingData?.reveals || []).find((c) => String(c.id) === key) ||
      allLeakCards().find((c) => String(c.id) === key) ||
      null
    );
  }

  function renderSavedGrid(grid, emptyEl, ids, emptyNone, emptySearch) {
    if (!grid) return;
    const qInput =
      grid === els.wishGrid ? els.wishSearch : grid === els.ownedGrid ? els.ownedSearch : null;
    const q = (qInput?.value || "").trim().toLowerCase();
    const cards = [...ids]
      .map(findCard)
      .filter(Boolean)
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.fullName} ${c.name} ${c.theme} ${c.catalogue} ${c.year} ${c.status} ${c.sku || ""}`.toLowerCase();
        return hay.includes(q);
      });

    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    cards.forEach((card, i) => frag.appendChild(makeCardTile(card, i)));
    grid.appendChild(frag);

    if (emptyEl) {
      emptyEl.textContent = ids.size === 0 ? emptyNone : emptySearch;
      emptyEl.hidden = cards.length !== 0;
    }
  }

  function renderWishlist() {
    renderSavedGrid(
      els.wishGrid,
      els.wishEmpty,
      wishlist,
      "No plush saved yet. Browse the collection and tap a heart to begin.",
      "No saved plush match that search."
    );
  }

  function renderOwned() {
    renderSavedGrid(
      els.ownedGrid,
      els.ownedEmpty,
      owned,
      "Nothing marked as owned yet. Browse the collection and tap a check to begin.",
      "No owned plush match that search."
    );
  }

  async function loadComingSoon(forceLive) {
    if (comingBusy) return;
    comingBusy = true;
    els.comingRefresh.disabled = true;
    els.comingStatus.textContent = forceLive
      ? "Refreshing the softest whispers…"
      : "Gathering new friends and journal notes…";

    try {
      const stamp = Date.now();
      const bakedRes = await fetch(`./data/coming-soon.json?t=${stamp}`, { cache: "no-store" });
      if (!bakedRes.ok) throw new Error(`coming-soon.json ${bakedRes.status}`);
      comingData = await bakedRes.json();

      let liveNews = null;
      try {
        liveNews = await fetchLiveNews();
      } catch (err) {
        console.warn("Live journal unavailable, using baked copy.", err);
      }
      if (liveNews?.length) comingData.news = liveNews;

      renderComingSoon();
      comingLoaded = true;

      const when = comingData.generated
        ? new Date(comingData.generated).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "just now";
      const liveBit = liveNews?.length ? " · journal refreshed live" : "";
      els.comingStatus.textContent = `Nest snapshot ${when}${liveBit}`;
    } catch (err) {
      console.error(err);
      els.comingStatus.textContent =
        "Couldn’t reach the nest right now. Try Refresh in a moment.";
    } finally {
      comingBusy = false;
      els.comingRefresh.disabled = false;
    }
  }

  async function fetchLiveNews() {
    const res = await fetch(`${LIVE_NEWS_URL}?t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "X-Return-Format": "html",
      },
    });
    if (!res.ok) throw new Error(`live news ${res.status}`);
    const html = await res.text();
    const fromHtml = parseNewsHtml(html);
    if (fromHtml.length) return fromHtml;
    return parseLiveNewsMarkdown(html);
  }

  function parseNewsHtml(raw) {
    const items = [];
    const seen = new Set();
    const re =
      /<a[^>]+href="(?<url>(?:https?:\/\/(?:www\.)?jellycat\.com)?\/?jelly-journal\/[^"]+)"[^>]*>[\s\S]{0,600}?(?:<h[1-3][^>]*>|<[^>]*class="[^"]*title[^"]*"[^>]*>)(?<title>[^<]{8,120})/gi;
    let m;
    while ((m = re.exec(raw))) {
      const title = decodeEntities(m.groups.title || "").replace(/\s+/g, " ").trim();
      if (!title || seen.has(title.toLowerCase())) continue;
      if (/^(jelly journal|read more|home|shop|new)$/i.test(title)) continue;
      seen.add(title.toLowerCase());
      let url = m.groups.url || NEWS_URL;
      if (url.startsWith("/")) url = `https://www.jellycat.com${url}`;
      const window = raw.slice(Math.max(0, m.index - 400), m.index + m[0].length + 200);
      const img = window.match(/<img[^>]+src="([^"]+)"/i);
      items.push({
        title,
        date: "",
        category: "Jelly Journal",
        summary: "",
        url,
        image: img ? img[1] : null,
      });
      if (items.length >= 16) break;
    }
    return items;
  }

  function decodeEntities(str) {
    const el = document.createElement("textarea");
    el.innerHTML = str || "";
    return el.value;
  }

  function parseLiveNewsMarkdown(md) {
    const items = [];
    const seen = new Set();
    const linkRe =
      /\[([^\]]{8,120})\]\((https?:\/\/(?:www\.)?jellycat\.com\/jelly-journal\/[^)\s]+)\)/gi;
    let m;
    while ((m = linkRe.exec(md))) {
      let title = m[1].replace(/!\[.*?\]\(.*?\)/g, "").trim();
      if (title.length < 8 || title.length > 120) continue;
      if (/^(jelly journal|read more|home|shop|new)$/i.test(title)) continue;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const window = md.slice(Math.max(0, m.index - 500), m.index);
      const img = window.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/);
      let date = "";
      const dm = (window + md.slice(m.index, m.index + 200)).match(
        /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/
      );
      if (dm) date = dm[1];
      items.push({
        title,
        date,
        category: "Jelly Journal",
        summary: "",
        url: m[2].split("?")[0],
        image: img ? img[1] : null,
      });
      if (items.length >= 12) break;
    }
    return items;
  }

  function renderComingSoon() {
    const sets = comingData?.upcomingSets || [];
    els.upcomingSets.innerHTML = sets
      .map((set) => {
        const art = set.heroImage
          ? `style="background-image:url('${escapeAttr(set.heroImage)}')"`
          : "";
        const dates = [
          set.prereleaseLabel ? `Early look ${set.prereleaseLabel}` : null,
          set.releaseLabel
            ? `Arriving ${set.releaseLabel}`
            : set.releaseDate
              ? `Arriving ${set.releaseDate}`
              : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const href = set.productUrl || NEWS_URL;
        const count =
          set.revealedCount > 0
            ? `${set.revealedCount} friend${set.revealedCount === 1 ? "" : "s"} spotted so far`
            : "New friends not listed yet — check back soon";
        return `
          <a class="set-card" href="${escapeAttr(href)}" target="_blank" rel="noopener">
            <span class="set-card-art" ${art}></span>
            <span class="set-card-body">
              <span class="set-kicker">${escapeHtml(set.type || "Collection")}</span>
              <h4>${escapeHtml(set.name || "Untitled")}</h4>
              <p class="set-dates">${escapeHtml(dates || "Date TBA")}</p>
              <p class="set-blurb">${escapeHtml(set.blurb || "More soft friends are on the way.")}</p>
              <p class="set-meta">${escapeHtml(count)}</p>
            </span>
          </a>
        `;
      })
      .join("");

    const news = comingData?.news || [];
    if (!news.length) {
      els.newsList.innerHTML = `<p class="coming-note">No headlines yet — tap Refresh, or visit the <a href="${NEWS_URL}" target="_blank" rel="noopener">Jelly Journal</a>.</p>`;
    } else {
      els.newsList.innerHTML = news
        .map((n) => {
          const thumb = n.image
            ? `<img class="news-thumb" src="${escapeAttr(n.image)}" alt="" loading="lazy" />`
            : `<div class="news-thumb placeholder" aria-hidden="true">♡</div>`;
          const meta = [n.date, n.category].filter(Boolean).join(" · ");
          return `
            <a class="news-item" href="${escapeAttr(n.url || NEWS_URL)}" target="_blank" rel="noopener">
              ${thumb}
              <span>
                <p class="news-date">${escapeHtml(meta || "Latest")}</p>
                <h4>${escapeHtml(n.title)}</h4>
                ${n.summary ? `<p class="news-summary">${escapeHtml(n.summary)}</p>` : ""}
              </span>
            </a>
          `;
        })
        .join("");
    }

    const reveals = comingData?.reveals || [];
    const previewArts = [];
    for (const set of sets) {
      for (const url of set.gallery || []) {
        previewArts.push({
          id: `preview-${set.code}-${previewArts.length}`,
          fullName: `${set.name} preview`,
          name: set.name,
          version: "Official preview",
          rarity: "Preview",
          setName: set.name,
          setCode: set.code,
          story: "Coming Soon",
          type: "Preview",
          color: "",
          thumb: url,
          full: url,
        });
      }
    }
    const showCards = reveals.length ? reveals : previewArts;
    comingDisplayCards = showCards;
    els.revealsNote.textContent = reveals.length
      ? `${reveals.length} new or soon-to-land friend${reveals.length === 1 ? "" : "s"}`
      : previewArts.length
        ? `${previewArts.length} preview image${previewArts.length === 1 ? "" : "s"} — full listings will appear as they’re posted`
        : "No early plush art yet — as soon as new friends are teased, they’ll land here.";
    els.revealsGrid.innerHTML = "";
    showCards.forEach((card, i) => {
      els.revealsGrid.appendChild(makeCardTile(card, i));
    });

    renderLeaks();
  }

  function renderLeaks() {
    if (!els.leaksList) return;
    const groups = comingData?.leaks || [];
    const total = groups.reduce((n, g) => n + ((g.items || []).length), 0);
    if (els.leaksNote) {
      els.leaksNote.textContent = total
        ? `${total} unofficial spoiler${total === 1 ? "" : "s"} — not confirmed by Jellycat yet. Tap a heart to wishlist one early.`
        : "No leaks on the board yet — when spoilers surface, they’ll whisper here.";
    }
    els.leaksList.innerHTML = "";
    if (!groups.length) {
      els.leaksList.innerHTML = `<p class="coming-note">Nothing leaked into the nest just now.</p>`;
      return;
    }

    for (const group of groups) {
      const article = document.createElement("article");
      article.className = "leak-group";
      const meta = [group.year, group.catalogue].filter(Boolean).join(" · ");
      article.innerHTML = `
        <div class="leak-group-head">
          <p class="leak-kicker">${escapeHtml(meta || "Leak")}</p>
          <h4>${escapeHtml(group.title || "Whispers")}</h4>
          <p class="leak-blurb">${escapeHtml(group.blurb || "")}</p>
          ${group.sourceNote ? `<p class="leak-source">${escapeHtml(group.sourceNote)}</p>` : ""}
        </div>
      `;
      const grid = document.createElement("div");
      grid.className = "grid leak-grid";
      (group.items || []).forEach((item, i) => grid.appendChild(makeCardTile(item, i)));
      article.appendChild(grid);
      els.leaksList.appendChild(article);
    }
  }

  function applyFilters() {
    const q = els.search.value.trim().toLowerCase();
    const theme = els.themeFilter?.value || "";
    const catalogue = els.catalogueFilter?.value || "";
    const year = els.yearFilter?.value || "";
    const status = els.statusFilter?.value || "";

    filtered = catalog.cards.filter((c) => {
      if (theme && c.theme !== theme) return false;
      if (catalogue && c.catalogue !== catalogue) return false;
      if (year && c.year !== year) return false;
      if (status && c.status !== status) return false;
      if (q) {
        const hay =
          `${c.fullName} ${c.name} ${c.theme} ${c.catalogue} ${c.year} ${c.status} ${c.subBrand || ""} ${c.animalType || ""} ${c.sku || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    shown = 0;
    els.grid.innerHTML = "";
    updateMeta();
    renderMore();
  }

  function updateMeta() {
    const total = catalog.count || catalog.cards.length;
    const n = filtered.length;
    const parts = [];
    if (els.themeFilter?.value) parts.push(els.themeFilter.value);
    if (els.catalogueFilter?.value) parts.push(els.catalogueFilter.value);
    if (els.yearFilter?.value) parts.push(els.yearFilter.value);
    if (els.statusFilter?.value) parts.push(els.statusFilter.value);
    if (els.search.value.trim()) parts.push(`“${els.search.value.trim()}”`);

    if (n === total && !parts.length) {
      els.countLabel.textContent = `${total.toLocaleString()} Jellycats across every catalogue`;
    } else {
      els.countLabel.textContent = `${n.toLocaleString()} friend${n === 1 ? "" : "s"} found`;
    }

    els.activePills.hidden = parts.length === 0;
    els.activePills.innerHTML = parts.map((p) => `<span class="pill">${escapeHtml(p)}</span>`).join("");
    els.empty.hidden = n !== 0;
  }

  function renderMore() {
    if (shown >= filtered.length) return;
    const slice = filtered.slice(shown, shown + PAGE_SIZE);
    const frag = document.createDocumentFragment();
    slice.forEach((card, i) => frag.appendChild(makeCardTile(card, i)));
    els.grid.appendChild(frag);
    shown += slice.length;
  }

  function stockLabel(card) {
    const avail = card.availability || "";
    if (avail === "Available") return "Available";
    if (avail === "Preorder") return "Pre-order";
    if (avail === "Store Exclusive" || card.catalogue === "Store Exclusive") return "Store exclusive";
    if (avail === "Leak" || card.status === "Leak" || card.rarity === "Leak") return "Leak";
    if (card.status === "Coming Soon") return "Coming Soon";
    if (card.status === "Retired" || avail === "Unavailable") return "Unavailable";
    return card.status || avail || "—";
  }

  function stockLink(card) {
    const label = stockLabel(card);
    if ((label === "Available" || label === "Pre-order") && card.ukUrl) return card.ukUrl;
    if (label === "Store exclusive" && (card.url || card.ukUrl)) return card.url || card.ukUrl;
    return "";
  }

  function openModal(card) {
    modalCardId = String(card.id);
    const img = card.full || card.thumb;
    if (img) {
      els.modalImg.hidden = false;
      els.modalImg.src = img;
      els.modalImg.alt = card.fullName;
    } else {
      els.modalImg.removeAttribute("src");
      els.modalImg.alt = "";
      els.modalImg.hidden = true;
    }
    els.modalStory.textContent = card.theme || card.subBrand || "Jellycat";
    els.modalName.textContent = card.name || card.fullName;
    const sizeBit = card.size && card.size !== "One size" ? card.size : card.version;
    els.modalVersion.textContent = sizeBit
      ? sizeBit
      : card.blurb
        ? card.blurb.slice(0, 160)
        : card.fullName;
    if (els.modalTheme) els.modalTheme.textContent = card.theme || "—";
    if (els.modalCatalogue) els.modalCatalogue.textContent = card.catalogue || "—";
    if (els.modalYear) els.modalYear.textContent = card.year || "—";
    if (els.modalStatus) {
      const label = stockLabel(card);
      const href = stockLink(card);
      if (href) {
        els.modalStatus.innerHTML = `<a class="stock-link" href="${escapeAttr(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
      } else {
        els.modalStatus.textContent = label;
      }
    }
    if (els.modalWish) els.modalWish.hidden = !isListable(card.id);
    if (els.modalOwn) els.modalOwn.hidden = !isListable(card.id);
    syncModalButtons();
    if (typeof els.modal.showModal === "function") els.modal.showModal();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("'", "&#39;");
  }

  function initFloaties() {
    const canvas = document.getElementById("floaties");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dots = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const palette = [
      "rgba(233, 168, 179, ALPHA)",
      "rgba(157, 207, 184, ALPHA)",
      "rgba(185, 215, 234, ALPHA)",
      "rgba(240, 216, 154, ALPHA)",
    ];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.min(48, Math.floor((w * h) / 38000));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 10 + 4,
        a: Math.random() * 0.35 + 0.12,
        s: Math.random() * 0.25 + 0.08,
        drift: Math.random() * 0.4 + 0.1,
        p: Math.random() * Math.PI * 2,
        color: palette[Math.floor(Math.random() * palette.length)],
      }));
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        const bob = reduce ? 0 : Math.sin(t * 0.0006 + d.p) * 10;
        const x = d.x + Math.sin(t * 0.0003 + d.p) * d.drift * 20;
        const y = ((d.y + bob + (reduce ? 0 : t * d.s * 0.02)) % (h + 40)) - 20;
        ctx.beginPath();
        ctx.fillStyle = d.color.replace("ALPHA", String(d.a));
        ctx.arc(x, y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", () => {
      cancelAnimationFrame(raf);
      resize();
      raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  }
})();
