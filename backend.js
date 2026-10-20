window.Backend = (function () {
  const cfg = window.FIREBASE_CONFIG || {};
  let rtdb = null,
    api = null;
  let isReady = false;
  const CHUNK_SIZE = 80000; // ~80KB per chunk to stay well under RTDB limits

  async function init() {
    if (!cfg.databaseURL) return console.error("[NGL] Missing databaseURL");
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
      console.error("[NGL] RTDB Init Failed:", e);
    }
  }

  async function saveProfile(handle, profile) {
    if (!isReady) throw new Error("RTDB not connected");
    await api.set(api.ref(rtdb, "profiles/" + handle), profile);
  }

  async function getProfile(handle) {
    if (!isReady) return null;
    const snap = await api.get(api.ref(rtdb, "profiles/" + handle));
    return snap.exists() ? snap.val() : null;
  }

  // --- CHUNKING LOGIC ---
  async function sendMessage(handle, msg) {
    if (!isReady) throw new Error("RTDB not connected");

    const msgId = api.push(api.ref(rtdb, "messages/" + handle)).key;
    const uploadedFilesMeta = [];

    // Process files
    if (msg.files && msg.files.length > 0) {
      for (let i = 0; i < msg.files.length; i++) {
        const f = msg.files[i];
        // Split base64 string into chunks
        const chunks = [];
        for (let offset = 0; offset < f.dataURL.length; offset += CHUNK_SIZE) {
          chunks.push(f.dataURL.substring(offset, offset + CHUNK_SIZE));
        }

        // Push chunks to RTDB
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

    // Save the actual message
    const finalMsg = {
      id: msgId,
      text: msg.text,
      files: uploadedFilesMeta, // Contains metadata, not the actual data
      createdAt: Date.now(),
      read: false,
    };

    await api.set(api.ref(rtdb, "messages/" + handle + "/" + msgId), finalMsg);
    return msgId;
  }

  // --- REASSEMBLY LOGIC ---
  async function fetchFileChunks(msgId, fileIndex, chunksCount) {
    if (!isReady) return null;

    const snap = await api.get(
      api.ref(rtdb, `file_chunks/${msgId}/${fileIndex}`),
    );
    if (!snap.exists()) return null;

    const chunkData = snap.val();
    let base64 = "";
    for (let i = 0; i < chunksCount; i++) {
      if (chunkData[i]) base64 += chunkData[i];
    }

    // Delete chunks from RTDB to save space
    await api.remove(api.ref(rtdb, `file_chunks/${msgId}/${fileIndex}`));

    return base64;
  }

  function subscribeMessages(handle, cb) {
    if (!isReady) return () => {};
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
    if (!isReady) return;
    await api.update(api.ref(rtdb, "messages/" + handle + "/" + msgId), {
      read: true,
    });
  }

  async function deleteMessage(handle, msgId, filesMeta) {
    if (!isReady) return;
    // Delete message node
    await api.remove(api.ref(rtdb, "messages/" + handle + "/" + msgId));
    // Cleanup any orphaned chunks
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
