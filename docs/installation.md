# 安装指南

本指南将帮助你在任何网站中集成 xiaoten-footprintmap。

## 系统要求

- 支持 ES6+ 的现代浏览器
- 高德地图 Web JS API Key（免费申请）
- 静态文件托管环境（任意 Web 服务器）

## 步骤 1：获取高德地图 API Key

1. 访问 [高德开放平台](https://console.amap.com/)
2. 注册并登录账号
3. 进入「应用管理」→「我的应用」
4. 点击「创建新应用」
5. 在应用中添加 Key：
   - Key 名称：任意填写（如 `我的网站`）
   - 服务平台：选择「Web端（JS API）」
   - 填写网站域名（支持通配符，如 `*.example.com`）

> 💡 **提示**：开发阶段可以使用 `localhost` 和 `127.0.0.1` 作为域名。

## 步骤 2：下载组件文件

### 方式 1：克隆仓库

```bash
git clone https://github.com/Jiosanity/xiaoten-footprintmap.git
cd xiaoten-footprintmap
```

### 方式 2：下载 ZIP

前往 [Releases 页面](https://github.com/Jiosanity/xiaoten-footprintmap/releases) 下载最新版本。

### 方式 3：CDN 引入（即将支持）

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Jiosanity/xiaoten-footprintmap/static/css/footprintmap.css">
<script src="https://cdn.jsdelivr.net/gh/Jiosanity/xiaoten-footprintmap/static/js/footprintmap.js"></script>
```

## 步骤 3：复制文件到你的网站

将以下文件复制到你的网站目录：

```bash
# 复制到网站根目录
cp xiaoten-footprintmap/static/js/footprintmap.js YOUR_WEBSITE/js/
cp xiaoten-footprintmap/static/css/footprintmap.css YOUR_WEBSITE/css/
cp xiaoten-footprintmap/static/data/footprints.example.json YOUR_WEBSITE/data/
```

或者根据你的网站结构调整路径。

## 步骤 4：在 HTML 中引入文件

在你的网页中添加以下代码：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的足迹</title>
  
  <!-- 引入 CSS -->
  <link rel="stylesheet" href="css/footprintmap.css">
</head>
<body>
  <!-- 地图容器 -->
  <div id="footprintMap" style="width: 100%; height: 600px;"></div>

  <!-- 引入高德地图 API -->
  <script src="https://webapi.amap.com/maps?v=2.0&key=你的高德地图APIKey"></script>
  
  <!-- 引入足迹地图 JS -->
  <script src="js/footprintmap.js"></script>
  
  <!-- 初始化地图 -->
  <script>
    const footprintMap = new FootprintMap({
      container: 'footprintMap',
      dataUrl: 'data/footprints.json'
    });
  </script>
</body>
</html>
```

## 步骤 5：创建数据文件

在网站目录下创建 `data/footprints.json`：

```json
{
  "locations": [
    {
      "name": "地点名称",
      "coordinates": "经度,纬度",
      "description": "简短描述",
      "date": "YYYY-MM-DD",
      "url": "https://example.com",
      "urlLabel": "链接文字",
      "photos": [
        "images/photo1.jpg",
        "images/photo2.jpg"
      ],
      "categories": ["2025", "旅行"],
      "markerColor": "sunset"
    }
  ]
}
```

详细数据格式说明请参考 [数据格式文档](data-format.md)。

## 步骤 6：测试运行

使用本地 Web 服务器打开页面：

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .

# PHP
php -S localhost:8000
```

访问 `http://localhost:8000`，查看你的足迹地图。

## 步骤 7：部署到生产环境

将所有文件上传到你的 Web 服务器，或部署到静态托管平台：

- **GitHub Pages**：直接推送到 `gh-pages` 分支
- **Netlify / Vercel**：连接 Git 仓库自动部署
- **自建服务器**：使用 FTP 或 rsync 上传

### GitHub Pages 示例

```bash
git init
git add .
git commit -m "Add footprint map"
git branch -M main
git remote add origin https://github.com/Jiosanity/xiaoten-footprintmap.git
git push -u origin main

# 在 GitHub 仓库设置中启用 Pages
```

## 常见问题

### 地图无法加载

**原因**：API Key 配置错误或域名未添加到白名单。

**解决方法**：
1. 检查配置文件中的 `amapKey` 是否正确
2. 在高德控制台确认当前域名已添加到 Key 的白名单
3. 打开浏览器开发者工具 Console 查看具体错误信息

### 标记不显示

**原因**：数据文件路径错误或 JSON 格式错误。

**解决方法**：
1. 确认 `static/data/footprints.json` 文件存在
2. 使用 [JSON 校验工具](https://jsonlint.com/) 检查 JSON 格式
3. 确认 `coordinates` 格式为 `"经度,纬度"`（注意顺序）

### 照片无法显示

**原因**：图片路径错误。

**解决方法**：
1. 确认图片已放置在 `static/images/` 目录
2. JSON 中的路径应为 `/images/xxx.jpg`（以 `/` 开头）
3. 检查图片文件名是否正确（注意大小写）

### 黑暗模式样式异常

**原因**：CSS 文件未正确加载。

**解决方法**：
1. 确认 `footprintmap.css` 已复制到 `static/css/` 目录
2. 检查主题是否使用 `.dark` 类名标识黑暗模式
3. 如果主题使用其他类名，请参考 [自定义样式文档](customization.md)

## 下一步

- 📖 阅读 [API 文档](api.md) 了解 JavaScript API
- 🎨 查看 [自定义样式](customization.md) 学习如何修改外观
- 📝 参考 [数据格式](data-format.md) 了解 JSON 结构详情

---

**需要帮助？** 请在 [GitHub Issues](https://github.com/Jiosanity/xiaoten-footprintmap/issues) 提出问题。
