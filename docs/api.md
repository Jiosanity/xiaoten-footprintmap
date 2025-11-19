# API 文档

xiaoten-footprintmap JavaScript API 参考。

## FootprintMap 类

### 构造函数

```javascript
new FootprintMap(options)
```

#### 参数

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|-------|------|------|--------|------|
| `container` | String | ✅ | - | 地图容器元素的 ID |
| `dataUrl` | String | ✅ | - | 足迹数据 JSON 文件的路径或 URL |
| `amapKey` | String | ❌ | - | 高德地图 API Key（如果已在 script 标签中引入则可省略） |
| `height` | String | ❌ | `'520px'` | 地图容器高度（CSS 单位） |
| `zoom` | Number | ❌ | `5` | 初始缩放级别（3-18） |
| `center` | Array | ❌ | `[104.1954, 35.8617]` | 初始中心点 `[经度, 纬度]` |

#### 示例

```javascript
const map = new FootprintMap({
  container: 'footprintMap',
  dataUrl: 'data/footprints.json',
  amapKey: 'your-amap-key',
  height: '600px',
  zoom: 6,
  center: [120.1551, 30.2741] // 杭州
});
```

### 方法

#### destroy()

销毁地图实例，释放资源。

```javascript
map.destroy();
```

#### reload(dataUrl)

重新加载数据。

**参数：**
- `dataUrl` (String) - 新的数据 URL（可选，默认使用初始化时的 URL）

```javascript
map.reload('data/footprints-2024.json');
```

#### setCenter(lng, lat, zoom)

设置地图中心点和缩放级别。

**参数：**
- `lng` (Number) - 经度
- `lat` (Number) - 纬度
- `zoom` (Number) - 缩放级别（可选）

```javascript
map.setCenter(116.4074, 39.9042, 10);
```

#### filterByCategory(category)

按分类筛选标记。

**参数：**
- `category` (String) - 分类名称，传入 `null` 显示所有标记

```javascript
map.filterByCategory('2024');
map.filterByCategory(null); // 显示所有
```

#### toggleCluster(enabled)

启用或禁用标记集群。

**参数：**
- `enabled` (Boolean) - `true` 启用，`false` 禁用

```javascript
map.toggleCluster(false); // 禁用集群
```

### 属性

#### map

获取底层高德地图实例。

```javascript
const amapInstance = map.map;
amapInstance.setZoom(8);
```

#### locations

获取所有足迹数据（处理后的对象数组）。

```javascript
console.log(map.locations);
// [
//   { name: "北京", position: [116.4074, 39.9042], ... },
//   ...
// ]
```

## 数据格式

### 根对象

```json
{
  "locations": [...] // 地点数组
}
```

### Location 对象

| 字段 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| `name` | String | ✅ | 地点名称 |
| `coordinates` | String | ✅ | 坐标 `"经度,纬度"` |
| `description` | String | ❌ | 地点描述 |
| `date` | String | ❌ | 访问日期 `YYYY-MM-DD` |
| `url` | String | ❌ | 相关链接 |
| `urlLabel` | String | ❌ | 链接按钮文字 |
| `photos` | Array | ❌ | 照片路径数组 |
| `categories` | Array | ❌ | 分类标签数组 |
| `markerColor` | String | ❌ | 标记颜色（预设名或颜色值） |

#### 示例

```json
{
  "name": "杭州西湖",
  "coordinates": "120.1551,30.2741",
  "description": "世界文化遗产",
  "date": "2024-06-15",
  "url": "/posts/hangzhou/",
  "urlLabel": "查看游记",
  "photos": [
    "images/westlake-1.jpg",
    "images/westlake-2.jpg"
  ],
  "categories": ["2024", "旅行", "自然"],
  "markerColor": "forest"
}
```

## 事件

### markerClick

标记被点击时触发。

```javascript
map.on('markerClick', (location) => {
  console.log('点击了标记:', location.name);
});
```

### clusterClick

集群标记被点击时触发。

```javascript
map.on('clusterClick', (cluster) => {
  console.log('集群包含', cluster.count, '个标记');
});
```

### categoryChange

分类筛选改变时触发。

```javascript
map.on('categoryChange', (category) => {
  console.log('当前分类:', category);
});
```

### dataLoaded

数据加载完成时触发。

```javascript
map.on('dataLoaded', (locations) => {
  console.log('加载了', locations.length, '个地点');
});
```

## 自定义

### 修改默认配置

编辑 `footprintmap.js` 文件：

```javascript
// 默认地图样式
_getMapStyle() {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark 
    ? 'amap://styles/YOUR_DARK_STYLE'
    : 'amap://styles/YOUR_LIGHT_STYLE';
}

// 集群网格大小
_createClusters() {
  const gridSize = 80; // 修改这里
  // ...
}
```

### CSS 类名

可以通过 CSS 覆盖样式：

| 类名 | 说明 |
|-----|------|
| `.fp-custom-marker` | 标记样式 |
| `.fp-cluster-marker` | 集群标记样式 |
| `.fp-popup` | 弹窗容器 |
| `.fp-popup-title` | 弹窗标题 |
| `.fp-popup-description` | 弹窗描述 |
| `.fp-category-btn` | 分类按钮 |
| `.fp-cluster-toggle` | 集群开关 |
| `.fp-photo-carousel` | 照片轮播容器 |
| `.fp-lightbox` | 照片灯箱 |

## 浏览器兼容性

- Chrome ≥ 60
- Firefox ≥ 60
- Safari ≥ 12
- Edge ≥ 79

需要支持：
- ES6+ (Promises, Classes, Arrow Functions)
- Fetch API
- CSS Grid

## 常见问题

### 如何监听地图事件？

```javascript
map.map.on('zoomend', () => {
  console.log('当前缩放级别:', map.map.getZoom());
});
```

### 如何添加自定义控件？

```javascript
const customControl = new AMap.Control({
  position: { top: '10px', right: '10px' }
});
map.map.addControl(customControl);
```

### 如何获取当前可见标记？

```javascript
const bounds = map.map.getBounds();
const visibleLocations = map.locations.filter(loc => {
  return bounds.contains(loc.position);
});
```

---

**问题反馈：** [GitHub Issues](https://github.com/Jiosanity/xiaoten-footprintmap/issues)
