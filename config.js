/**
 * config.js — ClearText Configuration
 *
 * INSTRUCTIONS:
 * 1. Get your OpenAI API key at: https://platform.openai.com/api-keys
 * 2. Replace YOUR_OPENAI_API_KEY_HERE with your actual key (starts with "sk-...").
 * 3. DO NOT commit this file with a real API key to a public repository.
 *    Add `config.js` to your `.gitignore` file.
 *
 * NOTE: The OpenAI Moderation endpoint is FREE to use — it does not consume
 * token credits. Any valid OpenAI API key works regardless of billing plan.
 *
 * For production deployments, use a backend proxy so the key is never
 * exposed in client-side code.
 */

 const CONFIG = {
    OPENAI_API_KEY:     "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",
    OPENAI_API_URL:     "https://api.openai.com/v1/moderations",
    OPENAI_MODEL:       "omni-moderation-latest",  // Most capable moderation model
    MAX_CHARACTERS:     5000,
    REQUEST_TIMEOUT_MS: 15000,
  };