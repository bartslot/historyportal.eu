import{_ as gr}from"./preload-helper-DIdkKO6w.js";import{m as Ze,a as le,s as yr,S as br,b as wr,D as vr,c as _r,E as He}from"./map-imagery-Bp93pHDe.js";import{E as Yt,a as Ta}from"./easing-HS2C6-zA.js";import{E as Jt,m as ka,v as xr,a as Er,i as Tr,s as kr,o as ca,w as Wa,b as Ar,c as ja,d as Sr}from"./border-sweep-DD0CkwUG.js";import{p as Lr}from"./tuner-CTMYYJl-.js";import"./i18n-DoByrmTl.js";function To(e,t=new Date().getFullYear()){return t-e}function Mr(e,t=new Date().getFullYear(),r=25){return Math.trunc(To(e,t)/r)}function ko(e,t=new Date().getFullYear()){const r=To(e,t).toLocaleString("en-US"),n=Mr(e,t);return`≈ ${r} years ago · ~${n} generations`}const Rr=(e,t)=>{const r=getComputedStyle(document.documentElement).getPropertyValue(e),n=parseFloat(r);return Number.isFinite(n)?n:t},Le=(e,t)=>{const r=getComputedStyle(document.documentElement).getPropertyValue(e).trim(),n=parseFloat(r);return Number.isFinite(n)?r.endsWith("rem")?n*parseFloat(getComputedStyle(document.documentElement).fontSize):n:t},Ya=e=>e<0?`${Math.abs(e)} BCE`:String(e),Pr=e=>e<0?`${Math.abs(e)} BCE`:`${e} CE`,Xa=e=>e<0?"BCE":"CE",Cr='<path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"/>',Dr='<path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>',Ir=24,Wt="var(--scrubber-tick-height)",Ur=.12,Fr=.3,ha=400,Ka=.45,Or=90,Nr={play:"Play timeline",pause:"Pause timeline",track:"Timeline year",year:"Year (negative for BCE)"};function Br(e,{min:t,max:r,value:n,onYear:l,onPlay:c,labels:o}){const i={...Nr,...o??{}},a=M=>Math.min(r,Math.max(t,M));let h=a(Math.round(n)),b=Rr("--scrubber-px-per-year",4);e.classList.add("select-none"),e.innerHTML=`
    <div class="tm-track absolute inset-0 overflow-hidden rounded-card"
         role="slider" tabindex="0"
         aria-label="${i.track}" aria-valuemin="${t}" aria-valuemax="${r}" aria-valuenow="${h}">
      <!-- A lighter band gives the playhead somewhere to sit; it is behind everything. -->
      <div class="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 bg-scrubber-band"
           style="width: var(--scrubber-band-width)"></div>
      <!-- Every single year — see buildStrip. Pinned to the track rather than living on the strip:
           the strip is 25,000px wide, and Chrome will not rasterise a 1px line every 4px across a
           layer that size. It comes back as a soft wash instead of a ruler. So it is one
           track-width element and the pattern's PHASE is what scrolls. -->
      <div class="tm-years pointer-events-none absolute inset-x-0 top-0" style="opacity:0"></div>
      <div class="tm-scroll absolute inset-0 cursor-grab overflow-x-scroll overflow-y-hidden no-scrollbar">
        <div class="tm-strip relative h-full"></div>
      </div>
    </div>

    <!-- The playhead overshoots the top edge, so it reads as a mark ON the ruler, not a seam in it. -->
    <div class="pointer-events-none absolute left-1/2 z-20 w-[1.5px] -translate-x-1/2 rounded-[2px] bg-scrubber-playhead"
         style="top: -3px; height: calc(var(--scrubber-height) + 3px)"></div>

    <!-- Play + year: an overlay ON the ruler, with no surface of its own.
         The mock backs this group with 90% of the bar's own colour — invisible as a shape, but it
         wipes out every tick behind it, and live that turns the left end into a solid slab the
         ruler appears to start after. Bart: "the play button and year input is an overlay that
         should be an overlay of the scrub bar." So the ruler runs unbroken underneath, and the
         year stays readable because the badge carries its own fill rather than the group doing it. -->
    <div class="absolute inset-y-0 left-0 z-30 flex items-center gap-1 pl-1 pr-3">
      <button type="button" aria-label="${i.play}" aria-pressed="false" data-tooltip="${i.play}"
              class="tm-play grid h-6 w-6 place-items-center rounded-full text-scrubber-control">
        <svg class="tm-ic-play h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">${Cr}</svg>
        <svg class="tm-ic-pause h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" style="display:none">${Dr}</svg>
      </button>
      <label class="tm-year-badge flex h-[30px] cursor-text items-center gap-0.5 rounded-md border border-scrubber-badge-edge bg-scrubber-badge px-2">
        <input type="number" inputmode="numeric"
               class="tm-year-input w-[5ch] bg-transparent text-right font-mono text-scrubber-num tracking-[0.8px] tabular-nums text-scrubber-year outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
               min="${t}" max="${r}" step="1" value="${h}" aria-label="${i.year}">
        <span class="tm-era-suffix lp-card-label lp-card-label-sm">${Xa(h)}</span>
      </label>
    </div>`;const L=e.querySelector(".tm-year-input"),w=e.querySelector(".tm-era-suffix"),U=e.querySelector(".tm-year-badge"),p=e.querySelector(".tm-track"),f=e.querySelector(".tm-scroll"),x=e.querySelector(".tm-strip");f.style.scrollbarWidth="none";const _=new Map,S=[],g=Math.ceil(t/10)*10,s=e.querySelector(".tm-years");let z=0;const N=()=>{const M=((z-f.scrollLeft)%b+b)%b;s.style.backgroundPositionX=`${M}px`},k=()=>{const M=p.clientWidth/2;x.style.width=`${(r-t)*b+M*2}px`,x.style.paddingLeft=`${M}px`,x.innerHTML="",_.clear(),S.length=0,Ge=null,s.style.height="var(--scrubber-year-tick-height)",s.style.backgroundImage=`repeating-linear-gradient(90deg, var(--color-scrubber-tick) 0 var(--scrubber-year-tick-width), transparent var(--scrubber-year-tick-width) ${b}px)`,z=M,N(),W(),et();const ae=Math.ceil(t/10)*10;for(let ie=ae;ie<=r;ie+=10){const Ie=ie%100===0,Ye=M+(ie-t)*b,Ae=document.createElement("div");if(Ae.className=Ie?"absolute top-0 w-[1.5px] rounded-[3px] bg-scrubber-tick-major":"absolute top-0 w-px rounded-[3px] bg-scrubber-tick",Ae.style.left=`${Ye}px`,Ae.style.height=Wt,x.appendChild(Ae),S.push(Ae),!Ie)continue;const Te=document.createElement("span");Te.className="absolute -translate-x-1/2 whitespace-nowrap text-scrubber-num font-semibold tabular-nums text-scrubber-tick-major",Te.style.left=`${Ye}px`,Te.style.top="var(--scrubber-label-top)",Te.style.lineHeight="calc(var(--scrubber-height) - var(--scrubber-label-top))",Te.textContent=Ya(ie),x.appendChild(Te),_.set(ie,Te)}};let Y=Ur,m=Fr,Q=m,H=!1,G=null,C=0,D=null,T=0,I=0,y=0;const W=()=>{s.style.transition=`opacity ${H?140:220}ms ${H?Yt.enter:Yt.exit}`,s.style.opacity=H?"1":"0"},B=M=>{M!==H&&(H=M,W())},Z=M=>{const ae=f.scrollLeft;I+=Math.abs(ae-T),T=ae;const ie=M-y;if(ie>=Or&&(Q=Q*Ka+I/ie*(1-Ka),I=0,y=M,B(Q<Y?!0:Q>m?!1:H)),!_e&&M>C){G=null,Q=m,B(!1);return}G=requestAnimationFrame(Z)},A=()=>{if(_e){D=setTimeout(A,ha);return}Q=m,B(!1)},K=M=>{C=M+ha,clearTimeout(D),D=setTimeout(A,ha),G===null&&(I=0,y=M,T=f.scrollLeft,Q=m,G=requestAnimationFrame(Z))},R=M=>Math.round(M/b)*b,$=140,J=220;let X=-1,F=0,ue=0,ce=0,ve=0,Ee=null,Oe=!1,Je=30,De=44,xt=112;const et=()=>{Je=Le("--scrubber-tick-height",30),De=Le("--scrubber-magnify-height",44),xt=Le("--scrubber-magnify-radius",112)},It=M=>M*M*(3-2*M),oa=()=>{const M=Je,ae=De,ie=xt,Ye=p.clientWidth/2-f.scrollLeft,Ae=10*b,Te=Math.max(0,Math.floor((-Ye-(g-t)*b)/Ae)),qt=Math.min(S.length-1,Math.ceil((p.clientWidth-Ye-(g-t)*b)/Ae));for(let mt=Te;mt<=qt;mt++){const nt=S[mt];if(!nt)continue;const Lt=Ye+(g+mt*10-t)*b,Xe=Math.abs(Lt-X),pt=X>=0&&Xe<ie?It(1-Xe/ie):0,gt=pt>0?`${(M+(ae-M)*pt*F).toFixed(1)}px`:Wt;nt.style.height!==gt&&(nt.style.height=gt)}Oe=!0},Ut=()=>{for(const M of S)M.style.height!==Wt&&(M.style.height=Wt);Oe=!1},ht=M=>{const ae=Math.min(1,(M-ve)/(ce>ue?$:J)),ie=ce>ue?Ta.easeOutCubic(ae):Ta.easeInCubic(ae);if(F=ue+(ce-ue)*ie,F>0?oa():Oe&&Ut(),ae>=1&&F===0){Ee=null;return}Ee=requestAnimationFrame(ht)},Et=M=>{X=M<0?-1:M-p.getBoundingClientRect().left;const ae=X>=0?1:0;ae!==ce&&(ue=F,ce=ae,ve=performance.now()),Ee===null&&(Ee=requestAnimationFrame(ht))};f.addEventListener("pointermove",M=>Et(M.clientX)),f.addEventListener("pointerleave",()=>Et(-1)),f.addEventListener("pointercancel",()=>Et(-1));const Ft=()=>window.dispatchEvent(new CustomEvent("timemap-scrub",{detail:{year:h,label:Ya(h)}}));let Ge=null;const Tt=()=>{const M=Math.round(h/100)*100,ae=_.get(M),Ie=!!ae&&Math.abs((M-h)*b)<Ir?ae:null;Ge&&Ge!==Ie&&(Ge.style.visibility=""),Ie&&(Ie.style.visibility="hidden"),Ge=Ie};let ke=!1;const Ot=()=>a(t+Math.round(f.scrollLeft/b)),Nt=M=>(M-t)*b,tt=()=>{L.value=String(h),w.textContent=Xa(h),U.setAttribute("data-tooltip",ko(h)),p.setAttribute("aria-valuenow",String(h)),p.setAttribute("aria-valuetext",Pr(h)),Tt()},pe=(M,{fireYear:ae=!0}={})=>{h=a(Math.round(M)),tt(),ke=!0,f.scrollLeft=Nt(h),N(),T=f.scrollLeft,requestAnimationFrame(()=>{ke=!1}),ae&&l(h)},at=e.querySelector(".tm-play"),Bt=e.querySelector(".tm-ic-play"),Qt=e.querySelector(".tm-ic-pause"),Ne=100;let ge=!1,$e=null,ot=0,We=0;const kt=()=>{Bt.style.display=ge?"none":"",Qt.style.display=ge?"":"none",at.setAttribute("aria-pressed",ge?"true":"false"),at.setAttribute("aria-label",ge?i.pause:i.play),at.setAttribute("data-tooltip",ge?i.pause:i.play)},ne=M=>{if(ge){if(We&&(ot+=Ne*Math.min(M-We,100)/1e3),We=M,ot>=r){pe(r),Re();return}pe(ot),$e=requestAnimationFrame(ne)}},Re=()=>{ge&&(ge=!1,$e!==null&&cancelAnimationFrame($e),$e=null,We=0,kt(),c&&c(!1))},At=()=>{ge||(ge=!0,h>=r&&pe(t),ot=h,We=0,kt(),c&&c(!0),$e=requestAnimationFrame(ne))};at.addEventListener("click",()=>ge?Re():At());let ut=!1;f.addEventListener("scroll",()=>{ke||(K(performance.now()),!ut&&(ut=!0,requestAnimationFrame(()=>{ut=!1,N();const M=Ot();M!==h&&(h=M,tt(),Ft(),l(h))})))}),f.addEventListener("scrollend",()=>{if(_e||ke)return;const M=R(f.scrollLeft);M!==f.scrollLeft&&pe(t+M/b,{fireYear:!1})});let dt=0,ft=0,_e=!1;f.addEventListener("pointerdown",M=>{Re(),_e=!0,dt=M.clientX,ft=f.scrollLeft,f.setPointerCapture(M.pointerId),f.classList.replace("cursor-grab","cursor-grabbing"),K(performance.now())}),f.addEventListener("pointermove",M=>{_e&&(f.scrollLeft=R(ft-(M.clientX-dt)))});const rt=()=>{_e&&(_e=!1,f.classList.replace("cursor-grabbing","cursor-grab"),pe(Ot()))};f.addEventListener("pointerup",rt),f.addEventListener("pointercancel",rt),L.addEventListener("input",()=>{Re();const M=parseInt(L.value,10);Number.isNaN(M)||pe(M)}),L.addEventListener("change",()=>pe(parseInt(L.value,10)||h)),p.addEventListener("keydown",M=>{const ae={ArrowLeft:-1,ArrowRight:1,PageDown:-10,PageUp:10}[M.key];ae!==void 0&&(M.preventDefault(),Re(),pe(h+ae),Ft())}),k(),tt(),requestAnimationFrame(()=>{pe(h,{fireYear:!1})});const St=new ResizeObserver(()=>{k(),pe(h,{fireYear:!1})});St.observe(p);const xe=(M,ae,ie="px")=>document.documentElement.style.setProperty(M,`${ae}${ie}`),Be=()=>{k(),pe(h,{fireYear:!1})},je=window.__tune?.register("Time scrubber",[{key:"width",label:"Bar width",min:480,max:1400,step:5,value:Le("--scrubber-width",875),apply:M=>xe("--scrubber-width",M)},{key:"height",label:"Bar height",min:32,max:88,step:1,value:Le("--scrubber-height",47),apply:M=>xe("--scrubber-height",M)},{key:"tickHeight",label:"Tick height",min:8,max:64,step:1,value:Le("--scrubber-tick-height",30),apply:M=>{xe("--scrubber-tick-height",M),et()}},{key:"labelTop",label:"Label baseline",min:8,max:72,step:1,value:Le("--scrubber-label-top",36),apply:M=>xe("--scrubber-label-top",M)},{key:"bandWidth",label:"Centre band",min:0,max:640,step:4,value:Le("--scrubber-band-width",268),apply:M=>xe("--scrubber-band-width",M)},{key:"yearTickHeight",label:"Year ticks",min:0,max:30,step:1,value:Le("--scrubber-year-tick-height",8),apply:M=>xe("--scrubber-year-tick-height",M)},{key:"yearTickWidth",label:"Year tick width",min:.5,max:2,step:.25,value:Le("--scrubber-year-tick-width",1),apply:M=>xe("--scrubber-year-tick-width",M)},{key:"magnifyHeight",label:"Magnify to",min:30,max:47,step:1,value:Le("--scrubber-magnify-height",44),apply:M=>{xe("--scrubber-magnify-height",M),et()}},{key:"magnifyRadius",label:"Magnify reach",min:20,max:300,step:5,value:Le("--scrubber-magnify-radius",112),apply:M=>{xe("--scrubber-magnify-radius",M),et()}},{key:"fineAt",label:"Years in below",min:5,max:200,step:5,value:Math.round(Y/b*1e3),apply:M=>{Y=M*b/1e3,m=Y*2.5}},{key:"showYears",type:"button",label:"Flash the years",apply:()=>{B(!0),setTimeout(()=>B(!1),1500)}},{key:"pxPerYear",label:"Pixels per year",min:1,max:10,step:.5,value:b,apply:M=>{b=M,document.documentElement.style.setProperty("--scrubber-px-per-year",String(M)),Be()}}],{tab:"Map"});return{setYear:M=>{Re(),pe(M,{fireYear:!1})},destroy:()=>{St.disconnect(),Re(),clearTimeout(D),G!==null&&cancelAnimationFrame(G),Ee!==null&&cancelAnimationFrame(Ee),je&&je()}}}const Va=1e3,Qr=120,qr=420;function Hr(e){if(!e)return()=>{};document.fonts?.load("600 1em History").catch(()=>{});let t=null,r=Va;const n=()=>{e.style.transition=`opacity ${qr}ms ${Yt.exit}`,e.style.opacity="0"},l=i=>{e.textContent=i,e.style.transition=`opacity ${Qr}ms ${Yt.enter}`,e.style.opacity="1",clearTimeout(t),t=setTimeout(n,r)},c=i=>l(i.detail?.label??"");window.addEventListener("timemap-scrub",c);const o=window.__tune?.register("Year flash",[{key:"size",label:"Size",min:16,max:160,step:2,value:parseFloat(getComputedStyle(e).fontSize)||56,apply:i=>document.documentElement.style.setProperty("--scrubber-flash-size",`${i}px`)},{key:"hold",label:"Hold (ms)",min:200,max:4e3,step:100,value:Va,apply:i=>{r=i}},{key:"preview",type:"button",label:"Show it",apply:()=>l(e.textContent||"1600")}],{tab:"Map"});return()=>{window.removeEventListener("timemap-scrub",c),clearTimeout(t),o&&o()}}const zr="/sound/sfx/scrubber.mp3",Ao=.04,Gr=28,$r=.45;function Wr(e){const t=e.getChannelData(0),r=Math.max(1,Math.round(e.sampleRate*5e-4)),n=[];for(let a=0;a+r<=t.length;a+=r){let h=0;for(let b=0;b<r;b++)h+=t[a+b]*t[a+b];n.push(Math.sqrt(h/r))}const l=Math.max(...n,1e-9),c=[];let o=!0;for(let a=0;a<n.length;a++)if(o&&n[a]>l*.1){const h=Math.max(0,a-2);c.push({at:h*r/e.sampleRate,level:n[a],from:a}),o=!1}else!o&&n[a]<l*.02&&(o=!0);const i=Math.round(Ao*e.sampleRate/r);for(const a of c)a.level=Math.max(...n.slice(a.from,a.from+i));return c.map(({at:a,level:h})=>({at:a,level:h}))}function jr({volume:e=$r}={}){const t=window.AudioContext||window.webkitAudioContext;if(!t)return{destroy:()=>{}};let r=null,n=null,l=[],c=[],o=null,i=null,a=0,h=0,b=e;const w=(async()=>{try{const x=await fetch(zr);if(!x.ok)return;if(r=new t,n=await r.decodeAudioData(await x.arrayBuffer()),l=Wr(n),!l.length){n=null;return}const _=[...l].sort((S,g)=>S.level-g.level);i=_[_.length-1],o=_[Math.floor((_.length-1)/2)],c=_.slice(0,Math.max(1,Math.floor(_.length/2)))}catch{n=null}})(),U=x=>{const _=r.createBufferSource();_.buffer=n;const S=r.createGain();S.gain.value=b,_.connect(S).connect(r.destination),_.start(0,x.at,Ao)},p=x=>{if(!n||b<=0)return;const _=performance.now();if(_-h<Gr)return;h=_,r.state==="suspended"&&r.resume();const S=x.detail?.year??0;U(S%100===0?i:S%10===0?o:c[a++%c.length])};window.addEventListener("timemap-scrub",p);const f=window.__tune?.register("Scrub tick",[{key:"volume",label:"Volume",min:0,max:1,step:.05,value:b,apply:x=>{b=x}},{key:"try",type:"button",label:"Year · decade · century",apply:async()=>{await w,n&&(r.state==="suspended"&&r.resume(),[c[0],o,i].forEach((x,_)=>setTimeout(()=>x&&U(x),_*220)))}}],{tab:"Map"});return{destroy:()=>{window.removeEventListener("timemap-scrub",p),f&&f(),r&&r.close().catch(()=>{})}}}const So="/timemap/assets/mountains/",Yr="/timemap/mountains-points.geojson",ua=4;async function Xr(e,t){let r;try{const h=await fetch(`${So}${t}.svg`);if(!h.ok)return;r=await h.text()}catch{return}const l=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,c=(l.getAttribute("viewBox")||"0 0 24 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((c[2]||24)*ua)),i=Math.max(1,Math.round((c[3]||16)*ua)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(l));await new Promise(h=>{const b=new Image(o,i);b.onload=()=>{try{e.hasImage(t)?e.updateImage(t,b):e.addImage(t,b,{pixelRatio:ua})}catch{}h()},b.onerror=()=>h(),b.src=a})}async function Kr(e,t={}){const{beforeId:r,opacity:n=1,visibility:l="visible"}=t;if(e.getLayer("mountains"))return;let c;try{c=await fetch(So+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!c||typeof c!="object"||Ze(e))return;const o=[...new Set(Object.values(c).flat())];await Promise.all(o.map(a=>Xr(e,a)));let i;try{i=await fetch(Yr).then(a=>a.json())}catch{return}Ze(e)||(e.getSource("mountains")?e.getSource("mountains").setData(i):e.addSource("mountains",{type:"geojson",data:i}),!e.getLayer("mountains")&&e.addLayer({id:"mountains",type:"symbol",source:"mountains",layout:{visibility:l,"icon-image":["coalesce",["get","icon"],"m-medium-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-rotation-alignment":"viewport","icon-rotate":["coalesce",["get","rot"],0],"icon-size":["interpolate",["linear"],["zoom"],2,["*",.2,["coalesce",["get","sz"],1]],5,["*",.46,["coalesce",["get","sz"],1]],7,["*",.66,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const Lo="/timemap/assets/forests/",Vr="/timemap/forest-points.geojson",da=4;async function Zr(e,t){let r;try{const h=await fetch(`${Lo}${t}.svg`);if(!h.ok)return;r=await h.text()}catch{return}const l=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,c=(l.getAttribute("viewBox")||"0 0 16 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((c[2]||16)*da)),i=Math.max(1,Math.round((c[3]||16)*da)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(l));await new Promise(h=>{const b=new Image(o,i);b.onload=()=>{try{e.hasImage(t)?e.updateImage(t,b):e.addImage(t,b,{pixelRatio:da})}catch{}h()},b.onerror=()=>h(),b.src=a})}async function Jr(e,t={}){const{beforeId:r,opacity:n=1,visibility:l="visible"}=t;if(e.getLayer("forests"))return;let c;try{c=await fetch(Lo+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!c||typeof c!="object"||Ze(e))return;const o=[...new Set(Object.values(c).flat())];await Promise.all(o.map(a=>Zr(e,a)));let i;try{i=await fetch(Vr).then(a=>a.json())}catch{return}Ze(e)||(e.getSource("forests")?e.getSource("forests").setData(i):e.addSource("forests",{type:"geojson",data:i}),!e.getLayer("forests")&&e.addLayer({id:"forests",type:"symbol",source:"forests",layout:{visibility:l,"icon-image":["coalesce",["get","icon"],"g-small-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-size":["interpolate",["linear"],["zoom"],2,["*",.45,["coalesce",["get","sz"],1]],4,["*",.78,["coalesce",["get","sz"],1]],6,["*",1.05,["coalesce",["get","sz"],1]],7,["*",1.25,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const Mo="/timemap/assets/scatter/",en="/timemap/land-scatter.geojson",fa=4;async function tn(e,t){let r;try{const h=await fetch(`${Mo}${t}.svg`);if(!h.ok)return;r=await h.text()}catch{return}const l=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,c=(l.getAttribute("viewBox")||"0 0 16 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((c[2]||16)*fa)),i=Math.max(1,Math.round((c[3]||16)*fa)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(l));await new Promise(h=>{const b=new Image(o,i);b.onload=()=>{try{e.hasImage(t)?e.updateImage(t,b):e.addImage(t,b,{pixelRatio:fa})}catch{}h()},b.onerror=()=>h(),b.src=a})}async function an(e,t={}){const{beforeId:r,opacity:n=.9,visibility:l="visible"}=t;if(e.getLayer("land-scatter"))return;let c;try{c=await fetch(Mo+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!c||typeof c!="object"||Ze(e))return;const o=[...new Set(Object.values(c).flat())];await Promise.all(o.map(a=>tn(e,a)));let i;try{i=await fetch(en).then(a=>a.json())}catch{return}Ze(e)||(e.getSource("land-scatter")?e.getSource("land-scatter").setData(i):e.addSource("land-scatter",{type:"geojson",data:i}),!e.getLayer("land-scatter")&&e.addLayer({id:"land-scatter",type:"symbol",source:"land-scatter",layout:{visibility:l,"icon-image":["coalesce",["get","icon"],"s-tree-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-rotation-alignment":"viewport","icon-rotate":["coalesce",["get","rot"],0],"icon-size":["interpolate",["linear"],["zoom"],2,["*",.34,["coalesce",["get","sz"],1]],5,["*",.8,["coalesce",["get","sz"],1]],7,["*",1.1,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const Ro="/timemap/assets/volcanoes/",on="/timemap/volcanoes.geojson",ma=4;async function rn(e,t){let r;try{const h=await fetch(`${Ro}${t}.svg`);if(!h.ok)return;r=await h.text()}catch{return}const l=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,c=(l.getAttribute("viewBox")||"0 0 24 18").split(/\s+/).map(Number),o=Math.max(1,Math.round((c[2]||24)*ma)),i=Math.max(1,Math.round((c[3]||18)*ma)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(l));await new Promise(h=>{const b=new Image(o,i);b.onload=()=>{try{e.hasImage(t)?e.updateImage(t,b):e.addImage(t,b,{pixelRatio:ma})}catch{}h()},b.onerror=()=>h(),b.src=a})}async function nn(e,t={}){const{beforeId:r,opacity:n=1,visibility:l="visible"}=t;if(e.getLayer("volcanoes"))return;let c;try{c=await fetch(Ro+"manifest.json").then(i=>i.ok?i.json():null)}catch{}if(!c?.ids||Ze(e))return;await Promise.all(c.ids.map(i=>rn(e,i)));let o;try{o=await fetch(on).then(i=>i.json())}catch{return}Ze(e)||(e.getSource("volcanoes")?e.getSource("volcanoes").setData(o):e.addSource("volcanoes",{type:"geojson",data:o}),!e.getLayer("volcanoes")&&e.addLayer({id:"volcanoes",type:"symbol",source:"volcanoes",layout:{visibility:l,"icon-image":["coalesce",["get","icon"],"v-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-size":["interpolate",["linear"],["zoom"],2,.5,5,1.2,7,1.7]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}function sn(e,t){e.getLayer("volcanoes")&&e.setLayoutProperty("volcanoes","visibility",t?"visible":"none")}const ln="FeatureCollection",cn="Curated point markers for regions/peoples OpenHistoricalMap leaves blank. Label-only (no borders); clickable to start a lesson. Two enrichment modes: (a) `qid` = precise Wikidata enrichment via the endpoint; (b) `article_url` (+ optional `summary`, `inception`, `dissolution`) = a curated external article (e.g. worldhistory.org), rendered directly with no server call. decdate = numeric year, negative for BCE.",hn=[{type:"Feature",geometry:{type:"Point",coordinates:[2.6,46.8]},properties:{id:"gaul",name:"Gaul",qid:"Q38060",start_decdate:-600,end_decdate:-51}},{type:"Feature",geometry:{type:"Point",coordinates:[10,51]},properties:{id:"germania",name:"Germania",qid:"Q62646",start_decdate:-750,end_decdate:400}},{type:"Feature",geometry:{type:"Point",coordinates:[-1.8,52.5]},properties:{id:"britannia",name:"Britannia",qid:"Q849967",start_decdate:-600,end_decdate:400}}],un={type:ln,_note:cn,features:hn},dn=JSON.parse(`[{"id":"cherusci","name":"Cherusci","qid":"Q268307","from":-30,"to":300,"shape":{"spine":[[9.179779286914936,52.267083561476284],[9.305414828022947,52.268511238079725],[9.383937041215347,52.267083561476284],[9.448182488372765,52.267083561476284],[9.52813237816855,52.267083561476284],[9.609509944568003,52.26565588487267],[9.67232771512181,52.26565588487267],[9.76369901774575,52.26565588487267]],"radius_km":110,"radius_note":"The middle Weser basin around the label, out to the Teutoburg ridge in the west and the northern Harz in the south-east. It deliberately stops short of the Elbe, which several sources reach — see the disagreements."},"provenance":{"summary":"Roughly right, edges guessed. The scholarly atlas prints the name across the middle Weser but draws no border, so the position is solid and the extent is ours.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line — no source draws an edge here, so neither do we.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/98939","grade":"A","year":2000,"note":"Map 10 F4. Gives the exact line the name is printed along, dated 30 BCE - 300 CE. It prints a name, not a border."},{"key":"tacitus","title":"Tacitus, Germania 36 and Annals 1.60 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/5/59/62-70","grade":"A","year":98,"note":"A primary source, and propaganda: Tacitus never went to Germania and wrote partly to shame Rome. He gives neighbours, not distances - Chatti to the south-west, Chauci to the north."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"A specialist historical-GIS project with a published bibliography. Maps the Cherusci at 1 CE as a bounded political entity."},{"key":"wikipedia","title":"Wikipedia, 'Cherusci', with the Commons map 'Lower Rhine 10BC.png'","url":"https://en.wikipedia.org/wiki/Cherusci","grade":"D","year":2025,"note":"The map on the article is credited 'own work' with no source in its file description, which is what puts it at D. Its text is well referenced; its map is not."}],"disagreements":[{"source":"euratlas","says":"Draws the Cherusci with a hard political border. The Barrington Atlas draws none at all. A crisp frontier here is a claim nobody can support - Germanic peoples had no surveyed borders."},{"source":"tacitus","says":"Implies the Cherusci reached east towards the Elbe and the Suebi beyond it. Our shape stops well short of the Elbe, so we are drawing them smaller than the written record allows."},{"source":"wikipedia","says":"Places them 'around the middle of the Weser' and stretching towards the Elbe - the same eastward reach we left out."}]}},{"id":"chatti","name":"Chatti","qid":"Q164076","from":-30,"to":300,"shape":{"spine":[[8.381212344516712,50.59658494521722],[8.521124651659477,50.69652230746209],[8.623917367111403,50.77647219725793],[8.753652521243907,50.86987099894725],[8.864297458015017,50.95374699940277],[9.04989541646978,51.08580708522635]],"radius_km":85,"radius_note":"The Hessian uplands the label runs through - the Eder, Fulda and Lahn valleys between the Wetterau and the Kassel basin. Smaller than the others because the label itself is drawn across a compact upland, not a plain."},"provenance":{"summary":"The firmest of this set. The atlas line, the Roman writers and the modern maps all put the Chatti in the same place - what is now Hesse.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/108885","grade":"A","year":2000,"note":"Map 11 I2. The label runs south-west to north-east across Hesse, dated 30 BCE - 300 CE."},{"key":"tacitus","title":"Tacitus, Germania 30-31 and 36 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/35/359-365","grade":"A","year":98,"note":"A primary source, and propaganda. Puts the Chatti where the Hercynian forest begins, on higher and harder ground than their neighbours - which matches the uplands the atlas label crosses."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps the Chatti at 1 CE as a bounded political entity in the same region."},{"key":"wikipedia","title":"Wikipedia, 'Chatti'","url":"https://en.wikipedia.org/wiki/Chatti","grade":"C","year":2025,"note":"'A region approximately corresponding to the modern German state of Hesse' - well referenced text, and it agrees with the atlas."}],"disagreements":[{"source":"barrington-awmc","says":"The Pleiades record's own summary describes the Chatti homeland as 'the valley of the Weser River'. The Eder and Fulda do drain into the Weser system, but the peoples' heartland is the Hessian uplands, not the Weser valley proper. We follow the atlas LINE, not that sentence."},{"source":"euratlas","says":"Draws a hard political border. The atlas draws none."}]}},{"id":"marcomanni","name":"Marcomanni","qid":"Q209851","from":-9,"to":300,"date_note":"The atlas dates its label 30 BCE - 300 CE, but the shape it marks is BOHEMIA, and the Marcomanni only moved into Bohemia under Maroboduus around 9 BCE. Dating a Bohemian shape to 30 BCE would put the people somewhere they were not yet, so the start is the migration, not the label.","shape":{"spine":[[13.571490978850932,50.51861793959273],[13.876061987597211,50.48245013230428],[14.0683224368683,50.459607306648195],[14.26248645494394,50.43486091218767],[14.449036197800922,50.40821094892232],[14.656525197509382,50.36633243521959],[14.86020705960857,50.328261059126305],[15.04866037127016,50.286382545423805],[15.254245802174012,50.2387933253072],[15.456024095468365,50.18549339877649]],"radius_km":90,"radius_note":"The Bohemian basin the label crosses. Note the label runs along the NORTHERN rim of that basin, so a symmetric radius around it reaches over the Ore Mountains into Saxony and stops short of southern Bohemia. Both edges are wrong in the same way and by the same amount, which is what one honest rule costs; neither is a frontier."},"provenance":{"summary":"Good for the Marcomannic Wars, wrong if you scrub back before 9 BCE. This is their Bohemian homeland - before that they lived further west and we do not draw them there.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line, checked against the Bohemian basin the label sits in.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/118831","grade":"A","year":2000,"note":"Map 12 G2. The label runs north-west to south-east across northern Bohemia."},{"key":"tacitus","title":"Tacitus, Germania 42 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268#42","grade":"A","year":98,"note":"A primary source, and propaganda. Names the Marcomanni and Quadi as the front rank facing the Danube, and says the Marcomanni took their land by driving out the Boii."},{"key":"tir-m33","title":"Tabula Imperii Romani M33: Castra Regina - Vindobona - Carnuntum","url":"http://www.worldcat.org/oclc/311333372","grade":"A","year":1986,"note":"The scholarly atlas sheet for this stretch of the Danube frontier, pp. 55-58. Cited by Pleiades for this people; consulted through that citation rather than the sheet itself."},{"key":"wikipedia","title":"Wikipedia, 'Marcomanni'","url":"https://en.wikipedia.org/wiki/Marcomanni","grade":"C","year":2025,"note":"Well referenced text: originally near the central Elbe and Saale or in Franconia, moving to Bohemia after a defeat around 9 BCE."}],"disagreements":[{"source":"wikipedia","says":"Puts their ORIGINAL home near the central Elbe and Saale, or possibly Franconia - hundreds of kilometres west of where we draw them. That is a disagreement about the date, not the place: we draw the Bohemia they moved to, and start the shape at the move."},{"source":"barrington-awmc","says":"Dates its label from 30 BCE, twenty years before the migration it marks. We start at 9 BCE instead."}]}},{"id":"suebi-elbe","name":"Suebi","qid":"Q155085","from":-330,"to":400,"shape":{"spine":[[10.994832142162466,53.10370205112616],[11.297023689902744,52.85385864551398],[11.534969790485775,52.658742843035895],[11.751500742016333,52.45648865754032],[12.001344147628515,52.20902471293397],[12.208971949229067,52.01315739735486],[12.393380177180916,51.83469782191759],[12.631326277763947,51.638392288936586],[12.827631810744947,51.471830018528465],[13.012040038696796,51.317165053149495],[13.220242876706948,51.10301356262477]],"radius_km":140,"radius_note":"The middle Elbe corridor the label follows. Wider than the others because the label itself is 250 km long, and still far smaller than anything Tacitus describes."},"provenance":{"summary":"Treat this one with caution. 'Suebi' was an umbrella for many peoples spread over half of Germania, so no single shape is right. This is their Elbe homeland only - it is where the name starts, not where the Suebi were.","confidence":"low","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line. The shape is knowingly narrower than the sources allow, because the alternative - shading half of Europe - would be more misleading, not less.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/99040","grade":"A","year":2000,"note":"Map 10 H3. The label runs 250 km down the middle Elbe, from Mecklenburg to Saxony, dated 330 BCE - 640 CE."},{"key":"tacitus","title":"Tacitus, Germania 38-45 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268","grade":"A","year":98,"note":"A primary source, and propaganda. Treats Suebi as a category rather than a people: he says they hold the greater part of Germania and then lists a dozen separate peoples inside it."},{"key":"caesar","title":"Caesar, Bellum Gallicum 1 and 4 - Ariovistus and the Suebi on the Rhine, 58 BCE","url":"https://en.wikipedia.org/wiki/Suebi","grade":"A","year":-51,"note":"A primary source. Caesar's Suebi are on the RHINE, some 500 km west of the Elbe homeland - consulted through the Wikipedia article's citations rather than the Latin text."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps Suebi at 1 CE as a bounded political entity, alongside separate entities for Cherusci, Chatti and Quadi."}],"disagreements":[{"source":"tacitus","says":"Says the Suebi hold the greater part of Germania - many times the area we shade. Following him would mean colouring in most of central Europe under one name, which is worse history, not better."},{"source":"caesar","says":"Meets Suebi on the Rhine in 58 BCE, roughly 500 km west of anything we draw. Our shape would show nothing at all where Caesar actually fought them."},{"source":"barrington-awmc","says":"Dates the label to 640 CE. We stop at 400, because by then the name has moved to entirely different people in Iberia - Cliopatria already carries that Kingdom of the Suebi (Q1048918) as a separate territory from 414."}]}},{"id":"quadi","name":"Quadi","qid":"Q308885","from":-30,"to":400,"shape":{"spine":[[16.847541814656722,48.9466577607958],[17.124154156584495,48.88122258313547],[17.350202952138375,48.83660768927598],[17.579226073949542,48.79199279541683],[17.867735720906467,48.73548059652836]],"radius_km":65,"radius_note":"The March and lower Vah valleys the label follows. Tighter than the others, and the number was chosen by the Danube rather than by taste: the river is a real southern edge here - it is the Roman frontier - so the radius is the largest one that keeps the shape north of it at Bratislava."},"provenance":{"summary":"The Marcomanni's neighbours and allies in the wars against Marcus Aurelius. Position is solid, extent is ours, and the Danube to the south is a genuine edge rather than a guessed one.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line, kept north of the Danube.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/128501","grade":"A","year":2000,"note":"Map 13 B4. The label runs west to east along the March, dated 30 BCE - 640 CE."},{"key":"tacitus","title":"Tacitus, Germania 42 and Annals 2.63 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268#41","grade":"A","year":98,"note":"A primary source, and propaganda. Pairs the Quadi with the Marcomanni as the peoples facing the Danube frontier."},{"key":"tir-m33","title":"Tabula Imperii Romani M33: Castra Regina - Vindobona - Carnuntum","url":"http://www.worldcat.org/oclc/311333372","grade":"A","year":1986,"note":"The scholarly atlas sheet for this stretch of the Danube frontier, pp. 69-71. Cited by Pleiades for this people; consulted through that citation rather than the sheet itself."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps the Quadi at 1 CE as a bounded political entity in the same region."}],"disagreements":[{"source":"barrington-awmc","says":"Dates the label to 640 CE, long after the Quadi disappear from the record. We stop at 400, around their move west with the Vandals and Alans."},{"source":"euratlas","says":"Draws a hard political border. The atlas draws none."}]}}]`),Po={territories:dn},pa=111.32,Za=64,fn=e=>e*Math.PI/180,mn=e=>{const t=e.reduce((n,[,l])=>n+l,0)/e.length,r=pa*Math.cos(fn(t));return{forward:([n,l])=>[n*r,l*pa],inverse:([n,l])=>[n/r,l/pa]}},pn=e=>{if(e.length<3)return[...e];const t=[...e].sort((l,c)=>l[0]-c[0]||l[1]-c[1]),r=(l,c,o)=>(c[0]-l[0])*(o[1]-l[1])-(c[1]-l[1])*(o[0]-l[0]),n=l=>{const c=[];for(const o of l){for(;c.length>=2&&r(c[c.length-2],c[c.length-1],o)<=0;)c.pop();c.push(o)}return c.pop(),c};return[...n(t),...n([...t].reverse())]},gn=(e,t)=>{const{forward:r,inverse:n}=mn(e),l=[];for(const o of e){const[i,a]=r(o);for(let h=0;h<Za;h++){const b=h/Za*2*Math.PI;l.push([i+t*Math.cos(b),a+t*Math.sin(b)])}}const c=pn(l).map(n);return c.length?[...c,c[0]]:c},yn=e=>({type:"Feature",id:e.id,properties:{id:e.id,Name:e.name,Wikidata:e.qid,FromYear:e.from,ToYear:e.to,Type:"POLITY",hand:!0,confidence:e.provenance.confidence},geometry:{type:"Polygon",coordinates:[gn(e.shape.spine,e.shape.radius_km)]}}),Ja=e=>{let t=0;for(let r=0,n=e.length-1;r<e.length;n=r++)t+=e[n][0]*e[r][1]-e[r][0]*e[n][1];return Math.abs(t/2)},bn=()=>({type:"FeatureCollection",features:Po.territories.map(yn).sort((e,t)=>Ja(t.geometry.coordinates[0])-Ja(e.geometry.coordinates[0]))}),wn=e=>Po.territories.find(t=>t.id===e)??null,vn=e=>wn(e)?.provenance??null,_n="#f3ead6",xn="#d8e9f3",En=["#c9b79c","#a8b9a0","#cbb3a1","#b6a8c0","#c2c0a0","#a9bcc4","#d0bfa8","#b9a99a","#aebfa6","#c8b6b0","#b0b6a0","#bcae9e"],Tn="#f5c518",kn="#ecd9a0",An={normal:.7,selected:.95},Sn={color:"#000",width:.4,opacity:.7},Ln={color:"#3b3326",halo:"#f3ead6"},ee={land:_n,water:xn,palette:En,selected:Tn,hover:kn,fillOpacity:An,line:Sn,text:Ln},Mn=[{qid:"Q207162",use:"Q70972",note:"Kingdom of France lineage (990-1847) carries the Bourbon Restoration period item; use the Kingdom of France item"},{qid:"Q112039853",use:"Q12544",note:"Byzantine Empire polygons (633-1474) carry 'Foreign relations of the Byzantine Empire'; use the Byzantine Empire item"},{qid:"Q1179",use:"Q7703611",note:"Aquitaine 629-895 carries the 1960-2015 French administrative region; use the Duchy of Aquitaine"},{qid:"Q124661",use:"Q225890",note:"Strathclyde 644-1033 carries the 1975-1996 Scottish council region; use the Kingdom of Strathclyde"},{qid:"Q1656775",use:"Q37",note:"Interwar 'Kingdom of Lithuania' 1919-1939 carries the 1251-1263 medieval kingdom; use the Lithuania country item"},{qid:"Q751868",use:"Q159856",note:"County of Brabant 1260-1430 carries the 1085-1183 Landgraviate; use the Duchy of Brabant"},{qid:"Q12544",name:"Roman Empire",use:"Q2277",from:-31,to:394,note:"Roman Empire polygons share the Byzantine Empire QID; Eastern Roman Empire (395-632) keeps Q12544"},{qid:"Q1068371",name:"Han Dynasty",use:"Q7209",from:-202,to:237,note:"QID is the Chauhan dynasty (980-1201 keeps it); Han polygons get the Han dynasty item"},{qid:"Q1968654",name:"Han",use:"Q1574130",from:-404,to:-203,note:"QID is the Beylik of Saruhan (1314-1414 keeps it); Warring-States Han state"},{qid:"Q555994",name:"Lu",use:"Q736936",from:-750,to:-248,note:"QID is Aq Qoyunlu (1407-1511 keeps it); Lu state"},{qid:"Q1143524",name:"Qi",use:"Q837855",from:-750,to:-204,note:"QID is Northern Qi (555-576 keeps it); Qi state"},{qid:"Q1471995",name:"Qin",use:"Q34756",from:-750,to:-219,note:"QID is Former Qin (353-393 keeps it); Qin state"},{qid:"Q1472004",name:"Yan",use:"Q1055713",from:-750,to:-204,note:"QID is Former Yan (337-370 keeps it); Yan state"},{qid:"Q1574107",name:"Zhao",use:"Q197430",from:-404,to:-226,note:"QID is Former Zhao (306-336 keeps it); Zhao state"},{qid:"Q320930",name:"Wei",use:"Q912052",from:-404,to:-204,note:"QID is Cao Wei (224-264 keeps it); Warring-States Wei state"},{qid:"Q6201794",name:"Jin",use:"Q912043",from:-750,to:-405,note:"QID is the 10th-century Jin / Later Tang precursor (922-925 keeps it); Spring-and-Autumn Jin state"},{qid:"Q1936158",name:"Yue",use:"Q1137403",from:-500,to:-334,note:"QID is Minyue (-333 to -111 keeps it); Yue state"},{qid:"Q1139807",name:"Portugal",use:"Q45",note:"QID is the County of Portugal (1139-1146 keeps it); modern Portugal polygons (1976-2024) get the Portugal country item, which already has a list row"},{qid:"Q241748",use:"Q2415003",note:"Kingdom of Serbia polygons are 18x medieval (1188-1351) + one 1880-1884; QID is the 1882-1918 kingdom. Medieval item wins; the lone modern segment trades accuracy"},{qid:"Q688918",use:"Q75036",note:"Grand Duchy of Krakow 1279-1293 carries the 1846-1918 grand duchy; use the medieval Seniorate Province"},{qid:"Q79861",use:"Q2605410",note:"Michoacan 1305-1533 carries the modern Mexican state; the polity is the Purepecha (Tarascan) Empire"},{qid:"Q30592233",use:"Q48724193",note:"Pahang 1853-1889 carries the 1470-1623 old sultanate; use the Bendahara-era Pahang Kingdom (1770-1881)"},{qid:"Q109252949",use:"Q158445",note:"Duchy of Mecklenburg 1806-1870 carries the 1471-1701 duchy; use the Grand Duchy of Mecklenburg-Schwerin"},{qid:"Q373981",use:"Q2342941",note:"Tahirid Sultanate (Yemen, 1459-1515) carries the Iranian Tahirid dynasty (821-873); use the Yemeni Tahirid Sultanate"},{qid:"Q970940",use:"Q5311396",note:"Duchy of Leczyca carries the 1339-1793 Leczyca Voivodeship; use the medieval Duchy of Leczyca"},{qid:"Q13522657",use:"Q1541813",note:"County of Rosellon 896-1176 carries the 1659-1790 French province; use the County of Roussillon"},{qid:"Q5582862",use:"Q2314963",note:"Cuzco 1294-1439 carries the modern city of Cusco; the polity is the Kingdom of Cusco"},{qid:"Q1074947",use:"Q2390716",note:"'Kingdom of Pajana' 1572-1587 carries the Lontara script item; the polity is the Kingdom of Pajang (Java)"},{qid:"Q1069868",use:"Q1330290",note:"Southern Liang 397-413 carries the 502-587 Liang dynasty; use Southern Liang of the Sixteen Kingdoms"},{qid:"Q200797",use:"Q517333",note:"Principality of Polotsky carries the city of Polotsk; use the Principality of Polotsk"},{qid:"Q7038",use:"Q1233672",note:"County of Barcelona carries the city of Girona; use the County of Barcelona"},{qid:"Q17151",use:"Q2631829",note:"Commune of the Zealots 1344-1351 carries the city of Thessaloniki; use the Zealots of Thessalonica"},{qid:"Q156173",use:"Q102679",note:"Kingdom of Numidia carries king Jugurtha's biography; use the Numidia kingdom item"},{qid:"Q202266",use:"Q2196956",note:"Old Kingdom of Norway 866-1401 carries Margaret I's biography; use the Kingdom of Norway (872-1397)"},{qid:"Q4334533",use:"Q22684779",note:"Omani Slave Coast 1814-1855 carries the Omanis ethnic-group item; use the Omani Empire (1696-1856)"},{qid:"Q2330335",use:"Q815677",note:"Qarlugs 793-849 carries a Mongol-campaigns article; use the Karluks"},{qid:"Q5261548",use:"Q85816686",note:"Qasimids 1636-1802 carries the broader Rassid line; use the Qasimid State (1597-1849)"},{qid:"Q1050326",use:"Q2114397",note:"Sultan of Yogyakarta 1744-1829 carries the Hamengkubuwono dynasty item; use the Yogyakarta Sultanate"},{qid:"Q654380",use:"Q39047075",note:"Turk Shahis carries a disambiguation page; use the Turk Shahis kingdom item"},{qid:"Q81133615",use:"Q2991084",note:"Angevins 1126-1146 carries a disambiguation page; use the County of Anjou"},{qid:"Q5724",use:"Q13627537",note:"Anuradhapura -291 to 1017 carries the modern city; use the Anuradhapura period (kingdom era)"},{qid:"Q7903",use:"Q808139",note:"Barghawata Conference 793-1065 carries the city of Casablanca; use the Barghawata confederation"},{qid:"Q11256",use:"Q133878465",note:"Cuban Nationalists 1895-1899 carries Fidel Castro's biography; use the Republic of Cuba in Arms (1868-1898)"},{qid:"Q371402",use:"Q11264",note:"Cuban Communists 1958-1959 carries the 1965 Communist Party; use the Cuban Revolution"},{qid:"Q5428692",use:"Q214426",note:"Maderistas 1911 carries a Wikimedia list article; use the Mexican Revolution"},{qid:"Q2984183",use:"Q353227",note:"Duchies of Poland 1279-1304 carries the Testament of Boleslaw III item; use History of Poland during the Piast dynasty"},{qid:"Q1317991",use:"Q430309",note:"Dai Viet 1529-1833 carries the Mac dynasty (1527-1677 only); use the Dai Viet umbrella item"},{qid:"Q15984928",use:"Q371334",note:"Mexican Monarchists 1864 carries the Conservative Party; use the Second Mexican Empire, which already has a list row"},{qid:"Q7777597",use:"Q5760",note:"Thebans -350 to -338 carries a disambiguation page; use Thebes, Greece"},{qid:"Q3125978",use:"Q12491027",note:"Bali 1687-1907 carries the modern Indonesian province; use the Bali Kingdom item, which already has a list row"},{qid:"Q213763",use:"Q3137677",note:"County of Bearn 1385-1452 carries the 1620-1790 French province; use the Viscounty of Bearn"},{qid:"Q43292",use:"Q892292",note:"Sultanate of Bone 1512-1858 carries the generic 'Sultan' title item; use the Bone State (Sulawesi)"},{qid:"Q2118293",use:"Q83328",note:"'Turks' 666-756 carries the legendary Oghuz Khagan biography; use the Turkic peoples item (no single-polity article covers these polygons)"},{qid:"Q1661685",name:"Sasanian Empire",use:"Q83891",from:215,to:643,note:"QID is the Kushano-Sasanian Kingdom ('Indo-Sasanian Empire' 260-357 keeps it); the main Sasanian Empire polygons get the Sasanian Empire item"},{qid:"Q918153",name:"Ceylon",use:"Q20987440",from:1236,to:1506,note:"QID is British Ceylon (1796-1814 polygons keep it); medieval Ceylon gets the Sinhalese monarchy umbrella"},{qid:"Q2118293",name:"Oghuz Turks",use:"Q494462",from:750,to:1055,note:"QID is the legendary Oghuz Khagan; Oghuz Turks polygons get the Oghuz Turks item ('Turks' 666-756 keeps the qid-only override above)"},{qid:"Q350186",name:"Denmark",use:"Q35",from:1945,to:2024,note:"QID is Christopher II of Denmark's biography ('Danish Magnates' 1333-1351 keeps it as interregnum context); modern Denmark polygons get the Denmark country item"},{qid:"Q28513",name:"Hungary",use:"Q28",from:1947,to:2024,note:"QID is Austria-Hungary (1868-1918 polygons keep it); modern Hungary polygons get the Hungary country item, which already has a list row"},{qid:"Q59223",use:"Q197913",note:"Zhongshan (Warring-States, Hebei, -366 to -292) carries the modern Zhongshan city in Guangdong; use the Zhongshan state item"},{qid:"Q983",name:"Guinea",use:"Q1006",from:1960,to:2024,note:"QID is Equatorial Guinea (its 1969-2024 polygons keep it); Guinea-Conakry polygons get the Guinea country item"},{qid:"Q175881",use:"Q17167",note:"Roman Republic polygons (-500 to -32) carry Q175881, the 1798-1799 sister republic of the First French Republic; use the ancient Roman Republic (509-27 BC)"}],Rn={overrides:Mn},Pn=[{family:"France",color:"#4a6db3",qids:["Q207162","Q146246","Q58296","Q877619","Q219817","Q71084","Q58326","Q71092","Q70802","Q69829","Q200686","Q152582","Q69808","Q19951607","Q3561","Q3769","Q271894","Q646374","Q185682","Q5501836","Q139708","Q170604","Q1353951"]},{family:"Netherlands",color:"#d9782d",qids:["Q170072","Q55","Q774783","Q25227","Q188161","Q221283","Q1841483","Q382593","Q4807130"]},{family:"Spain",color:"#d1a437",qids:["Q29","Q80702","Q377350","Q497777","Q178038","Q13474305","Q2742116","Q600093"]},{family:"Castile",color:"#b3823a",qids:["Q179293","Q217196"]},{family:"Aragon",color:"#c9953f",qids:["Q1235737","Q199442","Q204920"]},{family:"England-Britain",color:"#b5493c",qids:["Q784963","Q200485","Q179876","Q330362","Q23666","Q8680","Q46395","Q129286","Q179848","Q370736","Q918153","Q876185"]},{family:"Scotland",color:"#52709b",qids:["Q230791"]},{family:"Portugal",color:"#4f7f57",qids:["Q1139807","Q45670","Q45","Q200464","Q16879646","Q1709007"]},{family:"Holy Roman Empire",color:"#94879b",qids:["Q12548"]},{family:"Habsburg-Austria",color:"#c2a24e",qids:["Q66504140","Q65968","Q131964","Q28513","Q40","Q187830"]},{family:"Prussia",color:"#5f646d",qids:["Q153091","Q157367","Q27306"]},{family:"Rome",color:"#9d4038",qids:["Q175881","Q12544","Q42834"]},{family:"Byzantium",color:"#7b559b",qids:["Q112039853"]},{family:"Ottomans",color:"#3f7468",qids:["Q12560","Q1529261"]},{family:"Umayyads",color:"#c5b183",qids:["Q8575586"]},{family:"Abbasids",color:"#4c5a50",qids:["Q12536"]},{family:"Russia",color:"#3f6b4c",qids:["Q186096","Q34266","Q139319","Q159","Q1108445"]},{family:"Sweden",color:"#5d89c4",qids:["Q34","Q322187","Q62589"]},{family:"Denmark",color:"#99414b",qids:["Q35","Q756617","Q62651","Q111953993"]},{family:"Norway",color:"#8c5364",qids:["Q20","Q202266"]},{family:"Poland",color:"#bd6a5e",qids:["Q577867","Q36","Q2984183","Q1515009","Q172107"]},{family:"Germany",color:"#6d7078",qids:["Q43287","Q41304","Q7318","Q713750","Q183"]},{family:"Hungary",color:"#8fa156",qids:["Q171150","Q2899771","Q28"]},{family:"Bohemia",color:"#77628b",qids:["Q2162698","Q42585"]},{family:"Venice",color:"#4e8891",qids:["Q4948"]},{family:"Genoa",color:"#8f5560",qids:["Q174306"]},{family:"Bulgaria",color:"#5e7f4e",qids:["Q191484","Q203817","Q420759","Q185488","Q815731","Q147909","Q121932"]},{family:"Serbia",color:"#8d6079",qids:["Q241748","Q1311990","Q1406298","Q878319","Q37024"]},{family:"China",color:"#c2803f",qids:["Q9683"]},{family:"China-Ming",color:"#c99435",qids:["Q9903","Q1198163"]},{family:"China-Qing",color:"#b06f3f",qids:["Q8733"]},{family:"China-Han",color:"#b8763d",qids:["Q1068371"]},{family:"Mongols",color:"#8a6a53",qids:["Q12557","Q19927420"]},{family:"Japan",color:"#c46a6a",qids:["Q188712","Q210688","Q193292","Q189178","Q204023"]},{family:"Mughals",color:"#57856b",qids:["Q33296"]},{family:"Maurya",color:"#a3814f",qids:["Q62943"]},{family:"Persia",color:"#6f5b8e",qids:["Q389688","Q1661685","Q161205"]},{family:"Inca",color:"#b7893f",qids:["Q28573"]},{family:"Aztec",color:"#86754a",qids:["Q2608489"]},{family:"United States",color:"#567aa9",qids:["Q30"]}],Cn={families:Pn},Fe=(e,t,r=0)=>{const n=1+Math.max(0,r)/Jt,l=t*Math.PI/180,c=e*Math.PI/180;return[Math.cos(l)*Math.cos(c)*n,Math.sin(l)*n,Math.cos(l)*Math.sin(c)*n]},Dn=e=>(2*Math.atan(Math.exp((1-2*e)*Math.PI))-Math.PI/2)*180/Math.PI,eo=e=>.5-Math.log(Math.tan(Math.PI/4+e*Math.PI/180/2))/(2*Math.PI),to=85.0511287798066,In=89.999,ga=6,ea=(e=64,t=48)=>{const r=[],n=[],l=[],c=a=>to+(In-to)*(a/ga),o=[];for(let a=ga;a>=1;a--)o.push(eo(c(a)));for(let a=0;a<=t;a++)o.push(a/t);for(let a=1;a<=ga;a++)o.push(eo(-c(a)));for(const a of o){const h=Dn(a)*Math.PI/180;for(let b=0;b<=e;b++){const L=b/e,w=(L*360-180)*Math.PI/180;r.push(L,a),n.push(Math.cos(h)*Math.cos(w),Math.sin(h),Math.cos(h)*Math.sin(w))}}const i=e+1;for(let a=0;a<o.length-1;a++)for(let h=0;h<e;h++){const b=a*i+h,L=b+i;l.push(b,L,b+1,L,L+1,b+1)}return{positions:new Float32Array(r),spheres:new Float32Array(n),indices:new Uint16Array(l),vertexCount:(e+1)*o.length,rowCount:o.length}},ta=`
  vec4 projectShell(vec2 pos, float elevationGlobe, float elevationMercator) {
    #ifdef GLOBE
      return projectTileFor3D(pos, elevationGlobe);
    #else
      return projectTileFor3D(clamp(pos, 0.0, 1.0), elevationMercator);
    #endif
  }
`,Ra=`
  float daylightFraction(float sunAngle) {
    return smoothstep(-0.31, 0.09, sunAngle);
  }
`,Co=`
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453123);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash(i);
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
`,Do=`
  vec2 sphereSpan(vec3 origin, vec3 dir, float radius) {
    float b = dot(origin, dir);
    float c = dot(origin, origin) - radius * radius;
    float disc = b * b - c;
    if (disc < 0.0) return vec2(1.0, -1.0);
    float sq = sqrt(disc);
    return vec2(-b - sq, -b + sq);
  }
`,Io=`
  bool facesCamera(vec3 unitPos, vec3 camera) {
    return dot(unitPos, camera) > 1.0;
  }
`,Pa=(e,t)=>{const r=ka(e),n=typeof r?.getCameraAltitude=="function"?r.getCameraAltitude():null;if(Number.isFinite(n))return n;const l=r?.cameraToCenterDistance;if(!Number.isFinite(l))return 1e7;const c=512*Math.pow(2,e.getZoom()),o=1/t.MercatorCoordinate.fromLngLat(e.getCenter(),0).meterInMercatorCoordinateUnits();return l/c*o*Math.cos(e.getPitch()*Math.PI/180)},ct=(e,t)=>{const r=ka(e)?.cameraPosition;if(r&&Number.isFinite(r[0])&&Number.isFinite(r[1])&&Number.isFinite(r[2]))return[r[2],r[1],r[0]];const n=ka(e),l=typeof n?.getCameraLngLat=="function"?n.getCameraLngLat():e.getCenter();return Fe(l.lng,l.lat,Pa(e,t))},Uo=e=>typeof e.texStorage2D=="function",Un=`#version 300 es
#define attribute in
#define varying out
#define texture2D texture
`,Fn=`#version 300 es
#define varying in
#define texture2D texture
out highp vec4 tm_fragColour;
#define gl_FragColor tm_fragColour
`,ze=(e,t,r,n="layer",{es300:l=!1}={})=>(l&&Uo(e)&&(t=Un+t,r=Fn+r),On(e,t,r,n)),On=(e,t,r,n)=>{const l=(a,h)=>{const b=e.createShader(a);if(e.shaderSource(b,h),e.compileShader(b),!e.getShaderParameter(b,e.COMPILE_STATUS)){const L=e.getShaderInfoLog(b);throw e.deleteShader(b),new Error(`${n} shader: ${L}`)}return b},c=e.createProgram(),o=l(e.VERTEX_SHADER,t),i=l(e.FRAGMENT_SHADER,r);if(e.attachShader(c,o),e.attachShader(c,i),e.linkProgram(c),e.deleteShader(o),e.deleteShader(i),!e.getProgramParameter(c,e.LINK_STATUS)){const a=e.getProgramInfoLog(c);throw e.deleteProgram(c),new Error(`${n} link: ${a}`)}return c},aa=`
  vec2 equirectUV(vec3 dir, float drift) {
    return vec2(atan(dir.z, dir.x) / 6.28318530718 + 0.5 + drift,
                0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265359);
  }

  vec2 equirectUVInside(vec3 dir, float drift) {
    return vec2(-atan(dir.z, dir.x) / 6.28318530718 + 0.5 + drift,
                0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265359);
  }
`,Xt=9e4,Fo=`
  uniform float u_time;
  uniform float u_drift;        // slow west-to-east rotation of the whole field
  uniform sampler2D u_field;    // real cloud cover, equirectangular
  uniform float u_fieldAmount;  // 0 = no real field loaded
  uniform sampler2D u_wind;     // real wind field: R = eastward, G = southward, 0.5 = still
  uniform float u_windAmount;   // 0 = the field sits still, 1 = fully advected
  uniform float u_windScale;    // how far the flow carries per cycle, in UV
  uniform float u_windRate;     // cycles per second
  uniform sampler2D u_patches;  // harvested NASA cloud patches, 3x2 of 2048px coverage tiles
  uniform float u_patchAmount;  // 0 = no atlas, fall back to the whole-planet field
  uniform float u_patchTiles;   // lattice cells around the equator
  uniform float u_patchMean;    // the atlas's own mean coverage; see the blend below
  uniform float u_patchDetail;  // how much patch variation rides on the global distribution

  vec2 windAt(vec2 uv, float lat) {
    vec2 wind = texture(u_wind, uv).rg * 2.0 - 1.0;
    // Degrees of longitude per metre grow toward the poles; without this correction the flow slows
    // to a crawl at high latitude and the polar cells stop turning.
    wind.x /= max(cos(lat), 0.25);
    return wind * u_windScale;
  }

  // ── The tiled source ──────────────────────────────────────────────────────────────────────────
  //
  // The whole-planet field is 2048x1024 — 19.5 km per texel — against ground running under a
  // kilometre, so it collapses to a grey wash on approach. The atlas is real MODIS cloud at 306 m
  // per texel, sixty-four times finer, but it is only six patches of open ocean: 626 km of sky each.
  // Laid down on a plain grid it would repeat every 626 km, and a visible repeat over open ocean is
  // a worse artefact than the blur it replaces.
  //
  // So it is laid down stochastically. Heitz & Neyret's triangle grid: every point falls inside one
  // triangle of a skewed lattice, and the three vertices of that triangle each choose a patch, a
  // window inside it and an angle, at random from their own coordinates. Three taps, blended by the
  // barycentric weights. Nothing about the result is periodic, because nothing about the choice is.
  //
  // WHY A WINDOW AND NOT A WRAPPED OFFSET, which is what the original technique uses. It assumes a
  // tileable exemplar. These are photographs of the Atlantic; wrapping one draws a hard straight
  // edge across the sky where its left meets its right. A window that stays inside the patch has no
  // seam to show, and the patch is twice the size of a cell, so there is room to move it.
  const vec2 CLOUD_PATCH_GRID = vec2(3.0, 2.0);
  const float CLOUD_PATCH_COUNT = 6.0;
  const float CLOUD_PATCH_TEXELS = 2048.0;
  // Patch widths around the equator: 40075 km of circumference over 626 km of patch. It is what
  // makes the atlas display at its native resolution whatever u_patchTiles is set to — and it is why
  // the geometry has not moved once across three source zooms: the footprint never changed.
  const float CLOUD_PATCH_WIDTHS = 64.0;

  uint cloudMix(uint h) {
    h ^= h >> 16; h *= 2246822519u;
    h ^= h >> 13; h *= 3266489917u;
    h ^= h >> 16;
    return h;
  }

  // An integer hash rather than the usual fract(sin(dot(...))): sin at large arguments is where
  // GPUs disagree, and the cheap end of the range this has to run on is exactly where it would.
  float cloudUnit(uint h) { return float(h & 0x00ffffffu) / 16777216.0; }

  /**
   * One lattice vertex's choice of exemplar, sampled at "local" (cell units, -0.5..0.5).
   *
   * ddx and ddy are the atlas-space derivatives of the CONTINUOUS coordinate, handed in rather than
   * left to the sampler. This is the artefact that would otherwise define the whole effect: the UV
   * jumps at every cell boundary — different patch, different window, different angle — so the
   * automatic derivative there is enormous, the sampler drops to its coarsest mip, and a soft dark
   * line is drawn along every edge of the lattice. The tiling would announce itself in exactly the
   * shape it exists to hide. Rotation does not change a derivative's magnitude, so one unrotated
   * pair is right for all three vertices.
   */
  float cloudPatchAt(vec2 vertex, vec2 local, vec2 ddx, vec2 ddy) {
    // The lattice repeats every u_patchTiles columns, and skewing leaves that period intact — the
    // skew's x depends on x alone. Folding the column index here is what makes the antimeridian
    // join: without it the last column and the first choose different patches and a seam runs down
    // the middle of the Pacific.
    float column = mod(vertex.x, u_patchTiles);
    uint h = cloudMix(uint(int(column)) * 374761393u + uint(int(vertex.y)) * 668265263u);
    float pick = cloudUnit(h);
    h = cloudMix(h);
    float angle = cloudUnit(h) * 6.2831853;
    h = cloudMix(h);
    float ox = cloudUnit(h);
    h = cloudMix(h);
    float oy = cloudUnit(h);

    // A random angle as well as a random window. Without it every cell lays its cloud down on the
    // same axis, and the eye finds that even when it cannot find the repeat itself.
    float s = sin(angle);
    float c = cos(angle);
    vec2 turned = mat2(c, s, -s, c) * local;

    // How much of a patch one cell covers, and how much room that leaves the window to move in.
    // The rotated cell needs its diagonal, not its width — 1.414, not 1 — or a corner swings past
    // the patch edge and the clamp below flattens it into a streak.
    float span = clamp(CLOUD_PATCH_WIDTHS / max(u_patchTiles, 1.0), 0.02, 0.7);
    float room = max(0.0, 1.0 - 1.41421356 * span);
    vec2 inPatch = vec2(ox, oy) * room + 0.70710678 * span + turned * span;

    // Half a texel in from the patch's own edge. The six sit in one atlas, so bilinear at the edge
    // of a patch reaches into its neighbour — a different sky, bled in along a straight line.
    const float INSET = 0.5 / CLOUD_PATCH_TEXELS;
    inPatch = clamp(inPatch, vec2(INSET), vec2(1.0 - INSET));

    float index = min(floor(pick * CLOUD_PATCH_COUNT), CLOUD_PATCH_COUNT - 1.0);
    vec2 grid = vec2(mod(index, CLOUD_PATCH_GRID.x), floor(index / CLOUD_PATCH_GRID.x));
    return textureGrad(u_patches, (grid + inPatch) / CLOUD_PATCH_GRID, ddx, ddy).r;
  }

  /**
   * The atlas, laid across the sphere with no repeat in it.
   *
   * The UV derivatives are handed IN rather than taken here, and that is not tidiness. This is
   * called three times per sample — once at the plain coordinate and twice at coordinates displaced
   * by the wind — and the displaced ones carry the flow's own variation in their derivatives. Where
   * the flow changes quickly, which is exactly where meridians converge, that estimate explodes,
   * the sampler drops to its coarsest level and the atlas smears along the meridians. It draws as a
   * starburst of fine streaks spiralling out of the pole.
   *
   * It needed BOTH to appear: switching off advection removed it with the tiling still on, and
   * switching off the tiling removed it with advection still on, which is what identified it. The
   * displacement is a smooth offset, so the undisplaced coordinate's derivatives describe the
   * footprint just as well and have nothing pathological in them.
   */
  float tiledPatchField(vec2 uv, float lat, vec2 duvdx, vec2 duvdy) {
    // The lattice lives in equirect UV, which is the space both readers of this field already work
    // in — so the ground's shadows keep sampling exactly what the deck draws, with no second
    // coordinate system to get out of step.
    //
    // Cells are UV-square, so on the ground they narrow toward the poles. What is corrected is the
    // LOCAL coordinate, by cos(lat): that keeps the cloud SHAPES ground-square, which is what the
    // eye reads. A stretched lattice underneath them is invisible, because the blend below never
    // lets a cell boundary show.
    vec2 lattice = vec2(uv.x * u_patchTiles, uv.y * u_patchTiles * 0.5);
    const mat2 SKEW = mat2(1.0, 0.0, -0.57735027, 1.15470054);
    vec2 skewed = SKEW * lattice;

    vec2 base = floor(skewed);
    vec2 f = skewed - base;
    vec3 weights;
    vec2 v1, v2, v3;
    if (f.x + f.y < 1.0) {
      weights = vec3(1.0 - f.x - f.y, f.y, f.x);
      v1 = base;
      v2 = base + vec2(0.0, 1.0);
      v3 = base + vec2(1.0, 0.0);
    } else {
      // 1-f.y ON v2 AND 1-f.x ON v3, and the pairing is the whole of it. Written the other way
      // round — which is what shipped — the two triangles of a square hand the SAME vertex
      // different weights along their shared diagonal: at f.x+f.y=1 the lower triangle gives
      // (1,0) a weight of f.x while the upper gives it f.y. The blend then steps discontinuously
      // across every diagonal in the lattice, and the deck comes out covered in hard-edged
      // triangles.
      //
      // The non-repetition measurement cannot see this and was right not to. Autocorrelation finds
      // PERIOD, and a grid whose every cell draws a different window at a different angle has none:
      // it read 0.028 on the build that was visibly ruined. Repeating and seamless are different
      // properties. Photographed by Map works, and now measured by cloudSeams in the harness.
      weights = vec3(f.x + f.y - 1.0, 1.0 - f.y, 1.0 - f.x);
      v1 = base + vec2(1.0, 1.0);
      v2 = base + vec2(1.0, 0.0);
      v3 = base + vec2(0.0, 1.0);
    }

    /**
     * SMOOTHED WEIGHTS, and this is the second half of making the lattice invisible.
     *
     * Fixing the transposed weights above made the blend continuous in VALUE. It is still not
     * continuous in SLOPE: crossing a diagonal swaps which exemplar is entering for which is
     * leaving, so each one's contribution starts growing exactly where another's stopped, and the
     * field gets a crease along every edge of the lattice. A crease is a straight line, and after
     * the coverage smoothstep the eye finds it as readily as a step would — the seam ratio only fell
     * from 1.21 to 1.06 on the value fix alone, and then rose again the moment the global
     * distribution put the field back on the steep part of that curve.
     *
     * Smoothstepping each weight before normalising sends it to zero with zero derivative, so an
     * exemplar fades in and out rather than switching on at an angle. The blend becomes C1 across
     * the boundaries and there is no crease left to see.
     */
    weights = weights * weights * (3.0 - 2.0 * weights);
    weights /= max(1.0e-5, weights.x + weights.y + weights.z);

    // Back out of the skew to get each vertex's own position, so "local" is measured in the same
    // undistorted cell units the window maths above expects.
    const mat2 UNSKEW = mat2(1.0, 0.0, 0.5, 0.86602540);
    vec2 aspect = vec2(max(cos(lat), 0.05), 1.0);

    // The footprint, from the caller's undisplaced coordinate. Clamped because the lattice steps a
    // whole revolution at the antimeridian, and one unbounded column of derivatives there would blur
    // a line down the Pacific — the same artefact as the cell edges, arriving by a different route.
    float span = clamp(CLOUD_PATCH_WIDTHS / max(u_patchTiles, 1.0), 0.02, 0.7);
    vec2 scale = span / CLOUD_PATCH_GRID;
    vec2 perCell = vec2(u_patchTiles, u_patchTiles * 0.5) * aspect * scale;
    vec2 ddx = clamp(duvdx * perCell, vec2(-0.25), vec2(0.25));
    vec2 ddy = clamp(duvdy * perCell, vec2(-0.25), vec2(0.25));

    float c1 = cloudPatchAt(v1, (lattice - UNSKEW * v1) * aspect, ddx, ddy);
    float c2 = cloudPatchAt(v2, (lattice - UNSKEW * v2) * aspect, ddx, ddy);
    float c3 = cloudPatchAt(v3, (lattice - UNSKEW * v3) * aspect, ddx, ddy);

    // VARIANCE-PRESERVING, not a plain average. Averaging three independent skies is how stochastic
    // tiling loses its contrast: where the weights are even it flattens by 1/sqrt(3), where one
    // vertex dominates it does not, and that difference is itself a visible pattern in the shape of
    // the lattice. Re-normalising against the atlas's own mean holds the contrast constant, so the
    // grid stays where it belongs, which is invisible.
    vec3 centred = vec3(c1, c2, c3) - u_patchMean;
    float spread = max(0.001, sqrt(dot(weights, weights)));
    return clamp(u_patchMean + dot(weights, centred) / spread, 0.0, 1.0);
  }

  /**
   * Cloud cover at an equirectangular UV — the two sources doing the two jobs neither can do alone.
   *
   * THE ATLAS ALONE MAKES THE WHOLE PLANET OVERCAST, and structurally rather than by a setting.
   * Every patch was harvested over open ocean in cloudy latitudes, because that is where cloud
   * separates on brightness — so tiled uniformly, the atlas's own cloud fraction becomes the
   * planet's. Measured across the disc: 74.3% covered against the real distribution's 26.5%, nearly
   * three times too much. The sea disappeared and the Sahara washed out.
   *
   * No amount of tiling can invent the missing thing, which is WHERE cloud is not. Earth is roughly
   * two-thirds covered but distributed — subtropical highs, deserts, continental interiors are
   * genuinely clear, and those clear regions are most of what makes a globe read as a globe.
   *
   * So each source does what it is actually good for. The whole-planet field is hopeless as texture
   * at 19.5 km per texel, but it is the REAL global distribution and nothing else here is. The
   * patches are hopeless as a distribution but carry real cloud shape at 2446 m. The field sets how
   * much cloud belongs at a place; the patches say what it looks like when it is there.
   *
   * Centred on the atlas's own mean before it is added, so the patches contribute VARIATION and not
   * a bias — otherwise the whole planet lifts by 0.47 and the overcast comes straight back.
   */
  float globalFieldAt(vec2 uv) {
    return u_fieldAmount > 0.0 ? texture(u_field, uv).r : u_patchMean;
  }

  float cloudSourceAt(vec2 uv, float lat, vec2 duvdx, vec2 duvdy, float global) {
    if (u_patchAmount <= 0.0) return global;

    /**
     * THE TILING LETS GO AT THE POLES, and it has to.
     *
     * The lattice lives in equirect UV, where u spans the whole world however small the circle of
     * latitude actually is. Approaching the pole, a few pixels of screen cover the entire u range:
     * cells collapse to nothing, all three taps land on the same texel, and every sample smears
     * along its meridian. It draws as a starburst of thin white streaks radiating from the pole —
     * photographed on the globe camera, and the same family of singularity the mesh's cap rows and
     * the sky layer's mirrored lookup already exist to handle.
     *
     * The whole-planet field has no such problem: it is one texture read at whatever UV, so it
     * degrades to a smear of its own texels and nothing more. Fading into it costs one smoothstep.
     *
     * The last eight degrees only. This was briefly widened to start at 58, chasing streaks that
     * were reported as a pole artefact and turned out — once the latitude was measured rather than
     * estimated from a picture — to sit at 58.8 and be caused by advection warping the lattice.
     * Fixing that where it lived made the wide fade unnecessary, and it was costing real cloud
     * structure across Iceland and Scandinavia for nothing. This is the genuine singularity guard.
     */
    float polar = smoothstep(1.3614, 1.5010, abs(lat));   // 78 to 86 degrees
    if (polar >= 1.0) return global;

    float detail = tiledPatchField(uv, lat, duvdx, duvdy);
    float tiled = clamp(global + (detail - u_patchMean) * u_patchDetail, 0.0, 1.0);
    return mix(tiled, global, polar);
  }

  /**
   * THE WIND CARRIES THE FIELD, NOT THE DETAIL — and that division is the fix for the streaks.
   *
   * Advection is a spatially varying warp. Applied to the smooth 19.5 km field it does what it is
   * meant to: weather turns. Applied to the tiled atlas it stretches the lattice cells along the
   * flow, and where the flow is strongest they draw as fine radiating streaks. Measured, the worst
   * of it sits at 58.8 N and runs from about 50 to 70 — the storm track, where the wind field has
   * its real circulation. NOT the pole, which is where it was first reported and where two rounds of
   * fixes were aimed before the latitude was actually measured rather than estimated from a picture.
   *
   * It needed both terms to appear: switching off advection removed it with the tiling on, and
   * switching off the tiling removed it with advection on. So advect the one that warps gracefully
   * and leave the one that does not. The detail is texture, and texture does not need to be carried
   * along a flow to be believable.
   *
   * It is also much cheaper. The tiled field is now sampled ONCE rather than three times: three
   * texture reads a pixel instead of nine, on the layer whose frame cost cannot be measured here.
   */
  float advectedField(vec2 uv, float lat) {
    // One footprint for the whole sample, measured on the coordinate the caller asked about.
    vec2 duvdx = dFdx(uv);
    vec2 duvdy = dFdy(uv);

    float global = globalFieldAt(uv);
    if (u_windAmount > 0.0) {
      vec2 flow = windAt(uv, lat);
      float cycle = u_time * u_windRate;
      float phase1 = fract(cycle);
      float phase2 = fract(cycle + 0.5);
      float blend = abs(1.0 - 2.0 * phase1);     // triangle wave: 1 at the resets, 0 mid-cycle
      float a = globalFieldAt(uv - flow * phase1);
      float b = globalFieldAt(uv - flow * phase2);
      global = mix(mix(a, b, blend), global, 1.0 - u_windAmount);
    }

    return cloudSourceAt(uv, lat, duvdx, duvdy, global);
  }
`,Oo=["time","drift","field","fieldAmount","wind","windAmount","windScale","windRate","patches","patchAmount","patchTiles","patchMean","patchDetail"],Nn=.75,Bn=144,Qn=.4335,No=(e,t,r,n,l,c,o)=>{const i=r.animate?n.seconds:0;t.time&&e.uniform1f(t.time,i),t.drift&&e.uniform1f(t.drift,i*r.driftRate),t.fieldAmount&&e.uniform1f(t.fieldAmount,n.field?.ready?1:0),t.patchAmount&&e.uniform1f(t.patchAmount,n.patches?.ready?1:0),t.patchTiles&&e.uniform1f(t.patchTiles,r.patchTiles??Bn),t.patchMean&&e.uniform1f(t.patchMean,r.patchMean??Qn),t.patchDetail&&e.uniform1f(t.patchDetail,r.patchDetail??Nn),t.windAmount&&e.uniform1f(t.windAmount,n.wind?.ready?r.windAmount:0),t.windScale&&e.uniform1f(t.windScale,r.windScale),t.windRate&&e.uniform1f(t.windRate,r.animate?r.windRate:0),n.field?.ready&&t.field&&(e.activeTexture(e.TEXTURE0+l),e.bindTexture(e.TEXTURE_2D,n.field.texture),e.uniform1i(t.field,l)),n.wind?.ready&&t.wind&&(e.activeTexture(e.TEXTURE0+c),e.bindTexture(e.TEXTURE_2D,n.wind.texture),e.uniform1i(t.wind,c)),n.patches?.ready&&t.patches&&(e.activeTexture(e.TEXTURE0+o),e.bindTexture(e.TEXTURE_2D,n.patches.texture),e.uniform1i(t.patches,o))},ao=new WeakMap,qn=e=>{let t=ao.get(e);return t||(t=new Map,ao.set(e,t)),t},Hn=(e,t)=>t!==1?{internal:e.RGBA,format:e.RGBA}:typeof e.texStorage2D=="function"?{internal:e.R8,format:e.RED}:{internal:e.LUMINANCE,format:e.LUMINANCE},zn=(e,t,r,n)=>{const l=e.createTexture();e.bindTexture(e.TEXTURE_2D,l),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1);const{internal:c,format:o}=Hn(e,n);return e.texImage2D(e.TEXTURE_2D,0,c,o,e.UNSIGNED_BYTE,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,r?e.LINEAR_MIPMAP_LINEAR:e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),r&&e.generateMipmap(e.TEXTURE_2D),l},Ce=(e,t,r=null,{mipmap:n=!0,channels:l=4}={})=>{const c=qn(e),o=`${t}|${n?"mip":"flat"}|c${l}`;let i=c.get(o);if(!i){i={texture:null,ready:!1,refs:0,waiters:[],width:0},c.set(o,i);const h=new Image;h.crossOrigin="anonymous",h.onload=()=>{if(i.refs===0)return;const b=e.getParameter?.(e.MAX_TEXTURE_SIZE)??1/0;if(h.width>b){i.waiters=[];return}i.width=h.width,i.texture=zn(e,h,n,l),i.ready=!0;const L=i.waiters;i.waiters=[],L.forEach(w=>w())},h.onerror=()=>{i.waiters=[]},h.src=t}i.refs++;let a=!0;return r&&(i.ready?r():i.waiters.push(r)),{get texture(){return i.texture},get ready(){return i.ready},get width(){return i.width},release(){a&&(a=!1,r&&(i.waiters=i.waiters.filter(h=>h!==r)),i.refs--,!(i.refs>0)&&(i.texture&&e.deleteTexture(i.texture),i.texture=null,i.ready=!1,c.delete(o)))}}},Bo=`
  mat3 equirectTangentFrame(vec3 unitPos) {
    vec3 up = normalize(unitPos);
    vec3 east = cross(up, vec3(0.0, 1.0, 0.0));
    float span = length(east);
    // Standing on a pole, every direction is south and no direction is east. Pick one rather than
    // dividing by zero and putting a NaN in the middle of Antarctica.
    east = span > 1.0e-4 ? east / span : vec3(0.0, 0.0, 1.0);
    return mat3(east, cross(up, east), up);
  }
`,Qo=`
  /**
   * Unpack a baked normal, around the same centre encodeNormals packed it around.
   *
   * The usual texel*2-1 is very slightly wrong here, and wrong in a way that shows. Flat ground
   * bakes to byte 128, and 128/255*2-1 is 0.0039 rather than 0 — a constant tilt, applied to every
   * flat texel on earth, which is to say a constant brightness offset over every ocean. Measured
   * against a known grey it moved the Bay of Bengal by a full 8-bit level while the mountains it
   * was meant to be shading moved by sixty. Subtracting the encoder's own centre leaves water
   * EXACTLY untouched, which is the property the whole difference formulation is built on.
   */
  vec3 decodeTerrainNormal(vec3 texel) {
    return (texel - ${(128/255).toFixed(8)}) * 2.0;
  }

  float reliefLightFactor(vec3 up, vec3 perturbed, vec3 sunDir, float power) {
    return 1.0 + power * (dot(perturbed, sunDir) - dot(up, sunDir));
  }
`,Gn=`
  vec3 cloudShadowDirection(vec3 up, vec3 sunDir, float altitudeRadii) {
    float cosZenith = dot(up, sunDir);
    float reach = altitudeRadii * (2.0 + altitudeRadii);
    return normalize(up + sunDir * (-cosZenith + sqrt(max(0.0, cosZenith * cosZenith + reach))));
  }

  // Below a low sun the ground is already in twilight and a cast shadow means nothing; above it,
  // full strength. Without this the shadows stretch to the horizon as the sun sets.
  float cloudShadowFade(vec3 up, vec3 sunDir) {
    return smoothstep(0.05, 0.30, dot(up, sunDir));
  }
`,$n=(e,t)=>2*Math.PI*Jt*Math.cos(t*Math.PI/180)/e,Wn=(e,t,r)=>Math.min(r,Math.max(t,e)),jn=(e,t,r)=>{const n=Wn((r-e)/(t-e),0,1);return n*n*(3-2*n)},Yn=(e,t,r)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e)/2,l=$n(r,t)/n;return{pixelsPerTexel:l,strength:1-jn(3,5,Math.log2(Math.max(l,1e-6)))}},qo="tm-clouds",Xn=(e,t,r)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e),c=156543.03392/2**9,o=Math.min(1,n/c),a=Jt/Math.max(1,n*110);return{frequency:Math.min(2600,Math.max(9,a)),amount:.14+(1-o)*.1,fade:Number.isFinite(r)?Kn(1.35,2.75,r/Xt):0}},Kn=(e,t,r)=>{const n=Math.min(1,Math.max(0,(r-e)/(t-e)));return n*n*(3-2*n)},Vn=e=>`#version 300 es
${e.define}
${e.vertexShaderPrelude}
in vec2 a_pos;
in vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
out vec3 v_sphere;
${ta}
void main() {
  v_sphere = a_sphere;
  // Globe wants metres above the sphere; mercator wants z in mercator units. Same deck, two rulers.
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,Zn=()=>`#version 300 es
precision highp float;
in vec3 v_sphere;
out vec4 fragColour;
uniform float u_opacity;
uniform vec3 u_sun;           // direction TO the sun
uniform float u_detailFreq;   // noise cycles per unit sphere; rises as the camera descends
uniform float u_detailAmount; // how much of the structure the noise carries, vs the real field
uniform float u_deckFade;     // 0 once the camera is below the deck and clouds stop making sense
uniform vec3 u_camera;        // camera in planet space, earth = unit sphere
// The four lighting terms, each zero-is-off so the deck returns exactly to its old look and each
// can be measured on its own. See the lighting block below for what every one of them buys.
uniform float u_cloudRelief;    // how tall fully covered sky stands, in km; 0 disables the normal
uniform float u_cloudDepth;     // optical depth of fully covered sky, for Beer-Powder
uniform float u_powder;         // how much thin edges darken beyond the plain exponential
uniform float u_forward;        // the silver lining: one Henyey-Greenstein lobe
uniform float u_forwardG;       // that lobe's asymmetry, 0 isotropic, ->1 sharply forward
uniform float u_selfShadow;     // one extra mask read offset toward the sun
uniform float u_selfShadowStep; // how far that read walks, in sphere radii
${Co}
${aa}
${Ra}
${Bo}
${Qo}
// The field, the wind and the clock the ground's cloud shadows read from the same source.
${Fo}

/**
 * The cloud's SHAPE at a UV — the whole-planet field, thresholded the same way the deck is.
 *
 * Deliberately not the atlas and not the noise. Both carry detail far finer than a cloud's overall
 * form, and a gradient taken across either is dominated by that detail rather than by the shape it
 * is supposed to describe.
 */
float shapeFieldAt(vec2 uv) {
  return smoothstep(0.16, 0.62, texture(u_field, uv).r);
}

void main() {
  vec3 p = normalize(v_sphere);

  // ── Detail ────────────────────────────────────────────────────────────────────────────────
  // Sampled on the SPHERE, so cloud cells stay the same size at Iceland as at the equator and the
  // field wraps seamlessly across ±180°.
  //
  // The frequency is NOT fixed. A fixed one is what makes the deck fall apart on approach: the
  // real field is 2048x1024, about 19.5 km per pixel, so it is already magnified 16x by z7 and
  // 256x by z11. Past that it is a smooth gradient, the noise on top of it is far too coarse to
  // read, and the whole deck becomes a milky wash over sharp ground. u_detailFreq rises as the
  // camera descends to hold cloud cells at a roughly constant size ON SCREEN, so there is always
  // structure to look at.
  //
  // The warp is what makes it look like weather rather than blobs: displacing the sample point by
  // a lower-frequency noise stretches the cells into filaments and hooks, which is the shape air
  // actually leaves. One extra fbm buys most of the difference.
  float warp = fbm(p * u_detailFreq * 0.35 + vec3(0.0, 0.0, u_time * 0.003));
  float detail = fbm(p * u_detailFreq
                     + vec3(warp, warp * 0.7, -warp * 0.4) * 0.6
                     - vec3(0.0, u_time * 0.01, 0.0));

  float coverage;
  /**
   * Where to read the cloud's SHAPE, as opposed to the cloud that is drawn.
   *
   * Differentiation is a high-pass filter, so a normal computed from the drawn coverage is
   * dominated by whatever varies fastest in it. Lit by a normal, that came out as fine directional
   * hatching over the whole deck — brush strokes rather than cloud, unmissable over Ireland and
   * invisible at globe zoom. Turning this one term off was what identified it.
   *
   * IT TOOK THREE GOES, and the two failures are the useful part. Bounding the slope did almost
   * nothing: the trouble was never the size of the gradient. Removing the procedural noise from it
   * did nothing either, which ruled out the obvious culprit. What is left is the atlas itself — at
   * this range it is sampled at roughly one texel per pixel, and a screen-space derivative of a
   * field varying at the pixel scale is not a measurement of anything. Mipmapping does not save it,
   * because minification picks the level where one texel IS one pixel, so the estimate sits at
   * Nyquist at every zoom the deck is drawn at.
   *
   * So the shape comes from the whole-planet field alone: 19.5 km per texel, hopeless as texture and
   * ideal here. It is also the honest division of labour — light the weather SYSTEMS, whose tops
   * really do catch the sun, and leave the fine structure as what it is, which is texture.
   */
  vec2 shapeUV = equirectUV(p, u_drift);
  // Either real source will do here — the question is only whether there is real weather to draw at
  // all, or whether the deck falls back to latitude-banded noise. Asking about the global field
  // alone would put procedural cloud on a build where the atlas had loaded and it had not.
  if (u_fieldAmount > 0.0 || u_patchAmount > 0.0) {
    // Real weather. The texture decides WHERE cloud is; the noise decides what its edges look
    // like — and as the field runs out of resolution, u_detailAmount hands the noise more of the
    // job, until at close range it is carrying the structure on its own.
    float field = advectedField(shapeUV, asin(clamp(p.y, -1.0, 1.0)));
    coverage = smoothstep(0.16, 0.62, field + u_detailAmount * (detail - 0.5));
  } else {
    float cover = fbm(p * 3.2 + vec3(u_time * 0.006, 0.0, u_time * 0.004)) + 0.35 * detail;
    // Earth's cloud is banded, not evenly scattered: a wet belt at the equator, the clear
    // subtropical highs where the deserts are, then cloudy mid-latitudes again. Without this the
    // fallback reads as a snowball — every ocean and every desert under the same porridge.
    float sinLat = p.y;
    float band = 1.0
      + 0.35 * exp(-pow(sinLat / 0.16, 2.0))                    // ITCZ
      - 0.40 * exp(-pow((abs(sinLat) - 0.50) / 0.16, 2.0))      // subtropical highs
      + 0.20 * exp(-pow((abs(sinLat) - 0.82) / 0.18, 2.0));     // storm tracks
    coverage = smoothstep(0.70, 1.02, cover * band);
  }

  // ── Lighting ──────────────────────────────────────────────────────────────────────────────
  // A cloud emits nothing. It is only ever as bright as what is falling on it, so on the night
  // side it has to go dark along with the ground — a white deck glowing over a black planet is the
  // tell of clouds pasted on as decoration rather than lit as part of the scene.
  vec3 sunDir = normalize(u_sun);
  float sunAngle = dot(p, sunDir);
  float day = daylightFraction(sunAngle);

  // ── 1. Shape, from the mask's own gradient ────────────────────────────────────────────────
  //
  // CLOUD COVERAGE IS A HEIGHTFIELD — thicker cloud is taller cloud — so the deck can have a real
  // normal, and cyclone tops catch the light while their far sides fall into shade. It is the
  // single biggest thing separating cloud from a grey wash, and it is the relief pipeline the
  // ground already uses with a different input: the same tangent frame, the same difference
  // formulation, so a flat deck is left exactly as it was and the effect is naturally strongest at
  // the terminator.
  //
  // FOUR TAPS OF THE COARSE FIELD, which is not where this started. The gradient was taken from
  // screen-space derivatives, twice, because they are free — and both times the result was an
  // artefact rather than a slope. See below for why a fixed step in the field is the only version
  // of this that holds at every zoom.
  mat3 frame = equirectTangentFrame(p);
  vec3 cloudNormal = frame[2];
  if (u_cloudRelief > 0.0) {
    /**
     * The gradient over a FIXED STEP IN THE FIELD, not from screen-space derivatives.
     *
     * Screen derivatives were the third failure of this term and the subtlest. Bilinear
     * interpolation is bilinear WITHIN a texel, so its derivative is discontinuous ACROSS texel
     * boundaries — piecewise, with a jump at every edge. dFdx of it therefore returns a value that
     * is constant-ish inside a texel and steps at the border, and the deck came out in hard-edged
     * rectangles the size of the field's texels. They showed over bright land and hid over dark sea,
     * which is what made them look like a shadow problem; they survive with the shadow switched off.
     *
     * Both earlier attempts were the same mistake at opposite ends. Taking the gradient from the
     * atlas put it at Nyquist and gave hatching; taking it from the 19.5 km field put it below the
     * texel grid and gave blocks. A screen-space derivative is only meaningful where the field
     * varies smoothly across a PIXEL, and neither source does at every zoom.
     *
     * A fixed step in UV has no such dependence. It straddles more than a texel by construction, so
     * it is the same gradient at every zoom, and there is no screen scale left in it to alias.
     */
    const vec2 SHAPE_STEP = vec2(1.5 / 2048.0, 1.5 / 1024.0);
    float east = shapeFieldAt(shapeUV + vec2(SHAPE_STEP.x, 0.0))
               - shapeFieldAt(shapeUV - vec2(SHAPE_STEP.x, 0.0));
    float south = shapeFieldAt(shapeUV + vec2(0.0, SHAPE_STEP.y))
                - shapeFieldAt(shapeUV - vec2(0.0, SHAPE_STEP.y));

    // UV steps into distance along the sphere, in radii: u spans a full 2*pi*cos(lat) circle, v a
    // half-circle of pi. Without the cosine the slope runs away toward the poles.
    float coslat = max(cos(asin(clamp(p.y, -1.0, 1.0))), 0.05);
    vec2 slope = vec2(
      east / (2.0 * SHAPE_STEP.x * 6.28318531 * coslat),
      south / (2.0 * SHAPE_STEP.y * 3.14159265)
    );
    // u_cloudRelief is a HEIGHT IN KILOMETRES applied to a SMOOTHED heightfield, so it runs larger
    // than a real cloud — see the option's own note. The gradient is per sphere radius, so the
    // conversion is the earth's own.
    slope *= u_cloudRelief / 6371.0;

    // Bounded at 56 degrees. A real cloud top does not stand steeper than about this, so anything
    // past it is the estimate rather than the sky. Magnitude only; the direction is left alone.
    float steepness = length(slope);
    if (steepness > 1.5) slope *= 1.5 / steepness;
    cloudNormal = normalize(frame * normalize(vec3(-slope, 1.0)));
  }

  // Exactly reliefLightFactor, at power 1: the normal is already scaled above, and the strength
  // belongs there rather than here so that u_cloudRelief == 0 leaves the normal AS the sphere's and
  // this whole term collapses to 1.
  float shape = reliefLightFactor(frame[2], cloudNormal, sunDir, 1.0);

  // ── 2. Beer-Powder, NOT Lambert ───────────────────────────────────────────────────────────
  //
  // The counter-intuitive part, and where naive cloud lighting always fails. Cloud is dominated by
  // MULTIPLE scattering: light bounces its way back out, so thick cloud is BRIGHTER than thin —
  // the opposite of a solid, where thickness is irrelevant and only the angle matters. Lambert on
  // the normal above would give grey rock with weather-shaped bumps.
  //
  // Two exponentials. The first is the saturating rise of multiple scattering. The second is the
  // powder term, which takes MORE away from the thin edges than the first alone does, because at
  // low optical depth the in-scattering has not had the depth to build up. Without it a cloud's
  // rim fades out linearly and reads as painted-on fog.
  float depth = 1.0;
  if (u_cloudDepth > 0.0) {
    float tau = u_cloudDepth * coverage;
    depth = (1.0 - exp(-tau)) * mix(1.0, 1.0 - exp(-2.0 * tau), u_powder);
    // Against a fully covered pixel, so the term changes the RELATIONSHIP between thickness and
    // brightness rather than acting as a second density dial — turning the depth up must not simply
    // brighten the whole deck.
    float full = (1.0 - exp(-u_cloudDepth)) * mix(1.0, 1.0 - exp(-2.0 * u_cloudDepth), u_powder);
    depth /= max(full, 1.0e-3);

    /**
     * A FLOOR, and 0.65 rather than something near zero — because the term was double-counting.
     *
     * Thin cloud is more TRANSPARENT, and alpha already says so: coverage drives it directly. Using
     * the same thinness to make the cloud DARKER as well charges twice for one fact, and the second
     * charge is the wrong one. A deck at low brightness still writes alpha, so it subtracts from the
     * ground: wisps came out as a dark veil over the sea instead of white against it, and Map works
     * read the whole deck as grey rather than white.
     *
     * Measured, the thinnest quarter went to -0.07 of the brightness it should have had, and then to
     * -0.40 once the global distribution put more genuinely-thin cloud on screen. Not dim. INVERTED
     * — darker than the surface beneath, which no cloud is.
     *
     * Real thin cloud is grey-white, never black, because it scatters skylight from every direction
     * whether or not the sun reaches it. So the powder term keeps its job — thin edges read darker
     * than thick centres, which is what stops a cloud looking like painted-on fog — over a range
     * that stays above the sea rather than going through it.
     */
    depth = mix(0.65, 1.0, depth);
  }

  // ── 4. Self-shadowing ─────────────────────────────────────────────────────────────────────
  //
  // One extra read of the mask, offset toward the sun: whatever cloud is over there is what stands
  // between this cloud and the light, and that is what gives the underside real depth rather than
  // an evenly lit blanket. Gated on the uniform because it is the only term here that costs
  // another nine texture reads, so it is the first thing a slower machine should drop.
  float shadow = 1.0;
  if (u_selfShadow > 0.0) {
    vec3 toward = normalize(p + sunDir * u_selfShadowStep);
    float over = advectedField(equirectUV(toward, u_drift), asin(clamp(toward.y, -1.0, 1.0)));
    // Fades out as the sun drops: at grazing light the offset walks most of the way round the
    // planet and what it finds has nothing to do with this pixel.
    shadow = 1.0 - u_selfShadow * smoothstep(0.16, 0.62, over) * smoothstep(0.0, 0.35, sunAngle);
  }

  // The deck's own modelling: a lit face and a shaded face, like the real thing — but cloud is
  // WHITE, and its shaded face is white in shadow, not grey paint. The old pair (0.62,0.66,0.72
  // lifted from 0.35) left everything away from the subsolar point reading as blue-grey smoke,
  // which at high latitude is most of what is on screen. Bright, barely-tinted shadow instead.
  vec3 base = mix(vec3(0.86, 0.88, 0.92), vec3(1.0), 0.55 + 0.45 * max(sunAngle, 0.0));

  // Shape and depth multiply the light the top returns; the shadow takes some of it away. All three
  // are 1 at their off settings, so the deck is bit-for-bit its old self with the strengths at zero.
  base *= clamp(shape * depth * shadow, 0.0, 4.0);

  // At the terminator the light reaching them has crossed the most air and lost its blue, so the
  // tops go orange while the ground below is already dark. It is the best thing clouds do.
  float twilight = 1.0 - abs(day * 2.0 - 1.0);
  base = mix(base, base * vec3(1.30, 0.74, 0.44), twilight * twilight * 0.85);

  // ── 3. Forward scattering — the silver lining ─────────────────────────────────────────────
  //
  // Cloud droplets are far larger than the wavelength, so they throw light overwhelmingly FORWARD:
  // a cloud between you and the sun is brighter at its rim than anywhere on its lit face. One
  // Henyey-Greenstein lobe and a single dot product buys it, which is the best payoff per
  // instruction anywhere in this shader.
  //
  // It lands hardest at the terminator, because that is where the sun sits behind the cloud from
  // the camera's point of view — the same geometry that already makes this globe's best picture.
  //
  // ADDED, not multiplied. Forward scattering is light arriving by a path the diffuse term does not
  // model at all, so folding it into a multiplier would make a rim brighter only where the cloud
  // was already bright, which is precisely backwards.
  if (u_forward > 0.0) {
    vec3 toEye = normalize(u_camera - p);
    // Angle between where the photon was going and where it is going now. dot(toEye, -sunDir) is 1
    // when it carries straight on toward the camera, which is the forward peak.
    float phase = -dot(toEye, sunDir);
    float g = clamp(u_forwardG, 0.0, 0.95);
    float gg = g * g;
    float lobe = (1.0 - gg) / pow(max(1.0 + gg - 2.0 * g * phase, 1.0e-4), 1.5);
    // Normalised by its own peak, (1+g)/(1-g)^2, so u_forward is a strength in 0..1 rather than a
    // number whose meaning changes every time the asymmetry is dragged.
    float peak = (1.0 + g) / max((1.0 - g) * (1.0 - g), 1.0e-4);
    // Through the cloud. NOT gated on daylight here: the night floor below already crushes anything
    // on the dark side, and gating twice killed the effect exactly where it belongs. The deck sits
    // 90 km up and stays lit about ten degrees past the ground's terminator, which is the band this
    // term is for — a cloud edge glowing over ground that has already gone dark.
    base += vec3(1.0, 0.98, 0.94) * (u_forward * (lobe / peak) * coverage);
  }

  // Not quite zero at night: a deck at pure black reads as a hole punched in the planet rather
  // than as cloud. This is roughly what starlight and airglow leave on a real night-side deck.
  const float NIGHT_FLOOR = 0.05;
  base *= NIGHT_FLOOR + (1.0 - NIGHT_FLOOR) * day;

  // Below the deck there is no deck. A cloud shell drawn over a street is not weather, it is a
  // fog filter, and no amount of detail rescues it — so it fades out rather than being faked.
  float alpha = coverage * u_opacity * u_deckFade;
  if (alpha < 0.002) discard;
  // MapLibre blends custom layers with gl.ONE / gl.ONE_MINUS_SRC_ALPHA, i.e. PREMULTIPLIED alpha.
  // Returning straight alpha here is what makes a custom layer glow white over dark ground.
  fragColour = vec4(base * alpha, alpha);
}`,Jn=({opacity:e=.5,animate:t=!0,fieldUrl:r=null,patchUrl:n=null,driftRate:l=4e-4,sun:c=[.4,.5,.75],windUrl:o=null,windAmount:i=1,windScale:a=.06,windRate:h=.05,cloudRelief:b=90,cloudDepth:L=4,powder:w=1,forward:U=.5,forwardG:p=.7,selfShadow:f=.18,selfShadowStep:x=.0015}={})=>{const _=ea();let S=null,g=null,s=null;const z=new Map;let N={opacity:e,animate:t,fieldUrl:r,patchUrl:n,driftRate:l,sun:c,windUrl:o,windAmount:i,windScale:a,windRate:h,cloudRelief:b,cloudDepth:L,powder:w,forward:U,forwardG:p,selfShadow:f,selfShadowStep:x},k=null,Y=null,m=null;const Q=C=>{const D=C.variantName;if(z.has(D))return z.get(D);const T=ze(g,Vn(C),Zn(),"tm-clouds"),I={program:T,attribs:{pos:g.getAttribLocation(T,"a_pos"),sphere:g.getAttribLocation(T,"a_sphere")},uniforms:{elevationGlobe:g.getUniformLocation(T,"a_elevation_globe"),elevationMercator:g.getUniformLocation(T,"a_elevation_mercator"),opacity:g.getUniformLocation(T,"u_opacity"),sun:g.getUniformLocation(T,"u_sun"),...Object.fromEntries(Oo.map(y=>[y,g.getUniformLocation(T,`u_${y}`)])),detailFreq:g.getUniformLocation(T,"u_detailFreq"),detailAmount:g.getUniformLocation(T,"u_detailAmount"),deckFade:g.getUniformLocation(T,"u_deckFade"),camera:g.getUniformLocation(T,"u_camera"),cloudRelief:g.getUniformLocation(T,"u_cloudRelief"),cloudDepth:g.getUniformLocation(T,"u_cloudDepth"),powder:g.getUniformLocation(T,"u_powder"),forward:g.getUniformLocation(T,"u_forward"),forwardG:g.getUniformLocation(T,"u_forwardG"),selfShadow:g.getUniformLocation(T,"u_selfShadow"),selfShadowStep:g.getUniformLocation(T,"u_selfShadowStep"),matrix:g.getUniformLocation(T,"u_projection_matrix"),tileMercatorCoords:g.getUniformLocation(T,"u_projection_tile_mercator_coords"),clippingPlane:g.getUniformLocation(T,"u_projection_clipping_plane"),transition:g.getUniformLocation(T,"u_projection_transition"),fallbackMatrix:g.getUniformLocation(T,"u_projection_fallback_matrix")}};return z.set(D,I),I},H=(C,D)=>{C.matrix&&g.uniformMatrix4fv(C.matrix,!1,D.mainMatrix),C.tileMercatorCoords&&g.uniform4f(C.tileMercatorCoords,...D.tileMercatorCoords),C.clippingPlane&&g.uniform4f(C.clippingPlane,...D.clippingPlane),C.transition&&g.uniform1f(C.transition,D.projectionTransition),C.fallbackMatrix&&g.uniformMatrix4fv(C.fallbackMatrix,!1,D.fallbackMatrix)},G=()=>S?.triggerRepaint();return{id:qo,type:"custom",renderingMode:"3d",onAdd(C,D){S=C,g=D;const T=(I,y)=>{const W=g.createBuffer();return g.bindBuffer(I,W),g.bufferData(I,y,g.STATIC_DRAW),W};s={pos:T(g.ARRAY_BUFFER,_.positions),sphere:T(g.ARRAY_BUFFER,_.spheres),index:T(g.ELEMENT_ARRAY_BUFFER,_.indices)},N.fieldUrl&&(k=Ce(g,N.fieldUrl,G)),N.windUrl&&(Y=Ce(g,N.windUrl,G)),N.patchUrl&&(m=Ce(g,N.patchUrl,G,{channels:1}))},onRemove(){g&&(z.forEach(({program:C})=>g.deleteProgram(C)),z.clear(),k?.release(),k=null,Y?.release(),Y=null,m?.release(),m=null,s&&(g.deleteBuffer(s.pos),g.deleteBuffer(s.sphere),g.deleteBuffer(s.index),s=null),S=null,g=null)},render(C,D){if(!s||N.opacity<=0)return;const T=D&&D.shaderData,I=D&&D.defaultProjectionData;if(!T||!I)return;const{program:y,attribs:W,uniforms:B}=Q(T);g.useProgram(y),H(B,I);const Z=S.getCenter().lat;B.elevationGlobe&&g.uniform1f(B.elevationGlobe,Xt),B.elevationMercator&&g.uniform1f(B.elevationMercator,le.MercatorCoordinate.fromLngLat([0,Z],Xt).z),B.opacity&&g.uniform1f(B.opacity,N.opacity),B.sun&&g.uniform3f(B.sun,...N.sun),No(g,B,N,{seconds:performance.now()*.001,field:k,wind:Y,patches:m},0,1,2);const A=Xn(S.getZoom(),S.getCenter().lat,Pa(S,le));B.detailFreq&&g.uniform1f(B.detailFreq,A.frequency),B.detailAmount&&g.uniform1f(B.detailAmount,A.amount),B.deckFade&&g.uniform1f(B.deckFade,A.fade),B.camera&&g.uniform3f(B.camera,...ct(S,le));const K=R=>{B[R]&&g.uniform1f(B[R],N[R])};K("cloudRelief"),K("cloudDepth"),K("powder"),K("forward"),K("forwardG"),K("selfShadow"),K("selfShadowStep"),g.bindBuffer(g.ARRAY_BUFFER,s.pos),g.enableVertexAttribArray(W.pos),g.vertexAttribPointer(W.pos,2,g.FLOAT,!1,0,0),g.bindBuffer(g.ARRAY_BUFFER,s.sphere),g.enableVertexAttribArray(W.sphere),g.vertexAttribPointer(W.sphere,3,g.FLOAT,!1,0,0),g.enable(g.DEPTH_TEST),g.depthFunc(g.LEQUAL),g.depthMask(!1),g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,s.index),g.drawElements(g.TRIANGLES,_.indices.length,g.UNSIGNED_SHORT,0),g.depthMask(!0),N.animate&&S.triggerRepaint()},setOptions(C={}){const D=N;if(N={...N,...C},g){const T=(I,y)=>{if(C[y]===void 0||C[y]===D[y])return I;I?.release();const W=y==="patchUrl"?{channels:1}:void 0;return N[y]?Ce(g,N[y],G,W):null};k=T(k,"fieldUrl"),m=T(m,"patchUrl")}S&&S.triggerRepaint()},getOptions:()=>({...N}),get hasField(){return!!(k?.ready||m?.ready)}}},Aa=qo,Me=Math.PI/180,ei=Date.UTC(2e3,0,1,12),ya=1/3600,Ho=e=>(e.getTime()-ei)/864e5,ti=(e=new Date)=>((18.697374558+24.06570982441908*Ho(e))%24*15%360+360)%360,ai=e=>{const t=Ho(e)/36525;return{zeta:(2306.2181*t+.30188*t*t+.017998*t*t*t)*ya,z:(2306.2181*t+1.09468*t*t+.018203*t*t*t)*ya,theta:(2004.3109*t-.42665*t*t-.041833*t*t*t)*ya}},oi=(e,t,r)=>{const{zeta:n,z:l,theta:c}=ai(r),o=(e-l)*Me,i=t*Me,a=c*Me,h=Math.cos(i)*Math.sin(o),b=Math.cos(a)*Math.cos(i)*Math.cos(o)+Math.sin(a)*Math.sin(i),L=-Math.sin(a)*Math.cos(i)*Math.cos(o)+Math.cos(a)*Math.sin(i);return{ra:Math.atan2(h,b)/Me-n,dec:Math.asin(Math.min(1,Math.max(-1,L)))/Me}},oo=e=>(e%360+360)%360,ri=(e,t=new Date)=>{const r=Math.hypot(e[0],e[1],e[2])||1,n=Math.atan2(e[2]/r,e[0]/r)/Me,l=Math.asin(Math.min(1,Math.max(-1,e[1]/r)))/Me,c=oi(oo(n+ti(t)),l,t);return{ra:oo(c.ra),dec:c.dec}},ni=`
  vec2 panoramaUV(vec3 skyDir) {
    return vec2(atan(skyDir.z, skyDir.x) / 6.28318530718 + 1.0,
                0.5 - asin(clamp(skyDir.y, -1.0, 1.0)) / 3.14159265359);
  }
`,ii=(e=new Date)=>{const t=new Float32Array(9);return[[1,0,0],[0,1,0],[0,0,1]].forEach((n,l)=>{const{ra:c,dec:o}=ri(n,e);t[l*3]=Math.cos(o*Me)*Math.cos(c*Me),t[l*3+1]=Math.sin(o*Me),t[l*3+2]=Math.cos(o*Me)*Math.sin(c*Me)}),t},si=Math.PI/180,Kt=e=>{const t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},li=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],Sa=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],ro=(e,t)=>{const r=li(e,t);return Kt([e[0]-t[0]*r,e[1]-t[1]*r,e[2]-t[2]*r])},ci=(e,t)=>{const n=t>89.98?-1:1,l=Kt(Sa(Fe(e,t+.01*n),Fe(e,t-.01*n))),c=Kt(Sa(Fe(e+.01,t),Fe(e-.01,t)));return{north:n===1?l:[-l[0],-l[1],-l[2]],east:c}},hi=(e,t,r,n)=>{const l=e.getCenter(),c=(e.getBearing?.()??0)*si,o=Fe(l.lng,l.lat,0),i=ct(e,t),a=Kt(Sa(o,i)),{north:h,east:b}=ci(l.lng,l.lat),L=[0,1,2].map(_=>h[_]*Math.cos(c)+b[_]*Math.sin(c)),w=[0,1,2].map(_=>-h[_]*Math.sin(c)+b[_]*Math.cos(c)),U=ro(L,a),p=ro(w,a),f=Math.tan(r/2),x=f*n;return{origin:i,forward:a,up:U.map(_=>_*f),right:p.map(_=>_*x),upUnit:U,rightUnit:p}},La=(e,t)=>e*t*4,zo=[{name:"high",width:4096,height:2048,url:"/img/map/sky/milkyway-4k.webp",bytes:3680220,resident:La(4096,2048),decodeMs:235},{name:"standard",width:2048,height:1024,url:"/img/map/sky/milkyway-2k.webp",bytes:764012,resident:La(2048,1024),decodeMs:51}],Go={name:"placeholder",width:1024,height:512,url:"/img/map/sky/milkyway-1k.webp",bytes:45160,resident:La(1024,512),decodeMs:5},ui=4,di=4,fi=({maxTextureSize:e=0,deviceMemory:t=null,hardwareConcurrency:r=null,saveData:n=!1,effectiveType:l=null}={})=>{const c=zo.filter(a=>a.width<=e);if(c.length===0)return{tier:Go,reason:`MAX_TEXTURE_SIZE is ${e}, below every tier — falling back to the placeholder`};const o=c[c.length-1],i=c[0];return i===o?{tier:i,reason:`only ${i.name} fits MAX_TEXTURE_SIZE ${e}`}:n?{tier:o,reason:"the browser is in data-saver mode"}:l&&/^(slow-2g|2g|3g)$/.test(l)?{tier:o,reason:`the connection reports ${l}`}:Number.isFinite(t)&&t<ui?{tier:o,reason:`the device reports ${t} GB of memory`}:Number.isFinite(r)&&r<di?{tier:o,reason:`the device reports ${r} cores`}:{tier:i,reason:`nothing says otherwise, and MAX_TEXTURE_SIZE is ${e}`}},mi=(e,t=typeof navigator>"u"?null:navigator)=>{const r=t?.connection??null;return{maxTextureSize:e?.getParameter?.(e.MAX_TEXTURE_SIZE)??0,deviceMemory:t?.deviceMemory??null,hardwareConcurrency:t?.hardwareConcurrency??null,saveData:r?.saveData??!1,effectiveType:r?.effectiveType??null}},$o="tm-starfield",pi=Go.url,gi="/data/sky/bright-stars.bin",yi=e=>{const t=Number.isFinite(e)?e:5800,r=Math.min(4e4,Math.max(1e3,t))/100,n=h=>Math.min(1,Math.max(0,h/255)),l=r<=66?255:329.698727446*Math.pow(r-60,-.1332047592),c=r<=66?99.4708025861*Math.log(r)-161.1195681661:288.1221695283*Math.pow(r-60,-.0755148492),o=r>=66?255:r<=19?0:138.5177312231*Math.log(r-10)-305.0447927307,i=[n(l),n(c),n(o)],a=Math.max(...i)||1;return i.map(h=>h/a)},bi=(e,{limitMagnitude:t=6.5}={})=>{const r=new Float32Array(e),n=Math.floor(r.length/4),l=[];for(let o=0;o<n;o++){const i=r[o*4+2];if(i>t)continue;const a=Math.pow(10,-.4*i);l.push([r[o*4],r[o*4+1],Math.pow(a,.36),...yi(r[o*4+3])])}const c=new Float32Array(l.length*6);return l.forEach((o,i)=>c.set(o,i*6)),{vertices:c,count:l.length}},Wo=`
  uniform vec3 u_camera;      // camera in planet space, earth = unit sphere
  uniform vec3 u_forward;
  uniform vec3 u_right;
  uniform vec3 u_up;
  uniform vec2 u_halfExtent;  // tan(fov/2), times aspect for x

  vec3 rayThrough(vec2 ndc) {
    return normalize(u_forward + u_right * (ndc.x * u_halfExtent.x) + u_up * (ndc.y * u_halfExtent.y));
  }

  // Standard ray against the unit sphere. A hit in front of the camera means the planet is in the
  // way — exact at any distance, which the depth buffer is not at this one.
  bool earthBlocks(vec3 ray) {
    float b = dot(u_camera, ray);
    float c = dot(u_camera, u_camera) - 1.0;
    float disc = b * b - c;
    if (disc < 0.0) return false;
    return (-b - sqrt(disc)) > 0.0;
  }
`,wi=e=>`${e.define}
attribute vec2 a_pos;
varying vec2 v_ndc;
void main() {
  v_ndc = a_pos;
  // Straight to clip space. No projection, no elevation, no prelude — that is the whole point.
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,vi=e=>`${e.define}
precision highp float;
varying vec2 v_ndc;
uniform sampler2D u_sky;
uniform mat3 u_skyFrame;     // planet space -> the J2000 grid the panorama is drawn in
uniform float u_globeness;   // 1 on the globe, 0 on the flat map
uniform float u_brightness;
uniform float u_nebula;      // 0 drops the panorama and leaves bare stars
uniform float u_nebulaContrast;
uniform float u_starDensity; // cells per radian: higher is more, smaller stars
uniform float u_starAmount;
uniform float u_time;
uniform float u_twinkle;
${Wo}
${ni}

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}

// One star per cell at most, placed by hash. Sampling the 3x3x3 neighbourhood would let stars sit
// near cell edges without clipping, at 27x the cost; at these densities a single cell is enough.
vec3 stars(vec3 skyDir) {
  vec3 p = skyDir * u_starDensity;
  vec3 cell = floor(p);
  vec3 h = hash3(cell);

  // Most of the sky is empty. This threshold is what keeps stars sparse rather than a dot screen.
  if (h.x > 0.05) return vec3(0.0);

  vec3 offset = hash3(cell + 17.0);
  float dist = length(fract(p) - offset);

  // A STAR HAS TO BE BIGGER THAN A PIXEL OR IT IS NOT THERE.
  //
  // The obvious way to draw a point source is a very steep falloff, and it silently produces an
  // empty sky. At this density a cell is about seven screen pixels, so a profile that has decayed
  // by a tenth of a cell is a third of a pixel wide — narrower than the sample grid. Nothing is
  // clipped and nothing is discarded; the pixel centres simply never land on a star, and the whole
  // layer measures as exactly zero across a hundred thousand pixels while looking, in code,
  // entirely reasonable.
  //
  // So the profile is a gaussian roughly a pixel and a half across, which always registers, and
  // which is also what a real point source looks like once optics have spread it.
  float core = exp(-dist * dist * 60.0);

  // These are the stars no naked-eye catalogue lists, so they sit BELOW the real ones: lopsided
  // toward the faint end, and capped well under the brightness of a catalogue star. The floor is
  // what stops the faint majority being crushed below one 255th and vanishing for the same reason.
  float magnitude = 0.10 + 0.55 * pow(h.y, 4.5);

  // Blue-white through to amber, weighted toward white as real naked-eye stars are.
  vec3 tint = mix(vec3(0.74, 0.83, 1.0), vec3(1.0, 0.84, 0.66), pow(h.z, 1.6));

  // Atmospheric scintillation, per star, at its own rate. Off by default: from orbit there is no
  // air to twinkle through, so it is a stylistic choice rather than a physical one.
  float flicker = 1.0 - u_twinkle * 0.5 * (0.5 + 0.5 * sin(u_time * (1.7 + h.z * 4.0) + h.y * 31.4));

  return tint * core * magnitude * flicker;
}

void main() {
  #ifdef GLOBE
    vec3 ray = rayThrough(v_ndc);
    if (earthBlocks(ray)) discard;

    vec3 skyDir = u_skyFrame * ray;

    // The panorama is stored with a gamma on it, which is what gets the faint structure into eight
    // bits at all. Read back flat it is a grey haze with the dust lanes floating in it, so a little
    // of that gamma is taken out again here — enough that empty sky reads as empty and the band
    // reads as a band, not enough to lose what the gamma was for.
    vec3 sky = pow(texture2D(u_sky, panoramaUV(skyDir)).rgb, vec3(u_nebulaContrast)) * u_nebula;
    sky += stars(skyDir) * u_starAmount;
    // Premultiplied, because MapLibre blends ONE / ONE_MINUS_SRC_ALPHA. The fade is what dissolves
    // the sky as the globe flattens into the mercator map, where there is no space to look into.
    gl_FragColor = vec4(sky * u_brightness * u_globeness, u_globeness);
  #else
    // A flat map has no sky around it. Drawing one would put stars over Kansas.
    discard;
  #endif
}`,_i=e=>`${e.define}
attribute vec3 a_star;       // right ascension and declination in degrees, then brightness
attribute vec3 a_colour;
uniform mat3 u_skyFrame;
uniform float u_pixelRatio;
uniform float u_starSize;
uniform float u_catalogueAmount;
varying vec3 v_colour;
${Wo}

void main() {
  float ra = radians(a_star.x);
  float dec = radians(a_star.y);
  vec3 celestial = vec3(cos(dec) * cos(ra), sin(dec), cos(dec) * sin(ra));

  // v * M is transpose(M) * v, and the transpose of the sky frame is the star frame. One uniform
  // does both directions, which is the only way to be sure they agree.
  vec3 dir = celestial * u_skyFrame;

  float depth = dot(dir, u_forward);
  if (depth <= 0.0 || earthBlocks(dir)) {
    // Behind the camera, or behind the earth. Park it off screen at zero size rather than
    // discarding in the fragment shader, which would still cost the rasterisation.
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }

  vec2 ndc = vec2(dot(dir, u_right) / u_halfExtent.x, dot(dir, u_up) / u_halfExtent.y) / depth;
  gl_Position = vec4(ndc, 0.0, 1.0);

  // Brighter stars are drawn bigger as well as brighter, which is how every star chart ever printed
  // conveys magnitude, and how a telescope-free eye perceives it too.
  gl_PointSize = u_pixelRatio * u_starSize * (0.85 + 1.9 * a_star.z);
  v_colour = a_colour * a_star.z * u_catalogueAmount;
}`,xi=e=>`${e.define}
precision highp float;
varying vec3 v_colour;
void main() {
  // A gaussian across the point sprite. Same reasoning as the procedural field: a hard disc reads
  // as a dot of paint, and anything much tighter than a pixel measures as nothing at all.
  vec2 offset = gl_PointCoord - 0.5;
  float core = exp(-dot(offset, offset) * 22.0);
  // Additive against premultiplied blending: zero alpha adds the colour and takes nothing away, so
  // a star lies on top of the nebula behind it rather than punching a hole in it.
  gl_FragColor = vec4(v_colour * core, 0.0);
}`,Ei=({textureUrl:e=null,placeholderUrl:t=pi,catalogueUrl:r=gi,date:n=new Date,brightness:l=.55,nebula:c=.3,nebulaContrast:o=1.45,starDensity:i=210,starAmount:a=1.5,catalogueAmount:h=2.2,starSize:b=3,limitMagnitude:L=6.5,twinkle:w=0,animate:U=!1}={})=>{let p=null,f=null,x=null,_=null,S=null,g=null,s="not chosen yet",z=0;const N=new Map;let k={textureUrl:e,placeholderUrl:t,catalogueUrl:r,date:n,brightness:l,nebula:c,nebulaContrast:o,starDensity:i,starAmount:a,catalogueAmount:h,starSize:b,limitMagnitude:L,twinkle:w,animate:U};const Y=C=>{const D=C.variantName;if(N.has(D))return N.get(D);const T=ze(f,wi(C),vi(C),"tm-starfield"),I=ze(f,_i(C),xi(C),"tm-starfield-catalogue"),y=(B,Z)=>f.getUniformLocation(B,Z),W={sky:{program:T,pos:f.getAttribLocation(T,"a_pos"),uniforms:{camera:y(T,"u_camera"),forward:y(T,"u_forward"),right:y(T,"u_right"),up:y(T,"u_up"),halfExtent:y(T,"u_halfExtent"),skyFrame:y(T,"u_skyFrame"),sky:y(T,"u_sky"),globeness:y(T,"u_globeness"),brightness:y(T,"u_brightness"),nebula:y(T,"u_nebula"),nebulaContrast:y(T,"u_nebulaContrast"),starDensity:y(T,"u_starDensity"),starAmount:y(T,"u_starAmount"),twinkle:y(T,"u_twinkle"),time:y(T,"u_time")}},stars:{program:I,star:f.getAttribLocation(I,"a_star"),colour:f.getAttribLocation(I,"a_colour"),uniforms:{camera:y(I,"u_camera"),forward:y(I,"u_forward"),right:y(I,"u_right"),up:y(I,"u_up"),halfExtent:y(I,"u_halfExtent"),skyFrame:y(I,"u_skyFrame"),pixelRatio:y(I,"u_pixelRatio"),starSize:y(I,"u_starSize"),catalogueAmount:y(I,"u_catalogueAmount")}}};return N.set(D,W),W},m=()=>{if(!f)return;const C=(D,T)=>D?Ce(f,D,T,{mipmap:!1}):null;if(k.textureUrl===null){const D=fi(mi(f));g=D.tier,s=D.reason}else g=zo.find(D=>D.url===k.textureUrl)??{name:"explicit",url:k.textureUrl},s="the caller named a panorama";S=C(k.placeholderUrl,()=>{p?.triggerRepaint()}),_=C(g.url===k.placeholderUrl?null:g.url,()=>{S?.release(),S=null,p?.triggerRepaint()})},Q=()=>_?.ready?_:S?.ready?S:null,H=()=>{_?.release(),S?.release(),_=null,S=null},G=C=>{!C||typeof fetch!="function"||fetch(C).then(D=>{if(!D.ok)throw new Error(`${D.status} ${D.statusText}`);return D.arrayBuffer()}).then(D=>{if(!f||!x)return;const{vertices:T,count:I}=bi(D,{limitMagnitude:k.limitMagnitude});f.bindBuffer(f.ARRAY_BUFFER,x.stars),f.bufferData(f.ARRAY_BUFFER,T,f.STATIC_DRAW),z=I,p?.triggerRepaint()}).catch(D=>console.warn(`[starfield] bright star catalogue unavailable: ${D.message}`))};return{id:$o,type:"custom",renderingMode:"3d",onAdd(C,D){p=C,f=D;const T=(I,y)=>{const W=f.createBuffer();return f.bindBuffer(I,W),y&&f.bufferData(I,y,f.STATIC_DRAW),W};x={pos:T(f.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1])),index:T(f.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,2,1,3])),stars:T(f.ARRAY_BUFFER,null)},m(),G(k.catalogueUrl)},onRemove(){f&&(N.forEach(({sky:C,stars:D})=>{f.deleteProgram(C.program),f.deleteProgram(D.program)}),N.clear(),H(),x&&(f.deleteBuffer(x.pos),f.deleteBuffer(x.index),f.deleteBuffer(x.stars),x=null),p=null,f=null)},render(C,D){if(!x||k.brightness<=0)return;const T=D&&D.shaderData,I=D&&D.defaultProjectionData;if(!T||!I)return;const y=p.getCanvas(),W=y.width/Math.max(1,y.height),B=hi(p,le,D.fov||.6435,W),Z=Math.tan((D.fov||.6435)/2),A=ii(k.date),K=I.projectionTransition,{sky:R,stars:$}=Y(T),J=({uniforms:F})=>{F.camera&&f.uniform3f(F.camera,...B.origin),F.forward&&f.uniform3f(F.forward,...B.forward),F.right&&f.uniform3f(F.right,...B.rightUnit),F.up&&f.uniform3f(F.up,...B.upUnit),F.halfExtent&&f.uniform2f(F.halfExtent,Z*W,Z),F.skyFrame&&f.uniformMatrix3fv(F.skyFrame,!1,A)};f.useProgram(R.program),J(R),R.uniforms.globeness&&f.uniform1f(R.uniforms.globeness,K),R.uniforms.brightness&&f.uniform1f(R.uniforms.brightness,k.brightness);const X=Q();R.uniforms.nebula&&f.uniform1f(R.uniforms.nebula,X?k.nebula:0),R.uniforms.nebulaContrast&&f.uniform1f(R.uniforms.nebulaContrast,k.nebulaContrast),R.uniforms.starDensity&&f.uniform1f(R.uniforms.starDensity,k.starDensity),R.uniforms.starAmount&&f.uniform1f(R.uniforms.starAmount,k.starAmount),R.uniforms.twinkle&&f.uniform1f(R.uniforms.twinkle,k.twinkle),R.uniforms.time&&f.uniform1f(R.uniforms.time,k.animate?performance.now()*.001:0),X&&R.uniforms.sky&&(f.activeTexture(f.TEXTURE0),f.bindTexture(f.TEXTURE_2D,X.texture),f.uniform1i(R.uniforms.sky,0)),f.bindBuffer(f.ARRAY_BUFFER,x.pos),f.enableVertexAttribArray(R.pos),f.vertexAttribPointer(R.pos,2,f.FLOAT,!1,0,0),f.disable(f.DEPTH_TEST),f.depthMask(!1),f.bindBuffer(f.ELEMENT_ARRAY_BUFFER,x.index),f.drawElements(f.TRIANGLES,6,f.UNSIGNED_SHORT,0),z>0&&K>.5&&k.catalogueAmount>0&&(f.useProgram($.program),J($),$.uniforms.pixelRatio&&f.uniform1f($.uniforms.pixelRatio,typeof devicePixelRatio=="number"?devicePixelRatio:1),$.uniforms.starSize&&f.uniform1f($.uniforms.starSize,k.starSize),$.uniforms.catalogueAmount&&f.uniform1f($.uniforms.catalogueAmount,k.catalogueAmount*k.brightness),f.bindBuffer(f.ARRAY_BUFFER,x.stars),f.enableVertexAttribArray($.star),f.vertexAttribPointer($.star,3,f.FLOAT,!1,24,0),f.enableVertexAttribArray($.colour),f.vertexAttribPointer($.colour,3,f.FLOAT,!1,24,12),f.drawArrays(f.POINTS,0,z),f.disableVertexAttribArray($.star),f.disableVertexAttribArray($.colour)),f.enable(f.DEPTH_TEST),f.depthMask(!0),k.animate&&k.twinkle>0&&p.triggerRepaint()},setOptions(C={}){const D=k.textureUrl,T=k.catalogueUrl;k={...k,...C},C.textureUrl!==void 0&&C.textureUrl!==D&&(H(),m()),C.catalogueUrl!==void 0&&C.catalogueUrl!==T&&(z=0,G(C.catalogueUrl)),p?.triggerRepaint()},getOptions:()=>({...k}),get hasSky(){return Q()!==null},get starCount(){return z},get skyTier(){return g?{...g,reason:s}:null}}},Ti=$o,Ve=Math.PI/180,ki=Date.UTC(2e3,0,1,12),Ai=149597870700,Si=6957e5,jo=e=>(e.getTime()-ki)/864e5,Yo=(e=new Date)=>{const t=jo(e),r=(280.46+.9856474*t)%360,n=(357.528+.9856003*t)%360*Ve,l=(r+1.915*Math.sin(n)+.02*Math.sin(2*n))*Ve,c=(23.439-4e-7*t)*Ve,o=Math.asin(Math.sin(c)*Math.sin(l))/Ve;let i=Math.atan2(Math.cos(c)*Math.sin(l),Math.cos(l))/Ve;i<0&&(i+=360);let a=r-i;a>180&&(a-=360),a<-180&&(a+=360),a*=4;const h=(1.00014-.01671*Math.cos(n)-14e-5*Math.cos(2*n))*Ai;return{declination:o,equationOfTime:a,distance:h}},Xo=(e=new Date)=>Yo(e).distance,Li=(e=new Date)=>Math.atan(Si/Xo(e)),Mi=(e=new Date)=>{const t=(357.528+.9856003*jo(e))%360*Ve;return(1.00014-.01671*Math.cos(t)-14e-5*Math.cos(2*t))*149597870700},Ri=(e=new Date)=>{const{declination:t,equationOfTime:r}=Yo(e);let l=-15*(e.getUTCHours()+e.getUTCMinutes()/60+e.getUTCSeconds()/3600-12+r/60);return l=(l+540)%360-180,{lng:l,lat:t}},Dt=(e=new Date)=>{const{lng:t,lat:r}=Ri(e),n=r*Ve,l=t*Ve;return[Math.cos(n)*Math.cos(l),Math.sin(n),Math.cos(n)*Math.sin(l)]},Ko="tm-sun",no=63710088e-1,Pi=18,Ci=(e,t,r)=>{const n=Math.abs(e),l=t,c=r;if(l<=0)return 0;if(n>=l+c)return 1;if(n<=c-l)return 0;if(n<=l-c)return 1-c*c/(l*l);const o=l*l*Math.acos(_t((n*n+l*l-c*c)/(2*n*l),-1,1))+c*c*Math.acos(_t((n*n+c*c-l*l)/(2*n*c),-1,1))-.5*Math.sqrt(Math.max(0,(-n+l+c)*(n+l-c)*(n-l+c)*(n+l+c)));return _t(1-o/(Math.PI*l*l),0,1)},io={u1:.93,u2:-.23},so=e=>e<0?`(${e.toFixed(4)})`:e.toFixed(4),Di=`
  float limbDarkening(float rho) {
    float mu = sqrt(max(1.0 - rho * rho, 0.0));
    float t = 1.0 - mu;
    return max(1.0 - ${so(io.u1)} * t - ${so(io.u2)} * t * t, 0.0);
  }
`,Ii=new Float32Array([-1,-1,1,-1,-1,1,1,1]),lo=new Uint16Array([0,1,2,1,3,2]),Ui=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_corner;
uniform vec2 a_centre;              // where the sun lies, in mercator 0..1
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
uniform vec2 u_size;                // half-size of the glow quad in clip units, x and y
varying vec2 v_corner;
void main() {
  v_corner = a_corner;
  #ifdef GLOBE
    vec4 centre = projectTileFor3D(a_centre, a_elevation_globe);
  #else
    vec4 centre = projectTileFor3D(a_centre, a_elevation_mercator);
  #endif
  // Scaling by w cancels the perspective divide, so the glow keeps its angular size.
  gl_Position = centre + vec4(a_corner * u_size * centre.w, 0.0, 0.0);
}`,Fi=()=>`precision highp float;
varying vec2 v_corner;
uniform vec3 u_camera;              // planet space, earth as a unit sphere at the origin
uniform vec3 u_forward;             // from the camera toward the sun
uniform vec3 u_right;               // the billboard's basis, same space
uniform vec3 u_up;
uniform float u_glow_angle;         // angular radius of the whole quad, radians
uniform float u_disc_fraction;      // where the sun's limb falls, as a fraction of the quad
uniform float u_disc_gain;          // exposure: how far above clipping the disc's centre sits
uniform float u_visible;            // how much of the disc the planet leaves showing, 0..1
uniform float u_brightness;
uniform float u_halo_strength;
uniform vec3 u_core_colour;
uniform vec3 u_halo_colour;
${Do}
${Di}

void main() {
  float r = length(v_corner);
  if (r > 1.0) discard;                          // the quad's corners are not the glow

  // ── The disc ───────────────────────────────────────────────────────────────────────────────
  // Anti-aliased over a twelfth of its own radius. At eleven pixels across a hard cut is a
  // visible staircase, and one wide enough to hide it turns the sun into a smudge.
  float disc = 1.0 - smoothstep(u_disc_fraction * 0.94, u_disc_fraction * 1.06, r);

  // LIMB DARKENING. The sun is not a flat white circle: its edge is about 30% as bright as its
  // centre in visible light, because looking at the limb you see only the thin, cool top of the
  // photosphere while at the centre you see down into the hotter gas below. It is the reason a
  // filtered photograph of the sun has a soft grey rim, and at twenty pixels across it reads.
  //
  //   I(mu)/I(0) = 1 - u1*(1-mu) - u2*(1-mu)^2,  mu = cos(angle between sight line and normal)
  //
  // with the standard visible-light coefficients. On a disc of normalised radius rho, mu is just
  // sqrt(1 - rho^2), because the sphere is doing the geometry for us.
  //
  // The GAIN is what makes it look right rather than dirty. Radiance is computed first and clipped
  // afterwards, exactly as an over-exposed photograph does it, so the disc saturates to white
  // across most of its face and only the outer quarter of the radius visibly falls away. Turn the
  // gain up and the darkening disappears into the clip; turn it down and the sun goes grey. The
  // physics is in the law, not in the gain.
  float rho = clamp(r / max(u_disc_fraction, 1e-6), 0.0, 1.0);
  float limb = limbDarkening(rho);
  disc *= limb * u_disc_gain;

  // Bitten off by the planet, per pixel. The view ray for this fragment, then the oldest test
  // there is: does it meet the earth before it gets anywhere.
  if (disc > 0.0) {
    vec3 ray = normalize(u_forward + (u_right * v_corner.x + u_up * v_corner.y) * u_glow_angle);
    vec2 ground = sphereSpan(u_camera, ray, 1.0);
    if (ground.x <= ground.y && ground.y > 0.0) disc = 0.0;
  }

  // ── The glow ───────────────────────────────────────────────────────────────────────────────
  // In solar radii, so the shape is anchored to the limb rather than to the quad: rs = 1 is the
  // edge of the disc. Three terms, because glare has three scales and one gaussian has one.
  float rs = r / max(u_disc_fraction, 1e-6);
  float beyond = max(rs - 1.0, 0.0);
  // The weights and rates matter more than the choice of terms. Flatten the middle one and the sun
  // stops being a star and becomes a cotton-wool ball with a dot in it: half the core's brightness
  // was still there a solar radius out, which is a fat bright ring, not glare.
  float glow = 0.58 * exp(-beyond * 3.4)             // the flare clinging to the limb
             + 0.28 * exp(-beyond * 1.35)            // the aureole
             + 0.08 / (1.0 + 0.22 * rs * rs);        // the wide skirt, which is what sells the scale
  // The quad has to end somewhere, and against near-black space the eye finds that edge instantly:
  // a taper over the last fifth of the radius leaves a faint but perfectly visible disc outline
  // around the sun. Fading from a THIRD of the way out hides the boundary inside the falloff, at
  // the cost of thinning a part of the skirt that is already under a hundredth of the core.
  glow *= smoothstep(1.0, 0.32, r);
  // The halo is glare, so it spills over the planet's edge rather than stopping at it — but it
  // dims with however much of the sun is actually still showing.
  glow *= u_visible;

  float intensity = clamp(disc + glow * u_halo_strength, 0.0, 1.0) * u_brightness;
  if (intensity < 0.003) discard;

  // White at the core, amber everywhere else.
  //
  // The disc is far too bright for any eye or sensor to read as anything but white, and only the
  // wings keep a colour — so the question is how fast the white gives way, and the honest answer is
  // "almost at once". Blending on the glow's own value drags white out through the bright part of
  // the aureole and leaves the halo nearly neutral; a smoothstep with its foot near the limb's
  // brightness confines white to about a solar radius and hands the whole skirt to the amber.
  float toCore = clamp(disc + smoothstep(0.35, 0.95, glow), 0.0, 1.0);
  vec3 colour = mix(u_halo_colour, u_core_colour, toCore);

  // LIMB REDDENING, which is the same fact as the darkening seen in colour: the shallow gas at the
  // limb is cooler, so it is not merely dimmer but redder. Driven by the darkening term rather than
  // given a control of its own, because the two cannot disagree: one temperature gradient makes both.
  // (No backticks in here. This is a template literal, and one would end the shader.)
  colour = mix(colour, colour * vec3(1.0, 0.88, 0.7), (1.0 - limb) * step(rho, 1.0));

  // MapLibre blends custom layers ONE / ONE_MINUS_SRC_ALPHA, so colour goes out premultiplied.
  gl_FragColor = vec4(colour * intensity, intensity);
}`,Oi=({date:e=new Date,haloScale:t=Pi,haloStrength:r=1,discGain:n=1.15,brightness:l=1,coreColour:c=[1,.985,.95],haloColour:o=[1,.65,.2]}={})=>{let i=null,a=null,h=null,b={u:.5,v:.5,onScreen:!1,visible:0};const L=new Map;let w={date:e,haloScale:t,haloStrength:r,discGain:n,brightness:l,coreColour:c,haloColour:o};const U=p=>{const f=p.variantName;if(L.has(f))return L.get(f);const x=ze(a,Ui(p),Fi(),"tm-sun",{es300:!0}),_={program:x,attribs:{corner:a.getAttribLocation(x,"a_corner")},uniforms:{centre:a.getUniformLocation(x,"a_centre"),elevationGlobe:a.getUniformLocation(x,"a_elevation_globe"),elevationMercator:a.getUniformLocation(x,"a_elevation_mercator"),size:a.getUniformLocation(x,"u_size"),camera:a.getUniformLocation(x,"u_camera"),forward:a.getUniformLocation(x,"u_forward"),right:a.getUniformLocation(x,"u_right"),up:a.getUniformLocation(x,"u_up"),glowAngle:a.getUniformLocation(x,"u_glow_angle"),discFraction:a.getUniformLocation(x,"u_disc_fraction"),discGain:a.getUniformLocation(x,"u_disc_gain"),visible:a.getUniformLocation(x,"u_visible"),brightness:a.getUniformLocation(x,"u_brightness"),haloStrength:a.getUniformLocation(x,"u_halo_strength"),coreColour:a.getUniformLocation(x,"u_core_colour"),haloColour:a.getUniformLocation(x,"u_halo_colour"),matrix:a.getUniformLocation(x,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(x,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(x,"u_projection_clipping_plane"),transition:a.getUniformLocation(x,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(x,"u_projection_fallback_matrix")}};return L.set(f,_),_};return{id:Ko,type:"custom",renderingMode:"3d",onAdd(p,f){i=p,a=f;const x=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,x),a.bufferData(a.ARRAY_BUFFER,Ii,a.STATIC_DRAW);const _=a.createBuffer();a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,_),a.bufferData(a.ELEMENT_ARRAY_BUFFER,lo,a.STATIC_DRAW),h={corner:x,index:_}},onRemove(){a&&(L.forEach(({program:p})=>a.deleteProgram(p)),L.clear(),h&&(a.deleteBuffer(h.corner),a.deleteBuffer(h.index),h=null),i=null,a=null)},render(p,f){if(!h||w.brightness<=0)return;const x=f&&f.shaderData,_=f&&f.defaultProjectionData;if(!x||!_)return;const{program:S,attribs:g,uniforms:s}=U(x);a.useProgram(S),s.matrix&&a.uniformMatrix4fv(s.matrix,!1,_.mainMatrix),s.tileMercatorCoords&&a.uniform4f(s.tileMercatorCoords,..._.tileMercatorCoords),s.clippingPlane&&a.uniform4f(s.clippingPlane,..._.clippingPlane),s.transition&&a.uniform1f(s.transition,_.projectionTransition),s.fallbackMatrix&&a.uniformMatrix4fv(s.fallbackMatrix,!1,_.fallbackMatrix);const z=ct(i,le),N=Xo(w.date),k=Fe(...Qi(Dt(w.date)),N-no),Y=co([k[0]-z[0],k[1]-z[1],k[2]-z[2]]),m=Math.hypot(...z),Q=Math.max(.25*(m-1),.002),H=[z[0]+Y[0]*Q,z[1]+Y[1]*Q,z[2]+Y[2]*Q],G=Math.hypot(...H),C=Math.asin(H[1]/G)*180/Math.PI,D=Math.atan2(H[2],H[0])*180/Math.PI,T=(G-1)*no,I=le.MercatorCoordinate.fromLngLat([D,C],0);s.centre&&a.uniform2f(s.centre,I.x,I.y),s.elevationGlobe&&a.uniform1f(s.elevationGlobe,T),s.elevationMercator&&a.uniform1f(s.elevationMercator,le.MercatorCoordinate.fromLngLat([D,C],T).z);const y=Li(w.date),W=y*w.haloScale,B=(f.fov||.6435)/2,Z=i.getCanvas(),A=Math.tan(W)/Math.tan(B);s.size&&a.uniform2f(s.size,A*(Z.height/Z.width),A),s.glowAngle&&a.uniform1f(s.glowAngle,W),s.discFraction&&a.uniform1f(s.discFraction,1/w.haloScale),s.discGain&&a.uniform1f(s.discGain,w.discGain);const K=[-z[0]/m,-z[1]/m,-z[2]/m],R=Math.acos(_t(Bi(K,Y),-1,1)),$=Math.asin(_t(1/m,-1,1)),J=Ci(R,y,$),X=Y,F=co(ho([0,1,0],X)),ue=ho(X,F);s.forward&&a.uniform3f(s.forward,...X),s.right&&a.uniform3f(s.right,...F),s.up&&a.uniform3f(s.up,...ue),s.camera&&a.uniform3f(s.camera,...z),s.visible&&a.uniform1f(s.visible,J),s.brightness&&a.uniform1f(s.brightness,w.brightness),s.haloStrength&&a.uniform1f(s.haloStrength,w.haloStrength),s.coreColour&&a.uniform3f(s.coreColour,...w.coreColour),s.haloColour&&a.uniform3f(s.haloColour,...w.haloColour),a.bindBuffer(a.ARRAY_BUFFER,h.corner),a.enableVertexAttribArray(g.corner),a.vertexAttribPointer(g.corner,2,a.FLOAT,!1,0,0),a.disable(a.DEPTH_TEST),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,h.index),a.drawElements(a.TRIANGLES,lo.length,a.UNSIGNED_SHORT,0),a.depthMask(!0),b=Ni(_.mainMatrix,I,G,J)},setOptions(p={}){w={...w,...p},i?.triggerRepaint()},getOptions:()=>({...w}),get screenPosition(){return b}}},Ni=(e,t,r,n)=>{const l=t.x*2*Math.PI+Math.PI,c=2*Math.atan(Math.exp(Math.PI-t.y*2*Math.PI))-Math.PI/2,o=Math.cos(c),i=[Math.sin(l)*o*r,Math.sin(c)*r,Math.cos(l)*o*r,1],a=[0,1,2,3].map(L=>e[L]*i[0]+e[4+L]*i[1]+e[8+L]*i[2]+e[12+L]*i[3]);if(!(a[3]>0))return{u:.5,v:.5,onScreen:!1,visible:0};const h=a[0]/a[3]*.5+.5,b=a[1]/a[3]*.5+.5;return{u:h,v:b,onScreen:h>-.5&&h<1.5&&b>-.5&&b<1.5,visible:n}},_t=(e,t,r)=>Math.min(r,Math.max(t,e)),Bi=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],co=e=>{const t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},ho=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Qi=([e,t,r])=>[Math.atan2(r,e)*180/Math.PI,Math.asin(_t(t,-1,1))*180/Math.PI],qi=Ko,Vo="tm-moon",Vt=63710088e-1,Hi=1737400,lt=Math.PI/180,zi=Date.UTC(2e3,0,1,12),Gi=Date.UTC(1999,11,31,0),se=e=>Math.sin(e*lt),fe=e=>Math.cos(e*lt),Zo=(e=new Date)=>{const t=(e.getTime()-zi)/864e5,r=(e.getTime()-Gi)/864e5,n=125.1228-.0529538083*r,l=5.1454,c=318.0634+.1643573223*r,o=60.2666,i=.0549,a=115.3654+13.0649929509*r;let h=a+i*180/Math.PI*se(a)*(1+i*fe(a));for(let y=0;y<3;y++)h-=(h-i*180/Math.PI*se(h)-a)/(1-i*fe(h));const b=o*(fe(h)-i),L=o*(Math.sqrt(1-i*i)*se(h)),w=Math.atan2(L,b)/lt,U=Math.sqrt(b*b+L*L);let p=U*(fe(n)*fe(w+c)-se(n)*se(w+c)*fe(l)),f=U*(se(n)*fe(w+c)+fe(n)*se(w+c)*fe(l)),x=U*(se(w+c)*se(l));const _=356.047+.9856002585*r,S=282.9404+470935e-10*r+_,g=n+c+a,s=g-S,z=g-n;let N=Math.atan2(f,p)/lt,k=Math.atan2(x,Math.hypot(p,f))/lt;N+=-1.274*se(a-2*s)+.658*se(2*s)-.186*se(_),k+=-.173*se(z-2*s);const Y=(U-.58*fe(a-2*s)-.46*fe(2*s))*Vt,m=23.4393-3563e-10*t,Q=fe(N)*fe(k),H=se(N)*fe(k)*fe(m)-se(k)*se(m),G=se(N)*fe(k)*se(m)+se(k)*fe(m),C=Math.atan2(H,Q)/lt,D=Math.atan2(G,Math.hypot(Q,H))/lt,T=(18.697374558+24.06570982441908*t)%24;let I=C-T*15;return I=(I%360+540)%360-180,{lng:I,lat:D,distance:Y}},Jo=(e=new Date)=>{const{lng:t,lat:r,distance:n}=Zo(e);return Fe(t,r,n-Vt)},$i=new Float32Array([-1,-1,1,-1,-1,1,1,1]),uo=new Uint16Array([0,1,2,1,3,2]),Wi=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_corner;
uniform vec2 a_centre;          // sub-lunar point in mercator 0..1
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
uniform vec2 u_size;            // half-size in clip units, x and y
varying vec2 v_corner;
void main() {
  v_corner = a_corner;
  #ifdef GLOBE
    vec4 centre = projectTileFor3D(a_centre, a_elevation_globe);
  #else
    vec4 centre = projectTileFor3D(a_centre, a_elevation_mercator);
  #endif
  // Scale by w so the disc keeps its angular size through the perspective divide.
  gl_Position = centre + vec4(a_corner * u_size * centre.w, 0.0, 0.0);
}`,ji=()=>`precision highp float;
varying vec2 v_corner;
uniform sampler2D u_albedo;
uniform vec3 u_sun;             // direction TO the sun, planet space
uniform vec3 u_right;           // the billboard's basis, in planet space
uniform vec3 u_up;
uniform vec3 u_forward;         // from the camera toward the moon
uniform float u_brightness;
uniform float u_hasAlbedo;
uniform float u_discEdge;       // where the moon's limb falls inside the quad, 0..1
uniform float u_glow;           // halo strength; 0 leaves the disc exactly as it was
uniform float u_glowExtent;     // how far the halo reaches, in disc radii
${aa}

void main() {
  // THE QUAD IS BIGGER THAN THE MOON when there is a halo to draw, so v_corner is normalised
  // against the limb rather than against the quad. u_discEdge is 1.0 with the glow off, which
  // makes this identical to what it was.
  vec2 corner = v_corner / u_discEdge;
  float r2 = dot(corner, corner);

  if (r2 > 1.0) {
    // ── The halo ──────────────────────────────────────────────────────────────────────────
    //
    // The moon is half a degree wide and there is no honest way to make it bigger, so this makes
    // the pixels it does have carry further. It is not a lie about the moon's SIZE: the disc below
    // keeps its true angular radius and the glow is what a bright object does to an eye, a lens
    // and a camera sensor alike.
    //
    // Additive, via premultiplied alpha — vec4(colour, 0.0) adds without covering, so the halo
    // brightens the starfield behind it instead of stamping a grey ring over it.
    float t = clamp((sqrt(r2) - 1.0) / max(u_glowExtent, 1e-4), 0.0, 1.0);
    float falloff = pow(1.0 - t, 3.0);
    gl_FragColor = vec4(vec3(0.62, 0.62, 0.60) * u_glow * falloff * u_brightness, 0.0);
    return;
  }

  // Rebuild the sphere the quad stands in for: z out of the disc toward the viewer.
  float z = sqrt(1.0 - r2);
  vec3 normal = normalize(u_right * corner.x + u_up * corner.y - u_forward * z);

  // Phase. Not drawn — a consequence of lighting a sphere from where the sun actually is.
  float lambert = max(dot(normal, u_sun), 0.0);
  // A little wrap: the lunar terminator is softened by the roughness of the surface, and a hard
  // cosine cut makes a crescent look like a paper cutout.
  float light = pow(lambert, 0.72);

  // The moon keeps one face toward earth, so a fixed lookup is the correct one.
  vec3 albedo = u_hasAlbedo > 0.0
    ? texture2D(u_albedo, equirectUV(normal, 0.0)).rgb
    : vec3(0.62, 0.60, 0.57);

  // Earthshine: the dark limb is not black, it is lit by a nearly-full earth overhead.
  vec3 colour = albedo * (light + 0.045);
  float edge = smoothstep(1.0, 0.985, r2);     // one pixel of anti-aliasing on the limb
  float alpha = edge;
  gl_FragColor = vec4(colour * u_brightness * alpha, alpha);
}`,Yi=({date:e=new Date,sun:t=[1,0,0],albedoUrl:r=null,sizeScale:n=1,brightness:l=1,glow:c=.4,glowExtent:o=1.8}={})=>{let i=null,a=null,h=null,b=null,L=!1;const w=new Map;let U={date:e,sun:t,albedoUrl:r,sizeScale:n,brightness:l,glow:c,glowExtent:o};const p=x=>{const _=x.variantName;if(w.has(_))return w.get(_);const S=ze(a,Wi(x),ji(),"tm-moon",{es300:!0}),g={program:S,attribs:{corner:a.getAttribLocation(S,"a_corner")},uniforms:{centre:a.getUniformLocation(S,"a_centre"),elevationGlobe:a.getUniformLocation(S,"a_elevation_globe"),elevationMercator:a.getUniformLocation(S,"a_elevation_mercator"),size:a.getUniformLocation(S,"u_size"),albedo:a.getUniformLocation(S,"u_albedo"),hasAlbedo:a.getUniformLocation(S,"u_hasAlbedo"),sun:a.getUniformLocation(S,"u_sun"),right:a.getUniformLocation(S,"u_right"),up:a.getUniformLocation(S,"u_up"),forward:a.getUniformLocation(S,"u_forward"),brightness:a.getUniformLocation(S,"u_brightness"),discEdge:a.getUniformLocation(S,"u_discEdge"),glow:a.getUniformLocation(S,"u_glow"),glowExtent:a.getUniformLocation(S,"u_glowExtent"),matrix:a.getUniformLocation(S,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(S,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(S,"u_projection_clipping_plane"),transition:a.getUniformLocation(S,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(S,"u_projection_fallback_matrix")}};return w.set(_,g),g},f=x=>{const _=new Image;_.crossOrigin="anonymous",_.onload=()=>{a&&(b=b||a.createTexture(),a.bindTexture(a.TEXTURE_2D,b),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,_),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.REPEAT),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),L=!0,i?.triggerRepaint())},_.src=x};return{id:Vo,type:"custom",renderingMode:"3d",onAdd(x,_){i=x,a=_;const S=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,S),a.bufferData(a.ARRAY_BUFFER,$i,a.STATIC_DRAW);const g=a.createBuffer();a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,g),a.bufferData(a.ELEMENT_ARRAY_BUFFER,uo,a.STATIC_DRAW),h={corner:S,index:g},U.albedoUrl&&f(U.albedoUrl)},onRemove(){a&&(w.forEach(({program:x})=>a.deleteProgram(x)),w.clear(),b&&(a.deleteTexture(b),b=null,L=!1),h&&(a.deleteBuffer(h.corner),a.deleteBuffer(h.index),h=null),i=null,a=null)},render(x,_){if(!h||U.brightness<=0)return;const S=_&&_.shaderData,g=_&&_.defaultProjectionData;if(!S||!g)return;const{lng:s,lat:z,distance:N}=Zo(U.date),{program:k,attribs:Y,uniforms:m}=p(S);a.useProgram(k),m.matrix&&a.uniformMatrix4fv(m.matrix,!1,g.mainMatrix),m.tileMercatorCoords&&a.uniform4f(m.tileMercatorCoords,...g.tileMercatorCoords),m.clippingPlane&&a.uniform4f(m.clippingPlane,...g.clippingPlane),m.transition&&a.uniform1f(m.transition,g.projectionTransition),m.fallbackMatrix&&a.uniformMatrix4fv(m.fallbackMatrix,!1,g.fallbackMatrix);const Q=ct(i,le),H=Fe(s,z,N-Vt),G=fo([H[0]-Q[0],H[1]-Q[1],H[2]-Q[2]]),D=Math.hypot(...Q)+1.2,T=[Q[0]+G[0]*D,Q[1]+G[1]*D,Q[2]+G[2]*D],I=Math.hypot(...T),y=Math.asin(T[1]/I)*180/Math.PI,W=Math.atan2(T[2],T[0])*180/Math.PI,B=(I-1)*Vt,Z=le.MercatorCoordinate.fromLngLat([W,y],0);m.centre&&a.uniform2f(m.centre,Z.x,Z.y),m.elevationGlobe&&a.uniform1f(m.elevationGlobe,B),m.elevationMercator&&a.uniform1f(m.elevationMercator,le.MercatorCoordinate.fromLngLat([W,y],B).z);const A=Math.atan(Hi*U.sizeScale/N),K=(_.fov||.6435)/2,R=i.getCanvas(),$=Math.tan(A)/Math.tan(K),X=1+(U.glow>0?Math.max(0,U.glowExtent):0),F=$*X;m.size&&a.uniform2f(m.size,F*(R.height/R.width),F),m.discEdge&&a.uniform1f(m.discEdge,1/X);const ue=G,ce=fo(mo([0,1,0],ue)),ve=mo(ue,ce);m.forward&&a.uniform3f(m.forward,...ue),m.right&&a.uniform3f(m.right,...ce),m.up&&a.uniform3f(m.up,...ve),m.sun&&a.uniform3f(m.sun,...U.sun),m.brightness&&a.uniform1f(m.brightness,U.brightness),m.glow&&a.uniform1f(m.glow,U.glow),m.glowExtent&&a.uniform1f(m.glowExtent,U.glowExtent),m.hasAlbedo&&a.uniform1f(m.hasAlbedo,L?1:0),L&&m.albedo&&(a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,b),a.uniform1i(m.albedo,0)),a.bindBuffer(a.ARRAY_BUFFER,h.corner),a.enableVertexAttribArray(Y.corner),a.vertexAttribPointer(Y.corner,2,a.FLOAT,!1,0,0),a.enable(a.DEPTH_TEST),a.depthFunc(a.LEQUAL),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,h.index),a.drawElements(a.TRIANGLES,uo.length,a.UNSIGNED_SHORT,0),a.depthMask(!0)},setOptions(x={}){const _=U.albedoUrl;U={...U,...x},x.albedoUrl!==void 0&&x.albedoUrl!==_&&(L=!1,x.albedoUrl&&f(x.albedoUrl)),i?.triggerRepaint()},getOptions:()=>({...U}),get hasAlbedo(){return L}}},fo=e=>{const t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},mo=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Xi=Vo,Ki=6957e5,Vi=1737400,Zi=63710088e-1,Ji=Vi/Zi,es=(e,t,r)=>Math.min(r,Math.max(t,e)),ts=(e=new Date)=>Math.asin(Ki/Mi(e)),as=.035,os=(e=new Date,t=null,r=null)=>{const n=t||Dt(e),l=r||Jo(e),c=Math.hypot(...l);return Math.acos(es((n[0]*l[0]+n[1]*l[1]+n[2]*l[2])/c,-1,1))<as},rs=`
  float solarVisibleFraction(float sun, float moon, float separation) {
    if (separation >= sun + moon) return 1.0;
    if (separation <= moon - sun) return 0.0;
    float ratioSquared = (moon * moon) / (sun * sun);
    if (separation <= sun - moon) return 1.0 - ratioSquared;

    float x = (separation * separation + sun * sun - moon * moon) / (2.0 * separation);
    float ths = acos(clamp(x / sun, -1.0, 1.0));
    float thm = acos(clamp((separation - x) / moon, -1.0, 1.0));
    return (3.14159265359 - ths + 0.5 * sin(2.0 * ths)
            - thm * ratioSquared + 0.5 * ratioSquared * sin(2.0 * thm)) / 3.14159265359;
  }

  // moonPos is the moon's POSITION in earth radii, not a direction — the difference is the whole
  // reason totality is a narrow track rather than a hemisphere.
  float eclipseLight(vec3 up, vec3 sunDir, vec3 moonPos, float sunRadius, float moonRadiusEarths) {
    if (sunRadius <= 0.0) return 1.0;
    vec3 toMoon = moonPos - up;
    float distance = length(toMoon);
    float moonRadius = asin(clamp(moonRadiusEarths / distance, 0.0, 1.0));
    float separation = acos(clamp(dot(sunDir, toMoon / distance), -1.0, 1.0));
    return solarVisibleFraction(sunRadius, moonRadius, separation);
  }
`,er="tm-daylight",Rt={field:0,wind:1,relief:2,lights:3,patches:4},ns=e=>`#version 300 es
${e.define}
${e.vertexShaderPrelude}
in vec2 a_pos;
in vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
out vec3 v_sphere;
${ta}
void main() {
  v_sphere = a_sphere;
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,is=()=>`#version 300 es
precision highp float;
in vec3 v_sphere;
out vec4 fragColour;
uniform vec3 u_sun;            // direction TO the sun
uniform vec3 u_camera;         // camera in planet space, earth = unit sphere
uniform float u_globeness;     // 1 on the globe, 0 on the flat map
uniform float u_nightDarkness; // how black the unlit side goes
uniform vec3 u_nightColour;
uniform vec3 u_twilightColour;  // the warm edge, sunward of the line
uniform vec3 u_twilightCool;    // the blue hour, nightward of it
uniform float u_twilightStrength;
uniform sampler2D u_lights;    // NASA Black Marble, equirectangular
uniform float u_lightsAmount;  // 0 when the texture has not loaded
uniform sampler2D u_relief;    // baked terrain normals, equirectangular; see terrain-normals.js
uniform float u_reliefPower;   // 0 when there is no relief map, or the camera is too close for it
uniform float u_cloudShadow;   // how much of the light a full cloud takes away
uniform float u_shadowSoftness; // how wide the cloud-cover band that fades a shadow in is
uniform float u_cloudAltitude; // deck height in earth radii — sets how far a shadow is thrown
uniform vec3 u_moon;           // the moon's POSITION in earth radii, not its direction
uniform float u_sunRadius;     // the sun's angular radius; 0 on any date without an eclipse
${aa}
${Io}
${Ra}
${Bo}
${Qo}
${Gn}
${rs}
// The same field, wind and clock the deck in clouds.js draws itself from.
${Fo}

void main() {
  vec3 normal = normalize(v_sphere);

  // The mesh is a closed sphere, so the far side covers the same pixels as the near side. On the
  // globe, drop it here rather than leaning on the depth buffer — see FACING_CAMERA_GLSL. On the
  // flat map there is no far side to drop.
  if (u_globeness > 0.5 && !facesCamera(normal, u_camera)) discard;

  vec3 sunDir = normalize(u_sun);

  // TWO DIFFERENT QUANTITIES, and conflating them is a bug that renders beautifully.
  //   sunlight  is where the sun is — pure geometry, shared with the deck so the two agree.
  //   day       is how much light actually lands here, after terrain and cloud have had their say.
  // Colour and the city-lights gate belong to the FIRST. Getting that wrong paints every cloud
  // shadow sunset-orange in the middle of the afternoon, because a shadow drops the light to about
  // half and half is exactly where the twilight band peaks. It looks like weather until you notice
  // the sun is overhead.
  float sunlight = daylightFraction(dot(normal, sunDir));
  float day = sunlight;

  // ── Relief ────────────────────────────────────────────────────────────────────────────────
  // Lee writes this as one multiply, day *= 1 + power*delta. That is the same thing as adding
  // day*power*delta, and splitting it that way is what lets the negative half become night and the
  // positive half become light. Both are scaled by the daylight already there, so nothing happens
  // on the night side, where there is no sun to rake.
  float lit = 0.0;
  if (u_reliefPower > 0.0) {
    vec3 tangentNormal = decodeTerrainNormal(texture(u_relief, equirectUV(normal, 0.0)).xyz);
    vec3 perturbed = normalize(equirectTangentFrame(normal) * tangentNormal);
    float change = day * (reliefLightFactor(normal, perturbed, sunDir, u_reliefPower) - 1.0);
    day = day + min(0.0, change);
    lit = max(0.0, change);
  }

  // ── Cloud shadow ──────────────────────────────────────────────────────────────────────────
  // Walk from this patch of ground toward the sun until the deck, and see what is up there. The
  // offset is what makes a shadow fall AWAY from the light rather than sitting under the cloud
  // like a decal — and it is why an afternoon deck lays its shadows out to the east.
  // Either source: the ground casts the shadow of whatever sky the deck is actually drawing.
  if (u_cloudShadow > 0.0 && (u_fieldAmount > 0.0 || u_patchAmount > 0.0)) {
    vec3 above = cloudShadowDirection(normal, sunDir, u_cloudAltitude);
    float cover = advectedField(equirectUV(above, u_drift), asin(clamp(above.y, -1.0, 1.0)));
    // The same threshold the deck opens its coverage with, so a shadow exists exactly where a
    // cloud does. No procedural detail: from orbit, a shadow thrown from the deck is a soft blob
    // and the filaments do not survive the trip down.
    // THE SHADOW'S EDGE, and it used to be the hardcoded pair (0.16, 0.62).
    //
    // A shadow is not drawn from a silhouette here; it is faded in across how much cloud is
    // overhead. So the WIDTH of that band is the edge: a narrow one steps from lit to shadowed
    // within a hair of cover and reads as a hard-edged stencil laid on the planet, which is what
    // Bart saw. A real cloud shadow has a penumbra several kilometres across, because the sun is
    // half a degree wide rather than a point.
    //
    // The band stays centred on 0.39 — the same midpoint the old pair had — so softening spreads
    // the edge without moving where the shadow sits or changing how much ground it covers.
    float halfBand = mix(0.05, 0.39, u_shadowSoftness);
    float shadow = smoothstep(0.39 - halfBand, 0.39 + halfBand, cover) * cloudShadowFade(normal, sunDir);
    day *= 1.0 - u_cloudShadow * shadow;
    lit *= 1.0 - shadow;
  }

  // ── Eclipse ───────────────────────────────────────────────────────────────────────────────
  // The moon covering some fraction of the sun's disc, worked out for THIS point rather than for
  // the planet: the moon is only sixty radii away, and that parallax is the whole reason totality
  // is a hundred-kilometre track instead of a hemisphere. Costs one comparison on the millions of
  // dates with no eclipse, because u_sunRadius is 0 on all of them.
  if (u_sunRadius > 0.0) {
    float remaining = eclipseLight(normal, sunDir, u_moon, u_sunRadius, ${Ji.toFixed(8)});
    day *= remaining;
    lit *= remaining;
  }

  day = clamp(day, 0.0, 1.0);
  float night = 1.0 - day;

  // Sunlit rock, added rather than blended: premultiplied alpha makes vec4(colour, 0.0) a pure
  // addition, which is the only way a darkening shell can put light back.
  vec3 emitted = lit * vec3(1.0, 0.97, 0.92);

  if (night < 0.004 && lit < 0.004) discard;   // full daylight, flat ground: leave the imagery alone

  // TWILIGHT IS TWO COLOURS ON OPPOSITE SIDES OF THE TERMINATOR, NOT ONE.
  //
  // Sunward of the line, the light still reaching the ground has crossed the most air and lost its
  // blue — that is the warm edge, and it is THIN. Nightward, the ground is already dark but the air
  // ABOVE it is still lit, and what comes back down has been Rayleigh-scattered, so it is BLUE.
  // That is the blue hour, and it is the half everyone forgets.
  //
  // Mixing the whole band to one saturated orange is what made it read as a stripe painted pole to
  // pole rather than as a sunset seen from orbit: there is no single orange anywhere in the real
  // thing, and the cool outer edge is what stops the warm one looking like a decal.
  //
  // It still follows the SUN's angle, so a cloud shadow at noon is grey rather than a private sunset.
  float band = 1.0 - abs(sunlight * 2.0 - 1.0);
  band = band * band * band;                          // narrower than the old square
  float warmSide = smoothstep(0.30, 0.70, sunlight);  // 1 sunward of the line, 0 nightward
  vec3 twilightTint = mix(u_twilightCool, u_twilightColour, warmSide);

  vec3 shade = mix(u_nightColour, twilightTint, band * u_twilightStrength);
  float alpha = night * u_nightDarkness;

  // City lights, but only where it is genuinely dark — they have no business showing at dusk, and
  // a passing cloud is not dusk.
  if (u_lightsAmount > 0.0) {
    float lights = texture(u_lights, equirectUV(normal, 0.0)).r;
    float visible = lights * smoothstep(0.25, 0.75, 1.0 - sunlight) * u_lightsAmount;
    // Added, not blended: lights EMIT. Blending them would make the cities darker than the sea.
    shade = shade + vec3(1.0, 0.86, 0.6) * visible * 1.6;
    alpha = min(1.0, alpha + visible * 0.5);
  }

  // Premultiplied, matching MapLibre's ONE / ONE_MINUS_SRC_ALPHA for custom layers.
  fragColour = vec4(shade * alpha + emitted, alpha);
}`,ss=({sun:e=[1,0,0],nightDarkness:t=.965,lightsUrl:r=null,lightsAmount:n=0,nightColour:l=[.02,.035,.07],twilightColour:c=[.62,.32,.16],twilightCool:o=[.1,.15,.28],twilightStrength:i=.55,reliefUrl:a=null,reliefWidth:h=8192,reliefPower:b=1.5,cloudShadow:L=.5,shadowSoftness:w=.75,eclipse:U=!0,date:p=null,fieldUrl:f=null,patchUrl:x=null,windUrl:_=null,windAmount:S=1,windScale:g=.06,windRate:s=.05,driftRate:z=4e-4,animate:N=!0}={})=>{const k=ea();let Y=null,m=null,Q=null,H=null,G=null,C=null,D=null,T=null;const I=new Map;let y={sun:e,nightDarkness:t,lightsUrl:r,lightsAmount:n,nightColour:l,twilightColour:c,twilightCool:o,twilightStrength:i,reliefUrl:a,reliefWidth:h,reliefPower:b,cloudShadow:L,eclipse:U,date:p,shadowSoftness:w,fieldUrl:f,patchUrl:x,windUrl:_,windAmount:S,windScale:g,windRate:s,driftRate:z,animate:N};const W=A=>{const K=A.variantName;if(I.has(K))return I.get(K);const R=ze(m,ns(A),is(),"tm-daylight"),$={program:R,attribs:{pos:m.getAttribLocation(R,"a_pos"),sphere:m.getAttribLocation(R,"a_sphere")},uniforms:{elevationGlobe:m.getUniformLocation(R,"a_elevation_globe"),elevationMercator:m.getUniformLocation(R,"a_elevation_mercator"),sun:m.getUniformLocation(R,"u_sun"),camera:m.getUniformLocation(R,"u_camera"),globeness:m.getUniformLocation(R,"u_globeness"),nightDarkness:m.getUniformLocation(R,"u_nightDarkness"),nightColour:m.getUniformLocation(R,"u_nightColour"),twilightColour:m.getUniformLocation(R,"u_twilightColour"),twilightCool:m.getUniformLocation(R,"u_twilightCool"),twilightStrength:m.getUniformLocation(R,"u_twilightStrength"),lights:m.getUniformLocation(R,"u_lights"),lightsAmount:m.getUniformLocation(R,"u_lightsAmount"),relief:m.getUniformLocation(R,"u_relief"),reliefPower:m.getUniformLocation(R,"u_reliefPower"),cloudShadow:m.getUniformLocation(R,"u_cloudShadow"),shadowSoftness:m.getUniformLocation(R,"u_shadowSoftness"),cloudAltitude:m.getUniformLocation(R,"u_cloudAltitude"),moon:m.getUniformLocation(R,"u_moon"),sunRadius:m.getUniformLocation(R,"u_sunRadius"),...Object.fromEntries(Oo.map(J=>[J,m.getUniformLocation(R,`u_${J}`)])),matrix:m.getUniformLocation(R,"u_projection_matrix"),tileMercatorCoords:m.getUniformLocation(R,"u_projection_tile_mercator_coords"),clippingPlane:m.getUniformLocation(R,"u_projection_clipping_plane"),transition:m.getUniformLocation(R,"u_projection_transition"),fallbackMatrix:m.getUniformLocation(R,"u_projection_fallback_matrix")}};return I.set(K,$),$},B=()=>Y?.triggerRepaint(),Z=(A,K,R,$)=>{!K?.ready||!A[R]||(m.activeTexture(m.TEXTURE0+$),m.bindTexture(m.TEXTURE_2D,K.texture),m.uniform1i(A[R],$))};return{id:er,type:"custom",renderingMode:"3d",onAdd(A,K){Y=A,m=K;const R=($,J)=>{const X=m.createBuffer();return m.bindBuffer($,X),m.bufferData($,J,m.STATIC_DRAW),X};Q={pos:R(m.ARRAY_BUFFER,k.positions),sphere:R(m.ARRAY_BUFFER,k.spheres),index:R(m.ELEMENT_ARRAY_BUFFER,k.indices)},y.lightsUrl&&(H=Ce(m,y.lightsUrl,B)),y.reliefUrl&&(G=Ce(m,y.reliefUrl,B)),y.fieldUrl&&(C=Ce(m,y.fieldUrl,B)),y.windUrl&&(D=Ce(m,y.windUrl,B)),y.patchUrl&&(T=Ce(m,y.patchUrl,B,{channels:1}))},onRemove(){m&&(I.forEach(({program:A})=>m.deleteProgram(A)),I.clear(),H?.release(),H=null,G?.release(),G=null,C?.release(),C=null,D?.release(),D=null,T?.release(),T=null,Q&&(m.deleteBuffer(Q.pos),m.deleteBuffer(Q.sphere),m.deleteBuffer(Q.index),Q=null),Y=null,m=null)},render(A,K){if(!Q||y.nightDarkness<=0)return;const R=K&&K.shaderData,$=K&&K.defaultProjectionData;if(!R||!$)return;const{program:J,attribs:X,uniforms:F}=W(R);m.useProgram(J),F.matrix&&m.uniformMatrix4fv(F.matrix,!1,$.mainMatrix),F.tileMercatorCoords&&m.uniform4f(F.tileMercatorCoords,...$.tileMercatorCoords),F.clippingPlane&&m.uniform4f(F.clippingPlane,...$.clippingPlane),F.transition&&m.uniform1f(F.transition,$.projectionTransition),F.fallbackMatrix&&m.uniformMatrix4fv(F.fallbackMatrix,!1,$.fallbackMatrix);const ue=Y.getCenter().lat,ce=0;F.elevationGlobe&&m.uniform1f(F.elevationGlobe,ce),F.elevationMercator&&m.uniform1f(F.elevationMercator,le.MercatorCoordinate.fromLngLat([0,ue],ce).z),F.sun&&m.uniform3f(F.sun,...y.sun),F.camera&&m.uniform3f(F.camera,...ct(Y,le)),F.globeness&&m.uniform1f(F.globeness,$.projectionTransition),F.nightDarkness&&m.uniform1f(F.nightDarkness,y.nightDarkness),F.nightColour&&m.uniform3f(F.nightColour,...y.nightColour),F.twilightColour&&m.uniform3f(F.twilightColour,...y.twilightColour),F.twilightCool&&m.uniform3f(F.twilightCool,...y.twilightCool),F.twilightStrength&&m.uniform1f(F.twilightStrength,y.twilightStrength),F.lightsAmount&&m.uniform1f(F.lightsAmount,H?.ready?y.lightsAmount:0);const ve=G?.ready?Yn(Y.getZoom(),ue,y.reliefWidth).strength:0;F.reliefPower&&m.uniform1f(F.reliefPower,y.reliefPower*ve),F.cloudShadow&&m.uniform1f(F.cloudShadow,y.cloudShadow),F.shadowSoftness&&m.uniform1f(F.shadowSoftness,y.shadowSoftness),F.cloudAltitude&&m.uniform1f(F.cloudAltitude,Xt/Jt);const Ee=y.eclipse?y.date:null,Oe=Ee&&os(Ee)?Jo(Ee):null;F.sunRadius&&m.uniform1f(F.sunRadius,Oe?ts(Ee):0),Oe&&F.moon&&m.uniform3f(F.moon,...Oe),No(m,F,y,{seconds:performance.now()*.001,field:C,wind:D,patches:T},Rt.field,Rt.wind,Rt.patches),Z(F,G,"relief",Rt.relief),Z(F,H,"lights",Rt.lights),m.bindBuffer(m.ARRAY_BUFFER,Q.pos),m.enableVertexAttribArray(X.pos),m.vertexAttribPointer(X.pos,2,m.FLOAT,!1,0,0),m.bindBuffer(m.ARRAY_BUFFER,Q.sphere),m.enableVertexAttribArray(X.sphere),m.vertexAttribPointer(X.sphere,3,m.FLOAT,!1,0,0),m.disable(m.DEPTH_TEST),m.depthMask(!1),m.bindBuffer(m.ELEMENT_ARRAY_BUFFER,Q.index),m.drawElements(m.TRIANGLES,k.indices.length,m.UNSIGNED_SHORT,0),m.enable(m.DEPTH_TEST),m.depthMask(!0),y.animate&&(C?.ready||T?.ready)&&y.cloudShadow>0&&Y.triggerRepaint()},setOptions(A={}){const K=y;if(y={...y,...A},!m){Y?.triggerRepaint();return}const R=($,J)=>{if(A[J]===void 0||A[J]===K[J])return $;$?.release();const X=J==="patchUrl"?{channels:1}:void 0;return y[J]?Ce(m,y[J],B,X):null};H=R(H,"lightsUrl"),G=R(G,"reliefUrl"),C=R(C,"fieldUrl"),D=R(D,"windUrl"),T=R(T,"patchUrl"),Y?.triggerRepaint()},getOptions:()=>({...y}),get hasLights(){return!!H?.ready},get hasRelief(){return!!G?.ready}}},ls=er,tr="tm-atmosphere",cs=63710088e-1,ba=2e5,hs=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_pos;
attribute vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
varying vec3 v_sphere;
${ta}
void main() {
  v_sphere = a_sphere;
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,us=()=>`precision highp float;
varying vec3 v_sphere;
uniform vec3 u_camera;      // camera in planet space (earth = unit sphere)
uniform vec3 u_sun;         // direction TO the sun
uniform float u_top;        // top of the atmosphere, in earth radii
uniform float u_strength;
uniform vec3 u_dayColour;
uniform vec3 u_duskColour;
uniform float u_forward;      // how much of the forward-scattering lobe to keep, 0 = none
uniform float u_scatter_g;    // its narrowness; 0 is uniform, 0.9 is a searchlight

const int SAMPLES = 6;

${Do}

/**
 * Is this parcel of air in sunlight, or is the earth in the way?
 *
 * THE WHOLE POINT. Air only scatters light that reaches it, so the band must be gated on whether
 * the air itself is lit, NOT on which way it faces. This used to be a smoothstep from -0.35 to
 * 0.25 over dot(normalize(pos), u_sun), an ANGULAR test, and that is what ringed the planet: at
 * the terminator it returns 0.62, and it keeps returning something twenty degrees past it, so the
 * unlit limb was handed a fifth of full brightness and drew a rim all the way round. In the NASA
 * photograph the night limb is black — not dim, absent — and the reason is geometric, not
 * angular. Air behind the earth is in its shadow.
 *
 * NO BACKTICKS IN THIS COMMENT. It lives inside the fragment shader's template literal, so one
 * would end the string and the file would fail to parse a long way from here.
 *
 * So the test is the shadow itself: is the earth between this air and the sun.
 *
 * THE TEST IS TAKEN AT THE GROUND BENEATH THE SAMPLE, NOT AT THE SAMPLE. That looks like a
 * needless approximation and it is the entire difference between this working and not. The drawn
 * shell is EXAGGERATED — 200 km, about 3% of the radius, because the real 100 km is a couple of
 * pixels at globe zoom. Air at a made-up altitude clears the shadow cylinder at a made-up angle,
 * so testing the sample's own position lets the band survive a long way onto the dark side. That
 * was measured, not feared: the first version of this function tested the sample directly and made
 * the 90-120° sector BRIGHTER than the angular gate it replaced, 50.6 to 83.4. It fixed nothing and
 * would have shipped looking like a fix.
 *
 * Projecting to the unit sphere first asks the question the exaggeration cannot distort: is the
 * ground under this column in daylight. That is the terminator in the photograph.
 *
 * The window is deliberately tight — a sliver of twilight rather than an arc, dying within about
 * eight degrees of the terminator. A wider one is more physical and is exactly the halo being
 * removed; Bart's reference is a night side with no glow on the dark limb AT ALL.
 */
float sunlitFraction(vec3 pos) {
  vec3 ground = normalize(pos);                            // the surface below this parcel of air
  float alongSun = dot(ground, u_sun);
  if (alongSun > 0.0) return 1.0;                          // daylit hemisphere
  float axisDistance = length(ground - u_sun * alongSun);  // 1.0 exactly at the terminator
  return smoothstep(0.995, 1.0, axisDistance);
}

void main() {
  vec3 shell = normalize(v_sphere) * u_top;
  vec3 toCamera = u_camera - shell;
  // The mesh is a whole sphere, so the far hemisphere covers the same pixels as the near one and
  // would double the brightness. Keep the half facing the camera.
  if (dot(normalize(toCamera), normalize(shell)) < 0.0 && length(u_camera) > u_top) discard;

  vec3 ray = normalize(shell - u_camera);
  vec2 air = sphereSpan(u_camera, ray, u_top);
  if (air.x > air.y) discard;

  float near = max(air.x, 0.0);
  float far = air.y;
  // Air in FRONT of the ground only: past the surface the ray is underground, and counting it
  // would ring the planet in haze from the inside.
  vec2 ground = sphereSpan(u_camera, ray, 1.0);
  bool hitsGround = ground.x <= ground.y && ground.y > 0.0;
  if (hitsGround) far = min(far, max(ground.x, 0.0));
  if (far <= near) discard;

  // Walk the ray, weighting each sample by air density at that height. Density halves every ~5 km,
  // which on this scale is a very fast falloff — hence brightest just above the horizon.
  float stepLen = (far - near) / float(SAMPLES);
  float density = 0.0;
  float lit = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    vec3 pos = u_camera + ray * (near + stepLen * (float(i) + 0.5));
    float height = (length(pos) - 1.0) / (u_top - 1.0);       // 0 at the ground, 1 at the top
    float d = exp(-max(height, 0.0) * 4.5) * stepLen;
    density += d;
    lit += d * sunlitFraction(pos);
  }
  if (density <= 0.0) discard;
  lit /= density;

  // Sunset colour at the terminator: the low sun's light has crossed enough air to lose its blue,
  // which is why the band goes orange exactly where day meets night.
  float grazing = 1.0 - abs(dot(normalize(shell), normalize(u_camera - shell)));
  vec3 colour = mix(u_duskColour, u_dayColour, smoothstep(0.15, 0.65, lit));

  float alpha = (1.0 - exp(-density * 150.0 * u_strength)) * lit;
  // Face-on the ray crosses the shell almost perpendicular — a few hundred kilometres of thin air,
  // which from orbit is very nearly clear. At the limb it skims tangentially through the whole
  // depth of the atmosphere. Squaring the grazing term puts almost all the brightness in the band,
  // which is where a photograph puts it; a linear falloff leaves the disc under a blue wash and
  // buries the imagery it is supposed to sit on.
  alpha *= 0.04 + 0.96 * pow(grazing, 2.5);

  // FORWARD SCATTERING, which is why haze is not equally bright all the way round.
  //
  // Air does not scatter light evenly in all directions. Particles comparable to the wavelength
  // throw most of it very nearly FORWARD, so looking through haze toward the sun is many times
  // brighter than looking through the same haze away from it. It is why a windscreen you cannot see
  // through driving west is perfectly clear driving east, and on a globe it is why the limb beside
  // the sun blazes while the far limb stays a thin cold line.
  //
  // Henyey-Greenstein, the standard one-parameter phase function. Normalised at right angles so
  // u_forward = 0 is exactly the old look and the term only ever adds. Clamped because the true
  // lobe runs to 25x within a couple of degrees of the sun's centre, where the disc is drawn over
  // it anyway — uncapped it produces a white blob on the limb rather than a bright limb.
  float cosTheta = dot(ray, u_sun);
  float g = u_scatter_g;
  float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5);
  float sideways = (1.0 - g * g) / pow(1.0 + g * g, 1.5);
  float boost = u_forward * min(phase / sideways - 1.0, 5.0);

  // Bright haze is WHITE haze. Scattering that strong is light that has bounced several times, and
  // multiple scattering washes the colour out — which is why a hazy sun is a white glare and not a
  // saturated blue one. Without this the boost merely amplifies the existing day/dusk ramp, and
  // since that ramp runs from orange to blue the amplified overlap lands on magenta: a rainbow
  // fringe around the limb that looks exactly like chromatic aberration and is nothing of the sort.
  colour = mix(colour, vec3(1.0), clamp(boost * 0.2, 0.0, 0.7));
  alpha *= 1.0 + boost;

  // Alpha ABOVE ONE is the other half of that bug. The output is premultiplied, so an alpha of 1.6
  // writes a colour brighter than its own coverage; the channels then clip one at a time and the
  // hue shifts as it saturates rather than simply going white.
  alpha = min(alpha, 1.0);

  if (alpha < 0.002) discard;
  gl_FragColor = vec4(colour * alpha, alpha);
}`,ds=({strength:e=1,sun:t=[.4,.5,.75],dayColour:r=[.32,.55,1],duskColour:n=[1,.45,.18],forwardScatter:l=.35,scatterG:c=.6}={})=>{const o=ea();let i=null,a=null,h=null;const b=new Map;let L={strength:e,sun:t,dayColour:r,duskColour:n,forwardScatter:l,scatterG:c};const w=U=>{const p=U.variantName;if(b.has(p))return b.get(p);const f=ze(a,hs(U),us(),"tm-atmosphere",{es300:!0}),x={program:f,attribs:{pos:a.getAttribLocation(f,"a_pos"),sphere:a.getAttribLocation(f,"a_sphere")},uniforms:{elevationGlobe:a.getUniformLocation(f,"a_elevation_globe"),elevationMercator:a.getUniformLocation(f,"a_elevation_mercator"),camera:a.getUniformLocation(f,"u_camera"),sun:a.getUniformLocation(f,"u_sun"),top:a.getUniformLocation(f,"u_top"),strength:a.getUniformLocation(f,"u_strength"),dayColour:a.getUniformLocation(f,"u_dayColour"),duskColour:a.getUniformLocation(f,"u_duskColour"),forward:a.getUniformLocation(f,"u_forward"),scatterG:a.getUniformLocation(f,"u_scatter_g"),matrix:a.getUniformLocation(f,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(f,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(f,"u_projection_clipping_plane"),transition:a.getUniformLocation(f,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(f,"u_projection_fallback_matrix")}};return b.set(p,x),x};return{id:tr,type:"custom",renderingMode:"3d",onAdd(U,p){i=U,a=p;const f=(x,_)=>{const S=a.createBuffer();return a.bindBuffer(x,S),a.bufferData(x,_,a.STATIC_DRAW),S};h={pos:f(a.ARRAY_BUFFER,o.positions),sphere:f(a.ARRAY_BUFFER,o.spheres),index:f(a.ELEMENT_ARRAY_BUFFER,o.indices)}},onRemove(){a&&(b.forEach(({program:U})=>a.deleteProgram(U)),b.clear(),h&&(a.deleteBuffer(h.pos),a.deleteBuffer(h.sphere),a.deleteBuffer(h.index),h=null),i=null,a=null)},render(U,p){if(!h||L.strength<=0)return;const f=p&&p.shaderData,x=p&&p.defaultProjectionData;if(!f||!x)return;const{program:_,attribs:S,uniforms:g}=w(f);a.useProgram(_),g.matrix&&a.uniformMatrix4fv(g.matrix,!1,x.mainMatrix),g.tileMercatorCoords&&a.uniform4f(g.tileMercatorCoords,...x.tileMercatorCoords),g.clippingPlane&&a.uniform4f(g.clippingPlane,...x.clippingPlane),g.transition&&a.uniform1f(g.transition,x.projectionTransition),g.fallbackMatrix&&a.uniformMatrix4fv(g.fallbackMatrix,!1,x.fallbackMatrix);const s=i.getCenter().lat;g.elevationGlobe&&a.uniform1f(g.elevationGlobe,ba),g.elevationMercator&&a.uniform1f(g.elevationMercator,le.MercatorCoordinate.fromLngLat([0,s],ba).z);const z=ct(i,le);g.camera&&a.uniform3f(g.camera,z[0],z[1],z[2]),g.sun&&a.uniform3f(g.sun,...L.sun),g.top&&a.uniform1f(g.top,1+ba/cs),g.strength&&a.uniform1f(g.strength,L.strength),g.dayColour&&a.uniform3f(g.dayColour,...L.dayColour),g.duskColour&&a.uniform3f(g.duskColour,...L.duskColour),g.forward&&a.uniform1f(g.forward,L.forwardScatter),g.scatterG&&a.uniform1f(g.scatterG,L.scatterG),a.bindBuffer(a.ARRAY_BUFFER,h.pos),a.enableVertexAttribArray(S.pos),a.vertexAttribPointer(S.pos,2,a.FLOAT,!1,0,0),a.bindBuffer(a.ARRAY_BUFFER,h.sphere),a.enableVertexAttribArray(S.sphere),a.vertexAttribPointer(S.sphere,3,a.FLOAT,!1,0,0),a.enable(a.DEPTH_TEST),a.depthFunc(a.LEQUAL),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,h.index),a.drawElements(a.TRIANGLES,o.indices.length,a.UNSIGNED_SHORT,0),a.depthMask(!0)},setOptions(U={}){L={...L,...U},i?.triggerRepaint()},getOptions:()=>({...L})}},fs=tr,ms=32,ar=[{width:8192,height:4096,url:"/timemap/ocean-sdf-8192.webp"},{width:4096,height:2048,url:"/timemap/ocean-sdf-4096.webp"}],ps=`
  float oceanDistanceKm(float stored, float rangeKm) {
    return (stored * 2.0 - 1.0) * rangeKm;
  }
`,or="tm-ocean",gs=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_pos;
attribute vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
varying vec3 v_sphere;
${ta}
void main() {
  v_sphere = a_sphere;
  // Sea level: the glint belongs on the water, not above it.
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,ys=()=>`precision highp float;
varying vec3 v_sphere;
uniform vec3 u_camera;      // camera in planet space, earth = unit sphere
uniform vec3 u_sun;         // direction TO the sun
uniform float u_globeness;  // 1 on the globe, 0 on the flat map
uniform sampler2D u_field;  // signed distance to the coast, equirectangular
uniform float u_rangeKm;    // kilometres at which that field saturates
uniform float u_shoreKm;    // half-width of the shoreline transition
uniform float u_shelfKm;    // how far out the shallow-water colour reaches
uniform float u_strength;   // glint intensity
uniform float u_roughness;  // 0 glassy, 1 whipped up — the sea's AVERAGE state
uniform float u_windPatch;  // how far the local sea state strays from that average
uniform float u_windScale;  // cycles of weather per unit sphere
uniform vec3 u_scatter;     // the water body's own colour — what deep water converges to
uniform vec3 u_bottom;      // sea-floor albedo, seen only where the water is shallow enough
uniform vec3 u_absorption;  // how fast each channel is absorbed, per metre of water
uniform float u_shelfDepthM; // depth the shelf proxy reaches at its outer edge
uniform vec3 u_sky;         // what the water mirrors at a glancing angle
uniform float u_water;      // how strongly the water colour is painted at all
uniform float u_fade;       // 1 from orbit, 0 close up where real imagery takes over
uniform float u_opacity;    // master
// Sangil Lee's reflectRatio remap, water -> 0.3 * water + 0.1, requested for evaluation. It stops a
// BINARY mask reading as a cut-out by giving land a little sheen and capping the sea below a full
// mirror. Measured here at 1: the Sahara gains 11.1 blue while losing 7.9 red, and the Taklamakan
// darkens by 12.8 luma — ocean colour on desert hundreds of kilometres from any coast, because a
// floor of 0.1 means no fragment ever discards. It softens an edge this layer no longer has, the
// distance field having put the coastline inside the texel. 0 by default; turn it up to see it.
uniform float u_edgeRemap;
${aa}
${Co}
${Io}
${Ra}
${ps}

/**
 * The local sea state — how rough the water is HERE, rather than everywhere at once.
 *
 * A single roughness makes the glitter path a smooth analytic blob, and that is the tell that it
 * was computed rather than photographed. In a real orbital picture the glint is mottled: streaks
 * and calm patches inside the bright area, where wind and slicks have left the surface rougher or
 * smoother than its average.
 *
 * The perturbation is on ROUGHNESS, not on the normal. Displacing the normal at wave scale is the
 * usual trick and it is meaningless here: one screen pixel covers twenty to forty kilometres from
 * orbit, so wave facets are millions to a pixel and any wave-scale noise aliases into static. What
 * genuinely survives at this scale is the weather, which varies over tens to hundreds of
 * kilometres — low frequency, so it neither aliases nor needs a screen-space derivative to tame.
 */
float seaState(vec3 p) {
  float weather = noise(p * u_windScale) * 0.65 + noise(p * u_windScale * 2.7) * 0.35;
  return clamp(u_roughness + u_windPatch * (weather - 0.5) * 2.0, 0.04, 1.0);
}

// ── The two source seams ──────────────────────────────────────────────────────────────────────
// Everything below this pair is lighting and knows nothing about where the data came from. These
// two functions are the ONLY places that touch a texture, so moving from one baked equirectangular
// field to streamed z/x/y tiles is a change to these and to nothing else. Keep it that way: a
// texture fetch that creeps into the lighting is a second place the source has to be swapped, and
// it will be found the hard way.

/** Kilometres to the nearest coast, negative inland. */
float coastDistanceKm(vec3 unitPos) {
  return oceanDistanceKm(texture2D(u_field, equirectUV(unitPos, 0.0)).r, u_rangeKm);
}

/**
 * How deep the water is, in metres.
 *
 * Today this is a shelf profile inferred from distance to the coast — a PROXY, and a defensible one
 * at this scale, because a real shelf does broadly track the coastline. Squared so it deepens slowly
 * inshore and then falls away, which is the shape of a real shelf and its break.
 *
 * THE SOURCE SWAPS HERE AND NOWHERE ELSE. The terrarium DEM this map already streams carries
 * bathymetry as negative elevation — measured: −32 m in the North Sea, −21 m on Dogger Bank,
 * −3,415 m mid-Atlantic — so real depth costs no new data pipeline, only the half of that tile the
 * relief pass throws away. When it arrives, this function body is the whole change.
 *
 * WHERE ZERO IS, IF THE DEPTH EVER ARRIVES BYTE-ENCODED. It does not from the tile pyramid, which
 * carries signed height in metres with no encode step — so there is nothing to undo there, and
 * applying a decode would introduce the very bias one exists to remove. The hazard is real for any
 * BAKED byte channel: a field encoded as x*0.5+0.5 lands zero on byte 127.5, which rounds to 128,
 * and a decoder reading texel*2-1 returns 0.0039 rather than 0. On terrain normals that is a
 * constant tilt worth one 8-bit level. Here it would be 0.784 m of false depth at the shoreline,
 * where the ramp is steepest at 92 levels per metre — 51.6 levels of colour error along every coast
 * on the planet, fifty times what it costs the normals.
 *
 * The coastline field above does not have this problem and must not be "fixed" to match: its
 * encode and decode are both centred on 127.5, so they agree, and recentring only the decode would
 * introduce the very bias this warns about. Test-pinned both ways.
 *
 * WHAT THE SOURCE HAS TO DELIVER: metres over 0 to −200 m, and nothing past that. The colour model
 * saturates — 200 m sits 0.015 of an 8-bit level from open ocean, 1,000 m sits 1e-16 — so range
 * beyond it is wasted, while the first 50 m carries over nine tenths of the signal at up to 92
 * levels per metre. Eight bits spread linearly across that range band by 72 levels at the surface;
 * sixteen band by 0.28. See docs/globe-overlay-resolution.md for the table and for why block
 * compression is not safe on this channel.
 *
 * IT RETURNS A VALUE, AND IT MUST STAY THAT WAY. Hillshade the sea floor and the Atlantic becomes a
 * bathymetric chart: ridges and abyssal plains are not visible through three kilometres of water,
 * and drawing them reads as a map rather than an ocean. Depth belongs in the colour, under a lit
 * surface. This function may sample depth; it may never differentiate it.
 */
const float OPEN_OCEAN_M = 400.0;   // past the colour model's saturation at ~200 m

float waterDepthMetres(vec3 unitPos, float coastKm) {
  // Linear, and fitted rather than chosen. Sampling terrarium against distance-to-coast over five
  // shelves gives a median of 3.7 m at 4 km out, 8.1 m at 10 km and 14.2 m at 22 km — near enough
  // a straight line, and nothing like the 90 m an earlier squared profile reached at the same
  // distance. That overshoot is what turned the shelf into a thin bright rim around every coast
  // instead of a band: the water went from sand to open ocean within a few kilometres.
  float t = clamp(max(coastKm, 0.0) / u_shelfKm, 0.0, 1.0);
  float depth = u_shelfDepthM * t;

  // Past the shelf band, fall away to open ocean over the rest of the field's range. Without this
  // every sea beyond 22 km sits at shelf depth and the Atlantic renders as a shallow bank, never
  // reaching the deep colour the whole model is calibrated to. The distance field saturates at 32
  // km, so this is the last thing it can still tell us apart.
  //
  // It is also where the proxy is most obviously a proxy: a 32 km field cannot tell the North Sea
  // from the Atlantic, and this resolves that ambiguity toward deep, which is right for the 95% of
  // the ocean that IS deep and wrong for the shallow shelf seas. Real bathymetry ends the guess.
  depth = mix(depth, OPEN_OCEAN_M, smoothstep(0.72, 1.0, max(coastKm, 0.0) / u_rangeKm));

  // ABOVE THE MERCATOR LIMIT, SATURATE RATHER THAN SAMPLE.
  //
  // A STAND-IN, to be deleted at integration. The pyramid ships tiledSphereCoverage(vec3) for
  // exactly this, and three layers each choosing their own fade latitude is how one globe ends up
  // with the same edge drawn in three places. Multiply the ramp by that instead of this, and take
  // the argument about where the fade belongs to them rather than settling it here.
  //
  // Mercator stops at 85.0511°, so a tiled source has nothing past it — every sample clamps to the
  // same edge row. Under a colour ramp a smeared row does not read as blur, it reads as a band of
  // sea changing shade along a latitude line, which is the one artefact this layer cannot afford.
  //
  // It costs nothing to refuse, because there is no shallow water up there to lose. Measured on the
  // baked field: north of 85° is 100% water and EVERY texel sits at the field's saturated distance,
  // with 0.0% inside the shelf band; south of 85° is 0% water, being Antarctica. The ramp is already
  // constant at both poles, so forcing it constant changes nothing today and makes the swap to
  // tiles safe. The sphere mesh reaches ±89.999°, so without this the smear would be drawn.
  //
  // THE ARCTIC CAP IS A CONSTANT, AND IT IS EXACT RATHER THAN A COMPROMISE.
  //
  // Past 85.0511° mercator has no tiles and never will, so a tiled depth source has nothing to say
  // there. The cap is 0.191% of the earth and 100% water — no coastline in it, no land/water call
  // to make — but that alone does NOT license a constant, and the tile session was right to say so:
  // the basin runs from the Lomonosov crest down to −4393 m, and flattening that would be the same
  // class of error as flattening Antarctica for a shading term.
  //
  // It is licensed by something else. This ramp saturates at 200 m, so the whole range up there is
  // already one colour: 700 m against 4393 m differs by 3e-11 of an 8-bit level, and every depth
  // past 250 m sits within 0.002 of a level of this fill. A constant is not an approximation of the
  // Arctic bathymetry here — it is indistinguishable from having all of it.
  //
  // THE CONDITION, since it is the thing that would quietly stop being true: this holds only while
  // nothing above 85°N is shallower than about 250 m. Measured, 0.0% of the water up there is
  // within the shelf band and the shallowest known feature is around 700 m, so the margin is wide.
  // A ramp that ever gained deep-water structure — a bathymetric mode, say — would break it.
  //
  // Only the north needs saying. The south is land, and the coastline field discards it before this
  // function is reached, which is what carrying extent separately buys.
  const float SIN_FADE_START = 0.994522;   // 84°, one degree of run-up; tiledSphereCoverage replaces this
  const float SIN_MERCATOR_EDGE = 0.996272;
  const float ARCTIC_BASIN_M = OPEN_OCEAN_M;
  float polar = smoothstep(SIN_FADE_START, SIN_MERCATOR_EDGE, unitPos.y);
  return mix(depth, max(depth, ARCTIC_BASIN_M), polar);
}

/**
 * The colour of the water column itself, from how far light gets through it.
 *
 * NOT a lerp between a shallow colour and a deep one. Water absorbs light at wildly different rates
 * by wavelength — red is gone within a couple of metres, blue penetrates tens — so the turquoise of
 * a shelf and the navy of open ocean are the SAME water at two path lengths, not two paints. Beer-
 * Lambert per channel gets that for free, and gets the intermediate greens right, which is what a
 * two-colour lerp can never do: it always passes through a muddy average on the way.
 *
 * Light goes down, bounces off the bottom, and comes back up, so the path is twice the depth,
 * lengthened again when the water is seen at a slant. What survives that trip is the bottom; what
 * does not is replaced by the water's own scattered colour, which is what deep water converges to.
 */
vec3 waterColumn(float depthM, float facing) {
  float path = 2.0 * depthM / max(facing, 0.25);
  vec3 transmitted = exp(-u_absorption * path);
  return mix(u_scatter, u_bottom, transmitted);
}

void main() {
  vec3 normal = normalize(v_sphere);

  // The mesh is a closed sphere, so the far side covers the same pixels as the near side. Reject it
  // here rather than with the depth buffer: a shell sitting on a 6371 km sphere cannot be separated
  // from the globe's own tiles by depth at orbital range, and testing anyway breaks the layer into
  // a flickering quilt of tile-shaped patches. See FACING_CAMERA_GLSL.
  if (u_globeness > 0.5 && !facesCamera(normal, u_camera)) discard;

  float km = coastDistanceKm(normal);
  // u_shoreKm tracks the screen pixel, so this transition is always about a pixel and a half wide:
  // crisp on approach, and self-antialiasing at globe zoom where the coast is far below a texel.
  float water = smoothstep(-u_shoreKm, u_shoreKm, km);
  // Requested remap, off by default — see the u_edgeRemap note above for what it measures.
  water = mix(water, 0.3 * water + 0.1, u_edgeRemap);
  if (water < 0.004) discard;                    // land: leave the imagery alone

  vec3 view = normalize(u_camera - normal);
  float facing = max(dot(normal, view), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);

  float sunAngle = dot(normal, u_sun);
  float day = daylightFraction(sunAngle);        // shared with the night and the clouds
  float lambert = max(sunAngle, 0.0);

  float depthM = waterDepthMetres(normal, km);
  vec3 body = waterColumn(depthM, facing) * (0.08 + 0.92 * lambert);

  vec3 skyTerm = u_sky * fresnel * day;

  vec3 halfway = normalize(u_sun + view);
  float alignment = max(dot(normal, halfway), 0.0);
  float sea = seaState(normal);
  float sharp = pow(alignment, mix(2400.0, 260.0, sea));
  float broad = pow(alignment, mix(180.0, 26.0, sea));
  // The highlight outlives the water colour on the way down — a square root rather than the fade
  // itself — so it survives the handover to Sentinel-2 instead of blinking out mid-descent.
  float glint = (sharp + 0.35 * broad) * day * u_strength * sqrt(u_fade);
  vec3 sunTerm = mix(vec3(0.85, 0.90, 1.0), vec3(1.0, 0.96, 0.86), fresnel) * glint;

  // ONE fade, in the alpha, and NOT a second one in the colour.
  //
  // The colour used to be scaled by the fade as well as the alpha. Premultiplied
  // output is colour * alpha, so the emitted light fell as fade SQUARED while the coverage fell as
  // fade — mid-handover the layer replaced a third of the imagery with a ninth of its own colour.
  // Measured over the North Sea at z7: Sentinel-2's (25,44,77) came out as (19,34,59). The layer
  // was fading toward BLACK rather than toward the picture underneath, and it darkened the very
  // imagery it hands over to. Alpha alone fades a layer out; scaling the colour too is a hole.
  vec3 colour = body + skyTerm + sunTerm;

  float alpha = clamp(water * (u_water * u_fade + glint), 0.0, 1.0) * u_opacity;
  if (alpha < 0.003) discard;
  // MapLibre blends custom layers with gl.ONE / gl.ONE_MINUS_SRC_ALPHA, i.e. PREMULTIPLIED alpha.
  // Multiplying the colour by the water mask instead of by the alpha is what made an earlier
  // version of this layer glow over dark ground.
  gl_FragColor = vec4(colour * alpha, alpha);
}`,bs=(e,{fadeInAbove:t=9e5,fadeOutBelow:r=18e4}={})=>{const n=Math.max(0,Math.min(1,(e-r)/(t-r)));return n*n*(3-2*n)},ws=(e,t,r=.8)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e);return Math.max(r,n*1.5/1e3)},vs=40075,_s=e=>Number.isFinite(e)&&e>0?vs/e/2:.8,po=(e,t=ar)=>t.find(r=>r.width<=e&&r.height<=e)||null,xs=({opacity:e=1,strength:t=.9,roughness:r=.55,windPatch:n=.3,windScale:l=14,edgeRemap:c=0,sun:o=[.4,.5,.75],water:i=1,absorption:a=[.45,.06,.02],scatter:h=[.12,.265,.43],bottom:b=[.42,.4,.33],sky:L=[.34,.5,.76],shelfKm:w=22,shelfDepthM:U=16,shoreSoftnessKm:p=.8,fadeInAbove:f=9e5,fadeOutBelow:x=18e4,sources:_=ar}={})=>{const S=ea();let g=null,s=null,z=null,N=null,k=null,Y=!1;const m=new Map;let Q={opacity:e,strength:t,roughness:r,windPatch:n,windScale:l,edgeRemap:c,sun:o,water:i,absorption:a,scatter:h,bottom:b,sky:L,shelfKm:w,shelfDepthM:U,shoreSoftnessKm:p,fadeInAbove:f,fadeOutBelow:x,sources:_};const H=T=>{const I=T.variantName;if(m.has(I))return m.get(I);const y=ze(s,gs(T),ys(),"tm-ocean",{es300:!0}),W={program:y,attribs:{pos:s.getAttribLocation(y,"a_pos"),sphere:s.getAttribLocation(y,"a_sphere")},uniforms:{elevationGlobe:s.getUniformLocation(y,"a_elevation_globe"),elevationMercator:s.getUniformLocation(y,"a_elevation_mercator"),camera:s.getUniformLocation(y,"u_camera"),sun:s.getUniformLocation(y,"u_sun"),globeness:s.getUniformLocation(y,"u_globeness"),field:s.getUniformLocation(y,"u_field"),rangeKm:s.getUniformLocation(y,"u_rangeKm"),shoreKm:s.getUniformLocation(y,"u_shoreKm"),shelfKm:s.getUniformLocation(y,"u_shelfKm"),strength:s.getUniformLocation(y,"u_strength"),roughness:s.getUniformLocation(y,"u_roughness"),windPatch:s.getUniformLocation(y,"u_windPatch"),windScale:s.getUniformLocation(y,"u_windScale"),water:s.getUniformLocation(y,"u_water"),scatter:s.getUniformLocation(y,"u_scatter"),bottom:s.getUniformLocation(y,"u_bottom"),absorption:s.getUniformLocation(y,"u_absorption"),shelfDepthM:s.getUniformLocation(y,"u_shelfDepthM"),sky:s.getUniformLocation(y,"u_sky"),fade:s.getUniformLocation(y,"u_fade"),opacity:s.getUniformLocation(y,"u_opacity"),edgeRemap:s.getUniformLocation(y,"u_edgeRemap"),matrix:s.getUniformLocation(y,"u_projection_matrix"),tileMercatorCoords:s.getUniformLocation(y,"u_projection_tile_mercator_coords"),clippingPlane:s.getUniformLocation(y,"u_projection_clipping_plane"),transition:s.getUniformLocation(y,"u_projection_transition"),fallbackMatrix:s.getUniformLocation(y,"u_projection_fallback_matrix")}};return m.set(I,W),W},G=()=>{k=s.createTexture(),s.bindTexture(s.TEXTURE_2D,k),s.texImage2D(s.TEXTURE_2D,0,s.LUMINANCE,1,1,0,s.LUMINANCE,s.UNSIGNED_BYTE,new Uint8Array([0])),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE)},C=T=>{s&&(k&&s.deleteTexture(k),k=s.createTexture(),s.bindTexture(s.TEXTURE_2D,k),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,!1),Uo(s)?s.texImage2D(s.TEXTURE_2D,0,s.R8,s.RED,s.UNSIGNED_BYTE,T):s.texImage2D(s.TEXTURE_2D,0,s.LUMINANCE,s.LUMINANCE,s.UNSIGNED_BYTE,T),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.REPEAT),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR_MIPMAP_LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.generateMipmap(s.TEXTURE_2D),Y=!0,g?.triggerRepaint())},D=()=>{const T=po(s.getParameter(s.MAX_TEXTURE_SIZE),Q.sources);if(!T)return;const I=T.url;z=T.width,fetch(I,{credentials:"omit"}).then(y=>y.ok?y.blob():Promise.reject(new Error(y.status))).then(y=>createImageBitmap(y,{colorSpaceConversion:"none",premultiplyAlpha:"none",imageOrientation:"none"})).then(y=>{if(po(s?.getParameter(s.MAX_TEXTURE_SIZE)??0,Q.sources)?.url!==I){y.close?.();return}C(y),y.close?.()}).catch(()=>{})};return{id:or,type:"custom",renderingMode:"3d",onAdd(T,I){g=T,s=I;const y=(W,B)=>{const Z=s.createBuffer();return s.bindBuffer(W,Z),s.bufferData(W,B,s.STATIC_DRAW),Z};N={pos:y(s.ARRAY_BUFFER,S.positions),sphere:y(s.ARRAY_BUFFER,S.spheres),index:y(s.ELEMENT_ARRAY_BUFFER,S.indices)},G(),D()},onRemove(){s&&(m.forEach(({program:T})=>s.deleteProgram(T)),m.clear(),k&&(s.deleteTexture(k),k=null,Y=!1),N&&(s.deleteBuffer(N.pos),s.deleteBuffer(N.sphere),s.deleteBuffer(N.index),N=null),g=null,s=null)},render(T,I){if(!N||Q.opacity<=0)return;const y=I&&I.shaderData,W=I&&I.defaultProjectionData;if(!y||!W)return;const{program:B,attribs:Z,uniforms:A}=H(y);s.useProgram(B),A.matrix&&s.uniformMatrix4fv(A.matrix,!1,W.mainMatrix),A.tileMercatorCoords&&s.uniform4f(A.tileMercatorCoords,...W.tileMercatorCoords),A.clippingPlane&&s.uniform4f(A.clippingPlane,...W.clippingPlane),A.transition&&s.uniform1f(A.transition,W.projectionTransition),A.fallbackMatrix&&s.uniformMatrix4fv(A.fallbackMatrix,!1,W.fallbackMatrix);const K=g.getCenter(),R=0;A.elevationGlobe&&s.uniform1f(A.elevationGlobe,R),A.elevationMercator&&s.uniform1f(A.elevationMercator,le.MercatorCoordinate.fromLngLat([0,K.lat],R).z),A.camera&&s.uniform3f(A.camera,...ct(g,le)),A.sun&&s.uniform3f(A.sun,...Q.sun),A.globeness&&s.uniform1f(A.globeness,W.projectionTransition),A.field&&(s.activeTexture(s.TEXTURE0),s.bindTexture(s.TEXTURE_2D,k),s.uniform1i(A.field,0)),A.rangeKm&&s.uniform1f(A.rangeKm,ms),A.shoreKm&&s.uniform1f(A.shoreKm,ws(g.getZoom(),K.lat,Math.max(Q.shoreSoftnessKm,_s(z)))),A.shelfKm&&s.uniform1f(A.shelfKm,Q.shelfKm),A.strength&&s.uniform1f(A.strength,Q.strength),A.roughness&&s.uniform1f(A.roughness,Q.roughness),A.windPatch&&s.uniform1f(A.windPatch,Q.windPatch),A.windScale&&s.uniform1f(A.windScale,Q.windScale),A.water&&s.uniform1f(A.water,Q.water),A.scatter&&s.uniform3f(A.scatter,...Q.scatter),A.bottom&&s.uniform3f(A.bottom,...Q.bottom),A.absorption&&s.uniform3f(A.absorption,...Q.absorption),A.shelfDepthM&&s.uniform1f(A.shelfDepthM,Q.shelfDepthM),A.sky&&s.uniform3f(A.sky,...Q.sky),A.opacity&&s.uniform1f(A.opacity,Q.opacity),A.edgeRemap&&s.uniform1f(A.edgeRemap,Q.edgeRemap),A.fade&&s.uniform1f(A.fade,bs(Pa(g,le),Q)),s.bindBuffer(s.ARRAY_BUFFER,N.pos),s.enableVertexAttribArray(Z.pos),s.vertexAttribPointer(Z.pos,2,s.FLOAT,!1,0,0),s.bindBuffer(s.ARRAY_BUFFER,N.sphere),s.enableVertexAttribArray(Z.sphere),s.vertexAttribPointer(Z.sphere,3,s.FLOAT,!1,0,0),s.disable(s.DEPTH_TEST),s.depthMask(!1),s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,N.index),s.drawElements(s.TRIANGLES,S.indices.length,s.UNSIGNED_SHORT,0),s.enable(s.DEPTH_TEST),s.depthMask(!0)},setOptions(T={}){const I=Q.sources;Q={...Q,...T},T.sources!==void 0&&T.sources!==I&&(Y=!1,s&&D()),g?.triggerRepaint()},getOptions:()=>({...Q}),get hasField(){return Y}}},Es=or,rr=(e,t,r,n=!0)=>{const l=Math.max(1,Math.floor(t)),c=Math.max(1,Math.floor(r)),o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,l,c,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let i=null;return n&&(i=e.createFramebuffer(),e.bindFramebuffer(e.FRAMEBUFFER,i),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0)),{texture:o,framebuffer:i,width:l,height:c}},go=(e,t)=>{t&&(t.texture&&e.deleteTexture(t.texture),t.framebuffer&&e.deleteFramebuffer(t.framebuffer))},Ts=(e,t,r)=>{const n=[];for(let l=1;l<=r;l++){const c=2**l;n.push({width:Math.max(1,Math.floor(e/c)),height:Math.max(1,Math.floor(t/c))})}return n},ks=(e,t,r,n)=>Ts(t,r,n).map(l=>rr(e,l.width,l.height)),As=new Float32Array([-1,-1,1,-1,-1,1,1,1]),Ss=e=>{const t=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,As,e.STATIC_DRAW),t},Ls=`precision highp float;
attribute vec2 a_corner;
varying vec2 v_uv;
void main() {
  v_uv = a_corner * 0.5 + 0.5;
  gl_Position = vec4(a_corner, 0.0, 1.0);
}`,Ms=e=>({framebuffer:e.getParameter(e.FRAMEBUFFER_BINDING),viewport:e.getParameter(e.VIEWPORT)}),yo=(e,t)=>{e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.viewport(t.viewport[0],t.viewport[1],t.viewport[2],t.viewport[3]),e.activeTexture(e.TEXTURE0),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.enable(e.BLEND),e.depthMask(!0)},wa=(e,t,r)=>{e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.viewport(0,0,t.width,t.height),e.useProgram(r)},Pt=(e,t,r)=>{e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4)},Ct=(e,t,r,n)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r),n&&e.uniform1i(n,t)},nr="tm-bloom",bo=5,Rs=[[1.18,.92,.68],[1.12,.95,.78],[1.06,.98,.89],[1.02,1,.97]],Ps=[1,1,1],Cs=()=>`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_scene;
uniform float u_threshold;
uniform float u_knee;

void main() {
  vec3 colour = texture2D(u_scene, v_uv).rgb;
  float brightness = max(colour.r, max(colour.g, colour.b));
  float soft = smoothstep(u_threshold - u_knee, u_threshold + u_knee, brightness);
  float headroom = max(1.0 - u_threshold, 0.02);
  vec3 kept = max(colour - vec3(u_threshold), vec3(0.0)) / headroom;
  gl_FragColor = vec4(kept * soft, 1.0);
}`,Ds=()=>`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_source;
uniform vec2 u_texel;          // one texel of the SOURCE

void main() {
  vec3 a = texture2D(u_source, v_uv + u_texel * vec2(-2.0,  2.0)).rgb;
  vec3 b = texture2D(u_source, v_uv + u_texel * vec2( 0.0,  2.0)).rgb;
  vec3 c = texture2D(u_source, v_uv + u_texel * vec2( 2.0,  2.0)).rgb;
  vec3 d = texture2D(u_source, v_uv + u_texel * vec2(-2.0,  0.0)).rgb;
  vec3 e = texture2D(u_source, v_uv).rgb;
  vec3 f = texture2D(u_source, v_uv + u_texel * vec2( 2.0,  0.0)).rgb;
  vec3 g = texture2D(u_source, v_uv + u_texel * vec2(-2.0, -2.0)).rgb;
  vec3 h = texture2D(u_source, v_uv + u_texel * vec2( 0.0, -2.0)).rgb;
  vec3 i = texture2D(u_source, v_uv + u_texel * vec2( 2.0, -2.0)).rgb;
  vec3 j = texture2D(u_source, v_uv + u_texel * vec2(-1.0,  1.0)).rgb;
  vec3 k = texture2D(u_source, v_uv + u_texel * vec2( 1.0,  1.0)).rgb;
  vec3 l = texture2D(u_source, v_uv + u_texel * vec2(-1.0, -1.0)).rgb;
  vec3 m = texture2D(u_source, v_uv + u_texel * vec2( 1.0, -1.0)).rgb;

  // The inner quad carries half the weight; the outer ring shares the rest.
  vec3 sum = (j + k + l + m) * 0.125
           + (a + c + g + i) * 0.03125
           + (b + d + f + h) * 0.0625
           + e * 0.125;
  gl_FragColor = vec4(sum, 1.0);
}`,Is=()=>`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_source;
uniform vec2 u_texel;          // one texel of the TARGET
uniform float u_radius;
uniform vec3 u_tint;

void main() {
  vec2 o = u_texel * u_radius;
  vec3 sum = texture2D(u_source, v_uv + vec2(-o.x,  o.y)).rgb * 1.0
           + texture2D(u_source, v_uv + vec2( 0.0,  o.y)).rgb * 2.0
           + texture2D(u_source, v_uv + vec2( o.x,  o.y)).rgb * 1.0
           + texture2D(u_source, v_uv + vec2(-o.x,  0.0)).rgb * 2.0
           + texture2D(u_source, v_uv).rgb                    * 4.0
           + texture2D(u_source, v_uv + vec2( o.x,  0.0)).rgb * 2.0
           + texture2D(u_source, v_uv + vec2(-o.x, -o.y)).rgb * 1.0
           + texture2D(u_source, v_uv + vec2( 0.0, -o.y)).rgb * 2.0
           + texture2D(u_source, v_uv + vec2( o.x, -o.y)).rgb * 1.0;
  gl_FragColor = vec4(sum * (1.0 / 16.0) * u_tint, 1.0);
}`,Us=()=>`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_bloom;
uniform float u_strength;

void main() {
  gl_FragColor = vec4(texture2D(u_bloom, v_uv).rgb * u_strength, 0.0);
}`,Fs=()=>`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_scene;
uniform float u_saturation;
uniform float u_hue;          // radians
uniform float u_exposure;
uniform float u_contrast;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

void main() {
  vec4 texel = texture2D(u_scene, v_uv);
  vec3 colour = texel.rgb * u_exposure;

  if (abs(u_hue) > 0.0001) {
    float c = cos(u_hue);
    float s = sin(u_hue);
    // YIQ chroma rotation, folded into a single RGB matrix.
    mat3 rot = mat3(
      0.299 + 0.701 * c + 0.168 * s, 0.587 - 0.587 * c + 0.330 * s, 0.114 - 0.114 * c - 0.497 * s,
      0.299 - 0.299 * c - 0.328 * s, 0.587 + 0.413 * c + 0.035 * s, 0.114 - 0.114 * c + 0.292 * s,
      0.299 - 0.300 * c + 1.250 * s, 0.587 - 0.588 * c - 1.050 * s, 0.114 + 0.886 * c - 0.203 * s);
    colour = clamp(rot * colour, 0.0, 1.0);
  }

  float luma = dot(colour, LUMA);
  colour = mix(vec3(luma), colour, u_saturation);
  // Pivot on mid grey so contrast does not double as a brightness control.
  colour = clamp((colour - 0.5) * u_contrast + 0.5, 0.0, 1.0);

  gl_FragColor = vec4(colour, texel.a);
}`,Os={saturation:1,hue:0,exposure:1,contrast:1},Ns=e=>Math.abs((e?.saturation??1)-1)>.001||Math.abs(e?.hue??0)>.001||Math.abs((e?.exposure??1)-1)>.001||Math.abs((e?.contrast??1)-1)>.001,Bs=({strength:e=.9,threshold:t=.6,knee:r=.12,radius:n=1,chromatic:l=!0,...c}={})=>{let o=null,i=null,a=null,h=null,b=null,L=null,w=null,U={strength:e,threshold:t,knee:r,radius:n,chromatic:l,...Os,...c};const p=()=>{const _=(S,g,s)=>{const z=ze(i,Ls,S,g),N={};return s.forEach(k=>{N[k]=i.getUniformLocation(z,`u_${k}`)}),{program:z,corner:i.getAttribLocation(z,"a_corner"),...N}};return{bright:_(Cs(),"tm-bloom-bright",["scene","threshold","knee"]),down:_(Ds(),"tm-bloom-down",["source","texel"]),up:_(Is(),"tm-bloom-up",["source","texel","radius","tint"]),composite:_(Us(),"tm-bloom-composite",["bloom","strength"]),grade:_(Fs(),"tm-grade",["scene","saturation","hue","exposure","contrast"])}},f=()=>{go(i,b),b=null,L&&L.forEach(_=>go(i,_)),L=null,w=null},x=(_,S)=>{w&&w.width===_&&w.height===S||(f(),b=rr(i,_,S,!1),L=ks(i,_,S,bo),w={width:_,height:S})};return{id:nr,type:"custom",renderingMode:"2d",onAdd(_,S){o=_,i=S,a=Ss(i)},onRemove(){i&&(h&&(Object.values(h).forEach(({program:_})=>i.deleteProgram(_)),h=null),f(),a&&(i.deleteBuffer(a),a=null),o=null,i=null)},render(){const _=Ns(U);if(!a||U.strength<=0&&!_)return;const S=o.getCanvas(),g=Math.max(1,S.width),s=Math.max(1,S.height),z=Ms(i);if(h=h||p(),x(g,s),i.bindTexture(i.TEXTURE_2D,b.texture),i.copyTexImage2D(i.TEXTURE_2D,0,i.RGBA,0,0,g,s,0),i.disable(i.DEPTH_TEST),i.disable(i.BLEND),i.depthMask(!1),_&&(i.bindFramebuffer(i.FRAMEBUFFER,null),i.viewport(0,0,g,s),i.useProgram(h.grade.program),Ct(i,0,b.texture,h.grade.scene),h.grade.saturation&&i.uniform1f(h.grade.saturation,U.saturation),h.grade.hue&&i.uniform1f(h.grade.hue,U.hue),h.grade.exposure&&i.uniform1f(h.grade.exposure,U.exposure),h.grade.contrast&&i.uniform1f(h.grade.contrast,U.contrast),Pt(i,a,h.grade.corner),i.bindTexture(i.TEXTURE_2D,b.texture),i.copyTexImage2D(i.TEXTURE_2D,0,i.RGBA,0,0,g,s,0)),U.strength<=0){yo(i,z);return}wa(i,L[0],h.bright.program),Ct(i,0,b.texture,h.bright.scene),h.bright.threshold&&i.uniform1f(h.bright.threshold,U.threshold),h.bright.knee&&i.uniform1f(h.bright.knee,U.knee),Pt(i,a,h.bright.corner);for(let N=1;N<L.length;N++){const k=L[N-1];wa(i,L[N],h.down.program),Ct(i,0,k.texture,h.down.source),h.down.texel&&i.uniform2f(h.down.texel,1/k.width,1/k.height),Pt(i,a,h.down.corner)}i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE);for(let N=L.length-1;N>0;N--){const k=L[N-1];if(wa(i,k,h.up.program),Ct(i,0,L[N].texture,h.up.source),h.up.texel&&i.uniform2f(h.up.texel,1/k.width,1/k.height),h.up.radius&&i.uniform1f(h.up.radius,U.radius),h.up.tint){const Y=U.chromatic?Rs[L.length-1-N]:Ps;i.uniform3f(h.up.tint,...Y)}Pt(i,a,h.up.corner)}i.bindFramebuffer(i.FRAMEBUFFER,z.framebuffer),i.viewport(z.viewport[0],z.viewport[1],z.viewport[2],z.viewport[3]),i.useProgram(h.composite.program),Ct(i,0,L[0].texture,h.composite.bloom),h.composite.strength&&i.uniform1f(h.composite.strength,U.strength),Pt(i,a,h.composite.corner),yo(i,z)},setOptions(_={}){U={...U,..._},o?.triggerRepaint()},getOptions:()=>({...U}),get levelCount(){return bo}}},Qs=nr,Ca=[{key:"starfield",option:"brightness",label:"Stars",default:.5,max:1},{key:"sun",option:"brightness",label:"Sun",default:1,max:1},{key:"moon",option:"brightness",label:"Moon",default:1,max:1},{key:"daylight",option:"nightDarkness",label:"Day and night",default:.965,max:1},{key:"atmosphere",option:"strength",label:"Atmosphere",default:1,max:1},{key:"clouds",option:"opacity",label:"Clouds",default:1,max:1},{key:"ocean",option:"opacity",label:"Ocean",default:1,max:1},{key:"relief",option:"reliefPower",label:"Relief",default:0,max:2,on:"daylight"}],Ma={key:"reference",default:0},qs="tm-layers-v2",Hs=(e=globalThis.localStorage)=>{const t={};for(const r of Ca)t[r.key]={visible:r.default>0,value:r.default};t[Ma.key]={visible:!1,value:Ma.default};try{const r=JSON.parse(e?.getItem(qs)||"{}");for(const[n,l]of Object.entries(r)){if(!t[n]||!l||typeof l!="object")continue;const c=l.value;t[n]={visible:l.visible===!0,value:typeof c=="number"&&Number.isFinite(c)?c:t[n].value}}}catch{}return t},zs=(e,t)=>{const r=t?.visible?Number(t.value):0;return{[e.option]:Number.isFinite(r)?r:0}},Gs=(e,t)=>{const r=[];for(const n of Ca){const l=e?.[n.on||n.key];!l||typeof l.setOptions!="function"||(l.setOptions(zs(n,t?.[n.key])),r.push(n.key))}return r},$s=(e,{onReference:t=null,target:r=globalThis}={})=>{const n=new Map(Ca.map(l=>[l.key,l]));return r.__tmSetLayer=(l,c)=>{const o=Number.isFinite(Number(c))?Number(c):0;if(l===Ma.key)return t?.(o);const i=n.get(l);if(!i)return;const a=e?.[i.on||i.key];if(!(!a||typeof a.setOptions!="function"))return a.setOptions({[i.option]:o})},()=>{r.__tmSetLayer&&delete r.__tmSetLayer}},Ws="/img/map/clouds-field.webp",js="/img/map/wind-field.png",wo="/img/map/cloud-patches.webp",va=e=>Lr(e).rgb.map(t=>t/255),vo=[["starfield",Ti,e=>Ei(e)],["sun",qi,e=>Oi(e)],["moon",Xi,e=>Yi(e)],["ocean",Es,e=>xs(e)],["daylight",ls,e=>ss(e)],["clouds",Aa,e=>Jn(e)],["atmosphere",fs,e=>ds(e)],["bloom",Qs,e=>Bs(e)]],Ys=(e,t)=>{if(t&&e.getLayer(t))return t;let r;try{r=(e.getStyle()?.layers??[]).find(n=>n.type==="symbol"&&n.layout?.["text-field"]!=null)?.id}catch{}return t&&console.warn(`[globe-layers] "${t}" is not on this map; ${r?`anchoring under "${r}" so the labels stay readable`:"and nothing on it draws text, so the stack goes on top"}`),r},Xs=(e,{date:t=new Date,reduceMotion:r=!1,beforeId:n,permitted:l=null}={})=>{const c=Dt(t),o=!r,i={fieldUrl:Ws,patchUrl:wo,windUrl:js,windAmount:.2,animate:o},a={starfield:{date:t,animate:o},sun:{date:t},moon:{date:t,sun:c},ocean:{sun:c,roughness:.95,strength:.48,windPatch:.6,shoreSoftnessKm:19.5},clouds:{...i,sun:c},daylight:{...i,sun:c,date:t},atmosphere:{sun:c,strength:1.25},bloom:{threshold:.86,strength:.45,knee:.06}},h={},b=Ys(e,n);for(const[p,f,x]of vo){if(e.getLayer(f)&&e.removeLayer(f),l&&!l(p))continue;const _=x(a[p]);e.addLayer(_,b),h[p]=_}Gs(h,Hs());const L=$s(h),w=(p,f)=>h[p]?.setOptions?.(f),U=[window.__tune?.register("Ocean",[{key:"shoreSoftnessKm",label:"Shore falloff",min:0,max:25,step:.25,value:19.5,apply:p=>w("ocean",{shoreSoftnessKm:p})},{key:"roughness",label:"Roughness",min:0,max:1,step:.01,value:.95,apply:p=>w("ocean",{roughness:p})},{key:"strength",label:"Sun glint",min:0,max:1,step:.01,value:.48,apply:p=>w("ocean",{strength:p})},{key:"windPatch",label:"Patchiness",min:0,max:1,step:.01,value:.6,apply:p=>w("ocean",{windPatch:p})},{key:"windScale",label:"Wave scale",min:1,max:60,step:1,value:14,apply:p=>w("ocean",{windScale:p})},{key:"water",label:"Tint depth",min:0,max:2,step:.05,value:1,apply:p=>w("ocean",{water:p})},{key:"scatter",label:"Tint colour",type:"color",value:"#1d5c8f",apply:p=>w("ocean",{scatter:va(p)})},{key:"opacity",label:"Opacity",min:0,max:1,step:.01,value:1,apply:p=>w("ocean",{opacity:p})}],{tab:"Earth"}),window.__tune?.register("Clouds",[{key:"opacity",label:"Density",min:0,max:1,step:.01,value:1,apply:p=>w("clouds",{opacity:p})},{key:"windAmount",label:"Curl",min:0,max:1,step:.05,value:.2,apply:p=>w("clouds",{windAmount:p})},{key:"windScale",label:"Wind scale",min:.01,max:.5,step:.01,value:.06,apply:p=>w("clouds",{windScale:p})},{key:"windRate",label:"Wind speed",min:0,max:.3,step:.005,value:.05,apply:p=>w("clouds",{windRate:p})},{key:"cloudShadow",label:"Shadows",min:0,max:1,step:.01,value:.5,apply:p=>w("daylight",{cloudShadow:p})},{key:"shadowSoftness",label:"Shadow edge",min:0,max:1,step:.01,value:.75,apply:p=>w("daylight",{shadowSoftness:p})},{key:"patchTiles",label:"Cloud cells",min:96,max:320,step:8,value:144,apply:p=>{w("clouds",{patchTiles:p}),w("daylight",{patchTiles:p})}},{key:"patchMean",label:"Atlas mean",min:.2,max:.8,step:.005,value:.4335,apply:p=>{w("clouds",{patchMean:p}),w("daylight",{patchMean:p})}},{key:"patchDetail",label:"Detail amount",min:0,max:1.5,step:.05,value:.75,apply:p=>{w("clouds",{patchDetail:p}),w("daylight",{patchDetail:p})}},{key:"patchUrl",label:"Tiled source",type:"boolean",value:!0,apply:p=>{const f=p?wo:null;w("clouds",{patchUrl:f}),w("daylight",{patchUrl:f})}}],{tab:"Earth"}),window.__tune?.register("Cloud light",[{key:"cloudRelief",label:"Cloud height km",min:0,max:120,step:2,value:90,apply:p=>w("clouds",{cloudRelief:p})},{key:"cloudDepth",label:"Optical depth",min:0,max:12,step:.25,value:4,apply:p=>w("clouds",{cloudDepth:p})},{key:"powder",label:"Powder",min:0,max:1,step:.05,value:1,apply:p=>w("clouds",{powder:p})},{key:"forward",label:"Silver lining",min:0,max:2,step:.05,value:.5,apply:p=>w("clouds",{forward:p})},{key:"forwardG",label:"Lobe sharpness",min:0,max:.95,step:.05,value:.7,apply:p=>w("clouds",{forwardG:p})},{key:"selfShadow",label:"Self shadow",min:0,max:1,step:.02,value:.18,apply:p=>w("clouds",{selfShadow:p})},{key:"selfShadowStep",label:"Shadow reach",min:2e-4,max:.006,step:2e-4,value:.0015,apply:p=>w("clouds",{selfShadowStep:p})}],{tab:"Earth"}),window.__tune?.register("Sky and light",[{key:"nightDarkness",label:"Night",min:0,max:1,step:.005,value:.965,apply:p=>w("daylight",{nightDarkness:p})},{key:"twilightColour",label:"Twilight warm",type:"color",value:"#9e5229",apply:p=>w("daylight",{twilightColour:va(p)})},{key:"twilightCool",label:"Twilight blue",type:"color",value:"#1a2647",apply:p=>w("daylight",{twilightCool:va(p)})},{key:"twilightStrength",label:"Twilight strength",min:0,max:1,step:.05,value:.55,apply:p=>w("daylight",{twilightStrength:p})},{key:"atmosphere",label:"Haze",min:0,max:2,step:.05,value:1.25,apply:p=>w("atmosphere",{strength:p})},{key:"starfield",label:"Stars",min:0,max:1,step:.05,value:.5,apply:p=>w("starfield",{brightness:p})},{key:"sun",label:"Sun",min:0,max:2,step:.05,value:1,apply:p=>w("sun",{brightness:p})},{key:"moon",label:"Moon",min:0,max:2,step:.05,value:1,apply:p=>w("moon",{brightness:p})},{key:"moonGlow",label:"Moon glow",min:0,max:1.5,step:.05,value:.4,apply:p=>w("moon",{glow:p})},{key:"moonGlowExtent",label:"Moon glow reach",min:0,max:4,step:.1,value:1.8,apply:p=>w("moon",{glowExtent:p})}],{tab:"Earth"}),window.__tune?.register("Glare",[{key:"strength",label:"Strength",min:0,max:3,step:.05,value:.45,apply:p=>w("bloom",{strength:p})},{key:"threshold",label:"Threshold",min:0,max:1,step:.01,value:.86,apply:p=>w("bloom",{threshold:p})},{key:"knee",label:"Knee",min:0,max:.5,step:.01,value:.06,apply:p=>w("bloom",{knee:p})},{key:"radius",label:"Radius",min:.2,max:2,step:.05,value:1,apply:p=>w("bloom",{radius:p})},{key:"chromatic",label:"Warm at the edges",type:"boolean",value:!0,apply:p=>w("bloom",{chromatic:p})}],{tab:"Earth"}),window.__tune?.register("Colour grade",[{key:"saturation",label:"Saturation (0 = greyscale)",min:0,max:2,step:.01,value:1,apply:p=>w("bloom",{saturation:p})},{key:"hue",label:"Hue shift",min:-180,max:180,step:1,value:0,unit:"°",apply:p=>w("bloom",{hue:p*Math.PI/180})},{key:"exposure",label:"Exposure",min:.2,max:2.5,step:.01,value:1,apply:p=>w("bloom",{exposure:p})},{key:"contrast",label:"Contrast",min:.5,max:2,step:.01,value:1,apply:p=>w("bloom",{contrast:p})}],{tab:"Earth"})];return{layers:h,setDate(p){const f=p instanceof Date?p:new Date(p);if(Number.isNaN(f.getTime()))return;const x=Dt(f);for(const _ of Object.keys(h))h[_]?.setOptions?.({date:f,sun:x})},remove(){L?.();for(const p of U)p?.();for(const[,p]of vo)e.getLayer(p)&&e.removeLayer(p)}}},_a=111.32,Zt=e=>e<0?0:e>1?1:e,Ks=(e,t,r)=>{if(!(r>0))return Math.min(e,t);const n=Zt(.5+.5*(t-e)/r);return t*(1-n)+e*n-r*n*(1-n)},jt=(e,t)=>{const r=Math.sin(e*127.1+t*311.7)*43758.5453;return r-Math.floor(r)},_o=(e,t)=>{const r=Math.floor(e),n=Math.floor(t),l=e-r,c=t-n,o=l*l*(3-2*l),i=c*c*(3-2*c),a=jt(r,n),h=jt(r+1,n),b=jt(r,n+1),L=jt(r+1,n+1);return(a*(1-o)+h*o)*(1-i)+(b*(1-o)+L*o)*i},Vs=(e,t)=>_o(e,t)*.7+_o(e*2.3,t*2.3)*.3,Zs=(e,t,r,n=.5)=>r*Math.pow(Zt(t>0?e/t:1),n),Js=({width:e,height:t,bbox:r,inside:n,seeds:l,lobeScale:c=6,lobeAmount:o=45,mergeKm:i=120})=>{const[a,h,b,L]=r,w=new Float32Array(e*t),U=b-a,p=L-h;let f=0;const x=(L+h)/2,_=_a*Math.cos(x*Math.PI/180),S=([s,z])=>[(s-a)*_,(L-z)*_a],g=l.map(S);for(let s=0;s<t;s++){const z=L-p*(s+.5)/t,N=(L-z)*_a;for(let k=0;k<e;k++){const Y=s*e+k;if(!n(k,s)){w[Y]=1/0;continue}const Q=(a+U*(k+.5)/e-a)*_;let H=1/0;for(const[D,T]of g){const I=Math.hypot(Q-D,N-T);H=H===1/0?I:Ks(H,I,i)}const G=Vs(k/e*c,s/t*c)-.5,C=Math.max(0,H+G*2*o);w[Y]=C,C>f&&(f=C)}}return{field:w,maxKm:f,spanKm:el(w,f,.995)}},el=(e,t,r)=>{if(!(t>0))return 0;const n=512,l=new Int32Array(n);let c=0;for(let a=0;a<e.length;a++){const h=e[a];Number.isFinite(h)&&(l[Math.min(n-1,Math.floor(h/t*n))]++,c++)}if(!c)return 0;const o=c*r;let i=0;for(let a=0;a<n;a++)if(i+=l[a],i>=o)return(a+1)/n*t;return t},tl=(e,t,{radiusKm:r,body:n,rim:l,rimKm:c,opacity:o,featherKm:i=8})=>{for(let a=0;a<t.length;a++){const h=t[a],b=a*4;if(!(h<=r+i)){e[b+3]=0;continue}const L=i>0?Zt((r+i-h)/i):1,w=c>0?Zt(1-(r-h)/c):0;e[b]=n[0]+(l[0]-n[0])*w,e[b+1]=n[1]+(l[1]-n[1])*w,e[b+2]=n[2]+(l[2]-n[2])*w,e[b+3]=255*o*L*(1+.35*w)}},vt="tm-advance-src",xa="tm-advance",me=256,xo=e=>{const t=String(e).replace("#",""),r=t.length===3?t.split("").map(n=>n+n).join(""):t;return[0,2,4].map(n=>parseInt(r.slice(n,n+2),16)||0)},al=e=>{let t=180,r=90,n=-180,l=-90;const c=o=>{if(typeof o[0]=="number"){const[i,a]=o;i<t&&(t=i),i>n&&(n=i),a<r&&(r=a),a>l&&(l=a);return}o.forEach(c)};return c(e.coordinates),[t,r,n,l]},ol=e=>e.type==="Polygon"?[e.coordinates]:e.type==="MultiPolygon"?e.coordinates:[],rl=(e,{beforeId:t,colour:r="#b31217",rimColour:n="#4a0505",opacity:l=.85,seconds:c=4,curve:o=.5,lobeScale:i=6,lobeAmount:a=45,mergeKm:h=120,rimKm:b=40,featherKm:L=10}={})=>{let w={colour:r,rimColour:n,opacity:l,seconds:c,curve:o,lobeScale:i,lobeAmount:a,mergeKm:h,rimKm:b,featherKm:L},U=null,p=null,f=null,x=null,_=null,S=null,g=!0;const s=()=>{U||(U=document.createElement("canvas"),U.width=me,U.height=me,p=U.getContext("2d",{willReadFrequently:!0}),f=p.createImageData(me,me))},z=(H,G)=>{const[C,D,T,I]=G,y=new Uint8Array(me*me),W=document.createElement("canvas");W.width=me,W.height=me;const B=W.getContext("2d",{willReadFrequently:!0}),Z=R=>(R-C)/(T-C)*me,A=R=>(I-R)/(I-D)*me;B.fillStyle="#fff";for(const R of ol(H))B.beginPath(),R.forEach($=>{$.forEach(([J,X],F)=>F?B.lineTo(Z(J),A(X)):B.moveTo(Z(J),A(X))),B.closePath()}),B.fill("evenodd");const K=B.getImageData(0,0,me,me).data;for(let R=0;R<y.length;R++)y[R]=K[R*4+3]>40?1:0;return y},N=(H,G)=>{if(!H||!G?.length)return!1;s();const C=al(H),D=z(H,C),{field:T,maxKm:I,spanKm:y}=Js({width:me,height:me,bbox:C,inside:(R,$)=>D[$*me+R]===1,seeds:G,lobeScale:w.lobeScale,lobeAmount:w.lobeAmount,mergeKm:w.mergeKm});x={field:T,maxKm:I,spanKm:y,bbox:C};const[W,B,Z,A]=C,K=[[W,A],[Z,A],[Z,B],[W,B]];return e.getSource(vt)?e.getSource(vt).setCoordinates(K):(e.addSource(vt,{type:"canvas",canvas:U,coordinates:K,animate:!0}),e.addLayer({id:xa,type:"raster",source:vt,paint:{"raster-opacity":1,"raster-fade-duration":0,"raster-resampling":"linear"}},t&&e.getLayer(t)?t:void 0)),!0},k=H=>{x&&(tl(f.data,x.field,{radiusKm:H,body:xo(w.colour),rim:xo(w.rimColour),rimKm:w.rimKm,opacity:w.opacity,featherKm:w.featherKm}),p.putImageData(f,0,0))},Y=()=>{_&&cancelAnimationFrame(_),_=null},m=()=>{if(!x)return!1;Y(),S=performance.now();const H=G=>{const C=(G-S)/1e3;k(Zs(C,w.seconds,x.spanKm,w.curve)),C<w.seconds?_=requestAnimationFrame(H):(_=null,k(x.maxKm),g||Q())};return _=requestAnimationFrame(H),!0},Q=()=>{Y(),p&&p.clearRect(0,0,me,me)};return{prepare:N,play:m,clear:Q,setOptions(H={}){const G=["lobeScale","lobeAmount","mergeKm"].some(C=>H[C]!==void 0&&H[C]!==w[C]);return w={...w,...H},G?"needs-rebuild":(x&&!_&&k(x.maxKm),"ok")},get maxKm(){return x?x.maxKm:0},get painted(){if(!f)return 0;let H=0;for(let G=3;G<f.data.length;G+=4)f.data[G]>8&&H++;return H},get running(){return _!==null},set holdAtEnd(H){g=!!H},remove(){Y(),e.getLayer(xa)&&e.removeLayer(xa),e.getSource(vt)&&e.removeSource(vt),x=null}}},Eo=[{key:"cardWidth",property:"--card-width",label:"Width",min:240,max:420,step:1},{key:"cardBodyHeight",property:"--card-body-height",label:"Body height",min:120,max:520,step:4},{key:"cardFadeHeight",property:"--card-fade-height",label:"Fade height",min:0,max:160,step:2}],nl=(e,t=document.documentElement)=>{const r=getComputedStyle(t).getPropertyValue(e).trim(),n=parseFloat(r);return Number.isFinite(n)?r.endsWith("rem")?n*parseFloat(getComputedStyle(document.documentElement).fontSize||"16"):n:null},il=(e=globalThis)=>{if(!e.__tune?.register)return()=>{};const t=document.documentElement,r=Eo.map(l=>({key:l.key,label:l.label,min:l.min,max:l.max,step:l.step,value:nl(l.property)??l.min,apply:c=>t.style.setProperty(l.property,`${Number(c)}px`)})),n=e.__tune.register("Information card",r,{tab:"Map"});return()=>{n?.();for(const l of Eo)t.style.removeProperty(l.property)}},sl=Cn.families.flatMap(e=>e.qids.flatMap(t=>[t,e.color])),Ea=new Map(Rn.overrides.filter(e=>e.name).map(e=>[`${e.qid}|${e.name}`,e.use]));window.initTimeMap=function(t,r,n){const l={year:n,ready:!1,selectedRegion:null},c=()=>{window.__portal={ready:l.ready,year:l.year,selectedRegion:l.selectedRegion}};c();const o=new le.Map({container:t,locale:_r(),zoomLevelsToOverscale:void 0,style:{version:8,projection:{type:"globe"},sky:{"atmosphere-blend":["interpolate",["linear"],["zoom"],2,.5,4,.35,6,.12,7,.04],"sky-color":"#0a1230","sky-horizon-blend":.5,"horizon-color":"#1a2c5a","horizon-fog-blend":.5,"fog-color":"#dcc9a0","fog-ground-blend":.7},glyphs:`${location.origin}/fonts/{fontstack}/{range}.pbf`,sources:{land:{type:"vector",tiles:[`${location.origin}/land-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},graticule:{type:"geojson",data:`${location.origin}/timemap/graticule.geojson`},dem:vr,satellite:wr,"satellite-detail":br,coast:{type:"vector",tiles:[`${location.origin}/coast-echo-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},rivers:{type:"vector",tiles:[`${location.origin}/river-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},lakes:{type:"vector",tiles:[`${location.origin}/lake-tiles/{z}/{x}/{y}.pbf`],maxzoom:6},"ink-borders":{type:"vector",tiles:[`${location.origin}/ink-border-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},coastline:{type:"geojson",data:`${location.origin}/timemap/coastline.geojson`},cliopatria:{type:"vector",tiles:[`${location.origin}/cliopatria-tiles/{z}/{x}/{y}.pbf`],maxzoom:4,promoteId:{boundaries:"Wikidata"}},"hand-territories":{type:"geojson",data:bn(),promoteId:"id"},"boundaries-smooth":{type:"geojson",data:{type:"FeatureCollection",features:[]}},"boundaries-glow-src":{type:"geojson",data:{type:"FeatureCollection",features:[]}},"boundaries-cursor-name":{type:"geojson",data:{type:"FeatureCollection",features:[]}},...Er()},layers:[{id:"water",type:"background",paint:{"background-color":ee.water}},...yr({visible:!1}),{id:"graticule",type:"line",source:"graticule",layout:{visibility:"none","line-cap":"round","line-join":"round"},paint:{"line-color":"#8a9aa0","line-width":.6,"line-opacity":.5}},{id:"coast-echo",type:"line",source:"coast","source-layer":"coast",layout:{visibility:"none","line-cap":"round"},paint:{"line-color":"#6b563d","line-width":.6}},{id:"coast-shadow",type:"line",source:"coastline",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#574631","line-width":2.6,"line-translate":[0,2],"line-blur":.4}},{id:"land",type:"fill",source:"land","source-layer":"land",paint:{"fill-color":ee.land}},{id:"hillshade",type:"hillshade",source:"dem",layout:{visibility:"none"},paint:{"hillshade-exaggeration":.45,"hillshade-illumination-direction":55,"hillshade-shadow-color":"#4a3a28","hillshade-highlight-color":"#fbf2d8","hillshade-accent-color":"#6b563d"}},{id:"lake-shadow",type:"line",source:"lakes","source-layer":"lakes",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#574631","line-width":2,"line-translate":[0,1.6],"line-blur":.4}},{id:"lakes",type:"fill",source:"lakes","source-layer":"lakes",paint:{"fill-color":ee.water}},{id:"lake-line",type:"line",source:"lakes","source-layer":"lakes",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#3a2c1a","line-width":.7,"line-opacity":.8}},{id:"coast-bold",type:"line",source:"coastline",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#2f2418","line-width":1.1}},...xr(["Cinzel"])]},center:[8.23,20],zoom:1.9,pitch:45,maxPitch:70,maxZoom:7,attributionControl:!1});o.addControl(new le.AttributionControl({compact:!0,customAttribution:["Borders © Cliopatria / Seshat (CC-BY 4.0)","Land © OpenStreetMap (CC0)","Cloud: NASA EOSDIS GIBS (MODIS)"]}),"bottom-left");let i=!1;const a=t.querySelector(".maplibregl-ctrl-attrib"),h=()=>{i||(a?.classList.remove("maplibregl-compact-show"),a?.removeAttribute("open"))};h(),o.on("resize",h),a?.addEventListener("click",()=>{i=!0}),window.__tmMap=o,t.style.background="radial-gradient(ellipse 90% 90% at 50% 48%, #14224a 0%, #070c1e 55%, #02030a 100%)",new ResizeObserver(()=>o.resize()).observe(t);let L=!0,w=!1;const U=()=>{if(!L||w)return;const u=document.querySelector("[data-timemap-deck]");if(!u)return;const E=t.getBoundingClientRect(),v=u.getBoundingClientRect(),P=Math.max(0,Math.min(E.bottom-v.top,E.height/3));Math.abs(parseFloat(t.style.top||"0")+P)<1||(t.style.top=`-${P}px`,t.style.height=`calc(100% + ${P}px)`,o.resize())},p=(u=0)=>{const E=document.querySelector("[data-timemap-deck]");if(!E){u<30&&setTimeout(()=>p(u+1),100);return}U(),new ResizeObserver(U).observe(E)};p();const f=ee.palette,x=["case",["boolean",["feature-state","selected"],!1],ee.selected,["match",["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q0"],1]],f.length],...f.flatMap((u,E)=>[E,u]),f[0]]],_=["case",["boolean",["feature-state","selected"],!1],ee.fillOpacity.selected,ee.fillOpacity.normal],S="#f59e0b",g=[[0,3],[4,7],[8,12]],s=(u=1)=>["interpolate",["linear"],["zoom"],...g.flatMap(([E,v])=>[E,v*u])],z=s(1),N=(u,E)=>["match",["get","confidence"],"low",u,E],k={opacityLow:.42,opacityMedium:.7,blurLow:3.2,blurMedium:1.4,width:1,dash:2},Y=()=>N(k.opacityLow,k.opacityMedium),m=()=>N(k.blurLow,k.blurMedium),Q=()=>[k.dash,k.dash*1.25],H=()=>["interpolate",["linear"],["zoom"],...[[0,.8],[4,1.4],[8,2.2]].flatMap(([u,E])=>[u,E*k.width])],G=u=>["all",["==",["get","Type"],"POLITY"],["!=",["slice",["get","Name"],0,1],"("],["<=",["to-number",["get","FromYear"]],u],[">=",["to-number",["get","ToYear"]],u]],C=30,D=u=>["min",["max",0,["min",1,["/",["-",u,["to-number",["get","FromYear"]]],C]]],["max",0,["min",1,["/",["-",["to-number",["get","ToYear"]],u],C]]]];let T=_,I=1,y=.55;try{const u=parseFloat(localStorage.getItem("tm-color-strength"));Number.isFinite(u)&&(y=Math.min(1,Math.max(0,u)))}catch{}const W=u=>Math.min(.92,Math.max(.06,u*(.45+1.1*y))),B={normal:{opacity:null},hover:{colour:null,opacity:null},active:{colour:null,opacity:null}};let Z=!0;const A={normal:{colour:null,width:null,opacity:null,blur:null},hover:{colour:null,width:null,opacity:null,blur:null},active:{colour:null,width:null,opacity:null,blur:null}},K=(u,E)=>{const v=A.normal[u]??E,P=A.hover[u]??v,q=A.active[u]??P;return P===v&&q===v?v:["case",["boolean",["feature-state","selected"],!1],q,["boolean",["feature-state","hover"],!1],P,v]},R=["boundaries-line","boundaries-smooth"],$=()=>{const u=Ue[Ke]||{};for(const[E,v,P]of[["colour","line-color",u.line?.color??ee.line.color],["width","line-width",u.line?.width??ee.line.width],["blur","line-blur",u.line?.blur??0]]){const q=K(E,P);for(const O of R)J[`${O}.${v}`]=q,X(O,v,q)}},J={},X=(u,E,v)=>{const P=J[`${u}.${E}`];if(o.getLayer(u))try{o.setPaintProperty(u,E,P!==void 0?P:v)}catch{}},F=()=>{const u=Ue[Ke]||{},E=u.palette||f,v=["match",["coalesce",["get","Wikidata"],"Q0"],...sl,["match",["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q0"],1]],E.length],...E.flatMap((P,q)=>[q,P]),E[0]]];return["case",["boolean",["feature-state","selected"],!1],B.active.colour??u.selected??ee.selected,["boolean",["feature-state","hover"],!1],B.hover.colour??u.hover??ee.hover,Z?v:$e]},ue=()=>{const u=Ue[Ke]||{},E=W(u.fillOpacity!=null?u.fillOpacity:ee.fillOpacity.normal);T=["case",["boolean",["feature-state","selected"],!1],B.active.opacity??Math.max(.85,E),["boolean",["feature-state","hover"],!1],B.hover.opacity??Math.max(.6,E+.18),B.normal.opacity??E]},ce=["boundaries-fill","hand-fill"],ve=()=>{if(!o.getLayer("boundaries-fill"))return;const u=F();for(const E of ce)if(o.getLayer(E))try{o.setPaintProperty(E,"fill-color",u)}catch{}ue(),De(l.year)};window.__tmSetColorStrength=u=>{y=Math.min(1,Math.max(0,Number(u)||0));try{localStorage.setItem("tm-color-strength",String(y))}catch{}ue(),De(l.year)};const Ee=u=>["*",T,D(u)],Oe=u=>["*",I,D(u)];let Je=!1;const De=u=>{if(o.getLayer("boundaries-fill")){for(const E of ce)o.getLayer(E)&&o.setPaintProperty(E,"fill-opacity",Je?Ee(u):T);o.getLayer("boundaries-line")&&o.setPaintProperty("boundaries-line","line-opacity",Je?Oe(u):I),o.getLayer("hand-line")&&o.setPaintProperty("hand-line","line-opacity",Je?["*",Y(),D(u)]:Y())}},xt=u=>["all",["<=",["to-number",["get","FromYear"]],u],[">=",["to-number",["get","ToYear"]],u]],et=u=>["all",["<=",["coalesce",["to-number",["get","start_decdate"]],-1e6],u],[">",["coalesce",["to-number",["get","end_decdate"]],1e6],u]],It=u=>{if(ra?.setDate(na(u)),!o.getLayer("boundaries-fill"))return;o.setFilter("boundaries-fill",G(u)),o.setFilter("boundaries-line",G(u));for(const v of["hand-fill","hand-line"])o.getLayer(v)&&o.setFilter(v,G(u));kt(),De(u),o.setFilter("markers-dot",et(u)),o.setFilter("markers-label",et(u)),Sr(o,u),_e&&_e.setYear(u);const E=Ue[Ke]&&Ue[Ke].borderSource?xt(u):G(u);for(let v=0;v<6;v++)o.getLayer(`ink-${v}`)&&o.setFilter(`ink-${v}`,E);tt()},oa=u=>{let E=0,v=0,P=0;for(let q=0,O=u.length-1;q<u.length;O=q++){const[j,te]=u[O],[re,V]=u[q],Qe=j*V-re*te;E+=Qe,v+=(j+re)*Qe,P+=(te+V)*Qe}return E===0?{area:0,c:u[0]}:{area:Math.abs(E/2),c:[v/(3*E),P/(3*E)]}},Ut=new Set,ht=new Set,Et=u=>ht.has(u)||o.hasImage(`flag-${u}`)?Promise.resolve(!1):(ht.add(u),o.loadImage(`/flags/${u}.png`).then(E=>(o.hasImage(`flag-${u}`)||o.addImage(`flag-${u}`,E.data),!0)).catch(()=>!1)),Ft={Q217196:[-3.7,40.4]};let Ge=new Map;const Tt=()=>{const u=o.getSource("labels");u&&u.setData({type:"FeatureCollection",features:[...Ge.entries()].map(([E,v])=>({type:"Feature",geometry:{type:"Point",coordinates:Ft[E]||v.c},properties:{name:v.name,flag:o.hasImage(`flag-${E}`)?`flag-${E}`:"",sel:String(ne)===E,hov:v.name===Be}}))})},ke=()=>{if(!o.getSource("labels")||!o.getLayer("boundaries-fill"))return;const E=new Map,v=ce.filter(O=>o.getLayer(O));for(const O of o.queryRenderedFeatures({layers:v})){const j=O.properties.Name;if(j==null)continue;const te=String(O.properties.Wikidata),re=O.geometry,V=re.type==="Polygon"?[re.coordinates]:re.type==="MultiPolygon"?re.coordinates:[];for(const Qe of V){const{area:de,c:sa}=oa(Qe[0]),bt=E.get(te);(!bt||de>bt.area)&&E.set(te,{area:de,c:sa,name:j})}}qt(),Ge=E;const P=Tt;P();const q=[...E.keys()].filter(O=>Ut.has(O)&&!o.hasImage(`flag-${O}`)&&!ht.has(O));q.length&&Promise.all(q.map(Et)).then(O=>{O.some(Boolean)&&P()})};fetch("/flags/manifest.json").then(u=>u.ok?u.json():[]).then(u=>{u.forEach(E=>Ut.add(String(E))),o.getLayer("boundaries-fill")&&ke()}).catch(()=>{}),window.__polityCache=window.__polityCache||{},fetch("/timemap/articles.json").then(u=>u.ok?u.json():{}).then(u=>Object.assign(window.__polityCache,u)).catch(()=>{});const Ot=()=>ke();let Nt=null;const tt=()=>{clearTimeout(Nt),Nt=setTimeout(Ot,250)};let pe=null,at=null;const Bt="boundaries-smooth",Qt={type:"FeatureCollection",features:[]};let Ne=0,ge=null,$e="#5b7fa8";const ot=()=>{const u=o.getSource(Bt);if(!u)return;if(Ne<1){u.setData(Qt);return}const E=[],v=new Set;for(const P of o.queryRenderedFeatures({layers:["boundaries-fill"]})){const q=`${P.id}|${P.geometry?.coordinates?.[0]?.[0]?.[0]??""}`;if(!v.has(q)){v.add(q);for(const O of ca(P.geometry))O.length<4||E.push({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:ja(O,Ne)}})}}u.setData({type:"FeatureCollection",features:E})},We=u=>{Ne=Math.round(u);const E=Ne>=1;for(const[v,P]of[["boundaries-line",!E],["boundaries-smooth",E]])if(o.getLayer(v))try{o.setLayoutProperty(v,"visibility",P?"visible":"none")}catch{}ot()},kt=()=>{ge&&clearTimeout(ge),ge=setTimeout(()=>{ge=null,ot()},120)};let ne=null,Re=null,At=null,ut=null,dt=!1;const ft=()=>{ne!==null&&(Xe(ne,!1,dt),ne=null,dt=!1)};let _e=null,rt=12,St=1.35,xe=180,Be=null,je=1,M=null,ae=null;const ie=()=>{if(!o.getLayer("boundaries-label"))return;const u=rt*je,E=Be&&je!==1?["case",["==",["get","name"],Be],u,rt]:rt;try{o.setLayoutProperty("boundaries-label","text-size",E)}catch{}},Ie=u=>{if(u===Be)return;const E=je,v=u?St:1;Be=u||Be;const P=u;Tt(),M&&cancelAnimationFrame(M),ae&&clearTimeout(ae);const q=performance.now(),O=()=>{je=v,Be=P,ie(),P||Tt()},j=te=>{const re=xe>0?Math.min(1,(te-q)/xe):1;if(je=E+(v-E)*Ta.easeInOutQuad(re),ie(),re<1){M=requestAnimationFrame(j);return}M=null,O()};M=requestAnimationFrame(j),ae=setTimeout(()=>{ae=null,M&&(cancelAnimationFrame(M),M=null),O()},xe+40)},Ye="boundaries-cursor-name";let Ae=null,Te=!1;const qt=()=>{if(o.getLayer("boundaries-label"))try{o.setLayoutProperty("boundaries-label","visibility",Te?"visible":"none")}catch{}},mt=u=>o.queryRenderedFeatures({layers:["boundaries-label"]}).some(E=>E.properties?.name===u),nt=(u,E)=>{const v=o.getSource(Ye);if(!v)return;const P=typeof u=="string"&&u.trim()!==""?u:null;if(Ae=P,!P||!E){v.setData(Qt);return}const q=((E.lng+180)%360+360)%360-180;v.setData({type:"FeatureCollection",features:[{type:"Feature",properties:{name:P},geometry:{type:"Point",coordinates:[q,E.lat]}}]})},Lt=(u,E=null,v=null)=>{const P=o.getSource("boundaries-glow-src");if(!P)return;const O=(u?ca(u):[]).flatMap(j=>Wa(j)).filter(j=>j.length>=4).map(j=>({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:Ne>=1?ja(j,Ne):j}}));P.setData({type:"FeatureCollection",features:O}),Ie(E)},Xe=(u,E,v=!1)=>o.setFeatureState(v?{source:"hand-territories",id:u}:{source:"cliopatria",sourceLayer:"boundaries",id:u},{selected:E}),pt=ee.palette,gt=["#39496a","#4a3b63","#37614f","#63503b","#4c6140","#63415a","#3a5570","#56426a","#3f6657","#665445","#414f6e","#5c4258"],sr="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>",Ht=(u,E)=>["interpolate",["linear"],["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q7"],1]],89],0,u,88,E],Ue={"soft-atlas":{palette:pt,water:"#c7d4c6",shore:{color:"#5b4a36",width:.7,shadow:"#9fb0b4",shadowWidth:1.8,dy:1.6},land:"#efe6d0",fillOpacity:.55,selected:"#f5c518",hover:"#ecd9a0",line:{color:"#6b5640",width:.8,blur:.3},grid:{color:"#93a18f",opacity:.5,width:.5},hillshade:!0,text:{color:"#3b3326",halo:"#f3ead6"},voyage:"#1f5f8f",paper:.08,vignette:"rgba(80,55,30,0.14)"},antique:{palette:pt,water:"#dcdcba",shore:{color:"#43301c",width:1,shadow:"#8f7d5c",shadowWidth:2.5,dy:2},land:"#e8d6ac",fillOpacity:.3,selected:"#e0a200",hover:"#d9c089",line:{color:"#4a3420",width:1.7,blur:.25},coast:{color:"#6a5238",opacity:.5,width:.85},river:{color:"#8a9aa0",opacity:.6,width:.7},mountains:!0,forest:!0,hillshade:!0,grid:{color:"#9b9277",opacity:.55,width:.55},text:{color:"#3a2c1a",halo:"#ecdcb8"},voyage:"#274f66",paper:.2,vignette:"rgba(80,55,30,0.3)"},"pen-ink":{palette:pt,water:"#dedec0",land:"#e6d6ad",fillOpacity:.16,selected:"#c98a00",hover:"#d9c089",shore:{color:"#2f2418",width:1.15,shadow:"#574631",shadowWidth:2.9,dy:2},line:{color:"#3a2c1c",width:Ht(.4,1.2),blur:.25},borderSource:{source:"ink-borders",sourceLayer:"ink"},coast:{color:"#5e4a34",opacity:.55,width:.85},river:{color:"#6a7c74",opacity:.55,width:.6},grid:{color:"#8f8c6e",opacity:.45,width:.5},hillshade:!0,mountains:!0,forest:!0,inkLayers:[{color:"#5a4630",width:Ht(1.2,2.4),opacity:.1,blur:1.4},{color:"#4a3826",width:Ht(.7,1.5),opacity:.18,blur:.6,offset:.4},{color:"#33261a",width:Ht(.4,1.2),opacity:.8,blur:.2},{color:"#2a1f12",width:.6,opacity:.32,blur:.1,offset:.4,dash:[3,3],above:!0}],text:{color:"#33271a",halo:"#efe2c4"},voyage:"#2f4e66",paper:.22,vignette:"rgba(80,55,30,0.3)"},satellite:{palette:gt,imagery:!0,water:"#08131f",land:"#26331d",fillOpacity:.22,selected:"#f5c518",hover:"#e8cf94",shore:{color:"#f6efdc",width:.6,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:"#ffd9a0",width:.9,blur:.2},text:{color:"#241a10",halo:"#f2e9d4"},voyage:"#ffce6b",paper:0,vignette:"rgba(0,0,0,0.4)"},earth:{palette:gt,imagery:!0,globe:!0,water:He.water,land:He.land,fillOpacity:.22,selected:He.selected,hover:He.hover,shore:{color:He.coast,width:.6,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:He.line,width:.9,blur:.2},text:{color:He.text,halo:He.halo},voyage:He.voyage,paper:0,vignette:"rgba(0,0,0,0.4)"},night:{palette:gt,water:"#0f1420",shore:{color:"#8a99b8",width:.7,shadow:"#070b12",shadowWidth:2,dy:1.6},land:"#1b2230",fillOpacity:.6,selected:"#f5c518",hover:"#5a6b8c",line:{color:"#8a99b8",width:.6,blur:.2},text:{color:"#e6ecf7",halo:"#10151f"},voyage:"#8fc3ef",paper:0,vignette:"rgba(0,0,0,0.45)"}},lr=u=>{const E=t.parentElement;if(!E)return;let v=E.querySelector("#tm-paper");v||(v=document.createElement("div"),v.id="tm-paper",v.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:5;mix-blend-mode:multiply",v.style.backgroundImage=`url("${sr}")`,E.appendChild(v)),v.style.opacity=String(u.paper);let P=E.querySelector("#tm-vignette");P||(P=document.createElement("div"),P.id="tm-vignette",P.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:6",E.appendChild(P)),P.style.background=`radial-gradient(ellipse 78% 78% at center, rgba(0,0,0,0) 52%, ${u.vignette} 100%)`},Da=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;let yt=null,zt=null,Ia=0;const Ua=()=>{yt=requestAnimationFrame(Ua);const u=performance.now();if(u-Ia<55||(Ia=u,!zt||!o.getLayer("coast-echo")))return;const E=u/1e3,v=zt.opacity,P=q=>{const O=v*Math.pow(.7,q);return Math.max(.05,O*(.74+.26*Math.sin(E*.9-q*.9)))};o.setPaintProperty("coast-echo","line-opacity",["interpolate",["linear"],["to-number",["get","echo"]],0,P(0),1,P(1),2,P(2),3,P(3)])},cr=u=>{zt=u,!Da&&!yt&&(yt=requestAnimationFrame(Ua))},hr=()=>{zt=null,yt&&(cancelAnimationFrame(yt),yt=null)};let ra=null;const na=u=>new Date(Date.UTC(Number.isFinite(u)?u:2e3,5,21,12)),ur=()=>{try{const{lng:u,lat:E}=o.getCenter(),v=Fe(u,E,0),P=Dt(na(l.year)),q=v[0]*P[0]+v[1]*P[1]+v[2]*P[2];return Math.max(0,Math.min(1,q*.5+.5))}catch{return 1}},dr=()=>{if(!window.__tune)return;const u=(d,oe,he)=>{if(o.getLayer(d))try{o.setPaintProperty(d,oe,he)}catch{}},E=["boundaries-label","markers-label"],v=[["Cinzel","Cinzel (map serif)"],["Eagle Lake","Eagle Lake (calligraphy)"],["inter","Inter (plain)"]],P=(d,oe)=>{for(const he of E)if(o.getLayer(he))try{o.setLayoutProperty(he,d,oe)}catch{}},q=(d,oe)=>{for(const he of E)u(he,d,oe)},O={startLng:0,startLat:20,startZoom:.4,endLng:8.23,endLat:46.8,endZoom:4,seconds:3.5},j=()=>(_e||console.warn("[tune] no fleet on this map yet"),_e),te={colour:S,strength:.55,width:1,blur:6},re=()=>{u("boundaries-glow","line-color",te.colour),u("boundaries-glow","line-opacity",te.strength),u("boundaries-glow","line-width",s(te.width)),u("boundaries-glow","line-blur",te.blur)},V={"Poland 1939":{year:1939,match:/^(second )?poland|polish republic/i,camera:{center:[19.4,52.1],zoom:4.4},seeds:[[15,52.3],[20.5,54],[19.6,49.4]]}},Qe=12;let de=null,sa="Poland 1939";const bt=d=>d.geometry.type==="Polygon"?[d.geometry.coordinates]:d.geometry.type==="MultiPolygon"?d.geometry.coordinates:[],mr=d=>{const oe=o.queryRenderedFeatures({layers:["boundaries-fill"]});if(!oe.length)return null;const he=we=>{const st=we.flatMap(bt);return st.length?{type:"MultiPolygon",coordinates:st}:null},be=ne!=null?oe.filter(we=>we.id===ne):[];if(be.length)return{geometry:he(be),from:"selected",label:be[0]?.properties?.Name};const Se=d?oe.filter(we=>d.test(String(we.properties?.Name??""))):[];if(Se.length)return{geometry:he(Se),from:"preset",label:Se[0]?.properties?.Name};const Pe=new Map;for(const we of oe){const st=we.id??we.properties?.Name;Pe.set(st,[...Pe.get(st)??[],we])}const it=[...Pe.values()].sort((we,st)=>st.flatMap(bt).length-we.flatMap(bt).length)[0],qe=it?he(it):null;return qe?{geometry:qe,from:"largest",label:it[0]?.properties?.Name}:null},pr=d=>{let oe=180,he=-180,be=90,Se=-90;for(const it of d.coordinates)for(const[qe,we]of it[0]??[])qe<oe&&(oe=qe),qe>he&&(he=qe),we<be&&(be=we),we>Se&&(Se=we);const Pe=(he-oe)*.12;return[[oe+Pe,be+(Se-be)*.25],[oe+Pe,(be+Se)/2],[oe+Pe,be+(Se-be)*.75]]},$t=()=>({colour:Oa,rimColour:Na,opacity:Ba,seconds:Qa,curve:qa,lobeScale:Ha,lobeAmount:za,mergeKm:Ga,rimKm:$a}),Fa=()=>{const d=V[sa];if(!d)return;ne==null&&(window.__setTimemapYear(d.year),d.camera&&o.jumpTo(d.camera));let oe=0;const he=()=>{const be=mr(d.match);if(!be){if(++oe<Qe){setTimeout(he,400);return}console.warn(`[tune] nothing on screen to advance across at ${d.year}`);return}const{geometry:Se,from:Pe,label:it}=be,qe=Pe==="preset"?d.seeds:pr(Se);Pe!=="preset"&&console.info(`[tune] advancing across ${it} (${Pe})`),de?de.setOptions($t()):(de=rl(o,{beforeId:"boundaries-label",...$t()}),window.__tmAdvance=de),de.prepare(Se,qe)&&de.play()};setTimeout(he,400)};let Oa="#b31217",Na="#4a0505",Ba=.85,Qa=4,qa=.5,Ha=6,za=45,Ga=120,$a=40;const la=()=>{de&&(de.setOptions($t()),Fa())},wt=()=>{de&&de.setOptions($t())};window.__tune.register("Territory · resting",[{key:"usePalette",label:"Per-country colours",type:"boolean",value:!0,apply:d=>{Z=d,ve()}},{key:"restColour",label:"Colour",type:"color",value:"#5b7fa8",apply:d=>{$e=d,ve()}},{key:"restOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:d=>{B.normal.opacity=d>0?d:null,ve()}},{key:"restBorderColour",label:"Border",type:"color",value:"#8a99b8",apply:d=>{A.normal.colour=d,$()}},{key:"restBorderWidth",label:"Border width",min:0,max:8,step:.1,value:1,apply:d=>{A.normal.width=d,$()}},{key:"restBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:d=>{A.normal.blur=d,$()}}],{tab:"Map"}),window.__tune.register("Territory · hover",[{key:"hoverColour",label:"Colour",type:"color",value:ee.hover,apply:d=>{B.hover.colour=d,ve()}},{key:"hoverOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:d=>{B.hover.opacity=d>0?d:null,ve()}},{key:"hoverBorderColour",label:"Border",type:"color",value:"#ecd9a0",apply:d=>{A.hover.colour=d,$()}},{key:"hoverBorderWidth",label:"Border width",min:0,max:8,step:.1,value:2,apply:d=>{A.hover.width=d,$()}},{key:"hoverBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:d=>{A.hover.blur=d,$()}}],{tab:"Map"}),window.__tune.register("Territory · active",[{key:"activeColour",label:"Colour",type:"color",value:ee.selected,apply:d=>{B.active.colour=d,ve()}},{key:"activeOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:d=>{B.active.opacity=d>0?d:null,ve()}},{key:"activeBorderColour",label:"Border",type:"color",value:"#f5c518",apply:d=>{A.active.colour=d,$()}},{key:"activeBorderWidth",label:"Border width",min:0,max:8,step:.1,value:2,apply:d=>{A.active.width=d,$()}},{key:"activeBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:d=>{A.active.blur=d,$()}}],{tab:"Map"}),window.__tune.register("Voyages",[{key:"voyageColour",label:"Route",type:"color",value:"#20618f",apply:d=>X("voyage-line","line-color",d)},{key:"voyageWidth",label:"Route width",min:.2,max:8,step:.1,value:1.7,apply:d=>X("voyage-line","line-width",d)},{key:"voyageOpacity",label:"Route opacity",min:0,max:1,step:.05,value:.85,apply:d=>X("voyage-line","line-opacity",d)},{key:"voyageBlur",label:"Route softness",min:0,max:4,step:.1,value:0,apply:d=>X("voyage-line","line-blur",d)},{key:"voyageLabelColour",label:"Name",type:"color",value:"#20618f",apply:d=>X("voyage-label","text-color",d)},{key:"voyageLabelHalo",label:"Name halo",type:"color",value:"#f3ead6",apply:d=>X("voyage-label","text-halo-color",d)},{key:"voyageLabelHaloWidth",label:"Name halo width",min:0,max:4,step:.1,value:1.2,apply:d=>X("voyage-label","text-halo-width",d)},{key:"voyageLabelSize",label:"Name size",min:6,max:28,step:.5,value:11.5,apply:d=>{if(o.getLayer("voyage-label"))try{o.setLayoutProperty("voyage-label","text-size",d)}catch{}}},{key:"voyageHitWidth",label:"Hover tolerance",min:4,max:40,step:1,value:16,apply:d=>X("voyage-hit","line-width",d)}],{tab:"Map"}),window.__tune.register("Advance",[{key:"play",label:"Play advance",type:"button",apply:Fa},{key:"seconds",label:"Seconds",min:1,max:15,step:.5,value:4,apply:d=>{Qa=d,wt()}},{key:"curve",label:"Slowdown (0.5 = liquid, 1 = linear)",min:.25,max:1,step:.05,value:.5,apply:d=>{qa=d,wt()}},{key:"colour",label:"Colour",type:"color",value:"#b31217",apply:d=>{Oa=d,wt()}},{key:"rimColour",label:"Leading edge",type:"color",value:"#4a0505",apply:d=>{Na=d,wt()}},{key:"rimKm",label:"Leading edge depth (km)",min:0,max:200,step:5,value:40,apply:d=>{$a=d,wt()}},{key:"opacity",label:"Opacity",min:0,max:1,step:.05,value:.85,apply:d=>{Ba=d,wt()}},{key:"lobeAmount",label:"Lobe depth (km)",min:0,max:150,step:5,value:45,apply:d=>{za=d,la()}},{key:"lobeScale",label:"Lobe count",min:1,max:20,step:1,value:6,apply:d=>{Ha=d,la()}},{key:"mergeKm",label:"Front merge (km)",min:0,max:400,step:10,value:120,apply:d=>{Ga=d,la()}},{key:"clear",label:"Clear",type:"button",apply:()=>de?.clear()}],{tab:"Map"}),window.__tune.register("Territory labels",[{key:"resting",label:"Names at rest",type:"boolean",value:!1,apply:d=>{Te=d,qt()}},{key:"font",label:"Font",type:"select",options:v,value:"Cinzel",apply:d=>P("text-font",[d])},{key:"size",label:"Size",min:6,max:32,step:.5,value:12,apply:d=>{rt=d,ie()}},{key:"hoverScale",label:"Hover scale",min:1,max:2.5,step:.05,value:1.35,apply:d=>{St=d}},{key:"hoverMs",label:"Hover speed (ms)",min:0,max:800,step:10,value:180,apply:d=>{xe=d}},{key:"tracking",label:"Letter spacing",min:0,max:.4,step:.01,value:.06,apply:d=>P("text-letter-spacing",d)},{key:"caps",label:"Small caps",type:"boolean",value:!0,apply:d=>P("text-transform",d?"uppercase":"none")},{key:"haloWidth",label:"Halo width",min:0,max:5,step:.25,value:2,apply:d=>q("text-halo-width",d)},{key:"haloBlur",label:"Halo softness",min:0,max:4,step:.25,value:.5,apply:d=>q("text-halo-blur",d)}],{tab:"Map"}),window.__tune.register("Territory borders",[{key:"lineOpacity",label:"Border opacity",min:0,max:1,step:.05,value:1,apply:d=>{J["boundaries-line.line-opacity"]=d,I=d,De(l.year)}},{key:"labelColor",label:"Label",type:"color",value:"#e6ecf7",apply:d=>{J["boundaries-label.text-color"]=d,X("boundaries-label","text-color",d)}},{key:"labelHalo",label:"Label halo",type:"color",value:"#10151f",apply:d=>{J["boundaries-label.text-halo-color"]=d,X("boundaries-label","text-halo-color",d)}}],{tab:"Map"}),window.__tune.register("Hand-drawn territories",[{key:"handShow",label:"Show",type:"boolean",value:!0,apply:d=>{for(const oe of["hand-fill","hand-line"])if(o.getLayer(oe))try{o.setLayoutProperty(oe,"visibility",d?"visible":"none")}catch{}}},{key:"handEdgeColour",label:"Edge",type:"color",value:ee.line.color,apply:d=>{J["hand-line.line-color"]=d,X("hand-line","line-color",d)}},{key:"handEdgeWidth",label:"Edge width",min:0,max:4,step:.1,value:1,apply:d=>{k.width=d,u("hand-line","line-width",H())}},{key:"handDash",label:"Dash length",min:.5,max:8,step:.25,value:2,apply:d=>{k.dash=d,u("hand-line","line-dasharray",Q())}},{key:"handOpacityMedium",label:"Edge opacity · medium",min:0,max:1,step:.02,value:.7,apply:d=>{k.opacityMedium=d,De(l.year)}},{key:"handOpacityLow",label:"Edge opacity · low",min:0,max:1,step:.02,value:.42,apply:d=>{k.opacityLow=d,De(l.year)}},{key:"handBlurMedium",label:"Edge softness · medium",min:0,max:8,step:.2,value:1.4,apply:d=>{k.blurMedium=d,u("hand-line","line-blur",m())}},{key:"handBlurLow",label:"Edge softness · low",min:0,max:8,step:.2,value:3.2,apply:d=>{k.blurLow=d,u("hand-line","line-blur",m())}}],{tab:"Map"}),window.__tune.register("Hover glow",[{key:"glowColour",label:"Glow",type:"color",value:S,apply:d=>{te.colour=d,re()}},{key:"glowStrength",label:"Strength",min:0,max:1,step:.05,value:.55,apply:d=>{te.strength=d,re()}},{key:"glowWidth",label:"Width",min:.2,max:4,step:.1,value:1,apply:d=>{te.width=d,re()}},{key:"glowBlur",label:"Softness",min:0,max:20,step:.5,value:6,apply:d=>{te.blur=d,re()}}],{tab:"Map"}),window.__tune.register("Rounded corners",[{key:"smoothing",label:"Rounding",min:0,max:8,step:1,value:0,apply:We},{key:"smoothWidth",label:"Width",min:0,max:6,step:.1,value:ee.line.width,apply:d=>u("boundaries-smooth","line-width",d)},{key:"smoothOpacity",label:"Opacity",min:0,max:1,step:.05,value:ee.line.opacity,apply:d=>u("boundaries-smooth","line-opacity",d)},{key:"smoothColour",label:"Colour",type:"color",value:ee.line.color,apply:d=>u("boundaries-smooth","line-color",d)}],{tab:"Map"}),window.__tune.register("Ground",[{key:"exaggeration",label:"Heightmap",min:0,max:12,step:.25,value:0,apply:d=>{try{o.setTerrain(d>0?{source:"dem",exaggeration:d}:null)}catch{}}}],{tab:"Map"}),window.__tune.register("Ships",[{key:"lapSeconds",label:"Seconds per lap",min:20,max:900,step:5,value:45,apply:d=>j()?.setLapSeconds(d)},{key:"shipScale",label:"Size",min:.2,max:3,step:.05,value:1,apply:d=>j()?.setShipScale(d)},{key:"anchored",label:"Scale with zoom",type:"boolean",value:!0,apply:d=>j()?.setShipScale(void 0,d)},{key:"nightDim",label:"Night dimming",min:0,max:1,step:.05,value:0,apply:d=>j()?.setNightDim(d,ur())},{key:"motion",label:"Idle rock",min:0,max:1,step:.05,value:1,apply:d=>j()?.setMotion(d)}],{tab:"Camera"}),window.__tune.register("Framing",[{key:"bottomInset",label:"Bottom inset",type:"number",min:0,max:400,step:2,value:0,apply:d=>{const oe=Math.max(0,Number(d)||0);w=oe>0,t.style.top=`-${oe}px`,t.style.height=`calc(100% + ${oe}px)`,o.resize()}},{key:"autoInset",label:"Auto-centre above the deck",type:"boolean",value:!0,apply:d=>{L=d,w=!1,d?U():(t.style.top="0px",t.style.height="",o.resize())}}],{tab:"Camera"}),window.__tune.register("Tilt and turn",[{key:"pitch",label:"Pitch",min:0,max:85,step:1,value:45,apply:d=>o.easeTo({pitch:Number(d),duration:0})},{key:"bearing",label:"Bearing",min:-180,max:180,step:1,value:0,apply:d=>o.easeTo({bearing:Number(d),duration:0})},{key:"minPitch",label:"Min pitch",type:"number",min:0,max:85,step:1,value:0,apply:d=>o.setMinPitch(Number(d))},{key:"maxPitch",label:"Max pitch",type:"number",min:0,max:85,step:1,value:70,apply:d=>o.setMaxPitch(Number(d))}],{tab:"Camera"}),window.__tune.register("Zoom limits",[{key:"minZoom",label:"Min zoom",type:"number",min:0,max:22,step:.1,value:o.getMinZoom(),apply:d=>o.setMinZoom(Number(d))},{key:"maxZoom",label:"Max zoom",type:"number",min:0,max:22,step:.1,value:o.getMaxZoom(),apply:d=>o.setMaxZoom(Number(d))}],{tab:"Camera"}),window.__tune.register("Entrance",[{key:"startLng",label:"Start lng",type:"number",step:.1,value:O.startLng,apply:d=>{O.startLng=Number(d)}},{key:"startLat",label:"Start lat",type:"number",step:.1,value:O.startLat,apply:d=>{O.startLat=Number(d)}},{key:"startZoom",label:"Start zoom",min:0,max:8,step:.05,value:O.startZoom,apply:d=>{O.startZoom=d}},{key:"endLng",label:"End lng",type:"number",step:.1,value:O.endLng,apply:d=>{O.endLng=Number(d)}},{key:"endLat",label:"End lat",type:"number",step:.1,value:O.endLat,apply:d=>{O.endLat=Number(d)}},{key:"endZoom",label:"End zoom",min:0,max:10,step:.05,value:O.endZoom,apply:d=>{O.endZoom=d}},{key:"seconds",label:"Seconds",min:.5,max:12,step:.25,value:O.seconds,apply:d=>{O.seconds=d}},{key:"jumpStart",type:"button",label:"Go to start",apply:()=>o.jumpTo({center:[O.startLng,O.startLat],zoom:O.startZoom})},{key:"play",type:"button",label:"Play entrance",apply:()=>{o.jumpTo({center:[O.startLng,O.startLat],zoom:O.startZoom}),setTimeout(()=>o.flyTo({center:[O.endLng,O.endLat],zoom:O.endZoom,duration:O.seconds*1e3,essential:!0}),120)}}],{tab:"Camera"}),il()};let Gt=null;window.__tmSetClouds=u=>{const E=Math.max(0,Math.min(1,Number(u)));Gt&&Gt.setOptions({opacity:E});try{localStorage.setItem("tm-clouds",String(E))}catch{}};let Ke="soft-atlas";const ia=u=>{(u==="ink-art"||u==="inkart")&&(u="pen-ink"),Ue[u]||console.warn(`[timemap] no map style "${u}" — falling back to soft-atlas. Defined: ${Object.keys(Ue).join(", ")}`);const E=Ue[u]?u:"soft-atlas",v=Ue[E];Ke=E;try{localStorage.setItem("tm-style",E)}catch{}const P=!!v.imagery,q=(j,te)=>{o.getLayer(j)&&o.setLayoutProperty(j,"visibility",te?"visible":"none")};q("satellite",P),q("satellite-detail",P);for(const j of["land","coast-shadow","lakes","lake-line","lake-shadow"])q(j,!P);o.getLayer("coast-bold")&&o.setPaintProperty("coast-bold","line-opacity",P?.4:1),o.setPaintProperty("water","background-color",v.water),o.getLayer("lakes")&&o.setPaintProperty("lakes","fill-color",v.water);{const j=v.shore||{color:v.line.color,shadow:"#574631"};o.getLayer("lake-line")&&o.setPaintProperty("lake-line","line-color",j.color),o.getLayer("lake-shadow")&&o.setPaintProperty("lake-shadow","line-color",j.shadow)}o.setPaintProperty("land","fill-color",v.land);const O=v.shore||{color:v.line.color,width:.9,shadow:"#574631",shadowWidth:2.4,dy:2};if(o.getLayer("coast-bold")&&(o.setPaintProperty("coast-bold","line-color",O.color),o.setPaintProperty("coast-bold","line-width",O.width)),o.getLayer("coast-shadow")&&(o.setPaintProperty("coast-shadow","line-color",O.shadow),o.setPaintProperty("coast-shadow","line-width",O.shadowWidth),o.setPaintProperty("coast-shadow","line-translate",[0,O.dy??2])),o.getLayer("coast-echo")&&(v.coast?(o.setLayoutProperty("coast-echo","visibility","visible"),o.setPaintProperty("coast-echo","line-color",v.coast.color),o.setPaintProperty("coast-echo","line-width",v.coast.width??.6),cr(v.coast)):(o.setLayoutProperty("coast-echo","visibility","none"),hr())),o.getLayer("rivers"))if(v.river){o.setLayoutProperty("rivers","visibility","visible"),o.setPaintProperty("rivers","line-color",v.river.color),o.setPaintProperty("rivers","line-opacity",v.river.opacity??.55);const j=v.river.width??.6;o.setPaintProperty("rivers","line-width",["interpolate",["linear"],["to-number",["get","scalerank"]],1,j+.5,6,j*.5])}else o.setLayoutProperty("rivers","visibility","none");if(o.getLayer("hillshade")&&o.setLayoutProperty("hillshade","visibility",v.hillshade?"visible":"none"),o.getLayer("graticule")&&(v.grid?(o.setLayoutProperty("graticule","visibility","visible"),o.setPaintProperty("graticule","line-color",v.grid.color),o.setPaintProperty("graticule","line-opacity",v.grid.opacity??.5),o.setPaintProperty("graticule","line-width",v.grid.width??.6)):o.setLayoutProperty("graticule","visibility","none")),o.getLayer("mountains")&&o.setLayoutProperty("mountains","visibility",v.mountains?"visible":"none"),o.getLayer("forests")&&o.setLayoutProperty("forests","visibility",v.forest?"visible":"none"),o.getLayer("land-scatter")&&o.setLayoutProperty("land-scatter","visibility",v.forest?"visible":"none"),sn(o,!!v.mountains),o.getLayer("boundaries-fill")){I=J["boundaries-line.line-opacity"]??(v.line&&v.line.opacity!=null?v.line.opacity:1),ve(),X("boundaries-line","line-color",v.line.color),X("boundaries-line","line-width",v.line.width),X("boundaries-line","line-blur",v.line.blur),o.setLayoutProperty("boundaries-line","line-join","round");const j=Ne>=1;o.setLayoutProperty("boundaries-line","visibility",v.borderSource||j?"none":"visible"),X("hand-line","line-color",v.line.color),X("boundaries-label","text-color",v.text.color),X("boundaries-label","text-halo-color",v.text.halo)}o.getLayer("markers-label")&&(o.setPaintProperty("markers-label","text-color",v.text.color),o.setPaintProperty("markers-label","text-halo-color",v.text.halo)),Ar(o,{color:v.voyage,halo:v.text&&v.text.halo});for(let j=0;j<6;j++)o.getLayer(`ink-${j}`)&&o.removeLayer(`ink-${j}`);if(o.getLayer("boundaries-line")){const j=v.borderSource&&v.borderSource.source||"cliopatria",te=v.borderSource&&v.borderSource.sourceLayer||"boundaries",re=v.borderSource?xt(l.year):G(l.year);(v.inkLayers||[]).forEach((V,Qe)=>{const de={id:`ink-${Qe}`,type:"line",source:j,"source-layer":te,filter:re,layout:{"line-join":"round","line-cap":"round"},paint:{"line-color":V.color,"line-width":V.width,"line-opacity":V.opacity??1,"line-blur":V.blur??0,...V.offset!=null?{"line-offset":V.offset}:{},...V.dash?{"line-dasharray":V.dash}:{}}};V.above?o.addLayer(de,o.getLayer("boundaries-label")?"boundaries-label":void 0):o.addLayer(de,"boundaries-line")})}lr(v)};window.__applyMapStyle=ia,window.__tmShowGlow=Lt,window.__tmSetRounding=We,window.__timemapSoundOn=(()=>{try{return localStorage.getItem("tm-sound")==="1"}catch{return!1}})();let ye=null;const Mt=u=>{const E=ye;window.dispatchEvent(new CustomEvent("timemap-audio",{detail:{visible:!!(u&&E),playing:!!(E&&!E.paused&&!E.ended),currentTime:E&&E.currentTime||0,duration:E&&isFinite(E.duration)?E.duration:0}}))};window.__timemapStopSpeak=()=>{if(ye){try{ye.pause()}catch{}ye=null}Mt(!1)},window.__timemapToggleSpeak=()=>{ye&&(ye.paused?ye.play().catch(()=>{}):ye.pause(),Mt(!0))},window.__timemapSeek=u=>{ye&&isFinite(ye.duration)&&(ye.currentTime=Math.max(0,Math.min(1,u))*ye.duration,Mt(!0))},window.__timemapSpeak=(u,E)=>{if(window.__timemapStopSpeak(),!window.__timemapSoundOn||!u||!E)return;const v=(document.querySelector("meta[name=csrf-token]")||{}).content||"";fetch("/teacher/timemap/speak",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":v},body:JSON.stringify({id:u,text:E})}).then(P=>P.ok?P.json():{}).then(P=>{!P||!P.url||!window.__timemapSoundOn||(ye=new Audio(P.url),["loadedmetadata","timeupdate","play","pause"].forEach(q=>ye.addEventListener(q,()=>Mt(!0))),ye.addEventListener("ended",()=>window.__timemapStopSpeak()),ye.play().catch(()=>{}),Mt(!0))}).catch(()=>{})},window.__timemapAudioTeardownBound||(window.__timemapAudioTeardownBound=!0,document.addEventListener("livewire:navigating",()=>window.__timemapStopSpeak&&window.__timemapStopSpeak()),window.addEventListener("pagehide",()=>window.__timemapStopSpeak&&window.__timemapStopSpeak())),o.on("load",()=>{o.addLayer({id:"boundaries-fill",type:"fill",source:"cliopatria","source-layer":"boundaries",paint:{"fill-color":x,"fill-opacity":_,"fill-opacity-transition":{duration:150}}}),o.addLayer({id:"hand-fill",type:"fill",source:"hand-territories",paint:{"fill-color":x,"fill-opacity":_,"fill-opacity-transition":{duration:150}}}),o.addLayer({id:"boundaries-smooth",type:"line",source:Bt,layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":ee.line.color,"line-width":ee.line.width,"line-opacity":ee.line.opacity}}),o.addLayer({id:"boundaries-glow",type:"line",source:"boundaries-glow-src",filter:["==",["geometry-type"],"LineString"],layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":S,"line-width":z,"line-blur":6,"line-opacity":.55,"line-opacity-transition":{duration:140}}}),o.addLayer({id:"boundaries-line",type:"line",source:"cliopatria","source-layer":"boundaries",paint:{"line-color":ee.line.color,"line-width":ee.line.width,"line-opacity":ee.line.opacity}}),o.addLayer({id:"hand-line",type:"line",source:"hand-territories",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":ee.line.color,"line-width":H(),"line-opacity":Y(),"line-blur":m(),"line-dasharray":Q()}}),o.addLayer({id:"rivers",type:"line",source:"rivers","source-layer":"rivers",filter:["<=",["to-number",["get","scalerank"]],5],layout:{visibility:"none","line-cap":"round","line-join":"round"},paint:{"line-color":"#6a7c74","line-width":.6,"line-opacity":.6}}),o.addSource("labels",{type:"geojson",data:{type:"FeatureCollection",features:[]}}),o.addLayer({id:"boundaries-label",type:"symbol",source:"labels",layout:{"icon-image":["get","flag"],"icon-size":.13,"icon-anchor":"bottom","icon-allow-overlap":!1,"icon-optional":!0,"text-field":["get","name"],"text-font":["Cinzel"],"text-transform":"uppercase","text-letter-spacing":.06,"text-size":12,"text-anchor":"top","text-offset":[0,.55],"text-allow-overlap":!1,"text-optional":!0,"text-padding":6,"symbol-sort-key":["case",["get","sel"],0,["get","hov"],0,1]},paint:{"text-color":ee.text.color,"text-halo-color":ee.text.halo,"text-halo-width":2,"text-halo-blur":.5,"icon-translate":[0,-9]}}),o.addLayer({id:"boundaries-cursor-label",type:"symbol",source:"boundaries-cursor-name",layout:{"text-field":["get","name"],"text-font":["Cinzel"],"text-transform":"uppercase","text-letter-spacing":.06,"text-size":12,"text-anchor":"bottom","text-offset":[0,-1.1],"text-allow-overlap":!0,"text-ignore-placement":!0},paint:{"text-color":ee.text.color,"text-halo-color":ee.text.halo,"text-halo-width":2,"text-halo-blur":.5}});const u=()=>(Ue[Ke]||{}).land||ee.land;an(o,{beforeId:"boundaries-label",visibility:"none"}).then(()=>Jr(o,{beforeId:"boundaries-label",visibility:"none",landColor:u()})).then(()=>Kr(o,{beforeId:"boundaries-label",visibility:"none",landColor:u()})).then(()=>nn(o,{beforeId:"boundaries-label",visibility:"none"})).then(()=>ia(Ke)),o.addSource("markers",{type:"geojson",data:un}),o.addLayer({id:"markers-dot",type:"circle",source:"markers",paint:{"circle-radius":4,"circle-color":"#cbbfa6","circle-stroke-color":"#6b5a3e","circle-stroke-width":1.4,"circle-opacity":.85}}),o.addLayer({id:"markers-label",type:"symbol",source:"markers",layout:{"text-field":["get","name"],"text-size":14,"text-font":["Cinzel"],"text-transform":"uppercase","text-offset":[0,.9],"text-anchor":"top","text-allow-overlap":!1,"text-optional":!0,"text-letter-spacing":.06},paint:{"text-color":"#6b5a3e","text-halo-color":"#f3ead6","text-halo-width":1.2}},o.getLayer("boundaries-label")?"boundaries-label":void 0);let E=.5;try{const P=parseFloat(localStorage.getItem("tm-clouds"));Number.isFinite(P)&&(E=Math.min(1,Math.max(0,P)))}catch{}ra=Xs(o,{date:na(l.year),reduceMotion:Da}),Gt=ra.layers.clouds,Gt?.setOptions({opacity:E}),dr(),Tr(o,{year:l.year,beforeId:Aa,labelBeforeId:"boundaries-label"}),gr(async()=>{const{addVoyageShips:P}=await import("./voyage-ships-CRI28GFl.js");return{addVoyageShips:P}},[]).then(({addVoyageShips:P})=>{_e=P(o,{beforeId:Aa}),_e.setYear(l.year),window.__tmShips=_e}).catch(()=>{}),o.on("mouseenter","markers-dot",()=>{o.getCanvas().style.cursor="pointer"}),o.on("mouseleave","markers-dot",()=>{o.getCanvas().style.cursor=""}),o.on("moveend",tt),o.on("moveend",kt),o.on("sourcedata",P=>{P.sourceId==="cliopatria"&&P.isSourceLoaded&&tt()});let v=null;try{v=localStorage.getItem("tm-style")}catch{}ia(v||"soft-atlas"),It(l.year);for(const P of ce)o.getLayer(P)&&(o.on("mousemove",P,q=>{if(o.getCanvas().style.cursor="pointer",!q.features.length)return;if(q.features[0].id===pe){Ae&&nt(Ae,q.lngLat);return}pe=q.features[0].id;const O=q.features[0].properties,j=O.Wikidata?Ea.get(`${O.Wikidata}|${O.Name}`)||O.Wikidata:null;Lt(q.features[0].geometry,O.Name??null,j);const te=O.Name??null,re=te&&(!Te||!mt(te));nt(re?te:null,q.lngLat)}),o.on("mouseleave",P,()=>{o.getCanvas().style.cursor="",pe=null,Lt(null),nt(null)}));l.ready=!0,c()}),o.on("click",u=>{const E=[[u.point.x-7,u.point.y-7],[u.point.x+7,u.point.y+7]],v=o.queryRenderedFeatures(E,{layers:["markers-dot"]})[0];if(v){ne!==null&&(ft(),ke());const V=v.properties;l.selectedRegion=V.id,c(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:V.id,name:V.name,qid:V.qid,articleUrl:V.article_url,summary:V.summary,inception:V.inception,dissolution:V.dissolution}}));return}const P=o.getLayer("voyage-hit")&&o.queryRenderedFeatures(E,{layers:["voyage-hit"]})[0];if(P){ne!==null&&(ft(),ke());const V=P.properties;l.selectedRegion=V.qid,c(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:V.qid,name:`${V.name} (${V.years})`,qid:V.qid}}));return}const q=o.queryRenderedFeatures(u.point,{layers:ce.filter(V=>o.getLayer(V))})[0],O=!!q?.properties?.hand;ft(),ne=q?q.id:null,Re=q?u.lngLat:null,At=q?q.properties?.Name??null:null,dt=O,ne!==null&&Xe(ne,!0,O),ke();const j=q?q.properties.Wikidata:null,te=q?q.properties.Name:null,re=j?Ea.get(`${j}|${te}`)||j:null;l.selectedRegion=re,c(),at?.cancel(),at=q?kr(o,{id:"polity-sweep",lines:ca(q.geometry).flatMap(V=>Wa(V)).filter(V=>V.length>=4),durationMs:2e3,beforeId:o.getLayer("boundaries-label")?"boundaries-label":void 0}):null,window.dispatchEvent(new CustomEvent("polity-selected",{detail:O?{id:re,name:te,qid:re,hand:!0,territoryId:q.properties.id,inception:Number(q.properties.FromYear),dissolution:Number(q.properties.ToYear),provenance:vn(q.properties.id)}:{id:re,name:te,qid:re}}))});const fr=()=>{if(ne===null||!Re)return;const u=o.project(Re);if(!Number.isFinite(u.x)||!Number.isFinite(u.y))return;const E=ce.filter(te=>o.getLayer(te));if(!E.length)return;const v=o.queryRenderedFeatures(u,{layers:E})[0];if(!v||v.id===ne)return;const P=At;Xe(ne,!1),ne=v.id,Xe(ne,!0);const q=v.properties?.Name??null,O=v.properties?.Wikidata??null,j=O?Ea.get(`${O}|${q}`)||O:null;At=q,l.selectedRegion=j,ke(),c(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:j,name:q,qid:j,succeeded:!0,previousName:P}}))};return t._setYear=u=>(l.year=u,r.year=u,It(u),c(),clearTimeout(ut),ut=setTimeout(fr,320),ko(u)),t._setFadeMode=u=>{Je=!!u,De(l.year)},t._tmMap=o,window.__tmMap=o,window.__timemapClearSelection=()=>{ne!==null&&(Xe(ne,!1),ne=null,ke()),l.selectedRegion=null,c()},o};window.mountAtlasSlider=function(e,t,r,n){let c=0,o=null;const i=h=>{if(!t._setYear)return;const b=performance.now(),L=100-(b-c);clearTimeout(o),L<=0?(c=b,t._setYear(h)):o=setTimeout(()=>{c=performance.now(),t._setYear(h)},L)},a=Br(e,{min:-4e3,max:2010,value:r,labels:n,onYear:h=>i(h),onPlay:h=>{t._setFadeMode&&t._setFadeMode(h)}});Hr(document.querySelector("[data-timemap-year-flash]")),jr(),window.__setTimemapYear=h=>{const b=Math.round(Number(h));Number.isNaN(b)||(a.setYear(b),t._setYear&&t._setYear(b))}};function ir(e){const t=/\/wiki\/([^?#]+)/.exec(e||"");return t?decodeURIComponent(t[1]):null}window.__timemapWikiSummary=async e=>{if(!e||!e.includes("wikipedia.org"))return null;const t=ir(e);if(!t)return null;try{const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(t));if(!r.ok)return null;const n=await r.json();return{thumbnail:n.thumbnail?.source||null,extract:n.extract||null}}catch{return null}};window.__timemapWikiLead=async e=>{if(!e||!e.includes("wikipedia.org"))return null;const t=ir(e);if(!t)return null;try{const r="https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&format=json&origin=*&titles="+encodeURIComponent(t),n=await fetch(r);if(!n.ok)return null;const l=await n.json(),c=l.query&&l.query.pages||{},o=Object.values(c)[0];return o&&o.extract||null}catch{return null}};window.__timemapHydratePanel=(e,t)=>{e.thumb=null,e.lead=null,e.leadLoading=!1,e.leadFailed=!1,t&&t.wikipedia_url&&window.__timemapWikiSummary(t.wikipedia_url).then(r=>{e.thumb=r&&r.thumbnail||null})};window.__timemapPanelReadMore=(e,t)=>{!t||!t.wikipedia_url||(e.leadLoading=!0,e.leadFailed=!1,window.__timemapWikiLead(t.wikipedia_url).then(r=>{r?e.lead=r:e.leadFailed=!0,e.leadLoading=!1}))};
