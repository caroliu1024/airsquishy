// Squishy 界面层：只负责页面切换、排版和把选择转发给原来的按钮（.click()），不碰任何捏捏逻辑
const $ = id => document.getElementById(id);
const body = document.body;
const CATS = [['all', '全部'], ['orig', '原创'], ['fruit', '水果'], ['dessert', '甜点'], ['snack', '零食主食'], ['pet', '萌宠']];
const CAT_NAME = Object.fromEntries(CATS);
const FOOD_TAG = { juice:'会爆汁', syrup:'流糖浆', cream:'挤出夹心', crumb:'掉碎屑', melt:'会融化', pop:'啵地爆开' };
const SND_NAME = { meow:'喵喵叫', penguin:'嘎嘎叫', squeak:'吱吱声', chipbag:'包装袋沙沙', candy:'糖纸窸窣', choco:'巧克力咔嚓', cream:'奶油咕啾', pastry:'酥皮沙沙',
  bread:'面包软绵', dough:'面团噗噗', egg:'蛋液咕叽', fruitfirm:'果肉脆响', fruitsoft:'多汁果肉', icecream:'冰淇淋绵密', mushy:'软糯闷响', tuber:'薯肉绵沙', butter:'黄油滑腻', cup:'纸杯吱嘎', bucket:'纸桶沙沙' };
const WAX = [[0, '不加', '原材质'], [10, '10 倍', '轻按就碎'], [50, '50 倍', '用力才裂'], [100, '100 倍', '很硬很响']];
const LAYER_HINT = { 0:'不加蜡壳，直接捏材质本身', 10:'薄薄一层，轻轻一按就碎', 50:'要按住用力一会儿才会裂开', 100:'很厚很硬，要使劲捏，碎开时最响' };
const TIPS = {
  press:'按压：鼠标按住不动，越按越深；摄像头下弯手指就是往下按',
  rub:'揉捏：按住停一下再小幅移动是揉搓；按住 Shift 再按是捏起；摄像头下拇指食指捏合',
  pull:'拉伸：一按下立刻拖动就能拉长，拉太远会“啪”地弹回；摄像头下捏住再移动，双手可以一起拉',
};
const LIVE = { press:['按压', '捏合'], rub:['揉搓'], pull:['拉扯', '拉长', '拉丝', '双手拉伸', '快断了！', '快裂开了', '拉不动了'] };
const IDLE = ['待捏', '晃动中', '回弹中'];
const THUMBS = window.__THUMBS || {};

const isMobile = () => window.__isMob();
const isTouchPhone = () => window.__isMob() || window.__isPL();   // 手机（竖屏或横屏）：不主动弹摄像头提醒、两侧栏不自动收起
const camIsOn = () => window.__nn ? !!window.__nn.camOn : $('camBtn').textContent.includes('关闭');   // 直接问主程序（英文版按钮文字是英文，不能再看“关闭”两个字）
// 读主程序写在页面上的中文状态（英文版里文字已被翻成英文，这里取回中文原文来判断）
const zhText = el => { const c = el && el.firstChild; return (c && c.__zh) || (el ? el.textContent : ''); };
const relayout = () => dispatchEvent(new Event('resize'));

/* ---------- 开始卡片（打开声音）：第一次进入素材库/沉浸体验时出现 ---------- */
let started = false, camPending = 0, onbDone = false;
$('startBtn').addEventListener('click', () => { if (window.__nnReady) started = true; });
function ensureStarted(){ if (!started) $('intro').hidden = false; }
// 手势教学全屏：收起顶栏、两侧栏、工具条，捏捏居中放大；教学结束再进入完整页面
function setOnb(on){
  if (body.classList.contains('onboarding') === on) return;
  body.classList.toggle('onboarding', on);
  relayout(); setTimeout(relayout, 480);
}
function startAudio(){ if (!started && window.__nnReady) $('startBtn').click(); }
// 用手捏是主引导：进入「捏一捏」时摄像头没开，就先弹提醒（打开摄像头 = 主按钮）。
// 用户点了「先用鼠标」，这次访问里就不再弹，改成状态条下方常驻一个「试试用手捏」胶囊；手机默认触屏，不主动弹
let camDeclined = false;
function enterImmersive(hand){
  if (camIsOn()) return;
  if (hand || (!camDeclined && !isTouchPhone())) showCamPrompt(); else ensureStarted();
}
function showCamPrompt(){ $('intro').hidden = true; $('cpErr').hidden = true; $('camPrompt').hidden = false; prefetchHands(); }
// 一表现出想用手捏（弹出摄像头提醒、点「伸手捏一捏」/「试试用手捏」），就在后台开始下载手势识别
function prefetchHands(){ try { window.__mpPrefetch && window.__mpPrefetch(); } catch (e){} }
// 「老用户」= 在这个新版流程里完整走完过全屏教学（5 步 + 点「开始玩」）的人。
// 不用旧的 nn-tut-v1 标记：以前的版本里点过教学、关掉过教学面板也会写上它，会把还没走过新流程的人误当成老用户
const ONB_KEY = 'airsquishy-onb-done';
const tutSeen = () => { try { return localStorage.getItem(ONB_KEY) === '1'; } catch (e){ return false; } };
const markTutSeen = () => { try { localStorage.setItem(ONB_KEY, '1'); } catch (e){} };

/* ---------- 页面切换 ---------- */
function go(page, hand){
  const prev = body.dataset.page;
  if (prev === page){ if (page === 'immersive' && hand && !camIsOn()) showCamPrompt(); return; }
  if (prev === 'immersive' && camIsOn()) $('camBtn').click();   // 离开沉浸体验时关掉摄像头
  body.dataset.page = page;
  body.classList.remove('immersed', 'drawer');
  history.replaceState(null, '', '#' + page);
  syncNav();
  $('camPrompt').hidden = true; setOnb(false); camPending = 0;
  if (page === 'library'){ body.dataset.page = prev; history.replaceState(null, '', '#' + prev); syncNav(); openAll(); return; }   // 旧的 #library 链接：打开「全部捏捏」
  closeAll();
  if (page === 'immersive') enterImmersive(hand);
  else $('intro').hidden = true;
  relayout(); requestAnimationFrame(relayout);
}
function syncNav(){ document.querySelectorAll('.nav [data-go]').forEach(b => b.dataset.go === body.dataset.page ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')); }
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
// 「全部捏捏」浮层：搜索 + 分类，点一个就去捏
function openAll(){ $('allSheet').hidden = false; setTimeout(() => $('libSearch').focus({ preventScroll:true }), 60); }
function closeAll(){
  const wasHome = $('allSheet').classList.contains('home-mode');
  $('allSheet').hidden = true; $('allSheet').classList.remove('home-mode'); selectCard(null);
  if (wasHome && body.dataset.page === 'home' && window.__homeMelt) window.__homeMelt(0);   // 从首页打开的：关掉后字母重新变回来
}
// 首页往下滚 → 直接打开全部捏捏（首页模式：点一下先选中，底部出现「捏这个」，再跳到捏一捏）
function openHomeLib(){ if (!$('allSheet').hidden) return; $('allSheet').classList.add('home-mode'); selectCard(null); $('allSheet').hidden = false; }
window.__homeLib = () => { if (body.dataset.page === 'home') openHomeLib(); };
let selK = null;
function selectCard(k){
  selK = k;
  document.querySelectorAll('#libGrid .lcard').forEach(b => b.classList.toggle('sel', b.dataset.k === k));
  const bar = $('pickBar'); if (!bar) return;
  bar.hidden = !k;
  if (k) $('pickName').textContent = window.__nn ? window.__nn.SHAPES[k].name : '';
}
$('searchBtn').onclick = openAll;
$('allClose').onclick = closeAll;
$('allSheet').addEventListener('pointerdown', e => { if (e.target === $('allSheet')) closeAll(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('allSheet').hidden) closeAll(); });
$('goImm').onclick = () => go('immersive');
// 赞助链接还没填时，点了不跳走（填好 href 后去掉 data-todo 即可）
document.querySelectorAll('a[data-todo]').forEach(x => x.addEventListener('click', e => { if (x.getAttribute('href') === '#') e.preventDefault(); }));
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (['home', 'library', 'immersive', 'about'].includes(h)) go(h); });

