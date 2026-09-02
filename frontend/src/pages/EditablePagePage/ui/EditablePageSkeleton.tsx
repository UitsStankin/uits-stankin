/**
 * Заглушка раздела на время первой загрузки.
 *
 * У блоков главной скелета нет намеренно — там блок необязателен и его
 * высота неизвестна. Здесь раздел — всё содержимое страницы, и без заглушки
 * на медленной сети под заголовком лежала бы пустота, неотличимая
 * от незаполненного раздела. Три строки — минимальная честная догадка:
 * ровно так же угадывает высоту текста скелет статьи новости.
 */
export function EditablePageSkeleton() {
  return (
    <div role="status" className="animate-pulse rounded bg-white p-6 shadow-sm md:p-8">
      {/* Серые прямоугольники диктору ничего не говорят — для него
          загрузка проговаривается словами. */}
      <span className="sr-only">Загрузка раздела</span>

      <div aria-hidden className="flex flex-col gap-4">
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}
