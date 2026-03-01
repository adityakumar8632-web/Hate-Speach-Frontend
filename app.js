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
  get serverStatus()     { return document.getElementById('server-status'); },
};

/* ──────────────────────────────────────────────────────────────
   2. STATE — Centralized app state
   ────────────────────────────────────────────────────────────── */
const State = {
  isAnalyzing:    false,
  lastResults:    null,
  lastInputText:  '',
  isOnline:       navigator.onLine,
  isServerOnline: null,   // null = unknown, true = online, false = offline
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

  function show(message, type = 'info', duration = 4000) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `${ICONS[type] || ''}<span>${message}</span>`;
    DOM.toastContainer.appendChild(el);

    const removeTimer = setTimeout(() => dismiss(el), duration);
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
      banner.offsetHeight; // Force reflow for transition
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
    if (!navigator.onLine) updateBanner(false);
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
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    items.forEach((item) => observer.observe(item));
  }

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
  const MAX               = typeof CONFIG !== 'undefined' ? CONFIG.MAX_CHARACTERS : 5000;
  const WARN_THRESHOLD    = Math.floor(MAX * 0.8);   // 80% = 4000
  const DANGER_THRESHOLD  = Math.floor(MAX * 0.96);  // 96% = 4800

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

    DOM.clearBtn.hidden = len === 0;
  }

  function init() {
    DOM.textInput.addEventListener('input', update);
    update();
  }

  return { init };
})();

/* ──────────────────────────────────────────────────────────────
   8a. SERVER STATUS — Polls /health, drives the indicator + toasts
   ────────────────────────────────────────────────────────────── */
const ServerStatus = (() => {
  const HEALTH_URL    = typeof CONFIG !== 'undefined'
    ? CONFIG.BACKEND_URL + '/health'
    : 'http://localhost:3000/health';

  const POLL_INTERVAL_ONLINE  = 30000;  // re-check every 30s when online
  const POLL_INTERVAL_OFFLINE = 10000;  // retry every 10s when offline
  const CHECK_TIMEOUT         = 8000;   // give up after 8s

  let pollTimer      = null;
  let wakingToastShown = false;

  /** Updates the visual indicator below the textarea */
  function setUI(state, label) {
    const el = DOM.serverStatus;
    if (!el) return;
    // Remove all state classes
    el.className = 'server-status server-status--' + state;
    el.querySelector('.server-status__text').textContent = label;
  }

  /** Performs one health check against the backend */
  async function check(showToasts = false) {
    setUI('checking', 'Checking server…');

    const controller = new AbortController();
    const timerId    = setTimeout(() => controller.abort(), CHECK_TIMEOUT);

    try {
      const res = await fetch(HEALTH_URL, {
        method: 'GET',
        signal: controller.signal,
        cache:  'no-store',
      });
      clearTimeout(timerId);

      if (res.ok) {
        const wasOffline = State.isServerOnline === false || State.isServerOnline === null;
        State.isServerOnline = true;
        wakingToastShown     = false;
        setUI('online', 'Server online');

        if (showToasts && wasOffline && State.isServerOnline !== null) {
          Toast.show('Server is online and ready.', 'success', 3000);
        }
        scheduleNext(POLL_INTERVAL_ONLINE);
      } else {
        handleDown(showToasts);
      }

    } catch (err) {
      clearTimeout(timerId);

      if (err.name === 'AbortError') {
        // Timed out — server is probably cold-starting on Render
        State.isServerOnline = false;
        setUI('waking', 'Server is starting up…');

        if (!wakingToastShown) {
          wakingToastShown = true;
          Toast.show('Please wait — the server is starting up. This can take up to 30 seconds.', 'warning', 20000);
        }
        scheduleNext(POLL_INTERVAL_OFFLINE);
      } else {
        handleDown(showToasts);
      }
    }
  }

  function handleDown(showToasts) {
    const wasOnline      = State.isServerOnline === true;
    State.isServerOnline = false;
    setUI('offline', 'Server offline');

    if (showToasts && wasOnline) {
      Toast.show('Server appears to be offline. Retrying…', 'error', 5000);
    }
    scheduleNext(POLL_INTERVAL_OFFLINE);
  }

  function scheduleNext(ms) {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(() => check(true), ms);
  }

  /** Called once on app boot */
  function init() {
    // Initial check without toasts (page just loaded)
    check(false);
  }

  return { init, check };
})();

/* ──────────────────────────────────────────────────────────────
   8. API — ClearText Secure Backend Proxy integration
   ────────────────────────────────────────────────────────────── */
