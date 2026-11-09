import { describe, expect, it } from 'vitest';

import { applyMarkdownCommand, insertImage, type TextSelection } from './markdownCommands';

/**
 * Текст с выделением в одной строке: `[` и `]` отмечают его границы,
 * `|` — курсор. Так проверка читается как то, что видит человек в поле,
 * а не как пара чисел.
 */
function marked(text: string): TextSelection {
  const caret = text.indexOf('|');

  if (caret !== -1) {
    const value = text.replace('|', '');

    return { value, start: caret, end: caret };
  }

  const start = text.indexOf('[');
  const end = text.indexOf(']') - 1;

  return { value: text.replace('[', '').replace(']', ''), start, end };
}

/** Обратное превращение: результат команды — в ту же запись со скобками. */
function show({ value, start, end }: TextSelection): string {
  if (start === end) return `${value.slice(0, start)}|${value.slice(start)}`;

  return `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`;
}

function run(command: Parameters<typeof applyMarkdownCommand>[0], text: string) {
  return show(applyMarkdownCommand(command, marked(text)));
}

describe('разметка внутри строки', () => {
  it('оборачивает выделение и оставляет его выделенным', () => {
    expect(run('bold', 'План [занятий] на семестр')).toBe('План **[занятий]** на семестр');
    expect(run('italic', 'План [занятий] на семестр')).toBe('План _[занятий]_ на семестр');
  });

  it('без выделения вставляет выделенную заглушку', () => {
    expect(run('bold', 'План |')).toBe('План **[жирный текст]**');
  });

  /** Повторное нажатие исправляет промах, а не наращивает звёздочки. */
  it('второе нажатие по тому же выделению снимает разметку', () => {
    expect(run('bold', 'План **[занятий]** на семестр')).toBe('План [занятий] на семестр');
  });

  /**
   * `**слово **` CommonMark жирным не считает: закрывающие звёздочки после
   * пробела не закрывают. Двойной щелчок в части браузеров захватывает
   * пробел — он должен остаться снаружи.
   */
  it('оставляет пробелы по краям выделения снаружи разметки', () => {
    expect(run('bold', 'План [занятий ]на семестр')).toBe('План **[занятий]** на семестр');
  });

  /** Курсив подчёркиванием: звёздочки жирного по краям — не курсив. */
  it('не принимает жирный за курсив при снятии', () => {
    expect(run('italic', '**[слово]**')).toBe('**_[слово]_**');
  });
});

describe('ссылка', () => {
  it('делает ссылкой выделенный текст и выделяет адрес', () => {
    expect(run('link', 'Смотрите [учебный план]')).toBe('Смотрите [учебный план]([https://])');
  });

  it('без выделения выделяет текст ссылки', () => {
    expect(run('link', 'Смотрите |')).toBe('Смотрите [[текст ссылки]](https://)');
  });
});

describe('разметка начала строки', () => {
  it('ставит заголовок строке, где стоит курсор, не сдвигая курсор в тексте', () => {
    expect(run('heading2', 'Уче|бные планы')).toBe('## Уче|бные планы');
  });

  it('второе нажатие снимает заголовок', () => {
    expect(run('heading2', '## Уче|бные планы')).toBe('Уче|бные планы');
  });

  /** Строка — что-то одно: заголовок третьего уровня вместо второго, а не оба. */
  it('меняет уровень заголовка, а не добавляет второй', () => {
    expect(run('heading3', '## Уче|бные планы')).toBe('### Уче|бные планы');
  });

  it('размечает списком все строки выделения, пропуская пустые', () => {
    const value = 'Бакалавриат\n\nМагистратура\nАспирантура';
    const selection: TextSelection = { value, start: 0, end: value.length };

    expect(applyMarkdownCommand('bulletList', selection).value).toBe(
      '- Бакалавриат\n\n- Магистратура\n- Аспирантура',
    );
  });

  it('нумерует строки по порядку', () => {
    const selection: TextSelection = { value: 'Первый\nВторой\nТретий', start: 0, end: 20 };

    expect(applyMarkdownCommand('orderedList', selection).value).toBe(
      '1. Первый\n2. Второй\n3. Третий',
    );
  });

  it('снимает список, когда размечены все строки выделения', () => {
    const selection: TextSelection = { value: '- Первый\n- Второй', start: 0, end: 17 };

    expect(applyMarkdownCommand('bulletList', selection).value).toBe('Первый\nВторой');
  });

  /** Мышь, протянутая до левого края, захватывает перевод строки — это не следующая строка. */
  it('не трогает строку, на начале которой кончается выделение', () => {
    const selection: TextSelection = { value: 'Цитата\nДальше текст', start: 0, end: 7 };

    expect(applyMarkdownCommand('quote', selection).value).toBe('> Цитата\nДальше текст');
  });

  it('на пустой строке ставит разметку и курсор после неё', () => {
    expect(run('bulletList', 'Текст\n|')).toBe('Текст\n- |');
  });

  /** Курсор в самом начале текста, перед переводом строки, — на первой строке. */
  it('находит первую строку, когда текст начинается с перевода строки', () => {
    const selection: TextSelection = { value: '\nТекст', start: 0, end: 0 };

    expect(applyMarkdownCommand('heading2', selection).value).toBe('## \nТекст');
  });
});

describe('картинка', () => {
  it('вставляет картинку с пустым описанием и ставит курсор в скобки описания', () => {
    expect(show(insertImage(marked('Схема: |'), '/media/pages/scheme.png'))).toBe(
      'Схема: ![|](/media/pages/scheme.png)',
    );
  });

  it('делает описанием выделенный текст', () => {
    expect(show(insertImage(marked('[Схема корпуса]'), '/media/pages/scheme.png'))).toBe(
      '![Схема корпуса](/media/pages/scheme.png)|',
    );
  });
});
