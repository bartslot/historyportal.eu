// Publish = bake the scene to an MP4. While editing everything is live 3D; on publish the timeline is
// rendered frame by frame (deterministic: every frame is set exactly, nothing depends on how fast this
// machine is), encoded with the browser's own H.264 encoder (WebCodecs) and packed into an .mp4.
// Pupils get the video: the cheapest thing any classroom device can play. Only the PICTURE is baked;
// narration, captions and quizzes stay player layers, so one video serves every language.
/* global BABYLON, Mp4Muxer */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const engine = scene.getEngine();
  const FPS = 30;
  const BITRATE = { 720: 6e6, 1080: 12e6 };
  const MAX_QUEUE = 4;          // frames waiting in the encoder before we let it catch up

  const $ = (id) => document.getElementById(id);
  const btn = $('publish');
  const resSel = $('publishRes');
  const status = $('publishStatus');

  // put every actor's own clip (walk, idle) at the exact moment t, instead of letting it run in real time
  function setClipsAt(t) {
    mvp.actors.forEach((a) => {
      const name = a.metadata.playing;
      const g = name && a.metadata.clips.find((c) => c.name === name);
      if (!g) return;
      const fps = (g.targetedAnimations[0] && g.targetedAnimations[0].animation.framePerSecond) || 60;
      const len = Math.max(1, g.to - g.from);
      g.pause();
      g.goToFrame(g.from + ((t * fps) % len));
    });
  }

  async function publish() {
    if (!('VideoEncoder' in window)) { status.textContent = 'This browser has no video encoder (use Chrome, Edge or Safari 17+).'; return; }
    const height = Number(resSel.value);
    const width = Math.round(height * 16 / 9 / 2) * 2;
    const frames = Math.round(mvp.getLength() * FPS);
    if (mvp.isPlaying()) mvp.togglePlay();

    // render at the export size, off the live loop
    engine.stopRenderLoop();
    const canvas = engine.getRenderingCanvas();
    const restoreSize = () => { engine.resize(); };
    engine.setSize(width, height);

    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width, height },
      fastStart: 'in-memory',
    });
    let encodeError = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => { encodeError = e; },
    });
    encoder.configure({ codec: height > 720 ? 'avc1.640028' : 'avc1.64001f', width, height, bitrate: BITRATE[height] || 8e6, framerate: FPS });

    btn.disabled = true;
    const started = performance.now();
    try {
      for (let f = 0; f < frames; f++) {
        if (encodeError) throw encodeError;
        const t = f / FPS;
        mvp.goTo(f * (mvp.FPS / FPS));       // timeline (its own frame rate)
        setClipsAt(t);
        scene.render();
        const frame = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / FPS) });
        encoder.encode(frame, { keyFrame: f % (FPS * 2) === 0 });
        frame.close();
        while (encoder.encodeQueueSize > MAX_QUEUE) await new Promise((r) => setTimeout(r, 1));
        if (f % 5 === 0) {
          status.textContent = `Baking ${f + 1}/${frames} frames…`;
          await new Promise((r) => setTimeout(r, 0)); // let the progress text paint
        }
      }
      await encoder.flush();
      muxer.finalize();
      const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
      const secs = ((performance.now() - started) / 1000).toFixed(1);
      status.textContent = `Saving ${(blob.size / 1e6).toFixed(1)} MB…`;
      const name = 'scene-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.mp4';
      const res = await fetch('/bake?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
      if (!res.ok) throw new Error('saving failed (' + res.status + '): is server.py running?');
      const { url } = await res.json();
      status.innerHTML = '';
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.textContent = `Published: ${name}`;
      status.append(`Baked ${frames} frames in ${secs} s. `, a);
      showPreview(url);
    } catch (err) {
      status.textContent = 'Publish failed: ' + (err.message || err);
    } finally {
      if (encoder.state !== 'closed') encoder.close();
      restoreSize();
      mvp.goTo(0);
      mvp.actors.forEach((a) => { const g = a.metadata.playing && a.metadata.clips.find((c) => c.name === a.metadata.playing); if (g) g.play(true); });
      engine.runRenderLoop(() => scene.render());
      btn.disabled = false;
    }
  }

  function showPreview(url) {
    let dlg = $('bakePreview');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'bakePreview';
      dlg.innerHTML = '<video controls muted style="max-width:80vw;max-height:70vh;display:block"></video><form method="dialog"><button class="btn" style="margin-top:8px">Close</button></form>';
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.querySelector('video').src = url;
    dlg.showModal();
  }

  btn.onclick = publish;
  window.__bake = { publish };
})();
