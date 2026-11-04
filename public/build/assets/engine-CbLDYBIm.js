import{m as Is,c as Vs,M as lt,S as Ke,R as qn,C as we,T as pe,V as B,E as ie,a as $t,b as Te,P as Ns,d as sn,e as on,f as Jn,g as Us,h as $s,i as Hs,j as Qn,U as Gs,H as Ws,D as js}from"./babylon-DoYGJMOP.js";import{l as Ys}from"./config-DwQUN7uY.js";import{handleCss as Ks}from"./ArtworkOverlay-Do4IbEZ7.js";import{g as At,c as Zs,w as an,h as Xs,e as qs}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-D8-XgaoP.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-fDyyv3qA.js";import"./ambient-CEzLlAaX.js";const $e=new Set;let zt=!1;function Js(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;$e.size&&$e.clear();let a=es(e,0,o,n,!0);const r=[];if(!a||a.next===a.prev)return r;let i=0,c=0,f=0;if(s&&(a=so(e,t,a,n)),e.length>80*n){i=e[0],c=e[1];let h=i,v=c;for(let M=n;M<o;M+=n){const y=e[M],g=e[M+1];y<i&&(i=y),g<c&&(c=g),y>h&&(h=y),g>v&&(v=g)}f=Math.max(h-i,v-c),f=f!==0?32767/f:0}return Ft(a,r,i,c,f),r}function es(e,t,n,s,o){let a=null;if(o===xo(e,t,n,s)>0)for(let r=t;r<n;r+=s)a=cn(r/s|0,e[r],e[r+1],a);else for(let r=n-s;r>=t;r-=s)a=cn(r/s|0,e[r],e[r+1],a);return a&&He(a,a.next)&&(We(a),a=a.next),a}function Se(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&($e.size===0||!$e.has(s))&&(He(s,s.next)||W(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),zt=!0,We(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function Ft(e,t,n,s,o){o&&ho(e,n,s,o);let a=e,r=!1;for(;e.prev!==e.next;){const i=e.prev,c=e.next;if(W(i,e,c)<0&&(o?eo(e,n,s,o):Qs(e))){t.push(i.i,e.i,c.i),We(e),e=c,a=c;continue}if(e=c,e===a){if(zt=!1,e=Se(e),zt){a=e;continue}if(!r){e=to(e,t),a=e,r=!0;continue}no(e,t,n,s,o);break}}}function Qs(e){const t=e.prev,n=e,s=e.next,o=t.x,a=n.x,r=s.x,i=t.y,c=n.y,f=s.y,h=Math.min(o,a,r),v=Math.min(i,c,f),M=Math.max(o,a,r),y=Math.max(i,c,f);let g=s.next;for(;g!==t;){if(g.x>=h&&g.x<=M&&g.y>=v&&g.y<=y&&!(o===g.x&&i===g.y)&&at(o,i,a,c,r,f,g.x,g.y)&&W(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function eo(e,t,n,s){const o=e.prev,a=e,r=e.next,i=o.x,c=a.x,f=r.x,h=o.y,v=a.y,M=r.y,y=Math.min(i,c,f),g=Math.min(h,v,M),x=Math.max(i,c,f),p=Math.max(h,v,M),b=Pt(y,g,t,n,s),F=Pt(x,p,t,n,s);let k=e.prevZ;for(;k&&k.z>=b;){if(k.x>=y&&k.x<=x&&k.y>=g&&k.y<=p&&k!==r&&!(i===k.x&&h===k.y)&&at(i,h,c,v,f,M,k.x,k.y)&&W(k.prev,k,k.next)>=0)return!1;k=k.prevZ}let A=e.nextZ;for(;A&&A.z<=F;){if(A.x>=y&&A.x<=x&&A.y>=g&&A.y<=p&&A!==r&&!(i===A.x&&h===A.y)&&at(i,h,c,v,f,M,A.x,A.y)&&W(A.prev,A,A.next)>=0)return!1;A=A.nextZ}return!0}function to(e,t){let n=e,s=!1;do{const o=n.prev,a=n.next.next;ss(o,n,n.next,a,!1)&&Ge(o,a)&&Ge(a,o)&&(t.push(o.i,n.i,a.i),We(n),We(n.next),n=e=a,s=!0),n=n.next}while(n!==e);return s?Se(n):n}function no(e,t,n,s,o){let a=e;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&mo(a,r)){let i=os(a,r);a=Se(a,a.next),i=Se(i,i.next),Ft(a,t,n,s,o),Ft(i,t,n,s,o);return}r=r.next}a=a.next}while(a!==e)}let _t=!1;function so(e,t,n,s){const o=[];for(let a=0,r=t.length;a<r;a++){const i=t[a]*s,c=a<r-1?t[a+1]*s:e.length,f=es(e,i,c,s,!1);f===f.next&&$e.add(f),o.push(fo(f))}o.sort(oo),ro(e.length/s,t.length),ns(n,n),_t=!0;for(let a=0;a<o.length;a++)n=ao(o[a],n);return _t=!1,Se(n)}function oo(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function ao(e,t){const n=lo(e,t);if(!n)return t;const s=os(n,e),o=s.next;return ns(n,o.next),Se(s,s.next),Se(n,n.next)}const ts=16;let $=new Float64Array(0),ot=0;const Tt=[],Lt=[];function ro(e,t){const n=Math.ceil((e+2*t)/ts)+t+2;$.length<n*4&&($=new Float64Array(n*4)),ot=0}function ns(e,t){let n=e;do{const s=ot++;Tt[s]=n;let o=1/0,a=1/0,r=-1/0,i=-1/0,c=0;do{const h=n.next;n.z=s,n.x<o&&(o=n.x),n.x>r&&(r=n.x),n.y<a&&(a=n.y),n.y>i&&(i=n.y),h.x<o&&(o=h.x),h.x>r&&(r=h.x),h.y<a&&(a=h.y),h.y>i&&(i=h.y),n=h}while(++c<ts&&n!==t);Lt[s]=n;const f=s*4;$[f]=o,$[f+1]=a,$[f+2]=r,$[f+3]=i}while(n!==t)}function io(e,t){const n=e.z*4;t.x<$[n]&&($[n]=t.x),t.y<$[n+1]&&($[n+1]=t.y),t.x>$[n+2]&&($[n+2]=t.x),t.y>$[n+3]&&($[n+3]=t.y)}function rn(e){let t=Lt[e];for(;t.prev.next!==t;)t=t.next;return Lt[e]=t,t}function ln(e){let t=Tt[e];for(;t.prev.next!==t;)t=t.next;return Tt[e]=t,t}function lo(e,t){let n=t;const s=e.x,o=e.y;let a=-1/0,r;if(He(e,n))return n;for(let M=0,y=0;M<ot;M++,y+=4){if(o<$[y+1]||o>$[y+3]||$[y]>s||$[y+2]<=a)continue;const g=rn(M);n=ln(M);do{if(n.prev.next===n){if(He(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const x=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(x<=s&&x>a&&(a=x,r=n.x<n.next.x?n:n.next,x===s))return r}}n=n.next}while(n!==g)}if(!r)return null;const i=r.x,c=r.y,f=Math.min(o,c),h=Math.max(o,c);let v=1/0;for(let M=0,y=0;M<ot;M++,y+=4){if($[y+2]<i||$[y]>s||$[y+3]<f||$[y+1]>h)continue;const g=rn(M);n=ln(M);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&at(o<c?s:a,o,i,c,o<c?a:s,o,n.x,n.y)){const x=Math.abs(o-n.y)/(s-n.x);(Ge(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(x<v||x===v&&(n.x>r.x||n.x===r.x&&co(r,n)))&&(r=n,v=x)}n=n.next}while(n!==g)}return r}function co(e,t){return W(e.prev,e,t.prev)<0&&W(t.next,e,e.next)<0}const re=[];let Ce=[],ke=new Uint32Array(0),De=new Uint32Array(0);const Oe=new Uint32Array(256);function ho(e,t,n,s){let o=e,a=0;do o.z=Pt(o.x,o.y,t,n,s),re[a++]=o,o=o.next;while(o!==e);uo(a);let r=null;for(let i=0;i<a;i++){const c=re[i];c.prevZ=r,r&&(r.nextZ=c),r=c}r.nextZ=null}function uo(e){if(e<=32){for(let t=1;t<e;t++){const n=re[t],s=n.z;let o=t-1;for(;o>=0&&re[o].z>s;)re[o+1]=re[o],o--;re[o+1]=n}return}ke.length<e&&(ke=new Uint32Array(e),De=new Uint32Array(e),Ce=new Array(e));for(let t=0;t<e;t++)ke[t]=re[t].z;Xe(e,re,ke,Ce,De,0),Xe(e,Ce,De,re,ke,8),Xe(e,re,ke,Ce,De,16),Xe(e,Ce,De,re,ke,24)}function Xe(e,t,n,s,o,a){Oe.fill(0);for(let i=0;i<e;i++)Oe[n[i]>>>a&255]++;let r=0;for(let i=0;i<256;i++){const c=Oe[i];Oe[i]=r,r+=c}for(let i=0;i<e;i++){const c=n[i],f=Oe[c>>>a&255]++;s[f]=t[i],o[f]=c}}function Pt(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function fo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function at(e,t,n,s,o,a,r,i){return(o-r)*(t-i)>=(e-r)*(a-i)&&(e-r)*(s-i)>=(n-r)*(t-i)&&(n-r)*(a-i)>=(o-r)*(s-i)}function mo(e,t){const n=He(e,t)&&W(e.prev,e,e.next)>0&&W(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Ge(e,t)&&Ge(t,e)&&(W(e.prev,e,t.prev)!==0||W(e,t.prev,t)!==0))&&!po(e,t)&&(n||go(e,t))}function W(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function He(e,t){return e.x===t.x&&e.y===t.y}function ss(e,t,n,s,o=!0){const a=W(e,t,n),r=W(e,t,s),i=W(n,s,e),c=W(n,s,t);return(a>0&&r<0||a<0&&r>0)&&(i>0&&c<0||i<0&&c>0)?!0:o?!!(a===0&&qe(e,n,t)||r===0&&qe(e,s,t)||i===0&&qe(n,e,s)||c===0&&qe(n,t,s)):!1}function qe(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function po(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let r=e;do{const i=r.next;if(r.x>s&&i.x>s||r.x<n&&i.x<n||r.y>a&&i.y>a||r.y<o&&i.y<o){r=i;continue}if(r.i!==e.i&&i.i!==e.i&&r.i!==t.i&&i.i!==t.i&&ss(r,i,e,t))return!0;r=i}while(r!==e);return!1}function Ge(e,t){return W(e.prev,e,e.next)<0?W(e,t,e.next)>=0&&W(e,e.prev,t)>=0:W(e,t,e.prev)<0||W(e,e.next,t)<0}function go(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const r=n.next;n.y>a!=r.y>a&&o<(r.x-n.x)*(a-n.y)/(r.y-n.y)+n.x&&(s=!s),n=r}while(n!==e);return s}function os(e,t){const n=Ct(e.i,e.x,e.y),s=Ct(t.i,t.x,t.y),o=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,a.next=s,s.prev=a,s}function cn(e,t,n,s){const o=Ct(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function We(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),_t&&io(e.prev,e.next)}function Ct(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function xo(e,t,n,s){let o=0;for(let a=t,r=n-s;a<n;a+=s)o+=(e[r]-e[a])*(e[a+1]+e[r+1]),r=a;return o}Object.assign(window,{BABYLON:{...Vs,...Is},earcut:Js});(()=>{const e=`
    uniform sampler2D depthSampler;
    uniform sampler2D normalSampler;
    uniform mat4 invView;
    uniform vec2 tanHalf;      // tan(fov/2) for x and y
    uniform vec2 resolution;
    uniform float skyDepth;    // metres used where nothing was drawn

    float depthAt(vec2 uv) { float d = texture2D(depthSampler, uv).r; return d > 0.0 ? d : skyDepth; }
    vec3 worldAt(vec2 uv, float d) {
      vec3 v = vec3((uv * 2.0 - 1.0) * tanHalf * d, d);   // Babylon view space: +z looks forward
      return (invView * vec4(v, 1.0)).xyz;
    }
    float pixelSize(float d) { return d * 2.0 * tanHalf.y / resolution.y; } // metres covered by one pixel

    vec3 hash3(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }
    float perlin(vec3 p) {                                   // gradient noise, about -0.7..0.7
      vec3 i = floor(p), f = fract(p);
      vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      return mix(mix(mix(dot(hash3(i), f), dot(hash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
                     mix(dot(hash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(hash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
                 mix(mix(dot(hash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(hash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
                     mix(dot(hash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(hash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y), u.z);
    }
    // fbm in world metres; 'scale' = size of the largest feature, 'ps' = pixel size in metres
    float fbm3o(vec3 w, float scale, float ps, float octaves) {
      vec3 p = w / scale;
      float s = 0.0, a = 0.5, f = 1.0, norm = 0.0;
      for (int i = 0; i < 6; i++) {
        if (float(i) >= octaves) break;
        float keep = smoothstep(2.0, 6.0, (scale / f) / ps);  // drop octaves finer than a few pixels
        s += a * keep * perlin(p * f);
        norm += a;
        f *= 2.07; a *= 0.5;
      }
      return s / norm * 2.0;                                   // roughly -1..1
    }
    float fbm3(vec3 w, float scale, float ps) { return fbm3o(w, scale, ps, 6.0); }
    float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    // the sheet itself: a ragged paper border fixed to the frame (the picture's edge, not a texture on it);
    // 1 = picture, 0 = bare paper
    float paperMask(vec2 uv, float edge) {
      if (edge <= 0.0) return 1.0;
      float aspect = resolution.x / resolution.y;
      float e = min(min(uv.x * aspect, (1.0 - uv.x) * aspect), min(uv.y, 1.0 - uv.y));
      float rag = edge * (0.02 + 0.03 * (0.5 + 0.5 * perlin(vec3(uv * resolution / 14.0, 0.0))));
      return smoothstep(rag, rag + 0.004, e);
    }
    const vec3 PAPER_WHITE = vec3(0.95, 0.94, 0.91);`;BABYLON.Effect.ShadersStore.washFragmentShader=`
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec2 texel;
    uniform float radius;
    ${e}
    void main(void) {
      vec2 uv = vUV;
      int r = int(radius);
      if (r < 1) { gl_FragColor = texture2D(textureSampler, uv); return; }
      vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
      vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
      for (int j = -5; j <= 5; j++) {
        for (int i = -5; i <= 5; i++) {
          if (i < -r || i > r || j < -r || j > r) continue;
          vec3 c = texture2D(textureSampler, uv + vec2(float(i), float(j)) * texel).rgb;
          vec3 cc = c * c;
          if (i <= 0 && j <= 0) { m0 += c; s0 += cc; }
          if (i >= 0 && j <= 0) { m1 += c; s1 += cc; }
          if (i <= 0 && j >= 0) { m2 += c; s2 += cc; }
          if (i >= 0 && j >= 0) { m3 += c; s3 += cc; }
        }
      }
      float n = float((r + 1) * (r + 1));
      m0 /= n; m1 /= n; m2 /= n; m3 /= n;
      float v0 = dot(abs(s0 / n - m0 * m0), vec3(1.0));
      float v1 = dot(abs(s1 / n - m1 * m1), vec3(1.0));
      float v2 = dot(abs(s2 / n - m2 * m2), vec3(1.0));
      float v3 = dot(abs(s3 / n - m3 * m3), vec3(1.0));
      vec3 best = m0; float bv = v0;
      if (v1 < bv) { best = m1; bv = v1; }
      if (v2 < bv) { best = m2; bv = v2; }
      if (v3 < bv) { best = m3; bv = v3; }
      gl_FragColor = vec4(best, 1.0);
    }`,BABYLON.Effect.ShadersStore.inkFragmentShader=`
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;   // finished watercolour
    uniform sampler2D washSampler;      // clean wash, for colour edges
    uniform vec2 texel;
    uniform float ink;
    uniform float width;
    uniform float colorInk;
    uniform float nearDist;
    uniform float farInk;
    uniform float wobble;
    uniform float darkness;             // 1 = true black lines
    uniform float outline;              // silhouette weight relative to inner lines
    uniform float paperEdge;
    uniform float inkOpacity;
    uniform float inkBlend;             // 0 normal, 1 multiply, 2 pencil
    uniform float paintOver;            // 0 = lines keep their own colour, 1 = the wash tints them
    uniform vec3 inkColor;
    uniform sampler2D animeSampler;     // blue = an anime actor (anime-cast.ts), whose lines are its own
    ${e}
    float geoEdge(vec2 uv, vec2 o, float d, vec3 nC, out float sil) {
      float crease = 0.0;
      sil = 0.0;
      vec2 offs[4];
      offs[0] = vec2(o.x, 0.0); offs[1] = vec2(-o.x, 0.0); offs[2] = vec2(0.0, o.y); offs[3] = vec2(0.0, -o.y);
      for (int k = 0; k < 4; k++) {
        float dr = texture2D(depthSampler, uv + offs[k]).r;
        float dk = dr > 0.0 ? dr : skyDepth;
        vec3 nk = texture2D(normalSampler, uv + offs[k]).rgb;
        sil = max(sil, smoothstep(0.03, 0.08, abs(dk - d) / min(d, dk)));      // object against what is behind it
        crease = max(crease, smoothstep(0.35, 0.8, length(nk - nC)));          // the surface turns a corner
      }
      return crease;
    }
    void main(void) {
      vec3 col = texture2D(textureSampler, vUV).rgb;
      float d0 = depthAt(vUV);
      vec3 w0 = worldAt(vUV, d0);
      float ps0 = pixelSize(d0);
      // hand-drawn line: the edge is looked for at a point displaced by smooth world noise
      vec2 suv = vUV + vec2(fbm3o(w0, 1.5, ps0, 2.0), fbm3o(w0 + 17.0, 1.5, ps0, 2.0)) * wobble * 3.0 * texel;
      float raw = texture2D(depthSampler, suv).r;
      float d = depthAt(suv);
      float near = raw > 0.0 ? clamp(nearDist / d, 0.0, 1.0) : 0.0;
      vec2 o = texel * mix(0.6, width, near);              // comic-book weight: thinner far away
      vec3 nC = texture2D(normalSampler, suv).rgb;

      float silThin, silWide;
      float crease = geoEdge(suv, o, d, nC, silThin);
      geoEdge(suv, o * outline, d, nC, silWide);            // silhouettes get the heavier pen
      float sil = max(silThin, silWide);

      float tl = lum(texture2D(washSampler, suv + vec2(-o.x,  o.y)).rgb);
      float t  = lum(texture2D(washSampler, suv + vec2( 0.0,  o.y)).rgb);
      float tr = lum(texture2D(washSampler, suv + vec2( o.x,  o.y)).rgb);
      float l  = lum(texture2D(washSampler, suv + vec2(-o.x,  0.0)).rgb);
      float r  = lum(texture2D(washSampler, suv + vec2( o.x,  0.0)).rgb);
      float bl = lum(texture2D(washSampler, suv + vec2(-o.x, -o.y)).rgb);
      float b  = lum(texture2D(washSampler, suv + vec2( 0.0, -o.y)).rgb);
      float br = lum(texture2D(washSampler, suv + vec2( o.x, -o.y)).rgb);
      float sob = smoothstep(0.2, 0.5, length(vec2(-tl - 2.0 * l - bl + tr + 2.0 * r + br, -bl - 2.0 * b - br + tl + 2.0 * t + tr)));

      float pen = 0.85 + 0.15 * fbm3(w0, 0.25, ps0);        // pen pressure along the line
      float strength = ink * mix(farInk, 1.0, near) * pen;
      float hard = clamp(max(sil, crease), 0.0, 1.0) * strength;     // model lines: real black
      float soft = clamp(sob * colorInk, 0.0, 1.0) * strength * 0.6; // lines inside images: lighter
      vec3 ownColor = mix(inkColor, vec3(0.02, 0.02, 0.025), darkness);
      float a = clamp(hard + soft * (1.0 - hard), 0.0, 1.0) * inkOpacity;
      // inside an anime actor (all neighbours anime too) no post ink: only its silhouette may be inked
      float animeIn = min(min(texture2D(animeSampler, suv + vec2(o.x, 0.0)).b, texture2D(animeSampler, suv - vec2(o.x, 0.0)).b),
                          min(texture2D(animeSampler, suv + vec2(0.0, o.y)).b, texture2D(animeSampler, suv - vec2(0.0, o.y)).b));
      a *= 1.0 - animeIn;
      // graphite: greyer, broken up by the paper tooth (world-anchored grain that fades out far away)
      if (inkBlend > 1.5) {
        ownColor = mix(ownColor, vec3(0.30, 0.30, 0.33), 0.45);
        a *= smoothstep(-0.55, 0.25, fbm3(w0 + 41.0, 0.03, ps0));
      }
      vec3 outC;
      if (inkBlend < 0.5) {
        // normal: the line is painted on top; with paint-over it takes a deep version of the wash colour
        outC = mix(col, mix(ownColor, col * 0.28, paintOver), a);
      } else {
        // multiply / pencil: the line darkens what is under it, as graphite does under a watercolour wash;
        // paint-over keeps the hue of the wash in the line instead of neutral grey
        vec3 factor = mix(ownColor, vec3(0.28), paintOver);
        outC = col * mix(vec3(1.0), factor, a);
      }
      gl_FragColor = vec4(mix(PAPER_WHITE, outC, paperMask(vUV, paperEdge)), 1.0); // the border covers the lines too
    }`,BABYLON.Effect.ShadersStore.watercolorFragmentShader=`
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform sampler2D aquarelSampler;
    uniform vec2 texel;
    uniform float useTex;
    uniform float texScale;
    uniform float texAmount;
    uniform float blendMode;
    uniform float stains;
    uniform float blooms;
    uniform float dark;
    uniform float wetEdge;
    uniform float granulation;
    uniform float palette;
    uniform float paletteMode;
    uniform float paper;
    uniform float paperEdge;
    ${e}
    vec3 blendWith(vec3 base, vec3 t, float mode) {
      if (mode < 0.5) return base * t;
      if (mode < 1.5) return mix(2.0 * base * t, 1.0 - 2.0 * (1.0 - base) * (1.0 - t), step(0.5, base));
      return mix(2.0 * base * t + base * base * (1.0 - 2.0 * t), sqrt(base) * (2.0 * t - 1.0) + 2.0 * base * (1.0 - t), step(0.5, t));
    }
    vec3 ramp(float l, float mode) {
      vec3 a, b, c;
      if (mode < 1.5) { a = vec3(0.08, 0.12, 0.20); b = vec3(0.23, 0.35, 0.49); c = vec3(0.88, 0.91, 0.93); }
      else { a = vec3(0.18, 0.12, 0.08); b = vec3(0.52, 0.40, 0.28); c = vec3(0.95, 0.91, 0.82); }
      return l < 0.5 ? mix(a, b, smoothstep(0.0, 0.5, l)) : mix(b, c, smoothstep(0.5, 1.0, l));
    }
    // your own texture, projected onto surfaces from three sides in world space (no UVs, no screen)
    vec3 triplanar(vec3 w, vec3 n) {
      vec3 bw = pow(abs(n), vec3(4.0));
      bw /= max(bw.x + bw.y + bw.z, 1e-4);
      return texture2D(aquarelSampler, w.zy / texScale).rgb * bw.x
           + texture2D(aquarelSampler, w.xz / texScale).rgb * bw.y
           + texture2D(aquarelSampler, w.xy / texScale).rgb * bw.z;
    }
    void main(void) {
      vec3 c = texture2D(textureSampler, vUV).rgb;
      float lc = lum(c);
      float d = depthAt(vUV);
      vec3 w = worldAt(vUV, d);
      float ps = pixelSize(d);
      // surface pigment belongs to surfaces: the far sky dome (a painted wash already) gets none of it,
      // otherwise metre-scale noise shrinks to speckles 500 m away
      float surf = 1.0 - smoothstep(150.0, 320.0, d);

      // wet edges: pigment pools at the rim of a wash (an image-space edge effect; it follows edges, not the frame)
      float lb = 0.0;
      for (int k = 0; k < 8; k++) {
        float a = float(k) * 0.785398;
        lb += lum(texture2D(textureSampler, vUV + vec2(cos(a), sin(a)) * texel * 5.0).rgb);
      }
      lb /= 8.0;
      // only real colour edges pool pigment; small noise-level differences must not draw lines
      c *= 1.0 - wetEdge * 0.4 * smoothstep(0.05, 0.18, lb - lc);

      // pigment stains: big, smooth, and mostly LIGHTER (paper showing through a thinner wash),
      // only 3 octaves so a wash never looks dirty or mottled
      float sn = fbm3o(w, 6.0, ps, 3.0);
      vec3 paperC = vec3(0.96, 0.95, 0.92);
      c = mix(c, paperC, surf * stains * 0.22 * max(sn, 0.0));
      c *= 1.0 - surf * stains * 0.08 * max(-sn, 0.0);

      // blooms: soft, very large lighter patches where the wash ran wetter. No rims: contour rims of noise
      // draw vein-like lines across every surface.
      float bn = fbm3o(w + 31.0, 14.0, ps, 2.0);
      c = mix(c, paperC, surf * blooms * 0.18 * smoothstep(0.15, 0.6, bn));

      // dark pigment: where the wash went on thicker, the same hue goes deeper and a little richer.
      // A soft ramp over the noise (no threshold line), so it reads as pooled pigment, not a stain.
      float dn = fbm3o(w + 53.0, 4.0, ps, 3.0);
      float pool = smoothstep(0.05, 0.55, -dn);
      vec3 deeper = mix(vec3(lum(c)), c, 1.3) * 0.68;
      c = mix(c, clamp(deeper, 0.0, 1.0), surf * dark * 0.65 * pool);

      // granulation: fine pigment grain, only in darker washes, small amplitude
      c *= 1.0 + surf * granulation * 0.18 * fbm3(w + 7.0, 0.12, ps) * (1.0 - lc);

      // paper fibre, faint
      c *= 1.0 + paper * 0.05 * fbm3(w + 3.0, 0.035, ps);

      // optional aquarelle texture (your scan or a ChatGPT image), triplanar in world space
      if (useTex > 0.5) {
        vec3 nV = texture2D(normalSampler, vUV).rgb;
        vec3 nW = normalize((invView * vec4(nV, 0.0)).xyz + vec3(1e-4));
        vec3 t = triplanar(w, nW);
        vec3 tb = blendMode < 0.5 ? t : clamp(t - 0.40, 0.0, 1.0);
        c = mix(c, blendWith(c, tb, blendMode), texAmount);
      }

      if (paletteMode > 0.5) c = mix(c, ramp(lum(c), paletteMode), palette);

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`})();const vo=new WeakMap;function yo(e){return vo.get(e)?.rtt??null}const wo=450,hn=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],un=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],dn={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},bo={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function ko(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),r=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(k=>k.name!=="sky-cloud"&&!(k.metadata&&k.metadata.noGBuffer)))}),i=a.getGBuffer().textures,c=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],f=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=k=>new BABYLON.Vector2(1/k.width,1/k.height),v=new BABYLON.Matrix,M=["invView","tanHalf","resolution","skyDepth"],y=["depthSampler","normalSampler"];function g(k,A){t.getViewMatrix().invertToRef(v);const N=Math.tan(t.fov/2);k.setMatrix("invView",v),k.setVector2("tanHalf",new BABYLON.Vector2(N*A.width/A.height,N)),k.setVector2("resolution",new BABYLON.Vector2(A.width,A.height)),k.setFloat("skyDepth",wo),k.setTexture("depthSampler",c),k.setTexture("normalSampler",f)}const x=new BABYLON.PostProcess("wash","wash",["texel","radius",...M],y,1,t);x.onApply=k=>{g(k,x),k.setVector2("texel",h(x)),k.setFloat("radius",n.num("wash"))};const p=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...hn,...M],["aquarelSampler",...y],1,t);p.onApply=k=>{g(k,p),k.setVector2("texel",h(p));const A=n.texture();k.setFloat("useTex",A?1:0),k.setTexture("aquarelSampler",A||s),hn.forEach(N=>k.setFloat(N,n.num(N)))};const b=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...un,...M],["washSampler","animeSampler",...y],1,t);b.onApply=k=>{g(k,b),k.setTextureFromPostProcessOutput("washSampler",x),k.setTexture("animeSampler",yo(e)||o),k.setVector2("texel",h(b)),un.forEach(A=>k.setFloat(A,n.num(A))),k.setColor3("inkColor",BABYLON.Color3.FromArray(dn[n.inkColor()]||dn["blue-grey"]))};const F=[x,p,b];return{dispose(){F.forEach(k=>k.dispose(t)),e.onBeforeRenderObservable.remove(r),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const Q={sky:380,bg:70,mid:22,fg:7,near:3.5},O={x:0,y:1.6,z:0,fov:50},ct=-2,as=16/9,rs=.42,mt=1.6,Mo=3,is=e=>Mo*de(e),So=(e,t)=>t*e,Eo=(e,t,n,s)=>So(e,t)-(1-s)*n,je=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Ao=999,zo=1e3,Fo=.02,ls=2,Ht=120,cs=.05,ue=e=>e>Math.PI?e*Math.PI/180:e,de=(e,t=O.fov,n=as)=>2*e*Math.tan(ue(t)/2)*n;function fn(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const mn=e=>e.z??Q[e.depth],_o=e=>Math.min(1,Math.max(0,(e-Q.mid)/(Q.bg-Q.mid)));function Dt(e,t){return e<=Q.bg||t===0?_o(e)*t:O.y+(t-O.y)*e/Q.bg}const To=(e,t)=>t?e+t.h*(1-t.top):e,Lo=["ground","path","field","ramp","water"],Me=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Lo.includes(t)),Po=2,Ot=e=>Me(e)&&e.w/Math.max(1,e.h)>=Po,hs=(e,t,n,s)=>Math.min(0,Eo(e,t,n,s)),pn=[2,2e3],Co=4,gn=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??O.z,n?.to?.z??O.z),O.z);function Do(e,t,n,s,o,a,r=O.z){const i=ye({...e},t),c=Math.min(pn[1],Math.max(pn[0],i.z??e.z)),f=Math.max(c,r+Co),h=is(f)/s,v=o*h*i.scale;return{z:f,h:v,w:s*h*i.scale,sx:h*i.scale,sy:h*i.scale,x:(i.x-.5)*de(f),y:hs(f,n,v,a),alphaIndex:je(c),opacity:i.opacity}}const us=(e,t)=>!!e.flat||t.layer==="ground";function Re(e,t,n,s=0,o=s){const a=t.depth,r=mn(t)-n*cs,i=de(r),c=a==="sky"?n*2+1:je(r);if(e.layer==="sky"){const p=i*mt,b=p/as,F=-b*.12+(t.y??0);if(e.tileable_x)return{x:0,y:F,z:r,w:p,h:b,uRepeat:p/(b*(e.w/e.h)),alphaIndex:c,rotation:0};const k=Math.max(p/e.w,b/e.h);return{x:0,y:F,z:r,w:e.w*k,h:e.h*k,uRepeat:1,alphaIndex:c,rotation:0}}const f=e.layer==="bg"&&!e.tileable_x?i*mt*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),f),v=h*(e.w/e.h),M=e.tileable_x?Math.max(v,i*mt):v,y=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?a==="bg"?s:0:Me(e)?0:Dt(mn(t),o),x=a==="sky"?r*Math.tan(ue(O.fov)/2)*.45:g;return{x:y,y:x+(t.y??0),z:r,w:M,h,uRepeat:e.tileable_x?M/v:1,alphaIndex:c,rotation:t.rotation??0}}function Oo(e,t,n=0,s=rs,o=ct){const a=.5/Math.tan(ue(O.fov)/2),r=.5+a*Math.tan(-o*Math.PI/180),i=Q.bg-n*cs,c=O.y+(r-s)*i/a;return Math.round((c-t*(1-e))*10)/10}const Je=e=>e-Ro,Ro=.002,xn={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},ds=(e,t)=>(xn[e??"inOut"]??xn.inOut)(Math.min(1,Math.max(0,t))),Ne=(e,t,n)=>e+(t-e)*n,Gt=e=>e.dur_s??(e.camera&&Go(e)||e.est_s||8);function Wt(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function jt(e,t,n){if(!e)return{...O,fov:ue(O.fov)};const s=ds(e.ease,n>0?t/(e.dur_s??n):1),o={...O,...e.from},a={...o,...e.to};return{x:Ne(o.x,a.x,s),y:Ne(o.y,a.y,s),z:Ne(o.z,a.z,s),fov:Ne(ue(o.fov),ue(a.fov),s)}}const Bo=["x","y","z","scale","opacity","rotation"];function ye(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const a of Bo){const r=s.filter(M=>M[a]!==void 0).sort((M,y)=>M.t-y.t);if(!r.length)continue;const i=r[0],c=r[r.length-1];if(t<=i.t){o[a]=i[a];continue}if(t>=c.t){o[a]=c[a];continue}const f=r.findIndex(M=>M.t>t),h=r[f-1],v=r[f];o[a]=Ne(h[a],v[a],ds("inOut",(t-h.t)/(v.t-h.t)))}return o}const Io={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},fs=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function vn(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??fs(e),amount:n.amount??1,speed:n.speed??1}}const Vo=.25,No=2e3,Uo=250,ze={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},yn={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function $o(e,t,n,s){const o=i=>{const c=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:c,lastUp:i===-1?n:e.lastUp,locked:e.locked||c>=ze.lockFlips&&i===1}};if(t<ze.downFps)return s?o(1):{...e,fast:0};if(t<ze.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=ze.upWindows&&n-e.lastChange>=ze.upAfterChangeMs&&n-e.lastUp>=ze.upEveryMs?o(-1):{...e,fast:a}}function Ho(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*Vo)}function Go(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const wn={breath_m:.05,breath_s:7},Wo=1.5;function jo(e,t,n={}){const s=n.breath_m??wn.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??wn.breath_s),a=Math.min(1,t/Wo),r=a*a*(3-2*a);return{...e,x:e.x+s*r*Math.sin(o*t),y:e.y+s*.5*r*Math.sin(2*o*t)}}async function Yo(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const Ko=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function _e(e,t,n){if(t.asset){const r=e.assets.find(i=>i.id===t.asset);if(r)return r}const s=Ko(t.need??t.asset??"");if(!s.length)return null;let o=null,a=[0,0,0];for(const r of[...e.assets].sort((i,c)=>i.id.localeCompare(c.id))){const i=s.filter(f=>r.tags.some(h=>h.toLowerCase()===f)).length;if(!i)continue;const c=[i,n&&r.layer===n?1:0,r.qa?.score??0];(!o||c[0]>a[0]||c[0]===a[0]&&(c[1]>a[1]||c[1]===a[1]&&c[2]>a[2]))&&(o=r,a=c)}return o}const Fe="#f6f5ee",Zo=.22,Xo=(e,t)=>e.layer==="bg"?t.feather??Zo:0,pt=.6,Rt=12;function ms(e,t){const n=t.paper??Fe,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(r=>r.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((r,i)=>r.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const a=_e({...t,assets:o},{asset:s},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function qo(e,t,n,s=.08){return ps(e,t,n,1-s,1)}function ps(e,t,n,s,o){const a=Math.max(0,Math.floor(n*s)),r=Math.min(n,Math.max(a+1,Math.ceil(n*o))),i=[[],[],[]],c=Math.max(1,Math.floor(t*(r-a)/2e4));for(let h=a*t;h<r*t;h+=c){const v=h*4;e[v+3]<200||(i[0].push(e[v]),i[1].push(e[v+1]),i[2].push(e[v+2]))}if(!i[0].length)return null;const f=h=>{const v=[...h].sort((M,y)=>M-y);return v[v.length>>1]/255};return[f(i[0]),f(i[1]),f(i[2])]}const Ue=32,Jo=(e,t,n)=>Array.from({length:Ue},(s,o)=>ps(e,t,n,o/Ue,(o+1)/Ue)),Qo=(e,t)=>e[Math.min(Ue-1,Math.max(0,Math.floor((1-t)*Ue)))]??null;function ea(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=o){const r=a*4;if(e[r+3]<230)continue;const i=(.299*e[r]+.587*e[r+1]+.114*e[r+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((a,r)=>a-r),s[s.length>>1])}function ta(e,t,n){const s=[];for(let o=0;o<t;o++)for(let a=0;a<n;a++)if(e[(a*t+o)*4+3]>128){s.push(a/n);break}return s.length?(s.sort((o,a)=>o-a),s[s.length>>1]):0}function na(e,t,n){for(let s=0;s<n;s++){let o=0;for(let a=0;a<t;a++)e[(s*t+a)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const sa=1.6,oa=.12;function bn(e,t,n,s){const o=e.layer==="figure",a=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),r=a*oa*s/sa;return o?{w:a,d:Math.min(r,a*.5)}:{w:a,d:Math.min(Math.max(r,a*.3),a*3)}}const aa=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Be=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Bt=6;function gs(e,t){const n=t.assets.filter(a=>a.layer==="ground"),s=(e.groundSlots??[]).map(a=>({asset:n.find(r=>r.id===a.asset),from:Math.max(0,Number(a.from_m)||0)})).filter(a=>!!a.asset).sort((a,r)=>a.from-r.from).slice(0,Bt);if(s.length)return s.map((a,r)=>r===0?{...a,from:0}:a);const o=ms(e,t);return o.kind==="asset"?[{asset:o.asset,from:0}]:[]}const ra=(e,t)=>Math.max(0,e.reduce((n,s,o)=>t>=s.from?o:n,0)),Yt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,xs=Yt;ie.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;const ia=[1,2,3,4,5].map(e=>`
    if (slotCount > ${e}.5) { float k${e} = smoothstep(slotFrom[${e}] * 0.85, slotFrom[${e}] * 1.15 + 0.5, dn); c = mix(c, slotTile(tex${e}, slotTiles[${e}]), k${e}); own = mix(own, slotColour[${e}], k${e}); }`).join("");ie.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, tex1, tex2, tex3, tex4, tex5, nearTex;
  uniform float useTex, grain, fadeNear, fadeFar, detail, vary, mixTile, tileScale, wash, grainSize, slotCount;
  uniform float slotFrom[6], slotTiles[6];
  uniform vec3 slotColour[6];   // each slot's own median colour: its far floor fades into it, not into one tint
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${Yt}
  vec3 tileAt(sampler2D t, vec2 uv) { return mix(texture2D(t, uv, 4.0).rgb, texture2D(t, uv).rgb, detail); }
  // one slot's art tiled in world metres; anti-tiling: a second, turned and scaled read of the same tile, swapped in
  // over big soft world patches, so the rows of one repeating tile break up (mixTile 0 = the plain tile)
  vec3 slotTile(sampler2D t, float tl) {
    vec2 uv = vW.xz / (tl * tileScale);
    vec2 uv2 = mat2(0.866, -0.5, 0.5, 0.866) * uv * 1.37 + vec2(0.31, 0.57);
    float m = smoothstep(0.3, 0.7, fbm(vW.xz * 0.06 + 11.0));
    return mix(tileAt(t, uv), tileAt(t, uv2), m * mixTile);
  }
  // the watercolour grain in whole octaves of distance (ground.ts grainOctave): a dot is as big on screen near as far
  float grainAt(float d) {
    float L = log2(max(d, 0.5) / 10.0), o = floor(L);
    float s = 2.7 / exp2(o) / max(0.1, grainSize);
    return mix(fbm(vW.xz * s), fbm(vW.xz * s * 0.5), L - o);
  }
  void main(void) {
    float d = distance(vW.xz, camPos.xz);
    vec3 c = base, own = base;
    if (useTex > 0.5) {
      // near to far, each ground picture from its distance on (set.groundSlots), the borders broken by a world noise
      float dn = d * (1.0 + 0.35 * (fbm(vW.xz * 0.05 + 3.0) - 0.5));
      c = slotTile(tex, slotTiles[0]); own = slotColour[0];${ia}
    }
    // low-frequency value and hue drift over the field (vary), the way a hand wash is never even
    c *= 1.0 + vary * 0.32 * (fbm(vW.xz * 0.022) - 0.5);
    c.rb *= 1.0 + vary * vec2(0.08, -0.08) * (fbm(vW.xz * 0.017 + 7.0) - 0.5);
    // watercolour on the floor: broad wash variation, then fine granulation, both fixed to the world (wash: Watercolour)
    float broad = fbm(vW.xz * 0.18), gran = grainAt(d);
    // pigment pools in the wash (broad, +-18 %) and settles in the paper tooth (fine, up to 12 % darker)
    c *= 1.0 - grain * wash * 2.0 * (0.18 * (broad - 0.5) * 2.0 + 0.12 * smoothstep(0.35, 0.8, gran));
    // far off the tile's rows squeeze into streaks: the art fades into its own slot's colour, and only far beyond
    // that into the colour the far landscape (or the sky) ends in, so a far slot still shows as itself
    c = mix(c, own, smoothstep(fadeNear, fadeFar, d));
    c = mix(c, horizonTint, smoothstep(fadeFar, fadeFar * 3.0, d));
    // the near band: a strip painted from eye height, projected back onto the floor from the house camera, so from
    // there it looks exactly as painted and still lies on the ground (parallax when the camera moves); its upper part
    // fades into the far floor (t: 0 at the frame's bottom edge, 1 at the band's far edge)
    if (useNear > 0.5) {
      vec4 cl = nearVP * vec4(vW, 1.0);
      if (cl.w > 0.0) {
        vec2 n = cl.xy / cl.w;
        float t = (n.y + 1.0) / max(nearTop + 1.0, 1e-3);
        vec4 b = texture2D(nearTex, vec2(n.x / nearSpan * 0.5 + 0.5, 1.0 - clamp(t, 0.0, 1.0)));   // premultiplied
        // fades out at its far edge (t) and below its bottom edge (a camera behind the house sees nearer floor); across
        // it never ends: u runs on and the texture repeats (tileable) or mirrors (one painting)
        float k = (1.0 - smoothstep(0.7, 1.0, t)) * smoothstep(-0.08, 0.0, t);
        c = b.rgb * k + c * (1.0 - b.a * k);
      }
    }
    gl_FragColor = vec4(c, 1.0);
  }`;ie.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ie.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${Yt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const la=e=>e?pe.WRAP_ADDRESSMODE:pe.MIRROR_ADDRESSMODE;function ca(e){const t=lt.CreateGround("ground",{width:2400,height:2400},e),n=new Ke("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tileScale","wash","grainSize","slotCount","slotFrom","slotTiles","slotColour","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","tex1","tex2","tex3","tex4","tex5","nearTex"],needAlphaBlending:!0}),s=new qn(new Uint8Array([255,255,255,255]),1,1,we.TEXTUREFORMAT_RGBA,e);for(const o of Ie)n.setTexture(o,s);return n.setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0).setFloat("tileScale",1).setFloat("wash",.5).setFloat("grainSize",1),t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Ao,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){const a=o.slots.slice(0,Ie.length);a.forEach(i=>{i.tex.wrapU=pe.WRAP_ADDRESSMODE,i.tex.wrapV=pe.WRAP_ADDRESSMODE}),Ie.forEach((i,c)=>n.setTexture(i,a[c]?.tex??s));const r=(i,c)=>Ie.map((f,h)=>a[h]?i(a[h]):c);n.setFloat("useTex",a.length?1:0).setFloat("slotCount",a.length).setFloats("slotFrom",r(i=>i.from,1e6)).setFloats("slotTiles",r(i=>i.tile||Rt,Rt)).setArray3("slotColour",Ie.flatMap((i,c)=>a[c]?.colour??o.base)).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",B.FromArray(o.base)).setVector3("horizonTint",B.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tileScale",o.tileScale).setFloat("wash",o.wash).setFloat("grainSize",o.grainSize)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=la(o.tileable),o.tex.wrapV=pe.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}const Ie=["tex","tex1","tex2","tex3","tex4","tex5"];let ha=0;function kn(e,t,n,s,o){const a=lt.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(a.rotation.x=Math.PI/2,o){const[i,c]=o.dir,f=Math.hypot(i,c)||1;a.rotation.y=Math.atan2(i/f,c/f),a.position.set(i/f*o.length*.42,.015,c/f*o.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const r=new Ke(a.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return r.alphaMode=we.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,r.setFloat("seed",ha++*7.31%97).setFloat("opacity",0),a.material=r,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:i=>{r.setFloat("opacity",i),a.isVisible=i>.001}}}ie.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ie.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${xs}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;ie.ShadersStore.stageBirdFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, flap;
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float x = abs(p.x);
    float wing = -0.35 * flap * x + 0.55 * x * x * (0.6 + 0.4 * flap);   // the wing line, bent at the tip
    float d = abs(p.y - wing) - 0.09 * (1.0 - x);                        // thicker at the body
    float a = (1.0 - smoothstep(0.0, 0.06, d)) * step(x, 1.0) * alpha;
    gl_FragColor = vec4(vec3(0.3, 0.26, 0.22) * a, a);
  }`;function vs(e,t,n,s){const o=lt.CreatePlane(e,{size:1},n),a=new Ke(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=we.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,o.material=a,o.billboardMode=$t.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:a}}const ys=9,ua=9;function da(e,t,n,s){const o=Array.from({length:ys},(a,r)=>{const i=vs(`smoke:${r}`,"stagePuff",e,s);return i.mat.setFloat("seed",r*3.7),i});return{update(a,r){o.forEach(({mesh:i,mat:c},f)=>{const h=fa(a,f),v=n*(.6+3.2*h);i.scaling.setAll(v),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(f*2.1+a*.3),t.y+n*(.4+7*h),t.z),c.setFloat("alpha",r*.7*Math.sin(Math.PI*h)),i.isVisible=r>.001})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const fa=(e,t)=>((e/ua+t/ys)%1+1)%1,gt=40,Mn=16;function ma(e){const t=(e%gt+gt)%gt;return t<Mn?t/Mn:null}function pa(e,t,n,s){const o=Array.from({length:6},(a,r)=>vs(`bird:${r}`,"stageBird",e,s));return{update(a,r){const i=ma(a),c=Math.round(2+r*4);o.forEach(({mesh:f,mat:h},v)=>{if(f.isVisible=r>.001&&i!==null&&v<c,!f.isVisible||i===null)return;const M=v*.025;f.position.set((i-M-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*i,t+v*1.5),f.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,r*2)).setFloat("flap",Math.sin(a*7+v*1.3))})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const Sn=["fire","hearth","chimney","smoke"],ga=e=>e.id.split(/[-_]/).some(t=>Sn.includes(t))||e.tags.some(t=>Sn.includes(t.toLowerCase())),xt=e=>e[0].toUpperCase()+e.slice(1),xa=e=>({fade:`lineFade${xt(e)}`,thin:`lineThin${xt(e)}`,haze:`haze${xt(e)}`}),rt={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:ct,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,groundWash:.5,groundGrain:1,grass:.5,grassSway:.15,horizonBushes:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},va=[1.05,1,.9],ya=[.88,.93,1.05],wa=.35;function ba(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:q(e,"edgeSoft"),footM:t==="standing"?wa:0,grounding:t==="figure"?0:q(e,"grounding"),grass:t==="figure"?0:q(e,"grassOverlap"),light:o?0:q(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?q(e,"cloudDrift"):0,footTint:s}}const ws=[.93,.86,.74],En=e=>({paper:q(e,"sheetPaper"),grain:q(e,"sheetGrain"),patches:q(e,"sheetPatches"),wash:q(e,"sheetWash"),washColour:ws}),ka={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01],groundGrain:[.5,3,.05]},Ma=Object.fromEntries(Object.keys(rt).map(e=>[e,ka[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ae=(e,t)=>q(e,t),q=(e,t)=>{const n=Number(e[t]??rt[t]);return Number.isFinite(n)?n:rt[t]};function vt(e,t){const n=xa(t);return{fade:q(e,n.fade),thin:q(e,n.thin),haze:q(e,n.haze),brown:q(e,"lineBrown"),ink:q(e,"lineInk"),norm:q(e,"lineNorm")}}const Sa=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),yt=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),Qe=(e,t,n,s,o)=>{const a=s*(1080/o);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function Ea(e,t,n){const s=new B(O.x,O.y,O.z),o=Te.RotationX(e*Math.PI/180),r=Te.LookAtLH(s,s.add(B.TransformNormal(new B(0,0,1),o)),B.TransformNormal(B.Up(),o)).multiply(Te.PerspectiveFovLH(ue(O.fov),t,.1,2e3));return{vp:r,top:B.TransformCoordinates(new B(0,0,n),r).y}}ie.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function Aa(e,t){const n=new Ns("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",B.FromArray(ws))},n}const Ee=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,za=12;function bs(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,a=((t?.offset??0)+n*o)*(e.fps??za),r=Math.floor(a+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,r)):(r%s+s)%s}function Fa(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const _a=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Ta=`
  vec3 paperOn(vec3 c, vec2 px, float paper, float grain, float patches, float wash, vec3 washColour) {
    float l = lum(c);
    // paper tooth: fine fibre and a medium cockle, light on the light washes too (it is the sheet)
    c *= 1.0 + paper * (0.12 * (fbm(px / 1.6) - 0.5) + 0.08 * (fbm(px / 9.0 + 17.0) - 0.5));
    // granulation: pigment settling in the tooth, in the darker and more coloured washes only
    float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    c *= 1.0 + grain * 0.5 * (fbm(px / 1.3 + 31.0) - 0.5) * (1.0 - 0.6 * l) * (0.4 + sat);
    // the warm wash goes on thicker and thinner in big soft patches (its even part is the sheet pass)
    c *= mix(vec3(1.0), washColour, wash * patches * 1.6 * (fbm(px / 380.0 + 5.0) - 0.5));
    return c;
  }`;ie.ShadersStore.stageLayerVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  uniform float time, kind, amount, speed, phase, height, width;
  varying vec2 vUV;
  varying float vH;
  void main(void) {
    vec3 p = position;
    float h = clamp(p.y / max(height, 0.001), 0.0, 1.0);   // 0 at the ground point, 1 at the top
    if (kind == 1.0) {          // sway: bends from the base, top moves most, two beats so it never ticks like a metronome
      float s = sin(time * speed * 1.1 + phase) + 0.35 * sin(time * speed * 2.7 + phase * 1.7);
      p.x += amount * 0.035 * height * h * h * s;
      p.y -= amount * 0.004 * height * h * h * s * s;      // a bent stem is a touch shorter
    } else if (kind == 2.0) {   // drift: a slow sideways travel (clouds), long period so a shot never sees it turn
      p.x += amount * 0.12 * width * sin(time * speed * 0.035 + phase);
    } else if (kind == 4.0) {   // flicker: the flame stretches and settles
      p.y *= 1.0 + amount * 0.05 * h * (sin(time * speed * 9.0 + phase) * 0.6 + sin(time * speed * 23.0) * 0.4);
    } else if (kind == 5.0) {   // breathe: the chest rises and carries the head, feet stay put, a slow weight shift on top
      float chest = smoothstep(0.35, 0.75, h);
      p.y += amount * 0.008 * height * chest * sin(time * speed * 1.6 + phase);
      p.x += amount * 0.005 * height * h * h * sin(time * speed * 0.45 + phase * 1.3);
    }
    vUV = uv;
    vH = h;
    gl_Position = worldViewProjection * vec4(p, 1.0);
  }`;ie.ShadersStore.stageLayerFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  varying float vH;
  uniform sampler2D tex;
  uniform float time, kind, amount, speed, phase, opacity, uRepeat, feather;
  uniform vec3 featherTint;
  uniform float groundLine;                  // sky only: below this height of the plane (the eye line) it is floor
  uniform float lineFade, lineThin, haze;   // line by depth (look.ts): lighter, thinner, into the sky's haze
  uniform float lineBrown;                  // all depths: black lines toward a warm brown
  uniform float inkMul;                     // this layer's line colour scale, so every layer's ink reaches one value
  uniform vec2 pxUV;                         // texture uv per 1080p screen px
  uniform vec3 hazeTint;
  uniform float paper, grain, patches, wash;   // the paper (look.ts sheet*), anchored to this picture
  uniform vec3 washColour;
  uniform vec2 grainUV;                        // texture uv per 1080p px at the house pose (fixed: grain never swims)
  // no sticker look (look.ts): a painted edge instead of a scissor cut, a foot that sinks into the floor, one light
  uniform float edgeSoft, footM, grounding, grass, light, sunSide, drift, height;
  uniform float bottomFade;                    // ground bands: alpha ramps to 0 over this share of the height, from the bottom
  uniform vec3 footTint, sunColour, shadeColour;
  uniform vec4 cell;                           // an animation: the frame's part of the sheet (u0, v0, du, dv), else 0 0 1 1
  ${xs}
  ${_a}
  ${Ta}
  // a frame of a sheet is read inside its own cell only, so no tap ever reaches the next frame
  vec4 tap(vec2 p) {
    if (cell.z < 1.0 || cell.w < 1.0) return texture2D(tex, cell.xy + clamp(p, 0.0, 1.0) * cell.zw);
    return texture2D(tex, p);
  }
  void main(void) {
    vec2 uv = vec2(vUV.x * uRepeat, vUV.y);
    uv.x += drift * 0.03 * sin(time * 0.009 + phase);     // the backdrop sky's clouds travel, too slow to see turn
    if (kind == 3.0) {          // ripple: the water surface wobbles, more toward the bottom (nearer)
      float k = amount * (0.3 + 0.7 * (1.0 - vH));
      uv.x += k * 0.004 * sin(uv.y * 70.0 + time * speed * 2.2 + phase);
      uv.y += k * 0.002 * sin(uv.x * 45.0 / uRepeat + time * speed * 1.6);
    }
    vec4 c = tap(uv);                       // premultiplied
    if (kind == 4.0) c.rgb *= 1.0 + amount * 0.12 * (sin(time * speed * 13.0 + phase) * 0.5 + sin(time * speed * 31.0) * 0.5);
    if (c.a > 0.004 && (lineFade + lineThin + haze + lineBrown + abs(inkMul - 1.0)) > 0.0) {
      vec3 s = c.rgb / c.a;                            // straight colour
      float ink = inkOf(s);
      // thinner: a line pixel takes its lightest opaque neighbour lineThin px away (an opening of the dark lines);
      // a line pixel next to the air loses its alpha instead, so the silhouette outline thins the same way
      if (lineThin > 0.0 && ink > 0.0) {
        vec3 best = s; float bl = lum(s), edge = 1.0;
        for (int k = 0; k < 4; k++) {
          vec2 d = k == 0 ? vec2(1, 0) : k == 1 ? vec2(-1, 0) : k == 2 ? vec2(0, 1) : vec2(0, -1);
          vec4 n = tap(uv + d * pxUV * lineThin);
          if (n.a > 0.9) { vec3 ns = n.rgb / n.a; float nl = lum(ns); if (nl > bl) { best = ns; bl = nl; } }
          else edge = min(edge, n.a);
        }
        s = mix(s, best, ink);
        c.a *= mix(1.0, edge, ink);   // the outline against the air thins too: its outer line pixels go
        ink = inkOf(s);
      }
      s = mix(s, clamp(s * inkMul, 0.0, 1.0), ink);                  // one ink value for every layer
      s = lineByDepth(s, ink, lineFade, haze, lineBrown, hazeTint);
      c.rgb = s * c.a;
    }
    if (c.a > 0.004 && paper + grain + patches > 0.0) c.rgb = paperOn(c.rgb / c.a, uv / grainUV, paper, grain, patches, wash, washColour) * c.a;
    vec2 px = uv / grainUV;                              // 1080p px in the picture's own space
    // one light for every picture: the side toward the sun warmer and lighter, the far side cooler, the top a touch up
    if (light > 0.0 && c.a > 0.004) {
      vec3 s = c.rgb / c.a;
      float side = (vUV.x - 0.5) * sunSide;              // -0.5 .. 0.5, + toward the sun
      s *= 1.0 + light * (0.4 * side + 0.08 * (vH - 0.5));
      s = mix(s, s * sunColour, light * max(side, 0.0) * 1.2);
      s = mix(s, s * shadeColour, light * max(-side, 0.0) * 1.2);
      c.rgb = clamp(s, 0.0, 1.0) * c.a;
    }
    // grounding: the foot takes the floor's colour along a ragged line, and a few blades of the floor stand in front
    if (grounding + grass > 0.0 && footM > 0.0 && c.a > 0.004) {
      float foot = clamp(footM / max(height, 0.01), 0.03, 0.12);
      float rag = 0.35 * foot * (fbm(vec2(px.x / 9.0, 1.3)) - 0.5);
      float k = 1.0 - smoothstep(0.0, foot, vH + rag);
      c.rgb = mix(c.rgb / c.a, footTint, k * 0.75 * grounding) * c.a;
      float blade = smoothstep(0.4, 0.95, fbm(vec2(px.x / 2.2, 7.0)));
      if (vH < grass * foot * 1.4 * blade) c *= 1.0 - 0.85 * grass;
    }
    // a painted edge, never a scissor cut: the rim breaks up in the paper's grain and bleeds a little outward
    if (edgeSoft > 0.0) {
      float amin = 1.0; vec4 acc = vec4(0.0);
      for (int k = 0; k < 8; k++) {
        float a = float(k) * 0.785398;
        vec4 n = tap(uv + vec2(cos(a), sin(a)) * grainUV * 2.5);
        amin = min(amin, n.a); acc += n;
      }
      acc /= 8.0;
      float rim = (1.0 - amin) * step(0.004, c.a);       // this pixel is on the cut
      float nz = fbm(px / 2.0 + 41.0);
      c *= 1.0 - edgeSoft * rim * 0.85 * smoothstep(0.35, 0.75, nz);
      float bleed = edgeSoft * 0.3 * acc.a * smoothstep(0.45, 0.8, nz) * (1.0 - c.a);
      c += vec4(acc.rgb / max(acc.a, 1e-3), 1.0) * bleed;
    }
    // the lower edge is painted over into the ground's own colour along a ragged line (not a blur, not see-through:
    // behind a far strip's lower part is sky, not floor), so the far landscape meets the floor without a seam. Opaque
    // even where the painting itself fades out at the bottom (art v3 strips do), else the sky shows through
    if (feather > 0.0) {
      float rag = feather * 0.45 * (fbm(vec2(uv.x * 14.0, 3.7)) - 0.5);
      float k = smoothstep(0.0, feather, vH + rag);
      c = mix(vec4(featherTint, 1.0), c, k);
    }
    // the floor plane ends 1200 m out, a pixel or two short of the horizon: there the sky would show as a pale line
    if (vH < groundLine) c = vec4(featherTint, 1.0);
    if (bottomFade > 0.0) c *= smoothstep(0.0, bottomFade, vH);   // melts into the floor and the band behind: no hard bottom edge
    gl_FragColor = c * opacity;
  }`;const An=new WeakMap,ks=new Map,Ms=new Map,It=new Map,Ss=new Map,st=new Map;function Ve(e,t){const n=An.get(t)??new Map;An.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((a,r)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>r(new Error(`layer image ${e} did not load`)),i.onload=()=>{const c=document.createElement("canvas");c.width=i.naturalWidth,c.height=i.naturalHeight;const f=c.getContext("2d",{willReadFrequently:!0});f.drawImage(i,0,0);const h=f.getImageData(0,0,c.width,c.height).data,v=qo(h,c.width,c.height);v&&ks.set(e,v),st.set(e,Jo(h,c.width,c.height)),Ms.set(e,na(h,c.width,c.height)),It.set(e,ta(h,c.width,c.height));const M=ea(h,c.width,c.height);M!==null&&Ss.set(e,M);for(let g=0;g<h.length;g+=4){const x=h[g+3]/255;h[g]=Math.round(h[g]*x),h[g+1]=Math.round(h[g+1]*x),h[g+2]=Math.round(h[g+2]*x)}const y=new qn(h,c.width,c.height,we.TEXTUREFORMAT_RGBA,t,!0,!1,pe.TRILINEAR_SAMPLINGMODE);y.anisotropicFilteringLevel=8,y.wrapV=pe.CLAMP_ADDRESSMODE,a(y)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const wt=24;function La(e,t,n,s,o){const[a,r]=t.anchor??[.5,1],i=[],c=[],f=[];for(let v=0;v<=wt;v++){const M=v/wt;for(const y of[0,1])i.push((y-a)*n,(r-M)*s,0),c.push(y,M);if(v<wt){const y=v*2;f.push(y,y+2,y+1,y+1,y+2,y+3)}}const h=new $t(e,o);return Object.assign(new Jn,{positions:i,uvs:c,indices:f}).applyToMesh(h),h}let Pa=0;function zn(e,t,n,s,o,a){const r=La(`layer:${e.id}`,e,n,s,a),i=new Ke(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?pe.WRAP_ADDRESSMODE:pe.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const c=Pa++*2.39996%(Math.PI*2),f=e.anchor?.[1]??1;return i.setFloat("phase",c).setFloat("height",s*f).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new sn(0,0,1,1)),r.material=i,r.metadata={noGBuffer:!0,painted:!0},r.isPickable=!1,{mesh:r,material:i,setMotion:h=>{i.setFloat("kind",Io[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),r.isVisible=h>.001},setLine:(h,v,M,y)=>{i.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new on(M[0],M[1])).setVector3("hazeTint",B.FromArray(y))},setPaper:(h,v)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",B.FromArray(h.washColour)).setVector2("grainUV",new on(v[0],v[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setCell:h=>{i.setVector4("cell",new sn(h[0],h[1],h[2],h[3]))},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",B.FromArray(h.footTint)).setVector3("sunColour",B.FromArray(va)).setVector3("shadeColour",B.FromArray(ya))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,v)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),v&&i.setVector3("featherTint",B.FromArray(v))}}}const Es=600,As=1.5,Ca=2,Da=.8,Oa=["grass","heather","reeds","shrub","bramble","juniper","hazel","meadow","fern","tree","bush","sedge","flower"],Ra=["shrub","tree","bush","bramble","hedge"],Ba=["ground"];function Ia(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function Fn(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}const Va=e=>e.layer!=="ground"&&e.layer!=="sky"&&e.layer!=="bg"&&e.layer!=="figure"&&!e.tileable_x&&!Ot(e)&&e.kind!=="animation"&&e.tags.some(t=>Oa.includes(t));function Na(e){const t=e.assets.filter(n=>n.kind==="sheet");return t.length?t.flatMap(n=>(n.cells??[]).map(s=>({asset:n.id,file:n.file,tags:s.tags,height_m:s.height_m,aspect:s.rect[2]*n.w/Math.max(1,s.rect[3]*n.h),cell:s.rect}))):e.assets.filter(Va).map(n=>({asset:n.id,file:n.file,tags:n.tags,height_m:n.height_m,aspect:n.w/Math.max(1,n.h),cell:[0,0,1,1]}))}const zs=(e,t)=>e.tags.some(n=>!Ba.includes(n)&&t.includes(n)),Ua=(e,t)=>e.filter(n=>n.height_m<=As&&!n.tags.includes("tree")&&zs(n,t)),$a=["grass","meadow","heath","field","hedge","forest","marsh","wet","edge","heather"];function Ha(e,t){const n=e.filter(o=>o.height_m>As&&o.tags.some(a=>Ra.includes(a))),s=n.filter(o=>zs(o,t));return s.length||!t.some(o=>$a.includes(o))?s:n.filter(o=>!o.tags.includes("tree"))}function _n(e){const t=Math.min(Es,Math.max(0,Math.round(e.count)));if(!e.picks.length||!t)return[];const n=Ia(e.seed),s=Math.max(e.from,e.front+Ca),o=Math.max(s,e.to),a=[];for(let r=0;r<t;r++){const i=s*Math.pow(o/s,n()),c=Math.floor(n()*e.picks.length);a.push({z:i,x:(n()*2-1)*Da*de(i),h:e.picks[c].height_m*(.7+.6*n())*(e.size??1),pick:c,phase:n()*Math.PI*2})}return a.sort((r,i)=>i.z-r.z)}const Fs=[...Array.from({length:16},(e,t)=>2.5*Math.pow(1.4,t+1)),1/0],Tn=e=>Fs.findIndex(t=>e<t);ie.ShadersStore.stageStrewnVertexShader=`
  precision highp float;
  attribute vec3 position;     // the clump's anchor on the floor (y 0)
  attribute vec4 quad;         // corner across (-0.5..0.5), corner up (0..1), height m, width m
  attribute vec2 uv;           // the corner's uv in the sheet
  attribute vec4 extra;        // sway phase, foot colour
  uniform mat4 viewProjection;
  uniform vec3 camPos;
  uniform float time, sway, land;
  varying vec2 vUV;
  varying float vUp, vDist;
  varying vec3 vFoot;
  // layout.ts groundHeight (GLSL twin): the floor rises onto the far landscape's land line from 22 m to 70 m
  float groundY(float z) {
    if (z <= 70.0 || land == 0.0) return clamp((z - 22.0) / 48.0, 0.0, 1.0) * land;
    return 1.6 + (land - 1.6) * z / 70.0;
  }
  void main(void) {
    vec2 to = camPos.xz - position.xz;
    vec3 right = normalize(vec3(-to.y, 0.0, to.x));
    float up = quad.y;
    float bend = sway * 0.05 * quad.z * up * up * (0.6 * sin(time * 1.3 + extra.x) + 0.4 * sin(time * 2.1 + extra.x * 1.7));
    vec3 p = position + right * (quad.x * quad.w + bend) + vec3(0.0, up * quad.z + groundY(position.z), 0.0);
    vUV = uv; vUp = up; vFoot = extra.yzw; vDist = length(to);
    gl_Position = viewProjection * vec4(p, 1.0);
  }`;ie.ShadersStore.stageStrewnFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  varying float vUp, vDist;
  varying vec3 vFoot;
  uniform sampler2D tex;
  uniform vec3 haze;
  uniform float opacity;
  void main(void) {
    vec4 c = texture2D(tex, vUV);   // premultiplied
    if (c.a < 0.01) discard;
    // the foot sinks into the ground it stands on, the far ones go toward the horizon's colour
    float foot = (1.0 - smoothstep(0.0, 0.3, vUp)) * 0.65;
    c.rgb = mix(c.rgb, vFoot * c.a, foot);
    c.rgb = mix(c.rgb, haze * c.a, smoothstep(40.0, 320.0, vDist) * 0.55);
    gl_FragColor = c * opacity;
  }`;function Ga(e,t,n,s,o,a,r){const i=new Ke(`strewn:${r}`,e,"stageStrewn",{attributes:["position","quad","uv","extra"],uniforms:["viewProjection","camPos","time","sway","land","haze","opacity"],samplers:["tex"],needAlphaBlending:!0});i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setTexture("tex",t).setVector3("haze",B.FromArray(a));const c=new Map;for(const h of s)c.set(Tn(h.z),[...c.get(Tn(h.z))??[],h]);const f=[...c].map(([h,v])=>{const M=[],y=[],g=[],x=[],p=[];v.forEach((F,k)=>{const A=n[F.pick],[N,j,Z,ee]=A.cell,U=F.h*A.aspect,se=o(F.z);for(const[H,G]of[[-.5,0],[.5,0],[.5,1],[-.5,1]])M.push(F.x,0,F.z),y.push(H,G,F.h,U),g.push(N+(H+.5)*Z,j+(1-G)*ee),x.push(F.phase,se[0],se[1],se[2]);p.push(k*4,k*4+1,k*4+2,k*4,k*4+2,k*4+3)});const b=new $t(`strewn:${r}:${h}`,e);return Object.assign(new Jn,{positions:M,indices:p}).applyToMesh(b),b.setVerticesData("quad",y,!1,4),b.setVerticesData(Us.UVKind,g,!1,2),b.setVerticesData("extra",x,!1,4),b.material=i,b.alphaIndex=je(Math.min(Fs[h],2e3)),b.alwaysSelectAsActiveMesh=!0,b.isPickable=!1,b.metadata={noGBuffer:!0},b});return{meshes:f,update(h,v,M,y,g){i.setFloat("time",h).setFloat("sway",v).setFloat("land",M).setFloat("opacity",g).setVector3("camPos",y),f.forEach(x=>{x.isVisible=g>.001})},dispose(){f.forEach(h=>h.dispose()),i.dispose()}}}const et=[3,60],Ln=[60,300],Wa=80,ja=1.8,Ya=(e,t)=>t??e.asset.tags;function Pn(e){const t=[],n=Math.log(et[1]/et[0]);e.slots.forEach((o,a)=>{const r=Math.max(et[0],o.from),i=Math.min(et[1],e.slots[a+1]?.from??1/0);if(i<=r)return;const c=Ua(e.sprites,Ya(o,e.bandTags)),f=e.grass*Es*(Math.log(i/r)/n);t.push({picks:c,clumps:_n({picks:c,count:f,from:r,to:i,front:e.front,seed:Fn(`${e.sceneId}:grass:${a}`)})})});const s=e.slots[e.slots.length-1];if(s&&!e.bandTags){const o=Ha(e.sprites,s.asset.tags);t.push({picks:o,horizon:!0,clumps:_n({picks:o,count:e.bushes*Wa,from:Ln[0],to:Ln[1],front:e.front,size:ja,seed:Fn(`${e.sceneId}:horizon`)})})}return t.filter(o=>o.clumps.length)}const Vt={...bo["History Lines pencil"],paper:.35,granulation:.2,...rt},Ka=new Qn(.937,.914,.863,1),Za=.7,Xa=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class qa{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new $s(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Hs(this.engine),this.scene.clearColor=Ka,this.camera=new Gs("house",new B(0,1.6,0),this.scene),this.camera.rotation.set(ct*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new Ws("sky",new B(0,1,0),this.scene).intensity=.7,new js("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=ca(this.scene),this.ground.set(this.groundLook([],null,n)),this.birds=pa(this.scene,Rn,de(Rn),nr),ko(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),Aa(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Be(Fe);strip=null;nearTex=null;bands=[];strewn=[];strewSrc=null;strewKey="";smoke=[];birds;footTint=Be(Fe);nearAsset=null;hazeTint=Be(Fe);sceneLib;buildToken=0;look={...Vt};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=yn;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return Ho(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=yn,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>Uo;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<No)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=$o(this.tier,o,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...Vt,...t??{}}}groundPoint(t,n){const s=Q[n];return new B((t-.5)*de(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],a=[];t.set.sky&&a.push({layer:Dn(t),order:0,index:-1});const r={sky:1};t.set.layers.forEach((w,R)=>{const X=w.depth;r[X]=r[X]??0,a.push({layer:w,order:r[X]++,index:R})});const i=[];await Promise.all(a.map(async({layer:w,order:R,index:X})=>{let D=_e(n,w,w.depth);if(!D){i.push({need:w.need??w.asset,reason:"no match"});return}let le;try{le=await Ve(xe(n,D,w),this.scene)}catch{i.push({need:w.need??w.asset,reason:`file did not load: ${w.src??D.file}`});return}if(s!==this.buildToken)return;D=Cn(D,w,le);const I=Re(D,w,R),S=zn(D,le,I.w,I.h,I.uRepeat,this.scene);S.mesh.position.set(I.x,I.y,I.z);const z=us(w,D);S.mesh.alphaIndex=z?zo:I.alphaIndex,z&&(S.mesh.rotation.x=Math.PI/2),S.mesh.isVisible=!1;let T,P,Y;if(bt.includes(w.depth)&&!D.tileable_x&&!z&&!Me(D)){const K=bn(D,I.w,I.h,I.z);Y=oe=>bn(D,I.w,I.h,oe).d/K.d,T=kn(S.mesh,K.w,K.d,this.scene),T.mesh.alphaIndex=Je(I.alphaIndex),P=kn(S.mesh,K.w,K.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:I.h*sr(this.sunDir)}),P.mesh.alphaIndex=Je(I.alphaIndex)}o.push({layer:w,index:X,builtScale:w.scale??1,builtZ:I.z,handle:S,asset:D,order:R,stain:T,cast:P,stainDepth:Y,ink:Ss.get(xe(n,D,w)),flat:z,skyline:It.get(xe(n,D,w))})}));const c=ms(t.set,n),f=(await Promise.all(gs(t.set,n).map(async w=>{const R=await Ve(n.base+w.asset.file,this.scene).catch(()=>(i.push({need:w.asset.id,reason:`file did not load: ${w.asset.file}`}),null)),X=(st.get(n.base+w.asset.file)??[]).filter(D=>!!D);return R?{tex:R,tile:w.asset.height_m||Rt,from:w.from,asset:w.asset,colour:X.length?Bn(X):Be(n.paper??Fe)}:null}))).filter(w=>!!w);let h=null;const v=aa(t.set.near,n),M=v?_e(n,{asset:v}):null;if(t.set.near&&!M&&i.push({need:t.set.near,reason:"no near band"}),M)try{h=await Ve(n.base+M.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${M.file}`})}c.kind==="paper"&&c.reason&&i.push({need:t.set.ground,reason:c.reason});const y=o.filter(w=>w.asset.layer==="bg").sort((w,R)=>w.index-R.index)[0],g=y?{top:Ms.get(xe(n,y.asset,y.layer))??0,h:Re(y.asset,y.layer,y.order).h,order:y.order}:null,x=o.find(w=>w.index===-1),p=x&&Re(x.asset,x.layer,x.order),b=x&&p?Qo(st.get(xe(n,x.asset,x.layer))??[],(O.y-p.y)/p.h):null,F=y?ks.get(xe(n,y.asset,y.layer))??null:t.set.groundBands?.length?null:b,k=await this.loadBands(t,n),A=t.set.groundBands?.length?[...new Set(t.set.groundBands.flatMap(w=>_e(n,{asset:w.asset},"ground_band")?.tags??[]))]:null,N=Na(n),j=gn(t),Z=f.map(w=>({asset:w.asset,from:w.from})),ee=[...new Set(Pn({sceneId:t.id,slots:Z,bandTags:A,sprites:N,grass:1,bushes:1,front:j}).flatMap(w=>w.picks.map(R=>R.file)))],U=new Map;await Promise.all(ee.map(async w=>{const R=await Ve(n.base+w,this.scene).catch(()=>null);R&&U.set(w,R)}));const se=w=>w.forEach(R=>{R.stain?.mesh.material?.dispose(),R.cast?.mesh.material?.dispose(),R.handle.mesh.dispose(),R.handle.material.dispose()});if(s!==this.buildToken){se(o),k.forEach(w=>{w.handle.mesh.dispose(),w.handle.material.dispose()});return}se(this.built),this.bands.forEach(w=>{w.handle.mesh.dispose(),w.handle.material.dispose()}),this.bands=k,this.built=o,this.sceneLib=n;const H=f[0]?(st.get(n.base+f[0].asset.file)??[]).filter(w=>!!w):[],G=this.groundLook(f,F,n,c.kind==="paper"?c.colour:void 0);this.horizonTint=G.tint,this.strip=g,this.smoke.forEach(w=>w.dispose()),this.smoke=o.filter(w=>ga(w.asset)&&bt.includes(w.layer.depth)&&!w.flat).map(w=>{const R=Re(w.asset,w.layer,w.order);return da(this.scene,new B(w.handle.mesh.position.x,R.h*.6,R.z),Math.min(Math.max(R.h*.8,.5),3),R.alphaIndex)}),this.footTint=H.length?Bn(H):G.base,this.nearTex=h,this.nearAsset=M,this.hazeTint=b??G.tint,this.ground.set(G),this.strewSrc={sceneId:t.id,slots:Z,colours:f.map(w=>w.colour),bandTags:A,front:j,sprites:N,tex:U},this.strewKey="",this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const a=Be(o??s.paper??Fe),r=n??a;return{slots:t,base:Xa(a,r,Za),tint:r,fadeNear:Q.fg,fadeFar:Q.bg*.75,grain:t.length?.5:1}}strew(t,n){const s=this.strewSrc,o=s?`${s.sceneId}:${t}:${n}:${s.slots.length}`:"";if(o===this.strewKey||(this.strewKey=o,this.strewn.forEach(r=>r.dispose()),this.strewn=[],!s))return;const a=r=>s.colours[ra(s.slots,r)]??this.footTint;for(const r of Pn({...s,grass:t,bushes:n}))for(const i of new Set(r.picks.map(c=>c.file))){const c=s.tex.get(i),f=r.clumps.filter(h=>r.picks[h.pick].file===i);c&&f.length&&this.strewn.push(Ga(this.scene,c,r.picks,f,a,this.hazeTint,i))}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:Dn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=r=>this.built.some(i=>i.handle.mesh===r),o=[],a=[...this.scene.multiPick(t,n,s)??[]].sort((r,i)=>r.distance-i.distance);for(const r of a){const i=this.built.find(f=>f.handle.mesh===r.pickedMesh),c=r.getTextureCoordinates();!i||!c||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||Me(i.asset)&&(r.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:c.x,v:c.y})}return o}pickBackdrops(t,n){const s=r=>this.bands.find(i=>i.handle.mesh===r),o=r=>this.built.find(i=>i.handle.mesh===r&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,r=>!!s(r)||!!o(r))??[]].sort((r,i)=>r.distance-i.distance).flatMap(r=>{const i=r.getTextureCoordinates();if(!i)return[];const c=s(r.pickedMesh);if(c)return[{band:c.index,asset:c.asset,u:i.x,v:i.y}];const f=o(r.pickedMesh);return[{index:f.index,asset:f.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(f=>f.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),a=1/this.engine.getRenderHeight(),r=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(f=>B.Project(f,Te.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=r.map(f=>f.x*o),c=r.map(f=>f.y*a);return{x0:Math.min(...i),y0:Math.min(...c),x1:Math.max(...i),y1:Math.max(...c),z:n.handle.mesh.position.z}}groundHeightAt(t){return Dt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?Me(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Te.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>Qa*Math.min(1,Math.max(0,(On-o)/(On-tr)));this.gridMeshes=n.pieces.map((o,a)=>{const r=o.lines.map(f=>f.map(([h,v])=>new B(h,Dt(v,t),v))),i=o.lines.map(f=>f.map(([,h])=>new Qn(n.rgb[0],n.rgb[1],n.rgb[2],s(h)))),c=lt.CreateLineSystem(`grid-${a}`,{lines:r,colors:i,useVertexAlpha:!0},this.scene);return c.isPickable=!1,c.setEnabled(!this.gridOff),c.alphaIndex=je(o.z)+er,c.material.depthFunction=we.ALWAYS,c.material.disableDepthWrite=!0,c}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,Te.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new B(.55,-1,-.3).normalize();depthLine(t){return{...vt(this.look,t),tint:this.hazeTint}}paper(){return En(this.look)}async loadBands(t,n){const s=[];for(const[o,a]of(t.set.groundBands??[]).entries()){const r=_e(n,{asset:a.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await Ve(xe(n,r,a),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${a.src??r.file} did not load`);continue}const c=Cn(r,a,i),f=is(a.z),h=f*c.h/c.w,v=zn(c,i,f,h,1,this.scene);v.material.depthFunction=we.ALWAYS,v.mesh.position.set(0,0,a.z),v.mesh.alphaIndex=je(a.z),s.push({handle:v,z:a.z,w:f,h,skyline:It.get(xe(n,c,a))??.5,index:o,asset:c,band:a})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?Oo(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??rs,ae(this.look,"housePitch")):0}pose(t,n,s,o){const a=Wt(t,n),r=jt(a.cam,a.t,Gt(t)),i=o?jo(r,o.t,o):r;this.camera.position.set(i.x,i.y,i.z),this.camera.fov=i.fov;const c=ae(this.look,"housePitch");this.camera.rotation.x=c*Math.PI/180,this.ground.follow(this.camera.position);const f=p=>ae(this.look,p);this.ground.live({detail:f("groundDetail"),vary:f("groundVary"),mixTile:f("groundMix"),tileScale:f("groundScale"),wash:f("groundWash"),grainSize:f("groundGrain")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Ea(c,this.engine.getAspectRatio(this.camera),f("nearFar")),span:Ja,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),v=En(this.look),M=ae(this.look,"bandHeight"),y=this.horizonOf(t),g=To(y,this.strip);this.land=g,this.poseGrid(g);const x=gn(t);this.bands.forEach(p=>{const b=Do(p.band,n,M,p.w,p.h,p.skyline,x);p.z=b.z,p.handle.mesh.scaling.set(b.sx,b.sy,1),p.handle.mesh.position.set(b.x,b.y,b.z),p.handle.mesh.alphaIndex=b.alphaIndex;const F=yt(h,b.z-O.z,ue(O.fov));p.handle.setOpacity(b.opacity),p.handle.setBottomFade(Math.min(1,ae(this.look,"bandFade")/b.h)),p.handle.setPaper(v,Qe(b.w,b.h,1,F,h)),p.handle.setLine(vt(this.look,"bg"),1,Qe(b.w,b.h,1,F,h),this.hazeTint),p.handle.setMotion(vn(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.strew(ae(this.look,"grass"),ae(this.look,"horizonBushes")),this.strewn.forEach(p=>p.update(s,ae(this.look,"grassSway"),g,this.camera.position,1)),this.smoke.forEach(p=>p.update(s,ae(this.look,"smoke"))),this.birds.update(s,ae(this.look,"birds"));for(const p of this.built){const b=ye(p.layer,n),F=Re(p.asset,{...p.layer,x:b.x,y:b.y,z:b.z,scale:1,rotation:b.rotation},p.order,y,g);p.handle.mesh.position.x=F.x;const k=p.asset.layer==="bg"&&!p.asset.tileable_x?(F.z-O.z)/Math.max(.1,p.builtZ-O.z):1;p.handle.mesh.position.y=p.flat?Fo:Me(p.asset)?hs(F.z,M,F.h*b.scale,p.skyline??0)+F.y:O.y+(F.y-O.y)*k,p.handle.mesh.position.z!==F.z&&(p.handle.mesh.position.z=F.z,p.flat||(p.handle.mesh.alphaIndex=F.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=Je(F.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(F.z)),p.cast&&(p.cast.mesh.alphaIndex=Je(F.alphaIndex))),p.handle.mesh.rotation.z=-F.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(b.scale/p.builtScale*k),p.handle.setOpacity(b.opacity),p.handle.setFeather(Xo(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-F.y)/(F.h*b.scale));const A=yt(h,F.z-i.z,this.camera.fov),N=vt(this.look,p.layer.depth);p.handle.setPaper(v,Qe(F.w*b.scale,F.h*b.scale,F.uRepeat,yt(1080,F.z-O.z,ue(O.fov)),1080)),p.handle.setLine(N,p.ink===void 0?1:Sa(p.ink,N.ink,N.norm),Qe(F.w*b.scale,F.h*b.scale,F.uRepeat,A,h),this.hazeTint),p.stain?.setOpacity((p.layer.shadow??pt)*b.opacity),p.cast?.setOpacity(ae(this.look,"castShadow")*((p.layer.shadow??pt)/pt)*b.opacity);const j=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":bt.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive(ba(this.look,j,this.sunDir.x,this.footTint)),p.handle.setMotion(vn(p.asset,p.layer)),p.handle.material.setFloat("time",s),Ee(p.asset)&&p.handle.setCell(Fa(p.asset,bs(p.asset,p.layer.play,n)))}}}const xe=(e,t,n)=>n?.src??e.base+t.file,Cn=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:o}=n.getSize(),a=s/(Ee(e)?e.cols:1),r=o/(Ee(e)?e.rows:1);return{...e,w:a,h:r,height_m:e.height_m*(r/e.h)}},Dn=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),Ja=1.3,Qa=.35,er=.001,tr=40,On=120,Rn=110,nr=900,sr=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Bn=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),bt=["mid","fg","near"],or=16/9,ar=.92;function rr(e,t,n,s){const{cam:o,t:a}=Wt(e,s),r=jt(o,a,Gt(e)),i=Q[t.depth],c=i-r.z;if(c<=.5)return null;const f=ye(t,s),h=(f.x-.5)*de(i),v=Math.tan(r.fov/2),M=(h-r.x)/(c*v*or),y=-ct*Math.PI/180,g=Math.tan(Math.atan2(n*f.scale-r.y,c)-y)/v;return Math.abs(M)>ar?null:{x:(M+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const ir={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},In=new Set(["large","small","tall","long","short","fallen"]),lr=new Set(["tree","shrub"]),Kt=e=>e.charAt(0).toUpperCase()+e.slice(1),cr=(e,t)=>ir[e]?.[t?1:0]??e;function hr(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const a=o.length>1&&lr.has(o[0])?o.slice(1):o,r=a.filter(c=>In.has(c)),i=a.filter(c=>!In.has(c));return Kt([...r,...i].map(c=>cr(c,n)).join(" "))}const Vn=e=>Kt(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),_s=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ve(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&_s(s);if(o)return Vn(o);if(e.figure)return Vn(e.figure);if(s)return hr(s,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?Kt(String(a)):""}function ur(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const dr=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function fr(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>dr.has(t))?"leaf":"photo"}const Ye=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?_s(e):null,Nn=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Le(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:Nn(e,"pose:")??t?.[1]??null,facing:Nn(e,"facing:")??(t?.[2]?"left":"right")}}const Ts=e=>e.find(t=>Le(t).pose==="stand"&&Le(t).facing==="right")??e[0];function Ls(e){const t=new Map,n=[];for(const s of e??[]){const o=Ye(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const r={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,r),n.push(r)}const a=t.get(o);a.members=[...a.members,s],a.count=a.members.length}return n.map(s=>s.series?{...s,asset:Ts(s.members)}:s)}const mr=(e,t)=>{const n=Ye(t);return n?(e??[]).filter(s=>Ye(s)===n):t?[t]:[]},pr=e=>Ls(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function gr(e,t,n){const s=(e??[]).filter(r=>Ye(r)===n);if(!s.length)return null;const o=Le(t),a=(r,i)=>s.find(c=>Le(c).pose===r&&Le(c).facing===i);return a(o.pose,o.facing)??a("stand",o.facing)??Ts(s)}const xr=24;function vr(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const o=new Image;o.onload=()=>{try{const a=document.createElement("canvas");a.width=o.naturalWidth,a.height=o.naturalHeight;const r=a.getContext("2d",{willReadFrequently:!0});r.drawImage(o,0,0),t.set(s,{w:a.width,h:a.height,data:r.getImageData(0,0,a.width,a.height).data})}catch{t.set(s,"failed")}},o.onerror=()=>t.set(s,"failed"),o.src=e+s};return{prime(s){s.forEach(o=>o?.file&&n(o.file))},opaque(s,o,a,r){const i=t.get(s?.file);if(!i||typeof i=="string")return s?.file&&n(s.file),!0;const c=s.kind==="animation"?Math.max(1,s.cols??1):1,f=s.kind==="animation"?Math.max(1,s.rows??1):1,h=i.w/c,v=i.h/f,M=Math.min(h-1,Math.max(0,Math.floor(o*h))),y=Math.min(v-1,Math.max(0,Math.floor(a*v)));return(Number.isInteger(r)?[[Math.floor(r/c)%f,r%c]]:Array.from({length:f*c},(x,p)=>[Math.floor(p/c),p%c])).some(([x,p])=>i.data[(Math.floor(x*v+y)*i.w+Math.floor(p*h+M))*4+3]>xr)}}}const ne={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,ls],[80,Ht]]},yr=e=>e<=12?1:e<=40?5:20,wr=e=>yr(e)/4;function Un(e,t=0){const n=typeof t=="function"?t:()=>t,s=f=>[e.origin[0]+f*e.dir[0],e.origin[2]+f*e.dir[2]],o=f=>e.origin[1]+f*e.dir[1]-(ne.z+n(s(f)[1]));if(!(e.dir[2]>0))return null;const a=(Ht*br-e.origin[2])/e.dir[2],r=Math.sign(o(0));if(r===0)return an(ne,s(0));let i=0,c=null;for(let f=1;f<=$n;f++){const h=a*f/$n;if(Math.sign(o(h))!==r){c=h;break}i=h}if(c===null)return null;for(let f=0;f<kr;f++){const h=(i+c)/2;Math.sign(o(h))===r?i=h:c=h}return an(ne,s(c))}const br=4,$n=400,kr=30;function Nt(e){const t=wr(At(ne,e)[1]);return At(ne,Zs(e,t))}const Ut=(e,t)=>[(e-.5)*de(t),t],it=([e,t])=>({x:Math.round((.5+e/de(t))*1e4)/1e4,z:t});function Zt([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function Mr([e,t],n,s=[0,0]){const[[,o],[,a]]=ne.cells,r=Math.max(.1,t-s[1]),i=Math.min(a,Math.max(o,s[1]+r/Math.max(.01,n)));return At(ne,Zt([e,t],i,s))}const Sr=[[ls,12,2],[12,40,10],[40,Ht,40]],Er=20;function Ar(){return Sr.flatMap(([e,t,n],s)=>{const o=n*Er,a=[];let r=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const c={...ne,cells:[[-o,r],[o,i]]},f=Xs(c,n,Math.max(1,Math.round(i-r))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===i:i>r);a.push({z:i,lines:f.map(h=>h.map(v=>qs(ne,v).slice(0,2)))}),r=i}return a})}const Hn=-1,Gn=2;function zr({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:a,onGround:r=()=>!1,byDistance:i=()=>!1,groundUnder:c=()=>null,footY:f=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:M=()=>!1}){let y=null,g=null,x=!1;const p="#38bdf8",b=document.createElement("div");b.dataset.stage25dSelection="",b.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${p};z-index:3;`;const F=document.createElement("div");F.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${p};pointer-events:none;`,b.appendChild(F);const k=document.createElement("div");k.dataset.rotateHandle="1",k.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",b.appendChild(k);const N=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([S,z])=>{const T=document.createElement("div");return T.dataset.scaleHandle="1",T.style.cssText=Ks(S,z),b.appendChild(T),T});t.appendChild(b),n()?.setGrid?.(Ar(),Fr(t,"--color-neutral"));const j=document.createElement("div");j.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(j);const Z=S=>{const z=H();if(!z||S===null){j.style.display="none";return}const T=t.getBoundingClientRect(),P=e.getBoundingClientRect();Object.assign(j.style,{display:"block",left:`${z.left+z.width/2+P.left-T.left}px`,top:`${z.top+z.height+P.top-T.top}px`}),j.textContent=`${s(S,"z").toFixed(2)} m`},ee=S=>{const z=e.getBoundingClientRect();return{x:S.clientX-z.left,y:S.clientY-z.top}},U=(S,z)=>n()?.pickLayers(S,z).find(T=>o.opaque(T.asset,T.u,T.v,T.index))??null,se=(S,z)=>{y=S,z&&S!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${S}`}})),G()},H=()=>{const S=y===null?null:n()?.layerBox(y);if(!S)return null;const z=e.getBoundingClientRect();return{left:S.x0*z.width,top:S.y0*z.height,width:(S.x1-S.x0)*z.width,height:(S.y1-S.y0)*z.height,z:S.z}},G=()=>{const S=H();if(!S){b.style.display="none";return}const z=e.getBoundingClientRect(),T=t.getBoundingClientRect();Object.assign(b.style,{display:"block",left:`${S.left+z.left-T.left}px`,top:`${S.top+z.top-T.top}px`,width:`${S.width}px`,height:`${S.height}px`})},w=(S,z,T)=>Math.min(T,Math.max(z,S)),R=S=>{if(S.button!==0)return;const{x:z,y:T}=ee(S),P=U(z,T);if(!P){M(z,T)&&S.stopPropagation();return}S.stopPropagation(),se(P.index,!0);const Y=n().layerBox(P.index),K=r(P.index),oe=H();g={mode:"move",index:P.index,z:Y.z,from:n().worldXAt(z,T,Y.z),x0:s(P.index,"x"),id:S.pointerId,el:e,ground:K,start:[z,T],foot:oe?[oe.left+oe.width/2,oe.top+oe.height]:[z,T],lift:K?f(P.index):0},e.setPointerCapture?.(S.pointerId)},X=S=>z=>{if(z.button!==0||y===null)return;const T=H();if(!T)return;z.stopPropagation(),z.preventDefault();const P=e.getBoundingClientRect(),Y=T.left+T.width/2,K=T.top+T.height/2,{x:oe,y:fe}={x:z.clientX-P.left,y:z.clientY-P.top};g={mode:S,index:y,cx:Y,cy:K,id:z.pointerId,el:z.currentTarget,d0:Math.max(8,Math.hypot(oe-Y,fe-K)),a0:Math.atan2(fe-K,oe-Y),scale0:s(y,"scale"),rotation0:s(y,"rotation"),byDistance:S==="scale"&&i(y),p0:Ut(s(y,"x"),s(y,"z")),eye:h()},z.currentTarget.setPointerCapture?.(z.pointerId)},D=S=>{const{x:z,y:T}=ee(S);if(g?.mode==="move"&&g.ground){const P=c(g.foot[0]+z-g.start[0],g.foot[1]+T-g.start[1],g.lift,g.index);if(!P)return;const Y=it(Nt(P));a(g.index,"x",w(Y.x,Hn,Gn)),a(g.index,"z",Y.z),Z(g.index);return}if(g?.mode==="move"){const P=(n().worldXAt(z,T,g.z)-g.from)/de(g.z);a(g.index,"x",Math.round(w(g.x0+P,Hn,Gn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const P=Math.hypot(z-g.cx,T-g.cy)/g.d0*g.scale0,Y=Nt(Mr(g.p0,P,g.eye))[1],K=it(Zt(g.p0,Y,g.eye));g.scale0!==1&&a(g.index,"scale",1),a(g.index,"x",K.x),a(g.index,"z",K.z),Z(g.index);return}if(g?.mode==="scale"){const P=Math.hypot(z-g.cx,T-g.cy);a(g.index,"scale",Math.round(w(g.scale0*(P/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let P=g.rotation0+(Math.atan2(T-g.cy,z-g.cx)-g.a0)*180/Math.PI;S.shiftKey&&(P=Math.round(P/15)*15),a(g.index,"rotation",Math.round(P*10)/10);return}x||(x=!0,requestAnimationFrame(()=>{x=!1,e.style.cursor=U(z,T)?"pointer":""}))},le=()=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const S=g.index,z=g.mode==="move"&&g.ground||g.byDistance;g=null,j.style.display="none",z&&v(S)},I=S=>{y!==null&&S.detail?.id!==`s25_layer-${y}`&&(y=null,G())};e.addEventListener("pointerdown",R);for(const S of[e,...N,k])S.addEventListener("pointermove",D),S.addEventListener("pointerup",le),S.addEventListener("pointercancel",le);return N.forEach(S=>S.addEventListener("pointerdown",X("scale"))),k.addEventListener("pointerdown",X("rotate")),window.addEventListener("scene-object-selected",I),{select:(S,z=!1)=>se(S,z),get selected(){return y},place:G,destroy(){window.removeEventListener("scene-object-selected",I),b.remove(),n()?.setGrid?.(null),j.remove()}}}function Fr(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const Xt=["x","y","z","scale","rotation","opacity","keys","figure","play"],te=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},kt=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Xt.includes(t))),Wn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{},{camera:a,camera_more:r,...i}=e??{};return JSON.stringify({...i,set:{...o,layers:t.map(kt),groundBands:n.map(kt),skyLayer:kt(s)}})},Mt=e=>Xt.map(t=>e?.[t]??null),St=e=>JSON.stringify([(e?.set?.layers??[]).map(Mt),(e?.set?.groundBands??[]).map(Mt),Mt(e?.set?.skyLayer),e?.camera??null,e?.camera_more??[]]),jn={x:[-8,8],y:[.3,6],z:[-4,15],fov:[20,75]},_r=10,Yn=.01,Tr=.01,Lr=(e,[t,n])=>Math.min(n,Math.max(t,e)),Pr=e=>Math.round(e*1e3)/1e3,ge=e=>{const t={...O,...e};return Object.fromEntries(Object.keys(jn).map(n=>[n,Pr(Lr(Number(t[n])||O[n],jn[n]))]))},Cr=(e,t,n,s)=>{const o=ge(e),a=2*_r*Math.tan(ue(o.fov)/2)/Math.max(1,s);return ge({...o,x:o.x-t*a,y:o.y+n*a})},Dr=(e,{deltaX:t=0,deltaY:n=0,ctrlKey:s=!1})=>{const o=ge(e);return ge(s?{...o,fov:o.fov*Math.exp(n*Tr)}:{...o,z:o.z-n*Yn,x:o.x+t*Yn})},qt=.001,Or=(e,t,n)=>{const s=[];for(const o of[e,...t??[]].filter(Boolean)){const a=Number(o.at_s)||0,r=(i,c)=>{const f=s.findIndex(h=>Math.abs(h.t-i)<qt);f>=0?s[f]={t:i,pose:c}:s.push({t:i,pose:c})};r(a,ge(o.from??O)),r(a+(Number(o.dur_s)||Math.max(0,n-a)),ge(o.to??o.from??O))}return s.sort((o,a)=>o.t-a.t)},tt=(e,t,n)=>[...e.filter(s=>Math.abs(s.t-t)>=qt),{t,pose:ge(n)}].sort((s,o)=>s.t-o.t),Rr=(e,t)=>e.filter(n=>Math.abs(n.t-t)>=qt),Br=(e,t)=>e.reduce((n,s)=>Math.abs(s.t-t)<Math.abs(n.t-t)?s:n,e[0]),Ir=e=>{const t=(n,s,o,a)=>({move:"framed",ease:"inOut",at_s:o,...a?{dur_s:a}:{},from:n,to:s});return e.length<2?e.map(n=>t(n.pose,n.pose,0)):e.slice(0,-1).map((n,s)=>t(n.pose,e[s+1].pose,n.t,e[s+1].t-n.t))},Vr=(e,t,n,s)=>{const{cam:o,t:a}=Wt({camera:e,camera_more:t},n),r=jt(o,Math.max(0,a),s);return ge({x:r.x,y:r.y,z:r.z,fov:r.fov*180/Math.PI})},Nr={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},Ur={nl:"Camera",de:"Kamera",fr:"Caméra",it:"Telecamera"},Kn=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch","groundWash","groundGrain","grass","grassSway","horizonBushes"],$r=e=>Ee(e)?"vfx":e.layer,Zn=e=>Ee(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,Xn="application/x-lp-stage25d",nt=new Map,Et=new Map,Hr=e=>(Et.has(e)||Et.set(e,vr(e)),Et.get(e));function Gr(e){return nt.has(e)||nt.set(e,Yo(Ys(e)).catch(t=>{throw nt.delete(e),t})),nt.get(e)}const Wr=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function ni(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,a=null,r=null,i=new Map,c=new Map,f=0,h=null,v=0,M=0,y=performance.now(),g=!1,x=[],p=[],b={},F=new Set,k=null,A=null;const N=l=>Ee(l)?null:A.base+"thumbs/"+l.file;let j=null,Z=null,ee={},U=null,se=0,H=null,G=[],w=!1;const R=()=>{s.engine.runRenderLoop(()=>{const l=performance.now();M+=Math.min(.1,(l-y)/1e3),y=l,s.tick(l),o&&s.pose(o,ce(),M),s.scene.render(),U?.place()})},X=()=>{if(!o||!s)return;const l=(u,d)=>F.has(d)?{...u,opacity:0,keys:[]}:u;o={...o,set:{...o.set,groundBands:p.map((u,d)=>l(u,`band-${d}`)),skyLayer:b,layers:x.map((u,d)=>l(u,`layer-${d}`))}},s.rebind(o)},D=l=>{const u=/^band-(\d+)$/.exec(String(l??""));return u&&p[Number(u[1])]?Number(u[1]):-1},le=l=>l==="sky"?r?.set?.sky?{...b,depth:"sky"}:null:D(l)>=0?{...p[D(l)],depth:"bg"}:x[te(l)]??null,I=(l,u)=>{let d=null;if(l==="sky"&&r?.set?.sky){if(u.motion===void 0)return null;b={...b,motion:u.motion},d={skyLayer:{motion:u.motion}}}else if(D(l)>=0){const m=D(l);p=p.map((E,_)=>_===m?{...E,...u}:E),d={band:{index:m,...u}}}else if(x[te(l)]){const m=te(l);x=x.map((E,_)=>_===m?{...E,...u}:E),d=m}return d===null?null:(k=S(),X(),d)},S=()=>St({set:{layers:x,groundBands:p,skyLayer:b},camera:H,camera_more:G}),z=()=>o?Gt(o):8,T=()=>Or(H,G,z()),P=()=>Vr(H,G,ce(),z()),Y=l=>{const[u=null,...d]=Ir(l);H=u,G=d,o&&(o={...o,camera:H,camera_more:G}),k=S(),L.sceneId!=null&&t.onCommit?.(0,{camera:H,camera_more:G},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},K=l=>{if(!o)return;const u=ce(),d=T();if(window.__timelineKeying?.autoKey?.()||!d.length){const m=!d.length&&u>0?tt(d,0,P()):d;return Y(tt(m,u,l))}Y(tt(d,Br(d,u).t,l))},oe=()=>{let l=null;const u=m=>{m.preventDefault(),m.stopImmediatePropagation()};n.addEventListener("pointerdown",m=>{w&&(u(m),n.setPointerCapture?.(m.pointerId),l={x:m.clientX,y:m.clientY,pose:P()},n.style.cursor="grabbing")},{capture:!0}),n.addEventListener("pointermove",m=>{w&&(u(m),l&&K(Cr(l.pose,m.clientX-l.x,m.clientY-l.y,n.getBoundingClientRect().height)))},{capture:!0});const d=m=>{l&&(u(m),l=null,n.style.cursor=w?"grab":"")};n.addEventListener("pointerup",d,{capture:!0}),n.addEventListener("pointercancel",d,{capture:!0}),n.addEventListener("wheel",m=>{w&&(u(m),K(Dr(P(),m)))},{capture:!0,passive:!1}),window.addEventListener("scene-object-selected",m=>{m.detail?.id!=="s25_camera"&&L.frameCamera(!1)})},fe=()=>({...r.set,layers:x,groundBands:p,skyLayer:b}),ht=(l,u)=>{const d=I(l,u);d===null||L.sceneId==null||(typeof d=="number"?t.onCommit?.(d,u,L.sceneId):t.onCommit?.(0,d,L.sceneId))},ce=()=>h?h():f,ut=()=>r?.set?.sky&&A?i.get(r.set.sky)??_e(A,{asset:r.set.sky},"sky"):null,Ae=l=>{const u=i.get(x[l]?.asset);return!!(x[l]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&x[l].depth!=="sky")},Ps=l=>l==="sky"||D(l)>=0,Cs=(l,u)=>{const d=s?.pickBackdrops?.(l,u).find(E=>j.opaque(E.asset,E.u,E.v)),m=d?d.band!==void 0?`band-${d.band}`:`layer-${d.index}`:r?.set?.sky?"sky":null;return m&&L.select(m),!!m},Jt=(l,u)=>Me(u)||us(l,u),Qt=l=>{const u=i.get(x[l]?.asset);return!!u&&Jt(x[l],u)},Pe=l=>ye(x[l],ce()).z??Q[x[l].depth],Ds=l=>Ae(l)&&!(x[l].keys??[]).some(u=>u.scale!==void 0),en=l=>Math.round(l*1e3)/1e3,tn=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],L={canvas:n,sceneId:null,async show(l){const u=await Gr(l.bundle);if(g)return;s||(s=new qa(n,u),R()),ee={...l.look??{}},s.setLook(ee);const d=Wr(l);await s.build(d,u),o=d,x=d.set.layers,p=(d.set.groundBands??[]).map(m=>({...m})),b={...d.set.skyLayer??{}},H=d.camera,G=d.camera_more??[],F=new Set,k=St(l),r=l,i=new Map(u.assets.map(m=>[m.id,m])),A=u,j=Hr(u.base),j.prime(d.set.layers.map(m=>i.get(m.asset)).filter(Boolean)),t.editable&&!U&&(n.style.pointerEvents="auto",oe(),window.addEventListener("scene-object-selected",m=>{m.detail?.id!==`s25_${Z}`&&(Z=null)}),n.addEventListener("dragover",m=>{m.dataTransfer?.types?.includes(Xn)&&(m.preventDefault(),m.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",m=>{const E=m.dataTransfer?.getData(Xn);if(!E)return;m.preventDefault();const _=n.getBoundingClientRect();L.addLayer(E,{x:m.clientX-_.left,y:m.clientY-_.top})}),n.addEventListener("dblclick",()=>{const m=Z??(U?.selected!=null?`layer-${U.selected}`:null),E=m&&L.editTarget(m);E&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:E}))}),U=zr({canvas:n,host:e,stage:()=>s,alpha:{opaque:(m,E,_,V)=>j.opaque(m,E,_,Ee(m)?bs(m,x[V]?.play,ce()):void 0)},valueOf:(m,E)=>E==="z"?Pe(m):ye(x[m],ce())[E],onGround:Ae,byDistance:Ds,groundUnder:(m,E,_,V)=>Un(s.pointerRay(m,E),Qt(V)?_:C=>s.groundHeightAt(C)+_),footY:m=>s.layerFootY(m)-(Qt(m)?0:s.groundHeightAt(Pe(m))),eye:tn,onSettled:m=>L.settleBand(m),onEmpty:(m,E)=>Cs(m,E),onChange:(m,E,_)=>L.moveLayer(`layer-${m}`,E,_)})),(U?.selected??-1)>=x.length&&U.select(null),c=new Map(u.assets.map(m=>[m.id,m.height_m??1.7])),v=Number(l.narration_at_s)||0,a=Wn(l),e.dataset.stage25dReady="1"},editTarget(l){const u=l==="sky"?r?.set?.sky?b:null:D(l)>=0?p[D(l)]:x[te(l)],d=l==="sky"?ut():i.get(u?.asset);return!u||!d||!A?null:{id:`s25_${l}`,title:L.items().find(m=>m.id===l)?.label??ve({},d,(document.documentElement.lang||"en").slice(0,2)),original:A.base+d.file,state:u.edit_state??null,edited:!!u.src,el:e}},matches:l=>a===Wn(l),adopt(l){const u=St(l);if(u===k)return!1;k=u;const d=(m,E)=>{const _={...m};for(const V of Xt)E?.[V]===void 0?delete _[V]:_[V]=E[V];return _};return x=x.map((m,E)=>d(m,l.set?.layers?.[E])),p=p.map((m,E)=>d(m,l.set?.groundBands?.[E])),b=d(b,l.set?.skyLayer),H=l.camera??null,G=l.camera_more??[],o=o&&{...o,camera:H,camera_more:G},r=l,X(),!0},setLayerProp(l,u,d){I(l,{[u]:d})},setLayerKeys(l,u){const d=le(l);d&&JSON.stringify(d.keys??[])!==JSON.stringify(u)&&I(l,{keys:u})},commitLayerProp(l,u,d){ht(l,{[u]:d})},readLayerProp(l,u){const d=le(l),m=d?u==="z"&&te(l)>=0?Pe(te(l)):u==="z"?ye(d,ce()).z??d.z:ye(d,ce())[u]:null;return Number.isFinite(m)?m:null},setHidden(l,u){te(l)<0&&D(l)<0||(F=new Set(u?[...F,l]:[...F].filter(d=>d!==l)),X())},update(l){h=null,f=Math.max(0,l)},play(l){h=()=>v+l()},moveLayer(l,u,d){window.__timelineKeying?.edit?.(`s25:${l}`,u,d,{flush:!1})||L.commitLayerProp(l,u,d)},select(l){if(l==="camera"){Z=null,U?.select(null),L.frameCamera(!0),window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_camera"}}));return}L.frameCamera(!1),Z=Ps(l)?l:null,U?.select(te(l)>=0?te(l):null,!Z),Z&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${Z}`}}))},get skySelected(){return Z==="sky"},get backdrop(){return Z},get selection(){return U?.selected??null},clearSelection(){U?.select(null),L.frameCamera(!1)},frameCamera(l){w=!!l,n.style.cursor=w?"grab":"",window.dispatchEvent(new CustomEvent("stage25d-edited"))},cameraInfo:()=>({framing:w,moves:!!H,keys:T(),pose:P()}),setCameraValue(l,u){K({...P(),[l]:u})},toggleCameraKey(){const l=ce(),u=T();Y(u.some(d=>Math.abs(d.t-l)<.001)?Rr(u,l):tt(u,l,P()))},resetCamera(){Y([])},atStart(){return f===0&&h===null&&F.size===0&&!w},layerInfo(l){const u=(C,J)=>{const me=typeof C.motion=="string"?{kind:C.motion}:C.motion??{};return{kind:me.kind??fs(J),amount:me.amount??1,speed:me.speed??1}};if(l==="sky"){const C=ut();return C?{id:l,asset:C.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:ve({},C,(document.documentElement.lang||"en").slice(0,2)),file:b.src??`${A.base}${C.file}`,motion:u(b,C)}:null}if(D(l)>=0){const C=p[D(l)],J=i.get(C.asset);return{id:l,asset:C.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:L.items().find(me=>me.id===l)?.label??"",file:C.src??(J?`${A.base}${J.file}`:null),motion:u(C,J)}}const d=x[te(l)];if(!d)return null;const m=i.get(d.asset)??null,E=Ae(te(l)),_=!E||(d.scale??1)!==1||(d.keys??[]).some(C=>C.scale!==void 0),V=m?.layer==="bg"&&!m.tileable_x;return{id:l,asset:d.asset??null,depth:d.depth,figure:d.figure??null,role:m?.layer??null,ground:E,showScale:_,fields:E?["x","z",..._?["scale"]:[],"rotation","opacity"]:["x",...V?["z"]:[],"y","scale","rotation","opacity"],label:L.items().find(C=>C.id===l)?.label??ve(d,m,(document.documentElement.lang||"en").slice(0,2)),file:d.src??(m?`${A.base}${m.file}`:null),motion:u(d,m),anim:Zn(m),play:{speed:d.play?.speed??1,offset:d.play?.offset??0}}},setLayerPlay(l,u){const d=le(l);d&&ht(l,{play:{...d.play??{},...u}})},setLayerMotion(l,u){const d=le(l);d&&ht(l,{motion:{...typeof d.motion=="object"?d.motion:{kind:d.motion},...u}})},reorderLayers(l,u,d){if(!Ae(u)){d(l,u,L.sceneId,null,null,null);return}const m=be=>x[be]?.z??Q[x[be]?.depth],E=l.filter(be=>be===u||Ae(be)),_=E.indexOf(u),V=E[_-1],C=E[_+1],J=Pe(u),me=V===void 0?0:m(V),dt=C===void 0?1/0:m(C);if((V!==void 0||C!==void 0)&&(J<me||J>dt)){const be=Ut(ye(x[u],ce()).x,J),Os=V===void 0?dt/1.25:C===void 0?me*1.25:(me+dt)/2,Ze=Math.round(Math.min(ne.cells[1][1],Math.max(ne.cells[0][1],Os))*100)/100,ft=tn(),Rs=(Ze-ft[1])/Math.max(.1,J-ft[1]),nn=he=>en(Math.min(20,Math.max(.01,he*Rs))),Bs=x[u].keys?.some(he=>he.z!==void 0||he.scale!==void 0)?x[u].keys.map(he=>({...he,...he.z!==void 0&&{z:Math.min(ne.cells[1][1],Math.max(ne.cells[0][1],en(he.z+Ze-J)))},...he.scale!==void 0&&{scale:nn(he.scale)}})):null;d(l,u,L.sceneId,it(Zt(be,Ze,ft)).x,Ze,nn(x[u].scale??1),Bs);return}d(l,u,L.sceneId,x[u].x??.5,m(u),x[u].scale??1)},library(){if(!A)return null;const l=(document.documentElement.lang||"en").slice(0,2);return{bundle:A.bundle,assets:A.assets.filter(u=>u.kind!=="sheet").map(u=>({id:u.id,layer:u.layer,shelf:$r(u),anim:Zn(u),band:Ot(u),tags:u.tags??[],url:A.base+u.file,thumb:N(u),label:ve({},u,l)}))}},tiles:l=>Ls(l),seriesOfLayer(l){const u=i.get(x[te(l)]?.asset),d=Ye(u);if(!d||!A)return null;const m=(document.documentElement.lang||"en").slice(0,2),E=_=>({id:_.id,url:A.base+_.file,thumb:N(_),...Le(_)});return{series:d,asset:u.id,members:mr(A.assets,u).map(E),characters:pr(A.assets).map(_=>({series:_.series,url:A.base+_.asset.file,thumb:N(_.asset),label:ve({},_.asset,m)}))}},async switchCharacter(l,u){const d=i.get(x[te(l)]?.asset),m=d&&A?gr(A.assets,d,u):null;m&&await L.swapAsset(l,m.id)},async swapAsset(l,u){if(l==="sky"){if(i.get(u)?.layer!=="sky"||ut()?.id===u)return;await L.show({...r,set:{...fe(),sky:u}}),L.sceneId!=null&&t.onCommit?.(0,{sky:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const d=p[D(l)];if(d){const E=i.get(u);if(!E||!Ot(E)||d.asset===u)return;const _=Number(l.slice(5)),V=p.map((C,J)=>J===_?{...C,asset:u}:C);await L.show({...r,set:{...fe(),groundBands:V}}),L.sceneId!=null&&t.onCommit?.(0,{band:{index:_,asset:u}},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L.select(l);return}const m=te(l);m<0||!x[m]||!i.has(u)||x[m].asset===u||(x=x.map((E,_)=>_===m?{...E,asset:u}:E),await L.show({...r,set:fe()}),t.onCommit?.(m,{asset:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(l,u=null){const d=i.get(l);if(!d)return;const m=["mid","fg","near","bg","sky"].includes(d.layer)?d.layer:d.layer==="figure"?"fg":"mid",E=u?0:x.filter(V=>V.asset===l).length;let _={asset:l,depth:m,x:.5+.08*(E%5),scale:1};if(!(d.tileable_x||d.layer==="bg"||d.layer==="sky")){const V=u&&s?Un(s.pointerRay(u.x,u.y),Jt({},d)?0:J=>s.groundHeightAt(J)):null,C=it(Nt(V??Ut(_.x,Q[m])));_={..._,...C,depth:fn(C.z)}}x=[...x,_],await L.show({...r,set:fe()}),t.onCommit?.(x.length-1,{add:_},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),U?.select(x.length-1,!0)},async settleBand(l){const u=x[l];if(!u||!Ae(l))return;const d=fn(Pe(l));if(d===u.depth)return;x=x.map((E,_)=>_===l?{...E,depth:d}:E);const m=F;await L.show({...r,set:fe()}),F=m,X(),L.sceneId!=null&&t.onCommit?.(l,{depth:d},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),U?.select(l,!1)},groundSlots(){if(!A||!r)return null;const l=(document.documentElement.lang||"en").slice(0,2),u=gs(r.set??{},A).map(m=>({asset:m.asset.id,from_m:m.from})),d=A.assets.filter(m=>m.layer==="ground").map(m=>({id:m.id,label:ve({},m,l),thumb:N(m)}));return{rows:u,options:d,max:Bt}},async setGroundSlots(l){if(!r||!Array.isArray(l))return;const u=l.slice(0,Bt).map((m,E)=>({asset:String(m.asset),from_m:E===0?0:Math.max(0,Math.min(2e3,Number(m.from_m)||0))})),d=F;await L.show({...r,look:ee,set:{...fe(),groundSlots:u}}),F=d,X(),L.sceneId!=null&&t.onGroundSlots?.(u,L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},lookControls(){return Kn.map(l=>{const[u,d,m]=Ma[l]??[0,1,.01];return{key:l,min:u,max:d,step:m,value:ae({...Vt,...ee},l)}})},setLook(l,u){!Kn.includes(l)||!Number.isFinite(u)||!s||(ee={...ee,[l]:u},s.setLook(ee),t.onLook?.(l,u,L.sceneId))},async still(l=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const d=document.createElement("canvas");return d.width=l,d.height=Math.max(1,Math.round(l*n.height/n.width)),d.getContext("2d").drawImage(n,0,0,d.width,d.height),d.toDataURL("image/jpeg",.72)};return s.engine.resize(),se++,s.gridHidden=!0,new Promise(d=>{let m=0;const E=C=>{s.engine.onEndFrameObservable.remove(_),clearTimeout(V),s.gridHidden=--se>0,d(C)},_=s.engine.onEndFrameObservable.add(()=>{++m>=6&&E(u())}),V=setTimeout(()=>E(null),4e3)})},get config(){return r},figureBox(l){const u=x.find(_=>_.figure===l);if(!u?.asset)return null;const d=rr(o,u,c.get(u.asset)??1.7,ce());if(!d)return null;const m=n.getBoundingClientRect(),E=m.width*.05;return new DOMRect(m.left+d.x*m.width-E/2,m.top+d.y*m.height,E,m.height*.08)},items:()=>{const l=(document.documentElement.lang||"en").slice(0,2),u=ur([...x.map((d,m)=>ve(d,i.get(d.asset),l)||`layer ${m+1}`),...p.map(d=>ve({},i.get(d.asset)??{id:d.asset},l))]);return[...x.map((d,m)=>({id:`layer-${m}`,label:u[m],icon:fr(i.get(d.asset)),depth:d.depth,z:d.z??Q[d.depth],keys:d.keys??[]})),...p.map((d,m)=>({id:`band-${m}`,label:u[x.length+m],icon:"photo",depth:"bg",z:d.z,keys:d.keys??[],backdrop:!0})),...r?.set?.sky?[{id:"sky",label:Nr[l]??"Sky",icon:"cloud",depth:"sky",keys:b.keys??[],backdrop:!0}]:[],{id:"camera",label:Ur[l]??"Camera",icon:"camera",depth:null,keys:[]}]},destroy(){g=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}U?.destroy(),n.remove()}};return L}export{Xn as DROP_TYPE,Kn as LOOK_KEYS,ni as createStage25d,Wr as stageScene};
