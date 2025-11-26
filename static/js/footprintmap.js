(function () {
  'use strict';

  const MAP_SELECTOR = '.footprint-map';
  const MAP_STYLES = { light: 'amap://styles/whitesmoke', dark: 'amap://styles/dark' };
  const FILTER_ALL = 'all';
  const MARKER_SIZE = 22;
  const MARKER_PRESETS = ['sunset', 'ocean', 'violet', 'forest', 'amber', 'citrus'];
  const MARKER_STYLES = {
    sunset: 'linear-gradient(135deg, #ffb347, #ff6f61)',
    ocean: 'linear-gradient(135deg, #06beb6, #48b1bf)',
    violet: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    forest: 'linear-gradient(135deg, #5ee7df, #39a37c)',
    amber: 'linear-gradient(135deg, #f6d365, #fda085)',
    citrus: 'linear-gradient(135deg, #fdfb8f, #a1ffce)'
  };
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  let amapLoader = null;
  const registeredMaps = new Set();
  let themeObserver = null;
  let photoViewer = null;
  let suppressMapClose = false;

  const escapeHtml = str => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatDate = raw => {
    if (!raw) return '';
    const date = new Date(raw);
    return isNaN(date.getTime()) ? String(raw) : dateFormatter.format(date);
  };

  const getCurrentTheme = () => 
    document.documentElement.classList.contains('dark') ? MAP_STYLES.dark : MAP_STYLES.light;

  function init() {
    document.querySelectorAll(MAP_SELECTOR).forEach(bootstrapMap);
  }

  async function bootstrapMap(container) {
    const { json: dataUrl, amapKey: apiKey, provider = 'amap' } = container.dataset;

    if (!apiKey) {
      const hint = provider === 'mapbox' ? '<code>data-amap-key</code> / 初始化参数 <code>amapKey</code>（或提供 Mapbox Token）' : '<code>key=你的APIKey</code> 或 <code>data-amap-key</code>';
      container.innerHTML = `<div class="footprint-map__error">无法加载地图：请在页面中为地图脚本提供 ${hint}。</div>`;
      return;
    }

    container.classList.add('footprint-map--loading');

    try {
      if (provider === 'mapbox') {
        // 延迟加载 mapbox 适配器脚本（它会提供 window.loadMapboxAdapter / window.renderMapWithMapbox）
        await ensureMapboxAdapterScript();
        if (typeof window.loadMapboxAdapter === 'function') await window.loadMapboxAdapter();
      } else {
        await loadAmap(apiKey);
      }
      const locations = await fetchLocations(dataUrl);

      if (!locations.length) {
        container.innerHTML = '<div class="footprint-map__error">暂无足迹数据，请添加地点、导入 JSON 文件或导入示例数据，然后点击"刷新预览"。</div>';
        return;
      }

      if (provider === 'mapbox' && typeof window.renderMapWithMapbox === 'function') {
        window.renderMapWithMapbox(container, locations, apiKey);
      } else {
        renderMap(container, locations);
      }
    } catch (error) {
      container.innerHTML = '<div class="footprint-map__error">足迹地图加载失败，请稍后重试。</div>';
    } finally {
      container.classList.remove('footprint-map--loading');
    }
  }

  // 动态注入 mapbox-adapter.js（该文件在仓库中的 /js/mapbox-adapter.js）
  let _mapboxAdapterLoader = null;
  function ensureMapboxAdapterScript() {
    if (_mapboxAdapterLoader) return _mapboxAdapterLoader;
    _mapboxAdapterLoader = new Promise((resolve, reject) => {
      // 试图查找当前脚本的路径以拼接 adapter 路径
      const scriptTags = Array.from(document.getElementsByTagName('script'));
      const selfScript = scriptTags.find(s => s.src && s.src.indexOf('/js/footprintmap.js') !== -1);
      const base = selfScript ? selfScript.src.replace(/\/[^/]*$/, '') : '';
      const adapterSrc = (base || '') + '/mapbox-adapter.js';
      const s = document.createElement('script');
      s.src = adapterSrc;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('加载 mapbox-adapter.js 失败'));
      document.head.appendChild(s);
    });
    return _mapboxAdapterLoader;
  }

  async function loadAmap(apiKey) {
    if (window.AMap) return;
    if (amapLoader) return amapLoader;

    amapLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}`;
      script.async = true;
      script.onload = () => {
        window._AMapSecurityConfig = { securityJsCode: '' };
        AMap.plugin(['AMap.Scale', 'AMap.ToolBar'], resolve);
      };
      script.onerror = () => reject(new Error('高德地图脚本加载失败'));
      document.head.appendChild(script);
    });

    return amapLoader;
  }

  async function fetchLocations(url) {
    if (!url) return [];
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('足迹数据请求失败');
    const data = await res.json();
    
    const list = Array.isArray(data) ? data : (data.locations || data.points || []);
    return list.map(sanitizeLocation).filter(Boolean);
  }

  function sanitizeLocation(item, index) {
    const coords = parseCoords(item.coordinates || item.coordinate || item.coords || item.position);
    if (!coords) return null;

    const categories = normalizeArray(item.categories || item.category || item.tags);
    const markerStyle = getMarkerStyle(item.markerColor || item.marker || item.markerPreset, index);

    return {
      name: item.name || '未命名地点',
      lat: coords.lat,
      lng: coords.lng,
      url: item.url || item.link || '',
      urlLabel: item.urlLabel || item.urlTitle || item.linkTitle || '',
      description: item.description || item.desc || '',
      photos: Array.isArray(item.photos) ? item.photos : [],
      categories: categories.length ? categories : ['未分类'],
      date: formatDate(item.date || item.visited || item.visited_at || item.visitedAt),
      markerPreset: markerStyle.preset,
      markerStyle: markerStyle.style
    };
  }

  function parseCoords(value) {
    if (typeof value === 'string') {
      const parts = value.split(/[,，\s]+/).map(parseFloat).filter(n => !isNaN(n));
      if (parts.length >= 2) return { lng: parts[0], lat: parts[1] };
    }
    if (Array.isArray(value) && value.length >= 2) {
      const [lng, lat] = value.map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return null;
  }

  function normalizeArray(value) {
    if (typeof value === 'string') return [value.trim()].filter(Boolean);
    if (!Array.isArray(value)) return [];
    return value.map(v => typeof v === 'string' ? v.trim() : (v?.name || v?.label || '')).filter(Boolean);
  }

  function getMarkerStyle(raw, index) {
    if (typeof raw === 'string') {
      const value = raw.trim().toLowerCase();
      if (MARKER_STYLES[value]) {
        return { preset: value, style: `background:${MARKER_STYLES[value]}` };
      }
      if (/^(#|rgb|hsl)/.test(value)) {
        return { preset: '', style: `background:${value}` };
      }
    }
    const preset = MARKER_PRESETS[index % MARKER_PRESETS.length];
    return { preset, style: '' };
  }

  function renderMap(container, locations) {
    container.innerHTML = '';

    const mapCanvas = document.createElement('div');
    mapCanvas.className = 'footprint-map__canvas';
    container.appendChild(mapCanvas);

    const map = new AMap.Map(mapCanvas, {
      zoom: 4,
      center: [locations[0].lng, locations[0].lat],
      mapStyle: getCurrentTheme(),
      viewMode: '2D',
      rotateEnable: false,
      pitchEnable: false
    });

    map.plugin(['AMap.Scale', 'AMap.ToolBar'], () => {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const toolbarPos = isMobile ? { bottom: '20px', right: '20px' } : { top: '20px', right: '20px' };
      const scalePos = isMobile ? { bottom: '20px', left: '20px' } : { bottom: '20px', right: '20px' };
      map.addControl(new AMap.ToolBar({ position: toolbarPos }));
      map.addControl(new AMap.Scale({ position: scalePos }));
    });

    const infoWindow = new AMap.InfoWindow({ anchor: 'bottom-center' });

    const createMarkerClick = (point) => (e) => {
      e?.stopPropagation?.();
      suppressMapClose = true;
      infoWindow.setContent(buildInfoWindow(point));
      infoWindow.open(map, [point.lng, point.lat]);
      setTimeout(() => {
        setupPopupEvents();
        // 确保弹窗在视口内可见：若弹窗超出顶部或底部，则平移地图使其可见
        try { ensureInfoWindowVisible_AMap(map, [point.lng, point.lat]); } catch (err) { /* ignore */ }
        suppressMapClose = false;
      }, 0);
    };

    // 确保 AMap InfoWindow 在可见区域：将 marker 平移到视图的偏下位置（约 60% 高度）
    function ensureInfoWindowVisible_AMap(mapInstance, lnglat) {
      try {
        if (!mapInstance || !mapInstance.lngLatToContainer || !mapInstance.containerToLngLat || !mapInstance.getSize) return;
        const pixel = mapInstance.lngLatToContainer(lnglat);
        const size = mapInstance.getSize();
        const desiredY = Math.floor(size.height * 0.60); // 将 marker 放置于视图 60% 高度处
        const dy = pixel.y - desiredY;
        if (Math.abs(dy) < 6) return; // 不需要微小调整
        const centerPixel = { x: Math.floor(size.width / 2), y: Math.floor(size.height / 2 + dy) };
        const newCenter = mapInstance.containerToLngLat([centerPixel.x, centerPixel.y]);
        if (newCenter && newCenter.lng !== undefined) {
          try { mapInstance.setCenter(newCenter); } catch (e) { /* best-effort */ }
        }
      } catch (e) { /* ignore */ }
    }

    let allMarkers = [];
    let clusterMarkers = [];
    let markerData = locations;
    let clusterEnabled = true;

    function updateClusters() {
      [...allMarkers, ...clusterMarkers].forEach(m => m.setMap(null));
      allMarkers = [];
      clusterMarkers = [];

      const zoom = map.getZoom();
      const shouldCluster = clusterEnabled && zoom < 10;

      if (!shouldCluster) {
        markerData.forEach(point => {
          const marker = new AMap.Marker({
            position: [point.lng, point.lat],
            content: buildMarkerHtml(point),
            offset: new AMap.Pixel(-MARKER_SIZE / 2, -MARKER_SIZE / 2),
            map
          });
          marker.on('click', createMarkerClick(point));
          allMarkers.push(marker);
        });
        return;
      }

      const gridSize = 80;
      const clusters = {};

      markerData.forEach(point => {
        const pixel = map.lngLatToContainer([point.lng, point.lat]);
        const key = `${Math.floor(pixel.x / gridSize)}_${Math.floor(pixel.y / gridSize)}`;
        (clusters[key] = clusters[key] || []).push(point);
      });

      Object.values(clusters).forEach(points => {
        if (points.length === 1) {
          const point = points[0];
          const marker = new AMap.Marker({
            position: [point.lng, point.lat],
            content: buildMarkerHtml(point),
            offset: new AMap.Pixel(-MARKER_SIZE / 2, -MARKER_SIZE / 2),
            map
          });
          marker.on('click', createMarkerClick(point));
          allMarkers.push(marker);
        } else {
          const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
          const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
          const count = points.length;
          
          const [size, gradient, fontSize] = count < 5 
            ? [38, 'linear-gradient(135deg, rgba(6,190,182,0.75), rgba(72,177,191,0.75))', '13px']
            : count < 10
            ? [42, 'linear-gradient(135deg, rgba(94,231,223,0.75), rgba(6,190,182,0.75))', '14px']
            : [46, 'linear-gradient(135deg, rgba(255,179,71,0.75), rgba(255,111,97,0.75))', '15px'];

          const marker = new AMap.Marker({
            position: [centerLng, centerLat],
            content: `<div style="width:${size}px;height:${size}px;background:${gradient};border-radius:50%;border:1px solid rgba(255,255,255,0.4);box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${fontSize};text-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer">${count}</div>`,
            offset: new AMap.Pixel(-size / 2, -size / 2),
            map
          });
          marker.on('click', () => map.setZoomAndCenter(zoom + 2, [centerLng, centerLat]));
          clusterMarkers.push(marker);
        }
      });
    }

    updateClusters();
    map.on('zoomend', updateClusters);
    map.on('click', () => {
      if (suppressMapClose) return suppressMapClose = false;
      infoWindow.close();
    });

    const categories = [...new Set(locations.flatMap(l => l.categories))].filter(Boolean).sort();
    if (categories.length > 1) {
      renderFilters(container, categories, (cat) => {
        infoWindow.close();
        markerData = cat === FILTER_ALL ? locations : locations.filter(l => l.categories.includes(cat));
        updateClusters();
        map.setFitView(null, false, [60, 80, 60, 80]);
      });
    } else {
      map.setFitView(null, false, [60, 80, 60, 80]);
    }

    renderClusterToggle(container, (enabled) => {
      clusterEnabled = enabled;
      updateClusters();
    });

    registerThemeSync(map);
  }

  function buildMarkerHtml(point) {
    const classes = ['footprint-marker'];
    if (point.markerPreset) classes.push(`footprint-marker--${point.markerPreset}`);
    const style = point.markerStyle ? ` style="${point.markerStyle}"` : '';
    return `<span class="${classes.join(' ')}" title="${escapeHtml(point.name)}"${style}></span>`;
  }

  function buildInfoWindow(point) {
    const parts = [`<div class="footprint-popup"><h4>${escapeHtml(point.name)}</h4>`];
    
    if (point.date) parts.push(`<p class="footprint-popup__meta">${escapeHtml(point.date)}</p>`);
    
    if (point.categories.length) {
      parts.push(`<div class="footprint-popup__tags">${
        point.categories.map(c => `<span class="footprint-popup__tag">${escapeHtml(c)}</span>`).join('')
      }</div>`);
    }
    
    if (point.description) parts.push(`<p>${escapeHtml(point.description)}</p>`);
    
    if (point.url) {
      const label = point.urlLabel || '查看相关内容';
      parts.push(`<div class="footprint-popup__links"><a class="footprint-popup__link" href="${escapeHtml(point.url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a></div>`);
    }
    
    if (point.photos.length) {
      const needsNav = point.photos.length > 1;
      const nav = needsNav ? 
        '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--prev">&#10094;</button>' +
        '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--next">&#10095;</button>' : '';
      const slides = point.photos.map((src, i) => 
        `<figure class="footprint-popup__slide"><img src="${escapeHtml(src)}" loading="lazy" alt="${escapeHtml(point.name)}-${i + 1}"></figure>`
      ).join('');
      parts.push(`<div class="footprint-popup__photos"${needsNav ? ' data-carousel="true"' : ''}>${nav}<div class="footprint-popup__track">${slides}</div></div>`);
    }
    
    parts.push('</div>');
    return parts.join('');
  }

  function setupPopupEvents() {
    requestAnimationFrame(() => {
      const popup = document.querySelector('.footprint-popup');
      if (!popup) return;

      const carousel = popup.querySelector('.footprint-popup__photos[data-carousel]');
      if (carousel) {
        const track = carousel.querySelector('.footprint-popup__track');
        carousel.querySelectorAll('.footprint-popup__photos-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const dir = btn.classList.contains('footprint-popup__photos-btn--next') ? 1 : -1;
            // 更精确的滚动：根据子幻灯片位置计算下一张/上一张的 offsetLeft，避免固定距离在移动端导致多余空白
            const slides = Array.from(track.querySelectorAll('.footprint-popup__slide'));
            if (!slides.length) return;
            const current = Math.round(track.scrollLeft);
            let targetLeft = null;
            if (dir > 0) {
              // 找到第一个左偏移大于当前滚动位置的幻灯片
              const next = slides.find(s => Math.round(s.offsetLeft) > current + 5);
              if (next) {
                targetLeft = next.offsetLeft;
              } else {
                // 到末尾
                targetLeft = track.scrollWidth - track.clientWidth;
              }
            } else {
              // 向前：找到最后一个左偏移小于当前滚动位置的幻灯片
              const prev = slides.slice().reverse().find(s => Math.round(s.offsetLeft) < current - 5);
              if (prev) {
                targetLeft = prev.offsetLeft;
              } else {
                targetLeft = 0;
              }
            }
            if (targetLeft === null) return;
            // 将目标限定在合理范围内
            targetLeft = Math.max(0, Math.min(targetLeft, track.scrollWidth - track.clientWidth));
            track.scrollTo({ left: Math.floor(targetLeft), behavior: 'smooth' });
          });
        });
      }

      popup.querySelectorAll('.footprint-popup__photos img').forEach(img => {
        if (img.dataset.bound) return;
        img.dataset.bound = '1';
        img.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          openPhotoViewer(img.src, img.alt);
        });
      });
    });
  }

  function renderFilters(container, categories, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'footprint-map__filters';

    const createBtn = (label, value, active) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'footprint-map__filter-btn';
      btn.textContent = label;
      btn.dataset.filter = value;
      if (active) btn.classList.add('is-active');
      btn.onclick = () => {
        if (btn.classList.contains('is-active')) return;
        wrapper.querySelectorAll('.footprint-map__filter-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        onChange(value);
      };
      return btn;
    };

    wrapper.appendChild(createBtn('全部足迹', FILTER_ALL, true));
    categories.forEach(cat => wrapper.appendChild(createBtn(cat, cat, false)));
    container.appendChild(wrapper);
  }

  function renderClusterToggle(container, onChange) {
    let enabled = true;
    const isDark = () => document.documentElement.classList.contains('dark');

    const wrapper = document.createElement('div');
    wrapper.className = 'footprint-map__cluster-toggle';
    wrapper.style.cssText = `position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:10;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-size:13px;user-select:none;transition:all 0.3s`;

    const label = document.createElement('span');
    label.textContent = '集群显示';
    label.style.cssText = 'font-weight:500;transition:color 0.3s';

    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.style.cssText = 'position:relative;width:44px;height:24px;border:none;border-radius:12px;cursor:pointer;transition:background 0.3s;outline:none';

    const knob = document.createElement('span');
    knob.style.cssText = 'position:absolute;top:2px;width:20px;height:20px;background:white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:left 0.3s';

    switchBtn.appendChild(knob);

    const updateTheme = () => {
      const dark = isDark();
      wrapper.style.background = dark ? 'rgba(40,40,40,0.95)' : 'rgba(255,255,255,0.95)';
      wrapper.style.boxShadow = `0 2px 8px rgba(0,0,0,${dark ? 0.4 : 0.15})`;
      label.style.color = dark ? '#e0e0e0' : '#333';
      switchBtn.style.background = enabled ? '#06beb6' : (dark ? '#555' : '#ccc');
    };

    const toggle = () => {
      enabled = !enabled;
      knob.style.left = enabled ? '22px' : '2px';
      updateTheme();
      onChange(enabled);
    };

    switchBtn.onclick = toggle;
    knob.style.left = '22px';
    updateTheme();

    new MutationObserver(updateTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    wrapper.append(label, switchBtn);
    container.appendChild(wrapper);
  }

  function openPhotoViewer(src, alt) {
    if (!photoViewer) {
      photoViewer = document.createElement('div');
      photoViewer.className = 'footprint-photo-viewer';
      photoViewer.innerHTML = `
        <div class="footprint-photo-viewer__mask"></div>
        <div class="footprint-photo-viewer__dialog">
          <button type="button" class="footprint-photo-viewer__close">&times;</button>
          <img alt="" />
        </div>`;
      document.body.appendChild(photoViewer);

      const close = () => {
        photoViewer.classList.remove('is-visible');
        document.documentElement.classList.remove('footprint-photo-viewer-open');
      };

      photoViewer.addEventListener('click', e => {
        if (e.target === photoViewer || e.target.classList.contains('footprint-photo-viewer__mask') || 
            e.target.classList.contains('footprint-photo-viewer__close')) close();
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && photoViewer.classList.contains('is-visible')) close();
      });
    }

    const img = photoViewer.querySelector('img');
    img.src = src;
    img.alt = alt || '';
    photoViewer.classList.add('is-visible');
    document.documentElement.classList.add('footprint-photo-viewer-open');
  }

  function registerThemeSync(map) {
    registeredMaps.add(map);
    if (themeObserver) return;

    themeObserver = new MutationObserver(() => {
      const style = getCurrentTheme();
      registeredMaps.forEach(m => {
        try { m.setMapStyle(style); } catch (e) {}
      });
    });

    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('DOMContentLoaded', init);
  
  // 暴露 API 供外部调用，并提供少量内部 helper 供适配器重用
  window.FootprintMap = {
    init: init,
    bootstrapMap: bootstrapMap,
    _renderFilters: renderFilters,
    _renderClusterToggle: renderClusterToggle,
    _onPopupReady: setupPopupEvents
  };
})();
