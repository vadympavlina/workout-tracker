/** True for fields where selecting, the context menu and the clipboard must keep working. */
function editable(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null;
  return !!el?.closest('input, textarea, [contenteditable="true"]');
}

/**
 * App-like touch behaviour: no text selection by long press, no "Copy / Look up"
 * callouts and no dragging pictures or links out of the page — so nothing gets
 * copied, moved or dropped by accident. Fields are left alone. (CSS does most of
 * this; the listeners cover browsers that ignore `user-select`.)
 */
export function guardInteractions(doc: Document = document) {
  const block = (e: Event) => {
    if (!editable(e.target)) e.preventDefault();
  };
  doc.addEventListener('selectstart', block);
  doc.addEventListener('contextmenu', block);
  doc.addEventListener('dragstart', block);
}
