import { TELEGRAM_CHAT_URL } from '@shared/config/contacts';

/**
 * Чат кафедры под текстом контактов — перенос блока `.social-icons`
 * из оригинала.
 *
 * ### Почему у ссылки появилась подпись
 *
 * В оригинале это была голая картинка 30×30 с `alt="telegram-link"`, то есть
 * для диктора — «ссылка telegram-link», а для зрячего — иконка без ответа
 * на вопрос, куда она ведёт: в канал, в бота, в личку заведующего. Здесь
 * ссылка называет себя словами, а логотип остаётся украшением
 * (`aria-hidden`). Это не переделка ради вкуса: страница контактов
 * существует ровно затем, чтобы человек нашёл способ связи, и подпись —
 * её содержание.
 *
 * ### Почему ссылка повторяет подвал
 *
 * Та же ссылка висит иконкой в подвале каждой страницы, включая эту,
 * и на контактах их получается две. Так и надо: в подвал за контактами
 * не ходят — туда попадают, домотав до низа. Адрес у обеих общий
 * (`shared/config/contacts.ts`), разъехаться им нечем.
 *
 * Логотип бренда картинкой, а не иконкой lucide: телеграма в наборе нет,
 * а подменять его самолётиком `Send` — терять узнаваемость. Тот же выбор
 * и по той же причине сделан в подвале.
 */
export function DepartmentChat() {
  return (
    <section className="rounded bg-white p-6 shadow-sm md:p-8">
      <h2 className="mb-3 text-h6 text-text-heading">Связаться с кафедрой</h2>

      <a
        href={TELEGRAM_CHAT_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-3 text-primary transition-opacity hover:opacity-80"
      >
        <img src="/assets/images/telegram.png" alt="" aria-hidden className="h-8.75 w-8.75" />
        Телеграм-чат кафедры
      </a>
    </section>
  );
}
