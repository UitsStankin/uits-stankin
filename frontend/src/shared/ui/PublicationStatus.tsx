interface PublicationStatusProps {
  /** Признак публикации — поле `display` контракта. */
  display: boolean;
  /**
   * Подпись опубликованного — в роде того, что опубликовано: запись
   * и конференция «Опубликована», достижение «Опубликовано». Черновик
   * у всех один.
   */
  publishedLabel: string;
}

/**
 * Состояние публикации в строке таблицы админки: опубликовано или черновик.
 *
 * Словами, а не значком: «опубликована» и «черновик» — это то, из-за чего
 * запись видно или не видно на сайте, и угадывать это по цвету точки
 * модератор не должен. Цвет помогает пробежать колонку глазами, но ничего
 * не сообщает сам по себе.
 *
 * Жил ячейкой в таблице новостей (F-43) и переехал сюда, когда та же
 * колонка понадобилась конференциям и достижениям (F-45): три копии одной
 * плашки — это три разных оттенка серого в соседних разделах.
 */
export function PublicationStatus({ display, publishedLabel }: PublicationStatusProps) {
  return display ? (
    <span className="whitespace-nowrap rounded bg-success/10 px-2 py-1 text-sm text-success">
      {publishedLabel}
    </span>
  ) : (
    <span className="whitespace-nowrap rounded bg-gray-300 px-2 py-1 text-sm text-text-default">
      Черновик
    </span>
  );
}
