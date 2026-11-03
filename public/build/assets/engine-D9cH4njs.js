import{m as rs,c as is,M as Qe,S as et,R as Sn,C as we,T as de,V as I,E as ie,a as En,b as Se,P as ls,d as It,e as Vt,f as cs,g as hs,h as ds,i as An,U as us,H as fs,D as ps}from"./babylon-Cg6WFYBR.js";import{l as ms}from"./config-qjtb2AOJ.js";import{handleCss as gs}from"./ArtworkOverlay-BVYfTRo6.js";import{g as gt,c as xs,w as Ut,h as vs,e as ys}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-fhY1XOus.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-fDa9AC4g.js";import"./ambient-CEzLlAaX.js";const Pe=new Set;let xt=!1;function ws(e,t,n=2){const s=t&&t.length,a=s?t[0]*n:e.length;Pe.size&&Pe.clear();let r=Fn(e,0,a,n,!0);const o=[];if(!r||r.next===r.prev)return o;let i=0,l=0,p=0;if(s&&(r=Es(e,t,r,n)),e.length>80*n){i=e[0],l=e[1];let d=i,x=l;for(let b=n;b<a;b+=n){const v=e[b],g=e[b+1];v<i&&(i=v),g<l&&(l=g),v>d&&(d=v),g>x&&(x=g)}p=Math.max(d-i,x-l),p=p!==0?32767/p:0}return vt(r,o,i,l,p),o}function Fn(e,t,n,s,a){let r=null;if(a===Is(e,t,n,s)>0)for(let o=t;o<n;o+=s)r=$t(o/s|0,e[o],e[o+1],r);else for(let o=n-s;o>=t;o-=s)r=$t(o/s|0,e[o],e[o+1],r);return r&&Ce(r,r.next)&&(Be(r),r=r.next),r}function be(e,t=e){const n=t===e;let s=e,a;do a=!1,s!==s.next&&(Pe.size===0||!Pe.has(s))&&(Ce(s,s.next)||$(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),xt=!0,Be(s),s=s.prev,a=!0):(n||s!==t)&&(s=s.next,a=!n);while(a||s!==t);return t}function vt(e,t,n,s,a){a&&_s(e,n,s,a);let r=e,o=!1;for(;e.prev!==e.next;){const i=e.prev,l=e.next;if($(i,e,l)<0&&(a?ks(e,n,s,a):bs(e))){t.push(i.i,e.i,l.i),Be(e),e=l,r=l;continue}if(e=l,e===r){if(xt=!1,e=be(e),xt){r=e;continue}if(!o){e=Ms(e,t),r=e,o=!0;continue}Ss(e,t,n,s,a);break}}}function bs(e){const t=e.prev,n=e,s=e.next,a=t.x,r=n.x,o=s.x,i=t.y,l=n.y,p=s.y,d=Math.min(a,r,o),x=Math.min(i,l,p),b=Math.max(a,r,o),v=Math.max(i,l,p);let g=s.next;for(;g!==t;){if(g.x>=d&&g.x<=b&&g.y>=x&&g.y<=v&&!(a===g.x&&i===g.y)&&Ke(a,i,r,l,o,p,g.x,g.y)&&$(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function ks(e,t,n,s){const a=e.prev,r=e,o=e.next,i=a.x,l=r.x,p=o.x,d=a.y,x=r.y,b=o.y,v=Math.min(i,l,p),g=Math.min(d,x,b),c=Math.max(i,l,p),y=Math.max(d,x,b),k=kt(v,g,t,n,s),C=kt(c,y,t,n,s);let w=e.prevZ;for(;w&&w.z>=k;){if(w.x>=v&&w.x<=c&&w.y>=g&&w.y<=y&&w!==o&&!(i===w.x&&d===w.y)&&Ke(i,d,l,x,p,b,w.x,w.y)&&$(w.prev,w,w.next)>=0)return!1;w=w.prevZ}let F=e.nextZ;for(;F&&F.z<=C;){if(F.x>=v&&F.x<=c&&F.y>=g&&F.y<=y&&F!==o&&!(i===F.x&&d===F.y)&&Ke(i,d,l,x,p,b,F.x,F.y)&&$(F.prev,F,F.next)>=0)return!1;F=F.nextZ}return!0}function Ms(e,t){let n=e,s=!1;do{const a=n.prev,r=n.next.next;Ln(a,n,n.next,r,!1)&&Re(a,r)&&Re(r,a)&&(t.push(a.i,n.i,r.i),Be(n),Be(n.next),n=e=r,s=!0),n=n.next}while(n!==e);return s?be(n):n}function Ss(e,t,n,s,a){let r=e;do{let o=r.next.next;for(;o!==r.prev;){if(r.i!==o.i&&Cs(r,o)){let i=Dn(r,o);r=be(r,r.next),i=be(i,i.next),vt(r,t,n,s,a),vt(i,t,n,s,a);return}o=o.next}r=r.next}while(r!==e)}let yt=!1;function Es(e,t,n,s){const a=[];for(let r=0,o=t.length;r<o;r++){const i=t[r]*s,l=r<o-1?t[r+1]*s:e.length,p=Fn(e,i,l,s,!1);p===p.next&&Pe.add(p),a.push(Ps(p))}a.sort(As),Ts(e.length/s,t.length),zn(n,n),yt=!0;for(let r=0;r<a.length;r++)n=Fs(a[r],n);return yt=!1,be(n)}function As(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function Fs(e,t){const n=Ls(e,t);if(!n)return t;const s=Dn(n,e),a=s.next;return zn(n,a.next),be(s,s.next),be(n,n.next)}const Tn=16;let N=new Float64Array(0),Ze=0;const wt=[],bt=[];function Ts(e,t){const n=Math.ceil((e+2*t)/Tn)+t+2;N.length<n*4&&(N=new Float64Array(n*4)),Ze=0}function zn(e,t){let n=e;do{const s=Ze++;wt[s]=n;let a=1/0,r=1/0,o=-1/0,i=-1/0,l=0;do{const d=n.next;n.z=s,n.x<a&&(a=n.x),n.x>o&&(o=n.x),n.y<r&&(r=n.y),n.y>i&&(i=n.y),d.x<a&&(a=d.x),d.x>o&&(o=d.x),d.y<r&&(r=d.y),d.y>i&&(i=d.y),n=d}while(++l<Tn&&n!==t);bt[s]=n;const p=s*4;N[p]=a,N[p+1]=r,N[p+2]=o,N[p+3]=i}while(n!==t)}function zs(e,t){const n=e.z*4;t.x<N[n]&&(N[n]=t.x),t.y<N[n+1]&&(N[n+1]=t.y),t.x>N[n+2]&&(N[n+2]=t.x),t.y>N[n+3]&&(N[n+3]=t.y)}function Nt(e){let t=bt[e];for(;t.prev.next!==t;)t=t.next;return bt[e]=t,t}function Ht(e){let t=wt[e];for(;t.prev.next!==t;)t=t.next;return wt[e]=t,t}function Ls(e,t){let n=t;const s=e.x,a=e.y;let r=-1/0,o;if(Ce(e,n))return n;for(let b=0,v=0;b<Ze;b++,v+=4){if(a<N[v+1]||a>N[v+3]||N[v]>s||N[v+2]<=r)continue;const g=Nt(b);n=Ht(b);do{if(n.prev.next===n){if(Ce(e,n.next))return n.next;if(a<=n.y&&a>=n.next.y&&n.next.y!==n.y){const c=n.x+(a-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(c<=s&&c>r&&(r=c,o=n.x<n.next.x?n:n.next,c===s))return o}}n=n.next}while(n!==g)}if(!o)return null;const i=o.x,l=o.y,p=Math.min(a,l),d=Math.max(a,l);let x=1/0;for(let b=0,v=0;b<Ze;b++,v+=4){if(N[v+2]<i||N[v]>s||N[v+3]<p||N[v+1]>d)continue;const g=Nt(b);n=Ht(b);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&Ke(a<l?s:r,a,i,l,a<l?r:s,a,n.x,n.y)){const c=Math.abs(a-n.y)/(s-n.x);(Re(n,e)||n.y===a&&n.next.y===a&&n.next.x>s)&&(c<x||c===x&&(n.x>o.x||n.x===o.x&&Ds(o,n)))&&(o=n,x=c)}n=n.next}while(n!==g)}return o}function Ds(e,t){return $(e.prev,e,t.prev)<0&&$(t.next,e,e.next)<0}const te=[];let Ae=[],xe=new Uint32Array(0),Fe=new Uint32Array(0);const Te=new Uint32Array(256);function _s(e,t,n,s){let a=e,r=0;do a.z=kt(a.x,a.y,t,n,s),te[r++]=a,a=a.next;while(a!==e);Os(r);let o=null;for(let i=0;i<r;i++){const l=te[i];l.prevZ=o,o&&(o.nextZ=l),o=l}o.nextZ=null}function Os(e){if(e<=32){for(let t=1;t<e;t++){const n=te[t],s=n.z;let a=t-1;for(;a>=0&&te[a].z>s;)te[a+1]=te[a],a--;te[a+1]=n}return}xe.length<e&&(xe=new Uint32Array(e),Fe=new Uint32Array(e),Ae=new Array(e));for(let t=0;t<e;t++)xe[t]=te[t].z;Ne(e,te,xe,Ae,Fe,0),Ne(e,Ae,Fe,te,xe,8),Ne(e,te,xe,Ae,Fe,16),Ne(e,Ae,Fe,te,xe,24)}function Ne(e,t,n,s,a,r){Te.fill(0);for(let i=0;i<e;i++)Te[n[i]>>>r&255]++;let o=0;for(let i=0;i<256;i++){const l=Te[i];Te[i]=o,o+=l}for(let i=0;i<e;i++){const l=n[i],p=Te[l>>>r&255]++;s[p]=t[i],a[p]=l}}function kt(e,t,n,s,a){return e=(e-n)*a|0,t=(t-s)*a|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function Ps(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function Ke(e,t,n,s,a,r,o,i){return(a-o)*(t-i)>=(e-o)*(r-i)&&(e-o)*(s-i)>=(n-o)*(t-i)&&(n-o)*(r-i)>=(a-o)*(s-i)}function Cs(e,t){const n=Ce(e,t)&&$(e.prev,e,e.next)>0&&$(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Re(e,t)&&Re(t,e)&&($(e.prev,e,t.prev)!==0||$(e,t.prev,t)!==0))&&!Rs(e,t)&&(n||Bs(e,t))}function $(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Ce(e,t){return e.x===t.x&&e.y===t.y}function Ln(e,t,n,s,a=!0){const r=$(e,t,n),o=$(e,t,s),i=$(n,s,e),l=$(n,s,t);return(r>0&&o<0||r<0&&o>0)&&(i>0&&l<0||i<0&&l>0)?!0:a?!!(r===0&&He(e,n,t)||o===0&&He(e,s,t)||i===0&&He(n,e,s)||l===0&&He(n,t,s)):!1}function He(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Rs(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),a=Math.min(e.y,t.y),r=Math.max(e.y,t.y);let o=e;do{const i=o.next;if(o.x>s&&i.x>s||o.x<n&&i.x<n||o.y>r&&i.y>r||o.y<a&&i.y<a){o=i;continue}if(o.i!==e.i&&i.i!==e.i&&o.i!==t.i&&i.i!==t.i&&Ln(o,i,e,t))return!0;o=i}while(o!==e);return!1}function Re(e,t){return $(e.prev,e,e.next)<0?$(e,t,e.next)>=0&&$(e,e.prev,t)>=0:$(e,t,e.prev)<0||$(e,e.next,t)<0}function Bs(e,t){let n=e,s=!1;const a=(e.x+t.x)/2,r=(e.y+t.y)/2;do{const o=n.next;n.y>r!=o.y>r&&a<(o.x-n.x)*(r-n.y)/(o.y-n.y)+n.x&&(s=!s),n=o}while(n!==e);return s}function Dn(e,t){const n=Mt(e.i,e.x,e.y),s=Mt(t.i,t.x,t.y),a=e.next,r=t.prev;return e.next=t,t.prev=e,n.next=a,a.prev=n,s.next=n,n.prev=s,r.next=s,s.prev=r,s}function $t(e,t,n,s){const a=Mt(e,t,n);return s?(a.next=s.next,a.prev=s,s.next.prev=a,s.next=a):(a.prev=a,a.next=a),a}function Be(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),yt&&zs(e.prev,e.next)}function Mt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function Is(e,t,n,s){let a=0;for(let r=t,o=n-s;r<n;r+=s)a+=(e[o]-e[r])*(e[r+1]+e[o+1]),o=r;return a}Object.assign(window,{BABYLON:{...is,...rs},earcut:ws});(()=>{const e=`
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
    }`})();const Vs=new WeakMap;function Us(e){return Vs.get(e)?.rtt??null}const Ns=450,Wt=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],Gt=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],jt={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},Hs={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function $s(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),r=e.enableGeometryBufferRenderer(),o=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(w=>w.name!=="sky-cloud"&&!(w.metadata&&w.metadata.noGBuffer)))}),i=r.getGBuffer().textures,l=i[r.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],p=i[r.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],d=w=>new BABYLON.Vector2(1/w.width,1/w.height),x=new BABYLON.Matrix,b=["invView","tanHalf","resolution","skyDepth"],v=["depthSampler","normalSampler"];function g(w,F){t.getViewMatrix().invertToRef(x);const W=Math.tan(t.fov/2);w.setMatrix("invView",x),w.setVector2("tanHalf",new BABYLON.Vector2(W*F.width/F.height,W)),w.setVector2("resolution",new BABYLON.Vector2(F.width,F.height)),w.setFloat("skyDepth",Ns),w.setTexture("depthSampler",l),w.setTexture("normalSampler",p)}const c=new BABYLON.PostProcess("wash","wash",["texel","radius",...b],v,1,t);c.onApply=w=>{g(w,c),w.setVector2("texel",d(c)),w.setFloat("radius",n.num("wash"))};const y=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...Wt,...b],["aquarelSampler",...v],1,t);y.onApply=w=>{g(w,y),w.setVector2("texel",d(y));const F=n.texture();w.setFloat("useTex",F?1:0),w.setTexture("aquarelSampler",F||s),Wt.forEach(W=>w.setFloat(W,n.num(W)))};const k=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...Gt,...b],["washSampler","animeSampler",...v],1,t);k.onApply=w=>{g(w,k),w.setTextureFromPostProcessOutput("washSampler",c),w.setTexture("animeSampler",Us(e)||a),w.setVector2("texel",d(k)),Gt.forEach(F=>w.setFloat(F,n.num(F))),w.setColor3("inkColor",BABYLON.Color3.FromArray(jt[n.inkColor()]||jt["blue-grey"]))};const C=[c,y,k];return{dispose(){C.forEach(w=>w.dispose(t)),e.onBeforeRenderObservable.remove(o),e.disableGeometryBufferRenderer(),s.dispose(),a.dispose()}}}const K={sky:380,bg:70,mid:22,fg:7,near:3.5},U={x:0,y:1.6,z:0,fov:50},tt=-2,_n=16/9,On=.42,ot=1.6,Ws=3,Pn=e=>Ws*fe(e),Gs=(e,t)=>t*e,js=(e,t,n,s)=>Gs(e,t)-(1-s)*n,Xe=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Ys=999,Zs=1e3,Ks=.02,Cn=2,Lt=120,Rn=.05,ue=e=>e>Math.PI?e*Math.PI/180:e,fe=(e,t=U.fov,n=_n)=>2*e*Math.tan(ue(t)/2)*n;function Yt(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const Zt=e=>e.z??K[e.depth],Xs=e=>Math.min(1,Math.max(0,(e-K.mid)/(K.bg-K.mid)));function St(e,t){return e<=K.bg||t===0?Xs(e)*t:U.y+(t-U.y)*e/K.bg}const qs=(e,t)=>t?e+t.h*(1-t.top):e,Js=["ground","path","field","ramp","water"],ye=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Js.includes(t)),Qs=2,Kt=e=>ye(e)&&e.w/Math.max(1,e.h)>=Qs,Bn=(e,t,n,s)=>Math.min(0,js(e,t,n,s)),Xt=[2,2e3];function eo(e,t,n,s,a,r){const o=me({...e},t),i=Math.min(Xt[1],Math.max(Xt[0],o.z??e.z)),l=Pn(i)/s,p=a*l*o.scale;return{z:i,h:p,w:s*l*Math.max(1,o.scale),sx:l*Math.max(1,o.scale),sy:l*o.scale,x:(o.x-.5)*fe(i),y:Bn(i,n,p,r),alphaIndex:Xe(i),opacity:o.opacity}}const In=(e,t)=>!!e.flat||t.layer==="ground";function ze(e,t,n,s=0,a=s){const r=t.depth,o=Zt(t)-n*Rn,i=fe(o),l=r==="sky"?n*2+1:Xe(o);if(e.layer==="sky"){const y=i*ot,k=y/_n,C=-k*.12+(t.y??0);if(e.tileable_x)return{x:0,y:C,z:o,w:y,h:k,uRepeat:y/(k*(e.w/e.h)),alphaIndex:l,rotation:0};const w=Math.max(y/e.w,k/e.h);return{x:0,y:C,z:o,w:e.w*w,h:e.h*w,uRepeat:1,alphaIndex:l,rotation:0}}const p=e.layer==="bg"&&!e.tileable_x?i*ot*e.h/e.w:0,d=Math.max(e.height_m*(t.scale??1),p),x=d*(e.w/e.h),b=e.tileable_x?Math.max(x,i*ot):x,v=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?r==="bg"?s:0:ye(e)?0:St(Zt(t),a),c=r==="sky"?o*Math.tan(ue(U.fov)/2)*.45:g;return{x:v,y:c+(t.y??0),z:o,w:b,h:d,uRepeat:e.tileable_x?b/x:1,alphaIndex:l,rotation:t.rotation??0}}function to(e,t,n=0,s=On,a=tt){const r=.5/Math.tan(ue(U.fov)/2),o=.5+r*Math.tan(-a*Math.PI/180),i=K.bg-n*Rn,l=U.y+(o-s)*i/r;return Math.round((l-t*(1-e))*10)/10}const $e=e=>e-no,no=.002,qt={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},Vn=(e,t)=>(qt[e??"inOut"]??qt.inOut)(Math.min(1,Math.max(0,t))),Le=(e,t,n)=>e+(t-e)*n,Un=e=>e.dur_s??(e.camera&&ho(e)||e.est_s||8);function Nn(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(a=>(a.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function Hn(e,t,n){if(!e)return{...U,fov:ue(U.fov)};const s=Vn(e.ease,n>0?t/(e.dur_s??n):1),a={...U,...e.from},r={...a,...e.to};return{x:Le(a.x,r.x,s),y:Le(a.y,r.y,s),z:Le(a.z,r.z,s),fov:Le(ue(a.fov),ue(r.fov),s)}}const so=["x","y","z","scale","opacity","rotation"];function me(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const a={...n};for(const r of so){const o=s.filter(b=>b[r]!==void 0).sort((b,v)=>b.t-v.t);if(!o.length)continue;const i=o[0],l=o[o.length-1];if(t<=i.t){a[r]=i[r];continue}if(t>=l.t){a[r]=l[r];continue}const p=o.findIndex(b=>b.t>t),d=o[p-1],x=o[p];a[r]=Le(d[r],x[r],Vn("inOut",(t-d.t)/(x.t-d.t)))}return a}const oo={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},$n=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function Jt(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??$n(e),amount:n.amount??1,speed:n.speed??1}}const ao=.25,ro=2e3,io=250,Me={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},Qt={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function lo(e,t,n,s){const a=i=>{const l=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:l,lastUp:i===-1?n:e.lastUp,locked:e.locked||l>=Me.lockFlips&&i===1}};if(t<Me.downFps)return s?a(1):{...e,fast:0};if(t<Me.upFps)return{...e,fast:0};const r=e.fast+1;return e.notches>0&&!e.locked&&r>=Me.upWindows&&n-e.lastChange>=Me.upAfterChangeMs&&n-e.lastUp>=Me.upEveryMs?a(-1):{...e,fast:r}}function co(e,t,n,s){const a=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),a-s*ao)}function ho(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const en={breath_m:.05,breath_s:7},uo=1.5;function fo(e,t,n={}){const s=n.breath_m??en.breath_m,a=2*Math.PI/Math.max(.5,n.breath_s??en.breath_s),r=Math.min(1,t/uo),o=r*r*(3-2*r);return{...e,x:e.x+s*o*Math.sin(a*t),y:e.y+s*.5*o*Math.sin(2*a*t)}}async function po(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const mo=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function _e(e,t,n){if(t.asset){const o=e.assets.find(i=>i.id===t.asset);if(o)return o}const s=mo(t.need??t.asset??"");if(!s.length)return null;let a=null,r=[0,0,0];for(const o of[...e.assets].sort((i,l)=>i.id.localeCompare(l.id))){const i=s.filter(p=>o.tags.some(d=>d.toLowerCase()===p)).length;if(!i)continue;const l=[i,n&&o.layer===n?1:0,o.qa?.score??0];(!a||l[0]>r[0]||l[0]===r[0]&&(l[1]>r[1]||l[1]===r[1]&&l[2]>r[2]))&&(a=o,r=l)}return a}const De="#f6f5ee",go=.22,xo=(e,t)=>e.layer==="bg"?t.feather??go:0,at=.6,Wn=12;function vo(e,t){const n=t.paper??De,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const a=t.assets.filter(o=>o.layer==="ground");if(!s)return a.length?{kind:"asset",asset:[...a].sort((o,i)=>o.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const r=_e({...t,assets:a},{asset:s},"ground");return r?{kind:"asset",asset:r}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function yo(e,t,n,s=.08){return Gn(e,t,n,1-s,1)}function Gn(e,t,n,s,a){const r=Math.max(0,Math.floor(n*s)),o=Math.min(n,Math.max(r+1,Math.ceil(n*a))),i=[[],[],[]],l=Math.max(1,Math.floor(t*(o-r)/2e4));for(let d=r*t;d<o*t;d+=l){const x=d*4;e[x+3]<200||(i[0].push(e[x]),i[1].push(e[x+1]),i[2].push(e[x+2]))}if(!i[0].length)return null;const p=d=>{const x=[...d].sort((b,v)=>b-v);return x[x.length>>1]/255};return[p(i[0]),p(i[1]),p(i[2])]}const Oe=32,wo=(e,t,n)=>Array.from({length:Oe},(s,a)=>Gn(e,t,n,a/Oe,(a+1)/Oe)),bo=(e,t)=>e[Math.min(Oe-1,Math.max(0,Math.floor((1-t)*Oe)))]??null;function ko(e,t,n){const s=[],a=Math.max(1,Math.floor(t*n/6e4));for(let r=0;r<t*n;r+=a){const o=r*4;if(e[o+3]<230)continue;const i=(.299*e[o]+.587*e[o+1]+.114*e[o+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((r,o)=>r-o),s[s.length>>1])}function Mo(e,t,n){const s=[];for(let a=0;a<t;a++)for(let r=0;r<n;r++)if(e[(r*t+a)*4+3]>128){s.push(r/n);break}return s.length?(s.sort((a,r)=>a-r),s[s.length>>1]):0}function So(e,t,n){for(let s=0;s<n;s++){let a=0;for(let r=0;r<t;r++)e[(s*t+r)*4+3]>128&&a++;if(a/t>.5)return s/n}return 0}const Eo=1.6,Ao=.12;function tn(e,t,n,s){const a=e.layer==="figure",r=a?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),o=r*Ao*s/Eo;return a?{w:r,d:Math.min(o,r*.5)}:{w:r,d:Math.min(Math.max(o,r*.3),r*3)}}const Fo=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,We=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Dt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,jn=Dt;ie.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;ie.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, nearTex;
  uniform float useTex, tile, grain, fadeNear, fadeFar, detail, vary, mixTile;
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${Dt}
  vec3 tileAt(vec2 uv) { return mix(texture2D(tex, uv, 4.0).rgb, texture2D(tex, uv).rgb, detail); }
  void main(void) {
    vec2 uv = vW.xz / tile;
    // anti-tiling: a second, turned and scaled read of the same tile, swapped in over big soft world patches, so the
    // rows of one repeating tile break up (mixTile 0 = the plain tile)
    vec3 c = base;
    if (useTex > 0.5) {
      vec2 uv2 = mat2(0.866, -0.5, 0.5, 0.866) * uv * 1.37 + vec2(0.31, 0.57);
      float m = smoothstep(0.3, 0.7, fbm(vW.xz * 0.06 + 11.0));
      c = mix(tileAt(uv), tileAt(uv2), m * mixTile);
    }
    // low-frequency value and hue drift over the field (vary), the way a hand wash is never even
    c *= 1.0 + vary * 0.32 * (fbm(vW.xz * 0.022) - 0.5);
    c.rb *= 1.0 + vary * vec2(0.08, -0.08) * (fbm(vW.xz * 0.017 + 7.0) - 0.5);
    // watercolour on the floor: broad wash variation, then fine granulation, both fixed to the world
    float wash = fbm(vW.xz * 0.18), gran = fbm(vW.xz * 2.7);
    // pigment pools in the wash (broad, +-18 %) and settles in the paper tooth (fine, up to 12 % darker)
    c *= 1.0 - grain * (0.18 * (wash - 0.5) * 2.0 + 0.12 * smoothstep(0.35, 0.8, gran));
    float d = distance(vW.xz, camPos.xz);
    c = mix(c, horizonTint, smoothstep(fadeNear, fadeFar, d));
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
  ${Dt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const To=e=>e?de.WRAP_ADDRESSMODE:de.MIRROR_ADDRESSMODE;function zo(e){const t=Qe.CreateGround("ground",{width:2400,height:2400},e),n=new et("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tile","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","nearTex"],needAlphaBlending:!0}),s=new Sn(new Uint8Array([255,255,255,255]),1,1,we.TEXTUREFORMAT_RGBA,e);n.setTexture("tex",s).setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0);let a=Wn,r=1;return t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Ys,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){o.tex&&(o.tex.wrapU=de.WRAP_ADDRESSMODE,o.tex.wrapV=de.WRAP_ADDRESSMODE),n.setTexture("tex",o.tex??s),a=o.tile,n.setFloat("useTex",o.tex?1:0).setFloat("tile",a*r).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",I.FromArray(o.base)).setVector3("horizonTint",I.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){r=o.tileScale,n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tile",a*r)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=To(o.tileable),o.tex.wrapV=de.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}let Lo=0;function nn(e,t,n,s,a){const r=Qe.CreatePlane(`stain${a?"-cast":""}:${e.name}`,{width:t,height:a?a.length:n},s);if(r.rotation.x=Math.PI/2,a){const[i,l]=a.dir,p=Math.hypot(i,l)||1;r.rotation.y=Math.atan2(i/p,l/p),r.position.set(i/p*a.length*.42,.015,l/p*a.length*.42)}else r.position.set(0,.02,-n*.18);r.parent=e;const o=new et(r.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return o.alphaMode=we.ALPHA_PREMULTIPLIED,o.disableDepthWrite=!0,o.backFaceCulling=!1,o.setFloat("seed",Lo++*7.31%97).setFloat("opacity",0),r.material=o,r.metadata={noGBuffer:!0},r.isPickable=!1,{mesh:r,setOpacity:i=>{o.setFloat("opacity",i),r.isVisible=i>.001}}}ie.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ie.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${jn}
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
  }`;function Yn(e,t,n,s){const a=Qe.CreatePlane(e,{size:1},n),r=new et(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return r.alphaMode=we.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,a.material=r,a.billboardMode=En.BILLBOARDMODE_ALL,a.alphaIndex=s,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,mat:r}}const Zn=9,Do=9;function _o(e,t,n,s){const a=Array.from({length:Zn},(r,o)=>{const i=Yn(`smoke:${o}`,"stagePuff",e,s);return i.mat.setFloat("seed",o*3.7),i});return{update(r,o){a.forEach(({mesh:i,mat:l},p)=>{const d=Oo(r,p),x=n*(.6+3.2*d);i.scaling.setAll(x),i.position.set(t.x+n*1.6*d*d+.15*n*Math.sin(p*2.1+r*.3),t.y+n*(.4+7*d),t.z),l.setFloat("alpha",o*.7*Math.sin(Math.PI*d)),i.isVisible=o>.001})},dispose(){a.forEach(({mesh:r,mat:o})=>{o.dispose(),r.dispose()})}}}const Oo=(e,t)=>((e/Do+t/Zn)%1+1)%1,rt=40,sn=16;function Po(e){const t=(e%rt+rt)%rt;return t<sn?t/sn:null}function Co(e,t,n,s){const a=Array.from({length:6},(r,o)=>Yn(`bird:${o}`,"stageBird",e,s));return{update(r,o){const i=Po(r),l=Math.round(2+o*4);a.forEach(({mesh:p,mat:d},x)=>{if(p.isVisible=o>.001&&i!==null&&x<l,!p.isVisible||i===null)return;const b=x*.025;p.position.set((i-b-.5)*n*1.2,22+3*Math.sin(x*1.7)+4*i,t+x*1.5),p.scaling.setAll(3.2),d.setFloat("alpha",.85*Math.min(1,o*2)).setFloat("flap",Math.sin(r*7+x*1.3))})},dispose(){a.forEach(({mesh:r,mat:o})=>{o.dispose(),r.dispose()})}}}const on=["fire","hearth","chimney","smoke"],Ro=e=>e.id.split(/[-_]/).some(t=>on.includes(t))||e.tags.some(t=>on.includes(t.toLowerCase())),it=e=>e[0].toUpperCase()+e.slice(1),Bo=e=>({fade:`lineFade${it(e)}`,thin:`lineThin${it(e)}`,haze:`haze${it(e)}`}),qe={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:tt,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},Io=[1.05,1,.9],Vo=[.88,.93,1.05],Uo=.35;function No(e,t,n,s){const a=t==="sky";return{edgeSoft:a?0:Y(e,"edgeSoft"),footM:t==="standing"?Uo:0,grounding:t==="figure"?0:Y(e,"grounding"),grass:t==="figure"?0:Y(e,"grassOverlap"),light:a?0:Y(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:a?Y(e,"cloudDrift"):0,footTint:s}}const Kn=[.93,.86,.74],an=e=>({paper:Y(e,"sheetPaper"),grain:Y(e,"sheetGrain"),patches:Y(e,"sheetPatches"),wash:Y(e,"sheetWash"),washColour:Kn}),Ho={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01]},$o=Object.fromEntries(Object.keys(qe).map(e=>[e,Ho[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),he=(e,t)=>Y(e,t),Y=(e,t)=>{const n=Number(e[t]??qe[t]);return Number.isFinite(n)?n:qe[t]};function lt(e,t){const n=Bo(t);return{fade:Y(e,n.fade),thin:Y(e,n.thin),haze:Y(e,n.haze),brown:Y(e,"lineBrown"),ink:Y(e,"lineInk"),norm:Y(e,"lineNorm")}}const Wo=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),ct=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),Ge=(e,t,n,s,a)=>{const r=s*(1080/a);return[n/Math.max(e*r,.001),1/Math.max(t*r,.001)]};function Go(e,t,n){const s=new I(U.x,U.y,U.z),a=Se.RotationX(e*Math.PI/180),o=Se.LookAtLH(s,s.add(I.TransformNormal(new I(0,0,1),a)),I.TransformNormal(I.Up(),a)).multiply(Se.PerspectiveFovLH(ue(U.fov),t,.1,2e3));return{vp:o,top:I.TransformCoordinates(new I(0,0,n),o).y}}ie.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function jo(e,t){const n=new ls("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",I.FromArray(Kn))},n}const ke=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,Yo=12;function Xn(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),a=t?.speed??1,r=((t?.offset??0)+n*a)*(e.fps??Yo),o=Math.floor(r+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,o)):(o%s+s)%s}function Zo(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const Ko=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Xo=`
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
  ${jn}
  ${Ko}
  ${Xo}
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
  }`;const rn=new WeakMap,qn=new Map,Jn=new Map,Et=new Map,Qn=new Map,At=new Map;function je(e,t){const n=rn.get(t)??new Map;rn.set(t,n);const s=n.get(e);if(s)return s;const a=new Promise((r,o)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>o(new Error(`layer image ${e} did not load`)),i.onload=()=>{const l=document.createElement("canvas");l.width=i.naturalWidth,l.height=i.naturalHeight;const p=l.getContext("2d",{willReadFrequently:!0});p.drawImage(i,0,0);const d=p.getImageData(0,0,l.width,l.height).data,x=yo(d,l.width,l.height);x&&qn.set(e,x),At.set(e,wo(d,l.width,l.height)),Jn.set(e,So(d,l.width,l.height)),Et.set(e,Mo(d,l.width,l.height));const b=ko(d,l.width,l.height);b!==null&&Qn.set(e,b);for(let g=0;g<d.length;g+=4){const c=d[g+3]/255;d[g]=Math.round(d[g]*c),d[g+1]=Math.round(d[g+1]*c),d[g+2]=Math.round(d[g+2]*c)}const v=new Sn(d,l.width,l.height,we.TEXTUREFORMAT_RGBA,t,!0,!1,de.TRILINEAR_SAMPLINGMODE);v.anisotropicFilteringLevel=8,v.wrapV=de.CLAMP_ADDRESSMODE,r(v)},i.src=e});return n.set(e,a),a.catch(()=>n.delete(e)),a}const ht=24;function qo(e,t,n,s,a){const[r,o]=t.anchor??[.5,1],i=[],l=[],p=[];for(let x=0;x<=ht;x++){const b=x/ht;for(const v of[0,1])i.push((v-r)*n,(o-b)*s,0),l.push(v,b);if(x<ht){const v=x*2;p.push(v,v+2,v+1,v+1,v+2,v+3)}}const d=new En(e,a);return Object.assign(new cs,{positions:i,uvs:l,indices:p}).applyToMesh(d),d}let Jo=0;function ln(e,t,n,s,a,r){const o=qo(`layer:${e.id}`,e,n,s,r),i=new et(`layer:${e.id}`,r,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=a!==1?de.WRAP_ADDRESSMODE:de.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const l=Jo++*2.39996%(Math.PI*2),p=e.anchor?.[1]??1;return i.setFloat("phase",l).setFloat("height",s*p).setFloat("width",n).setFloat("uRepeat",a).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new It(0,0,1,1)),o.material=i,o.metadata={noGBuffer:!0,painted:!0},o.isPickable=!1,{mesh:o,material:i,setMotion:d=>{i.setFloat("kind",oo[d.kind]??0).setFloat("amount",d.amount).setFloat("speed",d.speed)},setOpacity:d=>{i.setFloat("opacity",d),o.isVisible=d>.001},setLine:(d,x,b,v)=>{i.setFloat("inkMul",x).setFloat("lineFade",d.fade).setFloat("lineThin",d.thin).setFloat("haze",d.haze).setFloat("lineBrown",d.brown),i.setVector2("pxUV",new Vt(b[0],b[1])).setVector3("hazeTint",I.FromArray(v))},setPaper:(d,x)=>{i.setFloat("paper",d.paper).setFloat("grain",d.grain).setFloat("patches",d.patches).setFloat("wash",d.wash),i.setVector3("washColour",I.FromArray(d.washColour)).setVector2("grainUV",new Vt(x[0],x[1]))},setBottomFade:d=>{i.setFloat("bottomFade",d)},setCell:d=>{i.setVector4("cell",new It(d[0],d[1],d[2],d[3]))},setAlive:d=>{i.setFloat("edgeSoft",d.edgeSoft).setFloat("footM",d.footM).setFloat("grounding",d.grounding).setFloat("grass",d.grass).setFloat("light",d.light).setFloat("sunSide",d.sunSide).setFloat("drift",d.drift),i.setVector3("footTint",I.FromArray(d.footTint)).setVector3("sunColour",I.FromArray(Io)).setVector3("shadeColour",I.FromArray(Vo))},setGroundLine:d=>{i.setFloat("groundLine",d)},setFeather:(d,x)=>{i.setFloat("feather",Math.max(0,Math.min(1,d))),x&&i.setVector3("featherTint",I.FromArray(x))}}}const Ft={...Hs["History Lines pencil"],paper:.35,granulation:.2,...qe},Qo=new An(.937,.914,.863,1),ea=.7,ta=(e,t,n)=>e.map((s,a)=>s+(t[a]-s)*n);class na{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new hs(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new ds(this.engine),this.scene.clearColor=Qo,this.camera=new us("house",new I(0,1.6,0),this.scene),this.camera.rotation.set(tt*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new fs("sky",new I(0,1,0),this.scene).intensity=.7,new ps("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=zo(this.scene),this.ground.set(this.groundLook(null,null,n)),this.birds=Co(this.scene,un,fe(un),ia),$s(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),jo(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=We(De);strip=null;nearTex=null;bands=[];smoke=[];birds;footTint=We(De);nearAsset=null;hazeTint=We(De);sceneLib;buildToken=0;look={...Ft};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=Qt;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return co(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=Qt,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>io;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<ro)return;const a=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const r=this.tier.notches;this.tier=lo(this.tier,a,t,this.scaleAt(r+1)<this.scaleAt(r)),this.tier.notches!==r&&this.fit()}setLook(t){this.look={...Ft,...t??{}}}groundPoint(t,n){const s=K[n];return new I((t-.5)*fe(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,a=[],r=[];t.set.sky&&r.push({layer:hn(t),order:0,index:-1});const o={sky:1};t.set.layers.forEach((E,O)=>{const V=E.depth;o[V]=o[V]??0,r.push({layer:E,order:o[V]++,index:O})});const i=[];await Promise.all(r.map(async({layer:E,order:O,index:V})=>{let H=_e(n,E,E.depth);if(!H){i.push({need:E.need??E.asset,reason:"no match"});return}let oe;try{oe=await je(pe(n,H,E),this.scene)}catch{i.push({need:E.need??E.asset,reason:`file did not load: ${E.src??H.file}`});return}if(s!==this.buildToken)return;H=cn(H,E,oe);const P=ze(H,E,O),R=ln(H,oe,P.w,P.h,P.uRepeat,this.scene);R.mesh.position.set(P.x,P.y,P.z);const ne=In(E,H);R.mesh.alphaIndex=ne?Zs:P.alphaIndex,ne&&(R.mesh.rotation.x=Math.PI/2),R.mesh.isVisible=!1;let ae,se,le;if(dt.includes(E.depth)&&!H.tileable_x&&!ne&&!ye(H)){const j=tn(H,P.w,P.h,P.z);le=M=>tn(H,P.w,P.h,M).d/j.d,ae=nn(R.mesh,j.w,j.d,this.scene),ae.mesh.alphaIndex=$e(P.alphaIndex),se=nn(R.mesh,j.w,j.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:P.h*la(this.sunDir)}),se.mesh.alphaIndex=$e(P.alphaIndex)}a.push({layer:E,index:V,builtScale:E.scale??1,builtZ:P.z,handle:R,asset:H,order:O,stain:ae,cast:se,stainDepth:le,ink:Qn.get(pe(n,H,E)),flat:ne,skyline:Et.get(pe(n,H,E))})}));const l=vo(t.set,n);let p=null,d=null;const x=Fo(t.set.near,n),b=x?_e(n,{asset:x}):null;if(t.set.near&&!b&&i.push({need:t.set.near,reason:"no near band"}),b)try{d=await je(n.base+b.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${b.file}`})}if(l.kind==="asset")try{p=await je(n.base+l.asset.file,this.scene)}catch{i.push({need:t.set.ground??"ground",reason:`file did not load: ${l.asset.file}`})}else l.reason&&i.push({need:t.set.ground,reason:l.reason});const v=a.filter(E=>E.asset.layer==="bg").sort((E,O)=>E.index-O.index)[0],g=v?{top:Jn.get(pe(n,v.asset,v.layer))??0,h:ze(v.asset,v.layer,v.order).h,order:v.order}:null,c=a.find(E=>E.index===-1),y=c&&ze(c.asset,c.layer,c.order),k=c&&y?bo(At.get(pe(n,c.asset,c.layer))??[],(U.y-y.y)/y.h):null,C=v?qn.get(pe(n,v.asset,v.layer))??null:t.set.groundBands?.length?null:k,w=await this.loadBands(t,n),F=E=>E.forEach(O=>{O.stain?.mesh.material?.dispose(),O.cast?.mesh.material?.dispose(),O.handle.mesh.dispose(),O.handle.material.dispose()});if(s!==this.buildToken){F(a),w.forEach(E=>{E.handle.mesh.dispose(),E.handle.material.dispose()});return}F(this.built),this.bands.forEach(E=>{E.handle.mesh.dispose(),E.handle.material.dispose()}),this.bands=w,this.built=a,this.sceneLib=n;const W=l.kind==="asset"?(At.get(n.base+l.asset.file)??[]).filter(E=>!!E):[],G=this.groundLook(l.kind==="asset"?{tex:p,asset:l.asset}:null,C,n,l.kind==="paper"?l.colour:void 0);this.horizonTint=G.tint,this.strip=g,this.smoke.forEach(E=>E.dispose()),this.smoke=a.filter(E=>Ro(E.asset)&&dt.includes(E.layer.depth)&&!E.flat).map(E=>{const O=ze(E.asset,E.layer,E.order);return _o(this.scene,new I(E.handle.mesh.position.x,O.h*.6,O.z),Math.min(Math.max(O.h*.8,.5),3),O.alphaIndex)}),this.footTint=W.length?ca(W):G.base,this.nearTex=d,this.nearAsset=b,this.hazeTint=k??G.tint,this.ground.set(G),this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,a){const r=We(a??s.paper??De),o=n??r;return{tex:t?.tex??null,tile:t?.asset.height_m||Wn,base:ta(r,o,ea),tint:o,fadeNear:K.fg,fadeFar:K.bg*.75,grain:t?.tex?.5:1}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:hn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=o=>this.built.some(i=>i.handle.mesh===o),a=[],r=[...this.scene.multiPick(t,n,s)??[]].sort((o,i)=>o.distance-i.distance);for(const o of r){const i=this.built.find(p=>p.handle.mesh===o.pickedMesh),l=o.getTextureCoordinates();!i||!l||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||ye(i.asset)&&(o.pickedPoint?.y??0)<0||a.push({index:i.index,asset:i.asset,u:l.x,v:l.y})}return a}pickBackdrops(t,n){const s=o=>this.bands.find(i=>i.handle.mesh===o),a=o=>this.built.find(i=>i.handle.mesh===o&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,o=>!!s(o)||!!a(o))??[]].sort((o,i)=>o.distance-i.distance).flatMap(o=>{const i=o.getTextureCoordinates();if(!i)return[];const l=s(o.pickedMesh);if(l)return[{band:l.index,asset:l.asset,u:i.x,v:i.y}];const p=a(o.pickedMesh);return[{index:p.index,asset:p.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(p=>p.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),a=1/this.engine.getRenderWidth(),r=1/this.engine.getRenderHeight(),o=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p=>I.Project(p,Se.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=o.map(p=>p.x*a),l=o.map(p=>p.y*r);return{x0:Math.min(...i),y0:Math.min(...l),x1:Math.max(...i),y1:Math.max(...l),z:n.handle.mesh.position.z}}groundHeightAt(t){return St(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?ye(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Se.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(a=>a.dispose());const s=a=>oa*Math.min(1,Math.max(0,(dn-a)/(dn-ra)));this.gridMeshes=n.pieces.map((a,r)=>{const o=a.lines.map(p=>p.map(([d,x])=>new I(d,St(x,t),x))),i=a.lines.map(p=>p.map(([,d])=>new An(n.rgb[0],n.rgb[1],n.rgb[2],s(d)))),l=Qe.CreateLineSystem(`grid-${r}`,{lines:o,colors:i,useVertexAlpha:!0},this.scene);return l.isPickable=!1,l.setEnabled(!this.gridOff),l.alphaIndex=Xe(a.z)+aa,l.material.depthFunction=we.ALWAYS,l.material.disableDepthWrite=!0,l}),n.land=t}worldXAt(t,n,s){const a=this.scene.createPickingRay(t,n,Se.Identity(),this.camera);return a.origin.x+(s-a.origin.z)/a.direction.z*a.direction.x}sunDir=new I(.55,-1,-.3).normalize();depthLine(t){return{...lt(this.look,t),tint:this.hazeTint}}paper(){return an(this.look)}async loadBands(t,n){const s=[];for(const[a,r]of(t.set.groundBands??[]).entries()){const o=_e(n,{asset:r.asset},"ground_band");if(!o){console.warn(`stage25d: ${t.id}: no ground band ${r.asset}`);continue}const i=await je(pe(n,o,r),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${r.src??o.file} did not load`);continue}const l=cn(o,r,i),p=Pn(r.z),d=p*l.h/l.w,x=ln(l,i,p,d,1,this.scene);x.material.depthFunction=we.ALWAYS,x.mesh.position.set(0,0,r.z),x.mesh.alphaIndex=Xe(r.z),s.push({handle:x,z:r.z,w:p,h:d,skyline:Et.get(pe(n,l,r))??.5,index:a,asset:l,band:r})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?to(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??On,he(this.look,"housePitch")):0}pose(t,n,s,a){const r=Nn(t,n),o=Hn(r.cam,r.t,Un(t)),i=a?fo(o,a.t,a):o;this.camera.position.set(i.x,i.y,i.z),this.camera.fov=i.fov;const l=he(this.look,"housePitch");this.camera.rotation.x=l*Math.PI/180,this.ground.follow(this.camera.position);const p=c=>he(this.look,c);this.ground.live({detail:p("groundDetail"),vary:p("groundVary"),mixTile:p("groundMix"),tileScale:p("groundScale")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Go(l,this.engine.getAspectRatio(this.camera),p("nearFar")),span:sa,tileable:!!this.nearAsset?.tileable_x}:null);const d=this.engine.getRenderHeight(),x=an(this.look),b=he(this.look,"bandHeight"),v=this.horizonOf(t),g=qs(v,this.strip);this.land=g,this.poseGrid(g),this.bands.forEach(c=>{const y=eo(c.band,n,b,c.w,c.h,c.skyline);c.z=y.z,c.handle.mesh.scaling.set(y.sx,y.sy,1),c.handle.mesh.position.set(y.x,y.y,y.z),c.handle.mesh.alphaIndex=y.alphaIndex;const k=ct(d,y.z-U.z,ue(U.fov));c.handle.setOpacity(y.opacity),c.handle.setBottomFade(Math.min(1,he(this.look,"bandFade")/y.h)),c.handle.setPaper(x,Ge(y.w,y.h,1,k,d)),c.handle.setLine(lt(this.look,"bg"),1,Ge(y.w,y.h,1,k,d),this.hazeTint),c.handle.setMotion(Jt(c.asset,{...c.band})),c.handle.material.setFloat("time",s)}),this.smoke.forEach(c=>c.update(s,he(this.look,"smoke"))),this.birds.update(s,he(this.look,"birds"));for(const c of this.built){const y=me(c.layer,n),k=ze(c.asset,{...c.layer,x:y.x,y:y.y,z:y.z,scale:1,rotation:y.rotation},c.order,v,g);c.handle.mesh.position.x=k.x;const C=c.asset.layer==="bg"&&!c.asset.tileable_x?(k.z-U.z)/Math.max(.1,c.builtZ-U.z):1;c.handle.mesh.position.y=c.flat?Ks:ye(c.asset)?Bn(k.z,b,k.h*y.scale,c.skyline??0)+k.y:U.y+(k.y-U.y)*C,c.handle.mesh.position.z!==k.z&&(c.handle.mesh.position.z=k.z,c.flat||(c.handle.mesh.alphaIndex=k.alphaIndex),c.stain&&(c.stain.mesh.alphaIndex=$e(k.alphaIndex)),c.stain&&c.stainDepth&&(c.stain.mesh.scaling.y=c.stainDepth(k.z)),c.cast&&(c.cast.mesh.alphaIndex=$e(k.alphaIndex))),c.handle.mesh.rotation.z=-k.rotation*Math.PI/180,c.handle.mesh.scaling.setAll(y.scale/c.builtScale*C),c.handle.setOpacity(y.opacity),c.handle.setFeather(xo(c.asset,c.layer),this.horizonTint),c.asset.layer==="sky"&&c.handle.setGroundLine((i.y-k.y)/(k.h*y.scale));const w=ct(d,k.z-i.z,this.camera.fov),F=lt(this.look,c.layer.depth);c.handle.setPaper(x,Ge(k.w*y.scale,k.h*y.scale,k.uRepeat,ct(1080,k.z-U.z,ue(U.fov)),1080)),c.handle.setLine(F,c.ink===void 0?1:Wo(c.ink,F.ink,F.norm),Ge(k.w*y.scale,k.h*y.scale,k.uRepeat,w,d),this.hazeTint),c.stain?.setOpacity((c.layer.shadow??at)*y.opacity),c.cast?.setOpacity(he(this.look,"castShadow")*((c.layer.shadow??at)/at)*y.opacity);const W=c.asset.layer==="sky"?"sky":c.asset.layer==="bg"?"strip":c.asset.layer==="figure"?"figure":dt.includes(c.layer.depth)&&!c.flat?"standing":"other";c.handle.setAlive(No(this.look,W,this.sunDir.x,this.footTint)),c.handle.setMotion(Jt(c.asset,c.layer)),c.handle.material.setFloat("time",s),ke(c.asset)&&c.handle.setCell(Zo(c.asset,Xn(c.asset,c.layer.play,n)))}}}const pe=(e,t,n)=>n?.src??e.base+t.file,cn=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:a}=n.getSize(),r=s/(ke(e)?e.cols:1),o=a/(ke(e)?e.rows:1);return{...e,w:r,h:o,height_m:e.height_m*(o/e.h)}},hn=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),sa=1.3,oa=.35,aa=.001,ra=40,dn=120,un=110,ia=900,la=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),ca=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),dt=["mid","fg","near"],ha=16/9,da=.92;function ua(e,t,n,s){const{cam:a,t:r}=Nn(e,s),o=Hn(a,r,Un(e)),i=K[t.depth],l=i-o.z;if(l<=.5)return null;const p=me(t,s),d=(p.x-.5)*fe(i),x=Math.tan(o.fov/2),b=(d-o.x)/(l*x*ha),v=-tt*Math.PI/180,g=Math.tan(Math.atan2(n*p.scale-o.y,l)-v)/x;return Math.abs(b)>da?null:{x:(b+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const fa={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},fn=new Set(["large","small","tall","long","short","fallen"]),pa=new Set(["tree","shrub"]),_t=e=>e.charAt(0).toUpperCase()+e.slice(1),ma=(e,t)=>fa[e]?.[t?1:0]??e;function ga(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const a=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!a.length)return"";const r=a.length>1&&pa.has(a[0])?a.slice(1):a,o=r.filter(l=>fn.has(l)),i=r.filter(l=>!fn.has(l));return _t([...o,...i].map(l=>ma(l,n)).join(" "))}const pn=e=>_t(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),es=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ve(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),a=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&es(s);if(a)return pn(a);if(e.figure)return pn(e.figure);if(s)return ga(s,n);const r=Array.isArray(e.need)?e.need[0]:e.need;return r?_t(String(r)):""}function xa(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const va=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function ya(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>va.has(t))?"leaf":"photo"}const Ie=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?es(e):null,mn=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Ee(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:mn(e,"pose:")??t?.[1]??null,facing:mn(e,"facing:")??(t?.[2]?"left":"right")}}const ts=e=>e.find(t=>Ee(t).pose==="stand"&&Ee(t).facing==="right")??e[0];function ns(e){const t=new Map,n=[];for(const s of e??[]){const a=Ie(s);if(!a){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(a)){const o={id:`series:${a}`,asset:s,series:a,count:0,members:[]};t.set(a,o),n.push(o)}const r=t.get(a);r.members=[...r.members,s],r.count=r.members.length}return n.map(s=>s.series?{...s,asset:ts(s.members)}:s)}const wa=(e,t)=>{const n=Ie(t);return n?(e??[]).filter(s=>Ie(s)===n):t?[t]:[]},ba=e=>ns(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function ka(e,t,n){const s=(e??[]).filter(o=>Ie(o)===n);if(!s.length)return null;const a=Ee(t),r=(o,i)=>s.find(l=>Ee(l).pose===o&&Ee(l).facing===i);return r(a.pose,a.facing)??r("stand",a.facing)??ts(s)}const Ma=24;function Sa(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const a=new Image;a.onload=()=>{try{const r=document.createElement("canvas");r.width=a.naturalWidth,r.height=a.naturalHeight;const o=r.getContext("2d",{willReadFrequently:!0});o.drawImage(a,0,0),t.set(s,{w:r.width,h:r.height,data:o.getImageData(0,0,r.width,r.height).data})}catch{t.set(s,"failed")}},a.onerror=()=>t.set(s,"failed"),a.src=e+s};return{prime(s){s.forEach(a=>a?.file&&n(a.file))},opaque(s,a,r,o){const i=t.get(s?.file);if(!i||typeof i=="string")return s?.file&&n(s.file),!0;const l=s.kind==="animation"?Math.max(1,s.cols??1):1,p=s.kind==="animation"?Math.max(1,s.rows??1):1,d=i.w/l,x=i.h/p,b=Math.min(d-1,Math.max(0,Math.floor(a*d))),v=Math.min(x-1,Math.max(0,Math.floor(r*x)));return(Number.isInteger(o)?[[Math.floor(o/l)%p,o%l]]:Array.from({length:p*l},(c,y)=>[Math.floor(y/l),y%l])).some(([c,y])=>i.data[(Math.floor(c*x+v)*i.w+Math.floor(y*d+b))*4+3]>Ma)}}}const Q={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,Cn],[80,Lt]]},Ea=e=>e<=12?1:e<=40?5:20,Aa=e=>Ea(e)/4;function gn(e,t=0){const n=typeof t=="function"?t:()=>t,s=p=>[e.origin[0]+p*e.dir[0],e.origin[2]+p*e.dir[2]],a=p=>e.origin[1]+p*e.dir[1]-(Q.z+n(s(p)[1]));if(!(e.dir[2]>0))return null;const r=(Lt*Fa-e.origin[2])/e.dir[2],o=Math.sign(a(0));if(o===0)return Ut(Q,s(0));let i=0,l=null;for(let p=1;p<=xn;p++){const d=r*p/xn;if(Math.sign(a(d))!==o){l=d;break}i=d}if(l===null)return null;for(let p=0;p<Ta;p++){const d=(i+l)/2;Math.sign(a(d))===o?i=d:l=d}return Ut(Q,s(l))}const Fa=4,xn=400,Ta=30;function Tt(e){const t=Aa(gt(Q,e)[1]);return gt(Q,xs(e,t))}const zt=(e,t)=>[(e-.5)*fe(t),t],Je=([e,t])=>({x:Math.round((.5+e/fe(t))*1e4)/1e4,z:t});function Ot([e,t],n,s=[0,0]){const a=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*a,n]}function za([e,t],n,s=[0,0]){const[[,a],[,r]]=Q.cells,o=Math.max(.1,t-s[1]),i=Math.min(r,Math.max(a,s[1]+o/Math.max(.01,n)));return gt(Q,Ot([e,t],i,s))}const La=[[Cn,12,2],[12,40,10],[40,Lt,40]],Da=20;function _a(){return La.flatMap(([e,t,n],s)=>{const a=n*Da,r=[];let o=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const l={...Q,cells:[[-a,o],[a,i]]},p=vs(l,n,Math.max(1,Math.round(i-o))).filter(d=>d[0][0]!==d[d.length-1][0]?d[0][1]===i:i>o);r.push({z:i,lines:p.map(d=>d.map(x=>ys(Q,x).slice(0,2)))}),o=i}return r})}const vn=-1,yn=2;function Oa({canvas:e,host:t,stage:n,valueOf:s,alpha:a,onChange:r,onGround:o=()=>!1,byDistance:i=()=>!1,groundUnder:l=()=>null,footY:p=()=>0,eye:d=()=>[0,0],onSettled:x=()=>{},onEmpty:b=()=>!1}){let v=null,g=null,c=!1;const y="#38bdf8",k=document.createElement("div");k.dataset.stage25dSelection="",k.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${y};z-index:3;`;const C=document.createElement("div");C.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${y};pointer-events:none;`,k.appendChild(C);const w=document.createElement("div");w.dataset.rotateHandle="1",w.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",k.appendChild(w);const W=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([M,A])=>{const z=document.createElement("div");return z.dataset.scaleHandle="1",z.style.cssText=gs(M,A),k.appendChild(z),z});t.appendChild(k),n()?.setGrid?.(_a(),Pa(t,"--color-neutral"));const G=document.createElement("div");G.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(G);const E=M=>{const A=oe();if(!A||M===null){G.style.display="none";return}const z=t.getBoundingClientRect(),_=e.getBoundingClientRect();Object.assign(G.style,{display:"block",left:`${A.left+A.width/2+_.left-z.left}px`,top:`${A.top+A.height+_.top-z.top}px`}),G.textContent=`${s(M,"z").toFixed(2)} m`},O=M=>{const A=e.getBoundingClientRect();return{x:M.clientX-A.left,y:M.clientY-A.top}},V=(M,A)=>n()?.pickLayers(M,A).find(z=>a.opaque(z.asset,z.u,z.v,z.index))??null,H=(M,A)=>{v=M,A&&M!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${M}`}})),P()},oe=()=>{const M=v===null?null:n()?.layerBox(v);if(!M)return null;const A=e.getBoundingClientRect();return{left:M.x0*A.width,top:M.y0*A.height,width:(M.x1-M.x0)*A.width,height:(M.y1-M.y0)*A.height,z:M.z}},P=()=>{const M=oe();if(!M){k.style.display="none";return}const A=e.getBoundingClientRect(),z=t.getBoundingClientRect();Object.assign(k.style,{display:"block",left:`${M.left+A.left-z.left}px`,top:`${M.top+A.top-z.top}px`,width:`${M.width}px`,height:`${M.height}px`})},R=(M,A,z)=>Math.min(z,Math.max(A,M)),ne=M=>{if(M.button!==0)return;const{x:A,y:z}=O(M),_=V(A,z);if(!_){b(A,z)&&M.stopPropagation();return}M.stopPropagation(),H(_.index,!0);const X=n().layerBox(_.index),ee=o(_.index),q=oe();g={mode:"move",index:_.index,z:X.z,from:n().worldXAt(A,z,X.z),x0:s(_.index,"x"),id:M.pointerId,el:e,ground:ee,start:[A,z],foot:q?[q.left+q.width/2,q.top+q.height]:[A,z],lift:ee?p(_.index):0},e.setPointerCapture?.(M.pointerId)},ae=M=>A=>{if(A.button!==0||v===null)return;const z=oe();if(!z)return;A.stopPropagation(),A.preventDefault();const _=e.getBoundingClientRect(),X=z.left+z.width/2,ee=z.top+z.height/2,{x:q,y:Ve}={x:A.clientX-_.left,y:A.clientY-_.top};g={mode:M,index:v,cx:X,cy:ee,id:A.pointerId,el:A.currentTarget,d0:Math.max(8,Math.hypot(q-X,Ve-ee)),a0:Math.atan2(Ve-ee,q-X),scale0:s(v,"scale"),rotation0:s(v,"rotation"),byDistance:M==="scale"&&i(v),p0:zt(s(v,"x"),s(v,"z")),eye:d()},A.currentTarget.setPointerCapture?.(A.pointerId)},se=M=>{const{x:A,y:z}=O(M);if(g?.mode==="move"&&g.ground){const _=l(g.foot[0]+A-g.start[0],g.foot[1]+z-g.start[1],g.lift,g.index);if(!_)return;const X=Je(Tt(_));r(g.index,"x",R(X.x,vn,yn)),r(g.index,"z",X.z),E(g.index);return}if(g?.mode==="move"){const _=(n().worldXAt(A,z,g.z)-g.from)/fe(g.z);r(g.index,"x",Math.round(R(g.x0+_,vn,yn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const _=Math.hypot(A-g.cx,z-g.cy)/g.d0*g.scale0,X=Tt(za(g.p0,_,g.eye))[1],ee=Je(Ot(g.p0,X,g.eye));g.scale0!==1&&r(g.index,"scale",1),r(g.index,"x",ee.x),r(g.index,"z",ee.z),E(g.index);return}if(g?.mode==="scale"){const _=Math.hypot(A-g.cx,z-g.cy);r(g.index,"scale",Math.round(R(g.scale0*(_/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let _=g.rotation0+(Math.atan2(z-g.cy,A-g.cx)-g.a0)*180/Math.PI;M.shiftKey&&(_=Math.round(_/15)*15),r(g.index,"rotation",Math.round(_*10)/10);return}c||(c=!0,requestAnimationFrame(()=>{c=!1,e.style.cursor=V(A,z)?"pointer":""}))},le=()=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const M=g.index,A=g.mode==="move"&&g.ground||g.byDistance;g=null,G.style.display="none",A&&x(M)},j=M=>{v!==null&&M.detail?.id!==`s25_layer-${v}`&&(v=null,P())};e.addEventListener("pointerdown",ne);for(const M of[e,...W,w])M.addEventListener("pointermove",se),M.addEventListener("pointerup",le),M.addEventListener("pointercancel",le);return W.forEach(M=>M.addEventListener("pointerdown",ae("scale"))),w.addEventListener("pointerdown",ae("rotate")),window.addEventListener("scene-object-selected",j),{select:(M,A=!1)=>H(M,A),get selected(){return v},place:P,destroy(){window.removeEventListener("scene-object-selected",j),k.remove(),n()?.setGrid?.(null),G.remove()}}}function Pa(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const Pt=["x","y","z","scale","rotation","opacity","keys","figure","play"],J=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},ut=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Pt.includes(t))),wn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...a}=e?.set??{};return JSON.stringify({...e,set:{...a,layers:t.map(ut),groundBands:n.map(ut),skyLayer:ut(s)}})},ft=e=>Pt.map(t=>e?.[t]??null),pt=e=>JSON.stringify([(e?.set?.layers??[]).map(ft),(e?.set?.groundBands??[]).map(ft),ft(e?.set?.skyLayer)]),Ca={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},bn=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch"],Ra=e=>ke(e)?"vfx":e.layer,kn=e=>ke(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,Mn="application/x-lp-stage25d",Ye=new Map,mt=new Map,Ba=e=>(mt.has(e)||mt.set(e,Sa(e)),mt.get(e));function Ia(e){return Ye.has(e)||Ye.set(e,po(ms(e)).catch(t=>{throw Ye.delete(e),t})),Ye.get(e)}const Va=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function Xa(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,a=null,r=null,o=null,i=new Map,l=new Map,p=0,d=null,x=0,b=0,v=performance.now(),g=!1,c=[],y=[],k={},C=new Set,w=null,F=null;const W=h=>ke(h)?null:F.base+"thumbs/"+h.file;let G=null,E=null,O={},V=null,H=0;const oe=()=>{s.engine.runRenderLoop(()=>{const h=performance.now();b+=Math.min(.1,(h-v)/1e3),v=h,s.tick(h),a&&s.pose(a,j(),b),s.scene.render(),V?.place()})},P=()=>{if(!a||!s)return;const h=(u,f)=>C.has(f)?{...u,opacity:0,keys:[]}:u;a={...a,set:{...a.set,groundBands:y.map((u,f)=>h(u,`band-${f}`)),skyLayer:k,layers:c.map((u,f)=>h(u,`layer-${f}`))}},s.rebind(a)},R=h=>{const u=/^band-(\d+)$/.exec(String(h??""));return u&&y[Number(u[1])]?Number(u[1]):-1},ne=h=>h==="sky"?o?.set?.sky?{...k,depth:"sky"}:null:R(h)>=0?{...y[R(h)],depth:"bg"}:c[J(h)]??null,ae=(h,u)=>{let f=null;if(h==="sky"&&o?.set?.sky){if(u.motion===void 0)return null;k={...k,motion:u.motion},f={skyLayer:{motion:u.motion}}}else if(R(h)>=0){const m=R(h);y=y.map((S,T)=>T===m?{...S,...u}:S),f={band:{index:m,...u}}}else if(c[J(h)]){const m=J(h);c=c.map((S,T)=>T===m?{...S,...u}:S),f=m}return f===null?null:(w=pt({set:{layers:c,groundBands:y,skyLayer:k}}),P(),f)},se=()=>({...o.set,layers:c,groundBands:y,skyLayer:k}),le=(h,u)=>{const f=ae(h,u);f===null||D.sceneId==null||(typeof f=="number"?t.onCommit?.(f,u,D.sceneId):t.onCommit?.(0,f,D.sceneId))},j=()=>d?d():p,M=()=>o?.set?.sky&&F?i.get(o.set.sky)??_e(F,{asset:o.set.sky},"sky"):null,A=h=>{const u=i.get(c[h]?.asset);return!!(c[h]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&c[h].depth!=="sky")},z=h=>h==="sky"||R(h)>=0,_=(h,u)=>{const f=s?.pickBackdrops?.(h,u).find(S=>G.opaque(S.asset,S.u,S.v)),m=f?f.band!==void 0?`band-${f.band}`:`layer-${f.index}`:o?.set?.sky?"sky":null;return m&&D.select(m),!!m},X=(h,u)=>ye(u)||In(h,u),ee=h=>{const u=i.get(c[h]?.asset);return!!u&&X(c[h],u)},q=h=>me(c[h],j()).z??K[c[h].depth],Ve=h=>A(h)&&!(c[h].keys??[]).some(u=>u.scale!==void 0),Ct=h=>Math.round(h*1e3)/1e3,Rt=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],D={canvas:n,sceneId:null,async show(h){const u=await Ia(h.bundle);if(g)return;s||(s=new na(n,u),oe()),O={...h.look??{}},s.setLook(O);const f=Va(h);await s.build(f,u),a=f,c=f.set.layers,y=(f.set.groundBands??[]).map(m=>({...m})),k={...f.set.skyLayer??{}},C=new Set,w=pt(h),o=h,i=new Map(u.assets.map(m=>[m.id,m])),F=u,G=Ba(u.base),G.prime(f.set.layers.map(m=>i.get(m.asset)).filter(Boolean)),t.editable&&!V&&(n.style.pointerEvents="auto",window.addEventListener("scene-object-selected",m=>{m.detail?.id!==`s25_${E}`&&(E=null)}),n.addEventListener("dragover",m=>{m.dataTransfer?.types?.includes(Mn)&&(m.preventDefault(),m.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",m=>{const S=m.dataTransfer?.getData(Mn);if(!S)return;m.preventDefault();const T=n.getBoundingClientRect();D.addLayer(S,{x:m.clientX-T.left,y:m.clientY-T.top})}),n.addEventListener("dblclick",()=>{const m=E??(V?.selected!=null?`layer-${V.selected}`:null),S=m&&D.editTarget(m);S&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:S}))}),V=Oa({canvas:n,host:e,stage:()=>s,alpha:{opaque:(m,S,T,B)=>G.opaque(m,S,T,ke(m)?Xn(m,c[B]?.play,j()):void 0)},valueOf:(m,S)=>S==="z"?q(m):me(c[m],j())[S],onGround:A,byDistance:Ve,groundUnder:(m,S,T,B)=>gn(s.pointerRay(m,S),ee(B)?T:L=>s.groundHeightAt(L)+T),footY:m=>s.layerFootY(m)-(ee(m)?0:s.groundHeightAt(q(m))),eye:Rt,onSettled:m=>D.settleBand(m),onEmpty:(m,S)=>_(m,S),onChange:(m,S,T)=>D.moveLayer(`layer-${m}`,S,T)})),(V?.selected??-1)>=c.length&&V.select(null),l=new Map(u.assets.map(m=>[m.id,m.height_m??1.7])),x=Number(h.narration_at_s)||0,r=wn(h),e.dataset.stage25dReady="1"},editTarget(h){const u=h==="sky"?o?.set?.sky?k:null:R(h)>=0?y[R(h)]:c[J(h)],f=h==="sky"?M():i.get(u?.asset);return!u||!f||!F?null:{id:`s25_${h}`,title:D.items().find(m=>m.id===h)?.label??ve({},f,(document.documentElement.lang||"en").slice(0,2)),original:F.base+f.file,state:u.edit_state??null,edited:!!u.src,el:e}},matches:h=>r===wn(h),adopt(h){const u=pt(h);if(u===w)return!1;w=u;const f=(m,S)=>{const T={...m};for(const B of Pt)S?.[B]===void 0?delete T[B]:T[B]=S[B];return T};return c=c.map((m,S)=>f(m,h.set?.layers?.[S])),y=y.map((m,S)=>f(m,h.set?.groundBands?.[S])),k=f(k,h.set?.skyLayer),o=h,P(),!0},setLayerProp(h,u,f){ae(h,{[u]:f})},setLayerKeys(h,u){const f=ne(h);f&&JSON.stringify(f.keys??[])!==JSON.stringify(u)&&ae(h,{keys:u})},commitLayerProp(h,u,f){le(h,{[u]:f})},readLayerProp(h,u){const f=ne(h),m=f?u==="z"&&J(h)>=0?q(J(h)):u==="z"?me(f,j()).z??f.z:me(f,j())[u]:null;return Number.isFinite(m)?m:null},setHidden(h,u){J(h)<0&&R(h)<0||(C=new Set(u?[...C,h]:[...C].filter(f=>f!==h)),P())},update(h){d=null,p=Math.max(0,h)},play(h){d=()=>x+h()},moveLayer(h,u,f){window.__timelineKeying?.edit?.(`s25:${h}`,u,f,{flush:!1})||D.commitLayerProp(h,u,f)},select(h){E=z(h)?h:null,V?.select(J(h)>=0?J(h):null,!E),E&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${E}`}}))},get skySelected(){return E==="sky"},get backdrop(){return E},get selection(){return V?.selected??null},clearSelection(){V?.select(null)},atStart(){return p===0&&d===null&&C.size===0},layerInfo(h){const u=(L,Z)=>{const ce=typeof L.motion=="string"?{kind:L.motion}:L.motion??{};return{kind:ce.kind??$n(Z),amount:ce.amount??1,speed:ce.speed??1}};if(h==="sky"){const L=M();return L?{id:h,asset:L.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:ve({},L,(document.documentElement.lang||"en").slice(0,2)),file:k.src??`${F.base}${L.file}`,motion:u(k,L)}:null}if(R(h)>=0){const L=y[R(h)],Z=i.get(L.asset);return{id:h,asset:L.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:D.items().find(ce=>ce.id===h)?.label??"",file:L.src??(Z?`${F.base}${Z.file}`:null),motion:u(L,Z)}}const f=c[J(h)];if(!f)return null;const m=i.get(f.asset)??null,S=A(J(h)),T=!S||(f.scale??1)!==1||(f.keys??[]).some(L=>L.scale!==void 0),B=m?.layer==="bg"&&!m.tileable_x;return{id:h,asset:f.asset??null,depth:f.depth,figure:f.figure??null,role:m?.layer??null,ground:S,showScale:T,fields:S?["x","z",...T?["scale"]:[],"rotation","opacity"]:["x",...B?["z"]:[],"y","scale","rotation","opacity"],label:D.items().find(L=>L.id===h)?.label??ve(f,m,(document.documentElement.lang||"en").slice(0,2)),file:f.src??(m?`${F.base}${m.file}`:null),motion:u(f,m),anim:kn(m),play:{speed:f.play?.speed??1,offset:f.play?.offset??0}}},setLayerPlay(h,u){const f=ne(h);f&&le(h,{play:{...f.play??{},...u}})},setLayerMotion(h,u){const f=ne(h);f&&le(h,{motion:{...typeof f.motion=="object"?f.motion:{kind:f.motion},...u}})},reorderLayers(h,u,f){if(!A(u)){f(h,u,D.sceneId,null,null,null);return}const m=ge=>c[ge]?.z??K[c[ge]?.depth],S=h.filter(ge=>ge===u||A(ge)),T=S.indexOf(u),B=S[T-1],L=S[T+1],Z=q(u),ce=B===void 0?0:m(B),nt=L===void 0?1/0:m(L);if((B!==void 0||L!==void 0)&&(Z<ce||Z>nt)){const ge=zt(me(c[u],j()).x,Z),ss=B===void 0?nt/1.25:L===void 0?ce*1.25:(ce+nt)/2,Ue=Math.round(Math.min(Q.cells[1][1],Math.max(Q.cells[0][1],ss))*100)/100,st=Rt(),os=(Ue-st[1])/Math.max(.1,Z-st[1]),Bt=re=>Ct(Math.min(20,Math.max(.01,re*os))),as=c[u].keys?.some(re=>re.z!==void 0||re.scale!==void 0)?c[u].keys.map(re=>({...re,...re.z!==void 0&&{z:Math.min(Q.cells[1][1],Math.max(Q.cells[0][1],Ct(re.z+Ue-Z)))},...re.scale!==void 0&&{scale:Bt(re.scale)}})):null;f(h,u,D.sceneId,Je(Ot(ge,Ue,st)).x,Ue,Bt(c[u].scale??1),as);return}f(h,u,D.sceneId,c[u].x??.5,m(u),c[u].scale??1)},library(){if(!F)return null;const h=(document.documentElement.lang||"en").slice(0,2);return{bundle:F.bundle,assets:F.assets.map(u=>({id:u.id,layer:u.layer,shelf:Ra(u),anim:kn(u),band:Kt(u),tags:u.tags??[],url:F.base+u.file,thumb:W(u),label:ve({},u,h)}))}},tiles:h=>ns(h),seriesOfLayer(h){const u=i.get(c[J(h)]?.asset),f=Ie(u);if(!f||!F)return null;const m=(document.documentElement.lang||"en").slice(0,2),S=T=>({id:T.id,url:F.base+T.file,thumb:W(T),...Ee(T)});return{series:f,asset:u.id,members:wa(F.assets,u).map(S),characters:ba(F.assets).map(T=>({series:T.series,url:F.base+T.asset.file,thumb:W(T.asset),label:ve({},T.asset,m)}))}},async switchCharacter(h,u){const f=i.get(c[J(h)]?.asset),m=f&&F?ka(F.assets,f,u):null;m&&await D.swapAsset(h,m.id)},async swapAsset(h,u){if(h==="sky"){if(i.get(u)?.layer!=="sky"||M()?.id===u)return;await D.show({...o,set:{...se(),sky:u}}),D.sceneId!=null&&t.onCommit?.(0,{sky:u},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const f=y[R(h)];if(f){const S=i.get(u);if(!S||!Kt(S)||f.asset===u)return;const T=Number(h.slice(5)),B=y.map((L,Z)=>Z===T?{...L,asset:u}:L);await D.show({...o,set:{...se(),groundBands:B}}),D.sceneId!=null&&t.onCommit?.(0,{band:{index:T,asset:u}},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),D.select(h);return}const m=J(h);m<0||!c[m]||!i.has(u)||c[m].asset===u||(c=c.map((S,T)=>T===m?{...S,asset:u}:S),await D.show({...o,set:se()}),t.onCommit?.(m,{asset:u},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(h,u=null){const f=i.get(h);if(!f)return;const m=["mid","fg","near","bg","sky"].includes(f.layer)?f.layer:f.layer==="figure"?"fg":"mid",S=u?0:c.filter(B=>B.asset===h).length;let T={asset:h,depth:m,x:.5+.08*(S%5),scale:1};if(!(f.tileable_x||f.layer==="bg"||f.layer==="sky")){const B=u&&s?gn(s.pointerRay(u.x,u.y),X({},f)?0:Z=>s.groundHeightAt(Z)):null,L=Je(Tt(B??zt(T.x,K[m])));T={...T,...L,depth:Yt(L.z)}}c=[...c,T],await D.show({...o,set:se()}),t.onCommit?.(c.length-1,{add:T},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),V?.select(c.length-1,!0)},async settleBand(h){const u=c[h];if(!u||!A(h))return;const f=Yt(q(h));if(f===u.depth)return;c=c.map((S,T)=>T===h?{...S,depth:f}:S);const m=C;await D.show({...o,set:se()}),C=m,P(),D.sceneId!=null&&t.onCommit?.(h,{depth:f},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),V?.select(h,!1)},lookControls(){return bn.map(h=>{const[u,f,m]=$o[h]??[0,1,.01];return{key:h,min:u,max:f,step:m,value:he({...Ft,...O},h)}})},setLook(h,u){!bn.includes(h)||!Number.isFinite(u)||!s||(O={...O,[h]:u},s.setLook(O),t.onLook?.(h,u,D.sceneId))},async still(h=480){if(!s||!a||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const f=document.createElement("canvas");return f.width=h,f.height=Math.max(1,Math.round(h*n.height/n.width)),f.getContext("2d").drawImage(n,0,0,f.width,f.height),f.toDataURL("image/jpeg",.72)};return s.engine.resize(),H++,s.gridHidden=!0,new Promise(f=>{let m=0;const S=L=>{s.engine.onEndFrameObservable.remove(T),clearTimeout(B),s.gridHidden=--H>0,f(L)},T=s.engine.onEndFrameObservable.add(()=>{++m>=6&&S(u())}),B=setTimeout(()=>S(null),4e3)})},get config(){return o},figureBox(h){const u=c.find(T=>T.figure===h);if(!u?.asset)return null;const f=ua(a,u,l.get(u.asset)??1.7,j());if(!f)return null;const m=n.getBoundingClientRect(),S=m.width*.05;return new DOMRect(m.left+f.x*m.width-S/2,m.top+f.y*m.height,S,m.height*.08)},items:()=>{const h=(document.documentElement.lang||"en").slice(0,2),u=xa([...c.map((f,m)=>ve(f,i.get(f.asset),h)||`layer ${m+1}`),...y.map(f=>ve({},i.get(f.asset)??{id:f.asset},h))]);return[...c.map((f,m)=>({id:`layer-${m}`,label:u[m],icon:ya(i.get(f.asset)),depth:f.depth,z:f.z??K[f.depth],keys:f.keys??[]})),...y.map((f,m)=>({id:`band-${m}`,label:u[c.length+m],icon:"photo",depth:"bg",z:f.z,keys:f.keys??[],backdrop:!0})),...o?.set?.sky?[{id:"sky",label:Ca[h]??"Sky",icon:"cloud",depth:"sky",keys:k.keys??[],backdrop:!0}]:[],{id:"camera",label:"Camera",depth:null,keys:[]}]},destroy(){g=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}V?.destroy(),n.remove()}};return D}export{Mn as DROP_TYPE,bn as LOOK_KEYS,Xa as createStage25d,Va as stageScene};
