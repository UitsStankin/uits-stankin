import { Search, X } from 'lucide-react';

import { cn } from '@shared/lib';

interface PostgraduateSearchProps {
  /** Набранное в поле — не то же, что ушедшее в адрес: между ними пауза. */
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  /**
   * Сколько записей нашлось. `null` — поиска нет либо ответа ещё не было:
   * в обоих случаях сообщать нечего.
   */
  foundCount: number | null;
}

/**
 * Поиск по таблице аспирантов. Чистый: что набрано и что найдено —
 * приходит пропсами, пауза перед запросом живёт в модели.
 *
 * Поле вернулось на страницу вместе с серверным поиском (`?q=`, T-78
 * по заявке B-3). В F-34 его не было намеренно: ручка отдавала двадцать
 * записей из скольких-то, и поле фильтровало бы открытую страницу,
 * называясь при этом поиском по разделу.
 *
 * ### Подпись
 *
 * Заголовок поля скрыт, а плейсхолдер перечисляет колонки, по которым
 * ищут. Это не «плейсхолдер вместо подписи» — имя полю даёт `label`,
 * и диктор его читает; видимой подписи нет потому, что над таблицей
 * она заняла бы строку, ничего не добавив к иконке лупы. Перечисление
 * же добавляет: поиск идёт сразу по пяти колонкам, включая год
 * поступления и руководителя, и догадаться об этом по слову «Поиск»
 * нельзя.
 *
 * `type="search"` — ради браузера и клавиатуры: на телефоне он даёт
 * клавишу «искать» вместо «ввод». Свой крестик очистки при этом всё равно
 * нужен: родной рисует не всякий браузер (в Firefox его нет вовсе),
 * до него нельзя добраться табуляцией, и диктор его не называет.
 * А родной — убран: без этого в WebKit их два подряд, и правый
 * (наш, единственный работающий с клавиатуры) читается как лишний.
 */
export function PostgraduateSearch({
  value,
  onChange,
  onClear,
  foundCount,
}: PostgraduateSearchProps) {
  return (
    <div role="search" className="flex flex-col gap-1.5">
      <label htmlFor="postgraduate-search" className="sr-only">
        Поиск по таблице аспирантов
      </label>

      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
        />

        <input
          id="postgraduate-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Фамилия, тема, специальность, год, руководитель"
          className={cn(
            // pr-10 держит место под свою кнопку очистки, pl-9 — под лупу.
            'w-full rounded border border-gray-300 bg-white py-2 pr-10 pl-9',
            'text-base text-text-default transition-colors placeholder:text-text-muted',
            'focus:border-primary focus:ring-0',
            // Родные украшения поля поиска в WebKit: крестик очистки
            // и «лупа» слева. Оба дублируют то, что уже нарисовано рядом.
            '[&::-webkit-search-cancel-button]:appearance-none',
            '[&::-webkit-search-decoration]:appearance-none',
          )}
        />

        {value !== '' && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Очистить поиск"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-text-muted transition-colors hover:text-text-default"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      {/*
        Число найденного — вслух тоже. Таблица под полем меняется молча,
        и без этой строки читающий с экрана узнаёт об изменении, только
        добравшись до таблицы и пересчитав строки. `role="status"`
        объявляет её вежливо, не перебивая набор.

        Место под строку держится всегда — иначе появление числа
        подталкивает таблицу вниз под руками у набирающего.
      */}
      <p role="status" className="min-h-5 text-sm text-text-muted">
        {foundCount !== null && `Найдено аспирантов: ${foundCount}`}
      </p>
    </div>
  );
}
