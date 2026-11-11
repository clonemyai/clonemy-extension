#!/usr/bin/env python3
"""Build the clonemy.ai extension store dress-up assets (listing-v3).

Tiles and screenshot composites are program-drawn with PIL. The extension
bar is drawn from the current shipped styles in ../content.js (v0.5.5):
  bar: background #10101c, text #eaf2ff, border rgba(140,150,255,.45),
       radius 12px, padding 10px 12px, max-width 300px,
       shadow 0 8px 30px rgba(0,0,0,.45), font 13px/1.45,
       fixed at the TOP RIGHT of the tab (top 14px, right 14px)
  header: "clonemy.ai" at weight 800, then " on <Platform>" at weight 600
       and opacity .65; at the right, two 22px chip buttons side by side:
       minimize (a horizontal line), then close (an X) 5px to its right
  button 1: border rgba(55,200,232,.55), background rgba(123,108,255,.16),
       label "Step 1. Put the request in the chat"
  button 2 idle: border rgba(140,150,255,.3), background rgba(255,255,255,.05),
       whole button at opacity .45, label "Step 2. Compile my capsule"
  button 2 ready: linear-gradient(90deg,#7b6cff,#37c8e8 55%,#ff5da2),
       ink #0b0b14, 1px white border, glow shadow, label gains a down arrow
  deliver section (after a compile, "source" mode in renderDeliver):
       a 1px divider in the theme line color, the line "Capsule ready to
       deliver. Take it to:", one bordered chip row per destination (20px
       glyph plus the platform name), then a "Discard the pending capsule"
       chip button
Status strings are the exact strings content.js sets. Note the done
status is the long composite string the compile handler builds; it is
drawn in full (see done_status()).
No em dash character appears in any copy in this file.
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
FONTS = "/usr/share/fonts/truetype/noto/"
F_REG = FONTS + "NotoSans-Regular.ttf"
F_BOLD = FONTS + "NotoSans-Bold.ttf"
F_SEMI = FONTS + "NotoSans-SemiBold.ttf"


def font(size, kind="reg"):
    path = {"reg": F_REG, "bold": F_BOLD, "semi": F_SEMI}[kind]
    return ImageFont.truetype(path, int(round(size)))


# ---------------------------------------------------------------- colors
def blend(fg, bg, a):
    return tuple(int(round(fg[i] * a + bg[i] * (1 - a))) for i in range(3))


BAR_BG = (16, 16, 28)          # #10101c
BAR_TEXT = (234, 242, 255)     # #eaf2ff
READY_INK = (11, 11, 20)       # #0b0b14
BRAND_STOPS = [(0.0, (123, 108, 255)), (0.5, (55, 200, 232)), (1.0, (255, 94, 168))]
READY_STOPS = [(0.0, (123, 108, 255)), (0.55, (55, 200, 232)), (1.0, (255, 93, 162))]
WHITE = (255, 255, 255)


def grad_color(stops, t):
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        if p0 <= t <= p1:
            f = 0 if p1 == p0 else (t - p0) / (p1 - p0)
            return tuple(int(round(c0[j] + (c1[j] - c0[j]) * f)) for j in range(3))
    return stops[-1][1]


def h_gradient(w, h, stops):
    strip = Image.new("RGB", (max(2, w), 1))
    px = strip.load()
    for x in range(max(2, w)):
        px[x, 0] = grad_color(stops, x / max(1, w - 1))
    return strip.resize((w, h))


def v_gradient(w, h, c_top, c_bot):
    strip = Image.new("RGB", (1, max(2, h)))
    px = strip.load()
    for y in range(max(2, h)):
        px[0, y] = blend(c_bot, c_top, y / max(1, h - 1))
    return strip.resize((w, h))


def diag_gradient(size, stops):
    """Square diagonal gradient (top-left to bottom-right), RGB."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    denom = max(1, 2 * (size - 1))
    for y in range(size):
        for x in range(size):
            px[x, y] = grad_color(stops, (x + y) / denom)
    return img


