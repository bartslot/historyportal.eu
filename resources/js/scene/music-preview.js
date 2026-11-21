/**
 * Scene inspector > Music > Preview: plays this scene's mix in the editor through the same mixer
 * the class hears. x-data="sceneMusicPreview(@js($trackUrls))". The mixer loads on the first
 * Preview, so app.js does not carry it for every page.
 */
export function sceneMusicPreview (tracks) {
  let mixer = null
  return {
    playing: false,
    failed: false,
    init () {
      // Only a song list stops it: the scene's Music and Sound previews may play together.
      this._onOther = (e) => { if (e.detail?.kind === 'song' && this.playing) this.stop() }
      window.addEventListener('music-preview-start', this._onOther)
    },
    async toggle (music) {
      if (this.playing) return this.stop()
      window.dispatchEvent(new CustomEvent('music-preview-start', { detail: { kind: 'scene', from: this } }))
      this.playing = true
      this.failed = false
      const { createMusicMixer } = await import('./music-mixer.js')
      if (!this.playing) return
      mixer = createMusicMixer(tracks, { onError: () => { this.failed = true } })
      mixer.enterScene(JSON.parse(JSON.stringify(music ?? null)))
    },
    stop () {
      mixer?.stop()
      mixer = null
      this.playing = false
    },
    destroy () {
      mixer?.destroy()
      mixer = null
      window.removeEventListener('music-preview-start', this._onOther)
    },
  }
}

/**
 * Lesson settings > Music: estimates the tempo of listed tracks that have none and sends it to the
 * server once (LessonMusic::saveTempo), so the class's player can change track on the beat.
 * Decoding runs in an OfflineAudioContext: nothing is played. x-data="lessonMusicTempo(@js($untimed))".
 */
export function lessonMusicTempo (tracks) {
  return {
    async init () {
      if (!tracks?.length || typeof OfflineAudioContext === 'undefined') return
      const { estimateTempo } = await import('./tempo.js')
      for (const { id, url } of tracks) {
        try {
          const data = await (await fetch(url)).arrayBuffer()
          const buffer = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data)
          const tempo = estimateTempo(buffer)
          if (tempo) await this.$wire.saveTempo(id, tempo.bpm, tempo.beat_offset)
        } catch (e) {
          console.warn('lesson music: tempo not estimated', url, e)
        }
      }
    },
  }
}

/**
 * The song list (components/wizard/song-list.blade.php): play one song to hear it, Use it. One song
 * plays at a time across every list on the page, and starting one stops the scene's own Preview
 * (and the other way round) through the 'music-preview-start' window event.
 */
export function songListPreview () {
  let audio = null
  return {
    current: null,
    position: 0,
    duration: 0,
    failed: false,
    init () {
      this._onOther = (e) => { if (e.detail?.from !== this) this.stop() }
      window.addEventListener('music-preview-start', this._onOther)
    },
    toggle (id, url) {
      if (this.current === id) return this.stop()
      this.stop()
      window.dispatchEvent(new CustomEvent('music-preview-start', { detail: { kind: 'song', from: this } }))
      this.failed = false
      this.current = id
      audio = new Audio(url)
      audio.addEventListener('timeupdate', () => { this.position = audio?.currentTime ?? 0 })
      audio.addEventListener('loadedmetadata', () => { this.duration = audio?.duration ?? 0 })
      audio.addEventListener('ended', () => this.stop())
      audio.addEventListener('error', () => { this.failed = true; this.stop() })
      audio.play().catch(() => { if (this.current === id) { this.failed = true; this.stop() } })
    },
    stop () {
      if (audio) {
        audio.pause()
        audio.removeAttribute('src')
        audio = null
      }
      this.current = null
      this.position = 0
      this.duration = 0
    },
    clock (s) {
      if (!Number.isFinite(s) || s <= 0) return '0:00'
      const m = Math.floor(s / 60)
      return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    },
    destroy () {
      this.stop()
      window.removeEventListener('music-preview-start', this._onOther)
    },
  }
}
