import{m as Xs,c as Zs,M as ut,S as qe,R as as,C as be,T as pe,V as B,E as he,a as Yt,b as Oe,P as qs,d as cn,e as hn,f as rs,g as Js,h as Qs,i as eo,j as is,U as to,H as no,D as so}from"./babylon-cwcfcxi_.js";import{l as oo}from"./config-DwQUN7uY.js";import{handleCss as ao}from"./ArtworkOverlay-83HZ5GND.js";import{g as Lt,c as ro,w as un,h as io,e as lo}from"./projection-CL24asTn.js";import"./vite-helpers-DqutJMZx.js";import"./draw-options-UPmwm5Hg.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-CtEz2Hpj.js";import"./ambient-CEzLlAaX.js";import"./alpha-mask-C1RIm4VB.js";const We=new Set;let Ct=!1;function co(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;We.size&&We.clear();let a=ls(e,0,o,n,!0);const r=[];if(!a||a.next===a.prev)return r;let i=0,c=0,m=0;if(s&&(a=po(e,t,a,n)),e.length>80*n){i=e[0],c=e[1];let h=i,v=c;for(let k=n;k<o;k+=n){const w=e[k],g=e[k+1];w<i&&(i=w),g<c&&(c=g),w>h&&(h=w),g>v&&(v=g)}m=Math.max(h-i,v-c),m=m!==0?32767/m:0}return Pt(a,r,i,c,m),r}function ls(e,t,n,s,o){let a=null;if(o===zo(e,t,n,s)>0)for(let r=t;r<n;r+=s)a=mn(r/s|0,e[r],e[r+1],a);else for(let r=n-s;r>=t;r-=s)a=mn(r/s|0,e[r],e[r+1],a);return a&&je(a,a.next)&&(Ke(a),a=a.next),a}function Ee(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&(We.size===0||!We.has(s))&&(je(s,s.next)||Y(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),Ct=!0,Ke(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function Pt(e,t,n,s,o){o&&ko(e,n,s,o);let a=e,r=!1;for(;e.prev!==e.next;){const i=e.prev,c=e.next;if(Y(i,e,c)<0&&(o?uo(e,n,s,o):ho(e))){t.push(i.i,e.i,c.i),Ke(e),e=c,a=c;continue}if(e=c,e===a){if(Ct=!1,e=Ee(e),Ct){a=e;continue}if(!r){e=fo(e,t),a=e,r=!0;continue}mo(e,t,n,s,o);break}}}function ho(e){const t=e.prev,n=e,s=e.next,o=t.x,a=n.x,r=s.x,i=t.y,c=n.y,m=s.y,h=Math.min(o,a,r),v=Math.min(i,c,m),k=Math.max(o,a,r),w=Math.max(i,c,m);let g=s.next;for(;g!==t;){if(g.x>=h&&g.x<=k&&g.y>=v&&g.y<=w&&!(o===g.x&&i===g.y)&&lt(o,i,a,c,r,m,g.x,g.y)&&Y(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function uo(e,t,n,s){const o=e.prev,a=e,r=e.next,i=o.x,c=a.x,m=r.x,h=o.y,v=a.y,k=r.y,w=Math.min(i,c,m),g=Math.min(h,v,k),y=Math.max(i,c,m),T=Math.max(h,v,k),p=It(w,g,t,n,s),A=It(y,T,t,n,s);let x=e.prevZ;for(;x&&x.z>=p;){if(x.x>=w&&x.x<=y&&x.y>=g&&x.y<=T&&x!==r&&!(i===x.x&&h===x.y)&&lt(i,h,c,v,m,k,x.x,x.y)&&Y(x.prev,x,x.next)>=0)return!1;x=x.prevZ}let S=e.nextZ;for(;S&&S.z<=A;){if(S.x>=w&&S.x<=y&&S.y>=g&&S.y<=T&&S!==r&&!(i===S.x&&h===S.y)&&lt(i,h,c,v,m,k,S.x,S.y)&&Y(S.prev,S,S.next)>=0)return!1;S=S.nextZ}return!0}function fo(e,t){let n=e,s=!1;do{const o=n.prev,a=n.next.next;us(o,n,n.next,a,!1)&&Ye(o,a)&&Ye(a,o)&&(t.push(o.i,n.i,a.i),Ke(n),Ke(n.next),n=e=a,s=!0),n=n.next}while(n!==e);return s?Ee(n):n}function mo(e,t,n,s,o){let a=e;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&Eo(a,r)){let i=ds(a,r);a=Ee(a,a.next),i=Ee(i,i.next),Pt(a,t,n,s,o),Pt(i,t,n,s,o);return}r=r.next}a=a.next}while(a!==e)}let Ot=!1;function po(e,t,n,s){const o=[];for(let a=0,r=t.length;a<r;a++){const i=t[a]*s,c=a<r-1?t[a+1]*s:e.length,m=ls(e,i,c,s,!1);m===m.next&&We.add(m),o.push(So(m))}o.sort(go),vo(e.length/s,t.length),hs(n,n),Ot=!0;for(let a=0;a<o.length;a++)n=xo(o[a],n);return Ot=!1,Ee(n)}function go(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function xo(e,t){const n=wo(e,t);if(!n)return t;const s=ds(n,e),o=s.next;return hs(n,o.next),Ee(s,s.next),Ee(n,n.next)}const cs=16;let $=new Float64Array(0),it=0;const Dt=[],Rt=[];function vo(e,t){const n=Math.ceil((e+2*t)/cs)+t+2;$.length<n*4&&($=new Float64Array(n*4)),it=0}function hs(e,t){let n=e;do{const s=it++;Dt[s]=n;let o=1/0,a=1/0,r=-1/0,i=-1/0,c=0;do{const h=n.next;n.z=s,n.x<o&&(o=n.x),n.x>r&&(r=n.x),n.y<a&&(a=n.y),n.y>i&&(i=n.y),h.x<o&&(o=h.x),h.x>r&&(r=h.x),h.y<a&&(a=h.y),h.y>i&&(i=h.y),n=h}while(++c<cs&&n!==t);Rt[s]=n;const m=s*4;$[m]=o,$[m+1]=a,$[m+2]=r,$[m+3]=i}while(n!==t)}function yo(e,t){const n=e.z*4;t.x<$[n]&&($[n]=t.x),t.y<$[n+1]&&($[n+1]=t.y),t.x>$[n+2]&&($[n+2]=t.x),t.y>$[n+3]&&($[n+3]=t.y)}function dn(e){let t=Rt[e];for(;t.prev.next!==t;)t=t.next;return Rt[e]=t,t}function fn(e){let t=Dt[e];for(;t.prev.next!==t;)t=t.next;return Dt[e]=t,t}function wo(e,t){let n=t;const s=e.x,o=e.y;let a=-1/0,r;if(je(e,n))return n;for(let k=0,w=0;k<it;k++,w+=4){if(o<$[w+1]||o>$[w+3]||$[w]>s||$[w+2]<=a)continue;const g=dn(k);n=fn(k);do{if(n.prev.next===n){if(je(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const y=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(y<=s&&y>a&&(a=y,r=n.x<n.next.x?n:n.next,y===s))return r}}n=n.next}while(n!==g)}if(!r)return null;const i=r.x,c=r.y,m=Math.min(o,c),h=Math.max(o,c);let v=1/0;for(let k=0,w=0;k<it;k++,w+=4){if($[w+2]<i||$[w]>s||$[w+3]<m||$[w+1]>h)continue;const g=dn(k);n=fn(k);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&lt(o<c?s:a,o,i,c,o<c?a:s,o,n.x,n.y)){const y=Math.abs(o-n.y)/(s-n.x);(Ye(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(y<v||y===v&&(n.x>r.x||n.x===r.x&&bo(r,n)))&&(r=n,v=y)}n=n.next}while(n!==g)}return r}function bo(e,t){return Y(e.prev,e,t.prev)<0&&Y(t.next,e,e.next)<0}const ce=[];let Ie=[],Me=new Uint32Array(0),Be=new Uint32Array(0);const Ve=new Uint32Array(256);function ko(e,t,n,s){let o=e,a=0;do o.z=It(o.x,o.y,t,n,s),ce[a++]=o,o=o.next;while(o!==e);Mo(a);let r=null;for(let i=0;i<a;i++){const c=ce[i];c.prevZ=r,r&&(r.nextZ=c),r=c}r.nextZ=null}function Mo(e){if(e<=32){for(let t=1;t<e;t++){const n=ce[t],s=n.z;let o=t-1;for(;o>=0&&ce[o].z>s;)ce[o+1]=ce[o],o--;ce[o+1]=n}return}Me.length<e&&(Me=new Uint32Array(e),Be=new Uint32Array(e),Ie=new Array(e));for(let t=0;t<e;t++)Me[t]=ce[t].z;Qe(e,ce,Me,Ie,Be,0),Qe(e,Ie,Be,ce,Me,8),Qe(e,ce,Me,Ie,Be,16),Qe(e,Ie,Be,ce,Me,24)}function Qe(e,t,n,s,o,a){Ve.fill(0);for(let i=0;i<e;i++)Ve[n[i]>>>a&255]++;let r=0;for(let i=0;i<256;i++){const c=Ve[i];Ve[i]=r,r+=c}for(let i=0;i<e;i++){const c=n[i],m=Ve[c>>>a&255]++;s[m]=t[i],o[m]=c}}function It(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function So(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function lt(e,t,n,s,o,a,r,i){return(o-r)*(t-i)>=(e-r)*(a-i)&&(e-r)*(s-i)>=(n-r)*(t-i)&&(n-r)*(a-i)>=(o-r)*(s-i)}function Eo(e,t){const n=je(e,t)&&Y(e.prev,e,e.next)>0&&Y(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Ye(e,t)&&Ye(t,e)&&(Y(e.prev,e,t.prev)!==0||Y(e,t.prev,t)!==0))&&!Ao(e,t)&&(n||_o(e,t))}function Y(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function je(e,t){return e.x===t.x&&e.y===t.y}function us(e,t,n,s,o=!0){const a=Y(e,t,n),r=Y(e,t,s),i=Y(n,s,e),c=Y(n,s,t);return(a>0&&r<0||a<0&&r>0)&&(i>0&&c<0||i<0&&c>0)?!0:o?!!(a===0&&et(e,n,t)||r===0&&et(e,s,t)||i===0&&et(n,e,s)||c===0&&et(n,t,s)):!1}function et(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Ao(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let r=e;do{const i=r.next;if(r.x>s&&i.x>s||r.x<n&&i.x<n||r.y>a&&i.y>a||r.y<o&&i.y<o){r=i;continue}if(r.i!==e.i&&i.i!==e.i&&r.i!==t.i&&i.i!==t.i&&us(r,i,e,t))return!0;r=i}while(r!==e);return!1}function Ye(e,t){return Y(e.prev,e,e.next)<0?Y(e,t,e.next)>=0&&Y(e,e.prev,t)>=0:Y(e,t,e.prev)<0||Y(e,e.next,t)<0}function _o(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const r=n.next;n.y>a!=r.y>a&&o<(r.x-n.x)*(a-n.y)/(r.y-n.y)+n.x&&(s=!s),n=r}while(n!==e);return s}function ds(e,t){const n=Bt(e.i,e.x,e.y),s=Bt(t.i,t.x,t.y),o=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,a.next=s,s.prev=a,s}function mn(e,t,n,s){const o=Bt(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function Ke(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),Ot&&yo(e.prev,e.next)}function Bt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function zo(e,t,n,s){let o=0;for(let a=t,r=n-s;a<n;a+=s)o+=(e[r]-e[a])*(e[a+1]+e[r+1]),r=a;return o}Object.assign(window,{BABYLON:{...Zs,...Xs},earcut:co});(()=>{const e=`
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
    }`})();const Fo=new WeakMap;function To(e){return Fo.get(e)?.rtt??null}const Lo=450,pn=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],gn=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],xn={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},Co={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function Po(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),r=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(x=>x.name!=="sky-cloud"&&!(x.metadata&&x.metadata.noGBuffer)))}),i=a.getGBuffer().textures,c=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],m=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=x=>new BABYLON.Vector2(1/x.width,1/x.height),v=new BABYLON.Matrix,k=["invView","tanHalf","resolution","skyDepth"],w=["depthSampler","normalSampler"];function g(x,S){t.getViewMatrix().invertToRef(v);const V=Math.tan(t.fov/2);x.setMatrix("invView",v),x.setVector2("tanHalf",new BABYLON.Vector2(V*S.width/S.height,V)),x.setVector2("resolution",new BABYLON.Vector2(S.width,S.height)),x.setFloat("skyDepth",Lo),x.setTexture("depthSampler",c),x.setTexture("normalSampler",m)}const y=new BABYLON.PostProcess("wash","wash",["texel","radius",...k],w,1,t);y.onApply=x=>{g(x,y),x.setVector2("texel",h(y)),x.setFloat("radius",n.num("wash"))};const T=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...pn,...k],["aquarelSampler",...w],1,t);T.onApply=x=>{g(x,T),x.setVector2("texel",h(T));const S=n.texture();x.setFloat("useTex",S?1:0),x.setTexture("aquarelSampler",S||s),pn.forEach(V=>x.setFloat(V,n.num(V)))};const p=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...gn,...k],["washSampler","animeSampler",...w],1,t);p.onApply=x=>{g(x,p),x.setTextureFromPostProcessOutput("washSampler",y),x.setTexture("animeSampler",To(e)||o),x.setVector2("texel",h(p)),gn.forEach(S=>x.setFloat(S,n.num(S))),x.setColor3("inkColor",BABYLON.Color3.FromArray(xn[n.inkColor()]||xn["blue-grey"]))};const A=[y,T,p];return{dispose(){A.forEach(x=>x.dispose(t)),e.onBeforeRenderObservable.remove(r),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const ee={sky:380,bg:70,mid:22,fg:7,near:3.5},R={x:0,y:1.6,z:0,fov:50},dt=-2,fs=16/9,ms=.42,xt=1.6,Oo=3,ps=e=>Oo*me(e),Do=(e,t)=>t*e,Ro=(e,t,n,s)=>Do(e,t)-(1-s)*n,Xe=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Io=999,Bo=1e3,Vo=.02,gs=2,Kt=120,xs=.05,fe=e=>e>Math.PI?e*Math.PI/180:e,me=(e,t=R.fov,n=fs)=>2*e*Math.tan(fe(t)/2)*n;function vn(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const yn=e=>e.z??ee[e.depth],No=e=>Math.min(1,Math.max(0,(e-ee.mid)/(ee.bg-ee.mid)));function Vt(e,t){return e<=ee.bg||t===0?No(e)*t:R.y+(t-R.y)*e/ee.bg}const Uo=(e,t)=>t?e+t.h*(1-t.top):e,$o=["ground","path","field","ramp","water"],Se=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>$o.includes(t)),Ho=2,Nt=e=>Se(e)&&e.w/Math.max(1,e.h)>=Ho,vs=(e,t,n,s)=>Math.min(0,Ro(e,t,n,s)),wn=[2,2e3],Go=4,bn=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??R.z,n?.to?.z??R.z),R.z);function Wo(e,t,n,s,o,a,r=R.z){const i=we({...e},t),c=Math.min(wn[1],Math.max(wn[0],i.z??e.z)),m=Math.max(c,r+Go),h=ps(m)/s,v=o*h*i.scale;return{z:m,h:v,w:s*h*i.scale,sx:h*i.scale,sy:h*i.scale,x:(i.x-.5)*me(m),y:vs(m,n,v,a),alphaIndex:Xe(c),opacity:i.opacity}}const ys=(e,t)=>!!e.flat||t.layer==="ground";function Ne(e,t,n,s=0,o=s){const a=t.depth,r=yn(t)-n*xs,i=me(r),c=a==="sky"?n*2+1:Xe(r);if(e.layer==="sky"){const T=i*xt,p=T/fs,A=-p*.12+(t.y??0);if(e.tileable_x)return{x:0,y:A,z:r,w:T,h:p,uRepeat:T/(p*(e.w/e.h)),alphaIndex:c,rotation:0};const x=Math.max(T/e.w,p/e.h);return{x:0,y:A,z:r,w:e.w*x,h:e.h*x,uRepeat:1,alphaIndex:c,rotation:0}}const m=e.layer==="bg"&&!e.tileable_x?i*xt*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),m),v=h*(e.w/e.h),k=e.tileable_x?Math.max(v,i*xt):v,w=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?a==="bg"?s:0:Se(e)?0:Vt(yn(t),o),y=a==="sky"?r*Math.tan(fe(R.fov)/2)*.45:g;return{x:w,y:y+(t.y??0),z:r,w:k,h,uRepeat:e.tileable_x?k/v:1,alphaIndex:c,rotation:t.rotation??0}}function jo(e,t,n=0,s=ms,o=dt){const a=.5/Math.tan(fe(R.fov)/2),r=.5+a*Math.tan(-o*Math.PI/180),i=ee.bg-n*xs,c=R.y+(r-s)*i/a;return Math.round((c-t*(1-e))*10)/10}const tt=e=>e-Yo,Yo=.002,kn={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},ws=(e,t)=>(kn[e??"inOut"]??kn.inOut)(Math.min(1,Math.max(0,t))),Te=(e,t,n)=>e+(t-e)*n,Xt=e=>e.dur_s??(e.camera&&sa(e)||e.est_s||8);function Zt(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function qt(e,t,n){if(!e)return{...R,fov:fe(R.fov)};const s=ws(e.ease,n>0?t/(e.dur_s??n):1),o={...R,...e.from},a={...o,...e.to};return{x:Te(o.x,a.x,s),y:Te(o.y,a.y,s),z:Te(o.z,a.z,s),fov:Te(fe(o.fov),fe(a.fov),s),roll:Te(o.roll??0,a.roll??0,s)}}const Ko={sway:{x:.08,y:.05,roll:1.6,hz:.18},handheld:{x:.02,y:.02,roll:.25,hz:.35},shake:{x:.05,y:.05,roll:.6,hz:6}},vt=(e,t)=>(Math.sin(e*1+t)+.6*Math.sin(e*2.17+t*2.3)+.3*Math.sin(e*3.71+t*4.1))/1.9;function Xo(e,t){const n=e?.kind;if(!n||n==="none")return{x:0,y:0,roll:0};const s=Ko[n],o=e.amount??1,a=t*s.hz*(e.speed??1)*2*Math.PI;return{x:s.x*o*vt(a,1),y:s.y*o*vt(a,2),roll:s.roll*o*vt(a,3)}}const Zo=["x","y","z","scale","opacity","rotation"];function we(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const a of Zo){const r=s.filter(k=>k[a]!==void 0).sort((k,w)=>k.t-w.t);if(!r.length)continue;const i=r[0],c=r[r.length-1];if(t<=i.t){o[a]=i[a];continue}if(t>=c.t){o[a]=c[a];continue}const m=r.findIndex(k=>k.t>t),h=r[m-1],v=r[m];o[a]=Te(h[a],v[a],ws("inOut",(t-h.t)/(v.t-h.t)))}return o}const qo={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},bs=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function Mn(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??bs(e),amount:n.amount??1,speed:n.speed??1}}const Jo=.25,Qo=2e3,ea=250,Fe={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},Sn={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function ta(e,t,n,s){const o=i=>{const c=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:c,lastUp:i===-1?n:e.lastUp,locked:e.locked||c>=Fe.lockFlips&&i===1}};if(t<Fe.downFps)return s?o(1):{...e,fast:0};if(t<Fe.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=Fe.upWindows&&n-e.lastChange>=Fe.upAfterChangeMs&&n-e.lastUp>=Fe.upEveryMs?o(-1):{...e,fast:a}}function na(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*Jo)}function sa(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const En={breath_m:.05,breath_s:7},oa=1.5;function aa(e,t,n={}){const s=n.breath_m??En.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??En.breath_s),a=Math.min(1,t/oa),r=a*a*(3-2*a);return{...e,x:e.x+s*r*Math.sin(o*t),y:e.y+s*.5*r*Math.sin(2*o*t)}}async function ra(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const ia=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Pe(e,t,n){if(t.asset){const r=e.assets.find(i=>i.id===t.asset);if(r)return r}const s=ia(t.need??t.asset??"");if(!s.length)return null;let o=null,a=[0,0,0];for(const r of[...e.assets].sort((i,c)=>i.id.localeCompare(c.id))){const i=s.filter(m=>r.tags.some(h=>h.toLowerCase()===m)).length;if(!i)continue;const c=[i,n&&r.layer===n?1:0,r.qa?.score??0];(!o||c[0]>a[0]||c[0]===a[0]&&(c[1]>a[1]||c[1]===a[1]&&c[2]>a[2]))&&(o=r,a=c)}return o}const Le="#f6f5ee",la=.22,ca=(e,t)=>e.layer==="bg"?t.feather??la:0,yt=.6,Ut=12;function ks(e,t){const n=t.paper??Le,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(r=>r.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((r,i)=>r.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const a=Pe({...t,assets:o},{asset:s},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function ha(e,t,n,s=.08){return Ms(e,t,n,1-s,1)}function Ms(e,t,n,s,o){const a=Math.max(0,Math.floor(n*s)),r=Math.min(n,Math.max(a+1,Math.ceil(n*o))),i=[[],[],[]],c=Math.max(1,Math.floor(t*(r-a)/2e4));for(let h=a*t;h<r*t;h+=c){const v=h*4;e[v+3]<200||(i[0].push(e[v]),i[1].push(e[v+1]),i[2].push(e[v+2]))}if(!i[0].length)return null;const m=h=>{const v=[...h].sort((k,w)=>k-w);return v[v.length>>1]/255};return[m(i[0]),m(i[1]),m(i[2])]}const Ge=32,ua=(e,t,n)=>Array.from({length:Ge},(s,o)=>Ms(e,t,n,o/Ge,(o+1)/Ge)),da=(e,t)=>e[Math.min(Ge-1,Math.max(0,Math.floor((1-t)*Ge)))]??null;function fa(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=o){const r=a*4;if(e[r+3]<230)continue;const i=(.299*e[r]+.587*e[r+1]+.114*e[r+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((a,r)=>a-r),s[s.length>>1])}function ma(e,t,n){const s=[];for(let o=0;o<t;o++)for(let a=0;a<n;a++)if(e[(a*t+o)*4+3]>128){s.push(a/n);break}return s.length?(s.sort((o,a)=>o-a),s[s.length>>1]):0}function pa(e,t,n){for(let s=0;s<n;s++){let o=0;for(let a=0;a<t;a++)e[(s*t+a)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const ga=1.6,xa=.12;function An(e,t,n,s){const o=e.layer==="figure",a=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),r=a*xa*s/ga;return o?{w:a,d:Math.min(r,a*.5)}:{w:a,d:Math.min(Math.max(r,a*.3),a*3)}}const va=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Ue=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},$t=6;function Ss(e,t){const n=t.assets.filter(a=>a.layer==="ground"),s=(e.groundSlots??[]).map(a=>({asset:n.find(r=>r.id===a.asset),from:Math.max(0,Number(a.from_m)||0)})).filter(a=>!!a.asset).sort((a,r)=>a.from-r.from).slice(0,$t);if(s.length)return s.map((a,r)=>r===0?{...a,from:0}:a);const o=ks(e,t);return o.kind==="asset"?[{asset:o.asset,from:0}]:[]}const ya=(e,t)=>Math.max(0,e.reduce((n,s,o)=>t>=s.from?o:n,0)),Jt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,Es=Jt;he.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;const wa=[1,2,3,4,5].map(e=>`
    if (slotCount > ${e}.5) { float k${e} = smoothstep(slotFrom[${e}] * 0.85, slotFrom[${e}] * 1.15 + 0.5, dn); c = mix(c, slotTile(tex${e}, slotTiles[${e}]), k${e}); own = mix(own, slotColour[${e}], k${e}); }`).join("");he.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, tex1, tex2, tex3, tex4, tex5, nearTex;
  uniform float useTex, grain, fadeNear, fadeFar, detail, vary, mixTile, tileScale, wash, grainSize, slotCount;
  uniform float slotFrom[6], slotTiles[6];
  uniform vec3 slotColour[6];   // each slot's own median colour: its far floor fades into it, not into one tint
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${Jt}
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
      c = slotTile(tex, slotTiles[0]); own = slotColour[0];${wa}
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
  }`;he.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;he.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${Jt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const ba=e=>e?pe.WRAP_ADDRESSMODE:pe.MIRROR_ADDRESSMODE;function ka(e){const t=ut.CreateGround("ground",{width:2400,height:2400},e),n=new qe("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tileScale","wash","grainSize","slotCount","slotFrom","slotTiles","slotColour","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","tex1","tex2","tex3","tex4","tex5","nearTex"],needAlphaBlending:!0}),s=new as(new Uint8Array([255,255,255,255]),1,1,be.TEXTUREFORMAT_RGBA,e);for(const o of $e)n.setTexture(o,s);return n.setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0).setFloat("tileScale",1).setFloat("wash",.5).setFloat("grainSize",1),t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Io,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){const a=o.slots.slice(0,$e.length);a.forEach(i=>{i.tex.wrapU=pe.WRAP_ADDRESSMODE,i.tex.wrapV=pe.WRAP_ADDRESSMODE}),$e.forEach((i,c)=>n.setTexture(i,a[c]?.tex??s));const r=(i,c)=>$e.map((m,h)=>a[h]?i(a[h]):c);n.setFloat("useTex",a.length?1:0).setFloat("slotCount",a.length).setFloats("slotFrom",r(i=>i.from,1e6)).setFloats("slotTiles",r(i=>i.tile||Ut,Ut)).setArray3("slotColour",$e.flatMap((i,c)=>a[c]?.colour??o.base)).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",B.FromArray(o.base)).setVector3("horizonTint",B.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tileScale",o.tileScale).setFloat("wash",o.wash).setFloat("grainSize",o.grainSize)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=ba(o.tileable),o.tex.wrapV=pe.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}const $e=["tex","tex1","tex2","tex3","tex4","tex5"];let Ma=0;function _n(e,t,n,s,o){const a=ut.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(a.rotation.x=Math.PI/2,o){const[i,c]=o.dir,m=Math.hypot(i,c)||1;a.rotation.y=Math.atan2(i/m,c/m),a.position.set(i/m*o.length*.42,.015,c/m*o.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const r=new qe(a.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return r.alphaMode=be.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,r.setFloat("seed",Ma++*7.31%97).setFloat("opacity",0),a.material=r,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:i=>{r.setFloat("opacity",i),a.isVisible=i>.001}}}he.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;he.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${Es}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;he.ShadersStore.stageBirdFragmentShader=`
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
  }`;function As(e,t,n,s){const o=ut.CreatePlane(e,{size:1},n),a=new qe(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=be.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,o.material=a,o.billboardMode=Yt.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:a}}const _s=9,Sa=9;function Ea(e,t,n,s){const o=Array.from({length:_s},(a,r)=>{const i=As(`smoke:${r}`,"stagePuff",e,s);return i.mat.setFloat("seed",r*3.7),i});return{update(a,r){o.forEach(({mesh:i,mat:c},m)=>{const h=Aa(a,m),v=n*(.6+3.2*h);i.scaling.setAll(v),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(m*2.1+a*.3),t.y+n*(.4+7*h),t.z),c.setFloat("alpha",r*.7*Math.sin(Math.PI*h)),i.isVisible=r>.001})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const Aa=(e,t)=>((e/Sa+t/_s)%1+1)%1,wt=40,zn=16;function _a(e){const t=(e%wt+wt)%wt;return t<zn?t/zn:null}function za(e,t,n,s){const o=Array.from({length:6},(a,r)=>As(`bird:${r}`,"stageBird",e,s));return{update(a,r){const i=_a(a),c=Math.round(2+r*4);o.forEach(({mesh:m,mat:h},v)=>{if(m.isVisible=r>.001&&i!==null&&v<c,!m.isVisible||i===null)return;const k=v*.025;m.position.set((i-k-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*i,t+v*1.5),m.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,r*2)).setFloat("flap",Math.sin(a*7+v*1.3))})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const Fn=["fire","hearth","chimney","smoke"],Fa=e=>e.id.split(/[-_]/).some(t=>Fn.includes(t))||e.tags.some(t=>Fn.includes(t.toLowerCase())),bt=e=>e[0].toUpperCase()+e.slice(1),Ta=e=>({fade:`lineFade${bt(e)}`,thin:`lineThin${bt(e)}`,haze:`haze${bt(e)}`}),ct={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:dt,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,groundWash:.5,groundGrain:1,grass:.5,grassSway:.15,horizonBushes:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},La=[1.05,1,.9],Ca=[.88,.93,1.05],Pa=.35;function Oa(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:J(e,"edgeSoft"),footM:t==="standing"?Pa:0,grounding:t==="figure"?0:J(e,"grounding"),grass:t==="figure"?0:J(e,"grassOverlap"),light:o?0:J(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?J(e,"cloudDrift"):0,footTint:s}}const zs=[.93,.86,.74],Tn=e=>({paper:J(e,"sheetPaper"),grain:J(e,"sheetGrain"),patches:J(e,"sheetPatches"),wash:J(e,"sheetWash"),washColour:zs}),Da={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01],groundGrain:[.5,3,.05]},Ra=Object.fromEntries(Object.keys(ct).map(e=>[e,Da[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),le=(e,t)=>J(e,t),J=(e,t)=>{const n=Number(e[t]??ct[t]);return Number.isFinite(n)?n:ct[t]};function kt(e,t){const n=Ta(t);return{fade:J(e,n.fade),thin:J(e,n.thin),haze:J(e,n.haze),brown:J(e,"lineBrown"),ink:J(e,"lineInk"),norm:J(e,"lineNorm")}}const Ia=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),Mt=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),nt=(e,t,n,s,o)=>{const a=s*(1080/o);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function Ba(e,t,n){const s=new B(R.x,R.y,R.z),o=Oe.RotationX(e*Math.PI/180),r=Oe.LookAtLH(s,s.add(B.TransformNormal(new B(0,0,1),o)),B.TransformNormal(B.Up(),o)).multiply(Oe.PerspectiveFovLH(fe(R.fov),t,.1,2e3));return{vp:r,top:B.TransformCoordinates(new B(0,0,n),r).y}}he.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function Va(e,t){const n=new qs("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",B.FromArray(zs))},n}const Ae=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,Na=12;function Fs(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,a=((t?.offset??0)+n*o)*(e.fps??Na),r=Math.floor(a+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,r)):(r%s+s)%s}function Ua(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const $a=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Ha=`
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
  }`;he.ShadersStore.stageLayerVertexShader=`
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
  }`;he.ShadersStore.stageLayerFragmentShader=`
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
  ${Es}
  ${$a}
  ${Ha}
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
  }`;const Ln=new WeakMap,Ts=new Map,Ls=new Map,Ht=new Map,Cs=new Map,rt=new Map;function He(e,t){const n=Ln.get(t)??new Map;Ln.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((a,r)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>r(new Error(`layer image ${e} did not load`)),i.onload=()=>{const c=document.createElement("canvas");c.width=i.naturalWidth,c.height=i.naturalHeight;const m=c.getContext("2d",{willReadFrequently:!0});m.drawImage(i,0,0);const h=m.getImageData(0,0,c.width,c.height).data,v=ha(h,c.width,c.height);v&&Ts.set(e,v),rt.set(e,ua(h,c.width,c.height)),Ls.set(e,pa(h,c.width,c.height)),Ht.set(e,ma(h,c.width,c.height));const k=fa(h,c.width,c.height);k!==null&&Cs.set(e,k);for(let g=0;g<h.length;g+=4){const y=h[g+3]/255;h[g]=Math.round(h[g]*y),h[g+1]=Math.round(h[g+1]*y),h[g+2]=Math.round(h[g+2]*y)}const w=new as(h,c.width,c.height,be.TEXTUREFORMAT_RGBA,t,!0,!1,pe.TRILINEAR_SAMPLINGMODE);w.anisotropicFilteringLevel=8,w.wrapV=pe.CLAMP_ADDRESSMODE,a(w)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const St=24;function Ga(e,t,n,s,o){const[a,r]=t.anchor??[.5,1],i=[],c=[],m=[];for(let v=0;v<=St;v++){const k=v/St;for(const w of[0,1])i.push((w-a)*n,(r-k)*s,0),c.push(w,k);if(v<St){const w=v*2;m.push(w,w+2,w+1,w+1,w+2,w+3)}}const h=new Yt(e,o);return Object.assign(new rs,{positions:i,uvs:c,indices:m}).applyToMesh(h),h}let Wa=0;function Cn(e,t,n,s,o,a){const r=Ga(`layer:${e.id}`,e,n,s,a),i=new qe(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?pe.WRAP_ADDRESSMODE:pe.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=be.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const c=Wa++*2.39996%(Math.PI*2),m=e.anchor?.[1]??1;return i.setFloat("phase",c).setFloat("height",s*m).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setVector4("cell",new cn(0,0,1,1)),r.material=i,r.metadata={noGBuffer:!0,painted:!0},r.isPickable=!1,{mesh:r,material:i,setMotion:h=>{i.setFloat("kind",qo[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),r.isVisible=h>.001},setLine:(h,v,k,w)=>{i.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new hn(k[0],k[1])).setVector3("hazeTint",B.FromArray(w))},setPaper:(h,v)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",B.FromArray(h.washColour)).setVector2("grainUV",new hn(v[0],v[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setCell:h=>{i.setVector4("cell",new cn(h[0],h[1],h[2],h[3]))},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",B.FromArray(h.footTint)).setVector3("sunColour",B.FromArray(La)).setVector3("shadeColour",B.FromArray(Ca))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,v)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),v&&i.setVector3("featherTint",B.FromArray(v))}}}const Ps=600,Os=1.5,ja=2,Ya=.8,Ka=["grass","heather","reeds","shrub","bramble","juniper","hazel","meadow","fern","tree","bush","sedge","flower"],Xa=["shrub","tree","bush","bramble","hedge"],Za=["ground"];function qa(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function Pn(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}const Ja=e=>e.layer!=="ground"&&e.layer!=="sky"&&e.layer!=="bg"&&e.layer!=="figure"&&!e.tileable_x&&!Nt(e)&&e.kind!=="animation"&&e.tags.some(t=>Ka.includes(t));function Qa(e){const t=e.assets.filter(n=>n.kind==="sheet");return t.length?t.flatMap(n=>(n.cells??[]).map(s=>({asset:n.id,file:n.file,tags:s.tags,height_m:s.height_m,aspect:s.rect[2]*n.w/Math.max(1,s.rect[3]*n.h),cell:s.rect}))):e.assets.filter(Ja).map(n=>({asset:n.id,file:n.file,tags:n.tags,height_m:n.height_m,aspect:n.w/Math.max(1,n.h),cell:[0,0,1,1]}))}const Ds=(e,t)=>e.tags.some(n=>!Za.includes(n)&&t.includes(n)),er=(e,t)=>e.filter(n=>n.height_m<=Os&&!n.tags.includes("tree")&&Ds(n,t)),tr=["grass","meadow","heath","field","hedge","forest","marsh","wet","edge","heather"];function nr(e,t){const n=e.filter(o=>o.height_m>Os&&o.tags.some(a=>Xa.includes(a))),s=n.filter(o=>Ds(o,t));return s.length||!t.some(o=>tr.includes(o))?s:n.filter(o=>!o.tags.includes("tree"))}function On(e){const t=Math.min(Ps,Math.max(0,Math.round(e.count)));if(!e.picks.length||!t)return[];const n=qa(e.seed),s=Math.max(e.from,e.front+ja),o=Math.max(s,e.to),a=[];for(let r=0;r<t;r++){const i=s*Math.pow(o/s,n()),c=Math.floor(n()*e.picks.length);a.push({z:i,x:(n()*2-1)*Ya*me(i),h:e.picks[c].height_m*(.7+.6*n())*(e.size??1),pick:c,phase:n()*Math.PI*2})}return a.sort((r,i)=>i.z-r.z)}const Rs=[...Array.from({length:16},(e,t)=>2.5*Math.pow(1.4,t+1)),1/0],Dn=e=>Rs.findIndex(t=>e<t);he.ShadersStore.stageStrewnVertexShader=`
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
  }`;he.ShadersStore.stageStrewnFragmentShader=`
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
  }`;function sr(e,t,n,s,o,a,r){const i=new qe(`strewn:${r}`,e,"stageStrewn",{attributes:["position","quad","uv","extra"],uniforms:["viewProjection","camPos","time","sway","land","haze","opacity"],samplers:["tex"],needAlphaBlending:!0});i.alphaMode=be.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setTexture("tex",t).setVector3("haze",B.FromArray(a));const c=new Map;for(const h of s)c.set(Dn(h.z),[...c.get(Dn(h.z))??[],h]);const m=[...c].map(([h,v])=>{const k=[],w=[],g=[],y=[],T=[];v.forEach((A,x)=>{const S=n[A.pick],[V,j,N,Z]=S.cell,U=A.h*S.aspect,Q=o(A.z);for(const[H,G]of[[-.5,0],[.5,0],[.5,1],[-.5,1]])k.push(A.x,0,A.z),w.push(H,G,A.h,U),g.push(V+(H+.5)*N,j+(1-G)*Z),y.push(A.phase,Q[0],Q[1],Q[2]);T.push(x*4,x*4+1,x*4+2,x*4,x*4+2,x*4+3)});const p=new Yt(`strewn:${r}:${h}`,e);return Object.assign(new rs,{positions:k,indices:T}).applyToMesh(p),p.setVerticesData("quad",w,!1,4),p.setVerticesData(Js.UVKind,g,!1,2),p.setVerticesData("extra",y,!1,4),p.material=i,p.alphaIndex=Xe(Math.min(Rs[h],2e3)),p.alwaysSelectAsActiveMesh=!0,p.isPickable=!1,p.metadata={noGBuffer:!0},p});return{meshes:m,update(h,v,k,w,g){i.setFloat("time",h).setFloat("sway",v).setFloat("land",k).setFloat("opacity",g).setVector3("camPos",w),m.forEach(y=>{y.isVisible=g>.001})},dispose(){m.forEach(h=>h.dispose()),i.dispose()}}}const st=[3,60],Rn=[60,300],or=80,ar=1.8,rr=(e,t)=>t??e.asset.tags;function In(e){const t=[],n=Math.log(st[1]/st[0]);e.slots.forEach((o,a)=>{const r=Math.max(st[0],o.from),i=Math.min(st[1],e.slots[a+1]?.from??1/0);if(i<=r)return;const c=er(e.sprites,rr(o,e.bandTags)),m=e.grass*Ps*(Math.log(i/r)/n);t.push({picks:c,clumps:On({picks:c,count:m,from:r,to:i,front:e.front,seed:Pn(`${e.sceneId}:grass:${a}`)})})});const s=e.slots[e.slots.length-1];if(s&&!e.bandTags){const o=nr(e.sprites,s.asset.tags);t.push({picks:o,horizon:!0,clumps:On({picks:o,count:e.bushes*or,from:Rn[0],to:Rn[1],front:e.front,size:ar,seed:Pn(`${e.sceneId}:horizon`)})})}return t.filter(o=>o.clumps.length)}const Gt={...Co["History Lines pencil"],paper:.35,granulation:.2,...ct},ir=new is(.937,.914,.863,1),lr=.7,cr=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class hr{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new Qs(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new eo(this.engine),this.scene.clearColor=ir,this.camera=new to("house",new B(0,1.6,0),this.scene),this.camera.rotation.set(dt*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new no("sky",new B(0,1,0),this.scene).intensity=.7,new so("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=ka(this.scene),this.ground.set(this.groundLook([],null,n)),this.birds=za(this.scene,Un,me(Un),pr),Po(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),Va(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Ue(Le);strip=null;nearTex=null;bands=[];strewn=[];strewSrc=null;strewKey="";smoke=[];birds;footTint=Ue(Le);nearAsset=null;hazeTint=Ue(Le);sceneLib;buildToken=0;look={...Gt};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=Sn;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return na(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=Sn,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>ea;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Qo)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=ta(this.tier,o,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...Gt,...t??{}}}groundPoint(t,n){const s=ee[n];return new B((t-.5)*me(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],a=[];t.set.sky&&a.push({layer:Vn(t),order:0,index:-1});const r={sky:1};t.set.layers.forEach((b,P)=>{const te=b.depth;r[te]=r[te]??0,a.push({layer:b,order:r[te]++,index:P})});const i=[];await Promise.all(a.map(async({layer:b,order:P,index:te})=>{let W=Pe(n,b,b.depth);if(!W){i.push({need:b.need??b.asset,reason:"no match"});return}let re;try{re=await He(ve(n,W,b),this.scene)}catch{i.push({need:b.need??b.asset,reason:`file did not load: ${b.src??W.file}`});return}if(s!==this.buildToken)return;W=Bn(W,b,re);const D=Ne(W,b,P),M=Cn(W,re,D.w,D.h,D.uRepeat,this.scene);M.mesh.position.set(D.x,D.y,D.z);const _=ys(b,W);M.mesh.alphaIndex=_?Bo:D.alphaIndex,_&&(M.mesh.rotation.x=Math.PI/2),M.mesh.isVisible=!1;let F,O,q;if(Et.includes(b.depth)&&!W.tileable_x&&!_&&!Se(W)){const K=An(W,D.w,D.h,D.z);q=ne=>An(W,D.w,D.h,ne).d/K.d,F=_n(M.mesh,K.w,K.d,this.scene),F.mesh.alphaIndex=tt(D.alphaIndex),O=_n(M.mesh,K.w,K.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:D.h*gr(this.sunDir)}),O.mesh.alphaIndex=tt(D.alphaIndex)}o.push({layer:b,index:te,builtScale:b.scale??1,builtZ:D.z,handle:M,asset:W,order:P,stain:F,cast:O,stainDepth:q,ink:Cs.get(ve(n,W,b)),flat:_,skyline:Ht.get(ve(n,W,b))})}));const c=ks(t.set,n),m=(await Promise.all(Ss(t.set,n).map(async b=>{const P=await He(n.base+b.asset.file,this.scene).catch(()=>(i.push({need:b.asset.id,reason:`file did not load: ${b.asset.file}`}),null)),te=(rt.get(n.base+b.asset.file)??[]).filter(W=>!!W);return P?{tex:P,tile:b.asset.height_m||Ut,from:b.from,asset:b.asset,colour:te.length?$n(te):Ue(n.paper??Le)}:null}))).filter(b=>!!b);let h=null;const v=va(t.set.near,n),k=v?Pe(n,{asset:v}):null;if(t.set.near&&!k&&i.push({need:t.set.near,reason:"no near band"}),k)try{h=await He(n.base+k.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${k.file}`})}c.kind==="paper"&&c.reason&&i.push({need:t.set.ground,reason:c.reason});const w=o.filter(b=>b.asset.layer==="bg").sort((b,P)=>b.index-P.index)[0],g=w?{top:Ls.get(ve(n,w.asset,w.layer))??0,h:Ne(w.asset,w.layer,w.order).h,order:w.order}:null,y=o.find(b=>b.index===-1),T=y&&Ne(y.asset,y.layer,y.order),p=y&&T?da(rt.get(ve(n,y.asset,y.layer))??[],(R.y-T.y)/T.h):null,A=w?Ts.get(ve(n,w.asset,w.layer))??null:t.set.groundBands?.length?null:p,x=await this.loadBands(t,n),S=t.set.groundBands?.length?[...new Set(t.set.groundBands.flatMap(b=>Pe(n,{asset:b.asset},"ground_band")?.tags??[]))]:null,V=Qa(n),j=bn(t),N=m.map(b=>({asset:b.asset,from:b.from})),Z=[...new Set(In({sceneId:t.id,slots:N,bandTags:S,sprites:V,grass:1,bushes:1,front:j}).flatMap(b=>b.picks.map(P=>P.file)))],U=new Map;await Promise.all(Z.map(async b=>{const P=await He(n.base+b,this.scene).catch(()=>null);P&&U.set(b,P)}));const Q=b=>b.forEach(P=>{P.stain?.mesh.material?.dispose(),P.cast?.mesh.material?.dispose(),P.handle.mesh.dispose(),P.handle.material.dispose()});if(s!==this.buildToken){Q(o),x.forEach(b=>{b.handle.mesh.dispose(),b.handle.material.dispose()});return}Q(this.built),this.bands.forEach(b=>{b.handle.mesh.dispose(),b.handle.material.dispose()}),this.bands=x,this.built=o,this.sceneLib=n;const H=m[0]?(rt.get(n.base+m[0].asset.file)??[]).filter(b=>!!b):[],G=this.groundLook(m,A,n,c.kind==="paper"?c.colour:void 0);this.horizonTint=G.tint,this.strip=g,this.smoke.forEach(b=>b.dispose()),this.smoke=o.filter(b=>Fa(b.asset)&&Et.includes(b.layer.depth)&&!b.flat).map(b=>{const P=Ne(b.asset,b.layer,b.order);return Ea(this.scene,new B(b.handle.mesh.position.x,P.h*.6,P.z),Math.min(Math.max(P.h*.8,.5),3),P.alphaIndex)}),this.footTint=H.length?$n(H):G.base,this.nearTex=h,this.nearAsset=k,this.hazeTint=p??G.tint,this.ground.set(G),this.strewSrc={sceneId:t.id,slots:N,colours:m.map(b=>b.colour),bandTags:S,front:j,sprites:V,tex:U},this.strewKey="",this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const a=Ue(o??s.paper??Le),r=n??a;return{slots:t,base:cr(a,r,lr),tint:r,fadeNear:ee.fg,fadeFar:ee.bg*.75,grain:t.length?.5:1}}strew(t,n){const s=this.strewSrc,o=s?`${s.sceneId}:${t}:${n}:${s.slots.length}`:"";if(o===this.strewKey||(this.strewKey=o,this.strewn.forEach(r=>r.dispose()),this.strewn=[],!s))return;const a=r=>s.colours[ya(s.slots,r)]??this.footTint;for(const r of In({...s,grass:t,bushes:n}))for(const i of new Set(r.picks.map(c=>c.file))){const c=s.tex.get(i),m=r.clumps.filter(h=>r.picks[h.pick].file===i);c&&m.length&&this.strewn.push(sr(this.scene,c,r.picks,m,a,this.hazeTint,i))}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:Vn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=r=>this.built.some(i=>i.handle.mesh===r),o=[],a=[...this.scene.multiPick(t,n,s)??[]].sort((r,i)=>r.distance-i.distance);for(const r of a){const i=this.built.find(m=>m.handle.mesh===r.pickedMesh),c=r.getTextureCoordinates();!i||!c||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||Se(i.asset)&&(r.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:c.x,v:c.y})}return o}pickBackdrops(t,n){const s=r=>this.bands.find(i=>i.handle.mesh===r),o=r=>this.built.find(i=>i.handle.mesh===r&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,r=>!!s(r)||!!o(r))??[]].sort((r,i)=>r.distance-i.distance).flatMap(r=>{const i=r.getTextureCoordinates();if(!i)return[];const c=s(r.pickedMesh);if(c)return[{band:c.index,asset:c.asset,u:i.x,v:i.y}];const m=o(r.pickedMesh);return[{index:m.index,asset:m.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(m=>m.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),a=1/this.engine.getRenderHeight(),r=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(m=>B.Project(m,Oe.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=r.map(m=>m.x*o),c=r.map(m=>m.y*a);return{x0:Math.min(...i),y0:Math.min(...c),x1:Math.max(...i),y1:Math.max(...c),z:n.handle.mesh.position.z}}cameraAlive=!0;calm=!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;faded=new Set;fadedTo=1;fadeLayers(t,n){this.faded=new Set(t),this.fadedTo=n}groundHeightAt(t){return Vt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?Se(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,Oe.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>dr*Math.min(1,Math.max(0,(Nn-o)/(Nn-mr)));this.gridMeshes=n.pieces.map((o,a)=>{const r=o.lines.map(m=>m.map(([h,v])=>new B(h,Vt(v,t),v))),i=o.lines.map(m=>m.map(([,h])=>new is(n.rgb[0],n.rgb[1],n.rgb[2],s(h)))),c=ut.CreateLineSystem(`grid-${a}`,{lines:r,colors:i,useVertexAlpha:!0},this.scene);return c.isPickable=!1,c.setEnabled(!this.gridOff),c.alphaIndex=Xe(o.z)+fr,c.material.depthFunction=be.ALWAYS,c.material.disableDepthWrite=!0,c}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,Oe.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new B(.55,-1,-.3).normalize();depthLine(t){return{...kt(this.look,t),tint:this.hazeTint}}paper(){return Tn(this.look)}async loadBands(t,n){const s=[];for(const[o,a]of(t.set.groundBands??[]).entries()){const r=Pe(n,{asset:a.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await He(ve(n,r,a),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${a.src??r.file} did not load`);continue}const c=Bn(r,a,i),m=ps(a.z),h=m*c.h/c.w,v=Cn(c,i,m,h,1,this.scene);v.material.depthFunction=be.ALWAYS,v.mesh.position.set(0,0,a.z),v.mesh.alphaIndex=Xe(a.z),s.push({handle:v,z:a.z,w:m,h,skyline:Ht.get(ve(n,c,a))??.5,index:o,asset:c,band:a})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?jo(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??ms,le(this.look,"housePitch")):0}pose(t,n,s,o){const a=Zt(t,n),r=qt(a.cam,a.t,Xt(t)),i=o?aa(r,o.t,o):r,c=this.cameraAlive&&!this.calm?Xo(t.camera_motion,s):{x:0,y:0,roll:0};this.camera.position.set(i.x+c.x,i.y+c.y,i.z),this.camera.fov=i.fov;const m=le(this.look,"housePitch");this.camera.rotation.x=m*Math.PI/180,this.camera.rotation.z=((i.roll??0)+c.roll)*Math.PI/180,this.ground.follow(this.camera.position);const h=p=>le(this.look,p);this.ground.live({detail:h("groundDetail"),vary:h("groundVary"),mixTile:h("groundMix"),tileScale:h("groundScale"),wash:h("groundWash"),grainSize:h("groundGrain")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Ba(m,this.engine.getAspectRatio(this.camera),h("nearFar")),span:ur,tileable:!!this.nearAsset?.tileable_x}:null);const v=this.engine.getRenderHeight(),k=Tn(this.look),w=le(this.look,"bandHeight"),g=this.horizonOf(t),y=Uo(g,this.strip);this.land=y,this.poseGrid(y);const T=bn(t);this.bands.forEach(p=>{const A=Wo(p.band,n,w,p.w,p.h,p.skyline,T);p.z=A.z,p.handle.mesh.scaling.set(A.sx,A.sy,1),p.handle.mesh.position.set(A.x,A.y,A.z),p.handle.mesh.alphaIndex=A.alphaIndex;const x=Mt(v,A.z-R.z,fe(R.fov));p.handle.setOpacity(A.opacity),p.handle.setBottomFade(Math.min(1,le(this.look,"bandFade")/A.h)),p.handle.setPaper(k,nt(A.w,A.h,1,x,v)),p.handle.setLine(kt(this.look,"bg"),1,nt(A.w,A.h,1,x,v),this.hazeTint),p.handle.setMotion(Mn(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.strew(le(this.look,"grass"),le(this.look,"horizonBushes")),this.strewn.forEach(p=>p.update(s,le(this.look,"grassSway"),y,this.camera.position,1)),this.smoke.forEach(p=>p.update(s,le(this.look,"smoke"))),this.birds.update(s,le(this.look,"birds"));for(const p of this.built){const A=we(p.layer,n),x=Ne(p.asset,{...p.layer,x:A.x,y:A.y,z:A.z,scale:1,rotation:A.rotation},p.order,g,y);p.handle.mesh.position.x=x.x;const S=p.asset.layer==="bg"&&!p.asset.tileable_x?(x.z-R.z)/Math.max(.1,p.builtZ-R.z):1;p.handle.mesh.position.y=p.flat?Vo:Se(p.asset)?vs(x.z,w,x.h*A.scale,p.skyline??0)+x.y:R.y+(x.y-R.y)*S,p.handle.mesh.position.z!==x.z&&(p.handle.mesh.position.z=x.z,p.flat||(p.handle.mesh.alphaIndex=x.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=tt(x.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(x.z)),p.cast&&(p.cast.mesh.alphaIndex=tt(x.alphaIndex))),p.handle.mesh.rotation.z=-x.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(A.scale/p.builtScale*S);const V=A.opacity*(this.faded.has(p.index)?this.fadedTo:1);p.handle.setOpacity(V),p.handle.setFeather(ca(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-x.y)/(x.h*A.scale));const j=Mt(v,x.z-i.z,this.camera.fov),N=kt(this.look,p.layer.depth);p.handle.setPaper(k,nt(x.w*A.scale,x.h*A.scale,x.uRepeat,Mt(1080,x.z-R.z,fe(R.fov)),1080)),p.handle.setLine(N,p.ink===void 0?1:Ia(p.ink,N.ink,N.norm),nt(x.w*A.scale,x.h*A.scale,x.uRepeat,j,v),this.hazeTint),p.stain?.setOpacity((p.layer.shadow??yt)*V),p.cast?.setOpacity(le(this.look,"castShadow")*((p.layer.shadow??yt)/yt)*V);const Z=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":Et.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive(Oa(this.look,Z,this.sunDir.x,this.footTint)),p.handle.setMotion(Mn(p.asset,p.layer)),p.handle.material.setFloat("time",s),Ae(p.asset)&&p.handle.setCell(Ua(p.asset,Fs(p.asset,p.layer.play,n)))}}}const ve=(e,t,n)=>n?.src??e.base+t.file,Bn=(e,t,n)=>{if(!t.src)return e;if(!e.w||!e.h)return{...e,src:t.src};const{width:s,height:o}=n.getSize(),a=s/(Ae(e)?e.cols:1),r=o/(Ae(e)?e.rows:1);return{...e,w:a,h:r,height_m:e.height_m*(r/e.h),src:t.src}},Vn=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),ur=1.3,dr=.35,fr=.001,mr=40,Nn=120,Un=110,pr=900,gr=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),$n=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),Et=["mid","fg","near"],xr=16/9,vr=.92;function yr(e,t,n,s){const{cam:o,t:a}=Zt(e,s),r=qt(o,a,Xt(e)),i=ee[t.depth],c=i-r.z;if(c<=.5)return null;const m=we(t,s),h=(m.x-.5)*me(i),v=Math.tan(r.fov/2),k=(h-r.x)/(c*v*xr),w=-dt*Math.PI/180,g=Math.tan(Math.atan2(n*m.scale-r.y,c)-w)/v;return Math.abs(k)>vr?null:{x:(k+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const wr={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},Hn=new Set(["large","small","tall","long","short","fallen"]),br=new Set(["tree","shrub"]),Qt=e=>e.charAt(0).toUpperCase()+e.slice(1),kr=(e,t)=>wr[e]?.[t?1:0]??e;function Mr(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const a=o.length>1&&br.has(o[0])?o.slice(1):o,r=a.filter(c=>Hn.has(c)),i=a.filter(c=>!Hn.has(c));return Qt([...r,...i].map(c=>kr(c,n)).join(" "))}const Gn=e=>Qt(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),Is=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ye(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&Is(s);if(o)return Gn(o);if(e.figure)return Gn(e.figure);if(s)return Mr(s,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?Qt(String(a)):""}function Sr(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const Er=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function Ar(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>Er.has(t))?"leaf":"photo"}const Ze=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?Is(e):null,Wn=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function De(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:Wn(e,"pose:")??t?.[1]??null,facing:Wn(e,"facing:")??(t?.[2]?"left":"right")}}const Bs=e=>e.find(t=>De(t).pose==="stand"&&De(t).facing==="right")??e[0];function Vs(e){const t=new Map,n=[];for(const s of e??[]){const o=Ze(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const r={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,r),n.push(r)}const a=t.get(o);a.members=[...a.members,s],a.count=a.members.length}return n.map(s=>s.series?{...s,asset:Bs(s.members)}:s)}const _r=(e,t)=>{const n=Ze(t);return n?(e??[]).filter(s=>Ze(s)===n):t?[t]:[]},zr=e=>Vs(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function Fr(e,t,n){const s=(e??[]).filter(r=>Ze(r)===n);if(!s.length)return null;const o=De(t),a=(r,i)=>s.find(c=>De(c).pose===r&&De(c).facing===i);return a(o.pose,o.facing)??a("stand",o.facing)??Bs(s)}const Tr=24,At=e=>e?.src??e?.file;function Lr(e){const t=new Map,n=(s,o=!1)=>{if(t.has(s))return;t.set(s,"loading");const a=new Image;a.onload=()=>{try{const r=document.createElement("canvas");r.width=a.naturalWidth,r.height=a.naturalHeight;const i=r.getContext("2d",{willReadFrequently:!0});i.drawImage(a,0,0),t.set(s,{w:r.width,h:r.height,data:i.getImageData(0,0,r.width,r.height).data})}catch{t.set(s,"failed")}},a.onerror=()=>t.set(s,"failed"),a.src=o?s:e+s};return{prime(s){s.forEach(o=>At(o)&&n(At(o),!!o.src))},opaque(s,o,a,r){const i=At(s),c=t.get(i);if(c==="failed")return!0;if(!c||c==="loading")return i&&n(i,!!s.src),!1;const m=s.kind==="animation"?Math.max(1,s.cols??1):1,h=s.kind==="animation"?Math.max(1,s.rows??1):1,v=c.w/m,k=c.h/h,w=Math.min(v-1,Math.max(0,Math.floor(o*v))),g=Math.min(k-1,Math.max(0,Math.floor(a*k)));return(Number.isInteger(r)?[[Math.floor(r/m)%h,r%m]]:Array.from({length:h*m},(T,p)=>[Math.floor(p/m),p%m])).some(([T,p])=>c.data[(Math.floor(T*k+g)*c.w+Math.floor(p*v+w))*4+3]>Tr)}}}const ae={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,gs],[80,Kt]]},Cr=e=>e<=12?1:e<=40?5:20,Pr=e=>Cr(e)/4;function jn(e,t=0){const n=typeof t=="function"?t:()=>t,s=m=>[e.origin[0]+m*e.dir[0],e.origin[2]+m*e.dir[2]],o=m=>e.origin[1]+m*e.dir[1]-(ae.z+n(s(m)[1]));if(!(e.dir[2]>0))return null;const a=(Kt*Or-e.origin[2])/e.dir[2],r=Math.sign(o(0));if(r===0)return un(ae,s(0));let i=0,c=null;for(let m=1;m<=Yn;m++){const h=a*m/Yn;if(Math.sign(o(h))!==r){c=h;break}i=h}if(c===null)return null;for(let m=0;m<Dr;m++){const h=(i+c)/2;Math.sign(o(h))===r?i=h:c=h}return un(ae,s(c))}const Or=4,Yn=400,Dr=30;function Wt(e){const t=Pr(Lt(ae,e)[1]);return Lt(ae,ro(e,t))}const jt=(e,t)=>[(e-.5)*me(t),t],ht=([e,t])=>({x:Math.round((.5+e/me(t))*1e4)/1e4,z:t});function en([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function Rr([e,t],n,s=[0,0]){const[[,o],[,a]]=ae.cells,r=Math.max(.1,t-s[1]),i=Math.min(a,Math.max(o,s[1]+r/Math.max(.01,n)));return Lt(ae,en([e,t],i,s))}const Ir=[[gs,12,2],[12,40,10],[40,Kt,40]],Br=20;function Vr(){return Ir.flatMap(([e,t,n],s)=>{const o=n*Br,a=[];let r=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const c={...ae,cells:[[-o,r],[o,i]]},m=io(c,n,Math.max(1,Math.round(i-r))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===i:i>r);a.push({z:i,lines:m.map(h=>h.map(v=>lo(ae,v).slice(0,2)))}),r=i}return a})}const Kn=-1,Xn=2,Nr=4,Ur=(e,t)=>{const n=e.findIndex(s=>s.index===t);return n<0?{hit:e[0]??null,next:null}:{hit:e[n],next:e.length>1?e[(n+1)%e.length].index:null}},$r=(e,t)=>{const n=e.find(s=>s.index===t)?.box;return n?e.filter(({index:s,box:o})=>s!==t&&o&&o.z<n.z&&o.x0<n.x1&&o.x1>n.x0&&o.y0<n.y1&&o.y1>n.y0).map(s=>s.index):[]};function Hr({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:a,onGround:r=()=>!1,byDistance:i=()=>!1,groundUnder:c=()=>null,footY:m=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:k=()=>!1}){let w=null,g=null,y=!1;const T="#38bdf8",p=document.createElement("div");p.dataset.stage25dSelection="",p.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${T};z-index:3;`;const A=document.createElement("div");A.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${T};pointer-events:none;`,p.appendChild(A);const x=document.createElement("div");x.dataset.rotateHandle="1",x.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",p.appendChild(x);const V=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([M,_])=>{const F=document.createElement("div");return F.dataset.scaleHandle="1",F.style.cssText=ao(M,_),p.appendChild(F),F});t.appendChild(p),n()?.setGrid?.(Vr(),Gr(t,"--color-neutral"));const j=document.createElement("div");j.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(j);const N=M=>{const _=H();if(!_||M===null){j.style.display="none";return}const F=t.getBoundingClientRect(),O=e.getBoundingClientRect();Object.assign(j.style,{display:"block",left:`${_.left+_.width/2+O.left-F.left}px`,top:`${_.top+_.height+O.top-F.top}px`}),j.textContent=`${s(M,"z").toFixed(2)} m`},Z=M=>{const _=e.getBoundingClientRect();return{x:M.clientX-_.left,y:M.clientY-_.top}},U=(M,_)=>(n()?.pickLayers(M,_)??[]).filter(F=>o.opaque(F.asset,F.u,F.v,F.index)),Q=(M,_)=>{w=M,_&&M!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${M}`}})),G()},H=()=>{const M=w===null?null:n()?.layerBox(w);if(!M)return null;const _=e.getBoundingClientRect();return{left:M.x0*_.width,top:M.y0*_.height,width:(M.x1-M.x0)*_.width,height:(M.y1-M.y0)*_.height,z:M.z}},G=()=>{const M=H();if(!M){p.style.display="none";return}const _=e.getBoundingClientRect(),F=t.getBoundingClientRect();Object.assign(p.style,{display:"block",left:`${M.left+_.left-F.left}px`,top:`${M.top+_.top-F.top}px`,width:`${M.width}px`,height:`${M.height}px`})},b=(M,_,F)=>Math.min(F,Math.max(_,M)),P=M=>{if(M.button!==0)return;const{x:_,y:F}=Z(M),{hit:O,next:q}=Ur(U(_,F),w);if(!O){k(_,F)&&M.stopPropagation();return}M.stopPropagation(),Q(O.index,!0);const K=n().layerBox(O.index),ne=r(O.index),oe=H();g={mode:"move",index:O.index,z:K.z,from:n().worldXAt(_,F,K.z),x0:s(O.index,"x"),id:M.pointerId,el:e,next:q,pressed:[M.clientX,M.clientY],ground:ne,start:[_,F],foot:oe?[oe.left+oe.width/2,oe.top+oe.height]:[_,F],lift:ne?m(O.index):0},e.setPointerCapture?.(M.pointerId)},te=M=>_=>{if(_.button!==0||w===null)return;const F=H();if(!F)return;_.stopPropagation(),_.preventDefault();const O=e.getBoundingClientRect(),q=F.left+F.width/2,K=F.top+F.height/2,{x:ne,y:oe}={x:_.clientX-O.left,y:_.clientY-O.top};g={mode:M,index:w,cx:q,cy:K,id:_.pointerId,el:_.currentTarget,d0:Math.max(8,Math.hypot(ne-q,oe-K)),a0:Math.atan2(oe-K,ne-q),scale0:s(w,"scale"),rotation0:s(w,"rotation"),byDistance:M==="scale"&&i(w),p0:jt(s(w,"x"),s(w,"z")),eye:h()},_.currentTarget.setPointerCapture?.(_.pointerId)},W=M=>{const{x:_,y:F}=Z(M);if(g?.mode==="move"&&g.ground){const O=c(g.foot[0]+_-g.start[0],g.foot[1]+F-g.start[1],g.lift,g.index);if(!O)return;const q=ht(Wt(O));a(g.index,"x",b(q.x,Kn,Xn)),a(g.index,"z",q.z),N(g.index);return}if(g?.mode==="move"){const O=(n().worldXAt(_,F,g.z)-g.from)/me(g.z);a(g.index,"x",Math.round(b(g.x0+O,Kn,Xn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const O=Math.hypot(_-g.cx,F-g.cy)/g.d0*g.scale0,q=Wt(Rr(g.p0,O,g.eye))[1],K=ht(en(g.p0,q,g.eye));g.scale0!==1&&a(g.index,"scale",1),a(g.index,"x",K.x),a(g.index,"z",K.z),N(g.index);return}if(g?.mode==="scale"){const O=Math.hypot(_-g.cx,F-g.cy);a(g.index,"scale",Math.round(b(g.scale0*(O/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let O=g.rotation0+(Math.atan2(F-g.cy,_-g.cx)-g.a0)*180/Math.PI;M.shiftKey&&(O=Math.round(O/15)*15),a(g.index,"rotation",Math.round(O*10)/10);return}y||(y=!0,requestAnimationFrame(()=>{y=!1,e.style.cursor=U(_,F).length?"pointer":""}))},re=M=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const _=g.index,F=g.mode==="move"&&g.ground||g.byDistance,O=g.next!=null&&Math.hypot(M.clientX-g.pressed[0],M.clientY-g.pressed[1])<Nr?g.next:null;g=null,j.style.display="none",F&&v(_),O!==null&&Q(O,!0)},D=M=>{w!==null&&M.detail?.id!==`s25_layer-${w}`&&(w=null,G())};e.addEventListener("pointerdown",P);for(const M of[e,...V,x])M.addEventListener("pointermove",W),M.addEventListener("pointerup",re),M.addEventListener("pointercancel",re);return V.forEach(M=>M.addEventListener("pointerdown",te("scale"))),x.addEventListener("pointerdown",te("rotate")),window.addEventListener("scene-object-selected",D),{select:(M,_=!1)=>Q(M,_),get selected(){return w},place:G,destroy(){window.removeEventListener("scene-object-selected",D),p.remove(),n()?.setGrid?.(null),j.remove()}}}function Gr(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const tn=["x","y","z","scale","rotation","opacity","keys","figure","play"],se=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},_t=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!tn.includes(t))),Zn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{},{camera:a,camera_more:r,camera_motion:i,...c}=e??{};return JSON.stringify({...c,set:{...o,layers:t.map(_t),groundBands:n.map(_t),skyLayer:_t(s)}})},zt=e=>tn.map(t=>e?.[t]??null),Ft=e=>JSON.stringify([(e?.set?.layers??[]).map(zt),(e?.set?.groundBands??[]).map(zt),zt(e?.set?.skyLayer),e?.camera??null,e?.camera_more??[],e?.camera_motion??null]),qn={x:[-8,8],y:[.3,6],z:[-4,15],fov:[20,75]},Wr=[-45,45],jr=10,Jn=.01,Yr=.01,Qn=(e,[t,n])=>Math.min(n,Math.max(t,e)),es=e=>Math.round(e*1e3)/1e3,ge=e=>{const t={...R,...e},n=Object.fromEntries(Object.keys(qn).map(o=>[o,es(Qn(Number(t[o])||R[o],qn[o]))])),s=es(Qn(Number(t.roll)||0,Wr));return s?{...n,roll:s}:n},Kr=(e,t,n,s)=>{const o=ge(e),a=2*jr*Math.tan(fe(o.fov)/2)/Math.max(1,s);return ge({...o,x:o.x-t*a,y:o.y+n*a})},Xr=(e,{deltaX:t=0,deltaY:n=0,ctrlKey:s=!1})=>{const o=ge(e);return ge(s?{...o,fov:o.fov*Math.exp(n*Yr)}:{...o,z:o.z-n*Jn,x:o.x+t*Jn})},Ns=.001,Zr=(e,t,n)=>{const s=[];for(const o of[e,...t??[]].filter(Boolean)){const a=Number(o.at_s)||0,r=(m,h)=>{const v=s.findIndex(k=>Math.abs(k.t-m)<Ns);v>=0?s[v]={t:m,pose:h}:s.push({t:m,pose:h})},i=ge(o.from??R),c=ge(o.to??o.from??R);r(a,i),(Number(o.dur_s)||JSON.stringify(i)!==JSON.stringify(c))&&r(a+(Number(o.dur_s)||Math.max(0,n-a)),c)}return s.sort((o,a)=>o.t-a.t)},Us=(e,t)=>e.filter(n=>Math.abs(n.t-t)>=Ns),ot=(e,t,n)=>[...Us(e,t),{t,pose:ge(n)}].sort((s,o)=>s.t-o.t),qr=(e,t)=>e.reduce((n,s)=>Math.abs(s.t-t)<Math.abs(n.t-t)?s:n,e[0]),Jr=e=>{const t=(n,s,o,a)=>({move:"framed",ease:"inOut",at_s:o,...a?{dur_s:a}:{},from:n,to:s});return e.length<2?e.map(n=>t(n.pose,n.pose,0)):e.slice(0,-1).map((n,s)=>t(n.pose,e[s+1].pose,n.t,e[s+1].t-n.t))},Qr=(e,t,n,s)=>{const{cam:o,t:a}=Zt({camera:e,camera_more:t},n),r=qt(o,Math.max(0,a),s);return ge({x:r.x,y:r.y,z:r.z,fov:r.fov*180/Math.PI,roll:r.roll})},ei={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},ti={nl:"Camera",de:"Kamera",fr:"Caméra",it:"Telecamera"},ts=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch","groundWash","groundGrain","grass","grassSway","horizonBushes"],ni=e=>e.cutout?"cutouts":Ae(e)?"vfx":e.layer;let Ce=null;const $s=()=>{if(Ce)return Ce;try{Ce=JSON.parse(document.querySelector("[data-stage25d-cutouts]")?.dataset.stage25dCutouts||"[]")}catch{Ce=[]}return Ce},ns=(e,t=$s())=>{if(!t.length)return e;const n=new Set(t.map(s=>s.id));return{...e,assets:[...e.assets.filter(s=>!n.has(s.id)),...t]}};typeof window<"u"&&window.addEventListener("cutouts-changed",e=>{const t=e.detail?.stage;t?.id&&(Ce=[t,...$s().filter(n=>n.id!==t.id)],window.dispatchEvent(new CustomEvent("stage25d-cutouts")))});const ss=e=>Ae(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,os="application/x-lp-stage25d",at=new Map,Tt=new Map,si=.8,oi=e=>(Tt.has(e)||Tt.set(e,Lr(e)),Tt.get(e));function ai(e){return at.has(e)||at.set(e,ra(oo(e)).catch(t=>{throw at.delete(e),t})),at.get(e)}const ri=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],camera_motion:e.camera_motion??null,figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function vi(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,a=null,r=null,i=new Map,c=new Map,m=0,h=null,v=0,k=0,w=performance.now(),g=!1,y=[],T=[],p={},A=new Set,x=null,S=null;const V=l=>Ae(l)?null:l.cutout?S.base+l.file:S.base+"thumbs/"+l.file;let j=null,N=null,Z={},U=null,Q=0,H=null,G=[],b=null,P=!1;const te=()=>{S&&(S=ns(S),i=new Map(S.assets.map(l=>[l.id,l])),window.dispatchEvent(new CustomEvent("stage25d-synced")))};window.addEventListener("stage25d-cutouts",te);const W=()=>{s.engine.runRenderLoop(()=>{const l=performance.now();k+=Math.min(.1,(l-w)/1e3),w=l,s.tick(l),U&&(s.fadeLayers(O(),si),s.cameraAlive=Q===0&&(P||!!window.__timelineKeying?.playing?.())),o&&s.pose(o,ue(),k),s.scene.render(),U?.place()})},re=()=>{if(!o||!s)return;const l=(u,d)=>A.has(d)?{...u,opacity:0,keys:[]}:u;o={...o,set:{...o.set,groundBands:T.map((u,d)=>l(u,`band-${d}`)),skyLayer:p,layers:y.map((u,d)=>l(u,`layer-${d}`))}},s.rebind(o)},D=l=>{const u=/^band-(\d+)$/.exec(String(l??""));return u&&T[Number(u[1])]?Number(u[1]):-1},M=l=>l==="sky"?r?.set?.sky?{...p,depth:"sky"}:null:D(l)>=0?{...T[D(l)],depth:"bg"}:y[se(l)]??null,_=(l,u)=>{let d=null;if(l==="sky"&&r?.set?.sky){if(u.motion===void 0)return null;p={...p,motion:u.motion},d={skyLayer:{motion:u.motion}}}else if(D(l)>=0){const f=D(l);T=T.map((E,z)=>z===f?{...E,...u}:E),d={band:{index:f,...u}}}else if(y[se(l)]){const f=se(l);y=y.map((E,z)=>z===f?{...E,...u}:E),d=f}return d===null?null:(x=F(),re(),d)},F=()=>Ft({set:{layers:y,groundBands:T,skyLayer:p},camera:H,camera_more:G,camera_motion:b}),O=()=>{const l=U?.selected??null;return l===null||Q>0||window.__timelineKeying?.playing?.()?[]:$r(y.map((u,d)=>({index:d,box:A.has(`layer-${d}`)?null:s.layerBox(d)})),l)},q=()=>o?Xt(o):8,K=()=>Zr(H,G,q()),ne=()=>Qr(H,G,ue(),q()),oe=l=>{const[u=null,...d]=Jr(l);H=u,G=d,o&&(o={...o,camera:H,camera_more:G}),x=F(),L.sceneId!=null&&t.onCommit?.(0,{camera:H,camera_more:G},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},ft=l=>{if(!o)return;const u=ue(),d=K();if(window.__timelineKeying?.autoKey?.()||!d.length){const f=!d.length&&u>0?ot(d,0,ne()):d;return oe(ot(f,u,l))}oe(ot(d,qr(d,u).t,l))},Hs=()=>{let l=null;const u=f=>{f.preventDefault(),f.stopImmediatePropagation()};n.addEventListener("pointerdown",f=>{P&&(u(f),n.setPointerCapture?.(f.pointerId),l={x:f.clientX,y:f.clientY,pose:ne()},n.style.cursor="grabbing")},{capture:!0}),n.addEventListener("pointermove",f=>{P&&(u(f),l&&ft(Kr(l.pose,f.clientX-l.x,f.clientY-l.y,n.getBoundingClientRect().height)))},{capture:!0});const d=f=>{l&&(u(f),l=null,n.style.cursor=P?"grab":"")};n.addEventListener("pointerup",d,{capture:!0}),n.addEventListener("pointercancel",d,{capture:!0}),n.addEventListener("wheel",f=>{P&&(u(f),ft(Xr(ne(),f)))},{capture:!0,passive:!1}),window.addEventListener("scene-object-selected",f=>{f.detail?.id!=="s25_camera"&&L.frameCamera(!1)})},_e=()=>({...r.set,layers:y,groundBands:T,skyLayer:p}),mt=(l,u)=>{const d=_(l,u);d===null||L.sceneId==null||(typeof d=="number"?t.onCommit?.(d,u,L.sceneId):t.onCommit?.(0,d,L.sceneId))},ue=()=>h?h():m,pt=()=>r?.set?.sky&&S?i.get(r.set.sky)??Pe(S,{asset:r.set.sky},"sky"):null,ze=l=>{const u=i.get(y[l]?.asset);return!!(y[l]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&y[l].depth!=="sky")},Gs=l=>l==="sky"||D(l)>=0,nn=(l,u)=>{const d=s?.pickBackdrops?.(l,u).find(E=>!A.has(E.band!==void 0?`band-${E.band}`:`layer-${E.index}`)&&j.opaque(E.asset,E.u,E.v)),f=d?d.band!==void 0?`band-${d.band}`:`layer-${d.index}`:r?.set?.sky?"sky":null;return f&&L.select(f),!!f},sn=(l,u)=>Se(u)||ys(l,u),on=l=>{const u=i.get(y[l]?.asset);return!!u&&sn(y[l],u)},Re=l=>we(y[l],ue()).z??ee[y[l].depth],Ws=l=>ze(l)&&!(y[l].keys??[]).some(u=>u.scale!==void 0),an=l=>Math.round(l*1e3)/1e3,rn=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],L={canvas:n,sceneId:null,async show(l){const u=ns(await ai(l.bundle));if(g)return;s||(s=new hr(n,u),W()),Z={...l.look??{}},s.setLook(Z);const d=ri(l);await s.build(d,u),o=d,y=d.set.layers,T=(d.set.groundBands??[]).map(f=>({...f})),p={...d.set.skyLayer??{}},H=d.camera,G=d.camera_more??[],b=d.camera_motion??null,A=new Set,x=Ft(l),r=l,i=new Map(u.assets.map(f=>[f.id,f])),S=u,j=oi(u.base),j.prime(d.set.layers.map(f=>i.get(f.asset)).filter(Boolean)),t.editable&&!U&&(n.style.pointerEvents="auto",Hs(),window.addEventListener("scene-object-selected",f=>{f.detail?.id!==`s25_${N}`&&(N=null)}),n.addEventListener("dragover",f=>{f.dataTransfer?.types?.includes(os)&&(f.preventDefault(),f.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",f=>{const E=f.dataTransfer?.getData(os);if(!E)return;f.preventDefault();const z=n.getBoundingClientRect();L.addLayer(E,{x:f.clientX-z.left,y:f.clientY-z.top})}),e.addEventListener("dblclick",f=>{const E=n.getBoundingClientRect(),z=f.clientX-E.left,I=f.clientY-E.top;if(z<0||I<0||z>E.width||I>E.height||!s)return;const C=s.pickLayers(z,I).find(xe=>j.opaque(xe.asset,xe.u,xe.v,xe.index)),X=C?`layer-${C.index}`:nn(z,I)?N:null,ie=X&&L.editTarget(X);ie&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:ie}))}),U=Hr({canvas:n,host:e,stage:()=>s,alpha:{opaque:(f,E,z,I)=>!A.has(`layer-${I}`)&&j.opaque(f,E,z,Ae(f)?Fs(f,y[I]?.play,ue()):void 0)},valueOf:(f,E)=>E==="z"?Re(f):we(y[f],ue())[E],onGround:ze,byDistance:Ws,groundUnder:(f,E,z,I)=>jn(s.pointerRay(f,E),on(I)?z:C=>s.groundHeightAt(C)+z),footY:f=>s.layerFootY(f)-(on(f)?0:s.groundHeightAt(Re(f))),eye:rn,onSettled:f=>L.settleBand(f),onEmpty:(f,E)=>nn(f,E),onChange:(f,E,z)=>L.moveLayer(`layer-${f}`,E,z)})),(U?.selected??-1)>=y.length&&U.select(null),c=new Map(u.assets.map(f=>[f.id,f.height_m??1.7])),v=Number(l.narration_at_s)||0,a=Zn(l),e.dataset.stage25dReady="1"},editTarget(l){const u=l==="sky"?r?.set?.sky?p:null:D(l)>=0?T[D(l)]:y[se(l)],d=l==="sky"?pt():i.get(u?.asset);return!u||!d||!S?null:{id:`s25_${l}`,title:L.items().find(f=>f.id===l)?.label??ye({},d,(document.documentElement.lang||"en").slice(0,2)),original:u.src?new URL(u.src,location.href).href:S.base+d.file,from:u.src?null:{bundle:S.bundle,asset:d.id},edited:!!u.src,el:e}},matches:l=>a===Zn(l),adopt(l){const u=Ft(l);if(u===x)return!1;x=u;const d=(f,E)=>{const z={...f};for(const I of tn)E?.[I]===void 0?delete z[I]:z[I]=E[I];return z};return y=y.map((f,E)=>d(f,l.set?.layers?.[E])),T=T.map((f,E)=>d(f,l.set?.groundBands?.[E])),p=d(p,l.set?.skyLayer),H=l.camera??null,G=l.camera_more??[],b=l.camera_motion??null,o=o&&{...o,camera:H,camera_more:G,camera_motion:b},r=l,re(),!0},setLayerProp(l,u,d){_(l,{[u]:d})},setLayerKeys(l,u){const d=M(l);d&&JSON.stringify(d.keys??[])!==JSON.stringify(u)&&_(l,{keys:u})},commitLayerProp(l,u,d){mt(l,{[u]:d})},readLayerProp(l,u){const d=M(l),f=d?u==="z"&&se(l)>=0?Re(se(l)):u==="z"?we(d,ue()).z??d.z:we(d,ue())[u]:null;return Number.isFinite(f)?f:null},setHidden(l,u){se(l)<0&&D(l)<0||(A=new Set(u?[...A,l]:[...A].filter(d=>d!==l)),re())},update(l){h=null,m=Math.max(0,l)},play(l){h=()=>v+l()},moveLayer(l,u,d){window.__timelineKeying?.edit?.(`s25:${l}`,u,d,{flush:!1})||L.commitLayerProp(l,u,d)},select(l){if(l==="camera"){N=null,U?.select(null),L.frameCamera(!0),window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_camera"}}));return}L.frameCamera(!1),N=Gs(l)?l:null,U?.select(se(l)>=0?se(l):null,!N),N&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${N}`}}))},get skySelected(){return N==="sky"},get backdrop(){return N},get selection(){return U?.selected??null},clearSelection(){U?.select(null),L.frameCamera(!1)},frameCamera(l){P=!!l,n.style.cursor=P?"grab":"",window.dispatchEvent(new CustomEvent("stage25d-edited"))},cameraInfo:()=>({moves:!!H,keys:K(),pose:ne(),motion:{kind:"none",amount:1,speed:1,...b}}),setCameraMotion(l){b={kind:"none",amount:1,speed:1,...b,...l},o&&(o={...o,camera_motion:b}),x=F(),L.sceneId!=null&&t.onCommit?.(0,{cameraMotion:b},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},setCameraValue(l,u){ft({...ne(),[l]:u})},toggleCameraKey(){const l=ue(),u=K(),d=Us(u,l);oe(d.length<u.length?d:ot(u,l,ne()))},resetCamera(){oe([])},atStart(){return m===0&&h===null&&A.size===0&&!P},layerInfo(l){const u=(C,X)=>{const ie=typeof C.motion=="string"?{kind:C.motion}:C.motion??{};return{kind:ie.kind??bs(X),amount:ie.amount??1,speed:ie.speed??1}};if(l==="sky"){const C=pt();return C?{id:l,asset:C.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:ye({},C,(document.documentElement.lang||"en").slice(0,2)),file:p.src??`${S.base}${C.file}`,motion:u(p,C)}:null}if(D(l)>=0){const C=T[D(l)],X=i.get(C.asset);return{id:l,asset:C.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:L.items().find(ie=>ie.id===l)?.label??"",file:C.src??(X?`${S.base}${X.file}`:null),motion:u(C,X)}}const d=y[se(l)];if(!d)return null;const f=i.get(d.asset)??null,E=ze(se(l)),z=!E||(d.scale??1)!==1||(d.keys??[]).some(C=>C.scale!==void 0),I=f?.layer==="bg"&&!f.tileable_x;return{id:l,asset:d.asset??null,depth:d.depth,figure:d.figure??null,role:f?.layer??null,ground:E,showScale:z,fields:E?["x","z",...z?["scale"]:[],"rotation","opacity"]:["x",...I?["z"]:[],"y","scale","rotation","opacity"],label:L.items().find(C=>C.id===l)?.label??ye(d,f,(document.documentElement.lang||"en").slice(0,2)),file:d.src??(f?`${S.base}${f.file}`:null),motion:u(d,f),anim:ss(f),play:{speed:d.play?.speed??1,offset:d.play?.offset??0}}},setLayerPlay(l,u){const d=M(l);d&&mt(l,{play:{...d.play??{},...u}})},setLayerMotion(l,u){const d=M(l);d&&mt(l,{motion:{...typeof d.motion=="object"?d.motion:{kind:d.motion},...u}})},reorderLayers(l,u,d){if(!ze(u)){d(l,u,L.sceneId,null,null,null);return}const f=ke=>y[ke]?.z??ee[y[ke]?.depth],E=l.filter(ke=>ke===u||ze(ke)),z=E.indexOf(u),I=E[z-1],C=E[z+1],X=Re(u),ie=I===void 0?0:f(I),xe=C===void 0?1/0:f(C);if((I!==void 0||C!==void 0)&&(X<ie||X>xe)){const ke=jt(we(y[u],ue()).x,X),js=I===void 0?xe/1.25:C===void 0?ie*1.25:(ie+xe)/2,Je=Math.round(Math.min(ae.cells[1][1],Math.max(ae.cells[0][1],js))*100)/100,gt=rn(),Ys=(Je-gt[1])/Math.max(.1,X-gt[1]),ln=de=>an(Math.min(20,Math.max(.01,de*Ys))),Ks=y[u].keys?.some(de=>de.z!==void 0||de.scale!==void 0)?y[u].keys.map(de=>({...de,...de.z!==void 0&&{z:Math.min(ae.cells[1][1],Math.max(ae.cells[0][1],an(de.z+Je-X)))},...de.scale!==void 0&&{scale:ln(de.scale)}})):null;d(l,u,L.sceneId,ht(en(ke,Je,gt)).x,Je,ln(y[u].scale??1),Ks);return}d(l,u,L.sceneId,y[u].x??.5,f(u),y[u].scale??1)},library(){if(!S)return null;const l=(document.documentElement.lang||"en").slice(0,2);return{bundle:S.bundle,assets:S.assets.filter(u=>u.kind!=="sheet").map(u=>({id:u.id,layer:u.layer,shelf:ni(u),anim:ss(u),band:Nt(u),tags:u.tags??[],url:S.base+u.file,thumb:V(u),label:ye({},u,l)}))}},tiles:l=>Vs(l),seriesOfLayer(l){const u=i.get(y[se(l)]?.asset),d=Ze(u);if(!d||!S)return null;const f=(document.documentElement.lang||"en").slice(0,2),E=z=>({id:z.id,url:S.base+z.file,thumb:V(z),...De(z)});return{series:d,asset:u.id,members:_r(S.assets,u).map(E),characters:zr(S.assets).map(z=>({series:z.series,url:S.base+z.asset.file,thumb:V(z.asset),label:ye({},z.asset,f)}))}},async switchCharacter(l,u){const d=i.get(y[se(l)]?.asset),f=d&&S?Fr(S.assets,d,u):null;f&&await L.swapAsset(l,f.id)},async swapAsset(l,u){if(l==="sky"){if(i.get(u)?.layer!=="sky"||pt()?.id===u)return;await L.show({...r,set:{..._e(),sky:u}}),L.sceneId!=null&&t.onCommit?.(0,{sky:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const d=T[D(l)];if(d){const E=i.get(u);if(!E||!Nt(E)||d.asset===u)return;const z=Number(l.slice(5)),I=T.map((C,X)=>X===z?{...C,asset:u}:C);await L.show({...r,set:{..._e(),groundBands:I}}),L.sceneId!=null&&t.onCommit?.(0,{band:{index:z,asset:u}},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L.select(l);return}const f=se(l);f<0||!y[f]||!i.has(u)||y[f].asset===u||(y=y.map((E,z)=>z===f?{...E,asset:u}:E),await L.show({...r,set:_e()}),t.onCommit?.(f,{asset:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(l,u=null){const d=i.get(l);if(!d)return;const f=["mid","fg","near","bg","sky"].includes(d.layer)?d.layer:d.layer==="figure"?"fg":"mid",E=u?0:y.filter(I=>I.asset===l).length;let z={asset:l,depth:f,x:.5+.08*(E%5),scale:1};if(!(d.tileable_x||d.layer==="bg"||d.layer==="sky")){const I=u&&s?jn(s.pointerRay(u.x,u.y),sn({},d)?0:X=>s.groundHeightAt(X)):null,C=ht(Wt(I??jt(z.x,ee[f])));z={...z,...C,depth:vn(C.z)}}y=[...y,z],await L.show({...r,set:_e()}),t.onCommit?.(y.length-1,{add:z},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),U?.select(y.length-1,!0)},async settleBand(l){const u=y[l];if(!u||!ze(l))return;const d=vn(Re(l));if(d===u.depth)return;y=y.map((E,z)=>z===l?{...E,depth:d}:E);const f=A;await L.show({...r,set:_e()}),A=f,re(),L.sceneId!=null&&t.onCommit?.(l,{depth:d},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),U?.select(l,!1)},groundSlots(){if(!S||!r)return null;const l=(document.documentElement.lang||"en").slice(0,2),u=Ss(r.set??{},S).map(f=>({asset:f.asset.id,from_m:f.from})),d=S.assets.filter(f=>f.layer==="ground").map(f=>({id:f.id,label:ye({},f,l),thumb:V(f)}));return{rows:u,options:d,max:$t}},async setGroundSlots(l){if(!r||!Array.isArray(l))return;const u=l.slice(0,$t).map((f,E)=>({asset:String(f.asset),from_m:E===0?0:Math.max(0,Math.min(2e3,Number(f.from_m)||0))})),d=A;await L.show({...r,look:Z,set:{..._e(),groundSlots:u}}),A=d,re(),L.sceneId!=null&&t.onGroundSlots?.(u,L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},lookControls(){return ts.map(l=>{const[u,d,f]=Ra[l]??[0,1,.01];return{key:l,min:u,max:d,step:f,value:le({...Gt,...Z},l)}})},setLook(l,u){!ts.includes(l)||!Number.isFinite(u)||!s||(Z={...Z,[l]:u},s.setLook(Z),t.onLook?.(l,u,L.sceneId))},async still(l=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const d=document.createElement("canvas");return d.width=l,d.height=Math.max(1,Math.round(l*n.height/n.width)),d.getContext("2d").drawImage(n,0,0,d.width,d.height),d.toDataURL("image/jpeg",.72)};return s.engine.resize(),Q++,s.gridHidden=!0,new Promise(d=>{let f=0;const E=C=>{s.engine.onEndFrameObservable.remove(z),clearTimeout(I),s.gridHidden=--Q>0,d(C)},z=s.engine.onEndFrameObservable.add(()=>{++f>=6&&E(u())}),I=setTimeout(()=>E(null),4e3)})},get config(){return r},figureBox(l){const u=y.find(z=>z.figure===l);if(!u?.asset)return null;const d=yr(o,u,c.get(u.asset)??1.7,ue());if(!d)return null;const f=n.getBoundingClientRect(),E=f.width*.05;return new DOMRect(f.left+d.x*f.width-E/2,f.top+d.y*f.height,E,f.height*.08)},items:()=>{const l=(document.documentElement.lang||"en").slice(0,2),u=Sr([...y.map((d,f)=>ye(d,i.get(d.asset),l)||`layer ${f+1}`),...T.map(d=>ye({},i.get(d.asset)??{id:d.asset},l))]);return[...y.map((d,f)=>({id:`layer-${f}`,label:u[f],icon:Ar(i.get(d.asset)),depth:d.depth,z:d.z??ee[d.depth],keys:d.keys??[]})),...T.map((d,f)=>({id:`band-${f}`,label:u[y.length+f],icon:"photo",depth:"bg",z:d.z,keys:d.keys??[],backdrop:!0})),...r?.set?.sky?[{id:"sky",label:ei[l]??"Sky",icon:"cloud",depth:"sky",keys:p.keys??[],backdrop:!0}]:[],{id:"camera",label:ti[l]??"Camera",icon:"camera",depth:null,keys:[]}]},destroy(){g=!0,window.removeEventListener("stage25d-cutouts",te),delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}U?.destroy(),n.remove()}};return L}export{os as DROP_TYPE,ts as LOOK_KEYS,vi as createStage25d,ri as stageScene,ns as withCutouts};
