(function(){
  // 绑定事件与初始化流程（依赖 editor.html 中的全局变量与其他模块）
  function init(){
    try{
      // 元素引用（假设在全局已定义）
      const form = window.form || document.getElementById('locationForm');
      const photosListEl = window.photosListEl || document.getElementById('photosList');
      const photoInput = window.photoInput || document.getElementById('photoInput');
      const locationListEl = window.locationListEl || document.getElementById('locationList');
      const jsonOutput = window.jsonOutput || document.getElementById('jsonOutput');

      // 图片输入按 Enter 添加
      if(photoInput){
        photoInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); if(window.addPhotoUrl) window.addPhotoUrl(); } });
      }

      // 添加图片按钮
      const addPhotoBtn = document.getElementById('addPhotoBtn');
      if(addPhotoBtn) addPhotoBtn.addEventListener('click', ()=>{ if(window.addPhotoUrl) window.addPhotoUrl(); });

      // 表单提交
      if(form){
        form.addEventListener('submit', e=>{
          e.preventDefault();
          const name = document.getElementById('name').value.trim();
          const description = document.getElementById('description').value.trim();
          const date = document.getElementById('date').value.trim();
          const coordinates = document.getElementById('coordinates').value.trim();
          const markerColor = document.getElementById('markerColor').value.trim();
          const categories = (window.getSelectedCategories && window.getSelectedCategories()) || [];
          const url = document.getElementById('url').value.trim();
          const urlLabel = document.getElementById('urlLabel').value.trim();
          const draftObj = { name, coordinates, description, date, url, urlLabel, photos:[...(window.photosTemp||[])], categories, markerColor };

          const errs = (window.collectErrors) ? window.collectErrors(draftObj) : [];
          if(window.showErrors) window.showErrors(errs);
          if(window.clearInvalidHighlights) window.clearInvalidHighlights();
          if(window.applyInvalidHighlights) window.applyInvalidHighlights(draftObj);
          if(errs.length) return;

          const editingIndex = (window.EditorState && typeof window.EditorState.getState === 'function') ? (window.EditorState.getState().editingIndex) : window.editingIndex;
          if(editingIndex !== null && editingIndex !== undefined){
            if(window.EditorState && typeof window.EditorState.updateLocation === 'function'){
              window.EditorState.updateLocation(editingIndex, draftObj);
              if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ editingIndex: null });
            } else {
              try{
                if(typeof locations !== 'undefined'){
                  const arr = locations.slice(); arr[editingIndex] = draftObj;
                  if(window.EditorState && typeof window.EditorState.setState === 'function'){
                    window.EditorState.setState({ locations: arr, editingIndex: null });
                  } else {
                    window.locations = arr; window.editingIndex = null;
                  }
                } else {
                  const _arr0 = [draftObj];
                  if(window.EditorState && typeof window.EditorState.setState === 'function'){
                    window.EditorState.setState({ locations: _arr0, editingIndex: null });
                  } else {
                    window.locations = _arr0; window.editingIndex = null;
                  }
                }
              }catch(e){
                try{
                  const arr = (window.locations && Array.isArray(window.locations)) ? window.locations.slice() : [];
                  arr[editingIndex] = draftObj;
                  if(window.EditorState && typeof window.EditorState.setState === 'function'){
                    window.EditorState.setState({ locations: arr, editingIndex: null });
                  } else {
                    window.locations = arr; window.editingIndex = null;
                  }
                }catch(e2){ window.locations = window.locations || []; window.locations[editingIndex] = draftObj; window.editingIndex = null; }
              }
            }
            const submitBtnEl = document.getElementById('submitBtn'); if(submitBtnEl) submitBtnEl.textContent = '✚ 添加地点';
            const cancelEl = document.getElementById('cancelEditBtn'); if(cancelEl) cancelEl.style.display = 'none';
          } else {
            try{
              if(window.EditorState && typeof window.EditorState.pushLocation === 'function'){
                window.EditorState.pushLocation(draftObj);
              } else if(typeof locations !== 'undefined'){
                try{ const arr = locations.slice(); arr.push(draftObj); if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ locations: arr }); } else { window.locations = arr; } }catch(e){}
              } else {
                try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ locations: [draftObj] }); } else { window.locations = [draftObj]; } }catch(e){ window.locations = [draftObj]; }
              }
            }catch(e){}
          }

          try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ photosTemp: [] }); } else { window.photosTemp = []; } }catch(e){ window.photosTemp = []; }
          if(window.renderPhotosTemp) window.renderPhotosTemp();
          if(form) form.reset();
          if(window.renderLocations) window.renderLocations();
          if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft();
          if(window.updateMarkerSelection) window.updateMarkerSelection();
          try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ selectedCategories: new Set() }); } else { window.selectedCategories = new Set(); } }catch(e){ window.selectedCategories = new Set(); }
          if(window.renderCategoryOptions) window.renderCategoryOptions();

          setTimeout(()=>{
            const items = locationListEl.querySelectorAll('.location-item');
            if(items.length>0) items[items.length-1].scrollIntoView({ behavior:'smooth', block:'nearest' });
          }, 100);
        });
      }

      // 重置/取消
      const resetFormBtn = document.getElementById('resetFormBtn');
      if(resetFormBtn) resetFormBtn.addEventListener('click', ()=>{ if(window.resetForm) window.resetForm(); });
      const cancelEditBtn = document.getElementById('cancelEditBtn');
      if(cancelEditBtn) cancelEditBtn.addEventListener('click', ()=>{
        try{
          if(window.EditorState && typeof window.EditorState.setState === 'function'){
            window.EditorState.setState({ editingIndex: null, selectedMarkerColor: '', selectedCategories: new Set() });
          } else {
            window.editingIndex = null;
            window.selectedMarkerColor = '';
            window.selectedCategories = new Set();
          }
        }catch(e){
          window.editingIndex = null; window.selectedMarkerColor = ''; window.selectedCategories = new Set();
        }
        if(window.resetForm) window.resetForm(); if(window.showErrors) window.showErrors([]);
        if(document.getElementById('markerColor')) document.getElementById('markerColor').value='';
        if(window.renderCategoryOptions) window.renderCategoryOptions();
        if(window.updateMarkerSelection) window.updateMarkerSelection();
        const submitBtnEl = document.getElementById('submitBtn'); if(submitBtnEl) submitBtnEl.textContent = '✚ 添加地点'; cancelEditBtn.style.display='none';
      });

      // 清空所有
      const clearAllBtn = document.getElementById('clearAllBtn');
      if(clearAllBtn) clearAllBtn.addEventListener('click', ()=>{
        if(!confirm('确定清空所有地点?')) return;
        try{
          if(window.EditorState && typeof window.EditorState.setLocations === 'function'){
            window.EditorState.setLocations([]);
          } else {
            const arr = [];
            if(window.EditorState && typeof window.EditorState.setState === 'function'){
              window.EditorState.setState({ locations: arr });
            } else {
              window.locations = arr;
            }
          }
        }catch(e){ window.locations = []; }
        if(window.renderLocations) window.renderLocations();
        if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft();
        if(window.EditorPreview && window._previewHandle && typeof window._previewHandle.renderFromText === 'function'){
          try{ window._previewHandle.renderFromText(JSON.stringify({ locations: [] })); }catch(e){}
        }
      });

      // 删除最后一个
      const removeLastBtn = document.getElementById('removeLastBtn');
      if(removeLastBtn) removeLastBtn.addEventListener('click', ()=>{
        try{
          if(window.EditorState && typeof window.EditorState.getState === 'function'){
            const s = window.EditorState.getState(); const lastIdx = (s.locations && s.locations.length) ? s.locations.length - 1 : -1; if(lastIdx>=0){ if(window.EditorState && typeof window.EditorState.removeLocation === 'function') window.EditorState.removeLocation(lastIdx); }
          } else if(typeof locations !== 'undefined'){
            try{ const arr = locations.slice(); arr.pop(); if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: arr }); else window.locations = arr; }catch(e){}
          }
        }catch(e){}
        if(window.renderLocations) window.renderLocations(); if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft();
        setTimeout(()=>{ const items = locationListEl.querySelectorAll('.location-item'); if(items.length>0) items[items.length-1].scrollIntoView({ behavior:'smooth', block:'nearest' }); },80);
      });

      // 导出/复制/下载/排序开关
      const generateBtn = document.getElementById('generateBtn');
      if(generateBtn) generateBtn.addEventListener('click', ()=>{ const t = (window.generateJson) ? window.generateJson() : null; if(window._previewHandle && window._previewHandle.renderFromText && t) window._previewHandle.renderFromText(t); });
      const copyBtn = document.getElementById('copyBtn'); if(copyBtn) copyBtn.addEventListener('click', ()=>{ if(!jsonOutput.textContent){ alert('请先生成 JSON'); return; } navigator.clipboard.writeText(jsonOutput.textContent).then(()=> alert('已复制到剪贴板')); });
      const downloadBtn = document.getElementById('downloadBtn'); if(downloadBtn) downloadBtn.addEventListener('click', ()=>{ if(!jsonOutput.textContent){ alert('请先生成 JSON'); return; } const blob = new Blob([jsonOutput.textContent], { type:'application/json' }); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='footprints.generated.json'; a.click(); URL.revokeObjectURL(a.href); });
      const toggleSortDateBtn = document.getElementById('toggleSortDateBtn'); if(toggleSortDateBtn) toggleSortDateBtn.addEventListener('click', ()=>{ window.sortByDate = !window.sortByDate; toggleSortDateBtn.textContent = window.sortByDate ? '关闭按日期排序' : '开启按日期排序'; if(window.generateJson) window.generateJson(); });

      // 刷新预览
      const refreshPreviewBtn = document.getElementById('refreshPreviewBtn');
      if(refreshPreviewBtn) refreshPreviewBtn.addEventListener('click', ()=>{
        const t = (window.generateJson) ? window.generateJson() : null;
        const fallback = JSON.stringify({ locations: (window.EditorState && typeof window.EditorState.getState === 'function') ? (window.EditorState.getState().locations || []) : (window.locations || []) });
        if(window._previewHandle && window._previewHandle.renderFromText) window._previewHandle.renderFromText(t || fallback);
      });

      // 批量删除按钮
      const deleteSelectedBtn = document.createElement('button'); deleteSelectedBtn.type='button'; deleteSelectedBtn.className='danger'; deleteSelectedBtn.textContent='批量删除选中';
      deleteSelectedBtn.addEventListener('click', ()=>{
        const selectedIdx = []; locationListEl.querySelectorAll('.location-item').forEach((el,i)=>{ const cb = el.querySelector('.loc-select'); if(cb && cb.checked) selectedIdx.push(i); });
        if(!selectedIdx.length){ alert('未选择任何地点'); return; }
        if(!confirm('确定删除选中的 '+ selectedIdx.length +' 个地点?')) return;
        selectedIdx.sort((a,b)=>b-a).forEach(idx=>{
          try{
            if(window.EditorState && typeof window.EditorState.removeLocation === 'function'){
              window.EditorState.removeLocation(idx);
            } else if(typeof locations !== 'undefined'){
              const arr = locations.slice(); arr.splice(idx,1); if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: arr }); else window.locations = arr;
            }
          }catch(e){}
        });
        if(window.renderLocations) window.renderLocations(); if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft();
      });
      const deleteBtnWrap = document.createElement('div'); deleteBtnWrap.style.marginBottom='18px'; deleteBtnWrap.appendChild(deleteSelectedBtn);
      locationListEl.insertAdjacentElement('beforebegin', deleteBtnWrap);

      // 导入文件
      const importFile = document.getElementById('importFile');
      if(importFile) importFile.addEventListener('change', e=>{
        const file = e.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = ()=>{
          try{
            const data = JSON.parse(reader.result);
            if(Array.isArray(data.locations)){
              if(window.EditorState && typeof window.EditorState.pushLocation === 'function'){
                data.locations.forEach(l=>{ if(l.name && l.coordinates){ try{ window.EditorState.pushLocation(l); }catch(e){} } });
              } else {
                try{
                  const arr = (window.locations && Array.isArray(window.locations)) ? window.locations.slice() : [];
                  data.locations.forEach(l=>{ if(l.name && l.coordinates){ arr.push(l); } });
                  if(window.EditorState && typeof window.EditorState.setState === 'function'){
                    window.EditorState.setState({ locations: arr });
                  } else {
                    window.locations = arr;
                  }
                }catch(e){}
              }
              const doSort = (window.EditorState && typeof window.EditorState.getImportAutoSort === 'function') ? window.EditorState.getImportAutoSort() : window.importAutoSort;
              if(doSort){
                const sorter = (a,b)=>{ const da = Date.parse(a.date||''); const db = Date.parse(b.date||''); if(isNaN(da) && isNaN(db)) return 0; if(isNaN(da)) return 1; if(isNaN(db)) return -1; return db - da; };
                if(window.EditorState && typeof window.EditorState.getState === 'function'){
                  const s = window.EditorState.getState(); s.locations = (s.locations||[]).slice().sort(sorter); window.EditorState.setState({ locations: s.locations });
                } else {
                  window.locations = window.locations || [];
                  window.locations.sort((a,b)=>{ const da = Date.parse(a.date||''); const db = Date.parse(b.date||''); if(isNaN(da) && isNaN(db)) return 0; if(isNaN(da)) return 1; if(isNaN(db)) return -1; return db - da; });
                  try{ if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: window.locations }); }catch(e){}
                }
              }
              if(window.renderLocations) window.renderLocations(); if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft(); alert('导入并追加完成' + (doSort ? '（已按日期排序）':''));
            } else { alert('JSON 中不含 locations 数组'); }
          }catch(err){ alert('解析失败: '+ err.message); }
        };
        reader.readAsText(file);
      });

      // 保存导入偏好
      const importAutoSortEl = document.getElementById('importAutoSort'); if(importAutoSortEl) importAutoSortEl.addEventListener('change', e=>{ if(window.EditorState && typeof window.EditorState.setImportAutoSort === 'function'){ window.EditorState.setImportAutoSort(e.target.checked); } else { window.importAutoSort = e.target.checked; if(window.lsSet) window.lsSet('footprintmap_builder_importAutoSort', window.importAutoSort.toString()); } });

      // 地图初始化与拾取
      try{
        const map = new AMap.Map('map',{ viewMode:'2D', zoom:4, center:[105,36] });
        map.on('click', function(ev){ if(ev && ev.lnglat){ const { lng, lat } = ev.lnglat; const coordEl = document.getElementById('coordinates'); if(coordEl) coordEl.value = lng.toFixed(6)+','+lat.toFixed(6); } });
        let placeSearch = null;
        AMap.plugin('AMap.PlaceSearch', ()=>{ placeSearch = new AMap.PlaceSearch({ pageSize:10, pageIndex:1 }); });
        window.doPlaceSearch = function(){ const kw = document.getElementById('placeSearchInput').value.trim(); if(!kw) return; if(!placeSearch){ alert('搜索服务尚未就绪，请稍后再试'); return; } placeSearch.search(kw, (status, result)=>{ if(status === 'complete' && result.poiList && result.poiList.pois && result.poiList.pois.length > 0){ const poi = result.poiList.pois[0]; if(poi.location){ const lng = poi.location.lng; const lat = poi.location.lat; map.setZoomAndCenter(14, [lng, lat]); const coordEl = document.getElementById('coordinates'); if(coordEl) coordEl.value = lng.toFixed(6)+','+lat.toFixed(6); map.clearMap(); new AMap.Marker({ position:[lng,lat], map }); alert('已定位到：' + poi.name); } else { alert('找到地点但无坐标信息，请尝试其他关键词'); } } else if(status === 'no_data'){ alert('未找到"' + kw + '"，请尝试更具体的关键词（如：杭州西湖风景区、北京天安门广场）'); } else if(status === 'error'){ alert('搜索出错，请检查网络或稍后重试'); } else { alert('未找到相关地点，请尝试更具体的关键词'); } }); };
        const placeSearchBtn = document.getElementById('placeSearchBtn'); if(placeSearchBtn) placeSearchBtn.addEventListener('click', ()=> window.doPlaceSearch());
        const placeSearchInput = document.getElementById('placeSearchInput'); if(placeSearchInput) placeSearchInput.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); window.doPlaceSearch(); } });
      }catch(e){}

      // 绑定事件委托
      if(window.bindDelegatedEvents) window.bindDelegatedEvents();

      // 样式高亮插入（页面可能已插入，但重复插入无害）
      try{
        const styleEl = document.createElement('style');
        styleEl.textContent = '.invalid{border-color:#dc2626 !important; background:#fef2f2 !important;}.dragging{opacity:0.5;}@media(max-width:640px){#map{height:280px !important;}.footprint-map{height:320px !important;}.location-item{font-size:12px; padding:10px 12px; padding-left:28px; padding-bottom:44px;}.marker-color-palette{gap:6px;}.tags-options{gap:5px;}.controls{gap:6px;}button{padding:8px 12px; font-size:13px;}}';
        document.head.appendChild(styleEl);
      }catch(e){}

      // 初始化分类与颜色控件
      if(window.initMarkerColorPalette) window.initMarkerColorPalette();
      if(window.renderCategoryOptions) window.renderCategoryOptions();

    }catch(err){ console.error('EditorActions init error', err); }
  }

  // 自动初始化（脚本引入位置应在依赖脚本之后）
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else init();

  window.EditorActions = { init };
})();
