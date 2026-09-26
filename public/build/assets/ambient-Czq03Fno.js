const b={drift:40,breeze:6,bob:5,flutter:18};[...Object.keys(b)];const y=[.25,3],p=[0,2],h=Object.keys(b).map(t=>`amb-${t}`),S=.618033988749895,d="amb-styles",u=(t,[r,n],a)=>Number.isFinite(Number(t))&&t!==null&&t!==""?Math.min(n,Math.max(r,Number(t))):a;function g(t,r=0){const n=t?.ambient;if(!b[n])return null;const a=u(t.ambient_speed,y,1),o=u(t.ambient_amount,p,1),i=b[n]/a,f=Number.isFinite(Number(t.asset_id))&&t.asset_id!==null?Number(t.asset_id):r,$=(Math.abs(f)+1)*S%1;return{mode:n,amount:o,durS:l(i),delayS:l(-$*i)}}const l=t=>Math.round(t*1e3)/1e3;function w(){return typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}function E(t,r,n=0){if(!t)return!1;t.classList.remove("amb",...h);for(const o of["--amb-amount","--amb-dur","--amb-delay"])t.style.removeProperty(o);const a=g(r,n);return!a||w()?!1:(k(),t.classList.add("amb",`amb-${a.mode}`),t.style.setProperty("--amb-amount",String(a.amount)),t.style.setProperty("--amb-dur",`${a.durS}s`),t.style.setProperty("--amb-delay",`${a.delayS}s`),!0)}function M(t){if(!t)return null;const r=(o,i)=>{t.style.setProperty("--amb-sw",`${Math.round(o)}px`),t.style.setProperty("--amb-sh",`${Math.round(i)}px`)},n=t.getBoundingClientRect();if(n.width&&r(n.width,n.height),typeof ResizeObserver!="function")return null;const a=new ResizeObserver(([o])=>r(o.contentRect.width,o.contentRect.height));return a.observe(t),a}const s="var(--amb-sw, 100vw)",c="var(--amb-sh, 100vh)",e="var(--amb-amount, 1)",m=(t=1)=>`calc(var(--amb-dur, 6s) * ${t/2})`,v=`
  .amb {
    will-change: transform;
    animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-delay: var(--amb-delay, 0s);
  }
  @keyframes amb-drift-x {
    from { translate: calc(${s} * -0.025 * ${e}) 0; }
    to   { translate: calc(${s} * 0.025 * ${e}) 0; }
  }
  @keyframes amb-drift-y {
    from { transform: translateY(calc(${c} * -0.003 * ${e})); }
    to   { transform: translateY(calc(${c} * 0.003 * ${e})); }
  }
  .amb-drift { animation-name: amb-drift-x, amb-drift-y; animation-duration: ${m()}, ${m(.33)}; }

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
    animation-duration: ${m()}, ${m(1.7/6)};
  }

  @keyframes amb-bob {
    from { transform: translateY(calc(${c} * -0.006 * ${e})) rotate(calc(-0.5deg * ${e})); }
    to   { transform: translateY(calc(${c} * 0.006 * ${e})) rotate(calc(0.5deg * ${e})); }
  }
  .amb-bob { animation-name: amb-bob; animation-duration: ${m()}; }

  @keyframes amb-flutter-x {
    from { translate: calc(${s} * -0.04 * ${e}) 0; }
    to   { translate: calc(${s} * 0.04 * ${e}) 0; }
  }
  .amb-flutter { animation-name: amb-flutter-x, amb-bob; animation-duration: ${m()}, ${m(5/18)}; }

  @media (prefers-reduced-motion: reduce) {
    .amb { animation: none !important; }
  }
`;function k(){if(document.getElementById(d))return;const t=document.createElement("style");t.id=d,t.textContent=v,document.head.appendChild(t)}export{E as a,M as t};