await new Promise(r => { const t = () => (window.__nnReady && window.__nn) ? r() : setTimeout(t, 30); t(); });
const NN = window.__nn, SHAPES = NN.SHAPES, MATS = NN.MATS, state = NN.state;
$('openAll').textContent = `全部 ${Object.keys(SHAPES).length} 件 →`;
try { startHome(window.__THREE, SHAPES); } catch (e){ console.error('home', e); }
$('hHand').onclick = () => go('immersive', true);
$('hMouse').onclick = () => { camDeclined = true; go('immersive'); };
$('handPill').onclick = () => { startAudio(); showCamPrompt(); };
$('hShelfBtn').onclick = () => { window.__homeMelt && window.__homeMelt(1); setTimeout(openHomeLib, 350); };
$('pickGo').onclick = () => { const k = selK; if (!k) return; closeAll(); go('immersive'); pickShape(k); };
// 首页模式下，网格滚到最上面还往上滚 → 收起，回到果冻字
$('libGrid').addEventListener('wheel', e => { if ($('allSheet').classList.contains('home-mode') && $('libGrid').scrollTop <= 0 && e.deltaY < -20) closeAll(); }, { passive:true });
$('openAll').onclick = openAll;
if (body.dataset.page === 'library'){ body.dataset.page = 'home'; history.replaceState(null, '', '#home'); openAll(); }
syncNav();
if (body.dataset.page === 'immersive') enterImmersive();

/* ---------- 摄像头提醒 → 手势教学 → 完整页面 ---------- */
let camBypass = false, closeTutOnCam = false, closeTutUntil = 0;
// 摄像头关着时点「用手捏」：先弹提醒卡片（说明要用摄像头、画面不上传），确认后才真正打开并进入全屏教学
document.addEventListener('click', e => {
  if (camBypass || camIsOn() || body.dataset.page !== 'immersive') return;
  if (e.target.closest && e.target.closest('#camBtn')){ e.stopImmediatePropagation(); e.preventDefault(); startAudio(); showCamPrompt(); }
}, true);
$('cpOpen').onclick = () => {
  startAudio(); $('camPrompt').hidden = true;
  // 第一次用：全屏 5 步教学；做过教学的老用户：直接开始玩，不再重走（右栏「手势教学」随时可以复习）
  if (!tutSeen()) setOnb(true); else { closeTutOnCam = true; closeTutUntil = Infinity; body.classList.add('no-gp'); try { localStorage.setItem('nn-tut-v1', '1'); } catch (e){} }   // no-gp：摄像头启动时程序会自动弹出手势面板，老用户这里先把它藏住，避免一闪而过   // 老用户：摄像头打开后直接开始捏，不再弹手势面板
  body.classList.remove('immersed');
  camPending = performance.now(); onbDone = false;
  if (!camIsOn()){ camBypass = true; $('camBtn').click(); camBypass = false; }
  syncMpLoad();   // 进度卡片立刻出现，不等下一次定时检查
};
$('cpSkip').onclick = () => { startAudio(); $('camPrompt').hidden = true; setOnb(false); camDeclined = true; };
// 等摄像头和手势识别准备好的这段时间：显示下载进度，不让全屏教学空着
function syncMpLoad(){
  const show = !!camPending && !camIsOn() && body.dataset.page === 'immersive';
  $('mpLoad').hidden = !show; if (!show) return;
  const p = window.__mpProgress ? window.__mpProgress() : 0, pct = Math.min(99, Math.round(p*100));
  $('mpBar').style.width = Math.max(3, pct) + '%'; $('mpPct').textContent = pct + '%';
  const t = p >= .995 ? '马上就好…' : '正在准备手势识别';
  if ($('mpTitle').dataset.zh !== t){ $('mpTitle').dataset.zh = t; $('mpTitle').textContent = window.__t ? window.__t(t) : t; }
}
setInterval(() => {
  syncMpLoad();
  $('handPill').hidden = !(body.dataset.page === 'immersive' && !camIsOn() && !camPending && $('camPrompt').hidden && $('intro').hidden && $('allSheet').hidden);
  if (camPending){
    if (camIsOn()){ camPending = 0; if (closeTutOnCam) closeTutUntil = performance.now() + 3000; relayout(); setTimeout(relayout, 300); setTimeout(relayout, 900); }   // 摄像头画面出来后再排一次版，教学时捏捏、手势标记和画面对齐
    else if (!$('camBtn').disabled && performance.now() - camPending > 600){
      // 没打开（拒绝授权 / 不支持 / 模型加载失败）：回到提醒卡片，显示原因
      camPending = 0; setOnb(false); closeTutOnCam = false; body.classList.remove('no-gp');
      if (body.dataset.page === 'immersive'){ $('cpErr').textContent = $('status').textContent; $('cpErr').hidden = false; $('camPrompt').hidden = false; }
    }
    return;
  }
  if (closeTutOnCam && camIsOn()){
    const t = NN.tut;
    if (t.open){ const x = $('gpanel').querySelector('.gp-x, [data-a="close"]'); if (x) x.click(); closeTutOnCam = false; setTimeout(() => body.classList.remove('no-gp'), 400); }
    else if (performance.now() > closeTutUntil){ closeTutOnCam = false; body.classList.remove('no-gp'); }   // 摄像头开了 3 秒面板都没出现：不再等
  }
  // 摄像头没打开（拒绝、失败）或过了 5 秒面板都没出现：别一直藏着，用户之后自己点「手势教学」要能看到
  if (body.classList.contains('no-gp') && !closeTutOnCam && !camPending && !camIsOn()) body.classList.remove('no-gp');
  if (body.classList.contains('onboarding')){
    // 全屏教学（第一次用的人）：必须走完 5 步，完成页点「开始玩」后才出现导航和侧栏
    const t = NN.tut;
    if (!camIsOn()){ setOnb(false); return; }
    if (!onbDone){
      if (t.open && t.mode === 'learn' && t.step >= NN.TUTN) onbDone = true;
      else if (!t.open || t.mode !== 'learn') NN.openTut('learn', 0);
    } else if (!t.open || t.mode !== 'learn'){ setOnb(false); $('resetBtn').click(); markTutSeen(); }   // 教学结束、进入完整页面：把教学时捏过的物体恢复原状（用原来的「重置原形」）
  }
}, 150);

/* ---------- 双手拉断弹回后：提示先松开再捏（原逻辑要两只手都松开才能重新拉，之前没有任何提示，看起来像失灵） ---------- */
{
  const tipEl = document.createElement('div'); tipEl.className = 'snap-tip'; tipEl.hidden = true;
  tipEl.textContent = '拉断啦～两只手先松开，再捏住就能继续拉';
  document.body.append(tipEl);
  setInterval(() => { const g = NN.GD && NN.GD.dual; tipEl.hidden = !(g && g.block && camIsOn() && body.dataset.page === 'immersive'); }, 120);
}

