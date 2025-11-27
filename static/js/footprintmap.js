/**
 * Footprint Map Core (AMap Only Version)
 * Author: Xiaoten(www.xiaoten.com)
 * License: MIT
 * Date: 2025-11-27
 * Update: Added iOS scroll fix, auto-hide arrows, and mobile panning fix.
 */

(function () {
    'use strict';

    // 1. 配置
    const CONFIG = {
        MARKER_STYLES: {
            sunset: 'linear-gradient(135deg, #ffb347, #ff6f61)',
            ocean: 'linear-gradient(135deg, #06beb6, #48b1bf)',
            violet: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
            forest: 'linear-gradient(135deg, #5ee7df, #39a37c)',
            amber: 'linear-gradient(135deg, #f6d365, #fda085)',
            citrus: 'linear-gradient(135deg, #fdfb8f, #a1ffce)'
        },
        MARKER_PRESETS: ['sunset', 'ocean', 'violet', 'forest', 'amber', 'citrus'],
        MAP_STYLES: {
            amap: {
                light: 'amap://styles/whitesmoke',
                dark: 'amap://styles/dark'
            }
        },
        MARKER_SIZE: 18,
        GRID_SIZE: 80,
        // [新增] 垂直偏移量：让 Marker 出现在屏幕中心下方的距离（px），以便完整显示上方弹窗
        OFFSET_DESKTOP: 100,
        OFFSET_MOBILE: 140
    };

    // --- 工具类 ---
    const Utils = {
        escapeHtml: (str) => String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]),
        isDarkMode: () => document.documentElement.classList.contains('dark'),
        parseCoords: (val) => {
            if (Array.isArray(val) && val.length >= 2) return { lng: parseFloat(val[0]), lat: parseFloat(val[1]) };
            if (typeof val === 'string') {
                const p = val.split(/[,，\s]+/).map(parseFloat).filter(n => !isNaN(n));
                return p.length >= 2 ? { lng: p[0], lat: p[1] } : null;
            }
            return null;
        },
        sanitizeLocation: (item, index) => {
            const coords = Utils.parseCoords(item.coordinates || item.coordinate || item.coords || item.position);
            if (!coords) return null;
            const markerPreset = item.markerPreset || CONFIG.MARKER_PRESETS[index % CONFIG.MARKER_PRESETS.length];
            let cats = item.categories || item.category || item.tags || ['未分类'];
            if (typeof cats === 'string') cats = [cats];
            return {
                id: `fp-${index}`,
                name: item.name || '未命名地点',
                lat: coords.lat,
                lng: coords.lng,
                description: item.description || '',
                date: item.date ? String(item.date) : '',
                url: item.url || '',
                urlLabel: item.urlLabel || '查看相关内容',
                photos: Array.isArray(item.photos) ? item.photos : [],
                categories: cats,
                markerPreset: markerPreset,
                markerStyle: CONFIG.MARKER_STYLES[markerPreset] ? `background:${CONFIG.MARKER_STYLES[markerPreset]}` : (item.markerStyle || '')
            };
        }
    };

    // --- Popup HTML 生成 ---
    const PopupBuilder = {
        build: (point) => {
            const h = Utils.escapeHtml;
            let html = `<div class="footprint-popup"><h4>${h(point.name)}</h4>`;
            if (point.date) html += `<p class="footprint-popup__meta">${h(point.date)}</p>`;
            if (point.categories.length) {
                html += `<div class="footprint-popup__tags">${point.categories.map(c => `<span class="footprint-popup__tag">${h(c)}</span>`).join('')}</div>`;
            }
            if (point.description) html += `<p>${h(point.description)}</p>`;
            if (point.url) {
                const label = point.urlLabel || '查看相关内容';
                html += `<div class="footprint-popup__links"><a class="footprint-popup__link" href="${h(point.url)}" target="_blank" rel="noopener">${h(label)}</a></div>`;
            }
            if (point.photos.length) {
                // 仅当图片数量 > 1 时生成按钮 HTML，后续 JS 还会检查实际宽度是否溢出
                const nav = point.photos.length > 1 ?
                    '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--prev">&#10094;</button>' +
                    '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--next">&#10095;</button>' : '';
                const slides = point.photos.map((src, i) =>
                    `<figure class="footprint-popup__slide"><img src="${h(src)}" loading="lazy" alt="${h(point.name)}-${i+1}"></figure>`
                ).join('');
                html += `<div class="footprint-popup__photos"${point.photos.length > 1 ? ' data-carousel="true"' : ''}>${nav}<div class="footprint-popup__track">${slides}</div></div>`;
            }
            html += `</div>`;
            return html;
        }
    };

    // --- 灯箱组件 ---
    const PhotoViewer = (() => {
        let el, imgEl, prevBtn, nextBtn;
        let state = { images: [], index: 0 };
        let isInit = false;

        function init() {
            if (isInit) return;
            el = document.createElement('div');
            el.className = 'footprint-photo-viewer';
            el.innerHTML = `
                <div class="footprint-photo-viewer__mask"></div>
                <div class="footprint-photo-viewer__dialog">
                    <button type="button" class="footprint-photo-viewer__close">&times;</button>
                    <button type="button" class="footprint-photo-viewer__prev">&#10094;</button>
                    <img src="" alt="" />
                    <button type="button" class="footprint-photo-viewer__next">&#10095;</button>
                </div>`;
            document.body.appendChild(el);
            imgEl = el.querySelector('img');
            prevBtn = el.querySelector('.footprint-photo-viewer__prev');
            nextBtn = el.querySelector('.footprint-photo-viewer__next');

            el.addEventListener('click', (e) => {
                if (e.target === el || e.target.classList.contains('footprint-photo-viewer__mask') || e.target.classList.contains('footprint-photo-viewer__close')) close();
            });
            prevBtn.onclick = (e) => { e.stopPropagation(); prev(); };
            nextBtn.onclick = (e) => { e.stopPropagation(); next(); };
            document.addEventListener('keydown', (e) => {
                if (!el.classList.contains('is-visible')) return;
                if (e.key === 'Escape') close();
                if (e.key === 'ArrowLeft') prev();
                if (e.key === 'ArrowRight') next();
            });
            isInit = true;
        }

        function update() {
            if (!state.images.length) return;
            imgEl.src = state.images[state.index];
            prevBtn.style.display = state.images.length > 1 ? '' : 'none';
            nextBtn.style.display = state.images.length > 1 ? '' : 'none';
        }

        function open(images, idx = 0) {
            init();
            state.images = images;
            state.index = idx;
            update();
            const fs = document.fullscreenElement;
            if (fs && el.parentElement !== fs) fs.appendChild(el);
            else if (!fs && el.parentElement !== document.body) document.body.appendChild(el);
            el.classList.add('is-visible');
            document.documentElement.classList.add('footprint-photo-viewer-open');
        }

        function close() {
            el.classList.remove('is-visible');
            document.documentElement.classList.remove('footprint-photo-viewer-open');
        }
        function prev() { state.index = (state.index - 1 + state.images.length) % state.images.length; update(); }
        function next() { state.index = (state.index + 1) % state.images.length; update(); }
        return { open };
    })();

    // 全局事件委托 (Photo / Carousel)
    document.addEventListener('click', (e) => {
        // [修复 1] 轮播点击逻辑：使用基于索引的滚动，解决 iOS 空白溢出
        if (e.target.matches('.footprint-popup__photos-btn')) {
            e.stopPropagation();
            const track = e.target.parentElement.querySelector('.footprint-popup__track');
            const slides = track ? Array.from(track.querySelectorAll('.footprint-popup__slide')) : [];

            if (track && slides.length > 0) {
                const dir = e.target.classList.contains('footprint-popup__photos-btn--next') ? 1 : -1;

                // 计算单张幻灯片宽度（含gap）
                // 优先通过两个 slide 的偏移差计算，因为这样包含 CSS 中的 gap
                const slideWidth = slides.length > 1
                    ? (slides[1].offsetLeft - slides[0].offsetLeft)
                    : (slides[0].offsetWidth + 8); // fallback: width + 8px gap

                const currentScroll = track.scrollLeft;
                // 计算当前大概是第几张
                const currentIndex = Math.round(currentScroll / slideWidth);

                // 计算目标索引，并强制限制在合法范围内，防止滚到空白处
                let targetIndex = currentIndex + dir;
                targetIndex = Math.max(0, Math.min(targetIndex, slides.length - 1));

                // 滚动到精确位置
                track.scrollTo({ left: targetIndex * slideWidth, behavior: 'smooth' });
            }
            return;
        }

        if (e.target.matches('.footprint-popup__slide img')) {
            e.stopPropagation();
            const track = e.target.closest('.footprint-popup__track');
            const images = Array.from(track.querySelectorAll('img')).map(i => i.src);
            const idx = Array.from(track.querySelectorAll('img')).indexOf(e.target);
            PhotoViewer.open(images, idx);
        }
    }, true);

    // --- AMap Engine ---
    class AMapEngine {
        constructor(container, apiKey) {
            this.container = container;
            this.apiKey = apiKey;
            this.map = null;
            this.markers = [];
            this.clusterMarkers = [];
            this.clusterEnabled = true;
            this.markerData = [];
            this.infoWindow = null;
            this.ignoreMapClick = false;
        }

        async load() {
            if (window.AMap) return;
            return new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = `https://webapi.amap.com/maps?v=2.0&key=${this.apiKey}`;
                s.onload = () => { window._AMapSecurityConfig = { securityJsCode: '' }; resolve(); };
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        init(locations) {
            const div = document.createElement('div');
            div.className = 'footprint-map__canvas';
            this.container.appendChild(div);

            this.map = new AMap.Map(div, {
                zoom: 4, center: [locations[0].lng, locations[0].lat],
                mapStyle: Utils.isDarkMode() ? CONFIG.MAP_STYLES.amap.dark : CONFIG.MAP_STYLES.amap.light,
                viewMode: '3D', // 强制使用 3D 引擎以支持自定义样式
                pitch: 0,       // 视角设为 0，保持垂直俯视（2D视觉效果）
                rotateEnable: false, 
                pitchEnable: false
            });

            AMap.plugin(['AMap.Scale', 'AMap.MoveAnimation'], () => {
                this.map.addControl(new AMap.Scale({ position: { bottom: '25px', left: '20px' } }));
            });

            // [修复 3] 禁用 autoMove，防止与手动 panTo 冲突
            this.infoWindow = new AMap.InfoWindow({
                anchor: 'bottom-center',
                offset: new AMap.Pixel(0, 0),
                autoMove: false,
                closeWhenClickMap: false
            });

            this.markerData = locations;

            this.updateClusters();
            this.map.on('zoomend', () => this.updateClusters());

            this.map.on('click', () => {
                if (this.ignoreMapClick) return;
                this.infoWindow.close();
            });

            this.fitView();

            new MutationObserver(() => {
                this.map.setMapStyle(Utils.isDarkMode() ? CONFIG.MAP_STYLES.amap.dark : CONFIG.MAP_STYLES.amap.light);
            }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

            return {
                fitView: () => this.fitView(),
                zoomIn: () => this.map.zoomIn(),
                zoomOut: () => this.map.zoomOut(),
                resize: () => this.map.resize(),
                setClusterEnabled: (enabled) => { this.clusterEnabled = enabled; this.updateClusters(); },
                updateData: (data) => {
                    this.infoWindow.close(); // 筛选数据时关闭弹窗
                    this.markerData = data;
                    this.updateClusters();
                    this.fitView();
                }
            };
        }

        updateClusters() {
            this.markers.forEach(m => this.map.remove(m));
            this.clusterMarkers.forEach(m => this.map.remove(m));
            this.markers = [];
            this.clusterMarkers = [];

            const zoom = this.map.getZoom();
            const shouldCluster = this.clusterEnabled && zoom < 10;

            if (!shouldCluster) {
                this.markerData.forEach(pt => this.createMarker(pt));
                return;
            }

            const clusters = {};
            this.markerData.forEach(pt => {
                const pixel = this.map.lngLatToContainer([pt.lng, pt.lat]);
                const key = `${Math.floor(pixel.x / CONFIG.GRID_SIZE)}_${Math.floor(pixel.y / CONFIG.GRID_SIZE)}`;
                (clusters[key] = clusters[key] || []).push(pt);
            });

            Object.values(clusters).forEach(points => {
                if (points.length === 1) this.createMarker(points[0]);
                else this.createClusterMarker(points);
            });
        }

        createMarker(pt) {
            const content = `<div class="footprint-marker footprint-marker--${pt.markerPreset}" style="${pt.markerStyle}"></div>`;
            const marker = new AMap.Marker({
                position: [pt.lng, pt.lat],
                content: content,
                offset: new AMap.Pixel(-9, -9),
                map: this.map
            });

            marker.on('click', () => {
                this.ignoreMapClick = true;
                setTimeout(() => { this.ignoreMapClick = false; }, 200);

                this.infoWindow.setContent(PopupBuilder.build(pt));
                this.infoWindow.open(this.map, [pt.lng, pt.lat]);

                // [修复 2] 检查内容是否溢出，如果不需要滚动则隐藏箭头
                setTimeout(() => {
                    const popupEl = this.container.querySelector('.footprint-popup');
                    if (popupEl) {
                        const track = popupEl.querySelector('.footprint-popup__track');
                        const btns = popupEl.querySelectorAll('.footprint-popup__photos-btn');
                        // 逻辑：如果 scrollWidth (内容宽) <= clientWidth (可视宽)，说明没溢出，隐藏按钮
                        // 加 2px 缓冲防止计算误差
                        if (track && btns.length > 0 && track.scrollWidth <= track.clientWidth + 2) {
                            btns.forEach(btn => btn.style.display = 'none');
                        }
                    }
                }, 50); // 延时等待 DOM 渲染

                // [修复 3] 强制手动平移 (解决移动端切换 Marker 不动的问题)
                const isMobile = window.innerWidth < 640;
                const offsetY = isMobile ? CONFIG.OFFSET_MOBILE : CONFIG.OFFSET_DESKTOP;
                const pixel = this.map.lngLatToContainer([pt.lng, pt.lat]);
                // 目标中心点在 Marker 所在像素位置的上方 Y 轴 offsetY 处
                const targetPixel = new AMap.Pixel(pixel.x, pixel.y - offsetY);
                const newCenter = this.map.containerToLngLat(targetPixel);
                this.map.panTo(newCenter);
            });
            this.markers.push(marker);
        }

        createClusterMarker(points) {
            const count = points.length;
            const centerLng = points.reduce((s, p) => s + p.lng, 0) / count;
            const centerLat = points.reduce((s, p) => s + p.lat, 0) / count;

            const [size, gradient, fontSize] = count < 5
                ? [38, 'linear-gradient(135deg, rgba(6,190,182,0.75), rgba(72,177,191,0.75))', '13px']
                : count < 10
                ? [42, 'linear-gradient(135deg, rgba(94,231,223,0.75), rgba(6,190,182,0.75))', '14px']
                : [46, 'linear-gradient(135deg, rgba(255,179,71,0.75), rgba(255,111,97,0.75))', '15px'];

            const content = `<div style="width:${size}px;height:${size}px;background:${gradient};border-radius:50%;border:1px solid rgba(255,255,255,0.4);box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${fontSize};cursor:pointer">${count}</div>`;

            const marker = new AMap.Marker({
                position: [centerLng, centerLat],
                content: content,
                offset: new AMap.Pixel(-size/2, -size/2),
                map: this.map
            });

            marker.on('click', () => {
                this.ignoreMapClick = true;
                setTimeout(() => { this.ignoreMapClick = false; }, 200);
                this.map.setZoomAndCenter(this.map.getZoom() + 2, [centerLng, centerLat]);
            });
            this.clusterMarkers.push(marker);
        }

        fitView() {
            if (!this.markerData.length) return;
            const path = this.markerData.map(p => [p.lng, p.lat]);
            const poly = new AMap.Polyline({ path: path, strokeOpacity: 0, map: this.map });
            this.map.setFitView([poly], false, [60, 80, 60, 80]);
            this.map.remove(poly);
        }
    }

    // --- 主加载流程 ---
    async function initMap(container) {
        const { json: dataUrl, amapKey: apiKey } = container.dataset;

        if (!apiKey) {
            container.innerHTML = `<div class="footprint-map__error">配置错误：缺少 API Key (data-amap-key)</div>`;
            return;
        }

        try {
            const res = await fetch(dataUrl);
            const raw = await res.json();
            const list = (raw.locations || raw).map(Utils.sanitizeLocation).filter(Boolean);

            const engine = new AMapEngine(container, apiKey);
            await engine.load();
            const controls = engine.init(list);

            renderUI(container, list, controls);
        } catch (e) {
            container.innerHTML = `<div class="footprint-map__error">加载失败: ${e.message}</div>`;
        } finally {
            container.classList.remove('footprint-map--loading');
        }
    }

    // 渲染 UI (筛选器 + 控件)
    function renderUI(container, allData, controls) {
        // 1. 筛选器
        const cats = [...new Set(allData.flatMap(d => d.categories))].sort();
        if (cats.length > 1) {
            const wrap = document.createElement('div');
            wrap.className = 'footprint-map__filters';
            const mkBtn = (txt, val) => {
                const b = document.createElement('button');
                b.className = `footprint-map__filter-btn${val === 'all' ? ' is-active' : ''}`;
                b.textContent = txt;
                b.onclick = () => {
                    wrap.querySelectorAll('.is-active').forEach(e => e.classList.remove('is-active'));
                    b.classList.add('is-active');
                    const filtered = val === 'all' ? allData : allData.filter(d => d.categories.includes(val));
                    controls.updateData(filtered);
                };
                wrap.appendChild(b);
            };
            mkBtn('全部足迹', 'all');
            cats.forEach(c => mkBtn(c, c));
            container.appendChild(wrap);
        }

        // 2. 地图控件 (全屏/重置/缩放)
        const ctrlWrap = document.createElement('div');
        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        ctrlWrap.className = `footprint-map-ctrls ${isMobile ? 'is-mobile' : 'is-desktop'}`;

        const icons = {
            full: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
            exit: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
            reset: '<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',
            plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
            minus: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>'
        };

        const addBtn = (html, act) => {
            const b = document.createElement('button');
            b.className = 'footprint-ctrl-btn';
            b.innerHTML = html;
            b.onclick = (e) => { e.currentTarget.blur(); act(e, b); };
            ctrlWrap.appendChild(b);
        };

        addBtn(icons.full, (e, btn) => {
            const full = container.classList.toggle('is-fullscreen');
            btn.innerHTML = full ? icons.exit : icons.full;
            setTimeout(() => controls.resize(), 100);
            if(full && container.requestFullscreen) container.requestFullscreen().catch(()=>{});
            else if(!full && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
        });
        document.addEventListener('fullscreenchange', () => {
             const isFull = document.fullscreenElement === container;
             container.classList.toggle('is-fullscreen', isFull);
             setTimeout(() => controls.resize(), 100);
        });

        addBtn(icons.reset, () => controls.fitView());
        addBtn(icons.plus, () => controls.zoomIn());
        addBtn(icons.minus, () => controls.zoomOut());
        container.appendChild(ctrlWrap);

        // 3. 集群开关
        const togWrap = document.createElement('div');
        togWrap.className = 'footprint-map__cluster-toggle';

        const label = document.createElement('span');
        label.className = 'toggle-label';
        label.textContent = '集群显示';

        const btn = document.createElement('button');
        btn.className = 'toggle-switch';
        btn.innerHTML = '<span class="toggle-knob"></span>';

        let enabled = true;
        btn.onclick = () => {
            enabled = !enabled;
            btn.classList.toggle('is-off', !enabled);
            controls.setClusterEnabled(enabled);
        };

        togWrap.append(label, btn);
        container.appendChild(togWrap);
    }

    document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.footprint-map').forEach(initMap));

    // 对外暴露少量 API，供动态创建容器（如 editor.html 的预览）调用
    if (!window.FootprintMap) window.FootprintMap = {};
    window.FootprintMap.bootstrapMap = function (el) {
        // 支持直接传入元素或选择器
        const container = (typeof el === 'string') ? document.querySelector(el) : el;
        if (!container) return Promise.reject(new Error('container not found'));
        return initMap(container);
    };
    window.FootprintMap.init = function () {
        document.querySelectorAll('.footprint-map').forEach(initMap);
    };
})();