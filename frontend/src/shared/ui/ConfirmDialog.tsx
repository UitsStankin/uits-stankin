import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  /** Что именно произойдёт: «Дисциплина „Базы данных“ будет удалена». */
  description: string;
  /** Подпись кнопки действия — «Удалить», а не «ОК». */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Запрос в полёте: кнопки заблокированы, окно не закрывается. */
  isPending?: boolean;
  /**
   * Безопасный путь вместо необратимого — «В архив» рядом с «Удалить».
   * Кнопка спокойного цвета, между отменой и действием: окно, которое
   * только пугает, не помогает выбрать, а штатный путь должен быть
   * под рукой ровно там, где человек собрался сделать нештатный.
   */
  alternative?: { label: string; onClick: () => void };
}

/**
 * Подтверждение необратимого действия.
 *
 * Своё окно, а не `window.confirm`: тот блокирует вкладку целиком, его
 * нельзя оставить открытым на время запроса и нечем показать, что удаление
 * отклонено (`409` от бэкенда, когда дисциплина кому-то назначена).
 * Внешний вид у него к тому же браузерный — посреди портала это выглядит
 * как сообщение от вируса.
 *
 * Спрашивать обязательно: удаление из таблицы делается одной кнопкой
 * в строке, промахнуться по соседней строке проще простого, а отмены
 * в контракте нет — восстановить запись нечем.
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  isPending = false,
  alternative,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel} placement="center" isBusy={isPending}>
      <p className="text-base text-text-default">{description}</p>

      <div className="mt-gutter flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded border border-default px-4 py-2 text-base font-bold text-text-default transition-colors hover:bg-background-default disabled:opacity-50"
        >
          Отмена
        </button>

        {alternative && (
          <button
            type="button"
            onClick={alternative.onClick}
            disabled={isPending}
            className="rounded border border-primary px-4 py-2 text-base font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            {alternative.label}
          </button>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="rounded bg-danger px-4 py-2 text-base font-bold text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
        >
          {isPending ? 'Удаляем…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
