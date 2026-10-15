{{--
    Playtest recorder — admins only. Speak feedback while pointing at the thing; each spoken
    sentence is saved with the cursor position and the element under it, so Claude can read
    "what was said about which part" from storage/app/private/playtests/{date}.jsonl.

    Toggle: the round button bottom-left, or Alt+Shift+P. Language: add ?playtest_lang=nl-NL once. Speech recognition is the browser's own
    (Chrome/Edge/Safari); nothing is recorded until you press it and allow the microphone.
--}}
@auth
@if (auth()->user()->isAdmin())
<button type="button" id="hp-playtest" class="btn btn-sm btn-circle btn-neutral"
        style="position:fixed;left:12px;bottom:12px;z-index:2147483647;opacity:.8"
        title="Playtest: speak feedback about what the cursor points at (Alt+Shift+P)"
        aria-pressed="false">●</button>
<div id="hp-playtest-said" role="status" aria-live="polite"
     style="position:fixed;left:56px;bottom:14px;z-index:2147483647;max-width:min(60vw,520px);display:none"
     class="badge badge-neutral h-auto py-1 text-xs"></div>
<script>
(() => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition
    const btn = document.getElementById('hp-playtest')
    const said = document.getElementById('hp-playtest-said')
    if (!Rec) { btn.title = 'Playtest needs Chrome, Edge or Safari (speech recognition)'; btn.disabled = true; return }

    const ENDPOINT = {{ Js::from(route('admin.playtest-notes.store', absolute: false)) }}
    const CSRF = document.querySelector('meta[name="csrf-token"]')?.content ?? ''
    const SAMPLE_MS = 150
    const TRAIL_KEEP_MS = 60000

    let active = false
    let rec = null
    let cursor = { x: 0, y: 0 }
    let trail = []          // [{t, x, y}] — last minute of cursor movement
    let utteranceStart = null
    let lastSample = 0

    // Speech language: ?playtest_lang=nl-NL once, remembered per browser; else the browser's own.
    const lang = () => {
        const asked = new URLSearchParams(location.search).get('playtest_lang')
        try {
            if (asked) localStorage.setItem('hpPlaytestLang', asked)
            return asked || localStorage.getItem('hpPlaytestLang') || navigator.language || 'en-US'
        } catch (_) { return asked || navigator.language || 'en-US' }
    }

    const describe = (el) => {
        if (!el || el === document.documentElement) return null
        const path = []
        for (let n = el; n && n.nodeType === 1 && path.length < 5 && n !== document.body; n = n.parentElement) {
            let part = n.tagName.toLowerCase()
            if (n.id) part += '#' + n.id
            const cls = [...n.classList].filter(c => !c.includes(':')).slice(0, 3)
            if (cls.length) part += '.' + cls.join('.')
            path.unshift(part)
        }
        const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || el.title || '')
            .trim().replace(/\s+/g, ' ').slice(0, 120)
        const r = el.getBoundingClientRect()
        return { selector: path.join(' > '), text, rect: [r.x, r.y, r.width, r.height].map(Math.round) }
    }

    const at = (x, y) => ({
        x: Math.round(x), y: Math.round(y),
        fx: +(x / innerWidth).toFixed(3), fy: +(y / innerHeight).toFixed(3),
        element: describe(document.elementFromPoint(x, y)),
    })

    const onMove = (e) => {
        cursor = { x: e.clientX, y: e.clientY }
        const t = performance.now()
        if (t - lastSample < SAMPLE_MS) return
        lastSample = t
        trail.push({ t, x: e.clientX, y: e.clientY })
        while (trail.length && t - trail[0].t > TRAIL_KEEP_MS) trail.shift()
    }

    const send = (note) => fetch(ENDPOINT, {
        method: 'POST', keepalive: true, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': CSRF },
        body: JSON.stringify(note),
    }).then(r => { if (!r.ok) throw new Error(r.status) })
      .catch(err => { said.textContent = '⚠ not saved (' + err.message + '): ' + note.text })

    const onResult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i]
            if (!res.isFinal) { utteranceStart ??= { t: performance.now(), at: at(cursor.x, cursor.y) }; continue }
            const text = res[0].transcript.trim()
            if (!text) continue
            const start = utteranceStart ?? { t: performance.now(), at: at(cursor.x, cursor.y) }
            utteranceStart = null
            const tEnd = performance.now()
            // Every element the cursor rested on while speaking — "this… and that" spans several.
            const end = at(cursor.x, cursor.y)
            const visited = trail.filter(p => p.t >= start.t - 1500)
                .map(p => describe(document.elementFromPoint(p.x, p.y))?.selector)
                .concat(end.element?.selector).filter(Boolean)
            send({
                text,
                url: location.href,
                spoken_at: new Date().toISOString(),
                duration_ms: Math.round(tEnd - start.t),
                viewport: [innerWidth, innerHeight],
                scroll: [Math.round(scrollX), Math.round(scrollY)],
                start: start.at,
                end,
                visited: [...new Set(visited)].slice(0, 12),
                lang: rec.lang,
            })
            said.textContent = '“' + text + '”'
            said.style.display = ''
        }
    }

    const start = () => {
        rec = new Rec()
        rec.lang = lang()
        rec.continuous = true
        rec.interimResults = true
        rec.onresult = onResult
        rec.onerror = (e) => { if (e.error === 'not-allowed') stop(); said.textContent = '⚠ ' + e.error; said.style.display = '' }
        rec.onend = () => { if (active) try { rec.start() } catch (_) {} } // Chrome ends after silence; keep listening
        rec.start()
        active = true
        addEventListener('pointermove', onMove, { passive: true })
        btn.classList.replace('btn-neutral', 'btn-error')
        btn.style.opacity = '1'
        btn.setAttribute('aria-pressed', 'true')
        said.textContent = 'Listening… (' + rec.lang + ')'
        said.style.display = ''
    }

    const stop = () => {
        active = false
        rec?.stop()
        removeEventListener('pointermove', onMove)
        btn.classList.replace('btn-error', 'btn-neutral')
        btn.style.opacity = '.8'
        btn.setAttribute('aria-pressed', 'false')
        said.style.display = 'none'
    }

    const toggle = () => (active ? stop() : start())
    btn.addEventListener('click', toggle)
    addEventListener('keydown', (e) => { if (e.altKey && e.shiftKey && e.code === 'KeyP') { e.preventDefault(); toggle() } })
})()
</script>
@endif
@endauth
