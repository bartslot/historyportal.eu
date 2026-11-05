import{m as Xs,c as Zs,M as ft,S as Je,R as ls,C as be,T as ge,V,E as ue,a as qt,b as De,P as Js,d as dn,e as fn,f as cs,g as Qs,h as eo,i as to,j as hs,U as no,H as so,D as oo}from"./babylon-cwcfcxi_.js";import{l as ao}from"./config-DwQUN7uY.js";import{handleCss as ro}from"./ArtworkOverlay-Bif1GXJm.js";import{g as Ct,c as io,w as mn,h as lo,e as co}from"./projection-CL24asTn.js";import"./vite-helpers-DqutJMZx.js";import"./draw-options-UPmwm5Hg.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-BWtOpziC.js";import"./ambient-CEzLlAaX.js";import"./alpha-mask-C1RIm4VB.js";const je=new Set;let Pt=!1;function ho(e,t,n=2){const s=t&&t.length,o=s?t[0]*n:e.length;je.size&&je.clear();let a=us(e,0,o,n,!0);const r=[];if(!a||a.next===a.prev)return r;let i=0,c=0,f=0;if(s&&(a=go(e,t,a,n)),e.length>80*n){i=e[0],c=e[1];let h=i,x=c;for(let k=n;k<o;k+=n){const w=e[k],g=e[k+1];w<i&&(i=w),g<c&&(c=g),w>h&&(h=w),g>x&&(x=g)}f=Math.max(h-i,x-c),f=f!==0?32767/f:0}return Ot(a,r,i,c,f),r}function us(e,t,n,s,o){let a=null;if(o===Fo(e,t,n,s)>0)for(let r=t;r<n;r+=s)a=xn(r/s|0,e[r],e[r+1],a);else for(let r=n-s;r>=t;r-=s)a=xn(r/s|0,e[r],e[r+1],a);return a&&Ye(a,a.next)&&(qe(a),a=a.next),a}function Ee(e,t=e){const n=t===e;let s=e,o;do o=!1,s!==s.next&&(je.size===0||!je.has(s))&&(Ye(s,s.next)||q(s.prev,s,s.next)===0)?((n||s===t)&&(t=s.prev),Pt=!0,qe(s),s=s.prev,o=!0):(n||s!==t)&&(s=s.next,o=!n);while(o||s!==t);return t}function Ot(e,t,n,s,o){o&&Mo(e,n,s,o);let a=e,r=!1;for(;e.prev!==e.next;){const i=e.prev,c=e.next;if(q(i,e,c)<0&&(o?fo(e,n,s,o):uo(e))){t.push(i.i,e.i,c.i),qe(e),e=c,a=c;continue}if(e=c,e===a){if(Pt=!1,e=Ee(e),Pt){a=e;continue}if(!r){e=mo(e,t),a=e,r=!0;continue}po(e,t,n,s,o);break}}}function uo(e){const t=e.prev,n=e,s=e.next,o=t.x,a=n.x,r=s.x,i=t.y,c=n.y,f=s.y,h=Math.min(o,a,r),x=Math.min(i,c,f),k=Math.max(o,a,r),w=Math.max(i,c,f);let g=s.next;for(;g!==t;){if(g.x>=h&&g.x<=k&&g.y>=x&&g.y<=w&&!(o===g.x&&i===g.y)&&ht(o,i,a,c,r,f,g.x,g.y)&&q(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function fo(e,t,n,s){const o=e.prev,a=e,r=e.next,i=o.x,c=a.x,f=r.x,h=o.y,x=a.y,k=r.y,w=Math.min(i,c,f),g=Math.min(h,x,k),v=Math.max(i,c,f),T=Math.max(h,x,k),p=Bt(w,g,t,n,s),A=Bt(v,T,t,n,s);let y=e.prevZ;for(;y&&y.z>=p;){if(y.x>=w&&y.x<=v&&y.y>=g&&y.y<=T&&y!==r&&!(i===y.x&&h===y.y)&&ht(i,h,c,x,f,k,y.x,y.y)&&q(y.prev,y,y.next)>=0)return!1;y=y.prevZ}let S=e.nextZ;for(;S&&S.z<=A;){if(S.x>=w&&S.x<=v&&S.y>=g&&S.y<=T&&S!==r&&!(i===S.x&&h===S.y)&&ht(i,h,c,x,f,k,S.x,S.y)&&q(S.prev,S,S.next)>=0)return!1;S=S.nextZ}return!0}function mo(e,t){let n=e,s=!1;do{const o=n.prev,a=n.next.next;ms(o,n,n.next,a,!1)&&Ke(o,a)&&Ke(a,o)&&(t.push(o.i,n.i,a.i),qe(n),qe(n.next),n=e=a,s=!0),n=n.next}while(n!==e);return s?Ee(n):n}function po(e,t,n,s,o){let a=e;do{let r=a.next.next;for(;r!==a.prev;){if(a.i!==r.i&&Ao(a,r)){let i=ps(a,r);a=Ee(a,a.next),i=Ee(i,i.next),Ot(a,t,n,s,o),Ot(i,t,n,s,o);return}r=r.next}a=a.next}while(a!==e)}let Dt=!1;function go(e,t,n,s){const o=[];for(let a=0,r=t.length;a<r;a++){const i=t[a]*s,c=a<r-1?t[a+1]*s:e.length,f=us(e,i,c,s,!1);f===f.next&&je.add(f),o.push(Eo(f))}o.sort(xo),vo(e.length/s,t.length),fs(n,n),Dt=!0;for(let a=0;a<o.length;a++)n=yo(o[a],n);return Dt=!1,Ee(n)}function xo(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function yo(e,t){const n=bo(e,t);if(!n)return t;const s=ps(n,e),o=s.next;return fs(n,o.next),Ee(s,s.next),Ee(n,n.next)}const ds=16;let j=new Float64Array(0),ct=0;const Rt=[],It=[];function vo(e,t){const n=Math.ceil((e+2*t)/ds)+t+2;j.length<n*4&&(j=new Float64Array(n*4)),ct=0}function fs(e,t){let n=e;do{const s=ct++;Rt[s]=n;let o=1/0,a=1/0,r=-1/0,i=-1/0,c=0;do{const h=n.next;n.z=s,n.x<o&&(o=n.x),n.x>r&&(r=n.x),n.y<a&&(a=n.y),n.y>i&&(i=n.y),h.x<o&&(o=h.x),h.x>r&&(r=h.x),h.y<a&&(a=h.y),h.y>i&&(i=h.y),n=h}while(++c<ds&&n!==t);It[s]=n;const f=s*4;j[f]=o,j[f+1]=a,j[f+2]=r,j[f+3]=i}while(n!==t)}function wo(e,t){const n=e.z*4;t.x<j[n]&&(j[n]=t.x),t.y<j[n+1]&&(j[n+1]=t.y),t.x>j[n+2]&&(j[n+2]=t.x),t.y>j[n+3]&&(j[n+3]=t.y)}function pn(e){let t=It[e];for(;t.prev.next!==t;)t=t.next;return It[e]=t,t}function gn(e){let t=Rt[e];for(;t.prev.next!==t;)t=t.next;return Rt[e]=t,t}function bo(e,t){let n=t;const s=e.x,o=e.y;let a=-1/0,r;if(Ye(e,n))return n;for(let k=0,w=0;k<ct;k++,w+=4){if(o<j[w+1]||o>j[w+3]||j[w]>s||j[w+2]<=a)continue;const g=pn(k);n=gn(k);do{if(n.prev.next===n){if(Ye(e,n.next))return n.next;if(o<=n.y&&o>=n.next.y&&n.next.y!==n.y){const v=n.x+(o-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(v<=s&&v>a&&(a=v,r=n.x<n.next.x?n:n.next,v===s))return r}}n=n.next}while(n!==g)}if(!r)return null;const i=r.x,c=r.y,f=Math.min(o,c),h=Math.max(o,c);let x=1/0;for(let k=0,w=0;k<ct;k++,w+=4){if(j[w+2]<i||j[w]>s||j[w+3]<f||j[w+1]>h)continue;const g=pn(k);n=gn(k);do{if(n.prev.next===n&&s>=n.x&&n.x>=i&&s!==n.x&&ht(o<c?s:a,o,i,c,o<c?a:s,o,n.x,n.y)){const v=Math.abs(o-n.y)/(s-n.x);(Ke(n,e)||n.y===o&&n.next.y===o&&n.next.x>s)&&(v<x||v===x&&(n.x>r.x||n.x===r.x&&ko(r,n)))&&(r=n,x=v)}n=n.next}while(n!==g)}return r}function ko(e,t){return q(e.prev,e,t.prev)<0&&q(t.next,e,e.next)<0}const he=[];let Ie=[],Me=new Uint32Array(0),Be=new Uint32Array(0);const Ve=new Uint32Array(256);function Mo(e,t,n,s){let o=e,a=0;do o.z=Bt(o.x,o.y,t,n,s),he[a++]=o,o=o.next;while(o!==e);So(a);let r=null;for(let i=0;i<a;i++){const c=he[i];c.prevZ=r,r&&(r.nextZ=c),r=c}r.nextZ=null}function So(e){if(e<=32){for(let t=1;t<e;t++){const n=he[t],s=n.z;let o=t-1;for(;o>=0&&he[o].z>s;)he[o+1]=he[o],o--;he[o+1]=n}return}Me.length<e&&(Me=new Uint32Array(e),Be=new Uint32Array(e),Ie=new Array(e));for(let t=0;t<e;t++)Me[t]=he[t].z;tt(e,he,Me,Ie,Be,0),tt(e,Ie,Be,he,Me,8),tt(e,he,Me,Ie,Be,16),tt(e,Ie,Be,he,Me,24)}function tt(e,t,n,s,o,a){Ve.fill(0);for(let i=0;i<e;i++)Ve[n[i]>>>a&255]++;let r=0;for(let i=0;i<256;i++){const c=Ve[i];Ve[i]=r,r+=c}for(let i=0;i<e;i++){const c=n[i],f=Ve[c>>>a&255]++;s[f]=t[i],o[f]=c}}function Bt(e,t,n,s,o){return e=(e-n)*o|0,t=(t-s)*o|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function Eo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function ht(e,t,n,s,o,a,r,i){return(o-r)*(t-i)>=(e-r)*(a-i)&&(e-r)*(s-i)>=(n-r)*(t-i)&&(n-r)*(a-i)>=(o-r)*(s-i)}function Ao(e,t){const n=Ye(e,t)&&q(e.prev,e,e.next)>0&&q(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Ke(e,t)&&Ke(t,e)&&(q(e.prev,e,t.prev)!==0||q(e,t.prev,t)!==0))&&!_o(e,t)&&(n||zo(e,t))}function q(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Ye(e,t){return e.x===t.x&&e.y===t.y}function ms(e,t,n,s,o=!0){const a=q(e,t,n),r=q(e,t,s),i=q(n,s,e),c=q(n,s,t);return(a>0&&r<0||a<0&&r>0)&&(i>0&&c<0||i<0&&c>0)?!0:o?!!(a===0&&nt(e,n,t)||r===0&&nt(e,s,t)||i===0&&nt(n,e,s)||c===0&&nt(n,t,s)):!1}function nt(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function _o(e,t){const n=Math.min(e.x,t.x),s=Math.max(e.x,t.x),o=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let r=e;do{const i=r.next;if(r.x>s&&i.x>s||r.x<n&&i.x<n||r.y>a&&i.y>a||r.y<o&&i.y<o){r=i;continue}if(r.i!==e.i&&i.i!==e.i&&r.i!==t.i&&i.i!==t.i&&ms(r,i,e,t))return!0;r=i}while(r!==e);return!1}function Ke(e,t){return q(e.prev,e,e.next)<0?q(e,t,e.next)>=0&&q(e,e.prev,t)>=0:q(e,t,e.prev)<0||q(e,e.next,t)<0}function zo(e,t){let n=e,s=!1;const o=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const r=n.next;n.y>a!=r.y>a&&o<(r.x-n.x)*(a-n.y)/(r.y-n.y)+n.x&&(s=!s),n=r}while(n!==e);return s}function ps(e,t){const n=Vt(e.i,e.x,e.y),s=Vt(t.i,t.x,t.y),o=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=o,o.prev=n,s.next=n,n.prev=s,a.next=s,s.prev=a,s}function xn(e,t,n,s){const o=Vt(e,t,n);return s?(o.next=s.next,o.prev=s,s.next.prev=o,s.next=o):(o.prev=o,o.next=o),o}function qe(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),Dt&&wo(e.prev,e.next)}function Vt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function Fo(e,t,n,s){let o=0;for(let a=t,r=n-s;a<n;a+=s)o+=(e[r]-e[a])*(e[a+1]+e[r+1]),r=a;return o}Object.assign(window,{BABYLON:{...Zs,...Xs},earcut:ho});(()=>{const e=`
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
    }`})();const To=new WeakMap;function Lo(e){return To.get(e)?.rtt??null}const Co=450,yn=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],vn=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],wn={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},Po={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function Oo(e,t,n){const s=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),o=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),r=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(y=>y.name!=="sky-cloud"&&!(y.metadata&&y.metadata.noGBuffer)))}),i=a.getGBuffer().textures,c=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],f=i[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=y=>new BABYLON.Vector2(1/y.width,1/y.height),x=new BABYLON.Matrix,k=["invView","tanHalf","resolution","skyDepth"],w=["depthSampler","normalSampler"];function g(y,S){t.getViewMatrix().invertToRef(x);const U=Math.tan(t.fov/2);y.setMatrix("invView",x),y.setVector2("tanHalf",new BABYLON.Vector2(U*S.width/S.height,U)),y.setVector2("resolution",new BABYLON.Vector2(S.width,S.height)),y.setFloat("skyDepth",Co),y.setTexture("depthSampler",c),y.setTexture("normalSampler",f)}const v=new BABYLON.PostProcess("wash","wash",["texel","radius",...k],w,1,t);v.onApply=y=>{g(y,v),y.setVector2("texel",h(v)),y.setFloat("radius",n.num("wash"))};const T=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...yn,...k],["aquarelSampler",...w],1,t);T.onApply=y=>{g(y,T),y.setVector2("texel",h(T));const S=n.texture();y.setFloat("useTex",S?1:0),y.setTexture("aquarelSampler",S||s),yn.forEach(U=>y.setFloat(U,n.num(U)))};const p=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...vn,...k],["washSampler","animeSampler",...w],1,t);p.onApply=y=>{g(y,p),y.setTextureFromPostProcessOutput("washSampler",v),y.setTexture("animeSampler",Lo(e)||o),y.setVector2("texel",h(p)),vn.forEach(S=>y.setFloat(S,n.num(S))),y.setColor3("inkColor",BABYLON.Color3.FromArray(wn[n.inkColor()]||wn["blue-grey"]))};const A=[v,T,p];return{dispose(){A.forEach(y=>y.dispose(t)),e.onBeforeRenderObservable.remove(r),e.disableGeometryBufferRenderer(),s.dispose(),o.dispose()}}}const se={sky:380,bg:70,mid:22,fg:7,near:3.5},I={x:0,y:1.6,z:0,fov:50},mt=-2,gs=16/9,xs=.42,yt=1.6,Do=3,ys=e=>Do*me(e),Ro=(e,t)=>t*e,Io=(e,t,n,s)=>Ro(e,t)-(1-s)*n,Xe=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Bo=999,Vo=1e3,No=.02,vs=2,Xt=120,ws=.05,fe=e=>e>Math.PI?e*Math.PI/180:e,me=(e,t=I.fov,n=gs)=>2*e*Math.tan(fe(t)/2)*n;function bn(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const kn=e=>e.z??se[e.depth],Uo=e=>Math.min(1,Math.max(0,(e-se.mid)/(se.bg-se.mid)));function Nt(e,t){return e<=se.bg||t===0?Uo(e)*t:I.y+(t-I.y)*e/se.bg}const $o=(e,t)=>t?e+t.h*(1-t.top):e,Ho=["ground","path","field","ramp","water"],Se=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Ho.includes(t)),Go=2,Ut=e=>Se(e)&&e.w/Math.max(1,e.h)>=Go,bs=(e,t,n,s)=>Math.min(0,Io(e,t,n,s)),Mn=[2,2e3],Wo=4,Sn=e=>[e.camera,...e.camera_more??[]].reduce((t,n)=>Math.max(t,n?.from?.z??I.z,n?.to?.z??I.z),I.z);function jo(e,t,n,s,o,a,r=I.z){const i=pe({...e},t),c=Math.min(Mn[1],Math.max(Mn[0],i.z??e.z)),f=Math.max(c,r+Wo),h=ys(f)/s,x=o*h*i.scale;return{z:f,h:x,w:s*h*i.scale,sx:h*i.scale,sy:h*i.scale,x:(i.x-.5)*me(f),y:bs(f,n,x,a),alphaIndex:Xe(c),opacity:i.opacity}}const ks=(e,t)=>!!e.flat||t.layer==="ground";function Ne(e,t,n,s=0,o=s){const a=t.depth,r=kn(t)-n*ws,i=me(r),c=a==="sky"?n*2+1:Xe(r);if(e.layer==="sky"){const T=i*yt,p=T/gs,A=-p*.12+(t.y??0);if(e.tileable_x)return{x:0,y:A,z:r,w:T,h:p,uRepeat:T/(p*(e.w/e.h)),alphaIndex:c,rotation:0};const y=Math.max(T/e.w,p/e.h);return{x:0,y:A,z:r,w:e.w*y,h:e.h*y,uRepeat:1,alphaIndex:c,rotation:0}}const f=e.layer==="bg"&&!e.tileable_x?i*yt*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),f),x=h*(e.w/e.h),k=e.tileable_x?Math.max(x,i*yt):x,w=e.tileable_x?0:((t.x??.5)-.5)*i,g=e.layer==="bg"?a==="bg"?s:0:Se(e)?0:Nt(kn(t),o),v=a==="sky"?r*Math.tan(fe(I.fov)/2)*.45:g;return{x:w,y:v+(t.y??0),z:r,w:k,h,uRepeat:e.tileable_x?k/x:1,alphaIndex:c,rotation:t.rotation??0}}function Yo(e,t,n=0,s=xs,o=mt){const a=.5/Math.tan(fe(I.fov)/2),r=.5+a*Math.tan(-o*Math.PI/180),i=se.bg-n*ws,c=I.y+(r-s)*i/a;return Math.round((c-t*(1-e))*10)/10}const st=e=>e-Ko,Ko=.002,En={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},Ms=(e,t)=>(En[e??"inOut"]??En.inOut)(Math.min(1,Math.max(0,t))),Le=(e,t,n)=>e+(t-e)*n,Zt=e=>e.dur_s??(e.camera&&oa(e)||e.est_s||8);function Jt(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),s=[...n].reverse().find(o=>(o.at_s??0)<=t)??n[0]??null;return{cam:s,t:s?t-(s.at_s??0):t}}function Qt(e,t,n){if(!e)return{...I,fov:fe(I.fov)};const s=Ms(e.ease,n>0?t/(e.dur_s??n):1),o={...I,...e.from},a={...o,...e.to};return{x:Le(o.x,a.x,s),y:Le(o.y,a.y,s),z:Le(o.z,a.z,s),fov:Le(fe(o.fov),fe(a.fov),s),roll:Le(o.roll??0,a.roll??0,s)}}const qo={sway:{x:.08,y:.05,roll:1.6,hz:.18},handheld:{x:.02,y:.02,roll:.25,hz:.35},shake:{x:.05,y:.05,roll:.6,hz:6}},vt=(e,t)=>(Math.sin(e*1+t)+.6*Math.sin(e*2.17+t*2.3)+.3*Math.sin(e*3.71+t*4.1))/1.9;function Xo(e,t){const n=e?.kind;if(!n||n==="none")return{x:0,y:0,roll:0};const s=qo[n],o=e.amount??1,a=t*s.hz*(e.speed??1)*2*Math.PI;return{x:s.x*o*vt(a,1),y:s.y*o*vt(a,2),roll:s.roll*o*vt(a,3)}}const Zo=["x","y","z","scale","opacity","rotation"];function pe(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},s=e.keys??[];if(!s.length)return n;const o={...n};for(const a of Zo){const r=s.filter(k=>k[a]!==void 0).sort((k,w)=>k.t-w.t);if(!r.length)continue;const i=r[0],c=r[r.length-1];if(t<=i.t){o[a]=i[a];continue}if(t>=c.t){o[a]=c[a];continue}const f=r.findIndex(k=>k.t>t),h=r[f-1],x=r[f];o[a]=Le(h[a],x[a],Ms("inOut",(t-h.t)/(x.t-h.t)))}return o}const Jo={none:0,sway:1,drift:2,ripple:3,flicker:4,breathe:5},Ss=e=>e?.layer==="figure"&&(e.motion??"none")==="none"?"breathe":e?.motion??"none";function An(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??Ss(e),amount:n.amount??1,speed:n.speed??1}}const Qo=.25,ea=2e3,ta=250,Te={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},_n={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function na(e,t,n,s){const o=i=>{const c=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:c,lastUp:i===-1?n:e.lastUp,locked:e.locked||c>=Te.lockFlips&&i===1}};if(t<Te.downFps)return s?o(1):{...e,fast:0};if(t<Te.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=Te.upWindows&&n-e.lastChange>=Te.upAfterChangeMs&&n-e.lastUp>=Te.upEveryMs?o(-1):{...e,fast:a}}function sa(e,t,n,s){const o=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),o-s*Qo)}function oa(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const zn={breath_m:.05,breath_s:7},aa=1.5;function ra(e,t,n={}){const s=n.breath_m??zn.breath_m,o=2*Math.PI/Math.max(.5,n.breath_s??zn.breath_s),a=Math.min(1,t/aa),r=a*a*(3-2*a);return{...e,x:e.x+s*r*Math.sin(o*t),y:e.y+s*.5*r*Math.sin(2*o*t)}}async function ia(e){const t=await fetch(e,{cache:"no-cache"});if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const la=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Oe(e,t,n){if(t.asset){const r=e.assets.find(i=>i.id===t.asset);if(r)return r}const s=la(t.need??t.asset??"");if(!s.length)return null;let o=null,a=[0,0,0];for(const r of[...e.assets].sort((i,c)=>i.id.localeCompare(c.id))){const i=s.filter(f=>r.tags.some(h=>h.toLowerCase()===f)).length;if(!i)continue;const c=[i,n&&r.layer===n?1:0,r.qa?.score??0];(!o||c[0]>a[0]||c[0]===a[0]&&(c[1]>a[1]||c[1]===a[1]&&c[2]>a[2]))&&(o=r,a=c)}return o}const Ce="#f6f5ee",ca=.22,ha=(e,t)=>e.layer==="bg"?t.feather??ca:0,wt=.6,$t=12;function Es(e,t){const n=t.paper??Ce,s=e.ground;if(s&&s.startsWith("#"))return{kind:"paper",colour:s};const o=t.assets.filter(r=>r.layer==="ground");if(!s)return o.length?{kind:"asset",asset:[...o].sort((r,i)=>r.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const a=Oe({...t,assets:o},{asset:s},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${s}`}}function ua(e,t,n,s=.08){return As(e,t,n,1-s,1)}function As(e,t,n,s,o){const a=Math.max(0,Math.floor(n*s)),r=Math.min(n,Math.max(a+1,Math.ceil(n*o))),i=[[],[],[]],c=Math.max(1,Math.floor(t*(r-a)/2e4));for(let h=a*t;h<r*t;h+=c){const x=h*4;e[x+3]<200||(i[0].push(e[x]),i[1].push(e[x+1]),i[2].push(e[x+2]))}if(!i[0].length)return null;const f=h=>{const x=[...h].sort((k,w)=>k-w);return x[x.length>>1]/255};return[f(i[0]),f(i[1]),f(i[2])]}const We=32,da=(e,t,n)=>Array.from({length:We},(s,o)=>As(e,t,n,o/We,(o+1)/We)),fa=(e,t)=>e[Math.min(We-1,Math.max(0,Math.floor((1-t)*We)))]??null;function ma(e,t,n){const s=[],o=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=o){const r=a*4;if(e[r+3]<230)continue;const i=(.299*e[r]+.587*e[r+1]+.114*e[r+2])/255;i<.45&&s.push(i)}return s.length<20?null:(s.sort((a,r)=>a-r),s[s.length>>1])}function pa(e,t,n){const s=[];for(let o=0;o<t;o++)for(let a=0;a<n;a++)if(e[(a*t+o)*4+3]>128){s.push(a/n);break}return s.length?(s.sort((o,a)=>o-a),s[s.length>>1]):0}function ga(e,t,n){for(let s=0;s<n;s++){let o=0;for(let a=0;a<t;a++)e[(s*t+a)*4+3]>128&&o++;if(o/t>.5)return s/n}return 0}const xa=1.6,ya=.12;function Fn(e,t,n,s){const o=e.layer==="figure",a=o?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),r=a*ya*s/xa;return o?{w:a,d:Math.min(r,a*.5)}:{w:a,d:Math.min(Math.max(r,a*.3),a*3)}}const va=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Ue=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Ht=6;function _s(e,t){const n=t.assets.filter(a=>a.layer==="ground"),s=(e.groundSlots??[]).map(a=>({asset:n.find(r=>r.id===a.asset),from:Math.max(0,Number(a.from_m)||0)})).filter(a=>!!a.asset).sort((a,r)=>a.from-r.from).slice(0,Ht);if(s.length)return s.map((a,r)=>r===0?{...a,from:0}:a);const o=Es(e,t);return o.kind==="asset"?[{asset:o.asset,from:0}]:[]}const wa=(e,t)=>Math.max(0,e.reduce((n,s,o)=>t>=s.from?o:n,0)),en=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,zs=en;ue.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;const ba=[1,2,3,4,5].map(e=>`
    if (slotCount > ${e}.5) { float k${e} = smoothstep(slotFrom[${e}] * 0.85, slotFrom[${e}] * 1.15 + 0.5, dn); c = mix(c, slotTile(tex${e}, slotTiles[${e}]), k${e}); own = mix(own, slotColour[${e}], k${e}); }`).join("");ue.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, tex1, tex2, tex3, tex4, tex5, nearTex;
  uniform float useTex, grain, fadeNear, fadeFar, detail, vary, mixTile, tileScale, wash, grainSize, slotCount;
  uniform float slotFrom[6], slotTiles[6];
  uniform vec3 slotColour[6];   // each slot's own median colour: its far floor fades into it, not into one tint
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${en}
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
      c = slotTile(tex, slotTiles[0]); own = slotColour[0];${ba}
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
  }`;ue.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ue.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed, etch, aspect;
  ${en}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    vec3 colour = vec3(0.27, 0.23, 0.18);
    // etched: the same shape in ink strokes, as many across whatever the size, denser toward the foot
    if (etch > 0.0) {
      vec2 q = vec2(vUV.x, vUV.y * aspect) * 16.0;
      float t = q.x + q.y + 0.9 * fbm(q * 0.35 + seed);
      float body = 1.0 - smoothstep(0.25, 1.0, r);
      float wid = 0.08 + 0.32 * body;
      float stroke = 1.0 - smoothstep(wid, wid + 0.12, abs(fract(t) - 0.5));
      float gap = smoothstep(0.25, 0.4, fbm(vec2((q.x - q.y) * 0.5, floor(t) * 3.1 + seed)) + 0.4 * body);
      a = mix(a, stroke * gap * step(0.02, body) * min(1.0, opacity * 1.6), etch);
      colour = mix(colour, vec3(0.05, 0.045, 0.04), etch);
    }
    gl_FragColor = vec4(colour * a, a);
  }`;const ka=e=>e?ge.WRAP_ADDRESSMODE:ge.MIRROR_ADDRESSMODE;function Ma(e){const t=ft.CreateGround("ground",{width:2400,height:2400},e),n=new Je("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tileScale","wash","grainSize","slotCount","slotFrom","slotTiles","slotColour","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","tex1","tex2","tex3","tex4","tex5","nearTex"],needAlphaBlending:!0}),s=new ls(new Uint8Array([255,255,255,255]),1,1,be.TEXTUREFORMAT_RGBA,e);for(const o of $e)n.setTexture(o,s);return n.setTexture("nearTex",s),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0).setFloat("tileScale",1).setFloat("wash",.5).setFloat("grainSize",1),t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Bo,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(o){const a=o.slots.slice(0,$e.length);a.forEach(i=>{i.tex.wrapU=ge.WRAP_ADDRESSMODE,i.tex.wrapV=ge.WRAP_ADDRESSMODE}),$e.forEach((i,c)=>n.setTexture(i,a[c]?.tex??s));const r=(i,c)=>$e.map((f,h)=>a[h]?i(a[h]):c);n.setFloat("useTex",a.length?1:0).setFloat("slotCount",a.length).setFloats("slotFrom",r(i=>i.from,1e6)).setFloats("slotTiles",r(i=>i.tile||$t,$t)).setArray3("slotColour",$e.flatMap((i,c)=>a[c]?.colour??o.base)).setFloat("grain",o.grain).setFloat("fadeNear",o.fadeNear).setFloat("fadeFar",o.fadeFar).setVector3("base",V.FromArray(o.base)).setVector3("horizonTint",V.FromArray(o.tint))},follow(o){n.setVector3("camPos",o)},live(o){n.setFloat("detail",o.detail).setFloat("vary",o.vary).setFloat("mixTile",o.mixTile).setFloat("tileScale",o.tileScale).setFloat("wash",o.wash).setFloat("grainSize",o.grainSize)},near(o){n.setFloat("useNear",o?1:0),o&&(o.tex.wrapU=ka(o.tileable),o.tex.wrapV=ge.CLAMP_ADDRESSMODE,n.setTexture("nearTex",o.tex).setMatrix("nearVP",o.vp).setFloat("nearTop",o.top).setFloat("nearSpan",o.span))}}}const $e=["tex","tex1","tex2","tex3","tex4","tex5"];let Sa=0;function Tn(e,t,n,s,o){const a=ft.CreatePlane(`stain${o?"-cast":""}:${e.name}`,{width:t,height:o?o.length:n},s);if(a.rotation.x=Math.PI/2,o){const[i,c]=o.dir,f=Math.hypot(i,c)||1;a.rotation.y=Math.atan2(i/f,c/f),a.position.set(i/f*o.length*.42,.015,c/f*o.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const r=new Je(a.name,s,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed","etch","aspect"],needAlphaBlending:!0});return r.alphaMode=be.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,r.setFloat("seed",Sa++*7.31%97).setFloat("opacity",0).setFloat("etch",0).setFloat("aspect",(o?o.length:n)/Math.max(t,.01)),a.material=r,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:i=>{r.setFloat("opacity",i),a.isVisible=i>.001},setEtch:i=>{r.setFloat("etch",i)}}}ue.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;ue.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${zs}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;ue.ShadersStore.stageBirdFragmentShader=`
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
  }`;function Fs(e,t,n,s){const o=ft.CreatePlane(e,{size:1},n),a=new Je(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=be.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,o.material=a,o.billboardMode=qt.BILLBOARDMODE_ALL,o.alphaIndex=s,o.metadata={noGBuffer:!0},o.isPickable=!1,{mesh:o,mat:a}}const Ts=9,Ea=9;function Aa(e,t,n,s){const o=Array.from({length:Ts},(a,r)=>{const i=Fs(`smoke:${r}`,"stagePuff",e,s);return i.mat.setFloat("seed",r*3.7),i});return{update(a,r){o.forEach(({mesh:i,mat:c},f)=>{const h=_a(a,f),x=n*(.6+3.2*h);i.scaling.setAll(x),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(f*2.1+a*.3),t.y+n*(.4+7*h),t.z),c.setFloat("alpha",r*.7*Math.sin(Math.PI*h)),i.isVisible=r>.001})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const _a=(e,t)=>((e/Ea+t/Ts)%1+1)%1,bt=40,Ln=16;function za(e){const t=(e%bt+bt)%bt;return t<Ln?t/Ln:null}function Fa(e,t,n,s){const o=Array.from({length:6},(a,r)=>Fs(`bird:${r}`,"stageBird",e,s));return{update(a,r){const i=za(a),c=Math.round(2+r*4);o.forEach(({mesh:f,mat:h},x)=>{if(f.isVisible=r>.001&&i!==null&&x<c,!f.isVisible||i===null)return;const k=x*.025;f.position.set((i-k-.5)*n*1.2,22+3*Math.sin(x*1.7)+4*i,t+x*1.5),f.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,r*2)).setFloat("flap",Math.sin(a*7+x*1.3))})},dispose(){o.forEach(({mesh:a,mat:r})=>{r.dispose(),a.dispose()})}}}const Cn=["fire","hearth","chimney","smoke"],Ta=e=>e.id.split(/[-_]/).some(t=>Cn.includes(t))||e.tags.some(t=>Cn.includes(t.toLowerCase())),kt=e=>e[0].toUpperCase()+e.slice(1),La=e=>({fade:`lineFade${kt(e)}`,thin:`lineThin${kt(e)}`,haze:`haze${kt(e)}`}),ut={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:mt,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,groundWash:.5,groundGrain:1,grass:.5,grassSway:.15,horizonBushes:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},Ca=[1.05,1,.9],Pa=[.88,.93,1.05],Oa=.35;function Da(e,t,n,s){const o=t==="sky";return{edgeSoft:o?0:ee(e,"edgeSoft"),footM:t==="standing"?Oa:0,grounding:t==="figure"?0:ee(e,"grounding"),grass:t==="figure"?0:ee(e,"grassOverlap"),light:o?0:ee(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:o?ee(e,"cloudDrift"):0,footTint:s}}const Ls=[.93,.86,.74],Pn=e=>({paper:ee(e,"sheetPaper"),grain:ee(e,"sheetGrain"),patches:ee(e,"sheetPatches"),wash:ee(e,"sheetWash"),washColour:Ls}),Ra={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01],groundGrain:[.5,3,.05]},Ia=Object.fromEntries(Object.keys(ut).map(e=>[e,Ra[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ce=(e,t)=>ee(e,t),ee=(e,t)=>{const n=Number(e[t]??ut[t]);return Number.isFinite(n)?n:ut[t]};function Mt(e,t){const n=La(t);return{fade:ee(e,n.fade),thin:ee(e,n.thin),haze:ee(e,n.haze),brown:ee(e,"lineBrown"),ink:ee(e,"lineInk"),norm:ee(e,"lineNorm")}}const Ba=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),St=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),ot=(e,t,n,s,o)=>{const a=s*(1080/o);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function Va(e,t,n){const s=new V(I.x,I.y,I.z),o=De.RotationX(e*Math.PI/180),r=De.LookAtLH(s,s.add(V.TransformNormal(new V(0,0,1),o)),V.TransformNormal(V.Up(),o)).multiply(De.PerspectiveFovLH(fe(I.fov),t,.1,2e3));return{vp:r,top:V.TransformCoordinates(new V(0,0,n),r).y}}ue.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function Na(e,t){const n=new Js("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=s=>{s.setFloat("wash",t("sheetWash")).setVector3("washColour",V.FromArray(Ls))},n}const Ae=e=>e?.kind==="animation"&&(e.cols??0)>=1&&(e.rows??0)>=1,Ua=12;function Cs(e,t,n){const s=Math.max(1,e.frames??(e.cols??1)*(e.rows??1)),o=t?.speed??1,a=((t?.offset??0)+n*o)*(e.fps??Ua),r=Math.floor(a+1e-6);return e.loop===!1?Math.min(s-1,Math.max(0,r)):(r%s+s)%s}function $a(e,t){const n=e.cols??1,s=e.rows??1;return[t%n/n,Math.floor(t/n)/s,1/n,1/s]}const Ha=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Ga=`
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
  }`;ue.ShadersStore.stageLayerVertexShader=`
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
  }`;ue.ShadersStore.stageLayerFragmentShader=`
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
  uniform float outlineW, etch, width;         // the teacher's ink on this picture: 1080p px inside its edge, hatching in its shade
  ${zs}
  ${Ha}
  ${Ga}
  // a frame of a sheet is read inside its own cell only, so no tap ever reaches the next frame
  vec4 tap(vec2 p) {
    if (cell.z < 1.0 || cell.w < 1.0) return texture2D(tex, cell.xy + clamp(p, 0.0, 1.0) * cell.zw);
    return texture2D(tex, p);
  }
  // past the image's own border counts as air, so a picture cut off by its border gets a line there too
  bool past(vec2 p) { return p.x < 0.0 || p.y < 0.0 || p.x > uRepeat || p.y > 1.0; }
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
    // etched shadow: hatching on the side away from the light, hanging off the silhouette and the art's own ink lines
    if (etch > 0.0 && c.a > 0.004) {
      vec2 away = vec2(-sunSide * 0.09, 0.055 * width / max(height, 0.01));
      float shade = 0.0;
      for (int k = 1; k <= 6; k++) {
        float f = float(k) / 6.0;
        vec2 q = uv + away * f;
        vec4 n = past(q) ? vec4(0.0) : tap(q);
        float e = max(1.0 - n.a, n.a > 0.1 ? 0.6 * inkOf(n.rgb / n.a) : 0.0);
        shade = max(shade, e * (1.0 - 0.75 * f));
      }
      vec2 h = px / 5.0;
      float t = h.x + h.y + 0.6 * fbm(h * 0.18 + phase);
      float wid = 0.06 + 0.26 * shade;
      float stroke = 1.0 - smoothstep(wid, wid + 0.1, abs(fract(t) - 0.5));
      float gap = smoothstep(0.62 - 0.6 * shade, 0.7 - 0.6 * shade, fbm(vec2((h.x - h.y) * 0.35, floor(t) * 3.1)));
      c.rgb = mix(c.rgb / c.a, vec3(0.05, 0.045, 0.04), etch * stroke * gap * smoothstep(0.1, 0.35, shade)) * c.a;
    }
    // the outline: black inside the silhouette, over the art's own line, on a hard edge (no feather: it stays sharp)
    if (outlineW > 0.0) {
      float air = 0.0;
      for (int k = 0; k < 12; k++) {
        float a = float(k) * 0.5236;
        vec2 d = vec2(cos(a), sin(a)) * pxUV * outlineW;
        air = max(air, past(uv + d) ? 1.0 : 1.0 - tap(uv + d).a);
        air = max(air, past(uv + d * 0.5) ? 1.0 : 1.0 - tap(uv + d * 0.5).a);
      }
      float inside = smoothstep(0.35, 0.65, tap(uv).a);
      vec3 s = c.a > 0.004 ? c.rgb / c.a : vec3(0.0);
      c = vec4(s * (1.0 - smoothstep(0.35, 0.65, air)) * inside, inside);
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
    if (edgeSoft > 0.0 && outlineW <= 0.0) {
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
  }`;const On=new WeakMap,Ps=new Map,Os=new Map,Gt=new Map,Ds=new Map,lt=new Map;function He(e,t){const n=On.get(t)??new Map;On.set(t,n);const s=n.get(e);if(s)return s;const o=new Promise((a,r)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>r(new Error(`layer image ${e} did not load`)),i.onload=()=>{const c=document.createElement("canvas");c.width=i.naturalWidth,c.height=i.naturalHeight;const f=c.getContext("2d",{willReadFrequently:!0});f.drawImage(i,0,0);const h=f.getImageData(0,0,c.width,c.height).data,x=ua(h,c.width,c.height);x&&Ps.set(e,x),lt.set(e,da(h,c.width,c.height)),Os.set(e,ga(h,c.width,c.height)),Gt.set(e,pa(h,c.width,c.height));const k=ma(h,c.width,c.height);k!==null&&Ds.set(e,k);for(let g=0;g<h.length;g+=4){const v=h[g+3]/255;h[g]=Math.round(h[g]*v),h[g+1]=Math.round(h[g+1]*v),h[g+2]=Math.round(h[g+2]*v)}const w=new ls(h,c.width,c.height,be.TEXTUREFORMAT_RGBA,t,!0,!1,ge.TRILINEAR_SAMPLINGMODE);w.anisotropicFilteringLevel=8,w.wrapV=ge.CLAMP_ADDRESSMODE,a(w)},i.src=e});return n.set(e,o),o.catch(()=>n.delete(e)),o}const Et=24;function Wa(e,t,n,s,o){const[a,r]=t.anchor??[.5,1],i=[],c=[],f=[];for(let x=0;x<=Et;x++){const k=x/Et;for(const w of[0,1])i.push((w-a)*n,(r-k)*s,0),c.push(w,k);if(x<Et){const w=x*2;f.push(w,w+2,w+1,w+1,w+2,w+3)}}const h=new qt(e,o);return Object.assign(new cs,{positions:i,uvs:c,indices:f}).applyToMesh(h),h}let ja=0;function Dn(e,t,n,s,o,a){const r=Wa(`layer:${e.id}`,e,n,s,a),i=new Je(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour","cell","outlineW","etch"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=o!==1?ge.WRAP_ADDRESSMODE:ge.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=be.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const c=ja++*2.39996%(Math.PI*2),f=e.anchor?.[1]??1;return i.setFloat("phase",c).setFloat("height",s*f).setFloat("width",n).setFloat("uRepeat",o).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.setFloat("outlineW",0).setFloat("etch",0),i.setVector4("cell",new dn(0,0,1,1)),r.material=i,r.metadata={noGBuffer:!0,painted:!0},r.isPickable=!1,{mesh:r,material:i,setMotion:h=>{i.setFloat("kind",Jo[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),r.isVisible=h>.001},setLine:(h,x,k,w)=>{i.setFloat("inkMul",x).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new fn(k[0],k[1])).setVector3("hazeTint",V.FromArray(w))},setPaper:(h,x)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",V.FromArray(h.washColour)).setVector2("grainUV",new fn(x[0],x[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setInk:(h,x)=>{i.setFloat("outlineW",h).setFloat("etch",x)},setCell:h=>{i.setVector4("cell",new dn(h[0],h[1],h[2],h[3]))},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",V.FromArray(h.footTint)).setVector3("sunColour",V.FromArray(Ca)).setVector3("shadeColour",V.FromArray(Pa))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,x)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),x&&i.setVector3("featherTint",V.FromArray(x))}}}const Rs=600,Is=1.5,Ya=2,Ka=.8,qa=["grass","heather","reeds","shrub","bramble","juniper","hazel","meadow","fern","tree","bush","sedge","flower"],Xa=["shrub","tree","bush","bramble","hedge"],Za=["ground"];function Ja(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let n=t;return n=Math.imul(n^n>>>15,n|1),n^=n+Math.imul(n^n>>>7,n|61),((n^n>>>14)>>>0)/4294967296}}function Rn(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return t>>>0}const Qa=e=>e.layer!=="ground"&&e.layer!=="sky"&&e.layer!=="bg"&&e.layer!=="figure"&&!e.tileable_x&&!Ut(e)&&e.kind!=="animation"&&e.tags.some(t=>qa.includes(t));function er(e){const t=e.assets.filter(n=>n.kind==="sheet");return t.length?t.flatMap(n=>(n.cells??[]).map(s=>({asset:n.id,file:n.file,tags:s.tags,height_m:s.height_m,aspect:s.rect[2]*n.w/Math.max(1,s.rect[3]*n.h),cell:s.rect}))):e.assets.filter(Qa).map(n=>({asset:n.id,file:n.file,tags:n.tags,height_m:n.height_m,aspect:n.w/Math.max(1,n.h),cell:[0,0,1,1]}))}const Bs=(e,t)=>e.tags.some(n=>!Za.includes(n)&&t.includes(n)),tr=(e,t)=>e.filter(n=>n.height_m<=Is&&!n.tags.includes("tree")&&Bs(n,t)),nr=["grass","meadow","heath","field","hedge","forest","marsh","wet","edge","heather"];function sr(e,t){const n=e.filter(o=>o.height_m>Is&&o.tags.some(a=>Xa.includes(a))),s=n.filter(o=>Bs(o,t));return s.length||!t.some(o=>nr.includes(o))?s:n.filter(o=>!o.tags.includes("tree"))}function In(e){const t=Math.min(Rs,Math.max(0,Math.round(e.count)));if(!e.picks.length||!t)return[];const n=Ja(e.seed),s=Math.max(e.from,e.front+Ya),o=Math.max(s,e.to),a=[];for(let r=0;r<t;r++){const i=s*Math.pow(o/s,n()),c=Math.floor(n()*e.picks.length);a.push({z:i,x:(n()*2-1)*Ka*me(i),h:e.picks[c].height_m*(.7+.6*n())*(e.size??1),pick:c,phase:n()*Math.PI*2})}return a.sort((r,i)=>i.z-r.z)}const Vs=[...Array.from({length:16},(e,t)=>2.5*Math.pow(1.4,t+1)),1/0],Bn=e=>Vs.findIndex(t=>e<t);ue.ShadersStore.stageStrewnVertexShader=`
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
  }`;ue.ShadersStore.stageStrewnFragmentShader=`
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
  }`;function or(e,t,n,s,o,a,r){const i=new Je(`strewn:${r}`,e,"stageStrewn",{attributes:["position","quad","uv","extra"],uniforms:["viewProjection","camPos","time","sway","land","haze","opacity"],samplers:["tex"],needAlphaBlending:!0});i.alphaMode=be.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setTexture("tex",t).setVector3("haze",V.FromArray(a));const c=new Map;for(const h of s)c.set(Bn(h.z),[...c.get(Bn(h.z))??[],h]);const f=[...c].map(([h,x])=>{const k=[],w=[],g=[],v=[],T=[];x.forEach((A,y)=>{const S=n[A.pick],[U,K,$,Z]=S.cell,N=A.h*S.aspect,te=o(A.z);for(const[H,G]of[[-.5,0],[.5,0],[.5,1],[-.5,1]])k.push(A.x,0,A.z),w.push(H,G,A.h,N),g.push(U+(H+.5)*$,K+(1-G)*Z),v.push(A.phase,te[0],te[1],te[2]);T.push(y*4,y*4+1,y*4+2,y*4,y*4+2,y*4+3)});const p=new qt(`strewn:${r}:${h}`,e);return Object.assign(new cs,{positions:k,indices:T}).applyToMesh(p),p.setVerticesData("quad",w,!1,4),p.setVerticesData(Qs.UVKind,g,!1,2),p.setVerticesData("extra",v,!1,4),p.material=i,p.alphaIndex=Xe(Math.min(Vs[h],2e3)),p.alwaysSelectAsActiveMesh=!0,p.isPickable=!1,p.metadata={noGBuffer:!0},p});return{meshes:f,update(h,x,k,w,g){i.setFloat("time",h).setFloat("sway",x).setFloat("land",k).setFloat("opacity",g).setVector3("camPos",w),f.forEach(v=>{v.isVisible=g>.001})},dispose(){f.forEach(h=>h.dispose()),i.dispose()}}}const at=[3,60],Vn=[60,300],ar=80,rr=1.8,ir=(e,t)=>t??e.asset.tags;function Nn(e){const t=[],n=Math.log(at[1]/at[0]);e.slots.forEach((o,a)=>{const r=Math.max(at[0],o.from),i=Math.min(at[1],e.slots[a+1]?.from??1/0);if(i<=r)return;const c=tr(e.sprites,ir(o,e.bandTags)),f=e.grass*Rs*(Math.log(i/r)/n);t.push({picks:c,clumps:In({picks:c,count:f,from:r,to:i,front:e.front,seed:Rn(`${e.sceneId}:grass:${a}`)})})});const s=e.slots[e.slots.length-1];if(s&&!e.bandTags){const o=sr(e.sprites,s.asset.tags);t.push({picks:o,horizon:!0,clumps:In({picks:o,count:e.bushes*ar,from:Vn[0],to:Vn[1],front:e.front,size:rr,seed:Rn(`${e.sceneId}:horizon`)})})}return t.filter(o=>o.clumps.length)}const Wt={...Po["History Lines pencil"],paper:.35,granulation:.2,...ut},lr=new hs(.937,.914,.863,1),cr=.7,hr=(e,t,n)=>e.map((s,o)=>s+(t[o]-s)*n);class ur{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new eo(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new to(this.engine),this.scene.clearColor=lr,this.camera=new no("house",new V(0,1.6,0),this.scene),this.camera.rotation.set(mt*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new so("sky",new V(0,1,0),this.scene).intensity=.7,new oo("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=Ma(this.scene),this.ground.set(this.groundLook([],null,n)),this.birds=Fa(this.scene,Gn,me(Gn),gr),Oo(this.scene,this.camera,{num:s=>Number(this.look[s]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),Na(this.camera,s=>Number(this.look[s]??0)),this.fit(),window.addEventListener("resize",()=>{this.scene.isDisposed||(this.fit(),this.scene.render())})}engine;scene;camera;ground;built=[];horizonTint=Ue(Ce);strip=null;nearTex=null;bands=[];strewn=[];strewSrc=null;strewKey="";smoke=[];birds;footTint=Ue(Ce);nearAsset=null;hazeTint=Ue(Ce);sceneLib;buildToken=0;look={...Wt};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(s=>({scene:t,...s})))}renderCap=1920;tier=_n;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return sa(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=_n,this.window.start=0,this.fit()}tick(t){const n=this.window,s=document.hidden||n.last&&t-n.last>ta;if(n.last=t,!n.start||s){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<ea)return;const o=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=na(this.tier,o,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...Wt,...t??{}}}groundPoint(t,n){const s=se[n];return new V((t-.5)*me(s),0,s)}async build(t,n=this.lib){const s=++this.buildToken,o=[],a=[];t.set.sky&&a.push({layer:$n(t),order:0,index:-1});const r={sky:1};t.set.layers.forEach((b,P)=>{const oe=b.depth;r[oe]=r[oe]??0,a.push({layer:b,order:r[oe]++,index:P})});const i=[];await Promise.all(a.map(async({layer:b,order:P,index:oe})=>{let Y=Oe(n,b,b.depth);if(!Y){i.push({need:b.need??b.asset,reason:"no match"});return}let ie;try{ie=await He(ve(n,Y,b),this.scene)}catch{i.push({need:b.need??b.asset,reason:`file did not load: ${b.src??Y.file}`});return}if(s!==this.buildToken)return;Y=Un(Y,b,ie);const D=Ne(Y,b,P),M=Dn(Y,ie,D.w,D.h,D.uRepeat,this.scene);M.mesh.position.set(D.x,D.y,D.z);const _=ks(b,Y);M.mesh.alphaIndex=_?Vo:D.alphaIndex,_&&(M.mesh.rotation.x=Math.PI/2),M.mesh.isVisible=!1;let F,O,X;if(At.includes(b.depth)&&!Y.tileable_x&&!_&&!Se(Y)){const W=Fn(Y,D.w,D.h,D.z);X=ae=>Fn(Y,D.w,D.h,ae).d/W.d,F=Tn(M.mesh,W.w,W.d,this.scene),F.mesh.alphaIndex=st(D.alphaIndex),O=Tn(M.mesh,W.w,W.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:D.h*xr(this.sunDir)}),O.mesh.alphaIndex=st(D.alphaIndex)}o.push({layer:b,index:oe,builtScale:b.scale??1,builtZ:D.z,handle:M,asset:Y,order:P,stain:F,cast:O,stainDepth:X,ink:Ds.get(ve(n,Y,b)),flat:_,skyline:Gt.get(ve(n,Y,b))})}));const c=Es(t.set,n),f=(await Promise.all(_s(t.set,n).map(async b=>{const P=await He(n.base+b.asset.file,this.scene).catch(()=>(i.push({need:b.asset.id,reason:`file did not load: ${b.asset.file}`}),null)),oe=(lt.get(n.base+b.asset.file)??[]).filter(Y=>!!Y);return P?{tex:P,tile:b.asset.height_m||$t,from:b.from,asset:b.asset,colour:oe.length?Wn(oe):Ue(n.paper??Ce)}:null}))).filter(b=>!!b);let h=null;const x=va(t.set.near,n),k=x?Oe(n,{asset:x}):null;if(t.set.near&&!k&&i.push({need:t.set.near,reason:"no near band"}),k)try{h=await He(n.base+k.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${k.file}`})}c.kind==="paper"&&c.reason&&i.push({need:t.set.ground,reason:c.reason});const w=o.filter(b=>b.asset.layer==="bg").sort((b,P)=>b.index-P.index)[0],g=w?{top:Os.get(ve(n,w.asset,w.layer))??0,h:Ne(w.asset,w.layer,w.order).h,order:w.order}:null,v=o.find(b=>b.index===-1),T=v&&Ne(v.asset,v.layer,v.order),p=v&&T?fa(lt.get(ve(n,v.asset,v.layer))??[],(I.y-T.y)/T.h):null,A=w?Ps.get(ve(n,w.asset,w.layer))??null:t.set.groundBands?.length?null:p,y=await this.loadBands(t,n),S=t.set.groundBands?.length?[...new Set(t.set.groundBands.flatMap(b=>Oe(n,{asset:b.asset},"ground_band")?.tags??[]))]:null,U=er(n),K=Sn(t),$=f.map(b=>({asset:b.asset,from:b.from})),Z=[...new Set(Nn({sceneId:t.id,slots:$,bandTags:S,sprites:U,grass:1,bushes:1,front:K}).flatMap(b=>b.picks.map(P=>P.file)))],N=new Map;await Promise.all(Z.map(async b=>{const P=await He(n.base+b,this.scene).catch(()=>null);P&&N.set(b,P)}));const te=b=>b.forEach(P=>{P.stain?.mesh.material?.dispose(),P.cast?.mesh.material?.dispose(),P.handle.mesh.dispose(),P.handle.material.dispose()});if(s!==this.buildToken){te(o),y.forEach(b=>{b.handle.mesh.dispose(),b.handle.material.dispose()});return}te(this.built),this.bands.forEach(b=>{b.handle.mesh.dispose(),b.handle.material.dispose()}),this.bands=y,this.built=o,this.sceneLib=n;const H=f[0]?(lt.get(n.base+f[0].asset.file)??[]).filter(b=>!!b):[],G=this.groundLook(f,A,n,c.kind==="paper"?c.colour:void 0);this.horizonTint=G.tint,this.strip=g,this.smoke.forEach(b=>b.dispose()),this.smoke=o.filter(b=>Ta(b.asset)&&At.includes(b.layer.depth)&&!b.flat).map(b=>{const P=Ne(b.asset,b.layer,b.order);return Aa(this.scene,new V(b.handle.mesh.position.x,P.h*.6,P.z),Math.min(Math.max(P.h*.8,.5),3),P.alphaIndex)}),this.footTint=H.length?Wn(H):G.base,this.nearTex=h,this.nearAsset=k,this.hazeTint=p??G.tint,this.ground.set(G),this.strewSrc={sceneId:t.id,slots:$,colours:f.map(b=>b.colour),bandTags:S,front:K,sprites:U,tex:N},this.strewKey="",this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,s,o){const a=Ue(o??s.paper??Ce),r=n??a;return{slots:t,base:hr(a,r,cr),tint:r,fadeNear:se.fg,fadeFar:se.bg*.75,grain:t.length?.5:1}}strew(t,n){const s=this.strewSrc,o=s?`${s.sceneId}:${t}:${n}:${s.slots.length}`:"";if(o===this.strewKey||(this.strewKey=o,this.strewn.forEach(r=>r.dispose()),this.strewn=[],!s))return;const a=r=>s.colours[wa(s.slots,r)]??this.footTint;for(const r of Nn({...s,grass:t,bushes:n}))for(const i of new Set(r.picks.map(c=>c.file))){const c=s.tex.get(i),f=r.clumps.filter(h=>r.picks[h.pick].file===i);c&&f.length&&this.strewn.push(or(this.scene,c,r.picks,f,a,this.hazeTint,i))}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:$n(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const s=r=>this.built.some(i=>i.handle.mesh===r),o=[],a=[...this.scene.multiPick(t,n,s)??[]].sort((r,i)=>r.distance-i.distance);for(const r of a){const i=this.built.find(f=>f.handle.mesh===r.pickedMesh),c=r.getTextureCoordinates();!i||!c||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||Se(i.asset)&&(r.pickedPoint?.y??0)<0||o.push({index:i.index,asset:i.asset,u:c.x,v:c.y})}return o}pickBackdrops(t,n){const s=r=>this.bands.find(i=>i.handle.mesh===r),o=r=>this.built.find(i=>i.handle.mesh===r&&i.index>=0&&i.asset.layer==="bg");return[...this.scene.multiPick(t,n,r=>!!s(r)||!!o(r))??[]].sort((r,i)=>r.distance-i.distance).flatMap(r=>{const i=r.getTextureCoordinates();if(!i)return[];const c=s(r.pickedMesh);if(c)return[{band:c.index,asset:c.asset,u:i.x,v:i.y}];const f=o(r.pickedMesh);return[{index:f.index,asset:f.asset,u:i.x,v:i.y}]})}layerBox(t){const n=this.built.find(f=>f.index===t);if(!n)return null;const s=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),o=1/this.engine.getRenderWidth(),a=1/this.engine.getRenderHeight(),r=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(f=>V.Project(f,De.IdentityReadOnly,this.scene.getTransformMatrix(),s)),i=r.map(f=>f.x*o),c=r.map(f=>f.y*a);return{x0:Math.min(...i),y0:Math.min(...c),x1:Math.max(...i),y1:Math.max(...c),z:n.handle.mesh.position.z}}cameraAlive=!0;calm=!!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;faded=new Set;fadedTo=1;fadeLayers(t,n){this.faded=new Set(t),this.fadedTo=n}groundHeightAt(t){return Nt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(s=>s.index===t);return n?Se(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const s=this.scene.createPickingRay(t,n,De.Identity(),this.camera);return{origin:[s.origin.x,s.origin.y,s.origin.z],dir:[s.direction.x,s.direction.y,s.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(s=>s.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(o=>o.dispose());const s=o=>fr*Math.min(1,Math.max(0,(Hn-o)/(Hn-pr)));this.gridMeshes=n.pieces.map((o,a)=>{const r=o.lines.map(f=>f.map(([h,x])=>new V(h,Nt(x,t),x))),i=o.lines.map(f=>f.map(([,h])=>new hs(n.rgb[0],n.rgb[1],n.rgb[2],s(h)))),c=ft.CreateLineSystem(`grid-${a}`,{lines:r,colors:i,useVertexAlpha:!0},this.scene);return c.isPickable=!1,c.setEnabled(!this.gridOff),c.alphaIndex=Xe(o.z)+mr,c.material.depthFunction=be.ALWAYS,c.material.disableDepthWrite=!0,c}),n.land=t}worldXAt(t,n,s){const o=this.scene.createPickingRay(t,n,De.Identity(),this.camera);return o.origin.x+(s-o.origin.z)/o.direction.z*o.direction.x}sunDir=new V(.55,-1,-.3).normalize();depthLine(t){return{...Mt(this.look,t),tint:this.hazeTint}}paper(){return Pn(this.look)}async loadBands(t,n){const s=[];for(const[o,a]of(t.set.groundBands??[]).entries()){const r=Oe(n,{asset:a.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await He(ve(n,r,a),this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${a.src??r.file} did not load`);continue}const c=Un(r,a,i),f=ys(a.z),h=f*c.h/c.w,x=Dn(c,i,f,h,1,this.scene);x.material.depthFunction=be.ALWAYS,x.mesh.position.set(0,0,a.z),x.mesh.alphaIndex=Xe(a.z),s.push({handle:x,z:a.z,w:f,h,skyline:Gt.get(ve(n,c,a))??.5,index:o,asset:c,band:a})}return s}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?Yo(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??xs,ce(this.look,"housePitch")):0}pose(t,n,s,o){const a=Jt(t,n),r=Qt(a.cam,a.t,Zt(t)),i=o?ra(r,o.t,o):r,c=this.cameraAlive&&!this.calm?Xo(t.camera_motion,s):{x:0,y:0,roll:0};this.camera.position.set(i.x+c.x,i.y+c.y,i.z),this.camera.fov=i.fov;const f=ce(this.look,"housePitch");this.camera.rotation.x=f*Math.PI/180,this.camera.rotation.z=((i.roll??0)+c.roll)*Math.PI/180,this.ground.follow(this.camera.position);const h=p=>ce(this.look,p);this.ground.live({detail:h("groundDetail"),vary:h("groundVary"),mixTile:h("groundMix"),tileScale:h("groundScale"),wash:h("groundWash"),grainSize:h("groundGrain")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Va(f,this.engine.getAspectRatio(this.camera),h("nearFar")),span:dr,tileable:!!this.nearAsset?.tileable_x}:null);const x=this.engine.getRenderHeight(),k=Pn(this.look),w=ce(this.look,"bandHeight"),g=this.horizonOf(t),v=$o(g,this.strip);this.land=v,this.poseGrid(v);const T=Sn(t);this.bands.forEach(p=>{const A=jo(p.band,n,w,p.w,p.h,p.skyline,T);p.z=A.z,p.handle.mesh.scaling.set(A.sx,A.sy,1),p.handle.mesh.position.set(A.x,A.y,A.z),p.handle.mesh.alphaIndex=A.alphaIndex;const y=St(x,A.z-I.z,fe(I.fov));p.handle.setOpacity(A.opacity),p.handle.setBottomFade(Math.min(1,ce(this.look,"bandFade")/A.h)),p.handle.setPaper(k,ot(A.w,A.h,1,y,x)),p.handle.setLine(Mt(this.look,"bg"),1,ot(A.w,A.h,1,y,x),this.hazeTint),p.handle.setMotion(An(p.asset,{...p.band})),p.handle.material.setFloat("time",s)}),this.strew(ce(this.look,"grass"),ce(this.look,"horizonBushes")),this.strewn.forEach(p=>p.update(s,ce(this.look,"grassSway"),v,this.camera.position,1)),this.smoke.forEach(p=>p.update(s,ce(this.look,"smoke"))),this.birds.update(s,ce(this.look,"birds"));for(const p of this.built){const A=pe(p.layer,n),y=Ne(p.asset,{...p.layer,x:A.x,y:A.y,z:A.z,scale:1,rotation:A.rotation},p.order,g,v);p.handle.mesh.position.x=y.x;const S=p.asset.layer==="bg"&&!p.asset.tileable_x?(y.z-I.z)/Math.max(.1,p.builtZ-I.z):1;p.handle.mesh.position.y=p.flat?No:Se(p.asset)?bs(y.z,w,y.h*A.scale,p.skyline??0)+y.y:I.y+(y.y-I.y)*S,p.handle.mesh.position.z!==y.z&&(p.handle.mesh.position.z=y.z,p.flat||(p.handle.mesh.alphaIndex=y.alphaIndex),p.stain&&(p.stain.mesh.alphaIndex=st(y.alphaIndex)),p.stain&&p.stainDepth&&(p.stain.mesh.scaling.y=p.stainDepth(y.z)),p.cast&&(p.cast.mesh.alphaIndex=st(y.alphaIndex))),p.handle.mesh.rotation.z=-y.rotation*Math.PI/180,p.handle.mesh.scaling.setAll(A.scale/p.builtScale*S);const U=A.opacity*(this.faded.has(p.index)?this.fadedTo:1);p.handle.setOpacity(U),p.handle.setFeather(ha(p.asset,p.layer),this.horizonTint),p.asset.layer==="sky"&&p.handle.setGroundLine((i.y-y.y)/(y.h*A.scale));const K=St(x,y.z-i.z,this.camera.fov),$=Mt(this.look,p.layer.depth);p.handle.setPaper(k,ot(y.w*A.scale,y.h*A.scale,y.uRepeat,St(1080,y.z-I.z,fe(I.fov)),1080)),p.handle.setLine($,p.ink===void 0?1:Ba(p.ink,$.ink,$.norm),ot(y.w*A.scale,y.h*A.scale,y.uRepeat,K,x),this.hazeTint),p.handle.setInk(p.layer.outline??0,p.layer.etch??0),p.stain?.setEtch(p.layer.etch??0),p.cast?.setEtch(p.layer.etch??0),p.stain?.setOpacity((p.layer.shadow??wt)*U),p.cast?.setOpacity(ce(this.look,"castShadow")*((p.layer.shadow??wt)/wt)*U);const Z=p.asset.layer==="sky"?"sky":p.asset.layer==="bg"?"strip":p.asset.layer==="figure"?"figure":At.includes(p.layer.depth)&&!p.flat?"standing":"other";p.handle.setAlive(Da(this.look,Z,this.sunDir.x,this.footTint)),p.handle.setMotion(An(p.asset,p.layer)),p.handle.material.setFloat("time",s),Ae(p.asset)&&p.handle.setCell($a(p.asset,Cs(p.asset,p.layer.play,n)))}}}const ve=(e,t,n)=>n?.src??e.base+t.file,Un=(e,t,n)=>{if(!t.src)return e;if(!e.w||!e.h)return{...e,src:t.src};const{width:s,height:o}=n.getSize(),a=s/(Ae(e)?e.cols:1),r=o/(Ae(e)?e.rows:1);return{...e,w:a,h:r,height_m:e.height_m*(r/e.h),src:t.src}},$n=e=>({...e.set.skyLayer?.motion?{motion:e.set.skyLayer.motion}:{},...e.set.skyLayer?.src?{src:e.set.skyLayer.src}:{},asset:e.set.sky,depth:"sky"}),dr=1.3,fr=.35,mr=.001,pr=40,Hn=120,Gn=110,gr=900,xr=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Wn=e=>[0,1,2].map(t=>e.reduce((n,s)=>n+s[t],0)/e.length),At=["mid","fg","near"],yr=16/9,vr=.92;function wr(e,t,n,s){const{cam:o,t:a}=Jt(e,s),r=Qt(o,a,Zt(e)),i=se[t.depth],c=i-r.z;if(c<=.5)return null;const f=pe(t,s),h=(f.x-.5)*me(i),x=Math.tan(r.fov/2),k=(h-r.x)/(c*x*yr),w=-mt*Math.PI/180,g=Math.tan(Math.atan2(n*f.scale-r.y,c)-w)/x;return Math.abs(k)>vr?null:{x:(k+1)/2,y:Math.min(1,Math.max(0,(1-g)/2))}}const br={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],campfire:["campfire","kampvuur"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},jn=new Set(["large","small","tall","long","short","fallen"]),kr=new Set(["tree","shrub"]),tn=e=>e.charAt(0).toUpperCase()+e.slice(1),Mr=(e,t)=>br[e]?.[t?1:0]??e;function Sr(e,t="en"){const n=t==="nl",s=e?.name?.[t]??e?.name?.en;if(s)return s;const o=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!o.length)return"";const a=o.length>1&&kr.has(o[0])?o.slice(1):o,r=a.filter(c=>jn.has(c)),i=a.filter(c=>!jn.has(c));return tn([...r,...i].map(c=>Mr(c,n)).join(" "))}const Yn=e=>tn(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),Ns=e=>{const t=(e?.tags??[]).find(s=>s.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function we(e,t,n="en"){const s=t??(e.asset?{id:e.asset}:null),o=(s?.layer==="figure"||/^fig-/.test(String(s?.id??"")))&&Ns(s);if(o)return Yn(o);if(e.figure)return Yn(e.figure);if(s)return Sr(s,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?tn(String(a)):""}function Er(e){const t=new Map;return e.map(n=>{const s=(t.get(n)??0)+1;return t.set(n,s),s===1?n:`${n} ${s}`})}const Ar=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function _r(e){return e?.kind==="animation"?"vfx":e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>Ar.has(t))?"leaf":"photo"}const Ze=e=>e?.layer==="figure"||/^fig-/.test(String(e?.id??""))?Ns(e):null,Kn=(e,t)=>(e?.tags??[]).find(n=>n.startsWith(t))?.slice(t.length)??null;function Re(e){const t=/-([a-z]+)-\d+(-l)?$/.exec(String(e?.id??""));return{pose:Kn(e,"pose:")??t?.[1]??null,facing:Kn(e,"facing:")??(t?.[2]?"left":"right")}}const Us=e=>e.find(t=>Re(t).pose==="stand"&&Re(t).facing==="right")??e[0];function $s(e){const t=new Map,n=[];for(const s of e??[]){const o=Ze(s);if(!o){n.push({id:s.id,asset:s,series:null,count:1,members:[s]});continue}if(!t.has(o)){const r={id:`series:${o}`,asset:s,series:o,count:0,members:[]};t.set(o,r),n.push(r)}const a=t.get(o);a.members=[...a.members,s],a.count=a.members.length}return n.map(s=>s.series?{...s,asset:Us(s.members)}:s)}const zr=(e,t)=>{const n=Ze(t);return n?(e??[]).filter(s=>Ze(s)===n):t?[t]:[]},Fr=e=>$s(e).filter(t=>t.series).map(t=>({series:t.series,asset:t.asset}));function Tr(e,t,n){const s=(e??[]).filter(r=>Ze(r)===n);if(!s.length)return null;const o=Re(t),a=(r,i)=>s.find(c=>Re(c).pose===r&&Re(c).facing===i);return a(o.pose,o.facing)??a("stand",o.facing)??Us(s)}const Lr=24,_t=e=>e?.src??e?.file;function Cr(e){const t=new Map,n=(s,o=!1)=>{if(t.has(s))return;t.set(s,"loading");const a=new Image;a.onload=()=>{try{const r=document.createElement("canvas");r.width=a.naturalWidth,r.height=a.naturalHeight;const i=r.getContext("2d",{willReadFrequently:!0});i.drawImage(a,0,0),t.set(s,{w:r.width,h:r.height,data:i.getImageData(0,0,r.width,r.height).data})}catch{t.set(s,"failed")}},a.onerror=()=>t.set(s,"failed"),a.src=o?s:e+s};return{prime(s){s.forEach(o=>_t(o)&&n(_t(o),!!o.src))},opaque(s,o,a,r){const i=_t(s),c=t.get(i);if(c==="failed")return!0;if(!c||c==="loading")return i&&n(i,!!s.src),!1;const f=s.kind==="animation"?Math.max(1,s.cols??1):1,h=s.kind==="animation"?Math.max(1,s.rows??1):1,x=c.w/f,k=c.h/h,w=Math.min(x-1,Math.max(0,Math.floor(o*x))),g=Math.min(k-1,Math.max(0,Math.floor(a*k)));return(Number.isInteger(r)?[[Math.floor(r/f)%h,r%f]]:Array.from({length:h*f},(T,p)=>[Math.floor(p/f),p%f])).some(([T,p])=>c.data[(Math.floor(T*k+g)*c.w+Math.floor(p*x+w))*4+3]>Lr)}}}const re={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,vs],[80,Xt]]},Pr=e=>e<=12?1:e<=40?5:20,Or=e=>Pr(e)/4;function qn(e,t=0){const n=typeof t=="function"?t:()=>t,s=f=>[e.origin[0]+f*e.dir[0],e.origin[2]+f*e.dir[2]],o=f=>e.origin[1]+f*e.dir[1]-(re.z+n(s(f)[1]));if(!(e.dir[2]>0))return null;const a=(Xt*Dr-e.origin[2])/e.dir[2],r=Math.sign(o(0));if(r===0)return mn(re,s(0));let i=0,c=null;for(let f=1;f<=Xn;f++){const h=a*f/Xn;if(Math.sign(o(h))!==r){c=h;break}i=h}if(c===null)return null;for(let f=0;f<Rr;f++){const h=(i+c)/2;Math.sign(o(h))===r?i=h:c=h}return mn(re,s(c))}const Dr=4,Xn=400,Rr=30;function jt(e){const t=Or(Ct(re,e)[1]);return Ct(re,io(e,t))}const Yt=(e,t)=>[(e-.5)*me(t),t],dt=([e,t])=>({x:Math.round((.5+e/me(t))*1e4)/1e4,z:t});function nn([e,t],n,s=[0,0]){const o=(n-s[1])/Math.max(.1,t-s[1]);return[s[0]+(e-s[0])*o,n]}function Ir([e,t],n,s=[0,0]){const[[,o],[,a]]=re.cells,r=Math.max(.1,t-s[1]),i=Math.min(a,Math.max(o,s[1]+r/Math.max(.01,n)));return Ct(re,nn([e,t],i,s))}const Br=[[vs,12,2],[12,40,10],[40,Xt,40]],Vr=20;function Nr(){return Br.flatMap(([e,t,n],s)=>{const o=n*Vr,a=[];let r=e;for(let i=Math.ceil(e/n)*n;i<=t;i+=n){if(i===e&&s>0)continue;const c={...re,cells:[[-o,r],[o,i]]},f=lo(c,n,Math.max(1,Math.round(i-r))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===i:i>r);a.push({z:i,lines:f.map(h=>h.map(x=>co(re,x).slice(0,2)))}),r=i}return a})}const Zn=-1,Jn=2,Ur=4,$r=(e,t)=>{const n=e.findIndex(s=>s.index===t);return n<0?{hit:e[0]??null,next:null}:{hit:e[n],next:e.length>1?e[(n+1)%e.length].index:null}},Hr=(e,t)=>{const n=e.find(s=>s.index===t)?.box;return n?e.filter(({index:s,box:o})=>s!==t&&o&&o.z<n.z&&o.x0<n.x1&&o.x1>n.x0&&o.y0<n.y1&&o.y1>n.y0).map(s=>s.index):[]},Gr=(e,t)=>{const n=e.filter(({box:o})=>o&&o.x1>0&&o.x0<1&&o.y1>0&&o.y0<1);if(n.some(o=>o.index===t))return t;const s=({x0:o,y0:a,x1:r,y1:i})=>Math.hypot((o+r)/2-.5,(a+i)/2-.5);return n.reduce((o,a)=>!o||s(a.box)<s(o.box)?a:o,null)?.index??null};function Wr({canvas:e,host:t,stage:n,valueOf:s,alpha:o,onChange:a,onGround:r=()=>!1,byDistance:i=()=>!1,groundUnder:c=()=>null,footY:f=()=>0,eye:h=()=>[0,0],onSettled:x=()=>{},onEmpty:k=()=>!1}){let w=null,g=null,v=!1;const T="#38bdf8",p=document.createElement("div");p.dataset.stage25dSelection="",p.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${T};z-index:3;`;const A=document.createElement("div");A.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${T};pointer-events:none;`,p.appendChild(A);const y=document.createElement("div");y.dataset.rotateHandle="1",y.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",p.appendChild(y);const U=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([M,_])=>{const F=document.createElement("div");return F.dataset.scaleHandle="1",F.style.cssText=ro(M,_),p.appendChild(F),F});t.appendChild(p),n()?.setGrid?.(Nr(),jr(t,"--color-neutral"));const K=document.createElement("div");K.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(K);const $=M=>{const _=H();if(!_||M===null){K.style.display="none";return}const F=t.getBoundingClientRect(),O=e.getBoundingClientRect();Object.assign(K.style,{display:"block",left:`${_.left+_.width/2+O.left-F.left}px`,top:`${_.top+_.height+O.top-F.top}px`}),K.textContent=`${s(M,"z").toFixed(2)} m`},Z=M=>{const _=e.getBoundingClientRect();return{x:M.clientX-_.left,y:M.clientY-_.top}},N=(M,_)=>(n()?.pickLayers(M,_)??[]).filter(F=>o.opaque(F.asset,F.u,F.v,F.index)),te=(M,_)=>{w=M,_&&M!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${M}`}})),G()},H=()=>{const M=w===null?null:n()?.layerBox(w);if(!M)return null;const _=e.getBoundingClientRect();return{left:M.x0*_.width,top:M.y0*_.height,width:(M.x1-M.x0)*_.width,height:(M.y1-M.y0)*_.height,z:M.z}},G=()=>{const M=H();if(!M){p.style.display="none";return}const _=e.getBoundingClientRect(),F=t.getBoundingClientRect();Object.assign(p.style,{display:"block",left:`${M.left+_.left-F.left}px`,top:`${M.top+_.top-F.top}px`,width:`${M.width}px`,height:`${M.height}px`})},b=(M,_,F)=>Math.min(F,Math.max(_,M)),P=M=>{if(M.button!==0)return;const{x:_,y:F}=Z(M),{hit:O,next:X}=$r(N(_,F),w);if(!O){k(_,F)&&M.stopPropagation();return}M.stopPropagation(),te(O.index,!0);const W=n().layerBox(O.index),ae=r(O.index),J=H();g={mode:"move",index:O.index,z:W.z,from:n().worldXAt(_,F,W.z),x0:s(O.index,"x"),id:M.pointerId,el:e,next:X,pressed:[M.clientX,M.clientY],ground:ae,start:[_,F],foot:J?[J.left+J.width/2,J.top+J.height]:[_,F],lift:ae?f(O.index):0},e.setPointerCapture?.(M.pointerId)},oe=M=>_=>{if(_.button!==0||w===null)return;const F=H();if(!F)return;_.stopPropagation(),_.preventDefault();const O=e.getBoundingClientRect(),X=F.left+F.width/2,W=F.top+F.height/2,{x:ae,y:J}={x:_.clientX-O.left,y:_.clientY-O.top};g={mode:M,index:w,cx:X,cy:W,id:_.pointerId,el:_.currentTarget,d0:Math.max(8,Math.hypot(ae-X,J-W)),a0:Math.atan2(J-W,ae-X),scale0:s(w,"scale"),rotation0:s(w,"rotation"),byDistance:M==="scale"&&i(w),p0:Yt(s(w,"x"),s(w,"z")),eye:h()},_.currentTarget.setPointerCapture?.(_.pointerId)},Y=M=>{const{x:_,y:F}=Z(M);if(g?.mode==="move"&&g.ground){const O=c(g.foot[0]+_-g.start[0],g.foot[1]+F-g.start[1],g.lift,g.index);if(!O)return;const X=dt(jt(O));a(g.index,"x",b(X.x,Zn,Jn)),a(g.index,"z",X.z),$(g.index);return}if(g?.mode==="move"){const O=(n().worldXAt(_,F,g.z)-g.from)/me(g.z);a(g.index,"x",Math.round(b(g.x0+O,Zn,Jn)*1e3)/1e3);return}if(g?.mode==="scale"&&g.byDistance){const O=Math.hypot(_-g.cx,F-g.cy)/g.d0*g.scale0,X=jt(Ir(g.p0,O,g.eye))[1],W=dt(nn(g.p0,X,g.eye));g.scale0!==1&&a(g.index,"scale",1),a(g.index,"x",W.x),a(g.index,"z",W.z),$(g.index);return}if(g?.mode==="scale"){const O=Math.hypot(_-g.cx,F-g.cy);a(g.index,"scale",Math.round(b(g.scale0*(O/g.d0),.05,20)*1e3)/1e3);return}if(g?.mode==="rotate"){let O=g.rotation0+(Math.atan2(F-g.cy,_-g.cx)-g.a0)*180/Math.PI;M.shiftKey&&(O=Math.round(O/15)*15),a(g.index,"rotation",Math.round(O*10)/10);return}v||(v=!0,requestAnimationFrame(()=>{v=!1,e.style.cursor=N(_,F).length?"pointer":""}))},ie=M=>{if(!g)return;g.el.releasePointerCapture?.(g.id);const _=g.index,F=g.mode==="move"&&g.ground||g.byDistance,O=g.next!=null&&Math.hypot(M.clientX-g.pressed[0],M.clientY-g.pressed[1])<Ur?g.next:null;g=null,K.style.display="none",F&&x(_),O!==null&&te(O,!0)},D=M=>{w!==null&&M.detail?.id!==`s25_layer-${w}`&&(w=null,G())};e.addEventListener("pointerdown",P);for(const M of[e,...U,y])M.addEventListener("pointermove",Y),M.addEventListener("pointerup",ie),M.addEventListener("pointercancel",ie);return U.forEach(M=>M.addEventListener("pointerdown",oe("scale"))),y.addEventListener("pointerdown",oe("rotate")),window.addEventListener("scene-object-selected",D),{select:(M,_=!1)=>te(M,_),get selected(){return w},place:G,destroy(){window.removeEventListener("scene-object-selected",D),p.remove(),n()?.setGrid?.(null),K.remove()}}}function jr(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(s=>s/255)):[.2,.25,.33]}const sn=["x","y","z","scale","rotation","opacity","keys","figure","play","outline","etch"],ne=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},zt=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!sn.includes(t))),Qn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:s={},...o}=e?.set??{},{camera:a,camera_more:r,camera_motion:i,...c}=e??{};return JSON.stringify({...c,set:{...o,layers:t.map(zt),groundBands:n.map(zt),skyLayer:zt(s)}})},Ft=e=>sn.map(t=>e?.[t]??null),Tt=e=>JSON.stringify([(e?.set?.layers??[]).map(Ft),(e?.set?.groundBands??[]).map(Ft),Ft(e?.set?.skyLayer),e?.camera??null,e?.camera_more??[],e?.camera_motion??null]),es={x:[-8,8],y:[.3,6],z:[-4,15],fov:[20,75]},Yr=[-45,45],Kr=10,ts=.01,qr=.01,ns=(e,[t,n])=>Math.min(n,Math.max(t,e)),ss=e=>Math.round(e*1e3)/1e3,xe=e=>{const t={...I,...e},n=Object.fromEntries(Object.keys(es).map(o=>[o,ss(ns(Number(t[o])||I[o],es[o]))])),s=ss(ns(Number(t.roll)||0,Yr));return s?{...n,roll:s}:n},Xr=(e,t,n,s)=>{const o=xe(e),a=2*Kr*Math.tan(fe(o.fov)/2)/Math.max(1,s);return xe({...o,x:o.x-t*a,y:o.y+n*a})},Zr=(e,{deltaX:t=0,deltaY:n=0,ctrlKey:s=!1})=>{const o=xe(e);return xe(s?{...o,fov:o.fov*Math.exp(n*qr)}:{...o,z:o.z-n*ts,x:o.x+t*ts})},on=.001,Jr=(e,t,n)=>{const s=[];for(const o of[e,...t??[]].filter(Boolean)){const a=Number(o.at_s)||0,r=(f,h)=>{const x=s.findIndex(k=>Math.abs(k.t-f)<on);x>=0?s[x]={t:f,pose:h}:s.push({t:f,pose:h})},i=xe(o.from??I),c=xe(o.to??o.from??I);r(a,i),(Number(o.dur_s)||JSON.stringify(i)!==JSON.stringify(c))&&r(a+(Number(o.dur_s)||Math.max(0,n-a)),c)}return s.sort((o,a)=>o.t-a.t)},Kt=(e,t)=>e.filter(n=>Math.abs(n.t-t)>=on),Ge=(e,t,n)=>[...Kt(e,t),{t,pose:xe(n)}].sort((s,o)=>s.t-o.t),rt=.05,Qr=(e,t,n,s)=>{const o=e.find(h=>Math.abs(h.t-t)<on);if(!o)return{keys:e,t};const a=e.filter(h=>h!==o),r=Math.round(Math.max(0,Math.min(s,n))*1e3)/1e3,i=a.find(h=>Math.abs(h.t-r)<rt),c=i?i.t+(r>=t?rt:-rt):r,f=Math.round((c<0||c>s?i.t-Math.sign(c)*rt:c)*1e3)/1e3;return{keys:[...a,{...o,t:f}].sort((h,x)=>h.t-x.t),t:f}},ei=(e,t)=>e.reduce((n,s)=>Math.abs(s.t-t)<Math.abs(n.t-t)?s:n,e[0]),ti=e=>{const t=(n,s,o,a)=>({move:"framed",ease:"inOut",at_s:o,...a?{dur_s:a}:{},from:n,to:s});return e.length<2?e.map(n=>t(n.pose,n.pose,0)):e.slice(0,-1).map((n,s)=>t(n.pose,e[s+1].pose,n.t,e[s+1].t-n.t))},ni=(e,t,n,s)=>{const{cam:o,t:a}=Jt({camera:e,camera_more:t},n),r=Qt(o,Math.max(0,a),s);return xe({x:r.x,y:r.y,z:r.z,fov:r.fov*180/Math.PI,roll:r.roll})},si={nl:"Lucht",de:"Himmel",fr:"Ciel",it:"Cielo"},oi={nl:"Camera",de:"Kamera",fr:"Caméra",it:"Telecamera"},os=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch","groundWash","groundGrain","grass","grassSway","horizonBushes"],ai=e=>e.cutout?"cutouts":Ae(e)?"vfx":e.layer;let Pe=null;const Hs=()=>{if(Pe)return Pe;try{Pe=JSON.parse(document.querySelector("[data-stage25d-cutouts]")?.dataset.stage25dCutouts||"[]")}catch{Pe=[]}return Pe},as=(e,t=Hs())=>{if(!t.length)return e;const n=new Set(t.map(s=>s.id));return{...e,assets:[...e.assets.filter(s=>!n.has(s.id)),...t]}};typeof window<"u"&&window.addEventListener("cutouts-changed",e=>{const t=e.detail?.stage;t?.id&&(Pe=[t,...Hs().filter(n=>n.id!==t.id)],window.dispatchEvent(new CustomEvent("stage25d-cutouts")))});const rs=e=>Ae(e)?{cols:e.cols,rows:e.rows,frames:e.frames??e.cols*e.rows,fps:e.fps??12,w:e.w,h:e.h}:null,is="application/x-lp-stage25d",it=new Map,Lt=new Map,ri=.8,ii=e=>(Lt.has(e)||Lt.set(e,Cr(e)),Lt.get(e));function li(e){return it.has(e)||it.set(e,ia(ao(e)).catch(t=>{throw it.delete(e),t})),it.get(e)}const ci=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],camera_motion:e.camera_motion??null,figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function bi(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let s=null,o=null,a=null,r=null,i=new Map,c=new Map,f=0,h=null,x=0,k=0,w=performance.now(),g=!1,v=[],T=[],p={},A=new Set,y=null,S=null;const U=l=>Ae(l)?null:l.cutout?S.base+l.file:S.base+"thumbs/"+l.file;let K=null,$=null,Z={},N=null,te=0,H=null,G=[],b=null,P=!1;const oe=()=>{S&&(S=as(S),i=new Map(S.assets.map(l=>[l.id,l])),window.dispatchEvent(new CustomEvent("stage25d-synced")))};window.addEventListener("stage25d-cutouts",oe);const Y=()=>{s.engine.runRenderLoop(()=>{const l=performance.now();k+=Math.min(.1,(l-w)/1e3),w=l,s.tick(l),N&&(s.fadeLayers(O(),ri),s.cameraAlive=te===0&&(P||!!window.__timelineKeying?.playing?.())),o&&s.pose(o,le(),k),s.scene.render(),N?.place()})},ie=()=>{if(!o||!s)return;const l=(u,d)=>A.has(d)?{...u,opacity:0,keys:[]}:u;o={...o,set:{...o.set,groundBands:T.map((u,d)=>l(u,`band-${d}`)),skyLayer:p,layers:v.map((u,d)=>l(u,`layer-${d}`))}},s.rebind(o)},D=l=>{const u=/^band-(\d+)$/.exec(String(l??""));return u&&T[Number(u[1])]?Number(u[1]):-1},M=l=>l==="sky"?r?.set?.sky?{...p,depth:"sky"}:null:D(l)>=0?{...T[D(l)],depth:"bg"}:v[ne(l)]??null,_=(l,u)=>{let d=null;if(l==="sky"&&r?.set?.sky){if(u.motion===void 0)return null;p={...p,motion:u.motion},d={skyLayer:{motion:u.motion}}}else if(D(l)>=0){const m=D(l);T=T.map((E,z)=>z===m?{...E,...u}:E),d={band:{index:m,...u}}}else if(v[ne(l)]){const m=ne(l);v=v.map((E,z)=>z===m?{...E,...u}:E),d=m}return d===null?null:(y=F(),ie(),d)},F=()=>Tt({set:{layers:v,groundBands:T,skyLayer:p},camera:H,camera_more:G,camera_motion:b}),O=()=>{const l=N?.selected??null;return l===null||te>0||window.__timelineKeying?.playing?.()?[]:Hr(v.map((u,d)=>({index:d,box:A.has(`layer-${d}`)?null:s.layerBox(d)})),l)},X=()=>o?Zt(o):8,W=()=>Jr(H,G,X()),ae=()=>ni(H,G,le(),X()),J=l=>{const[u=null,...d]=ti(l);H=u,G=d,o&&(o={...o,camera:H,camera_more:G}),r=r&&{...r,camera:H,camera_more:G},y=F(),L.sceneId!=null&&t.onCommit?.(0,{camera:H,camera_more:G},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},pt=l=>{if(!o)return;const u=le(),d=W();if(window.__timelineKeying?.autoKey?.()||!d.length){const m=!d.length&&u>0?Ge(d,0,ae()):d;return J(Ge(m,u,l))}J(Ge(d,ei(d,u).t,l))},Gs=()=>{let l=null;const u=m=>{m.preventDefault(),m.stopImmediatePropagation()};n.addEventListener("pointerdown",m=>{P&&(u(m),n.setPointerCapture?.(m.pointerId),l={x:m.clientX,y:m.clientY,pose:ae()},n.style.cursor="grabbing")},{capture:!0}),n.addEventListener("pointermove",m=>{P&&(u(m),l&&pt(Xr(l.pose,m.clientX-l.x,m.clientY-l.y,n.getBoundingClientRect().height)))},{capture:!0});const d=m=>{l&&(u(m),l=null,n.style.cursor=P?"grab":"")};n.addEventListener("pointerup",d,{capture:!0}),n.addEventListener("pointercancel",d,{capture:!0}),n.addEventListener("wheel",m=>{P&&(u(m),pt(Zr(ae(),m)))},{capture:!0,passive:!1}),window.addEventListener("scene-object-selected",m=>{m.detail?.id!=="s25_camera"&&L.frameCamera(!1)})},_e=()=>({...r.set,layers:v,groundBands:T,skyLayer:p}),Qe=(l,u)=>{const d=_(l,u);d===null||L.sceneId==null||(typeof d=="number"?t.onCommit?.(d,u,L.sceneId):t.onCommit?.(0,d,L.sceneId))},le=()=>h?h():f,gt=()=>r?.set?.sky&&S?i.get(r.set.sky)??Oe(S,{asset:r.set.sky},"sky"):null,ze=l=>{const u=i.get(v[l]?.asset);return!!(v[l]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&v[l].depth!=="sky")},Ws=l=>l==="sky"||D(l)>=0,an=(l,u)=>{const d=s?.pickBackdrops?.(l,u).find(E=>!A.has(E.band!==void 0?`band-${E.band}`:`layer-${E.index}`)&&K.opaque(E.asset,E.u,E.v)),m=d?d.band!==void 0?`band-${d.band}`:`layer-${d.index}`:r?.set?.sky?"sky":null;return m&&L.select(m),!!m},rn=(l,u)=>Se(u)||ks(l,u),ln=l=>{const u=i.get(v[l]?.asset);return!!u&&rn(v[l],u)},Fe=l=>pe(v[l],le()).z??se[v[l].depth],js=l=>ze(l)&&!(v[l].keys??[]).some(u=>u.scale!==void 0),cn=l=>Math.round(l*1e3)/1e3,hn=()=>s?.camera?.position?[s.camera.position.x,s.camera.position.z]:[0,0],L={canvas:n,sceneId:null,async show(l){const u=as(await li(l.bundle));if(g)return;s||(s=new ur(n,u),Y()),Z={...l.look??{}},s.setLook(Z);const d=ci(l);await s.build(d,u),o=d,v=d.set.layers,T=(d.set.groundBands??[]).map(m=>({...m})),p={...d.set.skyLayer??{}},H=d.camera,G=d.camera_more??[],b=d.camera_motion??null,A=new Set,y=Tt(l),r=l,i=new Map(u.assets.map(m=>[m.id,m])),S=u,K=ii(u.base),K.prime(d.set.layers.map(m=>i.get(m.asset)).filter(Boolean)),t.editable&&!N&&(n.style.pointerEvents="auto",Gs(),window.addEventListener("scene-object-selected",m=>{m.detail?.id!==`s25_${$}`&&($=null)}),n.addEventListener("dragover",m=>{m.dataTransfer?.types?.includes(is)&&(m.preventDefault(),m.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",m=>{const E=m.dataTransfer?.getData(is);if(!E)return;m.preventDefault();const z=n.getBoundingClientRect();L.addLayer(E,{x:m.clientX-z.left,y:m.clientY-z.top})}),e.addEventListener("dblclick",m=>{const E=n.getBoundingClientRect(),z=m.clientX-E.left,R=m.clientY-E.top;if(z<0||R<0||z>E.width||R>E.height||!s)return;const C=s.pickLayers(z,R).find(ye=>K.opaque(ye.asset,ye.u,ye.v,ye.index)),B=C?`layer-${C.index}`:an(z,R)?$:null,Q=B&&L.editTarget(B);Q&&window.dispatchEvent(new CustomEvent("image-edit:open",{detail:Q}))}),N=Wr({canvas:n,host:e,stage:()=>s,alpha:{opaque:(m,E,z,R)=>!A.has(`layer-${R}`)&&K.opaque(m,E,z,Ae(m)?Cs(m,v[R]?.play,le()):void 0)},valueOf:(m,E)=>E==="z"?Fe(m):pe(v[m],le())[E],onGround:ze,byDistance:js,groundUnder:(m,E,z,R)=>qn(s.pointerRay(m,E),ln(R)?z:C=>s.groundHeightAt(C)+z),footY:m=>s.layerFootY(m)-(ln(m)?0:s.groundHeightAt(Fe(m))),eye:hn,onSettled:m=>L.settleBand(m),onEmpty:(m,E)=>an(m,E),onChange:(m,E,z)=>L.moveLayer(`layer-${m}`,E,z)})),(N?.selected??-1)>=v.length&&N.select(null),c=new Map(u.assets.map(m=>[m.id,m.height_m??1.7])),x=Number(l.narration_at_s)||0,a=Qn(l),e.dataset.stage25dReady="1"},editTarget(l){const u=l==="sky"?r?.set?.sky?p:null:D(l)>=0?T[D(l)]:v[ne(l)],d=l==="sky"?gt():i.get(u?.asset);return!u||!d||!S?null:{id:`s25_${l}`,title:L.items().find(m=>m.id===l)?.label??we({},d,(document.documentElement.lang||"en").slice(0,2)),original:u.src?new URL(u.src,location.href).href:S.base+d.file,from:u.src?null:{bundle:S.bundle,asset:d.id},edited:!!u.src,el:e}},matches:l=>a===Qn(l),adopt(l){const u=Tt(l);if(u===y)return!1;y=u;const d=(m,E)=>{const z={...m};for(const R of sn)E?.[R]===void 0?delete z[R]:z[R]=E[R];return z};return v=v.map((m,E)=>d(m,l.set?.layers?.[E])),T=T.map((m,E)=>d(m,l.set?.groundBands?.[E])),p=d(p,l.set?.skyLayer),H=l.camera??null,G=l.camera_more??[],b=l.camera_motion??null,o=o&&{...o,camera:H,camera_more:G,camera_motion:b},r=l,ie(),!0},setLayerProp(l,u,d){_(l,{[u]:d})},setLayerKeys(l,u){const d=M(l);d&&JSON.stringify(d.keys??[])!==JSON.stringify(u)&&_(l,{keys:u})},commitLayerProp(l,u,d){Qe(l,{[u]:d})},readLayerProp(l,u){const d=M(l),m=d?u==="z"&&ne(l)>=0?Fe(ne(l)):u==="z"?pe(d,le()).z??d.z:pe(d,le())[u]:null;return Number.isFinite(m)?m:null},setHidden(l,u){ne(l)<0&&D(l)<0||(A=new Set(u?[...A,l]:[...A].filter(d=>d!==l)),ie())},update(l){h=null,f=Math.max(0,l)},play(l){h=()=>x+l()},moveLayer(l,u,d){window.__timelineKeying?.edit?.(`s25:${l}`,u,d,{flush:!1})||L.commitLayerProp(l,u,d)},select(l){if(l==="camera"){$=null,N?.select(null),L.frameCamera(!0),window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_camera"}}));return}L.frameCamera(!1),$=Ws(l)?l:null,N?.select(ne(l)>=0?ne(l):null,!$),$&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${$}`}}))},get skySelected(){return $==="sky"},get backdrop(){return $},get selection(){return N?.selected??null},clearSelection(){N?.select(null),L.frameCamera(!1)},frameCamera(l){P=!!l,n.style.cursor=P?"grab":"",window.dispatchEvent(new CustomEvent("stage25d-edited"))},cameraInfo:()=>({moves:!!H,keys:W(),pose:ae(),motion:{kind:"none",amount:1,speed:1,...b}}),setCameraMotion(l){b={kind:"none",amount:1,speed:1,...b,...l},o&&(o={...o,camera_motion:b}),r=r&&{...r,camera_motion:b},y=F(),L.sceneId!=null&&t.onCommit?.(0,{cameraMotion:b},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-edited"))},setCameraValue(l,u){pt({...ae(),[l]:u})},toggleCameraKey(){const l=le(),u=W(),d=Kt(u,l);J(d.length<u.length?d:Ge(u,l,ae()))},moveCameraKey(l,u){const{keys:d,t:m}=Qr(W(),l,u,X());return J(d),m},setCameraKeyPose(l,u){J(Ge(W(),l,u))},removeCameraKey(l){J(Kt(W(),l))},resetCamera(){J([])},atStart(){return f===0&&h===null&&A.size===0&&!P},layerInfo(l){const u=(C,B)=>{const Q=typeof C.motion=="string"?{kind:C.motion}:C.motion??{};return{kind:Q.kind??Ss(B),amount:Q.amount??1,speed:Q.speed??1}};if(l==="sky"){const C=gt();return C?{id:l,asset:C.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:[],label:we({},C,(document.documentElement.lang||"en").slice(0,2)),file:p.src??`${S.base}${C.file}`,motion:u(p,C)}:null}if(D(l)>=0){const C=T[D(l)],B=i.get(C.asset);return{id:l,asset:C.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:L.items().find(Q=>Q.id===l)?.label??"",file:C.src??(B?`${S.base}${B.file}`:null),motion:u(C,B)}}const d=v[ne(l)];if(!d)return null;const m=i.get(d.asset)??null,E=ze(ne(l)),z=!E||(d.scale??1)!==1||(d.keys??[]).some(C=>C.scale!==void 0),R=m?.layer==="bg"&&!m.tileable_x;return{id:l,asset:d.asset??null,depth:d.depth,figure:d.figure??null,role:m?.layer??null,ground:E,showScale:z,fields:E?["x","z",...z?["scale"]:[],"rotation","opacity"]:["x",...R?["z"]:[],"y","scale","rotation","opacity"],label:L.items().find(C=>C.id===l)?.label??we(d,m,(document.documentElement.lang||"en").slice(0,2)),file:d.src??(m?`${S.base}${m.file}`:null),motion:u(d,m),anim:rs(m),play:{speed:d.play?.speed??1,offset:d.play?.offset??0},ink:{outline:d.outline??0,etch:d.etch??0}}},setLayerInk(l,u){ne(l)>=0&&Qe(l,u)},setLayerPlay(l,u){const d=M(l);d&&Qe(l,{play:{...d.play??{},...u}})},setLayerMotion(l,u){const d=M(l);d&&Qe(l,{motion:{...typeof d.motion=="object"?d.motion:{kind:d.motion},...u}})},reorderLayers(l,u,d){if(!ze(u)){d(l,u,L.sceneId,null,null,null);return}const m=ke=>v[ke]?.z??se[v[ke]?.depth],E=l.filter(ke=>ke===u||ze(ke)),z=E.indexOf(u),R=E[z-1],C=E[z+1],B=Fe(u),Q=R===void 0?0:m(R),ye=C===void 0?1/0:m(C);if((R!==void 0||C!==void 0)&&(B<Q||B>ye)){const ke=Yt(pe(v[u],le()).x,B),Ys=R===void 0?ye/1.25:C===void 0?Q*1.25:(Q+ye)/2,et=Math.round(Math.min(re.cells[1][1],Math.max(re.cells[0][1],Ys))*100)/100,xt=hn(),Ks=(et-xt[1])/Math.max(.1,B-xt[1]),un=de=>cn(Math.min(20,Math.max(.01,de*Ks))),qs=v[u].keys?.some(de=>de.z!==void 0||de.scale!==void 0)?v[u].keys.map(de=>({...de,...de.z!==void 0&&{z:Math.min(re.cells[1][1],Math.max(re.cells[0][1],cn(de.z+et-B)))},...de.scale!==void 0&&{scale:un(de.scale)}})):null;d(l,u,L.sceneId,dt(nn(ke,et,xt)).x,et,un(v[u].scale??1),qs);return}d(l,u,L.sceneId,v[u].x??.5,m(u),v[u].scale??1)},library(){if(!S)return null;const l=(document.documentElement.lang||"en").slice(0,2);return{bundle:S.bundle,assets:S.assets.filter(u=>u.kind!=="sheet").map(u=>({id:u.id,layer:u.layer,shelf:ai(u),anim:rs(u),band:Ut(u),tags:u.tags??[],url:S.base+u.file,thumb:U(u),label:we({},u,l)}))}},tiles:l=>$s(l),seriesOfLayer(l){const u=i.get(v[ne(l)]?.asset),d=Ze(u);if(!d||!S)return null;const m=(document.documentElement.lang||"en").slice(0,2),E=z=>({id:z.id,url:S.base+z.file,thumb:U(z),...Re(z)});return{series:d,asset:u.id,members:zr(S.assets,u).map(E),characters:Fr(S.assets).map(z=>({series:z.series,url:S.base+z.asset.file,thumb:U(z.asset),label:we({},z.asset,m)}))}},async switchCharacter(l,u){const d=i.get(v[ne(l)]?.asset),m=d&&S?Tr(S.assets,d,u):null;m&&await L.swapAsset(l,m.id)},async swapAsset(l,u){if(l==="sky"){if(i.get(u)?.layer!=="sky"||gt()?.id===u)return;await L.show({...r,set:{..._e(),sky:u}}),L.sceneId!=null&&t.onCommit?.(0,{sky:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const d=T[D(l)];if(d){const E=i.get(u);if(!E||!Ut(E)||d.asset===u)return;const z=Number(l.slice(5)),R=T.map((C,B)=>B===z?{...C,asset:u}:C);await L.show({...r,set:{..._e(),groundBands:R}}),L.sceneId!=null&&t.onCommit?.(0,{band:{index:z,asset:u}},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L.select(l);return}const m=ne(l);m<0||!v[m]||!i.has(u)||v[m].asset===u||(v=v.map((E,z)=>z===m?{...E,asset:u}:E),await L.show({...r,set:_e()}),t.onCommit?.(m,{asset:u},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(l,u=null){const d=i.get(l);if(!d)return;const m=["mid","fg","near","bg","sky"].includes(d.layer)?d.layer:d.layer==="figure"?"fg":"mid",E=u?0:v.filter(R=>R.asset===l).length;let z={asset:l,depth:m,x:.5+.08*(E%5),scale:1};if(!(d.tileable_x||d.layer==="bg"||d.layer==="sky")){const R=u&&s?qn(s.pointerRay(u.x,u.y),rn({},d)?0:B=>s.groundHeightAt(B)):null,C=dt(jt(R??Yt(z.x,se[m])));z={...z,...C,depth:bn(C.z)}}if(!u&&d.layer==="figure"&&s){const R=v.flatMap((B,Q)=>i.get(B.asset)?.layer==="figure"&&!A.has(`layer-${Q}`)?[{index:Q,box:s.layerBox(Q)}]:[]),C=Gr(R,N?.selected??null);if(C!==null){const B=pe(v[C],le());z={asset:l,depth:v[C].depth,x:B.x,...Number.isFinite(B.y)?{y:B.y}:{},z:Fe(C),scale:B.scale??1}}}v=[...v,z],await L.show({...r,set:_e()}),t.onCommit?.(v.length-1,{add:z},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),N?.select(v.length-1,!0)},async settleBand(l){const u=v[l];if(!u||!ze(l))return;const d=bn(Fe(l));if(d===u.depth)return;v=v.map((E,z)=>z===l?{...E,depth:d}:E);const m=A;await L.show({...r,set:_e()}),A=m,ie(),L.sceneId!=null&&t.onCommit?.(l,{depth:d},L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),N?.select(l,!1)},groundSlots(){if(!S||!r)return null;const l=(document.documentElement.lang||"en").slice(0,2),u=_s(r.set??{},S).map(m=>({asset:m.asset.id,from_m:m.from})),d=S.assets.filter(m=>m.layer==="ground").map(m=>({id:m.id,label:we({},m,l),thumb:U(m)}));return{rows:u,options:d,max:Ht}},async setGroundSlots(l){if(!r||!Array.isArray(l))return;const u=l.slice(0,Ht).map((m,E)=>({asset:String(m.asset),from_m:E===0?0:Math.max(0,Math.min(2e3,Number(m.from_m)||0))})),d=A;await L.show({...r,look:Z,set:{..._e(),groundSlots:u}}),A=d,ie(),L.sceneId!=null&&t.onGroundSlots?.(u,L.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},lookControls(){return os.map(l=>{const[u,d,m]=Ia[l]??[0,1,.01];return{key:l,min:u,max:d,step:m,value:ce({...Wt,...Z},l)}})},setLook(l,u){!os.includes(l)||!Number.isFinite(u)||!s||(Z={...Z,[l]:u},s.setLook(Z),t.onLook?.(l,u,L.sceneId))},async still(l=480){if(!s||!o||!n.width)return null;await s.scene.whenReadyAsync();const u=()=>{const d=document.createElement("canvas");return d.width=l,d.height=Math.max(1,Math.round(l*n.height/n.width)),d.getContext("2d").drawImage(n,0,0,d.width,d.height),d.toDataURL("image/jpeg",.72)};return s.engine.resize(),te++,s.gridHidden=!0,new Promise(d=>{let m=0;const E=C=>{s.engine.onEndFrameObservable.remove(z),clearTimeout(R),s.gridHidden=--te>0,d(C)},z=s.engine.onEndFrameObservable.add(()=>{++m>=6&&E(u())}),R=setTimeout(()=>E(null),4e3)})},get config(){return r},figureBox(l){const u=v.find(z=>z.figure===l);if(!u?.asset)return null;const d=wr(o,u,c.get(u.asset)??1.7,le());if(!d)return null;const m=n.getBoundingClientRect(),E=m.width*.05;return new DOMRect(m.left+d.x*m.width-E/2,m.top+d.y*m.height,E,m.height*.08)},items:()=>{const l=(document.documentElement.lang||"en").slice(0,2),u=Er([...v.map((d,m)=>we(d,i.get(d.asset),l)||`layer ${m+1}`),...T.map(d=>we({},i.get(d.asset)??{id:d.asset},l))]);return[...v.map((d,m)=>({id:`layer-${m}`,label:u[m],icon:_r(i.get(d.asset)),depth:d.depth,z:d.z??se[d.depth],keys:d.keys??[]})),...T.map((d,m)=>({id:`band-${m}`,label:u[v.length+m],icon:"photo",depth:"bg",z:d.z,keys:d.keys??[],backdrop:!0})),...r?.set?.sky?[{id:"sky",label:si[l]??"Sky",icon:"cloud",depth:"sky",keys:p.keys??[],backdrop:!0}]:[],{id:"camera",label:oi[l]??"Camera",icon:"camera",depth:null,keys:[]}]},destroy(){g=!0,window.removeEventListener("stage25d-cutouts",oe),delete e.dataset.stage25dReady;try{s?.engine.stopRenderLoop(),s?.scene.dispose(),s?.engine.dispose()}catch{}N?.destroy(),n.remove()}};return L}export{is as DROP_TYPE,os as LOOK_KEYS,bi as createStage25d,ci as stageScene,as as withCutouts};
