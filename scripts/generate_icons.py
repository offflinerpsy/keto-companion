"""Reproducible original bowl/leaf app mark; no fonts or external brand assets.
The authored SVG is canonical geometry; Pillow creates small antialiased rasters.
"""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'cloudflare-saas/public'
SVG='''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256" role="img" aria-label="KETO Companion"><defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#795272"/><stop offset="1" stop-color="#51324d"/></linearGradient></defs><rect width="256" height="256" rx="60" fill="url(#p)"/><path d="M50 131h156c-4 42-34 73-78 73s-74-31-78-73Z" fill="#fbf6ed"/><path d="M74 136h108" stroke="#d8c7d2" stroke-width="8" stroke-linecap="round"/><path d="M126 111c-34-1-55-21-55-55 34 1 55 21 55 55Z" fill="#c9d9bd"/><path d="M137 119c-8-36 10-68 48-78 9 36-10 67-48 78Z" fill="#e7eddb"/><path d="m139 116 28-42" stroke="#a9bc9d" stroke-width="7" stroke-linecap="round"/><path d="M103 213h50" stroke="#fbf6ed" stroke-width="8" stroke-linecap="round"/></svg>'''
def cubic(a,b,c,d):
    return [tuple((1-t)**3*a[j]+3*(1-t)**2*t*b[j]+3*(1-t)*t*t*c[j]+t**3*d[j] for j in (0,1)) for t in (i/50 for i in range(51))]
def raster(size):
    n=size*4;s=n/256;canvas=Image.new('RGBA',(n,n));pixels=canvas.load();a=(121,82,114);b=(81,50,77)
    for y in range(n):
        for x in range(n):
            t=(x+y)/(2*max(1,n-1));pixels[x,y]=tuple(round(a[i]+(b[i]-a[i])*t) for i in range(3))+(255,)
    mask=Image.new('L',(n,n));ImageDraw.Draw(mask).rounded_rectangle((0,0,n-1,n-1),radius=60*s,fill=255);canvas.putalpha(mask);draw=ImageDraw.Draw(canvas)
    def poly(points,fill):draw.polygon([(round(x*s),round(y*s)) for x,y in points],fill=fill)
    def line(points,color,width):
        pts=[(round(x*s),round(y*s)) for x,y in points];w=round(width*s);draw.line(pts,fill=color,width=w)
        for x,y in (pts[0],pts[-1]):draw.ellipse((x-w/2,y-w/2,x+w/2,y+w/2),fill=color)
    poly([(50,131),(206,131)]+cubic((206,131),(202,173),(172,204),(128,204))+cubic((128,204),(84,204),(54,173),(50,131)),'#fbf6ed')
    line([(74,136),(182,136)],'#d8c7d2',8)
    poly(cubic((126,111),(92,110),(71,90),(71,56))+cubic((71,56),(105,57),(126,77),(126,111)),'#c9d9bd')
    poly(cubic((137,119),(129,83),(147,51),(185,41))+cubic((185,41),(194,77),(175,108),(137,119)),'#e7eddb')
    line([(139,116),(167,74)],'#a9bc9d',7);line([(103,213),(153,213)],'#fbf6ed',8)
    return canvas.resize((size,size),Image.Resampling.LANCZOS)
def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    for name in ['icon.svg','favicon.svg']:(ROOT/name).write_text(SVG+'\n')
    for size in [16,32,48,180,192,512]:raster(size).save(ROOT/(('favicon-' if size<100 else 'icon-')+str(size)+'.png'))
    raster(256).save(ROOT/'favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48)])
    print('Original icon.svg/favicon.svg, ICO16/32/48, PNG16/32/48/180/192/512 prepared; no font or third-party image assets.')
if __name__=='__main__':main()
