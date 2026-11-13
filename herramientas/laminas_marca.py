# Generador general de láminas de presentación de logo (16:9). Reutilizable por marca (config).
# Reglas: marco tech, logos pequeños, separación símbolo/logotipo por COMPONENTE, versiones a escala
# real + gaps iguales, vertical en portada/color/versiones/uso si hay V, orientación si hay H y V.
import numpy as np, scipy.ndimage as ndi
from PIL import Image, ImageDraw, ImageFont
import os, sys
W,H=1920,1080; M=70
FB=r"C:\Windows\Fonts\bahnschrift.ttf"; FA=r"C:\Windows\Fonts\arial.ttf"; FAB=r"C:\Windows\Fonts\arialbd.ttf"
def font(sz,bold=True,cond=False):
    for p in (([FB] if cond else [])+([FAB] if bold else [FA])):
        try: return ImageFont.truetype(p,sz)
        except: pass
    return ImageFont.load_default()
def serif(sz):
    for p in [r"C:\Windows\Fonts\georgia.ttf",r"C:\Windows\Fonts\times.ttf"]:
        try: return ImageFont.truetype(p,sz)
        except: pass
    return font(sz)
def trim(im):
    bb=im.split()[3].getbbox(); return im.crop(bb) if bb else im
def fit(im,mw,mh):
    s=min(mw/im.width,mh/im.height); return im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS)
def cmyk(r,g,b):
    r,g,b=r/255,g/255,b/255; k=1-max(r,g,b)
    if k>=1: return (0,0,0,100)
    return tuple(round(v*100) for v in ((1-r-k)/(1-k),(1-g-k)/(1-k),(1-b-k)/(1-k),k))

def split_parts(img, simbolo_arriba=True):
    arr=np.array(img); mask=arr[:,:,3]>80
    lbl,n=ndi.label(mask,structure=np.ones((3,3)))
    cys=[(i,np.where(lbl==i)[0].mean()) for i in range(1,n+1)]
    cys.sort(key=lambda t:t[1])
    if len(cys)>=2:
        ki=max(range(len(cys)-1), key=lambda k:cys[k+1][1]-cys[k][1]); thr=(cys[ki][1]+cys[ki+1][1])/2
    else: thr=mask.shape[0]
    topM=np.zeros_like(mask); botM=np.zeros_like(mask)
    for i,cy in cys: (topM if cy<thr else botM)[lbl==i]=True
    symM,wordM=(topM,botM) if simbolo_arriba else (botM,topM)
    def toi(m): out=arr.copy(); out[~m]=0; return Image.fromarray(out,"RGBA")
    return toi(symM),toi(wordM)

class Marca:
    def __init__(s,**k): s.__dict__.update(k)
    def load(s,n): return Image.open(os.path.join(s.folder,n)).convert("RGBA")
    def has(s,n): return os.path.exists(os.path.join(s.folder,n))

def frame(m,d,dark=False):
    ink=m.CREAM if dark else m.INK; L=70
    d.rectangle([M,M,W-M,H-M],outline=ink,width=2)
    for (cx,cy,sx,sy) in [(M,M,1,1),(W-M,M,-1,1),(M,H-M,1,-1),(W-M,H-M,-1,-1)]:
        d.line([(cx,cy),(cx+sx*L,cy)],fill=m.ACC,width=6); d.line([(cx,cy),(cx,cy+sy*L)],fill=m.ACC,width=6)
def base(m,section,dark=False):
    bg=m.DARK if dark else m.CREAM; ink=m.CREAM if dark else m.INK
    im=Image.new("RGB",(W,H),bg); d=ImageDraw.Draw(im)
    if not dark:
        gl=tuple(max(0,c-6) for c in m.CREAM)
        for x in range(0,W,48): d.line([(x,0),(x,H)],fill=gl)
        for y in range(0,H,48): d.line([(0,y),(W,y)],fill=gl)
    frame(m,d,dark)
    d.text((M+26,M+22),section.upper(),font=font(24,cond=True),fill=ink)
    d.line([(M+26,M+60),(M+26+max(240,d.textlength(section.upper(),font=font(24,cond=True))+30),M+60)],fill=m.ACC,width=3)
    tw=d.textlength(m.tag,font=font(18)); d.text((W-M-26-tw,M+26),m.tag,font=font(18),fill=ink)
    return im,d

def main_variant(m,kind):  # kind: color/negro/blanco  -> usa V si existe, si no H
    pref = "V_" if m.has_V else "H_"
    return m.load(pref+kind+".png")

