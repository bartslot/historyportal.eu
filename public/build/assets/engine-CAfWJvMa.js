import{m as Gs,c as Ws,M as ct,S as Xe,R as es,C as we,T as pe,V as N,E as ce,a as Gt,b as Ce,P as js,d as on,e as an,f as ts,g as Ys,h as Ks,i as Xs,j as ns,U as Zs,H as qs,D as Js}from"./babylon-DoYGJMOP.js";import{l as Qs}from"./config-DwQUN7uY.js";import{handleCss as eo}from"./ArtworkOverlay-K7k1i9Kc.js";import{g as zt,c as to,w as rn,h as no,e as so}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-BlhrRg0J.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-B2Xtsr8E.js";import"./ambient-CEzLlAaX.js";import"./alpha-mask-C1RIm4VB.js";const He=new Set;let Ft=!1;function oo(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;He.size&&He.clear();let a=ss(e,0,o,n,!0);const r=[];if(!a||a.next===a.prev)return r;let i=0,c=0,m=0;if(s&&(a=co(e,t,a,n)),e.length>80*n){i=e[0],c=e[1];let h=i,v=c;for(let k=n;k<o;k+=n){const w=e[k],g=e[k+1];w<i&&(i=w),g<c&&(c=g),w>h&&(h=w),g>v&&(v=g)}m=Math.max(h-i,v-c),m=m!==0?32767/m:0}return Tt(a,r,i,c,m),r}function ss(e,t,n,s,o){let a=null;if(o===Mo(e,t,n,s)>0)for(let r=t;r<n;r+=s)a=hn(r/s|0,e[r],e[r+1],a);else for(let r=n-s;r>=t;r-=s)a=hn(r/s|0,e[r],e[r+1],a);return a&&Ge(a,a.next)&&(je(a),a=a.next),a}function Se(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&(He.size===0||!He.has(s))&&(Ge(s,s.next)||Y(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),Ft=!0,je(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function Tt(e,t,n,s,o){o&&xo(e,n,s,o);let a=e,r=!1;for(;e.prev!==e.next;){const i=e.prev,c=e.next;if(Y(i,e,c)<0&&(o?ro(e,n,s,o):ao(e))){t.push(i.i,e.i,c.i),je(e),e=c,a=c;continue}if(e=c,e===a){if(Ft=!1,e=Se(e),Ft){a=e;continue}if(!r){e=io(e,t),a=e,r=!0;continue}lo(e,t,n,s,o);break}}}function ao(e){const t=e.prev,n=e,s=e.next,o=t.x,a=n.x,r=s.x,i=t.y,c=n.y,m=s.y,h=Math.min(o,a,r),v=Math.min(i,c,m),k=Math.max(o,a,r),w=Math.max(i,c,m);let g=s.next;for(;g!==t;){if(g.x>=h&&g.x<=k&&g.y>=v&&g.y<=w&&!(o===g.x&&i===g.y)&&rt(o,i,a,c,r,m,g.x,g.y)&&Y(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function ro(e,t,n,s){const o=e.prev,a=e,r=e.next,i=o.x,c=a.x,m=r.x,h=o.y,v=a.y,k=r.y,w=Math.min(i,c,m),g=Math.min(h,v,k),y=Math.max(i,c,m),F=Math.max(h,v,k),p=Ot(w,g,t,n,s),E=Ot(y,F,t,n,s);let x=e.prevZ;for(;x&&x.z>=p;){if(x.x>=w&&x.x<=y&&x.y>=g&&x.y<=F&&x!==r&&!(i===x.x&&h===x.y)&&rt(i,h,c,v,m,k,x.x,x.y)&&Y(x.prev,x,x.next)>=0)return!1;x=x.prevZ}let A=e.nextZ;for(;A&&A.z<=E;){if(A.x>=w&&A.x<=y&&A.y>=g&&A.y<=F&&A!==r&&!(i===A.x&&h===A.y)&&rt(i,h,c,v,m,k,A.x,A.y)&&Y(A.prev,A,A.next)>=0)return!1;A=A.nextZ}return!0}function io(e,t){let n=e,s=!1;do{const o=n.prev,a=n.next.next;rs(o,n,n.next,a,!1)&&We(o,a)&&We(a,o)&&(t.push(o.i,n.i,a.i),je(n),je(n.next),n=e=a,s=!0),n=n.next}while(n!==e);return s?Se(n):n}function lo(e,t,n,s,o){let a=e;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&wo(a,r)){let i=is(a,r);a=Se(a,a.next),i=Se(i,i.next),Tt(a,t,n,s,o),Tt(i,t,n,s,o);return}r=r.next}a=a.next}while(a!==e)}let Lt=!1;function co(e,t,n,s){const o=[];for(let a=0,r=t.length;a<r;a++){const i=t[a]*s,c=a<r-1?t[a+1]*s:e.length,m=ss(e,i,c,s,!1);m===m.next&&He.add(m),o.push(vo(m))}o.sort(ho),fo(e.length/s,t.length),as(n,n),Lt=!0;for(let a=0;a<o.length;a++)n=uo(o[a],n);return Lt=!1,Se(n)}function ho(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function uo(e,t){const n=po(e,t);if(!n)return t;const s=is(n,e),o=s.next;return as(n,o.next),Se(s,s.next),Se(n,n.next)}const os=16;let G=new Float64Array(0),at=0;const Ct=[],Pt=[];function fo(e,t){const n=Math.ceil((e+2*t)/os)+t+2;G.length<n*4&&(G=new Float64Array(n*4)),at=0}function as(e,t){let n=e;do{const s=at++;Ct[s]=n;let o=1/0,a=1/0,r=-1/0,i=-1/0,c=0;do{const h=n.next;n.z=s,n.x<o&&(o=n.x),n.x>r&&(r=n.x),n.y<a&&(a=n.y),n.y>i&&(i=n.y),h.x<o&&(o=h.x),h.x>r&&(r=h.x),h.y<a&&(a=h.y),h.y>i&&(i=h.y),n=h}while(++c<os&&n!==t);Pt[s]=n;const m=s*4;G[m]=o,G[m+1]=a,G[m+2]=r,G[m+3]=i}while(n!==t)}function mo(e,t){const n=e.z*4;t.x<G[n]&&(G[n]=t.x),t.y<G[n+1]&&(G[n+1]=t.y),t.x>G[n+2]&&(G[n+2]=t.x),t.y>G[n+3]&&(G[n+3]=t.y)}function ln(e){let t=Pt[e];for(;t.prev.next!==t;)t=t.next;return Pt[e]=t,t}function cn(e){let t=Ct[e];for(;t.prev.next!==t;)t=t.next;return Ct[e]=t,t}function po(e,t){let n=t;const s=e.x,o=e.y;let a=-1/0,r;if(Ge(e,n))return n;for(let k=0,w=0;k<at;k++,w+=4){if(o<G[w+1]||o>G[w+3]||G[w]>s||G[w+2]<=a)continue;const g=ln(k);n=cn(k);do{if(n.prev.next===n){if(Ge(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const y=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(y<=s&&y>a&&(a=y,r=n.x<n.next.x?n:n.next,y===s))return r}}n=n.next}while(n!==g)}if(!r)return null;const i=r.x,c=r.y,m=Math.min(o,c),h=Math.max(o,c);let v=1/0;for(let k=0,w=0;k<at;k++,w+=4){if(G[w+2]<i||G[w]>s||G[w+3]<m||G[w+1]>h)continue;const g=ln(k);n=cn(k);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&rt(o<c?s:a,o,i,c,o<c?a:s,o,n.x,n.y)){const y=Math.abs(o-n.y)/(s-n.x);(We(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(y<v||y===v&&(n.x>r.x||n.x===r.x&&go(r,n)))&&(r=n,v=y)}n=n.next}while(n!==g)}return r}function go(e,t){return Y(e.prev,e,t.prev)<0&&Y(t.next,e,e.next)<0}const le=[];let De=[],ke=new Uint32Array(0),Re=new Uint32Array(0);const Ie=new Uint32Array(256);function xo(e,t,n,s){let o=e,a=0;do o.z=Ot(o.x,o.y,t,n,s),le[a++]=o,o=o.next;while(o!==e);yo(a);let r=null;for(let i=0;i<a;i++){const c=le[i];c.prevZ=r,r&&(r.nextZ=c),r=c}r.nextZ=null}function yo(e){if(e<=32){for(let t=1;t<e;t++){const n=le[t],s=n.z;let o=t-1;for(;o>=0&&le[o].z>s;)le[o+1]=le[o],o--;le[o+1]=n}return}ke.length<e&&(ke=new Uint32Array(e),Re=new Uint32Array(e),De=new Array(e));for(let t=0;t<e;t++)ke[t]=le[t].z;qe(e,le,ke,De,Re,0),qe(e,De,Re,le,ke,8),qe(e,le,ke,De,Re,16),qe(e,De,Re,le,ke,24)}function qe(e,t,n,s,o,a){Ie.fill(0);for(let i=0;i<e;i++)Ie[n[i]>>>a&255]++;let r=0;for(let i=0;i<256;i++){const c=Ie[i];Ie[i]=r,r+=c}for(let i=0;i<e;i++){const c=n[i],m=Ie[c>>>a&255]++;s[m]=t[i],o[m]=c}}function Ot(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function vo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function rt(e,t,n,s,o,a,r,i){return(o-r)*(t-i)>=(e-r)*(a-i)&&(e-r)*(s-i)>=(n-r)*(t-i)&&(n-r)*(a-i)>=(o-r)*(s-i)}function wo(e,t){const n=Ge(e,t)&&Y(e.prev,e,e.next)>0&&Y(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||We(e,t)&&We(t,e)&&(Y(e.prev,e,t.prev)!==0||Y(e,t.prev,t)!==0))&&!bo(e,t)&&(n||ko(e,t))}function Y(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Ge(e,t){return e.x===t.x&&e.y===t.y}function rs(e,t,n,s,o=!0){const a=Y(e,t,n),r=Y(e,t,s),i=Y(n,s,e),c=Y(n,s,t);return(a>0&&r<0||a<0&&r>0)&&(i>0&&c<0||i<0&&c>0)?!0:o?!!(a===0&&Je(e,n,t)||r===0&&Je(e,s,t)||i===0&&Je(n,e,s)||c===0&&Je(n,t,s)):!1}function Je(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function bo(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let r=e;do{const i=r.next;if(r.x>s&&i.x>s||r.x<n&&i.x<n||r.y>a&&i.y>a||r.y<o&&i.y<o){r=i;continue}if(r.i!==e.i&&i.i!==e.i&&r.i!==t.i&&i.i!==t.i&&rs(r,i,e,t))return!0;r=i}while(r!==e);return!1}function We(e,t){return Y(e.prev,e,e.next)<0?Y(e,t,e.next)>=0&&Y(e,e.prev,t)>=0:Y(e,t,e.prev)<0||Y(e,e.next,t)<0}function ko(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const r=n.next;n.y>a!=r.y>a&&o<(r.x-n.x)*(a-n.y)/(r.y-n.y)+n.x&&(s=!s),n=r}while(n!==e);return s}function is(e,t){const n=Dt(e.i,e.x,e.y),s=Dt(t.i,t.x,t.y),o=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,a.next=s,s.prev=a,s}function hn(e,t,n,s){const o=Dt(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function je(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),Lt&&mo(e.prev,e.next)}function Dt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function Mo(e,t,n,s){let o=0;for(let a=t,r=n-s;a<n;a+=s)o+=(e[r]-e[a])*(e[a+1]+e[r+1]),r=a;return o}Object.assign(window,{BABYLON:{...Ws,...Gs},earcut:oo});(()=>{const e=`
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
    }`})();const So=new WeakMap;function Eo(e){return So.get(e)?.rtt??null}const Ao=450,un=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],dn=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],fn={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},_o={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function zo(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),r=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(x=>x.name!=="sky-cloud"&&!(x.metadata&&x.metadata.noGBuffer)))}),i=a.getGBuffer().textures,c=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],m=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=x=>new BABYLON.Vector2(1/x.width,1/x.height),v=new BABYLON.Matrix,k=["invView","tanHalf","resolution","skyDepth"],w=["depthSampler","normalSampler"];function g(x,A){t.getViewMatrix().invertToRef(v);const U=Math.tan(t.fov/2);x.setMatrix("invView",v),x.setVector2("tanHalf",new BABYLON.Vector2(U*A.width/A.height,U)),x.setVector2("resolution",new BABYLON.Vector2(A.width,A.height)),x.setFloat("skyDepth",Ao),x.setTexture("depthSampler",c),x.setTexture("normalSampler",m)}const y=new BABYLON.PostProcess("wash","wash",["texel","radius",...k],w,1,t);y.onApply=x=>{g(x,y),x.setVector2("texel",h(y)),x.setFloat("radius",n.num("wash"))};const F=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...un,...k],["aquarelSampler",...w],1,t);F.onApply=x=>{g(x,F),x.setVector2("texel",h(F));const A=n.texture();x.setFloat("useTex",A?1:0),x.setTexture("aquarelSampler",A||s),un.forEach(U=>x.setFloat(U,n.num(U)))};const p=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...dn,...k],["washSampler","animeSampler",...w],1,t);p.onApply=x=>{g(x,p),x.setTextureFromPostProcessOutput("washSampler",y),x.setTexture("animeSampler",Eo(e)||o),x.setVector2("texel",h(p)),dn.forEach(A=>x.setFloat(A,n.num(A))),x.setColor3("inkColor",BABYLON.Color3.FromArray(fn[n.inkColor()]||fn["blue-grey"]))};const E=[y,F,p];return{dispose(){E.forEach(x=>x.dispose(t)),e.onBeforeRenderObservable.remove(r),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const te={sky:380,bg:70,mid:22,fg:7,near:3.5},D={x:0,y:1.6,z:0,fov:50},ht=-2,ls=16/9,cs=.42,pt=1.6,Fo=3,hs=e=>Fo*fe(e),To=(e,t)=>t*e,Lo=(e,t,n,s)=>To(e,t)-(1-s)*n,Ye=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Co=999,Po=1e3,Oo=.02,us=2,Wt=120,ds=.05,de=e=>e>Math.PI?e*Math.PI/180:e,fe=(e,t=D.fov,n=ls)=>2*e*Math.tan(de(t)/2)*n;function mn(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const pn=e=>e.z??te[e.depth],Do=e=>Math.min(1,Math.max(0,(e-te.mid)/(te.bg-te.mid)));function Rt(e,t){return e<=te.bg||t===0?Do(e)*t:D.y+(t-D.y)*e/te.bg}const Ro=(e,t)=>t?e+t.h*(1-t.top):e,Io=["ground","path","field","ramp","water"],Me=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Io.includes(t)),Bo=2,It=e=>Me(e)&&e.w/Math.max(1,e.h)>=Bo,fs=(e,t,n,s)=>Math.min(0,Lo(e,t,n,s)),gn=[2,2e3],Vo=4,xn=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??D.z,n?.to?.z??D.z),D.z);function No(e,t,n,s,o,a,r=D.z){const i=ve({...e},t),c=Math.min(gn[1],Math.max(gn[0],i.z??e.z)),m=Math.max(c,r+Vo),h=hs(m)/s,v=o*h*i.scale;return{z:m,h:v,w:s*h*i.scale,sx:h*i.scale,sy:h*i.scale,x:(i.x-.5)*fe(m),y:fs(m,n,v,a),alphaIndex:Ye(c),opacity:i.opacity}}const ms=(e,t)=>!!e.flat||t.layer==="ground";function Be(e,t,n,s=0,o=s){const a=t.depth,r=pn(t)-n*ds,i=fe(r),c=a==="sky"?n*2+1:Ye(r);if(e.layer==="sky"){const F=i*pt,p=F/ls,E=-p*.12+(t.y??0);if(e.tileable_x)return{x:0,y:E,z:r,w:F,h:p,uRepeat:F/(p*(e.w/e.h)),alphaIndex:c,rotation:0};const x=Math.max(F/e.w,p/e.h);return{x:0,y:E,z:r,w:e.w*x,h:e.h*x,uRepeat:1,alphaIndex:c,rotation:0}}const m=e.layer==="bg"&&!e.tileable_x?i*pt*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),m),v=h*(e.w/e.h),k=e.tileable_x?Math.max(v,i*pt):v,w=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?a==="bg"?s:0:Me(e)?0:Rt(pn(t),o),y=a==="sky"?r*Math.tan(de(D.fov)/2)*.45:g;return{x:w,y:y+(t.y??0),z:r,w:k,h,uRepeat:e.tileable_x?k/v:1,alphaIndex:c,rotation:t.rotation??0}}function Uo(e,t,n=0,s=cs,o=ht){const a=.5/Math.tan(de(D.fov)/2),r=.5+a*Math.tan(-o*Math.PI/180),i=te.bg-n*ds,c=D.y+(r-s)*i/a;return Math.round((c-t*(1-e))*10)/10}const Qe=e=>e-$o,$o=.002,yn={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},ps=(e,t)=>(yn[e??"inOut"]??yn.inOut)(Math.min(1,Math.max(0,t))),Fe=(e,t,n)=>e+(t-e)*n,jt=e=>e.dur_s??(e.camera&&Jo(e)||e.est_s||8);function Yt(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function Kt(e,t,n){if(!e)return{...D,fov:de(D.fov)};const s=ps(e.ease,n>0?t/(e.dur_s??n):1),o={...D,...e.from},a={...o,...e.to};return{x:Fe(o.x,a.x,s),y:Fe(o.y,a.y,s),z:Fe(o.z,a.z,s),fov:Fe(de(o.fov),de(a.fov),s),roll:Fe(o.roll??0,a.roll??0,s)}}const Ho={sway:{x:.08,y:.05,roll:1.6,hz:.18},handheld:{x:.02,y:.02,roll:.25,hz:.35},shake:{x:.05,y:.05,roll:.6,hz:6}},gt=(e,t)=>(Math.sin(e*1+t)+.6*Math.sin(e*2.17+t*2.3)+.3*Math.sin(e*3.71+t*4.1))/1.9;function Go(e,t){const n=e?.kind;if(!n||n==="none")return{x:0,y:0,roll:0};const s=Ho[n],o=e.amount??1,a=t*s.hz*(e.speed??1)*2*Math.PI;return{x:s.x*o*gt(a,1),y:s.y*o*gt(a,2),roll:s.roll*o*gt(a,3)}}const Wo=["x","y","z","scale","opacity","rotation"];function ve(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const a of Wo){const r=s.filter(k=>k[a]!==void 0).sort((k,w)=>k.t-w.t);if(!r.length)continue;const i=r[0],c=r[r.length-1];if(t<=i.t){o[a]=i[a];continue}if(t>=c.t){o[a]=c[a];continue}const m=r.findIndex(k=>k.t>t),h=r[m-1],v=r[m];o[a]=Fe(h[a],v[a],ps("inOut",(t-h.t)/(v.t-h.t)))}return o}const jo={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},gs=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function vn(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??gs(e),amount:n.amount??1,speed:n.speed??1}}const Yo=.25,Ko=2e3,Xo=250,ze={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},wn={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function Zo(e,t,n,s){const o=i=>{const c=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:c,lastUp:i===-1?n:e.lastUp,locked:e.locked||c>=ze.lockFlips&&i===1}};if(t<ze.downFps)return s?o(1):{...e,fast:0};if(t<ze.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=ze.upWindows&&n-e.lastChange>=ze.upAfterChangeMs&&n-e.lastUp>=ze.upEveryMs?o(-1):{...e,fast:a}}function qo(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*Yo)}function Jo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const bn={breath_m:.05,breath_s:7},Qo=1.5;function ea(e,t,n={}){const s=n.breath_m??bn.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??bn.breath_s),a=Math.min(1,t/Qo),r=a*a*(3-2*a);return{...e,x:e.x+s*r*Math.sin(o*t),y:e.y+s*.5*r*Math.sin(2*o*t)}}async function ta(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const na=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Le(e,t,n){if(t.asset){const r=e.assets.find(i=>i.id===t.asset);if(r)return r}const s=na(t.need??t.asset??"");if(!s.length)return null;let o=null,a=[0,0,0];for(const r of[...e.assets].sort((i,c)=>i.id.localeCompare(c.id))){const i=s.filter(m=>r.tags.some(h=>h.toLowerCase()===m)).length;if(!i)continue;const c=[i,n&&r.layer===n?1:0,r.qa?.score??0];(!o||c[0]>a[0]||c[0]===a[0]&&(c[1]>a[1]||c[1]===a[1]&&c[2]>a[2]))&&(o=r,a=c)}return o}const Te="#f6f5ee",sa=.22,oa=(e,t)=>e.layer==="bg"?t.feather??sa:0,xt=.6,Bt=12;function xs(e,t){const n=t.paper??Te,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(r=>r.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((r,i)=>r.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const a=Le({...t,assets:o},{asset:s},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function aa(e,t,n,s=.08){return ys(e,t,n,1-s,1)}function ys(e,t,n,s,o){const a=Math.max(0,Math.floor(n*s)),r=Math.min(n,Math.max(a+1,Math.ceil(n*o))),i=[[],[],[]],c=Math.max(1,Math.floor(t*(r-a)/2e4));for(let h=a*t;h<r*t;h+=c){const v=h*4;e[v+3]<200||(i[0].push(e[v]),i[1].push(e[v+1]),i[2].push(e[v+2]))}if(!i[0].length)return null;const m=h=>{const v=[...h].sort((k,w)=>k-w);return v[v.length>>1]/255};return[m(i[0]),m(i[1]),m(i[2])]}const $e=32,ra=(e,t,n)=>Array.from({length:$e},(s,o)=>ys(e,t,n,o/$e,(o+1)/$e)),ia=(e,t)=>e[Math.min($e-1,Math.max(0,Math.floor((1-t)*$e)))]??null;function la(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=o){const r=a*4;if(e[r+3]<230)continue;const i=(.299*e[r]+.587*e[r+1]+.114*e[r+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((a,r)=>a-r),s[s.length>>1])}function ca(e,t,n){const s=[];for(let o=0;o<t;o++)for(let a=0;a<n;a++)if(e[(a*t+o)*4+3]>128){s.push(a/n);break}return s.length?(s.sort((o,a)=>o-a),s[s.length>>1]):0}function ha(e,t,n){for(let s=0;s<n;s++){let o=0;for(let a=0;a<t;a++)e[(s*t+a)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const ua=1.6,da=.12;function kn(e,t,n,s){const o=e.layer==="figure",a=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),r=a*da*s/ua;return o?{w:a,d:Math.min(r,a*.5)}:{w:a,d:Math.min(Math.max(r,a*.3),a*3)}}const fa=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Ve=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Vt=6;function vs(e,t){const n=t.assets.filter(a=>a.layer==="ground"),s=(e.groundSlots??[]).map(a=>({asset:n.find(r=>r.id===a.asset),from:Math.max(0,Number(a.from_m)||0)})).filter(a=>!!a.asset).sort((a,r)=>a.from-r.from).slice(0,Vt);if(s.length)return s.map((a,r)=>r===0?{...a,from:0}:a);const o=xs(e,t);return o.kind==="asset"?[{asset:o.asset,from:0}]:[]}const ma=(e,t)=>Math.max(0,e.reduce((n,s,o)=>t>=s.from?o:n,0)),Xt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,ws=Xt;ce.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;const pa=[1,2,3,4,5].map(e=>`
    if (slotCount > ${e}.5) { float k${e} = smoothstep(slotFrom[${e}] * 0.85, slotFrom[${e}] * 1.15 + 0.5, dn); c = mix(c, slotTile(tex${e}, slotTiles[${e}]), k${e}); own = mix(own, slotColour[${e}], k${e}); }`).join("");ce.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, tex1, tex2, tex3, tex4, tex5, nearTex;
  uniform float useTex, grain, fadeNear, fadeFar, detail, vary, mixTile, tileScale, wash, grainSize, slotCount;
  uniform float slotFrom[6], slotTiles[6];
  uniform vec3 slotColour[6];   // each slot's own median colour: its far floor fades into it, not into one tint
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${Xt}
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
      c = slotTile(tex, slotTiles[0]); own = slotColour[0];${pa}
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
  }`;ce.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ce.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${Xt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const ga=e=>e?pe.WRAP_ADDRESSMODE:pe.MIRROR_ADDRESSMODE;function xa(e){const t=ct.CreateGround("ground",{width:2400,height:2400},e),n=new Xe("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tileScale","wash","grainSize","slotCount","slotFrom","slotTiles","slotColour","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","tex1","tex2","tex3","tex4","tex5","nearTex"],needAlphaBlending:!0}),s=new es(new Uint8Array([255,255,255,255]),1,1,we.TEXTUREFORMAT_RGBA,e);for(const o of Ne)n.setTexture(o,s);return n.setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0).setFloat("tileScale",1).setFloat("wash",.5).setFloat("grainSize",1),t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Co,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){const a=o.slots.slice(0,Ne.length);a.forEach(i=>{i.tex.wrapU=pe.WRAP_ADDRESSMODE,i.tex.wrapV=pe.WRAP_ADDRESSMODE}),Ne.forEach((i,c)=>n.setTexture(i,a[c]?.tex??s));const r=(i,c)=>Ne.map((m,h)=>a[h]?i(a[h]):c);n.setFloat("useTex",a.length?1:0).setFloat("slotCount",a.length).setFloats("slotFrom",r(i=>i.from,1e6)).setFloats("slotTiles",r(i=>i.tile||Bt,Bt)).setArray3("slotColour",Ne.flatMap((i,c)=>a[c]?.colour??o.base)).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",N.FromArray(o.base)).setVector3("horizonTint",N.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tileScale",o.tileScale).setFloat("wash",o.wash).setFloat("grainSize",o.grainSize)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=ga(o.tileable),o.tex.wrapV=pe.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}const Ne=["tex","tex1","tex2","tex3","tex4","tex5"];let ya=0;function Mn(e,t,n,s,o){const a=ct.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(a.rotation.x=Math.PI/2,o){const[i,c]=o.dir,m=Math.hypot(i,c)||1;a.rotation.y=Math.atan2(i/m,c/m),a.position.set(i/m*o.length*.42,.015,c/m*o.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const r=new Xe(a.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return r.alphaMode=we.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,r.setFloat("seed",ya++*7.31%97).setFloat("opacity",0),a.material=r,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:i=>{r.setFloat("opacity",i),a.isVisible=i>.001}}}ce.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ce.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${ws}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;ce.ShadersStore.stageBirdFragmentShader=`
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
  }`;function bs(e,t,n,s){const o=ct.CreatePlane(e,{size:1},n),a=new Xe(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=we.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,o.material=a,o.billboardMode=Gt.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:a}}const ks=9,va=9;function wa(e,t,n,s){const o=Array.from({length:ks},(a,r)=>{const i=bs(`smoke:${r}`,"stagePuff",e,s);return i.mat.setFloat("seed",r*3.7),i});return{update(a,r){o.forEach(({mesh:i,mat:c},m)=>{const h=ba(a,m),v=n*(.6+3.2*h);i.scaling.setAll(v),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(m*2.1+a*.3),t.y+n*(.4+7*h),t.z),c.setFloat("alpha",r*.7*Math.sin(Math.PI*h)),i.isVisible=r>.001})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const ba=(e,t)=>((e/va+t/ks)%1+1)%1,yt=40,Sn=16;function ka(e){const t=(e%yt+yt)%yt;return t<Sn?t/Sn:null}function Ma(e,t,n,s){const o=Array.from({length:6},(a,r)=>bs(`bird:${r}`,"stageBird",e,s));return{update(a,r){const i=ka(a),c=Math.round(2+r*4);o.forEach(({mesh:m,mat:h},v)=>{if(m.isVisible=r>.001&&i!==null&&v<c,!m.isVisible||i===null)return;const k=v*.025;m.position.set((i-k-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*i,t+v*1.5),m.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,r*2)).setFloat("flap",Math.sin(a*7+v*1.3))})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const En=["fire","hearth","chimney","smoke"],Sa=e=>e.id.split(/[-_]/).some(t=>En.includes(t))||e.tags.some(t=>En.includes(t.toLowerCase())),vt=e=>e[0].toUpperCase()+e.slice(1),Ea=e=>({fade:`lineFade${vt(e)}`,thin:`lineThin${vt(e)}`,haze:`haze${vt(e)}`}),it={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:ht,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,groundWash:.5,groundGrain:1,grass:.5,grassSway:.15,horizonBushes:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},Aa=[1.05,1,.9],_a=[.88,.93,1.05],za=.35;function Fa(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:J(e,"edgeSoft"),footM:t==="standing"?za:0,grounding:t==="figure"?0:J(e,"grounding"),grass:t==="figure"?0:J(e,"grassOverlap"),light:o?0:J(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?J(e,"cloudDrift"):0,footTint:s}}const Ms=[.93,.86,.74],An=e=>({paper:J(e,"sheetPaper"),grain:J(e,"sheetGrain"),patches:J(e,"sheetPatches"),wash:J(e,"sheetWash"),washColour:Ms}),Ta={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01],groundGrain:[.5,3,.05]},La=Object.fromEntries(Object.keys(it).map(e=>[e,Ta[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ie=(e,t)=>J(e,t),J=(e,t)=>{const n=Number(e[t]??it[t]);return Number.isFinite(n)?n:it[t]};function wt(e,t){const n=Ea(t);return{fade:J(e,n.fade),thin:J(e,n.thin),haze:J(e,n.haze),brown:J(e,"lineBrown"),ink:J(e,"lineInk"),norm:J(e,"lineNorm")}}const Ca=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),bt=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),et=(e,t,n,s,o)=>{const a=s*(1080/o);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function Pa(e,t,n){const s=new N(D.x,D.y,D.z),o=Ce.RotationX(e*Math.PI/180),r=Ce.LookAtLH(s,s.add(N.TransformNormal(new N(0,0,1),o)),N.TransformNormal(N.Up(),o)).multiply(Ce.PerspectiveFovLH(de(D.fov),t,.1,2e3));return{vp:r,top:N.TransformCoordinates(new N(0,0,n),r).y}}ce.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function Oa(e,t){const n=new js("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",N.FromArray(Ms))},n}const Ee=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,Da=12;function Ss(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,a=((t?.offset??0)+n*o)*(e.fps??Da),r=Math.floor(a+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,r)):(r%s+s)%s}function Ra(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const Ia=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Ba=`
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
  }`;ce.ShadersStore.stageLayerVertexShader=`
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
  }`;ce.ShadersStore.stageLayerFragmentShader=`
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
  ${ws}
  ${Ia}
  ${Ba}
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
  }`;const _n=new WeakMap,Es=new Map,As=new Map,Nt=new Map,_s=new Map,ot=new Map;function Ue(e,t){const n=_n.get(t)??new Map;_n.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((a,r)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>r(new Error(`layer image ${e} did not load`)),i.onload=()=>{const c=document.createElement("canvas");c.width=i.naturalWidth,c.height=i.naturalHeight;const m=c.getContext("2d",{willReadFrequently:!0});m.drawImage(i,0,0);const h=m.getImageData(0,0,c.width,c.height).data,v=aa(h,c.width,c.height);v&&Es.set(e,v),ot.set(e,ra(h,c.width,c.height)),As.set(e,ha(h,c.width,c.height)),Nt.set(e,ca(h,c.width,c.height));const k=la(h,c.width,c.height);k!==null&&_s.set(e,k);for(let g=0;g<h.length;g+=4){const y=h[g+3]/255;h[g]=Math.round(h[g]*y),h[g+1]=Math.round(h[g+1]*y),h[g+2]=Math.round(h[g+2]*y)}const w=new es(h,c.width,c.height,we.TEXTUREFORMAT_RGBA,t,!0,!1,pe.TRILINEAR_SAMPLINGMODE);w.anisotropicFilteringLevel=8,w.wrapV=pe.CLAMP_ADDRESSMODE,a(w)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const kt=24;function Va(e,t,n,s,o){const[a,r]=t.anchor??[.5,1],i=[],c=[],m=[];for(let v=0;v<=kt;v++){const k=v/kt;for(const w of[0,1])i.push((w-a)*n,(r-k)*s,0),c.push(w,k);if(v<kt){const w=v*2;m.push(w,w+2,w+1,w+1,w+2,w+3)}}const h=new Gt(e,o);return Object.assign(new ts,{positions:i,uvs:c,indices:m}).applyToMesh(h),h}let Na=0;function zn(e,t,n,s,o,a){const r=Va(`layer:${e.id}`,e,n,s,a),i=new Xe(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?pe.WRAP_ADDRESSMODE:pe.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const c=Na++*2.39996%(Math.PI*2),m=e.anchor?.[1]??1;return i.setFloat("phase",c).setFloat("height",s*m).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new on(0,0,1,1)),r.material=i,r.metadata={noGBuffer:!0,painted:!0},r.isPickable=!1,{mesh:r,material:i,setMotion:h=>{i.setFloat("kind",jo[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),r.isVisible=h>.001},setLine:(h,v,k,w)=>{i.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new an(k[0],k[1])).setVector3("hazeTint",N.FromArray(w))},setPaper:(h,v)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",N.FromArray(h.washColour)).setVector2("grainUV",new an(v[0],v[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setCell:h=>{i.setVector4("cell",new on(h[0],h[1],h[2],h[3]))},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",N.FromArray(h.footTint)).setVector3("sunColour",N.FromArray(Aa)).setVector3("shadeColour",N.FromArray(_a))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,v)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),v&&i.setVector3("featherTint",N.FromArray(v))}}}const zs=600,Fs=1.5,Ua=2,$a=.8,Ha=["grass","heather","reeds","shrub","bramble","juniper","hazel","meadow","fern","tree","bush","sedge","flower"],Ga=["shrub","tree","bush","bramble","hedge"],Wa=["ground"];function ja(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function Fn(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}const Ya=e=>e.layer!=="ground"&&e.layer!=="sky"&&e.layer!=="bg"&&e.layer!=="figure"&&!e.tileable_x&&!It(e)&&e.kind!=="animation"&&e.tags.some(t=>Ha.includes(t));function Ka(e){const t=e.assets.filter(n=>n.kind==="sheet");return t.length?t.flatMap(n=>(n.cells??[]).map(s=>({asset:n.id,file:n.file,tags:s.tags,height_m:s.height_m,aspect:s.rect[2]*n.w/Math.max(1,s.rect[3]*n.h),cell:s.rect}))):e.assets.filter(Ya).map(n=>({asset:n.id,file:n.file,tags:n.tags,height_m:n.height_m,aspect:n.w/Math.max(1,n.h),cell:[0,0,1,1]}))}const Ts=(e,t)=>e.tags.some(n=>!Wa.includes(n)&&t.includes(n)),Xa=(e,t)=>e.filter(n=>n.height_m<=Fs&&!n.tags.includes("tree")&&Ts(n,t)),Za=["grass","meadow","heath","field","hedge","forest","marsh","wet","edge","heather"];function qa(e,t){const n=e.filter(o=>o.height_m>Fs&&o.tags.some(a=>Ga.includes(a))),s=n.filter(o=>Ts(o,t));return s.length||!t.some(o=>Za.includes(o))?s:n.filter(o=>!o.tags.includes("tree"))}function Tn(e){const t=Math.min(zs,Math.max(0,Math.round(e.count)));if(!e.picks.length||!t)return[];const n=ja(e.seed),s=Math.max(e.from,e.front+Ua),o=Math.max(s,e.to),a=[];for(let r=0;r<t;r++){const i=s*Math.pow(o/s,n()),c=Math.floor(n()*e.picks.length);a.push({z:i,x:(n()*2-1)*$a*fe(i),h:e.picks[c].height_m*(.7+.6*n())*(e.size??1),pick:c,phase:n()*Math.PI*2})}return a.sort((r,i)=>i.z-r.z)}const Ls=[...Array.from({length:16},(e,t)=>2.5*Math.pow(1.4,t+1)),1/0],Ln=e=>Ls.findIndex(t=>e<t);ce.ShadersStore.stageStrewnVertexShader=`
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
  }`;ce.ShadersStore.stageStrewnFragmentShader=`
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
  }`;function Ja(e,t,n,s,o,a,r){const i=new Xe(`strewn:${r}`,e,"stageStrewn",{attributes:["position","quad","uv","extra"],uniforms:["viewProjection","camPos","time","sway","land","haze","opacity"],samplers:["tex"],needAlphaBlending:!0});i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setTexture("tex",t).setVector3("haze",N.FromArray(a));const c=new Map;for(const h of s)c.set(Ln(h.z),[...c.get(Ln(h.z))??[],h]);const m=[...c].map(([h,v])=>{const k=[],w=[],g=[],y=[],F=[];v.forEach((E,x)=>{const A=n[E.pick],[U,K,$,q]=A.cell,I=E.h*A.aspect,Q=o(E.z);for(const[W,j]of[[-.5,0],[.5,0],[.5,1],[-.5,1]])k.push(E.x,0,E.z),w.push(W,j,E.h,I),g.push(U+(W+.5)*$,K+(1-j)*q),y.push(E.phase,Q[0],Q[1],Q[2]);F.push(x*4,x*4+1,x*4+2,x*4,x*4+2,x*4+3)});const p=new Gt(`strewn:${r}:${h}`,e);return Object.assign(new ts,{positions:k,indices:F}).applyToMesh(p),p.setVerticesData("quad",w,!1,4),p.setVerticesData(Ys.UVKind,g,!1,2),p.setVerticesData("extra",y,!1,4),p.material=i,p.alphaIndex=Ye(Math.min(Ls[h],2e3)),p.alwaysSelectAsActiveMesh=!0,p.isPickable=!1,p.metadata={noGBuffer:!0},p});return{meshes:m,update(h,v,k,w,g){i.setFloat("time",h).setFloat("sway",v).setFloat("land",k).setFloat("opacity",g).setVector3("camPos",w),m.forEach(y=>{y.isVisible=g>.001})},dispose(){m.forEach(h=>h.dispose()),i.dispose()}}}const tt=[3,60],Cn=[60,300],Qa=80,er=1.8,tr=(e,t)=>t??e.asset.tags;function Pn(e){const t=[],n=Math.log(tt[1]/tt[0]);e.slots.forEach((o,a)=>{const r=Math.max(tt[0],o.from),i=Math.min(tt[1],e.slots[a+1]?.from??1/0);if(i<=r)return;const c=Xa(e.sprites,tr(o,e.bandTags)),m=e.grass*zs*(Math.log(i/r)/n);t.push({picks:c,clumps:Tn({picks:c,count:m,from:r,to:i,front:e.front,seed:Fn(`${e.sceneId}:grass:${a}`)})})});const s=e.slots[e.slots.length-1];if(s&&!e.bandTags){const o=qa(e.sprites,s.asset.tags);t.push({picks:o,horizon:!0,clumps:Tn({picks:o,count:e.bushes*Qa,from:Cn[0],to:Cn[1],front:e.front,size:er,seed:Fn(`${e.sceneId}:horizon`)})})}return t.filter(o=>o.clumps.length)}const Ut={..._o["History Lines pencil"],paper:.35,granulation:.2,...it},nr=new ns(.937,.914,.863,1),sr=.7,or=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class ar{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new Ks(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Xs(this.engine),this.scene.clearColor=nr,this.camera=new Zs("house",new N(0,1.6,0),this.scene),this.camera.rotation.set(ht*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new qs("sky",new N(0,1,0),this.scene).intensity=.7,new Js("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=xa(this.scene),this.ground.set(this.groundLook([],null,n)),this.birds=Ma(this.scene,In,fe(In),hr),zo(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),Oa(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Ve(Te);strip=null;nearTex=null;bands=[];strewn=[];strewSrc=null;strewKey="";smoke=[];birds;footTint=Ve(Te);nearAsset=null;hazeTint=Ve(Te);sceneLib;buildToken=0;look={...Ut};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=wn;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return qo(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=wn,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>Xo;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Ko)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=Zo(this.tier,o,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...Ut,...t??{}}}groundPoint(t,n){const s=te[n];return new N((t-.5)*fe(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],a=[];t.set.sky&&a.push({layer:Dn(t),order:0,index:-1});const r={sky:1};t.set.layers.forEach((b,P)=>{const se=b.depth;r[se]=r[se]??0,a.push({layer:b,order:r[se]++,index:P})});const i=[];await Promise.all(a.map(async({layer:b,order:P,index:se})=>{let R=Le(n,b,b.depth);if(!R){i.push({need:b.need??b.asset,reason:"no match"});return}let X;try{X=await Ue(xe(n,R,b),this.scene)}catch{i.push({need:b.need??b.asset,reason:`file did not load: ${b.src??R.file}`});return}if(s!==this.buildToken)return;R=On(R,b,X);const B=Be(R,b,P),M=zn(R,X,B.w,B.h,B.uRepeat,this.scene);M.mesh.position.set(B.x,B.y,B.z);const _=ms(b,R);M.mesh.alphaIndex=_?Po:B.alphaIndex,_&&(M.mesh.rotation.x=Math.PI/2),M.mesh.isVisible=!1;let T,C,Z;if(Mt.includes(b.depth)&&!R.tileable_x&&!_&&!Me(R)){const H=kn(R,B.w,B.h,B.z);Z=ae=>kn(R,B.w,B.h,ae).d/H.d,T=Mn(M.mesh,H.w,H.d,this.scene),T.mesh.alphaIndex=Qe(B.alphaIndex),C=Mn(M.mesh,H.w,H.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:B.h*ur(this.sunDir)}),C.mesh.alphaIndex=Qe(B.alphaIndex)}o.push({layer:b,index:se,builtScale:b.scale??1,builtZ:B.z,handle:M,asset:R,order:P,stain:T,cast:C,stainDepth:Z,ink:_s.get(xe(n,R,b)),flat:_,skyline:Nt.get(xe(n,R,b))})}));const c=xs(t.set,n),m=(await Promise.all(vs(t.set,n).map(async b=>{const P=await Ue(n.base+b.asset.file,this.scene).catch(()=>(i.push({need:b.asset.id,reason:`file did not load: ${b.asset.file}`}),null)),se=(ot.get(n.base+b.asset.file)??[]).filter(R=>!!R);return P?{tex:P,tile:b.asset.height_m||Bt,from:b.from,asset:b.asset,colour:se.length?Bn(se):Ve(n.paper??Te)}:null}))).filter(b=>!!b);let h=null;const v=fa(t.set.near,n),k=v?Le(n,{asset:v}):null;if(t.set.near&&!k&&i.push({need:t.set.near,reason:"no near band"}),k)try{h=await Ue(n.base+k.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${k.file}`})}c.kind==="paper"&&c.reason&&i.push({need:t.set.ground,reason:c.reason});const w=o.filter(b=>b.asset.layer==="bg").sort((b,P)=>b.index-P.index)[0],g=w?{top:As.get(xe(n,w.asset,w.layer))??0,h:Be(w.asset,w.layer,w.order).h,order:w.order}:null,y=o.find(b=>b.index===-1),F=y&&Be(y.asset,y.layer,y.order),p=y&&F?ia(ot.get(xe(n,y.asset,y.layer))??[],(D.y-F.y)/F.h):null,E=w?Es.get(xe(n,w.asset,w.layer))??null:t.set.groundBands?.length?null:p,x=await this.loadBands(t,n),A=t.set.groundBands?.length?[...new Set(t.set.groundBands.flatMap(b=>Le(n,{asset:b.asset},"ground_band")?.tags??[]))]:null,U=Ka(n),K=xn(t),$=m.map(b=>({asset:b.asset,from:b.from})),q=[...new Set(Pn({sceneId:t.id,slots:$,bandTags:A,sprites:U,grass:1,bushes:1,front:K}).flatMap(b=>b.picks.map(P=>P.file)))],I=new Map;await Promise.all(q.map(async b=>{const P=await Ue(n.base+b,this.scene).catch(()=>null);P&&I.set(b,P)}));const Q=b=>b.forEach(P=>{P.stain?.mesh.material?.dispose(),P.cast?.mesh.material?.dispose(),P.handle.mesh.dispose(),P.handle.material.dispose()});if(s!==this.buildToken){Q(o),x.forEach(b=>{b.handle.mesh.dispose(),b.handle.material.dispose()});return}Q(this.built),this.bands.forEach(b=>{b.handle.mesh.dispose(),b.handle.material.dispose()}),this.bands=x,this.built=o,this.sceneLib=n;const W=m[0]?(ot.get(n.base+m[0].asset.file)??[]).filter(b=>!!b):[],j=this.groundLook(m,E,n,c.kind==="paper"?c.colour:void 0);this.horizonTint=j.tint,this.strip=g,this.smoke.forEach(b=>b.dispose()),this.smoke=o.filter(b=>Sa(b.asset)&&Mt.includes(b.layer.depth)&&!b.flat).map(b=>{const P=Be(b.asset,b.layer,b.order);return wa(this.scene,new N(b.handle.mesh.position.x,P.h*.6,P.z),Math.min(Math.max(P.h*.8,.5),3),P.alphaIndex)}),this.footTint=W.length?Bn(W):j.base,this.nearTex=h,this.nearAsset=k,this.hazeTint=p??j.tint,this.ground.set(j),this.strewSrc={sceneId:t.id,slots:$,colours:m.map(b=>b.colour),bandTags:A,front:K,sprites:U,tex:I},this.strewKey="",this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const a=Ve(o??s.paper??Te),r=n??a;return{slots:t,base:or(a,r,sr),tint:r,fadeNear:te.fg,fadeFar:te.bg*.75,grain:t.length?.5:1}}strew(t,n){const s=this.strewSrc,o=s?`${s.sceneId}:${t}:${n}:${s.slots.length}`:"";if(o===this.strewKey||(this.strewKey=o,this.strewn.forEach(r=>r.dispose()),this.strewn=[],!s))return;const a=r=>s.colours[ma(s.slots,r)]??this.footTint;for(const r of Pn({...s,grass:t,bushes:n}))for(const i of new Set(r.picks.map(c=>c.file))){const c=s.tex.get(i),m=r.clumps.filter(h=>r.picks[h.pick].file===i);c&&m.length&&this.strewn.push(Ja(this.scene,c,r.picks,m,a,this.hazeTint,i))}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:Dn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=r=>this.built.some(i=>i.handle.mesh===r),o=[],a=[...this.scene.multiPick(t,n,s)??[]].sort((r,i)=>r.distance-i.distance);for(const r of a){const i=this.built.find(m=>m.handle.mesh===r.pickedMesh),c=r.getTextureCoordinates();!i||!c||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||Me(i.asset)&&(r.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:c.x,v:c.y})}return o}pickBackdrops(t,n){const s=r=>this.bands.find(i=>i.handle.mesh===r),o=r=>this.built.find(i=>i.handle.mesh===r&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,r=>!!s(r)||!!o(r))??[]].sort((r,i)=>r.distance-i.distance).flatMap(r=>{const i=r.getTextureCoordinates();if(!i)return[];const c=s(r.pickedMesh);if(c)return[{band:c.index,asset:c.asset,u:i.x,v:i.y}];const m=o(r.pickedMesh);return[{index:m.index,asset:m.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(m=>m.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),a=1/this.engine.getRenderHeight(),r=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(m=>N.Project(m,Ce.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=r.map(m=>m.x*o),c=r.map(m=>m.y*a);return{x0:Math.min(...i),y0:Math.min(...c),x1:Math.max(...i),y1:Math.max(...c),z:n.handle.mesh.position.z}}cameraAlive=!0;calm=!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;faded=new Set;fadedTo=1;fadeLayers(t,n){this.faded=new Set(t),this.fadedTo=n}groundHeightAt(t){return Rt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?Me(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Ce.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>ir*Math.min(1,Math.max(0,(Rn-o)/(Rn-cr)));this.gridMeshes=n.pieces.map((o,a)=>{const r=o.lines.map(m=>m.map(([h,v])=>new N(h,Rt(v,t),v))),i=o.lines.map(m=>m.map(([,h])=>new ns(n.rgb[0],n.rgb[1],n.rgb[2],s(h)))),c=ct.CreateLineSystem(`grid-${a}`,{lines:r,colors:i,useVertexAlpha:!0},this.scene);return c.isPickable=!1,c.setEnabled(!this.gridOff),c.alphaIndex=Ye(o.z)+lr,c.material.depthFunction=we.ALWAYS,c.material.disableDepthWrite=!0,c}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,Ce.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new N(.55,-1,-.3).normalize();depthLine(t){return{...wt(this.look,t),tint:this.hazeTint}}paper(){return An(this.look)}async loadBands(t,n){const s=[];for(const[o,a]of(t.set.groundBands??[]).entries()){const r=Le(n,{asset:a.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await Ue(xe(n,r,a),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${a.src??r.file} did not load`);continue}const c=On(r,a,i),m=hs(a.z),h=m*c.h/c.w,v=zn(c,i,m,h,1,this.scene);v.material.depthFunction=we.ALWAYS,v.mesh.position.set(0,0,a.z),v.mesh.alphaIndex=Ye(a.z),s.push({handle:v,z:a.z,w:m,h,skyline:Nt.get(xe(n,c,a))??.5,index:o,asset:c,band:a})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?Uo(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??cs,ie(this.look,"housePitch")):0}pose(t,n,s,o){const a=Yt(t,n),r=Kt(a.cam,a.t,jt(t)),i=o?ea(r,o.t,o):r,c=this.cameraAlive&&!this.calm?Go(t.camera_motion,s):{x:0,y:0,roll:0};this.camera.position.set(i.x+c.x,i.y+c.y,i.z),this.camera.fov=i.fov;const m=ie(this.look,"housePitch");this.camera.rotation.x=m*Math.PI/180,this.camera.rotation.z=((i.roll??0)+c.roll)*Math.PI/180,this.ground.follow(this.camera.position);const h=p=>ie(this.look,p);this.ground.live({detail:h("groundDetail"),vary:h("groundVary"),mixTile:h("groundMix"),tileScale:h("groundScale"),wash:h("groundWash"),grainSize:h("groundGrain")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Pa(m,this.engine.getAspectRatio(this.camera),h("nearFar")),span:rr,tileable:!!this.nearAsset?.tileable_x}:null);const v=this.engine.getRenderHeight(),k=An(this.look),w=ie(this.look,"bandHeight"),g=this.horizonOf(t),y=Ro(g,this.strip);this.land=y,this.poseGrid(y);const F=xn(t);this.bands.forEach(p=>{const E=No(p.band,n,w,p.w,p.h,p.skyline,F);p.z=E.z,p.handle.mesh.scaling.set(E.sx,E.sy,1),p.handle.mesh.position.set(E.x,E.y,E.z),p.handle.mesh.alphaIndex=E.alphaIndex;const x=bt(v,E.z-D.z,de(D.fov));p.handle.setOpacity(E.opacity),p.handle.setBottomFade(Math.min(1,ie(this.look,"bandFade")/E.h)),p.handle.setPaper(k,et(E.w,E.h,1,x,v)),p.handle.setLine(wt(this.look,"bg"),1,et(E.w,E.h,1,x,v),this.hazeTint),p.handle.setMotion(vn(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.strew(ie(this.look,"grass"),ie(this.look,"horizonBushes")),this.strewn.forEach(p=>p.update(s,ie(this.look,"grassSway"),y,this.camera.position,1)),this.smoke.forEach(p=>p.update(s,ie(this.look,"smoke"))),this.birds.update(s,ie(this.look,"birds"));for(const p of this.built){const E=ve(p.layer,n),x=Be(p.asset,{...p.layer,x:E.x,y:E.y,z:E.z,scale:1,rotation:E.rotation},p.order,g,y);p.handle.mesh.position.x=x.x;const A=p.asset.layer==="bg"&&!p.asset.tileable_x?(x.z-D.z)/Math.max(.1,p.builtZ-D.z):1;p.handle.mesh.position.y=p.flat?Oo:Me(p.asset)?fs(x.z,w,x.h*E.scale,p.skyline??0)+x.y:D.y+(x.y-D.y)*A,p.handle.mesh.position.z!==x.z&&(p.handle.mesh.position.z=x.z,p.flat||(p.handle.mesh.alphaIndex=x.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=Qe(x.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(x.z)),p.cast&&(p.cast.mesh.alphaIndex=Qe(x.alphaIndex))),p.handle.mesh.rotation.z=-x.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(E.scale/p.builtScale*A);const U=E.opacity*(this.faded.has(p.index)?this.fadedTo:1);p.handle.setOpacity(U),p.handle.setFeather(oa(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-x.y)/(x.h*E.scale));const K=bt(v,x.z-i.z,this.camera.fov),$=wt(this.look,p.layer.depth);p.handle.setPaper(k,et(x.w*E.scale,x.h*E.scale,x.uRepeat,bt(1080,x.z-D.z,de(D.fov)),1080)),p.handle.setLine($,p.ink===void 0?1:Ca(p.ink,$.ink,$.norm),et(x.w*E.scale,x.h*E.scale,x.uRepeat,K,v),this.hazeTint),p.stain?.setOpacity((p.layer.shadow??xt)*U),p.cast?.setOpacity(ie(this.look,"castShadow")*((p.layer.shadow??xt)/xt)*U);const q=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":Mt.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive(Fa(this.look,q,this.sunDir.x,this.footTint)),p.handle.setMotion(vn(p.asset,p.layer)),p.handle.material.setFloat("time",s),Ee(p.asset)&&p.handle.setCell(Ra(p.asset,Ss(p.asset,p.layer.play,n)))}}}const xe=(e,t,n)=>n?.src??e.base+t.file,On=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:o}=n.getSize(),a=s/(Ee(e)?e.cols:1),r=o/(Ee(e)?e.rows:1);return{...e,w:a,h:r,height_m:e.height_m*(r/e.h)}},Dn=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),rr=1.3,ir=.35,lr=.001,cr=40,Rn=120,In=110,hr=900,ur=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Bn=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),Mt=["mid","fg","near"],dr=16/9,fr=.92;function mr(e,t,n,s){const{cam:o,t:a}=Yt(e,s),r=Kt(o,a,jt(e)),i=te[t.depth],c=i-r.z;if(c<=.5)return null;const m=ve(t,s),h=(m.x-.5)*fe(i),v=Math.tan(r.fov/2),k=(h-r.x)/(c*v*dr),w=-ht*Math.PI/180,g=Math.tan(Math.atan2(n*m.scale-r.y,c)-w)/v;return Math.abs(k)>fr?null:{x:(k+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const pr={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},Vn=new Set(["large","small","tall","long","short","fallen"]),gr=new Set(["tree","shrub"]),Zt=e=>e.charAt(0).toUpperCase()+e.slice(1),xr=(e,t)=>pr[e]?.[t?1:0]??e;function yr(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const a=o.length>1&&gr.has(o[0])?o.slice(1):o,r=a.filter(c=>Vn.has(c)),i=a.filter(c=>!Vn.has(c));return Zt([...r,...i].map(c=>xr(c,n)).join(" "))}const Nn=e=>Zt(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),Cs=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ye(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&Cs(s);if(o)return Nn(o);if(e.figure)return Nn(e.figure);if(s)return yr(s,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?Zt(String(a)):""}function vr(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const wr=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function br(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>wr.has(t))?"leaf":"photo"}const Ke=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?Cs(e):null,Un=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Pe(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:Un(e,"pose:")??t?.[1]??null,facing:Un(e,"facing:")??(t?.[2]?"left":"right")}}const Ps=e=>e.find(t=>Pe(t).pose==="stand"&&Pe(t).facing==="right")??e[0];function Os(e){const t=new Map,n=[];for(const s of e??[]){const o=Ke(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const r={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,r),n.push(r)}const a=t.get(o);a.members=[...a.members,s],a.count=a.members.length}return n.map(s=>s.series?{...s,asset:Ps(s.members)}:s)}const kr=(e,t)=>{const n=Ke(t);return n?(e??[]).filter(s=>Ke(s)===n):t?[t]:[]},Mr=e=>Os(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function Sr(e,t,n){const s=(e??[]).filter(r=>Ke(r)===n);if(!s.length)return null;const o=Pe(t),a=(r,i)=>s.find(c=>Pe(c).pose===r&&Pe(c).facing===i);return a(o.pose,o.facing)??a("stand",o.facing)??Ps(s)}const Er=24;function Ar(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const o=new Image;o.onload=()=>{try{const a=document.createElement("canvas");a.width=o.naturalWidth,a.height=o.naturalHeight;const r=a.getContext("2d",{willReadFrequently:!0});r.drawImage(o,0,0),t.set(s,{w:a.width,h:a.height,data:r.getImageData(0,0,a.width,a.height).data})}catch{t.set(s,"failed")}},o.onerror=()=>t.set(s,"failed"),o.src=e+s};return{prime(s){s.forEach(o=>o?.file&&n(o.file))},opaque(s,o,a,r){const i=t.get(s?.file);if(i==="failed")return!0;if(!i||i==="loading")return s?.file&&n(s.file),!1;const c=s.kind==="animation"?Math.max(1,s.cols??1):1,m=s.kind==="animation"?Math.max(1,s.rows??1):1,h=i.w/c,v=i.h/m,k=Math.min(h-1,Math.max(0,Math.floor(o*h))),w=Math.min(v-1,Math.max(0,Math.floor(a*v)));return(Number.isInteger(r)?[[Math.floor(r/c)%m,r%c]]:Array.from({length:m*c},(y,F)=>[Math.floor(F/c),F%c])).some(([y,F])=>i.data[(Math.floor(y*v+w)*i.w+Math.floor(F*h+k))*4+3]>Er)}}}const oe={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,us],[80,Wt]]},_r=e=>e<=12?1:e<=40?5:20,zr=e=>_r(e)/4;function $n(e,t=0){const n=typeof t=="function"?t:()=>t,s=m=>[e.origin[0]+m*e.dir[0],e.origin[2]+m*e.dir[2]],o=m=>e.origin[1]+m*e.dir[1]-(oe.z+n(s(m)[1]));if(!(e.dir[2]>0))return null;const a=(Wt*Fr-e.origin[2])/e.dir[2],r=Math.sign(o(0));if(r===0)return rn(oe,s(0));let i=0,c=null;for(let m=1;m<=Hn;m++){const h=a*m/Hn;if(Math.sign(o(h))!==r){c=h;break}i=h}if(c===null)return null;for(let m=0;m<Tr;m++){const h=(i+c)/2;Math.sign(o(h))===r?i=h:c=h}return rn(oe,s(c))}const Fr=4,Hn=400,Tr=30;function $t(e){const t=zr(zt(oe,e)[1]);return zt(oe,to(e,t))}const Ht=(e,t)=>[(e-.5)*fe(t),t],lt=([e,t])=>({x:Math.round((.5+e/fe(t))*1e4)/1e4,z:t});function qt([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function Lr([e,t],n,s=[0,0]){const[[,o],[,a]]=oe.cells,r=Math.max(.1,t-s[1]),i=Math.min(a,Math.max(o,s[1]+r/Math.max(.01,n)));return zt(oe,qt([e,t],i,s))}const Cr=[[us,12,2],[12,40,10],[40,Wt,40]],Pr=20;function Or(){return Cr.flatMap(([e,t,n],s)=>{const o=n*Pr,a=[];let r=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const c={...oe,cells:[[-o,r],[o,i]]},m=no(c,n,Math.max(1,Math.round(i-r))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===i:i>r);a.push({z:i,lines:m.map(h=>h.map(v=>so(oe,v).slice(0,2)))}),r=i}return a})}const Gn=-1,Wn=2,Dr=4,Rr=(e,t)=>{const n=e.findIndex(s=>s.index===t);return n<0?{hit:e[0]??null,next:null}:{hit:e[n],next:e.length>1?e[(n+1)%e.length].index:null}},Ir=(e,t)=>{const n=e.find(s=>s.index===t)?.box;return n?e.filter(({index:s,box:o})=>s!==t&&o&&o.z<n.z&&o.x0<n.x1&&o.x1>n.x0&&o.y0<n.y1&&o.y1>n.y0).map(s=>s.index):[]};function Br({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:a,onGround:r=()=>!1,byDistance:i=()=>!1,groundUnder:c=()=>null,footY:m=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:k=()=>!1}){let w=null,g=null,y=!1;const F="#38bdf8",p=document.createElement("div");p.dataset.stage25dSelection="",p.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${F};z-index:3;`;const E=document.createElement("div");E.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${F};pointer-events:none;`,p.appendChild(E);const x=document.createElement("div");x.dataset.rotateHandle="1",x.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",p.appendChild(x);const U=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([M,_])=>{const T=document.createElement("div");return T.dataset.scaleHandle="1",T.style.cssText=eo(M,_),p.appendChild(T),T});t.appendChild(p),n()?.setGrid?.(Or(),Vr(t,"--color-neutral"));const K=document.createElement("div");K.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(K);const $=M=>{const _=W();if(!_||M===null){K.style.display="none";return}const T=t.getBoundingClientRect(),C=e.getBoundingClientRect();Object.assign(K.style,{display:"block",left:`${_.left+_.width/2+C.left-T.left}px`,top:`${_.top+_.height+C.top-T.top}px`}),K.textContent=`${s(M,"z").toFixed(2)} m`},q=M=>{const _=e.getBoundingClientRect();return{x:M.clientX-_.left,y:M.clientY-_.top}},I=(M,_)=>(n()?.pickLayers(M,_)??[]).filter(T=>o.opaque(T.asset,T.u,T.v,T.index)),Q=(M,_)=>{w=M,_&&M!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${M}`}})),j()},W=()=>{const M=w===null?null:n()?.layerBox(w);if(!M)return null;const _=e.getBoundingClientRect();return{left:M.x0*_.width,top:M.y0*_.height,width:(M.x1-M.x0)*_.width,height:(M.y1-M.y0)*_.height,z:M.z}},j=()=>{const M=W();if(!M){p.style.display="none";return}const _=e.getBoundingClientRect(),T=t.getBoundingClientRect();Object.assign(p.style,{display:"block",left:`${M.left+_.left-T.left}px`,top:`${M.top+_.top-T.top}px`,width:`${M.width}px`,height:`${M.height}px`})},b=(M,_,T)=>Math.min(T,Math.max(_,M)),P=M=>{if(M.button!==0)return;const{x:_,y:T}=q(M),{hit:C,next:Z}=Rr(I(_,T),w);if(!C){k(_,T)&&M.stopPropagation();return}M.stopPropagation(),Q(C.index,!0);const H=n().layerBox(C.index),ae=r(C.index),re=W();g={mode:"move",index:C.index,z:H.z,from:n().worldXAt(_,T,H.z),x0:s(C.index,"x"),id:M.pointerId,el:e,next:Z,pressed:[M.clientX,M.clientY],ground:ae,start:[_,T],foot:re?[re.left+re.width/2,re.top+re.height]:[_,T],lift:ae?m(C.index):0},e.setPointerCapture?.(M.pointerId)},se=M=>_=>{if(_.button!==0||w===null)return;const T=W();if(!T)return;_.stopPropagation(),_.preventDefault();const C=e.getBoundingClientRect(),Z=T.left+T.width/2,H=T.top+T.height/2,{x:ae,y:re}={x:_.clientX-C.left,y:_.clientY-C.top};g={mode:M,index:w,cx:Z,cy:H,id:_.pointerId,el:_.currentTarget,d0:Math.max(8,Math.hypot(ae-Z,re-H)),a0:Math.atan2(re-H,ae-Z),scale0:s(w,"scale"),rotation0:s(w,"rotation"),byDistance:M==="scale"&&i(w),p0:Ht(s(w,"x"),s(w,"z")),eye:h()},_.currentTarget.setPointerCapture?.(_.pointerId)},R=M=>{const{x:_,y:T}=q(M);if(g?.mode==="move"&&g.ground){const C=c(g.foot[0]+_-g.start[0],g.foot[1]+T-g.start[1],g.lift,g.index);if(!C)return;const Z=lt($t(C));a(g.index,"x",b(Z.x,Gn,Wn)),a(g.index,"z",Z.z),$(g.index);return}if(g?.mode==="move"){const C=(n().worldXAt(_,T,g.z)-g.from)/fe(g.z);a(g.index,"x",Math.round(b(g.x0+C,Gn,Wn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const C=Math.hypot(_-g.cx,T-g.cy)/g.d0*g.scale0,Z=$t(Lr(g.p0,C,g.eye))[1],H=lt(qt(g.p0,Z,g.eye));g.scale0!==1&&a(g.index,"scale",1),a(g.index,"x",H.x),a(g.index,"z",H.z),$(g.index);return}if(g?.mode==="scale"){const C=Math.hypot(_-g.cx,T-g.cy);a(g.index,"scale",Math.round(b(g.scale0*(C/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let C=g.rotation0+(Math.atan2(T-g.cy,_-g.cx)-g.a0)*180/Math.PI;M.shiftKey&&(C=Math.round(C/15)*15),a(g.index,"rotation",Math.round(C*10)/10);return}y||(y=!0,requestAnimationFrame(()=>{y=!1,e.style.cursor=I(_,T).length?"pointer":""}))},X=M=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const _=g.index,T=g.mode==="move"&&g.ground||g.byDistance,C=g.next!=null&&Math.hypot(M.clientX-g.pressed[0],M.clientY-g.pressed[1])<Dr?g.next:null;g=null,K.style.display="none",T&&v(_),C!==null&&Q(C,!0)},B=M=>{w!==null&&M.detail?.id!==`s25_layer-${w}`&&(w=null,j())};e.addEventListener("pointerdown",P);for(const M of[e,...U,x])M.addEventListener("pointermove",R),M.addEventListener("pointerup",X),M.addEventListener("pointercancel",X);return U.forEach(M=>M.addEventListener("pointerdown",se("scale"))),x.addEventListener("pointerdown",se("rotate")),window.addEventListener("scene-object-selected",B),{select:(M,_=!1)=>Q(M,_),get selected(){return w},place:j,destroy(){window.removeEventListener("scene-object-selected",B),p.remove(),n()?.setGrid?.(null),K.remove()}}}function Vr(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const Jt=["x","y","z","scale","rotation","opacity","keys","figure","play"],ne=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},St=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Jt.includes(t))),jn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{},{camera:a,camera_more:r,camera_motion:i,...c}=e??{};return JSON.stringify({...c,set:{...o,layers:t.map(St),groundBands:n.map(St),skyLayer:St(s)}})},Et=e=>Jt.map(t=>e?.[t]??null),At=e=>JSON.stringify([(e?.set?.layers??[]).map(Et),(e?.set?.groundBands??[]).map(Et),Et(e?.set?.skyLayer),e?.camera??null,e?.camera_more??[],e?.camera_motion??null]),Yn={x:[-8,8],y:[.3,6],z:[-4,15],fov:[20,75]},Nr=[-45,45],Ur=10,Kn=.01,$r=.01,Xn=(e,[t,n])=>Math.min(n,Math.max(t,e)),Zn=e=>Math.round(e*1e3)/1e3,ge=e=>{const t={...D,...e},n=Object.fromEntries(Object.keys(Yn).map(o=>[o,Zn(Xn(Number(t[o])||D[o],Yn[o]))])),s=Zn(Xn(Number(t.roll)||0,Nr));return s?{...n,roll:s}:n},Hr=(e,t,n,s)=>{const o=ge(e),a=2*Ur*Math.tan(de(o.fov)/2)/Math.max(1,s);return ge({...o,x:o.x-t*a,y:o.y+n*a})},Gr=(e,{deltaX:t=0,deltaY:n=0,ctrlKey:s=!1})=>{const o=ge(e);return ge(s?{...o,fov:o.fov*Math.exp(n*$r)}:{...o,z:o.z-n*Kn,x:o.x+t*Kn})},Ds=.001,Wr=(e,t,n)=>{const s=[];for(const o of[e,...t??[]].filter(Boolean)){const a=Number(o.at_s)||0,r=(m,h)=>{const v=s.findIndex(k=>Math.abs(k.t-m)<Ds);v>=0?s[v]={t:m,pose:h}:s.push({t:m,pose:h})},i=ge(o.from??D),c=ge(o.to??o.from??D);r(a,i),(Number(o.dur_s)||JSON.stringify(i)!==JSON.stringify(c))&&r(a+(Number(o.dur_s)||Math.max(0,n-a)),c)}return s.sort((o,a)=>o.t-a.t)},Rs=(e,t)=>e.filter(n=>Math.abs(n.t-t)>=Ds),nt=(e,t,n)=>[...Rs(e,t),{t,pose:ge(n)}].sort((s,o)=>s.t-o.t),jr=(e,t)=>e.reduce((n,s)=>Math.abs(s.t-t)<Math.abs(n.t-t)?s:n,e[0]),Yr=e=>{const t=(n,s,o,a)=>({move:"framed",ease:"inOut",at_s:o,...a?{dur_s:a}:{},from:n,to:s});return e.length<2?e.map(n=>t(n.pose,n.pose,0)):e.slice(0,-1).map((n,s)=>t(n.pose,e[s+1].pose,n.t,e[s+1].t-n.t))},Kr=(e,t,n,s)=>{const{cam:o,t:a}=Yt({camera:e,camera_more:t},n),r=Kt(o,Math.max(0,a),s);return ge({x:r.x,y:r.y,z:r.z,fov:r.fov*180/Math.PI,roll:r.roll})},Xr={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},Zr={nl:"Camera",de:"Kamera",fr:"Caméra",it:"Telecamera"},qn=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch","groundWash","groundGrain","grass","grassSway","horizonBushes"],qr=e=>Ee(e)?"vfx":e.layer,Jn=e=>Ee(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,Qn="application/x-lp-stage25d",st=new Map,_t=new Map,Jr=.8,Qr=e=>(_t.has(e)||_t.set(e,Ar(e)),_t.get(e));function ei(e){return st.has(e)||st.set(e,ta(Qs(e)).catch(t=>{throw st.delete(e),t})),st.get(e)}const ti=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],camera_motion:e.camera_motion??null,figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function fi(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,a=null,r=null,i=new Map,c=new Map,m=0,h=null,v=0,k=0,w=performance.now(),g=!1,y=[],F=[],p={},E=new Set,x=null,A=null;const U=l=>Ee(l)?null:A.base+"thumbs/"+l.file;let K=null,$=null,q={},I=null,Q=0,W=null,j=[],b=null,P=!1;const se=()=>{s.engine.runRenderLoop(()=>{const l=performance.now();k+=Math.min(.1,(l-w)/1e3),w=l,s.tick(l),I&&(s.fadeLayers(T(),Jr),s.cameraAlive=Q===0&&(P||!!window.__timelineKeying?.playing?.())),o&&s.pose(o,he(),k),s.scene.render(),I?.place()})},R=()=>{if(!o||!s)return;const l=(u,d)=>E.has(d)?{...u,opacity:0,keys:[]}:u;o={...o,set:{...o.set,groundBands:F.map((u,d)=>l(u,`band-${d}`)),skyLayer:p,layers:y.map((u,d)=>l(u,`layer-${d}`))}},s.rebind(o)},X=l=>{const u=/^band-(\d+)$/.exec(String(l??""));return u&&F[Number(u[1])]?Number(u[1]):-1},B=l=>l==="sky"?r?.set?.sky?{...p,depth:"sky"}:null:X(l)>=0?{...F[X(l)],depth:"bg"}:y[ne(l)]??null,M=(l,u)=>{let d=null;if(l==="sky"&&r?.set?.sky){if(u.motion===void 0)return null;p={...p,motion:u.motion},d={skyLayer:{motion:u.motion}}}else if(X(l)>=0){const f=X(l);F=F.map((S,z)=>z===f?{...S,...u}:S),d={band:{index:f,...u}}}else if(y[ne(l)]){const f=ne(l);y=y.map((S,z)=>z===f?{...S,...u}:S),d=f}return d===null?null:(x=_(),R(),d)},_=()=>At({set:{layers:y,groundBands:F,skyLayer:p},camera:W,camera_more:j,camera_motion:b}),T=()=>{const l=I?.selected??null;return l===null||Q>0||window.__timelineKeying?.playing?.()?[]:Ir(y.map((u,d)=>({index:d,box:E.has(`layer-${d}`)?null:s.layerBox(d)})),l)},C=()=>o?jt(o):8,Z=()=>Wr(W,j,C()),H=()=>Kr(W,j,he(),C()),ae=l=>{const[u=null,...d]=Yr(l);W=u,j=d,o&&(o={...o,camera:W,camera_more:j}),x=_(),L.sceneId!=null&&t.onCommit?.(0,{camera:W,camera_more:j},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},re=l=>{if(!o)return;const u=he(),d=Z();if(window.__timelineKeying?.autoKey?.()||!d.length){const f=!d.length&&u>0?nt(d,0,H()):d;return ae(nt(f,u,l))}ae(nt(d,jr(d,u).t,l))},Is=()=>{let l=null;const u=f=>{f.preventDefault(),f.stopImmediatePropagation()};n.addEventListener("pointerdown",f=>{P&&(u(f),n.setPointerCapture?.(f.pointerId),l={x:f.clientX,y:f.clientY,pose:H()},n.style.cursor="grabbing")},{capture:!0}),n.addEventListener("pointermove",f=>{P&&(u(f),l&&re(Hr(l.pose,f.clientX-l.x,f.clientY-l.y,n.getBoundingClientRect().height)))},{capture:!0});const d=f=>{l&&(u(f),l=null,n.style.cursor=P?"grab":"")};n.addEventListener("pointerup",d,{capture:!0}),n.addEventListener("pointercancel",d,{capture:!0}),n.addEventListener("wheel",f=>{P&&(u(f),re(Gr(H(),f)))},{capture:!0,passive:!1}),window.addEventListener("scene-object-selected",f=>{f.detail?.id!=="s25_camera"&&L.frameCamera(!1)})},Ae=()=>({...r.set,layers:y,groundBands:F,skyLayer:p}),ut=(l,u)=>{const d=M(l,u);d===null||L.sceneId==null||(typeof d=="number"?t.onCommit?.(d,u,L.sceneId):t.onCommit?.(0,d,L.sceneId))},he=()=>h?h():m,dt=()=>r?.set?.sky&&A?i.get(r.set.sky)??Le(A,{asset:r.set.sky},"sky"):null,_e=l=>{const u=i.get(y[l]?.asset);return!!(y[l]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&y[l].depth!=="sky")},Bs=l=>l==="sky"||X(l)>=0,Vs=(l,u)=>{const d=s?.pickBackdrops?.(l,u).find(S=>!E.has(S.band!==void 0?`band-${S.band}`:`layer-${S.index}`)&&K.opaque(S.asset,S.u,S.v)),f=d?d.band!==void 0?`band-${d.band}`:`layer-${d.index}`:r?.set?.sky?"sky":null;return f&&L.select(f),!!f},Qt=(l,u)=>Me(u)||ms(l,u),en=l=>{const u=i.get(y[l]?.asset);return!!u&&Qt(y[l],u)},Oe=l=>ve(y[l],he()).z??te[y[l].depth],Ns=l=>_e(l)&&!(y[l].keys??[]).some(u=>u.scale!==void 0),tn=l=>Math.round(l*1e3)/1e3,nn=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],L={canvas:n,sceneId:null,async show(l){const u=await ei(l.bundle);if(g)return;s||(s=new ar(n,u),se()),q={...l.look??{}},s.setLook(q);const d=ti(l);await s.build(d,u),o=d,y=d.set.layers,F=(d.set.groundBands??[]).map(f=>({...f})),p={...d.set.skyLayer??{}},W=d.camera,j=d.camera_more??[],b=d.camera_motion??null,E=new Set,x=At(l),r=l,i=new Map(u.assets.map(f=>[f.id,f])),A=u,K=Qr(u.base),K.prime(d.set.layers.map(f=>i.get(f.asset)).filter(Boolean)),t.editable&&!I&&(n.style.pointerEvents="auto",Is(),window.addEventListener("scene-object-selected",f=>{f.detail?.id!==`s25_${$}`&&($=null)}),n.addEventListener("dragover",f=>{f.dataTransfer?.types?.includes(Qn)&&(f.preventDefault(),f.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",f=>{const S=f.dataTransfer?.getData(Qn);if(!S)return;f.preventDefault();const z=n.getBoundingClientRect();L.addLayer(S,{x:f.clientX-z.left,y:f.clientY-z.top})}),n.addEventListener("dblclick",()=>{const f=$??(I?.selected!=null?`layer-${I.selected}`:null),S=f&&L.editTarget(f);S&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:S}))}),I=Br({canvas:n,host:e,stage:()=>s,alpha:{opaque:(f,S,z,V)=>!E.has(`layer-${V}`)&&K.opaque(f,S,z,Ee(f)?Ss(f,y[V]?.play,he()):void 0)},valueOf:(f,S)=>S==="z"?Oe(f):ve(y[f],he())[S],onGround:_e,byDistance:Ns,groundUnder:(f,S,z,V)=>$n(s.pointerRay(f,S),en(V)?z:O=>s.groundHeightAt(O)+z),footY:f=>s.layerFootY(f)-(en(f)?0:s.groundHeightAt(Oe(f))),eye:nn,onSettled:f=>L.settleBand(f),onEmpty:(f,S)=>Vs(f,S),onChange:(f,S,z)=>L.moveLayer(`layer-${f}`,S,z)})),(I?.selected??-1)>=y.length&&I.select(null),c=new Map(u.assets.map(f=>[f.id,f.height_m??1.7])),v=Number(l.narration_at_s)||0,a=jn(l),e.dataset.stage25dReady="1"},editTarget(l){const u=l==="sky"?r?.set?.sky?p:null:X(l)>=0?F[X(l)]:y[ne(l)],d=l==="sky"?dt():i.get(u?.asset);return!u||!d||!A?null:{id:`s25_${l}`,title:L.items().find(f=>f.id===l)?.label??ye({},d,(document.documentElement.lang||"en").slice(0,2)),original:A.base+d.file,state:u.edit_state??null,edited:!!u.src,el:e}},matches:l=>a===jn(l),adopt(l){const u=At(l);if(u===x)return!1;x=u;const d=(f,S)=>{const z={...f};for(const V of Jt)S?.[V]===void 0?delete z[V]:z[V]=S[V];return z};return y=y.map((f,S)=>d(f,l.set?.layers?.[S])),F=F.map((f,S)=>d(f,l.set?.groundBands?.[S])),p=d(p,l.set?.skyLayer),W=l.camera??null,j=l.camera_more??[],b=l.camera_motion??null,o=o&&{...o,camera:W,camera_more:j,camera_motion:b},r=l,R(),!0},setLayerProp(l,u,d){M(l,{[u]:d})},setLayerKeys(l,u){const d=B(l);d&&JSON.stringify(d.keys??[])!==JSON.stringify(u)&&M(l,{keys:u})},commitLayerProp(l,u,d){ut(l,{[u]:d})},readLayerProp(l,u){const d=B(l),f=d?u==="z"&&ne(l)>=0?Oe(ne(l)):u==="z"?ve(d,he()).z??d.z:ve(d,he())[u]:null;return Number.isFinite(f)?f:null},setHidden(l,u){ne(l)<0&&X(l)<0||(E=new Set(u?[...E,l]:[...E].filter(d=>d!==l)),R())},update(l){h=null,m=Math.max(0,l)},play(l){h=()=>v+l()},moveLayer(l,u,d){window.__timelineKeying?.edit?.(`s25:${l}`,u,d,{flush:!1})||L.commitLayerProp(l,u,d)},select(l){if(l==="camera"){$=null,I?.select(null),L.frameCamera(!0),window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_camera"}}));return}L.frameCamera(!1),$=Bs(l)?l:null,I?.select(ne(l)>=0?ne(l):null,!$),$&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${$}`}}))},get skySelected(){return $==="sky"},get backdrop(){return $},get selection(){return I?.selected??null},clearSelection(){I?.select(null),L.frameCamera(!1)},frameCamera(l){P=!!l,n.style.cursor=P?"grab":"",window.dispatchEvent(new CustomEvent("stage25d-edited"))},cameraInfo:()=>({moves:!!W,keys:Z(),pose:H(),motion:{kind:"none",amount:1,speed:1,...b}}),setCameraMotion(l){b={kind:"none",amount:1,speed:1,...b,...l},o&&(o={...o,camera_motion:b}),x=_(),L.sceneId!=null&&t.onCommit?.(0,{cameraMotion:b},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},setCameraValue(l,u){re({...H(),[l]:u})},toggleCameraKey(){const l=he(),u=Z(),d=Rs(u,l);ae(d.length<u.length?d:nt(u,l,H()))},resetCamera(){ae([])},atStart(){return m===0&&h===null&&E.size===0&&!P},layerInfo(l){const u=(O,ee)=>{const me=typeof O.motion=="string"?{kind:O.motion}:O.motion??{};return{kind:me.kind??gs(ee),amount:me.amount??1,speed:me.speed??1}};if(l==="sky"){const O=dt();return O?{id:l,asset:O.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:ye({},O,(document.documentElement.lang||"en").slice(0,2)),file:p.src??`${A.base}${O.file}`,motion:u(p,O)}:null}if(X(l)>=0){const O=F[X(l)],ee=i.get(O.asset);return{id:l,asset:O.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:L.items().find(me=>me.id===l)?.label??"",file:O.src??(ee?`${A.base}${ee.file}`:null),motion:u(O,ee)}}const d=y[ne(l)];if(!d)return null;const f=i.get(d.asset)??null,S=_e(ne(l)),z=!S||(d.scale??1)!==1||(d.keys??[]).some(O=>O.scale!==void 0),V=f?.layer==="bg"&&!f.tileable_x;return{id:l,asset:d.asset??null,depth:d.depth,figure:d.figure??null,role:f?.layer??null,ground:S,showScale:z,fields:S?["x","z",...z?["scale"]:[],"rotation","opacity"]:["x",...V?["z"]:[],"y","scale","rotation","opacity"],label:L.items().find(O=>O.id===l)?.label??ye(d,f,(document.documentElement.lang||"en").slice(0,2)),file:d.src??(f?`${A.base}${f.file}`:null),motion:u(d,f),anim:Jn(f),play:{speed:d.play?.speed??1,offset:d.play?.offset??0}}},setLayerPlay(l,u){const d=B(l);d&&ut(l,{play:{...d.play??{},...u}})},setLayerMotion(l,u){const d=B(l);d&&ut(l,{motion:{...typeof d.motion=="object"?d.motion:{kind:d.motion},...u}})},reorderLayers(l,u,d){if(!_e(u)){d(l,u,L.sceneId,null,null,null);return}const f=be=>y[be]?.z??te[y[be]?.depth],S=l.filter(be=>be===u||_e(be)),z=S.indexOf(u),V=S[z-1],O=S[z+1],ee=Oe(u),me=V===void 0?0:f(V),ft=O===void 0?1/0:f(O);if((V!==void 0||O!==void 0)&&(ee<me||ee>ft)){const be=Ht(ve(y[u],he()).x,ee),Us=V===void 0?ft/1.25:O===void 0?me*1.25:(me+ft)/2,Ze=Math.round(Math.min(oe.cells[1][1],Math.max(oe.cells[0][1],Us))*100)/100,mt=nn(),$s=(Ze-mt[1])/Math.max(.1,ee-mt[1]),sn=ue=>tn(Math.min(20,Math.max(.01,ue*$s))),Hs=y[u].keys?.some(ue=>ue.z!==void 0||ue.scale!==void 0)?y[u].keys.map(ue=>({...ue,...ue.z!==void 0&&{z:Math.min(oe.cells[1][1],Math.max(oe.cells[0][1],tn(ue.z+Ze-ee)))},...ue.scale!==void 0&&{scale:sn(ue.scale)}})):null;d(l,u,L.sceneId,lt(qt(be,Ze,mt)).x,Ze,sn(y[u].scale??1),Hs);return}d(l,u,L.sceneId,y[u].x??.5,f(u),y[u].scale??1)},library(){if(!A)return null;const l=(document.documentElement.lang||"en").slice(0,2);return{bundle:A.bundle,assets:A.assets.filter(u=>u.kind!=="sheet").map(u=>({id:u.id,layer:u.layer,shelf:qr(u),anim:Jn(u),band:It(u),tags:u.tags??[],url:A.base+u.file,thumb:U(u),label:ye({},u,l)}))}},tiles:l=>Os(l),seriesOfLayer(l){const u=i.get(y[ne(l)]?.asset),d=Ke(u);if(!d||!A)return null;const f=(document.documentElement.lang||"en").slice(0,2),S=z=>({id:z.id,url:A.base+z.file,thumb:U(z),...Pe(z)});return{series:d,asset:u.id,members:kr(A.assets,u).map(S),characters:Mr(A.assets).map(z=>({series:z.series,url:A.base+z.asset.file,thumb:U(z.asset),label:ye({},z.asset,f)}))}},async switchCharacter(l,u){const d=i.get(y[ne(l)]?.asset),f=d&&A?Sr(A.assets,d,u):null;f&&await L.swapAsset(l,f.id)},async swapAsset(l,u){if(l==="sky"){if(i.get(u)?.layer!=="sky"||dt()?.id===u)return;await L.show({...r,set:{...Ae(),sky:u}}),L.sceneId!=null&&t.onCommit?.(0,{sky:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const d=F[X(l)];if(d){const S=i.get(u);if(!S||!It(S)||d.asset===u)return;const z=Number(l.slice(5)),V=F.map((O,ee)=>ee===z?{...O,asset:u}:O);await L.show({...r,set:{...Ae(),groundBands:V}}),L.sceneId!=null&&t.onCommit?.(0,{band:{index:z,asset:u}},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L.select(l);return}const f=ne(l);f<0||!y[f]||!i.has(u)||y[f].asset===u||(y=y.map((S,z)=>z===f?{...S,asset:u}:S),await L.show({...r,set:Ae()}),t.onCommit?.(f,{asset:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(l,u=null){const d=i.get(l);if(!d)return;const f=["mid","fg","near","bg","sky"].includes(d.layer)?d.layer:d.layer==="figure"?"fg":"mid",S=u?0:y.filter(V=>V.asset===l).length;let z={asset:l,depth:f,x:.5+.08*(S%5),scale:1};if(!(d.tileable_x||d.layer==="bg"||d.layer==="sky")){const V=u&&s?$n(s.pointerRay(u.x,u.y),Qt({},d)?0:ee=>s.groundHeightAt(ee)):null,O=lt($t(V??Ht(z.x,te[f])));z={...z,...O,depth:mn(O.z)}}y=[...y,z],await L.show({...r,set:Ae()}),t.onCommit?.(y.length-1,{add:z},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),I?.select(y.length-1,!0)},async settleBand(l){const u=y[l];if(!u||!_e(l))return;const d=mn(Oe(l));if(d===u.depth)return;y=y.map((S,z)=>z===l?{...S,depth:d}:S);const f=E;await L.show({...r,set:Ae()}),E=f,R(),L.sceneId!=null&&t.onCommit?.(l,{depth:d},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),I?.select(l,!1)},groundSlots(){if(!A||!r)return null;const l=(document.documentElement.lang||"en").slice(0,2),u=vs(r.set??{},A).map(f=>({asset:f.asset.id,from_m:f.from})),d=A.assets.filter(f=>f.layer==="ground").map(f=>({id:f.id,label:ye({},f,l),thumb:U(f)}));return{rows:u,options:d,max:Vt}},async setGroundSlots(l){if(!r||!Array.isArray(l))return;const u=l.slice(0,Vt).map((f,S)=>({asset:String(f.asset),from_m:S===0?0:Math.max(0,Math.min(2e3,Number(f.from_m)||0))})),d=E;await L.show({...r,look:q,set:{...Ae(),groundSlots:u}}),E=d,R(),L.sceneId!=null&&t.onGroundSlots?.(u,L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},lookControls(){return qn.map(l=>{const[u,d,f]=La[l]??[0,1,.01];return{key:l,min:u,max:d,step:f,value:ie({...Ut,...q},l)}})},setLook(l,u){!qn.includes(l)||!Number.isFinite(u)||!s||(q={...q,[l]:u},s.setLook(q),t.onLook?.(l,u,L.sceneId))},async still(l=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const d=document.createElement("canvas");return d.width=l,d.height=Math.max(1,Math.round(l*n.height/n.width)),d.getContext("2d").drawImage(n,0,0,d.width,d.height),d.toDataURL("image/jpeg",.72)};return s.engine.resize(),Q++,s.gridHidden=!0,new Promise(d=>{let f=0;const S=O=>{s.engine.onEndFrameObservable.remove(z),clearTimeout(V),s.gridHidden=--Q>0,d(O)},z=s.engine.onEndFrameObservable.add(()=>{++f>=6&&S(u())}),V=setTimeout(()=>S(null),4e3)})},get config(){return r},figureBox(l){const u=y.find(z=>z.figure===l);if(!u?.asset)return null;const d=mr(o,u,c.get(u.asset)??1.7,he());if(!d)return null;const f=n.getBoundingClientRect(),S=f.width*.05;return new DOMRect(f.left+d.x*f.width-S/2,f.top+d.y*f.height,S,f.height*.08)},items:()=>{const l=(document.documentElement.lang||"en").slice(0,2),u=vr([...y.map((d,f)=>ye(d,i.get(d.asset),l)||`layer ${f+1}`),...F.map(d=>ye({},i.get(d.asset)??{id:d.asset},l))]);return[...y.map((d,f)=>({id:`layer-${f}`,label:u[f],icon:br(i.get(d.asset)),depth:d.depth,z:d.z??te[d.depth],keys:d.keys??[]})),...F.map((d,f)=>({id:`band-${f}`,label:u[y.length+f],icon:"photo",depth:"bg",z:d.z,keys:d.keys??[],backdrop:!0})),...r?.set?.sky?[{id:"sky",label:Xr[l]??"Sky",icon:"cloud",depth:"sky",keys:p.keys??[],backdrop:!0}]:[],{id:"camera",label:Zr[l]??"Camera",icon:"camera",depth:null,keys:[]}]},destroy(){g=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}I?.destroy(),n.remove()}};return L}export{Qn as DROP_TYPE,qn as LOOK_KEYS,fi as createStage25d,ti as stageScene};
