import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RichTextEditor } from './index';
// Ленивый кусок — в кэш модулей до начала тестов: иначе первый `findBy`
// ждёт разбора TipTap, а не рендера, и на раннере CI не укладывается
// в секунду. Разбор — в `pages/PersonalPage/index.test.tsx`.
import './Editor';

/**
 * Поле с редактором вместе с формой, в которой оно живёт: значение
 * хранит вызывающий, поле получает его пропсом и возвращает изменённым.
 * Так проверяется то, ради чего редактор написан, — что уедет в базу.
 *
 * `<output>` рядом — способ прочитать это значение из теста, не заглядывая
 * внутрь компонента.
 */
function Field({
  initial = '',
  error,
  disabled,
  onSubmit,
}: {
  initial?: string;
  error?: string;
  disabled?: boolean;
  onSubmit?: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <form onSubmit={onSubmit}>
      <RichTextEditor
        id="content"
        label="Содержание"
        value={value}
        onChange={setValue}
        error={error}
        disabled={disabled}
      />
      <output data-testid="saved">{value}</output>
    </form>
  );
}

/**
 * Рендер с ожиданием: редактор грузится отдельным куском (`lazy`),
 * и до его подгрузки на месте поля стоит заглушка.
 */
async function renderField(props: Parameters<typeof Field>[0] = {}) {
  render(<Field {...props} />);

  return await screen.findByRole('textbox', { name: 'Содержание' });
}

/** Область ввода: `contenteditable`, объявленный полем ввода для диктора. */
function editorArea() {
  return screen.getByRole('textbox', { name: 'Содержание' });
}

/** Что уедет в тело запроса. */
function savedHtml() {
  return screen.getByTestId('saved').textContent ?? '';
}

function toolbarButton(name: string) {
  return screen.getByRole('button', { name });
}

/** Выделить всё — тем же сочетанием, что и в браузере. */
function selectAll() {
  fireEvent.keyDown(editorArea(), { key: 'a', ctrlKey: true });
}

describe('RichTextEditor, разметка', () => {
  it('открывает разметку разметкой, а не исходником', async () => {
    await renderField({ initial: '<p>Кафедра <strong>УИТС</strong></p>' });

    // Текст тегами модератор видел в textarea до F-41; редактор должен
    // показывать результат.
    expect(editorArea().querySelector('strong')).toHaveTextContent('УИТС');
    expect(editorArea()).not.toHaveTextContent('<strong>');
  });

  it('жирный уезжает тегом, а не классом', async () => {
    await renderField({ initial: '<p>Кафедра</p>' });

    selectAll();
    fireEvent.click(toolbarButton('Жирный'));

    expect(savedHtml()).toBe('<p><strong>Кафедра</strong></p>');
  });

  it('заголовок из панели — второго уровня: h1 на странице занят названием записи', async () => {
    await renderField({ initial: '<p>Порядок приёма</p>' });

    selectAll();
    fireEvent.click(toolbarButton('Заголовок'));

    expect(savedHtml()).toBe('<h2>Порядок приёма</h2>');
  });
});

/**
 * Главное в редакторе — согласие с санитайзером бэкенда: что редактор
 * умеет, то обязано пережить сохранение, а что лежит в базе, то обязано
 * открыться без потерь. Обе половины нарушаются молча, поэтому проверены
 * поимённо.
 */
