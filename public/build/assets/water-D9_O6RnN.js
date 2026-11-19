import{s as N}from"./draw-options-DuQuMyPh.js";const K=Object.assign({}),V={};let P=null;function rt(){return P??=Promise.all(Object.values(K).map(e=>e())).then(e=>Object.assign(V,Object.fromEntries(e.map(t=>[t.id,t])))),P}const y=e=>Math.round(e*1e3)/1e3+0,F="bone:",q=5e-4,ct=3,R={thigh:45,shin:120,share:607/1475},$=.5;function D(e={},t=null){const s=e.thigh_n?(e.thigh_n[1]-e.thigh_n[0])/R.thigh:1,n=e.shin_n?e.shin_n[1]/R.shin:1,l=t>0?t/R.share:1;return{travel:Math.min(1,Math.max(0,s))*l,sink:Math.min(1,Math.max(0,n))*l}}function lt(e=[]){const t=Object.fromEntries(e.map(r=>[r.name,r])),s=r=>r?.to?Math.hypot(r.to[0]-r.from[0],r.to[1]-r.from[1]):0,n=s(t.thigh_n)+s(t.shin_n),l=t.foot_n?.to&&t.head?.to?Math.max(t.foot_n.to[1],t.foot_n.from[1])-t.head.to[1]:0;return n>0&&l>0?n/l:null}const U="calm",X=(e,{length:t=null,speed:s=1}={})=>{const n=e.duration/Math.max(.1,s);if(!e.loop)return{cycles:1,cycle:t??n};const l=Math.max(1,Math.round((t??n)/n));return{cycles:l,cycle:(t??n)/l}};function it(e,{start:t=0,length:s=null,speed:n=1,bones:l=[],facing:r=1,x0:f=.5,y0:i=0,r0:c=0,xPerHeight:o=0,yPerHeight:a=0,limits:u={},legShare:x=null}={}){const S=D(u,x),{cycles:I,cycle:M}=X(e,{length:s,speed:n}),A=e.keys.some(m=>Math.abs(m.dx??0)>q)||Math.abs(e.travel??0)>1e-6,E=e.keys.some(m=>Math.abs(m.bob??0)>1e-6),d=e.keys.some(m=>Math.abs(m.rot??0)>1e-6),W=new Set(l),p=[];let T=null;for(let m=0;m<I;m++)e.keys.forEach((h,g)=>{if(m>0&&g===0)return;const _={t:y(t+(m+h.t)*M),ease:"smooth"};for(const[O,j]of Object.entries(h))O.startsWith(F)&&W.has(O.slice(F.length))&&(_[O]=y(j*r));A&&(_.x=y(f+r*(m*(e.travel??0)+(h.dx??0))*S.travel*o)),E&&(_.y=y(i+(h.bob??0)*(h.bob<0?S.sink:1)*a)),d&&(_.rotation=y(c+(h.rot??0)*r)),h.face&&h.face!==T&&(_.face=T=h.face),h.contact&&(_.contact=h.contact),p.push(_)});if(e.loop&&p.length){const m=p[p.length-1],h={t:y(m.t+Math.min($,M/2))};for(const g of Object.keys(m))g.startsWith(F)&&(h[g]=0);A&&(h.x=m.x),E&&(h.y=y(i)),d&&(h.rotation=y(c)),e.keys.some(g=>g.contact)&&(h.contact="none"),p.push(h)}return p.length&&delete p[p.length-1].ease,p}const B=e=>new Set(e.flatMap(t=>Object.keys(t)).filter(t=>t!=="t"&&t!=="ease"));function ft(e,t,{inPlace:s=!1}={}){if(s&&(e??[]).some(c=>Number.isFinite(c.x))&&(t=t.map(({x:c,...o})=>o)),!t.length)return[...e??[]];const n=B(t),l=t[0].t-1e-6,r=t[t.length-1].t+1e-6,i=(e??[]).flatMap(c=>{if(c.t<l||c.t>r)return[c];const o=Object.fromEntries(Object.entries(c).filter(([a])=>!n.has(a)));return Object.keys(o).some(a=>a!=="t"&&a!=="ease")?[o]:[]}).map(c=>({...c}));for(const c of t){const o=i.find(a=>N(a.t,c.t));o?Object.assign(o,c):i.push({...c})}if(n.has("face")){const c=(e??[]).filter(o=>o.face&&o.t<l).sort((o,a)=>o.t-a.t).pop()?.face??U;i.find(o=>N(o.t,t[t.length-1].t)).face=c}return i.sort((c,o)=>c.t-o.t)}const b=8,H=8,Y=4,Z=.5,z=.45,L={amount:[0,3],speed:[0,3],glints:[0,3],loop:[2,12]},w=(e,[t,s],n)=>typeof e=="number"&&Number.isFinite(e)?Math.min(s,Math.max(t,e)):n;function ht(e){const t=e?.water;return!t||typeof t!="object"||t.on===!1?null:{amount:w(t.amount,L.amount,1),speed:w(t.speed,L.speed,1),glints:w(t.glints,L.glints,1),loop:w(t.loop,L.loop,Y),mask:typeof t.mask=="string"&&t.mask?t.mask:null}}const J=(e,t)=>t>0?Math.max(1,Math.round(e*t*Z)):0,ut=(e,t)=>2*Math.PI*J(e,t)/e,mt=e=>Math.max(1,Math.round(e*H/b))*b/e,Q=26,tt=2.4,et=1536,ot=16,nt=14,xt=`
  uniform float water, waterAmt, waterW, waterLoop, waterRate, waterGlints, waterCalm;
  uniform sampler2D waterMask;
  uniform sampler2D glintTex;
  #define WAVE_PX ${Q.toFixed(1)}
  #define WAVE_FLAT ${tt.toFixed(2)}
  #define PIC_W ${et.toFixed(1)}
  #define GLINT_FRAMES ${b.toFixed(1)}
  #define GLINTS_ACROSS ${ot.toFixed(1)}
  #define TWINKLES_ACROSS ${nt.toFixed(1)}
  #define TWINKLE_S ${z.toFixed(2)}
  // the mask is read at the picture's uv and repeats as the picture does (a far strip drawn twice: mirrored)
  float maskAt(vec2 p) { return texture2D(waterMask, vec2(p.x, clamp(p.y, 0.0, 1.0))).r; }
  vec2 waterOff(vec2 uv, float th, float m) {
    vec2 p = uv * vec2(PIC_W, PIC_W * texPx.y / texPx.x) / WAVE_PX;
    p.y *= WAVE_FLAT;
    float f = 0.5 * sin(p.x * 0.9 + p.y * 0.35 - th + 1.0) + 0.35 * sin(-p.x * 0.6 + p.y * 0.55 - 2.0 * th + 2.3) + 0.25 * sin(p.x * 1.7 - p.y * 0.2 - 3.0 * th + 4.1);
    float g = 0.5 * sin(p.x * 1.1 - p.y * 0.45 - th + 0.4) + 0.3 * sin(p.y * 0.7 - 2.0 * th + 5.0);
    float n1 = vnoise(p * 0.25 + 1.6 * vec2(cos(th), sin(th))) - 0.5;
    float n2 = vnoise(p * 0.6 + vec2(23.0, 0.0) + 1.1 * vec2(cos(1.0 - 2.0 * th), sin(1.0 - 2.0 * th))) - 0.5;
    float near = waterAmt * m * (0.3 + 0.7 * uv.y);
    return near * vec2(0.0035 * (0.6 * f + 1.4 * (n1 + 0.6 * n2)), 0.0016 * (0.5 * g + 1.2 * (n2 - 0.4 * n1)));
  }
  // a glint: one cel of the sheet in its cell, its own phase and place, only on the water
  float glintAt(vec2 uv, float tl) {
    vec2 cell = vec2(1.0, 0.4 * texPx.x / texPx.y) / GLINTS_ACROSS;   // a cell 2.5 times as wide as high, in uv
    vec2 q = uv / cell;
    vec2 id = floor(q), f = q - id;
    if (hash(id) > waterGlints * 0.4) return 0.0;
    vec2 c = vec2(0.45 + 0.1 * hash(id + 3.1), 0.35 + 0.3 * hash(id + 7.7));
    float mc = maskAt((id + c) * cell);
    if (mc < 0.5) return 0.0;
    vec2 l = (f - c) / vec2(0.92, 0.94) * mix(1.6, 1.0, uv.y);   // the sheet's 96 x 40 frame in a 2.5 : 1 cell
    if (hash(id + 5.3) > 0.5) l.x = -l.x;
    if (abs(l.x) > 0.48 || abs(l.y) > 0.48) return 0.0;
    float ph = hash(id + 17.3);
    float fr = waterCalm > 0.5 ? floor(ph * GLINT_FRAMES) : floor(mod(tl * waterRate + ph * GLINT_FRAMES, GLINT_FRAMES));
    float s = texture2D(glintTex, vec2((fr + l.x + 0.5) / GLINT_FRAMES, l.y + 0.5)).a;
    return s * (0.55 + 0.45 * hash(id + 3.1)) * smoothstep(0.5, 0.8, mc);
  }
  // a twinkle: a small four-point star that pops once a loop at its own time, where the water is brightest
  float twinkleAt(vec2 uv, float tl) {
    vec2 cell = vec2(1.0, texPx.x / texPx.y) / TWINKLES_ACROSS;
    vec2 q = uv / cell;
    vec2 id = floor(q), f = q - id;
    vec2 c = 0.25 + 0.5 * vec2(hash(id + 41.0), hash(id + 43.0));
    vec2 at = (id + c) * cell;
    vec4 under = tap(at);
    float bright = under.a > 0.01 ? smoothstep(0.5, 0.88, lum(under.rgb / under.a)) : 0.0;
    if (hash(id + 47.0) > waterGlints * 0.35 * maskAt(at) * (0.25 + 0.75 * bright)) return 0.0;
    float dt = mod(tl - hash(id + 53.0) * waterLoop, waterLoop);
    float e = dt < TWINKLE_S ? pow(sin(3.14159 * dt / TWINKLE_S), 2.0) : 0.0;
    vec2 d = (f - c) * PIC_W / TWINKLES_ACROSS / mix(4.0, 8.0, uv.y);
    float star = exp(-3.0 * length(d)) + 0.7 * exp(-abs(d.y) * 9.0 - abs(d.x) * 1.1) + 0.7 * exp(-abs(d.x) * 9.0 - abs(d.y) * 1.1);
    return e * min(1.0, star);
  }`,C=96,k=40;function st(e){const t=e%b/b,s=Math.sin(Math.PI*t)**.7,n=C/2,l=k/2,r=24+50*s,f=3+18*t,i=[{x0:n-r/2-f/2,x1:n-f/2,y:l+2*t,bow:-1-1.5*s,width:1.4+1.6*s,alpha:.4+.6*s},{x0:n+f/2,x1:n+r/2+f/2,y:l+1-t,bow:-1-s,width:1.2+1.3*s,alpha:.35+.55*s}];return t>.2&&t<.85&&i.push({x0:n-r*.2,x1:n+r*.15,y:l-6+3*t,bow:-2.5,width:1+s,alpha:.5*s}),t>.5&&i.push({x0:n-r*.55-f,x1:n-r*.4-f,y:l+6,bow:-.5,width:1.2,alpha:.45*(1-t)}),i}function pt(e){e.clearRect(0,0,C*b,k),e.lineCap="round",e.strokeStyle="rgb(255, 246, 224)";for(let t=0;t<b;t++){const s=t*C;for(const n of st(t))for(const[l,r]of[[2.2,.3],[1,1]])e.globalAlpha=n.alpha*r,e.lineWidth=n.width*l,e.beginPath(),e.moveTo(s+n.x0,n.y),e.quadraticCurveTo(s+(n.x0+n.x1)/2,n.y+n.bow,s+n.x1,n.y),e.stroke()}e.globalAlpha=1}function yt(e,t,s){const n=o=>(.299*e[o]+.587*e[o+1]+.114*e[o+2])/255,l=new Float32Array(t*s);for(let o=0;o<s;o++){const a=v(.25,.5,o/s);for(let u=0;u<t;u++){const x=(o*t+u)*4;if(e[x+3]<128||a===0)continue;const S=e[x]/255,I=e[x+1]/255,M=e[x+2]/255,A=n(x),E=v(0,.08,M-S)*v(-.12,0,M-I+.06)*v(.2,.35,A),d=[[2,0],[-2,0],[0,2],[0,-2]].map(([p,T])=>{const m=Math.min(t-1,Math.max(0,u+p)),h=Math.min(s-1,Math.max(0,o+T));return n((h*t+m)*4)}),W=Math.abs(A-(d[0]+d[1]+d[2]+d[3])/4);l[o*t+u]=E*a*(.55+.45*v(.12,.03,W))}}const r=G(G(l,t,s,3),t,s,3),f=new Uint8Array(t*s),i=[];for(let o=Math.floor(s*.85);o<s;o++)for(let a=0;a<t;a++)r[o*t+a]>.22&&(f[o*t+a]=1,i.push(o*t+a));for(;i.length;){const o=i.pop(),a=o%t,u=(o-a)/t;for(const x of[a>0?o-1:-1,a<t-1?o+1:-1,u>0?o-t:-1,u<s-1?o+t:-1])x>=0&&!f[x]&&r[x]>.22&&(f[x]=1,i.push(x))}const c=new Uint8ClampedArray(t*s);for(let o=0;o<c.length;o++)c[o]=f[o]?Math.round(255*v(.22,.42,r[o])):0;return c}function v(e,t,s){const n=Math.min(1,Math.max(0,(s-e)/(t-e)));return n*n*(3-2*n)}function G(e,t,s,n){const l=new Float32Array(e.length),r=new Float32Array(e.length);for(let f=0;f<s;f++)for(let i=0;i<t;i++){let c=0,o=0;for(let a=-n;a<=n;a++){const u=i+a;u>=0&&u<t&&(c+=e[f*t+u],o++)}l[f*t+i]=c/o}for(let f=0;f<s;f++)for(let i=0;i<t;i++){let c=0,o=0;for(let a=-n;a<=n;a++){const u=f+a;u>=0&&u<s&&(c+=l[u*t+i],o++)}r[f*t+i]=c/o}return r}export{V as C,C as G,ct as T,Y as W,ft as a,mt as b,X as c,xt as d,it as e,b as f,yt as g,k as h,pt as i,ht as j,lt as k,rt as l,ut as w};
