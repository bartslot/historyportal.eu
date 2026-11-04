import{m as Cs,c as Os,M as rt,S as Ye,R as Gn,C as xe,T as fe,V,E as ie,a as Vt,b as _e,P as Rs,d as Xt,e as qt,f as Wn,g as Bs,h as Is,i as Vs,j as jn,U as Us,H as Ns,D as $s}from"./babylon-DoYGJMOP.js";import{l as Hs}from"./config-DwQUN7uY.js";import{handleCss as Gs}from"./ArtworkOverlay-Mh1W8c6z.js";import{g as Mt,c as Ws,w as Jt,h as js,e as Ys}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-fhY1XOus.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-J8eP6Krg.js";import"./ambient-CEzLlAaX.js";const Ne=new Set;let St=!1;function Ks(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;Ne.size&&Ne.clear();let a=Yn(e,0,o,n,!0);const r=[];if(!a||a.next===a.prev)return r;let i=0,l=0,d=0;if(s&&(a=Qs(e,t,a,n)),e.length>80*n){i=e[0],l=e[1];let h=i,v=l;for(let M=n;M<o;M+=n){const y=e[M],g=e[M+1];y<i&&(i=y),g<l&&(l=g),y>h&&(h=y),g>v&&(v=g)}d=Math.max(h-i,v-l),d=d!==0?32767/d:0}return Et(a,r,i,l,d),r}function Yn(e,t,n,s,o){let a=null;if(o===fo(e,t,n,s)>0)for(let r=t;r<n;r+=s)a=tn(r/s|0,e[r],e[r+1],a);else for(let r=n-s;r>=t;r-=s)a=tn(r/s|0,e[r],e[r+1],a);return a&&$e(a,a.next)&&(Ge(a),a=a.next),a}function ke(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&(Ne.size===0||!Ne.has(s))&&($e(s,s.next)||j(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),St=!0,Ge(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function Et(e,t,n,s,o){o&&ro(e,n,s,o);let a=e,r=!1;for(;e.prev!==e.next;){const i=e.prev,l=e.next;if(j(i,e,l)<0&&(o?Xs(e,n,s,o):Zs(e))){t.push(i.i,e.i,l.i),Ge(e),e=l,a=l;continue}if(e=l,e===a){if(St=!1,e=ke(e),St){a=e;continue}if(!r){e=qs(e,t),a=e,r=!0;continue}Js(e,t,n,s,o);break}}}function Zs(e){const t=e.prev,n=e,s=e.next,o=t.x,a=n.x,r=s.x,i=t.y,l=n.y,d=s.y,h=Math.min(o,a,r),v=Math.min(i,l,d),M=Math.max(o,a,r),y=Math.max(i,l,d);let g=s.next;for(;g!==t;){if(g.x>=h&&g.x<=M&&g.y>=v&&g.y<=y&&!(o===g.x&&i===g.y)&&st(o,i,a,l,r,d,g.x,g.y)&&j(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function Xs(e,t,n,s){const o=e.prev,a=e,r=e.next,i=o.x,l=a.x,d=r.x,h=o.y,v=a.y,M=r.y,y=Math.min(i,l,d),g=Math.min(h,v,M),x=Math.max(i,l,d),p=Math.max(h,v,M),w=_t(y,g,t,n,s),F=_t(x,p,t,n,s);let b=e.prevZ;for(;b&&b.z>=w;){if(b.x>=y&&b.x<=x&&b.y>=g&&b.y<=p&&b!==r&&!(i===b.x&&h===b.y)&&st(i,h,l,v,d,M,b.x,b.y)&&j(b.prev,b,b.next)>=0)return!1;b=b.prevZ}let A=e.nextZ;for(;A&&A.z<=F;){if(A.x>=y&&A.x<=x&&A.y>=g&&A.y<=p&&A!==r&&!(i===A.x&&h===A.y)&&st(i,h,l,v,d,M,A.x,A.y)&&j(A.prev,A,A.next)>=0)return!1;A=A.nextZ}return!0}function qs(e,t){let n=e,s=!1;do{const o=n.prev,a=n.next.next;Xn(o,n,n.next,a,!1)&&He(o,a)&&He(a,o)&&(t.push(o.i,n.i,a.i),Ge(n),Ge(n.next),n=e=a,s=!0),n=n.next}while(n!==e);return s?ke(n):n}function Js(e,t,n,s,o){let a=e;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&co(a,r)){let i=qn(a,r);a=ke(a,a.next),i=ke(i,i.next),Et(a,t,n,s,o),Et(i,t,n,s,o);return}r=r.next}a=a.next}while(a!==e)}let At=!1;function Qs(e,t,n,s){const o=[];for(let a=0,r=t.length;a<r;a++){const i=t[a]*s,l=a<r-1?t[a+1]*s:e.length,d=Yn(e,i,l,s,!1);d===d.next&&Ne.add(d),o.push(lo(d))}o.sort(eo),no(e.length/s,t.length),Zn(n,n),At=!0;for(let a=0;a<o.length;a++)n=to(o[a],n);return At=!1,ke(n)}function eo(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function to(e,t){const n=oo(e,t);if(!n)return t;const s=qn(n,e),o=s.next;return Zn(n,o.next),ke(s,s.next),ke(n,n.next)}const Kn=16;let G=new Float64Array(0),nt=0;const zt=[],Ft=[];function no(e,t){const n=Math.ceil((e+2*t)/Kn)+t+2;G.length<n*4&&(G=new Float64Array(n*4)),nt=0}function Zn(e,t){let n=e;do{const s=nt++;zt[s]=n;let o=1/0,a=1/0,r=-1/0,i=-1/0,l=0;do{const h=n.next;n.z=s,n.x<o&&(o=n.x),n.x>r&&(r=n.x),n.y<a&&(a=n.y),n.y>i&&(i=n.y),h.x<o&&(o=h.x),h.x>r&&(r=h.x),h.y<a&&(a=h.y),h.y>i&&(i=h.y),n=h}while(++l<Kn&&n!==t);Ft[s]=n;const d=s*4;G[d]=o,G[d+1]=a,G[d+2]=r,G[d+3]=i}while(n!==t)}function so(e,t){const n=e.z*4;t.x<G[n]&&(G[n]=t.x),t.y<G[n+1]&&(G[n+1]=t.y),t.x>G[n+2]&&(G[n+2]=t.x),t.y>G[n+3]&&(G[n+3]=t.y)}function Qt(e){let t=Ft[e];for(;t.prev.next!==t;)t=t.next;return Ft[e]=t,t}function en(e){let t=zt[e];for(;t.prev.next!==t;)t=t.next;return zt[e]=t,t}function oo(e,t){let n=t;const s=e.x,o=e.y;let a=-1/0,r;if($e(e,n))return n;for(let M=0,y=0;M<nt;M++,y+=4){if(o<G[y+1]||o>G[y+3]||G[y]>s||G[y+2]<=a)continue;const g=Qt(M);n=en(M);do{if(n.prev.next===n){if($e(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const x=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(x<=s&&x>a&&(a=x,r=n.x<n.next.x?n:n.next,x===s))return r}}n=n.next}while(n!==g)}if(!r)return null;const i=r.x,l=r.y,d=Math.min(o,l),h=Math.max(o,l);let v=1/0;for(let M=0,y=0;M<nt;M++,y+=4){if(G[y+2]<i||G[y]>s||G[y+3]<d||G[y+1]>h)continue;const g=Qt(M);n=en(M);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&st(o<l?s:a,o,i,l,o<l?a:s,o,n.x,n.y)){const x=Math.abs(o-n.y)/(s-n.x);(He(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(x<v||x===v&&(n.x>r.x||n.x===r.x&&ao(r,n)))&&(r=n,v=x)}n=n.next}while(n!==g)}return r}function ao(e,t){return j(e.prev,e,t.prev)<0&&j(t.next,e,e.next)<0}const re=[];let De=[],ye=new Uint32Array(0),Pe=new Uint32Array(0);const Ce=new Uint32Array(256);function ro(e,t,n,s){let o=e,a=0;do o.z=_t(o.x,o.y,t,n,s),re[a++]=o,o=o.next;while(o!==e);io(a);let r=null;for(let i=0;i<a;i++){const l=re[i];l.prevZ=r,r&&(r.nextZ=l),r=l}r.nextZ=null}function io(e){if(e<=32){for(let t=1;t<e;t++){const n=re[t],s=n.z;let o=t-1;for(;o>=0&&re[o].z>s;)re[o+1]=re[o],o--;re[o+1]=n}return}ye.length<e&&(ye=new Uint32Array(e),Pe=new Uint32Array(e),De=new Array(e));for(let t=0;t<e;t++)ye[t]=re[t].z;Ze(e,re,ye,De,Pe,0),Ze(e,De,Pe,re,ye,8),Ze(e,re,ye,De,Pe,16),Ze(e,De,Pe,re,ye,24)}function Ze(e,t,n,s,o,a){Ce.fill(0);for(let i=0;i<e;i++)Ce[n[i]>>>a&255]++;let r=0;for(let i=0;i<256;i++){const l=Ce[i];Ce[i]=r,r+=l}for(let i=0;i<e;i++){const l=n[i],d=Ce[l>>>a&255]++;s[d]=t[i],o[d]=l}}function _t(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function lo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function st(e,t,n,s,o,a,r,i){return(o-r)*(t-i)>=(e-r)*(a-i)&&(e-r)*(s-i)>=(n-r)*(t-i)&&(n-r)*(a-i)>=(o-r)*(s-i)}function co(e,t){const n=$e(e,t)&&j(e.prev,e,e.next)>0&&j(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||He(e,t)&&He(t,e)&&(j(e.prev,e,t.prev)!==0||j(e,t.prev,t)!==0))&&!ho(e,t)&&(n||uo(e,t))}function j(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function $e(e,t){return e.x===t.x&&e.y===t.y}function Xn(e,t,n,s,o=!0){const a=j(e,t,n),r=j(e,t,s),i=j(n,s,e),l=j(n,s,t);return(a>0&&r<0||a<0&&r>0)&&(i>0&&l<0||i<0&&l>0)?!0:o?!!(a===0&&Xe(e,n,t)||r===0&&Xe(e,s,t)||i===0&&Xe(n,e,s)||l===0&&Xe(n,t,s)):!1}function Xe(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function ho(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let r=e;do{const i=r.next;if(r.x>s&&i.x>s||r.x<n&&i.x<n||r.y>a&&i.y>a||r.y<o&&i.y<o){r=i;continue}if(r.i!==e.i&&i.i!==e.i&&r.i!==t.i&&i.i!==t.i&&Xn(r,i,e,t))return!0;r=i}while(r!==e);return!1}function He(e,t){return j(e.prev,e,e.next)<0?j(e,t,e.next)>=0&&j(e,e.prev,t)>=0:j(e,t,e.prev)<0||j(e,e.next,t)<0}function uo(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const r=n.next;n.y>a!=r.y>a&&o<(r.x-n.x)*(a-n.y)/(r.y-n.y)+n.x&&(s=!s),n=r}while(n!==e);return s}function qn(e,t){const n=Tt(e.i,e.x,e.y),s=Tt(t.i,t.x,t.y),o=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,a.next=s,s.prev=a,s}function tn(e,t,n,s){const o=Tt(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function Ge(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),At&&so(e.prev,e.next)}function Tt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function fo(e,t,n,s){let o=0;for(let a=t,r=n-s;a<n;a+=s)o+=(e[r]-e[a])*(e[a+1]+e[r+1]),r=a;return o}Object.assign(window,{BABYLON:{...Os,...Cs},earcut:Ks});(()=>{const e=`
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
    }`})();const mo=new WeakMap;function po(e){return mo.get(e)?.rtt??null}const go=450,nn=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],sn=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],on={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},xo={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function vo(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),r=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(b=>b.name!=="sky-cloud"&&!(b.metadata&&b.metadata.noGBuffer)))}),i=a.getGBuffer().textures,l=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],d=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=b=>new BABYLON.Vector2(1/b.width,1/b.height),v=new BABYLON.Matrix,M=["invView","tanHalf","resolution","skyDepth"],y=["depthSampler","normalSampler"];function g(b,A){t.getViewMatrix().invertToRef(v);const $=Math.tan(t.fov/2);b.setMatrix("invView",v),b.setVector2("tanHalf",new BABYLON.Vector2($*A.width/A.height,$)),b.setVector2("resolution",new BABYLON.Vector2(A.width,A.height)),b.setFloat("skyDepth",go),b.setTexture("depthSampler",l),b.setTexture("normalSampler",d)}const x=new BABYLON.PostProcess("wash","wash",["texel","radius",...M],y,1,t);x.onApply=b=>{g(b,x),b.setVector2("texel",h(x)),b.setFloat("radius",n.num("wash"))};const p=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...nn,...M],["aquarelSampler",...y],1,t);p.onApply=b=>{g(b,p),b.setVector2("texel",h(p));const A=n.texture();b.setFloat("useTex",A?1:0),b.setTexture("aquarelSampler",A||s),nn.forEach($=>b.setFloat($,n.num($)))};const w=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...sn,...M],["washSampler","animeSampler",...y],1,t);w.onApply=b=>{g(b,w),b.setTextureFromPostProcessOutput("washSampler",x),b.setTexture("animeSampler",po(e)||o),b.setVector2("texel",h(w)),sn.forEach(A=>b.setFloat(A,n.num(A))),b.setColor3("inkColor",BABYLON.Color3.FromArray(on[n.inkColor()]||on["blue-grey"]))};const F=[x,p,w];return{dispose(){F.forEach(b=>b.dispose(t)),e.onBeforeRenderObservable.remove(r),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const ee={sky:380,bg:70,mid:22,fg:7,near:3.5},O={x:0,y:1.6,z:0,fov:50},it=-2,Jn=16/9,Qn=.42,ht=1.6,yo=3,es=e=>yo*ue(e),wo=(e,t)=>t*e,bo=(e,t,n,s)=>wo(e,t)-(1-s)*n,We=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,ko=999,Mo=1e3,So=.02,ts=2,Ut=120,ns=.05,he=e=>e>Math.PI?e*Math.PI/180:e,ue=(e,t=O.fov,n=Jn)=>2*e*Math.tan(he(t)/2)*n;function an(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const rn=e=>e.z??ee[e.depth],Eo=e=>Math.min(1,Math.max(0,(e-ee.mid)/(ee.bg-ee.mid)));function Lt(e,t){return e<=ee.bg||t===0?Eo(e)*t:O.y+(t-O.y)*e/ee.bg}const Ao=(e,t)=>t?e+t.h*(1-t.top):e,zo=["ground","path","field","ramp","water"],we=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>zo.includes(t)),Fo=2,Dt=e=>we(e)&&e.w/Math.max(1,e.h)>=Fo,ss=(e,t,n,s)=>Math.min(0,bo(e,t,n,s)),ln=[2,2e3],_o=4,cn=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??O.z,n?.to?.z??O.z),O.z);function To(e,t,n,s,o,a,r=O.z){const i=ge({...e},t),l=Math.min(ln[1],Math.max(ln[0],i.z??e.z)),d=Math.max(l,r+_o),h=es(d)/s,v=o*h*i.scale;return{z:d,h:v,w:s*h*i.scale,sx:h*i.scale,sy:h*i.scale,x:(i.x-.5)*ue(d),y:ss(d,n,v,a),alphaIndex:We(l),opacity:i.opacity}}const os=(e,t)=>!!e.flat||t.layer==="ground";function Oe(e,t,n,s=0,o=s){const a=t.depth,r=rn(t)-n*ns,i=ue(r),l=a==="sky"?n*2+1:We(r);if(e.layer==="sky"){const p=i*ht,w=p/Jn,F=-w*.12+(t.y??0);if(e.tileable_x)return{x:0,y:F,z:r,w:p,h:w,uRepeat:p/(w*(e.w/e.h)),alphaIndex:l,rotation:0};const b=Math.max(p/e.w,w/e.h);return{x:0,y:F,z:r,w:e.w*b,h:e.h*b,uRepeat:1,alphaIndex:l,rotation:0}}const d=e.layer==="bg"&&!e.tileable_x?i*ht*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),d),v=h*(e.w/e.h),M=e.tileable_x?Math.max(v,i*ht):v,y=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?a==="bg"?s:0:we(e)?0:Lt(rn(t),o),x=a==="sky"?r*Math.tan(he(O.fov)/2)*.45:g;return{x:y,y:x+(t.y??0),z:r,w:M,h,uRepeat:e.tileable_x?M/v:1,alphaIndex:l,rotation:t.rotation??0}}function Lo(e,t,n=0,s=Qn,o=it){const a=.5/Math.tan(he(O.fov)/2),r=.5+a*Math.tan(-o*Math.PI/180),i=ee.bg-n*ns,l=O.y+(r-s)*i/a;return Math.round((l-t*(1-e))*10)/10}const qe=e=>e-Do,Do=.002,hn={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},as=(e,t)=>(hn[e??"inOut"]??hn.inOut)(Math.min(1,Math.max(0,t))),Ve=(e,t,n)=>e+(t-e)*n,rs=e=>e.dur_s??(e.camera&&Uo(e)||e.est_s||8);function is(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function ls(e,t,n){if(!e)return{...O,fov:he(O.fov)};const s=as(e.ease,n>0?t/(e.dur_s??n):1),o={...O,...e.from},a={...o,...e.to};return{x:Ve(o.x,a.x,s),y:Ve(o.y,a.y,s),z:Ve(o.z,a.z,s),fov:Ve(he(o.fov),he(a.fov),s)}}const Po=["x","y","z","scale","opacity","rotation"];function ge(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const a of Po){const r=s.filter(M=>M[a]!==void 0).sort((M,y)=>M.t-y.t);if(!r.length)continue;const i=r[0],l=r[r.length-1];if(t<=i.t){o[a]=i[a];continue}if(t>=l.t){o[a]=l[a];continue}const d=r.findIndex(M=>M.t>t),h=r[d-1],v=r[d];o[a]=Ve(h[a],v[a],as("inOut",(t-h.t)/(v.t-h.t)))}return o}const Co={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},cs=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function un(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??cs(e),amount:n.amount??1,speed:n.speed??1}}const Oo=.25,Ro=2e3,Bo=250,Ae={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},dn={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function Io(e,t,n,s){const o=i=>{const l=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:l,lastUp:i===-1?n:e.lastUp,locked:e.locked||l>=Ae.lockFlips&&i===1}};if(t<Ae.downFps)return s?o(1):{...e,fast:0};if(t<Ae.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=Ae.upWindows&&n-e.lastChange>=Ae.upAfterChangeMs&&n-e.lastUp>=Ae.upEveryMs?o(-1):{...e,fast:a}}function Vo(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*Oo)}function Uo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const fn={breath_m:.05,breath_s:7},No=1.5;function $o(e,t,n={}){const s=n.breath_m??fn.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??fn.breath_s),a=Math.min(1,t/No),r=a*a*(3-2*a);return{...e,x:e.x+s*r*Math.sin(o*t),y:e.y+s*.5*r*Math.sin(2*o*t)}}async function Ho(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const Go=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Fe(e,t,n){if(t.asset){const r=e.assets.find(i=>i.id===t.asset);if(r)return r}const s=Go(t.need??t.asset??"");if(!s.length)return null;let o=null,a=[0,0,0];for(const r of[...e.assets].sort((i,l)=>i.id.localeCompare(l.id))){const i=s.filter(d=>r.tags.some(h=>h.toLowerCase()===d)).length;if(!i)continue;const l=[i,n&&r.layer===n?1:0,r.qa?.score??0];(!o||l[0]>a[0]||l[0]===a[0]&&(l[1]>a[1]||l[1]===a[1]&&l[2]>a[2]))&&(o=r,a=l)}return o}const ze="#f6f5ee",Wo=.22,jo=(e,t)=>e.layer==="bg"?t.feather??Wo:0,ut=.6,Pt=12;function hs(e,t){const n=t.paper??ze,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(r=>r.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((r,i)=>r.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const a=Fe({...t,assets:o},{asset:s},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function Yo(e,t,n,s=.08){return us(e,t,n,1-s,1)}function us(e,t,n,s,o){const a=Math.max(0,Math.floor(n*s)),r=Math.min(n,Math.max(a+1,Math.ceil(n*o))),i=[[],[],[]],l=Math.max(1,Math.floor(t*(r-a)/2e4));for(let h=a*t;h<r*t;h+=l){const v=h*4;e[v+3]<200||(i[0].push(e[v]),i[1].push(e[v+1]),i[2].push(e[v+2]))}if(!i[0].length)return null;const d=h=>{const v=[...h].sort((M,y)=>M-y);return v[v.length>>1]/255};return[d(i[0]),d(i[1]),d(i[2])]}const Ue=32,Ko=(e,t,n)=>Array.from({length:Ue},(s,o)=>us(e,t,n,o/Ue,(o+1)/Ue)),Zo=(e,t)=>e[Math.min(Ue-1,Math.max(0,Math.floor((1-t)*Ue)))]??null;function Xo(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=o){const r=a*4;if(e[r+3]<230)continue;const i=(.299*e[r]+.587*e[r+1]+.114*e[r+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((a,r)=>a-r),s[s.length>>1])}function qo(e,t,n){const s=[];for(let o=0;o<t;o++)for(let a=0;a<n;a++)if(e[(a*t+o)*4+3]>128){s.push(a/n);break}return s.length?(s.sort((o,a)=>o-a),s[s.length>>1]):0}function Jo(e,t,n){for(let s=0;s<n;s++){let o=0;for(let a=0;a<t;a++)e[(s*t+a)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const Qo=1.6,ea=.12;function mn(e,t,n,s){const o=e.layer==="figure",a=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),r=a*ea*s/Qo;return o?{w:a,d:Math.min(r,a*.5)}:{w:a,d:Math.min(Math.max(r,a*.3),a*3)}}const ta=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Re=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Ct=6;function ds(e,t){const n=t.assets.filter(a=>a.layer==="ground"),s=(e.groundSlots??[]).map(a=>({asset:n.find(r=>r.id===a.asset),from:Math.max(0,Number(a.from_m)||0)})).filter(a=>!!a.asset).sort((a,r)=>a.from-r.from).slice(0,Ct);if(s.length)return s.map((a,r)=>r===0?{...a,from:0}:a);const o=hs(e,t);return o.kind==="asset"?[{asset:o.asset,from:0}]:[]}const na=(e,t)=>Math.max(0,e.reduce((n,s,o)=>t>=s.from?o:n,0)),Nt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,fs=Nt;ie.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;const sa=[1,2,3,4,5].map(e=>`
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
  ${Nt}
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
      c = slotTile(tex, slotTiles[0]); own = slotColour[0];${sa}
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
  ${Nt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const oa=e=>e?fe.WRAP_ADDRESSMODE:fe.MIRROR_ADDRESSMODE;function aa(e){const t=rt.CreateGround("ground",{width:2400,height:2400},e),n=new Ye("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tileScale","wash","grainSize","slotCount","slotFrom","slotTiles","slotColour","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","tex1","tex2","tex3","tex4","tex5","nearTex"],needAlphaBlending:!0}),s=new Gn(new Uint8Array([255,255,255,255]),1,1,xe.TEXTUREFORMAT_RGBA,e);for(const o of Be)n.setTexture(o,s);return n.setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0).setFloat("tileScale",1).setFloat("wash",.5).setFloat("grainSize",1),t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=ko,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){const a=o.slots.slice(0,Be.length);a.forEach(i=>{i.tex.wrapU=fe.WRAP_ADDRESSMODE,i.tex.wrapV=fe.WRAP_ADDRESSMODE}),Be.forEach((i,l)=>n.setTexture(i,a[l]?.tex??s));const r=(i,l)=>Be.map((d,h)=>a[h]?i(a[h]):l);n.setFloat("useTex",a.length?1:0).setFloat("slotCount",a.length).setFloats("slotFrom",r(i=>i.from,1e6)).setFloats("slotTiles",r(i=>i.tile||Pt,Pt)).setArray3("slotColour",Be.flatMap((i,l)=>a[l]?.colour??o.base)).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",V.FromArray(o.base)).setVector3("horizonTint",V.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tileScale",o.tileScale).setFloat("wash",o.wash).setFloat("grainSize",o.grainSize)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=oa(o.tileable),o.tex.wrapV=fe.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}const Be=["tex","tex1","tex2","tex3","tex4","tex5"];let ra=0;function pn(e,t,n,s,o){const a=rt.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(a.rotation.x=Math.PI/2,o){const[i,l]=o.dir,d=Math.hypot(i,l)||1;a.rotation.y=Math.atan2(i/d,l/d),a.position.set(i/d*o.length*.42,.015,l/d*o.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const r=new Ye(a.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return r.alphaMode=xe.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,r.setFloat("seed",ra++*7.31%97).setFloat("opacity",0),a.material=r,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:i=>{r.setFloat("opacity",i),a.isVisible=i>.001}}}ie.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ie.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${fs}
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
  }`;function ms(e,t,n,s){const o=rt.CreatePlane(e,{size:1},n),a=new Ye(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=xe.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,o.material=a,o.billboardMode=Vt.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:a}}const ps=9,ia=9;function la(e,t,n,s){const o=Array.from({length:ps},(a,r)=>{const i=ms(`smoke:${r}`,"stagePuff",e,s);return i.mat.setFloat("seed",r*3.7),i});return{update(a,r){o.forEach(({mesh:i,mat:l},d)=>{const h=ca(a,d),v=n*(.6+3.2*h);i.scaling.setAll(v),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(d*2.1+a*.3),t.y+n*(.4+7*h),t.z),l.setFloat("alpha",r*.7*Math.sin(Math.PI*h)),i.isVisible=r>.001})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const ca=(e,t)=>((e/ia+t/ps)%1+1)%1,dt=40,gn=16;function ha(e){const t=(e%dt+dt)%dt;return t<gn?t/gn:null}function ua(e,t,n,s){const o=Array.from({length:6},(a,r)=>ms(`bird:${r}`,"stageBird",e,s));return{update(a,r){const i=ha(a),l=Math.round(2+r*4);o.forEach(({mesh:d,mat:h},v)=>{if(d.isVisible=r>.001&&i!==null&&v<l,!d.isVisible||i===null)return;const M=v*.025;d.position.set((i-M-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*i,t+v*1.5),d.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,r*2)).setFloat("flap",Math.sin(a*7+v*1.3))})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const xn=["fire","hearth","chimney","smoke"],da=e=>e.id.split(/[-_]/).some(t=>xn.includes(t))||e.tags.some(t=>xn.includes(t.toLowerCase())),ft=e=>e[0].toUpperCase()+e.slice(1),fa=e=>({fade:`lineFade${ft(e)}`,thin:`lineThin${ft(e)}`,haze:`haze${ft(e)}`}),ot={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:it,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,groundWash:.5,groundGrain:1,grass:.5,grassSway:.15,horizonBushes:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},ma=[1.05,1,.9],pa=[.88,.93,1.05],ga=.35;function xa(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:J(e,"edgeSoft"),footM:t==="standing"?ga:0,grounding:t==="figure"?0:J(e,"grounding"),grass:t==="figure"?0:J(e,"grassOverlap"),light:o?0:J(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?J(e,"cloudDrift"):0,footTint:s}}const gs=[.93,.86,.74],vn=e=>({paper:J(e,"sheetPaper"),grain:J(e,"sheetGrain"),patches:J(e,"sheetPatches"),wash:J(e,"sheetWash"),washColour:gs}),va={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01],groundGrain:[.5,3,.05]},ya=Object.fromEntries(Object.keys(ot).map(e=>[e,va[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ae=(e,t)=>J(e,t),J=(e,t)=>{const n=Number(e[t]??ot[t]);return Number.isFinite(n)?n:ot[t]};function mt(e,t){const n=fa(t);return{fade:J(e,n.fade),thin:J(e,n.thin),haze:J(e,n.haze),brown:J(e,"lineBrown"),ink:J(e,"lineInk"),norm:J(e,"lineNorm")}}const wa=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),pt=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),Je=(e,t,n,s,o)=>{const a=s*(1080/o);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function ba(e,t,n){const s=new V(O.x,O.y,O.z),o=_e.RotationX(e*Math.PI/180),r=_e.LookAtLH(s,s.add(V.TransformNormal(new V(0,0,1),o)),V.TransformNormal(V.Up(),o)).multiply(_e.PerspectiveFovLH(he(O.fov),t,.1,2e3));return{vp:r,top:V.TransformCoordinates(new V(0,0,n),r).y}}ie.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function ka(e,t){const n=new Rs("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",V.FromArray(gs))},n}const Me=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,Ma=12;function xs(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,a=((t?.offset??0)+n*o)*(e.fps??Ma),r=Math.floor(a+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,r)):(r%s+s)%s}function Sa(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const Ea=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Aa=`
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
  ${fs}
  ${Ea}
  ${Aa}
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
  }`;const yn=new WeakMap,vs=new Map,ys=new Map,Ot=new Map,ws=new Map,tt=new Map;function Ie(e,t){const n=yn.get(t)??new Map;yn.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((a,r)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>r(new Error(`layer image ${e} did not load`)),i.onload=()=>{const l=document.createElement("canvas");l.width=i.naturalWidth,l.height=i.naturalHeight;const d=l.getContext("2d",{willReadFrequently:!0});d.drawImage(i,0,0);const h=d.getImageData(0,0,l.width,l.height).data,v=Yo(h,l.width,l.height);v&&vs.set(e,v),tt.set(e,Ko(h,l.width,l.height)),ys.set(e,Jo(h,l.width,l.height)),Ot.set(e,qo(h,l.width,l.height));const M=Xo(h,l.width,l.height);M!==null&&ws.set(e,M);for(let g=0;g<h.length;g+=4){const x=h[g+3]/255;h[g]=Math.round(h[g]*x),h[g+1]=Math.round(h[g+1]*x),h[g+2]=Math.round(h[g+2]*x)}const y=new Gn(h,l.width,l.height,xe.TEXTUREFORMAT_RGBA,t,!0,!1,fe.TRILINEAR_SAMPLINGMODE);y.anisotropicFilteringLevel=8,y.wrapV=fe.CLAMP_ADDRESSMODE,a(y)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const gt=24;function za(e,t,n,s,o){const[a,r]=t.anchor??[.5,1],i=[],l=[],d=[];for(let v=0;v<=gt;v++){const M=v/gt;for(const y of[0,1])i.push((y-a)*n,(r-M)*s,0),l.push(y,M);if(v<gt){const y=v*2;d.push(y,y+2,y+1,y+1,y+2,y+3)}}const h=new Vt(e,o);return Object.assign(new Wn,{positions:i,uvs:l,indices:d}).applyToMesh(h),h}let Fa=0;function wn(e,t,n,s,o,a){const r=za(`layer:${e.id}`,e,n,s,a),i=new Ye(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?fe.WRAP_ADDRESSMODE:fe.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=xe.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const l=Fa++*2.39996%(Math.PI*2),d=e.anchor?.[1]??1;return i.setFloat("phase",l).setFloat("height",s*d).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new Xt(0,0,1,1)),r.material=i,r.metadata={noGBuffer:!0,painted:!0},r.isPickable=!1,{mesh:r,material:i,setMotion:h=>{i.setFloat("kind",Co[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),r.isVisible=h>.001},setLine:(h,v,M,y)=>{i.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new qt(M[0],M[1])).setVector3("hazeTint",V.FromArray(y))},setPaper:(h,v)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",V.FromArray(h.washColour)).setVector2("grainUV",new qt(v[0],v[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setCell:h=>{i.setVector4("cell",new Xt(h[0],h[1],h[2],h[3]))},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",V.FromArray(h.footTint)).setVector3("sunColour",V.FromArray(ma)).setVector3("shadeColour",V.FromArray(pa))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,v)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),v&&i.setVector3("featherTint",V.FromArray(v))}}}const bs=600,ks=1.5,_a=2,Ta=.8,La=["grass","heather","reeds","shrub","bramble","juniper","hazel","meadow","fern","tree","bush","sedge","flower"],Da=["shrub","tree","bush","bramble","hedge"],Pa=["ground"];function Ca(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function bn(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}const Oa=e=>e.layer!=="ground"&&e.layer!=="sky"&&e.layer!=="bg"&&e.layer!=="figure"&&!e.tileable_x&&!Dt(e)&&e.kind!=="animation"&&e.tags.some(t=>La.includes(t));function Ra(e){const t=e.assets.filter(n=>n.kind==="sheet");return t.length?t.flatMap(n=>(n.cells??[]).map(s=>({asset:n.id,file:n.file,tags:s.tags,height_m:s.height_m,aspect:s.rect[2]*n.w/Math.max(1,s.rect[3]*n.h),cell:s.rect}))):e.assets.filter(Oa).map(n=>({asset:n.id,file:n.file,tags:n.tags,height_m:n.height_m,aspect:n.w/Math.max(1,n.h),cell:[0,0,1,1]}))}const Ms=(e,t)=>e.tags.some(n=>!Pa.includes(n)&&t.includes(n)),Ba=(e,t)=>e.filter(n=>n.height_m<=ks&&!n.tags.includes("tree")&&Ms(n,t)),Ia=["grass","meadow","heath","field","hedge","forest","marsh","wet","edge","heather"];function Va(e,t){const n=e.filter(o=>o.height_m>ks&&o.tags.some(a=>Da.includes(a))),s=n.filter(o=>Ms(o,t));return s.length||!t.some(o=>Ia.includes(o))?s:n.filter(o=>!o.tags.includes("tree"))}function kn(e){const t=Math.min(bs,Math.max(0,Math.round(e.count)));if(!e.picks.length||!t)return[];const n=Ca(e.seed),s=Math.max(e.from,e.front+_a),o=Math.max(s,e.to),a=[];for(let r=0;r<t;r++){const i=s*Math.pow(o/s,n()),l=Math.floor(n()*e.picks.length);a.push({z:i,x:(n()*2-1)*Ta*ue(i),h:e.picks[l].height_m*(.7+.6*n())*(e.size??1),pick:l,phase:n()*Math.PI*2})}return a.sort((r,i)=>i.z-r.z)}const Ss=[...Array.from({length:16},(e,t)=>2.5*Math.pow(1.4,t+1)),1/0],Mn=e=>Ss.findIndex(t=>e<t);ie.ShadersStore.stageStrewnVertexShader=`
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
  }`;function Ua(e,t,n,s,o,a,r){const i=new Ye(`strewn:${r}`,e,"stageStrewn",{attributes:["position","quad","uv","extra"],uniforms:["viewProjection","camPos","time","sway","land","haze","opacity"],samplers:["tex"],needAlphaBlending:!0});i.alphaMode=xe.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setTexture("tex",t).setVector3("haze",V.FromArray(a));const l=new Map;for(const h of s)l.set(Mn(h.z),[...l.get(Mn(h.z))??[],h]);const d=[...l].map(([h,v])=>{const M=[],y=[],g=[],x=[],p=[];v.forEach((F,b)=>{const A=n[F.pick],[$,Y,X,te]=A.cell,H=F.h*A.aspect,oe=o(F.z);for(const[I,R]of[[-.5,0],[.5,0],[.5,1],[-.5,1]])M.push(F.x,0,F.z),y.push(I,R,F.h,H),g.push($+(I+.5)*X,Y+(1-R)*te),x.push(F.phase,oe[0],oe[1],oe[2]);p.push(b*4,b*4+1,b*4+2,b*4,b*4+2,b*4+3)});const w=new Vt(`strewn:${r}:${h}`,e);return Object.assign(new Wn,{positions:M,indices:p}).applyToMesh(w),w.setVerticesData("quad",y,!1,4),w.setVerticesData(Bs.UVKind,g,!1,2),w.setVerticesData("extra",x,!1,4),w.material=i,w.alphaIndex=We(Math.min(Ss[h],2e3)),w.alwaysSelectAsActiveMesh=!0,w.isPickable=!1,w.metadata={noGBuffer:!0},w});return{meshes:d,update(h,v,M,y,g){i.setFloat("time",h).setFloat("sway",v).setFloat("land",M).setFloat("opacity",g).setVector3("camPos",y),d.forEach(x=>{x.isVisible=g>.001})},dispose(){d.forEach(h=>h.dispose()),i.dispose()}}}const Qe=[3,60],Sn=[60,300],Na=80,$a=1.8,Ha=(e,t)=>t??e.asset.tags;function En(e){const t=[],n=Math.log(Qe[1]/Qe[0]);e.slots.forEach((o,a)=>{const r=Math.max(Qe[0],o.from),i=Math.min(Qe[1],e.slots[a+1]?.from??1/0);if(i<=r)return;const l=Ba(e.sprites,Ha(o,e.bandTags)),d=e.grass*bs*(Math.log(i/r)/n);t.push({picks:l,clumps:kn({picks:l,count:d,from:r,to:i,front:e.front,seed:bn(`${e.sceneId}:grass:${a}`)})})});const s=e.slots[e.slots.length-1];if(s&&!e.bandTags){const o=Va(e.sprites,s.asset.tags);t.push({picks:o,horizon:!0,clumps:kn({picks:o,count:e.bushes*Na,from:Sn[0],to:Sn[1],front:e.front,size:$a,seed:bn(`${e.sceneId}:horizon`)})})}return t.filter(o=>o.clumps.length)}const Rt={...xo["History Lines pencil"],paper:.35,granulation:.2,...ot},Ga=new jn(.937,.914,.863,1),Wa=.7,ja=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class Ya{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new Is(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Vs(this.engine),this.scene.clearColor=Ga,this.camera=new Us("house",new V(0,1.6,0),this.scene),this.camera.rotation.set(it*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new Ns("sky",new V(0,1,0),this.scene).intensity=.7,new $s("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=aa(this.scene),this.ground.set(this.groundLook([],null,n)),this.birds=ua(this.scene,_n,ue(_n),Ja),vo(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),ka(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Re(ze);strip=null;nearTex=null;bands=[];strewn=[];strewSrc=null;strewKey="";smoke=[];birds;footTint=Re(ze);nearAsset=null;hazeTint=Re(ze);sceneLib;buildToken=0;look={...Rt};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=dn;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return Vo(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=dn,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>Bo;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Ro)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=Io(this.tier,o,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...Rt,...t??{}}}groundPoint(t,n){const s=ee[n];return new V((t-.5)*ue(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],a=[];t.set.sky&&a.push({layer:zn(t),order:0,index:-1});const r={sky:1};t.set.layers.forEach((k,B)=>{const q=k.depth;r[q]=r[q]??0,a.push({layer:k,order:r[q]++,index:B})});const i=[];await Promise.all(a.map(async({layer:k,order:B,index:q})=>{let C=Fe(n,k,k.depth);if(!C){i.push({need:k.need??k.asset,reason:"no match"});return}let le;try{le=await Ie(me(n,C,k),this.scene)}catch{i.push({need:k.need??k.asset,reason:`file did not load: ${k.src??C.file}`});return}if(s!==this.buildToken)return;C=An(C,k,le);const U=Oe(C,k,B),S=wn(C,le,U.w,U.h,U.uRepeat,this.scene);S.mesh.position.set(U.x,U.y,U.z);const z=os(k,C);S.mesh.alphaIndex=z?Mo:U.alphaIndex,z&&(S.mesh.rotation.x=Math.PI/2),S.mesh.isVisible=!1;let T,P,W;if(xt.includes(k.depth)&&!C.tileable_x&&!z&&!we(C)){const K=mn(C,U.w,U.h,U.z);W=Z=>mn(C,U.w,U.h,Z).d/K.d,T=pn(S.mesh,K.w,K.d,this.scene),T.mesh.alphaIndex=qe(U.alphaIndex),P=pn(S.mesh,K.w,K.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:U.h*Qa(this.sunDir)}),P.mesh.alphaIndex=qe(U.alphaIndex)}o.push({layer:k,index:q,builtScale:k.scale??1,builtZ:U.z,handle:S,asset:C,order:B,stain:T,cast:P,stainDepth:W,ink:ws.get(me(n,C,k)),flat:z,skyline:Ot.get(me(n,C,k))})}));const l=hs(t.set,n),d=(await Promise.all(ds(t.set,n).map(async k=>{const B=await Ie(n.base+k.asset.file,this.scene).catch(()=>(i.push({need:k.asset.id,reason:`file did not load: ${k.asset.file}`}),null)),q=(tt.get(n.base+k.asset.file)??[]).filter(C=>!!C);return B?{tex:B,tile:k.asset.height_m||Pt,from:k.from,asset:k.asset,colour:q.length?Tn(q):Re(n.paper??ze)}:null}))).filter(k=>!!k);let h=null;const v=ta(t.set.near,n),M=v?Fe(n,{asset:v}):null;if(t.set.near&&!M&&i.push({need:t.set.near,reason:"no near band"}),M)try{h=await Ie(n.base+M.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${M.file}`})}l.kind==="paper"&&l.reason&&i.push({need:t.set.ground,reason:l.reason});const y=o.filter(k=>k.asset.layer==="bg").sort((k,B)=>k.index-B.index)[0],g=y?{top:ys.get(me(n,y.asset,y.layer))??0,h:Oe(y.asset,y.layer,y.order).h,order:y.order}:null,x=o.find(k=>k.index===-1),p=x&&Oe(x.asset,x.layer,x.order),w=x&&p?Zo(tt.get(me(n,x.asset,x.layer))??[],(O.y-p.y)/p.h):null,F=y?vs.get(me(n,y.asset,y.layer))??null:t.set.groundBands?.length?null:w,b=await this.loadBands(t,n),A=t.set.groundBands?.length?[...new Set(t.set.groundBands.flatMap(k=>Fe(n,{asset:k.asset},"ground_band")?.tags??[]))]:null,$=Ra(n),Y=cn(t),X=d.map(k=>({asset:k.asset,from:k.from})),te=[...new Set(En({sceneId:t.id,slots:X,bandTags:A,sprites:$,grass:1,bushes:1,front:Y}).flatMap(k=>k.picks.map(B=>B.file)))],H=new Map;await Promise.all(te.map(async k=>{const B=await Ie(n.base+k,this.scene).catch(()=>null);B&&H.set(k,B)}));const oe=k=>k.forEach(B=>{B.stain?.mesh.material?.dispose(),B.cast?.mesh.material?.dispose(),B.handle.mesh.dispose(),B.handle.material.dispose()});if(s!==this.buildToken){oe(o),b.forEach(k=>{k.handle.mesh.dispose(),k.handle.material.dispose()});return}oe(this.built),this.bands.forEach(k=>{k.handle.mesh.dispose(),k.handle.material.dispose()}),this.bands=b,this.built=o,this.sceneLib=n;const I=d[0]?(tt.get(n.base+d[0].asset.file)??[]).filter(k=>!!k):[],R=this.groundLook(d,F,n,l.kind==="paper"?l.colour:void 0);this.horizonTint=R.tint,this.strip=g,this.smoke.forEach(k=>k.dispose()),this.smoke=o.filter(k=>da(k.asset)&&xt.includes(k.layer.depth)&&!k.flat).map(k=>{const B=Oe(k.asset,k.layer,k.order);return la(this.scene,new V(k.handle.mesh.position.x,B.h*.6,B.z),Math.min(Math.max(B.h*.8,.5),3),B.alphaIndex)}),this.footTint=I.length?Tn(I):R.base,this.nearTex=h,this.nearAsset=M,this.hazeTint=w??R.tint,this.ground.set(R),this.strewSrc={sceneId:t.id,slots:X,colours:d.map(k=>k.colour),bandTags:A,front:Y,sprites:$,tex:H},this.strewKey="",this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const a=Re(o??s.paper??ze),r=n??a;return{slots:t,base:ja(a,r,Wa),tint:r,fadeNear:ee.fg,fadeFar:ee.bg*.75,grain:t.length?.5:1}}strew(t,n){const s=this.strewSrc,o=s?`${s.sceneId}:${t}:${n}:${s.slots.length}`:"";if(o===this.strewKey||(this.strewKey=o,this.strewn.forEach(r=>r.dispose()),this.strewn=[],!s))return;const a=r=>s.colours[na(s.slots,r)]??this.footTint;for(const r of En({...s,grass:t,bushes:n}))for(const i of new Set(r.picks.map(l=>l.file))){const l=s.tex.get(i),d=r.clumps.filter(h=>r.picks[h.pick].file===i);l&&d.length&&this.strewn.push(Ua(this.scene,l,r.picks,d,a,this.hazeTint,i))}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:zn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=r=>this.built.some(i=>i.handle.mesh===r),o=[],a=[...this.scene.multiPick(t,n,s)??[]].sort((r,i)=>r.distance-i.distance);for(const r of a){const i=this.built.find(d=>d.handle.mesh===r.pickedMesh),l=r.getTextureCoordinates();!i||!l||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||we(i.asset)&&(r.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:l.x,v:l.y})}return o}pickBackdrops(t,n){const s=r=>this.bands.find(i=>i.handle.mesh===r),o=r=>this.built.find(i=>i.handle.mesh===r&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,r=>!!s(r)||!!o(r))??[]].sort((r,i)=>r.distance-i.distance).flatMap(r=>{const i=r.getTextureCoordinates();if(!i)return[];const l=s(r.pickedMesh);if(l)return[{band:l.index,asset:l.asset,u:i.x,v:i.y}];const d=o(r.pickedMesh);return[{index:d.index,asset:d.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(d=>d.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),a=1/this.engine.getRenderHeight(),r=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(d=>V.Project(d,_e.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=r.map(d=>d.x*o),l=r.map(d=>d.y*a);return{x0:Math.min(...i),y0:Math.min(...l),x1:Math.max(...i),y1:Math.max(...l),z:n.handle.mesh.position.z}}groundHeightAt(t){return Lt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?we(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,_e.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>Za*Math.min(1,Math.max(0,(Fn-o)/(Fn-qa)));this.gridMeshes=n.pieces.map((o,a)=>{const r=o.lines.map(d=>d.map(([h,v])=>new V(h,Lt(v,t),v))),i=o.lines.map(d=>d.map(([,h])=>new jn(n.rgb[0],n.rgb[1],n.rgb[2],s(h)))),l=rt.CreateLineSystem(`grid-${a}`,{lines:r,colors:i,useVertexAlpha:!0},this.scene);return l.isPickable=!1,l.setEnabled(!this.gridOff),l.alphaIndex=We(o.z)+Xa,l.material.depthFunction=xe.ALWAYS,l.material.disableDepthWrite=!0,l}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,_e.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new V(.55,-1,-.3).normalize();depthLine(t){return{...mt(this.look,t),tint:this.hazeTint}}paper(){return vn(this.look)}async loadBands(t,n){const s=[];for(const[o,a]of(t.set.groundBands??[]).entries()){const r=Fe(n,{asset:a.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await Ie(me(n,r,a),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${a.src??r.file} did not load`);continue}const l=An(r,a,i),d=es(a.z),h=d*l.h/l.w,v=wn(l,i,d,h,1,this.scene);v.material.depthFunction=xe.ALWAYS,v.mesh.position.set(0,0,a.z),v.mesh.alphaIndex=We(a.z),s.push({handle:v,z:a.z,w:d,h,skyline:Ot.get(me(n,l,a))??.5,index:o,asset:l,band:a})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?Lo(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??Qn,ae(this.look,"housePitch")):0}pose(t,n,s,o){const a=is(t,n),r=ls(a.cam,a.t,rs(t)),i=o?$o(r,o.t,o):r;this.camera.position.set(i.x,i.y,i.z),this.camera.fov=i.fov;const l=ae(this.look,"housePitch");this.camera.rotation.x=l*Math.PI/180,this.ground.follow(this.camera.position);const d=p=>ae(this.look,p);this.ground.live({detail:d("groundDetail"),vary:d("groundVary"),mixTile:d("groundMix"),tileScale:d("groundScale"),wash:d("groundWash"),grainSize:d("groundGrain")}),this.ground.near(this.nearTex?{tex:this.nearTex,...ba(l,this.engine.getAspectRatio(this.camera),d("nearFar")),span:Ka,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),v=vn(this.look),M=ae(this.look,"bandHeight"),y=this.horizonOf(t),g=Ao(y,this.strip);this.land=g,this.poseGrid(g);const x=cn(t);this.bands.forEach(p=>{const w=To(p.band,n,M,p.w,p.h,p.skyline,x);p.z=w.z,p.handle.mesh.scaling.set(w.sx,w.sy,1),p.handle.mesh.position.set(w.x,w.y,w.z),p.handle.mesh.alphaIndex=w.alphaIndex;const F=pt(h,w.z-O.z,he(O.fov));p.handle.setOpacity(w.opacity),p.handle.setBottomFade(Math.min(1,ae(this.look,"bandFade")/w.h)),p.handle.setPaper(v,Je(w.w,w.h,1,F,h)),p.handle.setLine(mt(this.look,"bg"),1,Je(w.w,w.h,1,F,h),this.hazeTint),p.handle.setMotion(un(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.strew(ae(this.look,"grass"),ae(this.look,"horizonBushes")),this.strewn.forEach(p=>p.update(s,ae(this.look,"grassSway"),g,this.camera.position,1)),this.smoke.forEach(p=>p.update(s,ae(this.look,"smoke"))),this.birds.update(s,ae(this.look,"birds"));for(const p of this.built){const w=ge(p.layer,n),F=Oe(p.asset,{...p.layer,x:w.x,y:w.y,z:w.z,scale:1,rotation:w.rotation},p.order,y,g);p.handle.mesh.position.x=F.x;const b=p.asset.layer==="bg"&&!p.asset.tileable_x?(F.z-O.z)/Math.max(.1,p.builtZ-O.z):1;p.handle.mesh.position.y=p.flat?So:we(p.asset)?ss(F.z,M,F.h*w.scale,p.skyline??0)+F.y:O.y+(F.y-O.y)*b,p.handle.mesh.position.z!==F.z&&(p.handle.mesh.position.z=F.z,p.flat||(p.handle.mesh.alphaIndex=F.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=qe(F.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(F.z)),p.cast&&(p.cast.mesh.alphaIndex=qe(F.alphaIndex))),p.handle.mesh.rotation.z=-F.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(w.scale/p.builtScale*b),p.handle.setOpacity(w.opacity),p.handle.setFeather(jo(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-F.y)/(F.h*w.scale));const A=pt(h,F.z-i.z,this.camera.fov),$=mt(this.look,p.layer.depth);p.handle.setPaper(v,Je(F.w*w.scale,F.h*w.scale,F.uRepeat,pt(1080,F.z-O.z,he(O.fov)),1080)),p.handle.setLine($,p.ink===void 0?1:wa(p.ink,$.ink,$.norm),Je(F.w*w.scale,F.h*w.scale,F.uRepeat,A,h),this.hazeTint),p.stain?.setOpacity((p.layer.shadow??ut)*w.opacity),p.cast?.setOpacity(ae(this.look,"castShadow")*((p.layer.shadow??ut)/ut)*w.opacity);const Y=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":xt.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive(xa(this.look,Y,this.sunDir.x,this.footTint)),p.handle.setMotion(un(p.asset,p.layer)),p.handle.material.setFloat("time",s),Me(p.asset)&&p.handle.setCell(Sa(p.asset,xs(p.asset,p.layer.play,n)))}}}const me=(e,t,n)=>n?.src??e.base+t.file,An=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:o}=n.getSize(),a=s/(Me(e)?e.cols:1),r=o/(Me(e)?e.rows:1);return{...e,w:a,h:r,height_m:e.height_m*(r/e.h)}},zn=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),Ka=1.3,Za=.35,Xa=.001,qa=40,Fn=120,_n=110,Ja=900,Qa=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Tn=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),xt=["mid","fg","near"],er=16/9,tr=.92;function nr(e,t,n,s){const{cam:o,t:a}=is(e,s),r=ls(o,a,rs(e)),i=ee[t.depth],l=i-r.z;if(l<=.5)return null;const d=ge(t,s),h=(d.x-.5)*ue(i),v=Math.tan(r.fov/2),M=(h-r.x)/(l*v*er),y=-it*Math.PI/180,g=Math.tan(Math.atan2(n*d.scale-r.y,l)-y)/v;return Math.abs(M)>tr?null:{x:(M+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const sr={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},Ln=new Set(["large","small","tall","long","short","fallen"]),or=new Set(["tree","shrub"]),$t=e=>e.charAt(0).toUpperCase()+e.slice(1),ar=(e,t)=>sr[e]?.[t?1:0]??e;function rr(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const a=o.length>1&&or.has(o[0])?o.slice(1):o,r=a.filter(l=>Ln.has(l)),i=a.filter(l=>!Ln.has(l));return $t([...r,...i].map(l=>ar(l,n)).join(" "))}const Dn=e=>$t(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),Es=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function pe(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&Es(s);if(o)return Dn(o);if(e.figure)return Dn(e.figure);if(s)return rr(s,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?$t(String(a)):""}function ir(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const lr=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function cr(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>lr.has(t))?"leaf":"photo"}const je=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?Es(e):null,Pn=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Te(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:Pn(e,"pose:")??t?.[1]??null,facing:Pn(e,"facing:")??(t?.[2]?"left":"right")}}const As=e=>e.find(t=>Te(t).pose==="stand"&&Te(t).facing==="right")??e[0];function zs(e){const t=new Map,n=[];for(const s of e??[]){const o=je(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const r={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,r),n.push(r)}const a=t.get(o);a.members=[...a.members,s],a.count=a.members.length}return n.map(s=>s.series?{...s,asset:As(s.members)}:s)}const hr=(e,t)=>{const n=je(t);return n?(e??[]).filter(s=>je(s)===n):t?[t]:[]},ur=e=>zs(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function dr(e,t,n){const s=(e??[]).filter(r=>je(r)===n);if(!s.length)return null;const o=Te(t),a=(r,i)=>s.find(l=>Te(l).pose===r&&Te(l).facing===i);return a(o.pose,o.facing)??a("stand",o.facing)??As(s)}const fr=24;function mr(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const o=new Image;o.onload=()=>{try{const a=document.createElement("canvas");a.width=o.naturalWidth,a.height=o.naturalHeight;const r=a.getContext("2d",{willReadFrequently:!0});r.drawImage(o,0,0),t.set(s,{w:a.width,h:a.height,data:r.getImageData(0,0,a.width,a.height).data})}catch{t.set(s,"failed")}},o.onerror=()=>t.set(s,"failed"),o.src=e+s};return{prime(s){s.forEach(o=>o?.file&&n(o.file))},opaque(s,o,a,r){const i=t.get(s?.file);if(!i||typeof i=="string")return s?.file&&n(s.file),!0;const l=s.kind==="animation"?Math.max(1,s.cols??1):1,d=s.kind==="animation"?Math.max(1,s.rows??1):1,h=i.w/l,v=i.h/d,M=Math.min(h-1,Math.max(0,Math.floor(o*h))),y=Math.min(v-1,Math.max(0,Math.floor(a*v)));return(Number.isInteger(r)?[[Math.floor(r/l)%d,r%l]]:Array.from({length:d*l},(x,p)=>[Math.floor(p/l),p%l])).some(([x,p])=>i.data[(Math.floor(x*v+y)*i.w+Math.floor(p*h+M))*4+3]>fr)}}}const se={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,ts],[80,Ut]]},pr=e=>e<=12?1:e<=40?5:20,gr=e=>pr(e)/4;function Cn(e,t=0){const n=typeof t=="function"?t:()=>t,s=d=>[e.origin[0]+d*e.dir[0],e.origin[2]+d*e.dir[2]],o=d=>e.origin[1]+d*e.dir[1]-(se.z+n(s(d)[1]));if(!(e.dir[2]>0))return null;const a=(Ut*xr-e.origin[2])/e.dir[2],r=Math.sign(o(0));if(r===0)return Jt(se,s(0));let i=0,l=null;for(let d=1;d<=On;d++){const h=a*d/On;if(Math.sign(o(h))!==r){l=h;break}i=h}if(l===null)return null;for(let d=0;d<vr;d++){const h=(i+l)/2;Math.sign(o(h))===r?i=h:l=h}return Jt(se,s(l))}const xr=4,On=400,vr=30;function Bt(e){const t=gr(Mt(se,e)[1]);return Mt(se,Ws(e,t))}const It=(e,t)=>[(e-.5)*ue(t),t],at=([e,t])=>({x:Math.round((.5+e/ue(t))*1e4)/1e4,z:t});function Ht([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function yr([e,t],n,s=[0,0]){const[[,o],[,a]]=se.cells,r=Math.max(.1,t-s[1]),i=Math.min(a,Math.max(o,s[1]+r/Math.max(.01,n)));return Mt(se,Ht([e,t],i,s))}const wr=[[ts,12,2],[12,40,10],[40,Ut,40]],br=20;function kr(){return wr.flatMap(([e,t,n],s)=>{const o=n*br,a=[];let r=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const l={...se,cells:[[-o,r],[o,i]]},d=js(l,n,Math.max(1,Math.round(i-r))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===i:i>r);a.push({z:i,lines:d.map(h=>h.map(v=>Ys(se,v).slice(0,2)))}),r=i}return a})}const Rn=-1,Bn=2;function Mr({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:a,onGround:r=()=>!1,byDistance:i=()=>!1,groundUnder:l=()=>null,footY:d=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:M=()=>!1}){let y=null,g=null,x=!1;const p="#38bdf8",w=document.createElement("div");w.dataset.stage25dSelection="",w.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${p};z-index:3;`;const F=document.createElement("div");F.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${p};pointer-events:none;`,w.appendChild(F);const b=document.createElement("div");b.dataset.rotateHandle="1",b.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",w.appendChild(b);const $=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([S,z])=>{const T=document.createElement("div");return T.dataset.scaleHandle="1",T.style.cssText=Gs(S,z),w.appendChild(T),T});t.appendChild(w),n()?.setGrid?.(kr(),Sr(t,"--color-neutral"));const Y=document.createElement("div");Y.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(Y);const X=S=>{const z=I();if(!z||S===null){Y.style.display="none";return}const T=t.getBoundingClientRect(),P=e.getBoundingClientRect();Object.assign(Y.style,{display:"block",left:`${z.left+z.width/2+P.left-T.left}px`,top:`${z.top+z.height+P.top-T.top}px`}),Y.textContent=`${s(S,"z").toFixed(2)} m`},te=S=>{const z=e.getBoundingClientRect();return{x:S.clientX-z.left,y:S.clientY-z.top}},H=(S,z)=>n()?.pickLayers(S,z).find(T=>o.opaque(T.asset,T.u,T.v,T.index))??null,oe=(S,z)=>{y=S,z&&S!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${S}`}})),R()},I=()=>{const S=y===null?null:n()?.layerBox(y);if(!S)return null;const z=e.getBoundingClientRect();return{left:S.x0*z.width,top:S.y0*z.height,width:(S.x1-S.x0)*z.width,height:(S.y1-S.y0)*z.height,z:S.z}},R=()=>{const S=I();if(!S){w.style.display="none";return}const z=e.getBoundingClientRect(),T=t.getBoundingClientRect();Object.assign(w.style,{display:"block",left:`${S.left+z.left-T.left}px`,top:`${S.top+z.top-T.top}px`,width:`${S.width}px`,height:`${S.height}px`})},k=(S,z,T)=>Math.min(T,Math.max(z,S)),B=S=>{if(S.button!==0)return;const{x:z,y:T}=te(S),P=H(z,T);if(!P){M(z,T)&&S.stopPropagation();return}S.stopPropagation(),oe(P.index,!0);const W=n().layerBox(P.index),K=r(P.index),Z=I();g={mode:"move",index:P.index,z:W.z,from:n().worldXAt(z,T,W.z),x0:s(P.index,"x"),id:S.pointerId,el:e,ground:K,start:[z,T],foot:Z?[Z.left+Z.width/2,Z.top+Z.height]:[z,T],lift:K?d(P.index):0},e.setPointerCapture?.(S.pointerId)},q=S=>z=>{if(z.button!==0||y===null)return;const T=I();if(!T)return;z.stopPropagation(),z.preventDefault();const P=e.getBoundingClientRect(),W=T.left+T.width/2,K=T.top+T.height/2,{x:Z,y:Se}={x:z.clientX-P.left,y:z.clientY-P.top};g={mode:S,index:y,cx:W,cy:K,id:z.pointerId,el:z.currentTarget,d0:Math.max(8,Math.hypot(Z-W,Se-K)),a0:Math.atan2(Se-K,Z-W),scale0:s(y,"scale"),rotation0:s(y,"rotation"),byDistance:S==="scale"&&i(y),p0:It(s(y,"x"),s(y,"z")),eye:h()},z.currentTarget.setPointerCapture?.(z.pointerId)},C=S=>{const{x:z,y:T}=te(S);if(g?.mode==="move"&&g.ground){const P=l(g.foot[0]+z-g.start[0],g.foot[1]+T-g.start[1],g.lift,g.index);if(!P)return;const W=at(Bt(P));a(g.index,"x",k(W.x,Rn,Bn)),a(g.index,"z",W.z),X(g.index);return}if(g?.mode==="move"){const P=(n().worldXAt(z,T,g.z)-g.from)/ue(g.z);a(g.index,"x",Math.round(k(g.x0+P,Rn,Bn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const P=Math.hypot(z-g.cx,T-g.cy)/g.d0*g.scale0,W=Bt(yr(g.p0,P,g.eye))[1],K=at(Ht(g.p0,W,g.eye));g.scale0!==1&&a(g.index,"scale",1),a(g.index,"x",K.x),a(g.index,"z",K.z),X(g.index);return}if(g?.mode==="scale"){const P=Math.hypot(z-g.cx,T-g.cy);a(g.index,"scale",Math.round(k(g.scale0*(P/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let P=g.rotation0+(Math.atan2(T-g.cy,z-g.cx)-g.a0)*180/Math.PI;S.shiftKey&&(P=Math.round(P/15)*15),a(g.index,"rotation",Math.round(P*10)/10);return}x||(x=!0,requestAnimationFrame(()=>{x=!1,e.style.cursor=H(z,T)?"pointer":""}))},le=()=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const S=g.index,z=g.mode==="move"&&g.ground||g.byDistance;g=null,Y.style.display="none",z&&v(S)},U=S=>{y!==null&&S.detail?.id!==`s25_layer-${y}`&&(y=null,R())};e.addEventListener("pointerdown",B);for(const S of[e,...$,b])S.addEventListener("pointermove",C),S.addEventListener("pointerup",le),S.addEventListener("pointercancel",le);return $.forEach(S=>S.addEventListener("pointerdown",q("scale"))),b.addEventListener("pointerdown",q("rotate")),window.addEventListener("scene-object-selected",U),{select:(S,z=!1)=>oe(S,z),get selected(){return y},place:R,destroy(){window.removeEventListener("scene-object-selected",U),w.remove(),n()?.setGrid?.(null),Y.remove()}}}function Sr(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const Gt=["x","y","z","scale","rotation","opacity","keys","figure","play"],ne=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},vt=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Gt.includes(t))),In=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{},{camera:a,...r}=e??{};return JSON.stringify({...r,set:{...o,layers:t.map(vt),groundBands:n.map(vt),skyLayer:vt(s)}})},yt=e=>Gt.map(t=>e?.[t]??null),wt=e=>JSON.stringify([(e?.set?.layers??[]).map(yt),(e?.set?.groundBands??[]).map(yt),yt(e?.set?.skyLayer),e?.camera??null]),Vn={x:[-8,8],y:[.3,6],z:[-4,15],fov:[20,75]},Er=10,Un=.01,Ar=.01,zr=(e,[t,n])=>Math.min(n,Math.max(t,e)),Fr=e=>Math.round(e*1e3)/1e3,be=e=>{const t={...O,...e};return Object.fromEntries(Object.keys(Vn).map(n=>[n,Fr(zr(Number(t[n])||O[n],Vn[n]))]))},_r=(e,t,n,s)=>{const o=be(e),a=2*Er*Math.tan(he(o.fov)/2)/Math.max(1,s);return be({...o,x:o.x-t*a,y:o.y+n*a})},Tr=(e,{deltaX:t=0,deltaY:n=0,ctrlKey:s=!1})=>{const o=be(e);return be(s?{...o,fov:o.fov*Math.exp(n*Ar)}:{...o,z:o.z-n*Un,x:o.x+t*Un})},Lr=(e,t,n)=>({...e??{move:"framed",from:{...O},to:{...O},ease:"inOut",at_s:0},[t]:be(n)}),bt=(e,t)=>be(e?.[t]??e?.from??O),Dr={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},Pr={nl:"Camera",de:"Kamera",fr:"Caméra",it:"Telecamera"},Nn=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch","groundWash","groundGrain","grass","grassSway","horizonBushes"],Cr=e=>Me(e)?"vfx":e.layer,$n=e=>Me(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,Hn="application/x-lp-stage25d",et=new Map,kt=new Map,Or=e=>(kt.has(e)||kt.set(e,mr(e)),kt.get(e));function Rr(e){return et.has(e)||et.set(e,Ho(Hs(e)).catch(t=>{throw et.delete(e),t})),et.get(e)}const Br=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function Kr(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,a=null,r=null,i=new Map,l=new Map,d=0,h=null,v=0,M=0,y=performance.now(),g=!1,x=[],p=[],w={},F=new Set,b=null,A=null;const $=c=>Me(c)?null:A.base+"thumbs/"+c.file;let Y=null,X=null,te={},H=null,oe=0,I=null,R=null,k=!1;const B=()=>{s.engine.runRenderLoop(()=>{const c=performance.now();M+=Math.min(.1,(c-y)/1e3),y=c,s.tick(c),o&&s.pose(R&&k?z():o,Z(),M),s.scene.render(),H?.place()})},q=()=>{if(!o||!s)return;const c=(u,m)=>F.has(m)?{...u,opacity:0,keys:[]}:u;o={...o,set:{...o.set,groundBands:p.map((u,m)=>c(u,`band-${m}`)),skyLayer:w,layers:x.map((u,m)=>c(u,`layer-${m}`))}},s.rebind(o)},C=c=>{const u=/^band-(\d+)$/.exec(String(c??""));return u&&p[Number(u[1])]?Number(u[1]):-1},le=c=>c==="sky"?r?.set?.sky?{...w,depth:"sky"}:null:C(c)>=0?{...p[C(c)],depth:"bg"}:x[ne(c)]??null,U=(c,u)=>{let m=null;if(c==="sky"&&r?.set?.sky){if(u.motion===void 0)return null;w={...w,motion:u.motion},m={skyLayer:{motion:u.motion}}}else if(C(c)>=0){const f=C(c);p=p.map((E,_)=>_===f?{...E,...u}:E),m={band:{index:f,...u}}}else if(x[ne(c)]){const f=ne(c);x=x.map((E,_)=>_===f?{...E,...u}:E),m=f}return m===null?null:(b=S(),q(),m)},S=()=>wt({set:{layers:x,groundBands:p,skyLayer:w},camera:I}),z=()=>{const c=bt(I,R);return{...o,camera:{from:c,to:c},camera_more:[]}},T=c=>{!R||!o||(I=Lr(I,R,c),o={...o,camera:I},b=S(),L.sceneId!=null&&t.onCommit?.(0,{camera:I},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited")))},P=()=>{let c=null;const u=f=>{f.preventDefault(),f.stopImmediatePropagation()};n.addEventListener("pointerdown",f=>{R&&(u(f),n.setPointerCapture?.(f.pointerId),k=!0,c={x:f.clientX,y:f.clientY,pose:bt(I,R)},n.style.cursor="grabbing")},{capture:!0}),n.addEventListener("pointermove",f=>{R&&(u(f),c&&T(_r(c.pose,f.clientX-c.x,f.clientY-c.y,n.getBoundingClientRect().height)))},{capture:!0});const m=f=>{c&&(u(f),c=null,n.style.cursor=R?"grab":"")};n.addEventListener("pointerup",m,{capture:!0}),n.addEventListener("pointercancel",m,{capture:!0}),n.addEventListener("wheel",f=>{R&&(u(f),k=!0,T(Tr(bt(I,R),f)))},{capture:!0,passive:!1}),window.addEventListener("scene-object-selected",f=>{f.detail?.id!=="s25_camera"&&L.frameCamera(null)})},W=()=>({...r.set,layers:x,groundBands:p,skyLayer:w}),K=(c,u)=>{const m=U(c,u);m===null||L.sceneId==null||(typeof m=="number"?t.onCommit?.(m,u,L.sceneId):t.onCommit?.(0,m,L.sceneId))},Z=()=>h?h():d,Se=()=>r?.set?.sky&&A?i.get(r.set.sky)??Fe(A,{asset:r.set.sky},"sky"):null,Ee=c=>{const u=i.get(x[c]?.asset);return!!(x[c]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&x[c].depth!=="sky")},Fs=c=>c==="sky"||C(c)>=0,_s=(c,u)=>{const m=s?.pickBackdrops?.(c,u).find(E=>Y.opaque(E.asset,E.u,E.v)),f=m?m.band!==void 0?`band-${m.band}`:`layer-${m.index}`:r?.set?.sky?"sky":null;return f&&L.select(f),!!f},Wt=(c,u)=>we(u)||os(c,u),jt=c=>{const u=i.get(x[c]?.asset);return!!u&&Wt(x[c],u)},Le=c=>ge(x[c],Z()).z??ee[x[c].depth],Ts=c=>Ee(c)&&!(x[c].keys??[]).some(u=>u.scale!==void 0),Yt=c=>Math.round(c*1e3)/1e3,Kt=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],L={canvas:n,sceneId:null,async show(c){const u=await Rr(c.bundle);if(g)return;s||(s=new Ya(n,u),B()),te={...c.look??{}},s.setLook(te);const m=Br(c);await s.build(m,u),o=m,x=m.set.layers,p=(m.set.groundBands??[]).map(f=>({...f})),w={...m.set.skyLayer??{}},I=m.camera,F=new Set,b=wt(c),r=c,i=new Map(u.assets.map(f=>[f.id,f])),A=u,Y=Or(u.base),Y.prime(m.set.layers.map(f=>i.get(f.asset)).filter(Boolean)),t.editable&&!H&&(n.style.pointerEvents="auto",P(),window.addEventListener("scene-object-selected",f=>{f.detail?.id!==`s25_${X}`&&(X=null)}),n.addEventListener("dragover",f=>{f.dataTransfer?.types?.includes(Hn)&&(f.preventDefault(),f.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",f=>{const E=f.dataTransfer?.getData(Hn);if(!E)return;f.preventDefault();const _=n.getBoundingClientRect();L.addLayer(E,{x:f.clientX-_.left,y:f.clientY-_.top})}),n.addEventListener("dblclick",()=>{const f=X??(H?.selected!=null?`layer-${H.selected}`:null),E=f&&L.editTarget(f);E&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:E}))}),H=Mr({canvas:n,host:e,stage:()=>s,alpha:{opaque:(f,E,_,N)=>Y.opaque(f,E,_,Me(f)?xs(f,x[N]?.play,Z()):void 0)},valueOf:(f,E)=>E==="z"?Le(f):ge(x[f],Z())[E],onGround:Ee,byDistance:Ts,groundUnder:(f,E,_,N)=>Cn(s.pointerRay(f,E),jt(N)?_:D=>s.groundHeightAt(D)+_),footY:f=>s.layerFootY(f)-(jt(f)?0:s.groundHeightAt(Le(f))),eye:Kt,onSettled:f=>L.settleBand(f),onEmpty:(f,E)=>_s(f,E),onChange:(f,E,_)=>L.moveLayer(`layer-${f}`,E,_)})),(H?.selected??-1)>=x.length&&H.select(null),l=new Map(u.assets.map(f=>[f.id,f.height_m??1.7])),v=Number(c.narration_at_s)||0,a=In(c),e.dataset.stage25dReady="1"},editTarget(c){const u=c==="sky"?r?.set?.sky?w:null:C(c)>=0?p[C(c)]:x[ne(c)],m=c==="sky"?Se():i.get(u?.asset);return!u||!m||!A?null:{id:`s25_${c}`,title:L.items().find(f=>f.id===c)?.label??pe({},m,(document.documentElement.lang||"en").slice(0,2)),original:A.base+m.file,state:u.edit_state??null,edited:!!u.src,el:e}},matches:c=>a===In(c),adopt(c){const u=wt(c);if(u===b)return!1;b=u;const m=(f,E)=>{const _={...f};for(const N of Gt)E?.[N]===void 0?delete _[N]:_[N]=E[N];return _};return x=x.map((f,E)=>m(f,c.set?.layers?.[E])),p=p.map((f,E)=>m(f,c.set?.groundBands?.[E])),w=m(w,c.set?.skyLayer),I=c.camera??null,o=o&&{...o,camera:I},r=c,q(),!0},setLayerProp(c,u,m){U(c,{[u]:m})},setLayerKeys(c,u){const m=le(c);m&&JSON.stringify(m.keys??[])!==JSON.stringify(u)&&U(c,{keys:u})},commitLayerProp(c,u,m){K(c,{[u]:m})},readLayerProp(c,u){const m=le(c),f=m?u==="z"&&ne(c)>=0?Le(ne(c)):u==="z"?ge(m,Z()).z??m.z:ge(m,Z())[u]:null;return Number.isFinite(f)?f:null},setHidden(c,u){ne(c)<0&&C(c)<0||(F=new Set(u?[...F,c]:[...F].filter(m=>m!==c)),q())},update(c){Math.max(0,c)!==d&&(k=!1),h=null,d=Math.max(0,c)},play(c){h=()=>v+c()},moveLayer(c,u,m){window.__timelineKeying?.edit?.(`s25:${c}`,u,m,{flush:!1})||L.commitLayerProp(c,u,m)},select(c){if(c==="camera"){X=null,H?.select(null),L.frameCamera(R??"from"),window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_camera"}}));return}L.frameCamera(null),X=Fs(c)?c:null,H?.select(ne(c)>=0?ne(c):null,!X),X&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${X}`}}))},get skySelected(){return X==="sky"},get backdrop(){return X},get selection(){return H?.selected??null},clearSelection(){H?.select(null),L.frameCamera(null)},frameCamera(c){R=c==="from"||c==="to"?c:null,k=!!R,n.style.cursor=R?"grab":"",window.dispatchEvent(new CustomEvent("stage25d-edited"))},cameraInfo:()=>({framing:R,moves:!!I}),resetCamera(){I=null,o&&(o={...o,camera:null}),b=S(),L.sceneId!=null&&t.onCommit?.(0,{camera:null},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},atStart(){return d===0&&h===null&&F.size===0&&!R},layerInfo(c){const u=(D,Q)=>{const de=typeof D.motion=="string"?{kind:D.motion}:D.motion??{};return{kind:de.kind??cs(Q),amount:de.amount??1,speed:de.speed??1}};if(c==="sky"){const D=Se();return D?{id:c,asset:D.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:pe({},D,(document.documentElement.lang||"en").slice(0,2)),file:w.src??`${A.base}${D.file}`,motion:u(w,D)}:null}if(C(c)>=0){const D=p[C(c)],Q=i.get(D.asset);return{id:c,asset:D.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:L.items().find(de=>de.id===c)?.label??"",file:D.src??(Q?`${A.base}${Q.file}`:null),motion:u(D,Q)}}const m=x[ne(c)];if(!m)return null;const f=i.get(m.asset)??null,E=Ee(ne(c)),_=!E||(m.scale??1)!==1||(m.keys??[]).some(D=>D.scale!==void 0),N=f?.layer==="bg"&&!f.tileable_x;return{id:c,asset:m.asset??null,depth:m.depth,figure:m.figure??null,role:f?.layer??null,ground:E,showScale:_,fields:E?["x","z",..._?["scale"]:[],"rotation","opacity"]:["x",...N?["z"]:[],"y","scale","rotation","opacity"],label:L.items().find(D=>D.id===c)?.label??pe(m,f,(document.documentElement.lang||"en").slice(0,2)),file:m.src??(f?`${A.base}${f.file}`:null),motion:u(m,f),anim:$n(f),play:{speed:m.play?.speed??1,offset:m.play?.offset??0}}},setLayerPlay(c,u){const m=le(c);m&&K(c,{play:{...m.play??{},...u}})},setLayerMotion(c,u){const m=le(c);m&&K(c,{motion:{...typeof m.motion=="object"?m.motion:{kind:m.motion},...u}})},reorderLayers(c,u,m){if(!Ee(u)){m(c,u,L.sceneId,null,null,null);return}const f=ve=>x[ve]?.z??ee[x[ve]?.depth],E=c.filter(ve=>ve===u||Ee(ve)),_=E.indexOf(u),N=E[_-1],D=E[_+1],Q=Le(u),de=N===void 0?0:f(N),lt=D===void 0?1/0:f(D);if((N!==void 0||D!==void 0)&&(Q<de||Q>lt)){const ve=It(ge(x[u],Z()).x,Q),Ls=N===void 0?lt/1.25:D===void 0?de*1.25:(de+lt)/2,Ke=Math.round(Math.min(se.cells[1][1],Math.max(se.cells[0][1],Ls))*100)/100,ct=Kt(),Ds=(Ke-ct[1])/Math.max(.1,Q-ct[1]),Zt=ce=>Yt(Math.min(20,Math.max(.01,ce*Ds))),Ps=x[u].keys?.some(ce=>ce.z!==void 0||ce.scale!==void 0)?x[u].keys.map(ce=>({...ce,...ce.z!==void 0&&{z:Math.min(se.cells[1][1],Math.max(se.cells[0][1],Yt(ce.z+Ke-Q)))},...ce.scale!==void 0&&{scale:Zt(ce.scale)}})):null;m(c,u,L.sceneId,at(Ht(ve,Ke,ct)).x,Ke,Zt(x[u].scale??1),Ps);return}m(c,u,L.sceneId,x[u].x??.5,f(u),x[u].scale??1)},library(){if(!A)return null;const c=(document.documentElement.lang||"en").slice(0,2);return{bundle:A.bundle,assets:A.assets.filter(u=>u.kind!=="sheet").map(u=>({id:u.id,layer:u.layer,shelf:Cr(u),anim:$n(u),band:Dt(u),tags:u.tags??[],url:A.base+u.file,thumb:$(u),label:pe({},u,c)}))}},tiles:c=>zs(c),seriesOfLayer(c){const u=i.get(x[ne(c)]?.asset),m=je(u);if(!m||!A)return null;const f=(document.documentElement.lang||"en").slice(0,2),E=_=>({id:_.id,url:A.base+_.file,thumb:$(_),...Te(_)});return{series:m,asset:u.id,members:hr(A.assets,u).map(E),characters:ur(A.assets).map(_=>({series:_.series,url:A.base+_.asset.file,thumb:$(_.asset),label:pe({},_.asset,f)}))}},async switchCharacter(c,u){const m=i.get(x[ne(c)]?.asset),f=m&&A?dr(A.assets,m,u):null;f&&await L.swapAsset(c,f.id)},async swapAsset(c,u){if(c==="sky"){if(i.get(u)?.layer!=="sky"||Se()?.id===u)return;await L.show({...r,set:{...W(),sky:u}}),L.sceneId!=null&&t.onCommit?.(0,{sky:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const m=p[C(c)];if(m){const E=i.get(u);if(!E||!Dt(E)||m.asset===u)return;const _=Number(c.slice(5)),N=p.map((D,Q)=>Q===_?{...D,asset:u}:D);await L.show({...r,set:{...W(),groundBands:N}}),L.sceneId!=null&&t.onCommit?.(0,{band:{index:_,asset:u}},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L.select(c);return}const f=ne(c);f<0||!x[f]||!i.has(u)||x[f].asset===u||(x=x.map((E,_)=>_===f?{...E,asset:u}:E),await L.show({...r,set:W()}),t.onCommit?.(f,{asset:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(c,u=null){const m=i.get(c);if(!m)return;const f=["mid","fg","near","bg","sky"].includes(m.layer)?m.layer:m.layer==="figure"?"fg":"mid",E=u?0:x.filter(N=>N.asset===c).length;let _={asset:c,depth:f,x:.5+.08*(E%5),scale:1};if(!(m.tileable_x||m.layer==="bg"||m.layer==="sky")){const N=u&&s?Cn(s.pointerRay(u.x,u.y),Wt({},m)?0:Q=>s.groundHeightAt(Q)):null,D=at(Bt(N??It(_.x,ee[f])));_={..._,...D,depth:an(D.z)}}x=[...x,_],await L.show({...r,set:W()}),t.onCommit?.(x.length-1,{add:_},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),H?.select(x.length-1,!0)},async settleBand(c){const u=x[c];if(!u||!Ee(c))return;const m=an(Le(c));if(m===u.depth)return;x=x.map((E,_)=>_===c?{...E,depth:m}:E);const f=F;await L.show({...r,set:W()}),F=f,q(),L.sceneId!=null&&t.onCommit?.(c,{depth:m},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),H?.select(c,!1)},groundSlots(){if(!A||!r)return null;const c=(document.documentElement.lang||"en").slice(0,2),u=ds(r.set??{},A).map(f=>({asset:f.asset.id,from_m:f.from})),m=A.assets.filter(f=>f.layer==="ground").map(f=>({id:f.id,label:pe({},f,c),thumb:$(f)}));return{rows:u,options:m,max:Ct}},async setGroundSlots(c){if(!r||!Array.isArray(c))return;const u=c.slice(0,Ct).map((f,E)=>({asset:String(f.asset),from_m:E===0?0:Math.max(0,Math.min(2e3,Number(f.from_m)||0))})),m=F;await L.show({...r,look:te,set:{...W(),groundSlots:u}}),F=m,q(),L.sceneId!=null&&t.onGroundSlots?.(u,L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},lookControls(){return Nn.map(c=>{const[u,m,f]=ya[c]??[0,1,.01];return{key:c,min:u,max:m,step:f,value:ae({...Rt,...te},c)}})},setLook(c,u){!Nn.includes(c)||!Number.isFinite(u)||!s||(te={...te,[c]:u},s.setLook(te),t.onLook?.(c,u,L.sceneId))},async still(c=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const m=document.createElement("canvas");return m.width=c,m.height=Math.max(1,Math.round(c*n.height/n.width)),m.getContext("2d").drawImage(n,0,0,m.width,m.height),m.toDataURL("image/jpeg",.72)};return s.engine.resize(),oe++,s.gridHidden=!0,new Promise(m=>{let f=0;const E=D=>{s.engine.onEndFrameObservable.remove(_),clearTimeout(N),s.gridHidden=--oe>0,m(D)},_=s.engine.onEndFrameObservable.add(()=>{++f>=6&&E(u())}),N=setTimeout(()=>E(null),4e3)})},get config(){return r},figureBox(c){const u=x.find(_=>_.figure===c);if(!u?.asset)return null;const m=nr(o,u,l.get(u.asset)??1.7,Z());if(!m)return null;const f=n.getBoundingClientRect(),E=f.width*.05;return new DOMRect(f.left+m.x*f.width-E/2,f.top+m.y*f.height,E,f.height*.08)},items:()=>{const c=(document.documentElement.lang||"en").slice(0,2),u=ir([...x.map((m,f)=>pe(m,i.get(m.asset),c)||`layer ${f+1}`),...p.map(m=>pe({},i.get(m.asset)??{id:m.asset},c))]);return[...x.map((m,f)=>({id:`layer-${f}`,label:u[f],icon:cr(i.get(m.asset)),depth:m.depth,z:m.z??ee[m.depth],keys:m.keys??[]})),...p.map((m,f)=>({id:`band-${f}`,label:u[x.length+f],icon:"photo",depth:"bg",z:m.z,keys:m.keys??[],backdrop:!0})),...r?.set?.sky?[{id:"sky",label:Dr[c]??"Sky",icon:"cloud",depth:"sky",keys:w.keys??[],backdrop:!0}]:[],{id:"camera",label:Pr[c]??"Camera",icon:"camera",depth:null,keys:[]}]},destroy(){g=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}H?.destroy(),n.remove()}};return L}export{Hn as DROP_TYPE,Nn as LOOK_KEYS,Kr as createStage25d,Br as stageScene};
