// 可选：双击时切换“置顶”等交互可在此扩展
document.addEventListener('DOMContentLoaded', () => {
  const img = document.querySelector('.pet-container img');
  if (img) {
    img.addEventListener('load', () => {
      // GIF 加载完成，保持循环播放（img 默认会循环）
    });
  }
});