/* ---------- 手快出摄像头画面时提醒：往外拉时手常常移到画面边缘，半只手出画就认不到了 ---------- */
{
  const el = document.createElement('div'); el.className = 'edge-warn'; el.hidden = true; document.body.append(el);
  const NAME = { Left:'左手', Right:'右手' };
  let since = {};
  setInterval(() => {
    const t = performance.now(), H = NN.hands, out = [];
    if (camIsOn() && body.dataset.page === 'immersive') for (const k of ['Left', 'Right']){
      const h = H[k]; if (!h || !h.lm || t - h.seen > 600){ since[k] = 0; continue; }
      const edge = h.lm.some(p => p.x < .02 || p.x > .98 || p.y < .02 || p.y > .98);
      since[k] = edge ? (since[k] || t) : 0;
      if (since[k] && t - since[k] > 250) out.push(NAME[k]);
    }
    el.hidden = !out.length;
    if (out.length) el.textContent = `${out.join('和')}快出画面了，往中间挪一点`;
  }, 120);
}

/* ---------- 性能：软件渲染提醒 + 卡顿时自动降低清晰度 ---------- */
{
  // 1) 浏览器没开硬件加速时，3D 是用 CPU 模拟显卡在画，会卡得像幻灯片：直接告诉用户怎么打开
  let soft = false, gpuName = '';
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    gpuName = gl ? String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'no-webgl';
    soft = !gl || /swiftshader|llvmpipe|software|basic render|softpipe|mesa offscreen/i.test(gpuName);
  } catch (e){}
  window.__nnGPU = gpuName;
  if (soft){
    let dismissed = false; try { dismissed = sessionStorage.getItem('as-soft-x') === '1'; } catch (e){}
    if (!dismissed){
      const bar = document.createElement('div'); bar.className = 'perf-bar';
      bar.innerHTML = '<b>这个浏览器没开硬件加速，3D 会很卡</b><span>在浏览器设置里打开「使用硬件加速（图形加速）」，重启浏览器后再试；或者换用最新版 Chrome / Edge。</span><button type="button" aria-label="关闭">×</button>';
      bar.querySelector('button').onclick = () => { bar.remove(); try { sessionStorage.setItem('as-soft-x', '1'); } catch (e){} };
      document.body.append(bar);
    }
  }
  // 2) 连续 2 秒平均每帧超过 45 毫秒（不到 22 帧/秒），就把画面清晰度降一档：2 → 1.25 → 1 → 0.75，手感和效果不变，只是没那么细
  const STEPS = [2, 1.25, 1, .75];
  let step = soft ? 2 : 0, acc = 0, n = 0, lastT = performance.now(), winStart = lastT;
  window.__nnDprCap = STEPS[step];
  if (soft) relayout();
  function meter(t){
    requestAnimationFrame(meter);
    const dt = t - lastT; lastT = t;
    if (document.hidden || dt > 1000 || body.dataset.page !== 'immersive'){ acc = n = 0; winStart = t; return; }
    acc += dt; n++;
    if (t - winStart > 2000){
      if (acc/n > 45 && step < STEPS.length - 1 && Math.min(devicePixelRatio || 1, STEPS[step]) > STEPS[step + 1]){ step++; window.__nnDprCap = STEPS[step]; relayout(); }
      acc = n = 0; winStart = t;
    }
  }
  requestAnimationFrame(meter);
}

/* ---------- 教学完成页：用手指直接点「开始玩」（不用换回鼠标） ---------- */
// 食指尖对准按钮停一下（圆环走满）就点下；对准时拇指食指捏一下也能立刻点。只在教学完成页生效，教学步骤里不会误点到「跳过」
{
  const cur = document.createElement('div'); cur.className = 'hand-cur'; cur.hidden = true;
  cur.innerHTML = '<svg viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" pathLength="100"/></svg><i></i>';
  document.body.append(cur);
  const fg = cur.querySelector('.fg'), DWELL = 1000;
  let target = null, since = 0, pinchWas = false, firedAt = 0;
  const reset = () => { if (target) target.classList.remove('hand-hover'); target = null; since = 0; };
  function tick(now){
    requestAnimationFrame(tick);
    const foot = $('gpanel').hidden ? null : $('gpanel').querySelector('.gp-foot');
    const done = foot && foot.querySelector('[data-a="close"]') && camIsOn() && body.dataset.page === 'immersive';
    if (!done){ cur.hidden = true; reset(); pinchWas = false; return; }
    if (!$('gpanel').querySelector('.gp-handhint')){ const p = document.createElement('p'); p.className = 'gp-handhint'; p.textContent = '不用换鼠标：食指指着「开始玩」停一下，或捏一下手指就能点'; foot.before(p); }
    const H = NN.hands, t = performance.now(), btns = [...foot.querySelectorAll('button')];
    // 找离按钮最近、最近一帧还在的那只手的食指尖
    let best = null;
    for (const k of ['Left', 'Right']){
      const h = H[k]; if (!h || !h.tips || t - h.seen > 300) continue;
      const [x, y] = h.tips[1];
      for (const b of btns){ const r = b.getBoundingClientRect(), d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom)); if (!best || d < best.d) best = { h, x, y, b, d }; }
    }
    if (!best){ cur.hidden = true; reset(); return; }
    cur.hidden = false; cur.style.transform = `translate(${best.x}px, ${best.y}px)`;
    const hit = best.d < 16 ? best.b : null;
    if (hit !== target){ reset(); if (hit){ target = hit; since = now; hit.classList.add('hand-hover'); } }
    const p = target ? Math.min(1, (now - since)/DWELL) : 0;
    cur.classList.toggle('on', !!target); fg.style.strokeDashoffset = 100 - p*100;
    const pinch = best.h.rawPinch > .75, tap = pinch && !pinchWas; pinchWas = pinch;
    if (target && (p >= 1 || tap) && now - firedAt > 800){ firedAt = now; const b = target; reset(); cur.hidden = true; b.click(); restoredAt = performance.now() + 2000; }   // 刚用手点完，手还在画面里：两侧栏先别自动收起，让用户看清完整页面
  }
  requestAnimationFrame(tick);
}

/* ---------- 沉浸体验左栏：原造型按钮换成统一缩略图，并加「全部」 ---------- */
const shapeBtn = k => $('shapes').querySelector(`button[data-k="${k}"]`);
$('shapes').querySelectorAll('button').forEach(b => { const sw = b.querySelector('.sw'); if (sw && THUMBS[b.dataset.k]){ sw.className = 'sw img'; sw.style.background = ''; sw.style.backgroundImage = `url(${THUMBS[b.dataset.k]})`; } });
{
  const all = document.createElement('button'); all.type = 'button'; all.dataset.c = 'all'; all.textContent = '全部';
  all.onclick = () => { $('shapes').querySelectorAll('button').forEach(b => b.hidden = false); $('shapeCats').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === all)); };
  $('shapeCats').prepend(all); all.click();
}

