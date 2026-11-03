// ---------- 中 / EN 双语 ----------
// 做法：页面照常用中文写；英文模式下，把页面上出现的中文文字（包括之后动态生成的）按对照表换成英文。
// 语言：第一次按浏览器语言自动选（中文系统 → 中文，其他 → 英文），用户切换后记住。切换时整页重新载入，最稳。
(function(){
  const DICT = /*DICT*/{};          // 中文原文 → 英文（来自中英对照表）
  const PATTERNS = /*PATTERNS*/[];  // 带 {变量} 的句子：[正则源, 英文模板, 变量名…]
  const HTML = /*HTML*/{};          // 整块替换的英文 HTML（关于页等图文混排的段落）：选择器 → HTML
  const KEY = 'as-lang';
  let lang = null;
  try { lang = localStorage.getItem(KEY); } catch (e){}
  if (lang !== 'zh' && lang !== 'en') lang = /^zh\b/i.test(navigator.language || '') ? 'zh' : 'en';
  window.__lang = lang;
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  window.__setLang = l => { try { localStorage.setItem(KEY, l); } catch (e){} location.reload(); };

  const CJK = /[㐀-鿿！-～　-〿]/;
  const missing = window.__i18nMissing = new Set();
  const pats = PATTERNS.map(([src, tpl, names]) => [new RegExp('^' + src + '$'), tpl, names]);
  // 单段翻译：先查表，再试带变量的句子
  function one(s){
    if (!s) return s;
    if (Object.prototype.hasOwnProperty.call(DICT, s)) return DICT[s];
    for (const [re, tpl, names] of pats){
      const m = s.match(re);
      if (m) return tpl.replace(/\{(\w+)\}/g, (_, k) => { const v = m[names.indexOf(k) + 1]; return v == null ? '' : (CJK.test(v) ? (one(v) ?? v) : v); });
    }
    return null;
  }
  // 整句翻译：保留前后空白；查不到时按「 · 」「 / 」拆开逐段试
  function tr(text){
    if (!text || !CJK.test(text)) return text;
    const lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0], core = text.trim();
    let out = one(core);
    if (out == null){
      for (const sep of [' · ', ' / ', '｜', ' | ']){
        if (!core.includes(sep)) continue;
        const parts = core.split(sep).map(p => CJK.test(p) ? one(p.trim()) : p);
        if (parts.every(p => p != null)){ out = parts.join(sep); break; }
      }
    }
    // 末尾带冒号的标签（如致谢名单里的「苹果：」）、括号里的备注（「Grapes（简化网格）」）
    if (out == null){ const m = core.match(/^(.+?)[：:]$/); if (m){ const x = one(m[1]); if (x != null) out = x + ': '; } }
    if (out == null){ const m = core.match(/^(.*?)（(.+)）$/); if (m){ const a = CJK.test(m[1]) ? one(m[1]) : m[1], b = one(m[2]); if (a != null && b != null) out = a + ' (' + b + ')'; } }
    if (out == null){ missing.add(core); return text; }
    return lead + out + tail;
  }
  window.__t = s => lang === 'en' ? (tr(s) || s) : s;
  // 右上角语言按钮：显示“要切换到的”语言
  const setBtn = () => { const b = document.getElementById('langBtn'); if (!b) return; b.textContent = lang === 'en' ? '中文' : 'EN'; b.onclick = () => window.__setLang(lang === 'en' ? 'zh' : 'en'); };
  if (document.body) setBtn(); else document.addEventListener('DOMContentLoaded', setBtn);
  if (lang !== 'en') return;

  const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  const done = new WeakMap();   // 已经翻过的文字节点 → 翻译结果（避免反复处理）
  function node(n){
    if (n.nodeType === 3){
      const v = n.nodeValue;
      if (done.get(n) === v || !CJK.test(v)) return;
      const p = n.parentNode; if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return;
      const t = tr(v); if (t !== v){ n.__zh = v; n.nodeValue = t; } done.set(n, n.nodeValue);   // __zh：记住中文原文，界面逻辑判断状态时用
      return;
    }
    if (n.nodeType !== 1 || (n.dataset && n.dataset.noi18n)) return;
    for (const a of ATTRS){ const v = n.getAttribute && n.getAttribute(a); if (v && CJK.test(v)){ const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
    for (let c = n.firstChild; c; c = c.nextSibling) node(c);
  }
  function blocks(){
    for (const [sel, html] of Object.entries(HTML)){ document.querySelectorAll(sel).forEach(el => { if (el.dataset.i18n !== 'en'){ el.innerHTML = html; el.dataset.i18n = 'en'; } }); }
  }
  function run(){
    blocks(); node(document.body);
    document.title = 'AirSquishy';
    new MutationObserver(ms => {
      for (const m of ms){
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') node(m.target);
        else m.addedNodes.forEach(node);
      }
    }).observe(document.body, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:ATTRS });
  }
  if (document.body) run(); else document.addEventListener('DOMContentLoaded', run);
})();
