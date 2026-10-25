// backend.js — BROWSER module. Do NOT run with `node backend.js`.
window.Backend = (function () {
  const cfg = window.FIREBASE_CONFIG || {};
  let rtdb = null,
    api = null;
  let isReady = false;
  let useLocalApi = false;
  let initPromise = null;
  const CHUNK_SIZE = 80000;

  /* =====================================================
     RETRY HELPER — exponential backoff, 3 attempts
  ===================================================== */
  async function withRetry(fn, maxAttempts = 3, label = "operation") {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        console.warn(
          `[NGL] ${label} attempt ${attempt}/${maxAttempts} failed:`,
          e?.message || e,
        );
        if (attempt < maxAttempts) {
          await new Promise((r) =>
            setTimeout(r, 300 * Math.pow(2, attempt - 1)),
          );
        }
      }
    }
    throw lastErr;
  }

  /* =====================================================
     INIT — cached, but a FAILED init is cleared so the
     next call retries. Never leaves you stuck in localApi
     mode forever.
  ===================================================== */
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      isReady = false;
      useLocalApi = false;

      if (!cfg.databaseURL) {
        console.warn(
          "[NGL] No FIREBASE_CONFIG.databaseURL — using local /api/ endpoints",
        );
        useLocalApi = true;
        isReady = true;
        initPromise = null; // allow retry if config is added later
        return;
      }

      try {
        const appMod =
          await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
        const dbMod =
          await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js");
        const app = appMod.getApps().length
          ? appMod.getApp()
          : appMod.initializeApp(cfg);
        rtdb = dbMod.getDatabase(app);
        api = dbMod;
        isReady = true;
        console.info("[NGL] Firebase RTDB Connected");
      } catch (e) {
        console.error("[NGL] RTDB Init Failed:", e?.message || e);
        useLocalApi = true;
        isReady = true;
        initPromise = null; // ← next init() call will retry Firebase instead of being stuck
      }
    })();
    return initPromise;
  }

  async function localFetch(pathname, opts = {}) {
    const res = await fetch(pathname, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  async function saveProfile(handle, profile) {
    if (!isReady) await init();
    if (useLocalApi) {
      return localFetch("/api/profile", {
        method: "POST",
        body: JSON.stringify({ handle, ...profile }),
      });
    }
    // Strip any legacy hint field
    const { hint, ...clean } = profile || {};
    await withRetry(
      () => api.set(api.ref(rtdb, "profiles/" + handle), clean),
      3,
      "saveProfile",
    );
    return clean;
  }

  async function getProfile(handle) {
    if (!isReady) await init();
    if (useLocalApi) {
      try {
        return await localFetch("/api/profile/" + encodeURIComponent(handle));
      } catch {
        return null;
      }
    }
    const snap = await withRetry(
      () => api.get(api.ref(rtdb, "profiles/" + handle)),
      3,
      "getProfile",
    );
    return snap.exists() ? snap.val() : null;
  }

  /* =====================================================
     SEND — generate msgId ONCE, upload files, then write
     the message. Every step is retried. If the message
     write fails permanently, orphaned chunks are removed.
  ===================================================== */
  async function sendMessage(handle, msg) {
    if (!isReady) await init();

    if (useLocalApi) {
      const payload = {
        text: msg.text || "",
        files: (msg.files || []).map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          dataURL: f.dataURL,
        })),
      };
      const { id } = await withRetry(
        () =>
          localFetch("/api/messages/" + encodeURIComponent(handle), {
            method: "POST",
            body: JSON.stringify(payload),
          }),
        3,
        "sendMessage (local)",
      );
      return id;
    }

    const msgId = api.push(api.ref(rtdb, "messages/" + handle)).key;
    const uploadedFilesMeta = [];
    const writtenChunkIndices = [];

    try {
      // 1. Upload file chunks (each file retried independently)
      if (msg.files && msg.files.length > 0) {
        for (let i = 0; i < msg.files.length; i++) {
          const f = msg.files[i];
          const chunks = [];
          for (
            let offset = 0;
            offset < f.dataURL.length;
            offset += CHUNK_SIZE
          ) {
            chunks.push(f.dataURL.substring(offset, offset + CHUNK_SIZE));
          }
          const chunkUpdates = {};
          chunks.forEach((chunk, index) => {
            chunkUpdates[`file_chunks/${msgId}/${i}/${index}`] = chunk;
          });

          await withRetry(
            () => api.update(api.ref(rtdb), chunkUpdates),
            3,
            `file chunk upload (file ${i + 1}/${msg.files.length})`,
          );
          writtenChunkIndices.push(i);

          uploadedFilesMeta.push({
            name: f.name,
            type: f.type,
            size: f.size,
            chunksCount: chunks.length,
          });
        }
      }

      // 2. Write the message itself
      const finalMsg = {
        id: msgId,
        text: msg.text || "",
        files: uploadedFilesMeta,
        createdAt: Date.now(),
        read: false,
      };

      await withRetry(
        () =>
          api.set(api.ref(rtdb, "messages/" + handle + "/" + msgId), finalMsg),
        3,
        "message write",
      );

      return msgId;
    } catch (err) {
      // Cleanup orphaned chunks so they don't waste storage
      for (const i of writtenChunkIndices) {
        try {
          await api.remove(api.ref(rtdb, `file_chunks/${msgId}/${i}`));
        } catch {}
      }
      // Also remove any partial message node just in case
      try {
        await api.remove(api.ref(rtdb, "messages/" + handle + "/" + msgId));
      } catch {}
      throw err;
    }
  }

  async function fetchFileChunks(msgId, fileIndex, chunksCount) {
    if (!isReady) await init();
    if (useLocalApi) return null;
    const snap = await withRetry(
      () => api.get(api.ref(rtdb, `file_chunks/${msgId}/${fileIndex}`)),
      3,
      "fetchFileChunks",
    );
    if (!snap.exists()) return null;
    const chunkData = snap.val();
    let base64 = "";
    for (let i = 0; i < chunksCount; i++)
      if (chunkData[i]) base64 += chunkData[i];
    try {
      await api.remove(api.ref(rtdb, `file_chunks/${msgId}/${fileIndex}`));
    } catch {}
    return base64;
  }

  function subscribeMessages(handle, cb) {
    if (!isReady) {
      init()
        .then(() => subscribeMessages(handle, cb))
        .catch(() => {});
      return () => {};
    }

    if (useLocalApi) {
      let known = new Set();
      let first = true;
      let stopped = false;
      async function poll() {
        if (stopped) return;
        try {
          const arr = await localFetch(
            "/api/messages/" + encodeURIComponent(handle),
          );
          const list = Array.isArray(arr) ? arr : [];
          const newOnes = first ? [] : list.filter((m) => !known.has(m.id));
          list.forEach((m) => known.add(m.id));
          cb(list, { first, newOnes });
          first = false;
        } catch {}
        if (!stopped) setTimeout(poll, 2500);
      }
      poll();
      return () => {
        stopped = true;
      };
    }

    let first = true;
    const known = new Set();
    const unsub = api.onValue(api.ref(rtdb, "messages/" + handle), (snap) => {
      const val = snap.val() || {};
      const arr = Object.values(val).sort((a, b) => b.createdAt - a.createdAt);
      const newOnes = first ? [] : arr.filter((m) => !known.has(m.id));
      arr.forEach((m) => known.add(m.id));
      cb(arr, { first, newOnes });
      first = false;
    });
    return () => unsub();
  }

  async function markAsRead(handle, msgId) {
    if (!isReady) await init();
    if (useLocalApi) return;
    await withRetry(
      () =>
        api.update(api.ref(rtdb, "messages/" + handle + "/" + msgId), {
          read: true,
        }),
      3,
      "markAsRead",
    );
  }

  async function deleteMessage(handle, msgId, filesMeta) {
    if (!isReady) await init();
    if (useLocalApi) {
      await localFetch(
        "/api/messages/" + encodeURIComponent(handle) + "/" + msgId,
        {
          method: "DELETE",
        },
      );
      return;
    }
    await withRetry(
      () => api.remove(api.ref(rtdb, "messages/" + handle + "/" + msgId)),
      3,
      "deleteMessage",
    );
    if (filesMeta) {
      for (let i = 0; i < filesMeta.length; i++) {
        try {
          await api.remove(api.ref(rtdb, `file_chunks/${msgId}/${i}`));
        } catch {}
      }
    }
  }

  return {
    init,
    saveProfile,
    getProfile,
    sendMessage,
    subscribeMessages,
    fetchFileChunks,
    markAsRead,
    deleteMessage,
  };
})();