/* ---------- 素材库：网格 + 详情 ---------- */
let libCat = 'all', libQ = '';
const libCats = $('libCats'), libGrid = $('libGrid');
for (const [c, name] of CATS){
  const b = document.createElement('button'); b.type = 'button'; b.dataset.c = c; b.textContent = name;
  b.onclick = () => { libCat = c; renderLib(); };
  libCats.append(b);
}
const cards = {};
for (const [k, s] of Object.entries(SHAPES)){
  const b = document.createElement('button'); b.type = 'button'; b.className = 'lcard'; b.dataset.k = k;
  b.innerHTML = `<img alt="" src="${THUMBS[k] || s.icon || ''}"><span>${s.name}</span>`;
  b.onclick = () => { if ($('allSheet').classList.contains('home-mode')) return selectCard(k); closeAll(); if (body.dataset.page !== 'immersive') go('immersive'); pickShape(k); };
  cards[k] = b; libGrid.append(b);
}
const empty = document.createElement('div'); empty.className = 'lib-empty'; empty.textContent = '没有找到，换个词试试'; libGrid.append(empty);
$('libCount').textContent = `共 ${Object.keys(SHAPES).length} 件`;
$('libSearch').addEventListener('input', e => { libQ = e.target.value.trim(); renderLib(); });
$('libSearch').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') closeAll(); });
function renderLib(){
  libCats.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === libCat));
  let n = 0;
  for (const [k, s] of Object.entries(SHAPES)){
    const q = libQ.toLowerCase(), en = window.__t ? window.__t(s.name).toLowerCase() : '';
    const show = (libCat === 'all' || (s.cat || 'orig') === libCat) && (!libQ || s.name.includes(libQ) || en.includes(q) || (CAT_NAME[s.cat || 'orig'] || '').includes(libQ));   // 英文版也能搜英文名
    cards[k].hidden = !show; if (show) n++;
  }
  empty.hidden = n > 0;
}
renderLib();
function pickShape(k){
  const b = shapeBtn(k); if (!b) return;
  cards[k].classList.add('loading'); pushRecent(k);
  b.click();
  const t0 = performance.now();
  // 新选的物品总是以正面出现，不延续上一个的朝向（等它加载完再转）
  const wait = () => { if (!b.classList.contains('loading') || performance.now() - t0 > 8000){ cards[k].classList.remove('loading'); $('viewFront').click(); } else setTimeout(wait, 60); };
  setTimeout(wait, 30);
}
// 「捏一捏」左栏：最近 / 推荐 6 个（新选的排最前），剩下的在「全部捏捏」里
let recent = ['mochi', 'peach', 'cat', 'cloud', 'star', 'paw'].filter(k => SHAPES[k]);
try { const r = JSON.parse(localStorage.getItem('nn.recent') || 'null'); if (Array.isArray(r)) recent = r.filter(k => SHAPES[k]).concat(recent).filter((k, i, a) => a.indexOf(k) === i).slice(0, 6); } catch (e){}
function pushRecent(k){
  recent = [k].concat(recent.filter(x => x !== k)).slice(0, 6);
  try { localStorage.setItem('nn.recent', JSON.stringify(recent)); } catch (e){}
  renderMini();
}
function renderMini(){
  const m = $('mini'); m.textContent = '';
  for (const k of recent){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lcard'; b.dataset.k = k;
    b.innerHTML = `<img alt="" src="${THUMBS[k] || SHAPES[k].icon || ''}"><span>${SHAPES[k].name}</span>`;
    b.setAttribute('aria-pressed', state.shape === k);
    b.onclick = () => pickShape(k);
    m.append(b);
  }
}
renderMini();
// 材质球 / 蜡壳（素材库里的镜像按钮，点了等于点原按钮）
// 材质展示顺序：柔软黏土 → PU 慢回弹 → 史莱姆 → 超软硅胶 → 凝胶填充（只调按钮顺序，不改默认材质和逻辑）
const MAT_ORDER = ['slime', 'foam', 'goo', 'jelly', 'gel'].filter(k => MATS[k]).concat(Object.keys(MATS).filter(k => !['slime', 'foam', 'goo', 'jelly', 'gel'].includes(k)));
for (const k of MAT_ORDER){ const b = $('mats').querySelector(`button[data-k="${k}"]`); if (b) $('mats').append(b); }
for (const k of MAT_ORDER){
  const b = document.createElement('button'); b.type = 'button'; b.className = 'orb'; b.dataset.k = k; b.textContent = MATS[k].name;
  b.onclick = () => $('mats').querySelector(`button[data-k="${k}"]`).click();
  $('ldMats').append(b);
}
for (const [v, name, sub] of WAX){
  const b = document.createElement('button'); b.type = 'button'; b.dataset.l = v; b.innerHTML = `${name}<small>${sub}</small>`;
  b.onclick = () => $('layers').querySelector(`button[data-l="${v}"]`).click();
  $('ldWax').append(b);
}
$('ldReset').onclick = () => $('resetBtn').click();
$('camReset').onclick = () => $('resetBtn').click();
$('camAuto').onclick = () => $('autoRot').click();
// 互动方式：点「鼠标/触屏」就关掉摄像头回到鼠标模式（底部工具条只在鼠标模式出现）
$('tileMouse').onclick = () => { if (camIsOn() && !$('camBtn').disabled) $('camBtn').click(); };
$('ldFront').onclick = () => $('viewFront').click();
$('ldAuto').onclick = () => $('autoRot').click();

function tagsFor(s){
  const t = [], f = s.food;
  if (f && FOOD_TAG[f.kind]) t.push(['hot', FOOD_TAG[f.kind]]);
  if (f && f.crunch) t.push(['hot', '酥脆']);
  if (f && f.steam) t.push(['hot', '冒热气']);
  if (f && f.zone) t.push(['hot', '戳破流心']);
  if (s.skin) t.push(['', '原模型外观']);
  t.push(['', '音效 · ' + (SND_NAME[s.sound] || '随材质变化')]);
  return t;
}
function matInfoHTML(){
  const m = MATS[state.mat];
  return `<b>${m.name}</b><span class="spec">${m.spec}</span><span class="desc">${m.desc}</span>`;
}

/* ---------- 同步：原按钮状态变了，界面跟着变 ---------- */
let lastSig = '';
function sync(){
  const s = SHAPES[state.shape];
  const sig = [state.shape, state.mat, state.wax, $('credit').innerHTML, $('autoRot').getAttribute('aria-pressed'), camIsOn(), $('tutBtn').hidden, zhText($('status'))].join('|');
  if (sig === lastSig) return; lastSig = sig;
  for (const [k, b] of Object.entries(cards)) b.setAttribute('aria-pressed', k === state.shape);
  $('mini').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === state.shape));
  $('ldThumb').src = THUMBS[state.shape] || s.icon || '';
  $('ldName').textContent = s.name;
  $('ldCat').textContent = CAT_NAME[s.cat || 'orig'];
  $('ldTags').innerHTML = tagsFor(s).map(([c, t]) => `<span class="${c}">${t}</span>`).join('');
  $('ldMats').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === state.mat));
  $('ldWax').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.l === state.wax));
  $('ldWaxHint').textContent = LAYER_HINT[state.wax] || '';
  $('ldMatInfo').innerHTML = matInfoHTML(); $('matInfo').innerHTML = matInfoHTML();
  $('ldCredit').innerHTML = $('credit').hidden ? '原创造型' : $('credit').innerHTML;
  $('ldAuto').setAttribute('aria-pressed', $('autoRot').getAttribute('aria-pressed'));
  $('libTip').textContent = $('status').textContent;
  $('sndInfo').innerHTML = `<span>${s.name} · ${SND_NAME[s.sound] || '随材质变化'}</span><span>${MATS[state.mat].name} · ${MATS[state.mat].spec.split('·')[0].trim()}</span>`;
  const cam = camIsOn();
  $('tileMouse').classList.toggle('on', !cam); body.classList.toggle('cam', cam); $('camAuto').setAttribute('aria-pressed', $('autoRot').getAttribute('aria-pressed')); $('camBtn').classList.toggle('on', cam);
  $('tutPh').hidden = !$('tutBtn').hidden;
}
const mo = new MutationObserver(sync);
for (const id of ['shapes', 'mats', 'layers', 'credit', 'autoRot', 'camBtn', 'tutBtn', 'status']) mo.observe($(id), { attributes:true, childList:true, subtree:true, characterData:true });
sync();

