/**
 * Shared family list sync (wishlist / owned) via the Family Vault Supabase hub.
 *
 * Model: one shared list per app + list_type for the whole family.
 * No accounts — every phone reads/writes the same rows.
 * Cloud is the source of truth after a one-time localStorage migration.
 *
 * Rows may carry a `meta` JSON object (dossier fields, wishlist priority, …).
 *
 * Usage from app.js:
 *   const sync = window.FamilyListSync.create({
 *     app: "jellynest",
 *     listType: "wishlist",
 *     storageKey: "jellynest_wishlist_v1",
 *     metaStorageKey: "jellynest_wishlist_meta_v1",
 *     onRemoteChange: (ids, metaById) => { ... }
 *   });
 *   const { ids, meta } = await sync.hydrate(localSet);
 *   sync.subscribe();
 *   sync.setItem(id, true|false, optionalMeta);
 *   sync.setMeta(id, patch);
 */
(function () {
  const DEVICE_KEY = "family_vault_device_name_v1";
  const POLL_MS = 12000;

  function cfg() {
    return window.FAMILY_VAULT || {};
  }

  function ready() {
    const c = cfg();
    return Boolean((c.url || "").trim() && (c.anonKey || "").trim());
  }

  function deviceName() {
    try {
      let name = (localStorage.getItem(DEVICE_KEY) || "").trim();
      if (!name) {
        name = `device-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(DEVICE_KEY, name);
      }
      return name;
    } catch {
      return "unknown";
    }
  }

  function headers() {
    const key = cfg().anonKey.trim();
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    };
  }

  function baseUrl() {
    const table = (cfg().table || "family_list_items").trim();
    return `${cfg().url.replace(/\/$/, "")}/rest/v1/${table}`;
  }

  function sameSet(a, b) {
    if (a.size !== b.size) return false;
    for (const id of a) if (!b.has(id)) return false;
    return true;
  }

  function cloneMeta(meta) {
    const out = {};
    for (const [k, v] of Object.entries(meta || {})) {
      if (v && typeof v === "object" && !Array.isArray(v)) out[k] = { ...v };
    }
    return out;
  }

  function metaEqual(a, b) {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const key of keys) {
      if (JSON.stringify(a?.[key] || {}) !== JSON.stringify(b?.[key] || {})) return false;
    }
    return true;
  }

  function normalizeMeta(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return { ...raw };
  }

  function create(options) {
    const app = String(options.app || "").trim();
    const listType = String(options.listType || "wishlist").trim();
    const storageKey = String(options.storageKey || "").trim();
    const metaStorageKey = String(options.metaStorageKey || "").trim();
    const onRemoteChange =
      typeof options.onRemoteChange === "function" ? options.onRemoteChange : null;
    const migratedKey = `family_vault_migrated_${app}_${listType}_v1`;

    let client = null;
    let channel = null;
    let pollTimer = null;
    let lastKnown = new Set();
    /** @type {Record<string, Record<string, unknown>>} */
    let lastMeta = {};
    let applyingRemote = false;

    function persistLocal(ids) {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify([...ids]));
      } catch (err) {
        console.warn("Could not cache list locally", err);
      }
    }

    function persistMeta(meta) {
      if (!metaStorageKey) return;
      try {
        localStorage.setItem(metaStorageKey, JSON.stringify(meta || {}));
      } catch (err) {
        console.warn("Could not cache list meta locally", err);
      }
    }

    function readLocal() {
      if (!storageKey) return new Set();
      try {
        const raw = JSON.parse(localStorage.getItem(storageKey) || "[]");
        return new Set((Array.isArray(raw) ? raw : []).map(String));
      } catch {
        return new Set();
      }
    }

    function readLocalMeta() {
      if (!metaStorageKey) return {};
      try {
        const raw = JSON.parse(localStorage.getItem(metaStorageKey) || "{}");
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
        const out = {};
        for (const [k, v] of Object.entries(raw)) {
          if (v && typeof v === "object" && !Array.isArray(v)) out[String(k)] = { ...v };
        }
        return out;
      } catch {
        return {};
      }
    }

    function wasMigrated() {
      try {
        return localStorage.getItem(migratedKey) === "1";
      } catch {
        return false;
      }
    }

    function markMigrated() {
      try {
        localStorage.setItem(migratedKey, "1");
      } catch {
        /* ignore */
      }
    }

    function applyRemote(ids, meta, notify) {
      const next = new Set([...ids].map(String));
      const nextMeta = cloneMeta(meta);
      // Drop meta for items no longer on the list
      for (const key of Object.keys(nextMeta)) {
        if (!next.has(key)) delete nextMeta[key];
      }
      lastKnown = next;
      lastMeta = nextMeta;
      persistLocal(next);
      persistMeta(nextMeta);
      if (notify && onRemoteChange) onRemoteChange([...next], cloneMeta(nextMeta));
      return { ids: next, meta: cloneMeta(nextMeta) };
    }

    async function fetchRemote() {
      if (!ready()) return null;
      const url =
        `${baseUrl()}?app=eq.${encodeURIComponent(app)}` +
        `&list_type=eq.${encodeURIComponent(listType)}` +
        `&select=item_id,meta`;
      const res = await fetch(url, {
        headers: {
          apikey: cfg().anonKey.trim(),
          Authorization: `Bearer ${cfg().anonKey.trim()}`,
        },
      });
      if (!res.ok) throw new Error(`Family vault fetch failed (${res.status})`);
      const rows = await res.json();
      const ids = new Set();
      /** @type {Record<string, Record<string, unknown>>} */
      const meta = {};
      for (const row of rows || []) {
        const id = String(row.item_id);
        ids.add(id);
        meta[id] = normalizeMeta(row.meta);
      }
      return { ids, meta };
    }

    async function upsertItem(itemId, meta) {
      if (!ready()) return;
      const res = await fetch(baseUrl(), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          app,
          list_type: listType,
          item_id: String(itemId),
          meta: normalizeMeta(meta),
          updated_by: deviceName(),
          updated_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Family vault upsert failed (${res.status}) ${text}`);
      }
    }

    async function deleteItem(itemId) {
      if (!ready()) return;
      const url =
        `${baseUrl()}?app=eq.${encodeURIComponent(app)}` +
        `&list_type=eq.${encodeURIComponent(listType)}` +
        `&item_id=eq.${encodeURIComponent(String(itemId))}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          apikey: cfg().anonKey.trim(),
          Authorization: `Bearer ${cfg().anonKey.trim()}`,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Family vault delete failed (${res.status}) ${text}`);
      }
    }

    /**
     * Cloud wins. One-time: push old phone-only items up, then never re-push
     * stale local cache (so another phone ticking something off stays off).
     */
    async function hydrate(seedSet) {
      const local = seedSet instanceof Set ? new Set([...seedSet].map(String)) : readLocal();
      const localMeta = readLocalMeta();
      if (!ready()) {
        persistLocal(local);
        persistMeta(localMeta);
        lastKnown = local;
        lastMeta = cloneMeta(localMeta);
        return { ids: local, meta: cloneMeta(localMeta) };
      }
      try {
        let remote = await fetchRemote();
        if (!remote) {
          persistLocal(local);
          persistMeta(localMeta);
          lastKnown = local;
          lastMeta = cloneMeta(localMeta);
          return { ids: local, meta: cloneMeta(localMeta) };
        }

        if (!wasMigrated() && local.size) {
          const toUpload = [...local].filter((id) => !remote.ids.has(id));
          for (const id of toUpload) await upsertItem(id, localMeta[id] || {});
          // Also push local meta for ids already remote if remote meta is empty
          const metaUpload = [...local].filter((id) => {
            if (!remote.ids.has(id)) return false;
            const remoteEmpty = !Object.keys(remote.meta[id] || {}).length;
            const localHas = Object.keys(localMeta[id] || {}).length > 0;
            return remoteEmpty && localHas;
          });
          for (const id of metaUpload) await upsertItem(id, localMeta[id] || {});
          if (toUpload.length || metaUpload.length) remote = (await fetchRemote()) || remote;
          markMigrated();
        } else {
          markMigrated();
        }

        return applyRemote(remote.ids, remote.meta, false);
      } catch (err) {
        console.warn("Family vault hydrate failed; using local cache", err);
        persistLocal(local);
        persistMeta(localMeta);
        lastKnown = local;
        lastMeta = cloneMeta(localMeta);
        return { ids: local, meta: cloneMeta(localMeta) };
      }
    }

    function setItem(itemId, wanted, meta) {
      const id = String(itemId);
      const local = new Set(lastKnown.size ? lastKnown : readLocal());
      const nextMeta = cloneMeta(lastMeta);
      if (wanted) {
        local.add(id);
        if (meta && typeof meta === "object") nextMeta[id] = normalizeMeta(meta);
        else if (!nextMeta[id]) nextMeta[id] = {};
      } else {
        local.delete(id);
        delete nextMeta[id];
      }
      lastKnown = local;
      lastMeta = nextMeta;
      persistLocal(local);
      persistMeta(nextMeta);
      if (!ready()) return Promise.resolve({ ids: local, meta: cloneMeta(nextMeta) });
      const op = wanted ? upsertItem(id, nextMeta[id] || {}) : deleteItem(id);
      return op
        .catch((err) => console.warn("Family vault sync failed", err))
        .then(() => ({ ids: local, meta: cloneMeta(nextMeta) }));
    }

    function setMeta(itemId, patch) {
      const id = String(itemId);
      if (!lastKnown.has(id) && !(lastKnown.size ? lastKnown : readLocal()).has(id)) {
        return Promise.resolve(cloneMeta(lastMeta));
      }
      const local = new Set(lastKnown.size ? lastKnown : readLocal());
      local.add(id);
      const prev = normalizeMeta(lastMeta[id]);
      const merged = { ...prev, ...(patch && typeof patch === "object" ? patch : {}) };
      // Drop empty string fields so clears sync cleanly
      for (const [k, v] of Object.entries(merged)) {
        if (v == null || v === "") delete merged[k];
      }
      lastKnown = local;
      lastMeta = { ...cloneMeta(lastMeta), [id]: merged };
      persistLocal(local);
      persistMeta(lastMeta);
      if (!ready()) return Promise.resolve(cloneMeta(lastMeta));
      return upsertItem(id, merged)
        .catch((err) => console.warn("Family vault meta sync failed", err))
        .then(() => cloneMeta(lastMeta));
    }

    function getMeta(itemId) {
      return normalizeMeta(lastMeta[String(itemId)]);
    }

    function readMeta() {
      return cloneMeta(lastMeta);
    }

    async function pullAndNotify() {
      if (applyingRemote) return;
      applyingRemote = true;
      try {
        const remote = await fetchRemote();
        if (!remote) return;
        if (sameSet(remote.ids, lastKnown) && metaEqual(remote.meta, lastMeta)) return;
        applyRemote(remote.ids, remote.meta, true);
      } catch (err) {
        console.warn("Family vault pull failed", err);
      } finally {
        applyingRemote = false;
      }
    }

    function startPolling() {
      if (pollTimer || !ready()) return;
      pollTimer = window.setInterval(() => {
        pullAndNotify();
      }, POLL_MS);
    }

    function stopPolling() {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function subscribe() {
      if (!ready()) return;
      startPolling();
      if (!window.supabase?.createClient || channel) return;
      try {
        client = window.supabase.createClient(cfg().url.trim(), cfg().anonKey.trim());
        channel = client
          .channel(`family-list-${app}-${listType}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: cfg().table || "family_list_items",
              filter: `app=eq.${app}`,
            },
            () => {
              pullAndNotify();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("Family vault realtime unavailable; polling only", err);
      }
    }

    function unsubscribe() {
      stopPolling();
      if (channel && client) {
        client.removeChannel(channel).catch(() => {});
      }
      channel = null;
      client = null;
    }

    return {
      ready,
      hydrate,
      setItem,
      setMeta,
      getMeta,
      readMeta,
      subscribe,
      unsubscribe,
      pullAndNotify,
      readLocal,
    };
  }

  window.FamilyListSync = { create, ready };
})();
