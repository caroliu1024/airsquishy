import json, re
import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=ROOT+'/src/engine/engine.html'; out=ROOT+'/site/index.html'
s=open(src).read()
U=ROOT+'/src/ui/'
css=open(U+'style.css').read(); body=open(U+'body.html').read(); pre=open(U+'pre.js').read()
import json as _j
_d=_j.load(open(ROOT+'/src/i18n/i18n_data.json'))
pre=pre+'\n'+open(U+'i18n.js').read().replace('/*DICT*/{}', _j.dumps(_d['dict'], ensure_ascii=False)).replace('/*PATTERNS*/[]', _j.dumps(_d['pats'], ensure_ascii=False)).replace('/*HTML*/{}', _j.dumps(_d['html'], ensure_ascii=False)); ui=open(U+'ui.js').read()
thumbs=json.load(open(U+'thumbs.json')); homefont=open(U+'home_font.json').read()
a=s.index('<style>'); b=s.index('</style>')+len('</style>')
c=s.index('<script>\n// 加载失败')
head=s[:a].replace('<title>空气捏捏</title>','<title>AirSquishy 空气捏捏</title>').replace('family=ZCOOL+KuaiLe&','family=Syne:wght@600;700;800&family=Space+Mono&family=Noto+Sans+SC:wght@300;400;700&family=Fredoka:wght@500;600;700&family=ZCOOL+KuaiLe&')
assets='<script>window.__THUMBS='+json.dumps(thumbs)+';window.__HOME_FONT='+homefont+';\n'+pre+'</script>\n'
s=head+'<style>\n'+css+'</style>\n\n'+body+'\n'+assets+s[c:]
# layout(): 按页面上实际面板位置留出空白（新增分支；没有界面信息时走原来的算法）
old_l = s[s.index("  const panel = $('panel').getBoundingClientRect();"):s.index("  camera.setViewOffset(W, H, offX, sheet/2, W, H);")+len("  camera.setViewOffset(W, H, offX, sheet/2, W, H);")]
assert old_l.count('availW')==2
new_l = '''  const ob = window.__nnObstacles ? window.__nnObstacles(W, H) : null;
  let offX, offY, availW, availH;
  if (ob){
    document.documentElement.style.setProperty('--sheet-h', ob.B + 'px');
    offX = -(ob.L - ob.R)/2; offY = (ob.B - ob.T)/2;
    availW = Math.max(200, W - ob.L - ob.R - (ob.L || ob.R ? 16 : 0)); availH = Math.max(200, H - ob.T - ob.B);
  } else {
    const panel = $('panel').getBoundingClientRect();
    const mobile = W <= 720;
    const sheet = mobile ? panel.height : 0;
    document.documentElement.style.setProperty('--sheet-h', sheet + 'px');
    offX = mobile ? 0 : -(panel.right)/2; offY = sheet/2;
    availW = mobile ? W : W - panel.right - 16; availH = H - sheet;
  }
  // 摄像头背景和手势坐标跟着捏捏一起平移：捏捏正好在摄像头画面中间，两只手离画面边缘一样远
  camShiftX = -offX;
  { const v = document.getElementById('video'); if (v) v.style.transform = `translateX(${camShiftX}px) scaleX(-1)`; }
  const aspect = W/H, k = 2*Math.tan(THREE.MathUtils.degToRad(17.5));
  view.dist = Math.max(4.6, 2.9*H/(k*availH*.62), 3.4*W/(availW*.78)/(k*aspect));
  camera.aspect = aspect;
  camera.setViewOffset(W, H, offX, offY, W, H);'''
