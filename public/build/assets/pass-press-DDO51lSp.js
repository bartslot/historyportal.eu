function e(n,t){n.style.pointerEvents="none";try{document.elementFromPoint(t.clientX,t.clientY)?.dispatchEvent(new PointerEvent(t.type,t))}finally{n.style.pointerEvents="auto"}}export{e as p};
