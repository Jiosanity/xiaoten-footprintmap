(function(){
  'use strict';

  // Minimal Mapbox adapter: load Mapbox GL JS + CSS dynamically and provide
  // window.loadMapboxAdapter() and window.renderMapWithMapbox(container, locations, token)

  function loadCss(href) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${href}"]`)) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = () => reject(new Error('Mapbox CSS load failed'));
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Mapbox script load failed'));
      document.head.appendChild(s);
    });
  }

  // 坐标转换： GCJ-02 <-> WGS84
  // 来源：常见实现（适合前端使用）
  function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
  }

  function gcj02towgs84(lng, lat) {
    if (outOfChina(lng, lat)) return [lng, lat];
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    const mgLat = lat + dLat;
    const mgLng = lng + dLng;
    return [lng * 2 - mgLng, lat * 2 - mgLat];
  }

  // WGS84 -> GCJ02
  function wgs84togcj02(lng, lat) {
    if (outOfChina(lng, lat)) return [lng, lat];
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLng = transformLng(lng - 105.0, lat - 35.0);
    const radLat = lat / 180.0 * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
    const mgLat = lat + dLat;
    const mgLng = lng + dLng;
    return [mgLng, mgLat];
  }

  // Escape for HTML
  const escapeHtml = str => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function buildMarkerHtml(point) {
    const classes = ['footprint-marker'];
    if (point.markerPreset) classes.push(`footprint-marker--${point.markerPreset}`);
    const style = point.markerStyle ? ` style="${point.markerStyle}"` : '';
    const span = document.createElement('span');
    span.className = classes.join(' ');
    if (point.markerStyle) span.setAttribute('style', point.markerStyle);
    span.title = point.name || '';
    return span;
  }

  function buildInfoWindow(point) {
    const inner = [`<div class="footprint-popup"><h4>${escapeHtml(point.name)}</h4>`];
    if (point.date) inner.push(`<p class="footprint-popup__meta">${escapeHtml(point.date)}</p>`);
    if (point.categories && point.categories.length) {
      inner.push(`<div class="footprint-popup__tags">${point.categories.map(c => `<span class=\"footprint-popup__tag\">${escapeHtml(c)}</span>`).join('')}</div>`);
    }
    if (point.description) inner.push(`<p>${escapeHtml(point.description)}</p>`);
    if (point.url) inner.push(`<div class="footprint-popup__links"><a class="footprint-popup__link" href="${escapeHtml(point.url)}" target="_blank" rel="noopener">${escapeHtml(point.urlLabel || '查看相关内容')}</a></div>`);
    if (point.photos && point.photos.length) {
      const needsNav = point.photos.length > 1;
      const nav = needsNav ?
        '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--prev">&#10094;</button>' +
        '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--next">&#10095;</button>' : '';
      const slides = point.photos.map((src, i) => `<figure class="footprint-popup__slide"><img src="${escapeHtml(src)}" loading="lazy" alt="${escapeHtml(point.name)}-${i+1}"></figure>`).join('');
      inner.push(`<div class="footprint-popup__photos"${needsNav ? ' data-carousel=\"true\"' : ''}>${nav}<div class="footprint-popup__track">${slides}</div></div>`);
    }
    inner.push('</div>');

    // 使用单层 AMap 风格类以复用 AMap 相关样式，但避免深层嵌套带来的宽度/滚动/阴影问题
    return `<div class="amap-info-content">${inner.join('')}</div>`;
  }

  async function ensureMapbox() {
    if (window.mapboxgl) return;
    const cssUrl = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    const jsUrl = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    await loadCss(cssUrl);
    await loadScript(jsUrl);
  }

  window.loadMapboxAdapter = async function() {
    if (window._mapboxAdapterLoaded) return;
    await ensureMapbox();
    window._mapboxAdapterLoaded = true;
  };

  window.renderMapWithMapbox = function(container, locations, token) {
    if (!window.mapboxgl) {
      container.innerHTML = '<div class="footprint-map__error">Mapbox GL 未加载</div>';
      return;
    }

    mapboxgl.accessToken = token;

    container.innerHTML = '';
    const mapCanvas = document.createElement('div');
    mapCanvas.className = 'footprint-map__canvas';
    mapCanvas.style.width = '100%';
    mapCanvas.style.height = '100%';
    container.appendChild(mapCanvas);

    const first = locations[0];
    const styleLight = 'mapbox://styles/mapbox/light-v10';
    const styleDark = 'mapbox://styles/mapbox/dark-v10';
    const style = document.documentElement.classList.contains('dark') ? styleDark : styleLight;

    const map = new mapboxgl.Map({ container: mapCanvas, style: style, center: [first.lng, first.lat], zoom: 4 });

    // Controls: place differently on mobile to avoid top toolbar overlap
    const navControl = new mapboxgl.NavigationControl({ showCompass: false });
    const scaleControl = new mapboxgl.ScaleControl({ maxWidth: 80, unit: 'metric' });

    function placeControls() {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const navPos = isMobile ? 'bottom-right' : 'top-right';
      const scalePos = isMobile ? 'bottom-left' : 'bottom-right';
      try { map.removeControl(navControl); } catch (e) {}
      try { map.removeControl(scaleControl); } catch (e) {}
      map.addControl(navControl, navPos);
      map.addControl(scaleControl, scalePos);
    }

    placeControls();
    // update on resize (debounced)
    let _fp_ctrl_resize_timer = null;
    window.addEventListener('resize', () => {
      clearTimeout(_fp_ctrl_resize_timer);
      _fp_ctrl_resize_timer = setTimeout(placeControls, 150);
    });

    // 使用 anchor 'bottom' 使弹窗向上展开（弹窗内容显示在 marker 之上）
    const popup = new mapboxgl.Popup({ closeOnClick: false, anchor: 'bottom', offset: [0, -10] });

    let allMarkers = [];
    let clusterMarkers = [];
    let markerData = locations;
    let clusterEnabled = true;

    function updateClusters() {
      allMarkers.forEach(m => m.remove());
      clusterMarkers.forEach(m => m.remove());
      allMarkers = [];
      clusterMarkers = [];

      const zoom = map.getZoom();
      const shouldCluster = clusterEnabled && zoom < 10;

      if (!shouldCluster) {
        markerData.forEach(point => {
          // 如果数据在中国坐标 GCJ-02，需要转换到 WGS84
          const [lng, lat] = gcj02towgs84(point.lng, point.lat);

          const el = buildMarkerHtml(point);
          const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.setDOMContent(createPopupNode(point)).setLngLat([lng, lat]).addTo(map);
          });
          allMarkers.push(marker);
        });
        return;
      }

      const gridSize = 80;
      const clusters = {};

      markerData.forEach(point => {
        const [lng, lat] = gcj02towgs84(point.lng, point.lat);
        const p = map.project([lng, lat]);
        const key = `${Math.floor(p.x / gridSize)}_${Math.floor(p.y / gridSize)}`;
        (clusters[key] = clusters[key] || []).push({ point, lng, lat });
      });

      Object.values(clusters).forEach(group => {
        if (group.length === 1) {
          const { point, lng, lat } = group[0];
          const el = buildMarkerHtml(point);
          const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.setDOMContent(createPopupNode(point)).setLngLat([lng, lat]).addTo(map);
          });
          allMarkers.push(marker);
        } else {
          const centerLng = group.reduce((s, g) => s + g.lng, 0) / group.length;
          const centerLat = group.reduce((s, g) => s + g.lat, 0) / group.length;
          const count = group.length;
          const size = count < 5 ? 38 : count < 10 ? 42 : 46;
          const gradient = count < 5 ? 'linear-gradient(135deg, rgba(6,190,182,0.75), rgba(72,177,191,0.75))' : count < 10 ? 'linear-gradient(135deg, rgba(94,231,223,0.75), rgba(6,190,182,0.75))' : 'linear-gradient(135deg, rgba(255,179,71,0.75), rgba(255,111,97,0.75))';
          const fontSize = count < 5 ? '13px' : count < 10 ? '14px' : '15px';
          const el = document.createElement('div');
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.background = gradient;
          el.style.borderRadius = '50%';
          el.style.border = '1px solid rgba(255,255,255,0.4)';
          el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.fontSize = fontSize;
          el.style.cursor = 'pointer';
          el.innerText = String(count);

          const marker = new mapboxgl.Marker({ element: el }).setLngLat([centerLng, centerLat]).addTo(map);
          el.addEventListener('click', () => map.easeTo({ center: [centerLng, centerLat], zoom: map.getZoom() + 2 }));
          clusterMarkers.push(marker);
        }
      });
    }

    function createPopupNode(point) {
      const div = document.createElement('div');
      div.innerHTML = buildInfoWindow(point);
      // 不在此处绑定图片打开逻辑，交由 FootprintMap._onPopupReady 统一处理，避免重复打开 viewer
      return div;
    }

    map.on('load', () => {
      updateClusters();
      map.on('zoomend', updateClusters);
      map.on('click', () => popup.remove());

      // Emit a short-lived adapter-ready signal so automation can wait for mapbox adapter initialization
      try {
        // console marker for automation harness
        console.log('MAPBOX_ADAPTER_READY');
      } catch (e) {}

      // filters
      const categories = [...new Set(locations.flatMap(l => l.categories))].filter(Boolean).sort();
      if (categories.length > 1) {
        // reuse footprintmap's renderFilters if present
        if (typeof window.FootprintMap !== 'undefined' && window.FootprintMap._renderFilters) {
          window.FootprintMap._renderFilters(container, categories, (cat) => {
            markerData = cat === 'all' ? locations : locations.filter(l => l.categories.includes(cat));
            updateClusters();
              // 过滤后自动调整视野至当前可见点集合（与 AMap 行为保持一致）
                  try {
                    if (!markerData || markerData.length === 0) return;
                    if (markerData.length === 1) {
                      // 单点时使用适度的 zoom 而非 fitBounds 导致最大放大
                      const p = markerData[0];
                      const [lng, lat] = gcj02towgs84(p.lng, p.lat);
                      const targetZoom = Math.min((map.getMaxZoom && map.getMaxZoom() - 2) || 14, 14);
                      map.easeTo({ center: [lng, lat], zoom: targetZoom });
                    } else {
                      const bounds = new mapboxgl.LngLatBounds();
                      markerData.forEach(p => {
                        const [lng, lat] = gcj02towgs84(p.lng, p.lat);
                        bounds.extend([lng, lat]);
                      });
                      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60 });
                    }
                  } catch (e) { /* ignore fit errors */ }
          });
        }
      } else {
        // fit to bounds，若只有一个点则使用适度 zoom 而非 fitBounds 导致过度放大
        if (locations.length === 1) {
          const p = locations[0];
          const [lng, lat] = gcj02towgs84(p.lng, p.lat);
          const targetZoom = Math.min((map.getMaxZoom && map.getMaxZoom() - 2) || 14, 14);
          map.easeTo({ center: [lng, lat], zoom: targetZoom });
        } else {
          const bounds = new mapboxgl.LngLatBounds();
          locations.forEach(p => {
            const [lng, lat] = gcj02towgs84(p.lng, p.lat);
            bounds.extend([lng, lat]);
          });
          if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60 });
        }
      }

      // cluster toggle UI reuse if available
      if (typeof window.FootprintMap !== 'undefined' && window.FootprintMap._renderClusterToggle) {
        window.FootprintMap._renderClusterToggle(container, (enabled) => {
          clusterEnabled = enabled;
          updateClusters();
        });
      }

      // 弹窗可见性：当弹窗添加到地图后，使其可见（若在边缘则平移）
      const originalAdd = popup.addTo.bind(popup);
      popup.addTo = function(m) {
        const res = originalAdd(m);
        try {
          ensurePopupVisible_Mapbox(map, popup);
          // 如果 FootprintMap 暴露了 popup-ready 的钩子，则调用以绑定轮播和灯箱事件
          try { if (window.FootprintMap && typeof window.FootprintMap._onPopupReady === 'function') window.FootprintMap._onPopupReady(); } catch(e){}
        } catch (e) {}
        return res;
      };

      // theme sync
      new MutationObserver(() => {
        const style = document.documentElement.classList.contains('dark') ? styleDark : styleLight;
        try { map.setStyle(style); } catch(e) {}
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    });

  // 确保 Mapbox popup 在可见区域（若位于边缘则平移地图）
  function ensurePopupVisible_Mapbox(mapInstance, popupInstance) {
    try {
      if (!mapInstance || !popupInstance || !popupInstance.getLngLat || !popupInstance.getElement) return;
      const lngLat = popupInstance.getLngLat();
      if (!lngLat) return;
      const popupEl = popupInstance.getElement();
      if (!popupEl) return;
      // 等待浏览器布局，确保 popup 尺寸可测量
      requestAnimationFrame(() => {
        try {
          const rect = mapInstance.getContainer().getBoundingClientRect();
          const popupRect = popupEl.getBoundingClientRect();
          const p = mapInstance.project([lngLat.lng, lngLat.lat]);

          const padding = 12; // 额外留白
          const topOverflow = popupRect.top - rect.top - padding; // <0 表示上方溢出
          const bottomOverflow = popupRect.bottom - rect.bottom + padding; // >0 表示下方溢出

          if (topOverflow < 0 || bottomOverflow > 0) {
            // 需要垂直平移。计算目标中心：将当前地图中心像素向上/下移动相同的像素量
            // 使 popup 完全可见
            const shiftY = (topOverflow < 0) ? topOverflow : bottomOverflow;
            const newCenterPixel = [rect.width / 2, rect.height / 2 + shiftY];
            const newCenter = mapInstance.unproject(newCenterPixel);
            if (newCenter) mapInstance.easeTo({ center: newCenter });
          }
        } catch (e) { /* ignore layout errors */ }
      });
    } catch (e) { /* ignore */ }
  }

  };

  // 导出坐标转换函数供外部使用
  window.gcj02towgs84 = gcj02towgs84;
  window.wgs84togcj02 = wgs84togcj02;

})();
