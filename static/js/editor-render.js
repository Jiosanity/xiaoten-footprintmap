(function(){
  // 渲染与事件委托模块，依赖全局状态变量：locations, photosTemp, selectedCategories, selectedMarkerColor, defaultCategories, markerGradients
  function renderPhotosTemp(){
    const photosListEl = document.getElementById('photosList');
    if(!photosListEl) return;
    photosListEl.innerHTML = '';
    const photos = (window.EditorState && typeof window.EditorState.getState === 'function') ? (window.EditorState.getState().photosTemp || []) : (typeof photosTemp !== 'undefined' ? photosTemp : []);
    (photos || []).forEach((url,idx)=>{
      const div = document.createElement('div');
      div.className='photo-item';
      div.innerHTML = `<span>${url.replace(/^https?:\/\//,'').slice(0,40)}</span>`;
      const btn = document.createElement('button');
      btn.type='button'; btn.textContent='×';
      btn.dataset.action = 'remove-photo';
      btn.dataset.idx = idx;
      div.appendChild(btn);
      photosListEl.appendChild(div);
    });
  }

  function enableDragForItems(){
    const locationListEl = document.getElementById('locationList');
    if(!locationListEl) return;
    locationListEl.querySelectorAll('.location-item').forEach(item=>{
      item.draggable = true;
      item.addEventListener('dragstart', e=>{
        e.dataTransfer.setData('text/plain', item.dataset.idx);
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', ()=> item.classList.remove('dragging'));
      item.addEventListener('dragover', e=> e.preventDefault());
      item.addEventListener('drop', e=>{
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'),10);
        const to = parseInt(item.dataset.idx,10);
        if(isNaN(from)||isNaN(to)||from===to) return;
        try{
          if(window.EditorState && typeof window.EditorState.getState === 'function'){
            const s = window.EditorState.getState(); const arr = s.locations ? s.locations.slice() : [];
            const moved = arr.splice(from,1)[0]; arr.splice(to,0,moved);
            if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: arr });
            } else if(typeof locations !== 'undefined'){
              const arr = locations.slice(); const moved = arr.splice(from,1)[0]; arr.splice(to,0,moved);
              try{
                if(window.EditorState && typeof window.EditorState.setState === 'function'){
                  window.EditorState.setState({ locations: arr });
                } else {
                  window.locations = arr;
                }
              }catch(e){ window.locations = arr; }
            }
        }catch(e){}
        renderLocations(); if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft(); if(window.generateJson) window.generateJson();
      });
    });
  }

  function renderCategoryOptions(){
    const wrap = document.getElementById('categoryOptions');
    if(!wrap) return;
    wrap.innerHTML='';
    const s = (window.EditorState && typeof window.EditorState.getState === 'function') ? window.EditorState.getState() : {};
    const all = Array.from(new Set([...(s.defaultCategories||defaultCategories||[]), ...Array.from(s.selectedCategories||selectedCategories||new Set())]));
    all.forEach(cat=>{
      const div = document.createElement('div');
      div.className='tag-option';
      div.textContent = cat;
      div.setAttribute('role','checkbox');
      div.dataset.val = cat;
      const selSet = s.selectedCategories || selectedCategories || new Set();
      if(selSet.has(cat)) { div.dataset.selected='1'; div.setAttribute('aria-checked','true'); }
      else div.setAttribute('aria-checked','false');
      div.onclick=()=>{
        try{
          if(window.EditorState && typeof window.EditorState.getState === 'function' && typeof window.EditorState.setState === 'function'){
            const cur = window.EditorState.getState(); const set = cur.selectedCategories || new Set(); if(set.has(cat)) set.delete(cat); else set.add(cat); window.EditorState.setState({ selectedCategories: set });
          } else {
            if(selectedCategories.has(cat)) selectedCategories.delete(cat); else selectedCategories.add(cat);
          }
        }catch(e){}
        renderCategoryOptions();
      };
      if(!(defaultCategories||[]).includes(cat)){
        const delBtn = document.createElement('button'); delBtn.type='button'; delBtn.title='删除标签'; delBtn.textContent='×'; delBtn.onclick=(e)=>{ e.stopPropagation(); try{ if(window.EditorState && typeof window.EditorState.getState === 'function' && typeof window.EditorState.setState === 'function'){ const cur = window.EditorState.getState(); const set = cur.selectedCategories || new Set(); set.delete(cat); window.EditorState.setState({ selectedCategories: set }); } else { selectedCategories.delete(cat); } }catch(err){} renderCategoryOptions(); };
        div.appendChild(delBtn);
      }
      wrap.appendChild(div);
    });
  }

  function initMarkerColorPalette(){
    const palette = document.getElementById('markerColorPalette'); if(!palette) return;
    const presets = Object.keys(markerGradients||{});
    palette.innerHTML='';
    const none = document.createElement('div'); none.className='marker-color-swatch'; none.dataset.none='1'; none.title='自动'; none.tabIndex=0; none.textContent='A'; none.dataset.val=''; none.onclick=()=>{ try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ selectedMarkerColor: '' }); } else { selectedMarkerColor=''; } }catch(e){} if(document.getElementById('markerColor')) document.getElementById('markerColor').value=''; updateMarkerSelection(); };
    palette.appendChild(none);
    presets.forEach(p=>{ const s=document.createElement('div'); s.className='marker-color-swatch'; s.style.background=markerGradients[p]; s.title=p; s.tabIndex=0; s.dataset.val=p; s.onclick=()=>{ try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ selectedMarkerColor: p }); } else { selectedMarkerColor=p; } }catch(e){} if(document.getElementById('markerColor')) document.getElementById('markerColor').value=p; updateMarkerSelection(); }; palette.appendChild(s); });
    updateMarkerSelection();
  }
  function updateMarkerSelection(){
    const s = (window.EditorState && typeof window.EditorState.getState === 'function') ? window.EditorState.getState() : {};
    const selColor = (s.selectedMarkerColor !== undefined) ? s.selectedMarkerColor : (typeof selectedMarkerColor !== 'undefined' ? selectedMarkerColor : '');
    document.querySelectorAll('.marker-color-swatch').forEach(el=>{ if(el.dataset.none==='1'){ el.dataset.selected = selColor==='' ? '1':'0'; } else { el.dataset.selected = el.dataset.val===selColor ? '1':'0'; } });
  }

  function renderLocations(){
    const locationListEl = document.getElementById('locationList');
    if(!locationListEl) return;
    locationListEl.innerHTML='';
    const s = (window.EditorState && typeof window.EditorState.getState === 'function') ? window.EditorState.getState() : {};
    const list = s.locations || (typeof locations !== 'undefined' ? locations : []) || [];
    (list||[]).forEach((loc,idx)=>{
      const item = document.createElement('div'); 
      item.className='location-item';
      item.dataset.idx = idx;
      
      const checkbox = document.createElement('input');
      checkbox.type='checkbox';
      checkbox.className='loc-select item-checkbox';
      checkbox.dataset.action = 'toggle-select';
      checkbox.dataset.idx = idx;
      item.appendChild(checkbox);

      const h = document.createElement('h3');
      h.textContent = `${idx+1}. ${loc.name}`;
      item.appendChild(h);

      const meta = document.createElement('div'); meta.className='item-meta'; meta.textContent = `${loc.date || '未指定日期'} · ${loc.coordinates}`; item.appendChild(meta);

      if(loc.description){ const desc = document.createElement('div'); desc.className='item-desc'; desc.textContent = loc.description.slice(0,120) + (loc.description.length > 120 ? '...' : ''); item.appendChild(desc); }

      if(loc.categories && loc.categories.length){ const cWrap=document.createElement('div'); cWrap.style.marginTop='8px'; loc.categories.forEach(c=>{ const span=document.createElement('span'); span.className='tag'; span.textContent=c; cWrap.appendChild(span); }); item.appendChild(cWrap); }

      const extraInfo = document.createElement('div'); extraInfo.style.marginTop='6px'; extraInfo.style.fontSize='11px'; extraInfo.style.color='#64748b';
      if(loc.photos && loc.photos.length){ const photoSpan = document.createElement('span'); photoSpan.textContent = `📸 ${loc.photos.length} 张图片`; extraInfo.appendChild(photoSpan); }
      if(loc.url){ if(loc.photos && loc.photos.length) extraInfo.appendChild(document.createTextNode(' · ')); const u=document.createElement('a'); u.href=loc.url; u.target='_blank'; u.textContent= loc.urlLabel || '🔗 链接'; u.style.color='#6366f1'; u.style.textDecoration='none'; extraInfo.appendChild(u); }
      if(loc.photos?.length || loc.url) item.appendChild(extraInfo);

      const actionsDiv = document.createElement('div'); actionsDiv.className='item-actions';
      const editBtn = document.createElement('button'); editBtn.type='button'; editBtn.textContent='编辑'; editBtn.className='secondary'; editBtn.dataset.action='edit'; editBtn.dataset.idx = idx;
      const delBtn = document.createElement('button'); delBtn.type='button'; delBtn.textContent='删除'; delBtn.className='danger'; delBtn.dataset.action='delete'; delBtn.dataset.idx = idx;
      actionsDiv.appendChild(editBtn); actionsDiv.appendChild(delBtn); item.appendChild(actionsDiv);

      const navDiv = document.createElement('div'); navDiv.className='item-nav';
      const upBtn = document.createElement('button'); upBtn.type='button'; upBtn.innerHTML='↑'; upBtn.className='secondary'; upBtn.title='上移'; upBtn.dataset.action='up'; upBtn.dataset.idx = idx;
      const downBtn = document.createElement('button'); downBtn.type='button'; downBtn.innerHTML='↓'; downBtn.className='secondary'; downBtn.title='下移'; downBtn.dataset.action='down'; downBtn.dataset.idx = idx;
      navDiv.appendChild(upBtn); navDiv.appendChild(downBtn); item.appendChild(navDiv);

      locationListEl.appendChild(item);
    });
    enableDragForItems();
  }

  // 事件委托：处理编辑/删除/上下移动/批量操作/图片移除
  function bindDelegatedEvents(){
    const locationListEl = document.getElementById('locationList');
    if(!locationListEl) return;
    locationListEl.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      const action = btn.dataset.action;
      const idx = parseInt(btn.dataset.idx,10);
      if(action === 'edit'){
        const s = (window.EditorState && typeof window.EditorState.getState === 'function') ? window.EditorState.getState() : {};
        const loc = (s.locations || (typeof locations !== 'undefined' ? locations : []) || [])[idx];
        if(!loc) return;
        try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ editingIndex: idx }); } else { editingIndex = idx; } }catch(e){}
        document.getElementById('name').value = loc.name;
        document.getElementById('description').value = loc.description || '';
        document.getElementById('date').value = loc.date && /\d{4}-\d{2}-\d{2}/.test(loc.date) ? loc.date : '';
        document.getElementById('coordinates').value = loc.coordinates;
        try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ selectedCategories: new Set(loc.categories||[]) }); } else { selectedCategories = new Set(loc.categories||[]); } }catch(e){}
        renderCategoryOptions();
        try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ selectedMarkerColor: loc.markerColor || '' }); } else { selectedMarkerColor = loc.markerColor || ''; } }catch(e){}
        document.getElementById('markerColor').value = loc.markerColor || ''; updateMarkerSelection();
        document.getElementById('url').value = loc.url || '';
        document.getElementById('urlLabel').value = loc.urlLabel || '';
        try{ if(window.EditorState && typeof window.EditorState.setState === 'function'){ window.EditorState.setState({ photosTemp: [...(loc.photos||[])] }); } else { photosTemp = [...(loc.photos||[])]; } }catch(e){}
        renderPhotosTemp();
        showErrors([]);
        document.getElementById('submitBtn').textContent = '✔ 保存修改';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        window.scrollTo({ top:0, behavior:'smooth' });
        } else if(action === 'delete'){
        if(isNaN(idx)) return;
        try{
          if(window.EditorState && typeof window.EditorState.removeLocation === 'function'){
            window.EditorState.removeLocation(idx);
          } else if(typeof locations !== 'undefined'){
            const arr = locations.slice(); arr.splice(idx,1);
            try{ if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: arr }); else window.locations = arr; }catch(e){ window.locations = arr; }
          }
        }catch(e){}
        renderLocations(); if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft(); if(window.generateJson) window.generateJson();
        } else if(action === 'up'){
        if(isNaN(idx) || idx<=0) return;
        try{
          if(window.EditorState && typeof window.EditorState.getState === 'function'){
            const s = window.EditorState.getState(); const arr = s.locations ? s.locations.slice() : [];
            const mv = arr.splice(idx,1)[0]; arr.splice(idx-1,0,mv); if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: arr });
          } else if(typeof locations !== 'undefined'){
            const arr = locations.slice(); const mv = arr.splice(idx,1)[0]; arr.splice(idx-1,0,mv);
            try{ if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: arr }); else window.locations = arr; }catch(e){ window.locations = arr; }
          }
        }catch(e){}
        renderLocations(); if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft(); if(window.generateJson) window.generateJson();
        } else if(action === 'down'){
        if(isNaN(idx) || idx >= ( (window.EditorState && window.EditorState.getState) ? ( (window.EditorState.getState().locations||[]).length-1 ) : ((typeof locations !== 'undefined') ? locations.length-1 : -1) )) return;
        try{
          if(window.EditorState && typeof window.EditorState.getState === 'function'){
            const s = window.EditorState.getState(); const arr = s.locations ? s.locations.slice() : [];
            const mv = arr.splice(idx,1)[0]; arr.splice(idx+1,0,mv); if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: arr });
          } else if(typeof locations !== 'undefined'){
            const arr = locations.slice(); const mv = arr.splice(idx,1)[0]; arr.splice(idx+1,0,mv);
            try{ if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ locations: arr }); else window.locations = arr; }catch(e){ window.locations = arr; }
          }
        }catch(e){}
        renderLocations(); if(window.EditorState && typeof window.EditorState.persistDraft === 'function') window.EditorState.persistDraft(); if(window.generateJson) window.generateJson();
      } else if(action === 'remove-photo'){
        if(isNaN(idx)) return;
        try{
          if(window.EditorState && typeof window.EditorState.getState === 'function' && typeof window.EditorState.setState === 'function'){
            const cur = window.EditorState.getState(); const p = (cur.photosTemp||[]).slice(); p.splice(idx,1); window.EditorState.setState({ photosTemp: p });
          } else if(typeof photosTemp !== 'undefined'){
            const arr = photosTemp.slice(); arr.splice(idx,1);
            try{ if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ photosTemp: arr }); else window.photosTemp = arr; }catch(e){ window.photosTemp = arr; }
          }
        }catch(e){}
        renderPhotosTemp();
      }
    }, false);
  }

  // 暴露给全局以兼容现有调用
  window.EditorRender = {
    renderLocations, renderPhotosTemp, renderCategoryOptions,
    initMarkerColorPalette, updateMarkerSelection, enableDragForItems, bindDelegatedEvents
  };
  // 也将常见函数挂到全局名以减少修改
  window.renderLocations = renderLocations;
  window.renderPhotosTemp = renderPhotosTemp;
  window.renderCategoryOptions = renderCategoryOptions;
  window.initMarkerColorPalette = initMarkerColorPalette;
  window.updateMarkerSelection = updateMarkerSelection;
  window.enableDragForItems = enableDragForItems;
  window.bindDelegatedEvents = bindDelegatedEvents;
})();