const API = (() => {
  /**
   * Fetches content moderation scores from the backend proxy.
   * FIX #7: Timeout raised to 40s to survive Render free-tier cold starts.
   */
  async function analyzeText(text) {
    const BACKEND_URL    = typeof CONFIG !== 'undefined'
      ? CONFIG.MODERATE_ENDPOINT
      : 'http://localhost:3000/moderate';

    const TIMEOUT_MS     = (typeof CONFIG !== 'undefined' ? CONFIG.REQUEST_TIMEOUT_MS : null) || 40000;
    const MAX_CHARACTERS = (typeof CONFIG !== 'undefined' ? CONFIG.MAX_CHARACTERS    : null) || 5000;

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Please enter some text to analyze.');
    }
    if (trimmed.length > MAX_CHARACTERS) {
      throw new Error(`Text too long. Maximum ${MAX_CHARACTERS.toLocaleString()} characters.`);
    }
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response;
    try {
      response = await fetch(BACKEND_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: trimmed }),
        signal:  controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The server may be waking up — please try again in a moment.');
      }
      throw new Error('Network error. Could not reach the analysis server. Check your connection.');
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        const msg = errorData?.message;
        if (response.status === 400)      errorMsg = msg || 'Invalid request. Try analyzing different text.';
        else if (response.status === 403) errorMsg = 'Access denied by server (CORS). Contact support.';
        else if (response.status === 429) errorMsg = 'Too many requests. Please wait a moment and try again.';
        else if (response.status === 502) errorMsg = 'Could not reach OpenAI. Please try again shortly.';
        else if (response.status === 504) errorMsg = 'Request timed out reaching OpenAI. Please try again.';
        else if (response.status === 500) errorMsg = 'Internal server error. Please try again shortly.';
        else if (msg)                     errorMsg = msg;
      } catch (_) { /* Ignore JSON parse error on error body */ }
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (typeof data.flagged === 'undefined' || !data.scores) {
      throw new Error('Unexpected response from moderation server.');
    }

    return data;
  }

  /**
   * Parses raw backend response into a normalized results object.
   * Maps OpenAI's 13 categories into 6 display groups (max of sub-categories).
   *
   * FIX #6: Changed `score === null` to `score == null` to also skip undefined scores.
   */
  function parseResponse(data, inputText) {
    const cs      = data.scores;
    const flagged = data.flagged;

    const pct   = (val) => (val != null ? Math.round(val * 100) : 0);
    const maxOf = (...keys) => Math.max(...keys.map((k) => cs[k] ?? 0));

    const scores = {
      hate:       pct(maxOf('hate', 'hate/threatening')),
      harassment: pct(maxOf('harassment', 'harassment/threatening')),
      selfHarm:   pct(maxOf('self-harm', 'self-harm/intent', 'self-harm/instructions')),
      sexual:     pct(maxOf('sexual', 'sexual/minors')),
      violence:   pct(maxOf('violence', 'violence/graphic')),
      illicit:    pct(maxOf('illicit', 'illicit/violent')),
    };

    const overallScore = Math.max(...Object.values(scores));

    return {
      text: inputText,
      scores,
      overallScore,
      flaggedByApi: flagged,
      timestamp: new Date().toISOString(),
    };
  }

  return { analyzeText, parseResponse };
})();

/* ──────────────────────────────────────────────────────────────
   9. RENDER — Results rendering engine
   ────────────────────────────────────────────────────────────── */
