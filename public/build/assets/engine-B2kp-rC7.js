import{m as $t,c as Gt,M as Ke,S as Ee,R as wt,C as ee,T as X,V as C,E as G,a as bt,b as ie,P as Yt,d as Qe,e as Xt,f as Kt,g as Zt,h as qt,U as Jt,H as Qt,D as en}from"./babylon-BEUo0Gn_.js";import{l as tn}from"./config-qjtb2AOJ.js";import{handleCss as nn}from"./ArtworkOverlay-BYcCxOMN.js";import"./vite-helpers-DqutJMZx.js";import"./properties-wf1blxyK.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-azlEwtgJ.js";import"./ambient-CEzLlAaX.js";const he=new Set;let Ve=!1;function on(e,t,n=2){const o=t&&t.length,s=o?t[0]*n:e.length;he.size&&he.clear();let r=kt(e,0,s,n,!0);const a=[];if(!r||r.next===r.prev)return a;let i=0,l=0,u=0;if(o&&(r=cn(e,t,r,n)),e.length>80*n){i=e[0],l=e[1];let h=i,g=l;for(let v=n;v<s;v+=n){const c=e[v],y=e[v+1];c<i&&(i=c),y<l&&(l=y),c>h&&(h=c),y>g&&(g=y)}u=Math.max(h-i,g-l),u=u!==0?32767/u:0}return Ue(r,a,i,l,u),a}function kt(e,t,n,o,s){let r=null;if(s===kn(e,t,n,o)>0)for(let a=t;a<n;a+=o)r=nt(a/o|0,e[a],e[a+1],r);else for(let a=n-o;a>=t;a-=o)r=nt(a/o|0,e[a],e[a+1],r);return r&&ue(r,r.next)&&(fe(r),r=r.next),r}function J(e,t=e){const n=t===e;let o=e,s;do s=!1,o!==o.next&&(he.size===0||!he.has(o))&&(ue(o,o.next)||B(o.prev,o,o.next)===0)?((n||o===t)&&(t=o.prev),Ve=!0,fe(o),o=o.prev,s=!0):(n||o!==t)&&(o=o.next,s=!n);while(s||o!==t);return t}function Ue(e,t,n,o,s){s&&gn(e,n,o,s);let r=e,a=!1;for(;e.prev!==e.next;){const i=e.prev,l=e.next;if(B(i,e,l)<0&&(s?sn(e,n,o,s):an(e))){t.push(i.i,e.i,l.i),fe(e),e=l,r=l;continue}if(e=l,e===r){if(Ve=!1,e=J(e),Ve){r=e;continue}if(!a){e=rn(e,t),r=e,a=!0;continue}ln(e,t,n,o,s);break}}}function an(e){const t=e.prev,n=e,o=e.next,s=t.x,r=n.x,a=o.x,i=t.y,l=n.y,u=o.y,h=Math.min(s,r,a),g=Math.min(i,l,u),v=Math.max(s,r,a),c=Math.max(i,l,u);let y=o.next;for(;y!==t;){if(y.x>=h&&y.x<=v&&y.y>=g&&y.y<=c&&!(s===y.x&&i===y.y)&&Me(s,i,r,l,a,u,y.x,y.y)&&B(y.prev,y,y.next)>=0)return!1;y=y.next}return!0}function sn(e,t,n,o){const s=e.prev,r=e,a=e.next,i=s.x,l=r.x,u=a.x,h=s.y,g=r.y,v=a.y,c=Math.min(i,l,u),y=Math.min(h,g,v),p=Math.max(i,l,u),L=Math.max(h,g,v),P=je(c,y,t,n,o),O=je(p,L,t,n,o);let b=e.prevZ;for(;b&&b.z>=P;){if(b.x>=c&&b.x<=p&&b.y>=y&&b.y<=L&&b!==a&&!(i===b.x&&h===b.y)&&Me(i,h,l,g,u,v,b.x,b.y)&&B(b.prev,b,b.next)>=0)return!1;b=b.prevZ}let F=e.nextZ;for(;F&&F.z<=O;){if(F.x>=c&&F.x<=p&&F.y>=y&&F.y<=L&&F!==a&&!(i===F.x&&h===F.y)&&Me(i,h,l,g,u,v,F.x,F.y)&&B(F.prev,F,F.next)>=0)return!1;F=F.nextZ}return!0}function rn(e,t){let n=e,o=!1;do{const s=n.prev,r=n.next.next;Ft(s,n,n.next,r,!1)&&de(s,r)&&de(r,s)&&(t.push(s.i,n.i,r.i),fe(n),fe(n.next),n=e=r,o=!0),n=n.next}while(n!==e);return o?J(n):n}function ln(e,t,n,o,s){let r=e;do{let a=r.next.next;for(;a!==r.prev;){if(r.i!==a.i&&yn(r,a)){let i=Et(r,a);r=J(r,r.next),i=J(i,i.next),Ue(r,t,n,o,s),Ue(i,t,n,o,s);return}a=a.next}r=r.next}while(r!==e)}let Ne=!1;function cn(e,t,n,o){const s=[];for(let r=0,a=t.length;r<a;r++){const i=t[r]*o,l=r<a-1?t[r+1]*o:e.length,u=kt(e,i,l,o,!1);u===u.next&&he.add(u),s.push(vn(u))}s.sort(hn),dn(e.length/o,t.length),St(n,n),Ne=!0;for(let r=0;r<s.length;r++)n=un(s[r],n);return Ne=!1,J(n)}function hn(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function un(e,t){const n=pn(e,t);if(!n)return t;const o=Et(n,e),s=o.next;return St(n,s.next),J(o,o.next),J(n,n.next)}const Mt=16;let z=new Float64Array(0),ke=0;const He=[],We=[];function dn(e,t){const n=Math.ceil((e+2*t)/Mt)+t+2;z.length<n*4&&(z=new Float64Array(n*4)),ke=0}function St(e,t){let n=e;do{const o=ke++;He[o]=n;let s=1/0,r=1/0,a=-1/0,i=-1/0,l=0;do{const h=n.next;n.z=o,n.x<s&&(s=n.x),n.x>a&&(a=n.x),n.y<r&&(r=n.y),n.y>i&&(i=n.y),h.x<s&&(s=h.x),h.x>a&&(a=h.x),h.y<r&&(r=h.y),h.y>i&&(i=h.y),n=h}while(++l<Mt&&n!==t);We[o]=n;const u=o*4;z[u]=s,z[u+1]=r,z[u+2]=a,z[u+3]=i}while(n!==t)}function fn(e,t){const n=e.z*4;t.x<z[n]&&(z[n]=t.x),t.y<z[n+1]&&(z[n+1]=t.y),t.x>z[n+2]&&(z[n+2]=t.x),t.y>z[n+3]&&(z[n+3]=t.y)}function et(e){let t=We[e];for(;t.prev.next!==t;)t=t.next;return We[e]=t,t}function tt(e){let t=He[e];for(;t.prev.next!==t;)t=t.next;return He[e]=t,t}function pn(e,t){let n=t;const o=e.x,s=e.y;let r=-1/0,a;if(ue(e,n))return n;for(let v=0,c=0;v<ke;v++,c+=4){if(s<z[c+1]||s>z[c+3]||z[c]>o||z[c+2]<=r)continue;const y=et(v);n=tt(v);do{if(n.prev.next===n){if(ue(e,n.next))return n.next;if(s<=n.y&&s>=n.next.y&&n.next.y!==n.y){const p=n.x+(s-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(p<=o&&p>r&&(r=p,a=n.x<n.next.x?n:n.next,p===o))return a}}n=n.next}while(n!==y)}if(!a)return null;const i=a.x,l=a.y,u=Math.min(s,l),h=Math.max(s,l);let g=1/0;for(let v=0,c=0;v<ke;v++,c+=4){if(z[c+2]<i||z[c]>o||z[c+3]<u||z[c+1]>h)continue;const y=et(v);n=tt(v);do{if(n.prev.next===n&&o>=n.x&&n.x>=i&&o!==n.x&&Me(s<l?o:r,s,i,l,s<l?r:o,s,n.x,n.y)){const p=Math.abs(s-n.y)/(o-n.x);(de(n,e)||n.y===s&&n.next.y===s&&n.next.x>o)&&(p<g||p===g&&(n.x>a.x||n.x===a.x&&mn(a,n)))&&(a=n,g=p)}n=n.next}while(n!==y)}return a}function mn(e,t){return B(e.prev,e,t.prev)<0&&B(t.next,e,e.next)<0}const W=[];let te=[],q=new Uint32Array(0),ne=new Uint32Array(0);const oe=new Uint32Array(256);function gn(e,t,n,o){let s=e,r=0;do s.z=je(s.x,s.y,t,n,o),W[r++]=s,s=s.next;while(s!==e);xn(r);let a=null;for(let i=0;i<r;i++){const l=W[i];l.prevZ=a,a&&(a.nextZ=l),a=l}a.nextZ=null}function xn(e){if(e<=32){for(let t=1;t<e;t++){const n=W[t],o=n.z;let s=t-1;for(;s>=0&&W[s].z>o;)W[s+1]=W[s],s--;W[s+1]=n}return}q.length<e&&(q=new Uint32Array(e),ne=new Uint32Array(e),te=new Array(e));for(let t=0;t<e;t++)q[t]=W[t].z;me(e,W,q,te,ne,0),me(e,te,ne,W,q,8),me(e,W,q,te,ne,16),me(e,te,ne,W,q,24)}function me(e,t,n,o,s,r){oe.fill(0);for(let i=0;i<e;i++)oe[n[i]>>>r&255]++;let a=0;for(let i=0;i<256;i++){const l=oe[i];oe[i]=a,a+=l}for(let i=0;i<e;i++){const l=n[i],u=oe[l>>>r&255]++;o[u]=t[i],s[u]=l}}function je(e,t,n,o,s){return e=(e-n)*s|0,t=(t-o)*s|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function vn(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function Me(e,t,n,o,s,r,a,i){return(s-a)*(t-i)>=(e-a)*(r-i)&&(e-a)*(o-i)>=(n-a)*(t-i)&&(n-a)*(r-i)>=(s-a)*(o-i)}function yn(e,t){const n=ue(e,t)&&B(e.prev,e,e.next)>0&&B(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||de(e,t)&&de(t,e)&&(B(e.prev,e,t.prev)!==0||B(e,t.prev,t)!==0))&&!wn(e,t)&&(n||bn(e,t))}function B(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function ue(e,t){return e.x===t.x&&e.y===t.y}function Ft(e,t,n,o,s=!0){const r=B(e,t,n),a=B(e,t,o),i=B(n,o,e),l=B(n,o,t);return(r>0&&a<0||r<0&&a>0)&&(i>0&&l<0||i<0&&l>0)?!0:s?!!(r===0&&ge(e,n,t)||a===0&&ge(e,o,t)||i===0&&ge(n,e,o)||l===0&&ge(n,t,o)):!1}function ge(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function wn(e,t){const n=Math.min(e.x,t.x),o=Math.max(e.x,t.x),s=Math.min(e.y,t.y),r=Math.max(e.y,t.y);let a=e;do{const i=a.next;if(a.x>o&&i.x>o||a.x<n&&i.x<n||a.y>r&&i.y>r||a.y<s&&i.y<s){a=i;continue}if(a.i!==e.i&&i.i!==e.i&&a.i!==t.i&&i.i!==t.i&&Ft(a,i,e,t))return!0;a=i}while(a!==e);return!1}function de(e,t){return B(e.prev,e,e.next)<0?B(e,t,e.next)>=0&&B(e,e.prev,t)>=0:B(e,t,e.prev)<0||B(e,e.next,t)<0}function bn(e,t){let n=e,o=!1;const s=(e.x+t.x)/2,r=(e.y+t.y)/2;do{const a=n.next;n.y>r!=a.y>r&&s<(a.x-n.x)*(r-n.y)/(a.y-n.y)+n.x&&(o=!o),n=a}while(n!==e);return o}function Et(e,t){const n=$e(e.i,e.x,e.y),o=$e(t.i,t.x,t.y),s=e.next,r=t.prev;return e.next=t,t.prev=e,n.next=s,s.prev=n,o.next=n,n.prev=o,r.next=o,o.prev=r,o}function nt(e,t,n,o){const s=$e(e,t,n);return o?(s.next=o.next,s.prev=o,o.next.prev=s,o.next=s):(s.prev=s,s.next=s),s}function fe(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),Ne&&fn(e.prev,e.next)}function $e(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function kn(e,t,n,o){let s=0;for(let r=t,a=n-o;r<n;r+=o)s+=(e[a]-e[r])*(e[r+1]+e[a+1]),a=r;return s}Object.assign(window,{BABYLON:{...Gt,...$t},earcut:on});(()=>{const e=`
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
    }`})();const Mn=new WeakMap;function Sn(e){return Mn.get(e)?.rtt??null}const Fn=450,ot=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],at=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],st={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},En={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function An(e,t,n){const o=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),s=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),r=e.enableGeometryBufferRenderer(),a=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(b=>b.name!=="sky-cloud"&&!(b.metadata&&b.metadata.noGBuffer)))}),i=r.getGBuffer().textures,l=i[r.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],u=i[r.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=b=>new BABYLON.Vector2(1/b.width,1/b.height),g=new BABYLON.Matrix,v=["invView","tanHalf","resolution","skyDepth"],c=["depthSampler","normalSampler"];function y(b,F){t.getViewMatrix().invertToRef(g);const R=Math.tan(t.fov/2);b.setMatrix("invView",g),b.setVector2("tanHalf",new BABYLON.Vector2(R*F.width/F.height,R)),b.setVector2("resolution",new BABYLON.Vector2(F.width,F.height)),b.setFloat("skyDepth",Fn),b.setTexture("depthSampler",l),b.setTexture("normalSampler",u)}const p=new BABYLON.PostProcess("wash","wash",["texel","radius",...v],c,1,t);p.onApply=b=>{y(b,p),b.setVector2("texel",h(p)),b.setFloat("radius",n.num("wash"))};const L=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...ot,...v],["aquarelSampler",...c],1,t);L.onApply=b=>{y(b,L),b.setVector2("texel",h(L));const F=n.texture();b.setFloat("useTex",F?1:0),b.setTexture("aquarelSampler",F||o),ot.forEach(R=>b.setFloat(R,n.num(R)))};const P=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...at,...v],["washSampler","animeSampler",...c],1,t);P.onApply=b=>{y(b,P),b.setTextureFromPostProcessOutput("washSampler",p),b.setTexture("animeSampler",Sn(e)||s),b.setVector2("texel",h(P)),at.forEach(F=>b.setFloat(F,n.num(F))),b.setColor3("inkColor",BABYLON.Color3.FromArray(st[n.inkColor()]||st["blue-grey"]))};const O=[p,L,P];return{dispose(){O.forEach(b=>b.dispose(t)),e.onBeforeRenderObservable.remove(a),e.disableGeometryBufferRenderer(),o.dispose(),s.dispose()}}}const j={sky:380,bg:70,mid:22,fg:7,near:3.5},U={x:0,y:1.6,z:0,fov:50},Ae=-2,At=16/9,Tt=.42,Te=1.6,Tn=3,Ln=e=>Tn*Z(e),Dn=(e,t)=>t*e,Pn=(e,t,n,o)=>Dn(e,t)-(1-o)*n,Lt=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,_n=999,zn=1e3,Cn=.02,Dt=.05,K=e=>e>Math.PI?e*Math.PI/180:e,Z=(e,t=U.fov,n=At)=>2*e*Math.tan(K(t)/2)*n;function ae(e,t,n,o=0){const s=t.depth,r=j[s]-n*Dt,a=Z(r),i=s==="sky"?n*2+1:Lt(r);if(e.layer==="sky"){const y=a*Te,p=y/At,L=-p*.12;if(e.tileable_x)return{x:0,y:L,z:r,w:y,h:p,uRepeat:y/(p*(e.w/e.h)),alphaIndex:i,rotation:0};const P=Math.max(y/e.w,p/e.h);return{x:0,y:L,z:r,w:e.w*P,h:e.h*P,uRepeat:1,alphaIndex:i,rotation:0}}const l=e.layer==="bg"&&!e.tileable_x?a*Te*e.h/e.w:0,u=Math.max(e.height_m*(t.scale??1),l),h=u*(e.w/e.h),g=e.tileable_x?Math.max(h,a*Te):h,v=e.tileable_x?0:((t.x??.5)-.5)*a,c=s==="sky"?r*Math.tan(K(U.fov)/2)*.45:s==="bg"?o:0;return{x:v,y:c+(t.y??0),z:r,w:g,h:u,uRepeat:e.tileable_x?g/h:1,alphaIndex:i,rotation:t.rotation??0}}function On(e,t,n=0,o=Tt,s=Ae){const r=.5/Math.tan(K(U.fov)/2),a=.5+r*Math.tan(-s*Math.PI/180),i=j.bg-n*Dt,l=U.y+(a-o)*i/r;return Math.round((l-t*(1-e))*10)/10}const rt=e=>e-Bn,Bn=.002,it={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},Pt=(e,t)=>(it[e??"inOut"]??it.inOut)(Math.min(1,Math.max(0,t))),se=(e,t,n)=>e+(t-e)*n,_t=e=>e.dur_s??(e.camera&&$n(e)||e.est_s||8);function zt(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),o=[...n].reverse().find(s=>(s.at_s??0)<=t)??n[0]??null;return{cam:o,t:o?t-(o.at_s??0):t}}function Ct(e,t,n){if(!e)return{...U,fov:K(U.fov)};const o=Pt(e.ease,n>0?t/(e.dur_s??n):1),s={...U,...e.from},r={...s,...e.to};return{x:se(s.x,r.x,o),y:se(s.y,r.y,o),z:se(s.z,r.z,o),fov:se(K(s.fov),K(r.fov),o)}}const Rn=["x","y","scale","opacity","rotation"];function Se(e,t){const n={x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},o=e.keys??[];if(!o.length)return n;const s={...n};for(const r of Rn){const a=o.filter(v=>v[r]!==void 0).sort((v,c)=>v.t-c.t);if(!a.length)continue;const i=a[0],l=a[a.length-1];if(t<=i.t){s[r]=i[r];continue}if(t>=l.t){s[r]=l[r];continue}const u=a.findIndex(v=>v.t>t),h=a[u-1],g=a[u];s[r]=se(h[r],g[r],Pt("inOut",(t-h.t)/(g.t-h.t)))}return s}const In={none:0,sway:1,drift:2,ripple:3,flicker:4};function Vn(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??e.motion??"none",amount:n.amount??1,speed:n.speed??1}}const Un=.25,Nn=2e3,Hn=250,Q={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},lt={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function Wn(e,t,n,o){const s=i=>{const l=e.lastDir&&e.lastDir!==i?e.flips+1:e.flips;return{...e,notches:e.notches+i,fast:0,lastChange:n,lastDir:i,flips:l,lastUp:i===-1?n:e.lastUp,locked:e.locked||l>=Q.lockFlips&&i===1}};if(t<Q.downFps)return o?s(1):{...e,fast:0};if(t<Q.upFps)return{...e,fast:0};const r=e.fast+1;return e.notches>0&&!e.locked&&r>=Q.upWindows&&n-e.lastChange>=Q.upAfterChangeMs&&n-e.lastUp>=Q.upEveryMs?s(-1):{...e,fast:r}}function jn(e,t,n,o){const s=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),s-o*Un)}function $n(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const ct={breath_m:.05,breath_s:7},Gn=1.5;function Yn(e,t,n={}){const o=n.breath_m??ct.breath_m,s=2*Math.PI/Math.max(.5,n.breath_s??ct.breath_s),r=Math.min(1,t/Gn),a=r*r*(3-2*r);return{...e,x:e.x+o*a*Math.sin(s*t),y:e.y+o*.5*a*Math.sin(2*s*t)}}async function Xn(e){const t=await fetch(e);if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const Kn=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function le(e,t,n){if(t.asset){const a=e.assets.find(i=>i.id===t.asset);if(a)return a}const o=Kn(t.need??t.asset??"");if(!o.length)return null;let s=null,r=[0,0,0];for(const a of[...e.assets].sort((i,l)=>i.id.localeCompare(l.id))){const i=o.filter(u=>a.tags.some(h=>h.toLowerCase()===u)).length;if(!i)continue;const l=[i,n&&a.layer===n?1:0,a.qa?.score??0];(!s||l[0]>r[0]||l[0]===r[0]&&(l[1]>r[1]||l[1]===r[1]&&l[2]>r[2]))&&(s=a,r=l)}return s}const re="#f6f5ee",Zn=.22,qn=(e,t)=>e.layer==="bg"?t.feather??Zn:0,Le=.6,Ot=12;function Jn(e,t){const n=t.paper??re,o=e.ground;if(o&&o.startsWith("#"))return{kind:"paper",colour:o};const s=t.assets.filter(a=>a.layer==="ground");if(!o)return s.length?{kind:"asset",asset:[...s].sort((a,i)=>a.id.localeCompare(i.id))[0]}:{kind:"paper",colour:n};const r=le({...t,assets:s},{asset:o},"ground");return r?{kind:"asset",asset:r}:{kind:"paper",colour:n,reason:`no ground for ${o}`}}function Qn(e,t,n,o=.08){return Bt(e,t,n,1-o,1)}function Bt(e,t,n,o,s){const r=Math.max(0,Math.floor(n*o)),a=Math.min(n,Math.max(r+1,Math.ceil(n*s))),i=[[],[],[]],l=Math.max(1,Math.floor(t*(a-r)/2e4));for(let h=r*t;h<a*t;h+=l){const g=h*4;e[g+3]<200||(i[0].push(e[g]),i[1].push(e[g+1]),i[2].push(e[g+2]))}if(!i[0].length)return null;const u=h=>{const g=[...h].sort((v,c)=>v-c);return g[g.length>>1]/255};return[u(i[0]),u(i[1]),u(i[2])]}const ce=32,eo=(e,t,n)=>Array.from({length:ce},(o,s)=>Bt(e,t,n,s/ce,(s+1)/ce)),to=(e,t)=>e[Math.min(ce-1,Math.max(0,Math.floor((1-t)*ce)))]??null;function no(e,t,n){const o=[],s=Math.max(1,Math.floor(t*n/6e4));for(let r=0;r<t*n;r+=s){const a=r*4;if(e[a+3]<230)continue;const i=(.299*e[a]+.587*e[a+1]+.114*e[a+2])/255;i<.45&&o.push(i)}return o.length<20?null:(o.sort((r,a)=>r-a),o[o.length>>1])}function oo(e,t,n){const o=[];for(let s=0;s<t;s++)for(let r=0;r<n;r++)if(e[(r*t+s)*4+3]>128){o.push(r/n);break}return o.length?(o.sort((s,r)=>s-r),o[o.length>>1]):0}function ao(e,t,n){for(let o=0;o<n;o++){let s=0;for(let r=0;r<t;r++)e[(o*t+r)*4+3]>128&&s++;if(s/t>.5)return o/n}return 0}const so=1.6,ro=.12;function io(e,t,n,o){const s=e.layer==="figure",r=s?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),a=r*ro*o/so;return s?{w:r,d:Math.min(a,r*.5)}:{w:r,d:Math.min(Math.max(a,r*.3),r*3)}}const lo=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,xe=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Ze=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,Rt=Ze;G.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;G.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, nearTex;
  uniform float useTex, tile, grain, fadeNear, fadeFar, detail, vary, mixTile;
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${Ze}
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
  }`;G.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;G.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${Ze}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const co=e=>e?X.WRAP_ADDRESSMODE:X.MIRROR_ADDRESSMODE;function ho(e){const t=Ke.CreateGround("ground",{width:2400,height:2400},e),n=new Ee("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tile","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","nearTex"],needAlphaBlending:!0}),o=new wt(new Uint8Array([255,255,255,255]),1,1,ee.TEXTUREFORMAT_RGBA,e);n.setTexture("tex",o).setTexture("nearTex",o),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0);let s=Ot,r=1;return t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=_n,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(a){a.tex&&(a.tex.wrapU=X.WRAP_ADDRESSMODE,a.tex.wrapV=X.WRAP_ADDRESSMODE),n.setTexture("tex",a.tex??o),s=a.tile,n.setFloat("useTex",a.tex?1:0).setFloat("tile",s*r).setFloat("grain",a.grain).setFloat("fadeNear",a.fadeNear).setFloat("fadeFar",a.fadeFar).setVector3("base",C.FromArray(a.base)).setVector3("horizonTint",C.FromArray(a.tint))},follow(a){n.setVector3("camPos",a)},live(a){r=a.tileScale,n.setFloat("detail",a.detail).setFloat("vary",a.vary).setFloat("mixTile",a.mixTile).setFloat("tile",s*r)},near(a){n.setFloat("useNear",a?1:0),a&&(a.tex.wrapU=co(a.tileable),a.tex.wrapV=X.CLAMP_ADDRESSMODE,n.setTexture("nearTex",a.tex).setMatrix("nearVP",a.vp).setFloat("nearTop",a.top).setFloat("nearSpan",a.span))}}}let uo=0;function ht(e,t,n,o,s){const r=Ke.CreatePlane(`stain${s?"-cast":""}:${e.name}`,{width:t,height:s?s.length:n},o);if(r.rotation.x=Math.PI/2,s){const[i,l]=s.dir,u=Math.hypot(i,l)||1;r.rotation.y=Math.atan2(i/u,l/u),r.position.set(i/u*s.length*.42,.015,l/u*s.length*.42)}else r.position.set(0,.02,-n*.18);r.parent=e;const a=new Ee(r.name,o,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return a.alphaMode=ee.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,a.setFloat("seed",uo++*7.31%97).setFloat("opacity",0),r.material=a,r.metadata={noGBuffer:!0},r.isPickable=!1,{mesh:r,setOpacity:i=>{a.setFloat("opacity",i),r.isVisible=i>.001}}}G.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;G.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${Rt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;G.ShadersStore.stageBirdFragmentShader=`
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
  }`;function It(e,t,n,o){const s=Ke.CreatePlane(e,{size:1},n),r=new Ee(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return r.alphaMode=ee.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1,s.material=r,s.billboardMode=bt.BILLBOARDMODE_ALL,s.alphaIndex=o,s.metadata={noGBuffer:!0},s.isPickable=!1,{mesh:s,mat:r}}const Vt=9,fo=9;function po(e,t,n,o){const s=Array.from({length:Vt},(r,a)=>{const i=It(`smoke:${a}`,"stagePuff",e,o);return i.mat.setFloat("seed",a*3.7),i});return{update(r,a){s.forEach(({mesh:i,mat:l},u)=>{const h=mo(r,u),g=n*(.6+3.2*h);i.scaling.setAll(g),i.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(u*2.1+r*.3),t.y+n*(.4+7*h),t.z),l.setFloat("alpha",a*.7*Math.sin(Math.PI*h)),i.isVisible=a>.001})},dispose(){s.forEach(({mesh:r,mat:a})=>{a.dispose(),r.dispose()})}}}const mo=(e,t)=>((e/fo+t/Vt)%1+1)%1,De=40,ut=16;function go(e){const t=(e%De+De)%De;return t<ut?t/ut:null}function xo(e,t,n,o){const s=Array.from({length:6},(r,a)=>It(`bird:${a}`,"stageBird",e,o));return{update(r,a){const i=go(r),l=Math.round(2+a*4);s.forEach(({mesh:u,mat:h},g)=>{if(u.isVisible=a>.001&&i!==null&&g<l,!u.isVisible||i===null)return;const v=g*.025;u.position.set((i-v-.5)*n*1.2,22+3*Math.sin(g*1.7)+4*i,t+g*1.5),u.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,a*2)).setFloat("flap",Math.sin(r*7+g*1.3))})},dispose(){s.forEach(({mesh:r,mat:a})=>{a.dispose(),r.dispose()})}}}const dt=["fire","hearth","chimney","smoke"],vo=e=>e.id.split(/[-_]/).some(t=>dt.includes(t))||e.tags.some(t=>dt.includes(t.toLowerCase())),Pe=e=>e[0].toUpperCase()+e.slice(1),yo=e=>({fade:`lineFade${Pe(e)}`,thin:`lineThin${Pe(e)}`,haze:`haze${Pe(e)}`}),Fe={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:Ae,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},wo=[1.05,1,.9],bo=[.88,.93,1.05],ko=.35;function Mo(e,t,n,o){const s=t==="sky";return{edgeSoft:s?0:V(e,"edgeSoft"),footM:t==="standing"?ko:0,grounding:t==="figure"?0:V(e,"grounding"),grass:t==="figure"?0:V(e,"grassOverlap"),light:s?0:V(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:s?V(e,"cloudDrift"):0,footTint:o}}const Ut=[.93,.86,.74],ft=e=>({paper:V(e,"sheetPaper"),grain:V(e,"sheetGrain"),patches:V(e,"sheetPatches"),wash:V(e,"sheetWash"),washColour:Ut}),So={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01]},Fo=Object.fromEntries(Object.keys(Fe).map(e=>[e,So[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),Y=(e,t)=>V(e,t),V=(e,t)=>{const n=Number(e[t]??Fe[t]);return Number.isFinite(n)?n:Fe[t]};function _e(e,t){const n=yo(t);return{fade:V(e,n.fade),thin:V(e,n.thin),haze:V(e,n.haze),brown:V(e,"lineBrown"),ink:V(e,"lineInk"),norm:V(e,"lineNorm")}}const Eo=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),ze=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),ve=(e,t,n,o,s)=>{const r=o*(1080/s);return[n/Math.max(e*r,.001),1/Math.max(t*r,.001)]};function Ao(e,t,n){const o=new C(U.x,U.y,U.z),s=ie.RotationX(e*Math.PI/180),a=ie.LookAtLH(o,o.add(C.TransformNormal(new C(0,0,1),s)),C.TransformNormal(C.Up(),s)).multiply(ie.PerspectiveFovLH(K(U.fov),t,.1,2e3));return{vp:a,top:C.TransformCoordinates(new C(0,0,n),a).y}}G.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function To(e,t){const n=new Yt("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=o=>{o.setFloat("wash",t("sheetWash")).setVector3("washColour",C.FromArray(Ut))},n}const Lo=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Do=`
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
  }`;G.ShadersStore.stageLayerVertexShader=`
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
  }`;G.ShadersStore.stageLayerFragmentShader=`
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
  ${Rt}
  ${Lo}
  ${Do}
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
  }`;const Ce=new Map,Nt=new Map,Ht=new Map,Wt=new Map,jt=new Map,Ge=new Map;function ye(e,t){const n=Ce.get(e);if(n)return n;const o=new Promise((s,r)=>{const a=new Image;a.crossOrigin="anonymous",a.onerror=()=>r(new Error(`layer image ${e} did not load`)),a.onload=()=>{const i=document.createElement("canvas");i.width=a.naturalWidth,i.height=a.naturalHeight;const l=i.getContext("2d",{willReadFrequently:!0});l.drawImage(a,0,0);const u=l.getImageData(0,0,i.width,i.height).data,h=Qn(u,i.width,i.height);h&&Nt.set(e,h),Ge.set(e,eo(u,i.width,i.height)),Ht.set(e,ao(u,i.width,i.height)),Wt.set(e,oo(u,i.width,i.height));const g=no(u,i.width,i.height);g!==null&&jt.set(e,g);for(let c=0;c<u.length;c+=4){const y=u[c+3]/255;u[c]=Math.round(u[c]*y),u[c+1]=Math.round(u[c+1]*y),u[c+2]=Math.round(u[c+2]*y)}const v=new wt(u,i.width,i.height,ee.TEXTUREFORMAT_RGBA,t,!0,!1,X.TRILINEAR_SAMPLINGMODE);v.anisotropicFilteringLevel=8,v.wrapV=X.CLAMP_ADDRESSMODE,s(v)},a.src=e});return Ce.set(e,o),o.catch(()=>Ce.delete(e)),o}const Oe=24;function Po(e,t,n,o,s){const[r,a]=t.anchor??[.5,1],i=[],l=[],u=[];for(let g=0;g<=Oe;g++){const v=g/Oe;for(const c of[0,1])i.push((c-r)*n,(a-v)*o,0),l.push(c,v);if(g<Oe){const c=g*2;u.push(c,c+2,c+1,c+1,c+2,c+3)}}const h=new bt(e,s);return Object.assign(new Xt,{positions:i,uvs:l,indices:u}).applyToMesh(h),h}let _o=0;function pt(e,t,n,o,s,r){const a=Po(`layer:${e.id}`,e,n,o,r),i=new Ee(`layer:${e.id}`,r,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=s!==1?X.WRAP_ADDRESSMODE:X.CLAMP_ADDRESSMODE,i.setTexture("tex",t),i.alphaMode=ee.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1;const l=_o++*2.39996%(Math.PI*2),u=e.anchor?.[1]??1;return i.setFloat("phase",l).setFloat("height",o*u).setFloat("width",n).setFloat("uRepeat",s).setFloat("opacity",1),i.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),i.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),i.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),a.material=i,a.metadata={noGBuffer:!0,painted:!0},a.isPickable=!1,{mesh:a,material:i,setMotion:h=>{i.setFloat("kind",In[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{i.setFloat("opacity",h),a.isVisible=h>.001},setLine:(h,g,v,c)=>{i.setFloat("inkMul",g).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),i.setVector2("pxUV",new Qe(v[0],v[1])).setVector3("hazeTint",C.FromArray(c))},setPaper:(h,g)=>{i.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),i.setVector3("washColour",C.FromArray(h.washColour)).setVector2("grainUV",new Qe(g[0],g[1]))},setBottomFade:h=>{i.setFloat("bottomFade",h)},setAlive:h=>{i.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),i.setVector3("footTint",C.FromArray(h.footTint)).setVector3("sunColour",C.FromArray(wo)).setVector3("shadeColour",C.FromArray(bo))},setGroundLine:h=>{i.setFloat("groundLine",h)},setFeather:(h,g)=>{i.setFloat("feather",Math.max(0,Math.min(1,h))),g&&i.setVector3("featherTint",C.FromArray(g))}}}const Ye={...En["History Lines pencil"],paper:.35,granulation:.2,...Fe},zo=new qt(.937,.914,.863,1),Co=.7,Oo=(e,t,n)=>e.map((o,s)=>o+(t[s]-o)*n);class Bo{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new Kt(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Zt(this.engine),this.scene.clearColor=zo,this.camera=new Jt("house",new C(0,1.6,0),this.scene),this.camera.rotation.set(Ae*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new Qt("sky",new C(0,1,0),this.scene).intensity=.7,new en("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=ho(this.scene),this.ground.set(this.groundLook(null,null,n)),this.birds=xo(this.scene,mt,Z(mt),Io),An(this.scene,this.camera,{num:o=>Number(this.look[o]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),To(this.camera,o=>Number(this.look[o]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=xe(re);strip=null;nearTex=null;bands=[];smoke=[];birds;footTint=xe(re);nearAsset=null;hazeTint=xe(re);sceneLib;buildToken=0;look={...Ye};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(o=>({scene:t,...o})))}renderCap=1920;tier=lt;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return jn(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=lt,this.window.start=0,this.fit()}tick(t){const n=this.window,o=document.hidden||n.last&&t-n.last>Hn;if(n.last=t,!n.start||o){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Nn)return;const s=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const r=this.tier.notches;this.tier=Wn(this.tier,s,t,this.scaleAt(r+1)<this.scaleAt(r)),this.tier.notches!==r&&this.fit()}setLook(t){this.look={...Ye,...t??{}}}groundPoint(t,n){const o=j[n];return new C((t-.5)*Z(o),0,o)}async build(t,n=this.lib){const o=++this.buildToken,s=[],r=[];t.set.sky&&r.push({layer:{asset:t.set.sky,depth:"sky"},order:0,index:-1});const a={sky:1};t.set.layers.forEach((k,_)=>{const N=k.depth;a[N]=a[N]??0,r.push({layer:k,order:a[N]++,index:_})});const i=[];await Promise.all(r.map(async({layer:k,order:_,index:N})=>{const w=le(n,k,k.depth);if(!w){i.push({need:k.need??k.asset,reason:"no match"});return}let M;try{M=await ye(n.base+w.file,this.scene)}catch{i.push({need:k.need??k.asset,reason:`file did not load: ${w.file}`});return}if(o!==this.buildToken)return;const S=ae(w,k,_),D=pt(w,M,S.w,S.h,S.uRepeat,this.scene);D.mesh.position.set(S.x,S.y,S.z),D.mesh.alphaIndex=k.flat?zn:S.alphaIndex,k.flat&&(D.mesh.rotation.x=Math.PI/2),D.mesh.isVisible=!1;let T,d;if(Be.includes(k.depth)&&!w.tileable_x&&!k.flat){const f=io(w,S.w,S.h,S.z);T=ht(D.mesh,f.w,f.d,this.scene),T.mesh.alphaIndex=rt(S.alphaIndex),d=ht(D.mesh,f.w,f.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:S.h*Vo(this.sunDir)}),d.mesh.alphaIndex=rt(S.alphaIndex)}s.push({layer:k,index:N,builtScale:k.scale??1,handle:D,asset:w,order:_,stain:T,cast:d,ink:jt.get(n.base+w.file)})}));const l=Jn(t.set,n);let u=null,h=null;const g=lo(t.set.near,n),v=g?le(n,{asset:g}):null;if(t.set.near&&!v&&i.push({need:t.set.near,reason:"no near band"}),v)try{h=await ye(n.base+v.file,this.scene)}catch{i.push({need:t.set.near,reason:`file did not load: ${v.file}`})}if(l.kind==="asset")try{u=await ye(n.base+l.asset.file,this.scene)}catch{i.push({need:t.set.ground??"ground",reason:`file did not load: ${l.asset.file}`})}else l.reason&&i.push({need:t.set.ground,reason:l.reason});const c=s.filter(k=>k.asset.layer==="bg").sort((k,_)=>k.index-_.index)[0],y=c?{top:Ht.get(n.base+c.asset.file)??0,h:ae(c.asset,c.layer,c.order).h,order:c.order}:null,p=s.find(k=>k.index===-1),L=p&&ae(p.asset,p.layer,p.order),P=p&&L?to(Ge.get(n.base+p.asset.file)??[],(U.y-L.y)/L.h):null,O=c?Nt.get(n.base+c.asset.file)??null:t.set.groundBands?.length?null:P,b=await this.loadBands(t,n),F=k=>k.forEach(_=>{_.stain?.mesh.material?.dispose(),_.cast?.mesh.material?.dispose(),_.handle.mesh.dispose(),_.handle.material.dispose()});if(o!==this.buildToken){F(s),b.forEach(k=>{k.handle.mesh.dispose(),k.handle.material.dispose()});return}F(this.built),this.bands.forEach(k=>{k.handle.mesh.dispose(),k.handle.material.dispose()}),this.bands=b,this.built=s,this.sceneLib=n;const R=l.kind==="asset"?(Ge.get(n.base+l.asset.file)??[]).filter(k=>!!k):[],I=this.groundLook(l.kind==="asset"?{tex:u,asset:l.asset}:null,O,n,l.kind==="paper"?l.colour:void 0);this.horizonTint=I.tint,this.strip=y,this.smoke.forEach(k=>k.dispose()),this.smoke=s.filter(k=>vo(k.asset)&&Be.includes(k.layer.depth)&&!k.layer.flat).map(k=>{const _=ae(k.asset,k.layer,k.order);return po(this.scene,new C(k.handle.mesh.position.x,_.h*.6,_.z),Math.min(Math.max(_.h*.8,.5),3),_.alphaIndex)}),this.footTint=R.length?Uo(R):I.base,this.nearTex=h,this.nearAsset=v,this.hazeTint=P??I.tint,this.ground.set(I),this.missed.set(t.id,i),i.length&&console.warn(`stage25d: ${t.id}: missing`,i)}groundLook(t,n,o,s){const r=xe(s??o.paper??re),a=n??r;return{tex:t?.tex??null,tile:t?.asset.height_m||Ot,base:Oo(r,a,Co),tint:a,fadeNear:j.fg,fadeFar:j.bg*.75,grain:t?.tex?.5:1}}rebind(t){this.built.forEach(n=>{n.index>=0&&(n.layer=t.set.layers[n.index])})}pickLayers(t,n){const o=r=>this.built.some(a=>a.handle.mesh===r),s=[];for(const r of this.scene.multiPick(t,n,o)??[]){const a=this.built.find(l=>l.handle.mesh===r.pickedMesh),i=r.getTextureCoordinates();!a||!i||a.index<0||a.asset.tileable_x||["sky","bg","ground"].includes(a.asset.layer)||s.push({index:a.index,asset:a.asset,u:i.x,v:i.y})}return s}layerBox(t){const n=this.built.find(u=>u.index===t);if(!n)return null;const o=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),s=1/this.engine.getRenderWidth(),r=1/this.engine.getRenderHeight(),a=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(u=>C.Project(u,ie.IdentityReadOnly,this.scene.getTransformMatrix(),o)),i=a.map(u=>u.x*s),l=a.map(u=>u.y*r);return{x0:Math.min(...i),y0:Math.min(...l),x1:Math.max(...i),y1:Math.max(...l),z:n.handle.mesh.position.z}}xForScreen(t,n){const o=j[n],s=Math.tan(this.camera.fov/2)*this.engine.getAspectRatio(this.camera);return .5+(this.camera.position.x+(t-.5)*2*s*(o-this.camera.position.z))/Z(o)}worldXAt(t,n,o){const s=this.scene.createPickingRay(t,n,ie.Identity(),this.camera);return s.origin.x+(o-s.origin.z)/s.direction.z*s.direction.x}sunDir=new C(.55,-1,-.3).normalize();depthLine(t){return{..._e(this.look,t),tint:this.hazeTint}}paper(){return ft(this.look)}async loadBands(t,n){const o=[];for(const s of t.set.groundBands??[]){const r=le(n,{asset:s.asset},"ground_band");if(!r){console.warn(`stage25d: ${t.id}: no ground band ${s.asset}`);continue}const a=await ye(n.base+r.file,this.scene).catch(()=>null);if(!a){console.warn(`stage25d: ${t.id}: ground band ${r.file} did not load`);continue}const i=Ln(s.z),l=i*r.h/r.w,u=pt(r,a,i,l,1,this.scene);u.material.depthFunction=ee.ALWAYS,u.mesh.position.set(0,0,s.z),u.mesh.alphaIndex=Lt(s.z),o.push({handle:u,z:s.z,w:i,h:l,skyline:Wt.get(n.base+r.file)??.5})}return o}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?On(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??Tt,Y(this.look,"housePitch")):0}pose(t,n,o,s){const r=zt(t,n),a=Ct(r.cam,r.t,_t(t)),i=s?Yn(a,s.t,s):a;this.camera.position.set(i.x,i.y,i.z),this.camera.fov=i.fov;const l=Y(this.look,"housePitch");this.camera.rotation.x=l*Math.PI/180,this.ground.follow(this.camera.position);const u=c=>Y(this.look,c);this.ground.live({detail:u("groundDetail"),vary:u("groundVary"),mixTile:u("groundMix"),tileScale:u("groundScale")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Ao(l,this.engine.getAspectRatio(this.camera),u("nearFar")),span:Ro,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),g=ft(this.look),v=Y(this.look,"bandHeight");this.bands.forEach(c=>{c.handle.mesh.position.y=Pn(c.z,v,c.h,c.skyline);const y=ze(h,c.z-U.z,K(U.fov));c.handle.setOpacity(1),c.handle.setBottomFade(Math.min(1,Y(this.look,"bandFade")/c.h)),c.handle.setPaper(g,ve(c.w,c.h,1,y,h)),c.handle.setLine(_e(this.look,"bg"),1,ve(c.w,c.h,1,y,h),this.hazeTint)}),this.smoke.forEach(c=>c.update(o,Y(this.look,"smoke"))),this.birds.update(o,Y(this.look,"birds"));for(const c of this.built){const y=Se(c.layer,n),p=ae(c.asset,{...c.layer,x:y.x,y:y.y,scale:1,rotation:y.rotation},c.order,this.horizonOf(t));c.handle.mesh.position.x=p.x,c.handle.mesh.position.y=c.layer.flat?Cn:p.y,c.handle.mesh.rotation.z=-p.rotation*Math.PI/180,c.handle.mesh.scaling.setAll(y.scale/c.builtScale),c.handle.setOpacity(y.opacity),c.handle.setFeather(qn(c.asset,c.layer),this.horizonTint),c.asset.layer==="sky"&&c.handle.setGroundLine((i.y-p.y)/(p.h*y.scale));const L=ze(h,p.z-i.z,this.camera.fov),P=_e(this.look,c.layer.depth);c.handle.setPaper(g,ve(p.w*y.scale,p.h*y.scale,p.uRepeat,ze(1080,p.z-U.z,K(U.fov)),1080)),c.handle.setLine(P,c.ink===void 0?1:Eo(c.ink,P.ink,P.norm),ve(p.w*y.scale,p.h*y.scale,p.uRepeat,L,h),this.hazeTint),c.stain?.setOpacity((c.layer.shadow??Le)*y.opacity),c.cast?.setOpacity(Y(this.look,"castShadow")*((c.layer.shadow??Le)/Le)*y.opacity);const O=c.asset.layer==="sky"?"sky":c.asset.layer==="bg"?"strip":c.asset.layer==="figure"?"figure":Be.includes(c.layer.depth)&&!c.layer.flat?"standing":"other";c.handle.setAlive(Mo(this.look,O,this.sunDir.x,this.footTint)),c.handle.setMotion(Vn(c.asset,c.layer)),c.handle.material.setFloat("time",o)}}}const Ro=1.3,mt=110,Io=900,Vo=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Uo=e=>[0,1,2].map(t=>e.reduce((n,o)=>n+o[t],0)/e.length),Be=["mid","fg","near"],No=16/9,Ho=.92;function Wo(e,t,n,o){const{cam:s,t:r}=zt(e,o),a=Ct(s,r,_t(e)),i=j[t.depth],l=i-a.z;if(l<=.5)return null;const u=Se(t,o),h=(u.x-.5)*Z(i),g=Math.tan(a.fov/2),v=(h-a.x)/(l*g*No),c=-Ae*Math.PI/180,y=Math.tan(Math.atan2(n*u.scale-a.y,l)-c)/g;return Math.abs(v)>Ho?null:{x:(v+1)/2,y:Math.min(1,Math.max(0,(1-y)/2))}}const jo={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},gt=new Set(["large","small","tall","long","short","fallen"]),$o=new Set(["tree","shrub"]),Xe=e=>e.charAt(0).toUpperCase()+e.slice(1),Go=(e,t)=>jo[e]?.[t?1:0]??e;function Yo(e,t="en"){const n=t==="nl",o=e?.name?.[t]??e?.name?.en;if(o)return o;const s=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!s.length)return"";const r=s.length>1&&$o.has(s[0])?s.slice(1):s,a=r.filter(l=>gt.has(l)),i=r.filter(l=>!gt.has(l));return Xe([...a,...i].map(l=>Go(l,n)).join(" "))}function we(e,t,n="en"){if(e.figure)return Xe(String(e.figure).replace(/-/g," "));const o=t??(e.asset?{id:e.asset}:null);if(o)return Yo(o,n);const s=Array.isArray(e.need)?e.need[0]:e.need;return s?Xe(String(s)):""}const Xo=24;function Ko(e){const t=new Map,n=o=>{if(t.has(o))return;t.set(o,"loading");const s=new Image;s.onload=()=>{try{const r=document.createElement("canvas");r.width=s.naturalWidth,r.height=s.naturalHeight;const a=r.getContext("2d",{willReadFrequently:!0});a.drawImage(s,0,0),t.set(o,{w:r.width,h:r.height,data:a.getImageData(0,0,r.width,r.height).data})}catch{t.set(o,"failed")}},s.onerror=()=>t.set(o,"failed"),s.src=e+o};return{prime(o){o.forEach(s=>s?.file&&n(s.file))},opaque(o,s,r){const a=t.get(o?.file);if(!a||typeof a=="string")return o?.file&&n(o.file),!0;const i=Math.min(a.w-1,Math.max(0,Math.floor(s*a.w))),l=Math.min(a.h-1,Math.max(0,Math.floor((1-r)*a.h)));return a.data[(l*a.w+i)*4+3]>Xo}}}const Zo=-1,qo=2;function Jo({canvas:e,host:t,stage:n,valueOf:o,alpha:s,onChange:r}){let a=null,i=null,l=!1;const u="#38bdf8",h=document.createElement("div");h.dataset.stage25dSelection="",h.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${u};z-index:3;`;const g=document.createElement("div");g.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${u};pointer-events:none;`,h.appendChild(g);const v=document.createElement("div");v.dataset.rotateHandle="1",v.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",h.appendChild(v);const y=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([w,M])=>{const S=document.createElement("div");return S.dataset.scaleHandle="1",S.style.cssText=nn(w,M),h.appendChild(S),S});t.appendChild(h);const p=w=>{const M=e.getBoundingClientRect();return{x:w.clientX-M.left,y:w.clientY-M.top}},L=(w,M)=>n()?.pickLayers(w,M).find(S=>s.opaque(S.asset,S.u,S.v))??null,P=(w,M)=>{a=w,M&&w!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${w}`}})),b()},O=()=>{const w=a===null?null:n()?.layerBox(a);if(!w)return null;const M=e.getBoundingClientRect();return{left:w.x0*M.width,top:w.y0*M.height,width:(w.x1-w.x0)*M.width,height:(w.y1-w.y0)*M.height,z:w.z}},b=()=>{const w=O();if(!w){h.style.display="none";return}const M=e.getBoundingClientRect(),S=t.getBoundingClientRect();Object.assign(h.style,{display:"block",left:`${w.left+M.left-S.left}px`,top:`${w.top+M.top-S.top}px`,width:`${w.width}px`,height:`${w.height}px`})},F=(w,M,S)=>Math.min(S,Math.max(M,w)),R=w=>{if(w.button!==0)return;const{x:M,y:S}=p(w),D=L(M,S);if(!D)return;w.stopPropagation(),P(D.index,!0);const T=n().layerBox(D.index);i={mode:"move",index:D.index,z:T.z,from:n().worldXAt(M,S,T.z),x0:o(D.index,"x"),id:w.pointerId,el:e},e.setPointerCapture?.(w.pointerId)},I=w=>M=>{if(M.button!==0||a===null)return;const S=O();if(!S)return;M.stopPropagation(),M.preventDefault();const D=e.getBoundingClientRect(),T=S.left+S.width/2,d=S.top+S.height/2,{x:f,y:m}={x:M.clientX-D.left,y:M.clientY-D.top};i={mode:w,index:a,cx:T,cy:d,id:M.pointerId,el:M.currentTarget,d0:Math.max(8,Math.hypot(f-T,m-d)),a0:Math.atan2(m-d,f-T),scale0:o(a,"scale"),rotation0:o(a,"rotation")},M.currentTarget.setPointerCapture?.(M.pointerId)},k=w=>{const{x:M,y:S}=p(w);if(i?.mode==="move"){const D=(n().worldXAt(M,S,i.z)-i.from)/Z(i.z);r(i.index,"x",Math.round(F(i.x0+D,Zo,qo)*1e3)/1e3);return}if(i?.mode==="scale"){const D=Math.hypot(M-i.cx,S-i.cy);r(i.index,"scale",Math.round(F(i.scale0*(D/i.d0),.05,20)*1e3)/1e3);return}if(i?.mode==="rotate"){let D=i.rotation0+(Math.atan2(S-i.cy,M-i.cx)-i.a0)*180/Math.PI;w.shiftKey&&(D=Math.round(D/15)*15),r(i.index,"rotation",Math.round(D*10)/10);return}l||(l=!0,requestAnimationFrame(()=>{l=!1,e.style.cursor=L(M,S)?"pointer":""}))},_=()=>{i&&i.el.releasePointerCapture?.(i.id),i=null},N=w=>{a!==null&&w.detail?.id!==`s25_layer-${a}`&&(a=null,b())};e.addEventListener("pointerdown",R);for(const w of[e,...y,v])w.addEventListener("pointermove",k),w.addEventListener("pointerup",_),w.addEventListener("pointercancel",_);return y.forEach(w=>w.addEventListener("pointerdown",I("scale"))),v.addEventListener("pointerdown",I("rotate")),window.addEventListener("scene-object-selected",N),{select:(w,M=!1)=>P(w,M),get selected(){return a},place:b,destroy(){window.removeEventListener("scene-object-selected",N),h.remove()}}}const qe=["x","y","scale","rotation","opacity","keys"],$=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},Qo=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!qe.includes(t))),xt=e=>JSON.stringify({...e,set:{...e?.set,layers:(e?.set?.layers??[]).map(Qo)}}),Re=e=>JSON.stringify((e?.set?.layers??[]).map(t=>qe.map(n=>t[n]??null))),vt=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch"],yt="application/x-lp-stage25d",be=new Map,Ie=new Map,ea=e=>(Ie.has(e)||Ie.set(e,Ko(e)),Ie.get(e));function ta(e){return be.has(e)||be.set(e,Xn(tn(e)).catch(t=>{throw be.delete(e),t})),be.get(e)}const na=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function da(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let o=null,s=null,r=null,a=null,i=new Map,l=new Map,u=0,h=null,g=0,v=0,c=performance.now(),y=!1,p=[],L=new Set,P=null,O=null,b=null,F=!1,R={},I=null;const k=()=>{o.engine.runRenderLoop(()=>{const d=performance.now();v+=Math.min(.1,(d-c)/1e3),c=d,o.tick(d),s&&o.pose(s,w(),v),o.scene.render(),I?.place()})},_=()=>{!s||!o||(s={...s,set:{...s.set,layers:p.map((d,f)=>L.has(f)?{...d,opacity:0,keys:[]}:d)}},o.rebind(s))},N=(d,f)=>{const m=$(d);return m<0||!p[m]?-1:(p=p.map((x,E)=>E===m?{...x,...f}:x),P=Re({set:{layers:p}}),_(),m)},w=()=>h?h():u,M=()=>a?.set?.sky&&O?i.get(a.set.sky)??le(O,{asset:a.set.sky},"sky"):null,S=(d,f)=>{const m=o?.layerBox(d);return{scale:Math.round(Math.min(20,Math.max(.01,(p[d].scale??1)*(j[f]/j[p[d].depth])))*1e3)/1e3,frac:m?(m.x0+m.x1)/2:null}},D=(d,f)=>d===null?null:Math.round(Math.min(2,Math.max(-1,o.xForScreen(d,f)))*1e3)/1e3,T={canvas:n,sceneId:null,async show(d){const f=await ta(d.bundle);if(y)return;o||(o=new Bo(n,f),k()),R={...d.look??{}},o.setLook(R);const m=na(d);await o.build(m,f),s=m,p=m.set.layers,L=new Set,P=Re(d),a=d,i=new Map(f.assets.map(x=>[x.id,x])),O=f,b=ea(f.base),b.prime(m.set.layers.map(x=>i.get(x.asset)).filter(Boolean)),t.editable&&!I&&(n.style.pointerEvents="auto",window.addEventListener("scene-object-selected",x=>{x.detail?.id!=="s25_sky"&&(F=!1)}),n.addEventListener("dragover",x=>{x.dataTransfer?.types?.includes(yt)&&(x.preventDefault(),x.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",x=>{const E=x.dataTransfer?.getData(yt);if(!E)return;x.preventDefault();const A=n.getBoundingClientRect();T.addLayer(E,{x:x.clientX-A.left,y:x.clientY-A.top})}),I=Jo({canvas:n,host:e,stage:()=>o,alpha:{opaque:(x,E,A)=>b.opaque(x,E,A)},valueOf:(x,E)=>Se(p[x],w())[E],onChange:(x,E,A)=>T.moveLayer(`layer-${x}`,E,A)})),l=new Map(f.assets.map(x=>[x.id,x.height_m??1.7])),g=Number(d.narration_at_s)||0,r=xt(d),e.dataset.stage25dReady="1"},matches:d=>r===xt(d),adopt(d){const f=Re(d);if(f===P)return!1;P=f;const m=d.set?.layers??[];return p=p.map((x,E)=>{const A={...x};for(const H of qe)m[E]?.[H]===void 0?delete A[H]:A[H]=m[E][H];return A}),a=d,_(),!0},setLayerProp(d,f,m){N(d,{[f]:m})},setLayerKeys(d,f){const m=$(d);JSON.stringify(p[m]?.keys??[])!==JSON.stringify(f)&&N(d,{keys:f})},commitLayerProp(d,f,m){const x=N(d,{[f]:m});x>=0&&this.sceneId!=null&&t.onCommit?.(x,{[f]:m},this.sceneId)},readLayerProp(d,f){const m=p[$(d)],x=m?Se(m,w())[f]:null;return Number.isFinite(x)?x:null},setHidden(d,f){const m=$(d);m<0||(L=new Set(f?[...L,m]:[...L].filter(x=>x!==m)),_())},update(d){h=null,u=Math.max(0,d)},play(d){h=()=>g+d()},moveLayer(d,f,m){window.__timelineKeying?.edit?.(`s25:${d}`,f,m,{flush:!1})||T.commitLayerProp(d,f,m)},select(d){F=d==="sky",I?.select($(d)>=0?$(d):null,!F),F&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_sky"}}))},get skySelected(){return F},get selection(){return I?.selected??null},clearSelection(){I?.select(null)},atStart(){return u===0&&h===null&&L.size===0},layerInfo(d){if(d==="sky"){const A=M();return A?{id:d,asset:A.id,depth:"sky",figure:null,label:we({},A,(document.documentElement.lang||"en").slice(0,2)),file:`${O.base}${A.file}`,motion:null}:null}const f=p[$(d)];if(!f)return null;const m=i.get(f.asset)??null,x=typeof f.motion=="string"?{kind:f.motion}:f.motion??{},E=m?.motion??"none";return{id:d,asset:f.asset??null,depth:f.depth,figure:f.figure??null,label:we(f,m,(document.documentElement.lang||"en").slice(0,2)),file:m?`${O.base}${m.file}`:null,motion:{kind:x.kind??E,amount:x.amount??1,speed:x.speed??1}}},setLayerMotion(d,f){const m=$(d);if(m<0||!p[m])return;const x={...typeof p[m].motion=="object"?p[m].motion:{kind:p[m].motion},...f},E=N(d,{motion:x});E>=0&&t.onCommit?.(E,{motion:x},T.sceneId)},async setLayerDepth(d,f){const m=$(d);if(m<0||!p[m]||p[m].depth===f||!["bg","mid","fg","near"].includes(f)||p[m].depth==="sky")return;const x=S(m,f);p=p.map((A,H)=>H===m?{...A,depth:f,scale:x.scale}:A),await T.show({...a,set:{...a.set,layers:p}});const E=D(x.frac,f);E!==null&&(p=p.map((A,H)=>H===m?{...A,x:E}:A),_()),T.sceneId!=null&&t.onCommit?.(m,{depth:f,scale:x.scale,...E!==null?{x:E}:{}},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"))},reorderLayers(d,f,m){const x=d.indexOf(f),E=p[d[x+1]??d[x-1]]?.depth,A=p[f]?.depth;let H=null,pe=null;if(E&&E!==A&&A!=="sky"&&["bg","mid","fg","near"].includes(E)){const Je=S(f,E);pe=Je.scale,H=D(Je.frac,E)}m(d,f,T.sceneId,H,pe)},library(){if(!O)return null;const d=(document.documentElement.lang||"en").slice(0,2);return{bundle:O.bundle,assets:O.assets.map(f=>({id:f.id,layer:f.layer,tags:f.tags??[],url:O.base+f.file,label:we({},f,d)}))}},async swapAsset(d,f){if(d==="sky"){if(i.get(f)?.layer!=="sky"||M()?.id===f)return;await T.show({...a,set:{...a.set,sky:f,layers:p}}),T.sceneId!=null&&t.onCommit?.(0,{sky:f},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const m=$(d);m<0||!p[m]||!i.has(f)||p[m].asset===f||(p=p.map((x,E)=>E===m?{...x,asset:f}:x),await T.show({...a,set:{...a.set,layers:p}}),t.onCommit?.(m,{asset:f},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(d,f=null){const m=i.get(d);if(!m)return;const x=["mid","fg","near","bg","sky"].includes(m.layer)?m.layer:"mid",E=f&&o?.5+o.worldXAt(f.x,f.y,j[x])/Z(j[x]):.5,A={asset:d,depth:x,x:Math.round(Math.min(2,Math.max(-1,E))*1e3)/1e3,scale:1};p=[...p,A],await T.show({...a,set:{...a.set,layers:p}}),t.onCommit?.(p.length-1,{add:A},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),I?.select(p.length-1,!0)},lookControls(){return vt.map(d=>{const[f,m,x]=Fo[d]??[0,1,.01];return{key:d,min:f,max:m,step:x,value:Y({...Ye,...R},d)}})},setLook(d,f){!vt.includes(d)||!Number.isFinite(f)||!o||(R={...R,[d]:f},o.setLook(R),t.onLook?.(d,f,T.sceneId))},async still(d=480){if(!o||!s||!n.width)return null;await o.scene.whenReadyAsync();const f=()=>{const m=document.createElement("canvas");return m.width=d,m.height=Math.max(1,Math.round(d*n.height/n.width)),m.getContext("2d").drawImage(n,0,0,m.width,m.height),m.toDataURL("image/jpeg",.72)};return o.engine.resize(),new Promise(m=>{let x=0;const E=pe=>{o.engine.onEndFrameObservable.remove(A),clearTimeout(H),m(pe)},A=o.engine.onEndFrameObservable.add(()=>{++x>=6&&E(f())}),H=setTimeout(()=>E(null),4e3)})},get config(){return a},figureBox(d){const f=p.find(A=>A.figure===d);if(!f?.asset)return null;const m=Wo(s,f,l.get(f.asset)??1.7,w());if(!m)return null;const x=n.getBoundingClientRect(),E=x.width*.05;return new DOMRect(x.left+m.x*x.width-E/2,x.top+m.y*x.height,E,x.height*.08)},items:()=>[...p.map((d,f)=>({id:`layer-${f}`,label:we(d,i.get(d.asset),(document.documentElement.lang||"en").slice(0,2))||`layer ${f+1}`,depth:d.depth,keys:d.keys??[]})),...a?.set?.sky?[{id:"sky",label:"Sky",depth:"sky",keys:[]}]:[],{id:"camera",label:"Camera",depth:null,keys:[]}],destroy(){y=!0,delete e.dataset.stage25dReady;try{o?.engine.stopRenderLoop(),o?.scene.dispose(),o?.engine.dispose()}catch{}I?.destroy(),n.remove()}};return T}export{yt as DROP_TYPE,vt as LOOK_KEYS,da as createStage25d,na as stageScene};
