const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/map-chart-CEya5O3P.css"])))=>i.map(i=>d[i]);
import{_ as on}from"./vite-helpers-DqutJMZx.js";import{m as nt,a as ue,C as la,c as rn,G as nn,b as sn,d as ln,e as cn,s as un,S as hn,f as dn,D as fn,g as mn,E as Ke}from"./map-chart-Clb3w5-k.js";import{E as ua,a as Oa}from"./easing-HS2C6-zA.js";import{t as pn,a as gn,S as Zo,v as zt,s as ca,b as mo,E as pa,m as Ba,c as yn,d as bn,V as wn,e as vn,i as _n,f as xn,o as Ea,w as po,g as En,h as Tn,j as kn}from"./border-sweep-U-9KZvb-.js";import{p as An}from"./tuner-CTMYYJl-.js";import"./i18n-DoByrmTl.js";function Jo(e,t=new Date().getFullYear()){return t-e}function Sn(e,t=new Date().getFullYear(),r=25){return Math.trunc(Jo(e,t)/r)}function er(e,t=new Date().getFullYear()){const r=Jo(e,t).toLocaleString("en-US"),n=Sn(e,t);return`≈ ${r} years ago · ~${n} generations`}const Ln=(e,t)=>{const r=getComputedStyle(document.documentElement).getPropertyValue(e),n=parseFloat(r);return Number.isFinite(n)?n:t},De=(e,t)=>{const r=getComputedStyle(document.documentElement).getPropertyValue(e).trim(),n=parseFloat(r);return Number.isFinite(n)?r.endsWith("rem")?n*parseFloat(getComputedStyle(document.documentElement).fontSize):n:t},go=e=>e<0?`${Math.abs(e)} BCE`:String(e),Mn=e=>e<0?`${Math.abs(e)} BCE`:`${e} CE`,yo=e=>e<0?"BCE":"CE",Rn='<path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"/>',Pn='<path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>',Cn=24,na="var(--scrubber-tick-height)",Dn=.12,In=.3,Ta=400,bo=.45,Fn=90,Un={play:"Play timeline",pause:"Pause timeline",track:"Timeline year",year:"Year (negative for BCE)"},wo=4,Nn=1,On=3,Bn=6.6,Qn=8,tr=[8,22];function qn(e,{min:t,pxPerYear:r}){const n=[],i=tr.map(()=>-1/0);return[...e].filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)).sort((s,o)=>s.start-o.start).map(s=>{const o=(s.start-t)*r,l=Math.max(2,(s.end-s.start+1)*r);let a=n.findIndex(T=>T<=o);a<0&&(a=Math.min(n.length,On-1)),n[a]=Math.max(n[a]??-1/0,o+l);const h=String(s.label??"").length*Bn,y=s.label?i.findIndex(T=>T<=o):-1;return y>=0&&(i[y]=o+h+Qn),{...s,x:o,w:l,lane:a,labelRow:y,showLabel:y>=0}})}function Hn(e,{min:t,max:r,value:n,onYear:i,onPlay:s,labels:o,spans:l=[]}){const a={...Un,...o??{}},h=M=>Math.min(r,Math.max(t,M));let y=h(Math.round(n)),T=Ln("--scrubber-px-per-year",4);e.classList.add("select-none"),e.innerHTML=`
    <div class="tm-track absolute inset-0 overflow-hidden rounded-card"
         role="slider" tabindex="0"
         aria-label="${a.track}" aria-valuemin="${t}" aria-valuemax="${r}" aria-valuenow="${y}">
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
      <button type="button" aria-label="${a.play}" aria-pressed="false" data-tooltip="${a.play}"
              class="tm-play grid h-6 w-6 place-items-center rounded-full text-scrubber-control">
        <svg class="tm-ic-play h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">${Rn}</svg>
        <svg class="tm-ic-pause h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" style="display:none">${Pn}</svg>
      </button>
      <label class="tm-year-badge flex h-[30px] cursor-text items-center gap-0.5 rounded-md border border-scrubber-badge-edge bg-scrubber-badge px-2">
        <input type="number" inputmode="numeric"
               class="tm-year-input w-[5ch] bg-transparent text-right font-mono text-scrubber-num tracking-[0.8px] tabular-nums text-scrubber-year outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
               min="${t}" max="${r}" step="1" value="${y}" aria-label="${a.year}">
        <span class="tm-era-suffix lp-card-label lp-card-label-sm">${yo(y)}</span>
      </label>
    </div>`;const v=e.querySelector(".tm-year-input"),I=e.querySelector(".tm-era-suffix"),g=e.querySelector(".tm-year-badge"),m=e.querySelector(".tm-track"),w=e.querySelector(".tm-scroll"),E=e.querySelector(".tm-strip");w.style.scrollbarWidth="none";const L=new Map,d=[],c=[],O=Math.ceil(t/10)*10,N=e.querySelector(".tm-years");let A=0;const z=()=>{const M=((A-w.scrollLeft)%T+T)%T;N.style.backgroundPositionX=`${M}px`},p=()=>{const M=m.clientWidth/2;E.style.width=`${(r-t)*T+M*2}px`,E.style.paddingLeft=`${M}px`,E.innerHTML="",L.clear(),c.length=0,ct=null,N.style.height="var(--scrubber-year-tick-height)",N.style.backgroundImage=`repeating-linear-gradient(90deg, var(--color-scrubber-tick) 0 var(--scrubber-year-tick-width), transparent var(--scrubber-year-tick-width) ${T}px)`,A=M,z(),S(),st();const ne=Math.ceil(t/10)*10;for(let te=ne;te<=r;te+=10){const ge=te%100===0,de=M+(te-t)*T,fe=document.createElement("div");if(fe.className=ge?"absolute top-0 w-[1.5px] rounded-[3px] bg-scrubber-tick-major":"absolute top-0 w-px rounded-[3px] bg-scrubber-tick",fe.style.left=`${de}px`,fe.style.height=na,E.appendChild(fe),c.push(fe),!ge)continue;const Ne=document.createElement("span");Ne.className="absolute -translate-x-1/2 whitespace-nowrap text-scrubber-num font-semibold tabular-nums text-scrubber-tick-major",Ne.style.left=`${de}px`,Ne.style.top="var(--scrubber-label-top)",Ne.style.lineHeight="calc(var(--scrubber-height) - var(--scrubber-label-top))",Ne.textContent=go(te),E.appendChild(Ne),L.set(te,Ne)}d.length=0;for(const te of qn(l,{min:t,pxPerYear:T})){const ge=te.lane*(wo+Nn),de=document.createElement("div");de.className="pointer-events-none absolute rounded-[1px] bg-primary transition-opacity duration-200",Object.assign(de.style,{left:`${M+te.x}px`,width:`${te.w}px`,top:`${ge}px`,height:`${wo}px`}),E.appendChild(de);let fe=null;te.showLabel&&(fe=document.createElement("span"),fe.className="pointer-events-none absolute whitespace-nowrap text-xs leading-none text-scrubber-tick-major transition-opacity duration-200",Object.assign(fe.style,{left:`${M+te.x}px`,top:`${tr[te.labelRow]}px`}),fe.textContent=te.label,E.appendChild(fe)),d.push({start:te.start,end:te.end,bar:de,text:fe})}H()},H=()=>{for(const{start:M,end:ne,bar:te,text:ge}of d){const de=y>=M&&y<=ne;te.style.opacity=de?"1":"0.55",ge&&(ge.style.opacity=de?"1":"0.7")}};let G=Dn,$=In,C=$,D=!1,k=null,U=0,b=null,j=0,Q=0,J=0;const S=()=>{N.style.transition=`opacity ${D?140:220}ms ${D?ua.enter:ua.exit}`,N.style.opacity=D?"1":"0"},X=M=>{M!==D&&(D=M,S())},R=M=>{const ne=w.scrollLeft;Q+=Math.abs(ne-j),j=ne;const te=M-J;if(te>=Fn&&(C=C*bo+Q/te*(1-bo),Q=0,J=M,X(C<G?!0:C>$?!1:D)),!He&&M>U){k=null,C=$,X(!1);return}k=requestAnimationFrame(R)},W=()=>{if(He){b=setTimeout(W,Ta);return}C=$,X(!1)},ee=M=>{U=M+Ta,clearTimeout(b),b=setTimeout(W,Ta),k===null&&(Q=0,J=M,j=w.scrollLeft,C=$,k=requestAnimationFrame(R))},V=M=>Math.round(M/T)*T,B=140,Se=220;let pe=-1,he=0,Le=0,Fe=0,it=0,ke=null,bt=!1,Ct=30,Dt=44,jt=112;const st=()=>{Ct=De("--scrubber-tick-height",30),Dt=De("--scrubber-magnify-height",44),jt=De("--scrubber-magnify-radius",112)},It=M=>M*M*(3-2*M),wa=()=>{const M=Ct,ne=Dt,te=jt,de=m.clientWidth/2-w.scrollLeft,fe=10*T,Ne=Math.max(0,Math.floor((-de-(O-t)*T)/fe)),Ot=Math.min(c.length-1,Math.ceil((m.clientWidth-de-(O-t)*T)/fe));for(let tt=Ne;tt<=Ot;tt++){const Ye=c[tt];if(!Ye)continue;const Et=de+(O+tt*10-t)*T,Tt=Math.abs(Et-pe),Zt=pe>=0&&Tt<te?It(1-Tt/te):0,ft=Zt>0?`${(M+(ne-M)*Zt*he).toFixed(1)}px`:na;Ye.style.height!==ft&&(Ye.style.height=ft)}bt=!0},va=()=>{for(const M of c)M.style.height!==na&&(M.style.height=na);bt=!1},Ft=M=>{const ne=Math.min(1,(M-it)/(Fe>Le?B:Se)),te=Fe>Le?Oa.easeOutCubic(ne):Oa.easeInCubic(ne);if(he=Le+(Fe-Le)*te,he>0?wa():bt&&va(),ne>=1&&he===0){ke=null;return}ke=requestAnimationFrame(Ft)},lt=M=>{pe=M<0?-1:M-m.getBoundingClientRect().left;const ne=pe>=0?1:0;ne!==Fe&&(Le=he,Fe=ne,it=performance.now()),ke===null&&(ke=requestAnimationFrame(Ft))};w.addEventListener("pointermove",M=>lt(M.clientX)),w.addEventListener("pointerleave",()=>lt(-1)),w.addEventListener("pointercancel",()=>lt(-1));const qe=()=>window.dispatchEvent(new CustomEvent("timemap-scrub",{detail:{year:y,label:go(y)}}));let ct=null;const Yt=()=>{const M=Math.round(y/100)*100,ne=L.get(M),ge=!!ne&&Math.abs((M-y)*T)<Cn?ne:null;ct&&ct!==ge&&(ct.style.visibility=""),ge&&(ge.style.visibility="hidden"),ct=ge};let Je=!1;const wt=()=>h(t+Math.round(w.scrollLeft/T)),Xt=M=>(M-t)*T,vt=()=>{v.value=String(y),I.textContent=yo(y),g.setAttribute("data-tooltip",er(y)),m.setAttribute("aria-valuenow",String(y)),m.setAttribute("aria-valuetext",Mn(y)),Yt(),H()},Ee=(M,{fireYear:ne=!0}={})=>{y=h(Math.round(M)),vt(),Je=!0,w.scrollLeft=Xt(y),z(),j=w.scrollLeft,requestAnimationFrame(()=>{Je=!1}),ne&&i(y)},Me=e.querySelector(".tm-play"),_t=e.querySelector(".tm-ic-play"),Vt=e.querySelector(".tm-ic-pause"),Kt=100;let Ae=!1,et=null,se=0,je=0;const xt=()=>{_t.style.display=Ae?"none":"",Vt.style.display=Ae?"":"none",Me.setAttribute("aria-pressed",Ae?"true":"false"),Me.setAttribute("aria-label",Ae?a.pause:a.play),Me.setAttribute("data-tooltip",Ae?a.pause:a.play)},Ut=M=>{if(Ae){if(je&&(se+=Kt*Math.min(M-je,100)/1e3),je=M,se>=r){Ee(r),Ue();return}Ee(se),et=requestAnimationFrame(Ut)}},Ue=()=>{Ae&&(Ae=!1,et!==null&&cancelAnimationFrame(et),et=null,je=0,xt(),s&&s(!1))},Nt=()=>{Ae||(Ae=!0,y>=r&&Ee(t),se=y,je=0,xt(),s&&s(!0),et=requestAnimationFrame(Ut))};Me.addEventListener("click",()=>Ae?Ue():Nt());let we=!1;w.addEventListener("scroll",()=>{Je||(ee(performance.now()),!we&&(we=!0,requestAnimationFrame(()=>{we=!1,z();const M=wt();M!==y&&(y=M,vt(),qe(),i(y))})))}),w.addEventListener("scrollend",()=>{if(He||Je)return;const M=V(w.scrollLeft);M!==w.scrollLeft&&Ee(t+M/T,{fireYear:!1})});let Re=0,ut=0,He=!1;w.addEventListener("pointerdown",M=>{Ue(),He=!0,Re=M.clientX,ut=w.scrollLeft,w.setPointerCapture(M.pointerId),w.classList.replace("cursor-grab","cursor-grabbing"),ee(performance.now())}),w.addEventListener("pointermove",M=>{He&&(w.scrollLeft=V(ut-(M.clientX-Re)))});const ht=()=>{He&&(He=!1,w.classList.replace("cursor-grabbing","cursor-grab"),Ee(wt()))};w.addEventListener("pointerup",ht),w.addEventListener("pointercancel",ht),v.addEventListener("input",()=>{Ue();const M=parseInt(v.value,10);Number.isNaN(M)||Ee(M)}),v.addEventListener("change",()=>Ee(parseInt(v.value,10)||y)),m.addEventListener("keydown",M=>{const ne={ArrowLeft:-1,ArrowRight:1,PageDown:-10,PageUp:10}[M.key];ne!==void 0&&(M.preventDefault(),Ue(),Ee(y+ne),qe())}),p(),vt(),requestAnimationFrame(()=>{Ee(y,{fireYear:!1})});const Ge=new ResizeObserver(()=>{p(),Ee(y,{fireYear:!1})});Ge.observe(m);const Te=(M,ne,te="px")=>document.documentElement.style.setProperty(M,`${ne}${te}`),$e=()=>{p(),Ee(y,{fireYear:!1})},dt=window.__tune?.register("Time scrubber",[{key:"width",label:"Bar width",min:480,max:1400,step:5,value:De("--scrubber-width",875),apply:M=>Te("--scrubber-width",M)},{key:"height",label:"Bar height",min:32,max:88,step:1,value:De("--scrubber-height",47),apply:M=>Te("--scrubber-height",M)},{key:"tickHeight",label:"Tick height",min:8,max:64,step:1,value:De("--scrubber-tick-height",30),apply:M=>{Te("--scrubber-tick-height",M),st()}},{key:"labelTop",label:"Label baseline",min:8,max:72,step:1,value:De("--scrubber-label-top",36),apply:M=>Te("--scrubber-label-top",M)},{key:"bandWidth",label:"Centre band",min:0,max:640,step:4,value:De("--scrubber-band-width",268),apply:M=>Te("--scrubber-band-width",M)},{key:"yearTickHeight",label:"Year ticks",min:0,max:30,step:1,value:De("--scrubber-year-tick-height",8),apply:M=>Te("--scrubber-year-tick-height",M)},{key:"yearTickWidth",label:"Year tick width",min:.5,max:2,step:.25,value:De("--scrubber-year-tick-width",1),apply:M=>Te("--scrubber-year-tick-width",M)},{key:"magnifyHeight",label:"Magnify to",min:30,max:47,step:1,value:De("--scrubber-magnify-height",44),apply:M=>{Te("--scrubber-magnify-height",M),st()}},{key:"magnifyRadius",label:"Magnify reach",min:20,max:300,step:5,value:De("--scrubber-magnify-radius",112),apply:M=>{Te("--scrubber-magnify-radius",M),st()}},{key:"fineAt",label:"Years in below",min:5,max:200,step:5,value:Math.round(G/T*1e3),apply:M=>{G=M*T/1e3,$=G*2.5}},{key:"showYears",type:"button",label:"Flash the years",apply:()=>{X(!0),setTimeout(()=>X(!1),1500)}},{key:"pxPerYear",label:"Pixels per year",min:1,max:10,step:.5,value:T,apply:M=>{T=M,document.documentElement.style.setProperty("--scrubber-px-per-year",String(M)),$e()}}],{tab:"Map"});return{setYear:M=>{Ue(),Ee(M,{fireYear:!1})},destroy:()=>{Ge.disconnect(),Ue(),clearTimeout(b),k!==null&&cancelAnimationFrame(k),ke!==null&&cancelAnimationFrame(ke),dt&&dt()}}}const vo=1e3,Gn=120,$n=420;function zn(e){if(!e)return()=>{};document.fonts?.load("600 1em History").catch(()=>{});let t=null,r=vo;const n=()=>{e.style.transition=`opacity ${$n}ms ${ua.exit}`,e.style.opacity="0"},i=l=>{e.textContent=l,e.style.transition=`opacity ${Gn}ms ${ua.enter}`,e.style.opacity="1",clearTimeout(t),t=setTimeout(n,r)},s=l=>i(l.detail?.label??"");window.addEventListener("timemap-scrub",s);const o=window.__tune?.register("Year flash",[{key:"size",label:"Size",min:16,max:160,step:2,value:parseFloat(getComputedStyle(e).fontSize)||56,apply:l=>document.documentElement.style.setProperty("--scrubber-flash-size",`${l}px`)},{key:"hold",label:"Hold (ms)",min:200,max:4e3,step:100,value:vo,apply:l=>{r=l}},{key:"preview",type:"button",label:"Show it",apply:()=>i(e.textContent||"1600")}],{tab:"Map"});return()=>{window.removeEventListener("timemap-scrub",s),clearTimeout(t),o&&o()}}const Wn="/sound/sfx/scrubber.mp3",ar=.04,jn=28,Yn=.45;function Xn(e){const t=e.getChannelData(0),r=Math.max(1,Math.round(e.sampleRate*5e-4)),n=[];for(let a=0;a+r<=t.length;a+=r){let h=0;for(let y=0;y<r;y++)h+=t[a+y]*t[a+y];n.push(Math.sqrt(h/r))}const i=Math.max(...n,1e-9),s=[];let o=!0;for(let a=0;a<n.length;a++)if(o&&n[a]>i*.1){const h=Math.max(0,a-2);s.push({at:h*r/e.sampleRate,level:n[a],from:a}),o=!1}else!o&&n[a]<i*.02&&(o=!0);const l=Math.round(ar*e.sampleRate/r);for(const a of s)a.level=Math.max(...n.slice(a.from,a.from+l));return s.map(({at:a,level:h})=>({at:a,level:h}))}function Vn({volume:e=Yn}={}){const t=window.AudioContext||window.webkitAudioContext;if(!t)return{destroy:()=>{}};let r=null,n=null,i=[],s=[],o=null,l=null,a=0,h=0,y=e;const v=(async()=>{try{const w=await fetch(Wn);if(!w.ok)return;if(r=new t,n=await r.decodeAudioData(await w.arrayBuffer()),i=Xn(n),!i.length){n=null;return}const E=[...i].sort((L,d)=>L.level-d.level);l=E[E.length-1],o=E[Math.floor((E.length-1)/2)],s=E.slice(0,Math.max(1,Math.floor(E.length/2)))}catch{n=null}})(),I=w=>{const E=r.createBufferSource();E.buffer=n;const L=r.createGain();L.gain.value=y,E.connect(L).connect(r.destination),E.start(0,w.at,ar)},g=w=>{if(!n||y<=0)return;const E=performance.now();if(E-h<jn)return;h=E,r.state==="suspended"&&r.resume();const L=w.detail?.year??0;I(L%100===0?l:L%10===0?o:s[a++%s.length])};window.addEventListener("timemap-scrub",g);const m=window.__tune?.register("Scrub tick",[{key:"volume",label:"Volume",min:0,max:1,step:.05,value:y,apply:w=>{y=w}},{key:"try",type:"button",label:"Year · decade · century",apply:async()=>{await v,n&&(r.state==="suspended"&&r.resume(),[s[0],o,l].forEach((w,E)=>setTimeout(()=>w&&I(w),E*220)))}}],{tab:"Map"});return{destroy:()=>{window.removeEventListener("timemap-scrub",g),m&&m(),r&&r.close().catch(()=>{})}}}const or="/timemap/assets/mountains/",Kn="/timemap/mountains-points.geojson",ka=4;async function Zn(e,t){let r;try{const h=await fetch(`${or}${t}.svg`);if(!h.ok)return;r=await h.text()}catch{return}const i=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,s=(i.getAttribute("viewBox")||"0 0 24 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((s[2]||24)*ka)),l=Math.max(1,Math.round((s[3]||16)*ka)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(i));await new Promise(h=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:ka})}catch{}h()},y.onerror=()=>h(),y.src=a})}async function Jn(e,t={}){const{beforeId:r,opacity:n=1,visibility:i="visible"}=t;if(e.getLayer("mountains"))return;let s;try{s=await fetch(or+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!s||typeof s!="object"||nt(e))return;const o=[...new Set(Object.values(s).flat())];await Promise.all(o.map(a=>Zn(e,a)));let l;try{l=await fetch(Kn).then(a=>a.json())}catch{return}nt(e)||(e.getSource("mountains")?e.getSource("mountains").setData(l):e.addSource("mountains",{type:"geojson",data:l}),!e.getLayer("mountains")&&e.addLayer({id:"mountains",type:"symbol",source:"mountains",layout:{visibility:i,"icon-image":["coalesce",["get","icon"],"m-medium-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-rotation-alignment":"viewport","icon-rotate":["coalesce",["get","rot"],0],"icon-size":["interpolate",["linear"],["zoom"],2,["*",.2,["coalesce",["get","sz"],1]],5,["*",.46,["coalesce",["get","sz"],1]],7,["*",.66,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const rr="/timemap/assets/forests/",ei="/timemap/forest-points.geojson",Aa=4;async function ti(e,t){let r;try{const h=await fetch(`${rr}${t}.svg`);if(!h.ok)return;r=await h.text()}catch{return}const i=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,s=(i.getAttribute("viewBox")||"0 0 16 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((s[2]||16)*Aa)),l=Math.max(1,Math.round((s[3]||16)*Aa)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(i));await new Promise(h=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:Aa})}catch{}h()},y.onerror=()=>h(),y.src=a})}async function ai(e,t={}){const{beforeId:r,opacity:n=1,visibility:i="visible"}=t;if(e.getLayer("forests"))return;let s;try{s=await fetch(rr+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!s||typeof s!="object"||nt(e))return;const o=[...new Set(Object.values(s).flat())];await Promise.all(o.map(a=>ti(e,a)));let l;try{l=await fetch(ei).then(a=>a.json())}catch{return}nt(e)||(e.getSource("forests")?e.getSource("forests").setData(l):e.addSource("forests",{type:"geojson",data:l}),!e.getLayer("forests")&&e.addLayer({id:"forests",type:"symbol",source:"forests",layout:{visibility:i,"icon-image":["coalesce",["get","icon"],"g-small-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-size":["interpolate",["linear"],["zoom"],2,["*",.45,["coalesce",["get","sz"],1]],4,["*",.78,["coalesce",["get","sz"],1]],6,["*",1.05,["coalesce",["get","sz"],1]],7,["*",1.25,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const nr="/timemap/assets/scatter/",oi="/timemap/land-scatter.geojson",Sa=4;async function ri(e,t){let r;try{const h=await fetch(`${nr}${t}.svg`);if(!h.ok)return;r=await h.text()}catch{return}const i=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,s=(i.getAttribute("viewBox")||"0 0 16 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((s[2]||16)*Sa)),l=Math.max(1,Math.round((s[3]||16)*Sa)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(i));await new Promise(h=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:Sa})}catch{}h()},y.onerror=()=>h(),y.src=a})}async function ni(e,t={}){const{beforeId:r,opacity:n=.9,visibility:i="visible"}=t;if(e.getLayer("land-scatter"))return;let s;try{s=await fetch(nr+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!s||typeof s!="object"||nt(e))return;const o=[...new Set(Object.values(s).flat())];await Promise.all(o.map(a=>ri(e,a)));let l;try{l=await fetch(oi).then(a=>a.json())}catch{return}nt(e)||(e.getSource("land-scatter")?e.getSource("land-scatter").setData(l):e.addSource("land-scatter",{type:"geojson",data:l}),!e.getLayer("land-scatter")&&e.addLayer({id:"land-scatter",type:"symbol",source:"land-scatter",layout:{visibility:i,"icon-image":["coalesce",["get","icon"],"s-tree-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-rotation-alignment":"viewport","icon-rotate":["coalesce",["get","rot"],0],"icon-size":["interpolate",["linear"],["zoom"],2,["*",.34,["coalesce",["get","sz"],1]],5,["*",.8,["coalesce",["get","sz"],1]],7,["*",1.1,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const ir="/timemap/assets/volcanoes/",ii="/timemap/volcanoes.geojson",La=4;async function si(e,t){let r;try{const h=await fetch(`${ir}${t}.svg`);if(!h.ok)return;r=await h.text()}catch{return}const i=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,s=(i.getAttribute("viewBox")||"0 0 24 18").split(/\s+/).map(Number),o=Math.max(1,Math.round((s[2]||24)*La)),l=Math.max(1,Math.round((s[3]||18)*La)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(i));await new Promise(h=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:La})}catch{}h()},y.onerror=()=>h(),y.src=a})}async function li(e,t={}){const{beforeId:r,opacity:n=1,visibility:i="visible"}=t;if(e.getLayer("volcanoes"))return;let s;try{s=await fetch(ir+"manifest.json").then(l=>l.ok?l.json():null)}catch{}if(!s?.ids||nt(e))return;await Promise.all(s.ids.map(l=>si(e,l)));let o;try{o=await fetch(ii).then(l=>l.json())}catch{return}nt(e)||(e.getSource("volcanoes")?e.getSource("volcanoes").setData(o):e.addSource("volcanoes",{type:"geojson",data:o}),!e.getLayer("volcanoes")&&e.addLayer({id:"volcanoes",type:"symbol",source:"volcanoes",layout:{visibility:i,"icon-image":["coalesce",["get","icon"],"v-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-size":["interpolate",["linear"],["zoom"],2,.5,5,1.2,7,1.7]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}function ci(e,t){e.getLayer("volcanoes")&&e.setLayoutProperty("volcanoes","visibility",t?"visible":"none")}const ui="FeatureCollection",hi="Curated point markers for regions/peoples OpenHistoricalMap leaves blank. Label-only (no borders); clickable to start a lesson. Two enrichment modes: (a) `qid` = precise Wikidata enrichment via the endpoint; (b) `article_url` (+ optional `summary`, `inception`, `dissolution`) = a curated external article (e.g. worldhistory.org), rendered directly with no server call. decdate = numeric year, negative for BCE.",di=[{type:"Feature",geometry:{type:"Point",coordinates:[2.6,46.8]},properties:{id:"gaul",name:"Gaul",qid:"Q38060",start_decdate:-600,end_decdate:-51}},{type:"Feature",geometry:{type:"Point",coordinates:[10,51]},properties:{id:"germania",name:"Germania",qid:"Q62646",start_decdate:-750,end_decdate:400}},{type:"Feature",geometry:{type:"Point",coordinates:[-1.8,52.5]},properties:{id:"britannia",name:"Britannia",qid:"Q849967",start_decdate:-600,end_decdate:400}}],fi={type:ui,_note:hi,features:di},mi=JSON.parse(`[{"id":"cherusci","name":"Cherusci","qid":"Q268307","from":-30,"to":300,"shape":{"spine":[[9.179779286914936,52.267083561476284],[9.305414828022947,52.268511238079725],[9.383937041215347,52.267083561476284],[9.448182488372765,52.267083561476284],[9.52813237816855,52.267083561476284],[9.609509944568003,52.26565588487267],[9.67232771512181,52.26565588487267],[9.76369901774575,52.26565588487267]],"radius_km":110,"radius_note":"The middle Weser basin around the label, out to the Teutoburg ridge in the west and the northern Harz in the south-east. It deliberately stops short of the Elbe, which several sources reach — see the disagreements."},"provenance":{"summary":"Roughly right, edges guessed. The scholarly atlas prints the name across the middle Weser but draws no border, so the position is solid and the extent is ours.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line — no source draws an edge here, so neither do we.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/98939","grade":"A","year":2000,"note":"Map 10 F4. Gives the exact line the name is printed along, dated 30 BCE - 300 CE. It prints a name, not a border."},{"key":"tacitus","title":"Tacitus, Germania 36 and Annals 1.60 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/5/59/62-70","grade":"A","year":98,"note":"A primary source, and propaganda: Tacitus never went to Germania and wrote partly to shame Rome. He gives neighbours, not distances - Chatti to the south-west, Chauci to the north."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"A specialist historical-GIS project with a published bibliography. Maps the Cherusci at 1 CE as a bounded political entity."},{"key":"wikipedia","title":"Wikipedia, 'Cherusci', with the Commons map 'Lower Rhine 10BC.png'","url":"https://en.wikipedia.org/wiki/Cherusci","grade":"D","year":2025,"note":"The map on the article is credited 'own work' with no source in its file description, which is what puts it at D. Its text is well referenced; its map is not."}],"disagreements":[{"source":"euratlas","says":"Draws the Cherusci with a hard political border. The Barrington Atlas draws none at all. A crisp frontier here is a claim nobody can support - Germanic peoples had no surveyed borders."},{"source":"tacitus","says":"Implies the Cherusci reached east towards the Elbe and the Suebi beyond it. Our shape stops well short of the Elbe, so we are drawing them smaller than the written record allows."},{"source":"wikipedia","says":"Places them 'around the middle of the Weser' and stretching towards the Elbe - the same eastward reach we left out."}]}},{"id":"chatti","name":"Chatti","qid":"Q164076","from":-30,"to":300,"shape":{"spine":[[8.381212344516712,50.59658494521722],[8.521124651659477,50.69652230746209],[8.623917367111403,50.77647219725793],[8.753652521243907,50.86987099894725],[8.864297458015017,50.95374699940277],[9.04989541646978,51.08580708522635]],"radius_km":85,"radius_note":"The Hessian uplands the label runs through - the Eder, Fulda and Lahn valleys between the Wetterau and the Kassel basin. Smaller than the others because the label itself is drawn across a compact upland, not a plain."},"provenance":{"summary":"The firmest of this set. The atlas line, the Roman writers and the modern maps all put the Chatti in the same place - what is now Hesse.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/108885","grade":"A","year":2000,"note":"Map 11 I2. The label runs south-west to north-east across Hesse, dated 30 BCE - 300 CE."},{"key":"tacitus","title":"Tacitus, Germania 30-31 and 36 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/35/359-365","grade":"A","year":98,"note":"A primary source, and propaganda. Puts the Chatti where the Hercynian forest begins, on higher and harder ground than their neighbours - which matches the uplands the atlas label crosses."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps the Chatti at 1 CE as a bounded political entity in the same region."},{"key":"wikipedia","title":"Wikipedia, 'Chatti'","url":"https://en.wikipedia.org/wiki/Chatti","grade":"C","year":2025,"note":"'A region approximately corresponding to the modern German state of Hesse' - well referenced text, and it agrees with the atlas."}],"disagreements":[{"source":"barrington-awmc","says":"The Pleiades record's own summary describes the Chatti homeland as 'the valley of the Weser River'. The Eder and Fulda do drain into the Weser system, but the peoples' heartland is the Hessian uplands, not the Weser valley proper. We follow the atlas LINE, not that sentence."},{"source":"euratlas","says":"Draws a hard political border. The atlas draws none."}]}},{"id":"marcomanni","name":"Marcomanni","qid":"Q209851","from":-9,"to":300,"date_note":"The atlas dates its label 30 BCE - 300 CE, but the shape it marks is BOHEMIA, and the Marcomanni only moved into Bohemia under Maroboduus around 9 BCE. Dating a Bohemian shape to 30 BCE would put the people somewhere they were not yet, so the start is the migration, not the label.","shape":{"spine":[[13.571490978850932,50.51861793959273],[13.876061987597211,50.48245013230428],[14.0683224368683,50.459607306648195],[14.26248645494394,50.43486091218767],[14.449036197800922,50.40821094892232],[14.656525197509382,50.36633243521959],[14.86020705960857,50.328261059126305],[15.04866037127016,50.286382545423805],[15.254245802174012,50.2387933253072],[15.456024095468365,50.18549339877649]],"radius_km":90,"radius_note":"The Bohemian basin the label crosses. Note the label runs along the NORTHERN rim of that basin, so a symmetric radius around it reaches over the Ore Mountains into Saxony and stops short of southern Bohemia. Both edges are wrong in the same way and by the same amount, which is what one honest rule costs; neither is a frontier."},"provenance":{"summary":"Good for the Marcomannic Wars, wrong if you scrub back before 9 BCE. This is their Bohemian homeland - before that they lived further west and we do not draw them there.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line, checked against the Bohemian basin the label sits in.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/118831","grade":"A","year":2000,"note":"Map 12 G2. The label runs north-west to south-east across northern Bohemia."},{"key":"tacitus","title":"Tacitus, Germania 42 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268#42","grade":"A","year":98,"note":"A primary source, and propaganda. Names the Marcomanni and Quadi as the front rank facing the Danube, and says the Marcomanni took their land by driving out the Boii."},{"key":"tir-m33","title":"Tabula Imperii Romani M33: Castra Regina - Vindobona - Carnuntum","url":"http://www.worldcat.org/oclc/311333372","grade":"A","year":1986,"note":"The scholarly atlas sheet for this stretch of the Danube frontier, pp. 55-58. Cited by Pleiades for this people; consulted through that citation rather than the sheet itself."},{"key":"wikipedia","title":"Wikipedia, 'Marcomanni'","url":"https://en.wikipedia.org/wiki/Marcomanni","grade":"C","year":2025,"note":"Well referenced text: originally near the central Elbe and Saale or in Franconia, moving to Bohemia after a defeat around 9 BCE."}],"disagreements":[{"source":"wikipedia","says":"Puts their ORIGINAL home near the central Elbe and Saale, or possibly Franconia - hundreds of kilometres west of where we draw them. That is a disagreement about the date, not the place: we draw the Bohemia they moved to, and start the shape at the move."},{"source":"barrington-awmc","says":"Dates its label from 30 BCE, twenty years before the migration it marks. We start at 9 BCE instead."}]}},{"id":"suebi-elbe","name":"Suebi","qid":"Q155085","from":-330,"to":400,"shape":{"spine":[[10.994832142162466,53.10370205112616],[11.297023689902744,52.85385864551398],[11.534969790485775,52.658742843035895],[11.751500742016333,52.45648865754032],[12.001344147628515,52.20902471293397],[12.208971949229067,52.01315739735486],[12.393380177180916,51.83469782191759],[12.631326277763947,51.638392288936586],[12.827631810744947,51.471830018528465],[13.012040038696796,51.317165053149495],[13.220242876706948,51.10301356262477]],"radius_km":140,"radius_note":"The middle Elbe corridor the label follows. Wider than the others because the label itself is 250 km long, and still far smaller than anything Tacitus describes."},"provenance":{"summary":"Treat this one with caution. 'Suebi' was an umbrella for many peoples spread over half of Germania, so no single shape is right. This is their Elbe homeland only - it is where the name starts, not where the Suebi were.","confidence":"low","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line. The shape is knowingly narrower than the sources allow, because the alternative - shading half of Europe - would be more misleading, not less.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/99040","grade":"A","year":2000,"note":"Map 10 H3. The label runs 250 km down the middle Elbe, from Mecklenburg to Saxony, dated 330 BCE - 640 CE."},{"key":"tacitus","title":"Tacitus, Germania 38-45 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268","grade":"A","year":98,"note":"A primary source, and propaganda. Treats Suebi as a category rather than a people: he says they hold the greater part of Germania and then lists a dozen separate peoples inside it."},{"key":"caesar","title":"Caesar, Bellum Gallicum 1 and 4 - Ariovistus and the Suebi on the Rhine, 58 BCE","url":"https://en.wikipedia.org/wiki/Suebi","grade":"A","year":-51,"note":"A primary source. Caesar's Suebi are on the RHINE, some 500 km west of the Elbe homeland - consulted through the Wikipedia article's citations rather than the Latin text."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps Suebi at 1 CE as a bounded political entity, alongside separate entities for Cherusci, Chatti and Quadi."}],"disagreements":[{"source":"tacitus","says":"Says the Suebi hold the greater part of Germania - many times the area we shade. Following him would mean colouring in most of central Europe under one name, which is worse history, not better."},{"source":"caesar","says":"Meets Suebi on the Rhine in 58 BCE, roughly 500 km west of anything we draw. Our shape would show nothing at all where Caesar actually fought them."},{"source":"barrington-awmc","says":"Dates the label to 640 CE. We stop at 400, because by then the name has moved to entirely different people in Iberia - Cliopatria already carries that Kingdom of the Suebi (Q1048918) as a separate territory from 414."}]}},{"id":"quadi","name":"Quadi","qid":"Q308885","from":-30,"to":400,"shape":{"spine":[[16.847541814656722,48.9466577607958],[17.124154156584495,48.88122258313547],[17.350202952138375,48.83660768927598],[17.579226073949542,48.79199279541683],[17.867735720906467,48.73548059652836]],"radius_km":65,"radius_note":"The March and lower Vah valleys the label follows. Tighter than the others, and the number was chosen by the Danube rather than by taste: the river is a real southern edge here - it is the Roman frontier - so the radius is the largest one that keeps the shape north of it at Bratislava."},"provenance":{"summary":"The Marcomanni's neighbours and allies in the wars against Marcus Aurelius. Position is solid, extent is ours, and the Danube to the south is a genuine edge rather than a guessed one.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line, kept north of the Danube.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/128501","grade":"A","year":2000,"note":"Map 13 B4. The label runs west to east along the March, dated 30 BCE - 640 CE."},{"key":"tacitus","title":"Tacitus, Germania 42 and Annals 2.63 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268#41","grade":"A","year":98,"note":"A primary source, and propaganda. Pairs the Quadi with the Marcomanni as the peoples facing the Danube frontier."},{"key":"tir-m33","title":"Tabula Imperii Romani M33: Castra Regina - Vindobona - Carnuntum","url":"http://www.worldcat.org/oclc/311333372","grade":"A","year":1986,"note":"The scholarly atlas sheet for this stretch of the Danube frontier, pp. 69-71. Cited by Pleiades for this people; consulted through that citation rather than the sheet itself."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps the Quadi at 1 CE as a bounded political entity in the same region."}],"disagreements":[{"source":"barrington-awmc","says":"Dates the label to 640 CE, long after the Quadi disappear from the record. We stop at 400, around their move west with the Vandals and Alans."},{"source":"euratlas","says":"Draws a hard political border. The atlas draws none."}]}}]`),sr={territories:mi},Ma=111.32,_o=64,pi=e=>e*Math.PI/180,gi=e=>{const t=e.reduce((n,[,i])=>n+i,0)/e.length,r=Ma*Math.cos(pi(t));return{forward:([n,i])=>[n*r,i*Ma],inverse:([n,i])=>[n/r,i/Ma]}},yi=e=>{if(e.length<3)return[...e];const t=[...e].sort((i,s)=>i[0]-s[0]||i[1]-s[1]),r=(i,s,o)=>(s[0]-i[0])*(o[1]-i[1])-(s[1]-i[1])*(o[0]-i[0]),n=i=>{const s=[];for(const o of i){for(;s.length>=2&&r(s[s.length-2],s[s.length-1],o)<=0;)s.pop();s.push(o)}return s.pop(),s};return[...n(t),...n([...t].reverse())]},bi=(e,t)=>{const{forward:r,inverse:n}=gi(e),i=[];for(const o of e){const[l,a]=r(o);for(let h=0;h<_o;h++){const y=h/_o*2*Math.PI;i.push([l+t*Math.cos(y),a+t*Math.sin(y)])}}const s=yi(i).map(n);return s.length?[...s,s[0]]:s},wi=e=>({type:"Feature",id:e.id,properties:{id:e.id,Name:e.name,Wikidata:e.qid,FromYear:e.from,ToYear:e.to,Type:"POLITY",hand:!0,confidence:e.provenance.confidence},geometry:{type:"Polygon",coordinates:[bi(e.shape.spine,e.shape.radius_km)]}}),xo=e=>{let t=0;for(let r=0,n=e.length-1;r<e.length;n=r++)t+=e[n][0]*e[r][1]-e[r][0]*e[n][1];return Math.abs(t/2)},vi=()=>({type:"FeatureCollection",features:sr.territories.map(wi).sort((e,t)=>xo(t.geometry.coordinates[0])-xo(e.geometry.coordinates[0]))}),_i=e=>sr.territories.find(t=>t.id===e)??null,xi=e=>_i(e)?.provenance??null,Ei="#f3ead6",Ti="#d8e9f3",ki=["#c9b79c","#a8b9a0","#cbb3a1","#b6a8c0","#c2c0a0","#a9bcc4","#d0bfa8","#b9a99a","#aebfa6","#c8b6b0","#b0b6a0","#bcae9e"],Ai="#f5c518",Si="#ecd9a0",Li={normal:.7,selected:.95},Mi={color:"#000",width:.4,opacity:.7},Ri={color:"#3b3326",halo:"#f3ead6"},ae={land:Ei,water:Ti,palette:ki,selected:Ai,hover:Si,fillOpacity:Li,line:Mi,text:Ri},Pi=[{qid:"Q207162",use:"Q70972",note:"Kingdom of France lineage (990-1847) carries the Bourbon Restoration period item; use the Kingdom of France item"},{qid:"Q112039853",use:"Q12544",note:"Byzantine Empire polygons (633-1474) carry 'Foreign relations of the Byzantine Empire'; use the Byzantine Empire item"},{qid:"Q1179",use:"Q7703611",note:"Aquitaine 629-895 carries the 1960-2015 French administrative region; use the Duchy of Aquitaine"},{qid:"Q124661",use:"Q225890",note:"Strathclyde 644-1033 carries the 1975-1996 Scottish council region; use the Kingdom of Strathclyde"},{qid:"Q1656775",use:"Q37",note:"Interwar 'Kingdom of Lithuania' 1919-1939 carries the 1251-1263 medieval kingdom; use the Lithuania country item"},{qid:"Q751868",use:"Q159856",note:"County of Brabant 1260-1430 carries the 1085-1183 Landgraviate; use the Duchy of Brabant"},{qid:"Q12544",name:"Roman Empire",use:"Q2277",from:-31,to:394,note:"Roman Empire polygons share the Byzantine Empire QID; Eastern Roman Empire (395-632) keeps Q12544"},{qid:"Q1068371",name:"Han Dynasty",use:"Q7209",from:-202,to:237,note:"QID is the Chauhan dynasty (980-1201 keeps it); Han polygons get the Han dynasty item"},{qid:"Q1968654",name:"Han",use:"Q1574130",from:-404,to:-203,note:"QID is the Beylik of Saruhan (1314-1414 keeps it); Warring-States Han state"},{qid:"Q555994",name:"Lu",use:"Q736936",from:-750,to:-248,note:"QID is Aq Qoyunlu (1407-1511 keeps it); Lu state"},{qid:"Q1143524",name:"Qi",use:"Q837855",from:-750,to:-204,note:"QID is Northern Qi (555-576 keeps it); Qi state"},{qid:"Q1471995",name:"Qin",use:"Q34756",from:-750,to:-219,note:"QID is Former Qin (353-393 keeps it); Qin state"},{qid:"Q1472004",name:"Yan",use:"Q1055713",from:-750,to:-204,note:"QID is Former Yan (337-370 keeps it); Yan state"},{qid:"Q1574107",name:"Zhao",use:"Q197430",from:-404,to:-226,note:"QID is Former Zhao (306-336 keeps it); Zhao state"},{qid:"Q320930",name:"Wei",use:"Q912052",from:-404,to:-204,note:"QID is Cao Wei (224-264 keeps it); Warring-States Wei state"},{qid:"Q6201794",name:"Jin",use:"Q912043",from:-750,to:-405,note:"QID is the 10th-century Jin / Later Tang precursor (922-925 keeps it); Spring-and-Autumn Jin state"},{qid:"Q1936158",name:"Yue",use:"Q1137403",from:-500,to:-334,note:"QID is Minyue (-333 to -111 keeps it); Yue state"},{qid:"Q1139807",name:"Portugal",use:"Q45",note:"QID is the County of Portugal (1139-1146 keeps it); modern Portugal polygons (1976-2024) get the Portugal country item, which already has a list row"},{qid:"Q241748",use:"Q2415003",note:"Kingdom of Serbia polygons are 18x medieval (1188-1351) + one 1880-1884; QID is the 1882-1918 kingdom. Medieval item wins; the lone modern segment trades accuracy"},{qid:"Q688918",use:"Q75036",note:"Grand Duchy of Krakow 1279-1293 carries the 1846-1918 grand duchy; use the medieval Seniorate Province"},{qid:"Q79861",use:"Q2605410",note:"Michoacan 1305-1533 carries the modern Mexican state; the polity is the Purepecha (Tarascan) Empire"},{qid:"Q30592233",use:"Q48724193",note:"Pahang 1853-1889 carries the 1470-1623 old sultanate; use the Bendahara-era Pahang Kingdom (1770-1881)"},{qid:"Q109252949",use:"Q158445",note:"Duchy of Mecklenburg 1806-1870 carries the 1471-1701 duchy; use the Grand Duchy of Mecklenburg-Schwerin"},{qid:"Q373981",use:"Q2342941",note:"Tahirid Sultanate (Yemen, 1459-1515) carries the Iranian Tahirid dynasty (821-873); use the Yemeni Tahirid Sultanate"},{qid:"Q970940",use:"Q5311396",note:"Duchy of Leczyca carries the 1339-1793 Leczyca Voivodeship; use the medieval Duchy of Leczyca"},{qid:"Q13522657",use:"Q1541813",note:"County of Rosellon 896-1176 carries the 1659-1790 French province; use the County of Roussillon"},{qid:"Q5582862",use:"Q2314963",note:"Cuzco 1294-1439 carries the modern city of Cusco; the polity is the Kingdom of Cusco"},{qid:"Q1074947",use:"Q2390716",note:"'Kingdom of Pajana' 1572-1587 carries the Lontara script item; the polity is the Kingdom of Pajang (Java)"},{qid:"Q1069868",use:"Q1330290",note:"Southern Liang 397-413 carries the 502-587 Liang dynasty; use Southern Liang of the Sixteen Kingdoms"},{qid:"Q200797",use:"Q517333",note:"Principality of Polotsky carries the city of Polotsk; use the Principality of Polotsk"},{qid:"Q7038",use:"Q1233672",note:"County of Barcelona carries the city of Girona; use the County of Barcelona"},{qid:"Q17151",use:"Q2631829",note:"Commune of the Zealots 1344-1351 carries the city of Thessaloniki; use the Zealots of Thessalonica"},{qid:"Q156173",use:"Q102679",note:"Kingdom of Numidia carries king Jugurtha's biography; use the Numidia kingdom item"},{qid:"Q202266",use:"Q2196956",note:"Old Kingdom of Norway 866-1401 carries Margaret I's biography; use the Kingdom of Norway (872-1397)"},{qid:"Q4334533",use:"Q22684779",note:"Omani Slave Coast 1814-1855 carries the Omanis ethnic-group item; use the Omani Empire (1696-1856)"},{qid:"Q2330335",use:"Q815677",note:"Qarlugs 793-849 carries a Mongol-campaigns article; use the Karluks"},{qid:"Q5261548",use:"Q85816686",note:"Qasimids 1636-1802 carries the broader Rassid line; use the Qasimid State (1597-1849)"},{qid:"Q1050326",use:"Q2114397",note:"Sultan of Yogyakarta 1744-1829 carries the Hamengkubuwono dynasty item; use the Yogyakarta Sultanate"},{qid:"Q654380",use:"Q39047075",note:"Turk Shahis carries a disambiguation page; use the Turk Shahis kingdom item"},{qid:"Q81133615",use:"Q2991084",note:"Angevins 1126-1146 carries a disambiguation page; use the County of Anjou"},{qid:"Q5724",use:"Q13627537",note:"Anuradhapura -291 to 1017 carries the modern city; use the Anuradhapura period (kingdom era)"},{qid:"Q7903",use:"Q808139",note:"Barghawata Conference 793-1065 carries the city of Casablanca; use the Barghawata confederation"},{qid:"Q11256",use:"Q133878465",note:"Cuban Nationalists 1895-1899 carries Fidel Castro's biography; use the Republic of Cuba in Arms (1868-1898)"},{qid:"Q371402",use:"Q11264",note:"Cuban Communists 1958-1959 carries the 1965 Communist Party; use the Cuban Revolution"},{qid:"Q5428692",use:"Q214426",note:"Maderistas 1911 carries a Wikimedia list article; use the Mexican Revolution"},{qid:"Q2984183",use:"Q353227",note:"Duchies of Poland 1279-1304 carries the Testament of Boleslaw III item; use History of Poland during the Piast dynasty"},{qid:"Q1317991",use:"Q430309",note:"Dai Viet 1529-1833 carries the Mac dynasty (1527-1677 only); use the Dai Viet umbrella item"},{qid:"Q15984928",use:"Q371334",note:"Mexican Monarchists 1864 carries the Conservative Party; use the Second Mexican Empire, which already has a list row"},{qid:"Q7777597",use:"Q5760",note:"Thebans -350 to -338 carries a disambiguation page; use Thebes, Greece"},{qid:"Q3125978",use:"Q12491027",note:"Bali 1687-1907 carries the modern Indonesian province; use the Bali Kingdom item, which already has a list row"},{qid:"Q213763",use:"Q3137677",note:"County of Bearn 1385-1452 carries the 1620-1790 French province; use the Viscounty of Bearn"},{qid:"Q43292",use:"Q892292",note:"Sultanate of Bone 1512-1858 carries the generic 'Sultan' title item; use the Bone State (Sulawesi)"},{qid:"Q2118293",use:"Q83328",note:"'Turks' 666-756 carries the legendary Oghuz Khagan biography; use the Turkic peoples item (no single-polity article covers these polygons)"},{qid:"Q1661685",name:"Sasanian Empire",use:"Q83891",from:215,to:643,note:"QID is the Kushano-Sasanian Kingdom ('Indo-Sasanian Empire' 260-357 keeps it); the main Sasanian Empire polygons get the Sasanian Empire item"},{qid:"Q918153",name:"Ceylon",use:"Q20987440",from:1236,to:1506,note:"QID is British Ceylon (1796-1814 polygons keep it); medieval Ceylon gets the Sinhalese monarchy umbrella"},{qid:"Q2118293",name:"Oghuz Turks",use:"Q494462",from:750,to:1055,note:"QID is the legendary Oghuz Khagan; Oghuz Turks polygons get the Oghuz Turks item ('Turks' 666-756 keeps the qid-only override above)"},{qid:"Q350186",name:"Denmark",use:"Q35",from:1945,to:2024,note:"QID is Christopher II of Denmark's biography ('Danish Magnates' 1333-1351 keeps it as interregnum context); modern Denmark polygons get the Denmark country item"},{qid:"Q28513",name:"Hungary",use:"Q28",from:1947,to:2024,note:"QID is Austria-Hungary (1868-1918 polygons keep it); modern Hungary polygons get the Hungary country item, which already has a list row"},{qid:"Q59223",use:"Q197913",note:"Zhongshan (Warring-States, Hebei, -366 to -292) carries the modern Zhongshan city in Guangdong; use the Zhongshan state item"},{qid:"Q983",name:"Guinea",use:"Q1006",from:1960,to:2024,note:"QID is Equatorial Guinea (its 1969-2024 polygons keep it); Guinea-Conakry polygons get the Guinea country item"},{qid:"Q175881",use:"Q17167",note:"Roman Republic polygons (-500 to -32) carry Q175881, the 1798-1799 sister republic of the First French Republic; use the ancient Roman Republic (509-27 BC)"}],Ci={overrides:Pi},Qa={day:0,month:1,year:2},Di=(e,t)=>Qa[e]>=Qa[t]?e:t,Eo=e=>e in Qa?e:"day",Ii=e=>{const t=Eo(e?.date_precision),r=[];for(const n of e?.legs??[]){const[i,s]=Array.isArray(n?.wp)?n.wp:[];for(const[o,l,a]of[[i,n.depart,n.depart_precision],[s,n.arrive,n.arrive_precision]]){const h=Date.parse(l);!Number.isFinite(Number(o))||!Number.isFinite(h)||r.push({wp:Number(o),ms:h,precision:a?Eo(a):t})}}return r.sort((n,i)=>n.wp-i.wp||n.ms-i.ms)},To=(e,t)=>{const r=e.cum.length-1,n=Math.max(0,Math.min(r,t)),i=Math.min(r-1,Math.floor(n));return i<0?0:e.cum[i]+(e.cum[i+1]-e.cum[i])*(n-i)},lr=(e,t,r)=>{const n=Ii(e);if(!n.length||!Array.isArray(t)||t.length<2)return null;const i=gn(t),s=To(i,r),o=T=>To(i,T.wp*Zo),l=1e-9;let a=null,h=null;for(const T of n){const v=o(T);v<=s+l&&(a=T),v>=s-l&&!h&&(h=T)}if(!a||!h)return null;if(a===h||o(h)-o(a)<=l)return{ms:a.ms,precision:a.precision};const y=(s-o(a))/(o(h)-o(a));return{ms:Math.round(a.ms+(h.ms-a.ms)*y),precision:Di(a.precision,h.precision)}},cr=(e,t="en")=>{if(!e||!Number.isFinite(e.ms))return"";const r=String(t||"en").replace("_","-").toLowerCase()==="en"?"en-GB":t,n=new Date(e.ms),i=n.getUTCFullYear()<=0,s={timeZone:"UTC",year:"numeric"};e.precision!=="year"&&(s.month="long"),e.precision==="day"&&(s.day="numeric"),i&&(s.era="short");try{return new Intl.DateTimeFormat(r,s).format(n)}catch{return new Intl.DateTimeFormat("en-GB",s).format(n)}},Fi=(e,t,r)=>{if(!Array.isArray(e)||e.length<2)return null;const n=Math.cos(r*Math.PI/180);let i=null;for(let s=1;s<e.length;s++){const[o,l]=e[s-1],[a,h]=e[s],y=t+360*Math.round((o-t)/360),T=(a-o)*n,v=h-l,I=T*T+v*v,g=I>0?Math.max(0,Math.min(1,((y-o)*n*T+(r-l)*v)/I)):0,m=o+(a-o)*g,w=l+(h-l)*g,E=Math.hypot((y-m)*n,r-w);(!i||E<i.distance)&&(i={sample:s-1+g,lng:m,lat:w,distance:E})}return i},ur=new Set((pn?.transports??[]).filter(e=>e?.terrain==="land").map(e=>e.id)),hr=(e,t)=>{const r=t/Zo;return(e?.legs??[]).find(n=>{const i=Number(n?.wp?.[0]),s=Number(n?.wp?.[1]??i);return r>=Math.min(i,s)-1e-6&&r<=Math.max(i,s)+1e-6})??null},Ui=(e,t)=>{const r=hr(e,t);return r&&ur.has(r.transport)?r.transport:null},Ni=(e,t)=>{const r=hr(e,t);return r&&!ur.has(r.transport)&&r.vessel?String(r.vessel):null},Oi=18,Bi=450,ko=new Map(zt.voyages.map(e=>[e.id,{voyage:e,coords:ca(e.waypoints)}])),Qi=e=>(e.fleet??[]).slice().sort((t,r)=>+!!r.flagship-+!!t.flagship).map(t=>t.name).filter(Boolean).join(", "),qi=e=>{const t=document.createElement("div");t.className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-64 rounded-card bg-card-surface px-3 py-2",t.style.display="none",t.setAttribute("role","status"),t.setAttribute("aria-live","polite"),t.dataset.voyageHoverLabel="";const r=document.createElement("p");r.className="text-xs font-medium leading-snug text-card-muted";const n=document.createElement("p");return n.className="text-prose font-semibold leading-snug text-card-title",t.append(r,n),e.appendChild(t),{el:t,names:r,date:n}};function Hi(e,{ships:t,locale:r="en",transportNames:n={},onDwell:i=null}={}){const s=e.getContainer().parentElement||e.getContainer(),o=qi(s);let l=null,a=null,h=null,y=0,T=null,v=null,I=0;const g=()=>{I&&window.clearTimeout(I),I=0,v=null},m=()=>{g(),!T&&(a&&t()?.setTourProgress(a,null),a=null,o.el.style.display="none")},w=(d,c,O,N)=>{const A=lr(d.voyage,d.coords,c),z=Ui(d.voyage,c);o.names.textContent=z&&n[z]||Ni(d.voyage,c)||Qi(d.voyage)||d.voyage.name,o.date.textContent=A?cr(A,r):String(d.voyage.years??"").replace(/\s+—\s+/g,": ");const p=e.project([O,N]),H=e.getCanvas().getBoundingClientRect(),G=s.getBoundingClientRect();o.el.style.display="";const{offsetWidth:$,offsetHeight:C}=o.el,D=H.left-G.left+p.x-$/2,k=H.top-G.top+p.y-C-Oi;o.el.style.transform=`translate(${Math.round(D)}px, ${Math.round(k)}px)`},E=(d,c)=>{if(T)return;const O=ko.get(d);if(!O)return m();const N=Fi(O.coords,c.lng,c.lat);if(!N)return m();const A=t();a&&a!==d&&A?.setTourProgress(a,null),A?.fractionAtSample&&(A.setTourProgress(d,A.fractionAtSample(d,N.sample)),a=d),w(O,N.sample,N.lng,N.lat),i&&v!==d&&(g(),v=d,I=window.setTimeout(()=>{I=0,i(d)},Bi))},L=()=>{y=0;const d=h;h=null,d?.id?E(d.id,d.lngLat):m()};return e.on("mousemove","voyage-hit",d=>{e.getCanvas().style.cursor="pointer",h={id:d.features?.[0]?.properties?.id,lngLat:d.lngLat},y||(y=requestAnimationFrame(L))}),e.on("mouseleave","voyage-hit",()=>{e.getCanvas().style.cursor="",h=null,y&&(cancelAnimationFrame(y),y=0),m()}),e.on("movestart",m),{select(d){l=d||null,mo(e,l)},clear(){l!==null&&(l=null,mo(e,null))},get selected(){return l},play(d,c=0){if(!d){T=null,m();return}const O=t(),N=ko.get(d);if(!O||!N)return;a&&a!==d&&O.setTourProgress(a,null),T=d,a=d,O.setTourProgress(d,c);const A=O.pointAt(d,c);A&&w(N,O.sampleAtFraction(d,c),A.lng,A.lat)},destroy(){m(),o.el.remove()}}}const dr="/timemap/voyages",ia=new Map,ot=(e,t)=>!e||typeof e!="object"?typeof e=="string"?e:"":e[t]||e.en||"",Gi=(e,t)=>{const r=o=>Number.isFinite(o);if(!r(e.born)&&!r(e.died))return"";const n=(r(e.born)?e.born:e.died)<=0,i=(o,l)=>r(o)?`${l?"c. ":""}${o<=0?1-o:o}`:"?",s=n?t==="nl"?" v.Chr.":" BCE":"";return`${i(e.born,e.born_approx)}–${i(e.died,e.died_approx)}${s}`},$i=e=>String(e||"").split(/\s+/).filter(t=>new RegExp("^\\p{Lu}","u").test(t)).slice(0,2).map(t=>t[0]).join("")||String(e||"?")[0],Ao=e=>[e.creator,e.year,e.licence].filter(Boolean).join(", "),zi=(e,t,r="en")=>{const n=`${dr}/${encodeURIComponent(e.id)}/`,i=s=>s&&s.file?{src:n+encodeURIComponent(s.file),width:s.width||null,height:s.height||null,title:s.title||"",caption:ot(s.caption,r)||s.title||"",credit:Ao(s),source_url:s.source_url||null}:null;return{voyage:!0,voyageId:e.id,label:String(t?.name??e.id).replace(/\s+—\s+/g,": "),inception:t?.year_start??null,dissolution:t?.year_end??null,summary:null,flag_path:null,predecessor:null,successor:null,wikipedia_url:ot(e.wikipedia,r)||null,story:[{key:"purpose",text:ot(e.purpose,r)},{key:"crew",text:ot(e.crew,r)},{key:"legacy",text:ot(e.legacy,r)}].filter(s=>s.text),moments:(e.moments??[]).map((s,o)=>({key:`${s.date}-${o}`,date:cr({ms:Date.parse(s.date),precision:s.precision||"day"},r),year:new Date(Date.parse(s.date)).getUTCFullYear(),text:ot(s,r)})),gallery:(e.images??[]).map(i).filter(Boolean),figures:(e.people??[]).map((s,o)=>({qid:s.qid||null,key:s.qid||`person-${o}`,name:s.name,kind:ot(s.role,r),era:Gi(s,r),lines:ot(s,r),image_url:s.image?.file?n+encodeURIComponent(s.image.file):null,credit:s.image?Ao(s.image):"",initials:$i(s.name)})),sources:(e.sources??[]).map(s=>({key:s.key,title:s.title,url:s.url}))}},Wi=async(e,t="en")=>{const r=String(t||"en").slice(0,2).toLowerCase(),n=zt.voyages.find(i=>i.id===e);if(!n)throw new Error(`unknown voyage ${e}`);return ia.has(e)||ia.set(e,fetch(`${dr}/${encodeURIComponent(e)}/card.json`).then(i=>{if(!i.ok)throw new Error(`HTTP ${i.status}`);return i.json()}).catch(i=>{throw ia.delete(e),i})),zi(await ia.get(e),n,r)},ji=[{family:"France",color:"#4a6db3",qids:["Q207162","Q146246","Q58296","Q877619","Q219817","Q71084","Q58326","Q71092","Q70802","Q69829","Q200686","Q152582","Q69808","Q19951607","Q3561","Q3769","Q271894","Q646374","Q185682","Q5501836","Q139708","Q170604","Q1353951"]},{family:"Netherlands",color:"#d9782d",qids:["Q170072","Q55","Q774783","Q25227","Q188161","Q221283","Q1841483","Q382593","Q4807130"]},{family:"Spain",color:"#d1a437",qids:["Q29","Q80702","Q377350","Q497777","Q178038","Q13474305","Q2742116","Q600093"]},{family:"Castile",color:"#b3823a",qids:["Q179293","Q217196"]},{family:"Aragon",color:"#c9953f",qids:["Q1235737","Q199442","Q204920"]},{family:"England-Britain",color:"#b5493c",qids:["Q784963","Q200485","Q179876","Q330362","Q23666","Q8680","Q46395","Q129286","Q179848","Q370736","Q918153","Q876185"]},{family:"Scotland",color:"#52709b",qids:["Q230791"]},{family:"Portugal",color:"#4f7f57",qids:["Q1139807","Q45670","Q45","Q200464","Q16879646","Q1709007"]},{family:"Holy Roman Empire",color:"#94879b",qids:["Q12548"]},{family:"Habsburg-Austria",color:"#c2a24e",qids:["Q66504140","Q65968","Q131964","Q28513","Q40","Q187830"]},{family:"Prussia",color:"#5f646d",qids:["Q153091","Q157367","Q27306"]},{family:"Rome",color:"#9d4038",qids:["Q175881","Q12544","Q42834"]},{family:"Byzantium",color:"#7b559b",qids:["Q112039853"]},{family:"Ottomans",color:"#3f7468",qids:["Q12560","Q1529261"]},{family:"Umayyads",color:"#c5b183",qids:["Q8575586"]},{family:"Abbasids",color:"#4c5a50",qids:["Q12536"]},{family:"Russia",color:"#3f6b4c",qids:["Q186096","Q34266","Q139319","Q159","Q1108445"]},{family:"Sweden",color:"#5d89c4",qids:["Q34","Q322187","Q62589"]},{family:"Denmark",color:"#99414b",qids:["Q35","Q756617","Q62651","Q111953993"]},{family:"Norway",color:"#8c5364",qids:["Q20","Q202266"]},{family:"Poland",color:"#bd6a5e",qids:["Q577867","Q36","Q2984183","Q1515009","Q172107"]},{family:"Germany",color:"#6d7078",qids:["Q43287","Q41304","Q7318","Q713750","Q183"]},{family:"Hungary",color:"#8fa156",qids:["Q171150","Q2899771","Q28"]},{family:"Bohemia",color:"#77628b",qids:["Q2162698","Q42585"]},{family:"Venice",color:"#4e8891",qids:["Q4948"]},{family:"Genoa",color:"#8f5560",qids:["Q174306"]},{family:"Bulgaria",color:"#5e7f4e",qids:["Q191484","Q203817","Q420759","Q185488","Q815731","Q147909","Q121932"]},{family:"Serbia",color:"#8d6079",qids:["Q241748","Q1311990","Q1406298","Q878319","Q37024"]},{family:"China",color:"#c2803f",qids:["Q9683"]},{family:"China-Ming",color:"#c99435",qids:["Q9903","Q1198163"]},{family:"China-Qing",color:"#b06f3f",qids:["Q8733"]},{family:"China-Han",color:"#b8763d",qids:["Q1068371"]},{family:"Mongols",color:"#8a6a53",qids:["Q12557","Q19927420"]},{family:"Japan",color:"#c46a6a",qids:["Q188712","Q210688","Q193292","Q189178","Q204023"]},{family:"Mughals",color:"#57856b",qids:["Q33296"]},{family:"Maurya",color:"#a3814f",qids:["Q62943"]},{family:"Persia",color:"#6f5b8e",qids:["Q389688","Q1661685","Q161205"]},{family:"Inca",color:"#b7893f",qids:["Q28573"]},{family:"Aztec",color:"#86754a",qids:["Q2608489"]},{family:"United States",color:"#567aa9",qids:["Q30"]}],Yi={families:ji},We=(e,t,r=0)=>{const n=1+Math.max(0,r)/pa,i=t*Math.PI/180,s=e*Math.PI/180;return[Math.cos(i)*Math.cos(s)*n,Math.sin(i)*n,Math.cos(i)*Math.sin(s)*n]},Xi=e=>(2*Math.atan(Math.exp((1-2*e)*Math.PI))-Math.PI/2)*180/Math.PI,So=e=>.5-Math.log(Math.tan(Math.PI/4+e*Math.PI/180/2))/(2*Math.PI),Lo=85.0511287798066,Vi=89.999,Ra=6,ga=(e=64,t=48)=>{const r=[],n=[],i=[],s=a=>Lo+(Vi-Lo)*(a/Ra),o=[];for(let a=Ra;a>=1;a--)o.push(So(s(a)));for(let a=0;a<=t;a++)o.push(a/t);for(let a=1;a<=Ra;a++)o.push(So(-s(a)));for(const a of o){const h=Xi(a)*Math.PI/180;for(let y=0;y<=e;y++){const T=y/e,v=(T*360-180)*Math.PI/180;r.push(T,a),n.push(Math.cos(h)*Math.cos(v),Math.sin(h),Math.cos(h)*Math.sin(v))}}const l=e+1;for(let a=0;a<o.length-1;a++)for(let h=0;h<e;h++){const y=a*l+h,T=y+l;i.push(y,T,y+1,T,T+1,y+1)}return{positions:new Float32Array(r),spheres:new Float32Array(n),indices:new Uint16Array(i),vertexCount:(e+1)*o.length,rowCount:o.length}},ya=`
  vec4 projectShell(vec2 pos, float elevationGlobe, float elevationMercator) {
    #ifdef GLOBE
      return projectTileFor3D(pos, elevationGlobe);
    #else
      return projectTileFor3D(clamp(pos, 0.0, 1.0), elevationMercator);
    #endif
  }
`,Wa=`
  float daylightFraction(float sunAngle) {
    return smoothstep(-0.31, 0.09, sunAngle);
  }
`,fr=`
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
`,mr=`
  vec2 sphereSpan(vec3 origin, vec3 dir, float radius) {
    float b = dot(origin, dir);
    float c = dot(origin, origin) - radius * radius;
    float disc = b * b - c;
    if (disc < 0.0) return vec2(1.0, -1.0);
    float sq = sqrt(disc);
    return vec2(-b - sq, -b + sq);
  }
`,pr=`
  bool facesCamera(vec3 unitPos, vec3 camera) {
    return dot(unitPos, camera) > 1.0;
  }
`,ja=(e,t)=>{const r=Ba(e),n=typeof r?.getCameraAltitude=="function"?r.getCameraAltitude():null;if(Number.isFinite(n))return n;const i=r?.cameraToCenterDistance;if(!Number.isFinite(i))return 1e7;const s=512*Math.pow(2,e.getZoom()),o=1/t.MercatorCoordinate.fromLngLat(e.getCenter(),0).meterInMercatorCoordinateUnits();return i/s*o*Math.cos(e.getPitch()*Math.PI/180)},yt=(e,t)=>{const r=Ba(e)?.cameraPosition;if(r&&Number.isFinite(r[0])&&Number.isFinite(r[1])&&Number.isFinite(r[2]))return[r[2],r[1],r[0]];const n=Ba(e),i=typeof n?.getCameraLngLat=="function"?n.getCameraLngLat():e.getCenter();return We(i.lng,i.lat,ja(e,t))},gr=e=>typeof e.texStorage2D=="function",Ki=`#version 300 es
#define attribute in
#define varying out
#define texture2D texture
`,Zi=`#version 300 es
#define varying in
#define texture2D texture
out highp vec4 tm_fragColour;
#define gl_FragColor tm_fragColour
`,Ze=(e,t,r,n="layer",{es300:i=!1}={})=>(i&&gr(e)&&(t=Ki+t,r=Zi+r),Ji(e,t,r,n)),Ji=(e,t,r,n)=>{const i=(a,h)=>{const y=e.createShader(a);if(e.shaderSource(y,h),e.compileShader(y),!e.getShaderParameter(y,e.COMPILE_STATUS)){const T=e.getShaderInfoLog(y);throw e.deleteShader(y),new Error(`${n} shader: ${T}`)}return y},s=e.createProgram(),o=i(e.VERTEX_SHADER,t),l=i(e.FRAGMENT_SHADER,r);if(e.attachShader(s,o),e.attachShader(s,l),e.linkProgram(s),e.deleteShader(o),e.deleteShader(l),!e.getProgramParameter(s,e.LINK_STATUS)){const a=e.getProgramInfoLog(s);throw e.deleteProgram(s),new Error(`${n} link: ${a}`)}return s},ba=`
  vec2 equirectUV(vec3 dir, float drift) {
    return vec2(atan(dir.z, dir.x) / 6.28318530718 + 0.5 + drift,
                0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265359);
  }

  vec2 equirectUVInside(vec3 dir, float drift) {
    return vec2(-atan(dir.z, dir.x) / 6.28318530718 + 0.5 + drift,
                0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265359);
  }
`,ha=9e4,yr=`
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
`,br=["time","drift","field","fieldAmount","wind","windAmount","windScale","windRate","patches","patchAmount","patchTiles","patchMean","patchDetail"],es=.75,ts=144,as=.4335,wr=(e,t,r,n,i,s,o)=>{const l=r.animate?n.seconds:0;t.time&&e.uniform1f(t.time,l),t.drift&&e.uniform1f(t.drift,l*r.driftRate),t.fieldAmount&&e.uniform1f(t.fieldAmount,n.field?.ready?1:0),t.patchAmount&&e.uniform1f(t.patchAmount,n.patches?.ready?1:0),t.patchTiles&&e.uniform1f(t.patchTiles,r.patchTiles??ts),t.patchMean&&e.uniform1f(t.patchMean,r.patchMean??as),t.patchDetail&&e.uniform1f(t.patchDetail,r.patchDetail??es),t.windAmount&&e.uniform1f(t.windAmount,n.wind?.ready?r.windAmount:0),t.windScale&&e.uniform1f(t.windScale,r.windScale),t.windRate&&e.uniform1f(t.windRate,r.animate?r.windRate:0),n.field?.ready&&t.field&&(e.activeTexture(e.TEXTURE0+i),e.bindTexture(e.TEXTURE_2D,n.field.texture),e.uniform1i(t.field,i)),n.wind?.ready&&t.wind&&(e.activeTexture(e.TEXTURE0+s),e.bindTexture(e.TEXTURE_2D,n.wind.texture),e.uniform1i(t.wind,s)),n.patches?.ready&&t.patches&&(e.activeTexture(e.TEXTURE0+o),e.bindTexture(e.TEXTURE_2D,n.patches.texture),e.uniform1i(t.patches,o))},Mo=new WeakMap,os=e=>{let t=Mo.get(e);return t||(t=new Map,Mo.set(e,t)),t},rs=(e,t)=>t!==1?{internal:e.RGBA,format:e.RGBA}:typeof e.texStorage2D=="function"?{internal:e.R8,format:e.RED}:{internal:e.LUMINANCE,format:e.LUMINANCE},ns=(e,t,r,n)=>{const i=e.createTexture();e.bindTexture(e.TEXTURE_2D,i),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1);const{internal:s,format:o}=rs(e,n);return e.texImage2D(e.TEXTURE_2D,0,s,o,e.UNSIGNED_BYTE,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,r?e.LINEAR_MIPMAP_LINEAR:e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),r&&e.generateMipmap(e.TEXTURE_2D),i},Qe=(e,t,r=null,{mipmap:n=!0,channels:i=4}={})=>{const s=os(e),o=`${t}|${n?"mip":"flat"}|c${i}`;let l=s.get(o);if(!l){l={texture:null,ready:!1,refs:0,waiters:[],width:0},s.set(o,l);const h=new Image;h.crossOrigin="anonymous",h.onload=()=>{if(l.refs===0)return;const y=e.getParameter?.(e.MAX_TEXTURE_SIZE)??1/0;if(h.width>y){l.waiters=[];return}l.width=h.width,l.texture=ns(e,h,n,i),l.ready=!0;const T=l.waiters;l.waiters=[],T.forEach(v=>v())},h.onerror=()=>{l.waiters=[]},h.src=t}l.refs++;let a=!0;return r&&(l.ready?r():l.waiters.push(r)),{get texture(){return l.texture},get ready(){return l.ready},get width(){return l.width},release(){a&&(a=!1,r&&(l.waiters=l.waiters.filter(h=>h!==r)),l.refs--,!(l.refs>0)&&(l.texture&&e.deleteTexture(l.texture),l.texture=null,l.ready=!1,s.delete(o)))}}},vr=`
  mat3 equirectTangentFrame(vec3 unitPos) {
    vec3 up = normalize(unitPos);
    vec3 east = cross(up, vec3(0.0, 1.0, 0.0));
    float span = length(east);
    // Standing on a pole, every direction is south and no direction is east. Pick one rather than
    // dividing by zero and putting a NaN in the middle of Antarctica.
    east = span > 1.0e-4 ? east / span : vec3(0.0, 0.0, 1.0);
    return mat3(east, cross(up, east), up);
  }
`,_r=`
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
`,is=`
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
`,ss=(e,t)=>2*Math.PI*pa*Math.cos(t*Math.PI/180)/e,ls=(e,t,r)=>Math.min(r,Math.max(t,e)),cs=(e,t,r)=>{const n=ls((r-e)/(t-e),0,1);return n*n*(3-2*n)},us=(e,t,r)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e)/2,i=ss(r,t)/n;return{pixelsPerTexel:i,strength:1-cs(3,5,Math.log2(Math.max(i,1e-6)))}},xr="tm-clouds",hs=(e,t,r)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e),s=156543.03392/2**9,o=Math.min(1,n/s),a=pa/Math.max(1,n*110);return{frequency:Math.min(2600,Math.max(9,a)),amount:.14+(1-o)*.1,fade:Number.isFinite(r)?ds(1.35,2.75,r/ha):0}},ds=(e,t,r)=>{const n=Math.min(1,Math.max(0,(r-e)/(t-e)));return n*n*(3-2*n)},fs=e=>`#version 300 es
${e.define}
${e.vertexShaderPrelude}
in vec2 a_pos;
in vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
out vec3 v_sphere;
${ya}
void main() {
  v_sphere = a_sphere;
  // Globe wants metres above the sphere; mercator wants z in mercator units. Same deck, two rulers.
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,ms=()=>`#version 300 es
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
${fr}
${ba}
${Wa}
${vr}
${_r}
// The field, the wind and the clock the ground's cloud shadows read from the same source.
${yr}

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
}`,ps=({opacity:e=.5,animate:t=!0,fieldUrl:r=null,patchUrl:n=null,driftRate:i=4e-4,sun:s=[.4,.5,.75],windUrl:o=null,windAmount:l=1,windScale:a=.06,windRate:h=.05,cloudRelief:y=90,cloudDepth:T=4,powder:v=1,forward:I=.5,forwardG:g=.7,selfShadow:m=.18,selfShadowStep:w=.0015}={})=>{const E=ga();let L=null,d=null,c=null;const O=new Map;let N={opacity:e,animate:t,fieldUrl:r,patchUrl:n,driftRate:i,sun:s,windUrl:o,windAmount:l,windScale:a,windRate:h,cloudRelief:y,cloudDepth:T,powder:v,forward:I,forwardG:g,selfShadow:m,selfShadowStep:w},A=null,z=null,p=null;const H=C=>{const D=C.variantName;if(O.has(D))return O.get(D);const k=Ze(d,fs(C),ms(),"tm-clouds"),U={program:k,attribs:{pos:d.getAttribLocation(k,"a_pos"),sphere:d.getAttribLocation(k,"a_sphere")},uniforms:{elevationGlobe:d.getUniformLocation(k,"a_elevation_globe"),elevationMercator:d.getUniformLocation(k,"a_elevation_mercator"),opacity:d.getUniformLocation(k,"u_opacity"),sun:d.getUniformLocation(k,"u_sun"),...Object.fromEntries(br.map(b=>[b,d.getUniformLocation(k,`u_${b}`)])),detailFreq:d.getUniformLocation(k,"u_detailFreq"),detailAmount:d.getUniformLocation(k,"u_detailAmount"),deckFade:d.getUniformLocation(k,"u_deckFade"),camera:d.getUniformLocation(k,"u_camera"),cloudRelief:d.getUniformLocation(k,"u_cloudRelief"),cloudDepth:d.getUniformLocation(k,"u_cloudDepth"),powder:d.getUniformLocation(k,"u_powder"),forward:d.getUniformLocation(k,"u_forward"),forwardG:d.getUniformLocation(k,"u_forwardG"),selfShadow:d.getUniformLocation(k,"u_selfShadow"),selfShadowStep:d.getUniformLocation(k,"u_selfShadowStep"),matrix:d.getUniformLocation(k,"u_projection_matrix"),tileMercatorCoords:d.getUniformLocation(k,"u_projection_tile_mercator_coords"),clippingPlane:d.getUniformLocation(k,"u_projection_clipping_plane"),transition:d.getUniformLocation(k,"u_projection_transition"),fallbackMatrix:d.getUniformLocation(k,"u_projection_fallback_matrix")}};return O.set(D,U),U},G=(C,D)=>{C.matrix&&d.uniformMatrix4fv(C.matrix,!1,D.mainMatrix),C.tileMercatorCoords&&d.uniform4f(C.tileMercatorCoords,...D.tileMercatorCoords),C.clippingPlane&&d.uniform4f(C.clippingPlane,...D.clippingPlane),C.transition&&d.uniform1f(C.transition,D.projectionTransition),C.fallbackMatrix&&d.uniformMatrix4fv(C.fallbackMatrix,!1,D.fallbackMatrix)},$=()=>L?.triggerRepaint();return{id:xr,type:"custom",renderingMode:"3d",onAdd(C,D){L=C,d=D;const k=(U,b)=>{const j=d.createBuffer();return d.bindBuffer(U,j),d.bufferData(U,b,d.STATIC_DRAW),j};c={pos:k(d.ARRAY_BUFFER,E.positions),sphere:k(d.ARRAY_BUFFER,E.spheres),index:k(d.ELEMENT_ARRAY_BUFFER,E.indices)},N.fieldUrl&&(A=Qe(d,N.fieldUrl,$,{channels:1})),N.windUrl&&(z=Qe(d,N.windUrl,$)),N.patchUrl&&(p=Qe(d,N.patchUrl,$,{channels:1}))},onRemove(){d&&(O.forEach(({program:C})=>d.deleteProgram(C)),O.clear(),A?.release(),A=null,z?.release(),z=null,p?.release(),p=null,c&&(d.deleteBuffer(c.pos),d.deleteBuffer(c.sphere),d.deleteBuffer(c.index),c=null),L=null,d=null)},render(C,D){if(!c||N.opacity<=0)return;const k=D&&D.shaderData,U=D&&D.defaultProjectionData;if(!k||!U)return;const{program:b,attribs:j,uniforms:Q}=H(k);d.useProgram(b),G(Q,U);const J=L.getCenter().lat;Q.elevationGlobe&&d.uniform1f(Q.elevationGlobe,ha),Q.elevationMercator&&d.uniform1f(Q.elevationMercator,ue.MercatorCoordinate.fromLngLat([0,J],ha).z),Q.opacity&&d.uniform1f(Q.opacity,N.opacity),Q.sun&&d.uniform3f(Q.sun,...N.sun),wr(d,Q,N,{seconds:performance.now()*.001,field:A,wind:z,patches:p},0,1,2);const S=hs(L.getZoom(),L.getCenter().lat,ja(L,ue));Q.detailFreq&&d.uniform1f(Q.detailFreq,S.frequency),Q.detailAmount&&d.uniform1f(Q.detailAmount,S.amount),Q.deckFade&&d.uniform1f(Q.deckFade,S.fade),Q.camera&&d.uniform3f(Q.camera,...yt(L,ue));const X=R=>{Q[R]&&d.uniform1f(Q[R],N[R])};X("cloudRelief"),X("cloudDepth"),X("powder"),X("forward"),X("forwardG"),X("selfShadow"),X("selfShadowStep"),d.bindBuffer(d.ARRAY_BUFFER,c.pos),d.enableVertexAttribArray(j.pos),d.vertexAttribPointer(j.pos,2,d.FLOAT,!1,0,0),d.bindBuffer(d.ARRAY_BUFFER,c.sphere),d.enableVertexAttribArray(j.sphere),d.vertexAttribPointer(j.sphere,3,d.FLOAT,!1,0,0),d.enable(d.DEPTH_TEST),d.depthFunc(d.LEQUAL),d.depthMask(!1),d.bindBuffer(d.ELEMENT_ARRAY_BUFFER,c.index),d.drawElements(d.TRIANGLES,E.indices.length,d.UNSIGNED_SHORT,0),d.depthMask(!0),N.animate&&L.triggerRepaint()},setOptions(C={}){const D=N;if(N={...N,...C},d){const k=(U,b)=>{if(C[b]===void 0||C[b]===D[b])return U;U?.release();const j=b==="patchUrl"||b==="fieldUrl"?{channels:1}:void 0;return N[b]?Qe(d,N[b],$,j):null};A=k(A,"fieldUrl"),p=k(p,"patchUrl")}L&&L.triggerRepaint()},getOptions:()=>({...N}),get hasField(){return!!(A?.ready||p?.ready)}}},qa=xr,Ie=Math.PI/180,gs=Date.UTC(2e3,0,1,12),Pa=1/3600,Er=e=>(e.getTime()-gs)/864e5,ys=(e=new Date)=>((18.697374558+24.06570982441908*Er(e))%24*15%360+360)%360,bs=e=>{const t=Er(e)/36525;return{zeta:(2306.2181*t+.30188*t*t+.017998*t*t*t)*Pa,z:(2306.2181*t+1.09468*t*t+.018203*t*t*t)*Pa,theta:(2004.3109*t-.42665*t*t-.041833*t*t*t)*Pa}},ws=(e,t,r)=>{const{zeta:n,z:i,theta:s}=bs(r),o=(e-i)*Ie,l=t*Ie,a=s*Ie,h=Math.cos(l)*Math.sin(o),y=Math.cos(a)*Math.cos(l)*Math.cos(o)+Math.sin(a)*Math.sin(l),T=-Math.sin(a)*Math.cos(l)*Math.cos(o)+Math.cos(a)*Math.sin(l);return{ra:Math.atan2(h,y)/Ie-n,dec:Math.asin(Math.min(1,Math.max(-1,T)))/Ie}},Ro=e=>(e%360+360)%360,vs=(e,t=new Date)=>{const r=Math.hypot(e[0],e[1],e[2])||1,n=Math.atan2(e[2]/r,e[0]/r)/Ie,i=Math.asin(Math.min(1,Math.max(-1,e[1]/r)))/Ie,s=ws(Ro(n+ys(t)),i,t);return{ra:Ro(s.ra),dec:s.dec}},_s=`
  vec2 panoramaUV(vec3 skyDir) {
    return vec2(atan(skyDir.z, skyDir.x) / 6.28318530718 + 1.0,
                0.5 - asin(clamp(skyDir.y, -1.0, 1.0)) / 3.14159265359);
  }
`,xs=(e=new Date)=>{const t=new Float32Array(9);return[[1,0,0],[0,1,0],[0,0,1]].forEach((n,i)=>{const{ra:s,dec:o}=vs(n,e);t[i*3]=Math.cos(o*Ie)*Math.cos(s*Ie),t[i*3+1]=Math.sin(o*Ie),t[i*3+2]=Math.cos(o*Ie)*Math.sin(s*Ie)}),t},Es=Math.PI/180,da=e=>{const t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},Ts=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],Ha=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],Po=(e,t)=>{const r=Ts(e,t);return da([e[0]-t[0]*r,e[1]-t[1]*r,e[2]-t[2]*r])},ks=(e,t)=>{const n=t>89.98?-1:1,i=da(Ha(We(e,t+.01*n),We(e,t-.01*n))),s=da(Ha(We(e+.01,t),We(e-.01,t)));return{north:n===1?i:[-i[0],-i[1],-i[2]],east:s}},As=(e,t,r,n)=>{const i=e.getCenter(),s=(e.getBearing?.()??0)*Es,o=We(i.lng,i.lat,0),l=yt(e,t),a=da(Ha(o,l)),{north:h,east:y}=ks(i.lng,i.lat),T=[0,1,2].map(E=>h[E]*Math.cos(s)+y[E]*Math.sin(s)),v=[0,1,2].map(E=>-h[E]*Math.sin(s)+y[E]*Math.cos(s)),I=Po(T,a),g=Po(v,a),m=Math.tan(r/2),w=m*n;return{origin:l,forward:a,up:I.map(E=>E*m),right:g.map(E=>E*w),upUnit:I,rightUnit:g}},Ga=(e,t)=>e*t*4,Tr=[{name:"high",width:4096,height:2048,url:"/img/map/sky/milkyway-4k.webp",bytes:3680220,resident:Ga(4096,2048),decodeMs:235},{name:"standard",width:2048,height:1024,url:"/img/map/sky/milkyway-2k.webp",bytes:764012,resident:Ga(2048,1024),decodeMs:51}],kr={name:"placeholder",width:1024,height:512,url:"/img/map/sky/milkyway-1k.webp",bytes:45160,resident:Ga(1024,512),decodeMs:5},Ss=4,Ls=4,Ms=({maxTextureSize:e=0,deviceMemory:t=null,hardwareConcurrency:r=null,saveData:n=!1,effectiveType:i=null}={})=>{const s=Tr.filter(a=>a.width<=e);if(s.length===0)return{tier:kr,reason:`MAX_TEXTURE_SIZE is ${e}, below every tier — falling back to the placeholder`};const o=s[s.length-1],l=s[0];return l===o?{tier:l,reason:`only ${l.name} fits MAX_TEXTURE_SIZE ${e}`}:n?{tier:o,reason:"the browser is in data-saver mode"}:i&&/^(slow-2g|2g|3g)$/.test(i)?{tier:o,reason:`the connection reports ${i}`}:Number.isFinite(t)&&t<Ss?{tier:o,reason:`the device reports ${t} GB of memory`}:Number.isFinite(r)&&r<Ls?{tier:o,reason:`the device reports ${r} cores`}:{tier:l,reason:`nothing says otherwise, and MAX_TEXTURE_SIZE is ${e}`}},Rs=(e,t=typeof navigator>"u"?null:navigator)=>{const r=t?.connection??null;return{maxTextureSize:e?.getParameter?.(e.MAX_TEXTURE_SIZE)??0,deviceMemory:t?.deviceMemory??null,hardwareConcurrency:t?.hardwareConcurrency??null,saveData:r?.saveData??!1,effectiveType:r?.effectiveType??null}},Ar="tm-starfield",Ps=kr.url,Cs="/data/sky/bright-stars.bin",Ds=e=>{const t=Number.isFinite(e)?e:5800,r=Math.min(4e4,Math.max(1e3,t))/100,n=h=>Math.min(1,Math.max(0,h/255)),i=r<=66?255:329.698727446*Math.pow(r-60,-.1332047592),s=r<=66?99.4708025861*Math.log(r)-161.1195681661:288.1221695283*Math.pow(r-60,-.0755148492),o=r>=66?255:r<=19?0:138.5177312231*Math.log(r-10)-305.0447927307,l=[n(i),n(s),n(o)],a=Math.max(...l)||1;return l.map(h=>h/a)},Is=(e,{limitMagnitude:t=6.5}={})=>{const r=new Float32Array(e),n=Math.floor(r.length/4),i=[];for(let o=0;o<n;o++){const l=r[o*4+2];if(l>t)continue;const a=Math.pow(10,-.4*l);i.push([r[o*4],r[o*4+1],Math.pow(a,.36),...Ds(r[o*4+3])])}const s=new Float32Array(i.length*6);return i.forEach((o,l)=>s.set(o,l*6)),{vertices:s,count:i.length}},Sr=`
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
`,Fs=e=>`${e.define}
attribute vec2 a_pos;
varying vec2 v_ndc;
void main() {
  v_ndc = a_pos;
  // Straight to clip space. No projection, no elevation, no prelude — that is the whole point.
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,Us=e=>`${e.define}
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
${Sr}
${_s}

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
}`,Ns=e=>`${e.define}
attribute vec3 a_star;       // right ascension and declination in degrees, then brightness
attribute vec3 a_colour;
uniform mat3 u_skyFrame;
uniform float u_pixelRatio;
uniform float u_starSize;
uniform float u_catalogueAmount;
varying vec3 v_colour;
${Sr}

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
}`,Os=e=>`${e.define}
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
}`,Bs=({textureUrl:e=null,placeholderUrl:t=Ps,catalogueUrl:r=Cs,date:n=new Date,brightness:i=.55,nebula:s=.3,nebulaContrast:o=1.45,starDensity:l=210,starAmount:a=1.5,catalogueAmount:h=2.2,starSize:y=3,limitMagnitude:T=6.5,twinkle:v=0,animate:I=!1}={})=>{let g=null,m=null,w=null,E=null,L=null,d=null,c="not chosen yet",O=0;const N=new Map;let A={textureUrl:e,placeholderUrl:t,catalogueUrl:r,date:n,brightness:i,nebula:s,nebulaContrast:o,starDensity:l,starAmount:a,catalogueAmount:h,starSize:y,limitMagnitude:T,twinkle:v,animate:I};const z=C=>{const D=C.variantName;if(N.has(D))return N.get(D);const k=Ze(m,Fs(C),Us(C),"tm-starfield"),U=Ze(m,Ns(C),Os(C),"tm-starfield-catalogue"),b=(Q,J)=>m.getUniformLocation(Q,J),j={sky:{program:k,pos:m.getAttribLocation(k,"a_pos"),uniforms:{camera:b(k,"u_camera"),forward:b(k,"u_forward"),right:b(k,"u_right"),up:b(k,"u_up"),halfExtent:b(k,"u_halfExtent"),skyFrame:b(k,"u_skyFrame"),sky:b(k,"u_sky"),globeness:b(k,"u_globeness"),brightness:b(k,"u_brightness"),nebula:b(k,"u_nebula"),nebulaContrast:b(k,"u_nebulaContrast"),starDensity:b(k,"u_starDensity"),starAmount:b(k,"u_starAmount"),twinkle:b(k,"u_twinkle"),time:b(k,"u_time")}},stars:{program:U,star:m.getAttribLocation(U,"a_star"),colour:m.getAttribLocation(U,"a_colour"),uniforms:{camera:b(U,"u_camera"),forward:b(U,"u_forward"),right:b(U,"u_right"),up:b(U,"u_up"),halfExtent:b(U,"u_halfExtent"),skyFrame:b(U,"u_skyFrame"),pixelRatio:b(U,"u_pixelRatio"),starSize:b(U,"u_starSize"),catalogueAmount:b(U,"u_catalogueAmount")}}};return N.set(D,j),j},p=()=>{if(!m)return;const C=(D,k)=>D?Qe(m,D,k,{mipmap:!1}):null;if(A.textureUrl===null){const D=Ms(Rs(m));d=D.tier,c=D.reason}else d=Tr.find(D=>D.url===A.textureUrl)??{name:"explicit",url:A.textureUrl},c="the caller named a panorama";L=C(A.placeholderUrl,()=>{g?.triggerRepaint()}),E=C(d.url===A.placeholderUrl?null:d.url,()=>{L?.release(),L=null,g?.triggerRepaint()})},H=()=>E?.ready?E:L?.ready?L:null,G=()=>{E?.release(),L?.release(),E=null,L=null},$=C=>{!C||typeof fetch!="function"||fetch(C).then(D=>{if(!D.ok)throw new Error(`${D.status} ${D.statusText}`);return D.arrayBuffer()}).then(D=>{if(!m||!w)return;const{vertices:k,count:U}=Is(D,{limitMagnitude:A.limitMagnitude});m.bindBuffer(m.ARRAY_BUFFER,w.stars),m.bufferData(m.ARRAY_BUFFER,k,m.STATIC_DRAW),O=U,g?.triggerRepaint()}).catch(D=>console.warn(`[starfield] bright star catalogue unavailable: ${D.message}`))};return{id:Ar,type:"custom",renderingMode:"3d",onAdd(C,D){g=C,m=D;const k=(U,b)=>{const j=m.createBuffer();return m.bindBuffer(U,j),b&&m.bufferData(U,b,m.STATIC_DRAW),j};w={pos:k(m.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1])),index:k(m.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,2,1,3])),stars:k(m.ARRAY_BUFFER,null)},p(),$(A.catalogueUrl)},onRemove(){m&&(N.forEach(({sky:C,stars:D})=>{m.deleteProgram(C.program),m.deleteProgram(D.program)}),N.clear(),G(),w&&(m.deleteBuffer(w.pos),m.deleteBuffer(w.index),m.deleteBuffer(w.stars),w=null),g=null,m=null)},render(C,D){if(!w||A.brightness<=0)return;const k=D&&D.shaderData,U=D&&D.defaultProjectionData;if(!k||!U)return;const b=g.getCanvas(),j=b.width/Math.max(1,b.height),Q=As(g,ue,D.fov||.6435,j),J=Math.tan((D.fov||.6435)/2),S=xs(A.date),X=U.projectionTransition,{sky:R,stars:W}=z(k),ee=({uniforms:B})=>{B.camera&&m.uniform3f(B.camera,...Q.origin),B.forward&&m.uniform3f(B.forward,...Q.forward),B.right&&m.uniform3f(B.right,...Q.rightUnit),B.up&&m.uniform3f(B.up,...Q.upUnit),B.halfExtent&&m.uniform2f(B.halfExtent,J*j,J),B.skyFrame&&m.uniformMatrix3fv(B.skyFrame,!1,S)};m.useProgram(R.program),ee(R),R.uniforms.globeness&&m.uniform1f(R.uniforms.globeness,X),R.uniforms.brightness&&m.uniform1f(R.uniforms.brightness,A.brightness);const V=H();R.uniforms.nebula&&m.uniform1f(R.uniforms.nebula,V?A.nebula:0),R.uniforms.nebulaContrast&&m.uniform1f(R.uniforms.nebulaContrast,A.nebulaContrast),R.uniforms.starDensity&&m.uniform1f(R.uniforms.starDensity,A.starDensity),R.uniforms.starAmount&&m.uniform1f(R.uniforms.starAmount,A.starAmount),R.uniforms.twinkle&&m.uniform1f(R.uniforms.twinkle,A.twinkle),R.uniforms.time&&m.uniform1f(R.uniforms.time,A.animate?performance.now()*.001:0),V&&R.uniforms.sky&&(m.activeTexture(m.TEXTURE0),m.bindTexture(m.TEXTURE_2D,V.texture),m.uniform1i(R.uniforms.sky,0)),m.bindBuffer(m.ARRAY_BUFFER,w.pos),m.enableVertexAttribArray(R.pos),m.vertexAttribPointer(R.pos,2,m.FLOAT,!1,0,0),m.disable(m.DEPTH_TEST),m.depthMask(!1),m.bindBuffer(m.ELEMENT_ARRAY_BUFFER,w.index),m.drawElements(m.TRIANGLES,6,m.UNSIGNED_SHORT,0),O>0&&X>.5&&A.catalogueAmount>0&&(m.useProgram(W.program),ee(W),W.uniforms.pixelRatio&&m.uniform1f(W.uniforms.pixelRatio,typeof devicePixelRatio=="number"?devicePixelRatio:1),W.uniforms.starSize&&m.uniform1f(W.uniforms.starSize,A.starSize),W.uniforms.catalogueAmount&&m.uniform1f(W.uniforms.catalogueAmount,A.catalogueAmount*A.brightness),m.bindBuffer(m.ARRAY_BUFFER,w.stars),m.enableVertexAttribArray(W.star),m.vertexAttribPointer(W.star,3,m.FLOAT,!1,24,0),m.enableVertexAttribArray(W.colour),m.vertexAttribPointer(W.colour,3,m.FLOAT,!1,24,12),m.drawArrays(m.POINTS,0,O),m.disableVertexAttribArray(W.star),m.disableVertexAttribArray(W.colour)),m.enable(m.DEPTH_TEST),m.depthMask(!0),A.animate&&A.twinkle>0&&g.triggerRepaint()},setOptions(C={}){const D=A.textureUrl,k=A.catalogueUrl;A={...A,...C},C.textureUrl!==void 0&&C.textureUrl!==D&&(G(),p()),C.catalogueUrl!==void 0&&C.catalogueUrl!==k&&(O=0,$(C.catalogueUrl)),g?.triggerRepaint()},getOptions:()=>({...A}),get hasSky(){return H()!==null},get starCount(){return O},get skyTier(){return d?{...d,reason:c}:null}}},Qs=Ar,rt=Math.PI/180,qs=Date.UTC(2e3,0,1,12),Hs=149597870700,Gs=6957e5,Lr=e=>(e.getTime()-qs)/864e5,Ya=(e=new Date)=>{const t=Lr(e),r=(280.46+.9856474*t)%360,n=(357.528+.9856003*t)%360*rt,i=(r+1.915*Math.sin(n)+.02*Math.sin(2*n))*rt,s=(23.439-4e-7*t)*rt,o=Math.asin(Math.sin(s)*Math.sin(i))/rt;let l=Math.atan2(Math.cos(s)*Math.sin(i),Math.cos(i))/rt;l<0&&(l+=360);let a=r-l;a>180&&(a-=360),a<-180&&(a+=360),a*=4;const h=(1.00014-.01671*Math.cos(n)-14e-5*Math.cos(2*n))*Hs;return{declination:o,equationOfTime:a,distance:h}},Mr=(e=new Date)=>Ya(e).distance,$s=(e=new Date)=>Math.atan(Gs/Mr(e)),zs=(e=new Date)=>{const t=(357.528+.9856003*Lr(e))%360*rt;return(1.00014-.01671*Math.cos(t)-14e-5*Math.cos(2*t))*149597870700},Ws=(e=new Date)=>{const{declination:t,equationOfTime:r}=Ya(e);let i=-15*(e.getUTCHours()+e.getUTCMinutes()/60+e.getUTCSeconds()/3600-12+r/60);return i=(i+540)%360-180,{lng:i,lat:t}},Wt=(e=new Date)=>{const{lng:t,lat:r}=Ws(e),n=r*rt,i=t*rt;return[Math.cos(n)*Math.cos(i),Math.sin(n),Math.cos(n)*Math.sin(i)]},Co=(e,t=12)=>{const r=new Date(0);r.setUTCFullYear(Number.isFinite(e)?e:2e3,5,21);const n=(t%24+24)%24;return new Date(r.getTime()+n*36e5)},js=(e,t=new Date)=>{const{equationOfTime:r}=Ya(t);return((12-e/15-r/60)%24+24)%24},Ys=(e,t)=>((t-e)%24+36)%24-12,Rr="tm-sun",Do=63710088e-1,Xs=18,Vs=(e,t,r)=>{const n=Math.abs(e),i=t,s=r;if(i<=0)return 0;if(n>=i+s)return 1;if(n<=s-i)return 0;if(n<=i-s)return 1-s*s/(i*i);const o=i*i*Math.acos(Pt((n*n+i*i-s*s)/(2*n*i),-1,1))+s*s*Math.acos(Pt((n*n+s*s-i*i)/(2*n*s),-1,1))-.5*Math.sqrt(Math.max(0,(-n+i+s)*(n+i-s)*(n-i+s)*(n+i+s)));return Pt(1-o/(Math.PI*i*i),0,1)},Io={u1:.93,u2:-.23},Fo=e=>e<0?`(${e.toFixed(4)})`:e.toFixed(4),Ks=`
  float limbDarkening(float rho) {
    float mu = sqrt(max(1.0 - rho * rho, 0.0));
    float t = 1.0 - mu;
    return max(1.0 - ${Fo(Io.u1)} * t - ${Fo(Io.u2)} * t * t, 0.0);
  }
`,Zs=new Float32Array([-1,-1,1,-1,-1,1,1,1]),Uo=new Uint16Array([0,1,2,1,3,2]),Js=e=>`${e.vertexShaderPrelude}
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
}`,el=()=>`precision highp float;
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
${mr}
${Ks}

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
}`,tl=({date:e=new Date,haloScale:t=Xs,haloStrength:r=1,discGain:n=1.15,brightness:i=1,coreColour:s=[1,.985,.95],haloColour:o=[1,.65,.2]}={})=>{let l=null,a=null,h=null,y={u:.5,v:.5,onScreen:!1,visible:0};const T=new Map;let v={date:e,haloScale:t,haloStrength:r,discGain:n,brightness:i,coreColour:s,haloColour:o};const I=g=>{const m=g.variantName;if(T.has(m))return T.get(m);const w=Ze(a,Js(g),el(),"tm-sun",{es300:!0}),E={program:w,attribs:{corner:a.getAttribLocation(w,"a_corner")},uniforms:{centre:a.getUniformLocation(w,"a_centre"),elevationGlobe:a.getUniformLocation(w,"a_elevation_globe"),elevationMercator:a.getUniformLocation(w,"a_elevation_mercator"),size:a.getUniformLocation(w,"u_size"),camera:a.getUniformLocation(w,"u_camera"),forward:a.getUniformLocation(w,"u_forward"),right:a.getUniformLocation(w,"u_right"),up:a.getUniformLocation(w,"u_up"),glowAngle:a.getUniformLocation(w,"u_glow_angle"),discFraction:a.getUniformLocation(w,"u_disc_fraction"),discGain:a.getUniformLocation(w,"u_disc_gain"),visible:a.getUniformLocation(w,"u_visible"),brightness:a.getUniformLocation(w,"u_brightness"),haloStrength:a.getUniformLocation(w,"u_halo_strength"),coreColour:a.getUniformLocation(w,"u_core_colour"),haloColour:a.getUniformLocation(w,"u_halo_colour"),matrix:a.getUniformLocation(w,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(w,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(w,"u_projection_clipping_plane"),transition:a.getUniformLocation(w,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(w,"u_projection_fallback_matrix")}};return T.set(m,E),E};return{id:Rr,type:"custom",renderingMode:"3d",onAdd(g,m){l=g,a=m;const w=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,w),a.bufferData(a.ARRAY_BUFFER,Zs,a.STATIC_DRAW);const E=a.createBuffer();a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,E),a.bufferData(a.ELEMENT_ARRAY_BUFFER,Uo,a.STATIC_DRAW),h={corner:w,index:E}},onRemove(){a&&(T.forEach(({program:g})=>a.deleteProgram(g)),T.clear(),h&&(a.deleteBuffer(h.corner),a.deleteBuffer(h.index),h=null),l=null,a=null)},render(g,m){if(!h||v.brightness<=0)return;const w=m&&m.shaderData,E=m&&m.defaultProjectionData;if(!w||!E)return;const{program:L,attribs:d,uniforms:c}=I(w);a.useProgram(L),c.matrix&&a.uniformMatrix4fv(c.matrix,!1,E.mainMatrix),c.tileMercatorCoords&&a.uniform4f(c.tileMercatorCoords,...E.tileMercatorCoords),c.clippingPlane&&a.uniform4f(c.clippingPlane,...E.clippingPlane),c.transition&&a.uniform1f(c.transition,E.projectionTransition),c.fallbackMatrix&&a.uniformMatrix4fv(c.fallbackMatrix,!1,E.fallbackMatrix);const O=yt(l,ue),N=Mr(v.date),A=We(...rl(Wt(v.date)),N-Do),z=No([A[0]-O[0],A[1]-O[1],A[2]-O[2]]),p=Math.hypot(...O),H=Math.max(.25*(p-1),.002),G=[O[0]+z[0]*H,O[1]+z[1]*H,O[2]+z[2]*H],$=Math.hypot(...G),C=Math.asin(G[1]/$)*180/Math.PI,D=Math.atan2(G[2],G[0])*180/Math.PI,k=($-1)*Do,U=ue.MercatorCoordinate.fromLngLat([D,C],0);c.centre&&a.uniform2f(c.centre,U.x,U.y),c.elevationGlobe&&a.uniform1f(c.elevationGlobe,k),c.elevationMercator&&a.uniform1f(c.elevationMercator,ue.MercatorCoordinate.fromLngLat([D,C],k).z);const b=$s(v.date),j=b*v.haloScale,Q=(m.fov||.6435)/2,J=l.getCanvas(),S=Math.tan(j)/Math.tan(Q);c.size&&a.uniform2f(c.size,S*(J.height/J.width),S),c.glowAngle&&a.uniform1f(c.glowAngle,j),c.discFraction&&a.uniform1f(c.discFraction,1/v.haloScale),c.discGain&&a.uniform1f(c.discGain,v.discGain);const X=[-O[0]/p,-O[1]/p,-O[2]/p],R=Math.acos(Pt(ol(X,z),-1,1)),W=Math.asin(Pt(1/p,-1,1)),ee=Vs(R,b,W),V=z,B=No(Oo([0,1,0],V)),Se=Oo(V,B);c.forward&&a.uniform3f(c.forward,...V),c.right&&a.uniform3f(c.right,...B),c.up&&a.uniform3f(c.up,...Se),c.camera&&a.uniform3f(c.camera,...O),c.visible&&a.uniform1f(c.visible,ee),c.brightness&&a.uniform1f(c.brightness,v.brightness),c.haloStrength&&a.uniform1f(c.haloStrength,v.haloStrength),c.coreColour&&a.uniform3f(c.coreColour,...v.coreColour),c.haloColour&&a.uniform3f(c.haloColour,...v.haloColour),a.bindBuffer(a.ARRAY_BUFFER,h.corner),a.enableVertexAttribArray(d.corner),a.vertexAttribPointer(d.corner,2,a.FLOAT,!1,0,0),a.disable(a.DEPTH_TEST),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,h.index),a.drawElements(a.TRIANGLES,Uo.length,a.UNSIGNED_SHORT,0),a.depthMask(!0),y=al(E.mainMatrix,U,$,ee)},setOptions(g={}){v={...v,...g},l?.triggerRepaint()},getOptions:()=>({...v}),get screenPosition(){return y}}},al=(e,t,r,n)=>{const i=t.x*2*Math.PI+Math.PI,s=2*Math.atan(Math.exp(Math.PI-t.y*2*Math.PI))-Math.PI/2,o=Math.cos(s),l=[Math.sin(i)*o*r,Math.sin(s)*r,Math.cos(i)*o*r,1],a=[0,1,2,3].map(T=>e[T]*l[0]+e[4+T]*l[1]+e[8+T]*l[2]+e[12+T]*l[3]);if(!(a[3]>0))return{u:.5,v:.5,onScreen:!1,visible:0};const h=a[0]/a[3]*.5+.5,y=a[1]/a[3]*.5+.5;return{u:h,v:y,onScreen:h>-.5&&h<1.5&&y>-.5&&y<1.5,visible:n}},Pt=(e,t,r)=>Math.min(r,Math.max(t,e)),ol=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],No=e=>{const t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},Oo=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],rl=([e,t,r])=>[Math.atan2(r,e)*180/Math.PI,Math.asin(Pt(t,-1,1))*180/Math.PI],nl=Rr,Pr="tm-moon",fa=63710088e-1,il=1737400,gt=Math.PI/180,sl=Date.UTC(2e3,0,1,12),ll=Date.UTC(1999,11,31,0),ce=e=>Math.sin(e*gt),ye=e=>Math.cos(e*gt),Cr=(e=new Date)=>{const t=(e.getTime()-sl)/864e5,r=(e.getTime()-ll)/864e5,n=125.1228-.0529538083*r,i=5.1454,s=318.0634+.1643573223*r,o=60.2666,l=.0549,a=115.3654+13.0649929509*r;let h=a+l*180/Math.PI*ce(a)*(1+l*ye(a));for(let b=0;b<3;b++)h-=(h-l*180/Math.PI*ce(h)-a)/(1-l*ye(h));const y=o*(ye(h)-l),T=o*(Math.sqrt(1-l*l)*ce(h)),v=Math.atan2(T,y)/gt,I=Math.sqrt(y*y+T*T);let g=I*(ye(n)*ye(v+s)-ce(n)*ce(v+s)*ye(i)),m=I*(ce(n)*ye(v+s)+ye(n)*ce(v+s)*ye(i)),w=I*(ce(v+s)*ce(i));const E=356.047+.9856002585*r,L=282.9404+470935e-10*r+E,d=n+s+a,c=d-L,O=d-n;let N=Math.atan2(m,g)/gt,A=Math.atan2(w,Math.hypot(g,m))/gt;N+=-1.274*ce(a-2*c)+.658*ce(2*c)-.186*ce(E),A+=-.173*ce(O-2*c);const z=(I-.58*ye(a-2*c)-.46*ye(2*c))*fa,p=23.4393-3563e-10*t,H=ye(N)*ye(A),G=ce(N)*ye(A)*ye(p)-ce(A)*ce(p),$=ce(N)*ye(A)*ce(p)+ce(A)*ye(p),C=Math.atan2(G,H)/gt,D=Math.atan2($,Math.hypot(H,G))/gt,k=(18.697374558+24.06570982441908*t)%24;let U=C-k*15;return U=(U%360+540)%360-180,{lng:U,lat:D,distance:z}},Dr=(e=new Date)=>{const{lng:t,lat:r,distance:n}=Cr(e);return We(t,r,n-fa)},cl=new Float32Array([-1,-1,1,-1,-1,1,1,1]),Bo=new Uint16Array([0,1,2,1,3,2]),ul=e=>`${e.vertexShaderPrelude}
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
}`,hl=()=>`precision highp float;
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
${ba}

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
}`,dl=({date:e=new Date,sun:t=[1,0,0],albedoUrl:r=null,sizeScale:n=1,brightness:i=1,glow:s=.4,glowExtent:o=1.8}={})=>{let l=null,a=null,h=null,y=null,T=!1;const v=new Map;let I={date:e,sun:t,albedoUrl:r,sizeScale:n,brightness:i,glow:s,glowExtent:o};const g=w=>{const E=w.variantName;if(v.has(E))return v.get(E);const L=Ze(a,ul(w),hl(),"tm-moon",{es300:!0}),d={program:L,attribs:{corner:a.getAttribLocation(L,"a_corner")},uniforms:{centre:a.getUniformLocation(L,"a_centre"),elevationGlobe:a.getUniformLocation(L,"a_elevation_globe"),elevationMercator:a.getUniformLocation(L,"a_elevation_mercator"),size:a.getUniformLocation(L,"u_size"),albedo:a.getUniformLocation(L,"u_albedo"),hasAlbedo:a.getUniformLocation(L,"u_hasAlbedo"),sun:a.getUniformLocation(L,"u_sun"),right:a.getUniformLocation(L,"u_right"),up:a.getUniformLocation(L,"u_up"),forward:a.getUniformLocation(L,"u_forward"),brightness:a.getUniformLocation(L,"u_brightness"),discEdge:a.getUniformLocation(L,"u_discEdge"),glow:a.getUniformLocation(L,"u_glow"),glowExtent:a.getUniformLocation(L,"u_glowExtent"),matrix:a.getUniformLocation(L,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(L,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(L,"u_projection_clipping_plane"),transition:a.getUniformLocation(L,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(L,"u_projection_fallback_matrix")}};return v.set(E,d),d},m=w=>{const E=new Image;E.crossOrigin="anonymous",E.onload=()=>{a&&(y=y||a.createTexture(),a.bindTexture(a.TEXTURE_2D,y),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,E),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.REPEAT),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),T=!0,l?.triggerRepaint())},E.src=w};return{id:Pr,type:"custom",renderingMode:"3d",onAdd(w,E){l=w,a=E;const L=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,L),a.bufferData(a.ARRAY_BUFFER,cl,a.STATIC_DRAW);const d=a.createBuffer();a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,d),a.bufferData(a.ELEMENT_ARRAY_BUFFER,Bo,a.STATIC_DRAW),h={corner:L,index:d},I.albedoUrl&&m(I.albedoUrl)},onRemove(){a&&(v.forEach(({program:w})=>a.deleteProgram(w)),v.clear(),y&&(a.deleteTexture(y),y=null,T=!1),h&&(a.deleteBuffer(h.corner),a.deleteBuffer(h.index),h=null),l=null,a=null)},render(w,E){if(!h||I.brightness<=0)return;const L=E&&E.shaderData,d=E&&E.defaultProjectionData;if(!L||!d)return;const{lng:c,lat:O,distance:N}=Cr(I.date),{program:A,attribs:z,uniforms:p}=g(L);a.useProgram(A),p.matrix&&a.uniformMatrix4fv(p.matrix,!1,d.mainMatrix),p.tileMercatorCoords&&a.uniform4f(p.tileMercatorCoords,...d.tileMercatorCoords),p.clippingPlane&&a.uniform4f(p.clippingPlane,...d.clippingPlane),p.transition&&a.uniform1f(p.transition,d.projectionTransition),p.fallbackMatrix&&a.uniformMatrix4fv(p.fallbackMatrix,!1,d.fallbackMatrix);const H=yt(l,ue),G=We(c,O,N-fa),$=Qo([G[0]-H[0],G[1]-H[1],G[2]-H[2]]),D=Math.hypot(...H)+1.2,k=[H[0]+$[0]*D,H[1]+$[1]*D,H[2]+$[2]*D],U=Math.hypot(...k),b=Math.asin(k[1]/U)*180/Math.PI,j=Math.atan2(k[2],k[0])*180/Math.PI,Q=(U-1)*fa,J=ue.MercatorCoordinate.fromLngLat([j,b],0);p.centre&&a.uniform2f(p.centre,J.x,J.y),p.elevationGlobe&&a.uniform1f(p.elevationGlobe,Q),p.elevationMercator&&a.uniform1f(p.elevationMercator,ue.MercatorCoordinate.fromLngLat([j,b],Q).z);const S=Math.atan(il*I.sizeScale/N),X=(E.fov||.6435)/2,R=l.getCanvas(),W=Math.tan(S)/Math.tan(X),V=1+(I.glow>0?Math.max(0,I.glowExtent):0),B=W*V;p.size&&a.uniform2f(p.size,B*(R.height/R.width),B),p.discEdge&&a.uniform1f(p.discEdge,1/V);const Se=$,pe=Qo(qo([0,1,0],Se)),he=qo(Se,pe);p.forward&&a.uniform3f(p.forward,...Se),p.right&&a.uniform3f(p.right,...pe),p.up&&a.uniform3f(p.up,...he),p.sun&&a.uniform3f(p.sun,...I.sun),p.brightness&&a.uniform1f(p.brightness,I.brightness),p.glow&&a.uniform1f(p.glow,I.glow),p.glowExtent&&a.uniform1f(p.glowExtent,I.glowExtent),p.hasAlbedo&&a.uniform1f(p.hasAlbedo,T?1:0),T&&p.albedo&&(a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,y),a.uniform1i(p.albedo,0)),a.bindBuffer(a.ARRAY_BUFFER,h.corner),a.enableVertexAttribArray(z.corner),a.vertexAttribPointer(z.corner,2,a.FLOAT,!1,0,0),a.enable(a.DEPTH_TEST),a.depthFunc(a.LEQUAL),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,h.index),a.drawElements(a.TRIANGLES,Bo.length,a.UNSIGNED_SHORT,0),a.depthMask(!0)},setOptions(w={}){const E=I.albedoUrl;I={...I,...w},w.albedoUrl!==void 0&&w.albedoUrl!==E&&(T=!1,w.albedoUrl&&m(w.albedoUrl)),l?.triggerRepaint()},getOptions:()=>({...I}),get hasAlbedo(){return T}}},Qo=e=>{const t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},qo=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],fl=Pr,ml=6957e5,pl=1737400,gl=63710088e-1,yl=pl/gl,bl=(e,t,r)=>Math.min(r,Math.max(t,e)),wl=(e=new Date)=>Math.asin(ml/zs(e)),vl=.035,_l=(e=new Date,t=null,r=null)=>{const n=t||Wt(e),i=r||Dr(e),s=Math.hypot(...i);return Math.acos(bl((n[0]*i[0]+n[1]*i[1]+n[2]*i[2])/s,-1,1))<vl},xl=`
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
`,Ir="tm-daylight",Ht={field:0,wind:1,relief:2,lights:3,patches:4},El=e=>`#version 300 es
${e.define}
${e.vertexShaderPrelude}
in vec2 a_pos;
in vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
out vec3 v_sphere;
${ya}
void main() {
  v_sphere = a_sphere;
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,Tl=()=>`#version 300 es
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
${ba}
${pr}
${Wa}
${vr}
${_r}
${is}
${xl}
// The same field, wind and clock the deck in clouds.js draws itself from.
${yr}

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
    float remaining = eclipseLight(normal, sunDir, u_moon, u_sunRadius, ${yl.toFixed(8)});
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
}`,kl=({sun:e=[1,0,0],nightDarkness:t=.965,lightsUrl:r=null,lightsAmount:n=0,nightColour:i=[.02,.035,.07],twilightColour:s=[.62,.32,.16],twilightCool:o=[.1,.15,.28],twilightStrength:l=.55,reliefUrl:a=null,reliefWidth:h=8192,reliefPower:y=1.5,cloudShadow:T=.5,shadowSoftness:v=.75,eclipse:I=!0,date:g=null,fieldUrl:m=null,patchUrl:w=null,windUrl:E=null,windAmount:L=1,windScale:d=.06,windRate:c=.05,driftRate:O=4e-4,animate:N=!0}={})=>{const A=ga();let z=null,p=null,H=null,G=null,$=null,C=null,D=null,k=null;const U=new Map;let b={sun:e,nightDarkness:t,lightsUrl:r,lightsAmount:n,nightColour:i,twilightColour:s,twilightCool:o,twilightStrength:l,reliefUrl:a,reliefWidth:h,reliefPower:y,cloudShadow:T,eclipse:I,date:g,shadowSoftness:v,fieldUrl:m,patchUrl:w,windUrl:E,windAmount:L,windScale:d,windRate:c,driftRate:O,animate:N};const j=S=>{const X=S.variantName;if(U.has(X))return U.get(X);const R=Ze(p,El(S),Tl(),"tm-daylight"),W={program:R,attribs:{pos:p.getAttribLocation(R,"a_pos"),sphere:p.getAttribLocation(R,"a_sphere")},uniforms:{elevationGlobe:p.getUniformLocation(R,"a_elevation_globe"),elevationMercator:p.getUniformLocation(R,"a_elevation_mercator"),sun:p.getUniformLocation(R,"u_sun"),camera:p.getUniformLocation(R,"u_camera"),globeness:p.getUniformLocation(R,"u_globeness"),nightDarkness:p.getUniformLocation(R,"u_nightDarkness"),nightColour:p.getUniformLocation(R,"u_nightColour"),twilightColour:p.getUniformLocation(R,"u_twilightColour"),twilightCool:p.getUniformLocation(R,"u_twilightCool"),twilightStrength:p.getUniformLocation(R,"u_twilightStrength"),lights:p.getUniformLocation(R,"u_lights"),lightsAmount:p.getUniformLocation(R,"u_lightsAmount"),relief:p.getUniformLocation(R,"u_relief"),reliefPower:p.getUniformLocation(R,"u_reliefPower"),cloudShadow:p.getUniformLocation(R,"u_cloudShadow"),shadowSoftness:p.getUniformLocation(R,"u_shadowSoftness"),cloudAltitude:p.getUniformLocation(R,"u_cloudAltitude"),moon:p.getUniformLocation(R,"u_moon"),sunRadius:p.getUniformLocation(R,"u_sunRadius"),...Object.fromEntries(br.map(ee=>[ee,p.getUniformLocation(R,`u_${ee}`)])),matrix:p.getUniformLocation(R,"u_projection_matrix"),tileMercatorCoords:p.getUniformLocation(R,"u_projection_tile_mercator_coords"),clippingPlane:p.getUniformLocation(R,"u_projection_clipping_plane"),transition:p.getUniformLocation(R,"u_projection_transition"),fallbackMatrix:p.getUniformLocation(R,"u_projection_fallback_matrix")}};return U.set(X,W),W},Q=()=>z?.triggerRepaint(),J=(S,X,R,W)=>{!X?.ready||!S[R]||(p.activeTexture(p.TEXTURE0+W),p.bindTexture(p.TEXTURE_2D,X.texture),p.uniform1i(S[R],W))};return{id:Ir,type:"custom",renderingMode:"3d",onAdd(S,X){z=S,p=X;const R=(W,ee)=>{const V=p.createBuffer();return p.bindBuffer(W,V),p.bufferData(W,ee,p.STATIC_DRAW),V};H={pos:R(p.ARRAY_BUFFER,A.positions),sphere:R(p.ARRAY_BUFFER,A.spheres),index:R(p.ELEMENT_ARRAY_BUFFER,A.indices)},b.lightsUrl&&(G=Qe(p,b.lightsUrl,Q)),b.reliefUrl&&($=Qe(p,b.reliefUrl,Q)),b.fieldUrl&&(C=Qe(p,b.fieldUrl,Q,{channels:1})),b.windUrl&&(D=Qe(p,b.windUrl,Q)),b.patchUrl&&(k=Qe(p,b.patchUrl,Q,{channels:1}))},onRemove(){p&&(U.forEach(({program:S})=>p.deleteProgram(S)),U.clear(),G?.release(),G=null,$?.release(),$=null,C?.release(),C=null,D?.release(),D=null,k?.release(),k=null,H&&(p.deleteBuffer(H.pos),p.deleteBuffer(H.sphere),p.deleteBuffer(H.index),H=null),z=null,p=null)},render(S,X){if(!H||b.nightDarkness<=0)return;const R=X&&X.shaderData,W=X&&X.defaultProjectionData;if(!R||!W)return;const{program:ee,attribs:V,uniforms:B}=j(R);p.useProgram(ee),B.matrix&&p.uniformMatrix4fv(B.matrix,!1,W.mainMatrix),B.tileMercatorCoords&&p.uniform4f(B.tileMercatorCoords,...W.tileMercatorCoords),B.clippingPlane&&p.uniform4f(B.clippingPlane,...W.clippingPlane),B.transition&&p.uniform1f(B.transition,W.projectionTransition),B.fallbackMatrix&&p.uniformMatrix4fv(B.fallbackMatrix,!1,W.fallbackMatrix);const Se=z.getCenter().lat,pe=0;B.elevationGlobe&&p.uniform1f(B.elevationGlobe,pe),B.elevationMercator&&p.uniform1f(B.elevationMercator,ue.MercatorCoordinate.fromLngLat([0,Se],pe).z),B.sun&&p.uniform3f(B.sun,...b.sun),B.camera&&p.uniform3f(B.camera,...yt(z,ue)),B.globeness&&p.uniform1f(B.globeness,W.projectionTransition),B.nightDarkness&&p.uniform1f(B.nightDarkness,b.nightDarkness),B.nightColour&&p.uniform3f(B.nightColour,...b.nightColour),B.twilightColour&&p.uniform3f(B.twilightColour,...b.twilightColour),B.twilightCool&&p.uniform3f(B.twilightCool,...b.twilightCool),B.twilightStrength&&p.uniform1f(B.twilightStrength,b.twilightStrength),B.lightsAmount&&p.uniform1f(B.lightsAmount,G?.ready?b.lightsAmount:0);const he=$?.ready?us(z.getZoom(),Se,b.reliefWidth).strength:0;B.reliefPower&&p.uniform1f(B.reliefPower,b.reliefPower*he),B.cloudShadow&&p.uniform1f(B.cloudShadow,b.cloudShadow),B.shadowSoftness&&p.uniform1f(B.shadowSoftness,b.shadowSoftness),B.cloudAltitude&&p.uniform1f(B.cloudAltitude,ha/pa);const Le=b.eclipse?b.date:null,Fe=Le&&_l(Le)?Dr(Le):null;B.sunRadius&&p.uniform1f(B.sunRadius,Fe?wl(Le):0),Fe&&B.moon&&p.uniform3f(B.moon,...Fe),wr(p,B,b,{seconds:performance.now()*.001,field:C,wind:D,patches:k},Ht.field,Ht.wind,Ht.patches),J(B,$,"relief",Ht.relief),J(B,G,"lights",Ht.lights),p.bindBuffer(p.ARRAY_BUFFER,H.pos),p.enableVertexAttribArray(V.pos),p.vertexAttribPointer(V.pos,2,p.FLOAT,!1,0,0),p.bindBuffer(p.ARRAY_BUFFER,H.sphere),p.enableVertexAttribArray(V.sphere),p.vertexAttribPointer(V.sphere,3,p.FLOAT,!1,0,0),p.disable(p.DEPTH_TEST),p.depthMask(!1),p.bindBuffer(p.ELEMENT_ARRAY_BUFFER,H.index),p.drawElements(p.TRIANGLES,A.indices.length,p.UNSIGNED_SHORT,0),p.enable(p.DEPTH_TEST),p.depthMask(!0),b.animate&&(C?.ready||k?.ready)&&b.cloudShadow>0&&z.triggerRepaint()},setOptions(S={}){const X=b;if(b={...b,...S},!p){z?.triggerRepaint();return}const R=(W,ee)=>{if(S[ee]===void 0||S[ee]===X[ee])return W;W?.release();const V=ee==="patchUrl"||ee==="fieldUrl"?{channels:1}:void 0;return b[ee]?Qe(p,b[ee],Q,V):null};G=R(G,"lightsUrl"),$=R($,"reliefUrl"),C=R(C,"fieldUrl"),D=R(D,"windUrl"),k=R(k,"patchUrl"),z?.triggerRepaint()},getOptions:()=>({...b}),get hasLights(){return!!G?.ready},get hasRelief(){return!!$?.ready}}},Al=Ir,Fr="tm-atmosphere",Sl=63710088e-1,Ca=2e5,Ll=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_pos;
attribute vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
varying vec3 v_sphere;
${ya}
void main() {
  v_sphere = a_sphere;
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,Ml=()=>`precision highp float;
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

${mr}

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
}`,Rl=({strength:e=1,sun:t=[.4,.5,.75],dayColour:r=[.32,.55,1],duskColour:n=[1,.45,.18],forwardScatter:i=.35,scatterG:s=.6}={})=>{const o=ga();let l=null,a=null,h=null;const y=new Map;let T={strength:e,sun:t,dayColour:r,duskColour:n,forwardScatter:i,scatterG:s};const v=I=>{const g=I.variantName;if(y.has(g))return y.get(g);const m=Ze(a,Ll(I),Ml(),"tm-atmosphere",{es300:!0}),w={program:m,attribs:{pos:a.getAttribLocation(m,"a_pos"),sphere:a.getAttribLocation(m,"a_sphere")},uniforms:{elevationGlobe:a.getUniformLocation(m,"a_elevation_globe"),elevationMercator:a.getUniformLocation(m,"a_elevation_mercator"),camera:a.getUniformLocation(m,"u_camera"),sun:a.getUniformLocation(m,"u_sun"),top:a.getUniformLocation(m,"u_top"),strength:a.getUniformLocation(m,"u_strength"),dayColour:a.getUniformLocation(m,"u_dayColour"),duskColour:a.getUniformLocation(m,"u_duskColour"),forward:a.getUniformLocation(m,"u_forward"),scatterG:a.getUniformLocation(m,"u_scatter_g"),matrix:a.getUniformLocation(m,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(m,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(m,"u_projection_clipping_plane"),transition:a.getUniformLocation(m,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(m,"u_projection_fallback_matrix")}};return y.set(g,w),w};return{id:Fr,type:"custom",renderingMode:"3d",onAdd(I,g){l=I,a=g;const m=(w,E)=>{const L=a.createBuffer();return a.bindBuffer(w,L),a.bufferData(w,E,a.STATIC_DRAW),L};h={pos:m(a.ARRAY_BUFFER,o.positions),sphere:m(a.ARRAY_BUFFER,o.spheres),index:m(a.ELEMENT_ARRAY_BUFFER,o.indices)}},onRemove(){a&&(y.forEach(({program:I})=>a.deleteProgram(I)),y.clear(),h&&(a.deleteBuffer(h.pos),a.deleteBuffer(h.sphere),a.deleteBuffer(h.index),h=null),l=null,a=null)},render(I,g){if(!h||T.strength<=0)return;const m=g&&g.shaderData,w=g&&g.defaultProjectionData;if(!m||!w)return;const{program:E,attribs:L,uniforms:d}=v(m);a.useProgram(E),d.matrix&&a.uniformMatrix4fv(d.matrix,!1,w.mainMatrix),d.tileMercatorCoords&&a.uniform4f(d.tileMercatorCoords,...w.tileMercatorCoords),d.clippingPlane&&a.uniform4f(d.clippingPlane,...w.clippingPlane),d.transition&&a.uniform1f(d.transition,w.projectionTransition),d.fallbackMatrix&&a.uniformMatrix4fv(d.fallbackMatrix,!1,w.fallbackMatrix);const c=l.getCenter().lat;d.elevationGlobe&&a.uniform1f(d.elevationGlobe,Ca),d.elevationMercator&&a.uniform1f(d.elevationMercator,ue.MercatorCoordinate.fromLngLat([0,c],Ca).z);const O=yt(l,ue);d.camera&&a.uniform3f(d.camera,O[0],O[1],O[2]),d.sun&&a.uniform3f(d.sun,...T.sun),d.top&&a.uniform1f(d.top,1+Ca/Sl),d.strength&&a.uniform1f(d.strength,T.strength),d.dayColour&&a.uniform3f(d.dayColour,...T.dayColour),d.duskColour&&a.uniform3f(d.duskColour,...T.duskColour),d.forward&&a.uniform1f(d.forward,T.forwardScatter),d.scatterG&&a.uniform1f(d.scatterG,T.scatterG),a.bindBuffer(a.ARRAY_BUFFER,h.pos),a.enableVertexAttribArray(L.pos),a.vertexAttribPointer(L.pos,2,a.FLOAT,!1,0,0),a.bindBuffer(a.ARRAY_BUFFER,h.sphere),a.enableVertexAttribArray(L.sphere),a.vertexAttribPointer(L.sphere,3,a.FLOAT,!1,0,0),a.enable(a.DEPTH_TEST),a.depthFunc(a.LEQUAL),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,h.index),a.drawElements(a.TRIANGLES,o.indices.length,a.UNSIGNED_SHORT,0),a.depthMask(!0)},setOptions(I={}){T={...T,...I},l?.triggerRepaint()},getOptions:()=>({...T})}},Pl=Fr,Cl=32,Ur=[{width:8192,height:4096,url:"/timemap/ocean-sdf-8192.webp"},{width:4096,height:2048,url:"/timemap/ocean-sdf-4096.webp"}],Dl=`
  float oceanDistanceKm(float stored, float rangeKm) {
    return (stored * 2.0 - 1.0) * rangeKm;
  }
`,Nr="tm-ocean",Il=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_pos;
attribute vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
varying vec3 v_sphere;
${ya}
void main() {
  v_sphere = a_sphere;
  // Sea level: the glint belongs on the water, not above it.
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,Fl=()=>`precision highp float;
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
${ba}
${fr}
${pr}
${Wa}
${Dl}

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
}`,Ul=(e,{fadeInAbove:t=9e5,fadeOutBelow:r=18e4}={})=>{const n=Math.max(0,Math.min(1,(e-r)/(t-r)));return n*n*(3-2*n)},Nl=(e,t,r=.8)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e);return Math.max(r,n*1.5/1e3)},Ol=40075,Bl=e=>Number.isFinite(e)&&e>0?Ol/e/2:.8,Ho=(e,t=Ur)=>t.find(r=>r.width<=e&&r.height<=e)||null,Ql=({opacity:e=1,strength:t=.9,roughness:r=.55,windPatch:n=.3,windScale:i=14,edgeRemap:s=0,sun:o=[.4,.5,.75],water:l=1,absorption:a=[.45,.06,.02],scatter:h=[.12,.265,.43],bottom:y=[.42,.4,.33],sky:T=[.34,.5,.76],shelfKm:v=22,shelfDepthM:I=16,shoreSoftnessKm:g=.8,fadeInAbove:m=9e5,fadeOutBelow:w=18e4,sources:E=Ur}={})=>{const L=ga();let d=null,c=null,O=null,N=null,A=null,z=!1;const p=new Map;let H={opacity:e,strength:t,roughness:r,windPatch:n,windScale:i,edgeRemap:s,sun:o,water:l,absorption:a,scatter:h,bottom:y,sky:T,shelfKm:v,shelfDepthM:I,shoreSoftnessKm:g,fadeInAbove:m,fadeOutBelow:w,sources:E};const G=k=>{const U=k.variantName;if(p.has(U))return p.get(U);const b=Ze(c,Il(k),Fl(),"tm-ocean",{es300:!0}),j={program:b,attribs:{pos:c.getAttribLocation(b,"a_pos"),sphere:c.getAttribLocation(b,"a_sphere")},uniforms:{elevationGlobe:c.getUniformLocation(b,"a_elevation_globe"),elevationMercator:c.getUniformLocation(b,"a_elevation_mercator"),camera:c.getUniformLocation(b,"u_camera"),sun:c.getUniformLocation(b,"u_sun"),globeness:c.getUniformLocation(b,"u_globeness"),field:c.getUniformLocation(b,"u_field"),rangeKm:c.getUniformLocation(b,"u_rangeKm"),shoreKm:c.getUniformLocation(b,"u_shoreKm"),shelfKm:c.getUniformLocation(b,"u_shelfKm"),strength:c.getUniformLocation(b,"u_strength"),roughness:c.getUniformLocation(b,"u_roughness"),windPatch:c.getUniformLocation(b,"u_windPatch"),windScale:c.getUniformLocation(b,"u_windScale"),water:c.getUniformLocation(b,"u_water"),scatter:c.getUniformLocation(b,"u_scatter"),bottom:c.getUniformLocation(b,"u_bottom"),absorption:c.getUniformLocation(b,"u_absorption"),shelfDepthM:c.getUniformLocation(b,"u_shelfDepthM"),sky:c.getUniformLocation(b,"u_sky"),fade:c.getUniformLocation(b,"u_fade"),opacity:c.getUniformLocation(b,"u_opacity"),edgeRemap:c.getUniformLocation(b,"u_edgeRemap"),matrix:c.getUniformLocation(b,"u_projection_matrix"),tileMercatorCoords:c.getUniformLocation(b,"u_projection_tile_mercator_coords"),clippingPlane:c.getUniformLocation(b,"u_projection_clipping_plane"),transition:c.getUniformLocation(b,"u_projection_transition"),fallbackMatrix:c.getUniformLocation(b,"u_projection_fallback_matrix")}};return p.set(U,j),j},$=()=>{A=c.createTexture(),c.bindTexture(c.TEXTURE_2D,A),c.texImage2D(c.TEXTURE_2D,0,c.LUMINANCE,1,1,0,c.LUMINANCE,c.UNSIGNED_BYTE,new Uint8Array([0])),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,c.LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,c.LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE)},C=k=>{c&&(A&&c.deleteTexture(A),A=c.createTexture(),c.bindTexture(c.TEXTURE_2D,A),c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL,!1),gr(c)?c.texImage2D(c.TEXTURE_2D,0,c.R8,c.RED,c.UNSIGNED_BYTE,k):c.texImage2D(c.TEXTURE_2D,0,c.LUMINANCE,c.LUMINANCE,c.UNSIGNED_BYTE,k),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.REPEAT),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,c.LINEAR_MIPMAP_LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,c.LINEAR),c.generateMipmap(c.TEXTURE_2D),z=!0,d?.triggerRepaint())},D=()=>{const k=Ho(c.getParameter(c.MAX_TEXTURE_SIZE),H.sources);if(!k)return;const U=k.url;O=k.width,fetch(U,{credentials:"omit"}).then(b=>b.ok?b.blob():Promise.reject(new Error(b.status))).then(b=>createImageBitmap(b,{colorSpaceConversion:"none",premultiplyAlpha:"none",imageOrientation:"none"})).then(b=>{if(Ho(c?.getParameter(c.MAX_TEXTURE_SIZE)??0,H.sources)?.url!==U){b.close?.();return}C(b),b.close?.()}).catch(()=>{})};return{id:Nr,type:"custom",renderingMode:"3d",onAdd(k,U){d=k,c=U;const b=(j,Q)=>{const J=c.createBuffer();return c.bindBuffer(j,J),c.bufferData(j,Q,c.STATIC_DRAW),J};N={pos:b(c.ARRAY_BUFFER,L.positions),sphere:b(c.ARRAY_BUFFER,L.spheres),index:b(c.ELEMENT_ARRAY_BUFFER,L.indices)},$(),D()},onRemove(){c&&(p.forEach(({program:k})=>c.deleteProgram(k)),p.clear(),A&&(c.deleteTexture(A),A=null,z=!1),N&&(c.deleteBuffer(N.pos),c.deleteBuffer(N.sphere),c.deleteBuffer(N.index),N=null),d=null,c=null)},render(k,U){if(!N||H.opacity<=0)return;const b=U&&U.shaderData,j=U&&U.defaultProjectionData;if(!b||!j)return;const{program:Q,attribs:J,uniforms:S}=G(b);c.useProgram(Q),S.matrix&&c.uniformMatrix4fv(S.matrix,!1,j.mainMatrix),S.tileMercatorCoords&&c.uniform4f(S.tileMercatorCoords,...j.tileMercatorCoords),S.clippingPlane&&c.uniform4f(S.clippingPlane,...j.clippingPlane),S.transition&&c.uniform1f(S.transition,j.projectionTransition),S.fallbackMatrix&&c.uniformMatrix4fv(S.fallbackMatrix,!1,j.fallbackMatrix);const X=d.getCenter(),R=0;S.elevationGlobe&&c.uniform1f(S.elevationGlobe,R),S.elevationMercator&&c.uniform1f(S.elevationMercator,ue.MercatorCoordinate.fromLngLat([0,X.lat],R).z),S.camera&&c.uniform3f(S.camera,...yt(d,ue)),S.sun&&c.uniform3f(S.sun,...H.sun),S.globeness&&c.uniform1f(S.globeness,j.projectionTransition),S.field&&(c.activeTexture(c.TEXTURE0),c.bindTexture(c.TEXTURE_2D,A),c.uniform1i(S.field,0)),S.rangeKm&&c.uniform1f(S.rangeKm,Cl),S.shoreKm&&c.uniform1f(S.shoreKm,Nl(d.getZoom(),X.lat,Math.max(H.shoreSoftnessKm,Bl(O)))),S.shelfKm&&c.uniform1f(S.shelfKm,H.shelfKm),S.strength&&c.uniform1f(S.strength,H.strength),S.roughness&&c.uniform1f(S.roughness,H.roughness),S.windPatch&&c.uniform1f(S.windPatch,H.windPatch),S.windScale&&c.uniform1f(S.windScale,H.windScale),S.water&&c.uniform1f(S.water,H.water),S.scatter&&c.uniform3f(S.scatter,...H.scatter),S.bottom&&c.uniform3f(S.bottom,...H.bottom),S.absorption&&c.uniform3f(S.absorption,...H.absorption),S.shelfDepthM&&c.uniform1f(S.shelfDepthM,H.shelfDepthM),S.sky&&c.uniform3f(S.sky,...H.sky),S.opacity&&c.uniform1f(S.opacity,H.opacity),S.edgeRemap&&c.uniform1f(S.edgeRemap,H.edgeRemap),S.fade&&c.uniform1f(S.fade,Ul(ja(d,ue),H)),c.bindBuffer(c.ARRAY_BUFFER,N.pos),c.enableVertexAttribArray(J.pos),c.vertexAttribPointer(J.pos,2,c.FLOAT,!1,0,0),c.bindBuffer(c.ARRAY_BUFFER,N.sphere),c.enableVertexAttribArray(J.sphere),c.vertexAttribPointer(J.sphere,3,c.FLOAT,!1,0,0),c.disable(c.DEPTH_TEST),c.depthMask(!1),c.bindBuffer(c.ELEMENT_ARRAY_BUFFER,N.index),c.drawElements(c.TRIANGLES,L.indices.length,c.UNSIGNED_SHORT,0),c.enable(c.DEPTH_TEST),c.depthMask(!0)},setOptions(k={}){const U=H.sources;H={...H,...k},k.sources!==void 0&&k.sources!==U&&(z=!1,c&&D()),d?.triggerRepaint()},getOptions:()=>({...H}),get hasField(){return z}}},ql=Nr,Or=(e,t,r,n=!0)=>{const i=Math.max(1,Math.floor(t)),s=Math.max(1,Math.floor(r)),o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,i,s,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let l=null;return n&&(l=e.createFramebuffer(),e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0)),{texture:o,framebuffer:l,width:i,height:s}},Go=(e,t)=>{t&&(t.texture&&e.deleteTexture(t.texture),t.framebuffer&&e.deleteFramebuffer(t.framebuffer))},Hl=(e,t,r)=>{const n=[];for(let i=1;i<=r;i++){const s=2**i;n.push({width:Math.max(1,Math.floor(e/s)),height:Math.max(1,Math.floor(t/s))})}return n},Gl=(e,t,r,n)=>Hl(t,r,n).map(i=>Or(e,i.width,i.height)),$l=new Float32Array([-1,-1,1,-1,-1,1,1,1]),zl=e=>{const t=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,$l,e.STATIC_DRAW),t},Wl=`precision highp float;
attribute vec2 a_corner;
varying vec2 v_uv;
void main() {
  v_uv = a_corner * 0.5 + 0.5;
  gl_Position = vec4(a_corner, 0.0, 1.0);
}`,jl=e=>({framebuffer:e.getParameter(e.FRAMEBUFFER_BINDING),viewport:e.getParameter(e.VIEWPORT)}),$o=(e,t)=>{e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.viewport(t.viewport[0],t.viewport[1],t.viewport[2],t.viewport[3]),e.activeTexture(e.TEXTURE0),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.enable(e.BLEND),e.depthMask(!0)},Da=(e,t,r)=>{e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.viewport(0,0,t.width,t.height),e.useProgram(r)},Gt=(e,t,r)=>{e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4)},$t=(e,t,r,n)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r),n&&e.uniform1i(n,t)},Br="tm-bloom",zo=5,Yl=[[1.18,.92,.68],[1.12,.95,.78],[1.06,.98,.89],[1.02,1,.97]],Xl=[1,1,1],Vl=()=>`precision highp float;
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
}`,Kl=()=>`precision highp float;
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
}`,Zl=()=>`precision highp float;
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
}`,Jl=()=>`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_bloom;
uniform float u_strength;

void main() {
  gl_FragColor = vec4(texture2D(u_bloom, v_uv).rgb * u_strength, 0.0);
}`,ec=()=>`precision highp float;
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
}`,tc={saturation:1,hue:0,exposure:1,contrast:1},ac=e=>Math.abs((e?.saturation??1)-1)>.001||Math.abs(e?.hue??0)>.001||Math.abs((e?.exposure??1)-1)>.001||Math.abs((e?.contrast??1)-1)>.001,oc=({strength:e=.9,threshold:t=.6,knee:r=.12,radius:n=1,chromatic:i=!0,...s}={})=>{let o=null,l=null,a=null,h=null,y=null,T=null,v=null,I={strength:e,threshold:t,knee:r,radius:n,chromatic:i,...tc,...s};const g=()=>{const E=(L,d,c)=>{const O=Ze(l,Wl,L,d),N={};return c.forEach(A=>{N[A]=l.getUniformLocation(O,`u_${A}`)}),{program:O,corner:l.getAttribLocation(O,"a_corner"),...N}};return{bright:E(Vl(),"tm-bloom-bright",["scene","threshold","knee"]),down:E(Kl(),"tm-bloom-down",["source","texel"]),up:E(Zl(),"tm-bloom-up",["source","texel","radius","tint"]),composite:E(Jl(),"tm-bloom-composite",["bloom","strength"]),grade:E(ec(),"tm-grade",["scene","saturation","hue","exposure","contrast"])}},m=()=>{Go(l,y),y=null,T&&T.forEach(E=>Go(l,E)),T=null,v=null},w=(E,L)=>{v&&v.width===E&&v.height===L||(m(),y=Or(l,E,L,!1),T=Gl(l,E,L,zo),v={width:E,height:L})};return{id:Br,type:"custom",renderingMode:"2d",onAdd(E,L){o=E,l=L,a=zl(l)},onRemove(){l&&(h&&(Object.values(h).forEach(({program:E})=>l.deleteProgram(E)),h=null),m(),a&&(l.deleteBuffer(a),a=null),o=null,l=null)},render(){const E=ac(I);if(!a||I.strength<=0&&!E)return;const L=o.getCanvas(),d=Math.max(1,L.width),c=Math.max(1,L.height),O=jl(l);h=h||g(),w(d,c),l.bindTexture(l.TEXTURE_2D,y.texture),l.copyTexImage2D(l.TEXTURE_2D,0,l.RGBA,0,0,d,c,0),l.disable(l.DEPTH_TEST),l.disable(l.BLEND),l.depthMask(!1),E&&(l.bindFramebuffer(l.FRAMEBUFFER,null),l.viewport(0,0,d,c),l.useProgram(h.grade.program),$t(l,0,y.texture,h.grade.scene),h.grade.saturation&&l.uniform1f(h.grade.saturation,I.saturation),h.grade.hue&&l.uniform1f(h.grade.hue,I.hue),h.grade.exposure&&l.uniform1f(h.grade.exposure,I.exposure),h.grade.contrast&&l.uniform1f(h.grade.contrast,I.contrast),Gt(l,a,h.grade.corner),l.bindTexture(l.TEXTURE_2D,y.texture),l.copyTexImage2D(l.TEXTURE_2D,0,l.RGBA,0,0,d,c,0));const N=I.strength*ic(o?.getZoom?.());if(N<=0){$o(l,O);return}Da(l,T[0],h.bright.program),$t(l,0,y.texture,h.bright.scene),h.bright.threshold&&l.uniform1f(h.bright.threshold,I.threshold),h.bright.knee&&l.uniform1f(h.bright.knee,I.knee),Gt(l,a,h.bright.corner);for(let A=1;A<T.length;A++){const z=T[A-1];Da(l,T[A],h.down.program),$t(l,0,z.texture,h.down.source),h.down.texel&&l.uniform2f(h.down.texel,1/z.width,1/z.height),Gt(l,a,h.down.corner)}l.enable(l.BLEND),l.blendFunc(l.ONE,l.ONE);for(let A=T.length-1;A>0;A--){const z=T[A-1];if(Da(l,z,h.up.program),$t(l,0,T[A].texture,h.up.source),h.up.texel&&l.uniform2f(h.up.texel,1/z.width,1/z.height),h.up.radius&&l.uniform1f(h.up.radius,I.radius),h.up.tint){const p=I.chromatic?Yl[T.length-1-A]:Xl;l.uniform3f(h.up.tint,...p)}Gt(l,a,h.up.corner)}l.bindFramebuffer(l.FRAMEBUFFER,O.framebuffer),l.viewport(O.viewport[0],O.viewport[1],O.viewport[2],O.viewport[3]),l.useProgram(h.composite.program),$t(l,0,T[0].texture,h.composite.bloom),h.composite.strength&&l.uniform1f(h.composite.strength,N),Gt(l,a,h.composite.corner),$o(l,O)},setOptions(E={}){I={...I,...E},o?.triggerRepaint()},getOptions:()=>({...I}),get levelCount(){return zo}}},rc=Br,nc=[2.5,4],ic=e=>{const[t,r]=nc;if(!Number.isFinite(e)||e<=t)return 1;if(e>=r)return 0;const n=(e-t)/(r-t);return 1-n*n*(3-2*n)},Xa=[{key:"starfield",option:"brightness",label:"Stars",default:.5,max:1},{key:"sun",option:"brightness",label:"Sun",default:1,max:1},{key:"moon",option:"brightness",label:"Moon",default:1,max:1},{key:"daylight",option:"nightDarkness",label:"Day and night",default:.965,max:1},{key:"atmosphere",option:"strength",label:"Atmosphere",default:1,max:1},{key:"clouds",option:"opacity",label:"Clouds",default:1,max:1},{key:"ocean",option:"opacity",label:"Ocean",default:1,max:1},{key:"relief",option:"reliefPower",label:"Relief",default:0,max:2,on:"daylight"}],$a={key:"reference",default:0},sc="tm-layers-v2",lc=(e=globalThis.localStorage)=>{const t={};for(const r of Xa)t[r.key]={visible:r.default>0,value:r.default};t[$a.key]={visible:!1,value:$a.default};try{const r=JSON.parse(e?.getItem(sc)||"{}");for(const[n,i]of Object.entries(r)){if(!t[n]||!i||typeof i!="object")continue;const s=i.value;t[n]={visible:i.visible===!0,value:typeof s=="number"&&Number.isFinite(s)?s:t[n].value}}}catch{}return t},cc=(e,t)=>{const r=t?.visible?Number(t.value):0;return{[e.option]:Number.isFinite(r)?r:0}},uc=(e,t)=>{const r=[];for(const n of Xa){const i=e?.[n.on||n.key];!i||typeof i.setOptions!="function"||(i.setOptions(cc(n,t?.[n.key])),r.push(n.key))}return r},hc=(e,{onReference:t=null,target:r=globalThis}={})=>{const n=new Map(Xa.map(i=>[i.key,i]));return r.__tmSetLayer=(i,s)=>{const o=Number.isFinite(Number(s))?Number(s):0;if(i===$a.key)return t?.(o);const l=n.get(i);if(!l)return;const a=e?.[l.on||l.key];if(!(!a||typeof a.setOptions!="function"))return a.setOptions({[l.option]:o})},()=>{r.__tmSetLayer&&delete r.__tmSetLayer}},dc="/img/map/clouds-field.webp",fc="/img/map/wind-field.png",Wo="/img/map/cloud-patches.webp",Ia=e=>An(e).rgb.map(t=>t/255),jo=[["starfield",Qs,e=>Bs(e)],["sun",nl,e=>tl(e)],["moon",fl,e=>dl(e)],["ocean",ql,e=>Ql(e)],["daylight",Al,e=>kl(e)],["clouds",qa,e=>ps(e)],["atmosphere",Pl,e=>Rl(e)],["bloom",rc,e=>oc(e)]],mc=(e,t)=>{if(t&&e.getLayer(t))return t;let r;try{r=(e.getStyle()?.layers??[]).find(n=>n.type==="symbol"&&n.layout?.["text-field"]!=null)?.id}catch{}return t&&console.warn(`[globe-layers] "${t}" is not on this map; ${r?`anchoring under "${r}" so the labels stay readable`:"and nothing on it draws text, so the stack goes on top"}`),r},pc=(e,{date:t=new Date,reduceMotion:r=!1,beforeId:n,permitted:i=null}={})=>{const s=Wt(t),o=!r,l={fieldUrl:dc,patchUrl:Wo,windUrl:fc,windAmount:.2,animate:o},a={starfield:{date:t,animate:o},sun:{date:t},moon:{date:t,sun:s},ocean:{sun:s,roughness:.95,strength:.48,windPatch:.6,shoreSoftnessKm:19.5},clouds:{...l,sun:s},daylight:{...l,sun:s,date:t,cloudShadow:0},atmosphere:{sun:s,strength:1.25},bloom:{threshold:.86,strength:.45,knee:.06}},h={},y=mc(e,n);for(const[g,m,w]of jo){if(e.getLayer(m)&&e.removeLayer(m),i&&!i(g))continue;const E=w(a[g]);e.addLayer(E,y),h[g]=E}uc(h,lc());const T=hc(h),v=(g,m)=>h[g]?.setOptions?.(m),I=[window.__tune?.register("Ocean",[{key:"shoreSoftnessKm",label:"Shore falloff",min:0,max:25,step:.25,value:19.5,apply:g=>v("ocean",{shoreSoftnessKm:g})},{key:"roughness",label:"Roughness",min:0,max:1,step:.01,value:.95,apply:g=>v("ocean",{roughness:g})},{key:"strength",label:"Sun glint",min:0,max:1,step:.01,value:.48,apply:g=>v("ocean",{strength:g})},{key:"windPatch",label:"Patchiness",min:0,max:1,step:.01,value:.6,apply:g=>v("ocean",{windPatch:g})},{key:"windScale",label:"Wave scale",min:1,max:60,step:1,value:14,apply:g=>v("ocean",{windScale:g})},{key:"water",label:"Tint depth",min:0,max:2,step:.05,value:1,apply:g=>v("ocean",{water:g})},{key:"scatter",label:"Tint colour",type:"color",value:"#1d5c8f",apply:g=>v("ocean",{scatter:Ia(g)})},{key:"opacity",label:"Opacity",min:0,max:1,step:.01,value:1,apply:g=>v("ocean",{opacity:g})}],{tab:"Earth"}),window.__tune?.register("Clouds",[{key:"opacity",label:"Density",min:0,max:1,step:.01,value:1,apply:g=>v("clouds",{opacity:g})},{key:"windAmount",label:"Curl",min:0,max:1,step:.05,value:.2,apply:g=>v("clouds",{windAmount:g})},{key:"windScale",label:"Wind scale",min:.01,max:.5,step:.01,value:.06,apply:g=>v("clouds",{windScale:g})},{key:"windRate",label:"Wind speed",min:0,max:.3,step:.005,value:.05,apply:g=>v("clouds",{windRate:g})},{key:"cloudShadow",label:"Shadows",min:0,max:1,step:.01,value:0,apply:g=>v("daylight",{cloudShadow:g})},{key:"shadowSoftness",label:"Shadow edge",min:0,max:1,step:.01,value:.75,apply:g=>v("daylight",{shadowSoftness:g})},{key:"patchTiles",label:"Cloud cells",min:96,max:320,step:8,value:144,apply:g=>{v("clouds",{patchTiles:g}),v("daylight",{patchTiles:g})}},{key:"patchMean",label:"Atlas mean",min:.2,max:.8,step:.005,value:.4335,apply:g=>{v("clouds",{patchMean:g}),v("daylight",{patchMean:g})}},{key:"patchDetail",label:"Detail amount",min:0,max:1.5,step:.05,value:.75,apply:g=>{v("clouds",{patchDetail:g}),v("daylight",{patchDetail:g})}},{key:"patchUrl",label:"Tiled source",type:"boolean",value:!0,apply:g=>{const m=g?Wo:null;v("clouds",{patchUrl:m}),v("daylight",{patchUrl:m})}}],{tab:"Earth"}),window.__tune?.register("Cloud light",[{key:"cloudRelief",label:"Cloud height km",min:0,max:120,step:2,value:90,apply:g=>v("clouds",{cloudRelief:g})},{key:"cloudDepth",label:"Optical depth",min:0,max:12,step:.25,value:4,apply:g=>v("clouds",{cloudDepth:g})},{key:"powder",label:"Powder",min:0,max:1,step:.05,value:1,apply:g=>v("clouds",{powder:g})},{key:"forward",label:"Silver lining",min:0,max:2,step:.05,value:.5,apply:g=>v("clouds",{forward:g})},{key:"forwardG",label:"Lobe sharpness",min:0,max:.95,step:.05,value:.7,apply:g=>v("clouds",{forwardG:g})},{key:"selfShadow",label:"Self shadow",min:0,max:1,step:.02,value:.18,apply:g=>v("clouds",{selfShadow:g})},{key:"selfShadowStep",label:"Shadow reach",min:2e-4,max:.006,step:2e-4,value:.0015,apply:g=>v("clouds",{selfShadowStep:g})}],{tab:"Earth"}),window.__tune?.register("Sky and light",[{key:"nightDarkness",label:"Night",min:0,max:1,step:.005,value:.965,apply:g=>v("daylight",{nightDarkness:g})},{key:"twilightColour",label:"Twilight warm",type:"color",value:"#9e5229",apply:g=>v("daylight",{twilightColour:Ia(g)})},{key:"twilightCool",label:"Twilight blue",type:"color",value:"#1a2647",apply:g=>v("daylight",{twilightCool:Ia(g)})},{key:"twilightStrength",label:"Twilight strength",min:0,max:1,step:.05,value:.55,apply:g=>v("daylight",{twilightStrength:g})},{key:"atmosphere",label:"Haze",min:0,max:2,step:.05,value:1.25,apply:g=>v("atmosphere",{strength:g})},{key:"starfield",label:"Stars",min:0,max:1,step:.05,value:.5,apply:g=>v("starfield",{brightness:g})},{key:"sun",label:"Sun",min:0,max:2,step:.05,value:1,apply:g=>v("sun",{brightness:g})},{key:"moon",label:"Moon",min:0,max:2,step:.05,value:1,apply:g=>v("moon",{brightness:g})},{key:"moonGlow",label:"Moon glow",min:0,max:1.5,step:.05,value:.4,apply:g=>v("moon",{glow:g})},{key:"moonGlowExtent",label:"Moon glow reach",min:0,max:4,step:.1,value:1.8,apply:g=>v("moon",{glowExtent:g})}],{tab:"Earth"}),window.__tune?.register("Glare",[{key:"strength",label:"Strength",min:0,max:3,step:.05,value:.45,apply:g=>v("bloom",{strength:g})},{key:"threshold",label:"Threshold",min:0,max:1,step:.01,value:.86,apply:g=>v("bloom",{threshold:g})},{key:"knee",label:"Knee",min:0,max:.5,step:.01,value:.06,apply:g=>v("bloom",{knee:g})},{key:"radius",label:"Radius",min:.2,max:2,step:.05,value:1,apply:g=>v("bloom",{radius:g})},{key:"chromatic",label:"Warm at the edges",type:"boolean",value:!0,apply:g=>v("bloom",{chromatic:g})}],{tab:"Earth"}),window.__tune?.register("Colour grade",[{key:"saturation",label:"Saturation (0 = greyscale)",min:0,max:2,step:.01,value:1,apply:g=>v("bloom",{saturation:g})},{key:"hue",label:"Hue shift",min:-180,max:180,step:1,value:0,unit:"°",apply:g=>v("bloom",{hue:g*Math.PI/180})},{key:"exposure",label:"Exposure",min:.2,max:2.5,step:.01,value:1,apply:g=>v("bloom",{exposure:g})},{key:"contrast",label:"Contrast",min:.5,max:2,step:.01,value:1,apply:g=>v("bloom",{contrast:g})}],{tab:"Earth"})];return{layers:h,setDate(g){const m=g instanceof Date?g:new Date(g);if(Number.isNaN(m.getTime()))return;const w=Wt(m);for(const E of Object.keys(h))h[E]?.setOptions?.({date:m,sun:w})},remove(){T?.();for(const g of I)g?.();for(const[,g]of jo)e.getLayer(g)&&e.removeLayer(g)}}},Fa=111.32,ma=e=>e<0?0:e>1?1:e,gc=(e,t,r)=>{if(!(r>0))return Math.min(e,t);const n=ma(.5+.5*(t-e)/r);return t*(1-n)+e*n-r*n*(1-n)},sa=(e,t)=>{const r=Math.sin(e*127.1+t*311.7)*43758.5453;return r-Math.floor(r)},Yo=(e,t)=>{const r=Math.floor(e),n=Math.floor(t),i=e-r,s=t-n,o=i*i*(3-2*i),l=s*s*(3-2*s),a=sa(r,n),h=sa(r+1,n),y=sa(r,n+1),T=sa(r+1,n+1);return(a*(1-o)+h*o)*(1-l)+(y*(1-o)+T*o)*l},yc=(e,t)=>Yo(e,t)*.7+Yo(e*2.3,t*2.3)*.3,bc=(e,t,r,n=.5)=>r*Math.pow(ma(t>0?e/t:1),n),wc=({width:e,height:t,bbox:r,inside:n,seeds:i,lobeScale:s=6,lobeAmount:o=45,mergeKm:l=120})=>{const[a,h,y,T]=r,v=new Float32Array(e*t),I=y-a,g=T-h;let m=0;const w=(T+h)/2,E=Fa*Math.cos(w*Math.PI/180),L=([c,O])=>[(c-a)*E,(T-O)*Fa],d=i.map(L);for(let c=0;c<t;c++){const O=T-g*(c+.5)/t,N=(T-O)*Fa;for(let A=0;A<e;A++){const z=c*e+A;if(!n(A,c)){v[z]=1/0;continue}const H=(a+I*(A+.5)/e-a)*E;let G=1/0;for(const[D,k]of d){const U=Math.hypot(H-D,N-k);G=G===1/0?U:gc(G,U,l)}const $=yc(A/e*s,c/t*s)-.5,C=Math.max(0,G+$*2*o);v[z]=C,C>m&&(m=C)}}return{field:v,maxKm:m,spanKm:vc(v,m,.995)}},vc=(e,t,r)=>{if(!(t>0))return 0;const n=512,i=new Int32Array(n);let s=0;for(let a=0;a<e.length;a++){const h=e[a];Number.isFinite(h)&&(i[Math.min(n-1,Math.floor(h/t*n))]++,s++)}if(!s)return 0;const o=s*r;let l=0;for(let a=0;a<n;a++)if(l+=i[a],l>=o)return(a+1)/n*t;return t},_c=(e,t,{radiusKm:r,body:n,rim:i,rimKm:s,opacity:o,featherKm:l=8})=>{for(let a=0;a<t.length;a++){const h=t[a],y=a*4;if(!(h<=r+l)){e[y+3]=0;continue}const T=l>0?ma((r+l-h)/l):1,v=s>0?ma(1-(r-h)/s):0;e[y]=n[0]+(i[0]-n[0])*v,e[y+1]=n[1]+(i[1]-n[1])*v,e[y+2]=n[2]+(i[2]-n[2])*v,e[y+3]=255*o*T*(1+.35*v)}},Rt="tm-advance-src",Ua="tm-advance",be=256,Xo=e=>{const t=String(e).replace("#",""),r=t.length===3?t.split("").map(n=>n+n).join(""):t;return[0,2,4].map(n=>parseInt(r.slice(n,n+2),16)||0)},xc=e=>{let t=180,r=90,n=-180,i=-90;const s=o=>{if(typeof o[0]=="number"){const[l,a]=o;l<t&&(t=l),l>n&&(n=l),a<r&&(r=a),a>i&&(i=a);return}o.forEach(s)};return s(e.coordinates),[t,r,n,i]},Ec=e=>e.type==="Polygon"?[e.coordinates]:e.type==="MultiPolygon"?e.coordinates:[],Tc=(e,{beforeId:t,colour:r="#b31217",rimColour:n="#4a0505",opacity:i=.85,seconds:s=4,curve:o=.5,lobeScale:l=6,lobeAmount:a=45,mergeKm:h=120,rimKm:y=40,featherKm:T=10}={})=>{let v={colour:r,rimColour:n,opacity:i,seconds:s,curve:o,lobeScale:l,lobeAmount:a,mergeKm:h,rimKm:y,featherKm:T},I=null,g=null,m=null,w=null,E=null,L=null,d=!0;const c=()=>{I||(I=document.createElement("canvas"),I.width=be,I.height=be,g=I.getContext("2d",{willReadFrequently:!0}),m=g.createImageData(be,be))},O=(G,$)=>{const[C,D,k,U]=$,b=new Uint8Array(be*be),j=document.createElement("canvas");j.width=be,j.height=be;const Q=j.getContext("2d",{willReadFrequently:!0}),J=R=>(R-C)/(k-C)*be,S=R=>(U-R)/(U-D)*be;Q.fillStyle="#fff";for(const R of Ec(G))Q.beginPath(),R.forEach(W=>{W.forEach(([ee,V],B)=>B?Q.lineTo(J(ee),S(V)):Q.moveTo(J(ee),S(V))),Q.closePath()}),Q.fill("evenodd");const X=Q.getImageData(0,0,be,be).data;for(let R=0;R<b.length;R++)b[R]=X[R*4+3]>40?1:0;return b},N=(G,$)=>{if(!G||!$?.length)return!1;c();const C=xc(G),D=O(G,C),{field:k,maxKm:U,spanKm:b}=wc({width:be,height:be,bbox:C,inside:(R,W)=>D[W*be+R]===1,seeds:$,lobeScale:v.lobeScale,lobeAmount:v.lobeAmount,mergeKm:v.mergeKm});w={field:k,maxKm:U,spanKm:b,bbox:C};const[j,Q,J,S]=C,X=[[j,S],[J,S],[J,Q],[j,Q]];return e.getSource(Rt)?e.getSource(Rt).setCoordinates(X):(e.addSource(Rt,{type:"canvas",canvas:I,coordinates:X,animate:!0}),e.addLayer({id:Ua,type:"raster",source:Rt,paint:{"raster-opacity":1,"raster-fade-duration":0,"raster-resampling":"linear"}},t&&e.getLayer(t)?t:void 0)),!0},A=G=>{w&&(_c(m.data,w.field,{radiusKm:G,body:Xo(v.colour),rim:Xo(v.rimColour),rimKm:v.rimKm,opacity:v.opacity,featherKm:v.featherKm}),g.putImageData(m,0,0))},z=()=>{E&&cancelAnimationFrame(E),E=null},p=()=>{if(!w)return!1;z(),L=performance.now();const G=$=>{const C=($-L)/1e3;A(bc(C,v.seconds,w.spanKm,v.curve)),C<v.seconds?E=requestAnimationFrame(G):(E=null,A(w.maxKm),d||H())};return E=requestAnimationFrame(G),!0},H=()=>{z(),g&&g.clearRect(0,0,be,be)};return{prepare:N,play:p,clear:H,setOptions(G={}){const $=["lobeScale","lobeAmount","mergeKm"].some(C=>G[C]!==void 0&&G[C]!==v[C]);return v={...v,...G},$?"needs-rebuild":(w&&!E&&A(w.maxKm),"ok")},get maxKm(){return w?w.maxKm:0},get painted(){if(!m)return 0;let G=0;for(let $=3;$<m.data.length;$+=4)m.data[$]>8&&G++;return G},get running(){return E!==null},set holdAtEnd(G){d=!!G},remove(){z(),e.getLayer(Ua)&&e.removeLayer(Ua),e.getSource(Rt)&&e.removeSource(Rt),w=null}}},Vo=[{key:"cardWidth",property:"--card-width",label:"Width",min:240,max:420,step:1},{key:"cardBodyHeight",property:"--card-body-height",label:"Body height",min:120,max:520,step:4},{key:"cardFadeHeight",property:"--card-fade-height",label:"Fade height",min:0,max:160,step:2}],kc=(e,t=document.documentElement)=>{const r=getComputedStyle(t).getPropertyValue(e).trim(),n=parseFloat(r);return Number.isFinite(n)?r.endsWith("rem")?n*parseFloat(getComputedStyle(document.documentElement).fontSize||"16"):n:null},Ac=(e=globalThis)=>{if(!e.__tune?.register)return()=>{};const t=document.documentElement,r=Vo.map(i=>({key:i.key,label:i.label,min:i.min,max:i.max,step:i.step,value:kc(i.property)??i.min,apply:s=>t.style.setProperty(i.property,`${Number(s)}px`)})),n=e.__tune.register("Information card",r,{tab:"Map"});return()=>{n?.();for(const i of Vo)t.style.removeProperty(i.property)}},Ko="comic-",za="comic-coastline";function Qr(){const e=n=>({...n,id:n.id.startsWith(Ko)?n.id:Ko+n.id,...n.source==="coastline"?{source:za}:{},layout:{...n.layout||{},visibility:"none"}}),{under:t,over:r}=cn(la);return{under:t.map(e),over:r.map(e)}}const Sc=()=>{const{under:e,over:t}=Qr();return[...e,...t].map(r=>r.id)};function Lc(e,{origin:t="",underBefore:r,overBefore:n,isGone:i=()=>!1}={}){for(const[a,h]of Object.entries(rn(t)))e.getSource(a)||e.addSource(a,h);e.getSource(za)||e.addSource(za,{type:"geojson",data:`${t}${sn}/coast.geojson`,tolerance:nn});const{under:s,over:o}=Qr(),l=a=>a&&e.getLayer(a)?a:void 0;for(const a of s)e.getLayer(a.id)||e.addLayer(a,l(r));for(const a of o)e.getLayer(a.id)||e.addLayer(a,l(n));return ln(e,{origin:t,isGone:i})}function Mc(e,t){for(const r of Sc())e.getLayer(r)&&e.setLayoutProperty(r,"visibility",t?"visible":"none")}const Rc={chart:!0,water:la.seaColor,land:"#efe3c4",fillOpacity:.35,selected:"#e0a200",hover:"#ead7a4",shore:{color:la.inkColor,width:0,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:"#a08868",width:.8,blur:.3},text:{color:"#1d1712",halo:"#f6f1e4"},voyage:la.inkColor,paper:.12,vignette:"rgba(80,55,30,0.18)"},Pc=Yi.families.flatMap(e=>e.qids.flatMap(t=>[t,e.color])),Na=new Map(Ci.overrides.filter(e=>e.name).map(e=>[`${e.qid}|${e.name}`,e.use]));window.initTimeMap=function(t,r,n){const i={year:n,ready:!1,selectedRegion:null},s=()=>{window.__portal={ready:i.ready,year:i.year,selectedRegion:i.selectedRegion}};s();const o=new ue.Map({container:t,locale:mn(),zoomLevelsToOverscale:void 0,style:{version:8,projection:{type:"globe"},sky:{"atmosphere-blend":["interpolate",["linear"],["zoom"],2,.5,4,.35,6,.12,7,.04],"sky-color":"#0a1230","sky-horizon-blend":.5,"horizon-color":"#1a2c5a","horizon-fog-blend":.5,"fog-color":"#dcc9a0","fog-ground-blend":.7},glyphs:`${location.origin}/fonts/{fontstack}/{range}.pbf`,sources:{land:{type:"vector",tiles:[`${location.origin}/land-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},graticule:{type:"geojson",data:`${location.origin}/timemap/graticule.geojson`},dem:fn,satellite:dn,"satellite-detail":hn,coast:{type:"vector",tiles:[`${location.origin}/coast-echo-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},rivers:{type:"vector",tiles:[`${location.origin}/river-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},lakes:{type:"vector",tiles:[`${location.origin}/lake-tiles/{z}/{x}/{y}.pbf`],maxzoom:6},"ink-borders":{type:"vector",tiles:[`${location.origin}/ink-border-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},coastline:{type:"geojson",data:`${location.origin}/timemap/coastline.geojson`},cliopatria:{type:"vector",tiles:[`${location.origin}/cliopatria-tiles/{z}/{x}/{y}.pbf`],maxzoom:4,promoteId:{boundaries:"Wikidata"}},"hand-territories":{type:"geojson",data:vi(),promoteId:"id"},"boundaries-smooth":{type:"geojson",data:{type:"FeatureCollection",features:[]}},"boundaries-glow-src":{type:"geojson",data:{type:"FeatureCollection",features:[]}},"boundaries-cursor-name":{type:"geojson",data:{type:"FeatureCollection",features:[]}},...bn()},layers:[{id:"water",type:"background",paint:{"background-color":ae.water}},...un({visible:!1}),{id:"graticule",type:"line",source:"graticule",layout:{visibility:"none","line-cap":"round","line-join":"round"},paint:{"line-color":"#8a9aa0","line-width":.6,"line-opacity":.5}},{id:"coast-echo",type:"line",source:"coast","source-layer":"coast",layout:{visibility:"none","line-cap":"round"},paint:{"line-color":"#6b563d","line-width":.6}},{id:"coast-shadow",type:"line",source:"coastline",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#574631","line-width":2.6,"line-translate":[0,2],"line-blur":.4}},{id:"land",type:"fill",source:"land","source-layer":"land",paint:{"fill-color":ae.land}},{id:"hillshade",type:"hillshade",source:"dem",layout:{visibility:"none"},paint:{"hillshade-exaggeration":.45,"hillshade-illumination-direction":55,"hillshade-shadow-color":"#4a3a28","hillshade-highlight-color":"#fbf2d8","hillshade-accent-color":"#6b563d"}},{id:"lake-shadow",type:"line",source:"lakes","source-layer":"lakes",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#574631","line-width":2,"line-translate":[0,1.6],"line-blur":.4}},{id:"lakes",type:"fill",source:"lakes","source-layer":"lakes",paint:{"fill-color":ae.water}},{id:"lake-line",type:"line",source:"lakes","source-layer":"lakes",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#3a2c1a","line-width":.7,"line-opacity":.8}},{id:"coast-bold",type:"line",source:"coastline",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#2f2418","line-width":1.1}},...yn(["Cinzel"])]},center:[8.23,20],zoom:1.9,pitch:45,maxPitch:70,maxZoom:7,attributionControl:!1});o.on("styleimagemissing",u=>{u.id===wn&&vn(o)}),o.addControl(new ue.AttributionControl({compact:!0,customAttribution:["Borders © Cliopatria / Seshat (CC-BY 4.0)","Land © OpenStreetMap (CC0)","Cloud: NASA EOSDIS GIBS (MODIS)"]}),"bottom-left");let l=!1;const a=t.querySelector(".maplibregl-ctrl-attrib"),h=()=>{l||(a?.classList.remove("maplibregl-compact-show"),a?.removeAttribute("open"))};h(),o.on("resize",h),a?.addEventListener("click",()=>{l=!0}),window.__tmMap=o,t.style.background="radial-gradient(ellipse 90% 90% at 50% 48%, #14224a 0%, #070c1e 55%, #02030a 100%)",new ResizeObserver(()=>o.resize()).observe(t);let T=!0,v=!1;const I=()=>{if(!T||v)return;const u=document.querySelector("[data-timemap-deck]");if(!u)return;const _=t.getBoundingClientRect(),x=u.getBoundingClientRect(),P=Math.max(0,Math.min(_.bottom-x.top,_.height/3));Math.abs(parseFloat(t.style.top||"0")+P)<1||(t.style.top=`-${P}px`,t.style.height=`calc(100% + ${P}px)`,o.resize())},g=(u=0)=>{const _=document.querySelector("[data-timemap-deck]");if(!_){u<30&&setTimeout(()=>g(u+1),100);return}I(),new ResizeObserver(I).observe(_)};g();const m=ae.palette,w=["case",["boolean",["feature-state","selected"],!1],ae.selected,["match",["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q0"],1]],m.length],...m.flatMap((u,_)=>[_,u]),m[0]]],E=["case",["boolean",["feature-state","selected"],!1],ae.fillOpacity.selected,ae.fillOpacity.normal],L="#f59e0b",d=[[0,3],[4,7],[8,12]],c=(u=1)=>["interpolate",["linear"],["zoom"],...d.flatMap(([_,x])=>[_,x*u])],O=c(1),N=(u,_)=>["match",["get","confidence"],"low",u,_],A={opacityLow:.42,opacityMedium:.7,blurLow:3.2,blurMedium:1.4,width:1,dash:2},z=()=>N(A.opacityLow,A.opacityMedium),p=()=>N(A.blurLow,A.blurMedium),H=()=>[A.dash,A.dash*1.25],G=()=>["interpolate",["linear"],["zoom"],...[[0,.8],[4,1.4],[8,2.2]].flatMap(([u,_])=>[u,_*A.width])],$=u=>["all",["==",["get","Type"],"POLITY"],["!=",["slice",["get","Name"],0,1],"("],["<=",["to-number",["get","FromYear"]],u],[">=",["to-number",["get","ToYear"]],u]],C=30,D=u=>["min",["max",0,["min",1,["/",["-",u,["to-number",["get","FromYear"]]],C]]],["max",0,["min",1,["/",["-",["to-number",["get","ToYear"]],u],C]]]];let k=E,U=1,b=.55;try{const u=parseFloat(localStorage.getItem("tm-color-strength"));Number.isFinite(u)&&(b=Math.min(1,Math.max(0,u)))}catch{}const j=u=>Math.min(.92,Math.max(.06,u*(.45+1.1*b))),Q={normal:{opacity:null},hover:{colour:null,opacity:null},active:{colour:null,opacity:null}};let J=!0;const S={normal:{colour:null,width:null,opacity:null,blur:null},hover:{colour:null,width:null,opacity:null,blur:null},active:{colour:null,width:null,opacity:null,blur:null}},X=(u,_)=>{const x=S.normal[u]??_,P=S.hover[u]??x,q=S.active[u]??P;return P===x&&q===x?x:["case",["boolean",["feature-state","selected"],!1],q,["boolean",["feature-state","hover"],!1],P,x]},R=["boundaries-line","boundaries-smooth"],W=()=>{const u=ze[at]||{};for(const[_,x,P]of[["colour","line-color",u.line?.color??ae.line.color],["width","line-width",u.line?.width??ae.line.width],["blur","line-blur",u.line?.blur??0]]){const q=X(_,P);for(const F of R)ee[`${F}.${x}`]=q,V(F,x,q)}},ee={},V=(u,_,x)=>{const P=ee[`${u}.${_}`];if(o.getLayer(u))try{o.setPaintProperty(u,_,P!==void 0?P:x)}catch{}},B=()=>{const u=ze[at]||{},_=u.palette||m,x=["match",["coalesce",["get","Wikidata"],"Q0"],...Pc,["match",["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q0"],1]],_.length],..._.flatMap((P,q)=>[q,P]),_[0]]];return["case",["boolean",["feature-state","selected"],!1],Q.active.colour??u.selected??ae.selected,["boolean",["feature-state","hover"],!1],Q.hover.colour??u.hover??ae.hover,J?x:Vt]},Se=()=>{const u=ze[at]||{},_=j(u.fillOpacity!=null?u.fillOpacity:ae.fillOpacity.normal);k=["case",["boolean",["feature-state","selected"],!1],Q.active.opacity??Math.max(.85,_),["boolean",["feature-state","hover"],!1],Q.hover.opacity??Math.max(.6,_+.18),Q.normal.opacity??_]},pe=["boundaries-fill","hand-fill"],he=()=>{if(!o.getLayer("boundaries-fill"))return;const u=B();for(const _ of pe)if(o.getLayer(_))try{o.setPaintProperty(_,"fill-color",u)}catch{}Se(),ke(i.year)};window.__tmSetColorStrength=u=>{b=Math.min(1,Math.max(0,Number(u)||0));try{localStorage.setItem("tm-color-strength",String(b))}catch{}Se(),ke(i.year)};const Le=u=>["*",k,D(u)],Fe=u=>["*",U,D(u)];let it=!1;const ke=u=>{if(o.getLayer("boundaries-fill")){for(const _ of pe)o.getLayer(_)&&o.setPaintProperty(_,"fill-opacity",it?Le(u):k);o.getLayer("boundaries-line")&&o.setPaintProperty("boundaries-line","line-opacity",it?Fe(u):U),o.getLayer("hand-line")&&o.setPaintProperty("hand-line","line-opacity",it?["*",z(),D(u)]:z())}},bt=u=>["all",["<=",["to-number",["get","FromYear"]],u],[">=",["to-number",["get","ToYear"]],u]],Ct=u=>["all",["<=",["coalesce",["to-number",["get","start_decdate"]],-1e6],u],[">",["coalesce",["to-number",["get","end_decdate"]],1e6],u]],Dt=u=>{if(At?.setDate(Qt(u)),!o.getLayer("boundaries-fill"))return;o.setFilter("boundaries-fill",$(u)),o.setFilter("boundaries-line",$(u));for(const x of["hand-fill","hand-line"])o.getLayer(x)&&o.setFilter(x,$(u));et(),ke(u),o.setFilter("markers-dot",Ct(u)),o.setFilter("markers-label",Ct(u)),kn(o,u),we&&we.setYear(u);const _=ze[at]&&ze[at].borderSource?bt(u):$(u);for(let x=0;x<6;x++)o.getLayer(`ink-${x}`)&&o.setFilter(`ink-${x}`,_);Je()},jt=u=>{let _=0,x=0,P=0;for(let q=0,F=u.length-1;q<u.length;F=q++){const[K,Y]=u[F],[Z,oe]=u[q],ie=K*oe-Z*Y;_+=ie,x+=(K+Z)*ie,P+=(Y+oe)*ie}return _===0?{area:0,c:u[0]}:{area:Math.abs(_/2),c:[x/(3*_),P/(3*_)]}},st=new Set,It=new Set,wa=u=>It.has(u)||o.hasImage(`flag-${u}`)?Promise.resolve(!1):(It.add(u),o.loadImage(`/flags/${u}.png`).then(_=>(o.hasImage(`flag-${u}`)||o.addImage(`flag-${u}`,_.data),!0)).catch(()=>!1)),va={Q217196:[-3.7,40.4]};let Ft=new Map;const lt=()=>{const u=o.getSource("labels");u&&u.setData({type:"FeatureCollection",features:[...Ft.entries()].map(([_,x])=>({type:"Feature",geometry:{type:"Point",coordinates:va[_]||x.c},properties:{name:x.name,flag:o.hasImage(`flag-${_}`)?`flag-${_}`:"",sel:String(se)===_,hov:x.name===Ge}}))})},qe=()=>{if(!o.getSource("labels")||!o.getLayer("boundaries-fill"))return;const _=new Map,x=pe.filter(F=>o.getLayer(F));for(const F of o.queryRenderedFeatures({layers:x})){const K=F.properties.Name;if(K==null)continue;const Y=String(F.properties.Wikidata),Z=F.geometry,oe=Z.type==="Polygon"?[Z.coordinates]:Z.type==="MultiPolygon"?Z.coordinates:[];for(const ie of oe){const{area:le,c:Xe}=jt(ie[0]),Pe=_.get(Y);(!Pe||le>Pe.area)&&_.set(Y,{area:le,c:Xe,name:K})}}fe(),Ft=_;const P=lt;P();const q=[..._.keys()].filter(F=>st.has(F)&&!o.hasImage(`flag-${F}`)&&!It.has(F));q.length&&Promise.all(q.map(wa)).then(F=>{F.some(Boolean)&&P()})};fetch("/flags/manifest.json").then(u=>u.ok?u.json():[]).then(u=>{u.forEach(_=>st.add(String(_))),o.getLayer("boundaries-fill")&&qe()}).catch(()=>{}),window.__polityCache=window.__polityCache||{},fetch("/timemap/articles.json").then(u=>u.ok?u.json():{}).then(u=>Object.assign(window.__polityCache,u)).catch(()=>{});const ct=()=>qe();let Yt=null;const Je=()=>{clearTimeout(Yt),Yt=setTimeout(ct,250)};let wt=null,Xt=null;const vt="boundaries-smooth",Ee={type:"FeatureCollection",features:[]};let Me=0,_t=null,Vt="#5b7fa8";const Kt=()=>{const u=o.getSource(vt);if(!u)return;if(Me<1){u.setData(Ee);return}const _=[],x=new Set;for(const P of o.queryRenderedFeatures({layers:["boundaries-fill"]})){const q=`${P.id}|${P.geometry?.coordinates?.[0]?.[0]?.[0]??""}`;if(!x.has(q)){x.add(q);for(const F of Ea(P.geometry))F.length<4||_.push({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:ca(F,Me)}})}}u.setData({type:"FeatureCollection",features:_})},Ae=u=>{Me=Math.round(u);const _=Me>=1;for(const[x,P]of[["boundaries-line",!_],["boundaries-smooth",_]])if(o.getLayer(x))try{o.setLayoutProperty(x,"visibility",P?"visible":"none")}catch{}Kt()},et=()=>{_t&&clearTimeout(_t),_t=setTimeout(()=>{_t=null,Kt()},120)};let se=null,je=null,xt=null,Ut=null,Ue=!1;const Nt=()=>{se!==null&&(Ye(se,!1,Ue),se=null,Ue=!1)};let we=null,Re=null,ut=12,He=1.35,ht=180,Ge=null,Te=1,$e=null,dt=null;const M=()=>{if(!o.getLayer("boundaries-label"))return;const u=ut*Te,_=Ge&&Te!==1?["case",["==",["get","name"],Ge],u,ut]:ut;try{o.setLayoutProperty("boundaries-label","text-size",_)}catch{}},ne=u=>{if(u===Ge)return;const _=Te,x=u?He:1;Ge=u||Ge;const P=u;lt(),$e&&cancelAnimationFrame($e),dt&&clearTimeout(dt);const q=performance.now(),F=()=>{Te=x,Ge=P,M(),P||lt()},K=Y=>{const Z=ht>0?Math.min(1,(Y-q)/ht):1;if(Te=_+(x-_)*Oa.easeInOutQuad(Z),M(),Z<1){$e=requestAnimationFrame(K);return}$e=null,F()};$e=requestAnimationFrame(K),dt=setTimeout(()=>{dt=null,$e&&(cancelAnimationFrame($e),$e=null),F()},ht+40)},te="boundaries-cursor-name";let ge=null,de=!1;const fe=()=>{if(o.getLayer("boundaries-label"))try{o.setLayoutProperty("boundaries-label","visibility",de?"visible":"none")}catch{}},Ne=u=>o.queryRenderedFeatures({layers:["boundaries-label"]}).some(_=>_.properties?.name===u),Ot=(u,_)=>{const x=o.getSource(te);if(!x)return;const P=typeof u=="string"&&u.trim()!==""?u:null;if(ge=P,!P||!_){x.setData(Ee);return}const q=((_.lng+180)%360+360)%360-180;x.setData({type:"FeatureCollection",features:[{type:"Feature",properties:{name:P},geometry:{type:"Point",coordinates:[q,_.lat]}}]})},tt=(u,_=null,x=null)=>{const P=o.getSource("boundaries-glow-src");if(!P)return;const F=(u?Ea(u):[]).flatMap(K=>po(K)).filter(K=>K.length>=4).map(K=>({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:Me>=1?ca(K,Me):K}}));P.setData({type:"FeatureCollection",features:F}),ne(_)},Ye=(u,_,x=!1)=>o.setFeatureState(x?{source:"hand-territories",id:u}:{source:"cliopatria",sourceLayer:"boundaries",id:u},{selected:_}),Et=ae.palette,Tt=["#39496a","#4a3b63","#37614f","#63503b","#4c6140","#63415a","#3a5570","#56426a","#3f6657","#665445","#414f6e","#5c4258"],Zt="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>",ft=(u,_)=>["interpolate",["linear"],["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q7"],1]],89],0,u,88,_],ze={"soft-atlas":{palette:Et,water:"#c7d4c6",shore:{color:"#5b4a36",width:.7,shadow:"#9fb0b4",shadowWidth:1.8,dy:1.6},land:"#efe6d0",fillOpacity:.55,selected:"#f5c518",hover:"#ecd9a0",line:{color:"#6b5640",width:.8,blur:.3},grid:{color:"#93a18f",opacity:.5,width:.5},hillshade:!0,text:{color:"#3b3326",halo:"#f3ead6"},voyage:"#1f5f8f",paper:.08,vignette:"rgba(80,55,30,0.14)"},antique:{palette:Et,water:"#dcdcba",shore:{color:"#43301c",width:1,shadow:"#8f7d5c",shadowWidth:2.5,dy:2},land:"#e8d6ac",fillOpacity:.3,selected:"#e0a200",hover:"#d9c089",line:{color:"#4a3420",width:1.7,blur:.25},coast:{color:"#6a5238",opacity:.5,width:.85},river:{color:"#8a9aa0",opacity:.6,width:.7},mountains:!0,forest:!0,hillshade:!0,grid:{color:"#9b9277",opacity:.55,width:.55},text:{color:"#3a2c1a",halo:"#ecdcb8"},voyage:"#274f66",paper:.2,vignette:"rgba(80,55,30,0.3)"},"pen-ink":{palette:Et,water:"#dedec0",land:"#e6d6ad",fillOpacity:.16,selected:"#c98a00",hover:"#d9c089",shore:{color:"#2f2418",width:1.15,shadow:"#574631",shadowWidth:2.9,dy:2},line:{color:"#3a2c1c",width:ft(.4,1.2),blur:.25},borderSource:{source:"ink-borders",sourceLayer:"ink"},coast:{color:"#5e4a34",opacity:.55,width:.85},river:{color:"#6a7c74",opacity:.55,width:.6},grid:{color:"#8f8c6e",opacity:.45,width:.5},hillshade:!0,mountains:!0,forest:!0,inkLayers:[{color:"#5a4630",width:ft(1.2,2.4),opacity:.1,blur:1.4},{color:"#4a3826",width:ft(.7,1.5),opacity:.18,blur:.6,offset:.4},{color:"#33261a",width:ft(.4,1.2),opacity:.8,blur:.2},{color:"#2a1f12",width:.6,opacity:.32,blur:.1,offset:.4,dash:[3,3],above:!0}],text:{color:"#33271a",halo:"#efe2c4"},voyage:"#2f4e66",paper:.22,vignette:"rgba(80,55,30,0.3)"},satellite:{palette:Tt,imagery:!0,water:"#08131f",land:"#26331d",fillOpacity:.22,selected:"#f5c518",hover:"#e8cf94",shore:{color:"#f6efdc",width:.6,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:"#ffd9a0",width:.9,blur:.2},text:{color:"#241a10",halo:"#f2e9d4"},voyage:"#ffce6b",paper:0,vignette:"rgba(0,0,0,0.4)"},earth:{palette:Tt,imagery:!0,globe:!0,water:Ke.water,land:Ke.land,fillOpacity:.22,selected:Ke.selected,hover:Ke.hover,shore:{color:Ke.coast,width:.6,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:Ke.line,width:.9,blur:.2},text:{color:Ke.text,halo:Ke.halo},voyage:Ke.voyage,paper:0,vignette:"rgba(0,0,0,0.4)"},comic:{palette:Et,...Rc},night:{palette:Tt,water:"#0f1420",shore:{color:"#8a99b8",width:.7,shadow:"#070b12",shadowWidth:2,dy:1.6},land:"#1b2230",fillOpacity:.6,selected:"#f5c518",hover:"#5a6b8c",line:{color:"#8a99b8",width:.6,blur:.2},text:{color:"#e6ecf7",halo:"#10151f"},voyage:"#8fc3ef",paper:0,vignette:"rgba(0,0,0,0.45)"}},Hr=u=>{const _=t.parentElement;if(!_)return;let x=_.querySelector("#tm-paper");x||(x=document.createElement("div"),x.id="tm-paper",x.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:5;mix-blend-mode:multiply",x.style.backgroundImage=`url("${Zt}")`,_.appendChild(x)),x.style.opacity=String(u.paper);let P=_.querySelector("#tm-vignette");P||(P=document.createElement("div"),P.id="tm-vignette",P.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:6",_.appendChild(P)),P.style.background=`radial-gradient(ellipse 78% 78% at center, rgba(0,0,0,0) 52%, ${u.vignette} 100%)`},Jt=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;let kt=null,ea=null,Va=0;const Ka=()=>{kt=requestAnimationFrame(Ka);const u=performance.now();if(u-Va<55||(Va=u,!ea||!o.getLayer("coast-echo")))return;const _=u/1e3,x=ea.opacity,P=q=>{const F=x*Math.pow(.7,q);return Math.max(.05,F*(.74+.26*Math.sin(_*.9-q*.9)))};o.setPaintProperty("coast-echo","line-opacity",["interpolate",["linear"],["to-number",["get","echo"]],0,P(0),1,P(1),2,P(2),3,P(3)])},Gr=u=>{ea=u,!Jt&&!kt&&(kt=requestAnimationFrame(Ka))},$r=()=>{ea=null,kt&&(cancelAnimationFrame(kt),kt=null)};let At=null;const zr=35,Wr=.9;let St=12,Bt=12,ta=null,aa=0;const Qt=u=>Co(u,St),jr=()=>{const{lng:u}=o.getCenter();return js(u+zr,Co(i.year))},Za=u=>{ta=null;const _=aa?Math.min(.1,(u-aa)/1e3):1/60;aa=u;const x=Ys(St,Bt),P=1-Math.exp(-_/Wr);St=Math.abs(x)<.002?Bt:St+x*P,At?.setDate(Qt(i.year)),St!==Bt&&(ta=requestAnimationFrame(Za))},Ja=(u=!1)=>{if(Bt=jr(),u||Jt){St=Bt,At?.setDate(Qt(i.year));return}ta||(aa=0,ta=requestAnimationFrame(Za))},Yr=()=>{try{const{lng:u,lat:_}=o.getCenter(),x=We(u,_,0),P=Wt(Qt(i.year)),q=x[0]*P[0]+x[1]*P[1]+x[2]*P[2];return Math.max(0,Math.min(1,q*.5+.5))}catch{return 1}},Xr=()=>{if(!window.__tune)return;const u=(f,re,me)=>{if(o.getLayer(f))try{o.setPaintProperty(f,re,me)}catch{}},_=["boundaries-label","markers-label"],x=[["Cinzel","Cinzel (map serif)"],["Eagle Lake","Eagle Lake (calligraphy)"],["inter","Inter (plain)"]],P=(f,re)=>{for(const me of _)if(o.getLayer(me))try{o.setLayoutProperty(me,f,re)}catch{}},q=(f,re)=>{for(const me of _)u(me,f,re)},F={startLng:0,startLat:20,startZoom:.4,endLng:8.23,endLat:46.8,endZoom:4,seconds:3.5},K=()=>(we||console.warn("[tune] no fleet on this map yet"),we),Y={colour:L,strength:.55,width:1,blur:6},Z=()=>{u("boundaries-glow","line-color",Y.colour),u("boundaries-glow","line-opacity",Y.strength),u("boundaries-glow","line-width",c(Y.width)),u("boundaries-glow","line-blur",Y.blur)},oe={"Poland 1939":{year:1939,match:/^(second )?poland|polish republic/i,camera:{center:[19.4,52.1],zoom:4.4},seeds:[[15,52.3],[20.5,54],[19.6,49.4]]}},ie=12;let le=null,Xe="Poland 1939";const Pe=f=>f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.type==="MultiPolygon"?f.geometry.coordinates:[],tn=f=>{const re=o.queryRenderedFeatures({layers:["boundaries-fill"]});if(!re.length)return null;const me=xe=>{const pt=xe.flatMap(Pe);return pt.length?{type:"MultiPolygon",coordinates:pt}:null},_e=se!=null?re.filter(xe=>xe.id===se):[];if(_e.length)return{geometry:me(_e),from:"selected",label:_e[0]?.properties?.Name};const Ce=f?re.filter(xe=>f.test(String(xe.properties?.Name??""))):[];if(Ce.length)return{geometry:me(Ce),from:"preset",label:Ce[0]?.properties?.Name};const Be=new Map;for(const xe of re){const pt=xe.id??xe.properties?.Name;Be.set(pt,[...Be.get(pt)??[],xe])}const mt=[...Be.values()].sort((xe,pt)=>pt.flatMap(Pe).length-xe.flatMap(Pe).length)[0],Ve=mt?me(mt):null;return Ve?{geometry:Ve,from:"largest",label:mt[0]?.properties?.Name}:null},an=f=>{let re=180,me=-180,_e=90,Ce=-90;for(const mt of f.coordinates)for(const[Ve,xe]of mt[0]??[])Ve<re&&(re=Ve),Ve>me&&(me=Ve),xe<_e&&(_e=xe),xe>Ce&&(Ce=xe);const Be=(me-re)*.12;return[[re+Be,_e+(Ce-_e)*.25],[re+Be,(_e+Ce)/2],[re+Be,_e+(Ce-_e)*.75]]},ra=()=>({colour:ro,rimColour:no,opacity:io,seconds:so,curve:lo,lobeScale:co,lobeAmount:uo,mergeKm:ho,rimKm:fo}),oo=()=>{const f=oe[Xe];if(!f)return;se==null&&(window.__setTimemapYear(f.year),f.camera&&o.jumpTo(f.camera));let re=0;const me=()=>{const _e=tn(f.match);if(!_e){if(++re<ie){setTimeout(me,400);return}console.warn(`[tune] nothing on screen to advance across at ${f.year}`);return}const{geometry:Ce,from:Be,label:mt}=_e,Ve=Be==="preset"?f.seeds:an(Ce);Be!=="preset"&&console.info(`[tune] advancing across ${mt} (${Be})`),le?le.setOptions(ra()):(le=Tc(o,{beforeId:"boundaries-label",...ra()}),window.__tmAdvance=le),le.prepare(Ce,Ve)&&le.play()};setTimeout(me,400)};let ro="#b31217",no="#4a0505",io=.85,so=4,lo=.5,co=6,uo=45,ho=120,fo=40;const xa=()=>{le&&(le.setOptions(ra()),oo())},Mt=()=>{le&&le.setOptions(ra())};window.__tune.register("Territory · resting",[{key:"usePalette",label:"Per-country colours",type:"boolean",value:!0,apply:f=>{J=f,he()}},{key:"restColour",label:"Colour",type:"color",value:"#5b7fa8",apply:f=>{Vt=f,he()}},{key:"restOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:f=>{Q.normal.opacity=f>0?f:null,he()}},{key:"restBorderColour",label:"Border",type:"color",value:"#8a99b8",apply:f=>{S.normal.colour=f,W()}},{key:"restBorderWidth",label:"Border width",min:0,max:8,step:.1,value:1,apply:f=>{S.normal.width=f,W()}},{key:"restBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:f=>{S.normal.blur=f,W()}}],{tab:"Map"}),window.__tune.register("Territory · hover",[{key:"hoverColour",label:"Colour",type:"color",value:ae.hover,apply:f=>{Q.hover.colour=f,he()}},{key:"hoverOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:f=>{Q.hover.opacity=f>0?f:null,he()}},{key:"hoverBorderColour",label:"Border",type:"color",value:"#ecd9a0",apply:f=>{S.hover.colour=f,W()}},{key:"hoverBorderWidth",label:"Border width",min:0,max:8,step:.1,value:2,apply:f=>{S.hover.width=f,W()}},{key:"hoverBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:f=>{S.hover.blur=f,W()}}],{tab:"Map"}),window.__tune.register("Territory · active",[{key:"activeColour",label:"Colour",type:"color",value:ae.selected,apply:f=>{Q.active.colour=f,he()}},{key:"activeOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:f=>{Q.active.opacity=f>0?f:null,he()}},{key:"activeBorderColour",label:"Border",type:"color",value:"#f5c518",apply:f=>{S.active.colour=f,W()}},{key:"activeBorderWidth",label:"Border width",min:0,max:8,step:.1,value:2,apply:f=>{S.active.width=f,W()}},{key:"activeBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:f=>{S.active.blur=f,W()}}],{tab:"Map"}),window.__tune.register("Voyages",[{key:"voyageColour",label:"Route",type:"color",value:"#20618f",apply:f=>V("voyage-line","line-color",f)},{key:"voyageWidth",label:"Route width",min:.2,max:8,step:.1,value:1.7,apply:f=>V("voyage-line","line-width",f)},{key:"voyageOpacity",label:"Route opacity",min:0,max:1,step:.05,value:.85,apply:f=>V("voyage-line","line-opacity",f)},{key:"voyageBlur",label:"Route softness",min:0,max:4,step:.1,value:0,apply:f=>V("voyage-line","line-blur",f)},{key:"voyageLabelColour",label:"Name",type:"color",value:"#ffffff",apply:f=>V("voyage-label","text-color",f)},{key:"voyageLabelHalo",label:"Name halo",type:"color",value:"#0f172a",apply:f=>V("voyage-label","text-halo-color",f)},{key:"voyageLabelHaloWidth",label:"Name halo width",min:0,max:4,step:.1,value:0,apply:f=>V("voyage-label","text-halo-width",f)},{key:"voyageLabelSize",label:"Name size",min:6,max:28,step:.5,value:11.5,apply:f=>{if(o.getLayer("voyage-label"))try{o.setLayoutProperty("voyage-label","text-size",f)}catch{}}},{key:"voyageHitWidth",label:"Hover tolerance",min:4,max:40,step:1,value:Tn,apply:f=>V("voyage-hit","line-width",f)}],{tab:"Map"}),window.__tune.register("Advance",[{key:"play",label:"Play advance",type:"button",apply:oo},{key:"seconds",label:"Seconds",min:1,max:15,step:.5,value:4,apply:f=>{so=f,Mt()}},{key:"curve",label:"Slowdown (0.5 = liquid, 1 = linear)",min:.25,max:1,step:.05,value:.5,apply:f=>{lo=f,Mt()}},{key:"colour",label:"Colour",type:"color",value:"#b31217",apply:f=>{ro=f,Mt()}},{key:"rimColour",label:"Leading edge",type:"color",value:"#4a0505",apply:f=>{no=f,Mt()}},{key:"rimKm",label:"Leading edge depth (km)",min:0,max:200,step:5,value:40,apply:f=>{fo=f,Mt()}},{key:"opacity",label:"Opacity",min:0,max:1,step:.05,value:.85,apply:f=>{io=f,Mt()}},{key:"lobeAmount",label:"Lobe depth (km)",min:0,max:150,step:5,value:45,apply:f=>{uo=f,xa()}},{key:"lobeScale",label:"Lobe count",min:1,max:20,step:1,value:6,apply:f=>{co=f,xa()}},{key:"mergeKm",label:"Front merge (km)",min:0,max:400,step:10,value:120,apply:f=>{ho=f,xa()}},{key:"clear",label:"Clear",type:"button",apply:()=>le?.clear()}],{tab:"Map"}),window.__tune.register("Territory labels",[{key:"resting",label:"Names at rest",type:"boolean",value:!1,apply:f=>{de=f,fe()}},{key:"font",label:"Font",type:"select",options:x,value:"Cinzel",apply:f=>P("text-font",[f])},{key:"size",label:"Size",min:6,max:32,step:.5,value:12,apply:f=>{ut=f,M()}},{key:"hoverScale",label:"Hover scale",min:1,max:2.5,step:.05,value:1.35,apply:f=>{He=f}},{key:"hoverMs",label:"Hover speed (ms)",min:0,max:800,step:10,value:180,apply:f=>{ht=f}},{key:"tracking",label:"Letter spacing",min:0,max:.4,step:.01,value:.06,apply:f=>P("text-letter-spacing",f)},{key:"caps",label:"Small caps",type:"boolean",value:!0,apply:f=>P("text-transform",f?"uppercase":"none")},{key:"haloWidth",label:"Halo width",min:0,max:5,step:.25,value:2,apply:f=>q("text-halo-width",f)},{key:"haloBlur",label:"Halo softness",min:0,max:4,step:.25,value:.5,apply:f=>q("text-halo-blur",f)}],{tab:"Map"}),window.__tune.register("Territory borders",[{key:"lineOpacity",label:"Border opacity",min:0,max:1,step:.05,value:1,apply:f=>{ee["boundaries-line.line-opacity"]=f,U=f,ke(i.year)}},{key:"labelColor",label:"Label",type:"color",value:"#e6ecf7",apply:f=>{ee["boundaries-label.text-color"]=f,V("boundaries-label","text-color",f)}},{key:"labelHalo",label:"Label halo",type:"color",value:"#10151f",apply:f=>{ee["boundaries-label.text-halo-color"]=f,V("boundaries-label","text-halo-color",f)}}],{tab:"Map"}),window.__tune.register("Hand-drawn territories",[{key:"handShow",label:"Show",type:"boolean",value:!0,apply:f=>{for(const re of["hand-fill","hand-line"])if(o.getLayer(re))try{o.setLayoutProperty(re,"visibility",f?"visible":"none")}catch{}}},{key:"handEdgeColour",label:"Edge",type:"color",value:ae.line.color,apply:f=>{ee["hand-line.line-color"]=f,V("hand-line","line-color",f)}},{key:"handEdgeWidth",label:"Edge width",min:0,max:4,step:.1,value:1,apply:f=>{A.width=f,u("hand-line","line-width",G())}},{key:"handDash",label:"Dash length",min:.5,max:8,step:.25,value:2,apply:f=>{A.dash=f,u("hand-line","line-dasharray",H())}},{key:"handOpacityMedium",label:"Edge opacity · medium",min:0,max:1,step:.02,value:.7,apply:f=>{A.opacityMedium=f,ke(i.year)}},{key:"handOpacityLow",label:"Edge opacity · low",min:0,max:1,step:.02,value:.42,apply:f=>{A.opacityLow=f,ke(i.year)}},{key:"handBlurMedium",label:"Edge softness · medium",min:0,max:8,step:.2,value:1.4,apply:f=>{A.blurMedium=f,u("hand-line","line-blur",p())}},{key:"handBlurLow",label:"Edge softness · low",min:0,max:8,step:.2,value:3.2,apply:f=>{A.blurLow=f,u("hand-line","line-blur",p())}}],{tab:"Map"}),window.__tune.register("Hover glow",[{key:"glowColour",label:"Glow",type:"color",value:L,apply:f=>{Y.colour=f,Z()}},{key:"glowStrength",label:"Strength",min:0,max:1,step:.05,value:.55,apply:f=>{Y.strength=f,Z()}},{key:"glowWidth",label:"Width",min:.2,max:4,step:.1,value:1,apply:f=>{Y.width=f,Z()}},{key:"glowBlur",label:"Softness",min:0,max:20,step:.5,value:6,apply:f=>{Y.blur=f,Z()}}],{tab:"Map"}),window.__tune.register("Rounded corners",[{key:"smoothing",label:"Rounding",min:0,max:8,step:1,value:0,apply:Ae},{key:"smoothWidth",label:"Width",min:0,max:6,step:.1,value:ae.line.width,apply:f=>u("boundaries-smooth","line-width",f)},{key:"smoothOpacity",label:"Opacity",min:0,max:1,step:.05,value:ae.line.opacity,apply:f=>u("boundaries-smooth","line-opacity",f)},{key:"smoothColour",label:"Colour",type:"color",value:ae.line.color,apply:f=>u("boundaries-smooth","line-color",f)}],{tab:"Map"}),window.__tune.register("Ground",[{key:"exaggeration",label:"Heightmap",min:0,max:12,step:.25,value:0,apply:f=>{try{o.setTerrain(f>0?{source:"dem",exaggeration:f}:null)}catch{}}}],{tab:"Map"}),window.__tune.register("Ships",[{key:"lapSeconds",label:"Seconds per lap",min:20,max:900,step:5,value:45,apply:f=>K()?.setLapSeconds(f)},{key:"shipScale",label:"Size",min:.2,max:3,step:.05,value:1,apply:f=>K()?.setShipScale(f)},{key:"anchored",label:"Scale with zoom",type:"boolean",value:!0,apply:f=>K()?.setShipScale(void 0,f)},{key:"nightDim",label:"Night dimming",min:0,max:1,step:.05,value:0,apply:f=>K()?.setNightDim(f,Yr())},{key:"motion",label:"Idle rock",min:0,max:1,step:.05,value:1,apply:f=>K()?.setMotion(f)}],{tab:"Camera"}),window.__tune.register("Framing",[{key:"bottomInset",label:"Bottom inset",type:"number",min:0,max:400,step:2,value:0,apply:f=>{const re=Math.max(0,Number(f)||0);v=re>0,t.style.top=`-${re}px`,t.style.height=`calc(100% + ${re}px)`,o.resize()}},{key:"autoInset",label:"Auto-centre above the deck",type:"boolean",value:!0,apply:f=>{T=f,v=!1,f?I():(t.style.top="0px",t.style.height="",o.resize())}}],{tab:"Camera"}),window.__tune.register("Tilt and turn",[{key:"pitch",label:"Pitch",min:0,max:85,step:1,value:45,apply:f=>o.easeTo({pitch:Number(f),duration:0})},{key:"bearing",label:"Bearing",min:-180,max:180,step:1,value:0,apply:f=>o.easeTo({bearing:Number(f),duration:0})},{key:"minPitch",label:"Min pitch",type:"number",min:0,max:85,step:1,value:0,apply:f=>o.setMinPitch(Number(f))},{key:"maxPitch",label:"Max pitch",type:"number",min:0,max:85,step:1,value:70,apply:f=>o.setMaxPitch(Number(f))}],{tab:"Camera"}),window.__tune.register("Zoom limits",[{key:"minZoom",label:"Min zoom",type:"number",min:0,max:22,step:.1,value:o.getMinZoom(),apply:f=>o.setMinZoom(Number(f))},{key:"maxZoom",label:"Max zoom",type:"number",min:0,max:22,step:.1,value:o.getMaxZoom(),apply:f=>o.setMaxZoom(Number(f))}],{tab:"Camera"}),window.__tune.register("Entrance",[{key:"startLng",label:"Start lng",type:"number",step:.1,value:F.startLng,apply:f=>{F.startLng=Number(f)}},{key:"startLat",label:"Start lat",type:"number",step:.1,value:F.startLat,apply:f=>{F.startLat=Number(f)}},{key:"startZoom",label:"Start zoom",min:0,max:8,step:.05,value:F.startZoom,apply:f=>{F.startZoom=f}},{key:"endLng",label:"End lng",type:"number",step:.1,value:F.endLng,apply:f=>{F.endLng=Number(f)}},{key:"endLat",label:"End lat",type:"number",step:.1,value:F.endLat,apply:f=>{F.endLat=Number(f)}},{key:"endZoom",label:"End zoom",min:0,max:10,step:.05,value:F.endZoom,apply:f=>{F.endZoom=f}},{key:"seconds",label:"Seconds",min:.5,max:12,step:.25,value:F.seconds,apply:f=>{F.seconds=f}},{key:"jumpStart",type:"button",label:"Go to start",apply:()=>o.jumpTo({center:[F.startLng,F.startLat],zoom:F.startZoom})},{key:"play",type:"button",label:"Play entrance",apply:()=>{o.jumpTo({center:[F.startLng,F.startLat],zoom:F.startZoom}),setTimeout(()=>o.flyTo({center:[F.endLng,F.endLat],zoom:F.endZoom,duration:F.seconds*1e3,essential:!0}),120)}}],{tab:"Camera"}),Ac()};let oa=null;window.__tmSetClouds=u=>{const _=Math.max(0,Math.min(1,Number(u)));oa&&oa.setOptions({opacity:_});try{localStorage.setItem("tm-clouds",String(_))}catch{}};let at="soft-atlas";const _a=u=>{(u==="ink-art"||u==="inkart")&&(u="pen-ink"),ze[u]||console.warn(`[timemap] no map style "${u}" — falling back to soft-atlas. Defined: ${Object.keys(ze).join(", ")}`);const _=ze[u]?u:"soft-atlas",x=ze[_];at=_;try{localStorage.setItem("tm-style",_)}catch{}const P=!!x.imagery,q=!!x.chart,F=(Y,Z)=>{o.getLayer(Y)&&o.setLayoutProperty(Y,"visibility",Z?"visible":"none")};Mc(o,q);for(const Y of Object.values(At?.layers||{}))Y?.id&&F(Y.id,!q);F("coast-bold",!q),F("satellite",P),F("satellite-detail",P);for(const Y of["land","coast-shadow","lakes","lake-line","lake-shadow"])F(Y,!P&&!q);o.getLayer("coast-bold")&&o.setPaintProperty("coast-bold","line-opacity",P?.4:1),o.setPaintProperty("water","background-color",x.water),o.getLayer("lakes")&&o.setPaintProperty("lakes","fill-color",x.water);{const Y=x.shore||{color:x.line.color,shadow:"#574631"};o.getLayer("lake-line")&&o.setPaintProperty("lake-line","line-color",Y.color),o.getLayer("lake-shadow")&&o.setPaintProperty("lake-shadow","line-color",Y.shadow)}o.setPaintProperty("land","fill-color",x.land);const K=x.shore||{color:x.line.color,width:.9,shadow:"#574631",shadowWidth:2.4,dy:2};if(o.getLayer("coast-bold")&&(o.setPaintProperty("coast-bold","line-color",K.color),o.setPaintProperty("coast-bold","line-width",K.width)),o.getLayer("coast-shadow")&&(o.setPaintProperty("coast-shadow","line-color",K.shadow),o.setPaintProperty("coast-shadow","line-width",K.shadowWidth),o.setPaintProperty("coast-shadow","line-translate",[0,K.dy??2])),o.getLayer("coast-echo")&&(x.coast?(o.setLayoutProperty("coast-echo","visibility","visible"),o.setPaintProperty("coast-echo","line-color",x.coast.color),o.setPaintProperty("coast-echo","line-width",x.coast.width??.6),Gr(x.coast)):(o.setLayoutProperty("coast-echo","visibility","none"),$r())),o.getLayer("rivers"))if(x.river){o.setLayoutProperty("rivers","visibility","visible"),o.setPaintProperty("rivers","line-color",x.river.color),o.setPaintProperty("rivers","line-opacity",x.river.opacity??.55);const Y=x.river.width??.6;o.setPaintProperty("rivers","line-width",["interpolate",["linear"],["to-number",["get","scalerank"]],1,Y+.5,6,Y*.5])}else o.setLayoutProperty("rivers","visibility","none");if(o.getLayer("hillshade")&&o.setLayoutProperty("hillshade","visibility",x.hillshade?"visible":"none"),o.getLayer("graticule")&&(x.grid?(o.setLayoutProperty("graticule","visibility","visible"),o.setPaintProperty("graticule","line-color",x.grid.color),o.setPaintProperty("graticule","line-opacity",x.grid.opacity??.5),o.setPaintProperty("graticule","line-width",x.grid.width??.6)):o.setLayoutProperty("graticule","visibility","none")),o.getLayer("mountains")&&o.setLayoutProperty("mountains","visibility",x.mountains?"visible":"none"),o.getLayer("forests")&&o.setLayoutProperty("forests","visibility",x.forest?"visible":"none"),o.getLayer("land-scatter")&&o.setLayoutProperty("land-scatter","visibility",x.forest?"visible":"none"),ci(o,!!x.mountains),o.getLayer("boundaries-fill")){U=ee["boundaries-line.line-opacity"]??(x.line&&x.line.opacity!=null?x.line.opacity:1),he(),V("boundaries-line","line-color",x.line.color),V("boundaries-line","line-width",x.line.width),V("boundaries-line","line-blur",x.line.blur),o.setLayoutProperty("boundaries-line","line-join","round");const Y=Me>=1;o.setLayoutProperty("boundaries-line","visibility",x.borderSource||Y?"none":"visible"),V("hand-line","line-color",x.line.color),V("boundaries-label","text-color",x.text.color),V("boundaries-label","text-halo-color",x.text.halo)}o.getLayer("markers-label")&&(o.setPaintProperty("markers-label","text-color",x.text.color),o.setPaintProperty("markers-label","text-halo-color",x.text.halo)),En(o,{color:x.voyage});for(let Y=0;Y<6;Y++)o.getLayer(`ink-${Y}`)&&o.removeLayer(`ink-${Y}`);if(o.getLayer("boundaries-line")){const Y=x.borderSource&&x.borderSource.source||"cliopatria",Z=x.borderSource&&x.borderSource.sourceLayer||"boundaries",oe=x.borderSource?bt(i.year):$(i.year);(x.inkLayers||[]).forEach((ie,le)=>{const Xe={id:`ink-${le}`,type:"line",source:Y,"source-layer":Z,filter:oe,layout:{"line-join":"round","line-cap":"round"},paint:{"line-color":ie.color,"line-width":ie.width,"line-opacity":ie.opacity??1,"line-blur":ie.blur??0,...ie.offset!=null?{"line-offset":ie.offset}:{},...ie.dash?{"line-dasharray":ie.dash}:{}}};ie.above?o.addLayer(Xe,o.getLayer("boundaries-label")?"boundaries-label":void 0):o.addLayer(Xe,"boundaries-line")})}Hr(x)};window.__applyMapStyle=_a,window.__tmShowGlow=tt,window.__tmSetRounding=Ae,window.__timemapSoundOn=(()=>{try{return localStorage.getItem("tm-sound")==="1"}catch{return!1}})();let ve=null;const qt=u=>{const _=ve;window.dispatchEvent(new CustomEvent("timemap-audio",{detail:{visible:!!(u&&_),playing:!!(_&&!_.paused&&!_.ended),currentTime:_&&_.currentTime||0,duration:_&&isFinite(_.duration)?_.duration:0}}))};window.__timemapStopSpeak=()=>{if(ve){try{ve.pause()}catch{}ve=null}qt(!1)},window.__timemapToggleSpeak=()=>{ve&&(ve.paused?ve.play().catch(()=>{}):ve.pause(),qt(!0))},window.__timemapSeek=u=>{ve&&isFinite(ve.duration)&&(ve.currentTime=Math.max(0,Math.min(1,u))*ve.duration,qt(!0))},window.__timemapSpeak=(u,_)=>{if(window.__timemapStopSpeak(),!window.__timemapSoundOn||!u||!_)return;const x=(document.querySelector("meta[name=csrf-token]")||{}).content||"";fetch("/teacher/timemap/speak",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":x},body:JSON.stringify({id:u,text:_})}).then(P=>P.ok?P.json():{}).then(P=>{!P||!P.url||!window.__timemapSoundOn||(ve=new Audio(P.url),["loadedmetadata","timeupdate","play","pause"].forEach(q=>ve.addEventListener(q,()=>qt(!0))),ve.addEventListener("ended",()=>window.__timemapStopSpeak()),ve.play().catch(()=>{}),qt(!0))}).catch(()=>{})},window.__timemapAudioTeardownBound||(window.__timemapAudioTeardownBound=!0,document.addEventListener("livewire:navigating",()=>window.__timemapStopSpeak&&window.__timemapStopSpeak()),window.addEventListener("pagehide",()=>window.__timemapStopSpeak&&window.__timemapStopSpeak())),o.on("load",()=>{o.addLayer({id:"boundaries-fill",type:"fill",source:"cliopatria","source-layer":"boundaries",paint:{"fill-color":w,"fill-opacity":E,"fill-opacity-transition":{duration:150}}}),o.addLayer({id:"hand-fill",type:"fill",source:"hand-territories",paint:{"fill-color":w,"fill-opacity":E,"fill-opacity-transition":{duration:150}}}),o.addLayer({id:"boundaries-smooth",type:"line",source:vt,layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":ae.line.color,"line-width":ae.line.width,"line-opacity":ae.line.opacity}}),o.addLayer({id:"boundaries-glow",type:"line",source:"boundaries-glow-src",filter:["==",["geometry-type"],"LineString"],layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":L,"line-width":O,"line-blur":6,"line-opacity":.55,"line-opacity-transition":{duration:140}}}),o.addLayer({id:"boundaries-line",type:"line",source:"cliopatria","source-layer":"boundaries",paint:{"line-color":ae.line.color,"line-width":ae.line.width,"line-opacity":ae.line.opacity}}),o.addLayer({id:"hand-line",type:"line",source:"hand-territories",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":ae.line.color,"line-width":G(),"line-opacity":z(),"line-blur":p(),"line-dasharray":H()}}),o.addLayer({id:"rivers",type:"line",source:"rivers","source-layer":"rivers",filter:["<=",["to-number",["get","scalerank"]],5],layout:{visibility:"none","line-cap":"round","line-join":"round"},paint:{"line-color":"#6a7c74","line-width":.6,"line-opacity":.6}}),o.addSource("labels",{type:"geojson",data:{type:"FeatureCollection",features:[]}}),o.addLayer({id:"boundaries-label",type:"symbol",source:"labels",layout:{"icon-image":["get","flag"],"icon-size":.13,"icon-anchor":"bottom","icon-allow-overlap":!1,"icon-optional":!0,"text-field":["get","name"],"text-font":["Cinzel"],"text-transform":"uppercase","text-letter-spacing":.06,"text-size":12,"text-anchor":"top","text-offset":[0,.55],"text-allow-overlap":!1,"text-optional":!0,"text-padding":6,"symbol-sort-key":["case",["get","sel"],0,["get","hov"],0,1]},paint:{"text-color":ae.text.color,"text-halo-color":ae.text.halo,"text-halo-width":2,"text-halo-blur":.5,"icon-translate":[0,-9]}}),o.addLayer({id:"boundaries-cursor-label",type:"symbol",source:"boundaries-cursor-name",layout:{"text-field":["get","name"],"text-font":["Cinzel"],"text-transform":"uppercase","text-letter-spacing":.06,"text-size":12,"text-anchor":"bottom","text-offset":[0,-1.1],"text-allow-overlap":!0,"text-ignore-placement":!0},paint:{"text-color":ae.text.color,"text-halo-color":ae.text.halo,"text-halo-width":2,"text-halo-blur":.5}});const u=()=>(ze[at]||{}).land||ae.land;ni(o,{beforeId:"boundaries-label",visibility:"none"}).then(()=>ai(o,{beforeId:"boundaries-label",visibility:"none",landColor:u()})).then(()=>Jn(o,{beforeId:"boundaries-label",visibility:"none",landColor:u()})).then(()=>li(o,{beforeId:"boundaries-label",visibility:"none"})).then(()=>_a(at)),o.addSource("markers",{type:"geojson",data:fi}),o.addLayer({id:"markers-dot",type:"circle",source:"markers",paint:{"circle-radius":4,"circle-color":"#cbbfa6","circle-stroke-color":"#6b5a3e","circle-stroke-width":1.4,"circle-opacity":.85}}),o.addLayer({id:"markers-label",type:"symbol",source:"markers",layout:{"text-field":["get","name"],"text-size":14,"text-font":["Cinzel"],"text-transform":"uppercase","text-offset":[0,.9],"text-anchor":"top","text-allow-overlap":!1,"text-optional":!0,"text-letter-spacing":.06},paint:{"text-color":"#6b5a3e","text-halo-color":"#f3ead6","text-halo-width":1.2}},o.getLayer("boundaries-label")?"boundaries-label":void 0);let _=.5;try{const P=parseFloat(localStorage.getItem("tm-clouds"));Number.isFinite(P)&&(_=Math.min(1,Math.max(0,P)))}catch{}At=pc(o,{date:Qt(i.year),reduceMotion:Jt}),oa=At.layers.clouds,Ja(!0),o.on("move",()=>Ja()),oa?.setOptions({opacity:_}),Xr(),_n(o,{year:i.year,beforeId:qa,labelBeforeId:"boundaries-label"}),Re=Hi(o,{ships:()=>we,locale:document.documentElement.lang||"en",transportNames:JSON.parse(t.dataset.transportNames||"{}"),onDwell:P=>{Re?.selected!==P&&eo(P)}}),on(async()=>{const{addVoyageShips:P}=await import("./voyage-ships-DZMWWZ8V.js");return{addVoyageShips:P}},__vite__mapDeps([0])).then(({addVoyageShips:P})=>{we=P(o,{beforeId:qa}),we.setYear(i.year),window.__tmShips=we}).catch(()=>{}),o.on("mouseenter","markers-dot",()=>{o.getCanvas().style.cursor="pointer"}),o.on("mouseleave","markers-dot",()=>{o.getCanvas().style.cursor=""}),o.on("moveend",Je),o.on("moveend",et),o.on("sourcedata",P=>{P.sourceId==="cliopatria"&&P.isSourceLoaded&&Je()}),Lc(o,{origin:location.origin,underBefore:"graticule",overBefore:"boundaries-fill"});let x=null;try{x=localStorage.getItem("tm-style")}catch{}_a(x||"soft-atlas"),Dt(i.year);for(const P of pe)o.getLayer(P)&&(o.on("mousemove",P,q=>{if(o.getCanvas().style.cursor="pointer",!q.features.length)return;if(q.features[0].id===wt){ge&&Ot(ge,q.lngLat);return}wt=q.features[0].id;const F=q.features[0].properties,K=F.Wikidata?Na.get(`${F.Wikidata}|${F.Name}`)||F.Wikidata:null;tt(q.features[0].geometry,F.Name??null,K);const Y=F.Name??null,Z=Y&&(!de||!Ne(Y));Ot(Z?Y:null,q.lngLat)}),o.on("mouseleave",P,()=>{o.getCanvas().style.cursor="",wt=null,tt(null),Ot(null)}));i.ready=!0,s()});const eo=u=>{const _=zt.voyages.find(x=>x.id===u);_&&(Oe&&Oe.id!==u&&Lt(),se!==null&&(Nt(),qe()),Re?.select(_.id),i.selectedRegion=_.qid,s(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:_.qid,name:String(_.name).replace(/\s+—\s+/g,": "),qid:_.qid,voyageId:_.id}})))};let Oe=null;const Vr=5,Kr=220,to=[24,90],Zr=()=>{const _=document.querySelector("[data-voyage-play]")?.closest(".rounded-card")?.getBoundingClientRect();return _&&_.width&&window.innerWidth>=640?{left:Math.round(_.right),top:0,right:0,bottom:0}:null},ao=u=>window.dispatchEvent(new CustomEvent("voyage-play-state",{detail:{id:u}})),Lt=()=>{if(!Oe)return;const u=Oe;cancelAnimationFrame(u.raf),o.stop(),u.padding&&o.setPadding(u.padding),Oe=null,Re?.play(null),ao(null)},Jr=u=>{const _=zt.voyages.find(Z=>Z.id===u);if(!_||!we)return;Lt(),(i.year<_.show_from||i.year>_.show_to)&&window.__setTimemapYear?.(_.year_start);const x=ca(_.waypoints);let P=0;for(let Z=1;Z<x.length;Z++){const[oe,ie]=[x[Z-1],x[Z]];P+=Math.hypot((ie[0]-oe[0])*Math.cos((oe[1]+ie[1])/2*Math.PI/180),ie[1]-oe[1])*111.32}const q=Math.min(to[1],Math.max(to[0],P/Kr)),F={id:u,raf:0,start:0,padding:null};Oe=F;const K=Zr();K&&(F.padding=o.getPadding(),o.setPadding(K)),ao(u),Re?.play(u,0);const Y=we.pointAt(u,0);o.flyTo({center:[Y.lng,Y.lat],zoom:Math.max(Vr,Math.min(o.getZoom(),6)),duration:Jt?0:2200,essential:!0}),o.once("moveend",()=>{if(Oe!==F)return;const Z=oe=>{if(Oe!==F)return;F.start||(F.start=oe);const ie=Math.min(1,(oe-F.start)/(q*1e3)),le=we.pointAt(u,ie);o.jumpTo({center:[le.lng,le.lat]}),Re?.play(u,ie);const Xe=lr(_,x,we.sampleAtFraction(u,ie)),Pe=Xe?new Date(Xe.ms).getUTCFullYear():null;Pe!==null&&Pe!==i.year&&Pe>=_.show_from&&Pe<=_.show_to&&window.__setTimemapYear?.(Pe),ie<1?F.raf=requestAnimationFrame(Z):window.setTimeout(()=>{Oe===F&&Lt()},2500)};F.raf=requestAnimationFrame(Z)})};for(const u of["dragstart","wheel","touchstart","boxzoomstart"])o.on(u,_=>{Oe&&_.originalEvent&&Lt()});window.__timemapPlayVoyage=u=>Oe?.id===u?Lt():Jr(u),o.on("click",u=>{const _=[[u.point.x-7,u.point.y-7],[u.point.x+7,u.point.y+7]],x=o.queryRenderedFeatures(_,{layers:["markers-dot"]})[0];if(x){se!==null&&(Nt(),qe()),Re?.clear();const oe=x.properties;i.selectedRegion=oe.id,s(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:oe.id,name:oe.name,qid:oe.qid,articleUrl:oe.article_url,summary:oe.summary,inception:oe.inception,dissolution:oe.dissolution}}));return}const P=o.getLayer("voyage-hit")&&o.queryRenderedFeatures(u.point,{layers:["voyage-hit"]})[0];if(P){eo(P.properties.id);return}Re?.clear();const q=o.queryRenderedFeatures(u.point,{layers:pe.filter(oe=>o.getLayer(oe))})[0],F=!!q?.properties?.hand;Nt(),se=q?q.id:null,je=q?u.lngLat:null,xt=q?q.properties?.Name??null:null,Ue=F,se!==null&&Ye(se,!0,F),qe();const K=q?q.properties.Wikidata:null,Y=q?q.properties.Name:null,Z=K?Na.get(`${K}|${Y}`)||K:null;i.selectedRegion=Z,s(),Xt?.cancel(),Xt=q?xn(o,{id:"polity-sweep",lines:Ea(q.geometry).flatMap(oe=>po(oe)).filter(oe=>oe.length>=4),durationMs:2e3,beforeId:o.getLayer("boundaries-label")?"boundaries-label":void 0}):null,window.dispatchEvent(new CustomEvent("polity-selected",{detail:F?{id:Z,name:Y,qid:Z,hand:!0,territoryId:q.properties.id,inception:Number(q.properties.FromYear),dissolution:Number(q.properties.ToYear),provenance:xi(q.properties.id)}:{id:Z,name:Y,qid:Z}}))});const en=()=>{if(se===null||!je)return;const u=o.project(je);if(!Number.isFinite(u.x)||!Number.isFinite(u.y))return;const _=pe.filter(Y=>o.getLayer(Y));if(!_.length)return;const x=o.queryRenderedFeatures(u,{layers:_})[0];if(!x||x.id===se)return;const P=xt;Ye(se,!1),se=x.id,Ye(se,!0);const q=x.properties?.Name??null,F=x.properties?.Wikidata??null,K=F?Na.get(`${F}|${q}`)||F:null;xt=q,i.selectedRegion=K,qe(),s(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:K,name:q,qid:K,succeeded:!0,previousName:P}}))};return t._setYear=u=>(i.year=u,r.year=u,Dt(u),s(),clearTimeout(Ut),Ut=setTimeout(en,320),er(u)),t._setFadeMode=u=>{it=!!u,ke(i.year)},t._tmMap=o,window.__tmMap=o,window.__timemapClearSelection=()=>{se!==null&&(Ye(se,!1),se=null,qe()),Lt(),Re?.clear(),i.selectedRegion=null,s()},o};window.mountAtlasSlider=function(e,t,r,n){let s=0,o=null;const l=h=>{if(!t._setYear)return;const y=performance.now(),T=100-(y-s);clearTimeout(o),T<=0?(s=y,t._setYear(h)):o=setTimeout(()=>{s=performance.now(),t._setYear(h)},T)},a=Hn(e,{min:-4e3,max:2010,value:r,labels:n,spans:Cc(),onYear:h=>l(h),onPlay:h=>{t._setFadeMode&&t._setFadeMode(h)}});zn(document.querySelector("[data-timemap-year-flash]")),Vn(),window.__setTimemapYear=h=>{const y=Math.round(Number(h));Number.isNaN(y)||(a.setYear(y),t._setYear&&t._setYear(y))}};window.__timemapLoadVoyage=e=>Wi(e,document.documentElement.lang||"en");function qr(e){const t=/\/wiki\/([^?#]+)/.exec(e||"");return t?decodeURIComponent(t[1]):null}window.__timemapWikiSummary=async e=>{if(!e||!e.includes("wikipedia.org"))return null;const t=qr(e);if(!t)return null;try{const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(t));if(!r.ok)return null;const n=await r.json();return{thumbnail:n.thumbnail?.source||null,extract:n.extract||null}}catch{return null}};window.__timemapWikiLead=async e=>{if(!e||!e.includes("wikipedia.org"))return null;const t=qr(e);if(!t)return null;try{const r="https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&format=json&origin=*&titles="+encodeURIComponent(t),n=await fetch(r);if(!n.ok)return null;const i=await n.json(),s=i.query&&i.query.pages||{},o=Object.values(s)[0];return o&&o.extract||null}catch{return null}};window.__timemapHydratePanel=(e,t)=>{e.thumb=null,e.lead=null,e.leadLoading=!1,e.leadFailed=!1,t&&t.wikipedia_url&&window.__timemapWikiSummary(t.wikipedia_url).then(r=>{e.thumb=r&&r.thumbnail||null})};window.__timemapPanelReadMore=(e,t)=>{!t||!t.wikipedia_url||(e.leadLoading=!0,e.leadFailed=!1,window.__timemapWikiLead(t.wikipedia_url).then(r=>{r?e.lead=r:e.leadFailed=!0,e.leadLoading=!1}))};function Cc(){return(zt.voyages??[]).filter(t=>Number.isFinite(t.year_start)&&Number.isFinite(t.year_end)&&t.year_end-t.year_start<=50).map(t=>({start:t.year_start,end:t.year_end,label:String(t.name).replace(/\s+—\s+/g,": ")}))}
