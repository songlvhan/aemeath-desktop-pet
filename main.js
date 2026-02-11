const { app, BrowserWindow, screen, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

// 基础尺寸（后面按比例缩放）
const BASE_WIDTH = 280;
const BASE_HEIGHT = 380;

let sizeScale = 1.0; // 1.0 = 原始大小
let currentMode = 'static'; // 'static' | 'fly' | 'follow'
let flyInterval = null;
let followInterval = null;

function applySize() {
  if (!mainWindow) return;
  const width = Math.round(BASE_WIDTH * sizeScale);
  const height = Math.round(BASE_HEIGHT * sizeScale);
  mainWindow.setSize(width, height);
}

function clearMoveTimers() {
  if (flyInterval) {
    clearInterval(flyInterval);
    flyInterval = null;
  }
  if (followInterval) {
    clearInterval(followInterval);
    followInterval = null;
  }
}

// 根据当前模式设置是否“鼠标穿透”，避免挡住前景窗口的点击/选中文本
function updateMouseThrough() {
  if (!mainWindow) return;
  // 静止模式：允许用鼠标拖动她
  if (currentMode === 'static') {
    mainWindow.setIgnoreMouseEvents(false);
  } else {
    // 自由飞行 / 鼠标跟随：开启鼠标穿透，不挡住屏幕文字和操作
    mainWindow.setIgnoreMouseEvents(true);
  }
}

function setStaticMode() {
  clearMoveTimers();
  currentMode = 'static';
  updateMouseThrough();
}

function startFreeFlyMode() {
  clearMoveTimers();
  currentMode = 'fly';
  updateMouseThrough();

  if (!mainWindow) return;
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  let [x, y] = mainWindow.getPosition();
  let [w, h] = mainWindow.getSize();

  // 初始速度（像素/帧）
  let vx = 3;
  let vy = 2;

  flyInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    [x, y] = mainWindow.getPosition();
    [w, h] = mainWindow.getSize();

    let nx = x + vx;
    let ny = y + vy;

    // 碰到屏幕边缘反弹
    if (nx <= 0) {
      vx = -vx;
      nx = 0;
      // 如果垂直速度太小，给一个随机的小速度避免只在水平移动
      if (Math.abs(vy) < 1) {
        vy = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
      }
    } else if (nx + w >= screenWidth) {
      vx = -vx;
      nx = screenWidth - w;
      if (Math.abs(vy) < 1) {
        vy = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
      }
    }
    
    if (ny <= 0) {
      vy = -vy;
      ny = 0;
      // 如果水平速度太小，给一个随机的小速度避免只在垂直移动
      if (Math.abs(vx) < 1) {
        vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
      }
    } else if (ny + h >= screenHeight) {
      vy = -vy;
      ny = screenHeight - h;
      if (Math.abs(vx) < 1) {
        vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
      }
    }

    mainWindow.setPosition(Math.round(nx), Math.round(ny));
  }, 16); // 大约 60FPS
}

function startFollowCursorMode() {
  clearMoveTimers();
  currentMode = 'follow';
  updateMouseThrough();

  if (!mainWindow) return;

  // 用于在鼠标附近绕圈的角度
  let angle = 0;

  followInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const cursor = screen.getCursorScreenPoint();
    const [w, h] = mainWindow.getSize();
    const [cx, cy] = mainWindow.getPosition();

    // 鼠标位置为目标中心
    const targetX = cursor.x - w / 2;
    const targetY = cursor.y - h / 2;

    const dx = targetX - cx;
    const dy = targetY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 距离较远时：缓慢飞向鼠标（平滑插值）
    if (dist > 80) {
      const factor = 0.02; // 跟随速度（已调为原来的约 1/3）
      const nx = cx + dx * factor;
      const ny = cy + dy * factor;
      mainWindow.setPosition(Math.round(nx), Math.round(ny));
    } else {
      // 靠近后：在鼠标周围打转
      angle += 0.026; // 角速度（也调为大约原来的 1/3）
      const radius = 60; // 绕圈半径
      const orbitX = cursor.x + radius * Math.cos(angle) - w / 2;
      const orbitY = cursor.y + radius * Math.sin(angle) - h / 2;
      mainWindow.setPosition(Math.round(orbitX), Math.round(orbitY));
    }
  }, 16);
}

function updateDockMenu() {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setMenu(buildMenu());
  }
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label:
        '模式（当前：' +
        (currentMode === 'static' ? '静止' : currentMode === 'fly' ? '自由飞行' : '鼠标跟随') +
        '）',
      enabled: false,
    },
    {
      label: '静止模式',
      type: 'radio',
      checked: currentMode === 'static',
      click: () => {
        setStaticMode();
        updateDockMenu();
      },
    },
    {
      label: '自由飞行模式',
      type: 'radio',
      checked: currentMode === 'fly',
      click: () => {
        startFreeFlyMode();
        updateDockMenu();
      },
    },
    {
      label: '鼠标跟随模式',
      type: 'radio',
      checked: currentMode === 'follow',
      click: () => {
        startFollowCursorMode();
        updateDockMenu();
      },
    },
    { type: 'separator' },
    {
      label: '大小：小',
      type: 'radio',
      checked: sizeScale === 0.7,
      click: () => {
        sizeScale = 0.7;
        applySize();
        updateDockMenu();
      },
    },
    {
      label: '大小：中（默认）',
      type: 'radio',
      checked: sizeScale === 1.0,
      click: () => {
        sizeScale = 1.0;
        applySize();
        updateDockMenu();
      },
    },
    {
      label: '大小：大',
      type: 'radio',
      checked: sizeScale === 1.3,
      click: () => {
        sizeScale = 1.3;
        applySize();
        updateDockMenu();
      },
    },
    { type: 'separator' },
    {
      label: '退出桌宠',
      type: 'normal',
      click: () => app.quit(),
    },
  ]);
}

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const petWidth = BASE_WIDTH;
  const petHeight = BASE_HEIGHT;
  const x = Math.max(0, screenWidth - petWidth - 20);
  const y = Math.max(0, screenHeight - petHeight - 80);

  mainWindow = new BrowserWindow({
    width: petWidth,
    height: petHeight,
    x,
    y,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  applySize();
  setStaticMode();

  // 窗口右键菜单：模式 + 大小 + 退出
  mainWindow.webContents.on('context-menu', () => {
    buildMenu().popup({ window: mainWindow });
  });
}

app.whenReady().then(() => {
  createWindow();
  updateDockMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
