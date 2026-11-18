# -*- coding: utf-8 -*-
"""
Comando «Comprime» — comprime EN SITIO el Drive de la Página WEB para liberar espacio.
- Videos  -> 720p (lado largo máx 1280), H.264 crf 28, maxrate 2.8M, audio aac 96k.
- Imágenes-> máx 2048 px, JPG q85 / PNG optimize; EXIF transpose; CMYK -> RSWOP.
- PDFs    -> PyMuPDF, EXCEPTO Manual / Presentación / Diseño de Logo.
- SALTAR  : 00 Logos, Galería (carpetas) y Feed Instagram (imágenes).
Sobrescribe el archivo en su sitio (os.replace); NUNCA borra a Papelera.
Verifica cada archivo (válido + más chico) antes de sustituir. Idempotente.
Uso:  python comprime.py            (todo el Drive)
      python comprime.py --solo-video
      python comprime.py "04 Social media"   (limita a esa carpeta)
"""
import os, sys, subprocess, json, io, shutil, tempfile
from PIL import Image, ImageCms, ImageOps
Image.MAX_IMAGE_PIXELS = None

DRIVE = r"H:\Mi unidad\Página WEB"
FFMPEG = r"C:\Users\USUARIO\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
FFPROBE = r"C:\Users\USUARIO\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffprobe.exe"
RSWOP = ImageCms.getOpenProfile(r"C:\Windows\System32\spool\drivers\color\RSWOP.icm")
SRGB = ImageCms.createProfile("sRGB")
XF = ImageCms.buildTransform(RSWOP, SRGB, "CMYK", "RGB", renderingIntent=0)

VID = (".mp4", ".mov", ".m4v", ".webm")
IMG = (".jpg", ".jpeg", ".png", ".webp")
MAXPX_V = 1280           # lado largo video
MAXBR = 3_200_000        # si el bitrate es menor y ya es <=1280px, se salta
MAXPX_I = 2048           # lado largo imagen
IMG_SKIP_BYTES = 1_200_000   # jpg ya liviano

def rel(p): return os.path.relpath(p, DRIVE)

def salta_carpeta(p):
    r = "\\" + rel(p)
    return ("\\00 Logos\\" in r) or r.startswith("\\00 Logos") or ("\\Galería\\" in r) or r.startswith("\\Galería")

def es_feed(p):
    return "\\Feed Instagram\\" in ("\\" + rel(p))

def pdf_protegido(p):
    r = rel(p).lower()
    return any(k in r for k in ("manual", "presentaci", "diseño de logo", "diseno de logo", "presentación de logo"))

def probe(p):
    try:
        out = subprocess.run([FFPROBE, "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height:format=duration,bit_rate",
            "-of", "json", p], capture_output=True, text=True, timeout=60).stdout
        j = json.loads(out); s = j["streams"][0]; f = j.get("format", {})
        w, h = int(s["width"]), int(s["height"])
        br = int(f.get("bit_rate") or 0); dur = float(f.get("duration") or 0)
        return w, h, br, dur
    except Exception:
        return None

