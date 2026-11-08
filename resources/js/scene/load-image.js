/**
 * A picture whose pixels can be read. That needs a same-origin image, and a /storage URL carries APP_URL's host, which is
 * not always the page's own (a second local server, say): such a one is loaded from this origin instead.
 */
export async function loadImage (from) {
  const u = new URL(from, location.href)
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = u.origin !== location.origin && u.pathname.startsWith('/storage/') ? location.origin + u.pathname : u.href
  await image.decode()
  return image
}
