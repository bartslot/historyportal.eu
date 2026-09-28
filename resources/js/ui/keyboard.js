/**
 * What a keyboard shortcut is allowed to take, app-wide.
 *
 * Every global shortcut in the editor has to answer the same two questions before it does
 * anything: is someone typing, and is this really my key? Those answers were written out longhand
 * at each shortcut — the wizard's undo and its Delete both carry their own copy of the same
 * regex — and a guard that exists in three slightly different versions is a guard that will one
 * day be right in two places.
 *
 * Pure and DOM-free enough to test: both functions read properties off whatever they are handed.
 */

/**
 * True when this element is somewhere a person is putting words.
 *
 * `isContentEditable` covers a caret inside a rich-text box, including one nested several
 * elements deep, but jsdom does not implement it and neither does a detached node — so the
 * attribute is checked too. `contenteditable="false"` is an explicit opt OUT and must not match.
 */
export const isTypingTarget = (target) => {
  if (!target || typeof target !== 'object') return false
  if (target.isContentEditable) return true

  const tag = String(target.tagName ?? '').toUpperCase()
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true

  if (typeof target.closest !== 'function') return false
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

/**
 * True when a keydown is a bare Space that this app may treat as play/pause.
 *
 * Space is the transport key everywhere — YouTube, Keynote, Premiere, and the lesson player,
 * which already spends it this way — so the editor's timeline owes teachers the same reflex.
 * It is refused when:
 *
 *   - the caret is in a field, because a space is a space there and the panel is full of them;
 *   - a modifier is held, because ⌘Space belongs to the operating system;
 *   - the key is REPEATING, because holding Space would otherwise strobe play and pause;
 *   - something upstream already called preventDefault, because it got there first.
 *
 * Note what this does NOT do: it never calls preventDefault itself. Space scrolls the page, and a
 * handler that cancels the scroll before deciding whether it will act has broken scrolling for
 * everyone in exchange for nothing. The caller cancels it only once it has actually played.
 */
export const isPlayPauseKey = (event) => {
  if (!event || event.code !== 'Space') return false
  if (event.repeat || event.defaultPrevented) return false
  if (event.metaKey || event.ctrlKey || event.altKey) return false

  return !isTypingTarget(event.target)
}
