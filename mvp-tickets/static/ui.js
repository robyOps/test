// Tema oscuro con persistencia
(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem("theme");
  if(saved==="dark"||(!saved&&matchMedia("(prefers-color-scheme: dark)").matches)) root.classList.add("dark");
  document.addEventListener("click",e=>{
    if(!e.target.closest("#theme-toggle")) return;
    root.classList.toggle("dark");
    localStorage.setItem("theme", root.classList.contains("dark")?"dark":"light");
  });
})();

// Indicador HTMX + aria-busy
(function(){
  const ind=document.createElement("div");
  ind.id="hx-indicator";
  ind.style.cssText="position:fixed;bottom:1rem;right:1rem;padding:.5rem .75rem;border-radius:10px;border:1px solid rgba(148,163,184,.35);background:rgba(255,255,255,.95);z-index:60";
  ind.textContent="Cargando…"; ind.hidden=true; document.body.appendChild(ind);
  document.body.setAttribute("hx-indicator","#hx-indicator");
  document.addEventListener("htmx:beforeRequest",()=>{ind.hidden=false;document.body.setAttribute("aria-busy","true")});
  document.addEventListener("htmx:afterOnLoad",()=>{ind.hidden=true;document.body.removeAttribute("aria-busy")});
  document.addEventListener("htmx:responseError",()=>{ind.hidden=true;document.body.removeAttribute("aria-busy")});
})();

// Auto-upgrade visual sin tocar templates
(function(){
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  function upgradeForms(root=document){
    $$("input:not([type=\"checkbox\"]):not([type=\"radio\"]):not(.input)",root).forEach(el=>el.classList.add('input'));
    $$("select:not(.input)",root).forEach(el=>el.classList.add('input'));
    $$("textarea:not(.input)",root).forEach(el=>el.classList.add('input'));
    $$("button[type=\"submit\"]:not(.btn)",root).forEach(el=>el.classList.add('btn','btn-primary'));
  }
  function upgradeTables(root=document){
    $$("table:not(.table)",root).forEach(t=>{
      t.classList.add('table'); $$("thead th",t).forEach(th=>th.classList.add('th')); $$("tbody td",t).forEach(td=>td.classList.add('td'));
    });
  }
  function safeSubmit(root=document){
    $$("form",root).forEach(f=>{
      if(f.__bound) return; f.__bound=true;
      f.addEventListener('submit',()=>{
        const btn=f.querySelector('button[type="submit"]'); if(!btn) return;
        if(!btn.hasAttribute('aria-busy')){ btn.setAttribute('aria-busy','true'); btn.disabled=true;
          setTimeout(()=>{ if(btn.getAttribute('aria-busy')==='true'){ btn.disabled=false; btn.removeAttribute('aria-busy'); } },8000);
        }
      });
    });
  }
  function focusMode(){
    let tabbed=false;
    addEventListener('keydown',e=>{ if(e.key==='Tab'&&!tabbed){ tabbed=true; document.body.classList.add('user-tabbed'); }});
    addEventListener('mousedown',()=>{ if(tabbed){ tabbed=false; document.body.classList.remove('user-tabbed'); }});
  }
  function lazyImgs(root=document){ $$("img:not([loading])",root).forEach(img=>{img.loading='lazy';img.decoding='async';}); }

  function applyAll(root=document){ upgradeForms(root); upgradeTables(root); safeSubmit(root); lazyImgs(root); }
  if(document.readyState!=='loading') { applyAll(); focusMode(); } else {
    document.addEventListener('DOMContentLoaded',()=>{ applyAll(); focusMode(); });
  }
  document.addEventListener('htmx:afterSwap',e=>applyAll(e.target));
})();
