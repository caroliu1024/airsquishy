# 生成 README 用的图（中英文各一套）：横幅、功能一览、双手手势图解、技术结构图、手机截图
# 截图来源：tools 外部用浏览器拍好的 *_home.jpg 等（见 docs/README 说明）
import sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SHOTS = sys.argv[1]; GEST = sys.argv[2]; OUT = sys.argv[3]
os.makedirs(OUT, exist_ok=True)
CJK = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'; CJKB = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'; CJKR = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
FRED = '/tmp/claude-0/promo/fredoka700.ttf'
INK = (58, 42, 51); MUTED = (140, 118, 128); PINK = (255, 126, 179); PURP = (183, 156, 255); MINT = (127, 216, 200); CREAM = (252, 245, 241)
F = lambda p, s: ImageFont.truetype(p, s, index=2) if p.endswith('.ttc') else ImageFont.truetype(p, s)
def bg(w, h):
    x = np.linspace(0, 1, w)[None, :, None]; y = np.linspace(0, 1, h)[:, None, None]
    a = np.array([255, 246, 238], float); b = np.array([251, 239, 242], float); c = np.array([239, 241, 255], float)
    t = (x*.7 + y*.3); g = np.where(t < .55, a + (b - a)*(t/.55), b + (c - b)*((t - .55)/.45))
    return Image.fromarray(np.clip(g, 0, 255).astype(np.uint8))
def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], r, fill=255)
    o = im.convert('RGBA'); o.putalpha(m); return o
