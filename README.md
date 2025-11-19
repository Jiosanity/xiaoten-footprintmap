# xiaoten-footprintmap

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![AMap](https://img.shields.io/badge/AMap-2.0-06beb6)](https://lbs.amap.com/)

一个基于高德地图的纯前端足迹地图组件，支持标记集群、分类筛选、照片轮播等功能。

简体中文 | [在线演示](https://Jiosanity.github.io/xiaoten-footprintmap/)

## ✨ 特性

- 🗺️ **纯静态实现** - 纯前端，无需后端，仅需引入 JS/CSS 文件
- 🎯 **智能标记集群** - 网格算法自动合并附近标记，提升大数据量展示性能
- 🏷️ **分类筛选** - 自动提取分类标签，支持一键筛选
- 🌓 **主题自适应** - 完美适配亮色/暗色主题，自动同步切换
- 📸 **照片展示** - 支持多图轮播和灯箱放大查看
- 📱 **移动端优化** - 响应式设计，触控友好
- 🎨 **自定义标记** - 6种预设渐变色 + 自定义颜色支持
- ⚡ **性能优化** - 精简代码（475行 JS），按需加载
- 🔌 **即插即用** - 支持任何网站：WordPress、Hexo、Jekyll、Hugo 等

## 📸 演示

在线演示：[https://Jiosanity.github.io/xiaoten-footprintmap/](https://Jiosanity.github.io/xiaoten-footprintmap/)

## 🚀 快速开始

### 1. 引入文件

在 HTML 页面中引入必要的文件：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>我的足迹地图</title>
  
  <!-- 引入 CSS -->
  <link rel="stylesheet" href="css/footprintmap.css">
</head>
<body>
  <!-- 地图容器 -->
  <div id="footprintMap" style="width: 100%; height: 600px;"></div>

  <!-- 引入高德地图 API -->
  <script src="https://webapi.amap.com/maps?v=2.0&key=你的APIKey"></script>
  
  <!-- 引入足迹地图 JS -->
  <script src="js/footprintmap.js"></script>
  
  <!-- 初始化地图 -->
  <script>
    new FootprintMap({
      container: 'footprintMap',
      dataUrl: 'data/footprints.json'
    });
  </script>
</body>
</html>
```

### 2. 准备数据

创建 `data/footprints.json` 文件：

```json
{
  "locations": [
    {
      "name": "北京",
      "coordinates": "116.4074,39.9042",
      "description": "中国的首都",
      "date": "2024-05-01",
      "categories": ["2024", "旅行"],
      "markerColor": "sunset"
    }
  ]
}
```

### 3. 获取 API Key

前往 [高德开放平台](https://console.amap.com/) 注册并创建应用，获取 Web 端 JS API Key。

### 4. 完成！

打开 HTML 文件即可看到效果。详细文档请查看 [安装指南](docs/installation.md)。

## 📖 文档

- [安装指南](docs/installation.md) - 详细的集成步骤
- [数据格式](docs/data-format.md) - JSON 数据结构
- [API 文档](docs/api.md) - JavaScript API 参考
- [自定义样式](docs/customization.md) - CSS 自定义指南

## 🎨 标记颜色预设

| 预设名称 | 效果 | 使用方式 |
|---------|------|---------|
| sunset | ![](https://via.placeholder.com/80x20/ffb347/ffb347?text=+) → ![](https://via.placeholder.com/80x20/ff6f61/ff6f61?text=+) | `"markerColor": "sunset"` |
| ocean | ![](https://via.placeholder.com/80x20/06beb6/06beb6?text=+) → ![](https://via.placeholder.com/80x20/48b1bf/48b1bf?text=+) | `"markerColor": "ocean"` |
| violet | ![](https://via.placeholder.com/80x20/a18cd1/a18cd1?text=+) → ![](https://via.placeholder.com/80x20/fbc2eb/fbc2eb?text=+) | `"markerColor": "violet"` |
| forest | ![](https://via.placeholder.com/80x20/5ee7df/5ee7df?text=+) → ![](https://via.placeholder.com/80x20/39a37c/39a37c?text=+) | `"markerColor": "forest"` |
| amber | ![](https://via.placeholder.com/80x20/f6d365/f6d365?text=+) → ![](https://via.placeholder.com/80x20/fda085/fda085?text=+) | `"markerColor": "amber"` |
| citrus | ![](https://via.placeholder.com/80x20/fdfb8f/fdfb8f?text=+) → ![](https://via.placeholder.com/80x20/a1ffce/a1ffce?text=+) | `"markerColor": "citrus"` |

也可以使用自定义颜色：`"markerColor": "#ff6b6b"` 或 `"markerColor": "rgb(255,107,107)"`

## 🔧 配置选项

```javascript
new FootprintMap({
  container: 'footprintMap',           // 地图容器 ID（必需）
  dataUrl: 'data/footprints.json',     // 数据文件路径（必需）
  height: '600px',                     // 地图高度（可选）
  zoom: 5,                             // 初始缩放级别（可选）
  center: [104.1954, 35.8617]          // 初始中心点（可选）
});
```

完整参数说明请查看 [API 文档](docs/api.md)。

## 🛠️ 技术栈

- [高德地图 Web JS API 2.0](https://lbs.amap.com/api/jsapi-v2/summary) - 地图服务
- Vanilla JavaScript (ES6+) - 无框架依赖
- CSS3 - 响应式样式

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解详细的版本更新历史。

### 最新版本 v1.2.0 (2025-11-19)

- ✨ 新增 2D 地图模式，禁用旋转和倾斜
- ⚡ 代码精简：JS 从 879 行优化到 475 行（减少 45.9%）
- 🎨 完善黑暗模式适配（缩放控件和比例尺）
- 🐛 修复多项 UI 细节问题

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目采用 [MIT](LICENSE) 协议开源。

## 🙏 致谢

- 灵感来源：[王叨叨的足迹管理插件](https://wangdaodao.com/20251117/amap-track.html)
- 地图服务：[高德开放平台](https://lbs.amap.com/)

## 📧 联系方式

- 作者：xiaoten
- 网站：[xiaoten.com](https://www.xiaoten.com/)
- Issue：[GitHub Issues](https://github.com/Jiosanity/xiaoten-footprintmap/issues)

---

如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！
