import{m as Ms,c as Ss,M as st,S as He,R as Rn,C as xe,T as de,V as I,E as ie,a as Ct,b as Ee,P as As,d as Gt,e as Wt,f as Bn,g as Es,h as zs,i as Fs,j as In,U as Ts,H as _s,D as Ls}from"./babylon-DoYGJMOP.js";import{l as Ds}from"./config-qjtb2AOJ.js";import{handleCss as Os}from"./ArtworkOverlay-8BoE07FY.js";import{g as yt,c as Ps,w as jt,h as Cs,e as Rs}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-fhY1XOus.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-b8svR8Xt.js";import"./ambient-CEzLlAaX.js";const Be=new Set;let wt=!1;function Bs(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;Be.size&&Be.clear();let a=Vn(e,0,o,n,!0);const r=[];if(!a||a.next===a.prev)return r;let i=0,l=0,d=0;if(s&&(a=$s(e,t,a,n)),e.length>80*n){i=e[0],l=e[1];let c=i,v=l;for(let M=n;M<o;M+=n){const y=e[M],g=e[M+1];y<i&&(i=y),g<l&&(l=g),y>c&&(c=y),g>v&&(v=g)}d=Math.max(c-i,v-l),d=d!==0?32767/d:0}return bt(a,r,i,l,d),r}function Vn(e,t,n,s,o){let a=null;if(o===to(e,t,n,s)>0)for(let r=t;r<n;r+=s)a=Zt(r/s|0,e[r],e[r+1],a);else for(let r=n-s;r>=t;r-=s)a=Zt(r/s|0,e[r],e[r+1],a);return a&&Ie(a,a.next)&&(Ue(a),a=a.next),a}function be(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&(Be.size===0||!Be.has(s))&&(Ie(s,s.next)||H(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),wt=!0,Ue(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function bt(e,t,n,s,o){o&&Zs(e,n,s,o);let a=e,r=!1;for(;e.prev!==e.next;){const i=e.prev,l=e.next;if(H(i,e,l)<0&&(o?Vs(e,n,s,o):Is(e))){t.push(i.i,e.i,l.i),Ue(e),e=l,a=l;continue}if(e=l,e===a){if(wt=!1,e=be(e),wt){a=e;continue}if(!r){e=Us(e,t),a=e,r=!0;continue}Ns(e,t,n,s,o);break}}}function Is(e){const t=e.prev,n=e,s=e.next,o=t.x,a=n.x,r=s.x,i=t.y,l=n.y,d=s.y,c=Math.min(o,a,r),v=Math.min(i,l,d),M=Math.max(o,a,r),y=Math.max(i,l,d);let g=s.next;for(;g!==t;){if(g.x>=c&&g.x<=M&&g.y>=v&&g.y<=y&&!(o===g.x&&i===g.y)&&et(o,i,a,l,r,d,g.x,g.y)&&H(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Vs(e,t,n,s){const o=e.prev,a=e,r=e.next,i=o.x,l=a.x,d=r.x,c=o.y,v=a.y,M=r.y,y=Math.min(i,l,d),g=Math.min(c,v,M),x=Math.max(i,l,d),p=Math.max(c,v,M),b=At(y,g,t,n,s),F=At(x,p,t,n,s);let k=e.prevZ;for(;k&&k.z>=b;){if(k.x>=y&&k.x<=x&&k.y>=g&&k.y<=p&&k!==r&&!(i===k.x&&c===k.y)&&et(i,c,l,v,d,M,k.x,k.y)&&H(k.prev,k,k.next)>=0)return!1;k=k.prevZ}let z=e.nextZ;for(;z&&z.z<=F;){if(z.x>=y&&z.x<=x&&z.y>=g&&z.y<=p&&z!==r&&!(i===z.x&&c===z.y)&&et(i,c,l,v,d,M,z.x,z.y)&&H(z.prev,z,z.next)>=0)return!1;z=z.nextZ}return!0}function Us(e,t){let n=e,s=!1;do{const o=n.prev,a=n.next.next;$n(o,n,n.next,a,!1)&&Ve(o,a)&&Ve(a,o)&&(t.push(o.i,n.i,a.i),Ue(n),Ue(n.next),n=e=a,s=!0),n=n.next}while(n!==e);return s?be(n):n}function Ns(e,t,n,s,o){let a=e;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&Js(a,r)){let i=Hn(a,r);a=be(a,a.next),i=be(i,i.next),bt(a,t,n,s,o),bt(i,t,n,s,o);return}r=r.next}a=a.next}while(a!==e)}let kt=!1;function $s(e,t,n,s){const o=[];for(let a=0,r=t.length;a<r;a++){const i=t[a]*s,l=a<r-1?t[a+1]*s:e.length,d=Vn(e,i,l,s,!1);d===d.next&&Be.add(d),o.push(qs(d))}o.sort(Hs),Ws(e.length/s,t.length),Nn(n,n),kt=!0;for(let a=0;a<o.length;a++)n=Gs(o[a],n);return kt=!1,be(n)}function Hs(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function Gs(e,t){const n=Ys(e,t);if(!n)return t;const s=Hn(n,e),o=s.next;return Nn(n,o.next),be(s,s.next),be(n,n.next)}const Un=16;let N=new Float64Array(0),Qe=0;const Mt=[],St=[];function Ws(e,t){const n=Math.ceil((e+2*t)/Un)+t+2;N.length<n*4&&(N=new Float64Array(n*4)),Qe=0}function Nn(e,t){let n=e;do{const s=Qe++;Mt[s]=n;let o=1/0,a=1/0,r=-1/0,i=-1/0,l=0;do{const c=n.next;n.z=s,n.x<o&&(o=n.x),n.x>r&&(r=n.x),n.y<a&&(a=n.y),n.y>i&&(i=n.y),c.x<o&&(o=c.x),c.x>r&&(r=c.x),c.y<a&&(a=c.y),c.y>i&&(i=c.y),n=c}while(++l<Un&&n!==t);St[s]=n;const d=s*4;N[d]=o,N[d+1]=a,N[d+2]=r,N[d+3]=i}while(n!==t)}function js(e,t){const n=e.z*4;t.x<N[n]&&(N[n]=t.x),t.y<N[n+1]&&(N[n+1]=t.y),t.x>N[n+2]&&(N[n+2]=t.x),t.y>N[n+3]&&(N[n+3]=t.y)}function Yt(e){let t=St[e];for(;t.prev.next!==t;)t=t.next;return St[e]=t,t}function Kt(e){let t=Mt[e];for(;t.prev.next!==t;)t=t.next;return Mt[e]=t,t}function Ys(e,t){let n=t;const s=e.x,o=e.y;let a=-1/0,r;if(Ie(e,n))return n;for(let M=0,y=0;M<Qe;M++,y+=4){if(o<N[y+1]||o>N[y+3]||N[y]>s||N[y+2]<=a)continue;const g=Yt(M);n=Kt(M);do{if(n.prev.next===n){if(Ie(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const x=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(x<=s&&x>a&&(a=x,r=n.x<n.next.x?n:n.next,x===s))return r}}n=n.next}while(n!==g)}if(!r)return null;const i=r.x,l=r.y,d=Math.min(o,l),c=Math.max(o,l);let v=1/0;for(let M=0,y=0;M<Qe;M++,y+=4){if(N[y+2]<i||N[y]>s||N[y+3]<d||N[y+1]>c)continue;const g=Yt(M);n=Kt(M);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&et(o<l?s:a,o,i,l,o<l?a:s,o,n.x,n.y)){const x=Math.abs(o-n.y)/(s-n.x);(Ve(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(x<v||x===v&&(n.x>r.x||n.x===r.x&&Ks(r,n)))&&(r=n,v=x)}n=n.next}while(n!==g)}return r}function Ks(e,t){return H(e.prev,e,t.prev)<0&&H(t.next,e,e.next)<0}const re=[];let Fe=[],ye=new Uint32Array(0),Te=new Uint32Array(0);const _e=new Uint32Array(256);function Zs(e,t,n,s){let o=e,a=0;do o.z=At(o.x,o.y,t,n,s),re[a++]=o,o=o.next;while(o!==e);Xs(a);let r=null;for(let i=0;i<a;i++){const l=re[i];l.prevZ=r,r&&(r.nextZ=l),r=l}r.nextZ=null}function Xs(e){if(e<=32){for(let t=1;t<e;t++){const n=re[t],s=n.z;let o=t-1;for(;o>=0&&re[o].z>s;)re[o+1]=re[o],o--;re[o+1]=n}return}ye.length<e&&(ye=new Uint32Array(e),Te=new Uint32Array(e),Fe=new Array(e));for(let t=0;t<e;t++)ye[t]=re[t].z;je(e,re,ye,Fe,Te,0),je(e,Fe,Te,re,ye,8),je(e,re,ye,Fe,Te,16),je(e,Fe,Te,re,ye,24)}function je(e,t,n,s,o,a){_e.fill(0);for(let i=0;i<e;i++)_e[n[i]>>>a&255]++;let r=0;for(let i=0;i<256;i++){const l=_e[i];_e[i]=r,r+=l}for(let i=0;i<e;i++){const l=n[i],d=_e[l>>>a&255]++;s[d]=t[i],o[d]=l}}function At(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function qs(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function et(e,t,n,s,o,a,r,i){return(o-r)*(t-i)>=(e-r)*(a-i)&&(e-r)*(s-i)>=(n-r)*(t-i)&&(n-r)*(a-i)>=(o-r)*(s-i)}function Js(e,t){const n=Ie(e,t)&&H(e.prev,e,e.next)>0&&H(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Ve(e,t)&&Ve(t,e)&&(H(e.prev,e,t.prev)!==0||H(e,t.prev,t)!==0))&&!Qs(e,t)&&(n||eo(e,t))}function H(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Ie(e,t){return e.x===t.x&&e.y===t.y}function $n(e,t,n,s,o=!0){const a=H(e,t,n),r=H(e,t,s),i=H(n,s,e),l=H(n,s,t);return(a>0&&r<0||a<0&&r>0)&&(i>0&&l<0||i<0&&l>0)?!0:o?!!(a===0&&Ye(e,n,t)||r===0&&Ye(e,s,t)||i===0&&Ye(n,e,s)||l===0&&Ye(n,t,s)):!1}function Ye(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Qs(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let r=e;do{const i=r.next;if(r.x>s&&i.x>s||r.x<n&&i.x<n||r.y>a&&i.y>a||r.y<o&&i.y<o){r=i;continue}if(r.i!==e.i&&i.i!==e.i&&r.i!==t.i&&i.i!==t.i&&$n(r,i,e,t))return!0;r=i}while(r!==e);return!1}function Ve(e,t){return H(e.prev,e,e.next)<0?H(e,t,e.next)>=0&&H(e,e.prev,t)>=0:H(e,t,e.prev)<0||H(e,e.next,t)<0}function eo(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const r=n.next;n.y>a!=r.y>a&&o<(r.x-n.x)*(a-n.y)/(r.y-n.y)+n.x&&(s=!s),n=r}while(n!==e);return s}function Hn(e,t){const n=Et(e.i,e.x,e.y),s=Et(t.i,t.x,t.y),o=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,a.next=s,s.prev=a,s}function Zt(e,t,n,s){const o=Et(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function Ue(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),kt&&js(e.prev,e.next)}function Et(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function to(e,t,n,s){let o=0;for(let a=t,r=n-s;a<n;a+=s)o+=(e[r]-e[a])*(e[a+1]+e[r+1]),r=a;return o}Object.assign(window,{BABYLON:{...Ss,...Ms},earcut:Bs});(()=>{const e=`
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
    }`})();const no=new WeakMap;function so(e){return no.get(e)?.rtt??null}const oo=450,Xt=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],qt=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],Jt={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},ao={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function ro(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),r=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(k=>k.name!=="sky-cloud"&&!(k.metadata&&k.metadata.noGBuffer)))}),i=a.getGBuffer().textures,l=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],d=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],c=k=>new BABYLON.Vector2(1/k.width,1/k.height),v=new BABYLON.Matrix,M=["invView","tanHalf","resolution","skyDepth"],y=["depthSampler","normalSampler"];function g(k,z){t.getViewMatrix().invertToRef(v);const U=Math.tan(t.fov/2);k.setMatrix("invView",v),k.setVector2("tanHalf",new BABYLON.Vector2(U*z.width/z.height,U)),k.setVector2("resolution",new BABYLON.Vector2(z.width,z.height)),k.setFloat("skyDepth",oo),k.setTexture("depthSampler",l),k.setTexture("normalSampler",d)}const x=new BABYLON.PostProcess("wash","wash",["texel","radius",...M],y,1,t);x.onApply=k=>{g(k,x),k.setVector2("texel",c(x)),k.setFloat("radius",n.num("wash"))};const p=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...Xt,...M],["aquarelSampler",...y],1,t);p.onApply=k=>{g(k,p),k.setVector2("texel",c(p));const z=n.texture();k.setFloat("useTex",z?1:0),k.setTexture("aquarelSampler",z||s),Xt.forEach(U=>k.setFloat(U,n.num(U)))};const b=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...qt,...M],["washSampler","animeSampler",...y],1,t);b.onApply=k=>{g(k,b),k.setTextureFromPostProcessOutput("washSampler",x),k.setTexture("animeSampler",so(e)||o),k.setVector2("texel",c(b)),qt.forEach(z=>k.setFloat(z,n.num(z))),k.setColor3("inkColor",BABYLON.Color3.FromArray(Jt[n.inkColor()]||Jt["blue-grey"]))};const F=[x,p,b];return{dispose(){F.forEach(k=>k.dispose(t)),e.onBeforeRenderObservable.remove(r),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const Q={sky:380,bg:70,mid:22,fg:7,near:3.5},B={x:0,y:1.6,z:0,fov:50},ot=-2,Gn=16/9,Wn=.42,it=1.6,io=3,jn=e=>io*he(e),lo=(e,t)=>t*e,co=(e,t,n,s)=>lo(e,t)-(1-s)*n,Ne=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,ho=999,uo=1e3,fo=.02,Yn=2,Rt=120,Kn=.05,fe=e=>e>Math.PI?e*Math.PI/180:e,he=(e,t=B.fov,n=Gn)=>2*e*Math.tan(fe(t)/2)*n;function Qt(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const en=e=>e.z??Q[e.depth],po=e=>Math.min(1,Math.max(0,(e-Q.mid)/(Q.bg-Q.mid)));function zt(e,t){return e<=Q.bg||t===0?po(e)*t:B.y+(t-B.y)*e/Q.bg}const mo=(e,t)=>t?e+t.h*(1-t.top):e,go=["ground","path","field","ramp","water"],we=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>go.includes(t)),xo=2,Ft=e=>we(e)&&e.w/Math.max(1,e.h)>=xo,Zn=(e,t,n,s)=>Math.min(0,co(e,t,n,s)),tn=[2,2e3],vo=4,nn=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??B.z,n?.to?.z??B.z),B.z);function yo(e,t,n,s,o,a,r=B.z){const i=ge({...e},t),l=Math.min(tn[1],Math.max(tn[0],i.z??e.z)),d=Math.max(l,r+vo),c=jn(d)/s,v=o*c*i.scale;return{z:d,h:v,w:s*c*Math.max(1,i.scale),sx:c*Math.max(1,i.scale),sy:c*i.scale,x:(i.x-.5)*he(d),y:Zn(d,n,v,a),alphaIndex:Ne(l),opacity:i.opacity}}const Xn=(e,t)=>!!e.flat||t.layer==="ground";function Le(e,t,n,s=0,o=s){const a=t.depth,r=en(t)-n*Kn,i=he(r),l=a==="sky"?n*2+1:Ne(r);if(e.layer==="sky"){const p=i*it,b=p/Gn,F=-b*.12+(t.y??0);if(e.tileable_x)return{x:0,y:F,z:r,w:p,h:b,uRepeat:p/(b*(e.w/e.h)),alphaIndex:l,rotation:0};const k=Math.max(p/e.w,b/e.h);return{x:0,y:F,z:r,w:e.w*k,h:e.h*k,uRepeat:1,alphaIndex:l,rotation:0}}const d=e.layer==="bg"&&!e.tileable_x?i*it*e.h/e.w:0,c=Math.max(e.height_m*(t.scale??1),d),v=c*(e.w/e.h),M=e.tileable_x?Math.max(v,i*it):v,y=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?a==="bg"?s:0:we(e)?0:zt(en(t),o),x=a==="sky"?r*Math.tan(fe(B.fov)/2)*.45:g;return{x:y,y:x+(t.y??0),z:r,w:M,h:c,uRepeat:e.tileable_x?M/v:1,alphaIndex:l,rotation:t.rotation??0}}function wo(e,t,n=0,s=Wn,o=ot){const a=.5/Math.tan(fe(B.fov)/2),r=.5+a*Math.tan(-o*Math.PI/180),i=Q.bg-n*Kn,l=B.y+(r-s)*i/a;return Math.round((l-t*(1-e))*10)/10}const Ke=e=>e-bo,bo=.002,sn={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},qn=(e,t)=>(sn[e??"inOut"]??sn.inOut)(Math.min(1,Math.max(0,t))),Ce=(e,t,n)=>e+(t-e)*n,Jn=e=>e.dur_s??(e.camera&&To(e)||e.est_s||8);function Qn(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function es(e,t,n){if(!e)return{...B,fov:fe(B.fov)};const s=qn(e.ease,n>0?t/(e.dur_s??n):1),o={...B,...e.from},a={...o,...e.to};return{x:Ce(o.x,a.x,s),y:Ce(o.y,a.y,s),z:Ce(o.z,a.z,s),fov:Ce(fe(o.fov),fe(a.fov),s)}}const ko=["x","y","z","scale","opacity","rotation"];function ge(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const a of ko){const r=s.filter(M=>M[a]!==void 0).sort((M,y)=>M.t-y.t);if(!r.length)continue;const i=r[0],l=r[r.length-1];if(t<=i.t){o[a]=i[a];continue}if(t>=l.t){o[a]=l[a];continue}const d=r.findIndex(M=>M.t>t),c=r[d-1],v=r[d];o[a]=Ce(c[a],v[a],qn("inOut",(t-c.t)/(v.t-c.t)))}return o}const Mo={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},ts=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function on(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??ts(e),amount:n.amount??1,speed:n.speed??1}}const So=.25,Ao=2e3,Eo=250,Me={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},an={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function zo(e,t,n,s){const o=i=>{const l=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:l,lastUp:i===-1?n:e.lastUp,locked:e.locked||l>=Me.lockFlips&&i===1}};if(t<Me.downFps)return s?o(1):{...e,fast:0};if(t<Me.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=Me.upWindows&&n-e.lastChange>=Me.upAfterChangeMs&&n-e.lastUp>=Me.upEveryMs?o(-1):{...e,fast:a}}function Fo(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*So)}function To(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const rn={breath_m:.05,breath_s:7},_o=1.5;function Lo(e,t,n={}){const s=n.breath_m??rn.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??rn.breath_s),a=Math.min(1,t/_o),r=a*a*(3-2*a);return{...e,x:e.x+s*r*Math.sin(o*t),y:e.y+s*.5*r*Math.sin(2*o*t)}}async function Do(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const Oo=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Ae(e,t,n){if(t.asset){const r=e.assets.find(i=>i.id===t.asset);if(r)return r}const s=Oo(t.need??t.asset??"");if(!s.length)return null;let o=null,a=[0,0,0];for(const r of[...e.assets].sort((i,l)=>i.id.localeCompare(l.id))){const i=s.filter(d=>r.tags.some(c=>c.toLowerCase()===d)).length;if(!i)continue;const l=[i,n&&r.layer===n?1:0,r.qa?.score??0];(!o||l[0]>a[0]||l[0]===a[0]&&(l[1]>a[1]||l[1]===a[1]&&l[2]>a[2]))&&(o=r,a=l)}return o}const Se="#f6f5ee",Po=.22,Co=(e,t)=>e.layer==="bg"?t.feather??Po:0,lt=.6,Tt=12;function ns(e,t){const n=t.paper??Se,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(r=>r.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((r,i)=>r.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const a=Ae({...t,assets:o},{asset:s},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function Ro(e,t,n,s=.08){return ss(e,t,n,1-s,1)}function ss(e,t,n,s,o){const a=Math.max(0,Math.floor(n*s)),r=Math.min(n,Math.max(a+1,Math.ceil(n*o))),i=[[],[],[]],l=Math.max(1,Math.floor(t*(r-a)/2e4));for(let c=a*t;c<r*t;c+=l){const v=c*4;e[v+3]<200||(i[0].push(e[v]),i[1].push(e[v+1]),i[2].push(e[v+2]))}if(!i[0].length)return null;const d=c=>{const v=[...c].sort((M,y)=>M-y);return v[v.length>>1]/255};return[d(i[0]),d(i[1]),d(i[2])]}const Re=32,Bo=(e,t,n)=>Array.from({length:Re},(s,o)=>ss(e,t,n,o/Re,(o+1)/Re)),Io=(e,t)=>e[Math.min(Re-1,Math.max(0,Math.floor((1-t)*Re)))]??null;function Vo(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=o){const r=a*4;if(e[r+3]<230)continue;const i=(.299*e[r]+.587*e[r+1]+.114*e[r+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((a,r)=>a-r),s[s.length>>1])}function Uo(e,t,n){const s=[];for(let o=0;o<t;o++)for(let a=0;a<n;a++)if(e[(a*t+o)*4+3]>128){s.push(a/n);break}return s.length?(s.sort((o,a)=>o-a),s[s.length>>1]):0}function No(e,t,n){for(let s=0;s<n;s++){let o=0;for(let a=0;a<t;a++)e[(s*t+a)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const $o=1.6,Ho=.12;function ln(e,t,n,s){const o=e.layer==="figure",a=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),r=a*Ho*s/$o;return o?{w:a,d:Math.min(r,a*.5)}:{w:a,d:Math.min(Math.max(r,a*.3),a*3)}}const Go=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,De=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},_t=6;function os(e,t){const n=t.assets.filter(a=>a.layer==="ground"),s=(e.groundSlots??[]).map(a=>({asset:n.find(r=>r.id===a.asset),from:Math.max(0,Number(a.from_m)||0)})).filter(a=>!!a.asset).sort((a,r)=>a.from-r.from).slice(0,_t);if(s.length)return s.map((a,r)=>r===0?{...a,from:0}:a);const o=ns(e,t);return o.kind==="asset"?[{asset:o.asset,from:0}]:[]}const Wo=(e,t)=>Math.max(0,e.reduce((n,s,o)=>t>=s.from?o:n,0)),Bt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,as=Bt;ie.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;const jo=[1,2,3,4,5].map(e=>`
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
  ${Bt}
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
      c = slotTile(tex, slotTiles[0]); own = slotColour[0];${jo}
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
  ${Bt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const Yo=e=>e?de.WRAP_ADDRESSMODE:de.MIRROR_ADDRESSMODE;function Ko(e){const t=st.CreateGround("ground",{width:2400,height:2400},e),n=new He("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tileScale","wash","grainSize","slotCount","slotFrom","slotTiles","slotColour","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","tex1","tex2","tex3","tex4","tex5","nearTex"],needAlphaBlending:!0}),s=new Rn(new Uint8Array([255,255,255,255]),1,1,xe.TEXTUREFORMAT_RGBA,e);for(const o of Oe)n.setTexture(o,s);return n.setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0).setFloat("tileScale",1).setFloat("wash",.5).setFloat("grainSize",1),t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=ho,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){const a=o.slots.slice(0,Oe.length);a.forEach(i=>{i.tex.wrapU=de.WRAP_ADDRESSMODE,i.tex.wrapV=de.WRAP_ADDRESSMODE}),Oe.forEach((i,l)=>n.setTexture(i,a[l]?.tex??s));const r=(i,l)=>Oe.map((d,c)=>a[c]?i(a[c]):l);n.setFloat("useTex",a.length?1:0).setFloat("slotCount",a.length).setFloats("slotFrom",r(i=>i.from,1e6)).setFloats("slotTiles",r(i=>i.tile||Tt,Tt)).setArray3("slotColour",Oe.flatMap((i,l)=>a[l]?.colour??o.base)).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",I.FromArray(o.base)).setVector3("horizonTint",I.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tileScale",o.tileScale).setFloat("wash",o.wash).setFloat("grainSize",o.grainSize)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=Yo(o.tileable),o.tex.wrapV=de.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}const Oe=["tex","tex1","tex2","tex3","tex4","tex5"];let Zo=0;function cn(e,t,n,s,o){const a=st.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(a.rotation.x=Math.PI/2,o){const[i,l]=o.dir,d=Math.hypot(i,l)||1;a.rotation.y=Math.atan2(i/d,l/d),a.position.set(i/d*o.length*.42,.015,l/d*o.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const r=new He(a.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return r.alphaMode=xe.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,r.setFloat("seed",Zo++*7.31%97).setFloat("opacity",0),a.material=r,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:i=>{r.setFloat("opacity",i),a.isVisible=i>.001}}}ie.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ie.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${as}
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
  }`;function rs(e,t,n,s){const o=st.CreatePlane(e,{size:1},n),a=new He(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=xe.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,o.material=a,o.billboardMode=Ct.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:a}}const is=9,Xo=9;function qo(e,t,n,s){const o=Array.from({length:is},(a,r)=>{const i=rs(`smoke:${r}`,"stagePuff",e,s);return i.mat.setFloat("seed",r*3.7),i});return{update(a,r){o.forEach(({mesh:i,mat:l},d)=>{const c=Jo(a,d),v=n*(.6+3.2*c);i.scaling.setAll(v),i.position.set(t.x+n*1.6*c*c+.15*n*Math.sin(d*2.1+a*.3),t.y+n*(.4+7*c),t.z),l.setFloat("alpha",r*.7*Math.sin(Math.PI*c)),i.isVisible=r>.001})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const Jo=(e,t)=>((e/Xo+t/is)%1+1)%1,ct=40,hn=16;function Qo(e){const t=(e%ct+ct)%ct;return t<hn?t/hn:null}function ea(e,t,n,s){const o=Array.from({length:6},(a,r)=>rs(`bird:${r}`,"stageBird",e,s));return{update(a,r){const i=Qo(a),l=Math.round(2+r*4);o.forEach(({mesh:d,mat:c},v)=>{if(d.isVisible=r>.001&&i!==null&&v<l,!d.isVisible||i===null)return;const M=v*.025;d.position.set((i-M-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*i,t+v*1.5),d.scaling.setAll(3.2),c.setFloat("alpha",.85*Math.min(1,r*2)).setFloat("flap",Math.sin(a*7+v*1.3))})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const un=["fire","hearth","chimney","smoke"],ta=e=>e.id.split(/[-_]/).some(t=>un.includes(t))||e.tags.some(t=>un.includes(t.toLowerCase())),ht=e=>e[0].toUpperCase()+e.slice(1),na=e=>({fade:`lineFade${ht(e)}`,thin:`lineThin${ht(e)}`,haze:`haze${ht(e)}`}),tt={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:ot,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,groundWash:.5,groundGrain:1,grass:.5,grassSway:.15,horizonBushes:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},sa=[1.05,1,.9],oa=[.88,.93,1.05],aa=.35;function ra(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:X(e,"edgeSoft"),footM:t==="standing"?aa:0,grounding:t==="figure"?0:X(e,"grounding"),grass:t==="figure"?0:X(e,"grassOverlap"),light:o?0:X(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?X(e,"cloudDrift"):0,footTint:s}}const ls=[.93,.86,.74],dn=e=>({paper:X(e,"sheetPaper"),grain:X(e,"sheetGrain"),patches:X(e,"sheetPatches"),wash:X(e,"sheetWash"),washColour:ls}),ia={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01],groundGrain:[.5,3,.05]},la=Object.fromEntries(Object.keys(tt).map(e=>[e,ia[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ae=(e,t)=>X(e,t),X=(e,t)=>{const n=Number(e[t]??tt[t]);return Number.isFinite(n)?n:tt[t]};function ut(e,t){const n=na(t);return{fade:X(e,n.fade),thin:X(e,n.thin),haze:X(e,n.haze),brown:X(e,"lineBrown"),ink:X(e,"lineInk"),norm:X(e,"lineNorm")}}const ca=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),dt=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),Ze=(e,t,n,s,o)=>{const a=s*(1080/o);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function ha(e,t,n){const s=new I(B.x,B.y,B.z),o=Ee.RotationX(e*Math.PI/180),r=Ee.LookAtLH(s,s.add(I.TransformNormal(new I(0,0,1),o)),I.TransformNormal(I.Up(),o)).multiply(Ee.PerspectiveFovLH(fe(B.fov),t,.1,2e3));return{vp:r,top:I.TransformCoordinates(new I(0,0,n),r).y}}ie.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function ua(e,t){const n=new As("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",I.FromArray(ls))},n}const ke=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,da=12;function cs(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,a=((t?.offset??0)+n*o)*(e.fps??da),r=Math.floor(a+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,r)):(r%s+s)%s}function fa(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const pa=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,ma=`
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
  ${as}
  ${pa}
  ${ma}
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
  }`;const fn=new WeakMap,hs=new Map,us=new Map,Lt=new Map,ds=new Map,Je=new Map;function Pe(e,t){const n=fn.get(t)??new Map;fn.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((a,r)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>r(new Error(`layer image ${e} did not load`)),i.onload=()=>{const l=document.createElement("canvas");l.width=i.naturalWidth,l.height=i.naturalHeight;const d=l.getContext("2d",{willReadFrequently:!0});d.drawImage(i,0,0);const c=d.getImageData(0,0,l.width,l.height).data,v=Ro(c,l.width,l.height);v&&hs.set(e,v),Je.set(e,Bo(c,l.width,l.height)),us.set(e,No(c,l.width,l.height)),Lt.set(e,Uo(c,l.width,l.height));const M=Vo(c,l.width,l.height);M!==null&&ds.set(e,M);for(let g=0;g<c.length;g+=4){const x=c[g+3]/255;c[g]=Math.round(c[g]*x),c[g+1]=Math.round(c[g+1]*x),c[g+2]=Math.round(c[g+2]*x)}const y=new Rn(c,l.width,l.height,xe.TEXTUREFORMAT_RGBA,t,!0,!1,de.TRILINEAR_SAMPLINGMODE);y.anisotropicFilteringLevel=8,y.wrapV=de.CLAMP_ADDRESSMODE,a(y)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const ft=24;function ga(e,t,n,s,o){const[a,r]=t.anchor??[.5,1],i=[],l=[],d=[];for(let v=0;v<=ft;v++){const M=v/ft;for(const y of[0,1])i.push((y-a)*n,(r-M)*s,0),l.push(y,M);if(v<ft){const y=v*2;d.push(y,y+2,y+1,y+1,y+2,y+3)}}const c=new Ct(e,o);return Object.assign(new Bn,{positions:i,uvs:l,indices:d}).applyToMesh(c),c}let xa=0;function pn(e,t,n,s,o,a){const r=ga(`layer:${e.id}`,e,n,s,a),i=new He(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?de.WRAP_ADDRESSMODE:de.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=xe.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const l=xa++*2.39996%(Math.PI*2),d=e.anchor?.[1]??1;return i.setFloat("phase",l).setFloat("height",s*d).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new Gt(0,0,1,1)),r.material=i,r.metadata={noGBuffer:!0,painted:!0},r.isPickable=!1,{mesh:r,material:i,setMotion:c=>{i.setFloat("kind",Mo[c.kind]??0).setFloat("amount",c.amount).setFloat("speed",c.speed)},setOpacity:c=>{i.setFloat("opacity",c),r.isVisible=c>.001},setLine:(c,v,M,y)=>{i.setFloat("inkMul",v).setFloat("lineFade",c.fade).setFloat("lineThin",c.thin).setFloat("haze",c.haze).setFloat("lineBrown",c.brown),i.setVector2("pxUV",new Wt(M[0],M[1])).setVector3("hazeTint",I.FromArray(y))},setPaper:(c,v)=>{i.setFloat("paper",c.paper).setFloat("grain",c.grain).setFloat("patches",c.patches).setFloat("wash",c.wash),i.setVector3("washColour",I.FromArray(c.washColour)).setVector2("grainUV",new Wt(v[0],v[1]))},setBottomFade:c=>{i.setFloat("bottomFade",c)},setCell:c=>{i.setVector4("cell",new Gt(c[0],c[1],c[2],c[3]))},setAlive:c=>{i.setFloat("edgeSoft",c.edgeSoft).setFloat("footM",c.footM).setFloat("grounding",c.grounding).setFloat("grass",c.grass).setFloat("light",c.light).setFloat("sunSide",c.sunSide).setFloat("drift",c.drift),i.setVector3("footTint",I.FromArray(c.footTint)).setVector3("sunColour",I.FromArray(sa)).setVector3("shadeColour",I.FromArray(oa))},setGroundLine:c=>{i.setFloat("groundLine",c)},setFeather:(c,v)=>{i.setFloat("feather",Math.max(0,Math.min(1,c))),v&&i.setVector3("featherTint",I.FromArray(v))}}}const fs=600,ps=1.5,va=2,ya=.8,wa=["grass","heather","reeds","shrub","bramble","juniper","hazel","meadow","fern","tree","bush","sedge","flower"],ba=["shrub","tree","bush","bramble","hedge"],ka=["ground"];function Ma(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function mn(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}const Sa=e=>e.layer!=="ground"&&e.layer!=="sky"&&e.layer!=="bg"&&e.layer!=="figure"&&!e.tileable_x&&!Ft(e)&&e.kind!=="animation"&&e.tags.some(t=>wa.includes(t));function Aa(e){const t=e.assets.filter(n=>n.kind==="sheet");return t.length?t.flatMap(n=>(n.cells??[]).map(s=>({asset:n.id,file:n.file,tags:s.tags,height_m:s.height_m,aspect:s.rect[2]*n.w/Math.max(1,s.rect[3]*n.h),cell:s.rect}))):e.assets.filter(Sa).map(n=>({asset:n.id,file:n.file,tags:n.tags,height_m:n.height_m,aspect:n.w/Math.max(1,n.h),cell:[0,0,1,1]}))}const ms=(e,t)=>e.tags.some(n=>!ka.includes(n)&&t.includes(n)),Ea=(e,t)=>e.filter(n=>n.height_m<=ps&&!n.tags.includes("tree")&&ms(n,t)),za=["grass","meadow","heath","field","hedge","forest","marsh","wet","edge","heather"];function Fa(e,t){const n=e.filter(o=>o.height_m>ps&&o.tags.some(a=>ba.includes(a))),s=n.filter(o=>ms(o,t));return s.length||!t.some(o=>za.includes(o))?s:n.filter(o=>!o.tags.includes("tree"))}function gn(e){const t=Math.min(fs,Math.max(0,Math.round(e.count)));if(!e.picks.length||!t)return[];const n=Ma(e.seed),s=Math.max(e.from,e.front+va),o=Math.max(s,e.to),a=[];for(let r=0;r<t;r++){const i=s*Math.pow(o/s,n()),l=Math.floor(n()*e.picks.length);a.push({z:i,x:(n()*2-1)*ya*he(i),h:e.picks[l].height_m*(.7+.6*n())*(e.size??1),pick:l,phase:n()*Math.PI*2})}return a.sort((r,i)=>i.z-r.z)}const gs=[...Array.from({length:16},(e,t)=>2.5*Math.pow(1.4,t+1)),1/0],xn=e=>gs.findIndex(t=>e<t);ie.ShadersStore.stageStrewnVertexShader=`
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
  }`;function Ta(e,t,n,s,o,a,r){const i=new He(`strewn:${r}`,e,"stageStrewn",{attributes:["position","quad","uv","extra"],uniforms:["viewProjection","camPos","time","sway","land","haze","opacity"],samplers:["tex"],needAlphaBlending:!0});i.alphaMode=xe.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setTexture("tex",t).setVector3("haze",I.FromArray(a));const l=new Map;for(const c of s)l.set(xn(c.z),[...l.get(xn(c.z))??[],c]);const d=[...l].map(([c,v])=>{const M=[],y=[],g=[],x=[],p=[];v.forEach((F,k)=>{const z=n[F.pick],[U,G,j,ee]=z.cell,$=F.h*z.aspect,se=o(F.z);for(const[oe,Y]of[[-.5,0],[.5,0],[.5,1],[-.5,1]])M.push(F.x,0,F.z),y.push(oe,Y,F.h,$),g.push(U+(oe+.5)*j,G+(1-Y)*ee),x.push(F.phase,se[0],se[1],se[2]);p.push(k*4,k*4+1,k*4+2,k*4,k*4+2,k*4+3)});const b=new Ct(`strewn:${r}:${c}`,e);return Object.assign(new Bn,{positions:M,indices:p}).applyToMesh(b),b.setVerticesData("quad",y,!1,4),b.setVerticesData(Es.UVKind,g,!1,2),b.setVerticesData("extra",x,!1,4),b.material=i,b.alphaIndex=Ne(Math.min(gs[c],2e3)),b.alwaysSelectAsActiveMesh=!0,b.isPickable=!1,b.metadata={noGBuffer:!0},b});return{meshes:d,update(c,v,M,y,g){i.setFloat("time",c).setFloat("sway",v).setFloat("land",M).setFloat("opacity",g).setVector3("camPos",y),d.forEach(x=>{x.isVisible=g>.001})},dispose(){d.forEach(c=>c.dispose()),i.dispose()}}}const Xe=[3,60],vn=[60,300],_a=80,La=1.8,Da=(e,t)=>t??e.asset.tags;function yn(e){const t=[],n=Math.log(Xe[1]/Xe[0]);e.slots.forEach((o,a)=>{const r=Math.max(Xe[0],o.from),i=Math.min(Xe[1],e.slots[a+1]?.from??1/0);if(i<=r)return;const l=Ea(e.sprites,Da(o,e.bandTags)),d=e.grass*fs*(Math.log(i/r)/n);t.push({picks:l,clumps:gn({picks:l,count:d,from:r,to:i,front:e.front,seed:mn(`${e.sceneId}:grass:${a}`)})})});const s=e.slots[e.slots.length-1];if(s&&!e.bandTags){const o=Fa(e.sprites,s.asset.tags);t.push({picks:o,horizon:!0,clumps:gn({picks:o,count:e.bushes*_a,from:vn[0],to:vn[1],front:e.front,size:La,seed:mn(`${e.sceneId}:horizon`)})})}return t.filter(o=>o.clumps.length)}const Dt={...ao["History Lines pencil"],paper:.35,granulation:.2,...tt},Oa=new In(.937,.914,.863,1),Pa=.7,Ca=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class Ra{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new zs(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Fs(this.engine),this.scene.clearColor=Oa,this.camera=new Ts("house",new I(0,1.6,0),this.scene),this.camera.rotation.set(ot*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new _s("sky",new I(0,1,0),this.scene).intensity=.7,new Ls("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=Ko(this.scene),this.ground.set(this.groundLook([],null,n)),this.birds=ea(this.scene,Mn,he(Mn),Na),ro(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),ua(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=De(Se);strip=null;nearTex=null;bands=[];strewn=[];strewSrc=null;strewKey="";smoke=[];birds;footTint=De(Se);nearAsset=null;hazeTint=De(Se);sceneLib;buildToken=0;look={...Dt};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=an;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return Fo(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=an,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>Eo;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Ao)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=zo(this.tier,o,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...Dt,...t??{}}}groundPoint(t,n){const s=Q[n];return new I((t-.5)*he(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],a=[];t.set.sky&&a.push({layer:bn(t),order:0,index:-1});const r={sky:1};t.set.layers.forEach((w,P)=>{const q=w.depth;r[q]=r[q]??0,a.push({layer:w,order:r[q]++,index:P})});const i=[];await Promise.all(a.map(async({layer:w,order:P,index:q})=>{let R=Ae(n,w,w.depth);if(!R){i.push({need:w.need??w.asset,reason:"no match"});return}let le;try{le=await Pe(pe(n,R,w),this.scene)}catch{i.push({need:w.need??w.asset,reason:`file did not load: ${w.src??R.file}`});return}if(s!==this.buildToken)return;R=wn(R,w,le);const C=Le(R,w,P),S=pn(R,le,C.w,C.h,C.uRepeat,this.scene);S.mesh.position.set(C.x,C.y,C.z);const A=Xn(w,R);S.mesh.alphaIndex=A?uo:C.alphaIndex,A&&(S.mesh.rotation.x=Math.PI/2),S.mesh.isVisible=!1;let _,O,K;if(pt.includes(w.depth)&&!R.tileable_x&&!A&&!we(R)){const W=ln(R,C.w,C.h,C.z);K=Z=>ln(R,C.w,C.h,Z).d/W.d,_=cn(S.mesh,W.w,W.d,this.scene),_.mesh.alphaIndex=Ke(C.alphaIndex),O=cn(S.mesh,W.w,W.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:C.h*$a(this.sunDir)}),O.mesh.alphaIndex=Ke(C.alphaIndex)}o.push({layer:w,index:q,builtScale:w.scale??1,builtZ:C.z,handle:S,asset:R,order:P,stain:_,cast:O,stainDepth:K,ink:ds.get(pe(n,R,w)),flat:A,skyline:Lt.get(pe(n,R,w))})}));const l=ns(t.set,n),d=(await Promise.all(os(t.set,n).map(async w=>{const P=await Pe(n.base+w.asset.file,this.scene).catch(()=>(i.push({need:w.asset.id,reason:`file did not load: ${w.asset.file}`}),null)),q=(Je.get(n.base+w.asset.file)??[]).filter(R=>!!R);return P?{tex:P,tile:w.asset.height_m||Tt,from:w.from,asset:w.asset,colour:q.length?Sn(q):De(n.paper??Se)}:null}))).filter(w=>!!w);let c=null;const v=Go(t.set.near,n),M=v?Ae(n,{asset:v}):null;if(t.set.near&&!M&&i.push({need:t.set.near,reason:"no near band"}),M)try{c=await Pe(n.base+M.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${M.file}`})}l.kind==="paper"&&l.reason&&i.push({need:t.set.ground,reason:l.reason});const y=o.filter(w=>w.asset.layer==="bg").sort((w,P)=>w.index-P.index)[0],g=y?{top:us.get(pe(n,y.asset,y.layer))??0,h:Le(y.asset,y.layer,y.order).h,order:y.order}:null,x=o.find(w=>w.index===-1),p=x&&Le(x.asset,x.layer,x.order),b=x&&p?Io(Je.get(pe(n,x.asset,x.layer))??[],(B.y-p.y)/p.h):null,F=y?hs.get(pe(n,y.asset,y.layer))??null:t.set.groundBands?.length?null:b,k=await this.loadBands(t,n),z=t.set.groundBands?.length?[...new Set(t.set.groundBands.flatMap(w=>Ae(n,{asset:w.asset},"ground_band")?.tags??[]))]:null,U=Aa(n),G=nn(t),j=d.map(w=>({asset:w.asset,from:w.from})),ee=[...new Set(yn({sceneId:t.id,slots:j,bandTags:z,sprites:U,grass:1,bushes:1,front:G}).flatMap(w=>w.picks.map(P=>P.file)))],$=new Map;await Promise.all(ee.map(async w=>{const P=await Pe(n.base+w,this.scene).catch(()=>null);P&&$.set(w,P)}));const se=w=>w.forEach(P=>{P.stain?.mesh.material?.dispose(),P.cast?.mesh.material?.dispose(),P.handle.mesh.dispose(),P.handle.material.dispose()});if(s!==this.buildToken){se(o),k.forEach(w=>{w.handle.mesh.dispose(),w.handle.material.dispose()});return}se(this.built),this.bands.forEach(w=>{w.handle.mesh.dispose(),w.handle.material.dispose()}),this.bands=k,this.built=o,this.sceneLib=n;const oe=d[0]?(Je.get(n.base+d[0].asset.file)??[]).filter(w=>!!w):[],Y=this.groundLook(d,F,n,l.kind==="paper"?l.colour:void 0);this.horizonTint=Y.tint,this.strip=g,this.smoke.forEach(w=>w.dispose()),this.smoke=o.filter(w=>ta(w.asset)&&pt.includes(w.layer.depth)&&!w.flat).map(w=>{const P=Le(w.asset,w.layer,w.order);return qo(this.scene,new I(w.handle.mesh.position.x,P.h*.6,P.z),Math.min(Math.max(P.h*.8,.5),3),P.alphaIndex)}),this.footTint=oe.length?Sn(oe):Y.base,this.nearTex=c,this.nearAsset=M,this.hazeTint=b??Y.tint,this.ground.set(Y),this.strewSrc={sceneId:t.id,slots:j,colours:d.map(w=>w.colour),bandTags:z,front:G,sprites:U,tex:$},this.strewKey="",this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const a=De(o??s.paper??Se),r=n??a;return{slots:t,base:Ca(a,r,Pa),tint:r,fadeNear:Q.fg,fadeFar:Q.bg*.75,grain:t.length?.5:1}}strew(t,n){const s=this.strewSrc,o=s?`${s.sceneId}:${t}:${n}:${s.slots.length}`:"";if(o===this.strewKey||(this.strewKey=o,this.strewn.forEach(r=>r.dispose()),this.strewn=[],!s))return;const a=r=>s.colours[Wo(s.slots,r)]??this.footTint;for(const r of yn({...s,grass:t,bushes:n}))for(const i of new Set(r.picks.map(l=>l.file))){const l=s.tex.get(i),d=r.clumps.filter(c=>r.picks[c.pick].file===i);l&&d.length&&this.strewn.push(Ta(this.scene,l,r.picks,d,a,this.hazeTint,i))}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:bn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=r=>this.built.some(i=>i.handle.mesh===r),o=[],a=[...this.scene.multiPick(t,n,s)??[]].sort((r,i)=>r.distance-i.distance);for(const r of a){const i=this.built.find(d=>d.handle.mesh===r.pickedMesh),l=r.getTextureCoordinates();!i||!l||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||we(i.asset)&&(r.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:l.x,v:l.y})}return o}pickBackdrops(t,n){const s=r=>this.bands.find(i=>i.handle.mesh===r),o=r=>this.built.find(i=>i.handle.mesh===r&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,r=>!!s(r)||!!o(r))??[]].sort((r,i)=>r.distance-i.distance).flatMap(r=>{const i=r.getTextureCoordinates();if(!i)return[];const l=s(r.pickedMesh);if(l)return[{band:l.index,asset:l.asset,u:i.x,v:i.y}];const d=o(r.pickedMesh);return[{index:d.index,asset:d.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(d=>d.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),a=1/this.engine.getRenderHeight(),r=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(d=>I.Project(d,Ee.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=r.map(d=>d.x*o),l=r.map(d=>d.y*a);return{x0:Math.min(...i),y0:Math.min(...l),x1:Math.max(...i),y1:Math.max(...l),z:n.handle.mesh.position.z}}groundHeightAt(t){return zt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?we(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Ee.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>Ia*Math.min(1,Math.max(0,(kn-o)/(kn-Ua)));this.gridMeshes=n.pieces.map((o,a)=>{const r=o.lines.map(d=>d.map(([c,v])=>new I(c,zt(v,t),v))),i=o.lines.map(d=>d.map(([,c])=>new In(n.rgb[0],n.rgb[1],n.rgb[2],s(c)))),l=st.CreateLineSystem(`grid-${a}`,{lines:r,colors:i,useVertexAlpha:!0},this.scene);return l.isPickable=!1,l.setEnabled(!this.gridOff),l.alphaIndex=Ne(o.z)+Va,l.material.depthFunction=xe.ALWAYS,l.material.disableDepthWrite=!0,l}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,Ee.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new I(.55,-1,-.3).normalize();depthLine(t){return{...ut(this.look,t),tint:this.hazeTint}}paper(){return dn(this.look)}async loadBands(t,n){const s=[];for(const[o,a]of(t.set.groundBands??[]).entries()){const r=Ae(n,{asset:a.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await Pe(pe(n,r,a),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${a.src??r.file} did not load`);continue}const l=wn(r,a,i),d=jn(a.z),c=d*l.h/l.w,v=pn(l,i,d,c,1,this.scene);v.material.depthFunction=xe.ALWAYS,v.mesh.position.set(0,0,a.z),v.mesh.alphaIndex=Ne(a.z),s.push({handle:v,z:a.z,w:d,h:c,skyline:Lt.get(pe(n,l,a))??.5,index:o,asset:l,band:a})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?wo(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??Wn,ae(this.look,"housePitch")):0}pose(t,n,s,o){const a=Qn(t,n),r=es(a.cam,a.t,Jn(t)),i=o?Lo(r,o.t,o):r;this.camera.position.set(i.x,i.y,i.z),this.camera.fov=i.fov;const l=ae(this.look,"housePitch");this.camera.rotation.x=l*Math.PI/180,this.ground.follow(this.camera.position);const d=p=>ae(this.look,p);this.ground.live({detail:d("groundDetail"),vary:d("groundVary"),mixTile:d("groundMix"),tileScale:d("groundScale"),wash:d("groundWash"),grainSize:d("groundGrain")}),this.ground.near(this.nearTex?{tex:this.nearTex,...ha(l,this.engine.getAspectRatio(this.camera),d("nearFar")),span:Ba,tileable:!!this.nearAsset?.tileable_x}:null);const c=this.engine.getRenderHeight(),v=dn(this.look),M=ae(this.look,"bandHeight"),y=this.horizonOf(t),g=mo(y,this.strip);this.land=g,this.poseGrid(g);const x=nn(t);this.bands.forEach(p=>{const b=yo(p.band,n,M,p.w,p.h,p.skyline,x);p.z=b.z,p.handle.mesh.scaling.set(b.sx,b.sy,1),p.handle.mesh.position.set(b.x,b.y,b.z),p.handle.mesh.alphaIndex=b.alphaIndex;const F=dt(c,b.z-B.z,fe(B.fov));p.handle.setOpacity(b.opacity),p.handle.setBottomFade(Math.min(1,ae(this.look,"bandFade")/b.h)),p.handle.setPaper(v,Ze(b.w,b.h,1,F,c)),p.handle.setLine(ut(this.look,"bg"),1,Ze(b.w,b.h,1,F,c),this.hazeTint),p.handle.setMotion(on(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.strew(ae(this.look,"grass"),ae(this.look,"horizonBushes")),this.strewn.forEach(p=>p.update(s,ae(this.look,"grassSway"),g,this.camera.position,1)),this.smoke.forEach(p=>p.update(s,ae(this.look,"smoke"))),this.birds.update(s,ae(this.look,"birds"));for(const p of this.built){const b=ge(p.layer,n),F=Le(p.asset,{...p.layer,x:b.x,y:b.y,z:b.z,scale:1,rotation:b.rotation},p.order,y,g);p.handle.mesh.position.x=F.x;const k=p.asset.layer==="bg"&&!p.asset.tileable_x?(F.z-B.z)/Math.max(.1,p.builtZ-B.z):1;p.handle.mesh.position.y=p.flat?fo:we(p.asset)?Zn(F.z,M,F.h*b.scale,p.skyline??0)+F.y:B.y+(F.y-B.y)*k,p.handle.mesh.position.z!==F.z&&(p.handle.mesh.position.z=F.z,p.flat||(p.handle.mesh.alphaIndex=F.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=Ke(F.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(F.z)),p.cast&&(p.cast.mesh.alphaIndex=Ke(F.alphaIndex))),p.handle.mesh.rotation.z=-F.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(b.scale/p.builtScale*k),p.handle.setOpacity(b.opacity),p.handle.setFeather(Co(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-F.y)/(F.h*b.scale));const z=dt(c,F.z-i.z,this.camera.fov),U=ut(this.look,p.layer.depth);p.handle.setPaper(v,Ze(F.w*b.scale,F.h*b.scale,F.uRepeat,dt(1080,F.z-B.z,fe(B.fov)),1080)),p.handle.setLine(U,p.ink===void 0?1:ca(p.ink,U.ink,U.norm),Ze(F.w*b.scale,F.h*b.scale,F.uRepeat,z,c),this.hazeTint),p.stain?.setOpacity((p.layer.shadow??lt)*b.opacity),p.cast?.setOpacity(ae(this.look,"castShadow")*((p.layer.shadow??lt)/lt)*b.opacity);const G=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":pt.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive(ra(this.look,G,this.sunDir.x,this.footTint)),p.handle.setMotion(on(p.asset,p.layer)),p.handle.material.setFloat("time",s),ke(p.asset)&&p.handle.setCell(fa(p.asset,cs(p.asset,p.layer.play,n)))}}}const pe=(e,t,n)=>n?.src??e.base+t.file,wn=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:o}=n.getSize(),a=s/(ke(e)?e.cols:1),r=o/(ke(e)?e.rows:1);return{...e,w:a,h:r,height_m:e.height_m*(r/e.h)}},bn=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),Ba=1.3,Ia=.35,Va=.001,Ua=40,kn=120,Mn=110,Na=900,$a=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Sn=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),pt=["mid","fg","near"],Ha=16/9,Ga=.92;function Wa(e,t,n,s){const{cam:o,t:a}=Qn(e,s),r=es(o,a,Jn(e)),i=Q[t.depth],l=i-r.z;if(l<=.5)return null;const d=ge(t,s),c=(d.x-.5)*he(i),v=Math.tan(r.fov/2),M=(c-r.x)/(l*v*Ha),y=-ot*Math.PI/180,g=Math.tan(Math.atan2(n*d.scale-r.y,l)-y)/v;return Math.abs(M)>Ga?null:{x:(M+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const ja={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},An=new Set(["large","small","tall","long","short","fallen"]),Ya=new Set(["tree","shrub"]),It=e=>e.charAt(0).toUpperCase()+e.slice(1),Ka=(e,t)=>ja[e]?.[t?1:0]??e;function Za(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const a=o.length>1&&Ya.has(o[0])?o.slice(1):o,r=a.filter(l=>An.has(l)),i=a.filter(l=>!An.has(l));return It([...r,...i].map(l=>Ka(l,n)).join(" "))}const En=e=>It(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),xs=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function me(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&xs(s);if(o)return En(o);if(e.figure)return En(e.figure);if(s)return Za(s,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?It(String(a)):""}function Xa(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const qa=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function Ja(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>qa.has(t))?"leaf":"photo"}const $e=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?xs(e):null,zn=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function ze(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:zn(e,"pose:")??t?.[1]??null,facing:zn(e,"facing:")??(t?.[2]?"left":"right")}}const vs=e=>e.find(t=>ze(t).pose==="stand"&&ze(t).facing==="right")??e[0];function ys(e){const t=new Map,n=[];for(const s of e??[]){const o=$e(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const r={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,r),n.push(r)}const a=t.get(o);a.members=[...a.members,s],a.count=a.members.length}return n.map(s=>s.series?{...s,asset:vs(s.members)}:s)}const Qa=(e,t)=>{const n=$e(t);return n?(e??[]).filter(s=>$e(s)===n):t?[t]:[]},er=e=>ys(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function tr(e,t,n){const s=(e??[]).filter(r=>$e(r)===n);if(!s.length)return null;const o=ze(t),a=(r,i)=>s.find(l=>ze(l).pose===r&&ze(l).facing===i);return a(o.pose,o.facing)??a("stand",o.facing)??vs(s)}const nr=24;function sr(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const o=new Image;o.onload=()=>{try{const a=document.createElement("canvas");a.width=o.naturalWidth,a.height=o.naturalHeight;const r=a.getContext("2d",{willReadFrequently:!0});r.drawImage(o,0,0),t.set(s,{w:a.width,h:a.height,data:r.getImageData(0,0,a.width,a.height).data})}catch{t.set(s,"failed")}},o.onerror=()=>t.set(s,"failed"),o.src=e+s};return{prime(s){s.forEach(o=>o?.file&&n(o.file))},opaque(s,o,a,r){const i=t.get(s?.file);if(!i||typeof i=="string")return s?.file&&n(s.file),!0;const l=s.kind==="animation"?Math.max(1,s.cols??1):1,d=s.kind==="animation"?Math.max(1,s.rows??1):1,c=i.w/l,v=i.h/d,M=Math.min(c-1,Math.max(0,Math.floor(o*c))),y=Math.min(v-1,Math.max(0,Math.floor(a*v)));return(Number.isInteger(r)?[[Math.floor(r/l)%d,r%l]]:Array.from({length:d*l},(x,p)=>[Math.floor(p/l),p%l])).some(([x,p])=>i.data[(Math.floor(x*v+y)*i.w+Math.floor(p*c+M))*4+3]>nr)}}}const ne={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,Yn],[80,Rt]]},or=e=>e<=12?1:e<=40?5:20,ar=e=>or(e)/4;function Fn(e,t=0){const n=typeof t=="function"?t:()=>t,s=d=>[e.origin[0]+d*e.dir[0],e.origin[2]+d*e.dir[2]],o=d=>e.origin[1]+d*e.dir[1]-(ne.z+n(s(d)[1]));if(!(e.dir[2]>0))return null;const a=(Rt*rr-e.origin[2])/e.dir[2],r=Math.sign(o(0));if(r===0)return jt(ne,s(0));let i=0,l=null;for(let d=1;d<=Tn;d++){const c=a*d/Tn;if(Math.sign(o(c))!==r){l=c;break}i=c}if(l===null)return null;for(let d=0;d<ir;d++){const c=(i+l)/2;Math.sign(o(c))===r?i=c:l=c}return jt(ne,s(l))}const rr=4,Tn=400,ir=30;function Ot(e){const t=ar(yt(ne,e)[1]);return yt(ne,Ps(e,t))}const Pt=(e,t)=>[(e-.5)*he(t),t],nt=([e,t])=>({x:Math.round((.5+e/he(t))*1e4)/1e4,z:t});function Vt([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function lr([e,t],n,s=[0,0]){const[[,o],[,a]]=ne.cells,r=Math.max(.1,t-s[1]),i=Math.min(a,Math.max(o,s[1]+r/Math.max(.01,n)));return yt(ne,Vt([e,t],i,s))}const cr=[[Yn,12,2],[12,40,10],[40,Rt,40]],hr=20;function ur(){return cr.flatMap(([e,t,n],s)=>{const o=n*hr,a=[];let r=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const l={...ne,cells:[[-o,r],[o,i]]},d=Cs(l,n,Math.max(1,Math.round(i-r))).filter(c=>c[0][0]!==c[c.length-1][0]?c[0][1]===i:i>r);a.push({z:i,lines:d.map(c=>c.map(v=>Rs(ne,v).slice(0,2)))}),r=i}return a})}const _n=-1,Ln=2;function dr({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:a,onGround:r=()=>!1,byDistance:i=()=>!1,groundUnder:l=()=>null,footY:d=()=>0,eye:c=()=>[0,0],onSettled:v=()=>{},onEmpty:M=()=>!1}){let y=null,g=null,x=!1;const p="#38bdf8",b=document.createElement("div");b.dataset.stage25dSelection="",b.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${p};z-index:3;`;const F=document.createElement("div");F.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${p};pointer-events:none;`,b.appendChild(F);const k=document.createElement("div");k.dataset.rotateHandle="1",k.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",b.appendChild(k);const U=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([S,A])=>{const _=document.createElement("div");return _.dataset.scaleHandle="1",_.style.cssText=Os(S,A),b.appendChild(_),_});t.appendChild(b),n()?.setGrid?.(ur(),fr(t,"--color-neutral"));const G=document.createElement("div");G.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(G);const j=S=>{const A=oe();if(!A||S===null){G.style.display="none";return}const _=t.getBoundingClientRect(),O=e.getBoundingClientRect();Object.assign(G.style,{display:"block",left:`${A.left+A.width/2+O.left-_.left}px`,top:`${A.top+A.height+O.top-_.top}px`}),G.textContent=`${s(S,"z").toFixed(2)} m`},ee=S=>{const A=e.getBoundingClientRect();return{x:S.clientX-A.left,y:S.clientY-A.top}},$=(S,A)=>n()?.pickLayers(S,A).find(_=>o.opaque(_.asset,_.u,_.v,_.index))??null,se=(S,A)=>{y=S,A&&S!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${S}`}})),Y()},oe=()=>{const S=y===null?null:n()?.layerBox(y);if(!S)return null;const A=e.getBoundingClientRect();return{left:S.x0*A.width,top:S.y0*A.height,width:(S.x1-S.x0)*A.width,height:(S.y1-S.y0)*A.height,z:S.z}},Y=()=>{const S=oe();if(!S){b.style.display="none";return}const A=e.getBoundingClientRect(),_=t.getBoundingClientRect();Object.assign(b.style,{display:"block",left:`${S.left+A.left-_.left}px`,top:`${S.top+A.top-_.top}px`,width:`${S.width}px`,height:`${S.height}px`})},w=(S,A,_)=>Math.min(_,Math.max(A,S)),P=S=>{if(S.button!==0)return;const{x:A,y:_}=ee(S),O=$(A,_);if(!O){M(A,_)&&S.stopPropagation();return}S.stopPropagation(),se(O.index,!0);const K=n().layerBox(O.index),W=r(O.index),Z=oe();g={mode:"move",index:O.index,z:K.z,from:n().worldXAt(A,_,K.z),x0:s(O.index,"x"),id:S.pointerId,el:e,ground:W,start:[A,_],foot:Z?[Z.left+Z.width/2,Z.top+Z.height]:[A,_],lift:W?d(O.index):0},e.setPointerCapture?.(S.pointerId)},q=S=>A=>{if(A.button!==0||y===null)return;const _=oe();if(!_)return;A.stopPropagation(),A.preventDefault();const O=e.getBoundingClientRect(),K=_.left+_.width/2,W=_.top+_.height/2,{x:Z,y:Ge}={x:A.clientX-O.left,y:A.clientY-O.top};g={mode:S,index:y,cx:K,cy:W,id:A.pointerId,el:A.currentTarget,d0:Math.max(8,Math.hypot(Z-K,Ge-W)),a0:Math.atan2(Ge-W,Z-K),scale0:s(y,"scale"),rotation0:s(y,"rotation"),byDistance:S==="scale"&&i(y),p0:Pt(s(y,"x"),s(y,"z")),eye:c()},A.currentTarget.setPointerCapture?.(A.pointerId)},R=S=>{const{x:A,y:_}=ee(S);if(g?.mode==="move"&&g.ground){const O=l(g.foot[0]+A-g.start[0],g.foot[1]+_-g.start[1],g.lift,g.index);if(!O)return;const K=nt(Ot(O));a(g.index,"x",w(K.x,_n,Ln)),a(g.index,"z",K.z),j(g.index);return}if(g?.mode==="move"){const O=(n().worldXAt(A,_,g.z)-g.from)/he(g.z);a(g.index,"x",Math.round(w(g.x0+O,_n,Ln)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const O=Math.hypot(A-g.cx,_-g.cy)/g.d0*g.scale0,K=Ot(lr(g.p0,O,g.eye))[1],W=nt(Vt(g.p0,K,g.eye));g.scale0!==1&&a(g.index,"scale",1),a(g.index,"x",W.x),a(g.index,"z",W.z),j(g.index);return}if(g?.mode==="scale"){const O=Math.hypot(A-g.cx,_-g.cy);a(g.index,"scale",Math.round(w(g.scale0*(O/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let O=g.rotation0+(Math.atan2(_-g.cy,A-g.cx)-g.a0)*180/Math.PI;S.shiftKey&&(O=Math.round(O/15)*15),a(g.index,"rotation",Math.round(O*10)/10);return}x||(x=!0,requestAnimationFrame(()=>{x=!1,e.style.cursor=$(A,_)?"pointer":""}))},le=()=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const S=g.index,A=g.mode==="move"&&g.ground||g.byDistance;g=null,G.style.display="none",A&&v(S)},C=S=>{y!==null&&S.detail?.id!==`s25_layer-${y}`&&(y=null,Y())};e.addEventListener("pointerdown",P);for(const S of[e,...U,k])S.addEventListener("pointermove",R),S.addEventListener("pointerup",le),S.addEventListener("pointercancel",le);return U.forEach(S=>S.addEventListener("pointerdown",q("scale"))),k.addEventListener("pointerdown",q("rotate")),window.addEventListener("scene-object-selected",C),{select:(S,A=!1)=>se(S,A),get selected(){return y},place:Y,destroy(){window.removeEventListener("scene-object-selected",C),b.remove(),n()?.setGrid?.(null),G.remove()}}}function fr(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const Ut=["x","y","z","scale","rotation","opacity","keys","figure","play"],te=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},mt=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Ut.includes(t))),Dn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{};return JSON.stringify({...e,set:{...o,layers:t.map(mt),groundBands:n.map(mt),skyLayer:mt(s)}})},gt=e=>Ut.map(t=>e?.[t]??null),xt=e=>JSON.stringify([(e?.set?.layers??[]).map(gt),(e?.set?.groundBands??[]).map(gt),gt(e?.set?.skyLayer)]),pr={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},On=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch","groundWash","groundGrain","grass","grassSway","horizonBushes"],mr=e=>ke(e)?"vfx":e.layer,Pn=e=>ke(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,Cn="application/x-lp-stage25d",qe=new Map,vt=new Map,gr=e=>(vt.has(e)||vt.set(e,sr(e)),vt.get(e));function xr(e){return qe.has(e)||qe.set(e,Do(Ds(e)).catch(t=>{throw qe.delete(e),t})),qe.get(e)}const vr=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function Tr(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,a=null,r=null,i=new Map,l=new Map,d=0,c=null,v=0,M=0,y=performance.now(),g=!1,x=[],p=[],b={},F=new Set,k=null,z=null;const U=h=>ke(h)?null:z.base+"thumbs/"+h.file;let G=null,j=null,ee={},$=null,se=0;const oe=()=>{s.engine.runRenderLoop(()=>{const h=performance.now();M+=Math.min(.1,(h-y)/1e3),y=h,s.tick(h),o&&s.pose(o,C(),M),s.scene.render(),$?.place()})},Y=()=>{if(!o||!s)return;const h=(u,f)=>F.has(f)?{...u,opacity:0,keys:[]}:u;o={...o,set:{...o.set,groundBands:p.map((u,f)=>h(u,`band-${f}`)),skyLayer:b,layers:x.map((u,f)=>h(u,`layer-${f}`))}},s.rebind(o)},w=h=>{const u=/^band-(\d+)$/.exec(String(h??""));return u&&p[Number(u[1])]?Number(u[1]):-1},P=h=>h==="sky"?r?.set?.sky?{...b,depth:"sky"}:null:w(h)>=0?{...p[w(h)],depth:"bg"}:x[te(h)]??null,q=(h,u)=>{let f=null;if(h==="sky"&&r?.set?.sky){if(u.motion===void 0)return null;b={...b,motion:u.motion},f={skyLayer:{motion:u.motion}}}else if(w(h)>=0){const m=w(h);p=p.map((E,T)=>T===m?{...E,...u}:E),f={band:{index:m,...u}}}else if(x[te(h)]){const m=te(h);x=x.map((E,T)=>T===m?{...E,...u}:E),f=m}return f===null?null:(k=xt({set:{layers:x,groundBands:p,skyLayer:b}}),Y(),f)},R=()=>({...r.set,layers:x,groundBands:p,skyLayer:b}),le=(h,u)=>{const f=q(h,u);f===null||L.sceneId==null||(typeof f=="number"?t.onCommit?.(f,u,L.sceneId):t.onCommit?.(0,f,L.sceneId))},C=()=>c?c():d,S=()=>r?.set?.sky&&z?i.get(r.set.sky)??Ae(z,{asset:r.set.sky},"sky"):null,A=h=>{const u=i.get(x[h]?.asset);return!!(x[h]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&x[h].depth!=="sky")},_=h=>h==="sky"||w(h)>=0,O=(h,u)=>{const f=s?.pickBackdrops?.(h,u).find(E=>G.opaque(E.asset,E.u,E.v)),m=f?f.band!==void 0?`band-${f.band}`:`layer-${f.index}`:r?.set?.sky?"sky":null;return m&&L.select(m),!!m},K=(h,u)=>we(u)||Xn(h,u),W=h=>{const u=i.get(x[h]?.asset);return!!u&&K(x[h],u)},Z=h=>ge(x[h],C()).z??Q[x[h].depth],Ge=h=>A(h)&&!(x[h].keys??[]).some(u=>u.scale!==void 0),Nt=h=>Math.round(h*1e3)/1e3,$t=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],L={canvas:n,sceneId:null,async show(h){const u=await xr(h.bundle);if(g)return;s||(s=new Ra(n,u),oe()),ee={...h.look??{}},s.setLook(ee);const f=vr(h);await s.build(f,u),o=f,x=f.set.layers,p=(f.set.groundBands??[]).map(m=>({...m})),b={...f.set.skyLayer??{}},F=new Set,k=xt(h),r=h,i=new Map(u.assets.map(m=>[m.id,m])),z=u,G=gr(u.base),G.prime(f.set.layers.map(m=>i.get(m.asset)).filter(Boolean)),t.editable&&!$&&(n.style.pointerEvents="auto",window.addEventListener("scene-object-selected",m=>{m.detail?.id!==`s25_${j}`&&(j=null)}),n.addEventListener("dragover",m=>{m.dataTransfer?.types?.includes(Cn)&&(m.preventDefault(),m.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",m=>{const E=m.dataTransfer?.getData(Cn);if(!E)return;m.preventDefault();const T=n.getBoundingClientRect();L.addLayer(E,{x:m.clientX-T.left,y:m.clientY-T.top})}),n.addEventListener("dblclick",()=>{const m=j??($?.selected!=null?`layer-${$.selected}`:null),E=m&&L.editTarget(m);E&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:E}))}),$=dr({canvas:n,host:e,stage:()=>s,alpha:{opaque:(m,E,T,V)=>G.opaque(m,E,T,ke(m)?cs(m,x[V]?.play,C()):void 0)},valueOf:(m,E)=>E==="z"?Z(m):ge(x[m],C())[E],onGround:A,byDistance:Ge,groundUnder:(m,E,T,V)=>Fn(s.pointerRay(m,E),W(V)?T:D=>s.groundHeightAt(D)+T),footY:m=>s.layerFootY(m)-(W(m)?0:s.groundHeightAt(Z(m))),eye:$t,onSettled:m=>L.settleBand(m),onEmpty:(m,E)=>O(m,E),onChange:(m,E,T)=>L.moveLayer(`layer-${m}`,E,T)})),($?.selected??-1)>=x.length&&$.select(null),l=new Map(u.assets.map(m=>[m.id,m.height_m??1.7])),v=Number(h.narration_at_s)||0,a=Dn(h),e.dataset.stage25dReady="1"},editTarget(h){const u=h==="sky"?r?.set?.sky?b:null:w(h)>=0?p[w(h)]:x[te(h)],f=h==="sky"?S():i.get(u?.asset);return!u||!f||!z?null:{id:`s25_${h}`,title:L.items().find(m=>m.id===h)?.label??me({},f,(document.documentElement.lang||"en").slice(0,2)),original:z.base+f.file,state:u.edit_state??null,edited:!!u.src,el:e}},matches:h=>a===Dn(h),adopt(h){const u=xt(h);if(u===k)return!1;k=u;const f=(m,E)=>{const T={...m};for(const V of Ut)E?.[V]===void 0?delete T[V]:T[V]=E[V];return T};return x=x.map((m,E)=>f(m,h.set?.layers?.[E])),p=p.map((m,E)=>f(m,h.set?.groundBands?.[E])),b=f(b,h.set?.skyLayer),r=h,Y(),!0},setLayerProp(h,u,f){q(h,{[u]:f})},setLayerKeys(h,u){const f=P(h);f&&JSON.stringify(f.keys??[])!==JSON.stringify(u)&&q(h,{keys:u})},commitLayerProp(h,u,f){le(h,{[u]:f})},readLayerProp(h,u){const f=P(h),m=f?u==="z"&&te(h)>=0?Z(te(h)):u==="z"?ge(f,C()).z??f.z:ge(f,C())[u]:null;return Number.isFinite(m)?m:null},setHidden(h,u){te(h)<0&&w(h)<0||(F=new Set(u?[...F,h]:[...F].filter(f=>f!==h)),Y())},update(h){c=null,d=Math.max(0,h)},play(h){c=()=>v+h()},moveLayer(h,u,f){window.__timelineKeying?.edit?.(`s25:${h}`,u,f,{flush:!1})||L.commitLayerProp(h,u,f)},select(h){j=_(h)?h:null,$?.select(te(h)>=0?te(h):null,!j),j&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${j}`}}))},get skySelected(){return j==="sky"},get backdrop(){return j},get selection(){return $?.selected??null},clearSelection(){$?.select(null)},atStart(){return d===0&&c===null&&F.size===0},layerInfo(h){const u=(D,J)=>{const ue=typeof D.motion=="string"?{kind:D.motion}:D.motion??{};return{kind:ue.kind??ts(J),amount:ue.amount??1,speed:ue.speed??1}};if(h==="sky"){const D=S();return D?{id:h,asset:D.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:me({},D,(document.documentElement.lang||"en").slice(0,2)),file:b.src??`${z.base}${D.file}`,motion:u(b,D)}:null}if(w(h)>=0){const D=p[w(h)],J=i.get(D.asset);return{id:h,asset:D.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:L.items().find(ue=>ue.id===h)?.label??"",file:D.src??(J?`${z.base}${J.file}`:null),motion:u(D,J)}}const f=x[te(h)];if(!f)return null;const m=i.get(f.asset)??null,E=A(te(h)),T=!E||(f.scale??1)!==1||(f.keys??[]).some(D=>D.scale!==void 0),V=m?.layer==="bg"&&!m.tileable_x;return{id:h,asset:f.asset??null,depth:f.depth,figure:f.figure??null,role:m?.layer??null,ground:E,showScale:T,fields:E?["x","z",...T?["scale"]:[],"rotation","opacity"]:["x",...V?["z"]:[],"y","scale","rotation","opacity"],label:L.items().find(D=>D.id===h)?.label??me(f,m,(document.documentElement.lang||"en").slice(0,2)),file:f.src??(m?`${z.base}${m.file}`:null),motion:u(f,m),anim:Pn(m),play:{speed:f.play?.speed??1,offset:f.play?.offset??0}}},setLayerPlay(h,u){const f=P(h);f&&le(h,{play:{...f.play??{},...u}})},setLayerMotion(h,u){const f=P(h);f&&le(h,{motion:{...typeof f.motion=="object"?f.motion:{kind:f.motion},...u}})},reorderLayers(h,u,f){if(!A(u)){f(h,u,L.sceneId,null,null,null);return}const m=ve=>x[ve]?.z??Q[x[ve]?.depth],E=h.filter(ve=>ve===u||A(ve)),T=E.indexOf(u),V=E[T-1],D=E[T+1],J=Z(u),ue=V===void 0?0:m(V),at=D===void 0?1/0:m(D);if((V!==void 0||D!==void 0)&&(J<ue||J>at)){const ve=Pt(ge(x[u],C()).x,J),ws=V===void 0?at/1.25:D===void 0?ue*1.25:(ue+at)/2,We=Math.round(Math.min(ne.cells[1][1],Math.max(ne.cells[0][1],ws))*100)/100,rt=$t(),bs=(We-rt[1])/Math.max(.1,J-rt[1]),Ht=ce=>Nt(Math.min(20,Math.max(.01,ce*bs))),ks=x[u].keys?.some(ce=>ce.z!==void 0||ce.scale!==void 0)?x[u].keys.map(ce=>({...ce,...ce.z!==void 0&&{z:Math.min(ne.cells[1][1],Math.max(ne.cells[0][1],Nt(ce.z+We-J)))},...ce.scale!==void 0&&{scale:Ht(ce.scale)}})):null;f(h,u,L.sceneId,nt(Vt(ve,We,rt)).x,We,Ht(x[u].scale??1),ks);return}f(h,u,L.sceneId,x[u].x??.5,m(u),x[u].scale??1)},library(){if(!z)return null;const h=(document.documentElement.lang||"en").slice(0,2);return{bundle:z.bundle,assets:z.assets.filter(u=>u.kind!=="sheet").map(u=>({id:u.id,layer:u.layer,shelf:mr(u),anim:Pn(u),band:Ft(u),tags:u.tags??[],url:z.base+u.file,thumb:U(u),label:me({},u,h)}))}},tiles:h=>ys(h),seriesOfLayer(h){const u=i.get(x[te(h)]?.asset),f=$e(u);if(!f||!z)return null;const m=(document.documentElement.lang||"en").slice(0,2),E=T=>({id:T.id,url:z.base+T.file,thumb:U(T),...ze(T)});return{series:f,asset:u.id,members:Qa(z.assets,u).map(E),characters:er(z.assets).map(T=>({series:T.series,url:z.base+T.asset.file,thumb:U(T.asset),label:me({},T.asset,m)}))}},async switchCharacter(h,u){const f=i.get(x[te(h)]?.asset),m=f&&z?tr(z.assets,f,u):null;m&&await L.swapAsset(h,m.id)},async swapAsset(h,u){if(h==="sky"){if(i.get(u)?.layer!=="sky"||S()?.id===u)return;await L.show({...r,set:{...R(),sky:u}}),L.sceneId!=null&&t.onCommit?.(0,{sky:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const f=p[w(h)];if(f){const E=i.get(u);if(!E||!Ft(E)||f.asset===u)return;const T=Number(h.slice(5)),V=p.map((D,J)=>J===T?{...D,asset:u}:D);await L.show({...r,set:{...R(),groundBands:V}}),L.sceneId!=null&&t.onCommit?.(0,{band:{index:T,asset:u}},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L.select(h);return}const m=te(h);m<0||!x[m]||!i.has(u)||x[m].asset===u||(x=x.map((E,T)=>T===m?{...E,asset:u}:E),await L.show({...r,set:R()}),t.onCommit?.(m,{asset:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(h,u=null){const f=i.get(h);if(!f)return;const m=["mid","fg","near","bg","sky"].includes(f.layer)?f.layer:f.layer==="figure"?"fg":"mid",E=u?0:x.filter(V=>V.asset===h).length;let T={asset:h,depth:m,x:.5+.08*(E%5),scale:1};if(!(f.tileable_x||f.layer==="bg"||f.layer==="sky")){const V=u&&s?Fn(s.pointerRay(u.x,u.y),K({},f)?0:J=>s.groundHeightAt(J)):null,D=nt(Ot(V??Pt(T.x,Q[m])));T={...T,...D,depth:Qt(D.z)}}x=[...x,T],await L.show({...r,set:R()}),t.onCommit?.(x.length-1,{add:T},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),$?.select(x.length-1,!0)},async settleBand(h){const u=x[h];if(!u||!A(h))return;const f=Qt(Z(h));if(f===u.depth)return;x=x.map((E,T)=>T===h?{...E,depth:f}:E);const m=F;await L.show({...r,set:R()}),F=m,Y(),L.sceneId!=null&&t.onCommit?.(h,{depth:f},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),$?.select(h,!1)},groundSlots(){if(!z||!r)return null;const h=(document.documentElement.lang||"en").slice(0,2),u=os(r.set??{},z).map(m=>({asset:m.asset.id,from_m:m.from})),f=z.assets.filter(m=>m.layer==="ground").map(m=>({id:m.id,label:me({},m,h),thumb:U(m)}));return{rows:u,options:f,max:_t}},async setGroundSlots(h){if(!r||!Array.isArray(h))return;const u=h.slice(0,_t).map((m,E)=>({asset:String(m.asset),from_m:E===0?0:Math.max(0,Math.min(2e3,Number(m.from_m)||0))})),f=F;await L.show({...r,look:ee,set:{...R(),groundSlots:u}}),F=f,Y(),L.sceneId!=null&&t.onGroundSlots?.(u,L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},lookControls(){return On.map(h=>{const[u,f,m]=la[h]??[0,1,.01];return{key:h,min:u,max:f,step:m,value:ae({...Dt,...ee},h)}})},setLook(h,u){!On.includes(h)||!Number.isFinite(u)||!s||(ee={...ee,[h]:u},s.setLook(ee),t.onLook?.(h,u,L.sceneId))},async still(h=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const f=document.createElement("canvas");return f.width=h,f.height=Math.max(1,Math.round(h*n.height/n.width)),f.getContext("2d").drawImage(n,0,0,f.width,f.height),f.toDataURL("image/jpeg",.72)};return s.engine.resize(),se++,s.gridHidden=!0,new Promise(f=>{let m=0;const E=D=>{s.engine.onEndFrameObservable.remove(T),clearTimeout(V),s.gridHidden=--se>0,f(D)},T=s.engine.onEndFrameObservable.add(()=>{++m>=6&&E(u())}),V=setTimeout(()=>E(null),4e3)})},get config(){return r},figureBox(h){const u=x.find(T=>T.figure===h);if(!u?.asset)return null;const f=Wa(o,u,l.get(u.asset)??1.7,C());if(!f)return null;const m=n.getBoundingClientRect(),E=m.width*.05;return new DOMRect(m.left+f.x*m.width-E/2,m.top+f.y*m.height,E,m.height*.08)},items:()=>{const h=(document.documentElement.lang||"en").slice(0,2),u=Xa([...x.map((f,m)=>me(f,i.get(f.asset),h)||`layer ${m+1}`),...p.map(f=>me({},i.get(f.asset)??{id:f.asset},h))]);return[...x.map((f,m)=>({id:`layer-${m}`,label:u[m],icon:Ja(i.get(f.asset)),depth:f.depth,z:f.z??Q[f.depth],keys:f.keys??[]})),...p.map((f,m)=>({id:`band-${m}`,label:u[x.length+m],icon:"photo",depth:"bg",z:f.z,keys:f.keys??[],backdrop:!0})),...r?.set?.sky?[{id:"sky",label:pr[h]??"Sky",icon:"cloud",depth:"sky",keys:b.keys??[],backdrop:!0}]:[],{id:"camera",label:"Camera",depth:null,keys:[]}]},destroy(){g=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}$?.destroy(),n.remove()}};return L}export{Cn as DROP_TYPE,On as LOOK_KEYS,Tr as createStage25d,vr as stageScene};
