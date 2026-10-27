// Figma web "Edit with prompt" driver (art library v2). Paste into the Figma tab of file ULbjXnT1DAatLTQLwWLHTE
// via claude-in-chrome javascript_tool; re-paste after every page reload (nothing persists).
// Per sheet:  await __hpPrep("<nodeId>", prompt)  -> "<id>: ready refs=9", then send a REAL Return key
// (computer key "Return"); a synthetic click on Send is ignored, and Return is swallowed if fewer than 9 refs show.
// Wait ~60-90 s, then download_assets on the node and `python3 weave.py grab <bundle> <sheet> <variant> <urls...>`.
// The edit replaces the node's image fill IN PLACE (the ink stays in _work/<bundle>/<sheet>/ink.png).
// REFS = _work/weave/refs.json in weave.REF_ORDER (4 verbree watercolours, their 4 inks, tasman texture).
// prompt = prompts.weave_colour_prompt(template, bundle) (+ WEAVE_COLOUR_FIX for a second pass); __fx below are the
// targeted fix prompts used for the checker fixes (canal i, uruk h, ships m, hunebed i).
const REFS=["https://media.weavy.ai/image/upload/v1793105910/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/jjk7wugww6embcdi62v4.png","https://media.weavy.ai/image/upload/v1793105916/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/gjhzofkqgwh9aqwty8zv.png","https://media.weavy.ai/image/upload/v1793105913/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/rrnkspzfyxhs8uhxchjz.png","https://media.weavy.ai/image/upload/v1793105918/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/alpdca9mel7bykuyaksa.png","https://media.weavy.ai/image/upload/v1793105820/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/vtduzg6ssm6ocnulgcaw.png","https://media.weavy.ai/image/upload/v1793105827/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/ehthojza6cpwbi1kae4t.png","https://media.weavy.ai/image/upload/v1793105823/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/ns2vzqo7qjddrmog3tda.png","https://media.weavy.ai/image/upload/v1793105829/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/t4zr1gt7jrgbmutbeern.png","https://media.weavy.ai/image/upload/v1793105832/uploads/LBKFiHYR0UdbMd9IGyWv6A3xSKy1/bv8swgnpchweelha6ivg.png"];
window.__hpFiles = await Promise.all(REFS.map(async(u,i)=>new File([await (await fetch(u)).blob()],`ref${i+1}.png`,{type:'image/png'})));
window.sleep=ms=>new Promise(r=>setTimeout(r,ms));
const anyRow=document.querySelector('[data-testid$="-layers-panel-row"]'); let sc=anyRow; while(sc && !(sc.scrollHeight>sc.clientHeight+20 && getComputedStyle(sc).overflowY!=='visible')) sc=sc.parentElement; window.__hpScroller=sc;
window.__hpFindRow=async(id)=>{const sel=`[data-testid="${id}-layers-panel-row"]`; let r=document.querySelector(sel); if(r) return r; const s=window.__hpScroller; for(let y=0;y<=s.scrollHeight;y+=200){s.scrollTop=y; await sleep(120); r=document.querySelector(sel); if(r){r.scrollIntoView({block:'center'}); await sleep(200); return document.querySelector(sel);} } return null;};
window.__hpPrep = async (nodeId, prompt) => {
  const row=await window.__hpFindRow(nodeId); if(!row) return nodeId+': no row';
  for (const t of ['pointerdown','mousedown','pointerup','mouseup','click']) row.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window}));
  let btn; for(let i=0;i<16 && !btn;i++){await sleep(500); btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Edit with prompt');}
  if(!btn) return nodeId+': no edit button'; btn.click();
  let inp; for(let i=0;i<10 && !inp;i++){await sleep(400); inp=document.querySelector('input[type=file][accept*=image]');}
  if(!inp) return nodeId+': no file input';
  const model=document.querySelector('button[aria-label="Select model"]')?.textContent.trim(); if(!/GPT Image 2.5/.test(model||'')) return nodeId+': wrong model '+model;
  const dt=new DataTransfer(); window.__hpFiles.forEach(f=>dt.items.add(f)); inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true}));
  for(let i=0;i<30 && document.querySelectorAll('button[aria-label="Attached asset"]').length<9;i++) await sleep(400); await sleep(800);
  const ed=[...document.querySelectorAll('[contenteditable=true]')].find(e=>e.className!=='focus-target'); if(!ed) return nodeId+': no editor';
  ed.focus(); document.execCommand('insertText',false,prompt);
  return nodeId+': ready refs='+document.querySelectorAll('button[aria-label="Attached asset"]').length;
};
const KEEP=" Keep everything else exactly as it is: same canvas, framing, positions, every black line and every other colour. Of the nine attached images, the first four are History Lines watercolours and the next four their inks, the last a texture reference; they show style only.";
window.__fx={
canal:"Change only two things in this watercolour sheet: (1) the metal hoe lying beside the trench becomes a Neolithic hoe: a wooden handle with a flat stone blade lashed on with cord, no metal; (2) the small dam is built only of packed earth, bundled reeds and brushwood: no squared timbers, no sawn planks, no boards."+KEEP,
uruk:"Change only the temple and the walls: remove the city wall and every column. On the right, a high mudbrick terrace with sloped, buttressed sides carries one small whitewashed rectangular temple with niched, buttressed walls and no columns, no tiers, no steps of stages. The houses stay low and flat-roofed."+KEEP,
flags:"Change only the flags and pennants on the ships: each flag is the VOC flag, three equal horizontal bands orange on top, white in the middle, blue at the bottom, with a small black VOC monogram (a V with the O and C joined to its arms) in the middle of the white band and a small letter A above it. The pennant of the small boat becomes orange-white-blue."+KEEP,
granite:"Change only the colour of the large stones: glacial granite erratics, cool grey with warm pinkish-ochre patches and darker grey shadow sides, painted as calm transparent washes. Keep the ink, the grass and everything else exactly."+KEEP};
