(function(){
  // 轻量状态管理器，保持与现有全局变量兼容
  const state = {
    locations: [],
    photosTemp: [],
    editingIndex: null,
    sortByDate: false,
    pruneEmpty: true,
    importAutoSort: false,
    defaultCategories: ['常驻','旅行','游记'],
    selectedCategories: new Set(),
    selectedMarkerColor: ''
  };

  // 订阅系统
  const _subs = [];
  function subscribe(fn){ if(typeof fn==='function'){ _subs.push(fn); return ()=>{ const i=_subs.indexOf(fn); if(i>=0) _subs.splice(i,1); }; } return ()=>{}; }
  function _notify(payload){ _subs.forEach(fn=>{ try{ fn(payload); }catch(e){} }); }

  function persistDraft(){
    try{ localStorage.setItem('footprintmap_builder_locations', JSON.stringify(state.locations || [])); }catch(e){}
    // 更新导入偏好
    try{ localStorage.setItem('footprintmap_builder_importAutoSort', state.importAutoSort ? 'true':'false'); }catch(e){}
    // 在持久化后自动重新生成 JSON 并通知订阅者
    try{ const text = generateJson(); _notify({ type: 'persist', text }); }catch(e){}
  }

  function loadDraft(){
    try{ const v = localStorage.getItem('footprintmap_builder_locations'); return v ? JSON.parse(v) : null; }catch(e){ return null; }
  }

  function setImportAutoSort(val){ state.importAutoSort = !!val; try{ localStorage.setItem('footprintmap_builder_importAutoSort', state.importAutoSort? 'true':'false'); }catch(e){} }
  function getImportAutoSort(){ try{ return localStorage.getItem('footprintmap_builder_importAutoSort') === 'true' || !!state.importAutoSort; }catch(e){ return !!state.importAutoSort; } }

  // state 操作 API
  function getState(){ return state; }
  function setState(partial){ Object.assign(state, partial || {}); // keep refs
    // sync some globals for compatibility
    syncGlobals();
  }
  function syncGlobals(){
    try{
      window.locations = state.locations;
      window.photosTemp = state.photosTemp;
      window.editingIndex = state.editingIndex;
      window.sortByDate = state.sortByDate;
      window.pruneEmpty = state.pruneEmpty;
      window.importAutoSort = state.importAutoSort;
      window.defaultCategories = state.defaultCategories;
      window.selectedCategories = state.selectedCategories;
      window.selectedMarkerColor = state.selectedMarkerColor;
    }catch(e){}
  }

  function setLocations(arr){ state.locations = Array.isArray(arr) ? arr : []; syncGlobals(); }
  function pushLocation(item){ state.locations.push(item); syncGlobals(); }
  function updateLocation(idx, item){ if(typeof idx==='number' && state.locations[idx]){ state.locations[idx]=item; syncGlobals(); } }
  function removeLocation(idx){ if(typeof idx==='number' && state.locations[idx]){ state.locations.splice(idx,1); syncGlobals(); } }

  // 生成 JSON 并通知订阅者（render/UI 层可订阅以获得更新）
  function generateJson(){
    const locations = (state.locations || []).map(l=> ({ ...l }));
    let exportLocations = locations;
    if(state.sortByDate){
      exportLocations = exportLocations.slice().sort((a,b)=>{
        const da = Date.parse(a.date||'');
        const db = Date.parse(b.date||'');
        if(isNaN(da) && isNaN(db)) return 0;
        if(isNaN(da)) return 1;
        if(isNaN(db)) return -1;
        return db - da;
      });
    }
    if(state.pruneEmpty){
      exportLocations = exportLocations.map(obj=>{
        const cleaned = { name: obj.name, coordinates: obj.coordinates };
        ['description','date','url','urlLabel','photos','categories','markerColor'].forEach(k=>{
          const v = obj[k];
          if(v===undefined || v===null) return;
          if(typeof v==='string' && v.trim()==='') return;
          if(Array.isArray(v) && v.length===0) return;
          cleaned[k]=v;
        });
        return cleaned;
      });
    }
    const obj = { locations: exportLocations };
    const text = JSON.stringify(obj, null, 2);
    // 若页面存在 jsonOutput 元素（按 id 查找），则更新其内容
    try{ const el = document.getElementById && document.getElementById('jsonOutput'); if(el) el.textContent = text; }
    catch(e){}
    _notify({ text, obj });
    return text;
  }

  // 初始化：恢复本地草稿或加载示例数据
  async function init(){
    try{
      const draft = loadDraft();
      if(draft){ state.locations = draft; }
      // 恢复导入偏好
      state.importAutoSort = getImportAutoSort();
      // 将状态同步到全局（兼容现有代码）
      syncGlobals();
      // 如果无草稿，尝试加载示例数据（非阻塞）
      if((!draft || !Array.isArray(draft) || draft.length===0)){
        try{
          const resp = await fetch('static/data/footprints.example.json');
          if(resp && resp.ok){ const data = await resp.json(); if(data && Array.isArray(data.locations) && data.locations.length>0){ state.locations = data.locations.slice(); syncGlobals(); persistDraft(); } }
        }catch(e){ /* ignore sample fetch errors */ }
      }
      // 通知订阅者 state 已准备好
      _notify({ type:'init', state: getState() });
    }catch(e){ console.error('EditorState.init error', e); }
  }

  // 在脚本加载时自动初始化（非阻塞）
  setTimeout(()=>{ try{ init(); }catch(e){} }, 0);

  // 导出 API
  window.EditorState = { persistDraft, loadDraft, setImportAutoSort, getImportAutoSort, generateJson, subscribe, getState, setState, setLocations, pushLocation, updateLocation, removeLocation, init };
  // 兼容老代码使用的函数名（保留全局简洁接口）
  window.persistDraft = persistDraft;
  window.generateJson = generateJson;
  // 同步初始 globals
  syncGlobals();
})();
