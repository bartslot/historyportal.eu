import{_ as qr}from"./vite-helpers-DqutJMZx.js";import{m as ot,a as le,s as Hr,S as Gr,b as zr,D as $r,c as Wr,E as Xe}from"./map-imagery-Bp93pHDe.js";import{E as ta,a as Da}from"./easing-HS2C6-zA.js";import{t as jr,a as Yr,S as qo,v as Qt,s as ea,b as ro,E as ia,m as Ia,c as Xr,d as Kr,i as Vr,e as Zr,o as ba,w as no,f as Jr,V as en,g as tn}from"./border-sweep-1nNDyhtT.js";import{p as an}from"./tuner-CTMYYJl-.js";import"./i18n-DoByrmTl.js";function Ho(e,t=new Date().getFullYear()){return t-e}function on(e,t=new Date().getFullYear(),r=25){return Math.trunc(Ho(e,t)/r)}function Go(e,t=new Date().getFullYear()){const r=Ho(e,t).toLocaleString("en-US"),n=on(e,t);return`≈ ${r} years ago · ~${n} generations`}const rn=(e,t)=>{const r=getComputedStyle(document.documentElement).getPropertyValue(e),n=parseFloat(r);return Number.isFinite(n)?n:t},Ce=(e,t)=>{const r=getComputedStyle(document.documentElement).getPropertyValue(e).trim(),n=parseFloat(r);return Number.isFinite(n)?r.endsWith("rem")?n*parseFloat(getComputedStyle(document.documentElement).fontSize):n:t},io=e=>e<0?`${Math.abs(e)} BCE`:String(e),nn=e=>e<0?`${Math.abs(e)} BCE`:`${e} CE`,so=e=>e<0?"BCE":"CE",sn='<path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"/>',ln='<path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>',cn=24,Vt="var(--scrubber-tick-height)",un=.12,hn=.3,wa=400,lo=.45,dn=90,fn={play:"Play timeline",pause:"Pause timeline",track:"Timeline year",year:"Year (negative for BCE)"},co=4,mn=1,pn=3,gn=6.6,yn=8,zo=[8,22];function bn(e,{min:t,pxPerYear:r}){const n=[],i=zo.map(()=>-1/0);return[...e].filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)).sort((s,o)=>s.start-o.start).map(s=>{const o=(s.start-t)*r,l=Math.max(2,(s.end-s.start+1)*r);let a=n.findIndex(T=>T<=o);a<0&&(a=Math.min(n.length,pn-1)),n[a]=Math.max(n[a]??-1/0,o+l);const u=String(s.label??"").length*gn,y=s.label?i.findIndex(T=>T<=o):-1;return y>=0&&(i[y]=o+u+yn),{...s,x:o,w:l,lane:a,labelRow:y,showLabel:y>=0}})}function wn(e,{min:t,max:r,value:n,onYear:i,onPlay:s,labels:o,spans:l=[]}){const a={...fn,...o??{}},u=M=>Math.min(r,Math.max(t,M));let y=u(Math.round(n)),T=rn("--scrubber-px-per-year",4);e.classList.add("select-none"),e.innerHTML=`
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
        <svg class="tm-ic-play h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">${sn}</svg>
        <svg class="tm-ic-pause h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" style="display:none">${ln}</svg>
      </button>
      <label class="tm-year-badge flex h-[30px] cursor-text items-center gap-0.5 rounded-md border border-scrubber-badge-edge bg-scrubber-badge px-2">
        <input type="number" inputmode="numeric"
               class="tm-year-input w-[5ch] bg-transparent text-right font-mono text-scrubber-num tracking-[0.8px] tabular-nums text-scrubber-year outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
               min="${t}" max="${r}" step="1" value="${y}" aria-label="${a.year}">
        <span class="tm-era-suffix lp-card-label lp-card-label-sm">${so(y)}</span>
      </label>
    </div>`;const v=e.querySelector(".tm-year-input"),I=e.querySelector(".tm-era-suffix"),g=e.querySelector(".tm-year-badge"),m=e.querySelector(".tm-track"),w=e.querySelector(".tm-scroll"),x=e.querySelector(".tm-strip");w.style.scrollbarWidth="none";const L=new Map,d=[],c=[],O=Math.ceil(t/10)*10,U=e.querySelector(".tm-years");let A=0;const Y=()=>{const M=((A-w.scrollLeft)%T+T)%T;U.style.backgroundPositionX=`${M}px`},p=()=>{const M=m.clientWidth/2;x.style.width=`${(r-t)*T+M*2}px`,x.style.paddingLeft=`${M}px`,x.innerHTML="",L.clear(),c.length=0,st=null,U.style.height="var(--scrubber-year-tick-height)",U.style.backgroundImage=`repeating-linear-gradient(90deg, var(--color-scrubber-tick) 0 var(--scrubber-year-tick-width), transparent var(--scrubber-year-tick-width) ${T}px)`,A=M,Y(),S(),nt();const ne=Math.ceil(t/10)*10;for(let ae=ne;ae<=r;ae+=10){const me=ae%100===0,ue=M+(ae-t)*T,he=document.createElement("div");if(he.className=me?"absolute top-0 w-[1.5px] rounded-[3px] bg-scrubber-tick-major":"absolute top-0 w-px rounded-[3px] bg-scrubber-tick",he.style.left=`${ue}px`,he.style.height=Vt,x.appendChild(he),c.push(he),!me)continue;const Fe=document.createElement("span");Fe.className="absolute -translate-x-1/2 whitespace-nowrap text-scrubber-num font-semibold tabular-nums text-scrubber-tick-major",Fe.style.left=`${ue}px`,Fe.style.top="var(--scrubber-label-top)",Fe.style.lineHeight="calc(var(--scrubber-height) - var(--scrubber-label-top))",Fe.textContent=io(ae),x.appendChild(Fe),L.set(ae,Fe)}d.length=0;for(const ae of bn(l,{min:t,pxPerYear:T})){const me=ae.lane*(co+mn),ue=document.createElement("div");ue.className="pointer-events-none absolute rounded-[1px] bg-primary transition-opacity duration-200",Object.assign(ue.style,{left:`${M+ae.x}px`,width:`${ae.w}px`,top:`${me}px`,height:`${co}px`}),x.appendChild(ue);let he=null;ae.showLabel&&(he=document.createElement("span"),he.className="pointer-events-none absolute whitespace-nowrap text-xs leading-none text-scrubber-tick-major transition-opacity duration-200",Object.assign(he.style,{left:`${M+ae.x}px`,top:`${zo[ae.labelRow]}px`}),he.textContent=ae.label,x.appendChild(he)),d.push({start:ae.start,end:ae.end,bar:ue,text:he})}H()},H=()=>{for(const{start:M,end:ne,bar:ae,text:me}of d){const ue=y>=M&&y<=ne;ae.style.opacity=ue?"1":"0.55",me&&(me.style.opacity=ue?"1":"0.7")}};let G=un,z=hn,C=z,D=!1,k=null,N=0,b=null,j=0,Q=0,J=0;const S=()=>{U.style.transition=`opacity ${D?140:220}ms ${D?ta.enter:ta.exit}`,U.style.opacity=D?"1":"0"},X=M=>{M!==D&&(D=M,S())},R=M=>{const ne=w.scrollLeft;Q+=Math.abs(ne-j),j=ne;const ae=M-J;if(ae>=dn&&(C=C*lo+Q/ae*(1-lo),Q=0,J=M,X(C<G?!0:C>z?!1:D)),!qe&&M>N){k=null,C=z,X(!1);return}k=requestAnimationFrame(R)},$=()=>{if(qe){b=setTimeout($,wa);return}C=z,X(!1)},ee=M=>{N=M+wa,clearTimeout(b),b=setTimeout($,wa),k===null&&(Q=0,J=M,j=w.scrollLeft,C=z,k=requestAnimationFrame(R))},K=M=>Math.round(M/T)*T,B=140,Ae=220;let fe=-1,ce=0,Se=0,Ie=0,rt=0,Te=null,gt=!1,Lt=30,Mt=44,Ht=112;const nt=()=>{Lt=Ce("--scrubber-tick-height",30),Mt=Ce("--scrubber-magnify-height",44),Ht=Ce("--scrubber-magnify-radius",112)},Rt=M=>M*M*(3-2*M),ua=()=>{const M=Lt,ne=Mt,ae=Ht,ue=m.clientWidth/2-w.scrollLeft,he=10*T,Fe=Math.max(0,Math.floor((-ue-(O-t)*T)/he)),It=Math.min(c.length-1,Math.ceil((m.clientWidth-ue-(O-t)*T)/he));for(let Je=Fe;Je<=It;Je++){const je=c[Je];if(!je)continue;const Ut=ue+(O+Je*10-t)*T,_t=Math.abs(Ut-fe),jt=fe>=0&&_t<ae?Rt(1-_t/ae):0,ht=jt>0?`${(M+(ne-M)*jt*ce).toFixed(1)}px`:Vt;je.style.height!==ht&&(je.style.height=ht)}gt=!0},ha=()=>{for(const M of c)M.style.height!==Vt&&(M.style.height=Vt);gt=!1},Pt=M=>{const ne=Math.min(1,(M-rt)/(Ie>Se?B:Ae)),ae=Ie>Se?Da.easeOutCubic(ne):Da.easeInCubic(ne);if(ce=Se+(Ie-Se)*ae,ce>0?ua():gt&&ha(),ne>=1&&ce===0){Te=null;return}Te=requestAnimationFrame(Pt)},it=M=>{fe=M<0?-1:M-m.getBoundingClientRect().left;const ne=fe>=0?1:0;ne!==Ie&&(Se=ce,Ie=ne,rt=performance.now()),Te===null&&(Te=requestAnimationFrame(Pt))};w.addEventListener("pointermove",M=>it(M.clientX)),w.addEventListener("pointerleave",()=>it(-1)),w.addEventListener("pointercancel",()=>it(-1));const Qe=()=>window.dispatchEvent(new CustomEvent("timemap-scrub",{detail:{year:y,label:io(y)}}));let st=null;const Gt=()=>{const M=Math.round(y/100)*100,ne=L.get(M),me=!!ne&&Math.abs((M-y)*T)<cn?ne:null;st&&st!==me&&(st.style.visibility=""),me&&(me.style.visibility="hidden"),st=me};let Ve=!1;const yt=()=>u(t+Math.round(w.scrollLeft/T)),zt=M=>(M-t)*T,bt=()=>{v.value=String(y),I.textContent=so(y),g.setAttribute("data-tooltip",Go(y)),m.setAttribute("aria-valuenow",String(y)),m.setAttribute("aria-valuetext",nn(y)),Gt(),H()},_e=(M,{fireYear:ne=!0}={})=>{y=u(Math.round(M)),bt(),Ve=!0,w.scrollLeft=zt(y),Y(),j=w.scrollLeft,requestAnimationFrame(()=>{Ve=!1}),ne&&i(y)},Le=e.querySelector(".tm-play"),wt=e.querySelector(".tm-ic-play"),$t=e.querySelector(".tm-ic-pause"),Wt=100;let ke=!1,Ze=null,ie=0,We=0;const vt=()=>{wt.style.display=ke?"none":"",$t.style.display=ke?"":"none",Le.setAttribute("aria-pressed",ke?"true":"false"),Le.setAttribute("aria-label",ke?a.pause:a.play),Le.setAttribute("data-tooltip",ke?a.pause:a.play)},Ct=M=>{if(ke){if(We&&(ie+=Wt*Math.min(M-We,100)/1e3),We=M,ie>=r){_e(r),Ue();return}_e(ie),Ze=requestAnimationFrame(Ct)}},Ue=()=>{ke&&(ke=!1,Ze!==null&&cancelAnimationFrame(Ze),Ze=null,We=0,vt(),s&&s(!1))},Dt=()=>{ke||(ke=!0,y>=r&&_e(t),ie=y,We=0,vt(),s&&s(!0),Ze=requestAnimationFrame(Ct))};Le.addEventListener("click",()=>ke?Ue():Dt());let xe=!1;w.addEventListener("scroll",()=>{Ve||(ee(performance.now()),!xe&&(xe=!0,requestAnimationFrame(()=>{xe=!1,Y();const M=yt();M!==y&&(y=M,bt(),Qe(),i(y))})))}),w.addEventListener("scrollend",()=>{if(qe||Ve)return;const M=K(w.scrollLeft);M!==w.scrollLeft&&_e(t+M/T,{fireYear:!1})});let Me=0,lt=0,qe=!1;w.addEventListener("pointerdown",M=>{Ue(),qe=!0,Me=M.clientX,lt=w.scrollLeft,w.setPointerCapture(M.pointerId),w.classList.replace("cursor-grab","cursor-grabbing"),ee(performance.now())}),w.addEventListener("pointermove",M=>{qe&&(w.scrollLeft=K(lt-(M.clientX-Me)))});const ct=()=>{qe&&(qe=!1,w.classList.replace("cursor-grabbing","cursor-grab"),_e(yt()))};w.addEventListener("pointerup",ct),w.addEventListener("pointercancel",ct),v.addEventListener("input",()=>{Ue();const M=parseInt(v.value,10);Number.isNaN(M)||_e(M)}),v.addEventListener("change",()=>_e(parseInt(v.value,10)||y)),m.addEventListener("keydown",M=>{const ne={ArrowLeft:-1,ArrowRight:1,PageDown:-10,PageUp:10}[M.key];ne!==void 0&&(M.preventDefault(),Ue(),_e(y+ne),Qe())}),p(),bt(),requestAnimationFrame(()=>{_e(y,{fireYear:!1})});const He=new ResizeObserver(()=>{p(),_e(y,{fireYear:!1})});He.observe(m);const Ee=(M,ne,ae="px")=>document.documentElement.style.setProperty(M,`${ne}${ae}`),Ge=()=>{p(),_e(y,{fireYear:!1})},ut=window.__tune?.register("Time scrubber",[{key:"width",label:"Bar width",min:480,max:1400,step:5,value:Ce("--scrubber-width",875),apply:M=>Ee("--scrubber-width",M)},{key:"height",label:"Bar height",min:32,max:88,step:1,value:Ce("--scrubber-height",47),apply:M=>Ee("--scrubber-height",M)},{key:"tickHeight",label:"Tick height",min:8,max:64,step:1,value:Ce("--scrubber-tick-height",30),apply:M=>{Ee("--scrubber-tick-height",M),nt()}},{key:"labelTop",label:"Label baseline",min:8,max:72,step:1,value:Ce("--scrubber-label-top",36),apply:M=>Ee("--scrubber-label-top",M)},{key:"bandWidth",label:"Centre band",min:0,max:640,step:4,value:Ce("--scrubber-band-width",268),apply:M=>Ee("--scrubber-band-width",M)},{key:"yearTickHeight",label:"Year ticks",min:0,max:30,step:1,value:Ce("--scrubber-year-tick-height",8),apply:M=>Ee("--scrubber-year-tick-height",M)},{key:"yearTickWidth",label:"Year tick width",min:.5,max:2,step:.25,value:Ce("--scrubber-year-tick-width",1),apply:M=>Ee("--scrubber-year-tick-width",M)},{key:"magnifyHeight",label:"Magnify to",min:30,max:47,step:1,value:Ce("--scrubber-magnify-height",44),apply:M=>{Ee("--scrubber-magnify-height",M),nt()}},{key:"magnifyRadius",label:"Magnify reach",min:20,max:300,step:5,value:Ce("--scrubber-magnify-radius",112),apply:M=>{Ee("--scrubber-magnify-radius",M),nt()}},{key:"fineAt",label:"Years in below",min:5,max:200,step:5,value:Math.round(G/T*1e3),apply:M=>{G=M*T/1e3,z=G*2.5}},{key:"showYears",type:"button",label:"Flash the years",apply:()=>{X(!0),setTimeout(()=>X(!1),1500)}},{key:"pxPerYear",label:"Pixels per year",min:1,max:10,step:.5,value:T,apply:M=>{T=M,document.documentElement.style.setProperty("--scrubber-px-per-year",String(M)),Ge()}}],{tab:"Map"});return{setYear:M=>{Ue(),_e(M,{fireYear:!1})},destroy:()=>{He.disconnect(),Ue(),clearTimeout(b),k!==null&&cancelAnimationFrame(k),Te!==null&&cancelAnimationFrame(Te),ut&&ut()}}}const uo=1e3,vn=120,_n=420;function xn(e){if(!e)return()=>{};document.fonts?.load("600 1em History").catch(()=>{});let t=null,r=uo;const n=()=>{e.style.transition=`opacity ${_n}ms ${ta.exit}`,e.style.opacity="0"},i=l=>{e.textContent=l,e.style.transition=`opacity ${vn}ms ${ta.enter}`,e.style.opacity="1",clearTimeout(t),t=setTimeout(n,r)},s=l=>i(l.detail?.label??"");window.addEventListener("timemap-scrub",s);const o=window.__tune?.register("Year flash",[{key:"size",label:"Size",min:16,max:160,step:2,value:parseFloat(getComputedStyle(e).fontSize)||56,apply:l=>document.documentElement.style.setProperty("--scrubber-flash-size",`${l}px`)},{key:"hold",label:"Hold (ms)",min:200,max:4e3,step:100,value:uo,apply:l=>{r=l}},{key:"preview",type:"button",label:"Show it",apply:()=>i(e.textContent||"1600")}],{tab:"Map"});return()=>{window.removeEventListener("timemap-scrub",s),clearTimeout(t),o&&o()}}const En="/sound/sfx/scrubber.mp3",$o=.04,Tn=28,kn=.45;function An(e){const t=e.getChannelData(0),r=Math.max(1,Math.round(e.sampleRate*5e-4)),n=[];for(let a=0;a+r<=t.length;a+=r){let u=0;for(let y=0;y<r;y++)u+=t[a+y]*t[a+y];n.push(Math.sqrt(u/r))}const i=Math.max(...n,1e-9),s=[];let o=!0;for(let a=0;a<n.length;a++)if(o&&n[a]>i*.1){const u=Math.max(0,a-2);s.push({at:u*r/e.sampleRate,level:n[a],from:a}),o=!1}else!o&&n[a]<i*.02&&(o=!0);const l=Math.round($o*e.sampleRate/r);for(const a of s)a.level=Math.max(...n.slice(a.from,a.from+l));return s.map(({at:a,level:u})=>({at:a,level:u}))}function Sn({volume:e=kn}={}){const t=window.AudioContext||window.webkitAudioContext;if(!t)return{destroy:()=>{}};let r=null,n=null,i=[],s=[],o=null,l=null,a=0,u=0,y=e;const v=(async()=>{try{const w=await fetch(En);if(!w.ok)return;if(r=new t,n=await r.decodeAudioData(await w.arrayBuffer()),i=An(n),!i.length){n=null;return}const x=[...i].sort((L,d)=>L.level-d.level);l=x[x.length-1],o=x[Math.floor((x.length-1)/2)],s=x.slice(0,Math.max(1,Math.floor(x.length/2)))}catch{n=null}})(),I=w=>{const x=r.createBufferSource();x.buffer=n;const L=r.createGain();L.gain.value=y,x.connect(L).connect(r.destination),x.start(0,w.at,$o)},g=w=>{if(!n||y<=0)return;const x=performance.now();if(x-u<Tn)return;u=x,r.state==="suspended"&&r.resume();const L=w.detail?.year??0;I(L%100===0?l:L%10===0?o:s[a++%s.length])};window.addEventListener("timemap-scrub",g);const m=window.__tune?.register("Scrub tick",[{key:"volume",label:"Volume",min:0,max:1,step:.05,value:y,apply:w=>{y=w}},{key:"try",type:"button",label:"Year · decade · century",apply:async()=>{await v,n&&(r.state==="suspended"&&r.resume(),[s[0],o,l].forEach((w,x)=>setTimeout(()=>w&&I(w),x*220)))}}],{tab:"Map"});return{destroy:()=>{window.removeEventListener("timemap-scrub",g),m&&m(),r&&r.close().catch(()=>{})}}}const Wo="/timemap/assets/mountains/",Ln="/timemap/mountains-points.geojson",va=4;async function Mn(e,t){let r;try{const u=await fetch(`${Wo}${t}.svg`);if(!u.ok)return;r=await u.text()}catch{return}const i=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,s=(i.getAttribute("viewBox")||"0 0 24 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((s[2]||24)*va)),l=Math.max(1,Math.round((s[3]||16)*va)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(i));await new Promise(u=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:va})}catch{}u()},y.onerror=()=>u(),y.src=a})}async function Rn(e,t={}){const{beforeId:r,opacity:n=1,visibility:i="visible"}=t;if(e.getLayer("mountains"))return;let s;try{s=await fetch(Wo+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!s||typeof s!="object"||ot(e))return;const o=[...new Set(Object.values(s).flat())];await Promise.all(o.map(a=>Mn(e,a)));let l;try{l=await fetch(Ln).then(a=>a.json())}catch{return}ot(e)||(e.getSource("mountains")?e.getSource("mountains").setData(l):e.addSource("mountains",{type:"geojson",data:l}),!e.getLayer("mountains")&&e.addLayer({id:"mountains",type:"symbol",source:"mountains",layout:{visibility:i,"icon-image":["coalesce",["get","icon"],"m-medium-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-rotation-alignment":"viewport","icon-rotate":["coalesce",["get","rot"],0],"icon-size":["interpolate",["linear"],["zoom"],2,["*",.2,["coalesce",["get","sz"],1]],5,["*",.46,["coalesce",["get","sz"],1]],7,["*",.66,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const jo="/timemap/assets/forests/",Pn="/timemap/forest-points.geojson",_a=4;async function Cn(e,t){let r;try{const u=await fetch(`${jo}${t}.svg`);if(!u.ok)return;r=await u.text()}catch{return}const i=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,s=(i.getAttribute("viewBox")||"0 0 16 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((s[2]||16)*_a)),l=Math.max(1,Math.round((s[3]||16)*_a)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(i));await new Promise(u=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:_a})}catch{}u()},y.onerror=()=>u(),y.src=a})}async function Dn(e,t={}){const{beforeId:r,opacity:n=1,visibility:i="visible"}=t;if(e.getLayer("forests"))return;let s;try{s=await fetch(jo+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!s||typeof s!="object"||ot(e))return;const o=[...new Set(Object.values(s).flat())];await Promise.all(o.map(a=>Cn(e,a)));let l;try{l=await fetch(Pn).then(a=>a.json())}catch{return}ot(e)||(e.getSource("forests")?e.getSource("forests").setData(l):e.addSource("forests",{type:"geojson",data:l}),!e.getLayer("forests")&&e.addLayer({id:"forests",type:"symbol",source:"forests",layout:{visibility:i,"icon-image":["coalesce",["get","icon"],"g-small-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-size":["interpolate",["linear"],["zoom"],2,["*",.45,["coalesce",["get","sz"],1]],4,["*",.78,["coalesce",["get","sz"],1]],6,["*",1.05,["coalesce",["get","sz"],1]],7,["*",1.25,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const Yo="/timemap/assets/scatter/",In="/timemap/land-scatter.geojson",xa=4;async function Un(e,t){let r;try{const u=await fetch(`${Yo}${t}.svg`);if(!u.ok)return;r=await u.text()}catch{return}const i=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,s=(i.getAttribute("viewBox")||"0 0 16 16").split(/\s+/).map(Number),o=Math.max(1,Math.round((s[2]||16)*xa)),l=Math.max(1,Math.round((s[3]||16)*xa)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(i));await new Promise(u=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:xa})}catch{}u()},y.onerror=()=>u(),y.src=a})}async function Fn(e,t={}){const{beforeId:r,opacity:n=.9,visibility:i="visible"}=t;if(e.getLayer("land-scatter"))return;let s;try{s=await fetch(Yo+"manifest.json").then(a=>a.ok?a.json():null)}catch{}if(!s||typeof s!="object"||ot(e))return;const o=[...new Set(Object.values(s).flat())];await Promise.all(o.map(a=>Un(e,a)));let l;try{l=await fetch(In).then(a=>a.json())}catch{return}ot(e)||(e.getSource("land-scatter")?e.getSource("land-scatter").setData(l):e.addSource("land-scatter",{type:"geojson",data:l}),!e.getLayer("land-scatter")&&e.addLayer({id:"land-scatter",type:"symbol",source:"land-scatter",layout:{visibility:i,"icon-image":["coalesce",["get","icon"],"s-tree-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-rotation-alignment":"viewport","icon-rotate":["coalesce",["get","rot"],0],"icon-size":["interpolate",["linear"],["zoom"],2,["*",.34,["coalesce",["get","sz"],1]],5,["*",.8,["coalesce",["get","sz"],1]],7,["*",1.1,["coalesce",["get","sz"],1]]]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}const Xo="/timemap/assets/volcanoes/",Nn="/timemap/volcanoes.geojson",Ea=4;async function On(e,t){let r;try{const u=await fetch(`${Xo}${t}.svg`);if(!u.ok)return;r=await u.text()}catch{return}const i=new DOMParser().parseFromString(r,"image/svg+xml").documentElement,s=(i.getAttribute("viewBox")||"0 0 24 18").split(/\s+/).map(Number),o=Math.max(1,Math.round((s[2]||24)*Ea)),l=Math.max(1,Math.round((s[3]||18)*Ea)),a="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(i));await new Promise(u=>{const y=new Image(o,l);y.onload=()=>{try{e.hasImage(t)?e.updateImage(t,y):e.addImage(t,y,{pixelRatio:Ea})}catch{}u()},y.onerror=()=>u(),y.src=a})}async function Bn(e,t={}){const{beforeId:r,opacity:n=1,visibility:i="visible"}=t;if(e.getLayer("volcanoes"))return;let s;try{s=await fetch(Xo+"manifest.json").then(l=>l.ok?l.json():null)}catch{}if(!s?.ids||ot(e))return;await Promise.all(s.ids.map(l=>On(e,l)));let o;try{o=await fetch(Nn).then(l=>l.json())}catch{return}ot(e)||(e.getSource("volcanoes")?e.getSource("volcanoes").setData(o):e.addSource("volcanoes",{type:"geojson",data:o}),!e.getLayer("volcanoes")&&e.addLayer({id:"volcanoes",type:"symbol",source:"volcanoes",layout:{visibility:i,"icon-image":["coalesce",["get","icon"],"v-0"],"icon-anchor":"bottom","icon-allow-overlap":!0,"icon-ignore-placement":!0,"icon-size":["interpolate",["linear"],["zoom"],2,.5,5,1.2,7,1.7]},paint:{"icon-opacity":n}},e.getLayer(r)?r:void 0))}function Qn(e,t){e.getLayer("volcanoes")&&e.setLayoutProperty("volcanoes","visibility",t?"visible":"none")}const qn="FeatureCollection",Hn="Curated point markers for regions/peoples OpenHistoricalMap leaves blank. Label-only (no borders); clickable to start a lesson. Two enrichment modes: (a) `qid` = precise Wikidata enrichment via the endpoint; (b) `article_url` (+ optional `summary`, `inception`, `dissolution`) = a curated external article (e.g. worldhistory.org), rendered directly with no server call. decdate = numeric year, negative for BCE.",Gn=[{type:"Feature",geometry:{type:"Point",coordinates:[2.6,46.8]},properties:{id:"gaul",name:"Gaul",qid:"Q38060",start_decdate:-600,end_decdate:-51}},{type:"Feature",geometry:{type:"Point",coordinates:[10,51]},properties:{id:"germania",name:"Germania",qid:"Q62646",start_decdate:-750,end_decdate:400}},{type:"Feature",geometry:{type:"Point",coordinates:[-1.8,52.5]},properties:{id:"britannia",name:"Britannia",qid:"Q849967",start_decdate:-600,end_decdate:400}}],zn={type:qn,_note:Hn,features:Gn},$n=JSON.parse(`[{"id":"cherusci","name":"Cherusci","qid":"Q268307","from":-30,"to":300,"shape":{"spine":[[9.179779286914936,52.267083561476284],[9.305414828022947,52.268511238079725],[9.383937041215347,52.267083561476284],[9.448182488372765,52.267083561476284],[9.52813237816855,52.267083561476284],[9.609509944568003,52.26565588487267],[9.67232771512181,52.26565588487267],[9.76369901774575,52.26565588487267]],"radius_km":110,"radius_note":"The middle Weser basin around the label, out to the Teutoburg ridge in the west and the northern Harz in the south-east. It deliberately stops short of the Elbe, which several sources reach — see the disagreements."},"provenance":{"summary":"Roughly right, edges guessed. The scholarly atlas prints the name across the middle Weser but draws no border, so the position is solid and the extent is ours.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line — no source draws an edge here, so neither do we.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/98939","grade":"A","year":2000,"note":"Map 10 F4. Gives the exact line the name is printed along, dated 30 BCE - 300 CE. It prints a name, not a border."},{"key":"tacitus","title":"Tacitus, Germania 36 and Annals 1.60 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/5/59/62-70","grade":"A","year":98,"note":"A primary source, and propaganda: Tacitus never went to Germania and wrote partly to shame Rome. He gives neighbours, not distances - Chatti to the south-west, Chauci to the north."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"A specialist historical-GIS project with a published bibliography. Maps the Cherusci at 1 CE as a bounded political entity."},{"key":"wikipedia","title":"Wikipedia, 'Cherusci', with the Commons map 'Lower Rhine 10BC.png'","url":"https://en.wikipedia.org/wiki/Cherusci","grade":"D","year":2025,"note":"The map on the article is credited 'own work' with no source in its file description, which is what puts it at D. Its text is well referenced; its map is not."}],"disagreements":[{"source":"euratlas","says":"Draws the Cherusci with a hard political border. The Barrington Atlas draws none at all. A crisp frontier here is a claim nobody can support - Germanic peoples had no surveyed borders."},{"source":"tacitus","says":"Implies the Cherusci reached east towards the Elbe and the Suebi beyond it. Our shape stops well short of the Elbe, so we are drawing them smaller than the written record allows."},{"source":"wikipedia","says":"Places them 'around the middle of the Weser' and stretching towards the Elbe - the same eastward reach we left out."}]}},{"id":"chatti","name":"Chatti","qid":"Q164076","from":-30,"to":300,"shape":{"spine":[[8.381212344516712,50.59658494521722],[8.521124651659477,50.69652230746209],[8.623917367111403,50.77647219725793],[8.753652521243907,50.86987099894725],[8.864297458015017,50.95374699940277],[9.04989541646978,51.08580708522635]],"radius_km":85,"radius_note":"The Hessian uplands the label runs through - the Eder, Fulda and Lahn valleys between the Wetterau and the Kassel basin. Smaller than the others because the label itself is drawn across a compact upland, not a plain."},"provenance":{"summary":"The firmest of this set. The atlas line, the Roman writers and the modern maps all put the Chatti in the same place - what is now Hesse.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/108885","grade":"A","year":2000,"note":"Map 11 I2. The label runs south-west to north-east across Hesse, dated 30 BCE - 300 CE."},{"key":"tacitus","title":"Tacitus, Germania 30-31 and 36 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/35/359-365","grade":"A","year":98,"note":"A primary source, and propaganda. Puts the Chatti where the Hercynian forest begins, on higher and harder ground than their neighbours - which matches the uplands the atlas label crosses."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps the Chatti at 1 CE as a bounded political entity in the same region."},{"key":"wikipedia","title":"Wikipedia, 'Chatti'","url":"https://en.wikipedia.org/wiki/Chatti","grade":"C","year":2025,"note":"'A region approximately corresponding to the modern German state of Hesse' - well referenced text, and it agrees with the atlas."}],"disagreements":[{"source":"barrington-awmc","says":"The Pleiades record's own summary describes the Chatti homeland as 'the valley of the Weser River'. The Eder and Fulda do drain into the Weser system, but the peoples' heartland is the Hessian uplands, not the Weser valley proper. We follow the atlas LINE, not that sentence."},{"source":"euratlas","says":"Draws a hard political border. The atlas draws none."}]}},{"id":"marcomanni","name":"Marcomanni","qid":"Q209851","from":-9,"to":300,"date_note":"The atlas dates its label 30 BCE - 300 CE, but the shape it marks is BOHEMIA, and the Marcomanni only moved into Bohemia under Maroboduus around 9 BCE. Dating a Bohemian shape to 30 BCE would put the people somewhere they were not yet, so the start is the migration, not the label.","shape":{"spine":[[13.571490978850932,50.51861793959273],[13.876061987597211,50.48245013230428],[14.0683224368683,50.459607306648195],[14.26248645494394,50.43486091218767],[14.449036197800922,50.40821094892232],[14.656525197509382,50.36633243521959],[14.86020705960857,50.328261059126305],[15.04866037127016,50.286382545423805],[15.254245802174012,50.2387933253072],[15.456024095468365,50.18549339877649]],"radius_km":90,"radius_note":"The Bohemian basin the label crosses. Note the label runs along the NORTHERN rim of that basin, so a symmetric radius around it reaches over the Ore Mountains into Saxony and stops short of southern Bohemia. Both edges are wrong in the same way and by the same amount, which is what one honest rule costs; neither is a frontier."},"provenance":{"summary":"Good for the Marcomannic Wars, wrong if you scrub back before 9 BCE. This is their Bohemian homeland - before that they lived further west and we do not draw them there.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line, checked against the Bohemian basin the label sits in.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/118831","grade":"A","year":2000,"note":"Map 12 G2. The label runs north-west to south-east across northern Bohemia."},{"key":"tacitus","title":"Tacitus, Germania 42 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268#42","grade":"A","year":98,"note":"A primary source, and propaganda. Names the Marcomanni and Quadi as the front rank facing the Danube, and says the Marcomanni took their land by driving out the Boii."},{"key":"tir-m33","title":"Tabula Imperii Romani M33: Castra Regina - Vindobona - Carnuntum","url":"http://www.worldcat.org/oclc/311333372","grade":"A","year":1986,"note":"The scholarly atlas sheet for this stretch of the Danube frontier, pp. 55-58. Cited by Pleiades for this people; consulted through that citation rather than the sheet itself."},{"key":"wikipedia","title":"Wikipedia, 'Marcomanni'","url":"https://en.wikipedia.org/wiki/Marcomanni","grade":"C","year":2025,"note":"Well referenced text: originally near the central Elbe and Saale or in Franconia, moving to Bohemia after a defeat around 9 BCE."}],"disagreements":[{"source":"wikipedia","says":"Puts their ORIGINAL home near the central Elbe and Saale, or possibly Franconia - hundreds of kilometres west of where we draw them. That is a disagreement about the date, not the place: we draw the Bohemia they moved to, and start the shape at the move."},{"source":"barrington-awmc","says":"Dates its label from 30 BCE, twenty years before the migration it marks. We start at 9 BCE instead."}]}},{"id":"suebi-elbe","name":"Suebi","qid":"Q155085","from":-330,"to":400,"shape":{"spine":[[10.994832142162466,53.10370205112616],[11.297023689902744,52.85385864551398],[11.534969790485775,52.658742843035895],[11.751500742016333,52.45648865754032],[12.001344147628515,52.20902471293397],[12.208971949229067,52.01315739735486],[12.393380177180916,51.83469782191759],[12.631326277763947,51.638392288936586],[12.827631810744947,51.471830018528465],[13.012040038696796,51.317165053149495],[13.220242876706948,51.10301356262477]],"radius_km":140,"radius_note":"The middle Elbe corridor the label follows. Wider than the others because the label itself is 250 km long, and still far smaller than anything Tacitus describes."},"provenance":{"summary":"Treat this one with caution. 'Suebi' was an umbrella for many peoples spread over half of Germania, so no single shape is right. This is their Elbe homeland only - it is where the name starts, not where the Suebi were.","confidence":"low","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line. The shape is knowingly narrower than the sources allow, because the alternative - shading half of Europe - would be more misleading, not less.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/99040","grade":"A","year":2000,"note":"Map 10 H3. The label runs 250 km down the middle Elbe, from Mecklenburg to Saxony, dated 330 BCE - 640 CE."},{"key":"tacitus","title":"Tacitus, Germania 38-45 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268","grade":"A","year":98,"note":"A primary source, and propaganda. Treats Suebi as a category rather than a people: he says they hold the greater part of Germania and then lists a dozen separate peoples inside it."},{"key":"caesar","title":"Caesar, Bellum Gallicum 1 and 4 - Ariovistus and the Suebi on the Rhine, 58 BCE","url":"https://en.wikipedia.org/wiki/Suebi","grade":"A","year":-51,"note":"A primary source. Caesar's Suebi are on the RHINE, some 500 km west of the Elbe homeland - consulted through the Wikipedia article's citations rather than the Latin text."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps Suebi at 1 CE as a bounded political entity, alongside separate entities for Cherusci, Chatti and Quadi."}],"disagreements":[{"source":"tacitus","says":"Says the Suebi hold the greater part of Germania - many times the area we shade. Following him would mean colouring in most of central Europe under one name, which is worse history, not better."},{"source":"caesar","says":"Meets Suebi on the Rhine in 58 BCE, roughly 500 km west of anything we draw. Our shape would show nothing at all where Caesar actually fought them."},{"source":"barrington-awmc","says":"Dates the label to 640 CE. We stop at 400, because by then the name has moved to entirely different people in Iberia - Cliopatria already carries that Kingdom of the Suebi (Q1048918) as a separate territory from 414."}]}},{"id":"quadi","name":"Quadi","qid":"Q308885","from":-30,"to":400,"shape":{"spine":[[16.847541814656722,48.9466577607958],[17.124154156584495,48.88122258313547],[17.350202952138375,48.83660768927598],[17.579226073949542,48.79199279541683],[17.867735720906467,48.73548059652836]],"radius_km":65,"radius_note":"The March and lower Vah valleys the label follows. Tighter than the others, and the number was chosen by the Danube rather than by taste: the river is a real southern edge here - it is the Roman frontier - so the radius is the largest one that keeps the shape north of it at Bratislava."},"provenance":{"summary":"The Marcomanni's neighbours and allies in the wars against Marcus Aurelius. Position is solid, extent is ours, and the Danube to the south is a genuine edge rather than a guessed one.","confidence":"medium","chosen_source":"barrington-awmc","method":"Position traced from the Barrington Atlas label linework as published by AWMC/Pleiades. Extent approximated as a soft radius around that line, kept north of the Danube.","drawn_by":"Claude (Opus 5) for The Learning Portal, 12 August 2026","sources":[{"key":"barrington-awmc","title":"Barrington Atlas of the Greek and Roman World, ed. R. Talbert (Princeton UP), georeferenced by the Ancient World Mapping Center","url":"https://pleiades.stoa.org/places/128501","grade":"A","year":2000,"note":"Map 13 B4. The label runs west to east along the March, dated 30 BCE - 640 CE."},{"key":"tacitus","title":"Tacitus, Germania 42 and Annals 2.63 (via the PHI Latin corpus)","url":"http://latin.packhum.org/loc/1351/2/39/260-268#41","grade":"A","year":98,"note":"A primary source, and propaganda. Pairs the Quadi with the Marcomanni as the peoples facing the Danube frontier."},{"key":"tir-m33","title":"Tabula Imperii Romani M33: Castra Regina - Vindobona - Carnuntum","url":"http://www.worldcat.org/oclc/311333372","grade":"A","year":1986,"note":"The scholarly atlas sheet for this stretch of the Danube frontier, pp. 69-71. Cited by Pleiades for this people; consulted through that citation rather than the sheet itself."},{"key":"euratlas","title":"Euratlas Periodis, Europe in the year 1 (C. Nussli)","url":"https://www.euratlas.net/history/europe/1/index.html","grade":"B","year":2010,"note":"Maps the Quadi at 1 CE as a bounded political entity in the same region."}],"disagreements":[{"source":"barrington-awmc","says":"Dates the label to 640 CE, long after the Quadi disappear from the record. We stop at 400, around their move west with the Vandals and Alans."},{"source":"euratlas","says":"Draws a hard political border. The atlas draws none."}]}}]`),Ko={territories:$n},Ta=111.32,ho=64,Wn=e=>e*Math.PI/180,jn=e=>{const t=e.reduce((n,[,i])=>n+i,0)/e.length,r=Ta*Math.cos(Wn(t));return{forward:([n,i])=>[n*r,i*Ta],inverse:([n,i])=>[n/r,i/Ta]}},Yn=e=>{if(e.length<3)return[...e];const t=[...e].sort((i,s)=>i[0]-s[0]||i[1]-s[1]),r=(i,s,o)=>(s[0]-i[0])*(o[1]-i[1])-(s[1]-i[1])*(o[0]-i[0]),n=i=>{const s=[];for(const o of i){for(;s.length>=2&&r(s[s.length-2],s[s.length-1],o)<=0;)s.pop();s.push(o)}return s.pop(),s};return[...n(t),...n([...t].reverse())]},Xn=(e,t)=>{const{forward:r,inverse:n}=jn(e),i=[];for(const o of e){const[l,a]=r(o);for(let u=0;u<ho;u++){const y=u/ho*2*Math.PI;i.push([l+t*Math.cos(y),a+t*Math.sin(y)])}}const s=Yn(i).map(n);return s.length?[...s,s[0]]:s},Kn=e=>({type:"Feature",id:e.id,properties:{id:e.id,Name:e.name,Wikidata:e.qid,FromYear:e.from,ToYear:e.to,Type:"POLITY",hand:!0,confidence:e.provenance.confidence},geometry:{type:"Polygon",coordinates:[Xn(e.shape.spine,e.shape.radius_km)]}}),fo=e=>{let t=0;for(let r=0,n=e.length-1;r<e.length;n=r++)t+=e[n][0]*e[r][1]-e[r][0]*e[n][1];return Math.abs(t/2)},Vn=()=>({type:"FeatureCollection",features:Ko.territories.map(Kn).sort((e,t)=>fo(t.geometry.coordinates[0])-fo(e.geometry.coordinates[0]))}),Zn=e=>Ko.territories.find(t=>t.id===e)??null,Jn=e=>Zn(e)?.provenance??null,ei="#f3ead6",ti="#d8e9f3",ai=["#c9b79c","#a8b9a0","#cbb3a1","#b6a8c0","#c2c0a0","#a9bcc4","#d0bfa8","#b9a99a","#aebfa6","#c8b6b0","#b0b6a0","#bcae9e"],oi="#f5c518",ri="#ecd9a0",ni={normal:.7,selected:.95},ii={color:"#000",width:.4,opacity:.7},si={color:"#3b3326",halo:"#f3ead6"},oe={land:ei,water:ti,palette:ai,selected:oi,hover:ri,fillOpacity:ni,line:ii,text:si},li=[{qid:"Q207162",use:"Q70972",note:"Kingdom of France lineage (990-1847) carries the Bourbon Restoration period item; use the Kingdom of France item"},{qid:"Q112039853",use:"Q12544",note:"Byzantine Empire polygons (633-1474) carry 'Foreign relations of the Byzantine Empire'; use the Byzantine Empire item"},{qid:"Q1179",use:"Q7703611",note:"Aquitaine 629-895 carries the 1960-2015 French administrative region; use the Duchy of Aquitaine"},{qid:"Q124661",use:"Q225890",note:"Strathclyde 644-1033 carries the 1975-1996 Scottish council region; use the Kingdom of Strathclyde"},{qid:"Q1656775",use:"Q37",note:"Interwar 'Kingdom of Lithuania' 1919-1939 carries the 1251-1263 medieval kingdom; use the Lithuania country item"},{qid:"Q751868",use:"Q159856",note:"County of Brabant 1260-1430 carries the 1085-1183 Landgraviate; use the Duchy of Brabant"},{qid:"Q12544",name:"Roman Empire",use:"Q2277",from:-31,to:394,note:"Roman Empire polygons share the Byzantine Empire QID; Eastern Roman Empire (395-632) keeps Q12544"},{qid:"Q1068371",name:"Han Dynasty",use:"Q7209",from:-202,to:237,note:"QID is the Chauhan dynasty (980-1201 keeps it); Han polygons get the Han dynasty item"},{qid:"Q1968654",name:"Han",use:"Q1574130",from:-404,to:-203,note:"QID is the Beylik of Saruhan (1314-1414 keeps it); Warring-States Han state"},{qid:"Q555994",name:"Lu",use:"Q736936",from:-750,to:-248,note:"QID is Aq Qoyunlu (1407-1511 keeps it); Lu state"},{qid:"Q1143524",name:"Qi",use:"Q837855",from:-750,to:-204,note:"QID is Northern Qi (555-576 keeps it); Qi state"},{qid:"Q1471995",name:"Qin",use:"Q34756",from:-750,to:-219,note:"QID is Former Qin (353-393 keeps it); Qin state"},{qid:"Q1472004",name:"Yan",use:"Q1055713",from:-750,to:-204,note:"QID is Former Yan (337-370 keeps it); Yan state"},{qid:"Q1574107",name:"Zhao",use:"Q197430",from:-404,to:-226,note:"QID is Former Zhao (306-336 keeps it); Zhao state"},{qid:"Q320930",name:"Wei",use:"Q912052",from:-404,to:-204,note:"QID is Cao Wei (224-264 keeps it); Warring-States Wei state"},{qid:"Q6201794",name:"Jin",use:"Q912043",from:-750,to:-405,note:"QID is the 10th-century Jin / Later Tang precursor (922-925 keeps it); Spring-and-Autumn Jin state"},{qid:"Q1936158",name:"Yue",use:"Q1137403",from:-500,to:-334,note:"QID is Minyue (-333 to -111 keeps it); Yue state"},{qid:"Q1139807",name:"Portugal",use:"Q45",note:"QID is the County of Portugal (1139-1146 keeps it); modern Portugal polygons (1976-2024) get the Portugal country item, which already has a list row"},{qid:"Q241748",use:"Q2415003",note:"Kingdom of Serbia polygons are 18x medieval (1188-1351) + one 1880-1884; QID is the 1882-1918 kingdom. Medieval item wins; the lone modern segment trades accuracy"},{qid:"Q688918",use:"Q75036",note:"Grand Duchy of Krakow 1279-1293 carries the 1846-1918 grand duchy; use the medieval Seniorate Province"},{qid:"Q79861",use:"Q2605410",note:"Michoacan 1305-1533 carries the modern Mexican state; the polity is the Purepecha (Tarascan) Empire"},{qid:"Q30592233",use:"Q48724193",note:"Pahang 1853-1889 carries the 1470-1623 old sultanate; use the Bendahara-era Pahang Kingdom (1770-1881)"},{qid:"Q109252949",use:"Q158445",note:"Duchy of Mecklenburg 1806-1870 carries the 1471-1701 duchy; use the Grand Duchy of Mecklenburg-Schwerin"},{qid:"Q373981",use:"Q2342941",note:"Tahirid Sultanate (Yemen, 1459-1515) carries the Iranian Tahirid dynasty (821-873); use the Yemeni Tahirid Sultanate"},{qid:"Q970940",use:"Q5311396",note:"Duchy of Leczyca carries the 1339-1793 Leczyca Voivodeship; use the medieval Duchy of Leczyca"},{qid:"Q13522657",use:"Q1541813",note:"County of Rosellon 896-1176 carries the 1659-1790 French province; use the County of Roussillon"},{qid:"Q5582862",use:"Q2314963",note:"Cuzco 1294-1439 carries the modern city of Cusco; the polity is the Kingdom of Cusco"},{qid:"Q1074947",use:"Q2390716",note:"'Kingdom of Pajana' 1572-1587 carries the Lontara script item; the polity is the Kingdom of Pajang (Java)"},{qid:"Q1069868",use:"Q1330290",note:"Southern Liang 397-413 carries the 502-587 Liang dynasty; use Southern Liang of the Sixteen Kingdoms"},{qid:"Q200797",use:"Q517333",note:"Principality of Polotsky carries the city of Polotsk; use the Principality of Polotsk"},{qid:"Q7038",use:"Q1233672",note:"County of Barcelona carries the city of Girona; use the County of Barcelona"},{qid:"Q17151",use:"Q2631829",note:"Commune of the Zealots 1344-1351 carries the city of Thessaloniki; use the Zealots of Thessalonica"},{qid:"Q156173",use:"Q102679",note:"Kingdom of Numidia carries king Jugurtha's biography; use the Numidia kingdom item"},{qid:"Q202266",use:"Q2196956",note:"Old Kingdom of Norway 866-1401 carries Margaret I's biography; use the Kingdom of Norway (872-1397)"},{qid:"Q4334533",use:"Q22684779",note:"Omani Slave Coast 1814-1855 carries the Omanis ethnic-group item; use the Omani Empire (1696-1856)"},{qid:"Q2330335",use:"Q815677",note:"Qarlugs 793-849 carries a Mongol-campaigns article; use the Karluks"},{qid:"Q5261548",use:"Q85816686",note:"Qasimids 1636-1802 carries the broader Rassid line; use the Qasimid State (1597-1849)"},{qid:"Q1050326",use:"Q2114397",note:"Sultan of Yogyakarta 1744-1829 carries the Hamengkubuwono dynasty item; use the Yogyakarta Sultanate"},{qid:"Q654380",use:"Q39047075",note:"Turk Shahis carries a disambiguation page; use the Turk Shahis kingdom item"},{qid:"Q81133615",use:"Q2991084",note:"Angevins 1126-1146 carries a disambiguation page; use the County of Anjou"},{qid:"Q5724",use:"Q13627537",note:"Anuradhapura -291 to 1017 carries the modern city; use the Anuradhapura period (kingdom era)"},{qid:"Q7903",use:"Q808139",note:"Barghawata Conference 793-1065 carries the city of Casablanca; use the Barghawata confederation"},{qid:"Q11256",use:"Q133878465",note:"Cuban Nationalists 1895-1899 carries Fidel Castro's biography; use the Republic of Cuba in Arms (1868-1898)"},{qid:"Q371402",use:"Q11264",note:"Cuban Communists 1958-1959 carries the 1965 Communist Party; use the Cuban Revolution"},{qid:"Q5428692",use:"Q214426",note:"Maderistas 1911 carries a Wikimedia list article; use the Mexican Revolution"},{qid:"Q2984183",use:"Q353227",note:"Duchies of Poland 1279-1304 carries the Testament of Boleslaw III item; use History of Poland during the Piast dynasty"},{qid:"Q1317991",use:"Q430309",note:"Dai Viet 1529-1833 carries the Mac dynasty (1527-1677 only); use the Dai Viet umbrella item"},{qid:"Q15984928",use:"Q371334",note:"Mexican Monarchists 1864 carries the Conservative Party; use the Second Mexican Empire, which already has a list row"},{qid:"Q7777597",use:"Q5760",note:"Thebans -350 to -338 carries a disambiguation page; use Thebes, Greece"},{qid:"Q3125978",use:"Q12491027",note:"Bali 1687-1907 carries the modern Indonesian province; use the Bali Kingdom item, which already has a list row"},{qid:"Q213763",use:"Q3137677",note:"County of Bearn 1385-1452 carries the 1620-1790 French province; use the Viscounty of Bearn"},{qid:"Q43292",use:"Q892292",note:"Sultanate of Bone 1512-1858 carries the generic 'Sultan' title item; use the Bone State (Sulawesi)"},{qid:"Q2118293",use:"Q83328",note:"'Turks' 666-756 carries the legendary Oghuz Khagan biography; use the Turkic peoples item (no single-polity article covers these polygons)"},{qid:"Q1661685",name:"Sasanian Empire",use:"Q83891",from:215,to:643,note:"QID is the Kushano-Sasanian Kingdom ('Indo-Sasanian Empire' 260-357 keeps it); the main Sasanian Empire polygons get the Sasanian Empire item"},{qid:"Q918153",name:"Ceylon",use:"Q20987440",from:1236,to:1506,note:"QID is British Ceylon (1796-1814 polygons keep it); medieval Ceylon gets the Sinhalese monarchy umbrella"},{qid:"Q2118293",name:"Oghuz Turks",use:"Q494462",from:750,to:1055,note:"QID is the legendary Oghuz Khagan; Oghuz Turks polygons get the Oghuz Turks item ('Turks' 666-756 keeps the qid-only override above)"},{qid:"Q350186",name:"Denmark",use:"Q35",from:1945,to:2024,note:"QID is Christopher II of Denmark's biography ('Danish Magnates' 1333-1351 keeps it as interregnum context); modern Denmark polygons get the Denmark country item"},{qid:"Q28513",name:"Hungary",use:"Q28",from:1947,to:2024,note:"QID is Austria-Hungary (1868-1918 polygons keep it); modern Hungary polygons get the Hungary country item, which already has a list row"},{qid:"Q59223",use:"Q197913",note:"Zhongshan (Warring-States, Hebei, -366 to -292) carries the modern Zhongshan city in Guangdong; use the Zhongshan state item"},{qid:"Q983",name:"Guinea",use:"Q1006",from:1960,to:2024,note:"QID is Equatorial Guinea (its 1969-2024 polygons keep it); Guinea-Conakry polygons get the Guinea country item"},{qid:"Q175881",use:"Q17167",note:"Roman Republic polygons (-500 to -32) carry Q175881, the 1798-1799 sister republic of the First French Republic; use the ancient Roman Republic (509-27 BC)"}],ci={overrides:li},Ua={day:0,month:1,year:2},ui=(e,t)=>Ua[e]>=Ua[t]?e:t,mo=e=>e in Ua?e:"day",hi=e=>{const t=mo(e?.date_precision),r=[];for(const n of e?.legs??[]){const[i,s]=Array.isArray(n?.wp)?n.wp:[];for(const[o,l,a]of[[i,n.depart,n.depart_precision],[s,n.arrive,n.arrive_precision]]){const u=Date.parse(l);!Number.isFinite(Number(o))||!Number.isFinite(u)||r.push({wp:Number(o),ms:u,precision:a?mo(a):t})}}return r.sort((n,i)=>n.wp-i.wp||n.ms-i.ms)},po=(e,t)=>{const r=e.cum.length-1,n=Math.max(0,Math.min(r,t)),i=Math.min(r-1,Math.floor(n));return i<0?0:e.cum[i]+(e.cum[i+1]-e.cum[i])*(n-i)},di=(e,t,r)=>{const n=hi(e);if(!n.length||!Array.isArray(t)||t.length<2)return null;const i=Yr(t),s=po(i,r),o=T=>po(i,T.wp*qo),l=1e-9;let a=null,u=null;for(const T of n){const v=o(T);v<=s+l&&(a=T),v>=s-l&&!u&&(u=T)}if(!a||!u)return null;if(a===u||o(u)-o(a)<=l)return{ms:a.ms,precision:a.precision};const y=(s-o(a))/(o(u)-o(a));return{ms:Math.round(a.ms+(u.ms-a.ms)*y),precision:ui(a.precision,u.precision)}},Vo=(e,t="en")=>{if(!e||!Number.isFinite(e.ms))return"";const r=String(t||"en").replace("_","-").toLowerCase()==="en"?"en-GB":t,n=new Date(e.ms),i=n.getUTCFullYear()<=0,s={timeZone:"UTC",year:"numeric"};e.precision!=="year"&&(s.month="long"),e.precision==="day"&&(s.day="numeric"),i&&(s.era="short");try{return new Intl.DateTimeFormat(r,s).format(n)}catch{return new Intl.DateTimeFormat("en-GB",s).format(n)}},fi=(e,t,r)=>{if(!Array.isArray(e)||e.length<2)return null;const n=Math.cos(r*Math.PI/180);let i=null;for(let s=1;s<e.length;s++){const[o,l]=e[s-1],[a,u]=e[s],y=t+360*Math.round((o-t)/360),T=(a-o)*n,v=u-l,I=T*T+v*v,g=I>0?Math.max(0,Math.min(1,((y-o)*n*T+(r-l)*v)/I)):0,m=o+(a-o)*g,w=l+(u-l)*g,x=Math.hypot((y-m)*n,r-w);(!i||x<i.distance)&&(i={sample:s-1+g,lng:m,lat:w,distance:x})}return i},Zo=new Set((jr?.transports??[]).filter(e=>e?.terrain==="land").map(e=>e.id)),Jo=(e,t)=>{const r=t/qo;return(e?.legs??[]).find(n=>{const i=Number(n?.wp?.[0]),s=Number(n?.wp?.[1]??i);return r>=Math.min(i,s)-1e-6&&r<=Math.max(i,s)+1e-6})??null},mi=(e,t)=>{const r=Jo(e,t);return r&&Zo.has(r.transport)?r.transport:null},pi=(e,t)=>{const r=Jo(e,t);return r&&!Zo.has(r.transport)&&r.vessel?String(r.vessel):null},gi=18,yi=450,go=new Map(Qt.voyages.map(e=>[e.id,{voyage:e,coords:ea(e.waypoints)}])),bi=e=>(e.fleet??[]).slice().sort((t,r)=>+!!r.flagship-+!!t.flagship).map(t=>t.name).filter(Boolean).join(", "),wi=e=>{const t=document.createElement("div");t.className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-64 rounded-card bg-card-surface px-3 py-2",t.style.display="none",t.setAttribute("role","status"),t.setAttribute("aria-live","polite"),t.dataset.voyageHoverLabel="";const r=document.createElement("p");r.className="text-xs font-medium leading-snug text-card-muted";const n=document.createElement("p");return n.className="text-prose font-semibold leading-snug text-card-title",t.append(r,n),e.appendChild(t),{el:t,names:r,date:n}};function vi(e,{ships:t,locale:r="en",transportNames:n={},onDwell:i=null}={}){const s=e.getContainer().parentElement||e.getContainer(),o=wi(s);let l=null,a=null,u=null,y=0,T=null,v=null,I=0;const g=()=>{I&&window.clearTimeout(I),I=0,v=null},m=()=>{g(),!T&&(a&&t()?.setTourProgress(a,null),a=null,o.el.style.display="none")},w=(d,c,O,U)=>{const A=di(d.voyage,d.coords,c),Y=mi(d.voyage,c);o.names.textContent=Y&&n[Y]||pi(d.voyage,c)||bi(d.voyage)||d.voyage.name,o.date.textContent=A?Vo(A,r):String(d.voyage.years??"").replace(/\s+—\s+/g,": ");const p=e.project([O,U]),H=e.getCanvas().getBoundingClientRect(),G=s.getBoundingClientRect();o.el.style.display="";const{offsetWidth:z,offsetHeight:C}=o.el,D=H.left-G.left+p.x-z/2,k=H.top-G.top+p.y-C-gi;o.el.style.transform=`translate(${Math.round(D)}px, ${Math.round(k)}px)`},x=(d,c)=>{if(T)return;const O=go.get(d);if(!O)return m();const U=fi(O.coords,c.lng,c.lat);if(!U)return m();const A=t();a&&a!==d&&A?.setTourProgress(a,null),A?.fractionAtSample&&(A.setTourProgress(d,A.fractionAtSample(d,U.sample)),a=d),w(O,U.sample,U.lng,U.lat),i&&v!==d&&(g(),v=d,I=window.setTimeout(()=>{I=0,i(d)},yi))},L=()=>{y=0;const d=u;u=null,d?.id?x(d.id,d.lngLat):m()};return e.on("mousemove","voyage-hit",d=>{e.getCanvas().style.cursor="pointer",u={id:d.features?.[0]?.properties?.id,lngLat:d.lngLat},y||(y=requestAnimationFrame(L))}),e.on("mouseleave","voyage-hit",()=>{e.getCanvas().style.cursor="",u=null,y&&(cancelAnimationFrame(y),y=0),m()}),e.on("movestart",m),{select(d){l=d||null,ro(e,l)},clear(){l!==null&&(l=null,ro(e,null))},get selected(){return l},play(d,c=0){if(!d){T=null,m();return}const O=t(),U=go.get(d);if(!O||!U)return;a&&a!==d&&O.setTourProgress(a,null),T=d,a=d,O.setTourProgress(d,c);const A=O.pointAt(d,c);A&&w(U,O.sampleAtFraction(d,c),A.lng,A.lat)},destroy(){m(),o.el.remove()}}}const er="/timemap/voyages",Zt=new Map,tt=(e,t)=>!e||typeof e!="object"?typeof e=="string"?e:"":e[t]||e.en||"",_i=(e,t)=>{const r=o=>Number.isFinite(o);if(!r(e.born)&&!r(e.died))return"";const n=(r(e.born)?e.born:e.died)<=0,i=(o,l)=>r(o)?`${l?"c. ":""}${o<=0?1-o:o}`:"?",s=n?t==="nl"?" v.Chr.":" BCE":"";return`${i(e.born,e.born_approx)}–${i(e.died,e.died_approx)}${s}`},xi=e=>String(e||"").split(/\s+/).filter(t=>new RegExp("^\\p{Lu}","u").test(t)).slice(0,2).map(t=>t[0]).join("")||String(e||"?")[0],yo=e=>[e.creator,e.year,e.licence].filter(Boolean).join(", "),Ei=(e,t,r="en")=>{const n=`${er}/${encodeURIComponent(e.id)}/`,i=s=>s&&s.file?{src:n+encodeURIComponent(s.file),width:s.width||null,height:s.height||null,title:s.title||"",caption:tt(s.caption,r)||s.title||"",credit:yo(s),source_url:s.source_url||null}:null;return{voyage:!0,voyageId:e.id,label:String(t?.name??e.id).replace(/\s+—\s+/g,": "),inception:t?.year_start??null,dissolution:t?.year_end??null,summary:null,flag_path:null,predecessor:null,successor:null,wikipedia_url:tt(e.wikipedia,r)||null,story:[{key:"purpose",text:tt(e.purpose,r)},{key:"crew",text:tt(e.crew,r)},{key:"legacy",text:tt(e.legacy,r)}].filter(s=>s.text),moments:(e.moments??[]).map((s,o)=>({key:`${s.date}-${o}`,date:Vo({ms:Date.parse(s.date),precision:s.precision||"day"},r),year:new Date(Date.parse(s.date)).getUTCFullYear(),text:tt(s,r)})),gallery:(e.images??[]).map(i).filter(Boolean),figures:(e.people??[]).map((s,o)=>({qid:s.qid||null,key:s.qid||`person-${o}`,name:s.name,kind:tt(s.role,r),era:_i(s,r),lines:tt(s,r),image_url:s.image?.file?n+encodeURIComponent(s.image.file):null,credit:s.image?yo(s.image):"",initials:xi(s.name)})),sources:(e.sources??[]).map(s=>({key:s.key,title:s.title,url:s.url}))}},Ti=async(e,t="en")=>{const r=String(t||"en").slice(0,2).toLowerCase(),n=Qt.voyages.find(i=>i.id===e);if(!n)throw new Error(`unknown voyage ${e}`);return Zt.has(e)||Zt.set(e,fetch(`${er}/${encodeURIComponent(e)}/card.json`).then(i=>{if(!i.ok)throw new Error(`HTTP ${i.status}`);return i.json()}).catch(i=>{throw Zt.delete(e),i})),Ei(await Zt.get(e),n,r)},ki=[{family:"France",color:"#4a6db3",qids:["Q207162","Q146246","Q58296","Q877619","Q219817","Q71084","Q58326","Q71092","Q70802","Q69829","Q200686","Q152582","Q69808","Q19951607","Q3561","Q3769","Q271894","Q646374","Q185682","Q5501836","Q139708","Q170604","Q1353951"]},{family:"Netherlands",color:"#d9782d",qids:["Q170072","Q55","Q774783","Q25227","Q188161","Q221283","Q1841483","Q382593","Q4807130"]},{family:"Spain",color:"#d1a437",qids:["Q29","Q80702","Q377350","Q497777","Q178038","Q13474305","Q2742116","Q600093"]},{family:"Castile",color:"#b3823a",qids:["Q179293","Q217196"]},{family:"Aragon",color:"#c9953f",qids:["Q1235737","Q199442","Q204920"]},{family:"England-Britain",color:"#b5493c",qids:["Q784963","Q200485","Q179876","Q330362","Q23666","Q8680","Q46395","Q129286","Q179848","Q370736","Q918153","Q876185"]},{family:"Scotland",color:"#52709b",qids:["Q230791"]},{family:"Portugal",color:"#4f7f57",qids:["Q1139807","Q45670","Q45","Q200464","Q16879646","Q1709007"]},{family:"Holy Roman Empire",color:"#94879b",qids:["Q12548"]},{family:"Habsburg-Austria",color:"#c2a24e",qids:["Q66504140","Q65968","Q131964","Q28513","Q40","Q187830"]},{family:"Prussia",color:"#5f646d",qids:["Q153091","Q157367","Q27306"]},{family:"Rome",color:"#9d4038",qids:["Q175881","Q12544","Q42834"]},{family:"Byzantium",color:"#7b559b",qids:["Q112039853"]},{family:"Ottomans",color:"#3f7468",qids:["Q12560","Q1529261"]},{family:"Umayyads",color:"#c5b183",qids:["Q8575586"]},{family:"Abbasids",color:"#4c5a50",qids:["Q12536"]},{family:"Russia",color:"#3f6b4c",qids:["Q186096","Q34266","Q139319","Q159","Q1108445"]},{family:"Sweden",color:"#5d89c4",qids:["Q34","Q322187","Q62589"]},{family:"Denmark",color:"#99414b",qids:["Q35","Q756617","Q62651","Q111953993"]},{family:"Norway",color:"#8c5364",qids:["Q20","Q202266"]},{family:"Poland",color:"#bd6a5e",qids:["Q577867","Q36","Q2984183","Q1515009","Q172107"]},{family:"Germany",color:"#6d7078",qids:["Q43287","Q41304","Q7318","Q713750","Q183"]},{family:"Hungary",color:"#8fa156",qids:["Q171150","Q2899771","Q28"]},{family:"Bohemia",color:"#77628b",qids:["Q2162698","Q42585"]},{family:"Venice",color:"#4e8891",qids:["Q4948"]},{family:"Genoa",color:"#8f5560",qids:["Q174306"]},{family:"Bulgaria",color:"#5e7f4e",qids:["Q191484","Q203817","Q420759","Q185488","Q815731","Q147909","Q121932"]},{family:"Serbia",color:"#8d6079",qids:["Q241748","Q1311990","Q1406298","Q878319","Q37024"]},{family:"China",color:"#c2803f",qids:["Q9683"]},{family:"China-Ming",color:"#c99435",qids:["Q9903","Q1198163"]},{family:"China-Qing",color:"#b06f3f",qids:["Q8733"]},{family:"China-Han",color:"#b8763d",qids:["Q1068371"]},{family:"Mongols",color:"#8a6a53",qids:["Q12557","Q19927420"]},{family:"Japan",color:"#c46a6a",qids:["Q188712","Q210688","Q193292","Q189178","Q204023"]},{family:"Mughals",color:"#57856b",qids:["Q33296"]},{family:"Maurya",color:"#a3814f",qids:["Q62943"]},{family:"Persia",color:"#6f5b8e",qids:["Q389688","Q1661685","Q161205"]},{family:"Inca",color:"#b7893f",qids:["Q28573"]},{family:"Aztec",color:"#86754a",qids:["Q2608489"]},{family:"United States",color:"#567aa9",qids:["Q30"]}],Ai={families:ki},$e=(e,t,r=0)=>{const n=1+Math.max(0,r)/ia,i=t*Math.PI/180,s=e*Math.PI/180;return[Math.cos(i)*Math.cos(s)*n,Math.sin(i)*n,Math.cos(i)*Math.sin(s)*n]},Si=e=>(2*Math.atan(Math.exp((1-2*e)*Math.PI))-Math.PI/2)*180/Math.PI,bo=e=>.5-Math.log(Math.tan(Math.PI/4+e*Math.PI/180/2))/(2*Math.PI),wo=85.0511287798066,Li=89.999,ka=6,sa=(e=64,t=48)=>{const r=[],n=[],i=[],s=a=>wo+(Li-wo)*(a/ka),o=[];for(let a=ka;a>=1;a--)o.push(bo(s(a)));for(let a=0;a<=t;a++)o.push(a/t);for(let a=1;a<=ka;a++)o.push(bo(-s(a)));for(const a of o){const u=Si(a)*Math.PI/180;for(let y=0;y<=e;y++){const T=y/e,v=(T*360-180)*Math.PI/180;r.push(T,a),n.push(Math.cos(u)*Math.cos(v),Math.sin(u),Math.cos(u)*Math.sin(v))}}const l=e+1;for(let a=0;a<o.length-1;a++)for(let u=0;u<e;u++){const y=a*l+u,T=y+l;i.push(y,T,y+1,T,T+1,y+1)}return{positions:new Float32Array(r),spheres:new Float32Array(n),indices:new Uint16Array(i),vertexCount:(e+1)*o.length,rowCount:o.length}},la=`
  vec4 projectShell(vec2 pos, float elevationGlobe, float elevationMercator) {
    #ifdef GLOBE
      return projectTileFor3D(pos, elevationGlobe);
    #else
      return projectTileFor3D(clamp(pos, 0.0, 1.0), elevationMercator);
    #endif
  }
`,Qa=`
  float daylightFraction(float sunAngle) {
    return smoothstep(-0.31, 0.09, sunAngle);
  }
`,tr=`
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
`,ar=`
  vec2 sphereSpan(vec3 origin, vec3 dir, float radius) {
    float b = dot(origin, dir);
    float c = dot(origin, origin) - radius * radius;
    float disc = b * b - c;
    if (disc < 0.0) return vec2(1.0, -1.0);
    float sq = sqrt(disc);
    return vec2(-b - sq, -b + sq);
  }
`,or=`
  bool facesCamera(vec3 unitPos, vec3 camera) {
    return dot(unitPos, camera) > 1.0;
  }
`,qa=(e,t)=>{const r=Ia(e),n=typeof r?.getCameraAltitude=="function"?r.getCameraAltitude():null;if(Number.isFinite(n))return n;const i=r?.cameraToCenterDistance;if(!Number.isFinite(i))return 1e7;const s=512*Math.pow(2,e.getZoom()),o=1/t.MercatorCoordinate.fromLngLat(e.getCenter(),0).meterInMercatorCoordinateUnits();return i/s*o*Math.cos(e.getPitch()*Math.PI/180)},pt=(e,t)=>{const r=Ia(e)?.cameraPosition;if(r&&Number.isFinite(r[0])&&Number.isFinite(r[1])&&Number.isFinite(r[2]))return[r[2],r[1],r[0]];const n=Ia(e),i=typeof n?.getCameraLngLat=="function"?n.getCameraLngLat():e.getCenter();return $e(i.lng,i.lat,qa(e,t))},rr=e=>typeof e.texStorage2D=="function",Mi=`#version 300 es
#define attribute in
#define varying out
#define texture2D texture
`,Ri=`#version 300 es
#define varying in
#define texture2D texture
out highp vec4 tm_fragColour;
#define gl_FragColor tm_fragColour
`,Ke=(e,t,r,n="layer",{es300:i=!1}={})=>(i&&rr(e)&&(t=Mi+t,r=Ri+r),Pi(e,t,r,n)),Pi=(e,t,r,n)=>{const i=(a,u)=>{const y=e.createShader(a);if(e.shaderSource(y,u),e.compileShader(y),!e.getShaderParameter(y,e.COMPILE_STATUS)){const T=e.getShaderInfoLog(y);throw e.deleteShader(y),new Error(`${n} shader: ${T}`)}return y},s=e.createProgram(),o=i(e.VERTEX_SHADER,t),l=i(e.FRAGMENT_SHADER,r);if(e.attachShader(s,o),e.attachShader(s,l),e.linkProgram(s),e.deleteShader(o),e.deleteShader(l),!e.getProgramParameter(s,e.LINK_STATUS)){const a=e.getProgramInfoLog(s);throw e.deleteProgram(s),new Error(`${n} link: ${a}`)}return s},ca=`
  vec2 equirectUV(vec3 dir, float drift) {
    return vec2(atan(dir.z, dir.x) / 6.28318530718 + 0.5 + drift,
                0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265359);
  }

  vec2 equirectUVInside(vec3 dir, float drift) {
    return vec2(-atan(dir.z, dir.x) / 6.28318530718 + 0.5 + drift,
                0.5 - asin(clamp(dir.y, -1.0, 1.0)) / 3.14159265359);
  }
`,aa=9e4,nr=`
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
`,ir=["time","drift","field","fieldAmount","wind","windAmount","windScale","windRate","patches","patchAmount","patchTiles","patchMean","patchDetail"],Ci=.75,Di=144,Ii=.4335,sr=(e,t,r,n,i,s,o)=>{const l=r.animate?n.seconds:0;t.time&&e.uniform1f(t.time,l),t.drift&&e.uniform1f(t.drift,l*r.driftRate),t.fieldAmount&&e.uniform1f(t.fieldAmount,n.field?.ready?1:0),t.patchAmount&&e.uniform1f(t.patchAmount,n.patches?.ready?1:0),t.patchTiles&&e.uniform1f(t.patchTiles,r.patchTiles??Di),t.patchMean&&e.uniform1f(t.patchMean,r.patchMean??Ii),t.patchDetail&&e.uniform1f(t.patchDetail,r.patchDetail??Ci),t.windAmount&&e.uniform1f(t.windAmount,n.wind?.ready?r.windAmount:0),t.windScale&&e.uniform1f(t.windScale,r.windScale),t.windRate&&e.uniform1f(t.windRate,r.animate?r.windRate:0),n.field?.ready&&t.field&&(e.activeTexture(e.TEXTURE0+i),e.bindTexture(e.TEXTURE_2D,n.field.texture),e.uniform1i(t.field,i)),n.wind?.ready&&t.wind&&(e.activeTexture(e.TEXTURE0+s),e.bindTexture(e.TEXTURE_2D,n.wind.texture),e.uniform1i(t.wind,s)),n.patches?.ready&&t.patches&&(e.activeTexture(e.TEXTURE0+o),e.bindTexture(e.TEXTURE_2D,n.patches.texture),e.uniform1i(t.patches,o))},vo=new WeakMap,Ui=e=>{let t=vo.get(e);return t||(t=new Map,vo.set(e,t)),t},Fi=(e,t)=>t!==1?{internal:e.RGBA,format:e.RGBA}:typeof e.texStorage2D=="function"?{internal:e.R8,format:e.RED}:{internal:e.LUMINANCE,format:e.LUMINANCE},Ni=(e,t,r,n)=>{const i=e.createTexture();e.bindTexture(e.TEXTURE_2D,i),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1);const{internal:s,format:o}=Fi(e,n);return e.texImage2D(e.TEXTURE_2D,0,s,o,e.UNSIGNED_BYTE,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,r?e.LINEAR_MIPMAP_LINEAR:e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),r&&e.generateMipmap(e.TEXTURE_2D),i},Be=(e,t,r=null,{mipmap:n=!0,channels:i=4}={})=>{const s=Ui(e),o=`${t}|${n?"mip":"flat"}|c${i}`;let l=s.get(o);if(!l){l={texture:null,ready:!1,refs:0,waiters:[],width:0},s.set(o,l);const u=new Image;u.crossOrigin="anonymous",u.onload=()=>{if(l.refs===0)return;const y=e.getParameter?.(e.MAX_TEXTURE_SIZE)??1/0;if(u.width>y){l.waiters=[];return}l.width=u.width,l.texture=Ni(e,u,n,i),l.ready=!0;const T=l.waiters;l.waiters=[],T.forEach(v=>v())},u.onerror=()=>{l.waiters=[]},u.src=t}l.refs++;let a=!0;return r&&(l.ready?r():l.waiters.push(r)),{get texture(){return l.texture},get ready(){return l.ready},get width(){return l.width},release(){a&&(a=!1,r&&(l.waiters=l.waiters.filter(u=>u!==r)),l.refs--,!(l.refs>0)&&(l.texture&&e.deleteTexture(l.texture),l.texture=null,l.ready=!1,s.delete(o)))}}},lr=`
  mat3 equirectTangentFrame(vec3 unitPos) {
    vec3 up = normalize(unitPos);
    vec3 east = cross(up, vec3(0.0, 1.0, 0.0));
    float span = length(east);
    // Standing on a pole, every direction is south and no direction is east. Pick one rather than
    // dividing by zero and putting a NaN in the middle of Antarctica.
    east = span > 1.0e-4 ? east / span : vec3(0.0, 0.0, 1.0);
    return mat3(east, cross(up, east), up);
  }
`,cr=`
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
`,Oi=`
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
`,Bi=(e,t)=>2*Math.PI*ia*Math.cos(t*Math.PI/180)/e,Qi=(e,t,r)=>Math.min(r,Math.max(t,e)),qi=(e,t,r)=>{const n=Qi((r-e)/(t-e),0,1);return n*n*(3-2*n)},Hi=(e,t,r)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e)/2,i=Bi(r,t)/n;return{pixelsPerTexel:i,strength:1-qi(3,5,Math.log2(Math.max(i,1e-6)))}},ur="tm-clouds",Gi=(e,t,r)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e),s=156543.03392/2**9,o=Math.min(1,n/s),a=ia/Math.max(1,n*110);return{frequency:Math.min(2600,Math.max(9,a)),amount:.14+(1-o)*.1,fade:Number.isFinite(r)?zi(1.35,2.75,r/aa):0}},zi=(e,t,r)=>{const n=Math.min(1,Math.max(0,(r-e)/(t-e)));return n*n*(3-2*n)},$i=e=>`#version 300 es
${e.define}
${e.vertexShaderPrelude}
in vec2 a_pos;
in vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
out vec3 v_sphere;
${la}
void main() {
  v_sphere = a_sphere;
  // Globe wants metres above the sphere; mercator wants z in mercator units. Same deck, two rulers.
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,Wi=()=>`#version 300 es
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
${tr}
${ca}
${Qa}
${lr}
${cr}
// The field, the wind and the clock the ground's cloud shadows read from the same source.
${nr}

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
}`,ji=({opacity:e=.5,animate:t=!0,fieldUrl:r=null,patchUrl:n=null,driftRate:i=4e-4,sun:s=[.4,.5,.75],windUrl:o=null,windAmount:l=1,windScale:a=.06,windRate:u=.05,cloudRelief:y=90,cloudDepth:T=4,powder:v=1,forward:I=.5,forwardG:g=.7,selfShadow:m=.18,selfShadowStep:w=.0015}={})=>{const x=sa();let L=null,d=null,c=null;const O=new Map;let U={opacity:e,animate:t,fieldUrl:r,patchUrl:n,driftRate:i,sun:s,windUrl:o,windAmount:l,windScale:a,windRate:u,cloudRelief:y,cloudDepth:T,powder:v,forward:I,forwardG:g,selfShadow:m,selfShadowStep:w},A=null,Y=null,p=null;const H=C=>{const D=C.variantName;if(O.has(D))return O.get(D);const k=Ke(d,$i(C),Wi(),"tm-clouds"),N={program:k,attribs:{pos:d.getAttribLocation(k,"a_pos"),sphere:d.getAttribLocation(k,"a_sphere")},uniforms:{elevationGlobe:d.getUniformLocation(k,"a_elevation_globe"),elevationMercator:d.getUniformLocation(k,"a_elevation_mercator"),opacity:d.getUniformLocation(k,"u_opacity"),sun:d.getUniformLocation(k,"u_sun"),...Object.fromEntries(ir.map(b=>[b,d.getUniformLocation(k,`u_${b}`)])),detailFreq:d.getUniformLocation(k,"u_detailFreq"),detailAmount:d.getUniformLocation(k,"u_detailAmount"),deckFade:d.getUniformLocation(k,"u_deckFade"),camera:d.getUniformLocation(k,"u_camera"),cloudRelief:d.getUniformLocation(k,"u_cloudRelief"),cloudDepth:d.getUniformLocation(k,"u_cloudDepth"),powder:d.getUniformLocation(k,"u_powder"),forward:d.getUniformLocation(k,"u_forward"),forwardG:d.getUniformLocation(k,"u_forwardG"),selfShadow:d.getUniformLocation(k,"u_selfShadow"),selfShadowStep:d.getUniformLocation(k,"u_selfShadowStep"),matrix:d.getUniformLocation(k,"u_projection_matrix"),tileMercatorCoords:d.getUniformLocation(k,"u_projection_tile_mercator_coords"),clippingPlane:d.getUniformLocation(k,"u_projection_clipping_plane"),transition:d.getUniformLocation(k,"u_projection_transition"),fallbackMatrix:d.getUniformLocation(k,"u_projection_fallback_matrix")}};return O.set(D,N),N},G=(C,D)=>{C.matrix&&d.uniformMatrix4fv(C.matrix,!1,D.mainMatrix),C.tileMercatorCoords&&d.uniform4f(C.tileMercatorCoords,...D.tileMercatorCoords),C.clippingPlane&&d.uniform4f(C.clippingPlane,...D.clippingPlane),C.transition&&d.uniform1f(C.transition,D.projectionTransition),C.fallbackMatrix&&d.uniformMatrix4fv(C.fallbackMatrix,!1,D.fallbackMatrix)},z=()=>L?.triggerRepaint();return{id:ur,type:"custom",renderingMode:"3d",onAdd(C,D){L=C,d=D;const k=(N,b)=>{const j=d.createBuffer();return d.bindBuffer(N,j),d.bufferData(N,b,d.STATIC_DRAW),j};c={pos:k(d.ARRAY_BUFFER,x.positions),sphere:k(d.ARRAY_BUFFER,x.spheres),index:k(d.ELEMENT_ARRAY_BUFFER,x.indices)},U.fieldUrl&&(A=Be(d,U.fieldUrl,z,{channels:1})),U.windUrl&&(Y=Be(d,U.windUrl,z)),U.patchUrl&&(p=Be(d,U.patchUrl,z,{channels:1}))},onRemove(){d&&(O.forEach(({program:C})=>d.deleteProgram(C)),O.clear(),A?.release(),A=null,Y?.release(),Y=null,p?.release(),p=null,c&&(d.deleteBuffer(c.pos),d.deleteBuffer(c.sphere),d.deleteBuffer(c.index),c=null),L=null,d=null)},render(C,D){if(!c||U.opacity<=0)return;const k=D&&D.shaderData,N=D&&D.defaultProjectionData;if(!k||!N)return;const{program:b,attribs:j,uniforms:Q}=H(k);d.useProgram(b),G(Q,N);const J=L.getCenter().lat;Q.elevationGlobe&&d.uniform1f(Q.elevationGlobe,aa),Q.elevationMercator&&d.uniform1f(Q.elevationMercator,le.MercatorCoordinate.fromLngLat([0,J],aa).z),Q.opacity&&d.uniform1f(Q.opacity,U.opacity),Q.sun&&d.uniform3f(Q.sun,...U.sun),sr(d,Q,U,{seconds:performance.now()*.001,field:A,wind:Y,patches:p},0,1,2);const S=Gi(L.getZoom(),L.getCenter().lat,qa(L,le));Q.detailFreq&&d.uniform1f(Q.detailFreq,S.frequency),Q.detailAmount&&d.uniform1f(Q.detailAmount,S.amount),Q.deckFade&&d.uniform1f(Q.deckFade,S.fade),Q.camera&&d.uniform3f(Q.camera,...pt(L,le));const X=R=>{Q[R]&&d.uniform1f(Q[R],U[R])};X("cloudRelief"),X("cloudDepth"),X("powder"),X("forward"),X("forwardG"),X("selfShadow"),X("selfShadowStep"),d.bindBuffer(d.ARRAY_BUFFER,c.pos),d.enableVertexAttribArray(j.pos),d.vertexAttribPointer(j.pos,2,d.FLOAT,!1,0,0),d.bindBuffer(d.ARRAY_BUFFER,c.sphere),d.enableVertexAttribArray(j.sphere),d.vertexAttribPointer(j.sphere,3,d.FLOAT,!1,0,0),d.enable(d.DEPTH_TEST),d.depthFunc(d.LEQUAL),d.depthMask(!1),d.bindBuffer(d.ELEMENT_ARRAY_BUFFER,c.index),d.drawElements(d.TRIANGLES,x.indices.length,d.UNSIGNED_SHORT,0),d.depthMask(!0),U.animate&&L.triggerRepaint()},setOptions(C={}){const D=U;if(U={...U,...C},d){const k=(N,b)=>{if(C[b]===void 0||C[b]===D[b])return N;N?.release();const j=b==="patchUrl"||b==="fieldUrl"?{channels:1}:void 0;return U[b]?Be(d,U[b],z,j):null};A=k(A,"fieldUrl"),p=k(p,"patchUrl")}L&&L.triggerRepaint()},getOptions:()=>({...U}),get hasField(){return!!(A?.ready||p?.ready)}}},Fa=ur,De=Math.PI/180,Yi=Date.UTC(2e3,0,1,12),Aa=1/3600,hr=e=>(e.getTime()-Yi)/864e5,Xi=(e=new Date)=>((18.697374558+24.06570982441908*hr(e))%24*15%360+360)%360,Ki=e=>{const t=hr(e)/36525;return{zeta:(2306.2181*t+.30188*t*t+.017998*t*t*t)*Aa,z:(2306.2181*t+1.09468*t*t+.018203*t*t*t)*Aa,theta:(2004.3109*t-.42665*t*t-.041833*t*t*t)*Aa}},Vi=(e,t,r)=>{const{zeta:n,z:i,theta:s}=Ki(r),o=(e-i)*De,l=t*De,a=s*De,u=Math.cos(l)*Math.sin(o),y=Math.cos(a)*Math.cos(l)*Math.cos(o)+Math.sin(a)*Math.sin(l),T=-Math.sin(a)*Math.cos(l)*Math.cos(o)+Math.cos(a)*Math.sin(l);return{ra:Math.atan2(u,y)/De-n,dec:Math.asin(Math.min(1,Math.max(-1,T)))/De}},_o=e=>(e%360+360)%360,Zi=(e,t=new Date)=>{const r=Math.hypot(e[0],e[1],e[2])||1,n=Math.atan2(e[2]/r,e[0]/r)/De,i=Math.asin(Math.min(1,Math.max(-1,e[1]/r)))/De,s=Vi(_o(n+Xi(t)),i,t);return{ra:_o(s.ra),dec:s.dec}},Ji=`
  vec2 panoramaUV(vec3 skyDir) {
    return vec2(atan(skyDir.z, skyDir.x) / 6.28318530718 + 1.0,
                0.5 - asin(clamp(skyDir.y, -1.0, 1.0)) / 3.14159265359);
  }
`,es=(e=new Date)=>{const t=new Float32Array(9);return[[1,0,0],[0,1,0],[0,0,1]].forEach((n,i)=>{const{ra:s,dec:o}=Zi(n,e);t[i*3]=Math.cos(o*De)*Math.cos(s*De),t[i*3+1]=Math.sin(o*De),t[i*3+2]=Math.cos(o*De)*Math.sin(s*De)}),t},ts=Math.PI/180,oa=e=>{const t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},as=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],Na=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],xo=(e,t)=>{const r=as(e,t);return oa([e[0]-t[0]*r,e[1]-t[1]*r,e[2]-t[2]*r])},os=(e,t)=>{const n=t>89.98?-1:1,i=oa(Na($e(e,t+.01*n),$e(e,t-.01*n))),s=oa(Na($e(e+.01,t),$e(e-.01,t)));return{north:n===1?i:[-i[0],-i[1],-i[2]],east:s}},rs=(e,t,r,n)=>{const i=e.getCenter(),s=(e.getBearing?.()??0)*ts,o=$e(i.lng,i.lat,0),l=pt(e,t),a=oa(Na(o,l)),{north:u,east:y}=os(i.lng,i.lat),T=[0,1,2].map(x=>u[x]*Math.cos(s)+y[x]*Math.sin(s)),v=[0,1,2].map(x=>-u[x]*Math.sin(s)+y[x]*Math.cos(s)),I=xo(T,a),g=xo(v,a),m=Math.tan(r/2),w=m*n;return{origin:l,forward:a,up:I.map(x=>x*m),right:g.map(x=>x*w),upUnit:I,rightUnit:g}},Oa=(e,t)=>e*t*4,dr=[{name:"high",width:4096,height:2048,url:"/img/map/sky/milkyway-4k.webp",bytes:3680220,resident:Oa(4096,2048),decodeMs:235},{name:"standard",width:2048,height:1024,url:"/img/map/sky/milkyway-2k.webp",bytes:764012,resident:Oa(2048,1024),decodeMs:51}],fr={name:"placeholder",width:1024,height:512,url:"/img/map/sky/milkyway-1k.webp",bytes:45160,resident:Oa(1024,512),decodeMs:5},ns=4,is=4,ss=({maxTextureSize:e=0,deviceMemory:t=null,hardwareConcurrency:r=null,saveData:n=!1,effectiveType:i=null}={})=>{const s=dr.filter(a=>a.width<=e);if(s.length===0)return{tier:fr,reason:`MAX_TEXTURE_SIZE is ${e}, below every tier — falling back to the placeholder`};const o=s[s.length-1],l=s[0];return l===o?{tier:l,reason:`only ${l.name} fits MAX_TEXTURE_SIZE ${e}`}:n?{tier:o,reason:"the browser is in data-saver mode"}:i&&/^(slow-2g|2g|3g)$/.test(i)?{tier:o,reason:`the connection reports ${i}`}:Number.isFinite(t)&&t<ns?{tier:o,reason:`the device reports ${t} GB of memory`}:Number.isFinite(r)&&r<is?{tier:o,reason:`the device reports ${r} cores`}:{tier:l,reason:`nothing says otherwise, and MAX_TEXTURE_SIZE is ${e}`}},ls=(e,t=typeof navigator>"u"?null:navigator)=>{const r=t?.connection??null;return{maxTextureSize:e?.getParameter?.(e.MAX_TEXTURE_SIZE)??0,deviceMemory:t?.deviceMemory??null,hardwareConcurrency:t?.hardwareConcurrency??null,saveData:r?.saveData??!1,effectiveType:r?.effectiveType??null}},mr="tm-starfield",cs=fr.url,us="/data/sky/bright-stars.bin",hs=e=>{const t=Number.isFinite(e)?e:5800,r=Math.min(4e4,Math.max(1e3,t))/100,n=u=>Math.min(1,Math.max(0,u/255)),i=r<=66?255:329.698727446*Math.pow(r-60,-.1332047592),s=r<=66?99.4708025861*Math.log(r)-161.1195681661:288.1221695283*Math.pow(r-60,-.0755148492),o=r>=66?255:r<=19?0:138.5177312231*Math.log(r-10)-305.0447927307,l=[n(i),n(s),n(o)],a=Math.max(...l)||1;return l.map(u=>u/a)},ds=(e,{limitMagnitude:t=6.5}={})=>{const r=new Float32Array(e),n=Math.floor(r.length/4),i=[];for(let o=0;o<n;o++){const l=r[o*4+2];if(l>t)continue;const a=Math.pow(10,-.4*l);i.push([r[o*4],r[o*4+1],Math.pow(a,.36),...hs(r[o*4+3])])}const s=new Float32Array(i.length*6);return i.forEach((o,l)=>s.set(o,l*6)),{vertices:s,count:i.length}},pr=`
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
`,fs=e=>`${e.define}
attribute vec2 a_pos;
varying vec2 v_ndc;
void main() {
  v_ndc = a_pos;
  // Straight to clip space. No projection, no elevation, no prelude — that is the whole point.
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,ms=e=>`${e.define}
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
${pr}
${Ji}

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
}`,ps=e=>`${e.define}
attribute vec3 a_star;       // right ascension and declination in degrees, then brightness
attribute vec3 a_colour;
uniform mat3 u_skyFrame;
uniform float u_pixelRatio;
uniform float u_starSize;
uniform float u_catalogueAmount;
varying vec3 v_colour;
${pr}

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
}`,gs=e=>`${e.define}
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
}`,ys=({textureUrl:e=null,placeholderUrl:t=cs,catalogueUrl:r=us,date:n=new Date,brightness:i=.55,nebula:s=.3,nebulaContrast:o=1.45,starDensity:l=210,starAmount:a=1.5,catalogueAmount:u=2.2,starSize:y=3,limitMagnitude:T=6.5,twinkle:v=0,animate:I=!1}={})=>{let g=null,m=null,w=null,x=null,L=null,d=null,c="not chosen yet",O=0;const U=new Map;let A={textureUrl:e,placeholderUrl:t,catalogueUrl:r,date:n,brightness:i,nebula:s,nebulaContrast:o,starDensity:l,starAmount:a,catalogueAmount:u,starSize:y,limitMagnitude:T,twinkle:v,animate:I};const Y=C=>{const D=C.variantName;if(U.has(D))return U.get(D);const k=Ke(m,fs(C),ms(C),"tm-starfield"),N=Ke(m,ps(C),gs(C),"tm-starfield-catalogue"),b=(Q,J)=>m.getUniformLocation(Q,J),j={sky:{program:k,pos:m.getAttribLocation(k,"a_pos"),uniforms:{camera:b(k,"u_camera"),forward:b(k,"u_forward"),right:b(k,"u_right"),up:b(k,"u_up"),halfExtent:b(k,"u_halfExtent"),skyFrame:b(k,"u_skyFrame"),sky:b(k,"u_sky"),globeness:b(k,"u_globeness"),brightness:b(k,"u_brightness"),nebula:b(k,"u_nebula"),nebulaContrast:b(k,"u_nebulaContrast"),starDensity:b(k,"u_starDensity"),starAmount:b(k,"u_starAmount"),twinkle:b(k,"u_twinkle"),time:b(k,"u_time")}},stars:{program:N,star:m.getAttribLocation(N,"a_star"),colour:m.getAttribLocation(N,"a_colour"),uniforms:{camera:b(N,"u_camera"),forward:b(N,"u_forward"),right:b(N,"u_right"),up:b(N,"u_up"),halfExtent:b(N,"u_halfExtent"),skyFrame:b(N,"u_skyFrame"),pixelRatio:b(N,"u_pixelRatio"),starSize:b(N,"u_starSize"),catalogueAmount:b(N,"u_catalogueAmount")}}};return U.set(D,j),j},p=()=>{if(!m)return;const C=(D,k)=>D?Be(m,D,k,{mipmap:!1}):null;if(A.textureUrl===null){const D=ss(ls(m));d=D.tier,c=D.reason}else d=dr.find(D=>D.url===A.textureUrl)??{name:"explicit",url:A.textureUrl},c="the caller named a panorama";L=C(A.placeholderUrl,()=>{g?.triggerRepaint()}),x=C(d.url===A.placeholderUrl?null:d.url,()=>{L?.release(),L=null,g?.triggerRepaint()})},H=()=>x?.ready?x:L?.ready?L:null,G=()=>{x?.release(),L?.release(),x=null,L=null},z=C=>{!C||typeof fetch!="function"||fetch(C).then(D=>{if(!D.ok)throw new Error(`${D.status} ${D.statusText}`);return D.arrayBuffer()}).then(D=>{if(!m||!w)return;const{vertices:k,count:N}=ds(D,{limitMagnitude:A.limitMagnitude});m.bindBuffer(m.ARRAY_BUFFER,w.stars),m.bufferData(m.ARRAY_BUFFER,k,m.STATIC_DRAW),O=N,g?.triggerRepaint()}).catch(D=>console.warn(`[starfield] bright star catalogue unavailable: ${D.message}`))};return{id:mr,type:"custom",renderingMode:"3d",onAdd(C,D){g=C,m=D;const k=(N,b)=>{const j=m.createBuffer();return m.bindBuffer(N,j),b&&m.bufferData(N,b,m.STATIC_DRAW),j};w={pos:k(m.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1])),index:k(m.ELEMENT_ARRAY_BUFFER,new Uint16Array([0,1,2,2,1,3])),stars:k(m.ARRAY_BUFFER,null)},p(),z(A.catalogueUrl)},onRemove(){m&&(U.forEach(({sky:C,stars:D})=>{m.deleteProgram(C.program),m.deleteProgram(D.program)}),U.clear(),G(),w&&(m.deleteBuffer(w.pos),m.deleteBuffer(w.index),m.deleteBuffer(w.stars),w=null),g=null,m=null)},render(C,D){if(!w||A.brightness<=0)return;const k=D&&D.shaderData,N=D&&D.defaultProjectionData;if(!k||!N)return;const b=g.getCanvas(),j=b.width/Math.max(1,b.height),Q=rs(g,le,D.fov||.6435,j),J=Math.tan((D.fov||.6435)/2),S=es(A.date),X=N.projectionTransition,{sky:R,stars:$}=Y(k),ee=({uniforms:B})=>{B.camera&&m.uniform3f(B.camera,...Q.origin),B.forward&&m.uniform3f(B.forward,...Q.forward),B.right&&m.uniform3f(B.right,...Q.rightUnit),B.up&&m.uniform3f(B.up,...Q.upUnit),B.halfExtent&&m.uniform2f(B.halfExtent,J*j,J),B.skyFrame&&m.uniformMatrix3fv(B.skyFrame,!1,S)};m.useProgram(R.program),ee(R),R.uniforms.globeness&&m.uniform1f(R.uniforms.globeness,X),R.uniforms.brightness&&m.uniform1f(R.uniforms.brightness,A.brightness);const K=H();R.uniforms.nebula&&m.uniform1f(R.uniforms.nebula,K?A.nebula:0),R.uniforms.nebulaContrast&&m.uniform1f(R.uniforms.nebulaContrast,A.nebulaContrast),R.uniforms.starDensity&&m.uniform1f(R.uniforms.starDensity,A.starDensity),R.uniforms.starAmount&&m.uniform1f(R.uniforms.starAmount,A.starAmount),R.uniforms.twinkle&&m.uniform1f(R.uniforms.twinkle,A.twinkle),R.uniforms.time&&m.uniform1f(R.uniforms.time,A.animate?performance.now()*.001:0),K&&R.uniforms.sky&&(m.activeTexture(m.TEXTURE0),m.bindTexture(m.TEXTURE_2D,K.texture),m.uniform1i(R.uniforms.sky,0)),m.bindBuffer(m.ARRAY_BUFFER,w.pos),m.enableVertexAttribArray(R.pos),m.vertexAttribPointer(R.pos,2,m.FLOAT,!1,0,0),m.disable(m.DEPTH_TEST),m.depthMask(!1),m.bindBuffer(m.ELEMENT_ARRAY_BUFFER,w.index),m.drawElements(m.TRIANGLES,6,m.UNSIGNED_SHORT,0),O>0&&X>.5&&A.catalogueAmount>0&&(m.useProgram($.program),ee($),$.uniforms.pixelRatio&&m.uniform1f($.uniforms.pixelRatio,typeof devicePixelRatio=="number"?devicePixelRatio:1),$.uniforms.starSize&&m.uniform1f($.uniforms.starSize,A.starSize),$.uniforms.catalogueAmount&&m.uniform1f($.uniforms.catalogueAmount,A.catalogueAmount*A.brightness),m.bindBuffer(m.ARRAY_BUFFER,w.stars),m.enableVertexAttribArray($.star),m.vertexAttribPointer($.star,3,m.FLOAT,!1,24,0),m.enableVertexAttribArray($.colour),m.vertexAttribPointer($.colour,3,m.FLOAT,!1,24,12),m.drawArrays(m.POINTS,0,O),m.disableVertexAttribArray($.star),m.disableVertexAttribArray($.colour)),m.enable(m.DEPTH_TEST),m.depthMask(!0),A.animate&&A.twinkle>0&&g.triggerRepaint()},setOptions(C={}){const D=A.textureUrl,k=A.catalogueUrl;A={...A,...C},C.textureUrl!==void 0&&C.textureUrl!==D&&(G(),p()),C.catalogueUrl!==void 0&&C.catalogueUrl!==k&&(O=0,z(C.catalogueUrl)),g?.triggerRepaint()},getOptions:()=>({...A}),get hasSky(){return H()!==null},get starCount(){return O},get skyTier(){return d?{...d,reason:c}:null}}},bs=mr,at=Math.PI/180,ws=Date.UTC(2e3,0,1,12),vs=149597870700,_s=6957e5,gr=e=>(e.getTime()-ws)/864e5,yr=(e=new Date)=>{const t=gr(e),r=(280.46+.9856474*t)%360,n=(357.528+.9856003*t)%360*at,i=(r+1.915*Math.sin(n)+.02*Math.sin(2*n))*at,s=(23.439-4e-7*t)*at,o=Math.asin(Math.sin(s)*Math.sin(i))/at;let l=Math.atan2(Math.cos(s)*Math.sin(i),Math.cos(i))/at;l<0&&(l+=360);let a=r-l;a>180&&(a-=360),a<-180&&(a+=360),a*=4;const u=(1.00014-.01671*Math.cos(n)-14e-5*Math.cos(2*n))*vs;return{declination:o,equationOfTime:a,distance:u}},br=(e=new Date)=>yr(e).distance,xs=(e=new Date)=>Math.atan(_s/br(e)),Es=(e=new Date)=>{const t=(357.528+.9856003*gr(e))%360*at;return(1.00014-.01671*Math.cos(t)-14e-5*Math.cos(2*t))*149597870700},Ts=(e=new Date)=>{const{declination:t,equationOfTime:r}=yr(e);let i=-15*(e.getUTCHours()+e.getUTCMinutes()/60+e.getUTCSeconds()/3600-12+r/60);return i=(i+540)%360-180,{lng:i,lat:t}},qt=(e=new Date)=>{const{lng:t,lat:r}=Ts(e),n=r*at,i=t*at;return[Math.cos(n)*Math.cos(i),Math.sin(n),Math.cos(n)*Math.sin(i)]},wr="tm-sun",Eo=63710088e-1,ks=18,As=(e,t,r)=>{const n=Math.abs(e),i=t,s=r;if(i<=0)return 0;if(n>=i+s)return 1;if(n<=s-i)return 0;if(n<=i-s)return 1-s*s/(i*i);const o=i*i*Math.acos(St((n*n+i*i-s*s)/(2*n*i),-1,1))+s*s*Math.acos(St((n*n+s*s-i*i)/(2*n*s),-1,1))-.5*Math.sqrt(Math.max(0,(-n+i+s)*(n+i-s)*(n-i+s)*(n+i+s)));return St(1-o/(Math.PI*i*i),0,1)},To={u1:.93,u2:-.23},ko=e=>e<0?`(${e.toFixed(4)})`:e.toFixed(4),Ss=`
  float limbDarkening(float rho) {
    float mu = sqrt(max(1.0 - rho * rho, 0.0));
    float t = 1.0 - mu;
    return max(1.0 - ${ko(To.u1)} * t - ${ko(To.u2)} * t * t, 0.0);
  }
`,Ls=new Float32Array([-1,-1,1,-1,-1,1,1,1]),Ao=new Uint16Array([0,1,2,1,3,2]),Ms=e=>`${e.vertexShaderPrelude}
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
}`,Rs=()=>`precision highp float;
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
${ar}
${Ss}

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
}`,Ps=({date:e=new Date,haloScale:t=ks,haloStrength:r=1,discGain:n=1.15,brightness:i=1,coreColour:s=[1,.985,.95],haloColour:o=[1,.65,.2]}={})=>{let l=null,a=null,u=null,y={u:.5,v:.5,onScreen:!1,visible:0};const T=new Map;let v={date:e,haloScale:t,haloStrength:r,discGain:n,brightness:i,coreColour:s,haloColour:o};const I=g=>{const m=g.variantName;if(T.has(m))return T.get(m);const w=Ke(a,Ms(g),Rs(),"tm-sun",{es300:!0}),x={program:w,attribs:{corner:a.getAttribLocation(w,"a_corner")},uniforms:{centre:a.getUniformLocation(w,"a_centre"),elevationGlobe:a.getUniformLocation(w,"a_elevation_globe"),elevationMercator:a.getUniformLocation(w,"a_elevation_mercator"),size:a.getUniformLocation(w,"u_size"),camera:a.getUniformLocation(w,"u_camera"),forward:a.getUniformLocation(w,"u_forward"),right:a.getUniformLocation(w,"u_right"),up:a.getUniformLocation(w,"u_up"),glowAngle:a.getUniformLocation(w,"u_glow_angle"),discFraction:a.getUniformLocation(w,"u_disc_fraction"),discGain:a.getUniformLocation(w,"u_disc_gain"),visible:a.getUniformLocation(w,"u_visible"),brightness:a.getUniformLocation(w,"u_brightness"),haloStrength:a.getUniformLocation(w,"u_halo_strength"),coreColour:a.getUniformLocation(w,"u_core_colour"),haloColour:a.getUniformLocation(w,"u_halo_colour"),matrix:a.getUniformLocation(w,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(w,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(w,"u_projection_clipping_plane"),transition:a.getUniformLocation(w,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(w,"u_projection_fallback_matrix")}};return T.set(m,x),x};return{id:wr,type:"custom",renderingMode:"3d",onAdd(g,m){l=g,a=m;const w=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,w),a.bufferData(a.ARRAY_BUFFER,Ls,a.STATIC_DRAW);const x=a.createBuffer();a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,x),a.bufferData(a.ELEMENT_ARRAY_BUFFER,Ao,a.STATIC_DRAW),u={corner:w,index:x}},onRemove(){a&&(T.forEach(({program:g})=>a.deleteProgram(g)),T.clear(),u&&(a.deleteBuffer(u.corner),a.deleteBuffer(u.index),u=null),l=null,a=null)},render(g,m){if(!u||v.brightness<=0)return;const w=m&&m.shaderData,x=m&&m.defaultProjectionData;if(!w||!x)return;const{program:L,attribs:d,uniforms:c}=I(w);a.useProgram(L),c.matrix&&a.uniformMatrix4fv(c.matrix,!1,x.mainMatrix),c.tileMercatorCoords&&a.uniform4f(c.tileMercatorCoords,...x.tileMercatorCoords),c.clippingPlane&&a.uniform4f(c.clippingPlane,...x.clippingPlane),c.transition&&a.uniform1f(c.transition,x.projectionTransition),c.fallbackMatrix&&a.uniformMatrix4fv(c.fallbackMatrix,!1,x.fallbackMatrix);const O=pt(l,le),U=br(v.date),A=$e(...Is(qt(v.date)),U-Eo),Y=So([A[0]-O[0],A[1]-O[1],A[2]-O[2]]),p=Math.hypot(...O),H=Math.max(.25*(p-1),.002),G=[O[0]+Y[0]*H,O[1]+Y[1]*H,O[2]+Y[2]*H],z=Math.hypot(...G),C=Math.asin(G[1]/z)*180/Math.PI,D=Math.atan2(G[2],G[0])*180/Math.PI,k=(z-1)*Eo,N=le.MercatorCoordinate.fromLngLat([D,C],0);c.centre&&a.uniform2f(c.centre,N.x,N.y),c.elevationGlobe&&a.uniform1f(c.elevationGlobe,k),c.elevationMercator&&a.uniform1f(c.elevationMercator,le.MercatorCoordinate.fromLngLat([D,C],k).z);const b=xs(v.date),j=b*v.haloScale,Q=(m.fov||.6435)/2,J=l.getCanvas(),S=Math.tan(j)/Math.tan(Q);c.size&&a.uniform2f(c.size,S*(J.height/J.width),S),c.glowAngle&&a.uniform1f(c.glowAngle,j),c.discFraction&&a.uniform1f(c.discFraction,1/v.haloScale),c.discGain&&a.uniform1f(c.discGain,v.discGain);const X=[-O[0]/p,-O[1]/p,-O[2]/p],R=Math.acos(St(Ds(X,Y),-1,1)),$=Math.asin(St(1/p,-1,1)),ee=As(R,b,$),K=Y,B=So(Lo([0,1,0],K)),Ae=Lo(K,B);c.forward&&a.uniform3f(c.forward,...K),c.right&&a.uniform3f(c.right,...B),c.up&&a.uniform3f(c.up,...Ae),c.camera&&a.uniform3f(c.camera,...O),c.visible&&a.uniform1f(c.visible,ee),c.brightness&&a.uniform1f(c.brightness,v.brightness),c.haloStrength&&a.uniform1f(c.haloStrength,v.haloStrength),c.coreColour&&a.uniform3f(c.coreColour,...v.coreColour),c.haloColour&&a.uniform3f(c.haloColour,...v.haloColour),a.bindBuffer(a.ARRAY_BUFFER,u.corner),a.enableVertexAttribArray(d.corner),a.vertexAttribPointer(d.corner,2,a.FLOAT,!1,0,0),a.disable(a.DEPTH_TEST),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,u.index),a.drawElements(a.TRIANGLES,Ao.length,a.UNSIGNED_SHORT,0),a.depthMask(!0),y=Cs(x.mainMatrix,N,z,ee)},setOptions(g={}){v={...v,...g},l?.triggerRepaint()},getOptions:()=>({...v}),get screenPosition(){return y}}},Cs=(e,t,r,n)=>{const i=t.x*2*Math.PI+Math.PI,s=2*Math.atan(Math.exp(Math.PI-t.y*2*Math.PI))-Math.PI/2,o=Math.cos(s),l=[Math.sin(i)*o*r,Math.sin(s)*r,Math.cos(i)*o*r,1],a=[0,1,2,3].map(T=>e[T]*l[0]+e[4+T]*l[1]+e[8+T]*l[2]+e[12+T]*l[3]);if(!(a[3]>0))return{u:.5,v:.5,onScreen:!1,visible:0};const u=a[0]/a[3]*.5+.5,y=a[1]/a[3]*.5+.5;return{u,v:y,onScreen:u>-.5&&u<1.5&&y>-.5&&y<1.5,visible:n}},St=(e,t,r)=>Math.min(r,Math.max(t,e)),Ds=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],So=e=>{const t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},Lo=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Is=([e,t,r])=>[Math.atan2(r,e)*180/Math.PI,Math.asin(St(t,-1,1))*180/Math.PI],Us=wr,vr="tm-moon",ra=63710088e-1,Fs=1737400,mt=Math.PI/180,Ns=Date.UTC(2e3,0,1,12),Os=Date.UTC(1999,11,31,0),se=e=>Math.sin(e*mt),ge=e=>Math.cos(e*mt),_r=(e=new Date)=>{const t=(e.getTime()-Ns)/864e5,r=(e.getTime()-Os)/864e5,n=125.1228-.0529538083*r,i=5.1454,s=318.0634+.1643573223*r,o=60.2666,l=.0549,a=115.3654+13.0649929509*r;let u=a+l*180/Math.PI*se(a)*(1+l*ge(a));for(let b=0;b<3;b++)u-=(u-l*180/Math.PI*se(u)-a)/(1-l*ge(u));const y=o*(ge(u)-l),T=o*(Math.sqrt(1-l*l)*se(u)),v=Math.atan2(T,y)/mt,I=Math.sqrt(y*y+T*T);let g=I*(ge(n)*ge(v+s)-se(n)*se(v+s)*ge(i)),m=I*(se(n)*ge(v+s)+ge(n)*se(v+s)*ge(i)),w=I*(se(v+s)*se(i));const x=356.047+.9856002585*r,L=282.9404+470935e-10*r+x,d=n+s+a,c=d-L,O=d-n;let U=Math.atan2(m,g)/mt,A=Math.atan2(w,Math.hypot(g,m))/mt;U+=-1.274*se(a-2*c)+.658*se(2*c)-.186*se(x),A+=-.173*se(O-2*c);const Y=(I-.58*ge(a-2*c)-.46*ge(2*c))*ra,p=23.4393-3563e-10*t,H=ge(U)*ge(A),G=se(U)*ge(A)*ge(p)-se(A)*se(p),z=se(U)*ge(A)*se(p)+se(A)*ge(p),C=Math.atan2(G,H)/mt,D=Math.atan2(z,Math.hypot(H,G))/mt,k=(18.697374558+24.06570982441908*t)%24;let N=C-k*15;return N=(N%360+540)%360-180,{lng:N,lat:D,distance:Y}},xr=(e=new Date)=>{const{lng:t,lat:r,distance:n}=_r(e);return $e(t,r,n-ra)},Bs=new Float32Array([-1,-1,1,-1,-1,1,1,1]),Mo=new Uint16Array([0,1,2,1,3,2]),Qs=e=>`${e.vertexShaderPrelude}
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
}`,qs=()=>`precision highp float;
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
${ca}

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
}`,Hs=({date:e=new Date,sun:t=[1,0,0],albedoUrl:r=null,sizeScale:n=1,brightness:i=1,glow:s=.4,glowExtent:o=1.8}={})=>{let l=null,a=null,u=null,y=null,T=!1;const v=new Map;let I={date:e,sun:t,albedoUrl:r,sizeScale:n,brightness:i,glow:s,glowExtent:o};const g=w=>{const x=w.variantName;if(v.has(x))return v.get(x);const L=Ke(a,Qs(w),qs(),"tm-moon",{es300:!0}),d={program:L,attribs:{corner:a.getAttribLocation(L,"a_corner")},uniforms:{centre:a.getUniformLocation(L,"a_centre"),elevationGlobe:a.getUniformLocation(L,"a_elevation_globe"),elevationMercator:a.getUniformLocation(L,"a_elevation_mercator"),size:a.getUniformLocation(L,"u_size"),albedo:a.getUniformLocation(L,"u_albedo"),hasAlbedo:a.getUniformLocation(L,"u_hasAlbedo"),sun:a.getUniformLocation(L,"u_sun"),right:a.getUniformLocation(L,"u_right"),up:a.getUniformLocation(L,"u_up"),forward:a.getUniformLocation(L,"u_forward"),brightness:a.getUniformLocation(L,"u_brightness"),discEdge:a.getUniformLocation(L,"u_discEdge"),glow:a.getUniformLocation(L,"u_glow"),glowExtent:a.getUniformLocation(L,"u_glowExtent"),matrix:a.getUniformLocation(L,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(L,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(L,"u_projection_clipping_plane"),transition:a.getUniformLocation(L,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(L,"u_projection_fallback_matrix")}};return v.set(x,d),d},m=w=>{const x=new Image;x.crossOrigin="anonymous",x.onload=()=>{a&&(y=y||a.createTexture(),a.bindTexture(a.TEXTURE_2D,y),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,x),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.REPEAT),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),T=!0,l?.triggerRepaint())},x.src=w};return{id:vr,type:"custom",renderingMode:"3d",onAdd(w,x){l=w,a=x;const L=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,L),a.bufferData(a.ARRAY_BUFFER,Bs,a.STATIC_DRAW);const d=a.createBuffer();a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,d),a.bufferData(a.ELEMENT_ARRAY_BUFFER,Mo,a.STATIC_DRAW),u={corner:L,index:d},I.albedoUrl&&m(I.albedoUrl)},onRemove(){a&&(v.forEach(({program:w})=>a.deleteProgram(w)),v.clear(),y&&(a.deleteTexture(y),y=null,T=!1),u&&(a.deleteBuffer(u.corner),a.deleteBuffer(u.index),u=null),l=null,a=null)},render(w,x){if(!u||I.brightness<=0)return;const L=x&&x.shaderData,d=x&&x.defaultProjectionData;if(!L||!d)return;const{lng:c,lat:O,distance:U}=_r(I.date),{program:A,attribs:Y,uniforms:p}=g(L);a.useProgram(A),p.matrix&&a.uniformMatrix4fv(p.matrix,!1,d.mainMatrix),p.tileMercatorCoords&&a.uniform4f(p.tileMercatorCoords,...d.tileMercatorCoords),p.clippingPlane&&a.uniform4f(p.clippingPlane,...d.clippingPlane),p.transition&&a.uniform1f(p.transition,d.projectionTransition),p.fallbackMatrix&&a.uniformMatrix4fv(p.fallbackMatrix,!1,d.fallbackMatrix);const H=pt(l,le),G=$e(c,O,U-ra),z=Ro([G[0]-H[0],G[1]-H[1],G[2]-H[2]]),D=Math.hypot(...H)+1.2,k=[H[0]+z[0]*D,H[1]+z[1]*D,H[2]+z[2]*D],N=Math.hypot(...k),b=Math.asin(k[1]/N)*180/Math.PI,j=Math.atan2(k[2],k[0])*180/Math.PI,Q=(N-1)*ra,J=le.MercatorCoordinate.fromLngLat([j,b],0);p.centre&&a.uniform2f(p.centre,J.x,J.y),p.elevationGlobe&&a.uniform1f(p.elevationGlobe,Q),p.elevationMercator&&a.uniform1f(p.elevationMercator,le.MercatorCoordinate.fromLngLat([j,b],Q).z);const S=Math.atan(Fs*I.sizeScale/U),X=(x.fov||.6435)/2,R=l.getCanvas(),$=Math.tan(S)/Math.tan(X),K=1+(I.glow>0?Math.max(0,I.glowExtent):0),B=$*K;p.size&&a.uniform2f(p.size,B*(R.height/R.width),B),p.discEdge&&a.uniform1f(p.discEdge,1/K);const Ae=z,fe=Ro(Po([0,1,0],Ae)),ce=Po(Ae,fe);p.forward&&a.uniform3f(p.forward,...Ae),p.right&&a.uniform3f(p.right,...fe),p.up&&a.uniform3f(p.up,...ce),p.sun&&a.uniform3f(p.sun,...I.sun),p.brightness&&a.uniform1f(p.brightness,I.brightness),p.glow&&a.uniform1f(p.glow,I.glow),p.glowExtent&&a.uniform1f(p.glowExtent,I.glowExtent),p.hasAlbedo&&a.uniform1f(p.hasAlbedo,T?1:0),T&&p.albedo&&(a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,y),a.uniform1i(p.albedo,0)),a.bindBuffer(a.ARRAY_BUFFER,u.corner),a.enableVertexAttribArray(Y.corner),a.vertexAttribPointer(Y.corner,2,a.FLOAT,!1,0,0),a.enable(a.DEPTH_TEST),a.depthFunc(a.LEQUAL),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,u.index),a.drawElements(a.TRIANGLES,Mo.length,a.UNSIGNED_SHORT,0),a.depthMask(!0)},setOptions(w={}){const x=I.albedoUrl;I={...I,...w},w.albedoUrl!==void 0&&w.albedoUrl!==x&&(T=!1,w.albedoUrl&&m(w.albedoUrl)),l?.triggerRepaint()},getOptions:()=>({...I}),get hasAlbedo(){return T}}},Ro=e=>{const t=Math.hypot(...e)||1;return[e[0]/t,e[1]/t,e[2]/t]},Po=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],Gs=vr,zs=6957e5,$s=1737400,Ws=63710088e-1,js=$s/Ws,Ys=(e,t,r)=>Math.min(r,Math.max(t,e)),Xs=(e=new Date)=>Math.asin(zs/Es(e)),Ks=.035,Vs=(e=new Date,t=null,r=null)=>{const n=t||qt(e),i=r||xr(e),s=Math.hypot(...i);return Math.acos(Ys((n[0]*i[0]+n[1]*i[1]+n[2]*i[2])/s,-1,1))<Ks},Zs=`
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
`,Er="tm-daylight",Nt={field:0,wind:1,relief:2,lights:3,patches:4},Js=e=>`#version 300 es
${e.define}
${e.vertexShaderPrelude}
in vec2 a_pos;
in vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
out vec3 v_sphere;
${la}
void main() {
  v_sphere = a_sphere;
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,el=()=>`#version 300 es
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
${ca}
${or}
${Qa}
${lr}
${cr}
${Oi}
${Zs}
// The same field, wind and clock the deck in clouds.js draws itself from.
${nr}

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
    float remaining = eclipseLight(normal, sunDir, u_moon, u_sunRadius, ${js.toFixed(8)});
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
}`,tl=({sun:e=[1,0,0],nightDarkness:t=.965,lightsUrl:r=null,lightsAmount:n=0,nightColour:i=[.02,.035,.07],twilightColour:s=[.62,.32,.16],twilightCool:o=[.1,.15,.28],twilightStrength:l=.55,reliefUrl:a=null,reliefWidth:u=8192,reliefPower:y=1.5,cloudShadow:T=.5,shadowSoftness:v=.75,eclipse:I=!0,date:g=null,fieldUrl:m=null,patchUrl:w=null,windUrl:x=null,windAmount:L=1,windScale:d=.06,windRate:c=.05,driftRate:O=4e-4,animate:U=!0}={})=>{const A=sa();let Y=null,p=null,H=null,G=null,z=null,C=null,D=null,k=null;const N=new Map;let b={sun:e,nightDarkness:t,lightsUrl:r,lightsAmount:n,nightColour:i,twilightColour:s,twilightCool:o,twilightStrength:l,reliefUrl:a,reliefWidth:u,reliefPower:y,cloudShadow:T,eclipse:I,date:g,shadowSoftness:v,fieldUrl:m,patchUrl:w,windUrl:x,windAmount:L,windScale:d,windRate:c,driftRate:O,animate:U};const j=S=>{const X=S.variantName;if(N.has(X))return N.get(X);const R=Ke(p,Js(S),el(),"tm-daylight"),$={program:R,attribs:{pos:p.getAttribLocation(R,"a_pos"),sphere:p.getAttribLocation(R,"a_sphere")},uniforms:{elevationGlobe:p.getUniformLocation(R,"a_elevation_globe"),elevationMercator:p.getUniformLocation(R,"a_elevation_mercator"),sun:p.getUniformLocation(R,"u_sun"),camera:p.getUniformLocation(R,"u_camera"),globeness:p.getUniformLocation(R,"u_globeness"),nightDarkness:p.getUniformLocation(R,"u_nightDarkness"),nightColour:p.getUniformLocation(R,"u_nightColour"),twilightColour:p.getUniformLocation(R,"u_twilightColour"),twilightCool:p.getUniformLocation(R,"u_twilightCool"),twilightStrength:p.getUniformLocation(R,"u_twilightStrength"),lights:p.getUniformLocation(R,"u_lights"),lightsAmount:p.getUniformLocation(R,"u_lightsAmount"),relief:p.getUniformLocation(R,"u_relief"),reliefPower:p.getUniformLocation(R,"u_reliefPower"),cloudShadow:p.getUniformLocation(R,"u_cloudShadow"),shadowSoftness:p.getUniformLocation(R,"u_shadowSoftness"),cloudAltitude:p.getUniformLocation(R,"u_cloudAltitude"),moon:p.getUniformLocation(R,"u_moon"),sunRadius:p.getUniformLocation(R,"u_sunRadius"),...Object.fromEntries(ir.map(ee=>[ee,p.getUniformLocation(R,`u_${ee}`)])),matrix:p.getUniformLocation(R,"u_projection_matrix"),tileMercatorCoords:p.getUniformLocation(R,"u_projection_tile_mercator_coords"),clippingPlane:p.getUniformLocation(R,"u_projection_clipping_plane"),transition:p.getUniformLocation(R,"u_projection_transition"),fallbackMatrix:p.getUniformLocation(R,"u_projection_fallback_matrix")}};return N.set(X,$),$},Q=()=>Y?.triggerRepaint(),J=(S,X,R,$)=>{!X?.ready||!S[R]||(p.activeTexture(p.TEXTURE0+$),p.bindTexture(p.TEXTURE_2D,X.texture),p.uniform1i(S[R],$))};return{id:Er,type:"custom",renderingMode:"3d",onAdd(S,X){Y=S,p=X;const R=($,ee)=>{const K=p.createBuffer();return p.bindBuffer($,K),p.bufferData($,ee,p.STATIC_DRAW),K};H={pos:R(p.ARRAY_BUFFER,A.positions),sphere:R(p.ARRAY_BUFFER,A.spheres),index:R(p.ELEMENT_ARRAY_BUFFER,A.indices)},b.lightsUrl&&(G=Be(p,b.lightsUrl,Q)),b.reliefUrl&&(z=Be(p,b.reliefUrl,Q)),b.fieldUrl&&(C=Be(p,b.fieldUrl,Q,{channels:1})),b.windUrl&&(D=Be(p,b.windUrl,Q)),b.patchUrl&&(k=Be(p,b.patchUrl,Q,{channels:1}))},onRemove(){p&&(N.forEach(({program:S})=>p.deleteProgram(S)),N.clear(),G?.release(),G=null,z?.release(),z=null,C?.release(),C=null,D?.release(),D=null,k?.release(),k=null,H&&(p.deleteBuffer(H.pos),p.deleteBuffer(H.sphere),p.deleteBuffer(H.index),H=null),Y=null,p=null)},render(S,X){if(!H||b.nightDarkness<=0)return;const R=X&&X.shaderData,$=X&&X.defaultProjectionData;if(!R||!$)return;const{program:ee,attribs:K,uniforms:B}=j(R);p.useProgram(ee),B.matrix&&p.uniformMatrix4fv(B.matrix,!1,$.mainMatrix),B.tileMercatorCoords&&p.uniform4f(B.tileMercatorCoords,...$.tileMercatorCoords),B.clippingPlane&&p.uniform4f(B.clippingPlane,...$.clippingPlane),B.transition&&p.uniform1f(B.transition,$.projectionTransition),B.fallbackMatrix&&p.uniformMatrix4fv(B.fallbackMatrix,!1,$.fallbackMatrix);const Ae=Y.getCenter().lat,fe=0;B.elevationGlobe&&p.uniform1f(B.elevationGlobe,fe),B.elevationMercator&&p.uniform1f(B.elevationMercator,le.MercatorCoordinate.fromLngLat([0,Ae],fe).z),B.sun&&p.uniform3f(B.sun,...b.sun),B.camera&&p.uniform3f(B.camera,...pt(Y,le)),B.globeness&&p.uniform1f(B.globeness,$.projectionTransition),B.nightDarkness&&p.uniform1f(B.nightDarkness,b.nightDarkness),B.nightColour&&p.uniform3f(B.nightColour,...b.nightColour),B.twilightColour&&p.uniform3f(B.twilightColour,...b.twilightColour),B.twilightCool&&p.uniform3f(B.twilightCool,...b.twilightCool),B.twilightStrength&&p.uniform1f(B.twilightStrength,b.twilightStrength),B.lightsAmount&&p.uniform1f(B.lightsAmount,G?.ready?b.lightsAmount:0);const ce=z?.ready?Hi(Y.getZoom(),Ae,b.reliefWidth).strength:0;B.reliefPower&&p.uniform1f(B.reliefPower,b.reliefPower*ce),B.cloudShadow&&p.uniform1f(B.cloudShadow,b.cloudShadow),B.shadowSoftness&&p.uniform1f(B.shadowSoftness,b.shadowSoftness),B.cloudAltitude&&p.uniform1f(B.cloudAltitude,aa/ia);const Se=b.eclipse?b.date:null,Ie=Se&&Vs(Se)?xr(Se):null;B.sunRadius&&p.uniform1f(B.sunRadius,Ie?Xs(Se):0),Ie&&B.moon&&p.uniform3f(B.moon,...Ie),sr(p,B,b,{seconds:performance.now()*.001,field:C,wind:D,patches:k},Nt.field,Nt.wind,Nt.patches),J(B,z,"relief",Nt.relief),J(B,G,"lights",Nt.lights),p.bindBuffer(p.ARRAY_BUFFER,H.pos),p.enableVertexAttribArray(K.pos),p.vertexAttribPointer(K.pos,2,p.FLOAT,!1,0,0),p.bindBuffer(p.ARRAY_BUFFER,H.sphere),p.enableVertexAttribArray(K.sphere),p.vertexAttribPointer(K.sphere,3,p.FLOAT,!1,0,0),p.disable(p.DEPTH_TEST),p.depthMask(!1),p.bindBuffer(p.ELEMENT_ARRAY_BUFFER,H.index),p.drawElements(p.TRIANGLES,A.indices.length,p.UNSIGNED_SHORT,0),p.enable(p.DEPTH_TEST),p.depthMask(!0),b.animate&&(C?.ready||k?.ready)&&b.cloudShadow>0&&Y.triggerRepaint()},setOptions(S={}){const X=b;if(b={...b,...S},!p){Y?.triggerRepaint();return}const R=($,ee)=>{if(S[ee]===void 0||S[ee]===X[ee])return $;$?.release();const K=ee==="patchUrl"||ee==="fieldUrl"?{channels:1}:void 0;return b[ee]?Be(p,b[ee],Q,K):null};G=R(G,"lightsUrl"),z=R(z,"reliefUrl"),C=R(C,"fieldUrl"),D=R(D,"windUrl"),k=R(k,"patchUrl"),Y?.triggerRepaint()},getOptions:()=>({...b}),get hasLights(){return!!G?.ready},get hasRelief(){return!!z?.ready}}},al=Er,Tr="tm-atmosphere",ol=63710088e-1,Sa=2e5,rl=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_pos;
attribute vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
varying vec3 v_sphere;
${la}
void main() {
  v_sphere = a_sphere;
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,nl=()=>`precision highp float;
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

${ar}

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
}`,il=({strength:e=1,sun:t=[.4,.5,.75],dayColour:r=[.32,.55,1],duskColour:n=[1,.45,.18],forwardScatter:i=.35,scatterG:s=.6}={})=>{const o=sa();let l=null,a=null,u=null;const y=new Map;let T={strength:e,sun:t,dayColour:r,duskColour:n,forwardScatter:i,scatterG:s};const v=I=>{const g=I.variantName;if(y.has(g))return y.get(g);const m=Ke(a,rl(I),nl(),"tm-atmosphere",{es300:!0}),w={program:m,attribs:{pos:a.getAttribLocation(m,"a_pos"),sphere:a.getAttribLocation(m,"a_sphere")},uniforms:{elevationGlobe:a.getUniformLocation(m,"a_elevation_globe"),elevationMercator:a.getUniformLocation(m,"a_elevation_mercator"),camera:a.getUniformLocation(m,"u_camera"),sun:a.getUniformLocation(m,"u_sun"),top:a.getUniformLocation(m,"u_top"),strength:a.getUniformLocation(m,"u_strength"),dayColour:a.getUniformLocation(m,"u_dayColour"),duskColour:a.getUniformLocation(m,"u_duskColour"),forward:a.getUniformLocation(m,"u_forward"),scatterG:a.getUniformLocation(m,"u_scatter_g"),matrix:a.getUniformLocation(m,"u_projection_matrix"),tileMercatorCoords:a.getUniformLocation(m,"u_projection_tile_mercator_coords"),clippingPlane:a.getUniformLocation(m,"u_projection_clipping_plane"),transition:a.getUniformLocation(m,"u_projection_transition"),fallbackMatrix:a.getUniformLocation(m,"u_projection_fallback_matrix")}};return y.set(g,w),w};return{id:Tr,type:"custom",renderingMode:"3d",onAdd(I,g){l=I,a=g;const m=(w,x)=>{const L=a.createBuffer();return a.bindBuffer(w,L),a.bufferData(w,x,a.STATIC_DRAW),L};u={pos:m(a.ARRAY_BUFFER,o.positions),sphere:m(a.ARRAY_BUFFER,o.spheres),index:m(a.ELEMENT_ARRAY_BUFFER,o.indices)}},onRemove(){a&&(y.forEach(({program:I})=>a.deleteProgram(I)),y.clear(),u&&(a.deleteBuffer(u.pos),a.deleteBuffer(u.sphere),a.deleteBuffer(u.index),u=null),l=null,a=null)},render(I,g){if(!u||T.strength<=0)return;const m=g&&g.shaderData,w=g&&g.defaultProjectionData;if(!m||!w)return;const{program:x,attribs:L,uniforms:d}=v(m);a.useProgram(x),d.matrix&&a.uniformMatrix4fv(d.matrix,!1,w.mainMatrix),d.tileMercatorCoords&&a.uniform4f(d.tileMercatorCoords,...w.tileMercatorCoords),d.clippingPlane&&a.uniform4f(d.clippingPlane,...w.clippingPlane),d.transition&&a.uniform1f(d.transition,w.projectionTransition),d.fallbackMatrix&&a.uniformMatrix4fv(d.fallbackMatrix,!1,w.fallbackMatrix);const c=l.getCenter().lat;d.elevationGlobe&&a.uniform1f(d.elevationGlobe,Sa),d.elevationMercator&&a.uniform1f(d.elevationMercator,le.MercatorCoordinate.fromLngLat([0,c],Sa).z);const O=pt(l,le);d.camera&&a.uniform3f(d.camera,O[0],O[1],O[2]),d.sun&&a.uniform3f(d.sun,...T.sun),d.top&&a.uniform1f(d.top,1+Sa/ol),d.strength&&a.uniform1f(d.strength,T.strength),d.dayColour&&a.uniform3f(d.dayColour,...T.dayColour),d.duskColour&&a.uniform3f(d.duskColour,...T.duskColour),d.forward&&a.uniform1f(d.forward,T.forwardScatter),d.scatterG&&a.uniform1f(d.scatterG,T.scatterG),a.bindBuffer(a.ARRAY_BUFFER,u.pos),a.enableVertexAttribArray(L.pos),a.vertexAttribPointer(L.pos,2,a.FLOAT,!1,0,0),a.bindBuffer(a.ARRAY_BUFFER,u.sphere),a.enableVertexAttribArray(L.sphere),a.vertexAttribPointer(L.sphere,3,a.FLOAT,!1,0,0),a.enable(a.DEPTH_TEST),a.depthFunc(a.LEQUAL),a.depthMask(!1),a.bindBuffer(a.ELEMENT_ARRAY_BUFFER,u.index),a.drawElements(a.TRIANGLES,o.indices.length,a.UNSIGNED_SHORT,0),a.depthMask(!0)},setOptions(I={}){T={...T,...I},l?.triggerRepaint()},getOptions:()=>({...T})}},sl=Tr,ll=32,kr=[{width:8192,height:4096,url:"/timemap/ocean-sdf-8192.webp"},{width:4096,height:2048,url:"/timemap/ocean-sdf-4096.webp"}],cl=`
  float oceanDistanceKm(float stored, float rangeKm) {
    return (stored * 2.0 - 1.0) * rangeKm;
  }
`,Ar="tm-ocean",ul=e=>`${e.vertexShaderPrelude}
${e.define}
attribute vec2 a_pos;
attribute vec3 a_sphere;
uniform float a_elevation_globe;
uniform float a_elevation_mercator;
varying vec3 v_sphere;
${la}
void main() {
  v_sphere = a_sphere;
  // Sea level: the glint belongs on the water, not above it.
  gl_Position = projectShell(a_pos, a_elevation_globe, a_elevation_mercator);
}`,hl=()=>`precision highp float;
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
${ca}
${tr}
${or}
${Qa}
${cl}

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
}`,dl=(e,{fadeInAbove:t=9e5,fadeOutBelow:r=18e4}={})=>{const n=Math.max(0,Math.min(1,(e-r)/(t-r)));return n*n*(3-2*n)},fl=(e,t,r=.8)=>{const n=156543.03392*Math.cos(t*Math.PI/180)/Math.pow(2,e);return Math.max(r,n*1.5/1e3)},ml=40075,pl=e=>Number.isFinite(e)&&e>0?ml/e/2:.8,Co=(e,t=kr)=>t.find(r=>r.width<=e&&r.height<=e)||null,gl=({opacity:e=1,strength:t=.9,roughness:r=.55,windPatch:n=.3,windScale:i=14,edgeRemap:s=0,sun:o=[.4,.5,.75],water:l=1,absorption:a=[.45,.06,.02],scatter:u=[.12,.265,.43],bottom:y=[.42,.4,.33],sky:T=[.34,.5,.76],shelfKm:v=22,shelfDepthM:I=16,shoreSoftnessKm:g=.8,fadeInAbove:m=9e5,fadeOutBelow:w=18e4,sources:x=kr}={})=>{const L=sa();let d=null,c=null,O=null,U=null,A=null,Y=!1;const p=new Map;let H={opacity:e,strength:t,roughness:r,windPatch:n,windScale:i,edgeRemap:s,sun:o,water:l,absorption:a,scatter:u,bottom:y,sky:T,shelfKm:v,shelfDepthM:I,shoreSoftnessKm:g,fadeInAbove:m,fadeOutBelow:w,sources:x};const G=k=>{const N=k.variantName;if(p.has(N))return p.get(N);const b=Ke(c,ul(k),hl(),"tm-ocean",{es300:!0}),j={program:b,attribs:{pos:c.getAttribLocation(b,"a_pos"),sphere:c.getAttribLocation(b,"a_sphere")},uniforms:{elevationGlobe:c.getUniformLocation(b,"a_elevation_globe"),elevationMercator:c.getUniformLocation(b,"a_elevation_mercator"),camera:c.getUniformLocation(b,"u_camera"),sun:c.getUniformLocation(b,"u_sun"),globeness:c.getUniformLocation(b,"u_globeness"),field:c.getUniformLocation(b,"u_field"),rangeKm:c.getUniformLocation(b,"u_rangeKm"),shoreKm:c.getUniformLocation(b,"u_shoreKm"),shelfKm:c.getUniformLocation(b,"u_shelfKm"),strength:c.getUniformLocation(b,"u_strength"),roughness:c.getUniformLocation(b,"u_roughness"),windPatch:c.getUniformLocation(b,"u_windPatch"),windScale:c.getUniformLocation(b,"u_windScale"),water:c.getUniformLocation(b,"u_water"),scatter:c.getUniformLocation(b,"u_scatter"),bottom:c.getUniformLocation(b,"u_bottom"),absorption:c.getUniformLocation(b,"u_absorption"),shelfDepthM:c.getUniformLocation(b,"u_shelfDepthM"),sky:c.getUniformLocation(b,"u_sky"),fade:c.getUniformLocation(b,"u_fade"),opacity:c.getUniformLocation(b,"u_opacity"),edgeRemap:c.getUniformLocation(b,"u_edgeRemap"),matrix:c.getUniformLocation(b,"u_projection_matrix"),tileMercatorCoords:c.getUniformLocation(b,"u_projection_tile_mercator_coords"),clippingPlane:c.getUniformLocation(b,"u_projection_clipping_plane"),transition:c.getUniformLocation(b,"u_projection_transition"),fallbackMatrix:c.getUniformLocation(b,"u_projection_fallback_matrix")}};return p.set(N,j),j},z=()=>{A=c.createTexture(),c.bindTexture(c.TEXTURE_2D,A),c.texImage2D(c.TEXTURE_2D,0,c.LUMINANCE,1,1,0,c.LUMINANCE,c.UNSIGNED_BYTE,new Uint8Array([0])),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,c.LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,c.LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE)},C=k=>{c&&(A&&c.deleteTexture(A),A=c.createTexture(),c.bindTexture(c.TEXTURE_2D,A),c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL,!1),rr(c)?c.texImage2D(c.TEXTURE_2D,0,c.R8,c.RED,c.UNSIGNED_BYTE,k):c.texImage2D(c.TEXTURE_2D,0,c.LUMINANCE,c.LUMINANCE,c.UNSIGNED_BYTE,k),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_S,c.REPEAT),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_WRAP_T,c.CLAMP_TO_EDGE),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MIN_FILTER,c.LINEAR_MIPMAP_LINEAR),c.texParameteri(c.TEXTURE_2D,c.TEXTURE_MAG_FILTER,c.LINEAR),c.generateMipmap(c.TEXTURE_2D),Y=!0,d?.triggerRepaint())},D=()=>{const k=Co(c.getParameter(c.MAX_TEXTURE_SIZE),H.sources);if(!k)return;const N=k.url;O=k.width,fetch(N,{credentials:"omit"}).then(b=>b.ok?b.blob():Promise.reject(new Error(b.status))).then(b=>createImageBitmap(b,{colorSpaceConversion:"none",premultiplyAlpha:"none",imageOrientation:"none"})).then(b=>{if(Co(c?.getParameter(c.MAX_TEXTURE_SIZE)??0,H.sources)?.url!==N){b.close?.();return}C(b),b.close?.()}).catch(()=>{})};return{id:Ar,type:"custom",renderingMode:"3d",onAdd(k,N){d=k,c=N;const b=(j,Q)=>{const J=c.createBuffer();return c.bindBuffer(j,J),c.bufferData(j,Q,c.STATIC_DRAW),J};U={pos:b(c.ARRAY_BUFFER,L.positions),sphere:b(c.ARRAY_BUFFER,L.spheres),index:b(c.ELEMENT_ARRAY_BUFFER,L.indices)},z(),D()},onRemove(){c&&(p.forEach(({program:k})=>c.deleteProgram(k)),p.clear(),A&&(c.deleteTexture(A),A=null,Y=!1),U&&(c.deleteBuffer(U.pos),c.deleteBuffer(U.sphere),c.deleteBuffer(U.index),U=null),d=null,c=null)},render(k,N){if(!U||H.opacity<=0)return;const b=N&&N.shaderData,j=N&&N.defaultProjectionData;if(!b||!j)return;const{program:Q,attribs:J,uniforms:S}=G(b);c.useProgram(Q),S.matrix&&c.uniformMatrix4fv(S.matrix,!1,j.mainMatrix),S.tileMercatorCoords&&c.uniform4f(S.tileMercatorCoords,...j.tileMercatorCoords),S.clippingPlane&&c.uniform4f(S.clippingPlane,...j.clippingPlane),S.transition&&c.uniform1f(S.transition,j.projectionTransition),S.fallbackMatrix&&c.uniformMatrix4fv(S.fallbackMatrix,!1,j.fallbackMatrix);const X=d.getCenter(),R=0;S.elevationGlobe&&c.uniform1f(S.elevationGlobe,R),S.elevationMercator&&c.uniform1f(S.elevationMercator,le.MercatorCoordinate.fromLngLat([0,X.lat],R).z),S.camera&&c.uniform3f(S.camera,...pt(d,le)),S.sun&&c.uniform3f(S.sun,...H.sun),S.globeness&&c.uniform1f(S.globeness,j.projectionTransition),S.field&&(c.activeTexture(c.TEXTURE0),c.bindTexture(c.TEXTURE_2D,A),c.uniform1i(S.field,0)),S.rangeKm&&c.uniform1f(S.rangeKm,ll),S.shoreKm&&c.uniform1f(S.shoreKm,fl(d.getZoom(),X.lat,Math.max(H.shoreSoftnessKm,pl(O)))),S.shelfKm&&c.uniform1f(S.shelfKm,H.shelfKm),S.strength&&c.uniform1f(S.strength,H.strength),S.roughness&&c.uniform1f(S.roughness,H.roughness),S.windPatch&&c.uniform1f(S.windPatch,H.windPatch),S.windScale&&c.uniform1f(S.windScale,H.windScale),S.water&&c.uniform1f(S.water,H.water),S.scatter&&c.uniform3f(S.scatter,...H.scatter),S.bottom&&c.uniform3f(S.bottom,...H.bottom),S.absorption&&c.uniform3f(S.absorption,...H.absorption),S.shelfDepthM&&c.uniform1f(S.shelfDepthM,H.shelfDepthM),S.sky&&c.uniform3f(S.sky,...H.sky),S.opacity&&c.uniform1f(S.opacity,H.opacity),S.edgeRemap&&c.uniform1f(S.edgeRemap,H.edgeRemap),S.fade&&c.uniform1f(S.fade,dl(qa(d,le),H)),c.bindBuffer(c.ARRAY_BUFFER,U.pos),c.enableVertexAttribArray(J.pos),c.vertexAttribPointer(J.pos,2,c.FLOAT,!1,0,0),c.bindBuffer(c.ARRAY_BUFFER,U.sphere),c.enableVertexAttribArray(J.sphere),c.vertexAttribPointer(J.sphere,3,c.FLOAT,!1,0,0),c.disable(c.DEPTH_TEST),c.depthMask(!1),c.bindBuffer(c.ELEMENT_ARRAY_BUFFER,U.index),c.drawElements(c.TRIANGLES,L.indices.length,c.UNSIGNED_SHORT,0),c.enable(c.DEPTH_TEST),c.depthMask(!0)},setOptions(k={}){const N=H.sources;H={...H,...k},k.sources!==void 0&&k.sources!==N&&(Y=!1,c&&D()),d?.triggerRepaint()},getOptions:()=>({...H}),get hasField(){return Y}}},yl=Ar,Sr=(e,t,r,n=!0)=>{const i=Math.max(1,Math.floor(t)),s=Math.max(1,Math.floor(r)),o=e.createTexture();e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,i,s,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);let l=null;return n&&(l=e.createFramebuffer(),e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0)),{texture:o,framebuffer:l,width:i,height:s}},Do=(e,t)=>{t&&(t.texture&&e.deleteTexture(t.texture),t.framebuffer&&e.deleteFramebuffer(t.framebuffer))},bl=(e,t,r)=>{const n=[];for(let i=1;i<=r;i++){const s=2**i;n.push({width:Math.max(1,Math.floor(e/s)),height:Math.max(1,Math.floor(t/s))})}return n},wl=(e,t,r,n)=>bl(t,r,n).map(i=>Sr(e,i.width,i.height)),vl=new Float32Array([-1,-1,1,-1,-1,1,1,1]),_l=e=>{const t=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,vl,e.STATIC_DRAW),t},xl=`precision highp float;
attribute vec2 a_corner;
varying vec2 v_uv;
void main() {
  v_uv = a_corner * 0.5 + 0.5;
  gl_Position = vec4(a_corner, 0.0, 1.0);
}`,El=e=>({framebuffer:e.getParameter(e.FRAMEBUFFER_BINDING),viewport:e.getParameter(e.VIEWPORT)}),Io=(e,t)=>{e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.viewport(t.viewport[0],t.viewport[1],t.viewport[2],t.viewport[3]),e.activeTexture(e.TEXTURE0),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.enable(e.BLEND),e.depthMask(!0)},La=(e,t,r)=>{e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.viewport(0,0,t.width,t.height),e.useProgram(r)},Ot=(e,t,r)=>{e.bindBuffer(e.ARRAY_BUFFER,t),e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLE_STRIP,0,4)},Bt=(e,t,r,n)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r),n&&e.uniform1i(n,t)},Lr="tm-bloom",Uo=5,Tl=[[1.18,.92,.68],[1.12,.95,.78],[1.06,.98,.89],[1.02,1,.97]],kl=[1,1,1],Al=()=>`precision highp float;
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
}`,Sl=()=>`precision highp float;
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
}`,Ll=()=>`precision highp float;
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
}`,Ml=()=>`precision highp float;
varying vec2 v_uv;
uniform sampler2D u_bloom;
uniform float u_strength;

void main() {
  gl_FragColor = vec4(texture2D(u_bloom, v_uv).rgb * u_strength, 0.0);
}`,Rl=()=>`precision highp float;
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
}`,Pl={saturation:1,hue:0,exposure:1,contrast:1},Cl=e=>Math.abs((e?.saturation??1)-1)>.001||Math.abs(e?.hue??0)>.001||Math.abs((e?.exposure??1)-1)>.001||Math.abs((e?.contrast??1)-1)>.001,Dl=({strength:e=.9,threshold:t=.6,knee:r=.12,radius:n=1,chromatic:i=!0,...s}={})=>{let o=null,l=null,a=null,u=null,y=null,T=null,v=null,I={strength:e,threshold:t,knee:r,radius:n,chromatic:i,...Pl,...s};const g=()=>{const x=(L,d,c)=>{const O=Ke(l,xl,L,d),U={};return c.forEach(A=>{U[A]=l.getUniformLocation(O,`u_${A}`)}),{program:O,corner:l.getAttribLocation(O,"a_corner"),...U}};return{bright:x(Al(),"tm-bloom-bright",["scene","threshold","knee"]),down:x(Sl(),"tm-bloom-down",["source","texel"]),up:x(Ll(),"tm-bloom-up",["source","texel","radius","tint"]),composite:x(Ml(),"tm-bloom-composite",["bloom","strength"]),grade:x(Rl(),"tm-grade",["scene","saturation","hue","exposure","contrast"])}},m=()=>{Do(l,y),y=null,T&&T.forEach(x=>Do(l,x)),T=null,v=null},w=(x,L)=>{v&&v.width===x&&v.height===L||(m(),y=Sr(l,x,L,!1),T=wl(l,x,L,Uo),v={width:x,height:L})};return{id:Lr,type:"custom",renderingMode:"2d",onAdd(x,L){o=x,l=L,a=_l(l)},onRemove(){l&&(u&&(Object.values(u).forEach(({program:x})=>l.deleteProgram(x)),u=null),m(),a&&(l.deleteBuffer(a),a=null),o=null,l=null)},render(){const x=Cl(I);if(!a||I.strength<=0&&!x)return;const L=o.getCanvas(),d=Math.max(1,L.width),c=Math.max(1,L.height),O=El(l);if(u=u||g(),w(d,c),l.bindTexture(l.TEXTURE_2D,y.texture),l.copyTexImage2D(l.TEXTURE_2D,0,l.RGBA,0,0,d,c,0),l.disable(l.DEPTH_TEST),l.disable(l.BLEND),l.depthMask(!1),x&&(l.bindFramebuffer(l.FRAMEBUFFER,null),l.viewport(0,0,d,c),l.useProgram(u.grade.program),Bt(l,0,y.texture,u.grade.scene),u.grade.saturation&&l.uniform1f(u.grade.saturation,I.saturation),u.grade.hue&&l.uniform1f(u.grade.hue,I.hue),u.grade.exposure&&l.uniform1f(u.grade.exposure,I.exposure),u.grade.contrast&&l.uniform1f(u.grade.contrast,I.contrast),Ot(l,a,u.grade.corner),l.bindTexture(l.TEXTURE_2D,y.texture),l.copyTexImage2D(l.TEXTURE_2D,0,l.RGBA,0,0,d,c,0)),I.strength<=0){Io(l,O);return}La(l,T[0],u.bright.program),Bt(l,0,y.texture,u.bright.scene),u.bright.threshold&&l.uniform1f(u.bright.threshold,I.threshold),u.bright.knee&&l.uniform1f(u.bright.knee,I.knee),Ot(l,a,u.bright.corner);for(let U=1;U<T.length;U++){const A=T[U-1];La(l,T[U],u.down.program),Bt(l,0,A.texture,u.down.source),u.down.texel&&l.uniform2f(u.down.texel,1/A.width,1/A.height),Ot(l,a,u.down.corner)}l.enable(l.BLEND),l.blendFunc(l.ONE,l.ONE);for(let U=T.length-1;U>0;U--){const A=T[U-1];if(La(l,A,u.up.program),Bt(l,0,T[U].texture,u.up.source),u.up.texel&&l.uniform2f(u.up.texel,1/A.width,1/A.height),u.up.radius&&l.uniform1f(u.up.radius,I.radius),u.up.tint){const Y=I.chromatic?Tl[T.length-1-U]:kl;l.uniform3f(u.up.tint,...Y)}Ot(l,a,u.up.corner)}l.bindFramebuffer(l.FRAMEBUFFER,O.framebuffer),l.viewport(O.viewport[0],O.viewport[1],O.viewport[2],O.viewport[3]),l.useProgram(u.composite.program),Bt(l,0,T[0].texture,u.composite.bloom),u.composite.strength&&l.uniform1f(u.composite.strength,I.strength),Ot(l,a,u.composite.corner),Io(l,O)},setOptions(x={}){I={...I,...x},o?.triggerRepaint()},getOptions:()=>({...I}),get levelCount(){return Uo}}},Il=Lr,Ha=[{key:"starfield",option:"brightness",label:"Stars",default:.5,max:1},{key:"sun",option:"brightness",label:"Sun",default:1,max:1},{key:"moon",option:"brightness",label:"Moon",default:1,max:1},{key:"daylight",option:"nightDarkness",label:"Day and night",default:.965,max:1},{key:"atmosphere",option:"strength",label:"Atmosphere",default:1,max:1},{key:"clouds",option:"opacity",label:"Clouds",default:1,max:1},{key:"ocean",option:"opacity",label:"Ocean",default:1,max:1},{key:"relief",option:"reliefPower",label:"Relief",default:0,max:2,on:"daylight"}],Ba={key:"reference",default:0},Ul="tm-layers-v2",Fl=(e=globalThis.localStorage)=>{const t={};for(const r of Ha)t[r.key]={visible:r.default>0,value:r.default};t[Ba.key]={visible:!1,value:Ba.default};try{const r=JSON.parse(e?.getItem(Ul)||"{}");for(const[n,i]of Object.entries(r)){if(!t[n]||!i||typeof i!="object")continue;const s=i.value;t[n]={visible:i.visible===!0,value:typeof s=="number"&&Number.isFinite(s)?s:t[n].value}}}catch{}return t},Nl=(e,t)=>{const r=t?.visible?Number(t.value):0;return{[e.option]:Number.isFinite(r)?r:0}},Ol=(e,t)=>{const r=[];for(const n of Ha){const i=e?.[n.on||n.key];!i||typeof i.setOptions!="function"||(i.setOptions(Nl(n,t?.[n.key])),r.push(n.key))}return r},Bl=(e,{onReference:t=null,target:r=globalThis}={})=>{const n=new Map(Ha.map(i=>[i.key,i]));return r.__tmSetLayer=(i,s)=>{const o=Number.isFinite(Number(s))?Number(s):0;if(i===Ba.key)return t?.(o);const l=n.get(i);if(!l)return;const a=e?.[l.on||l.key];if(!(!a||typeof a.setOptions!="function"))return a.setOptions({[l.option]:o})},()=>{r.__tmSetLayer&&delete r.__tmSetLayer}},Ql="/img/map/clouds-field.webp",ql="/img/map/wind-field.png",Fo="/img/map/cloud-patches.webp",Ma=e=>an(e).rgb.map(t=>t/255),No=[["starfield",bs,e=>ys(e)],["sun",Us,e=>Ps(e)],["moon",Gs,e=>Hs(e)],["ocean",yl,e=>gl(e)],["daylight",al,e=>tl(e)],["clouds",Fa,e=>ji(e)],["atmosphere",sl,e=>il(e)],["bloom",Il,e=>Dl(e)]],Hl=(e,t)=>{if(t&&e.getLayer(t))return t;let r;try{r=(e.getStyle()?.layers??[]).find(n=>n.type==="symbol"&&n.layout?.["text-field"]!=null)?.id}catch{}return t&&console.warn(`[globe-layers] "${t}" is not on this map; ${r?`anchoring under "${r}" so the labels stay readable`:"and nothing on it draws text, so the stack goes on top"}`),r},Gl=(e,{date:t=new Date,reduceMotion:r=!1,beforeId:n,permitted:i=null}={})=>{const s=qt(t),o=!r,l={fieldUrl:Ql,patchUrl:Fo,windUrl:ql,windAmount:.2,animate:o},a={starfield:{date:t,animate:o},sun:{date:t},moon:{date:t,sun:s},ocean:{sun:s,roughness:.95,strength:.48,windPatch:.6,shoreSoftnessKm:19.5},clouds:{...l,sun:s},daylight:{...l,sun:s,date:t},atmosphere:{sun:s,strength:1.25},bloom:{threshold:.86,strength:.45,knee:.06}},u={},y=Hl(e,n);for(const[g,m,w]of No){if(e.getLayer(m)&&e.removeLayer(m),i&&!i(g))continue;const x=w(a[g]);e.addLayer(x,y),u[g]=x}Ol(u,Fl());const T=Bl(u),v=(g,m)=>u[g]?.setOptions?.(m),I=[window.__tune?.register("Ocean",[{key:"shoreSoftnessKm",label:"Shore falloff",min:0,max:25,step:.25,value:19.5,apply:g=>v("ocean",{shoreSoftnessKm:g})},{key:"roughness",label:"Roughness",min:0,max:1,step:.01,value:.95,apply:g=>v("ocean",{roughness:g})},{key:"strength",label:"Sun glint",min:0,max:1,step:.01,value:.48,apply:g=>v("ocean",{strength:g})},{key:"windPatch",label:"Patchiness",min:0,max:1,step:.01,value:.6,apply:g=>v("ocean",{windPatch:g})},{key:"windScale",label:"Wave scale",min:1,max:60,step:1,value:14,apply:g=>v("ocean",{windScale:g})},{key:"water",label:"Tint depth",min:0,max:2,step:.05,value:1,apply:g=>v("ocean",{water:g})},{key:"scatter",label:"Tint colour",type:"color",value:"#1d5c8f",apply:g=>v("ocean",{scatter:Ma(g)})},{key:"opacity",label:"Opacity",min:0,max:1,step:.01,value:1,apply:g=>v("ocean",{opacity:g})}],{tab:"Earth"}),window.__tune?.register("Clouds",[{key:"opacity",label:"Density",min:0,max:1,step:.01,value:1,apply:g=>v("clouds",{opacity:g})},{key:"windAmount",label:"Curl",min:0,max:1,step:.05,value:.2,apply:g=>v("clouds",{windAmount:g})},{key:"windScale",label:"Wind scale",min:.01,max:.5,step:.01,value:.06,apply:g=>v("clouds",{windScale:g})},{key:"windRate",label:"Wind speed",min:0,max:.3,step:.005,value:.05,apply:g=>v("clouds",{windRate:g})},{key:"cloudShadow",label:"Shadows",min:0,max:1,step:.01,value:.5,apply:g=>v("daylight",{cloudShadow:g})},{key:"shadowSoftness",label:"Shadow edge",min:0,max:1,step:.01,value:.75,apply:g=>v("daylight",{shadowSoftness:g})},{key:"patchTiles",label:"Cloud cells",min:96,max:320,step:8,value:144,apply:g=>{v("clouds",{patchTiles:g}),v("daylight",{patchTiles:g})}},{key:"patchMean",label:"Atlas mean",min:.2,max:.8,step:.005,value:.4335,apply:g=>{v("clouds",{patchMean:g}),v("daylight",{patchMean:g})}},{key:"patchDetail",label:"Detail amount",min:0,max:1.5,step:.05,value:.75,apply:g=>{v("clouds",{patchDetail:g}),v("daylight",{patchDetail:g})}},{key:"patchUrl",label:"Tiled source",type:"boolean",value:!0,apply:g=>{const m=g?Fo:null;v("clouds",{patchUrl:m}),v("daylight",{patchUrl:m})}}],{tab:"Earth"}),window.__tune?.register("Cloud light",[{key:"cloudRelief",label:"Cloud height km",min:0,max:120,step:2,value:90,apply:g=>v("clouds",{cloudRelief:g})},{key:"cloudDepth",label:"Optical depth",min:0,max:12,step:.25,value:4,apply:g=>v("clouds",{cloudDepth:g})},{key:"powder",label:"Powder",min:0,max:1,step:.05,value:1,apply:g=>v("clouds",{powder:g})},{key:"forward",label:"Silver lining",min:0,max:2,step:.05,value:.5,apply:g=>v("clouds",{forward:g})},{key:"forwardG",label:"Lobe sharpness",min:0,max:.95,step:.05,value:.7,apply:g=>v("clouds",{forwardG:g})},{key:"selfShadow",label:"Self shadow",min:0,max:1,step:.02,value:.18,apply:g=>v("clouds",{selfShadow:g})},{key:"selfShadowStep",label:"Shadow reach",min:2e-4,max:.006,step:2e-4,value:.0015,apply:g=>v("clouds",{selfShadowStep:g})}],{tab:"Earth"}),window.__tune?.register("Sky and light",[{key:"nightDarkness",label:"Night",min:0,max:1,step:.005,value:.965,apply:g=>v("daylight",{nightDarkness:g})},{key:"twilightColour",label:"Twilight warm",type:"color",value:"#9e5229",apply:g=>v("daylight",{twilightColour:Ma(g)})},{key:"twilightCool",label:"Twilight blue",type:"color",value:"#1a2647",apply:g=>v("daylight",{twilightCool:Ma(g)})},{key:"twilightStrength",label:"Twilight strength",min:0,max:1,step:.05,value:.55,apply:g=>v("daylight",{twilightStrength:g})},{key:"atmosphere",label:"Haze",min:0,max:2,step:.05,value:1.25,apply:g=>v("atmosphere",{strength:g})},{key:"starfield",label:"Stars",min:0,max:1,step:.05,value:.5,apply:g=>v("starfield",{brightness:g})},{key:"sun",label:"Sun",min:0,max:2,step:.05,value:1,apply:g=>v("sun",{brightness:g})},{key:"moon",label:"Moon",min:0,max:2,step:.05,value:1,apply:g=>v("moon",{brightness:g})},{key:"moonGlow",label:"Moon glow",min:0,max:1.5,step:.05,value:.4,apply:g=>v("moon",{glow:g})},{key:"moonGlowExtent",label:"Moon glow reach",min:0,max:4,step:.1,value:1.8,apply:g=>v("moon",{glowExtent:g})}],{tab:"Earth"}),window.__tune?.register("Glare",[{key:"strength",label:"Strength",min:0,max:3,step:.05,value:.45,apply:g=>v("bloom",{strength:g})},{key:"threshold",label:"Threshold",min:0,max:1,step:.01,value:.86,apply:g=>v("bloom",{threshold:g})},{key:"knee",label:"Knee",min:0,max:.5,step:.01,value:.06,apply:g=>v("bloom",{knee:g})},{key:"radius",label:"Radius",min:.2,max:2,step:.05,value:1,apply:g=>v("bloom",{radius:g})},{key:"chromatic",label:"Warm at the edges",type:"boolean",value:!0,apply:g=>v("bloom",{chromatic:g})}],{tab:"Earth"}),window.__tune?.register("Colour grade",[{key:"saturation",label:"Saturation (0 = greyscale)",min:0,max:2,step:.01,value:1,apply:g=>v("bloom",{saturation:g})},{key:"hue",label:"Hue shift",min:-180,max:180,step:1,value:0,unit:"°",apply:g=>v("bloom",{hue:g*Math.PI/180})},{key:"exposure",label:"Exposure",min:.2,max:2.5,step:.01,value:1,apply:g=>v("bloom",{exposure:g})},{key:"contrast",label:"Contrast",min:.5,max:2,step:.01,value:1,apply:g=>v("bloom",{contrast:g})}],{tab:"Earth"})];return{layers:u,setDate(g){const m=g instanceof Date?g:new Date(g);if(Number.isNaN(m.getTime()))return;const w=qt(m);for(const x of Object.keys(u))u[x]?.setOptions?.({date:m,sun:w})},remove(){T?.();for(const g of I)g?.();for(const[,g]of No)e.getLayer(g)&&e.removeLayer(g)}}},Ra=111.32,na=e=>e<0?0:e>1?1:e,zl=(e,t,r)=>{if(!(r>0))return Math.min(e,t);const n=na(.5+.5*(t-e)/r);return t*(1-n)+e*n-r*n*(1-n)},Jt=(e,t)=>{const r=Math.sin(e*127.1+t*311.7)*43758.5453;return r-Math.floor(r)},Oo=(e,t)=>{const r=Math.floor(e),n=Math.floor(t),i=e-r,s=t-n,o=i*i*(3-2*i),l=s*s*(3-2*s),a=Jt(r,n),u=Jt(r+1,n),y=Jt(r,n+1),T=Jt(r+1,n+1);return(a*(1-o)+u*o)*(1-l)+(y*(1-o)+T*o)*l},$l=(e,t)=>Oo(e,t)*.7+Oo(e*2.3,t*2.3)*.3,Wl=(e,t,r,n=.5)=>r*Math.pow(na(t>0?e/t:1),n),jl=({width:e,height:t,bbox:r,inside:n,seeds:i,lobeScale:s=6,lobeAmount:o=45,mergeKm:l=120})=>{const[a,u,y,T]=r,v=new Float32Array(e*t),I=y-a,g=T-u;let m=0;const w=(T+u)/2,x=Ra*Math.cos(w*Math.PI/180),L=([c,O])=>[(c-a)*x,(T-O)*Ra],d=i.map(L);for(let c=0;c<t;c++){const O=T-g*(c+.5)/t,U=(T-O)*Ra;for(let A=0;A<e;A++){const Y=c*e+A;if(!n(A,c)){v[Y]=1/0;continue}const H=(a+I*(A+.5)/e-a)*x;let G=1/0;for(const[D,k]of d){const N=Math.hypot(H-D,U-k);G=G===1/0?N:zl(G,N,l)}const z=$l(A/e*s,c/t*s)-.5,C=Math.max(0,G+z*2*o);v[Y]=C,C>m&&(m=C)}}return{field:v,maxKm:m,spanKm:Yl(v,m,.995)}},Yl=(e,t,r)=>{if(!(t>0))return 0;const n=512,i=new Int32Array(n);let s=0;for(let a=0;a<e.length;a++){const u=e[a];Number.isFinite(u)&&(i[Math.min(n-1,Math.floor(u/t*n))]++,s++)}if(!s)return 0;const o=s*r;let l=0;for(let a=0;a<n;a++)if(l+=i[a],l>=o)return(a+1)/n*t;return t},Xl=(e,t,{radiusKm:r,body:n,rim:i,rimKm:s,opacity:o,featherKm:l=8})=>{for(let a=0;a<t.length;a++){const u=t[a],y=a*4;if(!(u<=r+l)){e[y+3]=0;continue}const T=l>0?na((r+l-u)/l):1,v=s>0?na(1-(r-u)/s):0;e[y]=n[0]+(i[0]-n[0])*v,e[y+1]=n[1]+(i[1]-n[1])*v,e[y+2]=n[2]+(i[2]-n[2])*v,e[y+3]=255*o*T*(1+.35*v)}},At="tm-advance-src",Pa="tm-advance",ye=256,Bo=e=>{const t=String(e).replace("#",""),r=t.length===3?t.split("").map(n=>n+n).join(""):t;return[0,2,4].map(n=>parseInt(r.slice(n,n+2),16)||0)},Kl=e=>{let t=180,r=90,n=-180,i=-90;const s=o=>{if(typeof o[0]=="number"){const[l,a]=o;l<t&&(t=l),l>n&&(n=l),a<r&&(r=a),a>i&&(i=a);return}o.forEach(s)};return s(e.coordinates),[t,r,n,i]},Vl=e=>e.type==="Polygon"?[e.coordinates]:e.type==="MultiPolygon"?e.coordinates:[],Zl=(e,{beforeId:t,colour:r="#b31217",rimColour:n="#4a0505",opacity:i=.85,seconds:s=4,curve:o=.5,lobeScale:l=6,lobeAmount:a=45,mergeKm:u=120,rimKm:y=40,featherKm:T=10}={})=>{let v={colour:r,rimColour:n,opacity:i,seconds:s,curve:o,lobeScale:l,lobeAmount:a,mergeKm:u,rimKm:y,featherKm:T},I=null,g=null,m=null,w=null,x=null,L=null,d=!0;const c=()=>{I||(I=document.createElement("canvas"),I.width=ye,I.height=ye,g=I.getContext("2d",{willReadFrequently:!0}),m=g.createImageData(ye,ye))},O=(G,z)=>{const[C,D,k,N]=z,b=new Uint8Array(ye*ye),j=document.createElement("canvas");j.width=ye,j.height=ye;const Q=j.getContext("2d",{willReadFrequently:!0}),J=R=>(R-C)/(k-C)*ye,S=R=>(N-R)/(N-D)*ye;Q.fillStyle="#fff";for(const R of Vl(G))Q.beginPath(),R.forEach($=>{$.forEach(([ee,K],B)=>B?Q.lineTo(J(ee),S(K)):Q.moveTo(J(ee),S(K))),Q.closePath()}),Q.fill("evenodd");const X=Q.getImageData(0,0,ye,ye).data;for(let R=0;R<b.length;R++)b[R]=X[R*4+3]>40?1:0;return b},U=(G,z)=>{if(!G||!z?.length)return!1;c();const C=Kl(G),D=O(G,C),{field:k,maxKm:N,spanKm:b}=jl({width:ye,height:ye,bbox:C,inside:(R,$)=>D[$*ye+R]===1,seeds:z,lobeScale:v.lobeScale,lobeAmount:v.lobeAmount,mergeKm:v.mergeKm});w={field:k,maxKm:N,spanKm:b,bbox:C};const[j,Q,J,S]=C,X=[[j,S],[J,S],[J,Q],[j,Q]];return e.getSource(At)?e.getSource(At).setCoordinates(X):(e.addSource(At,{type:"canvas",canvas:I,coordinates:X,animate:!0}),e.addLayer({id:Pa,type:"raster",source:At,paint:{"raster-opacity":1,"raster-fade-duration":0,"raster-resampling":"linear"}},t&&e.getLayer(t)?t:void 0)),!0},A=G=>{w&&(Xl(m.data,w.field,{radiusKm:G,body:Bo(v.colour),rim:Bo(v.rimColour),rimKm:v.rimKm,opacity:v.opacity,featherKm:v.featherKm}),g.putImageData(m,0,0))},Y=()=>{x&&cancelAnimationFrame(x),x=null},p=()=>{if(!w)return!1;Y(),L=performance.now();const G=z=>{const C=(z-L)/1e3;A(Wl(C,v.seconds,w.spanKm,v.curve)),C<v.seconds?x=requestAnimationFrame(G):(x=null,A(w.maxKm),d||H())};return x=requestAnimationFrame(G),!0},H=()=>{Y(),g&&g.clearRect(0,0,ye,ye)};return{prepare:U,play:p,clear:H,setOptions(G={}){const z=["lobeScale","lobeAmount","mergeKm"].some(C=>G[C]!==void 0&&G[C]!==v[C]);return v={...v,...G},z?"needs-rebuild":(w&&!x&&A(w.maxKm),"ok")},get maxKm(){return w?w.maxKm:0},get painted(){if(!m)return 0;let G=0;for(let z=3;z<m.data.length;z+=4)m.data[z]>8&&G++;return G},get running(){return x!==null},set holdAtEnd(G){d=!!G},remove(){Y(),e.getLayer(Pa)&&e.removeLayer(Pa),e.getSource(At)&&e.removeSource(At),w=null}}},Qo=[{key:"cardWidth",property:"--card-width",label:"Width",min:240,max:420,step:1},{key:"cardBodyHeight",property:"--card-body-height",label:"Body height",min:120,max:520,step:4},{key:"cardFadeHeight",property:"--card-fade-height",label:"Fade height",min:0,max:160,step:2}],Jl=(e,t=document.documentElement)=>{const r=getComputedStyle(t).getPropertyValue(e).trim(),n=parseFloat(r);return Number.isFinite(n)?r.endsWith("rem")?n*parseFloat(getComputedStyle(document.documentElement).fontSize||"16"):n:null},ec=(e=globalThis)=>{if(!e.__tune?.register)return()=>{};const t=document.documentElement,r=Qo.map(i=>({key:i.key,label:i.label,min:i.min,max:i.max,step:i.step,value:Jl(i.property)??i.min,apply:s=>t.style.setProperty(i.property,`${Number(s)}px`)})),n=e.__tune.register("Information card",r,{tab:"Map"});return()=>{n?.();for(const i of Qo)t.style.removeProperty(i.property)}},tc=Ai.families.flatMap(e=>e.qids.flatMap(t=>[t,e.color])),Ca=new Map(ci.overrides.filter(e=>e.name).map(e=>[`${e.qid}|${e.name}`,e.use]));window.initTimeMap=function(t,r,n){const i={year:n,ready:!1,selectedRegion:null},s=()=>{window.__portal={ready:i.ready,year:i.year,selectedRegion:i.selectedRegion}};s();const o=new le.Map({container:t,locale:Wr(),zoomLevelsToOverscale:void 0,style:{version:8,projection:{type:"globe"},sky:{"atmosphere-blend":["interpolate",["linear"],["zoom"],2,.5,4,.35,6,.12,7,.04],"sky-color":"#0a1230","sky-horizon-blend":.5,"horizon-color":"#1a2c5a","horizon-fog-blend":.5,"fog-color":"#dcc9a0","fog-ground-blend":.7},glyphs:`${location.origin}/fonts/{fontstack}/{range}.pbf`,sources:{land:{type:"vector",tiles:[`${location.origin}/land-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},graticule:{type:"geojson",data:`${location.origin}/timemap/graticule.geojson`},dem:$r,satellite:zr,"satellite-detail":Gr,coast:{type:"vector",tiles:[`${location.origin}/coast-echo-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},rivers:{type:"vector",tiles:[`${location.origin}/river-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},lakes:{type:"vector",tiles:[`${location.origin}/lake-tiles/{z}/{x}/{y}.pbf`],maxzoom:6},"ink-borders":{type:"vector",tiles:[`${location.origin}/ink-border-tiles/{z}/{x}/{y}.pbf`],maxzoom:4},coastline:{type:"geojson",data:`${location.origin}/timemap/coastline.geojson`},cliopatria:{type:"vector",tiles:[`${location.origin}/cliopatria-tiles/{z}/{x}/{y}.pbf`],maxzoom:4,promoteId:{boundaries:"Wikidata"}},"hand-territories":{type:"geojson",data:Vn(),promoteId:"id"},"boundaries-smooth":{type:"geojson",data:{type:"FeatureCollection",features:[]}},"boundaries-glow-src":{type:"geojson",data:{type:"FeatureCollection",features:[]}},"boundaries-cursor-name":{type:"geojson",data:{type:"FeatureCollection",features:[]}},...Kr()},layers:[{id:"water",type:"background",paint:{"background-color":oe.water}},...Hr({visible:!1}),{id:"graticule",type:"line",source:"graticule",layout:{visibility:"none","line-cap":"round","line-join":"round"},paint:{"line-color":"#8a9aa0","line-width":.6,"line-opacity":.5}},{id:"coast-echo",type:"line",source:"coast","source-layer":"coast",layout:{visibility:"none","line-cap":"round"},paint:{"line-color":"#6b563d","line-width":.6}},{id:"coast-shadow",type:"line",source:"coastline",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#574631","line-width":2.6,"line-translate":[0,2],"line-blur":.4}},{id:"land",type:"fill",source:"land","source-layer":"land",paint:{"fill-color":oe.land}},{id:"hillshade",type:"hillshade",source:"dem",layout:{visibility:"none"},paint:{"hillshade-exaggeration":.45,"hillshade-illumination-direction":55,"hillshade-shadow-color":"#4a3a28","hillshade-highlight-color":"#fbf2d8","hillshade-accent-color":"#6b563d"}},{id:"lake-shadow",type:"line",source:"lakes","source-layer":"lakes",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#574631","line-width":2,"line-translate":[0,1.6],"line-blur":.4}},{id:"lakes",type:"fill",source:"lakes","source-layer":"lakes",paint:{"fill-color":oe.water}},{id:"lake-line",type:"line",source:"lakes","source-layer":"lakes",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#3a2c1a","line-width":.7,"line-opacity":.8}},{id:"coast-bold",type:"line",source:"coastline",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":"#2f2418","line-width":1.1}},...Xr(["Cinzel"])]},center:[8.23,20],zoom:1.9,pitch:45,maxPitch:70,maxZoom:7,attributionControl:!1});o.addControl(new le.AttributionControl({compact:!0,customAttribution:["Borders © Cliopatria / Seshat (CC-BY 4.0)","Land © OpenStreetMap (CC0)","Cloud: NASA EOSDIS GIBS (MODIS)"]}),"bottom-left");let l=!1;const a=t.querySelector(".maplibregl-ctrl-attrib"),u=()=>{l||(a?.classList.remove("maplibregl-compact-show"),a?.removeAttribute("open"))};u(),o.on("resize",u),a?.addEventListener("click",()=>{l=!0}),window.__tmMap=o,t.style.background="radial-gradient(ellipse 90% 90% at 50% 48%, #14224a 0%, #070c1e 55%, #02030a 100%)",new ResizeObserver(()=>o.resize()).observe(t);let T=!0,v=!1;const I=()=>{if(!T||v)return;const h=document.querySelector("[data-timemap-deck]");if(!h)return;const _=t.getBoundingClientRect(),E=h.getBoundingClientRect(),P=Math.max(0,Math.min(_.bottom-E.top,_.height/3));Math.abs(parseFloat(t.style.top||"0")+P)<1||(t.style.top=`-${P}px`,t.style.height=`calc(100% + ${P}px)`,o.resize())},g=(h=0)=>{const _=document.querySelector("[data-timemap-deck]");if(!_){h<30&&setTimeout(()=>g(h+1),100);return}I(),new ResizeObserver(I).observe(_)};g();const m=oe.palette,w=["case",["boolean",["feature-state","selected"],!1],oe.selected,["match",["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q0"],1]],m.length],...m.flatMap((h,_)=>[_,h]),m[0]]],x=["case",["boolean",["feature-state","selected"],!1],oe.fillOpacity.selected,oe.fillOpacity.normal],L="#f59e0b",d=[[0,3],[4,7],[8,12]],c=(h=1)=>["interpolate",["linear"],["zoom"],...d.flatMap(([_,E])=>[_,E*h])],O=c(1),U=(h,_)=>["match",["get","confidence"],"low",h,_],A={opacityLow:.42,opacityMedium:.7,blurLow:3.2,blurMedium:1.4,width:1,dash:2},Y=()=>U(A.opacityLow,A.opacityMedium),p=()=>U(A.blurLow,A.blurMedium),H=()=>[A.dash,A.dash*1.25],G=()=>["interpolate",["linear"],["zoom"],...[[0,.8],[4,1.4],[8,2.2]].flatMap(([h,_])=>[h,_*A.width])],z=h=>["all",["==",["get","Type"],"POLITY"],["!=",["slice",["get","Name"],0,1],"("],["<=",["to-number",["get","FromYear"]],h],[">=",["to-number",["get","ToYear"]],h]],C=30,D=h=>["min",["max",0,["min",1,["/",["-",h,["to-number",["get","FromYear"]]],C]]],["max",0,["min",1,["/",["-",["to-number",["get","ToYear"]],h],C]]]];let k=x,N=1,b=.55;try{const h=parseFloat(localStorage.getItem("tm-color-strength"));Number.isFinite(h)&&(b=Math.min(1,Math.max(0,h)))}catch{}const j=h=>Math.min(.92,Math.max(.06,h*(.45+1.1*b))),Q={normal:{opacity:null},hover:{colour:null,opacity:null},active:{colour:null,opacity:null}};let J=!0;const S={normal:{colour:null,width:null,opacity:null,blur:null},hover:{colour:null,width:null,opacity:null,blur:null},active:{colour:null,width:null,opacity:null,blur:null}},X=(h,_)=>{const E=S.normal[h]??_,P=S.hover[h]??E,q=S.active[h]??P;return P===E&&q===E?E:["case",["boolean",["feature-state","selected"],!1],q,["boolean",["feature-state","hover"],!1],P,E]},R=["boundaries-line","boundaries-smooth"],$=()=>{const h=ze[et]||{};for(const[_,E,P]of[["colour","line-color",h.line?.color??oe.line.color],["width","line-width",h.line?.width??oe.line.width],["blur","line-blur",h.line?.blur??0]]){const q=X(_,P);for(const F of R)ee[`${F}.${E}`]=q,K(F,E,q)}},ee={},K=(h,_,E)=>{const P=ee[`${h}.${_}`];if(o.getLayer(h))try{o.setPaintProperty(h,_,P!==void 0?P:E)}catch{}},B=()=>{const h=ze[et]||{},_=h.palette||m,E=["match",["coalesce",["get","Wikidata"],"Q0"],...tc,["match",["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q0"],1]],_.length],..._.flatMap((P,q)=>[q,P]),_[0]]];return["case",["boolean",["feature-state","selected"],!1],Q.active.colour??h.selected??oe.selected,["boolean",["feature-state","hover"],!1],Q.hover.colour??h.hover??oe.hover,J?E:$t]},Ae=()=>{const h=ze[et]||{},_=j(h.fillOpacity!=null?h.fillOpacity:oe.fillOpacity.normal);k=["case",["boolean",["feature-state","selected"],!1],Q.active.opacity??Math.max(.85,_),["boolean",["feature-state","hover"],!1],Q.hover.opacity??Math.max(.6,_+.18),Q.normal.opacity??_]},fe=["boundaries-fill","hand-fill"],ce=()=>{if(!o.getLayer("boundaries-fill"))return;const h=B();for(const _ of fe)if(o.getLayer(_))try{o.setPaintProperty(_,"fill-color",h)}catch{}Ae(),Te(i.year)};window.__tmSetColorStrength=h=>{b=Math.min(1,Math.max(0,Number(h)||0));try{localStorage.setItem("tm-color-strength",String(b))}catch{}Ae(),Te(i.year)};const Se=h=>["*",k,D(h)],Ie=h=>["*",N,D(h)];let rt=!1;const Te=h=>{if(o.getLayer("boundaries-fill")){for(const _ of fe)o.getLayer(_)&&o.setPaintProperty(_,"fill-opacity",rt?Se(h):k);o.getLayer("boundaries-line")&&o.setPaintProperty("boundaries-line","line-opacity",rt?Ie(h):N),o.getLayer("hand-line")&&o.setPaintProperty("hand-line","line-opacity",rt?["*",Y(),D(h)]:Y())}},gt=h=>["all",["<=",["to-number",["get","FromYear"]],h],[">=",["to-number",["get","ToYear"]],h]],Lt=h=>["all",["<=",["coalesce",["to-number",["get","start_decdate"]],-1e6],h],[">",["coalesce",["to-number",["get","end_decdate"]],1e6],h]],Mt=h=>{if(fa?.setDate(ma(h)),!o.getLayer("boundaries-fill"))return;o.setFilter("boundaries-fill",z(h)),o.setFilter("boundaries-line",z(h));for(const E of["hand-fill","hand-line"])o.getLayer(E)&&o.setFilter(E,z(h));Ze(),Te(h),o.setFilter("markers-dot",Lt(h)),o.setFilter("markers-label",Lt(h)),tn(o,h),xe&&xe.setYear(h);const _=ze[et]&&ze[et].borderSource?gt(h):z(h);for(let E=0;E<6;E++)o.getLayer(`ink-${E}`)&&o.setFilter(`ink-${E}`,_);Ve()},Ht=h=>{let _=0,E=0,P=0;for(let q=0,F=h.length-1;q<h.length;F=q++){const[W,V]=h[F],[te,Z]=h[q],Re=W*Z-te*V;_+=Re,E+=(W+te)*Re,P+=(V+Z)*Re}return _===0?{area:0,c:h[0]}:{area:Math.abs(_/2),c:[E/(3*_),P/(3*_)]}},nt=new Set,Rt=new Set,ua=h=>Rt.has(h)||o.hasImage(`flag-${h}`)?Promise.resolve(!1):(Rt.add(h),o.loadImage(`/flags/${h}.png`).then(_=>(o.hasImage(`flag-${h}`)||o.addImage(`flag-${h}`,_.data),!0)).catch(()=>!1)),ha={Q217196:[-3.7,40.4]};let Pt=new Map;const it=()=>{const h=o.getSource("labels");h&&h.setData({type:"FeatureCollection",features:[...Pt.entries()].map(([_,E])=>({type:"Feature",geometry:{type:"Point",coordinates:ha[_]||E.c},properties:{name:E.name,flag:o.hasImage(`flag-${_}`)?`flag-${_}`:"",sel:String(ie)===_,hov:E.name===He}}))})},Qe=()=>{if(!o.getSource("labels")||!o.getLayer("boundaries-fill"))return;const _=new Map,E=fe.filter(F=>o.getLayer(F));for(const F of o.queryRenderedFeatures({layers:E})){const W=F.properties.Name;if(W==null)continue;const V=String(F.properties.Wikidata),te=F.geometry,Z=te.type==="Polygon"?[te.coordinates]:te.type==="MultiPolygon"?te.coordinates:[];for(const Re of Z){const{area:pe,c:ga}=Ht(Re[0]),Tt=_.get(V);(!Tt||pe>Tt.area)&&_.set(V,{area:pe,c:ga,name:W})}}he(),Pt=_;const P=it;P();const q=[..._.keys()].filter(F=>nt.has(F)&&!o.hasImage(`flag-${F}`)&&!Rt.has(F));q.length&&Promise.all(q.map(ua)).then(F=>{F.some(Boolean)&&P()})};fetch("/flags/manifest.json").then(h=>h.ok?h.json():[]).then(h=>{h.forEach(_=>nt.add(String(_))),o.getLayer("boundaries-fill")&&Qe()}).catch(()=>{}),window.__polityCache=window.__polityCache||{},fetch("/timemap/articles.json").then(h=>h.ok?h.json():{}).then(h=>Object.assign(window.__polityCache,h)).catch(()=>{});const st=()=>Qe();let Gt=null;const Ve=()=>{clearTimeout(Gt),Gt=setTimeout(st,250)};let yt=null,zt=null;const bt="boundaries-smooth",_e={type:"FeatureCollection",features:[]};let Le=0,wt=null,$t="#5b7fa8";const Wt=()=>{const h=o.getSource(bt);if(!h)return;if(Le<1){h.setData(_e);return}const _=[],E=new Set;for(const P of o.queryRenderedFeatures({layers:["boundaries-fill"]})){const q=`${P.id}|${P.geometry?.coordinates?.[0]?.[0]?.[0]??""}`;if(!E.has(q)){E.add(q);for(const F of ba(P.geometry))F.length<4||_.push({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:ea(F,Le)}})}}h.setData({type:"FeatureCollection",features:_})},ke=h=>{Le=Math.round(h);const _=Le>=1;for(const[E,P]of[["boundaries-line",!_],["boundaries-smooth",_]])if(o.getLayer(E))try{o.setLayoutProperty(E,"visibility",P?"visible":"none")}catch{}Wt()},Ze=()=>{wt&&clearTimeout(wt),wt=setTimeout(()=>{wt=null,Wt()},120)};let ie=null,We=null,vt=null,Ct=null,Ue=!1;const Dt=()=>{ie!==null&&(je(ie,!1,Ue),ie=null,Ue=!1)};let xe=null,Me=null,lt=12,qe=1.35,ct=180,He=null,Ee=1,Ge=null,ut=null;const M=()=>{if(!o.getLayer("boundaries-label"))return;const h=lt*Ee,_=He&&Ee!==1?["case",["==",["get","name"],He],h,lt]:lt;try{o.setLayoutProperty("boundaries-label","text-size",_)}catch{}},ne=h=>{if(h===He)return;const _=Ee,E=h?qe:1;He=h||He;const P=h;it(),Ge&&cancelAnimationFrame(Ge),ut&&clearTimeout(ut);const q=performance.now(),F=()=>{Ee=E,He=P,M(),P||it()},W=V=>{const te=ct>0?Math.min(1,(V-q)/ct):1;if(Ee=_+(E-_)*Da.easeInOutQuad(te),M(),te<1){Ge=requestAnimationFrame(W);return}Ge=null,F()};Ge=requestAnimationFrame(W),ut=setTimeout(()=>{ut=null,Ge&&(cancelAnimationFrame(Ge),Ge=null),F()},ct+40)},ae="boundaries-cursor-name";let me=null,ue=!1;const he=()=>{if(o.getLayer("boundaries-label"))try{o.setLayoutProperty("boundaries-label","visibility",ue?"visible":"none")}catch{}},Fe=h=>o.queryRenderedFeatures({layers:["boundaries-label"]}).some(_=>_.properties?.name===h),It=(h,_)=>{const E=o.getSource(ae);if(!E)return;const P=typeof h=="string"&&h.trim()!==""?h:null;if(me=P,!P||!_){E.setData(_e);return}const q=((_.lng+180)%360+360)%360-180;E.setData({type:"FeatureCollection",features:[{type:"Feature",properties:{name:P},geometry:{type:"Point",coordinates:[q,_.lat]}}]})},Je=(h,_=null,E=null)=>{const P=o.getSource("boundaries-glow-src");if(!P)return;const F=(h?ba(h):[]).flatMap(W=>no(W)).filter(W=>W.length>=4).map(W=>({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:Le>=1?ea(W,Le):W}}));P.setData({type:"FeatureCollection",features:F}),ne(_)},je=(h,_,E=!1)=>o.setFeatureState(E?{source:"hand-territories",id:h}:{source:"cliopatria",sourceLayer:"boundaries",id:h},{selected:_}),Ut=oe.palette,_t=["#39496a","#4a3b63","#37614f","#63503b","#4c6140","#63415a","#3a5570","#56426a","#3f6657","#665445","#414f6e","#5c4258"],jt="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>",ht=(h,_)=>["interpolate",["linear"],["%",["to-number",["slice",["coalesce",["get","Wikidata"],"Q7"],1]],89],0,h,88,_],ze={"soft-atlas":{palette:Ut,water:"#c7d4c6",shore:{color:"#5b4a36",width:.7,shadow:"#9fb0b4",shadowWidth:1.8,dy:1.6},land:"#efe6d0",fillOpacity:.55,selected:"#f5c518",hover:"#ecd9a0",line:{color:"#6b5640",width:.8,blur:.3},grid:{color:"#93a18f",opacity:.5,width:.5},hillshade:!0,text:{color:"#3b3326",halo:"#f3ead6"},voyage:"#1f5f8f",paper:.08,vignette:"rgba(80,55,30,0.14)"},antique:{palette:Ut,water:"#dcdcba",shore:{color:"#43301c",width:1,shadow:"#8f7d5c",shadowWidth:2.5,dy:2},land:"#e8d6ac",fillOpacity:.3,selected:"#e0a200",hover:"#d9c089",line:{color:"#4a3420",width:1.7,blur:.25},coast:{color:"#6a5238",opacity:.5,width:.85},river:{color:"#8a9aa0",opacity:.6,width:.7},mountains:!0,forest:!0,hillshade:!0,grid:{color:"#9b9277",opacity:.55,width:.55},text:{color:"#3a2c1a",halo:"#ecdcb8"},voyage:"#274f66",paper:.2,vignette:"rgba(80,55,30,0.3)"},"pen-ink":{palette:Ut,water:"#dedec0",land:"#e6d6ad",fillOpacity:.16,selected:"#c98a00",hover:"#d9c089",shore:{color:"#2f2418",width:1.15,shadow:"#574631",shadowWidth:2.9,dy:2},line:{color:"#3a2c1c",width:ht(.4,1.2),blur:.25},borderSource:{source:"ink-borders",sourceLayer:"ink"},coast:{color:"#5e4a34",opacity:.55,width:.85},river:{color:"#6a7c74",opacity:.55,width:.6},grid:{color:"#8f8c6e",opacity:.45,width:.5},hillshade:!0,mountains:!0,forest:!0,inkLayers:[{color:"#5a4630",width:ht(1.2,2.4),opacity:.1,blur:1.4},{color:"#4a3826",width:ht(.7,1.5),opacity:.18,blur:.6,offset:.4},{color:"#33261a",width:ht(.4,1.2),opacity:.8,blur:.2},{color:"#2a1f12",width:.6,opacity:.32,blur:.1,offset:.4,dash:[3,3],above:!0}],text:{color:"#33271a",halo:"#efe2c4"},voyage:"#2f4e66",paper:.22,vignette:"rgba(80,55,30,0.3)"},satellite:{palette:_t,imagery:!0,water:"#08131f",land:"#26331d",fillOpacity:.22,selected:"#f5c518",hover:"#e8cf94",shore:{color:"#f6efdc",width:.6,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:"#ffd9a0",width:.9,blur:.2},text:{color:"#241a10",halo:"#f2e9d4"},voyage:"#ffce6b",paper:0,vignette:"rgba(0,0,0,0.4)"},earth:{palette:_t,imagery:!0,globe:!0,water:Xe.water,land:Xe.land,fillOpacity:.22,selected:Xe.selected,hover:Xe.hover,shore:{color:Xe.coast,width:.6,shadow:"rgba(0,0,0,0)",shadowWidth:0,dy:0},line:{color:Xe.line,width:.9,blur:.2},text:{color:Xe.text,halo:Xe.halo},voyage:Xe.voyage,paper:0,vignette:"rgba(0,0,0,0.4)"},night:{palette:_t,water:"#0f1420",shore:{color:"#8a99b8",width:.7,shadow:"#070b12",shadowWidth:2,dy:1.6},land:"#1b2230",fillOpacity:.6,selected:"#f5c518",hover:"#5a6b8c",line:{color:"#8a99b8",width:.6,blur:.2},text:{color:"#e6ecf7",halo:"#10151f"},voyage:"#8fc3ef",paper:0,vignette:"rgba(0,0,0,0.45)"}},Rr=h=>{const _=t.parentElement;if(!_)return;let E=_.querySelector("#tm-paper");E||(E=document.createElement("div"),E.id="tm-paper",E.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:5;mix-blend-mode:multiply",E.style.backgroundImage=`url("${jt}")`,_.appendChild(E)),E.style.opacity=String(h.paper);let P=_.querySelector("#tm-vignette");P||(P=document.createElement("div"),P.id="tm-vignette",P.style.cssText="position:absolute;inset:0;pointer-events:none;z-index:6",_.appendChild(P)),P.style.background=`radial-gradient(ellipse 78% 78% at center, rgba(0,0,0,0) 52%, ${h.vignette} 100%)`},da=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;let xt=null,Yt=null,Ga=0;const za=()=>{xt=requestAnimationFrame(za);const h=performance.now();if(h-Ga<55||(Ga=h,!Yt||!o.getLayer("coast-echo")))return;const _=h/1e3,E=Yt.opacity,P=q=>{const F=E*Math.pow(.7,q);return Math.max(.05,F*(.74+.26*Math.sin(_*.9-q*.9)))};o.setPaintProperty("coast-echo","line-opacity",["interpolate",["linear"],["to-number",["get","echo"]],0,P(0),1,P(1),2,P(2),3,P(3)])},Pr=h=>{Yt=h,!da&&!xt&&(xt=requestAnimationFrame(za))},Cr=()=>{Yt=null,xt&&(cancelAnimationFrame(xt),xt=null)};let fa=null;const ma=h=>new Date(Date.UTC(Number.isFinite(h)?h:2e3,5,21,12)),Dr=()=>{try{const{lng:h,lat:_}=o.getCenter(),E=$e(h,_,0),P=qt(ma(i.year)),q=E[0]*P[0]+E[1]*P[1]+E[2]*P[2];return Math.max(0,Math.min(1,q*.5+.5))}catch{return 1}},Ir=()=>{if(!window.__tune)return;const h=(f,re,de)=>{if(o.getLayer(f))try{o.setPaintProperty(f,re,de)}catch{}},_=["boundaries-label","markers-label"],E=[["Cinzel","Cinzel (map serif)"],["Eagle Lake","Eagle Lake (calligraphy)"],["inter","Inter (plain)"]],P=(f,re)=>{for(const de of _)if(o.getLayer(de))try{o.setLayoutProperty(de,f,re)}catch{}},q=(f,re)=>{for(const de of _)h(de,f,re)},F={startLng:0,startLat:20,startZoom:.4,endLng:8.23,endLat:46.8,endZoom:4,seconds:3.5},W=()=>(xe||console.warn("[tune] no fleet on this map yet"),xe),V={colour:L,strength:.55,width:1,blur:6},te=()=>{h("boundaries-glow","line-color",V.colour),h("boundaries-glow","line-opacity",V.strength),h("boundaries-glow","line-width",c(V.width)),h("boundaries-glow","line-blur",V.blur)},Z={"Poland 1939":{year:1939,match:/^(second )?poland|polish republic/i,camera:{center:[19.4,52.1],zoom:4.4},seeds:[[15,52.3],[20.5,54],[19.6,49.4]]}},Re=12;let pe=null,ga="Poland 1939";const Tt=f=>f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.type==="MultiPolygon"?f.geometry.coordinates:[],Br=f=>{const re=o.queryRenderedFeatures({layers:["boundaries-fill"]});if(!re.length)return null;const de=ve=>{const ft=ve.flatMap(Tt);return ft.length?{type:"MultiPolygon",coordinates:ft}:null},we=ie!=null?re.filter(ve=>ve.id===ie):[];if(we.length)return{geometry:de(we),from:"selected",label:we[0]?.properties?.Name};const Pe=f?re.filter(ve=>f.test(String(ve.properties?.Name??""))):[];if(Pe.length)return{geometry:de(Pe),from:"preset",label:Pe[0]?.properties?.Name};const Oe=new Map;for(const ve of re){const ft=ve.id??ve.properties?.Name;Oe.set(ft,[...Oe.get(ft)??[],ve])}const dt=[...Oe.values()].sort((ve,ft)=>ft.flatMap(Tt).length-ve.flatMap(Tt).length)[0],Ye=dt?de(dt):null;return Ye?{geometry:Ye,from:"largest",label:dt[0]?.properties?.Name}:null},Qr=f=>{let re=180,de=-180,we=90,Pe=-90;for(const dt of f.coordinates)for(const[Ye,ve]of dt[0]??[])Ye<re&&(re=Ye),Ye>de&&(de=Ye),ve<we&&(we=ve),ve>Pe&&(Pe=ve);const Oe=(de-re)*.12;return[[re+Oe,we+(Pe-we)*.25],[re+Oe,(we+Pe)/2],[re+Oe,we+(Pe-we)*.75]]},Kt=()=>({colour:Xa,rimColour:Ka,opacity:Va,seconds:Za,curve:Ja,lobeScale:eo,lobeAmount:to,mergeKm:ao,rimKm:oo}),Ya=()=>{const f=Z[ga];if(!f)return;ie==null&&(window.__setTimemapYear(f.year),f.camera&&o.jumpTo(f.camera));let re=0;const de=()=>{const we=Br(f.match);if(!we){if(++re<Re){setTimeout(de,400);return}console.warn(`[tune] nothing on screen to advance across at ${f.year}`);return}const{geometry:Pe,from:Oe,label:dt}=we,Ye=Oe==="preset"?f.seeds:Qr(Pe);Oe!=="preset"&&console.info(`[tune] advancing across ${dt} (${Oe})`),pe?pe.setOptions(Kt()):(pe=Zl(o,{beforeId:"boundaries-label",...Kt()}),window.__tmAdvance=pe),pe.prepare(Pe,Ye)&&pe.play()};setTimeout(de,400)};let Xa="#b31217",Ka="#4a0505",Va=.85,Za=4,Ja=.5,eo=6,to=45,ao=120,oo=40;const ya=()=>{pe&&(pe.setOptions(Kt()),Ya())},kt=()=>{pe&&pe.setOptions(Kt())};window.__tune.register("Territory · resting",[{key:"usePalette",label:"Per-country colours",type:"boolean",value:!0,apply:f=>{J=f,ce()}},{key:"restColour",label:"Colour",type:"color",value:"#5b7fa8",apply:f=>{$t=f,ce()}},{key:"restOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:f=>{Q.normal.opacity=f>0?f:null,ce()}},{key:"restBorderColour",label:"Border",type:"color",value:"#8a99b8",apply:f=>{S.normal.colour=f,$()}},{key:"restBorderWidth",label:"Border width",min:0,max:8,step:.1,value:1,apply:f=>{S.normal.width=f,$()}},{key:"restBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:f=>{S.normal.blur=f,$()}}],{tab:"Map"}),window.__tune.register("Territory · hover",[{key:"hoverColour",label:"Colour",type:"color",value:oe.hover,apply:f=>{Q.hover.colour=f,ce()}},{key:"hoverOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:f=>{Q.hover.opacity=f>0?f:null,ce()}},{key:"hoverBorderColour",label:"Border",type:"color",value:"#ecd9a0",apply:f=>{S.hover.colour=f,$()}},{key:"hoverBorderWidth",label:"Border width",min:0,max:8,step:.1,value:2,apply:f=>{S.hover.width=f,$()}},{key:"hoverBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:f=>{S.hover.blur=f,$()}}],{tab:"Map"}),window.__tune.register("Territory · active",[{key:"activeColour",label:"Colour",type:"color",value:oe.selected,apply:f=>{Q.active.colour=f,ce()}},{key:"activeOpacity",label:"Opacity",min:0,max:1,step:.02,value:0,apply:f=>{Q.active.opacity=f>0?f:null,ce()}},{key:"activeBorderColour",label:"Border",type:"color",value:"#f5c518",apply:f=>{S.active.colour=f,$()}},{key:"activeBorderWidth",label:"Border width",min:0,max:8,step:.1,value:2,apply:f=>{S.active.width=f,$()}},{key:"activeBorderBlur",label:"Border softness",min:0,max:6,step:.1,value:0,apply:f=>{S.active.blur=f,$()}}],{tab:"Map"}),window.__tune.register("Voyages",[{key:"voyageColour",label:"Route",type:"color",value:"#20618f",apply:f=>K("voyage-line","line-color",f)},{key:"voyageWidth",label:"Route width",min:.2,max:8,step:.1,value:1.7,apply:f=>K("voyage-line","line-width",f)},{key:"voyageOpacity",label:"Route opacity",min:0,max:1,step:.05,value:.85,apply:f=>K("voyage-line","line-opacity",f)},{key:"voyageBlur",label:"Route softness",min:0,max:4,step:.1,value:0,apply:f=>K("voyage-line","line-blur",f)},{key:"voyageLabelColour",label:"Name",type:"color",value:"#20618f",apply:f=>K("voyage-label","text-color",f)},{key:"voyageLabelHalo",label:"Name halo",type:"color",value:"#f3ead6",apply:f=>K("voyage-label","text-halo-color",f)},{key:"voyageLabelHaloWidth",label:"Name halo width",min:0,max:4,step:.1,value:1.2,apply:f=>K("voyage-label","text-halo-width",f)},{key:"voyageLabelSize",label:"Name size",min:6,max:28,step:.5,value:11.5,apply:f=>{if(o.getLayer("voyage-label"))try{o.setLayoutProperty("voyage-label","text-size",f)}catch{}}},{key:"voyageHitWidth",label:"Hover tolerance",min:4,max:40,step:1,value:en,apply:f=>K("voyage-hit","line-width",f)}],{tab:"Map"}),window.__tune.register("Advance",[{key:"play",label:"Play advance",type:"button",apply:Ya},{key:"seconds",label:"Seconds",min:1,max:15,step:.5,value:4,apply:f=>{Za=f,kt()}},{key:"curve",label:"Slowdown (0.5 = liquid, 1 = linear)",min:.25,max:1,step:.05,value:.5,apply:f=>{Ja=f,kt()}},{key:"colour",label:"Colour",type:"color",value:"#b31217",apply:f=>{Xa=f,kt()}},{key:"rimColour",label:"Leading edge",type:"color",value:"#4a0505",apply:f=>{Ka=f,kt()}},{key:"rimKm",label:"Leading edge depth (km)",min:0,max:200,step:5,value:40,apply:f=>{oo=f,kt()}},{key:"opacity",label:"Opacity",min:0,max:1,step:.05,value:.85,apply:f=>{Va=f,kt()}},{key:"lobeAmount",label:"Lobe depth (km)",min:0,max:150,step:5,value:45,apply:f=>{to=f,ya()}},{key:"lobeScale",label:"Lobe count",min:1,max:20,step:1,value:6,apply:f=>{eo=f,ya()}},{key:"mergeKm",label:"Front merge (km)",min:0,max:400,step:10,value:120,apply:f=>{ao=f,ya()}},{key:"clear",label:"Clear",type:"button",apply:()=>pe?.clear()}],{tab:"Map"}),window.__tune.register("Territory labels",[{key:"resting",label:"Names at rest",type:"boolean",value:!1,apply:f=>{ue=f,he()}},{key:"font",label:"Font",type:"select",options:E,value:"Cinzel",apply:f=>P("text-font",[f])},{key:"size",label:"Size",min:6,max:32,step:.5,value:12,apply:f=>{lt=f,M()}},{key:"hoverScale",label:"Hover scale",min:1,max:2.5,step:.05,value:1.35,apply:f=>{qe=f}},{key:"hoverMs",label:"Hover speed (ms)",min:0,max:800,step:10,value:180,apply:f=>{ct=f}},{key:"tracking",label:"Letter spacing",min:0,max:.4,step:.01,value:.06,apply:f=>P("text-letter-spacing",f)},{key:"caps",label:"Small caps",type:"boolean",value:!0,apply:f=>P("text-transform",f?"uppercase":"none")},{key:"haloWidth",label:"Halo width",min:0,max:5,step:.25,value:2,apply:f=>q("text-halo-width",f)},{key:"haloBlur",label:"Halo softness",min:0,max:4,step:.25,value:.5,apply:f=>q("text-halo-blur",f)}],{tab:"Map"}),window.__tune.register("Territory borders",[{key:"lineOpacity",label:"Border opacity",min:0,max:1,step:.05,value:1,apply:f=>{ee["boundaries-line.line-opacity"]=f,N=f,Te(i.year)}},{key:"labelColor",label:"Label",type:"color",value:"#e6ecf7",apply:f=>{ee["boundaries-label.text-color"]=f,K("boundaries-label","text-color",f)}},{key:"labelHalo",label:"Label halo",type:"color",value:"#10151f",apply:f=>{ee["boundaries-label.text-halo-color"]=f,K("boundaries-label","text-halo-color",f)}}],{tab:"Map"}),window.__tune.register("Hand-drawn territories",[{key:"handShow",label:"Show",type:"boolean",value:!0,apply:f=>{for(const re of["hand-fill","hand-line"])if(o.getLayer(re))try{o.setLayoutProperty(re,"visibility",f?"visible":"none")}catch{}}},{key:"handEdgeColour",label:"Edge",type:"color",value:oe.line.color,apply:f=>{ee["hand-line.line-color"]=f,K("hand-line","line-color",f)}},{key:"handEdgeWidth",label:"Edge width",min:0,max:4,step:.1,value:1,apply:f=>{A.width=f,h("hand-line","line-width",G())}},{key:"handDash",label:"Dash length",min:.5,max:8,step:.25,value:2,apply:f=>{A.dash=f,h("hand-line","line-dasharray",H())}},{key:"handOpacityMedium",label:"Edge opacity · medium",min:0,max:1,step:.02,value:.7,apply:f=>{A.opacityMedium=f,Te(i.year)}},{key:"handOpacityLow",label:"Edge opacity · low",min:0,max:1,step:.02,value:.42,apply:f=>{A.opacityLow=f,Te(i.year)}},{key:"handBlurMedium",label:"Edge softness · medium",min:0,max:8,step:.2,value:1.4,apply:f=>{A.blurMedium=f,h("hand-line","line-blur",p())}},{key:"handBlurLow",label:"Edge softness · low",min:0,max:8,step:.2,value:3.2,apply:f=>{A.blurLow=f,h("hand-line","line-blur",p())}}],{tab:"Map"}),window.__tune.register("Hover glow",[{key:"glowColour",label:"Glow",type:"color",value:L,apply:f=>{V.colour=f,te()}},{key:"glowStrength",label:"Strength",min:0,max:1,step:.05,value:.55,apply:f=>{V.strength=f,te()}},{key:"glowWidth",label:"Width",min:.2,max:4,step:.1,value:1,apply:f=>{V.width=f,te()}},{key:"glowBlur",label:"Softness",min:0,max:20,step:.5,value:6,apply:f=>{V.blur=f,te()}}],{tab:"Map"}),window.__tune.register("Rounded corners",[{key:"smoothing",label:"Rounding",min:0,max:8,step:1,value:0,apply:ke},{key:"smoothWidth",label:"Width",min:0,max:6,step:.1,value:oe.line.width,apply:f=>h("boundaries-smooth","line-width",f)},{key:"smoothOpacity",label:"Opacity",min:0,max:1,step:.05,value:oe.line.opacity,apply:f=>h("boundaries-smooth","line-opacity",f)},{key:"smoothColour",label:"Colour",type:"color",value:oe.line.color,apply:f=>h("boundaries-smooth","line-color",f)}],{tab:"Map"}),window.__tune.register("Ground",[{key:"exaggeration",label:"Heightmap",min:0,max:12,step:.25,value:0,apply:f=>{try{o.setTerrain(f>0?{source:"dem",exaggeration:f}:null)}catch{}}}],{tab:"Map"}),window.__tune.register("Ships",[{key:"lapSeconds",label:"Seconds per lap",min:20,max:900,step:5,value:45,apply:f=>W()?.setLapSeconds(f)},{key:"shipScale",label:"Size",min:.2,max:3,step:.05,value:1,apply:f=>W()?.setShipScale(f)},{key:"anchored",label:"Scale with zoom",type:"boolean",value:!0,apply:f=>W()?.setShipScale(void 0,f)},{key:"nightDim",label:"Night dimming",min:0,max:1,step:.05,value:0,apply:f=>W()?.setNightDim(f,Dr())},{key:"motion",label:"Idle rock",min:0,max:1,step:.05,value:1,apply:f=>W()?.setMotion(f)}],{tab:"Camera"}),window.__tune.register("Framing",[{key:"bottomInset",label:"Bottom inset",type:"number",min:0,max:400,step:2,value:0,apply:f=>{const re=Math.max(0,Number(f)||0);v=re>0,t.style.top=`-${re}px`,t.style.height=`calc(100% + ${re}px)`,o.resize()}},{key:"autoInset",label:"Auto-centre above the deck",type:"boolean",value:!0,apply:f=>{T=f,v=!1,f?I():(t.style.top="0px",t.style.height="",o.resize())}}],{tab:"Camera"}),window.__tune.register("Tilt and turn",[{key:"pitch",label:"Pitch",min:0,max:85,step:1,value:45,apply:f=>o.easeTo({pitch:Number(f),duration:0})},{key:"bearing",label:"Bearing",min:-180,max:180,step:1,value:0,apply:f=>o.easeTo({bearing:Number(f),duration:0})},{key:"minPitch",label:"Min pitch",type:"number",min:0,max:85,step:1,value:0,apply:f=>o.setMinPitch(Number(f))},{key:"maxPitch",label:"Max pitch",type:"number",min:0,max:85,step:1,value:70,apply:f=>o.setMaxPitch(Number(f))}],{tab:"Camera"}),window.__tune.register("Zoom limits",[{key:"minZoom",label:"Min zoom",type:"number",min:0,max:22,step:.1,value:o.getMinZoom(),apply:f=>o.setMinZoom(Number(f))},{key:"maxZoom",label:"Max zoom",type:"number",min:0,max:22,step:.1,value:o.getMaxZoom(),apply:f=>o.setMaxZoom(Number(f))}],{tab:"Camera"}),window.__tune.register("Entrance",[{key:"startLng",label:"Start lng",type:"number",step:.1,value:F.startLng,apply:f=>{F.startLng=Number(f)}},{key:"startLat",label:"Start lat",type:"number",step:.1,value:F.startLat,apply:f=>{F.startLat=Number(f)}},{key:"startZoom",label:"Start zoom",min:0,max:8,step:.05,value:F.startZoom,apply:f=>{F.startZoom=f}},{key:"endLng",label:"End lng",type:"number",step:.1,value:F.endLng,apply:f=>{F.endLng=Number(f)}},{key:"endLat",label:"End lat",type:"number",step:.1,value:F.endLat,apply:f=>{F.endLat=Number(f)}},{key:"endZoom",label:"End zoom",min:0,max:10,step:.05,value:F.endZoom,apply:f=>{F.endZoom=f}},{key:"seconds",label:"Seconds",min:.5,max:12,step:.25,value:F.seconds,apply:f=>{F.seconds=f}},{key:"jumpStart",type:"button",label:"Go to start",apply:()=>o.jumpTo({center:[F.startLng,F.startLat],zoom:F.startZoom})},{key:"play",type:"button",label:"Play entrance",apply:()=>{o.jumpTo({center:[F.startLng,F.startLat],zoom:F.startZoom}),setTimeout(()=>o.flyTo({center:[F.endLng,F.endLat],zoom:F.endZoom,duration:F.seconds*1e3,essential:!0}),120)}}],{tab:"Camera"}),ec()};let Xt=null;window.__tmSetClouds=h=>{const _=Math.max(0,Math.min(1,Number(h)));Xt&&Xt.setOptions({opacity:_});try{localStorage.setItem("tm-clouds",String(_))}catch{}};let et="soft-atlas";const pa=h=>{(h==="ink-art"||h==="inkart")&&(h="pen-ink"),ze[h]||console.warn(`[timemap] no map style "${h}" — falling back to soft-atlas. Defined: ${Object.keys(ze).join(", ")}`);const _=ze[h]?h:"soft-atlas",E=ze[_];et=_;try{localStorage.setItem("tm-style",_)}catch{}const P=!!E.imagery,q=(W,V)=>{o.getLayer(W)&&o.setLayoutProperty(W,"visibility",V?"visible":"none")};q("satellite",P),q("satellite-detail",P);for(const W of["land","coast-shadow","lakes","lake-line","lake-shadow"])q(W,!P);o.getLayer("coast-bold")&&o.setPaintProperty("coast-bold","line-opacity",P?.4:1),o.setPaintProperty("water","background-color",E.water),o.getLayer("lakes")&&o.setPaintProperty("lakes","fill-color",E.water);{const W=E.shore||{color:E.line.color,shadow:"#574631"};o.getLayer("lake-line")&&o.setPaintProperty("lake-line","line-color",W.color),o.getLayer("lake-shadow")&&o.setPaintProperty("lake-shadow","line-color",W.shadow)}o.setPaintProperty("land","fill-color",E.land);const F=E.shore||{color:E.line.color,width:.9,shadow:"#574631",shadowWidth:2.4,dy:2};if(o.getLayer("coast-bold")&&(o.setPaintProperty("coast-bold","line-color",F.color),o.setPaintProperty("coast-bold","line-width",F.width)),o.getLayer("coast-shadow")&&(o.setPaintProperty("coast-shadow","line-color",F.shadow),o.setPaintProperty("coast-shadow","line-width",F.shadowWidth),o.setPaintProperty("coast-shadow","line-translate",[0,F.dy??2])),o.getLayer("coast-echo")&&(E.coast?(o.setLayoutProperty("coast-echo","visibility","visible"),o.setPaintProperty("coast-echo","line-color",E.coast.color),o.setPaintProperty("coast-echo","line-width",E.coast.width??.6),Pr(E.coast)):(o.setLayoutProperty("coast-echo","visibility","none"),Cr())),o.getLayer("rivers"))if(E.river){o.setLayoutProperty("rivers","visibility","visible"),o.setPaintProperty("rivers","line-color",E.river.color),o.setPaintProperty("rivers","line-opacity",E.river.opacity??.55);const W=E.river.width??.6;o.setPaintProperty("rivers","line-width",["interpolate",["linear"],["to-number",["get","scalerank"]],1,W+.5,6,W*.5])}else o.setLayoutProperty("rivers","visibility","none");if(o.getLayer("hillshade")&&o.setLayoutProperty("hillshade","visibility",E.hillshade?"visible":"none"),o.getLayer("graticule")&&(E.grid?(o.setLayoutProperty("graticule","visibility","visible"),o.setPaintProperty("graticule","line-color",E.grid.color),o.setPaintProperty("graticule","line-opacity",E.grid.opacity??.5),o.setPaintProperty("graticule","line-width",E.grid.width??.6)):o.setLayoutProperty("graticule","visibility","none")),o.getLayer("mountains")&&o.setLayoutProperty("mountains","visibility",E.mountains?"visible":"none"),o.getLayer("forests")&&o.setLayoutProperty("forests","visibility",E.forest?"visible":"none"),o.getLayer("land-scatter")&&o.setLayoutProperty("land-scatter","visibility",E.forest?"visible":"none"),Qn(o,!!E.mountains),o.getLayer("boundaries-fill")){N=ee["boundaries-line.line-opacity"]??(E.line&&E.line.opacity!=null?E.line.opacity:1),ce(),K("boundaries-line","line-color",E.line.color),K("boundaries-line","line-width",E.line.width),K("boundaries-line","line-blur",E.line.blur),o.setLayoutProperty("boundaries-line","line-join","round");const W=Le>=1;o.setLayoutProperty("boundaries-line","visibility",E.borderSource||W?"none":"visible"),K("hand-line","line-color",E.line.color),K("boundaries-label","text-color",E.text.color),K("boundaries-label","text-halo-color",E.text.halo)}o.getLayer("markers-label")&&(o.setPaintProperty("markers-label","text-color",E.text.color),o.setPaintProperty("markers-label","text-halo-color",E.text.halo)),Jr(o,{color:E.voyage,halo:E.text&&E.text.halo});for(let W=0;W<6;W++)o.getLayer(`ink-${W}`)&&o.removeLayer(`ink-${W}`);if(o.getLayer("boundaries-line")){const W=E.borderSource&&E.borderSource.source||"cliopatria",V=E.borderSource&&E.borderSource.sourceLayer||"boundaries",te=E.borderSource?gt(i.year):z(i.year);(E.inkLayers||[]).forEach((Z,Re)=>{const pe={id:`ink-${Re}`,type:"line",source:W,"source-layer":V,filter:te,layout:{"line-join":"round","line-cap":"round"},paint:{"line-color":Z.color,"line-width":Z.width,"line-opacity":Z.opacity??1,"line-blur":Z.blur??0,...Z.offset!=null?{"line-offset":Z.offset}:{},...Z.dash?{"line-dasharray":Z.dash}:{}}};Z.above?o.addLayer(pe,o.getLayer("boundaries-label")?"boundaries-label":void 0):o.addLayer(pe,"boundaries-line")})}Rr(E)};window.__applyMapStyle=pa,window.__tmShowGlow=Je,window.__tmSetRounding=ke,window.__timemapSoundOn=(()=>{try{return localStorage.getItem("tm-sound")==="1"}catch{return!1}})();let be=null;const Ft=h=>{const _=be;window.dispatchEvent(new CustomEvent("timemap-audio",{detail:{visible:!!(h&&_),playing:!!(_&&!_.paused&&!_.ended),currentTime:_&&_.currentTime||0,duration:_&&isFinite(_.duration)?_.duration:0}}))};window.__timemapStopSpeak=()=>{if(be){try{be.pause()}catch{}be=null}Ft(!1)},window.__timemapToggleSpeak=()=>{be&&(be.paused?be.play().catch(()=>{}):be.pause(),Ft(!0))},window.__timemapSeek=h=>{be&&isFinite(be.duration)&&(be.currentTime=Math.max(0,Math.min(1,h))*be.duration,Ft(!0))},window.__timemapSpeak=(h,_)=>{if(window.__timemapStopSpeak(),!window.__timemapSoundOn||!h||!_)return;const E=(document.querySelector("meta[name=csrf-token]")||{}).content||"";fetch("/teacher/timemap/speak",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-TOKEN":E},body:JSON.stringify({id:h,text:_})}).then(P=>P.ok?P.json():{}).then(P=>{!P||!P.url||!window.__timemapSoundOn||(be=new Audio(P.url),["loadedmetadata","timeupdate","play","pause"].forEach(q=>be.addEventListener(q,()=>Ft(!0))),be.addEventListener("ended",()=>window.__timemapStopSpeak()),be.play().catch(()=>{}),Ft(!0))}).catch(()=>{})},window.__timemapAudioTeardownBound||(window.__timemapAudioTeardownBound=!0,document.addEventListener("livewire:navigating",()=>window.__timemapStopSpeak&&window.__timemapStopSpeak()),window.addEventListener("pagehide",()=>window.__timemapStopSpeak&&window.__timemapStopSpeak())),o.on("load",()=>{o.addLayer({id:"boundaries-fill",type:"fill",source:"cliopatria","source-layer":"boundaries",paint:{"fill-color":w,"fill-opacity":x,"fill-opacity-transition":{duration:150}}}),o.addLayer({id:"hand-fill",type:"fill",source:"hand-territories",paint:{"fill-color":w,"fill-opacity":x,"fill-opacity-transition":{duration:150}}}),o.addLayer({id:"boundaries-smooth",type:"line",source:bt,layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":oe.line.color,"line-width":oe.line.width,"line-opacity":oe.line.opacity}}),o.addLayer({id:"boundaries-glow",type:"line",source:"boundaries-glow-src",filter:["==",["geometry-type"],"LineString"],layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":L,"line-width":O,"line-blur":6,"line-opacity":.55,"line-opacity-transition":{duration:140}}}),o.addLayer({id:"boundaries-line",type:"line",source:"cliopatria","source-layer":"boundaries",paint:{"line-color":oe.line.color,"line-width":oe.line.width,"line-opacity":oe.line.opacity}}),o.addLayer({id:"hand-line",type:"line",source:"hand-territories",layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":oe.line.color,"line-width":G(),"line-opacity":Y(),"line-blur":p(),"line-dasharray":H()}}),o.addLayer({id:"rivers",type:"line",source:"rivers","source-layer":"rivers",filter:["<=",["to-number",["get","scalerank"]],5],layout:{visibility:"none","line-cap":"round","line-join":"round"},paint:{"line-color":"#6a7c74","line-width":.6,"line-opacity":.6}}),o.addSource("labels",{type:"geojson",data:{type:"FeatureCollection",features:[]}}),o.addLayer({id:"boundaries-label",type:"symbol",source:"labels",layout:{"icon-image":["get","flag"],"icon-size":.13,"icon-anchor":"bottom","icon-allow-overlap":!1,"icon-optional":!0,"text-field":["get","name"],"text-font":["Cinzel"],"text-transform":"uppercase","text-letter-spacing":.06,"text-size":12,"text-anchor":"top","text-offset":[0,.55],"text-allow-overlap":!1,"text-optional":!0,"text-padding":6,"symbol-sort-key":["case",["get","sel"],0,["get","hov"],0,1]},paint:{"text-color":oe.text.color,"text-halo-color":oe.text.halo,"text-halo-width":2,"text-halo-blur":.5,"icon-translate":[0,-9]}}),o.addLayer({id:"boundaries-cursor-label",type:"symbol",source:"boundaries-cursor-name",layout:{"text-field":["get","name"],"text-font":["Cinzel"],"text-transform":"uppercase","text-letter-spacing":.06,"text-size":12,"text-anchor":"bottom","text-offset":[0,-1.1],"text-allow-overlap":!0,"text-ignore-placement":!0},paint:{"text-color":oe.text.color,"text-halo-color":oe.text.halo,"text-halo-width":2,"text-halo-blur":.5}});const h=()=>(ze[et]||{}).land||oe.land;Fn(o,{beforeId:"boundaries-label",visibility:"none"}).then(()=>Dn(o,{beforeId:"boundaries-label",visibility:"none",landColor:h()})).then(()=>Rn(o,{beforeId:"boundaries-label",visibility:"none",landColor:h()})).then(()=>Bn(o,{beforeId:"boundaries-label",visibility:"none"})).then(()=>pa(et)),o.addSource("markers",{type:"geojson",data:zn}),o.addLayer({id:"markers-dot",type:"circle",source:"markers",paint:{"circle-radius":4,"circle-color":"#cbbfa6","circle-stroke-color":"#6b5a3e","circle-stroke-width":1.4,"circle-opacity":.85}}),o.addLayer({id:"markers-label",type:"symbol",source:"markers",layout:{"text-field":["get","name"],"text-size":14,"text-font":["Cinzel"],"text-transform":"uppercase","text-offset":[0,.9],"text-anchor":"top","text-allow-overlap":!1,"text-optional":!0,"text-letter-spacing":.06},paint:{"text-color":"#6b5a3e","text-halo-color":"#f3ead6","text-halo-width":1.2}},o.getLayer("boundaries-label")?"boundaries-label":void 0);let _=.5;try{const P=parseFloat(localStorage.getItem("tm-clouds"));Number.isFinite(P)&&(_=Math.min(1,Math.max(0,P)))}catch{}fa=Gl(o,{date:ma(i.year),reduceMotion:da}),Xt=fa.layers.clouds,Xt?.setOptions({opacity:_}),Ir(),Vr(o,{year:i.year,beforeId:Fa,labelBeforeId:"boundaries-label"}),Me=vi(o,{ships:()=>xe,locale:document.documentElement.lang||"en",transportNames:JSON.parse(t.dataset.transportNames||"{}"),onDwell:P=>{Me?.selected!==P&&$a(P)}}),qr(async()=>{const{addVoyageShips:P}=await import("./voyage-ships-BIecRF7w.js");return{addVoyageShips:P}},[]).then(({addVoyageShips:P})=>{xe=P(o,{beforeId:Fa}),xe.setYear(i.year),window.__tmShips=xe}).catch(()=>{}),o.on("mouseenter","markers-dot",()=>{o.getCanvas().style.cursor="pointer"}),o.on("mouseleave","markers-dot",()=>{o.getCanvas().style.cursor=""}),o.on("moveend",Ve),o.on("moveend",Ze),o.on("sourcedata",P=>{P.sourceId==="cliopatria"&&P.isSourceLoaded&&Ve()});let E=null;try{E=localStorage.getItem("tm-style")}catch{}pa(E||"soft-atlas"),Mt(i.year);for(const P of fe)o.getLayer(P)&&(o.on("mousemove",P,q=>{if(o.getCanvas().style.cursor="pointer",!q.features.length)return;if(q.features[0].id===yt){me&&It(me,q.lngLat);return}yt=q.features[0].id;const F=q.features[0].properties,W=F.Wikidata?Ca.get(`${F.Wikidata}|${F.Name}`)||F.Wikidata:null;Je(q.features[0].geometry,F.Name??null,W);const V=F.Name??null,te=V&&(!ue||!Fe(V));It(te?V:null,q.lngLat)}),o.on("mouseleave",P,()=>{o.getCanvas().style.cursor="",yt=null,Je(null),It(null)}));i.ready=!0,s()});const $a=h=>{const _=Qt.voyages.find(E=>E.id===h);_&&(Ne&&Ne.id!==h&&Et(),ie!==null&&(Dt(),Qe()),Me?.select(_.id),i.selectedRegion=_.qid,s(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:_.qid,name:String(_.name).replace(/\s+—\s+/g,": "),qid:_.qid,voyageId:_.id}})))};let Ne=null;const Ur=5,Fr=220,Wa=[24,90],ja=h=>window.dispatchEvent(new CustomEvent("voyage-play-state",{detail:{id:h}})),Et=()=>{Ne&&(cancelAnimationFrame(Ne.raf),o.stop(),Ne=null,Me?.play(null),ja(null))},Nr=h=>{const _=Qt.voyages.find(V=>V.id===h);if(!_||!xe)return;Et(),(i.year<_.show_from||i.year>_.show_to)&&window.__setTimemapYear?.(_.year_start);const E=ea(_.waypoints);let P=0;for(let V=1;V<E.length;V++){const[te,Z]=[E[V-1],E[V]];P+=Math.hypot((Z[0]-te[0])*Math.cos((te[1]+Z[1])/2*Math.PI/180),Z[1]-te[1])*111.32}const q=Math.min(Wa[1],Math.max(Wa[0],P/Fr)),F={id:h,raf:0,start:0};Ne=F,ja(h),Me?.play(h,0);const W=xe.pointAt(h,0);o.flyTo({center:[W.lng,W.lat],zoom:Math.max(Ur,Math.min(o.getZoom(),6)),duration:da?0:2200,essential:!0}),o.once("moveend",()=>{if(Ne!==F)return;const V=te=>{if(Ne!==F)return;F.start||(F.start=te);const Z=Math.min(1,(te-F.start)/(q*1e3)),Re=xe.pointAt(h,Z);o.jumpTo({center:[Re.lng,Re.lat]}),Me?.play(h,Z),Z<1?F.raf=requestAnimationFrame(V):window.setTimeout(()=>{Ne===F&&Et()},2500)};F.raf=requestAnimationFrame(V)})};for(const h of["dragstart","wheel","touchstart","boxzoomstart"])o.on(h,_=>{Ne&&_.originalEvent&&Et()});window.__timemapPlayVoyage=h=>Ne?.id===h?Et():Nr(h),o.on("click",h=>{const _=[[h.point.x-7,h.point.y-7],[h.point.x+7,h.point.y+7]],E=o.queryRenderedFeatures(_,{layers:["markers-dot"]})[0];if(E){ie!==null&&(Dt(),Qe()),Me?.clear();const Z=E.properties;i.selectedRegion=Z.id,s(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:Z.id,name:Z.name,qid:Z.qid,articleUrl:Z.article_url,summary:Z.summary,inception:Z.inception,dissolution:Z.dissolution}}));return}const P=o.getLayer("voyage-hit")&&o.queryRenderedFeatures(h.point,{layers:["voyage-hit"]})[0];if(P){$a(P.properties.id);return}Me?.clear();const q=o.queryRenderedFeatures(h.point,{layers:fe.filter(Z=>o.getLayer(Z))})[0],F=!!q?.properties?.hand;Dt(),ie=q?q.id:null,We=q?h.lngLat:null,vt=q?q.properties?.Name??null:null,Ue=F,ie!==null&&je(ie,!0,F),Qe();const W=q?q.properties.Wikidata:null,V=q?q.properties.Name:null,te=W?Ca.get(`${W}|${V}`)||W:null;i.selectedRegion=te,s(),zt?.cancel(),zt=q?Zr(o,{id:"polity-sweep",lines:ba(q.geometry).flatMap(Z=>no(Z)).filter(Z=>Z.length>=4),durationMs:2e3,beforeId:o.getLayer("boundaries-label")?"boundaries-label":void 0}):null,window.dispatchEvent(new CustomEvent("polity-selected",{detail:F?{id:te,name:V,qid:te,hand:!0,territoryId:q.properties.id,inception:Number(q.properties.FromYear),dissolution:Number(q.properties.ToYear),provenance:Jn(q.properties.id)}:{id:te,name:V,qid:te}}))});const Or=()=>{if(ie===null||!We)return;const h=o.project(We);if(!Number.isFinite(h.x)||!Number.isFinite(h.y))return;const _=fe.filter(V=>o.getLayer(V));if(!_.length)return;const E=o.queryRenderedFeatures(h,{layers:_})[0];if(!E||E.id===ie)return;const P=vt;je(ie,!1),ie=E.id,je(ie,!0);const q=E.properties?.Name??null,F=E.properties?.Wikidata??null,W=F?Ca.get(`${F}|${q}`)||F:null;vt=q,i.selectedRegion=W,Qe(),s(),window.dispatchEvent(new CustomEvent("polity-selected",{detail:{id:W,name:q,qid:W,succeeded:!0,previousName:P}}))};return t._setYear=h=>(i.year=h,r.year=h,Mt(h),s(),clearTimeout(Ct),Ct=setTimeout(Or,320),Go(h)),t._setFadeMode=h=>{rt=!!h,Te(i.year)},t._tmMap=o,window.__tmMap=o,window.__timemapClearSelection=()=>{ie!==null&&(je(ie,!1),ie=null,Qe()),Et(),Me?.clear(),i.selectedRegion=null,s()},o};window.mountAtlasSlider=function(e,t,r,n){let s=0,o=null;const l=u=>{if(!t._setYear)return;const y=performance.now(),T=100-(y-s);clearTimeout(o),T<=0?(s=y,t._setYear(u)):o=setTimeout(()=>{s=performance.now(),t._setYear(u)},T)},a=wn(e,{min:-4e3,max:2010,value:r,labels:n,spans:ac(),onYear:u=>l(u),onPlay:u=>{t._setFadeMode&&t._setFadeMode(u)}});xn(document.querySelector("[data-timemap-year-flash]")),Sn(),window.__setTimemapYear=u=>{const y=Math.round(Number(u));Number.isNaN(y)||(a.setYear(y),t._setYear&&t._setYear(y))}};window.__timemapLoadVoyage=e=>Ti(e,document.documentElement.lang||"en");function Mr(e){const t=/\/wiki\/([^?#]+)/.exec(e||"");return t?decodeURIComponent(t[1]):null}window.__timemapWikiSummary=async e=>{if(!e||!e.includes("wikipedia.org"))return null;const t=Mr(e);if(!t)return null;try{const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(t));if(!r.ok)return null;const n=await r.json();return{thumbnail:n.thumbnail?.source||null,extract:n.extract||null}}catch{return null}};window.__timemapWikiLead=async e=>{if(!e||!e.includes("wikipedia.org"))return null;const t=Mr(e);if(!t)return null;try{const r="https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&format=json&origin=*&titles="+encodeURIComponent(t),n=await fetch(r);if(!n.ok)return null;const i=await n.json(),s=i.query&&i.query.pages||{},o=Object.values(s)[0];return o&&o.extract||null}catch{return null}};window.__timemapHydratePanel=(e,t)=>{e.thumb=null,e.lead=null,e.leadLoading=!1,e.leadFailed=!1,t&&t.wikipedia_url&&window.__timemapWikiSummary(t.wikipedia_url).then(r=>{e.thumb=r&&r.thumbnail||null})};window.__timemapPanelReadMore=(e,t)=>{!t||!t.wikipedia_url||(e.leadLoading=!0,e.leadFailed=!1,window.__timemapWikiLead(t.wikipedia_url).then(r=>{r?e.lead=r:e.leadFailed=!0,e.leadLoading=!1}))};function ac(){return(Qt.voyages??[]).filter(t=>Number.isFinite(t.year_start)&&Number.isFinite(t.year_end)&&t.year_end-t.year_start<=50).map(t=>({start:t.year_start,end:t.year_end,label:String(t.name).replace(/\s+—\s+/g,": ")}))}
