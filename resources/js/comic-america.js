/**
 * ComicAmerica letters (brand-kit.css .lp-comic-america): the words twice, once as the fill (the
 * inner span) and once in data-t for the outline and the drop behind it. Stage text and sound
 * words build it here; the player's Blade writes the same markup with Alpine.
 */
export const COMIC_AMERICA = 'lp-comic-america'

/** The lettered words as an element. textContent and an attribute, never markup: they are lesson copy. */
export function comicAmerica (text) {
  const outer = document.createElement('span')
  outer.className = COMIC_AMERICA
  outer.dataset.t = text
  const fill = document.createElement('span')
  fill.textContent = text
  outer.appendChild(fill)
  return outer
}

/** Letter `host` in ComicAmerica, replacing what it held. */
export function letterComicAmerica (host, text) {
  host.replaceChildren(comicAmerica(text))
}
