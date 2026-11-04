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
    async toggle (music) {
      if (this.playing) return this.stop()
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
