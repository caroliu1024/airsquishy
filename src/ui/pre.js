// 页面状态（首页/素材库/沉浸体验/关于）+ 给 3D 画面算出被面板挡住的区域，让捏捏居中在空白处
// 用手机布局：窄屏，或者竖着拿的平板（触屏、宽不超过 1100、竖屏）。和样式表里的条件保持一致
// 手机横屏：触屏、横着、高度不超过 500。用专门的紧凑布局（左边细栏 + 右边竖排工具），不走手机竖屏布局
window.__isPL = (W = innerWidth, H = innerHeight) => W > H && H <= 500 && matchMedia('(pointer:coarse)').matches;
// 电脑上窗口比较窄（不到 900）时也用手机布局：两侧栏会把捏捏挤得很小
window.__isMob = (W = innerWidth, H = innerHeight) => (W <= 720 && !window.__isPL(W, H)) || (W <= 900 && matchMedia('(pointer:fine)').matches) || (W <= 1100 && H >= W && matchMedia('(pointer:coarse)').matches);
(function(){
  const PAGES = ['home', 'library', 'immersive', 'about'];
  const h = location.hash.replace('#', '');
  document.body.dataset.page = PAGES.includes(h) ? h : 'home';
  const W0 = el => el && el.offsetWidth > 0;
  window.__nnObstacles = (W, H) => {
    const pg = document.body.dataset.page, mobile = window.__isMob(W, H);
    if (pg === 'immersive' && document.body.classList.contains('onboarding')){ document.documentElement.style.setProperty('--hud-dx', '0px'); return { L:0, R:0, T:0, B:0 }; }
    const top = document.querySelector('.topbar');
    let T = top ? top.offsetHeight : 0, L = 0, R = 0, B = 0;
    if (pg === 'library'){
      const l = document.getElementById('libList'), r = document.getElementById('libDetail');
      if (mobile){
        if (W0(l)) B = l.offsetHeight;
        if (W0(r)) T = r.offsetTop + r.offsetHeight;
      } else {
        if (W0(l)) L = l.offsetLeft + l.offsetWidth;
        if (W0(r)) R = W - r.offsetLeft;
        document.documentElement.style.setProperty('--lib-l', L + 'px');
        document.documentElement.style.setProperty('--lib-r', R + 'px');
      }
    } else if (pg === 'immersive'){
      const l = document.getElementById('panel'), r = document.getElementById('rpanel'), tb = document.getElementById('toolbar');
      if (mobile){
        if (W0(l)) B = l.offsetHeight;
        if (W0(tb)) B += tb.offsetHeight + 10;
        T += 40;
      } else if (window.__isPL(W, H)){
        // 手机横屏：左边细栏、右边竖排工具条；右侧调节栏是盖在上面的抽屉，不算
        if (W0(l)) L = l.offsetLeft + l.offsetWidth;
        if (W0(tb)) R = W - tb.offsetLeft;
        T += 24;
      } else {
        // 用 offsetLeft/offsetWidth：两侧栏滑出隐藏时不变，画面不会跟着跳
        if (W0(l)) L = l.offsetLeft + l.offsetWidth;
        if (W0(r)) R = W - r.offsetLeft;
        T += 30;
      }
    }
    document.documentElement.style.setProperty('--hud-dx', (mobile ? 0 : (L - R)/2) + 'px');
    return { L, R, T, B };
  };
})();

// 捏捏主画面只在「捏一捏」页渲染（首页/关于页是不透明整页，盖住了它）
window.__nnPaused = () => { const p = document.body.dataset.page; return p === 'home' || p === 'about'; };