def card(canvas, im, xy, r=26, shadow=True):
    im = rounded(im, r)
    if shadow:
        sh = Image.new('RGBA', (im.width + 80, im.height + 80), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([40, 48, 40 + im.width, 48 + im.height], r, fill=(180, 120, 150, 70))
        sh = sh.filter(ImageFilter.GaussianBlur(18)); canvas.alpha_composite(sh, (xy[0] - 40, xy[1] - 40))
    canvas.alpha_composite(im, xy)
def grad_text(canvas, xy, txt, font, cols=(PINK, PURP)):
    w, h = font.getbbox(txt)[2] + 4, font.getbbox(txt)[3] + 8
    m = Image.new('L', (w, h)); ImageDraw.Draw(m).text((0, 0), txt, font=font, fill=255)
    g = np.zeros((h, w, 3)); xs = np.linspace(0, 1, w)[None, :, None]; g[:] = np.array(cols[0])*(1 - xs) + np.array(cols[1])*xs
    canvas.paste(Image.fromarray(g.astype(np.uint8)), xy, m)
def tw(font, s): b = font.getbbox(s); return b[2] - b[0]

T = {
 'zh': dict(slogan='伸手，捏一捏空气', sub='打开网页就能玩的 3D 解压捏捏 · 免费 · 不用注册 · 中英双语',
            feats=[('✋ 伸手隔空捏', '打开摄像头，弯手指是按，捏合是捏起，两只手能挤、压、拉'),
                   ('🎨 5 种手感 + 蜡壳', '柔软黏土、PU 慢回弹、史莱姆、超软硅胶、凝胶珠填充，还能套一层会碎的蜡壳'),
                   ('🧸 38 件捏捏', '10 件原创造型 + 28 件真实 3D 模型，每一件都是会形变的软体'),
                   ('📱 电脑、手机、平板都能玩', '鼠标、触屏都行；手机竖屏、横屏各有专门的布局')],
            gest_title='手势图解', gest=[('① 上方并排 → 握拳', '指尖处按出指印'), ('② 上方并排 → 往下按', '底部不动，顶部压扁'), ('③ 一上一下 → 合拢', '上下一起往中间挤'), ('④ 左右分开 → 合拢', '两边往中间挤'),
                   ('⑤ 中间靠近 → 抓', '各自按出指印'), ('单手 · 弯手指', '按下去'), ('单手 · 捏住往外拉', '拉长'), ('双手 · 捏住两边往外拉', '整个拉长')],
            arch_title='它是怎么工作的', arch=[('📷 摄像头', '画面只在浏览器里\n不上传、不保存'), ('MediaPipe\n手部识别', '每只手 21 个关键点\n本地运行（WebAssembly）'), ('手势判断', '按 / 捏 / 拉\n5 种双手手势\n按手的大小自适应'),
                   ('软体物理', '180 次/秒的弹簧网格\n体积守恒、塑性、回弹\n蜡壳碎裂、凝胶流动'), ('three.js 渲染\n+ 实时音效', 'WebGL 画面\nWebAudio 按力度合成声音')],
            alt='🖱 鼠标 / 触屏 也走同一套', mobile_title='手机竖屏 · 横屏', phone='竖屏', land='横屏'),
 'en': dict(slogan='Reach out, squish the air', sub='A 3D stress-relief squishy in your browser · Free · No sign-up · English & 中文',
            feats=[('✋ Squish with bare hands', 'Turn on the webcam: bend a finger to press, pinch to lift, use both hands to squeeze and stretch'),
                   ('🎨 5 textures + wax shell', 'Soft clay, slow-rise foam, slime, super-soft silicone, gel & beads — plus a crackable wax shell'),
                   ('🧸 38 squishies', '10 original designs + 28 real 3D models, every one a deformable soft body'),
                   ('📱 Desktop, phone & tablet', 'Mouse or touch; dedicated layouts for phones in portrait and landscape')],
            gest_title='Gesture guide', gest=[('① Side by side on top → fist', 'Fingertip dents'), ('② Side by side on top → push down', 'Bottom stays, top flattens'), ('③ One above, one below → close', 'Squeezed from top & bottom'), ('④ Far apart left & right → close', 'Squeezed from both sides'),
                   ('⑤ Close together → grab', 'Dents where each hand grips'), ('One hand · bend a finger', 'Press in'), ('One hand · pinch & pull', 'Stretch it out'), ('Two hands · pinch both sides & pull', 'Stretch the whole thing')],
            arch_title='How it works', arch=[('📷 Webcam', 'Frames stay in your\nbrowser, never uploaded'), ('MediaPipe\nhand tracking', '21 landmarks per hand\nruns locally (WebAssembly)'), ('Gesture logic', 'press / pinch / pull\n5 two-hand gestures\nscales with hand size'),
                   ('Soft-body physics', '180 Hz spring mesh\nvolume, plasticity, rebound\nwax cracks, gel flow'), ('three.js render\n+ live sound', 'WebGL graphics\nWebAudio synthesizes sound\nfrom how hard you squeeze')],
            alt='🖱 Mouse / touch uses the same pipeline', mobile_title='Phone · portrait & landscape', phone='Portrait', land='Landscape'),
}
EMOJI_FREE = lambda s: ''.join(ch for ch in s if ord(ch) < 0x2190 or 0x3000 <= ord(ch) <= 0x9FFF or 0xFF00 <= ord(ch) <= 0xFFEF or ch in '①②③④⑤·—→')

def logo(canvas, x, y, size):
    f = F(FRED, size); grad_text(canvas, (x, y), 'Air', f); ImageDraw.Draw(canvas).text((x + tw(f, 'Air') + 4, y), 'Squishy', font=f, fill=INK)

for L, t in T.items():
    big = F(CJK, 46) if L == 'zh' else F(FRED, 48); mid = F(CJKB, 26); small = F(CJKR, 22); tiny = F(CJKR, 19)
    # ---------- 横幅 ----------
    W, H = 2000, 860; c = bg(W, H).convert('RGBA'); d = ImageDraw.Draw(c)
    logo(c, 100, 230, 118)
    d.text((106, 400), t['slogan'], font=F(CJK, 56) if L == 'zh' else F(FRED, 54), fill=INK)
    subs = t['sub'].split(' · '); d.text((108, 500), subs[0], font=F(CJKR, 26), fill=MUTED); d.text((108, 546), ' · '.join(subs[1:]), font=F(CJKR, 26), fill=MUTED)
    shot = Image.open(f'{SHOTS}/{L}_imm.jpg').convert('RGB'); shot = shot.resize((1040, 650), Image.LANCZOS)
    card(c, shot, (900, 110), 30)
    ph = Image.open(f'{SHOTS}/{L}_phone.jpg').convert('RGB'); ph = ph.resize((int(ph.width*560/ph.height), 560), Image.LANCZOS)
    card(c, ph, (820, 260), 34)
    c.convert('RGB').save(f'{OUT}/banner_{L}.png', optimize=True)
    # ---------- 功能一览：2×2 ----------
    W, H = 2000, 1500; c = bg(W, H).convert('RGBA'); d = ImageDraw.Draw(c)
    src = [f'{L}_camprompt', f'{L}_imm', f'{L}_lib', f'{L}_land']
    for k, ((tt, dd), s) in enumerate(zip(t['feats'], src)):
        x = 80 + (k % 2)*940; y = 70 + (k//2)*720
        im = Image.open(f'{SHOTS}/{s}.jpg').convert('RGB')
        im = im.resize((860, int(860*im.height/im.width)), Image.LANCZOS) if im.width/im.height > 860/500 else im.resize((int(500*im.width/im.height), 500), Image.LANCZOS)
        box = Image.new('RGB', (860, 500), CREAM); box.paste(im, ((860 - im.width)//2, (500 - im.height)//2)); card(c, box, (x, y), 24)
        d.text((x + 4, y + 525), EMOJI_FREE(tt).strip(), font=F(CJK, 36), fill=INK)
        # 说明换行
        words = dd if L == 'zh' else dd.split(' '); line = ''; yy = y + 580; fnt = F(CJKR, 24)
        for w_ in words:
            test = line + w_ if L == 'zh' else (line + ' ' + w_).strip()
            if tw(fnt, test) > 840: d.text((x + 4, yy), line, font=fnt, fill=MUTED); yy += 36; line = w_
            else: line = test
        d.text((x + 4, yy), line, font=fnt, fill=MUTED)
    c.convert('RGB').save(f'{OUT}/features_{L}.png', optimize=True)
    # ---------- 手势图解：4×2 真实画面 ----------
    W, H = 2000, 1180; c = bg(W, H).convert('RGBA'); d = ImageDraw.Draw(c)
    d.text((80, 50), t['gest_title'], font=F(CJK, 54) if L == 'zh' else F(FRED, 56), fill=INK)
    for k, (tt, dd) in enumerate(t['gest']):
        x = 80 + (k % 4)*470; y = 160 + (k//4)*500
        g = Image.open(f'{GEST}/mochi_g{[1,2,3,4,5,6,7,8][k]}.png').convert('RGB').crop((360, 170, 920, 650)).resize((430, 369), Image.LANCZOS)
        card(c, g, (x, y), 22)
        d.text((x + 4, y + 385), tt, font=F(CJKB, 25), fill=INK); d.text((x + 4, y + 425), dd, font=F(CJKR, 22), fill=MUTED)
    c.convert('RGB').save(f'{OUT}/gestures_{L}.png', optimize=True)
    # ---------- 技术结构图 ----------
    W, H = 2000, 620; c = bg(W, H).convert('RGBA'); d = ImageDraw.Draw(c)
    d.text((80, 50), t['arch_title'], font=F(CJK, 54) if L == 'zh' else F(FRED, 56), fill=INK)
    bw, bh, gap, y0 = 320, 310, 50, 170; cols = [PINK, (230, 150, 220), PURP, (150, 180, 250), MINT]
    for k, ((tt, dd), col) in enumerate(zip(t['arch'], cols)):
        x = 80 + k*(bw + gap)
        sh = Image.new('RGBA', (bw + 60, bh + 60), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([30, 38, 30 + bw, 30 + bh], 28, fill=(180, 120, 150, 60)); c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)), (x - 30, y0 - 30))
        d.rounded_rectangle([x, y0, x + bw, y0 + bh], 28, fill=(255, 253, 251)); d.rounded_rectangle([x, y0, x + bw, y0 + 14], 7, fill=col)
        yy = y0 + 46
        for ln in EMOJI_FREE(tt).strip().split('\n'): d.text((x + 28, yy), ln, font=F(CJK, 32), fill=INK); yy += 44
        yy += 14
        for ln in dd.split('\n'): d.text((x + 28, yy), ln, font=F(CJKR, 22), fill=MUTED); yy += 34
        if k < 4:
            ax = x + bw + 8; ay = y0 + bh//2; d.polygon([(ax, ay - 14), (ax + 32, ay), (ax, ay + 14)], fill=(200, 170, 190))
    d.text((80 + bw + gap, y0 + bh + 30), '↑  ' + EMOJI_FREE(t['alt']).strip(), font=F(CJKB, 26), fill=MUTED)
    c.convert('RGB').save(f'{OUT}/architecture_{L}.png', optimize=True)
    # ---------- 手机 ----------
    W, H = 2000, 960; c = bg(W, H).convert('RGBA'); d = ImageDraw.Draw(c)
    d.text((80, 50), t['mobile_title'], font=F(CJK, 54) if L == 'zh' else F(FRED, 56), fill=INK)
    p = Image.open(f'{SHOTS}/{L}_phone.jpg').convert('RGB'); p = p.resize((int(p.width*720/p.height), 720), Image.LANCZOS); card(c, p, (90, 170), 40)
    q = Image.open(f'{SHOTS}/{L}_land.jpg').convert('RGB'); q = q.resize((1440, int(q.height*1440/q.width)), Image.LANCZOS); card(c, q, (90 + p.width + 70, 170 + (720 - q.height)//2), 34)
    c.convert('RGB').save(f'{OUT}/mobile_{L}.png', optimize=True)
c = bg(1200, 630).convert('RGBA'); d = ImageDraw.Draw(c)
logo(c, 70, 170, 92); d.text((76, 310), '伸手，捏一捏空气', font=F(CJK, 46), fill=INK); d.text((78, 384), 'Reach out, squish the air', font=F(FRED, 36), fill=MUTED)
im = Image.open(f'{SHOTS}/zh_imm.jpg').convert('RGB').crop((400, 230, 1040, 770)).resize((470, 397), Image.LANCZOS); card(c, im, (680, 100), 30)
c.convert('RGB').save(sys.argv[4] if len(sys.argv) > 4 else OUT + '/og.png', optimize=True)
print('ok')
