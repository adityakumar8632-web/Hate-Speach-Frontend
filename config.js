/**
 * config.js — ClearText Frontend Configuration
 *
 * The OpenAI API key has been removed from this file for security.
 * All moderation requests are now routed through the secure backend
 * proxy hosted on Render, which holds the API key server-side.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 *  Architecture:
 *  User Browser → GitHub Pages → Render Backend → OpenAI API
 * └─────────────────────────────────────────────────────────────┘
 *
 * To run locally, start the backend server and update
 * BACKEND_URL to http://localhost:3000 during development.
 */

const CONFIG = {
  // ── Backend Proxy ────────────────────────────────────────────
  // Production: Render backend (API key lives here, never in browser)
  BACKEND_URL:        "https://hate-speech-backend.onrender.com",

  // Full endpoint used by app.js → API.analyzeText()
  MODERATE_ENDPOINT:  "https://hate-speech-backend.onrender.com/moderate",

  // ── Input Limits ─────────────────────────────────────────────
  MAX_CHARACTERS:     5000,

  // ── Request Settings ─────────────────────────────────────────
  REQUEST_TIMEOUT_MS: 15000,
};
