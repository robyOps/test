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

// Auto-upgrade de formularios y tablas sin tocar templates
(function(){
  const q = (sel,root=document)=>Array.from(root.querySelectorAll(sel));

  function upgradeForms(root=document){
    q('input:not([type="checkbox"]):not([type="radio"]):not([class*="input"])', root)
      .forEach(el=>el.classList.add('input'));
    q('select:not([class*="input"])', root).forEach(el=>el.classList.add('input'));
    q('textarea:not([class*="input"])', root).forEach(el=>el.classList.add('input'));

    q('button[type="submit"]:not([class*="btn"])', root).forEach(el=>{
      el.classList.add('btn','btn-primary');
    });
  }

  function upgradeTables(root=document){
    q('table:not([class*="table"])', root).forEach(t=>{
      t.classList.add('table');
      q('thead th', t).forEach(th=>th.classList.add('th'));
      q('tbody td', t).forEach(td=>td.classList.add('td'));
    });
  }

  // Evita doble submit y muestra estado de carga
  function safeSubmits(root=document){
    q('form', root).forEach(form=>{
      if(form.__safeSubmitBound) return;
      form.__safeSubmitBound = true;
      form.addEventListener('submit', e=>{
        const btn = form.querySelector('button[type="submit"].btn') || form.querySelector('button[type="submit"]');
        if(btn && !btn.hasAttribute('aria-busy')){
          btn.setAttribute('aria-busy','true');
          btn.disabled = true;
          setTimeout(()=>{ 
            if(btn.getAttribute('aria-busy')==='true'){ btn.disabled=false; btn.removeAttribute('aria-busy'); }
          }, 8000);
        }
      });
    });
  }

  function applyAll(root=document){ upgradeForms(root); upgradeTables(root); safeSubmits(root); }

  if(document.readyState!=='loading') applyAll(); else document.addEventListener('DOMContentLoaded', applyAll);
  document.addEventListener('htmx:afterSwap', e=>applyAll(e.target));
})();

