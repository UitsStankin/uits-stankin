import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { fileHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import type { FileCategory } from '@shared/types';
import { renderWithProviders } from '@/test/render';

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
  imageCategory,
  onSubmit,
}: {
  initial?: string;
  error?: string;
  disabled?: boolean;
  imageCategory?: FileCategory;
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
        imageCategory={imageCategory}
      />
      <output data-testid="saved">{value}</output>
    </form>
  );
}

/**
 * Рендер с ожиданием: редактор грузится отдельным куском (`lazy`),
 * и до его подгрузки на месте поля стоит заглушка.
 *
 * Через общие провайдеры, а не голым `render`: загрузка картинки —
 * мутация react-query, и без клиента запросов поле падает целиком.
 * В приложении клиент есть у любой страницы (`app/providers`), в тесте
 * его надо принести.
 */
async function renderField(props: Parameters<typeof Field>[0] = {}) {
  renderWithProviders(<Field {...props} />);

  // Запас по времени — по той же причине, что в личном кабинете:
  // ожидание должно упираться в рендер, а не в скорость раннера.
  return await screen.findByRole('textbox', { name: 'Содержание' }, { timeout: 3000 });
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
    // Разбор картинок держится в схеме ради этого: `<img>` в перенесённых
    // текстах уже есть, а кнопка вставки бывает не у каждого поля. Без
    // расширения правка заголовка уносила бы иллюстрации.
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

/**
 * Картинки вставляются загрузкой в `POST /api/files`: адрес нужен документу
 * в момент вставки, а `data:`-адрес из буфера не пережил бы сохранение —
 * белый список разрешает у `img` только `http`, `https` и относительный путь.
 */
describe('RichTextEditor, картинки', () => {
  /**
   * Буфер обмена события: файл, текст или и то, и другое.
   *
   * `getData` подделан не для нас, а для ProseMirror: он спрашивает
   * у буфера текст **до** того, как дойдёт до нашего обработчика,
   * и без метода падает весь редактор. В jsdom буфера обмена нет вовсе.
   */
  function clipboardOf(file: File | null, text = '') {
    return {
      clipboardData: {
        files: file ? [file] : [],
        types: file ? ['Files'] : ['text/plain'],
        getData: (type: string) => (type === 'text/plain' ? text : ''),
      },
    };
  }

  function pasteFile(area: HTMLElement, file: File) {
    fireEvent.paste(area, clipboardOf(file));
  }

  /** Файл выбран в диалоге — так же, как это делает человек кнопкой панели. */
  function chooseFile(file = new File(['x'], 'foto.png', { type: 'image/png' })) {
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('скрытого выбора файла нет в разметке');

    fireEvent.change(input, { target: { files: [file] } });
  }

  async function renderWithImages(initial = '<p>Отчёт с защиты</p>') {
    server.use(...fileHandlers());

    return await renderField({ initial, imageCategory: 'news' });
  }

  it('вставляет картинку адресом из ответа загрузки', async () => {
    await renderWithImages();

    chooseFile();

    // Адрес именно из ответа: собранный на фронте из ключа он разъехался бы
    // с бэкендом при переезде на объектное хранилище.
    fireEvent.change(await screen.findByLabelText('Описание'), {
      target: { value: 'Защита дипломов' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Вставить' }));

    expect(savedHtml()).toContain('src="/media/news/uploaded-1.jpg"');
    expect(savedHtml()).toContain('alt="Защита дипломов"');
  });

  it('грузит в раздел, который назвала форма', async () => {
    const categories: string[] = [];
    server.use(
      http.post('*/api/files', async ({ request }) => {
        categories.push((await request.text()).includes('achievements') ? 'achievements' : 'иной');

        return HttpResponse.json({ key: 'achievements/a.jpg', url: '/media/achievements/a.jpg' }, { status: 201 });
      }),
    );
    await renderField({ initial: '<p>Благодарность</p>', imageCategory: 'achievements' });

    chooseFile();

    // Раздел решает права: `news` преподавателю закрыт, и ключ чужого
    // раздела бэкенд не примет полем обложки.
    expect(await screen.findByLabelText('Описание')).toBeInTheDocument();
    expect(categories).toEqual(['achievements']);
  });

  it('оставляет пустое описание пустым атрибутом, а не выбрасывает его', async () => {
    await renderWithImages();

    chooseFile();
    await screen.findByLabelText('Описание');
    fireEvent.click(screen.getByRole('button', { name: 'Вставить' }));

    // Без `alt` диктор читает адрес файла; с пустым — пропускает картинку
    // как украшение, что и означает «описывать нечего».
    expect(savedHtml()).toContain('alt=""');
  });

  it('картинку из буфера обмена отправляет на сервер, а не кладёт data:-адресом', async () => {
    const area = await renderWithImages();

    pasteFile(area, new File(['x'], 'screenshot.png', { type: 'image/png' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Вставить' }));

    // `data:`-адрес белый список у `img` не разрешает: картинка,
    // положенная в документ напрямую, исчезла бы при сохранении.
    expect(savedHtml()).toContain('src="/media/news/uploaded-1.jpg"');
    expect(savedHtml()).not.toContain('data:');
  });

  it('чужой текст из буфера вставляется по-прежнему, мимо загрузки', async () => {
    // Обработчик вставки перехватывает только файлы: перехватив всё,
    // он сломал бы обычную вставку скопированного абзаца.
    const area = await renderWithImages('<p>Отчёт</p>');

    fireEvent.paste(area, clipboardOf(null, 'Текст из письма'));

    expect(screen.queryByLabelText('Описание')).not.toBeInTheDocument();
    expect(savedHtml()).toContain('Текст из письма');
  });

  it('не отправляет то, что сервер отвергнет, и объясняет отказ', async () => {
    let uploads = 0;
    server.use(
      http.post('*/api/files', () => {
        uploads += 1;

        return HttpResponse.json({ key: 'news/x.gif', url: '/media/news/x.gif' }, { status: 201 });
      }),
    );
    await renderField({ initial: '<p>Отчёт</p>', imageCategory: 'news' });

    chooseFile(new File(['x'], 'anim.gif', { type: 'image/gif' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Подходят только JPEG и PNG.');
    expect(uploads).toBe(0);
    // Вставлять нечего — кнопка не предлагает вставить пустоту.
    expect(screen.getByRole('button', { name: 'Вставить' })).toBeDisabled();
  });

  it('отказ сервера показывает его словами', async () => {
    server.use(
      http.post('*/api/files', () =>
        HttpResponse.json(
          {
            title: 'Bad Request',
            status: 400,
            detail: 'Изображение больше 25 мегапикселей',
            instance: '/api/files',
            timestamp: '2026-08-29T12:00:00.000000+03:00',
          },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await renderField({ initial: '<p>Отчёт</p>', imageCategory: 'news' });

    chooseFile();

    // `detail` этой ручки написан по-русски и пригоден для показа: из него
    // видно, что делать с файлом.
    expect(await screen.findByRole('alert')).toHaveTextContent('Изображение больше 25 мегапикселей');
  });

  it('на 429 говорит, сколько ждать: контракт кладёт срок в Retry-After', async () => {
    server.use(
      http.post('*/api/files', () =>
        HttpResponse.json(
          {
            title: 'Too Many Requests',
            status: 429,
            detail: 'Слишком много загрузок файлов. Повторите позже.',
            instance: '/api/files',
            timestamp: '2026-08-29T12:00:00.000000+03:00',
          },
          {
            status: 429,
            headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '42' },
          },
        ),
      ),
    );
    await renderField({ initial: '<p>Отчёт</p>', imageCategory: 'news' });

    chooseFile();

    // «Повторите позже» без срока заставляет пробовать наугад, а срок
    // сервер прислал — терять его нельзя.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Слишком много загрузок. Повторите через 42 секунды.',
    );
  });

  it('«Отмена» закрывает строку и возвращает курсор в текст', async () => {
    const area = await renderWithImages();

    chooseFile();
    await screen.findByLabelText('Описание');
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByLabelText('Описание')).not.toBeInTheDocument();
    // Иначе фокус остаётся на кнопке, которой больше нет на экране.
    await waitFor(() => expect(area).toHaveFocus());
    expect(savedHtml()).toBe('<p>Отчёт с защиты</p>');
  });

  it('Enter в описании вставляет картинку, а не отправляет форму', async () => {
    const onSubmit = vi.fn();
    server.use(...fileHandlers());
    await renderField({ initial: '<p>Отчёт</p>', imageCategory: 'news', onSubmit });

    chooseFile();
    fireEvent.keyDown(await screen.findByLabelText('Описание'), { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(savedHtml()).toContain('<img src="/media/news/uploaded-1.jpg"');
  });

  it('без раздела хранилища кнопки нет, а картинка из буфера идёт своим чередом', async () => {
    // Так стоит редактор в карточке ППС в личном кабинете: раздел `staff`
    // преподавателю закрыт, и кнопка обещала бы то, что кончится `403`.
    const area = await renderField({ initial: '<p>Образование</p>' });

    expect(screen.queryByRole('button', { name: 'Картинка' })).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();

    // Запросов при этом не уходит вовсе: хендлера загрузки в наборе нет,
    // и ушедший запрос уронил бы тест (`onUnhandledRequest: 'error'`).
    pasteFile(area, new File(['x'], 'foto.png', { type: 'image/png' }));

    expect(screen.queryByLabelText('Описание')).not.toBeInTheDocument();
  });

  it('строка ссылки и строка картинки не стоят рядом', async () => {
    // Две строки ввода под одной панелью — это два поля «Адрес»
    // и «Описание» подряд, и непонятно, к чему относится «Применить».
    await renderWithImages();

    fireEvent.click(toolbarButton('Ссылка'));
    expect(screen.getByLabelText('Адрес')).toBeInTheDocument();

    chooseFile();

    expect(await screen.findByLabelText('Описание')).toBeInTheDocument();
    expect(screen.queryByLabelText('Адрес')).not.toBeInTheDocument();
  });
});

describe('RichTextEditor, клавиатура и диктор', () => {
  it('панель проходится стрелками, а в табуляции стоит одной кнопкой', async () => {
    await renderField();

    const bold = toolbarButton('Жирный');
    const italic = toolbarButton('Курсив');

    // Четырнадцать кнопок между предыдущим полем формы и текстом означали
    // бы четырнадцать нажатий таба до того, ради чего форму открыли.
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

    renderWithProviders(<Reset />);
    await screen.findByRole('textbox', { name: 'Содержание' });

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));

    expect(editorArea()).toHaveTextContent('Новое');
  });
});
