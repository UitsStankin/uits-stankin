import { describe, expect, it } from 'vitest';

import { ApiError } from '@shared/api';

import {
  MAX_IMPORT_BYTES,
  checkImportFile,
  confirmText,
  countText,
  importErrorMessage,
} from './importText';

function fileOfSize(size: number, name = 'schedule.pdf') {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

function apiError(status: number, detail = '') {
  return new ApiError({ status, title: 'x', detail });
}

describe('countText', () => {
  it('склоняет по числу, а не «одна или много»', () => {
    expect(countText('lessons', 1)).toBe('1 занятие');
    expect(countText('lessons', 3)).toBe('3 занятия');
    expect(countText('lessons', 12)).toBe('12 занятий');
    expect(countText('exams', 21)).toBe('21 экзамен');
    expect(countText('exams', 14)).toBe('14 экзаменов');
  });
});

describe('checkImportFile', () => {
  it('пропускает файл до пяти мегабайт включительно', () => {
    expect(checkImportFile(fileOfSize(MAX_IMPORT_BYTES))).toBeNull();
  });

  it('отклоняет файл больше пяти мегабайт, называя его', () => {
    expect(checkImportFile(fileOfSize(MAX_IMPORT_BYTES + 1, 'big.pdf'))).toBe(
      'Файл «big.pdf» больше 5 МБ — такой сервер не примет.',
    );
  });

  it('отклоняет пустой файл', () => {
    expect(checkImportFile(fileOfSize(0, 'empty.pdf'))).toBe('Файл «empty.pdf» пуст.');
  });
});

describe('confirmText', () => {
  it('называет, сколько записей пропадёт', () => {
    expect(confirmText('lessons', 'весна.pdf', 24)).toBe(
      'Текущее расписание пар (24 занятия) будет удалено и заменено разобранным из файла «весна.pdf». Вернуть прежнее можно только повторной загрузкой прежнего файла.',
    );
  });

  it('не пугает потерей, когда терять нечего', () => {
    expect(confirmText('exams', 'сессия.pdf', 0)).toBe(
      'Сейчас расписание экзаменов не загружено. Оно будет заполнено разобранным из файла «сессия.pdf».',
    );
  });

  it('оговаривается, когда текущее прочитать не удалось', () => {
    expect(confirmText('lessons', 'a.pdf', null)).toMatch(
      /^Текущее расписание пар, если оно загружено, будет удалено/,
    );
  });
});

describe('importErrorMessage', () => {
  it('у 400 показывает причину словами сервера и ставит точку', () => {
    expect(
      importErrorMessage('lessons', apiError(400, 'в PDF не найдено ни одной таблицы расписания')),
    ).toBe(
      'Файл не принят: в PDF не найдено ни одной таблицы расписания. Расписание пар осталось прежним.',
    );
  });

  it('не удваивает точку, если сервер её поставил', () => {
    expect(importErrorMessage('exams', apiError(400, 'Файл пуст.'))).toBe(
      'Файл не принят: Файл пуст. Расписание экзаменов осталось прежним.',
    );
  });

  it('у 503 говорит, что дело не в файле', () => {
    const text = importErrorMessage('lessons', apiError(503, 'parser timeout'));
    expect(text).toMatch(/недоступен — дело не в файле/);
    // Диагностика 5xx наружу не выходит.
    expect(text).not.toMatch(/parser timeout/);
  });

  it('у 409 просит подождать', () => {
    expect(importErrorMessage('exams', apiError(409, 'Conflict'))).toMatch(
      /прямо сейчас загружает кто-то ещё/,
    );
  });

  it('при обрыве не обещает, что расписание осталось прежним', () => {
    const text = importErrorMessage('lessons', apiError(0, 'Network Error'));
    expect(text).toMatch(/неизвестно/);
    expect(text).not.toMatch(/осталось прежним/);
  });
});
