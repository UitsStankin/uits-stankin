import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { editablePageHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import ContactsPage from './index';

/**
 * Страница контактов — смешанная: текст с бэкенда, карта и чат руками.
 *
 * Шесть состояний редактируемого раздела проверены на своём уровне
 * (`widgets/EditableSection`) и здесь не повторяются, как не повторяется
 * и разбор адреса карты (`lib/departmentMap.test.ts`). Страница доказывает
 * своё: что просит слаг `contacts`, а не соседний, и что вокруг текста
 * стоит именно та обёртка, ради которой у контактов отдельный тикет.
 */
describe('ContactsPage', () => {
  it('показывает раздел `contacts`, а не соседний', async () => {
    server.use(
      ...editablePageHandlers({
        contacts: 'Москва, Вадковский переулок, 1.',
        'fields-of-study': 'Программа «Прикладная информатика».',
      }),
    );

    renderWithProviders(<ContactsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Контакты' })).toBeInTheDocument();
    expect(await screen.findByText('Москва, Вадковский переулок, 1.')).toBeInTheDocument();
    expect(screen.queryByText('Программа «Прикладная информатика».')).not.toBeInTheDocument();
  });

  /**
   * Умолчание моков — `text: ''`: ровно так выглядит чистая база после
   * ченджсета `008-seed-editable-pages`, и ровно так страница выглядит
   * на стенде сегодня. Колонка рядом с картой обязана объяснить пустоту,
   * а не оборваться — в отличие от блоков главной, которые прячутся.
   */
  it('на незаполненном разделе объясняет пустоту, а не обрывает колонку', async () => {
    renderWithProviders(<ContactsPage />);

    expect(await screen.findByText('Раздел пока не заполнен')).toBeInTheDocument();
  });

  /**
   * Карта — сторонний кадр, и заглянуть внутрь него нельзя. Проверяется
   * то, за что отвечает страница: кадр назван словами (без `title` диктор
   * читает его как «фрейм» — в оригинале так и было) и отложен, чтобы
   * не задерживать текст, ради которого на страницу пришли.
   */
  it('ставит карту названным и отложенным кадром', async () => {
    renderWithProviders(<ContactsPage />);

    const map = await screen.findByTitle('Карта: расположение кафедры');

    expect(map).toHaveAttribute('loading', 'lazy');
    expect(map).toHaveAttribute('src', expect.stringContaining('yandex.ru/map-widget'));
  });

  /**
   * Ссылка на чат в оригинале была голой картинкой с `alt="telegram-link"`:
   * куда она ведёт, не понимал ни диктор, ни зрячий. Тест сторожит именно
   * подпись — вернуть иконку без слов было бы легко и незаметно.
   */
  it('называет ссылку на чат словами и уводит её в новую вкладку', async () => {
    renderWithProviders(<ContactsPage />);

    const chat = await screen.findByRole('link', { name: 'Телеграм-чат кафедры' });

    expect(chat).toHaveAttribute('href', 'https://t.me/+WQVM050GSEFmZWUy');
    expect(chat).toHaveAttribute('target', '_blank');
    // Без `rel` открытая вкладка получает доступ к `window.opener`.
    expect(chat).toHaveAttribute('rel', 'noreferrer');
  });
});
