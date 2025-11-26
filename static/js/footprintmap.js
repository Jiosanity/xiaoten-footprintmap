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
  let photoPopupDelegateRegistered = false;
  let suppressMapClose = false;

  // 注入自定义控件的样式
  const injectStyles = () => {
    const styleId = 'footprint-map-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 统一的控件容器：包含全屏、重载、放大、缩小 */
      .footprint-map-ctrls {
        position: absolute;
        z-index: 150;
        display: flex;
        flex-direction: column;
        gap: 8px;
        right: 20px;
        transition: all 0.3s ease;
      }
      
      /* PC端：停靠在右上角 */
      .footprint-map-ctrls.is-desktop { top: 20px; }
      
      /* 移动端：停靠在右下角 */
      .footprint-map-ctrls.is-mobile { bottom: 30px; }

      .footprint-ctrl-btn {
        width: 32px;
        height: 32px;
        background: #fff;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #555;
        transition: background 0.2s, color 0.2s;
        padding: 0;
      }
      .footprint-ctrl-btn:hover { background: #f5f5f5; color: #000; }
      .footprint-ctrl-btn svg { width: 18px; height: 18px; fill: currentColor; }
      
      html.dark .footprint-ctrl-btn {
        background: #282828;
        color: #ccc;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      }
      html.dark .footprint-ctrl-btn:hover { background: #333; color: #fff; }

      /* 全屏兼容样式 (Fallback for iOS) */
      .footprint-map.is-fullscreen {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 99999 !important;
        margin: 0 !important;
        border-radius: 0 !important;
        background: #fff;
      }
      html.dark .footprint-map.is-fullscreen { background: #1a1a1a; }
    `;
    document.head.appendChild(style);
  };

  const escapeHtml = str => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatDate = raw => {
    if (!raw) return '';
    // 原有的日期转换逻辑注释掉
    // const date = new Date(raw);
    // return isNaN(date.getTime()) ? String(raw) : dateFormatter.format(date);
    
    // 新增：直接返回原始字符串
    return String(raw);
  };

  const getCurrentTheme = () => 
    document.documentElement.classList.contains('dark') ? MAP_STYLES.dark : MAP_STYLES.light;

  function init() {
    injectStyles(); // 初始化时注入样式
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

  // 动态注入 mapbox-adapter.js
  let _mapboxAdapterLoader = null;
  function ensureMapboxAdapterScript() {
    if (_mapboxAdapterLoader) return _mapboxAdapterLoader;
    _mapboxAdapterLoader = new Promise((resolve, reject) => {
      // 尝试查找当前脚本的路径以拼接 adapter 路径
      const scriptTags = Array.from(document.getElementsByTagName('script'));
      const selfScript = scriptTags.find(s => s.src && s.src.indexOf('/js/footprintmap.js') !== -1);
      const base = selfScript ? selfScript.src.replace(/\/[^/]*$/, '') : '';
      const adapterSrc = base ? (base + '/mapbox-adapter.js') : (window.location.origin + (window.__HUGO_BASEURL__ || '') + '/js/mapbox-adapter.js');
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
        // 注意：这里移除了 AMap.ToolBar，改用自定义控件以解决布局问题
        AMap.plugin(['AMap.Scale'], resolve);
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

    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    // 1. 初始化地图
    const map = new AMap.Map(mapCanvas, {
      zoom: 4, 
      center: [locations[0].lng, locations[0].lat],
      mapStyle: getCurrentTheme(),
      viewMode: '2D',
      rotateEnable: false,
      pitchEnable: false
    });

    let markerData = locations;

    // 2. 定义通用视野自适应函数
    const fitViewToPoints = (points) => {
      if (!points || points.length === 0) return;
      if (points.length === 1) {
        map.setZoomAndCenter(10, [points[0].lng, points[0].lat]);
        return;
      }
      const path = points.map(p => [p.lng, p.lat]);
      const hiddenBounds = new AMap.Polyline({ 
        path: path, 
        strokeOpacity: 0, 
        bubble: true,     
        map: map          
      });
      // 设置视野：上右下左留出 60-80px 的边距
      map.setFitView([hiddenBounds], false, [60, 80, 60, 80]);
      map.remove(hiddenBounds);
    };

    // 渲染统一的控制栏 (全屏 + 重载 + 放大 + 缩小) - 替代原有的 ToolBar
    // ----------------------------------------------------
    const renderControls = () => {
      const wrapper = document.createElement('div');
      wrapper.className = `footprint-map-ctrls ${isMobile ? 'is-mobile' : 'is-desktop'}`;
      
      const icons = {
        full: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
        exitFull: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
        reload: '<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',
        plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
        minus: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>'
      };

      // 1. 全屏按钮 (含 iOS/Fallback 逻辑)
      const btnFull = document.createElement('button');
      btnFull.className = 'footprint-ctrl-btn';
      btnFull.title = '全屏显示';
      btnFull.innerHTML = icons.full;
      
      btnFull.onclick = function() {
        this.blur(); // 失去焦点防止页面跳动

        // 辅助函数：切换 CSS 伪全屏状态 (针对 iOS/Safari)
        const togglePseudoFullscreen = () => {
          const isNowFull = container.classList.toggle('is-fullscreen');
          btnFull.innerHTML = isNowFull ? icons.exitFull : icons.full;
          btnFull.title = isNowFull ? '退出全屏' : '全屏显示';
          // 关键：通知地图重绘
          setTimeout(() => map.resize(), 100);
        };

        // 优先尝试标准 API
        if (container.requestFullscreen) {
          if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
              console.warn('Fullscreen API failed, falling back to CSS mode', err);
              togglePseudoFullscreen();
            });
          } else {
            document.exitFullscreen();
          }
        } else {
          // iOS Safari 或不支持 API 的浏览器
          togglePseudoFullscreen();
        }
      };

      // 监听原生全屏事件 (确保状态同步)
      document.addEventListener('fullscreenchange', () => {
        const isFull = document.fullscreenElement === container;
        if (isFull) {
            container.classList.add('is-fullscreen');
            btnFull.innerHTML = icons.exitFull;
            btnFull.title = '退出全屏';
        } else {
            // 只有在支持 API 的环境下才自动移除 class，避免干扰伪全屏模式
            if (container.requestFullscreen) {
                container.classList.remove('is-fullscreen');
                btnFull.innerHTML = icons.full;
                btnFull.title = '全屏显示';
                setTimeout(() => map.resize(), 100);
            }
        }
      });

      // 2. 重载视图按钮
      const btnReload = document.createElement('button');
      btnReload.className = 'footprint-ctrl-btn';
      btnReload.title = '重置视野';
      btnReload.innerHTML = icons.reload;
      btnReload.onclick = function() {
        this.blur(); // 关键修复：失去焦点
        fitViewToPoints(markerData);
      };

      // 3. 放大按钮
      const btnZoomIn = document.createElement('button');
      btnZoomIn.className = 'footprint-ctrl-btn';
      btnZoomIn.title = '放大';
      btnZoomIn.innerHTML = icons.plus;
      btnZoomIn.onclick = function() {
        this.blur(); // 关键修复：失去焦点
        map.zoomIn();
      };

      // 4. 缩小按钮
      const btnZoomOut = document.createElement('button');
      btnZoomOut.className = 'footprint-ctrl-btn';
      btnZoomOut.title = '缩小';
      btnZoomOut.innerHTML = icons.minus;
      btnZoomOut.onclick = function() {
        this.blur(); // 关键修复：失去焦点
        map.zoomOut();
      };

      wrapper.append(btnFull, btnReload, btnZoomIn, btnZoomOut);
      container.appendChild(wrapper);
    };

    renderControls();

    map.plugin(['AMap.Scale'], () => {
      // 比例尺放在左下角，避免与右下角的控件冲突
      const scalePos = { bottom: '25px', left: '20px' };
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
        try { ensureInfoWindowVisible_AMap(map, [point.lng, point.lat]); } catch (err) { /* ignore */ }
        suppressMapClose = false;
      }, 0);
    };

    function ensureInfoWindowVisible_AMap(mapInstance, lnglat) {
        try {
          if (!mapInstance || !mapInstance.lngLatToContainer || !mapInstance.containerToLngLat || !mapInstance.getSize) {
            try { mapInstance.setCenter(lnglat); } catch (e) { /* best-effort */ }
            return;
          }
          const pixel = mapInstance.lngLatToContainer(lnglat);
          const size = mapInstance.getSize();
          const desiredX = Math.floor(size.width / 2);
          const desiredY = Math.floor(size.height * 0.70);
          const dx = pixel.x - desiredX;
          const dy = pixel.y - desiredY;
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
          const centerPixel = { x: Math.floor(size.width / 2 + dx), y: Math.floor(size.height / 2 + dy) };
          const newCenter = mapInstance.containerToLngLat([centerPixel.x, centerPixel.y]);
          if (newCenter && newCenter.lng !== undefined) {
            try { mapInstance.setCenter(newCenter); } catch (e) { /* best-effort */ }
          }
        } catch (e) { /* ignore */ }
    }

    let allMarkers = [];
    let clusterMarkers = [];
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
    
    // 3. 筛选逻辑：使用新的 fitViewToPoints
    if (categories.length > 1) {
      renderFilters(container, categories, (cat) => {
        infoWindow.close();
        markerData = cat === FILTER_ALL ? locations : locations.filter(l => l.categories.includes(cat));
        updateClusters();
        // 关键点：切换标签时，调用通用函数适应视野
        fitViewToPoints(markerData);
      });
    }

    renderClusterToggle(container, (enabled) => {
      clusterEnabled = enabled;
      updateClusters();
    });

    registerThemeSync(map);

    // 4. 初始加载完成时，立刻适应所有点的视野
    fitViewToPoints(locations);
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

  // 导出给 Mapbox adapter 或其它外部脚本复用
  if (window.FootprintMap) {
    try {
      window.FootprintMap._buildInfoWindow = buildInfoWindow;
      window.FootprintMap._escapeHtml = escapeHtml;
    } catch (e) {}
  }

  function setupPopupEvents() {
    // 使用事件委托一次性处理 popup 内的图片点击与轮播按钮
    if (!photoPopupDelegateRegistered) {
      document.addEventListener('click', (e) => {
        // 轮播左右按钮（委托）
        const btn = e.target.closest('.footprint-popup__photos-btn');
        if (btn && btn.closest('.footprint-popup')) {
          e.stopPropagation();
          const carousel = btn.closest('.footprint-popup__photos');
          if (!carousel) return;
          const track = carousel.querySelector('.footprint-popup__track');
          if (!track) return;
          const dir = btn.classList.contains('footprint-popup__photos-btn--next') ? 1 : -1;
          const slides = Array.from(track.querySelectorAll('.footprint-popup__slide'));
          if (!slides.length) return;
          const current = Math.round(track.scrollLeft);
          let targetLeft = null;
          if (dir > 0) {
            const next = slides.find(s => Math.round(s.offsetLeft) > current + 5);
            targetLeft = next ? next.offsetLeft : track.scrollWidth - track.clientWidth;
          } else {
            const prev = slides.slice().reverse().find(s => Math.round(s.offsetLeft) < current - 5);
            targetLeft = prev ? prev.offsetLeft : 0;
          }
          targetLeft = Math.max(0, Math.min(targetLeft, track.scrollWidth - track.clientWidth));
          track.scrollTo({ left: Math.floor(targetLeft), behavior: 'smooth' });
          return;
        }

        // 图片点击（委托）
        const img = e.target.closest('.footprint-popup__slide img');
        if (img && img.closest('.footprint-popup')) {
          e.preventDefault();
          e.stopPropagation();
          const popup = img.closest('.footprint-popup');
          const slides = Array.from(popup.querySelectorAll('.footprint-popup__slide img'));
          const images = slides.map(s => s.src);
          const idx = slides.indexOf(img);
          openPhotoViewer(images, idx, img.alt);
        }
      }, true);
      photoPopupDelegateRegistered = true;
    }

    requestAnimationFrame(() => {
      const popup = document.querySelector('.footprint-popup');
      if (!popup) return;
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

  // viewerState 保存当前查看器的图片数组与索引
  const viewerState = { images: [], index: 0 };

  function openPhotoViewer(imagesOrSrc, indexOrAlt, maybeAlt) {
    // 参数兼容处理
    let images = [];
    let idx = 0;
    let alt = '';
    if (Array.isArray(imagesOrSrc)) {
      images = imagesOrSrc;
      idx = typeof indexOrAlt === 'number' ? indexOrAlt : 0;
      alt = maybeAlt || '';
    } else {
      images = [imagesOrSrc];
      idx = 0;
      alt = indexOrAlt || '';
    }

    // 1. 创建 DOM (如果不存在)
    if (!photoViewer) {
      photoViewer = document.createElement('div');
      photoViewer.className = 'footprint-photo-viewer';
      photoViewer.innerHTML = `
        <div class="footprint-photo-viewer__mask"></div>
        <div class="footprint-photo-viewer__dialog">
          <button type="button" class="footprint-photo-viewer__close">&times;</button>
          <button type="button" class="footprint-photo-viewer__prev" aria-label="上一张">&#10094;</button>
          <img alt="" />
          <button type="button" class="footprint-photo-viewer__next" aria-label="下一张">&#10095;</button>
        </div>`;
      
      // 注意：这里先不 appendChild，后面统一处理
      
      const imgEl = photoViewer.querySelector('img');
      const prevBtn = photoViewer.querySelector('.footprint-photo-viewer__prev');
      const nextBtn = photoViewer.querySelector('.footprint-photo-viewer__next');
      photoViewer._els = { img: imgEl, prevBtn, nextBtn };

      const close = () => {
        photoViewer.classList.remove('is-visible');
        document.documentElement.classList.remove('footprint-photo-viewer-open');
        // 关闭时，如果不处于全屏模式，建议把 viewer 归还给 body，避免层级混乱
        if (!document.fullscreenElement && photoViewer.parentElement !== document.body) {
           document.body.appendChild(photoViewer);
        }
      };

      photoViewer.addEventListener('click', e => {
        if (e.target === photoViewer || e.target.classList.contains('footprint-photo-viewer__mask') ||
            e.target.classList.contains('footprint-photo-viewer__close')) close();
      });

      function render() {
        const img = photoViewer._els.img;
        img.src = viewerState.images[viewerState.index] || '';
        img.alt = alt || '';
        if (viewerState.images.length <= 1) {
          photoViewer._els.prevBtn.style.display = 'none';
          photoViewer._els.nextBtn.style.display = 'none';
        } else {
          photoViewer._els.prevBtn.style.display = '';
          photoViewer._els.nextBtn.style.display = '';
        }
      }

      function showPrev() {
        if (viewerState.images.length <= 1) return;
        viewerState.index = (viewerState.index - 1 + viewerState.images.length) % viewerState.images.length;
        render();
      }

      function showNext() {
        if (viewerState.images.length <= 1) return;
        viewerState.index = (viewerState.index + 1) % viewerState.images.length;
        render();
      }

      document.addEventListener('keydown', e => {
        if (!photoViewer.classList.contains('is-visible')) return;
        if (e.key === 'Escape') return close();
        if (e.key === 'ArrowLeft') showPrev();
        if (e.key === 'ArrowRight') showNext();
      });

      prevBtn.addEventListener('click', e => { e.stopPropagation(); showPrev(); });
      nextBtn.addEventListener('click', e => { e.stopPropagation(); showNext(); });
      
      photoViewer._render = render;
      photoViewer._showPrev = showPrev;
      photoViewer._showNext = showNext;
    }

    // 2. 关键修复：动态挂载 DOM
    // 如果当前有原生全屏元素（电脑端），必须把 viewer 挂载到全屏元素内部才能看见
    // 如果是 iOS 伪全屏或普通模式，挂载到 body 即可
    const targetParent = document.fullscreenElement || document.body;
    if (photoViewer.parentElement !== targetParent) {
        targetParent.appendChild(photoViewer);
    }

    // 3. 更新数据并显示
    viewerState.images = images;
    viewerState.index = Math.max(0, Math.min(idx, images.length - 1));
    if (photoViewer._render) photoViewer._render();
    
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
  
  // 暴露 API
  window.FootprintMap = {
    init: init,
    bootstrapMap: bootstrapMap,
    _renderFilters: renderFilters,
    _renderClusterToggle: renderClusterToggle,
    _onPopupReady: setupPopupEvents
  };
})();