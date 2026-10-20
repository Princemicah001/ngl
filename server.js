// backend.js — BROWSER module. Do NOT run with `node backend.js`.
window.Backend = (function () {
  const cfg = window.FIREBASE_CONFIG || {};
  let rtdb = null,
    api = null;
  let isReady = false;
  let useLocalApi = false;
  const CHUNK_SIZE = 80000;

  async function init() {
    if (!cfg.databaseURL) {
      console.warn(
        "[NGL] No FIREBASE_CONFIG.databaseURL — falling back to local /api/ endpoints",
      );
      useLocalApi = true;
      isReady = true;
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
      console.error("[NGL] RTDB Init Failed — using local fallback:", e);
      useLocalApi = true;
      isReady = true;
    }
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
    if (!isReady) throw new Error("Backend not initialised");
    if (useLocalApi) {
      return localFetch("/api/profile", {
        method: "POST",
        body: JSON.stringify({ handle, ...profile }),
      });
    }
    await api.set(api.ref(rtdb, "profiles/" + handle), profile);
    return profile;
  }

  async function getProfile(handle) {
    if (!isReady) return null;
    if (useLocalApi) {
      try {
        return await localFetch("/api/profile/" + encodeURIComponent(handle));
      } catch {
        return null;
      }
    }
    const snap = await api.get(api.ref(rtdb, "profiles/" + handle));
    return snap.exists() ? snap.val() : null;
  }

  async function sendMessage(handle, msg) {
    if (!isReady) throw new Error("Backend not initialised");

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
      const { id } = await localFetch(
        "/api/messages/" + encodeURIComponent(handle),
        { method: "POST", body: JSON.stringify(payload) },
      );
      return id;
    }

    const msgId = api.push(api.ref(rtdb, "messages/" + handle)).key;
    const uploadedFilesMeta = [];

    if (msg.files && msg.files.length > 0) {
      for (let i = 0; i < msg.files.length; i++) {
        const f = msg.files[i];
        const chunks = [];
        for (let offset = 0; offset < f.dataURL.length; offset += CHUNK_SIZE) {
          chunks.push(f.dataURL.substring(offset, offset + CHUNK_SIZE));
        }
        const chunkUpdates = {};
        chunks.forEach((chunk, index) => {
          chunkUpdates[`file_chunks/${msgId}/${i}/${index}`] = chunk;
        });
        await api.update(api.ref(rtdb), chunkUpdates);
        uploadedFilesMeta.push({
          name: f.name,
          type: f.type,
          size: f.size,
          chunksCount: chunks.length,
        });
      }
    }

    const finalMsg = {
      id: msgId,
      text: msg.text,
      files: uploadedFilesMeta,
      createdAt: Date.now(),
      read: false,
    };
    await api.set(api.ref(rtdb, "messages/" + handle + "/" + msgId), finalMsg);
    return msgId;
  }

  async function fetchFileChunks(msgId, fileIndex, chunksCount) {
    if (!isReady || useLocalApi) return null;
    const snap = await api.get(
      api.ref(rtdb, `file_chunks/${msgId}/${fileIndex}`),
    );
    if (!snap.exists()) return null;
    const chunkData = snap.val();
    let base64 = "";
    for (let i = 0; i < chunksCount; i++) {
      if (chunkData[i]) base64 += chunkData[i];
    }
    await api.remove(api.ref(rtdb, `file_chunks/${msgId}/${fileIndex}`));
    return base64;
  }

  function subscribeMessages(handle, cb) {
    if (!isReady) return () => {};

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
        } catch (e) {
          // swallow polling errors
        }
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
    if (!isReady || useLocalApi) return;
    await api.update(api.ref(rtdb, "messages/" + handle + "/" + msgId), {
      read: true,
    });
  }

  async function deleteMessage(handle, msgId, filesMeta) {
    if (!isReady) return;
    if (useLocalApi) {
      await localFetch(
        "/api/messages/" + encodeURIComponent(handle) + "/" + msgId,
        { method: "DELETE" },
      );
      return;
    }
    await api.remove(api.ref(rtdb, "messages/" + handle + "/" + msgId));
    if (filesMeta) {
      for (let i = 0; i < filesMeta.length; i++) {
        await api.remove(api.ref(rtdb, `file_chunks/${msgId}/${i}`));
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