/* ---------- 右栏标签页 ---------- */

/* ---------- 底部手法提示 ---------- */
const tip = $('tooltip'); let tipT = 0;
function showTip(text){ tip.textContent = text; tip.classList.add('show'); clearTimeout(tipT); tipT = setTimeout(() => tip.classList.remove('show'), 3200); }
document.querySelectorAll('.tool[data-tip]').forEach(b => {
  b.onclick = () => showTip(TIPS[b.dataset.tip]);
  b.onmouseenter = () => showTip(TIPS[b.dataset.tip]);
});
$('drawerBtn').onclick = () => body.classList.toggle('drawer');
$('stage').addEventListener('pointerdown', () => body.classList.remove('drawer'));

/* ---------- 沉浸捏：两侧栏自动隐藏，鼠标碰到再出来 ---------- */
let hoverSide = false, restoredAt = 0;
function setImmersed(on){
  if (on && (body.classList.contains('onboarding') || body.dataset.page !== 'immersive' || isTouchPhone() || hoverSide || performance.now() - restoredAt < 600)) return;
  body.classList.toggle('immersed', on);
}
addEventListener('pointerdown', e => {
  if (e.target !== $('stage')) return;
  setTimeout(() => { if ([...NN.ptrs.values()].some(p => p.mode !== 'orbit')) setImmersed(true); }, 0);
}, true);
function sideRects(){
  const r = [];
  for (const id of ['panel', 'rpanel']){ const el = $(id); if (el.offsetWidth) r.push([el.offsetLeft - 12, el.offsetTop - 12, el.offsetLeft + el.offsetWidth + 12, el.offsetTop + el.offsetHeight + 12]); }
  return r;
}
addEventListener('pointermove', e => {
  if (body.dataset.page !== 'immersive' || isTouchPhone()) return;
  const inside = sideRects().some(([a, b, c, d]) => e.clientX >= a && e.clientX <= c && e.clientY >= b && e.clientY <= d);
  const busy = [...NN.ptrs.values()].some(p => p.mode !== 'orbit');
  hoverSide = inside && !busy;
  if (body.classList.contains('immersed') && hoverSide){ body.classList.remove('immersed'); restoredAt = performance.now(); }
});
document.querySelectorAll('.edge').forEach(b => b.onclick = () => { body.classList.remove('immersed'); restoredAt = performance.now(); });
// 摄像头手势捏的时候也隐藏（看 HUD 状态，不碰手势逻辑）
let liveKey = '';
setInterval(() => {
  const s = zhText($('hudState'));
  if (!IDLE.includes(s) && camIsOn()) setImmersed(true);
  let k = '';
  for (const [key, list] of Object.entries(LIVE)) if (list.includes(s)) k = key;
  if (k !== liveKey){ liveKey = k; document.querySelectorAll('.tool[data-tip]').forEach(b => b.classList.toggle('live', b.dataset.tip === k)); }
}, 120);

/* ---------- 手机：底部造型栏高度 ---------- */
new ResizeObserver(() => document.documentElement.style.setProperty('--mob-sheet', ($('panel').offsetHeight || 188) + 'px')).observe($('panel'));
relayout();

/* ---------- 首页：果冻字 SQUISHY（浅色）。能按扁、能拉长，往下滚动融化成一排捏捏（货架） ---------- */
// 独立的小画布，只在首页显示时渲染；货架上的造型直接读主程序的 SHAPES（形状 + 五官贴图），不改主程序
function startHome(THREE, SHAPES){
  const H3 = {};
/* three.js 附加模块（RoomEnvironment / FontLoader / TextGeometry），改成直接用页面里已有的 THREE */
{
/**
 * https://github.com/google/model-viewer/blob/master/packages/model-viewer/src/three-components/EnvironmentScene.ts
 */

const {  	BackSide,  	BoxGeometry,  	Mesh, 	MeshBasicMaterial,  	MeshStandardMaterial,  	PointLight,  	Scene, } = THREE;

class RoomEnvironment extends Scene {

	constructor( renderer = null ) {

		super();

		const geometry = new BoxGeometry();
		geometry.deleteAttribute( 'uv' );

		const roomMaterial = new MeshStandardMaterial( { side: BackSide } );
		const boxMaterial = new MeshStandardMaterial();

		let intensity = 5;

		if ( renderer !== null && renderer._useLegacyLights === false ) intensity = 900;

		const mainLight = new PointLight( 0xffffff, intensity, 28, 2 );
		mainLight.position.set( 0.418, 16.199, 0.300 );
		this.add( mainLight );

		const room = new Mesh( geometry, roomMaterial );
		room.position.set( - 0.757, 13.219, 0.717 );
		room.scale.set( 31.713, 28.305, 28.591 );
		this.add( room );

		const box1 = new Mesh( geometry, boxMaterial );
		box1.position.set( - 10.906, 2.009, 1.846 );
		box1.rotation.set( 0, - 0.195, 0 );
		box1.scale.set( 2.328, 7.905, 4.651 );
		this.add( box1 );

		const box2 = new Mesh( geometry, boxMaterial );
		box2.position.set( - 5.607, - 0.754, - 0.758 );
		box2.rotation.set( 0, 0.994, 0 );
		box2.scale.set( 1.970, 1.534, 3.955 );
		this.add( box2 );

		const box3 = new Mesh( geometry, boxMaterial );
		box3.position.set( 6.167, 0.857, 7.803 );
		box3.rotation.set( 0, 0.561, 0 );
		box3.scale.set( 3.927, 6.285, 3.687 );
		this.add( box3 );

		const box4 = new Mesh( geometry, boxMaterial );
		box4.position.set( - 2.017, 0.018, 6.124 );
		box4.rotation.set( 0, 0.333, 0 );
		box4.scale.set( 2.002, 4.566, 2.064 );
		this.add( box4 );

		const box5 = new Mesh( geometry, boxMaterial );
		box5.position.set( 2.291, - 0.756, - 2.621 );
		box5.rotation.set( 0, - 0.286, 0 );
		box5.scale.set( 1.546, 1.552, 1.496 );
		this.add( box5 );

		const box6 = new Mesh( geometry, boxMaterial );
		box6.position.set( - 2.193, - 0.369, - 5.547 );
		box6.rotation.set( 0, 0.516, 0 );
		box6.scale.set( 3.875, 3.487, 2.986 );
		this.add( box6 );


		// -x right
		const light1 = new Mesh( geometry, createAreaLightMaterial( 50 ) );
		light1.position.set( - 16.116, 14.37, 8.208 );
		light1.scale.set( 0.1, 2.428, 2.739 );
		this.add( light1 );

		// -x left
		const light2 = new Mesh( geometry, createAreaLightMaterial( 50 ) );
		light2.position.set( - 16.109, 18.021, - 8.207 );
		light2.scale.set( 0.1, 2.425, 2.751 );
		this.add( light2 );

		// +x
		const light3 = new Mesh( geometry, createAreaLightMaterial( 17 ) );
		light3.position.set( 14.904, 12.198, - 1.832 );
		light3.scale.set( 0.15, 4.265, 6.331 );
		this.add( light3 );

		// +z
		const light4 = new Mesh( geometry, createAreaLightMaterial( 43 ) );
		light4.position.set( - 0.462, 8.89, 14.520 );
		light4.scale.set( 4.38, 5.441, 0.088 );
		this.add( light4 );

		// -z
		const light5 = new Mesh( geometry, createAreaLightMaterial( 20 ) );
		light5.position.set( 3.235, 11.486, - 12.541 );
		light5.scale.set( 2.5, 2.0, 0.1 );
		this.add( light5 );

		// +y
		const light6 = new Mesh( geometry, createAreaLightMaterial( 100 ) );
		light6.position.set( 0.0, 20.0, 0.0 );
		light6.scale.set( 1.0, 0.1, 1.0 );
		this.add( light6 );

	}

	dispose() {

		const resources = new Set();

		this.traverse( ( object ) => {

			if ( object.isMesh ) {

				resources.add( object.geometry );
				resources.add( object.material );

			}

		} );

		for ( const resource of resources ) {

			resource.dispose();

		}

	}

}

function createAreaLightMaterial( intensity ) {

	const material = new MeshBasicMaterial();
	material.color.setScalar( intensity );
	return material;

}


H3.RoomEnvironment = RoomEnvironment;
}
{
const { 	FileLoader, 	Loader, 	ShapePath } = THREE;

class FontLoader extends Loader {

	constructor( manager ) {

		super( manager );

	}

	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );
		loader.load( url, function ( text ) {

			const font = scope.parse( JSON.parse( text ) );

			if ( onLoad ) onLoad( font );

		}, onProgress, onError );

	}

	parse( json ) {

		return new Font( json );

	}

}

