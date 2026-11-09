import { useState } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { fileHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import type { FileCategory } from '@shared/types';
import { renderWithProviders } from '@/test/render';

import { MarkdownEditor } from './index';

/**
 * Поле управляемое, поэтому живёт в обвязке со своим состоянием — как
 * в форме, где его ведёт `Controller`. Клиент запросов приносит
 * `renderWithProviders`: картинка уходит мутацией.
 */
function Harness({ initial = '', imageCategory }: { initial?: string; imageCategory?: FileCategory }) {
  const [value, setValue] = useState(initial);

  return (
    <MarkdownEditor
      id="page-text"
      label="Текст раздела"
      value={value}
      onChange={setValue}
      imageCategory={imageCategory}
    />
  );
}

function field() {
  return screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Текст раздела' });
}

/** Спрятанный выбор файла: диалог браузера автоматике не виден, файл кладётся напрямую. */
function fileInput() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');

  if (input === null) throw new Error('выбора файла нет в разметке');

  return input;
}

function chooseFile(name: string, type: string) {
  fireEvent.change(fileInput(), { target: { files: [new File(['x'], name, { type })] } });
}

beforeEach(() => {
  server.use(...fileHandlers());
});

describe('MarkdownEditor, панель', () => {
  /**
   * В jsdom нет `execCommand`, и текст уходит в форму запасным путём —
   * его и проверяем. Выделение после команды ставится заново: иначе
   * управляемое поле унесло бы курсор в конец текста.
   */
  it('размечает выделенное кнопкой и оставляет его выделенным', () => {
    renderWithProviders(<Harness initial="План занятий" />);

    const textarea = field();
    textarea.setSelectionRange(5, 12);
    fireEvent.click(screen.getByRole('button', { name: 'Жирный' }));

    expect(textarea).toHaveValue('План **занятий**');
    expect([textarea.selectionStart, textarea.selectionEnd]).toEqual([7, 14]);
    expect(textarea).toHaveFocus();
  });

  it('ставит в тексте ту разметку, которую увидит посетитель, а не свою', () => {
    renderWithProviders(<Harness initial="Бакалавриат" />);

    field().setSelectionRange(0, 0);
    fireEvent.click(screen.getByRole('button', { name: 'Список' }));

    expect(field()).toHaveValue('- Бакалавриат');
  });

  /** Девять кнопок — одна остановка табуляции, как у rich-text панели. */
  it('пускает в панель одной остановкой табуляции', () => {
    renderWithProviders(<Harness imageCategory="pages" />);

    const toolbar = screen.getByRole('toolbar', { name: 'Форматирование: Текст раздела' });
    const reachable = within(toolbar)
      .getAllByRole('button')
      .filter((button) => button.tabIndex === 0);

    expect(within(toolbar).getAllByRole('button')).toHaveLength(9);
    expect(reachable).toHaveLength(1);
  });
});

describe('MarkdownEditor, предпросмотр', () => {
  it('показывает разметку так, как её покажет сайт', () => {
    renderWithProviders(
      <Harness initial={'## Учебные планы\n\n| Курс | Часы |\n|---|---|\n| 1 | 144 |'} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Предпросмотр' }));

    const preview = screen.getByRole('tabpanel', { name: 'Предпросмотр' });

    expect(within(preview).getByRole('heading', { level: 2, name: 'Учебные планы' })).toBeInTheDocument();
    expect(within(preview).getByRole('table')).toBeInTheDocument();
    // Исходник спрятан, а не снят: выделение в нём переживает поход сюда.
    expect(screen.queryByRole('textbox', { name: 'Текст раздела' })).not.toBeInTheDocument();
  });

  /**
   * `text` бэкенд не санитизирует, и граница «браузер не исполнит чужой
   * HTML» проходит по рендеру. Предпросмотр обязан держать её так же,
   * как страница раздела: модератор не должен увидеть здесь то, чего
   * не увидит посетитель, — и наоборот.
   */
  it('не исполняет сырой HTML — так же, как страница раздела', () => {
    renderWithProviders(<Harness initial={'<img src="x" onerror="alert(1)">'} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Предпросмотр' }));

    expect(screen.getByRole('tabpanel', { name: 'Предпросмотр' }).querySelector('img')).toBeNull();
  });

  it('объясняет пустой предпросмотр', () => {
    renderWithProviders(<Harness />);

    fireEvent.click(screen.getByRole('tab', { name: 'Предпросмотр' }));

    expect(screen.getByText('Текст пуст — показывать нечего.')).toBeInTheDocument();
  });

  it('переключает вкладки стрелками и переносит на них фокус', () => {
    renderWithProviders(<Harness />);

    const source = screen.getByRole('tab', { name: 'Текст' });
    source.focus();
    fireEvent.keyDown(source, { key: 'ArrowRight' });

    const preview = screen.getByRole('tab', { name: 'Предпросмотр' });

    expect(preview).toHaveAttribute('aria-selected', 'true');
    expect(preview).toHaveFocus();
    expect(source).toHaveAttribute('tabindex', '-1');
  });
});

describe('MarkdownEditor, картинки', () => {
  it('загружает картинку в раздел формы и вставляет её адресом из ответа', async () => {
    renderWithProviders(<Harness initial="Схема: " imageCategory="pages" />);

    const textarea = field();
    textarea.setSelectionRange(7, 7);
    chooseFile('scheme.png', 'image/png');

    await waitFor(() => expect(textarea).toHaveValue('Схема: ![](/media/pages/uploaded-1.jpg)'));
    // Курсор — в скобках описания: следующее, что человек набирает, это оно.
    expect(textarea.selectionStart).toBe(9);
  });

  /**
   * Колбэк загрузки запоминает текст на момент выбора файла. Вставка
   * в запомненный текст стёрла бы то, что человек успел напечатать, пока
   * файл летел, — поэтому текст берётся из поля в момент ответа.
   * Затвор держит ответ, пока тест печатает.
   */
  it('не теряет набранное, пока картинка летела', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Хендлер без ответа пропускает запрос дальше — к моку загрузки.
    server.use(
      http.post('*/api/files', async () => {
        await gate;
      }),
    );

    renderWithProviders(<Harness initial="Схема: " imageCategory="pages" />);

    const textarea = field();
    textarea.setSelectionRange(7, 7);
    chooseFile('scheme.png', 'image/png');

    fireEvent.change(textarea, { target: { value: 'Схема: корпуса ' } });
    textarea.setSelectionRange(15, 15);
    release();

    await waitFor(() =>
      expect(textarea).toHaveValue('Схема: корпуса ![](/media/pages/uploaded-1.jpg)'),
    );
  });

  it('отказывает негодному файлу до загрузки и не трогает текст', async () => {
    renderWithProviders(<Harness initial="Схема: " imageCategory="pages" />);

    chooseFile('anim.gif', 'image/gif');

    expect(await screen.findByText('Подходят только JPEG и PNG.')).toBeInTheDocument();
    expect(field()).toHaveValue('Схема: ');
  });

  it('без раздела хранилища не предлагает картинку вовсе', () => {
    renderWithProviders(<Harness />);

    expect(screen.queryByRole('button', { name: 'Картинка' })).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});
