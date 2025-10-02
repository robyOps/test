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
