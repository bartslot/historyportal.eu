import{_ as Rr}from"./vite-helpers-DqutJMZx.js";import{m as at,a as le,s as Pr,S as Cr,b as Dr,D as Ir,c as Ur,E as je}from"./map-imagery-Bp93pHDe.js";import{E as Vt,a as La}from"./easing-HS2C6-zA.js";import{t as Fr,a as Nr,S as Uo,v as Fa,s as Ma,b as Ja,E as aa,m as Ra,c as Or,d as Br,i as Qr,e as qr,o as fa,w as eo,f as Hr,V as Gr,g as zr}from"./border-sweep-g9uwK-kV.js";import{p as $r}from"./tuner-CTMYYJl-.js";import"./i18n-DoByrmTl.js";function Fo(e,t=new Date().getFullYear()){return t-e}function Wr(e,t=new Date().getFullYear(),r=25){return Math.trunc(Fo(e,t)/r)}function No(e,t=new Date().getFullYear()){const r=Fo(e,t).toLocaleString("en-US"),n=Wr(e,t);return`≈ ${r} years ago · ~${n} generations`}const jr=(e,t)=>{const r=getComputedStyle(document.documentElement).getPropertyValue(e),n=parseFloat(r);return Number.isFinite(n)?n:t},Re=(e,t)=>{const r=getComputedStyle(document.documentElement).getPropertyValue(e).trim(),n=parseFloat(r);return Number.isFinite(n)?r.endsWith("rem")?n*parseFloat(getComputedStyle(document.documentElement).fontSize):n:t},to=e=>e<0?`${Math.abs(e)} BCE`:String(e),Yr=e=>e<0?`${Math.abs(e)} BCE`:`${e} CE`,ao=e=>e<0?"BCE":"CE",Xr='<path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"/>',Kr='<path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>',Vr=24,Yt="var(--scrubber-tick-height)",Zr=.12,Jr=.3,ma=400,oo=.45,en=90,tn={play:"Play timeline",pause:"Pause timeline",track:"Timeline year",year:"Year (negative for BCE)"},ro=4,an=1,on=3,rn=6.6,nn=8,Oo=[8,22];function sn(e,{min:t,pxPerYear:r}){const n=[],s=Oo.map(()=>-1/0);return[...e].filter(i=>Number.isFinite(i.start)&&Number.isFinite(i.end)).sort((i,o)=>i.start-o.start).map(i=>{const o=(i.start-t)*r,l=Math.max(2,(i.end-i.start+1)*r);let a=n.findIndex(x=>x<=o);a<0&&(a=Math.min(n.length,on-1)),n[a]=Math.max(n[a]??-1/0,o+l);const u=String(i.label??"").length*rn,y=i.label?s.findIndex(x=>x<=o):-1;return y>=0&&(s[y]=o+u+nn),{...i,x:o,w:l,lane:a,labelRow:y,showLabel:y>=0}})}function ln(e,{min:t,max:r,value:n,onYear:s,onPlay:i,labels:o,spans:l=[]}){const a={...tn,...o??{}},u=M=>Math.min(r,Math.max(t,M));let y=u(Math.round(n)),x=jr("--scrubber-px-per-year",4);e.classList.add("select-none"),e.innerHTML=`
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
        <svg class="tm-ic-play h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">${Xr}</svg>
        <svg class="tm-ic-pause h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" style="display:none">${Kr}</svg>
      </button>
      <label class="tm-year-badge flex h-[30px] cursor-text items-center gap-0.5 rounded-md border border-scrubber-badge-edge bg-scrubber-badge px-2">
        <input type="number" inputmode="numeric"
               class="tm-year-input w-[5ch] bg-transparent text-right font-mono text-scrubber-num tracking-[0.8px] tabular-nums text-scrubber-year outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
               min="${t}" max="${r}" step="1" value="${y}" aria-label="${a.year}">
        <span class="tm-era-suffix lp-card-label lp-card-label-sm">${ao(y)}</span>
      </label>
    </div>`;const v=e.querySelector(".tm-year-input"),R=e.querySelector(".tm-era-suffix"),p=e.querySelector(".tm-year-badge"),f=e.querySelector(".tm-track"),b=e.querySelector(".tm-scroll"),_=e.querySelector(".tm-strip");b.style.scrollbarWidth="none";const S=new Map,g=[],c=[],H=Math.ceil(t/10)*10,F=e.querySelector(".tm-years");let A=0;const Y=()=>{const M=((A-b.scrollLeft)%x+x)%x;F.style.backgroundPositionX=`${M}px`},m=()=>{const M=f.clientWidth/2;_.style.width=`${(r-t)*x+M*2}px`,_.style.paddingLeft=`${M}px`,_.innerHTML="",S.clear(),c.length=0,it=null,F.style.height="var(--scrubber-year-tick-height)",F.style.backgroundImage=`repeating-linear-gradient(90deg, var(--color-scrubber-tick) 0 var(--scrubber-year-tick-width), transparent var(--scrubber-year-tick-width) ${x}px)`,A=M,Y(),L(),rt();const re=Math.ceil(t/10)*10;for(let ee=re;ee<=r;ee+=10){const me=ee%100===0,ue=M+(ee-t)*x,he=document.createElement("div");if(he.className=me?"absolute top-0 w-[1.5px] rounded-[3px] bg-scrubber-tick-major":"absolute top-0 w-px rounded-[3px] bg-scrubber-tick",he.style.left=`${ue}px`,he.style.height=Yt,_.appendChild(he),c.push(he),!me)continue;const Ie=document.createElement("span");Ie.className="absolute -translate-x-1/2 whitespace-nowrap text-scrubber-num font-semibold tabular-nums text-scrubber-tick-major",Ie.style.left=`${ue}px`,Ie.style.top="var(--scrubber-label-top)",Ie.style.lineHeight="calc(var(--scrubber-height) - var(--scrubber-label-top))",Ie.textContent=to(ee),_.appendChild(Ie),S.set(ee,Ie)}g.length=0;for(const ee of sn(l,{min:t,pxPerYear:x})){const me=ee.lane*(ro+an),ue=document.createElement("div");ue.className="pointer-events-none absolute rounded-[1px] bg-primary transition-opacity duration-200",Object.assign(ue.style,{left:`${M+ee.x}px`,width:`${ee.w}px`,top:`${me}px`,height:`${ro}px`}),_.appendChild(ue);let he=null;ee.showLabel&&(he=document.createElement("span"),he.className="pointer-events-none absolute whitespace-nowrap text-xs leading-none text-scrubber-tick-major transition-opacity duration-200",Object.assign(he.style,{left:`${M+ee.x}px`,top:`${Oo[ee.labelRow]}px`}),he.textContent=ee.label,_.appendChild(he)),g.push({start:ee.start,end:ee.end,bar:ue,text:he})}Q()},Q=()=>{for(const{start:M,end:re,bar:ee,text:me}of g){const ue=y>=M&&y<=re;ee.style.opacity=ue?"1":"0.55",me&&(me.style.opacity=ue?"1":"0.7")}};let G=Zr,z=Jr,C=z,I=!1,k=null,U=0,w=null,W=0,B=0,Z=0;const L=()=>{F.style.transition=`opacity ${I?140:220}ms ${I?Vt.enter:Vt.exit}`,F.style.opacity=I?"1":"0"},X=M=>{M!==I&&(I=M,L())},P=M=>{const re=b.scrollLeft;B+=Math.abs(re-W),W=re;const ee=M-Z;if(ee>=en&&(C=C*oo+B/ee*(1-oo),B=0,Z=M,X(C<G?!0:C>z?!1:I)),!Oe&&M>U){k=null,C=z,X(!1);return}k=requestAnimationFrame(P)},$=()=>{if(Oe){w=setTimeout($,ma);return}C=z,X(!1)},J=M=>{U=M+ma,clearTimeout(w),w=setTimeout($,ma),k===null&&(B=0,Z=M,W=b.scrollLeft,C=z,k=requestAnimationFrame(P))},K=M=>Math.round(M/x)*x,O=140,ke=220;let fe=-1,ce=0,Ae=0,Ce=0,ot=0,Ee=null,pt=!1,At=30,St=44,Bt=112;const rt=()=>{At=Re("--scrubber-tick-height",30),St=Re("--scrubber-magnify-height",44),Bt=Re("--scrubber-magnify-radius",112)},Lt=M=>M*M*(3-2*M),ia=()=>{const M=At,re=St,ee=Bt,ue=f.clientWidth/2-b.scrollLeft,he=10*x,Ie=Math.max(0,Math.floor((-ue-(H-t)*x)/he)),Ct=Math.min(c.length-1,Math.ceil((f.clientWidth-ue-(H-t)*x)/he));for(let Ze=Ie;Ze<=Ct;Ze++){const ze=c[Ze];if(!ze)continue;const Dt=ue+(H+Ze*10-t)*x,vt=Math.abs(Dt-fe),zt=fe>=0&&vt<ee?Lt(1-vt/ee):0,ut=zt>0?`${(M+(re-M)*zt*ce).toFixed(1)}px`:Yt;ze.style.height!==ut&&(ze.style.height=ut)}pt=!0},sa=()=>{for(const M of c)M.style.height!==Yt&&(M.style.height=Yt);pt=!1},Mt=M=>{const re=Math.min(1,(M-ot)/(Ce>Ae?O:ke)),ee=Ce>Ae?La.easeOutCubic(re):La.easeInCubic(re);if(ce=Ae+(Ce-Ae)*ee,ce>0?ia():pt&&sa(),re>=1&&ce===0){Ee=null;return}Ee=requestAnimationFrame(Mt)},nt=M=>{fe=M<0?-1:M-f.getBoundingClientRect().left;const re=fe>=0?1:0;re!==Ce&&(Ae=ce,Ce=re,ot=performance.now()),Ee===null&&(Ee=requestAnimationFrame(Mt))};b.addEventListener("pointermove",M=>nt(M.clientX)),b.addEventListener("pointerleave",()=>nt(-1)),b.addEventListener("pointercancel",()=>nt(-1));const Ne=()=>window.dispatchEvent(new CustomEvent("timemap-scrub",{detail:{year:y,label:to(y)}}));let it=null;const Qt=()=>{const M=Math.round(y/100)*100,re=S.get(M),me=!!re&&Math.abs((M-y)*x)<Vr?re:null;it&&it!==me&&(it.style.visibility=""),me&&(me.style.visibility="hidden"),it=me};let Xe=!1;const gt=()=>u(t+Math.round(b.scrollLeft/x)),qt=M=>(M-t)*x,yt=()=>{v.value=String(y),R.textContent=ao(y),p.setAttribute("data-tooltip",No(y)),f.setAttribute("aria-valuenow",String(y)),f.setAttribute("aria-valuetext",Yr(y)),Qt(),Q()},_e=(M,{fireYear:re=!0}={})=>{y=u(Math.round(M)),yt(),Xe=!0,b.scrollLeft=qt(y),Y(),W=b.scrollLeft,requestAnimationFrame(()=>{Xe=!1}),re&&s(y)},Se=e.querySelector(".tm-play"),bt=e.querySelector(".tm-ic-play"),Ht=e.querySelector(".tm-ic-pause"),Gt=100;let Te=!1,Ke=null,ne=0,Ge=0;const wt=()=>{bt.style.display=Te?"none":"",Ht.style.display=Te?"":"none",Se.setAttribute("aria-pressed",Te?"true":"false"),Se.setAttribute("aria-label",Te?a.pause:a.play),Se.setAttribute("data-tooltip",Te?a.pause:a.play)},Rt=M=>{if(Te){if(Ge&&(ne+=Gt*Math.min(M-Ge,100)/1e3),Ge=M,ne>=r){_e(r),De();return}_e(ne),Ke=requestAnimationFrame(Rt)}},De=()=>{Te&&(Te=!1,Ke!==null&&cancelAnimationFrame(Ke),Ke=null,Ge=0,wt(),i&&i(!1))},Pt=()=>{Te||(Te=!0,y>=r&&_e(t),ne=y,Ge=0,wt(),i&&i(!0),Ke=requestAnimationFrame(Rt))};Se.addEventListener("click",()=>Te?De():Pt());let Le=!1;b.addEventListener("scroll",()=>{Xe||(J(performance.now()),!Le&&(Le=!0,requestAnimationFrame(()=>{Le=!1,Y();const M=gt();M!==y&&(y=M,yt(),Ne(),s(y))})))}),b.addEventListener("scrollend",()=>{if(Oe||Xe)return;const M=K(b.scrollLeft);M!==b.scrollLeft&&_e(t+M/x,{fireYear:!1})});let Ve=0,st=0,Oe=!1;b.addEventListener("pointerdown",M=>{De(),Oe=!0,Ve=M.clientX,st=b.scrollLeft,b.setPointerCapture(M.pointerId),b.classList.replace("cursor-grab","cursor-grabbing"),J(performance.now())}),b.addEventListener("pointermove",M=>{Oe&&(b.scrollLeft=K(st-(M.clientX-Ve)))});const lt=()=>{Oe&&(Oe=!1,b.classList.replace("cursor-grabbing","cursor-grab"),_e(gt()))};b.addEventListener("pointerup",lt),b.addEventListener("pointercancel",lt),v.addEventListener("input",()=>{De();const M=parseInt(v.value,10);Number.isNaN(M)||_e(M)}),v.addEventListener("change",()=>_e(parseInt(v.value,10)||y)),f.addEventListener("keydown",M=>{const re={ArrowLeft:-1,ArrowRight:1,PageDown:-10,PageUp:10}[M.key];re!==void 0&&(M.preventDefault(),De(),_e(y+re),Ne())}),m(),yt(),requestAnimationFrame(()=>{_e(y,{fireYear:!1})});const Be=new ResizeObserver(()=>{m(),_e(y,{fireYear:!1})});Be.observe(f);const xe=(M,re,ee="px")=>document.documentElement.style.setProperty(M,`${re}${ee}`),Qe=()=>{m(),_e(y,{fireYear:!1})},ct=window.__tune?.register("Time scrubber",[{key:"width",label:"Bar width",min:480,max:1400,step:5,value:Re("--scrubber-width",875),apply:M=>xe("--scrubber-width",M)},{key:"height",label:"Bar height",min:32,max:88,step:1,value:Re("--scrubber-height",47),apply:M=>xe("--scrubber-height",M)},{key:"tickHeight",label:"Tick height",min:8,max:64,step:1,value:Re("--scrubber-tick-height",30),apply:M=>{xe("--scrubber-tick-height",M),rt()}},{key:"labelTop",label:"Label baseline",min:8,max:72,step:1,value:Re("--scrubber-label-top",36),apply:M=>xe("--scrubber-label-top",M)},{key:"bandWidth",label:"Centre band",min:0,max:640,step:4,value:Re("--scrubber-band-width",268),apply:M=>xe("--scrubber-band-width",M)},{key:"yearTickHeight",label:"Year ticks",min:0,max:30,step:1,value:Re("--scrubber-year-tick-height",8),apply:M=>xe("--scrubber-year-tick-height",M)},{key:"yearTickWidth",label:"Year tick width",min:.5,max:2,step:.25,value:Re("--scrubber-year-tick-width",1),apply:M=>xe("--scrubber-year-tick-width",M)},{key:"magnifyHeight",label:"Magnify to",min:30,max:47,step:1,value:Re("--scrubber-magnify-height",44),apply:M=>{xe("--scrubber-magnify-height",M),rt()}},{key:"magnifyRadius",label:"Magnify reach",min:20,max:300,step:5,value:Re("--scrubber-magnify-radius",112),apply:M=>{xe("--scrubber-magnify-radius",M),rt()}},{key:"fineAt",label:"Years in below",min:5,max:200,step:5,value:Math.round(G/x*1e3),apply:M=>{G=M*x/1e3,z=G*2.5}},{key:"showYears",type:"button",label:"Flash the years",apply:()=>{X(!0),setTimeout(()=>X(!1),1500)}},{key:"pxPerYear",label:"Pixels per year",min:1,max:10,step:.5,value:x,apply:M=>{x=M,document.documentElement.style.setProperty("--scrubber-px-per-year",String(M)),Qe()}}],{tab:"Map"});return{setYear:M=>{De(),_e(M,{fireYear:!1})},destroy:()=>{Be.disconnect(),De(),clearTimeout(w),k!==null&&cancelAnimationFrame(k),Ee!==null&&cancelAnimationFrame(Ee),ct&&ct()}}}const no=1e3,cn=120,un=420;function hn(e){if(!e)return()=>{};document.fonts?.load("600 1em History").catch(()=>{});let t=null,r=no;const n=()=>{e.style.transition=`opacity ${un}ms ${Vt.exit}`,e.style.opacity="0"},s=l=>{e.textContent=l,e.style.transition=`opacity ${cn}ms ${Vt.enter}`,e.style.opacity="1",clearTimeout(t),t=setTimeout(n,r)},i=l=>s(l.detail?.label??"");window.addEventListener("timemap-scrub",i);const o=window.__tune?.register("Year flash",[{key:"size",label:"Size",min:16,max:160,step:2,value:parseFloat(getComputedStyle(e).fontSize)||56,apply:l=>document.documentElement.style.setProperty("--scrubber-flash-size",`${l}px`)},{key:"hold",label:"Hold (ms)",min:200,max:4e3,step:100,value:no,apply:l=>{r=l}},{key:"preview",type:"button",label:"Show it",apply:()=>s(e.textContent||"1600")}],{tab:"Map"});return()=>{window.removeEventListener("timemap-scrub",i),clearTimeout(t),o&&o()}}const dn="/sound/sfx/scrubber.mp3",Bo=.04,fn=28,mn=.45;function pn(e){const t=e.getChannelData(0),r=Math.max(1,Math.round(e.sampleRate*5e-4)),n=[];for(let a=0;a+r<=t.length;a+=r){let u=0;for(let y=0;y<r;y++)u+=t[a+y]*t[a+y];n.push(Math.sqrt(u/r))}const s=Math.max(...n,1e-9),i=[];let o=!0;for(let a=0;a<n.length;a++)if(o&&n[a]>s*.1){const u=Math.max(0,a-2);i.push({at:u*r/e.sampleRate,level:n[a],from:a}),o=!1}else!o&&n[a]<s*.02&&(o=!0);const l=Math.round(Bo*e.sampleRate/r);for(const a of i)a.level=Math.max(...n.slice(a.from,a.from+l));return i.map(({at:a,level:u})=>({at:a,level:u}))}function gn({volume:e=mn}={}){const t=window.AudioContext||window.webkitAudioContext;if(!t)return{destroy:()=>{}};let r=null,n=null,s=[],i=[],o=null,l=null,a=0,u=0,y=e;const v=(async()=>{try{const b=await fetch(dn);if(!b.ok)return;if(r=new t,n=await r.decodeAudioData(await b.arrayBuffer()),s=pn(n),!s.length){n=null;return}const _=[...s].sort((S,g)=>S.level-g.level);l=_[_.length-1],o=_[Math.floor((_.length-1)/2)],i=_.slice(0,Math.max(1,Math.floor(_.length/2)))}catch{n=null}})(),R=b=>{const _=r.createBufferSource();_.buffer=n;const S=r.createGain();S.gain.value=y,_.connect(S).connect(r.destination),_.start(0,b.at,Bo)},p=b=>{if(!n||y<=0)return;const _=performance.now();if(_-u<fn)return;u=_,r.state==="suspended"&&r.resume();const S=b.detail?.year??0;R(S%100===0?l:S%10===0?o:i[a++%i.length])};window.addEventListener("timemap-scrub",p);const f=window.__tune?.register("Scrub tick",[{key:"volume",label:"Volume",min:0,max:1,step:.05,value:y,apply:b=>{y=b}},{key:"try",type:"button",label:"Year · decade · century",apply:async()=>{await v,n&&(r.state==="suspended"&&r.resume(),[i[0],o,l].forEach((b,_)=>setTimeout(()=>b&&R(b),_*220)))}}],{tab:"Map"});return{destroy:()=>{window.removeEventListener("timemap-scrub",p),f&&f(),r&&r.close().catch(()=>{})}}}const Qo="/timemap/assets/mountains/",yn="/timemap/mountains-points.geojson",pa=4;async function bn(e,t){let r;try{const u=await fetch(`${Qo}${t}.svg`);if(!u.ok)return;r=await u.text()}catch{return}const s=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,i=(s.getAttribute("viewBox")||"0 0 24 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((i[2]||24)*pa)),l=Math.max(1,Math.round((i[3]||16)*pa)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(s));await new Promise(u=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:pa})}catch{}u()},y.onerror=()=>u(),y.src=a})}async function wn(e,t={}){const{beforeId:r,opacity:n=1,visibility:s="visible"}=t;if(e.getLayer("mountains"))return;let i;try{i=await fetch(Qo+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!i||typeof i!="object"||at(e))return;const o=[...new Set(Object.values(i).flat())];await Promise.all(o.map(a=>bn(e,a)));let l;try{l=await fetch(yn).then(a=>a.json())}catch{return}at(e)||(e.getSource("mountains")?e.getSource("mountains").setData(l):e.addSource("mountains",{type:"geojson",data:l}),!e.getLayer("mountains")&&e.addLayer({id:"mountains",type:"symbol",source:"mountains",layout:{visibility:s,"icon-image":["coalesce",["get","icon"],"m-medium-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-rotation-alignment":"viewport","icon-rotate":["coalesce",["get","rot"],0],"icon-size":["interpolate",["linear"],["zoom"],2,["*",.2,["coalesce",["get","sz"],1]],5,["*",.46,["coalesce",["get","sz"],1]],7,["*",.66,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const qo="/timemap/assets/forests/",vn="/timemap/forest-points.geojson",ga=4;async function _n(e,t){let r;try{const u=await fetch(`${qo}${t}.svg`);if(!u.ok)return;r=await u.text()}catch{return}const s=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,i=(s.getAttribute("viewBox")||"0 0 16 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((i[2]||16)*ga)),l=Math.max(1,Math.round((i[3]||16)*ga)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(s));await new Promise(u=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:ga})}catch{}u()},y.onerror=()=>u(),y.src=a})}async function xn(e,t={}){const{beforeId:r,opacity:n=1,visibility:s="visible"}=t;if(e.getLayer("forests"))return;let i;try{i=await fetch(qo+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!i||typeof i!="object"||at(e))return;const o=[...new Set(Object.values(i).flat())];await Promise.all(o.map(a=>_n(e,a)));let l;try{l=await fetch(vn).then(a=>a.json())}catch{return}at(e)||(e.getSource("forests")?e.getSource("forests").setData(l):e.addSource("forests",{type:"geojson",data:l}),!e.getLayer("forests")&&e.addLayer({id:"forests",type:"symbol",source:"forests",layout:{visibility:s,"icon-image":["coalesce",["get","icon"],"g-small-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-size":["interpolate",["linear"],["zoom"],2,["*",.45,["coalesce",["get","sz"],1]],4,["*",.78,["coalesce",["get","sz"],1]],6,["*",1.05,["coalesce",["get","sz"],1]],7,["*",1.25,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const Ho="/timemap/assets/scatter/",En="/timemap/land-scatter.geojson",ya=4;async function Tn(e,t){let r;try{const u=await fetch(`${Ho}${t}.svg`);if(!u.ok)return;r=await u.text()}catch{return}const s=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,i=(s.getAttribute("viewBox")||"0 0 16 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((i[2]||16)*ya)),l=Math.max(1,Math.round((i[3]||16)*ya)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(s));await new Promise(u=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:ya})}catch{}u()},y.onerror=()=>u(),y.src=a})}async function kn(e,t={}){const{beforeId:r,opacity:n=.9,visibility:s="visible"}=t;if(e.getLayer("land-scatter"))return;let i;try{i=await fetch(Ho+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!i||typeof i!="object"||at(e))return;const o=[...new Set(Object.values(i).flat())];await Promise.all(o.map(a=>Tn(e,a)));let l;try{l=await fetch(En).then(a=>a.json())}catch{return}at(e)||(e.getSource("land-scatter")?e.getSource("land-scatter").setData(l):e.addSource("land-scatter",{type:"geojson",data:l}),!e.getLayer("land-scatter")&&e.addLayer({id:"land-scatter",type:"symbol",source:"land-scatter",layout:{visibility:s,"icon-image":["coalesce",["get","icon"],"s-tree-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-rotation-alignment":"viewport","icon-rotate":["coalesce",["get","rot"],0],"icon-size":["interpolate",["linear"],["zoom"],2,["*",.34,["coalesce",["get","sz"],1]],5,["*",.8,["coalesce",["get","sz"],1]],7,["*",1.1,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const Go="/timemap/assets/volcanoes/",An="/timemap/volcanoes.geojson",ba=4;async function Sn(e,t){let r;try{const u=await fetch(`${Go}${t}.svg`);if(!u.ok)return;r=await u.text()}catch{return}const s=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,i=(s.getAttribute("viewBox")||"0 0 24 18").split(/\s+/).map(Number),o=Math.max(1,Math.round((i[2]||24)*ba)),l=Math.max(1,Math.round((i[3]||18)*ba)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(s));await new Promise(u=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:ba})}catch{}u()},y.onerror=()=>u(),y.src=a})}async function Ln(e,t={}){const{beforeId:r,opacity:n=1,visibility:s="visible"}=t;if(e.getLayer("volcanoes"))return;let i;try{i=await fetch(Go+"manifest.json").then(l=>l.ok?l.json():null)}catch{}if(!i?.ids||at(e))return;await Promise.all(i.ids.map(l=>Sn(e,l)));let o;try{o=await fetch(An).then(l=>l.json())}catch{return}at(e)||(e.getSource("volcanoes")?e.getSource("volcanoes").setData(o):e.addSource("volcanoes",{type:"geojson",data:o}),!e.getLayer("volcanoes")&&e.addLayer({id:"volcanoes",type:"symbol",source:"volcanoes",layout:{visibility:s,"icon-image":["coalesce",["get","icon"],"v-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-size":["interpolate",["linear"],["zoom"],2,.5,5,1.2,7,1.7]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}function Mn(e,t){e.getLayer("volcanoes")&&e.setLayoutProperty("volcanoes","visibility",t?"visible":"none")}const Rn="FeatureCollection",Pn="Curated point markers for regions/peoples OpenHistoricalMap leaves blank. Label-only (no borders); clickable to start a lesson. Two enrichment modes: (a) `qid` = precise Wikidata enrichment via the endpoint; (b) `article_url` (+ optional `summary`, `inception`, `dissolution`) = a curated external article (e.g. worldhistory.org), rendered directly with no server call. decdate = numeric year, negative for BCE.",Cn=[{type:"Feature",geometry:{type:"Point",coordinates:[2.6,46.8]},properties:{id:"gaul",name:"Gaul",qid:"Q38060",start_decdate:-600,end_decdate:-51}},{type:"Feature",geometry:{type:"Point",coordinates:[10,51]},properties:{id:"germania",name:"Germania",qid:"Q62646",start_decdate:-750,end_decdate:400}},{type:"Feature",geometry:{type:"Point",coordinates:[-1.8,52.5]},properties:{id:"britannia",name:"Britannia",qid:"Q849967",start_decdate:-600,end_decdate:400}}],Dn={type:Rn,_note:Pn,features:Cn},In=JSON.parse(`[{"id":"cherusci","name":"Cherusci","qid":"Q268307","from":-30,"to":300,"shape":{"spine":[[9.179779286914936,52.267083561476284],[9.305414828022947,52.268511238079725],[9.383937041215347,52.267083561476284],[9.448182488372765,52.267083561476284],[9.52813237816855,52.267083561476284],[9.609509944568003,52.26565588487267],[9.67232771512181,52.26565588487267],[9.76369901774575,52.26565588487267]],"radius_km":110,"radius_note":"The middle Weser basin around the label, out to the Teutoburg ridge in the west and the northern Harz in the south-east. It deliberately stops short of the Elbe, which several sources reach — see the disagreements."},"provenance":{"summary":"Roughly right, edges guessed. The scholarly atlas prints the name across the middle Weser but draws no border, so the position is solid and the extent is ours.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line — no source draws an edge here, so neither do we.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/98939","grade":"A","year":2000,"note":"Map 10 F4. Gives the exact line the name is printed along, dated 30 BCE - 300 CE. It prints a name, not a border."},{"key":"tacitus","title":"Tacitus, Germania 36 and Annals 1.60 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/5/59/62-70","grade":"A","year":98,"note":"A primary source, and propaganda: Tacitus never went to Germania and wrote partly to shame Rome. He gives neighbours, not distances - Chatti to the south-west, Chauci to the north."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"A specialist historical-GIS project with a published bibliography. Maps the Cherusci at 1 CE as a bounded political entity."},{"key":"wikipedia","title":"Wikipedia, 'Cherusci', with the Commons map 'Lower Rhine 10BC.png'","url":"https://en.wikipedia.org/wiki/Cherusci","grade":"D","year":2025,"note":"The map on the article is credited 'own work' with no source in its file description, which is what puts it at D. Its text is well referenced; its map is not."}],"disagreements":[{"source":"euratlas","says":"Draws the Cherusci with a hard political border. The Barrington Atlas draws none at all. A crisp frontier here is a claim nobody can support - Germanic peoples had no surveyed borders."},{"source":"tacitus","says":"Implies the Cherusci reached east towards the Elbe and the Suebi beyond it. Our shape stops well short of the Elbe, so we are drawing them smaller than the written record allows."},{"source":"wikipedia","says":"Places them 'around the middle of the Weser' and stretching towards the Elbe - the same eastward reach we left out."}]}},{"id":"chatti","name":"Chatti","qid":"Q164076","from":-30,"to":300,"shape":{"spine":[[8.381212344516712,50.59658494521722],[8.521124651659477,50.69652230746209],[8.623917367111403,50.77647219725793],[8.753652521243907,50.86987099894725],[8.864297458015017,50.95374699940277],[9.04989541646978,51.08580708522635]],"radius_km":85,"radius_note":"The Hessian uplands the label runs through - the Eder, Fulda and Lahn valleys between the Wetterau and the Kassel basin. Smaller than the others because the label itself is drawn across a compact upland, not a plain."},"provenance":{"summary":"The firmest of this set. The atlas line, the Roman writers and the modern maps all put the Chatti in the same place - what is now Hesse.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/108885","grade":"A","year":2000,"note":"Map 11 I2. The label runs south-west to north-east across Hesse, dated 30 BCE - 300 CE."},{"key":"tacitus","title":"Tacitus, Germania 30-31 and 36 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/35/359-365","grade":"A","year":98,"note":"A primary source, and propaganda. Puts the Chatti where the Hercynian forest begins, on higher and harder ground than their neighbours - which matches the uplands the atlas label crosses."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps the Chatti at 1 CE as a bounded political entity in the same region."},{"key":"wikipedia","title":"Wikipedia, 'Chatti'","url":"https://en.wikipedia.org/wiki/Chatti","grade":"C","year":2025,"note":"'A region approximately corresponding to the modern German state of Hesse' - well referenced text, and it agrees with the atlas."}],"disagreements":[{"source":"barrington-awmc","says":"The Pleiades record's own summary describes the Chatti homeland as 'the valley of the Weser River'. The Eder and Fulda do drain into the Weser system, but the peoples' heartland is the Hessian uplands, not the Weser valley proper. We follow the atlas LINE, not that sentence."},{"source":"euratlas","says":"Draws a hard political border. The atlas draws none."}]}},{"id":"marcomanni","name":"Marcomanni","qid":"Q209851","from":-9,"to":300,"date_note":"The atlas dates its label 30 BCE - 300 CE, but the shape it marks is BOHEMIA, and the Marcomanni only moved into Bohemia under Maroboduus around 9 BCE. Dating a Bohemian shape to 30 BCE would put the people somewhere they were not yet, so the start is the migration, not the label.","shape":{"spine":[[13.571490978850932,50.51861793959273],[13.876061987597211,50.48245013230428],[14.0683224368683,50.459607306648195],[14.26248645494394,50.43486091218767],[14.449036197800922,50.40821094892232],[14.656525197509382,50.36633243521959],[14.86020705960857,50.328261059126305],[15.04866037127016,50.286382545423805],[15.254245802174012,50.2387933253072],[15.456024095468365,50.18549339877649]],"radius_km":90,"radius_note":"The Bohemian basin the label crosses. Note the label runs along the NORTHERN rim of that basin, so a symmetric radius around it reaches over the Ore Mountains into Saxony and stops short of southern Bohemia. Both edges are wrong in the same way and by the same amount, which is what one honest rule costs; neither is a frontier."},"provenance":{"summary":"Good for the Marcomannic Wars, wrong if you scrub back before 9 BCE. This is their Bohemian homeland - before that they lived further west and we do not draw them there.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line, checked against the Bohemian basin the label sits in.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/118831","grade":"A","year":2000,"note":"Map 12 G2. The label runs north-west to south-east across northern Bohemia."},{"key":"tacitus","title":"Tacitus, Germania 42 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268#42","grade":"A","year":98,"note":"A primary source, and propaganda. Names the Marcomanni and Quadi as the front rank facing the Danube, and says the Marcomanni took their land by driving out the Boii."},{"key":"tir-m33","title":"Tabula Imperii Romani M33: Castra Regina - Vindobona - Carnuntum","url":"http://www.worldcat.org/oclc/311333372","grade":"A","year":1986,"note":"The scholarly atlas sheet for this stretch of the Danube frontier, pp. 55-58. Cited by Pleiades for this people; consulted through that citation rather than the sheet itself."},{"key":"wikipedia","title":"Wikipedia, 'Marcomanni'","url":"https://en.wikipedia.org/wiki/Marcomanni","grade":"C","year":2025,"note":"Well referenced text: originally near the central Elbe and Saale or in Franconia, moving to Bohemia after a defeat around 9 BCE."}],"disagreements":[{"source":"wikipedia","says":"Puts their ORIGINAL home near the central Elbe and Saale, or possibly Franconia - hundreds of kilometres west of where we draw them. That is a disagreement about the date, not the place: we draw the Bohemia they moved to, and start the shape at the move."},{"source":"barrington-awmc","says":"Dates its label from 30 BCE, twenty years before the migration it marks. We start at 9 BCE instead."}]}},{"id":"suebi-elbe","name":"Suebi","qid":"Q155085","from":-330,"to":400,"shape":{"spine":[[10.994832142162466,53.10370205112616],[11.297023689902744,52.85385864551398],[11.534969790485775,52.658742843035895],[11.751500742016333,52.45648865754032],[12.001344147628515,52.20902471293397],[12.208971949229067,52.01315739735486],[12.393380177180916,51.83469782191759],[12.631326277763947,51.638392288936586],[12.827631810744947,51.471830018528465],[13.012040038696796,51.317165053149495],[13.220242876706948,51.10301356262477]],"radius_km":140,"radius_note":"The middle Elbe corridor the label follows. Wider than the others because the label itself is 250 km long, and still far smaller than anything Tacitus describes."},"provenance":{"summary":"Treat this one with caution. 'Suebi' was an umbrella for many peoples spread over half of Germania, so no single shape is right. This is their Elbe homeland only - it is where the name starts, not where the Suebi were.","confidence":"low","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line. The shape is knowingly narrower than the sources allow, because the alternative - shading half of Europe - would be more misleading, not less.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/99040","grade":"A","year":2000,"note":"Map 10 H3. The label runs 250 km down the middle Elbe, from Mecklenburg to Saxony, dated 330 BCE - 640 CE."},{"key":"tacitus","title":"Tacitus, Germania 38-45 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268","grade":"A","year":98,"note":"A primary source, and propaganda. Treats Suebi as a category rather than a people: he says they hold the greater part of Germania and then lists a dozen separate peoples inside it."},{"key":"caesar","title":"Caesar, Bellum Gallicum 1 and 4 - Ariovistus and the Suebi on the Rhine, 58 BCE","url":"https://en.wikipedia.org/wiki/Suebi","grade":"A","year":-51,"note":"A primary source. Caesar's Suebi are on the RHINE, some 500 km west of the Elbe homeland - consulted through the Wikipedia article's citations rather than the Latin text."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps Suebi at 1 CE as a bounded political entity, alongside separate entities for Cherusci, Chatti and Quadi."}],"disagreements":[{"source":"tacitus","says":"Says the Suebi hold the greater part of Germania - many times the area we shade. Following him would mean colouring in most of central Europe under one name, which is worse history, not better."},{"source":"caesar","says":"Meets Suebi on the Rhine in 58 BCE, roughly 500 km west of anything we draw. Our shape would show nothing at all where Caesar actually fought them."},{"source":"barrington-awmc","says":"Dates the label to 640 CE. We stop at 400, because by then the name has moved to entirely different people in Iberia - Cliopatria already carries that Kingdom of the Suebi (Q1048918) as a separate territory from 414."}]}},{"id":"quadi","name":"Quadi","qid":"Q308885","from":-30,"to":400,"shape":{"spine":[[16.847541814656722,48.9466577607958],[17.124154156584495,48.88122258313547],[17.350202952138375,48.83660768927598],[17.579226073949542,48.79199279541683],[17.867735720906467,48.73548059652836]],"radius_km":65,"radius_note":"The March and lower Vah valleys the label follows. Tighter than the others, and the number was chosen by the Danube rather than by taste: the river is a real southern edge here - it is the Roman frontier - so the radius is the largest one that keeps the shape north of it at Bratislava."},"provenance":{"summary":"The Marcomanni's neighbours and allies in the wars against Marcus Aurelius. Position is solid, extent is ours, and the Danube to the south is a genuine edge rather than a guessed one.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line, kept north of the Danube.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/128501","grade":"A","year":2000,"note":"Map 13 B4. The label runs west to east along the March, dated 30 BCE - 640 CE."},{"key":"tacitus","title":"Tacitus, Germania 42 and Annals 2.63 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268#41","grade":"A","year":98,"note":"A primary source, and propaganda. Pairs the Quadi with the Marcomanni as the peoples facing the Danube frontier."},{"key":"tir-m33","title":"Tabula Imperii Romani M33: Castra Regina - Vindobona - Carnuntum","url":"http://www.worldcat.org/oclc/311333372","grade":"A","year":1986,"note":"The scholarly atlas sheet for this stretch of the Danube frontier, pp. 69-71. Cited by Pleiades for this people; consulted through that citation rather than the sheet itself."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps the Quadi at 1 CE as a bounded political entity in the same region."}],"disagreements":[{"source":"barrington-awmc","says":"Dates the label to 640 CE, long after the Quadi disappear from the record. We stop at 400, around their move west with the Vandals and Alans."},{"source":"euratlas","says":"Draws a hard political border. The atlas draws none."}]}}]`),zo={territories:In},wa=111.32,io=64,Un=e=>e*Math.PI/180,Fn=e=>{const t=e.reduce((n,[,s])=>n+s,0)/e.length,r=wa*Math.cos(Un(t));return{forward:([n,s])=>[n*r,s*wa],inverse:([n,s])=>[n/r,s/wa]}},Nn=e=>{if(e.length<3)return[...e];const t=[...e].sort((s,i)=>s[0]-i[0]||s[1]-i[1]),r=(s,i,o)=>(i[0]-s[0])*(o[1]-s[1])-(i[1]-s[1])*(o[0]-s[0]),n=s=>{const i=[];for(const o of s){for(;i.length>=2&&r(i[i.length-2],i[i.length-1],o)<=0;)i.pop();i.push(o)}return i.pop(),i};return[...n(t),...n([...t].reverse())]},On=(e,t)=>{const{forward:r,inverse:n}=Fn(e),s=[];for(const o of e){const[l,a]=r(o);for(let u=0;u<io;u++){const y=u/io*2*Math.PI;s.push([l+t*Math.cos(y),a+t*Math.sin(y)])}}const i=Nn(s).map(n);return i.length?[...i,i[0]]:i},Bn=e=>({type:"Feature",id:e.id,properties:{id:e.id,Name:e.name,Wikidata:e.qid,FromYear:e.from,ToYear:e.to,Type:"POLITY",hand:!0,confidence:e.provenance.confidence},geometry:{type:"Polygon",coordinates:[On(e.shape.spine,e.shape.radius_km)]}}),so=e=>{let t=0;for(let r=0,n=e.length-1;r<e.length;n=r++)t+=e[n][0]*e[r][1]-e[r][0]*e[n][1];return Math.abs(t/2)},Qn=()=>({type:"FeatureCollection",features:zo.territories.map(Bn).sort((e,t)=>so(t.geometry.coordinates[0])-so(e.geometry.coordinates[0]))}),qn=e=>zo.territories.find(t=>t.id===e)??null,Hn=e=>qn(e)?.provenance??null,Gn="#f3ead6",zn="#d8e9f3",$n=["#c9b79c","#a8b9a0","#cbb3a1","#b6a8c0","#c2c0a0","#a9bcc4","#d0bfa8","#b9a99a","#aebfa6","#c8b6b0","#b0b6a0","#bcae9e"],Wn="#f5c518",jn="#ecd9a0",Yn={normal:.7,selected:.95},Xn={color:"#000",width:.4,opacity:.7},Kn={color:"#3b3326",halo:"#f3ead6"},te={land:Gn,water:zn,palette:$n,selected:Wn,hover:jn,fillOpacity:Yn,line:Xn,text:Kn},Vn=[{qid:"Q207162",use:"Q70972",note:"Kingdom of France lineage (990-1847) carries the Bourbon Restoration period item; use the Kingdom of France item"},{qid:"Q112039853",use:"Q12544",note:"Byzantine Empire polygons (633-1474) carry 'Foreign relations of the Byzantine Empire'; use the Byzantine Empire item"},{qid:"Q1179",use:"Q7703611",note:"Aquitaine 629-895 carries the 1960-2015 French administrative region; use the Duchy of Aquitaine"},{qid:"Q124661",use:"Q225890",note:"Strathclyde 644-1033 carries the 1975-1996 Scottish council region; use the Kingdom of Strathclyde"},{qid:"Q1656775",use:"Q37",note:"Interwar 'Kingdom of Lithuania' 1919-1939 carries the 1251-1263 medieval kingdom; use the Lithuania country item"},{qid:"Q751868",use:"Q159856",note:"County of Brabant 1260-1430 carries the 1085-1183 Landgraviate; use the Duchy of Brabant"},{qid:"Q12544",name:"Roman Empire",use:"Q2277",from:-31,to:394,note:"Roman Empire polygons share the Byzantine Empire QID; Eastern Roman Empire (395-632) keeps Q12544"},{qid:"Q1068371",name:"Han Dynasty",use:"Q7209",from:-202,to:237,note:"QID is the Chauhan dynasty (980-1201 keeps it); Han polygons get the Han dynasty item"},{qid:"Q1968654",name:"Han",use:"Q1574130",from:-404,to:-203,note:"QID is the Beylik of Saruhan (1314-1414 keeps it); Warring-States Han state"},{qid:"Q555994",name:"Lu",use:"Q736936",from:-750,to:-248,note:"QID is Aq Qoyunlu (1407-1511 keeps it); Lu state"},{qid:"Q1143524",name:"Qi",use:"Q837855",from:-750,to:-204,note:"QID is Northern Qi (555-576 keeps it); Qi state"},{qid:"Q1471995",name:"Qin",use:"Q34756",from:-750,to:-219,note:"QID is Former Qin (353-393 keeps it); Qin state"},{qid:"Q1472004",name:"Yan",use:"Q1055713",from:-750,to:-204,note:"QID is Former Yan (337-370 keeps it); Yan state"},{qid:"Q1574107",name:"Zhao",use:"Q197430",from:-404,to:-226,note:"QID is Former Zhao (306-336 keeps it); Zhao state"},{qid:"Q320930",name:"Wei",use:"Q912052",from:-404,to:-204,note:"QID is Cao Wei (224-264 keeps it); Warring-States Wei state"},{qid:"Q6201794",name:"Jin",use:"Q912043",from:-750,to:-405,note:"QID is the 10th-century Jin / Later Tang precursor (922-925 keeps it); Spring-and-Autumn Jin state"},{qid:"Q1936158",name:"Yue",use:"Q1137403",from:-500,to:-334,note:"QID is Minyue (-333 to -111 keeps it); Yue state"},{qid:"Q1139807",name:"Portugal",use:"Q45",note:"QID is the County of Portugal (1139-1146 keeps it); modern Portugal polygons (1976-2024) get the Portugal country item, which already has a list row"},{qid:"Q241748",use:"Q2415003",note:"Kingdom of Serbia polygons are 18x medieval (1188-1351) + one 1880-1884; QID is the 1882-1918 kingdom. Medieval item wins; the lone modern segment trades accuracy"},{qid:"Q688918",use:"Q75036",note:"Grand Duchy of Krakow 1279-1293 carries the 1846-1918 grand duchy; use the medieval Seniorate Province"},{qid:"Q79861",use:"Q2605410",note:"Michoacan 1305-1533 carries the modern Mexican state; the polity is the Purepecha (Tarascan) Empire"},{qid:"Q30592233",use:"Q48724193",note:"Pahang 1853-1889 carries the 1470-1623 old sultanate; use the Bendahara-era Pahang Kingdom (1770-1881)"},{qid:"Q109252949",use:"Q158445",note:"Duchy of Mecklenburg 1806-1870 carries the 1471-1701 duchy; use the Grand Duchy of Mecklenburg-Schwerin"},{qid:"Q373981",use:"Q2342941",note:"Tahirid Sultanate (Yemen, 1459-1515) carries the Iranian Tahirid dynasty (821-873); use the Yemeni Tahirid Sultanate"},{qid:"Q970940",use:"Q5311396",note:"Duchy of Leczyca carries the 1339-1793 Leczyca Voivodeship; use the medieval Duchy of Leczyca"},{qid:"Q13522657",use:"Q1541813",note:"County of Rosellon 896-1176 carries the 1659-1790 French province; use the County of Roussillon"},{qid:"Q5582862",use:"Q2314963",note:"Cuzco 1294-1439 carries the modern city of Cusco; the polity is the Kingdom of Cusco"},{qid:"Q1074947",use:"Q2390716",note:"'Kingdom of Pajana' 1572-1587 carries the Lontara script item; the polity is the Kingdom of Pajang (Java)"},{qid:"Q1069868",use:"Q1330290",note:"Southern Liang 397-413 carries the 502-587 Liang dynasty; use Southern Liang of the Sixteen Kingdoms"},{qid:"Q200797",use:"Q517333",note:"Principality of Polotsky carries the city of Polotsk; use the Principality of Polotsk"},{qid:"Q7038",use:"Q1233672",note:"County of Barcelona carries the city of Girona; use the County of Barcelona"},{qid:"Q17151",use:"Q2631829",note:"Commune of the Zealots 1344-1351 carries the city of Thessaloniki; use the Zealots of Thessalonica"},{qid:"Q156173",use:"Q102679",note:"Kingdom of Numidia carries king Jugurtha's biography; use the Numidia kingdom item"},{qid:"Q202266",use:"Q2196956",note:"Old Kingdom of Norway 866-1401 carries Margaret I's biography; use the Kingdom of Norway (872-1397)"},{qid:"Q4334533",use:"Q22684779",note:"Omani Slave Coast 1814-1855 carries the Omanis ethnic-group item; use the Omani Empire (1696-1856)"},{qid:"Q2330335",use:"Q815677",note:"Qarlugs 793-849 carries a Mongol-campaigns article; use the Karluks"},{qid:"Q5261548",use:"Q85816686",note:"Qasimids 1636-1802 carries the broader Rassid line; use the Qasimid State (1597-1849)"},{qid:"Q1050326",use:"Q2114397",note:"Sultan of Yogyakarta 1744-1829 carries the Hamengkubuwono dynasty item; use the Yogyakarta Sultanate"},{qid:"Q654380",use:"Q39047075",note:"Turk Shahis carries a disambiguation page; use the Turk Shahis kingdom item"},{qid:"Q81133615",use:"Q2991084",note:"Angevins 1126-1146 carries a disambiguation page; use the County of Anjou"},{qid:"Q5724",use:"Q13627537",note:"Anuradhapura -291 to 1017 carries the modern city; use the Anuradhapura period (kingdom era)"},{qid:"Q7903",use:"Q808139",note:"Barghawata Conference 793-1065 carries the city of Casablanca; use the Barghawata confederation"},{qid:"Q11256",use:"Q133878465",note:"Cuban Nationalists 1895-1899 carries Fidel Castro's biography; use the Republic of Cuba in Arms (1868-1898)"},{qid:"Q371402",use:"Q11264",note:"Cuban Communists 1958-1959 carries the 1965 Communist Party; use the Cuban Revolution"},{qid:"Q5428692",use:"Q214426",note:"Maderistas 1911 carries a Wikimedia list article; use the Mexican Revolution"},{qid:"Q2984183",use:"Q353227",note:"Duchies of Poland 1279-1304 carries the Testament of Boleslaw III item; use History of Poland during the Piast dynasty"},{qid:"Q1317991",use:"Q430309",note:"Dai Viet 1529-1833 carries the Mac dynasty (1527-1677 only); use the Dai Viet umbrella item"},{qid:"Q15984928",use:"Q371334",note:"Mexican Monarchists 1864 carries the Conservative Party; use the Second Mexican Empire, which already has a list row"},{qid:"Q7777597",use:"Q5760",note:"Thebans -350 to -338 carries a disambiguation page; use Thebes, Greece"},{qid:"Q3125978",use:"Q12491027",note:"Bali 1687-1907 carries the modern Indonesian province; use the Bali Kingdom item, which already has a list row"},{qid:"Q213763",use:"Q3137677",note:"County of Bearn 1385-1452 carries the 1620-1790 French province; use the Viscounty of Bearn"},{qid:"Q43292",use:"Q892292",note:"Sultanate of Bone 1512-1858 carries the generic 'Sultan' title item; use the Bone State (Sulawesi)"},{qid:"Q2118293",use:"Q83328",note:"'Turks' 666-756 carries the legendary Oghuz Khagan biography; use the Turkic peoples item (no single-polity article covers these polygons)"},{qid:"Q1661685",name:"Sasanian Empire",use:"Q83891",from:215,to:643,note:"QID is the Kushano-Sasanian Kingdom ('Indo-Sasanian Empire' 260-357 keeps it); the main Sasanian Empire polygons get the Sasanian Empire item"},{qid:"Q918153",name:"Ceylon",use:"Q20987440",from:1236,to:1506,note:"QID is British Ceylon (1796-1814 polygons keep it); medieval Ceylon gets the Sinhalese monarchy umbrella"},{qid:"Q2118293",name:"Oghuz Turks",use:"Q494462",from:750,to:1055,note:"QID is the legendary Oghuz Khagan; Oghuz Turks polygons get the Oghuz Turks item ('Turks' 666-756 keeps the qid-only override above)"},{qid:"Q350186",name:"Denmark",use:"Q35",from:1945,to:2024,note:"QID is Christopher II of Denmark's biography ('Danish Magnates' 1333-1351 keeps it as interregnum context); modern Denmark polygons get the Denmark country item"},{qid:"Q28513",name:"Hungary",use:"Q28",from:1947,to:2024,note:"QID is Austria-Hungary (1868-1918 polygons keep it); modern Hungary polygons get the Hungary country item, which already has a list row"},{qid:"Q59223",use:"Q197913",note:"Zhongshan (Warring-States, Hebei, -366 to -292) carries the modern Zhongshan city in Guangdong; use the Zhongshan state item"},{qid:"Q983",name:"Guinea",use:"Q1006",from:1960,to:2024,note:"QID is Equatorial Guinea (its 1969-2024 polygons keep it); Guinea-Conakry polygons get the Guinea country item"},{qid:"Q175881",use:"Q17167",note:"Roman Republic polygons (-500 to -32) carry Q175881, the 1798-1799 sister republic of the First French Republic; use the ancient Roman Republic (509-27 BC)"}],Zn={overrides:Vn},Pa={day:0,month:1,year:2},Jn=(e,t)=>Pa[e]>=Pa[t]?e:t,lo=e=>e in Pa?e:"day",ei=e=>{const t=lo(e?.date_precision),r=[];for(const n of e?.legs??[]){const[s,i]=Array.isArray(n?.wp)?n.wp:[];for(const[o,l,a]of[[s,n.depart,n.depart_precision],[i,n.arrive,n.arrive_precision]]){const u=Date.parse(l);!Number.isFinite(Number(o))||!Number.isFinite(u)||r.push({wp:Number(o),ms:u,precision:a?lo(a):t})}}return r.sort((n,s)=>n.wp-s.wp||n.ms-s.ms)},co=(e,t)=>{const r=e.cum.length-1,n=Math.max(0,Math.min(r,t)),s=Math.min(r-1,Math.floor(n));return s<0?0:e.cum[s]+(e.cum[s+1]-e.cum[s])*(n-s)},ti=(e,t,r)=>{const n=ei(e);if(!n.length||!Array.isArray(t)||t.length<2)return null;const s=Nr(t),i=co(s,r),o=x=>co(s,x.wp*Uo),l=1e-9;let a=null,u=null;for(const x of n){const v=o(x);v<=i+l&&(a=x),v>=i-l&&!u&&(u=x)}if(!a||!u)return null;if(a===u||o(u)-o(a)<=l)return{ms:a.ms,precision:a.precision};const y=(i-o(a))/(o(u)-o(a));return{ms:Math.round(a.ms+(u.ms-a.ms)*y),precision:Jn(a.precision,u.precision)}},$o=(e,t="en")=>{if(!e||!Number.isFinite(e.ms))return"";const r=String(t||"en").replace("_","-").toLowerCase()==="en"?"en-GB":t,n=new Date(e.ms),s=n.getUTCFullYear()<=0,i={timeZone:"UTC",year:"numeric"};e.precision!=="year"&&(i.month="long"),e.precision==="day"&&(i.day="numeric"),s&&(i.era="short");try{return new Intl.DateTimeFormat(r,i).format(n)}catch{return new Intl.DateTimeFormat("en-GB",i).format(n)}},ai=(e,t,r)=>{if(!Array.isArray(e)||e.length<2)return null;const n=Math.cos(r*Math.PI/180);let s=null;for(let i=1;i<e.length;i++){const[o,l]=e[i-1],[a,u]=e[i],y=t+360*Math.round((o-t)/360),x=(a-o)*n,v=u-l,R=x*x+v*v,p=R>0?Math.max(0,Math.min(1,((y-o)*n*x+(r-l)*v)/R)):0,f=o+(a-o)*p,b=l+(u-l)*p,_=Math.hypot((y-f)*n,r-b);(!s||_<s.distance)&&(s={sample:i-1+p,lng:f,lat:b,distance:_})}return s},oi=new Set((Fr?.transports??[]).filter(e=>e?.terrain==="land").map(e=>e.id)),ri=(e,t)=>{const r=t/Uo,n=(e?.legs??[]).find(s=>{const i=Number(s?.wp?.[0]),o=Number(s?.wp?.[1]??i);return r>=Math.min(i,o)-1e-6&&r<=Math.max(i,o)+1e-6});return n&&oi.has(n.transport)?n.transport:null},ni=18,ii=new Map(Fa.voyages.map(e=>[e.id,{voyage:e,coords:Ma(e.waypoints)}])),si=e=>(e.fleet??[]).slice().sort((t,r)=>+!!r.flagship-+!!t.flagship).map(t=>t.name).filter(Boolean).join(", "),li=e=>{const t=document.createElement("div");t.className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-64 rounded-card bg-card-surface px-3 py-2",t.style.display="none",t.setAttribute("role","status"),t.setAttribute("aria-live","polite"),t.dataset.voyageHoverLabel="";const r=document.createElement("p");r.className="text-xs font-medium leading-snug text-card-muted";const n=document.createElement("p");return n.className="text-prose font-semibold leading-snug text-card-title",t.append(r,n),e.appendChild(t),{el:t,names:r,date:n}};function ci(e,{ships:t,locale:r="en",transportNames:n={}}={}){const s=e.getContainer().parentElement||e.getContainer(),i=li(s);let o=null,l=null,a=null,u=0;const y=()=>{l&&t()?.setTourProgress(l,null),l=null,i.el.style.display="none"},x=(R,p)=>{const f=ii.get(R);if(!f)return y();const b=ai(f.coords,p.lng,p.lat);if(!b)return y();const _=t();l&&l!==R&&_?.setTourProgress(l,null),_?.fractionAtSample&&(_.setTourProgress(R,_.fractionAtSample(R,b.sample)),l=R);const S=ti(f.voyage,f.coords,b.sample),g=ri(f.voyage,b.sample);i.names.textContent=g&&n[g]||si(f.voyage)||f.voyage.name,i.date.textContent=S?$o(S,r):String(f.voyage.years??"").replace(/\s+—\s+/g,": ");const c=e.project([b.lng,b.lat]),H=e.getCanvas().getBoundingClientRect(),F=s.getBoundingClientRect();i.el.style.display="";const{offsetWidth:A,offsetHeight:Y}=i.el,m=H.left-F.left+c.x-A/2,Q=H.top-F.top+c.y-Y-ni;i.el.style.transform=`translate(${Math.round(m)}px, ${Math.round(Q)}px)`},v=()=>{u=0;const R=a;a=null,R?.id?x(R.id,R.lngLat):y()};return e.on("mousemove","voyage-hit",R=>{e.getCanvas().style.cursor="pointer",a={id:R.features?.[0]?.properties?.id,lngLat:R.lngLat},u||(u=requestAnimationFrame(v))}),e.on("mouseleave","voyage-hit",()=>{e.getCanvas().style.cursor="",a=null,u&&(cancelAnimationFrame(u),u=0),y()}),e.on("movestart",y),{select(R){o=R||null,Ja(e,o)},clear(){o!==null&&(o=null,Ja(e,null))},get selected(){return o},destroy(){y(),i.el.remove()}}}const Wo="/timemap/voyages",Xt=new Map,et=(e,t)=>!e||typeof e!="object"?typeof e=="string"?e:"":e[t]||e.en||"",ui=(e,t)=>{const r=o=>Number.isFinite(o);if(!r(e.born)&&!r(e.died))return"";const n=(r(e.born)?e.born:e.died)<=0,s=(o,l)=>r(o)?`${l?"c. ":""}${o<=0?1-o:o}`:"?",i=n?t==="nl"?" v.Chr.":" BCE":"";return`${s(e.born,e.born_approx)}–${s(e.died,e.died_approx)}${i}`},hi=e=>String(e||"").split(/\s+/).filter(t=>new RegExp("^\\p{Lu}","u").test(t)).slice(0,2).map(t=>t[0]).join("")||String(e||"?")[0],uo=e=>[e.creator,e.year,e.licence].filter(Boolean).join(", "),di=(e,t,r="en")=>{const n=`${Wo}/${encodeURIComponent(e.id)}/`,s=i=>i&&i.file?{src:n+encodeURIComponent(i.file),width:i.width||null,height:i.height||null,title:i.title||"",caption:et(i.caption,r)||i.title||"",credit:uo(i),source_url:i.source_url||null}:null;return{voyage:!0,voyageId:e.id,label:String(t?.name??e.id).replace(/\s+—\s+/g,": "),inception:t?.year_start??null,dissolution:t?.year_end??null,summary:null,flag_path:null,predecessor:null,successor:null,wikipedia_url:et(e.wikipedia,r)||null,story:[{key:"purpose",text:et(e.purpose,r)},{key:"crew",text:et(e.crew,r)},{key:"legacy",text:et(e.legacy,r)}].filter(i=>i.text),moments:(e.moments??[]).map((i,o)=>({key:`${i.date}-${o}`,date:$o({ms:Date.parse(i.date),precision:i.precision||"day"},r),year:new Date(Date.parse(i.date)).getUTCFullYear(),text:et(i,r)})),gallery:(e.images??[]).map(s).filter(Boolean),figures:(e.people??[]).map((i,o)=>({qid:i.qid||null,key:i.qid||`person-${o}`,name:i.name,kind:et(i.role,r),era:ui(i,r),lines:et(i,r),image_url:i.image?.file?n+encodeURIComponent(i.image.file):null,credit:i.image?uo(i.image):"",initials:hi(i.name)})),sources:(e.sources??[]).map(i=>({key:i.key,title:i.title,url:i.url}))}},fi=async(e,t="en")=>{const r=String(t||"en").slice(0,2).toLowerCase(),n=Fa.voyages.find(s=>s.id===e);if(!n)throw new Error(`unknown voyage ${e}`);return Xt.has(e)||Xt.set(e,fetch(`${Wo}/${encodeURIComponent(e)}/card.json`).then(s=>{if(!s.ok)throw new Error(`HTTP ${s.status}`);return s.json()}).catch(s=>{throw Xt.delete(e),s})),di(await Xt.get(e),n,r)},mi=[{family:"France",color:"#4a6db3",qids:["Q207162","Q146246","Q58296","Q877619","Q219817","Q71084","Q58326","Q71092","Q70802","Q69829","Q200686","Q152582","Q69808","Q19951607","Q3561","Q3769","Q271894","Q646374","Q185682","Q5501836","Q139708","Q170604","Q1353951"]},{family:"Netherlands",color:"#d9782d",qids:["Q170072","Q55","Q774783","Q25227","Q188161","Q221283","Q1841483","Q382593","Q4807130"]},{family:"Spain",color:"#d1a437",qids:["Q29","Q80702","Q377350","Q497777","Q178038","Q13474305","Q2742116","Q600093"]},{family:"Castile",color:"#b3823a",qids:["Q179293","Q217196"]},{family:"Aragon",color:"#c9953f",qids:["Q1235737","Q199442","Q204920"]},{family:"England-Britain",color:"#b5493c",qids:["Q784963","Q200485","Q179876","Q330362","Q23666","Q8680","Q46395","Q129286","Q179848","Q370736","Q918153","Q876185"]},{family:"Scotland",color:"#52709b",qids:["Q230791"]},{family:"Portugal",color:"#4f7f57",qids:["Q1139807","Q45670","Q45","Q200464","Q16879646","Q1709007"]},{family:"Holy Roman Empire",color:"#94879b",qids:["Q12548"]},{family:"Habsburg-Austria",color:"#c2a24e",qids:["Q66504140","Q65968","Q131964","Q28513","Q40","Q187830"]},{family:"Prussia",color:"#5f646d",qids:["Q153091","Q157367","Q27306"]},{family:"Rome",color:"#9d4038",qids:["Q175881","Q12544","Q42834"]},{family:"Byzantium",color:"#7b559b",qids:["Q112039853"]},{family:"Ottomans",color:"#3f7468",qids:["Q12560","Q1529261"]},{family:"Umayyads",color:"#c5b183",qids:["Q8575586"]},{family:"Abbasids",color:"#4c5a50",qids:["Q12536"]},{family:"Russia",color:"#3f6b4c",qids:["Q186096","Q34266","Q139319","Q159","Q1108445"]},{family:"Sweden",color:"#5d89c4",qids:["Q34","Q322187","Q62589"]},{family:"Denmark",color:"#99414b",qids:["Q35","Q756617","Q62651","Q111953993"]},{family:"Norway",color:"#8c5364",qids:["Q20","Q202266"]},{family:"Poland",color:"#bd6a5e",qids:["Q577867","Q36","Q2984183","Q1515009","Q172107"]},{family:"Germany",color:"#6d7078",qids:["Q43287","Q41304","Q7318","Q713750","Q183"]},{family:"Hungary",color:"#8fa156",qids:["Q171150","Q2899771","Q28"]},{family:"Bohemia",color:"#77628b",qids:["Q2162698","Q42585"]},{family:"Venice",color:"#4e8891",qids:["Q4948"]},{family:"Genoa",color:"#8f5560",qids:["Q174306"]},{family:"Bulgaria",color:"#5e7f4e",qids:["Q191484","Q203817","Q420759","Q185488","Q815731","Q147909","Q121932"]},{family:"Serbia",color:"#8d6079",qids:["Q241748","Q1311990","Q1406298","Q878319","Q37024"]},{family:"China",color:"#c2803f",qids:["Q9683"]},{family:"China-Ming",color:"#c99435",qids:["Q9903","Q1198163"]},{family:"China-Qing",color:"#b06f3f",qids:["Q8733"]},{family:"China-Han",color:"#b8763d",qids:["Q1068371"]},{family:"Mongols",color:"#8a6a53",qids:["Q12557","Q19927420"]},{family:"Japan",color:"#c46a6a",qids:["Q188712","Q210688","Q193292","Q189178","Q204023"]},{family:"Mughals",color:"#57856b",qids:["Q33296"]},{family:"Maurya",color:"#a3814f",qids:["Q62943"]},{family:"Persia",color:"#6f5b8e",qids:["Q389688","Q1661685","Q161205"]},{family:"Inca",color:"#b7893f",qids:["Q28573"]},{family:"Aztec",color:"#86754a",qids:["Q2608489"]},{family:"United States",color:"#567aa9",qids:["Q30"]}],pi={families:mi},He=(e,t,r=0)=>{const n=1+Math.max(0,r)/aa,s=t*Math.PI/180,i=e*Math.PI/180;return[Math.cos(s)*Math.cos(i)*n,Math.sin(s)*n,Math.cos(s)*Math.sin(i)*n]},gi=e=>(2*Math.atan(Math.exp((1-2*e)*Math.PI))-Math.PI/2)*180/Math.PI,ho=e=>.5-Math.log(Math.tan(Math.PI/4+e*Math.PI/180/2))/(2*Math.PI),fo=85.0511287798066,yi=89.999,va=6,oa=(e=64,t=48)=>{const r=[],n=[],s=[],i=a=>fo+(yi-fo)*(a/va),o=[];for(let a=va;a>=1;a--)o.push(ho(i(a)));for(let a=0;a<=t;a++)o.push(a/t);for(let a=1;a<=va;a++)o.push(ho(-i(a)));for(const a of o){const u=gi(a)*Math.PI/180;for(let y=0;y<=e;y++){const x=y/e,v=(x*360-180)*Math.PI/180;r.push(x,a),n.push(Math.cos(u)*Math.cos(v),Math.sin(u),Math.cos(u)*Math.sin(v))}}const l=e+1;for(let a=0;a<o.length-1;a++)for(let u=0;u<e;u++){const y=a*l+u,x=y+l;s.push(y,x,y+1,x,x+1,y+1)}return{positions:new Float32Array(r),spheres:new Float32Array(n),indices:new Uint16Array(s),vertexCount:(e+1)*o.length,rowCount:o.length}},ra=`
  vec4 projectShell(vec2 pos, float elevationGlobe, float elevationMercator) {
    #ifdef GLOBE
      return projectTileFor3D(pos, elevationGlobe);
    #else
      return projectTileFor3D(clamp(pos, 0.0, 1.0), elevationMercator);
    #endif
  }
`,Na=`
  float daylightFraction(float sunAngle) {
    return smoothstep(-0.31, 0.09, sunAngle);
  }
`,jo=`
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
`,Yo=`
  vec2 sphereSpan(vec3 origin, vec3 dir, float radius) {
    float b = dot(origin, dir);
    float c = dot(origin, origin) - radius * radius;
    float disc = b * b - c;
    if (disc < 0.0) return vec2(1.0, -1.0);
    float sq = sqrt(disc);
    return vec2(-b - sq, -b + sq);
  }
`,Xo=`
  bool facesCamera(vec3 unitPos, vec3 camera) {
    return dot(unitPos, camera) > 1.0;
  }
`,Oa=(e,t)=>{const r=Ra(e),n=typeof r?.getCameraAltitude=="function"?r.getCameraAltitude():null;if(Number.isFinite(n))return n;const s=r?.cameraToCenterDistance;if(!Number.isFinite(s))return 1e7;const i=512*Math.pow(2,e.getZoom()),o=1/t.MercatorCoordinate.fromLngLat(e.getCenter(),0).meterInMercatorCoordinateUnits();return s/i*o*Math.cos(e.getPitch()*Math.PI/180)},mt=(e,t)=>{const r=Ra(e)?.cameraPosition;if(r&&Number.isFinite(r[0])&&Number.isFinite(r[1])&&Number.isFinite(r[2]))return[r[2],r[1],r[0]];const n=Ra(e),s=typeof n?.getCameraLngLat=="function"?n.getCameraLngLat():e.getCenter();return He(s.lng,s.lat,Oa(e,t))},Ko=e=>typeof e.texStorage2D=="function",bi=`#version 300 es
#define attribute in
#define varying out
#define texture2D texture
`,wi=`#version 300 es
#define varying in
#define texture2D texture
out highp vec4 tm_fragColour;
#define gl_FragColor tm_fragColour
`,Ye=(e,t,r,n="layer",{es300:s=!1}={})=>(s&&Ko(e)&&(t=bi+t,r=wi+r),vi(e,t,r,n)),vi=(e,t,r,n)=>{const s=(a,u)=>{const y=e.createShader(a);if(e.shaderSource(y,u),e.compileShader(y),!e.getShaderParameter(y,e.COMPILE_STATUS)){const x=e.getShaderInfoLog(y);throw e.deleteShader(y),new Error(`${n} shader: ${x}`)}return y},i=e.createProgram(),o=s(e.VERTEX_SHADER,t),l=s(e.FRAGMENT_SHADER,r);if(e.attachShader(i,o),e.attachShader(i,l),e.linkProgram(i),e.deleteShader(o),e.deleteShader(l),!e.getProgramParameter(i,e.LINK_STATUS)){const a=e.getProgramInfoLog(i);throw e.deleteProgram(i),new Error(`${n} link: ${a}`)}return i},na=`
  vec2 equirectUV(vec3 dir, float drift) {
    return vec2(atan(dir.z, dir.x) / 6.28318530718 + 0.5 + drift,
                0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265359);
  }

  vec2 equirectUVInside(vec3 dir, float drift) {
    return vec2(-atan(dir.z, dir.x) / 6.28318530718 + 0.5 + drift,
                0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265359);
  }
`,Zt=9e4,Vo=`
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
`,Zo=["time","drift","field","fieldAmount","wind","windAmount","windScale","windRate","patches","patchAmount","patchTiles","patchMean","patchDetail"],_i=.75,xi=144,Ei=.4335,Jo=(e,t,r,n,s,i,o)=>{const l=r.animate?n.seconds:0;t.time&&e.uniform1f(t.time,l),t.drift&&e.uniform1f(t.drift,l*r.driftRate),t.fieldAmount&&e.uniform1f(t.fieldAmount,n.field?.ready?1:0),t.patchAmount&&e.uniform1f(t.patchAmount,n.patches?.ready?1:0),t.patchTiles&&e.uniform1f(t.patchTiles,r.patchTiles??xi),t.patchMean&&e.uniform1f(t.patchMean,r.patchMean??Ei),t.patchDetail&&e.uniform1f(t.patchDetail,r.patchDetail??_i),t.windAmount&&e.uniform1f(t.windAmount,n.wind?.ready?r.windAmount:0),t.windScale&&e.uniform1f(t.windScale,r.windScale),t.windRate&&e.uniform1f(t.windRate,r.animate?r.windRate:0),n.field?.ready&&t.field&&(e.activeTexture(e.TEXTURE0+s),e.bindTexture(e.TEXTURE_2D,n.field.texture),e.uniform1i(t.field,s)),n.wind?.ready&&t.wind&&(e.activeTexture(e.TEXTURE0+i),e.bindTexture(e.TEXTURE_2D,n.wind.texture),e.uniform1i(t.wind,i)),n.patches?.ready&&t.patches&&(e.activeTexture(e.TEXTURE0+o),e.bindTexture(e.TEXTURE_2D,n.patches.texture),e.uniform1i(t.patches,o))},mo=new WeakMap,Ti=e=>{let t=mo.get(e);return t||(t=new Map,mo.set(e,t)),t},ki=(e,t)=>t!==1?{internal:e.RGBA,format:e.RGBA}:typeof e.texStorage2D=="function"?{internal:e.R8,format:e.RED}:{internal:e.LUMINANCE,format:e.LUMINANCE},Ai=(e,t,r,n)=>{const s=e.createTexture();e.bindTexture(e.TEXTURE_2D,s),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1);const{internal:i,format:o}=ki(e,n);return e.texImage2D(e.TEXTURE_2D,0,i,o,e.UNSIGNED_BYTE,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,r?e.LINEAR_MIPMAP_LINEAR:e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),r&&e.generateMipmap(e.TEXTURE_2D),s},Fe=(e,t,r=null,{mipmap:n=!0,channels:s=4}={})=>{const i=Ti(e),o=`${t}|${n?"mip":"flat"}|c${s}`;let l=i.get(o);if(!l){l={texture:null,ready:!1,refs:0,waiters:[],width:0},i.set(o,l);const u=new Image;u.crossOrigin="anonymous",u.onload=()=>{if(l.refs===0)return;const y=e.getParameter?.(e.MAX_TEXTURE_SIZE)??1/0;if(u.width>y){l.waiters=[];return}l.width=u.width,l.texture=Ai(e,u,n,s),l.ready=!0;const x=l.waiters;l.waiters=[],x.forEach(v=>v())},u.onerror=()=>{l.waiters=[]},u.src=t}l.refs++;let a=!0;return r&&(l.ready?r():l.waiters.push(r)),{get texture(){return l.texture},get ready(){return l.ready},get width(){return l.width},release(){a&&(a=!1,r&&(l.waiters=l.waiters.filter(u=>u!==r)),l.refs--,!(l.refs>0)&&(l.texture&&e.deleteTexture(l.texture),l.texture=null,l.ready=!1,i.delete(o)))}}},er=`
  mat3 equirectTangentFrame(vec3 unitPos) {
    vec3 up = normalize(unitPos);
    vec3 east = cross(up, vec3(0.0, 1.0, 0.0));
    float span = length(east);
    // Standing on a pole, every direction is south and no direction is east. Pick one rather than
    // dividing by zero and putting a NaN in the middle of Antarctica.
    east = span > 1.0e-4 ? east / span : vec3(0.0, 0.0, 1.0);
    return mat3(east, cross(up, east), up);
  }
`,tr=`
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
`,Si=`
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
`,Li=(e,t)=>2*Math.PI*aa*Math.cos(t*Math.PI/180)/e,Mi=(e,t,r)=>Math.min(r,Math.max(t,e)),Ri=(e,t,r)=>{const n=Mi((r-e)/(t-e),0,1);return n*n*(3-2*n)},Pi=(e,t,r)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e)/2,s=Li(r,t)/n;return{pixelsPerTexel:s,strength:1-Ri(3,5,Math.log2(Math.max(s,1e-6)))}},ar="tm-clouds",Ci=(e,t,r)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e),i=156543.03392/2**9,o=Math.min(1,n/i),a=aa/Math.max(1,n*110);return{frequency:Math.min(2600,Math.max(9,a)),amount:.14+(1-o)*.1,fade:Number.isFinite(r)?Di(1.35,2.75,r/Zt):0}},Di=(e,t,r)=>{const n=Math.min(1,Math.max(0,(r-e)/(t-e)));return n*n*(3-2*n)},Ii=e=>`#version 300 es
${e.define}
${e.vertexShaderPrelude}
in vec2 a_pos;
in vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
out vec3 v_sphere;
${ra}
void main() {
  v_sphere = a_sphere;
  // Globe wants metres above the sphere; mercator wants z in mercator units. Same deck, two rulers.
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,Ui=()=>`#version 300 es
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
${jo}
${na}
${Na}
${er}
${tr}
// The field, the wind and the clock the ground's cloud shadows read from the same source.
${Vo}

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
}`,Fi=({opacity:e=.5,animate:t=!0,fieldUrl:r=null,patchUrl:n=null,driftRate:s=4e-4,sun:i=[.4,.5,.75],windUrl:o=null,windAmount:l=1,windScale:a=.06,windRate:u=.05,cloudRelief:y=90,cloudDepth:x=4,powder:v=1,forward:R=.5,forwardG:p=.7,selfShadow:f=.18,selfShadowStep:b=.0015}={})=>{const _=oa();let S=null,g=null,c=null;const H=new Map;let F={opacity:e,animate:t,fieldUrl:r,patchUrl:n,driftRate:s,sun:i,windUrl:o,windAmount:l,windScale:a,windRate:u,cloudRelief:y,cloudDepth:x,powder:v,forward:R,forwardG:p,selfShadow:f,selfShadowStep:b},A=null,Y=null,m=null;const Q=C=>{const I=C.variantName;if(H.has(I))return H.get(I);const k=Ye(g,Ii(C),Ui(),"tm-clouds"),U={program:k,attribs:{pos:g.getAttribLocation(k,"a_pos"),sphere:g.getAttribLocation(k,"a_sphere")},uniforms:{elevationGlobe:g.getUniformLocation(k,"a_elevation_globe"),elevationMercator:g.getUniformLocation(k,"a_elevation_mercator"),opacity:g.getUniformLocation(k,"u_opacity"),sun:g.getUniformLocation(k,"u_sun"),...Object.fromEntries(Zo.map(w=>[w,g.getUniformLocation(k,`u_${w}`)])),detailFreq:g.getUniformLocation(k,"u_detailFreq"),detailAmount:g.getUniformLocation(k,"u_detailAmount"),deckFade:g.getUniformLocation(k,"u_deckFade"),camera:g.getUniformLocation(k,"u_camera"),cloudRelief:g.getUniformLocation(k,"u_cloudRelief"),cloudDepth:g.getUniformLocation(k,"u_cloudDepth"),powder:g.getUniformLocation(k,"u_powder"),forward:g.getUniformLocation(k,"u_forward"),forwardG:g.getUniformLocation(k,"u_forwardG"),selfShadow:g.getUniformLocation(k,"u_selfShadow"),selfShadowStep:g.getUniformLocation(k,"u_selfShadowStep"),matrix:g.getUniformLocation(k,"u_projection_matrix"),tileMercatorCoords:g.getUniformLocation(k,"u_projection_tile_mercator_coords"),clippingPlane:g.getUniformLocation(k,"u_projection_clipping_plane"),transition:g.getUniformLocation(k,"u_projection_transition"),fallbackMatrix:g.getUniformLocation(k,"u_projection_fallback_matrix")}};return H.set(I,U),U},G=(C,I)=>{C.matrix&&g.uniformMatrix4fv(C.matrix,!1,I.mainMatrix),C.tileMercatorCoords&&g.uniform4f(C.tileMercatorCoords,...I.tileMercatorCoords),C.clippingPlane&&g.uniform4f(C.clippingPlane,...I.clippingPlane),C.transition&&g.uniform1f(C.transition,I.projectionTransition),C.fallbackMatrix&&g.uniformMatrix4fv(C.fallbackMatrix,!1,I.fallbackMatrix)},z=()=>S?.triggerRepaint();return{id:ar,type:"custom",renderingMode:"3d",onAdd(C,I){S=C,g=I;const k=(U,w)=>{const W=g.createBuffer();return g.bindBuffer(U,W),g.bufferData(U,w,g.STATIC_DRAW),W};c={pos:k(g.ARRAY_BUFFER,_.positions),sphere:k(g.ARRAY_BUFFER,_.spheres),index:k(g.ELEMENT_ARRAY_BUFFER,_.indices)},F.fieldUrl&&(A=Fe(g,F.fieldUrl,z,{channels:1})),F.windUrl&&(Y=Fe(g,F.windUrl,z)),F.patchUrl&&(m=Fe(g,F.patchUrl,z,{channels:1}))},onRemove(){g&&(H.forEach(({program:C})=>g.deleteProgram(C)),H.clear(),A?.release(),A=null,Y?.release(),Y=null,m?.release(),m=null,c&&(g.deleteBuffer(c.pos),g.deleteBuffer(c.sphere),g.deleteBuffer(c.index),c=null),S=null,g=null)},render(C,I){if(!c||F.opacity<=0)return;const k=I&&I.shaderData,U=I&&I.defaultProjectionData;if(!k||!U)return;const{program:w,attribs:W,uniforms:B}=Q(k);g.useProgram(w),G(B,U);const Z=S.getCenter().lat;B.elevationGlobe&&g.uniform1f(B.elevationGlobe,Zt),B.elevationMercator&&g.uniform1f(B.elevationMercator,le.MercatorCoordinate.fromLngLat([0,Z],Zt).z),B.opacity&&g.uniform1f(B.opacity,F.opacity),B.sun&&g.uniform3f(B.sun,...F.sun),Jo(g,B,F,{seconds:performance.now()*.001,field:A,wind:Y,patches:m},0,1,2);const L=Ci(S.getZoom(),S.getCenter().lat,Oa(S,le));B.detailFreq&&g.uniform1f(B.detailFreq,L.frequency),B.detailAmount&&g.uniform1f(B.detailAmount,L.amount),B.deckFade&&g.uniform1f(B.deckFade,L.fade),B.camera&&g.uniform3f(B.camera,...mt(S,le));const X=P=>{B[P]&&g.uniform1f(B[P],F[P])};X("cloudRelief"),X("cloudDepth"),X("powder"),X("forward"),X("forwardG"),X("selfShadow"),X("selfShadowStep"),g.bindBuffer(g.ARRAY_BUFFER,c.pos),g.enableVertexAttribArray(W.pos),g.vertexAttribPointer(W.pos,2,g.FLOAT,!1,0,0),g.bindBuffer(g.ARRAY_BUFFER,c.sphere),g.enableVertexAttribArray(W.sphere),g.vertexAttribPointer(W.sphere,3,g.FLOAT,!1,0,0),g.enable(g.DEPTH_TEST),g.depthFunc(g.LEQUAL),g.depthMask(!1),g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,c.index),g.drawElements(g.TRIANGLES,_.indices.length,g.UNSIGNED_SHORT,0),g.depthMask(!0),F.animate&&S.triggerRepaint()},setOptions(C={}){const I=F;if(F={...F,...C},g){const k=(U,w)=>{if(C[w]===void 0||C[w]===I[w])return U;U?.release();const W=w==="patchUrl"||w==="fieldUrl"?{channels:1}:void 0;return F[w]?Fe(g,F[w],z,W):null};A=k(A,"fieldUrl"),m=k(m,"patchUrl")}S&&S.triggerRepaint()},getOptions:()=>({...F}),get hasField(){return!!(A?.ready||m?.ready)}}},Ca=ar,Pe=Math.PI/180,Ni=Date.UTC(2e3,0,1,12),_a=1/3600,or=e=>(e.getTime()-Ni)/864e5,Oi=(e=new Date)=>((18.697374558+24.06570982441908*or(e))%24*15%360+360)%360,Bi=e=>{const t=or(e)/36525;return{zeta:(2306.2181*t+.30188*t*t+.017998*t*t*t)*_a,z:(2306.2181*t+1.09468*t*t+.018203*t*t*t)*_a,theta:(2004.3109*t-.42665*t*t-.041833*t*t*t)*_a}},Qi=(e,t,r)=>{const{zeta:n,z:s,theta:i}=Bi(r),o=(e-s)*Pe,l=t*Pe,a=i*Pe,u=Math.cos(l)*Math.sin(o),y=Math.cos(a)*Math.cos(l)*Math.cos(o)+Math.sin(a)*Math.sin(l),x=-Math.sin(a)*Math.cos(l)*Math.cos(o)+Math.cos(a)*Math.sin(l);return{ra:Math.atan2(u,y)/Pe-n,dec:Math.asin(Math.min(1,Math.max(-1,x)))/Pe}},po=e=>(e%360+360)%360,qi=(e,t=new Date)=>{const r=Math.hypot(e[0],e[1],e[2])||1,n=Math.atan2(e[2]/r,e[0]/r)/Pe,s=Math.asin(Math.min(1,Math.max(-1,e[1]/r)))/Pe,i=Qi(po(n+Oi(t)),s,t);return{ra:po(i.ra),dec:i.dec}},Hi=`
  vec2 panoramaUV(vec3 skyDir) {
    return vec2(atan(skyDir.z, skyDir.x) / 6.28318530718 + 1.0,
                0.5 - asin(clamp(skyDir.y, -1.0, 1.0)) / 3.14159265359);
  }
`,Gi=(e=new Date)=>{const t=new Float32Array(9);return[[1,0,0],[0,1,0],[0,0,1]].forEach((n,s)=>{const{ra:i,dec:o}=qi(n,e);t[s*3]=Math.cos(o*Pe)*Math.cos(i*Pe),t[s*3+1]=Math.sin(o*Pe),t[s*3+2]=Math.cos(o*Pe)*Math.sin(i*Pe)}),t},zi=Math.PI/180,Jt=e=>{const t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},$i=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],Da=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],go=(e,t)=>{const r=$i(e,t);return Jt([e[0]-t[0]*r,e[1]-t[1]*r,e[2]-t[2]*r])},Wi=(e,t)=>{const n=t>89.98?-1:1,s=Jt(Da(He(e,t+.01*n),He(e,t-.01*n))),i=Jt(Da(He(e+.01,t),He(e-.01,t)));return{north:n===1?s:[-s[0],-s[1],-s[2]],east:i}},ji=(e,t,r,n)=>{const s=e.getCenter(),i=(e.getBearing?.()??0)*zi,o=He(s.lng,s.lat,0),l=mt(e,t),a=Jt(Da(o,l)),{north:u,east:y}=Wi(s.lng,s.lat),x=[0,1,2].map(_=>u[_]*Math.cos(i)+y[_]*Math.sin(i)),v=[0,1,2].map(_=>-u[_]*Math.sin(i)+y[_]*Math.cos(i)),R=go(x,a),p=go(v,a),f=Math.tan(r/2),b=f*n;return{origin:l,forward:a,up:R.map(_=>_*f),right:p.map(_=>_*b),upUnit:R,rightUnit:p}},Ia=(e,t)=>e*t*4,rr=[{name:"high",width:4096,height:2048,url:"/img/map/sky/milkyway-4k.webp",bytes:3680220,resident:Ia(4096,2048),decodeMs:235},{name:"standard",width:2048,height:1024,url:"/img/map/sky/milkyway-2k.webp",bytes:764012,resident:Ia(2048,1024),decodeMs:51}],nr={name:"placeholder",width:1024,height:512,url:"/img/map/sky/milkyway-1k.webp",bytes:45160,resident:Ia(1024,512),decodeMs:5},Yi=4,Xi=4,Ki=({maxTextureSize:e=0,deviceMemory:t=null,hardwareConcurrency:r=null,saveData:n=!1,effectiveType:s=null}={})=>{const i=rr.filter(a=>a.width<=e);if(i.length===0)return{tier:nr,reason:`MAX_TEXTURE_SIZE is ${e}, below every tier — falling back to the placeholder`};const o=i[i.length-1],l=i[0];return l===o?{tier:l,reason:`only ${l.name} fits MAX_TEXTURE_SIZE ${e}`}:n?{tier:o,reason:"the browser is in data-saver mode"}:s&&/^(slow-2g|2g|3g)$/.test(s)?{tier:o,reason:`the connection reports ${s}`}:Number.isFinite(t)&&t<Yi?{tier:o,reason:`the device reports ${t} GB of memory`}:Number.isFinite(r)&&r<Xi?{tier:o,reason:`the device reports ${r} cores`}:{tier:l,reason:`nothing says otherwise, and MAX_TEXTURE_SIZE is ${e}`}},Vi=(e,t=typeof navigator>"u"?null:navigator)=>{const r=t?.connection??null;return{maxTextureSize:e?.getParameter?.(e.MAX_TEXTURE_SIZE)??0,deviceMemory:t?.deviceMemory??null,hardwareConcurrency:t?.hardwareConcurrency??null,saveData:r?.saveData??!1,effectiveType:r?.effectiveType??null}},ir="tm-starfield",Zi=nr.url,Ji="/data/sky/bright-stars.bin",es=e=>{const t=Number.isFinite(e)?e:5800,r=Math.min(4e4,Math.max(1e3,t))/100,n=u=>Math.min(1,Math.max(0,u/255)),s=r<=66?255:329.698727446*Math.pow(r-60,-.1332047592),i=r<=66?99.4708025861*Math.log(r)-161.1195681661:288.1221695283*Math.pow(r-60,-.0755148492),o=r>=66?255:r<=19?0:138.5177312231*Math.log(r-10)-305.0447927307,l=[n(s),n(i),n(o)],a=Math.max(...l)||1;return l.map(u=>u/a)},ts=(e,{limitMagnitude:t=6.5}={})=>{const r=new Float32Array(e),n=Math.floor(r.length/4),s=[];for(let o=0;o<n;o++){const l=r[o*4+2];if(l>t)continue;const a=Math.pow(10,-.4*l);s.push([r[o*4],r[o*4+1],Math.pow(a,.36),...es(r[o*4+3])])}const i=new Float32Array(s.length*6);return s.forEach((o,l)=>i.set(o,l*6)),{vertices:i,count:s.length}},sr=`
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
`,as=e=>`${e.define}
attribute vec2 a_pos;
varying vec2 v_ndc;
void main() {
  v_ndc = a_pos;
  // Straight to clip space. No projection, no elevation, no prelude — that is the whole point.
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,os=e=>`${e.define}
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
${sr}
${Hi}

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
}`,rs=e=>`${e.define}
attribute vec3 a_star;       // right ascension and declination in degrees, then brightness
attribute vec3 a_colour;
uniform mat3 u_skyFrame;
uniform float u_pixelRatio;
uniform float u_starSize;
uniform float u_catalogueAmount;
varying vec3 v_colour;
${sr}

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
}`,ns=e=>`${e.define}
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
}`,is=({textureUrl:e=null,placeholderUrl:t=Zi,catalogueUrl:r=Ji,date:n=new Date,brightness:s=.55,nebula:i=.3,nebulaContrast:o=1.45,starDensity:l=210,starAmount:a=1.5,catalogueAmount:u=2.2,starSize:y=3,limitMagnitude:x=6.5,twinkle:v=0,animate:R=!1}={})=>{let p=null,f=null,b=null,_=null,S=null,g=null,c="not chosen yet",H=0;const F=new Map;let A={textureUrl:e,placeholderUrl:t,catalogueUrl:r,date:n,brightness:s,nebula:i,nebulaContrast:o,starDensity:l,starAmount:a,catalogueAmount:u,starSize:y,limitMagnitude:x,twinkle:v,animate:R};const Y=C=>{const I=C.variantName;if(F.has(I))return F.get(I);const k=Ye(f,as(C),os(C),"tm-starfield"),U=Ye(f,rs(C),ns(C),"tm-starfield-catalogue"),w=(B,Z)=>f.getUniformLocation(B,Z),W={sky:{program:k,pos:f.getAttribLocation(k,"a_pos"),uniforms:{camera:w(k,"u_camera"),forward:w(k,"u_forward"),right:w(k,"u_right"),up:w(k,"u_up"),halfExtent:w(k,"u_halfExtent"),skyFrame:w(k,"u_skyFrame"),sky:w(k,"u_sky"),globeness:w(k,"u_globeness"),brightness:w(k,"u_brightness"),nebula:w(k,"u_nebula"),nebulaContrast:w(k,"u_nebulaContrast"),starDensity:w(k,"u_starDensity"),starAmount:w(k,"u_starAmount"),twinkle:w(k,"u_twinkle"),time:w(k,"u_time")}},stars:{program:U,star:f.getAttribLocation(U,"a_star"),colour:f.getAttribLocation(U,"a_colour"),uniforms:{camera:w(U,"u_camera"),forward:w(U,"u_forward"),right:w(U,"u_right"),up:w(U,"u_up"),halfExtent:w(U,"u_halfExtent"),skyFrame:w(U,"u_skyFrame"),pixelRatio:w(U,"u_pixelRatio"),starSize:w(U,"u_starSize"),catalogueAmount:w(U,"u_catalogueAmount")}}};return F.set(I,W),W},m=()=>{if(!f)return;const C=(I,k)=>I?Fe(f,I,k,{mipmap:!1}):null;if(A.textureUrl===null){const I=Ki(Vi(f));g=I.tier,c=I.reason}else g=rr.find(I=>I.url===A.textureUrl)??{name:"explicit",url:A.textureUrl},c="the caller named a panorama";S=C(A.placeholderUrl,()=>{p?.triggerRepaint()}),_=C(g.url===A.placeholderUrl?null:g.url,()=>{S?.release(),S=null,p?.triggerRepaint()})},Q=()=>_?.ready?_:S?.ready?S:null,G=()=>{_?.release(),S?.release(),_=null,S=null},z=C=>{!C||typeof fetch!="function"||fetch(C).then(I=>{if(!I.ok)throw new Error(`${I.status} ${I.statusText}`);return I.arrayBuffer()}).then(I=>{if(!f||!b)return;const{vertices:k,count:U}=ts(I,{limitMagnitude:A.limitMagnitude});f.bindBuffer(f.ARRAY_BUFFER,b.stars),f.bufferData(f.ARRAY_BUFFER,k,f.STATIC_DRAW),H=U,p?.triggerRepaint()}).catch(I=>console.warn(`[starfield] bright star catalogue unavailable: ${I.message}`))};return{id:ir,type:"custom",renderingMode:"3d",onAdd(C,I){p=C,f=I;const k=(U,w)=>{const W=f.createBuffer();return f.bindBuffer(U,W),w&&f.bufferData(U,w,f.STATIC_DRAW),W};b={pos:k(f.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1])),index:k(f.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,2,1,3])),stars:k(f.ARRAY_BUFFER,null)},m(),z(A.catalogueUrl)},onRemove(){f&&(F.forEach(({sky:C,stars:I})=>{f.deleteProgram(C.program),f.deleteProgram(I.program)}),F.clear(),G(),b&&(f.deleteBuffer(b.pos),f.deleteBuffer(b.index),f.deleteBuffer(b.stars),b=null),p=null,f=null)},render(C,I){if(!b||A.brightness<=0)return;const k=I&&I.shaderData,U=I&&I.defaultProjectionData;if(!k||!U)return;const w=p.getCanvas(),W=w.width/Math.max(1,w.height),B=ji(p,le,I.fov||.6435,W),Z=Math.tan((I.fov||.6435)/2),L=Gi(A.date),X=U.projectionTransition,{sky:P,stars:$}=Y(k),J=({uniforms:O})=>{O.camera&&f.uniform3f(O.camera,...B.origin),O.forward&&f.uniform3f(O.forward,...B.forward),O.right&&f.uniform3f(O.right,...B.rightUnit),O.up&&f.uniform3f(O.up,...B.upUnit),O.halfExtent&&f.uniform2f(O.halfExtent,Z*W,Z),O.skyFrame&&f.uniformMatrix3fv(O.skyFrame,!1,L)};f.useProgram(P.program),J(P),P.uniforms.globeness&&f.uniform1f(P.uniforms.globeness,X),P.uniforms.brightness&&f.uniform1f(P.uniforms.brightness,A.brightness);const K=Q();P.uniforms.nebula&&f.uniform1f(P.uniforms.nebula,K?A.nebula:0),P.uniforms.nebulaContrast&&f.uniform1f(P.uniforms.nebulaContrast,A.nebulaContrast),P.uniforms.starDensity&&f.uniform1f(P.uniforms.starDensity,A.starDensity),P.uniforms.starAmount&&f.uniform1f(P.uniforms.starAmount,A.starAmount),P.uniforms.twinkle&&f.uniform1f(P.uniforms.twinkle,A.twinkle),P.uniforms.time&&f.uniform1f(P.uniforms.time,A.animate?performance.now()*.001:0),K&&P.uniforms.sky&&(f.activeTexture(f.TEXTURE0),f.bindTexture(f.TEXTURE_2D,K.texture),f.uniform1i(P.uniforms.sky,0)),f.bindBuffer(f.ARRAY_BUFFER,b.pos),f.enableVertexAttribArray(P.pos),f.vertexAttribPointer(P.pos,2,f.FLOAT,!1,0,0),f.disable(f.DEPTH_TEST),f.depthMask(!1),f.bindBuffer(f.ELEMENT_ARRAY_BUFFER,b.index),f.drawElements(f.TRIANGLES,6,f.UNSIGNED_SHORT,0),H>0&&X>.5&&A.catalogueAmount>0&&(f.useProgram($.program),J($),$.uniforms.pixelRatio&&f.uniform1f($.uniforms.pixelRatio,typeof devicePixelRatio=="number"?devicePixelRatio:1),$.uniforms.starSize&&f.uniform1f($.uniforms.starSize,A.starSize),$.uniforms.catalogueAmount&&f.uniform1f($.uniforms.catalogueAmount,A.catalogueAmount*A.brightness),f.bindBuffer(f.ARRAY_BUFFER,b.stars),f.enableVertexAttribArray($.star),f.vertexAttribPointer($.star,3,f.FLOAT,!1,24,0),f.enableVertexAttribArray($.colour),f.vertexAttribPointer($.colour,3,f.FLOAT,!1,24,12),f.drawArrays(f.POINTS,0,H),f.disableVertexAttribArray($.star),f.disableVertexAttribArray($.colour)),f.enable(f.DEPTH_TEST),f.depthMask(!0),A.animate&&A.twinkle>0&&p.triggerRepaint()},setOptions(C={}){const I=A.textureUrl,k=A.catalogueUrl;A={...A,...C},C.textureUrl!==void 0&&C.textureUrl!==I&&(G(),m()),C.catalogueUrl!==void 0&&C.catalogueUrl!==k&&(H=0,z(C.catalogueUrl)),p?.triggerRepaint()},getOptions:()=>({...A}),get hasSky(){return Q()!==null},get starCount(){return H},get skyTier(){return g?{...g,reason:c}:null}}},ss=ir,tt=Math.PI/180,ls=Date.UTC(2e3,0,1,12),cs=149597870700,us=6957e5,lr=e=>(e.getTime()-ls)/864e5,cr=(e=new Date)=>{const t=lr(e),r=(280.46+.9856474*t)%360,n=(357.528+.9856003*t)%360*tt,s=(r+1.915*Math.sin(n)+.02*Math.sin(2*n))*tt,i=(23.439-4e-7*t)*tt,o=Math.asin(Math.sin(i)*Math.sin(s))/tt;let l=Math.atan2(Math.cos(i)*Math.sin(s),Math.cos(s))/tt;l<0&&(l+=360);let a=r-l;a>180&&(a-=360),a<-180&&(a+=360),a*=4;const u=(1.00014-.01671*Math.cos(n)-14e-5*Math.cos(2*n))*cs;return{declination:o,equationOfTime:a,distance:u}},ur=(e=new Date)=>cr(e).distance,hs=(e=new Date)=>Math.atan(us/ur(e)),ds=(e=new Date)=>{const t=(357.528+.9856003*lr(e))%360*tt;return(1.00014-.01671*Math.cos(t)-14e-5*Math.cos(2*t))*149597870700},fs=(e=new Date)=>{const{declination:t,equationOfTime:r}=cr(e);let s=-15*(e.getUTCHours()+e.getUTCMinutes()/60+e.getUTCSeconds()/3600-12+r/60);return s=(s+540)%360-180,{lng:s,lat:t}},Ot=(e=new Date)=>{const{lng:t,lat:r}=fs(e),n=r*tt,s=t*tt;return[Math.cos(n)*Math.cos(s),Math.sin(n),Math.cos(n)*Math.sin(s)]},hr="tm-sun",yo=63710088e-1,ms=18,ps=(e,t,r)=>{const n=Math.abs(e),s=t,i=r;if(s<=0)return 0;if(n>=s+i)return 1;if(n<=i-s)return 0;if(n<=s-i)return 1-i*i/(s*s);const o=s*s*Math.acos(kt((n*n+s*s-i*i)/(2*n*s),-1,1))+i*i*Math.acos(kt((n*n+i*i-s*s)/(2*n*i),-1,1))-.5*Math.sqrt(Math.max(0,(-n+s+i)*(n+s-i)*(n-s+i)*(n+s+i)));return kt(1-o/(Math.PI*s*s),0,1)},bo={u1:.93,u2:-.23},wo=e=>e<0?`(${e.toFixed(4)})`:e.toFixed(4),gs=`
  float limbDarkening(float rho) {
    float mu = sqrt(max(1.0 - rho * rho, 0.0));
    float t = 1.0 - mu;
    return max(1.0 - ${wo(bo.u1)} * t - ${wo(bo.u2)} * t * t, 0.0);
  }
`,ys=new Float32Array([-1,-1,1,-1,-1,1,1,1]),vo=new Uint16Array([0,1,2,1,3,2]),bs=e=>`${e.vertexShaderPrelude}
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
}`,ws=()=>`precision highp float;
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
${Yo}
${gs}

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
}`,vs=({date:e=new Date,haloScale:t=ms,haloStrength:r=1,discGain:n=1.15,brightness:s=1,coreColour:i=[1,.985,.95],haloColour:o=[1,.65,.2]}={})=>{let l=null,a=null,u=null,y={u:.5,v:.5,onScreen:!1,visible:0};const x=new Map;let v={date:e,haloScale:t,haloStrength:r,discGain:n,brightness:s,coreColour:i,haloColour:o};const R=p=>{const f=p.variantName;if(x.has(f))return x.get(f);const b=Ye(a,bs(p),ws(),"tm-sun",{es300:!0}),_={program:b,attribs:{corner:a.getAttribLocation(b,"a_corner")},uniforms:{centre:a.getUniformLocation(b,"a_centre"),elevationGlobe:a.getUniformLocation(b,"a_elevation_globe"),elevationMercator:a.getUniformLocation(b,"a_elevation_mercator"),size:a.getUniformLocation(b,"u_size"),camera:a.getUniformLocation(b,"u_camera"),forward:a.getUniformLocation(b,"u_forward"),right:a.getUniformLocation(b,"u_right"),up:a.getUniformLocation(b,"u_up"),glowAngle:a.getUniformLocation(b,"u_glow_angle"),discFraction:a.getUniformLocation(b,"u_disc_fraction"),discGain:a.getUniformLocation(b,"u_disc_gain"),visible:a.getUniformLocation(b,"u_visible"),brightness:a.getUniformLocation(b,"u_brightness"),haloStrength:a.getUniformLocation(b,"u_halo_strength"),coreColour:a.getUniformLocation(b,"u_core_colour"),haloColour:a.getUniformLocation(b,"u_halo_colour"),matrix:a.getUniformLocation(b,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(b,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(b,"u_projection_clipping_plane"),transition:a.getUniformLocation(b,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(b,"u_projection_fallback_matrix")}};return x.set(f,_),_};return{id:hr,type:"custom",renderingMode:"3d",onAdd(p,f){l=p,a=f;const b=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,b),a.bufferData(a.ARRAY_BUFFER,ys,a.STATIC_DRAW);const _=a.createBuffer();a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,_),a.bufferData(a.ELEMENT_ARRAY_BUFFER,vo,a.STATIC_DRAW),u={corner:b,index:_}},onRemove(){a&&(x.forEach(({program:p})=>a.deleteProgram(p)),x.clear(),u&&(a.deleteBuffer(u.corner),a.deleteBuffer(u.index),u=null),l=null,a=null)},render(p,f){if(!u||v.brightness<=0)return;const b=f&&f.shaderData,_=f&&f.defaultProjectionData;if(!b||!_)return;const{program:S,attribs:g,uniforms:c}=R(b);a.useProgram(S),c.matrix&&a.uniformMatrix4fv(c.matrix,!1,_.mainMatrix),c.tileMercatorCoords&&a.uniform4f(c.tileMercatorCoords,..._.tileMercatorCoords),c.clippingPlane&&a.uniform4f(c.clippingPlane,..._.clippingPlane),c.transition&&a.uniform1f(c.transition,_.projectionTransition),c.fallbackMatrix&&a.uniformMatrix4fv(c.fallbackMatrix,!1,_.fallbackMatrix);const H=mt(l,le),F=ur(v.date),A=He(...Es(Ot(v.date)),F-yo),Y=_o([A[0]-H[0],A[1]-H[1],A[2]-H[2]]),m=Math.hypot(...H),Q=Math.max(.25*(m-1),.002),G=[H[0]+Y[0]*Q,H[1]+Y[1]*Q,H[2]+Y[2]*Q],z=Math.hypot(...G),C=Math.asin(G[1]/z)*180/Math.PI,I=Math.atan2(G[2],G[0])*180/Math.PI,k=(z-1)*yo,U=le.MercatorCoordinate.fromLngLat([I,C],0);c.centre&&a.uniform2f(c.centre,U.x,U.y),c.elevationGlobe&&a.uniform1f(c.elevationGlobe,k),c.elevationMercator&&a.uniform1f(c.elevationMercator,le.MercatorCoordinate.fromLngLat([I,C],k).z);const w=hs(v.date),W=w*v.haloScale,B=(f.fov||.6435)/2,Z=l.getCanvas(),L=Math.tan(W)/Math.tan(B);c.size&&a.uniform2f(c.size,L*(Z.height/Z.width),L),c.glowAngle&&a.uniform1f(c.glowAngle,W),c.discFraction&&a.uniform1f(c.discFraction,1/v.haloScale),c.discGain&&a.uniform1f(c.discGain,v.discGain);const X=[-H[0]/m,-H[1]/m,-H[2]/m],P=Math.acos(kt(xs(X,Y),-1,1)),$=Math.asin(kt(1/m,-1,1)),J=ps(P,w,$),K=Y,O=_o(xo([0,1,0],K)),ke=xo(K,O);c.forward&&a.uniform3f(c.forward,...K),c.right&&a.uniform3f(c.right,...O),c.up&&a.uniform3f(c.up,...ke),c.camera&&a.uniform3f(c.camera,...H),c.visible&&a.uniform1f(c.visible,J),c.brightness&&a.uniform1f(c.brightness,v.brightness),c.haloStrength&&a.uniform1f(c.haloStrength,v.haloStrength),c.coreColour&&a.uniform3f(c.coreColour,...v.coreColour),c.haloColour&&a.uniform3f(c.haloColour,...v.haloColour),a.bindBuffer(a.ARRAY_BUFFER,u.corner),a.enableVertexAttribArray(g.corner),a.vertexAttribPointer(g.corner,2,a.FLOAT,!1,0,0),a.disable(a.DEPTH_TEST),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,u.index),a.drawElements(a.TRIANGLES,vo.length,a.UNSIGNED_SHORT,0),a.depthMask(!0),y=_s(_.mainMatrix,U,z,J)},setOptions(p={}){v={...v,...p},l?.triggerRepaint()},getOptions:()=>({...v}),get screenPosition(){return y}}},_s=(e,t,r,n)=>{const s=t.x*2*Math.PI+Math.PI,i=2*Math.atan(Math.exp(Math.PI-t.y*2*Math.PI))-Math.PI/2,o=Math.cos(i),l=[Math.sin(s)*o*r,Math.sin(i)*r,Math.cos(s)*o*r,1],a=[0,1,2,3].map(x=>e[x]*l[0]+e[4+x]*l[1]+e[8+x]*l[2]+e[12+x]*l[3]);if(!(a[3]>0))return{u:.5,v:.5,onScreen:!1,visible:0};const u=a[0]/a[3]*.5+.5,y=a[1]/a[3]*.5+.5;return{u,v:y,onScreen:u>-.5&&u<1.5&&y>-.5&&y<1.5,visible:n}},kt=(e,t,r)=>Math.min(r,Math.max(t,e)),xs=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],_o=e=>{const t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},xo=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Es=([e,t,r])=>[Math.atan2(r,e)*180/Math.PI,Math.asin(kt(t,-1,1))*180/Math.PI],Ts=hr,dr="tm-moon",ea=63710088e-1,ks=1737400,ft=Math.PI/180,As=Date.UTC(2e3,0,1,12),Ss=Date.UTC(1999,11,31,0),se=e=>Math.sin(e*ft),ge=e=>Math.cos(e*ft),fr=(e=new Date)=>{const t=(e.getTime()-As)/864e5,r=(e.getTime()-Ss)/864e5,n=125.1228-.0529538083*r,s=5.1454,i=318.0634+.1643573223*r,o=60.2666,l=.0549,a=115.3654+13.0649929509*r;let u=a+l*180/Math.PI*se(a)*(1+l*ge(a));for(let w=0;w<3;w++)u-=(u-l*180/Math.PI*se(u)-a)/(1-l*ge(u));const y=o*(ge(u)-l),x=o*(Math.sqrt(1-l*l)*se(u)),v=Math.atan2(x,y)/ft,R=Math.sqrt(y*y+x*x);let p=R*(ge(n)*ge(v+i)-se(n)*se(v+i)*ge(s)),f=R*(se(n)*ge(v+i)+ge(n)*se(v+i)*ge(s)),b=R*(se(v+i)*se(s));const _=356.047+.9856002585*r,S=282.9404+470935e-10*r+_,g=n+i+a,c=g-S,H=g-n;let F=Math.atan2(f,p)/ft,A=Math.atan2(b,Math.hypot(p,f))/ft;F+=-1.274*se(a-2*c)+.658*se(2*c)-.186*se(_),A+=-.173*se(H-2*c);const Y=(R-.58*ge(a-2*c)-.46*ge(2*c))*ea,m=23.4393-3563e-10*t,Q=ge(F)*ge(A),G=se(F)*ge(A)*ge(m)-se(A)*se(m),z=se(F)*ge(A)*se(m)+se(A)*ge(m),C=Math.atan2(G,Q)/ft,I=Math.atan2(z,Math.hypot(Q,G))/ft,k=(18.697374558+24.06570982441908*t)%24;let U=C-k*15;return U=(U%360+540)%360-180,{lng:U,lat:I,distance:Y}},mr=(e=new Date)=>{const{lng:t,lat:r,distance:n}=fr(e);return He(t,r,n-ea)},Ls=new Float32Array([-1,-1,1,-1,-1,1,1,1]),Eo=new Uint16Array([0,1,2,1,3,2]),Ms=e=>`${e.vertexShaderPrelude}
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
}`,Rs=()=>`precision highp float;
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
${na}

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
}`,Ps=({date:e=new Date,sun:t=[1,0,0],albedoUrl:r=null,sizeScale:n=1,brightness:s=1,glow:i=.4,glowExtent:o=1.8}={})=>{let l=null,a=null,u=null,y=null,x=!1;const v=new Map;let R={date:e,sun:t,albedoUrl:r,sizeScale:n,brightness:s,glow:i,glowExtent:o};const p=b=>{const _=b.variantName;if(v.has(_))return v.get(_);const S=Ye(a,Ms(b),Rs(),"tm-moon",{es300:!0}),g={program:S,attribs:{corner:a.getAttribLocation(S,"a_corner")},uniforms:{centre:a.getUniformLocation(S,"a_centre"),elevationGlobe:a.getUniformLocation(S,"a_elevation_globe"),elevationMercator:a.getUniformLocation(S,"a_elevation_mercator"),size:a.getUniformLocation(S,"u_size"),albedo:a.getUniformLocation(S,"u_albedo"),hasAlbedo:a.getUniformLocation(S,"u_hasAlbedo"),sun:a.getUniformLocation(S,"u_sun"),right:a.getUniformLocation(S,"u_right"),up:a.getUniformLocation(S,"u_up"),forward:a.getUniformLocation(S,"u_forward"),brightness:a.getUniformLocation(S,"u_brightness"),discEdge:a.getUniformLocation(S,"u_discEdge"),glow:a.getUniformLocation(S,"u_glow"),glowExtent:a.getUniformLocation(S,"u_glowExtent"),matrix:a.getUniformLocation(S,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(S,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(S,"u_projection_clipping_plane"),transition:a.getUniformLocation(S,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(S,"u_projection_fallback_matrix")}};return v.set(_,g),g},f=b=>{const _=new Image;_.crossOrigin="anonymous",_.onload=()=>{a&&(y=y||a.createTexture(),a.bindTexture(a.TEXTURE_2D,y),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,_),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.REPEAT),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),x=!0,l?.triggerRepaint())},_.src=b};return{id:dr,type:"custom",renderingMode:"3d",onAdd(b,_){l=b,a=_;const S=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,S),a.bufferData(a.ARRAY_BUFFER,Ls,a.STATIC_DRAW);const g=a.createBuffer();a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,g),a.bufferData(a.ELEMENT_ARRAY_BUFFER,Eo,a.STATIC_DRAW),u={corner:S,index:g},R.albedoUrl&&f(R.albedoUrl)},onRemove(){a&&(v.forEach(({program:b})=>a.deleteProgram(b)),v.clear(),y&&(a.deleteTexture(y),y=null,x=!1),u&&(a.deleteBuffer(u.corner),a.deleteBuffer(u.index),u=null),l=null,a=null)},render(b,_){if(!u||R.brightness<=0)return;const S=_&&_.shaderData,g=_&&_.defaultProjectionData;if(!S||!g)return;const{lng:c,lat:H,distance:F}=fr(R.date),{program:A,attribs:Y,uniforms:m}=p(S);a.useProgram(A),m.matrix&&a.uniformMatrix4fv(m.matrix,!1,g.mainMatrix),m.tileMercatorCoords&&a.uniform4f(m.tileMercatorCoords,...g.tileMercatorCoords),m.clippingPlane&&a.uniform4f(m.clippingPlane,...g.clippingPlane),m.transition&&a.uniform1f(m.transition,g.projectionTransition),m.fallbackMatrix&&a.uniformMatrix4fv(m.fallbackMatrix,!1,g.fallbackMatrix);const Q=mt(l,le),G=He(c,H,F-ea),z=To([G[0]-Q[0],G[1]-Q[1],G[2]-Q[2]]),I=Math.hypot(...Q)+1.2,k=[Q[0]+z[0]*I,Q[1]+z[1]*I,Q[2]+z[2]*I],U=Math.hypot(...k),w=Math.asin(k[1]/U)*180/Math.PI,W=Math.atan2(k[2],k[0])*180/Math.PI,B=(U-1)*ea,Z=le.MercatorCoordinate.fromLngLat([W,w],0);m.centre&&a.uniform2f(m.centre,Z.x,Z.y),m.elevationGlobe&&a.uniform1f(m.elevationGlobe,B),m.elevationMercator&&a.uniform1f(m.elevationMercator,le.MercatorCoordinate.fromLngLat([W,w],B).z);const L=Math.atan(ks*R.sizeScale/F),X=(_.fov||.6435)/2,P=l.getCanvas(),$=Math.tan(L)/Math.tan(X),K=1+(R.glow>0?Math.max(0,R.glowExtent):0),O=$*K;m.size&&a.uniform2f(m.size,O*(P.height/P.width),O),m.discEdge&&a.uniform1f(m.discEdge,1/K);const ke=z,fe=To(ko([0,1,0],ke)),ce=ko(ke,fe);m.forward&&a.uniform3f(m.forward,...ke),m.right&&a.uniform3f(m.right,...fe),m.up&&a.uniform3f(m.up,...ce),m.sun&&a.uniform3f(m.sun,...R.sun),m.brightness&&a.uniform1f(m.brightness,R.brightness),m.glow&&a.uniform1f(m.glow,R.glow),m.glowExtent&&a.uniform1f(m.glowExtent,R.glowExtent),m.hasAlbedo&&a.uniform1f(m.hasAlbedo,x?1:0),x&&m.albedo&&(a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,y),a.uniform1i(m.albedo,0)),a.bindBuffer(a.ARRAY_BUFFER,u.corner),a.enableVertexAttribArray(Y.corner),a.vertexAttribPointer(Y.corner,2,a.FLOAT,!1,0,0),a.enable(a.DEPTH_TEST),a.depthFunc(a.LEQUAL),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,u.index),a.drawElements(a.TRIANGLES,Eo.length,a.UNSIGNED_SHORT,0),a.depthMask(!0)},setOptions(b={}){const _=R.albedoUrl;R={...R,...b},b.albedoUrl!==void 0&&b.albedoUrl!==_&&(x=!1,b.albedoUrl&&f(b.albedoUrl)),l?.triggerRepaint()},getOptions:()=>({...R}),get hasAlbedo(){return x}}},To=e=>{const t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},ko=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Cs=dr,Ds=6957e5,Is=1737400,Us=63710088e-1,Fs=Is/Us,Ns=(e,t,r)=>Math.min(r,Math.max(t,e)),Os=(e=new Date)=>Math.asin(Ds/ds(e)),Bs=.035,Qs=(e=new Date,t=null,r=null)=>{const n=t||Ot(e),s=r||mr(e),i=Math.hypot(...s);return Math.acos(Ns((n[0]*s[0]+n[1]*s[1]+n[2]*s[2])/i,-1,1))<Bs},qs=`
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
`,pr="tm-daylight",Ut={field:0,wind:1,relief:2,lights:3,patches:4},Hs=e=>`#version 300 es
${e.define}
${e.vertexShaderPrelude}
in vec2 a_pos;
in vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
out vec3 v_sphere;
${ra}
void main() {
  v_sphere = a_sphere;
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,Gs=()=>`#version 300 es
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
${na}
${Xo}
${Na}
${er}
${tr}
${Si}
${qs}
// The same field, wind and clock the deck in clouds.js draws itself from.
${Vo}

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
    float remaining = eclipseLight(normal, sunDir, u_moon, u_sunRadius, ${Fs.toFixed(8)});
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
}`,zs=({sun:e=[1,0,0],nightDarkness:t=.965,lightsUrl:r=null,lightsAmount:n=0,nightColour:s=[.02,.035,.07],twilightColour:i=[.62,.32,.16],twilightCool:o=[.1,.15,.28],twilightStrength:l=.55,reliefUrl:a=null,reliefWidth:u=8192,reliefPower:y=1.5,cloudShadow:x=.5,shadowSoftness:v=.75,eclipse:R=!0,date:p=null,fieldUrl:f=null,patchUrl:b=null,windUrl:_=null,windAmount:S=1,windScale:g=.06,windRate:c=.05,driftRate:H=4e-4,animate:F=!0}={})=>{const A=oa();let Y=null,m=null,Q=null,G=null,z=null,C=null,I=null,k=null;const U=new Map;let w={sun:e,nightDarkness:t,lightsUrl:r,lightsAmount:n,nightColour:s,twilightColour:i,twilightCool:o,twilightStrength:l,reliefUrl:a,reliefWidth:u,reliefPower:y,cloudShadow:x,eclipse:R,date:p,shadowSoftness:v,fieldUrl:f,patchUrl:b,windUrl:_,windAmount:S,windScale:g,windRate:c,driftRate:H,animate:F};const W=L=>{const X=L.variantName;if(U.has(X))return U.get(X);const P=Ye(m,Hs(L),Gs(),"tm-daylight"),$={program:P,attribs:{pos:m.getAttribLocation(P,"a_pos"),sphere:m.getAttribLocation(P,"a_sphere")},uniforms:{elevationGlobe:m.getUniformLocation(P,"a_elevation_globe"),elevationMercator:m.getUniformLocation(P,"a_elevation_mercator"),sun:m.getUniformLocation(P,"u_sun"),camera:m.getUniformLocation(P,"u_camera"),globeness:m.getUniformLocation(P,"u_globeness"),nightDarkness:m.getUniformLocation(P,"u_nightDarkness"),nightColour:m.getUniformLocation(P,"u_nightColour"),twilightColour:m.getUniformLocation(P,"u_twilightColour"),twilightCool:m.getUniformLocation(P,"u_twilightCool"),twilightStrength:m.getUniformLocation(P,"u_twilightStrength"),lights:m.getUniformLocation(P,"u_lights"),lightsAmount:m.getUniformLocation(P,"u_lightsAmount"),relief:m.getUniformLocation(P,"u_relief"),reliefPower:m.getUniformLocation(P,"u_reliefPower"),cloudShadow:m.getUniformLocation(P,"u_cloudShadow"),shadowSoftness:m.getUniformLocation(P,"u_shadowSoftness"),cloudAltitude:m.getUniformLocation(P,"u_cloudAltitude"),moon:m.getUniformLocation(P,"u_moon"),sunRadius:m.getUniformLocation(P,"u_sunRadius"),...Object.fromEntries(Zo.map(J=>[J,m.getUniformLocation(P,`u_${J}`)])),matrix:m.getUniformLocation(P,"u_projection_matrix"),tileMercatorCoords:m.getUniformLocation(P,"u_projection_tile_mercator_coords"),clippingPlane:m.getUniformLocation(P,"u_projection_clipping_plane"),transition:m.getUniformLocation(P,"u_projection_transition"),fallbackMatrix:m.getUniformLocation(P,"u_projection_fallback_matrix")}};return U.set(X,$),$},B=()=>Y?.triggerRepaint(),Z=(L,X,P,$)=>{!X?.ready||!L[P]||(m.activeTexture(m.TEXTURE0+$),m.bindTexture(m.TEXTURE_2D,X.texture),m.uniform1i(L[P],$))};return{id:pr,type:"custom",renderingMode:"3d",onAdd(L,X){Y=L,m=X;const P=($,J)=>{const K=m.createBuffer();return m.bindBuffer($,K),m.bufferData($,J,m.STATIC_DRAW),K};Q={pos:P(m.ARRAY_BUFFER,A.positions),sphere:P(m.ARRAY_BUFFER,A.spheres),index:P(m.ELEMENT_ARRAY_BUFFER,A.indices)},w.lightsUrl&&(G=Fe(m,w.lightsUrl,B)),w.reliefUrl&&(z=Fe(m,w.reliefUrl,B)),w.fieldUrl&&(C=Fe(m,w.fieldUrl,B,{channels:1})),w.windUrl&&(I=Fe(m,w.windUrl,B)),w.patchUrl&&(k=Fe(m,w.patchUrl,B,{channels:1}))},onRemove(){m&&(U.forEach(({program:L})=>m.deleteProgram(L)),U.clear(),G?.release(),G=null,z?.release(),z=null,C?.release(),C=null,I?.release(),I=null,k?.release(),k=null,Q&&(m.deleteBuffer(Q.pos),m.deleteBuffer(Q.sphere),m.deleteBuffer(Q.index),Q=null),Y=null,m=null)},render(L,X){if(!Q||w.nightDarkness<=0)return;const P=X&&X.shaderData,$=X&&X.defaultProjectionData;if(!P||!$)return;const{program:J,attribs:K,uniforms:O}=W(P);m.useProgram(J),O.matrix&&m.uniformMatrix4fv(O.matrix,!1,$.mainMatrix),O.tileMercatorCoords&&m.uniform4f(O.tileMercatorCoords,...$.tileMercatorCoords),O.clippingPlane&&m.uniform4f(O.clippingPlane,...$.clippingPlane),O.transition&&m.uniform1f(O.transition,$.projectionTransition),O.fallbackMatrix&&m.uniformMatrix4fv(O.fallbackMatrix,!1,$.fallbackMatrix);const ke=Y.getCenter().lat,fe=0;O.elevationGlobe&&m.uniform1f(O.elevationGlobe,fe),O.elevationMercator&&m.uniform1f(O.elevationMercator,le.MercatorCoordinate.fromLngLat([0,ke],fe).z),O.sun&&m.uniform3f(O.sun,...w.sun),O.camera&&m.uniform3f(O.camera,...mt(Y,le)),O.globeness&&m.uniform1f(O.globeness,$.projectionTransition),O.nightDarkness&&m.uniform1f(O.nightDarkness,w.nightDarkness),O.nightColour&&m.uniform3f(O.nightColour,...w.nightColour),O.twilightColour&&m.uniform3f(O.twilightColour,...w.twilightColour),O.twilightCool&&m.uniform3f(O.twilightCool,...w.twilightCool),O.twilightStrength&&m.uniform1f(O.twilightStrength,w.twilightStrength),O.lightsAmount&&m.uniform1f(O.lightsAmount,G?.ready?w.lightsAmount:0);const ce=z?.ready?Pi(Y.getZoom(),ke,w.reliefWidth).strength:0;O.reliefPower&&m.uniform1f(O.reliefPower,w.reliefPower*ce),O.cloudShadow&&m.uniform1f(O.cloudShadow,w.cloudShadow),O.shadowSoftness&&m.uniform1f(O.shadowSoftness,w.shadowSoftness),O.cloudAltitude&&m.uniform1f(O.cloudAltitude,Zt/aa);const Ae=w.eclipse?w.date:null,Ce=Ae&&Qs(Ae)?mr(Ae):null;O.sunRadius&&m.uniform1f(O.sunRadius,Ce?Os(Ae):0),Ce&&O.moon&&m.uniform3f(O.moon,...Ce),Jo(m,O,w,{seconds:performance.now()*.001,field:C,wind:I,patches:k},Ut.field,Ut.wind,Ut.patches),Z(O,z,"relief",Ut.relief),Z(O,G,"lights",Ut.lights),m.bindBuffer(m.ARRAY_BUFFER,Q.pos),m.enableVertexAttribArray(K.pos),m.vertexAttribPointer(K.pos,2,m.FLOAT,!1,0,0),m.bindBuffer(m.ARRAY_BUFFER,Q.sphere),m.enableVertexAttribArray(K.sphere),m.vertexAttribPointer(K.sphere,3,m.FLOAT,!1,0,0),m.disable(m.DEPTH_TEST),m.depthMask(!1),m.bindBuffer(m.ELEMENT_ARRAY_BUFFER,Q.index),m.drawElements(m.TRIANGLES,A.indices.length,m.UNSIGNED_SHORT,0),m.enable(m.DEPTH_TEST),m.depthMask(!0),w.animate&&(C?.ready||k?.ready)&&w.cloudShadow>0&&Y.triggerRepaint()},setOptions(L={}){const X=w;if(w={...w,...L},!m){Y?.triggerRepaint();return}const P=($,J)=>{if(L[J]===void 0||L[J]===X[J])return $;$?.release();const K=J==="patchUrl"||J==="fieldUrl"?{channels:1}:void 0;return w[J]?Fe(m,w[J],B,K):null};G=P(G,"lightsUrl"),z=P(z,"reliefUrl"),C=P(C,"fieldUrl"),I=P(I,"windUrl"),k=P(k,"patchUrl"),Y?.triggerRepaint()},getOptions:()=>({...w}),get hasLights(){return!!G?.ready},get hasRelief(){return!!z?.ready}}},$s=pr,gr="tm-atmosphere",Ws=63710088e-1,xa=2e5,js=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_pos;
attribute vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
varying vec3 v_sphere;
${ra}
void main() {
  v_sphere = a_sphere;
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,Ys=()=>`precision highp float;
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

${Yo}

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
}`,Xs=({strength:e=1,sun:t=[.4,.5,.75],dayColour:r=[.32,.55,1],duskColour:n=[1,.45,.18],forwardScatter:s=.35,scatterG:i=.6}={})=>{const o=oa();let l=null,a=null,u=null;const y=new Map;let x={strength:e,sun:t,dayColour:r,duskColour:n,forwardScatter:s,scatterG:i};const v=R=>{const p=R.variantName;if(y.has(p))return y.get(p);const f=Ye(a,js(R),Ys(),"tm-atmosphere",{es300:!0}),b={program:f,attribs:{pos:a.getAttribLocation(f,"a_pos"),sphere:a.getAttribLocation(f,"a_sphere")},uniforms:{elevationGlobe:a.getUniformLocation(f,"a_elevation_globe"),elevationMercator:a.getUniformLocation(f,"a_elevation_mercator"),camera:a.getUniformLocation(f,"u_camera"),sun:a.getUniformLocation(f,"u_sun"),top:a.getUniformLocation(f,"u_top"),strength:a.getUniformLocation(f,"u_strength"),dayColour:a.getUniformLocation(f,"u_dayColour"),duskColour:a.getUniformLocation(f,"u_duskColour"),forward:a.getUniformLocation(f,"u_forward"),scatterG:a.getUniformLocation(f,"u_scatter_g"),matrix:a.getUniformLocation(f,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(f,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(f,"u_projection_clipping_plane"),transition:a.getUniformLocation(f,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(f,"u_projection_fallback_matrix")}};return y.set(p,b),b};return{id:gr,type:"custom",renderingMode:"3d",onAdd(R,p){l=R,a=p;const f=(b,_)=>{const S=a.createBuffer();return a.bindBuffer(b,S),a.bufferData(b,_,a.STATIC_DRAW),S};u={pos:f(a.ARRAY_BUFFER,o.positions),sphere:f(a.ARRAY_BUFFER,o.spheres),index:f(a.ELEMENT_ARRAY_BUFFER,o.indices)}},onRemove(){a&&(y.forEach(({program:R})=>a.deleteProgram(R)),y.clear(),u&&(a.deleteBuffer(u.pos),a.deleteBuffer(u.sphere),a.deleteBuffer(u.index),u=null),l=null,a=null)},render(R,p){if(!u||x.strength<=0)return;const f=p&&p.shaderData,b=p&&p.defaultProjectionData;if(!f||!b)return;const{program:_,attribs:S,uniforms:g}=v(f);a.useProgram(_),g.matrix&&a.uniformMatrix4fv(g.matrix,!1,b.mainMatrix),g.tileMercatorCoords&&a.uniform4f(g.tileMercatorCoords,...b.tileMercatorCoords),g.clippingPlane&&a.uniform4f(g.clippingPlane,...b.clippingPlane),g.transition&&a.uniform1f(g.transition,b.projectionTransition),g.fallbackMatrix&&a.uniformMatrix4fv(g.fallbackMatrix,!1,b.fallbackMatrix);const c=l.getCenter().lat;g.elevationGlobe&&a.uniform1f(g.elevationGlobe,xa),g.elevationMercator&&a.uniform1f(g.elevationMercator,le.MercatorCoordinate.fromLngLat([0,c],xa).z);const H=mt(l,le);g.camera&&a.uniform3f(g.camera,H[0],H[1],H[2]),g.sun&&a.uniform3f(g.sun,...x.sun),g.top&&a.uniform1f(g.top,1+xa/Ws),g.strength&&a.uniform1f(g.strength,x.strength),g.dayColour&&a.uniform3f(g.dayColour,...x.dayColour),g.duskColour&&a.uniform3f(g.duskColour,...x.duskColour),g.forward&&a.uniform1f(g.forward,x.forwardScatter),g.scatterG&&a.uniform1f(g.scatterG,x.scatterG),a.bindBuffer(a.ARRAY_BUFFER,u.pos),a.enableVertexAttribArray(S.pos),a.vertexAttribPointer(S.pos,2,a.FLOAT,!1,0,0),a.bindBuffer(a.ARRAY_BUFFER,u.sphere),a.enableVertexAttribArray(S.sphere),a.vertexAttribPointer(S.sphere,3,a.FLOAT,!1,0,0),a.enable(a.DEPTH_TEST),a.depthFunc(a.LEQUAL),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,u.index),a.drawElements(a.TRIANGLES,o.indices.length,a.UNSIGNED_SHORT,0),a.depthMask(!0)},setOptions(R={}){x={...x,...R},l?.triggerRepaint()},getOptions:()=>({...x})}},Ks=gr,Vs=32,yr=[{width:8192,height:4096,url:"/timemap/ocean-sdf-8192.webp"},{width:4096,height:2048,url:"/timemap/ocean-sdf-4096.webp"}],Zs=`
  float oceanDistanceKm(float stored, float rangeKm) {
    return (stored * 2.0 - 1.0) * rangeKm;
  }
`,br="tm-ocean",Js=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_pos;
attribute vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
varying vec3 v_sphere;
${ra}
void main() {
  v_sphere = a_sphere;
  // Sea level: the glint belongs on the water, not above it.
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,el=()=>`precision highp float;
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
${na}
${jo}
${Xo}
${Na}
${Zs}

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
}`,tl=(e,{fadeInAbove:t=9e5,fadeOutBelow:r=18e4}={})=>{const n=Math.max(0,Math.min(1,(e-r)/(t-r)));return n*n*(3-2*n)},al=(e,t,r=.8)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e);return Math.max(r,n*1.5/1e3)},ol=40075,rl=e=>Number.isFinite(e)&&e>0?ol/e/2:.8,Ao=(e,t=yr)=>t.find(r=>r.width<=e&&r.height<=e)||null,nl=({opacity:e=1,strength:t=.9,roughness:r=.55,windPatch:n=.3,windScale:s=14,edgeRemap:i=0,sun:o=[.4,.5,.75],water:l=1,absorption:a=[.45,.06,.02],scatter:u=[.12,.265,.43],bottom:y=[.42,.4,.33],sky:x=[.34,.5,.76],shelfKm:v=22,shelfDepthM:R=16,shoreSoftnessKm:p=.8,fadeInAbove:f=9e5,fadeOutBelow:b=18e4,sources:_=yr}={})=>{const S=oa();let g=null,c=null,H=null,F=null,A=null,Y=!1;const m=new Map;let Q={opacity:e,strength:t,roughness:r,windPatch:n,windScale:s,edgeRemap:i,sun:o,water:l,absorption:a,scatter:u,bottom:y,sky:x,shelfKm:v,shelfDepthM:R,shoreSoftnessKm:p,fadeInAbove:f,fadeOutBelow:b,sources:_};const G=k=>{const U=k.variantName;if(m.has(U))return m.get(U);const w=Ye(c,Js(k),el(),"tm-ocean",{es300:!0}),W={program:w,attribs:{pos:c.getAttribLocation(w,"a_pos"),sphere:c.getAttribLocation(w,"a_sphere")},uniforms:{elevationGlobe:c.getUniformLocation(w,"a_elevation_globe"),elevationMercator:c.getUniformLocation(w,"a_elevation_mercator"),camera:c.getUniformLocation(w,"u_camera"),sun:c.getUniformLocation(w,"u_sun"),globeness:c.getUniformLocation(w,"u_globeness"),field:c.getUniformLocation(w,"u_field"),rangeKm:c.getUniformLocation(w,"u_rangeKm"),shoreKm:c.getUniformLocation(w,"u_shoreKm"),shelfKm:c.getUniformLocation(w,"u_shelfKm"),strength:c.getUniformLocation(w,"u_strength"),roughness:c.getUniformLocation(w,"u_roughness"),windPatch:c.getUniformLocation(w,"u_windPatch"),windScale:c.getUniformLocation(w,"u_windScale"),water:c.getUniformLocation(w,"u_water"),scatter:c.getUniformLocation(w,"u_scatter"),bottom:c.getUniformLocation(w,"u_bottom"),absorption:c.getUniformLocation(w,"u_absorption"),shelfDepthM:c.getUniformLocation(w,"u_shelfDepthM"),sky:c.getUniformLocation(w,"u_sky"),fade:c.getUniformLocation(w,"u_fade"),opacity:c.getUniformLocation(w,"u_opacity"),edgeRemap:c.getUniformLocation(w,"u_edgeRemap"),matrix:c.getUniformLocation(w,"u_projection_matrix"),tileMercatorCoords:c.getUniformLocation(w,"u_projection_tile_mercator_coords"),clippingPlane:c.getUniformLocation(w,"u_projection_clipping_plane"),transition:c.getUniformLocation(w,"u_projection_transition"),fallbackMatrix:c.getUniformLocation(w,"u_projection_fallback_matrix")}};return m.set(U,W),W},z=()=>{A=c.createTexture(),c.bindTexture(c.TEXTURE_2D,A),c.texImage2D(c.TEXTURE_2D,0,c.LUMINANCE,1,1,0,c.LUMINANCE,c.UNSIGNED_BYTE,new Uint8Array([0])),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,c.LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,c.LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE)},C=k=>{c&&(A&&c.deleteTexture(A),A=c.createTexture(),c.bindTexture(c.TEXTURE_2D,A),c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL,!1),Ko(c)?c.texImage2D(c.TEXTURE_2D,0,c.R8,c.RED,c.UNSIGNED_BYTE,k):c.texImage2D(c.TEXTURE_2D,0,c.LUMINANCE,c.LUMINANCE,c.UNSIGNED_BYTE,k),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.REPEAT),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,c.LINEAR_MIPMAP_LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,c.LINEAR),c.generateMipmap(c.TEXTURE_2D),Y=!0,g?.triggerRepaint())},I=()=>{const k=Ao(c.getParameter(c.MAX_TEXTURE_SIZE),Q.sources);if(!k)return;const U=k.url;H=k.width,fetch(U,{credentials:"omit"}).then(w=>w.ok?w.blob():Promise.reject(new Error(w.status))).then(w=>createImageBitmap(w,{colorSpaceConversion:"none",premultiplyAlpha:"none",imageOrientation:"none"})).then(w=>{if(Ao(c?.getParameter(c.MAX_TEXTURE_SIZE)??0,Q.sources)?.url!==U){w.close?.();return}C(w),w.close?.()}).catch(()=>{})};return{id:br,type:"custom",renderingMode:"3d",onAdd(k,U){g=k,c=U;const w=(W,B)=>{const Z=c.createBuffer();return c.bindBuffer(W,Z),c.bufferData(W,B,c.STATIC_DRAW),Z};F={pos:w(c.ARRAY_BUFFER,S.positions),sphere:w(c.ARRAY_BUFFER,S.spheres),index:w(c.ELEMENT_ARRAY_BUFFER,S.indices)},z(),I()},onRemove(){c&&(m.forEach(({program:k})=>c.deleteProgram(k)),m.clear(),A&&(c.deleteTexture(A),A=null,Y=!1),F&&(c.deleteBuffer(F.pos),c.deleteBuffer(F.sphere),c.deleteBuffer(F.index),F=null),g=null,c=null)},render(k,U){if(!F||Q.opacity<=0)return;const w=U&&U.shaderData,W=U&&U.defaultProjectionData;if(!w||!W)return;const{program:B,attribs:Z,uniforms:L}=G(w);c.useProgram(B),L.matrix&&c.uniformMatrix4fv(L.matrix,!1,W.mainMatrix),L.tileMercatorCoords&&c.uniform4f(L.tileMercatorCoords,...W.tileMercatorCoords),L.clippingPlane&&c.uniform4f(L.clippingPlane,...W.clippingPlane),L.transition&&c.uniform1f(L.transition,W.projectionTransition),L.fallbackMatrix&&c.uniformMatrix4fv(L.fallbackMatrix,!1,W.fallbackMatrix);const X=g.getCenter(),P=0;L.elevationGlobe&&c.uniform1f(L.elevationGlobe,P),L.elevationMercator&&c.uniform1f(L.elevationMercator,le.MercatorCoordinate.fromLngLat([0,X.lat],P).z),L.camera&&c.uniform3f(L.camera,...mt(g,le)),L.sun&&c.uniform3f(L.sun,...Q.sun),L.globeness&&c.uniform1f(L.globeness,W.projectionTransition),L.field&&(c.activeTexture(c.TEXTURE0),c.bindTexture(c.TEXTURE_2D,A),c.uniform1i(L.field,0)),L.rangeKm&&c.uniform1f(L.rangeKm,Vs),L.shoreKm&&c.uniform1f(L.shoreKm,al(g.getZoom(),X.lat,Math.max(Q.shoreSoftnessKm,rl(H)))),L.shelfKm&&c.uniform1f(L.shelfKm,Q.shelfKm),L.strength&&c.uniform1f(L.strength,Q.strength),L.roughness&&c.uniform1f(L.roughness,Q.roughness),L.windPatch&&c.uniform1f(L.windPatch,Q.windPatch),L.windScale&&c.uniform1f(L.windScale,Q.windScale),L.water&&c.uniform1f(L.water,Q.water),L.scatter&&c.uniform3f(L.scatter,...Q.scatter),L.bottom&&c.uniform3f(L.bottom,...Q.bottom),L.absorption&&c.uniform3f(L.absorption,...Q.absorption),L.shelfDepthM&&c.uniform1f(L.shelfDepthM,Q.shelfDepthM),L.sky&&c.uniform3f(L.sky,...Q.sky),L.opacity&&c.uniform1f(L.opacity,Q.opacity),L.edgeRemap&&c.uniform1f(L.edgeRemap,Q.edgeRemap),L.fade&&c.uniform1f(L.fade,tl(Oa(g,le),Q)),c.bindBuffer(c.ARRAY_BUFFER,F.pos),c.enableVertexAttribArray(Z.pos),c.vertexAttribPointer(Z.pos,2,c.FLOAT,!1,0,0),c.bindBuffer(c.ARRAY_BUFFER,F.sphere),c.enableVertexAttribArray(Z.sphere),c.vertexAttribPointer(Z.sphere,3,c.FLOAT,!1,0,0),c.disable(c.DEPTH_TEST),c.depthMask(!1),c.bindBuffer(c.ELEMENT_ARRAY_BUFFER,F.index),c.drawElements(c.TRIANGLES,S.indices.length,c.UNSIGNED_SHORT,0),c.enable(c.DEPTH_TEST),c.depthMask(!0)},setOptions(k={}){const U=Q.sources;Q={...Q,...k},k.sources!==void 0&&k.sources!==U&&(Y=!1,c&&I()),g?.triggerRepaint()},getOptions:()=>({...Q}),get hasField(){return Y}}},il=br,wr=(e,t,r,n=!0)=>{const s=Math.max(1,Math.floor(t)),i=Math.max(1,Math.floor(r)),o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,s,i,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let l=null;return n&&(l=e.createFramebuffer(),e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0)),{texture:o,framebuffer:l,width:s,height:i}},So=(e,t)=>{t&&(t.texture&&e.deleteTexture(t.texture),t.framebuffer&&e.deleteFramebuffer(t.framebuffer))},sl=(e,t,r)=>{const n=[];for(let s=1;s<=r;s++){const i=2**s;n.push({width:Math.max(1,Math.floor(e/i)),height:Math.max(1,Math.floor(t/i))})}return n},ll=(e,t,r,n)=>sl(t,r,n).map(s=>wr(e,s.width,s.height)),cl=new Float32Array([-1,-1,1,-1,-1,1,1,1]),ul=e=>{const t=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,cl,e.STATIC_DRAW),t},hl=`precision highp float;
attribute vec2 a_corner;
varying vec2 v_uv;
void main() {
  v_uv = a_corner * 0.5 + 0.5;
  gl_Position = vec4(a_corner, 0.0, 1.0);
}`,dl=e=>({framebuffer:e.getParameter(e.FRAMEBUFFER_BINDING),viewport:e.getParameter(e.VIEWPORT)}),Lo=(e,t)=>{e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.viewport(t.viewport[0],t.viewport[1],t.viewport[2],t.viewport[3]),e.activeTexture(e.TEXTURE0),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.enable(e.BLEND),e.depthMask(!0)},Ea=(e,t,r)=>{e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.viewport(0,0,t.width,t.height),e.useProgram(r)},Ft=(e,t,r)=>{e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4)},Nt=(e,t,r,n)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r),n&&e.uniform1i(n,t)},vr="tm-bloom",Mo=5,fl=[[1.18,.92,.68],[1.12,.95,.78],[1.06,.98,.89],[1.02,1,.97]],ml=[1,1,1],pl=()=>`precision highp float;
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
}`,gl=()=>`precision highp float;
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
}`,yl=()=>`precision highp float;
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
}`,bl=()=>`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_bloom;
uniform float u_strength;

void main() {
  gl_FragColor = vec4(texture2D(u_bloom, v_uv).rgb * u_strength, 0.0);
}`,wl=()=>`precision highp float;
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
}`,vl={saturation:1,hue:0,exposure:1,contrast:1},_l=e=>Math.abs((e?.saturation??1)-1)>.001||Math.abs(e?.hue??0)>.001||Math.abs((e?.exposure??1)-1)>.001||Math.abs((e?.contrast??1)-1)>.001,xl=({strength:e=.9,threshold:t=.6,knee:r=.12,radius:n=1,chromatic:s=!0,...i}={})=>{let o=null,l=null,a=null,u=null,y=null,x=null,v=null,R={strength:e,threshold:t,knee:r,radius:n,chromatic:s,...vl,...i};const p=()=>{const _=(S,g,c)=>{const H=Ye(l,hl,S,g),F={};return c.forEach(A=>{F[A]=l.getUniformLocation(H,`u_${A}`)}),{program:H,corner:l.getAttribLocation(H,"a_corner"),...F}};return{bright:_(pl(),"tm-bloom-bright",["scene","threshold","knee"]),down:_(gl(),"tm-bloom-down",["source","texel"]),up:_(yl(),"tm-bloom-up",["source","texel","radius","tint"]),composite:_(bl(),"tm-bloom-composite",["bloom","strength"]),grade:_(wl(),"tm-grade",["scene","saturation","hue","exposure","contrast"])}},f=()=>{So(l,y),y=null,x&&x.forEach(_=>So(l,_)),x=null,v=null},b=(_,S)=>{v&&v.width===_&&v.height===S||(f(),y=wr(l,_,S,!1),x=ll(l,_,S,Mo),v={width:_,height:S})};return{id:vr,type:"custom",renderingMode:"2d",onAdd(_,S){o=_,l=S,a=ul(l)},onRemove(){l&&(u&&(Object.values(u).forEach(({program:_})=>l.deleteProgram(_)),u=null),f(),a&&(l.deleteBuffer(a),a=null),o=null,l=null)},render(){const _=_l(R);if(!a||R.strength<=0&&!_)return;const S=o.getCanvas(),g=Math.max(1,S.width),c=Math.max(1,S.height),H=dl(l);if(u=u||p(),b(g,c),l.bindTexture(l.TEXTURE_2D,y.texture),l.copyTexImage2D(l.TEXTURE_2D,0,l.RGBA,0,0,g,c,0),l.disable(l.DEPTH_TEST),l.disable(l.BLEND),l.depthMask(!1),_&&(l.bindFramebuffer(l.FRAMEBUFFER,null),l.viewport(0,0,g,c),l.useProgram(u.grade.program),Nt(l,0,y.texture,u.grade.scene),u.grade.saturation&&l.uniform1f(u.grade.saturation,R.saturation),u.grade.hue&&l.uniform1f(u.grade.hue,R.hue),u.grade.exposure&&l.uniform1f(u.grade.exposure,R.exposure),u.grade.contrast&&l.uniform1f(u.grade.contrast,R.contrast),Ft(l,a,u.grade.corner),l.bindTexture(l.TEXTURE_2D,y.texture),l.copyTexImage2D(l.TEXTURE_2D,0,l.RGBA,0,0,g,c,0)),R.strength<=0){Lo(l,H);return}Ea(l,x[0],u.bright.program),Nt(l,0,y.texture,u.bright.scene),u.bright.threshold&&l.uniform1f(u.bright.threshold,R.threshold),u.bright.knee&&l.uniform1f(u.bright.knee,R.knee),Ft(l,a,u.bright.corner);for(let F=1;F<x.length;F++){const A=x[F-1];Ea(l,x[F],u.down.program),Nt(l,0,A.texture,u.down.source),u.down.texel&&l.uniform2f(u.down.texel,1/A.width,1/A.height),Ft(l,a,u.down.corner)}l.enable(l.BLEND),l.blendFunc(l.ONE,l.ONE);for(let F=x.length-1;F>0;F--){const A=x[F-1];if(Ea(l,A,u.up.program),Nt(l,0,x[F].texture,u.up.source),u.up.texel&&l.uniform2f(u.up.texel,1/A.width,1/A.height),u.up.radius&&l.uniform1f(u.up.radius,R.radius),u.up.tint){const Y=R.chromatic?fl[x.length-1-F]:ml;l.uniform3f(u.up.tint,...Y)}Ft(l,a,u.up.corner)}l.bindFramebuffer(l.FRAMEBUFFER,H.framebuffer),l.viewport(H.viewport[0],H.viewport[1],H.viewport[2],H.viewport[3]),l.useProgram(u.composite.program),Nt(l,0,x[0].texture,u.composite.bloom),u.composite.strength&&l.uniform1f(u.composite.strength,R.strength),Ft(l,a,u.composite.corner),Lo(l,H)},setOptions(_={}){R={...R,..._},o?.triggerRepaint()},getOptions:()=>({...R}),get levelCount(){return Mo}}},El=vr,Ba=[{key:"starfield",option:"brightness",label:"Stars",default:.5,max:1},{key:"sun",option:"brightness",label:"Sun",default:1,max:1},{key:"moon",option:"brightness",label:"Moon",default:1,max:1},{key:"daylight",option:"nightDarkness",label:"Day and night",default:.965,max:1},{key:"atmosphere",option:"strength",label:"Atmosphere",default:1,max:1},{key:"clouds",option:"opacity",label:"Clouds",default:1,max:1},{key:"ocean",option:"opacity",label:"Ocean",default:1,max:1},{key:"relief",option:"reliefPower",label:"Relief",default:0,max:2,on:"daylight"}],Ua={key:"reference",default:0},Tl="tm-layers-v2",kl=(e=globalThis.localStorage)=>{const t={};for(const r of Ba)t[r.key]={visible:r.default>0,value:r.default};t[Ua.key]={visible:!1,value:Ua.default};try{const r=JSON.parse(e?.getItem(Tl)||"{}");for(const[n,s]of Object.entries(r)){if(!t[n]||!s||typeof s!="object")continue;const i=s.value;t[n]={visible:s.visible===!0,value:typeof i=="number"&&Number.isFinite(i)?i:t[n].value}}}catch{}return t},Al=(e,t)=>{const r=t?.visible?Number(t.value):0;return{[e.option]:Number.isFinite(r)?r:0}},Sl=(e,t)=>{const r=[];for(const n of Ba){const s=e?.[n.on||n.key];!s||typeof s.setOptions!="function"||(s.setOptions(Al(n,t?.[n.key])),r.push(n.key))}return r},Ll=(e,{onReference:t=null,target:r=globalThis}={})=>{const n=new Map(Ba.map(s=>[s.key,s]));return r.__tmSetLayer=(s,i)=>{const o=Number.isFinite(Number(i))?Number(i):0;if(s===Ua.key)return t?.(o);const l=n.get(s);if(!l)return;const a=e?.[l.on||l.key];if(!(!a||typeof a.setOptions!="function"))return a.setOptions({[l.option]:o})},()=>{r.__tmSetLayer&&delete r.__tmSetLayer}},Ml="/img/map/clouds-field.webp",Rl="/img/map/wind-field.png",Ro="/img/map/cloud-patches.webp",Ta=e=>$r(e).rgb.map(t=>t/255),Po=[["starfield",ss,e=>is(e)],["sun",Ts,e=>vs(e)],["moon",Cs,e=>Ps(e)],["ocean",il,e=>nl(e)],["daylight",$s,e=>zs(e)],["clouds",Ca,e=>Fi(e)],["atmosphere",Ks,e=>Xs(e)],["bloom",El,e=>xl(e)]],Pl=(e,t)=>{if(t&&e.getLayer(t))return t;let r;try{r=(e.getStyle()?.layers??[]).find(n=>n.type==="symbol"&&n.layout?.["text-field"]!=null)?.id}catch{}return t&&console.warn(`[globe-layers] "${t}" is not on this map; ${r?`anchoring under "${r}" so the labels stay readable`:"and nothing on it draws text, so the stack goes on top"}`),r},Cl=(e,{date:t=new Date,reduceMotion:r=!1,beforeId:n,permitted:s=null}={})=>{const i=Ot(t),o=!r,l={fieldUrl:Ml,patchUrl:Ro,windUrl:Rl,windAmount:.2,animate:o},a={starfield:{date:t,animate:o},sun:{date:t},moon:{date:t,sun:i},ocean:{sun:i,roughness:.95,strength:.48,windPatch:.6,shoreSoftnessKm:19.5},clouds:{...l,sun:i},daylight:{...l,sun:i,date:t},atmosphere:{sun:i,strength:1.25},bloom:{threshold:.86,strength:.45,knee:.06}},u={},y=Pl(e,n);for(const[p,f,b]of Po){if(e.getLayer(f)&&e.removeLayer(f),s&&!s(p))continue;const _=b(a[p]);e.addLayer(_,y),u[p]=_}Sl(u,kl());const x=Ll(u),v=(p,f)=>u[p]?.setOptions?.(f),R=[window.__tune?.register("Ocean",[{key:"shoreSoftnessKm",label:"Shore falloff",min:0,max:25,step:.25,value:19.5,apply:p=>v("ocean",{shoreSoftnessKm:p})},{key:"roughness",label:"Roughness",min:0,max:1,step:.01,value:.95,apply:p=>v("ocean",{roughness:p})},{key:"strength",label:"Sun glint",min:0,max:1,step:.01,value:.48,apply:p=>v("ocean",{strength:p})},{key:"windPatch",label:"Patchiness",min:0,max:1,step:.01,value:.6,apply:p=>v("ocean",{windPatch:p})},{key:"windScale",label:"Wave scale",min:1,max:60,step:1,value:14,apply:p=>v("ocean",{windScale:p})},{key:"water",label:"Tint depth",min:0,max:2,step:.05,value:1,apply:p=>v("ocean",{water:p})},{key:"scatter",label:"Tint colour",type:"color",value:"#1d5c8f",apply:p=>v("ocean",{scatter:Ta(p)})},{key:"opacity",label:"Opacity",min:0,max:1,step:.01,value:1,apply:p=>v("ocean",{opacity:p})}],{tab:"Earth"}),window.__tune?.register("Clouds",[{key:"opacity",label:"Density",min:0,max:1,step:.01,value:1,apply:p=>v("clouds",{opacity:p})},{key:"windAmount",label:"Curl",min:0,max:1,step:.05,value:.2,apply:p=>v("clouds",{windAmount:p})},{key:"windScale",label:"Wind scale",min:.01,max:.5,step:.01,value:.06,apply:p=>v("clouds",{windScale:p})},{key:"windRate",label:"Wind speed",min:0,max:.3,step:.005,value:.05,apply:p=>v("clouds",{windRate:p})},{key:"cloudShadow",label:"Shadows",min:0,max:1,step:.01,value:.5,apply:p=>v("daylight",{cloudShadow:p})},{key:"shadowSoftness",label:"Shadow edge",min:0,max:1,step:.01,value:.75,apply:p=>v("daylight",{shadowSoftness:p})},{key:"patchTiles",label:"Cloud cells",min:96,max:320,step:8,value:144,apply:p=>{v("clouds",{patchTiles:p}),v("daylight",{patchTiles:p})}},{key:"patchMean",label:"Atlas mean",min:.2,max:.8,step:.005,value:.4335,apply:p=>{v("clouds",{patchMean:p}),v("daylight",{patchMean:p})}},{key:"patchDetail",label:"Detail amount",min:0,max:1.5,step:.05,value:.75,apply:p=>{v("clouds",{patchDetail:p}),v("daylight",{patchDetail:p})}},{key:"patchUrl",label:"Tiled source",type:"boolean",value:!0,apply:p=>{const f=p?Ro:null;v("clouds",{patchUrl:f}),v("daylight",{patchUrl:f})}}],{tab:"Earth"}),window.__tune?.register("Cloud light",[{key:"cloudRelief",label:"Cloud height km",min:0,max:120,step:2,value:90,apply:p=>v("clouds",{cloudRelief:p})},{key:"cloudDepth",label:"Optical depth",min:0,max:12,step:.25,value:4,apply:p=>v("clouds",{cloudDepth:p})},{key:"powder",label:"Powder",min:0,max:1,step:.05,value:1,apply:p=>v("clouds",{powder:p})},{key:"forward",label:"Silver lining",min:0,max:2,step:.05,value:.5,apply:p=>v("clouds",{forward:p})},{key:"forwardG",label:"Lobe sharpness",min:0,max:.95,step:.05,value:.7,apply:p=>v("clouds",{forwardG:p})},{key:"selfShadow",label:"Self shadow",min:0,max:1,step:.02,value:.18,apply:p=>v("clouds",{selfShadow:p})},{key:"selfShadowStep",label:"Shadow reach",min:2e-4,max:.006,step:2e-4,value:.0015,apply:p=>v("clouds",{selfShadowStep:p})}],{tab:"Earth"}),window.__tune?.register("Sky and light",[{key:"nightDarkness",label:"Night",min:0,max:1,step:.005,value:.965,apply:p=>v("daylight",{nightDarkness:p})},{key:"twilightColour",label:"Twilight warm",type:"color",value:"#9e5229",apply:p=>v("daylight",{twilightColour:Ta(p)})},{key:"twilightCool",label:"Twilight blue",type:"color",value:"#1a2647",apply:p=>v("daylight",{twilightCool:Ta(p)})},{key:"twilightStrength",label:"Twilight strength",min:0,max:1,step:.05,value:.55,apply:p=>v("daylight",{twilightStrength:p})},{key:"atmosphere",label:"Haze",min:0,max:2,step:.05,value:1.25,apply:p=>v("atmosphere",{strength:p})},{key:"starfield",label:"Stars",min:0,max:1,step:.05,value:.5,apply:p=>v("starfield",{brightness:p})},{key:"sun",label:"Sun",min:0,max:2,step:.05,value:1,apply:p=>v("sun",{brightness:p})},{key:"moon",label:"Moon",min:0,max:2,step:.05,value:1,apply:p=>v("moon",{brightness:p})},{key:"moonGlow",label:"Moon glow",min:0,max:1.5,step:.05,value:.4,apply:p=>v("moon",{glow:p})},{key:"moonGlowExtent",label:"Moon glow reach",min:0,max:4,step:.1,value:1.8,apply:p=>v("moon",{glowExtent:p})}],{tab:"Earth"}),window.__tune?.register("Glare",[{key:"strength",label:"Strength",min:0,max:3,step:.05,value:.45,apply:p=>v("bloom",{strength:p})},{key:"threshold",label:"Threshold",min:0,max:1,step:.01,value:.86,apply:p=>v("bloom",{threshold:p})},{key:"knee",label:"Knee",min:0,max:.5,step:.01,value:.06,apply:p=>v("bloom",{knee:p})},{key:"radius",label:"Radius",min:.2,max:2,step:.05,value:1,apply:p=>v("bloom",{radius:p})},{key:"chromatic",label:"Warm at the edges",type:"boolean",value:!0,apply:p=>v("bloom",{chromatic:p})}],{tab:"Earth"}),window.__tune?.register("Colour grade",[{key:"saturation",label:"Saturation (0 = greyscale)",min:0,max:2,step:.01,value:1,apply:p=>v("bloom",{saturation:p})},{key:"hue",label:"Hue shift",min:-180,max:180,step:1,value:0,unit:"°",apply:p=>v("bloom",{hue:p*Math.PI/180})},{key:"exposure",label:"Exposure",min:.2,max:2.5,step:.01,value:1,apply:p=>v("bloom",{exposure:p})},{key:"contrast",label:"Contrast",min:.5,max:2,step:.01,value:1,apply:p=>v("bloom",{contrast:p})}],{tab:"Earth"})];return{layers:u,setDate(p){const f=p instanceof Date?p:new Date(p);if(Number.isNaN(f.getTime()))return;const b=Ot(f);for(const _ of Object.keys(u))u[_]?.setOptions?.({date:f,sun:b})},remove(){x?.();for(const p of R)p?.();for(const[,p]of Po)e.getLayer(p)&&e.removeLayer(p)}}},ka=111.32,ta=e=>e<0?0:e>1?1:e,Dl=(e,t,r)=>{if(!(r>0))return Math.min(e,t);const n=ta(.5+.5*(t-e)/r);return t*(1-n)+e*n-r*n*(1-n)},Kt=(e,t)=>{const r=Math.sin(e*127.1+t*311.7)*43758.5453;return r-Math.floor(r)},Co=(e,t)=>{const r=Math.floor(e),n=Math.floor(t),s=e-r,i=t-n,o=s*s*(3-2*s),l=i*i*(3-2*i),a=Kt(r,n),u=Kt(r+1,n),y=Kt(r,n+1),x=Kt(r+1,n+1);return(a*(1-o)+u*o)*(1-l)+(y*(1-o)+x*o)*l},Il=(e,t)=>Co(e,t)*.7+Co(e*2.3,t*2.3)*.3,Ul=(e,t,r,n=.5)=>r*Math.pow(ta(t>0?e/t:1),n),Fl=({width:e,height:t,bbox:r,inside:n,seeds:s,lobeScale:i=6,lobeAmount:o=45,mergeKm:l=120})=>{const[a,u,y,x]=r,v=new Float32Array(e*t),R=y-a,p=x-u;let f=0;const b=(x+u)/2,_=ka*Math.cos(b*Math.PI/180),S=([c,H])=>[(c-a)*_,(x-H)*ka],g=s.map(S);for(let c=0;c<t;c++){const H=x-p*(c+.5)/t,F=(x-H)*ka;for(let A=0;A<e;A++){const Y=c*e+A;if(!n(A,c)){v[Y]=1/0;continue}const Q=(a+R*(A+.5)/e-a)*_;let G=1/0;for(const[I,k]of g){const U=Math.hypot(Q-I,F-k);G=G===1/0?U:Dl(G,U,l)}const z=Il(A/e*i,c/t*i)-.5,C=Math.max(0,G+z*2*o);v[Y]=C,C>f&&(f=C)}}return{field:v,maxKm:f,spanKm:Nl(v,f,.995)}},Nl=(e,t,r)=>{if(!(t>0))return 0;const n=512,s=new Int32Array(n);let i=0;for(let a=0;a<e.length;a++){const u=e[a];Number.isFinite(u)&&(s[Math.min(n-1,Math.floor(u/t*n))]++,i++)}if(!i)return 0;const o=i*r;let l=0;for(let a=0;a<n;a++)if(l+=s[a],l>=o)return(a+1)/n*t;return t},Ol=(e,t,{radiusKm:r,body:n,rim:s,rimKm:i,opacity:o,featherKm:l=8})=>{for(let a=0;a<t.length;a++){const u=t[a],y=a*4;if(!(u<=r+l)){e[y+3]=0;continue}const x=l>0?ta((r+l-u)/l):1,v=i>0?ta(1-(r-u)/i):0;e[y]=n[0]+(s[0]-n[0])*v,e[y+1]=n[1]+(s[1]-n[1])*v,e[y+2]=n[2]+(s[2]-n[2])*v,e[y+3]=255*o*x*(1+.35*v)}},Tt="tm-advance-src",Aa="tm-advance",ye=256,Do=e=>{const t=String(e).replace("#",""),r=t.length===3?t.split("").map(n=>n+n).join(""):t;return[0,2,4].map(n=>parseInt(r.slice(n,n+2),16)||0)},Bl=e=>{let t=180,r=90,n=-180,s=-90;const i=o=>{if(typeof o[0]=="number"){const[l,a]=o;l<t&&(t=l),l>n&&(n=l),a<r&&(r=a),a>s&&(s=a);return}o.forEach(i)};return i(e.coordinates),[t,r,n,s]},Ql=e=>e.type==="Polygon"?[e.coordinates]:e.type==="MultiPolygon"?e.coordinates:[],ql=(e,{beforeId:t,colour:r="#b31217",rimColour:n="#4a0505",opacity:s=.85,seconds:i=4,curve:o=.5,lobeScale:l=6,lobeAmount:a=45,mergeKm:u=120,rimKm:y=40,featherKm:x=10}={})=>{let v={colour:r,rimColour:n,opacity:s,seconds:i,curve:o,lobeScale:l,lobeAmount:a,mergeKm:u,rimKm:y,featherKm:x},R=null,p=null,f=null,b=null,_=null,S=null,g=!0;const c=()=>{R||(R=document.createElement("canvas"),R.width=ye,R.height=ye,p=R.getContext("2d",{willReadFrequently:!0}),f=p.createImageData(ye,ye))},H=(G,z)=>{const[C,I,k,U]=z,w=new Uint8Array(ye*ye),W=document.createElement("canvas");W.width=ye,W.height=ye;const B=W.getContext("2d",{willReadFrequently:!0}),Z=P=>(P-C)/(k-C)*ye,L=P=>(U-P)/(U-I)*ye;B.fillStyle="#fff";for(const P of Ql(G))B.beginPath(),P.forEach($=>{$.forEach(([J,K],O)=>O?B.lineTo(Z(J),L(K)):B.moveTo(Z(J),L(K))),B.closePath()}),B.fill("evenodd");const X=B.getImageData(0,0,ye,ye).data;for(let P=0;P<w.length;P++)w[P]=X[P*4+3]>40?1:0;return w},F=(G,z)=>{if(!G||!z?.length)return!1;c();const C=Bl(G),I=H(G,C),{field:k,maxKm:U,spanKm:w}=Fl({width:ye,height:ye,bbox:C,inside:(P,$)=>I[$*ye+P]===1,seeds:z,lobeScale:v.lobeScale,lobeAmount:v.lobeAmount,mergeKm:v.mergeKm});b={field:k,maxKm:U,spanKm:w,bbox:C};const[W,B,Z,L]=C,X=[[W,L],[Z,L],[Z,B],[W,B]];return e.getSource(Tt)?e.getSource(Tt).setCoordinates(X):(e.addSource(Tt,{type:"canvas",canvas:R,coordinates:X,animate:!0}),e.addLayer({id:Aa,type:"raster",source:Tt,paint:{"raster-opacity":1,"raster-fade-duration":0,"raster-resampling":"linear"}},t&&e.getLayer(t)?t:void 0)),!0},A=G=>{b&&(Ol(f.data,b.field,{radiusKm:G,body:Do(v.colour),rim:Do(v.rimColour),rimKm:v.rimKm,opacity:v.opacity,featherKm:v.featherKm}),p.putImageData(f,0,0))},Y=()=>{_&&cancelAnimationFrame(_),_=null},m=()=>{if(!b)return!1;Y(),S=performance.now();const G=z=>{const C=(z-S)/1e3;A(Ul(C,v.seconds,b.spanKm,v.curve)),C<v.seconds?_=requestAnimationFrame(G):(_=null,A(b.maxKm),g||Q())};return _=requestAnimationFrame(G),!0},Q=()=>{Y(),p&&p.clearRect(0,0,ye,ye)};return{prepare:F,play:m,clear:Q,setOptions(G={}){const z=["lobeScale","lobeAmount","mergeKm"].some(C=>G[C]!==void 0&&G[C]!==v[C]);return v={...v,...G},z?"needs-rebuild":(b&&!_&&A(b.maxKm),"ok")},get maxKm(){return b?b.maxKm:0},get painted(){if(!f)return 0;let G=0;for(let z=3;z<f.data.length;z+=4)f.data[z]>8&&G++;return G},get running(){return _!==null},set holdAtEnd(G){g=!!G},remove(){Y(),e.getLayer(Aa)&&e.removeLayer(Aa),e.getSource(Tt)&&e.removeSource(Tt),b=null}}},Io=[{key:"cardWidth",property:"--card-width",label:"Width",min:240,max:420,step:1},{key:"cardBodyHeight",property:"--card-body-height",label:"Body height",min:120,max:520,step:4},{key:"cardFadeHeight",property:"--card-fade-height",label:"Fade height",min:0,max:160,step:2}],Hl=(e,t=document.documentElement)=>{const r=getComputedStyle(t).getPropertyValue(e).trim(),n=parseFloat(r);return Number.isFinite(n)?r.endsWith("rem")?n*parseFloat(getComputedStyle(document.documentElement).fontSize||"16"):n:null},Gl=(e=globalThis)=>{if(!e.__tune?.register)return()=>{};const t=document.documentElement,r=Io.map(s=>({key:s.key,label:s.label,min:s.min,max:s.max,step:s.step,value:Hl(s.property)??s.min,apply:i=>t.style.setProperty(s.property,`${Number(i)}px`)})),n=e.__tune.register("Information card",r,{tab:"Map"});return()=>{n?.();for(const s of Io)t.style.removeProperty(s.property)}},zl=pi.families.flatMap(e=>e.qids.flatMap(t=>[t,e.color])),Sa=new Map(Zn.overrides.filter(e=>e.name).map(e=>[`${e.qid}|${e.name}`,e.use]));window.initTimeMap=function(t,r,n){const s={year:n,ready:!1,selectedRegion:null},i=()=>{window.__portal={ready:s.ready,year:s.year,selectedRegion:s.selectedRegion}};i();const o=new le.Map({container:t,locale:Ur(),zoomLevelsToOverscale:void 0,style:{version:8,projection:{type:"globe"},sky:{"atmosphere-blend":["interpolate",["linear"],["zoom"],2,.5,4,.35,6,.12,7,.04],"sky-color":"#0a1230","sky-horizon-blend":.5,"horizon-color":"#1a2c5a","horizon-fog-blend":.5,"fog-color":"#dcc9a0","fog-ground-blend":.7},glyphs:`${location.origin}/fonts/{fontstack}/{range}.pbf`,sources:{land:{type:"vector",tiles:[`${location.origin}/land-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},graticule:{type:"geojson",data:`${location.origin}/timemap/graticule.geojson`},dem:Ir,satellite:Dr,"satellite-detail":Cr,coast:{type:"vector",tiles:[`${location.origin}/coast-echo-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},rivers:{type:"vector",tiles:[`${location.origin}/river-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},lakes:{type:"vector",tiles:[`${location.origin}/lake-tiles/{z}/{x}/{y}.pbf`],maxzoom:6},"ink-borders":{type:"vector",tiles:[`${location.origin}/ink-border-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},coastline:{type:"geojson",data:`${location.origin}/timemap/coastline.geojson`},cliopatria:{type:"vector",tiles:[`${location.origin}/cliopatria-tiles/{z}/{x}/{y}.pbf`],maxzoom:4,promoteId:{boundaries:"Wikidata"}},"hand-territories":{type:"geojson",data:Qn(),promoteId:"id"},"boundaries-smooth":{type:"geojson",data:{type:"FeatureCollection",features:[]}},"boundaries-glow-src":{type:"geojson",data:{type:"FeatureCollection",features:[]}},"boundaries-cursor-name":{type:"geojson",data:{type:"FeatureCollection",features:[]}},...Br()},layers:[{id:"water",type:"background",paint:{"background-color":te.water}},...Pr({visible:!1}),{id:"graticule",type:"line",source:"graticule",layout:{visibility:"none","line-cap":"round","line-join":"round"},paint:{"line-color":"#8a9aa0","line-width":.6,"line-opacity":.5}},{id:"coast-echo",type:"line",source:"coast","source-layer":"coast",layout:{visibility:"none","line-cap":"round"},paint:{"line-color":"#6b563d","line-width":.6}},{id:"coast-shadow",type:"line",source:"coastline",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#574631","line-width":2.6,"line-translate":[0,2],"line-blur":.4}},{id:"land",type:"fill",source:"land","source-layer":"land",paint:{"fill-color":te.land}},{id:"hillshade",type:"hillshade",source:"dem",layout:{visibility:"none"},paint:{"hillshade-exaggeration":.45,"hillshade-illumination-direction":55,"hillshade-shadow-color":"#4a3a28","hillshade-highlight-color":"#fbf2d8","hillshade-accent-color":"#6b563d"}},{id:"lake-shadow",type:"line",source:"lakes","source-layer":"lakes",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#574631","line-width":2,"line-translate":[0,1.6],"line-blur":.4}},{id:"lakes",type:"fill",source:"lakes","source-layer":"lakes",paint:{"fill-color":te.water}},{id:"lake-line",type:"line",source:"lakes","source-layer":"lakes",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#3a2c1a","line-width":.7,"line-opacity":.8}},{id:"coast-bold",type:"line",source:"coastline",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#2f2418","line-width":1.1}},...Or(["Cinzel"])]},center:[8.23,20],zoom:1.9,pitch:45,maxPitch:70,maxZoom:7,attributionControl:!1});o.addControl(new le.AttributionControl({compact:!0,customAttribution:["Borders © Cliopatria / Seshat (CC-BY 4.0)","Land © OpenStreetMap (CC0)","Cloud: NASA EOSDIS GIBS (MODIS)"]}),"bottom-left");let l=!1;const a=t.querySelector(".maplibregl-ctrl-attrib"),u=()=>{l||(a?.classList.remove("maplibregl-compact-show"),a?.removeAttribute("open"))};u(),o.on("resize",u),a?.addEventListener("click",()=>{l=!0}),window.__tmMap=o,t.style.background="radial-gradient(ellipse 90% 90% at 50% 48%, #14224a 0%, #070c1e 55%, #02030a 100%)",new ResizeObserver(()=>o.resize()).observe(t);let x=!0,v=!1;const R=()=>{if(!x||v)return;const h=document.querySelector("[data-timemap-deck]");if(!h)return;const T=t.getBoundingClientRect(),E=h.getBoundingClientRect(),D=Math.max(0,Math.min(T.bottom-E.top,T.height/3));Math.abs(parseFloat(t.style.top||"0")+D)<1||(t.style.top=`-${D}px`,t.style.height=`calc(100% + ${D}px)`,o.resize())},p=(h=0)=>{const T=document.querySelector("[data-timemap-deck]");if(!T){h<30&&setTimeout(()=>p(h+1),100);return}R(),new ResizeObserver(R).observe(T)};p();const f=te.palette,b=["case",["boolean",["feature-state","selected"],!1],te.selected,["match",["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q0"],1]],f.length],...f.flatMap((h,T)=>[T,h]),f[0]]],_=["case",["boolean",["feature-state","selected"],!1],te.fillOpacity.selected,te.fillOpacity.normal],S="#f59e0b",g=[[0,3],[4,7],[8,12]],c=(h=1)=>["interpolate",["linear"],["zoom"],...g.flatMap(([T,E])=>[T,E*h])],H=c(1),F=(h,T)=>["match",["get","confidence"],"low",h,T],A={opacityLow:.42,opacityMedium:.7,blurLow:3.2,blurMedium:1.4,width:1,dash:2},Y=()=>F(A.opacityLow,A.opacityMedium),m=()=>F(A.blurLow,A.blurMedium),Q=()=>[A.dash,A.dash*1.25],G=()=>["interpolate",["linear"],["zoom"],...[[0,.8],[4,1.4],[8,2.2]].flatMap(([h,T])=>[h,T*A.width])],z=h=>["all",["==",["get","Type"],"POLITY"],["!=",["slice",["get","Name"],0,1],"("],["<=",["to-number",["get","FromYear"]],h],[">=",["to-number",["get","ToYear"]],h]],C=30,I=h=>["min",["max",0,["min",1,["/",["-",h,["to-number",["get","FromYear"]]],C]]],["max",0,["min",1,["/",["-",["to-number",["get","ToYear"]],h],C]]]];let k=_,U=1,w=.55;try{const h=parseFloat(localStorage.getItem("tm-color-strength"));Number.isFinite(h)&&(w=Math.min(1,Math.max(0,h)))}catch{}const W=h=>Math.min(.92,Math.max(.06,h*(.45+1.1*w))),B={normal:{opacity:null},hover:{colour:null,opacity:null},active:{colour:null,opacity:null}};let Z=!0;const L={normal:{colour:null,width:null,opacity:null,blur:null},hover:{colour:null,width:null,opacity:null,blur:null},active:{colour:null,width:null,opacity:null,blur:null}},X=(h,T)=>{const E=L.normal[h]??T,D=L.hover[h]??E,q=L.active[h]??D;return D===E&&q===E?E:["case",["boolean",["feature-state","selected"],!1],q,["boolean",["feature-state","hover"],!1],D,E]},P=["boundaries-line","boundaries-smooth"],$=()=>{const h=qe[Je]||{};for(const[T,E,D]of[["colour","line-color",h.line?.color??te.line.color],["width","line-width",h.line?.width??te.line.width],["blur","line-blur",h.line?.blur??0]]){const q=X(T,D);for(const N of P)J[`${N}.${E}`]=q,K(N,E,q)}},J={},K=(h,T,E)=>{const D=J[`${h}.${T}`];if(o.getLayer(h))try{o.setPaintProperty(h,T,D!==void 0?D:E)}catch{}},O=()=>{const h=qe[Je]||{},T=h.palette||f,E=["match",["coalesce",["get","Wikidata"],"Q0"],...zl,["match",["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q0"],1]],T.length],...T.flatMap((D,q)=>[q,D]),T[0]]];return["case",["boolean",["feature-state","selected"],!1],B.active.colour??h.selected??te.selected,["boolean",["feature-state","hover"],!1],B.hover.colour??h.hover??te.hover,Z?E:Ht]},ke=()=>{const h=qe[Je]||{},T=W(h.fillOpacity!=null?h.fillOpacity:te.fillOpacity.normal);k=["case",["boolean",["feature-state","selected"],!1],B.active.opacity??Math.max(.85,T),["boolean",["feature-state","hover"],!1],B.hover.opacity??Math.max(.6,T+.18),B.normal.opacity??T]},fe=["boundaries-fill","hand-fill"],ce=()=>{if(!o.getLayer("boundaries-fill"))return;const h=O();for(const T of fe)if(o.getLayer(T))try{o.setPaintProperty(T,"fill-color",h)}catch{}ke(),Ee(s.year)};window.__tmSetColorStrength=h=>{w=Math.min(1,Math.max(0,Number(h)||0));try{localStorage.setItem("tm-color-strength",String(w))}catch{}ke(),Ee(s.year)};const Ae=h=>["*",k,I(h)],Ce=h=>["*",U,I(h)];let ot=!1;const Ee=h=>{if(o.getLayer("boundaries-fill")){for(const T of fe)o.getLayer(T)&&o.setPaintProperty(T,"fill-opacity",ot?Ae(h):k);o.getLayer("boundaries-line")&&o.setPaintProperty("boundaries-line","line-opacity",ot?Ce(h):U),o.getLayer("hand-line")&&o.setPaintProperty("hand-line","line-opacity",ot?["*",Y(),I(h)]:Y())}},pt=h=>["all",["<=",["to-number",["get","FromYear"]],h],[">=",["to-number",["get","ToYear"]],h]],At=h=>["all",["<=",["coalesce",["to-number",["get","start_decdate"]],-1e6],h],[">",["coalesce",["to-number",["get","end_decdate"]],1e6],h]],St=h=>{if(la?.setDate(ca(h)),!o.getLayer("boundaries-fill"))return;o.setFilter("boundaries-fill",z(h)),o.setFilter("boundaries-line",z(h));for(const E of["hand-fill","hand-line"])o.getLayer(E)&&o.setFilter(E,z(h));Ke(),Ee(h),o.setFilter("markers-dot",At(h)),o.setFilter("markers-label",At(h)),zr(o,h),Le&&Le.setYear(h);const T=qe[Je]&&qe[Je].borderSource?pt(h):z(h);for(let E=0;E<6;E++)o.getLayer(`ink-${E}`)&&o.setFilter(`ink-${E}`,T);Xe()},Bt=h=>{let T=0,E=0,D=0;for(let q=0,N=h.length-1;q<h.length;N=q++){const[j,ae]=h[N],[ie,V]=h[q],$e=j*V-ie*ae;T+=$e,E+=(j+ie)*$e,D+=(ae+V)*$e}return T===0?{area:0,c:h[0]}:{area:Math.abs(T/2),c:[E/(3*T),D/(3*T)]}},rt=new Set,Lt=new Set,ia=h=>Lt.has(h)||o.hasImage(`flag-${h}`)?Promise.resolve(!1):(Lt.add(h),o.loadImage(`/flags/${h}.png`).then(T=>(o.hasImage(`flag-${h}`)||o.addImage(`flag-${h}`,T.data),!0)).catch(()=>!1)),sa={Q217196:[-3.7,40.4]};let Mt=new Map;const nt=()=>{const h=o.getSource("labels");h&&h.setData({type:"FeatureCollection",features:[...Mt.entries()].map(([T,E])=>({type:"Feature",geometry:{type:"Point",coordinates:sa[T]||E.c},properties:{name:E.name,flag:o.hasImage(`flag-${T}`)?`flag-${T}`:"",sel:String(ne)===T,hov:E.name===Be}}))})},Ne=()=>{if(!o.getSource("labels")||!o.getLayer("boundaries-fill"))return;const T=new Map,E=fe.filter(N=>o.getLayer(N));for(const N of o.queryRenderedFeatures({layers:E})){const j=N.properties.Name;if(j==null)continue;const ae=String(N.properties.Wikidata),ie=N.geometry,V=ie.type==="Polygon"?[ie.coordinates]:ie.type==="MultiPolygon"?ie.coordinates:[];for(const $e of V){const{area:pe,c:ha}=Bt($e[0]),xt=T.get(ae);(!xt||pe>xt.area)&&T.set(ae,{area:pe,c:ha,name:j})}}he(),Mt=T;const D=nt;D();const q=[...T.keys()].filter(N=>rt.has(N)&&!o.hasImage(`flag-${N}`)&&!Lt.has(N));q.length&&Promise.all(q.map(ia)).then(N=>{N.some(Boolean)&&D()})};fetch("/flags/manifest.json").then(h=>h.ok?h.json():[]).then(h=>{h.forEach(T=>rt.add(String(T))),o.getLayer("boundaries-fill")&&Ne()}).catch(()=>{}),window.__polityCache=window.__polityCache||{},fetch("/timemap/articles.json").then(h=>h.ok?h.json():{}).then(h=>Object.assign(window.__polityCache,h)).catch(()=>{});const it=()=>Ne();let Qt=null;const Xe=()=>{clearTimeout(Qt),Qt=setTimeout(it,250)};let gt=null,qt=null;const yt="boundaries-smooth",_e={type:"FeatureCollection",features:[]};let Se=0,bt=null,Ht="#5b7fa8";const Gt=()=>{const h=o.getSource(yt);if(!h)return;if(Se<1){h.setData(_e);return}const T=[],E=new Set;for(const D of o.queryRenderedFeatures({layers:["boundaries-fill"]})){const q=`${D.id}|${D.geometry?.coordinates?.[0]?.[0]?.[0]??""}`;if(!E.has(q)){E.add(q);for(const N of fa(D.geometry))N.length<4||T.push({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:Ma(N,Se)}})}}h.setData({type:"FeatureCollection",features:T})},Te=h=>{Se=Math.round(h);const T=Se>=1;for(const[E,D]of[["boundaries-line",!T],["boundaries-smooth",T]])if(o.getLayer(E))try{o.setLayoutProperty(E,"visibility",D?"visible":"none")}catch{}Gt()},Ke=()=>{bt&&clearTimeout(bt),bt=setTimeout(()=>{bt=null,Gt()},120)};let ne=null,Ge=null,wt=null,Rt=null,De=!1;const Pt=()=>{ne!==null&&(ze(ne,!1,De),ne=null,De=!1)};let Le=null,Ve=null,st=12,Oe=1.35,lt=180,Be=null,xe=1,Qe=null,ct=null;const M=()=>{if(!o.getLayer("boundaries-label"))return;const h=st*xe,T=Be&&xe!==1?["case",["==",["get","name"],Be],h,st]:st;try{o.setLayoutProperty("boundaries-label","text-size",T)}catch{}},re=h=>{if(h===Be)return;const T=xe,E=h?Oe:1;Be=h||Be;const D=h;nt(),Qe&&cancelAnimationFrame(Qe),ct&&clearTimeout(ct);const q=performance.now(),N=()=>{xe=E,Be=D,M(),D||nt()},j=ae=>{const ie=lt>0?Math.min(1,(ae-q)/lt):1;if(xe=T+(E-T)*La.easeInOutQuad(ie),M(),ie<1){Qe=requestAnimationFrame(j);return}Qe=null,N()};Qe=requestAnimationFrame(j),ct=setTimeout(()=>{ct=null,Qe&&(cancelAnimationFrame(Qe),Qe=null),N()},lt+40)},ee="boundaries-cursor-name";let me=null,ue=!1;const he=()=>{if(o.getLayer("boundaries-label"))try{o.setLayoutProperty("boundaries-label","visibility",ue?"visible":"none")}catch{}},Ie=h=>o.queryRenderedFeatures({layers:["boundaries-label"]}).some(T=>T.properties?.name===h),Ct=(h,T)=>{const E=o.getSource(ee);if(!E)return;const D=typeof h=="string"&&h.trim()!==""?h:null;if(me=D,!D||!T){E.setData(_e);return}const q=((T.lng+180)%360+360)%360-180;E.setData({type:"FeatureCollection",features:[{type:"Feature",properties:{name:D},geometry:{type:"Point",coordinates:[q,T.lat]}}]})},Ze=(h,T=null,E=null)=>{const D=o.getSource("boundaries-glow-src");if(!D)return;const N=(h?fa(h):[]).flatMap(j=>eo(j)).filter(j=>j.length>=4).map(j=>({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:Se>=1?Ma(j,Se):j}}));D.setData({type:"FeatureCollection",features:N}),re(T)},ze=(h,T,E=!1)=>o.setFeatureState(E?{source:"hand-territories",id:h}:{source:"cliopatria",sourceLayer:"boundaries",id:h},{selected:T}),Dt=te.palette,vt=["#39496a","#4a3b63","#37614f","#63503b","#4c6140","#63415a","#3a5570","#56426a","#3f6657","#665445","#414f6e","#5c4258"],zt="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>",ut=(h,T)=>["interpolate",["linear"],["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q7"],1]],89],0,h,88,T],qe={"soft-atlas":{palette:Dt,water:"#c7d4c6",shore:{color:"#5b4a36",width:.7,shadow:"#9fb0b4",shadowWidth:1.8,dy:1.6},land:"#efe6d0",fillOpacity:.55,selected:"#f5c518",hover:"#ecd9a0",line:{color:"#6b5640",width:.8,blur:.3},grid:{color:"#93a18f",opacity:.5,width:.5},hillshade:!0,text:{color:"#3b3326",halo:"#f3ead6"},voyage:"#1f5f8f",paper:.08,vignette:"rgba(80,55,30,0.14)"},antique:{palette:Dt,water:"#dcdcba",shore:{color:"#43301c",width:1,shadow:"#8f7d5c",shadowWidth:2.5,dy:2},land:"#e8d6ac",fillOpacity:.3,selected:"#e0a200",hover:"#d9c089",line:{color:"#4a3420",width:1.7,blur:.25},coast:{color:"#6a5238",opacity:.5,width:.85},river:{color:"#8a9aa0",opacity:.6,width:.7},mountains:!0,forest:!0,hillshade:!0,grid:{color:"#9b9277",opacity:.55,width:.55},text:{color:"#3a2c1a",halo:"#ecdcb8"},voyage:"#274f66",paper:.2,vignette:"rgba(80,55,30,0.3)"},"pen-ink":{palette:Dt,water:"#dedec0",land:"#e6d6ad",fillOpacity:.16,selected:"#c98a00",hover:"#d9c089",shore:{color:"#2f2418",width:1.15,shadow:"#574631",shadowWidth:2.9,dy:2},line:{color:"#3a2c1c",width:ut(.4,1.2),blur:.25},borderSource:{source:"ink-borders",sourceLayer:"ink"},coast:{color:"#5e4a34",opacity:.55,width:.85},river:{color:"#6a7c74",opacity:.55,width:.6},grid:{color:"#8f8c6e",opacity:.45,width:.5},hillshade:!0,mountains:!0,forest:!0,inkLayers:[{color:"#5a4630",width:ut(1.2,2.4),opacity:.1,blur:1.4},{color:"#4a3826",width:ut(.7,1.5),opacity:.18,blur:.6,offset:.4},{color:"#33261a",width:ut(.4,1.2),opacity:.8,blur:.2},{color:"#2a1f12",width:.6,opacity:.32,blur:.1,offset:.4,dash:[3,3],above:!0}],text:{color:"#33271a",halo:"#efe2c4"},voyage:"#2f4e66",paper:.22,vignette:"rgba(80,55,30,0.3)"},satellite:{palette:vt,imagery:!0,water:"#08131f",land:"#26331d",fillOpacity:.22,selected:"#f5c518",hover:"#e8cf94",shore:{color:"#f6efdc",width:.6,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:"#ffd9a0",width:.9,blur:.2},text:{color:"#241a10",halo:"#f2e9d4"},voyage:"#ffce6b",paper:0,vignette:"rgba(0,0,0,0.4)"},earth:{palette:vt,imagery:!0,globe:!0,water:je.water,land:je.land,fillOpacity:.22,selected:je.selected,hover:je.hover,shore:{color:je.coast,width:.6,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:je.line,width:.9,blur:.2},text:{color:je.text,halo:je.halo},voyage:je.voyage,paper:0,vignette:"rgba(0,0,0,0.4)"},night:{palette:vt,water:"#0f1420",shore:{color:"#8a99b8",width:.7,shadow:"#070b12",shadowWidth:2,dy:1.6},land:"#1b2230",fillOpacity:.6,selected:"#f5c518",hover:"#5a6b8c",line:{color:"#8a99b8",width:.6,blur:.2},text:{color:"#e6ecf7",halo:"#10151f"},voyage:"#8fc3ef",paper:0,vignette:"rgba(0,0,0,0.45)"}},xr=h=>{const T=t.parentElement;if(!T)return;let E=T.querySelector("#tm-paper");E||(E=document.createElement("div"),E.id="tm-paper",E.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:5;mix-blend-mode:multiply",E.style.backgroundImage=`url("${zt}")`,T.appendChild(E)),E.style.opacity=String(h.paper);let D=T.querySelector("#tm-vignette");D||(D=document.createElement("div"),D.id="tm-vignette",D.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:6",T.appendChild(D)),D.style.background=`radial-gradient(ellipse 78% 78% at center, rgba(0,0,0,0) 52%, ${h.vignette} 100%)`},Qa=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;let _t=null,$t=null,qa=0;const Ha=()=>{_t=requestAnimationFrame(Ha);const h=performance.now();if(h-qa<55||(qa=h,!$t||!o.getLayer("coast-echo")))return;const T=h/1e3,E=$t.opacity,D=q=>{const N=E*Math.pow(.7,q);return Math.max(.05,N*(.74+.26*Math.sin(T*.9-q*.9)))};o.setPaintProperty("coast-echo","line-opacity",["interpolate",["linear"],["to-number",["get","echo"]],0,D(0),1,D(1),2,D(2),3,D(3)])},Er=h=>{$t=h,!Qa&&!_t&&(_t=requestAnimationFrame(Ha))},Tr=()=>{$t=null,_t&&(cancelAnimationFrame(_t),_t=null)};let la=null;const ca=h=>new Date(Date.UTC(Number.isFinite(h)?h:2e3,5,21,12)),kr=()=>{try{const{lng:h,lat:T}=o.getCenter(),E=He(h,T,0),D=Ot(ca(s.year)),q=E[0]*D[0]+E[1]*D[1]+E[2]*D[2];return Math.max(0,Math.min(1,q*.5+.5))}catch{return 1}},Ar=()=>{if(!window.__tune)return;const h=(d,oe,de)=>{if(o.getLayer(d))try{o.setPaintProperty(d,oe,de)}catch{}},T=["boundaries-label","markers-label"],E=[["Cinzel","Cinzel (map serif)"],["Eagle Lake","Eagle Lake (calligraphy)"],["inter","Inter (plain)"]],D=(d,oe)=>{for(const de of T)if(o.getLayer(de))try{o.setLayoutProperty(de,d,oe)}catch{}},q=(d,oe)=>{for(const de of T)h(de,d,oe)},N={startLng:0,startLat:20,startZoom:.4,endLng:8.23,endLat:46.8,endZoom:4,seconds:3.5},j=()=>(Le||console.warn("[tune] no fleet on this map yet"),Le),ae={colour:S,strength:.55,width:1,blur:6},ie=()=>{h("boundaries-glow","line-color",ae.colour),h("boundaries-glow","line-opacity",ae.strength),h("boundaries-glow","line-width",c(ae.width)),h("boundaries-glow","line-blur",ae.blur)},V={"Poland 1939":{year:1939,match:/^(second )?poland|polish republic/i,camera:{center:[19.4,52.1],zoom:4.4},seeds:[[15,52.3],[20.5,54],[19.6,49.4]]}},$e=12;let pe=null,ha="Poland 1939";const xt=d=>d.geometry.type==="Polygon"?[d.geometry.coordinates]:d.geometry.type==="MultiPolygon"?d.geometry.coordinates:[],Lr=d=>{const oe=o.queryRenderedFeatures({layers:["boundaries-fill"]});if(!oe.length)return null;const de=ve=>{const dt=ve.flatMap(xt);return dt.length?{type:"MultiPolygon",coordinates:dt}:null},we=ne!=null?oe.filter(ve=>ve.id===ne):[];if(we.length)return{geometry:de(we),from:"selected",label:we[0]?.properties?.Name};const Me=d?oe.filter(ve=>d.test(String(ve.properties?.Name??""))):[];if(Me.length)return{geometry:de(Me),from:"preset",label:Me[0]?.properties?.Name};const Ue=new Map;for(const ve of oe){const dt=ve.id??ve.properties?.Name;Ue.set(dt,[...Ue.get(dt)??[],ve])}const ht=[...Ue.values()].sort((ve,dt)=>dt.flatMap(xt).length-ve.flatMap(xt).length)[0],We=ht?de(ht):null;return We?{geometry:We,from:"largest",label:ht[0]?.properties?.Name}:null},Mr=d=>{let oe=180,de=-180,we=90,Me=-90;for(const ht of d.coordinates)for(const[We,ve]of ht[0]??[])We<oe&&(oe=We),We>de&&(de=We),ve<we&&(we=ve),ve>Me&&(Me=ve);const Ue=(de-oe)*.12;return[[oe+Ue,we+(Me-we)*.25],[oe+Ue,(we+Me)/2],[oe+Ue,we+(Me-we)*.75]]},jt=()=>({colour:za,rimColour:$a,opacity:Wa,seconds:ja,curve:Ya,lobeScale:Xa,lobeAmount:Ka,mergeKm:Va,rimKm:Za}),Ga=()=>{const d=V[ha];if(!d)return;ne==null&&(window.__setTimemapYear(d.year),d.camera&&o.jumpTo(d.camera));let oe=0;const de=()=>{const we=Lr(d.match);if(!we){if(++oe<$e){setTimeout(de,400);return}console.warn(`[tune] nothing on screen to advance across at ${d.year}`);return}const{geometry:Me,from:Ue,label:ht}=we,We=Ue==="preset"?d.seeds:Mr(Me);Ue!=="preset"&&console.info(`[tune] advancing across ${ht} (${Ue})`),pe?pe.setOptions(jt()):(pe=ql(o,{beforeId:"boundaries-label",...jt()}),window.__tmAdvance=pe),pe.prepare(Me,We)&&pe.play()};setTimeout(de,400)};let za="#b31217",$a="#4a0505",Wa=.85,ja=4,Ya=.5,Xa=6,Ka=45,Va=120,Za=40;const da=()=>{pe&&(pe.setOptions(jt()),Ga())},Et=()=>{pe&&pe.setOptions(jt())};window.__tune.register("Territory · resting",[{key:"usePalette",label:"Per-country colours",type:"boolean",value:!0,apply:d=>{Z=d,ce()}},{key:"restColour",label:"Colour",type:"color",value:"#5b7fa8",apply:d=>{Ht=d,ce()}},{key:"restOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:d=>{B.normal.opacity=d>0?d:null,ce()}},{key:"restBorderColour",label:"Border",type:"color",value:"#8a99b8",apply:d=>{L.normal.colour=d,$()}},{key:"restBorderWidth",label:"Border width",min:0,max:8,step:.1,value:1,apply:d=>{L.normal.width=d,$()}},{key:"restBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:d=>{L.normal.blur=d,$()}}],{tab:"Map"}),window.__tune.register("Territory · hover",[{key:"hoverColour",label:"Colour",type:"color",value:te.hover,apply:d=>{B.hover.colour=d,ce()}},{key:"hoverOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:d=>{B.hover.opacity=d>0?d:null,ce()}},{key:"hoverBorderColour",label:"Border",type:"color",value:"#ecd9a0",apply:d=>{L.hover.colour=d,$()}},{key:"hoverBorderWidth",label:"Border width",min:0,max:8,step:.1,value:2,apply:d=>{L.hover.width=d,$()}},{key:"hoverBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:d=>{L.hover.blur=d,$()}}],{tab:"Map"}),window.__tune.register("Territory · active",[{key:"activeColour",label:"Colour",type:"color",value:te.selected,apply:d=>{B.active.colour=d,ce()}},{key:"activeOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:d=>{B.active.opacity=d>0?d:null,ce()}},{key:"activeBorderColour",label:"Border",type:"color",value:"#f5c518",apply:d=>{L.active.colour=d,$()}},{key:"activeBorderWidth",label:"Border width",min:0,max:8,step:.1,value:2,apply:d=>{L.active.width=d,$()}},{key:"activeBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:d=>{L.active.blur=d,$()}}],{tab:"Map"}),window.__tune.register("Voyages",[{key:"voyageColour",label:"Route",type:"color",value:"#20618f",apply:d=>K("voyage-line","line-color",d)},{key:"voyageWidth",label:"Route width",min:.2,max:8,step:.1,value:1.7,apply:d=>K("voyage-line","line-width",d)},{key:"voyageOpacity",label:"Route opacity",min:0,max:1,step:.05,value:.85,apply:d=>K("voyage-line","line-opacity",d)},{key:"voyageBlur",label:"Route softness",min:0,max:4,step:.1,value:0,apply:d=>K("voyage-line","line-blur",d)},{key:"voyageLabelColour",label:"Name",type:"color",value:"#20618f",apply:d=>K("voyage-label","text-color",d)},{key:"voyageLabelHalo",label:"Name halo",type:"color",value:"#f3ead6",apply:d=>K("voyage-label","text-halo-color",d)},{key:"voyageLabelHaloWidth",label:"Name halo width",min:0,max:4,step:.1,value:1.2,apply:d=>K("voyage-label","text-halo-width",d)},{key:"voyageLabelSize",label:"Name size",min:6,max:28,step:.5,value:11.5,apply:d=>{if(o.getLayer("voyage-label"))try{o.setLayoutProperty("voyage-label","text-size",d)}catch{}}},{key:"voyageHitWidth",label:"Hover tolerance",min:4,max:40,step:1,value:Gr,apply:d=>K("voyage-hit","line-width",d)}],{tab:"Map"}),window.__tune.register("Advance",[{key:"play",label:"Play advance",type:"button",apply:Ga},{key:"seconds",label:"Seconds",min:1,max:15,step:.5,value:4,apply:d=>{ja=d,Et()}},{key:"curve",label:"Slowdown (0.5 = liquid, 1 = linear)",min:.25,max:1,step:.05,value:.5,apply:d=>{Ya=d,Et()}},{key:"colour",label:"Colour",type:"color",value:"#b31217",apply:d=>{za=d,Et()}},{key:"rimColour",label:"Leading edge",type:"color",value:"#4a0505",apply:d=>{$a=d,Et()}},{key:"rimKm",label:"Leading edge depth (km)",min:0,max:200,step:5,value:40,apply:d=>{Za=d,Et()}},{key:"opacity",label:"Opacity",min:0,max:1,step:.05,value:.85,apply:d=>{Wa=d,Et()}},{key:"lobeAmount",label:"Lobe depth (km)",min:0,max:150,step:5,value:45,apply:d=>{Ka=d,da()}},{key:"lobeScale",label:"Lobe count",min:1,max:20,step:1,value:6,apply:d=>{Xa=d,da()}},{key:"mergeKm",label:"Front merge (km)",min:0,max:400,step:10,value:120,apply:d=>{Va=d,da()}},{key:"clear",label:"Clear",type:"button",apply:()=>pe?.clear()}],{tab:"Map"}),window.__tune.register("Territory labels",[{key:"resting",label:"Names at rest",type:"boolean",value:!1,apply:d=>{ue=d,he()}},{key:"font",label:"Font",type:"select",options:E,value:"Cinzel",apply:d=>D("text-font",[d])},{key:"size",label:"Size",min:6,max:32,step:.5,value:12,apply:d=>{st=d,M()}},{key:"hoverScale",label:"Hover scale",min:1,max:2.5,step:.05,value:1.35,apply:d=>{Oe=d}},{key:"hoverMs",label:"Hover speed (ms)",min:0,max:800,step:10,value:180,apply:d=>{lt=d}},{key:"tracking",label:"Letter spacing",min:0,max:.4,step:.01,value:.06,apply:d=>D("text-letter-spacing",d)},{key:"caps",label:"Small caps",type:"boolean",value:!0,apply:d=>D("text-transform",d?"uppercase":"none")},{key:"haloWidth",label:"Halo width",min:0,max:5,step:.25,value:2,apply:d=>q("text-halo-width",d)},{key:"haloBlur",label:"Halo softness",min:0,max:4,step:.25,value:.5,apply:d=>q("text-halo-blur",d)}],{tab:"Map"}),window.__tune.register("Territory borders",[{key:"lineOpacity",label:"Border opacity",min:0,max:1,step:.05,value:1,apply:d=>{J["boundaries-line.line-opacity"]=d,U=d,Ee(s.year)}},{key:"labelColor",label:"Label",type:"color",value:"#e6ecf7",apply:d=>{J["boundaries-label.text-color"]=d,K("boundaries-label","text-color",d)}},{key:"labelHalo",label:"Label halo",type:"color",value:"#10151f",apply:d=>{J["boundaries-label.text-halo-color"]=d,K("boundaries-label","text-halo-color",d)}}],{tab:"Map"}),window.__tune.register("Hand-drawn territories",[{key:"handShow",label:"Show",type:"boolean",value:!0,apply:d=>{for(const oe of["hand-fill","hand-line"])if(o.getLayer(oe))try{o.setLayoutProperty(oe,"visibility",d?"visible":"none")}catch{}}},{key:"handEdgeColour",label:"Edge",type:"color",value:te.line.color,apply:d=>{J["hand-line.line-color"]=d,K("hand-line","line-color",d)}},{key:"handEdgeWidth",label:"Edge width",min:0,max:4,step:.1,value:1,apply:d=>{A.width=d,h("hand-line","line-width",G())}},{key:"handDash",label:"Dash length",min:.5,max:8,step:.25,value:2,apply:d=>{A.dash=d,h("hand-line","line-dasharray",Q())}},{key:"handOpacityMedium",label:"Edge opacity · medium",min:0,max:1,step:.02,value:.7,apply:d=>{A.opacityMedium=d,Ee(s.year)}},{key:"handOpacityLow",label:"Edge opacity · low",min:0,max:1,step:.02,value:.42,apply:d=>{A.opacityLow=d,Ee(s.year)}},{key:"handBlurMedium",label:"Edge softness · medium",min:0,max:8,step:.2,value:1.4,apply:d=>{A.blurMedium=d,h("hand-line","line-blur",m())}},{key:"handBlurLow",label:"Edge softness · low",min:0,max:8,step:.2,value:3.2,apply:d=>{A.blurLow=d,h("hand-line","line-blur",m())}}],{tab:"Map"}),window.__tune.register("Hover glow",[{key:"glowColour",label:"Glow",type:"color",value:S,apply:d=>{ae.colour=d,ie()}},{key:"glowStrength",label:"Strength",min:0,max:1,step:.05,value:.55,apply:d=>{ae.strength=d,ie()}},{key:"glowWidth",label:"Width",min:.2,max:4,step:.1,value:1,apply:d=>{ae.width=d,ie()}},{key:"glowBlur",label:"Softness",min:0,max:20,step:.5,value:6,apply:d=>{ae.blur=d,ie()}}],{tab:"Map"}),window.__tune.register("Rounded corners",[{key:"smoothing",label:"Rounding",min:0,max:8,step:1,value:0,apply:Te},{key:"smoothWidth",label:"Width",min:0,max:6,step:.1,value:te.line.width,apply:d=>h("boundaries-smooth","line-width",d)},{key:"smoothOpacity",label:"Opacity",min:0,max:1,step:.05,value:te.line.opacity,apply:d=>h("boundaries-smooth","line-opacity",d)},{key:"smoothColour",label:"Colour",type:"color",value:te.line.color,apply:d=>h("boundaries-smooth","line-color",d)}],{tab:"Map"}),window.__tune.register("Ground",[{key:"exaggeration",label:"Heightmap",min:0,max:12,step:.25,value:0,apply:d=>{try{o.setTerrain(d>0?{source:"dem",exaggeration:d}:null)}catch{}}}],{tab:"Map"}),window.__tune.register("Ships",[{key:"lapSeconds",label:"Seconds per lap",min:20,max:900,step:5,value:45,apply:d=>j()?.setLapSeconds(d)},{key:"shipScale",label:"Size",min:.2,max:3,step:.05,value:1,apply:d=>j()?.setShipScale(d)},{key:"anchored",label:"Scale with zoom",type:"boolean",value:!0,apply:d=>j()?.setShipScale(void 0,d)},{key:"nightDim",label:"Night dimming",min:0,max:1,step:.05,value:0,apply:d=>j()?.setNightDim(d,kr())},{key:"motion",label:"Idle rock",min:0,max:1,step:.05,value:1,apply:d=>j()?.setMotion(d)}],{tab:"Camera"}),window.__tune.register("Framing",[{key:"bottomInset",label:"Bottom inset",type:"number",min:0,max:400,step:2,value:0,apply:d=>{const oe=Math.max(0,Number(d)||0);v=oe>0,t.style.top=`-${oe}px`,t.style.height=`calc(100% + ${oe}px)`,o.resize()}},{key:"autoInset",label:"Auto-centre above the deck",type:"boolean",value:!0,apply:d=>{x=d,v=!1,d?R():(t.style.top="0px",t.style.height="",o.resize())}}],{tab:"Camera"}),window.__tune.register("Tilt and turn",[{key:"pitch",label:"Pitch",min:0,max:85,step:1,value:45,apply:d=>o.easeTo({pitch:Number(d),duration:0})},{key:"bearing",label:"Bearing",min:-180,max:180,step:1,value:0,apply:d=>o.easeTo({bearing:Number(d),duration:0})},{key:"minPitch",label:"Min pitch",type:"number",min:0,max:85,step:1,value:0,apply:d=>o.setMinPitch(Number(d))},{key:"maxPitch",label:"Max pitch",type:"number",min:0,max:85,step:1,value:70,apply:d=>o.setMaxPitch(Number(d))}],{tab:"Camera"}),window.__tune.register("Zoom limits",[{key:"minZoom",label:"Min zoom",type:"number",min:0,max:22,step:.1,value:o.getMinZoom(),apply:d=>o.setMinZoom(Number(d))},{key:"maxZoom",label:"Max zoom",type:"number",min:0,max:22,step:.1,value:o.getMaxZoom(),apply:d=>o.setMaxZoom(Number(d))}],{tab:"Camera"}),window.__tune.register("Entrance",[{key:"startLng",label:"Start lng",type:"number",step:.1,value:N.startLng,apply:d=>{N.startLng=Number(d)}},{key:"startLat",label:"Start lat",type:"number",step:.1,value:N.startLat,apply:d=>{N.startLat=Number(d)}},{key:"startZoom",label:"Start zoom",min:0,max:8,step:.05,value:N.startZoom,apply:d=>{N.startZoom=d}},{key:"endLng",label:"End lng",type:"number",step:.1,value:N.endLng,apply:d=>{N.endLng=Number(d)}},{key:"endLat",label:"End lat",type:"number",step:.1,value:N.endLat,apply:d=>{N.endLat=Number(d)}},{key:"endZoom",label:"End zoom",min:0,max:10,step:.05,value:N.endZoom,apply:d=>{N.endZoom=d}},{key:"seconds",label:"Seconds",min:.5,max:12,step:.25,value:N.seconds,apply:d=>{N.seconds=d}},{key:"jumpStart",type:"button",label:"Go to start",apply:()=>o.jumpTo({center:[N.startLng,N.startLat],zoom:N.startZoom})},{key:"play",type:"button",label:"Play entrance",apply:()=>{o.jumpTo({center:[N.startLng,N.startLat],zoom:N.startZoom}),setTimeout(()=>o.flyTo({center:[N.endLng,N.endLat],zoom:N.endZoom,duration:N.seconds*1e3,essential:!0}),120)}}],{tab:"Camera"}),Gl()};let Wt=null;window.__tmSetClouds=h=>{const T=Math.max(0,Math.min(1,Number(h)));Wt&&Wt.setOptions({opacity:T});try{localStorage.setItem("tm-clouds",String(T))}catch{}};let Je="soft-atlas";const ua=h=>{(h==="ink-art"||h==="inkart")&&(h="pen-ink"),qe[h]||console.warn(`[timemap] no map style "${h}" — falling back to soft-atlas. Defined: ${Object.keys(qe).join(", ")}`);const T=qe[h]?h:"soft-atlas",E=qe[T];Je=T;try{localStorage.setItem("tm-style",T)}catch{}const D=!!E.imagery,q=(j,ae)=>{o.getLayer(j)&&o.setLayoutProperty(j,"visibility",ae?"visible":"none")};q("satellite",D),q("satellite-detail",D);for(const j of["land","coast-shadow","lakes","lake-line","lake-shadow"])q(j,!D);o.getLayer("coast-bold")&&o.setPaintProperty("coast-bold","line-opacity",D?.4:1),o.setPaintProperty("water","background-color",E.water),o.getLayer("lakes")&&o.setPaintProperty("lakes","fill-color",E.water);{const j=E.shore||{color:E.line.color,shadow:"#574631"};o.getLayer("lake-line")&&o.setPaintProperty("lake-line","line-color",j.color),o.getLayer("lake-shadow")&&o.setPaintProperty("lake-shadow","line-color",j.shadow)}o.setPaintProperty("land","fill-color",E.land);const N=E.shore||{color:E.line.color,width:.9,shadow:"#574631",shadowWidth:2.4,dy:2};if(o.getLayer("coast-bold")&&(o.setPaintProperty("coast-bold","line-color",N.color),o.setPaintProperty("coast-bold","line-width",N.width)),o.getLayer("coast-shadow")&&(o.setPaintProperty("coast-shadow","line-color",N.shadow),o.setPaintProperty("coast-shadow","line-width",N.shadowWidth),o.setPaintProperty("coast-shadow","line-translate",[0,N.dy??2])),o.getLayer("coast-echo")&&(E.coast?(o.setLayoutProperty("coast-echo","visibility","visible"),o.setPaintProperty("coast-echo","line-color",E.coast.color),o.setPaintProperty("coast-echo","line-width",E.coast.width??.6),Er(E.coast)):(o.setLayoutProperty("coast-echo","visibility","none"),Tr())),o.getLayer("rivers"))if(E.river){o.setLayoutProperty("rivers","visibility","visible"),o.setPaintProperty("rivers","line-color",E.river.color),o.setPaintProperty("rivers","line-opacity",E.river.opacity??.55);const j=E.river.width??.6;o.setPaintProperty("rivers","line-width",["interpolate",["linear"],["to-number",["get","scalerank"]],1,j+.5,6,j*.5])}else o.setLayoutProperty("rivers","visibility","none");if(o.getLayer("hillshade")&&o.setLayoutProperty("hillshade","visibility",E.hillshade?"visible":"none"),o.getLayer("graticule")&&(E.grid?(o.setLayoutProperty("graticule","visibility","visible"),o.setPaintProperty("graticule","line-color",E.grid.color),o.setPaintProperty("graticule","line-opacity",E.grid.opacity??.5),o.setPaintProperty("graticule","line-width",E.grid.width??.6)):o.setLayoutProperty("graticule","visibility","none")),o.getLayer("mountains")&&o.setLayoutProperty("mountains","visibility",E.mountains?"visible":"none"),o.getLayer("forests")&&o.setLayoutProperty("forests","visibility",E.forest?"visible":"none"),o.getLayer("land-scatter")&&o.setLayoutProperty("land-scatter","visibility",E.forest?"visible":"none"),Mn(o,!!E.mountains),o.getLayer("boundaries-fill")){U=J["boundaries-line.line-opacity"]??(E.line&&E.line.opacity!=null?E.line.opacity:1),ce(),K("boundaries-line","line-color",E.line.color),K("boundaries-line","line-width",E.line.width),K("boundaries-line","line-blur",E.line.blur),o.setLayoutProperty("boundaries-line","line-join","round");const j=Se>=1;o.setLayoutProperty("boundaries-line","visibility",E.borderSource||j?"none":"visible"),K("hand-line","line-color",E.line.color),K("boundaries-label","text-color",E.text.color),K("boundaries-label","text-halo-color",E.text.halo)}o.getLayer("markers-label")&&(o.setPaintProperty("markers-label","text-color",E.text.color),o.setPaintProperty("markers-label","text-halo-color",E.text.halo)),Hr(o,{color:E.voyage,halo:E.text&&E.text.halo});for(let j=0;j<6;j++)o.getLayer(`ink-${j}`)&&o.removeLayer(`ink-${j}`);if(o.getLayer("boundaries-line")){const j=E.borderSource&&E.borderSource.source||"cliopatria",ae=E.borderSource&&E.borderSource.sourceLayer||"boundaries",ie=E.borderSource?pt(s.year):z(s.year);(E.inkLayers||[]).forEach((V,$e)=>{const pe={id:`ink-${$e}`,type:"line",source:j,"source-layer":ae,filter:ie,layout:{"line-join":"round","line-cap":"round"},paint:{"line-color":V.color,"line-width":V.width,"line-opacity":V.opacity??1,"line-blur":V.blur??0,...V.offset!=null?{"line-offset":V.offset}:{},...V.dash?{"line-dasharray":V.dash}:{}}};V.above?o.addLayer(pe,o.getLayer("boundaries-label")?"boundaries-label":void 0):o.addLayer(pe,"boundaries-line")})}xr(E)};window.__applyMapStyle=ua,window.__tmShowGlow=Ze,window.__tmSetRounding=Te,window.__timemapSoundOn=(()=>{try{return localStorage.getItem("tm-sound")==="1"}catch{return!1}})();let be=null;const It=h=>{const T=be;window.dispatchEvent(new CustomEvent("timemap-audio",{detail:{visible:!!(h&&T),playing:!!(T&&!T.paused&&!T.ended),currentTime:T&&T.currentTime||0,duration:T&&isFinite(T.duration)?T.duration:0}}))};window.__timemapStopSpeak=()=>{if(be){try{be.pause()}catch{}be=null}It(!1)},window.__timemapToggleSpeak=()=>{be&&(be.paused?be.play().catch(()=>{}):be.pause(),It(!0))},window.__timemapSeek=h=>{be&&isFinite(be.duration)&&(be.currentTime=Math.max(0,Math.min(1,h))*be.duration,It(!0))},window.__timemapSpeak=(h,T)=>{if(window.__timemapStopSpeak(),!window.__timemapSoundOn||!h||!T)return;const E=(document.querySelector("meta[name=csrf-token]")||{}).content||"";fetch("/teacher/timemap/speak",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":E},body:JSON.stringify({id:h,text:T})}).then(D=>D.ok?D.json():{}).then(D=>{!D||!D.url||!window.__timemapSoundOn||(be=new Audio(D.url),["loadedmetadata","timeupdate","play","pause"].forEach(q=>be.addEventListener(q,()=>It(!0))),be.addEventListener("ended",()=>window.__timemapStopSpeak()),be.play().catch(()=>{}),It(!0))}).catch(()=>{})},window.__timemapAudioTeardownBound||(window.__timemapAudioTeardownBound=!0,document.addEventListener("livewire:navigating",()=>window.__timemapStopSpeak&&window.__timemapStopSpeak()),window.addEventListener("pagehide",()=>window.__timemapStopSpeak&&window.__timemapStopSpeak())),o.on("load",()=>{o.addLayer({id:"boundaries-fill",type:"fill",source:"cliopatria","source-layer":"boundaries",paint:{"fill-color":b,"fill-opacity":_,"fill-opacity-transition":{duration:150}}}),o.addLayer({id:"hand-fill",type:"fill",source:"hand-territories",paint:{"fill-color":b,"fill-opacity":_,"fill-opacity-transition":{duration:150}}}),o.addLayer({id:"boundaries-smooth",type:"line",source:yt,layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":te.line.color,"line-width":te.line.width,"line-opacity":te.line.opacity}}),o.addLayer({id:"boundaries-glow",type:"line",source:"boundaries-glow-src",filter:["==",["geometry-type"],"LineString"],layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":S,"line-width":H,"line-blur":6,"line-opacity":.55,"line-opacity-transition":{duration:140}}}),o.addLayer({id:"boundaries-line",type:"line",source:"cliopatria","source-layer":"boundaries",paint:{"line-color":te.line.color,"line-width":te.line.width,"line-opacity":te.line.opacity}}),o.addLayer({id:"hand-line",type:"line",source:"hand-territories",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":te.line.color,"line-width":G(),"line-opacity":Y(),"line-blur":m(),"line-dasharray":Q()}}),o.addLayer({id:"rivers",type:"line",source:"rivers","source-layer":"rivers",filter:["<=",["to-number",["get","scalerank"]],5],layout:{visibility:"none","line-cap":"round","line-join":"round"},paint:{"line-color":"#6a7c74","line-width":.6,"line-opacity":.6}}),o.addSource("labels",{type:"geojson",data:{type:"FeatureCollection",features:[]}}),o.addLayer({id:"boundaries-label",type:"symbol",source:"labels",layout:{"icon-image":["get","flag"],"icon-size":.13,"icon-anchor":"bottom","icon-allow-overlap":!1,"icon-optional":!0,"text-field":["get","name"],"text-font":["Cinzel"],"text-transform":"uppercase","text-letter-spacing":.06,"text-size":12,"text-anchor":"top","text-offset":[0,.55],"text-allow-overlap":!1,"text-optional":!0,"text-padding":6,"symbol-sort-key":["case",["get","sel"],0,["get","hov"],0,1]},paint:{"text-color":te.text.color,"text-halo-color":te.text.halo,"text-halo-width":2,"text-halo-blur":.5,"icon-translate":[0,-9]}}),o.addLayer({id:"boundaries-cursor-label",type:"symbol",source:"boundaries-cursor-name",layout:{"text-field":["get","name"],"text-font":["Cinzel"],"text-transform":"uppercase","text-letter-spacing":.06,"text-size":12,"text-anchor":"bottom","text-offset":[0,-1.1],"text-allow-overlap":!0,"text-ignore-placement":!0},paint:{"text-color":te.text.color,"text-halo-color":te.text.halo,"text-halo-width":2,"text-halo-blur":.5}});const h=()=>(qe[Je]||{}).land||te.land;kn(o,{beforeId:"boundaries-label",visibility:"none"}).then(()=>xn(o,{beforeId:"boundaries-label",visibility:"none",landColor:h()})).then(()=>wn(o,{beforeId:"boundaries-label",visibility:"none",landColor:h()})).then(()=>Ln(o,{beforeId:"boundaries-label",visibility:"none"})).then(()=>ua(Je)),o.addSource("markers",{type:"geojson",data:Dn}),o.addLayer({id:"markers-dot",type:"circle",source:"markers",paint:{"circle-radius":4,"circle-color":"#cbbfa6","circle-stroke-color":"#6b5a3e","circle-stroke-width":1.4,"circle-opacity":.85}}),o.addLayer({id:"markers-label",type:"symbol",source:"markers",layout:{"text-field":["get","name"],"text-size":14,"text-font":["Cinzel"],"text-transform":"uppercase","text-offset":[0,.9],"text-anchor":"top","text-allow-overlap":!1,"text-optional":!0,"text-letter-spacing":.06},paint:{"text-color":"#6b5a3e","text-halo-color":"#f3ead6","text-halo-width":1.2}},o.getLayer("boundaries-label")?"boundaries-label":void 0);let T=.5;try{const D=parseFloat(localStorage.getItem("tm-clouds"));Number.isFinite(D)&&(T=Math.min(1,Math.max(0,D)))}catch{}la=Cl(o,{date:ca(s.year),reduceMotion:Qa}),Wt=la.layers.clouds,Wt?.setOptions({opacity:T}),Ar(),Qr(o,{year:s.year,beforeId:Ca,labelBeforeId:"boundaries-label"}),Ve=ci(o,{ships:()=>Le,locale:document.documentElement.lang||"en",transportNames:JSON.parse(t.dataset.transportNames||"{}")}),Rr(async()=>{const{addVoyageShips:D}=await import("./voyage-ships-kuJNjZ85.js");return{addVoyageShips:D}},[]).then(({addVoyageShips:D})=>{Le=D(o,{beforeId:Ca}),Le.setYear(s.year),window.__tmShips=Le}).catch(()=>{}),o.on("mouseenter","markers-dot",()=>{o.getCanvas().style.cursor="pointer"}),o.on("mouseleave","markers-dot",()=>{o.getCanvas().style.cursor=""}),o.on("moveend",Xe),o.on("moveend",Ke),o.on("sourcedata",D=>{D.sourceId==="cliopatria"&&D.isSourceLoaded&&Xe()});let E=null;try{E=localStorage.getItem("tm-style")}catch{}ua(E||"soft-atlas"),St(s.year);for(const D of fe)o.getLayer(D)&&(o.on("mousemove",D,q=>{if(o.getCanvas().style.cursor="pointer",!q.features.length)return;if(q.features[0].id===gt){me&&Ct(me,q.lngLat);return}gt=q.features[0].id;const N=q.features[0].properties,j=N.Wikidata?Sa.get(`${N.Wikidata}|${N.Name}`)||N.Wikidata:null;Ze(q.features[0].geometry,N.Name??null,j);const ae=N.Name??null,ie=ae&&(!ue||!Ie(ae));Ct(ie?ae:null,q.lngLat)}),o.on("mouseleave",D,()=>{o.getCanvas().style.cursor="",gt=null,Ze(null),Ct(null)}));s.ready=!0,i()}),o.on("click",h=>{const T=[[h.point.x-7,h.point.y-7],[h.point.x+7,h.point.y+7]],E=o.queryRenderedFeatures(T,{layers:["markers-dot"]})[0];if(E){ne!==null&&(Pt(),Ne()),Ve?.clear();const V=E.properties;s.selectedRegion=V.id,i(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:V.id,name:V.name,qid:V.qid,articleUrl:V.article_url,summary:V.summary,inception:V.inception,dissolution:V.dissolution}}));return}const D=o.getLayer("voyage-hit")&&o.queryRenderedFeatures(h.point,{layers:["voyage-hit"]})[0];if(D){ne!==null&&(Pt(),Ne());const V=D.properties;Ve?.select(V.id),s.selectedRegion=V.qid,i(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:V.qid,name:String(V.name).replace(/\s+—\s+/g,": "),qid:V.qid,voyageId:V.id}}));return}Ve?.clear();const q=o.queryRenderedFeatures(h.point,{layers:fe.filter(V=>o.getLayer(V))})[0],N=!!q?.properties?.hand;Pt(),ne=q?q.id:null,Ge=q?h.lngLat:null,wt=q?q.properties?.Name??null:null,De=N,ne!==null&&ze(ne,!0,N),Ne();const j=q?q.properties.Wikidata:null,ae=q?q.properties.Name:null,ie=j?Sa.get(`${j}|${ae}`)||j:null;s.selectedRegion=ie,i(),qt?.cancel(),qt=q?qr(o,{id:"polity-sweep",lines:fa(q.geometry).flatMap(V=>eo(V)).filter(V=>V.length>=4),durationMs:2e3,beforeId:o.getLayer("boundaries-label")?"boundaries-label":void 0}):null,window.dispatchEvent(new CustomEvent("polity-selected",{detail:N?{id:ie,name:ae,qid:ie,hand:!0,territoryId:q.properties.id,inception:Number(q.properties.FromYear),dissolution:Number(q.properties.ToYear),provenance:Hn(q.properties.id)}:{id:ie,name:ae,qid:ie}}))});const Sr=()=>{if(ne===null||!Ge)return;const h=o.project(Ge);if(!Number.isFinite(h.x)||!Number.isFinite(h.y))return;const T=fe.filter(ae=>o.getLayer(ae));if(!T.length)return;const E=o.queryRenderedFeatures(h,{layers:T})[0];if(!E||E.id===ne)return;const D=wt;ze(ne,!1),ne=E.id,ze(ne,!0);const q=E.properties?.Name??null,N=E.properties?.Wikidata??null,j=N?Sa.get(`${N}|${q}`)||N:null;wt=q,s.selectedRegion=j,Ne(),i(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:j,name:q,qid:j,succeeded:!0,previousName:D}}))};return t._setYear=h=>(s.year=h,r.year=h,St(h),i(),clearTimeout(Rt),Rt=setTimeout(Sr,320),No(h)),t._setFadeMode=h=>{ot=!!h,Ee(s.year)},t._tmMap=o,window.__tmMap=o,window.__timemapClearSelection=()=>{ne!==null&&(ze(ne,!1),ne=null,Ne()),Ve?.clear(),s.selectedRegion=null,i()},o};window.mountAtlasSlider=function(e,t,r,n){let i=0,o=null;const l=u=>{if(!t._setYear)return;const y=performance.now(),x=100-(y-i);clearTimeout(o),x<=0?(i=y,t._setYear(u)):o=setTimeout(()=>{i=performance.now(),t._setYear(u)},x)},a=ln(e,{min:-4e3,max:2010,value:r,labels:n,spans:$l(),onYear:u=>l(u),onPlay:u=>{t._setFadeMode&&t._setFadeMode(u)}});hn(document.querySelector("[data-timemap-year-flash]")),gn(),window.__setTimemapYear=u=>{const y=Math.round(Number(u));Number.isNaN(y)||(a.setYear(y),t._setYear&&t._setYear(y))}};window.__timemapLoadVoyage=e=>fi(e,document.documentElement.lang||"en");function _r(e){const t=/\/wiki\/([^?#]+)/.exec(e||"");return t?decodeURIComponent(t[1]):null}window.__timemapWikiSummary=async e=>{if(!e||!e.includes("wikipedia.org"))return null;const t=_r(e);if(!t)return null;try{const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(t));if(!r.ok)return null;const n=await r.json();return{thumbnail:n.thumbnail?.source||null,extract:n.extract||null}}catch{return null}};window.__timemapWikiLead=async e=>{if(!e||!e.includes("wikipedia.org"))return null;const t=_r(e);if(!t)return null;try{const r="https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&format=json&origin=*&titles="+encodeURIComponent(t),n=await fetch(r);if(!n.ok)return null;const s=await n.json(),i=s.query&&s.query.pages||{},o=Object.values(i)[0];return o&&o.extract||null}catch{return null}};window.__timemapHydratePanel=(e,t)=>{e.thumb=null,e.lead=null,e.leadLoading=!1,e.leadFailed=!1,t&&t.wikipedia_url&&window.__timemapWikiSummary(t.wikipedia_url).then(r=>{e.thumb=r&&r.thumbnail||null})};window.__timemapPanelReadMore=(e,t)=>{!t||!t.wikipedia_url||(e.leadLoading=!0,e.leadFailed=!1,window.__timemapWikiLead(t.wikipedia_url).then(r=>{r?e.lead=r:e.leadFailed=!0,e.leadLoading=!1}))};function $l(){return(Fa.voyages??[]).filter(t=>Number.isFinite(t.year_start)&&Number.isFinite(t.year_end)&&t.year_end-t.year_start<=50).map(t=>({start:t.year_start,end:t.year_end,label:String(t.name).replace(/\s+—\s+/g,": ")}))}
