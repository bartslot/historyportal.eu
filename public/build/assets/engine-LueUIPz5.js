import{m as Rn,c as On,M as $e,S as Ge,R as nn,C as ue,T as oe,V as R,E as te,a as on,b as xe,P as Cn,d as Et,e as Bn,f as In,g as Vn,h as sn,U as Un,H as Nn,D as Hn}from"./babylon-BEUo0Gn_.js";import{l as $n}from"./config-qjtb2AOJ.js";import{handleCss as Gn}from"./ArtworkOverlay-ChDad8uB.js";import{g as at,c as Wn,w as Ft,h as jn,e as Yn}from"./projection-CL24asTn.js";import"./vite-helpers-DqutJMZx.js";import"./properties-fhY1XOus.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-BNHl4GNl.js";import"./ambient-CEzLlAaX.js";const Ae=new Set;let it=!1;function Kn(e,t,n=2){const o=t&&t.length,a=o?t[0]*n:e.length;Ae.size&&Ae.clear();let i=an(e,0,a,n,!0);const s=[];if(!i||i.next===i.prev)return s;let r=0,l=0,f=0;if(o&&(i=Qn(e,t,i,n)),e.length>80*n){r=e[0],l=e[1];let h=r,v=l;for(let w=n;w<a;w+=n){const x=e[w],p=e[w+1];x<r&&(r=x),p<l&&(l=p),x>h&&(h=x),p>v&&(v=p)}f=Math.max(h-r,v-l),f=f!==0?32767/f:0}return rt(i,s,r,l,f),s}function an(e,t,n,o,a){let i=null;if(a===fo(e,t,n,o)>0)for(let s=t;s<n;s+=o)i=Dt(s/o|0,e[s],e[s+1],i);else for(let s=n-o;s>=t;s-=o)i=Dt(s/o|0,e[s],e[s+1],i);return i&&Te(i,i.next)&&(ze(i),i=i.next),i}function fe(e,t=e){const n=t===e;let o=e,a;do a=!1,o!==o.next&&(Ae.size===0||!Ae.has(o))&&(Te(o,o.next)||U(o.prev,o,o.next)===0)?((n||o===t)&&(t=o.prev),it=!0,ze(o),o=o.prev,a=!0):(n||o!==t)&&(o=o.next,a=!n);while(a||o!==t);return t}function rt(e,t,n,o,a){a&&io(e,n,o,a);let i=e,s=!1;for(;e.prev!==e.next;){const r=e.prev,l=e.next;if(U(r,e,l)<0&&(a?Xn(e,n,o,a):Zn(e))){t.push(r.i,e.i,l.i),ze(e),e=l,i=l;continue}if(e=l,e===i){if(it=!1,e=fe(e),it){i=e;continue}if(!s){e=qn(e,t),i=e,s=!0;continue}Jn(e,t,n,o,a);break}}}function Zn(e){const t=e.prev,n=e,o=e.next,a=t.x,i=n.x,s=o.x,r=t.y,l=n.y,f=o.y,h=Math.min(a,i,s),v=Math.min(r,l,f),w=Math.max(a,i,s),x=Math.max(r,l,f);let p=o.next;for(;p!==t;){if(p.x>=h&&p.x<=w&&p.y>=v&&p.y<=x&&!(a===p.x&&r===p.y)&&Ue(a,r,i,l,s,f,p.x,p.y)&&U(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function Xn(e,t,n,o){const a=e.prev,i=e,s=e.next,r=a.x,l=i.x,f=s.x,h=a.y,v=i.y,w=s.y,x=Math.min(r,l,f),p=Math.min(h,v,w),c=Math.max(r,l,f),E=Math.max(h,v,w),S=dt(x,p,t,n,o),P=dt(c,E,t,n,o);let y=e.prevZ;for(;y&&y.z>=S;){if(y.x>=x&&y.x<=c&&y.y>=p&&y.y<=E&&y!==s&&!(r===y.x&&h===y.y)&&Ue(r,h,l,v,f,w,y.x,y.y)&&U(y.prev,y,y.next)>=0)return!1;y=y.prevZ}let A=e.nextZ;for(;A&&A.z<=P;){if(A.x>=x&&A.x<=c&&A.y>=p&&A.y<=E&&A!==s&&!(r===A.x&&h===A.y)&&Ue(r,h,l,v,f,w,A.x,A.y)&&U(A.prev,A,A.next)>=0)return!1;A=A.nextZ}return!0}function qn(e,t){let n=e,o=!1;do{const a=n.prev,i=n.next.next;cn(a,n,n.next,i,!1)&&De(a,i)&&De(i,a)&&(t.push(a.i,n.i,i.i),ze(n),ze(n.next),n=e=i,o=!0),n=n.next}while(n!==e);return o?fe(n):n}function Jn(e,t,n,o,a){let i=e;do{let s=i.next.next;for(;s!==i.prev;){if(i.i!==s.i&&co(i,s)){let r=hn(i,s);i=fe(i,i.next),r=fe(r,r.next),rt(i,t,n,o,a),rt(r,t,n,o,a);return}s=s.next}i=i.next}while(i!==e)}let lt=!1;function Qn(e,t,n,o){const a=[];for(let i=0,s=t.length;i<s;i++){const r=t[i]*o,l=i<s-1?t[i+1]*o:e.length,f=an(e,r,l,o,!1);f===f.next&&Ae.add(f),a.push(lo(f))}a.sort(eo),no(e.length/o,t.length),ln(n,n),lt=!0;for(let i=0;i<a.length;i++)n=to(a[i],n);return lt=!1,fe(n)}function eo(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function to(e,t){const n=so(e,t);if(!n)return t;const o=hn(n,e),a=o.next;return ln(n,a.next),fe(o,o.next),fe(n,n.next)}const rn=16;let B=new Float64Array(0),Ve=0;const ct=[],ht=[];function no(e,t){const n=Math.ceil((e+2*t)/rn)+t+2;B.length<n*4&&(B=new Float64Array(n*4)),Ve=0}function ln(e,t){let n=e;do{const o=Ve++;ct[o]=n;let a=1/0,i=1/0,s=-1/0,r=-1/0,l=0;do{const h=n.next;n.z=o,n.x<a&&(a=n.x),n.x>s&&(s=n.x),n.y<i&&(i=n.y),n.y>r&&(r=n.y),h.x<a&&(a=h.x),h.x>s&&(s=h.x),h.y<i&&(i=h.y),h.y>r&&(r=h.y),n=h}while(++l<rn&&n!==t);ht[o]=n;const f=o*4;B[f]=a,B[f+1]=i,B[f+2]=s,B[f+3]=r}while(n!==t)}function oo(e,t){const n=e.z*4;t.x<B[n]&&(B[n]=t.x),t.y<B[n+1]&&(B[n+1]=t.y),t.x>B[n+2]&&(B[n+2]=t.x),t.y>B[n+3]&&(B[n+3]=t.y)}function At(e){let t=ht[e];for(;t.prev.next!==t;)t=t.next;return ht[e]=t,t}function Tt(e){let t=ct[e];for(;t.prev.next!==t;)t=t.next;return ct[e]=t,t}function so(e,t){let n=t;const o=e.x,a=e.y;let i=-1/0,s;if(Te(e,n))return n;for(let w=0,x=0;w<Ve;w++,x+=4){if(a<B[x+1]||a>B[x+3]||B[x]>o||B[x+2]<=i)continue;const p=At(w);n=Tt(w);do{if(n.prev.next===n){if(Te(e,n.next))return n.next;if(a<=n.y&&a>=n.next.y&&n.next.y!==n.y){const c=n.x+(a-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(c<=o&&c>i&&(i=c,s=n.x<n.next.x?n:n.next,c===o))return s}}n=n.next}while(n!==p)}if(!s)return null;const r=s.x,l=s.y,f=Math.min(a,l),h=Math.max(a,l);let v=1/0;for(let w=0,x=0;w<Ve;w++,x+=4){if(B[x+2]<r||B[x]>o||B[x+3]<f||B[x+1]>h)continue;const p=At(w);n=Tt(w);do{if(n.prev.next===n&&o>=n.x&&n.x>=r&&o!==n.x&&Ue(a<l?o:i,a,r,l,a<l?i:o,a,n.x,n.y)){const c=Math.abs(a-n.y)/(o-n.x);(De(n,e)||n.y===a&&n.next.y===a&&n.next.x>o)&&(c<v||c===v&&(n.x>s.x||n.x===s.x&&ao(s,n)))&&(s=n,v=c)}n=n.next}while(n!==p)}return s}function ao(e,t){return U(e.prev,e,t.prev)<0&&U(t.next,e,e.next)<0}const q=[];let ve=[],de=new Uint32Array(0),ye=new Uint32Array(0);const we=new Uint32Array(256);function io(e,t,n,o){let a=e,i=0;do a.z=dt(a.x,a.y,t,n,o),q[i++]=a,a=a.next;while(a!==e);ro(i);let s=null;for(let r=0;r<i;r++){const l=q[r];l.prevZ=s,s&&(s.nextZ=l),s=l}s.nextZ=null}function ro(e){if(e<=32){for(let t=1;t<e;t++){const n=q[t],o=n.z;let a=t-1;for(;a>=0&&q[a].z>o;)q[a+1]=q[a],a--;q[a+1]=n}return}de.length<e&&(de=new Uint32Array(e),ye=new Uint32Array(e),ve=new Array(e));for(let t=0;t<e;t++)de[t]=q[t].z;Le(e,q,de,ve,ye,0),Le(e,ve,ye,q,de,8),Le(e,q,de,ve,ye,16),Le(e,ve,ye,q,de,24)}function Le(e,t,n,o,a,i){we.fill(0);for(let r=0;r<e;r++)we[n[r]>>>i&255]++;let s=0;for(let r=0;r<256;r++){const l=we[r];we[r]=s,s+=l}for(let r=0;r<e;r++){const l=n[r],f=we[l>>>i&255]++;o[f]=t[r],a[f]=l}}function dt(e,t,n,o,a){return e=(e-n)*a|0,t=(t-o)*a|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function lo(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function Ue(e,t,n,o,a,i,s,r){return(a-s)*(t-r)>=(e-s)*(i-r)&&(e-s)*(o-r)>=(n-s)*(t-r)&&(n-s)*(i-r)>=(a-s)*(o-r)}function co(e,t){const n=Te(e,t)&&U(e.prev,e,e.next)>0&&U(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||De(e,t)&&De(t,e)&&(U(e.prev,e,t.prev)!==0||U(e,t.prev,t)!==0))&&!ho(e,t)&&(n||uo(e,t))}function U(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Te(e,t){return e.x===t.x&&e.y===t.y}function cn(e,t,n,o,a=!0){const i=U(e,t,n),s=U(e,t,o),r=U(n,o,e),l=U(n,o,t);return(i>0&&s<0||i<0&&s>0)&&(r>0&&l<0||r<0&&l>0)?!0:a?!!(i===0&&Pe(e,n,t)||s===0&&Pe(e,o,t)||r===0&&Pe(n,e,o)||l===0&&Pe(n,t,o)):!1}function Pe(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function ho(e,t){const n=Math.min(e.x,t.x),o=Math.max(e.x,t.x),a=Math.min(e.y,t.y),i=Math.max(e.y,t.y);let s=e;do{const r=s.next;if(s.x>o&&r.x>o||s.x<n&&r.x<n||s.y>i&&r.y>i||s.y<a&&r.y<a){s=r;continue}if(s.i!==e.i&&r.i!==e.i&&s.i!==t.i&&r.i!==t.i&&cn(s,r,e,t))return!0;s=r}while(s!==e);return!1}function De(e,t){return U(e.prev,e,e.next)<0?U(e,t,e.next)>=0&&U(e,e.prev,t)>=0:U(e,t,e.prev)<0||U(e,e.next,t)<0}function uo(e,t){let n=e,o=!1;const a=(e.x+t.x)/2,i=(e.y+t.y)/2;do{const s=n.next;n.y>i!=s.y>i&&a<(s.x-n.x)*(i-n.y)/(s.y-n.y)+n.x&&(o=!o),n=s}while(n!==e);return o}function hn(e,t){const n=ut(e.i,e.x,e.y),o=ut(t.i,t.x,t.y),a=e.next,i=t.prev;return e.next=t,t.prev=e,n.next=a,a.prev=n,o.next=n,n.prev=o,i.next=o,o.prev=i,o}function Dt(e,t,n,o){const a=ut(e,t,n);return o?(a.next=o.next,a.prev=o,o.next.prev=a,o.next=a):(a.prev=a,a.next=a),a}function ze(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),lt&&oo(e.prev,e.next)}function ut(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function fo(e,t,n,o){let a=0;for(let i=t,s=n-o;i<n;i+=o)a+=(e[s]-e[i])*(e[i+1]+e[s+1]),s=i;return a}Object.assign(window,{BABYLON:{...On,...Rn},earcut:Kn});(()=>{const e=`
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
    }`})();const po=new WeakMap;function mo(e){return po.get(e)?.rtt??null}const go=450,zt=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],_t=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],Lt={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},xo={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function vo(e,t,n){const o=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),i=e.enableGeometryBufferRenderer(),s=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(y=>y.name!=="sky-cloud"&&!(y.metadata&&y.metadata.noGBuffer)))}),r=i.getGBuffer().textures,l=r[i.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],f=r[i.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=y=>new BABYLON.Vector2(1/y.width,1/y.height),v=new BABYLON.Matrix,w=["invView","tanHalf","resolution","skyDepth"],x=["depthSampler","normalSampler"];function p(y,A){t.getViewMatrix().invertToRef(v);const H=Math.tan(t.fov/2);y.setMatrix("invView",v),y.setVector2("tanHalf",new BABYLON.Vector2(H*A.width/A.height,H)),y.setVector2("resolution",new BABYLON.Vector2(A.width,A.height)),y.setFloat("skyDepth",go),y.setTexture("depthSampler",l),y.setTexture("normalSampler",f)}const c=new BABYLON.PostProcess("wash","wash",["texel","radius",...w],x,1,t);c.onApply=y=>{p(y,c),y.setVector2("texel",h(c)),y.setFloat("radius",n.num("wash"))};const E=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...zt,...w],["aquarelSampler",...x],1,t);E.onApply=y=>{p(y,E),y.setVector2("texel",h(E));const A=n.texture();y.setFloat("useTex",A?1:0),y.setTexture("aquarelSampler",A||o),zt.forEach(H=>y.setFloat(H,n.num(H)))};const S=new BABYLON.PostProcess("ink","ink",["texel","inkColor",..._t,...w],["washSampler","animeSampler",...x],1,t);S.onApply=y=>{p(y,S),y.setTextureFromPostProcessOutput("washSampler",c),y.setTexture("animeSampler",mo(e)||a),y.setVector2("texel",h(S)),_t.forEach(A=>y.setFloat(A,n.num(A))),y.setColor3("inkColor",BABYLON.Color3.FromArray(Lt[n.inkColor()]||Lt["blue-grey"]))};const P=[c,E,S];return{dispose(){P.forEach(y=>y.dispose(t)),e.onBeforeRenderObservable.remove(s),e.disableGeometryBufferRenderer(),o.dispose(),a.dispose()}}}const j={sky:380,bg:70,mid:22,fg:7,near:3.5},$={x:0,y:1.6,z:0,fov:50},We=-2,dn=16/9,un=.42,Ze=1.6,yo=3,wo=e=>yo*re(e),bo=(e,t)=>t*e,fn=(e,t,n,o)=>bo(e,t)-(1-o)*n,ft=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,ko=999,Mo=1e3,So=.02,pn=2,yt=120,mn=.05,se=e=>e>Math.PI?e*Math.PI/180:e,re=(e,t=$.fov,n=dn)=>2*e*Math.tan(se(t)/2)*n;function Pt(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const Rt=e=>e.z??j[e.depth],Eo=e=>Math.min(1,Math.max(0,(e-j.mid)/(j.bg-j.mid)));function pt(e,t){return e<=j.bg||t===0?Eo(e)*t:$.y+(t-$.y)*e/j.bg}const Fo=(e,t)=>t?e+t.h*(1-t.top):e,Ao=["ground","path","field","ramp","water"],me=e=>!["bg","sky","figure","ground"].includes(e.layer)&&!e.tileable_x&&e.height_m>=2&&(e.tags??[]).some(t=>Ao.includes(t)),To=(e,t,n,o)=>Math.min(0,fn(e,t,n,o)),gn=(e,t)=>!!e.flat||t.layer==="ground";function be(e,t,n,o=0,a=o){const i=t.depth,s=Rt(t)-n*mn,r=re(s),l=i==="sky"?n*2+1:ft(s);if(e.layer==="sky"){const E=r*Ze,S=E/dn,P=-S*.12;if(e.tileable_x)return{x:0,y:P,z:s,w:E,h:S,uRepeat:E/(S*(e.w/e.h)),alphaIndex:l,rotation:0};const y=Math.max(E/e.w,S/e.h);return{x:0,y:P,z:s,w:e.w*y,h:e.h*y,uRepeat:1,alphaIndex:l,rotation:0}}const f=e.layer==="bg"&&!e.tileable_x?r*Ze*e.h/e.w:0,h=Math.max(e.height_m*(t.scale??1),f),v=h*(e.w/e.h),w=e.tileable_x?Math.max(v,r*Ze):v,x=e.tileable_x?0:((t.x??.5)-.5)*r,p=e.layer==="bg"?i==="bg"?o:0:me(e)?0:pt(Rt(t),a),c=i==="sky"?s*Math.tan(se($.fov)/2)*.45:p;return{x,y:c+(t.y??0),z:s,w,h,uRepeat:e.tileable_x?w/v:1,alphaIndex:l,rotation:t.rotation??0}}function Do(e,t,n=0,o=un,a=We){const i=.5/Math.tan(se($.fov)/2),s=.5+i*Math.tan(-a*Math.PI/180),r=j.bg-n*mn,l=$.y+(s-o)*r/i;return Math.round((l-t*(1-e))*10)/10}const Re=e=>e-zo,zo=.002,Ot={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},xn=(e,t)=>(Ot[e??"inOut"]??Ot.inOut)(Math.min(1,Math.max(0,t))),Me=(e,t,n)=>e+(t-e)*n,vn=e=>e.dur_s??(e.camera&&Vo(e)||e.est_s||8);function yn(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),o=[...n].reverse().find(a=>(a.at_s??0)<=t)??n[0]??null;return{cam:o,t:o?t-(o.at_s??0):t}}function wn(e,t,n){if(!e)return{...$,fov:se($.fov)};const o=xn(e.ease,n>0?t/(e.dur_s??n):1),a={...$,...e.from},i={...a,...e.to};return{x:Me(a.x,i.x,o),y:Me(a.y,i.y,o),z:Me(a.z,i.z,o),fov:Me(se(a.fov),se(i.fov),o)}}const _o=["x","y","z","scale","opacity","rotation"];function ge(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},o=e.keys??[];if(!o.length)return n;const a={...n};for(const i of _o){const s=o.filter(w=>w[i]!==void 0).sort((w,x)=>w.t-x.t);if(!s.length)continue;const r=s[0],l=s[s.length-1];if(t<=r.t){a[i]=r[i];continue}if(t>=l.t){a[i]=l[i];continue}const f=s.findIndex(w=>w.t>t),h=s[f-1],v=s[f];a[i]=Me(h[i],v[i],xn("inOut",(t-h.t)/(v.t-h.t)))}return a}const Lo={none:0,sway:1,drift:2,ripple:3,flicker:4};function Po(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??e.motion??"none",amount:n.amount??1,speed:n.speed??1}}const Ro=.25,Oo=2e3,Co=250,pe={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},Ct={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function Bo(e,t,n,o){const a=r=>{const l=e.lastDir&&e.lastDir!==r?e.flips+1:e.flips;return{...e,notches:e.notches+r,fast:0,lastChange:n,lastDir:r,flips:l,lastUp:r===-1?n:e.lastUp,locked:e.locked||l>=pe.lockFlips&&r===1}};if(t<pe.downFps)return o?a(1):{...e,fast:0};if(t<pe.upFps)return{...e,fast:0};const i=e.fast+1;return e.notches>0&&!e.locked&&i>=pe.upWindows&&n-e.lastChange>=pe.upAfterChangeMs&&n-e.lastUp>=pe.upEveryMs?a(-1):{...e,fast:i}}function Io(e,t,n,o){const a=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),a-o*Ro)}function Vo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const Bt={breath_m:.05,breath_s:7},Uo=1.5;function No(e,t,n={}){const o=n.breath_m??Bt.breath_m,a=2*Math.PI/Math.max(.5,n.breath_s??Bt.breath_s),i=Math.min(1,t/Uo),s=i*i*(3-2*i);return{...e,x:e.x+o*s*Math.sin(a*t),y:e.y+o*.5*s*Math.sin(2*a*t)}}async function Ho(e){const t=await fetch(e);if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const $o=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Ee(e,t,n){if(t.asset){const s=e.assets.find(r=>r.id===t.asset);if(s)return s}const o=$o(t.need??t.asset??"");if(!o.length)return null;let a=null,i=[0,0,0];for(const s of[...e.assets].sort((r,l)=>r.id.localeCompare(l.id))){const r=o.filter(f=>s.tags.some(h=>h.toLowerCase()===f)).length;if(!r)continue;const l=[r,n&&s.layer===n?1:0,s.qa?.score??0];(!a||l[0]>i[0]||l[0]===i[0]&&(l[1]>i[1]||l[1]===i[1]&&l[2]>i[2]))&&(a=s,i=l)}return a}const Se="#f6f5ee",Go=.22,Wo=(e,t)=>e.layer==="bg"?t.feather??Go:0,Xe=.6,bn=12;function jo(e,t){const n=t.paper??Se,o=e.ground;if(o&&o.startsWith("#"))return{kind:"paper",colour:o};const a=t.assets.filter(s=>s.layer==="ground");if(!o)return a.length?{kind:"asset",asset:[...a].sort((s,r)=>s.id.localeCompare(r.id))[0]}:{kind:"paper",colour:n};const i=Ee({...t,assets:a},{asset:o},"ground");return i?{kind:"asset",asset:i}:{kind:"paper",colour:n,reason:`no ground for ${o}`}}function Yo(e,t,n,o=.08){return kn(e,t,n,1-o,1)}function kn(e,t,n,o,a){const i=Math.max(0,Math.floor(n*o)),s=Math.min(n,Math.max(i+1,Math.ceil(n*a))),r=[[],[],[]],l=Math.max(1,Math.floor(t*(s-i)/2e4));for(let h=i*t;h<s*t;h+=l){const v=h*4;e[v+3]<200||(r[0].push(e[v]),r[1].push(e[v+1]),r[2].push(e[v+2]))}if(!r[0].length)return null;const f=h=>{const v=[...h].sort((w,x)=>w-x);return v[v.length>>1]/255};return[f(r[0]),f(r[1]),f(r[2])]}const Fe=32,Ko=(e,t,n)=>Array.from({length:Fe},(o,a)=>kn(e,t,n,a/Fe,(a+1)/Fe)),Zo=(e,t)=>e[Math.min(Fe-1,Math.max(0,Math.floor((1-t)*Fe)))]??null;function Xo(e,t,n){const o=[],a=Math.max(1,Math.floor(t*n/6e4));for(let i=0;i<t*n;i+=a){const s=i*4;if(e[s+3]<230)continue;const r=(.299*e[s]+.587*e[s+1]+.114*e[s+2])/255;r<.45&&o.push(r)}return o.length<20?null:(o.sort((i,s)=>i-s),o[o.length>>1])}function qo(e,t,n){const o=[];for(let a=0;a<t;a++)for(let i=0;i<n;i++)if(e[(i*t+a)*4+3]>128){o.push(i/n);break}return o.length?(o.sort((a,i)=>a-i),o[o.length>>1]):0}function Jo(e,t,n){for(let o=0;o<n;o++){let a=0;for(let i=0;i<t;i++)e[(o*t+i)*4+3]>128&&a++;if(a/t>.5)return o/n}return 0}const Qo=1.6,es=.12;function It(e,t,n,o){const a=e.layer==="figure",i=a?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),s=i*es*o/Qo;return a?{w:i,d:Math.min(s,i*.5)}:{w:i,d:Math.min(Math.max(s,i*.3),i*3)}}const ts=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Oe=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},wt=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,Mn=wt;te.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;te.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, nearTex;
  uniform float useTex, tile, grain, fadeNear, fadeFar, detail, vary, mixTile;
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${wt}
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
  }`;te.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;te.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${wt}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const ns=e=>e?oe.WRAP_ADDRESSMODE:oe.MIRROR_ADDRESSMODE;function os(e){const t=$e.CreateGround("ground",{width:2400,height:2400},e),n=new Ge("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tile","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","nearTex"],needAlphaBlending:!0}),o=new nn(new Uint8Array([255,255,255,255]),1,1,ue.TEXTUREFORMAT_RGBA,e);n.setTexture("tex",o).setTexture("nearTex",o),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0);let a=bn,i=1;return t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=ko,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(s){s.tex&&(s.tex.wrapU=oe.WRAP_ADDRESSMODE,s.tex.wrapV=oe.WRAP_ADDRESSMODE),n.setTexture("tex",s.tex??o),a=s.tile,n.setFloat("useTex",s.tex?1:0).setFloat("tile",a*i).setFloat("grain",s.grain).setFloat("fadeNear",s.fadeNear).setFloat("fadeFar",s.fadeFar).setVector3("base",R.FromArray(s.base)).setVector3("horizonTint",R.FromArray(s.tint))},follow(s){n.setVector3("camPos",s)},live(s){i=s.tileScale,n.setFloat("detail",s.detail).setFloat("vary",s.vary).setFloat("mixTile",s.mixTile).setFloat("tile",a*i)},near(s){n.setFloat("useNear",s?1:0),s&&(s.tex.wrapU=ns(s.tileable),s.tex.wrapV=oe.CLAMP_ADDRESSMODE,n.setTexture("nearTex",s.tex).setMatrix("nearVP",s.vp).setFloat("nearTop",s.top).setFloat("nearSpan",s.span))}}}let ss=0;function Vt(e,t,n,o,a){const i=$e.CreatePlane(`stain${a?"-cast":""}:${e.name}`,{width:t,height:a?a.length:n},o);if(i.rotation.x=Math.PI/2,a){const[r,l]=a.dir,f=Math.hypot(r,l)||1;i.rotation.y=Math.atan2(r/f,l/f),i.position.set(r/f*a.length*.42,.015,l/f*a.length*.42)}else i.position.set(0,.02,-n*.18);i.parent=e;const s=new Ge(i.name,o,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return s.alphaMode=ue.ALPHA_PREMULTIPLIED,s.disableDepthWrite=!0,s.backFaceCulling=!1,s.setFloat("seed",ss++*7.31%97).setFloat("opacity",0),i.material=s,i.metadata={noGBuffer:!0},i.isPickable=!1,{mesh:i,setOpacity:r=>{s.setFloat("opacity",r),i.isVisible=r>.001}}}te.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;te.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${Mn}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;te.ShadersStore.stageBirdFragmentShader=`
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
  }`;function Sn(e,t,n,o){const a=$e.CreatePlane(e,{size:1},n),i=new Ge(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return i.alphaMode=ue.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,a.material=i,a.billboardMode=on.BILLBOARDMODE_ALL,a.alphaIndex=o,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,mat:i}}const En=9,as=9;function is(e,t,n,o){const a=Array.from({length:En},(i,s)=>{const r=Sn(`smoke:${s}`,"stagePuff",e,o);return r.mat.setFloat("seed",s*3.7),r});return{update(i,s){a.forEach(({mesh:r,mat:l},f)=>{const h=rs(i,f),v=n*(.6+3.2*h);r.scaling.setAll(v),r.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(f*2.1+i*.3),t.y+n*(.4+7*h),t.z),l.setFloat("alpha",s*.7*Math.sin(Math.PI*h)),r.isVisible=s>.001})},dispose(){a.forEach(({mesh:i,mat:s})=>{s.dispose(),i.dispose()})}}}const rs=(e,t)=>((e/as+t/En)%1+1)%1,qe=40,Ut=16;function ls(e){const t=(e%qe+qe)%qe;return t<Ut?t/Ut:null}function cs(e,t,n,o){const a=Array.from({length:6},(i,s)=>Sn(`bird:${s}`,"stageBird",e,o));return{update(i,s){const r=ls(i),l=Math.round(2+s*4);a.forEach(({mesh:f,mat:h},v)=>{if(f.isVisible=s>.001&&r!==null&&v<l,!f.isVisible||r===null)return;const w=v*.025;f.position.set((r-w-.5)*n*1.2,22+3*Math.sin(v*1.7)+4*r,t+v*1.5),f.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,s*2)).setFloat("flap",Math.sin(i*7+v*1.3))})},dispose(){a.forEach(({mesh:i,mat:s})=>{s.dispose(),i.dispose()})}}}const Nt=["fire","hearth","chimney","smoke"],hs=e=>e.id.split(/[-_]/).some(t=>Nt.includes(t))||e.tags.some(t=>Nt.includes(t.toLowerCase())),Je=e=>e[0].toUpperCase()+e.slice(1),ds=e=>({fade:`lineFade${Je(e)}`,thin:`lineThin${Je(e)}`,haze:`haze${Je(e)}`}),Ne={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:We,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},us=[1.05,1,.9],fs=[.88,.93,1.05],ps=.35;function ms(e,t,n,o){const a=t==="sky";return{edgeSoft:a?0:G(e,"edgeSoft"),footM:t==="standing"?ps:0,grounding:t==="figure"?0:G(e,"grounding"),grass:t==="figure"?0:G(e,"grassOverlap"),light:a?0:G(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:a?G(e,"cloudDrift"):0,footTint:o}}const Fn=[.93,.86,.74],Ht=e=>({paper:G(e,"sheetPaper"),grain:G(e,"sheetGrain"),patches:G(e,"sheetPatches"),wash:G(e,"sheetWash"),washColour:Fn}),gs={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01]},xs=Object.fromEntries(Object.keys(Ne).map(e=>[e,gs[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ne=(e,t)=>G(e,t),G=(e,t)=>{const n=Number(e[t]??Ne[t]);return Number.isFinite(n)?n:Ne[t]};function Qe(e,t){const n=ds(t);return{fade:G(e,n.fade),thin:G(e,n.thin),haze:G(e,n.haze),brown:G(e,"lineBrown"),ink:G(e,"lineInk"),norm:G(e,"lineNorm")}}const vs=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),et=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),Ce=(e,t,n,o,a)=>{const i=o*(1080/a);return[n/Math.max(e*i,.001),1/Math.max(t*i,.001)]};function ys(e,t,n){const o=new R($.x,$.y,$.z),a=xe.RotationX(e*Math.PI/180),s=xe.LookAtLH(o,o.add(R.TransformNormal(new R(0,0,1),a)),R.TransformNormal(R.Up(),a)).multiply(xe.PerspectiveFovLH(se($.fov),t,.1,2e3));return{vp:s,top:R.TransformCoordinates(new R(0,0,n),s).y}}te.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function ws(e,t){const n=new Cn("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=o=>{o.setFloat("wash",t("sheetWash")).setVector3("washColour",R.FromArray(Fn))},n}const bs=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,ks=`
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
  }`;te.ShadersStore.stageLayerVertexShader=`
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
  }`;te.ShadersStore.stageLayerFragmentShader=`
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
  ${Mn}
  ${bs}
  ${ks}
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
  }`;const $t=new WeakMap,An=new Map,Tn=new Map,mt=new Map,Dn=new Map,gt=new Map;function Be(e,t){const n=$t.get(t)??new Map;$t.set(t,n);const o=n.get(e);if(o)return o;const a=new Promise((i,s)=>{const r=new Image;r.crossOrigin="anonymous",r.onerror=()=>s(new Error(`layer image ${e} did not load`)),r.onload=()=>{const l=document.createElement("canvas");l.width=r.naturalWidth,l.height=r.naturalHeight;const f=l.getContext("2d",{willReadFrequently:!0});f.drawImage(r,0,0);const h=f.getImageData(0,0,l.width,l.height).data,v=Yo(h,l.width,l.height);v&&An.set(e,v),gt.set(e,Ko(h,l.width,l.height)),Tn.set(e,Jo(h,l.width,l.height)),mt.set(e,qo(h,l.width,l.height));const w=Xo(h,l.width,l.height);w!==null&&Dn.set(e,w);for(let p=0;p<h.length;p+=4){const c=h[p+3]/255;h[p]=Math.round(h[p]*c),h[p+1]=Math.round(h[p+1]*c),h[p+2]=Math.round(h[p+2]*c)}const x=new nn(h,l.width,l.height,ue.TEXTUREFORMAT_RGBA,t,!0,!1,oe.TRILINEAR_SAMPLINGMODE);x.anisotropicFilteringLevel=8,x.wrapV=oe.CLAMP_ADDRESSMODE,i(x)},r.src=e});return n.set(e,a),a.catch(()=>n.delete(e)),a}const tt=24;function Ms(e,t,n,o,a){const[i,s]=t.anchor??[.5,1],r=[],l=[],f=[];for(let v=0;v<=tt;v++){const w=v/tt;for(const x of[0,1])r.push((x-i)*n,(s-w)*o,0),l.push(x,w);if(v<tt){const x=v*2;f.push(x,x+2,x+1,x+1,x+2,x+3)}}const h=new on(e,a);return Object.assign(new Bn,{positions:r,uvs:l,indices:f}).applyToMesh(h),h}let Ss=0;function Gt(e,t,n,o,a,i){const s=Ms(`layer:${e.id}`,e,n,o,i),r=new Ge(`layer:${e.id}`,i,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=a!==1?oe.WRAP_ADDRESSMODE:oe.CLAMP_ADDRESSMODE,r.setTexture("tex",t),r.alphaMode=ue.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1;const l=Ss++*2.39996%(Math.PI*2),f=e.anchor?.[1]??1;return r.setFloat("phase",l).setFloat("height",o*f).setFloat("width",n).setFloat("uRepeat",a).setFloat("opacity",1),r.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),r.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),r.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),s.material=r,s.metadata={noGBuffer:!0,painted:!0},s.isPickable=!1,{mesh:s,material:r,setMotion:h=>{r.setFloat("kind",Lo[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{r.setFloat("opacity",h),s.isVisible=h>.001},setLine:(h,v,w,x)=>{r.setFloat("inkMul",v).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),r.setVector2("pxUV",new Et(w[0],w[1])).setVector3("hazeTint",R.FromArray(x))},setPaper:(h,v)=>{r.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),r.setVector3("washColour",R.FromArray(h.washColour)).setVector2("grainUV",new Et(v[0],v[1]))},setBottomFade:h=>{r.setFloat("bottomFade",h)},setAlive:h=>{r.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),r.setVector3("footTint",R.FromArray(h.footTint)).setVector3("sunColour",R.FromArray(us)).setVector3("shadeColour",R.FromArray(fs))},setGroundLine:h=>{r.setFloat("groundLine",h)},setFeather:(h,v)=>{r.setFloat("feather",Math.max(0,Math.min(1,h))),v&&r.setVector3("featherTint",R.FromArray(v))}}}const xt={...xo["History Lines pencil"],paper:.35,granulation:.2,...Ne},Es=new sn(.937,.914,.863,1),Fs=.7,As=(e,t,n)=>e.map((o,a)=>o+(t[a]-o)*n);class Ts{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new In(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new Vn(this.engine),this.scene.clearColor=Es,this.camera=new Un("house",new R(0,1.6,0),this.scene),this.camera.rotation.set(We*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new Nn("sky",new R(0,1,0),this.scene).intensity=.7,new Hn("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=os(this.scene),this.ground.set(this.groundLook(null,null,n)),this.birds=cs(this.scene,jt,re(jt),Ps),vo(this.scene,this.camera,{num:o=>Number(this.look[o]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),ws(this.camera,o=>Number(this.look[o]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Oe(Se);strip=null;nearTex=null;bands=[];smoke=[];birds;footTint=Oe(Se);nearAsset=null;hazeTint=Oe(Se);sceneLib;buildToken=0;look={...xt};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(o=>({scene:t,...o})))}renderCap=1920;tier=Ct;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return Io(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=Ct,this.window.start=0,this.fit()}tick(t){const n=this.window,o=document.hidden||n.last&&t-n.last>Co;if(n.last=t,!n.start||o){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<Oo)return;const a=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const i=this.tier.notches;this.tier=Bo(this.tier,a,t,this.scaleAt(i+1)<this.scaleAt(i)),this.tier.notches!==i&&this.fit()}setLook(t){this.look={...xt,...t??{}}}groundPoint(t,n){const o=j[n];return new R((t-.5)*re(o),0,o)}async build(t,n=this.lib){const o=++this.buildToken,a=[],i=[];t.set.sky&&i.push({layer:{asset:t.set.sky,depth:"sky"},order:0,index:-1});const s={sky:1};t.set.layers.forEach((F,I)=>{const K=F.depth;s[K]=s[K]??0,i.push({layer:F,order:s[K]++,index:I})});const r=[];await Promise.all(i.map(async({layer:F,order:I,index:K})=>{const V=Ee(n,F,F.depth);if(!V){r.push({need:F.need??F.asset,reason:"no match"});return}let Y;try{Y=await Be(n.base+V.file,this.scene)}catch{r.push({need:F.need??F.asset,reason:`file did not load: ${V.file}`});return}if(o!==this.buildToken)return;const C=be(V,F,I),N=Gt(V,Y,C.w,C.h,C.uRepeat,this.scene);N.mesh.position.set(C.x,C.y,C.z);const ae=gn(F,V);N.mesh.alphaIndex=ae?Mo:C.alphaIndex,ae&&(N.mesh.rotation.x=Math.PI/2),N.mesh.isVisible=!1;let Q,le,ie;if(nt.includes(F.depth)&&!V.tileable_x&&!ae&&!me(V)){const J=It(V,C.w,C.h,C.z);ie=b=>It(V,C.w,C.h,b).d/J.d,Q=Vt(N.mesh,J.w,J.d,this.scene),Q.mesh.alphaIndex=Re(C.alphaIndex),le=Vt(N.mesh,J.w,J.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:C.h*Rs(this.sunDir)}),le.mesh.alphaIndex=Re(C.alphaIndex)}a.push({layer:F,index:K,builtScale:F.scale??1,handle:N,asset:V,order:I,stain:Q,cast:le,stainDepth:ie,ink:Dn.get(n.base+V.file),flat:ae,skyline:mt.get(n.base+V.file)})}));const l=jo(t.set,n);let f=null,h=null;const v=ts(t.set.near,n),w=v?Ee(n,{asset:v}):null;if(t.set.near&&!w&&r.push({need:t.set.near,reason:"no near band"}),w)try{h=await Be(n.base+w.file,this.scene)}catch{r.push({need:t.set.near,reason:`file did not load: ${w.file}`})}if(l.kind==="asset")try{f=await Be(n.base+l.asset.file,this.scene)}catch{r.push({need:t.set.ground??"ground",reason:`file did not load: ${l.asset.file}`})}else l.reason&&r.push({need:t.set.ground,reason:l.reason});const x=a.filter(F=>F.asset.layer==="bg").sort((F,I)=>F.index-I.index)[0],p=x?{top:Tn.get(n.base+x.asset.file)??0,h:be(x.asset,x.layer,x.order).h,order:x.order}:null,c=a.find(F=>F.index===-1),E=c&&be(c.asset,c.layer,c.order),S=c&&E?Zo(gt.get(n.base+c.asset.file)??[],($.y-E.y)/E.h):null,P=x?An.get(n.base+x.asset.file)??null:t.set.groundBands?.length?null:S,y=await this.loadBands(t,n),A=F=>F.forEach(I=>{I.stain?.mesh.material?.dispose(),I.cast?.mesh.material?.dispose(),I.handle.mesh.dispose(),I.handle.material.dispose()});if(o!==this.buildToken){A(a),y.forEach(F=>{F.handle.mesh.dispose(),F.handle.material.dispose()});return}A(this.built),this.bands.forEach(F=>{F.handle.mesh.dispose(),F.handle.material.dispose()}),this.bands=y,this.built=a,this.sceneLib=n;const H=l.kind==="asset"?(gt.get(n.base+l.asset.file)??[]).filter(F=>!!F):[],O=this.groundLook(l.kind==="asset"?{tex:f,asset:l.asset}:null,P,n,l.kind==="paper"?l.colour:void 0);this.horizonTint=O.tint,this.strip=p,this.smoke.forEach(F=>F.dispose()),this.smoke=a.filter(F=>hs(F.asset)&&nt.includes(F.layer.depth)&&!F.flat).map(F=>{const I=be(F.asset,F.layer,F.order);return is(this.scene,new R(F.handle.mesh.position.x,I.h*.6,I.z),Math.min(Math.max(I.h*.8,.5),3),I.alphaIndex)}),this.footTint=H.length?Os(H):O.base,this.nearTex=h,this.nearAsset=w,this.hazeTint=S??O.tint,this.ground.set(O),this.missed.set(t.id,r),r.length&&console.warn(`stage25d: ${t.id}: missing`,r)}groundLook(t,n,o,a){const i=Oe(a??o.paper??Se),s=n??i;return{tex:t?.tex??null,tile:t?.asset.height_m||bn,base:As(i,s,Fs),tint:s,fadeNear:j.fg,fadeFar:j.bg*.75,grain:t?.tex?.5:1}}rebind(t){this.built.forEach(n=>{n.index>=0&&(n.layer=t.set.layers[n.index])})}pickLayers(t,n){const o=s=>this.built.some(r=>r.handle.mesh===s),a=[],i=[...this.scene.multiPick(t,n,o)??[]].sort((s,r)=>s.distance-r.distance);for(const s of i){const r=this.built.find(f=>f.handle.mesh===s.pickedMesh),l=s.getTextureCoordinates();!r||!l||r.index<0||r.asset.tileable_x||["sky","bg","ground"].includes(r.asset.layer)||me(r.asset)&&(s.pickedPoint?.y??0)<0||a.push({index:r.index,asset:r.asset,u:l.x,v:l.y})}return a}pickBackdrops(t,n){const o=s=>this.bands.find(r=>r.handle.mesh===s),a=s=>this.built.find(r=>r.handle.mesh===s&&r.index>=0&&r.asset.layer==="bg");return[...this.scene.multiPick(t,n,s=>!!o(s)||!!a(s))??[]].sort((s,r)=>s.distance-r.distance).flatMap(s=>{const r=s.getTextureCoordinates();if(!r)return[];const l=o(s.pickedMesh);if(l)return[{band:l.index,asset:l.asset,u:r.x,v:r.y}];const f=a(s.pickedMesh);return[{index:f.index,asset:f.asset,u:r.x,v:r.y}]})}layerBox(t){const n=this.built.find(f=>f.index===t);if(!n)return null;const o=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),a=1/this.engine.getRenderWidth(),i=1/this.engine.getRenderHeight(),s=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(f=>R.Project(f,xe.IdentityReadOnly,this.scene.getTransformMatrix(),o)),r=s.map(f=>f.x*a),l=s.map(f=>f.y*i);return{x0:Math.min(...r),y0:Math.min(...l),x1:Math.max(...r),y1:Math.max(...l),z:n.handle.mesh.position.z}}groundHeightAt(t){return pt(t,this.land)}land=0;layerFootY(t){const n=this.built.find(o=>o.index===t);return n?me(n.asset)?n.layer.y??0:n.handle.mesh.position.y:0}pointerRay(t,n){const o=this.scene.createPickingRay(t,n,xe.Identity(),this.camera);return{origin:[o.origin.x,o.origin.y,o.origin.z],dir:[o.direction.x,o.direction.y,o.direction.z]}}setGrid(t,n=[1,1,1]){this.gridMeshes.forEach(o=>o.dispose()),this.gridMeshes=[],this.grid=t?{pieces:t,rgb:n,land:null}:null}set gridHidden(t){this.gridOff=t,this.gridMeshes.forEach(n=>n.setEnabled(!t))}gridOff=!1;grid=null;gridMeshes=[];poseGrid(t){const n=this.grid;if(!n||n.land===t)return;this.gridMeshes.forEach(a=>a.dispose());const o=a=>zs*Math.min(1,Math.max(0,(Wt-a)/(Wt-Ls)));this.gridMeshes=n.pieces.map((a,i)=>{const s=a.lines.map(f=>f.map(([h,v])=>new R(h,pt(v,t),v))),r=a.lines.map(f=>f.map(([,h])=>new sn(n.rgb[0],n.rgb[1],n.rgb[2],o(h)))),l=$e.CreateLineSystem(`grid-${i}`,{lines:s,colors:r,useVertexAlpha:!0},this.scene);return l.isPickable=!1,l.setEnabled(!this.gridOff),l.alphaIndex=ft(a.z)+_s,l.material.depthFunction=ue.ALWAYS,l.material.disableDepthWrite=!0,l}),n.land=t}worldXAt(t,n,o){const a=this.scene.createPickingRay(t,n,xe.Identity(),this.camera);return a.origin.x+(o-a.origin.z)/a.direction.z*a.direction.x}sunDir=new R(.55,-1,-.3).normalize();depthLine(t){return{...Qe(this.look,t),tint:this.hazeTint}}paper(){return Ht(this.look)}async loadBands(t,n){const o=[];for(const[a,i]of(t.set.groundBands??[]).entries()){const s=Ee(n,{asset:i.asset},"ground_band");if(!s){console.warn(`stage25d: ${t.id}: no ground band ${i.asset}`);continue}const r=await Be(n.base+s.file,this.scene).catch(()=>null);if(!r){console.warn(`stage25d: ${t.id}: ground band ${s.file} did not load`);continue}const l=wo(i.z),f=l*s.h/s.w,h=Gt(s,r,l,f,1,this.scene);h.material.depthFunction=ue.ALWAYS,h.mesh.position.set(0,0,i.z),h.mesh.alphaIndex=ft(i.z),o.push({handle:h,z:i.z,w:l,h:f,skyline:mt.get(n.base+s.file)??.5,index:a,asset:s})}return o}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?Do(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??un,ne(this.look,"housePitch")):0}pose(t,n,o,a){const i=yn(t,n),s=wn(i.cam,i.t,vn(t)),r=a?No(s,a.t,a):s;this.camera.position.set(r.x,r.y,r.z),this.camera.fov=r.fov;const l=ne(this.look,"housePitch");this.camera.rotation.x=l*Math.PI/180,this.ground.follow(this.camera.position);const f=c=>ne(this.look,c);this.ground.live({detail:f("groundDetail"),vary:f("groundVary"),mixTile:f("groundMix"),tileScale:f("groundScale")}),this.ground.near(this.nearTex?{tex:this.nearTex,...ys(l,this.engine.getAspectRatio(this.camera),f("nearFar")),span:Ds,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),v=Ht(this.look),w=ne(this.look,"bandHeight"),x=this.horizonOf(t),p=Fo(x,this.strip);this.land=p,this.poseGrid(p),this.bands.forEach(c=>{c.handle.mesh.position.y=fn(c.z,w,c.h,c.skyline);const E=et(h,c.z-$.z,se($.fov));c.handle.setOpacity(1),c.handle.setBottomFade(Math.min(1,ne(this.look,"bandFade")/c.h)),c.handle.setPaper(v,Ce(c.w,c.h,1,E,h)),c.handle.setLine(Qe(this.look,"bg"),1,Ce(c.w,c.h,1,E,h),this.hazeTint)}),this.smoke.forEach(c=>c.update(o,ne(this.look,"smoke"))),this.birds.update(o,ne(this.look,"birds"));for(const c of this.built){const E=ge(c.layer,n),S=be(c.asset,{...c.layer,x:E.x,y:E.y,z:E.z,scale:1,rotation:E.rotation},c.order,x,p);c.handle.mesh.position.x=S.x,c.handle.mesh.position.y=c.flat?So:me(c.asset)?To(S.z,w,S.h*E.scale,c.skyline??0)+S.y:S.y,c.handle.mesh.position.z!==S.z&&(c.handle.mesh.position.z=S.z,c.flat||(c.handle.mesh.alphaIndex=S.alphaIndex),c.stain&&(c.stain.mesh.alphaIndex=Re(S.alphaIndex)),c.stain&&c.stainDepth&&(c.stain.mesh.scaling.y=c.stainDepth(S.z)),c.cast&&(c.cast.mesh.alphaIndex=Re(S.alphaIndex))),c.handle.mesh.rotation.z=-S.rotation*Math.PI/180,c.handle.mesh.scaling.setAll(E.scale/c.builtScale),c.handle.setOpacity(E.opacity),c.handle.setFeather(Wo(c.asset,c.layer),this.horizonTint),c.asset.layer==="sky"&&c.handle.setGroundLine((r.y-S.y)/(S.h*E.scale));const P=et(h,S.z-r.z,this.camera.fov),y=Qe(this.look,c.layer.depth);c.handle.setPaper(v,Ce(S.w*E.scale,S.h*E.scale,S.uRepeat,et(1080,S.z-$.z,se($.fov)),1080)),c.handle.setLine(y,c.ink===void 0?1:vs(c.ink,y.ink,y.norm),Ce(S.w*E.scale,S.h*E.scale,S.uRepeat,P,h),this.hazeTint),c.stain?.setOpacity((c.layer.shadow??Xe)*E.opacity),c.cast?.setOpacity(ne(this.look,"castShadow")*((c.layer.shadow??Xe)/Xe)*E.opacity);const A=c.asset.layer==="sky"?"sky":c.asset.layer==="bg"?"strip":c.asset.layer==="figure"?"figure":nt.includes(c.layer.depth)&&!c.flat?"standing":"other";c.handle.setAlive(ms(this.look,A,this.sunDir.x,this.footTint)),c.handle.setMotion(Po(c.asset,c.layer)),c.handle.material.setFloat("time",o)}}}const Ds=1.3,zs=.35,_s=.001,Ls=40,Wt=120,jt=110,Ps=900,Rs=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),Os=e=>[0,1,2].map(t=>e.reduce((n,o)=>n+o[t],0)/e.length),nt=["mid","fg","near"],Cs=16/9,Bs=.92;function Is(e,t,n,o){const{cam:a,t:i}=yn(e,o),s=wn(a,i,vn(e)),r=j[t.depth],l=r-s.z;if(l<=.5)return null;const f=ge(t,o),h=(f.x-.5)*re(r),v=Math.tan(s.fov/2),w=(h-s.x)/(l*v*Cs),x=-We*Math.PI/180,p=Math.tan(Math.atan2(n*f.scale-s.y,l)-x)/v;return Math.abs(w)>Bs?null:{x:(w+1)/2,y:Math.min(1,Math.max(0,(1-p)/2))}}const Vs={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},Yt=new Set(["large","small","tall","long","short","fallen"]),Us=new Set(["tree","shrub"]),bt=e=>e.charAt(0).toUpperCase()+e.slice(1),Ns=(e,t)=>Vs[e]?.[t?1:0]??e;function Hs(e,t="en"){const n=t==="nl",o=e?.name?.[t]??e?.name?.en;if(o)return o;const a=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!a.length)return"";const i=a.length>1&&Us.has(a[0])?a.slice(1):a,s=i.filter(l=>Yt.has(l)),r=i.filter(l=>!Yt.has(l));return bt([...s,...r].map(l=>Ns(l,n)).join(" "))}const Kt=e=>bt(String(e).replace(/-/g," ").replace(/ ([a-z])$/,(t,n)=>` ${n.toUpperCase()}`)),$s=e=>{const t=(e?.tags??[]).find(o=>o.startsWith("char:"));if(t)return t.slice(5);const n=/^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(e?.id??""));return n?n[1]:null};function ke(e,t,n="en"){if(e.figure)return Kt(e.figure);const o=t??(e.asset?{id:e.asset}:null),a=(o?.layer==="figure"||/^fig-/.test(String(o?.id??"")))&&$s(o);if(a)return Kt(a);if(o)return Hs(o,n);const i=Array.isArray(e.need)?e.need[0]:e.need;return i?bt(String(i)):""}function Gs(e){const t=new Map;return e.map(n=>{const o=(t.get(n)??0)+1;return t.set(n,o),o===1?n:`${n} ${o}`})}const Ws=24;function js(e){const t=new Map,n=o=>{if(t.has(o))return;t.set(o,"loading");const a=new Image;a.onload=()=>{try{const i=document.createElement("canvas");i.width=a.naturalWidth,i.height=a.naturalHeight;const s=i.getContext("2d",{willReadFrequently:!0});s.drawImage(a,0,0),t.set(o,{w:i.width,h:i.height,data:s.getImageData(0,0,i.width,i.height).data})}catch{t.set(o,"failed")}},a.onerror=()=>t.set(o,"failed"),a.src=e+o};return{prime(o){o.forEach(a=>a?.file&&n(a.file))},opaque(o,a,i){const s=t.get(o?.file);if(!s||typeof s=="string")return o?.file&&n(o.file),!0;const r=Math.min(s.w-1,Math.max(0,Math.floor(a*s.w))),l=Math.min(s.h-1,Math.max(0,Math.floor((1-i)*s.h)));return s.data[(l*s.w+r)*4+3]>Ws}}}const Z={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,pn],[80,yt]]},Ys=e=>e<=12?1:e<=40?5:20,Ks=e=>Ys(e)/4;function Zt(e,t=0){const n=typeof t=="function"?t:()=>t,o=f=>[e.origin[0]+f*e.dir[0],e.origin[2]+f*e.dir[2]],a=f=>e.origin[1]+f*e.dir[1]-(Z.z+n(o(f)[1]));if(!(e.dir[2]>0))return null;const i=(yt*Zs-e.origin[2])/e.dir[2],s=Math.sign(a(0));if(s===0)return Ft(Z,o(0));let r=0,l=null;for(let f=1;f<=Xt;f++){const h=i*f/Xt;if(Math.sign(a(h))!==s){l=h;break}r=h}if(l===null)return null;for(let f=0;f<Xs;f++){const h=(r+l)/2;Math.sign(a(h))===s?r=h:l=h}return Ft(Z,o(l))}const Zs=4,Xt=400,Xs=30;function vt(e){const t=Ks(at(Z,e)[1]);return at(Z,Wn(e,t))}const zn=(e,t)=>[(e-.5)*re(t),t],He=([e,t])=>({x:Math.round((.5+e/re(t))*1e4)/1e4,z:t});function kt([e,t],n,o=[0,0]){const a=(n-o[1])/Math.max(.1,t-o[1]);return[o[0]+(e-o[0])*a,n]}function qs([e,t],n,o=[0,0]){const[[,a],[,i]]=Z.cells,s=Math.max(.1,t-o[1]),r=Math.min(i,Math.max(a,o[1]+s/Math.max(.01,n)));return at(Z,kt([e,t],r,o))}const Js=[[pn,12,2],[12,40,10],[40,yt,40]],Qs=20;function ea(){return Js.flatMap(([e,t,n],o)=>{const a=n*Qs,i=[];let s=e;for(let r=Math.ceil(e/n)*n;r<=t;r+=n){if(r===e&&o>0)continue;const l={...Z,cells:[[-a,s],[a,r]]},f=jn(l,n,Math.max(1,Math.round(r-s))).filter(h=>h[0][0]!==h[h.length-1][0]?h[0][1]===r:r>s);i.push({z:r,lines:f.map(h=>h.map(v=>Yn(Z,v).slice(0,2)))}),s=r}return i})}const qt=-1,Jt=2;function ta({canvas:e,host:t,stage:n,valueOf:o,alpha:a,onChange:i,onGround:s=()=>!1,byDistance:r=()=>!1,groundUnder:l=()=>null,footY:f=()=>0,eye:h=()=>[0,0],onSettled:v=()=>{},onEmpty:w=()=>!1}){let x=null,p=null,c=!1;const E="#38bdf8",S=document.createElement("div");S.dataset.stage25dSelection="",S.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${E};z-index:3;`;const P=document.createElement("div");P.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${E};pointer-events:none;`,S.appendChild(P);const y=document.createElement("div");y.dataset.rotateHandle="1",y.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",S.appendChild(y);const H=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([b,M])=>{const D=document.createElement("div");return D.dataset.scaleHandle="1",D.style.cssText=Gn(b,M),S.appendChild(D),D});t.appendChild(S),n()?.setGrid?.(ea(),na(t,"--color-neutral"));const O=document.createElement("div");O.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(O);const F=b=>{const M=Y();if(!M||b===null){O.style.display="none";return}const D=t.getBoundingClientRect(),L=e.getBoundingClientRect();Object.assign(O.style,{display:"block",left:`${M.left+M.width/2+L.left-D.left}px`,top:`${M.top+M.height+L.top-D.top}px`}),O.textContent=`${o(b,"z").toFixed(2)} m`},I=b=>{const M=e.getBoundingClientRect();return{x:b.clientX-M.left,y:b.clientY-M.top}},K=(b,M)=>n()?.pickLayers(b,M).find(D=>a.opaque(D.asset,D.u,D.v))??null,V=(b,M)=>{x=b,M&&b!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${b}`}})),C()},Y=()=>{const b=x===null?null:n()?.layerBox(x);if(!b)return null;const M=e.getBoundingClientRect();return{left:b.x0*M.width,top:b.y0*M.height,width:(b.x1-b.x0)*M.width,height:(b.y1-b.y0)*M.height,z:b.z}},C=()=>{const b=Y();if(!b){S.style.display="none";return}const M=e.getBoundingClientRect(),D=t.getBoundingClientRect();Object.assign(S.style,{display:"block",left:`${b.left+M.left-D.left}px`,top:`${b.top+M.top-D.top}px`,width:`${b.width}px`,height:`${b.height}px`})},N=(b,M,D)=>Math.min(D,Math.max(M,b)),ae=b=>{if(b.button!==0)return;const{x:M,y:D}=I(b),L=K(M,D);if(!L){w(M,D)&&b.stopPropagation();return}b.stopPropagation(),V(L.index,!0);const T=n().layerBox(L.index),d=s(L.index),u=Y();p={mode:"move",index:L.index,z:T.z,from:n().worldXAt(M,D,T.z),x0:o(L.index,"x"),id:b.pointerId,el:e,ground:d,start:[M,D],foot:u?[u.left+u.width/2,u.top+u.height]:[M,D],lift:d?f(L.index):0},e.setPointerCapture?.(b.pointerId)},Q=b=>M=>{if(M.button!==0||x===null)return;const D=Y();if(!D)return;M.stopPropagation(),M.preventDefault();const L=e.getBoundingClientRect(),T=D.left+D.width/2,d=D.top+D.height/2,{x:u,y:g}={x:M.clientX-L.left,y:M.clientY-L.top};p={mode:b,index:x,cx:T,cy:d,id:M.pointerId,el:M.currentTarget,d0:Math.max(8,Math.hypot(u-T,g-d)),a0:Math.atan2(g-d,u-T),scale0:o(x,"scale"),rotation0:o(x,"rotation"),byDistance:b==="scale"&&r(x),p0:zn(o(x,"x"),o(x,"z")),eye:h()},M.currentTarget.setPointerCapture?.(M.pointerId)},le=b=>{const{x:M,y:D}=I(b);if(p?.mode==="move"&&p.ground){const L=l(p.foot[0]+M-p.start[0],p.foot[1]+D-p.start[1],p.lift,p.index);if(!L)return;const T=He(vt(L));i(p.index,"x",N(T.x,qt,Jt)),i(p.index,"z",T.z),F(p.index);return}if(p?.mode==="move"){const L=(n().worldXAt(M,D,p.z)-p.from)/re(p.z);i(p.index,"x",Math.round(N(p.x0+L,qt,Jt)*1e3)/1e3);return}if(p?.mode==="scale"&&p.byDistance){const L=Math.hypot(M-p.cx,D-p.cy)/p.d0*p.scale0,T=vt(qs(p.p0,L,p.eye))[1],d=He(kt(p.p0,T,p.eye));p.scale0!==1&&i(p.index,"scale",1),i(p.index,"x",d.x),i(p.index,"z",d.z),F(p.index);return}if(p?.mode==="scale"){const L=Math.hypot(M-p.cx,D-p.cy);i(p.index,"scale",Math.round(N(p.scale0*(L/p.d0),.05,20)*1e3)/1e3);return}if(p?.mode==="rotate"){let L=p.rotation0+(Math.atan2(D-p.cy,M-p.cx)-p.a0)*180/Math.PI;b.shiftKey&&(L=Math.round(L/15)*15),i(p.index,"rotation",Math.round(L*10)/10);return}c||(c=!0,requestAnimationFrame(()=>{c=!1,e.style.cursor=K(M,D)?"pointer":""}))},ie=()=>{if(!p)return;p.el.releasePointerCapture?.(p.id);const b=p.index,M=p.mode==="move"&&p.ground||p.byDistance;p=null,O.style.display="none",M&&v(b)},J=b=>{x!==null&&b.detail?.id!==`s25_layer-${x}`&&(x=null,C())};e.addEventListener("pointerdown",ae);for(const b of[e,...H,y])b.addEventListener("pointermove",le),b.addEventListener("pointerup",ie),b.addEventListener("pointercancel",ie);return H.forEach(b=>b.addEventListener("pointerdown",Q("scale"))),y.addEventListener("pointerdown",Q("rotate")),window.addEventListener("scene-object-selected",J),{select:(b,M=!1)=>V(b,M),get selected(){return x},place:C,destroy(){window.removeEventListener("scene-object-selected",J),S.remove(),n()?.setGrid?.(null),O.remove()}}}function na(e,t){const n=document.createElement("canvas").getContext?.("2d",{willReadFrequently:!0});return n?(n.fillStyle=getComputedStyle(e).getPropertyValue(t).trim()||"slategray",n.fillRect(0,0,1,1),[...n.getImageData(0,0,1,1).data.slice(0,3)].map(o=>o/255)):[.2,.25,.33]}const Mt=["x","y","z","scale","rotation","opacity","keys"],X=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},oa=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!Mt.includes(t))),Qt=e=>JSON.stringify({...e,set:{...e?.set,layers:(e?.set?.layers??[]).map(oa)}}),ot=e=>JSON.stringify((e?.set?.layers??[]).map(t=>Mt.map(n=>t[n]??null))),en=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch"],tn="application/x-lp-stage25d",Ie=new Map,st=new Map,sa=e=>(st.has(e)||st.set(e,js(e)),st.get(e));function aa(e){return Ie.has(e)||Ie.set(e,Ho($n(e)).catch(t=>{throw Ie.delete(e),t})),Ie.get(e)}const ia=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function xa(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let o=null,a=null,i=null,s=null,r=new Map,l=new Map,f=0,h=null,v=0,w=0,x=performance.now(),p=!1,c=[],E=new Set,S=null,P=null,y=null,A=null,H={},O=null,F=0;const I=()=>{o.engine.runRenderLoop(()=>{const d=performance.now();w+=Math.min(.1,(d-x)/1e3),x=d,o.tick(d),a&&o.pose(a,Y(),w),o.scene.render(),O?.place()})},K=()=>{!a||!o||(a={...a,set:{...a.set,layers:c.map((d,u)=>E.has(u)?{...d,opacity:0,keys:[]}:d)}},o.rebind(a))},V=(d,u)=>{const g=X(d);return g<0||!c[g]?-1:(c=c.map((m,k)=>k===g?{...m,...u}:m),S=ot({set:{layers:c}}),K(),g)},Y=()=>h?h():f,C=()=>s?.set?.sky&&P?r.get(s.set.sky)??Ee(P,{asset:s.set.sky},"sky"):null,N=d=>{const u=r.get(c[d]?.asset);return!!(c[d]&&u&&(!u.tileable_x||u.layer==="ground")&&u.layer!=="bg"&&u.layer!=="sky"&&c[d].depth!=="sky")},ae=d=>d==="sky"||!!Q(d),Q=d=>{const u=/^band-(\d+)$/.exec(String(d??""));return u?s?.set?.groundBands?.[Number(u[1])]??null:null},le=(d,u)=>{const g=o?.pickBackdrops?.(d,u).find(k=>y.opaque(k.asset,k.u,k.v)),m=g?g.band!==void 0?`band-${g.band}`:`layer-${g.index}`:s?.set?.sky?"sky":null;return m&&T.select(m),!!m},ie=(d,u)=>me(u)||gn(d,u),J=d=>{const u=r.get(c[d]?.asset);return!!u&&ie(c[d],u)},b=d=>ge(c[d],Y()).z??j[c[d].depth],M=d=>N(d)&&!(c[d].keys??[]).some(u=>u.scale!==void 0),D=d=>Math.round(d*1e3)/1e3,L=()=>o?.camera?.position?[o.camera.position.x,o.camera.position.z]:[0,0],T={canvas:n,sceneId:null,async show(d){const u=await aa(d.bundle);if(p)return;o||(o=new Ts(n,u),I()),H={...d.look??{}},o.setLook(H);const g=ia(d);await o.build(g,u),a=g,c=g.set.layers,E=new Set,S=ot(d),s=d,r=new Map(u.assets.map(m=>[m.id,m])),P=u,y=sa(u.base),y.prime(g.set.layers.map(m=>r.get(m.asset)).filter(Boolean)),t.editable&&!O&&(n.style.pointerEvents="auto",window.addEventListener("scene-object-selected",m=>{m.detail?.id!==`s25_${A}`&&(A=null)}),n.addEventListener("dragover",m=>{m.dataTransfer?.types?.includes(tn)&&(m.preventDefault(),m.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",m=>{const k=m.dataTransfer?.getData(tn);if(!k)return;m.preventDefault();const z=n.getBoundingClientRect();T.addLayer(k,{x:m.clientX-z.left,y:m.clientY-z.top})}),O=ta({canvas:n,host:e,stage:()=>o,alpha:{opaque:(m,k,z)=>y.opaque(m,k,z)},valueOf:(m,k)=>k==="z"?b(m):ge(c[m],Y())[k],onGround:N,byDistance:M,groundUnder:(m,k,z,_)=>Zt(o.pointerRay(m,k),J(_)?z:W=>o.groundHeightAt(W)+z),footY:m=>o.layerFootY(m)-(J(m)?0:o.groundHeightAt(b(m))),eye:L,onSettled:m=>T.settleBand(m),onEmpty:(m,k)=>le(m,k),onChange:(m,k,z)=>T.moveLayer(`layer-${m}`,k,z)})),l=new Map(u.assets.map(m=>[m.id,m.height_m??1.7])),v=Number(d.narration_at_s)||0,i=Qt(d),e.dataset.stage25dReady="1"},matches:d=>i===Qt(d),adopt(d){const u=ot(d);if(u===S)return!1;S=u;const g=d.set?.layers??[];return c=c.map((m,k)=>{const z={...m};for(const _ of Mt)g[k]?.[_]===void 0?delete z[_]:z[_]=g[k][_];return z}),s=d,K(),!0},setLayerProp(d,u,g){V(d,{[u]:g})},setLayerKeys(d,u){const g=X(d);JSON.stringify(c[g]?.keys??[])!==JSON.stringify(u)&&V(d,{keys:u})},commitLayerProp(d,u,g){const m=V(d,{[u]:g});m>=0&&this.sceneId!=null&&t.onCommit?.(m,{[u]:g},this.sceneId)},readLayerProp(d,u){const g=c[X(d)],m=g?u==="z"?b(X(d)):ge(g,Y())[u]:null;return Number.isFinite(m)?m:null},setHidden(d,u){const g=X(d);g<0||(E=new Set(u?[...E,g]:[...E].filter(m=>m!==g)),K())},update(d){h=null,f=Math.max(0,d)},play(d){h=()=>v+d()},moveLayer(d,u,g){window.__timelineKeying?.edit?.(`s25:${d}`,u,g,{flush:!1})||T.commitLayerProp(d,u,g)},select(d){A=ae(d)?d:null,O?.select(X(d)>=0?X(d):null,!A),A&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_${A}`}}))},get skySelected(){return A==="sky"},get backdrop(){return A},get selection(){return O?.selected??null},clearSelection(){O?.select(null)},atStart(){return f===0&&h===null&&E.size===0},layerInfo(d){if(d==="sky"){const _=C();return _?{id:d,asset:_.id,depth:"sky",figure:null,backdrop:!0,role:"sky",label:ke({},_,(document.documentElement.lang||"en").slice(0,2)),file:`${P.base}${_.file}`,motion:null}:null}const u=Q(d);if(u){const _=r.get(u.asset);return{id:d,asset:u.asset,depth:"bg",figure:null,backdrop:!0,role:_?.layer??null,label:T.items().find(W=>W.id===d)?.label??"",file:_?`${P.base}${_.file}`:null,motion:null}}const g=c[X(d)];if(!g)return null;const m=r.get(g.asset)??null,k=typeof g.motion=="string"?{kind:g.motion}:g.motion??{},z=m?.motion??"none";return{id:d,asset:g.asset??null,depth:g.depth,figure:g.figure??null,role:m?.layer??null,ground:N(X(d)),showScale:!N(X(d))||(g.scale??1)!==1||(g.keys??[]).some(_=>_.scale!==void 0),label:T.items().find(_=>_.id===d)?.label??ke(g,m,(document.documentElement.lang||"en").slice(0,2)),file:m?`${P.base}${m.file}`:null,motion:{kind:k.kind??z,amount:k.amount??1,speed:k.speed??1}}},setLayerMotion(d,u){const g=X(d);if(g<0||!c[g])return;const m={...typeof c[g].motion=="object"?c[g].motion:{kind:c[g].motion},...u},k=V(d,{motion:m});k>=0&&t.onCommit?.(k,{motion:m},T.sceneId)},reorderLayers(d,u,g){if(!N(u)){g(d,u,T.sceneId,null,null,null);return}const m=he=>c[he]?.z??j[c[he]?.depth],k=d.filter(he=>he===u||N(he)),z=k.indexOf(u),_=k[z-1],W=k[z+1],ce=b(u),je=_===void 0?0:m(_),Ye=W===void 0?1/0:m(W);if((_!==void 0||W!==void 0)&&(ce<je||ce>Ye)){const he=zn(ge(c[u],Y()).x,ce),_n=_===void 0?Ye/1.25:W===void 0?je*1.25:(je+Ye)/2,_e=Math.round(Math.min(Z.cells[1][1],Math.max(Z.cells[0][1],_n))*100)/100,Ke=L(),Ln=(_e-Ke[1])/Math.max(.1,ce-Ke[1]),St=ee=>D(Math.min(20,Math.max(.01,ee*Ln))),Pn=c[u].keys?.some(ee=>ee.z!==void 0||ee.scale!==void 0)?c[u].keys.map(ee=>({...ee,...ee.z!==void 0&&{z:Math.min(Z.cells[1][1],Math.max(Z.cells[0][1],D(ee.z+_e-ce)))},...ee.scale!==void 0&&{scale:St(ee.scale)}})):null;g(d,u,T.sceneId,He(kt(he,_e,Ke)).x,_e,St(c[u].scale??1),Pn);return}g(d,u,T.sceneId,c[u].x??.5,m(u),c[u].scale??1)},library(){if(!P)return null;const d=(document.documentElement.lang||"en").slice(0,2);return{bundle:P.bundle,assets:P.assets.map(u=>({id:u.id,layer:u.layer,tags:u.tags??[],url:P.base+u.file,label:ke({},u,d)}))}},async swapAsset(d,u){if(d==="sky"){if(r.get(u)?.layer!=="sky"||C()?.id===u)return;await T.show({...s,set:{...s.set,sky:u,layers:c}}),T.sceneId!=null&&t.onCommit?.(0,{sky:u},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const g=Q(d);if(g){const k=r.get(u);if(!k||["sky","figure"].includes(k.layer)||g.asset===u)return;const z=Number(d.slice(5)),_=s.set.groundBands.map((W,ce)=>ce===z?{...W,asset:u}:W);await T.show({...s,set:{...s.set,groundBands:_,layers:c}}),T.sceneId!=null&&t.onCommit?.(0,{band:{index:z,asset:u}},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),T.select(d);return}const m=X(d);m<0||!c[m]||!r.has(u)||c[m].asset===u||(c=c.map((k,z)=>z===m?{...k,asset:u}:k),await T.show({...s,set:{...s.set,layers:c}}),t.onCommit?.(m,{asset:u},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(d,u=null){const g=r.get(d);if(!g)return;const m=["mid","fg","near","bg","sky"].includes(g.layer)?g.layer:"mid";let k={asset:d,depth:m,x:.5,scale:1};if(!(g.tileable_x||g.layer==="bg"||g.layer==="sky")){const z=u&&o?Zt(o.pointerRay(u.x,u.y),ie({},g)?0:W=>o.groundHeightAt(W)):null,_=He(vt(z??[0,j[m]]));k={...k,..._,depth:Pt(_.z)}}c=[...c,k],await T.show({...s,set:{...s.set,layers:c}}),t.onCommit?.(c.length-1,{add:k},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),O?.select(c.length-1,!0)},async settleBand(d){const u=c[d];if(!u||!N(d))return;const g=Pt(b(d));if(g===u.depth)return;c=c.map((k,z)=>z===d?{...k,depth:g}:k);const m=E;await T.show({...s,set:{...s.set,layers:c}}),E=m,K(),T.sceneId!=null&&t.onCommit?.(d,{depth:g},T.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),O?.select(d,!1)},lookControls(){return en.map(d=>{const[u,g,m]=xs[d]??[0,1,.01];return{key:d,min:u,max:g,step:m,value:ne({...xt,...H},d)}})},setLook(d,u){!en.includes(d)||!Number.isFinite(u)||!o||(H={...H,[d]:u},o.setLook(H),t.onLook?.(d,u,T.sceneId))},async still(d=480){if(!o||!a||!n.width)return null;await o.scene.whenReadyAsync();const u=()=>{const g=document.createElement("canvas");return g.width=d,g.height=Math.max(1,Math.round(d*n.height/n.width)),g.getContext("2d").drawImage(n,0,0,g.width,g.height),g.toDataURL("image/jpeg",.72)};return o.engine.resize(),F++,o.gridHidden=!0,new Promise(g=>{let m=0;const k=W=>{o.engine.onEndFrameObservable.remove(z),clearTimeout(_),o.gridHidden=--F>0,g(W)},z=o.engine.onEndFrameObservable.add(()=>{++m>=6&&k(u())}),_=setTimeout(()=>k(null),4e3)})},get config(){return s},figureBox(d){const u=c.find(z=>z.figure===d);if(!u?.asset)return null;const g=Is(a,u,l.get(u.asset)??1.7,Y());if(!g)return null;const m=n.getBoundingClientRect(),k=m.width*.05;return new DOMRect(m.left+g.x*m.width-k/2,m.top+g.y*m.height,k,m.height*.08)},items:()=>{const d=(document.documentElement.lang||"en").slice(0,2),u=s?.set?.groundBands??[],g=Gs([...c.map((m,k)=>ke(m,r.get(m.asset),d)||`layer ${k+1}`),...u.map(m=>ke({},r.get(m.asset)??{id:m.asset},d))]);return[...c.map((m,k)=>({id:`layer-${k}`,label:g[k],depth:m.depth,z:m.z??j[m.depth],keys:m.keys??[]})),...u.map((m,k)=>({id:`band-${k}`,label:g[c.length+k],depth:"bg",z:m.z,keys:[],backdrop:!0})),...s?.set?.sky?[{id:"sky",label:"Sky",depth:"sky",keys:[],backdrop:!0}]:[],{id:"camera",label:"Camera",depth:null,keys:[]}]},destroy(){p=!0,delete e.dataset.stage25dReady;try{o?.engine.stopRenderLoop(),o?.scene.dispose(),o?.engine.dispose()}catch{}O?.destroy(),n.remove()}};return T}export{tn as DROP_TYPE,en as LOOK_KEYS,xa as createStage25d,ia as stageScene};
