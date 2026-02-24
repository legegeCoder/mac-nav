# Nav App

一个 macOS 风格的个人导航页，灵感来自 macOS Launchpad。适合自部署，作为浏览器起始页使用。

## 特性

- macOS Launchpad 风格图标网格，支持分类管理
- macOS 风格 Dock 栏，悬停放大效果
- macOS 风格顶部菜单栏，实时时钟
- macOS 锁屏风格登录页，JWT 鉴权
- 访客模式 — 未登录用户可浏览公开内容，编辑功能自动隐藏
- 拖拽排序 — 卡片可在分类间拖动，也可拖入 Dock
- 长按抖动删除 — 类似 iOS/macOS 的长按编辑模式
- 右键菜单 — 编辑、删除、添加到 Dock
- 仿系统偏好设置面板 — 头像、外观、图标大小、链接行为等全部可配
- YAML 配置导入/导出/重置
- 响应式布局，渐变动画背景

## 快速开始

### Docker Compose（推荐）

```yaml
# docker-compose.yml
services:
  nav:
    image: legege1997/nav-app:latest
    container_name: nav
    ports:
      - "8090:80"
    volumes:
      - ./user-data:/app/user-data
    environment:
      - NAV_PASSWORD=admin
    restart: unless-stopped
```

```bash
docker-compose up -d
```

访问 `http://localhost:8090`，默认密码 `admin`。

配置数据持久化在 `./user-data/nav.yaml`，可直接编辑或通过设置面板修改。

### Docker

```bash
docker run -d \
  --name nav \
  -p 8090:80 \
  -v ./user-data:/app/user-data \
  -e NAV_PASSWORD=admin \
  --restart unless-stopped \
  legege1997/nav-app:latest
```

### 本地开发

```bash
npm install
npm run dev
```

## 技术栈

React + TypeScript + Vite + Express

## License

[Apache License 2.0](LICENSE)
