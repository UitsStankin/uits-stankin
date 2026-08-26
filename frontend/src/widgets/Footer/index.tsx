import { cn } from '@shared/lib/cn';

interface FooterProps {
  className?: string;
}

/** Чат кафедры. Ссылка из footer.component.html оригинала. */
const TELEGRAM_URL = 'https://t.me/+WQVM050GSEFmZWUy';

/**
 * Подвал — перенос footer из оригинала.
 *
 * Здесь нет ни model/, ни ui/: разделять нечего, у подвала нет ни состояния,
 * ни логики, а собирать — нечего собирать. Применять структуру механически
 * было бы церемонией ради церемонии.
 *
 * Размеры из SCSS оригинала: высота $footer-height 4.0625rem, отступы
 * $layout-content-gutter, граница сверху $border-color, шрифт 90%,
 * иконка телеграма 35x35.
 */
export default function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('px-gutter text-[90%]', className)}>
      {/* min-h, а не h: на узком экране строка переносится в две, и жёсткая
          высота обрезала бы её. */}
      <div className="flex min-h-footer items-center justify-between gap-3 border-t border-default py-2">
        <p className="text-text-default">
          Кафедра управления и информатики в технических системах.{' '}
          {/* В оригинале год зашит числом 2025. Считаем от текущей даты:
              устаревший год в подвале выглядит как заброшенный сайт. */}
          {new Date().getFullYear()}
        </p>

        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Телеграм-чат кафедры"
          // shrink-0 обязателен: без него flex сплющивал иконку по ширине,
          // когда длинная строка слева переносилась в две.
          className="shrink-0 transition-opacity hover:opacity-80"
        >
          {/* Логотип бренда, а не абстрактная иконка: в lucide телеграма нет,
              а подменять его самолётиком Send — терять узнаваемость. */}
          <img src="/assets/images/telegram.png" alt="" className="h-8.75 w-8.75" aria-hidden />
        </a>
      </div>
    </footer>
  );
}
