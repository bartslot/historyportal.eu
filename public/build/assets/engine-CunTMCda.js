import{m as rs,c as is,M as Qe,S as et,R as Sn,C as we,T as de,V,E as ie,a as En,b as Se,P as ls,d as It,e as Vt,f as cs,g as hs,h as ds,i as An,U as us,H as fs,D as ps}from"./babylon-Cg6WFYBR.js";import{l as ms}from"./config-qjtb2AOJ.js";import{handleCss as gs}from"./ArtworkOverlay-s55PSW60.js";import{g as gt,c as xs,w as Ut,h as vs,e as ys}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-fhY1XOus.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-BZ2EENzm.js";import"./ambient-CEzLlAaX.js";const Pe=new Set;let xt=!1;function ws(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;Pe.size&&Pe.clear();let r=Fn(e,0,o,n,!0);const a=[];if(!r||r.next===r.prev)return a;let i=0,l=0,f=0;if(s&&(r=Es(e,t,r,n)),e.length>80*n){i=e[0],l=e[1];let h=i,v=l;for(let k=n;k<o;k+=n){const y=e[k],g=e[k+1];y<i&&(i=y),g<l&&(l=g),y>h&&(h=y),g>v&&(v=g)}f=Math.max(h-i,v-l),f=f!==0?32767/f:0}return vt(r,a,i,l,f),a}function Fn(e,t,n,s,o){let r=null;if(o===Is(e,t,n,s)>0)for(let a=t;a<n;a+=s)r=$t(a/s|0,e[a],e[a+1],r);else for(let a=n-s;a>=t;a-=s)r=$t(a/s|0,e[a],e[a+1],r);return r&&Ce(r,r.next)&&(Be(r),r=r.next),r}function be(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&(Pe.size===0||!Pe.has(s))&&(Ce(s,s.next)||$(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),xt=!0,Be(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function vt(e,t,n,s,o){o&&Ds(e,n,s,o);let r=e,a=!1;for(;e.prev!==e.next;){const i=e.prev,l=e.next;if($(i,e,l)<0&&(o?ks(e,n,s,o):bs(e))){t.push(i.i,e.i,l.i),Be(e),e=l,r=l;continue}if(e=l,e===r){if(xt=!1,e=be(e),xt){r=e;continue}if(!a){e=Ms(e,t),r=e,a=!0;continue}Ss(e,t,n,s,o);break}}}function bs(e){const t=e.prev,n=e,s=e.next,o=t.x,r=n.x,a=s.x,i=t.y,l=n.y,f=s.y,h=Math.min(o,r,a),v=Math.min(i,l,f),k=Math.max(o,r,a),y=Math.max(i,l,f);let g=s.next;for(;g!==t;){if(g.x>=h&&g.x<=k&&g.y>=v&&g.y<=y&&!(o===g.x&&i===g.y)&&Ke(o,i,r,l,a,f,g.x,g.y)&&$(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function ks(e,t,n,s){const o=e.prev,r=e,a=e.next,i=o.x,l=r.x,f=a.x,h=o.y,v=r.y,k=a.y,y=Math.min(i,l,f),g=Math.min(h,v,k),x=Math.max(i,l,f),p=Math.max(h,v,k),b=kt(y,g,t,n,s),z=kt(x,p,t,n,s);let w=e.prevZ;for(;w&&w.z>=b;){if(w.x>=y&&w.x<=x&&w.y>=g&&w.y<=p&&w!==a&&!(i===w.x&&h===w.y)&&Ke(i,h,l,v,f,k,w.x,w.y)&&$(w.prev,w,w.next)>=0)return!1;w=w.prevZ}let F=e.nextZ;for(;F&&F.z<=z;){if(F.x>=y&&F.x<=x&&F.y>=g&&F.y<=p&&F!==a&&!(i===F.x&&h===F.y)&&Ke(i,h,l,v,f,k,F.x,F.y)&&$(F.prev,F,F.next)>=0)return!1;F=F.nextZ}return!0}function Ms(e,t){let n=e,s=!1;do{const o=n.prev,r=n.next.next;Ln(o,n,n.next,r,!1)&&Re(o,r)&&Re(r,o)&&(t.push(o.i,n.i,r.i),Be(n),Be(n.next),n=e=r,s=!0),n=n.next}while(n!==e);return s?be(n):n}function Ss(e,t,n,s,o){let r=e;do{let a=r.next.next;for(;a!==r.prev;){if(r.i!==a.i&&Cs(r,a)){let i=_n(r,a);r=be(r,r.next),i=be(i,i.next),vt(r,t,n,s,o),vt(i,t,n,s,o);return}a=a.next}r=r.next}while(r!==e)}let yt=!1;function Es(e,t,n,s){const o=[];for(let r=0,a=t.length;r<a;r++){const i=t[r]*s,l=r<a-1?t[r+1]*s:e.length,f=Fn(e,i,l,s,!1);f===f.next&&Pe.add(f),o.push(Ps(f))}o.sort(As),Ts(e.length/s,t.length),zn(n,n),yt=!0;for(let r=0;r<o.length;r++)n=Fs(o[r],n);return yt=!1,be(n)}function As(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function Fs(e,t){const n=Ls(e,t);if(!n)return t;const s=_n(n,e),o=s.next;return zn(n,o.next),be(s,s.next),be(n,n.next)}const Tn=16;let N=new Float64Array(0),Ze=0;const wt=[],bt=[];function Ts(e,t){const n=Math.ceil((e+2*t)/Tn)+t+2;N.length<n*4&&(N=new Float64Array(n*4)),Ze=0}function zn(e,t){let n=e;do{const s=Ze++;wt[s]=n;let o=1/0,r=1/0,a=-1/0,i=-1/0,l=0;do{const h=n.next;n.z=s,n.x<o&&(o=n.x),n.x>a&&(a=n.x),n.y<r&&(r=n.y),n.y>i&&(i=n.y),h.x<o&&(o=h.x),h.x>a&&(a=h.x),h.y<r&&(r=h.y),h.y>i&&(i=h.y),n=h}while(++l<Tn&&n!==t);bt[s]=n;const f=s*4;N[f]=o,N[f+1]=r,N[f+2]=a,N[f+3]=i}while(n!==t)}function zs(e,t){const n=e.z*4;t.x<N[n]&&(N[n]=t.x),t.y<N[n+1]&&(N[n+1]=t.y),t.x>N[n+2]&&(N[n+2]=t.x),t.y>N[n+3]&&(N[n+3]=t.y)}function Nt(e){let t=bt[e];for(;t.prev.next!==t;)t=t.next;return bt[e]=t,t}function Ht(e){let t=wt[e];for(;t.prev.next!==t;)t=t.next;return wt[e]=t,t}function Ls(e,t){let n=t;const s=e.x,o=e.y;let r=-1/0,a;if(Ce(e,n))return n;for(let k=0,y=0;k<Ze;k++,y+=4){if(o<N[y+1]||o>N[y+3]||N[y]>s||N[y+2]<=r)continue;const g=Nt(k);n=Ht(k);do{if(n.prev.next===n){if(Ce(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const x=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(x<=s&&x>r&&(r=x,a=n.x<n.next.x?n:n.next,x===s))return a}}n=n.next}while(n!==g)}if(!a)return null;const i=a.x,l=a.y,f=Math.min(o,l),h=Math.max(o,l);let v=1/0;for(let k=0,y=0;k<Ze;k++,y+=4){if(N[y+2]<i||N[y]>s||N[y+3]<f||N[y+1]>h)continue;const g=Nt(k);n=Ht(k);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&Ke(o<l?s:r,o,i,l,o<l?r:s,o,n.x,n.y)){const x=Math.abs(o-n.y)/(s-n.x);(Re(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(x<v||x===v&&(n.x>a.x||n.x===a.x&&_s(a,n)))&&(a=n,v=x)}n=n.next}while(n!==g)}return a}function _s(e,t){return $(e.prev,e,t.prev)<0&&$(t.next,e,e.next)<0}const te=[];let Ae=[],xe=new Uint32Array(0),Fe=new Uint32Array(0);const Te=new Uint32Array(256);function Ds(e,t,n,s){let o=e,r=0;do o.z=kt(o.x,o.y,t,n,s),te[r++]=o,o=o.next;while(o!==e);Os(r);let a=null;for(let i=0;i<r;i++){const l=te[i];l.prevZ=a,a&&(a.nextZ=l),a=l}a.nextZ=null}function Os(e){if(e<=32){for(let t=1;t<e;t++){const n=te[t],s=n.z;let o=t-1;for(;o>=0&&te[o].z>s;)te[o+1]=te[o],o--;te[o+1]=n}return}xe.length<e&&(xe=new Uint32Array(e),Fe=new Uint32Array(e),Ae=new Array(e));for(let t=0;t<e;t++)xe[t]=te[t].z;Ne(e,te,xe,Ae,Fe,0),Ne(e,Ae,Fe,te,xe,8),Ne(e,te,xe,Ae,Fe,16),Ne(e,Ae,Fe,te,xe,24)}function Ne(e,t,n,s,o,r){Te.fill(0);for(let i=0;i<e;i++)Te[n[i]>>>r&255]++;let a=0;for(let i=0;i<256;i++){const l=Te[i];Te[i]=a,a+=l}for(let i=0;i<e;i++){const l=n[i],f=Te[l>>>r&255]++;s[f]=t[i],o[f]=l}}function kt(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function Ps(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function Ke(e,t,n,s,o,r,a,i){return(o-a)*(t-i)>=(e-a)*(r-i)&&(e-a)*(s-i)>=(n-a)*(t-i)&&(n-a)*(r-i)>=(o-a)*(s-i)}function Cs(e,t){const n=Ce(e,t)&&$(e.prev,e,e.next)>0&&$(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Re(e,t)&&Re(t,e)&&($(e.prev,e,t.prev)!==0||$(e,t.prev,t)!==0))&&!Rs(e,t)&&(n||Bs(e,t))}function $(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Ce(e,t){return e.x===t.x&&e.y===t.y}function Ln(e,t,n,s,o=!0){const r=$(e,t,n),a=$(e,t,s),i=$(n,s,e),l=$(n,s,t);return(r>0&&a<0||r<0&&a>0)&&(i>0&&l<0||i<0&&l>0)?!0:o?!!(r===0&&He(e,n,t)||a===0&&He(e,s,t)||i===0&&He(n,e,s)||l===0&&He(n,t,s)):!1}function He(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Rs(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),r=Math.max(e.y,t.y);let a=e;do{const i=a.next;if(a.x>s&&i.x>s||a.x<n&&i.x<n||a.y>r&&i.y>r||a.y<o&&i.y<o){a=i;continue}if(a.i!==e.i&&i.i!==e.i&&a.i!==t.i&&i.i!==t.i&&Ln(a,i,e,t))return!0;a=i}while(a!==e);return!1}function Re(e,t){return $(e.prev,e,e.next)<0?$(e,t,e.next)>=0&&$(e,e.prev,t)>=0:$(e,t,e.prev)<0||$(e,e.next,t)<0}function Bs(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,r=(e.y+t.y)/2;do{const a=n.next;n.y>r!=a.y>r&&o<(a.x-n.x)*(r-n.y)/(a.y-n.y)+n.x&&(s=!s),n=a}while(n!==e);return s}function _n(e,t){const n=Mt(e.i,e.x,e.y),s=Mt(t.i,t.x,t.y),o=e.next,r=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,r.next=s,s.prev=r,s}function $t(e,t,n,s){const o=Mt(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function Be(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),yt&&zs(e.prev,e.next)}function Mt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function Is(e,t,n,s){let o=0;for(let r=t,a=n-s;r<n;r+=s)o+=(e[a]-e[r])*(e[r+1]+e[a+1]),a=r;return o}Object.assign(window,{BABYLON:{...is,...rs},earcut:ws});(()=>{const e=`
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
    }`})();const Vs=new WeakMap;function Us(e){return Vs.get(e)?.rtt??null}const Ns=450,Wt=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],Gt=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],jt={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},Hs={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function $s(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),r=e.enableGeometryBufferRenderer(),a=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(w=>w.name!=="sky-cloud"&&!(w.metadata&&w.metadata.noGBuffer)))}),i=r.getGBuffer().textures,l=i[r.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],f=i[r.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=w=>new BABYLON.Vector2(1/w.width,1/w.height),v=new BABYLON.Matrix,k=["invView","tanHalf","resolution","skyDepth"],y=["depthSampler","normalSampler"];function g(w,F){t.getViewMatrix().invertToRef(v);const W=Math.tan(t.fov/2);w.setMatrix("invView",v),w.setVector2("tanHalf",new BABYLON.Vector2(W*F.width/F.height,W)),w.setVector2("resolution",new BABYLON.Vector2(F.width,F.height)),w.setFloat("skyDepth",Ns),w.setTexture("depthSampler",l),w.setTexture("normalSampler",f)}const x=new BABYLON.PostProcess("wash","wash",["texel","radius",...k],y,1,t);x.onApply=w=>{g(w,x),w.setVector2("texel",h(x)),w.setFloat("radius",n.num("wash"))};const p=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...Wt,...k],["aquarelSampler",...y],1,t);p.onApply=w=>{g(w,p),w.setVector2("texel",h(p));const F=n.texture();w.setFloat("useTex",F?1:0),w.setTexture("aquarelSampler",F||s),Wt.forEach(W=>w.setFloat(W,n.num(W)))};const b=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...Gt,...k],["washSampler","animeSampler",...y],1,t);b.onApply=w=>{g(w,b),w.setTextureFromPostProcessOutput("washSampler",x),w.setTexture("animeSampler",Us(e)||o),w.setVector2("texel",h(b)),Gt.forEach(F=>w.setFloat(F,n.num(F))),w.setColor3("inkColor",BABYLON.Color3.FromArray(jt[n.inkColor()]||jt["blue-grey"]))};const z=[x,p,b];return{dispose(){z.forEach(w=>w.dispose(t)),e.onBeforeRenderObservable.remove(a),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const K={sky:380,bg:70,mid:22,fg:7,near:3.5},C={x:0,y:1.6,z:0,fov:50},tt=-2,Dn=16/9,On=.42,ot=1.6,Ws=3,Pn=e=>Ws*fe(e),Gs=(e,t)=>t*e,js=(e,t,n,s)=>Gs(e,t)-(1-s)*n,Xe=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Ys=999,Zs=1e3,Ks=.02,Cn=2,Lt=120,Rn=.05,ue=e=>e>Math.PI?e*Math.PI/180:e,fe=(e,t=C.fov,n=Dn)=>2*e*Math.tan(ue(t)/2)*n;function Yt(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const Zt=e=>e.z??K[e.depth],Xs=e=>Math.min(1,Math.max(0,(e-K.mid)/(K.bg-K.mid)));function St(e,t){return e<=K.bg||t===0?Xs(e)*t:C.y+(t-C.y)*e/K.bg}const qs=(e,t)=>t?e+t.h*(1-t.top):e,Js=["ground","path","field","ramp","water"],ye=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Js.includes(t)),Qs=2,Kt=e=>ye(e)&&e.w/Math.max(1,e.h)>=Qs,Bn=(e,t,n,s)=>Math.min(0,js(e,t,n,s)),Xt=[2,2e3],eo=4,to=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??C.z,n?.to?.z??C.z),C.z);function no(e,t,n,s,o,r,a=C.z){const i=me({...e},t),l=Math.min(Xt[1],Math.max(Xt[0],i.z??e.z)),f=Math.max(l,a+eo),h=Pn(f)/s,v=o*h*i.scale;return{z:f,h:v,w:s*h*Math.max(1,i.scale),sx:h*Math.max(1,i.scale),sy:h*i.scale,x:(i.x-.5)*fe(f),y:Bn(f,n,v,r),alphaIndex:Xe(l),opacity:i.opacity}}const In=(e,t)=>!!e.flat||t.layer==="ground";function ze(e,t,n,s=0,o=s){const r=t.depth,a=Zt(t)-n*Rn,i=fe(a),l=r==="sky"?n*2+1:Xe(a);if(e.layer==="sky"){const p=i*ot,b=p/Dn,z=-b*.12+(t.y??0);if(e.tileable_x)return{x:0,y:z,z:a,w:p,h:b,uRepeat:p/(b*(e.w/e.h)),alphaIndex:l,rotation:0};const w=Math.max(p/e.w,b/e.h);return{x:0,y:z,z:a,w:e.w*w,h:e.h*w,uRepeat:1,alphaIndex:l,rotation:0}}const f=e.layer==="bg"&&!e.tileable_x?i*ot*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),f),v=h*(e.w/e.h),k=e.tileable_x?Math.max(v,i*ot):v,y=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?r==="bg"?s:0:ye(e)?0:St(Zt(t),o),x=r==="sky"?a*Math.tan(ue(C.fov)/2)*.45:g;return{x:y,y:x+(t.y??0),z:a,w:k,h,uRepeat:e.tileable_x?k/v:1,alphaIndex:l,rotation:t.rotation??0}}function so(e,t,n=0,s=On,o=tt){const r=.5/Math.tan(ue(C.fov)/2),a=.5+r*Math.tan(-o*Math.PI/180),i=K.bg-n*Rn,l=C.y+(a-s)*i/r;return Math.round((l-t*(1-e))*10)/10}const $e=e=>e-oo,oo=.002,qt={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},Vn=(e,t)=>(qt[e??"inOut"]??qt.inOut)(Math.min(1,Math.max(0,t))),Le=(e,t,n)=>e+(t-e)*n,Un=e=>e.dur_s??(e.camera&&fo(e)||e.est_s||8);function Nn(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function Hn(e,t,n){if(!e)return{...C,fov:ue(C.fov)};const s=Vn(e.ease,n>0?t/(e.dur_s??n):1),o={...C,...e.from},r={...o,...e.to};return{x:Le(o.x,r.x,s),y:Le(o.y,r.y,s),z:Le(o.z,r.z,s),fov:Le(ue(o.fov),ue(r.fov),s)}}const ao=["x","y","z","scale","opacity","rotation"];function me(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const r of ao){const a=s.filter(k=>k[r]!==void 0).sort((k,y)=>k.t-y.t);if(!a.length)continue;const i=a[0],l=a[a.length-1];if(t<=i.t){o[r]=i[r];continue}if(t>=l.t){o[r]=l[r];continue}const f=a.findIndex(k=>k.t>t),h=a[f-1],v=a[f];o[r]=Le(h[r],v[r],Vn("inOut",(t-h.t)/(v.t-h.t)))}return o}const ro={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},$n=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function Jt(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??$n(e),amount:n.amount??1,speed:n.speed??1}}const io=.25,lo=2e3,co=250,Me={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},Qt={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function ho(e,t,n,s){const o=i=>{const l=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:l,lastUp:i===-1?n:e.lastUp,locked:e.locked||l>=Me.lockFlips&&i===1}};if(t<Me.downFps)return s?o(1):{...e,fast:0};if(t<Me.upFps)return{...e,fast:0};const r=e.fast+1;return e.notches>0&&!e.locked&&r>=Me.upWindows&&n-e.lastChange>=Me.upAfterChangeMs&&n-e.lastUp>=Me.upEveryMs?o(-1):{...e,fast:r}}function uo(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*io)}function fo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const en={breath_m:.05,breath_s:7},po=1.5;function mo(e,t,n={}){const s=n.breath_m??en.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??en.breath_s),r=Math.min(1,t/po),a=r*r*(3-2*r);return{...e,x:e.x+s*a*Math.sin(o*t),y:e.y+s*.5*a*Math.sin(2*o*t)}}async function go(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const xo=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function De(e,t,n){if(t.asset){const a=e.assets.find(i=>i.id===t.asset);if(a)return a}const s=xo(t.need??t.asset??"");if(!s.length)return null;let o=null,r=[0,0,0];for(const a of[...e.assets].sort((i,l)=>i.id.localeCompare(l.id))){const i=s.filter(f=>a.tags.some(h=>h.toLowerCase()===f)).length;if(!i)continue;const l=[i,n&&a.layer===n?1:0,a.qa?.score??0];(!o||l[0]>r[0]||l[0]===r[0]&&(l[1]>r[1]||l[1]===r[1]&&l[2]>r[2]))&&(o=a,r=l)}return o}const _e="#f6f5ee",vo=.22,yo=(e,t)=>e.layer==="bg"?t.feather??vo:0,at=.6,Wn=12;function wo(e,t){const n=t.paper??_e,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(a=>a.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((a,i)=>a.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const r=De({...t,assets:o},{asset:s},"ground");return r?{kind:"asset",asset:r}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function bo(e,t,n,s=.08){return Gn(e,t,n,1-s,1)}function Gn(e,t,n,s,o){const r=Math.max(0,Math.floor(n*s)),a=Math.min(n,Math.max(r+1,Math.ceil(n*o))),i=[[],[],[]],l=Math.max(1,Math.floor(t*(a-r)/2e4));for(let h=r*t;h<a*t;h+=l){const v=h*4;e[v+3]<200||(i[0].push(e[v]),i[1].push(e[v+1]),i[2].push(e[v+2]))}if(!i[0].length)return null;const f=h=>{const v=[...h].sort((k,y)=>k-y);return v[v.length>>1]/255};return[f(i[0]),f(i[1]),f(i[2])]}const Oe=32,ko=(e,t,n)=>Array.from({length:Oe},(s,o)=>Gn(e,t,n,o/Oe,(o+1)/Oe)),Mo=(e,t)=>e[Math.min(Oe-1,Math.max(0,Math.floor((1-t)*Oe)))]??null;function So(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let r=0;r<t*n;r+=o){const a=r*4;if(e[a+3]<230)continue;const i=(.299*e[a]+.587*e[a+1]+.114*e[a+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((r,a)=>r-a),s[s.length>>1])}function Eo(e,t,n){const s=[];for(let o=0;o<t;o++)for(let r=0;r<n;r++)if(e[(r*t+o)*4+3]>128){s.push(r/n);break}return s.length?(s.sort((o,r)=>o-r),s[s.length>>1]):0}function Ao(e,t,n){for(let s=0;s<n;s++){let o=0;for(let r=0;r<t;r++)e[(s*t+r)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const Fo=1.6,To=.12;function tn(e,t,n,s){const o=e.layer==="figure",r=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),a=r*To*s/Fo;return o?{w:r,d:Math.min(a,r*.5)}:{w:r,d:Math.min(Math.max(a,r*.3),r*3)}}const zo=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,We=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},_t=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,jn=_t;ie.ShadersStore.stageGroundVertexShader=`
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
  ${_t}
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
  ${_t}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const Lo=e=>e?de.WRAP_ADDRESSMODE:de.MIRROR_ADDRESSMODE;function _o(e){const t=Qe.CreateGround("ground",{width:2400,height:2400},e),n=new et("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tile","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","nearTex"],needAlphaBlending:!0}),s=new Sn(new Uint8Array([255,255,255,255]),1,1,we.TEXTUREFORMAT_RGBA,e);n.setTexture("tex",s).setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0);let o=Wn,r=1;return t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Ys,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(a){a.tex&&(a.tex.wrapU=de.WRAP_ADDRESSMODE,a.tex.wrapV=de.WRAP_ADDRESSMODE),n.setTexture("tex",a.tex??s),o=a.tile,n.setFloat("useTex",a.tex?1:0).setFloat("tile",o*r).setFloat("grain",a.grain).setFloat("fadeNear",a.fadeNear).setFloat("fadeFar",a.fadeFar).setVector3("base",V.FromArray(a.base)).setVector3("horizonTint",V.FromArray(a.tint))},follow(a){n.setVector3("camPos",a)},live(a){r=a.tileScale,n.setFloat("detail",a.detail).setFloat("vary",a.vary).setFloat("mixTile",a.mixTile).setFloat("tile",o*r)},near(a){n.setFloat("useNear",a?1:0),a&&(a.tex.wrapU=Lo(a.tileable),a.tex.wrapV=de.CLAMP_ADDRESSMODE,n.setTexture("nearTex",a.tex).setMatrix("nearVP",a.vp).setFloat("nearTop",a.top).setFloat("nearSpan",a.span))}}}let Do=0;function nn(e,t,n,s,o){const r=Qe.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(r.rotation.x=Math.PI/2,o){const[i,l]=o.dir,f=Math.hypot(i,l)||1;r.rotation.y=Math.atan2(i/f,l/f),r.position.set(i/f*o.length*.42,.015,l/f*o.length*.42)}else r.position.set(0,.02,-n*.18);r.parent=e;const a=new et(r.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return a.alphaMode=we.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,a.setFloat("seed",Do++*7.31%97).setFloat("opacity",0),r.material=a,r.metadata={noGBuffer:!0},r.isPickable=!1,{mesh:r,setOpacity:i=>{a.setFloat("opacity",i),r.isVisible=i>.001}}}ie.ShadersStore.stagePuffVertexShader=`
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
  }`;function Yn(e,t,n,s){const o=Qe.CreatePlane(e,{size:1},n),r=new et(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return r.alphaMode=we.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,o.material=r,o.billboardMode=En.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:r}}const Zn=9,Oo=9;function Po(e,t,n,s){const o=Array.from({length:Zn},(r,a)=>{const i=Yn(`smoke:${a}`,"stagePuff",e,s);return i.mat.setFloat("seed",a*3.7),i});return{update(r,a){o.forEach(({mesh:i,mat:l},f)=>{const h=Co(r,f),v=n*(.6+3.2*h);i.scaling.setAll(v),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(f*2.1+r*.3),t.y+n*(.4+7*h),t.z),l.setFloat("alpha",a*.7*Math.sin(Math.PI*h)),i.isVisible=a>.001})},dispose(){o.forEach(({mesh:r,mat:a})=>{a.dispose(),r.dispose()})}}}const Co=(e,t)=>((e/Oo+t/Zn)%1+1)%1,rt=40,sn=16;function Ro(e){const t=(e%rt+rt)%rt;return t<sn?t/sn:null}function Bo(e,t,n,s){const o=Array.from({length:6},(r,a)=>Yn(`bird:${a}`,"stageBird",e,s));return{update(r,a){const i=Ro(r),l=Math.round(2+a*4);o.forEach(({mesh:f,mat:h},v)=>{if(f.isVisible=a>.001&&i!==null&&v<l,!f.isVisible||i===null)return;const k=v*.025;f.position.set((i-k-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*i,t+v*1.5),f.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,a*2)).setFloat("flap",Math.sin(r*7+v*1.3))})},dispose(){o.forEach(({mesh:r,mat:a})=>{a.dispose(),r.dispose()})}}}const on=["fire","hearth","chimney","smoke"],Io=e=>e.id.split(/[-_]/).some(t=>on.includes(t))||e.tags.some(t=>on.includes(t.toLowerCase())),it=e=>e[0].toUpperCase()+e.slice(1),Vo=e=>({fade:`lineFade${it(e)}`,thin:`lineThin${it(e)}`,haze:`haze${it(e)}`}),qe={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:tt,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},Uo=[1.05,1,.9],No=[.88,.93,1.05],Ho=.35;function $o(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:Y(e,"edgeSoft"),footM:t==="standing"?Ho:0,grounding:t==="figure"?0:Y(e,"grounding"),grass:t==="figure"?0:Y(e,"grassOverlap"),light:o?0:Y(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?Y(e,"cloudDrift"):0,footTint:s}}const Kn=[.93,.86,.74],an=e=>({paper:Y(e,"sheetPaper"),grain:Y(e,"sheetGrain"),patches:Y(e,"sheetPatches"),wash:Y(e,"sheetWash"),washColour:Kn}),Wo={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01]},Go=Object.fromEntries(Object.keys(qe).map(e=>[e,Wo[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),he=(e,t)=>Y(e,t),Y=(e,t)=>{const n=Number(e[t]??qe[t]);return Number.isFinite(n)?n:qe[t]};function lt(e,t){const n=Vo(t);return{fade:Y(e,n.fade),thin:Y(e,n.thin),haze:Y(e,n.haze),brown:Y(e,"lineBrown"),ink:Y(e,"lineInk"),norm:Y(e,"lineNorm")}}const jo=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),ct=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),Ge=(e,t,n,s,o)=>{const r=s*(1080/o);return[n/Math.max(e*r,.001),1/Math.max(t*r,.001)]};function Yo(e,t,n){const s=new V(C.x,C.y,C.z),o=Se.RotationX(e*Math.PI/180),a=Se.LookAtLH(s,s.add(V.TransformNormal(new V(0,0,1),o)),V.TransformNormal(V.Up(),o)).multiply(Se.PerspectiveFovLH(ue(C.fov),t,.1,2e3));return{vp:a,top:V.TransformCoordinates(new V(0,0,n),a).y}}ie.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function Zo(e,t){const n=new ls("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",V.FromArray(Kn))},n}const ke=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,Ko=12;function Xn(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,r=((t?.offset??0)+n*o)*(e.fps??Ko),a=Math.floor(r+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,a)):(a%s+s)%s}function Xo(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const qo=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Jo=`
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
  ${qo}
  ${Jo}
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
  }`;const rn=new WeakMap,qn=new Map,Jn=new Map,Et=new Map,Qn=new Map,At=new Map;function je(e,t){const n=rn.get(t)??new Map;rn.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((r,a)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>a(new Error(`layer image ${e} did not load`)),i.onload=()=>{const l=document.createElement("canvas");l.width=i.naturalWidth,l.height=i.naturalHeight;const f=l.getContext("2d",{willReadFrequently:!0});f.drawImage(i,0,0);const h=f.getImageData(0,0,l.width,l.height).data,v=bo(h,l.width,l.height);v&&qn.set(e,v),At.set(e,ko(h,l.width,l.height)),Jn.set(e,Ao(h,l.width,l.height)),Et.set(e,Eo(h,l.width,l.height));const k=So(h,l.width,l.height);k!==null&&Qn.set(e,k);for(let g=0;g<h.length;g+=4){const x=h[g+3]/255;h[g]=Math.round(h[g]*x),h[g+1]=Math.round(h[g+1]*x),h[g+2]=Math.round(h[g+2]*x)}const y=new Sn(h,l.width,l.height,we.TEXTUREFORMAT_RGBA,t,!0,!1,de.TRILINEAR_SAMPLINGMODE);y.anisotropicFilteringLevel=8,y.wrapV=de.CLAMP_ADDRESSMODE,r(y)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const ht=24;function Qo(e,t,n,s,o){const[r,a]=t.anchor??[.5,1],i=[],l=[],f=[];for(let v=0;v<=ht;v++){const k=v/ht;for(const y of[0,1])i.push((y-r)*n,(a-k)*s,0),l.push(y,k);if(v<ht){const y=v*2;f.push(y,y+2,y+1,y+1,y+2,y+3)}}const h=new En(e,o);return Object.assign(new cs,{positions:i,uvs:l,indices:f}).applyToMesh(h),h}let ea=0;function ln(e,t,n,s,o,r){const a=Qo(`layer:${e.id}`,e,n,s,r),i=new et(`layer:${e.id}`,r,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?de.WRAP_ADDRESSMODE:de.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const l=ea++*2.39996%(Math.PI*2),f=e.anchor?.[1]??1;return i.setFloat("phase",l).setFloat("height",s*f).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new It(0,0,1,1)),a.material=i,a.metadata={noGBuffer:!0,painted:!0},a.isPickable=!1,{mesh:a,material:i,setMotion:h=>{i.setFloat("kind",ro[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),a.isVisible=h>.001},setLine:(h,v,k,y)=>{i.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new Vt(k[0],k[1])).setVector3("hazeTint",V.FromArray(y))},setPaper:(h,v)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",V.FromArray(h.washColour)).setVector2("grainUV",new Vt(v[0],v[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setCell:h=>{i.setVector4("cell",new It(h[0],h[1],h[2],h[3]))},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",V.FromArray(h.footTint)).setVector3("sunColour",V.FromArray(Uo)).setVector3("shadeColour",V.FromArray(No))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,v)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),v&&i.setVector3("featherTint",V.FromArray(v))}}}const Ft={...Hs["History Lines pencil"],paper:.35,granulation:.2,...qe},ta=new An(.937,.914,.863,1),na=.7,sa=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class oa{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new hs(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new ds(this.engine),this.scene.clearColor=ta,this.camera=new us("house",new V(0,1.6,0),this.scene),this.camera.rotation.set(tt*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new fs("sky",new V(0,1,0),this.scene).intensity=.7,new ps("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=_o(this.scene),this.ground.set(this.groundLook(null,null,n)),this.birds=Bo(this.scene,un,fe(un),ca),$s(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),Zo(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=We(_e);strip=null;nearTex=null;bands=[];smoke=[];birds;footTint=We(_e);nearAsset=null;hazeTint=We(_e);sceneLib;buildToken=0;look={...Ft};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=Qt;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return uo(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=Qt,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>co;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<lo)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const r=this.tier.notches;this.tier=ho(this.tier,o,t,this.scaleAt(r+1)<this.scaleAt(r)),this.tier.notches!==r&&this.fit()}setLook(t){this.look={...Ft,...t??{}}}groundPoint(t,n){const s=K[n];return new V((t-.5)*fe(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],r=[];t.set.sky&&r.push({layer:hn(t),order:0,index:-1});const a={sky:1};t.set.layers.forEach((E,P)=>{const U=E.depth;a[U]=a[U]??0,r.push({layer:E,order:a[U]++,index:P})});const i=[];await Promise.all(r.map(async({layer:E,order:P,index:U})=>{let H=De(n,E,E.depth);if(!H){i.push({need:E.need??E.asset,reason:"no match"});return}let oe;try{oe=await je(pe(n,H,E),this.scene)}catch{i.push({need:E.need??E.asset,reason:`file did not load: ${E.src??H.file}`});return}if(s!==this.buildToken)return;H=cn(H,E,oe);const R=ze(H,E,P),B=ln(H,oe,R.w,R.h,R.uRepeat,this.scene);B.mesh.position.set(R.x,R.y,R.z);const ne=In(E,H);B.mesh.alphaIndex=ne?Zs:R.alphaIndex,ne&&(B.mesh.rotation.x=Math.PI/2),B.mesh.isVisible=!1;let ae,se,le;if(dt.includes(E.depth)&&!H.tileable_x&&!ne&&!ye(H)){const j=tn(H,R.w,R.h,R.z);le=M=>tn(H,R.w,R.h,M).d/j.d,ae=nn(B.mesh,j.w,j.d,this.scene),ae.mesh.alphaIndex=$e(R.alphaIndex),se=nn(B.mesh,j.w,j.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:R.h*ha(this.sunDir)}),se.mesh.alphaIndex=$e(R.alphaIndex)}o.push({layer:E,index:U,builtScale:E.scale??1,builtZ:R.z,handle:B,asset:H,order:P,stain:ae,cast:se,stainDepth:le,ink:Qn.get(pe(n,H,E)),flat:ne,skyline:Et.get(pe(n,H,E))})}));const l=wo(t.set,n);let f=null,h=null;const v=zo(t.set.near,n),k=v?De(n,{asset:v}):null;if(t.set.near&&!k&&i.push({need:t.set.near,reason:"no near band"}),k)try{h=await je(n.base+k.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${k.file}`})}if(l.kind==="asset")try{f=await je(n.base+l.asset.file,this.scene)}catch{i.push({need:t.set.ground??"ground",reason:`file did not load: ${l.asset.file}`})}else l.reason&&i.push({need:t.set.ground,reason:l.reason});const y=o.filter(E=>E.asset.layer==="bg").sort((E,P)=>E.index-P.index)[0],g=y?{top:Jn.get(pe(n,y.asset,y.layer))??0,h:ze(y.asset,y.layer,y.order).h,order:y.order}:null,x=o.find(E=>E.index===-1),p=x&&ze(x.asset,x.layer,x.order),b=x&&p?Mo(At.get(pe(n,x.asset,x.layer))??[],(C.y-p.y)/p.h):null,z=y?qn.get(pe(n,y.asset,y.layer))??null:t.set.groundBands?.length?null:b,w=await this.loadBands(t,n),F=E=>E.forEach(P=>{P.stain?.mesh.material?.dispose(),P.cast?.mesh.material?.dispose(),P.handle.mesh.dispose(),P.handle.material.dispose()});if(s!==this.buildToken){F(o),w.forEach(E=>{E.handle.mesh.dispose(),E.handle.material.dispose()});return}F(this.built),this.bands.forEach(E=>{E.handle.mesh.dispose(),E.handle.material.dispose()}),this.bands=w,this.built=o,this.sceneLib=n;const W=l.kind==="asset"?(At.get(n.base+l.asset.file)??[]).filter(E=>!!E):[],G=this.groundLook(l.kind==="asset"?{tex:f,asset:l.asset}:null,z,n,l.kind==="paper"?l.colour:void 0);this.horizonTint=G.tint,this.strip=g,this.smoke.forEach(E=>E.dispose()),this.smoke=o.filter(E=>Io(E.asset)&&dt.includes(E.layer.depth)&&!E.flat).map(E=>{const P=ze(E.asset,E.layer,E.order);return Po(this.scene,new V(E.handle.mesh.position.x,P.h*.6,P.z),Math.min(Math.max(P.h*.8,.5),3),P.alphaIndex)}),this.footTint=W.length?da(W):G.base,this.nearTex=h,this.nearAsset=k,this.hazeTint=b??G.tint,this.ground.set(G),this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const r=We(o??s.paper??_e),a=n??r;return{tex:t?.tex??null,tile:t?.asset.height_m||Wn,base:sa(r,a,na),tint:a,fadeNear:K.fg,fadeFar:K.bg*.75,grain:t?.tex?.5:1}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:hn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=a=>this.built.some(i=>i.handle.mesh===a),o=[],r=[...this.scene.multiPick(t,n,s)??[]].sort((a,i)=>a.distance-i.distance);for(const a of r){const i=this.built.find(f=>f.handle.mesh===a.pickedMesh),l=a.getTextureCoordinates();!i||!l||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||ye(i.asset)&&(a.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:l.x,v:l.y})}return o}pickBackdrops(t,n){const s=a=>this.bands.find(i=>i.handle.mesh===a),o=a=>this.built.find(i=>i.handle.mesh===a&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,a=>!!s(a)||!!o(a))??[]].sort((a,i)=>a.distance-i.distance).flatMap(a=>{const i=a.getTextureCoordinates();if(!i)return[];const l=s(a.pickedMesh);if(l)return[{band:l.index,asset:l.asset,u:i.x,v:i.y}];const f=o(a.pickedMesh);return[{index:f.index,asset:f.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(f=>f.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),r=1/this.engine.getRenderHeight(),a=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(f=>V.Project(f,Se.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=a.map(f=>f.x*o),l=a.map(f=>f.y*r);return{x0:Math.min(...i),y0:Math.min(...l),x1:Math.max(...i),y1:Math.max(...l),z:n.handle.mesh.position.z}}groundHeightAt(t){return St(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?ye(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Se.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>ra*Math.min(1,Math.max(0,(dn-o)/(dn-la)));this.gridMeshes=n.pieces.map((o,r)=>{const a=o.lines.map(f=>f.map(([h,v])=>new V(h,St(v,t),v))),i=o.lines.map(f=>f.map(([,h])=>new An(n.rgb[0],n.rgb[1],n.rgb[2],s(h)))),l=Qe.CreateLineSystem(`grid-${r}`,{lines:a,colors:i,useVertexAlpha:!0},this.scene);return l.isPickable=!1,l.setEnabled(!this.gridOff),l.alphaIndex=Xe(o.z)+ia,l.material.depthFunction=we.ALWAYS,l.material.disableDepthWrite=!0,l}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,Se.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new V(.55,-1,-.3).normalize();depthLine(t){return{...lt(this.look,t),tint:this.hazeTint}}paper(){return an(this.look)}async loadBands(t,n){const s=[];for(const[o,r]of(t.set.groundBands??[]).entries()){const a=De(n,{asset:r.asset},"ground_band");if(!a){console.warn(`stage25d: ${t.id}: no ground band ${r.asset}`);continue}const i=await je(pe(n,a,r),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${r.src??a.file} did not load`);continue}const l=cn(a,r,i),f=Pn(r.z),h=f*l.h/l.w,v=ln(l,i,f,h,1,this.scene);v.material.depthFunction=we.ALWAYS,v.mesh.position.set(0,0,r.z),v.mesh.alphaIndex=Xe(r.z),s.push({handle:v,z:r.z,w:f,h,skyline:Et.get(pe(n,l,r))??.5,index:o,asset:l,band:r})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?so(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??On,he(this.look,"housePitch")):0}pose(t,n,s,o){const r=Nn(t,n),a=Hn(r.cam,r.t,Un(t)),i=o?mo(a,o.t,o):a;this.camera.position.set(i.x,i.y,i.z),this.camera.fov=i.fov;const l=he(this.look,"housePitch");this.camera.rotation.x=l*Math.PI/180,this.ground.follow(this.camera.position);const f=p=>he(this.look,p);this.ground.live({detail:f("groundDetail"),vary:f("groundVary"),mixTile:f("groundMix"),tileScale:f("groundScale")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Yo(l,this.engine.getAspectRatio(this.camera),f("nearFar")),span:aa,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),v=an(this.look),k=he(this.look,"bandHeight"),y=this.horizonOf(t),g=qs(y,this.strip);this.land=g,this.poseGrid(g);const x=to(t);this.bands.forEach(p=>{const b=no(p.band,n,k,p.w,p.h,p.skyline,x);p.z=b.z,p.handle.mesh.scaling.set(b.sx,b.sy,1),p.handle.mesh.position.set(b.x,b.y,b.z),p.handle.mesh.alphaIndex=b.alphaIndex;const z=ct(h,b.z-C.z,ue(C.fov));p.handle.setOpacity(b.opacity),p.handle.setBottomFade(Math.min(1,he(this.look,"bandFade")/b.h)),p.handle.setPaper(v,Ge(b.w,b.h,1,z,h)),p.handle.setLine(lt(this.look,"bg"),1,Ge(b.w,b.h,1,z,h),this.hazeTint),p.handle.setMotion(Jt(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.smoke.forEach(p=>p.update(s,he(this.look,"smoke"))),this.birds.update(s,he(this.look,"birds"));for(const p of this.built){const b=me(p.layer,n),z=ze(p.asset,{...p.layer,x:b.x,y:b.y,z:b.z,scale:1,rotation:b.rotation},p.order,y,g);p.handle.mesh.position.x=z.x;const w=p.asset.layer==="bg"&&!p.asset.tileable_x?(z.z-C.z)/Math.max(.1,p.builtZ-C.z):1;p.handle.mesh.position.y=p.flat?Ks:ye(p.asset)?Bn(z.z,k,z.h*b.scale,p.skyline??0)+z.y:C.y+(z.y-C.y)*w,p.handle.mesh.position.z!==z.z&&(p.handle.mesh.position.z=z.z,p.flat||(p.handle.mesh.alphaIndex=z.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=$e(z.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(z.z)),p.cast&&(p.cast.mesh.alphaIndex=$e(z.alphaIndex))),p.handle.mesh.rotation.z=-z.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(b.scale/p.builtScale*w),p.handle.setOpacity(b.opacity),p.handle.setFeather(yo(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-z.y)/(z.h*b.scale));const F=ct(h,z.z-i.z,this.camera.fov),W=lt(this.look,p.layer.depth);p.handle.setPaper(v,Ge(z.w*b.scale,z.h*b.scale,z.uRepeat,ct(1080,z.z-C.z,ue(C.fov)),1080)),p.handle.setLine(W,p.ink===void 0?1:jo(p.ink,W.ink,W.norm),Ge(z.w*b.scale,z.h*b.scale,z.uRepeat,F,h),this.hazeTint),p.stain?.setOpacity((p.layer.shadow??at)*b.opacity),p.cast?.setOpacity(he(this.look,"castShadow")*((p.layer.shadow??at)/at)*b.opacity);const G=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":dt.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive($o(this.look,G,this.sunDir.x,this.footTint)),p.handle.setMotion(Jt(p.asset,p.layer)),p.handle.material.setFloat("time",s),ke(p.asset)&&p.handle.setCell(Xo(p.asset,Xn(p.asset,p.layer.play,n)))}}}const pe=(e,t,n)=>n?.src??e.base+t.file,cn=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:o}=n.getSize(),r=s/(ke(e)?e.cols:1),a=o/(ke(e)?e.rows:1);return{...e,w:r,h:a,height_m:e.height_m*(a/e.h)}},hn=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),aa=1.3,ra=.35,ia=.001,la=40,dn=120,un=110,ca=900,ha=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),da=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),dt=["mid","fg","near"],ua=16/9,fa=.92;function pa(e,t,n,s){const{cam:o,t:r}=Nn(e,s),a=Hn(o,r,Un(e)),i=K[t.depth],l=i-a.z;if(l<=.5)return null;const f=me(t,s),h=(f.x-.5)*fe(i),v=Math.tan(a.fov/2),k=(h-a.x)/(l*v*ua),y=-tt*Math.PI/180,g=Math.tan(Math.atan2(n*f.scale-a.y,l)-y)/v;return Math.abs(k)>fa?null:{x:(k+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const ma={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},fn=new Set(["large","small","tall","long","short","fallen"]),ga=new Set(["tree","shrub"]),Dt=e=>e.charAt(0).toUpperCase()+e.slice(1),xa=(e,t)=>ma[e]?.[t?1:0]??e;function va(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const r=o.length>1&&ga.has(o[0])?o.slice(1):o,a=r.filter(l=>fn.has(l)),i=r.filter(l=>!fn.has(l));return Dt([...a,...i].map(l=>xa(l,n)).join(" "))}const pn=e=>Dt(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),es=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ve(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&es(s);if(o)return pn(o);if(e.figure)return pn(e.figure);if(s)return va(s,n);const r=Array.isArray(e.need)?e.need[0]:e.need;return r?Dt(String(r)):""}function ya(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const wa=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function ba(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>wa.has(t))?"leaf":"photo"}const Ie=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?es(e):null,mn=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Ee(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:mn(e,"pose:")??t?.[1]??null,facing:mn(e,"facing:")??(t?.[2]?"left":"right")}}const ts=e=>e.find(t=>Ee(t).pose==="stand"&&Ee(t).facing==="right")??e[0];function ns(e){const t=new Map,n=[];for(const s of e??[]){const o=Ie(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const a={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,a),n.push(a)}const r=t.get(o);r.members=[...r.members,s],r.count=r.members.length}return n.map(s=>s.series?{...s,asset:ts(s.members)}:s)}const ka=(e,t)=>{const n=Ie(t);return n?(e??[]).filter(s=>Ie(s)===n):t?[t]:[]},Ma=e=>ns(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function Sa(e,t,n){const s=(e??[]).filter(a=>Ie(a)===n);if(!s.length)return null;const o=Ee(t),r=(a,i)=>s.find(l=>Ee(l).pose===a&&Ee(l).facing===i);return r(o.pose,o.facing)??r("stand",o.facing)??ts(s)}const Ea=24;function Aa(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const o=new Image;o.onload=()=>{try{const r=document.createElement("canvas");r.width=o.naturalWidth,r.height=o.naturalHeight;const a=r.getContext("2d",{willReadFrequently:!0});a.drawImage(o,0,0),t.set(s,{w:r.width,h:r.height,data:a.getImageData(0,0,r.width,r.height).data})}catch{t.set(s,"failed")}},o.onerror=()=>t.set(s,"failed"),o.src=e+s};return{prime(s){s.forEach(o=>o?.file&&n(o.file))},opaque(s,o,r,a){const i=t.get(s?.file);if(!i||typeof i=="string")return s?.file&&n(s.file),!0;const l=s.kind==="animation"?Math.max(1,s.cols??1):1,f=s.kind==="animation"?Math.max(1,s.rows??1):1,h=i.w/l,v=i.h/f,k=Math.min(h-1,Math.max(0,Math.floor(o*h))),y=Math.min(v-1,Math.max(0,Math.floor(r*v)));return(Number.isInteger(a)?[[Math.floor(a/l)%f,a%l]]:Array.from({length:f*l},(x,p)=>[Math.floor(p/l),p%l])).some(([x,p])=>i.data[(Math.floor(x*v+y)*i.w+Math.floor(p*h+k))*4+3]>Ea)}}}const Q={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,Cn],[80,Lt]]},Fa=e=>e<=12?1:e<=40?5:20,Ta=e=>Fa(e)/4;function gn(e,t=0){const n=typeof t=="function"?t:()=>t,s=f=>[e.origin[0]+f*e.dir[0],e.origin[2]+f*e.dir[2]],o=f=>e.origin[1]+f*e.dir[1]-(Q.z+n(s(f)[1]));if(!(e.dir[2]>0))return null;const r=(Lt*za-e.origin[2])/e.dir[2],a=Math.sign(o(0));if(a===0)return Ut(Q,s(0));let i=0,l=null;for(let f=1;f<=xn;f++){const h=r*f/xn;if(Math.sign(o(h))!==a){l=h;break}i=h}if(l===null)return null;for(let f=0;f<La;f++){const h=(i+l)/2;Math.sign(o(h))===a?i=h:l=h}return Ut(Q,s(l))}const za=4,xn=400,La=30;function Tt(e){const t=Ta(gt(Q,e)[1]);return gt(Q,xs(e,t))}const zt=(e,t)=>[(e-.5)*fe(t),t],Je=([e,t])=>({x:Math.round((.5+e/fe(t))*1e4)/1e4,z:t});function Ot([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function _a([e,t],n,s=[0,0]){const[[,o],[,r]]=Q.cells,a=Math.max(.1,t-s[1]),i=Math.min(r,Math.max(o,s[1]+a/Math.max(.01,n)));return gt(Q,Ot([e,t],i,s))}const Da=[[Cn,12,2],[12,40,10],[40,Lt,40]],Oa=20;function Pa(){return Da.flatMap(([e,t,n],s)=>{const o=n*Oa,r=[];let a=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const l={...Q,cells:[[-o,a],[o,i]]},f=vs(l,n,Math.max(1,Math.round(i-a))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===i:i>a);r.push({z:i,lines:f.map(h=>h.map(v=>ys(Q,v).slice(0,2)))}),a=i}return r})}const vn=-1,yn=2;function Ca({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:r,onGround:a=()=>!1,byDistance:i=()=>!1,groundUnder:l=()=>null,footY:f=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:k=()=>!1}){let y=null,g=null,x=!1;const p="#38bdf8",b=document.createElement("div");b.dataset.stage25dSelection="",b.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${p};z-index:3;`;const z=document.createElement("div");z.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${p};pointer-events:none;`,b.appendChild(z);const w=document.createElement("div");w.dataset.rotateHandle="1",w.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",b.appendChild(w);const W=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([M,A])=>{const L=document.createElement("div");return L.dataset.scaleHandle="1",L.style.cssText=gs(M,A),b.appendChild(L),L});t.appendChild(b),n()?.setGrid?.(Pa(),Ra(t,"--color-neutral"));const G=document.createElement("div");G.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(G);const E=M=>{const A=oe();if(!A||M===null){G.style.display="none";return}const L=t.getBoundingClientRect(),O=e.getBoundingClientRect();Object.assign(G.style,{display:"block",left:`${A.left+A.width/2+O.left-L.left}px`,top:`${A.top+A.height+O.top-L.top}px`}),G.textContent=`${s(M,"z").toFixed(2)} m`},P=M=>{const A=e.getBoundingClientRect();return{x:M.clientX-A.left,y:M.clientY-A.top}},U=(M,A)=>n()?.pickLayers(M,A).find(L=>o.opaque(L.asset,L.u,L.v,L.index))??null,H=(M,A)=>{y=M,A&&M!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${M}`}})),R()},oe=()=>{const M=y===null?null:n()?.layerBox(y);if(!M)return null;const A=e.getBoundingClientRect();return{left:M.x0*A.width,top:M.y0*A.height,width:(M.x1-M.x0)*A.width,height:(M.y1-M.y0)*A.height,z:M.z}},R=()=>{const M=oe();if(!M){b.style.display="none";return}const A=e.getBoundingClientRect(),L=t.getBoundingClientRect();Object.assign(b.style,{display:"block",left:`${M.left+A.left-L.left}px`,top:`${M.top+A.top-L.top}px`,width:`${M.width}px`,height:`${M.height}px`})},B=(M,A,L)=>Math.min(L,Math.max(A,M)),ne=M=>{if(M.button!==0)return;const{x:A,y:L}=P(M),O=U(A,L);if(!O){k(A,L)&&M.stopPropagation();return}M.stopPropagation(),H(O.index,!0);const X=n().layerBox(O.index),ee=a(O.index),q=oe();g={mode:"move",index:O.index,z:X.z,from:n().worldXAt(A,L,X.z),x0:s(O.index,"x"),id:M.pointerId,el:e,ground:ee,start:[A,L],foot:q?[q.left+q.width/2,q.top+q.height]:[A,L],lift:ee?f(O.index):0},e.setPointerCapture?.(M.pointerId)},ae=M=>A=>{if(A.button!==0||y===null)return;const L=oe();if(!L)return;A.stopPropagation(),A.preventDefault();const O=e.getBoundingClientRect(),X=L.left+L.width/2,ee=L.top+L.height/2,{x:q,y:Ve}={x:A.clientX-O.left,y:A.clientY-O.top};g={mode:M,index:y,cx:X,cy:ee,id:A.pointerId,el:A.currentTarget,d0:Math.max(8,Math.hypot(q-X,Ve-ee)),a0:Math.atan2(Ve-ee,q-X),scale0:s(y,"scale"),rotation0:s(y,"rotation"),byDistance:M==="scale"&&i(y),p0:zt(s(y,"x"),s(y,"z")),eye:h()},A.currentTarget.setPointerCapture?.(A.pointerId)},se=M=>{const{x:A,y:L}=P(M);if(g?.mode==="move"&&g.ground){const O=l(g.foot[0]+A-g.start[0],g.foot[1]+L-g.start[1],g.lift,g.index);if(!O)return;const X=Je(Tt(O));r(g.index,"x",B(X.x,vn,yn)),r(g.index,"z",X.z),E(g.index);return}if(g?.mode==="move"){const O=(n().worldXAt(A,L,g.z)-g.from)/fe(g.z);r(g.index,"x",Math.round(B(g.x0+O,vn,yn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const O=Math.hypot(A-g.cx,L-g.cy)/g.d0*g.scale0,X=Tt(_a(g.p0,O,g.eye))[1],ee=Je(Ot(g.p0,X,g.eye));g.scale0!==1&&r(g.index,"scale",1),r(g.index,"x",ee.x),r(g.index,"z",ee.z),E(g.index);return}if(g?.mode==="scale"){const O=Math.hypot(A-g.cx,L-g.cy);r(g.index,"scale",Math.round(B(g.scale0*(O/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let O=g.rotation0+(Math.atan2(L-g.cy,A-g.cx)-g.a0)*180/Math.PI;M.shiftKey&&(O=Math.round(O/15)*15),r(g.index,"rotation",Math.round(O*10)/10);return}x||(x=!0,requestAnimationFrame(()=>{x=!1,e.style.cursor=U(A,L)?"pointer":""}))},le=()=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const M=g.index,A=g.mode==="move"&&g.ground||g.byDistance;g=null,G.style.display="none",A&&v(M)},j=M=>{y!==null&&M.detail?.id!==`s25_layer-${y}`&&(y=null,R())};e.addEventListener("pointerdown",ne);for(const M of[e,...W,w])M.addEventListener("pointermove",se),M.addEventListener("pointerup",le),M.addEventListener("pointercancel",le);return W.forEach(M=>M.addEventListener("pointerdown",ae("scale"))),w.addEventListener("pointerdown",ae("rotate")),window.addEventListener("scene-object-selected",j),{select:(M,A=!1)=>H(M,A),get selected(){return y},place:R,destroy(){window.removeEventListener("scene-object-selected",j),b.remove(),n()?.setGrid?.(null),G.remove()}}}function Ra(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const Pt=["x","y","z","scale","rotation","opacity","keys","figure","play"],J=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},ut=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Pt.includes(t))),wn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{};return JSON.stringify({...e,set:{...o,layers:t.map(ut),groundBands:n.map(ut),skyLayer:ut(s)}})},ft=e=>Pt.map(t=>e?.[t]??null),pt=e=>JSON.stringify([(e?.set?.layers??[]).map(ft),(e?.set?.groundBands??[]).map(ft),ft(e?.set?.skyLayer)]),Ba={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},bn=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch"],Ia=e=>ke(e)?"vfx":e.layer,kn=e=>ke(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,Mn="application/x-lp-stage25d",Ye=new Map,mt=new Map,Va=e=>(mt.has(e)||mt.set(e,Aa(e)),mt.get(e));function Ua(e){return Ye.has(e)||Ye.set(e,go(ms(e)).catch(t=>{throw Ye.delete(e),t})),Ye.get(e)}const Na=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function Ja(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,r=null,a=null,i=new Map,l=new Map,f=0,h=null,v=0,k=0,y=performance.now(),g=!1,x=[],p=[],b={},z=new Set,w=null,F=null;const W=c=>ke(c)?null:F.base+"thumbs/"+c.file;let G=null,E=null,P={},U=null,H=0;const oe=()=>{s.engine.runRenderLoop(()=>{const c=performance.now();k+=Math.min(.1,(c-y)/1e3),y=c,s.tick(c),o&&s.pose(o,j(),k),s.scene.render(),U?.place()})},R=()=>{if(!o||!s)return;const c=(d,u)=>z.has(u)?{...d,opacity:0,keys:[]}:d;o={...o,set:{...o.set,groundBands:p.map((d,u)=>c(d,`band-${u}`)),skyLayer:b,layers:x.map((d,u)=>c(d,`layer-${u}`))}},s.rebind(o)},B=c=>{const d=/^band-(\d+)$/.exec(String(c??""));return d&&p[Number(d[1])]?Number(d[1]):-1},ne=c=>c==="sky"?a?.set?.sky?{...b,depth:"sky"}:null:B(c)>=0?{...p[B(c)],depth:"bg"}:x[J(c)]??null,ae=(c,d)=>{let u=null;if(c==="sky"&&a?.set?.sky){if(d.motion===void 0)return null;b={...b,motion:d.motion},u={skyLayer:{motion:d.motion}}}else if(B(c)>=0){const m=B(c);p=p.map((S,T)=>T===m?{...S,...d}:S),u={band:{index:m,...d}}}else if(x[J(c)]){const m=J(c);x=x.map((S,T)=>T===m?{...S,...d}:S),u=m}return u===null?null:(w=pt({set:{layers:x,groundBands:p,skyLayer:b}}),R(),u)},se=()=>({...a.set,layers:x,groundBands:p,skyLayer:b}),le=(c,d)=>{const u=ae(c,d);u===null||D.sceneId==null||(typeof u=="number"?t.onCommit?.(u,d,D.sceneId):t.onCommit?.(0,u,D.sceneId))},j=()=>h?h():f,M=()=>a?.set?.sky&&F?i.get(a.set.sky)??De(F,{asset:a.set.sky},"sky"):null,A=c=>{const d=i.get(x[c]?.asset);return!!(x[c]&&d&&(!d.tileable_x||d.layer==="ground")&&d.layer!=="bg"&&d.layer!=="sky"&&x[c].depth!=="sky")},L=c=>c==="sky"||B(c)>=0,O=(c,d)=>{const u=s?.pickBackdrops?.(c,d).find(S=>G.opaque(S.asset,S.u,S.v)),m=u?u.band!==void 0?`band-${u.band}`:`layer-${u.index}`:a?.set?.sky?"sky":null;return m&&D.select(m),!!m},X=(c,d)=>ye(d)||In(c,d),ee=c=>{const d=i.get(x[c]?.asset);return!!d&&X(x[c],d)},q=c=>me(x[c],j()).z??K[x[c].depth],Ve=c=>A(c)&&!(x[c].keys??[]).some(d=>d.scale!==void 0),Ct=c=>Math.round(c*1e3)/1e3,Rt=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],D={canvas:n,sceneId:null,async show(c){const d=await Ua(c.bundle);if(g)return;s||(s=new oa(n,d),oe()),P={...c.look??{}},s.setLook(P);const u=Na(c);await s.build(u,d),o=u,x=u.set.layers,p=(u.set.groundBands??[]).map(m=>({...m})),b={...u.set.skyLayer??{}},z=new Set,w=pt(c),a=c,i=new Map(d.assets.map(m=>[m.id,m])),F=d,G=Va(d.base),G.prime(u.set.layers.map(m=>i.get(m.asset)).filter(Boolean)),t.editable&&!U&&(n.style.pointerEvents="auto",window.addEventListener("scene-object-selected",m=>{m.detail?.id!==`s25_${E}`&&(E=null)}),n.addEventListener("dragover",m=>{m.dataTransfer?.types?.includes(Mn)&&(m.preventDefault(),m.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",m=>{const S=m.dataTransfer?.getData(Mn);if(!S)return;m.preventDefault();const T=n.getBoundingClientRect();D.addLayer(S,{x:m.clientX-T.left,y:m.clientY-T.top})}),n.addEventListener("dblclick",()=>{const m=E??(U?.selected!=null?`layer-${U.selected}`:null),S=m&&D.editTarget(m);S&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:S}))}),U=Ca({canvas:n,host:e,stage:()=>s,alpha:{opaque:(m,S,T,I)=>G.opaque(m,S,T,ke(m)?Xn(m,x[I]?.play,j()):void 0)},valueOf:(m,S)=>S==="z"?q(m):me(x[m],j())[S],onGround:A,byDistance:Ve,groundUnder:(m,S,T,I)=>gn(s.pointerRay(m,S),ee(I)?T:_=>s.groundHeightAt(_)+T),footY:m=>s.layerFootY(m)-(ee(m)?0:s.groundHeightAt(q(m))),eye:Rt,onSettled:m=>D.settleBand(m),onEmpty:(m,S)=>O(m,S),onChange:(m,S,T)=>D.moveLayer(`layer-${m}`,S,T)})),(U?.selected??-1)>=x.length&&U.select(null),l=new Map(d.assets.map(m=>[m.id,m.height_m??1.7])),v=Number(c.narration_at_s)||0,r=wn(c),e.dataset.stage25dReady="1"},editTarget(c){const d=c==="sky"?a?.set?.sky?b:null:B(c)>=0?p[B(c)]:x[J(c)],u=c==="sky"?M():i.get(d?.asset);return!d||!u||!F?null:{id:`s25_${c}`,title:D.items().find(m=>m.id===c)?.label??ve({},u,(document.documentElement.lang||"en").slice(0,2)),original:F.base+u.file,state:d.edit_state??null,edited:!!d.src,el:e}},matches:c=>r===wn(c),adopt(c){const d=pt(c);if(d===w)return!1;w=d;const u=(m,S)=>{const T={...m};for(const I of Pt)S?.[I]===void 0?delete T[I]:T[I]=S[I];return T};return x=x.map((m,S)=>u(m,c.set?.layers?.[S])),p=p.map((m,S)=>u(m,c.set?.groundBands?.[S])),b=u(b,c.set?.skyLayer),a=c,R(),!0},setLayerProp(c,d,u){ae(c,{[d]:u})},setLayerKeys(c,d){const u=ne(c);u&&JSON.stringify(u.keys??[])!==JSON.stringify(d)&&ae(c,{keys:d})},commitLayerProp(c,d,u){le(c,{[d]:u})},readLayerProp(c,d){const u=ne(c),m=u?d==="z"&&J(c)>=0?q(J(c)):d==="z"?me(u,j()).z??u.z:me(u,j())[d]:null;return Number.isFinite(m)?m:null},setHidden(c,d){J(c)<0&&B(c)<0||(z=new Set(d?[...z,c]:[...z].filter(u=>u!==c)),R())},update(c){h=null,f=Math.max(0,c)},play(c){h=()=>v+c()},moveLayer(c,d,u){window.__timelineKeying?.edit?.(`s25:${c}`,d,u,{flush:!1})||D.commitLayerProp(c,d,u)},select(c){E=L(c)?c:null,U?.select(J(c)>=0?J(c):null,!E),E&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${E}`}}))},get skySelected(){return E==="sky"},get backdrop(){return E},get selection(){return U?.selected??null},clearSelection(){U?.select(null)},atStart(){return f===0&&h===null&&z.size===0},layerInfo(c){const d=(_,Z)=>{const ce=typeof _.motion=="string"?{kind:_.motion}:_.motion??{};return{kind:ce.kind??$n(Z),amount:ce.amount??1,speed:ce.speed??1}};if(c==="sky"){const _=M();return _?{id:c,asset:_.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:ve({},_,(document.documentElement.lang||"en").slice(0,2)),file:b.src??`${F.base}${_.file}`,motion:d(b,_)}:null}if(B(c)>=0){const _=p[B(c)],Z=i.get(_.asset);return{id:c,asset:_.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:D.items().find(ce=>ce.id===c)?.label??"",file:_.src??(Z?`${F.base}${Z.file}`:null),motion:d(_,Z)}}const u=x[J(c)];if(!u)return null;const m=i.get(u.asset)??null,S=A(J(c)),T=!S||(u.scale??1)!==1||(u.keys??[]).some(_=>_.scale!==void 0),I=m?.layer==="bg"&&!m.tileable_x;return{id:c,asset:u.asset??null,depth:u.depth,figure:u.figure??null,role:m?.layer??null,ground:S,showScale:T,fields:S?["x","z",...T?["scale"]:[],"rotation","opacity"]:["x",...I?["z"]:[],"y","scale","rotation","opacity"],label:D.items().find(_=>_.id===c)?.label??ve(u,m,(document.documentElement.lang||"en").slice(0,2)),file:u.src??(m?`${F.base}${m.file}`:null),motion:d(u,m),anim:kn(m),play:{speed:u.play?.speed??1,offset:u.play?.offset??0}}},setLayerPlay(c,d){const u=ne(c);u&&le(c,{play:{...u.play??{},...d}})},setLayerMotion(c,d){const u=ne(c);u&&le(c,{motion:{...typeof u.motion=="object"?u.motion:{kind:u.motion},...d}})},reorderLayers(c,d,u){if(!A(d)){u(c,d,D.sceneId,null,null,null);return}const m=ge=>x[ge]?.z??K[x[ge]?.depth],S=c.filter(ge=>ge===d||A(ge)),T=S.indexOf(d),I=S[T-1],_=S[T+1],Z=q(d),ce=I===void 0?0:m(I),nt=_===void 0?1/0:m(_);if((I!==void 0||_!==void 0)&&(Z<ce||Z>nt)){const ge=zt(me(x[d],j()).x,Z),ss=I===void 0?nt/1.25:_===void 0?ce*1.25:(ce+nt)/2,Ue=Math.round(Math.min(Q.cells[1][1],Math.max(Q.cells[0][1],ss))*100)/100,st=Rt(),os=(Ue-st[1])/Math.max(.1,Z-st[1]),Bt=re=>Ct(Math.min(20,Math.max(.01,re*os))),as=x[d].keys?.some(re=>re.z!==void 0||re.scale!==void 0)?x[d].keys.map(re=>({...re,...re.z!==void 0&&{z:Math.min(Q.cells[1][1],Math.max(Q.cells[0][1],Ct(re.z+Ue-Z)))},...re.scale!==void 0&&{scale:Bt(re.scale)}})):null;u(c,d,D.sceneId,Je(Ot(ge,Ue,st)).x,Ue,Bt(x[d].scale??1),as);return}u(c,d,D.sceneId,x[d].x??.5,m(d),x[d].scale??1)},library(){if(!F)return null;const c=(document.documentElement.lang||"en").slice(0,2);return{bundle:F.bundle,assets:F.assets.map(d=>({id:d.id,layer:d.layer,shelf:Ia(d),anim:kn(d),band:Kt(d),tags:d.tags??[],url:F.base+d.file,thumb:W(d),label:ve({},d,c)}))}},tiles:c=>ns(c),seriesOfLayer(c){const d=i.get(x[J(c)]?.asset),u=Ie(d);if(!u||!F)return null;const m=(document.documentElement.lang||"en").slice(0,2),S=T=>({id:T.id,url:F.base+T.file,thumb:W(T),...Ee(T)});return{series:u,asset:d.id,members:ka(F.assets,d).map(S),characters:Ma(F.assets).map(T=>({series:T.series,url:F.base+T.asset.file,thumb:W(T.asset),label:ve({},T.asset,m)}))}},async switchCharacter(c,d){const u=i.get(x[J(c)]?.asset),m=u&&F?Sa(F.assets,u,d):null;m&&await D.swapAsset(c,m.id)},async swapAsset(c,d){if(c==="sky"){if(i.get(d)?.layer!=="sky"||M()?.id===d)return;await D.show({...a,set:{...se(),sky:d}}),D.sceneId!=null&&t.onCommit?.(0,{sky:d},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const u=p[B(c)];if(u){const S=i.get(d);if(!S||!Kt(S)||u.asset===d)return;const T=Number(c.slice(5)),I=p.map((_,Z)=>Z===T?{..._,asset:d}:_);await D.show({...a,set:{...se(),groundBands:I}}),D.sceneId!=null&&t.onCommit?.(0,{band:{index:T,asset:d}},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),D.select(c);return}const m=J(c);m<0||!x[m]||!i.has(d)||x[m].asset===d||(x=x.map((S,T)=>T===m?{...S,asset:d}:S),await D.show({...a,set:se()}),t.onCommit?.(m,{asset:d},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(c,d=null){const u=i.get(c);if(!u)return;const m=["mid","fg","near","bg","sky"].includes(u.layer)?u.layer:u.layer==="figure"?"fg":"mid",S=d?0:x.filter(I=>I.asset===c).length;let T={asset:c,depth:m,x:.5+.08*(S%5),scale:1};if(!(u.tileable_x||u.layer==="bg"||u.layer==="sky")){const I=d&&s?gn(s.pointerRay(d.x,d.y),X({},u)?0:Z=>s.groundHeightAt(Z)):null,_=Je(Tt(I??zt(T.x,K[m])));T={...T,..._,depth:Yt(_.z)}}x=[...x,T],await D.show({...a,set:se()}),t.onCommit?.(x.length-1,{add:T},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),U?.select(x.length-1,!0)},async settleBand(c){const d=x[c];if(!d||!A(c))return;const u=Yt(q(c));if(u===d.depth)return;x=x.map((S,T)=>T===c?{...S,depth:u}:S);const m=z;await D.show({...a,set:se()}),z=m,R(),D.sceneId!=null&&t.onCommit?.(c,{depth:u},D.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),U?.select(c,!1)},lookControls(){return bn.map(c=>{const[d,u,m]=Go[c]??[0,1,.01];return{key:c,min:d,max:u,step:m,value:he({...Ft,...P},c)}})},setLook(c,d){!bn.includes(c)||!Number.isFinite(d)||!s||(P={...P,[c]:d},s.setLook(P),t.onLook?.(c,d,D.sceneId))},async still(c=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const d=()=>{const u=document.createElement("canvas");return u.width=c,u.height=Math.max(1,Math.round(c*n.height/n.width)),u.getContext("2d").drawImage(n,0,0,u.width,u.height),u.toDataURL("image/jpeg",.72)};return s.engine.resize(),H++,s.gridHidden=!0,new Promise(u=>{let m=0;const S=_=>{s.engine.onEndFrameObservable.remove(T),clearTimeout(I),s.gridHidden=--H>0,u(_)},T=s.engine.onEndFrameObservable.add(()=>{++m>=6&&S(d())}),I=setTimeout(()=>S(null),4e3)})},get config(){return a},figureBox(c){const d=x.find(T=>T.figure===c);if(!d?.asset)return null;const u=pa(o,d,l.get(d.asset)??1.7,j());if(!u)return null;const m=n.getBoundingClientRect(),S=m.width*.05;return new DOMRect(m.left+u.x*m.width-S/2,m.top+u.y*m.height,S,m.height*.08)},items:()=>{const c=(document.documentElement.lang||"en").slice(0,2),d=ya([...x.map((u,m)=>ve(u,i.get(u.asset),c)||`layer ${m+1}`),...p.map(u=>ve({},i.get(u.asset)??{id:u.asset},c))]);return[...x.map((u,m)=>({id:`layer-${m}`,label:d[m],icon:ba(i.get(u.asset)),depth:u.depth,z:u.z??K[u.depth],keys:u.keys??[]})),...p.map((u,m)=>({id:`band-${m}`,label:d[x.length+m],icon:"photo",depth:"bg",z:u.z,keys:u.keys??[],backdrop:!0})),...a?.set?.sky?[{id:"sky",label:Ba[c]??"Sky",icon:"cloud",depth:"sky",keys:b.keys??[],backdrop:!0}]:[],{id:"camera",label:"Camera",depth:null,keys:[]}]},destroy(){g=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}U?.destroy(),n.remove()}};return D}export{Mn as DROP_TYPE,bn as LOOK_KEYS,Ja as createStage25d,Na as stageScene};
