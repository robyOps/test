// Tema oscuro con persistencia y sincronización con el sistema
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const ICONS = {
    dark: "bi-moon-stars",
    light: "bi-brightness-high"
  };

  function apply(mode) {
    const theme = mode === "dark" ? "dark" : "light";
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
    if (!toggle) return;
    const icon = toggle.querySelector("i");
    toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    toggle.setAttribute("aria-label", theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    toggle.title = theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
    if (icon) {
      icon.classList.remove(ICONS.dark, ICONS.light);
      icon.classList.add(ICONS[theme]);
    }
  }

  function currentPreference() {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    return media.matches ? "dark" : "light";
  }

  apply(currentPreference());

  media.addEventListener("change", (event) => {
    if (!localStorage.getItem("theme")) {
      apply(event.matches ? "dark" : "light");
    }
  });

  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = root.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem("theme", next);
      apply(next);
    });
  }
})();

// Indicador HTMX + aria-busy
(function () {
  const ind = document.createElement("div");
  ind.id = "hx-indicator";
  ind.textContent = "Cargando…";
  ind.hidden = true;
  document.body.appendChild(ind);
  document.body.setAttribute("hx-indicator", "#hx-indicator");
  document.addEventListener("htmx:beforeRequest", () => {
    ind.hidden = false;
    document.body.setAttribute("aria-busy", "true");
  });
  const hide = () => {
    ind.hidden = true;
    document.body.removeAttribute("aria-busy");
  };
  document.addEventListener("htmx:afterOnLoad", hide);
  document.addEventListener("htmx:responseError", hide);
})();

// Auto-upgrade visual sin tocar templates
(function () {
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function upgradeForms(root = document) {
    $$("input:not([type=\"checkbox\"]):not([type=\"radio\"]):not(.input)", root).forEach((el) => el.classList.add("input"));
    $$("select:not(.input)", root).forEach((el) => el.classList.add("input"));
    $$("textarea:not(.input)", root).forEach((el) => el.classList.add("input"));
    $$("button[type=\"submit\"]:not(.btn)", root).forEach((el) => el.classList.add("btn", "btn-primary"));
  }

  function upgradeTables(root = document) {
    $$("table:not(.table)", root).forEach((t) => {
      t.classList.add("table");
      $$("thead th", t).forEach((th) => th.classList.add("th"));
      $$("tbody td", t).forEach((td) => td.classList.add("td"));
    });
  }

  function safeSubmit(root = document) {
    $$("form", root).forEach((f) => {
      if (f.__bound) return;
      f.__bound = true;
      f.addEventListener("submit", () => {
        const btn = f.querySelector('button[type="submit"]');
        if (!btn) return;
        if (!btn.hasAttribute("aria-busy")) {
          btn.setAttribute("aria-busy", "true");
          btn.disabled = true;
          setTimeout(() => {
            if (btn.getAttribute("aria-busy") === "true") {
              btn.disabled = false;
              btn.removeAttribute("aria-busy");
            }
          }, 8000);
        }
      });
    });
  }

  function focusMode() {
    let tabbed = false;
    addEventListener("keydown", (e) => {
      if (e.key === "Tab" && !tabbed) {
        tabbed = true;
        document.body.classList.add("user-tabbed");
      }
    });
    addEventListener("mousedown", () => {
      if (tabbed) {
        tabbed = false;
        document.body.classList.remove("user-tabbed");
      }
    });
  }

  function lazyImgs(root = document) {
    $$("img:not([loading])", root).forEach((img) => {
      img.loading = "lazy";
      img.decoding = "async";
    });
  }

  function applyAll(root = document) {
    upgradeForms(root);
    upgradeTables(root);
    safeSubmit(root);
    lazyImgs(root);
  }

  if (document.readyState !== "loading") {
    applyAll();
    focusMode();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      applyAll();
      focusMode();
    });
  }

  document.addEventListener("htmx:afterSwap", (e) => applyAll(e.target));
})();
