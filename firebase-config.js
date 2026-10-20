/* =====================================================================
   Firebase RTDB config — OPTIONAL.
   Leave apiKey as "YOUR_API_KEY" to use local polling (works out of box).
   Fill these in to enable real-time RTDB sync.

   SETUP:
   1. https://console.firebase.google.com → new project
   2. Build → Realtime Database → Create (start in test mode for dev)
   3. Project Settings → General → Your apps → Web app → copy config
   4. Paste below and restart the server. The app auto-detects & uses RTDB.
===================================================================== */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCq68Teb657ZpZGN2ripSoQrDUCeOvua-k",
  authDomain: "ng-l-c11b5.firebaseapp.com",
  databaseURL: "https://ng-l-c11b5-default-rtdb.firebaseio.com",
  projectId: "ng-l-c11b5",
  storageBucket: "ng-l-c11b5.firebasestorage.app",
  messagingSenderId: "1097003039818",
  appId: "1:1097003039818:web:44ddc9e6b10b35ebad3ab3",
  measurementId: "G-MYC8J36XGV",
};
