(function(){
  'use strict';

  const MODE_KEY = 'ui-theme-mode';
  const ACCENT_KEY = 'ui-theme-accent';
  const doc = document.documentElement;

  function applyMode(mode, persist = true) {
    if (mode === 'dark') {
      doc.classList.add('dark');
    } else {
      doc.classList.remove('dark');
      mode = 'light';
    }
    if (persist) {
      try { localStorage.setItem(MODE_KEY, mode); } catch (err) { /* ignore */ }
    }
    updateToggleState();
  }

  function preferredMode() {
    try {
      const stored = localStorage.getItem(MODE_KEY);
      if (stored) { return stored; }
    } catch (err) { /* ignore */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyAccent(theme, persist = true) {
    if (!theme) { return; }
    doc.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(ACCENT_KEY, theme); } catch (err) { /* ignore */ }
    }
  }

  function restorePreferences() {
    applyMode(preferredMode(), false);
    try {
      const savedTheme = localStorage.getItem(ACCENT_KEY);
      if (savedTheme) {
        applyAccent(savedTheme, false);
      } else if (!doc.dataset.theme) {
        doc.dataset.theme = 'default';
      }
    } catch (err) {
      if (!doc.dataset.theme) {
        doc.dataset.theme = 'default';
      }
    }
  }

  function updateToggleState() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    const isDark = doc.classList.contains('dark');
    toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    toggle.setAttribute('data-mode', isDark ? 'dark' : 'light');
    const label = isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    toggle.setAttribute('aria-label', label);
  }

  function setupModeToggle() {
    const prefers = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (prefers) {
      prefers.addEventListener('change', evt => {
        try {
          if (!localStorage.getItem(MODE_KEY)) {
            applyMode(evt.matches ? 'dark' : 'light', false);
          }
        } catch (err) {
          applyMode(evt.matches ? 'dark' : 'light', false);
        }
      });
    }

    document.addEventListener('click', event => {
      const toggle = event.target.closest('#theme-toggle');
      if (!toggle) return;
      event.preventDefault();
      const next = doc.classList.contains('dark') ? 'light' : 'dark';
      applyMode(next);
    });
  }

  function ensureIndicator() {
    if (!document.body || document.getElementById('hx-indicator')) return;
    const indicator = document.createElement('div');
    indicator.id = 'hx-indicator';
    indicator.textContent = 'Cargando…';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    indicator.hidden = true;
    indicator.classList.add('hidden');
    document.body.appendChild(indicator);
    document.body.setAttribute('hx-indicator', '#hx-indicator');
  }

  function handleHTMXIndicators() {
    ensureIndicator();
    const indicator = document.getElementById('hx-indicator');
    const body = document.body;
    if (!indicator || !body) return;

    const show = () => {
      indicator.hidden = false;
      indicator.classList.remove('hidden');
      body.setAttribute('aria-busy', 'true');
    };
    const hide = () => {
      indicator.hidden = true;
      indicator.classList.add('hidden');
      body.removeAttribute('aria-busy');
    };

    document.addEventListener('htmx:beforeRequest', show);
    document.addEventListener('htmx:afterOnLoad', hide);
    document.addEventListener('htmx:afterRequest', hide);
    document.addEventListener('htmx:responseError', hide);
  }

  function autoEnhance(root) {
    upgradeInputs(root);
    upgradeButtons(root);
    upgradeTables(root);
  }

  function upgradeInputs(root = document) {
    const selector = 'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not(.input), textarea:not(.input), select:not(.input)';
    root.querySelectorAll(selector).forEach(el => {
      el.classList.add('input');
    });
  }

  function upgradeButtons(root = document) {
    root.querySelectorAll('button').forEach(btn => {
      if (!btn.classList.contains('btn')) {
        btn.classList.add('btn');
      }
      if (btn.type === 'submit' && !btn.classList.contains('btn-primary')) {
        btn.classList.add('btn-primary');
      }
    });
    root.querySelectorAll('a[role="button"]:not(.btn)').forEach(link => {
      link.classList.add('btn', 'btn-ghost');
    });
  }

  function upgradeTables(root = document) {
    root.querySelectorAll('table').forEach(table => {
      if (!table.classList.contains('table')) {
        table.classList.add('table');
      }
      table.querySelectorAll('thead th').forEach(th => {
        th.classList.add('th');
      });
      table.querySelectorAll('tbody td').forEach(td => {
        td.classList.add('td');
      });
    });
  }

  const pendingButtons = new Set();

  function lockButton(btn) {
    if (!btn || pendingButtons.has(btn)) return;
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    pendingButtons.add(btn);
    window.setTimeout(() => releaseButton(btn), 8000);
  }

  function releaseButton(btn) {
    if (!btn || !pendingButtons.has(btn)) return;
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    pendingButtons.delete(btn);
  }

  function safeSubmits(root = document) {
    root.querySelectorAll('form').forEach(form => {
      if (form.dataset.uiSafeSubmit) return;
      form.dataset.uiSafeSubmit = 'true';
      form.addEventListener('submit', event => {
        const submitter = event.submitter || form.querySelector('button[type="submit"]');
        lockButton(submitter);
      });
      form.addEventListener('reset', () => {
        pendingButtons.forEach(releaseButton);
      });
    });
  }

  function initSubmitReleaseListeners() {
    document.addEventListener('htmx:afterRequest', () => {
      pendingButtons.forEach(releaseButton);
    });
    document.addEventListener('htmx:responseError', () => {
      pendingButtons.forEach(releaseButton);
    });
  }

  function lazyImages(root = document) {
    root.querySelectorAll('img').forEach(img => {
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
  }

  function initThemePicker(root = document) {
    root.querySelectorAll('[data-theme-picker]').forEach(el => {
      if (el.dataset.uiThemePickerBound) return;
      el.dataset.uiThemePickerBound = 'true';
      if (el.tagName === 'SELECT') {
        el.value = doc.dataset.theme || 'default';
        el.addEventListener('change', () => applyAccent(el.value));
      } else {
        el.addEventListener('click', evt => {
          const target = evt.target.closest('[data-theme-value]');
          if (!target) return;
          evt.preventDefault();
          applyAccent(target.getAttribute('data-theme-value'));
        });
      }
    });
  }

  function initHTMXHooks() {
    document.addEventListener('htmx:afterSwap', event => {
      const root = event.target;
      autoEnhance(root);
      safeSubmits(root);
      lazyImages(root);
      initThemePicker(root);
    });
  }

  function onReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', cb);
    } else {
      cb();
    }
  }

  restorePreferences();
  setupModeToggle();
  initSubmitReleaseListeners();
  initHTMXHooks();

  onReady(() => {
    ensureIndicator();
    handleHTMXIndicators();
    autoEnhance(document);
    safeSubmits(document);
    lazyImages(document);
    initThemePicker(document);
    updateToggleState();
  });
})();
