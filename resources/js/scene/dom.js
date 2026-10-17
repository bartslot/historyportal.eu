/** Element with classes and TEXT (never markup): untrusted strings go through textContent. */
export function el (tag, className = '', text = null) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = String(text)
  return node
}
