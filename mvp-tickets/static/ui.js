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
// Stats / Cards (opt-in, no template rewrites obligatorios)
(function(){
  const SELECTOR = '.stat-card';
  const RELEVANT_KEYS = new Set(['key','value','delta','status','progress','series']);
  const STATUS_CLASS_MAP = {
    ok:'stat-badge-ok',
    good:'stat-badge-ok',
    ready:'stat-badge-ok',
    success:'stat-badge-ok',
    positive:'stat-badge-ok',
    warn:'stat-badge-warn',
    warning:'stat-badge-warn',
    caution:'stat-badge-warn',
    pending:'stat-badge-warn',
    hold:'stat-badge-warn',
    err:'stat-badge-err',
    error:'stat-badge-err',
    danger:'stat-badge-err',
    fail:'stat-badge-err',
    down:'stat-badge-err',
    info:'stat-badge-info',
    notice:'stat-badge-info',
    neutral:'stat-badge-neutral',
    default:'stat-badge-neutral'
  };
  const BADGE_VARIANTS = ['stat-badge-ok','stat-badge-warn','stat-badge-err','stat-badge-info','stat-badge-neutral'];
  const DELTA_VARIANTS = ['delta-positive','delta-negative','delta-neutral'];
  const cardStore = new WeakMap();

  const hasRelevantData = (card) => {
    const dataset = card.dataset || {};
    for(const key of Object.keys(dataset)){
      if(RELEVANT_KEYS.has(key)) return true;
    }
    return false;
  };

  const takeExistingChildren = (card) => {
    const existing = [];
    card.childNodes.forEach(node => {
      if(node.nodeType === Node.TEXT_NODE && !node.textContent.trim()){
        return;
      }
      existing.push(node);
    });
    existing.forEach(node => card.removeChild(node));
    return existing;
  };

  const buildCard = (card) => {
    const preserved = takeExistingChildren(card);
    const shell = document.createElement('div');
    shell.className = 'stat-shell';

    const head = document.createElement('div');
    head.className = 'stat-head';

    const keyEl = document.createElement('span');
    keyEl.className = 'k';
    head.appendChild(keyEl);

    const badge = document.createElement('span');
    badge.className = 'stat-badge';
    badge.hidden = true;
    head.appendChild(badge);

    shell.appendChild(head);

    const valueRow = document.createElement('div');
    valueRow.className = 'stat-value-row';

    const valueEl = document.createElement('span');
    valueEl.className = 'v';
    valueRow.appendChild(valueEl);

    const delta = document.createElement('span');
    delta.className = 'delta';
    delta.hidden = true;
    valueRow.appendChild(delta);

    shell.appendChild(valueRow);

    const foot = document.createElement('div');
    foot.className = 'stat-foot';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'stat-progress';
    progressWrap.hidden = true;

    const progressTrack = document.createElement('div');
    progressTrack.className = 'stat-progress-track';
    const progressBar = document.createElement('div');
    progressBar.className = 'stat-progress-bar';
    progressTrack.appendChild(progressBar);

    const progressValue = document.createElement('span');
    progressValue.className = 'stat-progress-value';

    progressWrap.append(progressTrack, progressValue);
    foot.appendChild(progressWrap);

    const sparkline = document.createElementNS('http://www.w3.org/2000/svg','svg');
    sparkline.setAttribute('class','stat-sparkline');
    sparkline.setAttribute('viewBox','0 0 120 36');
    sparkline.setAttribute('preserveAspectRatio','none');
    sparkline.hidden = true;

    const sparkArea = document.createElementNS('http://www.w3.org/2000/svg','path');
    const sparkLine = document.createElementNS('http://www.w3.org/2000/svg','polyline');
    sparkline.append(sparkArea, sparkLine);

    foot.appendChild(sparkline);
    shell.appendChild(foot);

    card.appendChild(shell);

    if(preserved.length){
      const extra = document.createElement('div');
      extra.className = 'stat-extra';
      preserved.forEach(node => extra.appendChild(node));
      card.appendChild(extra);
    }

    card.classList.add('stat-card--hydrated');

    const bundle = {shell, keyEl, badge, valueEl, delta, progressWrap, progressBar, progressValue, sparkline, sparkLine, sparkArea};
    cardStore.set(card, bundle);
    return bundle;
  };

  const ensureCard = (card) => cardStore.get(card) || buildCard(card);

  const pickStatusClass = (status) => {
    if(!status) return '';
    const normalized = status.toLowerCase().trim();
    return STATUS_CLASS_MAP[normalized] || STATUS_CLASS_MAP.default;
  };

  const parseSeries = (raw) => {
    if(!raw) return [];
    const trimmed = raw.trim();
    if(!trimmed) return [];
    if(trimmed.startsWith('[')){
      try{
        const arr = JSON.parse(trimmed);
        if(Array.isArray(arr)){
          return arr.map(Number).filter(Number.isFinite);
        }
      }catch(err){/* noop */}
    }
    return trimmed.split(/[\s,;|]+/).map(part => {
      const value = parseFloat(part.replace(/_/g,''));
      return Number.isFinite(value) ? value : NaN;
    }).filter(Number.isFinite);
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const renderSparkline = (values, nodes) => {
    if(values.length === 0){
      nodes.sparkline.hidden = true;
      return;
    }
    const points = values.length === 1 ? [values[0], values[0]] : values.slice();
    const width = 120;
    const height = 36;
    const padding = 4;
    const maxVal = Math.max(...points);
    const minVal = Math.min(...points);
    const range = maxVal - minVal || 1;
    const step = (width - padding * 2) / (points.length - 1 || 1);
    const graphHeight = height - padding * 2;
    const coords = points.map((value, index) => {
      const ratio = (value - minVal) / range;
      const x = padding + step * index;
      const y = height - padding - ratio * graphHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    nodes.sparkline.setAttribute('viewBox', `0 0 ${width} ${height}`);
    nodes.sparkLine.setAttribute('points', coords.join(' '));

    const lastX = padding + step * (points.length - 1);
    const areaPath = `M${padding} ${height - padding} ` + coords.map(point => `L ${point}`).join(' ') + ` L ${lastX.toFixed(2)} ${height - padding} Z`;
    nodes.sparkArea.setAttribute('d', areaPath);
    nodes.sparkline.hidden = false;
  };

  const updateCard = (card) => {
    if(!hasRelevantData(card)) return;
    const nodes = ensureCard(card);
    const dataset = card.dataset;

    nodes.keyEl.textContent = dataset.key || '';

    const value = dataset.value;
    nodes.valueEl.textContent = value !== undefined ? value : '';

    const badgeClass = pickStatusClass(dataset.status || '');
    nodes.badge.classList.remove(...BADGE_VARIANTS);
    if(dataset.status && dataset.status.trim()){
      nodes.badge.hidden = false;
      if(badgeClass){
        nodes.badge.classList.add(badgeClass);
      }
      nodes.badge.textContent = dataset.status;
    }else{
      nodes.badge.hidden = true;
      nodes.badge.textContent = '';
    }

    const deltaRaw = dataset.delta;
    nodes.delta.classList.remove(...DELTA_VARIANTS);
    if(deltaRaw && deltaRaw.trim()){
      const trimmed = deltaRaw.trim();
      const numeric = parseFloat(trimmed.replace(/,/g,'.'));
      let deltaClass = 'delta-neutral';
      let arrow = '';
      if(Number.isFinite(numeric)){
        if(numeric > 0){
          arrow = '▲';
          deltaClass = 'delta-positive';
        }else if(numeric < 0){
          arrow = '▼';
          deltaClass = 'delta-negative';
        }else{
          arrow = '—';
          deltaClass = 'delta-neutral';
        }
      }
      const magnitude = Number.isFinite(numeric) && /^[+\-]/.test(trimmed)
        ? trimmed.slice(1).trim() || Math.abs(numeric).toString()
        : trimmed;
      nodes.delta.textContent = arrow ? `${arrow} ${magnitude}`.trim() : magnitude;
      nodes.delta.classList.add(deltaClass);
      nodes.delta.hidden = false;
    }else{
      nodes.delta.hidden = true;
      nodes.delta.textContent = '';
    }

    const progressRaw = dataset.progress;
    if(progressRaw !== undefined && progressRaw !== ''){
      const numeric = parseFloat(String(progressRaw).replace(/,/g,'.'));
      if(Number.isFinite(numeric)){
        const valueClamped = clamp(numeric, 0, 100);
        nodes.progressBar.style.width = `${valueClamped}%`;
        const rounded = Math.round(valueClamped * 10) / 10;
        const formatted = Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
        nodes.progressValue.textContent = formatted;
        nodes.progressWrap.hidden = false;
      }else{
        nodes.progressWrap.hidden = true;
        nodes.progressBar.style.width = '0%';
        nodes.progressValue.textContent = '';
      }
    }else{
      nodes.progressWrap.hidden = true;
      nodes.progressBar.style.width = '0%';
      nodes.progressValue.textContent = '';
    }

    const seriesValues = parseSeries(dataset.series);
    if(seriesValues.length){
      renderSparkline(seriesValues, nodes);
    }else{
      nodes.sparkline.hidden = true;
    }
  };

  const hydrate = (root) => {
    const scope = root instanceof Element ? root : document;
    scope.querySelectorAll(SELECTOR).forEach(updateCard);
    if(scope instanceof Element && scope.matches && scope.matches(SELECTOR)){
      updateCard(scope);
    }
  };

  const onReady = () => hydrate(document);
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', onReady, {once:true});
  }else{
    onReady();
  }

  document.addEventListener('htmx:afterSwap', (event) => {
    const target = event.detail && event.detail.target ? event.detail.target : document;
    hydrate(target);
  });

  document.addEventListener('htmx:load', (event) => {
    hydrate(event.target || document);
  });

  const observerConfig = {
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['data-key','data-value','data-delta','data-status','data-progress','data-series']
  };

  const startObserver = () => {
    const body = document.body;
    if(!body) return;
    const observer = new MutationObserver((mutations) => {
      for(const mutation of mutations){
        if(mutation.type === 'attributes'){
          const target = mutation.target;
          if(target instanceof Element && target.matches(SELECTOR)){
            updateCard(target);
          }
        }
        if(mutation.type === 'childList'){
          mutation.addedNodes.forEach(node => {
            if(!(node instanceof Element)) return;
            if(node.matches && node.matches(SELECTOR)){
              updateCard(node);
            }else{
              hydrate(node);
            }
          });
        }
      }
    });
    observer.observe(body, observerConfig);
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', startObserver, {once:true});
  }else{
    startObserver();
  }
})();
