import{m as es,c as ts,M as Je,S as Qe,R as wn,C as we,T as he,V as C,E as re,a as bn,b as Me,P as ns,d as Ct,e as ss,f as os,g as as,h as kn,U as is,H as rs,D as ls}from"./babylon-DhBJWxKk.js";import{l as cs}from"./config-qjtb2AOJ.js";import{handleCss as hs}from"./ArtworkOverlay-HA3ADv2x.js";import{g as mt,c as ds,w as Bt,h as us,e as fs}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-fhY1XOus.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-CyYN8Rt4.js";import"./ambient-CEzLlAaX.js";const Pe=new Set;let gt=!1;function ps(e,t,n=2){const s=t&&t.length,a=s?t[0]*n:e.length;Pe.size&&Pe.clear();let i=Mn(e,0,a,n,!0);const o=[];if(!i||i.next===i.prev)return o;let r=0,l=0,p=0;if(s&&(i=ys(e,t,i,n)),e.length>80*n){r=e[0],l=e[1];let d=r,v=l;for(let k=n;k<a;k+=n){const x=e[k],m=e[k+1];x<r&&(r=x),m<l&&(l=m),x>d&&(d=x),m>v&&(v=m)}p=Math.max(d-r,v-l),p=p!==0?32767/p:0}return xt(i,o,r,l,p),o}function Mn(e,t,n,s,a){let i=null;if(a===_s(e,t,n,s)>0)for(let o=t;o<n;o+=s)i=Ut(o/s|0,e[o],e[o+1],i);else for(let o=n-s;o>=t;o-=s)i=Ut(o/s|0,e[o],e[o+1],i);return i&&Re(i,i.next)&&(Be(i),i=i.next),i}function be(e,t=e){const n=t===e;let s=e,a;do a=!1,s!==s.next&&(Pe.size===0||!Pe.has(s))&&(Re(s,s.next)||H(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),gt=!0,Be(s),s=s.prev,a=!0):(n||s!==t)&&(s=s.next,a=!n);while(a||s!==t);return t}function xt(e,t,n,s,a){a&&As(e,n,s,a);let i=e,o=!1;for(;e.prev!==e.next;){const r=e.prev,l=e.next;if(H(r,e,l)<0&&(a?gs(e,n,s,a):ms(e))){t.push(r.i,e.i,l.i),Be(e),e=l,i=l;continue}if(e=l,e===i){if(gt=!1,e=be(e),gt){i=e;continue}if(!o){e=xs(e,t),i=e,o=!0;continue}vs(e,t,n,s,a);break}}}function ms(e){const t=e.prev,n=e,s=e.next,a=t.x,i=n.x,o=s.x,r=t.y,l=n.y,p=s.y,d=Math.min(a,i,o),v=Math.min(r,l,p),k=Math.max(a,i,o),x=Math.max(r,l,p);let m=s.next;for(;m!==t;){if(m.x>=d&&m.x<=k&&m.y>=v&&m.y<=x&&!(a===m.x&&r===m.y)&&Ze(a,r,i,l,o,p,m.x,m.y)&&H(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function gs(e,t,n,s){const a=e.prev,i=e,o=e.next,r=a.x,l=i.x,p=o.x,d=a.y,v=i.y,k=o.y,x=Math.min(r,l,p),m=Math.min(d,v,k),c=Math.max(r,l,p),w=Math.max(d,v,k),b=bt(x,m,t,n,s),R=bt(c,w,t,n,s);let y=e.prevZ;for(;y&&y.z>=b;){if(y.x>=x&&y.x<=c&&y.y>=m&&y.y<=w&&y!==o&&!(r===y.x&&d===y.y)&&Ze(r,d,l,v,p,k,y.x,y.y)&&H(y.prev,y,y.next)>=0)return!1;y=y.prevZ}let A=e.nextZ;for(;A&&A.z<=R;){if(A.x>=x&&A.x<=c&&A.y>=m&&A.y<=w&&A!==o&&!(r===A.x&&d===A.y)&&Ze(r,d,l,v,p,k,A.x,A.y)&&H(A.prev,A,A.next)>=0)return!1;A=A.nextZ}return!0}function xs(e,t){let n=e,s=!1;do{const a=n.prev,i=n.next.next;An(a,n,n.next,i,!1)&&Ce(a,i)&&Ce(i,a)&&(t.push(a.i,n.i,i.i),Be(n),Be(n.next),n=e=i,s=!0),n=n.next}while(n!==e);return s?be(n):n}function vs(e,t,n,s,a){let i=e;do{let o=i.next.next;for(;o!==i.prev;){if(i.i!==o.i&&zs(i,o)){let r=Fn(i,o);i=be(i,i.next),r=be(r,r.next),xt(i,t,n,s,a),xt(r,t,n,s,a);return}o=o.next}i=i.next}while(i!==e)}let vt=!1;function ys(e,t,n,s){const a=[];for(let i=0,o=t.length;i<o;i++){const r=t[i]*s,l=i<o-1?t[i+1]*s:e.length,p=Mn(e,r,l,s,!1);p===p.next&&Pe.add(p),a.push(Ts(p))}a.sort(ws),ks(e.length/s,t.length),En(n,n),vt=!0;for(let i=0;i<a.length;i++)n=bs(a[i],n);return vt=!1,be(n)}function ws(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function bs(e,t){const n=Ss(e,t);if(!n)return t;const s=Fn(n,e),a=s.next;return En(n,a.next),be(s,s.next),be(n,n.next)}const Sn=16;let V=new Float64Array(0),Ye=0;const yt=[],wt=[];function ks(e,t){const n=Math.ceil((e+2*t)/Sn)+t+2;V.length<n*4&&(V=new Float64Array(n*4)),Ye=0}function En(e,t){let n=e;do{const s=Ye++;yt[s]=n;let a=1/0,i=1/0,o=-1/0,r=-1/0,l=0;do{const d=n.next;n.z=s,n.x<a&&(a=n.x),n.x>o&&(o=n.x),n.y<i&&(i=n.y),n.y>r&&(r=n.y),d.x<a&&(a=d.x),d.x>o&&(o=d.x),d.y<i&&(i=d.y),d.y>r&&(r=d.y),n=d}while(++l<Sn&&n!==t);wt[s]=n;const p=s*4;V[p]=a,V[p+1]=i,V[p+2]=o,V[p+3]=r}while(n!==t)}function Ms(e,t){const n=e.z*4;t.x<V[n]&&(V[n]=t.x),t.y<V[n+1]&&(V[n+1]=t.y),t.x>V[n+2]&&(V[n+2]=t.x),t.y>V[n+3]&&(V[n+3]=t.y)}function It(e){let t=wt[e];for(;t.prev.next!==t;)t=t.next;return wt[e]=t,t}function Vt(e){let t=yt[e];for(;t.prev.next!==t;)t=t.next;return yt[e]=t,t}function Ss(e,t){let n=t;const s=e.x,a=e.y;let i=-1/0,o;if(Re(e,n))return n;for(let k=0,x=0;k<Ye;k++,x+=4){if(a<V[x+1]||a>V[x+3]||V[x]>s||V[x+2]<=i)continue;const m=It(k);n=Vt(k);do{if(n.prev.next===n){if(Re(e,n.next))return n.next;if(a<=n.y&&a>=n.next.y&&n.next.y!==n.y){const c=n.x+(a-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(c<=s&&c>i&&(i=c,o=n.x<n.next.x?n:n.next,c===s))return o}}n=n.next}while(n!==m)}if(!o)return null;const r=o.x,l=o.y,p=Math.min(a,l),d=Math.max(a,l);let v=1/0;for(let k=0,x=0;k<Ye;k++,x+=4){if(V[x+2]<r||V[x]>s||V[x+3]<p||V[x+1]>d)continue;const m=It(k);n=Vt(k);do{if(n.prev.next===n&&s>=n.x&&n.x>=r&&s!==n.x&&Ze(a<l?s:i,a,r,l,a<l?i:s,a,n.x,n.y)){const c=Math.abs(a-n.y)/(s-n.x);(Ce(n,e)||n.y===a&&n.next.y===a&&n.next.x>s)&&(c<v||c===v&&(n.x>o.x||n.x===o.x&&Es(o,n)))&&(o=n,v=c)}n=n.next}while(n!==m)}return o}function Es(e,t){return H(e.prev,e,t.prev)<0&&H(t.next,e,e.next)<0}const ne=[];let Ae=[],xe=new Uint32Array(0),Fe=new Uint32Array(0);const Te=new Uint32Array(256);function As(e,t,n,s){let a=e,i=0;do a.z=bt(a.x,a.y,t,n,s),ne[i++]=a,a=a.next;while(a!==e);Fs(i);let o=null;for(let r=0;r<i;r++){const l=ne[r];l.prevZ=o,o&&(o.nextZ=l),o=l}o.nextZ=null}function Fs(e){if(e<=32){for(let t=1;t<e;t++){const n=ne[t],s=n.z;let a=t-1;for(;a>=0&&ne[a].z>s;)ne[a+1]=ne[a],a--;ne[a+1]=n}return}xe.length<e&&(xe=new Uint32Array(e),Fe=new Uint32Array(e),Ae=new Array(e));for(let t=0;t<e;t++)xe[t]=ne[t].z;Ue(e,ne,xe,Ae,Fe,0),Ue(e,Ae,Fe,ne,xe,8),Ue(e,ne,xe,Ae,Fe,16),Ue(e,Ae,Fe,ne,xe,24)}function Ue(e,t,n,s,a,i){Te.fill(0);for(let r=0;r<e;r++)Te[n[r]>>>i&255]++;let o=0;for(let r=0;r<256;r++){const l=Te[r];Te[r]=o,o+=l}for(let r=0;r<e;r++){const l=n[r],p=Te[l>>>i&255]++;s[p]=t[r],a[p]=l}}function bt(e,t,n,s,a){return e=(e-n)*a|0,t=(t-s)*a|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function Ts(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function Ze(e,t,n,s,a,i,o,r){return(a-o)*(t-r)>=(e-o)*(i-r)&&(e-o)*(s-r)>=(n-o)*(t-r)&&(n-o)*(i-r)>=(a-o)*(s-r)}function zs(e,t){const n=Re(e,t)&&H(e.prev,e,e.next)>0&&H(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Ce(e,t)&&Ce(t,e)&&(H(e.prev,e,t.prev)!==0||H(e,t.prev,t)!==0))&&!Ls(e,t)&&(n||Ds(e,t))}function H(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Re(e,t){return e.x===t.x&&e.y===t.y}function An(e,t,n,s,a=!0){const i=H(e,t,n),o=H(e,t,s),r=H(n,s,e),l=H(n,s,t);return(i>0&&o<0||i<0&&o>0)&&(r>0&&l<0||r<0&&l>0)?!0:a?!!(i===0&&Ne(e,n,t)||o===0&&Ne(e,s,t)||r===0&&Ne(n,e,s)||l===0&&Ne(n,t,s)):!1}function Ne(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Ls(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),a=Math.min(e.y,t.y),i=Math.max(e.y,t.y);let o=e;do{const r=o.next;if(o.x>s&&r.x>s||o.x<n&&r.x<n||o.y>i&&r.y>i||o.y<a&&r.y<a){o=r;continue}if(o.i!==e.i&&r.i!==e.i&&o.i!==t.i&&r.i!==t.i&&An(o,r,e,t))return!0;o=r}while(o!==e);return!1}function Ce(e,t){return H(e.prev,e,e.next)<0?H(e,t,e.next)>=0&&H(e,e.prev,t)>=0:H(e,t,e.prev)<0||H(e,e.next,t)<0}function Ds(e,t){let n=e,s=!1;const a=(e.x+t.x)/2,i=(e.y+t.y)/2;do{const o=n.next;n.y>i!=o.y>i&&a<(o.x-n.x)*(i-n.y)/(o.y-n.y)+n.x&&(s=!s),n=o}while(n!==e);return s}function Fn(e,t){const n=kt(e.i,e.x,e.y),s=kt(t.i,t.x,t.y),a=e.next,i=t.prev;return e.next=t,t.prev=e,n.next=a,a.prev=n,s.next=n,n.prev=s,i.next=s,s.prev=i,s}function Ut(e,t,n,s){const a=kt(e,t,n);return s?(a.next=s.next,a.prev=s,s.next.prev=a,s.next=a):(a.prev=a,a.next=a),a}function Be(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),vt&&Ms(e.prev,e.next)}function kt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function _s(e,t,n,s){let a=0;for(let i=t,o=n-s;i<n;i+=s)a+=(e[o]-e[i])*(e[i+1]+e[o+1]),o=i;return a}Object.assign(window,{BABYLON:{...ts,...es},earcut:ps});(()=>{const e=`
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
    }`})();const Os=new WeakMap;function Ps(e){return Os.get(e)?.rtt??null}const Rs=450,Nt=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],Ht=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],$t={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},Cs={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function Bs(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),i=e.enableGeometryBufferRenderer(),o=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(y=>y.name!=="sky-cloud"&&!(y.metadata&&y.metadata.noGBuffer)))}),r=i.getGBuffer().textures,l=r[i.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],p=r[i.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],d=y=>new BABYLON.Vector2(1/y.width,1/y.height),v=new BABYLON.Matrix,k=["invView","tanHalf","resolution","skyDepth"],x=["depthSampler","normalSampler"];function m(y,A){t.getViewMatrix().invertToRef(v);const $=Math.tan(t.fov/2);y.setMatrix("invView",v),y.setVector2("tanHalf",new BABYLON.Vector2($*A.width/A.height,$)),y.setVector2("resolution",new BABYLON.Vector2(A.width,A.height)),y.setFloat("skyDepth",Rs),y.setTexture("depthSampler",l),y.setTexture("normalSampler",p)}const c=new BABYLON.PostProcess("wash","wash",["texel","radius",...k],x,1,t);c.onApply=y=>{m(y,c),y.setVector2("texel",d(c)),y.setFloat("radius",n.num("wash"))};const w=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...Nt,...k],["aquarelSampler",...x],1,t);w.onApply=y=>{m(y,w),y.setVector2("texel",d(w));const A=n.texture();y.setFloat("useTex",A?1:0),y.setTexture("aquarelSampler",A||s),Nt.forEach($=>y.setFloat($,n.num($)))};const b=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...Ht,...k],["washSampler","animeSampler",...x],1,t);b.onApply=y=>{m(y,b),y.setTextureFromPostProcessOutput("washSampler",c),y.setTexture("animeSampler",Ps(e)||a),y.setVector2("texel",d(b)),Ht.forEach(A=>y.setFloat(A,n.num(A))),y.setColor3("inkColor",BABYLON.Color3.FromArray($t[n.inkColor()]||$t["blue-grey"]))};const R=[c,w,b];return{dispose(){R.forEach(y=>y.dispose(t)),e.onBeforeRenderObservable.remove(o),e.disableGeometryBufferRenderer(),s.dispose(),a.dispose()}}}const Z={sky:380,bg:70,mid:22,fg:7,near:3.5},I={x:0,y:1.6,z:0,fov:50},et=-2,Tn=16/9,zn=.42,st=1.6,Is=3,Ln=e=>Is*ue(e),Vs=(e,t)=>t*e,Us=(e,t,n,s)=>Vs(e,t)-(1-s)*n,Ke=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Ns=999,Hs=1e3,$s=.02,Dn=2,zt=120,_n=.05,de=e=>e>Math.PI?e*Math.PI/180:e,ue=(e,t=I.fov,n=Tn)=>2*e*Math.tan(de(t)/2)*n;function Wt(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const Gt=e=>e.z??Z[e.depth],Ws=e=>Math.min(1,Math.max(0,(e-Z.mid)/(Z.bg-Z.mid)));function Mt(e,t){return e<=Z.bg||t===0?Ws(e)*t:I.y+(t-I.y)*e/Z.bg}const Gs=(e,t)=>t?e+t.h*(1-t.top):e,js=["ground","path","field","ramp","water"],ye=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>js.includes(t)),Ys=2,jt=e=>ye(e)&&e.w/Math.max(1,e.h)>=Ys,On=(e,t,n,s)=>Math.min(0,Us(e,t,n,s)),Yt=[2,2e3];function Zs(e,t,n,s,a,i){const o=me({...e},t),r=Math.min(Yt[1],Math.max(Yt[0],o.z??e.z)),l=Ln(r)/s,p=a*l*o.scale;return{z:r,h:p,w:s*l*Math.max(1,o.scale),sx:l*Math.max(1,o.scale),sy:l*o.scale,x:(o.x-.5)*ue(r),y:On(r,n,p,i),alphaIndex:Ke(r),opacity:o.opacity}}const Pn=(e,t)=>!!e.flat||t.layer==="ground";function ze(e,t,n,s=0,a=s){const i=t.depth,o=Gt(t)-n*_n,r=ue(o),l=i==="sky"?n*2+1:Ke(o);if(e.layer==="sky"){const w=r*st,b=w/Tn,R=-b*.12+(t.y??0);if(e.tileable_x)return{x:0,y:R,z:o,w,h:b,uRepeat:w/(b*(e.w/e.h)),alphaIndex:l,rotation:0};const y=Math.max(w/e.w,b/e.h);return{x:0,y:R,z:o,w:e.w*y,h:e.h*y,uRepeat:1,alphaIndex:l,rotation:0}}const p=e.layer==="bg"&&!e.tileable_x?r*st*e.h/e.w:0,d=Math.max(e.height_m*(t.scale??1),p),v=d*(e.w/e.h),k=e.tileable_x?Math.max(v,r*st):v,x=e.tileable_x?0:((t.x??.5)-.5)*r,m=e.layer==="bg"?i==="bg"?s:0:ye(e)?0:Mt(Gt(t),a),c=i==="sky"?o*Math.tan(de(I.fov)/2)*.45:m;return{x,y:c+(t.y??0),z:o,w:k,h:d,uRepeat:e.tileable_x?k/v:1,alphaIndex:l,rotation:t.rotation??0}}function Ks(e,t,n=0,s=zn,a=et){const i=.5/Math.tan(de(I.fov)/2),o=.5+i*Math.tan(-a*Math.PI/180),r=Z.bg-n*_n,l=I.y+(o-s)*r/i;return Math.round((l-t*(1-e))*10)/10}const He=e=>e-Xs,Xs=.002,Zt={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},Rn=(e,t)=>(Zt[e??"inOut"]??Zt.inOut)(Math.min(1,Math.max(0,t))),Le=(e,t,n)=>e+(t-e)*n,Cn=e=>e.dur_s??(e.camera&&oo(e)||e.est_s||8);function Bn(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(a=>(a.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function In(e,t,n){if(!e)return{...I,fov:de(I.fov)};const s=Rn(e.ease,n>0?t/(e.dur_s??n):1),a={...I,...e.from},i={...a,...e.to};return{x:Le(a.x,i.x,s),y:Le(a.y,i.y,s),z:Le(a.z,i.z,s),fov:Le(de(a.fov),de(i.fov),s)}}const qs=["x","y","z","scale","opacity","rotation"];function me(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const a={...n};for(const i of qs){const o=s.filter(k=>k[i]!==void 0).sort((k,x)=>k.t-x.t);if(!o.length)continue;const r=o[0],l=o[o.length-1];if(t<=r.t){a[i]=r[i];continue}if(t>=l.t){a[i]=l[i];continue}const p=o.findIndex(k=>k.t>t),d=o[p-1],v=o[p];a[i]=Le(d[i],v[i],Rn("inOut",(t-d.t)/(v.t-d.t)))}return a}const Js={none:0,sway:1,drift:2,ripple:3,flicker:4};function Kt(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??e.motion??"none",amount:n.amount??1,speed:n.speed??1}}const Qs=.25,eo=2e3,to=250,ke={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},Xt={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function no(e,t,n,s){const a=r=>{const l=e.lastDir&&e.lastDir!==r?e.flips+1:e.flips;return{...e,notches:e.notches+r,fast:0,lastChange:n,lastDir:r,flips:l,lastUp:r===-1?n:e.lastUp,locked:e.locked||l>=ke.lockFlips&&r===1}};if(t<ke.downFps)return s?a(1):{...e,fast:0};if(t<ke.upFps)return{...e,fast:0};const i=e.fast+1;return e.notches>0&&!e.locked&&i>=ke.upWindows&&n-e.lastChange>=ke.upAfterChangeMs&&n-e.lastUp>=ke.upEveryMs?a(-1):{...e,fast:i}}function so(e,t,n,s){const a=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),a-s*Qs)}function oo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const qt={breath_m:.05,breath_s:7},ao=1.5;function io(e,t,n={}){const s=n.breath_m??qt.breath_m,a=2*Math.PI/Math.max(.5,n.breath_s??qt.breath_s),i=Math.min(1,t/ao),o=i*i*(3-2*i);return{...e,x:e.x+s*o*Math.sin(a*t),y:e.y+s*.5*o*Math.sin(2*a*t)}}async function ro(e){const t=await fetch(e);if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const lo=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function _e(e,t,n){if(t.asset){const o=e.assets.find(r=>r.id===t.asset);if(o)return o}const s=lo(t.need??t.asset??"");if(!s.length)return null;let a=null,i=[0,0,0];for(const o of[...e.assets].sort((r,l)=>r.id.localeCompare(l.id))){const r=s.filter(p=>o.tags.some(d=>d.toLowerCase()===p)).length;if(!r)continue;const l=[r,n&&o.layer===n?1:0,o.qa?.score??0];(!a||l[0]>i[0]||l[0]===i[0]&&(l[1]>i[1]||l[1]===i[1]&&l[2]>i[2]))&&(a=o,i=l)}return a}const De="#f6f5ee",co=.22,ho=(e,t)=>e.layer==="bg"?t.feather??co:0,ot=.6,Vn=12;function uo(e,t){const n=t.paper??De,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const a=t.assets.filter(o=>o.layer==="ground");if(!s)return a.length?{kind:"asset",asset:[...a].sort((o,r)=>o.id.localeCompare(r.id))[0]}:{kind:"paper",colour:n};const i=_e({...t,assets:a},{asset:s},"ground");return i?{kind:"asset",asset:i}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function fo(e,t,n,s=.08){return Un(e,t,n,1-s,1)}function Un(e,t,n,s,a){const i=Math.max(0,Math.floor(n*s)),o=Math.min(n,Math.max(i+1,Math.ceil(n*a))),r=[[],[],[]],l=Math.max(1,Math.floor(t*(o-i)/2e4));for(let d=i*t;d<o*t;d+=l){const v=d*4;e[v+3]<200||(r[0].push(e[v]),r[1].push(e[v+1]),r[2].push(e[v+2]))}if(!r[0].length)return null;const p=d=>{const v=[...d].sort((k,x)=>k-x);return v[v.length>>1]/255};return[p(r[0]),p(r[1]),p(r[2])]}const Oe=32,po=(e,t,n)=>Array.from({length:Oe},(s,a)=>Un(e,t,n,a/Oe,(a+1)/Oe)),mo=(e,t)=>e[Math.min(Oe-1,Math.max(0,Math.floor((1-t)*Oe)))]??null;function go(e,t,n){const s=[],a=Math.max(1,Math.floor(t*n/6e4));for(let i=0;i<t*n;i+=a){const o=i*4;if(e[o+3]<230)continue;const r=(.299*e[o]+.587*e[o+1]+.114*e[o+2])/255;r<.45&&s.push(r)}return s.length<20?null:(s.sort((i,o)=>i-o),s[s.length>>1])}function xo(e,t,n){const s=[];for(let a=0;a<t;a++)for(let i=0;i<n;i++)if(e[(i*t+a)*4+3]>128){s.push(i/n);break}return s.length?(s.sort((a,i)=>a-i),s[s.length>>1]):0}function vo(e,t,n){for(let s=0;s<n;s++){let a=0;for(let i=0;i<t;i++)e[(s*t+i)*4+3]>128&&a++;if(a/t>.5)return s/n}return 0}const yo=1.6,wo=.12;function Jt(e,t,n,s){const a=e.layer==="figure",i=a?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),o=i*wo*s/yo;return a?{w:i,d:Math.min(o,i*.5)}:{w:i,d:Math.min(Math.max(o,i*.3),i*3)}}const bo=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,$e=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Lt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,Nn=Lt;re.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;re.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, nearTex;
  uniform float useTex, tile, grain, fadeNear, fadeFar, detail, vary, mixTile;
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${Lt}
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
  }`;re.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;re.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${Lt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const ko=e=>e?he.WRAP_ADDRESSMODE:he.MIRROR_ADDRESSMODE;function Mo(e){const t=Je.CreateGround("ground",{width:2400,height:2400},e),n=new Qe("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tile","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","nearTex"],needAlphaBlending:!0}),s=new wn(new Uint8Array([255,255,255,255]),1,1,we.TEXTUREFORMAT_RGBA,e);n.setTexture("tex",s).setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0);let a=Vn,i=1;return t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Ns,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){o.tex&&(o.tex.wrapU=he.WRAP_ADDRESSMODE,o.tex.wrapV=he.WRAP_ADDRESSMODE),n.setTexture("tex",o.tex??s),a=o.tile,n.setFloat("useTex",o.tex?1:0).setFloat("tile",a*i).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",C.FromArray(o.base)).setVector3("horizonTint",C.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){i=o.tileScale,n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tile",a*i)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=ko(o.tileable),o.tex.wrapV=he.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}let So=0;function Qt(e,t,n,s,a){const i=Je.CreatePlane(`stain${a?"-cast":""}:${e.name}`,{width:t,height:a?a.length:n},s);if(i.rotation.x=Math.PI/2,a){const[r,l]=a.dir,p=Math.hypot(r,l)||1;i.rotation.y=Math.atan2(r/p,l/p),i.position.set(r/p*a.length*.42,.015,l/p*a.length*.42)}else i.position.set(0,.02,-n*.18);i.parent=e;const o=new Qe(i.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return o.alphaMode=we.ALPHA_PREMULTIPLIED,o.disableDepthWrite=!0,o.backFaceCulling=!1,o.setFloat("seed",So++*7.31%97).setFloat("opacity",0),i.material=o,i.metadata={noGBuffer:!0},i.isPickable=!1,{mesh:i,setOpacity:r=>{o.setFloat("opacity",r),i.isVisible=r>.001}}}re.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;re.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${Nn}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;re.ShadersStore.stageBirdFragmentShader=`
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
  }`;function Hn(e,t,n,s){const a=Je.CreatePlane(e,{size:1},n),i=new Qe(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,a.material=i,a.billboardMode=bn.BILLBOARDMODE_ALL,a.alphaIndex=s,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,mat:i}}const $n=9,Eo=9;function Ao(e,t,n,s){const a=Array.from({length:$n},(i,o)=>{const r=Hn(`smoke:${o}`,"stagePuff",e,s);return r.mat.setFloat("seed",o*3.7),r});return{update(i,o){a.forEach(({mesh:r,mat:l},p)=>{const d=Fo(i,p),v=n*(.6+3.2*d);r.scaling.setAll(v),r.position.set(t.x+n*1.6*d*d+.15*n*Math.sin(p*2.1+i*.3),t.y+n*(.4+7*d),t.z),l.setFloat("alpha",o*.7*Math.sin(Math.PI*d)),r.isVisible=o>.001})},dispose(){a.forEach(({mesh:i,mat:o})=>{o.dispose(),i.dispose()})}}}const Fo=(e,t)=>((e/Eo+t/$n)%1+1)%1,at=40,en=16;function To(e){const t=(e%at+at)%at;return t<en?t/en:null}function zo(e,t,n,s){const a=Array.from({length:6},(i,o)=>Hn(`bird:${o}`,"stageBird",e,s));return{update(i,o){const r=To(i),l=Math.round(2+o*4);a.forEach(({mesh:p,mat:d},v)=>{if(p.isVisible=o>.001&&r!==null&&v<l,!p.isVisible||r===null)return;const k=v*.025;p.position.set((r-k-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*r,t+v*1.5),p.scaling.setAll(3.2),d.setFloat("alpha",.85*Math.min(1,o*2)).setFloat("flap",Math.sin(i*7+v*1.3))})},dispose(){a.forEach(({mesh:i,mat:o})=>{o.dispose(),i.dispose()})}}}const tn=["fire","hearth","chimney","smoke"],Lo=e=>e.id.split(/[-_]/).some(t=>tn.includes(t))||e.tags.some(t=>tn.includes(t.toLowerCase())),it=e=>e[0].toUpperCase()+e.slice(1),Do=e=>({fade:`lineFade${it(e)}`,thin:`lineThin${it(e)}`,haze:`haze${it(e)}`}),Xe={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:et,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},_o=[1.05,1,.9],Oo=[.88,.93,1.05],Po=.35;function Ro(e,t,n,s){const a=t==="sky";return{edgeSoft:a?0:W(e,"edgeSoft"),footM:t==="standing"?Po:0,grounding:t==="figure"?0:W(e,"grounding"),grass:t==="figure"?0:W(e,"grassOverlap"),light:a?0:W(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:a?W(e,"cloudDrift"):0,footTint:s}}const Wn=[.93,.86,.74],nn=e=>({paper:W(e,"sheetPaper"),grain:W(e,"sheetGrain"),patches:W(e,"sheetPatches"),wash:W(e,"sheetWash"),washColour:Wn}),Co={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01]},Bo=Object.fromEntries(Object.keys(Xe).map(e=>[e,Co[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ce=(e,t)=>W(e,t),W=(e,t)=>{const n=Number(e[t]??Xe[t]);return Number.isFinite(n)?n:Xe[t]};function rt(e,t){const n=Do(t);return{fade:W(e,n.fade),thin:W(e,n.thin),haze:W(e,n.haze),brown:W(e,"lineBrown"),ink:W(e,"lineInk"),norm:W(e,"lineNorm")}}const Io=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),lt=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),We=(e,t,n,s,a)=>{const i=s*(1080/a);return[n/Math.max(e*i,.001),1/Math.max(t*i,.001)]};function Vo(e,t,n){const s=new C(I.x,I.y,I.z),a=Me.RotationX(e*Math.PI/180),o=Me.LookAtLH(s,s.add(C.TransformNormal(new C(0,0,1),a)),C.TransformNormal(C.Up(),a)).multiply(Me.PerspectiveFovLH(de(I.fov),t,.1,2e3));return{vp:o,top:C.TransformCoordinates(new C(0,0,n),o).y}}re.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function Uo(e,t){const n=new ns("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",C.FromArray(Wn))},n}const No=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Ho=`
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
  }`;re.ShadersStore.stageLayerVertexShader=`
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
    }
    vUV = uv;
    vH = h;
    gl_Position = worldViewProjection * vec4(p, 1.0);
  }`;re.ShadersStore.stageLayerFragmentShader=`
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
  ${Nn}
  ${No}
  ${Ho}
  void main(void) {
    vec2 uv = vec2(vUV.x * uRepeat, vUV.y);
    uv.x += drift * 0.03 * sin(time * 0.009 + phase);     // the backdrop sky's clouds travel, too slow to see turn
    if (kind == 3.0) {          // ripple: the water surface wobbles, more toward the bottom (nearer)
      float k = amount * (0.3 + 0.7 * (1.0 - vH));
      uv.x += k * 0.004 * sin(uv.y * 70.0 + time * speed * 2.2 + phase);
      uv.y += k * 0.002 * sin(uv.x * 45.0 / uRepeat + time * speed * 1.6);
    }
    vec4 c = texture2D(tex, uv);                       // premultiplied
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
          vec4 n = texture2D(tex, uv + d * pxUV * lineThin);
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
        vec4 n = texture2D(tex, uv + vec2(cos(a), sin(a)) * grainUV * 2.5);
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
  }`;const sn=new WeakMap,Gn=new Map,jn=new Map,St=new Map,Yn=new Map,Et=new Map;function Ge(e,t){const n=sn.get(t)??new Map;sn.set(t,n);const s=n.get(e);if(s)return s;const a=new Promise((i,o)=>{const r=new Image;r.crossOrigin="anonymous",r.onerror=()=>o(new Error(`layer image ${e} did not load`)),r.onload=()=>{const l=document.createElement("canvas");l.width=r.naturalWidth,l.height=r.naturalHeight;const p=l.getContext("2d",{willReadFrequently:!0});p.drawImage(r,0,0);const d=p.getImageData(0,0,l.width,l.height).data,v=fo(d,l.width,l.height);v&&Gn.set(e,v),Et.set(e,po(d,l.width,l.height)),jn.set(e,vo(d,l.width,l.height)),St.set(e,xo(d,l.width,l.height));const k=go(d,l.width,l.height);k!==null&&Yn.set(e,k);for(let m=0;m<d.length;m+=4){const c=d[m+3]/255;d[m]=Math.round(d[m]*c),d[m+1]=Math.round(d[m+1]*c),d[m+2]=Math.round(d[m+2]*c)}const x=new wn(d,l.width,l.height,we.TEXTUREFORMAT_RGBA,t,!0,!1,he.TRILINEAR_SAMPLINGMODE);x.anisotropicFilteringLevel=8,x.wrapV=he.CLAMP_ADDRESSMODE,i(x)},r.src=e});return n.set(e,a),a.catch(()=>n.delete(e)),a}const ct=24;function $o(e,t,n,s,a){const[i,o]=t.anchor??[.5,1],r=[],l=[],p=[];for(let v=0;v<=ct;v++){const k=v/ct;for(const x of[0,1])r.push((x-i)*n,(o-k)*s,0),l.push(x,k);if(v<ct){const x=v*2;p.push(x,x+2,x+1,x+1,x+2,x+3)}}const d=new bn(e,a);return Object.assign(new ss,{positions:r,uvs:l,indices:p}).applyToMesh(d),d}let Wo=0;function on(e,t,n,s,a,i){const o=$o(`layer:${e.id}`,e,n,s,i),r=new Qe(`layer:${e.id}`,i,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=a!==1?he.WRAP_ADDRESSMODE:he.CLAMP_ADDRESSMODE,r.setTexture("tex",t),r.alphaMode=we.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1;const l=Wo++*2.39996%(Math.PI*2),p=e.anchor?.[1]??1;return r.setFloat("phase",l).setFloat("height",s*p).setFloat("width",n).setFloat("uRepeat",a).setFloat("opacity",1),r.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),r.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),r.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),o.material=r,o.metadata={noGBuffer:!0,painted:!0},o.isPickable=!1,{mesh:o,material:r,setMotion:d=>{r.setFloat("kind",Js[d.kind]??0).setFloat("amount",d.amount).setFloat("speed",d.speed)},setOpacity:d=>{r.setFloat("opacity",d),o.isVisible=d>.001},setLine:(d,v,k,x)=>{r.setFloat("inkMul",v).setFloat("lineFade",d.fade).setFloat("lineThin",d.thin).setFloat("haze",d.haze).setFloat("lineBrown",d.brown),r.setVector2("pxUV",new Ct(k[0],k[1])).setVector3("hazeTint",C.FromArray(x))},setPaper:(d,v)=>{r.setFloat("paper",d.paper).setFloat("grain",d.grain).setFloat("patches",d.patches).setFloat("wash",d.wash),r.setVector3("washColour",C.FromArray(d.washColour)).setVector2("grainUV",new Ct(v[0],v[1]))},setBottomFade:d=>{r.setFloat("bottomFade",d)},setAlive:d=>{r.setFloat("edgeSoft",d.edgeSoft).setFloat("footM",d.footM).setFloat("grounding",d.grounding).setFloat("grass",d.grass).setFloat("light",d.light).setFloat("sunSide",d.sunSide).setFloat("drift",d.drift),r.setVector3("footTint",C.FromArray(d.footTint)).setVector3("sunColour",C.FromArray(_o)).setVector3("shadeColour",C.FromArray(Oo))},setGroundLine:d=>{r.setFloat("groundLine",d)},setFeather:(d,v)=>{r.setFloat("feather",Math.max(0,Math.min(1,d))),v&&r.setVector3("featherTint",C.FromArray(v))}}}const At={...Cs["History Lines pencil"],paper:.35,granulation:.2,...Xe},Go=new kn(.937,.914,.863,1),jo=.7,Yo=(e,t,n)=>e.map((s,a)=>s+(t[a]-s)*n);class Zo{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new os(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new as(this.engine),this.scene.clearColor=Go,this.camera=new is("house",new C(0,1.6,0),this.scene),this.camera.rotation.set(et*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new rs("sky",new C(0,1,0),this.scene).intensity=.7,new ls("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=Mo(this.scene),this.ground.set(this.groundLook(null,null,n)),this.birds=zo(this.scene,cn,ue(cn),Qo),Bs(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),Uo(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=$e(De);strip=null;nearTex=null;bands=[];smoke=[];birds;footTint=$e(De);nearAsset=null;hazeTint=$e(De);sceneLib;buildToken=0;look={...At};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=Xt;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return so(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=Xt,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>to;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<eo)return;const a=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const i=this.tier.notches;this.tier=no(this.tier,a,t,this.scaleAt(i+1)<this.scaleAt(i)),this.tier.notches!==i&&this.fit()}setLook(t){this.look={...At,...t??{}}}groundPoint(t,n){const s=Z[n];return new C((t-.5)*ue(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,a=[],i=[];t.set.sky&&i.push({layer:rn(t),order:0,index:-1});const o={sky:1};t.set.layers.forEach((E,L)=>{const se=E.depth;o[se]=o[se]??0,i.push({layer:E,order:o[se]++,index:L})});const r=[];await Promise.all(i.map(async({layer:E,order:L,index:se})=>{let N=_e(n,E,E.depth);if(!N){r.push({need:E.need??E.asset,reason:"no match"});return}let q;try{q=await Ge(pe(n,N,E),this.scene)}catch{r.push({need:E.need??E.asset,reason:`file did not load: ${E.src??N.file}`});return}if(s!==this.buildToken)return;N=an(N,E,q);const _=ze(N,E,L),G=on(N,q,_.w,_.h,_.uRepeat,this.scene);G.mesh.position.set(_.x,_.y,_.z);const oe=Pn(E,N);G.mesh.alphaIndex=oe?Hs:_.alphaIndex,oe&&(G.mesh.rotation.x=Math.PI/2),G.mesh.isVisible=!1;let ee,fe,J;if(ht.includes(E.depth)&&!N.tileable_x&&!oe&&!ye(N)){const te=Jt(N,_.w,_.h,_.z);J=M=>Jt(N,_.w,_.h,M).d/te.d,ee=Qt(G.mesh,te.w,te.d,this.scene),ee.mesh.alphaIndex=He(_.alphaIndex),fe=Qt(G.mesh,te.w,te.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:_.h*ea(this.sunDir)}),fe.mesh.alphaIndex=He(_.alphaIndex)}a.push({layer:E,index:se,builtScale:E.scale??1,builtZ:_.z,handle:G,asset:N,order:L,stain:ee,cast:fe,stainDepth:J,ink:Yn.get(pe(n,N,E)),flat:oe,skyline:St.get(pe(n,N,E))})}));const l=uo(t.set,n);let p=null,d=null;const v=bo(t.set.near,n),k=v?_e(n,{asset:v}):null;if(t.set.near&&!k&&r.push({need:t.set.near,reason:"no near band"}),k)try{d=await Ge(n.base+k.file,this.scene)}catch{r.push({need:t.set.near,reason:`file did not load: ${k.file}`})}if(l.kind==="asset")try{p=await Ge(n.base+l.asset.file,this.scene)}catch{r.push({need:t.set.ground??"ground",reason:`file did not load: ${l.asset.file}`})}else l.reason&&r.push({need:t.set.ground,reason:l.reason});const x=a.filter(E=>E.asset.layer==="bg").sort((E,L)=>E.index-L.index)[0],m=x?{top:jn.get(pe(n,x.asset,x.layer))??0,h:ze(x.asset,x.layer,x.order).h,order:x.order}:null,c=a.find(E=>E.index===-1),w=c&&ze(c.asset,c.layer,c.order),b=c&&w?mo(Et.get(pe(n,c.asset,c.layer))??[],(I.y-w.y)/w.h):null,R=x?Gn.get(pe(n,x.asset,x.layer))??null:t.set.groundBands?.length?null:b,y=await this.loadBands(t,n),A=E=>E.forEach(L=>{L.stain?.mesh.material?.dispose(),L.cast?.mesh.material?.dispose(),L.handle.mesh.dispose(),L.handle.material.dispose()});if(s!==this.buildToken){A(a),y.forEach(E=>{E.handle.mesh.dispose(),E.handle.material.dispose()});return}A(this.built),this.bands.forEach(E=>{E.handle.mesh.dispose(),E.handle.material.dispose()}),this.bands=y,this.built=a,this.sceneLib=n;const $=l.kind==="asset"?(Et.get(n.base+l.asset.file)??[]).filter(E=>!!E):[],B=this.groundLook(l.kind==="asset"?{tex:p,asset:l.asset}:null,R,n,l.kind==="paper"?l.colour:void 0);this.horizonTint=B.tint,this.strip=m,this.smoke.forEach(E=>E.dispose()),this.smoke=a.filter(E=>Lo(E.asset)&&ht.includes(E.layer.depth)&&!E.flat).map(E=>{const L=ze(E.asset,E.layer,E.order);return Ao(this.scene,new C(E.handle.mesh.position.x,L.h*.6,L.z),Math.min(Math.max(L.h*.8,.5),3),L.alphaIndex)}),this.footTint=$.length?ta($):B.base,this.nearTex=d,this.nearAsset=k,this.hazeTint=b??B.tint,this.ground.set(B),this.missed.set(t.id,r),r.length&&console.warn(`stage25d: ${t.id}: missing`,r)}groundLook(t,n,s,a){const i=$e(a??s.paper??De),o=n??i;return{tex:t?.tex??null,tile:t?.asset.height_m||Vn,base:Yo(i,o,jo),tint:o,fadeNear:Z.fg,fadeFar:Z.bg*.75,grain:t?.tex?.5:1}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:rn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=o=>this.built.some(r=>r.handle.mesh===o),a=[],i=[...this.scene.multiPick(t,n,s)??[]].sort((o,r)=>o.distance-r.distance);for(const o of i){const r=this.built.find(p=>p.handle.mesh===o.pickedMesh),l=o.getTextureCoordinates();!r||!l||r.index<0||r.asset.tileable_x||["sky","bg","ground"].includes(r.asset.layer)||ye(r.asset)&&(o.pickedPoint?.y??0)<0||a.push({index:r.index,asset:r.asset,u:l.x,v:l.y})}return a}pickBackdrops(t,n){const s=o=>this.bands.find(r=>r.handle.mesh===o),a=o=>this.built.find(r=>r.handle.mesh===o&&r.index>=0&&r.asset.layer==="bg");return[...this.scene.multiPick(t,n,o=>!!s(o)||!!a(o))??[]].sort((o,r)=>o.distance-r.distance).flatMap(o=>{const r=o.getTextureCoordinates();if(!r)return[];const l=s(o.pickedMesh);if(l)return[{band:l.index,asset:l.asset,u:r.x,v:r.y}];const p=a(o.pickedMesh);return[{index:p.index,asset:p.asset,u:r.x,v:r.y}]})}layerBox(t){const n=this.built.find(p=>p.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),a=1/this.engine.getRenderWidth(),i=1/this.engine.getRenderHeight(),o=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p=>C.Project(p,Me.IdentityReadOnly,this.scene.getTransformMatrix(),s)),r=o.map(p=>p.x*a),l=o.map(p=>p.y*i);return{x0:Math.min(...r),y0:Math.min(...l),x1:Math.max(...r),y1:Math.max(...l),z:n.handle.mesh.position.z}}groundHeightAt(t){return Mt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?ye(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Me.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(a=>a.dispose());const s=a=>Xo*Math.min(1,Math.max(0,(ln-a)/(ln-Jo)));this.gridMeshes=n.pieces.map((a,i)=>{const o=a.lines.map(p=>p.map(([d,v])=>new C(d,Mt(v,t),v))),r=a.lines.map(p=>p.map(([,d])=>new kn(n.rgb[0],n.rgb[1],n.rgb[2],s(d)))),l=Je.CreateLineSystem(`grid-${i}`,{lines:o,colors:r,useVertexAlpha:!0},this.scene);return l.isPickable=!1,l.setEnabled(!this.gridOff),l.alphaIndex=Ke(a.z)+qo,l.material.depthFunction=we.ALWAYS,l.material.disableDepthWrite=!0,l}),n.land=t}worldXAt(t,n,s){const a=this.scene.createPickingRay(t,n,Me.Identity(),this.camera);return a.origin.x+(s-a.origin.z)/a.direction.z*a.direction.x}sunDir=new C(.55,-1,-.3).normalize();depthLine(t){return{...rt(this.look,t),tint:this.hazeTint}}paper(){return nn(this.look)}async loadBands(t,n){const s=[];for(const[a,i]of(t.set.groundBands??[]).entries()){const o=_e(n,{asset:i.asset},"ground_band");if(!o){console.warn(`stage25d: ${t.id}: no ground band ${i.asset}`);continue}const r=await Ge(pe(n,o,i),this.scene).catch(()=>null);if(!r){console.warn(`stage25d: ${t.id}: ground band ${i.src??o.file} did not load`);continue}const l=an(o,i,r),p=Ln(i.z),d=p*l.h/l.w,v=on(l,r,p,d,1,this.scene);v.material.depthFunction=we.ALWAYS,v.mesh.position.set(0,0,i.z),v.mesh.alphaIndex=Ke(i.z),s.push({handle:v,z:i.z,w:p,h:d,skyline:St.get(pe(n,l,i))??.5,index:a,asset:l,band:i})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?Ks(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??zn,ce(this.look,"housePitch")):0}pose(t,n,s,a){const i=Bn(t,n),o=In(i.cam,i.t,Cn(t)),r=a?io(o,a.t,a):o;this.camera.position.set(r.x,r.y,r.z),this.camera.fov=r.fov;const l=ce(this.look,"housePitch");this.camera.rotation.x=l*Math.PI/180,this.ground.follow(this.camera.position);const p=c=>ce(this.look,c);this.ground.live({detail:p("groundDetail"),vary:p("groundVary"),mixTile:p("groundMix"),tileScale:p("groundScale")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Vo(l,this.engine.getAspectRatio(this.camera),p("nearFar")),span:Ko,tileable:!!this.nearAsset?.tileable_x}:null);const d=this.engine.getRenderHeight(),v=nn(this.look),k=ce(this.look,"bandHeight"),x=this.horizonOf(t),m=Gs(x,this.strip);this.land=m,this.poseGrid(m),this.bands.forEach(c=>{const w=Zs(c.band,n,k,c.w,c.h,c.skyline);c.z=w.z,c.handle.mesh.scaling.set(w.sx,w.sy,1),c.handle.mesh.position.set(w.x,w.y,w.z),c.handle.mesh.alphaIndex=w.alphaIndex;const b=lt(d,w.z-I.z,de(I.fov));c.handle.setOpacity(w.opacity),c.handle.setBottomFade(Math.min(1,ce(this.look,"bandFade")/w.h)),c.handle.setPaper(v,We(w.w,w.h,1,b,d)),c.handle.setLine(rt(this.look,"bg"),1,We(w.w,w.h,1,b,d),this.hazeTint),c.handle.setMotion(Kt(c.asset,{...c.band})),c.handle.material.setFloat("time",s)}),this.smoke.forEach(c=>c.update(s,ce(this.look,"smoke"))),this.birds.update(s,ce(this.look,"birds"));for(const c of this.built){const w=me(c.layer,n),b=ze(c.asset,{...c.layer,x:w.x,y:w.y,z:w.z,scale:1,rotation:w.rotation},c.order,x,m);c.handle.mesh.position.x=b.x;const R=c.asset.layer==="bg"&&!c.asset.tileable_x?(b.z-I.z)/Math.max(.1,c.builtZ-I.z):1;c.handle.mesh.position.y=c.flat?$s:ye(c.asset)?On(b.z,k,b.h*w.scale,c.skyline??0)+b.y:I.y+(b.y-I.y)*R,c.handle.mesh.position.z!==b.z&&(c.handle.mesh.position.z=b.z,c.flat||(c.handle.mesh.alphaIndex=b.alphaIndex),c.stain&&(c.stain.mesh.alphaIndex=He(b.alphaIndex)),c.stain&&c.stainDepth&&(c.stain.mesh.scaling.y=c.stainDepth(b.z)),c.cast&&(c.cast.mesh.alphaIndex=He(b.alphaIndex))),c.handle.mesh.rotation.z=-b.rotation*Math.PI/180,c.handle.mesh.scaling.setAll(w.scale/c.builtScale*R),c.handle.setOpacity(w.opacity),c.handle.setFeather(ho(c.asset,c.layer),this.horizonTint),c.asset.layer==="sky"&&c.handle.setGroundLine((r.y-b.y)/(b.h*w.scale));const y=lt(d,b.z-r.z,this.camera.fov),A=rt(this.look,c.layer.depth);c.handle.setPaper(v,We(b.w*w.scale,b.h*w.scale,b.uRepeat,lt(1080,b.z-I.z,de(I.fov)),1080)),c.handle.setLine(A,c.ink===void 0?1:Io(c.ink,A.ink,A.norm),We(b.w*w.scale,b.h*w.scale,b.uRepeat,y,d),this.hazeTint),c.stain?.setOpacity((c.layer.shadow??ot)*w.opacity),c.cast?.setOpacity(ce(this.look,"castShadow")*((c.layer.shadow??ot)/ot)*w.opacity);const $=c.asset.layer==="sky"?"sky":c.asset.layer==="bg"?"strip":c.asset.layer==="figure"?"figure":ht.includes(c.layer.depth)&&!c.flat?"standing":"other";c.handle.setAlive(Ro(this.look,$,this.sunDir.x,this.footTint)),c.handle.setMotion(Kt(c.asset,c.layer)),c.handle.material.setFloat("time",s)}}}const pe=(e,t,n)=>n?.src??e.base+t.file,an=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:a}=n.getSize();return{...e,w:s,h:a,height_m:e.height_m*(a/e.h)}},rn=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),Ko=1.3,Xo=.35,qo=.001,Jo=40,ln=120,cn=110,Qo=900,ea=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),ta=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),ht=["mid","fg","near"],na=16/9,sa=.92;function oa(e,t,n,s){const{cam:a,t:i}=Bn(e,s),o=In(a,i,Cn(e)),r=Z[t.depth],l=r-o.z;if(l<=.5)return null;const p=me(t,s),d=(p.x-.5)*ue(r),v=Math.tan(o.fov/2),k=(d-o.x)/(l*v*na),x=-et*Math.PI/180,m=Math.tan(Math.atan2(n*p.scale-o.y,l)-x)/v;return Math.abs(k)>sa?null:{x:(k+1)/2,y:Math.min(1,Math.max(0,(1-m)/2))}}const aa={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},hn=new Set(["large","small","tall","long","short","fallen"]),ia=new Set(["tree","shrub"]),Dt=e=>e.charAt(0).toUpperCase()+e.slice(1),ra=(e,t)=>aa[e]?.[t?1:0]??e;function la(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const a=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!a.length)return"";const i=a.length>1&&ia.has(a[0])?a.slice(1):a,o=i.filter(l=>hn.has(l)),r=i.filter(l=>!hn.has(l));return Dt([...o,...r].map(l=>ra(l,n)).join(" "))}const dn=e=>Dt(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),Zn=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ve(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),a=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&Zn(s);if(a)return dn(a);if(e.figure)return dn(e.figure);if(s)return la(s,n);const i=Array.isArray(e.need)?e.need[0]:e.need;return i?Dt(String(i)):""}function ca(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const ha=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function da(e){return e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>ha.has(t))?"leaf":"photo"}const Ie=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?Zn(e):null,un=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Se(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:un(e,"pose:")??t?.[1]??null,facing:un(e,"facing:")??(t?.[2]?"left":"right")}}const Kn=e=>e.find(t=>Se(t).pose==="stand"&&Se(t).facing==="right")??e[0];function Xn(e){const t=new Map,n=[];for(const s of e??[]){const a=Ie(s);if(!a){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(a)){const o={id:`series:${a}`,asset:s,series:a,count:0,members:[]};t.set(a,o),n.push(o)}const i=t.get(a);i.members=[...i.members,s],i.count=i.members.length}return n.map(s=>s.series?{...s,asset:Kn(s.members)}:s)}const ua=(e,t)=>{const n=Ie(t);return n?(e??[]).filter(s=>Ie(s)===n):t?[t]:[]},fa=e=>Xn(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function pa(e,t,n){const s=(e??[]).filter(o=>Ie(o)===n);if(!s.length)return null;const a=Se(t),i=(o,r)=>s.find(l=>Se(l).pose===o&&Se(l).facing===r);return i(a.pose,a.facing)??i("stand",a.facing)??Kn(s)}const ma=24;function ga(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const a=new Image;a.onload=()=>{try{const i=document.createElement("canvas");i.width=a.naturalWidth,i.height=a.naturalHeight;const o=i.getContext("2d",{willReadFrequently:!0});o.drawImage(a,0,0),t.set(s,{w:i.width,h:i.height,data:o.getImageData(0,0,i.width,i.height).data})}catch{t.set(s,"failed")}},a.onerror=()=>t.set(s,"failed"),a.src=e+s};return{prime(s){s.forEach(a=>a?.file&&n(a.file))},opaque(s,a,i){const o=t.get(s?.file);if(!o||typeof o=="string")return s?.file&&n(s.file),!0;const r=Math.min(o.w-1,Math.max(0,Math.floor(a*o.w))),l=Math.min(o.h-1,Math.max(0,Math.floor((1-i)*o.h)));return o.data[(l*o.w+r)*4+3]>ma}}}const Q={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,Dn],[80,zt]]},xa=e=>e<=12?1:e<=40?5:20,va=e=>xa(e)/4;function fn(e,t=0){const n=typeof t=="function"?t:()=>t,s=p=>[e.origin[0]+p*e.dir[0],e.origin[2]+p*e.dir[2]],a=p=>e.origin[1]+p*e.dir[1]-(Q.z+n(s(p)[1]));if(!(e.dir[2]>0))return null;const i=(zt*ya-e.origin[2])/e.dir[2],o=Math.sign(a(0));if(o===0)return Bt(Q,s(0));let r=0,l=null;for(let p=1;p<=pn;p++){const d=i*p/pn;if(Math.sign(a(d))!==o){l=d;break}r=d}if(l===null)return null;for(let p=0;p<wa;p++){const d=(r+l)/2;Math.sign(a(d))===o?r=d:l=d}return Bt(Q,s(l))}const ya=4,pn=400,wa=30;function Ft(e){const t=va(mt(Q,e)[1]);return mt(Q,ds(e,t))}const Tt=(e,t)=>[(e-.5)*ue(t),t],qe=([e,t])=>({x:Math.round((.5+e/ue(t))*1e4)/1e4,z:t});function _t([e,t],n,s=[0,0]){const a=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*a,n]}function ba([e,t],n,s=[0,0]){const[[,a],[,i]]=Q.cells,o=Math.max(.1,t-s[1]),r=Math.min(i,Math.max(a,s[1]+o/Math.max(.01,n)));return mt(Q,_t([e,t],r,s))}const ka=[[Dn,12,2],[12,40,10],[40,zt,40]],Ma=20;function Sa(){return ka.flatMap(([e,t,n],s)=>{const a=n*Ma,i=[];let o=e;for(let r=Math.ceil(e/n)*n;r<=t;r+=n){if(r===e&&s>0)continue;const l={...Q,cells:[[-a,o],[a,r]]},p=us(l,n,Math.max(1,Math.round(r-o))).filter(d=>d[0][0]!==d[d.length-1][0]?d[0][1]===r:r>o);i.push({z:r,lines:p.map(d=>d.map(v=>fs(Q,v).slice(0,2)))}),o=r}return i})}const mn=-1,gn=2;function Ea({canvas:e,host:t,stage:n,valueOf:s,alpha:a,onChange:i,onGround:o=()=>!1,byDistance:r=()=>!1,groundUnder:l=()=>null,footY:p=()=>0,eye:d=()=>[0,0],onSettled:v=()=>{},onEmpty:k=()=>!1}){let x=null,m=null,c=!1;const w="#38bdf8",b=document.createElement("div");b.dataset.stage25dSelection="",b.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${w};z-index:3;`;const R=document.createElement("div");R.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${w};pointer-events:none;`,b.appendChild(R);const y=document.createElement("div");y.dataset.rotateHandle="1",y.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",b.appendChild(y);const $=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([M,F])=>{const z=document.createElement("div");return z.dataset.scaleHandle="1",z.style.cssText=hs(M,F),b.appendChild(z),z});t.appendChild(b),n()?.setGrid?.(Sa(),Aa(t,"--color-neutral"));const B=document.createElement("div");B.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(B);const E=M=>{const F=q();if(!F||M===null){B.style.display="none";return}const z=t.getBoundingClientRect(),P=e.getBoundingClientRect();Object.assign(B.style,{display:"block",left:`${F.left+F.width/2+P.left-z.left}px`,top:`${F.top+F.height+P.top-z.top}px`}),B.textContent=`${s(M,"z").toFixed(2)} m`},L=M=>{const F=e.getBoundingClientRect();return{x:M.clientX-F.left,y:M.clientY-F.top}},se=(M,F)=>n()?.pickLayers(M,F).find(z=>a.opaque(z.asset,z.u,z.v))??null,N=(M,F)=>{x=M,F&&M!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${M}`}})),_()},q=()=>{const M=x===null?null:n()?.layerBox(x);if(!M)return null;const F=e.getBoundingClientRect();return{left:M.x0*F.width,top:M.y0*F.height,width:(M.x1-M.x0)*F.width,height:(M.y1-M.y0)*F.height,z:M.z}},_=()=>{const M=q();if(!M){b.style.display="none";return}const F=e.getBoundingClientRect(),z=t.getBoundingClientRect();Object.assign(b.style,{display:"block",left:`${M.left+F.left-z.left}px`,top:`${M.top+F.top-z.top}px`,width:`${M.width}px`,height:`${M.height}px`})},G=(M,F,z)=>Math.min(z,Math.max(F,M)),oe=M=>{if(M.button!==0)return;const{x:F,y:z}=L(M),P=se(F,z);if(!P){k(F,z)&&M.stopPropagation();return}M.stopPropagation(),N(P.index,!0);const K=n().layerBox(P.index),j=o(P.index),ae=q();m={mode:"move",index:P.index,z:K.z,from:n().worldXAt(F,z,K.z),x0:s(P.index,"x"),id:M.pointerId,el:e,ground:j,start:[F,z],foot:ae?[ae.left+ae.width/2,ae.top+ae.height]:[F,z],lift:j?p(P.index):0},e.setPointerCapture?.(M.pointerId)},ee=M=>F=>{if(F.button!==0||x===null)return;const z=q();if(!z)return;F.stopPropagation(),F.preventDefault();const P=e.getBoundingClientRect(),K=z.left+z.width/2,j=z.top+z.height/2,{x:ae,y:Ee}={x:F.clientX-P.left,y:F.clientY-P.top};m={mode:M,index:x,cx:K,cy:j,id:F.pointerId,el:F.currentTarget,d0:Math.max(8,Math.hypot(ae-K,Ee-j)),a0:Math.atan2(Ee-j,ae-K),scale0:s(x,"scale"),rotation0:s(x,"rotation"),byDistance:M==="scale"&&r(x),p0:Tt(s(x,"x"),s(x,"z")),eye:d()},F.currentTarget.setPointerCapture?.(F.pointerId)},fe=M=>{const{x:F,y:z}=L(M);if(m?.mode==="move"&&m.ground){const P=l(m.foot[0]+F-m.start[0],m.foot[1]+z-m.start[1],m.lift,m.index);if(!P)return;const K=qe(Ft(P));i(m.index,"x",G(K.x,mn,gn)),i(m.index,"z",K.z),E(m.index);return}if(m?.mode==="move"){const P=(n().worldXAt(F,z,m.z)-m.from)/ue(m.z);i(m.index,"x",Math.round(G(m.x0+P,mn,gn)*1e3)/1e3);return}if(m?.mode==="scale"&&m.byDistance){const P=Math.hypot(F-m.cx,z-m.cy)/m.d0*m.scale0,K=Ft(ba(m.p0,P,m.eye))[1],j=qe(_t(m.p0,K,m.eye));m.scale0!==1&&i(m.index,"scale",1),i(m.index,"x",j.x),i(m.index,"z",j.z),E(m.index);return}if(m?.mode==="scale"){const P=Math.hypot(F-m.cx,z-m.cy);i(m.index,"scale",Math.round(G(m.scale0*(P/m.d0),.05,20)*1e3)/1e3);return}if(m?.mode==="rotate"){let P=m.rotation0+(Math.atan2(z-m.cy,F-m.cx)-m.a0)*180/Math.PI;M.shiftKey&&(P=Math.round(P/15)*15),i(m.index,"rotation",Math.round(P*10)/10);return}c||(c=!0,requestAnimationFrame(()=>{c=!1,e.style.cursor=se(F,z)?"pointer":""}))},J=()=>{if(!m)return;m.el.releasePointerCapture?.(m.id);const M=m.index,F=m.mode==="move"&&m.ground||m.byDistance;m=null,B.style.display="none",F&&v(M)},te=M=>{x!==null&&M.detail?.id!==`s25_layer-${x}`&&(x=null,_())};e.addEventListener("pointerdown",oe);for(const M of[e,...$,y])M.addEventListener("pointermove",fe),M.addEventListener("pointerup",J),M.addEventListener("pointercancel",J);return $.forEach(M=>M.addEventListener("pointerdown",ee("scale"))),y.addEventListener("pointerdown",ee("rotate")),window.addEventListener("scene-object-selected",te),{select:(M,F=!1)=>N(M,F),get selected(){return x},place:_,destroy(){window.removeEventListener("scene-object-selected",te),b.remove(),n()?.setGrid?.(null),B.remove()}}}function Aa(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const Ot=["x","y","z","scale","rotation","opacity","keys","figure"],X=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},dt=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Ot.includes(t))),xn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...a}=e?.set??{};return JSON.stringify({...e,set:{...a,layers:t.map(dt),groundBands:n.map(dt),skyLayer:dt(s)}})},ut=e=>Ot.map(t=>e?.[t]??null),ft=e=>JSON.stringify([(e?.set?.layers??[]).map(ut),(e?.set?.groundBands??[]).map(ut),ut(e?.set?.skyLayer)]),Fa={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},vn=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch"],yn="application/x-lp-stage25d",je=new Map,pt=new Map,Ta=e=>(pt.has(e)||pt.set(e,ga(e)),pt.get(e));function za(e){return je.has(e)||je.set(e,ro(cs(e)).catch(t=>{throw je.delete(e),t})),je.get(e)}const La=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function Na(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,a=null,i=null,o=null,r=new Map,l=new Map,p=0,d=null,v=0,k=0,x=performance.now(),m=!1,c=[],w=[],b={},R=new Set,y=null,A=null,$=null,B=null,E={},L=null,se=0;const N=()=>{s.engine.runRenderLoop(()=>{const h=performance.now();k+=Math.min(.1,(h-x)/1e3),x=h,s.tick(h),a&&s.pose(a,J(),k),s.scene.render(),L?.place()})},q=()=>{if(!a||!s)return;const h=(u,f)=>R.has(f)?{...u,opacity:0,keys:[]}:u;a={...a,set:{...a.set,groundBands:w.map((u,f)=>h(u,`band-${f}`)),skyLayer:b,layers:c.map((u,f)=>h(u,`layer-${f}`))}},s.rebind(a)},_=h=>{const u=/^band-(\d+)$/.exec(String(h??""));return u&&w[Number(u[1])]?Number(u[1]):-1},G=h=>h==="sky"?o?.set?.sky?{...b,depth:"sky"}:null:_(h)>=0?{...w[_(h)],depth:"bg"}:c[X(h)]??null,oe=(h,u)=>{let f=null;if(h==="sky"&&o?.set?.sky){if(u.motion===void 0)return null;b={...b,motion:u.motion},f={skyLayer:{motion:u.motion}}}else if(_(h)>=0){const g=_(h);w=w.map((S,T)=>T===g?{...S,...u}:S),f={band:{index:g,...u}}}else if(c[X(h)]){const g=X(h);c=c.map((S,T)=>T===g?{...S,...u}:S),f=g}return f===null?null:(y=ft({set:{layers:c,groundBands:w,skyLayer:b}}),q(),f)},ee=()=>({...o.set,layers:c,groundBands:w,skyLayer:b}),fe=(h,u)=>{const f=oe(h,u);f===null||O.sceneId==null||(typeof f=="number"?t.onCommit?.(f,u,O.sceneId):t.onCommit?.(0,f,O.sceneId))},J=()=>d?d():p,te=()=>o?.set?.sky&&A?r.get(o.set.sky)??_e(A,{asset:o.set.sky},"sky"):null,M=h=>{const u=r.get(c[h]?.asset);return!!(c[h]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&c[h].depth!=="sky")},F=h=>h==="sky"||_(h)>=0,z=(h,u)=>{const f=s?.pickBackdrops?.(h,u).find(S=>$.opaque(S.asset,S.u,S.v)),g=f?f.band!==void 0?`band-${f.band}`:`layer-${f.index}`:o?.set?.sky?"sky":null;return g&&O.select(g),!!g},P=(h,u)=>ye(u)||Pn(h,u),K=h=>{const u=r.get(c[h]?.asset);return!!u&&P(c[h],u)},j=h=>me(c[h],J()).z??Z[c[h].depth],ae=h=>M(h)&&!(c[h].keys??[]).some(u=>u.scale!==void 0),Ee=h=>Math.round(h*1e3)/1e3,Pt=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],O={canvas:n,sceneId:null,async show(h){const u=await za(h.bundle);if(m)return;s||(s=new Zo(n,u),N()),E={...h.look??{}},s.setLook(E);const f=La(h);await s.build(f,u),a=f,c=f.set.layers,w=(f.set.groundBands??[]).map(g=>({...g})),b={...f.set.skyLayer??{}},R=new Set,y=ft(h),o=h,r=new Map(u.assets.map(g=>[g.id,g])),A=u,$=Ta(u.base),$.prime(f.set.layers.map(g=>r.get(g.asset)).filter(Boolean)),t.editable&&!L&&(n.style.pointerEvents="auto",window.addEventListener("scene-object-selected",g=>{g.detail?.id!==`s25_${B}`&&(B=null)}),n.addEventListener("dragover",g=>{g.dataTransfer?.types?.includes(yn)&&(g.preventDefault(),g.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",g=>{const S=g.dataTransfer?.getData(yn);if(!S)return;g.preventDefault();const T=n.getBoundingClientRect();O.addLayer(S,{x:g.clientX-T.left,y:g.clientY-T.top})}),n.addEventListener("dblclick",()=>{const g=B??(L?.selected!=null?`layer-${L.selected}`:null),S=g&&O.editTarget(g);S&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:S}))}),L=Ea({canvas:n,host:e,stage:()=>s,alpha:{opaque:(g,S,T)=>$.opaque(g,S,T)},valueOf:(g,S)=>S==="z"?j(g):me(c[g],J())[S],onGround:M,byDistance:ae,groundUnder:(g,S,T,U)=>fn(s.pointerRay(g,S),K(U)?T:D=>s.groundHeightAt(D)+T),footY:g=>s.layerFootY(g)-(K(g)?0:s.groundHeightAt(j(g))),eye:Pt,onSettled:g=>O.settleBand(g),onEmpty:(g,S)=>z(g,S),onChange:(g,S,T)=>O.moveLayer(`layer-${g}`,S,T)})),(L?.selected??-1)>=c.length&&L.select(null),l=new Map(u.assets.map(g=>[g.id,g.height_m??1.7])),v=Number(h.narration_at_s)||0,i=xn(h),e.dataset.stage25dReady="1"},editTarget(h){const u=h==="sky"?o?.set?.sky?b:null:_(h)>=0?w[_(h)]:c[X(h)],f=h==="sky"?te():r.get(u?.asset);return!u||!f||!A?null:{id:`s25_${h}`,title:O.items().find(g=>g.id===h)?.label??ve({},f,(document.documentElement.lang||"en").slice(0,2)),original:A.base+f.file,state:u.edit_state??null,edited:!!u.src,el:e}},matches:h=>i===xn(h),adopt(h){const u=ft(h);if(u===y)return!1;y=u;const f=(g,S)=>{const T={...g};for(const U of Ot)S?.[U]===void 0?delete T[U]:T[U]=S[U];return T};return c=c.map((g,S)=>f(g,h.set?.layers?.[S])),w=w.map((g,S)=>f(g,h.set?.groundBands?.[S])),b=f(b,h.set?.skyLayer),o=h,q(),!0},setLayerProp(h,u,f){oe(h,{[u]:f})},setLayerKeys(h,u){const f=G(h);f&&JSON.stringify(f.keys??[])!==JSON.stringify(u)&&oe(h,{keys:u})},commitLayerProp(h,u,f){fe(h,{[u]:f})},readLayerProp(h,u){const f=G(h),g=f?u==="z"&&X(h)>=0?j(X(h)):u==="z"?me(f,J()).z??f.z:me(f,J())[u]:null;return Number.isFinite(g)?g:null},setHidden(h,u){X(h)<0&&_(h)<0||(R=new Set(u?[...R,h]:[...R].filter(f=>f!==h)),q())},update(h){d=null,p=Math.max(0,h)},play(h){d=()=>v+h()},moveLayer(h,u,f){window.__timelineKeying?.edit?.(`s25:${h}`,u,f,{flush:!1})||O.commitLayerProp(h,u,f)},select(h){B=F(h)?h:null,L?.select(X(h)>=0?X(h):null,!B),B&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${B}`}}))},get skySelected(){return B==="sky"},get backdrop(){return B},get selection(){return L?.selected??null},clearSelection(){L?.select(null)},atStart(){return p===0&&d===null&&R.size===0},layerInfo(h){const u=(D,Y)=>{const le=typeof D.motion=="string"?{kind:D.motion}:D.motion??{};return{kind:le.kind??Y?.motion??"none",amount:le.amount??1,speed:le.speed??1}};if(h==="sky"){const D=te();return D?{id:h,asset:D.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:ve({},D,(document.documentElement.lang||"en").slice(0,2)),file:b.src??`${A.base}${D.file}`,motion:u(b,D)}:null}if(_(h)>=0){const D=w[_(h)],Y=r.get(D.asset);return{id:h,asset:D.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:O.items().find(le=>le.id===h)?.label??"",file:D.src??(Y?`${A.base}${Y.file}`:null),motion:u(D,Y)}}const f=c[X(h)];if(!f)return null;const g=r.get(f.asset)??null,S=M(X(h)),T=!S||(f.scale??1)!==1||(f.keys??[]).some(D=>D.scale!==void 0),U=g?.layer==="bg"&&!g.tileable_x;return{id:h,asset:f.asset??null,depth:f.depth,figure:f.figure??null,role:g?.layer??null,ground:S,showScale:T,fields:S?["x","z",...T?["scale"]:[],"rotation","opacity"]:["x",...U?["z"]:[],"y","scale","rotation","opacity"],label:O.items().find(D=>D.id===h)?.label??ve(f,g,(document.documentElement.lang||"en").slice(0,2)),file:f.src??(g?`${A.base}${g.file}`:null),motion:u(f,g)}},setLayerMotion(h,u){const f=G(h);f&&fe(h,{motion:{...typeof f.motion=="object"?f.motion:{kind:f.motion},...u}})},reorderLayers(h,u,f){if(!M(u)){f(h,u,O.sceneId,null,null,null);return}const g=ge=>c[ge]?.z??Z[c[ge]?.depth],S=h.filter(ge=>ge===u||M(ge)),T=S.indexOf(u),U=S[T-1],D=S[T+1],Y=j(u),le=U===void 0?0:g(U),tt=D===void 0?1/0:g(D);if((U!==void 0||D!==void 0)&&(Y<le||Y>tt)){const ge=Tt(me(c[u],J()).x,Y),qn=U===void 0?tt/1.25:D===void 0?le*1.25:(le+tt)/2,Ve=Math.round(Math.min(Q.cells[1][1],Math.max(Q.cells[0][1],qn))*100)/100,nt=Pt(),Jn=(Ve-nt[1])/Math.max(.1,Y-nt[1]),Rt=ie=>Ee(Math.min(20,Math.max(.01,ie*Jn))),Qn=c[u].keys?.some(ie=>ie.z!==void 0||ie.scale!==void 0)?c[u].keys.map(ie=>({...ie,...ie.z!==void 0&&{z:Math.min(Q.cells[1][1],Math.max(Q.cells[0][1],Ee(ie.z+Ve-Y)))},...ie.scale!==void 0&&{scale:Rt(ie.scale)}})):null;f(h,u,O.sceneId,qe(_t(ge,Ve,nt)).x,Ve,Rt(c[u].scale??1),Qn);return}f(h,u,O.sceneId,c[u].x??.5,g(u),c[u].scale??1)},library(){if(!A)return null;const h=(document.documentElement.lang||"en").slice(0,2);return{bundle:A.bundle,assets:A.assets.map(u=>({id:u.id,layer:u.layer,band:jt(u),tags:u.tags??[],url:A.base+u.file,label:ve({},u,h)}))}},tiles:h=>Xn(h),seriesOfLayer(h){const u=r.get(c[X(h)]?.asset),f=Ie(u);if(!f||!A)return null;const g=(document.documentElement.lang||"en").slice(0,2),S=T=>({id:T.id,url:A.base+T.file,...Se(T)});return{series:f,asset:u.id,members:ua(A.assets,u).map(S),characters:fa(A.assets).map(T=>({series:T.series,url:A.base+T.asset.file,label:ve({},T.asset,g)}))}},async switchCharacter(h,u){const f=r.get(c[X(h)]?.asset),g=f&&A?pa(A.assets,f,u):null;g&&await O.swapAsset(h,g.id)},async swapAsset(h,u){if(h==="sky"){if(r.get(u)?.layer!=="sky"||te()?.id===u)return;await O.show({...o,set:{...ee(),sky:u}}),O.sceneId!=null&&t.onCommit?.(0,{sky:u},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const f=w[_(h)];if(f){const S=r.get(u);if(!S||!jt(S)||f.asset===u)return;const T=Number(h.slice(5)),U=w.map((D,Y)=>Y===T?{...D,asset:u}:D);await O.show({...o,set:{...ee(),groundBands:U}}),O.sceneId!=null&&t.onCommit?.(0,{band:{index:T,asset:u}},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),O.select(h);return}const g=X(h);g<0||!c[g]||!r.has(u)||c[g].asset===u||(c=c.map((S,T)=>T===g?{...S,asset:u}:S),await O.show({...o,set:ee()}),t.onCommit?.(g,{asset:u},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(h,u=null){const f=r.get(h);if(!f)return;const g=["mid","fg","near","bg","sky"].includes(f.layer)?f.layer:f.layer==="figure"?"fg":"mid",S=u?0:c.filter(U=>U.asset===h).length;let T={asset:h,depth:g,x:.5+.08*(S%5),scale:1};if(!(f.tileable_x||f.layer==="bg"||f.layer==="sky")){const U=u&&s?fn(s.pointerRay(u.x,u.y),P({},f)?0:Y=>s.groundHeightAt(Y)):null,D=qe(Ft(U??Tt(T.x,Z[g])));T={...T,...D,depth:Wt(D.z)}}c=[...c,T],await O.show({...o,set:ee()}),t.onCommit?.(c.length-1,{add:T},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L?.select(c.length-1,!0)},async settleBand(h){const u=c[h];if(!u||!M(h))return;const f=Wt(j(h));if(f===u.depth)return;c=c.map((S,T)=>T===h?{...S,depth:f}:S);const g=R;await O.show({...o,set:ee()}),R=g,q(),O.sceneId!=null&&t.onCommit?.(h,{depth:f},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L?.select(h,!1)},lookControls(){return vn.map(h=>{const[u,f,g]=Bo[h]??[0,1,.01];return{key:h,min:u,max:f,step:g,value:ce({...At,...E},h)}})},setLook(h,u){!vn.includes(h)||!Number.isFinite(u)||!s||(E={...E,[h]:u},s.setLook(E),t.onLook?.(h,u,O.sceneId))},async still(h=480){if(!s||!a||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const f=document.createElement("canvas");return f.width=h,f.height=Math.max(1,Math.round(h*n.height/n.width)),f.getContext("2d").drawImage(n,0,0,f.width,f.height),f.toDataURL("image/jpeg",.72)};return s.engine.resize(),se++,s.gridHidden=!0,new Promise(f=>{let g=0;const S=D=>{s.engine.onEndFrameObservable.remove(T),clearTimeout(U),s.gridHidden=--se>0,f(D)},T=s.engine.onEndFrameObservable.add(()=>{++g>=6&&S(u())}),U=setTimeout(()=>S(null),4e3)})},get config(){return o},figureBox(h){const u=c.find(T=>T.figure===h);if(!u?.asset)return null;const f=oa(a,u,l.get(u.asset)??1.7,J());if(!f)return null;const g=n.getBoundingClientRect(),S=g.width*.05;return new DOMRect(g.left+f.x*g.width-S/2,g.top+f.y*g.height,S,g.height*.08)},items:()=>{const h=(document.documentElement.lang||"en").slice(0,2),u=ca([...c.map((f,g)=>ve(f,r.get(f.asset),h)||`layer ${g+1}`),...w.map(f=>ve({},r.get(f.asset)??{id:f.asset},h))]);return[...c.map((f,g)=>({id:`layer-${g}`,label:u[g],icon:da(r.get(f.asset)),depth:f.depth,z:f.z??Z[f.depth],keys:f.keys??[]})),...w.map((f,g)=>({id:`band-${g}`,label:u[c.length+g],icon:"photo",depth:"bg",z:f.z,keys:f.keys??[],backdrop:!0})),...o?.set?.sky?[{id:"sky",label:Fa[h]??"Sky",icon:"cloud",depth:"sky",keys:b.keys??[],backdrop:!0}]:[],{id:"camera",label:"Camera",depth:null,keys:[]}]},destroy(){m=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}L?.destroy(),n.remove()}};return O}export{yn as DROP_TYPE,vn as LOOK_KEYS,Na as createStage25d,La as stageScene};
