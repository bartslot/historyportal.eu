const f={drift:40,breeze:6,bob:5,flutter:18,swell:8,roll:7,billow:1.8,rain:.9,flash:9,spray:7,flicker:2.4,rise:9,oars:2.4};[...Object.keys(f)];const r={swellRise:.008,swellScroll:7.5,rollDeg:1.2,rollLift:.004,plateScale:.05,billowSkew:2.5,billowFill:.025,rainFar:.45,rainNear:.6,flashPeak:.9,sprayRise:.025,sprayGrow:.12,flickerDip:.14,riseLift:.08,riseGrow:.18,oarsDeg:7},x=[.25,3],A=[0,2],M=Object.keys(f).map(a=>`amb-${a}`),R=.618033988749895,$="amb-styles",y=(a,[t,i],n)=>Number.isFinite(Number(a))&&a!==null&&a!==""?Math.min(i,Math.max(t,Number(a))):n;function N(a,t=0){const i=a?.ambient;if(!f[i])return null;const n=y(a.ambient_speed,x,1),m=y(a.ambient_amount,A,1),c=f[i]/n,u=Number.isFinite(Number(a.asset_id))&&a.asset_id!==null?Number(a.asset_id):t,p=(Math.abs(u)+1)*R%1;return{mode:i,amount:m,durS:b(c),delayS:b(-p*c)}}const b=a=>Math.round(a*1e3)/1e3;function D(){return typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}function F(a,t,i=0){if(!a)return!1;L(a),a.__ambLayer=t,a.__ambIndex=i;const n=N(t,i);return!n||D()?!1:(j(),a.classList.add("amb",`amb-${n.mode}`),a.style.setProperty("--amb-amount",String(n.amount)),a.style.setProperty("--amb-dur",`${n.durS}s`),a.style.setProperty("--amb-delay",`${n.delayS}s`),n.mode==="swell"&&Y(a),n.mode==="flash"&&k(a,n),!0)}function L(a){a.classList.remove("amb",...M);for(const t of["--amb-amount","--amb-dur","--amb-delay"])a.style.removeProperty(t);for(const t of a.querySelectorAll(":scope > .amb-twin"))t.remove();a.__ambFlash&&(clearTimeout(a.__ambFlash),a.__ambFlash=null),a.__ambFlashAnim?.cancel?.(),a.__ambFlashAnim=null}function Y(a){const t=a.querySelector(":scope > img");if(t)for(const i of["amb-twin-mirror","amb-twin-again"]){const n=t.cloneNode(!1);n.classList.add("amb-twin",i),n.alt="",n.setAttribute("aria-hidden","true"),t.style.position!=="absolute"&&(n.style.position="absolute",n.style.left="0",n.style.top="0"),a.appendChild(n)}}function E(a,t=Math.random){return b(a*(.4+1.2*t()))}const I=700;function O(a=1){const t=1+r.flashPeak*Math.min(1,Math.max(0,a)),i=n=>`brightness(${b(n)})`;return[{filter:i(1),offset:0},{filter:i(t),offset:.08},{filter:i(1+(t-1)*.15),offset:.22},{filter:i(1+(t-1)*.8),offset:.32},{filter:i(1),offset:1}]}const P=1e3;let h=-1/0;function z(a=Date.now()){return a-h<P?!1:(h=a,!0)}function k(a,t){a.__ambFlash=setTimeout(()=>{if(!a.isConnected){a.__ambFlash=null;return}z()&&(a.__ambFlashAnim=a.animate(O(t.amount),{duration:I,easing:"cubic-bezier(0.333, 0, 0.667, 0)"})),k(a,t)},E(t.durS)*1e3)}function G(a=document){for(const t of a.querySelectorAll(".amb"))F(t,t.__ambLayer,t.__ambIndex)}function B(a){if(!a)return null;const t=(m,c)=>{a.style.setProperty("--amb-sw",`${Math.round(m)}px`),a.style.setProperty("--amb-sh",`${Math.round(c)}px`)},i=a.getBoundingClientRect();if(i.width&&t(i.width,i.height),typeof ResizeObserver!="function")return null;const n=new ResizeObserver(([m])=>t(m.contentRect.width,m.contentRect.height));return n.observe(a),n}const d="var(--amb-sw, 100vw)",s="var(--amb-sh, 100vh)",e="var(--amb-amount, 1)",l=(a=1)=>`calc(var(--amb-dur, 6s) * ${a/2})`,_=()=>`
  .amb {
    will-change: transform;
    animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-delay: var(--amb-delay, 0s);
  }
  @keyframes amb-drift-x {
    from { translate: calc(${d} * -0.025 * ${e}) 0; }
    to   { translate: calc(${d} * 0.025 * ${e}) 0; }
  }
  @keyframes amb-drift-y {
    from { transform: translateY(calc(${s} * -0.003 * ${e})); }
    to   { transform: translateY(calc(${s} * 0.003 * ${e})); }
  }
  .amb-drift { animation-name: amb-drift-x, amb-drift-y; animation-duration: ${l()}, ${l(.33)}; }

  @keyframes amb-breeze {
    from { transform: skewX(calc(-1.2deg * ${e})) rotate(calc(-0.4deg * ${e})); }
    to   { transform: skewX(calc(1.2deg * ${e})) rotate(calc(0.4deg * ${e})); }
  }
  @keyframes amb-leaf {
    from { rotate: calc(-0.2deg * ${e}); }
    to   { rotate: calc(0.2deg * ${e}); }
  }
  .amb-breeze {
    transform-origin: 50% 100%;
    animation-name: amb-breeze, amb-leaf;
    animation-duration: ${l()}, ${l(1.7/6)};
  }

  @keyframes amb-bob {
    from { transform: translateY(calc(${s} * -0.006 * ${e})) rotate(calc(-0.5deg * ${e})); }
    to   { transform: translateY(calc(${s} * 0.006 * ${e})) rotate(calc(0.5deg * ${e})); }
  }
  .amb-bob { animation-name: amb-bob; animation-duration: ${l()}; }

  @keyframes amb-flutter-x {
    from { translate: calc(${d} * -0.04 * ${e}) 0; }
    to   { translate: calc(${d} * 0.04 * ${e}) 0; }
  }
  .amb-flutter { animation-name: amb-flutter-x, amb-bob; animation-duration: ${l()}, ${l(5/18)}; }

  /* swell: the wrapper rises and falls; the picture, its mirror and itself again scroll two widths,
     linearly (one width per swellScroll periods) */
  @keyframes amb-swell {
    from { transform: translateY(calc(${s} * -${r.swellRise} * ${e})); }
    to   { transform: translateY(calc(${s} * ${r.swellRise} * ${e})); }
  }
  .amb-swell { animation-name: amb-swell; animation-duration: ${l()}; overflow: hidden; }
  @keyframes amb-swell-scroll { from { translate: 0 0; } to { translate: calc(-200% * var(--amb-scale, 1)) 0; } }
  @keyframes amb-swell-mirror { from { translate: calc(100% * var(--amb-scale, 1)) 0; } to { translate: calc(-100% * var(--amb-scale, 1)) 0; } }
  @keyframes amb-swell-again { from { translate: calc(200% * var(--amb-scale, 1)) 0; } to { translate: 0 0; } }
  .amb-swell > img {
    animation: amb-swell-scroll calc(var(--amb-dur, 8s) * ${r.swellScroll*2}) linear infinite;
    animation-delay: var(--amb-delay, 0s);
  }
  .amb-swell > img.amb-twin-mirror { animation-name: amb-swell-mirror; scale: -1 1; }
  .amb-swell > img.amb-twin-again { animation-name: amb-swell-again; }

  /* roll: pitch about the waterline; a full plate rolls about its middle, scaled past its edges */
  @keyframes amb-roll {
    from { transform: translateY(calc(${s} * -${r.rollLift} * ${e})) rotate(calc(-${r.rollDeg}deg * ${e})); }
    to   { transform: translateY(calc(${s} * ${r.rollLift} * ${e})) rotate(calc(${r.rollDeg}deg * ${e})); }
  }
  .amb-roll { animation-name: amb-roll; animation-duration: ${l()}; transform-origin: 50% 100%; }
  .amb-roll[data-amb-plate] { transform-origin: 50% 50% !important; scale: calc(1 + ${r.plateScale} * ${e}); }

  /* billow: cloth ripples away from its hoist (the left edge) */
  @keyframes amb-billow {
    from { transform: skewY(calc(-${r.billowSkew}deg * ${e})); }
    to   { transform: skewY(calc(${r.billowSkew}deg * ${e})); }
  }
  @keyframes amb-billow-fill {
    from { scale: calc(1 - ${r.billowFill} * ${e}) 1; }
    to   { scale: 1 1; }
  }
  .amb-billow {
    animation-name: amb-billow, amb-billow-fill;
    animation-duration: ${l()}, ${l(.62)};
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
    background-image: ${T};
    animation-timing-function: linear; animation-iteration-count: infinite;
  }
  .amb-rain::before {
    inset: -${o.h*o.far}px -${o.w*o.far}px 0 0;
    background-size: ${o.w*o.far}px ${o.h*o.far}px;
    opacity: calc(min(1, ${e}) * ${r.rainFar});
    animation-name: amb-rain-far; animation-duration: calc(var(--amb-dur, 0.9s) * 1.5);
  }
  .amb-rain::after {
    inset: -${o.h}px -${o.w}px 0 0;
    background-size: ${o.w}px ${o.h}px;
    opacity: calc(max(0, ${e} - 0.5) * ${r.rainNear});
    animation-name: amb-rain-near; animation-duration: var(--amb-dur, 0.9s);
  }
  @keyframes amb-rain-far { from { transform: translate(0, 0); } to { transform: translate(-${o.w*o.far}px, ${o.h*o.far}px); } }
  @keyframes amb-rain-near { from { transform: translate(0, 0); } to { transform: translate(-${o.w}px, ${o.h}px); } }

  /* flash: played from JS at random gaps; the class only marks the layer */
  .amb-flash { animation: none; }

  /* spray: a burst, then nothing for the rest of the period */
  @keyframes amb-spray {
    0%   { opacity: 0; transform: translateY(0) scale(calc(1 - ${r.sprayGrow} * ${e})); }
    6%   { opacity: 1; }
    22%  { opacity: 0.9; transform: translateY(calc(${s} * -${r.sprayRise} * ${e})) scale(calc(1 + ${r.sprayGrow} * 0.5 * ${e})); }
    40%, 100% { opacity: 0; transform: translateY(calc(${s} * -${r.sprayRise} * 1.2 * ${e})) scale(calc(1 + ${r.sprayGrow} * ${e})); }
  }
  .amb-spray {
    animation-name: amb-spray; animation-duration: var(--amb-dur, 7s); animation-direction: normal;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* flicker: irregular dips in a light's opacity */
  @keyframes amb-flicker {
    0%, 52%, 100% { opacity: 1; }
    13% { opacity: calc(1 - ${r.flickerDip} * 0.6 * ${e}); }
    21% { opacity: calc(1 - ${r.flickerDip} * 0.2 * ${e}); }
    38% { opacity: calc(1 - ${r.flickerDip} * ${e}); }
    67% { opacity: calc(1 - ${r.flickerDip} * 0.4 * ${e}); }
    81% { opacity: calc(1 - ${r.flickerDip} * 0.8 * ${e}); }
  }
  .amb-flicker { animation-name: amb-flicker; animation-duration: var(--amb-dur, 2.4s); animation-direction: normal; }

  /* rise: a smoke puff climbs, grows and thins out; gas decelerates and never overshoots */
  @keyframes amb-rise {
    0%   { opacity: 0; transform: translateY(0) scale(1); }
    20%  { opacity: 1; }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(calc(${s} * -${r.riseLift} * ${e})) scale(calc(1 + ${r.riseGrow} * ${e})); }
  }
  .amb-rise {
    animation-name: amb-rise; animation-duration: var(--amb-dur, 9s); animation-direction: normal;
    animation-timing-function: cubic-bezier(0.333, 1, 0.667, 1);
  }

  /* oars: a slow pull, a quicker recovery, about the grip */
  @keyframes amb-oars {
    0%, 100% { transform: rotate(calc(-${r.oarsDeg}deg * ${e})); }
    60%      { transform: rotate(calc(${r.oarsDeg}deg * ${e})); }
  }
  .amb-oars {
    animation-name: amb-oars; animation-duration: var(--amb-dur, 2.4s); animation-direction: normal;
    transform-origin: 50% 15% !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .amb, .amb::before, .amb::after, .amb > img { animation: none !important; }
  }
`,o={w:90,h:270,far:.6},C=[[22,14,24,.7,.55,.8],[61,38,15,.5,.35,-.5],[80,77,28,.8,.6,.6],[41,96,12,.5,.3,.3],[17,131,21,.6,.5,-.7],[70,150,18,.7,.42,.4],[50,189,26,.6,.52,-.4],[30,214,14,.5,.33,.6],[77,229,20,.7,.46,-.3]],T=(()=>{const a=-90/o.h,t=([n,m,c,u,p,v])=>{const w=b(n+a*c),S=b((n+w)/2+v);return`<path d='M${n} ${m} Q${S} ${m+c/2} ${w} ${m+c}' stroke-width='${u}' stroke-opacity='${p}'/>`},i=`<svg xmlns='http://www.w3.org/2000/svg' width='${o.w}' height='${o.h}'><g fill='none' stroke='rgb(198,202,206)' stroke-linecap='round'>`+C.map(t).join("")+"</g></svg>";return`url("data:image/svg+xml,${encodeURIComponent(i)}")`})();function j(){if(document.getElementById($))return;const a=document.createElement("style");a.id=$,a.textContent=_(),document.head.appendChild(a),q()}let g=null;function q(){if(g||typeof window>"u"||!window.__tune?.register)return;const a=()=>{const t=document.getElementById($);t&&(t.textContent=_())};g=window.__tune.register("World motion",[...Object.keys(f).map(t=>({key:`period_${t}`,label:`${t} period (s)`,min:.2,max:Math.max(60,f[t]*3),step:.1,value:f[t],apply:i=>{f[t]=Number(i),G()}})),...Object.keys(r).map(t=>({key:t,label:t,min:0,max:Math.max(.1,r[t]*4),step:r[t]>=1?.1:.001,value:r[t],apply:i=>{r[t]=Number(i),a()}}))],{tab:"Lesson"})??null}export{F as a,B as t};
