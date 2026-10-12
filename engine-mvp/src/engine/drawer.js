// Asset drawer above the timeline: every catalog item in folders, as tiles you DRAG into the scene.
// While dragging over the stage the model is already there, under the cursor, following the same rules as
// click-placing (floor grid; doors snap to walls and cannot land off one). Let go to place it.
/* global BABYLON */
'use strict';
import { __ } from '../i18n';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const canvas = scene.getEngine().getRenderingCanvas();

  const FOLDERS = [
    { name: 'Characters', label: __('Characters'), test: /girl|mannequin|horse|camel|figure|person/i },
    { name: 'Nature', label: __('Nature'), test: /tree|rock|bush|flower/i },
    { name: 'Buildings', label: __('Buildings'), test: /house|town|city|church|tower/i },
    { name: 'Doors & gates', label: __('Doors & gates'), test: /door|gate/i },
    { name: 'Props', label: __('Props'), test: /./ },                   // everything else
    // 2D images that become cards on walls and floors (folder set by cards.js)
    { name: 'Line art', label: __('Line art'), test: null }, { name: 'History line', label: __('History line'), test: null }, { name: 'Shapes', label: __('Shapes'), test: null }, { name: 'Arrows', label: __('Arrows'), test: null },
  ];
  const folderOf = (item) => item.folder || FOLDERS.find((f) => f.test && f.test.test(item.name)).name;

  const drawer = document.getElementById('drawer');
  const tabs = drawer.querySelector('.tabs');
  const tiles = drawer.querySelector('.tiles');
  let folder = 'Characters';

  function render() {
    tabs.innerHTML = '';
    FOLDERS.forEach((f) => {
      const t = document.createElement('button');
      t.textContent = f.label;
      t.className = f.name === folder ? 'on' : '';
      t.onclick = () => { folder = f.name; render(); };
      tabs.appendChild(t);
    });
    tiles.innerHTML = '';
    mvp.CATALOG.filter((item) => folderOf(item) === folder).forEach((item) => {
      const tile = document.createElement('div');
      tile.className = item.image ? 'tile image' : 'tile';
      tile.draggable = true;
      if (item.image) {                                   // image cards: show the picture itself
        const img = document.createElement('img');
        img.src = item.image; img.alt = item.name; img.loading = 'lazy'; img.draggable = false;
        tile.appendChild(img);
      }
      const label = document.createElement('span');
      label.textContent = item.name.replace(/\s*\(.*\)$/, '');
      tile.appendChild(label);
      const sub = item.sub ? [null, item.sub] : item.name.match(/\((.*)\)$/);
      if (sub) { const s = document.createElement('small'); s.textContent = sub[1]; tile.appendChild(s); }
      tile.dataset.tooltip = __('Drag into the scene');
      tile.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.name);
        e.dataTransfer.effectAllowed = 'copy';
        dragItem = item;
      });
      tile.addEventListener('dragend', () => { dragItem = null; });
      tiles.appendChild(tile);
    });
  }
  // open/close belongs to the studio's panel system (the bottom dock), not to the drawer itself
  mvp.showAssetFolder = (name) => { if (FOLDERS.some((f) => f.name === name)) { folder = name; render(); } };
  mvp.assetFolders = FOLDERS.map((f) => f.name);

  // ---------- drag over the stage: a live preview that follows the cursor ----------
  let dragItem = null;
  let preview = null;          // the actor being dragged in
  mvp.getDragIn = () => preview; // the placement ghost draws its footprint too
  let pending = null;          // its creation (models load asynchronously)

  function pointerFrom(e) {
    const r = canvas.getBoundingClientRect();
    const k = scene.getEngine().getRenderWidth() / r.width;   // CSS pixels -> render pixels
    scene.pointerX = (e.clientX - r.left) * k;
    scene.pointerY = (e.clientY - r.top) * k;
  }
  canvas.addEventListener('dragenter', (e) => {
    if (!dragItem) return;
    e.preventDefault();
    if (preview || pending) return;
    pointerFrom(e);
    pending = mvp.addFromCatalog(dragItem, { x: 0, z: 0 }).then((a) => {
      preview = a;
      pending = null;
      mvp.moveUnderPointer(a);
      return a;
    });
  });
  canvas.addEventListener('dragover', (e) => {
    if (!dragItem) return;
    e.preventDefault();                       // allow dropping on the stage
    e.dataTransfer.dropEffect = 'copy';
    pointerFrom(e);
    if (preview) mvp.moveUnderPointer(preview);
  });
  canvas.addEventListener('dragleave', async () => {
    // left the stage without dropping: take the preview away
    const a = preview || (pending && await pending);
    if (a && !dropped) mvp.deleteActor(a);
    preview = null;
  });
  let dropped = false;
  // image files from the desktop: each becomes a card on the surface where it is dropped
  canvas.addEventListener('dragover', (e) => { if (!dragItem && e.dataTransfer.types.includes('Files')) e.preventDefault(); });
  canvas.addEventListener('drop', async (e) => {
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (dragItem || !files.length) return;
    e.preventDefault();
    for (const f of files) {
      pointerFrom(e);
      const a = await mvp.addFromCatalog(mvp.cardItem(f.name.replace(/\.[^.]+$/, ''), URL.createObjectURL(f), 'Images'), { x: 0, z: 0 });
      mvp.moveUnderPointer(a);
      if (!mvp.dropAllowed(a)) { mvp.deleteActor(a); mvp.flash(__('Drop pictures on a wall, the floor or an object')); }
    }
  });
  canvas.addEventListener('drop', async (e) => {
    if (!dragItem) return;
    e.preventDefault();
    dropped = true;
    pointerFrom(e);
    const a = preview || (pending && await pending);
    preview = null;
    pending = null;
    if (a) {
      mvp.moveUnderPointer(a);
      if (!mvp.dropAllowed(a)) {
        const why = mvp.whyNot(a);
        mvp.deleteActor(a);
        mvp.flash(why);                        // after: deleting resets the stage label
      } else {
        mvp.select(a);
        mvp.autoKey();
      }
    }
    setTimeout(() => { dropped = false; }, 0);
  });

  render();
  // modules that load later (doors, trees, town) add to the catalog: refresh once everything is in
  setTimeout(render, 0);
  window.__drawer = { render };
})();