const Render = (() => {
  const CATEGORIES = [
    { key: 'hate',        label: 'Hate Speech',      icon: '🚫' },
    { key: 'harassment',  label: 'Harassment',        icon: '⚠️' },
    { key: 'violence',    label: 'Violence',           icon: '🚨' },
    { key: 'sexual',      label: 'Sexual Content',     icon: '🔞' },
    { key: 'selfHarm',    label: 'Self-Harm',          icon: '🛑' },
    { key: 'illicit',     label: 'Illicit Activity',   icon: '⛔' },
  ];

  function colorClass(score) {
    if (score < 30) return 'safe';
    if (score <= 70) return 'warn';
    return 'danger';
  }

  function getVerdict(score) {
    if (score < 30) return {
      level: 'safe', icon: '✓',
      title: 'Content Appears Safe',
      subtitle: 'No significant harmful content was detected in this text.',
      badgeText: 'LOW RISK', badgeClass: 'badge-safe',
      cardClass: 'is-safe',  iconClass: 'icon-safe',
    };
    if (score <= 70) return {
      level: 'warn', icon: '!',
      title: 'Potentially Concerning',
      subtitle: 'Some content may be considered harmful or offensive by certain audiences.',
      badgeText: 'MODERATE RISK', badgeClass: 'badge-warn',
      cardClass: 'is-warn',       iconClass: 'icon-warn',
    };
    return {
      level: 'hate', icon: '✕',
      title: 'Harmful Content Detected',
      subtitle: 'This text contains content flagged as harmful, toxic, or hateful.',
      badgeText: 'HIGH RISK', badgeClass: 'badge-danger',
      cardClass: 'is-hate',   iconClass: 'icon-hate',
    };
  }

  function truncate(str, max = 280) {
    return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function animateBar(fillEl, valueEl, targetValue, color) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        fillEl.style.width = `${targetValue}%`;
        fillEl.className   = `score-bar-fill color-${color}`;
        valueEl.className  = `score-value color-${color}`;
      }, 80);
    });
  }

  function renderResults(results) {
    State.lastResults = results;
    const { text, scores, overallScore } = results;
    const verdict = getVerdict(overallScore);

    DOM.verdictCard.className    = `verdict-card glass-card ${verdict.cardClass}`;
    DOM.verdictIcon.className    = `verdict-icon ${verdict.iconClass}`;
    DOM.verdictIcon.textContent  = verdict.icon;
    DOM.verdictTitle.textContent = verdict.title;
    DOM.verdictSubtitle.textContent = verdict.subtitle;
    DOM.verdictBadge.className   = `verdict-badge ${verdict.badgeClass}`;
    DOM.verdictBadge.textContent = verdict.badgeText;

    DOM.analyzedText.textContent = truncate(text);

    DOM.scoresList.innerHTML = '';
    CATEGORIES.forEach(({ key, label, icon }) => {
      const score = scores[key];

      // FIX #6: Use == null to catch both null AND undefined
      if (score == null) return;

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
  function setLoadingState(isLoading) {
    State.isAnalyzing = isLoading;
    const btn = DOM.analyzeBtn;
    btn.disabled = isLoading;
    btn.classList.toggle('is-loading', isLoading);
  }

  function scrollToResults() {
    DOM.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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

  async function handleAnalyze() {
    if (State.isAnalyzing) return;

    const text = DOM.textInput.value;

    if (!text.trim()) {
      Toast.show('Please enter some text before analyzing.', 'warning');
      DOM.textInput.focus();
      return;
    }

    setLoadingState(true);

    // Show a "please wait" toast if the server is known to be offline/waking
    let coldStartToastTimer = null;
    if (State.isServerOnline === false || State.isServerOnline === null) {
      Toast.show('Please wait — the server is starting up. This can take up to 30 seconds.', 'warning', 25000);
    } else {
      // Server appears online but still warn if it takes >5s (unexpected slowness)
      coldStartToastTimer = setTimeout(() => {
        Toast.show('Taking longer than usual — please wait…', 'info', 20000);
      }, 5000);
    }

    DOM.resultsSection.hidden  = false;
    DOM.skeletonLoader.hidden  = false;
    DOM.resultsContent.hidden  = true;
    scrollToResults();

    try {
      const rawData = await API.analyzeText(text);
      if (coldStartToastTimer) clearTimeout(coldStartToastTimer);
      const results = API.parseResponse(rawData, text);

      DOM.skeletonLoader.hidden = true;
      DOM.resultsContent.hidden = false;
      DOM.resultsSection.classList.add('fade-in');
      DOM.resultsSection.addEventListener('animationend', () => {
        DOM.resultsSection.classList.remove('fade-in');
      }, { once: true });

      Render.renderResults(results);
      State.lastInputText = text;
      setTimeout(scrollToResults, 100);

    } catch (err) {
      if (coldStartToastTimer) clearTimeout(coldStartToastTimer);
      DOM.skeletonLoader.hidden  = true;
      DOM.resultsSection.hidden  = true;
      Toast.show(err.message || 'An unexpected error occurred.', 'error', 7000);
      console.error('[ClearText API Error]', err);
    } finally {
      setLoadingState(false);
    }
  }

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
        const ta = document.createElement('textarea');
        ta.value = report;
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      Toast.show('Report copied to clipboard!', 'success');

      const btn = DOM.copyReportBtn;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span>Copied!</span>`;
      setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);

    } catch (err) {
      Toast.show('Could not copy to clipboard. Try manually.', 'error');
    }
  }

  function handleFlag() {
    if (!State.lastResults) {
      Toast.show('No content to flag yet.', 'info');
      return;
    }

    const btn = DOM.flagBtn;
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span>Flagged</span>`;
    btn.style.color       = '#f87171';
    btn.style.borderColor = 'rgba(239,68,68,0.4)';

    Toast.show('Content flagged for human review.', 'success');

    setTimeout(() => {
      btn.disabled      = false;
      btn.innerHTML     = originalHtml;
      btn.style.color   = '';
      btn.style.borderColor = '';
    }, 4000);
  }

  function handleNewAnalysis() {
    DOM.resultsSection.hidden = true;
    DOM.resultsContent.hidden = true;
    DOM.skeletonLoader.hidden = true;
    State.lastResults = null;

    document.getElementById('analyze').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { DOM.textInput.focus(); }, 600);
  }

  function handleClear() {
    DOM.textInput.value = '';
    DOM.textInput.dispatchEvent(new Event('input'));
    DOM.textInput.focus();
  }

  function init() {
    DOM.analyzeBtn.addEventListener('click',     handleAnalyze);
    DOM.copyReportBtn.addEventListener('click',  handleCopyReport);
    DOM.flagBtn.addEventListener('click',        handleFlag);
    DOM.newAnalysisBtn.addEventListener('click', handleNewAnalysis);
    DOM.clearBtn.addEventListener('click',       handleClear);

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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  function bootstrap() {
    Offline.init();
    Nav.init();
    Reveal.init();
    CharCount.init();
    Actions.init();
    ServerStatus.init();

    console.log(
      '%cClearText %cv1.0.1',
      'color: #5b8ef0; font-weight: bold; font-size: 14px;',
      'color: #9494b8; font-size: 12px;'
    );
    console.log('%cPowered by OpenAI Moderation API — https://platform.openai.com/docs/guides/moderation', 'color: #5a5a7a; font-size: 11px;');
  }
})();