def glow(size, color, peak_alpha):
    """Soft radial glow blob (RGBA), alpha peaking at center."""
    s = 128
    img = Image.new("L", (s, s), 0)
    px = img.load()
    for y in range(s):
        for x in range(s):
            d = math.hypot(x - s / 2, y - s / 2) / (s / 2)
            px[x, y] = int(max(0.0, 1 - d) ** 2 * peak_alpha)
    img = img.resize((size, size))
    out = Image.new("RGBA", (size, size), color + (0,))
    out.putalpha(img)
    return out


def gradient_text(base, xy, text, fnt, stops, anchor="la"):
    d = ImageDraw.Draw(base)
    bbox = d.textbbox(xy, text, font=fnt, anchor=anchor)
    w = max(2, bbox[2] - bbox[0])
    h = max(2, bbox[3] - bbox[1])
    grad = h_gradient(w, h, stops)
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.text((xy[0] - bbox[0], xy[1] - bbox[1]), text, font=fnt, fill=255, anchor=anchor)
    base.paste(grad, (bbox[0], bbox[1]), mask)


def wrap(draw, text, fnt, max_w):
    words = text.split()
    lines, cur = [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if draw.textlength(trial, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


# ---------------------------------------------------------------- the bar
STATUS_IDLE = "The request goes in the box. You press send, always."
STATUS_SCAN8 = "Analyzing the answer as it arrives: 8 of 12 section headings spotted so far."
STATUS_FOUND = "Self-report found, 12 of 12 sections. Press Compile."


def done_status(platform):
    """The exact status the compile handler sets (content.js, v0.5.5),
    instantiated for a first compile of a 12 of 12 report. The flavor
    word is the one the founder's real capsule compiled with."""
    return ("Done. capsule.md downloaded: 12 of 12 sections, flavor Gentle. "
            "Saved as your " + platform + " capsule, version 1. "
            "It is also ready to deliver: open your other AI and its bar "
            "will offer it. Compile stays live: click again for a fresh "
            "copy, or if the answer grows.")


# Destination glyph colors for the deliver rows: small gradient rounded
# squares in each platform's brand hues (the shipped bar uses the
# platforms' own SVG marks; the squares keep the same hues at a glance).
GLYPH_STOPS = {
    "ChatGPT": [(0.0, (16, 163, 127)), (1.0, (46, 196, 166))],
    "Claude": [(0.0, (217, 119, 87)), (1.0, (236, 158, 117))],
    "Gemini": [(0.0, (71, 150, 227)), (0.55, (145, 119, 199)), (1.0, (217, 101, 112))],
    "Grok": [(0.0, (234, 242, 255)), (1.0, (150, 158, 180))],
    "Perplexity": [(0.0, (32, 128, 141)), (1.0, (64, 178, 190))],
    "Muse": [(0.0, (0, 130, 251)), (0.55, (160, 51, 255)), (1.0, (255, 82, 128))],
    "Meta AI": [(0.0, (0, 130, 251)), (0.55, (160, 51, 255)), (1.0, (255, 82, 128))],
}


def render_bar(state="idle", status=STATUS_IDLE, platform="ChatGPT",
               width=300, destinations=None):
    """Draw the shipped bar (v0.5.5). state: idle (compile greyed), ready
    (compile gradient, arrow in the label), or deliver (ready, plus the
    deliver section from renderDeliver's source mode).
    Geometry follows content.js at 1 image px per CSS px for width 300,
    scaled proportionally for other widths. Returns an RGBA image."""
    s = width / 300.0
    SS = 3  # supersample for crisp edges

    def u(v):
        return v * s * SS

    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    f_status = font(13 * s * SS, "reg")
    inner_w = u(276)
    status_lines = wrap(probe, status, f_status, inner_w)
    line_h = 13 * 1.45
    # content.js layout: pad 10, header 22 + its 6 margin, buttons 33
    # (7px padding top and bottom around a 19px line) with a 4 gap,
    # status margin-top 5, pad 10
    logical_h = 10 + 22 + 6 + 33 + 4 + 33 + 5 + len(status_lines) * line_h + 10
    if state == "deliver":
        # divider block: margin-top 7, 1px border, padding-top 7, one
        # label line, a 4 gap, destination rows of 32 with 4 gaps, a 4
        # gap, then the 31px discard chip button
        n_rows = len(destinations or [])
        logical_h += (7 + 1 + 7 + line_h + 4 + n_rows * 32
                      + max(0, n_rows - 1) * 4 + 4 + 31)
    W = int(u(300))
    H = int(logical_h * s * SS)

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # shadow: 0 8px 30px rgba(0,0,0,.45)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([u(1), u(8), W - u(1), H - u(2)], radius=u(12), fill=(0, 0, 0, 115))
    sh = sh.filter(ImageFilter.GaussianBlur(u(10)))
    img.alpha_composite(sh)

    d = ImageDraw.Draw(img)
    # body
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=u(12), fill=BAR_BG + (255,),
                        outline=blend((140, 150, 255), BAR_BG, 0.45) + (255,), width=max(1, int(u(1))))
    pad_x = u(12)
    y = u(10)

    # header: "clonemy.ai" bold, " on <Platform>" dimmer beside it, then
    # the minimize chip and, 5px to its right, the close chip
    f_head = font(13 * s * SS, "bold")
    f_head_dim = font(13 * s * SS, "semi")
    d.text((pad_x, y + u(2)), "clonemy.ai", font=f_head, fill=BAR_TEXT + (255,))
    dim_x = pad_x + d.textlength("clonemy.ai ", font=f_head)
    d.text((dim_x, y + u(2)), "on " + platform, font=f_head_dim,
           fill=blend(BAR_TEXT, BAR_BG, 0.65) + (255,))
    chip_fill = blend(WHITE, BAR_BG, 0.05) + (255,)
    chip_out = blend((140, 150, 255), BAR_BG, 0.30) + (255,)
    xb = [W - pad_x - u(22), y, W - pad_x, y + u(22)]
    d.rounded_rectangle(xb, radius=u(6), fill=chip_fill, outline=chip_out,
                        width=max(1, int(u(1))))
    xcx, xcy = (xb[0] + xb[2]) / 2, (xb[1] + xb[3]) / 2
    xw = max(1, int(u(1.8)))
    d.line([xcx - u(3.5), xcy - u(3.5), xcx + u(3.5), xcy + u(3.5)],
           fill=BAR_TEXT + (255,), width=xw)
    d.line([xcx - u(3.5), xcy + u(3.5), xcx + u(3.5), xcy - u(3.5)],
           fill=BAR_TEXT + (255,), width=xw)
    cb = [W - pad_x - u(49), y, W - pad_x - u(27), y + u(22)]
    d.rounded_rectangle(cb, radius=u(6), fill=chip_fill, outline=chip_out,
                        width=max(1, int(u(1))))
    cx = (cb[0] + cb[2]) / 2
    cy = (cb[1] + cb[3]) / 2
    d.line([cx - u(4), cy, cx + u(4), cy], fill=BAR_TEXT + (255,), width=max(1, int(u(2))))
    y += u(22) + u(6)

    def button(top, label, kind):
        x0, x1 = pad_x, W - pad_x
        h = u(33)
        if kind == "fill":
            d.rounded_rectangle([x0, top, x1, top + h], radius=u(8),
                                fill=blend((123, 108, 255), BAR_BG, 0.16) + (255,),
                                outline=blend((55, 200, 232), BAR_BG, 0.55) + (255,),
                                width=max(1, int(u(1))))
            f = font(13 * s * SS, "bold")
            d.text(((x0 + x1) / 2, top + h / 2), label, font=f,
                   fill=BAR_TEXT + (255,), anchor="mm")
        elif kind == "idle":
            a = 0.45  # whole-button opacity over the bar background
            fill_c = blend(blend(WHITE, BAR_BG, 0.05), BAR_BG, a)
            out_c = blend(blend((140, 150, 255), BAR_BG, 0.30), BAR_BG, a)
            txt_c = blend(BAR_TEXT, BAR_BG, a)
            d.rounded_rectangle([x0, top, x1, top + h], radius=u(8),
                                fill=fill_c + (255,), outline=out_c + (255,),
                                width=max(1, int(u(1))))
            f = font(13 * s * SS, "bold")
            d.text(((x0 + x1) / 2, top + h / 2), label, font=f,
                   fill=txt_c + (255,), anchor="mm")
        elif kind == "ready":
            # glow shadow
            gl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            gd = ImageDraw.Draw(gl)
            gd.rounded_rectangle([x0, top, x1, top + h], radius=u(8), fill=(123, 108, 255, 150))
            gl = gl.filter(ImageFilter.GaussianBlur(u(6)))
            img.alpha_composite(gl)
            grad = h_gradient(int(x1 - x0), int(h), READY_STOPS).convert("RGBA")
            mask = Image.new("L", grad.size, 0)
            md = ImageDraw.Draw(mask)
            md.rounded_rectangle([0, 0, grad.size[0] - 1, grad.size[1] - 1], radius=u(8), fill=255)
            img.paste(grad, (int(x0), int(top)), mask)
            d.rounded_rectangle([x0, top, x1, top + h], radius=u(8),
                                outline=WHITE + (255,), width=max(1, int(u(1))))
            f = font(13 * s * SS, "bold")
            tw = d.textlength(label, font=f)
            tx = (x0 + x1) / 2 - tw / 2
            d.text((tx, top + h / 2), label, font=f, fill=READY_INK + (255,), anchor="lm")
            # download arrow, drawn as the shipped label's arrow glyph
            ax = tx + tw + u(7)
            ay = top + h / 2
            aw = max(1, int(u(1.8)))
            d.line([ax, ay - u(4), ax, ay + u(3)], fill=READY_INK + (255,), width=aw)
            d.line([ax - u(3), ay, ax, ay + u(3.5)], fill=READY_INK + (255,), width=aw)
            d.line([ax + u(3), ay, ax, ay + u(3.5)], fill=READY_INK + (255,), width=aw)
        return top + h

    y = button(y, "Step 1. Put the request in the chat", "fill")
    y = button(y + u(4), "Step 2. Compile my capsule",
               "ready" if state in ("ready", "deliver") else "idle")

    # status line, opacity .8
    y += u(5)
    st_c = blend(BAR_TEXT, BAR_BG, 0.8)
    for ln in status_lines:
        d.text((pad_x, y), ln, font=f_status, fill=st_c + (255,))
        y += u(line_h)

    if state == "deliver":
        # renderDeliver, source mode: a divider, the take-it-to label,
        # one chip row per destination, then the discard chip button
        y += u(7)
        d.line([pad_x, y, W - pad_x, y],
               fill=blend((140, 150, 255), BAR_BG, 0.18) + (255,),
               width=max(1, int(u(1))))
        y += u(1) + u(7)
        f_lab = font(13 * s * SS, "reg")
        d.text((pad_x, y), "Capsule ready to deliver. Take it to:",
               font=f_lab, fill=BAR_TEXT + (255,))
        y += u(line_h) + u(4)
        f_name = font(13 * s * SS, "bold")
        for name in (destinations or []):
            x0, x1 = pad_x, W - pad_x
            h = u(32)
            d.rounded_rectangle([x0, y, x1, y + h], radius=u(8),
                                fill=blend(WHITE, BAR_BG, 0.05) + (255,),
                                outline=blend((140, 150, 255), BAR_BG, 0.30) + (255,),
                                width=max(1, int(u(1))))
            g = int(u(20))
            glyph = diag_gradient(g, GLYPH_STOPS[name]).convert("RGBA")
            gmask = Image.new("L", (g, g), 0)
            gm = ImageDraw.Draw(gmask)
            gm.rounded_rectangle([0, 0, g - 1, g - 1], radius=u(5), fill=255)
            gx = int(x0 + u(9))
            gy = int(y + (h - u(20)) / 2)
            img.paste(glyph, (gx, gy), gmask)
            d = ImageDraw.Draw(img)
            d.text((gx + u(20) + u(9), y + h / 2), name, font=f_name,
                   fill=BAR_TEXT + (255,), anchor="lm")
            y += h + u(4)
        h = u(31)
        d.rounded_rectangle([pad_x, y, W - pad_x, y + h], radius=u(8),
                            fill=blend(WHITE, BAR_BG, 0.05) + (255,),
                            outline=blend((140, 150, 255), BAR_BG, 0.30) + (255,),
                            width=max(1, int(u(1))))
        d.text((W / 2, y + h / 2), "Discard the pending capsule",
               font=f_name, fill=BAR_TEXT + (255,), anchor="mm")
        y += h

    return img.resize((int(width), int(logical_h * s)), Image.LANCZOS)


# ---------------------------------------------------------------- backdrop
class Theme:
    def __init__(self, bg, sidebar, panel, user, lines, faint, border):
        self.bg, self.sidebar, self.panel = bg, sidebar, panel
        self.user, self.lines, self.faint, self.border = user, lines, faint, border


THEMES = [
    Theme((24, 27, 26), (19, 22, 21), (33, 38, 36), (46, 64, 58), (118, 128, 122), (70, 78, 74), (52, 60, 56)),
    Theme((247, 244, 238), (239, 234, 226), (255, 255, 255), (233, 224, 208), (168, 156, 138), (208, 199, 184), (224, 216, 202)),
    Theme((18, 22, 34), (14, 17, 27), (27, 33, 50), (35, 48, 78), (108, 122, 158), (58, 68, 96), (44, 54, 80)),
    Theme((8, 8, 10), (13, 13, 16), (20, 20, 24), (31, 31, 37), (104, 104, 114), (52, 52, 60), (38, 38, 46)),
    Theme((13, 26, 29), (10, 20, 23), (20, 38, 42), (24, 58, 62), (104, 138, 140), (52, 78, 80), (36, 62, 66)),
]


def line_bars(d, x, y, widths, color, h=9, gap=9, r=4):
    for w_ in widths:
        d.rounded_rectangle([x, y, x + w_, y + h], radius=r, fill=color)
        y += h + gap
    return y


def bubble(d, rng, x, y, w_, n_lines, fill_c, line_c, align="left"):
    widths = []
    for i in range(n_lines):
        frac = rng.uniform(0.55, 0.97) if i < n_lines - 1 else rng.uniform(0.3, 0.6)
        widths.append(int((w_ - 36) * frac))
    h = 20 + n_lines * 18
    d.rounded_rectangle([x, y, x + w_, y + h], radius=16, fill=fill_c)
    line_bars(d, x + 18, y + 13, widths, line_c, h=8, gap=10, r=4)
    return y + h


def backdrop(idx, report_rows=None, composer_lines=0, composer_h=56,
             plain_msgs=True, center_note=False, attach_chip=False, file_card=False):
    th = THEMES[idx]
    rng = random.Random(1000 + idx)
    img = Image.new("RGB", (1280, 800), th.bg)
    d = ImageDraw.Draw(img, "RGBA")

    # sidebar
    d.rectangle([0, 0, 232, 800], fill=th.sidebar)
    d.ellipse([22, 24, 50, 52], fill=th.faint)
    line_bars(d, 62, 30, [90], th.faint, h=9)
    d.rounded_rectangle([18, 76, 214, 108], radius=10, outline=th.border, width=1)
    line_bars(d, 34, 88, [110], th.lines, h=8)
    for i in range(6):
        yy = 140 + i * 44
        d.rounded_rectangle([18, yy, 214, yy + 30], radius=8,
                            fill=th.panel if i == 0 else th.sidebar)
        line_bars(d, 34, yy + 11, [rng.randint(80, 150)], th.faint, h=8)
    for i in range(3):
        yy = 560 + i * 44
        line_bars(d, 34, yy + 8, [rng.randint(70, 130)], th.faint, h=8)

    col_x, col_w = 330, 660
    # top bar
    line_bars(d, col_x, 34, [150], th.faint, h=10)
    line_bars(d, col_x + col_w - 120, 34, [120], th.faint, h=10)

    msg_bottom = 800
    if plain_msgs:
        y = 96
        y = bubble(d, rng, col_x + col_w - 380, y, 380, 2, th.user, th.lines) + 26
        y = bubble(d, rng, col_x, y, 560, 3, th.panel, th.lines) + 26
        if idx in (0, 2):
            y = bubble(d, rng, col_x + col_w - 340, y, 340, 1, th.user, th.lines) + 26
            bubble(d, rng, col_x, y, 520, 2, th.panel, th.lines)

    if report_rows is not None:
        # the self-report as an abstract sectioned document panel
        px, py, pw = col_x, 92, col_w
        rows_full = report_rows
        panel_h = 30 + rows_full * 37 + (26 if rows_full < 12 else 6)
        d.rounded_rectangle([px, py, px + pw, py + panel_h], radius=16,
                            fill=th.panel, outline=th.border, width=1)
        ry = py + 18
        for i in range(rows_full):
            d.rounded_rectangle([px + 22, ry, px + 22 + rng.randint(110, 190), ry + 10],
                                radius=5, fill=th.lines)
            line_bars(d, px + 22, ry + 17, [int((pw - 60) * rng.uniform(0.6, 0.92))],
                      th.faint, h=7, gap=0, r=3)
            ry += 37
        if rows_full < 12:
            d.rounded_rectangle([px + 22, ry, px + 22 + 130, ry + 10], radius=5,
                                fill=blend(th.lines, th.panel, 0.4))
        msg_bottom = py + panel_h

    if file_card:
        # capsule.md, drawn as a document card in the message column
        cx, cy, cw, chh = col_x, 120, 430, 118
        d.rounded_rectangle([cx, cy, cx + cw, cy + chh], radius=14,
                            fill=th.panel, outline=th.border, width=1)
        d.rounded_rectangle([cx + 20, cy + 22, cx + 62, cy + 78], radius=6,
                            outline=th.lines, width=2)
        d.polygon([(cx + 48, cy + 22), (cx + 62, cy + 36), (cx + 48, cy + 36)],
                  fill=th.faint)
        d.text((cx + 38, cy + 56), ".md", font=font(11, "bold"), fill=th.lines, anchor="mm")
        d.text((cx + 82, cy + 26), "capsule.md", font=font(19, "bold"), fill=th.lines)
        line_bars(d, cx + 82, cy + 58, [240, 180], th.faint, h=8, gap=9)
        # a finished second message under it
        bubble(d, rng, col_x, cy + chh + 30, 500, 2, th.panel, th.lines)

    if center_note:
        line_bars(d, 520, 300, [240], th.faint, h=11)
        line_bars(d, 565, 326, [150], th.faint, h=11)

    # composer
    comp_y = 800 - 64 - 26 - composer_h
    if attach_chip:
        chip_w = 168
        chip = [col_x, comp_y - 44, col_x + chip_w, comp_y - 12]
        d.rounded_rectangle(chip, radius=9, fill=th.panel, outline=th.border, width=1)
        d.rounded_rectangle([col_x + 10, comp_y - 38, col_x + 28, comp_y - 18],
                            radius=3, outline=th.lines, width=1)
        d.text((col_x + 40, comp_y - 35), "capsule.md", font=font(13, "semi"), fill=th.lines)
    d.rounded_rectangle([col_x, comp_y, col_x + col_w, comp_y + composer_h],
                        radius=16, fill=th.panel, outline=th.border, width=1)
    if composer_lines:
        lw = []
        for i in range(composer_lines):
            lw.append(int((col_w - 90) * (0.92 if i < composer_lines - 1 else 0.5)))
        line_bars(d, col_x + 20, comp_y + 14, lw, th.faint, h=8, gap=8, r=4)
    else:
        line_bars(d, col_x + 20, comp_y + (composer_h - 9) // 2, [170], th.faint, h=9)
    # send button: filled circle with an up arrow
    scx, scy, sr = col_x + col_w - 30, comp_y + composer_h - 30, 15
    d.ellipse([scx - sr, scy - sr, scx + sr, scy + sr], fill=th.lines)
    arrow_c = th.panel
    d.line([scx, scy + 5, scx, scy - 5], fill=arrow_c, width=2)
    d.line([scx - 4, scy - 1, scx, scy - 5], fill=arrow_c, width=2)
    d.line([scx + 4, scy - 1, scx, scy - 5], fill=arrow_c, width=2)
    return img


CAPTIONS = [
    "Put the request in. The extension never presses send. You do.",
    "Your AI writes its self-report, in 12 sections.",
    "Compile it in the tab. Nothing leaves your browser.",
    "capsule.md is yours to keep.",
    "Take it to any AI. The bar hands it over.",
]


def caption_strip(img, n):
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, 800 - 64, 1280, 800], fill=(9, 9, 16, 242))
    grad = h_gradient(46, 46, BRAND_STOPS)
    mask = Image.new("L", (46, 46), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([0, 0, 45, 45], fill=255)
    img.paste(grad, (24, 800 - 55), mask)
    d = ImageDraw.Draw(img, "RGBA")
    d.text((47, 800 - 32), str(n), font=font(20, "bold"), fill=READY_INK, anchor="mm")
    d.text((88, 800 - 32), CAPTIONS[n - 1], font=font(20, "semi"), fill=(240, 242, 250), anchor="lm")
    d.text((1256, 800 - 32), "%d of 5" % n, font=font(15, "reg"), fill=(150, 152, 168), anchor="rm")
    return img


def paste_bar(img, bar, right=14, top=66):
    """The bar is fixed at the top right of the tab (content.js: top
    14px, right 14px, below the host page's own header strip in these
    composites), so it pastes at the top right, not above the caption."""
    x = img.width - right - bar.width
    img.paste(bar, (x, top), bar)
    return img


# ---------------------------------------------------------------- shots
def build_shots():
    # 1: put the request in (on ChatGPT). Composer carries the placed
    # request (abstract lines); the bar sits idle at the top right with
    # its shipped status line.
    img = backdrop(0, composer_lines=4, composer_h=96, plain_msgs=True)
    paste_bar(img, render_bar("idle", STATUS_IDLE, "ChatGPT"))
    caption_strip(img, 1)
    img.save(os.path.join(OUT, "screenshot-1-put-the-request-in.png"))

    # 2: the self-report arriving (on Claude). Eight of twelve sections
    # on the page; the bar narrates the count and Compile is still greyed.
    img = backdrop(1, report_rows=8, plain_msgs=False)
    paste_bar(img, render_bar("idle", STATUS_SCAN8, "Claude"))
    caption_strip(img, 2)
    img.save(os.path.join(OUT, "screenshot-2-self-report.png"))

    # 3: compile in the tab (on Gemini). Full report on the page, Compile
    # lit with the shipped gradient ready state.
    img = backdrop(2, report_rows=12, plain_msgs=False)
    paste_bar(img, render_bar("ready", STATUS_FOUND, "Gemini"))
    caption_strip(img, 3)
    img.save(os.path.join(OUT, "screenshot-3-compile-in-the-tab.png"))

    # 4: capsule.md downloaded (on ChatGPT). File card in the column; the
    # bar reports Done and Compile stays live in its ready state.
    img = backdrop(3, file_card=True, plain_msgs=False)
    paste_bar(img, render_bar("ready", done_status("ChatGPT"), "ChatGPT"))
    caption_strip(img, 4)
    img.save(os.path.join(OUT, "screenshot-4-capsule-is-yours.png"))

    # 5: take it to any AI (on Perplexity). A fresh, empty room, and the
    # bar is in its deliver state: the pending capsule is offered as
    # destination buttons, no manual attach needed.
    img = backdrop(4, plain_msgs=False, center_note=True, attach_chip=False)
    paste_bar(img, render_bar("deliver", done_status("Perplexity"), "Perplexity",
                              destinations=["ChatGPT", "Claude", "Gemini", "Grok"]))
    caption_strip(img, 5)
    img.save(os.path.join(OUT, "screenshot-5-take-it-anywhere.png"))


# ---------------------------------------------------------------- tiles
def wordmark(d, x, y, size, text_color=WHITE):
    r = size * 0.16
    grad = h_gradient(int(r * 2), int(r * 2), BRAND_STOPS)
    mask = Image.new("L", (int(r * 2), int(r * 2)), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([0, 0, int(r * 2) - 1, int(r * 2) - 1], fill=255)
    return grad, mask, r


def build_small_tile():
    W, H = 440, 280
    img = v_gradient(W, H, (15, 15, 26), (23, 19, 40)).convert("RGBA")
    img.alpha_composite(glow(300, (123, 108, 255), 60), (250, -120))
    img.alpha_composite(glow(240, (255, 94, 168), 40), (300, 130))
    img.alpha_composite(h_gradient(W, 3, BRAND_STOPS).convert("RGBA"), (0, 0))
    d = ImageDraw.Draw(img)
    grad, mask, r = wordmark(d, 26, 24, 30)
    img.paste(grad, (26, 26), mask)
    d = ImageDraw.Draw(img)
    d.text((26 + r * 2 + 10, 24), "clonemy.ai", font=font(30, "bold"), fill=WHITE)
    d.text((26, 66), "Your AI knows you.", font=font(19, "semi"), fill=(238, 240, 250))
    gradient_text(img, (26, 92), "Take that with you.", font(19, "semi"), BRAND_STOPS)
    bar = render_bar("idle", STATUS_IDLE, "ChatGPT", width=252)
    img.paste(bar, (26, H - bar.height - 14), bar)
    # capsule chip to the right of the bar
    d = ImageDraw.Draw(img, "RGBA")
    cx, cy = 296, H - 74
    d.rounded_rectangle([cx, cy, cx + 118, cy + 40], radius=10,
                        fill=(22, 22, 36, 255), outline=blend((140, 150, 255), BAR_BG, 0.45), width=1)
    d.rounded_rectangle([cx + 9, cy + 9, cx + 25, cy + 31], radius=3,
                        outline=(160, 168, 200, 255), width=1)
    d.text((cx + 33, cy + 20), "capsule.md", font=font(12.5, "semi"),
           fill=(220, 226, 245), anchor="lm")
    img.convert("RGB").save(os.path.join(OUT, "promo-tile-small-440x280.png"))


def build_marquee():
    W, H = 1400, 560
    img = v_gradient(W, H, (13, 13, 24), (20, 17, 38)).convert("RGBA")
    img.alpha_composite(glow(560, (123, 108, 255), 55), (-140, -220))
    img.alpha_composite(glow(520, (55, 200, 232), 34), (520, 240))
    img.alpha_composite(glow(560, (255, 94, 168), 45), (1080, -160))
    img.alpha_composite(h_gradient(W, 4, BRAND_STOPS).convert("RGBA"), (0, 0))
    d = ImageDraw.Draw(img)
    # left: wordmark, tagline, support line
    grad, mask, r = wordmark(d, 76, 74, 58)
    img.paste(grad, (76, 78), mask)
    d = ImageDraw.Draw(img)
    d.text((76 + r * 2 + 16, 72), "clonemy.ai", font=font(58, "bold"), fill=WHITE)
    d.text((76, 168), "Your AI knows you.", font=font(42, "bold"), fill=(240, 242, 252))
    gradient_text(img, (76, 224), "Take that with you.", font(42, "bold"), BRAND_STOPS)
    d.text((76, 306), "Extract, compile, restore. One capsule file, owned by you.",
           font=font(21, "reg"), fill=blend(WHITE, (16, 16, 28), 0.72))
    support = "Works with ChatGPT, Claude, Gemini, Grok, Perplexity, Muse, and Meta AI."
    f_sup = font(18, "reg")
    if d.textlength(support, font=f_sup) > 838 - 76 - 20:
        # keep the line clear of the capsule card at x=838: shrink the
        # type first, then drop the Oxford comma if it still runs wide
        f_sup = font(16, "reg")
        if d.textlength(support, font=f_sup) > 838 - 76 - 20:
            support = "Works with ChatGPT, Claude, Gemini, Grok, Perplexity, Muse and Meta AI."
    d.text((76, 344), support, font=f_sup, fill=blend(WHITE, (16, 16, 28), 0.52))
    # capsule card behind the bar, right side
    d.rounded_rectangle([838, 92, 838 + 300, 92 + 190], radius=16,
                        fill=(19, 19, 33, 255), outline=blend((140, 150, 255), BAR_BG, 0.35), width=1)
    d.rounded_rectangle([862, 116, 898, 164], radius=5, outline=(150, 158, 195, 255), width=2)
    d.polygon([(884, 116), (898, 130), (884, 130)], fill=(90, 96, 125, 255))
    d.text((880, 146), ".md", font=font(11, "bold"), fill=(180, 188, 215), anchor="mm")
    d.text((912, 122), "capsule.md", font=font(20, "bold"), fill=(228, 233, 250))
    line_bars(d, 862, 190, [220, 250, 170], (86, 92, 118), h=9, gap=11)
    # the bar, hero state, overlapping the card
    bar = render_bar("ready", STATUS_FOUND, "Claude", width=430)
    img.paste(bar, (1400 - 76 - bar.width, 560 - bar.height - 64), bar)
    img.convert("RGB").save(os.path.join(OUT, "promo-marquee-1400x560.png"))


if __name__ == "__main__":
    build_shots()
    build_small_tile()
    build_marquee()
    for fn in sorted(os.listdir(OUT)):
        if fn.endswith(".png"):
            im = Image.open(os.path.join(OUT, fn))
            print(fn, im.size[0], "x", im.size[1])
    print("built")
