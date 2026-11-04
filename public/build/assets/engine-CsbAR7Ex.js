import{m as Vs,c as Ns,M as ct,S as Xe,R as Jn,C as we,T as pe,V,E as le,a as Ht,b as Le,P as Us,d as on,e as an,f as Qn,g as $s,h as Hs,i as Gs,j as es,U as Ws,H as js,D as Ys}from"./babylon-DoYGJMOP.js";import{l as Ks}from"./config-DwQUN7uY.js";import{handleCss as Xs}from"./ArtworkOverlay-lDEEga4w.js";import{g as zt,c as Zs,w as rn,h as qs,e as Js}from"./projection-CL24asTn.js";import"./vite-helpers-IKSIfP92.js";import"./properties-D8-XgaoP.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-DjxMS0mJ.js";import"./ambient-CEzLlAaX.js";const He=new Set;let _t=!1;function Qs(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;He.size&&He.clear();let a=ts(e,0,o,n,!0);const r=[];if(!a||a.next===a.prev)return r;let i=0,c=0,f=0;if(s&&(a=oo(e,t,a,n)),e.length>80*n){i=e[0],c=e[1];let h=i,v=c;for(let M=n;M<o;M+=n){const y=e[M],g=e[M+1];y<i&&(i=y),g<c&&(c=g),y>h&&(h=y),g>v&&(v=g)}f=Math.max(h-i,v-c),f=f!==0?32767/f:0}return Ft(a,r,i,c,f),r}function ts(e,t,n,s,o){let a=null;if(o===vo(e,t,n,s)>0)for(let r=t;r<n;r+=s)a=hn(r/s|0,e[r],e[r+1],a);else for(let r=n-s;r>=t;r-=s)a=hn(r/s|0,e[r],e[r+1],a);return a&&Ge(a,a.next)&&(je(a),a=a.next),a}function Ee(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&(He.size===0||!He.has(s))&&(Ge(s,s.next)||K(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),_t=!0,je(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function Ft(e,t,n,s,o){o&&uo(e,n,s,o);let a=e,r=!1;for(;e.prev!==e.next;){const i=e.prev,c=e.next;if(K(i,e,c)<0&&(o?to(e,n,s,o):eo(e))){t.push(i.i,e.i,c.i),je(e),e=c,a=c;continue}if(e=c,e===a){if(_t=!1,e=Ee(e),_t){a=e;continue}if(!r){e=no(e,t),a=e,r=!0;continue}so(e,t,n,s,o);break}}}function eo(e){const t=e.prev,n=e,s=e.next,o=t.x,a=n.x,r=s.x,i=t.y,c=n.y,f=s.y,h=Math.min(o,a,r),v=Math.min(i,c,f),M=Math.max(o,a,r),y=Math.max(i,c,f);let g=s.next;for(;g!==t;){if(g.x>=h&&g.x<=M&&g.y>=v&&g.y<=y&&!(o===g.x&&i===g.y)&&rt(o,i,a,c,r,f,g.x,g.y)&&K(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function to(e,t,n,s){const o=e.prev,a=e,r=e.next,i=o.x,c=a.x,f=r.x,h=o.y,v=a.y,M=r.y,y=Math.min(i,c,f),g=Math.min(h,v,M),x=Math.max(i,c,f),p=Math.max(h,v,M),b=Pt(y,g,t,n,s),z=Pt(x,p,t,n,s);let k=e.prevZ;for(;k&&k.z>=b;){if(k.x>=y&&k.x<=x&&k.y>=g&&k.y<=p&&k!==r&&!(i===k.x&&h===k.y)&&rt(i,h,c,v,f,M,k.x,k.y)&&K(k.prev,k,k.next)>=0)return!1;k=k.prevZ}let A=e.nextZ;for(;A&&A.z<=z;){if(A.x>=y&&A.x<=x&&A.y>=g&&A.y<=p&&A!==r&&!(i===A.x&&h===A.y)&&rt(i,h,c,v,f,M,A.x,A.y)&&K(A.prev,A,A.next)>=0)return!1;A=A.nextZ}return!0}function no(e,t){let n=e,s=!1;do{const o=n.prev,a=n.next.next;os(o,n,n.next,a,!1)&&We(o,a)&&We(a,o)&&(t.push(o.i,n.i,a.i),je(n),je(n.next),n=e=a,s=!0),n=n.next}while(n!==e);return s?Ee(n):n}function so(e,t,n,s,o){let a=e;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&po(a,r)){let i=as(a,r);a=Ee(a,a.next),i=Ee(i,i.next),Ft(a,t,n,s,o),Ft(i,t,n,s,o);return}r=r.next}a=a.next}while(a!==e)}let Tt=!1;function oo(e,t,n,s){const o=[];for(let a=0,r=t.length;a<r;a++){const i=t[a]*s,c=a<r-1?t[a+1]*s:e.length,f=ts(e,i,c,s,!1);f===f.next&&He.add(f),o.push(mo(f))}o.sort(ao),io(e.length/s,t.length),ss(n,n),Tt=!0;for(let a=0;a<o.length;a++)n=ro(o[a],n);return Tt=!1,Ee(n)}function ao(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function ro(e,t){const n=co(e,t);if(!n)return t;const s=as(n,e),o=s.next;return ss(n,o.next),Ee(s,s.next),Ee(n,n.next)}const ns=16;let $=new Float64Array(0),at=0;const Lt=[],Ct=[];function io(e,t){const n=Math.ceil((e+2*t)/ns)+t+2;$.length<n*4&&($=new Float64Array(n*4)),at=0}function ss(e,t){let n=e;do{const s=at++;Lt[s]=n;let o=1/0,a=1/0,r=-1/0,i=-1/0,c=0;do{const h=n.next;n.z=s,n.x<o&&(o=n.x),n.x>r&&(r=n.x),n.y<a&&(a=n.y),n.y>i&&(i=n.y),h.x<o&&(o=h.x),h.x>r&&(r=h.x),h.y<a&&(a=h.y),h.y>i&&(i=h.y),n=h}while(++c<ns&&n!==t);Ct[s]=n;const f=s*4;$[f]=o,$[f+1]=a,$[f+2]=r,$[f+3]=i}while(n!==t)}function lo(e,t){const n=e.z*4;t.x<$[n]&&($[n]=t.x),t.y<$[n+1]&&($[n+1]=t.y),t.x>$[n+2]&&($[n+2]=t.x),t.y>$[n+3]&&($[n+3]=t.y)}function ln(e){let t=Ct[e];for(;t.prev.next!==t;)t=t.next;return Ct[e]=t,t}function cn(e){let t=Lt[e];for(;t.prev.next!==t;)t=t.next;return Lt[e]=t,t}function co(e,t){let n=t;const s=e.x,o=e.y;let a=-1/0,r;if(Ge(e,n))return n;for(let M=0,y=0;M<at;M++,y+=4){if(o<$[y+1]||o>$[y+3]||$[y]>s||$[y+2]<=a)continue;const g=ln(M);n=cn(M);do{if(n.prev.next===n){if(Ge(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const x=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(x<=s&&x>a&&(a=x,r=n.x<n.next.x?n:n.next,x===s))return r}}n=n.next}while(n!==g)}if(!r)return null;const i=r.x,c=r.y,f=Math.min(o,c),h=Math.max(o,c);let v=1/0;for(let M=0,y=0;M<at;M++,y+=4){if($[y+2]<i||$[y]>s||$[y+3]<f||$[y+1]>h)continue;const g=ln(M);n=cn(M);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&rt(o<c?s:a,o,i,c,o<c?a:s,o,n.x,n.y)){const x=Math.abs(o-n.y)/(s-n.x);(We(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(x<v||x===v&&(n.x>r.x||n.x===r.x&&ho(r,n)))&&(r=n,v=x)}n=n.next}while(n!==g)}return r}function ho(e,t){return K(e.prev,e,t.prev)<0&&K(t.next,e,e.next)<0}const ie=[];let De=[],Me=new Uint32Array(0),Oe=new Uint32Array(0);const Re=new Uint32Array(256);function uo(e,t,n,s){let o=e,a=0;do o.z=Pt(o.x,o.y,t,n,s),ie[a++]=o,o=o.next;while(o!==e);fo(a);let r=null;for(let i=0;i<a;i++){const c=ie[i];c.prevZ=r,r&&(r.nextZ=c),r=c}r.nextZ=null}function fo(e){if(e<=32){for(let t=1;t<e;t++){const n=ie[t],s=n.z;let o=t-1;for(;o>=0&&ie[o].z>s;)ie[o+1]=ie[o],o--;ie[o+1]=n}return}Me.length<e&&(Me=new Uint32Array(e),Oe=new Uint32Array(e),De=new Array(e));for(let t=0;t<e;t++)Me[t]=ie[t].z;qe(e,ie,Me,De,Oe,0),qe(e,De,Oe,ie,Me,8),qe(e,ie,Me,De,Oe,16),qe(e,De,Oe,ie,Me,24)}function qe(e,t,n,s,o,a){Re.fill(0);for(let i=0;i<e;i++)Re[n[i]>>>a&255]++;let r=0;for(let i=0;i<256;i++){const c=Re[i];Re[i]=r,r+=c}for(let i=0;i<e;i++){const c=n[i],f=Re[c>>>a&255]++;s[f]=t[i],o[f]=c}}function Pt(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function mo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function rt(e,t,n,s,o,a,r,i){return(o-r)*(t-i)>=(e-r)*(a-i)&&(e-r)*(s-i)>=(n-r)*(t-i)&&(n-r)*(a-i)>=(o-r)*(s-i)}function po(e,t){const n=Ge(e,t)&&K(e.prev,e,e.next)>0&&K(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||We(e,t)&&We(t,e)&&(K(e.prev,e,t.prev)!==0||K(e,t.prev,t)!==0))&&!go(e,t)&&(n||xo(e,t))}function K(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Ge(e,t){return e.x===t.x&&e.y===t.y}function os(e,t,n,s,o=!0){const a=K(e,t,n),r=K(e,t,s),i=K(n,s,e),c=K(n,s,t);return(a>0&&r<0||a<0&&r>0)&&(i>0&&c<0||i<0&&c>0)?!0:o?!!(a===0&&Je(e,n,t)||r===0&&Je(e,s,t)||i===0&&Je(n,e,s)||c===0&&Je(n,t,s)):!1}function Je(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function go(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let r=e;do{const i=r.next;if(r.x>s&&i.x>s||r.x<n&&i.x<n||r.y>a&&i.y>a||r.y<o&&i.y<o){r=i;continue}if(r.i!==e.i&&i.i!==e.i&&r.i!==t.i&&i.i!==t.i&&os(r,i,e,t))return!0;r=i}while(r!==e);return!1}function We(e,t){return K(e.prev,e,e.next)<0?K(e,t,e.next)>=0&&K(e,e.prev,t)>=0:K(e,t,e.prev)<0||K(e,e.next,t)<0}function xo(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const r=n.next;n.y>a!=r.y>a&&o<(r.x-n.x)*(a-n.y)/(r.y-n.y)+n.x&&(s=!s),n=r}while(n!==e);return s}function as(e,t){const n=Dt(e.i,e.x,e.y),s=Dt(t.i,t.x,t.y),o=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,a.next=s,s.prev=a,s}function hn(e,t,n,s){const o=Dt(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function je(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),Tt&&lo(e.prev,e.next)}function Dt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function vo(e,t,n,s){let o=0;for(let a=t,r=n-s;a<n;a+=s)o+=(e[r]-e[a])*(e[a+1]+e[r+1]),r=a;return o}Object.assign(window,{BABYLON:{...Ns,...Vs},earcut:Qs});(()=>{const e=`
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
    }`})();const yo=new WeakMap;function wo(e){return yo.get(e)?.rtt??null}const bo=450,un=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],dn=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],fn={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},ko={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function Mo(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),r=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(k=>k.name!=="sky-cloud"&&!(k.metadata&&k.metadata.noGBuffer)))}),i=a.getGBuffer().textures,c=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],f=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=k=>new BABYLON.Vector2(1/k.width,1/k.height),v=new BABYLON.Matrix,M=["invView","tanHalf","resolution","skyDepth"],y=["depthSampler","normalSampler"];function g(k,A){t.getViewMatrix().invertToRef(v);const W=Math.tan(t.fov/2);k.setMatrix("invView",v),k.setVector2("tanHalf",new BABYLON.Vector2(W*A.width/A.height,W)),k.setVector2("resolution",new BABYLON.Vector2(A.width,A.height)),k.setFloat("skyDepth",bo),k.setTexture("depthSampler",c),k.setTexture("normalSampler",f)}const x=new BABYLON.PostProcess("wash","wash",["texel","radius",...M],y,1,t);x.onApply=k=>{g(k,x),k.setVector2("texel",h(x)),k.setFloat("radius",n.num("wash"))};const p=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...un,...M],["aquarelSampler",...y],1,t);p.onApply=k=>{g(k,p),k.setVector2("texel",h(p));const A=n.texture();k.setFloat("useTex",A?1:0),k.setTexture("aquarelSampler",A||s),un.forEach(W=>k.setFloat(W,n.num(W)))};const b=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...dn,...M],["washSampler","animeSampler",...y],1,t);b.onApply=k=>{g(k,b),k.setTextureFromPostProcessOutput("washSampler",x),k.setTexture("animeSampler",wo(e)||o),k.setVector2("texel",h(b)),dn.forEach(A=>k.setFloat(A,n.num(A))),k.setColor3("inkColor",BABYLON.Color3.FromArray(fn[n.inkColor()]||fn["blue-grey"]))};const z=[x,p,b];return{dispose(){z.forEach(k=>k.dispose(t)),e.onBeforeRenderObservable.remove(r),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const ee={sky:380,bg:70,mid:22,fg:7,near:3.5},R={x:0,y:1.6,z:0,fov:50},ht=-2,rs=16/9,is=.42,pt=1.6,So=3,ls=e=>So*fe(e),Eo=(e,t)=>t*e,Ao=(e,t,n,s)=>Eo(e,t)-(1-s)*n,Ye=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,zo=999,_o=1e3,Fo=.02,cs=2,Gt=120,hs=.05,de=e=>e>Math.PI?e*Math.PI/180:e,fe=(e,t=R.fov,n=rs)=>2*e*Math.tan(de(t)/2)*n;function mn(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const pn=e=>e.z??ee[e.depth],To=e=>Math.min(1,Math.max(0,(e-ee.mid)/(ee.bg-ee.mid)));function Ot(e,t){return e<=ee.bg||t===0?To(e)*t:R.y+(t-R.y)*e/ee.bg}const Lo=(e,t)=>t?e+t.h*(1-t.top):e,Co=["ground","path","field","ramp","water"],Se=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Co.includes(t)),Po=2,Rt=e=>Se(e)&&e.w/Math.max(1,e.h)>=Po,us=(e,t,n,s)=>Math.min(0,Ao(e,t,n,s)),gn=[2,2e3],Do=4,xn=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??R.z,n?.to?.z??R.z),R.z);function Oo(e,t,n,s,o,a,r=R.z){const i=ye({...e},t),c=Math.min(gn[1],Math.max(gn[0],i.z??e.z)),f=Math.max(c,r+Do),h=ls(f)/s,v=o*h*i.scale;return{z:f,h:v,w:s*h*i.scale,sx:h*i.scale,sy:h*i.scale,x:(i.x-.5)*fe(f),y:us(f,n,v,a),alphaIndex:Ye(c),opacity:i.opacity}}const ds=(e,t)=>!!e.flat||t.layer==="ground";function Ie(e,t,n,s=0,o=s){const a=t.depth,r=pn(t)-n*hs,i=fe(r),c=a==="sky"?n*2+1:Ye(r);if(e.layer==="sky"){const p=i*pt,b=p/rs,z=-b*.12+(t.y??0);if(e.tileable_x)return{x:0,y:z,z:r,w:p,h:b,uRepeat:p/(b*(e.w/e.h)),alphaIndex:c,rotation:0};const k=Math.max(p/e.w,b/e.h);return{x:0,y:z,z:r,w:e.w*k,h:e.h*k,uRepeat:1,alphaIndex:c,rotation:0}}const f=e.layer==="bg"&&!e.tileable_x?i*pt*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),f),v=h*(e.w/e.h),M=e.tileable_x?Math.max(v,i*pt):v,y=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?a==="bg"?s:0:Se(e)?0:Ot(pn(t),o),x=a==="sky"?r*Math.tan(de(R.fov)/2)*.45:g;return{x:y,y:x+(t.y??0),z:r,w:M,h,uRepeat:e.tileable_x?M/v:1,alphaIndex:c,rotation:t.rotation??0}}function Ro(e,t,n=0,s=is,o=ht){const a=.5/Math.tan(de(R.fov)/2),r=.5+a*Math.tan(-o*Math.PI/180),i=ee.bg-n*hs,c=R.y+(r-s)*i/a;return Math.round((c-t*(1-e))*10)/10}const Qe=e=>e-Io,Io=.002,vn={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},fs=(e,t)=>(vn[e??"inOut"]??vn.inOut)(Math.min(1,Math.max(0,t))),Ue=(e,t,n)=>e+(t-e)*n,Wt=e=>e.dur_s??(e.camera&&Wo(e)||e.est_s||8);function jt(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function Yt(e,t,n){if(!e)return{...R,fov:de(R.fov)};const s=fs(e.ease,n>0?t/(e.dur_s??n):1),o={...R,...e.from},a={...o,...e.to};return{x:Ue(o.x,a.x,s),y:Ue(o.y,a.y,s),z:Ue(o.z,a.z,s),fov:Ue(de(o.fov),de(a.fov),s)}}const Bo=["x","y","z","scale","opacity","rotation"];function ye(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const a of Bo){const r=s.filter(M=>M[a]!==void 0).sort((M,y)=>M.t-y.t);if(!r.length)continue;const i=r[0],c=r[r.length-1];if(t<=i.t){o[a]=i[a];continue}if(t>=c.t){o[a]=c[a];continue}const f=r.findIndex(M=>M.t>t),h=r[f-1],v=r[f];o[a]=Ue(h[a],v[a],fs("inOut",(t-h.t)/(v.t-h.t)))}return o}const Vo={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},ms=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function yn(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??ms(e),amount:n.amount??1,speed:n.speed??1}}const No=.25,Uo=2e3,$o=250,_e={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},wn={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function Ho(e,t,n,s){const o=i=>{const c=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:c,lastUp:i===-1?n:e.lastUp,locked:e.locked||c>=_e.lockFlips&&i===1}};if(t<_e.downFps)return s?o(1):{...e,fast:0};if(t<_e.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=_e.upWindows&&n-e.lastChange>=_e.upAfterChangeMs&&n-e.lastUp>=_e.upEveryMs?o(-1):{...e,fast:a}}function Go(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*No)}function Wo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const bn={breath_m:.05,breath_s:7},jo=1.5;function Yo(e,t,n={}){const s=n.breath_m??bn.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??bn.breath_s),a=Math.min(1,t/jo),r=a*a*(3-2*a);return{...e,x:e.x+s*r*Math.sin(o*t),y:e.y+s*.5*r*Math.sin(2*o*t)}}async function Ko(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const Xo=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Te(e,t,n){if(t.asset){const r=e.assets.find(i=>i.id===t.asset);if(r)return r}const s=Xo(t.need??t.asset??"");if(!s.length)return null;let o=null,a=[0,0,0];for(const r of[...e.assets].sort((i,c)=>i.id.localeCompare(c.id))){const i=s.filter(f=>r.tags.some(h=>h.toLowerCase()===f)).length;if(!i)continue;const c=[i,n&&r.layer===n?1:0,r.qa?.score??0];(!o||c[0]>a[0]||c[0]===a[0]&&(c[1]>a[1]||c[1]===a[1]&&c[2]>a[2]))&&(o=r,a=c)}return o}const Fe="#f6f5ee",Zo=.22,qo=(e,t)=>e.layer==="bg"?t.feather??Zo:0,gt=.6,It=12;function ps(e,t){const n=t.paper??Fe,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(r=>r.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((r,i)=>r.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const a=Te({...t,assets:o},{asset:s},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function Jo(e,t,n,s=.08){return gs(e,t,n,1-s,1)}function gs(e,t,n,s,o){const a=Math.max(0,Math.floor(n*s)),r=Math.min(n,Math.max(a+1,Math.ceil(n*o))),i=[[],[],[]],c=Math.max(1,Math.floor(t*(r-a)/2e4));for(let h=a*t;h<r*t;h+=c){const v=h*4;e[v+3]<200||(i[0].push(e[v]),i[1].push(e[v+1]),i[2].push(e[v+2]))}if(!i[0].length)return null;const f=h=>{const v=[...h].sort((M,y)=>M-y);return v[v.length>>1]/255};return[f(i[0]),f(i[1]),f(i[2])]}const $e=32,Qo=(e,t,n)=>Array.from({length:$e},(s,o)=>gs(e,t,n,o/$e,(o+1)/$e)),ea=(e,t)=>e[Math.min($e-1,Math.max(0,Math.floor((1-t)*$e)))]??null;function ta(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=o){const r=a*4;if(e[r+3]<230)continue;const i=(.299*e[r]+.587*e[r+1]+.114*e[r+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((a,r)=>a-r),s[s.length>>1])}function na(e,t,n){const s=[];for(let o=0;o<t;o++)for(let a=0;a<n;a++)if(e[(a*t+o)*4+3]>128){s.push(a/n);break}return s.length?(s.sort((o,a)=>o-a),s[s.length>>1]):0}function sa(e,t,n){for(let s=0;s<n;s++){let o=0;for(let a=0;a<t;a++)e[(s*t+a)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const oa=1.6,aa=.12;function kn(e,t,n,s){const o=e.layer==="figure",a=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),r=a*aa*s/oa;return o?{w:a,d:Math.min(r,a*.5)}:{w:a,d:Math.min(Math.max(r,a*.3),a*3)}}const ra=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Be=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Bt=6;function xs(e,t){const n=t.assets.filter(a=>a.layer==="ground"),s=(e.groundSlots??[]).map(a=>({asset:n.find(r=>r.id===a.asset),from:Math.max(0,Number(a.from_m)||0)})).filter(a=>!!a.asset).sort((a,r)=>a.from-r.from).slice(0,Bt);if(s.length)return s.map((a,r)=>r===0?{...a,from:0}:a);const o=ps(e,t);return o.kind==="asset"?[{asset:o.asset,from:0}]:[]}const ia=(e,t)=>Math.max(0,e.reduce((n,s,o)=>t>=s.from?o:n,0)),Kt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,vs=Kt;le.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;const la=[1,2,3,4,5].map(e=>`
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
  ${Kt}
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
      c = slotTile(tex, slotTiles[0]); own = slotColour[0];${la}
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
  ${Kt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const ca=e=>e?pe.WRAP_ADDRESSMODE:pe.MIRROR_ADDRESSMODE;function ha(e){const t=ct.CreateGround("ground",{width:2400,height:2400},e),n=new Xe("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tileScale","wash","grainSize","slotCount","slotFrom","slotTiles","slotColour","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","tex1","tex2","tex3","tex4","tex5","nearTex"],needAlphaBlending:!0}),s=new Jn(new Uint8Array([255,255,255,255]),1,1,we.TEXTUREFORMAT_RGBA,e);for(const o of Ve)n.setTexture(o,s);return n.setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0).setFloat("tileScale",1).setFloat("wash",.5).setFloat("grainSize",1),t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=zo,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){const a=o.slots.slice(0,Ve.length);a.forEach(i=>{i.tex.wrapU=pe.WRAP_ADDRESSMODE,i.tex.wrapV=pe.WRAP_ADDRESSMODE}),Ve.forEach((i,c)=>n.setTexture(i,a[c]?.tex??s));const r=(i,c)=>Ve.map((f,h)=>a[h]?i(a[h]):c);n.setFloat("useTex",a.length?1:0).setFloat("slotCount",a.length).setFloats("slotFrom",r(i=>i.from,1e6)).setFloats("slotTiles",r(i=>i.tile||It,It)).setArray3("slotColour",Ve.flatMap((i,c)=>a[c]?.colour??o.base)).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",V.FromArray(o.base)).setVector3("horizonTint",V.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tileScale",o.tileScale).setFloat("wash",o.wash).setFloat("grainSize",o.grainSize)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=ca(o.tileable),o.tex.wrapV=pe.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}const Ve=["tex","tex1","tex2","tex3","tex4","tex5"];let ua=0;function Mn(e,t,n,s,o){const a=ct.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(a.rotation.x=Math.PI/2,o){const[i,c]=o.dir,f=Math.hypot(i,c)||1;a.rotation.y=Math.atan2(i/f,c/f),a.position.set(i/f*o.length*.42,.015,c/f*o.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const r=new Xe(a.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return r.alphaMode=we.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,r.setFloat("seed",ua++*7.31%97).setFloat("opacity",0),a.material=r,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:i=>{r.setFloat("opacity",i),a.isVisible=i>.001}}}le.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;le.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${vs}
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
  }`;function ys(e,t,n,s){const o=ct.CreatePlane(e,{size:1},n),a=new Xe(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=we.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,o.material=a,o.billboardMode=Ht.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:a}}const ws=9,da=9;function fa(e,t,n,s){const o=Array.from({length:ws},(a,r)=>{const i=ys(`smoke:${r}`,"stagePuff",e,s);return i.mat.setFloat("seed",r*3.7),i});return{update(a,r){o.forEach(({mesh:i,mat:c},f)=>{const h=ma(a,f),v=n*(.6+3.2*h);i.scaling.setAll(v),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(f*2.1+a*.3),t.y+n*(.4+7*h),t.z),c.setFloat("alpha",r*.7*Math.sin(Math.PI*h)),i.isVisible=r>.001})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const ma=(e,t)=>((e/da+t/ws)%1+1)%1,xt=40,Sn=16;function pa(e){const t=(e%xt+xt)%xt;return t<Sn?t/Sn:null}function ga(e,t,n,s){const o=Array.from({length:6},(a,r)=>ys(`bird:${r}`,"stageBird",e,s));return{update(a,r){const i=pa(a),c=Math.round(2+r*4);o.forEach(({mesh:f,mat:h},v)=>{if(f.isVisible=r>.001&&i!==null&&v<c,!f.isVisible||i===null)return;const M=v*.025;f.position.set((i-M-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*i,t+v*1.5),f.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,r*2)).setFloat("flap",Math.sin(a*7+v*1.3))})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const En=["fire","hearth","chimney","smoke"],xa=e=>e.id.split(/[-_]/).some(t=>En.includes(t))||e.tags.some(t=>En.includes(t.toLowerCase())),vt=e=>e[0].toUpperCase()+e.slice(1),va=e=>({fade:`lineFade${vt(e)}`,thin:`lineThin${vt(e)}`,haze:`haze${vt(e)}`}),it={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:ht,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,groundWash:.5,groundGrain:1,grass:.5,grassSway:.15,horizonBushes:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},ya=[1.05,1,.9],wa=[.88,.93,1.05],ba=.35;function ka(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:Z(e,"edgeSoft"),footM:t==="standing"?ba:0,grounding:t==="figure"?0:Z(e,"grounding"),grass:t==="figure"?0:Z(e,"grassOverlap"),light:o?0:Z(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?Z(e,"cloudDrift"):0,footTint:s}}const bs=[.93,.86,.74],An=e=>({paper:Z(e,"sheetPaper"),grain:Z(e,"sheetGrain"),patches:Z(e,"sheetPatches"),wash:Z(e,"sheetWash"),washColour:bs}),Ma={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01],groundGrain:[.5,3,.05]},Sa=Object.fromEntries(Object.keys(it).map(e=>[e,Ma[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),re=(e,t)=>Z(e,t),Z=(e,t)=>{const n=Number(e[t]??it[t]);return Number.isFinite(n)?n:it[t]};function yt(e,t){const n=va(t);return{fade:Z(e,n.fade),thin:Z(e,n.thin),haze:Z(e,n.haze),brown:Z(e,"lineBrown"),ink:Z(e,"lineInk"),norm:Z(e,"lineNorm")}}const Ea=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),wt=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),et=(e,t,n,s,o)=>{const a=s*(1080/o);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function Aa(e,t,n){const s=new V(R.x,R.y,R.z),o=Le.RotationX(e*Math.PI/180),r=Le.LookAtLH(s,s.add(V.TransformNormal(new V(0,0,1),o)),V.TransformNormal(V.Up(),o)).multiply(Le.PerspectiveFovLH(de(R.fov),t,.1,2e3));return{vp:r,top:V.TransformCoordinates(new V(0,0,n),r).y}}le.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function za(e,t){const n=new Us("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",V.FromArray(bs))},n}const Ae=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,_a=12;function ks(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,a=((t?.offset??0)+n*o)*(e.fps??_a),r=Math.floor(a+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,r)):(r%s+s)%s}function Fa(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const Ta=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,La=`
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
  ${vs}
  ${Ta}
  ${La}
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
  }`;const zn=new WeakMap,Ms=new Map,Ss=new Map,Vt=new Map,Es=new Map,ot=new Map;function Ne(e,t){const n=zn.get(t)??new Map;zn.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((a,r)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>r(new Error(`layer image ${e} did not load`)),i.onload=()=>{const c=document.createElement("canvas");c.width=i.naturalWidth,c.height=i.naturalHeight;const f=c.getContext("2d",{willReadFrequently:!0});f.drawImage(i,0,0);const h=f.getImageData(0,0,c.width,c.height).data,v=Jo(h,c.width,c.height);v&&Ms.set(e,v),ot.set(e,Qo(h,c.width,c.height)),Ss.set(e,sa(h,c.width,c.height)),Vt.set(e,na(h,c.width,c.height));const M=ta(h,c.width,c.height);M!==null&&Es.set(e,M);for(let g=0;g<h.length;g+=4){const x=h[g+3]/255;h[g]=Math.round(h[g]*x),h[g+1]=Math.round(h[g+1]*x),h[g+2]=Math.round(h[g+2]*x)}const y=new Jn(h,c.width,c.height,we.TEXTUREFORMAT_RGBA,t,!0,!1,pe.TRILINEAR_SAMPLINGMODE);y.anisotropicFilteringLevel=8,y.wrapV=pe.CLAMP_ADDRESSMODE,a(y)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const bt=24;function Ca(e,t,n,s,o){const[a,r]=t.anchor??[.5,1],i=[],c=[],f=[];for(let v=0;v<=bt;v++){const M=v/bt;for(const y of[0,1])i.push((y-a)*n,(r-M)*s,0),c.push(y,M);if(v<bt){const y=v*2;f.push(y,y+2,y+1,y+1,y+2,y+3)}}const h=new Ht(e,o);return Object.assign(new Qn,{positions:i,uvs:c,indices:f}).applyToMesh(h),h}let Pa=0;function _n(e,t,n,s,o,a){const r=Ca(`layer:${e.id}`,e,n,s,a),i=new Xe(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?pe.WRAP_ADDRESSMODE:pe.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const c=Pa++*2.39996%(Math.PI*2),f=e.anchor?.[1]??1;return i.setFloat("phase",c).setFloat("height",s*f).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new on(0,0,1,1)),r.material=i,r.metadata={noGBuffer:!0,painted:!0},r.isPickable=!1,{mesh:r,material:i,setMotion:h=>{i.setFloat("kind",Vo[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),r.isVisible=h>.001},setLine:(h,v,M,y)=>{i.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new an(M[0],M[1])).setVector3("hazeTint",V.FromArray(y))},setPaper:(h,v)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",V.FromArray(h.washColour)).setVector2("grainUV",new an(v[0],v[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setCell:h=>{i.setVector4("cell",new on(h[0],h[1],h[2],h[3]))},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",V.FromArray(h.footTint)).setVector3("sunColour",V.FromArray(ya)).setVector3("shadeColour",V.FromArray(wa))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,v)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),v&&i.setVector3("featherTint",V.FromArray(v))}}}const As=600,zs=1.5,Da=2,Oa=.8,Ra=["grass","heather","reeds","shrub","bramble","juniper","hazel","meadow","fern","tree","bush","sedge","flower"],Ia=["shrub","tree","bush","bramble","hedge"],Ba=["ground"];function Va(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function Fn(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}const Na=e=>e.layer!=="ground"&&e.layer!=="sky"&&e.layer!=="bg"&&e.layer!=="figure"&&!e.tileable_x&&!Rt(e)&&e.kind!=="animation"&&e.tags.some(t=>Ra.includes(t));function Ua(e){const t=e.assets.filter(n=>n.kind==="sheet");return t.length?t.flatMap(n=>(n.cells??[]).map(s=>({asset:n.id,file:n.file,tags:s.tags,height_m:s.height_m,aspect:s.rect[2]*n.w/Math.max(1,s.rect[3]*n.h),cell:s.rect}))):e.assets.filter(Na).map(n=>({asset:n.id,file:n.file,tags:n.tags,height_m:n.height_m,aspect:n.w/Math.max(1,n.h),cell:[0,0,1,1]}))}const _s=(e,t)=>e.tags.some(n=>!Ba.includes(n)&&t.includes(n)),$a=(e,t)=>e.filter(n=>n.height_m<=zs&&!n.tags.includes("tree")&&_s(n,t)),Ha=["grass","meadow","heath","field","hedge","forest","marsh","wet","edge","heather"];function Ga(e,t){const n=e.filter(o=>o.height_m>zs&&o.tags.some(a=>Ia.includes(a))),s=n.filter(o=>_s(o,t));return s.length||!t.some(o=>Ha.includes(o))?s:n.filter(o=>!o.tags.includes("tree"))}function Tn(e){const t=Math.min(As,Math.max(0,Math.round(e.count)));if(!e.picks.length||!t)return[];const n=Va(e.seed),s=Math.max(e.from,e.front+Da),o=Math.max(s,e.to),a=[];for(let r=0;r<t;r++){const i=s*Math.pow(o/s,n()),c=Math.floor(n()*e.picks.length);a.push({z:i,x:(n()*2-1)*Oa*fe(i),h:e.picks[c].height_m*(.7+.6*n())*(e.size??1),pick:c,phase:n()*Math.PI*2})}return a.sort((r,i)=>i.z-r.z)}const Fs=[...Array.from({length:16},(e,t)=>2.5*Math.pow(1.4,t+1)),1/0],Ln=e=>Fs.findIndex(t=>e<t);le.ShadersStore.stageStrewnVertexShader=`
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
  }`;function Wa(e,t,n,s,o,a,r){const i=new Xe(`strewn:${r}`,e,"stageStrewn",{attributes:["position","quad","uv","extra"],uniforms:["viewProjection","camPos","time","sway","land","haze","opacity"],samplers:["tex"],needAlphaBlending:!0});i.alphaMode=we.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setTexture("tex",t).setVector3("haze",V.FromArray(a));const c=new Map;for(const h of s)c.set(Ln(h.z),[...c.get(Ln(h.z))??[],h]);const f=[...c].map(([h,v])=>{const M=[],y=[],g=[],x=[],p=[];v.forEach((z,k)=>{const A=n[z.pick],[W,H,j,te]=A.cell,I=z.h*A.aspect,ae=o(z.z);for(const[Y,U]of[[-.5,0],[.5,0],[.5,1],[-.5,1]])M.push(z.x,0,z.z),y.push(Y,U,z.h,I),g.push(W+(Y+.5)*j,H+(1-U)*te),x.push(z.phase,ae[0],ae[1],ae[2]);p.push(k*4,k*4+1,k*4+2,k*4,k*4+2,k*4+3)});const b=new Ht(`strewn:${r}:${h}`,e);return Object.assign(new Qn,{positions:M,indices:p}).applyToMesh(b),b.setVerticesData("quad",y,!1,4),b.setVerticesData($s.UVKind,g,!1,2),b.setVerticesData("extra",x,!1,4),b.material=i,b.alphaIndex=Ye(Math.min(Fs[h],2e3)),b.alwaysSelectAsActiveMesh=!0,b.isPickable=!1,b.metadata={noGBuffer:!0},b});return{meshes:f,update(h,v,M,y,g){i.setFloat("time",h).setFloat("sway",v).setFloat("land",M).setFloat("opacity",g).setVector3("camPos",y),f.forEach(x=>{x.isVisible=g>.001})},dispose(){f.forEach(h=>h.dispose()),i.dispose()}}}const tt=[3,60],Cn=[60,300],ja=80,Ya=1.8,Ka=(e,t)=>t??e.asset.tags;function Pn(e){const t=[],n=Math.log(tt[1]/tt[0]);e.slots.forEach((o,a)=>{const r=Math.max(tt[0],o.from),i=Math.min(tt[1],e.slots[a+1]?.from??1/0);if(i<=r)return;const c=$a(e.sprites,Ka(o,e.bandTags)),f=e.grass*As*(Math.log(i/r)/n);t.push({picks:c,clumps:Tn({picks:c,count:f,from:r,to:i,front:e.front,seed:Fn(`${e.sceneId}:grass:${a}`)})})});const s=e.slots[e.slots.length-1];if(s&&!e.bandTags){const o=Ga(e.sprites,s.asset.tags);t.push({picks:o,horizon:!0,clumps:Tn({picks:o,count:e.bushes*ja,from:Cn[0],to:Cn[1],front:e.front,size:Ya,seed:Fn(`${e.sceneId}:horizon`)})})}return t.filter(o=>o.clumps.length)}const Nt={...ko["History Lines pencil"],paper:.35,granulation:.2,...it},Xa=new es(.937,.914,.863,1),Za=.7,qa=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class Ja{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new Hs(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Gs(this.engine),this.scene.clearColor=Xa,this.camera=new Ws("house",new V(0,1.6,0),this.scene),this.camera.rotation.set(ht*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new js("sky",new V(0,1,0),this.scene).intensity=.7,new Ys("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=ha(this.scene),this.ground.set(this.groundLook([],null,n)),this.birds=ga(this.scene,In,fe(In),sr),Mo(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),za(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Be(Fe);strip=null;nearTex=null;bands=[];strewn=[];strewSrc=null;strewKey="";smoke=[];birds;footTint=Be(Fe);nearAsset=null;hazeTint=Be(Fe);sceneLib;buildToken=0;look={...Nt};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=wn;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return Go(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=wn,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>$o;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Uo)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=Ho(this.tier,o,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...Nt,...t??{}}}groundPoint(t,n){const s=ee[n];return new V((t-.5)*fe(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],a=[];t.set.sky&&a.push({layer:On(t),order:0,index:-1});const r={sky:1};t.set.layers.forEach((w,O)=>{const X=w.depth;r[X]=r[X]??0,a.push({layer:w,order:r[X]++,index:O})});const i=[];await Promise.all(a.map(async({layer:w,order:O,index:X})=>{let D=Te(n,w,w.depth);if(!D){i.push({need:w.need??w.asset,reason:"no match"});return}let he;try{he=await Ne(xe(n,D,w),this.scene)}catch{i.push({need:w.need??w.asset,reason:`file did not load: ${w.src??D.file}`});return}if(s!==this.buildToken)return;D=Dn(D,w,he);const N=Ie(D,w,O),se=_n(D,he,N.w,N.h,N.uRepeat,this.scene);se.mesh.position.set(N.x,N.y,N.z);const S=ds(w,D);se.mesh.alphaIndex=S?_o:N.alphaIndex,S&&(se.mesh.rotation.x=Math.PI/2),se.mesh.isVisible=!1;let _,T,C;if(kt.includes(w.depth)&&!D.tileable_x&&!S&&!Se(D)){const G=kn(D,N.w,N.h,N.z);C=q=>kn(D,N.w,N.h,q).d/G.d,_=Mn(se.mesh,G.w,G.d,this.scene),_.mesh.alphaIndex=Qe(N.alphaIndex),T=Mn(se.mesh,G.w,G.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:N.h*or(this.sunDir)}),T.mesh.alphaIndex=Qe(N.alphaIndex)}o.push({layer:w,index:X,builtScale:w.scale??1,builtZ:N.z,handle:se,asset:D,order:O,stain:_,cast:T,stainDepth:C,ink:Es.get(xe(n,D,w)),flat:S,skyline:Vt.get(xe(n,D,w))})}));const c=ps(t.set,n),f=(await Promise.all(xs(t.set,n).map(async w=>{const O=await Ne(n.base+w.asset.file,this.scene).catch(()=>(i.push({need:w.asset.id,reason:`file did not load: ${w.asset.file}`}),null)),X=(ot.get(n.base+w.asset.file)??[]).filter(D=>!!D);return O?{tex:O,tile:w.asset.height_m||It,from:w.from,asset:w.asset,colour:X.length?Bn(X):Be(n.paper??Fe)}:null}))).filter(w=>!!w);let h=null;const v=ra(t.set.near,n),M=v?Te(n,{asset:v}):null;if(t.set.near&&!M&&i.push({need:t.set.near,reason:"no near band"}),M)try{h=await Ne(n.base+M.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${M.file}`})}c.kind==="paper"&&c.reason&&i.push({need:t.set.ground,reason:c.reason});const y=o.filter(w=>w.asset.layer==="bg").sort((w,O)=>w.index-O.index)[0],g=y?{top:Ss.get(xe(n,y.asset,y.layer))??0,h:Ie(y.asset,y.layer,y.order).h,order:y.order}:null,x=o.find(w=>w.index===-1),p=x&&Ie(x.asset,x.layer,x.order),b=x&&p?ea(ot.get(xe(n,x.asset,x.layer))??[],(R.y-p.y)/p.h):null,z=y?Ms.get(xe(n,y.asset,y.layer))??null:t.set.groundBands?.length?null:b,k=await this.loadBands(t,n),A=t.set.groundBands?.length?[...new Set(t.set.groundBands.flatMap(w=>Te(n,{asset:w.asset},"ground_band")?.tags??[]))]:null,W=Ua(n),H=xn(t),j=f.map(w=>({asset:w.asset,from:w.from})),te=[...new Set(Pn({sceneId:t.id,slots:j,bandTags:A,sprites:W,grass:1,bushes:1,front:H}).flatMap(w=>w.picks.map(O=>O.file)))],I=new Map;await Promise.all(te.map(async w=>{const O=await Ne(n.base+w,this.scene).catch(()=>null);O&&I.set(w,O)}));const ae=w=>w.forEach(O=>{O.stain?.mesh.material?.dispose(),O.cast?.mesh.material?.dispose(),O.handle.mesh.dispose(),O.handle.material.dispose()});if(s!==this.buildToken){ae(o),k.forEach(w=>{w.handle.mesh.dispose(),w.handle.material.dispose()});return}ae(this.built),this.bands.forEach(w=>{w.handle.mesh.dispose(),w.handle.material.dispose()}),this.bands=k,this.built=o,this.sceneLib=n;const Y=f[0]?(ot.get(n.base+f[0].asset.file)??[]).filter(w=>!!w):[],U=this.groundLook(f,z,n,c.kind==="paper"?c.colour:void 0);this.horizonTint=U.tint,this.strip=g,this.smoke.forEach(w=>w.dispose()),this.smoke=o.filter(w=>xa(w.asset)&&kt.includes(w.layer.depth)&&!w.flat).map(w=>{const O=Ie(w.asset,w.layer,w.order);return fa(this.scene,new V(w.handle.mesh.position.x,O.h*.6,O.z),Math.min(Math.max(O.h*.8,.5),3),O.alphaIndex)}),this.footTint=Y.length?Bn(Y):U.base,this.nearTex=h,this.nearAsset=M,this.hazeTint=b??U.tint,this.ground.set(U),this.strewSrc={sceneId:t.id,slots:j,colours:f.map(w=>w.colour),bandTags:A,front:H,sprites:W,tex:I},this.strewKey="",this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const a=Be(o??s.paper??Fe),r=n??a;return{slots:t,base:qa(a,r,Za),tint:r,fadeNear:ee.fg,fadeFar:ee.bg*.75,grain:t.length?.5:1}}strew(t,n){const s=this.strewSrc,o=s?`${s.sceneId}:${t}:${n}:${s.slots.length}`:"";if(o===this.strewKey||(this.strewKey=o,this.strewn.forEach(r=>r.dispose()),this.strewn=[],!s))return;const a=r=>s.colours[ia(s.slots,r)]??this.footTint;for(const r of Pn({...s,grass:t,bushes:n}))for(const i of new Set(r.picks.map(c=>c.file))){const c=s.tex.get(i),f=r.clumps.filter(h=>r.picks[h.pick].file===i);c&&f.length&&this.strewn.push(Wa(this.scene,c,r.picks,f,a,this.hazeTint,i))}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:On(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=r=>this.built.some(i=>i.handle.mesh===r),o=[],a=[...this.scene.multiPick(t,n,s)??[]].sort((r,i)=>r.distance-i.distance);for(const r of a){const i=this.built.find(f=>f.handle.mesh===r.pickedMesh),c=r.getTextureCoordinates();!i||!c||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||Se(i.asset)&&(r.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:c.x,v:c.y})}return o}pickBackdrops(t,n){const s=r=>this.bands.find(i=>i.handle.mesh===r),o=r=>this.built.find(i=>i.handle.mesh===r&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,r=>!!s(r)||!!o(r))??[]].sort((r,i)=>r.distance-i.distance).flatMap(r=>{const i=r.getTextureCoordinates();if(!i)return[];const c=s(r.pickedMesh);if(c)return[{band:c.index,asset:c.asset,u:i.x,v:i.y}];const f=o(r.pickedMesh);return[{index:f.index,asset:f.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(f=>f.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),a=1/this.engine.getRenderHeight(),r=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(f=>V.Project(f,Le.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=r.map(f=>f.x*o),c=r.map(f=>f.y*a);return{x0:Math.min(...i),y0:Math.min(...c),x1:Math.max(...i),y1:Math.max(...c),z:n.handle.mesh.position.z}}faded=new Set;fadedTo=1;fadeLayers(t,n){this.faded=new Set(t),this.fadedTo=n}groundHeightAt(t){return Ot(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?Se(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Le.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>er*Math.min(1,Math.max(0,(Rn-o)/(Rn-nr)));this.gridMeshes=n.pieces.map((o,a)=>{const r=o.lines.map(f=>f.map(([h,v])=>new V(h,Ot(v,t),v))),i=o.lines.map(f=>f.map(([,h])=>new es(n.rgb[0],n.rgb[1],n.rgb[2],s(h)))),c=ct.CreateLineSystem(`grid-${a}`,{lines:r,colors:i,useVertexAlpha:!0},this.scene);return c.isPickable=!1,c.setEnabled(!this.gridOff),c.alphaIndex=Ye(o.z)+tr,c.material.depthFunction=we.ALWAYS,c.material.disableDepthWrite=!0,c}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,Le.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new V(.55,-1,-.3).normalize();depthLine(t){return{...yt(this.look,t),tint:this.hazeTint}}paper(){return An(this.look)}async loadBands(t,n){const s=[];for(const[o,a]of(t.set.groundBands??[]).entries()){const r=Te(n,{asset:a.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await Ne(xe(n,r,a),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${a.src??r.file} did not load`);continue}const c=Dn(r,a,i),f=ls(a.z),h=f*c.h/c.w,v=_n(c,i,f,h,1,this.scene);v.material.depthFunction=we.ALWAYS,v.mesh.position.set(0,0,a.z),v.mesh.alphaIndex=Ye(a.z),s.push({handle:v,z:a.z,w:f,h,skyline:Vt.get(xe(n,c,a))??.5,index:o,asset:c,band:a})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?Ro(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??is,re(this.look,"housePitch")):0}pose(t,n,s,o){const a=jt(t,n),r=Yt(a.cam,a.t,Wt(t)),i=o?Yo(r,o.t,o):r;this.camera.position.set(i.x,i.y,i.z),this.camera.fov=i.fov;const c=re(this.look,"housePitch");this.camera.rotation.x=c*Math.PI/180,this.ground.follow(this.camera.position);const f=p=>re(this.look,p);this.ground.live({detail:f("groundDetail"),vary:f("groundVary"),mixTile:f("groundMix"),tileScale:f("groundScale"),wash:f("groundWash"),grainSize:f("groundGrain")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Aa(c,this.engine.getAspectRatio(this.camera),f("nearFar")),span:Qa,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),v=An(this.look),M=re(this.look,"bandHeight"),y=this.horizonOf(t),g=Lo(y,this.strip);this.land=g,this.poseGrid(g);const x=xn(t);this.bands.forEach(p=>{const b=Oo(p.band,n,M,p.w,p.h,p.skyline,x);p.z=b.z,p.handle.mesh.scaling.set(b.sx,b.sy,1),p.handle.mesh.position.set(b.x,b.y,b.z),p.handle.mesh.alphaIndex=b.alphaIndex;const z=wt(h,b.z-R.z,de(R.fov));p.handle.setOpacity(b.opacity),p.handle.setBottomFade(Math.min(1,re(this.look,"bandFade")/b.h)),p.handle.setPaper(v,et(b.w,b.h,1,z,h)),p.handle.setLine(yt(this.look,"bg"),1,et(b.w,b.h,1,z,h),this.hazeTint),p.handle.setMotion(yn(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.strew(re(this.look,"grass"),re(this.look,"horizonBushes")),this.strewn.forEach(p=>p.update(s,re(this.look,"grassSway"),g,this.camera.position,1)),this.smoke.forEach(p=>p.update(s,re(this.look,"smoke"))),this.birds.update(s,re(this.look,"birds"));for(const p of this.built){const b=ye(p.layer,n),z=Ie(p.asset,{...p.layer,x:b.x,y:b.y,z:b.z,scale:1,rotation:b.rotation},p.order,y,g);p.handle.mesh.position.x=z.x;const k=p.asset.layer==="bg"&&!p.asset.tileable_x?(z.z-R.z)/Math.max(.1,p.builtZ-R.z):1;p.handle.mesh.position.y=p.flat?Fo:Se(p.asset)?us(z.z,M,z.h*b.scale,p.skyline??0)+z.y:R.y+(z.y-R.y)*k,p.handle.mesh.position.z!==z.z&&(p.handle.mesh.position.z=z.z,p.flat||(p.handle.mesh.alphaIndex=z.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=Qe(z.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(z.z)),p.cast&&(p.cast.mesh.alphaIndex=Qe(z.alphaIndex))),p.handle.mesh.rotation.z=-z.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(b.scale/p.builtScale*k);const A=b.opacity*(this.faded.has(p.index)?this.fadedTo:1);p.handle.setOpacity(A),p.handle.setFeather(qo(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-z.y)/(z.h*b.scale));const W=wt(h,z.z-i.z,this.camera.fov),H=yt(this.look,p.layer.depth);p.handle.setPaper(v,et(z.w*b.scale,z.h*b.scale,z.uRepeat,wt(1080,z.z-R.z,de(R.fov)),1080)),p.handle.setLine(H,p.ink===void 0?1:Ea(p.ink,H.ink,H.norm),et(z.w*b.scale,z.h*b.scale,z.uRepeat,W,h),this.hazeTint),p.stain?.setOpacity((p.layer.shadow??gt)*A),p.cast?.setOpacity(re(this.look,"castShadow")*((p.layer.shadow??gt)/gt)*A);const j=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":kt.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive(ka(this.look,j,this.sunDir.x,this.footTint)),p.handle.setMotion(yn(p.asset,p.layer)),p.handle.material.setFloat("time",s),Ae(p.asset)&&p.handle.setCell(Fa(p.asset,ks(p.asset,p.layer.play,n)))}}}const xe=(e,t,n)=>n?.src??e.base+t.file,Dn=(e,t,n)=>{if(!t.src||!e.w||!e.h)return e;const{width:s,height:o}=n.getSize(),a=s/(Ae(e)?e.cols:1),r=o/(Ae(e)?e.rows:1);return{...e,w:a,h:r,height_m:e.height_m*(r/e.h)}},On=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),Qa=1.3,er=.35,tr=.001,nr=40,Rn=120,In=110,sr=900,or=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Bn=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),kt=["mid","fg","near"],ar=16/9,rr=.92;function ir(e,t,n,s){const{cam:o,t:a}=jt(e,s),r=Yt(o,a,Wt(e)),i=ee[t.depth],c=i-r.z;if(c<=.5)return null;const f=ye(t,s),h=(f.x-.5)*fe(i),v=Math.tan(r.fov/2),M=(h-r.x)/(c*v*ar),y=-ht*Math.PI/180,g=Math.tan(Math.atan2(n*f.scale-r.y,c)-y)/v;return Math.abs(M)>rr?null:{x:(M+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const lr={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},Vn=new Set(["large","small","tall","long","short","fallen"]),cr=new Set(["tree","shrub"]),Xt=e=>e.charAt(0).toUpperCase()+e.slice(1),hr=(e,t)=>lr[e]?.[t?1:0]??e;function ur(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const a=o.length>1&&cr.has(o[0])?o.slice(1):o,r=a.filter(c=>Vn.has(c)),i=a.filter(c=>!Vn.has(c));return Xt([...r,...i].map(c=>hr(c,n)).join(" "))}const Nn=e=>Xt(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),Ts=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ve(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&Ts(s);if(o)return Nn(o);if(e.figure)return Nn(e.figure);if(s)return ur(s,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?Xt(String(a)):""}function dr(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const fr=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function mr(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>fr.has(t))?"leaf":"photo"}const Ke=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?Ts(e):null,Un=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Ce(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:Un(e,"pose:")??t?.[1]??null,facing:Un(e,"facing:")??(t?.[2]?"left":"right")}}const Ls=e=>e.find(t=>Ce(t).pose==="stand"&&Ce(t).facing==="right")??e[0];function Cs(e){const t=new Map,n=[];for(const s of e??[]){const o=Ke(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const r={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,r),n.push(r)}const a=t.get(o);a.members=[...a.members,s],a.count=a.members.length}return n.map(s=>s.series?{...s,asset:Ls(s.members)}:s)}const pr=(e,t)=>{const n=Ke(t);return n?(e??[]).filter(s=>Ke(s)===n):t?[t]:[]},gr=e=>Cs(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function xr(e,t,n){const s=(e??[]).filter(r=>Ke(r)===n);if(!s.length)return null;const o=Ce(t),a=(r,i)=>s.find(c=>Ce(c).pose===r&&Ce(c).facing===i);return a(o.pose,o.facing)??a("stand",o.facing)??Ls(s)}const vr=24;function yr(e){const t=new Map,n=s=>{if(t.has(s))return;t.set(s,"loading");const o=new Image;o.onload=()=>{try{const a=document.createElement("canvas");a.width=o.naturalWidth,a.height=o.naturalHeight;const r=a.getContext("2d",{willReadFrequently:!0});r.drawImage(o,0,0),t.set(s,{w:a.width,h:a.height,data:r.getImageData(0,0,a.width,a.height).data})}catch{t.set(s,"failed")}},o.onerror=()=>t.set(s,"failed"),o.src=e+s};return{prime(s){s.forEach(o=>o?.file&&n(o.file))},opaque(s,o,a,r){const i=t.get(s?.file);if(i==="failed")return!0;if(!i||i==="loading")return s?.file&&n(s.file),!1;const c=s.kind==="animation"?Math.max(1,s.cols??1):1,f=s.kind==="animation"?Math.max(1,s.rows??1):1,h=i.w/c,v=i.h/f,M=Math.min(h-1,Math.max(0,Math.floor(o*h))),y=Math.min(v-1,Math.max(0,Math.floor(a*v)));return(Number.isInteger(r)?[[Math.floor(r/c)%f,r%c]]:Array.from({length:f*c},(x,p)=>[Math.floor(p/c),p%c])).some(([x,p])=>i.data[(Math.floor(x*v+y)*i.w+Math.floor(p*h+M))*4+3]>vr)}}}const oe={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,cs],[80,Gt]]},wr=e=>e<=12?1:e<=40?5:20,br=e=>wr(e)/4;function $n(e,t=0){const n=typeof t=="function"?t:()=>t,s=f=>[e.origin[0]+f*e.dir[0],e.origin[2]+f*e.dir[2]],o=f=>e.origin[1]+f*e.dir[1]-(oe.z+n(s(f)[1]));if(!(e.dir[2]>0))return null;const a=(Gt*kr-e.origin[2])/e.dir[2],r=Math.sign(o(0));if(r===0)return rn(oe,s(0));let i=0,c=null;for(let f=1;f<=Hn;f++){const h=a*f/Hn;if(Math.sign(o(h))!==r){c=h;break}i=h}if(c===null)return null;for(let f=0;f<Mr;f++){const h=(i+c)/2;Math.sign(o(h))===r?i=h:c=h}return rn(oe,s(c))}const kr=4,Hn=400,Mr=30;function Ut(e){const t=br(zt(oe,e)[1]);return zt(oe,Zs(e,t))}const $t=(e,t)=>[(e-.5)*fe(t),t],lt=([e,t])=>({x:Math.round((.5+e/fe(t))*1e4)/1e4,z:t});function Zt([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function Sr([e,t],n,s=[0,0]){const[[,o],[,a]]=oe.cells,r=Math.max(.1,t-s[1]),i=Math.min(a,Math.max(o,s[1]+r/Math.max(.01,n)));return zt(oe,Zt([e,t],i,s))}const Er=[[cs,12,2],[12,40,10],[40,Gt,40]],Ar=20;function zr(){return Er.flatMap(([e,t,n],s)=>{const o=n*Ar,a=[];let r=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const c={...oe,cells:[[-o,r],[o,i]]},f=qs(c,n,Math.max(1,Math.round(i-r))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===i:i>r);a.push({z:i,lines:f.map(h=>h.map(v=>Js(oe,v).slice(0,2)))}),r=i}return a})}const Gn=-1,Wn=2,_r=4,Fr=(e,t)=>{const n=e.findIndex(s=>s.index===t);return n<0?{hit:e[0]??null,next:null}:{hit:e[n],next:e.length>1?e[(n+1)%e.length].index:null}},Tr=(e,t)=>{const n=e.find(s=>s.index===t)?.box;return n?e.filter(({index:s,box:o})=>s!==t&&o&&o.z<n.z&&o.x0<n.x1&&o.x1>n.x0&&o.y0<n.y1&&o.y1>n.y0).map(s=>s.index):[]};function Lr({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:a,onGround:r=()=>!1,byDistance:i=()=>!1,groundUnder:c=()=>null,footY:f=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:M=()=>!1}){let y=null,g=null,x=!1;const p="#38bdf8",b=document.createElement("div");b.dataset.stage25dSelection="",b.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${p};z-index:3;`;const z=document.createElement("div");z.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${p};pointer-events:none;`,b.appendChild(z);const k=document.createElement("div");k.dataset.rotateHandle="1",k.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",b.appendChild(k);const W=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([S,_])=>{const T=document.createElement("div");return T.dataset.scaleHandle="1",T.style.cssText=Xs(S,_),b.appendChild(T),T});t.appendChild(b),n()?.setGrid?.(zr(),Cr(t,"--color-neutral"));const H=document.createElement("div");H.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(H);const j=S=>{const _=U();if(!_||S===null){H.style.display="none";return}const T=t.getBoundingClientRect(),C=e.getBoundingClientRect();Object.assign(H.style,{display:"block",left:`${_.left+_.width/2+C.left-T.left}px`,top:`${_.top+_.height+C.top-T.top}px`}),H.textContent=`${s(S,"z").toFixed(2)} m`},te=S=>{const _=e.getBoundingClientRect();return{x:S.clientX-_.left,y:S.clientY-_.top}},I=(S,_)=>(n()?.pickLayers(S,_)??[]).filter(T=>o.opaque(T.asset,T.u,T.v,T.index)),ae=(S,_)=>I(S,_)[0]??null,Y=(S,_)=>{y=S,_&&S!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${S}`}})),w()},U=()=>{const S=y===null?null:n()?.layerBox(y);if(!S)return null;const _=e.getBoundingClientRect();return{left:S.x0*_.width,top:S.y0*_.height,width:(S.x1-S.x0)*_.width,height:(S.y1-S.y0)*_.height,z:S.z}},w=()=>{const S=U();if(!S){b.style.display="none";return}const _=e.getBoundingClientRect(),T=t.getBoundingClientRect();Object.assign(b.style,{display:"block",left:`${S.left+_.left-T.left}px`,top:`${S.top+_.top-T.top}px`,width:`${S.width}px`,height:`${S.height}px`})},O=(S,_,T)=>Math.min(T,Math.max(_,S)),X=S=>{if(S.button!==0)return;const{x:_,y:T}=te(S),{hit:C,next:G}=Fr(I(_,T),y);if(!C){M(_,T)&&S.stopPropagation();return}S.stopPropagation(),Y(C.index,!0);const q=n().layerBox(C.index),be=r(C.index),J=U();g={mode:"move",index:C.index,z:q.z,from:n().worldXAt(_,T,q.z),x0:s(C.index,"x"),id:S.pointerId,el:e,next:G,pressed:[S.clientX,S.clientY],ground:be,start:[_,T],foot:J?[J.left+J.width/2,J.top+J.height]:[_,T],lift:be?f(C.index):0},e.setPointerCapture?.(S.pointerId)},D=S=>_=>{if(_.button!==0||y===null)return;const T=U();if(!T)return;_.stopPropagation(),_.preventDefault();const C=e.getBoundingClientRect(),G=T.left+T.width/2,q=T.top+T.height/2,{x:be,y:J}={x:_.clientX-C.left,y:_.clientY-C.top};g={mode:S,index:y,cx:G,cy:q,id:_.pointerId,el:_.currentTarget,d0:Math.max(8,Math.hypot(be-G,J-q)),a0:Math.atan2(J-q,be-G),scale0:s(y,"scale"),rotation0:s(y,"rotation"),byDistance:S==="scale"&&i(y),p0:$t(s(y,"x"),s(y,"z")),eye:h()},_.currentTarget.setPointerCapture?.(_.pointerId)},he=S=>{const{x:_,y:T}=te(S);if(g?.mode==="move"&&g.ground){const C=c(g.foot[0]+_-g.start[0],g.foot[1]+T-g.start[1],g.lift,g.index);if(!C)return;const G=lt(Ut(C));a(g.index,"x",O(G.x,Gn,Wn)),a(g.index,"z",G.z),j(g.index);return}if(g?.mode==="move"){const C=(n().worldXAt(_,T,g.z)-g.from)/fe(g.z);a(g.index,"x",Math.round(O(g.x0+C,Gn,Wn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const C=Math.hypot(_-g.cx,T-g.cy)/g.d0*g.scale0,G=Ut(Sr(g.p0,C,g.eye))[1],q=lt(Zt(g.p0,G,g.eye));g.scale0!==1&&a(g.index,"scale",1),a(g.index,"x",q.x),a(g.index,"z",q.z),j(g.index);return}if(g?.mode==="scale"){const C=Math.hypot(_-g.cx,T-g.cy);a(g.index,"scale",Math.round(O(g.scale0*(C/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let C=g.rotation0+(Math.atan2(T-g.cy,_-g.cx)-g.a0)*180/Math.PI;S.shiftKey&&(C=Math.round(C/15)*15),a(g.index,"rotation",Math.round(C*10)/10);return}x||(x=!0,requestAnimationFrame(()=>{x=!1,e.style.cursor=ae(_,T)?"pointer":""}))},N=S=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const _=g.index,T=g.mode==="move"&&g.ground||g.byDistance,C=g.next!=null&&Math.hypot(S.clientX-g.pressed[0],S.clientY-g.pressed[1])<_r?g.next:null;g=null,H.style.display="none",T&&v(_),C!==null&&Y(C,!0)},se=S=>{y!==null&&S.detail?.id!==`s25_layer-${y}`&&(y=null,w())};e.addEventListener("pointerdown",X);for(const S of[e,...W,k])S.addEventListener("pointermove",he),S.addEventListener("pointerup",N),S.addEventListener("pointercancel",N);return W.forEach(S=>S.addEventListener("pointerdown",D("scale"))),k.addEventListener("pointerdown",D("rotate")),window.addEventListener("scene-object-selected",se),{select:(S,_=!1)=>Y(S,_),get selected(){return y},place:w,destroy(){window.removeEventListener("scene-object-selected",se),b.remove(),n()?.setGrid?.(null),H.remove()}}}function Cr(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const qt=["x","y","z","scale","rotation","opacity","keys","figure","play"],ne=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},Mt=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!qt.includes(t))),jn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{},{camera:a,camera_more:r,...i}=e??{};return JSON.stringify({...i,set:{...o,layers:t.map(Mt),groundBands:n.map(Mt),skyLayer:Mt(s)}})},St=e=>qt.map(t=>e?.[t]??null),Et=e=>JSON.stringify([(e?.set?.layers??[]).map(St),(e?.set?.groundBands??[]).map(St),St(e?.set?.skyLayer),e?.camera??null,e?.camera_more??[]]),Yn={x:[-8,8],y:[.3,6],z:[-4,15],fov:[20,75]},Pr=10,Kn=.01,Dr=.01,Or=(e,[t,n])=>Math.min(n,Math.max(t,e)),Rr=e=>Math.round(e*1e3)/1e3,ge=e=>{const t={...R,...e};return Object.fromEntries(Object.keys(Yn).map(n=>[n,Rr(Or(Number(t[n])||R[n],Yn[n]))]))},Ir=(e,t,n,s)=>{const o=ge(e),a=2*Pr*Math.tan(de(o.fov)/2)/Math.max(1,s);return ge({...o,x:o.x-t*a,y:o.y+n*a})},Br=(e,{deltaX:t=0,deltaY:n=0,ctrlKey:s=!1})=>{const o=ge(e);return ge(s?{...o,fov:o.fov*Math.exp(n*Dr)}:{...o,z:o.z-n*Kn,x:o.x+t*Kn})},Jt=.001,Vr=(e,t,n)=>{const s=[];for(const o of[e,...t??[]].filter(Boolean)){const a=Number(o.at_s)||0,r=(i,c)=>{const f=s.findIndex(h=>Math.abs(h.t-i)<Jt);f>=0?s[f]={t:i,pose:c}:s.push({t:i,pose:c})};r(a,ge(o.from??R)),r(a+(Number(o.dur_s)||Math.max(0,n-a)),ge(o.to??o.from??R))}return s.sort((o,a)=>o.t-a.t)},nt=(e,t,n)=>[...e.filter(s=>Math.abs(s.t-t)>=Jt),{t,pose:ge(n)}].sort((s,o)=>s.t-o.t),Nr=(e,t)=>e.filter(n=>Math.abs(n.t-t)>=Jt),Ur=(e,t)=>e.reduce((n,s)=>Math.abs(s.t-t)<Math.abs(n.t-t)?s:n,e[0]),$r=e=>{const t=(n,s,o,a)=>({move:"framed",ease:"inOut",at_s:o,...a?{dur_s:a}:{},from:n,to:s});return e.length<2?e.map(n=>t(n.pose,n.pose,0)):e.slice(0,-1).map((n,s)=>t(n.pose,e[s+1].pose,n.t,e[s+1].t-n.t))},Hr=(e,t,n,s)=>{const{cam:o,t:a}=jt({camera:e,camera_more:t},n),r=Yt(o,Math.max(0,a),s);return ge({x:r.x,y:r.y,z:r.z,fov:r.fov*180/Math.PI})},Gr={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},Wr={nl:"Camera",de:"Kamera",fr:"Caméra",it:"Telecamera"},Xn=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch","groundWash","groundGrain","grass","grassSway","horizonBushes"],jr=e=>Ae(e)?"vfx":e.layer,Zn=e=>Ae(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,qn="application/x-lp-stage25d",st=new Map,At=new Map,Yr=.8,Kr=e=>(At.has(e)||At.set(e,yr(e)),At.get(e));function Xr(e){return st.has(e)||st.set(e,Ko(Ks(e)).catch(t=>{throw st.delete(e),t})),st.get(e)}const Zr=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function ii(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,a=null,r=null,i=new Map,c=new Map,f=0,h=null,v=0,M=0,y=performance.now(),g=!1,x=[],p=[],b={},z=new Set,k=null,A=null;const W=l=>Ae(l)?null:A.base+"thumbs/"+l.file;let H=null,j=null,te={},I=null,ae=0,Y=null,U=[],w=!1;const O=()=>{s.engine.runRenderLoop(()=>{const l=performance.now();M+=Math.min(.1,(l-y)/1e3),y=l,s.tick(l),I&&s.fadeLayers(S(),Yr),o&&s.pose(o,ce(),M),s.scene.render(),I?.place()})},X=()=>{if(!o||!s)return;const l=(u,d)=>z.has(d)?{...u,opacity:0,keys:[]}:u;o={...o,set:{...o.set,groundBands:p.map((u,d)=>l(u,`band-${d}`)),skyLayer:b,layers:x.map((u,d)=>l(u,`layer-${d}`))}},s.rebind(o)},D=l=>{const u=/^band-(\d+)$/.exec(String(l??""));return u&&p[Number(u[1])]?Number(u[1]):-1},he=l=>l==="sky"?r?.set?.sky?{...b,depth:"sky"}:null:D(l)>=0?{...p[D(l)],depth:"bg"}:x[ne(l)]??null,N=(l,u)=>{let d=null;if(l==="sky"&&r?.set?.sky){if(u.motion===void 0)return null;b={...b,motion:u.motion},d={skyLayer:{motion:u.motion}}}else if(D(l)>=0){const m=D(l);p=p.map((E,F)=>F===m?{...E,...u}:E),d={band:{index:m,...u}}}else if(x[ne(l)]){const m=ne(l);x=x.map((E,F)=>F===m?{...E,...u}:E),d=m}return d===null?null:(k=se(),X(),d)},se=()=>Et({set:{layers:x,groundBands:p,skyLayer:b},camera:Y,camera_more:U}),S=()=>{const l=I?.selected??null;return l===null||ae>0||window.__timelineKeying?.playing?.()?[]:Tr(x.map((u,d)=>({index:d,box:z.has(`layer-${d}`)?null:s.layerBox(d)})),l)},_=()=>o?Wt(o):8,T=()=>Vr(Y,U,_()),C=()=>Hr(Y,U,ce(),_()),G=l=>{const[u=null,...d]=$r(l);Y=u,U=d,o&&(o={...o,camera:Y,camera_more:U}),k=se(),L.sceneId!=null&&t.onCommit?.(0,{camera:Y,camera_more:U},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},q=l=>{if(!o)return;const u=ce(),d=T();if(window.__timelineKeying?.autoKey?.()||!d.length){const m=!d.length&&u>0?nt(d,0,C()):d;return G(nt(m,u,l))}G(nt(d,Ur(d,u).t,l))},be=()=>{let l=null;const u=m=>{m.preventDefault(),m.stopImmediatePropagation()};n.addEventListener("pointerdown",m=>{w&&(u(m),n.setPointerCapture?.(m.pointerId),l={x:m.clientX,y:m.clientY,pose:C()},n.style.cursor="grabbing")},{capture:!0}),n.addEventListener("pointermove",m=>{w&&(u(m),l&&q(Ir(l.pose,m.clientX-l.x,m.clientY-l.y,n.getBoundingClientRect().height)))},{capture:!0});const d=m=>{l&&(u(m),l=null,n.style.cursor=w?"grab":"")};n.addEventListener("pointerup",d,{capture:!0}),n.addEventListener("pointercancel",d,{capture:!0}),n.addEventListener("wheel",m=>{w&&(u(m),q(Br(C(),m)))},{capture:!0,passive:!1}),window.addEventListener("scene-object-selected",m=>{m.detail?.id!=="s25_camera"&&L.frameCamera(!1)})},J=()=>({...r.set,layers:x,groundBands:p,skyLayer:b}),ut=(l,u)=>{const d=N(l,u);d===null||L.sceneId==null||(typeof d=="number"?t.onCommit?.(d,u,L.sceneId):t.onCommit?.(0,d,L.sceneId))},ce=()=>h?h():f,dt=()=>r?.set?.sky&&A?i.get(r.set.sky)??Te(A,{asset:r.set.sky},"sky"):null,ze=l=>{const u=i.get(x[l]?.asset);return!!(x[l]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&x[l].depth!=="sky")},Ps=l=>l==="sky"||D(l)>=0,Ds=(l,u)=>{const d=s?.pickBackdrops?.(l,u).find(E=>!z.has(E.band!==void 0?`band-${E.band}`:`layer-${E.index}`)&&H.opaque(E.asset,E.u,E.v)),m=d?d.band!==void 0?`band-${d.band}`:`layer-${d.index}`:r?.set?.sky?"sky":null;return m&&L.select(m),!!m},Qt=(l,u)=>Se(u)||ds(l,u),en=l=>{const u=i.get(x[l]?.asset);return!!u&&Qt(x[l],u)},Pe=l=>ye(x[l],ce()).z??ee[x[l].depth],Os=l=>ze(l)&&!(x[l].keys??[]).some(u=>u.scale!==void 0),tn=l=>Math.round(l*1e3)/1e3,nn=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],L={canvas:n,sceneId:null,async show(l){const u=await Xr(l.bundle);if(g)return;s||(s=new Ja(n,u),O()),te={...l.look??{}},s.setLook(te);const d=Zr(l);await s.build(d,u),o=d,x=d.set.layers,p=(d.set.groundBands??[]).map(m=>({...m})),b={...d.set.skyLayer??{}},Y=d.camera,U=d.camera_more??[],z=new Set,k=Et(l),r=l,i=new Map(u.assets.map(m=>[m.id,m])),A=u,H=Kr(u.base),H.prime(d.set.layers.map(m=>i.get(m.asset)).filter(Boolean)),t.editable&&!I&&(n.style.pointerEvents="auto",be(),window.addEventListener("scene-object-selected",m=>{m.detail?.id!==`s25_${j}`&&(j=null)}),n.addEventListener("dragover",m=>{m.dataTransfer?.types?.includes(qn)&&(m.preventDefault(),m.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",m=>{const E=m.dataTransfer?.getData(qn);if(!E)return;m.preventDefault();const F=n.getBoundingClientRect();L.addLayer(E,{x:m.clientX-F.left,y:m.clientY-F.top})}),n.addEventListener("dblclick",()=>{const m=j??(I?.selected!=null?`layer-${I.selected}`:null),E=m&&L.editTarget(m);E&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:E}))}),I=Lr({canvas:n,host:e,stage:()=>s,alpha:{opaque:(m,E,F,B)=>!z.has(`layer-${B}`)&&H.opaque(m,E,F,Ae(m)?ks(m,x[B]?.play,ce()):void 0)},valueOf:(m,E)=>E==="z"?Pe(m):ye(x[m],ce())[E],onGround:ze,byDistance:Os,groundUnder:(m,E,F,B)=>$n(s.pointerRay(m,E),en(B)?F:P=>s.groundHeightAt(P)+F),footY:m=>s.layerFootY(m)-(en(m)?0:s.groundHeightAt(Pe(m))),eye:nn,onSettled:m=>L.settleBand(m),onEmpty:(m,E)=>Ds(m,E),onChange:(m,E,F)=>L.moveLayer(`layer-${m}`,E,F)})),(I?.selected??-1)>=x.length&&I.select(null),c=new Map(u.assets.map(m=>[m.id,m.height_m??1.7])),v=Number(l.narration_at_s)||0,a=jn(l),e.dataset.stage25dReady="1"},editTarget(l){const u=l==="sky"?r?.set?.sky?b:null:D(l)>=0?p[D(l)]:x[ne(l)],d=l==="sky"?dt():i.get(u?.asset);return!u||!d||!A?null:{id:`s25_${l}`,title:L.items().find(m=>m.id===l)?.label??ve({},d,(document.documentElement.lang||"en").slice(0,2)),original:A.base+d.file,state:u.edit_state??null,edited:!!u.src,el:e}},matches:l=>a===jn(l),adopt(l){const u=Et(l);if(u===k)return!1;k=u;const d=(m,E)=>{const F={...m};for(const B of qt)E?.[B]===void 0?delete F[B]:F[B]=E[B];return F};return x=x.map((m,E)=>d(m,l.set?.layers?.[E])),p=p.map((m,E)=>d(m,l.set?.groundBands?.[E])),b=d(b,l.set?.skyLayer),Y=l.camera??null,U=l.camera_more??[],o=o&&{...o,camera:Y,camera_more:U},r=l,X(),!0},setLayerProp(l,u,d){N(l,{[u]:d})},setLayerKeys(l,u){const d=he(l);d&&JSON.stringify(d.keys??[])!==JSON.stringify(u)&&N(l,{keys:u})},commitLayerProp(l,u,d){ut(l,{[u]:d})},readLayerProp(l,u){const d=he(l),m=d?u==="z"&&ne(l)>=0?Pe(ne(l)):u==="z"?ye(d,ce()).z??d.z:ye(d,ce())[u]:null;return Number.isFinite(m)?m:null},setHidden(l,u){ne(l)<0&&D(l)<0||(z=new Set(u?[...z,l]:[...z].filter(d=>d!==l)),X())},update(l){h=null,f=Math.max(0,l)},play(l){h=()=>v+l()},moveLayer(l,u,d){window.__timelineKeying?.edit?.(`s25:${l}`,u,d,{flush:!1})||L.commitLayerProp(l,u,d)},select(l){if(l==="camera"){j=null,I?.select(null),L.frameCamera(!0),window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_camera"}}));return}L.frameCamera(!1),j=Ps(l)?l:null,I?.select(ne(l)>=0?ne(l):null,!j),j&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${j}`}}))},get skySelected(){return j==="sky"},get backdrop(){return j},get selection(){return I?.selected??null},clearSelection(){I?.select(null),L.frameCamera(!1)},frameCamera(l){w=!!l,n.style.cursor=w?"grab":"",window.dispatchEvent(new CustomEvent("stage25d-edited"))},cameraInfo:()=>({framing:w,moves:!!Y,keys:T(),pose:C()}),setCameraValue(l,u){q({...C(),[l]:u})},toggleCameraKey(){const l=ce(),u=T();G(u.some(d=>Math.abs(d.t-l)<.001)?Nr(u,l):nt(u,l,C()))},resetCamera(){G([])},atStart(){return f===0&&h===null&&z.size===0&&!w},layerInfo(l){const u=(P,Q)=>{const me=typeof P.motion=="string"?{kind:P.motion}:P.motion??{};return{kind:me.kind??ms(Q),amount:me.amount??1,speed:me.speed??1}};if(l==="sky"){const P=dt();return P?{id:l,asset:P.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:ve({},P,(document.documentElement.lang||"en").slice(0,2)),file:b.src??`${A.base}${P.file}`,motion:u(b,P)}:null}if(D(l)>=0){const P=p[D(l)],Q=i.get(P.asset);return{id:l,asset:P.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:L.items().find(me=>me.id===l)?.label??"",file:P.src??(Q?`${A.base}${Q.file}`:null),motion:u(P,Q)}}const d=x[ne(l)];if(!d)return null;const m=i.get(d.asset)??null,E=ze(ne(l)),F=!E||(d.scale??1)!==1||(d.keys??[]).some(P=>P.scale!==void 0),B=m?.layer==="bg"&&!m.tileable_x;return{id:l,asset:d.asset??null,depth:d.depth,figure:d.figure??null,role:m?.layer??null,ground:E,showScale:F,fields:E?["x","z",...F?["scale"]:[],"rotation","opacity"]:["x",...B?["z"]:[],"y","scale","rotation","opacity"],label:L.items().find(P=>P.id===l)?.label??ve(d,m,(document.documentElement.lang||"en").slice(0,2)),file:d.src??(m?`${A.base}${m.file}`:null),motion:u(d,m),anim:Zn(m),play:{speed:d.play?.speed??1,offset:d.play?.offset??0}}},setLayerPlay(l,u){const d=he(l);d&&ut(l,{play:{...d.play??{},...u}})},setLayerMotion(l,u){const d=he(l);d&&ut(l,{motion:{...typeof d.motion=="object"?d.motion:{kind:d.motion},...u}})},reorderLayers(l,u,d){if(!ze(u)){d(l,u,L.sceneId,null,null,null);return}const m=ke=>x[ke]?.z??ee[x[ke]?.depth],E=l.filter(ke=>ke===u||ze(ke)),F=E.indexOf(u),B=E[F-1],P=E[F+1],Q=Pe(u),me=B===void 0?0:m(B),ft=P===void 0?1/0:m(P);if((B!==void 0||P!==void 0)&&(Q<me||Q>ft)){const ke=$t(ye(x[u],ce()).x,Q),Rs=B===void 0?ft/1.25:P===void 0?me*1.25:(me+ft)/2,Ze=Math.round(Math.min(oe.cells[1][1],Math.max(oe.cells[0][1],Rs))*100)/100,mt=nn(),Is=(Ze-mt[1])/Math.max(.1,Q-mt[1]),sn=ue=>tn(Math.min(20,Math.max(.01,ue*Is))),Bs=x[u].keys?.some(ue=>ue.z!==void 0||ue.scale!==void 0)?x[u].keys.map(ue=>({...ue,...ue.z!==void 0&&{z:Math.min(oe.cells[1][1],Math.max(oe.cells[0][1],tn(ue.z+Ze-Q)))},...ue.scale!==void 0&&{scale:sn(ue.scale)}})):null;d(l,u,L.sceneId,lt(Zt(ke,Ze,mt)).x,Ze,sn(x[u].scale??1),Bs);return}d(l,u,L.sceneId,x[u].x??.5,m(u),x[u].scale??1)},library(){if(!A)return null;const l=(document.documentElement.lang||"en").slice(0,2);return{bundle:A.bundle,assets:A.assets.filter(u=>u.kind!=="sheet").map(u=>({id:u.id,layer:u.layer,shelf:jr(u),anim:Zn(u),band:Rt(u),tags:u.tags??[],url:A.base+u.file,thumb:W(u),label:ve({},u,l)}))}},tiles:l=>Cs(l),seriesOfLayer(l){const u=i.get(x[ne(l)]?.asset),d=Ke(u);if(!d||!A)return null;const m=(document.documentElement.lang||"en").slice(0,2),E=F=>({id:F.id,url:A.base+F.file,thumb:W(F),...Ce(F)});return{series:d,asset:u.id,members:pr(A.assets,u).map(E),characters:gr(A.assets).map(F=>({series:F.series,url:A.base+F.asset.file,thumb:W(F.asset),label:ve({},F.asset,m)}))}},async switchCharacter(l,u){const d=i.get(x[ne(l)]?.asset),m=d&&A?xr(A.assets,d,u):null;m&&await L.swapAsset(l,m.id)},async swapAsset(l,u){if(l==="sky"){if(i.get(u)?.layer!=="sky"||dt()?.id===u)return;await L.show({...r,set:{...J(),sky:u}}),L.sceneId!=null&&t.onCommit?.(0,{sky:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const d=p[D(l)];if(d){const E=i.get(u);if(!E||!Rt(E)||d.asset===u)return;const F=Number(l.slice(5)),B=p.map((P,Q)=>Q===F?{...P,asset:u}:P);await L.show({...r,set:{...J(),groundBands:B}}),L.sceneId!=null&&t.onCommit?.(0,{band:{index:F,asset:u}},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L.select(l);return}const m=ne(l);m<0||!x[m]||!i.has(u)||x[m].asset===u||(x=x.map((E,F)=>F===m?{...E,asset:u}:E),await L.show({...r,set:J()}),t.onCommit?.(m,{asset:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(l,u=null){const d=i.get(l);if(!d)return;const m=["mid","fg","near","bg","sky"].includes(d.layer)?d.layer:d.layer==="figure"?"fg":"mid",E=u?0:x.filter(B=>B.asset===l).length;let F={asset:l,depth:m,x:.5+.08*(E%5),scale:1};if(!(d.tileable_x||d.layer==="bg"||d.layer==="sky")){const B=u&&s?$n(s.pointerRay(u.x,u.y),Qt({},d)?0:Q=>s.groundHeightAt(Q)):null,P=lt(Ut(B??$t(F.x,ee[m])));F={...F,...P,depth:mn(P.z)}}x=[...x,F],await L.show({...r,set:J()}),t.onCommit?.(x.length-1,{add:F},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),I?.select(x.length-1,!0)},async settleBand(l){const u=x[l];if(!u||!ze(l))return;const d=mn(Pe(l));if(d===u.depth)return;x=x.map((E,F)=>F===l?{...E,depth:d}:E);const m=z;await L.show({...r,set:J()}),z=m,X(),L.sceneId!=null&&t.onCommit?.(l,{depth:d},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),I?.select(l,!1)},groundSlots(){if(!A||!r)return null;const l=(document.documentElement.lang||"en").slice(0,2),u=xs(r.set??{},A).map(m=>({asset:m.asset.id,from_m:m.from})),d=A.assets.filter(m=>m.layer==="ground").map(m=>({id:m.id,label:ve({},m,l),thumb:W(m)}));return{rows:u,options:d,max:Bt}},async setGroundSlots(l){if(!r||!Array.isArray(l))return;const u=l.slice(0,Bt).map((m,E)=>({asset:String(m.asset),from_m:E===0?0:Math.max(0,Math.min(2e3,Number(m.from_m)||0))})),d=z;await L.show({...r,look:te,set:{...J(),groundSlots:u}}),z=d,X(),L.sceneId!=null&&t.onGroundSlots?.(u,L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},lookControls(){return Xn.map(l=>{const[u,d,m]=Sa[l]??[0,1,.01];return{key:l,min:u,max:d,step:m,value:re({...Nt,...te},l)}})},setLook(l,u){!Xn.includes(l)||!Number.isFinite(u)||!s||(te={...te,[l]:u},s.setLook(te),t.onLook?.(l,u,L.sceneId))},async still(l=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const d=document.createElement("canvas");return d.width=l,d.height=Math.max(1,Math.round(l*n.height/n.width)),d.getContext("2d").drawImage(n,0,0,d.width,d.height),d.toDataURL("image/jpeg",.72)};return s.engine.resize(),ae++,s.gridHidden=!0,new Promise(d=>{let m=0;const E=P=>{s.engine.onEndFrameObservable.remove(F),clearTimeout(B),s.gridHidden=--ae>0,d(P)},F=s.engine.onEndFrameObservable.add(()=>{++m>=6&&E(u())}),B=setTimeout(()=>E(null),4e3)})},get config(){return r},figureBox(l){const u=x.find(F=>F.figure===l);if(!u?.asset)return null;const d=ir(o,u,c.get(u.asset)??1.7,ce());if(!d)return null;const m=n.getBoundingClientRect(),E=m.width*.05;return new DOMRect(m.left+d.x*m.width-E/2,m.top+d.y*m.height,E,m.height*.08)},items:()=>{const l=(document.documentElement.lang||"en").slice(0,2),u=dr([...x.map((d,m)=>ve(d,i.get(d.asset),l)||`layer ${m+1}`),...p.map(d=>ve({},i.get(d.asset)??{id:d.asset},l))]);return[...x.map((d,m)=>({id:`layer-${m}`,label:u[m],icon:mr(i.get(d.asset)),depth:d.depth,z:d.z??ee[d.depth],keys:d.keys??[]})),...p.map((d,m)=>({id:`band-${m}`,label:u[x.length+m],icon:"photo",depth:"bg",z:d.z,keys:d.keys??[],backdrop:!0})),...r?.set?.sky?[{id:"sky",label:Gr[l]??"Sky",icon:"cloud",depth:"sky",keys:b.keys??[],backdrop:!0}]:[],{id:"camera",label:Wr[l]??"Camera",icon:"camera",depth:null,keys:[]}]},destroy(){g=!0,delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}I?.destroy(),n.remove()}};return L}export{qn as DROP_TYPE,Xn as LOOK_KEYS,ii as createStage25d,Zr as stageScene};