s=s.replace(old_l,new_l)
assert s.count("window.__nn = { ")==1
s=s.replace("window.__nn = { ","window.__nn = { get SHAPES(){ return SHAPES; }, get camOn(){ return camOn; }, get MATS(){ return MATS; }, get TUTN(){ return TUT.length; }, get nBeads(){ return nBeads; }, center2d(){ let sx = 0, sy = 0, sz = 0; for (let i = 0; i < NV; i++){ sx += X[i*3]; sy += X[i*3+1]; sz += X[i*3+2]; } const v = new THREE.Vector3(sx/NV, sy/NV, sz/NV).project(camera), r = renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1)/2*r.width, r.top + (1 - v.y)/2*r.height]; }, bounds(){ let a = 9, b = -9, c = 9, d = -9, m = 0; for (let i = 0; i < NV; i++){ const i3 = i*3, h = X[i3]*viewRight.x + X[i3+2]*viewRight.z; if (h < a) a = h; if (h > b) b = h; if (X[i3+1] < c) c = X[i3+1]; if (X[i3+1] > d) d = X[i3+1]; const e = Math.hypot(X[i3] - RORIG[i3], X[i3+1] - RORIG[i3+1], X[i3+2] - RORIG[i3+2]); if (e > m) m = e; } let sx = 0, sy = 0, sz = 0; for (let i = 0; i < NV; i++){ sx += X[i*3]; sy += X[i*3+1]; sz += X[i*3+2]; } return { minX:a, maxX:b, minY:c, maxY:d, dmax:m, mean:[sx/NV, sy/NV, sz/NV] }; }, ")
# 史莱姆拉丝：鼠标/手捏住拉时，黏液桥能拉得更长再断（原来 1.25–1.85，拉一个多身位就断）
old_ls = "Lmax:(1.25 + Math.random()*.6)*state.sens"
assert s.count(old_ls)==1
s=s.replace(old_ls, "Lmax:(owner === 'grab' ? 3 + Math.random()*.7 : 1.25 + Math.random()*.6)*state.sens")
s=s.rstrip()+'\n<script type="module">\n'+ui+'</script>\n'
# 竖着拿的平板也用手机布局：改写样式表里的媒体查询（max-width:720px = 手机；min-width:721px = 电脑）
def _mq(prelude):
    MOB=[['(max-width:720px)','(orientation:portrait)'],['(max-width:720px)','(min-height:501px)'],['(max-width:720px)','(pointer:fine)'],['(max-width:1100px)','(orientation:portrait)','(pointer:coarse)']]
    DESK=[['(min-width:721px)','(orientation:landscape)'],['(min-width:721px)','(pointer:fine)'],['(min-width:1101px)'],['(orientation:landscape)','(max-height:500px)','(pointer:coarse)']]
    out=[]
    for q in [x.strip() for x in prelude.split(',')]:
        terms=[t.strip() for t in re.split(r'\s+and\s+', q)]
        alts=[[]]
        for t in terms:
            tt=t.replace(' ','')
            opts=MOB if tt=='(max-width:720px)' else DESK if tt=='(min-width:721px)' else [[t]]
            alts=[a+o for a in alts for o in opts]
        out+= [' and '.join(a) for a in alts]
    return ', '.join(out)
import re
s=re.sub(r'@media\s*([^{]*?(?:max-width:\s*720px|min-width:\s*721px)[^{]*)\{', lambda m:'@media '+_mq(m.group(1))+'{', s)
# 谷歌字体改成不阻塞：在打不开谷歌的网络里（例如中国大陆），原来的写法会让整页白屏等很久
import re as _re
s=_re.sub(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', lambda m: '<script>addEventListener("load",function(){var l=document.createElement("link");l.rel="stylesheet";l.href="'+m.group(1)+'";document.head.appendChild(l)})</script>', s, count=1)
# 手机适配：加上 viewport（否则手机浏览器按 980 像素宽的电脑页面缩小显示）和标准模式声明
if '<!doctype' not in s[:50].lower():
    s='<!doctype html>\n'+s.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',1)
# ---- 部署版：字体用网站自带的（不连谷歌）、分享卡片、图标 ----
g = re.search(r'<script>addEventListener\("load",function\(\)\{var l=document.createElement\("link"\);l\.rel="stylesheet";l\.href="https://fonts\.googleapis\.com/[^"]+";document\.head\.appendChild\(l\)\}\)</script>', s)
assert g, 'google font loader not found'
s = s[:g.start()] + '<link rel="stylesheet" href="./fonts/fonts.css">' + s[g.end():]
s = re.sub(r'<link rel="preconnect" href="https://fonts\.(googleapis|gstatic)\.com"[^>]*>\n?', '', s)
assert 'fonts.googleapis' not in s and 'fonts.gstatic' not in s
meta = open(ROOT + '/src/ui/meta.html').read()
s = s.replace('<meta name="viewport"', meta + '<meta name="viewport"', 1)
m = re.search(r'<button class="logo"[^>]*>\s*(<svg.*?</svg>)', body, re.S)
open(ROOT + '/site/icon.svg', 'w').write(m.group(1).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1).replace(' aria-hidden="true"', ''))
open(out, 'w').write(s)
print('site/index.html', round(len(s)/1e6, 2), 'MB')
