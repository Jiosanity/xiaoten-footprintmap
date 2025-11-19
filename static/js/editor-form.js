(function(){
  // 表单相关工具与验证函数
  function validateCoordinates(str){
    const re = /^\s*(-?\d+(?:\.\d+)?)[,，]\s*(-?\d+(?:\.\d+)?)\s*$/;
    const m = re.exec(str);
    if(!m) return null;
    const lng = parseFloat(m[1]); const lat = parseFloat(m[2]);
    if(Math.abs(lng)>180 || Math.abs(lat)>90) return null;
    return { lng, lat };
  }

  function isValidUrl(str){
    if(!str) return true;
    try{ const u = new URL(str); return ['http:','https:'].includes(u.protocol); }catch(e){ return false; }
  }

  function collectErrors(fields){
    const errs = [];
    if(!fields.name) errs.push('名称不能为空');
    if(!fields.coordinates) errs.push('坐标不能为空');
    if(fields.coordinates && !validateCoordinates(fields.coordinates)) errs.push('坐标格式错误或范围非法 (lng,lat)');
    if(fields.url && !isValidUrl(fields.url)) errs.push('关联链接 URL 非法');
    for(const p of fields.photos){ if(!isValidUrl(p)) { errs.push('图片 URL 非法: '+p); break; } }
    const s = (window.EditorState && typeof window.EditorState.getState === 'function') ? window.EditorState.getState() : {};
    const locs = s.locations || window.locations || [];
    const editIdx = (s.editingIndex !== undefined) ? s.editingIndex : window.editingIndex;
    const duplicateIndex = (locs || []).findIndex((l,i)=> l.name === fields.name && i!==editIdx);
    if(duplicateIndex !== -1) errs.push('名称已存在："'+fields.name+'"');
    return errs;
  }

  function showErrors(errs){
    const formErrorsEl = document.getElementById('formErrors');
    if(!formErrorsEl) return;
    if(!errs || errs.length===0){ formErrorsEl.style.display='none'; formErrorsEl.textContent=''; return; }
    formErrorsEl.style.display='block'; formErrorsEl.innerHTML = errs.map(e=>`<div>• ${e}</div>`).join('');
  }

  function clearInvalidHighlights(){
    const form = document.getElementById('locationForm'); if(!form) return;
    form.querySelectorAll('.invalid').forEach(el=> el.classList.remove('invalid'));
  }
  function applyInvalidHighlights(fields){
    if(!fields) return;
    const nameEl = document.getElementById('name'); const coordEl = document.getElementById('coordinates'); const urlEl = document.getElementById('url'); const photoInput = document.getElementById('photoInput');
    if(nameEl && !fields.name) nameEl.classList.add('invalid');
    if(coordEl && (!fields.coordinates || !validateCoordinates(fields.coordinates))) coordEl.classList.add('invalid');
    if(urlEl && fields.url && !isValidUrl(fields.url)) urlEl.classList.add('invalid');
    if(photoInput && fields.photos && fields.photos.some(p=>!isValidUrl(p))) photoInput.classList.add('invalid');
  }

  function addPhotoUrl(){
    const photoInput = document.getElementById('photoInput');
    if(!photoInput) return;
    const v = photoInput.value.trim(); if(!v) return; 
    if(window.EditorState && typeof window.EditorState.getState === 'function' && typeof window.EditorState.setState === 'function'){
      const cur = window.EditorState.getState(); const p = (cur.photosTemp||[]).slice(); p.push(v); window.EditorState.setState({ photosTemp: p });
    } else {
      const arr = (window.photosTemp && Array.isArray(window.photosTemp)) ? window.photosTemp.slice() : [];
      arr.push(v);
      try{
        if(window.EditorState && typeof window.EditorState.setState === 'function'){
          window.EditorState.setState({ photosTemp: arr });
        } else {
          window.photosTemp = arr;
        }
      }catch(e){ window.photosTemp = arr; }
    }
    photoInput.value='';
    if(window.renderPhotosTemp) window.renderPhotosTemp();
  }

  function resetForm(){
    const form = document.getElementById('locationForm'); if(form) form.reset();
    if(window.EditorState && typeof window.EditorState.setState === 'function') window.EditorState.setState({ photosTemp: [] }); else window.photosTemp = [];
    if(window.renderPhotosTemp) window.renderPhotosTemp();
  }

  window.EditorForm = {
    validateCoordinates, isValidUrl, collectErrors, showErrors, clearInvalidHighlights, applyInvalidHighlights, addPhotoUrl, resetForm
  };
  // 兼容旧调用
  window.validateCoordinates = validateCoordinates;
  window.isValidUrl = isValidUrl;
  window.collectErrors = collectErrors;
  window.showErrors = showErrors;
  window.clearInvalidHighlights = clearInvalidHighlights;
  window.applyInvalidHighlights = applyInvalidHighlights;
  window.addPhotoUrl = addPhotoUrl;
  window.resetForm = resetForm;
})();
