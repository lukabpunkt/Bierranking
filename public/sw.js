// Minimaler Service Worker: macht die App installierbar.
// Bewusst KEIN Offline-Cache – alle Daten kommen live aus Supabase (nichts soll veralten).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Netzwerk durchreichen (Standardverhalten)
});
