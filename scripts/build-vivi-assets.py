#!/usr/bin/env python3
"""Builds the Vivi assets of the package from the originals. usage: build-vivi-assets.py <vivi dir with gen/ source/ wallpaper/> <out dir>
Small sizes come from the original no-background art (source/), large ones from gen/vivi-avatar.png; every size is its own properly
downscaled file (halving steps, Lanczos, a light unsharp mask at the small sizes), not a browser downscale of a big image."""
import os, sys, shutil, glob
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

def alpha_bbox(im, pad=0.03):
    bb = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    side = int(max(w, h) * (1 + 2 * pad))
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im.crop(bb), ((side - w) // 2, (side - h) // 2))
    return sq

def down(im, px, sharpen=True):
    im = im.convert('RGBA')
    # premultiply to avoid dark fringes at the edge of the alpha
    r, g, b, a = im.split()
    pm = Image.merge('RGBA', (Image.composite(r, Image.new('L', im.size, 0), a), Image.composite(g, Image.new('L', im.size, 0), a), Image.composite(b, Image.new('L', im.size, 0), a), a))
    while pm.width // 2 >= px * 1.5:
        pm = pm.resize((pm.width // 2, pm.height // 2), Image.LANCZOS)
    pm = pm.resize((px, px), Image.LANCZOS)
    if sharpen and px <= 128:
        pm = pm.filter(ImageFilter.UnsharpMask(radius=0.7 if px <= 64 else 1.0, percent=130 if px <= 64 else 90, threshold=1))
    return pm

# logo and avatar art
logo_src = alpha_bbox(Image.open(f'{src}/source/素材_新版_无背景.png').convert('RGBA'))
for px in (24, 32, 48, 64, 96, 128, 192):
    down(logo_src, px).save(f'{out}/vivi-logo-{px}.png', optimize=True)
av = Image.open(f'{src}/gen/vivi-avatar.png').convert('RGBA')
for px in (256, 384, 512, 768, 1024):
    down(av, px, sharpen=False).save(f'{out}/vivi-avatar-{px}.webp', quality=90, method=6)

# the clip: small sizes show the head only (sun with the paw), large ones the whole clip
clip = Image.open(f'{src}/gen/vivi-clip.png').convert('RGBA')
cb = clip.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
clip = clip.crop(cb)
head = alpha_bbox(clip.crop((0, 0, int(clip.width * 0.60), clip.height)), 0.02)
for px in (24, 32, 48):
    d = down(head, px)
    d = d.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=0))
    d.save(f'{out}/vivi-clip-{px}.png', optimize=True)
full = alpha_bbox(clip, 0.02)
for px in (64, 96, 128, 256, 512):
    down(full, px).save(f'{out}/vivi-clip-{px}.webp', quality=92, method=6)

# loading: four open-eyed frames (2, 6, 7, 3 of the original eight) trimmed to the figure
ld = Image.open(f'{src}/gen/vivi-loading.png').convert('RGBA'); fw = ld.width // 8
frames = [ld.crop((i * fw, 160, (i + 1) * fw, 552)) for i in (2, 6, 7, 3)]
sprite = Image.new('RGBA', (fw * 4, 392), (0, 0, 0, 0))
for i, f in enumerate(frames): sprite.paste(f, (i * fw, 0))
sprite.save(f'{out}/vivi-loading.webp', quality=90, method=6)
print('loading frame', fw, 392)

# the menu background
bg = Image.open(f'{src}/gen/vivi-bg.png').convert('RGBA'); bg = bg.resize((512, 768), Image.LANCZOS)
bg.save(f'{out}/vivi-bg.webp', quality=82, method=6)

# wallpapers
for n in (1, 2):
    Image.open(f'{src}/wallpaper/lion-wallpaper-{n}.png').convert('RGB').save(f'{out}/vivi-wallpaper-{n}.webp', quality=80, method=6)

# window controls
for n in ('close', 'maximize', 'minimize', 'restore'):
    shutil.copy(f'{src}/gen/btn-{n}.svg', f'{out}/btn-{n}.svg')

# the application icon
sizes = (16, 24, 32, 48, 64, 128, 256)
imgs = [down(logo_src, s) for s in sizes]
imgs[-1].save(f'{out}/vivi-icon.ico', format='ICO', sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
print(sorted(os.listdir(out)))
for f in sorted(os.listdir(out)): print(f, os.path.getsize(f'{out}/{f}'))
