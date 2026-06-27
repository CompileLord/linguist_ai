"use client";
import { useEffect, useRef } from "react";

export default function MeshBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const sz = 256, mk = sz - 1;
    const p = new Uint8Array(sz * 2), v = new Float32Array(sz);
    for (let i = 0; i < sz; i++) { p[i] = p[i + sz] = (Math.random() * sz) | 0; v[i] = Math.random() * 2 - 1; }
    const fd = (t: number) => t * t * (3 - 2 * t);
    const lp = (t: number, a: number, b: number) => a + t * (b - a);
    const noise = (x: number, y: number) => {
      const xi = Math.floor(x) & mk, yi = Math.floor(y) & mk;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      return lp(fd(yf), lp(fd(xf), v[p[p[xi]+yi]&mk], v[p[p[xi+1]+yi]&mk]), lp(fd(xf), v[p[p[xi]+yi+1]&mk], v[p[p[xi+1]+yi+1]&mk]));
    };
    const ACC = ["rgba(0,220,255,OP)", "rgba(100,180,255,OP)", "rgba(110,91,255,OP)"];
    const WHT = ["rgba(240,240,245,OP)", "rgba(200,205,220,OP)", "rgba(160,165,180,OP)"];
    const SHP = ["circle","square","triangle","cross","line"] as const;
    let W = 0, H = 0, aid = 0;
    const ms = { x: null as null|number, y: null as null|number, tx: null as null|number, ty: null as null|number };
    class Pt {
      bx: number; by: number; x: number; y: number; vx=0; vy=0;
      nx: number; ny: number; ang: number; sp: number; s: number; lw: number;
      bo: number; bs: number; col: string; sh: typeof SHP[number];
      constructor() {
        this.bx=this.x=Math.random()*W; this.by=this.y=Math.random()*H;
        this.nx=Math.random()*1e4; this.ny=Math.random()*1e4;
        this.ang=Math.random()*Math.PI*2; this.sp=(Math.random()-.5)*.015;
        this.s=Math.random()*2.2+1.6; this.lw=Math.random()*.4+.6;
        this.bo=Math.random()*Math.PI*2; this.bs=Math.random()*.008+.004;
        const list=Math.random()<.38?ACC:WHT;
        this.col=list[(Math.random()*list.length)|0];
        this.sh=SHP[(Math.random()*SHP.length)|0];
      }
      upd(t: number) {
        this.bx+=noise(this.nx+t*.00025,this.ny)*.38; this.by+=noise(this.nx,this.ny+t*.00025)*.38;
        if(this.bx<-40)this.bx=W+40; if(this.bx>W+40)this.bx=-40;
        if(this.by<-40)this.by=H+40; if(this.by>H+40)this.by=-40;
        this.ang+=this.sp;
        let fx=(this.bx-this.x)*.012, fy=(this.by-this.y)*.012;
        if(ms.x!=null){ const dx=ms.x-this.x,dy=ms.y!-this.y,d=Math.sqrt(dx*dx+dy*dy);
          if(d<180&&d>1){ const inf=(1-d/180)**2*.65,a=Math.atan2(dy,dx);
            fx+=Math.cos(a)*inf-Math.sin(a)*inf*.4; fy+=Math.sin(a)*inf+Math.cos(a)*inf*.4; } }
        this.vx=(this.vx+fx)*.88; this.vy=(this.vy+fy)*.88; this.x+=this.vx; this.y+=this.vy;
      }
      drw(t: number) {
        const s=this.s*(Math.sin(t*this.bs+this.bo)*.2+1);
        ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(this.ang);
        ctx.strokeStyle=this.col.replace("OP","0.22"); ctx.lineWidth=this.lw*3.5;
        ctx.beginPath(); this.pth(s); ctx.stroke();
        ctx.fillStyle=this.col.replace("OP","0.12"); ctx.strokeStyle=this.col.replace("OP","0.62"); ctx.lineWidth=this.lw;
        ctx.beginPath(); this.pth(s); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      pth(s: number) {
        if(this.sh==="circle")ctx.arc(0,0,s,0,Math.PI*2);
        else if(this.sh==="square")ctx.rect(-s,-s,s*2,s*2);
        else if(this.sh==="triangle"){ctx.moveTo(0,-s*1.15);ctx.lineTo(s,s*.85);ctx.lineTo(-s,s*.85);ctx.closePath();}
        else if(this.sh==="cross"){ctx.moveTo(-s,0);ctx.lineTo(s,0);ctx.moveTo(0,-s);ctx.lineTo(0,s);}
        else{ctx.moveTo(-s*1.35,0);ctx.lineTo(s*1.35,0);}
      }
    }
    let pts: Pt[] = [];
    const resize = () => {
      W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight;
      const n=Math.min(W<768?100:280,Math.floor(W*H*.00015));
      pts=Array.from({length:n},()=>new Pt());
    };
    const tick = (t: number) => {
      ctx.clearRect(0,0,W,H);
      if(ms.tx!=null){ ms.x=ms.x==null?ms.tx:ms.x+(ms.tx-ms.x)*.08; ms.y=ms.y==null?ms.ty!:ms.y+(ms.ty!-ms.y)*.08; }
      else { ms.x=null; ms.y=null; }
      for(const p of pts){p.upd(t);p.drw(t);}
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<105){ let a=(1-d/105)*.16;
          if(ms.x!=null){const mx=ms.x-(pts[i].x+pts[j].x)/2,my=ms.y!-(pts[i].y+pts[j].y)/2,md=Math.sqrt(mx*mx+my*my);if(md<180)a+=(1-md/180)*.28;}
          if(a>.01){ ctx.lineWidth=1.8;ctx.strokeStyle=pts[i].col.replace("OP",(a*.35).toFixed(3));ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke();
            ctx.lineWidth=.55;ctx.strokeStyle=pts[i].col.replace("OP",a.toFixed(3));ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.stroke(); } }
      }
      aid=requestAnimationFrame(tick);
    };
    const mm=(e:MouseEvent)=>{ms.tx=e.clientX;ms.ty=e.clientY;};
    const ml=()=>{ms.tx=null;ms.ty=null;};
    const mt=(e:TouchEvent)=>{if(e.touches[0]){ms.tx=e.touches[0].clientX;ms.ty=e.touches[0].clientY;}};
    const vis=()=>{if(document.hidden)cancelAnimationFrame(aid);else tick(performance.now());};
    window.addEventListener("resize",resize); window.addEventListener("mousemove",mm); window.addEventListener("mouseleave",ml);
    window.addEventListener("touchmove",mt); window.addEventListener("touchend",ml); document.addEventListener("visibilitychange",vis);
    resize(); tick(0);
    return()=>{cancelAnimationFrame(aid);window.removeEventListener("resize",resize);window.removeEventListener("mousemove",mm);window.removeEventListener("mouseleave",ml);window.removeEventListener("touchmove",mt);window.removeEventListener("touchend",ml);document.removeEventListener("visibilitychange",vis);};
  },[]);
  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none" style={{zIndex:0}} />;
}
