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
