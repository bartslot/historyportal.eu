import{m as jn,c as Yn,M as Ke,S as Xe,R as pn,C as ve,T as he,V as C,E as re,a as mn,b as be,P as Zn,d as _t,e as Kn,f as Xn,g as qn,h as gn,U as Jn,H as Qn,D as eo}from"./babylon-BEUo0Gn_.js";import{l as to}from"./config-qjtb2AOJ.js";import{handleCss as no}from"./ArtworkOverlay-DcAxjs8O.js";import{g as ut,c as oo,w as Pt,h as so,e as ao}from"./projection-CL24asTn.js";import"./vite-helpers-DqutJMZx.js";import"./properties-fhY1XOus.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-T8rltTHU.js";import"./ambient-CEzLlAaX.js";const _e=new Set;let ft=!1;function io(e,t,n=2){const o=t&&t.length,a=o?t[0]*n:e.length;_e.size&&_e.clear();let i=xn(e,0,a,n,!0);const s=[];if(!i||i.next===i.prev)return s;let r=0,l=0,u=0;if(o&&(i=uo(e,t,i,n)),e.length>80*n){r=e[0],l=e[1];let h=r,v=l;for(let b=n;b<a;b+=n){const x=e[b],p=e[b+1];x<r&&(r=x),p<l&&(l=p),x>h&&(h=x),p>v&&(v=p)}u=Math.max(h-r,v-l),u=u!==0?32767/u:0}return pt(i,s,r,l,u),s}function xn(e,t,n,o,a){let i=null;if(a===Eo(e,t,n,o)>0)for(let s=t;s<n;s+=o)i=Ct(s/o|0,e[s],e[s+1],i);else for(let s=n-o;s>=t;s-=o)i=Ct(s/o|0,e[s],e[s+1],i);return i&&Pe(i,i.next)&&(Re(i),i=i.next),i}function ye(e,t=e){const n=t===e;let o=e,a;do a=!1,o!==o.next&&(_e.size===0||!_e.has(o))&&(Pe(o,o.next)||N(o.prev,o,o.next)===0)?((n||o===t)&&(t=o.prev),ft=!0,Re(o),o=o.prev,a=!0):(n||o!==t)&&(o=o.next,a=!n);while(a||o!==t);return t}function pt(e,t,n,o,a){a&&yo(e,n,o,a);let i=e,s=!1;for(;e.prev!==e.next;){const r=e.prev,l=e.next;if(N(r,e,l)<0&&(a?lo(e,n,o,a):ro(e))){t.push(r.i,e.i,l.i),Re(e),e=l,i=l;continue}if(e=l,e===i){if(ft=!1,e=ye(e),ft){i=e;continue}if(!s){e=co(e,t),i=e,s=!0;continue}ho(e,t,n,o,a);break}}}function ro(e){const t=e.prev,n=e,o=e.next,a=t.x,i=n.x,s=o.x,r=t.y,l=n.y,u=o.y,h=Math.min(a,i,s),v=Math.min(r,l,u),b=Math.max(a,i,s),x=Math.max(r,l,u);let p=o.next;for(;p!==t;){if(p.x>=h&&p.x<=b&&p.y>=v&&p.y<=x&&!(a===p.x&&r===p.y)&&We(a,r,i,l,s,u,p.x,p.y)&&N(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function lo(e,t,n,o){const a=e.prev,i=e,s=e.next,r=a.x,l=i.x,u=s.x,h=a.y,v=i.y,b=s.y,x=Math.min(r,l,u),p=Math.min(h,v,b),c=Math.max(r,l,u),w=Math.max(h,v,b),M=vt(x,p,t,n,o),R=vt(c,w,t,n,o);let y=e.prevZ;for(;y&&y.z>=M;){if(y.x>=x&&y.x<=c&&y.y>=p&&y.y<=w&&y!==s&&!(r===y.x&&h===y.y)&&We(r,h,l,v,u,b,y.x,y.y)&&N(y.prev,y,y.next)>=0)return!1;y=y.prevZ}let F=e.nextZ;for(;F&&F.z<=R;){if(F.x>=x&&F.x<=c&&F.y>=p&&F.y<=w&&F!==s&&!(r===F.x&&h===F.y)&&We(r,h,l,v,u,b,F.x,F.y)&&N(F.prev,F,F.next)>=0)return!1;F=F.nextZ}return!0}function co(e,t){let n=e,o=!1;do{const a=n.prev,i=n.next.next;wn(a,n,n.next,i,!1)&&Oe(a,i)&&Oe(i,a)&&(t.push(a.i,n.i,i.i),Re(n),Re(n.next),n=e=i,o=!0),n=n.next}while(n!==e);return o?ye(n):n}function ho(e,t,n,o,a){let i=e;do{let s=i.next.next;for(;s!==i.prev;){if(i.i!==s.i&&ko(i,s)){let r=bn(i,s);i=ye(i,i.next),r=ye(r,r.next),pt(i,t,n,o,a),pt(r,t,n,o,a);return}s=s.next}i=i.next}while(i!==e)}let mt=!1;function uo(e,t,n,o){const a=[];for(let i=0,s=t.length;i<s;i++){const r=t[i]*o,l=i<s-1?t[i+1]*o:e.length,u=xn(e,r,l,o,!1);u===u.next&&_e.add(u),a.push(bo(u))}a.sort(fo),mo(e.length/o,t.length),yn(n,n),mt=!0;for(let i=0;i<a.length;i++)n=po(a[i],n);return mt=!1,ye(n)}function fo(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function po(e,t){const n=xo(e,t);if(!n)return t;const o=bn(n,e),a=o.next;return yn(n,a.next),ye(o,o.next),ye(n,n.next)}const vn=16;let I=new Float64Array(0),Ge=0;const gt=[],xt=[];function mo(e,t){const n=Math.ceil((e+2*t)/vn)+t+2;I.length<n*4&&(I=new Float64Array(n*4)),Ge=0}function yn(e,t){let n=e;do{const o=Ge++;gt[o]=n;let a=1/0,i=1/0,s=-1/0,r=-1/0,l=0;do{const h=n.next;n.z=o,n.x<a&&(a=n.x),n.x>s&&(s=n.x),n.y<i&&(i=n.y),n.y>r&&(r=n.y),h.x<a&&(a=h.x),h.x>s&&(s=h.x),h.y<i&&(i=h.y),h.y>r&&(r=h.y),n=h}while(++l<vn&&n!==t);xt[o]=n;const u=o*4;I[u]=a,I[u+1]=i,I[u+2]=s,I[u+3]=r}while(n!==t)}function go(e,t){const n=e.z*4;t.x<I[n]&&(I[n]=t.x),t.y<I[n+1]&&(I[n+1]=t.y),t.x>I[n+2]&&(I[n+2]=t.x),t.y>I[n+3]&&(I[n+3]=t.y)}function Ot(e){let t=xt[e];for(;t.prev.next!==t;)t=t.next;return xt[e]=t,t}function Rt(e){let t=gt[e];for(;t.prev.next!==t;)t=t.next;return gt[e]=t,t}function xo(e,t){let n=t;const o=e.x,a=e.y;let i=-1/0,s;if(Pe(e,n))return n;for(let b=0,x=0;b<Ge;b++,x+=4){if(a<I[x+1]||a>I[x+3]||I[x]>o||I[x+2]<=i)continue;const p=Ot(b);n=Rt(b);do{if(n.prev.next===n){if(Pe(e,n.next))return n.next;if(a<=n.y&&a>=n.next.y&&n.next.y!==n.y){const c=n.x+(a-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(c<=o&&c>i&&(i=c,s=n.x<n.next.x?n:n.next,c===o))return s}}n=n.next}while(n!==p)}if(!s)return null;const r=s.x,l=s.y,u=Math.min(a,l),h=Math.max(a,l);let v=1/0;for(let b=0,x=0;b<Ge;b++,x+=4){if(I[x+2]<r||I[x]>o||I[x+3]<u||I[x+1]>h)continue;const p=Ot(b);n=Rt(b);do{if(n.prev.next===n&&o>=n.x&&n.x>=r&&o!==n.x&&We(a<l?o:i,a,r,l,a<l?i:o,a,n.x,n.y)){const c=Math.abs(a-n.y)/(o-n.x);(Oe(n,e)||n.y===a&&n.next.y===a&&n.next.x>o)&&(c<v||c===v&&(n.x>s.x||n.x===s.x&&vo(s,n)))&&(s=n,v=c)}n=n.next}while(n!==p)}return s}function vo(e,t){return N(e.prev,e,t.prev)<0&&N(t.next,e,e.next)<0}const ee=[];let Me=[],ge=new Uint32Array(0),Se=new Uint32Array(0);const Ee=new Uint32Array(256);function yo(e,t,n,o){let a=e,i=0;do a.z=vt(a.x,a.y,t,n,o),ee[i++]=a,a=a.next;while(a!==e);wo(i);let s=null;for(let r=0;r<i;r++){const l=ee[r];l.prevZ=s,s&&(s.nextZ=l),s=l}s.nextZ=null}function wo(e){if(e<=32){for(let t=1;t<e;t++){const n=ee[t],o=n.z;let a=t-1;for(;a>=0&&ee[a].z>o;)ee[a+1]=ee[a],a--;ee[a+1]=n}return}ge.length<e&&(ge=new Uint32Array(e),Se=new Uint32Array(e),Me=new Array(e));for(let t=0;t<e;t++)ge[t]=ee[t].z;Be(e,ee,ge,Me,Se,0),Be(e,Me,Se,ee,ge,8),Be(e,ee,ge,Me,Se,16),Be(e,Me,Se,ee,ge,24)}function Be(e,t,n,o,a,i){Ee.fill(0);for(let r=0;r<e;r++)Ee[n[r]>>>i&255]++;let s=0;for(let r=0;r<256;r++){const l=Ee[r];Ee[r]=s,s+=l}for(let r=0;r<e;r++){const l=n[r],u=Ee[l>>>i&255]++;o[u]=t[r],a[u]=l}}function vt(e,t,n,o,a){return e=(e-n)*a|0,t=(t-o)*a|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function bo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function We(e,t,n,o,a,i,s,r){return(a-s)*(t-r)>=(e-s)*(i-r)&&(e-s)*(o-r)>=(n-s)*(t-r)&&(n-s)*(i-r)>=(a-s)*(o-r)}function ko(e,t){const n=Pe(e,t)&&N(e.prev,e,e.next)>0&&N(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Oe(e,t)&&Oe(t,e)&&(N(e.prev,e,t.prev)!==0||N(e,t.prev,t)!==0))&&!Mo(e,t)&&(n||So(e,t))}function N(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Pe(e,t){return e.x===t.x&&e.y===t.y}function wn(e,t,n,o,a=!0){const i=N(e,t,n),s=N(e,t,o),r=N(n,o,e),l=N(n,o,t);return(i>0&&s<0||i<0&&s>0)&&(r>0&&l<0||r<0&&l>0)?!0:a?!!(i===0&&Ie(e,n,t)||s===0&&Ie(e,o,t)||r===0&&Ie(n,e,o)||l===0&&Ie(n,t,o)):!1}function Ie(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Mo(e,t){const n=Math.min(e.x,t.x),o=Math.max(e.x,t.x),a=Math.min(e.y,t.y),i=Math.max(e.y,t.y);let s=e;do{const r=s.next;if(s.x>o&&r.x>o||s.x<n&&r.x<n||s.y>i&&r.y>i||s.y<a&&r.y<a){s=r;continue}if(s.i!==e.i&&r.i!==e.i&&s.i!==t.i&&r.i!==t.i&&wn(s,r,e,t))return!0;s=r}while(s!==e);return!1}function Oe(e,t){return N(e.prev,e,e.next)<0?N(e,t,e.next)>=0&&N(e,e.prev,t)>=0:N(e,t,e.prev)<0||N(e,e.next,t)<0}function So(e,t){let n=e,o=!1;const a=(e.x+t.x)/2,i=(e.y+t.y)/2;do{const s=n.next;n.y>i!=s.y>i&&a<(s.x-n.x)*(i-n.y)/(s.y-n.y)+n.x&&(o=!o),n=s}while(n!==e);return o}function bn(e,t){const n=yt(e.i,e.x,e.y),o=yt(t.i,t.x,t.y),a=e.next,i=t.prev;return e.next=t,t.prev=e,n.next=a,a.prev=n,o.next=n,n.prev=o,i.next=o,o.prev=i,o}function Ct(e,t,n,o){const a=yt(e,t,n);return o?(a.next=o.next,a.prev=o,o.next.prev=a,o.next=a):(a.prev=a,a.next=a),a}function Re(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),mt&&go(e.prev,e.next)}function yt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function Eo(e,t,n,o){let a=0;for(let i=t,s=n-o;i<n;i+=o)a+=(e[s]-e[i])*(e[i+1]+e[s+1]),s=i;return a}Object.assign(window,{BABYLON:{...Yn,...jn},earcut:io});(()=>{const e=`
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
    }`})();const Ao=new WeakMap;function Fo(e){return Ao.get(e)?.rtt??null}const To=450,Bt=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],It=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],Vt={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},zo={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function Do(e,t,n){const o=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),i=e.enableGeometryBufferRenderer(),s=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(y=>y.name!=="sky-cloud"&&!(y.metadata&&y.metadata.noGBuffer)))}),r=i.getGBuffer().textures,l=r[i.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],u=r[i.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=y=>new BABYLON.Vector2(1/y.width,1/y.height),v=new BABYLON.Matrix,b=["invView","tanHalf","resolution","skyDepth"],x=["depthSampler","normalSampler"];function p(y,F){t.getViewMatrix().invertToRef(v);const H=Math.tan(t.fov/2);y.setMatrix("invView",v),y.setVector2("tanHalf",new BABYLON.Vector2(H*F.width/F.height,H)),y.setVector2("resolution",new BABYLON.Vector2(F.width,F.height)),y.setFloat("skyDepth",To),y.setTexture("depthSampler",l),y.setTexture("normalSampler",u)}const c=new BABYLON.PostProcess("wash","wash",["texel","radius",...b],x,1,t);c.onApply=y=>{p(y,c),y.setVector2("texel",h(c)),y.setFloat("radius",n.num("wash"))};const w=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...Bt,...b],["aquarelSampler",...x],1,t);w.onApply=y=>{p(y,w),y.setVector2("texel",h(w));const F=n.texture();y.setFloat("useTex",F?1:0),y.setTexture("aquarelSampler",F||o),Bt.forEach(H=>y.setFloat(H,n.num(H)))};const M=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...It,...b],["washSampler","animeSampler",...x],1,t);M.onApply=y=>{p(y,M),y.setTextureFromPostProcessOutput("washSampler",c),y.setTexture("animeSampler",Fo(e)||a),y.setVector2("texel",h(M)),It.forEach(F=>y.setFloat(F,n.num(F))),y.setColor3("inkColor",BABYLON.Color3.FromArray(Vt[n.inkColor()]||Vt["blue-grey"]))};const R=[c,w,M];return{dispose(){R.forEach(y=>y.dispose(t)),e.onBeforeRenderObservable.remove(s),e.disableGeometryBufferRenderer(),o.dispose(),a.dispose()}}}const Y={sky:380,bg:70,mid:22,fg:7,near:3.5},B={x:0,y:1.6,z:0,fov:50},qe=-2,kn=16/9,Mn=.42,et=1.6,Lo=3,Sn=e=>Lo*ue(e),_o=(e,t)=>t*e,Po=(e,t,n,o)=>_o(e,t)-(1-o)*n,je=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,Oo=999,Ro=1e3,Co=.02,En=2,Et=120,An=.05,de=e=>e>Math.PI?e*Math.PI/180:e,ue=(e,t=B.fov,n=kn)=>2*e*Math.tan(de(t)/2)*n;function Ut(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const Nt=e=>e.z??Y[e.depth],Bo=e=>Math.min(1,Math.max(0,(e-Y.mid)/(Y.bg-Y.mid)));function wt(e,t){return e<=Y.bg||t===0?Bo(e)*t:B.y+(t-B.y)*e/Y.bg}const Io=(e,t)=>t?e+t.h*(1-t.top):e,Vo=["ground","path","field","ramp","water"],xe=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Vo.includes(t)),Uo=2,Ht=e=>xe(e)&&e.w/Math.max(1,e.h)>=Uo,Fn=(e,t,n,o)=>Math.min(0,Po(e,t,n,o)),$t=[2,2e3];function No(e,t,n,o,a,i){const s=pe({...e},t),r=Math.min($t[1],Math.max($t[0],s.z??e.z)),l=Sn(r)/o,u=a*l*s.scale;return{z:r,h:u,w:o*l*Math.max(1,s.scale),sx:l*Math.max(1,s.scale),sy:l*s.scale,x:(s.x-.5)*ue(r),y:Fn(r,n,u,i),alphaIndex:je(r),opacity:s.opacity}}const Tn=(e,t)=>!!e.flat||t.layer==="ground";function Ae(e,t,n,o=0,a=o){const i=t.depth,s=Nt(t)-n*An,r=ue(s),l=i==="sky"?n*2+1:je(s);if(e.layer==="sky"){const w=r*et,M=w/kn,R=-M*.12+(t.y??0);if(e.tileable_x)return{x:0,y:R,z:s,w,h:M,uRepeat:w/(M*(e.w/e.h)),alphaIndex:l,rotation:0};const y=Math.max(w/e.w,M/e.h);return{x:0,y:R,z:s,w:e.w*y,h:e.h*y,uRepeat:1,alphaIndex:l,rotation:0}}const u=e.layer==="bg"&&!e.tileable_x?r*et*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),u),v=h*(e.w/e.h),b=e.tileable_x?Math.max(v,r*et):v,x=e.tileable_x?0:((t.x??.5)-.5)*r,p=e.layer==="bg"?i==="bg"?o:0:xe(e)?0:wt(Nt(t),a),c=i==="sky"?s*Math.tan(de(B.fov)/2)*.45:p;return{x,y:c+(t.y??0),z:s,w:b,h,uRepeat:e.tileable_x?b/v:1,alphaIndex:l,rotation:t.rotation??0}}function Ho(e,t,n=0,o=Mn,a=qe){const i=.5/Math.tan(de(B.fov)/2),s=.5+i*Math.tan(-a*Math.PI/180),r=Y.bg-n*An,l=B.y+(s-o)*r/i;return Math.round((l-t*(1-e))*10)/10}const Ve=e=>e-$o,$o=.002,Gt={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},zn=(e,t)=>(Gt[e??"inOut"]??Gt.inOut)(Math.min(1,Math.max(0,t))),Te=(e,t,n)=>e+(t-e)*n,Dn=e=>e.dur_s??(e.camera&&qo(e)||e.est_s||8);function Ln(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),o=[...n].reverse().find(a=>(a.at_s??0)<=t)??n[0]??null;return{cam:o,t:o?t-(o.at_s??0):t}}function _n(e,t,n){if(!e)return{...B,fov:de(B.fov)};const o=zn(e.ease,n>0?t/(e.dur_s??n):1),a={...B,...e.from},i={...a,...e.to};return{x:Te(a.x,i.x,o),y:Te(a.y,i.y,o),z:Te(a.z,i.z,o),fov:Te(de(a.fov),de(i.fov),o)}}const Go=["x","y","z","scale","opacity","rotation"];function pe(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},o=e.keys??[];if(!o.length)return n;const a={...n};for(const i of Go){const s=o.filter(b=>b[i]!==void 0).sort((b,x)=>b.t-x.t);if(!s.length)continue;const r=s[0],l=s[s.length-1];if(t<=r.t){a[i]=r[i];continue}if(t>=l.t){a[i]=l[i];continue}const u=s.findIndex(b=>b.t>t),h=s[u-1],v=s[u];a[i]=Te(h[i],v[i],zn("inOut",(t-h.t)/(v.t-h.t)))}return a}const Wo={none:0,sway:1,drift:2,ripple:3,flicker:4};function Wt(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??e.motion??"none",amount:n.amount??1,speed:n.speed??1}}const jo=.25,Yo=2e3,Zo=250,we={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},jt={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function Ko(e,t,n,o){const a=r=>{const l=e.lastDir&&e.lastDir!==r?e.flips+1:e.flips;return{...e,notches:e.notches+r,fast:0,lastChange:n,lastDir:r,flips:l,lastUp:r===-1?n:e.lastUp,locked:e.locked||l>=we.lockFlips&&r===1}};if(t<we.downFps)return o?a(1):{...e,fast:0};if(t<we.upFps)return{...e,fast:0};const i=e.fast+1;return e.notches>0&&!e.locked&&i>=we.upWindows&&n-e.lastChange>=we.upAfterChangeMs&&n-e.lastUp>=we.upEveryMs?a(-1):{...e,fast:i}}function Xo(e,t,n,o){const a=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),a-o*jo)}function qo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const Yt={breath_m:.05,breath_s:7},Jo=1.5;function Qo(e,t,n={}){const o=n.breath_m??Yt.breath_m,a=2*Math.PI/Math.max(.5,n.breath_s??Yt.breath_s),i=Math.min(1,t/Jo),s=i*i*(3-2*i);return{...e,x:e.x+o*s*Math.sin(a*t),y:e.y+o*.5*s*Math.sin(2*a*t)}}async function es(e){const t=await fetch(e);if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const ts=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function De(e,t,n){if(t.asset){const s=e.assets.find(r=>r.id===t.asset);if(s)return s}const o=ts(t.need??t.asset??"");if(!o.length)return null;let a=null,i=[0,0,0];for(const s of[...e.assets].sort((r,l)=>r.id.localeCompare(l.id))){const r=o.filter(u=>s.tags.some(h=>h.toLowerCase()===u)).length;if(!r)continue;const l=[r,n&&s.layer===n?1:0,s.qa?.score??0];(!a||l[0]>i[0]||l[0]===i[0]&&(l[1]>i[1]||l[1]===i[1]&&l[2]>i[2]))&&(a=s,i=l)}return a}const ze="#f6f5ee",ns=.22,os=(e,t)=>e.layer==="bg"?t.feather??ns:0,tt=.6,Pn=12;function ss(e,t){const n=t.paper??ze,o=e.ground;if(o&&o.startsWith("#"))return{kind:"paper",colour:o};const a=t.assets.filter(s=>s.layer==="ground");if(!o)return a.length?{kind:"asset",asset:[...a].sort((s,r)=>s.id.localeCompare(r.id))[0]}:{kind:"paper",colour:n};const i=De({...t,assets:a},{asset:o},"ground");return i?{kind:"asset",asset:i}:{kind:"paper",colour:n,reason:`no ground for ${o}`}}function as(e,t,n,o=.08){return On(e,t,n,1-o,1)}function On(e,t,n,o,a){const i=Math.max(0,Math.floor(n*o)),s=Math.min(n,Math.max(i+1,Math.ceil(n*a))),r=[[],[],[]],l=Math.max(1,Math.floor(t*(s-i)/2e4));for(let h=i*t;h<s*t;h+=l){const v=h*4;e[v+3]<200||(r[0].push(e[v]),r[1].push(e[v+1]),r[2].push(e[v+2]))}if(!r[0].length)return null;const u=h=>{const v=[...h].sort((b,x)=>b-x);return v[v.length>>1]/255};return[u(r[0]),u(r[1]),u(r[2])]}const Le=32,is=(e,t,n)=>Array.from({length:Le},(o,a)=>On(e,t,n,a/Le,(a+1)/Le)),rs=(e,t)=>e[Math.min(Le-1,Math.max(0,Math.floor((1-t)*Le)))]??null;function ls(e,t,n){const o=[],a=Math.max(1,Math.floor(t*n/6e4));for(let i=0;i<t*n;i+=a){const s=i*4;if(e[s+3]<230)continue;const r=(.299*e[s]+.587*e[s+1]+.114*e[s+2])/255;r<.45&&o.push(r)}return o.length<20?null:(o.sort((i,s)=>i-s),o[o.length>>1])}function cs(e,t,n){const o=[];for(let a=0;a<t;a++)for(let i=0;i<n;i++)if(e[(i*t+a)*4+3]>128){o.push(i/n);break}return o.length?(o.sort((a,i)=>a-i),o[o.length>>1]):0}function hs(e,t,n){for(let o=0;o<n;o++){let a=0;for(let i=0;i<t;i++)e[(o*t+i)*4+3]>128&&a++;if(a/t>.5)return o/n}return 0}const ds=1.6,us=.12;function Zt(e,t,n,o){const a=e.layer==="figure",i=a?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),s=i*us*o/ds;return a?{w:i,d:Math.min(s,i*.5)}:{w:i,d:Math.min(Math.max(s,i*.3),i*3)}}const fs=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Ue=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},At=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,Rn=At;re.ShadersStore.stageGroundVertexShader=`
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
  ${At}
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
  ${At}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const ps=e=>e?he.WRAP_ADDRESSMODE:he.MIRROR_ADDRESSMODE;function ms(e){const t=Ke.CreateGround("ground",{width:2400,height:2400},e),n=new Xe("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tile","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","nearTex"],needAlphaBlending:!0}),o=new pn(new Uint8Array([255,255,255,255]),1,1,ve.TEXTUREFORMAT_RGBA,e);n.setTexture("tex",o).setTexture("nearTex",o),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0);let a=Pn,i=1;return t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=Oo,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(s){s.tex&&(s.tex.wrapU=he.WRAP_ADDRESSMODE,s.tex.wrapV=he.WRAP_ADDRESSMODE),n.setTexture("tex",s.tex??o),a=s.tile,n.setFloat("useTex",s.tex?1:0).setFloat("tile",a*i).setFloat("grain",s.grain).setFloat("fadeNear",s.fadeNear).setFloat("fadeFar",s.fadeFar).setVector3("base",C.FromArray(s.base)).setVector3("horizonTint",C.FromArray(s.tint))},follow(s){n.setVector3("camPos",s)},live(s){i=s.tileScale,n.setFloat("detail",s.detail).setFloat("vary",s.vary).setFloat("mixTile",s.mixTile).setFloat("tile",a*i)},near(s){n.setFloat("useNear",s?1:0),s&&(s.tex.wrapU=ps(s.tileable),s.tex.wrapV=he.CLAMP_ADDRESSMODE,n.setTexture("nearTex",s.tex).setMatrix("nearVP",s.vp).setFloat("nearTop",s.top).setFloat("nearSpan",s.span))}}}let gs=0;function Kt(e,t,n,o,a){const i=Ke.CreatePlane(`stain${a?"-cast":""}:${e.name}`,{width:t,height:a?a.length:n},o);if(i.rotation.x=Math.PI/2,a){const[r,l]=a.dir,u=Math.hypot(r,l)||1;i.rotation.y=Math.atan2(r/u,l/u),i.position.set(r/u*a.length*.42,.015,l/u*a.length*.42)}else i.position.set(0,.02,-n*.18);i.parent=e;const s=new Xe(i.name,o,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return s.alphaMode=ve.ALPHA_PREMULTIPLIED,s.disableDepthWrite=!0,s.backFaceCulling=!1,s.setFloat("seed",gs++*7.31%97).setFloat("opacity",0),i.material=s,i.metadata={noGBuffer:!0},i.isPickable=!1,{mesh:i,setOpacity:r=>{s.setFloat("opacity",r),i.isVisible=r>.001}}}re.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;re.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${Rn}
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
  }`;function Cn(e,t,n,o){const a=Ke.CreatePlane(e,{size:1},n),i=new Xe(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return i.alphaMode=ve.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,a.material=i,a.billboardMode=mn.BILLBOARDMODE_ALL,a.alphaIndex=o,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,mat:i}}const Bn=9,xs=9;function vs(e,t,n,o){const a=Array.from({length:Bn},(i,s)=>{const r=Cn(`smoke:${s}`,"stagePuff",e,o);return r.mat.setFloat("seed",s*3.7),r});return{update(i,s){a.forEach(({mesh:r,mat:l},u)=>{const h=ys(i,u),v=n*(.6+3.2*h);r.scaling.setAll(v),r.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(u*2.1+i*.3),t.y+n*(.4+7*h),t.z),l.setFloat("alpha",s*.7*Math.sin(Math.PI*h)),r.isVisible=s>.001})},dispose(){a.forEach(({mesh:i,mat:s})=>{s.dispose(),i.dispose()})}}}const ys=(e,t)=>((e/xs+t/Bn)%1+1)%1,nt=40,Xt=16;function ws(e){const t=(e%nt+nt)%nt;return t<Xt?t/Xt:null}function bs(e,t,n,o){const a=Array.from({length:6},(i,s)=>Cn(`bird:${s}`,"stageBird",e,o));return{update(i,s){const r=ws(i),l=Math.round(2+s*4);a.forEach(({mesh:u,mat:h},v)=>{if(u.isVisible=s>.001&&r!==null&&v<l,!u.isVisible||r===null)return;const b=v*.025;u.position.set((r-b-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*r,t+v*1.5),u.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,s*2)).setFloat("flap",Math.sin(i*7+v*1.3))})},dispose(){a.forEach(({mesh:i,mat:s})=>{s.dispose(),i.dispose()})}}}const qt=["fire","hearth","chimney","smoke"],ks=e=>e.id.split(/[-_]/).some(t=>qt.includes(t))||e.tags.some(t=>qt.includes(t.toLowerCase())),ot=e=>e[0].toUpperCase()+e.slice(1),Ms=e=>({fade:`lineFade${ot(e)}`,thin:`lineThin${ot(e)}`,haze:`haze${ot(e)}`}),Ye={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:qe,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},Ss=[1.05,1,.9],Es=[.88,.93,1.05],As=.35;function Fs(e,t,n,o){const a=t==="sky";return{edgeSoft:a?0:G(e,"edgeSoft"),footM:t==="standing"?As:0,grounding:t==="figure"?0:G(e,"grounding"),grass:t==="figure"?0:G(e,"grassOverlap"),light:a?0:G(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:a?G(e,"cloudDrift"):0,footTint:o}}const In=[.93,.86,.74],Jt=e=>({paper:G(e,"sheetPaper"),grain:G(e,"sheetGrain"),patches:G(e,"sheetPatches"),wash:G(e,"sheetWash"),washColour:In}),Ts={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01]},zs=Object.fromEntries(Object.keys(Ye).map(e=>[e,Ts[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ce=(e,t)=>G(e,t),G=(e,t)=>{const n=Number(e[t]??Ye[t]);return Number.isFinite(n)?n:Ye[t]};function st(e,t){const n=Ms(t);return{fade:G(e,n.fade),thin:G(e,n.thin),haze:G(e,n.haze),brown:G(e,"lineBrown"),ink:G(e,"lineInk"),norm:G(e,"lineNorm")}}const Ds=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),at=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),Ne=(e,t,n,o,a)=>{const i=o*(1080/a);return[n/Math.max(e*i,.001),1/Math.max(t*i,.001)]};function Ls(e,t,n){const o=new C(B.x,B.y,B.z),a=be.RotationX(e*Math.PI/180),s=be.LookAtLH(o,o.add(C.TransformNormal(new C(0,0,1),a)),C.TransformNormal(C.Up(),a)).multiply(be.PerspectiveFovLH(de(B.fov),t,.1,2e3));return{vp:s,top:C.TransformCoordinates(new C(0,0,n),s).y}}re.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function _s(e,t){const n=new Zn("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=o=>{o.setFloat("wash",t("sheetWash")).setVector3("washColour",C.FromArray(In))},n}const Ps=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,Os=`
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
  ${Rn}
  ${Ps}
  ${Os}
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
  }`;const Qt=new WeakMap,Vn=new Map,Un=new Map,bt=new Map,Nn=new Map,kt=new Map;function He(e,t){const n=Qt.get(t)??new Map;Qt.set(t,n);const o=n.get(e);if(o)return o;const a=new Promise((i,s)=>{const r=new Image;r.crossOrigin="anonymous",r.onerror=()=>s(new Error(`layer image ${e} did not load`)),r.onload=()=>{const l=document.createElement("canvas");l.width=r.naturalWidth,l.height=r.naturalHeight;const u=l.getContext("2d",{willReadFrequently:!0});u.drawImage(r,0,0);const h=u.getImageData(0,0,l.width,l.height).data,v=as(h,l.width,l.height);v&&Vn.set(e,v),kt.set(e,is(h,l.width,l.height)),Un.set(e,hs(h,l.width,l.height)),bt.set(e,cs(h,l.width,l.height));const b=ls(h,l.width,l.height);b!==null&&Nn.set(e,b);for(let p=0;p<h.length;p+=4){const c=h[p+3]/255;h[p]=Math.round(h[p]*c),h[p+1]=Math.round(h[p+1]*c),h[p+2]=Math.round(h[p+2]*c)}const x=new pn(h,l.width,l.height,ve.TEXTUREFORMAT_RGBA,t,!0,!1,he.TRILINEAR_SAMPLINGMODE);x.anisotropicFilteringLevel=8,x.wrapV=he.CLAMP_ADDRESSMODE,i(x)},r.src=e});return n.set(e,a),a.catch(()=>n.delete(e)),a}const it=24;function Rs(e,t,n,o,a){const[i,s]=t.anchor??[.5,1],r=[],l=[],u=[];for(let v=0;v<=it;v++){const b=v/it;for(const x of[0,1])r.push((x-i)*n,(s-b)*o,0),l.push(x,b);if(v<it){const x=v*2;u.push(x,x+2,x+1,x+1,x+2,x+3)}}const h=new mn(e,a);return Object.assign(new Kn,{positions:r,uvs:l,indices:u}).applyToMesh(h),h}let Cs=0;function en(e,t,n,o,a,i){const s=Rs(`layer:${e.id}`,e,n,o,i),r=new Xe(`layer:${e.id}`,i,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=a!==1?he.WRAP_ADDRESSMODE:he.CLAMP_ADDRESSMODE,r.setTexture("tex",t),r.alphaMode=ve.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1;const l=Cs++*2.39996%(Math.PI*2),u=e.anchor?.[1]??1;return r.setFloat("phase",l).setFloat("height",o*u).setFloat("width",n).setFloat("uRepeat",a).setFloat("opacity",1),r.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),r.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),r.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),s.material=r,s.metadata={noGBuffer:!0,painted:!0},s.isPickable=!1,{mesh:s,material:r,setMotion:h=>{r.setFloat("kind",Wo[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{r.setFloat("opacity",h),s.isVisible=h>.001},setLine:(h,v,b,x)=>{r.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),r.setVector2("pxUV",new _t(b[0],b[1])).setVector3("hazeTint",C.FromArray(x))},setPaper:(h,v)=>{r.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),r.setVector3("washColour",C.FromArray(h.washColour)).setVector2("grainUV",new _t(v[0],v[1]))},setBottomFade:h=>{r.setFloat("bottomFade",h)},setAlive:h=>{r.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),r.setVector3("footTint",C.FromArray(h.footTint)).setVector3("sunColour",C.FromArray(Ss)).setVector3("shadeColour",C.FromArray(Es))},setGroundLine:h=>{r.setFloat("groundLine",h)},setFeather:(h,v)=>{r.setFloat("feather",Math.max(0,Math.min(1,h))),v&&r.setVector3("featherTint",C.FromArray(v))}}}const Mt={...zo["History Lines pencil"],paper:.35,granulation:.2,...Ye},Bs=new gn(.937,.914,.863,1),Is=.7,Vs=(e,t,n)=>e.map((o,a)=>o+(t[a]-o)*n);class Us{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new Xn(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new qn(this.engine),this.scene.clearColor=Bs,this.camera=new Jn("house",new C(0,1.6,0),this.scene),this.camera.rotation.set(qe*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new Qn("sky",new C(0,1,0),this.scene).intensity=.7,new eo("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=ms(this.scene),this.ground.set(this.groundLook(null,null,n)),this.birds=bs(this.scene,on,ue(on),Ws),Do(this.scene,this.camera,{num:o=>Number(this.look[o]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),_s(this.camera,o=>Number(this.look[o]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Ue(ze);strip=null;nearTex=null;bands=[];smoke=[];birds;footTint=Ue(ze);nearAsset=null;hazeTint=Ue(ze);sceneLib;buildToken=0;look={...Mt};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(o=>({scene:t,...o})))}renderCap=1920;tier=jt;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return Xo(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=jt,this.window.start=0,this.fit()}tick(t){const n=this.window,o=document.hidden||n.last&&t-n.last>Zo;if(n.last=t,!n.start||o){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Yo)return;const a=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const i=this.tier.notches;this.tier=Ko(this.tier,a,t,this.scaleAt(i+1)<this.scaleAt(i)),this.tier.notches!==i&&this.fit()}setLook(t){this.look={...Mt,...t??{}}}groundPoint(t,n){const o=Y[n];return new C((t-.5)*ue(o),0,o)}async build(t,n=this.lib){const o=++this.buildToken,a=[],i=[];t.set.sky&&i.push({layer:tn(t),order:0,index:-1});const s={sky:1};t.set.layers.forEach((A,L)=>{const te=A.depth;s[te]=s[te]??0,i.push({layer:A,order:s[te]++,index:L})});const r=[];await Promise.all(i.map(async({layer:A,order:L,index:te})=>{const $=De(n,A,A.depth);if(!$){r.push({need:A.need??A.asset,reason:"no match"});return}let J;try{J=await He(n.base+$.file,this.scene)}catch{r.push({need:A.need??A.asset,reason:`file did not load: ${$.file}`});return}if(o!==this.buildToken)return;const _=Ae($,A,L),W=en($,J,_.w,_.h,_.uRepeat,this.scene);W.mesh.position.set(_.x,_.y,_.z);const se=Tn(A,$);W.mesh.alphaIndex=se?Ro:_.alphaIndex,se&&(W.mesh.rotation.x=Math.PI/2),W.mesh.isVisible=!1;let Q,fe,K;if(rt.includes(A.depth)&&!$.tileable_x&&!se&&!xe($)){const ne=Zt($,_.w,_.h,_.z);K=k=>Zt($,_.w,_.h,k).d/ne.d,Q=Kt(W.mesh,ne.w,ne.d,this.scene),Q.mesh.alphaIndex=Ve(_.alphaIndex),fe=Kt(W.mesh,ne.w,ne.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:_.h*js(this.sunDir)}),fe.mesh.alphaIndex=Ve(_.alphaIndex)}a.push({layer:A,index:te,builtScale:A.scale??1,builtZ:_.z,handle:W,asset:$,order:L,stain:Q,cast:fe,stainDepth:K,ink:Nn.get(n.base+$.file),flat:se,skyline:bt.get(n.base+$.file)})}));const l=ss(t.set,n);let u=null,h=null;const v=fs(t.set.near,n),b=v?De(n,{asset:v}):null;if(t.set.near&&!b&&r.push({need:t.set.near,reason:"no near band"}),b)try{h=await He(n.base+b.file,this.scene)}catch{r.push({need:t.set.near,reason:`file did not load: ${b.file}`})}if(l.kind==="asset")try{u=await He(n.base+l.asset.file,this.scene)}catch{r.push({need:t.set.ground??"ground",reason:`file did not load: ${l.asset.file}`})}else l.reason&&r.push({need:t.set.ground,reason:l.reason});const x=a.filter(A=>A.asset.layer==="bg").sort((A,L)=>A.index-L.index)[0],p=x?{top:Un.get(n.base+x.asset.file)??0,h:Ae(x.asset,x.layer,x.order).h,order:x.order}:null,c=a.find(A=>A.index===-1),w=c&&Ae(c.asset,c.layer,c.order),M=c&&w?rs(kt.get(n.base+c.asset.file)??[],(B.y-w.y)/w.h):null,R=x?Vn.get(n.base+x.asset.file)??null:t.set.groundBands?.length?null:M,y=await this.loadBands(t,n),F=A=>A.forEach(L=>{L.stain?.mesh.material?.dispose(),L.cast?.mesh.material?.dispose(),L.handle.mesh.dispose(),L.handle.material.dispose()});if(o!==this.buildToken){F(a),y.forEach(A=>{A.handle.mesh.dispose(),A.handle.material.dispose()});return}F(this.built),this.bands.forEach(A=>{A.handle.mesh.dispose(),A.handle.material.dispose()}),this.bands=y,this.built=a,this.sceneLib=n;const H=l.kind==="asset"?(kt.get(n.base+l.asset.file)??[]).filter(A=>!!A):[],V=this.groundLook(l.kind==="asset"?{tex:u,asset:l.asset}:null,R,n,l.kind==="paper"?l.colour:void 0);this.horizonTint=V.tint,this.strip=p,this.smoke.forEach(A=>A.dispose()),this.smoke=a.filter(A=>ks(A.asset)&&rt.includes(A.layer.depth)&&!A.flat).map(A=>{const L=Ae(A.asset,A.layer,A.order);return vs(this.scene,new C(A.handle.mesh.position.x,L.h*.6,L.z),Math.min(Math.max(L.h*.8,.5),3),L.alphaIndex)}),this.footTint=H.length?Ys(H):V.base,this.nearTex=h,this.nearAsset=b,this.hazeTint=M??V.tint,this.ground.set(V),this.missed.set(t.id,r),r.length&&console.warn(`stage25d: ${t.id}: missing`,r)}groundLook(t,n,o,a){const i=Ue(a??o.paper??ze),s=n??i;return{tex:t?.tex??null,tile:t?.asset.height_m||Pn,base:Vs(i,s,Is),tint:s,fadeNear:Y.fg,fadeFar:Y.bg*.75,grain:t?.tex?.5:1}}rebind(t){this.built.forEach(n=>{n.layer=n.index>=0?t.set.layers[n.index]:tn(t)}),this.bands.forEach(n=>{n.band=t.set.groundBands?.[n.index]??n.band})}pickLayers(t,n){const o=s=>this.built.some(r=>r.handle.mesh===s),a=[],i=[...this.scene.multiPick(t,n,o)??[]].sort((s,r)=>s.distance-r.distance);for(const s of i){const r=this.built.find(u=>u.handle.mesh===s.pickedMesh),l=s.getTextureCoordinates();!r||!l||r.index<0||r.asset.tileable_x||["sky","bg","ground"].includes(r.asset.layer)||xe(r.asset)&&(s.pickedPoint?.y??0)<0||a.push({index:r.index,asset:r.asset,u:l.x,v:l.y})}return a}pickBackdrops(t,n){const o=s=>this.bands.find(r=>r.handle.mesh===s),a=s=>this.built.find(r=>r.handle.mesh===s&&r.index>=0&&r.asset.layer==="bg");return[...this.scene.multiPick(t,n,s=>!!o(s)||!!a(s))??[]].sort((s,r)=>s.distance-r.distance).flatMap(s=>{const r=s.getTextureCoordinates();if(!r)return[];const l=o(s.pickedMesh);if(l)return[{band:l.index,asset:l.asset,u:r.x,v:r.y}];const u=a(s.pickedMesh);return[{index:u.index,asset:u.asset,u:r.x,v:r.y}]})}layerBox(t){const n=this.built.find(u=>u.index===t);if(!n)return null;const o=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),a=1/this.engine.getRenderWidth(),i=1/this.engine.getRenderHeight(),s=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(u=>C.Project(u,be.IdentityReadOnly,this.scene.getTransformMatrix(),o)),r=s.map(u=>u.x*a),l=s.map(u=>u.y*i);return{x0:Math.min(...r),y0:Math.min(...l),x1:Math.max(...r),y1:Math.max(...l),z:n.handle.mesh.position.z}}groundHeightAt(t){return wt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(o=>o.index===t);return n?xe(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const o=this.scene.createPickingRay(t,n,be.Identity(),this.camera);return{origin:[o.origin.x,o.origin.y,o.origin.z],dir:[o.direction.x,o.direction.y,o.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(o=>o.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(a=>a.dispose());const o=a=>Hs*Math.min(1,Math.max(0,(nn-a)/(nn-Gs)));this.gridMeshes=n.pieces.map((a,i)=>{const s=a.lines.map(u=>u.map(([h,v])=>new C(h,wt(v,t),v))),r=a.lines.map(u=>u.map(([,h])=>new gn(n.rgb[0],n.rgb[1],n.rgb[2],o(h)))),l=Ke.CreateLineSystem(`grid-${i}`,{lines:s,colors:r,useVertexAlpha:!0},this.scene);return l.isPickable=!1,l.setEnabled(!this.gridOff),l.alphaIndex=je(a.z)+$s,l.material.depthFunction=ve.ALWAYS,l.material.disableDepthWrite=!0,l}),n.land=t}worldXAt(t,n,o){const a=this.scene.createPickingRay(t,n,be.Identity(),this.camera);return a.origin.x+(o-a.origin.z)/a.direction.z*a.direction.x}sunDir=new C(.55,-1,-.3).normalize();depthLine(t){return{...st(this.look,t),tint:this.hazeTint}}paper(){return Jt(this.look)}async loadBands(t,n){const o=[];for(const[a,i]of(t.set.groundBands??[]).entries()){const s=De(n,{asset:i.asset},"ground_band");if(!s){console.warn(`stage25d: ${t.id}: no ground band ${i.asset}`);continue}const r=await He(n.base+s.file,this.scene).catch(()=>null);if(!r){console.warn(`stage25d: ${t.id}: ground band ${s.file} did not load`);continue}const l=Sn(i.z),u=l*s.h/s.w,h=en(s,r,l,u,1,this.scene);h.material.depthFunction=ve.ALWAYS,h.mesh.position.set(0,0,i.z),h.mesh.alphaIndex=je(i.z),o.push({handle:h,z:i.z,w:l,h:u,skyline:bt.get(n.base+s.file)??.5,index:a,asset:s,band:i})}return o}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?Ho(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??Mn,ce(this.look,"housePitch")):0}pose(t,n,o,a){const i=Ln(t,n),s=_n(i.cam,i.t,Dn(t)),r=a?Qo(s,a.t,a):s;this.camera.position.set(r.x,r.y,r.z),this.camera.fov=r.fov;const l=ce(this.look,"housePitch");this.camera.rotation.x=l*Math.PI/180,this.ground.follow(this.camera.position);const u=c=>ce(this.look,c);this.ground.live({detail:u("groundDetail"),vary:u("groundVary"),mixTile:u("groundMix"),tileScale:u("groundScale")}),this.ground.near(this.nearTex?{tex:this.nearTex,...Ls(l,this.engine.getAspectRatio(this.camera),u("nearFar")),span:Ns,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),v=Jt(this.look),b=ce(this.look,"bandHeight"),x=this.horizonOf(t),p=Io(x,this.strip);this.land=p,this.poseGrid(p),this.bands.forEach(c=>{const w=No(c.band,n,b,c.w,c.h,c.skyline);c.z=w.z,c.handle.mesh.scaling.set(w.sx,w.sy,1),c.handle.mesh.position.set(w.x,w.y,w.z),c.handle.mesh.alphaIndex=w.alphaIndex;const M=at(h,w.z-B.z,de(B.fov));c.handle.setOpacity(w.opacity),c.handle.setBottomFade(Math.min(1,ce(this.look,"bandFade")/w.h)),c.handle.setPaper(v,Ne(w.w,w.h,1,M,h)),c.handle.setLine(st(this.look,"bg"),1,Ne(w.w,w.h,1,M,h),this.hazeTint),c.handle.setMotion(Wt(c.asset,{...c.band})),c.handle.material.setFloat("time",o)}),this.smoke.forEach(c=>c.update(o,ce(this.look,"smoke"))),this.birds.update(o,ce(this.look,"birds"));for(const c of this.built){const w=pe(c.layer,n),M=Ae(c.asset,{...c.layer,x:w.x,y:w.y,z:w.z,scale:1,rotation:w.rotation},c.order,x,p);c.handle.mesh.position.x=M.x;const R=c.asset.layer==="bg"&&!c.asset.tileable_x?(M.z-B.z)/Math.max(.1,c.builtZ-B.z):1;c.handle.mesh.position.y=c.flat?Co:xe(c.asset)?Fn(M.z,b,M.h*w.scale,c.skyline??0)+M.y:B.y+(M.y-B.y)*R,c.handle.mesh.position.z!==M.z&&(c.handle.mesh.position.z=M.z,c.flat||(c.handle.mesh.alphaIndex=M.alphaIndex),c.stain&&(c.stain.mesh.alphaIndex=Ve(M.alphaIndex)),c.stain&&c.stainDepth&&(c.stain.mesh.scaling.y=c.stainDepth(M.z)),c.cast&&(c.cast.mesh.alphaIndex=Ve(M.alphaIndex))),c.handle.mesh.rotation.z=-M.rotation*Math.PI/180,c.handle.mesh.scaling.setAll(w.scale/c.builtScale*R),c.handle.setOpacity(w.opacity),c.handle.setFeather(os(c.asset,c.layer),this.horizonTint),c.asset.layer==="sky"&&c.handle.setGroundLine((r.y-M.y)/(M.h*w.scale));const y=at(h,M.z-r.z,this.camera.fov),F=st(this.look,c.layer.depth);c.handle.setPaper(v,Ne(M.w*w.scale,M.h*w.scale,M.uRepeat,at(1080,M.z-B.z,de(B.fov)),1080)),c.handle.setLine(F,c.ink===void 0?1:Ds(c.ink,F.ink,F.norm),Ne(M.w*w.scale,M.h*w.scale,M.uRepeat,y,h),this.hazeTint),c.stain?.setOpacity((c.layer.shadow??tt)*w.opacity),c.cast?.setOpacity(ce(this.look,"castShadow")*((c.layer.shadow??tt)/tt)*w.opacity);const H=c.asset.layer==="sky"?"sky":c.asset.layer==="bg"?"strip":c.asset.layer==="figure"?"figure":rt.includes(c.layer.depth)&&!c.flat?"standing":"other";c.handle.setAlive(Fs(this.look,H,this.sunDir.x,this.footTint)),c.handle.setMotion(Wt(c.asset,c.layer)),c.handle.material.setFloat("time",o)}}}const tn=e=>({...e.set.skyLayer??{},asset:e.set.sky,depth:"sky"}),Ns=1.3,Hs=.35,$s=.001,Gs=40,nn=120,on=110,Ws=900,js=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Ys=e=>[0,1,2].map(t=>e.reduce((n,o)=>n+o[t],0)/e.length),rt=["mid","fg","near"],Zs=16/9,Ks=.92;function Xs(e,t,n,o){const{cam:a,t:i}=Ln(e,o),s=_n(a,i,Dn(e)),r=Y[t.depth],l=r-s.z;if(l<=.5)return null;const u=pe(t,o),h=(u.x-.5)*ue(r),v=Math.tan(s.fov/2),b=(h-s.x)/(l*v*Zs),x=-qe*Math.PI/180,p=Math.tan(Math.atan2(n*u.scale-s.y,l)-x)/v;return Math.abs(b)>Ks?null:{x:(b+1)/2,y:Math.min(1,Math.max(0,(1-p)/2))}}const qs={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},sn=new Set(["large","small","tall","long","short","fallen"]),Js=new Set(["tree","shrub"]),Ft=e=>e.charAt(0).toUpperCase()+e.slice(1),Qs=(e,t)=>qs[e]?.[t?1:0]??e;function ea(e,t="en"){const n=t==="nl",o=e?.name?.[t]??e?.name?.en;if(o)return o;const a=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!a.length)return"";const i=a.length>1&&Js.has(a[0])?a.slice(1):a,s=i.filter(l=>sn.has(l)),r=i.filter(l=>!sn.has(l));return Ft([...s,...r].map(l=>Qs(l,n)).join(" "))}const an=e=>Ft(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),ta=e=>{const t=(e?.tags??[]).find(o=>o.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function Fe(e,t,n="en"){if(e.figure)return an(e.figure);const o=t??(e.asset?{id:e.asset}:null),a=(o?.layer==="figure"||/^fig-/.test(String(o?.id??"")))&&ta(o);if(a)return an(a);if(o)return ea(o,n);const i=Array.isArray(e.need)?e.need[0]:e.need;return i?Ft(String(i)):""}function na(e){const t=new Map;return e.map(n=>{const o=(t.get(n)??0)+1;return t.set(n,o),o===1?n:`${n} ${o}`})}const oa=new Set(["tree","shrub","heather","grass","reeds","bramble","log","wheat","crop","plant","flower"]);function sa(e){return e?.layer==="figure"?"person":e?.layer==="sky"?"cloud":(e?.tags??[]).some(t=>oa.has(t))?"leaf":"photo"}const aa=24;function ia(e){const t=new Map,n=o=>{if(t.has(o))return;t.set(o,"loading");const a=new Image;a.onload=()=>{try{const i=document.createElement("canvas");i.width=a.naturalWidth,i.height=a.naturalHeight;const s=i.getContext("2d",{willReadFrequently:!0});s.drawImage(a,0,0),t.set(o,{w:i.width,h:i.height,data:s.getImageData(0,0,i.width,i.height).data})}catch{t.set(o,"failed")}},a.onerror=()=>t.set(o,"failed"),a.src=e+o};return{prime(o){o.forEach(a=>a?.file&&n(a.file))},opaque(o,a,i){const s=t.get(o?.file);if(!s||typeof s=="string")return o?.file&&n(o.file),!0;const r=Math.min(s.w-1,Math.max(0,Math.floor(a*s.w))),l=Math.min(s.h-1,Math.max(0,Math.floor((1-i)*s.h)));return s.data[(l*s.w+r)*4+3]>aa}}}const q={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,En],[80,Et]]},ra=e=>e<=12?1:e<=40?5:20,la=e=>ra(e)/4;function rn(e,t=0){const n=typeof t=="function"?t:()=>t,o=u=>[e.origin[0]+u*e.dir[0],e.origin[2]+u*e.dir[2]],a=u=>e.origin[1]+u*e.dir[1]-(q.z+n(o(u)[1]));if(!(e.dir[2]>0))return null;const i=(Et*ca-e.origin[2])/e.dir[2],s=Math.sign(a(0));if(s===0)return Pt(q,o(0));let r=0,l=null;for(let u=1;u<=ln;u++){const h=i*u/ln;if(Math.sign(a(h))!==s){l=h;break}r=h}if(l===null)return null;for(let u=0;u<ha;u++){const h=(r+l)/2;Math.sign(a(h))===s?r=h:l=h}return Pt(q,o(l))}const ca=4,ln=400,ha=30;function St(e){const t=la(ut(q,e)[1]);return ut(q,oo(e,t))}const Hn=(e,t)=>[(e-.5)*ue(t),t],Ze=([e,t])=>({x:Math.round((.5+e/ue(t))*1e4)/1e4,z:t});function Tt([e,t],n,o=[0,0]){const a=(n-o[1])/Math.max(.1,t-o[1]);return[o[0]+(e-o[0])*a,n]}function da([e,t],n,o=[0,0]){const[[,a],[,i]]=q.cells,s=Math.max(.1,t-o[1]),r=Math.min(i,Math.max(a,o[1]+s/Math.max(.01,n)));return ut(q,Tt([e,t],r,o))}const ua=[[En,12,2],[12,40,10],[40,Et,40]],fa=20;function pa(){return ua.flatMap(([e,t,n],o)=>{const a=n*fa,i=[];let s=e;for(let r=Math.ceil(e/n)*n;r<=t;r+=n){if(r===e&&o>0)continue;const l={...q,cells:[[-a,s],[a,r]]},u=so(l,n,Math.max(1,Math.round(r-s))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===r:r>s);i.push({z:r,lines:u.map(h=>h.map(v=>ao(q,v).slice(0,2)))}),s=r}return i})}const cn=-1,hn=2;function ma({canvas:e,host:t,stage:n,valueOf:o,alpha:a,onChange:i,onGround:s=()=>!1,byDistance:r=()=>!1,groundUnder:l=()=>null,footY:u=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:b=()=>!1}){let x=null,p=null,c=!1;const w="#38bdf8",M=document.createElement("div");M.dataset.stage25dSelection="",M.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${w};z-index:3;`;const R=document.createElement("div");R.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${w};pointer-events:none;`,M.appendChild(R);const y=document.createElement("div");y.dataset.rotateHandle="1",y.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",M.appendChild(y);const H=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([k,E])=>{const T=document.createElement("div");return T.dataset.scaleHandle="1",T.style.cssText=no(k,E),M.appendChild(T),T});t.appendChild(M),n()?.setGrid?.(pa(),ga(t,"--color-neutral"));const V=document.createElement("div");V.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(V);const A=k=>{const E=J();if(!E||k===null){V.style.display="none";return}const T=t.getBoundingClientRect(),P=e.getBoundingClientRect();Object.assign(V.style,{display:"block",left:`${E.left+E.width/2+P.left-T.left}px`,top:`${E.top+E.height+P.top-T.top}px`}),V.textContent=`${o(k,"z").toFixed(2)} m`},L=k=>{const E=e.getBoundingClientRect();return{x:k.clientX-E.left,y:k.clientY-E.top}},te=(k,E)=>n()?.pickLayers(k,E).find(T=>a.opaque(T.asset,T.u,T.v))??null,$=(k,E)=>{x=k,E&&k!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${k}`}})),_()},J=()=>{const k=x===null?null:n()?.layerBox(x);if(!k)return null;const E=e.getBoundingClientRect();return{left:k.x0*E.width,top:k.y0*E.height,width:(k.x1-k.x0)*E.width,height:(k.y1-k.y0)*E.height,z:k.z}},_=()=>{const k=J();if(!k){M.style.display="none";return}const E=e.getBoundingClientRect(),T=t.getBoundingClientRect();Object.assign(M.style,{display:"block",left:`${k.left+E.left-T.left}px`,top:`${k.top+E.top-T.top}px`,width:`${k.width}px`,height:`${k.height}px`})},W=(k,E,T)=>Math.min(T,Math.max(E,k)),se=k=>{if(k.button!==0)return;const{x:E,y:T}=L(k),P=te(E,T);if(!P){b(E,T)&&k.stopPropagation();return}k.stopPropagation(),$(P.index,!0);const Z=n().layerBox(P.index),j=s(P.index),ae=J();p={mode:"move",index:P.index,z:Z.z,from:n().worldXAt(E,T,Z.z),x0:o(P.index,"x"),id:k.pointerId,el:e,ground:j,start:[E,T],foot:ae?[ae.left+ae.width/2,ae.top+ae.height]:[E,T],lift:j?u(P.index):0},e.setPointerCapture?.(k.pointerId)},Q=k=>E=>{if(E.button!==0||x===null)return;const T=J();if(!T)return;E.stopPropagation(),E.preventDefault();const P=e.getBoundingClientRect(),Z=T.left+T.width/2,j=T.top+T.height/2,{x:ae,y:ke}={x:E.clientX-P.left,y:E.clientY-P.top};p={mode:k,index:x,cx:Z,cy:j,id:E.pointerId,el:E.currentTarget,d0:Math.max(8,Math.hypot(ae-Z,ke-j)),a0:Math.atan2(ke-j,ae-Z),scale0:o(x,"scale"),rotation0:o(x,"rotation"),byDistance:k==="scale"&&r(x),p0:Hn(o(x,"x"),o(x,"z")),eye:h()},E.currentTarget.setPointerCapture?.(E.pointerId)},fe=k=>{const{x:E,y:T}=L(k);if(p?.mode==="move"&&p.ground){const P=l(p.foot[0]+E-p.start[0],p.foot[1]+T-p.start[1],p.lift,p.index);if(!P)return;const Z=Ze(St(P));i(p.index,"x",W(Z.x,cn,hn)),i(p.index,"z",Z.z),A(p.index);return}if(p?.mode==="move"){const P=(n().worldXAt(E,T,p.z)-p.from)/ue(p.z);i(p.index,"x",Math.round(W(p.x0+P,cn,hn)*1e3)/1e3);return}if(p?.mode==="scale"&&p.byDistance){const P=Math.hypot(E-p.cx,T-p.cy)/p.d0*p.scale0,Z=St(da(p.p0,P,p.eye))[1],j=Ze(Tt(p.p0,Z,p.eye));p.scale0!==1&&i(p.index,"scale",1),i(p.index,"x",j.x),i(p.index,"z",j.z),A(p.index);return}if(p?.mode==="scale"){const P=Math.hypot(E-p.cx,T-p.cy);i(p.index,"scale",Math.round(W(p.scale0*(P/p.d0),.05,20)*1e3)/1e3);return}if(p?.mode==="rotate"){let P=p.rotation0+(Math.atan2(T-p.cy,E-p.cx)-p.a0)*180/Math.PI;k.shiftKey&&(P=Math.round(P/15)*15),i(p.index,"rotation",Math.round(P*10)/10);return}c||(c=!0,requestAnimationFrame(()=>{c=!1,e.style.cursor=te(E,T)?"pointer":""}))},K=()=>{if(!p)return;p.el.releasePointerCapture?.(p.id);const k=p.index,E=p.mode==="move"&&p.ground||p.byDistance;p=null,V.style.display="none",E&&v(k)},ne=k=>{x!==null&&k.detail?.id!==`s25_layer-${x}`&&(x=null,_())};e.addEventListener("pointerdown",se);for(const k of[e,...H,y])k.addEventListener("pointermove",fe),k.addEventListener("pointerup",K),k.addEventListener("pointercancel",K);return H.forEach(k=>k.addEventListener("pointerdown",Q("scale"))),y.addEventListener("pointerdown",Q("rotate")),window.addEventListener("scene-object-selected",ne),{select:(k,E=!1)=>$(k,E),get selected(){return x},place:_,destroy(){window.removeEventListener("scene-object-selected",ne),M.remove(),n()?.setGrid?.(null),V.remove()}}}function ga(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(o=>o/255)):[.2,.25,.33]}const zt=["x","y","z","scale","rotation","opacity","keys"],oe=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},lt=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!zt.includes(t))),dn=e=>{const{layers:t=[],groundBands:n=[],skyLayer:o={},...a}=e?.set??{};return JSON.stringify({...e,set:{...a,layers:t.map(lt),groundBands:n.map(lt),skyLayer:lt(o)}})},ct=e=>zt.map(t=>e?.[t]??null),ht=e=>JSON.stringify([(e?.set?.layers??[]).map(ct),(e?.set?.groundBands??[]).map(ct),ct(e?.set?.skyLayer)]),un=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch"],fn="application/x-lp-stage25d",$e=new Map,dt=new Map,xa=e=>(dt.has(e)||dt.set(e,ia(e)),dt.get(e));function va(e){return $e.has(e)||$e.set(e,es(to(e)).catch(t=>{throw $e.delete(e),t})),$e.get(e)}const ya=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function Da(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let o=null,a=null,i=null,s=null,r=new Map,l=new Map,u=0,h=null,v=0,b=0,x=performance.now(),p=!1,c=[],w=[],M={},R=new Set,y=null,F=null,H=null,V=null,A={},L=null,te=0;const $=()=>{o.engine.runRenderLoop(()=>{const d=performance.now();b+=Math.min(.1,(d-x)/1e3),x=d,o.tick(d),a&&o.pose(a,K(),b),o.scene.render(),L?.place()})},J=()=>{!a||!o||(a={...a,set:{...a.set,groundBands:w,skyLayer:M,layers:c.map((d,f)=>R.has(f)?{...d,opacity:0,keys:[]}:d)}},o.rebind(a))},_=d=>{const f=/^band-(\d+)$/.exec(String(d??""));return f&&w[Number(f[1])]?Number(f[1]):-1},W=d=>d==="sky"?s?.set?.sky?{...M,depth:"sky"}:null:_(d)>=0?{...w[_(d)],depth:"bg"}:c[oe(d)]??null,se=(d,f)=>{let m=null;if(d==="sky"&&s?.set?.sky)M={...M,...f},m={skyLayer:f};else if(_(d)>=0){const g=_(d);w=w.map((S,z)=>z===g?{...S,...f}:S),m={band:{index:g,...f}}}else if(c[oe(d)]){const g=oe(d);c=c.map((S,z)=>z===g?{...S,...f}:S),m=g}return m===null?null:(y=ht({set:{layers:c,groundBands:w,skyLayer:M}}),J(),m)},Q=()=>({...s.set,layers:c,groundBands:w,skyLayer:M}),fe=(d,f)=>{const m=se(d,f);m===null||O.sceneId==null||(typeof m=="number"?t.onCommit?.(m,f,O.sceneId):t.onCommit?.(0,m,O.sceneId))},K=()=>h?h():u,ne=()=>s?.set?.sky&&F?r.get(s.set.sky)??De(F,{asset:s.set.sky},"sky"):null,k=d=>{const f=r.get(c[d]?.asset);return!!(c[d]&&f&&(!f.tileable_x||f.layer==="ground")&&f.layer!=="bg"&&f.layer!=="sky"&&c[d].depth!=="sky")},E=d=>d==="sky"||_(d)>=0,T=(d,f)=>{const m=o?.pickBackdrops?.(d,f).find(S=>H.opaque(S.asset,S.u,S.v)),g=m?m.band!==void 0?`band-${m.band}`:`layer-${m.index}`:s?.set?.sky?"sky":null;return g&&O.select(g),!!g},P=(d,f)=>xe(f)||Tn(d,f),Z=d=>{const f=r.get(c[d]?.asset);return!!f&&P(c[d],f)},j=d=>pe(c[d],K()).z??Y[c[d].depth],ae=d=>k(d)&&!(c[d].keys??[]).some(f=>f.scale!==void 0),ke=d=>Math.round(d*1e3)/1e3,Dt=()=>o?.camera?.position?[o.camera.position.x,o.camera.position.z]:[0,0],O={canvas:n,sceneId:null,async show(d){const f=await va(d.bundle);if(p)return;o||(o=new Us(n,f),$()),A={...d.look??{}},o.setLook(A);const m=ya(d);await o.build(m,f),a=m,c=m.set.layers,w=(m.set.groundBands??[]).map(g=>({...g})),M={...m.set.skyLayer??{}},R=new Set,y=ht(d),s=d,r=new Map(f.assets.map(g=>[g.id,g])),F=f,H=xa(f.base),H.prime(m.set.layers.map(g=>r.get(g.asset)).filter(Boolean)),t.editable&&!L&&(n.style.pointerEvents="auto",window.addEventListener("scene-object-selected",g=>{g.detail?.id!==`s25_${V}`&&(V=null)}),n.addEventListener("dragover",g=>{g.dataTransfer?.types?.includes(fn)&&(g.preventDefault(),g.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",g=>{const S=g.dataTransfer?.getData(fn);if(!S)return;g.preventDefault();const z=n.getBoundingClientRect();O.addLayer(S,{x:g.clientX-z.left,y:g.clientY-z.top})}),L=ma({canvas:n,host:e,stage:()=>o,alpha:{opaque:(g,S,z)=>H.opaque(g,S,z)},valueOf:(g,S)=>S==="z"?j(g):pe(c[g],K())[S],onGround:k,byDistance:ae,groundUnder:(g,S,z,U)=>rn(o.pointerRay(g,S),Z(U)?z:D=>o.groundHeightAt(D)+z),footY:g=>o.layerFootY(g)-(Z(g)?0:o.groundHeightAt(j(g))),eye:Dt,onSettled:g=>O.settleBand(g),onEmpty:(g,S)=>T(g,S),onChange:(g,S,z)=>O.moveLayer(`layer-${g}`,S,z)})),l=new Map(f.assets.map(g=>[g.id,g.height_m??1.7])),v=Number(d.narration_at_s)||0,i=dn(d),e.dataset.stage25dReady="1"},matches:d=>i===dn(d),adopt(d){const f=ht(d);if(f===y)return!1;y=f;const m=(g,S)=>{const z={...g};for(const U of zt)S?.[U]===void 0?delete z[U]:z[U]=S[U];return z};return c=c.map((g,S)=>m(g,d.set?.layers?.[S])),w=w.map((g,S)=>m(g,d.set?.groundBands?.[S])),M=m(M,d.set?.skyLayer),s=d,J(),!0},setLayerProp(d,f,m){se(d,{[f]:m})},setLayerKeys(d,f){const m=W(d);m&&JSON.stringify(m.keys??[])!==JSON.stringify(f)&&se(d,{keys:f})},commitLayerProp(d,f,m){fe(d,{[f]:m})},readLayerProp(d,f){const m=W(d),g=m?f==="z"&&oe(d)>=0?j(oe(d)):f==="z"?pe(m,K()).z??m.z:pe(m,K())[f]:null;return Number.isFinite(g)?g:null},setHidden(d,f){const m=oe(d);m<0||(R=new Set(f?[...R,m]:[...R].filter(g=>g!==m)),J())},update(d){h=null,u=Math.max(0,d)},play(d){h=()=>v+d()},moveLayer(d,f,m){window.__timelineKeying?.edit?.(`s25:${d}`,f,m,{flush:!1})||O.commitLayerProp(d,f,m)},select(d){V=E(d)?d:null,L?.select(oe(d)>=0?oe(d):null,!V),V&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${V}`}}))},get skySelected(){return V==="sky"},get backdrop(){return V},get selection(){return L?.selected??null},clearSelection(){L?.select(null)},atStart(){return u===0&&h===null&&R.size===0},layerInfo(d){const f=(D,X)=>{const le=typeof D.motion=="string"?{kind:D.motion}:D.motion??{};return{kind:le.kind??X?.motion??"none",amount:le.amount??1,speed:le.speed??1}};if(d==="sky"){const D=ne();return D?{id:d,asset:D.id,depth:"sky",figure:null,backdrop:!0,role:"sky",fields:["y","scale","opacity"],label:Fe({},D,(document.documentElement.lang||"en").slice(0,2)),file:`${F.base}${D.file}`,motion:f(M,D)}:null}if(_(d)>=0){const D=w[_(d)],X=r.get(D.asset);return{id:d,asset:D.asset,depth:"bg",figure:null,backdrop:!0,role:"band",fields:["z","scale","opacity"],label:O.items().find(le=>le.id===d)?.label??"",file:X?`${F.base}${X.file}`:null,motion:f(D,X)}}const m=c[oe(d)];if(!m)return null;const g=r.get(m.asset)??null,S=k(oe(d)),z=!S||(m.scale??1)!==1||(m.keys??[]).some(D=>D.scale!==void 0),U=g?.layer==="bg"&&!g.tileable_x;return{id:d,asset:m.asset??null,depth:m.depth,figure:m.figure??null,role:g?.layer??null,ground:S,showScale:z,fields:S?["x","z",...z?["scale"]:[],"rotation","opacity"]:["x",...U?["z"]:[],"y","scale","rotation","opacity"],label:O.items().find(D=>D.id===d)?.label??Fe(m,g,(document.documentElement.lang||"en").slice(0,2)),file:g?`${F.base}${g.file}`:null,motion:f(m,g)}},setLayerMotion(d,f){const m=W(d);m&&fe(d,{motion:{...typeof m.motion=="object"?m.motion:{kind:m.motion},...f}})},reorderLayers(d,f,m){if(!k(f)){m(d,f,O.sceneId,null,null,null);return}const g=me=>c[me]?.z??Y[c[me]?.depth],S=d.filter(me=>me===f||k(me)),z=S.indexOf(f),U=S[z-1],D=S[z+1],X=j(f),le=U===void 0?0:g(U),Je=D===void 0?1/0:g(D);if((U!==void 0||D!==void 0)&&(X<le||X>Je)){const me=Hn(pe(c[f],K()).x,X),$n=U===void 0?Je/1.25:D===void 0?le*1.25:(le+Je)/2,Ce=Math.round(Math.min(q.cells[1][1],Math.max(q.cells[0][1],$n))*100)/100,Qe=Dt(),Gn=(Ce-Qe[1])/Math.max(.1,X-Qe[1]),Lt=ie=>ke(Math.min(20,Math.max(.01,ie*Gn))),Wn=c[f].keys?.some(ie=>ie.z!==void 0||ie.scale!==void 0)?c[f].keys.map(ie=>({...ie,...ie.z!==void 0&&{z:Math.min(q.cells[1][1],Math.max(q.cells[0][1],ke(ie.z+Ce-X)))},...ie.scale!==void 0&&{scale:Lt(ie.scale)}})):null;m(d,f,O.sceneId,Ze(Tt(me,Ce,Qe)).x,Ce,Lt(c[f].scale??1),Wn);return}m(d,f,O.sceneId,c[f].x??.5,g(f),c[f].scale??1)},library(){if(!F)return null;const d=(document.documentElement.lang||"en").slice(0,2);return{bundle:F.bundle,assets:F.assets.map(f=>({id:f.id,layer:f.layer,band:Ht(f),tags:f.tags??[],url:F.base+f.file,label:Fe({},f,d)}))}},async swapAsset(d,f){if(d==="sky"){if(r.get(f)?.layer!=="sky"||ne()?.id===f)return;await O.show({...s,set:{...Q(),sky:f}}),O.sceneId!=null&&t.onCommit?.(0,{sky:f},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const m=w[_(d)];if(m){const S=r.get(f);if(!S||!Ht(S)||m.asset===f)return;const z=Number(d.slice(5)),U=w.map((D,X)=>X===z?{...D,asset:f}:D);await O.show({...s,set:{...Q(),groundBands:U}}),O.sceneId!=null&&t.onCommit?.(0,{band:{index:z,asset:f}},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),O.select(d);return}const g=oe(d);g<0||!c[g]||!r.has(f)||c[g].asset===f||(c=c.map((S,z)=>z===g?{...S,asset:f}:S),await O.show({...s,set:Q()}),t.onCommit?.(g,{asset:f},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(d,f=null){const m=r.get(d);if(!m)return;const g=["mid","fg","near","bg","sky"].includes(m.layer)?m.layer:"mid";let S={asset:d,depth:g,x:.5,scale:1};if(!(m.tileable_x||m.layer==="bg"||m.layer==="sky")){const z=f&&o?rn(o.pointerRay(f.x,f.y),P({},m)?0:D=>o.groundHeightAt(D)):null,U=Ze(St(z??[0,Y[g]]));S={...S,...U,depth:Ut(U.z)}}c=[...c,S],await O.show({...s,set:Q()}),t.onCommit?.(c.length-1,{add:S},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L?.select(c.length-1,!0)},async settleBand(d){const f=c[d];if(!f||!k(d))return;const m=Ut(j(d));if(m===f.depth)return;c=c.map((S,z)=>z===d?{...S,depth:m}:S);const g=R;await O.show({...s,set:Q()}),R=g,J(),O.sceneId!=null&&t.onCommit?.(d,{depth:m},O.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),L?.select(d,!1)},lookControls(){return un.map(d=>{const[f,m,g]=zs[d]??[0,1,.01];return{key:d,min:f,max:m,step:g,value:ce({...Mt,...A},d)}})},setLook(d,f){!un.includes(d)||!Number.isFinite(f)||!o||(A={...A,[d]:f},o.setLook(A),t.onLook?.(d,f,O.sceneId))},async still(d=480){if(!o||!a||!n.width)return null;await o.scene.whenReadyAsync();const f=()=>{const m=document.createElement("canvas");return m.width=d,m.height=Math.max(1,Math.round(d*n.height/n.width)),m.getContext("2d").drawImage(n,0,0,m.width,m.height),m.toDataURL("image/jpeg",.72)};return o.engine.resize(),te++,o.gridHidden=!0,new Promise(m=>{let g=0;const S=D=>{o.engine.onEndFrameObservable.remove(z),clearTimeout(U),o.gridHidden=--te>0,m(D)},z=o.engine.onEndFrameObservable.add(()=>{++g>=6&&S(f())}),U=setTimeout(()=>S(null),4e3)})},get config(){return s},figureBox(d){const f=c.find(z=>z.figure===d);if(!f?.asset)return null;const m=Xs(a,f,l.get(f.asset)??1.7,K());if(!m)return null;const g=n.getBoundingClientRect(),S=g.width*.05;return new DOMRect(g.left+m.x*g.width-S/2,g.top+m.y*g.height,S,g.height*.08)},items:()=>{const d=(document.documentElement.lang||"en").slice(0,2),f=na([...c.map((m,g)=>Fe(m,r.get(m.asset),d)||`layer ${g+1}`),...w.map(m=>Fe({},r.get(m.asset)??{id:m.asset},d))]);return[...c.map((m,g)=>({id:`layer-${g}`,label:f[g],icon:sa(r.get(m.asset)),depth:m.depth,z:m.z??Y[m.depth],keys:m.keys??[]})),...w.map((m,g)=>({id:`band-${g}`,label:f[c.length+g],icon:"photo",depth:"bg",z:m.z,keys:m.keys??[],backdrop:!0})),...s?.set?.sky?[{id:"sky",label:"Sky",icon:"cloud",depth:"sky",keys:M.keys??[],backdrop:!0}]:[],{id:"camera",label:"Camera",depth:null,keys:[]}]},destroy(){p=!0,delete e.dataset.stage25dReady;try{o?.engine.stopRenderLoop(),o?.scene.dispose(),o?.engine.dispose()}catch{}L?.destroy(),n.remove()}};return O}export{fn as DROP_TYPE,un as LOOK_KEYS,Da as createStage25d,ya as stageScene};