def comp_video(p):
    info = probe(p)
    if not info: return (0, "no-probe")
    w, h, br, dur = info
    size0 = os.path.getsize(p)
    br_est = br or (size0 * 8 / dur if dur else 0)
    if max(w, h) <= MAXPX_V and br_est and br_est < MAXBR:
        return (0, "ya-liviano")
    tmp = p + ".tmp_cmp.mp4"
    cmd = [FFMPEG, "-y", "-i", p,
        "-vf", f"scale=w={MAXPX_V}:h={MAXPX_V}:force_original_aspect_ratio=decrease:force_divisible_by=2",
        "-c:v", "libx264", "-preset", "faster", "-crf", "28",
        "-maxrate", "2.8M", "-bufsize", "5.6M", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", tmp]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(tmp):
        if os.path.exists(tmp): os.remove(tmp)
        return (0, "ffmpeg-err")
    ni = probe(tmp)
    size1 = os.path.getsize(tmp)
    ok = ni and size1 > 10000 and size1 < size0 and (not dur or abs(ni[3]-dur) < max(0.6, dur*0.03))
    if ok:
        os.replace(tmp, p)                      # sobrescribe EN SITIO
        return (size0 - size1, "ok")
    os.remove(tmp)
    return (0, "no-mejora")

def a_srgb(im):
    if im.mode == "CMYK":
        icc = im.info.get("icc_profile")
        if icc:
            try:
                src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
                return ImageCms.profileToProfile(im, src, SRGB, outputMode="RGB")
            except Exception: pass
        return ImageCms.applyTransform(im, XF)
    if im.mode in ("RGBA", "P", "LA"): return im
    return im.convert("RGB") if im.mode != "RGB" else im

def comp_imagen(p):
    ext = os.path.splitext(p)[1].lower()
    size0 = os.path.getsize(p)
    try:
        im = Image.open(p); im.load()
    except Exception:
        return (0, "no-abre")
    big = max(im.size) > MAXPX_I
    if not big and (ext in (".jpg", ".jpeg") and size0 < IMG_SKIP_BYTES):
        return (0, "ya-liviano")
    if not big and ext == ".png" and size0 < IMG_SKIP_BYTES:
        return (0, "ya-liviano")
    im = ImageOps.exif_transpose(a_srgb(im))
    if max(im.size) > MAXPX_I:
        im.thumbnail((MAXPX_I, MAXPX_I), Image.LANCZOS)
    tmp = p + ".tmp_cmp" + ext
    try:
        if ext in (".jpg", ".jpeg"):
            im.convert("RGB").save(tmp, "JPEG", quality=85, optimize=True, progressive=True)
        elif ext == ".png":
            im.save(tmp, "PNG", optimize=True)
        elif ext == ".webp":
            im.save(tmp, "WEBP", quality=86, method=6)
        else:
            return (0, "ext")
    except Exception:
        if os.path.exists(tmp): os.remove(tmp)
        return (0, "save-err")
    size1 = os.path.getsize(tmp)
    if size1 > 5000 and size1 < size0:
        os.replace(tmp, p)
        return (size0 - size1, "ok")
    os.remove(tmp)
    return (0, "no-mejora")

def comp_pdf(p):
    import pymupdf
    size0 = os.path.getsize(p)
    tmp = p + ".tmp_cmp.pdf"
    try:
        d = pymupdf.open(p)
        d.save(tmp, garbage=4, deflate=True, deflate_images=True, deflate_fonts=True, clean=True)
        d.close()
    except Exception:
        if os.path.exists(tmp): os.remove(tmp)
        return (0, "pdf-err")
    size1 = os.path.getsize(tmp) if os.path.exists(tmp) else size0
    if size1 > 5000 and size1 < size0 * 0.92:
        os.replace(tmp, p)
        return (size0 - size1, "ok")
    if os.path.exists(tmp): os.remove(tmp)
    return (0, "no-mejora")

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    solo_video = "--solo-video" in sys.argv
    root = os.path.join(DRIVE, args[0]) if args else DRIVE
    tot_saved = 0; n_ok = 0; n_files = 0
    for dp, _, fns in os.walk(root):
        if salta_carpeta(dp): continue
        for fn in fns:
            p = os.path.join(dp, fn); ext = os.path.splitext(fn)[1].lower()
            if ext.endswith("tmp_cmp") or ".tmp_cmp" in fn: continue
            saved, why = 0, ""
            if ext in VID:
                saved, why = comp_video(p)
            elif not solo_video and ext in IMG:
                if es_feed(p):  # Feed Instagram: no vale la pena
                    continue
                saved, why = comp_imagen(p)
            elif not solo_video and ext == ".pdf":
                if pdf_protegido(p): continue
                saved, why = comp_pdf(p)
            else:
                continue
            n_files += 1
            if why == "ok":
                n_ok += 1; tot_saved += saved
                print(f"  [-{saved/1024/1024:6.1f} MB] {rel(p)}", flush=True)
    print(f"\n=== COMPRIME LISTO ===  archivos comprimidos: {n_ok} · espacio liberado: {tot_saved/1024/1024/1024:.2f} GB", flush=True)

if __name__ == "__main__":
    main()
