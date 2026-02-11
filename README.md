# Aemeath 电子桌宠

在 Mac 桌面上的 Aemeath 小宠物，基于 `Aemeath.gif`。

## 功能

- 透明无边框窗口，只显示宠物动画
- 可拖动到桌面任意位置
- 窗口置顶，不会被其他窗口挡住
- 右键点击窗口可打开菜单选择「退出桌宠」

## 运行方法

1. 安装依赖（首次运行）：

```bash
cd /Users/songlvhan/Desktop/Aemeath
npm install
```

若出现 `socket hang up` 或下载 Electron 失败，请用国内镜像安装：

```bash
npm run install:mirror
```

或手动指定镜像后再安装：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

2. 启动桌宠：

```bash
npm start
```

或：

```bash
npm run pet
```

## 技术说明

- 使用 Electron 创建透明、置顶、无边框窗口
- 页面通过 `-webkit-app-region: drag` 实现拖动
- GIF 自动循环播放

## 调整窗口大小

若想改变桌宠显示大小，可修改 `main.js` 里的 `petWidth` 和 `petHeight`（单位：像素）。
