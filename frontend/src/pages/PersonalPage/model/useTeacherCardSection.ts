import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { myTeacherCardQuery } from '@entities/teacher';
import { isApiError } from '@shared/api';

/**
 * Состояние секции «Информация о преподавателе» в личном кабинете:
 * запрос своей карточки плюс переключатель «смотрю — правлю».
 *
 * Запрос включается флагом `profile.teacher`: без роли ручка ответит
 * `403`, и ходить на неё обычному пользователю незачем. `404` при этом
 * не сбой, а состояние «роль есть, карточка не привязана» — контракт
 * обещает его отдельно, и секция показывает его спокойным блоком,
 * а не красным.
 */
export function useTeacherCardSection(isTeacher: boolean) {
  const query = useQuery({ ...myTeacherCardQuery, enabled: isTeacher });

  const [isEditing, setIsEditing] = useState(false);
  /**
   * «Карточка сохранена» после выхода из формы. Отдельный флаг, а не
   * `mutation.isSuccess`: мутация живёт в форме, а форма после сохранения
   * размонтирована — сообщать об успехе больше некому.
   */
  const [justSaved, setJustSaved] = useState(false);

  const notFound = isApiError(query.error) && query.error.status === 404;
  const isOffline = isApiError(query.error) && query.error.status === 0;
  const failure = query.error !== null && !notFound && !isOffline;

  return {
    card: query.data ?? null,
    isLoading: query.isLoading,
    notFound,
    isOffline,
    isError: failure,
    errorMessage: failure && isApiError(query.error) ? query.error.message : null,
    refetch: () => void query.refetch(),
    isEditing,
    justSaved,
    startEditing: () => {
      setIsEditing(true);
      // Форму открыли снова — значит, «сохранено» относится к прошлому
      // разу и после новой отмены висело бы враньём.
      setJustSaved(false);
    },
    cancelEditing: () => setIsEditing(false),
    finishEditing: () => {
      setIsEditing(false);
      setJustSaved(true);
    },
  };
}
