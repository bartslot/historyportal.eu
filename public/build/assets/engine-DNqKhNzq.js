import{m as Et,c as Dt,M as ze,S as de,R as nt,C as N,T as L,V as k,E as _,a as ot,b as ve,P as _t,d as Ve,e as Pt,f as Lt,g as Ot,h as Bt,U as zt,H as Ct,D as Rt}from"./babylon-BEUo0Gn_.js";import{l as Vt}from"./config-qjtb2AOJ.js";import"./vite-helpers-DqutJMZx.js";const X=new Set;let Ae=!1;function It(e,t,n=2){const o=t&&t.length,i=o?t[0]*n:e.length;X.size&&X.clear();let a=at(e,0,i,n,!0);const s=[];if(!a||a.next===a.prev)return s;let r=0,c=0,u=0;if(o&&(a=Gt(e,t,a,n)),e.length>80*n){r=e[0],c=e[1];let h=r,d=c;for(let p=n;p<i;p+=n){const l=e[p],f=e[p+1];l<r&&(r=l),f<c&&(c=f),l>h&&(h=l),f>d&&(d=f)}u=Math.max(h-r,d-c),u=u!==0?32767/u:0}return Ee(a,s,r,c,u),s}function at(e,t,n,o,i){let a=null;if(i===on(e,t,n,o)>0)for(let s=t;s<n;s+=o)a=Ne(s/o|0,e[s],e[s+1],a);else for(let s=n-o;s>=t;s-=o)a=Ne(s/o|0,e[s],e[s+1],a);return a&&q(a,a.next)&&(Q(a),a=a.next),a}function V(e,t=e){const n=t===e;let o=e,i;do i=!1,o!==o.next&&(X.size===0||!X.has(o))&&(q(o,o.next)||S(o.prev,o,o.next)===0)?((n||o===t)&&(t=o.prev),Ae=!0,Q(o),o=o.prev,i=!0):(n||o!==t)&&(o=o.next,i=!n);while(i||o!==t);return t}function Ee(e,t,n,o,i){i&&qt(e,n,o,i);let a=e,s=!1;for(;e.prev!==e.next;){const r=e.prev,c=e.next;if(S(r,e,c)<0&&(i?Nt(e,n,o,i):Ut(e))){t.push(r.i,e.i,c.i),Q(e),e=c,a=c;continue}if(e=c,e===a){if(Ae=!1,e=V(e),Ae){a=e;continue}if(!s){e=Ht(e,t),a=e,s=!0;continue}Wt(e,t,n,o,i);break}}}function Ut(e){const t=e.prev,n=e,o=e.next,i=t.x,a=n.x,s=o.x,r=t.y,c=n.y,u=o.y,h=Math.min(i,a,s),d=Math.min(r,c,u),p=Math.max(i,a,s),l=Math.max(r,c,u);let f=o.next;for(;f!==t;){if(f.x>=h&&f.x<=p&&f.y>=d&&f.y<=l&&!(i===f.x&&r===f.y)&&ue(i,r,a,c,s,u,f.x,f.y)&&S(f.prev,f,f.next)>=0)return!1;f=f.next}return!0}function Nt(e,t,n,o){const i=e.prev,a=e,s=e.next,r=i.x,c=a.x,u=s.x,h=i.y,d=a.y,p=s.y,l=Math.min(r,c,u),f=Math.min(h,d,p),m=Math.max(r,c,u),y=Math.max(h,d,p),w=Le(l,f,t,n,o),D=Le(m,y,t,n,o);let x=e.prevZ;for(;x&&x.z>=w;){if(x.x>=l&&x.x<=m&&x.y>=f&&x.y<=y&&x!==s&&!(r===x.x&&h===x.y)&&ue(r,h,c,d,u,p,x.x,x.y)&&S(x.prev,x,x.next)>=0)return!1;x=x.prevZ}let g=e.nextZ;for(;g&&g.z<=D;){if(g.x>=l&&g.x<=m&&g.y>=f&&g.y<=y&&g!==s&&!(r===g.x&&h===g.y)&&ue(r,h,c,d,u,p,g.x,g.y)&&S(g.prev,g,g.next)>=0)return!1;g=g.nextZ}return!0}function Ht(e,t){let n=e,o=!1;do{const i=n.prev,a=n.next.next;rt(i,n,n.next,a,!1)&&J(i,a)&&J(a,i)&&(t.push(i.i,n.i,a.i),Q(n),Q(n.next),n=e=a,o=!0),n=n.next}while(n!==e);return o?V(n):n}function Wt(e,t,n,o,i){let a=e;do{let s=a.next.next;for(;s!==a.prev;){if(a.i!==s.i&&en(a,s)){let r=lt(a,s);a=V(a,a.next),r=V(r,r.next),Ee(a,t,n,o,i),Ee(r,t,n,o,i);return}s=s.next}a=a.next}while(a!==e)}let De=!1;function Gt(e,t,n,o){const i=[];for(let a=0,s=t.length;a<s;a++){const r=t[a]*o,c=a<s-1?t[a+1]*o:e.length,u=at(e,r,c,o,!1);u===u.next&&X.add(u),i.push(Qt(u))}i.sort(jt),Yt(e.length/o,t.length),it(n,n),De=!0;for(let a=0;a<i.length;a++)n=$t(i[a],n);return De=!1,V(n)}function jt(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function $t(e,t){const n=Kt(e,t);if(!n)return t;const o=lt(n,e),i=o.next;return it(n,i.next),V(o,o.next),V(n,n.next)}const st=16;let b=new Float64Array(0),he=0;const _e=[],Pe=[];function Yt(e,t){const n=Math.ceil((e+2*t)/st)+t+2;b.length<n*4&&(b=new Float64Array(n*4)),he=0}function it(e,t){let n=e;do{const o=he++;_e[o]=n;let i=1/0,a=1/0,s=-1/0,r=-1/0,c=0;do{const h=n.next;n.z=o,n.x<i&&(i=n.x),n.x>s&&(s=n.x),n.y<a&&(a=n.y),n.y>r&&(r=n.y),h.x<i&&(i=h.x),h.x>s&&(s=h.x),h.y<a&&(a=h.y),h.y>r&&(r=h.y),n=h}while(++c<st&&n!==t);Pe[o]=n;const u=o*4;b[u]=i,b[u+1]=a,b[u+2]=s,b[u+3]=r}while(n!==t)}function Zt(e,t){const n=e.z*4;t.x<b[n]&&(b[n]=t.x),t.y<b[n+1]&&(b[n+1]=t.y),t.x>b[n+2]&&(b[n+2]=t.x),t.y>b[n+3]&&(b[n+3]=t.y)}function Ie(e){let t=Pe[e];for(;t.prev.next!==t;)t=t.next;return Pe[e]=t,t}function Ue(e){let t=_e[e];for(;t.prev.next!==t;)t=t.next;return _e[e]=t,t}function Kt(e,t){let n=t;const o=e.x,i=e.y;let a=-1/0,s;if(q(e,n))return n;for(let p=0,l=0;p<he;p++,l+=4){if(i<b[l+1]||i>b[l+3]||b[l]>o||b[l+2]<=a)continue;const f=Ie(p);n=Ue(p);do{if(n.prev.next===n){if(q(e,n.next))return n.next;if(i<=n.y&&i>=n.next.y&&n.next.y!==n.y){const m=n.x+(i-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(m<=o&&m>a&&(a=m,s=n.x<n.next.x?n:n.next,m===o))return s}}n=n.next}while(n!==f)}if(!s)return null;const r=s.x,c=s.y,u=Math.min(i,c),h=Math.max(i,c);let d=1/0;for(let p=0,l=0;p<he;p++,l+=4){if(b[l+2]<r||b[l]>o||b[l+3]<u||b[l+1]>h)continue;const f=Ie(p);n=Ue(p);do{if(n.prev.next===n&&o>=n.x&&n.x>=r&&o!==n.x&&ue(i<c?o:a,i,r,c,i<c?a:o,i,n.x,n.y)){const m=Math.abs(i-n.y)/(o-n.x);(J(n,e)||n.y===i&&n.next.y===i&&n.next.x>o)&&(m<d||m===d&&(n.x>s.x||n.x===s.x&&Xt(s,n)))&&(s=n,d=m)}n=n.next}while(n!==f)}return s}function Xt(e,t){return S(e.prev,e,t.prev)<0&&S(t.next,e,e.next)<0}const E=[];let W=[],R=new Uint32Array(0),G=new Uint32Array(0);const j=new Uint32Array(256);function qt(e,t,n,o){let i=e,a=0;do i.z=Le(i.x,i.y,t,n,o),E[a++]=i,i=i.next;while(i!==e);Jt(a);let s=null;for(let r=0;r<a;r++){const c=E[r];c.prevZ=s,s&&(s.nextZ=c),s=c}s.nextZ=null}function Jt(e){if(e<=32){for(let t=1;t<e;t++){const n=E[t],o=n.z;let i=t-1;for(;i>=0&&E[i].z>o;)E[i+1]=E[i],i--;E[i+1]=n}return}R.length<e&&(R=new Uint32Array(e),G=new Uint32Array(e),W=new Array(e));for(let t=0;t<e;t++)R[t]=E[t].z;oe(e,E,R,W,G,0),oe(e,W,G,E,R,8),oe(e,E,R,W,G,16),oe(e,W,G,E,R,24)}function oe(e,t,n,o,i,a){j.fill(0);for(let r=0;r<e;r++)j[n[r]>>>a&255]++;let s=0;for(let r=0;r<256;r++){const c=j[r];j[r]=s,s+=c}for(let r=0;r<e;r++){const c=n[r],u=j[c>>>a&255]++;o[u]=t[r],i[u]=c}}function Le(e,t,n,o,i){return e=(e-n)*i|0,t=(t-o)*i|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function Qt(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function ue(e,t,n,o,i,a,s,r){return(i-s)*(t-r)>=(e-s)*(a-r)&&(e-s)*(o-r)>=(n-s)*(t-r)&&(n-s)*(a-r)>=(i-s)*(o-r)}function en(e,t){const n=q(e,t)&&S(e.prev,e,e.next)>0&&S(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||J(e,t)&&J(t,e)&&(S(e.prev,e,t.prev)!==0||S(e,t.prev,t)!==0))&&!tn(e,t)&&(n||nn(e,t))}function S(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function q(e,t){return e.x===t.x&&e.y===t.y}function rt(e,t,n,o,i=!0){const a=S(e,t,n),s=S(e,t,o),r=S(n,o,e),c=S(n,o,t);return(a>0&&s<0||a<0&&s>0)&&(r>0&&c<0||r<0&&c>0)?!0:i?!!(a===0&&ae(e,n,t)||s===0&&ae(e,o,t)||r===0&&ae(n,e,o)||c===0&&ae(n,t,o)):!1}function ae(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function tn(e,t){const n=Math.min(e.x,t.x),o=Math.max(e.x,t.x),i=Math.min(e.y,t.y),a=Math.max(e.y,t.y);let s=e;do{const r=s.next;if(s.x>o&&r.x>o||s.x<n&&r.x<n||s.y>a&&r.y>a||s.y<i&&r.y<i){s=r;continue}if(s.i!==e.i&&r.i!==e.i&&s.i!==t.i&&r.i!==t.i&&rt(s,r,e,t))return!0;s=r}while(s!==e);return!1}function J(e,t){return S(e.prev,e,e.next)<0?S(e,t,e.next)>=0&&S(e,e.prev,t)>=0:S(e,t,e.prev)<0||S(e,e.next,t)<0}function nn(e,t){let n=e,o=!1;const i=(e.x+t.x)/2,a=(e.y+t.y)/2;do{const s=n.next;n.y>a!=s.y>a&&i<(s.x-n.x)*(a-n.y)/(s.y-n.y)+n.x&&(o=!o),n=s}while(n!==e);return o}function lt(e,t){const n=Oe(e.i,e.x,e.y),o=Oe(t.i,t.x,t.y),i=e.next,a=t.prev;return e.next=t,t.prev=e,n.next=i,i.prev=n,o.next=n,n.prev=o,a.next=o,o.prev=a,o}function Ne(e,t,n,o){const i=Oe(e,t,n);return o?(i.next=o.next,i.prev=o,o.next.prev=i,o.next=i):(i.prev=i,i.next=i),i}function Q(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),De&&Zt(e.prev,e.next)}function Oe(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function on(e,t,n,o){let i=0;for(let a=t,s=n-o;a<n;a+=o)i+=(e[s]-e[a])*(e[a+1]+e[s+1]),s=a;return i}Object.assign(window,{BABYLON:{...Dt,...Et},earcut:It});(()=>{const e=`
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
    }`})();const an=new WeakMap;function sn(e){return an.get(e)?.rtt??null}const rn=450,He=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],We=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],Ge={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},ln={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function cn(e,t,n){const o=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),i=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=e.enableGeometryBufferRenderer(),s=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(x=>x.name!=="sky-cloud"&&!(x.metadata&&x.metadata.noGBuffer)))}),r=a.getGBuffer().textures,c=r[a.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],u=r[a.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=x=>new BABYLON.Vector2(1/x.width,1/x.height),d=new BABYLON.Matrix,p=["invView","tanHalf","resolution","skyDepth"],l=["depthSampler","normalSampler"];function f(x,g){t.getViewMatrix().invertToRef(d);const B=Math.tan(t.fov/2);x.setMatrix("invView",d),x.setVector2("tanHalf",new BABYLON.Vector2(B*g.width/g.height,B)),x.setVector2("resolution",new BABYLON.Vector2(g.width,g.height)),x.setFloat("skyDepth",rn),x.setTexture("depthSampler",c),x.setTexture("normalSampler",u)}const m=new BABYLON.PostProcess("wash","wash",["texel","radius",...p],l,1,t);m.onApply=x=>{f(x,m),x.setVector2("texel",h(m)),x.setFloat("radius",n.num("wash"))};const y=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...He,...p],["aquarelSampler",...l],1,t);y.onApply=x=>{f(x,y),x.setVector2("texel",h(y));const g=n.texture();x.setFloat("useTex",g?1:0),x.setTexture("aquarelSampler",g||o),He.forEach(B=>x.setFloat(B,n.num(B)))};const w=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...We,...p],["washSampler","animeSampler",...l],1,t);w.onApply=x=>{f(x,w),x.setTextureFromPostProcessOutput("washSampler",m),x.setTexture("animeSampler",sn(e)||i),x.setVector2("texel",h(w)),We.forEach(g=>x.setFloat(g,n.num(g))),x.setColor3("inkColor",BABYLON.Color3.FromArray(Ge[n.inkColor()]||Ge["blue-grey"]))};const D=[m,y,w];return{dispose(){D.forEach(x=>x.dispose(t)),e.onBeforeRenderObservable.remove(s),e.disableGeometryBufferRenderer(),o.dispose(),i.dispose()}}}const U={sky:380,bg:70,mid:22,fg:7,near:3.5},T={x:0,y:1.6,z:0,fov:50},pe=-2,ct=16/9,ht=.42,ge=1.6,hn=3,un=e=>hn*ee(e),fn=(e,t)=>t*e,dn=(e,t,n,o)=>fn(e,t)-(1-o)*n,ut=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,pn=999,mn=1e3,xn=.02,ft=.05,O=e=>e>Math.PI?e*Math.PI/180:e,ee=(e,t=T.fov,n=ct)=>2*e*Math.tan(O(t)/2)*n;function $(e,t,n,o=0){const i=t.depth,a=U[i]-n*ft,s=ee(a),r=i==="sky"?n*2+1:ut(a);if(e.layer==="sky"){const f=s*ge,m=f/ct,y=-m*.12;if(e.tileable_x)return{x:0,y,z:a,w:f,h:m,uRepeat:f/(m*(e.w/e.h)),alphaIndex:r};const w=Math.max(f/e.w,m/e.h);return{x:0,y,z:a,w:e.w*w,h:e.h*w,uRepeat:1,alphaIndex:r}}const c=e.layer==="bg"&&!e.tileable_x?s*ge*e.h/e.w:0,u=Math.max(e.height_m*(t.scale??1),c),h=u*(e.w/e.h),d=e.tileable_x?Math.max(h,s*ge):h,p=e.tileable_x?0:((t.x??.5)-.5)*s,l=i==="sky"?a*Math.tan(O(T.fov)/2)*.45:i==="bg"?o:0;return{x:p,y:l,z:a,w:d,h:u,uRepeat:e.tileable_x?d/h:1,alphaIndex:r}}function vn(e,t,n=0,o=ht,i=pe){const a=.5/Math.tan(O(T.fov)/2),s=.5+a*Math.tan(-i*Math.PI/180),r=U.bg-n*ft,c=T.y+(s-o)*r/a;return Math.round((c-t*(1-e))*10)/10}const je=e=>e-gn,gn=.002,$e={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},dt=(e,t)=>($e[e??"inOut"]??$e.inOut)(Math.min(1,Math.max(0,t))),Y=(e,t,n)=>e+(t-e)*n,pt=e=>e.dur_s??(e.camera&&Tn(e)||e.est_s||8);function mt(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),o=[...n].reverse().find(i=>(i.at_s??0)<=t)??n[0]??null;return{cam:o,t:o?t-(o.at_s??0):t}}function xt(e,t,n){if(!e)return{...T,fov:O(T.fov)};const o=dt(e.ease,n>0?t/(e.dur_s??n):1),i={...T,...e.from},a={...i,...e.to};return{x:Y(i.x,a.x,o),y:Y(i.y,a.y,o),z:Y(i.z,a.z,o),fov:Y(O(i.fov),O(a.fov),o)}}function vt(e,t){const n={x:e.x??.5,scale:e.scale??1,opacity:1},o=[...e.keys??[]].sort((s,r)=>s.t-r.t);if(!o.length)return n;const i=(s,r)=>s[r]??n[r],a={...n};for(const s of["x","scale","opacity"]){if(!o.some(d=>d[s]!==void 0))continue;if(t<=o[0].t){a[s]=i(o[0],s);continue}const r=o[o.length-1];if(t>=r.t){a[s]=i(r,s);continue}const c=o.findIndex(d=>d.t>t),u=o[c-1],h=o[c];a[s]=Y(i(u,s),i(h,s),dt("inOut",(t-u.t)/(h.t-u.t)))}return a}const wn={none:0,sway:1,drift:2,ripple:3,flicker:4};function yn(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??e.motion??"none",amount:n.amount??1,speed:n.speed??1}}const bn=.25,kn=2e3,Sn=250,I={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},Ye={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function Mn(e,t,n,o){const i=r=>{const c=e.lastDir&&e.lastDir!==r?e.flips+1:e.flips;return{...e,notches:e.notches+r,fast:0,lastChange:n,lastDir:r,flips:c,lastUp:r===-1?n:e.lastUp,locked:e.locked||c>=I.lockFlips&&r===1}};if(t<I.downFps)return o?i(1):{...e,fast:0};if(t<I.upFps)return{...e,fast:0};const a=e.fast+1;return e.notches>0&&!e.locked&&a>=I.upWindows&&n-e.lastChange>=I.upAfterChangeMs&&n-e.lastUp>=I.upEveryMs?i(-1):{...e,fast:a}}function Fn(e,t,n,o){const i=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),i-o*bn)}function Tn(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const Ze={breath_m:.05,breath_s:7},An=1.5;function En(e,t,n={}){const o=n.breath_m??Ze.breath_m,i=2*Math.PI/Math.max(.5,n.breath_s??Ze.breath_s),a=Math.min(1,t/An),s=a*a*(3-2*a);return{...e,x:e.x+o*s*Math.sin(i*t),y:e.y+o*.5*s*Math.sin(2*i*t)}}async function Dn(e){const t=await fetch(e);if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const _n=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function ce(e,t,n){if(t.asset){const s=e.assets.find(r=>r.id===t.asset);if(s)return s}const o=_n(t.need??t.asset??"");if(!o.length)return null;let i=null,a=[0,0,0];for(const s of[...e.assets].sort((r,c)=>r.id.localeCompare(c.id))){const r=o.filter(u=>s.tags.some(h=>h.toLowerCase()===u)).length;if(!r)continue;const c=[r,n&&s.layer===n?1:0,s.qa?.score??0];(!i||c[0]>a[0]||c[0]===a[0]&&(c[1]>a[1]||c[1]===a[1]&&c[2]>a[2]))&&(i=s,a=c)}return i}const Z="#f6f5ee",Pn=.22,Ln=(e,t)=>e.layer==="bg"?t.feather??Pn:0,we=.6,gt=12;function On(e,t){const n=t.paper??Z,o=e.ground;if(o&&o.startsWith("#"))return{kind:"paper",colour:o};const i=t.assets.filter(s=>s.layer==="ground");if(!o)return i.length?{kind:"asset",asset:[...i].sort((s,r)=>s.id.localeCompare(r.id))[0]}:{kind:"paper",colour:n};const a=ce({...t,assets:i},{asset:o},"ground");return a?{kind:"asset",asset:a}:{kind:"paper",colour:n,reason:`no ground for ${o}`}}function Bn(e,t,n,o=.08){return wt(e,t,n,1-o,1)}function wt(e,t,n,o,i){const a=Math.max(0,Math.floor(n*o)),s=Math.min(n,Math.max(a+1,Math.ceil(n*i))),r=[[],[],[]],c=Math.max(1,Math.floor(t*(s-a)/2e4));for(let h=a*t;h<s*t;h+=c){const d=h*4;e[d+3]<200||(r[0].push(e[d]),r[1].push(e[d+1]),r[2].push(e[d+2]))}if(!r[0].length)return null;const u=h=>{const d=[...h].sort((p,l)=>p-l);return d[d.length>>1]/255};return[u(r[0]),u(r[1]),u(r[2])]}const K=32,zn=(e,t,n)=>Array.from({length:K},(o,i)=>wt(e,t,n,i/K,(i+1)/K)),Cn=(e,t)=>e[Math.min(K-1,Math.max(0,Math.floor((1-t)*K)))]??null;function Rn(e,t,n){const o=[],i=Math.max(1,Math.floor(t*n/6e4));for(let a=0;a<t*n;a+=i){const s=a*4;if(e[s+3]<230)continue;const r=(.299*e[s]+.587*e[s+1]+.114*e[s+2])/255;r<.45&&o.push(r)}return o.length<20?null:(o.sort((a,s)=>a-s),o[o.length>>1])}function Vn(e,t,n){const o=[];for(let i=0;i<t;i++)for(let a=0;a<n;a++)if(e[(a*t+i)*4+3]>128){o.push(a/n);break}return o.length?(o.sort((i,a)=>i-a),o[o.length>>1]):0}function In(e,t,n){for(let o=0;o<n;o++){let i=0;for(let a=0;a<t;a++)e[(o*t+a)*4+3]>128&&i++;if(i/t>.5)return o/n}return 0}const Un=1.6,Nn=.12;function Hn(e,t,n,o){const i=e.layer==="figure",a=i?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),s=a*Nn*o/Un;return i?{w:a,d:Math.min(s,a*.5)}:{w:a,d:Math.min(Math.max(s,a*.3),a*3)}}const Wn=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,se=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},Ce=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,yt=Ce;_.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;_.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, nearTex;
  uniform float useTex, tile, grain, fadeNear, fadeFar, detail, vary, mixTile;
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${Ce}
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
  }`;_.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;_.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${Ce}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const Gn=e=>e?L.WRAP_ADDRESSMODE:L.MIRROR_ADDRESSMODE;function jn(e){const t=ze.CreateGround("ground",{width:2400,height:2400},e),n=new de("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tile","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","nearTex"],needAlphaBlending:!0}),o=new nt(new Uint8Array([255,255,255,255]),1,1,N.TEXTUREFORMAT_RGBA,e);n.setTexture("tex",o).setTexture("nearTex",o),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0);let i=gt,a=1;return t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=pn,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(s){s.tex&&(s.tex.wrapU=L.WRAP_ADDRESSMODE,s.tex.wrapV=L.WRAP_ADDRESSMODE),n.setTexture("tex",s.tex??o),i=s.tile,n.setFloat("useTex",s.tex?1:0).setFloat("tile",i*a).setFloat("grain",s.grain).setFloat("fadeNear",s.fadeNear).setFloat("fadeFar",s.fadeFar).setVector3("base",k.FromArray(s.base)).setVector3("horizonTint",k.FromArray(s.tint))},follow(s){n.setVector3("camPos",s)},live(s){a=s.tileScale,n.setFloat("detail",s.detail).setFloat("vary",s.vary).setFloat("mixTile",s.mixTile).setFloat("tile",i*a)},near(s){n.setFloat("useNear",s?1:0),s&&(s.tex.wrapU=Gn(s.tileable),s.tex.wrapV=L.CLAMP_ADDRESSMODE,n.setTexture("nearTex",s.tex).setMatrix("nearVP",s.vp).setFloat("nearTop",s.top).setFloat("nearSpan",s.span))}}}let $n=0;function Ke(e,t,n,o,i){const a=ze.CreatePlane(`stain${i?"-cast":""}:${e.name}`,{width:t,height:i?i.length:n},o);if(a.rotation.x=Math.PI/2,i){const[r,c]=i.dir,u=Math.hypot(r,c)||1;a.rotation.y=Math.atan2(r/u,c/u),a.position.set(r/u*i.length*.42,.015,c/u*i.length*.42)}else a.position.set(0,.02,-n*.18);a.parent=e;const s=new de(a.name,o,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return s.alphaMode=N.ALPHA_PREMULTIPLIED,s.disableDepthWrite=!0,s.backFaceCulling=!1,s.setFloat("seed",$n++*7.31%97).setFloat("opacity",0),a.material=s,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,setOpacity:r=>{s.setFloat("opacity",r),a.isVisible=r>.001}}}_.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;_.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${yt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;_.ShadersStore.stageBirdFragmentShader=`
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
  }`;function bt(e,t,n,o){const i=ze.CreatePlane(e,{size:1},n),a=new de(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return a.alphaMode=N.ALPHA_PREMULTIPLIED,a.disableDepthWrite=!0,a.backFaceCulling=!1,i.material=a,i.billboardMode=ot.BILLBOARDMODE_ALL,i.alphaIndex=o,i.metadata={noGBuffer:!0},i.isPickable=!1,{mesh:i,mat:a}}const kt=9,Yn=9;function Zn(e,t,n,o){const i=Array.from({length:kt},(a,s)=>{const r=bt(`smoke:${s}`,"stagePuff",e,o);return r.mat.setFloat("seed",s*3.7),r});return{update(a,s){i.forEach(({mesh:r,mat:c},u)=>{const h=Kn(a,u),d=n*(.6+3.2*h);r.scaling.setAll(d),r.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(u*2.1+a*.3),t.y+n*(.4+7*h),t.z),c.setFloat("alpha",s*.7*Math.sin(Math.PI*h)),r.isVisible=s>.001})},dispose(){i.forEach(({mesh:a,mat:s})=>{s.dispose(),a.dispose()})}}}const Kn=(e,t)=>((e/Yn+t/kt)%1+1)%1,ye=40,Xe=16;function Xn(e){const t=(e%ye+ye)%ye;return t<Xe?t/Xe:null}function qn(e,t,n,o){const i=Array.from({length:6},(a,s)=>bt(`bird:${s}`,"stageBird",e,o));return{update(a,s){const r=Xn(a),c=Math.round(2+s*4);i.forEach(({mesh:u,mat:h},d)=>{if(u.isVisible=s>.001&&r!==null&&d<c,!u.isVisible||r===null)return;const p=d*.025;u.position.set((r-p-.5)*n*1.2,22+3*Math.sin(d*1.7)+4*r,t+d*1.5),u.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,s*2)).setFloat("flap",Math.sin(a*7+d*1.3))})},dispose(){i.forEach(({mesh:a,mat:s})=>{s.dispose(),a.dispose()})}}}const qe=["fire","hearth","chimney","smoke"],Jn=e=>e.id.split(/[-_]/).some(t=>qe.includes(t))||e.tags.some(t=>qe.includes(t.toLowerCase())),be=e=>e[0].toUpperCase()+e.slice(1),Qn=e=>({fade:`lineFade${be(e)}`,thin:`lineThin${be(e)}`,haze:`haze${be(e)}`}),fe={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:pe,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},eo=[1.05,1,.9],to=[.88,.93,1.05],no=.35;function oo(e,t,n,o){const i=t==="sky";return{edgeSoft:i?0:F(e,"edgeSoft"),footM:t==="standing"?no:0,grounding:t==="figure"?0:F(e,"grounding"),grass:t==="figure"?0:F(e,"grassOverlap"),light:i?0:F(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:i?F(e,"cloudDrift"):0,footTint:o}}const St=[.93,.86,.74],Je=e=>({paper:F(e,"sheetPaper"),grain:F(e,"sheetGrain"),patches:F(e,"sheetPatches"),wash:F(e,"sheetWash"),washColour:St}),ao={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01]};Object.fromEntries(Object.keys(fe).map(e=>[e,ao[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])]));const z=(e,t)=>F(e,t),F=(e,t)=>{const n=Number(e[t]??fe[t]);return Number.isFinite(n)?n:fe[t]};function ke(e,t){const n=Qn(t);return{fade:F(e,n.fade),thin:F(e,n.thin),haze:F(e,n.haze),brown:F(e,"lineBrown"),ink:F(e,"lineInk"),norm:F(e,"lineNorm")}}const so=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),Se=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),ie=(e,t,n,o,i)=>{const a=o*(1080/i);return[n/Math.max(e*a,.001),1/Math.max(t*a,.001)]};function io(e,t,n){const o=new k(T.x,T.y,T.z),i=ve.RotationX(e*Math.PI/180),s=ve.LookAtLH(o,o.add(k.TransformNormal(new k(0,0,1),i)),k.TransformNormal(k.Up(),i)).multiply(ve.PerspectiveFovLH(O(T.fov),t,.1,2e3));return{vp:s,top:k.TransformCoordinates(new k(0,0,n),s).y}}_.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function ro(e,t){const n=new _t("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=o=>{o.setFloat("wash",t("sheetWash")).setVector3("washColour",k.FromArray(St))},n}const lo=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,co=`
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
  }`;_.ShadersStore.stageLayerVertexShader=`
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
  }`;_.ShadersStore.stageLayerFragmentShader=`
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
  ${yt}
  ${lo}
  ${co}
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
  }`;const Me=new Map,Mt=new Map,Ft=new Map,Tt=new Map,At=new Map,Be=new Map;function re(e,t){const n=Me.get(e);if(n)return n;const o=new Promise((i,a)=>{const s=new Image;s.crossOrigin="anonymous",s.onerror=()=>a(new Error(`layer image ${e} did not load`)),s.onload=()=>{const r=document.createElement("canvas");r.width=s.naturalWidth,r.height=s.naturalHeight;const c=r.getContext("2d",{willReadFrequently:!0});c.drawImage(s,0,0);const u=c.getImageData(0,0,r.width,r.height).data,h=Bn(u,r.width,r.height);h&&Mt.set(e,h),Be.set(e,zn(u,r.width,r.height)),Ft.set(e,In(u,r.width,r.height)),Tt.set(e,Vn(u,r.width,r.height));const d=Rn(u,r.width,r.height);d!==null&&At.set(e,d);for(let l=0;l<u.length;l+=4){const f=u[l+3]/255;u[l]=Math.round(u[l]*f),u[l+1]=Math.round(u[l+1]*f),u[l+2]=Math.round(u[l+2]*f)}const p=new nt(u,r.width,r.height,N.TEXTUREFORMAT_RGBA,t,!0,!1,L.TRILINEAR_SAMPLINGMODE);p.anisotropicFilteringLevel=8,p.wrapV=L.CLAMP_ADDRESSMODE,i(p)},s.src=e});return Me.set(e,o),o.catch(()=>Me.delete(e)),o}const Fe=24;function ho(e,t,n,o,i){const[a,s]=t.anchor??[.5,1],r=[],c=[],u=[];for(let d=0;d<=Fe;d++){const p=d/Fe;for(const l of[0,1])r.push((l-a)*n,(s-p)*o,0),c.push(l,p);if(d<Fe){const l=d*2;u.push(l,l+2,l+1,l+1,l+2,l+3)}}const h=new ot(e,i);return Object.assign(new Pt,{positions:r,uvs:c,indices:u}).applyToMesh(h),h}let uo=0;function Qe(e,t,n,o,i,a){const s=ho(`layer:${e.id}`,e,n,o,a),r=new de(`layer:${e.id}`,a,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=i!==1?L.WRAP_ADDRESSMODE:L.CLAMP_ADDRESSMODE,r.setTexture("tex",t),r.alphaMode=N.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1;const c=uo++*2.39996%(Math.PI*2),u=e.anchor?.[1]??1;return r.setFloat("phase",c).setFloat("height",o*u).setFloat("width",n).setFloat("uRepeat",i).setFloat("opacity",1),r.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),r.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),r.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),s.material=r,s.metadata={noGBuffer:!0,painted:!0},s.isPickable=!1,{mesh:s,material:r,setMotion:h=>{r.setFloat("kind",wn[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{r.setFloat("opacity",h),s.isVisible=h>.001},setLine:(h,d,p,l)=>{r.setFloat("inkMul",d).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),r.setVector2("pxUV",new Ve(p[0],p[1])).setVector3("hazeTint",k.FromArray(l))},setPaper:(h,d)=>{r.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),r.setVector3("washColour",k.FromArray(h.washColour)).setVector2("grainUV",new Ve(d[0],d[1]))},setBottomFade:h=>{r.setFloat("bottomFade",h)},setAlive:h=>{r.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),r.setVector3("footTint",k.FromArray(h.footTint)).setVector3("sunColour",k.FromArray(eo)).setVector3("shadeColour",k.FromArray(to))},setGroundLine:h=>{r.setFloat("groundLine",h)},setFeather:(h,d)=>{r.setFloat("feather",Math.max(0,Math.min(1,h))),d&&r.setVector3("featherTint",k.FromArray(d))}}}const et={...ln["History Lines pencil"],paper:.35,granulation:.2,...fe},fo=new Bt(.937,.914,.863,1),po=.7,mo=(e,t,n)=>e.map((o,i)=>o+(t[i]-o)*n);class xo{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new Lt(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Ot(this.engine),this.scene.clearColor=fo,this.camera=new zt("house",new k(0,1.6,0),this.scene),this.camera.rotation.set(pe*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new Ct("sky",new k(0,1,0),this.scene).intensity=.7,new Rt("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=jn(this.scene),this.ground.set(this.groundLook(null,null,n)),this.birds=qn(this.scene,tt,ee(tt),go),cn(this.scene,this.camera,{num:o=>Number(this.look[o]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),ro(this.camera,o=>Number(this.look[o]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=se(Z);strip=null;nearTex=null;bands=[];smoke=[];birds;footTint=se(Z);nearAsset=null;hazeTint=se(Z);sceneLib;buildToken=0;look={...et};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(o=>({scene:t,...o})))}renderCap=1920;tier=Ye;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return Fn(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=Ye,this.window.start=0,this.fit()}tick(t){const n=this.window,o=document.hidden||n.last&&t-n.last>Sn;if(n.last=t,!n.start||o){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<kn)return;const i=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const a=this.tier.notches;this.tier=Mn(this.tier,i,t,this.scaleAt(a+1)<this.scaleAt(a)),this.tier.notches!==a&&this.fit()}setLook(t){this.look={...et,...t??{}}}groundPoint(t,n){const o=U[n];return new k((t-.5)*ee(o),0,o)}async build(t,n=this.lib){const o=++this.buildToken,i=[],a=[];t.set.sky&&a.push({layer:{asset:t.set.sky,depth:"sky"},order:0,index:-1});const s={sky:1};t.set.layers.forEach((v,M)=>{const H=v.depth;s[H]=s[H]??0,a.push({layer:v,order:s[H]++,index:M})});const r=[];await Promise.all(a.map(async({layer:v,order:M,index:H})=>{const P=ce(n,v,v.depth);if(!P){r.push({need:v.need??v.asset,reason:"no match"});return}let Re;try{Re=await re(n.base+P.file,this.scene)}catch{r.push({need:v.need??v.asset,reason:`file did not load: ${P.file}`});return}if(o!==this.buildToken)return;const A=$(P,v,M),C=Qe(P,Re,A.w,A.h,A.uRepeat,this.scene);C.mesh.position.set(A.x,A.y,A.z),C.mesh.alphaIndex=v.flat?mn:A.alphaIndex,v.flat&&(C.mesh.rotation.x=Math.PI/2),C.mesh.isVisible=!1;let me,xe;if(Te.includes(v.depth)&&!P.tileable_x&&!v.flat){const ne=Hn(P,A.w,A.h,A.z);me=Ke(C.mesh,ne.w,ne.d,this.scene),me.mesh.alphaIndex=je(A.alphaIndex),xe=Ke(C.mesh,ne.w,ne.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:A.h*wo(this.sunDir)}),xe.mesh.alphaIndex=je(A.alphaIndex)}i.push({layer:v,index:H,builtScale:v.scale??1,handle:C,asset:P,order:M,stain:me,cast:xe,ink:At.get(n.base+P.file)})}));const c=On(t.set,n);let u=null,h=null;const d=Wn(t.set.near,n),p=d?ce(n,{asset:d}):null;if(t.set.near&&!p&&r.push({need:t.set.near,reason:"no near band"}),p)try{h=await re(n.base+p.file,this.scene)}catch{r.push({need:t.set.near,reason:`file did not load: ${p.file}`})}if(c.kind==="asset")try{u=await re(n.base+c.asset.file,this.scene)}catch{r.push({need:t.set.ground??"ground",reason:`file did not load: ${c.asset.file}`})}else c.reason&&r.push({need:t.set.ground,reason:c.reason});const l=i.filter(v=>v.asset.layer==="bg").sort((v,M)=>v.index-M.index)[0],f=l?{top:Ft.get(n.base+l.asset.file)??0,h:$(l.asset,l.layer,l.order).h,order:l.order}:null,m=i.find(v=>v.index===-1),y=m&&$(m.asset,m.layer,m.order),w=m&&y?Cn(Be.get(n.base+m.asset.file)??[],(T.y-y.y)/y.h):null,D=l?Mt.get(n.base+l.asset.file)??null:t.set.groundBands?.length?null:w,x=await this.loadBands(t,n),g=v=>v.forEach(M=>{M.stain?.mesh.material?.dispose(),M.cast?.mesh.material?.dispose(),M.handle.mesh.dispose(),M.handle.material.dispose()});if(o!==this.buildToken){g(i),x.forEach(v=>{v.handle.mesh.dispose(),v.handle.material.dispose()});return}g(this.built),this.bands.forEach(v=>{v.handle.mesh.dispose(),v.handle.material.dispose()}),this.bands=x,this.built=i,this.sceneLib=n;const B=c.kind==="asset"?(Be.get(n.base+c.asset.file)??[]).filter(v=>!!v):[],te=this.groundLook(c.kind==="asset"?{tex:u,asset:c.asset}:null,D,n,c.kind==="paper"?c.colour:void 0);this.horizonTint=te.tint,this.strip=f,this.smoke.forEach(v=>v.dispose()),this.smoke=i.filter(v=>Jn(v.asset)&&Te.includes(v.layer.depth)&&!v.layer.flat).map(v=>{const M=$(v.asset,v.layer,v.order);return Zn(this.scene,new k(v.handle.mesh.position.x,M.h*.6,M.z),Math.min(Math.max(M.h*.8,.5),3),M.alphaIndex)}),this.footTint=B.length?yo(B):te.base,this.nearTex=h,this.nearAsset=p,this.hazeTint=w??te.tint,this.ground.set(te),this.missed.set(t.id,r),r.length&&console.warn(`stage25d: ${t.id}: missing`,r)}groundLook(t,n,o,i){const a=se(i??o.paper??Z),s=n??a;return{tex:t?.tex??null,tile:t?.asset.height_m||gt,base:mo(a,s,po),tint:s,fadeNear:U.fg,fadeFar:U.bg*.75,grain:t?.tex?.5:1}}rebind(t){this.built.forEach(n=>{n.index>=0&&(n.layer=t.set.layers[n.index])})}sunDir=new k(.55,-1,-.3).normalize();depthLine(t){return{...ke(this.look,t),tint:this.hazeTint}}paper(){return Je(this.look)}async loadBands(t,n){const o=[];for(const i of t.set.groundBands??[]){const a=ce(n,{asset:i.asset},"ground_band");if(!a){console.warn(`stage25d: ${t.id}: no ground band ${i.asset}`);continue}const s=await re(n.base+a.file,this.scene).catch(()=>null);if(!s){console.warn(`stage25d: ${t.id}: ground band ${a.file} did not load`);continue}const r=un(i.z),c=r*a.h/a.w,u=Qe(a,s,r,c,1,this.scene);u.material.depthFunction=N.ALWAYS,u.mesh.position.set(0,0,i.z),u.mesh.alphaIndex=ut(i.z),o.push({handle:u,z:i.z,w:r,h:c,skyline:Tt.get(n.base+a.file)??.5})}return o}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?vn(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??ht,z(this.look,"housePitch")):0}pose(t,n,o,i){const a=mt(t,n),s=xt(a.cam,a.t,pt(t)),r=i?En(s,i.t,i):s;this.camera.position.set(r.x,r.y,r.z),this.camera.fov=r.fov;const c=z(this.look,"housePitch");this.camera.rotation.x=c*Math.PI/180,this.ground.follow(this.camera.position);const u=l=>z(this.look,l);this.ground.live({detail:u("groundDetail"),vary:u("groundVary"),mixTile:u("groundMix"),tileScale:u("groundScale")}),this.ground.near(this.nearTex?{tex:this.nearTex,...io(c,this.engine.getAspectRatio(this.camera),u("nearFar")),span:vo,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),d=Je(this.look),p=z(this.look,"bandHeight");this.bands.forEach(l=>{l.handle.mesh.position.y=dn(l.z,p,l.h,l.skyline);const f=Se(h,l.z-T.z,O(T.fov));l.handle.setOpacity(1),l.handle.setBottomFade(Math.min(1,z(this.look,"bandFade")/l.h)),l.handle.setPaper(d,ie(l.w,l.h,1,f,h)),l.handle.setLine(ke(this.look,"bg"),1,ie(l.w,l.h,1,f,h),this.hazeTint)}),this.smoke.forEach(l=>l.update(o,z(this.look,"smoke"))),this.birds.update(o,z(this.look,"birds"));for(const l of this.built){const f=vt(l.layer,n),m=$(l.asset,{...l.layer,x:f.x,scale:1},l.order,this.horizonOf(t));l.handle.mesh.position.x=m.x,l.handle.mesh.position.y=l.layer.flat?xn:m.y,l.handle.mesh.scaling.setAll(f.scale/l.builtScale),l.handle.setOpacity(f.opacity),l.handle.setFeather(Ln(l.asset,l.layer),this.horizonTint),l.asset.layer==="sky"&&l.handle.setGroundLine((r.y-m.y)/(m.h*f.scale));const y=Se(h,m.z-r.z,this.camera.fov),w=ke(this.look,l.layer.depth);l.handle.setPaper(d,ie(m.w*f.scale,m.h*f.scale,m.uRepeat,Se(1080,m.z-T.z,O(T.fov)),1080)),l.handle.setLine(w,l.ink===void 0?1:so(l.ink,w.ink,w.norm),ie(m.w*f.scale,m.h*f.scale,m.uRepeat,y,h),this.hazeTint),l.stain?.setOpacity((l.layer.shadow??we)*f.opacity),l.cast?.setOpacity(z(this.look,"castShadow")*((l.layer.shadow??we)/we)*f.opacity);const D=l.asset.layer==="sky"?"sky":l.asset.layer==="bg"?"strip":l.asset.layer==="figure"?"figure":Te.includes(l.layer.depth)&&!l.layer.flat?"standing":"other";l.handle.setAlive(oo(this.look,D,this.sunDir.x,this.footTint)),l.handle.setMotion(yn(l.asset,l.layer)),l.handle.material.setFloat("time",o)}}}const vo=1.3,tt=110,go=900,wo=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),yo=e=>[0,1,2].map(t=>e.reduce((n,o)=>n+o[t],0)/e.length),Te=["mid","fg","near"],bo=16/9,ko=.92;function So(e,t,n,o){const{cam:i,t:a}=mt(e,o),s=xt(i,a,pt(e)),r=U[t.depth],c=r-s.z;if(c<=.5)return null;const u=vt(t,o),h=(u.x-.5)*ee(r),d=Math.tan(s.fov/2),p=(h-s.x)/(c*d*bo),l=-pe*Math.PI/180,f=Math.tan(Math.atan2(n*u.scale-s.y,c)-l)/d;return Math.abs(p)>ko?null:{x:(p+1)/2,y:Math.min(1,Math.max(0,(1-f)/2))}}const le=new Map;function Mo(e){return le.has(e)||le.set(e,Dn(Vt(e)).catch(t=>{throw le.delete(e),t})),le.get(e)}const Fo=e=>({id:e.id??"scene",set:e.set??{layers:[]},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function Do(e){const t=document.createElement("canvas");t.className="stage25d-canvas",t.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(t);let n=null,o=null,i=null,a=null,s=new Map,r=0,c=null,u=0,h=0,d=performance.now(),p=!1;const l=()=>{n.engine.runRenderLoop(()=>{const f=performance.now();h+=Math.min(.1,(f-d)/1e3),d=f,n.tick(f),o&&n.pose(o,c?c():r,h),n.scene.render()})};return{canvas:t,async show(f){const m=await Mo(f.bundle);if(p)return;n||(n=new xo(t,m),l()),n.setLook(f.look);const y=Fo(f);await n.build(y,m),o=y,a=f,s=new Map(m.assets.map(w=>[w.id,w.height_m??1.7])),u=Number(f.narration_at_s)||0,i=JSON.stringify(f),e.dataset.stage25dReady="1"},matches:f=>i===JSON.stringify(f),update(f){c=null,r=Math.max(0,f)},play(f){c=()=>u+f()},get config(){return a},figureBox(f){const m=o?.set.layers.find(x=>x.figure===f);if(!m?.asset)return null;const y=So(o,m,s.get(m.asset)??1.7,c?c():r);if(!y)return null;const w=t.getBoundingClientRect(),D=w.width*.05;return new DOMRect(w.left+y.x*w.width-D/2,w.top+y.y*w.height,D,w.height*.08)},items:()=>(o?.set.layers??[]).map((f,m)=>({id:`layer-${m}`,label:f.asset??f.need??`layer ${m+1}`,depth:f.depth})),destroy(){p=!0,delete e.dataset.stage25dReady;try{n?.engine.stopRenderLoop(),n?.scene.dispose(),n?.engine.dispose()}catch{}t.remove()}}}export{Do as createStage25d,Fo as stageScene};