//

class Font {

	constructor( data ) {

		this.isFont = true;

		this.type = 'Font';

		this.data = data;

	}

	generateShapes( text, size = 100 ) {

		const shapes = [];
		const paths = createPaths( text, size, this.data );

		for ( let p = 0, pl = paths.length; p < pl; p ++ ) {

			shapes.push( ...paths[ p ].toShapes() );

		}

		return shapes;

	}

}

function createPaths( text, size, data ) {

	const chars = Array.from( text );
	const scale = size / data.resolution;
	const line_height = ( data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness ) * scale;

	const paths = [];

	let offsetX = 0, offsetY = 0;

	for ( let i = 0; i < chars.length; i ++ ) {

		const char = chars[ i ];

		if ( char === '\n' ) {

			offsetX = 0;
			offsetY -= line_height;

		} else {

			const ret = createPath( char, scale, offsetX, offsetY, data );
			offsetX += ret.offsetX;
			paths.push( ret.path );

		}

	}

	return paths;

}

function createPath( char, scale, offsetX, offsetY, data ) {

	const glyph = data.glyphs[ char ] || data.glyphs[ '?' ];

	if ( ! glyph ) {

		console.error( 'THREE.Font: character "' + char + '" does not exists in font family ' + data.familyName + '.' );

		return;

	}

	const path = new ShapePath();

	let x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2;

	if ( glyph.o ) {

		const outline = glyph._cachedOutline || ( glyph._cachedOutline = glyph.o.split( ' ' ) );

		for ( let i = 0, l = outline.length; i < l; ) {

			const action = outline[ i ++ ];

			switch ( action ) {

				case 'm': // moveTo

					x = outline[ i ++ ] * scale + offsetX;
					y = outline[ i ++ ] * scale + offsetY;

					path.moveTo( x, y );

					break;

				case 'l': // lineTo

					x = outline[ i ++ ] * scale + offsetX;
					y = outline[ i ++ ] * scale + offsetY;

					path.lineTo( x, y );

					break;

				case 'q': // quadraticCurveTo

					cpx = outline[ i ++ ] * scale + offsetX;
					cpy = outline[ i ++ ] * scale + offsetY;
					cpx1 = outline[ i ++ ] * scale + offsetX;
					cpy1 = outline[ i ++ ] * scale + offsetY;

					path.quadraticCurveTo( cpx1, cpy1, cpx, cpy );

					break;

				case 'b': // bezierCurveTo

					cpx = outline[ i ++ ] * scale + offsetX;
					cpy = outline[ i ++ ] * scale + offsetY;
					cpx1 = outline[ i ++ ] * scale + offsetX;
					cpy1 = outline[ i ++ ] * scale + offsetY;
					cpx2 = outline[ i ++ ] * scale + offsetX;
					cpy2 = outline[ i ++ ] * scale + offsetY;

					path.bezierCurveTo( cpx1, cpy1, cpx2, cpy2, cpx, cpy );

					break;

			}

		}

	}

	return { offsetX: glyph.ha * scale, path: path };

}


