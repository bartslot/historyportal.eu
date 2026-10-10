// Typed crew text: the full text once for screen readers, the typed part (with a caret) hidden from them.
export function TypedView({ full, shown, typing }: { full: string; shown: string; typing: boolean }) {
  if (!typing && shown === full) return <>{full}</>
  return (
    <>
      <span className="sr-only">{full}</span>
      <span aria-hidden="true">{shown}{typing && <span className="crew-caret" />}</span>
    </>
  )
}
