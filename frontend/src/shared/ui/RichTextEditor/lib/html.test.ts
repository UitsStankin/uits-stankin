import { describe, expect, it } from 'vitest';

import { checkHref, isAllowedHref, isEmptyHtml } from './html';

/**
 * Правила согласования с бэкендом проверяются вызовом: они чистые,
 * и рендер редактора ради них ничего не добавил бы.
 */
describe('isEmptyHtml', () => {
  it('считает пустым документ, который TipTap отдаёт как пустой абзац', () => {
    // Ради этого разбора всё и написано: `<p></p>` в необязательном поле
    // означал бы «заполнено пустотой», и `emptyToNull` не превратил бы
    // его в `null`.
    expect(isEmptyHtml('<p></p>')).toBe(true);
    expect(isEmptyHtml('')).toBe(true);
    expect(isEmptyHtml('<p><br></p>')).toBe(true);
    expect(isEmptyHtml('<p>&nbsp;</p>')).toBe(true);
  });

  it('не считает пустым текст и одинокую картинку', () => {
    expect(isEmptyHtml('<p>Текст</p>')).toBe(false);
    // Картинка без подписи — содержимое: документ из одного `<img>`
    // сохранить надо, а не стереть.
    expect(isEmptyHtml('<img src="/media/foto.jpg">')).toBe(false);
  });
});

describe('checkHref', () => {
  it('пропускает схемы, которые переживают чистку белым списком', () => {
    expect(checkHref('https://stankin.ru')).toEqual({ href: 'https://stankin.ru' });
    expect(checkHref('http://stankin.ru')).toEqual({ href: 'http://stankin.ru' });
    expect(checkHref('mailto:uits@stankin.ru')).toEqual({ href: 'mailto:uits@stankin.ru' });
    expect(checkHref('ftp://stankin.ru/plan.pdf')).toEqual({ href: 'ftp://stankin.ru/plan.pdf' });
  });

  it('пропускает адрес внутри портала и якорь', () => {
    expect(checkHref('/about/news')).toEqual({ href: '/about/news' });
    expect(checkHref('#raspisanie')).toEqual({ href: '#raspisanie' });
  });

  it('дополняет адрес без схемы https, а не http', () => {
    expect(checkHref('stankin.ru')).toEqual({ href: 'https://stankin.ru' });
  });

  it('отказывает схемам, которые бэкенд молча снимет со ссылки', () => {
    // `tel:` не в белом списке jsoup: ссылка сохранится без `href`,
    // и на странице останется текст, который никуда не ведёт.
    expect(checkHref('tel:+74959721920')).toHaveProperty('error');
    expect(checkHref('javascript:alert(1)')).toHaveProperty('error');
    expect(checkHref('data:text/html;base64,PHNjcmlwdD4=')).toHaveProperty('error');
  });

  it('считает `//example.com` внешним адресом, а не внутренним', () => {
    // Иначе роутер увёл бы по нему на несуществующий путь портала —
    // то же правило, что у ссылок Markdown.
    expect(checkHref('//example.com')).toEqual({ href: 'https://example.com' });
  });

  it('не берёт пустой адрес', () => {
    expect(checkHref('   ')).toHaveProperty('error');
  });
});

describe('isAllowedHref', () => {
  it('отвечает тем же правилом, что и разбор', () => {
    expect(isAllowedHref('https://stankin.ru')).toBe(true);
    expect(isAllowedHref('/about/news')).toBe(true);
    expect(isAllowedHref('tel:+74959721920')).toBe(false);
  });
});
