(function(){
  function init(opts){
    const wrap = document.querySelector(opts && opts.wrapSelector ? opts.wrapSelector : '#previewMapWrap');
    const amapKey = (opts && opts.amapKey) || '';
    let lastBlobUrl = null;
    let lastEl = null;
    let initialized = false;

    function showEmptyPlaceholder(){
      if(!wrap) return;
      wrap.innerHTML = `<div id="previewMap" class="footprint-map" style="height:400px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f8fafc;border-radius:8px;"><div style="padding:20px;font-size:13px;color:#64748b;text-align:center;">暂无足迹数据，请添加地点或导入 JSON 文件，然后点击\"刷新预览\"。</div></div>`;
      lastEl = wrap.querySelector('#previewMap');
      initialized = true;
    }

    function renderFromText(text){
      if(!wrap) return;
      let obj;
      try{ obj = JSON.parse(text); }catch(e){ obj = null; }
      const locations = obj && Array.isArray(obj.locations) ? obj.locations : [];
      if(!locations.length){
        // 只在首次初始化时显示提示
        if(!initialized) showEmptyPlaceholder();
        return;
      }
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      if(lastBlobUrl && lastBlobUrl !== url){ try{ URL.revokeObjectURL(lastBlobUrl); }catch(e){} }
      lastBlobUrl = url;
      // 完全重建容器
      wrap.innerHTML = `<div id="previewMap" class="footprint-map" style="height:400px;border-radius:8px;overflow:hidden;" data-amap-key="${amapKey}" data-json="${url}"></div>`;
      lastEl = wrap.querySelector('#previewMap');
      // 等待 DOM 更新后初始化地图
      setTimeout(()=>{
        if(lastEl && window.FootprintMap && typeof window.FootprintMap.bootstrapMap === 'function'){
          try{ window.FootprintMap.bootstrapMap(lastEl); }catch(e){}
        }
      }, 100);
      initialized = true;
    }

    function destroy(){
      if(lastBlobUrl){ try{ URL.revokeObjectURL(lastBlobUrl); }catch(e){} lastBlobUrl = null; }
      if(lastEl){
        try{ if(window.FootprintMap && typeof window.FootprintMap.destroy === 'function'){ window.FootprintMap.destroy(lastEl); } }catch(e){}
        try{ lastEl.remove(); }catch(e){}
        lastEl = null;
      }
    }

    return { renderFromText, destroy };
  }
  window.EditorPreview = { init };
})();
