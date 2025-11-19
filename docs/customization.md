# 自定义样式

本页介绍如何通过覆盖类名与 CSS 变量，定制 xiaoten-footprintmap 的外观与交互。本文不依赖任何框架，直接基于 HTML/CSS/JS。

## 使用方式

建议保留默认样式文件，再追加一份自定义样式用于覆盖：

```html
<!-- 先引入默认样式，再引入自定义样式以便覆盖 -->
<link rel="stylesheet" href="css/footprintmap.css">
<link rel="stylesheet" href="css/custom-footprintmap.css">
```

不推荐直接修改 `css/footprintmap.css`，升级时容易被覆盖。

## 可用的 CSS 变量（可选）

在你的全局样式或 `custom-footprintmap.css` 中定义这些变量，以统一色彩与风格：

```css
:root {
  /* 渐变色预设（部分组件会使用） */
  --fp-color-sunset-from: #ffb347;
  --fp-color-sunset-to: #ff6f61;
  --fp-color-ocean-from: #06beb6;
  --fp-color-ocean-to: #48b1bf;
  --fp-color-violet-from: #a18cd1;
  --fp-color-violet-to: #fbc2eb;
  --fp-color-forest-from: #5ee7df;
  --fp-color-forest-to: #39a37c;
  --fp-color-amber-from: #f6d365;
  --fp-color-amber-to: #fda085;
  --fp-color-citrus-from: #fdfb8f;
  --fp-color-citrus-to: #a1ffce;

  /* 弹窗 */
  --fp-popup-bg: #fff;
  --fp-popup-text: #333;
  --fp-popup-border: #e5e7eb;

  /* 分类按钮 */
  --fp-category-bg: #f3f4f6;
  --fp-category-text: #6b7280;
  --fp-category-active-bg: #3b82f6;
  --fp-category-active-text: #fff;
}

/* 暗色主题（示例：根节点存在 .dark 类）*/
.dark {
  --fp-popup-bg: #1f2937;
  --fp-popup-text: #f3f4f6;
  --fp-popup-border: #374151;
  --fp-category-bg: #374151;
  --fp-category-text: #9ca3af;
}
```

## 常见定制

### 1) 地图高度

- 内联：`<div id="footprintMap" style="height: 700px;"></div>`
- 初始化选项：`new FootprintMap({ height: '700px' })`
- CSS 响应式：

```css
#footprintMap { height: 70vh !important; }
@media (max-width: 768px) { #footprintMap { height: 50vh !important; } }
```

### 2) 标记（Marker）与集群样式

```css
.fp-custom-marker {
  width: 48px !important;
  height: 48px !important;
  font-size: 18px !important;
  border: 3px solid rgba(255,255,255,0.9) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
}
.fp-cluster-marker {
  width: 60px !important;
  height: 60px !important;
  font-size: 20px !important;
  font-weight: 700 !important;
}
```

### 3) 弹窗（Popup）

```css
.fp-popup { width: 400px !important; max-width: 95vw !important; }
.fp-popup { border-radius: 16px !important; }
.fp-popup { box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important; }
.fp-popup-title { font-size: 22px !important; font-weight: 700 !important; color: #1f2937 !important; }
.dark .fp-popup-title { color: #f9fafb !important; }
```

### 4) 分类筛选按钮

```css
.fp-categories { gap: 12px !important; }
.fp-category-btn { padding: 10px 20px !important; font-size: 15px !important; }
.fp-category-btn { background: linear-gradient(135deg,#f3f4f6,#e5e7eb) !important; color: #4b5563 !important; }
.fp-category-btn.active { background: linear-gradient(135deg,#3b82f6,#2563eb) !important; color: #fff !important; }
.dark .fp-category-btn { background: linear-gradient(135deg,#374151,#4b5563) !important; }
.dark .fp-category-btn.active { background: linear-gradient(135deg,#2563eb,#1d4ed8) !important; }
```

### 5) 照片查看器（Carousel / Lightbox）

```css
.fp-photo-carousel img { max-height: 250px !important; }
.fp-lightbox { background: rgba(0,0,0,0.95) !important; }
.fp-lightbox img { max-width: 95vw !important; max-height: 95vh !important; }
.fp-lightbox-prev, .fp-lightbox-next { width: 60px !important; height: 60px !important; font-size: 32px !important; }
```

### 6) 控件（集群开关 / 缩放 / 比例尺）

```css
.fp-cluster-toggle { padding: 12px 20px !important; font-size: 15px !important; }
.amap-ui-control-container { top: 20px !important; right: 20px !important; }
.dark .amap-ctrl-zoom .amap-ctrl-zoomin,
.dark .amap-ctrl-zoom .amap-ctrl-zoomout { color: #ffffff !important; }
.amap-copyright, .amap-logo { bottom: 20px !important; right: 20px !important; }
```

### 7) 动画

```css
.fp-custom-marker { animation: fpMarkerPop 0.5s cubic-bezier(0.68,-0.55,0.27,1.55) !important; }
@keyframes fpMarkerPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.fp-popup { animation: fpFadeIn 0.3s ease-out !important; }
@keyframes fpFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
```

## 主题适配

组件默认通过 `document.documentElement.classList.contains('dark')` 判断是否为暗色模式。若你的站点使用其他类名（如 `dark-mode`），可在 `footprintmap.js` 中调整主题检测逻辑：

```js
function _isDark() {
  return document.documentElement.classList.contains('dark')
      || document.documentElement.classList.contains('dark-mode');
}
```

若你有高德地图的自定义样式 ID，也可在内部根据主题切换：

```js
_getMapStyle() {
  const isDark = /* 你的主题检测逻辑 */ false;
  return isDark ? 'amap://styles/YOUR_DARK_STYLE_ID'
                : 'amap://styles/YOUR_LIGHT_STYLE_ID';
}
```

## 移动端适配

```css
@media (max-width: 1024px) { #footprintMap { height: 500px !important; } .fp-popup { width: 300px !important; } }
@media (max-width: 768px)  { #footprintMap { height: 400px !important; } .fp-popup { width: 280px !important; } }
@media (max-width: 768px)  { .fp-custom-marker { width: 44px !important; height: 44px !important; } .fp-lightbox-prev, .fp-lightbox-next { width: 60px !important; height: 60px !important; } }
```

## 完整示例（可直接复制）

```css
#footprintMap { height: 700px !important; border-radius: 16px !important; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
.fp-custom-marker { width: 46px !important; height: 46px !important; font-size: 17px !important; border: 3px solid rgba(255,255,255,0.95) !important; box-shadow: 0 6px 16px rgba(0,0,0,0.25) !important; }
.fp-cluster-marker { width: 64px !important; height: 64px !important; font-size: 22px !important; font-weight: 700 !important; }
.fp-popup { width: 360px !important; border-radius: 16px !important; box-shadow: 0 20px 60px rgba(0,0,0,0.25) !important; }
.fp-popup-title { font-size: 20px !important; font-weight: 700 !important; background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.fp-category-btn { padding: 10px 18px !important; font-weight: 600 !important; border-radius: 20px !important; transition: all .3s cubic-bezier(.4,0,.2,1) !important; }
.fp-category-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
.fp-category-btn.active { background: linear-gradient(135deg,#667eea 0%,#764ba2 100%) !important; color: #fff !important; }
@media (max-width: 768px) { #footprintMap { height: 450px !important; border-radius: 12px !important; } .fp-popup { width: 300px !important; } }
```

---

相关资源：
- API 文档: `api.md`
- 数据格式: `data-format.md`
- 高德地图样式编辑器: https://lbs.amap.com/dev/mapstyle/index