// ===== Stats / Cards (opt-in, no template rewrites obligatorios) =====
(function(){
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function fmt(n){ const v=Number(n); return Number.isFinite(v)? v.toLocaleString(): n; }

  function renderSparklines(root=document){
    $$('.stat-card[data-series]', root).forEach(card=>{
      if(card.__sparkBound) return; card.__sparkBound=true;
      const series = String(card.dataset.series||"").split(/[,;\s]+/).map(x=>Number(x)).filter(x=>Number.isFinite(x));
      if(!series.length) return;
      const w=240,h=42,p=2, max=Math.max(...series), min=Math.min(...series);
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`); svg.classList.add('spark');
      const path = document.createElementNS(svg.namespaceURI,'path');
      const norm = v=> h - p - ((v-min)/(max-min||1))*(h-2*p);
      const step = (w-2*p)/Math.max(series.length-1,1);
      let d=`M ${p} ${norm(series[0]||0)}`;
      series.forEach((v,i)=>{ if(i){ d+=` L ${p+i*step} ${norm(v)}`; } });
      path.setAttribute('d', d);
      path.setAttribute('fill','none'); path.setAttribute('stroke','currentColor'); path.setAttribute('stroke-width','2');
      const g=document.createElementNS(svg.namespaceURI,'g'); g.setAttribute('opacity','.8'); g.appendChild(path);
      svg.appendChild(g);
      card.querySelector('.spark')?.remove();
      card.appendChild(svg);
    });
  }

  function hydrateStats(root=document){
    $$('.stat-card', root).forEach(card=>{
      if(card.__hydrated) return; card.__hydrated=true;
      const key = card.dataset.key || card.getAttribute('aria-label') || 'Métrica';
      const val = card.dataset.value || card.textContent.trim();
      const delta = card.dataset.delta;
      const status = card.dataset.status;
      const progress = Number(card.dataset.progress);

      card.innerHTML = `
        <div class="k">${key}</div>
        <div class="v">${fmt(val)}</div>
        <div class="row" style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"></div>
      `;

      const row = card.querySelector('.row');
      if(delta){
        const dir = String(delta).trim().startsWith('-')?'down':'up';
        const d = document.createElement('span');
        d.className = `delta ${dir}`;
        d.innerHTML = `${dir==='up'?'▲':'▼'} ${delta}`;
        row.appendChild(d);
      }
      if(status){
        const b = document.createElement('span');
        b.className = `badge ${status}`;
        b.textContent = status.toUpperCase();
        row.appendChild(b);
      }
      if(Number.isFinite(progress)){
        const bar = document.createElement('div'); bar.className='progress';
        const i = document.createElement('i'); i.style.width = Math.max(0,Math.min(100,progress))+'%';
        bar.appendChild(i); card.appendChild(bar);
      }
      if(card.dataset.series){ const ph = document.createElement('div'); ph.className='spark'; card.appendChild(ph); }
    });
  }

  function applyAll(root=document){ hydrateStats(root); renderSparklines(root); }
  if(document.readyState!=='loading') applyAll(); else document.addEventListener('DOMContentLoaded', applyAll);
  document.addEventListener('htmx:afterSwap', e=>applyAll(e.target));
})();

// ===== Listas y estados: chips, acentos y filtros sin tocar templates =====
(function(){
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const norm=t=>String(t||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").trim();

  const STATE_MAP=[
    {keys:["abierto","open"], cls:"state-open", label:"Abierto", icon:"●"},
    {keys:["en progreso","in progress","progreso"], cls:"state-inprog", label:"En progreso", icon:"◐"},
    {keys:["pendiente","pending","en espera","waiting"], cls:"state-pending", label:"Pendiente", icon:"⏳"},
    {keys:["cerrado","closed","resuelto","resolved"], cls:"state-closed", label:"Cerrado", icon:"✔"}
  ];
  const PRI_MAP=[
    {keys:["alta","high","urgente","urgent","critico","critical","p1","sev1"], cls:"pri-high", label:"Alta"},
    {keys:["media","medium","normal","p2","sev2"], cls:"pri-med", label:"Media"},
    {keys:["baja","low","p3","sev3"], cls:"pri-low", label:"Baja"},
  ];

  function classify(text, map){
    const t=norm(text);
    for(const m of map){ if(m.keys.some(k=>t.includes(k))) return m; }
    return null;
  }

  function markHeaders(table){
    const ths=$$('thead th',table);
    ths.forEach(th=>{
      const t=norm(th.textContent);
      if(/estado|status/.test(t)) th.classList.add('is-col-state');
      if(/prioridad|priority/.test(t)) th.classList.add('is-col-priority');
    });
  }

  function enhanceTable(table){
    if(table.__enhanced) return; table.__enhanced=true;
    markHeaders(table);
    const headers=$$('thead th',table);
    const stateIdx=headers.findIndex(th=>th.classList.contains('is-col-state'));
    const priIdx=headers.findIndex(th=>th.classList.contains('is-col-priority'));

    $$('tbody tr',table).forEach(tr=>{
      tr.classList.add('row-accent');
      const tds=$$('td',tr);

      if(stateIdx>-1 && tds[stateIdx]){
        const td=tds[stateIdx];
        if(!td.querySelector('.state-chip')){
          const raw = td.dataset.status || td.textContent;
          const m = classify(raw, STATE_MAP);
          if(m){
            td.innerHTML = `<span class="state-chip ${m.cls}" aria-label="Estado">${m.icon} ${m.label}</span>`;
          }
        }
      }

      if(priIdx>-1 && tds[priIdx]){
        const td=tds[priIdx];
        const raw = td.dataset.priority || td.textContent;
        const m = classify(raw, PRI_MAP);
        if(m){
          tr.classList.add(m.cls);
          if(!td.querySelector('.chip')){
            td.innerHTML = `<span class="chip ${m.cls==='pri-high'?'chip-err':m.cls==='pri-med'?'chip-warn':'chip-ok'}">${m.label}</span>`;
          }
        }
      }
    });

    if(stateIdx>-1 && !table.__filtersAdded){
      table.__filtersAdded=true;
      const toolbar=document.createElement('div');
      toolbar.className='table-toolbar';
      const label=document.createElement('span'); label.textContent='Filtrar:';
      toolbar.appendChild(label);
      const allBtn=btn('Todos',()=>applyFilter(null));
      toolbar.appendChild(allBtn);
      STATE_MAP.forEach(s=>{
        const b=btn(s.label,()=>applyFilter(s.cls));
        toolbar.appendChild(b);
      });
      table.parentElement.insertBefore(toolbar, table);

      function btn(text, on){
        const b=document.createElement('button');
        b.type='button'; b.className='table-filter'; b.textContent=text;
        b.addEventListener('click', on); return b;
      }
      function applyFilter(cls){
        $$('tbody tr',table).forEach(tr=>{
          if(cls==null){ tr.hidden=false; return; }
          const td = stateIdx>-1 ? $$('td',tr)[stateIdx] : null;
          const has = td && td.querySelector(`.${cls}`);
          tr.hidden = !has;
        });
      }
    }
  }

  function applyAll(root=document){
    $$('table',root).forEach(enhanceTable);
  }

  if(document.readyState!=='loading') applyAll(); else document.addEventListener('DOMContentLoaded', applyAll);
  document.addEventListener('htmx:afterSwap', e=>applyAll(e.target));
})();
// ===== A11y & Performance helpers =====
(function(){
  // Focus visible solo cuando se navega con Tab
  let tabbed=false;
  window.addEventListener('keydown',e=>{
    if(e.key==='Tab' && !tabbed){ tabbed=true; document.body.classList.add('user-tabbed'); }
  });
  window.addEventListener('mousedown',()=>{ if(tabbed){ tabbed=false; document.body.classList.remove('user-tabbed'); } });

  // Skip link + landmark main sin tocar templates
  (function injectSkipLink(){
    const id='main-content';
    let main = document.querySelector('main,[role="main"]');
    if(!main){
      main=document.createElement('div'); main.id=id; main.setAttribute('role','main'); main.tabIndex=-1;
      document.body.insertBefore(main, document.body.firstChild);
    }else if(!main.id){ main.id=id; }
    const skip=document.createElement('a');
    skip.href='#'+main.id; skip.textContent='Saltar al contenido';
    skip.style.cssText='position:fixed;left:-999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:1000;background:#fff;padding:.5rem .75rem;border-radius:.5rem;border:1px solid #cbd5e1';
    skip.addEventListener('focus',()=>{skip.style.left='1rem'; skip.style.top='1rem'; skip.style.width='auto'; skip.style.height='auto';});
    skip.addEventListener('blur',()=>{skip.style.left='-999px'; skip.style.width='1px'; skip.style.height='1px';});
    document.body.insertBefore(skip, document.body.firstChild);
  })();

  // Marcar busy global y accesible durante HTMX
  document.addEventListener('htmx:beforeRequest',()=>{ document.body.setAttribute('aria-busy','true'); });
  document.addEventListener('htmx:afterOnLoad',()=>{ document.body.removeAttribute('aria-busy'); });
  document.addEventListener('htmx:responseError',()=>{ document.body.removeAttribute('aria-busy'); });

  // Lazy de imágenes existente sin tocar templates
  function lazyImages(root=document){
    root.querySelectorAll('img:not([loading])').forEach(img=>{ img.loading='lazy'; img.decoding='async'; });
  }

  // Tablas muy grandes: colapsar y expandir sin perder datos ni eventos
  function tameHugeTables(root=document){
    root.querySelectorAll('table').forEach(t=>{
      if(t.__tamed) return;
      const tb=t.tBodies && t.tBodies[0]; if(!tb) return;
      const rows=[...tb.rows]; const N=rows.length; const LIMIT=200;
      if(N<=LIMIT) return;
      t.__tamed=true;
      // Mantén primeras LIMIT filas
      rows.slice(LIMIT).forEach(r=>r.hidden=true);
      // Insertar control
      const ctrl=document.createElement('div');
      ctrl.style.cssText='text-align:center;margin:.5rem 0';
      const btn=document.createElement('button');
      btn.type='button'; btn.className='btn';
      btn.textContent=`Mostrar más (${N-LIMIT})`;
      btn.addEventListener('click',()=>{
        rows.slice(LIMIT).forEach(r=>r.hidden=false);
        btn.remove();
      });
      ctrl.appendChild(btn);
      t.parentElement.insertBefore(ctrl, t.nextSibling);
    });
  }

  // Progressive enhancement en idle y para fragmentos HTMX
  function applyAll(root=document){ lazyImages(root); tameHugeTables(root); }
  if('requestIdleCallback' in window){
    requestIdleCallback(()=>applyAll());
  }else{
    setTimeout(()=>applyAll(),0);
  }
  document.addEventListener('htmx:afterSwap', e=>applyAll(e.target));
})();
