/**
 * config.js — ClearText Frontend Configuration
 *
 * ┌─────────────────────────────────────────────────────────────┐
 *  Architecture:
 *  User Browser → GitHub Pages → Render Backend → OpenAI API
 * └─────────────────────────────────────────────────────────────┘
 *
 * ⚠️  IMPORTANT: The Render service name uses "Speach" (the typo),
 *     so the URL is hate-speach-backend.onrender.com — NOT hate-speech.
 *     Update BACKEND_URL below to match your exact Render service name.
 *
 * To find your exact URL:
 *   1. Go to https://dashboard.render.com
 *   2. Click your backend service
 *   3. Copy the URL shown at the top (e.g. https://xxxxx.onrender.com)
 */

// FIX #4: Corrected URL to match actual Render service name (with typo "Speach")
// FIX #7: Increased timeout to 40s to survive Render free tier cold starts (30-50s)
// FIX #5: Object.freeze() prevents accidental mutation

const CONFIG = Object.freeze({
  // ── Backend Proxy ─────────────────────────────────────────────────────────
  // ⚠️  Replace this with your actual Render URL if it differs.
  //     Check your Render dashboard → your service → the URL at the top.
  BACKEND_URL:        "https://hate-speach-backend.onrender.com",
  MODERATE_ENDPOINT:  "https://hate-speach-backend.onrender.com/moderate",

  // ── Input Limits ──────────────────────────────────────────────────────────
  MAX_CHARACTERS:     5000,

  // ── Request Settings ──────────────────────────────────────────────────────
  // FIX #7: 40s timeout — Render free tier can take 30-50s to cold-start.
  //         Users will now see the loading state instead of a timeout error.
  REQUEST_TIMEOUT_MS: 40000,
});
