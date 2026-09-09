export interface RichTextEditorProps {
  /** Идентификатор поля: от него считаются `id` подписи и сообщения об ошибке. */
  id: string;
  label: string;
  /** Готовый HTML. Пустое поле — это `''`, а не `<p></p>`. */
  value: string;
  onChange: (html: string) => void;
  /** Текст ошибки под полем; `undefined` — ошибки нет. */
  error?: string;
  /** Идёт сохранение: править нельзя, панель погашена. */
  disabled?: boolean;
}
