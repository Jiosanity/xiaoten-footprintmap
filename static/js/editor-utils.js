(function(){
  // 简单 DOM 辅助函数，供后续重构使用
  function q(sel, ctx){ return (ctx||document).querySelector(sel); }
  function qAll(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }
  function el(tag, attrs, children){
    const d = document.createElement(tag);
    if(attrs){ Object.keys(attrs).forEach(k=>{ if(k==='style'){ Object.assign(d.style, attrs[k]); } else if(k in d){ d[k]=attrs[k]; } else { d.setAttribute(k, attrs[k]); } }); }
    if(children){ (Array.isArray(children)?children:[children]).forEach(c=>{ if(typeof c==='string') d.appendChild(document.createTextNode(c)); else if(c) d.appendChild(c); }); }
    return d;
  }
  function on(elOrSel, event, handler, opts){
    const el = (typeof elOrSel === 'string') ? q(elOrSel) : elOrSel;
    if(el) el.addEventListener(event, handler, opts);
  }
  window.EditorUtils = { q, qAll, el, on };
})();