def gen(m):
    SEQ=os.path.join(m.folder,"secuencia"); os.makedirs(SEQ,exist_ok=True)
    def save(im,n): im.save(os.path.join(SEQ,n),quality=92)

    # ---- PORTADA ----
    im,d=base(m,"Identidad de marca")
    logo=fit(trim(main_variant(m,"color")), W*(0.21 if m.has_V else 0.30), H*(0.46 if m.has_V else 0.30))
    im.paste(logo,((W-logo.width)//2,(H-logo.height)//2-30),logo)
    tf=font(30); tw=d.textlength(m.titulo,font=tf); ty=H-70-110
    d.text(((W-tw)//2,ty),m.titulo,font=tf,fill=m.INK)
    d.line([((W-tw)//2-200,ty+18),((W-tw)//2-60,ty+18)],fill=m.INK,width=2)
    d.line([((W+tw)//2+60,ty+18),((W+tw)//2+200,ty+18)],fill=m.INK,width=2)
    # año arriba-der ya puesto como tag? no: tag es nombre. Añadir año como subtag:
    yf=font(20); yw=d.textlength(m.anio,font=yf); d.text((W-M-26-yw,M+54),m.anio,font=yf,fill=m.INK)
    save(im,"1-portada.jpg")

    # ---- CONSTRUCCIÓN (concepto) ----
    im,d=base(m,"Construcción")
    lg=fit(trim(main_variant(m,"negro")), W*0.19, H*(0.46 if m.has_V else 0.34))
    lz=(M+30,int(W*0.46)); lx=(lz[0]+lz[1])//2-lg.width//2
    im.paste(lg,(lx,(H-lg.height)//2),lg)
    x=int(W*0.52); y=int(H*0.30)
    d.text((x,y),m.concepto[0],font=font(36,cond=True),fill=m.INK)
    d.line([(x,y+50),(x+220,y+50)],fill=m.ACC,width=4)
    for i,ln in enumerate(m.concepto[1:]): d.text((x,y+92+i*38),ln,font=font(22,bold=False),fill=m.INK)
    save(im,"s4-construccion.jpg")

    # ---- COLOR ----
    im,d=base(m,"Color")
    blanco=main_variant(m,"blanco"); negro=main_variant(m,"negro")
    pal=m.paleta; n=len(pal); cw=int((W-2*M-120)/n)-20; cw=min(cw,300); gap=30
    total=n*cw+(n-1)*gap; x=(W-total)//2; cy=int(H*0.27); ch=440
    lum=lambda c:(0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255
    for c_,hx,nm in pal:
        card=Image.new("RGBA",(cw,ch),(0,0,0,0)); cd=ImageDraw.Draw(card)
        cd.rounded_rectangle([1,1,cw-2,ch-2],radius=16,fill=tuple(c_)+(255,),outline=tuple(m.INK)+(255,),width=2)
        mk=fit(trim(blanco if lum(c_)<0.5 else negro),int(cw*0.5),int(ch*0.5)); card.alpha_composite(mk,((cw-mk.width)//2,int(ch*0.22)))
        im.paste(card,(x,cy),card)
        d.text((x,cy+ch+20),nm.upper(),font=font(20,cond=True),fill=m.INK)
        d.text((x,cy+ch+50),hx,font=font(18),fill=m.INK)
        r,g,b=c_; cc=cmyk(r,g,b)
        d.text((x,cy+ch+78),f"RGB {r} {g} {b}",font=font(14,bold=False),fill=m.INK)
        d.text((x,cy+ch+100),f"CMYK {cc[0]} {cc[1]} {cc[2]} {cc[3]}",font=font(14,bold=False),fill=m.INK)
        x+=cw+gap
    save(im,"s4-color.jpg")

    # ---- VERSIONES (componentes, escala real, gaps iguales) ----
    vlogo=trim(main_variant(m,"color"))
    symFull,wordFull=split_parts(vlogo, m.simbolo_arriba)
    s=min(W*0.19/vlogo.width, H*0.46/vlogo.height); dim=(int(vlogo.width*s),int(vlogo.height*s))
    full=trim(vlogo.resize(dim,Image.LANCZOS)); sym=trim(symFull.resize(dim,Image.LANCZOS)); word=trim(wordFull.resize(dim,Image.LANCZOS))
    im,d=base(m,"Versiones")
    els=[(full,"Logotipo con símbolo marcario"),(sym,"Símbolo marcario"),(word,"Logotipo")]
    inner_l,inner_r=M,W-M; totalw=sum(e[0].width for e in els); g=((inner_r-inner_l)-totalw)/(len(els)+1)
    cyc=int(H*0.50); x=inner_l+g; maxh=max(e[0].height for e in els)
    for img,lab in els:
        im.paste(img,(int(x),cyc-img.height//2),img); cx=int(x+img.width//2)
        lf=font(21,cond=True); lw=d.textlength(lab,font=lf); ly=cyc+maxh//2+44
        d.text((cx-lw//2,ly),lab,font=lf,fill=m.INK); d.line([(cx-60,ly+32),(cx+60,ly+32)],fill=m.ACC,width=3); x+=img.width+g
    save(im,"s4-versiones.jpg")

    # ---- FUENTES ----
    im,d=base(m,"Tipografía")
    lw_=fit(word,W*0.40,H*0.18)
    d.text((int(W*0.10),int(H*0.20)),"TIPOGRAFÍA DEL LOGOTIPO",font=font(24,cond=True),fill=m.INK)
    d.line([(int(W*0.10),int(H*0.20)+38),(int(W*0.10)+330,int(H*0.20)+38)],fill=m.ACC,width=3)
    im.paste(lw_,(int(W*0.10),int(H*0.29)),lw_)
    d.text((int(W*0.10),int(H*0.46)),m.font_note,font=font(18,bold=False),fill=m.ACC)
    d.text((int(W*0.10),int(H*0.56)),"TIPOGRAFÍA SECUNDARIA",font=font(24,cond=True),fill=m.INK)
    d.line([(int(W*0.10),int(H*0.56)+38),(int(W*0.10)+330,int(H*0.56)+38)],fill=m.ACC,width=3)
    d.text((int(W*0.10),int(H*0.63)),"Aa Bb Cc Dd Ee 123",font=serif(56),fill=m.INK)
    d.text((int(W*0.10),int(H*0.75)),"abcdefghijklmnñopqrstuvwxyz",font=serif(28),fill=m.INK)
    save(im,"s4-fuentes.jpg")

    # ---- ORIENTACIÓN (solo si hay H y V) ----
    if m.has_V and m.has("H_color.png"):
        im,d=base(m,"Orientación")
        h=fit(trim(m.load("H_color.png")),W*0.40,H*0.30); v=fit(trim(m.load("V_color.png")),W*0.20,H*0.46)
        hx_,vx_,cyc=int(W*0.30),int(W*0.72),int(H*0.50)
        im.paste(h,(hx_-h.width//2,cyc-h.height//2),h); im.paste(v,(vx_-v.width//2,cyc-v.height//2),v)
        for lab,cx,yb in [("Horizontal",hx_,cyc+int(H*0.20)),("Vertical",vx_,cyc+int(H*0.28))]:
            lf=font(22,cond=True); lw=d.textlength(lab,font=lf)
            d.text((cx-lw//2,yb),lab,font=lf,fill=m.INK); d.line([(cx-60,yb+32),(cx+60,yb+32)],fill=m.ACC,width=3)
        save(im,"s4-orientacion.jpg")

    # ---- USO ----
    im=Image.new("RGB",(W,H),m.CREAM); d=ImageDraw.Draw(im)
    d.rectangle([W//2,0,W,H],fill=m.DARK); frame(m,d)
    d.text((M+26,M+22),"USO AUTORIZADO",font=font(24,cond=True),fill=m.INK)
    d.line([(M+26,M+60),(M+320,M+60)],fill=m.ACC,width=3)
    lp=fit(trim(main_variant(m,"color")),W*(0.17 if m.has_V else 0.26),H*(0.42 if m.has_V else 0.26)); im.paste(lp,(int(W*0.25)-lp.width//2,(H-lp.height)//2-10),lp)
    ln=fit(trim(main_variant(m,"blanco")),W*(0.17 if m.has_V else 0.26),H*(0.42 if m.has_V else 0.26)); im.paste(ln,(int(W*0.75)-ln.width//2,(H-ln.height)//2-10),ln)
    d.text((int(W*0.25)-54,H-180),"POSITIVO",font=font(22,cond=True),fill=m.INK)
    d.text((int(W*0.75)-54,H-180),"NEGATIVO",font=font(22,cond=True),fill=m.CREAM)
    save(im,"s4-uso.jpg")
    print("OK", m.folder)

CB=r"E:\Personal\Programacion\Pagina WEB\assets\marcas"
MARCAS=[
 Marca(folder=CB+r"\dolceriposo", tag="DOLCE RIPOSO", anio="2017", titulo="PRESENTACIÓN DE LOGOTIPO",
   CREAM=(244,239,233), INK=(80,0,0), ACC=(122,26,26), DARK=(26,8,8), has_V=True, simbolo_arriba=True,
   font_note="Sans condensada alta  ·  similar a Oswald / Bebas Neue",
   concepto=["EL SÍMBOLO","Un monumento sereno que custodia el","descanso: evoca el reposo eterno, la","memoria y la paz.","","\"Dolce Riposo\" — dulce reposo: una","despedida cálida, digna y luminosa."],
   paleta=[((80,0,0),"#500000","Granate"),((122,26,26),"#7A1A1A","Vino"),((120,120,120),"#787878","Gris"),((26,26,26),"#1A1A1A","Negro"),((244,239,233),"#F4EFE9","Hueso")]),
 Marca(folder=CB+r"\angarita", tag="ANGARITA PREMIACIONES", anio="2017", titulo="PRESENTACIÓN DE LOGOTIPO",
   CREAM=(247,243,236), INK=(38,38,38), ACC=(200,148,30), DARK=(26,26,28), has_V=False, simbolo_arriba=False,
   font_note="Sans robusta en mayúsculas  ·  similar a Anton / Franchise",
   concepto=["EL SÍMBOLO","Un trofeo formado por el monograma AP:","símbolo de la victoria, el mérito y el","reconocimiento en toda disciplina.","","Oro y plata — el brillo de cada logro."],
   paleta=[((240,220,140),"#F0DC8C","Oro claro"),((220,180,80),"#DCB450","Oro"),((180,120,0),"#B47800","Oro oscuro"),((184,184,184),"#B8B8B8","Plata"),((26,26,26),"#1A1A1A","Negro")]),
]
for mk in MARCAS: gen(mk)
print("listo")
