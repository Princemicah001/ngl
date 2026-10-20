/* =====================================================================
   Notification helper.
   Uses Service Worker registration.showNotification() so notifications
   appear even when the tab is backgrounded (foreground tab too).
   Requires HTTPS or localhost.
===================================================================== */
window.Notify = (function () {
  async function requestPermission() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const p = await Notification.requestPermission();
    return p === "granted";
  }

  async function show(title, opts = {}) {
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          icon: "/public/I5OG1V7seR2tatnsaXFQ2fIQpHA.png",
          badge: "/public/I5OG1V7seR2tatnsaXFQ2fIQpHA.png",
          ...opts,
        });
        return;
      }
    } catch (e) {}
    try {
      new Notification(title, opts);
    } catch (e) {}
  }

  return { requestPermission, show };
})();
