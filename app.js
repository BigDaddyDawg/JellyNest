(() => {
  const PAGE_SIZE = 48;
  const WISHLIST_KEY = "jellynest_wishlist_v1";
  const OWNED_KEY = "jellynest_owned_v1";
  const WISHLIST_META_KEY = "jellynest_wishlist_meta_v1";
  const OWNED_META_KEY = "jellynest_owned_meta_v1";
  const NEWS_URL = "https://www.jellycat.com/jelly-journal/";
  const LIVE_NEWS_URL = "https://r.jina.ai/http://www.jellycat.com/jelly-journal/";
  const DEFAULT_WISH_PRIORITY = "someday";
  const WISH_SHELVES = [
    { id: "next", label: "Next", blurb: "The next squeezes on the list." },
    { id: "someday", label: "Someday", blurb: "Friends she still dreams about." },
    { id: "maybe", label: "Maybe", blurb: "Soft maybes — no rush." },
  ];
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
    groupToolbar: document.getElementById("groupToolbar"),
    expandAllGroups: document.getElementById("expandAllGroups"),
    collapseAllGroups: document.getElementById("collapseAllGroups"),
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
    modalPriority: document.getElementById("modalPriority"),
    modalDossier: document.getElementById("modalDossier"),
    dossierSize: document.getElementById("dossierSize"),
    dossierGot: document.getElementById("dossierGot"),
    dossierFrom: document.getElementById("dossierFrom"),
    dossierNote: document.getElementById("dossierNote"),
    panelCollection: document.getElementById("panelCollection"),
    panelOwned: document.getElementById("panelOwned"),
    panelWishlist: document.getElementById("panelWishlist"),
    panelComing: document.getElementById("panelComing"),
    tabCollection: document.getElementById("tabCollection"),
    tabOwned: document.getElementById("tabOwned"),
    tabForYou: document.getElementById("tabForYou"),
    tabWishlist: document.getElementById("tabWishlist"),
    tabComing: document.getElementById("tabComing"),
    ownedGrid: document.getElementById("ownedGrid"),
    ownedEmpty: document.getElementById("ownedEmpty"),
    ownedSearch: document.getElementById("ownedSearch"),
    ownedCountLabel: document.getElementById("ownedCountLabel"),
    ownedTabCount: document.getElementById("ownedTabCount"),
    collectionMap: document.getElementById("collectionMap"),
    panelForYou: document.getElementById("panelForYou"),
    forYouStatus: document.getElementById("forYouStatus"),
    forYouTaste: document.getElementById("forYouTaste"),
    forYouShelves: document.getElementById("forYouShelves"),
    forYouEmpty: document.getElementById("forYouEmpty"),
    wishShelves: document.getElementById("wishShelves"),
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
    panelFind: document.getElementById("panelFind"),
    tabFind: document.getElementById("tabFind"),
    findStatus: document.getElementById("findStatus"),
    findIntro: document.getElementById("findIntro"),
    findIntroNote: document.getElementById("findIntroNote"),
    findLocateBtn: document.getElementById("findLocateBtn"),
    findWorkspace: document.getElementById("findWorkspace"),
    findMap: document.getElementById("findMap"),
    findRadius: document.getElementById("findRadius"),
    findRadiusLabel: document.getElementById("findRadiusLabel"),
    findResultCount: document.getElementById("findResultCount"),
    findClearSelection: document.getElementById("findClearSelection"),
    findResults: document.getElementById("findResults"),
    findEmpty: document.getElementById("findEmpty"),
    findJourneyBar: document.getElementById("findJourneyBar"),
    findJourneyBtn: document.getElementById("findJourneyBtn"),
    findPickPlaceBtn: document.getElementById("findPickPlaceBtn"),
    findLocationKicker: document.getElementById("findLocationKicker"),
    findLocationLabel: document.getElementById("findLocationLabel"),
    findChangeLocation: document.getElementById("findChangeLocation"),
    findLocationModal: document.getElementById("findLocationModal"),
    findLocationClose: document.getElementById("findLocationClose"),
    findLocationForm: document.getElementById("findLocationForm"),
    findLocationQuery: document.getElementById("findLocationQuery"),
    findLocationSearchBtn: document.getElementById("findLocationSearchBtn"),
    findLocationResults: document.getElementById("findLocationResults"),
    findLocationBusy: document.getElementById("findLocationBusy"),
    findLocationError: document.getElementById("findLocationError"),
    findUseGps: document.getElementById("findUseGps"),
  };

  /** @type {{cards: any[], themes?: string[], catalogues?: string[], years?: string[], statuses?: string[], count?: number}} */
  let catalog = { cards: [], themes: [], catalogues: [], years: [], statuses: [] };
  /** @type {any[]} */
  let filtered = [];
  /** @type {{ theme: string, cards: any[] }[]} */
  let filteredGroups = [];
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
  /** @type {Record<string, Record<string, unknown>>} */
  let wishMeta = {};
  /** @type {Record<string, Record<string, unknown>>} */
  let ownedMeta = {};
  let dossierSilent = false;
  /** @type {string | null} */
  let modalCardId = null;
  let activeTab = "collection";
  /** @type {Record<string, number>} */
  const tabScrollY = {
    collection: 0,
    owned: 0,
    foryou: 0,
    wishlist: 0,
    find: 0,
    coming: 0,
  };
  /** @type {ReturnType<typeof window.FamilyListSync.create> | null} */
  let wishSync = null;
  /** @type {ReturnType<typeof window.FamilyListSync.create> | null} */
  let ownedSync = null;

  /** @type {{ id: number, name: string, address: string, phone: string, url: string, lat: number, lng: number }[]} */
  let stockists = [];
  let stockistsLoaded = false;
  let stockistsLoading = false;
  /** @type {{ lat: number, lng: number } | null} */
  let findUserPos = null;
  /** @type {"gps" | "place" | "pin"} */
  let findLocationSource = "gps";
  let findLocationName = "Your location";
  let findRadiusKm = 15;
  /** @type {{ store: object, distanceKm: number }[]} */
  let findResults = [];
  /** @type {Set<number>} */
  let findSelected = new Set();
  /** @type {number[]} selection order for multi-stop routes */
  let findSelectedOrder = [];
  let findMapReady = false;
  /** @type {any} */
  let findLeafletMap = null;
  /** @type {any} */
  let findUserMarker = null;
  /** @type {any} */
  let findRadiusCircle = null;
  /** @type {Map<number, any>} */
  let findStoreMarkers = new Map();
  /** @type {Promise<void> | null} */
  let leafletPromise = null;

  initFloaties();
  loadLists();
  registerServiceWorker();
  boot();

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(`service-worker.js?v=17`)
        .then((reg) => {
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          reg.update().catch(() => {});
          // Check again when she returns to the tab — helps after publishes
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") reg.update().catch(() => {});
          });
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
      const res = await fetch(`./data/cards.json?v=17`, { cache: "no-cache" });
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
      metaStorageKey: WISHLIST_META_KEY,
      onRemoteChange: (ids, meta) => {
        wishlist = new Set(ids.map(String));
        wishMeta = meta || {};
        updateListChrome();
        if (activeTab === "wishlist") renderWishlist();
        if (modalCardId) syncModalButtons();
      },
    });
    ownedSync = window.FamilyListSync.create({
      app: "jellynest",
      listType: "owned",
      storageKey: OWNED_KEY,
      metaStorageKey: OWNED_META_KEY,
      onRemoteChange: (ids, meta) => {
        owned = new Set(ids.map(String));
        ownedMeta = meta || {};
        updateListChrome();
        if (activeTab === "owned") renderOwned();
        if (activeTab === "foryou") renderForYou();
        if (modalCardId) syncModalButtons();
      },
    });
    const wishState = await wishSync.hydrate(wishlist);
    const ownedState = await ownedSync.hydrate(owned);
    wishlist = wishState.ids;
    wishMeta = wishState.meta || {};
    owned = ownedState.ids;
    ownedMeta = ownedState.meta || {};
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

  function loadMeta(key) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "{}");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      return raw;
    } catch {
      return {};
    }
  }

  function loadLists() {
    wishlist = loadList(WISHLIST_KEY);
    owned = loadList(OWNED_KEY);
    wishMeta = loadMeta(WISHLIST_META_KEY);
    ownedMeta = loadMeta(OWNED_META_KEY);
  }

  function saveList(key, set) {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch (err) {
      console.warn(`Could not save ${key}`, err);
    }
  }

  function saveMeta(key, meta) {
    try {
      localStorage.setItem(key, JSON.stringify(meta || {}));
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

  function wishPriorityOf(id) {
    const p = String(wishMeta[String(id)]?.priority || DEFAULT_WISH_PRIORITY);
    return WISH_SHELVES.some((s) => s.id === p) ? p : DEFAULT_WISH_PRIORITY;
  }

  function ownedDossierOf(id) {
    const m = ownedMeta[String(id)] || {};
    return {
      size: String(m.size || ""),
      got: String(m.got || ""),
      from: String(m.from || ""),
      note: String(m.note || ""),
    };
  }

  function setWishPriority(id, priority) {
    const key = String(id);
    if (!wishlist.has(key)) return;
    const next = WISH_SHELVES.some((s) => s.id === priority) ? priority : DEFAULT_WISH_PRIORITY;
    wishMeta[key] = { ...(wishMeta[key] || {}), priority: next };
    saveMeta(WISHLIST_META_KEY, wishMeta);
    if (wishSync) wishSync.setMeta(key, { priority: next });
    if (activeTab === "wishlist") renderWishlist();
    if (modalCardId === key) syncModalButtons();
  }

  function saveOwnedDossier(id, patch) {
    const key = String(id);
    if (!owned.has(key)) return;
    const prev = { ...(ownedMeta[key] || {}) };
    const merged = { ...prev, ...patch };
    for (const [k, v] of Object.entries(merged)) {
      if (v == null || v === "") delete merged[k];
    }
    ownedMeta[key] = merged;
    saveMeta(OWNED_META_KEY, ownedMeta);
    if (ownedSync) ownedSync.setMeta(key, patch);
    if (activeTab === "owned") renderCollectionMap();
  }

  function toggleWish(id) {
    const key = String(id);
    if (wishlist.has(key)) {
      wishlist.delete(key);
      delete wishMeta[key];
      saveList(WISHLIST_KEY, wishlist);
      saveMeta(WISHLIST_META_KEY, wishMeta);
      if (wishSync) wishSync.setItem(key, false);
    } else {
      wishlist.add(key);
      wishMeta[key] = { ...(wishMeta[key] || {}), priority: DEFAULT_WISH_PRIORITY };
      saveList(WISHLIST_KEY, wishlist);
      saveMeta(WISHLIST_META_KEY, wishMeta);
      if (wishSync) wishSync.setItem(key, true, { priority: DEFAULT_WISH_PRIORITY });
    }
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
      delete ownedMeta[key];
      saveMeta(OWNED_META_KEY, ownedMeta);
    } else {
      owned.add(key);
      // Got it — drop from the wish list if it was waiting there
      if (wishlist.has(key)) {
        wishlist.delete(key);
        delete wishMeta[key];
        saveList(WISHLIST_KEY, wishlist);
        saveMeta(WISHLIST_META_KEY, wishMeta);
        if (wishSync) wishSync.setItem(key, false);
        syncWishButtons(key);
      }
    }
    saveList(OWNED_KEY, owned);
    if (ownedSync) ownedSync.setItem(key, owned.has(key), owned.has(key) ? ownedMeta[key] || {} : undefined);
    syncOwnButtons(key);
    updateListChrome();
    if (activeTab === "owned") renderOwned();
    if (activeTab === "wishlist") renderWishlist();
    if (activeTab === "foryou") renderForYou();
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
    const catalogues = [...(catalog.catalogues || [])];
    const hasExclusives = (catalog.cards || []).some(
      (c) => c.catalogue === "Exclusives" || c.catalogue === "Store Exclusive"
    );
    if (hasExclusives) {
      const withoutLegacy = catalogues.filter((c) => c !== "Store Exclusive");
      if (!withoutLegacy.includes("Exclusives")) withoutLegacy.push("Exclusives");
      withoutLegacy.sort((a, b) => a.localeCompare(b));
      fillSelect(els.catalogueFilter, withoutLegacy);
    } else {
      fillSelect(els.catalogueFilter, catalogues);
    }
    fillSelect(els.yearFilter, catalog.years || []);
    fillSelect(els.statusFilter, catalog.statuses || ["Coming Soon", "Live", "Retired"]);
  }

  function isExclusiveCard(card) {
    return card.catalogue === "Exclusives" || card.catalogue === "Store Exclusive" || card.availability === "Store Exclusive";
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
    els.wishShelves?.addEventListener("click", onGridClick);
    els.collectionMap?.addEventListener("click", onGridClick);
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
    els.modalPriority?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-priority]");
      if (!btn || !modalCardId) return;
      setWishPriority(modalCardId, btn.getAttribute("data-priority"));
    });
    const dossierFields = [els.dossierSize, els.dossierGot, els.dossierFrom, els.dossierNote];
    for (const field of dossierFields) {
      field?.addEventListener("change", onDossierFieldChange);
      field?.addEventListener("input", onDossierFieldChange);
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.modal.open) els.modal.close();
    });

    const io = new IntersectionObserver(
      (entries) => {
        // Kept for older layouts; grouped browse fills groups on expand.
        if (entries.some((en) => en.isIntersecting)) renderMore();
      },
      { rootMargin: "600px 0px" }
    );
    if (els.sentinel) io.observe(els.sentinel);

    els.forYouShelves?.addEventListener("click", onGridClick);

    document.querySelectorAll(".tab-btn[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab")));
    });
    els.wishSearch?.addEventListener("input", () => {
      clearTimeout(wishSearchTimer);
      wishSearchTimer = setTimeout(renderWishlist, 160);
    });
    els.ownedSearch?.addEventListener("input", () => {
      clearTimeout(ownedSearchTimer);
      ownedSearchTimer = setTimeout(renderOwned, 160);
    });
    els.comingRefresh?.addEventListener("click", () => loadComingSoon(true));
    els.findLocateBtn?.addEventListener("click", () => startFindSearch());
    els.findPickPlaceBtn?.addEventListener("click", () => openFindLocationModal());
    els.findChangeLocation?.addEventListener("click", () => openFindLocationModal());
    els.findLocationClose?.addEventListener("click", () => els.findLocationModal?.close());
    els.findLocationModal?.addEventListener("click", (e) => {
      if (e.target === els.findLocationModal) els.findLocationModal.close();
    });
    els.findLocationForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      searchFindPlaces();
    });
    els.findLocationResults?.addEventListener("click", onFindLocationResultsClick);
    els.findUseGps?.addEventListener("click", () => useFindGpsLocation());
    els.findRadius?.addEventListener("input", onFindRadiusInput);
    els.findClearSelection?.addEventListener("click", clearFindSelection);
    els.findJourneyBtn?.addEventListener("click", () => startFindJourney());
    els.findResults?.addEventListener("click", onFindResultsClick);
    window.addEventListener("hashchange", maybeOpenTabFromHash);

    els.expandAllGroups?.addEventListener("click", () => setAllGroupsOpen(true));
    els.collapseAllGroups?.addEventListener("click", () => setAllGroupsOpen(false));
  }

  function onDossierFieldChange() {
    if (dossierSilent || !modalCardId || !isOwned(modalCardId)) return;
    saveOwnedDossier(modalCardId, {
      size: els.dossierSize?.value || "",
      got: els.dossierGot?.value || "",
      from: (els.dossierFrom?.value || "").trim(),
      note: (els.dossierNote?.value || "").trim(),
    });
  }

  function onGridClick(e) {
    const priorityBtn = e.target.closest(".priority-btn[data-wish-id]");
    if (priorityBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = priorityBtn.dataset.wishId;
      const priority = priorityBtn.dataset.priority;
      if (id && priority) setWishPriority(id, priority);
      return;
    }
    const gapTheme = e.target.closest("[data-gap-theme]");
    if (gapTheme) {
      e.preventDefault();
      const theme = gapTheme.getAttribute("data-gap-theme") || "";
      showTab("collection");
      if (els.search) els.search.value = "";
      if (els.catalogueFilter) els.catalogueFilter.value = "";
      if (els.yearFilter) els.yearFilter.value = "";
      if (els.statusFilter) els.statusFilter.value = "";
      if (els.themeFilter) {
        const has = [...els.themeFilter.options].some((o) => o.value === theme);
        els.themeFilter.value = has ? theme : "";
        if (!has && theme) els.search.value = theme;
      }
      applyFilters();
      document.getElementById("collection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
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
    const card = findCard(id);
    if (card) openModal(card);
  }

  function maybeOpenTabFromHash() {
    const hash = (location.hash || "").toLowerCase();
    if (hash.includes("wishlist") || hash.includes("wish")) showTab("wishlist");
    else if (hash.includes("foryou") || hash.includes("for-you")) showTab("foryou");
    else if (hash.includes("owned") || hash.includes("nest")) showTab("owned");
    else if (hash.includes("coming") || hash.includes("soon")) showTab("coming");
    else if (hash.includes("find") || hash.includes("store")) showTab("find");
    else if (hash.includes("collection") || hash.includes("browse")) showTab("collection");
  }

  function showTab(name) {
    if (name === activeTab) return;

    tabScrollY[activeTab] = window.scrollY || window.pageYOffset || 0;

    activeTab = name;
    const collection = name === "collection";
    const ownedTab = name === "owned";
    const forYouTab = name === "foryou";
    const wishlistTab = name === "wishlist";
    const findTab = name === "find";
    const coming = name === "coming";

    const panels = [
      [els.panelCollection, collection],
      [els.panelOwned, ownedTab],
      [els.panelForYou, forYouTab],
      [els.panelWishlist, wishlistTab],
      [els.panelFind, findTab],
      [els.panelComing, coming],
    ];
    for (const [panel, on] of panels) {
      if (!panel) continue;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
      panel.setAttribute("aria-hidden", on ? "false" : "true");
    }

    const tabFlags = {
      collection,
      owned: ownedTab,
      foryou: forYouTab,
      wishlist: wishlistTab,
      find: findTab,
      coming,
    };
    document.querySelectorAll(".tab-btn[data-tab]").forEach((btn) => {
      const on = Boolean(tabFlags[btn.getAttribute("data-tab")]);
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });

    if (coming) {
      history.replaceState(null, "", "#coming-soon");
      if (!comingLoaded) loadComingSoon(false);
    } else if (findTab) {
      history.replaceState(null, "", "#find");
      renderFindTab();
    } else if (ownedTab) {
      history.replaceState(null, "", "#nest");
      renderOwned();
    } else if (forYouTab) {
      history.replaceState(null, "", "#foryou");
      renderForYou();
    } else if (wishlistTab) {
      history.replaceState(null, "", "#wishlist");
      renderWishlist();
    } else {
      history.replaceState(null, "", "#browse");
    }

    const y = tabScrollY[name] || 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
    });
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
    const wished = isWished(modalCardId);
    const ownedOn = isOwned(modalCardId);
    if (els.modalWish) {
      els.modalWish.classList.toggle("is-on", wished);
      els.modalWish.setAttribute("aria-pressed", wished ? "true" : "false");
      els.modalWish.textContent = wished ? "Remove from wishlist" : "Add to wishlist";
    }
    if (els.modalOwn) {
      els.modalOwn.classList.toggle("is-on", ownedOn);
      els.modalOwn.setAttribute("aria-pressed", ownedOn ? "true" : "false");
      els.modalOwn.textContent = ownedOn ? "Remove from owned" : "Mark as owned";
    }
    if (els.modalPriority) {
      els.modalPriority.hidden = !wished;
      if (wished) {
        const current = wishPriorityOf(modalCardId);
        els.modalPriority.querySelectorAll(".priority-btn").forEach((btn) => {
          btn.classList.toggle("is-on", btn.getAttribute("data-priority") === current);
        });
      }
    }
    if (els.modalDossier) {
      els.modalDossier.hidden = !ownedOn;
      if (ownedOn) fillDossierForm(modalCardId);
      else clearDossierForm();
    }
  }

  function fillDossierForm(id) {
    const d = ownedDossierOf(id);
    const card = findCard(id);
    const catalogSize = card?.size && card.size !== "One size" ? card.size : "";
    const size = d.size || catalogSize || "";
    dossierSilent = true;
    if (els.dossierSize) {
      ensureDossierSizeOption(size);
      els.dossierSize.value = size;
    }
    if (els.dossierGot) els.dossierGot.value = d.got || "";
    if (els.dossierFrom) els.dossierFrom.value = d.from || "";
    if (els.dossierNote) els.dossierNote.value = d.note || "";
    dossierSilent = false;
  }

  function clearDossierForm() {
    dossierSilent = true;
    if (els.dossierSize) els.dossierSize.value = "";
    if (els.dossierGot) els.dossierGot.value = "";
    if (els.dossierFrom) els.dossierFrom.value = "";
    if (els.dossierNote) els.dossierNote.value = "";
    dossierSilent = false;
  }

  function ensureDossierSizeOption(size) {
    if (!els.dossierSize || !size) return;
    const exists = [...els.dossierSize.options].some((o) => o.value === size);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = size;
      opt.textContent = size;
      els.dossierSize.appendChild(opt);
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
          ? "Shared family wishlist — sorted into soft little shelves."
          : `${wishN.toLocaleString()} friend${wishN === 1 ? "" : "s"} waiting across Next, Someday & Maybe.`;
    }

    const ownN = owned.size;
    if (els.ownedTabCount) {
      els.ownedTabCount.hidden = ownN === 0;
      els.ownedTabCount.textContent = String(ownN);
    }
    if (els.ownedCountLabel) {
      els.ownedCountLabel.textContent =
        ownN === 0
          ? "Shared family nest — ticks, notes, and progress live here."
          : `${ownN.toLocaleString()} friend${ownN === 1 ? "" : "s"} nestled at home.`;
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
      const isExclusive = isExclusiveCard(card);
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

  function renderSavedGrid(grid, emptyEl, ids, emptyNone, emptySearch, qInput) {
    if (!grid) return;
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
    return cards;
  }

  function makeWishTile(card, i = 0) {
    const wrap = makeCardTile(card, i);
    const shelf = document.createElement("div");
    shelf.className = "priority-seg priority-seg--tile";
    shelf.setAttribute("role", "group");
    shelf.setAttribute("aria-label", `Move ${card.name || card.fullName}`);
    const current = wishPriorityOf(card.id);
    for (const s of WISH_SHELVES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `priority-btn${current === s.id ? " is-on" : ""}`;
      btn.dataset.priority = s.id;
      btn.dataset.wishId = String(card.id);
      btn.textContent = s.label;
      shelf.appendChild(btn);
    }
    wrap.appendChild(shelf);
    return wrap;
  }

  function renderWishlist() {
    if (!els.wishShelves) return;
    const q = (els.wishSearch?.value || "").trim().toLowerCase();
    const cards = [...wishlist]
      .map(findCard)
      .filter(Boolean)
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.fullName} ${c.name} ${c.theme} ${c.catalogue} ${c.year} ${c.status} ${c.sku || ""}`.toLowerCase();
        return hay.includes(q);
      });

    els.wishShelves.innerHTML = "";
    let shown = 0;
    for (const shelf of WISH_SHELVES) {
      const shelfCards = cards.filter((c) => wishPriorityOf(c.id) === shelf.id);
      if (!shelfCards.length && q) continue;
      const article = document.createElement("article");
      article.className = "wish-shelf";
      article.innerHTML = `
        <div class="wish-shelf-head">
          <h3>${escapeHtml(shelf.label)}</h3>
          <p>${escapeHtml(shelf.blurb)} · ${shelfCards.length}</p>
        </div>
      `;
      if (!shelfCards.length) {
        const empty = document.createElement("p");
        empty.className = "wish-shelf-empty";
        empty.textContent = "Nothing on this shelf yet.";
        article.appendChild(empty);
      } else {
        const grid = document.createElement("div");
        grid.className = "grid";
        shelfCards.forEach((card, i) => {
          shown += 1;
          grid.appendChild(makeWishTile(card, i));
        });
        article.appendChild(grid);
      }
      els.wishShelves.appendChild(article);
    }

    if (els.wishEmpty) {
      if (wishlist.size === 0) {
        els.wishEmpty.textContent = "No plush saved yet. Browse the collection and tap a heart to begin.";
        els.wishEmpty.hidden = false;
        els.wishShelves.hidden = true;
      } else if (!shown) {
        els.wishEmpty.textContent = "No saved plush match that search.";
        els.wishEmpty.hidden = false;
        els.wishShelves.hidden = true;
      } else {
        els.wishEmpty.hidden = true;
        els.wishShelves.hidden = false;
      }
    }
  }

  function setKeyForCard(card) {
    return card.setCode || card.theme || "unknown";
  }

  function setLabelForCard(card) {
    return card.setName || card.theme || "Friends";
  }

  function buildSetProgress() {
    /** @type {Map<string, { key: string, label: string, theme: string, total: any[], owned: any[], missing: any[] }>} */
    const sets = new Map();
    for (const card of catalog.cards || []) {
      const key = setKeyForCard(card);
      if (!sets.has(key)) {
        sets.set(key, {
          key,
          label: setLabelForCard(card),
          theme: card.theme || "",
          total: [],
          owned: [],
          missing: [],
        });
      }
      const row = sets.get(key);
      row.total.push(card);
      if (isOwned(card.id)) row.owned.push(card);
      else row.missing.push(card);
    }
    return [...sets.values()]
      .filter((s) => s.owned.length > 0 && s.missing.length > 0 && s.total.length >= 3)
      .map((s) => ({
        ...s,
        ratio: s.owned.length / s.total.length,
        missingCount: s.missing.length,
      }))
      .sort((a, b) => b.ratio - a.ratio || a.missingCount - b.missingCount || a.label.localeCompare(b.label));
  }

  function renderCollectionMap() {
    if (!els.collectionMap) return;
    const ownedCards = [...owned].map(findCard).filter(Boolean);
    if (!ownedCards.length) {
      els.collectionMap.hidden = true;
      els.collectionMap.innerHTML = "";
      return;
    }

    const themes = new Map();
    const catalogues = new Map();
    const years = new Set();
    for (const card of ownedCards) {
      bumpCount(themes, card.theme);
      bumpCount(catalogues, card.catalogue);
      if (card.year) years.add(card.year);
    }

    const progress = buildSetProgress();
    const closeSets = progress.filter((s) => s.missingCount <= 12).slice(0, 5);
    const topThemes = topCounts(themes, 5, 1);

    const yearList = [...years].sort();
    const yearSpan =
      yearList.length === 0
        ? "—"
        : yearList.length === 1
          ? yearList[0]
          : `${yearList[0]}–${yearList[yearList.length - 1]}`;

    els.collectionMap.hidden = false;
    els.collectionMap.innerHTML = `
      <div class="map-head">
        <h3>Collection map</h3>
        <p>A soft read of what’s already home — and what’s nearly a complete set.</p>
      </div>
      <div class="map-stats">
        <div class="map-stat">
          <strong>${ownedCards.length}</strong>
          <span>hugged</span>
        </div>
        <div class="map-stat">
          <strong>${themes.size}</strong>
          <span>themes</span>
        </div>
        <div class="map-stat">
          <strong>${catalogues.size}</strong>
          <span>catalogues</span>
        </div>
        <div class="map-stat">
          <strong>${escapeHtml(yearSpan)}</strong>
          <span>years</span>
        </div>
      </div>
      ${
        topThemes.length
          ? `<div class="map-bars">
              <h4>Theme progress</h4>
              ${topThemes
                .map(([theme, n]) => {
                  const total = (catalog.cards || []).filter((c) => c.theme === theme).length || 1;
                  const pct = Math.min(100, Math.round((n / total) * 100));
                  return `<button type="button" class="map-bar" data-gap-theme="${escapeAttr(theme)}">
                    <span class="map-bar-label"><span>${escapeHtml(theme)}</span><span>${n}/${total}</span></span>
                    <span class="map-bar-track"><span class="map-bar-fill" style="width:${pct}%"></span></span>
                  </button>`;
                })
                .join("")}
            </div>`
          : ""
      }
      ${
        closeSets.length
          ? `<div class="map-gaps">
              <h4>Almost nestled</h4>
              <p class="map-gaps-note">Sets you’re close to completing — tap a missing friend to open them.</p>
              <div class="gap-list" id="gapList"></div>
            </div>`
          : ""
      }
    `;

    const gapList = els.collectionMap.querySelector("#gapList");
    if (gapList && closeSets.length) {
      for (const set of closeSets) {
        const block = document.createElement("article");
        block.className = "gap-card";
        const pct = Math.round(set.ratio * 100);
        block.innerHTML = `
          <button type="button" class="gap-card-head" data-gap-theme="${escapeAttr(set.theme || set.label)}">
            <span>
              <strong>${escapeHtml(set.label)}</strong>
              <span class="gap-meta">${set.owned.length} of ${set.total.length} · ${pct}%</span>
            </span>
            <span class="map-bar-track gap-track"><span class="map-bar-fill" style="width:${pct}%"></span></span>
          </button>
        `;
        const missing = set.missing.slice(0, 6);
        const grid = document.createElement("div");
        grid.className = "gap-missing";
        missing.forEach((card, i) => grid.appendChild(makeCardTile(card, i)));
        if (set.missing.length > 6) {
          const more = document.createElement("p");
          more.className = "gap-more";
          more.textContent = `+${set.missing.length - 6} more still out there`;
          block.appendChild(grid);
          block.appendChild(more);
        } else {
          block.appendChild(grid);
        }
        gapList.appendChild(block);
      }
    }
  }

  function renderOwned() {
    renderCollectionMap();
    renderSavedGrid(
      els.ownedGrid,
      els.ownedEmpty,
      owned,
      "Nothing marked as owned yet. Browse the collection and tap a check to begin.",
      "No owned plush match that search.",
      els.ownedSearch
    );
  }

  function topCounts(map, limit = 3, min = 1) {
    return [...map.entries()]
      .filter(([, n]) => n >= min)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit);
  }

  function bumpCount(map, key, by = 1) {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + by);
  }

  function isBabyish(card) {
    const type = (card.type || "").toLowerCase();
    const theme = (card.theme || "").toLowerCase();
    const size = (card.size || "").toLowerCase();
    const name = (card.name || "").toLowerCase();
    return (
      type.includes("baby") ||
      type.includes("soother") ||
      type.includes("comforter") ||
      theme.includes("baby") ||
      name.includes("baby") ||
      size === "tiny" ||
      size === "little" ||
      size === "small"
    );
  }

  function friendLabel(type) {
    if (!type) return "friends";
    if (/s$/i.test(type) || /sheep|fish|moose|mice$/i.test(type)) return type;
    return `${type}s`;
  }

  function buildTasteProfile(ownedCards) {
    const themes = new Map();
    const animalTypes = new Map();
    const animalGroups = new Map();
    const sizes = new Map();
    const subBrands = new Map();
    let babyScore = 0;

    for (const card of ownedCards) {
      bumpCount(themes, card.theme);
      bumpCount(animalTypes, card.animalType);
      bumpCount(animalGroups, card.animalGroup);
      if (card.size && card.size !== "One size") bumpCount(sizes, card.size);
      bumpCount(subBrands, card.subBrand);
      if (isBabyish(card)) babyScore += 1;
    }

    return {
      ownedCount: ownedCards.length,
      themes: topCounts(themes, 4),
      animalTypes: topCounts(animalTypes, 4),
      animalGroups: topCounts(animalGroups, 3),
      sizes: topCounts(sizes, 2),
      subBrands: topCounts(subBrands, 3),
      babyScore,
      lovesBabies: babyScore >= Math.max(2, Math.ceil(ownedCards.length * 0.35)),
    };
  }

  function scoreRecommendation(card, taste) {
    let score = 0;
    /** @type {string[]} */
    const reasons = [];

    for (const [type, n] of taste.animalTypes) {
      if (card.animalType === type) {
        score += 12 + n * 3;
        reasons.push(`More ${type.toLowerCase()} friends`);
        break;
      }
    }
    for (const [theme, n] of taste.themes) {
      if (card.theme === theme) {
        score += 10 + n * 2;
        reasons.push(`Because you love ${theme}`);
        break;
      }
    }
    for (const [group, n] of taste.animalGroups) {
      if (card.animalGroup === group) {
        score += 6 + n;
        reasons.push(`From your favourite ${group} world`);
        break;
      }
    }
    for (const [size, n] of taste.sizes) {
      if (card.size === size) {
        score += 5 + n;
        reasons.push(`That same ${size.toLowerCase()} squeeze`);
        break;
      }
    }
    for (const [brand, n] of taste.subBrands) {
      if (card.subBrand === brand) {
        score += 4 + n;
        if (reasons.length < 2) reasons.push(`More ${brand}`);
        break;
      }
    }
    if (taste.lovesBabies && isBabyish(card)) {
      score += 8;
      reasons.push("Soft little one energy");
    }

    if (card.status === "Live") score += 2;
    if (card.availability === "Available" || card.availability === "Preorder") score += 2;
    if (isExclusiveCard(card)) score += 1;
    if (isWished(card.id)) score += 1;

    return { score, reason: reasons[0] || "Matches her nest" };
  }

  function makeRecoTile(card, reason, index) {
    const wrap = document.createElement("div");
    wrap.className = "reco-wrap";
    wrap.style.animationDelay = `${Math.min(index, 12) * 0.04}s`;
    wrap.appendChild(makeCardTile(card, index));
    if (reason) {
      const note = document.createElement("p");
      note.className = "reco-reason";
      note.textContent = reason;
      wrap.appendChild(note);
    }
    return wrap;
  }

  function appendRecoShelf(parent, title, blurb, items, used) {
    const fresh = items.filter((item) => !used.has(String(item.card.id)));
    if (!fresh.length) return;
    const article = document.createElement("article");
    article.className = "reco-shelf";
    article.innerHTML = `
      <div class="reco-shelf-head">
        <h3>${escapeHtml(title)}</h3>
        ${blurb ? `<p>${escapeHtml(blurb)}</p>` : ""}
      </div>
    `;
    const grid = document.createElement("div");
    grid.className = "grid reco-grid";
    fresh.forEach((item, i) => {
      used.add(String(item.card.id));
      grid.appendChild(makeRecoTile(item.card, item.reason, i));
    });
    article.appendChild(grid);
    parent.appendChild(article);
  }

  function renderForYou() {
    if (!els.forYouShelves) return;
    const ownedCards = [...owned].map(findCard).filter(Boolean);
    els.forYouShelves.innerHTML = "";
    if (els.forYouTaste) {
      els.forYouTaste.hidden = true;
      els.forYouTaste.innerHTML = "";
    }

    if (!ownedCards.length) {
      if (els.forYouStatus) {
        els.forYouStatus.textContent = "Soft picks shaped by what she already cuddles.";
      }
      if (els.forYouEmpty) {
        els.forYouEmpty.hidden = false;
        els.forYouEmpty.textContent =
          "Mark a few friends as owned, and we’ll nestle lookalike suggestions here — rabbits, little babies, snack Amuseables, the lot.";
      }
      return;
    }

    const taste = buildTasteProfile(ownedCards);
    const pills = [
      ...taste.animalTypes.slice(0, 2).map(([k, n]) => `${k} ×${n}`),
      ...taste.themes.slice(0, 2).map(([k]) => k),
      ...taste.sizes.slice(0, 1).map(([k]) => k),
    ];
    if (taste.lovesBabies) pills.unshift("Little ones");
    if (els.forYouTaste && pills.length) {
      els.forYouTaste.hidden = false;
      els.forYouTaste.innerHTML = pills
        .slice(0, 6)
        .map((p) => `<span class="taste-pill">${escapeHtml(p)}</span>`)
        .join("");
    }
    if (els.forYouStatus) {
      els.forYouStatus.textContent = `Reading ${taste.ownedCount} owned friend${taste.ownedCount === 1 ? "" : "s"} for matching cuddles (live and retired).`;
    }
    if (els.forYouEmpty) els.forYouEmpty.hidden = true;

    const scored = [];
    for (const card of catalog.cards) {
      if (isOwned(card.id)) continue;
      if (!isListable(card.id)) continue;
      const { score, reason } = scoreRecommendation(card, taste);
      if (score < 8) continue;
      scored.push({ card, score, reason });
    }
    scored.sort((a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name));

    if (!scored.length) {
      if (els.forYouEmpty) {
        els.forYouEmpty.hidden = false;
        els.forYouEmpty.textContent = "Her nest is wonderfully specific — no clear lookalikes right now. Add a few more owned friends and try again.";
      }
      return;
    }

    const used = new Set();
    appendRecoShelf(
      els.forYouShelves,
      "Top picks for her",
      "Closest matches to the nest she’s building.",
      scored.slice(0, 12),
      used
    );

    for (const [type] of taste.animalTypes.slice(0, 3)) {
      const label = friendLabel(type);
      const items = scored.filter((s) => s.card.animalType === type).slice(0, 8);
      appendRecoShelf(
        els.forYouShelves,
        `More ${label}`,
        `She already has a soft spot for ${label.toLowerCase()}.`,
        items,
        used
      );
    }

    for (const [theme] of taste.themes.slice(0, 3)) {
      const items = scored.filter((s) => s.card.theme === theme).slice(0, 8);
      appendRecoShelf(
        els.forYouShelves,
        `More ${theme}`,
        "Because that family lives in the nest already.",
        items,
        used
      );
    }

    if (taste.lovesBabies) {
      const items = scored.filter((s) => isBabyish(s.card)).slice(0, 10);
      appendRecoShelf(
        els.forYouShelves,
        "Tiny & baby-soft",
        "Little squeezes in the same spirit as her smaller friends.",
        items,
        used
      );
    }

    const leftovers = scored.filter((s) => !used.has(String(s.card.id))).slice(0, 10);
    appendRecoShelf(
      els.forYouShelves,
      "Still worth a peek",
      "Nearby flavours from the nest’s pattern.",
      leftovers,
      used
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
      if (catalogue === "Exclusives") {
        if (!isExclusiveCard(c)) return false;
      } else if (catalogue && c.catalogue !== catalogue) {
        return false;
      }
      if (year && c.year !== year) return false;
      if (status && c.status !== status) return false;
      if (q) {
        const hay =
          `${c.fullName} ${c.name} ${c.theme} ${c.catalogue} ${c.year} ${c.status} ${c.subBrand || ""} ${c.animalType || ""} ${c.sku || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const byTheme = new Map();
    for (const card of filtered) {
      const key = card.theme || "Other friends";
      if (!byTheme.has(key)) byTheme.set(key, []);
      byTheme.get(key).push(card);
    }
    filteredGroups = [...byTheme.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
      .map(([themeName, cards]) => ({ theme: themeName, cards }));

    shown = 0;
    renderThemeGroups();
    updateMeta();
  }

  /** @type {IntersectionObserver | null} */
  let groupIO = null;

  function ensureGroupObserver() {
    if (groupIO) return groupIO;
    groupIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const details = entry.target;
          if (!(details instanceof HTMLElement)) continue;
          const theme = details.dataset.theme || "";
          const inner = details.querySelector(".theme-group-grid");
          const group = filteredGroups.find((g) => g.theme === theme);
          if (group && inner) fillGroupGrid(inner, group.cards);
          groupIO?.unobserve(details);
        }
      },
      { rootMargin: "480px 0px" }
    );
    return groupIO;
  }

  function fillGroupGrid(grid, cards) {
    if (!grid || grid.dataset.filled === "1") return;
    const frag = document.createDocumentFragment();
    cards.forEach((card, i) => frag.appendChild(makeCardTile(card, i)));
    grid.appendChild(frag);
    grid.dataset.filled = "1";
  }

  function renderThemeGroups() {
    if (!els.grid) return;
    if (groupIO) groupIO.disconnect();
    els.grid.innerHTML = "";
    els.grid.className = "theme-groups";

    if (els.groupToolbar) {
      els.groupToolbar.hidden = filteredGroups.length < 2;
    }
    if (els.sentinel) els.sentinel.hidden = true;

    const observer = ensureGroupObserver();

    for (const group of filteredGroups) {
      const details = document.createElement("details");
      details.className = "theme-group";
      details.dataset.theme = group.theme;
      details.dataset.deferFill = "1";
      details.open = true;

      const summary = document.createElement("summary");
      summary.className = "theme-group-summary";
      summary.innerHTML = `
        <span class="theme-group-chevron" aria-hidden="true"></span>
        <span class="theme-group-name">${escapeHtml(group.theme)}</span>
        <span class="theme-group-count">${group.cards.length}</span>
      `;

      const inner = document.createElement("div");
      inner.className = "grid theme-group-grid";

      details.addEventListener("toggle", () => {
        if (details.dataset.deferFill === "1") return;
        if (details.open) fillGroupGrid(inner, group.cards);
      });

      details.appendChild(summary);
      details.appendChild(inner);
      els.grid.appendChild(details);
      delete details.dataset.deferFill;
      observer.observe(details);
    }

    shown = filtered.length;
  }

  function setAllGroupsOpen(open) {
    if (!els.grid) return;
    els.grid.querySelectorAll("details.theme-group").forEach((details) => {
      details.open = open;
      if (open) {
        const theme = details.dataset.theme || "";
        const inner = details.querySelector(".theme-group-grid");
        const group = filteredGroups.find((g) => g.theme === theme);
        if (group && inner) fillGroupGrid(inner, group.cards);
      }
    });
  }

  function updateMeta() {
    const total = catalog.count || catalog.cards.length;
    const n = filtered.length;
    const groups = filteredGroups.length;
    const parts = [];
    if (els.themeFilter?.value) parts.push(els.themeFilter.value);
    if (els.catalogueFilter?.value) parts.push(els.catalogueFilter.value);
    if (els.yearFilter?.value) parts.push(els.yearFilter.value);
    if (els.statusFilter?.value) parts.push(els.statusFilter.value);
    if (els.search.value.trim()) parts.push(`“${els.search.value.trim()}”`);

    if (n === total && !parts.length) {
      els.countLabel.textContent = `${total.toLocaleString()} Jellycats in ${groups.toLocaleString()} themes`;
    } else if (groups > 1) {
      els.countLabel.textContent = `${n.toLocaleString()} friend${n === 1 ? "" : "s"} in ${groups.toLocaleString()} themes`;
    } else {
      els.countLabel.textContent = `${n.toLocaleString()} friend${n === 1 ? "" : "s"} found`;
    }

    els.activePills.hidden = parts.length === 0;
    els.activePills.innerHTML = parts.map((p) => `<span class="pill">${escapeHtml(p)}</span>`).join("");
    els.empty.hidden = n !== 0;
  }

  function renderMore() {
    // Flat infinite scroll no longer used — groups fill as each family is opened.
  }

  function stockLabel(card) {
    const avail = card.availability || "";
    if (avail === "Available") return "Available";
    if (avail === "Preorder") return "Pre-order";
    if (avail === "Store Exclusive" || isExclusiveCard(card)) return "Exclusive";
    if (avail === "Leak" || card.status === "Leak" || card.rarity === "Leak") return "Leak";
    if (card.status === "Coming Soon") return "Coming Soon";
    if (card.status === "Retired" || avail === "Unavailable") return "Unavailable";
    return card.status || avail || "—";
  }

  function stockLink(card) {
    const label = stockLabel(card);
    if ((label === "Available" || label === "Pre-order") && card.ukUrl) return card.ukUrl;
    if (label === "Exclusive" && (card.url || card.ukUrl)) return card.url || card.ukUrl;
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

  function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistanceKm(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[data-leaflet="1"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.setAttribute("data-leaflet", "1");
        document.head.appendChild(link);
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load map library"));
      document.head.appendChild(script);
    });
    return leafletPromise;
  }

  async function loadStockists() {
    if (stockistsLoaded) return stockists;
    if (stockistsLoading) {
      while (stockistsLoading) await new Promise((r) => setTimeout(r, 80));
      return stockists;
    }
    stockistsLoading = true;
    try {
      const res = await fetch(`./data/stockists.json?v=17`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`Stockists unavailable (${res.status})`);
      const data = await res.json();
      stockists = Array.isArray(data.stores) ? data.stores : [];
      stockistsLoaded = true;
      return stockists;
    } finally {
      stockistsLoading = false;
    }
  }

  function renderFindTab() {
    loadStockists().catch(() => {});
    if (findUserPos && els.findWorkspace && !els.findWorkspace.hidden) {
      requestAnimationFrame(() => {
        if (findLeafletMap) findLeafletMap.invalidateSize();
        updateFindMapView();
      });
    }
  }

  function setFindStatus(msg) {
    if (els.findStatus) els.findStatus.textContent = msg;
  }

  function setFindIntroNote(msg) {
    if (els.findIntroNote) els.findIntroNote.textContent = msg;
  }

  function updateFindLocationChrome() {
    const planning = findLocationSource !== "gps";
    if (els.findLocationKicker) {
      els.findLocationKicker.textContent = planning ? "Planning near" : "Searching near";
    }
    if (els.findLocationLabel) els.findLocationLabel.textContent = findLocationName;
    if (findUserMarker) {
      const tip = findLocationSource === "gps" ? "You are here" : findLocationName;
      findUserMarker.setTooltipContent(tip);
    }
  }

  function showFindWorkspace() {
    if (els.findIntro) els.findIntro.hidden = true;
    if (els.findWorkspace) els.findWorkspace.hidden = false;
    if (els.findJourneyBar) els.findJourneyBar.hidden = false;
  }

  function resetFindLocateBtn() {
    if (els.findLocateBtn) {
      els.findLocateBtn.disabled = false;
      els.findLocateBtn.textContent = "Share location & search";
    }
  }

  async function getFindGpsPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000,
      });
    });
  }

  async function applyFindLocation(pos, label, source) {
    findUserPos = { lat: pos.lat, lng: pos.lng };
    findLocationName = label || "Your location";
    findLocationSource = source;
    findRadiusKm = Number(els.findRadius?.value) || 15;

    await Promise.all([loadStockists(), loadLeaflet()]);
    showFindWorkspace();
    updateFindLocationChrome();

    if (!findMapReady) await initFindMap();
    else updateFindLocationOnMap();

    runFindSearch();
    resetFindLocateBtn();
    updateFindLocationChrome();

    if (source === "gps") {
      setFindStatus("Drag the radius slider to widen or tighten your hunt.");
    } else {
      setFindStatus("Planning ahead — change the spot any time, or tap the map to fine-tune.");
    }
  }

  async function startFindSearch() {
    if (!navigator.geolocation) {
      setFindIntroNote("Your browser doesn’t support location — pick a place instead.");
      return;
    }
    if (els.findLocateBtn) {
      els.findLocateBtn.disabled = true;
      els.findLocateBtn.textContent = "Finding you…";
    }
    setFindStatus("Getting your location…");

    try {
      const pos = await getFindGpsPosition();
      await applyFindLocation(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        "Your location",
        "gps"
      );
    } catch (err) {
      const geoDenied = err && typeof err === "object" && "code" in err && err.code === 1;
      const geoFailed = err && typeof err === "object" && "code" in err;
      if (geoFailed) {
        setFindStatus(geoDenied ? "Location permission needed to find nearby stockists." : "Couldn’t get your location. Try again outdoors with signal.");
        setFindIntroNote(
          geoDenied
            ? "Allow location in settings, or pick a place instead for trip planning."
            : "Check location is on for this site, or pick a place instead."
        );
      } else {
        setFindStatus("Couldn’t load stockist data. Check your connection and try again.");
        setFindIntroNote("The shop list needs a quick download — Wi‑Fi or mobile data helps.");
      }
      resetFindLocateBtn();
      console.error(err);
    }
  }

  function openFindLocationModal() {
    if (!els.findLocationModal) return;
    if (els.findLocationError) els.findLocationError.hidden = true;
    if (els.findLocationBusy) els.findLocationBusy.hidden = true;
    if (els.findLocationResults) {
      els.findLocationResults.hidden = true;
      els.findLocationResults.innerHTML = "";
    }
    if (els.findLocationQuery) {
      const prefill = findLocationSource !== "gps" ? findLocationName : "";
      els.findLocationQuery.value = prefill;
    }
    if (typeof els.findLocationModal.showModal === "function") els.findLocationModal.showModal();
    requestAnimationFrame(() => els.findLocationQuery?.focus());
  }

  function formatPhotonPlace(feature) {
    const p = feature.properties || {};
    const parts = [p.name, p.city, p.state, p.country].filter(Boolean);
    return [...new Set(parts.map(String))].join(", ");
  }

  async function searchFindPlaces() {
    const query = (els.findLocationQuery?.value || "").trim();
    if (!query) return;

    if (els.findLocationError) els.findLocationError.hidden = true;
    if (els.findLocationResults) {
      els.findLocationResults.hidden = true;
      els.findLocationResults.innerHTML = "";
    }
    if (els.findLocationBusy) els.findLocationBusy.hidden = false;
    if (els.findLocationSearchBtn) els.findLocationSearchBtn.disabled = true;

    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Place search failed (${res.status})`);
      const data = await res.json();
      const features = Array.isArray(data.features) ? data.features : [];
      if (!features.length) {
        if (els.findLocationError) {
          els.findLocationError.textContent = "No places matched — try a town name or postcode.";
          els.findLocationError.hidden = false;
        }
        return;
      }
      if (!els.findLocationResults) return;
      els.findLocationResults.innerHTML = features
        .map((feature, i) => {
          const [lng, lat] = feature.geometry?.coordinates || [];
          const label = formatPhotonPlace(feature);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
          return `
            <button type="button" class="find-place-option" data-find-place-idx="${i}"
              data-lat="${lat}" data-lng="${lng}" data-label="${escapeAttr(label)}">
              ${escapeHtml(label)}
            </button>`;
        })
        .filter(Boolean)
        .join("");
      els.findLocationResults.hidden = false;
    } catch (err) {
      if (els.findLocationError) {
        els.findLocationError.textContent = "Couldn’t look up that place — check your connection.";
        els.findLocationError.hidden = false;
      }
      console.error(err);
    } finally {
      if (els.findLocationBusy) els.findLocationBusy.hidden = true;
      if (els.findLocationSearchBtn) els.findLocationSearchBtn.disabled = false;
    }
  }

  function onFindLocationResultsClick(e) {
    const btn = e.target.closest("[data-lat][data-lng]");
    if (!btn) return;
    e.preventDefault();
    const lat = Number(btn.getAttribute("data-lat"));
    const lng = Number(btn.getAttribute("data-lng"));
    const label = btn.getAttribute("data-label") || "Selected place";
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    els.findLocationModal?.close();
    applyFindLocation({ lat, lng }, label, "place").catch((err) => {
      setFindStatus("Couldn’t load stockists. Check your connection and try again.");
      console.error(err);
    });
  }

  async function useFindGpsLocation() {
    if (!navigator.geolocation) {
      if (els.findLocationError) {
        els.findLocationError.textContent = "This browser can’t access GPS — search for a place instead.";
        els.findLocationError.hidden = false;
      }
      return;
    }
    if (els.findUseGps) els.findUseGps.disabled = true;
    if (els.findLocationBusy) els.findLocationBusy.hidden = false;
    try {
      const pos = await getFindGpsPosition();
      els.findLocationModal?.close();
      await applyFindLocation(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        "Your location",
        "gps"
      );
    } catch (err) {
      if (els.findLocationError) {
        els.findLocationError.textContent =
          err && typeof err === "object" && "code" in err && err.code === 1
            ? "Location permission denied — allow it, or search for a place."
            : "Couldn’t get GPS — try searching for a town instead.";
        els.findLocationError.hidden = false;
      }
    } finally {
      if (els.findUseGps) els.findUseGps.disabled = false;
      if (els.findLocationBusy) els.findLocationBusy.hidden = true;
    }
  }

  async function reverseGeocodeLabel(lat, lng) {
    const url = `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&lang=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Reverse geocode failed");
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return "Dropped pin";
    return formatPhotonPlace(feature) || "Dropped pin";
  }

  async function onFindMapClick(e) {
    const { lat, lng } = e.latlng;
    let label = "Dropped pin";
    try {
      label = await reverseGeocodeLabel(lat, lng);
    } catch {
      /* keep generic label */
    }
    try {
      await applyFindLocation({ lat, lng }, label, "pin");
    } catch (err) {
      setFindStatus("Couldn’t update search spot — try again.");
      console.error(err);
    }
  }

  function updateFindLocationOnMap() {
    if (!findLeafletMap || !findUserPos) return;
    const latlng = [findUserPos.lat, findUserPos.lng];
    if (findUserMarker) findUserMarker.setLatLng(latlng);
    if (findRadiusCircle) findRadiusCircle.setLatLng(latlng);
    updateFindMapView();
  }

  async function initFindMap() {
    if (!els.findMap || !findUserPos) return;
    if (findMapReady) {
      updateFindLocationOnMap();
      return;
    }
    const L = window.L;
    if (!L) return;

    findLeafletMap = L.map(els.findMap, {
      zoomControl: true,
      attributionControl: true,
    }).setView([findUserPos.lat, findUserPos.lng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(findLeafletMap);

    findUserMarker = L.circleMarker([findUserPos.lat, findUserPos.lng], {
      radius: 9,
      color: "#2f2a33",
      weight: 2,
      fillColor: "#b9d7ea",
      fillOpacity: 0.95,
    }).addTo(findLeafletMap);
    findUserMarker.bindTooltip("You are here", { direction: "top", offset: [0, -8] });

    findRadiusCircle = L.circle([findUserPos.lat, findUserPos.lng], {
      radius: findRadiusKm * 1000,
      color: "#d48493",
      weight: 2,
      fillColor: "#e9a8b3",
      fillOpacity: 0.18,
    }).addTo(findLeafletMap);

    findLeafletMap.on("click", onFindMapClick);

    findMapReady = true;
    updateFindLocationChrome();
    updateFindMapView();
  }

  function updateFindMapView() {
    if (!findLeafletMap || !findUserPos || !findRadiusCircle) return;
    findRadiusCircle.setRadius(findRadiusKm * 1000);
    findLeafletMap.fitBounds(findRadiusCircle.getBounds(), { padding: [28, 28], maxZoom: 14 });
  }

  function onFindRadiusInput() {
    findRadiusKm = Number(els.findRadius?.value) || 15;
    if (els.findRadiusLabel) els.findRadiusLabel.textContent = `${findRadiusKm} km`;
    updateFindMapView();
    if (findUserPos) runFindSearch();
  }

  function runFindSearch() {
    if (!findUserPos || !stockists.length) return;
    const hits = [];
    for (const store of stockists) {
      const lat = Number(store.lat);
      const lng = Number(store.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const distanceKm = haversineKm(findUserPos.lat, findUserPos.lng, lat, lng);
      if (distanceKm <= findRadiusKm) hits.push({ store, distanceKm });
    }
    hits.sort((a, b) => a.distanceKm - b.distanceKm || a.store.name.localeCompare(b.store.name));
    findResults = hits;

    const validIds = new Set(hits.map((h) => h.store.id));
    findSelectedOrder = findSelectedOrder.filter((id) => validIds.has(id));
    findSelected = new Set(findSelectedOrder);

    renderFindResults();
    paintFindMarkers();
    updateFindJourneyBar();
  }

  function renderFindResults() {
    const count = findResults.length;
    if (els.findResultCount) {
      els.findResultCount.textContent =
        count === 0
          ? `No stockists within ${findRadiusKm} km`
          : `${count} stockist${count === 1 ? "" : "s"} within ${findRadiusKm} km`;
    }
    if (els.findEmpty) els.findEmpty.hidden = count > 0;
    if (els.findClearSelection) els.findClearSelection.hidden = findSelected.size === 0;
    if (!els.findResults) return;

    if (!count) {
      els.findResults.innerHTML = "";
      return;
    }

    els.findResults.innerHTML = findResults
      .map(({ store, distanceKm }) => {
        const id = store.id;
        const selected = findSelected.has(id);
        const safeName = escapeHtml(store.name);
        const safeAddress = escapeHtml(store.address || "Address not listed");
        const dist = formatDistanceKm(distanceKm);
        return `
          <article class="find-card${selected ? " is-selected" : ""}" data-find-id="${id}">
            <button type="button" class="find-card-main" data-find-toggle="${id}" aria-pressed="${selected ? "true" : "false"}">
              <span class="find-card-check" aria-hidden="true">${selected ? "✓" : ""}</span>
              <span class="find-card-copy">
                <span class="find-card-name">${safeName}</span>
                <span class="find-card-address">${safeAddress}</span>
              </span>
              <span class="find-card-distance">${dist}</span>
            </button>
            <button type="button" class="find-card-go" data-find-go="${id}">Start journey</button>
          </article>`;
      })
      .join("");
  }

  function paintFindMarkers() {
    if (!findLeafletMap || !window.L) return;
    const L = window.L;
    const keep = new Set(findResults.map((h) => h.store.id));

    for (const [id, marker] of findStoreMarkers) {
      if (!keep.has(id)) {
        findLeafletMap.removeLayer(marker);
        findStoreMarkers.delete(id);
      }
    }

    for (const { store } of findResults) {
      const id = store.id;
      const selected = findSelected.has(id);
      let marker = findStoreMarkers.get(id);
      const icon = L.divIcon({
        className: `find-pin${selected ? " is-selected" : ""}`,
        html: `<span aria-hidden="true">${selected ? "★" : "●"}</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      if (marker) {
        marker.setIcon(icon);
        continue;
      }
      marker = L.marker([store.lat, store.lng], { icon }).addTo(findLeafletMap);
      marker.bindTooltip(escapeHtml(store.name), { direction: "top", offset: [0, -10] });
      marker.on("click", () => toggleFindSelection(id));
      findStoreMarkers.set(id, marker);
    }
  }

  function toggleFindSelection(id) {
    const numId = Number(id);
    if (findSelected.has(numId)) {
      findSelected.delete(numId);
      findSelectedOrder = findSelectedOrder.filter((x) => x !== numId);
    } else {
      findSelected.add(numId);
      findSelectedOrder.push(numId);
    }
    renderFindResults();
    paintFindMarkers();
    updateFindJourneyBar();
  }

  function clearFindSelection() {
    findSelected.clear();
    findSelectedOrder = [];
    renderFindResults();
    paintFindMarkers();
    updateFindJourneyBar();
  }

  function updateFindJourneyBar() {
    const n = findSelected.size;
    if (els.findJourneyBtn) {
      els.findJourneyBtn.disabled = n === 0;
      els.findJourneyBtn.textContent = n <= 1 ? "Start journey" : `Start journey (${n} stops)`;
    }
  }

  function onFindResultsClick(e) {
    const goBtn = e.target.closest("[data-find-go]");
    if (goBtn) {
      e.preventDefault();
      const id = Number(goBtn.getAttribute("data-find-go"));
      if (id) startFindJourney([id]);
      return;
    }
    const toggleBtn = e.target.closest("[data-find-toggle]");
    if (toggleBtn) {
      e.preventDefault();
      const id = Number(toggleBtn.getAttribute("data-find-toggle"));
      if (id) toggleFindSelection(id);
    }
  }

  function startFindJourney(overrideIds) {
    if (!findUserPos) return;
    const ids = overrideIds || findSelectedOrder.slice();
    if (!ids.length) return;

    const byId = new Map(findResults.map((h) => [h.store.id, h.store]));
    const stops = ids.map((id) => byId.get(id)).filter(Boolean);
    if (!stops.length) return;

    if (stops.length > 10) {
      setFindStatus("Google Maps supports up to 10 stops — starting with your first picks.");
      stops.splice(10);
    }

    const url = buildGoogleMapsJourneyUrl(findUserPos, stops);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function buildGoogleMapsJourneyUrl(origin, stops) {
    const fmt = (s) => `${s.lat},${s.lng}`;
    const originStr = fmt(origin);
    if (stops.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(fmt(stops[0]))}&travelmode=driving`;
    }
    const destination = stops[stops.length - 1];
    const waypoints = stops
      .slice(0, -1)
      .map(fmt)
      .join("|");
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(fmt(destination))}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
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
