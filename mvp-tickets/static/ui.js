// Dark mode toggle
(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem("theme");
  if(saved){ if(saved==="dark") root.classList.add("dark"); }
  else if(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches){
    root.classList.add("dark");
  }
  document.addEventListener("click",e=>{
    const t=e.target.closest("#theme-toggle"); if(!t) return;
    root.classList.toggle("dark");
    localStorage.setItem("theme", root.classList.contains("dark")?"dark":"light");
  });
})();

// HTMX indicator (if HTMX exists)
(function(){
  const ind=document.createElement("div");
  ind.id="hx-indicator";
  ind.style.cssText="position:fixed;bottom:1rem;right:1rem;padding:.5rem .75rem;border-radius:.75rem;border:1px solid rgba(148,163,184,.35);background:rgba(255,255,255,.9)";
  ind.textContent="Cargando…"; ind.hidden=true; document.body.appendChild(ind);
  document.body.setAttribute("hx-indicator","#hx-indicator");
  document.addEventListener("htmx:beforeRequest",()=>{ind.hidden=false;});
  document.addEventListener("htmx:afterOnLoad",()=>{ind.hidden=true;});
  document.addEventListener("htmx:responseError",()=>{ind.hidden=true;});
})();
// Auto-upgrade de formularios y tablas
(function(){
  const busyButtons = new WeakMap();
  const BUSY_TIMEOUT = 8000;

  const isClassless = (element) => {
    const cls = element.getAttribute('class');
    return !cls || cls.trim().length === 0;
  };

  const forEachMatch = (root, selector, callback) => {
    if (!root) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(selector)) {
      callback(root);
    }
    const matches = root.querySelectorAll ? root.querySelectorAll(selector) : [];
    matches.forEach(callback);
  };

  const upgradeControls = (root) => {
    forEachMatch(root, 'input:not([type="hidden"])', (input) => {
      if (isClassless(input) && !input.classList.contains('input')) {
        input.classList.add('input');
      }
    });
    forEachMatch(root, 'select', (select) => {
      if (isClassless(select) && !select.classList.contains('input')) {
        select.classList.add('input');
      }
    });
    forEachMatch(root, 'textarea', (textarea) => {
      if (isClassless(textarea) && !textarea.classList.contains('input')) {
        textarea.classList.add('input');
      }
    });
    forEachMatch(root, 'button[type="submit"]', (button) => {
      if (isClassless(button)) {
        button.classList.add('btn', 'btn-primary');
      }
    });
  };

  const upgradeTables = (root) => {
    forEachMatch(root, 'table', (table) => {
      if (isClassless(table) && !table.classList.contains('table')) {
        table.classList.add('table');
      }
      table.querySelectorAll('th').forEach((cell) => {
        if (isClassless(cell) && !cell.classList.contains('th')) {
          cell.classList.add('th');
        }
      });
      table.querySelectorAll('td').forEach((cell) => {
        if (isClassless(cell) && !cell.classList.contains('td')) {
          cell.classList.add('td');
        }
      });
    });
  };

  const markButtonBusy = (button) => {
    if (!button || button.disabled) {
      return;
    }
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    const timeoutId = window.setTimeout(() => {
      if (busyButtons.has(button)) {
        releaseButton(button);
      }
    }, BUSY_TIMEOUT);
    busyButtons.set(button, timeoutId);
  };

  const releaseButton = (button) => {
    const timeoutId = busyButtons.get(button);
    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId);
    }
    busyButtons.delete(button);
    button.disabled = false;
    button.removeAttribute('aria-busy');
  };

  const upgrade = (root) => {
    upgradeControls(root);
    upgradeTables(root);
  };

  document.addEventListener('DOMContentLoaded', () => {
    upgrade(document);
  });

  document.addEventListener('htmx:afterSwap', (event) => {
    upgrade(event.detail && event.detail.target ? event.detail.target : document);
  });

  document.addEventListener('htmx:load', (event) => {
    upgrade(event.target || document);
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }
    const submitter = event.submitter && event.submitter instanceof HTMLElement ? event.submitter : form.querySelector('button[type="submit"]');
    if (submitter && submitter.matches('button[type="submit"]')) {
      markButtonBusy(submitter);
    }
  }, true);

  const handleHtmxRelease = (event) => {
    const config = event.detail && event.detail.requestConfig;
    if (!config) {
      return;
    }
    const submitter = config.submitter;
    if (submitter && busyButtons.has(submitter)) {
      releaseButton(submitter);
    }
  };

  document.addEventListener('htmx:afterRequest', handleHtmxRelease);
  document.addEventListener('htmx:responseError', handleHtmxRelease);
})();