describe('RichTextEditor, согласие с белым списком бэкенда', () => {
  it('зачёркивает тегом strike: тега s в белом списке jsoup нет', async () => {
    await renderField({ initial: '<p>Отменено</p>' });

    selectAll();
    fireEvent.click(toolbarButton('Зачёркнутый'));

    // `<s>` бэкенд развернул бы, оставив текст: кнопка работала бы в поле
    // и не работала на странице.
    expect(savedHtml()).toBe('<p><strike>Отменено</strike></p>');
    expect(savedHtml()).not.toContain('<s>');
  });

  it('старое зачёркивание из <s> открывается и сохраняется уже как strike', async () => {
    await renderField({ initial: '<p><s>Старое</s> объявление</p>' });

    selectAll();
    fireEvent.click(toolbarButton('Жирный'));

    expect(savedHtml()).toContain('<strike>');
    expect(savedHtml()).not.toContain('<s>');
  });

  it('не теряет картинку, которой в тексте не касались', async () => {
    // Разбор картинок держится в схеме ради этого: кнопки вставки ещё нет
    // (F-42), а `<img>` в перенесённых текстах уже есть. Без расширения
    // правка заголовка уносила бы иллюстрации.
    await renderField({ initial: '<p>Фото с защиты</p><img src="/media/foto.jpg">' });

    selectAll();
    fireEvent.click(toolbarButton('Курсив'));

    expect(savedHtml()).toContain('<img src="/media/foto.jpg">');
  });

  it('не теряет верхний и нижний индекс', async () => {
    await renderField({ initial: '<p>H<sub>2</sub>O и м<sup>2</sup></p>' });

    selectAll();
    fireEvent.click(toolbarButton('Жирный'));

    expect(savedHtml()).toContain('<sub>2</sub>');
    expect(savedHtml()).toContain('<sup>2</sup>');
  });

  it('не предлагает того, что бэкенд вырежет', async () => {
    await renderField();

    // Цвет, шрифт, выравнивание и видео были в панели старого Quill,
    // но `Safelist.relaxed()` не разрешает ни `style`, ни `class`,
    // ни `<iframe>`: кнопка красила бы текст в поле и не красила
    // на странице.
    for (const name of ['Цвет', 'Шрифт', 'Выравнивание', 'Видео', 'Разделитель']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });
});

describe('RichTextEditor, пустое поле', () => {
  it('отдаёт пустую строку, а не абзац из ничего', async () => {
    await renderField({ initial: '<p>Текст</p>' });

    selectAll();
    fireEvent.keyDown(editorArea(), { key: 'Backspace' });

    // `<p></p>` в необязательном поле не превратился бы в `null`
    // на границе запроса, и в базе осталось бы «заполнено пустотой».
    expect(savedHtml()).toBe('');
  });
});

describe('RichTextEditor, ссылки', () => {
  function openLinkBar() {
    fireEvent.click(toolbarButton('Ссылка'));

    return screen.getByLabelText('Адрес');
  }

  it('вешает ссылку на выделенный текст', async () => {
    await renderField({ initial: '<p>Новости</p>' });

    selectAll();
    const address = openLinkBar();
    fireEvent.change(address, { target: { value: '/about/news' } });
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    expect(savedHtml()).toBe('<p><a href="/about/news">Новости</a></p>');
  });

  it('дописывает схему адресу, набранному без неё', async () => {
    await renderField({ initial: '<p>Институт</p>' });

    selectAll();
    const address = openLinkBar();
    fireEvent.change(address, { target: { value: 'stankin.ru' } });
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    // https, а не http: портал живёт по https, и ссылка не должна уводить
    // на незашифрованный адрес.
    expect(savedHtml()).toContain('href="https://stankin.ru"');
  });

  it('отказывает схеме, которую бэкенд снимет со ссылки, и объясняет почему', async () => {
    await renderField({ initial: '<p>Телефон</p>' });

    selectAll();
    const address = openLinkBar();
    fireEvent.change(address, { target: { value: 'tel:+74959721920' } });
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    expect(screen.getByText(/Такой адрес не сохранится/)).toBeInTheDocument();
    // Ссылка не поставлена: молча потерять `href` хуже, чем отказать.
    expect(savedHtml()).toBe('<p>Телефон</p>');
    expect(address).toHaveAttribute('aria-invalid', 'true');
  });

  it('Enter в адресе ставит ссылку, а не отправляет форму', async () => {
    // Поле редактора стоит внутри формы записи, и необработанный Enter
    // сохранил бы её вместо того, чтобы поставить ссылку.
    const onSubmit = vi.fn();
    await renderField({ initial: '<p>Новости</p>', onSubmit });

    selectAll();
    const address = openLinkBar();
    fireEvent.change(address, { target: { value: '/about/news' } });
    fireEvent.keyDown(address, { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(savedHtml()).toContain('href="/about/news"');
  });

  it('после «Применить» возвращает курсор в текст', async () => {
    // Иначе фокус остаётся на кнопке, которой больше нет на экране, —
    // то есть на `body`: следующий таб идёт от шапки страницы.
    const area = await renderField({ initial: '<p>Новости</p>' });

    selectAll();
    const address = openLinkBar();
    fireEvent.change(address, { target: { value: '/about/news' } });
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    // Через кадр: `focus()` у TipTap отложен `requestAnimationFrame`.
    await waitFor(() => expect(area).toHaveFocus());
  });

  it('убирает ссылку, оставляя текст', async () => {
    await renderField({ initial: '<p><a href="/about/news">Новости</a></p>' });

    selectAll();
    openLinkBar();
    fireEvent.click(screen.getByRole('button', { name: 'Убрать' }));

    expect(savedHtml()).toBe('<p>Новости</p>');
  });
});

describe('RichTextEditor, клавиатура и диктор', () => {
  it('панель проходится стрелками, а в табуляции стоит одной кнопкой', async () => {
    await renderField();

    const bold = toolbarButton('Жирный');
    const italic = toolbarButton('Курсив');

    // Тринадцать кнопок между предыдущим полем формы и текстом означали бы
    // тринадцать нажатий таба до того, ради чего форму открыли.
    expect(bold).toHaveAttribute('tabindex', '0');
    expect(italic).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'ArrowRight' });

    expect(italic).toHaveAttribute('tabindex', '0');
    expect(italic).toHaveFocus();
    expect(bold).toHaveAttribute('tabindex', '-1');
  });

  it('называет область ввода подписью поля и объявляет её многострочной', async () => {
    await renderField();

    // `<label for>` к `contenteditable` не цепляется — связь идёт через
    // `aria-labelledby`, и без неё диктор читает поле безымянным.
    expect(editorArea()).toHaveAttribute('aria-multiline', 'true');
    expect(editorArea()).toHaveAttribute('aria-invalid', 'false');
  });

  it('связывает ошибку с полем', async () => {
    await renderField({ error: "Опишите достижение" });

    expect(editorArea()).toHaveAttribute('aria-invalid', 'true');
    expect(editorArea()).toHaveAccessibleDescription('Опишите достижение');
  });

  it('показывает нажатой кнопку того форматирования, в котором стоит курсор', async () => {
    await renderField({ initial: '<p>Кафедра</p>' });

    expect(toolbarButton('Жирный')).toHaveAttribute('aria-pressed', 'false');

    selectAll();
    fireEvent.click(toolbarButton('Жирный'));

    expect(toolbarButton('Жирный')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('RichTextEditor, во время сохранения', () => {
  it('не даёт править и гасит панель', async () => {
    await renderField({ initial: '<p>Кафедра</p>', disabled: true });

    expect(editorArea()).toHaveAttribute('contenteditable', 'false');
    expect(toolbarButton('Жирный')).toBeDisabled();
  });
});

describe('RichTextEditor, значение снаружи', () => {
  it('подхватывает значение, поставленное формой', async () => {
    // Форму сбрасывают снаружи: `reset` после сохранения, переход
    // к другой записи. Поле обязано показать новое значение, хотя своего
    // документа оно из-за этого не перечитывает на каждом рендере.
    function Reset() {
      const [value, setValue] = useState('<p>Старое</p>');

      return (
        <>
          <RichTextEditor id="content" label="Содержание" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue('<p>Новое</p>')}>
            Сбросить
          </button>
        </>
      );
    }

    render(<Reset />);
    await screen.findByRole('textbox', { name: 'Содержание' });

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));

    expect(editorArea()).toHaveTextContent('Новое');
  });
});
