import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { editablePageHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import EditablePagePage from './index';

/**
 * Страница редактируемого раздела — одна на девять адресов.
 *
 * Шесть состояний раздела проверены на своём уровне
 * (`widgets/EditableSection`), и здесь не повторяются. Странице осталось
 * доказать ровно две вещи, и обе — её собственные: она называет раздел
 * заголовком из таблицы роутов и просит с бэкенда тот слаг, который ей
 * передали, а не соседний.
 */
describe('EditablePagePage', () => {
  it('рисует заголовок из пропа и содержимое переданного слага', async () => {
    // Тексты разные у двух слагов: если страница перепутает их, на экране
    // окажется чужой раздел, а не пустота — молчаливая подмена, которую
    // проверка на один слаг пропустила бы.
    server.use(
      ...editablePageHandlers({
        'fields-of-study': 'Программа «Прикладная информатика».',
        'documents-department': 'Положение о кафедре.',
      }),
    );

    renderWithProviders(
      <EditablePagePage slug="fields-of-study" heading="Направления подготовки" />,
    );

    // Заголовок — константа страницы, он на месте с первого кадра.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Направления подготовки' }),
    ).toBeInTheDocument();

    expect(await screen.findByText('Программа «Прикладная информатика».')).toBeInTheDocument();
    expect(screen.queryByText('Положение о кафедре.')).not.toBeInTheDocument();
  });
});