H3.FontLoader = FontLoader;
}
{
/**
 * Text = 3D Text
 *
 * parameters = {
 *  font: <THREE.Font>, // font
 *
 *  size: <float>, // size of the text
 *  height: <float>, // thickness to extrude text
 *  curveSegments: <int>, // number of points on the curves
 *
 *  bevelEnabled: <bool>, // turn on bevel
 *  bevelThickness: <float>, // how deep into text bevel goes
 *  bevelSize: <float>, // how far from text outline (including bevelOffset) is bevel
 *  bevelOffset: <float> // how far from text outline does bevel start
 * }
 */

const { 	ExtrudeGeometry } = THREE;

class TextGeometry extends ExtrudeGeometry {

	constructor( text, parameters = {} ) {

		const font = parameters.font;

		if ( font === undefined ) {

			super(); // generate default extrude geometry

		} else {

			const shapes = font.generateShapes( text, parameters.size );

			// translate parameters to ExtrudeGeometry API

			parameters.depth = parameters.height !== undefined ? parameters.height : 50;

			// defaults

			if ( parameters.bevelThickness === undefined ) parameters.bevelThickness = 10;
			if ( parameters.bevelSize === undefined ) parameters.bevelSize = 8;
			if ( parameters.bevelEnabled === undefined ) parameters.bevelEnabled = false;

			super( shapes, parameters );

		}

		this.type = 'TextGeometry';

	}

}



H3.TextGeometry = TextGeometry;
}
  const cv = document.getElementById('homeGL'); if (!cv) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = new THREE.WebGLRenderer({ canvas:cv, antialias:true, alpha:true });
  R.setPixelRatio(Math.min(1.75, devicePixelRatio || 1)); R.toneMapping = THREE.ACESFilmicToneMapping; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new H3.RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#fffaf2', '#e8d9e6', 1.3));
  const key = new THREE.DirectionalLight('#ffffff', 1.8); key.position.set(-4, 8, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left:-10, right:10, top:6, bottom:-6 }); scene.add(key);
  for (const [c, x, y, z, i] of [['#ff9ec7', -7, 2, 4, 40], ['#9fd8ff', 7, 1, 4, 40]]){ const l = new THREE.PointLight(c, i, 20); l.position.set(x, y, z); scene.add(l); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity:.12 })); floor.rotation.x = -Math.PI/2; floor.position.y = -.9; floor.receiveShadow = true; scene.add(floor);
  const cam = new THREE.PerspectiveCamera(32, 1, .1, 100); cam.position.set(0, .4, 18); cam.lookAt(0, .3, 0);
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a)/(b - a))); return t*t*(3 - 2*t); };
  const lerp = (a, b, k) => a + (b - a)*k;

  // 果冻字母：原点在字母底部中间，压扁时贴着地面
  const font = new H3.FontLoader().parse(window.__HOME_FONT);
  const COLS = ['#FFA6C9', '#FFC59A', '#FFE48F', '#9EE8C8', '#9CCEFF', '#C3AEFF', '#FFB3DC'], WORD = 'SQUISHY', size = 1.55;
  const grp = new THREE.Group(), letters = []; let x0 = 0;
  for (let i = 0; i < WORD.length; i++){
    const g = new H3.TextGeometry(WORD[i], { font, size, height:.7, curveSegments:20, bevelEnabled:true, bevelThickness:.5, bevelSize:.26, bevelSegments:12 });
    g.computeBoundingBox(); const bb = g.boundingBox, w = bb.max.x - bb.min.x;
    g.translate(-bb.min.x - w/2, -bb.min.y, -.35);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color:COLS[i], roughness:.08, clearcoat:1, clearcoatRoughness:.04, transmission:.3, thickness:2, ior:1.4, iridescence:.45, iridescenceIOR:1.3, envMapIntensity:1.4, sheen:.5, sheenColor:new THREE.Color('#fff') }));
    m.castShadow = true;
    const L = new THREE.Group(); L.add(m); L.position.x = x0 + w/2; x0 += w + size*.22;
    L.userData = { sy:1, vy:0, ty:1, base:new THREE.Vector3(), tilt:Math.sin(i*1.7)*.06, bob:i*.9 };
    m.userData.letter = L; grp.add(L); letters.push(L);
  }
  letters.forEach(L => { L.position.x -= x0/2 - size*.11; L.userData.base.copy(L.position); });
  grp.position.y = -.9; scene.add(grp);

  // 货架：原创造型，每个都是简化软体（每个顶点一个弹簧），中间那个按住会陷下去，松手 Q 弹回来
  const SHELF = ['mochi'].filter(k => SHAPES[k] && SHAPES[k].fn);   // 融化后只留团子；往下滚直接打开「全部捏捏」（不再有 3D 货架）
  function makeSoft(def){
    const geo = new THREE.SphereGeometry(1, 96, 72), p = geo.attributes.position, uv = geo.attributes.uv, d = [0, 0, 0];
    for (let i = 0; i < p.count; i++){
      const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize(); d[0] = v.x; d[1] = v.y; d[2] = v.z;
      const q = def.fn(d)[0]; p.setXYZ(i, q[0], q[1], q[2]);
      // 贴图坐标按方向算，和主程序 bakeDeco 的经纬度对应（经度 0 = 正面）
      uv.setXY(i, (Math.atan2(v.x, v.z) + Math.PI)/(2*Math.PI), .5 + Math.asin(Math.max(-1, Math.min(1, v.y)))/Math.PI);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({ color:def.sw || '#ffd9e4', roughness:.14, clearcoat:1, clearcoatRoughness:.06, sheen:.4, sheenColor:new THREE.Color('#fff'), envMapIntensity:1.15 });
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.visible = false; scene.add(mesh);
    const rest = Float32Array.from(p.array), nrm = Float32Array.from(geo.attributes.normal.array), n = p.count, off = new Float32Array(n), vel = new Float32Array(n);
    const S = { mesh, def, press:null, active:0, tex:false,
      loadTex(){ if (S.tex || !def.model) return; S.tex = true; try { mat.map = def.model.texture; mat.color.set('#fff'); mat.needsUpdate = true; } catch (e){} },
      update(dt){
        if (S.active <= 0) return;
        let moving = 0; const h = Math.min(dt, 1/30);
        for (let i = 0; i < n; i++){
          let t = 0;
          if (S.press){ const q = S.press, dx = rest[i*3] - q.p.x, dy = rest[i*3+1] - q.p.y, dz = rest[i*3+2] - q.p.z, d = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (d < q.r) t = -q.d*Math.cos(d/q.r*Math.PI/2)**2; else if (d < q.r*2.4) t = q.d*.16*Math.sin((d - q.r)/(q.r*1.4)*Math.PI); }
          vel[i] += (260*(t - off[i]) - 9*vel[i])*h; off[i] += vel[i]*h;
          if (Math.abs(vel[i]) > 1e-3 || Math.abs(off[i] - t) > 1e-3) moving = 1;
        }
        const a = geo.attributes.position.array;
        for (let i = 0; i < n; i++){ const o = off[i]; a[i*3] = rest[i*3] + nrm[i*3]*o; a[i*3+1] = rest[i*3+1] + nrm[i*3+1]*o; a[i*3+2] = rest[i*3+2] + nrm[i*3+2]*o; }
        geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
        if (!S.press && !moving) S.active -= dt;
      } };
    return S;
  }
  const items = SHELF.map(k => makeSoft(SHAPES[k]));
  items.forEach((it, i) => setTimeout(() => it.loadTex(), 300 + i*350));   // 五官贴图错开慢慢烤，不卡首屏
  let idx = 0, idxF = 0;
  const nameEl = document.getElementById('hShelfName'), goEl = document.getElementById('hShelfGo');
  function setIdx(i){
    idx = Math.max(0, Math.min(items.length - 1, i));
    if (nameEl) nameEl.textContent = items[idx].def.name;
    if (goEl) goEl.dataset.k = SHELF[idx];
  }
  setIdx(0);
  window.__homeShelf = { next:() => setIdx(idx + 1), prev:() => setIdx(idx - 1), get key(){ return SHELF[idx]; }, get index(){ return idx; } };
  const center = () => items[idx];

  // 指针：按住字母 = 压扁，按住往上拖 = 拉长；融化后按团子 = 按下去
  const ray = new THREE.Raycaster(), nv = new THREE.Vector2(), ptr = { x:0, y:0, has:false, down:false, y0:0, sx:0, sy:0, t0:0 };
  let L = null, mPress = null, tapTo = -1;
  const setN = e => { const r = cv.getBoundingClientRect(); ptr.x = e.clientX; ptr.y = e.clientY; nv.set((e.clientX - r.left)/r.width*2 - 1, -((e.clientY - r.top)/r.height*2 - 1)); ptr.has = true; };
  cv.addEventListener('pointermove', setN);
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); setN(e); ptr.down = true; ptr.y0 = ptr.sy = e.clientY; ptr.sx = e.clientX; ptr.t0 = performance.now();
    ray.setFromCamera(nv, cam);
    if (P > .7){
      const hits = ray.intersectObjects(items.filter(it => it.mesh.visible).map(it => it.mesh), false)[0];
      if (hits && hits.object === center().mesh) mPress = center().mesh.worldToLocal(hits.point.clone());
      else if (hits) tapTo = items.findIndex(it => it.mesh === hits.object);
    }
    else { const h = ray.intersectObjects(letters.map(l => l.children[0]), false)[0]; if (h) L = h.object.userData.letter; }
  });
  const upH = () => {
    // 融化后左右拖动 = 换一个；点旁边那个 = 把它移到中间
    if (ptr.down && P > .7){ const dx = ptr.x - ptr.sx; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(ptr.y - ptr.sy)) setIdx(idx + (dx < 0 ? 1 : -1)); else if (tapTo >= 0) setIdx(tapTo); }
    ptr.down = false; if (L) L.userData.ty = 1; L = null; mPress = null; tapTo = -1; items.forEach(it => it.press = null);
  };
  cv.addEventListener('pointerup', upH); cv.addEventListener('pointercancel', upH);
  // 滚动：字母融化成团子（再往回滚就变回来）
  let P = 0, PT = 0;
  // 滚动：先融化；到货架后继续滚 = 换下一个，往回滚到第一个再往回 = 变回字母
  let wAcc = 0, wLock = 0;
  // 滚动：字母融化；融化完（再往下滚）就直接打开「全部捏捏」
  const onWheel = dy => {
    PT = Math.max(0, Math.min(1, PT + dy*.0012));
    if (PT >= 1 && dy > 0 && window.__homeLib) window.__homeLib();
  };
  cv.addEventListener('wheel', e => { e.preventDefault(); onWheel(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); }, { passive:false });
  let ty = null;
  cv.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive:true });
  cv.addEventListener('touchmove', e => { if (ty != null && !L && !mPress){ const d = ty - e.touches[0].clientY; ty = e.touches[0].clientY; onWheel(d*2); } }, { passive:true });
  // 手指/滚轮落在首页的文字、按钮上（不在 3D 画面上）时也能往下滑：以前只有落在画面空白处才有反应
  const onHomeOverlay = e => document.body.dataset.page === 'home' && e.target !== cv && !(e.target.closest && e.target.closest('#allSheet, .topbar'));
  addEventListener('wheel', e => { if (onHomeOverlay(e)){ e.preventDefault(); onWheel(Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY); } }, { passive:false });
  addEventListener('touchstart', e => { if (onHomeOverlay(e)) ty = e.touches[0].clientY; }, { passive:true });
  addEventListener('touchmove', e => { if (onHomeOverlay(e) && ty != null && !L && !mPress){ const d = ty - e.touches[0].clientY; ty = e.touches[0].clientY; onWheel(d*2); } }, { passive:true });
  window.__homeMelt = v => { PT = v; };

  function resize(){ const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight; R.setSize(w, h, false); cam.aspect = w/h; cam.position.z = Math.max(18, 18*1.6/(w/h)); cam.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  const cn = document.getElementById('hCn'), cta = document.getElementById('hCta'), melt = document.getElementById('hShelf'), allB = document.getElementById('hAll'), sideL = document.getElementById('hSideL'), sideR = document.getElementById('hSideR');
  let t = 0, last = performance.now(), hq = 2, hAcc = 0, hN = 0, hLast = last, hWin = last, lowFx = false;
  function frame(now){
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last)/1000); last = now;
    if (document.body.dataset.page !== 'home' || document.hidden){ hAcc = hN = 0; hLast = hWin = now; return; }
    // 卡顿时自动降低首页清晰度（2 秒平均每帧超过 45 毫秒就降一档），软件渲染时直接从 1 倍开始
    { const cap = Math.min(window.__nnDprCap || 2, hq), want = Math.min(1.75, devicePixelRatio || 1, cap); if (Math.abs(R.getPixelRatio() - want) > .01) R.setPixelRatio(want); }
    hAcc += now - hLast; hN++; hLast = now;
    if (now - hWin > 2000){ if (hAcc/hN > 45 && hq > .75){ hq = hq > 1.25 ? 1.25 : hq > 1 ? 1 : .75; } hAcc = hN = 0; hWin = now; }
    // 降到 1 倍还卡（或软件渲染）：关掉影子和字母的透光效果，这两样最费显卡
    if (!lowFx && Math.min(window.__nnDprCap || 2, hq) <= 1){ lowFx = true; R.shadowMap.enabled = false; letters.forEach(l => { const m = l.children[0].material; m.transmission = 0; m.iridescence = 0; m.needsUpdate = true; }); }
    if (cv.width !== Math.round(cv.clientWidth*R.getPixelRatio())) resize();
    t += dt;
    if (L){ const held = Math.min(1, (performance.now() - ptr.t0)/500), dy = (ptr.y0 - ptr.y)/200; L.userData.ty = dy > .15 ? 1 + Math.min(.9, dy*.6) : 1 - .38*held; }
    if (mPress){ const held = Math.min(1, (performance.now() - ptr.t0)/600), drag = Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy)/300, c = center(); c.press = { p:mPress, d:.12 + .3*held + Math.min(.22, drag*.22), r:.42 + Math.min(.22, drag*.3) }; c.active = 3; }
    const h = Math.min(dt, 1/30);
    for (const l of letters){ const u = l.userData; u.vy += (170*(u.ty - u.sy) - 7*u.vy)*h; u.sy += u.vy*h; const sx = 1/Math.sqrt(Math.max(.3, u.sy)); l.scale.set(sx, u.sy, sx); l.rotation.z = u.tilt + (reduce ? 0 : Math.sin(t*.8 + u.bob)*.025); l.position.y = u.base.y + (reduce ? 0 : Math.sin(t*1.1 + u.bob)*.06); }
    P = lerp(P, PT, Math.min(1, dt*3.5));
    letters.forEach((l, i) => { const c = Math.min(1, Math.max(0, P*1.4 - i*.05)); l.visible = c < .98; l.position.x = lerp(l.userData.base.x, 0, c); l.position.y += lerp(0, -.6, c); l.scale.multiplyScalar(1 - c*.92); });
    // 货架：中间的大一点、靠前；两边的小一点、往后排；第一个（团子）就是字母融化出来的那个
    const q = sm(.45, 1, P), qs = sm(.75, 1, P), sp = Math.min(3.4, 2.7*cam.aspect/1.6 + .6);
    idxF = lerp(idxF, idx, Math.min(1, dt*7));
    items.forEach((it, i) => {
      const o = i - idxF, ao = Math.abs(o), k = i === 0 ? q : qs;
      const show = k > .01 && ao < 3.2; it.mesh.visible = show; if (!show) return;
      const s = k*lerp(1.25, .62, Math.min(1, ao));
      it.mesh.scale.setScalar(s); it.mesh.position.set(o*sp*k, lerp(-.8, -.05, q) - Math.min(1, ao)*.25, -Math.min(1, ao)*1.6);
      it.mesh.rotation.y = (ptr.has && ao < .5 ? nv.x*.25 : 0) - o*.35 + (reduce ? 0 : Math.sin(t*.9 + i)*.05*Math.min(1, ao));
      if (ao < 1.6) it.loadTex();
      it.update(dt);
    });
    if (cn) cn.style.opacity = 1 - sm(.1, .4, P); if (cta) cta.style.opacity = 1 - sm(.1, .4, P);
    const so = sm(.7, .95, P); if (melt){ melt.style.opacity = so; melt.style.pointerEvents = so > .5 ? 'auto' : 'none'; } if (allB){ allB.style.opacity = so; allB.style.pointerEvents = so > .5 ? 'auto' : 'none'; }
    if (sideL) sideL.style.opacity = 1 - so; if (sideR) sideR.style.opacity = 1 - so;
    if (cta) cta.style.pointerEvents = P > .4 ? 'none' : '';
    grp.rotation.y = ptr.has ? nv.x*.12 : 0; grp.rotation.x = ptr.has ? -nv.y*.06 : 0;
    R.render(scene, cam);
  }
  requestAnimationFrame(frame);
}
