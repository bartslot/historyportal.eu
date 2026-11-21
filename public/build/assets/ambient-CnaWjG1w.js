const G=["waterline","reflection","contact_shadow","color_match","foam","speed"],U=G.filter(t=>t!=="speed"),K=[70,72,80],b={waveAmp:1.6,waveDriftS:18,reflectionTint:.6,reflectionBands:7,shadowHeight:.1,shadowDark:.45,shadowOpacity:.85,foamHeight:.07,foamTint:.14,foamDusk:.4,foamChurnPx:10,bowWidth:.22,bowHeight:.2,wakePatches:6,wakeRun:4},g=t=>Number.isFinite(Number(t))&&t!==null&&t!==""?Math.min(1,Math.max(0,Number(t))):0,l=(t,a=3)=>Math.round(t*10**a)/10**a;function Z(t){const a=Object.fromEntries(G.map(e=>[e,g(t?.[e])]));return U.some(e=>a[e]>0)?a:null}function F(t,a,e,n){return e>0&&n>0?n>e?[.5+(t-.5)*(e/n),a]:[t,.5+(a-.5)*(n/e)]:[t,a]}const O=({x0:t,y0:a,x1:e,y1:n})=>({x0:Math.max(0,Math.min(1,t)),y0:Math.max(0,Math.min(1,a)),x1:Math.max(0,Math.min(1,e)),y1:Math.max(0,Math.min(1,n))});function V({x:t,y:a,w:e,h:n},r=0){const o=a+n*(1-r);return{around:O({x0:t-e*.3,y0:a-n*.15,x1:t+e*1.3,y1:a+n*1.15}),below:O({x0:t+e*.1,y0:o,x1:t+e*.9,y1:o+n*.25})}}function X(t,a,e,n){const r=Math.floor(n.x0*a),o=Math.max(r+1,Math.ceil(n.x1*a)),s=Math.floor(n.y0*e),c=Math.max(s+1,Math.ceil(n.y1*e));let f=0,u=0,h=0,$=0;for(let _=s;_<Math.min(c,e);_++)for(let P=r;P<Math.min(o,a);P++){const x=(_*a+P)*4;t[x+3]<8||(f+=t[x],u+=t[x+1],h+=t[x+2],$++)}return $?[Math.round(f/$),Math.round(u/$),Math.round(h/$)]:null}function J(t,a){const e=g(a),n=t.map(s=>Math.min(255,Math.max(0,s))/255),r=Math.max(...n,1/255),o=n.map(s=>l(1-e+e*(.5*s/r+.5*s)));return`${o[0]} 0 0 0 0 0 ${o[1]} 0 0 0 0 0 ${o[2]} 0 0 0 0 0 1 0`}const tt=(t,a)=>`rgb(${t.map(e=>Math.round(e*a)).join(", ")})`,R=t=>`url("data:image/svg+xml,${encodeURIComponent(t)}")`;function at(t,a=b.waveAmp){const e=l(100*(1-g(t)),2),n=o=>l(e+o*a,2),r=`M0 0H100V${e}Q87.5 ${n(1)} 75 ${e}T50 ${e}Q37.5 ${n(-.7)} 25 ${e}T0 ${e}Z`;return R(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${r}' fill='#000'/></svg>`)}function et(t=b.reflectionBands){const a=Math.max(1,Math.round(t)),e=60/a,n=Array.from({length:a},(r,o)=>{const s=l(((a-o)/a)**1.4,3),c=l(o%2*3+o*1.5,1);return`<rect x='${c}' y='${l(o*e,2)}' width='${l(100-c*1.7,1)}' height='${l(e*.78,2)}' fill-opacity='${s}'/>`});return R(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><g fill='#000'>${n.join("")}</g></svg>`)}const I=(t,a,e)=>t.map((n,r)=>Math.round(n+(a[r]-n)*e)),nt=[250,249,244],rt=[168,182,196];function ot(t,a=b.foamTint){const e=(.2126*t[0]+.7152*t[1]+.0722*t[2])/255,n=Math.min(.75,a+b.foamDusk*(1-e));return{fill:I(nt,t,n),rim:I(rt,t,Math.min(.85,n*1.5))}}const k=t=>(Math.sin(t*12.9898)*43758.5453%1+1)%1,S=t=>`rgb(${t.join(",")})`;function it(){const t=[];let a=4,e=0;for(;a<196;){const n=2+Math.floor(k(e+500)*3);for(let r=0;r<n&&a<196;r++,e++){const o=a/196,s=l(2+4*o*o+k(e+40)*1.6,2);t.push(`<ellipse cx='${l(a,2)}' cy='${l(10+(k(e+80)-.5)*2.4,2)}' rx='${l(3+k(e+120)*2.2,2)}' ry='${s}'/>`),a+=5+k(e)*3}a+=5+k(e+600)*9}return R(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 20' preserveAspectRatio='none'><g fill='#000'>${t.join("")}</g></svg>`)}function st(t){const a=["M2 7 Q8 5 14 7","M19 9 Q24 7.5 29 9.5","M33 6 Q36 5 39 6.5"];return R(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='12' viewBox='0 0 40 12'><g fill='none' stroke='${S(t)}' stroke-width='0.6' stroke-linecap='round' stroke-opacity='0.7'>${a.map(e=>`<path d='${e}'/>`).join("")}</g></svg>`)}function lt(t,a){const e="M8 34 C12 24 20 18 30 17 C36 17 40 21 38 26 C42 25 46 28 44 33 Z",n="M0 36 C4 26 10 15 20 9 C26 5 34 4 40 8 C44 11 43 15 39 15 C45 15 51 19 50 24 C55 24 60 29 57 34 C52 37 46 33 42 37 C36 33 30 38 24 35 C16 39 8 35 0 36 Z",r=["M14 22 C20 14 28 10 36 10","M26 25 C32 20 40 19 47 23","M30 33 C37 30 44 30 51 32"];return R(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40' preserveAspectRatio='none'><path d='${e}' fill='${S(I(t,a,.25))}'/><path d='${n}' fill='${S(t)}'/><g fill='none' stroke='${S(a)}' stroke-width='0.7' stroke-linecap='round' stroke-opacity='0.75'>${r.map(o=>`<path d='${o}'/>`).join("")}</g></svg>`)}function ct(t,a,e=0){const n=Array.from({length:7},(o,s)=>{const c=s/7*Math.PI*2,f=.72+k(e*11+s)*.28;return[l(20+Math.cos(c)*19*f,2),l(8+Math.sin(c)*7*f,2)]}),r=`M${n[0].join(" ")} `+n.slice(1).map(([o,s],c)=>`Q${l((n[c][0]+o)/2+(k(e+c+60)-.5)*4,2)} ${l((n[c][1]+s)/2,2)} ${o} ${s}`).join(" ")+" Z";return R(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 16' preserveAspectRatio='none'><path d='${r}' fill='${S(t)}'/><path d='M${n[4].join(" ")} Q20 15 ${n[1].join(" ")}' fill='none' stroke='${S(a)}' stroke-width='0.7' stroke-opacity='0.7'/></svg>`)}function mt(t,a){const e=g(a);return e>0&&t>0?l((.5+.5*g(t))*(.45+.55*e),3):0}function Yt(t,a){if(!t)return null;const{data:e,width:n,height:r}=t,o=Math.min(r-1,Math.round(a*r)-1),s=Math.max(0,o-Math.max(1,Math.round(r*.06)));let c=n,f=-1;for(let u=s;u<=o;u++)for(let h=0;h<n;h++)e[(u*n+h)*4+3]<128||(h<c&&(c=h),h>f&&(f=h));return f<0?null:[l(c/n),l((f+1)/n)]}const ft=[.06,.94],ut=t=>l(.35+.65*g(t),3);function dt(t,a,e=b.wakePatches){const n=g(a),r=Math.max(0,Math.round(e));return Array.from({length:r},(o,s)=>({op:l(g(n*r-s)*(g(t)>0?1:0)*(1-s/(r+2)),3),run:l(1.5+b.wakeRun*n,2)}))}const j=96,E=new Map;function Bt(t){return t?(E.has(t)||E.set(t,new Promise(a=>{const e=new Image;e.crossOrigin="anonymous",e.onload=()=>{try{const n=e.naturalWidth/e.naturalHeight,r=j,o=Math.max(1,Math.round(j/n)),s=document.createElement("canvas");s.width=r,s.height=o;const c=s.getContext("2d",{willReadFrequently:!0});c.drawImage(e,0,0,r,o),a({data:c.getImageData(0,0,r,o).data,width:r,height:o,aspect:n})}catch{a(null)}},e.onerror=()=>a(null),e.src=t})),E.get(t)):Promise.resolve(null)}function Ht(t,a,e,n=0){if(!t)return null;const r=c=>{const[f,u]=F(c.x0,c.y0,e,t.aspect),[h,$]=F(c.x1,c.y1,e,t.aspect);return X(t.data,t.width,t.height,{x0:f,y0:u,x1:h,y1:$})},{around:o,below:s}=V(a,n);return{around:r(o),below:r(s)}}const z="sit-styles";function bt(){if(document.getElementById(z))return;const t=document.createElement("style");t.id=z,t.textContent=`
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
  `,document.head.appendChild(t)}function Wt(t,a,e,n,r=null){for(const f of t.querySelectorAll(":scope > .sit-reflection, :scope > .sit-shadow, .sit-foam, .sit-bow, .sit-wake"))f.remove();e.classList.remove("sit-waterline"),e.style.removeProperty("mask-image");const o=Z(n);if(!o)return null;bt();const s=r?.below??K,c=1-o.waterline;if(o.waterline>0&&(e.classList.add("sit-waterline"),e.style.maskImage=at(o.waterline),e.style.setProperty("--sit-drift",`${b.waveDriftS}s`)),o.foam>0&&ht(a,n,o,c,s,r),o.contact_shadow>0){const f=b.shadowHeight*100,u=document.createElement("div");u.className="sit-shadow",u.setAttribute("aria-hidden","true"),u.style.cssText=`left:8%; width:84%; height:${f}%; top:calc(${l(c*100,2)}% - ${f/2}%);
      background:radial-gradient(closest-side, ${tt(s,b.shadowDark)} 68%, transparent 100%);
      opacity:${l(o.contact_shadow*b.shadowOpacity)};`,t.insertBefore(u,t.firstChild)}if(o.reflection>0){const f=document.createElement("div");f.className="sit-reflection",f.setAttribute("aria-hidden","true"),f.style.cssText=`left:0; top:${l(c*100,2)}%; width:100%; height:100%; overflow:hidden;
      opacity:${o.reflection}; mask-image:${et()}; mask-size:100% 100%; mask-repeat:no-repeat;`;const u=document.createElement("img");u.src=e.src,u.alt="",u.draggable=!1,u.style.cssText=`position:absolute; left:0; top:${l(-o.waterline*100,2)}%; height:100%;
      width:${Number.isFinite(n.width)?"100%":"auto"}; transform:scaleY(-1); display:block;`,u.style.filter=wt(t,`sitfx-r-${n.asset_id}`,s,b.reflectionTint),f.appendChild(u),t.insertBefore(f,a)}return o}function ht(t,a,e,n,r,o){const{fill:s,rim:c}=ot(r),f=l(n*100,2),u=(y,A)=>{const M=document.createElement("div");return M.className=y,M.setAttribute("aria-hidden","true"),M.style.cssText=A,t.appendChild(M),M};t.style.position||(t.style.position="relative");const[h,$]=(o?.hull??ft).map(y=>l(y*100,2)),_=l(b.foamHeight*100*(.6+.4*e.foam),2);u("sit-foam",`left:${l(h-1,2)}%; width:${l($-h+2,2)}%;
    height:calc(var(--sit-band-k, 1) * ${_}%); top:calc(${f}% - var(--sit-band-k, 1) * ${_/2}%);
    background-color:${S(s)}; background-image:${st(c)}; mask-image:${it()};`).style.setProperty("--sit-churn",`${b.foamChurnPx}px`);const x=b.bowWidth*100,N=b.bowHeight*100;u("sit-bow",`left:calc(${$}% - var(--sit-bow-k, 0) * ${l(x*.35,2)}%); width:calc(var(--sit-bow-k, 0) * ${x}%);
    height:calc(var(--sit-bow-k, 0) * ${N}%); top:calc(${f}% - var(--sit-bow-k, 0) * ${l(N*.85,2)}%);
    background-image:${lt(s,c)};`);const D=Math.max(0,Math.round(b.wakePatches));for(let y=0;y<D;y++){const A=l(10-y%3*1.5,2),M=y%2?1:-1;u("sit-wake",`left:${l(h-A*.6,2)}%; width:${A}%; height:${l(A*.4,2)}%;
      top:calc(${f}% - ${l(A*.2,2)}%); background-image:${ct(s,c,y)};
      animation-delay:calc(var(--amb-dur, 6s) * ${l(-1.4*y/D,3)});`).style.setProperty("--sit-wake-side",String(M))}pt(t,e.foam,e.speed)}function pt(t,a,e){if(!t)return;t.style.setProperty("--sit-bow-k",String(mt(a,e))),t.style.setProperty("--sit-band-k",String(ut(e)));const n=dt(a,e);t.querySelectorAll(":scope > .sit-wake").forEach((r,o)=>{r.style.setProperty("--sit-wake-op",String(n[o]?.op??0)),r.style.setProperty("--sit-wake-run",String(n[o]?.run??0))})}function wt(t,a,e,n){let r=t.querySelector(`#${a}`)?.closest("svg");return r||(r=document.createElementNS("http://www.w3.org/2000/svg","svg"),r.setAttribute("aria-hidden","true"),r.style.cssText="position:absolute; width:0; height:0; pointer-events:none;",t.appendChild(r)),r.innerHTML=`<defs><filter id="${a}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${J(e,n)}"/></filter></defs>`,`url(#${a})`}let Y=null;function Gt(t){Y||typeof window>"u"||!window.__tune?.register||(Y=window.__tune.register("Blend into scene",Object.keys(b).map(a=>({key:a,label:a,min:0,max:Math.max(1,b[a]*3),step:b[a]>=2?.5:.01,value:b[a],apply:e=>{b[a]=Number(e),t?.()}})),{tab:"Lesson"})??null)}const v={drift:40,breeze:6,bob:5,flutter:18,swell:8,roll:7,billow:1.8,rain:.9,flash:9,spray:7,flicker:2.4,rise:9,oars:2.4};[...Object.keys(v)];const m={swellRise:.008,swellScroll:7.5,rollDeg:1.2,rollLift:.004,plateScale:.05,billowSkew:2.5,billowFill:.025,rainFar:.45,rainNear:.6,flashPeak:.9,sprayRise:.025,sprayGrow:.12,flickerDip:.14,riseLift:.08,riseGrow:.18,oarsDeg:7},$t=[.25,3],yt=[0,2],gt=[...Object.keys(v).map(t=>`amb-${t}`),"amb-swell-strip"],kt=2.5,vt=(t,a)=>t>0&&a>0&&t/a>=kt,xt=.618033988749895,T="amb-styles",B=(t,[a,e],n)=>Number.isFinite(Number(t))&&t!==null&&t!==""?Math.min(e,Math.max(a,Number(t))):n;function Mt(t,a=0){const e=t?.ambient;if(!v[e])return null;const n=B(t.ambient_speed,$t,1),r=B(t.ambient_amount,yt,1),o=v[e]/n,s=Number.isFinite(Number(t.asset_id))&&t.asset_id!==null?Number(t.asset_id):a,c=(Math.abs(s)+1)*xt%1;return{mode:e,amount:r,durS:C(o),delayS:C(-c*o)}}const C=t=>Math.round(t*1e3)/1e3;function St(){return typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}function _t(t,a,e=0){if(!t)return!1;At(t),t.__ambLayer=a,t.__ambIndex=e;const n=Mt(a,e);return!n||St()?!1:(Ot(),t.classList.add("amb",`amb-${n.mode}`),t.style.setProperty("--amb-amount",String(n.amount)),t.style.setProperty("--amb-dur",`${n.durS}s`),t.style.setProperty("--amb-delay",`${n.delayS}s`),n.mode==="swell"&&Ct(t,a,()=>Rt(t)),n.mode==="flash"&&q(t,n),!0)}function At(t){t.classList.remove("amb",...gt);for(const a of["--amb-amount","--amb-dur","--amb-delay"])t.style.removeProperty(a);for(const a of t.querySelectorAll(":scope > .amb-twin"))a.remove();t.__ambFlash&&(clearTimeout(t.__ambFlash),t.__ambFlash=null),t.__ambFlashAnim?.cancel?.(),t.__ambFlashAnim=null}function Ct(t,a,e){const n=t.querySelector(":scope > img");if(!n)return;const r=()=>{t.__ambLayer!==a||!t.classList.contains("amb-swell")||!(a?.kind==="strip"||vt(n.offsetWidth||n.naturalWidth,n.offsetHeight||n.naturalHeight))||(t.classList.add("amb-swell-strip"),e())};n.complete&&n.naturalWidth?r():n.addEventListener("load",r,{once:!0})}function Rt(t){const a=t.querySelector(":scope > img");if(a)for(const e of["amb-twin-mirror","amb-twin-again"]){const n=a.cloneNode(!1);n.classList.add("amb-twin",e),n.alt="",n.setAttribute("aria-hidden","true"),a.style.position!=="absolute"&&(n.style.position="absolute",n.style.left="0",n.style.top="0"),t.appendChild(n)}}function Pt(t,a=Math.random){return C(t*(.4+1.2*a()))}const Lt=700;function Et(t=1){const a=1+m.flashPeak*Math.min(1,Math.max(0,t)),e=n=>`brightness(${C(n)})`;return[{filter:e(1),offset:0},{filter:e(a),offset:.08},{filter:e(1+(a-1)*.15),offset:.22},{filter:e(1+(a-1)*.8),offset:.32},{filter:e(1),offset:1}]}const It=1e3;let H=-1/0;function Tt(t=Date.now()){return t-H<It?!1:(H=t,!0)}function q(t,a){t.__ambFlash=setTimeout(()=>{if(!t.isConnected){t.__ambFlash=null;return}Tt()&&(t.__ambFlashAnim=t.animate(Et(a.amount),{duration:Lt,easing:"cubic-bezier(0.333, 0, 0.667, 0)"})),q(t,a)},Pt(a.durS)*1e3)}function Nt(t=document){for(const a of t.querySelectorAll(".amb"))_t(a,a.__ambLayer,a.__ambIndex)}function qt(t){if(!t)return null;const a=(r,o)=>{t.style.setProperty("--amb-sw",`${Math.round(r)}px`),t.style.setProperty("--amb-sh",`${Math.round(o)}px`)},e=t.getBoundingClientRect();if(e.width&&a(e.width,e.height),typeof ResizeObserver!="function")return null;const n=new ResizeObserver(([r])=>a(r.contentRect.width,r.contentRect.height));return n.observe(t),n}const L="var(--amb-sw, 100vw)",p="var(--amb-sh, 100vh)",i="var(--amb-amount, 1)",w=(t=1)=>`calc(var(--amb-dur, 6s) * ${t/2})`,Q=()=>`
  .amb {
    will-change: transform;
    animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-delay: var(--amb-delay, 0s);
  }
  @keyframes amb-drift-x {
    from { translate: calc(${L} * -0.025 * ${i}) 0; }
    to   { translate: calc(${L} * 0.025 * ${i}) 0; }
  }
  @keyframes amb-drift-y {
    from { transform: translateY(calc(${p} * -0.003 * ${i})); }
    to   { transform: translateY(calc(${p} * 0.003 * ${i})); }
  }
  .amb-drift { animation-name: amb-drift-x, amb-drift-y; animation-duration: ${w()}, ${w(.33)}; }

  @keyframes amb-breeze {
    from { transform: skewX(calc(-1.2deg * ${i})) rotate(calc(-0.4deg * ${i})); }
    to   { transform: skewX(calc(1.2deg * ${i})) rotate(calc(0.4deg * ${i})); }
  }
  @keyframes amb-leaf {
    from { rotate: calc(-0.2deg * ${i}); }
    to   { rotate: calc(0.2deg * ${i}); }
  }
  .amb-breeze {
    transform-origin: 50% 100%;
    animation-name: amb-breeze, amb-leaf;
    animation-duration: ${w()}, ${w(1.7/6)};
  }

  @keyframes amb-bob {
    from { transform: translateY(calc(${p} * -0.006 * ${i})) rotate(calc(-0.5deg * ${i})); }
    to   { transform: translateY(calc(${p} * 0.006 * ${i})) rotate(calc(0.5deg * ${i})); }
  }
  .amb-bob { animation-name: amb-bob; animation-duration: ${w()}; }

  @keyframes amb-flutter-x {
    from { translate: calc(${L} * -0.04 * ${i}) 0; }
    to   { translate: calc(${L} * 0.04 * ${i}) 0; }
  }
  .amb-flutter { animation-name: amb-flutter-x, amb-bob; animation-duration: ${w()}, ${w(5/18)}; }

  /* swell: the wrapper rises and falls; the picture, its mirror and itself again scroll two widths,
     linearly (one width per swellScroll periods) */
  @keyframes amb-swell {
    from { transform: translateY(calc(${p} * -${m.swellRise} * ${i})); }
    to   { transform: translateY(calc(${p} * ${m.swellRise} * ${i})); }
  }
  .amb-swell { animation-name: amb-swell; animation-duration: ${w()}; }
  .amb-swell-strip { overflow: hidden; }
  @keyframes amb-swell-scroll { from { translate: 0 0; } to { translate: calc(-200% * var(--amb-scale, 1)) 0; } }
  @keyframes amb-swell-mirror { from { translate: calc(100% * var(--amb-scale, 1)) 0; } to { translate: calc(-100% * var(--amb-scale, 1)) 0; } }
  @keyframes amb-swell-again { from { translate: calc(200% * var(--amb-scale, 1)) 0; } to { translate: 0 0; } }
  .amb-swell-strip > img {
    animation: amb-swell-scroll calc(var(--amb-dur, 8s) * ${m.swellScroll*2}) linear infinite;
    animation-delay: var(--amb-delay, 0s);
  }
  .amb-swell-strip > img.amb-twin-mirror { animation-name: amb-swell-mirror; scale: -1 1; }
  .amb-swell-strip > img.amb-twin-again { animation-name: amb-swell-again; }

  /* roll: pitch about the waterline; a full plate rolls about its middle, scaled past its edges */
  @keyframes amb-roll {
    from { transform: translateY(calc(${p} * -${m.rollLift} * ${i})) rotate(calc(-${m.rollDeg}deg * ${i})); }
    to   { transform: translateY(calc(${p} * ${m.rollLift} * ${i})) rotate(calc(${m.rollDeg}deg * ${i})); }
  }
  .amb-roll { animation-name: amb-roll; animation-duration: ${w()}; transform-origin: 50% 100%; }
  .amb-roll[data-amb-plate] { transform-origin: 50% 50% !important; scale: calc(1 + ${m.plateScale} * ${i}); }

  /* billow: cloth ripples away from its hoist (the left edge) */
  @keyframes amb-billow {
    from { transform: skewY(calc(-${m.billowSkew}deg * ${i})); }
    to   { transform: skewY(calc(${m.billowSkew}deg * ${i})); }
  }
  @keyframes amb-billow-fill {
    from { scale: calc(1 - ${m.billowFill} * ${i}) 1; }
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
    background-image: ${Ft};
    animation-timing-function: linear; animation-iteration-count: infinite;
  }
  .amb-rain::before {
    inset: -${d.h*d.far}px -${d.w*d.far}px 0 0;
    background-size: ${d.w*d.far}px ${d.h*d.far}px;
    opacity: calc(min(1, ${i}) * ${m.rainFar});
    animation-name: amb-rain-far; animation-duration: calc(var(--amb-dur, 0.9s) * 1.5);
  }
  .amb-rain::after {
    inset: -${d.h}px -${d.w}px 0 0;
    background-size: ${d.w}px ${d.h}px;
    opacity: calc(max(0, ${i} - 0.5) * ${m.rainNear});
    animation-name: amb-rain-near; animation-duration: var(--amb-dur, 0.9s);
  }
  @keyframes amb-rain-far { from { transform: translate(0, 0); } to { transform: translate(-${d.w*d.far}px, ${d.h*d.far}px); } }
  @keyframes amb-rain-near { from { transform: translate(0, 0); } to { transform: translate(-${d.w}px, ${d.h}px); } }

  /* flash: played from JS at random gaps; the class only marks the layer */
  .amb-flash { animation: none; }

  /* spray: a burst, then nothing for the rest of the period */
  @keyframes amb-spray {
    0%   { opacity: 0; transform: translateY(0) scale(calc(1 - ${m.sprayGrow} * ${i})); }
    6%   { opacity: 1; }
    22%  { opacity: 0.9; transform: translateY(calc(${p} * -${m.sprayRise} * ${i})) scale(calc(1 + ${m.sprayGrow} * 0.5 * ${i})); }
    40%, 100% { opacity: 0; transform: translateY(calc(${p} * -${m.sprayRise} * 1.2 * ${i})) scale(calc(1 + ${m.sprayGrow} * ${i})); }
  }
  .amb-spray {
    animation-name: amb-spray; animation-duration: var(--amb-dur, 7s); animation-direction: normal;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* flicker: irregular dips in a light's opacity */
  @keyframes amb-flicker {
    0%, 52%, 100% { opacity: 1; }
    13% { opacity: calc(1 - ${m.flickerDip} * 0.6 * ${i}); }
    21% { opacity: calc(1 - ${m.flickerDip} * 0.2 * ${i}); }
    38% { opacity: calc(1 - ${m.flickerDip} * ${i}); }
    67% { opacity: calc(1 - ${m.flickerDip} * 0.4 * ${i}); }
    81% { opacity: calc(1 - ${m.flickerDip} * 0.8 * ${i}); }
  }
  .amb-flicker { animation-name: amb-flicker; animation-duration: var(--amb-dur, 2.4s); animation-direction: normal; }

  /* rise: a smoke puff climbs, grows and thins out; gas decelerates and never overshoots */
  @keyframes amb-rise {
    0%   { opacity: 0; transform: translateY(0) scale(1); }
    20%  { opacity: 1; }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(calc(${p} * -${m.riseLift} * ${i})) scale(calc(1 + ${m.riseGrow} * ${i})); }
  }
  .amb-rise {
    animation-name: amb-rise; animation-duration: var(--amb-dur, 9s); animation-direction: normal;
    animation-timing-function: cubic-bezier(0.333, 1, 0.667, 1);
  }

  /* oars: a slow pull, a quicker recovery, about the grip */
  @keyframes amb-oars {
    0%, 100% { transform: rotate(calc(-${m.oarsDeg}deg * ${i})); }
    60%      { transform: rotate(calc(${m.oarsDeg}deg * ${i})); }
  }
  .amb-oars {
    animation-name: amb-oars; animation-duration: var(--amb-dur, 2.4s); animation-direction: normal;
    transform-origin: 50% 15% !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .amb, .amb::before, .amb::after, .amb > img { animation: none !important; }
  }
`,d={w:90,h:270,far:.6},Dt=[[22,14,24,.7,.55,.8],[61,38,15,.5,.35,-.5],[80,77,28,.8,.6,.6],[41,96,12,.5,.3,.3],[17,131,21,.6,.5,-.7],[70,150,18,.7,.42,.4],[50,189,26,.6,.52,-.4],[30,214,14,.5,.33,.6],[77,229,20,.7,.46,-.3]],Ft=(()=>{const t=-90/d.h,a=([n,r,o,s,c,f])=>{const u=C(n+t*o),h=C((n+u)/2+f);return`<path d='M${n} ${r} Q${h} ${r+o/2} ${u} ${r+o}' stroke-width='${s}' stroke-opacity='${c}'/>`},e=`<svg xmlns='http://www.w3.org/2000/svg' width='${d.w}' height='${d.h}'><g fill='none' stroke='rgb(198,202,206)' stroke-linecap='round'>`+Dt.map(a).join("")+"</g></svg>";return`url("data:image/svg+xml,${encodeURIComponent(e)}")`})();function Ot(){if(document.getElementById(T))return;const t=document.createElement("style");t.id=T,t.textContent=Q(),document.head.appendChild(t),jt()}let W=null;function jt(){if(W||typeof window>"u"||!window.__tune?.register)return;const t=()=>{const a=document.getElementById(T);a&&(a.textContent=Q())};W=window.__tune.register("World motion",[...Object.keys(v).map(a=>({key:`period_${a}`,label:`${a} period (s)`,min:.2,max:Math.max(60,v[a]*3),step:.1,value:v[a],apply:e=>{v[a]=Number(e),Nt()}})),...Object.keys(m).map(a=>({key:a,label:a,min:0,max:Math.max(.1,m[a]*4),step:m[a]>=1?.1:.001,value:m[a],apply:e=>{m[a]=Number(e),t()}}))],{tab:"Lesson"})??null}export{G as S,_t as a,pt as b,F as c,Gt as d,Bt as e,Ht as f,Yt as h,Wt as r,Z as s,qt as t,J as w};
