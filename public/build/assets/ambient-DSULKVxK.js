import{a as j}from"./easing-ChRyoIXo.js";const ve=.6,xe="center 20%";function mt(t){return t==="contain"?"contain":"cover"}function ke(t,e,a,n){return mt(t)!=="cover"?!1:e==="top"}const rt=["waterline","reflection","contact_shadow","color_match","foam","speed"],ht=rt.filter(t=>t!=="speed"),ut=[70,72,80],p={waveAmp:1.6,waveDriftS:18,reflectionTint:.6,reflectionBands:7,shadowHeight:.1,shadowDark:.45,shadowOpacity:.85,foamHeight:.07,foamTint:.14,foamDusk:.4,foamChurnPx:10,bowWidth:.22,bowHeight:.2,wakePatches:6,wakeRun:4},$=t=>Number.isFinite(Number(t))&&t!==null&&t!==""?Math.min(1,Math.max(0,Number(t))):0,h=(t,e=3)=>Math.round(t*10**e)/10**e;function dt(t){const e=Object.fromEntries(rt.map(a=>[a,$(t?.[a])]));return ht.some(a=>e[a]>0)?e:null}function W(t,e,a,n){return a>0&&n>0?n>a?[.5+(t-.5)*(a/n),e]:[t,.5+(e-.5)*(n/a)]:[t,e]}const H=({x0:t,y0:e,x1:a,y1:n})=>({x0:Math.max(0,Math.min(1,t)),y0:Math.max(0,Math.min(1,e)),x1:Math.max(0,Math.min(1,a)),y1:Math.max(0,Math.min(1,n))});function ft({x:t,y:e,w:a,h:n},i=0){const r=e+n*(1-i);return{around:H({x0:t-a*.3,y0:e-n*.15,x1:t+a*1.3,y1:e+n*1.15}),below:H({x0:t+a*.1,y0:r,x1:t+a*.9,y1:r+n*.25})}}function pt(t,e,a,n){const i=Math.floor(n.x0*e),r=Math.max(i+1,Math.ceil(n.x1*e)),s=Math.floor(n.y0*a),l=Math.max(s+1,Math.ceil(n.y1*a));let o=0,c=0,d=0,b=0;for(let E=s;E<Math.min(l,a);E++)for(let A=i;A<Math.min(r,e);A++){const x=(E*e+A)*4;t[x+3]<8||(o+=t[x],c+=t[x+1],d+=t[x+2],b++)}return b?[Math.round(o/b),Math.round(c/b),Math.round(d/b)]:null}function st(t,e){const a=$(e),n=t.map(s=>Math.min(255,Math.max(0,s))/255),i=Math.max(...n,1/255),r=n.map(s=>h(1-a+a*(.5*s/i+.5*s)));return`${r[0]} 0 0 0 0 0 ${r[1]} 0 0 0 0 0 ${r[2]} 0 0 0 0 0 1 0`}const yt=(t,e)=>`rgb(${t.map(a=>Math.round(a*e)).join(", ")})`,T=t=>`url("data:image/svg+xml,${encodeURIComponent(t)}")`;function wt(t,e=p.waveAmp){const a=h(100*(1-$(t)),2),n=r=>h(a+r*e,2),i=`M0 0H100V${a}Q87.5 ${n(1)} 75 ${a}T50 ${a}Q37.5 ${n(-.7)} 25 ${a}T0 ${a}Z`;return T(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${i}' fill='#000'/></svg>`)}function bt(t=p.reflectionBands){const e=Math.max(1,Math.round(t)),a=60/e,n=Array.from({length:e},(i,r)=>{const s=h(((e-r)/e)**1.4,3),l=h(r%2*3+r*1.5,1);return`<rect x='${l}' y='${h(r*a,2)}' width='${h(100-l*1.7,1)}' height='${h(a*.78,2)}' fill-opacity='${s}'/>`});return T(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><g fill='#000'>${n.join("")}</g></svg>`)}const D=(t,e,a)=>t.map((n,i)=>Math.round(n+(e[i]-n)*a)),gt=[250,249,244],$t=[168,182,196];function _t(t,e=p.foamTint){const a=(.2126*t[0]+.7152*t[1]+.0722*t[2])/255,n=Math.min(.75,e+p.foamDusk*(1-a));return{fill:D(gt,t,n),rim:D($t,t,Math.min(.85,n*1.5))}}const _=t=>(Math.sin(t*12.9898)*43758.5453%1+1)%1,M=t=>`rgb(${t.join(",")})`;function vt(){const t=[];let e=4,a=0;for(;e<196;){const n=2+Math.floor(_(a+500)*3);for(let i=0;i<n&&e<196;i++,a++){const r=e/196,s=h(2+4*r*r+_(a+40)*1.6,2);t.push(`<ellipse cx='${h(e,2)}' cy='${h(10+(_(a+80)-.5)*2.4,2)}' rx='${h(3+_(a+120)*2.2,2)}' ry='${s}'/>`),e+=5+_(a)*3}e+=5+_(a+600)*9}return T(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 20' preserveAspectRatio='none'><g fill='#000'>${t.join("")}</g></svg>`)}function xt(t){const e=["M2 7 Q8 5 14 7","M19 9 Q24 7.5 29 9.5","M33 6 Q36 5 39 6.5"];return T(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='12' viewBox='0 0 40 12'><g fill='none' stroke='${M(t)}' stroke-width='0.6' stroke-linecap='round' stroke-opacity='0.7'>${e.map(a=>`<path d='${a}'/>`).join("")}</g></svg>`)}function kt(t,e){const a="M8 34 C12 24 20 18 30 17 C36 17 40 21 38 26 C42 25 46 28 44 33 Z",n="M0 36 C4 26 10 15 20 9 C26 5 34 4 40 8 C44 11 43 15 39 15 C45 15 51 19 50 24 C55 24 60 29 57 34 C52 37 46 33 42 37 C36 33 30 38 24 35 C16 39 8 35 0 36 Z",i=["M14 22 C20 14 28 10 36 10","M26 25 C32 20 40 19 47 23","M30 33 C37 30 44 30 51 32"];return T(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40' preserveAspectRatio='none'><path d='${a}' fill='${M(D(t,e,.25))}'/><path d='${n}' fill='${M(t)}'/><g fill='none' stroke='${M(e)}' stroke-width='0.7' stroke-linecap='round' stroke-opacity='0.75'>${i.map(r=>`<path d='${r}'/>`).join("")}</g></svg>`)}function Mt(t,e,a=0){const n=Array.from({length:7},(r,s)=>{const l=s/7*Math.PI*2,o=.72+_(a*11+s)*.28;return[h(20+Math.cos(l)*19*o,2),h(8+Math.sin(l)*7*o,2)]}),i=`M${n[0].join(" ")} `+n.slice(1).map(([r,s],l)=>`Q${h((n[l][0]+r)/2+(_(a+l+60)-.5)*4,2)} ${h((n[l][1]+s)/2,2)} ${r} ${s}`).join(" ")+" Z";return T(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 16' preserveAspectRatio='none'><path d='${i}' fill='${M(t)}'/><path d='M${n[4].join(" ")} Q20 15 ${n[1].join(" ")}' fill='none' stroke='${M(e)}' stroke-width='0.7' stroke-opacity='0.7'/></svg>`)}function Et(t,e){const a=$(e);return a>0&&t>0?h((.5+.5*$(t))*(.45+.55*a),3):0}function Me(t,e){if(!t)return null;const{data:a,width:n,height:i}=t,r=Math.min(i-1,Math.round(e*i)-1),s=Math.max(0,r-Math.max(1,Math.round(i*.06)));let l=n,o=-1;for(let c=s;c<=r;c++)for(let d=0;d<n;d++)a[(c*n+d)*4+3]<128||(d<l&&(l=d),d>o&&(o=d));return o<0?null:[h(l/n),h((o+1)/n)]}const St=[.06,.94],Ct=t=>h(.35+.65*$(t),3);function Tt(t,e,a=p.wakePatches){const n=$(e),i=Math.max(0,Math.round(a));return Array.from({length:i},(r,s)=>({op:h($(n*i-s)*($(t)>0?1:0)*(1-s/(i+2)),3),run:h(1.5+p.wakeRun*n,2)}))}const G=96,I=new Map;function Ee(t){return t?(I.has(t)||I.set(t,new Promise(e=>{const a=new Image;a.crossOrigin="anonymous",a.onload=()=>{try{const n=a.naturalWidth/a.naturalHeight,i=G,r=Math.max(1,Math.round(G/n)),s=document.createElement("canvas");s.width=i,s.height=r;const l=s.getContext("2d",{willReadFrequently:!0});l.drawImage(a,0,0,i,r),e({data:l.getImageData(0,0,i,r).data,width:i,height:r,aspect:n})}catch{e(null)}},a.onerror=()=>e(null),a.src=t})),I.get(t)):Promise.resolve(null)}function Se(t,e,a,n=0){if(!t)return null;const i=l=>{const[o,c]=W(l.x0,l.y0,a,t.aspect),[d,b]=W(l.x1,l.y1,a,t.aspect);return pt(t.data,t.width,t.height,{x0:o,y0:c,x1:d,y1:b})},{around:r,below:s}=ft(e,n);return{around:i(r),below:i(s)}}const Y="sit-styles";function At(){if(document.getElementById(Y))return;const t=document.createElement("style");t.id=Y,t.textContent=`
    @keyframes sit-wave { from { mask-position: 0% 0%; } to { mask-position: 100% 0%; } }
    .sit-waterline { mask-size: 50% 100%; mask-repeat: repeat-x; animation: sit-wave var(--sit-drift, 18s) linear infinite; }
    .sit-reflection, .sit-shadow, .sit-foam, .sit-bow, .sit-wake { position: absolute; pointer-events: none; }
    /* The band's lines churn on the layer's own swing (its --amb-dur, inherited from the ambient
       wrapper), eased like the bob it rides on. */
    @keyframes sit-churn {
      from { background-position: 0 0; }
      to   { background-position: var(--sit-churn, 10px) 0; }
    }
    .sit-foam {
      background-repeat: repeat-x; background-size: auto 100%;
      mask-size: 100% 100%; mask-repeat: no-repeat;
      animation: sit-churn calc(var(--amb-dur, 6s) / 2) cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
      animation-delay: var(--amb-delay, 0s);
    }
    /* The bow wave swells and settles with the swing, about the water line. */
    @keyframes sit-bow { from { transform: scale(0.88, 0.8); } to { transform: scale(1.04, 1.06); } }
    .sit-bow {
      background-size: 100% 100%; transform-origin: 0% 85%;
      animation: sit-bow calc(var(--amb-dur, 6s) / 2) cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
      animation-delay: var(--amb-delay, 0s);
    }
    /* Wake patches are born at the stern and drift back and apart (the V), fading: opacity
       only, never a blur. A drift is a deceleration (ease-out). */
    @keyframes sit-wake {
      0%   { transform: translate(0, 0); opacity: 0; }
      8%, 60% { opacity: var(--sit-wake-op, 0); }
      100% { transform: translate(calc(var(--sit-wake-run, 0) * -100%), calc(var(--sit-wake-side, 1) * var(--sit-wake-run, 0) * 18%)); opacity: 0; }
    }
    .sit-wake {
      background-size: 100% 100%; opacity: 0;
      animation: sit-wake calc(var(--amb-dur, 6s) * 1.4) cubic-bezier(0.16, 1, 0.3, 1) infinite;
    }
    @media (prefers-reduced-motion: reduce) { .sit-waterline, .sit-foam, .sit-bow, .sit-wake { animation: none; } }
  `,document.head.appendChild(t)}function Ce(t,e,a,n,i=null){for(const o of t.querySelectorAll(":scope > .sit-reflection, :scope > .sit-shadow, .sit-foam, .sit-bow, .sit-wake"))o.remove();a.classList.remove("sit-waterline"),a.style.removeProperty("mask-image");const r=dt(n);if(!r)return null;At();const s=i?.below??ut,l=1-r.waterline;if(r.waterline>0&&(a.classList.add("sit-waterline"),a.style.maskImage=wt(r.waterline),a.style.setProperty("--sit-drift",`${p.waveDriftS}s`)),r.foam>0&&Lt(e,n,r,l,s,i),r.contact_shadow>0){const o=p.shadowHeight*100,c=document.createElement("div");c.className="sit-shadow",c.setAttribute("aria-hidden","true"),c.style.cssText=`left:8%; width:84%; height:${o}%; top:calc(${h(l*100,2)}% - ${o/2}%);
      background:radial-gradient(closest-side, ${yt(s,p.shadowDark)} 68%, transparent 100%);
      opacity:${h(r.contact_shadow*p.shadowOpacity)};`,t.insertBefore(c,t.firstChild)}if(r.reflection>0){const o=document.createElement("div");o.className="sit-reflection",o.setAttribute("aria-hidden","true"),o.style.cssText=`left:0; top:${h(l*100,2)}%; width:100%; height:100%; overflow:hidden;
      opacity:${r.reflection}; mask-image:${bt()}; mask-size:100% 100%; mask-repeat:no-repeat;`;const c=document.createElement("img");c.src=a.src,c.alt="",c.draggable=!1,c.style.cssText=`position:absolute; left:0; top:${h(-r.waterline*100,2)}%; height:100%;
      width:${Number.isFinite(n.width)?"100%":"auto"}; transform:scaleY(-1); display:block;`,c.style.filter=Pt(t,`sitfx-r-${n.asset_id}`,s,p.reflectionTint),o.appendChild(c),t.insertBefore(o,e)}return r}function Lt(t,e,a,n,i,r){const{fill:s,rim:l}=_t(i),o=h(n*100,2),c=(g,S)=>{const k=document.createElement("div");return k.className=g,k.setAttribute("aria-hidden","true"),k.style.cssText=S,t.appendChild(k),k};t.style.position||(t.style.position="relative");const[d,b]=(r?.hull??St).map(g=>h(g*100,2)),E=h(p.foamHeight*100*(.6+.4*a.foam),2);c("sit-foam",`left:${h(d-1,2)}%; width:${h(b-d+2,2)}%;
    height:calc(var(--sit-band-k, 1) * ${E}%); top:calc(${o}% - var(--sit-band-k, 1) * ${E/2}%);
    background-color:${M(s)}; background-image:${xt(l)}; mask-image:${vt()};`).style.setProperty("--sit-churn",`${p.foamChurnPx}px`);const x=p.bowWidth*100,z=p.bowHeight*100;c("sit-bow",`left:calc(${b}% - var(--sit-bow-k, 0) * ${h(x*.35,2)}%); width:calc(var(--sit-bow-k, 0) * ${x}%);
    height:calc(var(--sit-bow-k, 0) * ${z}%); top:calc(${o}% - var(--sit-bow-k, 0) * ${h(z*.85,2)}%);
    background-image:${kt(s,l)};`);const B=Math.max(0,Math.round(p.wakePatches));for(let g=0;g<B;g++){const S=h(10-g%3*1.5,2),k=g%2?1:-1;c("sit-wake",`left:${h(d-S*.6,2)}%; width:${S}%; height:${h(S*.4,2)}%;
      top:calc(${o}% - ${h(S*.2,2)}%); background-image:${Mt(s,l,g)};
      animation-delay:calc(var(--amb-dur, 6s) * ${h(-1.4*g/B,3)});`).style.setProperty("--sit-wake-side",String(k))}It(t,a.foam,a.speed)}function It(t,e,a){if(!t)return;t.style.setProperty("--sit-bow-k",String(Et(e,a))),t.style.setProperty("--sit-band-k",String(Ct(a)));const n=Tt(e,a);t.querySelectorAll(":scope > .sit-wake").forEach((i,r)=>{i.style.setProperty("--sit-wake-op",String(n[r]?.op??0)),i.style.setProperty("--sit-wake-run",String(n[r]?.run??0))})}function Pt(t,e,a,n){let i=t.querySelector(`#${e}`)?.closest("svg");return i||(i=document.createElementNS("http://www.w3.org/2000/svg","svg"),i.setAttribute("aria-hidden","true"),i.style.cssText="position:absolute; width:0; height:0; pointer-events:none;",t.appendChild(i)),i.innerHTML=`<defs><filter id="${e}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${st(a,n)}"/></filter></defs>`,`url(#${e})`}let V=null;function Te(t){V||typeof window>"u"||!window.__tune?.register||(V=window.__tune.register("Blend into scene",Object.keys(p).map(e=>({key:e,label:e,min:0,max:Math.max(1,p[e]*3),step:p[e]>=2?.5:.01,value:p[e],apply:a=>{p[e]=Number(a),t?.()}})),{tab:"Lesson"})??null)}const Ae=t=>!!t&&t.asset_id!=null&&t.kind!=="cover";function Ot(t){const e=/^#?([0-9a-f]{6})$/i.exec(String(t||""));if(!e)return[1,1,1];const a=parseInt(e[1],16);return[(a>>16&255)/255,(a>>8&255)/255,(a&255)/255]}const Nt=.5,Rt=t=>`lyrfx-${t}`;function U({white_key:t=0,grayscale:e=!1,tint:a=null,wash:n=null}={}){return t>0||!!e||!!a||n?.amount>0&&Array.isArray(n.rgb)}function qt({white_key:t=0,grayscale:e=!1,tint:a=null,tint_opacity:n=1,wash:i=null}={}){if(!U({white_key:t,grayscale:e,tint:a,wash:i}))return null;const r=[];if(e&&r.push('<feColorMatrix type="saturate" values="0"/>'),t>0){const s=Math.min(Nt,Math.max(.001,t));r.push(`<feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 ${-.2126} ${-.7152} ${-.0722} 0 1"/>`),r.push(`<feComponentTransfer><feFuncA type="linear" slope="${(1/s).toFixed(3)}" intercept="0"/></feComponentTransfer>`)}if(a){const[s,l,o]=Ot(a),c=Math.min(1,Math.max(0,n??1));r.push('<feColorMatrix type="saturate" values="0"/>'),r.push(`<feColorMatrix type="matrix" values="${s} 0 0 0 0 0 ${l} 0 0 0 0 0 ${o} 0 0 0 0 0 1 0"/>`+(c<1?" ":"")),c<1&&(r.splice(r.length-2,0,'<feMerge><feMergeNode in="SourceGraphic"/></feMerge>'),r.push(`<feComposite in2="SourceGraphic" operator="arithmetic" k1="0" k2="${c}" k3="${(1-c).toFixed(3)}" k4="0"/>`))}return U({wash:i})&&r.push(`<feColorMatrix type="matrix" values="${st(i.rgb,i.amount)}"/>`),r.join("")}function Le(t,e){const a=Rt(e.asset_id),n=qt(e),i=t.querySelector(`#${a}`);if(!n)return i&&i.closest("svg")?.remove(),e.blur>0?`blur(${Math.min(2.5,e.blur)}px)`:"";let r=i?.closest("svg");r||(r=document.createElementNS("http://www.w3.org/2000/svg","svg"),r.setAttribute("aria-hidden","true"),r.style.cssText="position:absolute; width:0; height:0; pointer-events:none;",t.appendChild(r)),r.innerHTML=`<defs><filter id="${a}" color-interpolation-filters="sRGB">${n}</filter></defs>`;const s=e.blur>0?` blur(${Math.min(2.5,e.blur)}px)`:"";return`url(#${a})${s}`}function Dt(t,e,a){if(!(a>0)||!(t>0)||!(e>0))return{left:0,top:0,width:t,height:e};const n=Math.min(t,e*a),i=n/a;return{left:(t-n)/2,top:(e-i)/2,width:n,height:i}}function Ft(t,e,a,n=null){if(!(a>0)||!(t>0)||!(e>0)||t>=e)return Dt(t,e,a);const i=Math.max(e,t/a),r=i*a,s=Bt(n,t/r)??.5;return{left:Math.min(0,Math.max(t-r,t/2-s*r)),top:(e-i)/2,width:r,height:i}}const zt=.8;function Bt(t,e=1){const a=(Array.isArray(t)?t:[]).filter(o=>o?.kind==="figure"&&Number.isFinite(o.x)),n=a.filter(o=>/\/figures\//.test(String(o.url||o.path||""))),i=n.length?n:a;if(!i.length)return null;const r=o=>Math.max(0,Number(o.height)||1),s=i.map(o=>o.x);if(Math.max(...s)-Math.min(...s)>e*100*zt)return i.reduce((o,c)=>r(c)>r(o)?c:o).x/100;const l=i.reduce((o,c)=>o+r(c),0);return i.reduce((o,c)=>o+c.x*r(c),0)/l/100}const P=new Map;function Ie(t){const e=String(t||"").split("?")[0];return e?(P.has(e)||P.set(e,new Promise(a=>{const n=new Image;n.onload=()=>a(n.naturalWidth&&n.naturalHeight?n.naturalWidth/n.naturalHeight:null),n.onerror=()=>a(null),n.src=t})),P.get(e)):Promise.resolve(null)}function Pe(t,e,a,n=null){if(t.__plateObserver?.disconnect(),t.__plateObserver=null,!a){for(const r of["width","height"])t.style.removeProperty(r);return Object.assign(t.style,{left:"0px",top:"0px",right:"0px",bottom:"0px"}),()=>{}}const i=()=>{const r=Ft(e.clientWidth,e.clientHeight,a,n);Object.assign(t.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,right:"auto",bottom:"auto"})};return i(),typeof ResizeObserver=="function"&&(t.__plateObserver=new ResizeObserver(i),t.__plateObserver.observe(e)),()=>{t.__plateObserver?.disconnect(),t.__plateObserver=null}}const O=16/9;function Oe(t,e,a={}){if(!t||!e||!e.src)return null;const n=document.createElement("div");n.className="lesson-embed-bg",n.style.cssText=`position:absolute;inset:0;overflow:hidden;background:#000;z-index:${a.zIndex??1};`;const i=document.createElement("iframe");i.src=e.src,i.title=e.kind==="sketchfab"?"3D background":"Video background",i.setAttribute("allow","autoplay; fullscreen; xr-spatial-tracking; encrypted-media; picture-in-picture"),i.setAttribute("allowfullscreen","true"),i.style.border="0",i.style.position="absolute";let r=null;if(!(e.kind==="video"&&(e.fit||"cover")==="cover"))i.style.inset="0",i.style.width="100%",i.style.height="100%";else{i.style.left="50%",i.style.top="50%",i.style.transform="translate(-50%,-50%)";const l=()=>{const o=n.clientWidth||1,c=n.clientHeight||1;o/c>O?(i.style.width=o+"px",i.style.height=o/O+"px"):(i.style.height=c+"px",i.style.width=c*O+"px")};l();try{r=new ResizeObserver(l),r.observe(n)}catch{}}return n.appendChild(i),t.appendChild(n),{el:n,destroy(){if(r){try{r.disconnect()}catch{}r=null}n.remove()}}}function Ne(t){return JSON.stringify([t?.src??null,t?.kind??null,t?.fit??null])}const jt=50;function K(t){const e=Array.from({length:t},(a,n)=>n);for(let a=e.length-1;a>0;a--){const n=Math.floor(Math.random()*(a+1));[e[a],e[n]]=[e[n],e[a]]}return e}function Q(t){try{t.pause(),t.removeAttribute("src"),t.load()}catch{}}class Wt{constructor(e,{volume:a=.14,fadeMs:n=4e3}={}){this.tracks=(e||[]).filter(Boolean),this.base=a,this.fadeMs=n,this.muted=!1,this.master=1,this.paused=!1,this.started=!1,this._order=[],this._pos=0,this._current=null,this._retiring=[],this._ticker=null}get hasTracks(){return this.tracks.length>0}start(){this.started||!this.hasTracks||(this.started=!0,this.paused=!1,this._order=K(this.tracks.length),this._pos=0,this._current=this._open(this._order[0]))}pause(){this.paused=!0,this._live().forEach(e=>e.el.pause())}resume(){this.paused=!1,this._live().forEach(e=>e.el.play().catch(()=>{}))}setMuted(e){this.muted=!!e,this._applyVolumes()}setVolume(e){this.master=Math.min(1,Math.max(0,Number(e)||0)),this._applyVolumes()}stop(){this.started=!1,this._retire(this._current),this._current=null}destroy(){this._stopTicker(),this._live().forEach(e=>Q(e.el)),this._current=null,this._retiring=[],this.started=!1}_live(){return this._current?[this._current,...this._retiring]:[...this._retiring]}_open(e){const a=new Audio(this.tracks[e]);a.preload="auto",a.loop=!1;const n={el:a,gain:0,fade:null};return a.volume=0,a.addEventListener("ended",()=>{n===this._current&&this._advance()},{once:!0}),a.addEventListener("timeupdate",()=>this._maybeCrossfade(n)),this.paused||a.play().catch(()=>{}),this._fade(n,1,this.fadeMs),n}_maybeCrossfade(e){if(e!==this._current)return;const{duration:a,currentTime:n}=e.el;!Number.isFinite(a)||a<=0||(a-n)*1e3>this.fadeMs||this._advance()}_advance(){if(!this.started)return;const e=this._order[this._pos];this._retire(this._current),this._pos++,this._pos>=this._order.length&&(this._order=K(this.tracks.length),this._order.length>1&&this._order[0]===e&&([this._order[0],this._order[1]]=[this._order[1],this._order[0]]),this._pos=0),this._current=this._open(this._order[this._pos])}_retire(e){e&&(this._retiring.push(e),this._fade(e,0,this.fadeMs,()=>{Q(e.el),this._retiring=this._retiring.filter(a=>a!==e)}))}_fade(e,a,n,i){e.fade={from:e.gain,to:a,start:Date.now(),ms:Math.max(1,n),done:i},this._startTicker()}_startTicker(){this._ticker||(this._ticker=setInterval(()=>this._tick(),jt))}_stopTicker(){this._ticker&&(clearInterval(this._ticker),this._ticker=null)}_tick(){const e=Date.now();let a=!1;this._live().forEach(n=>{const i=n.fade;if(!i)return;const r=Math.min(1,(e-i.start)/i.ms);if(n.gain=i.from+(i.to-i.from)*r,r<1){a=!0;return}n.fade=null,i.done?.()}),this._applyVolumes(),a||this._stopTicker()}_applyVolumes(){const e=this.muted?0:this.base*this.master;this._live().forEach(a=>{a.el.volume=Math.min(1,Math.max(0,a.gain*e))})}}function Re(t){if(!t)return null;const e=window.LP_AUDIO?.music;return e?.tracks?.length?new Wt(e.tracks,{volume:e.volume,fadeMs:e.fade_ms}):null}const N=new Map;let R=!1,q=1;function Ht(t){return window.LP_AUDIO?.sfx?.[t]||null}function Z(t){if(N.has(t))return N.get(t);const e=Ht(t);if(!e)return null;const a=new Audio(e);return a.preload="auto",N.set(t,a),a}const qe={setMuted(t){R=!!t},setVolume(t){q=Math.min(1,Math.max(0,Number(t)||0))},get isMuted(){return R},play(t){if(R||q<=0)return;const e=Z(t);if(e)try{e.volume=q,e.currentTime=0,e.play().catch(()=>{})}catch{}},preload(...t){t.forEach(e=>Z(e)?.load())}},Gt=`
<svg data-location-pin viewBox="0 0 21 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="width:clamp(0.55rem, min(3.5cqw, 3cqh), 1.3125rem); height:clamp(0.7rem, min(4.5cqw, 3.9cqh), 1.625rem); flex:none; display:none;">
  <path d="M10.3329 0C4.63543 0 0 4.63543 0 10.3329C0 19.3812 9.58334 25.4792 9.9913 25.735L10.334 25.9493L10.6767 25.735C11.0848 25.4795 20.668 19.3812 20.668 10.3329C20.668 4.63543 16.0326 0 10.3351 0H10.3329ZM10.3329 15.5C7.47996 15.5 5.16584 13.1871 5.16584 10.3329C5.16584 7.47996 7.47872 5.16584 10.3329 5.16584C13.1859 5.16584 15.5 7.47872 15.5 10.3329C15.5 13.1859 13.1871 15.5 10.3329 15.5Z" fill="white"/>
</svg>`,De=t=>t?.config?.show_caption===!0&&String(t?.location??"").trim()!=="",Yt=t=>String(t).replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[e]);function X(t){let e=Yt(t);return e=e.replace(/(\d)(st|nd|rd|th)\b/gi,(a,n,i)=>`${n}<sup style="font-size:0.62em;font-weight:700;vertical-align:0.32em;line-height:0;letter-spacing:0.02em;">${i.toUpperCase()}</sup>`),e=e.replace(/\b(BCE|BC|CE|AD|AH)\b/g,'<span style="font-size:0.5em;font-weight:600;letter-spacing:0.06em;margin-left:0.12em;vertical-align:0.18em;opacity:0.9;">$1</span>'),e}const Vt=4e3;class Fe{constructor(e,{editable:a=!1,onChange:n=null}={}){this.host=e,this.editable=a,this.onChange=n,this.mounted=!1,this._raw={year:"",location:"",title:""},this._sceneId=null}mount(){this.mounted||(this.host.classList.add("scene-overlay"),this.host.style.containerType="size",this.host.innerHTML=`
      <div class="scene-overlay__year absolute flex flex-col" style="left:clamp(0.4rem, min(3cqw, 2.8cqh), 2.5rem); bottom:clamp(0.4rem, min(3cqw, 2.8cqh), 2.5rem); max-width:min(78cqw, 42rem); gap:clamp(0.25rem, min(1.4cqw, 1.2cqh), 0.75rem); transition:opacity 600ms;">
        <div class="scene-overlay__identity" style="display:flex; min-width:0; max-width:100%; align-items:center; gap:clamp(0.3rem, min(1.5cqw, 1.3cqh), 0.75rem);">
          <img data-flag class="scene-overlay__flag" alt="" style="height:clamp(1.2rem, min(8cqw, 6.7cqh), 4rem); width:auto; flex:none; border-radius:5px; box-shadow:0 3px 12px rgba(0,0,0,0.55); display:none;" />
          <span data-title class="scene-overlay__title" style="min-width:0; max-width:100%; overflow-wrap:anywhere; font-family:var(--font-history, inherit); font-size:clamp(0.7rem, min(5cqw, 4.5cqh), 2.5rem); font-weight:800; color:white; line-height:1.05; text-shadow:0 2px 10px rgba(0,0,0,0.65); display:none;"></span>
        </div>
        <div class="scene-overlay__meta" style="display:flex; min-width:0; max-width:100%; align-items:center; gap:clamp(0.3rem, min(1.5cqw, 1.3cqh), 0.75rem); text-shadow:0 2px 4px rgba(0, 0, 0, 0.5);">
          <span data-year style="min-width:0; white-space:nowrap; font-size:clamp(0.9rem, min(8.5cqw, 7.8cqh), 3.75rem); font-weight:800; color:white; line-height:1;"></span>
          <div class="scene-overlay__location" style="display:flex; min-width:0; max-width:100%; align-items:center; gap:clamp(0.2rem, min(1cqw, 0.9cqh), 0.5rem); transition:opacity 600ms;">
            ${Gt}
            <span data-location style="min-width:0; max-width:100%; overflow-wrap:anywhere; font-size:clamp(0.5rem, min(2.6cqw, 2.3cqh), 0.875rem); font-weight:600; color:white; letter-spacing:0.1em; line-height:1.2; text-transform:uppercase;"></span>
          </div>
        </div>
      </div>
    `,this.flagEl=this.host.querySelector("[data-flag]"),this.titleEl=this.host.querySelector("[data-title]"),this.yearEl=this.host.querySelector("[data-year]"),this.locationEl=this.host.querySelector("[data-location]"),this.locationPinEl=this.host.querySelector("[data-location-pin]"),this.yearWrap=this.host.querySelector(".scene-overlay__year"),this.locWrap=this.host.querySelector(".scene-overlay__location"),this.editable&&this._wireEditing(),this.mounted=!0)}_wireEditing(){this.yearWrap.style.pointerEvents="auto",this._editTimer=null;const e=(a,n)=>{clearTimeout(this._editTimer),this._editTimer=setTimeout(()=>this._emit({[a]:n}),500)};this.yearEl.contentEditable="true",this.yearEl.spellcheck=!1,this.yearEl.style.cssText+=" cursor:text; outline:none; border-radius:6px; text-transform:none;",this.yearEl.addEventListener("focus",()=>{this.yearEl.style.boxShadow="0 0 0 1.5px rgba(252,211,77,0.7)",this.yearEl.textContent=this._raw.year}),this.yearEl.addEventListener("input",()=>{this._raw.year=this.yearEl.innerText.trim(),e("year",this._raw.year)}),this.yearEl.addEventListener("blur",()=>{this.yearEl.style.boxShadow="none",this.yearEl.innerHTML=X(this._raw.year)}),this.locationEl.contentEditable="true",this.locationEl.spellcheck=!1,this.locationEl.style.cssText+=" cursor:text; outline:none; border-radius:6px; text-transform:none;",this.locationEl.addEventListener("focus",()=>{this.locationEl.style.boxShadow="0 0 0 1.5px rgba(252,211,77,0.7)",this.locationEl.textContent=this._raw.location}),this.locationEl.addEventListener("input",()=>{this._raw.location=this.locationEl.innerText.trim(),e("location",this._raw.location)}),this.locationEl.addEventListener("blur",()=>{this.locationEl.style.boxShadow="none",this.locationEl.textContent=this._raw.location.toUpperCase()}),this.titleEl.contentEditable="true",this.titleEl.spellcheck=!1,this.titleEl.style.cssText+=" cursor:text; outline:none; border-radius:6px;",this.titleEl.addEventListener("focus",()=>{this.titleEl.style.boxShadow="0 0 0 1.5px rgba(252,211,77,0.7)"}),this.titleEl.addEventListener("input",()=>{this._raw.title=this.titleEl.innerText.trim(),e("title",this._raw.title)}),this.titleEl.addEventListener("blur",()=>{this.titleEl.style.boxShadow="none"});for(const a of[this.titleEl,this.yearEl,this.locationEl])a.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),a.blur())});this.yearWrap.addEventListener("pointerenter",()=>this._show(!1)),this.yearWrap.addEventListener("pointerleave",()=>this._show(!0)),this.yearWrap.addEventListener("focusin",()=>this._show(!1)),this.yearWrap.addEventListener("focusout",()=>this._show(!0))}_show(e){this._idle=!1,this.yearWrap.style.opacity="1",clearTimeout(this._idleTimer),e&&(this._idleTimer=setTimeout(()=>{this.yearWrap.contains(document.activeElement)||(this._idle=!0,this.yearWrap.style.opacity="0")},Vt))}_shownOpacity(){return this.editable&&this._idle?"0":"1"}_emit(e){this.onChange?.({sceneId:this._sceneId,...e})}setHidden(e){this.mounted||this.mount(),this.yearWrap.style.display=e?"none":""}setTerritory({title:e,flagUrl:a}={}){this.mounted||this.mount(),this._raw.title=e||"",e?(this.titleEl.textContent=e,this.titleEl.style.display="inline-block"):this.titleEl.style.display=this.editable?"inline-block":"none",a?(this.flagEl.src=a,this.flagEl.style.display="",this.flagEl.onerror=()=>{this.flagEl.style.display="none"}):this.flagEl.style.display="none"}update({year:e,location:a,sceneId:n,hidden:i}={}){this.mounted||this.mount();const r=n!==void 0&&n!==this._sceneId;n!==void 0&&(this._sceneId=n),this._raw.year=e||"",this._raw.location=String(a??"").trim(),e?(this.yearEl.innerHTML=X(e),this.yearWrap.style.opacity=this._shownOpacity()):(this.yearWrap.style.opacity=this.editable?this._shownOpacity():"0",this.editable&&(this.yearEl.textContent="")),this._raw.location?(this.locationEl.textContent=this._raw.location.toUpperCase(),this.locWrap.style.opacity="1",this.locWrap.style.display="flex",this.locationPinEl.style.display=""):(this.locationEl.textContent="",this.locWrap.style.opacity=this.editable?"1":"0",this.locWrap.style.display=this.editable?"flex":"none",this.locationPinEl.style.display="none"),this.setHidden(!!i),this.editable&&r&&this._show(!0)}destroy(){this.host.innerHTML="",this.mounted=!1}}const J=/^#[0-9a-f]{6}$/i;function ot(t){if(!t||!J.test(t.from??"")||!J.test(t.to??""))return null;const e=(Number(t.angle)%360+360)%360;return{from:t.from,to:t.to,angle:Number.isFinite(e)?e:180}}function ze(t){const e=ot(t);return e?`linear-gradient(${e.angle}deg, ${e.from}, ${e.to})`:""}function Ut(t,e,a){const n=t*Math.PI/180,i=Math.sin(n),r=-Math.cos(n),s=(Math.abs(e*i)+Math.abs(a*r))/2,l=e/2,o=a/2;return{x0:l-i*s,y0:o-r*s,x1:l+i*s,y1:o+r*s}}function Be(t,e=1024,a=576){const n=ot(t);if(!n)return null;const i=document.createElement("canvas");i.width=e,i.height=a;const r=i.getContext("2d"),{x0:s,y0:l,x1:o,y1:c}=Ut(n.angle,e,a),d=r.createLinearGradient(s,l,o,c);return d.addColorStop(0,n.from),d.addColorStop(1,n.to),r.fillStyle=d,r.fillRect(0,0,e,a),i}function je(t,e={}){const a=window.__lpLang,n=a&&typeof a=="object"&&typeof a[t]=="string"?a[t]:t;return Object.keys(e).reduce((i,r)=>i.replaceAll(`:${r}`,String(e[r])),n)}const Kt="pointer-events-none absolute inset-0 z-10 flex items-center justify-center",tt="font-bold leading-none tabular-nums drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]",Qt=160,Zt=500;function et(t,e,a){return typeof t.animate!="function"?Promise.resolve():t.animate(e,a).finished.then(()=>{},()=>{})}function We(t,{text:e="",digitClass:a=""}={}){const n=document.createElement("div");n.dataset.bigCountdown="1",n.className=Kt;let i=a;const r=document.createElement("span");return r.className=`${tt} ${i}`.trim(),r.textContent=String(e),n.appendChild(r),t.appendChild(n),{el:n,digit:r,setText(s,l=i){l!==i&&(i=l,r.className=`${tt} ${i}`.trim());const o=String(s);r.textContent!==o&&(r.textContent=o,et(r,[{opacity:0,transform:"scale(1.18)"},{opacity:1,transform:"scale(1)"}],{duration:Qt,easing:j.enter}))},leave(){return et(n,[{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(0.75)"}],{duration:Zt,easing:j.exit,fill:"forwards"}).then(()=>n.remove())}}}const v={drift:40,breeze:6,bob:5,flutter:18,swell:8,roll:7,billow:1.8,rain:.9,flash:9,spray:7,flicker:2.4,rise:9,oars:2.4};[...Object.keys(v)];const u={swellRise:.008,swellScroll:7.5,rollDeg:1.2,rollLift:.004,plateScale:.05,billowSkew:2.5,billowFill:.025,rainFar:.45,rainNear:.6,flashPeak:.9,sprayRise:.025,sprayGrow:.12,flickerDip:.14,riseLift:.08,riseGrow:.18,oarsDeg:7},Xt=[.25,3],Jt=[0,2],te=[...Object.keys(v).map(t=>`amb-${t}`),"amb-swell-strip"],ee=2.5,ae=(t,e)=>t>0&&e>0&&t/e>=ee,ne=.618033988749895,F="amb-styles",at=(t,[e,a],n)=>Number.isFinite(Number(t))&&t!==null&&t!==""?Math.min(a,Math.max(e,Number(t))):n;function ie(t,e=0){const a=t?.ambient;if(!v[a])return null;const n=at(t.ambient_speed,Xt,1),i=at(t.ambient_amount,Jt,1),r=v[a]/n,s=Number.isFinite(Number(t.asset_id))&&t.asset_id!==null?Number(t.asset_id):e,l=(Math.abs(s)+1)*ne%1;return{mode:a,amount:i,durS:C(r),delayS:C(-l*r)}}const C=t=>Math.round(t*1e3)/1e3;function re(){return typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}function se(t,e,a=0){if(!t)return!1;oe(t),t.__ambLayer=e,t.__ambIndex=a;const n=ie(e,a);return!n||re()?!1:(be(),t.classList.add("amb",`amb-${n.mode}`),t.style.setProperty("--amb-amount",String(n.amount)),t.style.setProperty("--amb-dur",`${n.durS}s`),t.style.setProperty("--amb-delay",`${n.delayS}s`),n.mode==="swell"&&le(t,e,()=>ce(t)),n.mode==="flash"&&lt(t,n),!0)}function oe(t){t.classList.remove("amb",...te);for(const e of["--amb-amount","--amb-dur","--amb-delay"])t.style.removeProperty(e);for(const e of t.querySelectorAll(":scope > .amb-twin"))e.remove();t.__ambFlash&&(clearTimeout(t.__ambFlash),t.__ambFlash=null),t.__ambFlashAnim?.cancel?.(),t.__ambFlashAnim=null}function le(t,e,a){const n=t.querySelector(":scope > img");if(!n)return;const i=()=>{t.__ambLayer!==e||!t.classList.contains("amb-swell")||!(e?.kind==="strip"||ae(n.offsetWidth||n.naturalWidth,n.offsetHeight||n.naturalHeight))||(t.classList.add("amb-swell-strip"),a())};n.complete&&n.naturalWidth?i():n.addEventListener("load",i,{once:!0})}function ce(t){const e=t.querySelector(":scope > img");if(e)for(const a of["amb-twin-mirror","amb-twin-again"]){const n=e.cloneNode(!1);n.classList.add("amb-twin",a),n.alt="",n.setAttribute("aria-hidden","true"),e.style.position!=="absolute"&&(n.style.position="absolute",n.style.left="0",n.style.top="0"),t.appendChild(n)}}function me(t,e=Math.random){return C(t*(.4+1.2*e()))}const he=700;function ue(t=1){const e=1+u.flashPeak*Math.min(1,Math.max(0,t)),a=n=>`brightness(${C(n)})`;return[{filter:a(1),offset:0},{filter:a(e),offset:.08},{filter:a(1+(e-1)*.15),offset:.22},{filter:a(1+(e-1)*.8),offset:.32},{filter:a(1),offset:1}]}const de=1e3;let nt=-1/0;function fe(t=Date.now()){return t-nt<de?!1:(nt=t,!0)}function lt(t,e){t.__ambFlash=setTimeout(()=>{if(!t.isConnected){t.__ambFlash=null;return}fe()&&(t.__ambFlashAnim=t.animate(ue(e.amount),{duration:he,easing:"cubic-bezier(0.333, 0, 0.667, 0)"})),lt(t,e)},me(e.durS)*1e3)}function pe(t=document){for(const e of t.querySelectorAll(".amb"))se(e,e.__ambLayer,e.__ambIndex)}function He(t){if(!t)return null;const e=(i,r)=>{t.style.setProperty("--amb-sw",`${Math.round(i)}px`),t.style.setProperty("--amb-sh",`${Math.round(r)}px`)},a=t.getBoundingClientRect();if(a.width&&e(a.width,a.height),typeof ResizeObserver!="function")return null;const n=new ResizeObserver(([i])=>e(i.contentRect.width,i.contentRect.height));return n.observe(t),n}const L="var(--amb-sw, 100vw)",y="var(--amb-sh, 100vh)",m="var(--amb-amount, 1)",w=(t=1)=>`calc(var(--amb-dur, 6s) * ${t/2})`,ct=()=>`
  .amb {
    will-change: transform;
    animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-delay: var(--amb-delay, 0s);
  }
  @keyframes amb-drift-x {
    from { translate: calc(${L} * -0.025 * ${m}) 0; }
    to   { translate: calc(${L} * 0.025 * ${m}) 0; }
  }
  @keyframes amb-drift-y {
    from { transform: translateY(calc(${y} * -0.003 * ${m})); }
    to   { transform: translateY(calc(${y} * 0.003 * ${m})); }
  }
  .amb-drift { animation-name: amb-drift-x, amb-drift-y; animation-duration: ${w()}, ${w(.33)}; }

  @keyframes amb-breeze {
    from { transform: skewX(calc(-1.2deg * ${m})) rotate(calc(-0.4deg * ${m})); }
    to   { transform: skewX(calc(1.2deg * ${m})) rotate(calc(0.4deg * ${m})); }
  }
  @keyframes amb-leaf {
    from { rotate: calc(-0.2deg * ${m}); }
    to   { rotate: calc(0.2deg * ${m}); }
  }
  .amb-breeze {
    transform-origin: 50% 100%;
    animation-name: amb-breeze, amb-leaf;
    animation-duration: ${w()}, ${w(1.7/6)};
  }

  @keyframes amb-bob {
    from { transform: translateY(calc(${y} * -0.006 * ${m})) rotate(calc(-0.5deg * ${m})); }
    to   { transform: translateY(calc(${y} * 0.006 * ${m})) rotate(calc(0.5deg * ${m})); }
  }
  .amb-bob { animation-name: amb-bob; animation-duration: ${w()}; }

  @keyframes amb-flutter-x {
    from { translate: calc(${L} * -0.04 * ${m}) 0; }
    to   { translate: calc(${L} * 0.04 * ${m}) 0; }
  }
  .amb-flutter { animation-name: amb-flutter-x, amb-bob; animation-duration: ${w()}, ${w(5/18)}; }

  /* swell: the wrapper rises and falls; the picture, its mirror and itself again scroll two widths,
     linearly (one width per swellScroll periods) */
  @keyframes amb-swell {
    from { transform: translateY(calc(${y} * -${u.swellRise} * ${m})); }
    to   { transform: translateY(calc(${y} * ${u.swellRise} * ${m})); }
  }
  .amb-swell { animation-name: amb-swell; animation-duration: ${w()}; }
  .amb-swell-strip { overflow: hidden; }
  @keyframes amb-swell-scroll { from { translate: 0 0; } to { translate: calc(-200% * var(--amb-scale, 1)) 0; } }
  @keyframes amb-swell-mirror { from { translate: calc(100% * var(--amb-scale, 1)) 0; } to { translate: calc(-100% * var(--amb-scale, 1)) 0; } }
  @keyframes amb-swell-again { from { translate: calc(200% * var(--amb-scale, 1)) 0; } to { translate: 0 0; } }
  .amb-swell-strip > img {
    animation: amb-swell-scroll calc(var(--amb-dur, 8s) * ${u.swellScroll*2}) linear infinite;
    animation-delay: var(--amb-delay, 0s);
  }
  .amb-swell-strip > img.amb-twin-mirror { animation-name: amb-swell-mirror; scale: -1 1; }
  .amb-swell-strip > img.amb-twin-again { animation-name: amb-swell-again; }

  /* roll: pitch about the waterline; a full plate rolls about its middle, scaled past its edges */
  @keyframes amb-roll {
    from { transform: translateY(calc(${y} * -${u.rollLift} * ${m})) rotate(calc(-${u.rollDeg}deg * ${m})); }
    to   { transform: translateY(calc(${y} * ${u.rollLift} * ${m})) rotate(calc(${u.rollDeg}deg * ${m})); }
  }
  .amb-roll { animation-name: amb-roll; animation-duration: ${w()}; transform-origin: 50% 100%; }
  .amb-roll[data-amb-plate] { transform-origin: 50% 50% !important; scale: calc(1 + ${u.plateScale} * ${m}); }

  /* billow: cloth ripples away from its hoist (the left edge) */
  @keyframes amb-billow {
    from { transform: skewY(calc(-${u.billowSkew}deg * ${m})); }
    to   { transform: skewY(calc(${u.billowSkew}deg * ${m})); }
  }
  @keyframes amb-billow-fill {
    from { scale: calc(1 - ${u.billowFill} * ${m}) 1; }
    to   { scale: 1 1; }
  }
  .amb-billow {
    animation-name: amb-billow, amb-billow-fill;
    animation-duration: ${w()}, ${w(.62)};
    transform-origin: 0% 50% !important;
  }

  /* rain: two depths of slanted streaks drawn here, falling at a constant rate (linear is the
     physics). The far streaks show from any amount; the near ones join past amount 0.5. */
  /* Only these two lay something out over their box (the swell's copies, the rain's streaks), so
     only they are positioned. An inline position (ParallaxScene's absolute wrapper) still wins. */
  .amb-swell, .amb-rain { position: relative; }
  .amb-rain { overflow: hidden; }   /* the streaks stay inside their layer */
  .amb-rain::before, .amb-rain::after {
    content: ''; position: absolute; pointer-events: none;
    background-image: ${we};
    animation-timing-function: linear; animation-iteration-count: infinite;
  }
  .amb-rain::before {
    inset: -${f.h*f.far}px -${f.w*f.far}px 0 0;
    background-size: ${f.w*f.far}px ${f.h*f.far}px;
    opacity: calc(min(1, ${m}) * ${u.rainFar});
    animation-name: amb-rain-far; animation-duration: calc(var(--amb-dur, 0.9s) * 1.5);
  }
  .amb-rain::after {
    inset: -${f.h}px -${f.w}px 0 0;
    background-size: ${f.w}px ${f.h}px;
    opacity: calc(max(0, ${m} - 0.5) * ${u.rainNear});
    animation-name: amb-rain-near; animation-duration: var(--amb-dur, 0.9s);
  }
  @keyframes amb-rain-far { from { transform: translate(0, 0); } to { transform: translate(-${f.w*f.far}px, ${f.h*f.far}px); } }
  @keyframes amb-rain-near { from { transform: translate(0, 0); } to { transform: translate(-${f.w}px, ${f.h}px); } }

  /* flash: played from JS at random gaps; the class only marks the layer */
  .amb-flash { animation: none; }

  /* spray: a burst, then nothing for the rest of the period */
  @keyframes amb-spray {
    0%   { opacity: 0; transform: translateY(0) scale(calc(1 - ${u.sprayGrow} * ${m})); }
    6%   { opacity: 1; }
    22%  { opacity: 0.9; transform: translateY(calc(${y} * -${u.sprayRise} * ${m})) scale(calc(1 + ${u.sprayGrow} * 0.5 * ${m})); }
    40%, 100% { opacity: 0; transform: translateY(calc(${y} * -${u.sprayRise} * 1.2 * ${m})) scale(calc(1 + ${u.sprayGrow} * ${m})); }
  }
  .amb-spray {
    animation-name: amb-spray; animation-duration: var(--amb-dur, 7s); animation-direction: normal;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* flicker: irregular dips in a light's opacity */
  @keyframes amb-flicker {
    0%, 52%, 100% { opacity: 1; }
    13% { opacity: calc(1 - ${u.flickerDip} * 0.6 * ${m}); }
    21% { opacity: calc(1 - ${u.flickerDip} * 0.2 * ${m}); }
    38% { opacity: calc(1 - ${u.flickerDip} * ${m}); }
    67% { opacity: calc(1 - ${u.flickerDip} * 0.4 * ${m}); }
    81% { opacity: calc(1 - ${u.flickerDip} * 0.8 * ${m}); }
  }
  .amb-flicker { animation-name: amb-flicker; animation-duration: var(--amb-dur, 2.4s); animation-direction: normal; }

  /* rise: a smoke puff climbs, grows and thins out; gas decelerates and never overshoots */
  @keyframes amb-rise {
    0%   { opacity: 0; transform: translateY(0) scale(1); }
    20%  { opacity: 1; }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(calc(${y} * -${u.riseLift} * ${m})) scale(calc(1 + ${u.riseGrow} * ${m})); }
  }
  .amb-rise {
    animation-name: amb-rise; animation-duration: var(--amb-dur, 9s); animation-direction: normal;
    animation-timing-function: cubic-bezier(0.333, 1, 0.667, 1);
  }

  /* oars: a slow pull, a quicker recovery, about the grip */
  @keyframes amb-oars {
    0%, 100% { transform: rotate(calc(-${u.oarsDeg}deg * ${m})); }
    60%      { transform: rotate(calc(${u.oarsDeg}deg * ${m})); }
  }
  .amb-oars {
    animation-name: amb-oars; animation-duration: var(--amb-dur, 2.4s); animation-direction: normal;
    transform-origin: 50% 15% !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .amb, .amb::before, .amb::after, .amb > img { animation: none !important; }
  }
`,f={w:90,h:270,far:.6},ye=[[22,14,24,.7,.55,.8],[61,38,15,.5,.35,-.5],[80,77,28,.8,.6,.6],[41,96,12,.5,.3,.3],[17,131,21,.6,.5,-.7],[70,150,18,.7,.42,.4],[50,189,26,.6,.52,-.4],[30,214,14,.5,.33,.6],[77,229,20,.7,.46,-.3]],we=(()=>{const t=-90/f.h,e=([n,i,r,s,l,o])=>{const c=C(n+t*r),d=C((n+c)/2+o);return`<path d='M${n} ${i} Q${d} ${i+r/2} ${c} ${i+r}' stroke-width='${s}' stroke-opacity='${l}'/>`},a=`<svg xmlns='http://www.w3.org/2000/svg' width='${f.w}' height='${f.h}'><g fill='none' stroke='rgb(198,202,206)' stroke-linecap='round'>`+ye.map(e).join("")+"</g></svg>";return`url("data:image/svg+xml,${encodeURIComponent(a)}")`})();function be(){if(document.getElementById(F))return;const t=document.createElement("style");t.id=F,t.textContent=ct(),document.head.appendChild(t),ge()}let it=null;function ge(){if(it||typeof window>"u"||!window.__tune?.register)return;const t=()=>{const e=document.getElementById(F);e&&(e.textContent=ct())};it=window.__tune.register("World motion",[...Object.keys(v).map(e=>({key:`period_${e}`,label:`${e} period (s)`,min:.2,max:Math.max(60,v[e]*3),step:.1,value:v[e],apply:a=>{v[e]=Number(a),pe()}})),...Object.keys(u).map(e=>({key:e,label:e,min:0,max:Math.max(.1,u[e]*4),step:u[e]>=1?.1:.001,value:u[e],apply:a=>{u[e]=Number(a),t()}}))],{tab:"Lesson"})??null}export{Ee as A,Wt as B,Se as C,Me as D,Zt as E,xe as P,qe as S,se as a,je as b,De as c,Oe as d,Re as e,Pe as f,ze as g,ke as h,Ae as i,Ne as j,Be as k,ve as l,We as m,mt as n,Fe as o,Ie as p,qt as q,Rt as r,W as s,He as t,rt as u,Le as v,It as w,dt as x,Ce as y,Te as z};
