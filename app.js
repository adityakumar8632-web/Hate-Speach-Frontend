/**
 * app.js — ClearText Hate Speech Detector
 * ─────────────────────────────────────────
 * Architecture: Modular Vanilla JS (ES2020+)
 * No external dependencies. Pure optimized JavaScript.
 *
 * Modules:
 *  1. DOM       — Element references & selectors
 *  2. State     — App state management
 *  3. Toast     — Notification system
 *  4. Offline   — Network connectivity handling
 *  5. Nav       — Navigation & scroll behavior
 *  6. Reveal    — Scroll-triggered reveal animations
 *  7. CharCount — Textarea character counter
 *  8. API       — OpenAI Moderation API integration
 *  9. Render    — Results rendering engine
 * 10. Actions   — Copy, flag, new analysis
 * 11. Init      — Bootstrap
 */

/* ──────────────────────────────────────────────────────────────
   1. DOM — Central element registry
   ────────────────────────────────────────────────────────────── */
   const DOM = {
    get app()              { return document.getElementById('app'); },
    get offlineBanner()    { return document.getElementById('offline-banner'); },
    get toastContainer()   { return document.getElementById('toast-container'); },
    get textInput()        { return document.getElementById('text-input'); },
    get charCurrent()      { return document.getElementById('char-current'); },
    get charCounter()      { return document.getElementById('char-counter'); },
    get analyzeBtn()       { return document.getElementById('analyze-btn'); },
    get clearBtn()         { return document.getElementById('clear-btn'); },
    get skeletonLoader()   { return document.getElementById('skeleton-loader'); },
    get resultsSection()   { return document.getElementById('results'); },
    get resultsContent()   { return document.getElementById('results-content'); },
    get verdictCard()      { return document.getElementById('verdict-card'); },
    get verdictIcon()      { return document.getElementById('verdict-icon'); },
    get verdictTitle()     { return document.getElementById('verdict-title'); },
    get verdictSubtitle()  { return document.getElementById('verdict-subtitle'); },
    get verdictBadge()     { return document.getElementById('verdict-badge'); },
    get analyzedText()     { return document.getElementById('analyzed-text'); },
    get scoresList()       { return document.getElementById('scores-list'); },
    get copyReportBtn()    { return document.getElementById('copy-report-btn'); },
    get flagBtn()          { return document.getElementById('flag-btn'); },
    get newAnalysisBtn()   { return document.getElementById('new-analysis-btn'); },
    get navHeader()        { return document.querySelector('.nav-header'); },
  };
  
  /* ──────────────────────────────────────────────────────────────
     2. STATE — Centralized app state
     ────────────────────────────────────────────────────────────── */
  const State = {
    isAnalyzing: false,
    lastResults: null,
    lastInputText: '',
    isOnline: navigator.onLine,
  };
  
  /* ──────────────────────────────────────────────────────────────
     3. TOAST — Professional notification system
     ────────────────────────────────────────────────────────────── */
  const Toast = (() => {
    const ICONS = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
      error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    };
  
    /**
     * Show a toast notification.
     * @param {string} message
     * @param {'success'|'error'|'info'|'warning'} type
     * @param {number} duration - Duration in ms (default: 4000)
     */
    function show(message, type = 'info', duration = 4000) {
      const el = document.createElement('div');
      el.className = `toast toast--${type}`;
      el.setAttribute('role', 'status');
      el.innerHTML = `${ICONS[type] || ''}<span>${message}</span>`;
      DOM.toastContainer.appendChild(el);
  
      // Auto-remove
      const removeTimer = setTimeout(() => dismiss(el), duration);
  
      // Click-to-dismiss
      el.addEventListener('click', () => {
        clearTimeout(removeTimer);
        dismiss(el);
      });
    }
  
    function dismiss(el) {
      el.classList.add('toast--exit');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }
  
    return { show };
  })();
  
  /* ──────────────────────────────────────────────────────────────
     4. OFFLINE — Network connectivity watcher
     ────────────────────────────────────────────────────────────── */
  const Offline = (() => {
    function updateBanner(isOnline) {
      State.isOnline = isOnline;
      const banner = DOM.offlineBanner;
      if (!isOnline) {
        banner.hidden = false;
        // Force reflow to trigger transition
        banner.offsetHeight;
        banner.classList.add('is-visible');
        Toast.show('No internet connection — Results may be unavailable', 'warning', 6000);
      } else {
        banner.classList.remove('is-visible');
        banner.addEventListener('transitionend', () => {
          banner.hidden = true;
        }, { once: true });
        Toast.show('Connection restored', 'success', 3000);
      }
    }
  
    function init() {
      window.addEventListener('online',  () => updateBanner(true));
      window.addEventListener('offline', () => updateBanner(false));
  
      // Check initial state
      if (!navigator.onLine) {
        updateBanner(false);
      }
    }
  
    return { init };
  })();
  
  /* ──────────────────────────────────────────────────────────────
     5. NAV — Header scroll & active state
     ────────────────────────────────────────────────────────────── */
  const Nav = (() => {
    let scrolled = false;
  
    function handleScroll() {
      const shouldBeScrolled = window.scrollY > 20;
      if (shouldBeScrolled !== scrolled) {
        scrolled = shouldBeScrolled;
        DOM.navHeader.classList.toggle('scrolled', scrolled);
      }
    }
  
    function init() {
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
    }
  
    return { init };
  })();
  
  /* ──────────────────────────────────────────────────────────────
     6. REVEAL — Intersection observer for scroll animations
     ────────────────────────────────────────────────────────────── */
  const Reveal = (() => {
    let observer = null;
  
    function init() {
      const items = document.querySelectorAll('.reveal-item');
      if (!items.length) return;
  
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target); // Animate once
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
      );
  
      items.forEach((item) => observer.observe(item));
    }
  
    // Re-run reveal for dynamically added elements
    function observeNew(elements) {
      if (!observer) init();
      elements.forEach((el) => {
        if (el.classList.contains('reveal-item')) observer.observe(el);
      });
    }
  
    return { init, observeNew };
  })();
  
  /* ──────────────────────────────────────────────────────────────
     7. CHAR COUNT — Character counter with visual feedback
     ────────────────────────────────────────────────────────────── */
  const CharCount = (() => {
    const MAX = typeof CONFIG !== 'undefined' ? CONFIG.MAX_CHARACTERS : 5000;
    const WARN_THRESHOLD   = Math.floor(MAX * 0.8);  // 80% = 4000
    const DANGER_THRESHOLD = Math.floor(MAX * 0.96); // 96% = 4800
  
    function update() {
      const len = DOM.textInput.value.length;
      DOM.charCurrent.textContent = len;
  
      const counter = DOM.charCounter;
      counter.classList.remove('is-warning', 'is-critical');
  
      if (len >= DANGER_THRESHOLD) {
        counter.classList.add('is-critical');
      } else if (len >= WARN_THRESHOLD) {
        counter.classList.add('is-warning');
      }
  
      // Show/hide clear button
      DOM.clearBtn.hidden = len === 0;
    }
  
    function init() {
      DOM.textInput.addEventListener('input', update);
      update(); // Initial state
    }
  
    return { init };
  })();
  
  /* ──────────────────────────────────────────────────────────────
     8. API — OpenAI Moderation API integration
     Endpoint: POST https://api.openai.com/v1/moderations
     Model:    omni-moderation-latest
     Docs:     https://platform.openai.com/docs/api-reference/moderations
     Cost:     FREE — moderation endpoint has no token charge.
     ────────────────────────────────────────────────────────────── */
  const API = (() => {
    /**
     * Fetches content moderation scores from OpenAI Moderation API.
     * Uses async/await with AbortController for timeout control.
     *
     * OpenAI response shape (results[0].category_scores):
     * {
     *   hate, hate/threatening,
     *   harassment, harassment/threatening,
     *   self-harm, self-harm/intent, self-harm/instructions,
     *   sexual, sexual/minors,
     *   violence, violence/graphic,
     *   illicit, illicit/violent
     * }
     * All values are floats 0.0–1.0.
     *
     * @param {string} text - The text to analyze
     * @returns {Promise<Object>} Raw API response
     * @throws {Error} With user-friendly message on failure
     */
    async function analyzeText(text) {
      // — Validate config
      if (typeof CONFIG === 'undefined') {
        throw new Error('Configuration not loaded. Please check config.js.');
      }
      if (!CONFIG.OPENAI_API_KEY || CONFIG.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
        throw new Error('API key not configured. Open config.js and add your OpenAI API key.');
      }
  
      // — Validate input
      const trimmed = text.trim();
      if (!trimmed) {
        throw new Error('Please enter some text to analyze.');
      }
      if (trimmed.length > CONFIG.MAX_CHARACTERS) {
        throw new Error(`Text too long. Maximum ${CONFIG.MAX_CHARACTERS.toLocaleString()} characters.`);
      }
  
      // — Check connectivity
      if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network and try again.');
      }
  
      // — Build request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
  
      const payload = {
        model: CONFIG.OPENAI_MODEL,
        input: trimmed,
      };
  
      let response;
      try {
        response = await fetch(CONFIG.OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new Error('Request timed out. The server took too long to respond.');
        }
        throw new Error('Network error. Please check your connection and try again.');
      } finally {
        clearTimeout(timeoutId);
      }
  
      // — Handle HTTP errors
      if (!response.ok) {
        let errorMsg = `API error (${response.status})`;
        try {
          const errorData = await response.json();
          const apiMessage = errorData?.error?.message;
          if (response.status === 400) errorMsg = apiMessage || 'Invalid request. Try analyzing different text.';
          else if (response.status === 401)  errorMsg = 'Invalid API key. Check your OpenAI key in config.js.';
          else if (response.status === 403)  errorMsg = 'Access denied. Ensure your OpenAI account is active.';
          else if (response.status === 429)  errorMsg = 'Rate limit exceeded. Please wait a moment and try again.';
          else if (response.status === 500)  errorMsg = 'OpenAI server error. Please try again shortly.';
          else if (apiMessage)               errorMsg = apiMessage;
        } catch (_) { /* Ignore JSON parse error on error body */ }
        throw new Error(errorMsg);
      }
  
      const data = await response.json();
  
      // — Validate response structure
      if (!data.results || !data.results[0]?.category_scores) {
        throw new Error('Unexpected response format from OpenAI API.');
      }
  
      return data;
    }
  
    /**
     * Parses raw OpenAI Moderation response into a normalized results object.
     *
     * We map OpenAI's 13 categories into 6 display groups:
     *   hate            → hate + hate/threatening (max)
     *   harassment      → harassment + harassment/threatening (max)
     *   selfHarm        → self-harm + self-harm/intent + self-harm/instructions (max)
     *   sexual          → sexual + sexual/minors (max)
     *   violence        → violence + violence/graphic (max)
     *   illicit         → illicit + illicit/violent (max)
     *
     * Scores are multiplied by 100 and rounded for display as percentages.
     *
     * @param {Object} data - Raw OpenAI Moderation API response
     * @param {string} inputText - Original analyzed text
     * @returns {Object} Normalized results object
     */
    function parseResponse(data, inputText) {
      const result  = data.results[0];
      const cs      = result.category_scores;   // raw 0.0–1.0 floats
      const flagged = result.flagged;           // overall boolean flag from OpenAI
  
      // Helper: convert float to rounded integer percentage
      const pct = (val) => (val != null ? Math.round(val * 100) : 0);
  
      // Helper: max of multiple keys
      const maxOf = (...keys) => Math.max(...keys.map((k) => cs[k] ?? 0));
  
      const scores = {
        hate:       pct(maxOf('hate', 'hate/threatening')),
        harassment: pct(maxOf('harassment', 'harassment/threatening')),
        selfHarm:   pct(maxOf('self-harm', 'self-harm/intent', 'self-harm/instructions')),
        sexual:     pct(maxOf('sexual', 'sexual/minors')),
        violence:   pct(maxOf('violence', 'violence/graphic')),
        illicit:    pct(maxOf('illicit', 'illicit/violent')),
      };
  
      // Overall risk = max across all display scores
      const overallScore = Math.max(...Object.values(scores));
  
      return {
        text: inputText,
        scores,
        overallScore,
        flaggedByApi: flagged,   // OpenAI's own binary verdict
        timestamp: new Date().toISOString(),
      };
    }
  
    return { analyzeText, parseResponse };
  })();
  
  /* ──────────────────────────────────────────────────────────────
     9. RENDER — Results rendering engine
     ────────────────────────────────────────────────────────────── */
  const Render = (() => {
    /**
     * Category display configuration — mapped to OpenAI Moderation categories.
     * Keys match the `scores` object returned by API.parseResponse().
     */
    const CATEGORIES = [
      { key: 'hate',        label: 'Hate Speech',       icon: '🚫' },
      { key: 'harassment',  label: 'Harassment',         icon: '⚠️' },
      { key: 'violence',    label: 'Violence',            icon: '🚨' },
      { key: 'sexual',      label: 'Sexual Content',      icon: '🔞' },
      { key: 'selfHarm',    label: 'Self-Harm',           icon: '🛑' },
      { key: 'illicit',     label: 'Illicit Activity',    icon: '⛔' },
    ];
  
    /** Returns color class based on score value */
    function colorClass(score) {
      if (score < 30) return 'safe';
      if (score <= 70) return 'warn';
      return 'danger';
    }
  
    /** Determines overall verdict from score */
    function getVerdict(score) {
      if (score < 30) return {
        level: 'safe',
        icon: '✓',
        title: 'Content Appears Safe',
        subtitle: 'No significant harmful content was detected in this text.',
        badgeText: 'LOW RISK',
        badgeClass: 'badge-safe',
        cardClass: 'is-safe',
        iconClass: 'icon-safe',
      };
      if (score <= 70) return {
        level: 'warn',
        icon: '!',
        title: 'Potentially Concerning',
        subtitle: 'Some content may be considered harmful or offensive by certain audiences.',
        badgeText: 'MODERATE RISK',
        badgeClass: 'badge-warn',
        cardClass: 'is-warn',
        iconClass: 'icon-warn',
      };
      return {
        level: 'hate',
        icon: '✕',
        title: 'Harmful Content Detected',
        subtitle: 'This text contains content flagged as harmful, toxic, or hateful.',
        badgeText: 'HIGH RISK',
        badgeClass: 'badge-danger',
        cardClass: 'is-hate',
        iconClass: 'icon-hate',
      };
    }
  
    /** Truncates text with ellipsis for display */
    function truncate(str, max = 280) {
      return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
    }
  
    /** Escapes HTML entities to prevent XSS */
    function escapeHtml(str) {
      const div = document.createElement('div');
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
    }
  
    /** Animates a progress bar from 0 to target value */
    function animateBar(fillEl, valueEl, targetValue, color) {
      // Small delay to allow the DOM to be ready for transitions
      requestAnimationFrame(() => {
        setTimeout(() => {
          fillEl.style.width = `${targetValue}%`;
          fillEl.className = `score-bar-fill color-${color}`;
          valueEl.className = `score-value color-${color}`;
        }, 80);
      });
    }
  
    /** Renders the full results view */
    function renderResults(results) {
      State.lastResults = results;
      const { text, scores, overallScore } = results;
      const verdict = getVerdict(overallScore);
  
      // ─ Verdict Card
      DOM.verdictCard.className = `verdict-card glass-card ${verdict.cardClass}`;
      DOM.verdictIcon.className = `verdict-icon ${verdict.iconClass}`;
      DOM.verdictIcon.textContent = verdict.icon;
      DOM.verdictTitle.textContent = verdict.title;
      DOM.verdictSubtitle.textContent = verdict.subtitle;
      DOM.verdictBadge.className = `verdict-badge ${verdict.badgeClass}`;
      DOM.verdictBadge.textContent = verdict.badgeText;
  
      // ─ Snippet
      DOM.analyzedText.textContent = truncate(text);
  
      // ─ Scores List
      DOM.scoresList.innerHTML = '';
      CATEGORIES.forEach(({ key, label, icon }) => {
        const score = scores[key];
        if (score === null) return;
  
        const color = colorClass(score);
        const item  = document.createElement('div');
        item.className = 'score-item';
        item.setAttribute('role', 'listitem');
        item.innerHTML = `
          <div class="score-meta">
            <span class="score-name">
              <span class="score-icon" aria-hidden="true">${icon}</span>
              ${escapeHtml(label)}
            </span>
            <span class="score-value" aria-label="${label}: ${score} percent">${score}%</span>
          </div>
          <div class="score-bar-track" role="progressbar" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100" aria-label="${label} score">
            <div class="score-bar-fill" style="width: 0%"></div>
          </div>
        `;
        DOM.scoresList.appendChild(item);
  
        // Animate bar after append
        const fillEl  = item.querySelector('.score-bar-fill');
        const valueEl = item.querySelector('.score-value');
        animateBar(fillEl, valueEl, score, color);
      });
    }
  
    return { renderResults };
  })();
  
  /* ──────────────────────────────────────────────────────────────
     10. ACTIONS — Button handlers: analyze, copy, flag, new
     ────────────────────────────────────────────────────────────── */
  const Actions = (() => {
    /** Sets analyze button to loading state */
    function setLoadingState(isLoading) {
      State.isAnalyzing = isLoading;
      const btn = DOM.analyzeBtn;
      btn.disabled = isLoading;
      btn.classList.toggle('is-loading', isLoading);
    }
  
    /** Scrolls smoothly to the results section */
    function scrollToResults() {
      DOM.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  
    /** Formats results as a plain-text report for copying */
    function buildTextReport(results) {
      if (!results) return '';
      const { text, scores, overallScore, flaggedByApi, timestamp } = results;
      const lines = [
        '═══════════════════════════════════════',
        '  CLEARTEXT ANALYSIS REPORT',
        `  Date: ${new Date(timestamp).toLocaleString()}`,
        '═══════════════════════════════════════',
        '',
        'ANALYZED TEXT:',
        text.length > 300 ? text.slice(0, 300) + '…' : text,
        '',
        `OVERALL RISK SCORE:  ${overallScore}%`,
        `FLAGGED BY OPENAI:   ${flaggedByApi ? 'YES ⚠️' : 'NO ✓'}`,
        '',
        'CATEGORY BREAKDOWN:',
        `  Hate Speech:       ${scores.hate        ?? 'N/A'}%`,
        `  Harassment:        ${scores.harassment  ?? 'N/A'}%`,
        `  Violence:          ${scores.violence    ?? 'N/A'}%`,
        `  Sexual Content:    ${scores.sexual      ?? 'N/A'}%`,
        `  Self-Harm:         ${scores.selfHarm    ?? 'N/A'}%`,
        `  Illicit Activity:  ${scores.illicit     ?? 'N/A'}%`,
        '',
        'Powered by ClearText + OpenAI Moderation API',
        'cleartext.app',
      ];
      return lines.join('\n');
    }
  
    /** Main analysis flow */
    async function handleAnalyze() {
      if (State.isAnalyzing) return;
  
      const text = DOM.textInput.value;
  
      // — Client-side validation
      if (!text.trim()) {
        Toast.show('Please enter some text before analyzing.', 'warning');
        DOM.textInput.focus();
        return;
      }
  
      setLoadingState(true);
  
      // Show skeleton, hide previous results
      DOM.resultsSection.hidden = false;
      DOM.skeletonLoader.hidden = false;
      DOM.resultsContent.hidden = true;
      scrollToResults();
  
      try {
        const rawData = await API.analyzeText(text);
        const results = API.parseResponse(rawData, text);
  
        // Hide skeleton, show results with animation
        DOM.skeletonLoader.hidden = true;
        DOM.resultsContent.hidden = false;
        DOM.resultsSection.classList.add('fade-in');
        DOM.resultsSection.addEventListener('animationend', () => {
          DOM.resultsSection.classList.remove('fade-in');
        }, { once: true });
  
        Render.renderResults(results);
        State.lastInputText = text;
  
        // Small delay then scroll to results content
        setTimeout(scrollToResults, 100);
  
      } catch (err) {
        // Hide skeleton on error
        DOM.skeletonLoader.hidden = true;
        DOM.resultsSection.hidden = true;
  
        Toast.show(err.message || 'An unexpected error occurred.', 'error', 6000);
        console.error('[ClearText API Error]', err);
      } finally {
        setLoadingState(false);
      }
    }
  
    /** Copies formatted report to clipboard */
    async function handleCopyReport() {
      if (!State.lastResults) {
        Toast.show('No results to copy yet.', 'info');
        return;
      }
  
      const report = buildTextReport(State.lastResults);
  
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(report);
        } else {
          // Fallback for non-HTTPS environments
          const ta = document.createElement('textarea');
          ta.value = report;
          ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        Toast.show('Report copied to clipboard!', 'success');
  
        // Visual feedback on button
        const btn = DOM.copyReportBtn;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span>Copied!</span>`;
        setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
  
      } catch (err) {
        Toast.show('Could not copy to clipboard. Try manually.', 'error');
      }
    }
  
    /** Handles "Flag for Review" button */
    function handleFlag() {
      if (!State.lastResults) {
        Toast.show('No content to flag yet.', 'info');
        return;
      }
  
      // In a real app, this would POST to a review endpoint.
      // For demo: visual feedback + toast.
      const btn = DOM.flagBtn;
      btn.disabled = true;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span>Flagged</span>`;
      btn.style.color = '#f87171';
      btn.style.borderColor = 'rgba(239,68,68,0.4)';
  
      Toast.show('Content flagged for human review.', 'success');
  
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 4000);
    }
  
    /** Resets to input state for a new analysis */
    function handleNewAnalysis() {
      DOM.resultsSection.hidden = true;
      DOM.resultsContent.hidden = true;
      DOM.skeletonLoader.hidden = true;
      State.lastResults = null;
  
      // Scroll to analyze section
      document.getElementById('analyze').scrollIntoView({ behavior: 'smooth', block: 'center' });
  
      // Focus the textarea
      setTimeout(() => {
        DOM.textInput.focus();
      }, 600);
    }
  
    /** Clears the textarea */
    function handleClear() {
      DOM.textInput.value = '';
      DOM.textInput.dispatchEvent(new Event('input'));
      DOM.textInput.focus();
    }
  
    function init() {
      DOM.analyzeBtn.addEventListener('click',      handleAnalyze);
      DOM.copyReportBtn.addEventListener('click',   handleCopyReport);
      DOM.flagBtn.addEventListener('click',         handleFlag);
      DOM.newAnalysisBtn.addEventListener('click',  handleNewAnalysis);
      DOM.clearBtn.addEventListener('click',        handleClear);
  
      // Allow Ctrl+Enter / Cmd+Enter to trigger analysis from textarea
      DOM.textInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleAnalyze();
        }
      });
    }
  
    return { init };
  })();
  
  /* ──────────────────────────────────────────────────────────────
     11. INIT — Bootstrap the application
     ────────────────────────────────────────────────────────────── */
  (function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
      bootstrap();
    }
  
    function bootstrap() {
      // Initialize all modules
      Offline.init();
      Nav.init();
      Reveal.init();
      CharCount.init();
      Actions.init();
  
      // Log welcome message for developers
      console.log(
        '%cClearText %cv1.0.0',
        'color: #5b8ef0; font-weight: bold; font-size: 14px;',
        'color: #9494b8; font-size: 12px;'
      );
      console.log('%cPowered by OpenAI Moderation API — https://platform.openai.com/docs/guides/moderation', 'color: #5a5a7a; font-size: 11px;');
    }
  })();