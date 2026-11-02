import{m as mn,c as gn,M as ut,S as Ne,R as Nt,C as me,T as te,V as L,E as Q,a as Ht,b as le,P as xn,d as gt,e as vn,f as yn,g as wn,h as bn,U as kn,H as Mn,D as Sn}from"./babylon-BEUo0Gn_.js";import{l as Fn}from"./config-qjtb2AOJ.js";import{handleCss as En}from"./ArtworkOverlay-Cn28gXAF.js";import{g as et,c as Tn,w as An,h as zn,e as Ln}from"./projection-CL24asTn.js";import"./vite-helpers-DqutJMZx.js";import"./properties-fhY1XOus.js";import"./easing-HS2C6-zA.js";import"./i18n-DoByrmTl.js";import"./big-countdown-D0zZ_PJZ.js";import"./ambient-CEzLlAaX.js";const Fe=new Set;let tt=!1;function Dn(e,t,n=2){const o=t&&t.length,a=o?t[0]*n:e.length;Fe.size&&Fe.clear();let s=Wt(e,0,a,n,!0);const i=[];if(!s||s.next===s.prev)return i;let r=0,c=0,u=0;if(o&&(s=Cn(e,t,s,n)),e.length>80*n){r=e[0],c=e[1];let h=r,y=c;for(let v=n;v<a;v+=n){const l=e[v],b=e[v+1];l<r&&(r=l),b<c&&(c=b),l>h&&(h=l),b>y&&(y=b)}u=Math.max(h-r,y-c),u=u!==0?32767/u:0}return nt(s,i,r,c,u),i}function Wt(e,t,n,o,a){let s=null;if(a===Zn(e,t,n,o)>0)for(let i=t;i<n;i+=o)s=yt(i/o|0,e[i],e[i+1],s);else for(let i=n-o;i>=t;i-=o)s=yt(i/o|0,e[i],e[i+1],s);return s&&Ee(s,s.next)&&(Ae(s),s=s.next),s}function ce(e,t=e){const n=t===e;let o=e,a;do a=!1,o!==o.next&&(Fe.size===0||!Fe.has(o))&&(Ee(o,o.next)||I(o.prev,o,o.next)===0)?((n||o===t)&&(t=o.prev),tt=!0,Ae(o),o=o.prev,a=!0):(n||o!==t)&&(o=o.next,a=!n);while(a||o!==t);return t}function nt(e,t,n,o,a){a&&Wn(e,n,o,a);let s=e,i=!1;for(;e.prev!==e.next;){const r=e.prev,c=e.next;if(I(r,e,c)<0&&(a?_n(e,n,o,a):Rn(e))){t.push(r.i,e.i,c.i),Ae(e),e=c,s=c;continue}if(e=c,e===s){if(tt=!1,e=ce(e),tt){s=e;continue}if(!i){e=On(e,t),s=e,i=!0;continue}Pn(e,t,n,o,a);break}}}function Rn(e){const t=e.prev,n=e,o=e.next,a=t.x,s=n.x,i=o.x,r=t.y,c=n.y,u=o.y,h=Math.min(a,s,i),y=Math.min(r,c,u),v=Math.max(a,s,i),l=Math.max(r,c,u);let b=o.next;for(;b!==t;){if(b.x>=h&&b.x<=v&&b.y>=y&&b.y<=l&&!(a===b.x&&r===b.y)&&Ie(a,r,s,c,i,u,b.x,b.y)&&I(b.prev,b,b.next)>=0)return!1;b=b.next}return!0}function _n(e,t,n,o){const a=e.prev,s=e,i=e.next,r=a.x,c=s.x,u=i.x,h=a.y,y=s.y,v=i.y,l=Math.min(r,c,u),b=Math.min(h,y,v),p=Math.max(r,c,u),T=Math.max(h,y,v),D=it(l,b,t,n,o),z=it(p,T,t,n,o);let k=e.prevZ;for(;k&&k.z>=D;){if(k.x>=l&&k.x<=p&&k.y>=b&&k.y<=T&&k!==i&&!(r===k.x&&h===k.y)&&Ie(r,h,c,y,u,v,k.x,k.y)&&I(k.prev,k,k.next)>=0)return!1;k=k.prevZ}let E=e.nextZ;for(;E&&E.z<=z;){if(E.x>=l&&E.x<=p&&E.y>=b&&E.y<=T&&E!==i&&!(r===E.x&&h===E.y)&&Ie(r,h,c,y,u,v,E.x,E.y)&&I(E.prev,E,E.next)>=0)return!1;E=E.nextZ}return!0}function On(e,t){let n=e,o=!1;do{const a=n.prev,s=n.next.next;Gt(a,n,n.next,s,!1)&&Te(a,s)&&Te(s,a)&&(t.push(a.i,n.i,s.i),Ae(n),Ae(n.next),n=e=s,o=!0),n=n.next}while(n!==e);return o?ce(n):n}function Pn(e,t,n,o,a){let s=e;do{let i=s.next.next;for(;i!==s.prev;){if(s.i!==i.i&&Gn(s,i)){let r=Yt(s,i);s=ce(s,s.next),r=ce(r,r.next),nt(s,t,n,o,a),nt(r,t,n,o,a);return}i=i.next}s=s.next}while(s!==e)}let ot=!1;function Cn(e,t,n,o){const a=[];for(let s=0,i=t.length;s<i;s++){const r=t[s]*o,c=s<i-1?t[s+1]*o:e.length,u=Wt(e,r,c,o,!1);u===u.next&&Fe.add(u),a.push($n(u))}a.sort(Bn),Vn(e.length/o,t.length),$t(n,n),ot=!0;for(let s=0;s<a.length;s++)n=In(a[s],n);return ot=!1,ce(n)}function Bn(e,t){return e.x-t.x||e.y-t.y||(e.next.y-e.y)/(e.next.x-e.x)-(t.next.y-t.y)/(t.next.x-t.x)}function In(e,t){const n=Nn(e,t);if(!n)return t;const o=Yt(n,e),a=o.next;return $t(n,a.next),ce(o,o.next),ce(n,n.next)}const jt=16;let P=new Float64Array(0),Be=0;const st=[],at=[];function Vn(e,t){const n=Math.ceil((e+2*t)/jt)+t+2;P.length<n*4&&(P=new Float64Array(n*4)),Be=0}function $t(e,t){let n=e;do{const o=Be++;st[o]=n;let a=1/0,s=1/0,i=-1/0,r=-1/0,c=0;do{const h=n.next;n.z=o,n.x<a&&(a=n.x),n.x>i&&(i=n.x),n.y<s&&(s=n.y),n.y>r&&(r=n.y),h.x<a&&(a=h.x),h.x>i&&(i=h.x),h.y<s&&(s=h.y),h.y>r&&(r=h.y),n=h}while(++c<jt&&n!==t);at[o]=n;const u=o*4;P[u]=a,P[u+1]=s,P[u+2]=i,P[u+3]=r}while(n!==t)}function Un(e,t){const n=e.z*4;t.x<P[n]&&(P[n]=t.x),t.y<P[n+1]&&(P[n+1]=t.y),t.x>P[n+2]&&(P[n+2]=t.x),t.y>P[n+3]&&(P[n+3]=t.y)}function xt(e){let t=at[e];for(;t.prev.next!==t;)t=t.next;return at[e]=t,t}function vt(e){let t=st[e];for(;t.prev.next!==t;)t=t.next;return st[e]=t,t}function Nn(e,t){let n=t;const o=e.x,a=e.y;let s=-1/0,i;if(Ee(e,n))return n;for(let v=0,l=0;v<Be;v++,l+=4){if(a<P[l+1]||a>P[l+3]||P[l]>o||P[l+2]<=s)continue;const b=xt(v);n=vt(v);do{if(n.prev.next===n){if(Ee(e,n.next))return n.next;if(a<=n.y&&a>=n.next.y&&n.next.y!==n.y){const p=n.x+(a-n.y)*(n.next.x-n.x)/(n.next.y-n.y);if(p<=o&&p>s&&(s=p,i=n.x<n.next.x?n:n.next,p===o))return i}}n=n.next}while(n!==b)}if(!i)return null;const r=i.x,c=i.y,u=Math.min(a,c),h=Math.max(a,c);let y=1/0;for(let v=0,l=0;v<Be;v++,l+=4){if(P[l+2]<r||P[l]>o||P[l+3]<u||P[l+1]>h)continue;const b=xt(v);n=vt(v);do{if(n.prev.next===n&&o>=n.x&&n.x>=r&&o!==n.x&&Ie(a<c?o:s,a,r,c,a<c?s:o,a,n.x,n.y)){const p=Math.abs(a-n.y)/(o-n.x);(Te(n,e)||n.y===a&&n.next.y===a&&n.next.x>o)&&(p<y||p===y&&(n.x>i.x||n.x===i.x&&Hn(i,n)))&&(i=n,y=p)}n=n.next}while(n!==b)}return i}function Hn(e,t){return I(e.prev,e,t.prev)<0&&I(t.next,e,e.next)<0}const Z=[];let xe=[],re=new Uint32Array(0),ve=new Uint32Array(0);const ye=new Uint32Array(256);function Wn(e,t,n,o){let a=e,s=0;do a.z=it(a.x,a.y,t,n,o),Z[s++]=a,a=a.next;while(a!==e);jn(s);let i=null;for(let r=0;r<s;r++){const c=Z[r];c.prevZ=i,i&&(i.nextZ=c),i=c}i.nextZ=null}function jn(e){if(e<=32){for(let t=1;t<e;t++){const n=Z[t],o=n.z;let a=t-1;for(;a>=0&&Z[a].z>o;)Z[a+1]=Z[a],a--;Z[a+1]=n}return}re.length<e&&(re=new Uint32Array(e),ve=new Uint32Array(e),xe=new Array(e));for(let t=0;t<e;t++)re[t]=Z[t].z;ze(e,Z,re,xe,ve,0),ze(e,xe,ve,Z,re,8),ze(e,Z,re,xe,ve,16),ze(e,xe,ve,Z,re,24)}function ze(e,t,n,o,a,s){ye.fill(0);for(let r=0;r<e;r++)ye[n[r]>>>s&255]++;let i=0;for(let r=0;r<256;r++){const c=ye[r];ye[r]=i,i+=c}for(let r=0;r<e;r++){const c=n[r],u=ye[c>>>s&255]++;o[u]=t[r],a[u]=c}}function it(e,t,n,o,a){return e=(e-n)*a|0,t=(t-o)*a|0,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e|t<<1}function $n(e){let t=e,n=e;do(t.x<n.x||t.x===n.x&&t.y<n.y)&&(n=t),t=t.next;while(t!==e);return n}function Ie(e,t,n,o,a,s,i,r){return(a-i)*(t-r)>=(e-i)*(s-r)&&(e-i)*(o-r)>=(n-i)*(t-r)&&(n-i)*(s-r)>=(a-i)*(o-r)}function Gn(e,t){const n=Ee(e,t)&&I(e.prev,e,e.next)>0&&I(t.prev,t,t.next)>0;return e.next.i!==t.i&&(n||Te(e,t)&&Te(t,e)&&(I(e.prev,e,t.prev)!==0||I(e,t.prev,t)!==0))&&!Yn(e,t)&&(n||Kn(e,t))}function I(e,t,n){return(t.y-e.y)*(n.x-t.x)-(t.x-e.x)*(n.y-t.y)}function Ee(e,t){return e.x===t.x&&e.y===t.y}function Gt(e,t,n,o,a=!0){const s=I(e,t,n),i=I(e,t,o),r=I(n,o,e),c=I(n,o,t);return(s>0&&i<0||s<0&&i>0)&&(r>0&&c<0||r<0&&c>0)?!0:a?!!(s===0&&Le(e,n,t)||i===0&&Le(e,o,t)||r===0&&Le(n,e,o)||c===0&&Le(n,t,o)):!1}function Le(e,t,n){return t.x<=Math.max(e.x,n.x)&&t.x>=Math.min(e.x,n.x)&&t.y<=Math.max(e.y,n.y)&&t.y>=Math.min(e.y,n.y)}function Yn(e,t){const n=Math.min(e.x,t.x),o=Math.max(e.x,t.x),a=Math.min(e.y,t.y),s=Math.max(e.y,t.y);let i=e;do{const r=i.next;if(i.x>o&&r.x>o||i.x<n&&r.x<n||i.y>s&&r.y>s||i.y<a&&r.y<a){i=r;continue}if(i.i!==e.i&&r.i!==e.i&&i.i!==t.i&&r.i!==t.i&&Gt(i,r,e,t))return!0;i=r}while(i!==e);return!1}function Te(e,t){return I(e.prev,e,e.next)<0?I(e,t,e.next)>=0&&I(e,e.prev,t)>=0:I(e,t,e.prev)<0||I(e,e.next,t)<0}function Kn(e,t){let n=e,o=!1;const a=(e.x+t.x)/2,s=(e.y+t.y)/2;do{const i=n.next;n.y>s!=i.y>s&&a<(i.x-n.x)*(s-n.y)/(i.y-n.y)+n.x&&(o=!o),n=i}while(n!==e);return o}function Yt(e,t){const n=rt(e.i,e.x,e.y),o=rt(t.i,t.x,t.y),a=e.next,s=t.prev;return e.next=t,t.prev=e,n.next=a,a.prev=n,o.next=n,n.prev=o,s.next=o,o.prev=s,o}function yt(e,t,n,o){const a=rt(e,t,n);return o?(a.next=o.next,a.prev=o,o.next.prev=a,o.next=a):(a.prev=a,a.next=a),a}function Ae(e){e.next.prev=e.prev,e.prev.next=e.next,e.prevZ&&(e.prevZ.nextZ=e.nextZ),e.nextZ&&(e.nextZ.prevZ=e.prevZ),ot&&Un(e.prev,e.next)}function rt(e,t,n){return{i:e,x:t,y:n,prev:null,next:null,z:0,prevZ:null,nextZ:null}}function Zn(e,t,n,o){let a=0;for(let s=t,i=n-o;s<n;s+=o)a+=(e[i]-e[s])*(e[s+1]+e[i+1]),i=s;return a}Object.assign(window,{BABYLON:{...gn,...mn},earcut:Dn});(()=>{const e=`
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
    }`})();const Xn=new WeakMap;function qn(e){return Xn.get(e)?.rtt??null}const Jn=450,wt=["texScale","texAmount","blendMode","stains","blooms","dark","wetEdge","granulation","palette","paletteMode","paper","paperEdge"],bt=["ink","width","colorInk","nearDist","farInk","wobble","darkness","outline","paperEdge","inkOpacity","inkBlend","paintOver"],kt={"blue-grey":[.16,.17,.22],pencil:[.42,.35,.29],sepia:[.35,.24,.16],graphite:[.3,.3,.32]},Qn={"History Lines pencil":{time:1,inkColor:"pencil",darkness:0,inkOpacity:.8,inkBlend:1,paintOver:0,wash:0,wobble:.3,ink:.75,width:.8,outline:1.3,colorInk:0,nearDist:14,farInk:.35,wetEdge:0,stains:0,dark:0,blooms:0,granulation:0,texAmount:0,texScale:4,blendMode:0,palette:0,paletteMode:0,paper:0,paperEdge:0}};function eo(e,t,n){const o=new BABYLON.RawTexture(new Uint8Array([255,255,255,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),a=new BABYLON.RawTexture(new Uint8Array([0,0,0,255]),1,1,BABYLON.Engine.TEXTUREFORMAT_RGBA,e),s=e.enableGeometryBufferRenderer(),i=e.onBeforeRenderObservable.add(()=>{e.geometryBufferRenderer&&(e.geometryBufferRenderer.renderList=e.meshes.filter(k=>k.name!=="sky-cloud"&&!(k.metadata&&k.metadata.noGBuffer)))}),r=s.getGBuffer().textures,c=r[s.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)],u=r[s.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)],h=k=>new BABYLON.Vector2(1/k.width,1/k.height),y=new BABYLON.Matrix,v=["invView","tanHalf","resolution","skyDepth"],l=["depthSampler","normalSampler"];function b(k,E){t.getViewMatrix().invertToRef(y);const N=Math.tan(t.fov/2);k.setMatrix("invView",y),k.setVector2("tanHalf",new BABYLON.Vector2(N*E.width/E.height,N)),k.setVector2("resolution",new BABYLON.Vector2(E.width,E.height)),k.setFloat("skyDepth",Jn),k.setTexture("depthSampler",c),k.setTexture("normalSampler",u)}const p=new BABYLON.PostProcess("wash","wash",["texel","radius",...v],l,1,t);p.onApply=k=>{b(k,p),k.setVector2("texel",h(p)),k.setFloat("radius",n.num("wash"))};const T=new BABYLON.PostProcess("watercolor","watercolor",["texel","useTex",...wt,...v],["aquarelSampler",...l],1,t);T.onApply=k=>{b(k,T),k.setVector2("texel",h(T));const E=n.texture();k.setFloat("useTex",E?1:0),k.setTexture("aquarelSampler",E||o),wt.forEach(N=>k.setFloat(N,n.num(N)))};const D=new BABYLON.PostProcess("ink","ink",["texel","inkColor",...bt,...v],["washSampler","animeSampler",...l],1,t);D.onApply=k=>{b(k,D),k.setTextureFromPostProcessOutput("washSampler",p),k.setTexture("animeSampler",qn(e)||a),k.setVector2("texel",h(D)),bt.forEach(E=>k.setFloat(E,n.num(E))),k.setColor3("inkColor",BABYLON.Color3.FromArray(kt[n.inkColor()]||kt["blue-grey"]))};const z=[p,T,D];return{dispose(){z.forEach(k=>k.dispose(t)),e.onBeforeRenderObservable.remove(i),e.disableGeometryBufferRenderer(),o.dispose(),a.dispose()}}}const Y={sky:380,bg:70,mid:22,fg:7,near:3.5},W={x:0,y:1.6,z:0,fov:50},He=-2,Kt=16/9,Zt=.42,We=1.6,to=3,no=e=>to*ie(e),oo=(e,t)=>t*e,so=(e,t,n,o)=>oo(e,t)-(1-o)*n,Xt=e=>1010+(Math.log10(2e3)-Math.log10(Math.max(e,1)))*290,ao=999,io=1e3,ro=.02,qt=2,lo=120,Jt=.05,ne=e=>e>Math.PI?e*Math.PI/180:e,ie=(e,t=W.fov,n=Kt)=>2*e*Math.tan(ne(t)/2)*n;function Mt(e){return e<4.9?"near":e<12.4?"fg":e<39.2?"mid":"bg"}const St=e=>e.z??Y[e.depth],co=e=>Math.min(1,Math.max(0,(e-Y.mid)/(Y.bg-Y.mid)));function we(e,t,n,o=0){const a=t.depth,s=St(t)-n*Jt,i=ie(s),r=a==="sky"?n*2+1:Xt(s);if(e.layer==="sky"){const p=i*We,T=p/Kt,D=-T*.12;if(e.tileable_x)return{x:0,y:D,z:s,w:p,h:T,uRepeat:p/(T*(e.w/e.h)),alphaIndex:r,rotation:0};const z=Math.max(p/e.w,T/e.h);return{x:0,y:D,z:s,w:e.w*z,h:e.h*z,uRepeat:1,alphaIndex:r,rotation:0}}const c=e.layer==="bg"&&!e.tileable_x?i*We*e.h/e.w:0,u=Math.max(e.height_m*(t.scale??1),c),h=u*(e.w/e.h),y=e.tileable_x?Math.max(h,i*We):h,v=e.tileable_x?0:((t.x??.5)-.5)*i,l=e.layer==="bg"?a==="bg"?1:0:co(St(t)),b=a==="sky"?s*Math.tan(ne(W.fov)/2)*.45:l*o;return{x:v,y:b+(t.y??0),z:s,w:y,h:u,uRepeat:e.tileable_x?y/h:1,alphaIndex:r,rotation:t.rotation??0}}function ho(e,t,n=0,o=Zt,a=He){const s=.5/Math.tan(ne(W.fov)/2),i=.5+s*Math.tan(-a*Math.PI/180),r=Y.bg-n*Jt,c=W.y+(i-o)*r/s;return Math.round((c-t*(1-e))*10)/10}const De=e=>e-uo,uo=.002,Ft={linear:e=>e,in:e=>1-Math.cos(e*Math.PI/2),out:e=>Math.sin(e*Math.PI/2),inOut:e=>-(Math.cos(Math.PI*e)-1)/2},Qt=(e,t)=>(Ft[e??"inOut"]??Ft.inOut)(Math.min(1,Math.max(0,t))),be=(e,t,n)=>e+(t-e)*n,en=e=>e.dur_s??(e.camera&&bo(e)||e.est_s||8);function tn(e,t){const n=[e.camera,...e.camera_more??[]].filter(Boolean),o=[...n].reverse().find(a=>(a.at_s??0)<=t)??n[0]??null;return{cam:o,t:o?t-(o.at_s??0):t}}function nn(e,t,n){if(!e)return{...W,fov:ne(W.fov)};const o=Qt(e.ease,n>0?t/(e.dur_s??n):1),a={...W,...e.from},s={...a,...e.to};return{x:be(a.x,s.x,o),y:be(a.y,s.y,o),z:be(a.z,s.z,o),fov:be(ne(a.fov),ne(s.fov),o)}}const fo=["x","y","z","scale","opacity","rotation"];function pe(e,t){const n={z:e.z,x:e.x??.5,y:e.y??0,scale:e.scale??1,opacity:e.opacity??1,rotation:e.rotation??0},o=e.keys??[];if(!o.length)return n;const a={...n};for(const s of fo){const i=o.filter(v=>v[s]!==void 0).sort((v,l)=>v.t-l.t);if(!i.length)continue;const r=i[0],c=i[i.length-1];if(t<=r.t){a[s]=r[s];continue}if(t>=c.t){a[s]=c[s];continue}const u=i.findIndex(v=>v.t>t),h=i[u-1],y=i[u];a[s]=be(h[s],y[s],Qt("inOut",(t-h.t)/(y.t-h.t)))}return a}const po={none:0,sway:1,drift:2,ripple:3,flicker:4};function mo(e,t){const n=typeof t.motion=="string"?{kind:t.motion}:t.motion??{};return{kind:n.kind??e.motion??"none",amount:n.amount??1,speed:n.speed??1}}const go=.25,xo=2e3,vo=250,fe={downFps:50,upFps:58,upWindows:3,upAfterChangeMs:2e4,upEveryMs:6e4,lockFlips:2},Et={notches:0,fast:0,lastChange:-1/0,lastUp:-1/0,lastDir:0,flips:0,locked:!1};function yo(e,t,n,o){const a=r=>{const c=e.lastDir&&e.lastDir!==r?e.flips+1:e.flips;return{...e,notches:e.notches+r,fast:0,lastChange:n,lastDir:r,flips:c,lastUp:r===-1?n:e.lastUp,locked:e.locked||c>=fe.lockFlips&&r===1}};if(t<fe.downFps)return o?a(1):{...e,fast:0};if(t<fe.upFps)return{...e,fast:0};const s=e.fast+1;return e.notches>0&&!e.locked&&s>=fe.upWindows&&n-e.lastChange>=fe.upAfterChangeMs&&n-e.lastUp>=fe.upEveryMs?a(-1):{...e,fast:s}}function wo(e,t,n,o){const a=Math.min(t,n/Math.max(e,1));return Math.max(Math.min(1,t),a-o*go)}function bo(e){return[e.camera,...e.camera_more??[]].reduce((t,n)=>n?Math.max(t,(n.at_s??0)+(n.dur_s??0)):t,0)}const Tt={breath_m:.05,breath_s:7},ko=1.5;function Mo(e,t,n={}){const o=n.breath_m??Tt.breath_m,a=2*Math.PI/Math.max(.5,n.breath_s??Tt.breath_s),s=Math.min(1,t/ko),i=s*s*(3-2*s);return{...e,x:e.x+o*i*Math.sin(a*t),y:e.y+o*.5*i*Math.sin(2*a*t)}}async function So(e){const t=await fetch(e);if(!t.ok)throw new Error(`library ${e}: HTTP ${t.status}`);const n=await t.json();if(!Array.isArray(n.assets))throw new Error(`library ${e}: no assets list`);return{...n,base:new URL(".",new URL(e,location.href)).href}}const Fo=e=>(Array.isArray(e)?e:e.split(/[\s,]+/)).map(t=>t.trim().toLowerCase()).filter(Boolean);function Me(e,t,n){if(t.asset){const i=e.assets.find(r=>r.id===t.asset);if(i)return i}const o=Fo(t.need??t.asset??"");if(!o.length)return null;let a=null,s=[0,0,0];for(const i of[...e.assets].sort((r,c)=>r.id.localeCompare(c.id))){const r=o.filter(u=>i.tags.some(h=>h.toLowerCase()===u)).length;if(!r)continue;const c=[r,n&&i.layer===n?1:0,i.qa?.score??0];(!a||c[0]>s[0]||c[0]===s[0]&&(c[1]>s[1]||c[1]===s[1]&&c[2]>s[2]))&&(a=i,s=c)}return a}const ke="#f6f5ee",Eo=.22,To=(e,t)=>e.layer==="bg"?t.feather??Eo:0,je=.6,on=12;function Ao(e,t){const n=t.paper??ke,o=e.ground;if(o&&o.startsWith("#"))return{kind:"paper",colour:o};const a=t.assets.filter(i=>i.layer==="ground");if(!o)return a.length?{kind:"asset",asset:[...a].sort((i,r)=>i.id.localeCompare(r.id))[0]}:{kind:"paper",colour:n};const s=Me({...t,assets:a},{asset:o},"ground");return s?{kind:"asset",asset:s}:{kind:"paper",colour:n,reason:`no ground for ${o}`}}function zo(e,t,n,o=.08){return sn(e,t,n,1-o,1)}function sn(e,t,n,o,a){const s=Math.max(0,Math.floor(n*o)),i=Math.min(n,Math.max(s+1,Math.ceil(n*a))),r=[[],[],[]],c=Math.max(1,Math.floor(t*(i-s)/2e4));for(let h=s*t;h<i*t;h+=c){const y=h*4;e[y+3]<200||(r[0].push(e[y]),r[1].push(e[y+1]),r[2].push(e[y+2]))}if(!r[0].length)return null;const u=h=>{const y=[...h].sort((v,l)=>v-l);return y[y.length>>1]/255};return[u(r[0]),u(r[1]),u(r[2])]}const Se=32,Lo=(e,t,n)=>Array.from({length:Se},(o,a)=>sn(e,t,n,a/Se,(a+1)/Se)),Do=(e,t)=>e[Math.min(Se-1,Math.max(0,Math.floor((1-t)*Se)))]??null;function Ro(e,t,n){const o=[],a=Math.max(1,Math.floor(t*n/6e4));for(let s=0;s<t*n;s+=a){const i=s*4;if(e[i+3]<230)continue;const r=(.299*e[i]+.587*e[i+1]+.114*e[i+2])/255;r<.45&&o.push(r)}return o.length<20?null:(o.sort((s,i)=>s-i),o[o.length>>1])}function _o(e,t,n){const o=[];for(let a=0;a<t;a++)for(let s=0;s<n;s++)if(e[(s*t+a)*4+3]>128){o.push(s/n);break}return o.length?(o.sort((a,s)=>a-s),o[o.length>>1]):0}function Oo(e,t,n){for(let o=0;o<n;o++){let a=0;for(let s=0;s<t;s++)e[(o*t+s)*4+3]>128&&a++;if(a/t>.5)return o/n}return 0}const Po=1.6,Co=.12;function Bo(e,t,n,o){const a=e.layer==="figure",s=a?Math.min(t*.55,n*.3):Math.min(t*.8,n*.55,6),i=s*Co*o/Po;return a?{w:s,d:Math.min(i,s*.5)}:{w:s,d:Math.min(Math.max(i,s*.3),s*3)}}const Io=(e,t)=>e==="none"?null:e||[...t.assets].filter(n=>n.layer==="near_ground").map(n=>n.id).sort()[0]||null,Re=e=>{const t=parseInt(e.replace("#","").padEnd(6,"0").slice(0,6),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]},ft=`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`,an=ft;Q.ShadersStore.stageGroundVertexShader=`
  precision highp float;
  attribute vec3 position;
  uniform mat4 world, viewProjection;
  varying vec3 vW;
  void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;Q.ShadersStore.stageGroundFragmentShader=`
  precision highp float;
  varying vec3 vW;
  uniform sampler2D tex, nearTex;
  uniform float useTex, tile, grain, fadeNear, fadeFar, detail, vary, mixTile;
  uniform vec3 base, horizonTint, camPos;
  uniform float useNear, nearTop, nearSpan;
  uniform mat4 nearVP;          // the house camera: the near band is projected from where it was painted
  ${ft}
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
  }`;Q.ShadersStore.stageStainVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;Q.ShadersStore.stageStainFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float opacity, seed;
  ${ft}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float ang = atan(p.y, p.x);
    // a painted stain: ragged rim, uneven pigment, darkest just under the foot
    float rim = 0.78 + 0.22 * vnoise(vec2(ang * 2.2 + seed, seed));
    float r = length(p) / rim;
    float a = (1.0 - smoothstep(0.25, 1.0, r)) * (0.7 + 0.3 * fbm(vUV * 6.0 + seed)) * opacity;
    gl_FragColor = vec4(vec3(0.27, 0.23, 0.18) * a, a);
  }`;const Vo=e=>e?te.WRAP_ADDRESSMODE:te.MIRROR_ADDRESSMODE;function Uo(e){const t=ut.CreateGround("ground",{width:2400,height:2400},e),n=new Ne("ground",e,"stageGround",{attributes:["position"],uniforms:["world","viewProjection","useTex","tile","grain","fadeNear","fadeFar","detail","vary","mixTile","useNear","nearTop","nearSpan","nearVP","base","horizonTint","camPos"],samplers:["tex","nearTex"],needAlphaBlending:!0}),o=new Nt(new Uint8Array([255,255,255,255]),1,1,me.TEXTUREFORMAT_RGBA,e);n.setTexture("tex",o).setTexture("nearTex",o),n.setFloat("detail",1).setFloat("vary",0).setFloat("mixTile",0).setFloat("useNear",0);let a=on,s=1;return t.material=n,t.metadata={noGBuffer:!0},t.alphaIndex=ao,n.forceDepthWrite=!0,t.isPickable=!1,{mesh:t,set(i){i.tex&&(i.tex.wrapU=te.WRAP_ADDRESSMODE,i.tex.wrapV=te.WRAP_ADDRESSMODE),n.setTexture("tex",i.tex??o),a=i.tile,n.setFloat("useTex",i.tex?1:0).setFloat("tile",a*s).setFloat("grain",i.grain).setFloat("fadeNear",i.fadeNear).setFloat("fadeFar",i.fadeFar).setVector3("base",L.FromArray(i.base)).setVector3("horizonTint",L.FromArray(i.tint))},follow(i){n.setVector3("camPos",i)},live(i){s=i.tileScale,n.setFloat("detail",i.detail).setFloat("vary",i.vary).setFloat("mixTile",i.mixTile).setFloat("tile",a*s)},near(i){n.setFloat("useNear",i?1:0),i&&(i.tex.wrapU=Vo(i.tileable),i.tex.wrapV=te.CLAMP_ADDRESSMODE,n.setTexture("nearTex",i.tex).setMatrix("nearVP",i.vp).setFloat("nearTop",i.top).setFloat("nearSpan",i.span))}}}let No=0;function At(e,t,n,o,a){const s=ut.CreatePlane(`stain${a?"-cast":""}:${e.name}`,{width:t,height:a?a.length:n},o);if(s.rotation.x=Math.PI/2,a){const[r,c]=a.dir,u=Math.hypot(r,c)||1;s.rotation.y=Math.atan2(r/u,c/u),s.position.set(r/u*a.length*.42,.015,c/u*a.length*.42)}else s.position.set(0,.02,-n*.18);s.parent=e;const i=new Ne(s.name,o,"stageStain",{attributes:["position","uv"],uniforms:["worldViewProjection","opacity","seed"],needAlphaBlending:!0});return i.alphaMode=me.ALPHA_PREMULTIPLIED,i.disableDepthWrite=!0,i.backFaceCulling=!1,i.setFloat("seed",No++*7.31%97).setFloat("opacity",0),s.material=i,s.metadata={noGBuffer:!0},s.isPickable=!1,{mesh:s,setOpacity:r=>{i.setFloat("opacity",r),s.isVisible=r>.001}}}Q.ShadersStore.stagePuffVertexShader=`
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;Q.ShadersStore.stagePuffFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform float alpha, seed;
  ${an}
  void main(void) {
    vec2 p = vUV * 2.0 - 1.0;
    float r = length(p) / (0.75 + 0.25 * fbm(p * 2.0 + seed));
    float a = (1.0 - smoothstep(0.35, 1.0, r)) * alpha;
    vec3 c = mix(vec3(0.62, 0.6, 0.58), vec3(0.8, 0.78, 0.74), smoothstep(0.0, 0.8, r));
    gl_FragColor = vec4(c * a, a);
  }`;Q.ShadersStore.stageBirdFragmentShader=`
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
  }`;function rn(e,t,n,o){const a=ut.CreatePlane(e,{size:1},n),s=new Ne(e,n,{vertex:"stagePuff",fragment:t},{attributes:["position","uv"],uniforms:["worldViewProjection","alpha","seed","flap"],needAlphaBlending:!0});return s.alphaMode=me.ALPHA_PREMULTIPLIED,s.disableDepthWrite=!0,s.backFaceCulling=!1,a.material=s,a.billboardMode=Ht.BILLBOARDMODE_ALL,a.alphaIndex=o,a.metadata={noGBuffer:!0},a.isPickable=!1,{mesh:a,mat:s}}const ln=9,Ho=9;function Wo(e,t,n,o){const a=Array.from({length:ln},(s,i)=>{const r=rn(`smoke:${i}`,"stagePuff",e,o);return r.mat.setFloat("seed",i*3.7),r});return{update(s,i){a.forEach(({mesh:r,mat:c},u)=>{const h=jo(s,u),y=n*(.6+3.2*h);r.scaling.setAll(y),r.position.set(t.x+n*1.6*h*h+.15*n*Math.sin(u*2.1+s*.3),t.y+n*(.4+7*h),t.z),c.setFloat("alpha",i*.7*Math.sin(Math.PI*h)),r.isVisible=i>.001})},dispose(){a.forEach(({mesh:s,mat:i})=>{i.dispose(),s.dispose()})}}}const jo=(e,t)=>((e/Ho+t/ln)%1+1)%1,$e=40,zt=16;function $o(e){const t=(e%$e+$e)%$e;return t<zt?t/zt:null}function Go(e,t,n,o){const a=Array.from({length:6},(s,i)=>rn(`bird:${i}`,"stageBird",e,o));return{update(s,i){const r=$o(s),c=Math.round(2+i*4);a.forEach(({mesh:u,mat:h},y)=>{if(u.isVisible=i>.001&&r!==null&&y<c,!u.isVisible||r===null)return;const v=y*.025;u.position.set((r-v-.5)*n*1.2,22+3*Math.sin(y*1.7)+4*r,t+y*1.5),u.scaling.setAll(3.2),h.setFloat("alpha",.85*Math.min(1,i*2)).setFloat("flap",Math.sin(s*7+y*1.3))})},dispose(){a.forEach(({mesh:s,mat:i})=>{i.dispose(),s.dispose()})}}}const Lt=["fire","hearth","chimney","smoke"],Yo=e=>e.id.split(/[-_]/).some(t=>Lt.includes(t))||e.tags.some(t=>Lt.includes(t.toLowerCase())),Ge=e=>e[0].toUpperCase()+e.slice(1),Ko=e=>({fade:`lineFade${Ge(e)}`,thin:`lineThin${Ge(e)}`,haze:`haze${Ge(e)}`}),Ve={sheetPaper:1,sheetGrain:.7,sheetWash:.12,sheetPatches:.5,lineBrown:.2,groundDetail:.45,groundVary:.6,groundMix:.7,groundScale:2.5,nearFar:16,housePitch:He,lineInk:.12,lineNorm:.8,lineFadeSky:.3,lineThinSky:0,hazeSky:0,lineFadeBg:.1,lineThinBg:.1,hazeBg:.12,lineFadeMid:.02,lineThinMid:.05,hazeMid:.04,lineFadeFg:0,lineThinFg:0,hazeFg:0,lineFadeNear:0,lineThinNear:0,hazeNear:0,bandHeight:.15,bandFade:.5,edgeSoft:.8,grounding:.8,grassOverlap:.6,sunLight:.6,castShadow:.55,cloudDrift:.4,smoke:.6,birds:.4},Zo=[1.05,1,.9],Xo=[.88,.93,1.05],qo=.35;function Jo(e,t,n,o){const a=t==="sky";return{edgeSoft:a?0:H(e,"edgeSoft"),footM:t==="standing"?qo:0,grounding:t==="figure"?0:H(e,"grounding"),grass:t==="figure"?0:H(e,"grassOverlap"),light:a?0:H(e,"sunLight")*(t==="strip"?.5:1),sunSide:n>0?-1:1,drift:a?H(e,"cloudDrift"):0,footTint:o}}const cn=[.93,.86,.74],Dt=e=>({paper:H(e,"sheetPaper"),grain:H(e,"sheetGrain"),patches:H(e,"sheetPatches"),wash:H(e,"sheetWash"),washColour:cn}),Qo={groundScale:[.5,5,.1],nearFar:[4,40,.5],bandHeight:[.02,.6,.01],bandFade:[0,3,.05],housePitch:[-6,12,.5],lineInk:[.05,.6,.01]},es=Object.fromEntries(Object.keys(Ve).map(e=>[e,Qo[e]??(e.startsWith("lineThin")?[0,2,.05]:[0,1,.01])])),ee=(e,t)=>H(e,t),H=(e,t)=>{const n=Number(e[t]??Ve[t]);return Number.isFinite(n)?n:Ve[t]};function Ye(e,t){const n=Ko(t);return{fade:H(e,n.fade),thin:H(e,n.thin),haze:H(e,n.haze),brown:H(e,"lineBrown"),ink:H(e,"lineInk"),norm:H(e,"lineNorm")}}const ts=(e,t,n)=>1+n*(Math.min(2.5,Math.max(.5,t/Math.max(e,.02)))-1),Ke=(e,t,n)=>e/(2*Math.max(t,.01)*Math.tan(n/2)),_e=(e,t,n,o,a)=>{const s=o*(1080/a);return[n/Math.max(e*s,.001),1/Math.max(t*s,.001)]};function ns(e,t,n){const o=new L(W.x,W.y,W.z),a=le.RotationX(e*Math.PI/180),i=le.LookAtLH(o,o.add(L.TransformNormal(new L(0,0,1),a)),L.TransformNormal(L.Up(),a)).multiply(le.PerspectiveFovLH(ne(W.fov),t,.1,2e3));return{vp:i,top:L.TransformCoordinates(new L(0,0,n),i).y}}Q.ShadersStore.stageSheetFragmentShader=`
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float wash;
  uniform vec3 washColour;
  void main(void) {
    gl_FragColor = vec4(texture2D(textureSampler, vUV).rgb * mix(vec3(1.0), washColour, wash), 1.0);
  }`;function os(e,t){const n=new xn("stageSheet","stageSheet",["wash","washColour"],null,1,e);return n.onApply=o=>{o.setFloat("wash",t("sheetWash")).setVector3("washColour",L.FromArray(cn))},n}const ss=`
  const vec3 LINE_BROWN = vec3(0.42, 0.31, 0.22);
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // ink = the dark line pixels of the art (1 on a line, 0 on a wash)
  float inkOf(vec3 s) { return smoothstep(0.5, 0.2, lum(s)); }
  vec3 lineByDepth(vec3 s, float ink, float lineFade, float haze, float lineBrown, vec3 hazeTint) {
    s = mix(s, LINE_BROWN * (0.55 + lum(s)), ink * lineBrown);   // black ink becomes the book's brown pencil
    s = mix(s, mix(s, hazeTint, 0.75), ink * lineFade);         // lighter: the line goes toward the air's colour
    return mix(s, hazeTint, haze);                              // aerial perspective over the whole picture
  }`,as=`
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
  }`;Q.ShadersStore.stageLayerVertexShader=`
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
  }`;Q.ShadersStore.stageLayerFragmentShader=`
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
  ${an}
  ${ss}
  ${as}
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
  }`;const Ze=new Map,hn=new Map,dn=new Map,un=new Map,fn=new Map,lt=new Map;function Oe(e,t){const n=Ze.get(e);if(n)return n;const o=new Promise((a,s)=>{const i=new Image;i.crossOrigin="anonymous",i.onerror=()=>s(new Error(`layer image ${e} did not load`)),i.onload=()=>{const r=document.createElement("canvas");r.width=i.naturalWidth,r.height=i.naturalHeight;const c=r.getContext("2d",{willReadFrequently:!0});c.drawImage(i,0,0);const u=c.getImageData(0,0,r.width,r.height).data,h=zo(u,r.width,r.height);h&&hn.set(e,h),lt.set(e,Lo(u,r.width,r.height)),dn.set(e,Oo(u,r.width,r.height)),un.set(e,_o(u,r.width,r.height));const y=Ro(u,r.width,r.height);y!==null&&fn.set(e,y);for(let l=0;l<u.length;l+=4){const b=u[l+3]/255;u[l]=Math.round(u[l]*b),u[l+1]=Math.round(u[l+1]*b),u[l+2]=Math.round(u[l+2]*b)}const v=new Nt(u,r.width,r.height,me.TEXTUREFORMAT_RGBA,t,!0,!1,te.TRILINEAR_SAMPLINGMODE);v.anisotropicFilteringLevel=8,v.wrapV=te.CLAMP_ADDRESSMODE,a(v)},i.src=e});return Ze.set(e,o),o.catch(()=>Ze.delete(e)),o}const Xe=24;function is(e,t,n,o,a){const[s,i]=t.anchor??[.5,1],r=[],c=[],u=[];for(let y=0;y<=Xe;y++){const v=y/Xe;for(const l of[0,1])r.push((l-s)*n,(i-v)*o,0),c.push(l,v);if(y<Xe){const l=y*2;u.push(l,l+2,l+1,l+1,l+2,l+3)}}const h=new Ht(e,a);return Object.assign(new vn,{positions:r,uvs:c,indices:u}).applyToMesh(h),h}let rs=0;function Rt(e,t,n,o,a,s){const i=is(`layer:${e.id}`,e,n,o,s),r=new Ne(`layer:${e.id}`,s,"stageLayer",{attributes:["position","uv"],uniforms:["worldViewProjection","time","kind","amount","speed","phase","height","width","opacity","uRepeat","feather","featherTint","groundLine","lineFade","lineThin","haze","lineBrown","inkMul","pxUV","hazeTint","paper","grain","patches","wash","washColour","grainUV","bottomFade","edgeSoft","footM","grounding","grass","light","sunSide","drift","footTint","sunColour","shadeColour"],samplers:["tex"],needAlphaBlending:!0});t.wrapU=a!==1?te.WRAP_ADDRESSMODE:te.CLAMP_ADDRESSMODE,r.setTexture("tex",t),r.alphaMode=me.ALPHA_PREMULTIPLIED,r.disableDepthWrite=!0,r.backFaceCulling=!1;const c=rs++*2.39996%(Math.PI*2),u=e.anchor?.[1]??1;return r.setFloat("phase",c).setFloat("height",o*u).setFloat("width",n).setFloat("uRepeat",a).setFloat("opacity",1),r.setFloat("kind",0).setFloat("amount",1).setFloat("speed",1).setFloat("time",0).setFloat("feather",0),r.setFloat("groundLine",-1).setFloat("lineFade",0).setFloat("lineThin",0).setFloat("haze",0).setFloat("lineBrown",0).setFloat("inkMul",1).setFloat("paper",0).setFloat("grain",0).setFloat("patches",0),r.setFloat("edgeSoft",0).setFloat("bottomFade",0).setFloat("footM",0).setFloat("grounding",0).setFloat("grass",0).setFloat("light",0).setFloat("sunSide",1).setFloat("drift",0),i.material=r,i.metadata={noGBuffer:!0,painted:!0},i.isPickable=!1,{mesh:i,material:r,setMotion:h=>{r.setFloat("kind",po[h.kind]??0).setFloat("amount",h.amount).setFloat("speed",h.speed)},setOpacity:h=>{r.setFloat("opacity",h),i.isVisible=h>.001},setLine:(h,y,v,l)=>{r.setFloat("inkMul",y).setFloat("lineFade",h.fade).setFloat("lineThin",h.thin).setFloat("haze",h.haze).setFloat("lineBrown",h.brown),r.setVector2("pxUV",new gt(v[0],v[1])).setVector3("hazeTint",L.FromArray(l))},setPaper:(h,y)=>{r.setFloat("paper",h.paper).setFloat("grain",h.grain).setFloat("patches",h.patches).setFloat("wash",h.wash),r.setVector3("washColour",L.FromArray(h.washColour)).setVector2("grainUV",new gt(y[0],y[1]))},setBottomFade:h=>{r.setFloat("bottomFade",h)},setAlive:h=>{r.setFloat("edgeSoft",h.edgeSoft).setFloat("footM",h.footM).setFloat("grounding",h.grounding).setFloat("grass",h.grass).setFloat("light",h.light).setFloat("sunSide",h.sunSide).setFloat("drift",h.drift),r.setVector3("footTint",L.FromArray(h.footTint)).setVector3("sunColour",L.FromArray(Zo)).setVector3("shadeColour",L.FromArray(Xo))},setGroundLine:h=>{r.setFloat("groundLine",h)},setFeather:(h,y)=>{r.setFloat("feather",Math.max(0,Math.min(1,h))),y&&r.setVector3("featherTint",L.FromArray(y))}}}const ct={...Qn["History Lines pencil"],paper:.35,granulation:.2,...Ve},ls=new bn(.937,.914,.863,1),cs=.7,hs=(e,t,n)=>e.map((o,a)=>o+(t[a]-o)*n);class ds{constructor(t,n){this.canvas=t,this.lib=n,this.engine=new yn(t,!0,{preserveDrawingBuffer:!0,stencil:!0},!0),this.scene=new wn(this.engine),this.scene.clearColor=ls,this.camera=new kn("house",new L(0,1.6,0),this.scene),this.camera.rotation.set(He*Math.PI/180,0,0),this.camera.minZ=.1,this.camera.maxZ=2e3,new Mn("sky",new L(0,1,0),this.scene).intensity=.7,new Sn("sun",this.sunDir,this.scene).intensity=1.2,this.sceneLib=n,this.ground=Uo(this.scene),this.ground.set(this.groundLook(null,null,n)),this.birds=Go(this.scene,_t,ie(_t),fs),eo(this.scene,this.camera,{num:o=>Number(this.look[o]??0),inkColor:()=>String(this.look.inkColor??"pencil"),texture:()=>null}),os(this.camera,o=>Number(this.look[o]??0)),this.fit(),window.addEventListener("resize",()=>this.fit())}engine;scene;camera;ground;built=[];horizonTint=Re(ke);strip=null;nearTex=null;bands=[];smoke=[];birds;footTint=Re(ke);nearAsset=null;hazeTint=Re(ke);sceneLib;buildToken=0;look={...ct};missed=new Map;get misses(){return[...this.missed].flatMap(([t,n])=>n.map(o=>({scene:t,...o})))}renderCap=1920;tier=Et;get notches(){return this.tier.notches}set notches(t){this.tier={...this.tier,notches:t,fast:0,lastChange:performance.now()}}adaptive=!0;window={start:0,frames:0,last:0};fit(){this.engine.setHardwareScalingLevel(1/this.scaleAt(this.tier.notches)),this.engine.resize()}scaleAt(t){const n=Math.max(this.canvas.clientWidth,this.canvas.clientHeight,1);return wo(n,window.devicePixelRatio||1,this.renderCap,t)}setRenderCap(t){this.renderCap=t,this.tier=Et,this.window.start=0,this.fit()}tick(t){const n=this.window,o=document.hidden||n.last&&t-n.last>vo;if(n.last=t,!n.start||o){Object.assign(n,{start:t,frames:0});return}if(n.frames++,t-n.start<xo)return;const a=n.frames*1e3/(t-n.start);if(Object.assign(n,{start:t,frames:0}),!this.adaptive)return;const s=this.tier.notches;this.tier=yo(this.tier,a,t,this.scaleAt(s+1)<this.scaleAt(s)),this.tier.notches!==s&&this.fit()}setLook(t){this.look={...ct,...t??{}}}groundPoint(t,n){const o=Y[n];return new L((t-.5)*ie(o),0,o)}async build(t,n=this.lib){const o=++this.buildToken,a=[],s=[];t.set.sky&&s.push({layer:{asset:t.set.sky,depth:"sky"},order:0,index:-1});const i={sky:1};t.set.layers.forEach((M,O)=>{const G=M.depth;i[G]=i[G]??0,s.push({layer:M,order:i[G]++,index:O})});const r=[];await Promise.all(s.map(async({layer:M,order:O,index:G})=>{const V=Me(n,M,M.depth);if(!V){r.push({need:M.need??M.asset,reason:"no match"});return}let oe;try{oe=await Oe(n.base+V.file,this.scene)}catch{r.push({need:M.need??M.asset,reason:`file did not load: ${V.file}`});return}if(o!==this.buildToken)return;const R=we(V,M,O),j=Rt(V,oe,R.w,R.h,R.uRepeat,this.scene);j.mesh.position.set(R.x,R.y,R.z),j.mesh.alphaIndex=M.flat?io:R.alphaIndex,M.flat&&(j.mesh.rotation.x=Math.PI/2),j.mesh.isVisible=!1;let se,J;if(qe.includes(M.depth)&&!V.tileable_x&&!M.flat){const X=Bo(V,R.w,R.h,R.z);se=At(j.mesh,X.w,X.d,this.scene),se.mesh.alphaIndex=De(R.alphaIndex),J=At(j.mesh,X.w,X.d,this.scene,{dir:[this.sunDir.x,this.sunDir.z],length:R.h*ps(this.sunDir)}),J.mesh.alphaIndex=De(R.alphaIndex)}a.push({layer:M,index:G,builtScale:M.scale??1,handle:j,asset:V,order:O,stain:se,cast:J,ink:fn.get(n.base+V.file)})}));const c=Ao(t.set,n);let u=null,h=null;const y=Io(t.set.near,n),v=y?Me(n,{asset:y}):null;if(t.set.near&&!v&&r.push({need:t.set.near,reason:"no near band"}),v)try{h=await Oe(n.base+v.file,this.scene)}catch{r.push({need:t.set.near,reason:`file did not load: ${v.file}`})}if(c.kind==="asset")try{u=await Oe(n.base+c.asset.file,this.scene)}catch{r.push({need:t.set.ground??"ground",reason:`file did not load: ${c.asset.file}`})}else c.reason&&r.push({need:t.set.ground,reason:c.reason});const l=a.filter(M=>M.asset.layer==="bg").sort((M,O)=>M.index-O.index)[0],b=l?{top:dn.get(n.base+l.asset.file)??0,h:we(l.asset,l.layer,l.order).h,order:l.order}:null,p=a.find(M=>M.index===-1),T=p&&we(p.asset,p.layer,p.order),D=p&&T?Do(lt.get(n.base+p.asset.file)??[],(W.y-T.y)/T.h):null,z=l?hn.get(n.base+l.asset.file)??null:t.set.groundBands?.length?null:D,k=await this.loadBands(t,n),E=M=>M.forEach(O=>{O.stain?.mesh.material?.dispose(),O.cast?.mesh.material?.dispose(),O.handle.mesh.dispose(),O.handle.material.dispose()});if(o!==this.buildToken){E(a),k.forEach(M=>{M.handle.mesh.dispose(),M.handle.material.dispose()});return}E(this.built),this.bands.forEach(M=>{M.handle.mesh.dispose(),M.handle.material.dispose()}),this.bands=k,this.built=a,this.sceneLib=n;const N=c.kind==="asset"?(lt.get(n.base+c.asset.file)??[]).filter(M=>!!M):[],C=this.groundLook(c.kind==="asset"?{tex:u,asset:c.asset}:null,z,n,c.kind==="paper"?c.colour:void 0);this.horizonTint=C.tint,this.strip=b,this.smoke.forEach(M=>M.dispose()),this.smoke=a.filter(M=>Yo(M.asset)&&qe.includes(M.layer.depth)&&!M.layer.flat).map(M=>{const O=we(M.asset,M.layer,M.order);return Wo(this.scene,new L(M.handle.mesh.position.x,O.h*.6,O.z),Math.min(Math.max(O.h*.8,.5),3),O.alphaIndex)}),this.footTint=N.length?ms(N):C.base,this.nearTex=h,this.nearAsset=v,this.hazeTint=D??C.tint,this.ground.set(C),this.missed.set(t.id,r),r.length&&console.warn(`stage25d: ${t.id}: missing`,r)}groundLook(t,n,o,a){const s=Re(a??o.paper??ke),i=n??s;return{tex:t?.tex??null,tile:t?.asset.height_m||on,base:hs(s,i,cs),tint:i,fadeNear:Y.fg,fadeFar:Y.bg*.75,grain:t?.tex?.5:1}}rebind(t){this.built.forEach(n=>{n.index>=0&&(n.layer=t.set.layers[n.index])})}pickLayers(t,n){const o=s=>this.built.some(i=>i.handle.mesh===s),a=[];for(const s of this.scene.multiPick(t,n,o)??[]){const i=this.built.find(c=>c.handle.mesh===s.pickedMesh),r=s.getTextureCoordinates();!i||!r||i.index<0||i.asset.tileable_x||["sky","bg","ground"].includes(i.asset.layer)||a.push({index:i.index,asset:i.asset,u:r.x,v:r.y})}return a}layerBox(t){const n=this.built.find(u=>u.index===t);if(!n)return null;const o=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),a=1/this.engine.getRenderWidth(),s=1/this.engine.getRenderHeight(),i=n.handle.mesh.getBoundingInfo().boundingBox.vectorsWorld.map(u=>L.Project(u,le.IdentityReadOnly,this.scene.getTransformMatrix(),o)),r=i.map(u=>u.x*a),c=i.map(u=>u.y*s);return{x0:Math.min(...r),y0:Math.min(...c),x1:Math.max(...r),y1:Math.max(...c),z:n.handle.mesh.position.z}}layerFootY(t){return this.built.find(n=>n.index===t)?.handle.mesh.position.y??0}pointerRay(t,n){const o=this.scene.createPickingRay(t,n,le.Identity(),this.camera);return{origin:[o.origin.x,o.origin.y,o.origin.z],dir:[o.direction.x,o.direction.y,o.direction.z]}}screenOf(t){const n=new L(t[0],t[1],t[2]),o=n.subtract(this.camera.position);if(L.Dot(o,this.camera.getForwardRay().direction)<=.01)return null;const a=this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()),s=L.Project(n,le.IdentityReadOnly,this.scene.getTransformMatrix(),a);return{x:s.x/this.engine.getRenderWidth(),y:s.y/this.engine.getRenderHeight()}}cameraKey(){const t=this.camera;return[t.position.x,t.position.y,t.position.z,t.rotation.x,t.fov,this.engine.getRenderWidth(),this.engine.getRenderHeight()].map(n=>n.toFixed(4)).join(",")}worldXAt(t,n,o){const a=this.scene.createPickingRay(t,n,le.Identity(),this.camera);return a.origin.x+(o-a.origin.z)/a.direction.z*a.direction.x}sunDir=new L(.55,-1,-.3).normalize();depthLine(t){return{...Ye(this.look,t),tint:this.hazeTint}}paper(){return Dt(this.look)}async loadBands(t,n){const o=[];for(const a of t.set.groundBands??[]){const s=Me(n,{asset:a.asset},"ground_band");if(!s){console.warn(`stage25d: ${t.id}: no ground band ${a.asset}`);continue}const i=await Oe(n.base+s.file,this.scene).catch(()=>null);if(!i){console.warn(`stage25d: ${t.id}: ground band ${s.file} did not load`);continue}const r=no(a.z),c=r*s.h/s.w,u=Rt(s,i,r,c,1,this.scene);u.material.depthFunction=me.ALWAYS,u.mesh.position.set(0,0,a.z),u.mesh.alphaIndex=Xt(a.z),o.push({handle:u,z:a.z,w:r,h:c,skyline:un.get(n.base+s.file)??.5})}return o}horizonOf(t){const n=t.set.horizon;return typeof n=="number"?n:this.strip?ho(this.strip.top,this.strip.h,this.strip.order,t.set.land_target??Zt,ee(this.look,"housePitch")):0}pose(t,n,o,a){const s=tn(t,n),i=nn(s.cam,s.t,en(t)),r=a?Mo(i,a.t,a):i;this.camera.position.set(r.x,r.y,r.z),this.camera.fov=r.fov;const c=ee(this.look,"housePitch");this.camera.rotation.x=c*Math.PI/180,this.ground.follow(this.camera.position);const u=l=>ee(this.look,l);this.ground.live({detail:u("groundDetail"),vary:u("groundVary"),mixTile:u("groundMix"),tileScale:u("groundScale")}),this.ground.near(this.nearTex?{tex:this.nearTex,...ns(c,this.engine.getAspectRatio(this.camera),u("nearFar")),span:us,tileable:!!this.nearAsset?.tileable_x}:null);const h=this.engine.getRenderHeight(),y=Dt(this.look),v=ee(this.look,"bandHeight");this.bands.forEach(l=>{l.handle.mesh.position.y=so(l.z,v,l.h,l.skyline);const b=Ke(h,l.z-W.z,ne(W.fov));l.handle.setOpacity(1),l.handle.setBottomFade(Math.min(1,ee(this.look,"bandFade")/l.h)),l.handle.setPaper(y,_e(l.w,l.h,1,b,h)),l.handle.setLine(Ye(this.look,"bg"),1,_e(l.w,l.h,1,b,h),this.hazeTint)}),this.smoke.forEach(l=>l.update(o,ee(this.look,"smoke"))),this.birds.update(o,ee(this.look,"birds"));for(const l of this.built){const b=pe(l.layer,n),p=we(l.asset,{...l.layer,x:b.x,y:b.y,z:b.z,scale:1,rotation:b.rotation},l.order,this.horizonOf(t));l.handle.mesh.position.x=p.x,l.handle.mesh.position.y=l.layer.flat?ro:p.y,l.handle.mesh.position.z!==p.z&&(l.handle.mesh.position.z=p.z,l.layer.flat||(l.handle.mesh.alphaIndex=p.alphaIndex),l.stain&&(l.stain.mesh.alphaIndex=De(p.alphaIndex)),l.cast&&(l.cast.mesh.alphaIndex=De(p.alphaIndex))),l.handle.mesh.rotation.z=-p.rotation*Math.PI/180,l.handle.mesh.scaling.setAll(b.scale/l.builtScale),l.handle.setOpacity(b.opacity),l.handle.setFeather(To(l.asset,l.layer),this.horizonTint),l.asset.layer==="sky"&&l.handle.setGroundLine((r.y-p.y)/(p.h*b.scale));const T=Ke(h,p.z-r.z,this.camera.fov),D=Ye(this.look,l.layer.depth);l.handle.setPaper(y,_e(p.w*b.scale,p.h*b.scale,p.uRepeat,Ke(1080,p.z-W.z,ne(W.fov)),1080)),l.handle.setLine(D,l.ink===void 0?1:ts(l.ink,D.ink,D.norm),_e(p.w*b.scale,p.h*b.scale,p.uRepeat,T,h),this.hazeTint),l.stain?.setOpacity((l.layer.shadow??je)*b.opacity),l.cast?.setOpacity(ee(this.look,"castShadow")*((l.layer.shadow??je)/je)*b.opacity);const z=l.asset.layer==="sky"?"sky":l.asset.layer==="bg"?"strip":l.asset.layer==="figure"?"figure":qe.includes(l.layer.depth)&&!l.layer.flat?"standing":"other";l.handle.setAlive(Jo(this.look,z,this.sunDir.x,this.footTint)),l.handle.setMotion(mo(l.asset,l.layer)),l.handle.material.setFloat("time",o)}}}const us=1.3,_t=110,fs=900,ps=e=>Math.min(1.5,Math.hypot(e.x,e.z)/Math.max(-e.y,.2)),ms=e=>[0,1,2].map(t=>e.reduce((n,o)=>n+o[t],0)/e.length),qe=["mid","fg","near"],gs=16/9,xs=.92;function vs(e,t,n,o){const{cam:a,t:s}=tn(e,o),i=nn(a,s,en(e)),r=Y[t.depth],c=r-i.z;if(c<=.5)return null;const u=pe(t,o),h=(u.x-.5)*ie(r),y=Math.tan(i.fov/2),v=(h-i.x)/(c*y*gs),l=-He*Math.PI/180,b=Math.tan(Math.atan2(n*u.scale-i.y,c)-l)/y;return Math.abs(v)>xs?null:{x:(v+1)/2,y:Math.min(1,Math.max(0,(1-b)/2))}}const ys={tree:["tree","boom"],oak:["oak","eik"],birch:["birch","berk"],alder:["alder","els"],lime:["lime","linde"],hawthorn:["hawthorn","meidoorn"],pine:["pine","den"],shrub:["shrub","struik"],juniper:["juniper","jeneverbes"],hazel:["hazel","hazelaar"],heather:["heather","heide"],bramble:["bramble","braam"],reeds:["reeds","riet"],grass:["grass","gras"],tall:["tall","hoog"],boulder:["boulder","zwerfkei"],boulders:["boulders","zwerfkeien"],large:["large","grote"],small:["small","kleine"],fence:["fence","hek"],rail:["rail","rail"],log:["log","boomstam"],fallen:["fallen","omgevallen"],cow:["cow","koe"],calf:["calf","kalf"],sheep:["sheep","schaap"],pig:["pig","varken"],goat:["goat","geit"],pot:["pot","pot"],funnelbeaker:["funnelbeaker","trechterbeker"],funnel:["funnel","trechter"],quern:["quern","maalsteen"],axe:["axe","bijl"],flint:["flint","vuursteen"],basket:["basket","mand"],digging:["digging","graaf"],stick:["stick","stok"],bowls:["bowls","kommen"],ground:["ground","grond"],heath:["heath","heide"],meadow:["meadow","weide"],band:["band","strook"],pebbles:["pebbles","keitjes"],ramp:["ramp","helling"],earth:["earth","aarde"],stone:["stone","steen"],chamber:["chamber","kamer"],case:["case","vitrine"],museum:["museum","museum"],house:["house","huis"],longhouse:["longhouse","langhuis"],ice:["ice","ijs"],sheet:["sheet","laag"],path:["path","pad"],sand:["sand","zand"],hunebed:["hunebed","hunebed"],long:["long","lange"],short:["short","korte"],wheat:["wheat","tarwe"],patch:["patch","veld"],clearing:["clearing","open plek"],stumps:["stumps","stronken"],fire:["fire","vuur"],pit:["pit","kuil"],sky:["sky","lucht"],summer:["summer","zomer"],autumn:["autumn","herfst"],bg:["backdrop","achtergrond"],farmland:["farmland","akkerland"],trb:["TRB","TRB"],lbk:["LBK","LBK"]},Ot=new Set(["large","small","tall","long","short","fallen"]),ws=new Set(["tree","shrub"]),ht=e=>e.charAt(0).toUpperCase()+e.slice(1),bs=(e,t)=>ys[e]?.[t?1:0]??e;function ks(e,t="en"){const n=t==="nl",o=e?.name?.[t]??e?.name?.en;if(o)return o;const a=String(e?.id??"").replace(/-\d+$/,"").split("-").filter(Boolean);if(!a.length)return"";const s=a.length>1&&ws.has(a[0])?a.slice(1):a,i=s.filter(c=>Ot.has(c)),r=s.filter(c=>!Ot.has(c));return ht([...i,...r].map(c=>bs(c,n)).join(" "))}function Pe(e,t,n="en"){if(e.figure)return ht(String(e.figure).replace(/-/g," "));const o=t??(e.asset?{id:e.asset}:null);if(o)return ks(o,n);const a=Array.isArray(e.need)?e.need[0]:e.need;return a?ht(String(a)):""}const Ms=24;function Ss(e){const t=new Map,n=o=>{if(t.has(o))return;t.set(o,"loading");const a=new Image;a.onload=()=>{try{const s=document.createElement("canvas");s.width=a.naturalWidth,s.height=a.naturalHeight;const i=s.getContext("2d",{willReadFrequently:!0});i.drawImage(a,0,0),t.set(o,{w:s.width,h:s.height,data:i.getImageData(0,0,s.width,s.height).data})}catch{t.set(o,"failed")}},a.onerror=()=>t.set(o,"failed"),a.src=e+o};return{prime(o){o.forEach(a=>a?.file&&n(a.file))},opaque(o,a,s){const i=t.get(o?.file);if(!i||typeof i=="string")return o?.file&&n(o.file),!0;const r=Math.min(i.w-1,Math.max(0,Math.floor(a*i.w))),c=Math.min(i.h-1,Math.max(0,Math.floor((1-s)*i.h)));return i.data[(c*i.w+r)*4+3]>Ms}}}const q={id:"ground",origin:[0,0],z:0,cellM:1,cells:[[-80,qt],[80,lo]]},Fs=e=>e<=12?1:e<=40?5:20,Es=e=>Fs(e)/4;function Pt(e,t=0){const n=(q.z+t-e.origin[1])/e.dir[1];return!Number.isFinite(n)||n<=0?null:An(q,[e.origin[0]+n*e.dir[0],e.origin[2]+n*e.dir[2]])}function dt(e){const t=Es(et(q,e)[1]);return et(q,Tn(e,t))}const pn=(e,t)=>[(e-.5)*ie(t),t],Ue=([e,t])=>({x:Math.round((.5+e/ie(t))*1e4)/1e4,z:t});function pt([e,t],n,o=[0,0]){const a=(n-o[1])/Math.max(.1,t-o[1]);return[o[0]+(e-o[0])*a,n]}function Ts([e,t],n,o=[0,0]){const[[,a],[,s]]=q.cells,i=Math.max(.1,t-o[1]),r=Math.min(s,Math.max(a,o[1]+i/Math.max(.01,n)));return et(q,pt([e,t],r,o))}function As(){const[[e],[t]]=q.cells;return[[qt,12,1],[12,40,5],[40,100,20]].flatMap(([n,o,a])=>{const s=Math.min(t,a*40),i={...q,cells:[[Math.max(e,-s),n],[Math.min(t,s),o]]};return zn(i,a,12).map(r=>r.map(c=>{const[u,h,y]=Ln(q,c);return[u,y,h]}))})}const Ct=-1,Bt=2;function zs({canvas:e,host:t,stage:n,valueOf:o,alpha:a,onChange:s,onGround:i=()=>!1,byDistance:r=()=>!1,groundUnder:c=()=>null,footY:u=()=>0,eye:h=()=>[0,0],onSettled:y=()=>{}}){let v=null,l=null,b=!1;const p="#38bdf8",T=document.createElement("div");T.dataset.stage25dSelection="",T.style.cssText=`position:absolute;display:none;pointer-events:none;box-sizing:border-box;box-shadow:0 0 0 2px ${p};z-index:3;`;const D=document.createElement("div");D.style.cssText=`position:absolute;left:calc(50% - 1px);top:-22px;width:2px;height:18px;background:${p};pointer-events:none;`,T.appendChild(D);const z=document.createElement("div");z.dataset.rotateHandle="1",z.style.cssText="position:absolute;left:calc(50% - 6px);top:-34px;width:12px;height:12px;border-radius:50%;background:#fff;border:1px solid rgba(15,23,42,0.55);cursor:grab;touch-action:none;pointer-events:auto;",T.appendChild(z);const E=[["top:-5px; left:-5px;","nwse-resize"],["top:-5px; right:-5px;","nesw-resize"],["bottom:-5px; left:-5px;","nesw-resize"],["bottom:-5px; right:-5px;","nwse-resize"],["top:-5px; left:calc(50% - 5px);","ns-resize"],["bottom:-5px; left:calc(50% - 5px);","ns-resize"],["left:-5px; top:calc(50% - 5px);","ew-resize"],["right:-5px; top:calc(50% - 5px);","ew-resize"]].map(([m,w])=>{const S=document.createElement("div");return S.dataset.scaleHandle="1",S.style.cssText=En(m,w),T.appendChild(S),S});t.appendChild(T);const C=document.createElementNS("http://www.w3.org/2000/svg","svg");C.setAttribute("aria-hidden","true"),C.dataset.stage25dGrid="",C.style.cssText="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:1;",t.appendChild(C);const M=document.createElement("div");M.style.cssText="position:absolute;display:none;pointer-events:none;z-index:4;padding:1px 6px;border-radius:4px;font:12px/1.4 system-ui,sans-serif;background:rgba(15,23,42,0.85);color:#fff;transform:translate(-50%,6px);white-space:nowrap;",t.appendChild(M);const O=As();let G=null;const V=()=>{const m=n();if(!m?.screenOf)return;const w=m.cameraKey();if(w===G)return;G=w;const S=e.getBoundingClientRect(),A=t.getBoundingClientRect(),U=S.left-A.left,$=S.top-A.top;let B="";for(const he of O){let ae=[];const de=()=>{ae.length>1&&(B+=`M${ae.map(ue=>`${ue.x},${ue.y}`).join("L")}`),ae=[]};for(const ue of he){const ge=m.screenOf(ue);ge&&Number.isFinite(ge.x)&&Math.abs(ge.y)<20?ae.push({x:U+ge.x*S.width,y:$+ge.y*S.height}):de()}de()}C.innerHTML=`<path d="${B}" fill="none" style="stroke:#0f172a;stroke-opacity:0.45;stroke-width:3px"/><path d="${B}" fill="none" style="stroke:var(--color-primary);stroke-opacity:0.9;stroke-width:1.25px"/>`},oe=m=>{const w=J();if(!w||m===null){M.style.display="none";return}const S=t.getBoundingClientRect(),A=e.getBoundingClientRect();Object.assign(M.style,{display:"block",left:`${w.left+w.width/2+A.left-S.left}px`,top:`${w.top+w.height+A.top-S.top}px`}),M.textContent=`${o(m,"z").toFixed(2)} m`},R=m=>{const w=e.getBoundingClientRect();return{x:m.clientX-w.left,y:m.clientY-w.top}},j=(m,w)=>n()?.pickLayers(m,w).find(S=>a.opaque(S.asset,S.u,S.v))??null,se=(m,w)=>{v=m,w&&m!==null&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:`s25_layer-${m}`}})),X()},J=()=>{const m=v===null?null:n()?.layerBox(v);if(!m)return null;const w=e.getBoundingClientRect();return{left:m.x0*w.width,top:m.y0*w.height,width:(m.x1-m.x0)*w.width,height:(m.y1-m.y0)*w.height,z:m.z}},X=()=>{V();const m=J();if(!m){T.style.display="none";return}const w=e.getBoundingClientRect(),S=t.getBoundingClientRect();Object.assign(T.style,{display:"block",left:`${m.left+w.left-S.left}px`,top:`${m.top+w.top-S.top}px`,width:`${m.width}px`,height:`${m.height}px`})},_=(m,w,S)=>Math.min(S,Math.max(w,m)),d=m=>{if(m.button!==0)return;const{x:w,y:S}=R(m),A=j(w,S);if(!A)return;m.stopPropagation(),se(A.index,!0);const U=n().layerBox(A.index),$=i(A.index),B=J();l={mode:"move",index:A.index,z:U.z,from:n().worldXAt(w,S,U.z),x0:o(A.index,"x"),id:m.pointerId,el:e,ground:$,start:[w,S],foot:B?[B.left+B.width/2,B.top+B.height]:[w,S],lift:$?u(A.index):0},e.setPointerCapture?.(m.pointerId)},f=m=>w=>{if(w.button!==0||v===null)return;const S=J();if(!S)return;w.stopPropagation(),w.preventDefault();const A=e.getBoundingClientRect(),U=S.left+S.width/2,$=S.top+S.height/2,{x:B,y:he}={x:w.clientX-A.left,y:w.clientY-A.top};l={mode:m,index:v,cx:U,cy:$,id:w.pointerId,el:w.currentTarget,d0:Math.max(8,Math.hypot(B-U,he-$)),a0:Math.atan2(he-$,B-U),scale0:o(v,"scale"),rotation0:o(v,"rotation"),byDistance:m==="scale"&&r(v),p0:pn(o(v,"x"),o(v,"z")),eye:h()},w.currentTarget.setPointerCapture?.(w.pointerId)},g=m=>{const{x:w,y:S}=R(m);if(l?.mode==="move"&&l.ground){const A=c(l.foot[0]+w-l.start[0],l.foot[1]+S-l.start[1],l.lift);if(!A)return;const U=Ue(dt(A));s(l.index,"x",_(U.x,Ct,Bt)),s(l.index,"z",U.z),oe(l.index);return}if(l?.mode==="move"){const A=(n().worldXAt(w,S,l.z)-l.from)/ie(l.z);s(l.index,"x",Math.round(_(l.x0+A,Ct,Bt)*1e3)/1e3);return}if(l?.mode==="scale"&&l.byDistance){const A=Math.hypot(w-l.cx,S-l.cy)/l.d0*l.scale0,U=dt(Ts(l.p0,A,l.eye))[1],$=Ue(pt(l.p0,U,l.eye));l.scale0!==1&&s(l.index,"scale",1),s(l.index,"x",$.x),s(l.index,"z",$.z),oe(l.index);return}if(l?.mode==="scale"){const A=Math.hypot(w-l.cx,S-l.cy);s(l.index,"scale",Math.round(_(l.scale0*(A/l.d0),.05,20)*1e3)/1e3);return}if(l?.mode==="rotate"){let A=l.rotation0+(Math.atan2(S-l.cy,w-l.cx)-l.a0)*180/Math.PI;m.shiftKey&&(A=Math.round(A/15)*15),s(l.index,"rotation",Math.round(A*10)/10);return}b||(b=!0,requestAnimationFrame(()=>{b=!1,e.style.cursor=j(w,S)?"pointer":""}))},x=()=>{if(!l)return;l.el.releasePointerCapture?.(l.id);const m=l.index,w=l.mode==="move"&&l.ground||l.byDistance;l=null,M.style.display="none",w&&y(m)},F=m=>{v!==null&&m.detail?.id!==`s25_layer-${v}`&&(v=null,X())};e.addEventListener("pointerdown",d);for(const m of[e,...E,z])m.addEventListener("pointermove",g),m.addEventListener("pointerup",x),m.addEventListener("pointercancel",x);return E.forEach(m=>m.addEventListener("pointerdown",f("scale"))),z.addEventListener("pointerdown",f("rotate")),window.addEventListener("scene-object-selected",F),{select:(m,w=!1)=>se(m,w),get selected(){return v},place:X,destroy(){window.removeEventListener("scene-object-selected",F),T.remove(),C.remove(),M.remove()}}}const mt=["x","y","z","scale","rotation","opacity","keys"],K=e=>{const t=/^layer-(\d+)$/.exec(String(e));return t?Number(t[1]):-1},Ls=e=>Object.fromEntries(Object.entries(e).filter(([t])=>!mt.includes(t))),It=e=>JSON.stringify({...e,set:{...e?.set,layers:(e?.set?.layers??[]).map(Ls)}}),Je=e=>JSON.stringify((e?.set?.layers??[]).map(t=>mt.map(n=>t[n]??null))),Vt=["sheetGrain","groundDetail","sunLight","castShadow","smoke","birds","cloudDrift","housePitch"],Ut="application/x-lp-stage25d",Ce=new Map,Qe=new Map,Ds=e=>(Qe.has(e)||Qe.set(e,Ss(e)),Qe.get(e));function Rs(e){return Ce.has(e)||Ce.set(e,So(Fn(e)).catch(t=>{throw Ce.delete(e),t})),Ce.get(e)}const _s=e=>({id:e.id??"scene",set:{...e.set??{},layers:(e.set?.layers??[]).map(t=>({...t}))},camera:e.camera??null,camera_more:e.camera_more??[],figures:e.figures??[],dur_s:e.dur_s,est_s:e.est_s});async function js(e,t={}){const n=document.createElement("canvas");n.className="stage25d-canvas",n.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;",e.appendChild(n);let o=null,a=null,s=null,i=null,r=new Map,c=new Map,u=0,h=null,y=0,v=0,l=performance.now(),b=!1,p=[],T=new Set,D=null,z=null,k=null,E=!1,N={},C=null;const M=()=>{o.engine.runRenderLoop(()=>{const d=performance.now();v+=Math.min(.1,(d-l)/1e3),l=d,o.tick(d),a&&o.pose(a,V(),v),o.scene.render(),C?.place()})},O=()=>{!a||!o||(a={...a,set:{...a.set,layers:p.map((d,f)=>T.has(f)?{...d,opacity:0,keys:[]}:d)}},o.rebind(a))},G=(d,f)=>{const g=K(d);return g<0||!p[g]?-1:(p=p.map((x,F)=>F===g?{...x,...f}:x),D=Je({set:{layers:p}}),O(),g)},V=()=>h?h():u,oe=()=>i?.set?.sky&&z?r.get(i.set.sky)??Me(z,{asset:i.set.sky},"sky"):null,R=d=>{const f=r.get(p[d]?.asset);return!!(p[d]&&f&&!f.tileable_x&&f.layer!=="bg"&&f.layer!=="sky"&&p[d].depth!=="sky")},j=d=>pe(p[d],V()).z??Y[p[d].depth],se=d=>R(d)&&!(p[d].keys??[]).some(f=>f.scale!==void 0),J=d=>Math.round(d*1e3)/1e3,X=()=>o?.camera?.position?[o.camera.position.x,o.camera.position.z]:[0,0],_={canvas:n,sceneId:null,async show(d){const f=await Rs(d.bundle);if(b)return;o||(o=new ds(n,f),M()),N={...d.look??{}},o.setLook(N);const g=_s(d);await o.build(g,f),a=g,p=g.set.layers,T=new Set,D=Je(d),i=d,r=new Map(f.assets.map(x=>[x.id,x])),z=f,k=Ds(f.base),k.prime(g.set.layers.map(x=>r.get(x.asset)).filter(Boolean)),t.editable&&!C&&(n.style.pointerEvents="auto",window.addEventListener("scene-object-selected",x=>{x.detail?.id!=="s25_sky"&&(E=!1)}),n.addEventListener("dragover",x=>{x.dataTransfer?.types?.includes(Ut)&&(x.preventDefault(),x.dataTransfer.dropEffect="copy")}),n.addEventListener("drop",x=>{const F=x.dataTransfer?.getData(Ut);if(!F)return;x.preventDefault();const m=n.getBoundingClientRect();_.addLayer(F,{x:x.clientX-m.left,y:x.clientY-m.top})}),C=zs({canvas:n,host:e,stage:()=>o,alpha:{opaque:(x,F,m)=>k.opaque(x,F,m)},valueOf:(x,F)=>F==="z"?j(x):pe(p[x],V())[F],onGround:R,byDistance:se,groundUnder:(x,F,m)=>Pt(o.pointerRay(x,F),m),footY:x=>o.layerFootY(x),eye:X,onSettled:x=>_.settleBand(x),onChange:(x,F,m)=>_.moveLayer(`layer-${x}`,F,m)})),c=new Map(f.assets.map(x=>[x.id,x.height_m??1.7])),y=Number(d.narration_at_s)||0,s=It(d),e.dataset.stage25dReady="1"},matches:d=>s===It(d),adopt(d){const f=Je(d);if(f===D)return!1;D=f;const g=d.set?.layers??[];return p=p.map((x,F)=>{const m={...x};for(const w of mt)g[F]?.[w]===void 0?delete m[w]:m[w]=g[F][w];return m}),i=d,O(),!0},setLayerProp(d,f,g){G(d,{[f]:g})},setLayerKeys(d,f){const g=K(d);JSON.stringify(p[g]?.keys??[])!==JSON.stringify(f)&&G(d,{keys:f})},commitLayerProp(d,f,g){const x=G(d,{[f]:g});x>=0&&this.sceneId!=null&&t.onCommit?.(x,{[f]:g},this.sceneId)},readLayerProp(d,f){const g=p[K(d)],x=g?f==="z"?j(K(d)):pe(g,V())[f]:null;return Number.isFinite(x)?x:null},setHidden(d,f){const g=K(d);g<0||(T=new Set(f?[...T,g]:[...T].filter(x=>x!==g)),O())},update(d){h=null,u=Math.max(0,d)},play(d){h=()=>y+d()},moveLayer(d,f,g){window.__timelineKeying?.edit?.(`s25:${d}`,f,g,{flush:!1})||_.commitLayerProp(d,f,g)},select(d){E=d==="sky",C?.select(K(d)>=0?K(d):null,!E),E&&window.dispatchEvent(new CustomEvent("scene-object-selected",{detail:{id:"s25_sky"}}))},get skySelected(){return E},get selection(){return C?.selected??null},clearSelection(){C?.select(null)},atStart(){return u===0&&h===null&&T.size===0},layerInfo(d){if(d==="sky"){const m=oe();return m?{id:d,asset:m.id,depth:"sky",figure:null,label:Pe({},m,(document.documentElement.lang||"en").slice(0,2)),file:`${z.base}${m.file}`,motion:null}:null}const f=p[K(d)];if(!f)return null;const g=r.get(f.asset)??null,x=typeof f.motion=="string"?{kind:f.motion}:f.motion??{},F=g?.motion??"none";return{id:d,asset:f.asset??null,depth:f.depth,figure:f.figure??null,ground:R(K(d)),showScale:!R(K(d))||(f.scale??1)!==1||(f.keys??[]).some(m=>m.scale!==void 0),label:Pe(f,g,(document.documentElement.lang||"en").slice(0,2)),file:g?`${z.base}${g.file}`:null,motion:{kind:x.kind??F,amount:x.amount??1,speed:x.speed??1}}},setLayerMotion(d,f){const g=K(d);if(g<0||!p[g])return;const x={...typeof p[g].motion=="object"?p[g].motion:{kind:p[g].motion},...f},F=G(d,{motion:x});F>=0&&t.onCommit?.(F,{motion:x},_.sceneId)},reorderLayers(d,f,g){if(!R(f)){g(d,f,_.sceneId,null,null,null);return}const x=B=>p[B]?.z??Y[p[B]?.depth],F=d.filter(B=>B===f||R(B)),m=F.indexOf(f),w=F[m-1],S=F[m+1],A=j(f),U=w===void 0?0:x(w),$=S===void 0?1/0:x(S);if((w!==void 0||S!==void 0)&&(A<U||A>$)){const B=pn(pe(p[f],V()).x,A),he=w===void 0?$/1.25:S===void 0?U*1.25:(U+$)/2,ae=Math.round(Math.min(q.cells[1][1],Math.max(q.cells[0][1],he))*100)/100,de=X(),ue=(ae-de[1])/Math.max(.1,A-de[1]);g(d,f,_.sceneId,Ue(pt(B,ae,de)).x,ae,J(Math.min(20,Math.max(.01,(p[f].scale??1)*ue))));return}g(d,f,_.sceneId,p[f].x??.5,x(f),p[f].scale??1)},library(){if(!z)return null;const d=(document.documentElement.lang||"en").slice(0,2);return{bundle:z.bundle,assets:z.assets.map(f=>({id:f.id,layer:f.layer,tags:f.tags??[],url:z.base+f.file,label:Pe({},f,d)}))}},async swapAsset(d,f){if(d==="sky"){if(r.get(f)?.layer!=="sky"||oe()?.id===f)return;await _.show({...i,set:{...i.set,sky:f,layers:p}}),_.sceneId!=null&&t.onCommit?.(0,{sky:f},_.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced"));return}const g=K(d);g<0||!p[g]||!r.has(f)||p[g].asset===f||(p=p.map((x,F)=>F===g?{...x,asset:f}:x),await _.show({...i,set:{...i.set,layers:p}}),t.onCommit?.(g,{asset:f},_.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")))},async addLayer(d,f=null){const g=r.get(d);if(!g)return;const x=["mid","fg","near","bg","sky"].includes(g.layer)?g.layer:"mid";let F={asset:d,depth:x,x:.5,scale:1};if(!(g.tileable_x||g.layer==="bg"||g.layer==="sky")){const m=f&&o?Pt(o.pointerRay(f.x,f.y)):null,w=Ue(dt(m??[0,Y[x]]));F={...F,...w,depth:Mt(w.z)}}p=[...p,F],await _.show({...i,set:{...i.set,layers:p}}),t.onCommit?.(p.length-1,{add:F},_.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),C?.select(p.length-1,!0)},async settleBand(d){const f=p[d];if(!f||!R(d))return;const g=Mt(j(d));g!==f.depth&&(p=p.map((x,F)=>F===d?{...x,depth:g}:x),await _.show({...i,set:{...i.set,layers:p}}),_.sceneId!=null&&t.onCommit?.(d,{depth:g},_.sceneId),window.dispatchEvent(new CustomEvent("stage25d-synced")),C?.select(d,!1))},lookControls(){return Vt.map(d=>{const[f,g,x]=es[d]??[0,1,.01];return{key:d,min:f,max:g,step:x,value:ee({...ct,...N},d)}})},setLook(d,f){!Vt.includes(d)||!Number.isFinite(f)||!o||(N={...N,[d]:f},o.setLook(N),t.onLook?.(d,f,_.sceneId))},async still(d=480){if(!o||!a||!n.width)return null;await o.scene.whenReadyAsync();const f=()=>{const g=document.createElement("canvas");return g.width=d,g.height=Math.max(1,Math.round(d*n.height/n.width)),g.getContext("2d").drawImage(n,0,0,g.width,g.height),g.toDataURL("image/jpeg",.72)};return o.engine.resize(),new Promise(g=>{let x=0;const F=S=>{o.engine.onEndFrameObservable.remove(m),clearTimeout(w),g(S)},m=o.engine.onEndFrameObservable.add(()=>{++x>=6&&F(f())}),w=setTimeout(()=>F(null),4e3)})},get config(){return i},figureBox(d){const f=p.find(m=>m.figure===d);if(!f?.asset)return null;const g=vs(a,f,c.get(f.asset)??1.7,V());if(!g)return null;const x=n.getBoundingClientRect(),F=x.width*.05;return new DOMRect(x.left+g.x*x.width-F/2,x.top+g.y*x.height,F,x.height*.08)},items:()=>[...p.map((d,f)=>({id:`layer-${f}`,label:Pe(d,r.get(d.asset),(document.documentElement.lang||"en").slice(0,2))||`layer ${f+1}`,depth:d.depth,z:d.z??Y[d.depth],keys:d.keys??[]})),...i?.set?.sky?[{id:"sky",label:"Sky",depth:"sky",keys:[]}]:[],{id:"camera",label:"Camera",depth:null,keys:[]}],destroy(){b=!0,delete e.dataset.stage25dReady;try{o?.engine.stopRenderLoop(),o?.scene.dispose(),o?.engine.dispose()}catch{}C?.destroy(),n.remove()}};return _}export{Ut as DROP_TYPE,Vt as LOOK_KEYS,js as createStage25d,_s as stageScene};
