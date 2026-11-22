import { Link } from 'react-router';

import { teacherRoute } from '@shared/config/routes';
import ConfirmDialog from '@shared/ui/ConfirmDialog';

import { type ImportKind, KIND_TITLE, countText } from './lib/importText';
import { type CurrentState, useScheduleImport } from './model/useScheduleImport';
import { ImportRow } from './ui/ImportRow';

const KINDS: readonly ImportKind[] = ['lessons', 'exams'];

/**
 * Сборка фичи: блок «Расписание из PDF» на форме карточки ППС
 * у модератора — два документа, одно окно подтверждения.
 *
 * Расписание не правится по полям — только заменяется загрузкой PDF
 * целиком (docs/API.md, «Импорт расписания преподавателя»), поэтому
 * формы здесь нет, и к «Сохранить» карточки блок отношения не имеет:
 * загрузка срабатывает сразу, своей ручкой.
 *
 * В оригинале кнопка импорта стояла на публичной карточке преподавателя
 * и была видна модератору поверх календаря. Здесь она в админке: правка
 * на публичных страницах портала не заведена нигде, и заводить её ради
 * одной кнопки значило бы впустить в публичный код проверку ролей.
 * Посмотреть загруженное — ссылкой на ту самую карточку.
 *
 * Файл лежит в корне фичи, а не в `ui/`: это сборка, как `SubjectDialog`.
 */
export function ScheduleImport({ teacherId }: { teacherId: number }) {
  const model = useScheduleImport(teacherId);

  return (
    <section
      aria-labelledby="schedule-import-title"
      className="flex flex-col gap-4 rounded bg-white px-6 py-4 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="schedule-import-title" className="text-h5 text-text-heading">
          Расписание из PDF
        </h2>
        <Link
          to={teacherRoute(teacherId)}
          className="text-base text-primary underline-offset-2 hover:underline"
        >
          Посмотреть на сайте
        </Link>
      </div>

      <p className="text-sm text-text-muted">
        Загрузка заменяет документ целиком: прежние записи удаляются, вместо них встают
        разобранные из файла. Файлы пар и экзаменов разные и друг друга не заменяют.
      </p>

      <div className="flex flex-col">
        {KINDS.map((kind) => (
          <ImportRow
            key={kind}
            title={KIND_TITLE[kind]}
            currentText={currentText(kind, model.current[kind])}
            outcome={model.outcomes[kind]}
            isPending={model.pendingKind === kind}
            isDisabled={model.isImporting}
            onSelect={(file) => model.selectFile(kind, file)}
          />
        ))}
      </div>

      {model.confirmation && (
        <ConfirmDialog
          title={`Заменить ${KIND_TITLE[model.confirmation.kind].toLowerCase()}?`}
          description={model.confirmation.description}
          confirmLabel="Заменить"
          pendingLabel="Разбираем PDF…"
          isPending={model.isImporting}
          onConfirm={model.confirm}
          onCancel={model.cancel}
        />
      )}
    </section>
  );
}

function currentText(kind: ImportKind, current: CurrentState): string {
  switch (current.status) {
    case 'loading':
      return 'Проверяем, что загружено…';
    case 'unknown':
      return 'Не удалось узнать, что загружено сейчас.';
    case 'ready':
      return current.count === 0
        ? 'Сейчас не загружено.'
        : `Сейчас загружено: ${countText(kind, current.count)}.`;
  }
}
