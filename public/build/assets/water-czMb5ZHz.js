import{s as O}from"./scene-animation-C-gJag00.js";const $=Object.assign({}),X={};let W=null;function pt(){return W??=Promise.all(Object.values($).map(e=>e())).then(e=>Object.assign(X,Object.fromEntries(e.map(t=>[t.id,t])))),W}const d=e=>Math.round(e*1e3)/1e3+0,G="bone:",q=5e-4,xt=3,k={thigh:45,shin:120,share:607/1475},H=.5;function V(e={},t=null){const a=e.thigh_n?(e.thigh_n[1]-e.thigh_n[0])/k.thigh:1,o=e.shin_n?e.shin_n[1]/k.shin:1,i=t>0?t/k.share:1;return{travel:Math.min(1,Math.max(0,a))*i,sink:Math.min(1,Math.max(0,o))*i}}function mt(e=[]){const t=Object.fromEntries(e.map(s=>[s.name,s])),a=s=>s?.to?Math.hypot(s.to[0]-s.from[0],s.to[1]-s.from[1]):0,o=a(t.thigh_n)+a(t.shin_n),i=t.foot_n?.to&&t.head?.to?Math.max(t.foot_n.to[1],t.foot_n.from[1])-t.head.to[1]:0;return o>0&&i>0?o/i:null}const Y="calm",z=(e,{length:t=null,speed:a=1}={})=>{const o=e.duration/Math.max(.1,a);if(!e.loop)return{cycles:1,cycle:t??o};const i=Math.max(1,Math.round((t??o)/o));return{cycles:i,cycle:(t??o)/i}};function dt(e,{start:t=0,length:a=null,speed:o=1,bones:i=[],facing:s=1,x0:f=.5,y0:c=0,r0:r=0,xPerHeight:n=0,yPerHeight:l=0,limits:u={},legShare:h=null}={}){const T=V(u,h),{cycles:A,cycle:I}=z(e,{length:a,speed:o}),S=e.keys.some(x=>Math.abs(x.dx??0)>q)||Math.abs(e.travel??0)>1e-6,L=e.keys.some(x=>Math.abs(x.bob??0)>1e-6),b=e.keys.some(x=>Math.abs(x.rot??0)>1e-6),M=new Set(i),m=[];let v=null;for(let x=0;x<A;x++)e.keys.forEach((p,y)=>{if(x>0&&y===0)return;const E={t:d(t+(x+p.t)*I),ease:"smooth"};for(const[R,D]of Object.entries(p))R.startsWith(G)&&M.has(R.slice(G.length))&&(E[R]=d(D*s));S&&(E.x=d(f+s*(x*(e.travel??0)+(p.dx??0))*T.travel*n)),L&&(E.y=d(c+(p.bob??0)*(p.bob<0?T.sink:1)*l)),b&&(E.rotation=d(r+(p.rot??0)*s)),p.face&&p.face!==v&&(E.face=v=p.face),p.contact&&(E.contact=p.contact),m.push(E)});if(e.loop&&m.length){const x=m[m.length-1],p={t:d(x.t+Math.min(H,I/2))};for(const y of Object.keys(x))y.startsWith(G)&&(p[y]=0);S&&(p.x=x.x),L&&(p.y=d(c)),b&&(p.rotation=d(r)),e.keys.some(y=>y.contact)&&(p.contact="none"),m.push(p)}return m.length&&delete m[m.length-1].ease,m}const B=e=>new Set(e.flatMap(t=>Object.keys(t)).filter(t=>t!=="t"&&t!=="ease"));function _t(e,t,{inPlace:a=!1}={}){if(a&&(e??[]).some(r=>Number.isFinite(r.x))&&(t=t.map(({x:r,...n})=>n)),!t.length)return[...e??[]];const o=B(t),i=t[0].t-1e-6,s=t[t.length-1].t+1e-6,c=(e??[]).flatMap(r=>{if(r.t<i||r.t>s)return[r];const n=Object.fromEntries(Object.entries(r).filter(([l])=>!o.has(l)));return Object.keys(n).some(l=>l!=="t"&&l!=="ease")?[n]:[]}).map(r=>({...r}));for(const r of t){const n=c.find(l=>O(l.t,r.t));n?Object.assign(n,r):c.push({...r})}if(o.has("face")){const r=(e??[]).filter(n=>n.face&&n.t<i).sort((n,l)=>n.t-l.t).pop()?.face??Y;c.find(n=>O(n.t,t[t.length-1].t)).face=r}return c.sort((r,n)=>r.t-n.t)}const _=8,w=4,U=8,Z=.5,J=.45,N={amount:[0,3],speed:[0,3],glints:[0,3],loop:[2,12]},j={quiet:{amount:.45,speed:.6,glints:.45,loop:6,twinkle:.12,size:.85,stretch:3},anime:{amount:.9,speed:.9,glints:1,loop:4,twinkle:.35,size:1.1,stretch:4.5},lively:{amount:1.6,speed:1.4,glints:1.9,loop:4,twinkle:1,size:1.2,stretch:3.5}},Q="anime",P=(e,[t,a],o)=>typeof e=="number"&&Number.isFinite(e)?Math.min(a,Math.max(t,e)):o;function Tt(e){const t=e?.water;if(!t||typeof t!="object"||t.on===!1)return null;const a=t.look&&t.look in j?t.look:Q,o=j[a];return{look:a,amount:P(t.amount,N.amount,o.amount),speed:P(t.speed,N.speed,o.speed),glints:P(t.glints,N.glints,o.glints),loop:P(t.loop,N.loop,o.loop),twinkle:o.twinkle,size:o.size,stretch:o.stretch,mask:typeof t.mask=="string"&&t.mask?t.mask:null}}const tt=(e,t)=>t>0?Math.max(1,Math.round(e*t*Z)):0,bt=(e,t)=>2*Math.PI*tt(e,t)/e,Et=e=>Math.max(1,Math.round(e*U/_))*_/e,et=1536,ot=26,nt=30,at=1.9,st=Math.log(5),it=44,rt=2.2,ct=1.3,lt=4,ft=.32;function yt(e,t,a,o=1){for(let i=0;i<a;i++)for(let s=0;s<t;s++)if(e[(i*t+s)*o]>127)return i/a;return 1}const gt=`
  uniform float water, waterAmt, waterW, waterLoop, waterRate, waterGlints, waterCalm, waterTop, waterTwinkle, waterSize, waterStretch;
  uniform sampler2D waterMask;
  uniform sampler2D glintTex;
  #define WAVE_PX ${ot.toFixed(1)}
  #define RIPPLE_NPX ${nt.toFixed(1)}
  #define RIPPLE_PER_BAND ${at.toFixed(2)}
  #define PIC_W ${et.toFixed(1)}
  #define GLINT_FRAMES ${_.toFixed(1)}
  #define GLINT_VARIANTS ${w.toFixed(1)}
  #define GLINT_K ${st.toFixed(5)}
  #define GLINT_NPX ${it.toFixed(1)}
  #define CELL_ASPECT ${rt.toFixed(2)}
  #define SPRITE_W ${ct.toFixed(2)}
  #define SHEET_ASPECT ${lt.toFixed(1)}
  #define GLINT_DENSITY ${ft.toFixed(3)}
  #define TWINKLES_ACROSS 14.0
  #define TWINKLE_S ${J.toFixed(2)}
  // the mask is read at the picture's uv and repeats as the picture does (a far strip drawn twice: mirrored)
  float maskAt(vec2 p) { return texture2D(waterMask, vec2(p.x, clamp(p.y, 0.0, 1.0))).r; }
  float waterSpan() { return max(1.0 - waterTop, 0.05); }
  float picH() { return PIC_W * texPx.y / texPx.x; }
  float depthOf(float v) { return clamp((v - waterTop) / waterSpan(), 0.0, 1.0); }
  float bandY(float d, float s) { return waterSpan() / (s * GLINT_K) * (exp(GLINT_K) - exp(GLINT_K * (1.0 - d))); }
  float bandD(float y, float s) { return 1.0 - log(max(exp(GLINT_K) - y * s * GLINT_K / waterSpan(), 0.001)) / GLINT_K; }
  vec2 waterOff(vec2 uv, float th, float m) {
    float d = depthOf(uv.y);
    vec2 p = vec2(uv.x * PIC_W / (WAVE_PX * waterStretch), bandY(d, RIPPLE_NPX / picH()) * RIPPLE_PER_BAND);
    float f = 0.5 * sin(p.x * 0.9 + p.y * 0.35 - th + 1.0) + 0.35 * sin(-p.x * 0.6 + p.y * 0.55 - 2.0 * th + 2.3) + 0.25 * sin(p.x * 1.7 - p.y * 0.2 - 3.0 * th + 4.1);
    float g = 0.5 * sin(p.x * 1.1 - p.y * 0.45 - th + 0.4) + 0.3 * sin(p.y * 0.7 - 2.0 * th + 5.0);
    float n1 = vnoise(p * 0.25 + 1.6 * vec2(cos(th), sin(th))) - 0.5;
    float n2 = vnoise(p * 0.6 + vec2(23.0, 0.0) + 1.1 * vec2(cos(1.0 - 2.0 * th), sin(1.0 - 2.0 * th))) - 0.5;
    float near = waterAmt * m * (0.25 + 0.75 * d);
    return near * vec2(0.0035 * (0.6 * f + 1.4 * (n1 + 0.6 * n2)), 0.0012 * (0.5 * g + 1.2 * (n2 - 0.4 * n1)));
  }
  // the glints: the cells of this band and the bands above and below it, each glint its own place, length, cel and phase
  float glintAt(vec2 uv, float tl) {
    float s = GLINT_NPX * waterSize / picH();
    float b0 = floor(bandY(depthOf(uv.y), s));
    float best = 0.0;
    for (int bj = -1; bj <= 1; bj++) {
      float b = b0 + float(bj);
      if (b < 0.0) continue;
      float dc = bandD(b + 0.5, s);
      if (dc > 1.2) continue;
      float h = s * exp(GLINT_K * (min(dc, 1.0) - 1.0));
      float vc = waterTop + dc * waterSpan();
      float cw = CELL_ASPECT * h * texPx.y / texPx.x;
      float xo = hash(vec2(b, 7.1)) * 13.0;
      float xq = uv.x / cw + xo;
      float i0 = floor(xq);
      for (int ij = -1; ij <= 1; ij++) {
        vec2 id = vec2(i0 + float(ij), b);
        float hp = hash(id);
        if (hp > waterGlints * GLINT_DENSITY * 1.5) continue;
        vec2 c = vec2(id.x + 0.5 + 0.6 * (hash(id + 1.7) - 0.5), vc + 0.7 * (hash(id + 2.9) - 0.5) * h);
        vec2 at = vec2((c.x - xo) * cw, c.y);
        float mc = maskAt(at);
        if (mc < 0.5) continue;
        vec4 under = tap(at);
        float light = under.a > 0.01 ? smoothstep(0.3, 0.8, lum(under.rgb / under.a)) : 0.0;
        if (hp > waterGlints * GLINT_DENSITY * (0.25 + 1.25 * light)) continue;
        float sw = SPRITE_W * (0.55 + 0.7 * hash(id + 4.3));
        vec2 l = vec2((xq - c.x) / sw, (uv.y - c.y) * SHEET_ASPECT / (sw * cw * texPx.x / texPx.y));
        if (hash(id + 5.3) > 0.5) l.x = -l.x;
        if (abs(l.x) > 0.48 || abs(l.y) > 0.48) continue;
        float pick = hash(id + 6.1);
        float variant = pick < 0.45 ? 0.0 : pick < 0.7 ? 1.0 : pick < 0.9 ? 2.0 : 3.0;
        float ph = hash(id + 17.3);
        float fr = waterCalm > 0.5 ? floor(ph * GLINT_FRAMES) : floor(mod(tl * waterRate + ph * GLINT_FRAMES, GLINT_FRAMES));
        float a = texture2D(glintTex, vec2((fr + l.x + 0.5) / GLINT_FRAMES, (variant + l.y + 0.5) / GLINT_VARIANTS)).a;
        best = max(best, a * (0.6 + 0.4 * hash(id + 3.1)) * smoothstep(0.5, 0.8, mc));
      }
    }
    return best;
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
    if (hash(id + 47.0) > waterTwinkle * 0.4 * maskAt(at) * (0.2 + 0.8 * bright)) return 0.0;
    float dt = mod(tl - hash(id + 53.0) * waterLoop, waterLoop);
    float e = dt < TWINKLE_S ? pow(sin(3.14159 * dt / TWINKLE_S), 2.0) : 0.0;
    vec2 d = (f - c) * PIC_W / TWINKLES_ACROSS / mix(3.0, 7.0, depthOf(at.y));
    float star = exp(-3.0 * length(d)) + 0.7 * exp(-abs(d.y) * 9.0 - abs(d.x) * 1.1) + 0.7 * exp(-abs(d.x) * 9.0 - abs(d.y) * 1.1);
    return e * min(1.0, star);
  }`,C=96,F=24;function ht(e,t=0){const a=e%_/_,o=Math.sin(Math.PI*(a+.5/_))**.7,i=C/2,s=F/2,f=(c,r,n,l,u,h=-.6)=>({x0:c,x1:r,y:n,bow:h,width:l*1.6,alpha:u});switch(t%w){case 1:{const c=[f(i-6-9*o,i+4+8*o,s+1,1.1+1.2*o,.35+.65*o,-2.5-1.5*o)];return a>=.25&&a<.9&&c.push(f(i+8,i+14+8*o,s-3,.9+o,.6*o,-2)),c}case 2:{const c=4+15*o;return[f(i-c,i+c*.8,s+(a-.5),1.1+1.4*o,.4+.6*o,-.8)]}case 3:{const c=[f(i-1,i+1+2*o,s,1.8+1.8*o,.4+.6*o,0)];return a>=.375&&a<.875&&c.push(f(i+7,i+8.5,s+2,1.6+o,.7*o,0)),c}default:{const c=.5+.7*o,r=2.5+9*a,n=20*c,l=11*c,u=6*c,h=i-(n+l+u+2*r)/2,T=[f(h,h+n,s+.5,1.2+1.3*o,.4+.6*o),f(h+n+r,h+n+r+l,s-.5+a,1.1+1.1*o,.35+.6*o),f(h+n+l+2*r,h+n+l+u+2*r,s+1.5,1+.8*o,.3+.5*o)];return a>=.5&&T.push(f(h-r-2,h-r,s+2,1.2,.5*(1-a),0)),T}}}function It(e){e.clearRect(0,0,C*_,F*w),e.lineCap="round",e.strokeStyle="rgb(255, 246, 224)";for(let t=0;t<w;t++)for(let a=0;a<_;a++){const o=a*C,i=t*F;for(const s of ht(a,t))for(const[f,c]of[[2.2,.3],[1,1]])e.globalAlpha=s.alpha*c,e.lineWidth=s.width*f,e.beginPath(),e.moveTo(o+s.x0,i+s.y),e.quadraticCurveTo(o+(s.x0+s.x1)/2,i+s.y+s.bow,o+s.x1,i+s.y),e.stroke()}e.globalAlpha=1}function St(e,t,a){const o=n=>(.299*e[n]+.587*e[n+1]+.114*e[n+2])/255,i=new Float32Array(t*a);for(let n=0;n<a;n++){const l=g(.25,.5,n/a);for(let u=0;u<t;u++){const h=(n*t+u)*4;if(e[h+3]<128||l===0)continue;const T=e[h]/255,A=e[h+1]/255,I=e[h+2]/255,S=o(h),L=g(0,.08,I-T)*g(-.12,0,I-A+.06)*g(.2,.35,S),b=[[2,0],[-2,0],[0,2],[0,-2]].map(([m,v])=>{const x=Math.min(t-1,Math.max(0,u+m)),p=Math.min(a-1,Math.max(0,n+v));return o((p*t+x)*4)}),M=Math.abs(S-(b[0]+b[1]+b[2]+b[3])/4);i[n*t+u]=L*l*(.55+.45*g(.12,.03,M))}}const s=K(K(i,t,a,3),t,a,3),f=new Uint8Array(t*a),c=[];for(let n=Math.floor(a*.85);n<a;n++)for(let l=0;l<t;l++)s[n*t+l]>.22&&(f[n*t+l]=1,c.push(n*t+l));for(;c.length;){const n=c.pop(),l=n%t,u=(n-l)/t;for(const h of[l>0?n-1:-1,l<t-1?n+1:-1,u>0?n-t:-1,u<a-1?n+t:-1])h>=0&&!f[h]&&s[h]>.22&&(f[h]=1,c.push(h))}const r=new Uint8ClampedArray(t*a);for(let n=0;n<r.length;n++)r[n]=f[n]?Math.round(255*g(.22,.42,s[n])):0;return r}function g(e,t,a){const o=Math.min(1,Math.max(0,(a-e)/(t-e)));return o*o*(3-2*o)}function K(e,t,a,o){const i=new Float32Array(e.length),s=new Float32Array(e.length);for(let f=0;f<a;f++)for(let c=0;c<t;c++){let r=0,n=0;for(let l=-o;l<=o;l++){const u=c+l;u>=0&&u<t&&(r+=e[f*t+u],n++)}i[f*t+c]=r/n}for(let f=0;f<a;f++)for(let c=0;c<t;c++){let r=0,n=0;for(let l=-o;l<=o;l++){const u=f+l;u>=0&&u<a&&(r+=i[u*t+c],n++)}s[f*t+c]=r/n}return s}export{X as C,C as G,xt as T,j as W,_t as a,Q as b,z as c,Et as d,dt as e,gt as f,St as g,_ as h,F as i,w as j,It as k,pt as l,yt as m,Tt as n,mt as o,bt as w};
