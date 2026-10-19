import type { Editor } from '@tiptap/react';

/**
 * Куда в документе встанет блок, брошенный на позицию `pos`.
 *
 * Попали в абзац — блок встаёт рядом с ним: перед абзацем, если в первую
 * половину, и после, если во вторую. Резать абзац посреди слова ради фото
 * незачем. Попали между блоками — позиция остаётся как есть.
 */
export function blockPosition(editor: Editor, pos: number): number {
  const clamped = Math.min(Math.max(pos, 0), editor.state.doc.content.size);
  const resolved = editor.state.doc.resolve(clamped);

  if (!resolved.parent.isTextblock) return clamped;

  return clamped - resolved.start() <= resolved.parent.content.size / 2
    ? resolved.before()
    : resolved.after();
}
