const CONFIG = Object.freeze({
  // ── Backend Proxy ─────────────────────────────────────────────────────────
  BACKEND_URL:        "https://hate-speach-backend.onrender.com",
  MODERATE_ENDPOINT:  "https://hate-speach-backend.onrender.com/moderate",

  // ── Input Limits ──────────────────────────────────────────────────────────
  MAX_CHARACTERS:     5000,

  // ── Request Settings ──────────────────────────────────────────────────────
  REQUEST_TIMEOUT_MS: 40000,
});
