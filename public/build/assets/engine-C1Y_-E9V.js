import{m as Hs,c as Gs,M as ht,S as Ze,R as ns,C as be,T as ge,V as N,E as le,a as Wt,b as Pe,P as Ws,d as rn,e as ln,f as ss,g as js,h as Ys,i as Ks,j as os,U as Xs,H as Zs,D as qs}from"./babylon-DoYGJMOP.js";import{l as Js}from"./config-DwQUN7uY.js";import{handleCss as Qs}from"./ArtworkOverlay-CC46y7G0.js";import{g as Ft,c as eo,w as cn,h as to,e as no}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-BlhrRg0J.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-Ck456Vwm.js";import"./ambient-CEzLlAaX.js";import"./alpha-mask-C1RIm4VB.js";const Ge=new Set;let Tt=!1;function so(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;Ge.size&&Ge.clear();let a=as(e,0,o,n,!0);const r=[];if(!a||a.next===a.prev)return r;let i=0,c=0,m=0;if(s&&(a=lo(e,t,a,n)),e.length>80*n){i=e[0],c=e[1];let h=i,v=c;for(let k=n;k<o;k+=n){const w=e[k],g=e[k+1];w<i&&(i=w),g<c&&(c=g),w>h&&(h=w),g>v&&(v=g)}m=Math.max(h-i,v-c),m=m!==0?32767/m:0}return Lt(a,r,i,c,m),r}function as(e,t,n,s,o){let a=null;if(o===ko(e,t,n,s)>0)for(let r=t;r<n;r+=s)a=dn(r/s|0,e[r],e[r+1],a);else for(let r=n-s;r>=t;r-=s)a=dn(r/s|0,e[r],e[r+1],a);return a&&We(a,a.next)&&(Ye(a),a=a.next),a}function Ee(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&(Ge.size===0||!Ge.has(s))&&(We(s,s.next)||Y(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),Tt=!0,Ye(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function Lt(e,t,n,s,o){o&&go(e,n,s,o);let a=e,r=!1;for(;e.prev!==e.next;){const i=e.prev,c=e.next;if(Y(i,e,c)<0&&(o?ao(e,n,s,o):oo(e))){t.push(i.i,e.i,c.i),Ye(e),e=c,a=c;continue}if(e=c,e===a){if(Tt=!1,e=Ee(e),Tt){a=e;continue}if(!r){e=ro(e,t),a=e,r=!0;continue}io(e,t,n,s,o);break}}}function oo(e){const t=e.prev,n=e,s=e.next,o=t.x,a=n.x,r=s.x,i=t.y,c=n.y,m=s.y,h=Math.min(o,a,r),v=Math.min(i,c,m),k=Math.max(o,a,r),w=Math.max(i,c,m);let g=s.next;for(;g!==t;){if(g.x>=h&&g.x<=k&&g.y>=v&&g.y<=w&&!(o===g.x&&i===g.y)&&it(o,i,a,c,r,m,g.x,g.y)&&Y(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function ao(e,t,n,s){const o=e.prev,a=e,r=e.next,i=o.x,c=a.x,m=r.x,h=o.y,v=a.y,k=r.y,w=Math.min(i,c,m),g=Math.min(h,v,k),y=Math.max(i,c,m),F=Math.max(h,v,k),p=Dt(w,g,t,n,s),E=Dt(y,F,t,n,s);let x=e.prevZ;for(;x&&x.z>=p;){if(x.x>=w&&x.x<=y&&x.y>=g&&x.y<=F&&x!==r&&!(i===x.x&&h===x.y)&&it(i,h,c,v,m,k,x.x,x.y)&&Y(x.prev,x,x.next)>=0)return!1;x=x.prevZ}let A=e.nextZ;for(;A&&A.z<=E;){if(A.x>=w&&A.x<=y&&A.y>=g&&A.y<=F&&A!==r&&!(i===A.x&&h===A.y)&&it(i,h,c,v,m,k,A.x,A.y)&&Y(A.prev,A,A.next)>=0)return!1;A=A.nextZ}return!0}function ro(e,t){let n=e,s=!1;do{const o=n.prev,a=n.next.next;ls(o,n,n.next,a,!1)&&je(o,a)&&je(a,o)&&(t.push(o.i,n.i,a.i),Ye(n),Ye(n.next),n=e=a,s=!0),n=n.next}while(n!==e);return s?Ee(n):n}function io(e,t,n,s,o){let a=e;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&vo(a,r)){let i=cs(a,r);a=Ee(a,a.next),i=Ee(i,i.next),Lt(a,t,n,s,o),Lt(i,t,n,s,o);return}r=r.next}a=a.next}while(a!==e)}let Ct=!1;function lo(e,t,n,s){const o=[];for(let a=0,r=t.length;a<r;a++){const i=t[a]*s,c=a<r-1?t[a+1]*s:e.length,m=as(e,i,c,s,!1);m===m.next&&Ge.add(m),o.push(yo(m))}o.sort(co),uo(e.length/s,t.length),is(n,n),Ct=!0;for(let a=0;a<o.length;a++)n=ho(o[a],n);return Ct=!1,Ee(n)}function co(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function ho(e,t){const n=mo(e,t);if(!n)return t;const s=cs(n,e),o=s.next;return is(n,o.next),Ee(s,s.next),Ee(n,n.next)}const rs=16;let W=new Float64Array(0),rt=0;const Pt=[],Ot=[];function uo(e,t){const n=Math.ceil((e+2*t)/rs)+t+2;W.length<n*4&&(W=new Float64Array(n*4)),rt=0}function is(e,t){let n=e;do{const s=rt++;Pt[s]=n;let o=1/0,a=1/0,r=-1/0,i=-1/0,c=0;do{const h=n.next;n.z=s,n.x<o&&(o=n.x),n.x>r&&(r=n.x),n.y<a&&(a=n.y),n.y>i&&(i=n.y),h.x<o&&(o=h.x),h.x>r&&(r=h.x),h.y<a&&(a=h.y),h.y>i&&(i=h.y),n=h}while(++c<rs&&n!==t);Ot[s]=n;const m=s*4;W[m]=o,W[m+1]=a,W[m+2]=r,W[m+3]=i}while(n!==t)}function fo(e,t){const n=e.z*4;t.x<W[n]&&(W[n]=t.x),t.y<W[n+1]&&(W[n+1]=t.y),t.x>W[n+2]&&(W[n+2]=t.x),t.y>W[n+3]&&(W[n+3]=t.y)}function hn(e){let t=Ot[e];for(;t.prev.next!==t;)t=t.next;return Ot[e]=t,t}function un(e){let t=Pt[e];for(;t.prev.next!==t;)t=t.next;return Pt[e]=t,t}function mo(e,t){let n=t;const s=e.x,o=e.y;let a=-1/0,r;if(We(e,n))return n;for(let k=0,w=0;k<rt;k++,w+=4){if(o<W[w+1]||o>W[w+3]||W[w]>s||W[w+2]<=a)continue;const g=hn(k);n=un(k);do{if(n.prev.next===n){if(We(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const y=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(y<=s&&y>a&&(a=y,r=n.x<n.next.x?n:n.next,y===s))return r}}n=n.next}while(n!==g)}if(!r)return null;const i=r.x,c=r.y,m=Math.min(o,c),h=Math.max(o,c);let v=1/0;for(let k=0,w=0;k<rt;k++,w+=4){if(W[w+2]<i||W[w]>s||W[w+3]<m||W[w+1]>h)continue;const g=hn(k);n=un(k);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&it(o<c?s:a,o,i,c,o<c?a:s,o,n.x,n.y)){const y=Math.abs(o-n.y)/(s-n.x);(je(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(y<v||y===v&&(n.x>r.x||n.x===r.x&&po(r,n)))&&(r=n,v=y)}n=n.next}while(n!==g)}return r}function po(e,t){return Y(e.prev,e,t.prev)<0&&Y(t.next,e,e.next)<0}const ie=[];let Re=[],Me=new Uint32Array(0),Ie=new Uint32Array(0);const Be=new Uint32Array(256);function go(e,t,n,s){let o=e,a=0;do o.z=Dt(o.x,o.y,t,n,s),ie[a++]=o,o=o.next;while(o!==e);xo(a);let r=null;for(let i=0;i<a;i++){const c=ie[i];c.prevZ=r,r&&(r.nextZ=c),r=c}r.nextZ=null}function xo(e){if(e<=32){for(let t=1;t<e;t++){const n=ie[t],s=n.z;let o=t-1;for(;o>=0&&ie[o].z>s;)ie[o+1]=ie[o],o--;ie[o+1]=n}return}Me.length<e&&(Me=new Uint32Array(e),Ie=new Uint32Array(e),Re=new Array(e));for(let t=0;t<e;t++)Me[t]=ie[t].z;Je(e,ie,Me,Re,Ie,0),Je(e,Re,Ie,ie,Me,8),Je(e,ie,Me,Re,Ie,16),Je(e,Re,Ie,ie,Me,24)}function Je(e,t,n,s,o,a){Be.fill(0);for(let i=0;i<e;i++)Be[n[i]>>>a&255]++;let r=0;for(let i=0;i<256;i++){const c=Be[i];Be[i]=r,r+=c}for(let i=0;i<e;i++){const c=n[i],m=Be[c>>>a&255]++;s[m]=t[i],o[m]=c}}function Dt(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function yo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function it(e,t,n,s,o,a,r,i){return(o-r)*(t-i)>=(e-r)*(a-i)&&(e-r)*(s-i)>=(n-r)*(t-i)&&(n-r)*(a-i)>=(o-r)*(s-i)}function vo(e,t){const n=We(e,t)&&Y(e.prev,e,e.next)>0&&Y(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||je(e,t)&&je(t,e)&&(Y(e.prev,e,t.prev)!==0||Y(e,t.prev,t)!==0))&&!wo(e,t)&&(n||bo(e,t))}function Y(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function We(e,t){return e.x===t.x&&e.y===t.y}function ls(e,t,n,s,o=!0){const a=Y(e,t,n),r=Y(e,t,s),i=Y(n,s,e),c=Y(n,s,t);return(a>0&&r<0||a<0&&r>0)&&(i>0&&c<0||i<0&&c>0)?!0:o?!!(a===0&&Qe(e,n,t)||r===0&&Qe(e,s,t)||i===0&&Qe(n,e,s)||c===0&&Qe(n,t,s)):!1}function Qe(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function wo(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let r=e;do{const i=r.next;if(r.x>s&&i.x>s||r.x<n&&i.x<n||r.y>a&&i.y>a||r.y<o&&i.y<o){r=i;continue}if(r.i!==e.i&&i.i!==e.i&&r.i!==t.i&&i.i!==t.i&&ls(r,i,e,t))return!0;r=i}while(r!==e);return!1}function je(e,t){return Y(e.prev,e,e.next)<0?Y(e,t,e.next)>=0&&Y(e,e.prev,t)>=0:Y(e,t,e.prev)<0||Y(e,e.next,t)<0}function bo(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const r=n.next;n.y>a!=r.y>a&&o<(r.x-n.x)*(a-n.y)/(r.y-n.y)+n.x&&(s=!s),n=r}while(n!==e);return s}function cs(e,t){const n=Rt(e.i,e.x,e.y),s=Rt(t.i,t.x,t.y),o=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,a.next=s,s.prev=a,s}function dn(e,t,n,s){const o=Rt(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function Ye(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),Ct&&fo(e.prev,e.next)}function Rt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function ko(e,t,n,s){let o=0;for(let a=t,r=n-s;a<n;a+=s)o+=(e[r]-e[a])*(e[a+1]+e[r+1]),r=a;return o}Object.assign(window,{BABYLON:{...Gs,...Hs},earcut:so});(()=>{const e=`
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
    }`})();const Mo=new WeakMap;function So(e){return Mo.get(e)?.rtt??null}const Eo=450,fn=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],mn=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],pn={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},Ao={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function _o(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),r=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(x=>x.name!=="sky-cloud"&&!(x.metadata&&x.metadata.noGBuffer)))}),i=a.getGBuffer().textures,c=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],m=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=x=>new BABYLON.Vector2(1/x.width,1/x.height),v=new BABYLON.Matrix,k=["invView","tanHalf","resolution","skyDepth"],w=["depthSampler","normalSampler"];function g(x,A){t.getViewMatrix().invertToRef(v);const $=Math.tan(t.fov/2);x.setMatrix("invView",v),x.setVector2("tanHalf",new BABYLON.Vector2($*A.width/A.height,$)),x.setVector2("resolution",new BABYLON.Vector2(A.width,A.height)),x.setFloat("skyDepth",Eo),x.setTexture("depthSampler",c),x.setTexture("normalSampler",m)}const y=new BABYLON.PostProcess("wash","wash",["texel","radius",...k],w,1,t);y.onApply=x=>{g(x,y),x.setVector2("texel",h(y)),x.setFloat("radius",n.num("wash"))};const F=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...fn,...k],["aquarelSampler",...w],1,t);F.onApply=x=>{g(x,F),x.setVector2("texel",h(F));const A=n.texture();x.setFloat("useTex",A?1:0),x.setTexture("aquarelSampler",A||s),fn.forEach($=>x.setFloat($,n.num($)))};const p=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...mn,...k],["washSampler","animeSampler",...w],1,t);p.onApply=x=>{g(x,p),x.setTextureFromPostProcessOutput("washSampler",y),x.setTexture("animeSampler",So(e)||o),x.setVector2("texel",h(p)),mn.forEach(A=>x.setFloat(A,n.num(A))),x.setColor3("inkColor",BABYLON.Color3.FromArray(pn[n.inkColor()]||pn["blue-grey"]))};const E=[y,F,p];return{dispose(){E.forEach(x=>x.dispose(t)),e.onBeforeRenderObservable.remove(r),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const ee={sky:380,bg:70,mid:22,fg:7,near:3.5},D={x:0,y:1.6,z:0,fov:50},ut=-2,hs=16/9,us=.42,gt=1.6,zo=3,ds=e=>zo*fe(e),Fo=(e,t)=>t*e,To=(e,t,n,s)=>Fo(e,t)-(1-s)*n,Ke=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Lo=999,Co=1e3,Po=.02,fs=2,jt=120,ms=.05,de=e=>e>Math.PI?e*Math.PI/180:e,fe=(e,t=D.fov,n=hs)=>2*e*Math.tan(de(t)/2)*n;function gn(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const xn=e=>e.z??ee[e.depth],Oo=e=>Math.min(1,Math.max(0,(e-ee.mid)/(ee.bg-ee.mid)));function It(e,t){return e<=ee.bg||t===0?Oo(e)*t:D.y+(t-D.y)*e/ee.bg}const Do=(e,t)=>t?e+t.h*(1-t.top):e,Ro=["ground","path","field","ramp","water"],Se=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Ro.includes(t)),Io=2,Bt=e=>Se(e)&&e.w/Math.max(1,e.h)>=Io,ps=(e,t,n,s)=>Math.min(0,To(e,t,n,s)),yn=[2,2e3],Bo=4,vn=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??D.z,n?.to?.z??D.z),D.z);function Vo(e,t,n,s,o,a,r=D.z){const i=we({...e},t),c=Math.min(yn[1],Math.max(yn[0],i.z??e.z)),m=Math.max(c,r+Bo),h=ds(m)/s,v=o*h*i.scale;return{z:m,h:v,w:s*h*i.scale,sx:h*i.scale,sy:h*i.scale,x:(i.x-.5)*fe(m),y:ps(m,n,v,a),alphaIndex:Ke(c),opacity:i.opacity}}const gs=(e,t)=>!!e.flat||t.layer==="ground";function Ve(e,t,n,s=0,o=s){const a=t.depth,r=xn(t)-n*ms,i=fe(r),c=a==="sky"?n*2+1:Ke(r);if(e.layer==="sky"){const F=i*gt,p=F/hs,E=-p*.12+(t.y??0);if(e.tileable_x)return{x:0,y:E,z:r,w:F,h:p,uRepeat:F/(p*(e.w/e.h)),alphaIndex:c,rotation:0};const x=Math.max(F/e.w,p/e.h);return{x:0,y:E,z:r,w:e.w*x,h:e.h*x,uRepeat:1,alphaIndex:c,rotation:0}}const m=e.layer==="bg"&&!e.tileable_x?i*gt*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),m),v=h*(e.w/e.h),k=e.tileable_x?Math.max(v,i*gt):v,w=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?a==="bg"?s:0:Se(e)?0:It(xn(t),o),y=a==="sky"?r*Math.tan(de(D.fov)/2)*.45:g;return{x:w,y:y+(t.y??0),z:r,w:k,h,uRepeat:e.tileable_x?k/v:1,alphaIndex:c,rotation:t.rotation??0}}function No(e,t,n=0,s=us,o=ut){const a=.5/Math.tan(de(D.fov)/2),r=.5+a*Math.tan(-o*Math.PI/180),i=ee.bg-n*ms,c=D.y+(r-s)*i/a;return Math.round((c-t*(1-e))*10)/10}const et=e=>e-Uo,Uo=.002,wn={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},xs=(e,t)=>(wn[e??"inOut"]??wn.inOut)(Math.min(1,Math.max(0,t))),Te=(e,t,n)=>e+(t-e)*n,Yt=e=>e.dur_s??(e.camera&&qo(e)||e.est_s||8);function Kt(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function Xt(e,t,n){if(!e)return{...D,fov:de(D.fov)};const s=xs(e.ease,n>0?t/(e.dur_s??n):1),o={...D,...e.from},a={...o,...e.to};return{x:Te(o.x,a.x,s),y:Te(o.y,a.y,s),z:Te(o.z,a.z,s),fov:Te(de(o.fov),de(a.fov),s),roll:Te(o.roll??0,a.roll??0,s)}}const $o={sway:{x:.08,y:.05,roll:1.6,hz:.18},handheld:{x:.02,y:.02,roll:.25,hz:.35},shake:{x:.05,y:.05,roll:.6,hz:6}},xt=(e,t)=>(Math.sin(e*1+t)+.6*Math.sin(e*2.17+t*2.3)+.3*Math.sin(e*3.71+t*4.1))/1.9;function Ho(e,t){const n=e?.kind;if(!n||n==="none")return{x:0,y:0,roll:0};const s=$o[n],o=e.amount??1,a=t*s.hz*(e.speed??1)*2*Math.PI;return{x:s.x*o*xt(a,1),y:s.y*o*xt(a,2),roll:s.roll*o*xt(a,3)}}const Go=["x","y","z","scale","opacity","rotation"];function we(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const a of Go){const r=s.filter(k=>k[a]!==void 0).sort((k,w)=>k.t-w.t);if(!r.length)continue;const i=r[0],c=r[r.length-1];if(t<=i.t){o[a]=i[a];continue}if(t>=c.t){o[a]=c[a];continue}const m=r.findIndex(k=>k.t>t),h=r[m-1],v=r[m];o[a]=Te(h[a],v[a],xs("inOut",(t-h.t)/(v.t-h.t)))}return o}const Wo={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},ys=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function bn(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??ys(e),amount:n.amount??1,speed:n.speed??1}}const jo=.25,Yo=2e3,Ko=250,Fe={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},kn={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function Xo(e,t,n,s){const o=i=>{const c=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:c,lastUp:i===-1?n:e.lastUp,locked:e.locked||c>=Fe.lockFlips&&i===1}};if(t<Fe.downFps)return s?o(1):{...e,fast:0};if(t<Fe.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=Fe.upWindows&&n-e.lastChange>=Fe.upAfterChangeMs&&n-e.lastUp>=Fe.upEveryMs?o(-1):{...e,fast:a}}function Zo(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*jo)}function qo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const Mn={breath_m:.05,breath_s:7},Jo=1.5;function Qo(e,t,n={}){const s=n.breath_m??Mn.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??Mn.breath_s),a=Math.min(1,t/Jo),r=a*a*(3-2*a);return{...e,x:e.x+s*r*Math.sin(o*t),y:e.y+s*.5*r*Math.sin(2*o*t)}}async function ea(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const ta=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Ce(e,t,n){if(t.asset){const r=e.assets.find(i=>i.id===t.asset);if(r)return r}const s=ta(t.need??t.asset??"");if(!s.length)return null;let o=null,a=[0,0,0];for(const r of[...e.assets].sort((i,c)=>i.id.localeCompare(c.id))){const i=s.filter(m=>r.tags.some(h=>h.toLowerCase()===m)).length;if(!i)continue;const c=[i,n&&r.layer===n?1:0,r.qa?.score??0];(!o||c[0]>a[0]||c[0]===a[0]&&(c[1]>a[1]||c[1]===a[1]&&c[2]>a[2]))&&(o=r,a=c)}return o}const Le="#f6f5ee",na=.22,sa=(e,t)=>e.layer==="bg"?t.feather??na:0,yt=.6,Vt=12;function vs(e,t){const n=t.paper??Le,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(r=>r.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((r,i)=>r.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const a=Ce({...t,assets:o},{asset:s},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function oa(e,t,n,s=.08){return ws(e,t,n,1-s,1)}function ws(e,t,n,s,o){const a=Math.max(0,Math.floor(n*s)),r=Math.min(n,Math.max(a+1,Math.ceil(n*o))),i=[[],[],[]],c=Math.max(1,Math.floor(t*(r-a)/2e4));for(let h=a*t;h<r*t;h+=c){const v=h*4;e[v+3]<200||(i[0].push(e[v]),i[1].push(e[v+1]),i[2].push(e[v+2]))}if(!i[0].length)return null;const m=h=>{const v=[...h].sort((k,w)=>k-w);return v[v.length>>1]/255};return[m(i[0]),m(i[1]),m(i[2])]}const He=32,aa=(e,t,n)=>Array.from({length:He},(s,o)=>ws(e,t,n,o/He,(o+1)/He)),ra=(e,t)=>e[Math.min(He-1,Math.max(0,Math.floor((1-t)*He)))]??null;function ia(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=o){const r=a*4;if(e[r+3]<230)continue;const i=(.299*e[r]+.587*e[r+1]+.114*e[r+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((a,r)=>a-r),s[s.length>>1])}function la(e,t,n){const s=[];for(let o=0;o<t;o++)for(let a=0;a<n;a++)if(e[(a*t+o)*4+3]>128){s.push(a/n);break}return s.length?(s.sort((o,a)=>o-a),s[s.length>>1]):0}function ca(e,t,n){for(let s=0;s<n;s++){let o=0;for(let a=0;a<t;a++)e[(s*t+a)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const ha=1.6,ua=.12;function Sn(e,t,n,s){const o=e.layer==="figure",a=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),r=a*ua*s/ha;return o?{w:a,d:Math.min(r,a*.5)}:{w:a,d:Math.min(Math.max(r,a*.3),a*3)}}const da=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Ne=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Nt=6;function bs(e,t){const n=t.assets.filter(a=>a.layer==="ground"),s=(e.groundSlots??[]).map(a=>({asset:n.find(r=>r.id===a.asset),from:Math.max(0,Number(a.from_m)||0)})).filter(a=>!!a.asset).sort((a,r)=>a.from-r.from).slice(0,Nt);if(s.length)return s.map((a,r)=>r===0?{...a,from:0}:a);const o=vs(e,t);return o.kind==="asset"?[{asset:o.asset,from:0}]:[]}const fa=(e,t)=>Math.max(0,e.reduce((n,s,o)=>t>=s.from?o:n,0)),Zt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,ks=Zt;le.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;const ma=[1,2,3,4,5].map(e=>`
    if (slotCount > ${e}.5) { float k${e} = smoothstep(slotFrom[${e}] * 0.85, slotFrom[${e}] * 1.15 + 0.5, dn); c = mix(c, slotTile(tex${e}, slotTiles[${e}]), k${e}); own = mix(own, slotColour[${e}], k${e}); }`).join("");le.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, tex1, tex2, tex3, tex4, tex5, nearTex;
  uniform float useTex, grain, fadeNear, fadeFar, detail, vary, mixTile, tileScale, wash, grainSize, slotCount;
  uniform float slotFrom[6], slotTiles[6];
  uniform vec3 slotColour[6];   // each slot's own median colour: its far floor fades into it, not into one tint
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${Zt}
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
      c = slotTile(tex, slotTiles[0]); own = slotColour[0];${ma}
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
  }`;le.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;le.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${Zt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const pa=e=>e?ge.WRAP_ADDRESSMODE:ge.MIRROR_ADDRESSMODE;function ga(e){const t=ht.CreateGround("ground",{width:2400,height:2400},e),n=new Ze("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tileScale","wash","grainSize","slotCount","slotFrom","slotTiles","slotColour","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","tex1","tex2","tex3","tex4","tex5","nearTex"],needAlphaBlending:!0}),s=new ns(new Uint8Array([255,255,255,255]),1,1,be.TEXTUREFORMAT_RGBA,e);for(const o of Ue)n.setTexture(o,s);return n.setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0).setFloat("tileScale",1).setFloat("wash",.5).setFloat("grainSize",1),t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Lo,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){const a=o.slots.slice(0,Ue.length);a.forEach(i=>{i.tex.wrapU=ge.WRAP_ADDRESSMODE,i.tex.wrapV=ge.WRAP_ADDRESSMODE}),Ue.forEach((i,c)=>n.setTexture(i,a[c]?.tex??s));const r=(i,c)=>Ue.map((m,h)=>a[h]?i(a[h]):c);n.setFloat("useTex",a.length?1:0).setFloat("slotCount",a.length).setFloats("slotFrom",r(i=>i.from,1e6)).setFloats("slotTiles",r(i=>i.tile||Vt,Vt)).setArray3("slotColour",Ue.flatMap((i,c)=>a[c]?.colour??o.base)).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",N.FromArray(o.base)).setVector3("horizonTint",N.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tileScale",o.tileScale).setFloat("wash",o.wash).setFloat("grainSize",o.grainSize)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=pa(o.tileable),o.tex.wrapV=ge.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}const Ue=["tex","tex1","tex2","tex3","tex4","tex5"];let xa=0;function En(e,t,n,s,o){const a=ht.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(a.rotation.x=Math.PI/2,o){const[i,c]=o.dir,m=Math.hypot(i,c)||1;a.rotation.y=Math.atan2(i/m,c/m),a.position.set(i/m*o.length*.42,.015,c/m*o.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const r=new Ze(a.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return r.alphaMode=be.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,r.setFloat("seed",xa++*7.31%97).setFloat("opacity",0),a.material=r,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:i=>{r.setFloat("opacity",i),a.isVisible=i>.001}}}le.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;le.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${ks}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;le.ShadersStore.stageBirdFragmentShader=`
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
  }`;function Ms(e,t,n,s){const o=ht.CreatePlane(e,{size:1},n),a=new Ze(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=be.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,o.material=a,o.billboardMode=Wt.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:a}}const Ss=9,ya=9;function va(e,t,n,s){const o=Array.from({length:Ss},(a,r)=>{const i=Ms(`smoke:${r}`,"stagePuff",e,s);return i.mat.setFloat("seed",r*3.7),i});return{update(a,r){o.forEach(({mesh:i,mat:c},m)=>{const h=wa(a,m),v=n*(.6+3.2*h);i.scaling.setAll(v),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(m*2.1+a*.3),t.y+n*(.4+7*h),t.z),c.setFloat("alpha",r*.7*Math.sin(Math.PI*h)),i.isVisible=r>.001})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const wa=(e,t)=>((e/ya+t/Ss)%1+1)%1,vt=40,An=16;function ba(e){const t=(e%vt+vt)%vt;return t<An?t/An:null}function ka(e,t,n,s){const o=Array.from({length:6},(a,r)=>Ms(`bird:${r}`,"stageBird",e,s));return{update(a,r){const i=ba(a),c=Math.round(2+r*4);o.forEach(({mesh:m,mat:h},v)=>{if(m.isVisible=r>.001&&i!==null&&v<c,!m.isVisible||i===null)return;const k=v*.025;m.position.set((i-k-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*i,t+v*1.5),m.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,r*2)).setFloat("flap",Math.sin(a*7+v*1.3))})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const _n=["fire","hearth","chimney","smoke"],Ma=e=>e.id.split(/[-_]/).some(t=>_n.includes(t))||e.tags.some(t=>_n.includes(t.toLowerCase())),wt=e=>e[0].toUpperCase()+e.slice(1),Sa=e=>({fade:`lineFade${wt(e)}`,thin:`lineThin${wt(e)}`,haze:`haze${wt(e)}`}),lt={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:ut,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,groundWash:.5,groundGrain:1,grass:.5,grassSway:.15,horizonBushes:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},Ea=[1.05,1,.9],Aa=[.88,.93,1.05],_a=.35;function za(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:J(e,"edgeSoft"),footM:t==="standing"?_a:0,grounding:t==="figure"?0:J(e,"grounding"),grass:t==="figure"?0:J(e,"grassOverlap"),light:o?0:J(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?J(e,"cloudDrift"):0,footTint:s}}const Es=[.93,.86,.74],zn=e=>({paper:J(e,"sheetPaper"),grain:J(e,"sheetGrain"),patches:J(e,"sheetPatches"),wash:J(e,"sheetWash"),washColour:Es}),Fa={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01],groundGrain:[.5,3,.05]},Ta=Object.fromEntries(Object.keys(lt).map(e=>[e,Fa[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),re=(e,t)=>J(e,t),J=(e,t)=>{const n=Number(e[t]??lt[t]);return Number.isFinite(n)?n:lt[t]};function bt(e,t){const n=Sa(t);return{fade:J(e,n.fade),thin:J(e,n.thin),haze:J(e,n.haze),brown:J(e,"lineBrown"),ink:J(e,"lineInk"),norm:J(e,"lineNorm")}}const La=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),kt=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),tt=(e,t,n,s,o)=>{const a=s*(1080/o);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function Ca(e,t,n){const s=new N(D.x,D.y,D.z),o=Pe.RotationX(e*Math.PI/180),r=Pe.LookAtLH(s,s.add(N.TransformNormal(new N(0,0,1),o)),N.TransformNormal(N.Up(),o)).multiply(Pe.PerspectiveFovLH(de(D.fov),t,.1,2e3));return{vp:r,top:N.TransformCoordinates(new N(0,0,n),r).y}}le.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function Pa(e,t){const n=new Ws("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",N.FromArray(Es))},n}const Ae=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,Oa=12;function As(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,a=((t?.offset??0)+n*o)*(e.fps??Oa),r=Math.floor(a+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,r)):(r%s+s)%s}function Da(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const Ra=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Ia=`
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
  }`;le.ShadersStore.stageLayerVertexShader=`
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
  }`;le.ShadersStore.stageLayerFragmentShader=`
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
  ${ks}
  ${Ra}
  ${Ia}
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
  }`;const Fn=new WeakMap,_s=new Map,zs=new Map,Ut=new Map,Fs=new Map,at=new Map;function $e(e,t){const n=Fn.get(t)??new Map;Fn.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((a,r)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>r(new Error(`layer image ${e} did not load`)),i.onload=()=>{const c=document.createElement("canvas");c.width=i.naturalWidth,c.height=i.naturalHeight;const m=c.getContext("2d",{willReadFrequently:!0});m.drawImage(i,0,0);const h=m.getImageData(0,0,c.width,c.height).data,v=oa(h,c.width,c.height);v&&_s.set(e,v),at.set(e,aa(h,c.width,c.height)),zs.set(e,ca(h,c.width,c.height)),Ut.set(e,la(h,c.width,c.height));const k=ia(h,c.width,c.height);k!==null&&Fs.set(e,k);for(let g=0;g<h.length;g+=4){const y=h[g+3]/255;h[g]=Math.round(h[g]*y),h[g+1]=Math.round(h[g+1]*y),h[g+2]=Math.round(h[g+2]*y)}const w=new ns(h,c.width,c.height,be.TEXTUREFORMAT_RGBA,t,!0,!1,ge.TRILINEAR_SAMPLINGMODE);w.anisotropicFilteringLevel=8,w.wrapV=ge.CLAMP_ADDRESSMODE,a(w)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const Mt=24;function Ba(e,t,n,s,o){const[a,r]=t.anchor??[.5,1],i=[],c=[],m=[];for(let v=0;v<=Mt;v++){const k=v/Mt;for(const w of[0,1])i.push((w-a)*n,(r-k)*s,0),c.push(w,k);if(v<Mt){const w=v*2;m.push(w,w+2,w+1,w+1,w+2,w+3)}}const h=new Wt(e,o);return Object.assign(new ss,{positions:i,uvs:c,indices:m}).applyToMesh(h),h}let Va=0;function Tn(e,t,n,s,o,a){const r=Ba(`layer:${e.id}`,e,n,s,a),i=new Ze(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?ge.WRAP_ADDRESSMODE:ge.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=be.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const c=Va++*2.39996%(Math.PI*2),m=e.anchor?.[1]??1;return i.setFloat("phase",c).setFloat("height",s*m).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new rn(0,0,1,1)),r.material=i,r.metadata={noGBuffer:!0,painted:!0},r.isPickable=!1,{mesh:r,material:i,setMotion:h=>{i.setFloat("kind",Wo[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),r.isVisible=h>.001},setLine:(h,v,k,w)=>{i.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new ln(k[0],k[1])).setVector3("hazeTint",N.FromArray(w))},setPaper:(h,v)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",N.FromArray(h.washColour)).setVector2("grainUV",new ln(v[0],v[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setCell:h=>{i.setVector4("cell",new rn(h[0],h[1],h[2],h[3]))},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",N.FromArray(h.footTint)).setVector3("sunColour",N.FromArray(Ea)).setVector3("shadeColour",N.FromArray(Aa))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,v)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),v&&i.setVector3("featherTint",N.FromArray(v))}}}const Ts=600,Ls=1.5,Na=2,Ua=.8,$a=["grass","heather","reeds","shrub","bramble","juniper","hazel","meadow","fern","tree","bush","sedge","flower"],Ha=["shrub","tree","bush","bramble","hedge"],Ga=["ground"];function Wa(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function Ln(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}const ja=e=>e.layer!=="ground"&&e.layer!=="sky"&&e.layer!=="bg"&&e.layer!=="figure"&&!e.tileable_x&&!Bt(e)&&e.kind!=="animation"&&e.tags.some(t=>$a.includes(t));function Ya(e){const t=e.assets.filter(n=>n.kind==="sheet");return t.length?t.flatMap(n=>(n.cells??[]).map(s=>({asset:n.id,file:n.file,tags:s.tags,height_m:s.height_m,aspect:s.rect[2]*n.w/Math.max(1,s.rect[3]*n.h),cell:s.rect}))):e.assets.filter(ja).map(n=>({asset:n.id,file:n.file,tags:n.tags,height_m:n.height_m,aspect:n.w/Math.max(1,n.h),cell:[0,0,1,1]}))}const Cs=(e,t)=>e.tags.some(n=>!Ga.includes(n)&&t.includes(n)),Ka=(e,t)=>e.filter(n=>n.height_m<=Ls&&!n.tags.includes("tree")&&Cs(n,t)),Xa=["grass","meadow","heath","field","hedge","forest","marsh","wet","edge","heather"];function Za(e,t){const n=e.filter(o=>o.height_m>Ls&&o.tags.some(a=>Ha.includes(a))),s=n.filter(o=>Cs(o,t));return s.length||!t.some(o=>Xa.includes(o))?s:n.filter(o=>!o.tags.includes("tree"))}function Cn(e){const t=Math.min(Ts,Math.max(0,Math.round(e.count)));if(!e.picks.length||!t)return[];const n=Wa(e.seed),s=Math.max(e.from,e.front+Na),o=Math.max(s,e.to),a=[];for(let r=0;r<t;r++){const i=s*Math.pow(o/s,n()),c=Math.floor(n()*e.picks.length);a.push({z:i,x:(n()*2-1)*Ua*fe(i),h:e.picks[c].height_m*(.7+.6*n())*(e.size??1),pick:c,phase:n()*Math.PI*2})}return a.sort((r,i)=>i.z-r.z)}const Ps=[...Array.from({length:16},(e,t)=>2.5*Math.pow(1.4,t+1)),1/0],Pn=e=>Ps.findIndex(t=>e<t);le.ShadersStore.stageStrewnVertexShader=`
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
  }`;le.ShadersStore.stageStrewnFragmentShader=`
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
  }`;function qa(e,t,n,s,o,a,r){const i=new Ze(`strewn:${r}`,e,"stageStrewn",{attributes:["position","quad","uv","extra"],uniforms:["viewProjection","camPos","time","sway","land","haze","opacity"],samplers:["tex"],needAlphaBlending:!0});i.alphaMode=be.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setTexture("tex",t).setVector3("haze",N.FromArray(a));const c=new Map;for(const h of s)c.set(Pn(h.z),[...c.get(Pn(h.z))??[],h]);const m=[...c].map(([h,v])=>{const k=[],w=[],g=[],y=[],F=[];v.forEach((E,x)=>{const A=n[E.pick],[$,K,H,Z]=A.cell,I=E.h*A.aspect,se=o(E.z);for(const[j,G]of[[-.5,0],[.5,0],[.5,1],[-.5,1]])k.push(E.x,0,E.z),w.push(j,G,E.h,I),g.push($+(j+.5)*H,K+(1-G)*Z),y.push(E.phase,se[0],se[1],se[2]);F.push(x*4,x*4+1,x*4+2,x*4,x*4+2,x*4+3)});const p=new Wt(`strewn:${r}:${h}`,e);return Object.assign(new ss,{positions:k,indices:F}).applyToMesh(p),p.setVerticesData("quad",w,!1,4),p.setVerticesData(js.UVKind,g,!1,2),p.setVerticesData("extra",y,!1,4),p.material=i,p.alphaIndex=Ke(Math.min(Ps[h],2e3)),p.alwaysSelectAsActiveMesh=!0,p.isPickable=!1,p.metadata={noGBuffer:!0},p});return{meshes:m,update(h,v,k,w,g){i.setFloat("time",h).setFloat("sway",v).setFloat("land",k).setFloat("opacity",g).setVector3("camPos",w),m.forEach(y=>{y.isVisible=g>.001})},dispose(){m.forEach(h=>h.dispose()),i.dispose()}}}const nt=[3,60],On=[60,300],Ja=80,Qa=1.8,er=(e,t)=>t??e.asset.tags;function Dn(e){const t=[],n=Math.log(nt[1]/nt[0]);e.slots.forEach((o,a)=>{const r=Math.max(nt[0],o.from),i=Math.min(nt[1],e.slots[a+1]?.from??1/0);if(i<=r)return;const c=Ka(e.sprites,er(o,e.bandTags)),m=e.grass*Ts*(Math.log(i/r)/n);t.push({picks:c,clumps:Cn({picks:c,count:m,from:r,to:i,front:e.front,seed:Ln(`${e.sceneId}:grass:${a}`)})})});const s=e.slots[e.slots.length-1];if(s&&!e.bandTags){const o=Za(e.sprites,s.asset.tags);t.push({picks:o,horizon:!0,clumps:Cn({picks:o,count:e.bushes*Ja,from:On[0],to:On[1],front:e.front,size:Qa,seed:Ln(`${e.sceneId}:horizon`)})})}return t.filter(o=>o.clumps.length)}const $t={...Ao["History Lines pencil"],paper:.35,granulation:.2,...lt},tr=new os(.937,.914,.863,1),nr=.7,sr=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class or{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new Ys(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Ks(this.engine),this.scene.clearColor=tr,this.camera=new Xs("house",new N(0,1.6,0),this.scene),this.camera.rotation.set(ut*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new Zs("sky",new N(0,1,0),this.scene).intensity=.7,new qs("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=ga(this.scene),this.ground.set(this.groundLook([],null,n)),this.birds=ka(this.scene,Vn,fe(Vn),cr),_o(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),Pa(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Ne(Le);strip=null;nearTex=null;bands=[];strewn=[];strewSrc=null;strewKey="";smoke=[];birds;footTint=Ne(Le);nearAsset=null;hazeTint=Ne(Le);sceneLib;buildToken=0;look={...$t};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=kn;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return Zo(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=kn,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>Ko;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Yo)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=Xo(this.tier,o,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...$t,...t??{}}}groundPoint(t,n){const s=ee[n];return new N((t-.5)*fe(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],a=[];t.set.sky&&a.push({layer:In(t),order:0,index:-1});const r={sky:1};t.set.layers.forEach((b,C)=>{const ae=b.depth;r[ae]=r[ae]??0,a.push({layer:b,order:r[ae]++,index:C})});const i=[];await Promise.all(a.map(async({layer:b,order:C,index:ae})=>{let R=Ce(n,b,b.depth);if(!R){i.push({need:b.need??b.asset,reason:"no match"});return}let X;try{X=await $e(ye(n,R,b),this.scene)}catch{i.push({need:b.need??b.asset,reason:`file did not load: ${b.src??R.file}`});return}if(s!==this.buildToken)return;R=Rn(R,b,X);const B=Ve(R,b,C),te=Tn(R,X,B.w,B.h,B.uRepeat,this.scene);te.mesh.position.set(B.x,B.y,B.z);const M=gs(b,R);te.mesh.alphaIndex=M?Co:B.alphaIndex,M&&(te.mesh.rotation.x=Math.PI/2),te.mesh.isVisible=!1;let _,T,P;if(St.includes(b.depth)&&!R.tileable_x&&!M&&!Se(R)){const U=Sn(R,B.w,B.h,B.z);P=q=>Sn(R,B.w,B.h,q).d/U.d,_=En(te.mesh,U.w,U.d,this.scene),_.mesh.alphaIndex=et(B.alphaIndex),T=En(te.mesh,U.w,U.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:B.h*hr(this.sunDir)}),T.mesh.alphaIndex=et(B.alphaIndex)}o.push({layer:b,index:ae,builtScale:b.scale??1,builtZ:B.z,handle:te,asset:R,order:C,stain:_,cast:T,stainDepth:P,ink:Fs.get(ye(n,R,b)),flat:M,skyline:Ut.get(ye(n,R,b))})}));const c=vs(t.set,n),m=(await Promise.all(bs(t.set,n).map(async b=>{const C=await $e(n.base+b.asset.file,this.scene).catch(()=>(i.push({need:b.asset.id,reason:`file did not load: ${b.asset.file}`}),null)),ae=(at.get(n.base+b.asset.file)??[]).filter(R=>!!R);return C?{tex:C,tile:b.asset.height_m||Vt,from:b.from,asset:b.asset,colour:ae.length?Nn(ae):Ne(n.paper??Le)}:null}))).filter(b=>!!b);let h=null;const v=da(t.set.near,n),k=v?Ce(n,{asset:v}):null;if(t.set.near&&!k&&i.push({need:t.set.near,reason:"no near band"}),k)try{h=await $e(n.base+k.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${k.file}`})}c.kind==="paper"&&c.reason&&i.push({need:t.set.ground,reason:c.reason});const w=o.filter(b=>b.asset.layer==="bg").sort((b,C)=>b.index-C.index)[0],g=w?{top:zs.get(ye(n,w.asset,w.layer))??0,h:Ve(w.asset,w.layer,w.order).h,order:w.order}:null,y=o.find(b=>b.index===-1),F=y&&Ve(y.asset,y.layer,y.order),p=y&&F?ra(at.get(ye(n,y.asset,y.layer))??[],(D.y-F.y)/F.h):null,E=w?_s.get(ye(n,w.asset,w.layer))??null:t.set.groundBands?.length?null:p,x=await this.loadBands(t,n),A=t.set.groundBands?.length?[...new Set(t.set.groundBands.flatMap(b=>Ce(n,{asset:b.asset},"ground_band")?.tags??[]))]:null,$=Ya(n),K=vn(t),H=m.map(b=>({asset:b.asset,from:b.from})),Z=[...new Set(Dn({sceneId:t.id,slots:H,bandTags:A,sprites:$,grass:1,bushes:1,front:K}).flatMap(b=>b.picks.map(C=>C.file)))],I=new Map;await Promise.all(Z.map(async b=>{const C=await $e(n.base+b,this.scene).catch(()=>null);C&&I.set(b,C)}));const se=b=>b.forEach(C=>{C.stain?.mesh.material?.dispose(),C.cast?.mesh.material?.dispose(),C.handle.mesh.dispose(),C.handle.material.dispose()});if(s!==this.buildToken){se(o),x.forEach(b=>{b.handle.mesh.dispose(),b.handle.material.dispose()});return}se(this.built),this.bands.forEach(b=>{b.handle.mesh.dispose(),b.handle.material.dispose()}),this.bands=x,this.built=o,this.sceneLib=n;const j=m[0]?(at.get(n.base+m[0].asset.file)??[]).filter(b=>!!b):[],G=this.groundLook(m,E,n,c.kind==="paper"?c.colour:void 0);this.horizonTint=G.tint,this.strip=g,this.smoke.forEach(b=>b.dispose()),this.smoke=o.filter(b=>Ma(b.asset)&&St.includes(b.layer.depth)&&!b.flat).map(b=>{const C=Ve(b.asset,b.layer,b.order);return va(this.scene,new N(b.handle.mesh.position.x,C.h*.6,C.z),Math.min(Math.max(C.h*.8,.5),3),C.alphaIndex)}),this.footTint=j.length?Nn(j):G.base,this.nearTex=h,this.nearAsset=k,this.hazeTint=p??G.tint,this.ground.set(G),this.strewSrc={sceneId:t.id,slots:H,colours:m.map(b=>b.colour),bandTags:A,front:K,sprites:$,tex:I},this.strewKey="",this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const a=Ne(o??s.paper??Le),r=n??a;return{slots:t,base:sr(a,r,nr),tint:r,fadeNear:ee.fg,fadeFar:ee.bg*.75,grain:t.length?.5:1}}strew(t,n){const s=this.strewSrc,o=s?`${s.sceneId}:${t}:${n}:${s.slots.length}`:"";if(o===this.strewKey||(this.strewKey=o,this.strewn.forEach(r=>r.dispose()),this.strewn=[],!s))return;const a=r=>s.colours[fa(s.slots,r)]??this.footTint;for(const r of Dn({...s,grass:t,bushes:n}))for(const i of new Set(r.picks.map(c=>c.file))){const c=s.tex.get(i),m=r.clumps.filter(h=>r.picks[h.pick].file===i);c&&m.length&&this.strewn.push(qa(this.scene,c,r.picks,m,a,this.hazeTint,i))}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:In(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=r=>this.built.some(i=>i.handle.mesh===r),o=[],a=[...this.scene.multiPick(t,n,s)??[]].sort((r,i)=>r.distance-i.distance);for(const r of a){const i=this.built.find(m=>m.handle.mesh===r.pickedMesh),c=r.getTextureCoordinates();!i||!c||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||Se(i.asset)&&(r.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:c.x,v:c.y})}return o}pickBackdrops(t,n){const s=r=>this.bands.find(i=>i.handle.mesh===r),o=r=>this.built.find(i=>i.handle.mesh===r&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,r=>!!s(r)||!!o(r))??[]].sort((r,i)=>r.distance-i.distance).flatMap(r=>{const i=r.getTextureCoordinates();if(!i)return[];const c=s(r.pickedMesh);if(c)return[{band:c.index,asset:c.asset,u:i.x,v:i.y}];const m=o(r.pickedMesh);return[{index:m.index,asset:m.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(m=>m.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),a=1/this.engine.getRenderHeight(),r=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(m=>N.Project(m,Pe.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=r.map(m=>m.x*o),c=r.map(m=>m.y*a);return{x0:Math.min(...i),y0:Math.min(...c),x1:Math.max(...i),y1:Math.max(...c),z:n.handle.mesh.position.z}}cameraAlive=!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;faded=new Set;fadedTo=1;fadeLayers(t,n){this.faded=new Set(t),this.fadedTo=n}groundHeightAt(t){return It(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?Se(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Pe.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>rr*Math.min(1,Math.max(0,(Bn-o)/(Bn-lr)));this.gridMeshes=n.pieces.map((o,a)=>{const r=o.lines.map(m=>m.map(([h,v])=>new N(h,It(v,t),v))),i=o.lines.map(m=>m.map(([,h])=>new os(n.rgb[0],n.rgb[1],n.rgb[2],s(h)))),c=ht.CreateLineSystem(`grid-${a}`,{lines:r,colors:i,useVertexAlpha:!0},this.scene);return c.isPickable=!1,c.setEnabled(!this.gridOff),c.alphaIndex=Ke(o.z)+ir,c.material.depthFunction=be.ALWAYS,c.material.disableDepthWrite=!0,c}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,Pe.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new N(.55,-1,-.3).normalize();depthLine(t){return{...bt(this.look,t),tint:this.hazeTint}}paper(){return zn(this.look)}async loadBands(t,n){const s=[];for(const[o,a]of(t.set.groundBands??[]).entries()){const r=Ce(n,{asset:a.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await $e(ye(n,r,a),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${a.src??r.file} did not load`);continue}const c=Rn(r,a,i),m=ds(a.z),h=m*c.h/c.w,v=Tn(c,i,m,h,1,this.scene);v.material.depthFunction=be.ALWAYS,v.mesh.position.set(0,0,a.z),v.mesh.alphaIndex=Ke(a.z),s.push({handle:v,z:a.z,w:m,h,skyline:Ut.get(ye(n,c,a))??.5,index:o,asset:c,band:a})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?No(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??us,re(this.look,"housePitch")):0}pose(t,n,s,o){const a=Kt(t,n),r=Xt(a.cam,a.t,Yt(t)),i=o?Qo(r,o.t,o):r,c=this.cameraAlive?Ho(t.camera_motion,s):{x:0,y:0,roll:0};this.camera.position.set(i.x+c.x,i.y+c.y,i.z),this.camera.fov=i.fov;const m=re(this.look,"housePitch");this.camera.rotation.x=m*Math.PI/180,this.camera.rotation.z=((i.roll??0)+c.roll)*Math.PI/180,this.ground.follow(this.camera.position);const h=p=>re(this.look,p);this.ground.live({detail:h("groundDetail"),vary:h("groundVary"),mixTile:h("groundMix"),tileScale:h("groundScale"),wash:h("groundWash"),grainSize:h("groundGrain")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Ca(m,this.engine.getAspectRatio(this.camera),h("nearFar")),span:ar,tileable:!!this.nearAsset?.tileable_x}:null);const v=this.engine.getRenderHeight(),k=zn(this.look),w=re(this.look,"bandHeight"),g=this.horizonOf(t),y=Do(g,this.strip);this.land=y,this.poseGrid(y);const F=vn(t);this.bands.forEach(p=>{const E=Vo(p.band,n,w,p.w,p.h,p.skyline,F);p.z=E.z,p.handle.mesh.scaling.set(E.sx,E.sy,1),p.handle.mesh.position.set(E.x,E.y,E.z),p.handle.mesh.alphaIndex=E.alphaIndex;const x=kt(v,E.z-D.z,de(D.fov));p.handle.setOpacity(E.opacity),p.handle.setBottomFade(Math.min(1,re(this.look,"bandFade")/E.h)),p.handle.setPaper(k,tt(E.w,E.h,1,x,v)),p.handle.setLine(bt(this.look,"bg"),1,tt(E.w,E.h,1,x,v),this.hazeTint),p.handle.setMotion(bn(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.strew(re(this.look,"grass"),re(this.look,"horizonBushes")),this.strewn.forEach(p=>p.update(s,re(this.look,"grassSway"),y,this.camera.position,1)),this.smoke.forEach(p=>p.update(s,re(this.look,"smoke"))),this.birds.update(s,re(this.look,"birds"));for(const p of this.built){const E=we(p.layer,n),x=Ve(p.asset,{...p.layer,x:E.x,y:E.y,z:E.z,scale:1,rotation:E.rotation},p.order,g,y);p.handle.mesh.position.x=x.x;const A=p.asset.layer==="bg"&&!p.asset.tileable_x?(x.z-D.z)/Math.max(.1,p.builtZ-D.z):1;p.handle.mesh.position.y=p.flat?Po:Se(p.asset)?ps(x.z,w,x.h*E.scale,p.skyline??0)+x.y:D.y+(x.y-D.y)*A,p.handle.mesh.position.z!==x.z&&(p.handle.mesh.position.z=x.z,p.flat||(p.handle.mesh.alphaIndex=x.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=et(x.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(x.z)),p.cast&&(p.cast.mesh.alphaIndex=et(x.alphaIndex))),p.handle.mesh.rotation.z=-x.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(E.scale/p.builtScale*A);const $=E.opacity*(this.faded.has(p.index)?this.fadedTo:1);p.handle.setOpacity($),p.handle.setFeather(sa(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-x.y)/(x.h*E.scale));const K=kt(v,x.z-i.z,this.camera.fov),H=bt(this.look,p.layer.depth);p.handle.setPaper(k,tt(x.w*E.scale,x.h*E.scale,x.uRepeat,kt(1080,x.z-D.z,de(D.fov)),1080)),p.handle.setLine(H,p.ink===void 0?1:La(p.ink,H.ink,H.norm),tt(x.w*E.scale,x.h*E.scale,x.uRepeat,K,v),this.hazeTint),p.stain?.setOpacity((p.layer.shadow??yt)*$),p.cast?.setOpacity(re(this.look,"castShadow")*((p.layer.shadow??yt)/yt)*$);const Z=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":St.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive(za(this.look,Z,this.sunDir.x,this.footTint)),p.handle.setMotion(bn(p.asset,p.layer)),p.handle.material.setFloat("time",s),Ae(p.asset)&&p.handle.setCell(Da(p.asset,As(p.asset,p.layer.play,n)))}}}const ye=(e,t,n)=>n?.src??e.base+t.file,Rn=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:o}=n.getSize(),a=s/(Ae(e)?e.cols:1),r=o/(Ae(e)?e.rows:1);return{...e,w:a,h:r,height_m:e.height_m*(r/e.h)}},In=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),ar=1.3,rr=.35,ir=.001,lr=40,Bn=120,Vn=110,cr=900,hr=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Nn=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),St=["mid","fg","near"],ur=16/9,dr=.92;function fr(e,t,n,s){const{cam:o,t:a}=Kt(e,s),r=Xt(o,a,Yt(e)),i=ee[t.depth],c=i-r.z;if(c<=.5)return null;const m=we(t,s),h=(m.x-.5)*fe(i),v=Math.tan(r.fov/2),k=(h-r.x)/(c*v*ur),w=-ut*Math.PI/180,g=Math.tan(Math.atan2(n*m.scale-r.y,c)-w)/v;return Math.abs(k)>dr?null:{x:(k+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const mr={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},Un=new Set(["large","small","tall","long","short","fallen"]),pr=new Set(["tree","shrub"]),qt=e=>e.charAt(0).toUpperCase()+e.slice(1),gr=(e,t)=>mr[e]?.[t?1:0]??e;function xr(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const a=o.length>1&&pr.has(o[0])?o.slice(1):o,r=a.filter(c=>Un.has(c)),i=a.filter(c=>!Un.has(c));return qt([...r,...i].map(c=>gr(c,n)).join(" "))}const $n=e=>qt(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),Os=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ve(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&Os(s);if(o)return $n(o);if(e.figure)return $n(e.figure);if(s)return xr(s,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?qt(String(a)):""}function yr(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const vr=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function wr(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>vr.has(t))?"leaf":"photo"}const Xe=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?Os(e):null,Hn=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Oe(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:Hn(e,"pose:")??t?.[1]??null,facing:Hn(e,"facing:")??(t?.[2]?"left":"right")}}const Ds=e=>e.find(t=>Oe(t).pose==="stand"&&Oe(t).facing==="right")??e[0];function Rs(e){const t=new Map,n=[];for(const s of e??[]){const o=Xe(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const r={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,r),n.push(r)}const a=t.get(o);a.members=[...a.members,s],a.count=a.members.length}return n.map(s=>s.series?{...s,asset:Ds(s.members)}:s)}const br=(e,t)=>{const n=Xe(t);return n?(e??[]).filter(s=>Xe(s)===n):t?[t]:[]},kr=e=>Rs(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function Mr(e,t,n){const s=(e??[]).filter(r=>Xe(r)===n);if(!s.length)return null;const o=Oe(t),a=(r,i)=>s.find(c=>Oe(c).pose===r&&Oe(c).facing===i);return a(o.pose,o.facing)??a("stand",o.facing)??Ds(s)}const Sr=24;function Er(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const o=new Image;o.onload=()=>{try{const a=document.createElement("canvas");a.width=o.naturalWidth,a.height=o.naturalHeight;const r=a.getContext("2d",{willReadFrequently:!0});r.drawImage(o,0,0),t.set(s,{w:a.width,h:a.height,data:r.getImageData(0,0,a.width,a.height).data})}catch{t.set(s,"failed")}},o.onerror=()=>t.set(s,"failed"),o.src=e+s};return{prime(s){s.forEach(o=>o?.file&&n(o.file))},opaque(s,o,a,r){const i=t.get(s?.file);if(i==="failed")return!0;if(!i||i==="loading")return s?.file&&n(s.file),!1;const c=s.kind==="animation"?Math.max(1,s.cols??1):1,m=s.kind==="animation"?Math.max(1,s.rows??1):1,h=i.w/c,v=i.h/m,k=Math.min(h-1,Math.max(0,Math.floor(o*h))),w=Math.min(v-1,Math.max(0,Math.floor(a*v)));return(Number.isInteger(r)?[[Math.floor(r/c)%m,r%c]]:Array.from({length:m*c},(y,F)=>[Math.floor(F/c),F%c])).some(([y,F])=>i.data[(Math.floor(y*v+w)*i.w+Math.floor(F*h+k))*4+3]>Sr)}}}const oe={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,fs],[80,jt]]},Ar=e=>e<=12?1:e<=40?5:20,_r=e=>Ar(e)/4;function Gn(e,t=0){const n=typeof t=="function"?t:()=>t,s=m=>[e.origin[0]+m*e.dir[0],e.origin[2]+m*e.dir[2]],o=m=>e.origin[1]+m*e.dir[1]-(oe.z+n(s(m)[1]));if(!(e.dir[2]>0))return null;const a=(jt*zr-e.origin[2])/e.dir[2],r=Math.sign(o(0));if(r===0)return cn(oe,s(0));let i=0,c=null;for(let m=1;m<=Wn;m++){const h=a*m/Wn;if(Math.sign(o(h))!==r){c=h;break}i=h}if(c===null)return null;for(let m=0;m<Fr;m++){const h=(i+c)/2;Math.sign(o(h))===r?i=h:c=h}return cn(oe,s(c))}const zr=4,Wn=400,Fr=30;function Ht(e){const t=_r(Ft(oe,e)[1]);return Ft(oe,eo(e,t))}const Gt=(e,t)=>[(e-.5)*fe(t),t],ct=([e,t])=>({x:Math.round((.5+e/fe(t))*1e4)/1e4,z:t});function Jt([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function Tr([e,t],n,s=[0,0]){const[[,o],[,a]]=oe.cells,r=Math.max(.1,t-s[1]),i=Math.min(a,Math.max(o,s[1]+r/Math.max(.01,n)));return Ft(oe,Jt([e,t],i,s))}const Lr=[[fs,12,2],[12,40,10],[40,jt,40]],Cr=20;function Pr(){return Lr.flatMap(([e,t,n],s)=>{const o=n*Cr,a=[];let r=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const c={...oe,cells:[[-o,r],[o,i]]},m=to(c,n,Math.max(1,Math.round(i-r))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===i:i>r);a.push({z:i,lines:m.map(h=>h.map(v=>no(oe,v).slice(0,2)))}),r=i}return a})}const jn=-1,Yn=2,Or=4,Dr=(e,t)=>{const n=e.findIndex(s=>s.index===t);return n<0?{hit:e[0]??null,next:null}:{hit:e[n],next:e.length>1?e[(n+1)%e.length].index:null}},Rr=(e,t)=>{const n=e.find(s=>s.index===t)?.box;return n?e.filter(({index:s,box:o})=>s!==t&&o&&o.z<n.z&&o.x0<n.x1&&o.x1>n.x0&&o.y0<n.y1&&o.y1>n.y0).map(s=>s.index):[]};function Ir({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:a,onGround:r=()=>!1,byDistance:i=()=>!1,groundUnder:c=()=>null,footY:m=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:k=()=>!1}){let w=null,g=null,y=!1;const F="#38bdf8",p=document.createElement("div");p.dataset.stage25dSelection="",p.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${F};z-index:3;`;const E=document.createElement("div");E.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${F};pointer-events:none;`,p.appendChild(E);const x=document.createElement("div");x.dataset.rotateHandle="1",x.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",p.appendChild(x);const $=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([M,_])=>{const T=document.createElement("div");return T.dataset.scaleHandle="1",T.style.cssText=Qs(M,_),p.appendChild(T),T});t.appendChild(p),n()?.setGrid?.(Pr(),Br(t,"--color-neutral"));const K=document.createElement("div");K.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(K);const H=M=>{const _=G();if(!_||M===null){K.style.display="none";return}const T=t.getBoundingClientRect(),P=e.getBoundingClientRect();Object.assign(K.style,{display:"block",left:`${_.left+_.width/2+P.left-T.left}px`,top:`${_.top+_.height+P.top-T.top}px`}),K.textContent=`${s(M,"z").toFixed(2)} m`},Z=M=>{const _=e.getBoundingClientRect();return{x:M.clientX-_.left,y:M.clientY-_.top}},I=(M,_)=>(n()?.pickLayers(M,_)??[]).filter(T=>o.opaque(T.asset,T.u,T.v,T.index)),se=(M,_)=>I(M,_)[0]??null,j=(M,_)=>{w=M,_&&M!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${M}`}})),b()},G=()=>{const M=w===null?null:n()?.layerBox(w);if(!M)return null;const _=e.getBoundingClientRect();return{left:M.x0*_.width,top:M.y0*_.height,width:(M.x1-M.x0)*_.width,height:(M.y1-M.y0)*_.height,z:M.z}},b=()=>{const M=G();if(!M){p.style.display="none";return}const _=e.getBoundingClientRect(),T=t.getBoundingClientRect();Object.assign(p.style,{display:"block",left:`${M.left+_.left-T.left}px`,top:`${M.top+_.top-T.top}px`,width:`${M.width}px`,height:`${M.height}px`})},C=(M,_,T)=>Math.min(T,Math.max(_,M)),ae=M=>{if(M.button!==0)return;const{x:_,y:T}=Z(M),{hit:P,next:U}=Dr(I(_,T),w);if(!P){k(_,T)&&M.stopPropagation();return}M.stopPropagation(),j(P.index,!0);const q=n().layerBox(P.index),me=r(P.index),he=G();g={mode:"move",index:P.index,z:q.z,from:n().worldXAt(_,T,q.z),x0:s(P.index,"x"),id:M.pointerId,el:e,next:U,pressed:[M.clientX,M.clientY],ground:me,start:[_,T],foot:he?[he.left+he.width/2,he.top+he.height]:[_,T],lift:me?m(P.index):0},e.setPointerCapture?.(M.pointerId)},R=M=>_=>{if(_.button!==0||w===null)return;const T=G();if(!T)return;_.stopPropagation(),_.preventDefault();const P=e.getBoundingClientRect(),U=T.left+T.width/2,q=T.top+T.height/2,{x:me,y:he}={x:_.clientX-P.left,y:_.clientY-P.top};g={mode:M,index:w,cx:U,cy:q,id:_.pointerId,el:_.currentTarget,d0:Math.max(8,Math.hypot(me-U,he-q)),a0:Math.atan2(he-q,me-U),scale0:s(w,"scale"),rotation0:s(w,"rotation"),byDistance:M==="scale"&&i(w),p0:Gt(s(w,"x"),s(w,"z")),eye:h()},_.currentTarget.setPointerCapture?.(_.pointerId)},X=M=>{const{x:_,y:T}=Z(M);if(g?.mode==="move"&&g.ground){const P=c(g.foot[0]+_-g.start[0],g.foot[1]+T-g.start[1],g.lift,g.index);if(!P)return;const U=ct(Ht(P));a(g.index,"x",C(U.x,jn,Yn)),a(g.index,"z",U.z),H(g.index);return}if(g?.mode==="move"){const P=(n().worldXAt(_,T,g.z)-g.from)/fe(g.z);a(g.index,"x",Math.round(C(g.x0+P,jn,Yn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const P=Math.hypot(_-g.cx,T-g.cy)/g.d0*g.scale0,U=Ht(Tr(g.p0,P,g.eye))[1],q=ct(Jt(g.p0,U,g.eye));g.scale0!==1&&a(g.index,"scale",1),a(g.index,"x",q.x),a(g.index,"z",q.z),H(g.index);return}if(g?.mode==="scale"){const P=Math.hypot(_-g.cx,T-g.cy);a(g.index,"scale",Math.round(C(g.scale0*(P/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let P=g.rotation0+(Math.atan2(T-g.cy,_-g.cx)-g.a0)*180/Math.PI;M.shiftKey&&(P=Math.round(P/15)*15),a(g.index,"rotation",Math.round(P*10)/10);return}y||(y=!0,requestAnimationFrame(()=>{y=!1,e.style.cursor=se(_,T)?"pointer":""}))},B=M=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const _=g.index,T=g.mode==="move"&&g.ground||g.byDistance,P=g.next!=null&&Math.hypot(M.clientX-g.pressed[0],M.clientY-g.pressed[1])<Or?g.next:null;g=null,K.style.display="none",T&&v(_),P!==null&&j(P,!0)},te=M=>{w!==null&&M.detail?.id!==`s25_layer-${w}`&&(w=null,b())};e.addEventListener("pointerdown",ae);for(const M of[e,...$,x])M.addEventListener("pointermove",X),M.addEventListener("pointerup",B),M.addEventListener("pointercancel",B);return $.forEach(M=>M.addEventListener("pointerdown",R("scale"))),x.addEventListener("pointerdown",R("rotate")),window.addEventListener("scene-object-selected",te),{select:(M,_=!1)=>j(M,_),get selected(){return w},place:b,destroy(){window.removeEventListener("scene-object-selected",te),p.remove(),n()?.setGrid?.(null),K.remove()}}}function Br(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const Qt=["x","y","z","scale","rotation","opacity","keys","figure","play"],ne=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},Et=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Qt.includes(t))),Kn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{},{camera:a,camera_more:r,camera_motion:i,...c}=e??{};return JSON.stringify({...c,set:{...o,layers:t.map(Et),groundBands:n.map(Et),skyLayer:Et(s)}})},At=e=>Qt.map(t=>e?.[t]??null),_t=e=>JSON.stringify([(e?.set?.layers??[]).map(At),(e?.set?.groundBands??[]).map(At),At(e?.set?.skyLayer),e?.camera??null,e?.camera_more??[],e?.camera_motion??null]),Xn={x:[-8,8],y:[.3,6],z:[-4,15],fov:[20,75]},Vr=[-45,45],Nr=10,Zn=.01,Ur=.01,qn=(e,[t,n])=>Math.min(n,Math.max(t,e)),Jn=e=>Math.round(e*1e3)/1e3,xe=e=>{const t={...D,...e},n=Object.fromEntries(Object.keys(Xn).map(o=>[o,Jn(qn(Number(t[o])||D[o],Xn[o]))])),s=Jn(qn(Number(t.roll)||0,Vr));return s?{...n,roll:s}:n},$r=(e,t,n,s)=>{const o=xe(e),a=2*Nr*Math.tan(de(o.fov)/2)/Math.max(1,s);return xe({...o,x:o.x-t*a,y:o.y+n*a})},Hr=(e,{deltaX:t=0,deltaY:n=0,ctrlKey:s=!1})=>{const o=xe(e);return xe(s?{...o,fov:o.fov*Math.exp(n*Ur)}:{...o,z:o.z-n*Zn,x:o.x+t*Zn})},en=.001,Gr=(e,t,n)=>{const s=[];for(const o of[e,...t??[]].filter(Boolean)){const a=Number(o.at_s)||0,r=(m,h)=>{const v=s.findIndex(k=>Math.abs(k.t-m)<en);v>=0?s[v]={t:m,pose:h}:s.push({t:m,pose:h})},i=xe(o.from??D),c=xe(o.to??o.from??D);r(a,i),(Number(o.dur_s)||JSON.stringify(i)!==JSON.stringify(c))&&r(a+(Number(o.dur_s)||Math.max(0,n-a)),c)}return s.sort((o,a)=>o.t-a.t)},st=(e,t,n)=>[...e.filter(s=>Math.abs(s.t-t)>=en),{t,pose:xe(n)}].sort((s,o)=>s.t-o.t),Wr=(e,t)=>e.filter(n=>Math.abs(n.t-t)>=en),jr=(e,t)=>e.reduce((n,s)=>Math.abs(s.t-t)<Math.abs(n.t-t)?s:n,e[0]),Yr=e=>{const t=(n,s,o,a)=>({move:"framed",ease:"inOut",at_s:o,...a?{dur_s:a}:{},from:n,to:s});return e.length<2?e.map(n=>t(n.pose,n.pose,0)):e.slice(0,-1).map((n,s)=>t(n.pose,e[s+1].pose,n.t,e[s+1].t-n.t))},Kr=(e,t,n,s)=>{const{cam:o,t:a}=Kt({camera:e,camera_more:t},n),r=Xt(o,Math.max(0,a),s);return xe({x:r.x,y:r.y,z:r.z,fov:r.fov*180/Math.PI,roll:r.roll})},Xr={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},Zr={nl:"Camera",de:"Kamera",fr:"Caméra",it:"Telecamera"},Qn=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch","groundWash","groundGrain","grass","grassSway","horizonBushes"],qr=e=>Ae(e)?"vfx":e.layer,es=e=>Ae(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,ts="application/x-lp-stage25d",ot=new Map,zt=new Map,Jr=.8,Qr=()=>!!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,ei=e=>(zt.has(e)||zt.set(e,Er(e)),zt.get(e));function ti(e){return ot.has(e)||ot.set(e,ea(Js(e)).catch(t=>{throw ot.delete(e),t})),ot.get(e)}const ni=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],camera_motion:e.camera_motion??null,figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function mi(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,a=null,r=null,i=new Map,c=new Map,m=0,h=null,v=0,k=0,w=performance.now(),g=!1,y=[],F=[],p={},E=new Set,x=null,A=null;const $=l=>Ae(l)?null:A.base+"thumbs/"+l.file;let K=null,H=null,Z={},I=null,se=0,j=null,G=[],b=null,C=!1;const ae=()=>{s.engine.runRenderLoop(()=>{const l=performance.now();k+=Math.min(.1,(l-w)/1e3),w=l,s.tick(l),I&&(s.fadeLayers(_(),Jr),s.cameraAlive=!Qr()&&se===0&&(C||!!window.__timelineKeying?.playing?.())),o&&s.pose(o,ce(),k),s.scene.render(),I?.place()})},R=()=>{if(!o||!s)return;const l=(u,d)=>E.has(d)?{...u,opacity:0,keys:[]}:u;o={...o,set:{...o.set,groundBands:F.map((u,d)=>l(u,`band-${d}`)),skyLayer:p,layers:y.map((u,d)=>l(u,`layer-${d}`))}},s.rebind(o)},X=l=>{const u=/^band-(\d+)$/.exec(String(l??""));return u&&F[Number(u[1])]?Number(u[1]):-1},B=l=>l==="sky"?r?.set?.sky?{...p,depth:"sky"}:null:X(l)>=0?{...F[X(l)],depth:"bg"}:y[ne(l)]??null,te=(l,u)=>{let d=null;if(l==="sky"&&r?.set?.sky){if(u.motion===void 0)return null;p={...p,motion:u.motion},d={skyLayer:{motion:u.motion}}}else if(X(l)>=0){const f=X(l);F=F.map((S,z)=>z===f?{...S,...u}:S),d={band:{index:f,...u}}}else if(y[ne(l)]){const f=ne(l);y=y.map((S,z)=>z===f?{...S,...u}:S),d=f}return d===null?null:(x=M(),R(),d)},M=()=>_t({set:{layers:y,groundBands:F,skyLayer:p},camera:j,camera_more:G,camera_motion:b}),_=()=>{const l=I?.selected??null;return l===null||se>0||window.__timelineKeying?.playing?.()?[]:Rr(y.map((u,d)=>({index:d,box:E.has(`layer-${d}`)?null:s.layerBox(d)})),l)},T=()=>o?Yt(o):8,P=()=>Gr(j,G,T()),U=()=>Kr(j,G,ce(),T()),q=l=>{const[u=null,...d]=Yr(l);j=u,G=d,o&&(o={...o,camera:j,camera_more:G}),x=M(),L.sceneId!=null&&t.onCommit?.(0,{camera:j,camera_more:G},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},me=l=>{if(!o)return;const u=ce(),d=P();if(window.__timelineKeying?.autoKey?.()||!d.length){const f=!d.length&&u>0?st(d,0,U()):d;return q(st(f,u,l))}q(st(d,jr(d,u).t,l))},he=()=>{let l=null;const u=f=>{f.preventDefault(),f.stopImmediatePropagation()};n.addEventListener("pointerdown",f=>{C&&(u(f),n.setPointerCapture?.(f.pointerId),l={x:f.clientX,y:f.clientY,pose:U()},n.style.cursor="grabbing")},{capture:!0}),n.addEventListener("pointermove",f=>{C&&(u(f),l&&me($r(l.pose,f.clientX-l.x,f.clientY-l.y,n.getBoundingClientRect().height)))},{capture:!0});const d=f=>{l&&(u(f),l=null,n.style.cursor=C?"grab":"")};n.addEventListener("pointerup",d,{capture:!0}),n.addEventListener("pointercancel",d,{capture:!0}),n.addEventListener("wheel",f=>{C&&(u(f),me(Hr(U(),f)))},{capture:!0,passive:!1}),window.addEventListener("scene-object-selected",f=>{f.detail?.id!=="s25_camera"&&L.frameCamera(!1)})},_e=()=>({...r.set,layers:y,groundBands:F,skyLayer:p}),dt=(l,u)=>{const d=te(l,u);d===null||L.sceneId==null||(typeof d=="number"?t.onCommit?.(d,u,L.sceneId):t.onCommit?.(0,d,L.sceneId))},ce=()=>h?h():m,ft=()=>r?.set?.sky&&A?i.get(r.set.sky)??Ce(A,{asset:r.set.sky},"sky"):null,ze=l=>{const u=i.get(y[l]?.asset);return!!(y[l]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&y[l].depth!=="sky")},Is=l=>l==="sky"||X(l)>=0,Bs=(l,u)=>{const d=s?.pickBackdrops?.(l,u).find(S=>!E.has(S.band!==void 0?`band-${S.band}`:`layer-${S.index}`)&&K.opaque(S.asset,S.u,S.v)),f=d?d.band!==void 0?`band-${d.band}`:`layer-${d.index}`:r?.set?.sky?"sky":null;return f&&L.select(f),!!f},tn=(l,u)=>Se(u)||gs(l,u),nn=l=>{const u=i.get(y[l]?.asset);return!!u&&tn(y[l],u)},De=l=>we(y[l],ce()).z??ee[y[l].depth],Vs=l=>ze(l)&&!(y[l].keys??[]).some(u=>u.scale!==void 0),sn=l=>Math.round(l*1e3)/1e3,on=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],L={canvas:n,sceneId:null,async show(l){const u=await ti(l.bundle);if(g)return;s||(s=new or(n,u),ae()),Z={...l.look??{}},s.setLook(Z);const d=ni(l);await s.build(d,u),o=d,y=d.set.layers,F=(d.set.groundBands??[]).map(f=>({...f})),p={...d.set.skyLayer??{}},j=d.camera,G=d.camera_more??[],b=d.camera_motion??null,E=new Set,x=_t(l),r=l,i=new Map(u.assets.map(f=>[f.id,f])),A=u,K=ei(u.base),K.prime(d.set.layers.map(f=>i.get(f.asset)).filter(Boolean)),t.editable&&!I&&(n.style.pointerEvents="auto",he(),window.addEventListener("scene-object-selected",f=>{f.detail?.id!==`s25_${H}`&&(H=null)}),n.addEventListener("dragover",f=>{f.dataTransfer?.types?.includes(ts)&&(f.preventDefault(),f.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",f=>{const S=f.dataTransfer?.getData(ts);if(!S)return;f.preventDefault();const z=n.getBoundingClientRect();L.addLayer(S,{x:f.clientX-z.left,y:f.clientY-z.top})}),n.addEventListener("dblclick",()=>{const f=H??(I?.selected!=null?`layer-${I.selected}`:null),S=f&&L.editTarget(f);S&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:S}))}),I=Ir({canvas:n,host:e,stage:()=>s,alpha:{opaque:(f,S,z,V)=>!E.has(`layer-${V}`)&&K.opaque(f,S,z,Ae(f)?As(f,y[V]?.play,ce()):void 0)},valueOf:(f,S)=>S==="z"?De(f):we(y[f],ce())[S],onGround:ze,byDistance:Vs,groundUnder:(f,S,z,V)=>Gn(s.pointerRay(f,S),nn(V)?z:O=>s.groundHeightAt(O)+z),footY:f=>s.layerFootY(f)-(nn(f)?0:s.groundHeightAt(De(f))),eye:on,onSettled:f=>L.settleBand(f),onEmpty:(f,S)=>Bs(f,S),onChange:(f,S,z)=>L.moveLayer(`layer-${f}`,S,z)})),(I?.selected??-1)>=y.length&&I.select(null),c=new Map(u.assets.map(f=>[f.id,f.height_m??1.7])),v=Number(l.narration_at_s)||0,a=Kn(l),e.dataset.stage25dReady="1"},editTarget(l){const u=l==="sky"?r?.set?.sky?p:null:X(l)>=0?F[X(l)]:y[ne(l)],d=l==="sky"?ft():i.get(u?.asset);return!u||!d||!A?null:{id:`s25_${l}`,title:L.items().find(f=>f.id===l)?.label??ve({},d,(document.documentElement.lang||"en").slice(0,2)),original:A.base+d.file,state:u.edit_state??null,edited:!!u.src,el:e}},matches:l=>a===Kn(l),adopt(l){const u=_t(l);if(u===x)return!1;x=u;const d=(f,S)=>{const z={...f};for(const V of Qt)S?.[V]===void 0?delete z[V]:z[V]=S[V];return z};return y=y.map((f,S)=>d(f,l.set?.layers?.[S])),F=F.map((f,S)=>d(f,l.set?.groundBands?.[S])),p=d(p,l.set?.skyLayer),j=l.camera??null,G=l.camera_more??[],b=l.camera_motion??null,o=o&&{...o,camera:j,camera_more:G,camera_motion:b},r=l,R(),!0},setLayerProp(l,u,d){te(l,{[u]:d})},setLayerKeys(l,u){const d=B(l);d&&JSON.stringify(d.keys??[])!==JSON.stringify(u)&&te(l,{keys:u})},commitLayerProp(l,u,d){dt(l,{[u]:d})},readLayerProp(l,u){const d=B(l),f=d?u==="z"&&ne(l)>=0?De(ne(l)):u==="z"?we(d,ce()).z??d.z:we(d,ce())[u]:null;return Number.isFinite(f)?f:null},setHidden(l,u){ne(l)<0&&X(l)<0||(E=new Set(u?[...E,l]:[...E].filter(d=>d!==l)),R())},update(l){h=null,m=Math.max(0,l)},play(l){h=()=>v+l()},moveLayer(l,u,d){window.__timelineKeying?.edit?.(`s25:${l}`,u,d,{flush:!1})||L.commitLayerProp(l,u,d)},select(l){if(l==="camera"){H=null,I?.select(null),L.frameCamera(!0),window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_camera"}}));return}L.frameCamera(!1),H=Is(l)?l:null,I?.select(ne(l)>=0?ne(l):null,!H),H&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${H}`}}))},get skySelected(){return H==="sky"},get backdrop(){return H},get selection(){return I?.selected??null},clearSelection(){I?.select(null),L.frameCamera(!1)},frameCamera(l){C=!!l,n.style.cursor=C?"grab":"",window.dispatchEvent(new CustomEvent("stage25d-edited"))},cameraInfo:()=>({framing:C,moves:!!j,keys:P(),pose:U(),motion:{kind:"none",amount:1,speed:1,...b}}),setCameraMotion(l){b={kind:"none",amount:1,speed:1,...b,...l},o&&(o={...o,camera_motion:b}),x=M(),L.sceneId!=null&&t.onCommit?.(0,{cameraMotion:b},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},setCameraValue(l,u){me({...U(),[l]:u})},toggleCameraKey(){const l=ce(),u=P();q(u.some(d=>Math.abs(d.t-l)<.001)?Wr(u,l):st(u,l,U()))},resetCamera(){q([])},atStart(){return m===0&&h===null&&E.size===0&&!C},layerInfo(l){const u=(O,Q)=>{const pe=typeof O.motion=="string"?{kind:O.motion}:O.motion??{};return{kind:pe.kind??ys(Q),amount:pe.amount??1,speed:pe.speed??1}};if(l==="sky"){const O=ft();return O?{id:l,asset:O.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:ve({},O,(document.documentElement.lang||"en").slice(0,2)),file:p.src??`${A.base}${O.file}`,motion:u(p,O)}:null}if(X(l)>=0){const O=F[X(l)],Q=i.get(O.asset);return{id:l,asset:O.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:L.items().find(pe=>pe.id===l)?.label??"",file:O.src??(Q?`${A.base}${Q.file}`:null),motion:u(O,Q)}}const d=y[ne(l)];if(!d)return null;const f=i.get(d.asset)??null,S=ze(ne(l)),z=!S||(d.scale??1)!==1||(d.keys??[]).some(O=>O.scale!==void 0),V=f?.layer==="bg"&&!f.tileable_x;return{id:l,asset:d.asset??null,depth:d.depth,figure:d.figure??null,role:f?.layer??null,ground:S,showScale:z,fields:S?["x","z",...z?["scale"]:[],"rotation","opacity"]:["x",...V?["z"]:[],"y","scale","rotation","opacity"],label:L.items().find(O=>O.id===l)?.label??ve(d,f,(document.documentElement.lang||"en").slice(0,2)),file:d.src??(f?`${A.base}${f.file}`:null),motion:u(d,f),anim:es(f),play:{speed:d.play?.speed??1,offset:d.play?.offset??0}}},setLayerPlay(l,u){const d=B(l);d&&dt(l,{play:{...d.play??{},...u}})},setLayerMotion(l,u){const d=B(l);d&&dt(l,{motion:{...typeof d.motion=="object"?d.motion:{kind:d.motion},...u}})},reorderLayers(l,u,d){if(!ze(u)){d(l,u,L.sceneId,null,null,null);return}const f=ke=>y[ke]?.z??ee[y[ke]?.depth],S=l.filter(ke=>ke===u||ze(ke)),z=S.indexOf(u),V=S[z-1],O=S[z+1],Q=De(u),pe=V===void 0?0:f(V),mt=O===void 0?1/0:f(O);if((V!==void 0||O!==void 0)&&(Q<pe||Q>mt)){const ke=Gt(we(y[u],ce()).x,Q),Ns=V===void 0?mt/1.25:O===void 0?pe*1.25:(pe+mt)/2,qe=Math.round(Math.min(oe.cells[1][1],Math.max(oe.cells[0][1],Ns))*100)/100,pt=on(),Us=(qe-pt[1])/Math.max(.1,Q-pt[1]),an=ue=>sn(Math.min(20,Math.max(.01,ue*Us))),$s=y[u].keys?.some(ue=>ue.z!==void 0||ue.scale!==void 0)?y[u].keys.map(ue=>({...ue,...ue.z!==void 0&&{z:Math.min(oe.cells[1][1],Math.max(oe.cells[0][1],sn(ue.z+qe-Q)))},...ue.scale!==void 0&&{scale:an(ue.scale)}})):null;d(l,u,L.sceneId,ct(Jt(ke,qe,pt)).x,qe,an(y[u].scale??1),$s);return}d(l,u,L.sceneId,y[u].x??.5,f(u),y[u].scale??1)},library(){if(!A)return null;const l=(document.documentElement.lang||"en").slice(0,2);return{bundle:A.bundle,assets:A.assets.filter(u=>u.kind!=="sheet").map(u=>({id:u.id,layer:u.layer,shelf:qr(u),anim:es(u),band:Bt(u),tags:u.tags??[],url:A.base+u.file,thumb:$(u),label:ve({},u,l)}))}},tiles:l=>Rs(l),seriesOfLayer(l){const u=i.get(y[ne(l)]?.asset),d=Xe(u);if(!d||!A)return null;const f=(document.documentElement.lang||"en").slice(0,2),S=z=>({id:z.id,url:A.base+z.file,thumb:$(z),...Oe(z)});return{series:d,asset:u.id,members:br(A.assets,u).map(S),characters:kr(A.assets).map(z=>({series:z.series,url:A.base+z.asset.file,thumb:$(z.asset),label:ve({},z.asset,f)}))}},async switchCharacter(l,u){const d=i.get(y[ne(l)]?.asset),f=d&&A?Mr(A.assets,d,u):null;f&&await L.swapAsset(l,f.id)},async swapAsset(l,u){if(l==="sky"){if(i.get(u)?.layer!=="sky"||ft()?.id===u)return;await L.show({...r,set:{..._e(),sky:u}}),L.sceneId!=null&&t.onCommit?.(0,{sky:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const d=F[X(l)];if(d){const S=i.get(u);if(!S||!Bt(S)||d.asset===u)return;const z=Number(l.slice(5)),V=F.map((O,Q)=>Q===z?{...O,asset:u}:O);await L.show({...r,set:{..._e(),groundBands:V}}),L.sceneId!=null&&t.onCommit?.(0,{band:{index:z,asset:u}},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L.select(l);return}const f=ne(l);f<0||!y[f]||!i.has(u)||y[f].asset===u||(y=y.map((S,z)=>z===f?{...S,asset:u}:S),await L.show({...r,set:_e()}),t.onCommit?.(f,{asset:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(l,u=null){const d=i.get(l);if(!d)return;const f=["mid","fg","near","bg","sky"].includes(d.layer)?d.layer:d.layer==="figure"?"fg":"mid",S=u?0:y.filter(V=>V.asset===l).length;let z={asset:l,depth:f,x:.5+.08*(S%5),scale:1};if(!(d.tileable_x||d.layer==="bg"||d.layer==="sky")){const V=u&&s?Gn(s.pointerRay(u.x,u.y),tn({},d)?0:Q=>s.groundHeightAt(Q)):null,O=ct(Ht(V??Gt(z.x,ee[f])));z={...z,...O,depth:gn(O.z)}}y=[...y,z],await L.show({...r,set:_e()}),t.onCommit?.(y.length-1,{add:z},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),I?.select(y.length-1,!0)},async settleBand(l){const u=y[l];if(!u||!ze(l))return;const d=gn(De(l));if(d===u.depth)return;y=y.map((S,z)=>z===l?{...S,depth:d}:S);const f=E;await L.show({...r,set:_e()}),E=f,R(),L.sceneId!=null&&t.onCommit?.(l,{depth:d},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),I?.select(l,!1)},groundSlots(){if(!A||!r)return null;const l=(document.documentElement.lang||"en").slice(0,2),u=bs(r.set??{},A).map(f=>({asset:f.asset.id,from_m:f.from})),d=A.assets.filter(f=>f.layer==="ground").map(f=>({id:f.id,label:ve({},f,l),thumb:$(f)}));return{rows:u,options:d,max:Nt}},async setGroundSlots(l){if(!r||!Array.isArray(l))return;const u=l.slice(0,Nt).map((f,S)=>({asset:String(f.asset),from_m:S===0?0:Math.max(0,Math.min(2e3,Number(f.from_m)||0))})),d=E;await L.show({...r,look:Z,set:{..._e(),groundSlots:u}}),E=d,R(),L.sceneId!=null&&t.onGroundSlots?.(u,L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},lookControls(){return Qn.map(l=>{const[u,d,f]=Ta[l]??[0,1,.01];return{key:l,min:u,max:d,step:f,value:re({...$t,...Z},l)}})},setLook(l,u){!Qn.includes(l)||!Number.isFinite(u)||!s||(Z={...Z,[l]:u},s.setLook(Z),t.onLook?.(l,u,L.sceneId))},async still(l=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const d=document.createElement("canvas");return d.width=l,d.height=Math.max(1,Math.round(l*n.height/n.width)),d.getContext("2d").drawImage(n,0,0,d.width,d.height),d.toDataURL("image/jpeg",.72)};return s.engine.resize(),se++,s.gridHidden=!0,new Promise(d=>{let f=0;const S=O=>{s.engine.onEndFrameObservable.remove(z),clearTimeout(V),s.gridHidden=--se>0,d(O)},z=s.engine.onEndFrameObservable.add(()=>{++f>=6&&S(u())}),V=setTimeout(()=>S(null),4e3)})},get config(){return r},figureBox(l){const u=y.find(z=>z.figure===l);if(!u?.asset)return null;const d=fr(o,u,c.get(u.asset)??1.7,ce());if(!d)return null;const f=n.getBoundingClientRect(),S=f.width*.05;return new DOMRect(f.left+d.x*f.width-S/2,f.top+d.y*f.height,S,f.height*.08)},items:()=>{const l=(document.documentElement.lang||"en").slice(0,2),u=yr([...y.map((d,f)=>ve(d,i.get(d.asset),l)||`layer ${f+1}`),...F.map(d=>ve({},i.get(d.asset)??{id:d.asset},l))]);return[...y.map((d,f)=>({id:`layer-${f}`,label:u[f],icon:wr(i.get(d.asset)),depth:d.depth,z:d.z??ee[d.depth],keys:d.keys??[]})),...F.map((d,f)=>({id:`band-${f}`,label:u[y.length+f],icon:"photo",depth:"bg",z:d.z,keys:d.keys??[],backdrop:!0})),...r?.set?.sky?[{id:"sky",label:Xr[l]??"Sky",icon:"cloud",depth:"sky",keys:p.keys??[],backdrop:!0}]:[],{id:"camera",label:Zr[l]??"Camera",icon:"camera",depth:null,keys:[]}]},destroy(){g=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}I?.destroy(),n.remove()}};return L}export{ts as DROP_TYPE,Qn as LOOK_KEYS,mi as createStage25d,ni as stageScene};
